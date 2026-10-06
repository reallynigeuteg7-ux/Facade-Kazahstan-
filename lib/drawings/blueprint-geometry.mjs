// Millimetre geometry: external dimensions vary; stock sections never scale.
// Source sheets remain available because silhouettes and cut details are drafts.
import { blueprintMarks } from './blueprint-marks.mjs';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(n=>n/l);};
export function blueprintGeometry(spec,model){
 const b=model.blueprint,f=b.fixed,{width:w,height:h,depth:d}=spec.dimensions;
 const t=spec.dimensions.thickness??b.base.thickness??2;
 const metal=/9016|7035|Белый/.test(f.paint)?'#e4e5e2':b.shape==='basket'?'#b29a57':'#303438';
 const faces=[],parts=[],wires=[],guides=[],bom=[];
 const addBom=(name,count,size,material='Сталь',note='')=>bom.push({name,count,size,material,note});
 function face(points,name,color=metal,extra={}){
  const normal=[0,0,0];for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length];normal[0]+=(a[1]-c[1])*(a[2]+c[2]);normal[1]+=(a[2]-c[2])*(a[0]+c[0]);normal[2]+=(a[0]-c[0])*(a[1]+c[1]);}
  if(Math.hypot(...normal)<1e-8)return;
  faces.push({points,name,color,normal:unit(normal),edges:points.map(()=>true),...extra});if(!parts.includes(name))parts.push(name);
 }
 function prism(profile,axis,lo,hi,name,color=metal){
  if(hi<=lo)return;
  const area=profile.reduce((s,a,i)=>{const c=profile[(i+1)%profile.length];return s+a[0]*c[1]-c[0]*a[1];},0),p=area<0?[...profile].reverse():profile;
  const pt=(v,a)=>axis==='x'?[v,...a]:axis==='y'?[a[1],v,a[0]]:[...a,v];
  const a=p.map(v=>pt(lo,v)),c=p.map(v=>pt(hi,v));face([...a].reverse(),name,color);face(c,name,color);
  for(let i=0;i<a.length;i++){const j=(i+1)%a.length;face([a[i],a[j],c[j],c[i]],name,color);}
 }
 function box(x,y,z,ww,dd,hh,name,color=metal){if(ww>0&&dd>0&&hh>0)prism([[x,y],[x+ww,y],[x+ww,y+dd],[x,y+dd]],'z',z,z+hh,name,color);}
 function bar(p,q,a,c,name,color=metal){
  const v=q.map((n,i)=>n-p[i]);if(Math.hypot(...v)<1e-5)return;
  const u=unit(v),e=unit(cross(u,Math.abs(u[2])>.9?[0,1,0]:[0,0,1])),g=cross(u,e);
  const ring=center=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([s,r])=>center.map((n,i)=>n+s*e[i]*a/2+r*g[i]*c/2));
  const aa=ring(p),cc=ring(q);face([...aa].reverse(),name,color);face(cc,name,color);
  for(let i=0;i<4;i++)face([aa[i],aa[(i+1)%4],cc[(i+1)%4],cc[i]],name,color);
 }
 function shell(x,y,z,ww,dd,hh,tt,name,color=metal){
  box(x,y,z,ww,dd,tt,name+'_bottom',color);box(x,y,z,tt,dd,hh,name+'_left',color);box(x+ww-tt,y,z,tt,dd,hh,name+'_right',color);
  box(x+tt,y,z,ww-2*tt,tt,hh,name+'_front',color);box(x+tt,y+dd-tt,z,ww-2*tt,tt,hh,name+'_rear',color);
 }
 function slats(length,span,width,thickness,z,x,y,prefix){
  const count=Math.max(1,Math.floor((span+8)/(width+8))),gap=count>1?(span-count*width)/(count-1):0;
  for(let i=0;i<count;i++)box(x,y+i*(width+gap),z,length,width,thickness,prefix+'_'+(i+1),'#ae7946');
  return count;
 }
 function mark(page,key,map,host,color,flip=true){
  const m=blueprintMarks[page]?.[key];if(!m)return;
  for(const cell of m.cells){const points=cell.map(map);face(flip?[...points].reverse():points,host+'_pattern',color,{surfaceDecoration:true,decorationHost:host,edges:cell.map(()=>false)});}
 }
 function bench(x=0,y=0,prefix=''){
  const fs=f.seatHeight,wt=f.woodThickness,ww=f.woodWidth;
  const backless=b.shape==='bench-backless',seatZ=backless?h:fs;
  // Front edge remains fixed. A depth change extends the seating area.
  const angle=(f.angle||10)*Math.PI/180,tan=Math.tan(angle);
  const sd=Math.min(d-(backless?0:2*wt+(h-seatZ)*tan),Math.max(ww,d-(b.base.depth-f.seatDepth)));
  const rear=y-d/2+sd;
  const backY=z=>rear+(z-seatZ)*tan;
  const topY=backY(h);
  const x0=x-w/2,x1=x+w/2,sideT=t;
  for(const xx of [x0,x1-sideT])for(const yy of [y-d/2,y+d/2-80])box(xx,yy,0,sideT,80,sideT,prefix+'leg_foot_'+xx+'_'+yy);
  let profile=b.shape==='bench-angled'?
   [[topY,h],[topY-80,h],[rear-80,seatZ-80],[y-d/2+80,seatZ-80],[y-d/2+180,80],[y+d/2,80],[y+d/2,0],[y-d/2+100,0],[y-d/2,seatZ],[rear,seatZ]]:
   [[y-d/2,0],[y-d/2,seatZ-30],[rear,seatZ-30],[topY-75,h],[topY,h],[rear+60,seatZ-50],[y+d/2,0],[y+d/2-80,0],[y+d/2-145,seatZ*.4],[y-d/2+80,seatZ*.4],[y-d/2+80,0]];
  if(['bench-curved','bench-triangle','bench-ethno','kit'].includes(b.shape))profile=[[y-d/2,seatZ],[y-d/2+110,0],[y+d/2,0],[rear+40,seatZ-35],[topY,h],[topY-70,h],[rear-65,seatZ+80],[rear-100,seatZ+45]];
  if(b.shape==='bench-ornate')profile=[[y-d/2,0],[y-d/2+80,0],[y-d/2+155,seatZ*.35],[rear-100,seatZ*.35],[y+d/2-80,0],[y+d/2,0],[rear+80,seatZ],[topY,h],[topY-65,h],[rear-50,seatZ+120],[y-d/2+70,seatZ+170],[y-d/2,seatZ+110],[y-d/2+40,seatZ+80],[y-d/2+120,seatZ+130],[rear-80,seatZ+100],[rear-40,seatZ-40],[y-d/2+80,seatZ-40]];
  if(b.shape==='bench-tube'){
   for(const [side,xx]of [[0,x0+f.tubeA/2],[1,x1-f.tubeA/2]]){
    for(const yy of [y-d/2+f.tubeB/2,y+d/2-f.tubeB/2])box(xx-f.tubeA/2,yy-f.tubeB/2,0,f.tubeA,f.tubeB,seatZ+160,prefix+'side_leg_'+side+'_'+yy);
    box(xx-f.tubeA/2,y-d/2,seatZ+160-f.tubeA,f.tubeA,d,f.tubeA,prefix+'armrest_'+side);
    bar([xx,rear,seatZ],[xx,topY-f.tubeA/2,h-f.tubeA/2],f.tubeA,f.tubeB,prefix+'back_post_'+side);
   }
  }else if(backless||b.shape==='bench-tree'){
   for(const [side,xx]of [[0,x0],[1,x1-sideT]]){
    box(xx,y-d/2,0,sideT,d,seatZ,prefix+'side_panel_'+side);
    mark(model.page,'side',([u,v])=>[xx+(side?sideT+.1:-.1),y-d/2+u*d,seatZ*(1-v)],prefix+'side_panel_'+side,'#ebede9',!!side);
    if(!backless)prism([[rear-65,seatZ],[rear,seatZ],[topY,h],[topY-65,h]],'x',xx,xx+sideT,prefix+'back_post_'+side);
   }
  }else{
   for(const [side,xx]of [[0,x0],[1,x1-sideT]]){
    prism(profile,'x',xx,xx+sideT,prefix+'side_panel_'+side);
    mark(model.page,'side',([u,v])=>[xx+(side?sideT+.1:-.1),y-d/2+u*d,h*(1-v)],prefix+'side_panel_'+side,metal==='#303438'?'#edefea':'#6f7778',!!side);
   }
  }
  const length=w-2*sideT;
  const count=slats(length,sd,ww,wt,seatZ-wt,x0+sideT,y-d/2,prefix+'wood_seat');
  addBom('Планка сиденья',count,`${length} × ${ww} × ${wt}`,'Дерево','Количество по свободной глубине; сверить с образцом');
  for(const xx of [x0+sideT+f.tubeA/2,x,x1-sideT-f.tubeA/2])box(xx-f.tubeA/2,y-d/2,seatZ-wt-f.tubeB,f.tubeA,sd,f.tubeB,prefix+'seat_support_'+xx);
  addBom('Поперечина под сиденьем',3,`${sd} × ${f.tubeA} × ${f.tubeB} × ${f.tubeWall}`,'Профильная труба');
  if(!backless){
   const panel=f.panelHeight||0,backStart=seatZ-wt,available=h-backStart-panel;
   const n=Math.max(1,Math.floor(available/ww)),gap=n>1?(available-n*ww)/(n-1):0;
   for(let i=0;i<n;i++){
    const z=backStart+i*(ww+gap),yy=backY(z)+wt;
    prism([[yy,z],[yy+wt,z],[yy+wt+ww*tan,z+ww],[yy+ww*tan,z+ww]],'x',x0+sideT,x1-sideT,prefix+'wood_back_'+(i+1),'#ae7946');
   }
   addBom('Планка спинки',n,`${length} × ${ww} × ${wt}`,'Дерево','Угол и количество по компоновке шаблона');
   if(panel){
    const z=h-panel,yy=backY(z),host=prefix+'upper_decor_panel';
    prism([[yy,z],[yy+sideT,z],[yy+sideT+panel*tan,h],[yy+panel*tan,h]],'x',x0+sideT,x1-sideT,host);
    mark(model.page,'back',([u,v])=>{const zz=h-v*panel,baseLength=b.base.width-2*sideT;const px=length>=baseLength?(u<.28?-length/2+u*baseLength:u>.72?length/2+(u-1)*baseLength:(u-.5)*baseLength):(u-.5)*length;return[x+px,backY(zz)-.2,zz];},host,'#596368');
   }
   box(x0+sideT,backY(seatZ+100),seatZ+100,length,f.tubeB,f.tubeA,prefix+'back_crossbar');
   addBom('Перемычка спинки',1,`${length} × ${f.tubeA} × ${f.tubeB} × ${f.tubeWall}`,'Профильная труба');
  }
  addBom('Боковые опоры',2,`${h} × ${d} × ${spec.dimensions.thickness??b.base.thickness??'?'}`,'Сталь','Контур и отверстия проверяются по оригиналу');
  if(b.shape==='bench-ethno'){
   const ah=seatZ-50,host='front_decor_panel';
   prism([[x0+sideT,25],[x0+sideT,ah],[x1-sideT,ah],[x1-sideT,25],[x1-160,25],[x1-260,ah-110],[x0+260,ah-110],[x0+160,25]].map(([x,z])=>[z,x]),'y',y-d/2+wt,y-d/2+wt+t,host);
   mark(model.page,'apron',([u,v])=>[x0+sideT+u*length,y-d/2+wt-.2,ah-v*(ah-25)],host,'#777e7e');
  }
  if(f.fastener)addBom('Крепление планок','уточнить',f.fastener,'Крепёж','Количество по отверстиям, не по картинке');
 }
 const vessel=(ww,dd,hh,zz,tt,name='vessel',x=0,y=0)=>shell(x-ww/2,y-dd/2,zz,ww,dd,hh,tt,name,'#585e62');
 if(b.shape.startsWith('bench')||b.shape==='kit'){
  bench();
  if(b.shape==='kit'){
   const x=w/2+350,bw=f.binWidth,bh=f.binHeight,bd=f.binDepth;
   box(x-bw/2,-bd/2,0,bw,bd,20,'kit_bin_base');
   box(x-bw/2,-bd/2,bh-25,bw,bd,25,'kit_bin_canopy');
   vessel(330,330,500,20,2,'kit_bin_vessel',x,0);
   for(const xx of [x-bw/2,x+bw/2-40])box(xx,-bd/2,20,40,40,bh-45,'kit_bin_post_'+xx);
   const lx=-w/2-300,cw=f.columnWidth,base=f.columnBase;
   box(lx-base/2,-base/2,0,base,base,25,'kit_light_base');
   shell(lx-cw/2,-cw/2,25,cw,cw,f.columnHeight-50,2,'kit_light_body');
   box(lx-base/2,-base/2,f.columnHeight-25,base,base,25,'kit_light_cap');
   addBom('Урна комплекта',1,`${bw} × ${bh} × ${bd}`,'Сталь','Габариты исходные; внутренние узлы предварительные');
   addBom('Столбик комплекта',1,`${cw} × ${f.columnHeight} × ${cw}`,'Сталь','Основание 200; толщина и контуры не заданы');
  }
 }else if(b.shape==='ash-bin'){
  box(-w/2,-d/2,0,w,d,f.baseThickness,'base');
  const bw=w-f.vesselInsetW,bd=d-f.vesselInsetD,bh=h-f.vesselTopInset-f.vesselBottom;
  vessel(bw,bd,bh,f.vesselBottom,t);
  for(const xx of [-w/2+20,w/2-20-f.postSize])box(xx,-f.postSize/2,f.baseThickness,f.postSize,f.postSize,h-f.baseThickness,'side_post_'+xx);
  shell(-bw/2,-bd/2,h-f.ashHeight,bw,bd,f.ashHeight,t,'ashtray');
  addBom('Съёмный бак',1,`${bw} × ${bd} × ${bh} × ${t}`);addBom('Пепельница',1,`${bw} × ${bd} × ${f.ashHeight} × ${t}`);
  addBom('Стойки',2,`${h-f.baseThickness} × 50 × 50 × 2`,'Профильная труба');addBom('Основание',1,`${w} × ${d} × 10`);
 }else if(b.shape==='angled-bin'){
  const a=f.postA,bb=f.postB,base=bb;
  for(const yy of [-d/2+bb/2,d/2-bb/2]){
   box(-w/2,yy-bb/2,0,w,bb,bb,'base_rail_'+yy);
   bar([-w/2+a/2,yy,base],[w/2-a/2,yy,h-f.canopyHeight],bb,a,'inclined_post_'+yy);
  }
  const bw=Math.min(w-60,f.vesselWidth+(w-b.base.width)),bd=Math.min(d-50,f.vesselDepth+(d-b.base.depth));
  const vh=Math.min(h-100,f.vesselHeight+(h-b.base.height)),bottom=35,lo=bw-f.vesselWidth+f.vesselBottomWidth;
  for(const sign of [-1,1])prism([[-lo/2,bottom],[lo/2,bottom],[bw/2,bottom+vh],[-bw/2,bottom+vh]].map(([x,z])=>[z,x]),'y',sign<0?-bd/2:bd/2-t,sign<0?-bd/2+t:bd/2,'vessel_'+sign);
  for(const sign of [-1,1])prism([[-bd/2,bottom],[-bd/2,bottom+vh],[bd/2,bottom+vh],[bd/2,bottom]],'x',sign<0?-lo/2:lo/2-t,sign<0?-lo/2+t:lo/2,'vessel_side_'+sign);
  box(-w/2,-d/2,h-f.canopyHeight,w,d,f.canopyHeight,'canopy');
  addBom('Козырёк',1,`${w} × ${d} × ${f.canopyHeight}`);addBom('Наклонные стойки',2,`${Math.hypot(w-a,h-f.canopyHeight-base).toFixed(1)} × 40 × 20 × 2`,'Профильная труба');
 }else if(b.shape==='arch-bin'||b.shape==='wood-bin'){
  const feet=f.footHeight,opening=b.shape==='arch-bin'?f.openingHeight:0,wallH=h-feet-opening;
  if(b.shape==='arch-bin')for(const xx of [-w/2,w/2-20])for(const yy of [-d/2,d/2-20])box(xx,yy,0,20,20,feet,'leg_foot_'+xx+'_'+yy);
  box(-w/2,d/2-t,feet,w,t,h-feet,'rear_panel');
  for(const xx of [-w/2,w/2-t]){
   if(b.shape==='arch-bin'){
    const radius=Math.min(f.radius,d/2),profile=[[-d/2,feet],[d/2,feet],[d/2,h-radius]];
    for(let i=0;i<=12;i++){const a=i*Math.PI/24;profile.push([d/2-radius+radius*Math.cos(a),h-radius+radius*Math.sin(a)]);}
    profile.push([-d/2,h]);prism(profile,'x',xx,xx+t,'arched_side_'+xx);
   }else box(xx,-d/2,0,t,d,h,'side_panel_'+xx);
  }
  box(-w/2,-d/2,h-t,w,d-(b.shape==='arch-bin'?f.radius:0),t,'top_panel');
  box(-w/2,-d/2,feet,w,d,t,'base_panel');
  const count=Math.max(1,Math.floor((w-2*t+(f.woodGap||8))/(f.woodWidth+(f.woodGap||8)))),gap=count>1?(w-2*t-count*f.woodWidth)/(count-1):0;
  for(let i=0;i<count;i++)box(-w/2+t+i*(f.woodWidth+gap),-d/2,feet,f.woodWidth,f.woodThickness,wallH,'wood_lamella_'+i,'#986c43');
  vessel(w-(b.base.width-f.vesselWidth),d-(b.base.depth-f.vesselDepth),Math.min(wallH,f.vesselHeight+h-b.base.height),feet+t,f.vesselThickness);
  addBom('Ламель передней панели',count,`${wallH} × ${f.woodWidth} × ${f.woodThickness}`,'ДПК / дерево');
  addBom('Корпус',1,`${w} × ${h} × ${d} × ${t}`);addBom('Толщина съёмного бака',1,String(f.vesselThickness));
 }else if(['cage-bin','basket','light'].includes(b.shape)){
  const post=f.postSize||40,base=b.shape==='light'?f.baseHeight:post;
  const size=b.shape==='light'?Math.min(20,w/5):post;
  for(const xx of [-w/2,w/2-size])for(const yy of [-d/2,d/2-size])box(xx,yy,0,size,size,h,'cage_post_'+xx+'_'+yy);
  for(const zz of [0,h-(f.capHeight||post)]){
   box(-w/2,-d/2,zz,w,size,f.capHeight||post,'cage_front_'+zz);box(-w/2,d/2-size,zz,w,size,f.capHeight||post,'cage_rear_'+zz);
   box(-w/2,-d/2,zz,size,d,f.capHeight||post,'cage_left_'+zz);box(w/2-size,-d/2,zz,size,d,f.capHeight||post,'cage_right_'+zz);
  }
  const host='front_decor_panel';box(-w/2+size,-d/2,base,w-2*size,t,h-2*base,host);
  const patternColor=b.shape==='cage-bin'?'#717778':metal==='#303438'?'#e1e4df':'#626963';
  mark(model.page,'front',([u,v])=>[-w/2+size+u*(w-2*size),-d/2-.1,base+(1-v)*(h-2*base)],host,patternColor);
  for(const xx of [-w/2,w/2-t]){
   const host='side_panel_'+xx;box(xx,-d/2+size,base,t,d-2*size,h-2*base,host);
   const key=blueprintMarks[model.page]?.side?'side':'front';
   mark(model.page,key,([u,v])=>[xx+(xx>0?t+.1:-.1),-d/2+size+u*(d-2*size),base+(1-v)*(h-2*base)],host,patternColor,xx>0);
  }
  box(-w/2+size,d/2-t,base,w-2*size,t,h-2*base,'rear_panel');
  if(b.shape!=='cage-bin')mark(model.page,'front',([u,v])=>[-w/2+size+u*(w-2*size),d/2+.1,base+(1-v)*(h-2*base)],'rear_panel',patternColor,false);
  if(b.shape==='cage-bin'){vessel(w-60,d-60,h-200,post,f.vesselThickness);addBom('Съёмный бак',1,`${w-60} × ${d-60} × ${h-200} × ${f.vesselThickness}`);}
  if(b.shape==='light'){box(-w/2,-d/2,h-f.capHeight,w,d,f.capHeight,'light_cap');box(-w/2,-d/2,0,w,d,base,'light_base');addBom('Светодиодный модуль',1,`${f.voltage} В · ${f.ip}`,'Электрика','Параметры из листа; схема и испытания не заданы');}
  addBom('Наружный каркас',1,`${w} × ${h} × ${d}`,'Сталь',b.shape==='light'?'Толщина профиля не указана':`${post} × ${post} × ${f.tubeWall}`);
  addBom('Панели',3,`${w-2*size} × ${h-2*base} × ${spec.dimensions.thickness??'?'}`,'Сталь','Точные вырезы по исходному изображению');
 }else if(b.shape==='grill'){
  const fireD=d-(b.base.depth-f.fireDepth),z=h-f.fireHeight;
  shell(-w/2,-fireD/2,z,w,fireD,f.fireHeight,t,'firebox');
  for(const xx of [-w/2,w/2-t])prism([[-d/2,0],[-d/2+f.footWidth,0],[-fireD/2+20,z],[-fireD/2,z],[-fireD/2,h],[fireD/2,h],[fireD/2,z],[fireD/2-20,z],[d/2-f.footWidth,0],[d/2,0],[fireD/2,z]],'x',xx,xx+t,'grill_side_'+xx);
  addBom('Жаровня',1,`${w} × ${fireD} × ${f.fireHeight} × ${t}`);addBom('Боковые опоры',2,`${h} × ${d} × ${t}`,'Сталь','Пазы и декоративные вырезы уточнить');
 }else if(b.shape==='swing'||b.shape==='pergola'){
  const a=f.tubeA,c=f.tubeB;
  if(b.shape==='swing'){
   for(const xx of [-w/2+a/2,w/2-a/2]){
    box(xx-a/2,-d/2,0,a,d,c,'swing_base_'+xx);
    for(const yy of [-d/2+c/2,d/2-c/2])bar([xx,yy,c],[xx,0,h-a],a,c,'swing_leg_'+xx+'_'+yy);
   }
   box(-w/2,-c/2,h-a,w,c,a,'swing_top');
   box(-w/2,-d/2,h-2,w,d,2,'roof');
   const sw=w-(b.base.width-f.seatWidth),sd=d-(b.base.depth-f.seatDepth),sh=f.seatHeight;
   const count=slats(sw,sd,f.woodWidth,f.woodThickness,sh-f.woodThickness,-sw/2,-sd/2,'wood_seat');
   for(let i=0;i<4;i++)box(-sw/2,sd/2-30,sh+10+i*115,sw,30,90,'wood_back_'+i,'#ae7946');
   for(const xx of [-sw/2,sw/2])for(const yy of [-sd/2,sd/2])bar([xx,yy,sh],[xx,yy*.4,h-a],5,5,'hanger_'+xx+'_'+yy);
   addBom('Главная балка',1,`${w} × ${a} × ${c} × ${f.tubeWall}`,'Профильная труба');addBom('Наклонные стойки',4,`${Math.hypot(d/2-c/2,h-a-c).toFixed(1)} × ${a} × ${c} × ${f.tubeWall}`,'Профильная труба');
   addBom('Сиденье',count,`${sw} × ${sd}`,'Дерево','Сечения досок предварительные');addBom('Покрытие навеса',1,`${w} × ${d}`,'Профнастил','Толщина не задана');
  }else{
   for(const xx of [-w/2+a/2,w/2-a/2]){
    box(xx-a/2,-d/2,0,a,d,c,'gazebo_base_'+xx);
    for(const yy of [-d/2+c/2,d/2-c/2])box(xx-a/2,yy-c/2,c,a,c,h-c-a,'gazebo_post_'+xx+'_'+yy);
    box(xx-a/2,-d/2,h-a,a,d,a,'roof_side_'+xx);
    const host='side_decor_'+xx;box(xx-a/2,-f.panelWidth/2,c,a,f.panelWidth,h-a-c,host);
    mark(model.page,'side',([u,v])=>[xx+(xx>0?a/2+.1:-a/2-.1),-f.panelWidth/2+u*f.panelWidth,c+(1-v)*(h-a-c)],host,'#d5d7d0',xx>0);
   }
   for(let i=0;i<5;i++)box(-w/2,-d/2+i*(d-c)/4,h-a,w,c,a,'roof_crossbar_'+i);
   // Hanging seats are shown as visual placeholders, not fabricated chairs.
   for(const xx of [-w/5,w/5]){
    bar([xx,0,h-a],[xx,0,800],5,5,'hanger_'+xx);
    box(xx-200,-200,650,400,400,30,'seat_placeholder_'+xx,'#ada998');
   }
   addBom('Верхние перемычки',5,`${w} × ${a} × ${c} × ${f.tubeWall}`,'Профильная труба');addBom('Стойки',4,`${h-a-c} × ${a} × ${c} × ${f.tubeWall}`,'Профильная труба');
   addBom('Боковые панели',2,`${f.panelWidth} × ${h-a-c}`,'Сталь','Толщина и вырезы не заданы');addBom('Подвесные кресла',2,'уточнить','По заказу','В 3D обозначено место установки');
  }
 }
 return {faces,parts,wires,guides,reference:model,bom,dimensionScope:b.dimensionScope,stock:{...f,panelThickness:spec.dimensions.thickness??b.base.thickness},draft:true};
}
