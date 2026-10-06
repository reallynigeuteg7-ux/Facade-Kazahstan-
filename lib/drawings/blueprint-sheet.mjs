import { catalogGeometry } from './catalog-geometry.mjs';
import { catalogModelById } from './catalog.mjs';
import { projectCatalogView } from './catalog-sheet.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const tx=(x,y,s,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${esc(s)}</text>`;
function cutDetail(part,box,label){
 const pts=part.outer,lo=[0,1].map(i=>Math.min(...pts.map(p=>p[i]))),hi=[0,1].map(i=>Math.max(...pts.map(p=>p[i]))),w=hi[0]-lo[0],h=hi[1]-lo[1],scale=Math.min((box.w-60)/w,(box.h-85)/h),left=box.x+(box.w-w*scale)/2,top=box.y+35+(box.h-85-h*scale)/2;
 const path=[part.outer,...part.holes].map(loop=>'M'+loop.map(([x,y])=>`${(left+(x-lo[0])*scale).toFixed(2)} ${(top+(hi[1]-y)*scale).toFixed(2)}`).join('L')+'Z').join('');
 return tx(box.x+12,box.y+20,label,'font-size="16" font-weight="700"')+`<path d="${path}" fill="#e1e2df" fill-rule="evenodd" stroke="#41494c" stroke-width=".5"/>`+tx(box.x+box.w/2,box.y+box.h-12,`${w.toFixed(1)} × ${h.toFixed(1)} мм · t ${part.thickness} мм`,'font-size="13" text-anchor="middle"');
}
function solidDetails(scene,b){
 let out=tx(60,212,'Детали модели · орнамент и неизменные сечения','font-size="21" font-weight="700"');
 out+=tx(60,240,'Эти контуры используются в объёмной модели и её проекциях. Размеры — по текущему заказу.','font-size="14"');
 const selected=[],seen=new Set();
 for(const prefix of ['upper_decor','front_decor','side_panel','front_cut','side_cut','upper_ash_front','vessel_front','side_decor','firebox_decor','light_face']){
  const part=scene.cutParts.find(p=>p.name.startsWith(prefix)&&!seen.has(p.name));if(part){selected.push(part);seen.add(part.name);}
 }
 for(const part of scene.cutParts)if(selected.length<3&&!seen.has(part.name)){selected.push(part);seen.add(part.name);}
 const labels={'upper':'Верхняя панель','front':'Передняя панель','side':'Боковая панель','vessel':'Панель ёмкости','light':'Панель светильника','firebox':'Стенка жаровни','leg':'Опорная пластина'};
 for(const [i,part]of selected.slice(0,3).entries()){
  const box=i===0?{x:60,y:265,w:1280,h:255}:i===1?{x:60,y:535,w:625,h:300}:{x:705,y:535,w:635,h:300};
  out+=`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="white" stroke="#bfcbd0"/>`+cutDetail(part,box,labels[part.name.split('_')[0]]||'Деталь');
 }
 if(!selected.length){
  const names=scene.parts.filter(p=>/^(wood_seat_0|wood_seat_1|side_base_0|body_side_|canopy_sheet|roof_corrugated)/.test(p)).slice(0,3);
  names.forEach((name,i)=>{const subset={...scene,faces:scene.faces.filter(f=>f.name===name),parts:[name]};out+=tx(75+i*425,285,name.startsWith('wood')?'Планка':'Элемент конструкции','font-size="16"')+projectCatalogView(subset,{x:60+i*425,y:310,w:410,h:440},'iso');});
 }
 const f=b.fixed;out+=tx(60,870,`Сечения из шаблона: ${f.woodWidth?`дерево ${f.woodWidth}×${f.woodThickness} мм; `:''}${f.tubeA?`труба ${f.tubeA}×${f.tubeB}×${f.tubeWall} мм; `:''}${f.fastener?`крепёж ${f.fastener}`:''}`,'font-size="15"');
 out+=tx(60,906,'Контур восстановлен по растровому листу. Перед резкой проверить замкнутость, перемычки и посадочные размеры.','font-size="14" fill="#97653b"');return out;
}
function wrap(s,width){const rows=[''];for(const word of String(s).split(' ')){if((rows.at(-1)+' '+word).length>width)rows.push(word);else rows[rows.length-1]+=(rows.at(-1)?' ':'')+word;}return rows;}
export function blueprintSpecificationSheets(spec){
 const model=catalogModelById(spec.catalogModel),b=model.blueprint,scene=catalogGeometry(spec),pages=[];
 const entries=scene?.bom||[];
 if(scene?.solidRevision)pages.push({title:'Детали / Орнамент и сечения',content:solidDetails(scene,b)});
 if(b.dimensionScope==='bench'&&scene){
  let out=tx(60,215,'Комплект по изображению 9 · независимые размеры элементов','font-size="20" font-weight="700"');
  for(const [prefix,label,yy,ww,hh]of [['kit_bin_','Урна · 500×700×500 мм',250,500,700],['kit_light_','Столбик · профиль 120, основание 200, высота 1000 мм',580,200,1000]]){
   const subset={...scene,faces:scene.faces.filter(f=>f.name.startsWith(prefix)),parts:scene.parts.filter(n=>n.startsWith(prefix))};
   out+=tx(65,yy,label,'font-size="17" font-weight="600"');
   for(const [mode,xx,dims]of [['front',70,[ww,hh]],['side',470,[ww,hh]],['iso',870,null]])out+=projectCatalogView(subset,{x:xx,y:yy+20,w:360,h:260,dims},mode);
  }
  out+=tx(60,940,'Изменение W/H/D скамейки не растягивает урну и столбик. Внутренние узлы этих элементов предварительные.','font-size="13" fill="#97653b"');
  pages.push({title:'03 / Элементы комплекта',content:out});
 }
 for(let start=0;start<Math.max(1,entries.length);start+=9){
  let out=tx(60,220,`Источник: изображение ${b.attachment} · каталог, страница ${b.page}`,'font-size="19" font-weight="700"');
  out+=tx(60,251,`Исходные W/H/D: ${b.base.width} × ${b.base.height} × ${b.base.depth} мм; заказ: ${spec.dimensions.width} × ${spec.dimensions.height} × ${spec.dimensions.depth} мм`,'font-size="16"');
  out+=tx(60,281,'Длины и компоновка пересчитаны; сечения дерева, труб и их стенки сохранены.','font-size="15"');
  const xs=[60,360,445,850,1080,1340],rows=[{name:'Деталь',count:'Кол-во',size:'Размер / сечение, мм',material:'Материал',note:'Примечание'},...entries.slice(start,start+9)];
  rows.forEach((r,i)=>{
   const y=310+i*52;out+=`<rect x="60" y="${y}" width="1280" height="52" fill="${i===0?'#e9eff2':'white'}" stroke="#aab9c2" stroke-width=".7"/>`;
   for(let j=1;j<xs.length-1;j++)out+=`<path d="M${xs[j]} ${y}V${y+52}" stroke="#aab9c2" stroke-width=".7"/>`;
   const values=[r.name,r.count,r.size,r.material,r.note],limits=[34,8,44,24,28];
   values.forEach((v,j)=>wrap(v??'',limits[j]).slice(0,3).forEach((s,k)=>out+=tx(xs[j]+8,y+17+k*14,s,`font-size="12"${i===0?' font-weight="700"':''}`)));
  });
  out+=tx(60,890,`Покрытие из образца: ${b.fixed.paint||'не указано'}; фактическое — по заказу.`,'font-size="14"');
  out+=tx(60,920,'Это расчётная заготовка: контуры, отверстия, крепёж и нагрузки проверяет специалист.','font-size="14" fill="#97653b"');
  pages.push({title:'03 / Спецификация по шаблону',content:out});
 }
 const warnings=[...new Set(spec.warnings)],lines=warnings.flatMap((s,i)=>wrap(`${i+1}. ${s}`,112));
 let info=tx(60,220,'Что требует проверки по исходному листу','font-size="21" font-weight="700"');
 lines.slice(0,22).forEach((s,i)=>info+=tx(60,270+i*24,s,'font-size="16"'));
 info+=tx(60,855,'Оригинал доступен в карточке заказа и в библиотеке шаблонов.','font-size="17"');
 info+=tx(60,885,'Числа на оригинальном PNG относятся к образцу, а не к изменённому заказу.','font-size="15"');
 pages.push({title:'04 / Проверка шаблона',content:info});
 return pages;
}
