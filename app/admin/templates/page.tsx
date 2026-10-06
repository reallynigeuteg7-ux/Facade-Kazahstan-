import { isAdmin } from '@/lib/crm/server';
import Login from '../login';
import Templates from './templates';
import '../crm.css';
import './templates.css';
export const dynamic = 'force-dynamic';
export const metadata = {title:'Шаблоны чертежей — Facade Kazakhstan',robots:{index:false,follow:false}};
export default async function TemplatesPage(){return (await isAdmin())?<Templates/>:<Login/>;}
