/* ПОДПИСИ ГРАФИКА НЕ ПРЫГАЮТ (docs/mechanics.md, «График с ползунками»). Место подписи считается заново на каждый
   кадр, и у него есть разрывы: кривая стала уходить за другой край поля, подпись перевернулась на другую сторону
   точки, сменила выравнивание. Пока график едет за ползунком, подпись от этого скакала на десятки пикселей —
   это и выглядело как «анимация багается» (пункт владельца 15.11).
   Здесь — память о том, где подпись нарисована: если её место за кадр ушло дальше порога (GLIDE.jump), подпись
   остаётся, где была, и доезжает до нового места плавно (смещение гаснет по экспоненте, GLIDE.tau).
   Обычное движение вместе с кривой — мельче порога — проходит без задержки. */
export const GLIDE = { jump: 12, tau: 110, eps: 0.4 };

export const newGlide = () => ({ at: new Map(), off: new Map() });

/* место подписи key на этот кадр: (x, y) — куда её ставит расчёт; ответ — где рисовать */
export function glideAt(g, key, x, y) {
  const prev = g.at.get(key); const off = g.off.get(key) || { x: 0, y: 0 };
  g.at.set(key, { x, y });
  if (prev) {
    const dx = x - prev.x; const dy = y - prev.y;
    if (Math.hypot(dx, dy) > GLIDE.jump) { off.x -= dx; off.y -= dy; g.off.set(key, off); }
  }
  return { x: x + off.x, y: y + off.y };
}
/* прошло dt мс: смещения гаснут; ответ — остались ли ещё не погасшие (нужен следующий кадр) */
export function glideDecay(g, dt) {
  const k = Math.exp(-Math.max(0, dt) / GLIDE.tau); let live = false;
  g.off.forEach((o, key) => {
    o.x *= k; o.y *= k;
    if (Math.hypot(o.x, o.y) < GLIDE.eps) g.off.delete(key); else live = true;
  });
  return live;
}
// подписи, которых в этом кадре нет, забываются: появится снова — встанет сразу на место
export function glideKeep(g, keys) {
  const keep = new Set(keys);
  [...g.at.keys()].forEach((k) => { if (!keep.has(k)) { g.at.delete(k); g.off.delete(k); } });
}
