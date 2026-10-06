import { createHash } from 'node:crypto';
import { get, put } from '@vercel/blob';
import { cleanDrawing } from '../drawings/model.mjs';

type VisualLead = {
  id: string;
  product: string;
  size: string;
  finish: string;
  drawing: string;
  drawing_spec: string;
};

const VISUAL_VERSION = 'openai-concept-v1';
const MODEL = 'gpt-image-2.5-sunburst';
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function visualConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function visualPath(lead: VisualLead) {
  const spec = cleanDrawing(JSON.parse(lead.drawing_spec));
  const digest = createHash('sha256')
    .update(JSON.stringify({
      version: VISUAL_VERSION,
      model: MODEL,
      product: lead.product,
      size: lead.size,
      finish: lead.finish,
      drawing: lead.drawing,
      spec,
    }))
    .digest('hex')
    .slice(0, 24);
  return `crm-visuals/${lead.id}/${digest}.png`;
}

export async function getVisual(lead: VisualLead) {
  return get(visualPath(lead), { access: 'private', useCache: false });
}

export function visualPrompt(lead: VisualLead) {
  const spec = cleanDrawing(JSON.parse(lead.drawing_spec));
  const isBench = spec.kind === 'bench';
  const brief = {
    product: lead.product.slice(0, 180),
    clientDescription: lead.drawing.slice(0, 500),
    materialsAndFinish: lead.finish.slice(0, 300),
    dimensionsMm: spec.dimensions,
    construction: spec.construction.form,
    detailsMm: spec.details,
    ornamentFromCatalog: spec.decoration === 'ethno-catalog-1',
  };
  return [
    'Create a polished landscape A3 industrial-design CONCEPT BOARD for a client review.',
    isBench
      ? 'Use the first reference image only for the layout, visual precision and drafting style. Ignore every number, word and product dimension printed in that image.'
      : 'Use the visual precision and layout of a professional industrial-design presentation board.',
    isBench
      ? 'The second reference image is the actual catalog product. Preserve its distinctive silhouette, decorative ethnic pattern, proportions, material placement and armrest/leg character as closely as the image permits.'
      : 'Depict only the product described below; do not change its category.',
    'On one clean white board show a large front orthographic view, side view, rear view, top view, an exploded assembly illustration, two small connection/detail closeups and a beautiful three-quarter perspective view.',
    'Fine crisp charcoal linework, subtle accurate wood/metal shading, deliberate spacing, publication-quality technical illustration, consistent form across every view.',
    'Do NOT draw any words, digits, dimension arrows, logos, title blocks or tables. Leave generous clean space around each view for exact dimensions to be added separately by software.',
    'Do not invent a confirmed joint, fastener, hole, weld, section or material when it is not supplied. Unknown details may remain visually simplified.',
    'The image is an illustrative concept, not a manufacturing drawing. Do not imitate a photo or add a scene/background.',
    `Order data (the only source of product-specific values): ${JSON.stringify(brief)}`,
  ].join('\n');
}

async function referenceImage(origin: string, pathname: string) {
  const response = await fetch(new URL(pathname, origin), {
    signal: AbortSignal.timeout(12000),
    cache: 'force-cache',
  });
  if (!response.ok) throw new Error('reference_unavailable');
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error('reference_invalid');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 8_000_000) throw new Error('reference_too_large');
  return new Blob([bytes], { type });
}

export async function ensureVisual(lead: VisualLead, origin: string) {
  if (!visualConfigured()) throw new Error('OpenAI API не подключён.');
  const pathname = visualPath(lead);
  const existing = await getVisual(lead);
  if (existing?.statusCode === 200) {
    await existing.stream.cancel();
    return pathname;
  }
  const spec = cleanDrawing(JSON.parse(lead.drawing_spec));
  const prompt = visualPrompt(lead);
  const form = new FormData();
  form.set('model', MODEL);
  form.set('prompt', prompt);
  form.set('size', '1536x1024');
  form.set('quality', 'high');
  form.set('output_format', 'png');
  let endpoint = 'https://api.openai.com/v1/images/generations';
  if (spec.kind === 'bench') {
    const [layout, product] = await Promise.all([
      referenceImage(origin, '/drawing-reference/bench-layout.png'),
      referenceImage(origin, '/catalog-document/page-1.jpg'),
    ]);
    form.append('image[]', layout, 'layout.png');
    form.append('image[]', product, 'catalog-bench.jpg');
    endpoint = 'https://api.openai.com/v1/images/edits';
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...(spec.kind === 'bench' ? {} : { 'Content-Type': 'application/json' }),
    },
    body: spec.kind === 'bench'
      ? form
      : JSON.stringify({
          model: MODEL,
          prompt,
          size: '1536x1024',
          quality: 'high',
          output_format: 'png',
        }),
    signal: AbortSignal.timeout(100000),
  });
  if (!response.ok) throw new Error(`OpenAI image API: HTTP ${response.status}`);
  const data = (await response.json()) as { data?: { b64_json?: string }[] };
  const encoded = data.data?.[0]?.b64_json;
  if (!encoded || encoded.length > 25_000_000) throw new Error('OpenAI не вернул изображение.');
  const image = Buffer.from(encoded, 'base64');
  if (image.length < 1000 || !image.subarray(0, 8).equals(pngSignature))
    throw new Error('OpenAI вернул неверный формат изображения.');
  try {
    await put(pathname, image, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'image/png',
    });
  } catch (error) {
    // A concurrent request may have stored the same visual first.
    if ((await getVisual(lead))?.statusCode !== 200) throw error;
  }
  return pathname;
}
