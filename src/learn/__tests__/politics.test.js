/* Политология — проба для команды (docs/mechanics.md, «Политология — проба для команды»): курс выбирается
   при запуске (src/learn/track.js). Здесь модули загружаются заново с подменённым хранилищем: в курсе
   политологии — один начальный юнит «Власть и государство» и его глава, и к нему те же правила
   содержания, что к юнитам экономики; в курсе экономики политологии нет вовсе. */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { trackFrom, TRACK_KEY, TEAM_KEY } from '../track.js';

const memory = (init) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const ACC = JSON.stringify({ token: 't', login: 'Owner', name: 'Команда' });

describe('выбор курса', () => {
  it('политология — только если выбрана и сервер признал вошедшего командой', () => {
    expect(trackFrom(null)).toBe('econ');
    expect(trackFrom(memory({}))).toBe('econ');
    expect(trackFrom(memory({ [TRACK_KEY]: 'politics', 'ems-account': ACC }))).toBe('econ');
    expect(trackFrom(memory({ [TRACK_KEY]: 'politics', 'ems-account': ACC, [TEAM_KEY]: 'someone' }))).toBe('econ');
    expect(trackFrom(memory({ [TRACK_KEY]: 'politics', 'ems-account': ACC, [TEAM_KEY]: 'owner' }))).toBe('politics');
    expect(trackFrom(memory({ [TRACK_KEY]: 'econ', 'ems-account': ACC, [TEAM_KEY]: 'owner' }))).toBe('econ');
    expect(trackFrom(memory({ [TRACK_KEY]: 'politics', [TEAM_KEY]: 'owner' }))).toBe('econ');
    expect(trackFrom(memory({ [TRACK_KEY]: 'politics', 'ems-account': '{', [TEAM_KEY]: 'owner' }))).toBe('econ');
  });
});

describe('курс экономики — без политологии', () => {
  it('ни главы, ни юнита «Власть и государство»', async () => {
    const { CHAPTER_BY_ID } = await import('../../textbook/toc.js');
    const { UNIT_BY_ID } = await import('../course.js');
    expect(CHAPTER_BY_ID.power).toBeUndefined();
    expect(UNIT_BY_ID.power).toBeUndefined();
  });
});

describe('курс политологии: начальный юнит и глава', () => {
  let M;
  beforeAll(async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', memory({ [TRACK_KEY]: 'politics', 'ems-account': ACC, [TEAM_KEY]: 'owner' }));
    const toc = await import('../../textbook/toc.js');
    const course = await import('../course.js');
    const content = await import('../../textbook/content.js');
    const variants = await import('../../textbook/variants.js');
    const map = await import('../levelmap.js');
    M = { ...toc, ...course, ...content, seeded: variants.seeded, levelRegions: map.levelRegions };
  });
  afterAll(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('в учебнике — одна глава «Власть и государство», на Пути — один юнит в Начальном уровне', () => {
    expect(M.CHAPTERS.map((c) => c.id)).toEqual(['power']);
    expect(M.TOC_LEVELS.filter((l) => l.chapters.length).map((l) => [l.id, l.chapters.map((c) => c.id)])).toEqual([['start', ['power']]]);
    expect(M.pilotUnits().map((u) => u.id)).toEqual(['power']);
    expect(M.UNIT_BY_ID.power.level).toBe('start');
    expect(M.UNIT_BY_ID.power.lessons.map((l) => l.id)).toEqual(['pw-i1', 'pw-l1', 'pw-i2', 'pw-l2', 'pw-i3', 'pw-l3', 'pw-w', 'pw-rev', 'pw-sum']);
  });
  it('в главе три раздела с «Вспомните» и задачи', () => {
    const study = M.CHAPTER_SECTIONS.power.filter((x) => x.recall);
    expect(study.length).toBe(3);
    expect(Object.keys(M.RECALLS).sort()).toEqual(['power-r-power', 'power-r-split', 'power-r-state']);
    expect(M.problemsOf('power').length).toBe(4);
  });
  it('карта: одна область — Начальный уровень, Парламент и места под будущие юниты', () => {
    const { regions } = M.levelRegions();
    expect(regions.map((r) => r.id)).toEqual(['start']);
    expect(regions[0].units).toContain('power');
  });
  it('уроки укладываются во время, как у юнитов экономики; в практике 10–15 упражнений', () => {
    const STEPPED = ['intro', 'summary', 'words'];
    M.UNIT_BY_ID.power.lessons.forEach((l) => {
      for (let s = 1; s <= 20; s += 1) {
        const { seconds, items } = M.buildLesson(l.id, M.seeded(s));
        expect(seconds, `${l.id}: ${seconds} с`).toBeGreaterThanOrEqual(STEPPED.includes(l.kind) ? 120 : 180);
        expect(seconds, `${l.id}: ${seconds} с`).toBeLessThanOrEqual(300);
        if (!l.kind || l.kind === 'lesson') { expect(items.length, l.id).toBeGreaterThanOrEqual(10); expect(items.length, l.id).toBeLessThanOrEqual(15); }
      }
    });
  });
  it('у каждого вопроса один верный ответ, у неверных — «почему»; верный не выделяется длиной', () => {
    const list = Object.values(M.EXERCISES).filter((e) => e.unitId === 'power');
    expect(list.length).toBeGreaterThan(40);
    const plain = (o) => String(o.raw || '').replace(/\$[^$]*\$/g, 'xx').replace(/[*_`]/g, '').trim().length;
    // написанные руками выбор и пропуск — без «какой это термин?» из урока «Слова»
    const picks = list.filter((e) => (e.kind === 'choice' || e.kind === 'gap') && !String(e.id).includes(':which:') && !String(e.id).startsWith('auto:'));
    let longest = 0; let shortest = 0;
    picks.forEach((e) => {
      expect(e.options.filter((o) => o.correct).length, e.id).toBe(1);
      e.options.filter((o) => !o.correct).forEach((o) => expect(o.why, `${e.id}: у неверного варианта нет «почему»`).toBeTruthy());
      const lens = e.options.map(plain); const ci = e.options.findIndex((o) => o.correct);
      const others = lens.filter((_, k) => k !== ci); const wrong = Math.max(...others);
      expect(lens[ci], `${e.id}: ${lens[ci]} против ${wrong}`).toBeLessThanOrEqual(wrong * 1.25 + 3);
      if (others.every((x) => x < lens[ci])) longest += 1;
      if (others.every((x) => x > lens[ci])) shortest += 1;
    });
    expect(longest / picks.length).toBeLessThan(0.15);
    expect(shortest / picks.length).toBeLessThan(0.34);
  });
});
