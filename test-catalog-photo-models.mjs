import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {photoModels as catalogModels,catalogFromText,selectCatalogModel} from './lib/drawings/catalog.mjs';
import {cleanDrawing,initialDrawing,readDrawing} from './lib/drawings/model.mjs';
import {assemblyGeometry,renderDrawingPages} from './lib/drawings/render.mjs';
import {sceneGeometry,exportObj} from './lib/drawings/scene.mjs';
import {parseDrawingResponse,supplementDrawing} from './lib/ai/drawing.mjs';
const out='D:/Codex/2026-09-05/new-chat/work/catalog-photo-models';mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const state=JSON.parse(readFileSync('D:/Codex/2026-09-05/new-chat/work/catalog-test-all-2026-09-28/batch.json','utf8'));
assert.equal(catalogFromText('Каталог 29.08.26.pdf, страница 15'),'blueprint-2026-p15-v2');
assert.equal(catalogFromText('страница 15 неизвестного документа'),null);
assert.equal(catalogFromText('Каталог, стр. 25'),null);
assert.equal(catalogFromText('Урна с козырьком (PDF-15)'),'blueprint-2026-p15-v2');
assert.equal(catalogFromText('Каталог, 15 бет'),'blueprint-2026-p15-v2');
for(const model of catalogModels){
  const fixture=state.cases.find(c=>c.page===model.page);
  const old=JSON.parse(readFileSync(`D:/Codex/2026-09-05/new-chat/work/catalog-test-all-2026-09-28/${fixture.key}/spec.json`,'utf8'));
  const spec=cleanDrawing(selectCatalogModel(old,model.id));
  const scene=sceneGeometry(assemblyGeometry(spec));
  assert(scene.faces.length>0,model.name);
  assert(scene.faces.every(f=>f.points.flat().every(Number.isFinite)),model.name);
  for(const [i,key] of ['width','depth','height'].entries()){
    const values=scene.faces.flatMap(f=>f.points.map(p=>p[i]));
    assert(Math.abs(Math.max(...values)-Math.min(...values)-spec.dimensions[key])<1e-6,`External ${key} must match order: ${model.name}`);
  }
  assert(scene.faces.every(f=>f.points.every(([x,y,z])=>Math.abs(x)<=spec.dimensions.width*.65&&Math.abs(y)<=spec.dimensions.depth*.65&&z>=-spec.dimensions.height*.05&&z<=spec.dimensions.height*1.08)),`Geometry escapes reference envelope: ${model.name}`);
  for(const key of ['width','height','depth','thickness'])assert.equal(spec.dimensions[key],old.dimensions[key]);
  const pages=renderDrawingPages(spec,model.name,`P${model.page}`,'ru',{yaw:35,elevation:25});
  assert.equal(pages.length,model.page===1?4:3);
  for(const mode of ['front','side','rear','top','iso'])assert(pages[1].svg.includes(`data-projection="${mode}"`));
  if(model.page===2)assert(/data-projection="side"[\s\S]*?data-part="side_ornate_0.41"/.test(pages[1].svg),'Concave side panels must remain visible.');
  assert(!pages.some(p=>/NaN|Infinity/.test(p.svg)));
  for(const [i,p] of pages.entries()){writeFileSync(`${out}/p${model.page}-${i+1}.svg`,p.svg);await sharp(Buffer.from(p.svg)).png().toFile(`${out}/p${model.page}-${i+1}.png`);}
  writeFileSync(`${out}/p${model.page}.json`,JSON.stringify(spec,null,2));
  const bigger=cleanDrawing({...spec,dimensions:{...spec.dimensions,width:spec.dimensions.width*1.4,height:spec.dimensions.height*1.1,depth:spec.dimensions.depth*1.2}});
  const after=sceneGeometry(assemblyGeometry(bigger));
  assert.deepEqual(after.parts,scene.parts,'Changing size must preserve photo topology.');
  assert(exportObj(assemblyGeometry(bigger)).includes('internal proportions are estimated'));
}
const original=readDrawing(readFileSync('D:/Codex/2026-09-05/new-chat/work/catalog-test-all-2026-09-28/PDF-15/spec.json','utf8'));
assert.equal(original.catalogModel,'catalog-2026-p15-v1');
const urn=sceneGeometry(assemblyGeometry(original));
for(const name of ['canopy','inclined_support_-0.49','canopy_post_-0.29','vessel_front','vessel_rear'])assert(urn.parts.includes(name));
assert.equal(urn.parts.includes('body'),false,'A hooded bin must not be replaced by a box.');
assert.equal(cleanDrawing({...original,catalogModel:'none'}).catalogModel,'none');
assert.throws(()=>cleanDrawing({...original,catalogModel:'catalog-2026-p1-v1'}));
assert.throws(()=>cleanDrawing({...original,catalogModel:'https://attacker.test/model'}));
const noDimensions=initialDrawing('Урна · каталог, страница 15');
assert.deepEqual(noDimensions.dimensions,{width:380,height:640,depth:380,thickness:3},'Source drawing dimensions fill the selected template defaults.');
assert(sceneGeometry(assemblyGeometry(noDimensions)).faces.length>0);
const answers=['Мангал, каталог стр. 19','1000 × 800 × 400 мм','1 шт','толщина 3 мм','Каталог, стр. 19','Алматы','ТЕСТ','ТЕСТ','+70000000000'];
const ai=parseDrawingResponse(JSON.stringify({kind:'cut',dimensions:{}}),answers);
assert.equal(ai.kind,'custom');assert.equal(ai.catalogModel,'blueprint-2026-p19-v2');
assert.equal(supplementDrawing(original,{...original,catalogModel:null}).catalogModel,original.catalogModel);
console.log('PASS: 22 source photo models, 66 sheets rendered, consistent views, resize topology, legacy binding, evidence boundaries and OBJ.');
