/* Одноразовый перенос Upstash → PostgreSQL изнутри Vercel (api/migrate.js, docs/onreza.md): без секрета адреса нет,
   с чужим секретом — отказ; ответ — только числа. Параметры Prisma из строки ONREZA до pg не доходят. */
import { describe, it, expect, afterEach } from 'vitest';
import handler from '../migrate.js';
import { poolFrom } from '../_lib/pgkv.js';

const call = async (query) => {
  const out = {};
  const res = { setHeader: (k, v) => { out[k] = v; }, status(s) { out.status = s; return this; }, json(d) { out.data = d; return this; } };
  await handler({ method: 'GET', query }, res);
  return out;
};
const keep = process.env.MIGRATE_TOKEN;
afterEach(() => { if (keep === undefined) delete process.env.MIGRATE_TOKEN; else process.env.MIGRATE_TOKEN = keep; });

describe('/api/migrate', () => {
  it('без MIGRATE_TOKEN (или с коротким) — 404: после переноса адреса нет', async () => {
    delete process.env.MIGRATE_TOKEN;
    expect((await call({ token: 'x' })).status).toBe(404);
    process.env.MIGRATE_TOKEN = 'short';
    expect((await call({ token: 'short' })).status).toBe(404);
  });
  it('чужой секрет — 403; не кешируется', async () => {
    process.env.MIGRATE_TOKEN = 'a'.repeat(40);
    const r = await call({ token: 'b'.repeat(40) });
    expect(r.status).toBe(403);
    expect(r['Cache-Control']).toBe('no-store');
    expect((await call({})).status).toBe(403);
  });
});

describe('строка подключения ONREZA', () => {
  it('connection_limit и sslmode из панели ONREZA — не в pg; соединений не больше 3; сертификат проверяется', async () => {
    const p = poolFrom('postgresql://u:p%21x@ep-1.kaiki.ru:5432/app_database?sslmode=require&connection_limit=10');
    expect(p.options.connectionString).not.toMatch(/connection_limit|sslmode/);
    expect(p.options.max).toBe(3);
    expect(p.options.ssl).toEqual({ rejectUnauthorized: true });
    expect(poolFrom('postgresql://u:p@ep-1.kaiki.ru:5432/db?connection_limit=1').options.max).toBe(1);
    await p.end();
  });
});
