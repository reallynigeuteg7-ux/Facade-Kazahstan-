'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import {
  cleanDocument,
  sidingRows,
  totals,
  money,
} from '@/lib/crm/documents.mjs';
type Item = {
  name: string;
  description: string;
  unit: string;
  quantity: string;
  price: string;
};
type Doc = {
  title: string;
  number: string;
  date: string;
  recipient: string;
  phone: string;
  supplier: string;
  requisites: string;
  deadline: string;
  delivery: string;
  payment: string;
  validity: string;
  notes: string;
  vat: string;
  pricing: string;
  packagePrice: string;
  items: Item[];
};
export default function Documents() {
  const [doc, setDoc] = useState<Doc | null>(null),
    [id, setId] = useState(''),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [pendingTemplate, setPendingTemplate] = useState(''),
    [saved, setSaved] = useState('');
  const current = useRef(false);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('lead') || '';
    setId(key);
    fetch('/api/crm/documents?id=' + encodeURIComponent(key), {
      cache: 'no-store',
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setDoc(d.document);
        setVersion(d.version);
        setSaved(d.version ? JSON.stringify(d.document) : '');
      })
      .catch((e) => setError(e.message));
  }, []);
  const dirty = !!doc && JSON.stringify(doc) !== saved;
  current.current = dirty;
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (current.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);
  const update = (key: keyof Doc, value: string) => {
    if (doc) setDoc({ ...doc, [key]: value });
    setMessage('');
  };
  const item = (index: number, key: keyof Item, value: string) => {
    if (doc)
      setDoc({
        ...doc,
        items: doc.items.map((i, k) =>
          k === index ? { ...i, [key]: value } : i,
        ),
      });
    setMessage('');
  };
  let total: number | null = null,
    amounts: (number | null)[] = [],
    validation = '';
  if (doc)
    try {
      const t = totals(doc);
      total = t.total;
      amounts = t.amounts;
      cleanDocument(doc, true);
    } catch (e) {
      validation = (e as Error).message;
    }
  async function save() {
    if (!doc) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/crm/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, version, document: doc }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setDoc(d.document);
      setVersion(d.version);
      setSaved(JSON.stringify(d.document));
      setMessage('Расчёт сохранён.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function template(kind: string) {
    if (!doc) return;
    if (pendingTemplate !== kind) {
      setPendingTemplate(kind);
      return;
    }
    setPendingTemplate('');
    const rows =
      kind === 'siding'
        ? sidingRows
        : [
            ['Скамейка', 'Порошковая полимерная покраска', 'шт'],
            ['Урна', 'Порошковая полимерная покраска', 'шт'],
          ];
    setDoc({
      ...doc,
      title: kind === 'siding' ? 'Сайдинг' : 'Скамейка и урна',
      pricing: kind === 'siding' ? 'package' : 'lines',
      packagePrice: '',
      items: rows.map(([name, description, unit]) => ({
        name,
        description,
        unit,
        quantity: '',
        price: '',
      })),
    });
    setMessage('Шаблон загружен. Укажите актуальные количества и цены.');
  }
  return (
    <main className="doc-editor">
      <header>
        <Link href={'/admin' + (id ? '?lead=' + id : '')}>← К заявке</Link>
        <Image
          src="/facade-logo-black.svg"
          alt="Facade Kazakhstan"
          width={115}
          height={70}
        />
      </header>
      <h1>ПП и КП</h1>
      <p className="doc-muted">
        Данные взяты из сохранённой заявки и всех её позиций. Расчёт сохраняется
        отдельно от суммы в CRM.
      </p>
      {error && (
        <p className="doc-error" role="alert">
          {error}
        </p>
      )}
      {!doc && !error && <p>Загружаем заказ…</p>}
      {doc && (
        <>
          <fieldset disabled={busy}>
            <section className="doc-meta">
              {(
                [
                  ['title', 'Тема предложения'],
                  ['number', 'Номер'],
                  ['date', 'Дата'],
                  ['recipient', 'Клиент / организация'],
                  ['phone', 'Телефон клиента'],
                  ['supplier', 'Поставщик'],
                ] as [keyof Doc, string][]
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type={key === 'date' ? 'date' : 'text'}
                    maxLength={600}
                    value={doc[key] as string}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </section>
            <section className="doc-pricing">
              <label>
                Расчёт
                <select
                  value={doc.pricing}
                  onChange={(e) => update('pricing', e.target.value)}
                >
                  <option value="lines">Цена каждой позиции</option>
                  <option value="package">Общая цена за комплект</option>
                </select>
              </label>
              <label>
                НДС
                <select
                  value={doc.vat}
                  onChange={(e) => update('vat', e.target.value)}
                >
                  <option value="included">Цены уже включают НДС</option>
                  <option value="without">Без НДС</option>
                  <option value="unspecified">Не указывать НДС</option>
                </select>
              </label>
              {doc.pricing === 'package' && (
                <label>
                  Цена комплекта, ₸
                  <input
                    inputMode="decimal"
                    value={doc.packagePrice}
                    onChange={(e) => update('packagePrice', e.target.value)}
                  />
                </label>
              )}
            </section>
            <p className="doc-muted">
              Количество и цена доступны для изменения. Сумма строки =
              количество × цена. НДС повторно не начисляется. Если количество не
              удалось однозначно прочитать из заявки, поле оставлено пустым.
            </p>
            <div className="doc-templates">
              <span>Шаблоны из ваших образцов:</span>
              <button type="button" onClick={() => template('bench')}>
                Скамейка и урна
              </button>
              <button type="button" onClick={() => template('siding')}>
                Сайдинг с комплектующими
              </button>
            </div>
            {pendingTemplate && (
              <div className="doc-templates" role="status">
                <span>
                  Заменить позиции? Количество и цены нужно будет заполнить.
                </span>
                <button type="button" onClick={() => template(pendingTemplate)}>
                  Заменить позиции
                </button>
                <button type="button" onClick={() => setPendingTemplate('')}>
                  Отмена
                </button>
              </div>
            )}
            <div className="doc-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th>Примечание / размеры / покрытие</th>
                    <th>Ед.</th>
                    <th>Кол-во</th>
                    <th>Цена, ₸</th>
                    <th>Сумма, ₸</th>
                    <th aria-label="Действия"></th>
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((i, k) => (
                    <tr key={k}>
                      <td>
                        <input
                          aria-label={`Наименование ${k + 1}`}
                          maxLength={600}
                          value={i.name}
                          onChange={(e) => item(k, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <textarea
                          aria-label={`Примечание ${k + 1}`}
                          maxLength={600}
                          value={i.description}
                          onChange={(e) =>
                            item(k, 'description', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Единица ${k + 1}`}
                          maxLength={30}
                          value={i.unit}
                          onChange={(e) => item(k, 'unit', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Количество ${k + 1}`}
                          inputMode="decimal"
                          value={i.quantity}
                          onChange={(e) => item(k, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        {doc.pricing === 'lines' ? (
                          <input
                            aria-label={`Цена ${k + 1}`}
                            inputMode="decimal"
                            value={i.price}
                            onChange={(e) => item(k, 'price', e.target.value)}
                          />
                        ) : (
                          'Комплект'
                        )}
                      </td>
                      <td className="doc-num">
                        {doc.pricing === 'lines'
                          ? money(amounts[k] ?? null)
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={doc.items.length === 1}
                          aria-label={`Удалить позицию ${k + 1}`}
                          onClick={() =>
                            setDoc({
                              ...doc,
                              items: doc.items.filter((_, j) => j !== k),
                            })
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              disabled={doc.items.length >= 100}
              onClick={() =>
                setDoc({
                  ...doc,
                  items: [
                    ...doc.items,
                    {
                      name: '',
                      description: '',
                      unit: 'шт',
                      quantity: '',
                      price: '',
                    },
                  ],
                })
              }
            >
              + Добавить позицию
            </button>
            <p className="doc-total">Итого: {money(total)} ₸</p>
            <details className="doc-terms" open>
              <summary>Условия для КП</summary>
              <section className="doc-meta">
                {(
                  [
                    ['deadline', 'Срок изготовления'],
                    ['delivery', 'Доставка'],
                    ['payment', 'Условия оплаты'],
                    ['validity', 'Срок действия предложения'],
                  ] as [keyof Doc, string][]
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      maxLength={600}
                      value={doc[key] as string}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}
              </section>
              <label>
                Реквизиты поставщика
                <textarea
                  value={doc.requisites}
                  maxLength={3000}
                  onChange={(e) => update('requisites', e.target.value)}
                />
              </label>
              <label>
                Примечание (для ПП и КП)
                <textarea
                  value={doc.notes}
                  maxLength={3000}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </label>
            </details>
            <button className="doc-primary" type="button" onClick={save}>
              {busy ? 'Сохраняем…' : 'Сохранить расчёт'}
            </button>
          </fieldset>
          {message && <p role="status">{message}</p>}
          <section className="doc-export">
            <h2>Создать документ</h2>
            {dirty ? (
              <p>Сначала сохраните расчёт.</p>
            ) : validation ? (
              <p className="doc-error">{validation}</p>
            ) : null}
            <div className="doc-export-grid">
              {['pp', 'kp'].map((kind) => (
                <div key={kind}>
                  <h3>
                    {kind === 'pp'
                      ? 'ПП — ценовое предложение'
                      : 'КП — коммерческое предложение'}
                  </h3>
                  <p>
                    {kind === 'pp'
                      ? 'Таблица и итог по образцу.'
                      : 'Таблица, клиент и заполненные условия.'}
                  </p>
                  {!dirty && !validation ? (
                    <>
                      <a
                        href={`/api/crm/documents?id=${id}&kind=${kind}&format=xlsx`}
                      >
                        Скачать Excel
                      </a>
                      <a
                        href={`/api/crm/documents?id=${id}&kind=${kind}&format=html`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть / Печать / PDF ↗
                      </a>
                    </>
                  ) : (
                    <span className="doc-muted">
                      Заполните и сохраните расчёт для выгрузки.
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
