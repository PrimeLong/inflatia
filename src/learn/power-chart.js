/* Рыночная власть на графике игр «Власть над ценой» и «Наценка ниже или выше?» (src/learn-play.jsx, PowerGameChart).
   Спрос на товар фирмы P = a − b·Q поворачивается вокруг точки (6; 30): m = 0 — горизонтальный (ценополучатель),
   m = 1 — крутой (мало заменителей). Предельные издержки MC = 10 + 2,5·Q. Выпуск — там, где MR = MC (MR = a − 2b·Q),
   цена — со спроса при этом выпуске, наценка — цена минус MC. Раньше точка цены не лежала на спросе, а выпуск
   не был там, где MR = MC (жалоба mw4b87po «что за ужас с графиком»). Модуль чистый. */
export const powerMc = (q) => 10 + 2.5 * q;
export function powerModel(m0) {
  const m = Math.max(0, Math.min(1, Number(m0) || 0));
  const b = 5 * m; const a = 30 + 6 * b;
  const q = (a - 10) / (2 * b + 2.5);
  const p = a - b * q; const mc = powerMc(q);
  return { m, a, b, q, p, mc, markup: p - mc, dem: (x) => a - b * x, mr: (x) => a - 2 * b * x, mrEnd: b > 0 ? a / (2 * b) : Infinity };
}
