/* БАНК ТЕСТА ЗНАНИЙ ИССЛЕДОВАНИЯ И КЛЮЧ ОТВЕТОВ — только на сервере (research/methodology.md, «Измерения»; замечание
   владельца 18.11, п. 1: «нельзя доверять полю correct, присланному клиентом»). Клиент получает задачи формы без ответов
   (действие «form» в api/research.js) и присылает сами ответы; верно ли — считает сервер по этому ключу. Этот файл не
   импортируется кодом страницы (src/): проверка — в api/__tests__/research.test.js.

   12 задач, три параллельные формы A, B, C: тот же шаблон задачи, другие числа и другой порядок вариантов. Тема — юнит
   «Сберкасса»: доход, расходы, сбережения, бюджет, подушка безопасности, вклад и процент на процент, реальная доходность.
   Вид ответа: number — число (запятая или точка, пробелы в тысячах не мешают), choice — буква варианта. */

import { parseAnswerNumber } from '../../src/research/module.js';

const F = {
  A: { I: 42000, E: 35500, s: 1500, T: 9800, P: 20000, r: 8, E2: 27000, m: 3, rr: 9, pi: 6, d: 6, I2: 50000, s2: 6000 },
  B: { I: 38000, E: 31200, s: 1200, T: 8500, P: 15000, r: 10, E2: 24000, m: 4, rr: 7, pi: 4, d: 8, I2: 40000, s2: 5000 },
  C: { I: 46000, E: 39800, s: 1800, T: 11500, P: 30000, r: 6, E2: 31000, m: 3, rr: 11, pi: 7, d: 9, I2: 60000, s2: 9000 },
};
const kr = (x) => `${String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} крон`;
// перестановки вариантов: правильный ответ стоит на разных местах — в разных задачах и в разных формах
const PERMS = [[0, 1, 2, 3], [2, 0, 3, 1], [1, 3, 0, 2], [3, 2, 1, 0]];
const FORM_SHIFT = { A: 0, B: 1, C: 2 };
const LETTERS = ['а', 'б', 'в', 'г'];
function choice(form, k, prompt, right, wrong) {
  const all = [right, ...wrong];
  const opts = PERMS[(FORM_SHIFT[form] + k) % PERMS.length].map((i) => all[i]);
  return { kind: 'choice', prompt, options: opts.map((text, i) => ({ id: LETTERS[i], text })), answer: LETTERS[opts.indexOf(right)] };
}
const num = (prompt, answer, tol = 0, unit = '') => ({ kind: 'number', prompt, answer, tol, unit });

const TEMPLATES = {
  q01: (v) => num(`Доход семьи за месяц — ${kr(v.I)}, расходы — ${kr(v.E)}. Сколько крон семья сберегает за месяц?`, v.I - v.E, 0, 'крон'),
  q02: (v) => num(`Вы откладываете по ${kr(v.s)} в месяц. Сколько полных месяцев нужно, чтобы накопить ${kr(v.T)}? Ответ — целое число месяцев (если не делится нацело, округлите вверх).`, Math.ceil(v.T / v.s), 0, 'мес.'),
  q03: (v, f) => choice(f, 0, 'Что такое бюджет семьи?', 'План доходов и расходов на период', ['Все деньги, которые семья получила за месяц', 'Деньги, отложенные на крупную покупку', 'Долг семьи перед банком']),
  q04: (v) => num(`На вклад положили ${kr(v.P)} под ${v.r}% годовых. Сколько крон будет на вкладе через год?`, Math.round(v.P * (1 + v.r / 100)), 0, 'крон'),
  q05: (v) => num(`На вклад положили ${kr(v.P)} под ${v.r}% годовых; проценты остаются на вкладе. Сколько крон будет через 2 года? Округлите до целых.`, Math.round(v.P * (1 + v.r / 100) ** 2), 1, 'крон'),
  q06: (v) => num(`${kr(v.P)} лежат год в копилке, столько же — год на вкладе под ${v.r}% годовых. На сколько крон больше окажется на вкладе?`, Math.round(v.P * v.r / 100), 0, 'крон'),
  q07: (v, f) => choice(f, 1, 'Какой из этих расходов — обязательный?', 'Плата за квартиру', ['Новый телефон при работающем старом', 'Ужин в ресторане по выходным', 'Подписка на второй видеосервис']),
  q08: (v) => num(`Расходы семьи — ${kr(v.E2)} в месяц. Сколько крон должно быть в подушке безопасности на ${v.m} месяца расходов?`, v.E2 * v.m, 0, 'крон'),
  q09: (v) => num(`Вклад приносит ${v.rr}% годовых, цены за год выросли на ${v.pi}%. Примерно на сколько процентов за год выросло то, что можно купить на эти деньги?`, v.rr - v.pi, 0.5, '%'),
  q10: (v, f) => choice(f, 2, 'Почему вклад, проценты с которого остаются на нём, с каждым годом растёт на всё большую сумму?', 'Проценты начисляются и на прошлые проценты', ['Банк каждый год повышает ставку', 'Инфляция увеличивает сумму вклада', 'Так растёт любая сумма в копилке']),
  q11: (v) => num(`Доход — ${kr(v.I2)} в месяц, из них вы откладываете ${kr(v.s2)}. Какую долю дохода вы сберегаете, в процентах?`, Math.round((v.s2 / v.I2) * 1000) / 10, 0.1, '%'),
  q12: (v, f) => choice(f, 3, `Цены растут на ${v.d}% в год. Что произойдёт с деньгами, если год держать их дома, а не на вкладе под ${v.d + 2}%?`, 'На них можно будет купить меньше, чем сейчас', ['На них можно будет купить столько же', 'Их станет больше', 'Они полностью обесценятся']),
};
export const KEY_ITEMS = Object.keys(TEMPLATES);
export const KEY_FORMS = Object.keys(F);

const build = (form) => Object.fromEntries(KEY_ITEMS.map((id) => [id, TEMPLATES[id](F[form], form)]));
const BANK = Object.fromEntries(KEY_FORMS.map((f) => [f, build(f)]));

// задачи формы для участника — без ответов и допусков
export function publicForm(form) {
  const b = BANK[form];
  if (!b) return null;
  return KEY_ITEMS.map((id) => {
    const it = b[id];
    return it.kind === 'choice' ? { item_id: id, kind: 'choice', prompt: it.prompt, options: it.options } : { item_id: id, kind: 'number', prompt: it.prompt, unit: it.unit };
  });
}
// число из ответа участника — тем же разбором, что и в заданиях модуля
export const parseNumber = parseAnswerNumber;
// верно ли: сервер сверяет ответ с ключом; пустой и непонятный ответ — неверно
export function scoreItem(form, itemId, answer) {
  const it = BANK[form] && BANK[form][itemId];
  if (!it) return null;
  if (it.kind === 'choice') return typeof answer === 'string' && answer.trim().toLowerCase() === it.answer;
  const v = parseNumber(answer);
  return v != null && Math.abs(v - it.answer) <= it.tol + 1e-9;
}
// ответ участника для записи не хранится: в набор идёт только «верно / неверно» (data-dictionary.md, минимизация)
export const answerOk = (raw) => (typeof raw === 'string' && raw.length <= 24) || (typeof raw === 'number' && Number.isFinite(raw)) || raw == null;
// только для тестов: правильный ответ задачи
export const keyFor = (form, itemId) => (BANK[form] && BANK[form][itemId] ? BANK[form][itemId].answer : null);
