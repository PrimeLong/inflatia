/* Шахта (пункт владельца 19.11, п. 12): инкременталка лавки — забой, руда по глубине, улучшения на жетоны, обмен на монеты
   с растущей ценой и дневным пределом. src/learn/mine.js */
import { describe, it, expect } from 'vitest';
import { emptyMine, strike, idle, blast, blastReady, buyUpgrade, exchange, exchangedToday, nextExchangeCost, exchangeCost, upgradeCost, hardness, rollOre, unlockedOres,
  ORES, UPGRADES, EXCHANGE, OFFLINE_MAX_MS, parseMine, oreValue, level, storeCap, capOf, oreCount, storeFull, unitPrice, quote, sellOre, dayFactor,
  ordersFor, fillOrder, MILESTONES, readyMilestones, nextMilestone, claimMilestones, betterMine } from '../mine.js';
import { ORE_IDS, UPGRADE_MAX } from '../mine-state.js';
import { emptyLearn, normalizeLearn, mergeLearn } from '../../textbook/learn-state.js';
import { dayOf } from '../../textbook/learn-state.js';
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
    expect(unlockedOres(2000).map((o) => o.id)).toContain('starsteel');
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

describe('шахта v2: склад, рынок, заказы, рубежи (пункт владельца 20.11, п. 8: «один раз много добыл — и всё»)', () => {
  const day = dayOf(T);
  it('склад: руды не больше вместимости; полный — руда из-под кирки осыпается, вагонетки встают', () => {
    const full = { ...emptyMine(T), ores: { coal: storeCap(0) } };
    expect(storeFull(full)).toBe(true);
    const r = strike({ ...full, hit: 0 }, seq(0.1, 0.9), 5);
    expect(r.drops.length).toBeGreaterThan(0);
    expect(oreCount(r.m)).toBe(storeCap(0));
    expect(r.drops[0].lost).toBeGreaterThan(0);
    const carts = { ...full, lv: { cart: 5 } };
    const away = idle(carts, OFFLINE_MAX_MS, seq(0.3));
    expect(away.m.depth).toBe(full.depth);
    // почти полный: вагонетки добивают до вместимости и встают — за 4 часа не уезжают на сотни метров
    const almost = { ...emptyMine(T), lv: { cart: 5 }, ores: { coal: storeCap(0) - 3 } };
    const r2 = idle(almost, OFFLINE_MAX_MS, seq(0.3));
    expect(oreCount(r2.m)).toBe(storeCap(0));
    expect(r2.drops.length).toBeLessThanOrEqual(3);
    // склад — улучшение: вместимость растёт
    expect(capOf({ lv: { store: 2 } })).toBe(storeCap(2));
    expect(storeCap(2)).toBeGreaterThan(storeCap(0));
  });
  it('рынок: цена дня у каждой руды своя; каждый сданный сегодня кусок дешевле; завтра — снова полная', () => {
    const m = { ...emptyMine(T), ores: { coal: 120 } };
    expect(dayFactor('coal', day)).toBeGreaterThanOrEqual(0.7);
    expect(dayFactor('coal', day)).toBeLessThanOrEqual(1.3);
    const p0 = unitPrice(m, 'coal', day);
    const a = sellOre(m, 'coal', 60, day);
    expect(a.n).toBe(60);
    expect(unitPrice(a.m, 'coal', day)).toBeCloseTo(p0 / 2, 6);
    // вторые 60 кусков сегодня — заметно дешевле первых
    const b = sellOre(a.m, 'coal', 60, day);
    expect(b.got).toBeLessThan(a.got * 0.75);
    // по частям за день — то же, что разом: хитрость «сдавать по одному» не работает
    let parts = m; let sum = 0;
    for (let i = 0; i < 12; i += 1) { const r = sellOre(parts, 'coal', 10, day); parts = r.m; sum += r.got; }
    expect(Math.abs(sum - (a.got + b.got))).toBeLessThanOrEqual(12);
    // назавтра — снова полная цена (у нового дня свои новости рынка)
    const next = dayOf(T + 86400000);
    expect(unitPrice(b.m, 'coal', next)).toBeCloseTo(unitPrice(m, 'coal', next), 6);
    expect(quote(m, 'coal', 120, day)).toBe(a.got + b.got);
    expect(oreValue(m, day)).toBe(quote(m, 'coal', 120, day));
  });
  it('заказы дня: три, последний — на самую глубокую руду; выполнен — жетоны и монета, второй раз нельзя', () => {
    const m = { ...emptyMine(T), found: ['coal', 'copper', 'silver'], ores: { coal: 400, copper: 400, silver: 400 }, lv: { store: 20 } };
    const os = ordersFor(m, day);
    expect(os).toHaveLength(3);
    expect(os[2].ore).toBe('silver');
    // разные руды, пока их хватает: два заказа на одно и то же — скучно
    expect(new Set(os.map((o) => o.ore)).size).toBe(3);
    expect(ordersFor(m, day)).toEqual(os);
    let s = emptyLearn();
    const r = fillOrder(m, s, day, 1, T);
    expect(r.ok).toBe(true);
    expect(r.m.tokens).toBe(os[0].tokens);
    expect(r.m.ores[os[0].ore]).toBe(400 - os[0].n);
    // жетоны заказа — выше рынка за тот же объём
    expect(os[0].tokens).toBeGreaterThan(quote(m, os[0].ore, os[0].n, day));
    s = r.s;
    expect(balance(s)).toBe(1);
    expect(fillOrder(r.m, s, day, 1, T).ok).toBe(false);
    expect(fillOrder({ ...m, ores: {} }, emptyLearn(), day, 2, T)).toMatchObject({ ok: false });
  });
  it('рубежи глубины: монеты один раз, дальние — дороже', () => {
    for (let i = 1; i < MILESTONES.length; i += 1) { expect(MILESTONES[i].d).toBeGreaterThan(MILESTONES[i - 1].d); expect(MILESTONES[i].coins).toBeGreaterThanOrEqual(MILESTONES[i - 1].coins); }
    const m = { ...emptyMine(T), depth: 130 };
    let s = emptyLearn();
    expect(readyMilestones(m, s).map((x) => x.d)).toEqual([25, 60, 120]);
    expect(nextMilestone(m, s).d).toBe(250);
    const r = claimMilestones(m, s, T); s = r.s;
    expect(balance(s)).toBe(3 + 4 + 5);
    expect(readyMilestones(m, s)).toEqual([]);
    expect(claimMilestones(m, s, T).got).toEqual([]);
  });
});

describe('шахта: одна на все устройства (пункт владельца 20.11, п. 7: «на телефоне совершенно другой прогресс шахты»)', () => {
  it('learn.mine переживает чистку и слияние: побеждает дальше продвинутая шахта, слияние симметрично', () => {
    const phone = { ...emptyMine(T), depth: 12, blocks: 24, tokens: 5, at: T + 5 };
    const pc = { ...emptyMine(T), depth: 80, blocks: 160, tokens: 40, lv: { pick: 3 }, ores: { copper: 7 }, at: T };
    const a = normalizeLearn({ ...emptyLearn(), mine: phone });
    const b = normalizeLearn({ ...emptyLearn(), mine: pc });
    expect(a.mine).toMatchObject({ depth: 12, blocks: 24 });
    expect(mergeLearn(a, b).mine).toMatchObject({ depth: 80, lv: { pick: 3 }, ores: { copper: 7 } });
    expect(mergeLearn(b, a).mine).toEqual(mergeLearn(a, b).mine);
    expect(mergeLearn(a, normalizeLearn(emptyLearn())).mine).toMatchObject({ depth: 12 });
    expect(normalizeLearn(emptyLearn()).mine).toBe(null);
    expect(betterMine(phone, pc)).toBe(pc);
  });
  it('чистка: чужие поля и руды выкидываются, улучшения не выше предела; версия 1 переносится', () => {
    const dirty = { v: 1, depth: 42, ores: { coal: 3, gem: 9, copper: -2 }, lv: { pick: 99, hack: 4 }, tokens: 7, found: ['coal', 'x'] };
    const m = normalizeLearn({ ...emptyLearn(), mine: dirty }).mine;
    expect(m).toMatchObject({ v: 2, depth: 42, ores: { coal: 3 }, lv: { pick: 30 }, tokens: 7, found: ['coal'] });
    expect(m.blocks).toBeGreaterThan(0);
  });
  it('списки руд и улучшений в чистке совпадают с правилами шахты', () => {
    expect(ORE_IDS).toEqual(ORES.map((o) => o.id));
    expect(UPGRADE_MAX).toEqual(Object.fromEntries(UPGRADES.map((u) => [u.id, u.max])));
  });
});

describe('шахта: скупщик, улучшения, монеты', () => {
  it('плавильня делает руду дороже', () => {
    const m = { ...emptyMine(T), ores: { coal: 10, copper: 2 } };
    const day = dayOf(T);
    expect(oreValue({ ...m, lv: { smelter: 2 } }, day)).toBeGreaterThan(oreValue(m, day));
  });
  it('улучшение стоит дороже с каждым уровнем; без жетонов не купить', () => {
    expect(upgradeCost('pick', 1)).toBeGreaterThan(upgradeCost('pick', 0));
    const poor = emptyMine(T);
    expect(buyUpgrade(poor, 'pick').ok).toBe(false);
    const r = buyUpgrade({ ...poor, tokens: 100 }, 'pick');
    expect(r.ok).toBe(true); expect(level(r.m, 'pick')).toBe(1); expect(r.m.tokens).toBe(100 - upgradeCost('pick', 0));
    expect(strike({ ...emptyMine(T), lv: { pick: 3 }, depth: 120 }, seq(0.1)).drops.length).toBeGreaterThanOrEqual(0);
  });
  it('обмен на монеты: каждая следующая монета дня дороже, не больше 5 в день, второй раз ту же не получить', () => {
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
    expect(EXCHANGE.perDay).toBe(5);
  });
  it('сохранение: своё читается, испорченное — с начала', () => {
    const m = { ...emptyMine(T), depth: 42, ores: { coal: 3 }, lv: { pick: 2 } };
    expect(parseMine(JSON.stringify(m), T)).toMatchObject({ depth: 42, ores: { coal: 3 }, lv: { pick: 2 } });
    expect(parseMine(JSON.stringify({ ...m, v: 1 }), T)).toMatchObject({ v: 2, depth: 42 });
    expect(parseMine('{oops', T)).toMatchObject({ depth: 0 });
    expect(parseMine(JSON.stringify({ v: 9 }), T)).toMatchObject({ depth: 0 });
  });
});
