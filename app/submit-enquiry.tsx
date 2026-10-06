'use client';
import { useEffect, useRef, useState } from 'react';
import { messages, localizedSummary, type ChatLanguage } from './chat-i18n';
import DrawingPanel, { type DrawingSpec } from './drawing-panel';
import { cleanDrawing } from '@/lib/drawings/model.mjs';
export default function SubmitEnquiry({
  answers,
  requestId,
  orderGroup,
  onSaved,
  spec,
  onSpecChange,
  language = 'ru',
}: {
  language?: ChatLanguage;
  answers: string[];
  requestId: string;
  orderGroup: string;
  onSaved: (id: string) => void;
  spec: DrawingSpec | null;
  onSpecChange: (spec: DrawingSpec) => void;
}) {
  const t = messages[language];
  const [saved, setSaved] = useState(''),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const queue = useRef(Promise.resolve()),
    lastSaved = useRef(''),
    lastId = useRef('');
  useEffect(() => {
    let active = true;
    setError('');
    const payload = spec ? JSON.stringify(cleanDrawingSafe(spec)) : '';
    if (payload && payload === lastSaved.current) {
      setSaved(lastId.current);
      onSaved(lastId.current);
      return;
    }
    setSaved('');
    onSaved('');
    const timer = setTimeout(
      () => {
        queue.current = queue.current
          .catch(() => {})
          .then(async () => {
            if (!active) return;
            try {
              const body = spec
                ? {
                    answers,
                    requestId,
                    orderGroup,
                    consent: true,
                    drawingSpec: cleanDrawing(spec),
                  }
                : {
                    answers,
                    requestId,
                    orderGroup,
                    consent: true,
                    prepareDrawing: true,
                  };
              let result: {
                id: string;
                error?: string;
                pending?: boolean;
                drawingSpec?: unknown;
              } = { id: '' };
              for (let n = 0; n < 12; n++) {
                if (!active) return;
                const r = await fetch('/api/enquiries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                  signal: AbortSignal.timeout(32000),
                });
                result = await r.json();
                if (!r.ok)
                  throw new Error(
                    result.error || 'Не удалось сохранить заявку.',
                  );
                if (!result.pending) break;
                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
              if (result?.pending) throw new Error('pending');
              if (!active) return;
              const completed =
                spec || (cleanDrawing(result.drawingSpec) as DrawingSpec);
              lastSaved.current = JSON.stringify(cleanDrawing(completed));
              lastId.current = result.id;
              setSaved(result.id);
              onSaved(result.id);
              if (!spec) onSpecChange(completed);
            } catch (e) {
              if (active)
                setError(
                  (e as Error).message === 'pending' ? 'pending' : 'save',
                );
            }
          });
      },
      spec ? 650 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [answers, requestId, spec, attempt, onSpecChange, orderGroup, onSaved]);
  return (
    <div className="enquiry-submit">
      {spec ? (
        <>
          <DrawingPanel
            language={language}
            spec={spec}
            product={answers[0]}
            onChange={(s) => onSpecChange({ ...s, origin: 'edited' })}
            reference={saved.slice(0, 8).toUpperCase()}
          />
          {spec.origin === 'alem' && <p className="chat-mode">{t.analyzed}</p>}
          {['fallback', 'pending'].includes(spec.origin || '') && (
            <p className="drawing-warning">{t.drawingFallback}</p>
          )}
        </>
      ) : (
        <p className="bubble bot" role="status">
          {t.preparing}
        </p>
      )}
      {saved ? (
        <>
          <p className="bubble bot" role="status">
            {t.saved}
            {saved.slice(0, 8).toUpperCase()}.
          </p>
          <a
            className="button"
            target="_blank"
            rel="noreferrer"
            href={
              'https://wa.me/77765773666?text=' +
              encodeURIComponent(
                localizedSummary(answers, language) +
                  '\n' +
                  t.reference +
                  saved.slice(0, 8).toUpperCase(),
              )
            }
          >
            {t.whatsapp}
          </a>
          <p className="chat-mode">{t.autosave}</p>
        </>
      ) : error ? (
        <>
          <p role="alert">{error === 'pending' ? t.pending : t.saveError}</p>
          <button className="button" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
          <a href="https://wa.me/77765773666" target="_blank" rel="noreferrer">
            {t.contact}
          </a>
        </>
      ) : spec ? (
        <p className="bubble bot" role="status">
          {t.saving}
        </p>
      ) : null}
    </div>
  );
}
function cleanDrawingSafe(spec: DrawingSpec) {
  try {
    return cleanDrawing(spec);
  } catch {
    return spec;
  }
}
