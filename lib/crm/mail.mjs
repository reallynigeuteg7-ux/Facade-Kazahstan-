import nodemailer from 'nodemailer';

export function mailConfig(env = process.env) {
  const user = env.SMTP_USER?.trim();
  // Accept the existing secret name without requiring the owner to re-enter it.
  const pass = (env.SMTP_PASSWORD || env.SMTP_RASSWORD)?.replace(/\s/g, '');
  const to = env.CRM_NOTIFICATION_EMAIL?.trim();
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT || 465);
  if (!user || !pass || !to || !host) return null;
  if (![465, 587].includes(port) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw Error('SMTP configuration invalid');
  return {user, pass, to, host, port};
}
export function leadMessage(lead) {
  const fields = [['Имя','name'],['Телефон','phone'],['Изделие','product'],['Размеры','size'],['Количество','quantity'],['Материал и покрытие','finish'],['Конструкция','drawing'],['Город и доставка','city'],['Срок','deadline']];
  return {
    subject: `Новая заявка ${String(lead.id).slice(0,8).toUpperCase()} — Facade Kazahstan`,
    text: fields.map(([label,key]) => `${label}: ${lead[key] || 'Не указано'}`).join('\n') + '\n\nКарточка и актуальный чертёж:\nhttps://facade-kazahstan.vercel.app/admin?lead=' + encodeURIComponent(lead.id),
    messageId: `<facade-lead-${lead.id}@facade-kazahstan.vercel.app>`,
  };
}
export async function sendMail(message, env = process.env) {
  const config = mailConfig(env);
  if (!config) throw Error('SMTP not configured');
  const transport = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    requireTLS: true, auth: {user: config.user, pass: config.pass},
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
    tls: {minVersion:'TLSv1.2'}, disableFileAccess:true, disableUrlAccess:true,
  });
  try {
    const result = await transport.sendMail({...message, from:{name:'Facade Kazahstan',address:config.user},to:config.to});
    if (!result.accepted?.length) throw Error('SMTP recipient rejected');
    return {accepted:true};
  } finally { transport.close(); }
}
export async function drainMail(client, send = sendMail, limit = 2) {
  let sent = 0, failed = 0;
  for(let i=0;i<limit;i++) {
    const now=Date.now();
    const claim=await client.execute({sql:"UPDATE crm_email_notifications SET state='sending',retry_at=?,attempts=attempts+1 WHERE lead_id=(SELECT lead_id FROM crm_email_notifications WHERE state<>'sent' AND retry_at<=? ORDER BY retry_at,lead_id LIMIT 1) RETURNING lead_id,attempts",args:[now+120000,now]});
    const item=claim.rows[0]; if(!item)break;
    try {
      const lead=(await client.execute({sql:'SELECT * FROM crm_leads WHERE id=?',args:[item.lead_id]})).rows[0];
      await send(leadMessage(lead));
      await client.execute({sql:"UPDATE crm_email_notifications SET state='sent',sent_at=?,last_error='' WHERE lead_id=?",args:[new Date().toISOString(),item.lead_id]}); sent++;
    } catch {
      await client.execute({sql:"UPDATE crm_email_notifications SET state='pending',retry_at=?,last_error='SMTP: отправка не подтверждена' WHERE lead_id=?",args:[Date.now()+Math.min(3600000,60000*2**Math.min(Number(item.attempts),6)),item.lead_id]}); failed++;
    }
  }
  return {sent,failed};
}
