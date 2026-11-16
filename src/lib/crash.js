/* СБОИ ЭКРАНА (docs/mechanics.md, «Ошибки экрана»): необработанная ошибка страницы — из ErrorBoundary,
   window.onerror и unhandledrejection — уходит владельцам обезличенным сообщением (api/reports.js, действие crash):
   текст ошибки, место в коде, адрес экрана без параметров, сборка, строка браузера и размер окна. Ни логина, ни ника,
   ни сессии, ни ответов ученика в нём нет; из текста вычищается всё, что могло бы в него попасть.

   Частота: не больше CRASH_PER_SESSION сообщений за одно открытие страницы и одна и та же ошибка — один раз;
   на сервере — свой предел по адресу. Ошибка в самом отчёте о сбое проглатывается: он не должен мешать учёбе. */
import { isChunkError } from './chunk-reload.js';

export const CRASH_PER_SESSION = 3;
export const CRASH_API = '/api/reports';

// из текста — ничего личного: адреса без параметров, почты и длинные числа и ключи закрыты
export function scrub(text, max = 300) {
  return String(text == null ? '' : text)
    .replace(/https?:\/\/[^\s)'"]+/g, (u) => { try { const x = new URL(u); return `${x.origin}${x.pathname}`; } catch { return '[адрес]'; } })
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[почта]')
    .replace(/\b[0-9a-f]{24,}\b/gi, '[ключ]')
    .replace(/\b\d{7,}\b/g, '[число]')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}
// стек — только первые строки: имена функций и файлы сборки
export const scrubStack = (stack, lines = 6) => String(stack || '').split('\n').slice(0, lines).map((l) => scrub(l, 200)).filter(Boolean).join('\n');

// что уходит на сервер; kind — откуда: boundary (экран не отрисовался), error (window.onerror), promise (unhandledrejection)
export function crashPayload(error, kind, env = {}) {
  const e = error && typeof error === 'object' ? error : { message: String(error) };
  return {
    action: 'crash', kind,
    message: scrub(e.message || e.reason || String(error)) || 'неизвестная ошибка',
    stack: scrubStack(e.stack),
    screen: scrub(env.path || '', 80),
    build: scrub(env.build || '', 60),
    device: scrub(env.device || '', 200),
    viewport: scrub(env.viewport || '', 30),
  };
}

export function createCrashReporter({ send, env = () => ({}), limit = CRASH_PER_SESSION } = {}) {
  const seen = new Set(); let sent = 0;
  return function report(error, kind = 'error') {
    try {
      if (sent >= limit) return false;
      const p = crashPayload(error, kind, env());
      const sig = p.message; // одна и та же ошибка — по тексту: место в коде у неё может отличаться номером строки
      if (seen.has(sig)) return false;
      seen.add(sig); sent += 1;
      send(p);
      return true;
    } catch { return false; }
  };
}

let shared = null;
const browserEnv = () => ({
  path: typeof location !== 'undefined' ? location.pathname : '',
  build: typeof __BUILD__ !== 'undefined' ? __BUILD__ : '',
  device: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  viewport: typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '',
});
const post = (payload) => {
  if (typeof fetch !== 'function') return;
  fetch(CRASH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
};
// общий отправитель страницы: ErrorBoundary и обработчики окна считают сообщения вместе
export function reportCrash(error, kind = 'error') {
  if (!shared) shared = createCrashReporter({ send: post, env: browserEnv });
  return shared(error, kind);
}
// обработчики окна — один раз при запуске (src/main.tsx)
export function installCrashHandlers(win = typeof window !== 'undefined' ? window : null) {
  if (!win || win.__emsCrash) return;
  win.__emsCrash = true;
  // новая сборка на сайте (старой части приложения уже нет) — не сбой: страница перезагрузится сама (src/lib/chunk-reload.js)
  win.addEventListener('error', (ev) => { if (ev && (ev.error || ev.message) && !isChunkError(ev.error || ev.message)) reportCrash(ev.error || { message: ev.message, stack: `${ev.filename || ''}:${ev.lineno || 0}` }, 'error'); });
  win.addEventListener('unhandledrejection', (ev) => { if (!isChunkError(ev && ev.reason)) reportCrash(ev && ev.reason, 'promise'); });
}
