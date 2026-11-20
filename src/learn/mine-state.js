/* СОСТОЯНИЕ ШАХТЫ (src/learn/mine.js) без игровых правил: чистка сохранённого и выбор между двумя устройствами.
   Отдельным модулем, потому что его читает src/textbook/learn-state.js (learn.mine синхронизируется с обучением,
   пункт владельца 20.11, п. 7), а mine.js сам зависит от наград. Версия 1 (только на устройстве) переносится:
   глубина, руда, жетоны, улучшения сохраняются. Испорченное — с начала. Списки руд и улучшений сверяет тест. */
export const ORE_IDS = ['coal', 'copper', 'silver', 'gold', 'inflit', 'starsteel'];
export const UPGRADE_MAX = { pick: 30, cart: 25, lamp: 15, lift: 20, smelter: 15, dynamite: 10, store: 20 };
export const emptyMineState = (now = Date.now()) => ({ v: 2, depth: 0, hit: 0, ores: {}, tokens: 0, lv: {}, blasted: 0, at: now, found: ['coal'], blocks: 0, sold: { day: '', n: {} } });
export const MINE_STORE = 'ems-mine-v2';
export const MINE_STORE_V1 = 'ems-mine-v1';
const num = (v, max = 1e15) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : 0);
export function cleanMine(raw, now = Date.now()) {
  const m = raw && typeof raw === 'object' ? raw : null;
  if (!m || (m.v !== 1 && m.v !== 2) || typeof m.depth !== 'number') return emptyMineState(now);
  const ores = {}; ORE_IDS.forEach((id) => { const n = Math.floor(num((m.ores || {})[id], 1e9)); if (n) ores[id] = n; });
  const lv = {}; Object.entries(UPGRADE_MAX).forEach(([id, max]) => { const n = Math.min(max, Math.floor(num((m.lv || {})[id], 99))); if (n) lv[id] = n; });
  const found = ORE_IDS.filter((id) => (Array.isArray(m.found) ? m.found : []).includes(id) || ores[id]);
  const sold = m.sold && typeof m.sold.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.sold.day)
    ? { day: m.sold.day, n: Object.fromEntries(ORE_IDS.map((id) => [id, Math.floor(num((m.sold.n || {})[id], 1e9))]).filter(([, n]) => n)) } : { day: '', n: {} };
  const depth = num(m.depth, 1e7);
  return { v: 2, depth, hit: num(m.hit, 1e9), ores, tokens: Math.floor(num(m.tokens)), lv, blasted: num(m.blasted, 1e14), at: num(m.at, 1e14) || now,
    found: found.length ? found : ['coal'], blocks: Math.floor(num(m.blocks, 1e12)) || Math.round(depth / 0.5), sold };
}
export function parseMine(raw, now = Date.now()) {
  try { return cleanMine(JSON.parse(raw), now); } catch { return emptyMineState(now); }
}
// дальше продвинутая шахта: больше разбитых блоков, при равенстве — позже сохранённая (симметрично)
export function betterMine(a, b) {
  if (!a) return b || null; if (!b) return a;
  if ((b.blocks || 0) !== (a.blocks || 0)) return (b.blocks || 0) > (a.blocks || 0) ? b : a;
  if ((b.at || 0) !== (a.at || 0)) return (b.at || 0) > (a.at || 0) ? b : a;
  return JSON.stringify(b) > JSON.stringify(a) ? b : a;
}
