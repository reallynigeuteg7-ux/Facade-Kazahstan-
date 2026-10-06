import assert from 'node:assert/strict';
import { initialDrawing } from './lib/drawings/model.mjs';
import { assemblyGeometry, renderDrawingPages } from './lib/drawings/render.mjs';
import { sceneGeometry, exportObj } from './lib/drawings/scene.mjs';

const source = 'Овальный каркас; ширина пояса 1000 мм; высота пояса 100 мм; пролёты 1800+2400+1800 мм; делений полуокружности 6';
const base = initialDrawing('Овальный каркас', '16000 × 4000 × 10000 мм', '', source);
const spec = { ...base, notes: 'Перемычки над крайними проёмами прямых сторон: две горизонтали и средняя вертикальная вставка; отметки не заданы.' };
const g = assemblyGeometry(spec);
const scene = sceneGeometry(g);
assert.equal(g.stations.length, 18);
assert.equal(scene.guides.length, 18);
assert(!scene.faces.some((f) => f.name.startsWith('post_')));
for (const [i, guide] of scene.guides.entries()) {
  assert.deepEqual(guide.points, [[...g.stations[i], 0], [...g.stations[i], 3900]]);
}
assert.equal(spec.construction.postSize, null);
const pages = renderDrawingPages(spec);
for (const page of pages.filter((p) => /Объёмный вид|3D \/|Вид (спереди|сзади|слева|справа)/.test(p.title))) {
  assert.equal((page.svg.match(/data-schematic="post-section"/g) || []).length, 18);
  assert.equal((page.svg.match(/data-schematic="opening-header"/g) || []).length, 8);
  assert(page.svg.includes('сечение не задано'));
}
assert(!renderDrawingPages({ ...spec, notes: 'Перемычки не нужны' })[0].svg.includes('data-schematic="opening-header"'));
const obj = exportObj(g);
assert.equal((obj.match(/^l /gm) || []).length, 18);
assert(!obj.includes('opening-header'));

for (const section of ['стойка квадрат 80 мм', 'диаметр круглой стойки 80 мм', 'стойка 80×40 мм']) {
  const known = initialDrawing('Овальный каркас', '16000 × 4000 × 10000 мм', '', source + '; ' + section);
  const knownScene = sceneGeometry(assemblyGeometry(known));
  assert.equal(knownScene.guides.length, 0);
  assert(knownScene.faces.some((f) => f.name === 'post_18'));
}
console.log('PASS: all frame views retain 18 known post axes without inventing a section; known sections remain solid; reference headers stay schematic and are excluded from OBJ.');
