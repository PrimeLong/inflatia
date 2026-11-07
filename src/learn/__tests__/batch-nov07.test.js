/* Пункты владельца от 6 ноября 2026 и жалобы учеников — проверки правил (docs/mechanics.md). */
import { describe, it, expect } from 'vitest';

describe('индексация наград: каждый месяц — на инфляцию Лавки прошлого месяца', () => {
  it('в ноябре 2026 индекс 1; в декабре — инфляция ноября; в январе — ноября и декабря', async () => {
    const { rewardIndex, indexedOn, monthInflation, priceIndex, priceIndexCap } = await import('../rewards.js');
    expect(rewardIndex('2026-11-07')).toBe(1);
    expect(indexedOn(15, '2026-11-30')).toBe(15);
    const nov = monthInflation('2026-11'); const dec = monthInflation('2026-12');
    expect(nov).toBeGreaterThan(0);
    expect(rewardIndex('2026-12-01')).toBeCloseTo(Math.min(1 + nov, priceIndexCap()), 10);
    expect(rewardIndex('2027-01-15')).toBeCloseTo(Math.min((1 + nov) * (1 + dec), priceIndexCap()), 10);
    // индекс наград месяца — индекс цен прошлого месяца: награды отстают от цен ровно на месяц
    expect(rewardIndex('2027-03-10')).toBe(priceIndex('2027-02-01'));
    expect(indexedOn(200, '2027-01-15')).toBe(Math.round(200 * rewardIndex('2027-01-15')));
    // нули и отрицательное не трогаем; округление до целой монеты
    expect(indexedOn(0, '2027-06-01')).toBe(0);
    expect(Number.isInteger(indexedOn(13, '2027-06-01'))).toBe(true);
  });
  it('предел — тот же, что у цен: награды не обгоняют цены', async () => {
    const { rewardIndex, priceIndex } = await import('../rewards.js');
    for (const day of ['2027-06-01', '2028-01-01', '2030-12-31']) expect(rewardIndex(day)).toBeLessThanOrEqual(priceIndex(day));
  });
  it('выплаты вне урока (цель дня, серия, задания) — уже с индексацией', async () => {
    const { emptyLearn, dayOf } = await import('../../textbook/learn-state.js');
    const { settle, resetCoinGuard, goalCoins, indexed, STREAK_BONUS } = await import('../rewards.js');
    resetCoinGuard();
    const now = Date.UTC(2027, 1, 10, 12);
    const day = dayOf(now);
    const s = { ...emptyLearn(), minutes: { [day]: 30 }, done: { [day]: 2 }, xp: { [day]: 40 } };
    const { gains } = settle(s, {}, now);
    const goal = gains.find((g) => g.kind === 'goal');
    if (goal) expect(goal.coins).toBe(indexed(goalCoins(10), now));
    gains.forEach((g) => expect(Number.isInteger(g.coins)).toBe(true));
    // бонус серии 30 дней (200) в феврале 2027 — больше 200
    expect(indexed(STREAK_BONUS[3][1], now)).toBeGreaterThan(200);
  });
  it('сундук юнита, лига и забег: сумма по месяцу события, забрать позже — та же', async () => {
    const { emptyLearn } = await import('../../textbook/learn-state.js');
    const { openChest, chestCoins, indexedOn, balance } = await import('../rewards.js');
    const { weekPrize, placeCoins } = await import('../league.js');
    const { raceCoins } = await import('../friends.js');
    const now = Date.UTC(2027, 3, 2, 12);
    const unit = 'supply-demand';
    expect(balance(openChest(emptyLearn(), unit, now))).toBe(indexedOn(chestCoins(unit), '2027-04-02'));
    // неделя 2027-03-29 заканчивается в апреле — индекс апреля
    expect(weekPrize('silver', 1, '2027-03-29')).toBe(indexedOn(placeCoins('silver', 1), '2027-04-03'));
    expect(weekPrize('bronze', 1, '2026-11-02')).toBe(placeCoins('bronze', 1));
    const v = { result: 'won', end: '2027-01-20', my: 10 };
    expect(raceCoins(v)).toBe(indexedOn(40, '2027-01-20'));
    expect(raceCoins({ ...v, end: undefined })).toBe(40);
  });
});
