import {Earcut} from 'three/src/extras/Earcut.js';
// Closed planar extrusions, shared by SVG projections and mesh export.
// Polygon loops describe actual material boundaries, including through holes.
export const area2 = loop => loop.reduce((s,p,i)=>{const q=loop[(i+1)%loop.length];return s+p[0]*q[1]-q[0]*p[1];},0);
export function inside(point,loop){
 let hit=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){
  const a=loop[i],b=loop[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
}
export const circle=(x,y,r,n=20)=>Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)]);
export function trapezoidTriangles(loops){
 // Horizontal trapezoid decomposition supports concave outlines and nested
 // holes without bridging an opening with a false face. Unique Y bands keep
 // intersections in a stable order for simple, non-intersecting boundaries.
 const ys=[...new Set(loops.flat().map(p=>p[1]))].sort((a,b)=>a-b),edges=[];
 for(const loop of loops)for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];if(Math.abs(a[1]-b[1])>1e-9)edges.push([a,b]);}
 const xAt=([a,b],y)=>a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
 const triangles=[];
 for(let k=1;k<ys.length;k++){
  const y0=ys[k-1],y1=ys[k],ym=(y0+y1)/2;if(y1-y0<1e-8)continue;
  const crossings=edges.filter(([a,b])=>ym>Math.min(a[1],b[1])&&ym<Math.max(a[1],b[1])).sort((a,b)=>xAt(a,ym)-xAt(b,ym));
  for(let j=0;j+1<crossings.length;j+=2){
   const left=crossings[j],right=crossings[j+1];
   const a=[xAt(left,y0),y0],b=[xAt(right,y0),y0],c=[xAt(right,y1),y1],d=[xAt(left,y1),y1];
   if(Math.abs(area2([a,b,c]))>1e-8)triangles.push([a,b,c]);
   if(Math.abs(area2([a,c,d]))>1e-8)triangles.push([a,c,d]);
  }
 }return triangles;
}
const triangleCache=new WeakMap();
export function triangulateLoops(loops){
 if(triangleCache.has(loops))return triangleCache.get(loops);
 const hierarchy=loops.map((l,i)=>{const containers=loops.map((q,j)=>j!==i&&inside(l[0],q)?j:-1).filter(j=>j>=0);containers.sort((a,b)=>Math.abs(area2(loops[a]))-Math.abs(area2(loops[b])));return {depth:containers.length,parent:containers[0]??-1};});
 const result=[];
 for(let i=0;i<loops.length;i++)if(hierarchy[i].depth%2===0){
  const group=[loops[i],...loops.filter((_,j)=>hierarchy[j].parent===i&&hierarchy[j].depth%2===1)],points=group.flat(),indices=[];let n=group[0].length;
  for(let j=1;j<group.length;j++){indices.push(n);n+=group[j].length;}
  const tris=Earcut.triangulate(points.flat(),indices,2);for(let j=0;j<tris.length;j+=3)result.push([points[tris[j]],points[tris[j+1]],points[tris[j+2]]]);
 }
 triangleCache.set(loops,result);return result;
}
export function extrudeLoops(outer,holes,map,thickness,name,color){
 const all=[outer,...holes].filter(l=>l.length>2);
 const loops=all.map((l,i)=>{const depth=all.filter((q,j)=>j!==i&&inside(l[0],q)).length;return area2(l)*(depth%2?-1:1)>0?l:[...l].reverse();});
 const normalOf=points=>{const n=[0,0,0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}const l=Math.hypot(...n)||1;return n.map(v=>v/l);};
 const faces=[];
 const make=(points,extra={})=>faces.push({points,normal:normalOf(points),name,color,edges:points.map(()=>true),...extra});
 const near=loops.map(l=>l.map(p=>map(p,0))),far=loops.map(l=>l.map(p=>map(p,thickness)));
 // Map must preserve the right-handed local (u,v,depth) basis.
 make([...near[0]].reverse(),{holes:near.slice(1).map(l=>[...l].reverse()),cap:true,localLoops:loops,capMap:p=>map(p,0),reverseTriangles:true});
 make(far[0],{holes:far.slice(1),cap:true,localLoops:loops,capMap:p=>map(p,thickness)});
 for(let l=0;l<loops.length;l++)for(let i=0;i<loops[l].length;i++){
  const j=(i+1)%loops[l].length;
  make([near[l][i],near[l][j],far[l][j],far[l][i]],{cutWall:l>0,edges:[true,false,true,false]});
 }
 return faces;
}
export function faceTriangles(face){
 if(face.localLoops)return triangulateLoops(face.localLoops).map(t=>{const p=t.map(face.capMap);return face.reverseTriangles?p.reverse():p;});
 // Ordinary legacy faces retain their polygon representation.
 return [face.points];
}
