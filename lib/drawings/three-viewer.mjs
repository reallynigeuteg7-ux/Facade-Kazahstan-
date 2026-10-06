import * as THREE from 'three';
import {faceTriangles} from './solid.mjs';
import {catalogGeometry} from './catalog-geometry.mjs';
function woodTexture(color){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,128);
 for(let i=0;i<170;i++){const yy=i*128/170;ctx.beginPath();for(let x=0;x<=512;x+=5){const y=yy+Math.sin(x*.013+i)*.7+Math.sin(x*.037+i*2.4)*.3;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=i%4?'rgba(65,35,18,.24)':'rgba(247,208,150,.3)';ctx.lineWidth=i%3?.45:1.1;ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createThreeViewer(container,spec){
 const model=catalogGeometry(spec),scene=new THREE.Scene();scene.background=new THREE.Color('#f3f3ef');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Объёмная модель с геометрическими прорезями');
 const group=new THREE.Group(),resources=[];scene.add(group);
 const materials=new Map(),batches=new Map();
 for(const f of model.faces){
  const wood=f.name.startsWith('wood_'),key=f.color+(wood?'-wood':'');
  if(!batches.has(key))batches.set(key,{positions:[],normals:[],uvs:[],wood,color:f.color});
  const batch=batches.get(key);
  for(const polygon of faceTriangles(f))for(let j=1;j<polygon.length-1;j++){
   const triangle=[polygon[0],polygon[j],polygon[j+1]];
   for(const p of triangle){batch.positions.push(...p);batch.normals.push(...f.normal);batch.uvs.push(p[0]/600,(p[1]+p[2])/90);}
  }
 }
 for(const [key,b]of batches){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));
  const texture=b.wood?woodTexture(b.color):null;if(texture)resources.push(texture);
  const material=new THREE.MeshStandardMaterial({color:b.wood?'#ffffff':b.color,map:texture,metalness:b.wood?0:.36,roughness:b.wood?.75:.48,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);resources.push(geometry,material);
  const edges=new THREE.EdgesGeometry(geometry,35),edgeMaterial=new THREE.LineBasicMaterial({color:'#20262a',transparent:true,opacity:.34});group.add(new THREE.LineSegments(edges,edgeMaterial));resources.push(edges,edgeMaterial);
 }
 const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);
 scene.add(new THREE.HemisphereLight('#f1f5ff','#877566',2.2));
 const light=new THREE.DirectionalLight('#fff8eb',3.1);light.position.set(center.x-span,center.y-span*1.4,center.z+span*2);light.target.position.copy(center);scene.add(light,light.target);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:1,far:span*8});light.shadow.bias=-.00004;light.shadow.normalBias=1;
 const fill=new THREE.DirectionalLight('#c8ddff',1.1);fill.position.set(span,span,span);scene.add(fill);
 const groundG=new THREE.PlaneGeometry(span*8,span*8),groundM=new THREE.ShadowMaterial({color:'#737d7e',opacity:.22}),ground=new THREE.Mesh(groundG,groundM);ground.position.set(center.x,center.y,box.min.z-1);ground.receiveShadow=true;scene.add(ground);resources.push(groundG,groundM);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,span*20);camera.up.set(0,0,1);
 const dimensionGroup=new THREE.Group();scene.add(dimensionGroup);
 const lineMaterial=new THREE.LineBasicMaterial({color:'#53626c'});resources.push(lineMaterial);
 function dimension(a,b,label){
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);dimensionGroup.add(new THREE.Line(geo,lineMaterial));resources.push(geo);
  const c=document.createElement('canvas');c.width=512;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='rgba(243,243,239,.90)';ctx.fillRect(0,0,512,80);ctx.fillStyle='#263741';ctx.font='38px Arial';ctx.textAlign='center';ctx.fillText(label,256,54);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.SpriteMaterial({map:tex,depthTest:false,toneMapped:false}),sprite=new THREE.Sprite(mat);sprite.renderOrder=1000;sprite.position.set(...a.map((v,i)=>(v+b[i])/2));sprite.scale.set(span*.21,span*.033,1);dimensionGroup.add(sprite);resources.push(tex,mat);
 }
 const dims=spec.dimensions,W=dims.width,D=dims.depth,H=dims.height,offset=span*.075;
 dimension([-W/2,-D/2-offset,0],[W/2,-D/2-offset,0],`${W} мм`);dimension([W/2+offset,-D/2,0],[W/2+offset,D/2,0],`${D} мм`);dimension([-W/2-offset,-D/2,0],[-W/2-offset,-D/2,H],`${H} мм`);
 let state={yaw:35,elevation:25,zoom:1,dimensions:true};
 function update(next=state){
  state=next;const width=Math.max(200,container.clientWidth),height=Math.max(260,container.clientHeight),aspect=width/height;
  renderer.setSize(width,height,false);const y=state.yaw*Math.PI/180,e=state.elevation*Math.PI/180;
  camera.position.set(center.x+span*4*Math.sin(y)*Math.cos(e),center.y-span*4*Math.cos(y)*Math.cos(e),center.z+span*4*Math.sin(e));camera.lookAt(center);
  camera.updateMatrixWorld();let maxX=0,maxY=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}
  const margin=state.dimensions?span*.11:span*.035,extent=Math.max(maxY+margin,(maxX+margin)/aspect)/(state.zoom||1);camera.left=-extent*aspect;camera.right=extent*aspect;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();dimensionGroup.visible=state.dimensions;renderer.render(scene,camera);
 }
 const observer=new ResizeObserver(()=>update());observer.observe(container);update();
 return {update,snapshot:()=>renderer.domElement.toDataURL('image/png'),dispose:()=>{observer.disconnect();resources.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();}};
}
