import { noStore, sameOrigin } from '@/lib/crm/server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  const response = noStore({ ok: true });
  response.headers.set(
    'Set-Cookie',
    'facade_admin=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0',
  );
  return response;
}
