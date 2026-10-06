import {createSolidBuilder} from './solid-builder.mjs';
import {blueprintGeometry as legacyGeometry} from './blueprint-geometry-v1.mjs';
import {buildBlueprintBench} from './blueprint-bench.mjs';
import {buildBlueprintContainers,buildKitAccessories} from './blueprint-containers.mjs';
import {buildBlueprintOutdoor} from './blueprint-outdoor.mjs';
import {buildFinalThree} from './blueprint-final-three.mjs';
export function blueprintGeometry(spec,model){
 if(!model.blueprint.solidRevision)return legacyGeometry(spec,model);
 const b=model.blueprint,f=b.fixed;
 const metal=/9016|7035|Белый/.test(f.paint)?'#dcdedb':b.shape==='basket'?'#b39b61':[12,16,20].includes(model.page)?'#4d5155':'#303438';
 const kit=createSolidBuilder(metal);
 if(b.shape.startsWith('bench')||b.shape==='kit')buildBlueprintBench(kit,spec,model,metal);
 else if([12,16,20].includes(model.page))buildFinalThree(kit,spec,model,metal);
 else if([19,21,22].includes(model.page))buildBlueprintOutdoor(kit,spec,model,metal);
 else buildBlueprintContainers(kit,spec,model,metal);
 if(b.shape==='kit')buildKitAccessories(kit,spec,metal);
 return {faces:kit.faces,parts:kit.parts,cutParts:kit.cutParts,bom:kit.bom,wires:[],guides:[],reference:model,dimensionScope:b.dimensionScope,stock:{...f,panelThickness:spec.dimensions.thickness??b.base.thickness},solidRevision:2,draft:true};
}
