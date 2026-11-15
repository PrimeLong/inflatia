// Время урока — только когда ученик на месте (src/learn/active-time.js)
import { describe, it, expect } from 'vitest';
import { activeClock, tickClock, actClock, IDLE_MS } from '../active-time.js';

const T = 1e12;
// часы, которые тикают раз в секунду от from до to (видимость — visible)
const run = (c, from, to, visible = true) => { let x = c; for (let t = from + 1000; t <= to; t += 1000) x = tickClock(x, t, visible); return x; };

describe('время урока', () => {
  it('ученик отвечает — секунды идут', () => {
    let c = activeClock(T);
    for (let k = 1; k <= 6; k += 1) { c = run(c, T + (k - 1) * 10000, T + k * 10000); c = actClock(c, T + k * 10000); }
    expect(c.ms).toBe(60000);
  });
  it('телефон выключили на три часа — пауза не считается; продолжил — время идёт дальше', () => {
    let c = actClock(activeClock(T), T + 20000);
    c = run(c, T, T + 20000);
    const before = c.ms;
    // вкладка скрыта три часа: тиков почти нет, а после возвращения — один большой разрыв
    c = tickClock(c, T + 20000 + 3 * 3600000, false);
    c = actClock(c, T + 20000 + 3 * 3600000 + 1000);
    expect(c.ms - before).toBeLessThanOrEqual(5000);
    c = run(c, T + 20000 + 3 * 3600000 + 1000, T + 20000 + 3 * 3600000 + 31000);
    expect(c.ms - before).toBeGreaterThanOrEqual(30000);
    expect(c.ms).toBeLessThan(60000);
  });
  it('вкладка открыта, но без касаний дольше минуты — время стоит', () => {
    let c = actClock(activeClock(T), T);
    c = run(c, T, T + 10 * 60000);
    expect(c.ms).toBe(IDLE_MS);
  });
  it('продолжение прерванного урока начинается с уже набранного', () => {
    expect(activeClock(T, 42000).ms).toBe(42000);
  });
});

/* Особые («квадратные») уроки — пункты владельца 15.11: «минуты в квадратных уроках не считает» и «в конце
   квадратного урока выдало 58 минут, хотя телефон был выключен». */
describe('особые уроки: время — активное, и при повторе идёт в цель дня', () => {
  it('ни один особый урок не меряет время по стене (Date.now() − начало)', async () => {
    const { readFileSync } = await import('node:fs');
    ['learn-people.jsx', 'learn-reading.jsx', 'learn-graph.jsx', 'learn-draw.jsx'].forEach((f) => {
      const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
      expect(src, f).toContain('useActiveMs()');
      expect(src, f).not.toMatch(/Date\.now\(\) - (started\.current|startAt)/);
      // повтор урока: время всё равно идёт в минуты дня
      expect(src, f).toContain('addStudySeconds(');
    });
  });
  it('addStudySeconds: секунды — в минуты дня, без опыта и без счёта уроков; не больше 15 минут за раз', async () => {
    const { emptyLearn, addStudySeconds, goalToday, dailyOf } = await import('../../textbook/learn-state.js');
    const now = Date.UTC(2026, 10, 15, 14);
    let s = addStudySeconds(emptyLearn(), 130, now);
    expect(goalToday(s, now).done).toBe(2);
    expect(dailyOf(s, now).l).toBe(0); expect(Object.keys(s.xp)).toHaveLength(0);
    s = addStudySeconds(s, 58 * 60, now);
    expect(goalToday(s, now).done).toBe(17); // 130 с + потолок 900 с
    expect(addStudySeconds(s, 0, now)).toBe(s);
    // сразу после полуночи в сегодняшний день идёт только время после неё
    const early = Date.UTC(2026, 10, 15, 0, 1);
    expect(dailyOf(addStudySeconds(emptyLearn(), 600, early), early).s).toBe(60);
  });
});
