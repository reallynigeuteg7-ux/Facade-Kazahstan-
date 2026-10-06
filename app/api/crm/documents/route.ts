import { db, isAdmin, noStore, sameOrigin } from '@/lib/crm/server';
import { validRequestId } from '@/lib/crm/model.mjs';
import {
  cleanDocument,
  documentDefaults,
  documentHtml,
} from '@/lib/crm/documents.mjs';
import { documentXlsx } from '@/lib/crm/document-xlsx.mjs';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  const p = new URL(request.url).searchParams,
    id = p.get('id');
  if (!validRequestId(id)) return noStore({ error: 'Неверная заявка.' }, 400);
  try {
    const lead = await db()
      .prepare('SELECT * FROM crm_leads WHERE id=?')
      .bind(id!)
      .first();
    if (!lead) return noStore({ error: 'Заявка не найдена.' }, 404);
    const saved = await db()
      .prepare('SELECT * FROM crm_document_drafts WHERE lead_id=?')
      .bind(id!)
      .first();
    const group = String(lead.order_group || lead.request_id);
    const { results: positions } = await db()
      .prepare(
        'SELECT * FROM crm_leads WHERE order_group=? OR request_id=? ORDER BY created_at,id LIMIT 100',
      )
      .bind(group, group)
      .all();
    const document = saved
      ? JSON.parse(String(saved.body))
      : documentDefaults(lead, positions.length ? positions : [lead]);
    const format = p.get('format');
    if (!format)
      return noStore({
        document,
        version: saved?.version ?? 0,
        updatedAt: saved?.updated_at ?? '',
        leadVersion: lead.version,
      });
    const kind = p.get('kind');
    if (
      !['pp', 'kp'].includes(kind || '') ||
      !['html', 'xlsx'].includes(format)
    )
      return noStore({ error: 'Неизвестный формат документа.' }, 400);
    const complete = cleanDocument(document, true);
    const headers = {
      'Cache-Control': 'no-store, private',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    };
    if (format === 'html')
      return new Response(documentHtml(complete, kind), {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      });
    return new Response(documentXlsx(complete, kind), {
      headers: {
        ...headers,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Facade-${kind}-${id!.slice(0, 8)}.xlsx"`,
      },
    });
  } catch (e) {
    return noStore(
      { error: (e as Error).message || 'Не удалось создать документ.' },
      400,
    );
  }
}
export async function POST(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 200000) throw Error();
    input = JSON.parse(raw);
  } catch {
    return noStore({ error: 'Неверный запрос.' }, 400);
  }
  if (
    !validRequestId(input?.id) ||
    !Number.isSafeInteger(input?.version) ||
    input.version < 0
  )
    return noStore({ error: 'Неверная заявка.' }, 400);
  try {
    const document = cleanDocument(input.document);
    const lead = await db()
      .prepare('SELECT id FROM crm_leads WHERE id=?')
      .bind(input.id)
      .first();
    if (!lead) return noStore({ error: 'Заявка не найдена.' }, 404);
    const timestamp = new Date().toISOString();
    const result =
      input.version === 0
        ? await db()
            .prepare(
              'INSERT INTO crm_document_drafts(lead_id,body,version,updated_at) VALUES(?,?,1,?) ON CONFLICT(lead_id) DO NOTHING',
            )
            .bind(input.id, JSON.stringify(document), timestamp)
            .run()
        : await db()
            .prepare(
              'UPDATE crm_document_drafts SET body=?,version=version+1,updated_at=? WHERE lead_id=? AND version=?',
            )
            .bind(JSON.stringify(document), timestamp, input.id, input.version)
            .run();
    return result.meta.changes
      ? noStore({ document, version: input.version + 1, updatedAt: timestamp })
      : noStore(
          { error: 'Расчёт уже изменён в другой вкладке. Обновите страницу.' },
          409,
        );
  } catch (e) {
    return noStore(
      { error: (e as Error).message || 'Не удалось сохранить расчёт.' },
      400,
    );
  }
}
