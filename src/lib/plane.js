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
export function zoomPlane(v, f, px, py, w, h, { ax = true, ay = true } = {}) {
  const p = toData(v, w, h, px, py);
  const sx = ax ? f : 1; const sy = ay ? f : 1;
  const nx = { x0: p.x - (p.x - v.x0) / sx, x1: p.x + (v.x1 - p.x) / sx };
  const ny = { y0: p.y - (p.y - v.y0) / sy, y1: p.y + (v.y1 - p.y) / sy };
  const okX = nx.x1 - nx.x0 > PLANE_SPAN.min && nx.x1 - nx.x0 < PLANE_SPAN.max;
  const okY = ny.y1 - ny.y0 > PLANE_SPAN.min && ny.y1 - ny.y0 < PLANE_SPAN.max;
  return { ...(okX ? nx : { x0: v.x0, x1: v.x1 }), ...(okY ? ny : { y0: v.y0, y1: v.y1 }) };
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
