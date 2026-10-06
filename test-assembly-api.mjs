import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClient} from '@libsql/client';
const base='http://127.0.0.1:3015',origin='http://localhost:3015';
const send=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
const password=readFileSync('D:/Codex/2026-09-05/new-chat/work/vercel-admin-login.txt','utf8').split(String.fromCharCode(10)).find(s=>s.startsWith('Пароль:')).slice(7).trim();
let r=await send('/api/auth/login',{password});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
process.loadEnvFile('.env.local');assert(process.env.TURSO_DATABASE_URL.startsWith('file:'));const db=createClient({url:process.env.TURSO_DATABASE_URL});
const requestId=crypto.randomUUID();
try{
 const body={requestId,consent:true,prepareDrawing:true,answers:['Овальный каркас','16000 × 4000 × 10000 мм','1 шт','Сталь, толщина 2 мм','Овальный каркас; ширина пояса 1000 мм; высота пояса 100 мм; пролёты 1800+2400+1800 мм; делений полуокружности 6','Алматы','Октябрь','Тест геометрии','+7 700 123 45 67']};
 r=await send('/api/enquiries',body);assert.equal(r.status,201);const saved=await r.json();assert.equal(saved.drawingSpec.construction.form,'oval-frame');assert.equal(saved.drawingSpec.construction.bandWidth,1000);
 r=await send('/api/enquiries',body);assert.equal((await r.json()).id,saved.id);
 r=await fetch(base+'/api/crm',{headers:{Cookie:cookie}});assert.equal(r.status,200);const lead=(await r.json()).leads.find(l=>l.id===saved.id);assert.deepEqual(JSON.parse(lead.drawing_spec).construction.straightSpans,[1800,2400,1800]);
 const updated={...saved.drawingSpec,construction:{...saved.drawingSpec.construction,postSize:80}};
 r=await send('/api/enquiries',{...body,prepareDrawing:false,drawingSpec:updated});assert.equal(r.status,201);
 r=await fetch(base+'/api/crm/drawing?id='+saved.id,{headers:{Cookie:cookie}});assert.equal(r.status,200);const svg=await r.text();assert(svg.includes('Объёмный вид')&&svg.includes('Координаты осей стоек')&&svg.includes('3 900'));
 r=await fetch(base+'/api/crm/drawing?id='+saved.id);assert.equal(r.status,403);
 const count=await db.execute({sql:'SELECT COUNT(*) AS n FROM crm_leads WHERE request_id=?',args:[requestId]});assert.equal(count.rows[0].n,1);
 console.log('Passed: automatic construction extraction ('+saved.drawingSpec.origin+'), CRM persistence, retry deduplication, section edit, multi-sheet SVG and anonymous download rejection.');
}finally{
 await db.execute({sql:'DELETE FROM crm_notes WHERE lead_id IN (SELECT id FROM crm_leads WHERE request_id=?)',args:[requestId]});
 await db.execute({sql:'DELETE FROM crm_leads WHERE request_id=?',args:[requestId]});db.close();console.log('Local synthetic enquiry removed.');
}