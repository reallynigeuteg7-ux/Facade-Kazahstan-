import {zlibSync} from 'three/examples/jsm/libs/fflate.module.js';
import {faceTriangles} from './solid.mjs';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n;});
function chunk(type,data){const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set([...type].map(c=>c.charCodeAt(0)),4);out.set(data,8);let crc=-1;for(let i=4;i<out.length-4;i++)crc=crcTable[(crc^out[i])&255]^(crc>>>8);v.setUint32(out.length-4,(crc^-1)>>>0);return out;}
function png(width,height,pixels){
 const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6;
 const scan=new Uint8Array(height*(width*4+1));for(let y=0;y<height;y++)scan.set(pixels.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
 const chunks=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlibSync(scan,{level:4})),chunk('IEND',new Uint8Array())],all=new Uint8Array(chunks.reduce((s,c)=>s+c.length,0));let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length;}
 let binary='';for(let i=0;i<all.length;i+=8192)binary+=String.fromCharCode(...all.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(binary);
}
// Orthographic z-buffer shared by server-generated SVG sheets and browser PDF.
// It resolves occlusion per pixel, including through apertures, instead of
// sorting whole steel rails over wooden boards by their average depth.
export function rasterView(faces,project,toward,box,pixelRatio=2){
 const W=Math.max(1,Math.ceil(box.w*pixelRatio)),H=Math.max(1,Math.ceil(box.h*pixelRatio)),pixels=new Uint8Array(W*H*4),depth=new Float64Array(W*H);depth.fill(-Infinity);
 const edges=[],light=[-.259,-.432,.864],screen=p=>{const q=project(p);return [(q[0]-box.x)*pixelRatio,(q[1]-box.y)*pixelRatio,dot(p,toward)];};
 for(const f of faces){
  if(dot(f.normal,toward)<1e-8)continue;
  const shade=.72+.28*Math.max(0,dot(f.normal,light)),color=[1,3,5].map(i=>parseInt((f.color||'#ddddda').slice(i,i+2),16)*shade),wood=f.name.startsWith('wood_');
  for(const polygon of faceTriangles(f))for(let j=1;j<polygon.length-1;j++){
   const tri=[polygon[0],polygon[j],polygon[j+1]],q=tri.map(screen),[a,b,c]=q,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;
   const lx=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),rx=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),ly=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),ry=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=ly;y<=ry;y++)for(let x=lx;x<=rx;x++){
    const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,ww=1-u-v;if(u<-.000001||v<-.000001||ww<-.000001)continue;
    const z=u*a[2]+v*b[2]+ww*c[2],id=y*W+x;if(z<depth[id])continue;depth[id]=z;
    let grain=1;if(wood){const xx=u*tri[0][0]+v*tri[1][0]+ww*tri[2][0],yy=u*(tri[0][1]+tri[0][2])+v*(tri[1][1]+tri[1][2])+ww*(tri[2][1]+tri[2][2]);grain=1+.07*Math.sin(yy*2.7+Math.sin(xx*.018)*1.6)+.035*Math.sin(yy*7.1+xx*.012);}
    const offset=id*4;for(let k=0;k<3;k++)pixels[offset+k]=Math.min(255,Math.round(color[k]*grain));pixels[offset+3]=255;
   }
  }
  const loops=[f.points,...(f.holes||[])];for(let l=0;l<loops.length;l++)for(let i=0;i<loops[l].length;i++)if(l>0||f.edges?.[i]!==false)edges.push([screen(loops[l][i]),screen(loops[l][(i+1)%loops[l].length])]);
 }
 for(const [a,b]of edges){const n=Math.ceil(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1])));for(let j=0;j<=n;j++){const t=j/(n||1),x=Math.round(a[0]+(b[0]-a[0])*t),y=Math.round(a[1]+(b[1]-a[1])*t);if(x<0||x>=W||y<0||y>=H)continue;const id=y*W+x,z=a[2]+(b[2]-a[2])*t;if(z<depth[id]-.7)continue;const i=id*4;for(let k=0;k<3;k++)pixels[i+k]=pixels[i+3]?Math.round(pixels[i+k]*.55+30):80;pixels[i+3]=255;}}
 return `<image data-solid-render="depth-buffer" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" href="${png(W,H,pixels)}"/>`;
}
