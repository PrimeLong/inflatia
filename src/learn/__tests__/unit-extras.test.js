/* Правило «в каждом юните — все четыре особых урока» (docs/mechanics.md, «Особые уроки юнита»):
   у каждого юнита Пути с уроками есть «Персоналии», «Чтение», «Разбор графика» и «Нарисуй сам» —
   по одному, и все четыре стоят на его дороге. Новый юнит без них этот тест не пропустит. */
import { describe, it, expect } from 'vitest';
import { UNIT_BY_ID, pathState } from '../course.js';
import { unitStops } from '../stops.js';
import { PEOPLE_BY_UNIT } from '../people.js';
import { READING_BY_UNIT } from '../reading.js';
import { GRAPH_BY_UNIT } from '../graphs.js';
import { DRAW_BY_UNIT } from '../draws.js';
import { emptyLearn } from '../../textbook/learn-state.js';

const KINDS = ['people', 'read', 'graph', 'draw'];
const units = Object.values(UNIT_BY_ID).filter((u) => u.lessons.length);

describe('особые уроки юнита: в каждом — все четыре', () => {
  it('у каждого юнита с уроками — «Персоналии», «Чтение», «Разбор графика» и «Нарисуй сам»', () => {
    expect(units.length).toBeGreaterThanOrEqual(12);
    units.forEach((u) => {
      expect(PEOPLE_BY_UNIT[u.id], `${u.id}: нет «Персоналий»`).toBeTruthy();
      expect(READING_BY_UNIT[u.id], `${u.id}: нет «Чтения»`).toBeTruthy();
      expect(GRAPH_BY_UNIT[u.id], `${u.id}: нет «Разбора графика»`).toBeTruthy();
      expect(DRAW_BY_UNIT[u.id], `${u.id}: нет «Нарисуй сам»`).toBeTruthy();
    });
  });
  it('на дороге юнита — по одной остановке каждого вида; «Персоналии» раньше «Чтения», «Нарисуй сам» — после разбора', () => {
    const learn = emptyLearn();
    const path = pathState(learn);
    units.forEach((u) => {
      const st = path.find((s) => s.course.id === u.id);
      expect(st, u.id).toBeTruthy();
      const stops = unitStops(st, learn);
      const types = stops.map((s) => s.type);
      KINDS.forEach((k) => expect(types.filter((t) => t === k), `${u.id}: ${k}`).toHaveLength(1));
      expect(types.indexOf('people'), u.id).toBeLessThan(types.indexOf('read'));
      expect(types.indexOf('draw'), u.id).toBeGreaterThan(types.indexOf('graph'));
      // на одном графике — сразу друг за другом (у «Эластичности» рисуют горку выручки — после её урока)
      if (DRAW_BY_UNIT[u.id].chart === GRAPH_BY_UNIT[u.id].chart) expect(types.indexOf('draw') - types.indexOf('graph'), u.id).toBe(1);
      // особый урок не стоит в начале дороги: перед ним — хотя бы один урок
      expect(types[0], u.id).toBe('lesson');
    });
  });
  // в уроках о банках и об инфляции главный график не появляется — разбор стоит после трети юнита (graphAfter)
  const NO_CHART_IN_LESSONS = ['money-banks', 'inflation'];
  it('графики «Разбора» и «Нарисуй сам» встречаются в уроках юнита; разные — только у «Эластичности»', () => {
    units.forEach((u) => {
      const g = GRAPH_BY_UNIT[u.id]; const d = DRAW_BY_UNIT[u.id];
      if (u.id !== 'elasticity') expect(d.chart, u.id).toBe(g.chart);
      if (!NO_CHART_IN_LESSONS.includes(u.id)) [g.chart, d.chart].forEach((chart) => {
        const seen = u.lessons.some((l) => [l.idea, ...(l.inner || []).map((c) => c.idea)].some((b) => b && b.chart === chart));
        expect(seen, `${u.id}: график ${chart} не встречается в уроках`).toBe(true);
      });
    });
  });
});
