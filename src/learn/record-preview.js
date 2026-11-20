/* ФРАГМЕНТ ПЛАСТИНКИ В ЛАВКЕ (docs/mechanics.md, «Лавка», пластинки). Один на всю лавку: включили другую пластинку —
   первая замолкает, а проигрыватель так и стоит на паузе до конца последнего фрагмента (пункт владельца 20.11, п. 5:
   «включить платную пластинку, потом другую — включится проигрыватель»: раньше каждая пластинка держала паузу сама
   и, замолкая, отпускала проигрыватель). Пока запись грузится — состояние 'loading' (п. 4: «нажимаешь — ничего не
   происходит, она грузится»); не загрузилась или не включилась за timeoutMs — 'idle' с failed: id, и видно, что
   случилось (п. 3: «нельзя прослушать, если музыка не включена» — раньше сбой молча гасил пластинку).
   Модуль без React и без звука: элемент записи и проигрыватель передаются снаружи — так его можно проверить. */
export const PREVIEW = { seconds: 20, timeoutMs: 15000 };

export function createPreview({ make, music, seconds = PREVIEW.seconds, timeoutMs = PREVIEW.timeoutMs,
  setTimer = (f, ms) => setTimeout(f, ms), clearTimer = (t) => clearTimeout(t), now = () => Date.now() }) {
  let cur = null; let held = false;
  let snap = { id: null, status: 'idle', startedAt: 0, failed: null };
  const subs = new Set();
  const set = (s) => { snap = s; subs.forEach((f) => f()); };
  const releaseMusic = () => { if (held) { held = false; try { music.resume(); } catch { /* проигрыватель недоступен */ } } };
  // остановить текущую запись, не трогая проигрыватель (переключение на другую пластинку)
  const drop = () => {
    if (!cur) return;
    const c = cur; cur = null;
    c.off(); clearTimer(c.wait); clearTimer(c.limit);
    try { c.a.pause(); } catch { /* уже остановлена */ }
  };
  const stop = () => { drop(); set({ id: null, status: 'idle', startedAt: 0, failed: null }); releaseMusic(); };
  const fail = (id) => { drop(); set({ id: null, status: 'idle', startedAt: 0, failed: id }); releaseMusic(); };

  function play(id, url) {
    if (cur && cur.id === id) { stop(); return; }
    drop();
    if (!held && music.playing()) { music.pause(); held = true; }
    const a = make(url);
    const c = { id, a, wait: null, limit: null, off: () => {} }; cur = c;
    const started = () => {
      if (cur !== c || snap.status === 'playing') return;
      clearTimer(c.wait);
      set({ id, status: 'playing', startedAt: now(), failed: null });
      c.limit = setTimer(() => { if (cur === c) stop(); }, seconds * 1000);
    };
    const ended = () => { if (cur === c) stop(); };
    const broke = () => { if (cur === c) fail(id); };
    const ev = { playing: started, ended, pause: ended, error: broke };
    Object.entries(ev).forEach(([k, f]) => a.addEventListener(k, f));
    c.off = () => Object.entries(ev).forEach(([k, f]) => a.removeEventListener(k, f));
    set({ id, status: 'loading', startedAt: 0, failed: null });
    c.wait = setTimer(() => { if (cur === c && snap.status === 'loading') fail(id); }, timeoutMs);
    let p;
    try { p = a.play(); } catch { broke(); return; }
    if (p && typeof p.then === 'function') p.then(started, broke);
  }
  // пластинка ушла с экрана: её фрагмент — стоп
  const leave = (id) => { if (cur && cur.id === id) stop(); };
  return { play, stop, leave, get: () => snap, subscribe: (f) => { subs.add(f); return () => subs.delete(f); } };
}
