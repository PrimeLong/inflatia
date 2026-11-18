/* НОВАЯ СБОРКА ВО ВРЕМЯ ЗАНЯТИЯ (docs/mechanics.md, «Ошибки экрана»). Части приложения грузятся по требованию
   (React.lazy, import()). Если пока страница была открыта, на сайт выложили новую сборку, старых файлов частей
   (assets/learn-<хеш>.js) на сервере уже нет — браузер пишет «Failed to fetch dynamically imported module», и экран
   падал (жалоба ученика 16.11, вечер). Теперь такая ошибка — не сбой: страница один раз сама перезагружается и берёт
   новую сборку; прогресс хранится на устройстве и на сервере и не теряется. Перезагрузка — не чаще раза в RELOAD_GAP мс,
   чтобы при настоящей поломке сети страница не перезагружалась по кругу: тогда показывается обычный экран ошибки. */
export const RELOAD_KEY = 'ems-chunk-reload-at';
export const RELOAD_GAP = 60_000;

const CHUNK_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk [\w-]+ failed|'text\/html' is not a valid JavaScript MIME type/i;
export const isChunkError = (e) => !!e && CHUNK_RE.test(String((e && (e.message || e.reason)) || e));

// перезагрузка уже идёт (на этой странице) — экран ошибки не показываем, а пишем «Вышло обновление»
let pending = false;
export const reloadPending = () => pending;
// перезагрузить один раз; true — перезагрузка началась
export function reloadOnce({ store = safeSession(), now = Date.now(), reload = () => window.location.reload() } = {}) {
  if (pending) return true;
  try {
    const last = Number(store && store.getItem(RELOAD_KEY)) || 0;
    if (now - last < RELOAD_GAP) return false;
    if (store) store.setItem(RELOAD_KEY, String(now));
  } catch { /* хранилище недоступно — всё равно перезагружаем: иначе экран так и останется сломанным */ }
  pending = true;
  reload();
  return true;
}
export const _resetPendingForTest = () => { pending = false; };
function safeSession() { try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; } }

// Vite сам сообщает о неудачной подгрузке части событием vite:preloadError; отказ import() без обёртки — unhandledrejection
export function installChunkReload(win = typeof window !== 'undefined' ? window : null, opts = {}) {
  if (!win || win.__emsChunk) return;
  win.__emsChunk = true;
  /* ошибку Vite не отменяем (preventDefault): отменённая, она превращала import() в «пустой» модуль, и React.lazy падал
     с «Cannot read properties of undefined (reading 'default')» раньше перезагрузки (сбой в лавке, 17.11). Пусть ошибка
     идёт как есть — ErrorBoundary узнаёт её и показывает «Вышло обновление», а страница уже перезагружается */
  win.addEventListener('vite:preloadError', () => { reloadOnce(opts); });
  win.addEventListener('unhandledrejection', (ev) => { if (ev && isChunkError(ev.reason) && reloadOnce(opts) && ev.preventDefault) ev.preventDefault(); });
}
