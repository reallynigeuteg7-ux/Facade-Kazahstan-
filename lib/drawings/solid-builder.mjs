import {extrudeLoops,circle,inside,area2} from './solid.mjs';
import {blueprintCuts} from './blueprint-cuts.mjs';
export const sub=(a,b)=>a.map((n,i)=>n-b[i]);
export const add=(a,b)=>a.map((n,i)=>n+b[i]);
export const mul=(a,n)=>a.map(v=>v*n);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>mul(a,1/(Math.hypot(...a)||1));
export const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export function curvedPath(commands){
 const result=[];let p=[0,0];for(const c of commands){
  if(c.length===2){p=c;result.push(c);}
  else if(c.length===4){const a=p;for(let i=1;i<=10;i++){const t=i/10,s=1-t;result.push([s*s*a[0]+2*s*t*c[0]+t*t*c[2],s*s*a[1]+2*s*t*c[1]+t*t*c[3]]);}p=c.slice(2);}
  else{const a=p;for(let i=1;i<=14;i++){const t=i/14,s=1-t;result.push([s*s*s*a[0]+3*s*s*t*c[0]+3*s*t*t*c[2]+t*t*t*c[4],s*s*s*a[1]+3*s*s*t*c[1]+3*s*t*t*c[3]+t*t*t*c[5]]);}p=c.slice(4);}
 }return result;
}
export function createSolidBuilder(color='#e4e5e2'){
 const faces=[],parts=[],cutParts=[],bom=[];
 const extrude=(outer,holes,map,thickness,name,fill=color,record=false)=>{
  if(!(thickness>0)||outer.length<3)return;
  const made=extrudeLoops(outer,holes,map,thickness,name,fill);faces.push(...made);if(!parts.includes(name))parts.push(name);
  if(record)cutParts.push({name,outer,holes,thickness,material:'Сталь',source:'Контур по изображению; проверить допуск и перемычки'});
 };
 const xPlate=(x,outer,t,name,holes=[],fill=color,record=false)=>extrude(outer,holes,([y,z],s)=>[x+s,y,z],t,name,fill,record);
 const yPlate=(y,outer,t,name,holes=[],fill=color,record=false)=>extrude(outer,holes,([x,z],s)=>[x,y+t-s,z],t,name,fill,record);
 const zPlate=(z,outer,t,name,holes=[],fill=color,record=false)=>extrude(outer,holes,([x,y],s)=>[x,y,z+s],t,name,fill,record);
 const box=(x,y,z,w,d,h,name,fill=color)=>zPlate(z,rect(x,y,w,d),h,name,[],fill);
 function beam(p,q,a,b,name,fill=color,wall=0){
  const v=sub(q,p),length=Math.hypot(...v);if(length<1e-5)return;
  const n=unit(v),e=unit(cross(n,Math.abs(n[2])>.95?[0,1,0]:[0,0,1])),g=cross(n,e);
  extrude(rect(-a/2,-b/2,a,b),wall?[rect(-a/2+wall,-b/2+wall,a-2*wall,b-2*wall)]:[],([u,v],s)=>add(p,add(mul(e,u),add(mul(g,v),mul(n,s)))),length,name,fill);
 }
 function tube(p,q,a,b,wall,name,fill=color){beam(p,q,a,b,name,fill,wall);}
 function cylinder(p,n,r,len,name,fill=color,segments=16){
  n=unit(n);const e=unit(cross(n,Math.abs(n[2])>.95?[0,1,0]:[0,0,1])),g=cross(n,e);
  extrude(circle(0,0,r,segments),[],([u,v],s)=>add(p,add(mul(e,u),add(mul(g,v),mul(n,s)))),len,name,fill);
 }
 function bolt(p,n,name,size=8){
  cylinder(p,n,size*.95,1.6,name+'_washer','#9ba1a4',16);
  cylinder(add(p,mul(n,1.6)),n,size*.72,3.8,name+'_head','#c1c6c8',6);
 }
 function cuts(page,key,transform,outer,margin=.05){
  const source=blueprintCuts[page]?.[key];if(!source)return [];
  const loops=source.loops.map(l=>l.map(transform)).filter(l=>Math.abs(area2(l))>1);
  if(!outer)return loops;
  const edgeDistance=p=>Math.min(...outer.map((a,i)=>{const b=outer[(i+1)%outer.length],v=sub(b,a),k=Math.max(0,Math.min(1,sub(p,a).reduce((s,n,j)=>s+n*v[j],0)/(v[0]**2+v[1]**2||1)));return Math.hypot(p[0]-a[0]-k*v[0],p[1]-a[1]-k*v[1]);}));
  return loops.filter(l=>l.every(p=>inside(p,outer)&&edgeDistance(p)>margin));
 }
 function shell(x,y,z,w,d,h,t,name,fill=color){
  box(x,y,z,w,d,t,name+'_bottom',fill);box(x,y,z,t,d,h,name+'_left',fill);box(x+w-t,y,z,t,d,h,name+'_right',fill);box(x+t,y,z,w-2*t,t,h,name+'_front',fill);box(x+t,y+d-t,z,w-2*t,t,h,name+'_rear',fill);
 }
 const item=(name,count,size,material='Сталь',note='')=>bom.push({name,count,size,material,note});
 const surface=(points,name,fill=color,edges=points.map(()=>false))=>{const n=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));faces.push({points,name,color:fill,normal:n,edges});if(!parts.includes(name))parts.push(name);};
 function wireTube(path,r,name,fill=color,closed=false,sides=8){
  const rings=path.map((p,i)=>{const prev=path[(i-1+path.length)%path.length],next=path[(i+1)%path.length],dir=unit(sub(closed?next:i===path.length-1?p:next,closed?prev:i===0?p:prev));const e=unit(cross(dir,Math.abs(dir[2])>.95?[0,1,0]:[0,0,1])),g=cross(dir,e);return Array.from({length:sides},(_,j)=>add(p,add(mul(e,r*Math.cos(j*2*Math.PI/sides)),mul(g,r*Math.sin(j*2*Math.PI/sides)))));});
  for(let i=0;i<rings.length-(closed?0:1);i++){const next=rings[(i+1)%rings.length];for(let j=0;j<sides;j++)surface([rings[i][j],rings[i][(j+1)%sides],next[(j+1)%sides],next[j]],name,fill);}
  if(!closed){surface([...rings[0]].reverse(),name,fill);surface(rings.at(-1),name,fill);}
 }
 return {faces,parts,cutParts,bom,extrude,xPlate,yPlate,zPlate,box,beam,tube,cylinder,bolt,cuts,shell,item,surface,wireTube};
}
