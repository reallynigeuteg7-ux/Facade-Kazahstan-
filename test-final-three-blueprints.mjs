import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initialDrawing,cleanDrawing} from './lib/drawings/model.mjs';
import {catalogModels,catalogModelById} from './lib/drawings/catalog.mjs';
import {catalogGeometry} from './lib/drawings/catalog-geometry.mjs';
import {renderDrawingPages,assemblyGeometry} from './lib/drawings/render.mjs';
import {exportObj} from './lib/drawings/scene.mjs';
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const out='D:/Codex/2026-09-05/new-chat/work/blueprint-final-three-review';mkdirSync(out,{recursive:true});
const bounds=(scene,predicate=()=>true)=>{
 const low=[Infinity,Infinity,Infinity],high=low.map(()=>-Infinity);
 for(const f of scene.faces.filter(predicate))for(const p of f.points)for(let i=0;i<3;i++){low[i]=Math.min(low[i],p[i]);high[i]=Math.max(high[i],p[i]);}
 return {low,high,size:high.map((v,i)=>v-low[i])};
};
const thumbs=[];
for(const page of [12,16,20]){
 const model=catalogModels[page-1],spec=initialDrawing('PDF-'+page),scene=catalogGeometry(spec);
 for(const dims of [spec.dimensions,{...spec.dimensions,width:spec.dimensions.width+200,height:spec.dimensions.height+100,depth:spec.dimensions.depth+100}]){
  const current=catalogGeometry(cleanDrawing({...spec,dimensions:dims})),box=bounds(current);
  for(const [i,v]of [dims.width,dims.depth,dims.height].entries())assert(Math.abs(box.size[i]-v)<.01,`p${page} resized physical bounds ${box.size}`);
  assert.deepEqual(current.stock,scene.stock);
  assert(current.faces.every(f=>Math.abs(Math.hypot(...f.normal)-1)<1e-6));
  if(page!==20){
   const bin=bounds(current,f=>f.name.startsWith('removable_vessel'));
   assert.equal(bin.size[0],dims.width-90);assert.equal(bin.size[1],dims.depth-90);
   if(page===16)assert.equal(bin.high[2],dims.height-140,'Vessel must not obstruct the side opening');
   assert(current.cutParts.find(p=>p.name==='front_cut_panel').holes.length>40);
  }else{
   const walls=current.cutParts.filter(p=>p.name.startsWith('firebox_decor_'));
   assert.equal(walls.length,6);assert(walls.every(p=>p.holes.length===1&&p.thickness===3));
   for(const name of walls.map(p=>p.name)){
    const caps=current.faces.filter(f=>f.name===name&&f.cap);assert.equal(caps.length,2);
    const point=caps[0].capMap([0,0]),other=caps[1].capMap([0,0]);
    assert(Math.abs(Math.hypot(...point.map((v,i)=>v-other[i]))-3)<1e-8,'Sloped steel has a true 3 mm skin');
   }
  }
 }
 assert.equal(catalogModelById(`catalog-2026-p${page}-v1`).blueprint,null);
 const pages=renderDrawingPages(spec,model.name,'ШАБЛОН-'+page,'ru',{yaw:35,elevation:25});
 for(const [i,p]of pages.entries())writeFileSync(`${out}/p${page}-${i+1}.svg`,p.svg);
 for(const i of [0,1,2])await sharp(Buffer.from(pages[i].svg)).png().toFile(`${out}/p${page}-${i+1}.png`);
 writeFileSync(`${out}/p${page}.obj`,exportObj(assemblyGeometry(spec)));
 writeFileSync(`${out}/p${page}-spec.json`,JSON.stringify(spec,null,2));
 const thumb=await sharp(Buffer.from(pages[0].svg)).resize(700,500).png().toBuffer();thumbs.push({input:thumb,left:thumbs.length*700,top:0});
 console.log('PASS final template',page,scene.faces.length,'faces',scene.cutParts.length,'cut parts',pages.length,'sheets');
}
await sharp({create:{width:2100,height:500,channels:3,background:'#ffffff'}}).composite(thumbs).png().toFile(out+'/three-models.png');
