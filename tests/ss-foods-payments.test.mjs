import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const payments=[{key:1,date:'2026-09-05',details:'Hall Advance',amount:5000},{key:2,date:'2026-09-08',details:'Food Advance',amount:5000}];
const item={id:4,orderId:'SS-004',functionDate:'2026-10-25',functionTime:'18:30',mealSession:'Dinner',foodType:'Veg',itemName:'Hall Rent',originalQty:1,unit:'Nos',rate:20000,discount:0,advanceEntries:JSON.stringify(payments),advanceTotal:10000};
for(const root of ['', 'deploy/godaddy-full-app/']) {
 function render(role='admin',entries=item.advanceEntries){
  const current={...item,advanceEntries:entries};
  const states=[{role},false,[current],[{...current,key:4}],current,[current],'','',false,'SS-005',0,payments,0,0];let index=0;
  const source=ts.transpileModule(readFileSync(root+'app/admin/order-additions/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports={};
  const mockRequire=(name)=>name==='react'?{...React,useState:()=>[states[index++],()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn}:name.endsWith('date-format')?{formatDate:v=>v? v.replace(/^(\d{4})-09-(\d{2})$/,'$2-Sep-$1'):'—'}:name.endsWith('.css')||name.includes('ss-foods-bill-image')?{}:require(name);
  new Function('require','exports',source)(mockRequire,exports);
  return renderToStaticMarkup(React.createElement(exports.default));
 }
 test(root+'advance dates remain valid when editing and submitting',()=>{
  const html=render();
  assert.match(html,/aria-label="Advance 1 date"[^>]*value="2026-09-05"/);
  assert.match(html,/aria-label="Advance 2 date"[^>]*value="2026-09-08"/);
  assert.match(html,/name="advanceEntries"[^>]*2026-09-05/);
 });
 test(root+'saved payments visible to viewers without opening editor',()=>{
  const html=render('viewer');assert.match(html,/Payment History/);assert.match(html,/05-Sep-2026/);assert.match(html,/08-Sep-2026/);assert.match(html,/Hall Advance/);assert.match(html,/Food Advance/);assert.match(html,/₹5,000/);
 });
 test(root+'empty history does not invent a payment',()=>assert.match(render('viewer','[]'),/No payment history recorded/));
}
