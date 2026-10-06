export const constructionForms = [
  { id: 'slatted-bench', label: 'Скамейка с рейками и наклонной спинкой' },
  { id: 'unspecified', label: 'Форма не уточнена' },
  { id: 'box', label: 'Прямоугольная форма' },
  { id: 'rect-frame', label: 'Прямоугольный каркас' },
  { id: 'oval-frame', label: 'Овальный каркас с прямыми участками' },
  { id: 'round-frame', label: 'Круглый каркас' },
];
export const constructionFields = [
  { key: 'bandWidth', label: 'Ширина верхнего пояса', max: 10000 },
  { key: 'bandHeight', label: 'Высота верхнего пояса', max: 10000 },
  { key: 'postSize', label: 'Сечение квадратной стойки', max: 1000 },
  { key: 'postDepth', label: 'Вторая сторона прямоугольной стойки', max: 1000 },
  { key: 'postDiameter', label: 'Диаметр круглой стойки', max: 1000 },
];
export function cleanConstruction(input, dimensions) {
  const c = input ?? {};
  if (typeof c !== 'object' || Array.isArray(c))
    throw Error('Проверьте параметры конструкции.');
  const form = c.form ?? 'unspecified';
  if (!constructionForms.some((f) => f.id === form))
    throw Error('Выберите форму конструкции.');
  /** @type {{form:string,bandWidth:number|null,bandHeight:number|null,postSize:number|null,postDepth:number|null,postDiameter:number|null,straightSpans:number[],arcSegments:number|null}} */
  const result = {
    form,
    bandWidth: null,
    bandHeight: null,
    postSize: null,
    postDepth: null,
    postDiameter: null,
    straightSpans: [],
    arcSegments: null,
  };
  for (const f of constructionFields) {
    const n = c[f.key];
    if (n === undefined || n === null || n === '') {
      result[f.key] = null;
      continue;
    }
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0.001 || n > f.max)
      throw Error(f.label + ': проверьте размер.');
    result[f.key] = Math.round(n * 1000) / 1000;
  }
  const spans = c.straightSpans ?? [];
  if (
    !Array.isArray(spans) ||
    spans.length > 16 ||
    spans.some(
      (n) =>
        typeof n !== 'number' || !Number.isFinite(n) || n < 0.001 || n > 100000,
    )
  )
    throw Error('Пролёты: не более 16 положительных размеров в мм.');
  result.straightSpans = spans.map((n) => Math.round(n * 1000) / 1000);
  const arc = c.arcSegments ?? null;
  if (arc !== null && (!Number.isInteger(arc) || arc < 1 || arc > 24))
    throw Error('Число равных делений полуокружности: от 1 до 24.');
  result.arcSegments = arc;
  const { width: w, depth: d, height: h } = dimensions;
  if (['oval-frame', 'round-frame'].includes(form) && w && d && w < d)
    throw Error(
      'Для овального каркаса ширина W должна быть не меньше глубины D.',
    );
  if (form === 'round-frame' && w && d && Math.abs(w - d) > 0.001)
    throw Error('Для круглого каркаса W и D должны быть равны.');
  if (result.bandWidth && [w, d].some((n) => n && result.bandWidth * 2 >= n))
    throw Error('Ширина пояса должна быть меньше половины габарита.');
  if (result.bandHeight && h && result.bandHeight >= h)
    throw Error('Высота пояса должна быть меньше общей высоты H.');
  if (result.postSize && result.bandWidth && result.postSize > result.bandWidth)
    throw Error('Стойка не должна быть шире верхнего пояса.');
  if(result.postDiameter&&(result.postSize||result.postDepth))throw Error('Стойка: задайте диаметр либо стороны профиля, не оба варианта.');
  if(result.postDepth&&!result.postSize)throw Error('Стойка: укажите первую сторону прямоугольного профиля.');
  if(result.bandWidth&&[result.postDepth,result.postDiameter].some(n=>n&&n>result.bandWidth))throw Error('Стойка не должна быть шире верхнего пояса.');
  const straight =
    form === 'oval-frame' && w && d
      ? w - d
      : form === 'rect-frame' && w && result.bandWidth
        ? w - 2 * result.bandWidth
        : null;
  if (
    spans.length &&
    straight !== null &&
    Math.abs(spans.reduce((a, b) => a + b, 0) - straight) > 0.01
  )
    throw Error(
      'Сумма пролётов должна совпадать с длиной прямого участка: ' +
        straight +
        ' мм.',
    );
  return result;
}
export function initialConstruction(text = '', dimensions = {}) {
  const source = text.normalize('NFC').toLowerCase();
  const c = { form: 'unspecified' };
  if (/каркас|қаңқа|павильон|огражден|қоршау/.test(source)) {
    if (/овал|сопақ/.test(source)) c.form = 'oval-frame';
    else if (/кругл|дөңгелек/.test(source)) c.form = 'round-frame';
    else if (/прямоуголь|тікбұрыш/.test(source)) c.form = 'rect-frame';
  } else if (/прямоуголь|тікбұрыш/.test(source)) c.form = 'box';
  if (/скаме|скамь|орындық/.test(source) && /спинк|арқалық/.test(source) && /рейк|ламел|тақтай/.test(source) && !/без спинки|спинка не нужна/.test(source)) c.form='slatted-bench';
  const labels = {
    bandWidth: 'ширина пояса|белдеу ені',
    bandHeight: 'высота пояса|белдеу биіктігі',
    postSize: 'сечение стойки|стойка квадрат|тірек қимасы',
    postDiameter: 'диаметр стойки|диаметр круглой стойки|тірек диаметрі',
  };
  for (const [key, label] of Object.entries(labels)) {
    const match = source.match(
      new RegExp(
        '(?:' +
          label +
          ')\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(мм|см|м)(?![а-яәғқңөұүһі])',
      ),
    );
    if (match)
      c[key] =
        Number(match[1].replace(',', '.')) *
        { мм: 1, см: 10, м: 1000 }[match[2]];
  }
  const spans = source.match(
    /(?:прол[её]ты|аралықтар)\s*[:=]?\s*((?:\d+(?:[.,]\d+)?\s*\+\s*)+\d+(?:[.,]\d+)?)\s*мм/,
  );
  if (spans)
    c.straightSpans = spans[1]
      .split('+')
      .map((n) => Number(n.trim().replace(',', '.')));
  const arc = source.match(
    /(?:делений полуокружности|жарты шеңбер бөліктері)\s*[:=]?\s*(\d+)/,
  );
  if (arc) c.arcSegments = Number(arc[1]);
  const rectangular=source.match(/(?:стойк[аи]|профиль стоек)\s*(?:прямоугольн\S*\s*)?(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)\s*мм/u);
  if(rectangular){c.postSize=Number(rectangular[1].replace(',','.'));c.postDepth=Number(rectangular[2].replace(',','.'));}
  // Recover only the conflicting field; retain the rest of the customer's geometry.
  const warnings = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return { ...cleanConstruction(c, dimensions), warnings };
    } catch (error) {
      const message = error.message;
      warnings.push(message);
      if (/прол|Прол/.test(message)) c.straightSpans = [];
      else if (/делений/.test(message)) c.arcSegments = null;
      else if (/Высота пояса|Высота верхнего/.test(message))
        c.bandHeight = null;
      else if (/Ширина пояса|Ширина верхнего/.test(message)) c.bandWidth = null;
      else if (/Стойка|стойки/.test(message)) {c.postSize = null;c.postDepth=null;c.postDiameter=null;}
      else c.form = 'unspecified';
    }
  }
  return { ...cleanConstruction({}, dimensions), warnings };
}
