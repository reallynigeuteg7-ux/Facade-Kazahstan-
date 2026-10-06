// Schematic ornament inspired by catalog page 1. Not a laser-cutting contour.
export function ethnoPaths(width,height) {
  const paths=[];
  const motif=(cx,cy,size)=>{
    paths.push([[0,-1],[1,0],[0,1],[-1,0],[0,-1]].map(([x,y])=>[cx+x*size/2,cy+y*size/2]));
    const curl=[[0,-.82],[.14,-.62],[.38,-.58],[.43,-.36],[.28,-.22],[.10,-.28],[.10,-.43],[.23,-.47],[.29,-.37]];
    for(let turn=0;turn<4;turn++){
      const a=turn*Math.PI/2;
      paths.push(curl.map(([x,y])=>[cx+(x*Math.cos(a)-y*Math.sin(a))*size/2,cy+(x*Math.sin(a)+y*Math.cos(a))*size/2]));
    }
  };
  motif(-width*.34,height/2,height*.82);motif(width*.34,height/2,height*.82);
  const span=Math.min(width*.36,height*4.2),left=-span/2;
  for(let i=0;i<3;i++){
    const x=left+i*span/3,b=span/3;
    paths.push(i%2?[[x,8],[x+b,8],[x+b/2,height-8],[x,8]]:[[x,height-8],[x+b,height-8],[x+b/2,8],[x,height-8]]);
    motif(x+b/2,i%2?height*.36:height*.64,height*.45);
  }
  return paths;
}
export function ethnoGeometry(spec) {
  const t=spec.details,{width:w,height:h,depth:d}=spec.dimensions;
  const span=w-2*(t.supportInset+t.supportSize),rear=-d/2+t.seatDepth;
  const length=Math.hypot(d/2-rear,h-t.seatHeight),uy=(d/2-rear)/length,uz=(h-t.seatHeight)/length;
  const panel=t.backPanelHeight,th=spec.dimensions.thickness;
  if(!th || !panel || !Number.isFinite(length))return [];
  const to3=([x,v])=>[x,rear+uy*(length-panel+v)-th-.2,t.seatHeight+uz*(length-panel+v)];
  const faces=[],stroke=Math.max(1.5,panel*.025);
  for(const path of ethnoPaths(span,panel))for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const nx=-(b[1]-a[1])/len*stroke/2,ny=(b[0]-a[0])/len*stroke/2;
    faces.push([[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]].map(to3));
  }
  return faces;
}
