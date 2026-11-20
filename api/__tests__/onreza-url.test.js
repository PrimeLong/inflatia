/* Строка подключения ONREZA (docs/onreza.md): параметры Prisma из панели до pg не доходят, соединений немного,
   сертификат проверяется. Одноразовый адрес переноса /api/migrate удалён 20.11, после переключения сайта. */
import { describe, it, expect } from 'vitest';
import { poolFrom } from '../_lib/pgkv.js';

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
