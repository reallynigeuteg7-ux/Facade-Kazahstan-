import { csvExport } from '@/lib/crm/export.mjs';
import {
  db,
  isAdmin,
  noStore,
  sameOrigin,
  atomic,
  backupSnapshot,
} from '@/lib/crm/server';
import { cleanLead, validRequestId } from '@/lib/crm/model.mjs';
import { insertLead } from '@/lib/crm/store';
import { fingerprint, checkApprovable } from '@/lib/crm/approval';
import { generateDrawing, supplementDrawing } from '@/lib/ai/drawing.mjs';
import { readDrawing } from '@/lib/drawings/model.mjs';
import { askAlem } from '@/lib/ai/alem';
import { withDrawing } from '@/lib/crm/specification.mjs';
import quoteReferences from '@/lib/catalog/quote-references.json';
import { clientQuery } from '@/lib/crm/client-query.mjs';
export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  try {
    const params = new URL(request.url).searchParams,
      id = params.get('id');
    if (id) {
      if (!validRequestId(id))
        return noStore({ error: 'Неверная заявка.' }, 400);
      const [notes, history, approval] = await Promise.all([
        db()
          .prepare(
            'SELECT * FROM crm_notes WHERE lead_id=? ORDER BY created_at DESC',
          )
          .bind(id)
          .all(),
        db()
          .prepare(
            'SELECT id,kind,snapshot,created_at FROM crm_events WHERE lead_id=? ORDER BY id DESC LIMIT 100',
          )
          .bind(id)
          .all(),
        db()
          .prepare('SELECT * FROM crm_drawing_approvals WHERE lead_id=?')
          .bind(id)
          .first(),
      ]);
      const lead = await db()
        .prepare('SELECT * FROM crm_leads WHERE id=?')
        .bind(id)
        .first();
      const group =
        lead && typeof lead.order_group === 'string' && lead.order_group
          ? lead.order_group
          : lead?.request_id;
      const positions =
        typeof group === 'string'
          ? await db()
              .prepare(
                'SELECT id,product,stage,amount FROM crm_leads WHERE order_group=? OR request_id=? ORDER BY created_at,id LIMIT 50',
              )
              .bind(group, group)
              .all()
          : { results: [] };
      return noStore({
        notes: notes.results,
        history: history.results,
        approval,
        lead,
        positions: positions.results,
      });
    }
    if (params.get('export') === 'csv') {
      const leads = await db()
        .prepare('SELECT * FROM crm_leads ORDER BY created_at DESC')
        .all();
      return new Response(csvExport(leads.results), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=facade-orders.csv',
          'Cache-Control': 'no-store, private',
        },
      });
    }
    if (params.get('export') === 'backup') {
      const snapshot = await backupSnapshot();
      return new Response(JSON.stringify(snapshot, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="facade-crm-backup.json"',
          'Cache-Control': 'no-store, private',
        },
      });
    }
    const q = (params.get('q') || '').slice(0, 600),
      stage = params.get('stage') || 'all',
      page = Math.max(
        1,
        Math.min(100000, Math.floor(Number(params.get('page')) || 1)),
      ),
      pageSize = 100;
    const conditions: string[] = [],
      args: string[] = [];
    if (q) {
      conditions.push("search_text LIKE ? ESCAPE '!'");
      args.push(
        '%' + q.normalize('NFC').toLowerCase().replace(/[!%_]/g, '!$&') + '%',
      );
    }
    if (stage !== 'all') {
      conditions.push('stage=?');
      args.push(stage);
    } else conditions.push("stage<>'archived'");
    if (params.get('view') === 'tasks')
      conditions.push("next_action<>'' AND stage NOT IN ('done','archived')");
    const where = ' WHERE ' + conditions.join(' AND ');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Qyzylorda',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const clientsView = params.get('view') === 'clients';
    const grouped = clientQuery(where);
    const [rows, total, metrics, aiStatus, stageCounts] = await Promise.all([
      db()
        .prepare(
          clientsView
            ? grouped + ' ORDER BY name,phone_key LIMIT ? OFFSET ?'
            : 'SELECT * FROM crm_leads' +
                where +
                ' ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?',
        )
        .bind(...args, pageSize, (page - 1) * pageSize)
        .all(),
      db()
        .prepare(
          clientsView
            ? 'SELECT COUNT(*) AS total FROM (' + grouped + ')'
            : 'SELECT COUNT(*) AS total FROM crm_leads' + where,
        )
        .bind(...args)
        .first<{ total: number }>(),
      db()
        .prepare(
          "SELECT SUM(CASE WHEN stage NOT IN ('done','archived') THEN 1 ELSE 0 END) active,SUM(CASE WHEN stage NOT IN ('done','archived') THEN amount ELSE 0 END) amount,SUM(CASE WHEN stage='new' THEN 1 ELSE 0 END) newCount,SUM(CASE WHEN stage NOT IN ('done','archived') AND next_action<>'' AND due_date<>'' AND due_date<? THEN 1 ELSE 0 END) overdue,MAX(created_at) latest FROM crm_leads",
        )
        .bind(today)
        .first(),
      db()
        .prepare(
          'SELECT kind,status,duration_ms,created_at FROM crm_ai_events ORDER BY created_at DESC LIMIT 10',
        )
        .all(),
      db()
        .prepare(
          'SELECT stage,COUNT(*) AS total FROM crm_leads' +
            where +
            ' GROUP BY stage',
        )
        .bind(...args)
        .all(),
    ]);
    return noStore({
      leads: clientsView ? [] : rows.results,
      clients: clientsView ? rows.results : [],
      stageCounts: Object.fromEntries(
        stageCounts.results.map((r) => [
          typeof r.stage === 'string' ? r.stage : '',
          Number(r.total),
        ]),
      ),
      total: total!.total,
      page,
      pageSize,
      truncated: false,
      metrics,
      aiStatus: aiStatus.results,
      quoteReferences,
    });
  } catch {
    return noStore(
      { error: 'Не удалось загрузить CRM. Попробуйте обновить страницу.' },
      503,
    );
  }
}
export async function POST(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 18000) throw Error();
    input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw Error();
  } catch {
    return noStore({ error: 'Неверный запрос.' }, 400);
  }
  try {
    if (input.action === 'note') {
      if (
        !validRequestId(input.id) ||
        typeof input.body !== 'string' ||
        !input.body.trim() ||
        input.body.length > 4000
      )
        return noStore({ error: 'Введите заметку до 4000 символов.' }, 400);
      const lead = await db()
        .prepare('SELECT id FROM crm_leads WHERE id=?')
        .bind(input.id)
        .first();
      if (!lead) return noStore({ error: 'Заявка не найдена.' }, 404);
      await db()
        .prepare(
          'INSERT INTO crm_notes(id,lead_id,body,created_at) VALUES(?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          input.id,
          input.body.trim(),
          new Date().toISOString(),
        )
        .run();
      return noStore({ ok: true });
    }
    if (input.action === 'regenerate') {
      if (!validRequestId(input.id) || !Number.isSafeInteger(input.version))
        return noStore({ error: 'Неверная заявка.' }, 400);
      const old = await db()
        .prepare('SELECT * FROM crm_leads WHERE id=?')
        .bind(input.id)
        .first<Record<string, string | number>>();
      if (!old) return noStore({ error: 'Заявка не найдена.' }, 404);
      if (
        old.version !== input.version ||
        ['production', 'done', 'archived'].includes(String(old.stage))
      )
        return noStore(
          { error: 'Заявка изменилась или уже передана в производство.' },
          409,
        );
      const answers = [
        'product',
        'size',
        'quantity',
        'finish',
        'drawing',
        'city',
        'deadline',
        'name',
        'phone',
      ].map((k) => old[k]);
      const spec = await generateDrawing(answers, askAlem);
      if (spec.origin === 'fallback')
        return noStore(
          { error: 'ИИ пока недоступен. Существующий чертёж сохранён.' },
          503,
        );
      const previous = readDrawing(old.drawing_spec);
      const next = withDrawing(
        old,
        previous ? supplementDrawing(previous, spec) : spec,
      );
      const result = await db()
        .prepare(
          'UPDATE crm_leads SET drawing_spec=?,size=?,finish=?,updated_at=?,version=version+1 WHERE id=? AND version=?',
        )
        .bind(
          next.drawing_spec,
          next.size,
          next.finish,
          new Date().toISOString(),
          input.id,
          input.version,
        )
        .run();
      return result.meta.changes
        ? noStore({ ok: true })
        : noStore(
            {
              error:
                'Карточка изменилась во время обработки. Откройте её снова.',
            },
            409,
          );
    }
    let lead;
    try {
      lead = cleanLead(input.lead);
    } catch (e) {
      return noStore({ error: (e as Error).message }, 400);
    }
    if (input.action === 'create') {
      if (!validRequestId(input.requestId))
        return noStore({ error: 'Неверный идентификатор.' }, 400);
      if (['production', 'done'].includes(lead.stage))
        return noStore(
          { error: 'Сначала сохраните и согласуйте заявку.' },
          400,
        );
      return noStore(await insertLead(lead, input.requestId, 'manual'));
    }
    if (
      input.action !== 'update' ||
      !validRequestId(input.id) ||
      !Number.isSafeInteger(input.version)
    )
      return noStore({ error: 'Неверная заявка.' }, 400);
    const old = await db()
      .prepare('SELECT * FROM crm_leads WHERE id=?')
      .bind(input.id)
      .first<Record<string, unknown>>();
    if (!old) return noStore({ error: 'Заявка не найдена.' }, 404);
    if (old.version !== input.version)
      return noStore(
        { error: 'Заявка уже изменена. Откройте карточку снова.' },
        409,
      );
    lead.drawing_spec ??=
      typeof old.drawing_spec === 'string' ? old.drawing_spec : '';
    const hash = fingerprint(lead),
      approval = await db()
        .prepare(
          'SELECT fingerprint FROM crm_drawing_approvals WHERE lead_id=?',
        )
        .bind(input.id)
        .first<{ fingerprint: string }>();
    if (input.approve === true) {
      try {
        checkApprovable(lead);
      } catch (e) {
        return noStore({ error: (e as Error).message }, 400);
      }
    }
    if (
      ['production', 'done'].includes(lead.stage) &&
      input.approve !== true &&
      approval?.fingerprint !== hash
    )
      return noStore(
        {
          error:
            'Сначала подтвердите проверку текущей версии чертежа и параметров заказа.',
        },
        400,
      );
    const statements = [
      {
        sql: 'UPDATE crm_leads SET name=?,phone=?,product=?,size=?,quantity=?,finish=?,drawing=?,city=?,deadline=?,stage=?,amount=?,next_action=?,due_date=?,drawing_spec=?,search_text=?,updated_at=?,version=version+1 WHERE id=? AND version=?',
        args: [
          lead.name,
          lead.phone,
          lead.product,
          lead.size,
          lead.quantity,
          lead.finish,
          lead.drawing,
          lead.city,
          lead.deadline,
          lead.stage,
          lead.amount,
          lead.next_action,
          lead.due_date,
          lead.drawing_spec,
          lead.search_text,
          new Date().toISOString(),
          input.id,
          input.version,
        ],
      },
    ];
    if (input.approve === true)
      statements.push({
        sql: 'INSERT INTO crm_drawing_approvals(lead_id,fingerprint,approved_at) SELECT id,?,? FROM crm_leads WHERE id=? AND version=? AND drawing_spec=? ON CONFLICT(lead_id) DO UPDATE SET fingerprint=excluded.fingerprint,approved_at=excluded.approved_at',
        args: [
          hash,
          new Date().toISOString(),
          input.id,
          input.version + 1,
          lead.drawing_spec,
        ],
      });
    const result = await atomic(statements);
    if (!result[0].rowsAffected)
      return noStore({ error: 'Заявка изменилась. Откройте её снова.' }, 409);
    return noStore({ ok: true });
  } catch {
    return noStore(
      { error: 'Не удалось сохранить изменения. Попробуйте ещё раз.' },
      503,
    );
  }
}
