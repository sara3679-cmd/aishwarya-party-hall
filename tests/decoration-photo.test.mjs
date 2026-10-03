import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../lib/decoration-photo.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {prepareDecorationPhoto} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('phone photos resize, compress progressively, and release local resources', async () => {
 const old = {Image:globalThis.Image, document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let revoked=0,qualityCalls=[],draws=[];
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(_image,_x,_y,w,h){draws.push([w,h]);}}),toDataURL(_type,quality){qualityCalls.push(quality);return 'data:image/jpeg;base64,'+'A'.repeat(quality>0.68?900000:400000);}};
 globalThis.Image=class {naturalWidth=4000;naturalHeight=3000;async decode(){}};
 globalThis.document={createElement:()=>canvas};URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>revoked++;
 try{
  const photo=await prepareDecorationPhoto({name:'phone.jpg',type:'image/jpeg',size:8000000});
  assert.deepEqual(draws,[[1600,1200]]);assert.deepEqual(qualityCalls,[0.88,0.78,0.68]);assert.ok(photo.startsWith('data:image/jpeg;base64,'));assert.ok(photo.length<800000);assert.equal(revoked,1);
  globalThis.Image=class {naturalWidth=400;naturalHeight=600;async decode(){}};draws=[];
  await prepareDecorationPhoto({name:'small.png',type:'image/png',size:100000});assert.deepEqual(draws,[[400,600]]);
  canvas.toDataURL=()=> 'data:image/jpeg;base64,'+'A'.repeat(canvas.width>1000?900000:400000);globalThis.Image=class {naturalWidth=4000;naturalHeight=3000;async decode(){}};draws=[];
  await prepareDecorationPhoto({name:'busy.jpg',type:'image/jpeg',size:8000000});assert.ok(draws.length>1);assert.ok(canvas.width<=1000);
  globalThis.Image=class {async decode(){throw new Error('Invalid image');}};
  await assert.rejects(prepareDecorationPhoto({name:'broken.jpg',type:'image/jpeg',size:10}),/broken.jpg: Invalid image/);assert.equal(revoked,4);
 }finally{globalThis.Image=old.Image;globalThis.document=old.document;URL.createObjectURL=old.create;URL.revokeObjectURL=old.revoke;}
});
test('rejects unsupported and excessively large originals before decoding',async()=>{
 await assert.rejects(prepareDecorationPhoto({name:'phone.heic',type:'image/heic',size:10000}),/export them as JPG/);
 await assert.rejects(prepareDecorationPhoto({name:'huge.jpg',type:'image/jpeg',size:26*1024*1024}),/25 MB/);
});
