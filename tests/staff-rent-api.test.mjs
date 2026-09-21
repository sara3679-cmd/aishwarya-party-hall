import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const compile = text => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`;
const model = compile(readFileSync('app/admin/staff-salary/model.ts','utf8'));
let data = {version:1,employees:[],entries:[],halls:[],bills:[]}, revision = 0, role = 'admin';
globalThis.__staffRentTest = { session: () => ({role}), store: () => ({read: async () => ({data,revision}), write: async (next,expected) => { if (expected !== revision) return false; data=next; revision++; return true; }}) };
let source = readFileSync('app/api/admin/staff-rent/route.ts','utf8')
 .replace("import { staffRentStore } from '../../../../db';",'const staffRentStore = globalThis.__staffRentTest.store;')
 .replace("import { getStaffSession } from '../../../admin-auth';",'const getStaffSession = globalThis.__staffRentTest.session;')
 .replace("'../../../admin/staff-salary/model'",JSON.stringify(model));
const {GET,PUT} = await import(compile(source));
const req = (body, origin = 'https://example.com') => new Request('https://example.com/api/admin/staff-rent',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('admin access, validated records, and stale-write protection',async () => {
 role='staff'; assert.equal((await GET(new Request('https://example.com'))).status,403); assert.equal((await PUT(req({data,revision}))).status,403);
 role='admin'; assert.equal((await PUT(req({data,revision},'https://other.example'))).status,403);
 assert.equal((await PUT(req({data:{},revision}))).status,400);
 assert.equal((await PUT(req({data,revision:0}))).status,200);
 assert.equal((await PUT(req({data,revision:0}))).status,409);
 const response = await GET(new Request('https://example.com')); assert.match(response.headers.get('cache-control'),/no-store/); assert.equal((await response.json()).revision,1);
 assert.equal((await PUT(req({data,revision:1},'https://www.aishwaryapartyhall.in'))).status,200);
});
