'use client';
import {useState} from 'react';
import Link from 'next/link';
import DrawingPanel, {type DrawingSpec} from '../../drawing-panel';
import {catalogModels,catalogModelById} from '@/lib/drawings/catalog.mjs';
import {initialDrawing} from '@/lib/drawings/model.mjs';
import '../../drawing.css';
export default function Templates(){
 const [selected,setSelected]=useState(1);
 const model=catalogModels[selected-1];
 const fixture=(page:number)=>{
  const item=catalogModels[page-1],known=item.known;
  const spec=initialDrawing(item.name+` (PDF-${String(page).padStart(2,'0')})`);
  return {...spec,dimensions:{...spec.dimensions,width:known.width??500,height:known.height??800,depth:known.depth??400},notes:item.blueprint?'Проверка шаблона. Исходные размеры заказчика.':'Проверка прежней модели. Недостающие размеры тестовые.'} as DrawingSpec;
 };
 const [spec,setSpec]=useState<DrawingSpec>(()=>fixture(1));
 return <main className="templates-page">
  <header><div><Link href="/admin">← Заявки CRM</Link><p>FACADE KAZAKHSTAN / ШАБЛОНЫ</p><h1>Чертежи товаров</h1><span>22 шаблона по твоим листам · все товары каталога</span></div></header>
  <p className="templates-note">Выбери товар и измени размеры для проверки. Здесь можно сравнить оригинал, виды и 3D, скачать SVG, OBJ и сохранить PDF. Проверка в библиотеке не создаёт заказ.</p>
  <div className="templates-layout"><nav aria-label="Товары каталога">{catalogModels.map((item)=><button type="button" aria-pressed={selected===item.page} key={item.id} onClick={()=>{setSelected(item.page);setSpec(fixture(item.page));}}><img src={item.blueprint?.preview||item.image} alt="" loading="lazy"/><span><strong>{String(item.page).padStart(2,'0')} · {item.name}</strong><small>{item.blueprint?`Изображение ${item.blueprint.attachment} · шаблон`:'Прежняя модель · тестовые размеры'}</small></span></button>)}</nav>
  <section className="templates-detail"><h2>{model.name}</h2><DrawingPanel key={model.id} spec={spec} onChange={(next)=>{setSpec(next);const chosen=catalogModelById(next.catalogModel);if(chosen)setSelected(chosen.page);}} product={model.name} reference={`ШАБЛОН-${String(selected).padStart(2,'0')}`} /></section></div>
 </main>;
}
