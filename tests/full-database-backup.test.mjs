import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(fs.readFileSync(new URL('../lib/full-database-backup.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {validSnapshot,restoreCommands,applicationTable}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const snapshot={tables:[{name:'staff_rent_records',columns:['id','payload','revision'],rows:[{id:1,payload:'{"employees":[]}',revision:2}]}],sequences:[]};
test('covers empty tables and preserves data with parameterized inserts',()=>{
 assert.ok(validSnapshot(snapshot));
 const plan=restoreCommands(snapshot,[{name:'staff_rent_records',columns:['id','payload','revision']}],{staff_rent_records:10});
 assert.equal(plan[0].sql,'DELETE FROM "staff_rent_records"');assert.deepEqual(plan[1].values,[1,'{"employees":[]}',11]);
});
test('rejects malformed rows, duplicate tables, internal tables and schema mismatch before restore',()=>{
 assert.equal(applicationTable('_cf_METADATA'),false);assert.equal(applicationTable('sqlite_sequence'),false);
 assert.equal(validSnapshot({...snapshot,tables:[...snapshot.tables,...snapshot.tables]}),false);
 assert.equal(validSnapshot({...snapshot,tables:[{...snapshot.tables[0],rows:[{id:1}]}]}),false);
 assert.throws(()=>restoreCommands(snapshot,[{name:'staff_rent_records',columns:['id']}]),/structure differs/);
 assert.throws(()=>restoreCommands(snapshot,[]),/structure differs/);
});
