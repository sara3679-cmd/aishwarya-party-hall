import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const source=ts.transpileModule(readFileSync(new URL('../app/admin/staff-salary/model.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const { deleteStaffRentRecord, salaryBill, advanceBalance, balance, validRecords }=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const employee={id:'e1',name:'Test',location:'Padi',phone:'',role:'Staff',joined:'2026-01-01',salary:30000,recovery:2000,paidLeave:1};
const records={version:1,employees:[employee],halls:[],entries:[{id:'a',employee:'e1',date:'2026-09-01',kind:'Advance',amount:5000,note:''},{id:'r',employee:'e1',date:'2026-09-30',kind:'Advance recovery',amount:2000,note:''},{id:'l',employee:'e1',date:'2026-09-02',kind:'Unpaid leave',amount:0.5,note:''}],bills:[]};
test('half-day deduction rounds to whole rupees',()=>{const b=salaryBill(records,employee,'2026-09');assert.equal(b.leave,1000);assert.equal(b.recovery,2000);assert.equal(b.total,27000);});
test('finalised recovery is reserved once and partial payment stays due',()=>{const b=salaryBill(records,employee,'2026-09');const next={...records,bills:[b]};assert.equal(advanceBalance(next,'e1'),3000);b.payments.push({id:'p',date:'2026-09-30',amount:10000,method:'Cash',reference:''});assert.equal(balance(b),17000);b.payments.push({id:'p2',date:'2026-09-30',amount:17000,method:'Cash',reference:''});assert.equal(balance(b),0);assert.equal(advanceBalance(next,'e1'),3000);});
test('joining month is prorated and future advances excluded',()=>{const b=salaryBill(records,{...employee,joined:'2026-09-16'},'2026-09');assert.equal(b.basic,15000);assert.equal(salaryBill(records,employee,'2026-08').recovery,0);});
test('backup validates contents before replacing data',()=>{assert.equal(validRecords(records),true);assert.equal(validRecords({...records,employees:[{}]}),false);assert.equal(validRecords({...records,entries:[...records.entries,records.entries[0]]}),false);});

test('deleting staff removes only their salary and ledger records',()=>{
 const salary=salaryBill(records,employee,'2026-09');
 const hall={id:'h1',location:'Padi',address:'Hall',owner:'Owner',phone:'',rent:10000,deposit:0,start:'2026-01-01',renewal:'2027-01-01'};
 const rent={...salary,id:'Rent-h1-2026-09',kind:'Rent',entity:'h1',recovery:0};
 const before={...records,halls:[hall],bills:[salary,rent]};
 const after=deleteStaffRentRecord(before,'Salary','e1');
 assert.equal(after.employees.length,0);assert.equal(after.entries.length,0);
 assert.deepEqual(after.halls,[hall]);assert.deepEqual(after.bills,[rent]);
 assert.equal(validRecords(after),true);assert.equal(before.employees.length,1);
});
test('deleting hall preserves staff, salary payments and ledger',()=>{
 const salary=salaryBill(records,employee,'2026-09');
 salary.payments=[{id:'p',date:'2026-09-30',amount:1000,method:'Cash',reference:''}];
 const hall={id:'h1',location:'Padi',address:'Hall',owner:'Owner',phone:'',rent:10000,deposit:0,start:'2026-01-01',renewal:'2027-01-01'};
 const rent={...salary,id:'Rent-h1-2026-09',kind:'Rent',entity:'h1',recovery:0};
 const after=deleteStaffRentRecord({...records,halls:[hall],bills:[salary,rent]},'Rent','h1');
 assert.equal(after.halls.length,0);assert.deepEqual(after.bills,[salary]);
 assert.deepEqual(after.employees,records.employees);assert.deepEqual(after.entries,records.entries);
 assert.equal(validRecords(after),true);
});
