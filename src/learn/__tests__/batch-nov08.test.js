/* Пункты владельца от 8 ноября 2026 — проверки правил (docs/mechanics.md). */
import { describe, it, expect } from 'vitest';
import { emptyLearn, recordAttempt, mergeLearn, normalizeLearn, syncStreak, streakNow, dailyOf } from '../../textbook/learn-state.js';

const at = (h, m = 0) => new Date(Date.UTC(2026, 10, 8, h, m)).getTime();

describe('серия и параллельный урок на двух устройствах', () => {
  it('сценарий владельца: на телефоне ошибка и один верный, на ПК урок продолжили позже — серия не сохраняется', () => {
    // общий прогресс: серия 5, оба устройства его получили
    let base = emptyLearn();
    for (let i = 0; i < 5; i += 1) base = recordAttempt(base, 'choice', true, 1000, { now: at(10, i) });
    expect(streakNow(base, at(10, 5))).toBe(5);
    // телефон: ошибка, вышел, прошёл ещё одну карточку
    let phone = recordAttempt(base, 'choice', false, 1000, { now: at(10, 10) });
    phone = recordAttempt(phone, 'choice', true, 1000, { now: at(10, 11) });
    expect(streakNow(phone, at(10, 11))).toBe(1);
    // ПК не знал об ошибке: ответил позже — серия 6
    let pc = recordAttempt(base, 'choice', true, 1000, { now: at(10, 20) });
    pc = syncStreak(pc, 6, at(10, 20));
    expect(streakNow(pc, at(10, 20))).toBe(6);
    // слияние в любом порядке — серия телефона (обнулённая позже начала серии ПК), а не «последний ответ»
    const m1 = mergeLearn(pc, phone); const m2 = mergeLearn(phone, pc);
    expect(m1.run).toEqual(m2.run);
    expect(m1.run.n).toBe(1);
    // сегодняшняя часть серии (задание дня) — тоже не больше серии; лучшая за день остаётся
    expect(dailyOf(m1, at(10, 30)).rc).toBe(1);
    expect(dailyOf(m1, at(10, 30)).r).toBe(6);
    // следующий верный на ПК — 2, а не 7
    expect(streakNow(recordAttempt(m1, 'choice', true, 1000, { now: at(10, 31) }), at(10, 31))).toBe(2);
  });
  it('без ошибок слияние прежнее: побеждает более поздняя серия; запись без обнулений — { n, at }', () => {
    let a = emptyLearn();
    a = recordAttempt(a, 'choice', true, 1000, { now: at(9) });
    let b = recordAttempt(a, 'choice', true, 1000, { now: at(9, 5) });
    b = recordAttempt(b, 'choice', true, 1000, { now: at(9, 6) });
    expect(b.run).toEqual({ n: 3, at: at(9, 6) });
    expect(mergeLearn(a, b).run).toEqual({ n: 3, at: at(9, 6) });
  });
  it('время обнуления переживает сохранение и обновляется только при новом обнулении', () => {
    let s = recordAttempt(emptyLearn(), 'choice', true, 1000, { now: at(8) });
    s = recordAttempt(s, 'choice', false, 1000, { now: at(8, 1) });
    expect(s.run).toEqual({ n: 0, at: at(8, 1), z: at(8, 1) });
    // ещё ошибка подряд — серия и так 0: время обнуления то же
    s = recordAttempt(s, 'choice', false, 1000, { now: at(8, 2) });
    expect(s.run.z).toBe(at(8, 1));
    s = recordAttempt(s, 'choice', true, 1000, { now: at(8, 3) });
    expect(s.run).toEqual({ n: 1, at: at(8, 3), z: at(8, 1) });
    expect(normalizeLearn(JSON.parse(JSON.stringify(s))).run).toEqual(s.run);
    // молния урока погасла на повторе — то же обнуление
    const t = syncStreak(s, 0, at(8, 4));
    expect(t.run).toEqual({ n: 0, at: at(8, 4), z: at(8, 4) });
  });
});
