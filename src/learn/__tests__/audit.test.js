/* Списание монет дюпа (docs/mechanics.md, «Защита монет»; решение владельца — docs/legal-todo.md, п. 16):
   честному ученику — ничего, ученику с дюпом — всё сверх верхней границы честного заработка; минус в кошельке
   закрывают откаченные покупки, с самых новых; на других устройствах вещь не возвращается. */
import { describe, it, expect, beforeEach } from 'vitest';
import { emptyLearn, normalizeLearn, mergeLearn, dayOf } from '../../textbook/learn-state.js';
import { earn, settle, resetCoinGuard, balance, earned, priceOf, OUTFITS, runCoins, indexed, walletRaw, piggyPut, piggyState } from '../rewards.js';
import { notificationsOf } from '../notify.js';
import { dustClaim } from '../dust.js';
import { LESSONS } from '../course.js';
import { dupeFine, applyDupeAudit, coinCeiling, needsDupeAudit, needsPiggyPass, needsForgive, DUPE_FINE, DUPE_PIGGY, DUPE_FORGIVE } from '../audit.js';

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

  // монеты дюпа переложены в копилку (пункт владельца от 8 ноября 2026: «то, что было в копилке, не откатило»)
  const withPiggy = () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    let s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 4000 } });
    // одна вещь куплена, всё остальное — в копилку
    const item = pricey[0]; const at = NOW - 5 * 3600000;
    s = normalizeLearn({ ...s, owned: { ...s.owned, [item.id]: at }, spent: { ...s.spent, [day]: (s.spent[day] || 0) + priceOf(item.id, dayOf(at)) } });
    const deposit = balance(s); const depAt = NOW - 3600000;
    const put = piggyPut(s, deposit, depAt);
    expect(put.ok).toBe(true);
    return { s: normalizeLearn(put.s), item, at, deposit, depAt };
  };
  it('монеты дюпа в копилке: вклад закрывается досрочно и покрывает минус раньше покупок', () => {
    const { s, item, at, deposit, depAt } = withPiggy();
    expect(balance(s)).toBe(0);
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    expect(f.coins).toBeGreaterThan(2000);
    expect(deposit).toBeGreaterThanOrEqual(f.coins);
    // вклад покрыл весь минус — вещь остаётся
    expect(f.piggy).toEqual({ at: depAt, n: f.coins });
    expect(f.items).toEqual({});
    const t = normalizeLearn(applyDupeAudit(s, NOW, { bookFirst: 0 }));
    expect(t.fines[DUPE_FINE].piggy).toEqual(f.piggy);
    expect(piggyState(t, NOW)).toBeNull();
    expect(t.owned[item.id]).toBe(at);
    // вложенное — на минус, остаток — в кошелёк; процент сгорел
    expect(balance(t)).toBe(deposit - f.coins);
    expect(needsPiggyPass(t)).toBe(false);
    expect(notificationsOf(t, NOW).find((n) => n.id === `fine:${DUPE_FINE}`).text).toContain(`Вклад в копилке закрыт: ${f.coins}`);
  });
  it('второй проход: списание прошло, когда копилку не трогали, — вклад с монетами дюпа закрывается, один раз и на всех устройствах', () => {
    const { s, deposit, depAt } = withPiggy();
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    // старое списание: без копилки — кошелёк показывал 0, минус прятал вклад
    const old = normalizeLearn({ ...s, fines: { [DUPE_FINE]: { at: NOW, coins: f.coins, refund: 0, items: {} } } });
    expect(balance(old)).toBe(0);
    expect(walletRaw(old)).toBe(-f.coins);
    expect(piggyState(old, NOW + DAY)).toBeTruthy();
    expect(needsPiggyPass(old)).toBe(true);
    const t = normalizeLearn(applyDupeAudit(old, NOW + DAY, { bookFirst: 0 }));
    expect(t.fines[DUPE_FINE]).toEqual(old.fines[DUPE_FINE]);
    expect(t.fines[DUPE_PIGGY]).toMatchObject({ at: NOW + DAY, coins: 0, refund: 0, items: {}, piggy: { at: depAt, n: f.coins } });
    expect(piggyState(t, NOW + DAY)).toBeNull();
    expect(balance(t)).toBe(deposit - f.coins);
    // второй раз — ничего
    expect(applyDupeAudit(t, NOW + 2 * DAY)).toBe(t);
    // ученику — честно, что и почему
    const n = notificationsOf(t, NOW + DAY).find((x) => x.id === `fine:${DUPE_PIGGY}`);
    expect(n.text).toContain(`Вклад закрыт: ${f.coins}`);
    expect(n.go).toBe('piggy');
    // другое устройство ещё с открытым вкладом: после слияния вклад закрыт, запись одна
    const m = mergeLearn(old, t);
    expect(piggyState(m, NOW + DAY)).toBeNull();
    expect(m.fines[DUPE_PIGGY]).toEqual(t.fines[DUPE_PIGGY]);
    expect(balance(m)).toBe(balance(t));
  });
  it('второй проход без копилки: минус закрывают ещё не откаченные покупки', () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    let s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 4000 } });
    const bought = pricey.map((o, i) => ({ id: o.id, at: NOW - (3 - i) * 3600000 }));
    s = normalizeLearn({ ...s, owned: { ...s.owned, ...Object.fromEntries(bought.map((b) => [b.id, b.at])) }, spent: { ...s.spent, [day]: (s.spent[day] || 0) + balance(s) } });
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    // старое списание откатило только самую новую вещь, а минус остался
    const old = normalizeLearn({ ...s, fines: { [DUPE_FINE]: { at: NOW, coins: f.coins, refund: priceOf(bought[2].id, dayOf(bought[2].at)), items: { [bought[2].id]: bought[2].at } } } });
    expect(old.owned[bought[2].id]).toBeUndefined();
    expect(walletRaw(old)).toBeLessThan(0);
    const t = normalizeLearn(applyDupeAudit(old, NOW + DAY, { bookFirst: 0 }));
    const p = t.fines[DUPE_PIGGY];
    expect(p.piggy).toBeUndefined();
    expect(Object.keys(p.items)).not.toContain(bought[2].id);
    expect(Object.keys(p.items).length).toBeGreaterThan(0);
    Object.keys(p.items).forEach((id) => expect(t.owned[id], id).toBeUndefined());
  });

  /* «долга нет» (пункт владельца 08.11, вечер: «продал весь урожай, а денег не хватило даже на семена»): остаток минуса,
     который не покрыли ни копилка, ни покупки, прощается, и заработанное после списания — в кошельке */
  it('минус после списания прощается: выручка за урожай после дня списания — в кошельке, а не в скрытом долге', () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    // дюп потрачен на то, что не откатить (подарков и покупок нет): кошелёк пуст
    let s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 4000 } });
    s = normalizeLearn({ ...s, spent: { ...s.spent, [day]: (s.spent[day] || 0) + balance(s) } });
    const f = dupeFine(s, NOW, { bookFirst: 0 });
    // старое списание (до этого правила): минус остался, его прятал ноль кошелька
    const old = normalizeLearn({ ...s, fines: { [DUPE_FINE]: { ...f, items: {}, refund: 0 } } });
    expect(walletRaw(old)).toBeLessThan(0);
    // на следующий день продан урожай — 300 монет, а кошелёк по-прежнему 0
    const sold = normalizeLearn({ ...old, coins: { ...old.coins, [dayOf(NOW + DAY)]: 300 } });
    expect(balance(sold)).toBe(0);
    expect(needsForgive(sold)).toBe(true);
    const t = normalizeLearn(applyDupeAudit(sold, NOW + DAY + 3600000, { bookFirst: 0 }));
    expect(t.fines[DUPE_FORGIVE]).toMatchObject({ coins: 0, items: {} });
    expect(balance(t)).toBe(300);
    // один раз
    expect(needsForgive(t)).toBe(false);
    expect(applyDupeAudit(t, NOW + 2 * DAY)).toBe(t);
    expect(notificationsOf(t, NOW + DAY + 3600000).find((n) => n.id === `fine:${DUPE_FORGIVE}`).title).toBe('Минус после списания прощён');
  });
  it('списание только что прошло и минус остался — прощается ровно остаток: кошелёк 0, дальше новый доход целиком в кошельке', () => {
    const s0 = honest();
    const day = dayOf(NOW - DAY);
    let s = normalizeLearn({ ...s0, coins: { ...s0.coins, [day]: s0.coins[day] + 4000 } });
    s = normalizeLearn({ ...s, spent: { ...s.spent, [day]: (s.spent[day] || 0) + balance(s) } });
    const t = normalizeLearn(applyDupeAudit(s, NOW, { bookFirst: 0 }));
    expect(t.fines[DUPE_FINE].coins).toBeGreaterThan(2000);
    expect(walletRaw(t)).toBe(0);
    const later = normalizeLearn({ ...t, coins: { ...t.coins, [dayOf(NOW + DAY)]: 120 } });
    expect(balance(later)).toBe(120);
  });
});
