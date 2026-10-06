import { renderScene } from './scene.mjs';
import { ethnoPaths } from './ethno.mjs';
import { categoryViews, detailKeys, detailFields } from './templates.mjs';
import { cleanDrawing, drawingKinds, dimensionFields } from './model.mjs';
import { constructionForms, constructionFields } from './assembly.mjs';
import { drawingText } from './locale.mjs';
import { benchReferenceSheet } from './bench-sheet.mjs';
import { catalogReferenceSheet, catalogOrnamentSheet } from './catalog-sheet.mjs';
import { catalogModelById } from './catalog.mjs';
import { blueprintSpecificationSheets } from './blueprint-sheet.mjs';
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );
const fmt = (n) =>
  n === null || n === undefined
    ? '?'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
const tx = (x, y, s, extra = '') =>
  `<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`;
const ln = (a, b, extra = '') =>
  `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${extra}/>`;
const poly = (points, extra = '') =>
  `<polygon points="${points.map((p) => p.join(',')).join(' ')}" ${extra}/>`;
function wrap(s, max = 105) {
  const lines = [];
  let line = '';
  for (const word of String(s).split(/\s+/)) {
    if ((line + ' ' + word).length > max) {
      if (line) lines.push(line);
      line = '';
    }
    if (word.length > max) {
      for (let i = 0; i < word.length; i += max)
        lines.push(word.slice(i, i + max));
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}
function capsule(w, d, inset = 0) {
  const r = d / 2 - inset,
    a = w / 2 - d / 2,
    points = [];
  if (r <= 0) return points;
  for (let i = 0; i <= 48; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 48;
    points.push([a + r * Math.cos(angle), r * Math.sin(angle)]);
  }
  for (let i = 0; i <= 48; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 48;
    points.push([-a + r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return points;
}
function rectangle(w, d, inset = 0) {
  return [
    [-w / 2 + inset, -d / 2 + inset],
    [w / 2 - inset, -d / 2 + inset],
    [w / 2 - inset, d / 2 - inset],
    [-w / 2 + inset, d / 2 - inset],
  ];
}
export function assemblyGeometry(input) {
  const spec = cleanDrawing(input),
    c = spec.construction,
    { width: w, height: h, depth: d } = spec.dimensions;
  const curved = ['oval-frame', 'round-frame'].includes(c.form),
    frame = c.form.endsWith('-frame');
  const complete = !!(w && h && d),
    bw = c.bandWidth;
  const outer = w && d ? (curved ? capsule(w, d) : rectangle(w, d)) : [];
  const inner =
    w && d && frame && bw
      ? curved
        ? capsule(w, d, bw)
        : rectangle(w, d, bw)
      : [];
  const stations = [];
  if (complete && inner.length) {
    const a = curved ? (w - d) / 2 : w / 2 - bw,
      r = d / 2 - bw;
    if (c.straightSpans.length) {
      let x = -a;
      for (const n of [0, ...c.straightSpans]) {
        x += n;
        for (const y of [-r, r]) stations.push([x, y]);
      }
    }
    if (curved && c.arcSegments) {
      for (const side of [-1, 1])
        for (let i = 0; i <= c.arcSegments; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / c.arcSegments;
          stations.push([
            side * (a + r * Math.cos(angle)),
            r * Math.sin(angle),
          ]);
        }
    }
  }
  const unique = stations.filter(
    (p, i) =>
      stations.findIndex(
        (q) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01,
      ) === i,
  );
  return {
    spec,
    w,
    h,
    d,
    frame,
    curved,
    complete,
    outer,
    inner,
    stations: unique,
    innerRadius: curved && d && bw ? d / 2 - bw : null,
    straight:
      curved && w && d
        ? w - d
        : c.form === 'rect-frame' && w && bw
          ? w - 2 * bw
          : null,
  };
}
function projector(points, box, iso = false) {
  const raw = ([x, y, z = 0]) =>
    iso ? [0.88 * x - 0.48 * y, 0.25 * x + 0.43 * y - z] : [x, y];
  const projected = points.map(raw);
  const xs = projected.map((p) => p[0]),
    ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(
    box.w / Math.max(maxX - minX, 1),
    box.h / Math.max(maxY - minY, 1),
  );
  return (point) => {
    const [x, y] = raw(point);
    return [
      box.x + (box.w - (maxX - minX) * scale) / 2 + (x - minX) * scale,
      box.y + (box.h - (maxY - minY) * scale) / 2 + (y - minY) * scale,
    ];
  };
}
function dimension(a, b, label, offset = 32) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy);
  if (length < 1) return '';
  const nx = (-dy / length) * offset,
    ny = (dx / length) * offset,
    aa = [a[0] + nx, a[1] + ny],
    bb = [b[0] + nx, b[1] + ny];
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  const cx = (aa[0] + bb[0]) / 2,
    cy = (aa[1] + bb[1]) / 2;
  return (
    `<g stroke="#293848" stroke-width="1.2">${ln(a, [aa[0] + nx * 0.2, aa[1] + ny * 0.2])}${ln(b, [bb[0] + nx * 0.2, bb[1] + ny * 0.2])}${ln(aa, bb, 'marker-start="url(#dim)" marker-end="url(#dim)"')}</g>` +
    tx(
      cx,
      cy - 9,
      label,
      `text-anchor="middle" transform="rotate(${angle} ${cx} ${cy})" paint-order="stroke" stroke="white" stroke-width="5" stroke-linejoin="round"`,
    )
  );
}
function plan(g, tr) {
  if (!g.w || !g.d)
    return tx(
      60,
      240,
      tr('Для плана нужны ширина W и глубина D.'),
      'font-size="22"',
    );
  const { w, d, spec } = g,
    c = spec.construction;
  const p = projector(rectangle(w, d), { x: 150, y: 265, w: 770, h: 490 });
  let out = poly(
    g.outer.map(p),
    'fill="#eef2f3" stroke="#304b60" stroke-width="2"',
  );
  if (g.inner.length)
    out += poly(
      g.inner.map(p),
      'fill="white" stroke="#304b60" stroke-width="1.5"',
    );
  out += `<g stroke="#80939f" stroke-dasharray="8 5">${ln(p([-w / 2, 0]), p([w / 2, 0]))}${ln(p([0, -d / 2]), p([0, d / 2]))}</g>`;
  out += dimension(
    p([-w / 2, -d / 2]),
    p([w / 2, -d / 2]),
    fmt(w) + ' мм',
    -45,
  );
  out += dimension(p([w / 2, -d / 2]), p([w / 2, d / 2]), fmt(d) + ' мм', -50);
  if (c.bandWidth && g.inner.length)
    out += dimension(
      p([-w / 2 + c.bandWidth, d / 2 - c.bandWidth]),
      p([w / 2 - c.bandWidth, d / 2 - c.bandWidth]),
      tr('Внутри: ') + fmt(w - 2 * c.bandWidth) + ' мм',
      44,
    );
  if (g.straight && c.straightSpans.length) {
    let x = -g.straight / 2;
    for (const span of c.straightSpans) {
      out += dimension(
        p([x, -d / 2 + c.bandWidth]),
        p([x + span, -d / 2 + c.bandWidth]),
        fmt(span),
        35,
      );
      x += span;
    }
  }
  g.stations.forEach(([x, y], i) => {
    const [px, py] = p([x, y]);
    out +=
      `<circle cx="${px}" cy="${py}" r="5" fill="#314d62"/>` +
      tx(
        px,
        py + (y > 0 ? -12 : 22),
        String(i + 1),
        'text-anchor="middle" font-size="13" paint-order="stroke" stroke="white" stroke-width="3"',
      );
  });
  const entries = [
    [tr('Форма'), tr(constructionForms.find((f) => f.id === c.form).label)],
    [tr('Радиус наружный'), g.curved ? fmt(d / 2) + ' мм' : '—'],
    [tr('Радиус внутренний'), g.curved ? fmt(g.innerRadius) + ' мм' : '—'],
    [tr('Прямой участок'), g.curved ? fmt(g.straight) + ' мм' : '—'],
    [tr('Ширина верхнего пояса'), fmt(c.bandWidth) + ' мм'],
    [tr('Высота верхнего пояса'), fmt(c.bandHeight) + ' мм'],
    [tr('Сечение стойки'), c.postDiameter ? 'Ø '+fmt(c.postDiameter)+' мм' : fmt(c.postSize)+' × '+fmt(c.postDepth||c.postSize)+' мм'],
    [tr('Число размеченных осей'), String(g.stations.length)],
  ];
  entries.forEach(([label, value], i) => {
    out += tx(1000, 220 + i * 67, label, 'font-size="14" fill="#637987"');
    wrap(value, 29).forEach(
      (v, j) => (out += tx(1000, 243 + i * 67 + j * 19, v, 'font-size="17"')),
    );
  });
  out += tx(
    60,
    865,
    tr('Начало координат — центр плана. Номера соответствуют таблице осей.'),
    'font-size="16" fill="#607787"',
  );
  out += tx(
    60,
    891,
    tr('Каркас симметричный. Оси стоек лежат на внутреннем контуре пояса.'),
    'font-size="16" fill="#607787"',
  );
  return out;
}
function table(rows, x, y, width, rowHeight = 32) {
  let cursor = y;
  return rows
    .map((row, i) => {
      const unit = width / row.length,
        wrapped = row.map((cell) =>
          wrap(cell, Math.max(12, Math.floor((unit - 24) / 8))),
        ),
        height = Math.max(
          rowHeight,
          Math.max(...wrapped.map((lines) => lines.length)) * 19 + 12,
        ),
        yy = cursor;
      cursor += height;
      return (
        `<rect x="${x}" y="${yy}" width="${width}" height="${height}" fill="${i === 0 ? '#e7eef2' : i % 2 ? 'white' : '#f7f9fa'}" stroke="#c5d0d8"/>` +
        wrapped
          .map((lines, j) =>
            lines
              .map((cell, k) =>
                tx(
                  x + j * unit + 12,
                  yy + 22 + k * 19,
                  cell,
                  `font-size="15" ${i === 0 ? 'font-weight="600"' : ''}`,
                ),
              )
              .join(''),
          )
          .join('')
      );
    })
    .join('');
}
function sheet(content, title, product, reference, page, count, tr) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000" role="img"><title>${esc(product + ' — ' + title)}</title><defs><marker id="dim" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M10 0 L0 5 L10 10" fill="none" stroke="#293848"/></marker></defs><rect width="1400" height="1000" fill="white"/><rect x="24" y="24" width="1352" height="952" fill="none" stroke="#adbdc7"/><g font-family="Arial, sans-serif" font-size="18" fill="#20394a">${tx(55, 64, 'FACADE KAZAHSTAN', 'font-size="25" font-weight="700"')}${tx(1340, 62, reference.slice(0, 24), 'text-anchor="end" font-size="16"')}${tx(55, 110, title, 'font-size="29" font-weight="600"')}${wrap(
    product,
    95,
  )
    .slice(0, 2)
    .map((s, i) => tx(55, 143 + i * 22, s, 'font-size="18" fill="#5f7685"'))
    .join(
      '',
    )}${content}<path d="M24 920 H1376" stroke="#adbdc7"/>${tx(55, 945, tr('ПРЕДВАРИТЕЛЬНЫЙ ЧЕРТЁЖ · НЕ ДЛЯ ПРОИЗВОДСТВА'), 'font-size="15" fill="#a45d2c"')}${tx(55, 965, tr('Единицы: мм. Масштаб произвольный. Размеры следует читать по числам.'), 'font-size="13" fill="#647d8c"')}${tx(1340, 952, page + ' / ' + count, 'text-anchor="end" font-size="18"')}</g></svg>`;
}
export function renderDrawingPages(
  input,
  product = 'Изделие',
  reference = '',
  language = 'ru',
  camera = {},
) {
  const g = assemblyGeometry(input),
    { spec } = g,
    c = spec.construction,
    tr = (s) => drawingText(s, language);
  const pages = [
    { title: tr('01 / Объёмный вид'), content: renderScene(g, camera, tr) },
  ];
  if (spec.catalogModel && catalogModelById(spec.catalogModel) && !g.frame) {
    const model=catalogModelById(spec.catalogModel);
    pages.push({title:tr(model.blueprint?'02 / Сборочный лист по шаблону':'02 / Сборочный лист по фото каталога'),content:catalogReferenceSheet(spec,tr)});
    if(model.blueprint){pages.push(...blueprintSpecificationSheets(spec));return pages.map((p,i)=>{const title=String(i+1).padStart(2,'0')+' / '+p.title.replace(/^\d+ \/ /,'');return {title,svg:sheet(p.content,title,product,reference,i+1,pages.length,tr)};});}
    pages.push({title:tr('03 / Исходные данные'),content:
      tx(55,230,`Каталог 29.08.26.pdf · страница ${model.page}`)+
      tx(55,270,tr('Форма привязана к фото выбранного товара и изменяется вместе с габаритами.'))+
      tx(55,310,tr('Внутренние размеры — пропорции эскиза; они не измерены по фотографии.'))+
      tx(55,350,tr(model.id==='catalog-2026-p1-v2'?'Видимый орнамент перенесён с фото; контур для резки ещё требует проверки.':'Декоративный рисунок показан схематично; точный вектор для резки не получен.'))+
      tx(55,390,tr('Узлы, отверстия, крепёж, допуски и нагрузки проверяет специалист.'))+
      wrap(spec.notes||'').map((s,i)=>tx(55,455+i*25,s,'font-size="16"')).join('')
    });
    if(model.id==='catalog-2026-p1-v2')pages.push({title:tr('04 / Этно · орнамент по фото'),content:catalogOrnamentSheet(spec,tr)});
    return pages.map((p,i)=>({title:p.title,svg:sheet(p.content,p.title,product,reference,i+1,pages.length,tr)}));
  }
  if (spec.kind === 'bench' && c.form === 'slatted-bench')
    pages.push({ title: '02 / Сборочный лист скамейки', content: benchReferenceSheet(spec, renderScene(g, { yaw: -35, elevation: 30, dimensions: false }, tr)) });
  pages.push({ title: tr('План и размерные цепочки'), content: plan(g, tr) });
  const rows = [
    [tr('Параметр'), tr('Значение')],
    ...dimensionFields.map((f) => [
      tr(f.label),
      fmt(spec.dimensions[f.key]) + ' мм',
    ]),
    ...constructionFields.map((f) => [tr(f.label), fmt(c[f.key]) + ' мм']),
    [
      tr('Пролёты каждой прямой стороны'),
      c.straightSpans.length ? c.straightSpans.map(fmt).join(' + ') : '?',
    ],
    [tr('Равных делений полуокружности'), fmt(c.arcSegments)],
  ];
  let info = table(rows, 55, 200, 1290, 30);
  const notes = [
    tr('Изделие: ') + product,
    tr('Тип изделия') +
      ': ' +
      tr(drawingKinds.find((k) => k.id === spec.kind).label),
    tr('Описание клиента: ') + (spec.notes || '?'),
    tr('Нужны уточнения: ') +
      [
        ...dimensionFields
          .filter((f) => spec.dimensions[f.key] === null)
          .map((f) => tr(f.label)),
        ...(g.frame
          ? constructionFields
              .filter((f) => c[f.key] === null && !['postDepth','postDiameter'].includes(f.key) && !(f.key==='postSize'&&c.postDiameter))
              .map((f) => tr(f.label))
          : []),
      ].join(', '),
    tr(
      'Форма, сечение и шаги, которых нет в ответах, не выдумываются. Узлы и крепления уточняет конструктор.',
    ),
  ];
  const lines = notes.flatMap((s) => wrap(s, 112));
  lines
    .slice(0, 9)
    .forEach((s, i) => (info += tx(55, 668 + i * 24, s, 'font-size="16"')));
  pages.push({ title: tr('03 / Параметры заказа'), content: info });
  if (lines.length > 9) {
    for (let i = 9; i < lines.length; i += 27)
      pages.push({
        title: tr('Описание клиента: '),
        content: lines
          .slice(i, i + 27)
          .map((s, j) => tx(55, 220 + j * 24, s, 'font-size="16"'))
          .join(''),
      });
  }
  if (spec.clearHeight)
    pages.push({
      title: tr('Высота в свету'),
      content: table(
        [
          [tr('Параметр'), tr('Значение')],
          [tr('Высота в свету'), fmt(spec.clearHeight) + ' мм'],
          [tr('Высота верхнего пояса'), fmt(c.bandHeight) + ' мм'],
          [tr('Высота H'), fmt(spec.dimensions.height) + ' мм'],
        ],
        55,
        225,
        1290,
        45,
      ),
    });
  if (spec.warnings.length)
    pages.push({
      title: tr('Нужны уточнения: '),
      content: spec.warnings
        .flatMap((w) => wrap(w, 100))
        .map((w, i) => tx(55, 225 + i * 30, w, 'font-size="18"'))
        .join(''),
    });
  if (!g.frame) {
    if(spec.decoration==='ethno-catalog-1'){
      const width=g.w-2*(spec.details.supportInset+spec.details.supportSize),height=spec.details.backPanelHeight,scale=1220/width;
      const pattern=ethnoPaths(width,height).map(path=>`<polyline points="${path.map(([x,y])=>[700+x*scale,420+(height-y)*scale].join(',')).join(' ')}" fill="none" stroke="#258b9f" stroke-width="2" stroke-linejoin="round"/>`).join('');
      pages.push({title:tr('Этно / Верхняя панель спинки'),content:tx(55,230,'Каталог, страница 1 · Эскиз композиции орнамента')+tx(55,270,'Узор показан нанесением на панель. Способ изготовления не подтверждён.')+`<rect x="90" y="420" width="1220" height="${height*scale}" fill="#f7f7f2" stroke="#304b60"/>`+pattern+tx(700,390,fmt(width)+' мм','text-anchor="middle"')+tx(55,680,'Высота панели по поверхности: '+fmt(height)+' мм — предварительно')+tx(55,725,'Орнамент реконструирован схематично, не является точным контуром лазерной резки.')});
    }
    if(c.form !== 'slatted-bench') pages.push({ title: tr('Виды изделия'), content: categoryViews(spec, tr) });
    const keys = detailKeys(spec);
    if (keys.length)
      pages.push({
        title: tr('Параметры изделия'),
        content: table(
          [
            [tr('Параметр'), tr('Значение')],
            ...keys.map((k) => [
              language === 'kk' ? detailFields[k].kk : detailFields[k].label,
              fmt(spec.details[k]) + ' мм',
            ]),
          ],
          55,
          225,
          1290,
          42,
        ),
      });
  }
  for (let i = 0; i < g.stations.length; i += 19) {
    const stations = g.stations.slice(i, i + 19);
    const row = [
      [tr('Ось'), 'X, мм', 'Y, мм', tr('Высота стойки')],
      ...stations.map(([x, y], j) => [
        String(i + j + 1),
        fmt(x),
        fmt(y),
        g.h && c.bandHeight ? fmt(g.h - c.bandHeight) : '?',
      ]),
    ];
    pages.push({
      title: tr('Координаты осей стоек'),
      content:
        tx(
          55,
          194,
          tr(
            'Расчёт по заданным пролётам и равным делениям дуги; начало — центр плана.',
          ),
          'font-size="16"',
        ) +
        table(row, 55, 225, 1290, 30) +
        tx(
          55,
          866,
          tr(
            'Каркас симметричный. Оси стоек лежат на внутреннем контуре пояса.',
          ),
          'font-size="16"',
        ),
    });
  }
  for (const [title, yaw, elevation] of [
    ['3D / Передний левый угол', -35, 30],
    ['3D / Передний правый угол', 35, 30],
    ['3D / Задний левый угол', -145, 30],
    ['3D / Задний правый угол', 145, 30],
    ['Вид спереди', 0, 0], ['Вид сзади', 180, 0],
    ['Вид слева', -90, 0], ['Вид справа', 90, 0],
    ['Вид сверху', 0, 90], ['Вид снизу', 0, -90],
  ]) pages.push({title:tr(title),content:renderScene(g,{yaw,elevation,zoom:1,dimensions:true},tr)});
  if(g.curved && g.inner.length && c.arcSegments) {
    pages.push({title:tr('3D / Закругление — размерные цепочки'),content:renderScene(g,{yaw:-90,elevation:48,zoom:1,dimensions:true,detail:'arc'},tr)});
    pages.push({title:tr('3D / Закругление — боковой ракурс'),content:renderScene(g,{yaw:-35,elevation:65,zoom:1,dimensions:true,detail:'arc-side'},tr)});
  }
  return pages.map((p, i) => ({
    title: p.title,
    svg: sheet(p.content, p.title, product, reference, i + 1, pages.length, tr),
  }));
}
export function renderInteractiveSheet(input,product,reference,language,camera,total){
  const tr=s=>drawingText(s,language);
  return sheet(renderScene(assemblyGeometry(input),camera,tr),tr('01 / Объёмный вид'),product,reference,1,total,tr);
}
export function renderDrawing(
  input,
  product = 'Изделие',
  reference = '',
  language = 'ru',
  camera = {},
) {
  const pages = renderDrawingPages(input, product, reference, language, camera);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${pages.length * 1000}" viewBox="0 0 1400 ${pages.length * 1000}"><title>${esc(product)}</title>${pages.map((p, i) => p.svg.replace('<svg ', '<svg y="' + i * 1000 + '" ')).join('')}</svg>`;
}
