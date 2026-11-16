import { describe, it, expect } from 'vitest';
import { scrub, scrubStack, crashPayload, createCrashReporter, CRASH_PER_SESSION } from '../crash.js';

/* Сбои экрана (docs/mechanics.md, «Ошибки экрана»; пункт владельца 13.11): обезличенное сообщение с ограничением частоты. */
describe('сбой экрана: обезличенное сообщение', () => {
  it('из текста уходит всё личное: параметры адресов, почта, длинные числа и ключи', () => {
    expect(scrub('Failed to fetch https://site.example/api/account?token=abcdef0123456789abcdef0123456789&login=anna')).toBe('Failed to fetch https://site.example/api/account');
    expect(scrub('user anna@example.com not found')).toBe('user [почта] not found');
    expect(scrub('session 0123456789abcdef0123456789abcdef0123456789abcdef expired')).toBe('session [ключ] expired');
    expect(scrub('id 12345678901 bad')).toBe('id [число] bad');
    expect(scrub('x'.repeat(1000)).length).toBe(300);
    expect(scrub(null)).toBe('');
  });
  it('стек — первые шесть строк, тоже вычищенные', () => {
    const stack = Array.from({ length: 12 }, (_, k) => `at f${k} (https://site.example/assets/a.js?v=${k}:1:2)`).join('\n');
    const out = scrubStack(stack).split('\n');
    expect(out).toHaveLength(6);
    out.forEach((l) => expect(l).not.toContain('?v='));
  });
  it('в сообщении — только ошибка, экран, сборка и устройство', () => {
    const p = crashPayload(new Error('boom'), 'boundary', { path: '/book/gdp', build: 'abc1234 · 2026-11-13', device: 'UA', viewport: '360×640', login: 'anna', token: 't' });
    expect(Object.keys(p).sort()).toEqual(['action', 'build', 'device', 'kind', 'message', 'screen', 'stack', 'viewport']);
    expect(p).toMatchObject({ action: 'crash', kind: 'boundary', message: 'boom', screen: '/book/gdp' });
    expect(JSON.stringify(p)).not.toContain('anna');
    // не ошибка, а строка или пустота — тоже сообщение
    expect(crashPayload('строка', 'promise').message).toBe('строка');
    expect(crashPayload(undefined, 'promise').message).toBe('undefined');
  });
  it('частота: одна и та же ошибка — один раз, всего не больше трёх за открытие страницы', () => {
    const sent = []; const report = createCrashReporter({ send: (p) => sent.push(p) });
    expect(report(new Error('a'))).toBe(true);
    expect(report(new Error('a'))).toBe(false);
    for (let k = 0; k < 10; k += 1) report(new Error(`e${k}`));
    expect(sent).toHaveLength(CRASH_PER_SESSION);
    expect(CRASH_PER_SESSION).toBe(3);
  });
  it('сбой самого отчёта не всплывает', () => {
    const report = createCrashReporter({ send: () => { throw new Error('сеть'); } });
    expect(() => report(new Error('a'))).not.toThrow();
  });
});
