// Explicit slatted-bench template. All unconfirmed design choices belong in spec.warnings.
export function benchParts(spec) {
  const { width: w, height: h, depth: d } = spec.dimensions,
    t = spec.details;
  const s = t.supportSize,
    sh = t.seatHeight,
    sd = t.seatDepth,
    th = t.seatThickness;
  const sw = t.slatWidth,
    gap = t.slatGap,
    panel = t.backPanelHeight,
    inset = t.supportInset;
  const foot = t.footInset;
  if (
    ![w, h, d, s, sh, sd, th, sw, panel, foot].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    gap == null ||
    inset == null
  )
    throw Error(
      'Для скамейки с рейками укажите габариты, сиденье, опоры, рейки, зазор и верхнюю панель.',
    );
  const span = w - 2 * (inset + s),
    front = -d / 2,
    rear = front + sd;
  const start = [rear, sh],
    end = [d / 2, h];
  const dy = end[0] - start[0],
    dz = end[1] - start[1],
    length = Math.hypot(dy, dz);
  if (
    span <= 0 ||
    rear >= end[0] ||
    sh <= s + th ||
    sd <= s * 2 ||
    h <= sh + s ||
    panel >= length - sw
  )
    throw Error('Проверьте геометрию сиденья и наклонной спинки.');
  const uy = dy / length,
    uz = dz / length;
  const result = [];
  const prism = (x, width, profile, name) =>
    result.push({ x, width, profile, name });
  if (foot < s || foot + s >= sd)
    throw Error('Отступ передней ножки должен помещаться под сиденьем.');
  for (const [i, x] of [-w / 2 + inset, w / 2 - inset - s].entries()) {
    const top = sh - th;
    prism(
      x,
      s,
      [
        [front + foot, 0],
        [d / 2, 0],
        [d / 2, s],
        [front + foot + s, s],
      ],
      'metal_base_' + i,
    );
    prism(
      x,
      s,
      [
        [front + foot, 0],
        [front + foot + s, s],
        [front + s, top - s],
        [front, top],
      ],
      'metal_front_' + i,
    );
    prism(
      x,
      s,
      [
        [front, top],
        [front + s, top - s],
        [rear - s, top - s],
        [rear, top],
      ],
      'metal_seat_' + i,
    );
    prism(
      x,
      s,
      [
        [rear - s, sh - th - s],
        [rear, sh - th - s],
        [end[0], end[1]],
        [end[0] - s, end[1]],
      ],
      'metal_back_' + i,
    );
  }
  const n = Math.floor((sd + gap) / (sw + gap));
  if (n < 1 || n > 1000)
    throw Error('Число реек сиденья должно быть от 1 до 1000.');
  const margin = (sd - (n * sw + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const y = front + margin + i * (sw + gap);
    prism(
      -span / 2,
      span,
      [
        [y, sh - th],
        [y + sw, sh - th],
        [y + sw, sh],
        [y, sh],
      ],
      'wood_seat_' + i,
    );
  }
  const backAvailable = length - panel - gap;
  const count = Math.floor((backAvailable + gap) / (sw + gap));
  if (count < 1 || count > 1000)
    throw Error('Проверьте высоту панели и реек спинки.');
  const backMargin = (backAvailable - (count * sw + (count - 1) * gap)) / 2;
  const backStrip = (offset, size, name) => {
    const a = [start[0] + uy * offset, start[1] + uz * offset],
      b = [a[0] + uy * size, a[1] + uz * size];
    const thickness = name.startsWith('wood_')
      ? th
      : spec.dimensions.thickness || th;
    prism(
      -span / 2,
      span,
      [a, [a[0] - thickness, a[1]], [b[0] - thickness, b[1]], b],
      name,
    );
  };
  for (let i = 0; i < count; i++)
    backStrip(backMargin + i * (sw + gap), sw, 'wood_back_' + i);
  backStrip(length - panel, panel, 'metal_decor_panel');
  return result;
}
