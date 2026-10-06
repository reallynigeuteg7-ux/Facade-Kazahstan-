import { db, isAdmin, noStore, sameOrigin } from '@/lib/crm/server';
import { cleanLead, validRequestId } from '@/lib/crm/model.mjs';
import { documentXls } from '@/lib/crm/document-xls.mjs';

export const runtime = 'nodejs';

async function download(id: unknown, kind: unknown, changes?: unknown) {
  if (!validRequestId(id) || !['kp', 'pp'].includes(String(kind)))
    return noStore({ error: 'Неверная заявка или документ.' }, 400);
  try {
    const saved = await db()
      .prepare('SELECT * FROM crm_leads WHERE id=?')
      .bind(String(id))
      .first();
    if (!saved) return noStore({ error: 'Заявка не найдена.' }, 404);
    // Export current form fields without changing the lead, its status or history.
    // Saved document drafts belong to the editor and do not override lead data.
    const lead =
      changes === undefined
        ? saved
        : {
            ...saved,
            ...cleanLead({
              ...saved,
              ...(changes as object),
              drawing_spec: '',
            }),
            id: saved.id,
          };
    return new Response(new Uint8Array(documentXls(lead, String(kind))), {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="Facade-${String(kind)}-${String(id).slice(0, 8)}.xls"`,
        'Cache-Control': 'no-store, private',
        Vary: 'Cookie',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return noStore(
      { error: (e as Error).message || 'Не удалось создать Excel.' },
      400,
    );
  }
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  const p = new URL(request.url).searchParams;
  return download(p.get('id'), p.get('kind'));
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 20000) throw Error();
    input = JSON.parse(raw);
    if (
      !input?.lead ||
      typeof input.lead !== 'object' ||
      Array.isArray(input.lead)
    )
      throw Error();
  } catch {
    return noStore({ error: 'Неверные данные заявки.' }, 400);
  }
  return download(input.id, input.kind, input.lead);
}
