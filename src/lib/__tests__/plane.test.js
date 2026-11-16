/* Числовая плоскость полноэкранного графика (пункт владельца 16.11, вечер: «открытие графика на весь экран всё ещё
   отвратительное — должно быть современно, реальная числовая плоскость»). */
import { describe, it, expect } from 'vitest';
import { niceStep, ticks, fitPlane, toPx, toData, zoomPlane, panPlane, zoomLevel, nearestOnCurves, fmtPlane, lerpPlane } from '../plane.js';

describe('числовая плоскость', () => {
  it('шаг сетки — «красивый» и подстраивается под масштаб: приблизили — шаг мельче', () => {
    expect(niceStep(10, 900)).toBe(1);
    expect(niceStep(7000, 600)).toBe(1000);
    expect(niceStep(100, 1000)).toBe(10);
    expect(niceStep(0.3, 900)).toBeCloseTo(0.025, 10);
    for (const span of [3, 37, 512, 9999, 0.07]) {
      const s = niceStep(span, 800);
      const m = s / 10 ** Math.floor(Math.log10(s));
      expect([1, 2, 2.5, 5]).toContain(Number(m.toFixed(6)));
      // между линиями на экране — от 40 до 170 точек
      expect((s / span) * 800).toBeGreaterThan(40); expect((s / span) * 800).toBeLessThan(170);
    }
    expect(niceStep(10, 900)).toBeGreaterThan(niceStep(2, 900));
  });
  it('деления — по кратным шага, без хвостов округления', () => {
    expect(ticks(-0.05, 0.31, 0.1)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(ticks(-250, 1250, 500)).toEqual([0, 500, 1000]);
    expect(ticks(5, 1, 1)).toEqual([]);
  });
  it('приближение к курсору оставляет точку под курсором на месте; сдвиг — плоскость едет за пальцем', () => {
    const v = fitPlane([0, 10], [0, 3000]);
    expect(v.x0).toBeLessThan(0); expect(v.y0).toBeLessThan(0);
    const w = 800; const h = 500;
    const before = toData(v, w, h, 300, 200);
    const z = zoomPlane(v, 2, 300, 200, w, h);
    const after = toData(z, w, h, 300, 200);
    expect(after.x).toBeCloseTo(before.x, 9); expect(after.y).toBeCloseTo(before.y, 9);
    expect(zoomLevel(v, z)).toBeCloseTo(2, 9);
    // только по одной оси
    const zx = zoomPlane(v, 2, 300, 200, w, h, { ay: false });
    expect(zx.y1 - zx.y0).toBeCloseTo(v.y1 - v.y0, 9);
    const p = panPlane(v, 80, -50, w, h);
    expect(toPx(p, w, h).x(before.x)).toBeCloseTo(300 + 80, 6);
    expect(toPx(p, w, h).y(before.y)).toBeCloseTo(200 - 50, 6);
    expect(lerpPlane(v, z, 0)).toEqual(v); expect(lerpPlane(v, z, 1)).toEqual(z);
  });
  it('ближайшая точка — на самой линии между узлами, со значениями по осям; далеко от линий — ничего', () => {
    const v = { x0: 0, x1: 10, y0: 0, y1: 10 }; const w = 1000; const h = 1000;
    const line = { id: 'D', label: 'D', points: [{ x: 0, y: 10 }, { x: 10, y: 0 }] };
    const P = toPx(v, w, h);
    const hit = nearestOnCurves([line], v, w, h, P.x(3) + 5, P.y(7) + 5);
    expect(hit.curve.id).toBe('D'); expect(hit.x + hit.y).toBeCloseTo(10, 6);
    expect(nearestOnCurves([line], v, w, h, P.x(9), P.y(9))).toBe(null);
  });
  it('числа по-русски: запятая, пробелы в тысячах, минус', () => {
    expect(fmtPlane(2593.74, 1)).toBe('2 594');
    expect(fmtPlane(2.5, 0.5)).toBe('2,5');
    expect(fmtPlane(-1200, 100)).toBe('−1 200');
    expect(fmtPlane(0.25, 0.25)).toBe('0,25');
    expect(fmtPlane(-0.0000001, 0.1)).toBe('0');
  });
});
