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

describe('«Повторение» — и задания прошлых юнитов (пункт 5 от 06.11)', () => {
  const seeded = (seed) => { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
  it('в первом юните Пути прошлых нет; дальше — до трёх из прошлых юнитов, с меткой past', async () => {
    const { UNITS, UNIT_BY_ID, EXERCISES, buildLesson, PAST_IN_REVIEW } = await import('../course.js');
    const withLessons = UNITS.filter((u) => u.lessons.length);
    const first = withLessons[0].lessons.find((l) => l.kind === 'review');
    expect(buildLesson(first.id, seeded(1)).items.filter((it) => it.past)).toEqual([]);
    const later = withLessons.slice(1).map((u) => u.lessons.find((l) => l.kind === 'review')).filter(Boolean);
    expect(later.length).toBeGreaterThan(3);
    for (const rev of later) {
      const k = UNITS.findIndex((u) => u.id === rev.unitId);
      const before = new Set(UNITS.slice(0, k).map((u) => u.id));
      for (let s = 1; s <= 4; s += 1) {
        const { items } = buildLesson(rev.id, seeded(s));
        const past = items.filter((it) => it.past);
        expect(past.length, rev.id).toBe(PAST_IN_REVIEW);
        past.forEach((it) => { expect(before.has(it.past), `${rev.id}: ${it.past}`).toBe(true); expect(it.review).toBe(true); expect(EXERCISES[it.of || it.id] ? EXERCISES[it.of || it.id].unitId : it.past).not.toBe(rev.unitId); });
        // своих — по-прежнему большинство, урок не длиннее 15 заданий
        expect(items.length - past.length).toBeGreaterThanOrEqual(9);
        expect(items.length).toBeLessThanOrEqual(15);
      }
      expect(UNIT_BY_ID[rev.unitId]).toBeTruthy();
    }
  });
  it('ошибки прошлых юнитов — первыми; задания — с разных юнитов, пока хватает', async () => {
    const { UNITS, EXERCISES, pastForReview, PAST_IN_REVIEW } = await import('../course.js');
    const withLessons = UNITS.filter((u) => u.lessons.length);
    const unit = withLessons[3];
    const before = withLessons.slice(0, 3);
    const wrong = Object.values(EXERCISES).find((e) => e.unitId === before[1].id && e.kind === 'choice' && !e.diamond);
    for (let s = 1; s <= 5; s += 1) {
      const got = pastForReview(unit, seeded(s), { mistakes: [wrong.id] });
      expect(got).toHaveLength(PAST_IN_REVIEW);
      expect(got.map((e) => e.id)).toContain(wrong.id);
      expect(new Set(got.map((e) => e.unitId)).size).toBe(3);
    }
    // уже решённое прошлое — раньше невиденного
    const seenOne = Object.values(EXERCISES).find((e) => e.unitId === before[0].id && e.kind === 'choice' && !e.diamond);
    for (let s = 1; s <= 5; s += 1) expect(pastForReview(unit, seeded(s), { seen: { [seenOne.id]: 1 } }).map((e) => e.id)).toContain(seenOne.id);
  });
});

describe('уведомления: «Ранее» — последние три прочитанных (пункт 7 от 06.11)', () => {
  it('свежее сверху, не больше трёх; прошедшее событие остаётся снимком; новые и смахнутые — не в «Ранее»', async () => {
    const { earlierOf, EARLIER_MAX } = await import('../notify.js');
    const H = 3600000; const now = Date.UTC(2026, 10, 7, 12);
    const n = (id, h) => ({ id, kind: 'league', icon: 'trophy', tone: '#000', title: id, text: '', at: now - h * H, go: 'league' });
    // выпуск новостей 2 ноября — старый; обгон в лиге час назад — его в расчёте уже нет, он только в снимках
    const list = [n('news:nov02', 120), n('goal:today', 2), n('ripe:1', 5), n('lg-down', 0.5), n('streak:today', 0.2)];
    const history = [n('lg-pass:old', 1), n('news:nov02', 120)];
    const seen = { 'news:nov02': 1, 'goal:today': 1, 'ripe:1': 1, 'lg-down': 1 };
    const got = earlierOf(list, history, seen, { 'lg-down': 1 });
    expect(EARLIER_MAX).toBe(3);
    expect(got.map((x) => x.id)).toEqual(['lg-pass:old', 'goal:today', 'ripe:1']);
    // непрочитанное («Новые») в «Ранее» не попадает
    expect(got.some((x) => x.id === 'streak:today')).toBe(false);
  });
});

describe('сад: растения не одинаковые (пункт 12 от 06.11)', () => {
  it('рост 0,84–1,16, наклон до 5°, сторона — от момента посадки; у соседних — разные', async () => {
    const { plantLook } = await import('../garden.js');
    const t0 = Date.UTC(2026, 10, 6, 10);
    const looks = Array.from({ length: 30 }, (_, i) => plantLook(t0 + i * 61000));
    looks.forEach((l) => { expect(l.k).toBeGreaterThanOrEqual(0.84); expect(l.k).toBeLessThanOrEqual(1.16); expect(Math.abs(l.tilt)).toBeLessThanOrEqual(5); expect([-1, 1]).toContain(l.flip); });
    expect(plantLook(t0)).toEqual(plantLook(t0));
    expect(new Set(looks.map((l) => l.k)).size).toBeGreaterThan(15);
    expect(Math.max(...looks.map((l) => l.k)) - Math.min(...looks.map((l) => l.k))).toBeGreaterThan(0.2);
    expect(new Set(looks.map((l) => l.flip)).size).toBe(2);
  });
});
