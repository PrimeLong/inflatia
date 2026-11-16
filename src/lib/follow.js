/* ПЛАВНЫЙ ГРАФИК ЗА ПОЛЗУНКОМ (docs/mechanics.md, «График с ползунками»). Сцена идёт за значениями ползунков, как
   груз на пружине с критическим затуханием: скорость меняется непрерывно, перелёта нет. Новая цель посреди пути
   ничего не перезапускает — меняется только то, куда едем, а набранная скорость остаётся.
   Прежний переход начинался заново на каждый шаг ползунка, каждый раз с рывка: шаг — рывок — замедление — снова
   рывок; на глаз это «анимация багается» и при быстром, и при медленном движении (пункт владельца 15.11). */
export const FOLLOW = { omega: 0.022, eps: 0.002, maxDt: 64 }; // omega — 1/мс: доезжает примерно за 0,35 с

/* один кадр: cur — что нарисовано, target — куда едем, dt — мс с прошлого кадра, span — размах каждого значения
   (для порога «доехали»), vel — скорости с прошлого кадра. Возвращает { values, vel, done }.
   Нечисловые значения (переключатели) и новые ключи — сразу. */
export function followStep(cur, target, dt, span = null, vel = null) {
  const t = Math.min(FOLLOW.maxDt, Math.max(0, dt)); const w = FOLLOW.omega; const e = Math.exp(-w * t);
  const values = { ...target }; const next = {}; let done = true;
  Object.keys(target).forEach((k) => {
    const to = target[k]; const from = cur ? cur[k] : undefined;
    if (typeof to !== 'number' || typeof from !== 'number') return;
    const tol = FOLLOW.eps * Math.max(1e-9, (span && span[k]) || Math.abs(to) || 1);
    const y0 = from - to; const v0 = (vel && vel[k]) || 0;
    if (Math.abs(y0) <= tol && Math.abs(v0) * 16 <= tol) return;
    // точное решение y'' + 2w·y' + w²·y = 0 — устойчиво при любом dt
    const c = v0 + w * y0;
    const y = (y0 + c * t) * e; const v = (v0 - w * c * t) * e;
    if (Math.abs(y) <= tol && Math.abs(v) * 16 <= tol) return;
    values[k] = to + y; next[k] = v; done = false;
  });
  return { values, vel: next, done };
}
