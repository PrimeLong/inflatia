/* Терминал частного инвестора (пункт владельца 16.11, вечер: «сделай интерфейс частного инвестора не хуже, чем на фото» —
   свечной график с периодами, карточки цены, быстрые суммы сделки). Свечи — из настоящих цен игры, без выдуманных теней. */
import { describe, it, expect } from 'vitest';
import { quarterCandles, tickCandles, pushTick, noteExtreme, seenFor, priceRange, quickAmounts, change, sparkPath } from '../candles.js';

describe('свечи терминала', () => {
  const hist = [{ q: 0, label: 'I кв.', idx: 100 }, { q: 1, label: 'II кв.', idx: 104 }, { q: 2, label: 'III кв.', idx: 101 }];
  it('квартальная свеча открывается закрытием прошлого квартала; без живых котировок тени нет', () => {
    const k = quarterCandles(hist, 'idx');
    expect(k).toHaveLength(3);
    expect(k[0]).toMatchObject({ o: 100, c: 100, h: 100, l: 100 });
    expect(k[1]).toMatchObject({ o: 100, c: 104, h: 104, l: 100 });
    expect(k[2]).toMatchObject({ o: 104, c: 101, h: 104, l: 101 });
  });
  it('тени — из увиденных живых котировок квартала', () => {
    const seen = {};
    [103, 106, 99.5, 101].forEach((v) => noteExtreme(seen, 2, 'idx', v));
    const k = quarterCandles(hist, 'idx', seenFor(seen, 'idx'));
    expect(k[2]).toMatchObject({ o: 104, c: 101, h: 106, l: 99.5 });
  });
  it('свечи «Сейчас» — по per тиков, без разрывов; последняя ещё не закрыта', () => {
    const k = tickCandles([10, 11, 9, 10.5, 12, 11.8, 11.9], 3);
    expect(k).toHaveLength(3);
    expect(k[0]).toMatchObject({ o: 10, c: 9, h: 11, l: 9 });
    expect(k[1].o).toBe(9); expect(k[1].c).toBe(11.8); expect(k[1].h).toBe(12);
    expect(k[2].open).toBe(true);
  });
  it('лента тиков ограничена', () => {
    const t = {};
    for (let i = 0; i < 50; i += 1) pushTick(t, 'a', i, 20);
    expect(t.a).toHaveLength(20); expect(t.a[0]).toBe(30);
    pushTick(t, 'a', NaN, 20); expect(t.a).toHaveLength(20);
  });
  it('шкала цен включает свечи и среднюю цену входа, с полями', () => {
    const r = priceRange([{ h: 110, l: 100 }], [95]);
    expect(r.min).toBeLessThan(95); expect(r.max).toBeGreaterThan(110);
    const flat = priceRange([{ h: 50, l: 50 }]);
    expect(flat.max).toBeGreaterThan(flat.min);
  });
  it('быстрые суммы — круглые и меньше доступного', () => {
    expect(quickAmounts(10)).toEqual([0.5, 1, 2, 5]);
    expect(quickAmounts(30)).toEqual([2, 5, 10, 25]);
    expect(quickAmounts(0)).toEqual([]);
    quickAmounts(7300).forEach((v) => expect(v).toBeLessThan(7300));
  });
  it('изменение и спарклайн', () => {
    expect(change(100, 102).dir).toBe(1); expect(change(100, 99).dir).toBe(-1); expect(change(100, 100).dir).toBe(0);
    expect(change(100, 102).pct).toBeCloseTo(2, 9);
    expect(sparkPath([1], 50, 20)).toBe('');
    expect(sparkPath([1, 3, 2], 50, 20)).toMatch(/^M2\.0 18\.0 L25\.0 2\.0 L48\.0 10\.0$/);
  });
});
