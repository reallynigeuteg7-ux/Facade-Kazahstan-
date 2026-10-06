import { isAdmin } from '@/lib/crm/server';
import Crm from './workspace';
import Login from './login';
import MailStatus from './mail-status';
import BackupStatus from './backup-status';
import './crm.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'CRM — Facade Kazakhstan',
  robots: { index: false, follow: false },
};
export default async function Admin() {
  return (await isAdmin()) ? <div className="crm-page"><MailStatus /><BackupStatus /><Crm /></div> : <Login />;
}
