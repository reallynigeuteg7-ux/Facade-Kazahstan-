'use client';
import {
  detailFields,
  detailKeys,
  zeroDetailFields,
} from '@/lib/drawings/templates.mjs';
import { resolveEditedWarnings } from '@/lib/drawings/edit.mjs';
import { useMemo, useState, useEffect, useRef } from 'react';
import SolidViewer from './solid-viewer';
import {
  defaultCamera,
  exportObj,
  sceneGeometry,
} from '@/lib/drawings/scene.mjs';
import { assemblyGeometry } from '@/lib/drawings/render.mjs';
import {
  constructionForms,
  constructionFields,
} from '@/lib/drawings/assembly.mjs';
import { drawingText } from '@/lib/drawings/locale.mjs';
import type { ChatLanguage } from './chat-i18n';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  drawingKinds,
  dimensionFields,
  cleanDrawing,
  missingDimensions,
} from '@/lib/drawings/model.mjs';
import { renderInteractiveSheet, renderDrawingPages } from '@/lib/drawings/render.mjs';
import { catalogModels, catalogModelById, catalogFromText, selectCatalogModel } from '@/lib/drawings/catalog.mjs';
export type DrawingSpec = {
  catalogModel?: string | null;
  details?: Record<string, number | null>;
  clearHeight?: number | null;
  warnings?: string[];
  origin?: string;
  version: 1;
  kind: string;
  dimensions: Record<string, number | null>;
  notes: string;
  construction?: {
    form: string;
    bandWidth: number | null;
    bandHeight: number | null;
    postSize: number | null;
    postDepth?: number | null;
    postDiameter?: number | null;
    straightSpans: number[];
    arcSegments: number | null;
  };
};
export default function DrawingPanel({
  spec,
  product,
  onChange,
  reference = '',
  language = 'ru',
  leadId,
}: {
  language?: ChatLanguage;
  spec: DrawingSpec;
  product: string;
  onChange: (spec: DrawingSpec) => void;
  reference?: string;
  leadId?: string;
}) {
  const catalogRef = catalogModelById(spec.catalogModel === 'none' ? null : spec.catalogModel ?? catalogFromText(product+'; '+spec.notes));
  const [page, setPage] = useState(catalogRef ? 1 : 0);
  const [technicalOpen, setTechnicalOpen] = useState(!leadId || !!catalogRef);
  const [camera, setCamera] = useState(catalogRef ? {...defaultCamera,yaw:35,elevation:30} : defaultCamera);
  const [visual, setVisual] = useState({ ready: false, configured: false, loading: false, busy: false, error: '', version: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    yaw: number;
    elevation: number;
  } | null>(null);
  const tr = (text: string) => drawingText(text, language);
  useEffect(() => {
    if (!leadId) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/crm/visual?id=${encodeURIComponent(leadId)}&status=1`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'Не удалось проверить эскиз.');
        if (active) setVisual((current) => ({ ...current, ready: result.ready === true, configured: result.configured === true, loading: false, error: '' }));
      } catch (error) {
        if (active) setVisual((current) => ({ ...current, loading: false, error: (error as Error).message }));
      }
    };
    setVisual((current) => ({ ...current, ready: false, loading: true, error: '' }));
    void check();
    const timer = window.setInterval(check, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [leadId]);
  async function createVisual() {
    if (!leadId || visual.busy) return;
    setVisual((current) => ({ ...current, busy: true, error: '' }));
    try {
      const response = await fetch('/api/crm/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Не удалось создать эскиз.');
      setVisual((current) => ({ ...current, busy: false, ready: true, version: current.version + 1 }));
    } catch (error) {
      setVisual((current) => ({ ...current, busy: false, error: (error as Error).message }));
    }
  }
  const fixedPreview = useMemo(() => {
    try {
      const valid = cleanDrawing(spec);
      return {
        pages: renderDrawingPages(valid, product, reference, language),
        svg: '',
        hasModel: sceneGeometry(assemblyGeometry(valid)).faces.length > 0,
        missing: missingDimensions(valid),
        error: '',
      };
    } catch (e) {
      return { pages: [], svg: '', missing: [], error: (e as Error).message };
    }
  }, [spec, product, reference, language]);
  const preview = useMemo(() => {
    if(fixedPreview.error || !fixedPreview.pages.length)return fixedPreview;
    if(catalogRef?.blueprint?.solidRevision)return fixedPreview;
    return {...fixedPreview,pages:fixedPreview.pages.map((p,i)=>i===0?{...p,svg:renderInteractiveSheet(spec,product,reference,language,camera,fixedPreview.pages.length)}:p)};
  },[fixedPreview,spec,product,reference,language,camera]);
  const construction = spec.construction || {
    form: 'unspecified',
    bandWidth: null,
    bandHeight: null,
    postSize: null,
    straightSpans: [],
    arcSegments: null,
  };
  function updateConstruction(
    patch: Partial<NonNullable<DrawingSpec['construction']>>,
  ) {
    onChange(
      resolveEditedWarnings(
        {
          ...spec,
          construction: { ...construction, ...patch },
          dimensions:
            patch.bandHeight !== undefined && spec.clearHeight
              ? {
                  ...spec.dimensions,
                  height: patch.bandHeight
                    ? patch.bandHeight + spec.clearHeight
                    : null,
                }
              : spec.dimensions,
        },
        Object.keys(patch),
      ),
    );
  }
  function updateDimension(key: string, value: number | null) {
    onChange({
      ...spec,
      dimensions: { ...spec.dimensions, [key]: value },
      clearHeight:
        key === 'height' && spec.clearHeight && construction.bandHeight
          ? value
            ? value - construction.bandHeight
            : null
          : spec.clearHeight,
    });
  }
  function print() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.opener = null;
    win.document.title = 'Facade - ' + reference;
    const style = win.document.createElement('style');
    style.textContent =
      '@page{size:A4 landscape;margin:8mm}body{margin:0;font:13px Arial,sans-serif;color:#20394a}section{break-after:page}section:last-child{break-after:auto}svg{width:100%;height:auto;display:block}.concept img{display:block;width:100%;max-height:172mm;object-fit:contain}.concept p{margin:4mm 0}@media print{section{height:190mm;display:flex;align-items:center;justify-content:center;flex-direction:column}svg{max-height:190mm}}';
    win.document.head.append(style);
    let conceptImage: HTMLImageElement | undefined;
    const printImages: HTMLImageElement[] = [];
    if (leadId && visual.ready) {
      const concept = win.document.createElement('section');
      concept.className = 'concept';
      conceptImage = win.document.createElement('img');
      conceptImage.src = `${window.location.origin}/api/crm/visual?id=${encodeURIComponent(leadId)}`;
      printImages.push(conceptImage);
      conceptImage.alt = 'Визуальный эскиз изделия';
      concept.append(conceptImage);
      const warning = win.document.createElement('p');
      warning.textContent = 'Визуальный эскиз для согласования. Не является производственным чертежом. Размеры — на следующих листах.';
      concept.append(warning);
      win.document.body.append(concept);
    }
    for (const p of renderDrawingPages(
      cleanDrawing(spec),
      product,
      reference,
      language,
      { ...camera, zoom: 1 },
    )) {
      const sheet = win.document.createElement('section');
      sheet.innerHTML = p.svg;
      win.document.body.append(sheet);
    }
    win.focus();
    if(catalogRef?.blueprint){
      const source=win.document.createElement('section');source.className='concept';
      const label=win.document.createElement('p');label.textContent='Оригинал шаблона заказчика — без пересчёта. Размеры на этом листе относятся к образцу.';
      const image=win.document.createElement('img');image.src=window.location.origin+catalogRef.blueprint.image;image.alt='Оригинал шаблона';
      source.append(label,image);win.document.body.append(source);printImages.push(image);
    }
    Promise.all(printImages.map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.onload=()=>resolve();image.onerror=()=>resolve();}))).then(()=>setTimeout(()=>win.print(),300));
  }
  function download() {
    const svg = page === 0 && catalogRef?.blueprint?.solidRevision
      ? renderInteractiveSheet(cleanDrawing(spec),product,reference,language,camera,preview.pages.length)
      : preview.pages[page]?.svg || preview.svg;
    const url = URL.createObjectURL(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download =
      'facade-drawing' +
      (reference ? '-' + reference.slice(0, 8) : '') +
      '-sheet-' + (page + 1) + '.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function downloadModel() {
    const url = URL.createObjectURL(
      new Blob([exportObj(assemblyGeometry(spec))], {
        type: 'text/plain;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'facade-model-' + (reference || '3d') + '.obj';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="drawing-panel"
      aria-label={tr('Предварительный чертёж')}
    >
      <div className="drawing-heading">
        <h3>{tr('3D-чертёж заказа')}</h3>
        <span>{tr('Предварительный')}</span>
      </div>
      <p>
        {tr(
          'Уточните размеры в миллиметрах. Чертёж перестроится автоматически.',
        )}
      </p>
      <div className="drawing-catalog-reference">
        <label>
          {language === 'kk' ? 'Каталогтағы үлгі' : 'Основа чертежа · шаблон товара'}
          <Select value={catalogRef?.id || 'none'} onValueChange={(value) => {
            if(value) { setPage(value==='none'?0:1); setTechnicalOpen(true); onChange(selectCatalogModel(spec,value)); }
          }}>
            <SelectTrigger className="drawing-select"><SelectValue>{catalogRef?.name || (language === 'kk' ? 'Каталог үлгісі таңдалмаған' : 'Модель каталога не выбрана')}</SelectValue></SelectTrigger>
            <SelectContent className="drawing-options">
              <SelectItem value="none">{language === 'kk' ? 'Жеке құрылым' : 'Индивидуальная конструкция'}</SelectItem>
              {catalogRef && !catalogModels.some((model)=>model.id===catalogRef.id) && <SelectItem value={catalogRef.id}>Стр. {catalogRef.page} · {catalogRef.name} · прежняя версия</SelectItem>}
              {catalogModels.map((model)=><SelectItem key={model.id} value={model.id}>Стр. {model.page} · {model.name} · {model.blueprint?'шаблон':'по фото'}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        {catalogRef && <figure>
          <a href={catalogRef.image} target="_blank" rel="noreferrer"><img src={catalogRef.image} alt={catalogRef.name} /></a>
          <figcaption>{language === 'kk' ? 'Фотодағы пішін · ішкі пропорциялар алдын ала. Өлшемдер өзгергенде барлық көріністер жаңарады.' : catalogRef.blueprint?'Товар каталога. Чертёж строится по подготовленному шаблону ниже.':'Форма по фото · внутренние пропорции предварительные. При изменении размеров обновляются все виды и 3D.'}</figcaption>
        </figure>}
        {catalogRef?.blueprint && <div className="drawing-blueprint-source">
          <p>Шаблон: изображение {catalogRef.blueprint.attachment}. Исходные размеры {catalogRef.blueprint.base.width} × {catalogRef.blueprint.base.height} × {catalogRef.blueprint.base.depth} мм. Сечения сохраняются при пересчёте.</p>
          {catalogRef.blueprint.dimensionScope==='bench' && <p>W/H/D относятся к скамейке. Урна: 500×700×500 мм. Столбик: 120×1000×120 мм; основание 200 мм.</p>}
          <details><summary>Оригинальный чертёж заказчика</summary><a href={catalogRef.blueprint.image} target="_blank" rel="noreferrer"><img loading="lazy" src={catalogRef.blueprint.image} alt={`Исходный шаблон: ${catalogRef.name}`} /></a><p>Оригинал сохранён без изменений. Размеры на нём относятся к образцу.</p><a href={catalogRef.blueprint.image} download>Скачать оригинал PNG</a></details>
        </div>}
      </div>
      {preview.error ? (
        <p role="alert" className="drawing-warning">
          {language === 'kk'
            ? tr(
                'Проверьте размеры: они должны быть положительными и не превышать допустимые значения.',
              )
            : preview.error}
        </p>
      ) : (
        <>
          {preview.missing.length > 0 && (
            <p className="drawing-warning">
              {tr('Нужно уточнить: ')}
              {preview.missing.map(tr).join(', ')}
              {tr('. Неизвестные размеры отмечены знаком «?».')}
            </p>
          )}
          {leadId && (visual.ready || visual.configured) && (
            <section className="drawing-ai-visual" aria-label="Визуальный эскиз OpenAI">
              <div className="drawing-ai-visual-head">
                <div>
                  <strong>Визуальный эскиз OpenAI</strong>
                  <p>Иллюстрация изделия для согласования. Точные размеры читайте в параметрах заказа; изображение не является производственным чертежом.</p>
                </div>
                {visual.ready && (
                  <a className="drawing-download" href={`/api/crm/visual?id=${encodeURIComponent(leadId)}&v=${visual.version}`} download={`facade-visual-${reference || leadId}.png`}>Скачать PNG</a>
                )}
              </div>
              {visual.ready ? (
                <img className="drawing-ai-visual-image" src={`/api/crm/visual?id=${encodeURIComponent(leadId)}&v=${visual.version}`} alt={`Визуальный эскиз: ${product}`} />
              ) : visual.loading ? (
                <p>Проверяю готовность эскиза…</p>
              ) : visual.configured ? (
                <div className="drawing-ai-visual-empty">
                  <p>Эскиз ещё создаётся или не был создан для этой заявки.</p>
                  <button type="button" className="drawing-download" disabled={visual.busy} onClick={createVisual}>{visual.busy ? 'OpenAI создаёт эскиз…' : 'Создать эскиз OpenAI'}</button>
                </div>
              ) : (
                <p>Для генерации добавьте OPENAI_API_KEY в Production-переменные Vercel.</p>
              )}
              {!visual.ready && spec.kind === 'bench' && (
                <figure className="drawing-ai-reference">
                  <img src="/drawing-reference/bench-layout.png" alt="Предоставленный образец оформления листа скамейки" />
                  <figcaption>Ваш образец оформления. Это не эскиз текущей заявки.</figcaption>
                </figure>
              )}
              {visual.error && <p role="alert" className="drawing-warning">{visual.error}</p>}
            </section>
          )}
          <details className="drawing-technical" open={technicalOpen} onToggle={(event)=>setTechnicalOpen(event.currentTarget.open)}>
            <summary>{catalogRef ? (language==='kk'?'Сызба және 3D':catalogRef.blueprint?'Чертёж по шаблону и 3D':'Чертёж по фото и 3D') : 'Габаритная схема и технические данные'}</summary>
          <div
            className="drawing-pages"
            role="group"
            aria-label={tr('Листы чертежа')}
          >
            {preview.pages.map((p, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={Math.min(page, preview.pages.length - 1) === i}
                onClick={() => setPage(i)}
              >
                {i + 1}. {p.title.replace(/^\d+ \/ /, '')}
              </button>
            ))}
          </div>
          <div className="drawing-viewer" ref={viewport}>
            {page!==0 && <div className="drawing-camera"><button type="button" onClick={()=>{
              if(document.fullscreenElement) void document.exitFullscreen();
              else void viewport.current?.requestFullscreen().catch(()=>{});
            }}>{tr('На весь экран')}</button></div>}
            {page === 0 && (
              <div
                className="drawing-camera"
                role="group"
                aria-label={tr('Управление 3D')}
              >
                {[
                  [tr('Как в образце'), 0, 48],
                  [tr('Изометрия'), 35, 30],
                  [tr('Сверху'), 0, 89.9],
                  [tr('Спереди'), 0, 0],
                  [tr('Справа'), 90, 0],
                  [tr('Слева'), -90, 0],
                  [tr('Сзади'), 180, 0],
                  [tr('Снизу'), 0, -89.9],
                ].map(([title, yaw, elevation]) => (
                  <button
                    type="button"
                    key={title}
                    onClick={() =>
                      setCamera({
                        ...camera,
                        yaw: Number(yaw),
                        elevation: Number(elevation),
                        zoom: 1,
                      })
                    }
                  >
                    {title}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={camera.dimensions}
                  onClick={() =>
                    setCamera({ ...camera, dimensions: !camera.dimensions })
                  }
                >
                  {tr('Размеры')}
                </button>
                <button type="button" onClick={() => setCamera(defaultCamera)}>
                  {tr('Сбросить вид')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement)
                      void document.exitFullscreen();
                    else
                      void viewport.current
                        ?.requestFullscreen()
                        .catch(() => {});
                  }}
                >
                  {tr('На весь экран')}
                </button>
                <label>
                  {tr('Масштаб')}
                  <input
                    aria-label={tr('Масштаб 3D')}
                    type="range"
                    min="55"
                    max="160"
                    value={Math.round(camera.zoom * 100)}
                    onChange={(e) =>
                      setCamera({
                        ...camera,
                        zoom: Number(e.target.value) / 100,
                      })
                    }
                  />
                  <span>{Math.round(camera.zoom * 100)}%</span>
                </label>
              </div>
            )}
            <div
              className={
                'drawing-preview' + (page === 0 ? ' drawing-orbit' : '')
              }
              role="slider"
              aria-valuemin={-180}
              aria-valuemax={180}
              aria-valuenow={Math.round(
                ((((camera.yaw + 180) % 360) + 360) % 360) - 180,
              )}
              aria-valuetext={
                Math.round(camera.yaw) +
                '°, ' +
                Math.round(camera.elevation) +
                '°'
              }
              aria-label={tr(
                '3D-модель: перетаскивайте для вращения, используйте стрелки клавиатуры',
              )}
              tabIndex={page === 0 ? 0 : -1}
              onPointerDown={(e) => {
                if (page !== 0 || e.button !== 0) return;
                drag.current = {
                  id: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                  yaw: camera.yaw,
                  elevation: camera.elevation,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const start = drag.current;
                if (!start || start.id !== e.pointerId) return;
                setCamera((c) => ({
                  ...c,
                  yaw: start.yaw + (e.clientX - start.x) * 0.35,
                  elevation: Math.max(
                    -89.9,
                    Math.min(
                      89.9,
                      start.elevation + (e.clientY - start.y) * 0.3,
                    ),
                  ),
                }));
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => {
                if (
                  page !== 0 ||
                  ![
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                  ].includes(e.key)
                )
                  return;
                e.preventDefault();
                if (e.key === 'Home') setCamera(defaultCamera);
                else
                  setCamera((c) => ({
                    ...c,
                    yaw:
                      c.yaw +
                      (e.key === 'ArrowLeft'
                        ? -10
                        : e.key === 'ArrowRight'
                          ? 10
                          : 0),
                    elevation: Math.max(
                      -89.9,
                      Math.min(
                        89.9,
                        c.elevation +
                          (e.key === 'ArrowUp'
                            ? 5
                            : e.key === 'ArrowDown'
                              ? -5
                              : 0),
                      ),
                    ),
                  }));
              }}
            >
              {page===0&&catalogRef?.blueprint?.solidRevision?<SolidViewer spec={spec} camera={camera} fallback={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(preview.pages[0]?.svg||'')}/>:<img
                draggable={false}
                src={
                  'data:image/svg+xml;charset=utf-8,' +
                  encodeURIComponent(
                    preview.pages[Math.min(page, preview.pages.length - 1)]
                      ?.svg || preview.svg,
                  )
                }
                alt={tr('Предварительная габаритная схема: ') + product}
              />}
            </div>
            {page === 0 && (
              <p className="chat-mode">
                {tr(
                  'Потяните модель мышью или пальцем, чтобы повернуть. Выбранный ракурс сохраняется в PDF и SVG.',
                )}
              </p>
            )}
          </div>
          <div className="drawing-export">
            {preview.hasModel && (
              <button
                type="button"
                className="drawing-download"
                onClick={downloadModel}
              >
                {tr('Скачать 3D · OBJ')}
              </button>
            )}
            <button type="button" className="drawing-download" onClick={print}>
              {tr('PDF / Печать')}
            </button>
            <button
              type="button"
              className="drawing-download"
              onClick={download}
            >
              {tr('Скачать чертёж SVG ↓')}
            </button>
          </div>
          <p className="chat-mode">
            {tr(
              'Для PDF выберите «Сохранить как PDF» в окне печати. Все листы включены.',
            )}
          </p>
          </details>
        </>
      )}
      <details className="drawing-edit">
        <summary>
          {language === 'kk'
            ? 'Өлшемдер мен құрылымды өзгерту'
            : 'Изменить размеры и конструкцию'}
        </summary>
        <label>
          {tr('Тип изделия')}
          <Select
            value={spec.kind}
            onValueChange={(v) => {
              if (v) onChange({ ...spec, kind: v, catalogModel: 'none' });
            }}
          >
            <SelectTrigger className="drawing-select">
              <SelectValue>
                {tr(drawingKinds.find((k) => k.id === spec.kind)?.label || '')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="drawing-options">
              {drawingKinds.map((k) => (
                <SelectItem value={k.id} key={k.id}>
                  {tr(k.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="drawing-fields">
          {dimensionFields.map((f) => (
            <label key={f.key}>
              {tr(f.label)}, мм
              <Input
                type="number"
                inputMode="decimal"
                min="0.001"
                max={f.max}
                step="any"
                placeholder={tr('Уточнить')}
                value={spec.dimensions[f.key] ?? ''}
                onChange={(e) =>
                  updateDimension(
                    f.key,
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          ))}
        </div>
        {!catalogRef?.blueprint && <label>
          {language === 'kk' ? 'Ішкі биіктік, мм' : 'Высота в свету, мм'}
          <Input
            type="number"
            min="0.001"
            max="100000"
            step="any"
            value={spec.clearHeight ?? ''}
            onChange={(e) =>
              onChange({
                ...spec,
                clearHeight: e.target.value ? Number(e.target.value) : null,
                dimensions:
                  e.target.value && construction.bandHeight
                    ? {
                        ...spec.dimensions,
                        height:
                          Number(e.target.value) + construction.bandHeight,
                      }
                    : spec.dimensions,
              })
            }
          />
        </label>}
        {spec.warnings?.map((w, i) => (
          <p role="alert" className="drawing-warning" key={i}>
            {language === 'kk' ? 'Құрылым параметрлерін нақтылаңыз: ' : ''}
            {w}
          </p>
        ))}
        {catalogRef?.blueprint ? <fieldset><legend>Постоянные параметры шаблона</legend>
          <p>При изменении W/H/D эти значения сохраняются. Изменение конструкции требует отдельной правки шаблона.</p>
          {catalogRef.blueprint.fixed.woodWidth && <p>Планка: {catalogRef.blueprint.fixed.woodWidth} × {catalogRef.blueprint.fixed.woodThickness} мм.</p>}
          {catalogRef.blueprint.fixed.tubeA && <p>Труба: {catalogRef.blueprint.fixed.tubeA} × {catalogRef.blueprint.fixed.tubeB} мм, стенка {catalogRef.blueprint.fixed.tubeWall} мм.</p>}
          {catalogRef.blueprint.fixed.seatHeight && <p>Высота сиденья: {catalogRef.blueprint.fixed.seatHeight} мм.</p>}
          <p>Все значения и пересчитанные детали — на листе «Спецификация по шаблону».</p>
        </fieldset> : <details className="drawing-construction" open>
          <summary>{tr('Параметры конструкции')}</summary>
          <p>
            {tr(
              'Для объёмного каркаса задайте форму и пояс. Стойки появятся только по заданной разбивке. H — общая высота.',
            )}
          </p>
          <label>
            {tr('Форма')}
            <Select
              value={construction.form}
              onValueChange={(v) => {
                if (v) updateConstruction({ form: v });
              }}
            >
              <SelectTrigger className="drawing-select">
                <SelectValue>
                  {tr(
                    constructionForms.find((f) => f.id === construction.form)
                      ?.label || '',
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="drawing-options">
                {constructionForms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {tr(f.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {construction.form.endsWith('-frame') && (
            <>
              <p>{language==='kk'?'Дөңгелек тірек үшін диаметрді енгізіп, профиль жақтарын бос қалдырыңыз. Тікбұрышты тірек үшін екі жағын енгізіңіз.':'Для круглой стойки укажите диаметр и очистите стороны профиля. Для прямоугольной — укажите обе стороны; для квадратной — только первую.'}</p>
              <div className="drawing-fields">
                {constructionFields.map((f) => (
                  <label key={f.key}>
                    {tr(f.label)}, мм
                    <Input
                      type="number"
                      min="0.001"
                      max={f.max}
                      step="any"
                      placeholder="?"
                      value={
                        construction[
                          f.key as 'bandWidth' | 'bandHeight' | 'postSize' | 'postDepth' | 'postDiameter'
                        ] ?? ''
                      }
                      onChange={(e) =>
                        updateConstruction({
                          [f.key]:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <SpansInput
                values={construction.straightSpans}
                onCommit={(values) =>
                  updateConstruction({ straightSpans: values })
                }
                language={language}
              />
              {['oval-frame', 'round-frame'].includes(construction.form) && (
                <label>
                  {tr('Равных делений полуокружности')}
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    placeholder="?"
                    value={construction.arcSegments ?? ''}
                    onChange={(e) =>
                      updateConstruction({
                        arcSegments:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              <p className="drawing-footnote">
                {tr(
                  'Каркас симметричный. Оси стоек лежат на внутреннем контуре пояса.',
                )}
              </p>
            </>
          )}
        </details>}
        {!catalogRef?.blueprint && !construction.form.endsWith('-frame') && (
          <fieldset>
            <legend>
              {language === 'kk' ? 'Бұйым параметрлері' : 'Параметры изделия'}
            </legend>
            <div className="drawing-fields">
              {(
                detailKeys(spec)
              ).map((k) => {
                const f = (
                  detailFields as Record<string, { label: string; kk: string }>
                )[k];
                return (
                  <label key={k}>
                    {language === 'kk' ? f.kk : f.label}, мм
                    <Input
                      type="number"
                      min={zeroDetailFields.includes(k) ? '0' : '0.001'}
                      max="100000"
                      step="any"
                      placeholder="?"
                      value={spec.details?.[k] ?? ''}
                      aria-label={(language === 'kk' ? f.kk : f.label) + ', мм'}
                      onChange={(e) =>
                        onChange(
                          resolveEditedWarnings(
                            {
                              ...spec,
                              details: {
                                ...spec.details,
                                [k]: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              },
                            },
                            [k],
                          ),
                        )
                      }
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <label>
          {tr('Форма и детали конструкции')}
          <Textarea
            maxLength={1000}
            placeholder={tr(
              'Форма профиля, загибы, отверстия, модель из каталога. Неизвестное уточнит менеджер.',
            )}
            value={spec.notes}
            onChange={(e) => onChange({ ...spec, notes: e.target.value })}
          />
        </label>
      </details>
      <p className="drawing-footnote">
        {tr(
          'Для всех изделий строится габаритная схема. Индивидуальный контур, загибы, отверстия и узлы требуют проработки конструктором. Для производства этот чертёж ещё не согласован.',
        )}
      </p>
    </section>
  );
}

function SpansInput({
  values,
  onCommit,
  language,
}: {
  values: number[];
  onCommit: (values: number[]) => void;
  language: ChatLanguage;
}) {
  const signature = values.join(' + '),
    [draft, setDraft] = useState(signature),
    [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(signature);
    setInvalid(false);
  }, [signature]);
  return (
    <label>
      {drawingText('Пролёты каждой прямой стороны', language)}, мм
      <Input
        value={draft}
        placeholder="1800 + 2400 + 1800"
        aria-invalid={invalid}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
          e.currentTarget.setCustomValidity('');
        }}
        onBlur={(e) => {
          if (!draft.trim()) {
            onCommit([]);
            return;
          }
          const valid =
            /^\s*\d+(?:[.,]\d+)?(?:\s*\+\s*\d+(?:[.,]\d+)?)*\s*$/.test(draft);
          const numbers = draft
            .split('+')
            .map((v) => Number(v.trim().replace(',', '.')));
          if (
            !valid ||
            numbers.length > 16 ||
            numbers.some((n) => n <= 0 || n > 100000)
          ) {
            setInvalid(true);
            e.currentTarget.setCustomValidity('Проверьте пролёты');
            return;
          }
          onCommit(numbers);
        }}
      />
      {invalid && (
        <span role="alert">
          {language === 'kk'
            ? 'Өлшемдерді + белгісімен бөліп жазыңыз.'
            : 'Введите положительные размеры через знак +.'}
        </span>
      )}
    </label>
  );
}
