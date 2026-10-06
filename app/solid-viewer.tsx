'use client';
import {useEffect,useRef,useState} from 'react';
import type {DrawingSpec} from './drawing-panel';
type Camera={yaw:number;elevation:number;zoom:number;dimensions:boolean};
export default function SolidViewer({spec,camera,fallback}:{spec:DrawingSpec;camera:Camera;fallback:string}){
 const host=useRef<HTMLDivElement>(null),viewer=useRef<{update:(c:Camera)=>void;dispose:()=>void}|null>(null),latest=useRef(camera),[failed,setFailed]=useState(false);latest.current=camera;
 useEffect(()=>{let cancelled=false;setFailed(false);import('@/lib/drawings/three-viewer.mjs').then(({createThreeViewer})=>{if(cancelled||!host.current)return;try{viewer.current=createThreeViewer(host.current,spec);viewer.current?.update(latest.current);}catch{setFailed(true);}}).catch(()=>{if(!cancelled)setFailed(true);});return()=>{cancelled=true;viewer.current?.dispose();viewer.current=null;};},[spec]);
 useEffect(()=>{viewer.current?.update(camera);},[camera]);
 return failed?<img src={fallback} alt="Объёмная модель — запасной вид SVG"/>:<div className="drawing-solid-viewer" ref={host} style={{width:'100%',height:'min(68vh, 740px)',minHeight:320}}/>;
}
