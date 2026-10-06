import { cleanDetails, parseDetails } from './templates.mjs';
import { cleanConstruction, initialConstruction } from './assembly.mjs';
import { catalogFromText, catalogModelById } from './catalog.mjs';
import { blueprintWarnings,validateBlueprintSize } from './blueprints.mjs';
// Parameters are the durable drawing source. SVG is rendered from these values.
export const drawingKinds = [
  { id: 'cassette', label: 'Фасадная кассета', match: /кассет/ },
  { id: 'panel', label: 'Фасадная панель / сайдинг', match: /панел|сайдинг/ },
  {
    id: 'profile',
    label: 'Подсистема / профиль / крепление',
    match: /подсистем|профил|креплен|кронштейн/,
  },
  { id: 'bench', label: 'Скамейка', match: /скаме|скамь|орындық/ },
  { id: 'bin', label: 'Урна', match: /урн|қоқыс жәш/ },
  {
    id: 'light',
    label: 'Уличный светильник',
    match: /светильник|освещ|көше шам/,
  },
  { id: 'gazebo', label: 'Беседка', match: /бесед|күрке/ },
  { id: 'gate', label: 'Деталь ворот / калитки', match: /ворот|калит|қақпа/ },
  { id: 'basket', label: 'Корзина кондиционера', match: /корзин|кондиционер/ },
  { id: 'cabinet', label: 'Металлический ящик / шкаф', match: /ящик|шкаф/ },
  { id: 'fence', label: 'Забор / ограждение', match: /забор|огражд|қоршау/ },
  {
    id: 'furniture',
    label: 'Металлическая мебель',
    match: /мебел|стол|стул|жиһаз/,
  },
  { id: 'container', label: 'Контейнер для мусора', match: /контейнер/ },
  { id: 'louver', label: '3D-жалюзи', match: /жалюз/ },
  { id: 'railing', label: 'Перила', match: /перил|тұтқа/ },
  {
    id: 'architecture',
    label: 'Архитектурное изделие',
    match: /архитектур|сәулет/,
  },
  { id: 'cut', label: 'Деталь лазерной резки', match: /лазер|резк/ },
  { id: 'custom', label: 'Другое изделие / индивидуальная форма', match: /$^/ },
];
export const dimensionFields = [
  { key: 'width', label: 'Ширина W', max: 100000 },
  { key: 'height', label: 'Высота H', max: 100000 },
  { key: 'depth', label: 'Глубина D', max: 100000 },
  { key: 'thickness', label: 'Толщина металла t', max: 100 },
];
export function cleanDrawing(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    input.version !== 1 ||
    !drawingKinds.some((k) => k.id === input.kind)
  )
    throw new Error('Выберите тип изделия для чертежа.');
  /** @type {Record<string, number|null>} */
  const dimensions = {};
  for (const { key, label, max } of dimensionFields) {
    const n = input.dimensions?.[key];
    if (n === null || n === undefined || n === '') {
      dimensions[key] = null;
      continue;
    }
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > max)
      throw new Error(
        `${label}: укажите размер больше 0 и не больше ${max} мм.`,
      );
    dimensions[key] = Math.round(n * 1000) / 1000;
    if (!dimensions[key])
      throw new Error(`${label}: слишком маленький размер.`);
  }
  if (
    dimensions.thickness &&
    ['width', 'height', 'depth'].some(
      (k) => dimensions[k] && dimensions.thickness > dimensions[k],
    )
  )
    throw new Error('Толщина металла не может превышать габарит изделия.');
  const notes = input.notes ?? '';
  if (typeof notes !== 'string' || notes.length > 1000)
    throw new Error('Описание конструкции — до 1000 символов.');
  const origin = [
    'alem',
    'fallback',
    'edited',
    'pending',
    'parameters',
  ].includes(input.origin)
    ? input.origin
    : 'parameters';
  const clearHeight = input.clearHeight ?? null;
  if (
    clearHeight !== null &&
    (typeof clearHeight !== 'number' ||
      !Number.isFinite(clearHeight) ||
      clearHeight <= 0 ||
      clearHeight > 100000)
  )
    throw Error('Проверьте высоту в свету.');
  const construction = cleanConstruction(input.construction, dimensions);
  const catalogId = input.catalogModel === 'none' ? null : input.catalogModel ?? catalogFromText(notes);
  const catalog = catalogModelById(catalogId);
  if (input.catalogModel && input.catalogModel !== 'none' && !catalog)
    throw Error('Выберите существующую модель из каталога.');
  if (catalog && catalog.kind !== input.kind)
    throw Error('Модель каталога не соответствует типу изделия.');
  if (catalog) construction.form = 'unspecified';
  if(catalog?.blueprint)validateBlueprintSize(catalog,dimensions);
  if (construction.form === 'slatted-bench' && input.kind !== 'bench')
    throw Error('Форма скамейки доступна только для скамеек.');
  if (clearHeight && construction.bandHeight) {
    const total =
      Math.round((clearHeight + construction.bandHeight) * 1000) / 1000;
    if (dimensions.height && Math.abs(dimensions.height - total) > 0.01)
      throw Error(
        'Общая высота должна равняться высоте в свету плюс высота пояса.',
      );
    if (total > 100000) throw Error('Общая высота превышает 100000 мм.');
    dimensions.height = total;
  }
  const warnings = input.warnings ?? input.construction?.warnings ?? [];
  if (
    !Array.isArray(warnings) ||
    warnings.length > 10 ||
    warnings.some((v) => typeof v !== 'string' || v.length > 400)
  )
    throw Error('Неверные уточнения чертежа.');
  return {
    version: 1,
    catalogModel: catalog?.id || (input.catalogModel === 'none' ? 'none' : null),
    decoration: input.decoration === 'ethno-catalog-1' ? 'ethno-catalog-1' : 'none',
    kind: input.kind,
    dimensions,
    clearHeight,
    notes: notes.trim(),
    origin,
    construction,
    warnings: catalog?.blueprint ? [...new Set([...blueprintWarnings(catalog,dimensions),...warnings])].slice(0,10) : warnings,
    details: cleanDetails(input.details, dimensions),
  };
}
const valueInMm = (value, unit) =>
  Number(value.replace(',', '.')) * ({ м: 1000, см: 10, мм: 1 }[unit] || 1);
export function initialDrawing(
  product = '',
  size = '',
  finish = '',
  details = '',
  catalogRevision = undefined,
) {
  const clearMatch = (size + '; ' + details).match(
    /(?:высота\s*(?:в свету|чистая)|в свету|ішкі биіктік)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?|(?:высота|биіктігі)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?\s*(?:в свету|таза)/i,
  );
  const clearHeight = clearMatch
    ? valueInMm(
        clearMatch[1] || clearMatch[3],
        (clearMatch[2] || clearMatch[4] || 'мм').toLowerCase(),
      )
    : null;
  if (clearMatch) size = size.replace(clearMatch[0], ' ');
  const productText = product.normalize('NFC').toLowerCase();
  // The first product noun identifies the item. A bench with side panels is
  // still a bench, and a cabinet with mounting brackets is still a cabinet.
  const kind = drawingKinds
    .map((k) => ({ id: k.id, index: productText.search(k.match) }))
    .filter((k) => k.index >= 0)
    .sort((a, b) => a.index - b.index)[0]?.id || 'custom';
  const dimensions = {
    width: null,
    height: null,
    depth: null,
    thickness: null,
  };
  // Unlabelled dimensions are accepted only when the client explicitly supplies W×H×D.
  const triple = size.match(
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?(?=\s|$|[,;])/i,
  );
  if (triple)
    for (const [i, k] of ['width', 'height', 'depth'].entries())
      dimensions[k] = valueInMm(triple[i + 1], triple[4]?.toLowerCase());
  for (const [key, label] of [
    ['width', 'ширина|ширину|ені|W'],
    ['height', 'высота|высоту|биіктігі|H'],
    ['depth', 'глубина|глубину|тереңдігі|D'],
  ]) {
    const match = size.match(
      new RegExp(
        `(?:^|[\\s,;])(?:${label})\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(мм|см|м)?(?=\\s|$|[,;])`,
        'i',
      ),
    );
    if (match) dimensions[key] = valueInMm(match[1], match[2]?.toLowerCase());
  }
  const thickness = finish.match(
    /(?:толщин[аы]?(?:\s+(?:металла|стали|листа))?|қалыңдығы|\bt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?/i,
  );
  if (thickness)
    dimensions.thickness = valueInMm(thickness[1], thickness[2]?.toLowerCase());
  // Invalid or unclear inputs remain unanswered; never substitute a production size.
  for (const f of dimensionFields)
    if (
      dimensions[f.key] !== null &&
      (!Number.isFinite(dimensions[f.key]) ||
        dimensions[f.key] <= 0 ||
        dimensions[f.key] > f.max)
    )
      dimensions[f.key] = null;
  if (
    dimensions.thickness &&
    ['width', 'height', 'depth'].some(
      (k) => dimensions[k] && dimensions.thickness > dimensions[k],
    )
  )
    dimensions.thickness = null;
  const construction = initialConstruction(product + ' ' + details, dimensions);
  const catalogModel = catalogRevision === undefined ? catalogFromText(product + '; ' + details) : catalogRevision;
  const catalog = catalogModelById(catalogModel);
  if (catalog) for (const key of Object.keys(dimensions))
    if (dimensions[key] === null && catalog.known[key] != null) dimensions[key] = catalog.known[key];
  const parsed = parseDetails(details, dimensions);
  return cleanDrawing({
    version: 1,
    kind: catalog?.kind || kind,
    catalogModel,
    dimensions,
    clearHeight,
    notes: '',
    construction,
    details: parsed.details,
    warnings: [...(construction.warnings || []), ...parsed.warnings],
  });
}
export function readDrawing(value) {
  try {
    return cleanDrawing(typeof value === 'string' ? JSON.parse(value) : value);
  } catch {
    return null;
  }
}
export function missingDimensions(spec) {
  return dimensionFields
    .filter((f) => spec.dimensions[f.key] === null)
    .map((f) => f.label);
}
