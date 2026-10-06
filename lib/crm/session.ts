import { createHmac, timingSafeEqual, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
function sign(value: string) {
  const secret = process.env.CRM_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('Authentication not configured');
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function makeSession() {
  const expires = String(Math.floor(Date.now() / 1000) + 8 * 60 * 60);
  return expires + '.' + sign(expires);
}
export function validSession(value?: string) {
  try {
    if (!value || value.length > 200) return false;
    const [expires, signature, ...extra] = value.split('.');
    if (
      extra.length ||
      !/^\d{10}$/.test(expires) ||
      !signature ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      return false;
    const remaining = Number(expires) - Date.now() / 1000;
    if (remaining <= 0 || remaining > 8 * 60 * 60 + 10) return false;
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(sign(expires), 'hex'),
    );
  } catch {
    return false;
  }
}
export async function validPassword(password: string) {
  const configured = process.env.CRM_PASSWORD_HASH;
  if (!configured) return false;
  const [salt, hash] = configured.split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
export function attemptKey(ip: string) {
  return sign('login:' + ip);
}
