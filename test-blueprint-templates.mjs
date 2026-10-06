import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {catalogModels,catalogModelById,catalogFromText} from './lib/drawings/catalog.mjs';
import {initialDrawing,cleanDrawing,readDrawing} from './lib/drawings/model.mjs';
import {catalogGeometry} from './lib/drawings/catalog-geometry.mjs';
import {renderDrawingPages,assemblyGeometry} from './lib/drawings/render.mjs';
import {renderScene} from './lib/drawings/scene.mjs';
import {assertConsistent} from './lib/crm/specification.mjs';
const out='D:/Codex/2026-09-05/new-chat/work/blueprint-review';mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
assert.equal(catalogModels.length,22);assert.equal(catalogModels.filter(m=>m.blueprint).length,22);
assert.deepEqual(catalogModels.filter(m=>!m.blueprint).map(m=>m.page),[]);
const manifest=JSON.parse(readFileSync('public/drawing-templates/manifest.json','utf8'));
for(const item of manifest.items)assert.equal(createHash('sha256').update(readFileSync('public/drawing-templates/'+item.file)).digest('hex'),item.sha256);
const envelope=scene=>[0,1,2].map(i=>{let lo=Infinity,hi=-Infinity;for(const f of scene.faces.filter(f=>!f.surfaceDecoration))for(const p of f.points){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i]);}return hi-lo;});
const partBox=(scene,prefix)=>{const pts=scene.faces.filter(f=>f.name===prefix).flatMap(f=>f.points);return [0,1,2].map(i=>Math.max(...pts.map(p=>p[i]))-Math.min(...pts.map(p=>p[i])));};
const thumbnails=[];
const invalidNumbers=svg=>/NaN|Infinity/.test(svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,''));
for(const model of catalogModels.filter(m=>m.blueprint)){
 const spec=initialDrawing(model.name+` (PDF-${String(model.page).padStart(2,'0')})`),b=model.blueprint;
 assert.equal(catalogFromText(`Каталог, стр. ${model.page}`),model.id);
 assert.deepEqual(spec.dimensions,b.base);
 const scene=catalogGeometry(spec);assert(scene.faces.length>0);
 assert(scene.faces.every(f=>f.points.flat().every(Number.isFinite)&&f.normal.every(Number.isFinite)));
 const resized=cleanDrawing({...spec,dimensions:{...spec.dimensions,width:b.base.width+200,height:b.base.height+100,depth:b.base.depth+100}});
 const next=catalogGeometry(resized);assert.deepEqual(scene.stock,next.stock,'Stock sections must not scale');
 if(b.shape.startsWith('bench')||b.shape==='kit'){
  const before=partBox(scene,'wood_seat_1'),after=partBox(next,'wood_seat_1');
  assert.equal(before[1],b.fixed.woodWidth);assert.equal(after[1],before[1]);assert.equal(before[2],b.fixed.woodThickness);assert.equal(after[2],before[2]);assert.equal(after[0]-before[0],200);
  assert(next.bom.find(r=>r.name==='Планка сиденья').count>=scene.bom.find(r=>r.name==='Планка сиденья').count);
 }
 if(b.shape==='kit'){
  assert.equal(b.attachment,9);assert.deepEqual(partBox(scene,'kit_bin_canopy'),partBox(next,'kit_bin_canopy'));assert.deepEqual(partBox(scene,'kit_light_cap'),partBox(next,'kit_light_cap'));
 }else{
  const env=envelope(scene);assert(Math.abs(env[0]-b.base.width)<1,`p${model.page} width ${env}`);assert(Math.abs(env[1]-b.base.depth)<1,`p${model.page} depth ${env}`);assert(Math.abs(env[2]-b.base.height)<1,`p${model.page} height ${env}`);
 }
 const pages=renderDrawingPages(spec,model.name,`ШАБЛОН-${model.page}`,'ru',{yaw:35,elevation:25});
 assert(pages.some(p=>p.svg.includes('Спецификация по шаблону')));assert(pages.at(-1).svg.includes('Проверка шаблона'));assert(!pages.some(p=>invalidNumbers(p.svg)));
 for(const mode of ['front','side','rear','top','iso'])assert(pages[1].svg.includes(`data-projection="${mode}"`));
 for(const yaw of [35,180])assert(!invalidNumbers(renderScene(assemblyGeometry(resized),{yaw,elevation:25,dimensions:true})));
 writeFileSync(`${out}/p${model.page}.json`,JSON.stringify(spec,null,2));
 for(const [i,p]of pages.entries())writeFileSync(`${out}/p${model.page}-${i+1}.svg`,p.svg);
 await sharp(Buffer.from(pages[1].svg)).resize(700,500).png().toFile(`${out}/p${model.page}-assembly.png`);
 const img=await sharp(Buffer.from(pages[1].svg)).resize(350,250).png().toBuffer();const n=thumbnails.length;thumbnails.push({input:img,left:(n%4)*350,top:Math.floor(n/4)*250});
 console.log('PASS p'+model.page,scene.faces.length,'faces',pages.length,'sheets');
}
assert.throws(()=>cleanDrawing({...initialDrawing('Скамейка PDF-01'),dimensions:{width:100,height:200,depth:50,thickness:8}}),/Размеры не подходят/);
assert.equal(catalogModelById('catalog-2026-p1-v1').blueprint,null);
const original=readDrawing(readFileSync('D:/Codex/2026-09-05/new-chat/work/catalog-test-all-2026-09-28/PDF-15/spec.json','utf8'));
assert.equal(original.catalogModel,'catalog-2026-p15-v1');assert(catalogGeometry(original).parts.includes('canopy'));
const legacyPartial=initialDrawing('Урна PDF-15','','','','catalog-2026-p15-v1');
assert.equal(legacyPartial.dimensions.depth,null);assert.equal(legacyPartial.dimensions.thickness,null);
assert.doesNotThrow(()=>assertConsistent({product:'Урна PDF-15',size:'380 × 640 × ? мм',finish:'',drawing:'',drawing_spec:JSON.stringify(legacyPartial)}),'Missing sizes on a legacy order must not be compared with defaults of a newer revision');
assert.equal(catalogGeometry(initialDrawing('Скамейка PDF-01')).bom.find(p=>p.name==='Планка спинки').count,3,'All three full-section back slats fit the source sheet');
await sharp({create:{width:1400,height:Math.ceil(thumbnails.length/4)*250,channels:3,background:'#d1d8dc'}}).composite(thumbnails).png().toFile(out+'/all-templates.png');
console.log('PASS: 22 templates, 24 intact originals, kit image9, fixed sections under resizing, legacy IDs, views and export sheets.');
