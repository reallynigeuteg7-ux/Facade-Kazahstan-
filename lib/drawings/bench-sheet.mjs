import { benchParts } from './bench.mjs';

// The general-arrangement sheet is projected from the same millimetre parts as
// the interactive 3D model. Missing construction inputs deliberately suppress
// the geometry instead of substituting a plausible-looking bench.
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char],
  );
const fmt = (value) =>
  value == null
    ? '?'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(
        value,
      );
const tx = (x, y, value, attrs = '') =>
  `<text x="${x}" y="${y}" ${attrs}>${esc(value)}</text>`;
const line = (x1, y1, x2, y2, attrs = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
const rect = (x, y, width, height, attrs = '') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${attrs}/>`;

function modelFaces(spec) {
  const faces = [];
  for (const part of benchParts(spec)) {
    const a = part.profile.map(([y, z]) => [part.x, y, z]);
    const b = part.profile.map(([y, z]) => [part.x + part.width, y, z]);
    faces.push({ points: [...a].reverse(), name: part.name });
    faces.push({ points: b, name: part.name });
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      faces.push({ points: [a[i], a[j], b[j], b[i]], name: part.name });
    }
  }
  return faces;
}

const projections = {
  front: {
    point: ([x, , z]) => [x, z],
    depth: ([, y]) => y,
  },
  side: {
    point: ([, y, z]) => [y, z],
    depth: ([x]) => x,
  },
  rear: {
    point: ([x, , z]) => [-x, z],
    depth: ([, y]) => -y,
  },
  top: {
    point: ([x, y]) => [x, y],
    depth: ([, , z]) => z,
  },
  iso: {
    point: ([x, y, z]) => [0.82 * x - 0.58 * y, z - 0.34 * x - 0.35 * y],
    depth: ([x, y, z]) => x + y + z,
  },
};

function projectedView(faces, box, mode) {
  const projection = projections[mode];
  const shapes = faces.map((face) => ({
    ...face,
    points: face.points.map(projection.point),
    depth:
      face.points.reduce((sum, point) => sum + projection.depth(point), 0) /
      face.points.length,
  }));
  const visible = shapes.filter((shape) => {
    const xs = shape.points.map(([x]) => x);
    const ys = shape.points.map(([, y]) => y);
    return (
      Math.max(...xs) - Math.min(...xs) > 0.001 &&
      Math.max(...ys) - Math.min(...ys) > 0.001
    );
  });
  const all = visible.flatMap((shape) => shape.points);
  if (!all.length) return { svg: '', bounds: null };
  const minX = Math.min(...all.map(([x]) => x));
  const maxX = Math.max(...all.map(([x]) => x));
  const minY = Math.min(...all.map(([, y]) => y));
  const maxY = Math.max(...all.map(([, y]) => y));
  const padLeft = mode === 'iso' ? 18 : 30;
  const padRight = 18;
  const padTop = 16;
  const padBottom = mode === 'iso' ? 18 : 36;
  const scale = Math.min(
    (box.w - padLeft - padRight) / Math.max(maxX - minX, 1),
    (box.h - padTop - padBottom) / Math.max(maxY - minY, 1),
  );
  const offsetX =
    box.x + padLeft + (box.w - padLeft - padRight - (maxX - minX) * scale) / 2;
  const offsetY =
    box.y + padTop + (box.h - padTop - padBottom - (maxY - minY) * scale) / 2;
  const point = ([x, y]) => [
    offsetX + (x - minX) * scale,
    offsetY + (maxY - y) * scale,
  ];
  let out = '';
  for (const shape of visible.sort((a, b) => b.depth - a.depth)) {
    const color = shape.name.startsWith('wood_') ? '#a87550' : '#e8ecee';
    const points = shape.points
      .map((p) =>
        point(p)
          .map((n) => n.toFixed(2))
          .join(','),
      )
      .join(' ');
    out += `<polygon points="${points}" fill="${color}" stroke="#354b59" stroke-width="1" stroke-linejoin="round"/>`;
  }
  return {
    svg: out,
    bounds: {
      left: offsetX,
      right: offsetX + (maxX - minX) * scale,
      top: offsetY,
      bottom: offsetY + (maxY - minY) * scale,
    },
  };
}

function dimensions(bounds, horizontal, vertical) {
  if (!bounds) return '';
  const y = bounds.bottom + 12;
  const x = bounds.left - 14;
  return (
    `<g fill="none" stroke="#425363" stroke-width="1">${line(bounds.left, bounds.bottom, bounds.left, y + 4)}${line(bounds.right, bounds.bottom, bounds.right, y + 4)}${line(bounds.left, y, bounds.right, y, 'marker-start="url(#dim)" marker-end="url(#dim)"')}${line(bounds.left - 4, bounds.top, x + 4, bounds.top)}${line(bounds.left - 4, bounds.bottom, x + 4, bounds.bottom)}${line(x, bounds.top, x, bounds.bottom, 'marker-start="url(#dim)" marker-end="url(#dim)"')}</g>` +
    tx(
      (bounds.left + bounds.right) / 2,
      y + 14,
      horizontal,
      'font-size="12" text-anchor="middle" paint-order="stroke" stroke="white" stroke-width="4"',
    ) +
    tx(
      x - 7,
      (bounds.top + bounds.bottom) / 2,
      vertical,
      `font-size="12" text-anchor="middle" transform="rotate(-90 ${x - 7} ${(bounds.top + bounds.bottom) / 2})" paint-order="stroke" stroke="white" stroke-width="4"`,
    )
  );
}

function viewBox(x, y, width, height, title) {
  return `<g>${tx(x + 6, y + 17, title, 'font-size="15" font-weight="700" letter-spacing=".4"')}${rect(x, y + 25, width, height - 25, 'fill="#fff" stroke="#c6d0d6"')}</g>`;
}

function countNamed(parts, prefix) {
  return parts.filter((part) => part.name.startsWith(prefix)).length;
}

function completeBench(spec) {
  const { width, height, depth } = spec.dimensions;
  const t = spec.details;
  return Boolean(
    width &&
    height &&
    depth &&
    t.seatHeight &&
    t.seatDepth &&
    t.seatThickness &&
    t.supportSize &&
    t.supportInset != null &&
    t.slatWidth &&
    t.slatGap != null &&
    t.backPanelHeight &&
    t.footInset,
  );
}

function missingSheet(spec) {
  const { width, height, depth } = spec.dimensions;
  const t = spec.details;
  const missing = [
    ['Ширина W', width],
    ['Высота H', height],
    ['Глубина D', depth],
    ['Высота сиденья', t.seatHeight],
    ['Глубина сиденья', t.seatDepth],
    ['Толщина рейки', t.seatThickness],
    ['Сечение опоры', t.supportSize],
    ['Отступ опоры от торца', t.supportInset],
    ['Ширина рейки', t.slatWidth],
    ['Зазор между рейками', t.slatGap],
    ['Высота верхней панели спинки', t.backPanelHeight],
    ['Отступ передней ножки', t.footInset],
  ]
    .filter(([, value]) => value == null)
    .map(([label]) => label);
  let out = tx(
    78,
    220,
    'Точную геометрию пока нельзя построить',
    'font-size="24" font-weight="700"',
  );
  out += tx(
    78,
    262,
    'На листе ниже перечислены только недостающие исходные размеры.',
    'font-size="17"',
  );
  out += missing
    .map((label, i) => tx(100, 315 + i * 30, '•  ' + label, 'font-size="17"'))
    .join('');
  out += rect(78, 720, 1240, 105, 'rx="4" fill="#fff7ed" stroke="#d5a875"');
  out += tx(
    100,
    762,
    'После уточнения этих данных 3D-виды и проекции будут построены по одной модели.',
    'font-size="17"',
  );
  out += tx(
    100,
    794,
    'Крепёж, сварные узлы, допуски и расчёт нагрузки отдельно проверяет конструктор.',
    'font-size="15"',
  );
  return out;
}

export function benchReferenceSheet(spec) {
  if (!completeBench(spec)) return missingSheet(spec);

  const parts = benchParts(spec);
  const faces = modelFaces(spec);
  const { width, height, depth } = spec.dimensions;
  const details = spec.details;
  let out = '';

  const views = [
    {
      x: 55,
      y: 170,
      w: 455,
      h: 245,
      title: 'ВИД СПЕРЕДИ · W × H',
      mode: 'front',
    },
    {
      x: 530,
      y: 170,
      w: 260,
      h: 245,
      title: 'ВИД СБОКУ · D × H',
      mode: 'side',
    },
    {
      x: 810,
      y: 170,
      w: 455,
      h: 245,
      title: 'ВИД СЗАДИ · W × H',
      mode: 'rear',
    },
    { x: 55, y: 435, w: 455, h: 215, title: 'ВИД СВЕРХУ · W × D', mode: 'top' },
    { x: 530, y: 435, w: 735, h: 215, title: 'ОБЩИЙ 3D-ВИД', mode: 'iso' },
  ];
  for (const view of views) {
    out += viewBox(view.x, view.y, view.w, view.h, view.title);
    const rendered = projectedView(
      faces,
      {
        x: view.x + 8,
        y: view.y + 33,
        w: view.w - 16,
        h: view.h - 42,
      },
      view.mode,
    );
    out += rendered.svg;
    if (view.mode !== 'iso') {
      const horizontal = view.mode === 'side' ? depth : width;
      const vertical = view.mode === 'top' ? depth : height;
      out += dimensions(
        rendered.bounds,
        `${fmt(horizontal)} мм`,
        `${fmt(vertical)} мм`,
      );
    }
  }

  out += line(55, 670, 1265, 670, 'stroke="#c6d0d6"');
  out += tx(
    65,
    701,
    'РАЗМЕРЫ И СОСТАВ МОДЕЛИ',
    'font-size="16" font-weight="700" letter-spacing=".4"',
  );
  const rowY = [733, 761, 789];
  const rows = [
    [
      `Габариты W × D × H`,
      `${fmt(width)} × ${fmt(depth)} × ${fmt(height)} мм`,
      `Высота сиденья`,
      `${fmt(details.seatHeight)} мм`,
    ],
    [
      `Рейка сиденья`,
      `${fmt(details.slatWidth)} × ${fmt(details.seatThickness)} мм`,
      `Зазор реек`,
      `${fmt(details.slatGap)} мм`,
    ],
    [
      `Металлическая опора`,
      `${fmt(details.supportSize)} мм`,
      `Отступ опоры / ножки`,
      `${fmt(details.supportInset)} / ${fmt(details.footInset)} мм`,
    ],
  ];
  for (let i = 0; i < rows.length; i++) {
    const [a, b, c, d] = rows[i];
    out += tx(70, rowY[i], a, 'font-size="13" fill="#596d78"');
    out += tx(260, rowY[i], b, 'font-size="14"');
    out += tx(630, rowY[i], c, 'font-size="13" fill="#596d78"');
    out += tx(850, rowY[i], d, 'font-size="14"');
  }

  out += rect(55, 810, 1210, 68, 'fill="#f5f7f8" stroke="#c6d0d6"');
  out += tx(
    70,
    835,
    `Детали модели: ${countNamed(parts, 'metal_')} металлических элементов · ${countNamed(parts, 'wood_seat_')} реек сиденья · ${countNamed(parts, 'wood_back_')} реек спинки · 1 верхняя панель`,
    'font-size="14"',
  );
  out += tx(
    70,
    860,
    `Орнамент: ${spec.decoration === 'ethno-catalog-1' ? 'требует точного векторного контура от конструктора' : 'в заказе не задан'} · крепёж и сварные соединения не заданы`,
    'font-size="13" fill="#596d78"',
  );
  return out;
}
