import { catalogGeometry } from './catalog-geometry.mjs';
import { catalogModelById } from './catalog.mjs';
import { ethnoPhotoLoops } from './ethno-photo.mjs';
import { faceSvg } from './face-svg.mjs';
import { rasterView } from './raster-view.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const tx=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`;
const line=(a,b)=>`<path d="M${a.join(' ')} L${b.join(' ')}" fill="none" stroke="#52606a" stroke-width=".8"/>`;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const projections={
  front:{point:([x,,z])=>[x,-z],toward:[0,-1,0]},
  side:{point:([,y,z])=>[-y,-z],toward:[1,0,0]},
  rear:{point:([x,,z])=>[-x,-z],toward:[0,1,0]},
  top:{point:([x,y])=>[x,-y],toward:[0,0,1]},
  iso:{point:([x,y,z])=>[.82*x+.57*y,.30*x-.43*y-.85*z],toward:[.49,-.70,.51]},
};
export function projectCatalogView(scene,box,mode,explode=false) {
  const projection=projections[mode];
  const groups=[...new Set(scene.faces.map(f=>f.name.split('_')[0]))];
  const partBounds=new Map();let envelope=0;
  for(const f of scene.faces){if(!partBounds.has(f.name))partBounds.set(f.name,[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]]);const [lo,hi]=partBounds.get(f.name);for(const p of f.points)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);envelope=Math.max(envelope,Math.abs(p[i]));}}
  const partCenters=new Map([...partBounds].map(([name,[lo,hi]])=>[name,lo.map((n,i)=>(n+hi[i])/2)])),gap=envelope*.15;
  const faces=scene.faces.map(f=>{
    if(!explode)return f;
    const host=f.decorationHost||'upper_decor_panel';
    const center=partCenters.get(f.surfaceDecoration?host:f.name)||[0,0,0];
    const group=groups.indexOf(f.surfaceDecoration?host.split('_')[0]:f.name.split('_')[0]);
    const shift=p=>p.map((n,i)=>n+(i===2?(group%3)*gap:Math.sign(center[i])*gap));
    return {...f,points:f.points.map(shift),holes:f.holes?.map(l=>l.map(shift)),capMap:f.capMap?(p=>shift(f.capMap(p))):undefined};
  });
  // Marks on a broad panel must be painted with their host surface. Sorting
  // tiny cells by their own centroids otherwise hides half under the panel.
  const hostDepths=new Map();for(const f of faces)if(!f.surfaceDecoration){const depth=f.points.reduce((s,p)=>s+dot(p,projection.toward),0)/f.points.length;hostDepths.set(f.name,Math.max(hostDepths.get(f.name)??-Infinity,depth));}
  const shapes=faces.map(f=>({...f,normal:f.normal||cross(sub(f.points[1],f.points[0]),sub(f.points[2],f.points[0])),points2:f.points.map(projection.point),depth:f.surfaceDecoration?(hostDepths.get(f.decorationHost||'upper_decor_panel')??0)+.001:f.points.reduce((s,p)=>s+dot(p,projection.toward),0)/f.points.length})).filter(f=>dot(f.normal,projection.toward)>1e-7);
  const points=shapes.flatMap(f=>f.points2);if(!points.length)return '';
  const lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(const p of points)for(let i=0;i<2;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}
  const pad=mode==='iso'?16:32,s=Math.min((box.w-2*pad)/(hi[0]-lo[0]||1),(box.h-2*pad)/(hi[1]-lo[1]||1));
  const offset=[box.x+(box.w-(hi[0]-lo[0])*s)/2,box.y+(box.h-(hi[1]-lo[1])*s)/2];
  const p=v=>v.map((n,i)=>offset[i]+(n-lo[i])*s);
  let out=`<g data-projection="${mode}"${explode?' data-exploded="true"':''}>`;
  if(scene.solidRevision)out+=rasterView(faces,v=>p(projection.point(v)),projection.toward,box);
  for(const f of scene.solidRevision?[]:shapes.sort((a,b)=>a.depth-b.depth)){
    const color=f.color||'#e6e9e8',factor=mode==='iso'?.72+.28*Math.max(0,dot(f.normal,[-.3,-.4,.86])):1;
    const fill='rgb('+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*factor)).join(',')+')';
    if(scene.solidRevision)out+=faceSvg(f,v=>p(projection.point(v)),fill,'#626668',.45);
    else out+=`<polygon data-part="${esc(f.name)}" points="${f.points2.map(v=>p(v).map(n=>n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" stroke="${f.surfaceDecoration?fill:'#7c878d'}" stroke-width="${f.surfaceDecoration?.08:.65}" stroke-linejoin="round"/>`;
  }
  if(box.dims){
    const [a,b]=offset,c=[offset[0]+(hi[0]-lo[0])*s,offset[1]+(hi[1]-lo[1])*s];
    out+=line([a,c[1]],[a,c[1]+10])+line(c,[c[0],c[1]+10])+line([a,c[1]+8],[c[0],c[1]+8]);
    out+=tx((a+c[0])/2,c[1]+23,`${box.dims[0]} мм`,'font-size="11" text-anchor="middle"');
    out+=line([a,b],[a-12,b])+line([a,c[1]],[a-12,c[1]])+line([a-9,b],[a-9,c[1]]);
    out+=tx(a-15,(b+c[1])/2,`${box.dims[1]} мм`,`font-size="11" text-anchor="middle" transform="rotate(-90 ${a-15} ${(b+c[1])/2})"`);
  }
  return out+'</g>';
}
export function catalogReferenceSheet(spec,tr=s=>s) {
  let scene=catalogGeometry(spec);const model=catalogModelById(spec.catalogModel);
  if(!scene)return tx(55,240,tr('Для видов по фото укажите ширину, высоту и глубину изделия.'));
  const {width:w,height:h,depth:d,thickness:t}=spec.dimensions;
  if(model.blueprint?.dimensionScope==='bench')scene={...scene,faces:scene.faces.filter(f=>!f.name.startsWith('kit_')),parts:scene.parts.filter(p=>!p.startsWith('kit_'))};
  const panels=[
    [55,190,420,230,'Вид спереди','front',[w,h]],
    [490,190,420,230,'Вид сбоку','side',[d,h]],
    [925,190,420,230,'Вид сзади','rear',[w,h]],
    [55,435,420,230,'Вид сверху','top',[w,d]],
    [490,435,420,230,'Разнесённый вид · схема','iso',null,true],
    [925,435,420,230,'Общий вид · 3D','iso'],
  ];
  let out='';
  for(const [x,y,b,a,title,mode,dims,explode] of panels)out+=tx(x+8,y+17,tr(title),'font-size="15" font-weight="700"')+`<rect x="${x}" y="${y+25}" width="${b}" height="${a-25}" fill="white" stroke="#c9d1d5" stroke-width=".6"/>`+projectCatalogView(scene,{x:x+4,y:y+28,w:b-8,h:a-32,dims},mode,explode);
  out+=tx(63,695,tr('ПАРАМЕТРЫ ЗАКАЗА'),'font-size="15" font-weight="700"');
  for(const [i,row] of [['Ширина W',w],['Высота H',h],['Глубина D',d],['Толщина металла',t]].entries()) {
    const y=718+i*27;out+=tx(63,y,tr(row[0]),'font-size="13"')+tx(350,y,(row[1]??'?')+' мм','font-size="13" font-weight="600"')+line([60,y+8],[460,y+8]);
  }
  out+=tx(500,695,tr('ОСНОВА ФОРМЫ'),'font-size="15" font-weight="700"');
  out+=tx(500,720,model.blueprint?`Шаблон заказчика · изображение ${model.blueprint.attachment}`:`Каталог 29.08.26.pdf · стр. ${model.page}`,'font-size="13"');
  const description=[''];for(const word of model.name.split(' ')) {
    if((description.at(-1)+' '+word).length>43)description.push(word);
    else description[description.length-1]+=(description.at(-1)?' ':'')+word;
  }
  description.forEach((s,i)=>out+=tx(500,746+i*20,s,'font-size="13"'));
  out+=tx(500,794,tr(model.blueprint?'Сечения и толщины — из шаблона.':'Материалы и покрытие — по заявке.'),'font-size="12"');
  out+=tx(500,816,tr(model.blueprint?'Спецификация пересчёта — на следующем листе.':'Крепёж и скрытые узлы не восстановлены по фото.'),'font-size="12"');
  out+=tx(935,695,tr('СОСТАВ МОДЕЛИ'),'font-size="15" font-weight="700"');
  const names={wood:'Деревянные элементы',side:'Боковины и опоры',back:'Спинка / декор',front:'Передняя панель',seat:'Опоры сиденья',vessel:'Ёмкость',inclined:'Наклонные опоры',canopy:'Козырёк и стойки',rear:'Задняя часть',hood:'Стойки козырька',base:'Основание',body:'Корпус',opening:'Рамка проёма',cage:'Наружный каркас',kit:'Урна и светильник комплекта',light:'Стойка и плафон',firebox:'Жаровня',grill:'Опоры мангала',bowl:'Чаша',pedestal:'Пьедестал',swing:'Рама качелей',hanger:'Подвесы',roof:'Навес / крыша',gazebo:'Стойки каркаса',basket:'Корзина',arched:'Округлый верх',upper:'Верхняя панель',leg:'Опоры',armrest:'Подлокотники',top:'Верхняя балка'};
  const groups=[...new Set(scene.parts.map(s=>s.split('_')[0]))].filter(s=>!s.includes('pattern')).slice(0,6);
  groups.forEach((s,i)=>out+=tx(935,720+i*20,`${i+1}. ${names[s]||'Элемент конструкции'}`,'font-size="12"'));
  out+=tx(63,875,tr(model.blueprint?.dimensionScope==='bench'?'W/H/D — скамейка. Урна 500×700×500; столбик 120×1000×120, основание 200.':model.blueprint?'Габариты — из заказа; сечения — из шаблона. Контуры опор и вырезов предварительные.':'Внешние габариты — из заказа. Внутренние пропорции и декоративные линии — оценка по фото.'),'font-size="13" fill="#97653b"');
  out+=tx(63,898,tr('Все проекции и 3D используют одну модель. Контуры резки, отверстия, швы и нагрузки требуют проверки.'),'font-size="12" fill="#667783"');
  return out;
}
export function catalogOrnamentSheet(spec,tr=s=>s) {
  const x=85,y=305,width=1230,height=185;
  const path=ethnoPhotoLoops.map(loop=>'M'+loop.map(([u,v])=>`${(x+u*width).toFixed(2)} ${(y+v*height).toFixed(2)}`).join(' L')+' Z').join(' ');
  const scene=catalogGeometry(spec),panel=scene?.faces.filter(f=>f.name==='upper_decor_panel').flatMap(f=>f.points)||[];
  const panelW=panel.length?Math.max(...panel.map(p=>p[0]))-Math.min(...panel.map(p=>p[0])):null;
  const panelH=panel.length?Math.max(...panel.map(p=>p[2]))-Math.min(...panel.map(p=>p[2])):null;
  return tx(85,215,tr('Верхняя панель спинки · увеличенный орнамент'),'font-size="20" font-weight="700"')+
    tx(85,247,tr('Композиция по фото: два боковых мотива с завитками и три центральных треугольника.'),'font-size="15"')+
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#edece8" stroke="#7c878d"/><path data-ornament="photo-p1-v2" d="${path}" fill="#59a9b6" fill-rule="evenodd"/>`+
    tx(85,540,tr('Основа: Каталог 29.08.26.pdf · страница 1.'),'font-size="16"')+
    tx(85,575,tr('Видимый рисунок переведён в вектор с исправлением перспективы фотографии.'),'font-size="15"')+
    tx(85,610,tr('Размытый дальний мотив восстановлен по повторяющемуся ближнему элементу.'),'font-size="15"')+
    tx(85,655,`${tr('Размер панели по модели')}: ${panelW?.toFixed(1)??'?'} × ${panelH?.toFixed(1)??'?'} ${tr('мм — предварительно')}`,'font-size="15"')+
    tx(85,715,tr('Этот же рисунок используется на сборочном листе и в 3D-модели.'),'font-size="16" font-weight="600"')+
    tx(85,770,tr('Рисунок показан нанесением на поверхность. Способ изготовления по фото не установлен.'),'font-size="15"')+
    tx(85,805,tr('Для лазерной резки специалист должен проверить и подготовить замкнутый контур DXF.'),'font-size="15" fill="#97653b"');
}
