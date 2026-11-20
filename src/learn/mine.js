/* ШАХТА — работа лавки, инкременталка (пункт владельца 19.11, п. 12: «новая работа — горная добыча: добываешь руду,
   улучшения, руду можно продавать в монеты»). docs/mechanics.md, «Лавка», «Шахта».

   Забой бьют киркой: у породы есть крепость (растёт с глубиной), удар отнимает силу кирки; разбили — шахта уходит вглубь
   и выпадает руда. Чем глубже — тем ценнее руда: уголь, медь, серебро, золото, инфлит и звёздное железо. Улучшения на жетоны:
     кирка — сильнее удар; вагонетки — добывают сами, и пока приложение закрыто (до 4 часов); фонарь — чаще ценная руда;
     подъёмник — глубже за каждый разбитый блок; плавильня — дороже сдаётся руда; динамит — взрыв на несколько блоков разом;
     склад — больше руды помещается.
   Цена улучшения растёт с уровнем (×рост за уровень) — каждое следующее даёт столько же, а стоит дороже: убывающая отдача.

   ВЕРСИЯ 2 (пункт владельца 20.11, п. 8: «в чём смысл шахты: один раз много добыл — и всё, больше делать ничего не надо;
   переделывай, и обновление заодно»). Раньше одна долгая сессия давала жетонов на недели вперёд. Теперь у шахты есть
   ритм дня и цели надолго:
     · СКЛАД — руды помещается не больше вместимости; полный склад — вагонетки встают, а руда из-под кирки осыпается.
       Значит, вагонетки работают за вас, только пока вы заходите и разгружаете склад.
     · СКУПЩИК С РЫНКОМ — у каждой руды цена дня (свои новости рынка: ±30%), и чем больше этой руды сдано сегодня, тем
       ниже цена следующего куска: p = p₀ / (1 + сдано/ёмкость рынка). Высыпать весь склад разом — невыгодно, а завтра
       цена снова полная. Это закон спроса из курса на деле: покупатель берёт больше только по более низкой цене.
     · ЗАКАЗЫ ДНЯ — три заказа на руду (тем глубже, чем глубже шахта): жетоны сверх рынка и монета лавки за каждый.
     · РУБЕЖИ — отметки глубины от 25 до 2000 м: дошли впервые — монеты лавки, один раз на всех устройствах.
     · ОБМЕН — жетоны на монеты, по-прежнему всё дороже за день, но не больше EXCHANGE.perDay.
   Монеты — только с ключами в learn.claimed (mine:<день>:<k>, mine:o:<день>:<k>, mine:d:<метры>): общие для всех
   устройств, второй раз ту же не получить. Сам прогресс шахты хранится в learn.mine и синхронизируется вместе с
   обучением (п. 7: «на телефоне совершенно другой прогресс шахты»): у двух устройств побеждает та шахта, где разбито
   больше блоков. Модуль чистый: случай — через rng. */
import { earn, hasClaim } from './rewards.js';
import { dayOf } from '../textbook/learn-state.js';

export const ORES = [
  { id: 'coal', name: 'Уголь', color: '#3B3B3F', glow: '#9AA0A6', value: 1, from: 0 },
  { id: 'copper', name: 'Медь', color: '#C46A3A', glow: '#F2A26E', value: 4, from: 30 },
  { id: 'silver', name: 'Серебро', color: '#B9C3CC', glow: '#EEF3F7', value: 14, from: 120 },
  { id: 'gold', name: 'Золото', color: '#E2AE2A', glow: '#FFE08A', value: 50, from: 350 },
  { id: 'inflit', name: 'Инфлит', color: '#7A5BD8', glow: '#C9B8FF', value: 200, from: 900 },
  // обновление 20.11: самое глубокое — осколки метеорита в мантии
  { id: 'starsteel', name: 'Звёздное железо', color: '#3E7C8C', glow: '#9FF2FF', value: 700, from: 1600 },
];
export const ORE_BY_ID = Object.fromEntries(ORES.map((o) => [o.id, o]));
// пласты: цвет породы по глубине (для рисунка разреза шахты)
export const STRATA = [
  { from: 0, name: 'Дёрн и глина', color: '#8A6B4E' },
  { from: 30, name: 'Песчаник', color: '#A98A5E' },
  { from: 120, name: 'Сланец', color: '#5E6470' },
  { from: 350, name: 'Гранит', color: '#7B5E66' },
  { from: 900, name: 'Жила инфлита', color: '#3D3466' },
  { from: 1600, name: 'Мантия', color: '#5A2A22' },
];
export const stratumAt = (depth) => [...STRATA].reverse().find((s) => depth >= s.from) || STRATA[0];

export const UPGRADES = [
  { id: 'pick', name: 'Кирка', base: 10, grow: 1.6, max: 30, what: (lv) => `удар ×${pickPower(lv).toFixed(1).replace('.', ',')}` },
  { id: 'cart', name: 'Вагонетки', base: 25, grow: 1.7, max: 25, what: (lv) => (lv ? `${cartRate(lv).toFixed(1).replace('.', ',')} удара в секунду сами` : 'добывают сами, даже когда вас нет') },
  { id: 'lamp', name: 'Фонарь', base: 40, grow: 1.8, max: 15, what: (lv) => `ценная руда ×${lampLuck(lv).toFixed(2).replace('.', ',')}` },
  { id: 'lift', name: 'Подъёмник', base: 30, grow: 1.75, max: 20, what: (lv) => `${liftStep(lv).toFixed(2).replace('.', ',')} м за блок` },
  { id: 'smelter', name: 'Плавильня', base: 80, grow: 1.9, max: 15, what: (lv) => `руда дороже ×${smelt(lv).toFixed(1).replace('.', ',')}` },
  { id: 'dynamite', name: 'Динамит', base: 60, grow: 2, max: 10, what: (lv) => (lv ? `взрыв: ${blastBlocks(lv)} блоков, раз в ${blastCooldown(lv)} с` : 'взрыв на несколько блоков разом') },
  { id: 'store', name: 'Склад', base: 20, grow: 1.65, max: 20, what: (lv) => `вмещает ${storeCap(lv)} кусков руды` },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const pickPower = (lv) => 1.4 ** lv;
export const cartRate = (lv) => 0.6 * lv;
export const lampLuck = (lv) => 1 + 0.18 * lv;
export const liftStep = (lv) => 0.5 + 0.2 * lv;
export const smelt = (lv) => 1 + 0.15 * lv;
export const blastBlocks = (lv) => 3 + 2 * lv;
export const blastCooldown = (lv) => Math.max(12, 40 - 3 * lv);
export const storeCap = (lv) => 40 + 30 * lv;
export const capOf = (m) => storeCap(level(m, 'store'));
export const oreCount = (m) => Object.values(m.ores || {}).reduce((a, n) => a + n, 0);
export const storeFull = (m) => oreCount(m) >= capOf(m);
export const upgradeCost = (id, lv) => { const u = UPGRADE_BY_ID[id]; return Math.round(u.base * u.grow ** lv); };
// крепость породы: на глубине бить тяжелее
export const hardness = (depth) => Math.round((1 + depth / 60) * 10) / 10;
// вагонетки досчитывают за закрытое приложение — не больше 4 часов
export const OFFLINE_MAX_MS = 4 * 3600 * 1000;

// обмен: монет в день меньше, чем было (8), — монеты шахты теперь ещё и в заказах и рубежах
export const EXCHANGE = { base: 40, grow: 1.5, perDay: 5 };
export const exchangeCost = (k) => Math.round(EXCHANGE.base * EXCHANGE.grow ** k);
export const mineKey = (day, k) => `mine:${day}:${k}`;

export const emptyMine = (now = Date.now()) => ({ v: 2, depth: 0, hit: 0, ores: {}, tokens: 0, lv: {}, blasted: 0, at: now, found: ['coal'], blocks: 0, sold: { day: '', n: {} } });
export const level = (m, id) => (m.lv || {})[id] || 0;
export const unlockedOres = (depth) => ORES.filter((o) => depth >= o.from);

/* какая руда выпала: из открытых на этой глубине; ценная — реже (вес ∝ 1 / ценность^0,7), фонарь делает её чаще; самая
   свежая (только что открытая) — чуть чаще, чтобы её заметили */
export function oreWeights(depth, lamp = 0) {
  const open = unlockedOres(depth); const luck = lampLuck(lamp);
  return open.map((o, i) => ({ o, w: (1 / o.value ** 0.7) * (i ? luck ** i : 1) }));
}
export function rollOre(depth, lamp, rng = Math.random) {
  const ws = oreWeights(depth, lamp); const total = ws.reduce((a, x) => a + x.w, 0);
  let r = rng() * total;
  for (const { o, w } of ws) { r -= w; if (r <= 0) return o; }
  return ws[ws.length - 1].o;
}

// разбить блок: глубже на шаг подъёмника; руды 1–3 куска одного вида — сколько влезет на склад, остальное осыпается
function breakBlock(m, rng) {
  const ore = rollOre(m.depth, level(m, 'lamp'), rng);
  const n = 1 + Math.floor(rng() * 3);
  const room = Math.max(0, capOf(m) - oreCount(m)); const kept = Math.min(n, room);
  const depth = Math.round((m.depth + liftStep(level(m, 'lift'))) * 100) / 100;
  const found = m.found.includes(ore.id) ? m.found : [...m.found, ore.id];
  const ores = kept ? { ...m.ores, [ore.id]: (m.ores[ore.id] || 0) + kept } : m.ores;
  return { m: { ...m, depth, ores, found, blocks: (m.blocks || 0) + 1 }, drop: { ore: ore.id, n: kept, lost: n - kept } };
}

/* удар (силой power, по умолчанию — кирки): копится в hit; хватило на крепость — блок разбит (может и несколько при сильной
   кирке); drops — что выпало, по порядку. carts — бьют вагонетки: на полном складе они встают (сила не копится) */
export function strike(m, rng = Math.random, power = pickPower(level(m, 'pick')), { carts = false } = {}) {
  if (carts && storeFull(m)) return { m, drops: [], full: true };
  let cur = { ...m, hit: m.hit + power }; const drops = [];
  for (let guard = 0; guard < 2000 && cur.hit >= hardness(cur.depth); guard += 1) {
    if (carts && storeFull(cur)) { cur = { ...cur, hit: 0 }; break; }
    const h = hardness(cur.depth);
    const r = breakBlock({ ...cur, hit: cur.hit - h }, rng);
    cur = r.m; drops.push(r.drop);
  }
  return { m: cur, drops, full: storeFull(cur) };
}
// вагонетки за ms миллисекунд (и за закрытое приложение — до 4 часов)
export function idle(m, ms, rng = Math.random) {
  const rate = cartRate(level(m, 'cart'));
  if (!rate || ms <= 0) return { m, drops: [] };
  return strike(m, rng, rate * (Math.min(ms, OFFLINE_MAX_MS) / 1000) * pickPower(level(m, 'pick')) * 0.5, { carts: true });
}
// динамит: блоки разом, если остыл
export const blastReady = (m, now = Date.now()) => level(m, 'dynamite') > 0 && now - (m.blasted || 0) >= blastCooldown(level(m, 'dynamite')) * 1000;
export function blast(m, now = Date.now(), rng = Math.random) {
  if (!blastReady(m, now)) return { m, drops: [] };
  let cur = { ...m, blasted: now }; const drops = [];
  for (let i = 0; i < blastBlocks(level(m, 'dynamite')); i += 1) { const r = breakBlock({ ...cur, hit: 0 }, rng); cur = r.m; drops.push(r.drop); }
  return { m: { ...cur, hit: m.hit }, drops };
}

/* СКУПЩИК С РЫНКОМ. Цена дня у каждой руды — от «новостей рынка» (детерминированно по дню и руде, 0,7–1,3 от базы);
   ёмкость рынка — сколько кусков этой руды скупщик берёт до того, как цена упадёт вдвое (на дорогую руду покупателей
   меньше). Каждый сданный сегодня кусок снижает цену следующего: p = p₀ · плавильня / (1 + сдано / ёмкость). */
const MARKET_DEPTH = { coal: 60, copper: 30, silver: 16, gold: 8, inflit: 4, starsteel: 2 };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
export const dayFactor = (oreId, day) => Math.round((0.7 + 0.6 * hash(`${day}:${oreId}`)) * 100) / 100;
export const soldToday = (m, oreId, day) => (m.sold && m.sold.day === day ? m.sold.n[oreId] || 0 : 0);
export function unitPrice(m, oreId, day, extra = 0) {
  const o = ORE_BY_ID[oreId];
  return (o.value * dayFactor(oreId, day) * smelt(level(m, 'smelter'))) / (1 + (soldToday(m, oreId, day) + extra) / MARKET_DEPTH[oreId]);
}
// сколько жетонов дадут за q кусков этой руды сейчас (каждый следующий — по своей, более низкой цене)
export function quote(m, oreId, q, day) {
  let sum = 0; for (let i = 0; i < q; i += 1) sum += unitPrice(m, oreId, day, i);
  return Math.floor(sum);
}
export function sellOre(m, oreId, q, day) {
  const have = (m.ores || {})[oreId] || 0; const n = Math.min(have, Math.max(0, Math.floor(q)));
  if (!n) return { m, got: 0, n: 0 };
  const got = quote(m, oreId, n, day);
  const prev = m.sold && m.sold.day === day ? m.sold.n : {};
  const ores = { ...m.ores, [oreId]: have - n }; if (!ores[oreId]) delete ores[oreId];
  return { m: { ...m, ores, tokens: m.tokens + got, sold: { day, n: { ...prev, [oreId]: (prev[oreId] || 0) + n } } }, got, n };
}
// стоимость всего склада по ценам «как если бы сдать сегодня всё»
export const oreValue = (m, day) => ORES.reduce((a, o) => a + quote(m, o.id, (m.ores || {})[o.id] || 0, day), 0);

/* ЗАКАЗЫ ДНЯ: три на день, по руде, открытой на этой глубине (последний — на самую глубокую из открытых). Количество — от
   ёмкости склада; награда — жетоны вдвое выше рынка и монета лавки (ключ mine:o:<день>:<k>). */
export const ORDER = { perDay: 3, coin: 1 };
export const orderKey = (day, k) => `mine:o:${day}:${k}`;
export function ordersFor(m, day) {
  const open = m.found.length ? ORES.filter((o) => m.found.includes(o.id)) : [ORES[0]];
  const cap = capOf(m);
  // последний — на самую глубокую из открытых; остальные — на разные другие руды, пока их хватает
  const deep = open[open.length - 1]; const rest = open.length > 1 ? open.slice(0, -1) : open;
  const start = Math.floor(hash(`${day}:order`) * rest.length);
  return Array.from({ length: ORDER.perDay }, (_, k) => {
    const o = k === ORDER.perDay - 1 ? deep : rest[(start + k) % rest.length];
    const share = [0.25, 0.18, 0.1][k];
    const n = Math.max(3, Math.round((cap * share) / Math.max(1, Math.log2(o.value + 1))));
    return { k: k + 1, ore: o.id, n, tokens: Math.round(o.value * n * 2 * smelt(level(m, 'smelter'))), coins: ORDER.coin, key: orderKey(day, k + 1) };
  });
}
export function fillOrder(m, s, day, k, now = Date.now()) {
  const o = ordersFor(m, day).find((x) => x.k === k);
  if (!o) return { m, s, ok: false, reason: 'Нет такого заказа' };
  if (hasClaim(s, o.key)) return { m, s, ok: false, reason: 'Заказ уже выполнен' };
  const have = (m.ores || {})[o.ore] || 0;
  if (have < o.n) return { m, s, ok: false, reason: `Нужно ${o.n}, на складе ${have}` };
  const ores = { ...m.ores, [o.ore]: have - o.n }; if (!ores[o.ore]) delete ores[o.ore];
  return { m: { ...m, ores, tokens: m.tokens + o.tokens }, s: earn(s, o.coins, o.key, now), ok: true, order: o };
}

/* РУБЕЖИ: впервые дошли до отметки — монеты лавки, один раз (ключ mine:d:<метры>, общий для устройств). Глубже — дольше:
   крепость породы растёт, поэтому дальние рубежи — цели на недели. */
export const MILESTONES = [[25, 3], [60, 4], [120, 5], [250, 6], [350, 8], [500, 10], [700, 12], [900, 15], [1200, 20], [1600, 25], [2000, 30]].map(([d, coins]) => ({ d, coins, key: `mine:d:${d}` }));
// следующий рубеж впереди (ещё не пройденный); пройденные, но не забранные — readyMilestones
export const nextMilestone = (m, s) => MILESTONES.find((x) => !hasClaim(s, x.key) && x.d > m.depth) || null;
export const readyMilestones = (m, s) => MILESTONES.filter((x) => m.depth >= x.d && !hasClaim(s, x.key));
export function claimMilestones(m, s, now = Date.now()) {
  const ready = readyMilestones(m, s);
  return { s: ready.reduce((t, x) => earn(t, x.coins, x.key, now), s), got: ready };
}

export function buyUpgrade(m, id) {
  const u = UPGRADE_BY_ID[id]; if (!u) return { m, ok: false, reason: 'Нет такого улучшения' };
  const lv = level(m, id);
  if (lv >= u.max) return { m, ok: false, reason: 'Уже на пределе' };
  const cost = upgradeCost(id, lv);
  if (m.tokens < cost) return { m, ok: false, reason: `Не хватает ${cost - m.tokens} жетонов` };
  return { m: { ...m, tokens: m.tokens - cost, lv: { ...m.lv, [id]: lv + 1 } }, ok: true, cost };
}

// обмен на монеты: сколько монет уже взято сегодня, сколько стоит следующая
export function exchangedToday(s, now = Date.now()) {
  const day = dayOf(now); let n = 0;
  for (let k = 1; k <= EXCHANGE.perDay; k += 1) if (hasClaim(s, mineKey(day, k))) n += 1;
  return n;
}
export const nextExchangeCost = (s, now = Date.now()) => (exchangedToday(s, now) >= EXCHANGE.perDay ? null : exchangeCost(exchangedToday(s, now)));
// одна монета: жетоны списываются в шахте, монета — в лавке (ключ дня); вернуть и то, и другое
export function exchange(m, s, now = Date.now()) {
  const done = exchangedToday(s, now);
  if (done >= EXCHANGE.perDay) return { m, s, ok: false, reason: `Сегодня скупщик больше монет не даёт — завтра снова ${EXCHANGE.perDay}` };
  const cost = exchangeCost(done);
  if (m.tokens < cost) return { m, s, ok: false, reason: `Нужно ${cost} жетонов, есть ${m.tokens}` };
  return { m: { ...m, tokens: m.tokens - cost }, s: earn(s, 1, mineKey(dayOf(now), done + 1), now), ok: true, cost };
}

/* прогресс шахты: копия на устройстве (ems-mine-v2 — каждый удар) и в learn.mine — синхронизируется с обучением.
   Чистка и выбор «какая шахта дальше» — в src/learn/mine-state.js (его читает и learn-state: без кругового импорта). */
export { MINE_STORE, MINE_STORE_V1, cleanMine, parseMine, betterMine } from './mine-state.js';
