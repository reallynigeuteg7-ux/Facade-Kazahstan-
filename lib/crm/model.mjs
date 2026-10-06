import { assertConsistent, withDrawing } from './specification.mjs';
import { cleanDrawing, initialDrawing } from '../drawings/model.mjs';
export const stages = [
  { id: 'new', label: 'Новая', color: '#427bd1' },
  { id: 'working', label: 'В работе', color: '#7964cd' },
  { id: 'quote', label: 'Расчёт', color: '#cc902b' },
  { id: 'approval', label: 'Согласование', color: '#d36b42' },
  { id: 'production', label: 'Производство', color: '#1a9595' },
  { id: 'done', label: 'Завершена', color: '#399061' },
  { id: 'archived', label: 'Архив', color: '#84909c' },
];
export function cleanLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Неверные данные заявки.');
  /** @type {Record<string, any>} */ const result = {};
  for (const key of [
    'name',
    'phone',
    'product',
    'size',
    'quantity',
    'finish',
    'drawing',
    'city',
    'deadline',
    'next_action',
    'due_date',
  ]) {
    const v = input[key] ?? '';
    if (typeof v !== 'string' || v.length > 600)
      throw new Error('Проверьте поле ' + key);
    result[key] = v.trim();
  }
  if (!result.name || !result.product)
    throw new Error('Укажите имя и изделие.');
  if (
    !/^[+\d\s()-]{7,25}$/.test(result.phone) ||
    result.phone.replace(/\D/g, '').length < 7
  )
    throw new Error('Проверьте телефон.');
  result.stage = input.stage ?? 'new';
  if (!stages.some((s) => s.id === result.stage))
    throw new Error('Неизвестный статус.');
  result.amount = input.amount ?? 0;
  if (
    !Number.isSafeInteger(result.amount) ||
    result.amount < 0 ||
    result.amount > 1e12
  )
    throw new Error('Укажите сумму в целых тенге.');
  if (
    result.due_date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(result.due_date) ||
      !Number.isFinite(Date.parse(result.due_date)) ||
      new Date(result.due_date).toISOString().slice(0, 10) !== result.due_date)
  )
    throw new Error('Проверьте дату задачи.');
  if (input.drawing_spec !== undefined) {
    if (
      typeof input.drawing_spec !== 'string' ||
      input.drawing_spec.length > 4000
    )
      throw new Error('Неверные параметры чертежа.');
    result.drawing_spec = input.drawing_spec
      ? JSON.stringify(cleanDrawing(JSON.parse(input.drawing_spec)))
      : '';
  }
  result.search_text = [
    result.name,
    result.phone,
    result.product,
    result.city,
    result.phone.replace(/\D/g, ''),
  ]
    .join(' ')
    .normalize('NFC')
    .toLowerCase();
  assertConsistent(result);
  return result;
}
export function fromAnswers(answers, drawingSpec) {
  if (
    !Array.isArray(answers) ||
    answers.length !== 9 ||
    !answers.every((v) => typeof v === 'string' && v.trim() && v.length <= 600)
  )
    throw new Error('Заполните все ответы.');
  const spec = cleanDrawing(
    drawingSpec ?? {
      ...initialDrawing(answers[0], answers[1], answers[3], answers[4]),
      notes: answers[4],
    },
  );
  return cleanLead(
    withDrawing(
      {
        drawing_spec: JSON.stringify(spec),
        product: answers[0],
        size: answers[1],
        quantity: answers[2],
        finish: answers[3],
        drawing: answers[4],
        city: answers[5],
        deadline: answers[6],
        name: answers[7],
        phone: answers[8],
      },
      spec,
    ),
  );
}
export function validRequestId(id) {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  );
}
