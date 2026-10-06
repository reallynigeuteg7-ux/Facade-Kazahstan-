import {rect,curvedPath} from './solid-builder.mjs';
import {circle} from './solid.mjs';
// Product-specific side profiles, following the supplied orthographic views.
// u runs from rear to front, v from top to floor.
const profiles={
 1:[[0,0],[.105,0],[.29,.535],[1,.57],[.66,1],[.025,1],[.095,.912],[.565,.92],[.68,.67],[.20,.615]],
 2:curvedPath([[.02,0],[.105,0],[.28,.31],[.32,.35,.44,.35],[.88,.35],[1,.35,1,.43],[.97,.49,.86,.51],[.78,.64],[.81,.81,.98,1],[.82,1],[.68,.78,.59,.76],[.32,.76],[.20,.89,.14,1],[0,1],[.10,.73,.09,.55],[.05,.25,.02,0]]),
 5:curvedPath([[.025,0],[.10,0,.15,.075],[.34,.48],[.28,.52,.31,.565],[.34,.62,.44,.585],[.54,.53],[.97,.52],[1,.53,1,.56],[.77,.85,.70,1],[.03,1],[.03,.66],[.005,.52,.015,.42],[.025,0]]),
 6:curvedPath([[.01,0],[.12,0],[.34,.53],[.985,.53],[1,.54,.985,.58],[.765,1],[.035,1],[.035,.61],[.01,0]]),
 7:curvedPath([[.015,0],[.12,0],[.34,.51],[.9,.5],[1,.54,1,.62],[.81,1],[.035,1],[.035,.55],[.015,0]]),
 8:curvedPath([[.005,.035],[.005,0,.055,0],[.105,0,.13,.045],[.31,.53],[.945,.53],[1,.55,1,.61],[.83,1],[.025,1],[.005,.035]]),
};
export function buildBlueprintBench(k,spec,model,metal){
 const {width:w,height:h,depth:d}=spec.dimensions,b=model.blueprint,f=b.fixed,page=model.page;
 const t=spec.dimensions.thickness??b.base.thickness??2,wood='#ad794d',backless=b.shape==='bench-backless';
 const seat=backless?h:f.seatHeight,wt=f.woodThickness,ww=f.woodWidth,angle=(f.angle||10)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
 const panel=f.panelHeight||0,backStart=seat-wt-([1,2].includes(page)?8:0);
 const usable=f.seatDepth+(d-b.base.depth);
 const seatDepth=backless?d:Math.min(usable,d-(h-seat)*Math.tan(angle)-wt/cos-20);
 const rear=-d/2+seatDepth,backY=z=>rear+(z-backStart)*Math.tan(angle);
 const supportT=[3,4,9].includes(page)?f.tubeA:t;
 const left=-w/2,right=w/2,length=w-2*supportT,x0=left+supportT,x1=right-supportT;
 let profile;
 if(profiles[page])profile=profiles[page].map(([u,v])=>{
  const us=profiles[page].map(p=>p[0]);u=(u-Math.min(...us))/(Math.max(...us)-Math.min(...us));
  const z0=(1-v)*b.base.height;
  const z=z0<=f.seatHeight?z0:seat+(z0-f.seatHeight)*(h-seat)/(b.base.height-f.seatHeight);
  return [d/2-u*d,z];
 });
 for(const [i,xx]of [[0,left],[1,right-supportT]]){
  const name='side_panel_'+i;
  if(page===4){
   const a=f.tubeA,c=f.tubeB,wall=f.tubeWall,cx=xx+a/2;
   for(const yy of [-d/2+c/2,d/2-c/2])k.tube([cx,yy,a],[cx,yy,seat+140-a/2],a,c,wall,'side_leg_'+i+'_'+yy);
   k.tube([cx,-d/2,20],[cx,d/2,20],40,40,wall,'side_base_'+i);
   k.tube([cx,-d/2,seat+120],[cx,d/2,seat+120],a,c,wall,'armrest_'+i);
   k.tube([cx,rear+20,seat-wt],[cx,backY(h)-20,h-20],a,c,wall,'back_post_'+i);
  }else if(page===3||backless){
   const ph=backless?seat-wt:seat+145;
   const outer=rect(-d/2,0,d,ph),holes=k.cuts(page,'side',([u,v])=>[d/2-25-u*(d-50),25+(1-v)*(ph-50)],outer,1);
   k.xPlate(xx+20-t/2,outer,t,name,holes,metal,true);
   for(const yy of [-d/2+20,d/2-20])k.tube([xx+20,yy,0],[xx+20,yy,ph],40,40,2,'side_frame_'+i+'_'+yy);
   for(const zz of [20,ph-20])k.tube([xx+20,-d/2,zz],[xx+20,d/2,zz],40,40,2,'side_frame_cross_'+i+'_'+zz);
   if(!backless)k.xPlate(xx,[[rear-25,seat],[backY(h)-60,h],[backY(h),h],[rear+35,seat]],t,'back_post_'+i);
  }else{
   const holes=k.cuts(page,'side',([u,v])=>[d/2-u*d,(1-v)*h],profile,3);
   if(page===2)holes.unshift(curvedPath([[.32,.40],[.80,.40],[.90,.40,.88,.46],[.78,.58],[.33,.58],[.29,.48,.32,.40]]).map(([u,v])=>[d/2-u*d,(1-v)*h]));
   k.xPlate(xx,profile,t,name,holes,metal,true);
  }
  if(page!==4&&page!==3&&page!==9){
   const footD=page===1?d*.63:70,footY=page===1?d/2-footD:-d/2+50;
   for(const [j,yy]of (page===1?[footY]:[footY,d/2-80]).entries()){
   const fw=40,fx=i?right-fw:left,outer=rect(fx,yy,fw,footD),holes=[circle(fx+fw/2,yy+20,6),circle(fx+fw/2,yy+footD-20,6)];
    k.zPlate(0,outer,5,'leg_foot_'+i+'_'+j,holes,metal,true);
   }
  }
 }
 const nSeat=Math.max(1,Math.floor((seatDepth+6)/(ww+6))),gap=nSeat>1?(seatDepth-nSeat*ww)/(nSeat-1):0;
 const radius=Math.min(4,wt/5),roundBoard=(y,z)=>curvedPath([[y+radius,z],[y+ww-radius,z],[y+ww,z,y+ww,z+radius],[y+ww,z+wt-radius],[y+ww,z+wt,y+ww-radius,z+wt],[y+radius,z+wt],[y,z+wt,y,z+wt-radius],[y,z+radius],[y,z,y+radius,z]]);
 for(let i=0;i<nSeat;i++){
  const yy=-d/2+i*(ww+gap);k.xPlate(x0,roundBoard(yy,seat-wt),length,'wood_seat_'+(i+1),[],wood);
  for(const [j,xx]of [x0+23,0,x1-23].entries())k.bolt([xx,yy+ww/2,seat-(backless?5.4:0)],[0,0,1],'fastener_seat_'+i+'_'+j,8);
 }
 k.item('Планка сиденья',nSeat,`${length} × ${ww} × ${wt}`,'Дерево','Сечение сохранено; длина по заказу');
 for(const [i,xx]of [x0+25,0,x1-25].entries())k.tube([xx,-d/2,seat-wt-f.tubeB/2],[xx,rear,seat-wt-f.tubeB/2],f.tubeA,f.tubeB,f.tubeWall,'seat_support_'+i);
 for(const [i,yy]of [-d/2+25,rear-25].entries())k.tube([x0,yy,seat-wt-f.tubeA/2],[x1,yy,seat-wt-f.tubeA/2],f.tubeB,f.tubeA,f.tubeWall,'seat_longitudinal_'+i);
 k.item('Поперечина под сиденьем',3,`${seatDepth} × ${f.tubeA} × ${f.tubeB} × ${f.tubeWall}`,'Профильная труба');
 k.item('Продольная связь сиденья',2,`${length} × ${f.tubeA} × ${f.tubeB} × ${f.tubeWall}`,'Профильная труба');
 if(!backless){
  const available=h-panel-backStart-wt*sin,nBack=Math.max(1,Math.floor(available/(ww*cos))),backGap=nBack>1?(available-nBack*ww*cos)/(nBack-1):0;
  for(let i=0;i<nBack;i++){
   const zz=backStart+i*(ww*cos+backGap),yy=backY(zz);
   const section=[[yy,zz],[yy-wt*cos,zz+wt*sin],[yy-wt*cos+ww*sin,zz+wt*sin+ww*cos],[yy+ww*sin,zz+ww*cos]];
   k.xPlate(x0,section,length,'wood_back_'+(i+1),[],wood);
   for(const [j,xx]of [x0+23,0,x1-23].entries())k.bolt([xx,yy-wt*cos+ww*sin/2,zz+wt*sin+ww*cos/2],[0,-cos,sin],'fastener_back_'+i+'_'+j,8);
  }
  k.item('Планка спинки',nBack,`${length} × ${ww} × ${wt}`,'Дерево','Угол спинки '+(f.angle||10)+'°; количество по доступной высоте');
  if(panel){
   const top=h-t*sin,ph=panel/cos,bottom=top-panel,outer=rect(x0,0,length,ph),originalLength=b.base.width-2*supportT;
   const px=u=>page!==1||length<originalLength?x0+u*length:u<.28?x0+u*originalLength:u>.72?x1+(u-1)*originalLength:(u-.5)*originalLength;
   const holes=k.cuts(page,'back',([u,v])=>[px(.015+.97*u),8+(1-v)*(ph-16)],outer,1);
   k.extrude(outer,holes,([x,v],s)=>[x,backY(bottom)+v*sin-s*cos,bottom+v*cos+s*sin],t,'upper_decor_panel',metal,true);
   k.item('Верхняя панель с орнаментом',1,`${length} × ${ph.toFixed(1)} × ${t}`,'Листовая сталь','Сквозные вырезы; контур восстановлен по изображению');
  }
  for(const [i,z]of [backStart+30,h-panel-30].entries())k.tube([x0,backY(z)+f.tubeB/2,z],[x1,backY(z)+f.tubeB/2,z],f.tubeB,f.tubeA,f.tubeWall,'back_crossbar_'+i);
  k.item('Связь спинки',2,`${length} × ${f.tubeA} × ${f.tubeB} × ${f.tubeWall}`,'Профильная труба');
 }
 if(page===6){
  const high=seat-wt-6;
  const outer=curvedPath([[x0,0],[x0,high],[x1,high],[x1,0],[x1-40,20],[x1-130,high*.58,x1-330,high*.65],[x0+330,high*.65],[x0+130,high*.58,x0+40,20]]);
  const holes=k.cuts(page,'apron',([u,v])=>[x0+u*length,high-v*high],outer,2);
  k.yPlate(-d/2+10,outer,t,'front_decor_panel',holes,metal,true);
  k.item('Передняя ажурная панель',1,`${length} × ${high} × ${t}`,'Листовая сталь','Арка и сквозной орнамент');
 }
 k.item('Боковые опоры',2,`${h} × ${d} × ${spec.dimensions.thickness??b.base.thickness??'?'}`,'Сталь','Индивидуальный контур по виду сбоку');
 k.item('Болт, шайба, гайка',3*(nSeat+(k.bom.find(p=>p.name==='Планка спинки')?.count||0)),f.fastener||'М8 — проверить','Крепёж','Схема расположения требует сверки отверстий');
}
