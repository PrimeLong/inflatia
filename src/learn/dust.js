/* ПЫЛЬНАЯ ВИТРИНА — мини-игра лавки (docs/mechanics.md, «Лавка»). Стекло витрины запылилось: ученик
   протирает его мышью или пальцем, под пылью — Инфля в вещи с витрины дня. Протёр — немного монет:
   DUST.coins за витрину, до DUST.perDay витрин в день (ключи dust:<день>:<n> в learn.claimed — общие
   для всех устройств, второй раз ту же витрину не оплатить). Сверх того протирать можно просто так.

   Модель стекла — сетка клеток с уровнем пыли от 0 до 1. Тряпка — круг радиуса r: под ней пыль
   убывает в (1 − wipe·(1 − d/r)) раз, сильнее в середине — так же, как холст стирает пыль радиальной
   кистью. Чистая клетка — пыли меньше DUST.thr; витрина засчитана (монеты), когда чистых DUST.clean, а «Блестит!» —
   когда чистое всё стекло: дотереть до 100% можно по желанию. За один
   проход середина ещё мутная — нужно пройтись дважды: в этом и есть «тереть». Модуль чистый. */
import { earn, hasClaim, shopDay, balance } from './rewards.js';
import { dayOf } from '../textbook/learn-state.js';

// 2 монеты за витрину, до пяти витрин в день (было 3 × 3) — docs/mechanics.md, «Лавка»
export const DUST = { coins: 2, perDay: 5, clean: 0.9, wipe: 0.65, thr: 0.25 };

export const dustKey = (day, n) => `dust:${day}:${n}`;

/* УЛУЧШЕНИЕ «МИКРОФИБРА» (пункт владельца 15.11: «одно улучшение на твой выбор, чтобы купить и через какое-то
   время окупить временем или производительностью»). Покупается один раз за CLOTH.price монет и даёт два плюса:
   тряпка шире (CLOTH.rag — радиус мазка) и стирает сильнее (CLOTH.wipe) — витрина протирается быстрее; и одна
   оплачиваемая витрина в день сверх пяти — +DUST.coins монет в день. Окупается за CLOTH.price / DUST.coins = 12
   дней, когда протираешь все витрины дня; что уже вернула — clothReturn (монеты за шестые витрины). */
export const CLOTH = { id: 'dust-cloth', price: 24, extra: 1, rag: 1.45, wipe: 0.8 };
export const hasCloth = (s) => !!((s && s.owned) || {})[CLOTH.id];
export const dustPerDay = (s) => DUST.perDay + (hasCloth(s) ? CLOTH.extra : 0);
// мазок: радиус (доля ширины стекла) и сила
export const dustRag = (s) => (hasCloth(s) ? { r: 0.085 * CLOTH.rag, wipe: CLOTH.wipe } : { r: 0.085, wipe: DUST.wipe });
export const clothPaybackDays = () => Math.ceil(CLOTH.price / (DUST.coins * CLOTH.extra));
// сколько монет микрофибра уже вернула: оплаченные витрины сверх пяти в день, начиная с покупки
export function clothReturn(s) {
  const at = ((s && s.owned) || {})[CLOTH.id]; if (!at) return 0;
  return Object.keys(s.claimed || {}).filter((k) => { const m = /^dust:\d{4}-\d{2}-\d{2}:(\d+)$/.exec(k); return m && Number(m[1]) > DUST.perDay; }).length * DUST.coins;
}
export function buyCloth(s, now = Date.now()) {
  if (hasCloth(s)) return { s, ok: false, reason: 'Микрофибра уже куплена' };
  if (balance(s) < CLOTH.price) return { s, ok: false, reason: `Не хватает ${CLOTH.price - balance(s)} мон.` };
  const day = dayOf(now);
  return { s: { ...s, spent: { ...s.spent, [day]: ((s.spent || {})[day] || 0) + CLOTH.price }, owned: { ...s.owned, [CLOTH.id]: now } }, ok: true, price: CLOTH.price };
}

/* УЛУЧШЕНИЕ «ПОЛИРОЛЬ» (пункт владельца 19.11, п. 11: «придумай новое улучшение для протирки витрины»). Второе после
   микрофибры и только с ней: витрина, дотёртая до «Блестит!» (всё стекло чистое, не 90%), приносит ещё POLISH.bonus монету
   за ту же оплаченную витрину — ключ dust:<день>:<n>:shine, второй раз не выплатить. Окупается за
   POLISH.price / (bonus × витрин в день) = 6 дней, если каждую витрину дня дотирать до блеска; что уже вернула — polishReturn. */
export const POLISH = { id: 'dust-polish', price: 36, bonus: 1 };
export const hasPolish = (s) => !!((s && s.owned) || {})[POLISH.id];
export const shineKey = (day, n) => `${dustKey(day, n)}:shine`;
export const polishPaybackDays = () => Math.ceil(POLISH.price / (POLISH.bonus * (DUST.perDay + CLOTH.extra)));
export function polishReturn(s) {
  if (!hasPolish(s)) return 0;
  return Object.keys(s.claimed || {}).filter((k) => /^dust:\d{4}-\d{2}-\d{2}:\d+:shine$/.test(k)).length * POLISH.bonus;
}
export function buyPolish(s, now = Date.now()) {
  if (hasPolish(s)) return { s, ok: false, reason: 'Полироль уже куплена' };
  if (!hasCloth(s)) return { s, ok: false, reason: 'Сначала — микрофибра' };
  if (balance(s) < POLISH.price) return { s, ok: false, reason: `Не хватает ${POLISH.price - balance(s)} мон.` };
  const day = dayOf(now);
  return { s: { ...s, spent: { ...s.spent, [day]: ((s.spent || {})[day] || 0) + POLISH.price }, owned: { ...s.owned, [POLISH.id]: now } }, ok: true, price: POLISH.price };
}
// «Блестит!»: с полиролью — бонус за последнюю оплаченную сегодня витрину, если за её блеск ещё не платили
export function dustShine(s, now = Date.now()) {
  if (!hasPolish(s)) return s;
  const day = dayOf(now);
  for (let k = dustPerDay(s); k >= 1; k -= 1) {
    if (!hasClaim(s, dustKey(day, k))) continue;
    return hasClaim(s, shineKey(day, k)) ? s : earn(s, POLISH.bonus, shineKey(day, k), now);
  }
  return s;
}

// сколько витрин уже оплачено сегодня и сколько ещё можно
export function dustDone(s, now = Date.now()) {
  const day = dayOf(now);
  let n = 0;
  for (let k = 1; k <= dustPerDay(s); k += 1) if (hasClaim(s, dustKey(day, k))) n += 1;
  return n;
}
export const dustLeft = (s, now = Date.now()) => dustPerDay(s) - dustDone(s, now);
// монеты за протёртую витрину — в первый свободный слот дня; все заняты — ничего
export function dustClaim(s, now = Date.now()) {
  const day = dayOf(now);
  for (let k = 1; k <= dustPerDay(s); k += 1) if (!hasClaim(s, dustKey(day, k))) return earn(s, DUST.coins, dustKey(day, k), now);
  return s;
}
// что под пылью: n-я витрина дня — n-я вещь витрины дня; всё уже куплено — Инфля без обновки
export function dustItem(s, day, n = 0) {
  const list = shopDay(s, day).showcase;
  return list.length ? list[n % list.length] : null;
}

// сетка стекла: w×h — размер в точках, cell — сторона клетки; level(x, y) — пыль в точке (0…1)
export function dustGrid(w, h, cell, level = () => 1) {
  const cols = Math.max(1, Math.ceil(w / cell)); const rows = Math.max(1, Math.ceil(h / cell));
  const v = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) v[r * cols + c] = level((c + 0.5) * cell, (r + 0.5) * cell);
  return { cols, rows, cell, v };
}
// один мазок тряпки в точке (x, y)
export function wipeAt(g, x, y, r, strength = DUST.wipe) {
  const c0 = Math.max(0, Math.floor((x - r) / g.cell)); const c1 = Math.min(g.cols - 1, Math.floor((x + r) / g.cell));
  const r0 = Math.max(0, Math.floor((y - r) / g.cell)); const r1 = Math.min(g.rows - 1, Math.floor((y + r) / g.cell));
  for (let row = r0; row <= r1; row += 1) {
    for (let c = c0; c <= c1; c += 1) {
      const d = Math.hypot((c + 0.5) * g.cell - x, (row + 0.5) * g.cell - y);
      if (d < r) g.v[row * g.cols + c] *= 1 - strength * (1 - d / r);
    }
  }
}
// мазки вдоль движения тряпки: через треть радиуса, без начальной точки (она уже протёрта)
export function stampsAlong(x0, y0, x1, y1, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r / 3)));
  return Array.from({ length: n }, (_, k) => [x0 + ((x1 - x0) * (k + 1)) / n, y0 + ((y1 - y0) * (k + 1)) / n]);
}
// доля чистого стекла
export function cleanShare(g, thr = DUST.thr) {
  let n = 0;
  for (let i = 0; i < g.v.length; i += 1) if (g.v[i] < thr) n += 1;
  return n / g.v.length;
}
// что показать ученику: честная доля чистого стекла; 100% — только когда чисто всё (не округляем 99,6% до 100)
export const shownPercent = (share) => (share >= 1 ? 100 : Math.min(99, Math.floor(share * 100)));
// витрина засчитана — монеты; дотереть до 100% можно дальше
export const dustCounted = (share) => share >= DUST.clean;
