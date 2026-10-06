import { cleanDrawing } from '../drawings/model.mjs';
export const draftKey = 'facade-enquiry-draft-v1';
export function restoreDraft(raw, now = Date.now()) {
  try {
    const d = JSON.parse(raw);
    if (
      d.version !== 1 ||
      !Number.isFinite(d.updatedAt) ||
      now - d.updatedAt > 86400000 ||
      d.updatedAt > now + 60000
    )
      return null;
    if (
      !Array.isArray(d.answers) ||
      d.answers.length > 9 ||
      d.answers.some((v) => typeof v !== 'string' || v.length > 600)
    )
      return null;
    if (
      typeof d.requestId !== 'string' ||
      !/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})?$/i.test(
        d.requestId,
      ) ||
      (d.answers.length && !d.requestId)
    )
      return null;
    if (typeof d.value !== 'string' || d.value.length > 600) return null;
    if (
      d.orderGroup &&
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        d.orderGroup,
      )
    )
      return null;
    const contact = d.contact ?? [];
    if (
      !Array.isArray(contact) ||
      ![0, 4].includes(contact.length) ||
      contact.some((v) => typeof v !== 'string' || v.length > 600)
    )
      return null;
    return {
      ...d,
      orderGroup: d.orderGroup || d.requestId,
      contact,
      phone:
        typeof d.phone === 'string' &&
        /^[+\d\s()-]{7,25}$/.test(d.phone) &&
        d.phone.replace(/\D/g, '').length >= 7
          ? d.phone
          : d.answers[8] || contact[3] || '',
      spec: d.spec ? cleanDrawing(d.spec) : null,
    };
  } catch {
    return null;
  }
}
