/* Пункт владельца 19.11: «в мини-игре должен быть график, такой же как в разборе графика, к чему в главе про производственную
   функцию спрос и предложение». Каждая мини-игра рисует модель «Разбора графика» своего юнита (src/learn/game-graph.js). */
import { describe, it, expect } from 'vitest';
import { gameGraph } from '../game-graph.js';
import { UNIT_BY_ID } from '../course.js';
import { GRAPHS } from '../graphs.js';
import { CHARTS } from '../../textbook/charts.js';

const games = Object.values(UNIT_BY_ID).flatMap((u) => u.lessons.filter((l) => l.kind === 'game').map((l) => ({ u, ex: l.exercises[0] }))).filter(({ ex }) => ex.chart);
const start = (chart) => (chart === 'product' ? { L: 3, A: 1.1 } : chart === 'market' ? { D: 0, S: 0 } : chart === 'budget' ? { I: 100, px: 1.25, py: 1.25 } : chart === 'elastic' ? { e: 1 } : chart === 'costs' ? { fc: 0, vc: 0 } : chart === 'power' || chart === 'markup' ? { m: 0.5 } : { rx: 100, ry: 100, t: 0.5 });

describe('график мини-игры — модель «Разбора графика»', () => {
  it('у каждой игры с графиком — модель и сцена: оси, кривые, ни одного NaN', () => {
    expect(games.length).toBeGreaterThanOrEqual(10);
    for (const { ex } of games) {
      const gg = gameGraph(ex, start(ex.chart));
      expect(gg, ex.id).toBeTruthy();
      const sc = gg.g.def.build(gg.g.attrs, { ...Object.fromEntries((gg.g.def.controls ? gg.g.def.controls(gg.g.attrs) : []).filter((c) => !c.button).map((c) => [c.id, c.def])), ...gg.live });
      expect(sc.curves.length, ex.id).toBeGreaterThan(0);
      expect(JSON.stringify(sc), ex.id).not.toMatch(/NaN|null,"y"|"y":null/);
    }
  });
  it('где у юнита есть «Разбор графика» той же темы — та же модель', () => {
    const same = { 'supply-demand': 'supply-demand', labor: 'labor', household: 'savings', production: 'product', scarcity: 'ppf', consumer: 'budget', costs: 'costs' };
    for (const { u, ex } of games) {
      if (!same[u.id]) continue;
      const gg = gameGraph(ex, start(ex.chart));
      expect(gg.g.chart, ex.id).toBe(same[u.id]);
      const graph = GRAPHS.find((x) => x.unitId === u.id);
      if (graph) expect(CHARTS[graph.chart] === gg.g.def || graph.chart === gg.g.chart, ex.id).toBe(true);
    }
  });
  it('«Завод» — общий продукт, не спрос и предложение: технологии поднимают кривую, работники двигают точку', () => {
    const { ex } = games.find(({ u }) => u.id === 'production');
    expect(ex.chart).toBe('product');
    const tp = (st) => { const gg = gameGraph(ex, st); return gg.g.def.build(gg.g.attrs, gg.live).points[0].y; };
    expect(tp({ L: 3, A: 1.3 })).toBeGreaterThan(tp({ L: 3, A: 1.1 }));
    expect(tp({ L: 4.2, A: 1.1 })).toBeGreaterThan(tp({ L: 3, A: 1.1 }));
  });
  it('«Сберкасса» — вклад при ставке рынка кредитов: спрос на кредиты вырос — ставка и вклад выше', () => {
    const { ex } = games.find(({ u }) => u.id === 'household');
    const r = (D) => gameGraph(ex, { D, S: 0 }).live.r;
    expect(r(0)).toBeCloseTo(8, 6);
    expect(r(16)).toBeGreaterThan(r(0));
    expect(r(-16)).toBeLessThan(r(0));
  });
  it('«Банк» — рынок кредитов: свои названия осей и кривых', () => {
    const { ex } = games.find(({ u }) => u.id === 'money-banks');
    const gg = gameGraph(ex, { D: 0, S: 0 });
    const sc = gg.g.def.build(gg.g.attrs, { ...gg.live, ceil: 999 });
    expect(sc.yLabel).toMatch(/ставка/);
    expect(sc.curves.find((c) => c.id === 'D').label).toMatch(/кредит/);
  });
});

/* Пункты владельца 19.11: 8 — вместо Грегори Кинга (у него нет фото) другой человек; 9 — в «Чтении» фото авторов. */
describe('портреты: «Персоналии» без Кинга, «Чтение» — с лицами', async () => {
  const { PEOPLE } = await import('../people.js');
  const { READINGS, READING_AUTHORS, readingAuthorId } = await import('../reading.js');
  const { readFileSync, existsSync } = await import('node:fs');
  it('Грегори Кинга нет; у каждого — статья Википедии, откуда сборка берёт свободное фото', () => {
    const all = PEOPLE.flatMap((g) => g.people);
    expect(all.find((p) => p.id === 'king')).toBeUndefined();
    expect(all.find((p) => p.id === 'veblen')).toBeTruthy();
    for (const p of all) expect(p.wiki, p.id).toBeTruthy();
  });
  it('у каждого автора «Чтения» — id портрета: из «Персоналий» или свой; сборка качает и авторов', () => {
    const authors = [...new Set(READINGS.flatMap((r) => r.pages.map((p) => p.author)))];
    for (const a of authors) expect(readingAuthorId(a, PEOPLE), a).toBeTruthy();
    expect(readingAuthorId('Уильям Джевонс', PEOPLE)).toBe('jevons');
    expect(readingAuthorId('Адам Смит', PEOPLE)).toBe('smith');
    for (const a of READING_AUTHORS) expect(a.wiki, a.id).toBeTruthy();
    expect(readFileSync(new URL('../../../scripts/fetch-portraits.mjs', import.meta.url), 'utf8')).toMatch(/READING_AUTHORS/);
    // у Смита, Маршалла и Роббинса фото уже лежит
    for (const id of ['smith', 'marshall', 'robbins']) expect(existsSync(new URL(`../../../public/people/${id}.jpg`, import.meta.url)), id).toBe(true);
  });
});
