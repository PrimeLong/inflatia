// Экономика наград (docs/mechanics.md): цены от заработка курса, «≈ N уроков», опыт и монеты, копилка
import { describe, it, expect } from 'vitest';
import {
  COIN, OUTFITS, FREEZE, BOOST, ACHIEVEMENTS, RATE_MAX, PATH_LESSONS, courseIncome, incomePerLesson, forgone,
  rateOn, PIGGY, PIGGY_YEARLY, REAL_RATE, realCurve, yearGrowth,
} from '../rewards.js';
import { XP, lessonXp, addDays } from '../../textbook/learn-state.js';
import { LESSONS } from '../course.js';

const ALL = [...OUTFITS, FREEZE, BOOST];
const maxPrice = () => Math.ceil(Math.max(...ALL.map((o) => o.crowns)) * RATE_MAX);

describe('цены лавки — от заработка курса', () => {
  const inc = courseIncome();
  it('заработок курса считается из уроков Пути (сейчас 114) и складывается из частей', () => {
    expect(PATH_LESSONS).toBe(LESSONS.length);
    expect(PATH_LESSONS).toBe(114);
    const { total, days, ...parts } = inc;
    expect(total).toBe(Object.values(parts).reduce((a, b) => a + b, 0));
    expect(parts.lessons).toBe(PATH_LESSONS * COIN.lesson);
    expect(days).toBe(PATH_LESSONS / 2);
  });
  it('самая дорогая вещь — не больше 70% заработка курса даже по худшему курсу', () => {
    expect(maxPrice()).toBeLessThanOrEqual(0.7 * inc.total);
    // и по любому курсу последних двух месяцев
    for (let k = 0; k < 60; k += 1) expect(rateOn(addDays('2026-10-01', k))).toBeLessThanOrEqual(RATE_MAX);
  });
  it('«≈ N уроков» никогда не больше числа уроков на Пути', () => {
    ALL.forEach((o) => {
      const price = Math.ceil(o.crowns * RATE_MAX);
      expect(forgone(price).lessons, o.id).toBeLessThanOrEqual(PATH_LESSONS);
      expect(forgone(price).lessons, o.id).toBeGreaterThanOrEqual(1);
    });
    expect(forgone(10 ** 6).lessons).toBe(PATH_LESSONS);
    expect(forgone(incomePerLesson() * 3).text).toBe('≈ 3 урока');
  });
  it('обычные вещи дешевле редких; страховка серии — пара уроков', () => {
    const plain = OUTFITS.filter((o) => !o.rare).map((o) => o.crowns);
    const rare = OUTFITS.filter((o) => o.rare).map((o) => o.crowns);
    expect(Math.max(...plain)).toBeLessThan(Math.min(...rare));
    expect(FREEZE.crowns).toBeLessThanOrEqual(3 * COIN.lesson);
  });
});

describe('опыт и монеты', () => {
  it('опыт — только за работу в уроке: 2 за верный с первой попытки и 5 за финиш', () => {
    expect(XP).toMatchObject({ correct: 2, finish: 5 });
    expect(lessonXp({ firstTry: 10 })).toBe(25);
    expect(lessonXp({ firstTry: 10, diamond: true })).toBe(38);
    expect(lessonXp({ firstTry: 10, replay: true })).toBe(3);
    // печати опыта не дают
    ACHIEVEMENTS.forEach((a) => expect(a.xp, a.id).toBeUndefined());
  });
  it('печать стоит целое число уроков: монеты кратны цене урока', () => {
    ACHIEVEMENTS.forEach((a) => expect(a.coins % COIN.lesson, `${a.id}: ${a.coins}`).toBe(0));
  });
});

describe('копилка: честно про проценты', () => {
  it('2% в день — это 730% годовых простыми и рост примерно в 1400 раз со сложным; обычные для вклада 8% — 1000 крон за 10 лет чуть больше чем вдвое', () => {
    expect(PIGGY.rate).toBe(0.02);
    expect(PIGGY_YEARLY).toBe(730);
    // копилка начисляет сложный процент: 1,02^365 ≈ 1377 — «примерно в 1400 раз»
    expect(yearGrowth(0.02)).toBe(1400);
    expect(yearGrowth(0.015)).toBe(230);
    expect(yearGrowth(0.005)).toBe(6.2);
    expect(REAL_RATE).toBe(0.08);
    const c = realCurve();
    expect(c).toHaveLength(11);
    expect(c[0].value).toBe(1000);
    expect(c[10].value).toBe(2159);
  });
});

describe('инфляция в Лавке (docs/mechanics.md, «Лавка»)', async () => {
  const { monthInflation, priceIndex, priceIndexCap, crownsOn, inflationInfo, priceOf, INFL } = await import('../rewards.js');
  const months = Array.from({ length: 120 }, (_, k) => { const y = 2026 + Math.floor((10 + k) / 12); const m = ((10 + k) % 12) + 1; return `${y}-${String(m).padStart(2, '0')}`; });
  it('инфляция месяца — 0,6–1,8%, до десятой процента, одна у всех; до ноября 2026 — нет', () => {
    expect(INFL.base).toBe('2026-10');
    expect(monthInflation('2026-10')).toBe(0);
    expect(monthInflation('2026-09')).toBe(0);
    months.forEach((m) => {
      const r = monthInflation(m);
      expect(r).toBeGreaterThanOrEqual(0.006);
      expect(r).toBeLessThanOrEqual(0.018);
      expect(Math.round(r * 1000)).toBeCloseTo(r * 1000, 9);
      expect(monthInflation(m)).toBe(r);
    });
    // месяцы не одинаковые
    expect(new Set(months.slice(0, 12).map(monthInflation)).size).toBeGreaterThan(4);
  });
  it('индекс цен — произведение инфляций с октября 2026; цена в кронах и в монетах — от него', () => {
    expect(priceIndex('2026-10-20')).toBe(1);
    expect(priceIndex('2026-11-03')).toBeCloseTo(1 + monthInflation('2026-11'), 12);
    expect(priceIndex('2026-12-01')).toBeCloseTo((1 + monthInflation('2026-11')) * (1 + monthInflation('2026-12')), 12);
    expect(crownsOn('tophat', '2026-10-20')).toBe(OUTFITS.find((o) => o.id === 'tophat').crowns);
    const day = '2027-03-15';
    expect(crownsOn('tophat', day)).toBe(Math.round(140 * priceIndex(day)));
    expect(priceOf('tophat', day)).toBe(Math.ceil(crownsOn('tophat', day) * rateOn(day)));
    expect(crownsOn('tophat', day)).toBeGreaterThan(140);
  });
  it('предел: и через десять лет самая дорогая вещь по худшему курсу — не больше 70% заработка курса', () => {
    expect(priceIndexCap()).toBeGreaterThan(1);
    months.forEach((m) => {
      const day = `${m}-15`;
      OUTFITS.filter((o) => !o.reward).forEach((o) => expect(crownsOn(o.id, day) * RATE_MAX, `${o.id} ${m}`).toBeLessThanOrEqual(0.7 * courseIncome().total));
    });
    const late = inflationInfo('2036-06-15');
    expect(late.capped).toBe(true);
    expect(late.since).toBeCloseTo(priceIndexCap() - 1, 12);
    const now = inflationInfo('2026-11-03');
    expect(now).toMatchObject({ month: '2026-11', rate: monthInflation('2026-11'), capped: false });
    expect(now.since).toBeCloseTo(monthInflation('2026-11'), 12);
  });
});
