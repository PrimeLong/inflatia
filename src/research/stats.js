/* Статистика плана анализа (research/analysis-plan.md). Без зависимостей: распределение Стьюдента через регуляризованную
   неполную бета-функцию, точный критерий Фишера, критерий Уэлча, g Хеджеса, Манна — Уитни, ковариационный анализ
   (обычная регрессия «итог ~ группа + входной тест»), KR-20 и поправка Холма. Проверено на табличных значениях
   (src/research/__tests__/stats.test.js). */

export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
// выборочная дисперсия (n − 1)
export const variance = (xs) => { const m = mean(xs); return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1); };
export const sd = (xs) => Math.sqrt(variance(xs));
export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

// ln Γ(x) — приближение Ланцоша
function lnGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const c of g) { y += 1; ser += c / y; }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
// цепная дробь для неполной бета-функции (Numerical Recipes, betacf)
function betacf(a, b, x) {
  const EPS = 3e-14; const FPMIN = 1e-300;
  let c = 1; let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
// регуляризованная неполная бета-функция I_x(a, b)
export function betaInc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
// функция распределения Стьюдента P(T ≤ t) при df степенях свободы
export function tCdf(t, df) {
  const p = 0.5 * betaInc(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}
// квантиль Стьюдента — делением пополам (монотонная функция, точность 1e-10)
export function tQuantile(p, df) {
  let lo = -1000; let hi = 1000;
  for (let i = 0; i < 200; i += 1) { const mid = (lo + hi) / 2; if (tCdf(mid, df) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
// стандартное нормальное распределение: P(Z ≤ z) через дополнительную функцию ошибок (Numerical Recipes erfcc, точность ~1e-7)
export function normCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807
    + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}

/* Критерий Уэлча (дисперсии групп могут различаться): разность средних a − b, её доверительный интервал, t, df и двусторонний p. */
export function welch(a, b, level = 0.95) {
  const va = variance(a) / a.length; const vb = variance(b) / b.length;
  const se = Math.sqrt(va + vb);
  const diff = mean(a) - mean(b);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const t = diff / se;
  const q = tQuantile(1 - (1 - level) / 2, df);
  return { diff, t, df, p: 2 * (1 - tCdf(Math.abs(t), df)), ci: [diff - q * se, diff + q * se] };
}
/* g Хеджеса (a − b) на объединённом стандартном отклонении с поправкой на малую выборку и приближённым 95% интервалом */
export function hedgesG(a, b) {
  const n1 = a.length; const n2 = b.length;
  const sp = Math.sqrt(((n1 - 1) * variance(a) + (n2 - 1) * variance(b)) / (n1 + n2 - 2));
  const d = (mean(a) - mean(b)) / sp;
  const j = 1 - 3 / (4 * (n1 + n2) - 9);
  const g = d * j;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + (g * g) / (2 * (n1 + n2)));
  return { g, ci: [g - 1.959964 * se, g + 1.959964 * se] };
}
/* Манна — Уитни (a против b): U для a, z с поправкой на совпадения и двусторонний p (нормальное приближение) */
export function mannWhitney(a, b) {
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  const ranks = new Array(all.length);
  let tie = 0;
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j += 1;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) ranks[k] = r;
    const t = j - i + 1; tie += t ** 3 - t;
    i = j + 1;
  }
  const n1 = a.length; const n2 = b.length; const n = n1 + n2;
  const r1 = all.reduce((s, x, i) => (x.g === 0 ? s + ranks[i] : s), 0);
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tie / (n * (n - 1))));
  const z = sigma > 0 ? (u - mu) / sigma : 0;
  return { u, z, p: 2 * (1 - normCdf(Math.abs(z))) };
}
const lnFact = (n) => lnGamma(n + 1);
/* Точный критерий Фишера для таблицы 2×2 [[a, b], [c, d]] (строки — группы, столбцы — да/нет): двусторонний p — сумма
   вероятностей таблиц не вероятнее наблюдаемой при тех же суммах. */
export function fisherExact([[a, b], [c, d]]) {
  const r1 = a + b; const r2 = c + d; const c1 = a + c; const n = r1 + r2;
  const prob = (x) => Math.exp(lnFact(r1) + lnFact(r2) + lnFact(c1) + lnFact(n - c1) - lnFact(n) - lnFact(x) - lnFact(r1 - x) - lnFact(c1 - x) - lnFact(r2 - c1 + x));
  const p0 = prob(a);
  let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x += 1) { const px = prob(x); if (px <= p0 * (1 + 1e-7)) p += px; }
  return Math.min(1, p);
}
/* Разность долей x1/n1 − x2/n2 и её 95% интервал по Ньюкомбу (гибрид интервалов Уилсона) — устойчив при малых n */
function wilson(x, n, z = 1.959964) {
  const p = x / n; const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [centre - half, centre + half];
}
export function diffProportions(x1, n1, x2, n2) {
  const p1 = x1 / n1; const p2 = x2 / n2;
  const [l1, u1] = wilson(x1, n1); const [l2, u2] = wilson(x2, n2);
  const d = p1 - p2;
  return { p1, p2, diff: d, ci: [d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2)] };
}

// решение системы (XᵀX) β = Xᵀy методом Гаусса; возвращает β и (XᵀX)⁻¹
function solve(m) {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    [a[c], a[piv]] = [a[piv], a[c]];
    if (Math.abs(a[c][c]) < 1e-12) throw new Error('вырожденная матрица: ковариата не меняется или группы не различаются');
    const k = a[c][c];
    for (let j = 0; j < 2 * n; j += 1) a[c][j] /= k;
    for (let r = 0; r < n; r += 1) if (r !== c) { const f = a[r][c]; for (let j = 0; j < 2 * n; j += 1) a[r][j] -= f * a[c][j]; }
  }
  return a.map((row) => row.slice(n));
}
/* Ковариационный анализ: post = b0 + b1·группа + b2·pre. group — 1 для игровой версии, 0 для обычной. Возвращает
   поправленную разность групп b1, её стандартную ошибку, 95% интервал, t и p (df = n − 3). */
export function ancova(post, pre, group) {
  const n = post.length;
  const X = post.map((_, i) => [1, group[i], pre[i]]);
  const xtx = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const inv = solve(xtx);
  const xty = [0, 1, 2].map((i) => X.reduce((s, r, k) => s + r[i] * post[k], 0));
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));
  const resid = post.map((y, k) => y - X[k].reduce((s, v, j) => s + v * beta[j], 0));
  const df = n - 3;
  const s2 = resid.reduce((s, e) => s + e * e, 0) / df;
  const se = Math.sqrt(s2 * inv[1][1]);
  const t = se > 0 ? beta[1] / se : Infinity;
  const q = tQuantile(0.975, df);
  return { effect: beta[1], slope: beta[2], se, t, df, p: se > 0 ? 2 * (1 - tCdf(Math.abs(t), df)) : 0, ci: [beta[1] - q * se, beta[1] + q * se] };
}
/* KR-20 — надёжность теста из задач 0/1. rows — участники, в строке — баллы по задачам. */
export function kr20(rows) {
  const k = rows[0].length; const n = rows.length;
  const pq = Array.from({ length: k }, (_, j) => { const p = rows.reduce((s, r) => s + r[j], 0) / n; return p * (1 - p); }).reduce((a, b) => a + b, 0);
  const totals = rows.map((r) => r.reduce((a, b) => a + b, 0));
  const m = mean(totals);
  const v = totals.reduce((s, x) => s + (x - m) ** 2, 0) / n;
  return v > 0 ? (k / (k - 1)) * (1 - pq / v) : null;
}
// поправка Холма на множественные сравнения: скорректированные p в исходном порядке
export function holm(ps) {
  const order = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const out = new Array(ps.length);
  let run = 0;
  order.forEach(({ p, i }, r) => { run = Math.max(run, Math.min(1, p * (ps.length - r))); out[i] = run; });
  return out;
}
