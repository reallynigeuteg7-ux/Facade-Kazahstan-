import assert from 'node:assert/strict';
import { initialDrawing, cleanDrawing } from './lib/drawings/model.mjs';
import { benchParts } from './lib/drawings/bench.mjs';
import { renderDrawingPages } from './lib/drawings/render.mjs';

function bench(width, slatWidth, footInset = 100) {
  const base = initialDrawing('Скамейка', `${width} × 860 × 620 мм`);
  return cleanDrawing({
    ...base,
    construction: { ...base.construction, form: 'slatted-bench' },
    details: {
      ...base.details,
      seatHeight: 450,
      seatDepth: 430,
      seatThickness: 30,
      supportSize: 40,
      supportInset: 100,
      slatWidth,
      slatGap: 10,
      backPanelHeight: 100,
      footInset,
    },
  });
}

const first = bench(1500, 90);
const second = bench(1800, 70);
const firstParts = benchParts(first);
const secondParts = benchParts(second);
const firstSeatCount = firstParts.filter((part) =>
  part.name.startsWith('wood_seat_'),
).length;
const secondSeatCount = secondParts.filter((part) =>
  part.name.startsWith('wood_seat_'),
).length;
assert.notEqual(firstSeatCount, secondSeatCount);
assert.equal(firstSeatCount, 4);
assert.equal(secondSeatCount, 5);

const pages = renderDrawingPages(
  first,
  'Скамейка — тестовый заказ',
  'BENCH-TEST',
);
assert.equal(pages[1].title, '02 / Сборочный лист скамейки');
assert(pages[1].svg.includes('1 500 мм'));
assert(pages[1].svg.includes('620 мм'));
assert((pages[1].svg.match(/marker-start="url\(#dim\)"/g) || []).length >= 8);
assert(pages[1].svg.includes('4 реек сиденья'));
assert(!pages[1].svg.includes('Орнамент реконструирован'));

const missingFoot = bench(1500, 90, null);
assert.throws(() => benchParts(missingFoot), /укажите габариты/);
const missingPages = renderDrawingPages(
  missingFoot,
  'Скамейка без размера ножки',
);
assert(missingPages[1].svg.includes('Отступ передней ножки'));
assert(!missingPages[1].svg.includes('<polygon points='));

console.log(
  'PASS: orthographic sheet shares parametric geometry, slat count changes with inputs, and missing foot inset does not get guessed.',
);
