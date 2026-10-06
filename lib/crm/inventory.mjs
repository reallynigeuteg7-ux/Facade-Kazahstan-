export const units = ['кг', 'м²', 'м', 'лист', 'шт', 'л'];
export const movementLabels = {
  opening: 'Начальный остаток',
  receive: 'Приход',
  consume: 'Расход',
  return: 'Возврат',
  adjustment: 'Корректировка',
};
export function quantityMilli(value, signed = false) {
  if (typeof value !== 'string' && typeof value !== 'number')
    throw Error('Укажите количество.');
  const raw = String(value).trim().replace(',', '.');
  if (
    !(signed ? /^[+-]?\d{1,10}(\.\d{1,3})?$/ : /^\d{1,10}(\.\d{1,3})?$/).test(
      raw,
    )
  )
    throw Error('Количество: до трёх знаков после запятой.');
  const result = Math.round(Number(raw) * 1000);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 1e12)
    throw Error('Количество слишком большое.');
  return result;
}
function uuid(value) {
  return (
    typeof value === 'string' &&
    /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
      value,
    )
  );
}
export function cleanStock(input) {
  if (!input || typeof input !== 'object' || !uuid(input.requestId))
    throw Error('Неверная операция.');
  const action = input.action;
  if (
    !['create', 'receive', 'consume', 'return', 'adjustment'].includes(action)
  )
    throw Error('Неизвестная операция.');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > 600 || (action === 'adjustment' && !note))
    throw Error('Для корректировки укажите причину, до 600 символов.');
  const leadId = input.leadId || null;
  if (leadId && !uuid(leadId)) throw Error('Неверный номер заявки.');
  if (action === 'create') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 150 || !units.includes(input.unit))
      throw Error('Укажите название и единицу материала.');
    return {
      requestId: input.requestId,
      action,
      name,
      unit: input.unit,
      quantity: quantityMilli(input.quantity ?? '0'),
      minimum: quantityMilli(input.minimum ?? '0'),
      note,
      leadId: null,
    };
  }
  if (!uuid(input.materialId)) throw Error('Выберите материал.');
  const quantity = quantityMilli(input.quantity, action === 'adjustment');
  if (!quantity) throw Error('Количество должно отличаться от нуля.');
  return {
    requestId: input.requestId,
    action,
    materialId: input.materialId,
    quantity,
    note,
    leadId,
  };
}
// A write transaction serializes balance checks and movements, including retries.
export async function applyStock(client, input) {
  const data = cleanStock(input),
    payload = JSON.stringify(data);
  const tx = await client.transaction('write');
  try {
    const previous = (
      await tx.execute({
        sql: 'SELECT * FROM crm_stock_movements WHERE id=?',
        args: [data.requestId],
      })
    ).rows[0];
    if (previous) {
      if (previous.payload !== payload)
        throw Error('Номер операции уже использован. Обновите страницу.');
      await tx.commit();
      return {
        id: previous.id,
        materialId: previous.material_id,
        balance: Number(previous.balance_after),
        repeated: true,
      };
    }
    const now = new Date().toISOString();
    let materialId, balance, delta;
    if (data.action === 'create') {
      materialId = data.requestId;
      balance = data.quantity;
      delta = data.quantity;
      await tx.execute({
        sql: 'INSERT INTO crm_materials(id,name,unit,balance,minimum,created_at) VALUES(?,?,?,?,?,?)',
        args: [materialId, data.name, data.unit, balance, data.minimum, now],
      });
    } else {
      materialId = data.materialId;
      const material = (
        await tx.execute({
          sql: 'SELECT * FROM crm_materials WHERE id=?',
          args: [materialId],
        })
      ).rows[0];
      if (!material) throw Error('Материал не найден.');
      if (
        data.leadId &&
        !(
          await tx.execute({
            sql: 'SELECT id FROM crm_leads WHERE id=?',
            args: [data.leadId],
          })
        ).rows.length
      )
        throw Error('Заявка не найдена.');
      delta = data.action === 'consume' ? -data.quantity : data.quantity;
      balance = Number(material.balance) + delta;
      if (balance < 0) throw Error('Недостаточно материала на складе.');
      if (balance > 1e12) throw Error('Превышен допустимый остаток.');
      await tx.execute({
        sql: 'UPDATE crm_materials SET balance=? WHERE id=?',
        args: [balance, materialId],
      });
    }
    await tx.execute({
      sql: 'INSERT INTO crm_stock_movements(id,material_id,kind,delta,balance_after,note,lead_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
      args: [
        data.requestId,
        materialId,
        data.action === 'create' ? 'opening' : data.action,
        delta,
        balance,
        data.note,
        data.leadId,
        payload,
        now,
      ],
    });
    await tx.commit();
    return { id: data.requestId, materialId, balance, repeated: false };
  } finally {
    tx.close();
  }
}
