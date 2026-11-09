/* «МИР» НА ПРОБУ (docs/mechanics.md, «„Мир“ на пробу — без регистрации»): с приветствия можно сразу сыграть
   в «Мир», без аккаунта и уроков. Проба — TRIAL_SECONDS игры: время идёт, только пока «Мир» на экране и
   вкладка видна. Время вышло — окно «Пробная игра окончена»: партия сохранена, чтобы продолжить, нужно
   зарегистрироваться, а «Мир» снова откроется, как у всех, после 10-го урока. Отметка пробы — на устройстве
   (TRIAL_KEY): { at — когда начали, used — сколько секунд сыграно, ended — когда кончилась }. Модуль чистый:
   хранилище передаётся (тесты дают своё). */
export const TRIAL_KEY = 'ems-world-trial';
export const TRIAL_SECONDS = 10 * 60;
export const WORLD_TRIAL = 'ems-world-trial-start';
export const WORLD_TRIAL_END = 'ems-world-trial-end';

const ls = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function trialOf(store = ls()) {
  try {
    const v = JSON.parse((store && store.getItem(TRIAL_KEY)) || 'null');
    if (!v || typeof v !== 'object') return null;
    const n = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
    return { at: n(v.at), used: n(v.used), ended: n(v.ended) };
  } catch { return null; }
}
const write = (v, store) => { try { if (store) store.setItem(TRIAL_KEY, JSON.stringify(v)); } catch { /* приватный режим: проба на одну вкладку */ } };
export const trialActive = (store = ls()) => { const t = trialOf(store); return !!t && !t.ended; };
export const trialEnded = (store = ls()) => { const t = trialOf(store); return !!(t && t.ended); };
// длительность пробы: в автотесте её можно укоротить (window.__INFLATIA_TRIAL_SECONDS__ при window.__INFLATIA_TEST__)
export const trialLimit = () => {
  try { if (typeof window !== 'undefined' && window.__INFLATIA_TEST__ && Number(window.__INFLATIA_TRIAL_SECONDS__) > 0) return Number(window.__INFLATIA_TRIAL_SECONDS__); } catch { /* нет окна */ }
  return TRIAL_SECONDS;
};
export const trialLeft = (store = ls(), limit = trialLimit()) => { const t = trialOf(store); return t ? Math.max(0, limit - t.used) : limit; };

// начать пробу (повторно — не сбрасывает уже сыгранное время)
export function startTrial(now = Date.now(), store = ls()) {
  const t = trialOf(store);
  if (!t) write({ at: now, used: 0, ended: 0 }, store);
  return trialOf(store);
}
/* прошло sec секунд игры: копим; дошли до предела — проба кончилась (ended), возвращает true один раз,
   в тот самый момент */
export function tickTrial(sec, now = Date.now(), store = ls(), limit = trialLimit()) {
  const t = trialOf(store);
  if (!t || t.ended) return false;
  const used = Math.min(limit, t.used + Math.max(0, sec));
  const ended = used >= limit ? now : 0;
  write({ ...t, used, ended }, store);
  return !!ended;
}

/* «Мир» после пробы: идёт проба — открыт; кончилась — закрыт, пока нет аккаунта, а с аккаунтом — по обычному
   правилу (после 10-го урока, src/learn/unlocks.js). Пробы не было — решает обычное правило (null). */
export function trialWorldOpen({ hasAccount = false, store = ls() } = {}) {
  const t = trialOf(store);
  if (!t) return null;
  if (!t.ended) return true;
  return hasAccount ? null : false;
}

// с приветствия — в «Мир»: проба и гость, оболочка открывает вкладку «Мир»
export function startWorldTrial(now = Date.now()) {
  startTrial(now);
  try { localStorage.setItem('ems-guest', JSON.stringify({ at: now, trial: true })); } catch { /* приватный режим */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WORLD_TRIAL));
}
