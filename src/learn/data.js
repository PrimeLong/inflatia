/* ДАННЫЕ В ЗАДАНИИ (вид упражнения «Данные», :::ex data — src/textbook/markdown.js). Пункт владельца 24.11, п. 12:
   «анализ данных — отдельный вид задания, не только таблица: разные виды данных, диаграммы». Ученик читает таблицу или
   диаграмму и отвечает: касанием ячейки, столбца, сектора или точки (ask=pick), числом с калькулятором (ask=number) или
   выбором вывода (ask=choice).

   Строки данных в главе — как таблица Markdown:
     | Месяц | У дома | На базе |      ← заголовок (необязателен): подпись строк и имена рядов
     | Май   | 1200   | 900     |      ← подпись и числа («1 200», «12,5», «−3» — тоже числа)
   Один ряд — ключ элемента — подпись строки («Май»); несколько — «строка / ряд» («Май / На базе»).
   Модуль чистый: его читают разбор главы, проверка ответа и рисунок (src/learn-data.jsx). */

export const DATA_VIEWS = ['table', 'bar', 'hbar', 'line', 'pie'];
export const DATA_ASKS = ['pick', 'number', 'choice'];
export const DATA_VIEW_LABEL = { table: 'таблица', bar: 'столбчатая диаграмма', hbar: 'горизонтальная диаграмма', line: 'график', pie: 'круговая диаграмма' };
export const DATA_MAX_ROWS = 12;
export const DATA_MAX_SERIES = 3;
export const PIE_MAX = 8; // секторов круговой: цветов палитры (src/learn-data.jsx, PIE)

// число из ячейки: пробелы в разрядах, запятая, минус «−»; не число — null
export function cellNumber(raw) {
  const s = String(raw == null ? '' : raw).replace(/[\s   ]/g, '').replace('−', '-').replace(',', '.').replace(/%$/, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/* строки «| … |» → { label, cols, rows }; первая строка — заголовок, если в ней есть не-число среди значений */
export function parseDataRows(lines, where = 'данные') {
  const table = lines.map((l) => l.trim()).filter((l) => l.startsWith('|') && !/^\|[\s:|-]+\|$/.test(l)).map(cells);
  if (table.length < 2) throw new Error(`${where}: нужно хотя бы две строки данных «| подпись | число |»`);
  const width = table[0].length;
  if (width < 2) throw new Error(`${where}: в строке — подпись и хотя бы одно число`);
  if (table.some((r) => r.length !== width)) throw new Error(`${where}: во всех строках одинаковое число столбцов`);
  const header = table[0].slice(1).some((c) => cellNumber(c) == null);
  const body = header ? table.slice(1) : table;
  const cols = header ? table[0].slice(1) : [''];
  const label = header ? table[0][0] : '';
  if (cols.length > DATA_MAX_SERIES) throw new Error(`${where}: рядов не больше ${DATA_MAX_SERIES}`);
  if (body.length < 2 || body.length > DATA_MAX_ROWS) throw new Error(`${where}: строк данных — от 2 до ${DATA_MAX_ROWS}`);
  const rows = body.map((r) => {
    const values = r.slice(1).map(cellNumber);
    if (values.some((v) => v == null)) throw new Error(`${where}: в строке «${r[0]}» не число`);
    if (!r[0]) throw new Error(`${where}: у строки нет подписи`);
    return { label: r[0], values };
  });
  if (new Set(rows.map((r) => r.label)).size !== rows.length) throw new Error(`${where}: подписи строк повторяются`);
  return { label, cols, rows };
}

/* ключи элементов, которые можно коснуться: строка (один ряд) или «строка / ряд»; by=row (data.by === 'row') — строка
   целиком при любом числе рядов: «какая пачка выгоднее» — касание любой ячейки строки */
export const multi = (data) => data.cols.length > 1;
export const byRow = (data) => data.by === 'row';
export const keyOf = (data, r, c = 0) => (multi(data) && !byRow(data) ? `${data.rows[r].label} / ${data.cols[c]}` : data.rows[r].label);
export const dataKeys = (data) => [...new Set(data.rows.flatMap((row, r) => data.cols.map((_, c) => keyOf(data, r, c))))];
export function valueOf(data, key) {
  for (let r = 0; r < data.rows.length; r += 1) for (let c = 0; c < data.cols.length; c += 1) if (keyOf(data, r, c) === key) return data.rows[r].values[c];
  return null;
}

// число по-русски: разряды — неразрывным пробелом, дробь — запятой, минус — «−»
export function fmtData(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  const neg = v < 0; const a = Math.abs(v);
  const [i, f] = (Math.round(a * 100) / 100).toString().split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '−' : ''}${int}${f ? `,${f}` : ''}`;
}

// шаг сетки: 1, 2, 2,5 или 5 × 10ⁿ — 4–6 делений от from до максимума
export function niceScale(min, max, ticks = 5) {
  const span = Math.max(1e-9, max - min);
  const raw = span / ticks; const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step; const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, step, ticks: out };
}

// доли круговой диаграммы, в процентах, с суммой ровно 100 (остаток — самой большой доле)
export function shares(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * 100);
  const round = raw.map((x) => Math.round(x));
  const diff = 100 - round.reduce((a, b) => a + b, 0);
  if (diff) { const k = raw.indexOf(Math.max(...raw)); round[k] += diff; }
  return round;
}

// подпись элемента для «Правильно: …»: «Июнь — 620 крон за кг»; строка целиком (by=row) — её подпись: «Большая» (числа
// строки — в таблице рядом и в разборе, «Большая: Вес, г — 1 000, Цена, крон — 1 000» читалось тяжело)
export const itemText = (data, key, unit = '') => {
  if (byRow(data) && multi(data)) return key;
  const v = valueOf(data, key); return `${key} — ${fmtData(v)}${unit ? ` ${unit}` : ''}`;
};
