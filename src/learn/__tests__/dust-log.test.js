/* «Журнал уборки» — третье улучшение «Пыльной витрины» (пункт владельца 21.11, п. 8: «нужно ещё улучшение витрины»).
   src/learn/dust.js */
import { describe, it, expect } from 'vitest';
import { LOG, hasLog, buyLog, buyCloth, buyPolish, dustClaim, dustLog, logStreak, logKey, logReturn, dustPerDay, logPaybackDays } from '../dust.js';
import { earn, balance } from '../rewards.js';
import { emptyLearn, dayOf } from '../../textbook/learn-state.js';
import { DAY_CEILING } from '../audit.js';
import { DUST, CLOTH, POLISH } from '../dust.js';

const D = 86400000; const T = Date.UTC(2026, 10, 21, 12);
const rich = () => earn(emptyLearn(), 500, 'seed', T);
const withAll = (now = T) => { let s = buyCloth(rich(), now).s; s = buyPolish(s, now).s; return buyLog(s, now).s; };
const wipeAll = (s, now) => { let t = s; for (let k = 0; k < dustPerDay(s); k += 1) t = dustLog(dustClaim(t, now), now); return t; };

describe('журнал уборки', () => {
  it('продаётся только после полироли; покупка — один раз', () => {
    expect(buyLog(rich(), T).ok).toBe(false);
    const s = withAll();
    expect(hasLog(s)).toBe(true);
    expect(buyLog(s, T).ok).toBe(false);
  });
  it('все витрины дня протёрты — бонус; не все — ничего; второй раз за день — ничего', () => {
    let s = withAll();
    s = dustLog(dustClaim(s, T), T);
    expect(s.claimed[logKey(dayOf(T))]).toBeUndefined();
    const before = balance(s);
    s = wipeAll(s, T);
    expect(balance(s) - before).toBe((dustPerDay(s) - 1) * DUST.coins + 1);
    expect(dustLog(s, T)).toBe(s);
  });
  it('серия дней растит бонус: 1, 2, 3, дальше 3; пропуск — снова с 1', () => {
    let s = withAll(T - 10 * D);
    const got = [];
    for (const day of [0, 1, 2, 3, 5]) {
      const now = T + day * D; const b0 = balance(s);
      s = wipeAll(s, now);
      got.push(balance(s) - b0 - dustPerDay(s) * DUST.coins);
    }
    expect(got).toEqual([1, 2, 3, 3, 1]);
    expect(logStreak(s, T + 5 * D)).toBe(1);
    expect(logReturn(s)).toBe(10);
  });
  it('окупается за разумный срок; проверка монет помнит про все улучшения витрины', () => {
    expect(logPaybackDays()).toBeLessThanOrEqual(LOG.price / LOG.max + 2);
    const dayMax = (DUST.perDay + CLOTH.extra) * DUST.coins + (DUST.perDay + CLOTH.extra) * POLISH.bonus + LOG.max;
    expect(DAY_CEILING).toBeGreaterThanOrEqual(dayMax);
  });
});
