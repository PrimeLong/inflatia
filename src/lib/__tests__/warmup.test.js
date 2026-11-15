import { describe, it, expect, vi } from 'vitest';
import { warmupAllowed, scheduleWarmup, WARMUP_DELAY_MS } from '../warmup.js';

/* Фоновая подгрузка для офлайна (docs/mechanics.md, «Приветствие и загрузка»; пункт владельца 13.11): после простоя
   и не при экономии трафика. */
describe('фоновая подгрузка для офлайна', () => {
  it('разрешена на обычной связи; нет — при экономии трафика, на 2G, без сети и в скрытой вкладке', () => {
    expect(warmupAllowed({ onLine: true }, { visibilityState: 'visible' })).toBe(true);
    expect(warmupAllowed({ onLine: true, connection: { saveData: false, effectiveType: '4g' } }, null)).toBe(true);
    expect(warmupAllowed({ onLine: true, connection: { saveData: true, effectiveType: '4g' } }, null)).toBe(false);
    expect(warmupAllowed({ onLine: true, connection: { effectiveType: '2g' } }, null)).toBe(false);
    expect(warmupAllowed({ onLine: true, connection: { effectiveType: 'slow-2g' } }, null)).toBe(false);
    expect(warmupAllowed({ onLine: false }, null)).toBe(false);
    expect(warmupAllowed({ onLine: true }, { visibilityState: 'hidden' })).toBe(false);
    expect(warmupAllowed(null, null)).toBe(false);
  });
  it('запускается не сразу, а после задержки и простоя браузера; отмена — ничего не грузит', () => {
    vi.useFakeTimers();
    const idle = []; const load = vi.fn(() => Promise.resolve());
    const win = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (id) => clearTimeout(id), requestIdleCallback: (f) => { idle.push(f); return idle.length; }, cancelIdleCallback: () => { idle.length = 0; } };
    scheduleWarmup(load, { win, allowed: () => true });
    vi.advanceTimersByTime(WARMUP_DELAY_MS - 1);
    expect(idle.length).toBe(0); expect(load).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(idle.length).toBe(1); expect(load).not.toHaveBeenCalled(); // ждём простоя
    idle[0]();
    expect(load).toHaveBeenCalledTimes(1);
    // отмена до задержки
    const load2 = vi.fn(); const cancel = scheduleWarmup(load2, { win, allowed: () => true });
    cancel(); vi.advanceTimersByTime(WARMUP_DELAY_MS * 2);
    expect(load2).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('проверка «можно ли» — в момент запуска: включили экономию трафика за время ожидания — не грузим', () => {
    vi.useFakeTimers();
    let ok = true; const load = vi.fn();
    const win = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (id) => clearTimeout(id) };
    scheduleWarmup(load, { win, allowed: () => ok });
    ok = false;
    vi.advanceTimersByTime(WARMUP_DELAY_MS);
    expect(load).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
