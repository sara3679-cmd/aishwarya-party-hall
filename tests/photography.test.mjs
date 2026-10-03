import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
async function moduleAt(path, replace=[]) {
 let source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 for(const [from,to] of replace)source=source.replace(from,to);
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
const {validatePhotographyContent}=await moduleAt('../lib/photography-validation.ts');
const {photographyWhatsapp}=await moduleAt('../lib/photography-contact.ts');
const {publicPhotography}=await moduleAt('../lib/photography.ts');
const content={title:'Birthday memories',photographer:'Studio One',category:'Birthday',hall:'Both',services:'Photography and video',availability:'Enquire for dates',description:'Sample work',included:'Edited photos',photos:['data:image/jpeg;base64,/9j/'],packages:[{name:'Celebration',hours:3,price:12000,included:'Photography, edited photos and album'}]};
test('validates packages and rejects invalid uploads and missing profile fields',()=>{
 assert.equal(validatePhotographyContent(content,['Birthday']).packages[0].price,12000);
 assert.deepEqual(validatePhotographyContent({...content,packages:[]},['Birthday'],true).packages,[]);
 for(const patch of [{photographer:''},{services:''},{packages:[]},{packages:[{...content.packages[0],hours:0}]},{packages:[{...content.packages[0],price:-1}]},{photos:['data:image/jpeg;base64,AAAA']}])assert.throws(()=>validatePhotographyContent({...content,...patch},['Birthday']));
 assert.equal(validatePhotographyContent({...content,packages:[{...content.packages[0],price:null}]},['Birthday']).packages[0].price,null);
});
test('WhatsApp enquiry carries photographer, portfolio, package, hall and date',()=>{
 const url=new URL(photographyWhatsapp('919876543210','PHO-123',content.title,content.photographer,'Celebration','Korattur','2026-12-20'));
 assert.equal(url.pathname,'/919876543210');const text=url.searchParams.get('text');for(const word of ['PHO-123','Studio One','Celebration','Korattur','2026-12-20'])assert.ok(text.includes(word));
});
globalThis.photoTest={session:null,data:{categories:['Birthday'],designs:[]},revision:0,validatePhotographyContent};
const api=await moduleAt('../app/api/admin/photography/route.ts',[
 [/import .*getStaffSession.*;/,'const getStaffSession=async()=>globalThis.photoTest.session;'],
 [/import .*photographyStore.*;/,`const photographyStore=async()=>({read:async()=>({data:structuredClone(globalThis.photoTest.data),revision:globalThis.photoTest.revision}),write:async(data,revision)=>{if(revision!==globalThis.photoTest.revision)return false;globalThis.photoTest.data=structuredClone(data);globalThis.photoTest.revision++;return true;}});`],
 [/import .*validatePhotographyContent.*;/,'const validatePhotographyContent=globalThis.photoTest.validatePhotographyContent;']
]);
async function act(action,extra={}) {return api.POST(new Request('http://localhost/api/admin/photography',{method:'POST',body:JSON.stringify({action,revision:globalThis.photoTest.revision,...extra})}));}
test('ownership, approvals, private edits, change requests and revision conflicts',async()=>{
 const state=globalThis.photoTest;
 for(const role of [null,'viewer','decorator']) {state.session=role?{username:'other',role}:null;assert.equal((await api.GET(new Request('http://localhost'))).status,403);assert.equal((await act('submit',{content})).status,403);}
 state.session={username:'one',role:'photographer'};assert.equal((await act('save',{content:{...content,packages:[]}})).status,200);const draftId=state.data.designs[0].id;assert.equal((await act('submit',{id:draftId,content:{...content,packages:[]}})).status,400);assert.equal((await act('submit',{id:draftId,content})).status,200);const id=state.data.designs[0].id;assert.ok(id.startsWith('PHO-'));assert.equal(state.data.designs[0].published,null);
 state.session={username:'two',role:'photographer'};const own=await (await api.GET(new Request('http://localhost'))).json();assert.deepEqual(own.designs,[]);assert.equal((await act('save',{id,content})).status,403);
 state.session={username:'one',role:'photographer'};assert.equal((await act('approve',{id})).status,403);
 state.session={username:'admin',role:'admin'};assert.equal((await act('approve',{id})).status,200);assert.equal(state.data.designs[0].published.title,content.title);
 state.session={username:'one',role:'photographer'};assert.equal((await act('submit',{id,content:{...content,title:'New title'}})).status,200);assert.equal(state.data.designs[0].published.title,content.title);
 state.session={username:'admin',role:'admin'};assert.equal((await act('changes',{id,feedback:'Add more samples'})).status,200);assert.equal(state.data.designs[0].feedback,'Add more samples');assert.equal((await act('approve',{id})).status,400);
 assert.equal((await act('display',{id,hidden:true,featured:true,order:2})).status,200);assert.equal(state.data.designs[0].hidden,true);
 assert.equal((await act('save',{id,content,revision:-1})).status,409);
 const publicItem=publicPhotography(state.data.designs[0]);assert.equal(publicItem.photos[0],`/api/photography/${id}/photos/0`);assert.equal(publicItem.title,content.title);assert.ok(!('draft' in publicItem));assert.ok(!('owner' in publicItem));
 assert.equal((await act('delete',{id})).status,200);assert.equal(state.data.designs.length,0);
});
test('photographer receives viewer permissions on staff endpoints',async()=>{
 const old=process.env.AUTH_SECRET;process.env.AUTH_SECRET='photography-test-secret';
 try{
 const auth=await moduleAt('../app/admin-auth.ts',[
 [/import .* from "drizzle-orm";/,'const eq=()=>undefined;'],
 [/import .* from "\.\.\/db";/,'const ensureStaffMobileColumn=async()=>{};const getDb=()=>{};'],
 [/import .* from "\.\.\/db\/schema";/,'const staffUsers={};'],
 [/import .* from "\.\/password-auth";/,'const hashPassword=()=>{};const safeEqual=()=>false;']
 ]);
 const cookie=await auth.createStaffCookie('studio','photographer');const request=new Request('http://localhost',{headers:{cookie}});
 assert.equal((await auth.getStaffSession(request)).role,'viewer');assert.equal((await auth.getStaffSession(request,true)).role,'photographer');
 }finally{if(old===undefined)delete process.env.AUTH_SECRET;else process.env.AUTH_SECRET=old;}
});

test('portfolio renders packages, price and direct WhatsApp enquiries',async()=>{
 globalThis.photoReact=React;globalThis.photoContact=photographyWhatsapp;
 const {default:Portfolio}=await moduleAt('../components/PhotographyPortfolio.tsx',[
 [/import { useState } from "react";/,'const React=globalThis.photoReact;const {useState}=React;'],
 [/import .*photographyWhatsapp.*;/,'const photographyWhatsapp=globalThis.photoContact;']
 ]);
 const html=renderToStaticMarkup(React.createElement(Portfolio,{portfolio:{...content,id:'PHO-123',featured:false,mobile:'919876543210'}}));
 for(const text of ['Studio One','Celebration','12,000','3 hours of coverage','Event date','Contact photographer','Package%3A%20Celebration'])assert.ok(html.includes(text),text);
 const quote=renderToStaticMarkup(React.createElement(Portfolio,{portfolio:{...content,id:'PHO-123',mobile:'',packages:[{...content.packages[0],price:null}]}}));assert.ok(quote.includes('Enquire for pricing'));assert.ok(!quote.includes('https://wa.me/'));
});
