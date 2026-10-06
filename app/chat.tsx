'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { draftKey, restoreDraft } from '@/lib/chat/draft.mjs';
import {
  isQuestion,
  isRecommendationAnswer,
  intakeError,
  catalogMatch,
} from '@/lib/chat/intake.mjs';
import data from './content.json';
import { responseKey, uniqueChatNote } from '@/lib/ai/chat-response.mjs';
import CatalogCard from './catalog-card';
import SubmitEnquiry from './submit-enquiry';
import type { DrawingSpec } from './drawing-panel';
import { catalogModels } from '@/lib/drawings/catalog.mjs';
import {
  messages,
  questionsFor,
  productTitlesKk,
  type ChatLanguage,
} from './chat-i18n';
export default function Chat() {
  const [language, setLanguage] = useState<ChatLanguage>('ru');
  const t = messages[language],
    baseQuestions = questionsFor(language);
  const [open, setOpen] = useState(false),
    [answers, setAnswers] = useState<string[]>([]),
    [value, setValue] = useState(''),
    [error, setError] = useState('');
  const [ai, setAi] = useState(false);
  const [catalogHint, setCatalogHint] = useState(false);
  const [drawingSpec, setDrawingSpec] = useState<DrawingSpec | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const noteCache = useRef(new Map<string, string>());
  const conversationVersion = useRef(0);
  const [requestId, setRequestId] = useState('');
  const [orderGroup, setOrderGroup] = useState('');
  const [contact, setContact] = useState<string[]>([]);
  const [savedLead, setSavedLead] = useState('');
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const needsPhone = !phone || editingPhone;
  const phoneQuestion =
    language === 'kk'
      ? 'Алдымен телефон нөміріңізді көрсетіңіз. Сауалнамадан кейін тапсырыс менеджерге автоматты түрде жіберіледі.'
      : 'Сначала укажите номер телефона. После опроса заявка автоматически поступит менеджеру в CRM.';
  const [hydrated, setHydrated] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const questions = questionsFor(language, answers[0]);
  const done = answers.length === baseQuestions.length;
  const phoneLocked =
    done || !!savedLead || !!drawingSpec || contact.length > 0;
  const phoneHelp =
    language === 'kk'
      ? 'Рәсімделген тапсырыстың телефонын менеджер CRM жүйесінде өзгертеді. Жаңа тапсырыс үшін «Қайта бастау» түймесін басыңыз.'
      : 'Телефон оформленного заказа меняет менеджер в CRM. Для нового заказа с другим номером нажмите «Начать заново».';
  const [consultation, setConsultation] = useState('');
  const [asking, setAsking] = useState(false);
  const questionEpoch = useRef(0);
  useEffect(() => {
    let d;
    try {
      d = restoreDraft(sessionStorage.getItem(draftKey));
    } catch {}
    if (d) {
      setAnswers(d.answers);
      setValue(d.value);
      setRequestId(d.requestId);
      setDrawingSpec(d.spec);
      setOrderGroup(d.orderGroup);
      setContact(d.contact);
      setPhone(d.phone);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          answers,
          value,
          requestId,
          spec: drawingSpec,
          orderGroup,
          contact,
          phone,
        }),
      );
    } catch {}
  }, [
    hydrated,
    answers,
    value,
    requestId,
    drawingSpec,
    orderGroup,
    contact,
    phone,
  ]);
  useEffect(() => {
    try {
      if (localStorage.getItem('facade-chat-language') === 'kk')
        setLanguage('kk');
    } catch {}
  }, []);
  function changeLanguage(next: ChatLanguage) {
    questionEpoch.current++;
    setConsultation('');
    setLanguage(next);
    setError('');
    try {
      localStorage.setItem('facade-chat-language', next);
    } catch {}
  }
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('facade:open-chat', openChat);
    return () => window.removeEventListener('facade:open-chat', openChat);
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [answers, open]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              description: string;
              inputSchema: unknown;
              annotations: unknown;
              execute: (input: unknown) => { opened: boolean };
            },
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'start_product_enquiry',
          description:
            'Open the product enquiry chat. Does not submit or send any data.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== 'object' ||
              Object.keys(input).length
            )
              throw new Error('Expected empty object');
            setOpen(true);
            return { opened: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => setAi(d.configured === true))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!open || !ai || answers.length === 0 || answers.length > 6) return;
    const key = responseKey(language, answers);
    if (noteCache.current.has(key)) return;
    const controller = new AbortController(),
      version = conversationVersion.current;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, language }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (
          controller.signal.aborted ||
          version !== conversationVersion.current ||
          d.step !== answers.length ||
          d.language !== language
        )
          return;
        const prior = answers.map(
          (_, i) =>
            noteCache.current.get(responseKey(language, answers.slice(0, i))) ||
            '',
        );
        const note = uniqueChatNote(
          typeof d.note === 'string' ? d.note : '',
          prior,
        );
        noteCache.current.set(key, note);
        setNotes((prev) => ({ ...prev, [key]: note }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, ai, answers, language]);
  async function answer(v: string) {
    if (asking || !hydrated) return;
    if (needsPhone) {
      if (!/^[+\d\s()-]{7,25}$/.test(v) || v.replace(/\D/g, '').length < 7) {
        setError(t.phone);
        return;
      }
      setPhone(v.trim());
      setEditingPhone(false);
      if (answers.length >= 8) setAnswers([...answers.slice(0, 8), v.trim()]);
      if (contact.length === 4) setContact([...contact.slice(0, 3), v.trim()]);
      if (!requestId) {
        const id = crypto.randomUUID();
        setRequestId(id);
        if (!orderGroup) setOrderGroup(id);
      }
      setValue('');
      setError('');
      return;
    }
    if (
      v.trim() &&
      isQuestion(v) &&
      !isRecommendationAnswer(answers.length, v) &&
      answers.length < 7
    ) {
      setAsking(true);
      setError('');
      const epoch = ++questionEpoch.current;
      try {
        const r = await fetch('/api/chat/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: v,
            answers: answers.slice(0, 6),
            language,
          }),
          signal: AbortSignal.timeout(28000),
        });
        const result = await r.json();
        if (!r.ok) throw Error(result.error);
        if (epoch === questionEpoch.current) setConsultation(result.answer);
      } catch {
        setConsultation(
          language === 'kk'
            ? 'Сұрақты менеджерге WhatsApp арқылы жібере аласыз.'
            : 'Не удалось получить ответ. Можно продолжить оформление или задать вопрос менеджеру в WhatsApp.',
        );
      } finally {
        setAsking(false);
      }
      setValue('');
      return;
    }
    const invalid = intakeError(answers.length, v, answers, language);
    if (invalid) {
      setError(invalid);
      return;
    }
    setConsultation('');
    if (
      /^(?:каталогты\s+(?:көрсет(?:іңіз)?|аш(?:ыңыз)?|жібер(?:іңіз)?)|каталог)[?!.,\s]*$/i.test(
        v.trim(),
      ) ||
      /^(?:покажи(?:те)?\s+|открой(?:те)?\s+|пришли(?:те)?\s+|дай(?:те)?\s+|можно\s+)?каталог[?!.,\s]*$/i.test(
        v.trim(),
      )
    ) {
      setCatalogHint(true);
      setValue('');
      setError('');
      return;
    }
    setCatalogHint(false);
    const e = !v.trim()
      ? t.empty
      : v.length > 600
        ? t.long
        : answers.length === 8 &&
            (!/^[+\d\s()-]{7,25}$/.test(v) || v.replace(/\D/g, '').length < 7)
          ? t.phone
          : '';
    if (e) {
      setError(e);
      return;
    }
    if (!requestId) {
      const id = crypto.randomUUID();
      setRequestId(id);
      if (!orderGroup) setOrderGroup(id);
    }
    const model = answers.length === 0 ? catalogMatch(v) : null;
    const next = [
      ...answers,
      model
        ? model.name + ' (PDF-' + String(model.page).padStart(2, '0') + ')'
        : v.trim(),
    ];
    if (next.length === 5 && contact.length === 4) next.push(...contact);
    if (next.length === 8) next.push(phone);
    setAnswers(next);
    if (next.length === questions.length) setDrawingSpec(null);
    setValue('');
    setError('');
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="chat-launch">
        {t.launch} <span>↗</span>
      </SheetTrigger>
      <SheetContent
        className="chat-panel"
        lang={language}
        showCloseButton={false}
      >
        <SheetHeader className="chat-heading">
          <div>
            <SheetTitle>Facade Kazahstan</SheetTitle>
            <SheetDescription>{t.subtitle}</SheetDescription>
          </div>
          <SheetClose className="chat-close" aria-label={t.close}>
            ×
          </SheetClose>
        </SheetHeader>
        <div className="chat-language" role="group" aria-label={t.language}>
          <span>{t.language}</span>
          <div>
            <button
              type="button"
              lang="ru"
              aria-pressed={language === 'ru'}
              onClick={() => changeLanguage('ru')}
            >
              Рус
            </button>
            <button
              type="button"
              lang="kk"
              aria-pressed={language === 'kk'}
              onClick={() => changeLanguage('kk')}
            >
              Қаз
            </button>
          </div>
        </div>
        <div className="chat-scroll">
          <div className="bubble bot">{t.welcome}</div>
          {phone && !needsPhone && (
            <div className="bubble user">
              {phone}{' '}
              {!phoneLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPhone(true);
                    setValue(phone);
                  }}
                >
                  {t.edit}
                </button>
              )}
            </div>
          )}
          {phone && phoneLocked && <p className="chat-mode">{phoneHelp}</p>}
          {needsPhone ? (
            <QuestionBubble question={phoneQuestion} step={0} />
          ) : (
            <>
              <CatalogCard language={language} />
              {catalogHint && (
                <p className="bubble bot" role="status">
                  {t.catalogHint}
                </p>
              )}
              <p className="chat-mode">{ai ? t.ai : t.fallback}</p>
              {asking && (
                <p className="bubble bot" role="status">
                  {language === 'kk'
                    ? 'Жауап дайындап жатырмын…'
                    : 'Готовлю ответ…'}
                </p>
              )}
              {consultation && (
                <p className="bubble bot" role="status">
                  {consultation}
                </p>
              )}
              {answers.slice(0, 8).map((a, i) => (
                <div key={i}>
                  <QuestionBubble
                    question={questions[i].question}
                    note={notes[responseKey(language, answers.slice(0, i))]}
                    step={i}
                  />
                  <p className="bubble user">{a}</p>
                </div>
              ))}
              {!done ? (
                <>
                  <p className="chat-step">
                    {t.step(
                      answers.length + (contact.length ? 1 : 2),
                      contact.length && answers.length < 5
                        ? 5
                        : questions.length,
                    )}
                  </p>
                  <QuestionBubble
                    question={questions[answers.length].question}
                    note={notes[responseKey(language, answers)]}
                    step={answers.length}
                  />
                  {answers.length === 0 && (
                    <details className="chat-photo-picker">
                      <summary>{language === 'kk' ? 'Каталогтағы фото бойынша таңдау' : 'Выбрать товар по фото каталога'}</summary>
                      <div className="chat-photo-options">
                        {catalogModels.map(model=><button key={model.id} type="button" onClick={()=>answer(model.name+' (PDF-'+String(model.page).padStart(2,'0')+')')}>
                          <img src={model.image} alt={model.name} loading="lazy" />
                          <span>{language === 'kk' ? 'Бет' : 'Стр.'} {model.page} · {model.name}</span>
                        </button>)}
                      </div>
                    </details>
                  )}
                  {answers.length === 0 && (
                    <div className="chat-options">
                      {data.catalog.map((c) => (
                        <button
                          key={c.href}
                          onClick={() =>
                            answer(
                              language === 'kk'
                                ? productTitlesKk[c.href] || c.title
                                : c.title,
                            )
                          }
                        >
                          {language === 'kk'
                            ? productTitlesKk[c.href] || c.title
                            : c.title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="bubble bot">{t.thanks}</p>
                  <dl className="chat-summary">
                    {questions.map((q, i) => (
                      <div key={q.key}>
                        <dt>{q.label}</dt>
                        <dd>
                          {answers[i]}{' '}
                          {i !== 8 && (
                            <button
                              aria-label={t.edit + ': ' + q.label}
                              onClick={() => {
                                if (i === 8) {
                                  setEditingPhone(true);
                                  setValue(phone);
                                  return;
                                }
                                setAnswers(answers.slice(0, i));
                                setValue(answers[i]);
                              }}
                            >
                              {t.edit}
                            </button>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <SubmitEnquiry
                    language={language}
                    key={JSON.stringify(answers)}
                    answers={answers}
                    requestId={requestId}
                    orderGroup={orderGroup || requestId}
                    onSaved={setSavedLead}
                    spec={drawingSpec}
                    onSpecChange={setDrawingSpec}
                  />
                  <button
                    className="chat-reset"
                    disabled={!savedLead}
                    onClick={() => {
                      conversationVersion.current++;
                      noteCache.current.clear();
                      setNotes({});
                      setContact(answers.slice(5, 9));
                      setOrderGroup(orderGroup || requestId);
                      setRequestId('');
                      setSavedLead('');
                      setDrawingSpec(null);
                      setAnswers([]);
                      setValue('');
                      setError('');
                    }}
                  >
                    {language === 'kk'
                      ? 'Осы тапсырысқа тағы бұйым қосу'
                      : 'Добавить изделие к этому заказу'}
                  </button>
                  <button
                    className="chat-reset"
                    onClick={() => {
                      conversationVersion.current++;
                      noteCache.current.clear();
                      setNotes({});
                      setRequestId('');
                      setOrderGroup('');
                      setContact([]);
                      setPhone('');
                      setSavedLead('');
                      setDrawingSpec(null);
                      setAnswers([]);
                      setValue('');
                      setError('');
                    }}
                  >
                    {t.restart}
                  </button>
                </>
              )}
            </>
          )}
          <div ref={bottom} />
        </div>
        {(!done || needsPhone) && (
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void answer(value);
            }}
          >
            <label className="sr-only" htmlFor="chat-answer">
              {t.answer}
            </label>
            <input
              id="chat-answer"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={600}
              type={needsPhone ? 'tel' : 'text'}
              autoComplete={needsPhone ? 'tel' : 'off'}
              placeholder={needsPhone ? '+7 …' : t.placeholder}
            />
            <button
              aria-label={t.send}
              type="submit"
              disabled={asking || !hydrated}
            >
              ↑
            </button>
            {error && <p role="alert">{error}</p>}
            {answers.length > 0 && !needsPhone && (
              <button
                type="button"
                className="chat-back"
                onClick={() => {
                  setValue(answers[answers.length - 1]);
                  setAnswers(answers.slice(0, -1));
                  setError('');
                }}
              >
                {t.back}
              </button>
            )}
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QuestionBubble({
  question,
  note,
  step,
}: {
  question: string;
  note?: string;
  step: number;
}) {
  return (
    <div className="bubble bot" data-question-step={step}>
      {note && <p className="chat-question-note">{note}</p>}
      <p className="chat-question-text">{question}</p>
    </div>
  );
}
