/* Распределение по группам (research/methodology.md, «Рандомизация»): схема «большая палка» (big stick, Soares & Wu, 1983)
   внутри слоя входного теста. Каждый участник — честная монета, пока перекос между группами в слое меньше MAX_IMBALANCE;
   на границе следующий идёт в отстающую группу. Раньше были перемешанные блоки по 2 и 4: зная прошлые назначения, следующую
   группу угадывали в ~72% случаев (в блоке из двух вторая всегда известна); у «большой палки» с перекосом до 3 — ~58%,
   почти как у монеты (50%), а группы всё равно не расходятся больше чем на 3 (замечание владельца 18.11, п. 4).
   Решает только сервер, после входного теста: участник и исследователь заранее группу не знают.

   Последовательность целиком задаётся зерном (RESEARCH_ALLOC_SEED): группа n-го участника слоя — armAt(зерно, слой, n), без
   Math.random. До запуска в журнал протокола записывается хэш зерна, само зерно раскрывается при анализе — так распределение
   можно воспроизвести и проверить, а заранее угадать нельзя. Номер участника в слое выдаёт атомарный счётчик базы
   (api/research.js) — поэтому одновременные записи не получают одну и ту же позицию. */
import { STRATA } from './dictionary.js';

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
// допустимый перекос между группами внутри слоя
export const MAX_IMBALANCE = 3;
// следующая группа по «большой палке»: d — сколько в game больше, чем в plain
export const bigStickNext = (d, rnd, mti = MAX_IMBALANCE) => (d >= mti ? 'plain' : d <= -mti ? 'game' : rnd() < 0.5 ? 'game' : 'plain');
// зерно слоя: из общего зерна и имени слоя (FNV-1a), чтобы слои шли независимыми последовательностями
const strataSeed = (seed, stratum) => [...`${seed}:${stratum}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
// первые n групп слоя
export function allocationSequence(seed, stratum, n) {
  if (!STRATA.includes(stratum)) throw new Error(`нет слоя ${stratum}`);
  const rnd = seededRandom(strataSeed(seed, stratum));
  const out = []; let d = 0;
  while (out.length < n) { const arm = bigStickNext(d, rnd); out.push(arm); d += arm === 'game' ? 1 : -1; }
  return out;
}
/* Насколько угадывается следующая группа, если знать все прошлые назначения слоя (стратегия сходимости: ставить на
   отстающую группу, при равенстве — монета). 0,5 — не угадывается совсем; проверка сокрытия распределения. */
export function guessRate(arms) {
  let right = 0; let d = 0;
  for (const a of arms) { right += d === 0 ? 0.5 : (d > 0) === (a === 'plain') ? 1 : 0; d += a === 'game' ? 1 : -1; }
  return arms.length ? right / arms.length : 0.5;
}
// группа участника с номером index (с нуля) в слое
export const armAt = (seed, stratum, index) => allocationSequence(seed, stratum, index + 1)[index];
// слой по входному тесту: доля верных ниже порога (по умолчанию половина задач) — «low»
export const stratumOf = (correct, total, cut = 0.5) => (total > 0 && correct / total >= cut ? 'high' : 'low');
