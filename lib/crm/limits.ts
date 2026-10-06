import { db, noStore } from './server';
import { attemptKey } from './session';
export async function limitPublic(
  request: Request,
  scope: string,
  max: number,
  windowMs = 600000,
) {
  const now = Date.now(),
    window = Math.floor(now / windowMs) * windowMs;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const id = attemptKey('public:' + scope + ':' + ip);
  await db()
    .prepare(
      'INSERT INTO crm_rate_limits(id,window_start,hits) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET window_start=excluded.window_start,hits=CASE WHEN window_start=excluded.window_start THEN hits+1 ELSE 1 END',
    )
    .bind(id, window)
    .run();
  const row = await db()
    .prepare('SELECT hits FROM crm_rate_limits WHERE id=?')
    .bind(id)
    .first<{ hits: number }>();
  if (row!.hits <= max) return null;
  const response = noStore(
    {
      error: 'Слишком много запросов. Повторите через несколько минут.',
      code: 'rate_limit',
    },
    429,
  );
  response.headers.set(
    'Retry-After',
    String(Math.ceil((window + windowMs - now) / 1000)),
  );
  return response;
}
