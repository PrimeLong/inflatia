/* Числовая плоскость полноэкранного графика (пункт владельца 16.11, вечер: «открытие графика на весь экран всё ещё
   отвратительное — должно быть современно, реальная числовая плоскость»). */
import { describe, it, expect } from 'vitest';
import { niceStep, ticks, fitPlane, toPx, toData, zoomPlane, panPlane, zoomLevel, nearestOnCurves, fmtPlane, lerpPlane , ZOOM_LIMIT, curveOnView, labelOnView, isStraight } from '../plane.js';

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

  // замечания владельца 18.11, вечер: «отдалял, потом приблизил — график в прямую превратился», «обрывается», «зачем такое далёкое отдаление»
  it('масштаб: отдалить — не больше чем в 8 раз от «вписать», приблизить — не больше 400; пропорции осей не ломаются', () => {
    const fit = { x0: 0, x1: 100, y0: 0, y1: 10 }; const w = 800; const h = 600;
    let v = { ...fit };
    for (let i = 0; i < 200; i += 1) v = zoomPlane(v, 1 / 1.6, 400, 300, w, h, { fit });
    expect((v.x1 - v.x0) / 100).toBeCloseTo(ZOOM_LIMIT.out, 6);
    expect((v.y1 - v.y0) / 10).toBeCloseTo(ZOOM_LIMIT.out, 6);
    for (let i = 0; i < 400; i += 1) v = zoomPlane(v, 1.6, 400, 300, w, h, { fit });
    expect(100 / (v.x1 - v.x0)).toBeCloseTo(ZOOM_LIMIT.in, 6);
    // отношение размахов осей — как у «вписать»: кривая не сплющивается в прямую
    expect((v.x1 - v.x0) / (v.y1 - v.y0)).toBeCloseTo(10, 6);
  });
  it('без fit — абсолютный предел, но тоже один множитель на обе оси', () => {
    let v = { x0: 0, x1: 1e8, y0: 0, y1: 10 };
    for (let i = 0; i < 50; i += 1) v = zoomPlane(v, 0.5, 0, 0, 100, 100);
    expect((v.x1 - v.x0) / (v.y1 - v.y0)).toBeCloseTo(1e7, 0);
  });
  it('прямая продолжается за свои концы до краёв экрана в обе стороны', () => {
    const v = { x0: -50, x1: 150, y0: -20, y1: 120 };
    const [part] = curveOnView({ points: [{ x: 0, y: 100 }, { x: 50, y: 0 }] }, v, 800, 600);
    expect(part).toHaveLength(2);
    expect(Math.min(part[0].y, part[1].y)).toBeLessThan(v.y0);
    expect(Math.max(part[0].y, part[1].y)).toBeGreaterThan(v.y1);
    // горизонталь — от края до края
    const [hz] = curveOnView({ points: [{ x: 0, y: 40 }, { x: 10, y: 40 }] }, v, 800, 600);
    expect(Math.min(hz[0].x, hz[1].x)).toBeLessThan(v.x0); expect(Math.max(hz[0].x, hz[1].x)).toBeGreaterThan(v.x1);
    expect(isStraight([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }])).toBe(false);
  });
  it('функция считается на всей видимой ширине в своей области и гладко: при приближении — не ломаная из узлов', () => {
    const fn = (t) => 100 * 1.08 ** t;
    const pts = Array.from({ length: 21 }, (_, i) => ({ x: i / 4, y: fn(i / 4) }));
    const far = { x0: -10, x1: 30, y0: 0, y1: 1200 };
    const parts = curveOnView({ points: pts, fn }, far, 800, 600);
    const all = parts.flat();
    expect(all[0].x).toBeCloseTo(-10, 6); expect(all[all.length - 1].x).toBeCloseTo(30, 6);
    expect(all.every((q) => Math.abs(q.y - fn(q.x)) < 1e-9)).toBe(true);
    // сильно приблизили между двумя узлами — точек всё равно сотни
    const near = { x0: 1.01, x1: 1.02, y0: 107.5, y1: 108.5 };
    expect(curveOnView({ points: pts, fn }, near, 800, 600).flat().length).toBeGreaterThan(200);
    // область: средние издержки — только при Q > 0; уход в бесконечность у нуля — обрыв, а не числа размером с галактику
    const atc = (q) => 100 / q + 10;
    const v = { x0: -5, x1: 50, y0: 0, y1: 100 };
    const c = curveOnView({ points: [{ x: 1, y: 110 }, { x: 2, y: 60 }], fn: atc, dom: [1e-9, Infinity] }, v, 800, 600);
    expect(c.flat().every((q) => q.x > 0 && q.y <= v.y1 + (v.y1 - v.y0) * 4)).toBe(true);
  });
  it('подпись кривой — на её видимой части, а не за краем', () => {
    const v = { x0: 0, x1: 10, y0: 0, y1: 10 };
    const parts = curveOnView({ points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }, v, 800, 600);
    const q = labelOnView(parts, v, 0.85);
    expect(q.x).toBeGreaterThan(0); expect(q.x).toBeLessThan(10); expect(q.y).toBeLessThan(10);
    expect(labelOnView([], v)).toBe(null);
  });
});
