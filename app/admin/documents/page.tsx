import { isAdmin } from '@/lib/crm/server';
import Login from '../login';
import Documents from './documents';
import './documents.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'ПП и КП — Facade Kazakhstan',
  robots: { index: false, follow: false },
};
export default async function Page() {
  return (await isAdmin()) ? <Documents /> : <Login />;
}
