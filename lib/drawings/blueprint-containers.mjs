import {rect,curvedPath} from './solid-builder.mjs';
import {circle} from './solid.mjs';

// Sheet parts are closed solids: a traced aperture is removed from both faces
// and its perimeter has a wall. Stock thickness never scales with W/H/D.
export function frustum(k,x,y,z,topW,topD,bottomW,bottomD,h,t,name,metal){
 k.box(x-bottomW/2,y-bottomD/2,z,bottomW,bottomD,t,name+'_bottom',metal);
 const ring=(w,d,zz)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>[x+a,y+b,zz]);
 const a=ring(bottomW,bottomD,z),b=ring(topW,topD,z+h),c=ring(bottomW-2*t,bottomD-2*t,z+t),d=ring(topW-2*t,topD-2*t,z+h);
 for(let i=0;i<4;i++){const j=(i+1)%4;
  k.surface([a[i],a[j],b[j],b[i]],name+'_outer',metal);
  k.surface([c[j],c[i],d[i],d[j]],name+'_inner',metal);
  k.surface([b[i],b[j],d[j],d[i]],name+'_rim',metal);
 }
}
function leafPanel(k,page,key,axis,position,outer,t,name,metal,transform){
 const holes=k.cuts(page,key,transform,outer,.7);
 k[axis](position,outer,t,name,holes,metal,true);
}
export function buildLight(k,{x=0,y=0,w,d,h,t=2,base=w,prefix='light',page=18},metal){
 const bottom=30,cap=30,decor=Math.min(700,h-110),start=h-cap-decor;
 k.zPlate(0,rect(x-base/2,y-base/2,base,base),bottom,prefix+'_base',[],metal);
 for(const [i,xx] of [x-w/2,x+w/2-t].entries()){
  const outer=rect(y-d/2,bottom,d,h-bottom-cap);
  leafPanel(k,page,page===7?'light':'front','xPlate',xx,outer,t,prefix+'_side_'+i,metal,([u,v])=>[y-d/2+8+u*(d-16),start+(1-v)*decor]);
 }
 for(const [i,yy] of [y-d/2,y+d/2-t].entries()){
  const outer=rect(x-w/2+t,bottom,w-2*t,h-bottom-cap);
  leafPanel(k,page,page===7?'light':'front','yPlate',yy,outer,t,prefix+'_face_'+i,metal,([u,v])=>[x-w/2+8+u*(w-16),start+(1-v)*decor]);
 }
 k.box(x-w/2,y-d/2,h-cap,w,d,cap,prefix+'_cap',metal);
 k.box(x-w/2+5,y-d/2+5,start,w-10,d-10,decor,prefix+'_diffuser','#ead7af');
 k.item('Стойка светильника',1,`${w} × ${h} × ${d}`,'Сталь','Толщина и электрическая часть требуют сверки');
}
export function buildBlueprintContainers(k,spec,model,metal){
 const {width:w,height:h,depth:d}=spec.dimensions,b=model.blueprint,f=b.fixed,p=model.page,t=spec.dimensions.thickness??b.base.thickness??2;
 const x=-w/2,y=-d/2;
 if(p===10){
  const a=f.postSize,bw=w-f.vesselInsetW,bd=d-f.vesselInsetD,bh=h-f.vesselBottom-f.vesselTopInset,z=f.vesselBottom;
  k.zPlate(0,rect(x,y,w,d),10,'base_plate',[circle(x+25,y+25,6),circle(-x-25,y+25,6),circle(-x-25,-y-25,6),circle(x+25,-y-25,6)],metal,true);
  for(const [i,xx]of [x+a/2,-x-a/2].entries())k.tube([xx,0,10],[xx,0,h-30],a,a,2,'side_post_'+i);
  const outer=rect(-bw/2,z,bw,bh),holes=k.cuts(p,'front',([u,v])=>[-bw/2+20+u*(bw-40),z+25+(1-v)*(bh-50)],outer,2);
  k.yPlate(-bd/2,outer,t,'vessel_front',holes,metal,true);
  k.box(-bw/2,bd/2-t,z,bw,t,bh,'vessel_rear');
  for(const xx of [-bw/2,bw/2-t])k.box(xx,-bd/2+t,z,t,bd-2*t,bh,'vessel_side_'+xx);
  k.box(-bw/2,-bd/2,z,bw,bd,t,'vessel_bottom');
  for(const xx of [-bw/2+t,bw/2-15])k.box(xx,-bd/2+t,z+bh-15,15-t,bd-2*t,t,'vessel_fold_'+xx);
  const ah=f.ashHeight,az=h-ah,ao=rect(-bw/2,az,bw,ah);
  leafPanel(k,p,'ash','yPlate',-bd/2,ao,t,'upper_ash_front',metal,([u,v])=>[-bw/2+12+u*(bw-24),az+8+(1-v)*(ah-16)]);
  k.box(-bw/2,bd/2-t,az,bw,t,ah,'upper_ash_back');
  for(const xx of [-bw/2,bw/2-t])k.box(xx,-bd/2,az,t,bd,ah,'upper_ash_side_'+xx);
  const perforations=[];for(let xx=-bw/2+22;xx<bw/2-15;xx+=18)for(let yy=-bd/2+22;yy<bd/2-15;yy+=18)perforations.push(circle(xx,yy,3.5,10));
  k.zPlate(h-22,rect(-bw/2+t,-bd/2+t,bw-2*t,bd-2*t),t,'upper_ash_perforated',perforations,metal,true);
  k.box(-bw/2,-bd/2,az,bw,bd,t,'upper_ash_bottom');
  for(const xx of [x+a/2,-x-a/2])for(const zz of [h-55,h-95,z+bh-25])k.bolt([xx,-a/2,zz],[0,-1,0],'fastener_'+xx+'_'+zz,10);
  k.item('Съёмная ёмкость',1,`${bw} × ${bd} × ${bh} × ${t}`);k.item('Пепельница',1,`${bw} × ${bd} × ${ah} × ${t}`);k.item('Стойка',2,`${h-40} × 50 × 50 × 2`,'Профильная труба');k.item('Основание',1,`${w} × ${d} × 10`,'Сталь','4 отверстия Ø12');
 }else if(p===11||p===17){
  const a=40;
  for(const xx of [x+a/2,-x-a/2])for(const yy of [y+a/2,-y-a/2])k.tube([xx,yy,0],[xx,yy,h],a,a,2,'cage_post_'+xx+'_'+yy);
  for(const zz of [a/2,h-a/2]){
   for(const yy of [y+a/2,-y-a/2])k.tube([x+a,yy,zz],[-x-a,yy,zz],a,a,2,'cage_rail_x_'+yy+'_'+zz);
   for(const xx of [x+a/2,-x-a/2])k.tube([xx,y+a,zz],[xx,-y-a,zz],a,a,2,'cage_rail_y_'+xx+'_'+zz);
  }
  for(const [i,yy]of [y+10,-y-10-t].entries()){
   const outer=rect(x+a,40,w-2*a,h-80);
   if(p===11&&i===1)k.yPlate(yy,outer,2,'rear_panel',[],metal,true);
   else leafPanel(k,p,'front','yPlate',yy,outer,t,'front_cut_panel_'+i,metal,([u,v])=>[x+a+5+u*(w-2*a-10),45+(1-v)*(h-90)]);
  }
  for(const [i,xx]of [x+10,-x-10-t].entries()){
   const outer=rect(y+a,40,d-2*a,h-80);
   leafPanel(k,p,p===17?'side':'front','xPlate',xx,outer,t,'side_cut_panel_'+i,metal,([u,v])=>[y+a+5+u*(d-2*a-10),45+(1-v)*(h-90)]);
  }
  k.box(x+a,y+a,20,w-2*a,d-2*a,t,'base_floor');
  if(p===11){const vw=Math.min(f.vesselWidth,w-2*a-10),vd=Math.min(f.vesselDepth,d-2*a-10),vh=Math.min(f.vesselHeight,h-60);k.shell(-vw/2,-vd/2,30,vw,vd,vh,1.5,'vessel','#44484a');k.item('Внутренний бак',1,`${vw} × ${vd} × ${vh} × 1.5`,'Сталь','Просвет каркаса ограничивает размер; исходные 360 мм требуют сверки');}
  k.item('Ажурная панель',p===11?3:4,`${h-80} × по стороне × ${t}`,'Сталь','Сквозной узор по листу');k.item('Каркас',1,'40 × 40 × 2','Профильная труба');
 }else if(p===15){
  const a=f.postA,c=f.postB,bottom=35,hood=h-f.canopyHeight,slope=.13;
  for(const xx of [x+a/2,-x-a/2]){
   k.tube([xx,y+20,10],[xx,-y-20,10],a,c,2,'base_side_'+xx);
   k.tube([xx,y+30,30],[xx,-y-65,hood-35],a,c,2,'inclined_post_'+xx);
  }
  for(const yy of [y+20,-y-20])k.tube([x+a/2,yy,10],[-x-a/2,yy,10],a,c,2,'base_cross_'+yy);
  const outer=rect(x,y,w,d),map=([xx,yy],s)=>[xx,yy,h-30-(yy-y)*slope+s];
  k.extrude(outer,[],map,t,'canopy_sheet',metal,true);
  k.box(x,y,h-30,w,t,30,'canopy_front_rim');
  for(const xx of [x,-x-t])k.xPlate(xx,[[y,h-30],[y,h],[-y,h-d*slope],[-y,h-30-d*slope]],t,'canopy_side_'+xx);
  const vw=Math.min(w-80,f.vesselWidth+w-b.base.width),vd=Math.min(d-80,f.vesselDepth+d-b.base.depth),vh=h-b.base.height+f.vesselHeight;
  frustum(k,0,0,bottom,vw,vd,Math.max(100,vw-100),Math.max(100,vd-100),vh,2,'vessel',metal);
  k.item('Съёмный конический бак',1,`${vw} × ${vd} × ${vh} × 2`);k.item('Козырёк',1,`${w} × ${d} × ${t}`);k.item('Каркас',1,'40 × 20 × 2','Профильная труба');
 }else if(p===13){
  const foot=30,r=Math.min(f.radius,d*.48),open=f.openingHeight,z=foot;
  // Front at -Y; the top rolls into the rear wall with a quarter-circle.
  const outer=curvedPath([[y,z],[y,h],[-y-r,h],[-y-r+r*.5523,h,-y,h-r+r*.5523,-y,h-r],[-y,z]]);
  for(const xx of [x,-x-t])k.xPlate(xx,outer,t,'body_side_'+xx,[],metal,true);
  k.box(x+t,-y-t,z,w-2*t,t,h-r-z,'body_rear');
  k.box(x+t,y,h-t,w-2*t,d-r,t,'hood_flat');
  const arc=[];for(let i=0;i<=24;i++){const a=i*Math.PI/48;arc.push([-y-r+r*Math.sin(a),h-r+r*Math.cos(a)]);}const inner=[...arc].reverse().map(([yy,zz])=>{const a=Math.atan2(yy-(-y-r),zz-(h-r));return [yy-t*Math.sin(a),zz-t*Math.cos(a)];});
  k.xPlate(x+t,[...arc,...inner],w-2*t,'arched_hood',[],metal);
  k.box(x+t,y,z,w-2*t,d-2*t,t,'base_floor');
  const count=Math.max(1,Math.floor((w-2*t)/f.woodWidth)),gap=(w-2*t-count*f.woodWidth)/(count+1);
  for(let i=0;i<count;i++)k.box(x+t+gap+i*(f.woodWidth+gap),y,z,f.woodWidth,20,h-open-z,'wood_lamella_'+i,'#9b713e');
  for(const xx of [x+12,-x-28])for(const yy of [y+12,-y-28])k.box(xx,yy,0,16,16,foot,'leg_'+xx+'_'+yy);
  const vw=Math.min(w-35,f.vesselWidth),vd=Math.min(d-50,f.vesselDepth),vh=Math.min(h-open-50,f.vesselHeight);k.shell(-vw/2,-vd/2,foot+8,vw,vd,vh,.8,'vessel','#9da3a4');
  k.item('Корпус, радиусный кожух',1,`${w} × ${h} × ${d} × ${t}`,'Сталь',`Радиус ${r} мм`);k.item('Ламели',count,`${h-open-z} × 60 × 20`,'ДПК');k.item('Внутренний бак',1,`${vw} × ${vd} × ${vh} × 0.8`,'Оцинкованная сталь');
 }else if(p===14){
  const foot=f.footHeight,body=h-foot;
  for(const [i,xx]of [x,-x-t].entries()){
   const outer=rect(y,0,d,h),holes=k.cuts(p,'side',([u,v])=>[-30+u*60,h-130+(1-v)*75],outer,1);
   k.xPlate(xx,outer,t,'body_side_'+i,holes,metal,true);
  }
  k.box(x+t,-y-t,foot,w-2*t,t,body,'rear_panel');k.box(x+t,y,foot,w-2*t,d-2*t,t,'base_floor');
  k.zPlate(h-t,rect(x,y,w,d),t,'top_rim',[rect(x+24,y+24,w-48,d-48)],metal,true);
  const count=Math.max(1,Math.floor((w-2*t+10)/40)),gap=(w-2*t-count*30)/(count+1);
  for(let i=0;i<count;i++)k.box(x+t+gap+i*(30+gap),y,foot,30,10,body-15,'wood_lamella_'+i,'#a57940');
  const vw=Math.min(w-45,f.vesselWidth),vd=Math.min(d-45,f.vesselDepth),vh=Math.min(h-foot-45,f.vesselHeight);k.shell(-vw/2,-vd/2,foot+10,vw,vd,vh,.8,'vessel','#a4aaac');
  k.item('Корпус',1,`${w} × ${h} × ${d} × ${t}`);k.item('Ламели',count,`${body-15} × 30 × 10`,'ДПК','Зазор подгоняется в рамке');k.item('Внутренний бак',1,`${vw} × ${vd} × ${vh} × 0.8`,'Оцинкованная сталь');
 }else if(p===18)buildLight(k,{w,d,h,t},metal);
}

export function buildKitAccessories(k,spec,metal){
 const x=spec.dimensions.width/2+370,t=2,w=500,d=500,h=700;
 for(const xx of [x-w/2+25,x+w/2-25])k.tube([xx,-180,10],[xx,120,h-25],40,40,2,'kit_bin_post_'+xx);
 k.box(x-w/2,-d/2,h-20,w,d,20,'kit_bin_canopy');
 k.box(x-200,-200,0,400,400,8,'kit_bin_base');
 const outer=[[x-140,25],[x+140,25],[x+200,535],[x-200,535]];
 for(const [i,yy]of [-180,178].entries())leafPanel(k,7,'bin','yPlate',yy,outer,t,'kit_bin_decor_'+i,metal,([u,v])=>[x-125+u*250,70+(1-v)*405]);
 frustum(k,x,0,30,370,350,270,270,500,1.5,'kit_bin_vessel','#727a7d');
 buildLight(k,{x:-spec.dimensions.width/2-230,y:80,w:120,d:120,h:1000,t:2,base:200,prefix:'kit_light',page:7},metal);
 k.item('Урна комплекта',1,'500 × 700 × 500','Сталь','Толщины и внутренние пропорции условные; габариты сохранены');
}
