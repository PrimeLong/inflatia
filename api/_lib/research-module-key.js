/* КЛЮЧ ОТВЕТОВ УЧЕБНОГО МОДУЛЯ ИССЛЕДОВАНИЯ — только на сервере (замечание владельца 24.11, исследование, п. 1: «убрать
   правильные ответы из клиентского JavaScript-бандла»). Публичная часть модуля — src/research/module.js: объяснения,
   условия и варианты. Здесь — верный ответ, допуск для чисел и разбор, который сервер отдаёт участнику вместе с
   результатом проверки (api/research.js, действие «answer»). Код страницы (src/) этот файл не импортирует; это проверяют
   api/__tests__/research-module-key.test.js (нет импорта из src/) и тот же тест по собранному dist/ (ни одного разбора). */
import { MODULE, parseAnswerNumber } from '../../src/research/module.js';

export const MODULE_KEY = {
  'hh-i1-a': { answer: 8000, why: '5000 + 3000 = 8000: доход — все деньги, которые приходят.' },
  'hh-i1-b': { answer: 3500, why: 'Сбережения = доход − расходы = 30 000 − 26 500 = 3500.' },
  'hh-i1-c': { answer: 'а', why: 'Проценты приходят на счёт — это доход; остальное уходит — это расходы.' },
  'hh-i1-d': { answer: -3000, why: '40 000 − 43 000 = −3000: расходы больше дохода, сбережения отрицательные.' },
  'hh-l1-a': { answer: 'а', why: 'Без жилья не обойтись; остальное можно отложить.' },
  'hh-l1-b': { answer: 'в', why: 'Поездку можно перенести; лекарства, проезд и еда нужны.' },
  'hh-l1-c': { answer: 35000, why: '44 000 − 9000 = 35 000.' },
  'hh-l1-d': { answer: 5000, why: '40 000 − 35 000 = 5000.' },
  'hh-i2-a': { answer: 11000, why: '10 000 × 1,1 = 11 000.' },
  'hh-i2-b': { answer: 1000, why: '5% от 20 000 = 0,05 × 20 000 = 1000.' },
  'hh-i2-c': { answer: 'б', why: 'Вклад добавит 6%, копилка — ничего.' },
  'hh-i2-d': { answer: 16200, why: '15 000 × 1,08 = 16 200.' },
  'hh-l2-a': { answer: 12100, why: '10 000 × 1,1 × 1,1 = 12 100.' },
  'hh-l2-b': { answer: 1100, why: '12 100 − 11 000 = 1100: процент начислен и на 1000 прошлых процентов.' },
  'hh-l2-c': { answer: 'б', why: 'Это и есть процент на процент.' },
  'hh-l2-d': { answer: 22050, why: '20 000 × 1,05 × 1,05 = 22 050.' },
  'hh-w-a': { answer: 'а', why: 'Бюджет — именно план.' },
  'hh-w-b': { answer: 'б', why: 'Сбережения — разница дохода и расходов.' },
  'hh-w-c': { answer: 'в', why: 'Она защищает, если доход пропадёт.' },
  'hh-w-d': { answer: 75000, why: '25 000 × 3 = 75 000.' },
  'hh-s1-a': { answer: 9, why: '6300 ÷ 700 = 9 месяцев.' },
  'hh-s1-b': { answer: 5, why: '6300 ÷ 1300 ≈ 4,85 → нужен 5-й месяц: за четыре накопится только 5200.' },
  'hh-s1-c': { answer: 4, why: '9 − 5 = 4 месяца.' },
  'hh-s1-d': { answer: 'а', why: 'Сократили необязательные расходы — сбережения выросли.' },
  'hh-rev-a': { answer: 4500, why: '36 000 − 31 500 = 4500.' },
  'hh-rev-b': { answer: 14520, why: '12 000 × 1,1 × 1,1 = 14 520.' },
  'hh-rev-c': { answer: 'а', why: 'Сумма та же, а цены выше — покупательная способность упала.' },
  'hh-rev-d': { answer: 4, tol: 0.5, why: 'Примерно 9 − 5 = 4%.' },
  'hh-sum-a': { answer: 15, tol: 0.1, why: '7500 ÷ 50 000 = 0,15 = 15%.' },
  'hh-sum-b': { answer: 'а', why: 'Сначала — запас на непредвиденное.' },
  'hh-sum-c': { answer: 112000, why: '28 000 × 4 = 112 000.' },
  'hh-sum-d': { answer: 'б', why: 'Ставка ниже роста цен: на деньги с процентами можно купить меньше, чем раньше.' },
};

// задание → урок, номер в уроке, публичная часть и ключ
export const EXERCISE_INDEX = Object.fromEntries(MODULE.flatMap((l) => l.exercises.map((e, i) => [e.id, { lesson_id: l.id, task_no: i + 1, ex: e, key: MODULE_KEY[e.id] }])));

// верен ли ответ на задание модуля (null — задания нет)
export function checkModuleAnswer(exerciseId, answer) {
  const hit = EXERCISE_INDEX[exerciseId];
  if (!hit || !hit.key) return null;
  const { ex, key } = hit;
  if (ex.kind === 'choice') return typeof answer === 'string' && answer.trim().toLowerCase() === key.answer;
  const v = parseAnswerNumber(answer);
  return v != null && Math.abs(v - key.answer) <= (key.tol || 0) + 1e-9;
}
// разбор задания — участнику после ответа
export const whyOf = (exerciseId) => (MODULE_KEY[exerciseId] ? MODULE_KEY[exerciseId].why : null);
// только для тестов: верный ответ задания
export const answerOf = (exerciseId) => (MODULE_KEY[exerciseId] ? MODULE_KEY[exerciseId].answer : null);
