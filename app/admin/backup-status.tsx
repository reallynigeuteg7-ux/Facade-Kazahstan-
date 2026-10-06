'use client';
import {useEffect,useState} from 'react';
type Backup={exportedAt:string;verifiedAt:string};
export default function BackupStatus(){
  const [latest,setLatest]=useState<Backup|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  async function request(method='GET'){
    setBusy(true);setError('');try{const r=await fetch('/api/crm/backup',{method,cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setLatest(d.latest);setLoaded(true)}catch(e){setError(e instanceof Error?e.message:'Ошибка копирования')}finally{setBusy(false)}
  }
  useEffect(()=>{void request()},[]);
  const stale=latest&&Date.now()-Date.parse(latest.exportedAt)>36*3600000;
  return <section className="crm-status-bar crm-backup-status" aria-label="Резервные копии"><span role="status">{error||(!loaded?'Проверяю резервные копии…':latest?`Копия: ${new Date(latest.exportedAt).toLocaleString('ru-RU',{timeZone:'Asia/Qyzylorda'})} (Кызылорда)${stale?' — устарела':''}`:'Резервных копий пока нет')}</span><button disabled={busy} onClick={()=>request('POST')}>{busy?'Проверяю…':'Создать копию сейчас'}</button>{latest&&<a href="/api/crm/backup?download=1">Скачать последнюю копию</a>}<small>Ежедневно утром · закрытое хранилище · старые копии сохраняются</small></section>;
}
