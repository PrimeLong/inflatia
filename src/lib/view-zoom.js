/* ПРИБЛИЖЕНИЕ КАРТИНКИ И ГРАФИКА (docs/mechanics.md, «Картинки на весь экран» и «Нарисуй сам»): чистый расчёт,
   без React. Два вида:
   - просмотр на весь экран (src/zoom-view.jsx): картинка размером nw × nh (её родной размер) стоит на сцене
     sw × sh в масштабе s (экранных точек на точку картинки), левый верхний угол — в (tx, ty) от угла сцены;
     пока картинка меньше сцены, она по центру, больше — её край не отходит от края сцены;
   - окно графика (viewBox) в «Нарисуй сам»: { x, y, w, h } внутри W × H, во весь график — { 0, 0, W, H }. */
export const ZOOM_MAX = 4;
export const FIT_MAX = 2;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- просмотр на весь экран ---------- */
// во сколько раз картинка входит в сцену целиком; крупнее FIT_MAX не растягиваем — подписи станут огромными
export function fitScale(nw, nh, sw, sh, max = FIT_MAX) {
  if (!(nw > 0 && nh > 0 && sw > 0 && sh > 0)) return 1;
  return Math.min(sw / nw, sh / nh, max);
}
export function fitView(nw, nh, sw, sh, max = FIT_MAX) {
  const s = fitScale(nw, nh, sw, sh, max);
  return { s, tx: (sw - nw * s) / 2, ty: (sh - nh * s) / 2 };
}
// поправить сдвиг: картинка меньше сцены — по центру, больше — без пустых полос у края
export function clampPan(v, nw, nh, sw, sh) {
  const w = nw * v.s; const h = nh * v.s;
  const tx = w <= sw ? (sw - w) / 2 : clamp(v.tx, sw - w, 0);
  const ty = h <= sh ? (sh - h) / 2 : clamp(v.ty, sh - h, 0);
  return { s: v.s, tx, ty };
}
// приблизить в factor раз вокруг точки сцены (px, py): точка картинки под ней остаётся на месте
export function zoomAround(v, factor, px, py, dims, max = ZOOM_MAX) {
  const { nw, nh, sw, sh } = dims;
  const fit = fitScale(nw, nh, sw, sh);
  const s = clamp(v.s * factor, fit, fit * max);
  const k = s / v.s;
  return clampPan({ s, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }, nw, nh, sw, sh);
}
export function panBy(v, dx, dy, dims) {
  return clampPan({ s: v.s, tx: v.tx + dx, ty: v.ty + dy }, dims.nw, dims.nh, dims.sw, dims.sh);
}
// щипок: в начале — вид v0, расстояние d0 и середина m0 (точки сцены); сейчас — расстояние d1 и середина m1
export function pinchView(v0, d0, m0, d1, m1, dims, max = ZOOM_MAX) {
  const { nw, nh, sw, sh } = dims;
  const fit = fitScale(nw, nh, sw, sh);
  const s = clamp(v0.s * (d1 / Math.max(1, d0)), fit, fit * max);
  // точка картинки под серединой пальцев в начале — под серединой пальцев сейчас
  const ux = (m0.x - v0.tx) / v0.s; const uy = (m0.y - v0.ty) / v0.s;
  return clampPan({ s, tx: m1.x - ux * s, ty: m1.y - uy * s }, nw, nh, sw, sh);
}
// приближение относительно «вписать»: 1 — картинка целиком
export const zoomOf = (v, dims) => v.s / fitScale(dims.nw, dims.nh, dims.sw, dims.sh);

/* ---------- окно графика (viewBox) ---------- */
export const fullVb = (W, H) => ({ x: 0, y: 0, w: W, h: H });
export function clampVb(v, W, H, max = ZOOM_MAX) {
  const w = clamp(v.w, W / max, W); const h = (w * H) / W;
  return { x: clamp(v.x, 0, W - w), y: clamp(v.y, 0, H - h), w, h };
}
// приблизить в factor раз вокруг точки графика (px, py) в единицах viewBox
export function zoomVb(v, factor, px, py, W, H, max = ZOOM_MAX) {
  const w = clamp(v.w / factor, W / max, W); const k = w / v.w;
  return clampVb({ w, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, W, H, max);
}
// сдвиг на (dx, dy) экранных точек при ширине окна графика на экране bw точек
export function panVb(v, dx, dy, bw, W, H, max = ZOOM_MAX) {
  const u = v.w / Math.max(1, bw);
  return clampVb({ ...v, x: v.x - dx * u, y: v.y - dy * u }, W, H, max);
}
// щипок по графику: v0 и середина m0 (в единицах viewBox) в начале, d0 → d1 — расстояние между пальцами,
// (fx, fy) — где середина пальцев сейчас, в долях окна графика на экране (0…1)
export function pinchVb(v0, d0, m0, d1, fx, fy, W, H, max = ZOOM_MAX) {
  const w = clamp(v0.w / (d1 / Math.max(1, d0)), W / max, W); const h = (w * H) / W;
  return clampVb({ w, x: m0.x - fx * w, y: m0.y - fy * h }, W, H, max);
}
export const vbZoom = (v, W) => W / v.w;
export const vbString = (v) => `${+v.x.toFixed(2)} ${+v.y.toFixed(2)} ${+v.w.toFixed(2)} ${+v.h.toFixed(2)}`;
