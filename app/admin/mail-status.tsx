'use client';
import {useCallback,useEffect,useState} from 'react';
export default function MailStatus(){
  const [status,setStatus]=useState('Проверяю почтовые уведомления…'),[busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{
    const r=await fetch('/api/crm/mail',{cache:'no-store'});if(!r.ok)throw Error('Статус почты недоступен');
    const d=await r.json();const pending=d.queue.filter((q:{state:string})=>q.state!=='sent').reduce((n:number,q:{count:number})=>n+Number(q.count),0);
    setStatus(d.configured?`Почта настроена · ожидают отправки: ${pending}`:'Почта ещё не настроена');
  },[]);
  useEffect(()=>{refresh().catch(e=>setStatus(e.message));const timer=setInterval(()=>refresh().catch(()=>{}),60000);return()=>clearInterval(timer)},[refresh]);
  async function run(action:string){setBusy(true);try{const r=await fetch('/api/crm/mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const d=await r.json();if(!r.ok)throw Error(d.error);setStatus(action==='test'?'Проверочное письмо принято почтовым сервером':`Отправлено: ${d.sent}, не подтверждено: ${d.failed}`)}catch(e){setStatus(e instanceof Error?e.message:'Ошибка отправки')}finally{setBusy(false)}}
  return <div className="crm-status-bar crm-mail-status" role="region" aria-label="Почтовые уведомления"><span role="status">{status}</span><button disabled={busy} onClick={()=>run('test')}>Проверить почту</button><button disabled={busy} onClick={()=>run('retry')}>Повторить отправку заявок</button></div>;
}
