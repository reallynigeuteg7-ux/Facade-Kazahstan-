import { db, isAdmin, noStore } from '@/lib/crm/server';
import { validRequestId } from '@/lib/crm/model.mjs';
import { readDrawing } from '@/lib/drawings/model.mjs';
import { renderDrawing } from '@/lib/drawings/render.mjs';
export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const revision = params.get('revision');
  if (!validRequestId(id)) return noStore({ error: 'Неверная заявка.' }, 400);
  if (revision && !/^[1-9]\d{0,14}$/.test(revision))
    return noStore({ error: 'Неверная версия.' }, 400);
  try {
    let lead = await db()
      .prepare('SELECT product,drawing_spec FROM crm_leads WHERE id=?')
      .bind(id)
      .first<{ product: string; drawing_spec: string }>();
    if (revision) {
      const event = await db()
        .prepare('SELECT snapshot FROM crm_events WHERE lead_id=? AND id=?')
        .bind(id, Number(revision))
        .first<{ snapshot: string }>();
      if (!event) return noStore({ error: 'Версия не найдена.' }, 404);
      lead = JSON.parse(event.snapshot);
    }
    const spec = lead && readDrawing(lead.drawing_spec);
    if (!lead || !spec) return noStore({ error: 'Чертёж ещё не создан.' }, 404);
    return new Response(
      renderDrawing(spec, lead.product, id!.slice(0, 8).toUpperCase()),
      {
        headers: {
          'Content-Type': 'image/svg+xml;charset=utf-8',
          'Content-Disposition': `attachment; filename="facade-drawing-${id}${revision ? '-revision-' + revision : ''}.svg"`,
          'Cache-Control': 'no-store, private',
          Vary: 'Cookie',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy':
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
      },
    );
  } catch {
    return noStore({ error: 'Не удалось загрузить чертёж.' }, 503);
  }
}
