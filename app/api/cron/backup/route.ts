import {backupSnapshot,noStore} from '@/lib/crm/server';
import {createBackup,latestBackup} from '@/lib/crm/backup.mjs';
import {sendMail} from '@/lib/crm/mail.mjs';
export const maxDuration=60;
export async function GET(request:Request){
  if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return noStore({error:'Нет доступа'},403);
  try{
    const previous=await latestBackup();
    if(previous&&Date.now()-Date.parse(previous.exportedAt)<3600000)return noStore({ok:true,repeated:true});
    await createBackup(await backupSnapshot());return noStore({ok:true});
  }catch{
    try{await sendMail({subject:'Не создана резервная копия — Facade Kazahstan',text:'Ежедневная резервная копия CRM не подтверждена. Откройте CRM и повторите создание копии.\nhttps://facade-kazahstan.vercel.app/admin'})}catch{}
    return noStore({error:'Backup failed'},503);
  }
}
