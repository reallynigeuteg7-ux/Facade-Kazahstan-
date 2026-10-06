import { db, isAdmin, noStore, sameOrigin } from '@/lib/crm/server';
import { validRequestId } from '@/lib/crm/model.mjs';
import { ensureVisual, getVisual, visualConfigured } from '@/lib/ai/visual';

export const maxDuration = 120;

type VisualLead = {
  id: string;
  product: string;
  size: string;
  finish: string;
  drawing: string;
  drawing_spec: string;
};

async function loadLead(id: string) {
  return db()
    .prepare('SELECT id,product,size,finish,drawing,drawing_spec FROM crm_leads WHERE id=?')
    .bind(id)
    .first<VisualLead>();
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (!validRequestId(id)) return noStore({ error: 'Неверная заявка.' }, 400);
  try {
    const lead = await loadLead(id);
    if (!lead) return noStore({ error: 'Заявка не найдена.' }, 404);
    if (params.get('status') === '1' && !visualConfigured())
      return noStore({ ready: false, configured: false });
    const visual = await getVisual(lead);
    if (params.get('status') === '1') {
      if (visual?.statusCode === 200) await visual.stream.cancel();
      return noStore({ ready: visual?.statusCode === 200, configured: visualConfigured() });
    }
    if (visual?.statusCode !== 200) return noStore({ error: 'Визуальный эскиз ещё не создан.' }, 404);
    return new Response(visual.stream, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, private',
        Vary: 'Cookie',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="facade-visual-${id}.png"`,
      },
    });
  } catch {
    return noStore({ error: 'Не удалось загрузить визуальный эскиз.' }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  if (!visualConfigured())
    return noStore({ error: 'Добавьте OPENAI_API_KEY в Production-переменные Vercel.' }, 503);
  let id: string;
  try {
    const input = await request.json();
    id = input.id;
    if (!validRequestId(id)) throw Error('Неверная заявка.');
  } catch {
    return noStore({ error: 'Неверная заявка.' }, 400);
  }
  try {
    const lead = await loadLead(id);
    if (!lead) return noStore({ error: 'Заявка не найдена.' }, 404);
    await ensureVisual(lead, new URL(request.url).origin);
    return noStore({ ready: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return noStore({ error: message.startsWith('OpenAI') ? message : 'Не удалось создать эскиз. Повторите попытку.' }, 503);
  }
}
