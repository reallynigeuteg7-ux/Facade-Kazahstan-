import { initialDrawing, cleanDrawing } from '../drawings/model.mjs';
export function sizeText(spec) {
  return (
    ['width', 'height', 'depth']
      .map((k) => spec.dimensions[k] ?? '?')
      .join(' × ') + ' мм'
  );
}
export function withDrawing(lead, spec) {
  const next = {
    ...lead,
    size: sizeText(spec),
    drawing_spec: JSON.stringify(spec),
  };
  const thickness = spec.dimensions.thickness;
  next.finish = (lead.finish || '')
    .replace(
      /(?:толщин[аы]?(?:\s+(?:металла|стали|листа))?|қалыңдығы|\bt)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:мм|см|м)?/gi,
      '',
    )
    .replace(/^[,;\s]+|[,;\s]+$/g, '');
  if (thickness)
    next.finish =
      (next.finish ? next.finish + '; ' : '') + 'толщина ' + thickness + ' мм';
  next.drawing = spec.notes.slice(0, 600);
  return next;
}
export function editLeadField(lead, key, value) {
  const next = { ...lead, [key]: value };
  if (!lead.drawing_spec) return next;
  let spec;
  try {
    spec = JSON.parse(lead.drawing_spec);
  } catch {
    return next;
  }
  if (!['size', 'finish', 'drawing', 'product'].includes(key)) return next;
  const parsed = initialDrawing(
    next.product,
    next.size,
    next.finish,
    next.drawing,
    key === 'product' ? undefined : spec.catalogModel ?? 'none',
  );
  if (key === 'size') {
    spec.dimensions = {
      ...spec.dimensions,
      ...parsed.dimensions,
      thickness: spec.dimensions.thickness,
    };
    spec.clearHeight = parsed.clearHeight;
  }
  if (key === 'finish')
    spec.dimensions = {
      ...spec.dimensions,
      thickness: parsed.dimensions.thickness,
    };
  if (key === 'product') { spec.kind = parsed.kind; spec.catalogModel = parsed.catalogModel; }
  if (key === 'drawing') {
    spec.notes = value;
    spec.construction = parsed.construction;
    spec.warnings = parsed.warnings;
    spec.details = parsed.details;
  }
  return {
    ...next,
    drawing_spec: JSON.stringify({ ...spec, origin: 'edited' }),
  };
}
export function assertConsistent(lead) {
  if (!lead.drawing_spec) return;
  const spec = cleanDrawing(JSON.parse(lead.drawing_spec));
  const parsed = initialDrawing(
    lead.product,
    lead.size,
    lead.finish,
    lead.drawing,
    spec.catalogModel ?? 'none',
  );
  for (const key of ['width', 'height', 'depth', 'thickness'])
    if (
      parsed.dimensions[key] !== null &&
      parsed.dimensions[key] !== spec.dimensions[key]
    )
      throw Error(
        'Размеры заявки расходятся с чертежом. Измените параметры чертежа и сохраните снова.',
      );
}
