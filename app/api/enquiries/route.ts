import { limitPublic } from '@/lib/crm/limits';
import { withDrawing } from '@/lib/crm/specification.mjs';
import { db, noStore, sameOrigin } from '@/lib/crm/server';
import { fromAnswers, validRequestId } from '@/lib/crm/model.mjs';
import { saveChatLead } from '@/lib/crm/store';
import { readDrawing } from '@/lib/drawings/model.mjs';
import { generateDrawing } from '@/lib/ai/drawing.mjs';
import { askAlem } from '@/lib/ai/alem';
import { after } from 'next/server';
import { ensureVisual, visualConfigured } from '@/lib/ai/visual';
export const maxDuration = 120;
const fields = [
  'name',
  'phone',
  'product',
  'size',
  'quantity',
  'finish',
  'drawing',
  'city',
  'deadline',
];
export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({ error: 'Запрос отклонён.' }, 403);
  let input, lead;
  try {
    const raw = await request.text();
    if (raw.length > 16000) throw new Error('Слишком большой запрос.');
    input = JSON.parse(raw);
    if (!validRequestId(input.requestId) || input.consent !== true)
      throw new Error('Подтвердите передачу заявки менеджеру.');
    lead = fromAnswers(input.answers, input.drawingSpec);
    input.orderGroup ??= input.requestId;
    if (!validRequestId(input.orderGroup))
      throw Error('Неверный номер заказа.');
  } catch (e) {
    return noStore({ error: (e as Error).message || 'Проверьте ответы.' }, 400);
  }
  try {
    const limited = await limitPublic(request, 'enquiries', 30);
    if (limited) return limited;
    if (input.orderGroup !== input.requestId) {
      const parent = await db()
        .prepare(
          "SELECT phone FROM crm_leads WHERE request_id=? AND source='chat'",
        )
        .bind(input.orderGroup)
        .first<{ phone: string }>();
      if (
        !parent ||
        parent.phone.replace(/\D/g, '') !== lead.phone.replace(/\D/g, '')
      )
        return noStore({ error: 'Не удалось связать позиции заказа.' }, 400);
      const positions = await db()
        .prepare(
          'SELECT COUNT(*) AS n FROM crm_leads WHERE order_group=? AND request_id<>?',
        )
        .bind(input.orderGroup, input.requestId)
        .first<{ n: number }>();
      if (positions && positions.n >= 20)
        return noStore(
          {
            error:
              'В одном заказе — до 20 позиций. Для остальных начните новый заказ.',
          },
          400,
        );
    }
    if (input.prepareDrawing === true) {
      const existing = await db()
        .prepare('SELECT * FROM crm_leads WHERE request_id=?')
        .bind(input.requestId)
        .first<Record<string, string | number>>();
      const oldSpec = existing && readDrawing(existing.drawing_spec);
      if (existing && oldSpec && fields.every((k) => existing[k] === lead[k])) {
        if (oldSpec.origin !== 'pending' || existing.stage !== 'new')
          return noStore({ id: existing.id, drawingSpec: oldSpec }, 201);
        if (Date.now() - Date.parse(String(existing.updated_at)) < 30000)
          return noStore({ id: existing.id, pending: true }, 202);
      }
      // Persist the enquiry before the upstream call. A model outage must not lose a lead.
      const baseline = { ...JSON.parse(lead.drawing_spec), origin: 'pending' };
      lead.drawing_spec = JSON.stringify(baseline);
      const saved = await saveChatLead(
        lead,
        input.requestId,
        input.answers,
        input.orderGroup,
      );
      const snapshot = await db()
        .prepare('SELECT version FROM crm_leads WHERE id=?')
        .bind(saved.id)
        .first<{ version: number }>();
      const generated = await generateDrawing(input.answers, askAlem);
      const normalized = withDrawing(lead, generated);
      // Protect edits made by the manager while the model was thinking.
      await db()
        .prepare(
          "UPDATE crm_leads SET drawing_spec=?,size=?,finish=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND stage='new'",
        )
        .bind(
          JSON.stringify(generated),
          normalized.size,
          normalized.finish,
          new Date().toISOString(),
          saved.id,
          snapshot!.version,
        )
        .run();
      const current = await db()
        .prepare('SELECT drawing_spec FROM crm_leads WHERE id=?')
        .bind(saved.id)
        .first<{ drawing_spec: string }>();
      if (visualConfigured() && process.env.OPENAI_VISUAL_AUTO === '1' && current?.drawing_spec) {
        const visualLead = {
          ...lead,
          id: saved.id,
          drawing_spec: current.drawing_spec,
        };
        const origin = new URL(request.url).origin;
        after(() => ensureVisual(visualLead, origin).catch(() => {}));
      }
      return noStore(
        { id: saved.id, drawingSpec: readDrawing(current!.drawing_spec) },
        201,
      );
    }
    return noStore(
      await saveChatLead(
        lead,
        input.requestId,
        input.answers,
        input.orderGroup,
      ),
      201,
    );
  } catch (e) {
    const message = (e as Error).message;
    const conflict =
      message.startsWith('Менеджер') || message.startsWith('Заявка изменилась');
    return noStore(
      {
        error: conflict
          ? message
          : 'Не удалось сохранить заявку. Повторите попытку или свяжитесь с нами в WhatsApp.',
      },
      conflict ? 409 : 503,
    );
  }
}
