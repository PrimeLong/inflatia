/* ЧИСЛОВАЯ ПЛОСКОСТЬ — математика полноэкранного графика (src/plane-view.jsx, docs/mechanics.md, «Картинки на весь экран»).
   Не картинка, которую увеличивают, а окно в бесконечную плоскость: вид — прямоугольник в единицах осей { x0, x1, y0, y1 },
   его двигают и приближают; деления и сетка пересчитываются под масштаб («красивый» шаг 1–2–2,5–5·10ⁿ), кривые
   рисуются заново в точках экрана — тонкие линии остаются тонкими при любом приближении. Модуль чистый. */

// шаг сетки: на экране между линиями — около target точек; шаг — 1, 2, 2,5 или 5, умноженное на степень десяти
export function niceStep(span, px, target = 90) {
  if (!(span > 0) || !(px > 0)) return 1;
  const raw = (span * target) / px;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * mag;
}
// деления от a до b с шагом step (по кратным шага; без ошибок округления вида 0,30000000004)
export function ticks(a, b, step) {
  if (!(step > 0) || !(b > a)) return [];
  const out = []; const k0 = Math.ceil(a / step - 1e-9); const k1 = Math.floor(b / step + 1e-9);
  if (k1 - k0 > 400) return [];
  const dec = Math.max(0, -Math.floor(Math.log10(step)) + 2);
  for (let k = k0; k <= k1; k += 1) out.push(Number((k * step).toFixed(dec)));
  return out;
}
// вид, в который целиком входит область данных с полями pad (доля размаха); нижний левый угол — с запасом под оси
export function fitPlane(xDomain, yDomain, pad = 0.08) {
  const [a, b] = xDomain; const [c, d] = yDomain;
  const dx = (b - a) || 1; const dy = (d - c) || 1;
  return { x0: a - dx * pad, x1: b + dx * pad, y0: c - dy * pad, y1: d + dy * pad };
}
// единицы → точки экрана размера w×h
export const toPx = (v, w, h) => ({ x: (x) => ((x - v.x0) / (v.x1 - v.x0)) * w, y: (y) => h - ((y - v.y0) / (v.y1 - v.y0)) * h });
// точка экрана → единицы
export const toData = (v, w, h, px, py) => ({ x: v.x0 + (px / w) * (v.x1 - v.x0), y: v.y0 + ((h - py) / h) * (v.y1 - v.y0) });
// приблизить в f раз к точке экрана (px, py): точка под курсором остаётся на месте; ax, ay — по каким осям (обе по умолчанию)
export const PLANE_SPAN = { min: 1e-6, max: 1e9 };
/* Пределы масштаба относительно вида «вписать» (замечание владельца 18.11, вечер: «зачем такое далёкое отдаление с
   миллионами»): отдалить — не больше чем в ZOOM_LIMIT.out раз, приблизить — не больше чем в ZOOM_LIMIT.in раз.
   Множитель ограничивается ОДИН для обеих осей: раньше ось, упёршаяся в предел, стояла, а вторая продолжала сжиматься —
   пропорции ломались навсегда, и после «отдалить, потом приблизить» кривая превращалась в прямую. */
export const ZOOM_LIMIT = { out: 8, in: 400 };
export function zoomPlane(v, f, px, py, w, h, { ax = true, ay = true, fit = null } = {}) {
  const p = toData(v, w, h, px, py);
  const spans = [];
  if (ax) spans.push([v.x1 - v.x0, fit ? fit.x1 - fit.x0 : null]);
  if (ay) spans.push([v.y1 - v.y0, fit ? fit.y1 - fit.y0 : null]);
  let k = f;
  for (const [span, base] of spans) {
    const lo = Math.max(PLANE_SPAN.min, base ? base / ZOOM_LIMIT.in : 0);
    const hi = Math.min(PLANE_SPAN.max, base ? base * ZOOM_LIMIT.out : Infinity);
    // новый размах = span / k; держим его в [lo, hi]
    if (span / k < lo) k = Math.min(k, span / lo);
    if (span / k > hi) k = Math.max(k, span / hi);
  }
  if (!(k > 0) || Math.abs(k - 1) < 1e-12) return { ...v };
  const sx = ax ? k : 1; const sy = ay ? k : 1;
  return { x0: p.x - (p.x - v.x0) / sx, x1: p.x + (v.x1 - p.x) / sx, y0: p.y - (p.y - v.y0) / sy, y1: p.y + (v.y1 - p.y) / sy };
}
// сдвинуть вид на (dx, dy) точек экрана (палец вправо — плоскость вправо)
export function panPlane(v, dx, dy, w, h) {
  const ux = ((v.x1 - v.x0) / w) * dx; const uy = ((v.y1 - v.y0) / h) * dy;
  return { x0: v.x0 - ux, x1: v.x1 - ux, y0: v.y0 + uy, y1: v.y1 + uy };
}
// плавный переход между видами (t — 0…1)
export const lerpPlane = (a, b, t) => (t >= 1 ? { ...b } : t <= 0 ? { ...a } : { x0: a.x0 + (b.x0 - a.x0) * t, x1: a.x1 + (b.x1 - a.x1) * t, y0: a.y0 + (b.y0 - a.y0) * t, y1: a.y1 + (b.y1 - a.y1) * t });
// насколько приближено относительно вида «вписать» (по более приближенной оси)
export const zoomLevel = (fit, v) => Math.max((fit.x1 - fit.x0) / (v.x1 - v.x0), (fit.y1 - fit.y0) / (v.y1 - v.y0));

/* Ближайшая к курсору точка кривых — на самой линии, а не только в узлах: проекция на отрезки в точках экрана.
   curves — [{ id, label, points: [{x,y}] }]; возвращает { curve, x, y, dist } (в единицах осей) или null дальше maxPx. */
export function nearestOnCurves(curves, v, w, h, px, py, maxPx = 36) {
  const P = toPx(v, w, h);
  let best = null;
  for (const c of curves) {
    const pts = c.points || [];
    for (let i = 0; i + 1 < pts.length; i += 1) {
      const ax = P.x(pts[i].x); const ay = P.y(pts[i].y); const bx = P.x(pts[i + 1].x); const by = P.y(pts[i + 1].y);
      const L = (bx - ax) ** 2 + (by - ay) ** 2;
      const u = L ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L)) : 0;
      const qx = ax + u * (bx - ax); const qy = ay + u * (by - ay);
      const dist = Math.hypot(px - qx, py - qy);
      if (dist <= maxPx && (!best || dist < best.dist)) {
        best = { curve: c, dist, x: pts[i].x + u * (pts[i + 1].x - pts[i].x), y: pts[i].y + u * (pts[i + 1].y - pts[i].y) };
      }
    }
  }
  return best;
}
/* КРИВЫЕ НА ВСЮ ПЛОСКОСТЬ (замечание владельца 18.11, вечер: «он странно обрывается, когда ты что-то сместил, … где
   очевидно можно сделать его бесконечным, это же функции»). Кривая сцены — точки маленького графика; на плоскости она
   рисуется по всей видимой части:
   — есть функция c.fn (y от x, src/textbook/charts.js) — она заново считается в точках экрана на всей видимой ширине
     в пределах своей области c.dom: линия бесконечна и при любом приближении гладкая, а не ломаная из 60 вершин;
   — точки лежат на одной прямой — прямая продолжается за обе крайние точки до краёв экрана;
   — иначе — как есть. Возвращает список кусков (функция может уходить в бесконечность — там линия рвётся). */
const SLACK = 4;   // запас по высоте: линия выходит за экран на 4 его высоты, дальше — обрыв (а не гигантские числа в SVG)
export function isStraight(pts, eps = 1e-6) {
  if (!pts || pts.length < 2) return false;
  const a = pts[0]; const b = pts[pts.length - 1];
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(L > 0)) return false;
  const sx = Math.max(1e-12, ...pts.map((q) => Math.abs(q.x - a.x))); const sy = Math.max(1e-12, ...pts.map((q) => Math.abs(q.y - a.y)));
  // отклонение от прямой в долях размаха по каждой оси: масштабы осей разные (сотни крон против единиц товара)
  return pts.every((q) => Math.abs(((q.x - a.x) / sx) * ((b.y - a.y) / sy) - ((q.y - a.y) / sy) * ((b.x - a.x) / sx)) <= eps * 10 + 1e-9);
}
export function curveOnView(c, v, w, h) {
  const pts = c.points || [];
  const yLo = v.y0 - (v.y1 - v.y0) * SLACK; const yHi = v.y1 + (v.y1 - v.y0) * SLACK;
  if (typeof c.fn === 'function') {
    const [d0, d1] = c.dom || [-Infinity, Infinity];
    const a = Math.max(v.x0, d0); const b = Math.min(v.x1, d1);
    if (!(b > a)) return [];
    const n = Math.max(24, Math.min(1200, Math.ceil(w / 2)));
    const out = []; let cur = [];
    for (let i = 0; i <= n; i += 1) {
      const x = a + ((b - a) * i) / n; const y = c.fn(x);
      if (Number.isFinite(y) && y >= yLo && y <= yHi) cur.push({ x, y });
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  }
  if (pts.length >= 2 && isStraight(pts)) {
    const p = pts[0]; const q = pts[pts.length - 1];
    const dx = q.x - p.x; const dy = q.y - p.y;
    // параметр t вдоль прямой p + t·(q − p): отрезок, видимый в окне (с запасом), — пересечение по осям
    let t0 = -Infinity; let t1 = Infinity;
    const clip = (d, s, lo, hi) => {
      if (Math.abs(d) < 1e-15) return s >= lo && s <= hi;
      const u = (lo - s) / d; const z = (hi - s) / d;
      t0 = Math.max(t0, Math.min(u, z)); t1 = Math.min(t1, Math.max(u, z));
      return true;
    };
    const mx = (v.x1 - v.x0) * 0.05; const my = (v.y1 - v.y0) * 0.05;
    /* прямая модели, которая вся лежит в первой четверти (годы, количества, цены), за оси не продолжается: копилка не уходит
       в «минус-годы», спрос кончается на осях (жалоба 19.11, «Вклад и копилка» на весь экран) */
    const xMin = pts.every((q) => q.x >= -1e-9) ? Math.max(0, v.x0 - mx) : v.x0 - mx;
    const yMin = pts.every((q) => q.y >= -1e-9) ? Math.max(0, v.y0 - my) : v.y0 - my;
    if (!clip(dx, p.x, xMin, Math.max(xMin, v.x1 + mx)) || !clip(dy, p.y, yMin, Math.max(yMin, v.y1 + my)) || !(t1 > t0)) return [];
    return [[{ x: p.x + dx * t0, y: p.y + dy * t0 }, { x: p.x + dx * t1, y: p.y + dy * t1 }]];
  }
  return pts.length > 1 ? [pts] : [];
}
// где поставить подпись кривой: точка видимой части на доле pos её длины (или в начале — pos 'start'), с полями от краёв
export function labelOnView(pieces, v, pos = 0.85) {
  const mx = (v.x1 - v.x0) * 0.04; const my = (v.y1 - v.y0) * 0.06;
  const ok = (q) => q.x >= v.x0 + mx && q.x <= v.x1 - mx * 3 && q.y >= v.y0 + my && q.y <= v.y1 - my;
  const f = pos === 'start' ? 0.05 : typeof pos === 'number' ? pos : 0.85;
  const all = pieces.flat();
  // у прямой из двух концов промежуточных точек нет — берём точку на отрезке, ближе к нужной доле
  if (all.length >= 2 && all.length < 3) {
    const a = all[0]; const b = all[all.length - 1];
    for (const t of [f, 0.7, 0.5, 0.3, 0.9, 0.15, 0.6, 0.4]) { const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; if (ok(q)) return q; }
  }
  const inside = all.filter(ok);
  if (!inside.length) return null;
  return inside[Math.max(0, Math.min(inside.length - 1, Math.round(f * (inside.length - 1))))];
}
// число по-русски: запятая, пробелы в тысячах, знаков после запятой — по шагу сетки
export function fmtPlane(x, step = 1) {
  const dec = step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step)) + (String(step).includes('5') ? 1 : 0));
  let s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(dec);
  if (Number(s) === 0) s = s.replace('-', '');
  const [int, frac] = s.split('.');
  const neg = int.startsWith('-');
  const body = (neg ? int.slice(1) : int).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '−' : ''}${body}${frac && Number(frac) !== 0 ? `,${frac.replace(/0+$/, '')}` : ''}`;
}
