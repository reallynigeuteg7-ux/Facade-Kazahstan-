import { cleanDrawing } from './model.mjs';
import { detailFields } from './templates.mjs';

// Clear a recovered-input warning only after its replacement passes all checks.
export function resolveEditedWarnings(spec, changedKeys) {
  try {
    cleanDrawing(spec);
  } catch {
    return spec;
  }
  const construction = spec.construction || {};
  const fields = {
    straightSpans: /прол[её]т/i,
    arcSegments: /делений/,
    bandWidth: /Ширина (?:верхнего )?пояса/,
    bandHeight: /Высота (?:верхнего )?пояса/,
    postSize: /Стойка|стойки/,
    form: /овального каркаса|круглого каркаса|форму конструкции/,
    openingWidth: /Проём должен/,
    openingBottom: /Проём выходит/,
    supportInset: /отступ опор/,
  };
  return {
    ...spec,
    warnings: (spec.warnings || []).filter(
      (w) =>
        !changedKeys.some((key) => {
          const value = construction[key] ?? spec.details?.[key];
          if (
            value == null ||
            value === 'unspecified' ||
            (Array.isArray(value) && !value.length)
          )
            return false;
          return (
            fields[key]?.test(w) ||
            (detailFields[key] && w.startsWith(detailFields[key].label))
          );
        }),
    ),
  };
}
