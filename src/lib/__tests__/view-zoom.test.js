// Картинки на весь экран и приближение графика (docs/mechanics.md, «Картинки на весь экран», «Нарисуй сам»)
import { describe, it, expect } from 'vitest';
import { fitScale, fitView, clampPan, zoomAround, panBy, pinchView, zoomOf, ZOOM_MAX, FIT_MAX, fullVb, clampVb, zoomVb, panVb, pinchVb, vbZoom, vbString } from '../view-zoom.js';

const dims = { nw: 560, nh: 330, sw: 400, sh: 800 }; // график 560 × 330 на телефоне 400 × 800

describe('просмотр на весь экран', () => {
  it('картинка входит целиком и стоит посередине', () => {
    const v = fitView(dims.nw, dims.nh, dims.sw, dims.sh);
    expect(v.s).toBeCloseTo(400 / 560, 6);
    expect(v.tx).toBeCloseTo(0, 6);
    expect(v.ty).toBeCloseTo((800 - 330 * v.s) / 2, 6);
  });
  it('на большом экране — не крупнее, чем вдвое (подписи не раздуваются)', () => {
    expect(fitScale(560, 330, 1440, 900)).toBe(FIT_MAX);
    const v = fitView(560, 330, 1440, 900);
    expect(v.tx).toBeCloseTo((1440 - 1120) / 2, 6);
  });
  it('приближение к точке: точка картинки под пальцем остаётся на месте', () => {
    const v0 = fitView(dims.nw, dims.nh, dims.sw, dims.sh);
    const px = 300; const py = 400;
    const u = (px - v0.tx) / v0.s; const w = (py - v0.ty) / v0.s;
    const v1 = zoomAround(v0, 2, px, py, dims);
    expect(v1.s).toBeCloseTo(v0.s * 2, 6);
    expect(v1.tx + u * v1.s).toBeCloseTo(px, 6);
    // по высоте картинка всё ещё меньше экрана — по центру
    expect(v1.ty).toBeCloseTo((800 - 330 * v1.s) / 2, 6);
    expect(w).toBeGreaterThan(0);
    expect(zoomOf(v1, dims)).toBeCloseTo(2, 6);
  });
  it('не дальше ×4 и не мельче, чем целиком', () => {
    const v0 = fitView(dims.nw, dims.nh, dims.sw, dims.sh);
    expect(zoomOf(zoomAround(v0, 100, 200, 400, dims), dims)).toBeCloseTo(ZOOM_MAX, 6);
    expect(zoomOf(zoomAround(v0, 0.1, 200, 400, dims), dims)).toBeCloseTo(1, 6);
  });
  it('сдвиг: край картинки не отходит от края экрана', () => {
    const v1 = zoomAround(fitView(dims.nw, dims.nh, dims.sw, dims.sh), 3, 200, 400, dims);
    const right = panBy(v1, -5000, 0, dims);
    expect(right.tx).toBeCloseTo(dims.sw - dims.nw * v1.s, 6);
    const left = panBy(v1, 5000, 0, dims);
    expect(left.tx).toBe(0);
    expect(clampPan({ s: v1.s, tx: 50, ty: 0 }, dims.nw, dims.nh, dims.sw, dims.sh).tx).toBe(0);
  });
  it('щипок: масштаб — по расстоянию между пальцами, точка под их серединой едет за ней', () => {
    const v0 = fitView(dims.nw, dims.nh, dims.sw, dims.sh);
    const m0 = { x: 200, y: 400 }; const m1 = { x: 220, y: 410 };
    const v1 = pinchView(v0, 100, m0, 250, m1, dims);
    expect(v1.s).toBeCloseTo(v0.s * 2.5, 6);
    const u = (m0.x - v0.tx) / v0.s;
    expect(v1.tx + u * v1.s).toBeCloseTo(m1.x, 6);
  });
});

describe('«Нарисуй сам»: окно графика (viewBox)', () => {
  const W = 360; const H = 290;
  it('весь график — окно 0 0 W H, ×1', () => {
    expect(fullVb(W, H)).toEqual({ x: 0, y: 0, w: W, h: H });
    expect(vbZoom(fullVb(W, H), W)).toBe(1);
    expect(vbString(fullVb(W, H))).toBe('0 0 360 290');
  });
  it('приближение к точке графика: точка остаётся на том же месте окна, пропорции — как у графика', () => {
    const v = zoomVb(fullVb(W, H), 2, 90, 145, W, H);
    expect(vbZoom(v, W)).toBeCloseTo(2, 6);
    expect(v.h / v.w).toBeCloseTo(H / W, 6);
    // точка 90 была на четверти ширины — и осталась на четверти
    expect((90 - v.x) / v.w).toBeCloseTo(90 / W, 6);
  });
  it('окно не выходит за график и не меньше четверти', () => {
    const v = zoomVb(fullVb(W, H), 100, 355, 285, W, H);
    expect(vbZoom(v, W)).toBeCloseTo(ZOOM_MAX, 6);
    expect(v.x + v.w).toBeLessThanOrEqual(W + 1e-9);
    expect(v.y + v.h).toBeLessThanOrEqual(H + 1e-9);
    expect(clampVb({ x: -50, y: -50, w: W * 2, h: H * 2 }, W, H)).toEqual(fullVb(W, H));
  });
  it('сдвиг пальцем: на сколько точек экрана — на столько же в окне', () => {
    const v = zoomVb(fullVb(W, H), 2, 180, 145, W, H); // окно 180 × 145 посередине
    const moved = panVb(v, 36, 0, 360, W, H); // окно на экране 360 точек — 1 точка экрана = 0,5 единицы
    expect(moved.x).toBeCloseTo(v.x - 18, 6);
    expect(panVb(v, 5000, 5000, 360, W, H)).toMatchObject({ x: 0, y: 0 });
  });
  it('щипок: точка между пальцами остаётся между ними', () => {
    const v0 = fullVb(W, H);
    const v = pinchVb(v0, 100, { x: 180, y: 145 }, 200, 0.5, 0.5, W, H);
    expect(vbZoom(v, W)).toBeCloseTo(2, 6);
    expect(v.x + v.w * 0.5).toBeCloseTo(180, 6);
    expect(v.y + v.h * 0.5).toBeCloseTo(145, 6);
  });
});
