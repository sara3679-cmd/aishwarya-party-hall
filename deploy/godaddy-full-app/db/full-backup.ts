import type { RowDataPacket } from 'mysql2/promise';
import { mysqlPool, staffRentStore, ensureStaffMobileColumn } from './index';
import { decorationStore } from './decoration-store';
import { photographyStore } from './photography-store';
import { applicationTable, validSnapshot, restoreCommands, type DatabaseSnapshot, type DatabaseValue } from '../lib/full-database-backup';
const quote=(name:string)=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw new Error('Invalid table name');return '`'+name+'`';};
const legacyAdditionColumns:Record<string,string[]>={
 order_additions:['id','order_id','addition_date','function_date','customer_name','item_service','category','original_qty','additional_qty','unit','rate','discount','amount_received','payment_status','confirmed_by','customer_confirmation','confirmation_mode','remarks','created_at','updated_at'],
 order_additions_v2:['id','order_id','addition_date','function_date','meal_session','food_type','item_name','category','original_qty','unit','rate','addition_time','remarks','created_at','updated_at'],
 order_additions_v3:['id','order_id','addition_date','function_date','function_time','meal_session','food_type','item_name','original_qty','unit','rate','addition_time','remarks','created_at','updated_at'],
 order_additions_v4:['id','order_id','function_date','function_time','meal_session','food_type','item_name','original_qty','unit','rate','remarks','created_at','updated_at'],
};
const legacyAdditionIntegerColumns=new Set(['id','original_qty','additional_qty','rate','discount','amount_received']);
async function schema(){
 const [tables]=await mysqlPool().query<RowDataPacket[]>('SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=\'BASE TABLE\' ORDER BY TABLE_NAME');
 return Promise.all(tables.filter(row=>applicationTable(row.name)).map(async table=>{
 const [columns]=await mysqlPool().query<RowDataPacket[]>(`SHOW COLUMNS FROM ${quote(table.name)}`);
 return {name:String(table.name),engine:String(table.engine),columns:columns.map(column=>String(column.Field))};
 }));
}
export async function exportFullDatabase():Promise<DatabaseSnapshot>{
 await ensureStaffMobileColumn();await staffRentStore();await decorationStore();await photographyStore();
 const tables=await schema();const connection=await mysqlPool().getConnection();
 try{
 await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await connection.beginTransaction();
 const snapshot:DatabaseSnapshot={tables:[],sequences:[]};
 for(const table of tables){const [rows]=await connection.query<RowDataPacket[]>(`SELECT * FROM ${quote(table.name)}`);snapshot.tables.push({name:table.name,columns:table.columns,rows:rows.map(row=>Object.fromEntries(table.columns.map(column=>{const value=row[column];return [column,value instanceof Date?value.toISOString().slice(0,19).replace('T',' '):value!==null&&typeof value==='object'?JSON.stringify(value):value as DatabaseValue];})))});}
 await connection.commit();return snapshot;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
export async function restoreFullDatabase(snapshot:DatabaseSnapshot){
 if(!validSnapshot(snapshot))throw new Error('Invalid full database backup');
 await ensureStaffMobileColumn();await staffRentStore();await decorationStore();await photographyStore();
 let current=await schema();
 const missing=snapshot.tables.filter(table=>!current.some(existing=>existing.name===table.name));
 const missingLegacy=missing.filter(table=>legacyAdditionColumns[table.name]);
 const unsupported=missing.find(table=>!legacyAdditionColumns[table.name]&&table.name!=='offline_sync_backups');
 if(unsupported)throw new Error(`Database table ${unsupported.name} is missing. This backup needs the matching website database schema; no records were changed.`);
 const namesMatch=(actual:string[],expected:string[])=>actual.length===expected.length&&expected.every(column=>actual.includes(column));
 for(const table of missingLegacy){
  const expected=legacyAdditionColumns[table.name];
  if(!expected||!namesMatch(table.columns,expected))throw new Error(`Backup table ${table.name} has an unsupported legacy structure. No records were changed.`);
 }
 const presentSnapshot={...snapshot,tables:snapshot.tables.filter(table=>current.some(existing=>existing.name===table.name)),sequences:[]};
 if(presentSnapshot.tables.length)restoreCommands(presentSnapshot,current,{});
 for(const table of missingLegacy){
  const definitions=table.columns.map(column=>`${quote(column)} ${column==='id'?'INT NOT NULL':legacyAdditionIntegerColumns.has(column)?'INT NULL':'TEXT NULL'}`).join(',');
  await mysqlPool().query(`CREATE TABLE ${quote(table.name)} (${definitions}, PRIMARY KEY (${quote('id')})) ENGINE=InnoDB`);
 }
 current=await schema();
 restoreCommands({...snapshot,sequences:[]},current,{});
 // Non-transactional tables cannot take part in the all-or-nothing restore. Convert them first; MySQL retains their rows.
 for(const table of snapshot.tables){
  const existing=current.find(item=>item.name===table.name)!;
  if(existing.engine==='InnoDB')continue;
  try{await mysqlPool().query(`ALTER TABLE ${quote(table.name)} ENGINE=InnoDB`);}
  catch{throw new Error(`Database table ${table.name} must use InnoDB for a safe restore. GoDaddy could not convert it automatically; no records were replaced.`);}
 }
 current=await schema();
 for(const table of snapshot.tables){if(current.find(t=>t.name===table.name)?.engine!=='InnoDB')throw new Error(`Database table ${table.name} must use InnoDB for a safe restore. No records were replaced.`);}
 const connection=await mysqlPool().getConnection();
 try{
 await connection.beginTransaction();const revisions:Record<string,number>={};
 for(const name of ['staff_rent_records','decoration_catalog','photography_catalog']){const [rows]=await connection.query<RowDataPacket[]>(`SELECT revision FROM ${quote(name)} WHERE id=1 FOR UPDATE`);revisions[name]=Number(rows[0]?.revision??0);}
 const commands=restoreCommands({...snapshot,sequences:[]},current,revisions);
 for(const command of commands)await connection.query(command.sql.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g,'`$1`'),command.values);
 await connection.commit();
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
