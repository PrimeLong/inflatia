/* Звуки ответа в темах урока (docs/mechanics.md, «Темы урока»): у каждой темы своя пара [верно, неверно]
   из src/audio/engine.js; без темы — общие «монетка» и «вниз». Модуль чистый: его читают урок и тесты. */
export const SKIN_SOUNDS = { exchange: ['ex-up', 'ex-down'], mint: ['mint-up', 'mint-down'], blueprint: ['bp-up', 'bp-down'], aurora: ['au-up', 'au-down'] };
export const PLAIN_SOUNDS = ['coin', 'down'];
export const answerSound = (skin, ok) => ((skin && SKIN_SOUNDS[skin.key]) || PLAIN_SOUNDS)[ok ? 0 : 1];

/* График котировок «Биржи» плывёт по кругу (сдвиг на половину ширины): линия — два одинаковых периода,
   конец периода сходится с началом, поэтому на стыке круга график не прыгает (docs/mechanics.md).
   Ответ — точки [x, y] на x от 0 до 200 (период — 100), y от 8 до 92. */
export function loopWalk(n, seed, amp) {
  let y = 50; let x = seed; const ys = [];
  for (let i = 0; i < n; i += 1) { x = (x * 9301 + 49297) % 233280; y = Math.max(12, Math.min(88, y + ((x / 233280) - 0.48) * amp)); ys.push(y); }
  const drift = ys[n - 1] - ys[0];
  const loop = ys.map((v, i) => Math.max(8, Math.min(92, v - (drift * i) / (n - 1))));
  const pts = loop.map((v, i) => [(i / (n - 1)) * 100, v]);
  return [...pts, ...pts.slice(1).map(([px, py]) => [px + 100, py])];
}
