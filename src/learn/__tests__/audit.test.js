/* Списание монет дюпа (docs/mechanics.md, «Защита монет»; решение владельца — docs/legal-todo.md, п. 16):
   честному ученику — ничего, ученику с дюпом — всё сверх верхней границы честного заработка; минус в кошельке
   закрывают откаченные покупки, с самых новых; на других устройствах вещь не возвращается. */
import { describe, it, expect, beforeEach } from 'vitest';
import { emptyLearn, normalizeLearn, mergeLearn, dayOf } from '../../textbook/learn-state.js';
import { earn, settle, resetCoinGuard, balance, earned, priceOf, OUTFITS, runCoins, indexed } from '../rewards.js';
import { dustClaim } from '../dust.js';
import { LESSONS } from '../course.js';
import { dupeFine, applyDupeAudit, coinCeiling, needsDupeAudit, DUPE_FINE } from '../audit.js';

const DAY = 86400000;
const T0 = Date.UTC(2026, 9, 1, 12);
// честный ученик: 40 дней подряд по два урока без ошибок, пять витрин в день, всё накопленное — через settle
function honest(days = 40) {
  let s = emptyLearn(); let k = 0;
  for (let d = 0; d < days; d += 1) {
    const now = T0 + d * DAY; const day = dayOf(now);
    for (let j = 0; j < 2; j += 1) {
      const l = LESSONS[k % LESSONS.length]; k += 1;
      s = { ...s, lessons: { ...s.lessons, [l.id]: { at: now, runs: 1, best: 100 } }, done: { ...s.done, [day]: (s.done[day] || 0) + 1 },
        xp: { ...s.xp, [day]: (s.xp[day] || 0) + 25 }, runs: { ...s.runs, started: s.runs.started + 1, finished: s.runs.finished + 1 } };
      s = earn(s, indexed(runCoins({ mode: 'lesson', accuracy: 100 }), now), `l:${l.id}`, now);
      s = settle(s, { lessonsDone: Object.keys(s.lessons).length }, now).s;
    }
    for (let v = 0; v < 5; v += 1) s = dustClaim(s, now);
  }
  return normalizeLearn(s);
}
const NOW = T0 + 40 * DAY;
const pricey = ['crown', 'medal', 'balloon'].map((id) => OUTFITS.find((o) => o.id === id));

describe('списание монет дюпа', () => {
  beforeEach(() => resetCoinGuard());
  it('честному ученику — ничего: заработанное не выше границы', () => {
    const s = honest();
    expect(earned(s)).toBeGreaterThan(1500);
    const c = coinCeiling(s, NOW, { bookFirst: 0 });
    expect(c.total).toBeGreaterThan(earned(s));
    expect(dupeFine(s, NOW, { bookFirst: 0 }).coins).toBe(0);
    // и с запасом: граница не больше чем вдвое выше заработанного — иначе дюп не виден
    expect(c.total).toBeLessThan(earned(s) * 2);
  });
  it('пока прогресса нет (новое устройство до синхронизации) — не считаем и не записываем', () => {
    const s = normalizeLearn(emptyLearn());
    expect(dupeFine(s, NOW)).toBeNull();
    expect(applyDupeAudit(s, NOW)).toBe(s);
  });
  it('дюп: «+255 монет · серия» за каждую операцию в лавке — списывается лишнее, не больше полученного по ошибке', () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    const s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 255 * 8 } });
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    expect(f.coins).toBeGreaterThan(255 * 8 * 0.5);
    expect(f.coins).toBeLessThanOrEqual(255 * 8);
    // кошелёк не ушёл в минус — вещи не трогаем
    expect(f.items).toEqual({});
    const t = normalizeLearn(applyDupeAudit(s, NOW, { bookFirst: 0 }));
    expect(balance(t)).toBe(balance(s) - f.coins);
    // второй раз — не списывается
    expect(needsDupeAudit(t)).toBe(false);
    expect(applyDupeAudit(t, NOW + DAY)).toBe(t);
  });
  it('минус в кошельке закрывают покупки на эти монеты — с самых новых; вещь снимается и не возвращается с другого устройства', () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    // получил по ошибке 4000 и всё потратил: три дорогие вещи, последняя — надета
    let s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 4000 } });
    const bought = pricey.map((o, i) => ({ id: o.id, at: NOW - (3 - i) * 3600000 }));
    const spentAll = balance(s);
    s = normalizeLearn({ ...s, owned: { ...s.owned, ...Object.fromEntries(bought.map((b) => [b.id, b.at])) }, spent: { ...s.spent, [day]: (s.spent[day] || 0) + spentAll },
      wear: { ...s.wear, [pricey[2].slot]: pricey[2].id, at: NOW } });
    expect(balance(s)).toBe(0);
    const before = s;
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    expect(f.coins).toBeGreaterThan(2000);
    // откатываются с самой новой, пока минус не закрыт
    const ids = Object.keys(f.items);
    expect(ids[0]).toBe(pricey[2].id);
    expect(f.refund).toBe(ids.reduce((a, id) => a + priceOf(id, dayOf(f.items[id])), 0));
    const t = normalizeLearn(applyDupeAudit(s, NOW, { bookFirst: 0 }));
    ids.forEach((id) => expect(t.owned[id], id).toBeUndefined());
    expect(t.wear[pricey[2].slot]).toBeNull();
    expect(balance(t)).toBe(Math.max(0, -f.coins + f.refund));
    // другое устройство ещё со старыми покупками и без записи списания: после слияния вещи не возвращаются
    const m = mergeLearn(before, t);
    ids.forEach((id) => expect(m.owned[id], id).toBeUndefined());
    expect(m.fines[DUPE_FINE]).toEqual(t.fines[DUPE_FINE]);
    // купили заново после списания — вещь остаётся
    const again = mergeLearn(m, { ...m, owned: { ...m.owned, [ids[0]]: NOW + DAY } });
    expect(again.owned[ids[0]]).toBe(NOW + DAY);
  });
  it('два устройства посчитали списание по-разному — остаётся более раннее', () => {
    const s = honest();
    const a = { ...s, fines: { [DUPE_FINE]: { at: NOW, coins: 500, refund: 0, items: {} } } };
    const b = { ...s, fines: { [DUPE_FINE]: { at: NOW + 1000, coins: 700, refund: 0, items: {} } } };
    expect(mergeLearn(a, b).fines[DUPE_FINE].coins).toBe(500);
    expect(mergeLearn(b, a).fines[DUPE_FINE].coins).toBe(500);
  });
});
