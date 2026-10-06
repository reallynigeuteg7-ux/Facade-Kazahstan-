// Category-specific parameters are explicit inputs, never inferred from a photo.
export const detailFields = {
  footInset: {label:'Отступ передней ножки',kk:'Алдыңғы аяқтың шегінісі',pattern:'отступ передней ножки'},
  backPanelHeight: {
    label: 'Высота верхней панели спинки',
    kk: 'Арқалықтың жоғарғы панелінің биіктігі',
    pattern: 'высота панели спинки',
  },
  seatHeight: {
    label: 'Высота сиденья',
    kk: 'Отырғыш биіктігі',
    pattern: 'высота сиденья|отырғыш биіктігі',
  },
  seatDepth: {
    label: 'Глубина сиденья',
    kk: 'Отырғыш тереңдігі',
    pattern: 'глубина сиденья|отырғыш тереңдігі',
  },
  seatThickness: {
    label: 'Толщина сиденья',
    kk: 'Отырғыш қалыңдығы',
    pattern: 'толщина сиденья|отырғыш қалыңдығы',
  },
  supportSize: {
    label: 'Квадратное сечение опор',
    kk: 'Тіректің шаршы қимасы',
    pattern: 'сечение опор|тірек қимасы',
  },
  supportInset: {
    label: 'Отступ опор от торцов',
    kk: 'Тіректің шеттен шегінісі',
    pattern: 'отступ опор|тіректің шегінісі',
  },
  flange: {
    label: 'Высота загиба',
    kk: 'Иілім биіктігі',
    pattern: 'высота загиба|загиб|иілім',
  },
  openingWidth: {
    label: 'Ширина проёма',
    kk: 'Ойық ені',
    pattern: 'ширина про[её]ма|ойық ені',
  },
  openingHeight: {
    label: 'Высота проёма',
    kk: 'Ойық биіктігі',
    pattern: 'высота про[её]ма|ойық биіктігі',
  },
  openingBottom: {
    label: 'Низ проёма от основания',
    kk: 'Ойықтың төменгі биіктігі',
    pattern: 'низ про[её]ма|ойықтың төменгі биіктігі',
  },
  shelfHeight: {
    label: 'Высота полки',
    kk: 'Сөре биіктігі',
    pattern: 'высота полки|сөре биіктігі',
  },
  slatWidth: {
    label: 'Ширина ламели',
    kk: 'Ламель ені',
    pattern: 'ширина ламели|ламель ені',
  },
  slatGap: {
    label: 'Зазор между ламелями',
    kk: 'Ламель аралығы',
    pattern: 'зазор ламелей|зазор между ламелями|ламель аралығы',
  },
  roofHeight: {
    label: 'Высота крыши',
    kk: 'Шатыр биіктігі',
    pattern: 'высота крыши|шатыр биіктігі',
  },
  baseWidth: {
    label: 'Ширина основания',
    kk: 'Табан ені',
    pattern: 'ширина основания|табан ені',
  },
  profileA: {
    label: 'Полка профиля A',
    kk: 'Профиль сөресі A',
    pattern: 'полка а|полка a',
  },
  profileB: {
    label: 'Полка профиля B',
    kk: 'Профиль сөресі B',
    pattern: 'полка б|полка b',
  },
};
export const templateFields = {
  bench: [
    'seatHeight',
    'seatDepth',
    'seatThickness',
    'supportSize',
    'supportInset',
  ],
  bin: ['openingWidth', 'openingHeight', 'openingBottom'],
  cassette: ['flange'],
  panel: ['flange'],
  profile: ['profileA', 'profileB'],
  basket: ['openingWidth', 'openingHeight', 'openingBottom'],
  cabinet: ['shelfHeight'],
  gate: ['slatWidth', 'slatGap'],
  fence: ['slatWidth', 'slatGap'],
  container: ['openingWidth', 'openingHeight', 'openingBottom'],
  louver: ['slatWidth', 'slatGap'],
  railing: ['slatWidth', 'slatGap'],
  furniture: ['shelfHeight'],
  gazebo: ['roofHeight', 'supportSize'],
  light: ['baseWidth'],
  cut: [],
  architecture: [],
  custom: [],
};
export const zeroDetailFields = ['supportInset', 'openingBottom', 'slatGap'];
/** @returns {string[]} */
export function detailKeys(spec) {
  const keys=templateFields[spec.kind] || [];
  return spec.construction?.form === 'slatted-bench'
    ? [...keys,'slatWidth','slatGap','backPanelHeight','footInset'] : keys;
}
export function cleanDetails(raw = {}, dimensions) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw Error('Проверьте параметры изделия.');
  /** @type {Record<string, number|null>} */
  const result = {};
  for (const key of Object.keys(detailFields)) {
    const n = raw[key] ?? null;
    if (
      n !== null &&
      (typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n < 0 ||
        (!zeroDetailFields.includes(key) && n === 0) ||
        n > 100000)
    )
      throw Error(
        detailFields[key].label + ': проверьте размер, максимум 100000 мм.',
      );
    result[key] = n;
  }
  const { width: w, height: h, depth: d } = dimensions;
  for (const key of [
    'seatHeight',
    'openingHeight',
    'shelfHeight',
    'roofHeight',
  ])
    if (result[key] && h && result[key] >= h)
      throw Error(
        detailFields[key].label + ' должна быть меньше общей высоты.',
      );
  if (result.seatDepth && d && result.seatDepth > d)
    throw Error('Глубина сиденья превышает глубину изделия.');
  if (result.openingWidth && w && result.openingWidth >= w)
    throw Error('Проём должен быть уже изделия.');
  if (
    result.openingBottom &&
    result.openingHeight &&
    h &&
    result.openingBottom + result.openingHeight > h
  )
    throw Error('Проём выходит за высоту изделия.');
  if (
    result.supportInset != null &&
    w &&
    (result.supportInset + (result.supportSize || 0)) * 2 >= w
  )
    throw Error('Проверьте отступ опор от торцов.');
  if (result.supportSize && d && result.supportSize > d)
    throw Error('Квадратное сечение опор превышает глубину изделия.');
  for (const key of ['slatWidth', 'baseWidth', 'profileA'])
    if (result[key] && w && result[key] > w)
      throw Error(detailFields[key].label + ' превышает ширину изделия.');
  if (result.profileB && h && result.profileB > h)
    throw Error('Полка профиля B превышает высоту изделия.');
  if (
    result.seatThickness &&
    result.seatHeight &&
    result.seatThickness >= result.seatHeight
  )
    throw Error('Толщина сиденья должна быть меньше его высоты.');
  if (
    w &&
    result.slatWidth &&
    result.slatGap != null &&
    Math.floor(
      (w + result.slatGap) / (result.slatWidth + result.slatGap) + 1e-9,
    ) > 1000
  )
    throw Error(
      'В одной секции больше 1000 ламелей. Разделите изделие на секции для построения полного чертежа.',
    );
  return result;
}
export function parseDetails(text, dimensions) {
  const values = {};
  const warnings = [];
  for (const [key, f] of Object.entries(detailFields)) {
    const m = text
      .toLowerCase()
      .match(
        new RegExp(
          '(?:' +
            f.pattern +
            ')\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(мм|см|м)(?![а-яәғқңөұүһі])',
        ),
      );
    if (m)
      values[key] =
        Number(m[1].replace(',', '.')) * { мм: 1, см: 10, м: 1000 }[m[2]];
  }
  for (let i = 0; i < 16; i++) {
    try {
      return { details: cleanDetails(values, dimensions), warnings };
    } catch (error) {
      warnings.push(error.message);
      const named = Object.keys(detailFields).find((k) =>
        error.message.startsWith(detailFields[k].label),
      );
      const key =
        named ||
        (/Глубина сиденья/.test(error.message)
          ? 'seatDepth'
          : /Проём должен/.test(error.message)
            ? 'openingWidth'
            : /Проём выходит/.test(error.message)
              ? 'openingBottom'
              : /отступ/.test(error.message)
                ? 'supportInset'
                : /Толщина сиденья/.test(error.message)
                  ? 'seatThickness'
                  : null);
      if (!key) break;
      values[key] = null;
    }
  }
  return { details: cleanDetails({}, dimensions), warnings };
}
export function categoryViews(spec, tr) {
  const { width: w, height: h, depth: d } = spec.dimensions,
    t = spec.details || {};
  const escape = (s) =>
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
  const text = (x, y, s) =>
    `<text x="${x}" y="${y}" font-size="16">${escape(s)}</text>`;
  const frames = [
    {
      title: tr('Вид спереди · W × H'),
      x: 70,
      y: 225,
      w: w,
      h: h,
      axis: 'front',
    },
    {
      title: tr('Вид сбоку · D × H'),
      x: 740,
      y: 225,
      w: d,
      h: h,
      axis: 'side',
    },
    { title: tr('Вид сверху · W × D'), x: 70, y: 590, w: w, h: d, axis: 'top' },
  ];
  let svg = '';
  for (const f of frames) {
    svg += text(f.x, f.y - 20, f.title);
    if (!f.w || !f.h) {
      svg += text(f.x, f.y + 40, tr('Уточняется у клиента'));
      continue;
    }
    const scale = Math.min(530 / f.w, 230 / f.h),
      ww = f.w * scale,
      hh = f.h * scale;
    const rect = (x, y, a, b, extra = '') =>
      `<rect x="${f.x + x * scale}" y="${f.y + (f.h - y - b) * scale}" width="${a * scale}" height="${b * scale}" fill="none" stroke="#28475b" stroke-width="1.5" ${extra}/>`;
    const line = (x, y, a, b) =>
      `<path d="M${f.x + x * scale} ${f.y + (f.h - y) * scale} L${f.x + a * scale} ${f.y + (f.h - b) * scale}" stroke="#28475b" fill="none"/>`;
    svg += rect(0, 0, f.w, f.h, 'stroke-dasharray="7 5"');
    svg += text(f.x, f.y + hh + 24, `${f.w} × ${f.h} мм`);
    if (spec.kind === 'bench') {
      if (
        f.axis !== 'top' &&
        t.seatHeight &&
        t.seatThickness &&
        (f.axis === 'front' || t.seatDepth)
      )
        svg += rect(
          0,
          t.seatHeight - t.seatThickness,
          f.axis === 'front' ? w : t.seatDepth,
          t.seatThickness,
        );
      if (
        f.axis === 'front' &&
        t.supportSize &&
        t.supportInset != null &&
        t.seatHeight &&
        t.seatThickness
      ) {
        for (const x of [t.supportInset, w - t.supportInset - t.supportSize])
          svg += rect(x, 0, t.supportSize, t.seatHeight - t.seatThickness);
      }
      if (f.axis === 'top' && t.seatDepth) svg += rect(0, 0, w, t.seatDepth);
    } else if (['bin', 'basket', 'container'].includes(spec.kind)) {
      if (
        f.axis === 'front' &&
        t.openingWidth &&
        t.openingHeight &&
        t.openingBottom != null
      )
        svg += rect(
          (w - t.openingWidth) / 2,
          t.openingBottom,
          t.openingWidth,
          t.openingHeight,
        );
    } else if (['cassette', 'panel'].includes(spec.kind)) {
      if (f.axis === 'front' && t.flange) {
        svg += rect(0, 0, w, h);
        svg += text(f.x + ww + 10, f.y + 30, '↳ ' + t.flange + ' мм');
      }
    } else if (['cabinet', 'furniture'].includes(spec.kind)) {
      if (f.axis !== 'top' && t.shelfHeight)
        svg += line(0, t.shelfHeight, f.w, t.shelfHeight);
    } else if (['gate', 'fence', 'louver', 'railing'].includes(spec.kind)) {
      if (f.axis === 'front' && t.slatWidth && t.slatGap != null) {
        for (
          let x = 0, n = 0;
          x + t.slatWidth <= w + 1e-7;
          x += t.slatWidth + t.slatGap, n++
        )
          svg += rect(x, 0, t.slatWidth, h);
      }
    } else if (spec.kind === 'gazebo') {
      if (f.axis !== 'top' && t.roofHeight) {
        // Roof height does not establish its shape or slope direction.
        svg += line(0, h - t.roofHeight, f.w, h - t.roofHeight);
      }
    } else if (spec.kind === 'light') {
      if (f.axis === 'front' && t.baseWidth)
        svg += line((w - t.baseWidth) / 2, 0, (w + t.baseWidth) / 2, 0);
    } else if (
      spec.kind === 'profile' &&
      /г-образ|уголок/i.test(spec.notes || '') &&
      f.axis === 'front' &&
      t.profileA &&
      t.profileB
    ) {
      svg += line(0, 0, t.profileA, 0) + line(0, 0, 0, t.profileB);
    }
  }
  svg += text(650, 640, tr('Расположение деталей показано условно.'));
  svg += text(650, 675, tr('Отверстия, соединения и допуски не заданы.'));
  svg += text(
    650,
    710,
    tr('Неизвестная форма не восстанавливается по габаритам.'),
  );
  svg += text(650, 745, tr('? — размер не указан'));
  return svg;
}
