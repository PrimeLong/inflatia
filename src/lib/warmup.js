/* ФОНОВАЯ ПОДГРУЗКА ДЛЯ ОФЛАЙНА (docs/mechanics.md, «Приветствие и загрузка»). Путь грузит только то, что нужно ему
   самому; урок, главы и учебник приходят по требованию. Чтобы урок открывался и без сети (поезд, метро), остальное
   догружается в фоне — service worker кладёт загруженные файлы в кэш (scripts/sw-template.js).

   Правила: не раньше, чем через WARMUP_DELAY_MS после появления Пути, и только когда браузер простаивает; не при
   экономии трафика (Save-Data) и не на медленной связи (2G); не в скрытой вкладке. Что именно догружать, решает
   тот, кто зовёт (src/learn.jsx): файл урока тянет за собой главы, формулы и графики. */
export const WARMUP_DELAY_MS = 4000;

// можно ли тратить трафик на то, что ученик ещё не открывал
export function warmupAllowed(nav = typeof navigator !== 'undefined' ? navigator : null, doc = typeof document !== 'undefined' ? document : null) {
  if (!nav) return false;
  const c = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  if (c && (c.saveData || /(^|-)2g$/.test(String(c.effectiveType || '')))) return false;
  if (nav.onLine === false) return false;
  if (doc && doc.visibilityState === 'hidden') return false;
  return true;
}

/* Запланировать подгрузку: load() — функция, которая делает import(). Возвращает отмену. Проверка «можно ли» —
   в момент запуска, а не планирования: за четыре секунды ученик мог включить экономию трафика или свернуть вкладку. */
export function scheduleWarmup(load, { delay = WARMUP_DELAY_MS, win = typeof window !== 'undefined' ? window : null, allowed = warmupAllowed } = {}) {
  if (!win) return () => {};
  let idle = null; let done = false;
  const run = () => { if (done) return; done = true; if (allowed()) { try { Promise.resolve(load()).catch(() => {}); } catch { /* нет сети — догрузится по требованию */ } } };
  const timer = win.setTimeout(() => {
    if (win.requestIdleCallback) idle = win.requestIdleCallback(run, { timeout: 10000 }); else run();
  }, delay);
  return () => { done = true; win.clearTimeout(timer); if (idle != null && win.cancelIdleCallback) win.cancelIdleCallback(idle); };
}
