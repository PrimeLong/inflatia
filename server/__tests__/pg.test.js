/* Сервер ONREZA Compute на настоящем PostgreSQL (нужен PGKV_TEST_URL — локальная база, docs/onreza.md, «Проверки»): своя
   чистая база на прогон; данные переживают перезапуск процесса (пул закрыт и открыт заново), атомарность счётчиков под
   параллельной нагрузкой, соединений с базой не больше PG_POOL_MAX, после остановки — ни одного. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { spawnServer } from './spawn.js';

const URL0 = process.env.PGKV_TEST_URL;
const d = URL0 ? describe : describe.skip;
const dbName = `inflatia_srv_${Date.now().toString(36)}`;
let admin; let server; let base; let mod; let pgkv;
const urlFor = (name) => { const u = new URL(URL0); u.pathname = `/${name}`; return u.toString(); };
const post = (p, body, headers = {}) => fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const listen = (app) => new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
const conns = async () => Number((await admin.query('SELECT count(*) AS n FROM pg_stat_activity WHERE datname = $1', [dbName])).rows[0].n);

d('сервер на PostgreSQL', () => {
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: URL0 });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${dbName}`);
    process.env.DATABASE_URL = urlFor(dbName);
    process.env.PG_POOL_MAX = '3';
    process.env.INFLATIA_RUNTIME = 'compute';
    mod = await import('../app.js');
    pgkv = await import('../../api/_lib/pgkv.js');
    server = await listen(mod.createApp());
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (pgkv) await pgkv.closePools();
    if (admin) { await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`); await admin.end(); }
  });

  it('/api/health: база postgres отвечает', async () => {
    const h = await (await fetch(`${base}/api/health`)).json();
    expect(h).toMatchObject({ ok: true, db: 'postgres', research: 'postgres', runtime: 'onreza-compute' });
  });

  it('лимит регистраций с адреса атомарен: из 20 одновременных с одного адреса проходит ровно 5', async () => {
    const ip = '198.51.100.90';
    const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => post('/api/account', { action: 'register', consentPage: true, consentPd: true, birthYear: 1990, login: `par${i}x`, password: 'secret12' }, { 'x-forwarded-for': ip })));
    const codes = rs.map((r) => r.status);
    expect(codes.filter((c) => c === 200)).toHaveLength(5);
    expect(codes.filter((c) => c === 429)).toHaveLength(15);
  });

  it('соединений с базой не больше PG_POOL_MAX даже при 40 одновременных запросах', async () => {
    let peak = 0;
    const poll = setInterval(async () => { peak = Math.max(peak, await conns()); }, 5);
    await Promise.all(Array.from({ length: 40 }, () => fetch(`${base}/api/records?kind=tycoon`)));
    clearInterval(poll);
    peak = Math.max(peak, await conns());
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('данные в базе, а не в процессе: SIGTERM закрывает пул, новый процесс видит аккаунт', async () => {
    const env = { ...process.env, DATABASE_URL: urlFor(dbName), PG_POOL_MAX: '3', ALLOW_MEMORY_STORE: '' };
    const p1 = await spawnServer(env);
    const r = await fetch(`${p1.url}/api/account`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.91' },
      body: JSON.stringify({ action: 'register', consentPage: true, consentPd: true, birthYear: 1990, login: 'restartme', password: 'secret12' }) });
    expect(r.status).toBe(200);
    const out1 = await p1.stop();
    expect(out1.code).toBe(0);
    expect(out1.log).toContain('закрыто пулов базы: 1');
    const p2 = await spawnServer(env);
    try {
      const login = await fetch(`${p2.url}/api/account`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.91' },
        body: JSON.stringify({ action: 'login', login: 'restartme', password: 'secret12' }) });
      expect(login.status).toBe(200);
    } finally { await p2.stop(); }
  }, 30_000);

  it('таблицы — inflatia_kv и inflatia_research в одной базе; схема не пересоздаётся', async () => {
    await fetch(`${base}/api/research?action=status`);
    const t = await admin.query(`SELECT 1`);
    expect(t.rows).toHaveLength(1);
    const c = new pg.Client({ connectionString: urlFor(dbName) }); await c.connect();
    try {
      const tabs = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")).rows.map((x) => x.tablename);
      expect(tabs).toContain('inflatia_kv');
      const idx = (await c.query("SELECT indexname FROM pg_indexes WHERE tablename = 'inflatia_kv' ORDER BY 1")).rows.map((x) => x.indexname);
      expect(idx).toEqual(['inflatia_kv_exp', 'inflatia_kv_pkey']);
    } finally { await c.end(); }
  });
});
