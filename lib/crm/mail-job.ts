import { after } from 'next/server';
import { client } from './server';
import { drainMail, mailConfig } from './mail.mjs';
export function scheduleMail() {
  if (!mailConfig()) return;
  after(async () => {
    try { await drainMail(client()); }
    catch { console.error('CRM email queue unavailable'); }
  });
}
