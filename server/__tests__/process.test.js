/* Процесс сервера (server/index.js): слушает PORT на 0.0.0.0, без базы в ONREZA не запускается, по SIGTERM закрывается
   и выходит с кодом 0, начатый запрос успевает получить ответ. */
import { describe, it, expect } from 'vitest';
import { spawnServer, runServer } from './spawn.js';

const base = { PATH: process.env.PATH, HOME: process.env.HOME };

describe('процесс сервера', () => {
  it('без DATABASE_URL в ONREZA (ONREZA_ENV задан) — не запускается, с понятной ошибкой', async () => {
    const r = await runServer({ ...base, ONREZA_ENV: 'production', PORT: '0' });
    expect(r.code).toBe(1);
    expect(r.log).toContain('DATABASE_URL не задан');
  });
  it('локально без базы — только с явным ALLOW_MEMORY_STORE=1; слушает 0.0.0.0:PORT; SIGTERM — выход 0', async () => {
    const s = await spawnServer({ ...base, ALLOW_MEMORY_STORE: '1' });
    expect(s.log()).toMatch(/слушаю 0\.0\.0\.0:\d+, база: память/);
    const h = await (await fetch(`${s.url}/api/health`)).json();
    expect(h).toMatchObject({ db: 'memory', runtime: 'onreza-compute' });
    const out = await s.stop();
    expect(out.code).toBe(0);
    expect(out.log).toContain('SIGTERM, останавливаюсь');
    expect(out.log).toContain('остановлен');
  }, 30_000);
  it('Upstash в Compute не подключается, даже если его переменные заданы', async () => {
    const s = await spawnServer({ ...base, ALLOW_MEMORY_STORE: '1', KV_REST_API_URL: 'https://example.invalid', KV_REST_API_TOKEN: 'x' });
    try {
      const h = await (await fetch(`${s.url}/api/health`)).json();
      expect(h.db).toBe('memory');
    } finally { await s.stop(); }
  }, 30_000);
});
