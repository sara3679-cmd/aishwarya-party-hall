export type DatabaseValue = string | number | null;
export type DatabaseTableBackup = { name: string; columns: string[]; rows: Record<string, DatabaseValue>[] };
export type DatabaseSnapshot = { tables: DatabaseTableBackup[]; sequences: { name: string; seq: number }[] };
export type RestoreCommand = { sql: string; values: DatabaseValue[] };
export function applicationTable(name: string) {
 return /^[A-Za-z][A-Za-z0-9_]*$/.test(name) && !name.startsWith('sqlite_') && !name.startsWith('_cf_') && name !== 'd1_migrations';
}
export function quoteIdentifier(name: string) {
 if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Invalid database identifier');
 return `"${name}"`;
}
export function validSnapshot(value: unknown): value is DatabaseSnapshot {
 if (!value || typeof value !== 'object') return false;
 const snapshot = value as DatabaseSnapshot;
 if (!Array.isArray(snapshot.tables) || !snapshot.tables.length || !Array.isArray(snapshot.sequences)) return false;
 const names = new Set<string>();
 for (const table of snapshot.tables) {
  if (!table || typeof table.name !== 'string' || !applicationTable(table.name) || names.has(table.name) || !Array.isArray(table.columns) || !table.columns.length || new Set(table.columns).size !== table.columns.length || table.columns.some(c => typeof c !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(c)) || !Array.isArray(table.rows)) return false;
  names.add(table.name);
  for (const row of table.rows) {
   if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== table.columns.length || table.columns.some(c => !(c in row) || !(row[c] === null || typeof row[c] === 'string' || (typeof row[c] === 'number' && Number.isFinite(row[c]))))) return false;
  }
 }
 return snapshot.sequences.every(sequence => sequence && names.has(sequence.name) && Number.isSafeInteger(sequence.seq) && sequence.seq >= 0) && new Set(snapshot.sequences.map(s=>s.name)).size === snapshot.sequences.length;
}
/** Validate the whole restore before producing any destructive statements. */
export function restoreCommands(snapshot: DatabaseSnapshot, current: {name:string;columns:string[]}[], revisions: Record<string,number> = {}): RestoreCommand[] {
 if (!validSnapshot(snapshot)) throw new Error('Invalid full database backup');
 const schema = new Map(current.map(table=>[table.name,table.columns]));
 for (const table of snapshot.tables) {
  const columns = schema.get(table.name);
  if (!columns || columns.length !== table.columns.length || table.columns.some(c=>!columns.includes(c))) throw new Error(`Database structure differs for ${table.name}. Use the matching website version to restore this backup.`);
 }
 const commands:RestoreCommand[] = snapshot.tables.map(table=>({sql:`DELETE FROM ${quoteIdentifier(table.name)}`,values:[]}));
 for (const table of snapshot.tables) for (const row of table.rows) {
  const values = table.columns.map(column=>column === 'revision' && (table.name === 'staff_rent_records' || table.name === 'decoration_catalog') ? Math.max(Number(row[column]),revisions[table.name] ?? 0)+1 : row[column]);
  commands.push({sql:`INSERT INTO ${quoteIdentifier(table.name)} (${table.columns.map(quoteIdentifier).join(',')}) VALUES (${table.columns.map(()=>'?').join(',')})`,values});
 }
 for (const sequence of snapshot.sequences) {
  commands.push({sql:'DELETE FROM sqlite_sequence WHERE name = ?',values:[sequence.name]});
  commands.push({sql:'INSERT INTO sqlite_sequence (name,seq) VALUES (?,?)',values:[sequence.name,sequence.seq]});
 }
 return commands;
}
