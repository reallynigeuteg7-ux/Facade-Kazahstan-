import { detailKeys, detailFields } from '../drawings/templates.mjs';
import { benchParts } from '../drawings/bench.mjs';
import { createHash } from 'node:crypto';
import { cleanDrawing, missingDimensions } from '../drawings/model.mjs';
export function fingerprint(lead: Record<string, unknown>) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        lead.product,
        lead.size,
        lead.quantity,
        lead.finish,
        lead.drawing,
        lead.drawing_spec,
      ]),
    )
    .digest('hex');
}
export function checkApprovable(lead: Record<string, unknown>) {
  const spec = cleanDrawing(
    JSON.parse(
      typeof lead.drawing_spec === 'string' ? lead.drawing_spec : 'null',
    ),
  );
  if (
    spec.origin === 'pending' ||
    missingDimensions(spec).length ||
    spec.warnings.length
  )
    throw Error('Уточните все размеры и замечания до согласования чертежа.');
  if (spec.construction.form.endsWith('-frame')) {
    const c = spec.construction;
    if (
      !c.bandWidth ||
      !c.bandHeight ||
      !c.postSize ||
      (c.form !== 'round-frame' && !c.straightSpans.length) ||
      (c.form !== 'rect-frame' && !c.arcSegments)
    )
      throw Error('Заполните пояс, сечение и разбивку стоек.');
  }
  if (!spec.construction.form.endsWith('-frame')) {
    const keys = detailKeys(spec);
    const missing = keys.filter((k) => spec.details[k] == null);
    if (missing.length)
      throw Error(
        'Уточните параметры изделия: ' +
          missing
            .map(
              (k) =>
                (detailFields as Record<string, { label: string }>)[k].label,
            )
            .join(', '),
      );
  }
  if(spec.construction.form === 'slatted-bench') benchParts(spec);
  return spec;
}
