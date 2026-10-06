import { client, isAdmin, noStore, sameOrigin } from '@/lib/crm/server';
import { drainMail, mailConfig, sendMail } from '@/lib/crm/mail.mjs';
export const maxDuration = 60;
export async function GET() {
  if (!(await isAdmin())) return noStore({error:'Нет доступа'},403);
  const queue = await client().execute('SELECT state,COUNT(*) count FROM crm_email_notifications GROUP BY state');
  return noStore({configured:!!mailConfig(),queue:queue.rows});
}
export async function POST(request:Request) {
  if (!(await isAdmin()) || !sameOrigin(request))return noStore({error:'Нет доступа'},403);
  if (!mailConfig())return noStore({error:'SMTP ещё не настроен'},503);
  try {
    const input = await request.json();
    if(input.action==='test') {
      await sendMail({subject:'Проверка почты — Facade Kazahstan',text:'SMTP работает. Новые заявки с сайта будут приходить на этот адрес.\nCRM: https://facade-kazahstan.vercel.app/admin'});
      return noStore({accepted:true});
    }
    if(input.action!=='retry')return noStore({error:'Неизвестное действие'},400);
    return noStore(await drainMail(client()));
  }catch{return noStore({error:'SMTP не подтвердил отправку. Проверьте настройки почты.'},503);}
}
