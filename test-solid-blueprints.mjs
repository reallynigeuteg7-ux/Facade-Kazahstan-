import assert from 'node:assert/strict';
import {catalogModels,catalogModelById} from './lib/drawings/catalog.mjs';
import {initialDrawing,cleanDrawing} from './lib/drawings/model.mjs';
import {catalogGeometry} from './lib/drawings/catalog-geometry.mjs';
import {triangulateLoops,area2,inside} from './lib/drawings/solid.mjs';
import {exportObj} from './lib/drawings/scene.mjs';
import {assemblyGeometry} from './lib/drawings/render.mjs';
let panels=0,apertures=0;const mismatches=[];
for(const model of catalogModels.filter(m=>m.blueprint)){
 const spec=initialDrawing(model.name+' PDF-'+model.page),scene=catalogGeometry(spec);
 assert.equal(scene.solidRevision,2);assert(!scene.faces.some(f=>f.surfaceDecoration));assert(scene.faces.every(f=>f.points.flat().every(Number.isFinite)));
 const loopsSeen=new Set();for(const f of scene.faces){if(!f.localLoops||loopsSeen.has(f.localLoops))continue;loopsSeen.add(f.localLoops);const loops=f.localLoops,tris=triangulateLoops(loops);
  const expected=loops.reduce((s,l,i)=>s+Math.abs(area2(l))/2*(loops.filter((q,j)=>i!==j&&inside(l[0],q)).length%2?-1:1),0),actual=tris.reduce((s,l)=>s+Math.abs(area2(l))/2,0);
  if(Math.abs(actual-expected)>Math.max(.1,Math.abs(expected)*.0001))mismatches.push([model.page,f.name,+(actual-expected).toFixed(3),+expected.toFixed(3)]);
  if(loops.length>1){panels++;apertures+=loops.length-1;assert(scene.faces.some(w=>w.name===f.name&&w.cutWall),'Apertures require thickness walls');}
 }
 const old=catalogModelById(`blueprint-2026-p${model.page}-v1`)||catalogModelById(`catalog-2026-p${model.page}-v1`);assert(old);const oldScene=catalogGeometry(cleanDrawing({...spec,catalogModel:old.id}));assert(!oldScene.solidRevision,'Old pinned models retain original geometry');
 console.log('SOLID',model.page,scene.parts.length,'parts',scene.cutParts.length,'sheet parts');
}
console.log('AREA MISMATCHES',JSON.stringify(mismatches));assert.equal(mismatches.length,0,'No cap triangles may fill a hole or omit material');
const obj=exportObj(assemblyGeometry(initialDrawing('Скамейка PDF-01')));assert(obj.includes('upper_decor_panel'));assert(!/NaN|Infinity/.test(obj));assert(obj.split('\n').filter(l=>l.startsWith('f ')).length>1000);
console.log(`PASS ${panels} perforated / hollow parts, ${apertures} boundaries, fixed legacy revisions, real OBJ geometry`);
