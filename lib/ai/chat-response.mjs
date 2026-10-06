const normalize = (s) =>
  String(s)
    .normalize('NFC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
export function responseKey(language, answers) {
  return JSON.stringify([language, answers]);
}
export function similarText(a, b) {
  const x = normalize(a),
    y = normalize(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const words = (s) => new Set(s.split(' ').filter((w) => w.length > 2));
  const aa = words(x),
    bb = words(y);
  if (!aa.size || !bb.size) return false;
  const shared = [...aa].filter((w) => bb.has(w)).length;
  return shared / Math.min(aa.size, bb.size) >= 0.8;
}
export function cleanChatNote(raw, questions = [], answers = []) {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw.trim());
    } catch {
      return '';
    }
  }
  if (!value || typeof value.note !== 'string') return '';
  const note = value.note.replace(/\s+/g, ' ').trim();
  if (!note || note.length > 320 || /[?？]/.test(note)) return '';
  if (
    /(?:укаж|уточн|напиш|сообщ|выбер|выбира|расскаж|предостав|введите|назов|како[йея]|сколько|когда|где|пожалуйста|көрсет|жазы|нақтыла|таңда|айтың|қандай|қанша|қайда|қашан|өтінем)/iu.test(
      note,
    )
  )
    return '';
  if (
    /(?:вы (?:уже )?(?:выбрали|указали)|выбрана|выбрано|выбраны|сіз таңда|сіз көрсет)/iu.test(
      note,
    )
  )
    return '';
  if (
    questions.some((q) => similarText(note, q)) ||
    answers.some((a) => similarText(note, a))
  )
    return '';
  if (/\d/.test(note)) return '';
  return note;
}
export function uniqueChatNote(note, previousNotes) {
  return note && !previousNotes.some((p) => similarText(note, p)) ? note : '';
}
