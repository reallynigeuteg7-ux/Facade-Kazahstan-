import { blueprintByPage } from './blueprints.mjs';
import { blueprintByPage as legacyBlueprintByPage } from './blueprints-v1.mjs';
// Photo-derived, normalized visual models. This is a reviewed library, not an
// automatic reconstruction of hidden dimensions or a trained vision model.
// Pin revision in saved orders so future library edits do not alter old geometry.
const rows = [
  ['bench', 'Скамейка Этно с наклонными опорами', 'angled', 1880,930,650],
  ['bench', 'Скамейка с ажурными боковинами и подлокотниками', 'ornate'],
  ['bench', 'Скамейка с боковыми панелями', 'panel',1900,820,550,2],
  ['bench', 'Скамейка с прямыми опорами и подлокотниками', 'tube',1900,820,500,2],
  ['bench', 'Скамейка с тёмными наклонными опорами', 'angled-dark'],
  ['bench', 'Скамейка с ажурными боковинами', 'ornate'],
  ['bench', 'Комплект 3 в 1: скамейка, урна, светильник', 'kit'],
  ['bench', 'Скамейка с панельными опорами', 'panel-dark'],
  ['bench', 'Скамейка без спинки', 'backless'],
  ['bin', 'Урна с козырьком на двух стойках', 'hood',350,750],
  ['bin', 'Урна в ажурном каркасе', 'cage'],
  ['bin', 'Урна с круглой ёмкостью в каркасе', 'round-cage',350,600],
  ['bin', 'Урна с округлым верхом и деревянными вставками', 'arch'],
  ['bin', 'Урна с деревянными вставками', 'wood'],
  ['bin', 'Урна с наклонными опорами и козырьком', 'angled-hood',380,640],
  ['bin', 'Прямоугольная урна с проёмом', 'slot'],
  ['basket', 'Корзина кондиционера', 'basket',560,560,350],
  ['light', 'Уличный светильник', 'light',560,1100,100,1.5],
  ['custom', 'Мангал на четырёх опорах', 'grill',null,null,null,3],
  ['custom', 'Костровая чаша', 'fire',740,300,null,3],
  ['custom', 'Садовые качели с навесом', 'swing',2160,2130],
  ['gazebo', 'Беседка с каркасом и скамейкой', 'gazebo',3500,2500,2000],
];
export const photoModels = rows.map(([kind,name,shape,width,height,depth,thickness],i)=>({
  id:`catalog-2026-p${i+1}-v${i===0?2:1}`,page:i+1,kind:String(kind),name:String(name),shape:String(shape),
  image:`/catalog-document/page-${i+1}.jpg`,
  blueprint:null,
  known:{width:typeof width==='number'?width:null,height:typeof height==='number'?height:null,depth:typeof depth==='number'?depth:null,thickness:typeof thickness==='number'?thickness:null},
}));
// Saved v1 orders retain their original schematic ornament until explicitly upgraded.
const legacyEthno={...photoModels[0],id:'catalog-2026-p1-v1'};
export const catalogModels=photoModels.map(model=>{
 const blueprint=blueprintByPage(model.page);
 return blueprint?{...model,id:blueprint.id,name:model.page===10?'Урна с пепельницей':model.page===12?'Урна с диагональным ажурным корпусом':model.page===22?'Каркас с двумя подвесными креслами':model.name,blueprint,known:blueprint.base}:model;
});
const legacyBlueprintModels=photoModels.flatMap(model=>{const blueprint=legacyBlueprintByPage(model.page);return blueprint?[{...model,id:blueprint.id,blueprint:{...blueprint,solidRevision:0},known:blueprint.base}]:[];});
export const catalogModelById = id => catalogModels.find(m=>m.id===id) || legacyBlueprintModels.find(m=>m.id===id) || photoModels.find(m=>m.id===id) || (id===legacyEthno.id?legacyEthno:null);
export function catalogFromText(text) {
  const source=String(text).normalize('NFC').toLowerCase();
  const match=source.match(/\bpdf[-\s]*(\d{1,2})(?!\d)/u) || source.match(/(?:каталог|catalog)[^;\n]{0,80}?(?:страниц(?:а|ы|е|у)?|стр\.?|page|бет)\s*[:№#.-]?\s*(\d{1,2})(?!\d)/u) || source.match(/(?:каталог|catalog)[^;\n]{0,40}?(\d{1,2})\s*бет/u);
  return match ? catalogModels.find(m=>m.page===Number(match[1]))?.id || null : null;
}
export function selectCatalogModel(spec,id) {
  const model=catalogModelById(id);
  if(!model) return {...spec,catalogModel:'none'};
  return {...spec,catalogModel:model.id,kind:model.kind,decoration:'none',clearHeight:null,
    construction:{...spec.construction,form:'unspecified',straightSpans:[],arcSegments:null},
    dimensions:Object.fromEntries(Object.entries(spec.dimensions).map(([key,value])=>[key,value??model.known[key]??null])),
  };
}
