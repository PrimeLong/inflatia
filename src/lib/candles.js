/* СВЕЧИ ТЕРМИНАЛА ИНВЕСТОРА (src/trading.jsx, docs/mechanics.md, «Терминал частного инвестора»). Модуль чистый.
   Свеча — не выдумка: у квартальной открытие — закрытие прошлого квартала, закрытие — цена конца квартала; тени — самые
   высокая и низкая живые котировки, которые терминал видел в этом квартале (пока страница была открыта), а если не видел —
   тени нет (максимум и минимум тела). «Сейчас» — свечи из живых котировок: каждые `per` тиков — одна свеча. */

// квартальные свечи: history — строки { q, label, ...экономика }; seen — { [q]: { h, l } } — что видели вживую
export function quarterCandles(history, key, seen = {}) {
  const out = [];
  let prevClose = null;
  (history || []).forEach((row, i) => {
    const c = row && row[key];
    if (!Number.isFinite(c)) return;
    const o = Number.isFinite(prevClose) ? prevClose : c;
    const s = seen[row.q] || null;
    const h = Math.max(o, c, s && Number.isFinite(s.h) ? s.h : -Infinity);
    const l = Math.min(o, c, s && Number.isFinite(s.l) ? s.l : Infinity);
    out.push({ t: row.q ?? i, label: row.label || '', o, h, l, c });
    prevClose = c;
  });
  return out;
}

// свечи из живых котировок: подряд по per тиков; открытие следующей — закрытие предыдущей (без разрывов)
export function tickCandles(ticks, per = 5) {
  const out = [];
  const vs = (ticks || []).filter(Number.isFinite);
  for (let i = 0; i < vs.length; i += per) {
    const part = vs.slice(i, i + per);
    const o = out.length ? out[out.length - 1].c : part[0];
    const c = part[part.length - 1];
    out.push({ t: out.length, label: '', o, h: Math.max(o, ...part), l: Math.min(o, ...part), c, open: part.length < per });
  }
  return out;
}

// запомнить тик: лента на ключ ограничена cap значениями; seen — экстремумы квартала q
export function pushTick(tape, key, v, cap = 300) {
  if (!Number.isFinite(v)) return tape;
  const arr = tape[key] || (tape[key] = []);
  arr.push(v);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
  return tape;
}
export function noteExtreme(seen, q, key, v) {
  if (!Number.isFinite(v)) return seen;
  const byQ = seen[q] || (seen[q] = {});
  const e = byQ[key] || (byQ[key] = { h: v, l: v });
  if (v > e.h) e.h = v; if (v < e.l) e.l = v;
  return seen;
}
// экстремумы одного ключа по кварталам — в виде, который ждёт quarterCandles
export const seenFor = (seen, key) => Object.fromEntries(Object.entries(seen || {}).filter(([, v]) => v && v[key]).map(([q, v]) => [q, v[key]]));

/* шкала цен по свечам и дополнительным уровням (средняя цена входа) с полями pad. minRel — наименьший размах шкалы в долях
   цены: живые котировки внутри квартала колеблются на сотые доли процента, и без нижней границы шкала растягивала их
   на весь график — свечи становились огромными «плитками» (пункт владельца 22.11, п. 12) */
export function priceRange(candles, extra = [], pad = 0.08, minRel = 0) {
  const vals = [];
  (candles || []).forEach((k) => { vals.push(k.h, k.l); });
  extra.filter(Number.isFinite).forEach((v) => vals.push(v));
  if (!vals.length) return { min: 0, max: 1 };
  let min = Math.min(...vals); let max = Math.max(...vals);
  if (max - min < Math.abs(max) * 1e-4 || max === min) { const d = Math.abs(max) * 0.002 || 1; min -= d; max += d; }
  const want = Math.abs((max + min) / 2) * minRel;
  if (max - min < want) { const mid = (max + min) / 2; min = mid - want / 2; max = mid + want / 2; }
  const p = (max - min) * pad;
  return { min: min - p, max: max + p };
}

// быстрые суммы сделки (в млн): как «$100 / $500 / $1K / $5K / Max» — круглые доли доступного, не больше него
export function quickAmounts(max) {
  if (!(max > 0)) return [];
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const fit = steps.filter((s) => s < max * 0.92);
  return fit.slice(-4);
}

// изменение в процентах и направление: «вверх», «вниз», «без изменений»
export function change(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return { pct: 0, dir: 0 };
  const pct = (to / from - 1) * 100;
  return { pct, dir: pct > 0.005 ? 1 : pct < -0.005 ? -1 : 0 };
}

// линия-спарклайн по значениям в рамке w×h (пустая строка — точек меньше двух)
export function sparkPath(values, w, h, pad = 2) {
  const vs = (values || []).filter(Number.isFinite);
  if (vs.length < 2) return '';
  const min = Math.min(...vs); const max = Math.max(...vs); const span = max - min || 1;
  return vs.map((v, i) => `${i ? 'L' : 'M'}${((i / (vs.length - 1)) * (w - pad * 2) + pad).toFixed(1)} ${(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)}`).join(' ');
}
