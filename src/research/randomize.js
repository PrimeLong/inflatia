/* Распределение по группам (research/methodology.md, «Рандомизация»): перемешанные блоки по 2 и 4 внутри слоя входного
   теста. В каждом блоке групп поровну, размер блока случаен — следующую группу нельзя угадать по предыдущим. Решает
   только сервер, после входного теста: участник и исследователь заранее группу не знают. Генератор с зерном — чтобы
   последовательность распределения можно было воспроизвести при проверке. */
import { ARMS, STRATA } from './dictionary.js';

// mulberry32: быстрый воспроизводимый генератор 0…1 от 32-битного зерна
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (list, rnd) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
export const BLOCK_SIZES = [2, 4];
// новый блок: размер 2 или 4, в нём каждой группы поровну, порядок перемешан
export function newBlock(rnd) {
  const size = BLOCK_SIZES[Math.floor(rnd() * BLOCK_SIZES.length)];
  return shuffle(Array.from({ length: size }, (_, i) => ARMS[i % ARMS.length]), rnd);
}
/* Состояние распределения: по слою — остаток текущего блока и счётчики. allocate возвращает группу и новое состояние,
   старое не меняет (сервер сохраняет новое атомарно вместе с записью участника). */
export const emptyAllocation = () => ({ strata: Object.fromEntries(STRATA.map((s) => [s, { queue: [], n: { game: 0, plain: 0 } }])) });
export function allocate(state, stratum, rnd) {
  if (!STRATA.includes(stratum)) throw new Error(`нет слоя ${stratum}`);
  const cur = state.strata[stratum];
  const queue = cur.queue.length ? [...cur.queue] : newBlock(rnd);
  const arm = queue.shift();
  const next = { ...state, strata: { ...state.strata, [stratum]: { queue, n: { ...cur.n, [arm]: cur.n[arm] + 1 } } } };
  return { arm, state: next };
}
// слой по входному тесту: доля верных ниже порога (по умолчанию половина задач) — «low»
export const stratumOf = (correct, total, cut = 0.5) => (total > 0 && correct / total >= cut ? 'high' : 'low');
