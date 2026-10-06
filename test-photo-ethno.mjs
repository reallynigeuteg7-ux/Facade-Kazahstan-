import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {catalogFromText,catalogModelById,selectCatalogModel} from './lib/drawings/catalog.mjs';
import {ethnoPhotoCells,ethnoPhotoLoops} from './lib/drawings/ethno-photo.mjs';
import {catalogGeometry} from './lib/drawings/catalog-geometry.mjs';
import {cleanDrawing} from './lib/drawings/model.mjs';
import {assemblyGeometry,renderDrawingPages} from './lib/drawings/render.mjs';
import {renderScene} from './lib/drawings/scene.mjs';
import {projectCatalogView} from './lib/drawings/catalog-sheet.mjs';
const root='D:/Codex/2026-09-05/new-chat/work/ethno-pattern-review';mkdirSync(root,{recursive:true});
const original=JSON.parse(readFileSync('D:/Codex/2026-09-05/new-chat/work/ethno-bench-new-order-2026-09-28/spec-before-ornament-v2.json','utf8'));
assert.equal(catalogModelById(original.catalogModel).id,'catalog-2026-p1-v1');
assert.equal(catalogFromText('Скамейка Этно (PDF-01)'),'blueprint-2026-p1-v2');
assert(catalogGeometry(original).parts.includes('back_pattern_0'),'Old saved v1 remains unchanged');
const spec=cleanDrawing(selectCatalogModel(original,'catalog-2026-p1-v2'));
const scene=catalogGeometry(spec);
const marks=scene.faces.filter(f=>f.surfaceDecoration);
assert.equal(marks.length,ethnoPhotoCells.length);
assert(marks.length<1500,'Keep interactive ornament geometry bounded');
assert(marks.every(f=>f.normal[1]<-.99&&f.edges.every(e=>!e)),'Decoration faces point toward front and have no construction edge outlines');
const bounds=i=>{const values=scene.faces.flatMap(f=>f.points.map(p=>p[i]));return Math.max(...values)-Math.min(...values);};
assert(Math.abs(bounds(0)-1880)<1e-6);assert(Math.abs(bounds(1)-650)<1e-6);assert(Math.abs(bounds(2)-930)<1e-6);
// Every triangle/curl white interior in the trace must remain a hole in the
// filled mesh; compare the two independent point-in-polygon representations.
const inside=(p,loop)=>{let yes=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const edgeDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
let filled=0,clear=0;
for(let y=1;y<100;y+=3)for(let x=1;x<600;x+=5){const p=[x/600,y/100];
  const outline=ethnoPhotoLoops.reduce((v,l)=>v!==inside(p,l),false);
  const mesh=ethnoPhotoCells.some(cell=>inside(p,cell));
  if(mesh!==outline){const distance=Math.min(...ethnoPhotoLoops.flatMap(l=>l.map((a,i)=>edgeDistance(p,a,l[(i+1)%l.length]))));assert(distance<.00001,`Mesh differs from source vector away from a rounded boundary at ${p}, ${distance}`);}
  if(mesh)filled++;else clear++;
}
assert(filled>100&&clear>100);
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const pages=renderDrawingPages(spec,'Скамейка Этно — исправленный орнамент','C9F25666','ru');
assert.equal(pages.length,4);
assert(pages[1].svg.includes('data-part="back_pattern_photo"'));
assert(pages[3].svg.includes('data-ornament="photo-p1-v2"'));
for(const exploded of [false,true]){
  const view=projectCatalogView(scene,{x:0,y:0,w:600,h:400},'iso',exploded);
  assert(view.indexOf('data-part="back_pattern_photo"')>view.lastIndexOf('data-part="upper_decor_panel"'),'Full ornament must paint after its host panel, including exploded view');
}
for(const [i,page]of pages.entries()){assert(!/NaN|Infinity/.test(page.svg));writeFileSync(`${root}/bench-sheet-${i+1}.svg`,page.svg);await sharp(Buffer.from(page.svg)).png().toFile(`${root}/bench-sheet-${i+1}.png`);}
for(const yaw of [-35,0,35,110,180])assert(!/NaN|Infinity/.test(renderScene(assemblyGeometry(spec),{yaw,elevation:25,dimensions:false})));
assert(renderDrawingPages(spec,'Этно','TEST','kk')[3].svg.includes('фотосуреттегі өрнек'));
console.log(`PASS: traced ornament and ${marks.length} mesh faces agree, white interiors preserved, exact envelope, legacy v1 preserved, 4 sheets, 5 camera angles, RU/KK.`);
