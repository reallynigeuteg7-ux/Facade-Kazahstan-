import { catalogModelById } from './catalog.mjs';
import { ethnoPhotoCells } from './ethno-photo.mjs';
import { blueprintGeometry } from './blueprint-solid-geometry.mjs';

const blueprintCache=new Map();

// All coordinates below are visual proportions in a unit envelope, NOT
// manufacturing measurements. Only the external W/H/D come from the order.
export function catalogGeometry(spec) {
  const model=catalogModelById(spec.catalogModel);
  const {width:w,height:h,depth:d}=spec.dimensions;
  if(!model || !w || !h || !d) return null;
  if(model.blueprint){
    const key=JSON.stringify([model.id,spec.dimensions]);
    if(blueprintCache.has(key))return blueprintCache.get(key);
    const geometry=blueprintGeometry(spec,model);blueprintCache.set(key,geometry);
    if(blueprintCache.size>8)blueprintCache.delete(blueprintCache.keys().next().value);
    return geometry;
  }
  const faces=[],parts=[],wires=[],guides=[];
  const scale=([x,y,z])=>[x*w,y*d,z*h];
  const color=model.page===1||model.shape==='ornate'?'#edece8':'#3c4144';
  function face(points,name,fill=color) {
    const vertices=points.map(scale),normal=[0,0,0];
    // Concave panels need the entire perimeter to determine the outward normal.
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length];
      normal[0]+=(a[1]-b[1])*(a[2]+b[2]);
      normal[1]+=(a[2]-b[2])*(a[0]+b[0]);
      normal[2]+=(a[0]-b[0])*(a[1]+b[1]);
    }
    const length=Math.hypot(...normal);if(length<1e-8)return;
    faces.push({points:vertices,name,color:fill,normal:normal.map(n=>n/length),edges:points.map(()=>true)});
    if(!parts.includes(name))parts.push(name);
  }
  function prism(profile,axis,lo,hi,name,fill) {
    let area=0;for(let i=0;i<profile.length;i++){const a=profile[i],b=profile[(i+1)%profile.length];area+=a[0]*b[1]-b[0]*a[1];}
    const shape=area<0?[...profile].reverse():profile;
    const point=(a,p)=>axis==='x'?[a,...p]:axis==='y'?[p[1],a,p[0]]:[...p,a];
    const a=shape.map(p=>point(lo,p)),b=shape.map(p=>point(hi,p));
    face([...a].reverse(),name,fill);face(b,name,fill);
    for(let i=0;i<a.length;i++){const j=(i+1)%a.length;face([a[i],a[j],b[j],b[i]],name,fill);}
  }
  function box(x,y,z,b,l,a,name,fill=color){prism([[x,y],[x+b,y],[x+b,y+l],[x,y+l]],'z',z,z+a,name,fill);}
  function bar(a,b,size,name,fill=color) {
    // Rectangular tube silhouette: constant section in mm, then converted back
    // into reference coordinates. Hollow wall and welds are deliberately absent.
    const p=scale(a),q=scale(b),v=q.map((n,i)=>n-p[i]),len=Math.hypot(...v),u=v.map(n=>n/len);
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const n=cross(u,Math.abs(u[2])>.9?[0,1,0]:[0,0,1]),nl=Math.hypot(...n),e=n.map(v=>v/nl),f=cross(u,e);
    const mm=size*Math.min(w,d,h),ring=center=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([s,t])=>center.map((v,i)=>(v+(s*e[i]+t*f[i])*mm/2)/[w,d,h][i]));
    const aa=ring(p),bb=ring(q);face([...aa].reverse(),name,fill);face(bb,name,fill);
    for(let i=0;i<4;i++)face([aa[i],aa[(i+1)%4],bb[(i+1)%4],bb[i]],name,fill);
  }
  function shell(x,y,z,b,l,a,name) {
    const t=Math.min(spec.dimensions.thickness||Math.min(w,d,h)*.008,b*w*.04,l*d*.04)/Math.min(w,d,h);
    const tx=t*Math.min(w,d,h)/w,ty=t*Math.min(w,d,h)/d,tz=t*Math.min(w,d,h)/h;
    box(x,y,z,b,l,tz,name+'_bottom');box(x,y,z,tx,l,a,name+'_left');box(x+b-tx,y,z,tx,l,a,name+'_right');
    box(x+tx,y,z,b-2*tx,ty,a,name+'_front');box(x+tx,y+l-ty,z,b-2*tx,ty,a,name+'_rear');
  }
  function ornament(x,y,z,b,a,name,orientation='front') {
    // Observed decoration placement; outline is schematic, not a DXF cut file.
    const map=([u,v])=>orientation==='side'?[x,y+u*b,z+v*a]:[x+u*b,y,z+v*a];
    for(let j=0;j<3;j++) {
      const cx=(j+.5)/3,cy=.5,s=.25;
      const path=[[0,-1],[.65,-.35],[.25,.05],[.75,.5],[0,1],[-.75,.5],[-.25,.05],[-.65,-.35],[0,-1]].map(([u,v])=>map([cx+u*s,cy+v*.42]));
      for(let i=1;i<path.length;i++)bar(path[i-1],path[i],.008,name+'_'+j,model.page===1?'#57a6b2':'#15191b');
    }
  }
  function photoOrnament(x,y,z,b,a) {
    // Filled silhouettes preserve the white interiors of the curls. A flat
    // surface mark matches the visible photo without inventing cut-throughs.
    for(const cell of ethnoPhotoCells){
      const points=cell.map(([u,v])=>[x+u*b,y,z+(1-v)*a]);
      const before=faces.length;
      face([...points].reverse(),'back_pattern_photo','#59a9b6');
      if(faces.length>before){faces.at(-1).edges=points.map(()=>false);faces.at(-1).surfaceDecoration=true;}
    }
  }
  const detail=spec.details||{};
  function bench(shape,env={x:0,y:0,z:0,w:1,d:1,h:1}) {
    const P=([x,y,z])=>[env.x+x*env.w,env.y+y*env.d,env.z+z*env.h];
    const B=(x,y,z,b,l,a,name,fill)=>box(...P([x,y,z]),b*env.w,l*env.d,a*env.h,name,fill);
    const R=(a,b,s,name)=>bar(P(a),P(b),s,name);
    const seat=Math.min(.7,Math.max(.25,detail.seatHeight?detail.seatHeight/h:.49));
    const dep=Math.min(.82,Math.max(.35,detail.seatDepth?detail.seatDepth/d:.64));
    const th=Math.min(.08,Math.max(.01,detail.seatThickness?detail.seatThickness/h:.034));
    const backless=shape==='backless',inset=.04,railColor=shape==='panel-dark'?'#777c7b':'#b78350';
    const n=shape==='tube'?7:shape==='angled-dark'?5:4,gap=.018,slat=(dep-gap*(n-1))/n;
    for(let i=0;i<n;i++)B(-.47,-.48+i*(slat+gap),seat-th,.94,slat,th,'wood_seat_'+(i+1),railColor);
    for(const x of [-.44,.41]) {
      if(shape==='angled'||shape==='angled-dark') {
        const profile=[[-.5,0],[-.27,0],[.35,seat-.04],[.5,.99],[.42,1],[.28,seat+.04],[-.36,.05],[-.5,.05]];
        prism(profile.map(([y,z])=>[env.y+y*env.d,env.z+z*env.h]),'x',env.x+x*env.w,env.x+(x+.03)*env.w,'side_angled_'+x);
      } else if(shape==='tube') {
        for(const y of [-.45,.39])R([x,y,0],[x,y,seat+.16],.055,'leg_'+x+'_'+y);
        R([x,-.45,seat+.16],[x,.39,seat+.16],.04,'armrest_'+x);
        R([x,.14,seat],[x,.46,1],.045,'back_post_'+x);
      } else if(shape==='ornate') {
        const profile=[[-.5,0],[-.5,seat],[-.24,seat],[-.34,seat+.18],[-.28,seat+.20],[.0,seat+.10],[.2,seat+.15],[.4,1],[.46,1],[.34,.32],[.40,0],[.27,0],[.14,.20],[-.25,.20],[-.37,0]];
        prism(profile.map(([y,z])=>[env.y+y*env.d,env.z+z*env.h]),'x',env.x+x*env.w,env.x+(x+.025)*env.w,'side_ornate_'+x);
        ornament(env.x+(x+(x<0?-.001:.026))*env.w,env.y-.45*env.d,env.z+.06*env.h,.78*env.d,.28*env.h,'side_pattern_'+x,'side');
      } else {
        B(x,-.48,0,.025,.90,backless?seat:seat+.03,'side_panel_'+x);
        ornament(...P([x+(x<0?-.001:.026),-.45,.04]),.80*env.d,(seat-.12)*env.h,'side_pattern_'+x,'side');
        if(!backless)R([x,.13,seat],[x,.45,1],.035,'back_post_'+x);
      }
      R([x,-.48,seat-th-.02],[x,.20,seat-th-.02],.04,'seat_support_'+x);
    }
    if(!backless) {
      const rear=-.48+dep,top=.98;
      const count=shape==='angled-dark'?5:3,upperPanel=['angled','ornate'].includes(shape);
      const zh=upperPanel?.16:.035,end=upperPanel?top-zh:top;
      for(let i=0;i<count;i++){
        const z=seat+.06+i*(end-seat-.09)/count,a=(end-seat-.09)/count-.018;
        const y=rear+(z-seat)/(1-seat)*(.44-rear);
        prism([[y,z],[y+.025,z],[y+.025+.03*a,a+z],[y+.03*a,a+z]],'x',env.x-.44*env.w,env.x+.44*env.w,'wood_back_'+(i+1),railColor);
      }
      if(upperPanel){
        B(-.455,.39,top-zh,.91,.018,zh,'upper_decor_panel');
        if(model.id==='catalog-2026-p1-v2')photoOrnament(...P([-.455,.388,top-zh]),.91*env.w,zh*env.h);
        else ornament(...P([-.40,.388,top-zh+.015]),.80*env.w,(zh-.03)*env.h,'back_pattern');
      }
      if(shape==='ornate'){B(-.45,-.49,seat-.20,.90,.016,.18,'front_decor_panel');ornament(...P([-.40,-.492,seat-.18]),.80*env.w,.14*env.h,'front_pattern');}
    }
  }
  function bin(shape) {
    if(shape==='angled-hood') {
      shell(-.36,-.26,.15,.72,.62,.60,'vessel');
      for(const x of [-.49,.435]){
        prism([[-.5,0],[-.29,0],[.13,.81],[.20,.95],[.12,.98],[-.06,.68],[-.39,.035],[-.5,.035]],'x',x,x+.055,'inclined_support_'+x);
      }
      // Sloped hood, two distinct hanger posts and an open access gap.
      prism([[-.40,.95],[.42,1],[.42,.987],[-.40,.937]],'x',-.5,.5,'canopy');
      for(const x of [-.29,.26])bar([x,.22,.73],[x,.22,.976],.032,'canopy_post_'+x);
      box(-.5,-.5,0,1,.035,.016,'front_foot');box(-.5,.36,0,1,.10,.016,'rear_foot');
    } else if(shape==='hood') {
      shell(-.4,-.41,.06,.8,.82,.66,'vessel');
      for(const x of [-.48,.435])box(x,.31,0,.045,.045,.96,'hood_post_'+x);
      box(-.5,-.5,.94,1,1,.06,'canopy');
      box(-.5,-.5,0,1,1,.025,'base');
      ornament(-.28,-.413,.18,.56,.35,'vessel_pattern');
    } else if(shape==='round-cage') {
      for(let i=0;i<32;i++){
        const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
        face([[.34*Math.cos(a),.34*Math.sin(a),.08],[.34*Math.cos(b),.34*Math.sin(b),.08],[.42*Math.cos(b),.42*Math.sin(b),.63],[.42*Math.cos(a),.42*Math.sin(a),.63]],'vessel_round');
      }
      cage(.97);
    } else if(shape==='cage') {shell(-.36,-.37,.06,.72,.74,.58,'vessel');cage(.99);}
    else if(shape==='arch') {
      const profile=[[-.5,0],[.5,0],[.5,.81]];
      for(let i=0;i<=16;i++){const a=i*Math.PI/16;profile.push([.5*Math.cos(a),.81+.19*Math.sin(a)]);}
      prism(profile,'x',.22,.5,'arched_shell');
      box(-.5,-.5,0,.045,1,.82,'wood_frame');
      for(let i=0;i<7;i++)box(-.44+i*.093,-.49,.08,.074,.04,.64,'wood_insert_'+i,'#b78350');
      box(-.5,.42,0,.73,.08,.84,'rear_body');box(-.5,-.5,0,1,1,.018,'bottom');
      box(-.5,-.5,.80,.70,.35,.023,'opening_front_lip');
    } else if(shape==='wood') {
      shell(-.5,-.5,0,1,1,.89,'body');
      for(let i=0;i<5;i++)box(-.48+i*.105,-.512,.06,.085,.018,.72,'wood_insert_'+i,'#b78350');
      box(.04,-.5,.86,.46,1,.14,'tall_side');
      box(-.5,.44,.89,.55,.06,.11,'rear_rim');
      ornament(.16,-.503,.44,.26,.26,'front_pattern');
    } else {
      shell(-.5,-.5,0,1,1,.81,'body');
      box(-.5,-.5,.79,1,.075,.21,'opening_front');box(-.5,.43,.79,1,.07,.21,'opening_back');
      for(const x of [-.5,.46])box(x,-.425,.79,.04,.855,.21,'opening_side_'+x);
      ornament(-.30,-.502,.20,.6,.34,'front_pattern');
    }
  }
  function cage(top) {
    for(const x of [-.5,.46])for(const y of [-.5,.46])box(x,y,0,.04,.04,top,'cage_post_'+x+'_'+y);
    for(const z of [0,top-.035]){box(-.5,-.5,z,1,.04,.035,'cage_front_'+z);box(-.5,.46,z,1,.04,.035,'cage_rear_'+z);box(-.5,-.46,z,.04,.92,.035,'cage_left_'+z);box(.46,-.46,z,.04,.92,.035,'cage_right_'+z);}
    ornament(-.43,-.501,.08,.86,top-.16,'cage_front_pattern');
    ornament(-.501,-.43,.08,.86,top-.16,'cage_side_pattern','side');
  }
  if(model.kind==='bench') {
    if(model.shape==='kit') {
      bench('angled',{x:-.12,y:0,z:0,w:.72,d:1,h:.70});
      // Catalog set includes three visible components. Envelope W/H/D is for
      // the complete set; part dimensions remain visual proportions only.
      shell(.27,-.25,0,.21,.50,.52,'kit_bin');box(.26,-.26,.69,.24,.52,.03,'kit_bin_canopy');
      bar([.36,.20,.50],[.36,.20,.69],.02,'kit_bin_post');
      bar([-.47,.38,0],[-.47,.38,.98],.035,'kit_light_post');box(-.5,-.18,.97,.06,.60,.03,'kit_light_head');
    } else bench(model.shape);
  } else if(model.kind==='bin')bin(model.shape);
  else if(model.shape==='basket') {shell(-.5,-.5,0,1,1,1,'basket');ornament(-.44,-.501,.1,.88,.8,'basket_pattern');ornament(-.501,-.44,.1,.88,.8,'basket_side_pattern','side');}
  else if(model.shape==='light') {
    box(-.22,-.5,0,.44,1,.035,'base_plate');box(-.045,-.25,.035,.09,.5,.965,'light_post');
    box(-.5,-.5,.94,1,1,.06,'light_head');box(-.48,-.505,.954,.96,.016,.035,'lamp_diffuser','#e5f2e9');
  } else if(model.shape==='grill') {
    shell(-.5,-.5,.65,1,1,.35,'firebox');
    for(const x of [-.43,.37])for(const y of [-.4,.34])box(x,y,0,.06,.06,.66,'grill_leg_'+x+'_'+y);
    for(const x of [-.4,.4])bar([x,-.38,.2],[x,.38,.2],.03,'grill_brace_'+x);
  } else if(model.shape==='fire') {
    const lower=[[-.20,-.20,.27],[.20,-.20,.27],[.20,.20,.27],[-.20,.20,.27]],upper=[[-.5,-.5,1],[.5,-.5,1],[.5,.5,1],[-.5,.5,1]];
    for(let i=0;i<4;i++){const j=(i+1)%4;face([lower[i],lower[j],upper[j],upper[i]],'bowl_wall_'+i);face([upper[i],upper[j],lower[j],lower[i]],'bowl_inside_'+i);}
    face(lower,'bowl_bottom');box(-.25,-.25,.05,.50,.50,.12,'pedestal');box(-.38,-.38,0,.76,.76,.05,'base_plate');
  } else if(model.shape==='swing') {
    for(const x of [-.45,.45])for(const y of [-.47,.47])bar([x,y,0],[x,0,.92],.045,'swing_leg_'+x+'_'+y);
    bar([-.49,0,.93],[.49,0,.93],.055,'top_beam');
    for(const x of [-.29,.29])for(const y of [-.20,.20])bar([x,0,.86],[x,y,.28],.012,'hanger_'+x+'_'+y);
    for(let i=0;i<5;i++)box(-.34,-.26+i*.11,.26,.68,.085,.03,'wood_swing_seat_'+i,'#ad7b50');
    for(let i=0;i<3;i++)box(-.34,.25,.32+i*.07,.68,.028,.052,'wood_swing_back_'+i,'#ad7b50');
    prism([[-.5,.94],[0,1],[.5,.94],[.5,.925],[0,.985],[-.5,.925]],'x',-.5,.5,'roof');
  } else if(model.shape==='gazebo') {
    for(const x of [-.47,.44])for(const y of [-.47,.44])box(x,y,0,.03,.03,.94,'gazebo_post_'+x+'_'+y);
    for(const z of [.02,.9]){bar([-.47,-.47,z],[.47,-.47,z],.035,'front_beam_'+z);bar([-.47,.47,z],[.47,.47,z],.035,'rear_beam_'+z);bar([-.47,-.47,z],[-.47,.47,z],.035,'left_beam_'+z);bar([.47,-.47,z],[.47,.47,z],.035,'right_beam_'+z);}
    prism([[-.5,.94],[0,1],[.5,.94],[.5,.925],[0,.985],[-.5,.925]],'x',-.5,.5,'roof');
    bench('tube',{x:0,y:.29,z:0,w:.85,d:.28,h:.42});
    ornament(-.501,-.35,.10,.7,.64,'gazebo_side_pattern','side');
  }
  // The external envelope must match the requested W/H/D exactly, including
  // sloped feet, curved tops and tube ends. Internal photo proportions remain
  // estimates. Recompute normals after this non-uniform fit.
  const all=faces.flatMap(f=>f.points),lo=[0,1,2].map(i=>Math.min(...all.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...all.map(p=>p[i])));
  const fit=[w,d,h].map((n,i)=>n/(hi[i]-lo[i]));
  for(const f of faces){
    f.points=f.points.map(p=>p.map((n,i)=>(n-lo[i])*fit[i]-(i===2?0:[w,d][i]/2)));
    const norm=f.normal.map((n,i)=>n/fit[i]),length=Math.hypot(...norm);f.normal=norm.map(n=>n/length);
  }
  return {faces,wires,parts,guides,reference:model};
}
