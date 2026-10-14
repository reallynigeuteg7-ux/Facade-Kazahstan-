import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:3040';
const canonicalBase = 'https://facade-kazahstan.vercel.app';
const data = JSON.parse(fs.readFileSync(new URL('../app/content.json', import.meta.url)));
const directions = ['fasadnye-resheniya', 'blagoustroystvo', 'obrabotka-metalla'];
const paths = ['/', ...Object.keys(data.pages).filter(s => s !== 'discount').map(s => '/' + s), ...directions.map(s => '/' + s), '/catalog-pdf'];
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
}
function metadata(html) {
  return [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attributes(m[0]));
}
async function get(path) {
  const r = await fetch(base + path, { headers: { 'User-Agent': 'Googlebot' } });
  assert.equal(r.status, 200, `${path}: HTTP ${r.status}`);
  assert(!/noindex/i.test(r.headers.get('x-robots-tag') || ''), path);
  return await r.text();
}
const descriptions = new Set();
for (const path of paths) {
  const html = await get(path);
  const meta = metadata(html);
  assert(html.match(/<title>([^<]*Facade Kazakhstan[^<]*)<\/title>/), `${path}: brand title`);
  const description = meta.find(m => m.name === 'description')?.content;
  assert(description?.length >= 40, `${path}: description`);
  assert(!descriptions.has(description), `${path}: duplicate description`);
  descriptions.add(description);
  assert(!meta.some(m => m.name === 'robots' && /noindex/.test(m.content)), `${path}: noindex`);
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attributes(m[0])).find(m => m.rel === 'canonical')?.href;
  assert(canonical, `${path}: missing canonical`);
  assert.equal(new URL(canonical).href, canonicalBase + path, `${path}: canonical`);
  assert.equal(meta.find(m => m.property === 'og:site_name')?.content, 'Facade Kazakhstan');
  assert.equal(new URL(meta.find(m => m.property === 'og:url')?.content).href, canonicalBase + path);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one visible h1`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  if (path === '/') {
    assert(html.includes('Facade Kazakhstan — производство'));
    assert(schemas[0]['@graph'].some(s => s['@type'] === 'WebSite' && s.name === 'Facade Kazakhstan'));
    assert(schemas[0]['@graph'].some(s => s['@type'] === 'Organization' && s.telephone === '+7 776 577 36 66'));
  } else if (path !== '/catalog-pdf') {
    assert(schemas.some(s => s['@type'] === 'BreadcrumbList' && s.itemListElement[1].item === canonicalBase + path), `${path}: breadcrumb`);
  }
}
const xml = await get('/sitemap.xml');
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(urls.sort(), paths.map(p => canonicalBase + p).sort());
const robots = await get('/robots.txt');
assert(robots.includes('Allow: /') && robots.includes('Disallow: /admin') && robots.includes('Disallow: /api/') && robots.includes(canonicalBase + '/sitemap.xml'));
for (const path of ['/landing', '/discount', '/admin']) {
  const html = await get(path);
  assert(metadata(html).some(m => m.name === 'robots' && /noindex/.test(m.content)), `${path}: must not be indexed`);
}
for (const path of ['/favicon.svg', '/facade-logo-black.svg', '/media/new-facade-17869031-1200.webp']) await get(path);
const missing = await fetch(base + '/this-page-does-not-exist', { headers: { 'User-Agent': 'Googlebot' } });
assert.equal(missing.status, 404);
assert((await missing.text()).includes('noindex'));
console.log(`PASS ${base}: ${paths.length} public pages, unique metadata, self canonicals, schemas, full sitemap, robots, private noindex, assets and real 404.`);
