import { db, noStore, sameOrigin } from '@/lib/crm/server';
import { attemptKey, makeSession, validPassword } from '@/lib/crm/session';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  let password: string;
  try {
    const raw = await request.text();
    if (raw.length > 1000) throw Error();
    password = JSON.parse(raw).password;
    if (typeof password !== 'string' || password.length > 256) throw Error();
  } catch {
    return noStore({ error: 'Введите пароль.' }, 400);
  }
  try {
    const now = Date.now(),
      key = attemptKey(
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local',
      );
    await db()
      .prepare(
        'INSERT INTO crm_login_attempts (id,started_at,attempts) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN started_at<? THEN 1 ELSE attempts+1 END,started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END',
      )
      .bind(key, now, now - 600000, now - 600000)
      .run();
    const record = await db()
      .prepare('SELECT attempts FROM crm_login_attempts WHERE id=?')
      .bind(key)
      .first<{ attempts: number }>();
    if (record!.attempts > 10)
      return noStore(
        { error: 'Слишком много попыток. Повторите через 10 минут.' },
        429,
      );
    if (!(await validPassword(password)))
      return noStore({ error: 'Неверный пароль.' }, 401);
    const response = noStore({ ok: true });
    response.headers.set(
      'Set-Cookie',
      `facade_admin=${makeSession()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${process.env.VERCEL ? ' ; Secure' : ''}`,
    );
    return response;
  } catch {
    return noStore({ error: 'Не удалось войти. Попробуйте позже.' }, 503);
  }
}
