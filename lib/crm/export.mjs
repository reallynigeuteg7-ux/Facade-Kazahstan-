export function csvExport(leads) {
  const columns = [
    ['id', 'Номер'],
    ['name', 'Клиент'],
    ['phone', 'Телефон'],
    ['product', 'Изделие'],
    ['size', 'Размеры'],
    ['quantity', 'Количество'],
    ['finish', 'Материал'],
    ['city', 'Город'],
    ['deadline', 'Срок'],
    ['stage', 'Этап'],
    ['amount', 'Сумма, ₸'],
    ['next_action', 'Следующее действие'],
    ['due_date', 'Дата задачи'],
    ['created_at', 'Создана'],
  ];
  const cell = (value) => {
    let s = String(value ?? '');
    if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    '\uFEFF' +
    [
      columns.map((c) => cell(c[1])).join(';'),
      ...leads.map((l) => columns.map((c) => cell(l[c[0]])).join(';')),
    ].join('\r\n')
  );
}
