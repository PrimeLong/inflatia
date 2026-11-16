/* Распределение по группам (research/methodology.md, «Рандомизация»): перемешанные блоки по 2 и 4 внутри слоя входного
   теста. В каждом блоке групп поровну, размер блока случаен — следующую группу нельзя угадать по предыдущим. Решает
   только сервер, после входного теста: участник и исследователь заранее группу не знают.

   Последовательность целиком задаётся зерном (RESEARCH_ALLOC_SEED): группа n-го участника слоя — armAt(зерно, слой, n), без
   Math.random. До запуска в журнал протокола записывается хэш зерна, само зерно раскрывается при анализе — так распределение
   можно воспроизвести и проверить, а заранее угадать нельзя. Номер участника в слое выдаёт атомарный счётчик базы
   (api/research.js) — поэтому одновременные записи не получают одну и ту же позицию. */
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
// зерно слоя: из общего зерна и имени слоя (FNV-1a), чтобы слои шли независимыми последовательностями
const strataSeed = (seed, stratum) => [...`${seed}:${stratum}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
// первые n групп слоя — блоками по 2 и 4
export function allocationSequence(seed, stratum, n) {
  if (!STRATA.includes(stratum)) throw new Error(`нет слоя ${stratum}`);
  const rnd = seededRandom(strataSeed(seed, stratum));
  const out = [];
  while (out.length < n) out.push(...newBlock(rnd));
  return out.slice(0, n);
}
// группа участника с номером index (с нуля) в слое
export const armAt = (seed, stratum, index) => allocationSequence(seed, stratum, index + 1)[index];
// слой по входному тесту: доля верных ниже порога (по умолчанию половина задач) — «low»
export const stratumOf = (correct, total, cut = 0.5) => (total > 0 && correct / total >= cut ? 'high' : 'low');
