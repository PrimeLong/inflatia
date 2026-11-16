/* КУРС ПРИЛОЖЕНИЯ: экономика (у всех) или политология (проба — только для команды; docs/mechanics.md,
   «Политология — проба для команды»). Курс выбирается один раз, при запуске: от него строятся главы
   учебника (src/textbook/toc.js), а через них — юниты и уроки Пути, карта и уровни. Переключатель в
   «Настройки → Для команды» записывает выбор и перезапускает приложение.

   Политология включается, только если на этом устройстве выбран курс «politics» и сервер признал
   вошедшего командой (OWNER_LOGINS, как для сообщений об ошибках): логин команды запоминается при
   открытии настроек (TEAM_KEY). Другой аккаунт или выход — снова экономика. Модуль чистый: тесты
   передают хранилище сами. */
export const TRACK_KEY = 'ems-track';
export const TEAM_KEY = 'ems-team';
export const TRACKS = { econ: 'Экономика', politics: 'Политология' };

const lower = (x) => String(x || '').trim().toLowerCase();
export function trackFrom(store) {
  try {
    if (!store || store.getItem(TRACK_KEY) !== 'politics') return 'econ';
    const acc = JSON.parse(store.getItem('ems-account') || 'null');
    const team = lower(store.getItem(TEAM_KEY));
    return acc && acc.login && team && team === lower(acc.login) ? 'politics' : 'econ';
  } catch { return 'econ'; }
}
const store = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export const TRACK = trackFrom(store());

// сервер сказал, команда ли вошедший: да — запомнить логин; нет — забыть (и выключить политологию)
export function rememberTeam(login, isTeam) {
  const s = store();
  if (!s) return;
  try {
    if (isTeam && login) s.setItem(TEAM_KEY, lower(login));
    else { s.removeItem(TEAM_KEY); s.removeItem(TRACK_KEY); }
  } catch { /* приватный режим */ }
}
// переключить курс (только команда видит переключатель) и перезапустить приложение — с Пути нового курса:
// перезагрузка восстановила бы экран по адресу (настройки в профиле), а курс сменился
export function switchTrack(next, login) {
  const s = store();
  if (!s) return;
  try {
    if (next === 'politics') { s.setItem(TEAM_KEY, lower(login)); s.setItem(TRACK_KEY, 'politics'); } else s.removeItem(TRACK_KEY);
  } catch { /* приватный режим */ }
  if (typeof window !== 'undefined' && window.location) window.location.assign('/');
}
