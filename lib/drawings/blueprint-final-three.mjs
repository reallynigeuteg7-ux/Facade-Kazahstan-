import {rect,sub,add,mul,unit,cross} from './solid-builder.mjs';
import {circle} from './solid.mjs';
import {frustum} from './blueprint-containers.mjs';

// References 22–24, received 1 October. Dimensions that conflict with stock
// clearances are fitted explicitly and reported in the template and BOM.
function capsule(x,y,width,height){
 const r=height/2,l=x+r,rr=x+width-r,cy=y+r;
 return [...Array.from({length:13},(_,i)=>{const a=-Math.PI/2+i*Math.PI/12;return [rr+r*Math.cos(a),cy+r*Math.sin(a)];}),
  ...Array.from({length:13},(_,i)=>{const a=Math.PI/2+i*Math.PI/12;return [l+r*Math.cos(a),cy+r*Math.sin(a)];})];
}
function frame(k,w,h,d,a,wall,metal){
 const x=-w/2,y=-d/2;
 for(const [i,xx] of [x+a/2,-x-a/2].entries())for(const [j,yy] of [y+a/2,-y-a/2].entries())
  k.tube([xx,yy,0],[xx,yy,h],a,a,wall,`cage_post_${i}_${j}`,metal);
 for(const [i,zz] of [a/2,h-a/2].entries()){
  for(const [j,yy] of [y+a/2,-y-a/2].entries())k.tube([x+a,yy,zz],[-x-a,yy,zz],a,a,wall,`cage_rail_x_${i}_${j}`,metal);
  for(const [j,xx] of [x+a/2,-x-a/2].entries())k.tube([xx,y+a,zz],[xx,-y-a,zz],a,a,wall,`cage_rail_y_${i}_${j}`,metal);
 }
 for(const [i,xx] of [x+a,-x-a-30].entries())for(const [j,yy] of [y+a,-y-a-30].entries())
  k.zPlate(4,rect(xx,yy,30,30),4,`mounting_plate_${i}_${j}`,[circle(xx+15,yy+15,5,16)],metal,true);
}
function buildBin(k,spec,model,metal){
 const {width:w,height:h,depth:d}=spec.dimensions,b=model.blueprint,f=b.fixed,p=model.page;
 const t=spec.dimensions.thickness??b.base.thickness??2,a=f.postSize,x=-w/2,y=-d/2;
 frame(k,w,h,d,a,f.tubeWall,metal);
 if(p===12)for(const xx of [x,-x-a])for(const yy of [y,-y-a])k.box(xx,yy,h-2,a,a,2,'post_cap_'+xx+'_'+yy,metal);
 const panelBottom=a,panelH=h-2*a;
 for(const [i,yy] of [y+5,-y-5-t].entries()){
  const outer=rect(x+a,panelBottom,w-2*a,panelH);
  const holes=p===12||i===0?k.cuts(p,'front',([u,v])=>[x+a+3+u*(w-2*a-6),panelBottom+3+(1-v)*(panelH-6)],outer,1):
   [rect(-w*.28,h-a-28,w*.56,2)];
  k.yPlate(yy,outer,t,i===0?'front_cut_panel':'rear_cut_panel',holes,metal,true);
 }
 const openingBottom=h-a-f.openingHeight;
 for(const [i,xx] of [x+5,-x-5-t].entries()){
  const outer=rect(y+a,panelBottom,d-2*a,p===16?openingBottom-panelBottom:panelH);
  const holes=p===12?k.cuts(p,'front',([u,v])=>[y+a+3+u*(d-2*a-6),panelBottom+3+(1-v)*(panelH-6)],outer,1):[];
  k.xPlate(xx,outer,t,'side_cut_panel_'+i,holes,metal,true);
 }
 if(p===16)k.zPlate(h-t,rect(x,y,w,d),t,'roof_sheet',[],metal,true);
 // The drawing's 330 mm vessel cannot pass between 40 mm posts in a 350 mm
 // body. Keep the stock, allow 5 mm clearance on each side, report actual fit.
 const vw=w-2*a-10,vd=d-2*a-10,vz=a+5;
 const vh=p===16?openingBottom-vz:Math.min(h*.62,h-a-10-vz);
 const bw=vw*(f.vesselBottomWidth/f.vesselWidth),bd=vd*(f.vesselBottomDepth/f.vesselDepth);
 frustum(k,0,0,vz,vw,vd,bw,bd,vh,f.vesselThickness,'removable_vessel','#202527');
 k.box(-bw/2,-bd/2,a,bw,bd,5,'vessel_support',metal);
 k.item('Каркас',1,`${w} × ${d} × ${h}`,'Профильная труба','Сечение 40 × 40 × 2 мм');
 k.item(p===12?'Панель с диагональным узором':'Панель «Дерево с птицами»',p===12?4:1,`по стороне × ${panelH} × ${t}`,'Сталь',b.base.thickness===null?'Толщина условная: уточнить':'Сквозной рисунок из исходника');
 if(p===16){k.item('Крыша',1,`${w} × ${d} × ${t}`);k.item('Боковой проём',2,`${d-2*a} × ${f.openingHeight}`,'—','Высота оценена по изображению');}
 k.item('Внутренний бак: верх',1,`${vw.toFixed(1)} × ${vd.toFixed(1)} × ${vh.toFixed(1)}`,'Сталь','Подогнан под просвет и проём; исходные 330 × 310 не помещаются');
 k.item('Внутренний бак: низ',1,`${bw.toFixed(1)} × ${bd.toFixed(1)} × ${f.vesselThickness}`,'Сталь','Толщина бака условная, уточнить');
 k.item('Монтажная пластина',4,'30 × 30 × 4, Ø10','Сталь','Размеры узла оценены по изображению');
}
function buildFireBowl(k,spec,model,metal){
 const {width:w,height:h,depth:d}=spec.dimensions,t=spec.dimensions.thickness??3;
 const baseH=h*.18,ratio=.46,baseW=w*.5,baseD=d*.5;
 const hex=(ww,dd)=>[[-ww/2,0],[-ww/4,-dd/2],[ww/4,-dd/2],[ww/2,0],[ww/4,dd/2],[-ww/4,dd/2]];
 const top=hex(w,d),bottom=hex(w*ratio,d*ratio);
 for(let i=0;i<6;i++){
  const j=(i+1)%6,a=top[i],b=top[j],aa=bottom[i],bb=bottom[j];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),bottomLength=length*ratio;
  const u=unit([b[0]-a[0],b[1]-a[1],0]),origin=[(aa[0]+bb[0])/2,(aa[1]+bb[1])/2,baseH];
  // Offset both skins by the real 3 mm normal thickness. The upper inner edge
  // defines H while the outer upper polygon defines W/D.
  let topZ=h,v,n,slant;
  for(let iteration=0;iteration<12;iteration++){
   const delta=sub([(a[0]+b[0])/2,(a[1]+b[1])/2,topZ],origin);slant=Math.hypot(...delta);v=unit(delta);n=unit(cross(u,v));topZ=h+t*n[2];
  }
  const outer=[[-bottomLength/2,0],[bottomLength/2,0],[length/2,slant],[-length/2,slant]];
  const flameW=Math.min(length*.50,slant*.68),flameH=slant*.51;
  const holes=k.cuts(20,'flame',([uu,vv])=>[(uu-.5)*flameW,slant*.22+(1-vv)*flameH],outer,3);
  const map=([xx,yy],s)=>add(origin,add(mul(u,xx),add(mul(v,yy),mul(n,s-t))));
  k.extrude(outer,holes,map,t,'firebox_decor_'+i,metal,true);
 }
 const floor=hex(w*ratio,d*ratio),vents=[];
 for(const yy of [-.12,0,.12])vents.push(capsule(-w*.12,d*yy-6,w*.24,12));
 k.zPlate(baseH,floor,t,'firebox_floor',vents,metal,true);
 k.zPlate(0,rect(-baseW/2,-baseD/2,baseW,baseD),t,'pedestal_floor',[],metal,true);
 for(const [i,yy] of [-baseD/2,baseD/2-t].entries()){
  const holes=[-.27,.17].map(uu=>capsule(baseW*uu,baseH*.37,baseW*.23,baseH*.26));
  k.yPlate(yy,rect(-baseW/2,0,baseW,baseH),t,'pedestal_front_'+i,holes,metal,true);
 }
 for(const [i,xx] of [-baseW/2,baseW/2-t].entries()){
  const holes=[-.27,.17].map(uu=>capsule(baseD*uu,baseH*.37,baseD*.23,baseH*.26));
  k.xPlate(xx,rect(-baseD/2+t,0,baseD-2*t,baseH),t,'pedestal_side_'+i,holes,metal,true);
 }
 k.item('Наклонная стенка с пламенем',6,`по развёртке × ${t}`,'Листовая сталь','Сквозной контур из образца');
 k.item('Дно чаши с вентиляцией',1,`${(w*ratio).toFixed(1)} × ${(d*ratio).toFixed(1)} × ${t}`,'Листовая сталь','Пропорции и вентиляция предварительные');
 k.item('Основание с прорезями',1,`${baseW.toFixed(1)} × ${baseD.toFixed(1)} × ${baseH.toFixed(1)} × ${t}`,'Листовая сталь','Размеры оценены по изображению');
}
export function buildFinalThree(k,spec,model,metal){
 if(model.page===20)buildFireBowl(k,spec,model,metal);else buildBin(k,spec,model,metal);
}
