import {rect} from './solid-builder.mjs';
import {circle} from './solid.mjs';

function chain(k,a,b,name){
 const n=Math.max(2,Math.ceil(Math.hypot(...a.map((v,i)=>v-b[i]))/30));
 for(let j=0;j<n;j++){
  const u=(j+.5)/n,p=a.map((v,i)=>v+(b[i]-v)*u),path=[];
  for(let i=0;i<16;i++){const th=i*2*Math.PI/16;path.push([p[0]+(j%2?0:9*Math.cos(th)),p[1]+(j%2?9*Math.cos(th):0),p[2]+20*Math.sin(th)]);}
  k.wireTube(path,2.1,name+'_'+j,'#777b7d',true,6);
 }
}
function basketChair(k,x,y,z,name){
 // Seat dimensions are visual estimates; the reference only dimensions frame.
 const r=260,path=[];for(let i=0;i<48;i++){const a=i*Math.PI/24;path.push([x+r*Math.cos(a),y+r*.8*Math.sin(a),z+65+Math.max(0,Math.sin(a))*230]);}
 k.wireTube(path,13,name+'_rim','#b9b1a0',true,8);
 const lower=[];for(let i=0;i<40;i++){const a=i*Math.PI/20;lower.push([x+220*Math.cos(a),y+170*Math.sin(a),z]);}k.wireTube(lower,8,name+'_seat_rim','#b9b1a0',true,8);
 for(let j=0;j<20;j++){
  const a=j*Math.PI/10,xx=220*Math.cos(a),yy=170*Math.sin(a),p=[];
  for(let i=0;i<=10;i++){const u=i/10,aa=a+u*.55;p.push([x+(220+40*u)*Math.cos(aa),y+(170+38*u)*Math.sin(aa),z+u*(65+Math.max(0,Math.sin(aa))*230)]);}k.wireTube(p,3.5,name+'_weave_'+j,'#c8c0ad',false,6);
  k.wireTube([[x+xx,y+yy,z],[x+xx*.99,y+yy*.99,z-80]],3,name+'_fringe_'+j,'#bfb5a0');
 }
 for(let j=-4;j<=4;j++){
  const yy=j*33,half=220*Math.sqrt(1-(yy/170)**2);k.wireTube([[x-half,y+yy,z+4],[x,y+yy,z-8],[x+half,y+yy,z+4]],3,name+'_seat_weave_'+j,'#c8c0ad');
 }
 for(let j=1;j<=5;j++){const u=j/6,p=[];for(let i=0;i<=24;i++){const a=i*Math.PI/24;p.push([x+(220+40*u)*Math.cos(a),y+(170+38*u)*Math.sin(a),z+u*(65+Math.sin(a)*230)]);}k.wireTube(p,3.5,name+'_weft_'+j,'#bfb5a0');}
 return [[x-220,y,z+80],[x+220,y,z+80],[x,y+220,z+270]];
}
export function buildBlueprintOutdoor(k,spec,model,metal){
 const {width:w,height:h,depth:d}=spec.dimensions,b=model.blueprint,f=b.fixed,p=model.page,t=spec.dimensions.thickness??b.base.thickness??2;
 const x=-w/2,y=-d/2;
 if(p===19){
  const fd=Math.min(f.fireDepth,d-60),fh=f.fireHeight,z=h-fh-60;
  const top=[];for(let xx=x+25;xx<-x-25;xx+=50)top.push([xx,h-60],[xx+12,h-60],[xx+14,h-67],[xx+22,h-67],[xx+24,h-60]);
  const outer=[[x,z],[x,h],[x+20,h],[x+25,h-60],...top,[-x-25,h-60],[-x-20,h],[-x,h],[-x,z]];
  for(const [i,yy]of [-fd/2,fd/2-t].entries()){
   let holes=[];const n=Math.max(1,Math.floor((w-50)/160));for(let j=0;j<n;j++)holes.push(...k.cuts(p,'motif',([u,v])=>[x+40+j*(w-80)/n+u*80,z+38+(1-v)*50],outer,1));
   k.yPlate(yy,outer,t,'firebox_decor_'+i,holes,metal,true);
  }
  for(const [i,xx]of [x,-x-t].entries()){
   k.xPlate(xx,rect(-fd/2,z,fd,h-z),t,'firebox_end_'+i,[],metal,true);
  }
  for(const [i,signX]of [-1,1].entries())for(const [j,signY]of [-1,1].entries()){
   const foot=75,topWidth=150,inset=55,xAt=(u,zz)=>signX*(w/2-inset*zz/z-u*(foot+(topWidth-foot)*zz/z)),outer=[[xAt(0,0),0],[xAt(1,0),0],[xAt(1,z),z],[xAt(0,z),z]];
   let holes=[];for(let n=0;n<5;n++)holes.push(...k.cuts(p,'motif',([u,v])=>{const zz=45+n*(z-110)/5+(1-v)*35;return [xAt(.5,zz)+(u-.5)*52,zz];},outer,2));
   k.extrude(outer,holes,([xx,zz],s)=>[xx,signY*(d/2+(fd-d)/2*zz/z)+(signY<0?t:0)-s,zz],t,'grill_leg_'+i+'_'+j,metal,true);
  }
  const vents=[];for(let xx=x+25;xx<-x-20;xx+=90)for(const yy of [-fd/2+25,fd/2-25])vents.push(circle(xx,yy,5,12));
  k.zPlate(z,rect(x,-fd/2,w,fd),t,'firebox_floor',vents,metal,true);
  k.item('Передняя / задняя стенка',2,`${w} × ${fh+60} × ${t}`,'Сталь','Вырезы под шампуры и орнамент');k.item('Дно жаровни',1,`${w} × ${fd} × ${t}`,'Сталь','Схема вентиляции предварительная');k.item('Опоры',4,`${z} × 65 × ${t}`,'Сталь','Положение замков требует сверки');
 }else if(p===21){
  const a=60,c=40,top=h-65,roofZ=yy=>h-5-(yy-y)*.13;
  for(const xx of [x+a/2,-x-a/2]){
   k.tube([xx,y+20,20],[xx,-y-20,20],40,40,2,'swing_base_'+xx);
   for(const yy of [y+45,-y-45])k.tube([xx,yy,40],[xx,0,top-80],a,c,2,'swing_leg_'+xx+'_'+yy);
   k.tube([xx,y+180,h*.36],[xx,-y-180,h*.36],40,40,2,'swing_brace_'+xx);
   k.tube([xx,y+30,roofZ(y+30)-40],[xx,-y-30,roofZ(-y-30)-40],40,40,2,'roof_side_'+xx);
  }
  k.tube([x,0,top-80],[-x,0,top-80],60,40,2,'swing_top_beam');
  for(const yy of [y+20,0,-y-20])k.tube([x+30,yy,roofZ(yy)-30],[-x-30,yy,roofZ(yy)-30],40,40,2,'roof_cross_'+yy);
  const roof=[];const nr=Math.ceil(w/90);for(let i=0;i<=nr;i++){const xx=x+i*w/nr;roof.push([xx,0],[Math.min(-x,xx+12),5],[Math.min(-x,xx+30),5],[Math.min(-x,xx+42),0]);}
  // A thin folded strip, extruded down the roof slope; no solid block roof.
  const outer=[...roof,...[...roof].reverse().map(([xx,z])=>[xx,z-.8])];
  k.extrude(outer,[],([xx,z],s)=>[xx,-y-s,roofZ(-y-s)+z],d,'roof_corrugated',metal);
  const sw=Math.min(f.seatWidth+w-b.base.width,w-240),sd=Math.min(f.seatDepth,d-400),sh=f.seatHeight,wt=25,ww=90,backH=500;
  const n=Math.floor((sd+8)/(ww+8)),gap=(sd-n*ww)/Math.max(1,n-1),rear=sd/2;
  for(let j=0;j<n;j++)k.box(-sw/2,-sd/2+j*(ww+gap),sh-wt,sw,ww,wt,'wood_seat_'+j,'#ab7b4c');
  const nb=5,bgap=(backH-nb*ww)/4;
  for(let j=0;j<nb;j++){const zz=sh+j*(ww+bgap),yy=rear+(zz-sh)*.25;k.xPlate(-sw/2,[[yy,zz],[yy-25,zz+6],[yy-3,zz+96],[yy+22,zz+90]],sw,'wood_back_'+j,[],'#ab7b4c');}
  for(const xx of [-sw/2,sw/2]){
   k.tube([xx,-sd/2,sh-45],[xx,sd/2,sh-45],40,40,2,'seat_rail_'+xx);
   k.tube([xx,rear,sh],[xx,rear+120,sh+backH],40,40,2,'seat_back_post_'+xx);
   k.tube([xx,-sd/2,sh],[xx,-sd/2,sh+180],30,30,2,'seat_arm_post_'+xx);
   k.tube([xx,-sd/2,sh+180],[xx,sd/2+40,sh+180],30,30,2,'armrest_'+xx);
   chain(k,[xx,-sd/2,sh+180],[xx,0,top-80],'hanger_front_'+xx);chain(k,[xx,rear+100,sh+backH],[xx,0,top-80],'hanger_rear_'+xx);
  }
  k.item('Каркас качелей',1,`${w} × ${h} × ${d}`,'Профиль 60 × 40 × 2');k.item('Связи и основание',1,'40 × 40 × 2','Профильная труба');k.item('Сиденье',1,`${sw} × ${sd} × ${backH}`,'Дерево / сталь','Сечение досок 90 × 25 — визуальная оценка');k.item('Крыша',1,`${w} × ${d}`,'Профнастил','Толщина, уклон и профиль предварительные');k.item('Подвесы',4,'По геометрии','Цепь','Размер звена показан условно');
 }else if(p===22){
  const a=60,c=40,pw=Math.min(f.panelWidth,d-160);
  for(const xx of [x+a/2,-x-a/2]){
   k.tube([xx,y,20],[xx,-y,20],60,40,2,'gazebo_base_'+xx);
   for(const yy of [-pw/2,pw/2])k.tube([xx,yy,40],[xx,yy,h-40],60,40,2,'gazebo_post_'+xx+'_'+yy);
   k.tube([xx,y,h-20],[xx,-y,h-20],60,40,2,'roof_side_'+xx);
   const outer=rect(-pw/2,45,pw,h-105),holes=k.cuts(p,'side',([u,v])=>[-pw/2+15+u*(pw-30),70+(1-v)*(h-155)],outer,2);
   k.xPlate(xx-2,outer,t,'side_decor_'+xx,holes,metal,true);
   for(const yy of [-pw/2,pw/2]){const sign=Math.sign(xx);k.tube([xx,yy,h-350],[xx-sign*320,yy,h-45],40,40,2,'gazebo_brace_'+xx+'_'+yy);}
  }
  for(let i=0;i<5;i++){const yy=y+30+i*(d-60)/4;k.tube([x+30,yy,h-25],[-x-30,yy,h-25],60,40,2,'roof_beam_'+i);}
  for(const [i,xx]of [-w*.23,w*.23].entries()){
   const points=basketChair(k,xx,0,500,'basket_chair_'+i);for(let j=0;j<points.length;j++)chain(k,points[j],[xx,0,h-55],'hanger_'+i+'_'+j);
  }
  k.item('Каркас навеса',1,`${w} × ${h} × ${d}`,'Профиль 60 × 40 × 2');k.item('Декоративные панели',2,`${pw} × ${h-105} × ${spec.dimensions.thickness??'?'}`,'Сталь','Толщина не задана');k.item('Подвесное кресло',2,'Около 520 × 420','Плетёное','Визуальная компоновка; размеры и нагрузка не заданы');
 }
}
