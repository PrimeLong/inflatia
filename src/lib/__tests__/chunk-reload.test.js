/* Жалоба ученика 16.11, вечер: экран упал с «Failed to fetch dynamically imported module: …/assets/learn-Mk-1KRoX.js» —
   страница была открыта, а на сайт выложили новую сборку. Такая ошибка должна приводить к одной перезагрузке, а не к сбою. */
import { describe, it, expect, vi } from 'vitest';
import { isChunkError, reloadOnce, installChunkReload, RELOAD_GAP, RELOAD_KEY } from '../chunk-reload.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };

describe('новая сборка во время занятия', () => {
  it('узнаёт ошибку подгрузки части в разных браузерах и не путает с другими', () => {
    expect(isChunkError(new TypeError('Failed to fetch dynamically imported module: https://inflatia.ru/assets/learn-Mk-1KRoX.js'))).toBe(true);
    expect(isChunkError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkError(new Error('Unable to preload CSS for /assets/learn-x.css'))).toBe(true);
    expect(isChunkError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isChunkError(null)).toBe(false);
  });
  it('перезагружает один раз; повторная ошибка вскоре — уже не перезагружает (нет круга)', () => {
    const store = mem(); const reload = vi.fn();
    expect(reloadOnce({ store, now: 1_000_000, reload })).toBe(true);
    expect(store.getItem(RELOAD_KEY)).toBe('1000000');
    expect(reloadOnce({ store, now: 1_000_000 + 5_000, reload })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadOnce({ store, now: 1_000_000 + RELOAD_GAP + 1, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('событие Vite о неудачной подгрузке и необработанный отказ import() — перезагрузка', () => {
    const handlers = {}; const win = { addEventListener: (t, f) => { handlers[t] = f; } };
    const reload = vi.fn(); let t = 0;
    installChunkReload(win, { store: mem(), get now() { t += RELOAD_GAP * 2; return t; }, reload });
    const ev = { preventDefault: vi.fn() };
    handlers['vite:preloadError'](ev);
    expect(reload).toHaveBeenCalledTimes(1); expect(ev.preventDefault).toHaveBeenCalled();
    handlers.unhandledrejection({ reason: new Error('boom'), preventDefault: vi.fn() });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
