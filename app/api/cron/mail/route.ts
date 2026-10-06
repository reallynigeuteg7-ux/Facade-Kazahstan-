import { client,noStore } from '@/lib/crm/server';
import { drainMail,mailConfig } from '@/lib/crm/mail.mjs';
export const maxDuration=60;
export async function GET(request:Request) {
  if(!process.env.CRON_SECRET || request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return noStore({error:'Нет доступа'},403);
  if(!mailConfig())return noStore({error:'SMTP ещё не настроен'},503);
  return noStore(await drainMail(client(),undefined,3));
}
