import assert from 'node:assert/strict';
import {cleanChatNote,responseKey,uniqueChatNote} from './lib/ai/chat-response.mjs';
for(const note of [
 'Какое изделие вас интересует? Вы можете указать его название или номер страницы в PDF-каталоге.',
 'Сколько скамеек нужно? Укажите количество для точного расчёта.',
 'Пожалуйста, укажите ширину, высоту и глубину скамейки в миллиметрах.',
 'Теперь уточните материал, толщину металла и цвет покрытия.',
 'Выбирайте размер с учётом интенсивности потока людей.',
 'Скамейка с габаритами 1800 × 800 × 450 мм и количеством 10 штук выбрана.',
 'Қанша орындық қажет?','Өлшемдерді миллиметрмен көрсетіңіз.'
])assert.equal(cleanChatNote(JSON.stringify({note})), '',note);
const helpful='Покрытие защищает металл от влаги и помогает сохранить внешний вид.';
assert.equal(cleanChatNote(JSON.stringify({note:helpful})),helpful);
assert.equal(cleanChatNote('bad JSON'),'');
assert.equal(cleanChatNote('null'),'');
assert.equal(uniqueChatNote(helpful,[helpful]),'');
assert.equal(uniqueChatNote(helpful,[]),helpful);
assert.notEqual(responseKey('ru',['Скамейка']),responseKey('kk',['Скамейка']));
assert.notEqual(responseKey('ru',['Скамейка']),responseKey('ru',['Скамейка','1800']));
console.log('Passed: reproduced Russian/Kazakh repeats rejected, useful note retained, malformed model output handled, repeated notes suppressed, response keys isolated by step and language.');
