import type { CleanLead } from './model.mjs';
import { db } from './server';
import { scheduleMail } from './mail-job';
export async function insertLead(
  lead: CleanLead,
  requestId: string,
  source: string,
  intakeAnswers = '',
  orderGroup = requestId,
) {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await db()
    .prepare(
      'INSERT INTO crm_leads (id,request_id,name,phone,product,size,quantity,finish,drawing,city,deadline,stage,amount,next_action,due_date,source,created_at,updated_at,drawing_spec,search_text,intake_answers,order_group,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(request_id) DO NOTHING',
    )
    .bind(
      id,
      requestId,
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
      source,
      now,
      now,
      lead.drawing_spec || '',
      lead.search_text || '',
      intakeAnswers,
      orderGroup,
    )
    .run();
  const saved = await db()
    .prepare('SELECT id FROM crm_leads WHERE request_id = ?')
    .bind(requestId)
    .first<{ id: string }>();
  if (!saved) throw new Error('Not saved');
  scheduleMail();
  return { id: saved.id };
}
export async function saveChatLead(
  lead: CleanLead,
  requestId: string,
  answers: string[] = [],
  orderGroup = requestId,
) {
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
    'drawing_spec',
    'search_text',
  ];
  const saved = await insertLead(
    lead,
    requestId,
    'chat',
    JSON.stringify(answers),
    orderGroup,
  );
  const previous = await db()
    .prepare('SELECT * FROM crm_leads WHERE id=?')
    .bind(saved.id)
    .first<Record<string, string | number>>();
  if (!previous) throw Error('Заявка не найдена.');
  if (fields.every((k) => previous[k] === lead[k])) return saved;
  if (previous.source !== 'chat' || previous.stage !== 'new')
    throw new Error(
      'Менеджер уже работает с заявкой. Сообщите изменения ему в WhatsApp.',
    );
  const updated = await db()
    .prepare(
      'UPDATE crm_leads SET name=?,phone=?,product=?,size=?,quantity=?,finish=?,drawing=?,city=?,deadline=?,drawing_spec=?,search_text=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND source=? AND stage=?',
    )
    .bind(
      ...fields.map((k) => lead[k] ?? ''),
      new Date().toISOString(),
      saved.id,
      previous.version,
      'chat',
      'new',
    )
    .run();
  if (!updated.meta.changes)
    throw new Error('Заявка изменилась. Повторите сохранение.');
  return saved;
}
