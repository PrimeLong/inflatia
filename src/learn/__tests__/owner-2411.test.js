/* Пункты владельца и жалобы учеников 23–24.11.2026 — то, что проверяется без браузера. */
import { describe, it, expect } from 'vitest';
import { EXERCISES, instantiate, check, buildPractice, termKey, PRACTICE_PAD, canPractice } from '../course.js';
import { CHARTS } from '../../textbook/charts.js';
import { DRAWS } from '../draws.js';

const keyOf = (inst, text) => inst.tiles.find((t) => t.text === text).key;

describe('плитки «Базара»: равносильный порядок засчитывается (жалоба 24.11, tr-w:tiles:markup)', () => {
  it('наценка: «прибавка / в процентах / к тому, во что товар обходится» — верно; лишняя плитка — нет', () => {
    const inst = instantiate(EXERCISES['tr-w:tiles:markup'], () => 0.5);
    const a = keyOf(inst, 'прибавка'); const b = keyOf(inst, 'к тому, во что товар обходится,'); const c = keyOf(inst, 'в процентах');
    expect(check(inst, [a, b, c]).ok).toBe(true);
    expect(check(inst, [a, c, b]).ok).toBe(true);
    expect(check(inst, [b, a, c]).ok).toBe(false);
  });
  it('бартер: «обмен / без денег / товара на товар» — тоже верно', () => {
    const inst = instantiate(EXERCISES['tr-w:tiles:barter'], () => 0.5);
    const k = (t) => keyOf(inst, t);
    expect(check(inst, [k('обмен'), k('без денег'), k('товара на товар')]).ok).toBe(true);
    expect(check(inst, [k('без денег'), k('обмен'), k('товара на товар')]).ok).toBe(false);
  });
});

describe('«Повторить ошибки» (пункты 24.11: 4, 10; жалоба 23.11, pr-w)', () => {
  it('один термин — один вопрос за повторение: «Какой это термин» и плитки того же слова вместе не идут', () => {
    const which = Object.keys(EXERCISES).find((id) => /^pr-w:which:/.test(id));
    const term = which.split(':').pop();
    const tiles = `pr-w:tiles:${term}`;
    const ids = EXERCISES[tiles] ? [which, tiles] : [which, which];
    for (let s = 1; s < 20; s += 1) {
      const { items } = buildPractice(ids, () => (s * 0.37) % 1);
      const keys = items.map((i) => termKey(i.of || i.id));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it('одна ошибка — не урок из одной карточки: добор заданиями того же урока', () => {
    const one = Object.keys(EXERCISES).find((id) => id.startsWith('tr-') && EXERCISES[id].lesson === 'tr-l1' && canPractice(id));
    expect(one).toBeTruthy();
    expect(buildPractice([one]).items.length).toBeGreaterThanOrEqual(PRACTICE_PAD);
  });
});

describe('график «Где выгоднее покупать» (жалоба 24.11, plane: точка «одинаково» пропадала)', () => {
  const build = (v) => CHARTS.shops.build({}, v);
  it('пересечение ровно на краю (1500 / (1200 − 1050) = 10 кг) — точка есть', () => {
    const sc = build({ f: 1500, pa: 1200, pb: 1050 });
    const p = sc.points.find((x) => x.label === 'одинаково');
    expect(p).toBeTruthy();
    expect(p.x).toBeCloseTo(10);
    expect(sc.readout[0].value).toBe('10 кг');
  });
  it('пересечение дальше 10 кг — ось растягивается, точка видна', () => {
    const sc = build({ f: 1500, pa: 1200, pb: 1100 });
    expect(sc.xDomain[1]).toBeGreaterThanOrEqual(15);
    expect(sc.points.find((x) => x.label === 'одинаково').x).toBeCloseTo(15);
  });
  it('обычные числа урока — ось та же, 0…10 кг', () => {
    expect(build({ f: 1500, pa: 1200, pb: 900 }).xDomain).toEqual([0, 10]);
    expect(build({ f: 2100, pa: 1200, pb: 900 }).xDomain).toEqual([0, 10]);
  });
});

describe('«Нарисуй сам: Где выгоднее покупать», шаг 4 (жалоба 24.11: «не понимаю, как выполнять»)', () => {
  it('условие говорит, что искать и куда коснуться; подсказка даёт расчёт до точки', () => {
    const t = DRAWS.find((d) => d.id === 'draw-prices').tasks[3];
    expect(t.text).toMatch(/пересекаются/);
    expect(t.text).toMatch(/коснитесь/);
    expect(t.hint).toMatch(/7 кг/);
  });
});
