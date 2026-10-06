import {backupSnapshot,isAdmin,noStore,sameOrigin} from '@/lib/crm/server';
import {createBackup,latestBackup,downloadLatestBackup} from '@/lib/crm/backup.mjs';
export const maxDuration=60;
export async function GET(request:Request){
  if(!(await isAdmin()))return noStore({error:'Нет доступа'},403);
  try{
    if(new URL(request.url).searchParams.get('download')==='1')return new Response(await downloadLatestBackup(),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="facade-crm-backup.json"','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
    return noStore({latest:await latestBackup()});
  }catch{return noStore({error:'Не удалось прочитать резервные копии. Проверьте хранилище.'},503)}
}
export async function POST(request:Request){
  if(!(await isAdmin())||!sameOrigin(request))return noStore({error:'Нет доступа'},403);
  try{return noStore({latest:await createBackup(await backupSnapshot())})}
  catch{return noStore({error:'Резервная копия не подтверждена. Повторите попытку.'},503)}
}
