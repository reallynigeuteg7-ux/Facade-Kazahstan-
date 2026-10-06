'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Search,
  ArrowUpRight,
  Phone,
  MessageCircle,
  CalendarDays,
  X,
} from 'lucide-react';
import { editLeadField, withDrawing } from '@/lib/crm/specification.mjs';
import DrawingPanel from '@/app/drawing-panel';
import { initialDrawing } from '@/lib/drawings/model.mjs';
import { stages } from '@/lib/crm/model.mjs';
type Lead = {
  intake_answers?: string;
  drawing_spec: string;
  id: string;
  request_id: string;
  name: string;
  phone: string;
  product: string;
  size: string;
  quantity: string;
  finish: string;
  drawing: string;
  city: string;
  deadline: string;
  stage: string;
  amount: number;
  next_action: string;
  due_date: string;
  source: string;
  created_at: string;
  updated_at: string;
  version: number;
};
const empty = {
  drawing_spec: '',
  name: '',
  phone: '',
  product: '',
  size: '',
  quantity: '',
  finish: '',
  drawing: '',
  city: '',
  deadline: '',
  stage: 'new',
  amount: 0,
  next_action: '',
  due_date: '',
} as Lead;
const money = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';
const date = (s: string) =>
  s
    ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString(
        'ru-RU',
        { day: '2-digit', month: 'short' },
      )
    : '—';
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qyzylorda',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export default function Crm() {
  const [view, setView] = useState('board'),
    [leads, setLeads] = useState<Lead[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [search, setSearch] = useState(''),
    [stage, setStage] = useState('all'),
    [truncated, setTruncated] = useState(false),
    [draft, setDraft] = useState<Lead | null>(null),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState<
      { id: string; body: string; created_at: string }[]
    >([]),
    [note, setNote] = useState(''),
    [noteLoading, setNoteLoading] = useState(false),
    [panelError, setPanelError] = useState('');
  const [documentBusy, setDocumentBusy] = useState<'kp' | 'pp' | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [clients, setClients] = useState<
      {
        id: string;
        name: string;
        phone: string;
        phone_key: string;
        city: string;
        order_count: number;
        order_amount: number;
      }[]
    >([]),
    [stageCounts, setStageCounts] = useState<Record<string, number>>({}),
    [metrics, setMetrics] = useState({
      active: 0,
      amount: 0,
      newCount: 0,
      overdue: 0,
    }),
    [history, setHistory] = useState<
      { id: number; kind: string; snapshot: string; created_at: string }[]
    >([]),
    [approve, setApprove] = useState(false),
    [positions, setPositions] = useState<
      { id: string; product: string; stage: string; amount: number }[]
    >([]),
    [aiStatus, setAiStatus] = useState<
      {
        status: string;
        kind: string;
        duration_ms: number;
        created_at: string;
      }[]
    >([]),
    [quoteReferences, setQuoteReferences] = useState<
      {
        source: string;
        name: string;
        description: string;
        unit: string;
        price: number;
        status: string;
      }[]
    >([]);
  const original = useRef('');
  const latest = useRef<string | null>(null);
  const createKey = useRef('');
  const noteEpoch = useRef(0);
  const loadEpoch = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      const epoch = ++loadEpoch.current;
      if (!quiet) setLoading(true);
      setError('');
      try {
        const r = await fetch(
          '/api/crm?' +
            new URLSearchParams({ q: search, stage, page: String(page), view }),
          { cache: 'no-store' },
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (epoch === loadEpoch.current) {
          setLeads(d.leads);
          setTruncated(d.truncated);
          setTotal(d.total);
          setClients(d.clients || []);
          setStageCounts(d.stageCounts || {});
          setMetrics(
            d.metrics || { active: 0, amount: 0, newCount: 0, overdue: 0 },
          );
          setAiStatus(d.aiStatus || []);
          setQuoteReferences(d.quoteReferences || []);
          if (latest.current && d.metrics?.latest > latest.current) {
            setNotice('Поступила новая заявка');
            if (
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted'
            ) {
              const n = new Notification('Facade: новая заявка', {
                body: 'Откройте CRM для просмотра',
                tag: 'facade-new-order',
              });
              n.onclick = () => window.focus();
            }
          }
          latest.current = d.metrics?.latest || latest.current;
        }
      } catch (e) {
        if (epoch === loadEpoch.current)
          setError((e as Error).message || 'Ошибка загрузки');
      } finally {
        if (epoch === loadEpoch.current) setLoading(false);
      }
    },
    [search, stage, page, view],
  );
  useEffect(() => {
    const first = setTimeout(() => void load(), 250);
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    let lastPoll = Date.now();
    const timer = setInterval(() => {
      if (
        document.visibilityState === 'visible' ||
        Date.now() - lastPoll >= 60000
      ) {
        lastPoll = Date.now();
        void load(true);
      }
    }, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('lead');
    if (id)
      fetch('/api/crm?id=' + encodeURIComponent(id))
        .then((r) => r.json())
        .then((d) => {
          if (d.lead) open(d.lead);
        })
        .catch(() => {});
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (draft && JSON.stringify(draft) !== original.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);
  async function readNotes(id: string) {
    const epoch = ++noteEpoch.current;
    setNoteLoading(true);
    try {
      const r = await fetch('/api/crm?id=' + encodeURIComponent(id), {
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (epoch === noteEpoch.current) {
        setNotes(d.notes);
        setHistory(d.history || []);
        setPositions(d.positions || []);
      }
    } catch (e) {
      if (epoch === noteEpoch.current) setPanelError((e as Error).message);
    } finally {
      if (epoch === noteEpoch.current) setNoteLoading(false);
    }
  }
  function open(lead?: Lead) {
    noteEpoch.current++;
    setDraft(lead ? { ...lead } : { ...empty });
    setDocumentError('');
    original.current = JSON.stringify(lead || empty);
    setApprove(false);
    setHistory([]);
    setPositions([]);
    if (lead) window.history.replaceState(null, '', '/admin?lead=' + lead.id);
    setPanelError('');
    setNote('');
    setNotes([]);
    setNoteLoading(false);
    createKey.current = crypto.randomUUID();
    if (lead) void readNotes(lead.id);
  }
  async function mutate(body: Record<string, unknown>) {
    const r = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Ошибка сохранения');
    return d;
  }
  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setPanelError('');
    try {
      await mutate({
        action: draft.id ? 'update' : 'create',
        id: draft.id,
        version: draft.version,
        requestId: createKey.current,
        lead: draft,
        approve,
      });
      setDraft(null);
      window.history.replaceState(null, '', '/admin');
      setNotice('Заявка сохранена');
      await load();
    } catch (e) {
      setPanelError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function downloadDocument(kind: 'kp' | 'pp') {
    if (!draft?.id || documentBusy) return;
    setDocumentBusy(kind);
    setDocumentError('');
    try {
      const response = await fetch('/api/crm/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, kind, lead: draft }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Не удалось создать Excel.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facade-${kind}-${draft.id.slice(0, 8)}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setDocumentError((e as Error).message);
    } finally {
      setDocumentBusy(null);
    }
  }
  async function addNote() {
    if (!draft?.id || !note.trim() || busy) return;
    setBusy(true);
    setPanelError('');
    try {
      await mutate({ action: 'note', id: draft.id, body: note });
      setNote('');
      await readNotes(draft.id);
    } catch (e) {
      setPanelError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const draftDrawing = draft
    ? (() => {
        try {
          return JSON.parse(draft.drawing_spec);
        } catch {
          return null;
        }
      })()
    : null;
  const filtered = leads;
  const intakeAnswers: string[] = (() => {
    try {
      const values: unknown = JSON.parse(draft?.intake_answers || '[]');
      return Array.isArray(values) && values.every((v) => typeof v === 'string')
        ? values
        : [];
    } catch {
      return [];
    }
  })();
  const active = leads.filter((l) => !['done', 'archived'].includes(l.stage)),
    tasks = filtered
      .filter((l) => l.next_action && !['done', 'archived'].includes(l.stage))
      .sort((a, b) =>
        (a.due_date || '9999').localeCompare(b.due_date || '9999'),
      ),
    overdue = active.filter(
      (l) => l.next_action && l.due_date && l.due_date < today(),
    );
  function showClient(phone: string) {
    setSearch(phone);
    setPage(1);
    setView('board');
  }
  const select = (
    value: string,
    onChange: (v: string) => void,
    all = false,
  ) => (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <SelectTrigger className="crm-select-trigger">
        <SelectValue>
          {all && value === 'all'
            ? 'Все этапы'
            : stages.find((s) => s.id === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="crm-select-popup">
        {all && <SelectItem value="all">Все этапы</SelectItem>}
        {stages.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <SidebarProvider className="crm-app">
      <Sidebar className="crm-sidebar">
        <SidebarHeader>
          <Link href="/admin" className="crm-brand">
            FACADE
            <span>
              KAZAKHSTAN <b>CRM</b>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <p className="crm-nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</p>
          <SidebarMenu>
            {[
              { id: 'board', label: 'Заявки', icon: LayoutDashboard },
              { id: 'clients', label: 'Клиенты', icon: Users },
              { id: 'tasks', label: 'Задачи', icon: CheckSquare },
            ].map((x) => (
              <SidebarMenuItem key={x.id}>
                <SidebarMenuButton
                  isActive={view === x.id}
                  onClick={() => {
                    setView(x.id);
                    setPage(1);
                    setNotice('');
                  }}
                >
                  <x.icon size={18} />
                  <span>{x.label}</span>
                  {x.id === 'tasks' && overdue.length > 0 && (
                    <b className="crm-task-count">{overdue.length}</b>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <button
            onClick={async () => {
              const r = await fetch('/api/auth/logout', { method: 'POST' });
              if (r.ok) window.location.assign('/admin');
            }}
          >
            Выйти из CRM
          </button>
          <Link href="/" target="_blank" rel="noreferrer">
            Открыть сайт <ArrowUpRight size={15} />
          </Link>
          <Link href="/catalog-pdf" target="_blank" rel="noreferrer">
            Каталог PDF <ArrowUpRight size={15} />
          </Link>
          <Link href="/admin/templates">
            Шаблоны чертежей <ArrowUpRight size={15} />
          </Link>
          <div className="crm-owner">
            <span>В</span>
            <div>
              Владелец<small>Только ваш аккаунт</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="crm-main">
        <header>
          <Link className="crm-secondary" href="/admin/stock">
            Склад материалов
          </Link>
          <div className="crm-title-wrap">
            <SidebarTrigger />
            <div>
              <span>FACADE KAZAKHSTAN / CRM</span>
              <h1>
                {view === 'board'
                  ? 'Заявки'
                  : view === 'clients'
                    ? 'Клиенты'
                    : 'Задачи'}
              </h1>
            </div>
          </div>
          <button
            type="button"
            className="crm-secondary"
            onClick={async () => {
              if (typeof Notification === 'undefined') {
                setNotice('Этот браузер не поддерживает уведомления.');
                return;
              }
              const result = await Notification.requestPermission();
              setNotice(
                result === 'granted'
                  ? 'Уведомления включены. Оставляйте вкладку CRM открытой.'
                  : 'Разрешите уведомления в настройках браузера.',
              );
            }}
          >
            Уведомления браузера
          </button>
          <a
            href="/api/crm?export=backup"
            download="facade-crm-backup.json"
            className="crm-secondary"
          >
            Экспорт и резервная копия
          </a>
          <a
            href="/api/crm?export=csv"
            download="facade-orders.csv"
            className="crm-secondary"
          >
            Скачать таблицу заказов
          </a>
          <span className="crm-auto-status">
            ● Заявки поступают автоматически
          </span>
        </header>
        <div className="crm-metrics">
          <div>
            <span>Активные заявки</span>
            <strong>{metrics.active || 0}</strong>
            <small>Все этапы до завершения</small>
          </div>
          <div>
            <span>Сумма в работе</span>
            <strong>{money(metrics.amount || 0)}</strong>
            <small>Суммы, указанные в карточках</small>
          </div>
          <div>
            <span>Новые заявки</span>
            <strong>{metrics.newCount || 0}</strong>
            <small>Ожидают первого контакта</small>
          </div>
          <button onClick={() => setView('tasks')}>
            <span>Просроченные задачи</span>
            <strong className={overdue.length ? 'crm-danger' : ''}>
              {metrics.overdue || 0}
            </strong>
            <small>По времени Кызылорды</small>
          </button>
        </div>
        <div className="crm-toolbar">
          <div className="crm-search">
            <Search size={17} />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Имя, телефон, изделие или город"
              aria-label="Поиск заявок"
            />
          </div>
          {select(
            stage,
            (v) => {
              setStage(v);
              setPage(1);
            },
            true,
          )}
          <span className="crm-auto-label">Автообновление · 10 сек.</span>
          <span className="crm-result-count">
            {total} {view === 'clients' ? 'клиентов' : 'заявок'}
          </span>
        </div>
        {error && (
          <div className="crm-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="crm-notice" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Скрыть">
              ×
            </button>
          </div>
        )}
        {truncated && (
          <p className="crm-error">
            Показаны последние 1000 заявок. Для большего объёма потребуется
            расширить загрузку.
          </p>
        )}
        {loading ? (
          <div className="crm-loading" role="status">
            Загружаем заявки…
          </div>
        ) : view === 'board' ? (
          <>
            <div className="crm-board">
              {stages
                .filter((s) =>
                  stage === 'all' ? s.id !== 'archived' : s.id === stage,
                )
                .map((s) => (
                  <section key={s.id}>
                    <h2>
                      <i style={{ background: s.color }} />
                      {s.label}
                      <small>{stageCounts[s.id] || 0}</small>
                    </h2>
                    {filtered
                      .filter((l) => l.stage === s.id)
                      .map((l) => (
                        <button
                          className="crm-deal"
                          key={l.id}
                          onClick={() => open(l)}
                        >
                          <div className="crm-card-top">
                            <span>
                              {l.source === 'chat' ? 'Чат сайта' : 'Вручную'}
                            </span>
                            <small>{date(l.created_at)}</small>
                          </div>
                          <h3>{l.product}</h3>
                          <p>{l.name}</p>
                          <span className="crm-card-city">
                            {l.city || 'Город не указан'}
                          </span>
                          <strong>
                            {l.amount ? money(l.amount) : 'Сумма не указана'}
                          </strong>
                          {l.next_action && (
                            <div
                              className={
                                'crm-next ' +
                                (l.due_date && l.due_date < today()
                                  ? 'crm-overdue'
                                  : '')
                              }
                            >
                              <CalendarDays size={13} />
                              <span>
                                {l.next_action}
                                <small>
                                  {l.due_date ? date(l.due_date) : 'Без даты'}
                                </small>
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    {!filtered.some((l) => l.stage === s.id) && (
                      <div className="crm-empty-column">Нет заявок</div>
                    )}
                  </section>
                ))}
            </div>
            {!leads.length && !error && (
              <p className="crm-bottom-help">
                Заявки автоматически появляются на этапе «Новая», когда клиент
                завершает опрос в чате сайта.
              </p>
            )}
          </>
        ) : view === 'clients' ? (
          <div className="crm-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Заявки</TableHead>
                  <TableHead>Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.phone}>
                    <TableCell>
                      <button
                        className="crm-client-link"
                        onClick={() => showClient(c.phone_key)}
                      >
                        {c.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <a href={'tel:' + c.phone}>{c.phone}</a>
                    </TableCell>
                    <TableCell>{c.city || '—'}</TableCell>
                    <TableCell>
                      <div className="crm-client-deals">
                        <button onClick={() => showClient(c.phone_key)}>
                          Все заявки: {c.order_count}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{money(c.order_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!clients.length && (
              <p className="crm-empty-full">
                Клиентов пока нет. Они появятся после добавления заявок.
              </p>
            )}
          </div>
        ) : (
          <div className="crm-tasks">
            {tasks.map((l) => (
              <button key={l.id} className="crm-task" onClick={() => open(l)}>
                <span
                  className={
                    l.due_date && l.due_date < today() ? 'crm-danger' : ''
                  }
                >
                  <CalendarDays />
                  {date(l.due_date)}
                </span>
                <div>
                  <strong>{l.next_action}</strong>
                  <p>
                    {l.name} · {l.product}
                  </p>
                </div>
                <span>{stages.find((s) => s.id === l.stage)?.label} ↗</span>
              </button>
            ))}
            {!tasks.length && (
              <p className="crm-empty-full">
                Нет запланированных задач. Откройте заявку и укажите следующее
                действие и дату.
              </p>
            )}
          </div>
        )}
        <div className="crm-pagination">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Назад
          </Button>
          <span>
            Страница {page} из {Math.max(1, Math.ceil(total / 100))} · {total}{' '}
            {view === 'clients' ? 'клиентов' : 'заявок'}
          </span>
          <Button
            disabled={page * 100 >= total}
            onClick={() => setPage(page + 1)}
          >
            Далее
          </Button>
        </div>
        <details className="crm-operational">
          <summary>Работа ИИ</summary>
          <p>
            Последние обращения: результат и время. Личные данные в технический
            журнал не записываются.
          </p>
          {aiStatus.map((a, i) => (
            <p key={i}>
              {a.kind === 'drawing' ? 'Чертёж' : 'Чат'} ·{' '}
              {a.status === 'ok'
                ? 'Готово'
                : a.status === 'timeout'
                  ? 'Превышено время ожидания'
                  : a.status === 'invalid_drawing'
                    ? 'ИИ вернул неверные параметры — сохранён чертёж по ответам клиента'
                    : 'Ошибка: ' + a.status}{' '}
              · {(a.duration_ms / 1000).toFixed(1)} с · {date(a.created_at)}
            </p>
          ))}
        </details>
        <details className="crm-operational">
          <summary>Цены из прежних коммерческих предложений</summary>
          <p>
            Справочные значения. Перед новым расчётом подтвердите актуальность.
          </p>
          {quoteReferences.map((q, i) => (
            <p key={i}>
              {q.name} · {q.description} · {money(q.price)}/{q.unit} ·{' '}
              {q.source}
            </p>
          ))}
        </details>
      </main>
      <Sheet
        open={!!draft}
        onOpenChange={(o) => {
          if (!o && !busy) {
            if (
              draft &&
              JSON.stringify(draft) !== original.current &&
              !window.confirm('Закрыть карточку без сохранения изменений?')
            )
              return;
            setDraft(null);
            noteEpoch.current++;
            window.history.replaceState(null, '', '/admin');
          }
        }}
      >
        <SheetContent showCloseButton={false} className="crm-panel">
          <SheetHeader>
            <div>
              <SheetTitle>
                {draft?.id ? 'Карточка заявки' : 'Новая заявка'}
              </SheetTitle>
              <SheetDescription>
                {draft?.id
                  ? 'Создана ' +
                    date(draft.created_at) +
                    (draft.source === 'chat' ? ' · Чат сайта' : ' · Вручную')
                  : 'Контакты клиента и параметры изделия'}
              </SheetDescription>
            </div>
            <SheetClose
              disabled={busy}
              className="crm-close"
              aria-label="Закрыть карточку"
            >
              <X size={22} />
            </SheetClose>
          </SheetHeader>
          {draft && (
            <div className="crm-panel-scroll">
              <form onSubmit={save}>
                <fieldset disabled={busy}>
                  <div className="crm-contact-links">
                    {draft.id && (
                      <Link href={'/admin/stock?lead=' + draft.id}>
                        Расход материалов
                      </Link>
                    )}
                    {draft.phone && (
                      <>
                        <a href={'tel:' + draft.phone}>
                          <Phone size={15} />
                          Позвонить
                        </a>
                        <a
                          href={
                            'https://wa.me/' + draft.phone.replace(/\D/g, '')
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={15} />
                          WhatsApp ↗
                        </a>
                      </>
                    )}
                  </div>
                  <div className="crm-form-grid">
                    {[
                      ['name', 'Имя клиента *'],
                      ['phone', 'Телефон *'],
                      ['product', 'Изделие *'],
                      ['city', 'Город и доставка'],
                      ['size', 'Размеры'],
                      ['quantity', 'Количество'],
                      ['finish', 'Материал и покрытие'],
                      ['drawing', 'Чертёж / пример'],
                      ['deadline', 'Срок изготовления'],
                    ].map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <Input
                          maxLength={600}
                          required={['name', 'phone', 'product'].includes(k)}
                          type={k === 'phone' ? 'tel' : 'text'}
                          value={String(draft[k as keyof Lead] ?? '')}
                          onChange={(e) =>
                            setDraft(editLeadField(draft, k, e.target.value))
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Сумма, ₸
                      <Input
                        type="number"
                        min="0"
                        max="1000000000000"
                        step="1"
                        value={draft.amount}
                        onChange={(e) =>
                          setDraft({ ...draft, amount: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Этап
                      {select(draft.stage, (v) =>
                        setDraft({ ...draft, stage: v }),
                      )}
                    </label>
                  </div>
                  <div>
                    {draftDrawing ? (
                      <>
                        <DrawingPanel
                          spec={draftDrawing}
                          product={draft.product}
                          reference={draft.id?.slice(0, 8).toUpperCase()}
                          leadId={draft.id}
                          onChange={(spec) =>
                            setDraft(
                              withDrawing(draft, { ...spec, origin: 'edited' }),
                            )
                          }
                        />
                        <p className="crm-muted">
                          {draftDrawing.origin === 'alem'
                            ? 'Параметры разобраны ИИ Alem. '
                            : draftDrawing.origin === 'pending'
                              ? 'ИИ готовит чертёж. Откройте карточку повторно через несколько секунд. '
                              : draftDrawing.origin === 'fallback'
                                ? 'ИИ был недоступен: сохранена базовая схема. '
                                : ''}
                          Изменения чертежа применяются кнопкой «Сохранить
                          заявку».
                        </p>
                        {draft.id && (
                          <a href={'/api/crm/drawing?id=' + draft.id}>
                            Скачать сохранённый чертёж ↗
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="drawing-missing">
                        <p>В этой заявке чертёж ещё не создан.</p>
                        <Button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              drawing_spec: JSON.stringify(
                                initialDrawing(
                                  draft.product,
                                  draft.size,
                                  draft.finish,
                                  draft.drawing,
                                ),
                              ),
                            })
                          }
                        >
                          Создать предварительный чертёж
                        </Button>
                      </div>
                    )}
                  </div>
                  <label className="crm-approval">
                    <input
                      type="checkbox"
                      checked={approve}
                      onChange={(e) => setApprove(e.target.checked)}
                    />{' '}
                    Я проверил текущие размеры, чертёж и параметры заказа и
                    согласовал их для изготовления.
                  </label>
                  {draft.id && (
                    <Button
                      type="button"
                      className="crm-secondary"
                      onClick={async () => {
                        if (JSON.stringify(draft) !== original.current) {
                          setPanelError('Сначала сохраните изменения.');
                          return;
                        }
                        if (
                          !window.confirm(
                            'Заново разобрать параметры с помощью ИИ? Текущая версия останется в истории.',
                          )
                        )
                          return;
                        setBusy(true);
                        try {
                          await mutate({
                            action: 'regenerate',
                            id: draft.id,
                            version: draft.version,
                          });
                          const r = await fetch('/api/crm?id=' + draft.id);
                          const d = await r.json();
                          if (d.lead) open(d.lead);
                          await load(true);
                        } catch (e) {
                          setPanelError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Повторить обработку ИИ
                    </Button>
                  )}
                  <h3>Следующее действие</h3>
                  <label>
                    Задача
                    <Input
                      maxLength={600}
                      placeholder="Например, подготовить расчёт"
                      value={draft.next_action}
                      onChange={(e) =>
                        setDraft({ ...draft, next_action: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Дата задачи
                    <Input
                      type="date"
                      value={draft.due_date}
                      onChange={(e) =>
                        setDraft({ ...draft, due_date: e.target.value })
                      }
                    />
                  </label>
                  {draft.next_action && (
                    <Button
                      type="button"
                      className="crm-secondary"
                      onClick={() =>
                        setDraft({ ...draft, next_action: '', due_date: '' })
                      }
                    >
                      Отметить задачу выполненной
                    </Button>
                  )}
                  {panelError && (
                    <p className="crm-error" role="alert">
                      {panelError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="crm-primary crm-save"
                    disabled={busy}
                  >
                    {busy ? 'Сохраняем…' : 'Сохранить заявку'}
                  </Button>
                </fieldset>
              </form>
              {draft.id && (
                <section className="crm-notes">
                  {positions.length > 1 && (
                    <details open>
                      <summary>
                        Позиции этого заказа ({positions.length}) ·{' '}
                        {money(positions.reduce((sum, p) => sum + p.amount, 0))}
                      </summary>
                      {positions.map((p) => (
                        <p key={p.id}>
                          <button
                            type="button"
                            className="crm-client-link"
                            disabled={busy || p.id === draft.id}
                            onClick={async () => {
                              if (
                                JSON.stringify(draft) !== original.current &&
                                !window.confirm(
                                  'Перейти к другой позиции без сохранения изменений?',
                                )
                              )
                                return;
                              setBusy(true);
                              try {
                                const r = await fetch('/api/crm?id=' + p.id, {
                                  cache: 'no-store',
                                });
                                const d = await r.json();
                                if (!r.ok || !d.lead)
                                  throw Error(d.error || 'Позиция не найдена.');
                                open(d.lead);
                              } catch (e) {
                                setPanelError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {p.product}
                          </button>{' '}
                          · {stages.find((s) => s.id === p.stage)?.label} ·{' '}
                          {money(p.amount)}
                        </p>
                      ))}
                    </details>
                  )}
                  {intakeAnswers.length > 0 && (
                    <details>
                      <summary>Исходные ответы клиента</summary>
                      {intakeAnswers.map((value, i) => (
                        <p key={i}>
                          <strong>
                            {
                              [
                                'Изделие',
                                'Размеры',
                                'Количество',
                                'Материал и покрытие',
                                'Конструкция',
                                'Город',
                                'Срок',
                                'Имя',
                                'Телефон',
                              ][i]
                            }
                            :{' '}
                          </strong>
                          {value}
                        </p>
                      ))}
                    </details>
                  )}
                  <details>
                    <summary>История изменений ({history.length})</summary>
                    {history.map((h) => {
                      let d;
                      try {
                        d = JSON.parse(h.snapshot);
                      } catch {
                        return null;
                      }
                      return (
                        <article key={h.id}>
                          <strong>
                            Версия {d.version} ·{' '}
                            {new Date(h.created_at).toLocaleString('ru-RU')}
                          </strong>
                          <p>
                            {stages.find((s) => s.id === d.stage)?.label ||
                              d.stage}{' '}
                            · {d.size} · {d.quantity}
                          </p>
                          <p>{d.finish}</p>
                          {d.drawing_spec && (
                            <a
                              download
                              href={
                                '/api/crm/drawing?' +
                                new URLSearchParams({
                                  id: draft.id,
                                  revision: String(h.id),
                                })
                              }
                            >
                              Скачать чертёж этой версии (SVG)
                            </a>
                          )}
                        </article>
                      );
                    })}
                  </details>
                  <h3>Заметки</h3>
                  <label className="sr-only" htmlFor="crm-note">
                    Новая заметка
                  </label>
                  <Textarea
                    id="crm-note"
                    maxLength={4000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Договорённости с клиентом, детали заказа…"
                    disabled={busy}
                  />
                  <Button
                    className="crm-secondary"
                    onClick={() => void addNote()}
                    disabled={busy || !note.trim()}
                  >
                    Добавить заметку
                  </Button>
                  {noteLoading ? (
                    <p>Загружаем заметки…</p>
                  ) : notes.length ? (
                    notes.map((n) => (
                      <article key={n.id}>
                        <small>{date(n.created_at)}</small>
                        <p>{n.body}</p>
                      </article>
                    ))
                  ) : (
                    <p className="crm-muted">Заметок пока нет.</p>
                  )}
                </section>
              )}
              {draft.id && (
                <section
                  className="mt-6 border-t pt-5 pb-4"
                  aria-label="Документы заявки"
                >
                  <h3 className="mb-3 font-semibold">Документы заявки</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="crm-primary"
                      nativeButton={false}
                      render={
                        <a
                          href={
                            '/api/crm/proposal?' +
                            new URLSearchParams({ id: draft.id, kind: 'kp' })
                          }
                          aria-label="КП"
                          download
                        />
                      }
                      size="lg"
                      disabled={busy || documentBusy !== null}
                      onClick={(event) => {
                        if (JSON.stringify(draft) !== original.current) {
                          event.preventDefault();
                          void downloadDocument('kp');
                        }
                      }}
                    >
                      {documentBusy === 'kp' ? 'Создаём КП…' : 'КП'}
                    </Button>
                    <Button
                      className="crm-secondary"
                      nativeButton={false}
                      render={
                        <a
                          href={
                            '/api/crm/proposal?' +
                            new URLSearchParams({ id: draft.id, kind: 'pp' })
                          }
                          aria-label="ПП"
                          download
                        />
                      }
                      size="lg"
                      variant="outline"
                      disabled={busy || documentBusy !== null}
                      onClick={(event) => {
                        if (JSON.stringify(draft) !== original.current) {
                          event.preventDefault();
                          void downloadDocument('pp');
                        }
                      }}
                    >
                      {documentBusy === 'pp' ? 'Создаём ПП…' : 'ПП'}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    КП — коммерческое предложение · ПП — ценовое предложение.
                    Скачать XLS.
                  </p>
                  {documentError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {documentError}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
