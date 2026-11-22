/* ПОРЯДОК ВОПРОСОВ АЛМАЗНОГО ТЕСТА — не тот, в каком шли люди или страницы (пункт владельца 22.11, п. 8: «люди идут по порядку,
   нужно просто запомнить, кто за кем идёт»): ни один вопрос не стоит на своём месте из урока. order — случайное число на
   заход (у каждого захода свой порядок; при продолжении — тот же, он сохраняется с уроком); k вопроса не меняется */
export function quizOrder(items, order = 0) {
  if (items.length < 2) return items;
  let seed = (Math.floor(order) >>> 0) || 1;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  let idx = items.map((_, i) => i);
  for (let t = 0; t < 60; t += 1) {
    const a = items.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    idx = a;
    if (a.every((x, i) => x !== i)) break;
  }
  // запасной ход: сдвиг на один — тоже ни одного вопроса на своём месте
  if (!idx.every((x, i) => x !== i)) idx = items.map((_, i) => (i + 1) % items.length);
  return idx.map((i) => items[i]);
}
