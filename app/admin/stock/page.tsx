import { isAdmin } from '@/lib/crm/server';
import Login from '../login';
import Stock from './stock';
import '../crm.css';
import './stock.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Склад материалов — Facade Kazakhstan',
  robots: { index: false, follow: false },
};
export default async function StockPage() {
  return (await isAdmin()) ? <Stock /> : <Login />;
}
