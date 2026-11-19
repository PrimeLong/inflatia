/* ШАХТА — работа лавки, инкременталка (пункт владельца 19.11, п. 12: «новая работа — горная добыча: добываешь руду,
   улучшения, руду можно продавать в монеты»). docs/mechanics.md, «Лавка», «Шахта».

   Забой бьют киркой: у породы есть крепость (растёт с глубиной), удар отнимает силу кирки; разбили — шахта уходит вглубь
   и выпадает руда. Чем глубже — тем ценнее руда: уголь, медь, серебро, золото и инфлит (кристалл, которого нет нигде,
   кроме Инфляции). Руду сдают скупщику за жетоны шахты, на жетоны — улучшения:
     кирка — сильнее удар; вагонетки — добывают сами, и пока приложение закрыто (до 4 часов); фонарь — чаще ценная руда;
     подъёмник — глубже за каждый разбитый блок; плавильня — дороже сдаётся руда; динамит — взрыв на несколько блоков разом.
   Цена улучшения растёт с уровнем (×рост за уровень) — каждое следующее даёт столько же, а стоит дороже: убывающая отдача.

   Жетоны можно обменять на настоящие монеты лавки — но скупщик монет за день даёт всё дороже: k-я монета дня стоит
   EXCHANGE.base × EXCHANGE.grow^k жетонов, и не больше EXCHANGE.perDay монет в день (ключи mine:<день>:<k> в learn.claimed —
   общие для всех устройств, второй раз ту же монету не получить). Так шахта не ломает экономику лавки, а на кривой обмена
   видно, почему следующая единица стоит дороже. Сам прогресс шахты (глубина, руда, улучшения) — на этом устройстве.
   Модуль чистый: случай — через rng. */
import { earn, hasClaim } from './rewards.js';
import { dayOf } from '../textbook/learn-state.js';

export const ORES = [
  { id: 'coal', name: 'Уголь', color: '#3B3B3F', glow: '#9AA0A6', value: 1, from: 0 },
  { id: 'copper', name: 'Медь', color: '#C46A3A', glow: '#F2A26E', value: 4, from: 30 },
  { id: 'silver', name: 'Серебро', color: '#B9C3CC', glow: '#EEF3F7', value: 14, from: 120 },
  { id: 'gold', name: 'Золото', color: '#E2AE2A', glow: '#FFE08A', value: 50, from: 350 },
  { id: 'inflit', name: 'Инфлит', color: '#7A5BD8', glow: '#C9B8FF', value: 200, from: 900 },
];
export const ORE_BY_ID = Object.fromEntries(ORES.map((o) => [o.id, o]));
// пласты: цвет породы по глубине (для рисунка разреза шахты)
export const STRATA = [
  { from: 0, name: 'Дёрн и глина', color: '#8A6B4E' },
  { from: 30, name: 'Песчаник', color: '#A98A5E' },
  { from: 120, name: 'Сланец', color: '#5E6470' },
  { from: 350, name: 'Гранит', color: '#7B5E66' },
  { from: 900, name: 'Жила инфлита', color: '#3D3466' },
];
export const stratumAt = (depth) => [...STRATA].reverse().find((s) => depth >= s.from) || STRATA[0];

export const UPGRADES = [
  { id: 'pick', name: 'Кирка', base: 10, grow: 1.6, max: 30, what: (lv) => `удар ×${pickPower(lv).toFixed(1).replace('.', ',')}` },
  { id: 'cart', name: 'Вагонетки', base: 25, grow: 1.7, max: 25, what: (lv) => (lv ? `${cartRate(lv).toFixed(1).replace('.', ',')} удара в секунду сами` : 'добывают сами, даже когда вас нет') },
  { id: 'lamp', name: 'Фонарь', base: 40, grow: 1.8, max: 15, what: (lv) => `ценная руда ×${lampLuck(lv).toFixed(2).replace('.', ',')}` },
  { id: 'lift', name: 'Подъёмник', base: 30, grow: 1.75, max: 20, what: (lv) => `${liftStep(lv).toFixed(2).replace('.', ',')} м за блок` },
  { id: 'smelter', name: 'Плавильня', base: 80, grow: 1.9, max: 15, what: (lv) => `руда дороже ×${smelt(lv).toFixed(1).replace('.', ',')}` },
  { id: 'dynamite', name: 'Динамит', base: 60, grow: 2, max: 10, what: (lv) => (lv ? `взрыв: ${blastBlocks(lv)} блоков, раз в ${blastCooldown(lv)} с` : 'взрыв на несколько блоков разом') },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const pickPower = (lv) => 1.4 ** lv;
export const cartRate = (lv) => 0.6 * lv;
export const lampLuck = (lv) => 1 + 0.18 * lv;
export const liftStep = (lv) => 0.5 + 0.2 * lv;
export const smelt = (lv) => 1 + 0.15 * lv;
export const blastBlocks = (lv) => 3 + 2 * lv;
export const blastCooldown = (lv) => Math.max(12, 40 - 3 * lv);
export const upgradeCost = (id, lv) => { const u = UPGRADE_BY_ID[id]; return Math.round(u.base * u.grow ** lv); };
// крепость породы: на глубине бить тяжелее
export const hardness = (depth) => Math.round((1 + depth / 60) * 10) / 10;
// вагонетки досчитывают за закрытое приложение — не больше 4 часов
export const OFFLINE_MAX_MS = 4 * 3600 * 1000;

export const EXCHANGE = { base: 30, grow: 1.45, perDay: 8 };
export const exchangeCost = (k) => Math.round(EXCHANGE.base * EXCHANGE.grow ** k);
export const mineKey = (day, k) => `mine:${day}:${k}`;

export const emptyMine = (now = Date.now()) => ({ v: 1, depth: 0, hit: 0, ores: {}, tokens: 0, lv: {}, blasted: 0, at: now, found: ['coal'] });
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

// разбить блок: глубже на шаг подъёмника; руды 1–3 куска одного вида
function breakBlock(m, rng) {
  const ore = rollOre(m.depth, level(m, 'lamp'), rng);
  const n = 1 + Math.floor(rng() * 3);
  const depth = Math.round((m.depth + liftStep(level(m, 'lift'))) * 100) / 100;
  const found = m.found.includes(ore.id) ? m.found : [...m.found, ore.id];
  return { m: { ...m, depth, ores: { ...m.ores, [ore.id]: (m.ores[ore.id] || 0) + n }, found }, drop: { ore: ore.id, n } };
}

/* удар (силой power, по умолчанию — кирки): копится в hit; хватило на крепость — блок разбит (может и несколько при сильной
   кирке); drops — что выпало, по порядку */
export function strike(m, rng = Math.random, power = pickPower(level(m, 'pick'))) {
  let cur = { ...m, hit: m.hit + power }; const drops = [];
  for (let guard = 0; guard < 2000 && cur.hit >= hardness(cur.depth); guard += 1) {
    const h = hardness(cur.depth);
    const r = breakBlock({ ...cur, hit: cur.hit - h }, rng);
    cur = r.m; drops.push(r.drop);
  }
  return { m: cur, drops };
}
// вагонетки за ms миллисекунд (и за закрытое приложение — до 4 часов)
export function idle(m, ms, rng = Math.random) {
  const rate = cartRate(level(m, 'cart'));
  if (!rate || ms <= 0) return { m, drops: [] };
  return strike(m, rng, rate * (Math.min(ms, OFFLINE_MAX_MS) / 1000) * pickPower(level(m, 'pick')) * 0.5);
}
// динамит: блоки разом, если остыл
export const blastReady = (m, now = Date.now()) => level(m, 'dynamite') > 0 && now - (m.blasted || 0) >= blastCooldown(level(m, 'dynamite')) * 1000;
export function blast(m, now = Date.now(), rng = Math.random) {
  if (!blastReady(m, now)) return { m, drops: [] };
  let cur = { ...m, blasted: now }; const drops = [];
  for (let i = 0; i < blastBlocks(level(m, 'dynamite')); i += 1) { const r = breakBlock({ ...cur, hit: 0 }, rng); cur = r.m; drops.push(r.drop); }
  return { m: { ...cur, hit: m.hit }, drops };
}

// скупщик: вся руда — в жетоны по ценности, плавильня добавляет
export const oreValue = (m) => Math.floor(ORES.reduce((a, o) => a + (m.ores[o.id] || 0) * o.value, 0) * smelt(level(m, 'smelter')));
export function sellAll(m) {
  const got = oreValue(m);
  return { m: { ...m, ores: {}, tokens: m.tokens + got }, got };
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

// прогресс шахты — на устройстве (ems-mine-v1); испорченное или чужое — с начала
export const MINE_STORE = 'ems-mine-v1';
export function parseMine(raw, now = Date.now()) {
  try {
    const m = JSON.parse(raw);
    if (!m || m.v !== 1 || typeof m.depth !== 'number') return emptyMine(now);
    return { ...emptyMine(now), ...m, ores: { ...m.ores }, lv: { ...m.lv }, found: Array.isArray(m.found) ? m.found : ['coal'] };
  } catch { return emptyMine(now); }
}
