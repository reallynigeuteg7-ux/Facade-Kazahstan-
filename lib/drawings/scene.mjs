import { benchParts } from './bench.mjs';
import { ethnoGeometry } from './ethno.mjs';
import { catalogGeometry } from './catalog-geometry.mjs';
import { faceSvg } from './face-svg.mjs';
import { rasterView } from './raster-view.mjs';
import { faceTriangles } from './solid.mjs';
// Millimetre geometry shared by the interactive viewer, drawing sheets and OBJ export.
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((v, n, i) => v + n * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v) => v.map((n) => n / (Math.hypot(...v) || 1));
const shadeReference = (color, normal) => {
  const factor=.75+.25*Math.max(0,dot(normal,unit([-.3,-.5,1])));
  return 'rgb('+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*factor)).join(',')+')';
};
const fmt = (n) =>
  n == null
    ? '?'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
export const defaultCamera = {
  yaw: 0,
  elevation: 48,
  zoom: 1,
  dimensions: true,
};
export function sceneGeometry(g) {
  if (g.spec.catalogModel && !g.frame) {
    const catalog = catalogGeometry(g.spec);
    if (catalog) return catalog;
  }
  const faces = [],
    wires = [],
    parts = [],
    guides = [];
  const face = (points, name, edges = points.map(() => true)) => {
    if (
      Math.hypot(
        ...cross(sub(points[1], points[0]), sub(points[2], points[0])),
      ) > 1e-8
    )
      faces.push({ points, name, edges });
  };
  const box = (x, y, z, w, d, h, name) => {
    if (![x, y, z, w, d, h].every(Number.isFinite) || Math.min(w, d, h) <= 0)
      return;
    const b = [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ],
      t = b.map(([x, y]) => [x, y, z + h]);
    face([...b].reverse(), name);
    face(t, name);
    for (let i = 0; i < 4; i++)
      face([b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]], name);
    parts.push(name);
  };
  const { w, h, d, spec } = g,
    c = spec.construction,
    t = spec.details;
  if (!g.complete) return { faces, wires, parts, guides };
  if (g.frame && g.inner.length) {
    if (c.bandHeight) {
      const bottom = h - c.bandHeight;
      for (let i = 0; i < g.outer.length; i++) {
        const j = (i + 1) % g.outer.length,
          a = g.outer[i],
          b = g.outer[j],
          ai = g.inner[i],
          bi = g.inner[j];
        const edge = !g.curved || i === 0 || i === g.outer.length / 2;
        face(
          [
            [...a, bottom],
            [...b, bottom],
            [...b, h],
            [...a, h],
          ],
          'upper_band',
          [true, edge, true, edge],
        );
        face(
          [
            [...bi, bottom],
            [...ai, bottom],
            [...ai, h],
            [...bi, h],
          ],
          'upper_band',
          [true, edge, true, edge],
        );
        face(
          [
            [...a, h],
            [...b, h],
            [...bi, h],
            [...ai, h],
          ],
          'upper_band',
          [true, false, true, false],
        );
        face(
          [
            [...ai, bottom],
            [...bi, bottom],
            [...b, bottom],
            [...a, bottom],
          ],
          'upper_band',
          [true, false, true, false],
        );
      }
      parts.push('upper_band');
      if (c.postDiameter) {
        const radius = c.postDiameter / 2;
        for (const [i, [x, y]] of g.stations.entries()) {
          const ring = Array.from({ length: 32 }, (_, j) => [
            x + radius * Math.cos((j * Math.PI) / 16),
            y + radius * Math.sin((j * Math.PI) / 16),
            0,
          ]);
          const top = ring.map(([x, y]) => [x, y, bottom]),
            name = 'post_' + (i + 1);
          face([...ring].reverse(), name);
          face(top, name);
          for (let j = 0; j < 32; j++) {
            const k = (j + 1) % 32;
            face([ring[j], ring[k], top[k], top[j]], name, [
              true,
              false,
              true,
              false,
            ]);
          }
          parts.push(name);
        }
      } else if (c.postSize)
        for (const [i, [x, y]] of g.stations.entries())
          box(
            x - c.postSize / 2,
            y - (c.postDepth || c.postSize) / 2,
            0,
            c.postSize,
            c.postDepth || c.postSize,
            bottom,
            'post_' + (i + 1),
          );
      else {
        // Missing cross-section does not erase the known position and height.
        // These are centre lines, not invented solid profiles.
        for (const [i, [x, y]] of g.stations.entries())
          guides.push({
            name: 'post_axis_' + (i + 1),
            points: [[x, y, 0], [x, y, bottom]],
          });
        wires.push(g.inner.map(([x, y]) => [x, y, 0]));
      }
    } else
      wires.push(
        g.outer.map((p) => [...p, h]),
        g.inner.map((p) => [...p, h]),
      );
  } else if (spec.kind === 'bench' && c.form === 'slatted-bench') {
    if (
      [
        'seatHeight',
        'seatDepth',
        'seatThickness',
        'supportSize',
        'slatWidth',
        'backPanelHeight',
        'footInset',
      ].some((k) => !t[k]) ||
      t.slatGap == null ||
      t.supportInset == null
    )
      return { faces, wires, parts, guides };
    for (const part of benchParts(spec)) {
      const a = part.profile.map(([y, z]) => [part.x, y, z]);
      const b = part.profile.map(([y, z]) => [part.x + part.width, y, z]);
      // Normalize winding in the YZ plane so both end caps face outwards.
      const area = part.profile.reduce((sum, p, i) => {
        const q = part.profile[(i + 1) % part.profile.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0);
      if (area < 0) {
        a.reverse();
        b.reverse();
      }
      face([...a].reverse(), part.name);
      face(b, part.name);
      for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        face([a[i], a[j], b[j], b[i]], part.name);
      }
      parts.push(part.name);
    }
    if (spec.decoration === 'ethno-catalog-1') {
      for (const points of ethnoGeometry(spec)) face(points, 'ethno_ornament');
      parts.push('ethno_ornament');
    }
  } else if (spec.kind === 'bench') {
    if (t.seatHeight && t.seatDepth && t.seatThickness) {
      box(
        -w / 2,
        -d / 2,
        t.seatHeight - t.seatThickness,
        w,
        t.seatDepth,
        t.seatThickness,
        'seat',
      );
      if (t.supportSize && t.supportInset != null) {
        for (const [i, x] of [
          -w / 2 + t.supportInset,
          w / 2 - t.supportInset - t.supportSize,
        ].entries())
          box(
            x,
            -d / 2,
            0,
            t.supportSize,
            t.supportSize,
            t.seatHeight - t.seatThickness,
            'support_' + (i + 1),
          );
      }
    }
  } else if (
    ['bin', 'basket', 'container', 'cabinet', 'furniture'].includes(
      spec.kind,
    ) &&
    spec.dimensions.thickness
  ) {
    const s = spec.dimensions.thickness;
    if (w > 2 * s && d > 2 * s && h > s) {
      box(-w / 2, -d / 2, 0, w, d, s, 'bottom');
      box(-w / 2, -d / 2, s, s, d, h - s, 'left');
      box(w / 2 - s, -d / 2, s, s, d, h - s, 'right');
      box(-w / 2 + s, d / 2 - s, s, w - 2 * s, s, h - s, 'back');
      if (
        t.openingWidth &&
        t.openingHeight &&
        t.openingBottom != null &&
        t.openingBottom >= s
      ) {
        const ow = t.openingWidth,
          oh = t.openingHeight,
          ob = t.openingBottom;
        box(-w / 2 + s, -d / 2, s, w - 2 * s, s, ob - s, 'front_bottom');
        box(
          -w / 2 + s,
          -d / 2,
          ob + oh,
          w - 2 * s,
          s,
          h - ob - oh,
          'front_top',
        );
        box(-w / 2 + s, -d / 2, ob, (w - ow) / 2 - s, s, oh, 'front_left');
        box(ow / 2, -d / 2, ob, (w - ow) / 2 - s, s, oh, 'front_right');
      } else box(-w / 2 + s, -d / 2, s, w - 2 * s, s, h - s, 'front');
      if (t.shelfHeight)
        box(
          -w / 2 + s,
          -d / 2 + s,
          t.shelfHeight - s,
          w - 2 * s,
          d - 2 * s,
          s,
          'shelf',
        );
    }
  } else if (
    ['cassette', 'panel'].includes(spec.kind) &&
    spec.dimensions.thickness
  ) {
    const s = spec.dimensions.thickness;
    box(-w / 2, -d / 2, 0, w, s, h, 'panel');
    if (t.flange && t.flange > s && t.flange <= d) {
      box(-w / 2, -d / 2 + s, 0, s, t.flange - s, h, 'fold_left');
      box(w / 2 - s, -d / 2 + s, 0, s, t.flange - s, h, 'fold_right');
      box(-w / 2 + s, -d / 2 + s, 0, w - 2 * s, t.flange - s, s, 'fold_bottom');
      box(
        -w / 2 + s,
        -d / 2 + s,
        h - s,
        w - 2 * s,
        t.flange - s,
        s,
        'fold_top',
      );
    }
  } else if (
    ['fence', 'gate', 'railing', 'louver'].includes(spec.kind) &&
    t.slatWidth &&
    t.slatGap != null
  ) {
    for (
      let x = -w / 2, n = 0;
      x + t.slatWidth <= w / 2 + 1e-7;
      x += t.slatWidth + t.slatGap, n++
    )
      box(x, -d / 2, 0, t.slatWidth, d, h, 'slat_' + (n + 1));
  } else if (
    spec.kind === 'profile' &&
    /г-образ|уголок/i.test(spec.notes) &&
    t.profileA &&
    t.profileB &&
    spec.dimensions.thickness
  ) {
    const s = spec.dimensions.thickness;
    box(-w / 2, -d / 2, 0, t.profileA, d, s, 'profile_a');
    box(-w / 2, -d / 2, s, s, d, t.profileB - s, 'profile_b');
  } else if (c.form === 'box') box(-w / 2, -d / 2, 0, w, d, h, 'body');
  return { faces, wires, parts, guides };
}
export function renderScene(g, options = {}, tr = (s) => s) {
  const camera = { ...defaultCamera, ...options };
  const yaw = (camera.yaw * Math.PI) / 180,
    el = (camera.elevation * Math.PI) / 180;
  const right = [Math.cos(yaw), Math.sin(yaw), 0],
    up = [
      -Math.sin(yaw) * Math.sin(el),
      Math.cos(yaw) * Math.sin(el),
      Math.cos(el),
    ];
  const toward = [
    Math.sin(yaw) * Math.cos(el),
    -Math.cos(yaw) * Math.cos(el),
    Math.sin(el),
  ];
  const w = g.w || 1000,
    d = g.d || 700,
    h = g.h || 800;
  const scene = sceneGeometry(g);
  const corners = [
    [-w / 2, -d / 2, 0],
    [w / 2, -d / 2, 0],
    [w / 2, d / 2, 0],
    [-w / 2, d / 2, 0],
  ];
  const bounds = [...corners, ...corners.map(([x, y]) => [x, y, h])];
  const xy = (p) => [dot(p, right), -dot(p, up)];
  const arcDetail =
    ['arc', 'arc-side'].includes(camera.detail) && g.curved && g.inner.length;
  const focusBounds = arcDetail
    ? [(w - d) / 2, w / 2].flatMap((x) =>
        [-d / 2, d / 2].flatMap((y) => [0, h].map((z) => [x, y, z])),
      )
    : scene.dimensionScope==='bench'?scene.faces.filter(f=>!f.surfaceDecoration).flatMap(f=>f.points):bounds;
  const projected = focusBounds.map(xy),
    xs = projected.map((p) => p[0]),
    ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale =
    Math.min(1080 / Math.max(maxX - minX, 1), 525 / Math.max(maxY - minY, 1)) *
    Math.max(0.55, Math.min(1.6, camera.zoom)) *
    (arcDetail ? 0.85 : 1);
  const p = (point) => {
    const [x, y] = xy(point);
    return [
      700 + (x - (minX + maxX) / 2) * scale,
      (arcDetail ? 470 : 520) + (y - (minY + maxY) / 2) * scale,
    ];
  };
  const text = (x, y, s, extra = '') =>
    `<text x="${x}" y="${y}" font-size="19" fill="#242725" ${extra}>${esc(s)}</text>`;
  const line = (a, b, extra = '') =>
    `<path d="M${a.join(' ')} L${b.join(' ')}" fill="none" stroke="#292d2a" stroke-width="1.15" ${extra}/>`;
  const referenceHeaders = g.frame && g.straight && g.spec.construction.straightSpans.length >= 2 &&
    /перемычки над крайними про[её]мами|шеткі ойықтардың үстіндегі маңдайшалар/iu.test(g.spec.notes) &&
    !/без перемычек|перемычки не нужны|маңдайшалар қажет емес/iu.test(g.spec.notes);
  let out =
    '<defs><clipPath id="sceneClip"><rect x="45" y="190" width="1310" height="655" rx="4"/></clipPath></defs><rect x="45" y="190" width="1310" height="655" rx="4" fill="#d1d3cf"/><g clip-path="url(#sceneClip)" data-view="3d">';
  const schematicLine = (a, b, attributes) =>
    `<g ${attributes}>${line(a, b, 'style="stroke:#3d4641;stroke-width:5.5;stroke-linecap:butt"')}${line(a, b, 'style="stroke:#f4f6f3;stroke-width:3;stroke-linecap:butt"')}</g>`;
  for (const guide of scene.guides)
    out += schematicLine(p(guide.points[0]), p(guide.points[1]), `data-part="${guide.name}" data-schematic="post-section"`);
  if (referenceHeaders && g.spec.construction.bandHeight) {
    const c = g.spec.construction,
      a = g.straight / 2,
      r = g.d / 2 - c.bandWidth,
      bottom = g.h - c.bandHeight;
    let x = -a;
    c.straightSpans.forEach((span, index) => {
      if (index === 0 || index === c.straightSpans.length - 1) {
        for (const y of [-r, r]) {
          const topA = p([x, y, bottom]), topB = p([x + span, y, bottom]);
          if (Math.hypot(...sub(p([x, y, 0]), topA)) < 30) continue;
          const direction = unit(sub(p([x, y, 0]), topA));
          // Pixel offsets describe the reference's topology only. No unprovided
          // header elevation or profile size is added to the millimetre model.
          const row = (point, offset) => point.map((n, i) => n + direction[i] * offset);
          const occlusion = Math.max(0, dot(sub(p([x, Math.sign(y) * g.d / 2, g.h]), topA), direction));
          const nearA = row(topA, occlusion + 10), nearB = row(topB, occlusion + 10),
            farA = row(topA, occlusion + 24), farB = row(topB, occlusion + 24);
          out += schematicLine(nearA, nearB, 'data-schematic="opening-header"');
          out += schematicLine(farA, farB, 'data-schematic="opening-header"');
          const middle = (a, b) => a.map((n, i) => (n + b[i]) / 2);
          out += schematicLine(middle(nearA, nearB), middle(farA, farB), 'data-schematic="header-divider"');
        }
      }
      x += span;
    });
  }
  const decorationDepths=new Map();
  for(const f of scene.faces)if(!f.surfaceDecoration){const depth=f.points.reduce((s,v)=>s+dot(v,toward),0)/f.points.length;decorationDepths.set(f.name,Math.max(decorationDepths.get(f.name)??-Infinity,depth));}
  const visible = scene.faces
    .map((f) => ({
      ...f,
      normal: f.normal || unit(
        cross(sub(f.points[1], f.points[0]), sub(f.points[2], f.points[0])),
      ),
      depth: f.surfaceDecoration ? (decorationDepths.get(f.decorationHost||'upper_decor_panel')??0) + .001 : f.points.reduce((s, v) => s + dot(v, toward), 0) / f.points.length,
    }))
    .filter((f) => dot(f.normal, toward) > 0.00001)
    .sort(
      (a, b) =>
        Number(a.name === 'ethno_ornament') -
          Number(b.name === 'ethno_ornament') || a.depth - b.depth,
    );
  if(scene.solidRevision)out+=rasterView(scene.faces,p,toward,{x:45,y:190,w:1310,h:655},1.6);
  for (const f of scene.solidRevision?[]:visible) {
    const shade = Math.round(
      193 + 57 * Math.max(0, dot(f.normal, unit([-0.3, -0.5, 1]))),
    );
    const fill =
        f.color
          ? shadeReference(f.color, f.normal)
          : f.name === 'ethno_ornament'
          ? '#258b9f'
          : f.name.startsWith('wood_')
            ? `rgb(${Math.round(shade * 0.68)},${Math.round(shade * 0.46)},${Math.round(shade * 0.29)})`
            : `rgb(${shade},${shade},${shade})`,
      points = f.points.map(p);
    if(scene.solidRevision){out+=faceSvg(f,p,fill,'#4f575b',.65);continue;}
    out += `<polygon points="${points.map((v) => v.join(',')).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${f.surfaceDecoration?.08:.5}"/>`;
    for (let i = 0; i < points.length; i++) {
      let edge = f.edges[i];
      if (
        !edge &&
        g.spec.construction.postDiameter &&
        f.name.startsWith('post_') &&
        points.length === 4 &&
        (i === 1 || i === 3)
      ) {
        const center = g.stations[Number(f.name.slice(5)) - 1],
          v = f.points[i === 1 ? 1 : 0];
        const angle =
          Math.atan2(v[1] - center[1], v[0] - center[0]) +
          ((i === 1 ? 1 : -1) * Math.PI) / 32;
        edge = dot([Math.cos(angle), Math.sin(angle), 0], toward) <= 0.00001;
      }
      if (edge && f.name !== 'ethno_ornament')
        out += line(points[i], points[(i + 1) % points.length]);
    }
  }
  for (const wire of scene.wires) {
    const pts = wire.map(p);
    out += `<polygon points="${pts.map((v) => v.join(',')).join(' ')}" fill="none" stroke="#68716a" stroke-dasharray="6 4"/>`;
  }
  if (
    !scene.faces.length ||
    (!g.frame &&
      camera.dimensions &&
      scene.faces.reduce((hi,f)=>f.points.reduce((s,p)=>Math.max(s,p[2]),hi),-Infinity) <
        h - 0.01)
  ) {
    const lower = corners.map(p),
      upper = corners.map(([x, y]) => p([x, y, h]));
    for (let i = 0; i < 4; i++)
      out +=
        line(lower[i], lower[(i + 1) % 4], 'stroke-dasharray="7 5"') +
        line(upper[i], upper[(i + 1) % 4], 'stroke-dasharray="7 5"') +
        line(lower[i], upper[i], 'stroke-dasharray="7 5"');
  }
  const dim = (a, b, label, offset = 30, outside = false) => {
    const pa = p(a),
      pb = p(b),
      dx = pb[0] - pa[0],
      dy = pb[1] - pa[1],
      len = Math.hypot(dx, dy);
    if (len < 8) return '';
    if (outside) {
      const normal = [-dy / len, dx / len],
        dist = dot(pa, normal),
        supports = bounds.map((v) => dot(p(v), normal));
      offset =
        offset < 0
          ? Math.min(...supports) - dist + offset
          : Math.max(...supports) - dist + offset;
    }
    const v = [(-dy / len) * offset, (dx / len) * offset],
      aa = pa.map((x, i) => x + v[i]),
      bb = pb.map((x, i) => x + v[i]);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle > 90 || angle < -90) angle += 180;
    const cx = (aa[0] + bb[0]) / 2,
      cy = (aa[1] + bb[1]) / 2;
    return (
      line(pa, aa) +
      line(pb, bb) +
      line(aa, bb, 'marker-start="url(#dim)" marker-end="url(#dim)"') +
      text(
        cx,
        cy - 8,
        label,
        `text-anchor="middle" transform="rotate(${angle} ${cx} ${cy})" paint-order="stroke" stroke="#d1d3cf" stroke-width="5" stroke-linejoin="round"`,
      )
    );
  };
  if (camera.dimensions && !arcDetail && scene.dimensionScope!=='bench') {
    out += dim(
      [-w / 2, d / 2, h],
      [w / 2, d / 2, h],
      fmt(g.w) + ' мм',
      -35,
      true,
    );
    out += dim(
      [-w / 2, -d / 2, 0],
      [-w / 2, d / 2, 0],
      fmt(g.d) + ' мм',
      -50,
      true,
    );
    out += dim(
      [w / 2, -d / 2, 0],
      [w / 2, -d / 2, h],
      fmt(g.h) + ' мм',
      45,
      true,
    );
    const c = g.spec.construction;
    if (g.frame && g.inner.length && c.bandHeight) {
      const a = g.curved ? (w - d) / 2 : w / 2 - c.bandWidth,
        r = d / 2 - c.bandWidth;
      out += dim(
        [0, r, 0],
        [0, r, h - c.bandHeight],
        tr('В свету: ') + fmt(h - c.bandHeight) + ' мм',
        28,
      );
      if (c.straightSpans.length) {
        let x = -a;
        for (const span of c.straightSpans) {
          out += dim([x, -r, 0], [x + span, -r, 0], fmt(span) + ' мм', 32);
          x += span;
        }
      }
      out += dim(
        [w / 2 - c.bandWidth, 0, h],
        [w / 2, 0, h],
        fmt(c.bandWidth) + ' мм',
        -32,
      );
    }
  }
  if (camera.dimensions && arcDetail) {
    const c = g.spec.construction,
      a = (w - d) / 2,
      r = d / 2 - c.bandWidth;
    const component = camera.detail === 'arc-side' ? Math.cos : Math.sin;
    let values = [
      ...new Set(
        Array.from(
          { length: c.arcSegments + 1 },
          (_, i) =>
            Math.round(
              r * component(-Math.PI / 2 + (i * Math.PI) / c.arcSegments) * 1e6,
            ) / 1e6,
        ).filter((n) => n > 0.001),
      ),
    ].sort((a, b) => a - b);
    if (values.length > 3)
      values = [
        values[0],
        values[Math.floor(values.length / 2)],
        values.at(-1),
      ];
    values.forEach((value, i) => {
      if (camera.detail === 'arc-side')
        out += dim(
          [a, 0, 0],
          [a + value, 0, 0],
          fmt(value) + ' мм',
          35 + i * 38,
        );
      else {
        out += dim([a, 0, 0], [a, value, 0], fmt(value) + ' мм', 30 + i * 38);
        out += dim([a, 0, 0], [a, -value, 0], fmt(value) + ' мм', -30 - i * 38);
      }
    });
    if (camera.detail !== 'arc-side')
      out += dim(
        [a, -r, 0],
        [a, r, 0],
        fmt(r * 2) + ' мм',
        45 + values.length * 38,
      );
    out += text(
      75,
      220,
      tr('Равных делений полуокружности') +
        ': ' +
        c.arcSegments +
        ' · ' +
        fmt(180 / c.arcSegments) +
        '°',
    );
    out += text(1050, 220, 'R ' + fmt(r) + ' мм');
  }
  out += '</g>';
  out += text(
    55,
    876,
    tr(
      scene.faces.length
        ? g.frame
          ? '3D-модель по размерам заказа.'
          : '3D-эскиз: расположение деталей требует согласования.'
        : 'Для 3D-модели уточните параметры конструкции.',
    ),
  );
  if (scene.reference)
    out += text(55, 902, scene.reference.blueprint ? `Шаблон заказчика · изображение ${scene.reference.blueprint.attachment}. Габариты пересчитаны по заказу; уточнения — в спецификации.` : `Каталог · стр. ${scene.reference.page}. Форма по фото; внутренние пропорции предварительные.`, 'style="font-size:15px"');
  if (scene.guides.length || referenceHeaders) {
    const notes = [];
    if (scene.guides.length) notes.push(tr('Стойки показаны условно; сечение не задано.'));
    if (referenceHeaders) notes.push(tr('Перемычки по образцу; отметки и сечения не заданы.'));
    out += text(55, 903, notes.join(' '), 'style="font-size:15px"');
  }
  return out;
}
export function exportObj(g) {
  const { faces, guides } = sceneGeometry(g);
  const vertices = [],
    lookup = new Map();
  const vertexIndex = (v) => {
    const key = v.map((n) => Math.round(n * 1e6) / 1e6).join(' ');
    if (!lookup.has(key)) {
      vertices.push(key);
      lookup.set(key, vertices.length);
    }
    return lookup.get(key);
  };
  const mesh = faces.flatMap(f=>faceTriangles(f).map(points=>({...f,points}))).map((f) => ({
    name: f.name,
    indices: f.points.map(vertexIndex),
  }));
  const axes = guides.map((guide) => ({ name: guide.name, indices: guide.points.map(vertexIndex) }));
  return (
    '# Facade Kazahstan | units: millimetres | preliminary model\n' +
    (g.spec.catalogModel ? '# Photo reference model: internal proportions are estimated, not verified manufacturing dimensions.\n' : '') +
    vertices.map((v) => 'v ' + v).join('\n') +
    '\n' +
    mesh.map((f) => 'g ' + f.name + '\nf ' + f.indices.join(' ')).join('\n') +
    '\n' +
    (axes.length ? '# Post axes only: cross-sections are unspecified.\n' + axes.map((axis) => 'g ' + axis.name + '\nl ' + axis.indices.join(' ')).join('\n') + '\n' : '')
  );
}
