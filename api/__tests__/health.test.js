/* /api/health: какая база подключена — без данных и строк подключения (docs/onreza.md, шаг 5). */
import { describe, it, expect } from 'vitest';
import handler from '../health.js';

const call = async () => {
  const out = {};
  const res = { setHeader: (k, v) => { out[k] = v; }, status(s) { out.status = s; return this; }, json(d) { out.data = d; return this; } };
  await handler({ method: 'GET', query: {} }, res);
  return out;
};

describe('/api/health', () => {
  it('без базы: memory, ok=false; ответ не кешируется', async () => {
    const r = await call();
    expect(r.status).toBe(200);
    expect(r['Cache-Control']).toBe('no-store');
    expect(r.data).toMatchObject({ ok: process.env.DATABASE_URL ? true : false, db: process.env.DATABASE_URL ? 'postgres' : 'memory' });
    expect(Object.keys(r.data).sort()).toEqual(['db', 'env', 'ok', 'region', 'research', 'runtime']);
    if (process.env.DATABASE_URL) expect(JSON.stringify(r.data)).not.toContain(new URL(process.env.DATABASE_URL).hostname);
  });
});
