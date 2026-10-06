import CFB from 'cfb';
import template from './document-xls-template.json' with { type: 'json' };
import { documentDefaults } from './documents.mjs';

const record = (code, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt16LE(code);
  head.writeUInt16LE(data.length, 2);
  return Buffer.concat([head, data]);
};

// Preserve the native BIFF8 fonts, borders, merged cells, print settings and
// embedded black logo. Only replace the proposal's data and formula caches.
export function documentXls(lead, kind) {
  if (!['kp', 'pp'].includes(kind)) throw Error('Неизвестный документ.');
  const doc = documentDefaults(lead),
    item = doc.items[0];
  const rawQuantity = Number(item.quantity);
  const q =
    item.quantity === '' || !Number.isFinite(rawQuantity) || rawQuantity > 1e7
      ? null
      : rawQuantity;
  const price =
    lead.amount > 0 && q > 0 ? Number((lead.amount / q).toFixed(6)) : null;
  const amount =
    q !== null && price !== null ? Math.round(q * price * 100) / 100 : null;
  const replacements = {
    __HEADING__:
      kind === 'kp' ? 'Коммерческое предложение' : 'Ценовое предложение',
    __TITLE__: doc.title,
    __META__: `№ ${doc.number} от ${doc.date.split('-').reverse().join('.')} · Валюта: тенге${amount === null && lead.amount > 0 ? ` · Сумма заявки: ${lead.amount}` : ''}`,
    __CLIENT__: `Клиент: ${doc.recipient} · Телефон: ${doc.phone}`,
    __PRODUCT__: item.name,
    __DESCRIPTION__: item.description,
    __UNIT__: item.unit,
    __DEADLINE__: kind === 'kp' && doc.deadline ? `Срок: ${doc.deadline}` : '',
    __DELIVERY__:
      kind === 'kp' && doc.delivery ? `Место поставки: ${doc.delivery}` : '',
    __DRAWING__:
      kind === 'kp' && lead.drawing
        ? `Пожелания к изделию: ${lead.drawing}`
        : '',
    __SUPPLIER__: doc.supplier,
  };
  const strings = template.strings.map((v) => replacements[v] ?? v);
  const sstHead = Buffer.alloc(8);
  sstHead.writeUInt32LE(template.stringCount);
  sstHead.writeUInt32LE(strings.length, 4);
  const sst = [];
  let parts = [sstHead],
    length = 8,
    code = 0xfc;
  for (const value of strings) {
    const chars = Buffer.from(value, 'utf16le'),
      head = Buffer.alloc(3);
    head.writeUInt16LE(chars.length / 2);
    head[2] = 1;
    const text = Buffer.concat([head, chars]);
    if (length + text.length > 8224) {
      sst.push(record(code, Buffer.concat(parts)));
      code = 0x3c;
      parts = [];
      length = 0;
    }
    parts.push(text);
    length += text.length;
  }
  sst.push(record(code, Buffer.concat(parts)));
  let bound;
  const globals = template.globals.flatMap((r) => {
    if (r.code === 0xfc) return sst;
    const data = Buffer.from(r.data, 'base64');
    if (r.code === 0x85) bound = data;
    return [record(r.code, data)];
  });
  // record() copied the BOUNDSHEET payload, so patch the serialized record.
  const globalLength = globals.reduce((n, b) => n + b.length, 0);
  const boundRecord = globals.find((b) => b.readUInt16LE() === 0x85);
  if (!bound || !boundRecord) throw Error('Повреждён шаблон Excel.');
  boundRecord.writeUInt32LE(globalLength, 4);
  const sheet = template.sheet.flatMap((r) => {
    const data = Buffer.from(r.data, 'base64');
    if (r.code === 0x208) {
      const row = data.readUInt16LE();
      const lines = (text, width) =>
        String(text)
          .split('\n')
          .reduce((n, v) => n + Math.max(1, Math.ceil(v.length / width)), 0);
      const value =
        row === 9
          ? Math.max(lines(item.name, 28), lines(item.description, 34))
          : row === 5
            ? lines(doc.title, 60)
            : row === 7
              ? lines(replacements.__CLIENT__, 100)
              : row === 12
                ? lines(replacements.__DEADLINE__, 100)
                : row === 13
                  ? lines(replacements.__DELIVERY__, 100)
                  : row === 14
                    ? lines(replacements.__DRAWING__, 100)
                    : 0;
      if (value)
        data.writeUInt16LE(
          Math.max(data.readUInt16LE(6), Math.min(8190, value * 300 + 200)),
          6,
        );
    }
    if (r.code === 0xbd && data.readUInt16LE() === 9) {
      // The template stores E10/F10 as a MULRK record. Emit NUMBER or BLANK
      // cells instead, retaining each original number format and border.
      return [q, price].map((value, i) => {
        const cell = Buffer.alloc(value === null ? 6 : 14);
        cell.writeUInt16LE(9);
        cell.writeUInt16LE(4 + i, 2);
        cell.writeUInt16LE(data.readUInt16LE(4 + i * 6), 4);
        if (value !== null) cell.writeDoubleLE(value, 6);
        return record(value === null ? 0x201 : 0x203, cell);
      });
    }
    if (r.code === 6 && amount !== null) data.writeDoubleLE(amount, 6);
    return [record(r.code, data)];
  });
  const cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(cfb, '/Workbook', Buffer.concat([...globals, ...sheet]));
  return CFB.write(cfb, { type: 'buffer' });
}
