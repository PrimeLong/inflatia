// карта Пути: пять областей уровней вместо административных округов (docs/mechanics.md, «Навигация»)
import { describe, it, expect } from 'vitest';
import { levelRegions, voronoi, LEVEL_TINT } from '../levelmap.js';
import { UNITS, LEVELS } from '../course.js';
import { placeOf } from '../../ds-tokens.js';

describe('карта: области уровней', () => {
  const { regions, borders } = levelRegions();
  it('пять областей — по уровням, в порядке курса, у каждой цвет, номер и место для номера', () => {
    expect(regions.map((r) => r.id)).toEqual(LEVELS.map((l) => l.id));
    regions.forEach((r, k) => {
      expect(r.no).toBe(k + 1);
      expect(LEVEL_TINT[r.id]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(r.d.length).toBeGreaterThan(10);
      expect(r.label).toHaveLength(2);
    });
    // каждый юнит — в области своего уровня
    UNITS.forEach((u) => expect(regions.find((r) => r.units.includes(u.id)).id).toBe(u.level));
  });
  it('граница — только между разными уровнями; клетка Вороного держит своё место', () => {
    expect(borders.length).toBeGreaterThan(4);
    borders.forEach((b) => expect(b.between[0]).not.toBe(b.between[1]));
    const sites = UNITS.map((u) => placeOf(u.id).at);
    const cells = voronoi(sites);
    cells.forEach((poly, i) => {
      // место внутри своей клетки: ни одна вершина клетки не ближе к другому месту, чем к своему
      poly.forEach((v) => {
        const own = Math.hypot(v.p[0] - sites[i][0], v.p[1] - sites[i][1]);
        sites.forEach((s) => expect(own).toBeLessThanOrEqual(Math.hypot(v.p[0] - s[0], v.p[1] - s[1]) + 1e-6));
      });
    });
  });
});

describe('карта: 25 мест — по пять на уровень', async () => {
  const { mapSlots, PER_LEVEL } = await import('../levelmap.js');
  const slots = mapSlots();
  it('на каждом уровне пять мест: юниты уровня и места под будущие юниты', () => {
    expect(slots).toHaveLength(25);
    LEVELS.forEach((l) => expect(slots.filter((x) => x.level === l.id), l.id).toHaveLength(PER_LEVEL));
    // юниты — каждый ровно один раз, в порядке Пути (по уровням)
    expect(slots.filter((x) => !x.soon).map((x) => x.id)).toEqual(UNITS.map((u) => u.id));
    expect(new Set(slots.map((x) => x.id)).size).toBe(25);
  });
  it('места не налезают друг на друга, дорога не пересекает себя', () => {
    slots.forEach((a, i) => slots.forEach((b, j) => { if (i < j) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}–${b.id}`).toBeGreaterThan(70); }));
    const seg = slots.slice(1).map((b, k) => [slots[k].at, b.at]);
    const cross = ([p1, p2], [p3, p4]) => {
      const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      return d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0;
    };
    seg.forEach((s1, i) => seg.forEach((s2, j) => { if (j > i + 1) expect(cross(s1, s2), `${i}×${j}`).toBe(false); }));
  });
});

describe('здания мест', () => {
  it('у юнитов на Пути — разные гравюры: «Ярмарка» — шатёр, а не лавки «Рынка»', async () => {
    const { PLACES } = await import('../../ds-tokens.js');
    expect(PLACES.monopolistic.building).toBe('fair');
    expect(PLACES['supply-demand'].building).toBe('market');
    const { pilotUnits } = await import('../course.js');
    const ready = pilotUnits().map((u) => placeOf(u.id).building);
    expect(new Set(ready).size).toBe(ready.length);
  });
});

/* Здания на карте (src/learn.jsx, атлас): круг r=49 с центром на 26 выше точки места, подпись 23px
   жирным — по центру, базовая линия на 28 ниже точки. Номер уровня — круг r=19. */
describe('карта: здания, подписи и номера уровней не налезают (жалоба «юниты накладываются»)', async () => {
  const { pilotUnits } = await import('../course.js');
  const ready = pilotUnits().map((u) => ({ id: u.id, at: placeOf(u.id).at, name: placeOf(u.id).place }));
  const circle = (u) => ({ x: u.at[0], y: u.at[1] - 26, r: 49 });
  // подпись: ширина ≈ 13 px на букву, высота строки — от 12 до 36 ниже точки
  const label = (u) => ({ x0: u.at[0] - u.name.length * 6.5, x1: u.at[0] + u.name.length * 6.5, y0: u.at[1] + 10, y1: u.at[1] + 36 });
  const circleRect = (c, r) => { const nx = Math.max(r.x0, Math.min(c.x, r.x1)); const ny = Math.max(r.y0, Math.min(c.y, r.y1)); return Math.hypot(c.x - nx, c.y - ny) < c.r; };
  const rects = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  it('у вышедших юнитов здания и подписи не пересекаются', () => {
    const bad = [];
    ready.forEach((a, i) => ready.forEach((b, j) => {
      if (i >= j) return;
      const ca = circle(a); const cb = circle(b);
      if (Math.hypot(ca.x - cb.x, ca.y - cb.y) <= ca.r + cb.r) bad.push(`здания ${a.id}–${b.id}`);
      if (circleRect(ca, label(b))) bad.push(`здание ${a.id} — подпись ${b.id}`);
      if (circleRect(cb, label(a))) bad.push(`здание ${b.id} — подпись ${a.id}`);
      if (rects(label(a), label(b))) bad.push(`подписи ${a.id}–${b.id}`);
    }));
    // подпись целиком в рамке карты (MAP_BOX в src/learn.jsx: x 130…910, y 70…680) — «Биржа труда» уходила за левый край
    ready.forEach((u) => { const l = label(u); if (l.x0 < 130 || l.x1 > 910 || l.y1 > 680) bad.push(`подпись ${u.id} за краем карты`); });
    expect(bad).toEqual([]);
  });
  it('номер уровня — не на здании и не на подписи вышедшего юнита', () => {
    const bad = [];
    levelRegions().regions.filter((r) => r.label).forEach((r) => {
      const badge = { x: r.label[0], y: r.label[1], r: 19 };
      ready.forEach((u) => {
        const c = circle(u);
        if (Math.hypot(badge.x - c.x, badge.y - c.y) <= badge.r + c.r) bad.push(`уровень ${r.id} — здание ${u.id}`);
        if (circleRect(badge, label(u))) bad.push(`уровень ${r.id} — подпись ${u.id}`);
      });
    });
    expect(bad).toEqual([]);
  });
});
