const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const coords=p=>p.map(n=>n.toFixed(3)).join(' ');
export function faceSvg(face,project,fill,stroke='#586069',width=.55){
 const loops=[face.points,...(face.holes||[])].map(l=>l.map(project));
 const path=loops.map(l=>'M'+l.map(coords).join('L')+'Z').join('');
 let out=`<path data-part="${esc(face.name)}"${face.holes?.length?` data-through-holes="${face.holes.length}"`:''} d="${path}" fill="${fill}" fill-rule="evenodd" stroke="${face.cap?stroke:fill}" stroke-width="${face.cap?width:.1}" stroke-linejoin="round"/>`;
 if(!face.cap){
  for(let i=0;i<loops[0].length;i++)if(face.edges?.[i])out+=`<path d="M${coords(loops[0][i])}L${coords(loops[0][(i+1)%loops[0].length])}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
 }
 // Grain follows the long physical edge of each wooden face. It is clipped
 // naturally by interpolation within the face rather than a screen texture.
 if(face.name.startsWith('wood_')&&face.points.length===4){
  let p=face.points;
  const len=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
  if(len(p[0],p[1])<len(p[1],p[2]))p=[p[1],p[2],p[3],p[0]];
  const L=len(p[0],p[1]),B=len(p[1],p[2]);
  if(L>300&&B>8){
   const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
   for(let i=1;i<9;i++){
    const points=[];for(let j=0;j<=16;j++){const t=j/16,v=i/10+.013*Math.sin(j*.85+i*1.3)+.009*Math.sin(j*1.9+i);points.push(project(mix(mix(p[0],p[1],t),mix(p[3],p[2],t),v)));}
    out+=`<path d="M${points.map(coords).join('L')}" fill="none" stroke="${i%3?'#4c301d':'#efc499'}" stroke-opacity="${i%3?.22:.45}" stroke-width="${width*.7}"/>`;
   }
  }
 }
 return out;
}
