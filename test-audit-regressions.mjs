import assert from 'node:assert/strict';
import { initialDrawing, cleanDrawing } from './lib/drawings/model.mjs';
import { fromAnswers, cleanLead } from './lib/crm/model.mjs';
import { renderDrawingPages } from './lib/drawings/render.mjs';
const clear = initialDrawing(
  'Каркас',
  'ширина 6000 мм; высота 2900 мм в свету; глубина 4000 мм',
  'толщина 2 мм',
);
assert.equal(clear.clearHeight, 2900);
assert.equal(clear.dimensions.height, null);
const total = initialDrawing(
  'Прямоугольный каркас',
  'ширина 6000 мм; высота 2900 мм в свету; глубина 4000 мм',
  'толщина 2 мм',
  'высота пояса 100 мм; ширина пояса 200 мм',
);
assert.equal(total.dimensions.height, 3000);
const bad = initialDrawing(
  'Овальный каркас',
  '16000 × 4000 × 10000 мм',
  'толщина 2 мм',
  'ширина пояса 1000 мм; высота пояса 100 мм; пролёты 1800+2400 мм',
);
assert.equal(bad.construction.form, 'oval-frame');
assert.equal(bad.construction.bandWidth, 1000);
assert(bad.warnings.length);
assert.equal(cleanDrawing(bad).warnings.length, bad.warnings.length);
const rect = initialDrawing(
  'Прямоугольный каркас',
  '6000 × 3000 × 4000 мм',
  'толщина 2 мм',
  'ширина пояса 200 мм; высота пояса 100 мм; пролёты 2800+2800 мм',
);
assert(
  renderDrawingPages(rect)[1].svg.includes(
    new Intl.NumberFormat('ru-RU').format(2800),
  ),
);
assert.throws(
  () =>
    cleanLead({
      name: 'T',
      phone: '+70000000000',
      product: 'Каркас',
      size: '8000 × 3000 × 4000 мм',
      drawing_spec: JSON.stringify(rect),
    }),
  /расходятся/,
);
const answers = [
  'Каркас',
  '6000 × 3000 × 4000 мм',
  '1',
  'толщина 2 мм',
  'форма',
  'Алматы',
  'позже',
  'Тест',
  '+70000000000',
];
const lead = fromAnswers(answers, {
  ...rect,
  dimensions: { ...rect.dimensions, width: 8000 },
  construction: { ...rect.construction, straightSpans: [] },
});
assert(lead.size.startsWith('8000'));
console.log(
  'PASS: clear height, sum, preserved fields and warning, rectangle span lines, mismatch rejection, normalized edited intake.',
);
