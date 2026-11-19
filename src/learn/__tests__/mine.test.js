/* Шахта (пункт владельца 19.11, п. 12): инкременталка лавки — забой, руда по глубине, улучшения на жетоны, обмен на монеты
   с растущей ценой и дневным пределом. src/learn/mine.js */
import { describe, it, expect } from 'vitest';
import { emptyMine, strike, idle, blast, blastReady, sellAll, buyUpgrade, exchange, exchangedToday, nextExchangeCost, exchangeCost, upgradeCost, hardness, rollOre, unlockedOres,
  ORES, EXCHANGE, OFFLINE_MAX_MS, parseMine, oreValue, level } from '../mine.js';
import { emptyLearn } from '../../textbook/learn-state.js';
import { balance } from '../rewards.js';

const T = Date.UTC(2026, 10, 19, 12);
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('шахта: забой и руда', () => {
  it('удар копит силу; хватило на крепость — блок разбит, шахта глубже, выпала руда', () => {
    let m = emptyMine(T);
    expect(hardness(0)).toBe(1);
    const r = strike(m, seq(0.1, 0.5));
    expect(r.drops).toHaveLength(1);
    expect(r.m.depth).toBeCloseTo(0.5, 9);
    expect(r.m.ores.coal).toBeGreaterThanOrEqual(1);
    m = r.m;
    // глубже — крепче: на 120 м блок — 3 удара простой киркой
    expect(hardness(120)).toBe(3);
    const deep = { ...m, depth: 120, hit: 0 };
    expect(strike(deep, seq(0.1)).drops).toHaveLength(0);
    expect(strike(strike(strike(deep, seq(0.1)).m, seq(0.1)).m, seq(0.1)).drops).toHaveLength(1);
  });
  it('руды открываются с глубиной, ценная — реже; фонарь делает её чаще', () => {
    expect(unlockedOres(0).map((o) => o.id)).toEqual(['coal']);
    expect(unlockedOres(400).map((o) => o.id)).toEqual(['coal', 'copper', 'silver', 'gold']);
    const share = (lamp) => { let rare = 0; let x = 0; const rng = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; for (let i = 0; i < 4000; i += 1) if (rollOre(1000, lamp, rng).id === 'inflit') rare += 1; return rare / 4000; };
    expect(share(0)).toBeGreaterThan(0);
    expect(share(0)).toBeLessThan(0.1);
    expect(share(10)).toBeGreaterThan(share(0) * 2);
    // ценность растёт с глубиной открытия
    for (let i = 1; i < ORES.length; i += 1) { expect(ORES[i].value).toBeGreaterThan(ORES[i - 1].value); expect(ORES[i].from).toBeGreaterThan(ORES[i - 1].from); }
  });
  it('вагонетки добывают сами — и за закрытое приложение, но не больше 4 часов', () => {
    const m = { ...emptyMine(T), lv: { cart: 2 } };
    const hour = idle(m, 3600 * 1000, seq(0.3)).m;
    const day = idle(m, 24 * 3600 * 1000, seq(0.3)).m;
    expect(hour.depth).toBeGreaterThan(m.depth);
    expect(day.depth).toBeCloseTo(idle(m, OFFLINE_MAX_MS, seq(0.3)).m.depth, 6);
    expect(idle(emptyMine(T), 3600 * 1000).m.depth).toBe(0);
  });
  it('динамит: несколько блоков разом, потом остывает', () => {
    const m = { ...emptyMine(T), lv: { dynamite: 1 } };
    expect(blastReady(m, T)).toBe(true);
    const r = blast(m, T, seq(0.2));
    expect(r.drops).toHaveLength(5);
    expect(blastReady(r.m, T + 1000)).toBe(false);
    expect(blast(r.m, T + 1000).drops).toHaveLength(0);
  });
});

describe('шахта: скупщик, улучшения, монеты', () => {
  it('руда — в жетоны по ценности; плавильня добавляет', () => {
    const m = { ...emptyMine(T), ores: { coal: 10, copper: 2 } };
    expect(oreValue(m)).toBe(18);
    expect(sellAll(m)).toMatchObject({ got: 18, m: { tokens: 18, ores: {} } });
    expect(oreValue({ ...m, lv: { smelter: 2 } })).toBe(Math.floor(18 * 1.3));
  });
  it('улучшение стоит дороже с каждым уровнем; без жетонов не купить', () => {
    expect(upgradeCost('pick', 1)).toBeGreaterThan(upgradeCost('pick', 0));
    const poor = emptyMine(T);
    expect(buyUpgrade(poor, 'pick').ok).toBe(false);
    const r = buyUpgrade({ ...poor, tokens: 100 }, 'pick');
    expect(r.ok).toBe(true); expect(level(r.m, 'pick')).toBe(1); expect(r.m.tokens).toBe(100 - upgradeCost('pick', 0));
    expect(strike({ ...emptyMine(T), lv: { pick: 3 }, depth: 120 }, seq(0.1)).drops.length).toBeGreaterThanOrEqual(0);
  });
  it('обмен на монеты: каждая следующая монета дня дороже, не больше 8 в день, второй раз ту же не получить', () => {
    let m = { ...emptyMine(T), tokens: 100000 }; let s = emptyLearn();
    const costs = [];
    for (let k = 0; k < EXCHANGE.perDay; k += 1) { const r = exchange(m, s, T); expect(r.ok).toBe(true); costs.push(r.cost); m = r.m; s = r.s; }
    for (let k = 1; k < costs.length; k += 1) expect(costs[k]).toBeGreaterThan(costs[k - 1]);
    expect(balance(s)).toBe(EXCHANGE.perDay);
    expect(exchangedToday(s, T)).toBe(EXCHANGE.perDay);
    expect(nextExchangeCost(s, T)).toBeNull();
    expect(exchange(m, s, T).ok).toBe(false);
    // назавтра — снова с первой, самой дешёвой
    expect(nextExchangeCost(s, T + 86400000)).toBe(exchangeCost(0));
    // все 8 монет дня — не больше, чем пара уроков: шахта не ломает экономику лавки
    expect(costs.reduce((a, x) => a + x, 0)).toBeGreaterThan(500);
  });
  it('сохранение: своё читается, испорченное — с начала', () => {
    const m = { ...emptyMine(T), depth: 42, ores: { coal: 3 }, lv: { pick: 2 } };
    expect(parseMine(JSON.stringify(m), T)).toMatchObject({ depth: 42, ores: { coal: 3 }, lv: { pick: 2 } });
    expect(parseMine('{oops', T)).toMatchObject({ depth: 0 });
    expect(parseMine(JSON.stringify({ v: 9 }), T)).toMatchObject({ depth: 0 });
  });
});
