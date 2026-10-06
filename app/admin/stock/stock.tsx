'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { units, movementLabels } from '@/lib/crm/inventory.mjs';
type Material = {
  id: string;
  name: string;
  unit: string;
  balance: number;
  minimum: number;
};
type Movement = {
  id: string;
  material_id: string;
  name: string;
  unit: string;
  kind: keyof typeof movementLabels;
  delta: number;
  balance_after: number;
  note: string;
  lead_id: string | null;
  created_at: string;
};
const format = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(n / 1000);
export default function Stock() {
  const [materials, setMaterials] = useState<Material[]>([]),
    [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState(''),
    [search, setSearch] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [materialId, setMaterialId] = useState(''),
    [action, setAction] = useState('receive'),
    [quantity, setQuantity] = useState(''),
    [note, setNote] = useState(''),
    [leadId, setLeadId] = useState('');
  const [name, setName] = useState(''),
    [unit, setUnit] = useState('кг'),
    [opening, setOpening] = useState('0'),
    [minimum, setMinimum] = useState('0');
  const pending = useRef<{ key: string; id: string } | null>(null),
    saving = useRef(false),
    epoch = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++epoch.current;
    const r = await fetch(
      '/api/crm/stock?material=' + encodeURIComponent(filter) + '&page=' + page,
      { cache: 'no-store' },
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (seq !== epoch.current) return;
    setMaterials(d.materials);
    setMovements(d.movements);
    setTotal(d.total);
    setLoaded(true);
  }, [filter, page]);
  const invalidate = useCallback(() => {
    epoch.current++;
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
    const timer = setInterval(
      () => reload().catch((e) => setError(e.message)),
      30000,
    );
    return () => {
      clearInterval(timer);
      invalidate();
    };
  }, [reload, invalidate]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('lead');
    if (id) {
      setLeadId(id);
      setAction('consume');
    }
  }, []);
  async function save(payload: Record<string, string>, after: () => void) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const key = JSON.stringify(payload);
    if (pending.current?.key !== key)
      pending.current = { key, id: crypto.randomUUID() };
    try {
      const r = await fetch('/api/crm/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: pending.current.id }),
        signal: AbortSignal.timeout(30000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      pending.current = null;
      after();
      setNotice('Операция сохранена. Остаток пересчитан.');
      await reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось сохранить. Повторите попытку.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const selected = materials.find((m) => m.id === materialId);
  const visible = materials.filter((m) =>
    m.name.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')),
  );
  return (
    <main className="stock-page">
      <header>
        <div>
          <span>FACADE KAZAKHSTAN / CRM</span>
          <h1>Склад материалов</h1>
          <p>Приход, расход и остатки в одном месте.</p>
        </div>
        <Link href="/admin" className="stock-button secondary">
          ← Заявки
        </Link>
      </header>
      <div className="stock-stats">
        <div>
          <span>Материалов</span>
          <strong>{materials.length}</strong>
        </div>
        <div>
          <span>Остаток на минимуме или ниже</span>
          <strong>
            {materials.filter((m) => m.balance <= m.minimum).length}
          </strong>
        </div>
        <div>
          <span>Обновление</span>
          <strong className="stock-small">Каждые 30 секунд</strong>
        </div>
      </div>
      {error && (
        <p role="alert" className="stock-error">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              reload().catch((e) => setError(e.message));
            }}
          >
            Обновить
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="stock-success">
          {notice}
        </p>
      )}
      <section className="stock-card">
        <div className="stock-section-title">
          <h2>Текущие остатки</h2>
          <label>
            Поиск материала
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Название, толщина, цвет…"
            />
          </label>
        </div>
        {!loaded ? (
          <p>Загружаю склад…</p>
        ) : !materials.length ? (
          <p className="stock-empty">
            Склад пока пуст. Добавьте материал ниже и укажите начальный остаток.
            Если данных ещё нет, оставьте ноль.
          </p>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Материал</th>
                  <th>Остаток</th>
                  <th>Минимум</th>
                  <th>Состояние</th>
                  <th>Операции</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>
                      <strong>
                        {format(m.balance)} {m.unit}
                      </strong>
                    </td>
                    <td>
                      {format(m.minimum)} {m.unit}
                    </td>
                    <td>
                      <span
                        className={
                          m.balance <= m.minimum ? 'stock-low' : 'stock-ok'
                        }
                      >
                        {m.balance <= m.minimum
                          ? 'Нужно пополнить'
                          : 'В наличии'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setMaterialId(m.id);
                          document
                            .getElementById('stock-operation')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Приход / расход
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <p>Материалы не найдены.</p>}
          </div>
        )}
      </section>
      <div className="stock-forms">
        <section className="stock-card">
          <h2>Добавить материал</h2>
          <p>
            Разные толщины, марки и цвета добавляйте отдельными материалами.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(
                { action: 'create', name, unit, quantity: opening, minimum },
                () => {
                  setName('');
                  setOpening('0');
                  setMinimum('0');
                },
              );
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Название
                <input
                  required
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: сталь 0,5 мм, RAL 7016"
                />
              </label>
              <label>
                Единица
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label>
                Начальный остаток
                <input
                  required
                  inputMode="decimal"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </label>
              <label>
                Минимальный остаток
                <input
                  required
                  inputMode="decimal"
                  value={minimum}
                  onChange={(e) => setMinimum(e.target.value)}
                />
              </label>
              <button className="stock-button" type="submit">
                Добавить материал
              </button>
            </fieldset>
          </form>
        </section>
        <section className="stock-card" id="stock-operation">
          <h2>Операция по материалу</h2>
          <p>
            Остаток = начальный запас + приход + возвраты − расход ±
            корректировки.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save({ action, materialId, quantity, note, leadId }, () => {
                setQuantity('');
                setNote('');
              });
            }}
          >
            <fieldset disabled={busy || !materials.length}>
              <label>
                Материал
                <select
                  required
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                >
                  <option value="">Выберите материал</option>
                  {materials.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name} · {format(m.balance)} {m.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Операция
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="receive">Приход</option>
                  <option value="consume">Расход</option>
                  <option value="return">Возврат</option>
                  <option value="adjustment">Корректировка (+ / −)</option>
                </select>
              </label>
              <label>
                {action === 'adjustment'
                  ? 'Изменение остатка (+ / −)'
                  : 'Количество'}{' '}
                {selected?.unit}
                <input
                  required
                  inputMode={action === 'adjustment' ? 'text' : 'decimal'}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={
                    action === 'adjustment' ? 'Например: -2,5' : 'Например: 2,5'
                  }
                />
              </label>
              <label>
                Заявка (необязательно)
                <input
                  value={leadId}
                  maxLength={36}
                  onChange={(e) => setLeadId(e.target.value)}
                  placeholder="Полный ID или переход из карточки заявки"
                />
              </label>
              <label>
                {action === 'adjustment'
                  ? 'Причина корректировки'
                  : 'Комментарий'}
                <textarea
                  required={action === 'adjustment'}
                  value={note}
                  maxLength={600}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Накладная, раскрой, возврат из производства…"
                />
              </label>
              <button className="stock-button" type="submit">
                {busy ? 'Сохраняю…' : 'Сохранить операцию'}
              </button>
            </fieldset>
          </form>
          <p className="stock-help">
            Расход указывается по факту. Создание заявки само по себе не
            списывает материал: нормы расхода ещё не заданы.
          </p>
        </section>
      </div>
      <section className="stock-card">
        <div className="stock-section-title">
          <h2>История операций</h2>
          <label>
            Материал в истории
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Все материалы</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="stock-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Материал</th>
                <th>Операция</th>
                <th>Количество</th>
                <th>Остаток после</th>
                <th>Заявка / комментарий</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('ru-RU')}</td>
                  <td>{m.name}</td>
                  <td>{movementLabels[m.kind]}</td>
                  <td>
                    {m.delta > 0 ? '+' : ''}
                    {format(m.delta)} {m.unit}
                  </td>
                  <td>
                    {format(m.balance_after)} {m.unit}
                  </td>
                  <td>
                    {m.lead_id && (
                      <Link href={'/admin?lead=' + m.lead_id}>
                        {m.lead_id.slice(0, 8).toUpperCase()}
                      </Link>
                    )}
                    <div>{m.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loaded && !movements.length && <p>Операций пока нет.</p>}
        <div className="stock-pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Назад
          </button>
          <span>
            Страница {page} · Операций: {total}
          </span>
          <button
            disabled={page * 50 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее →
          </button>
        </div>
        <p className="stock-help">
          История сохраняется. Ошибочную операцию исправляйте обратной операцией
          с пояснением. Склад включён в полную резервную копию CRM.
        </p>
      </section>
    </main>
  );
}
