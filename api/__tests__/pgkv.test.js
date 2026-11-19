/* База на ONREZA (docs/onreza.md): адаптер api/_lib/pgkv.js отвечает на команды так же, как @upstash/redis, — на настоящем
   PostgreSQL. Нужна тестовая база: PGKV_TEST_URL (например, postgresql://test@localhost:54329/postgres?host=/tmp); без неё
   тест пропускается. Таблица — своя для прогона, после прогона удаляется. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pgKv, poolFrom, TABLE } from '../_lib/pgkv.js';

const URL_ = process.env.PGKV_TEST_URL;
let kv = null; let pool = null;

describe.skipIf(!URL_)('pgkv: команды Redis поверх PostgreSQL', () => {
  beforeAll(async () => {
    pool = poolFrom(URL_);
    await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
    kv = pgKv(pool);
  });
  afterAll(async () => { if (pool) { await pool.query(`DROP TABLE IF EXISTS ${TABLE}`); await pool.end(); } });

  it('get/set: объект, строка и число возвращаются как были; нет ключа — null', async () => {
    expect(await kv.get('nope')).toBeNull();
    expect(await kv.set('user:ann', { login: 'ann', xp: 5, tags: ['a'] })).toBe('OK');
    expect(await kv.get('user:ann')).toEqual({ login: 'ann', xp: 5, tags: ['a'] });
    await kv.set('session:t1', 'ann');
    expect(await kv.get('session:t1')).toBe('ann');
    await kv.set('n', 7);
    expect(await kv.get('n')).toBe(7);
  });

  it('срок жизни: ex — истёкший ключ не читается; expire продлевает; pttl', async () => {
    await kv.set('link:old', { a: 1 }, { px: 1 });
    await new Promise((r) => setTimeout(r, 15));
    expect(await kv.get('link:old')).toBeNull();
    await kv.set('room:1', { id: 1 }, { ex: 60 });
    expect(await kv.pttl('room:1')).toBeGreaterThan(50_000);
    expect(await kv.pttl('user:ann')).toBe(-1);
    expect(await kv.pttl('nope')).toBe(-2);
    expect(await kv.expire('user:ann', 100)).toBe(1);
    expect(await kv.pttl('user:ann')).toBeGreaterThan(90_000);
  });

  it('set nx: второй раз не пишет, после истечения — пишет (блокировка исследования)', async () => {
    expect(await kv.set('rlock:a', 1, { nx: true, ex: 30 })).toBe('OK');
    expect(await kv.set('rlock:a', 2, { nx: true, ex: 30 })).toBeNull();
    expect(await kv.get('rlock:a')).toBe(1);
    await kv.set('rlock:b', 1, { nx: true, px: 1 });
    await new Promise((r) => setTimeout(r, 15));
    expect(await kv.set('rlock:b', 2, { nx: true })).toBe('OK');
    expect(await kv.get('rlock:b')).toBe(2);
  });

  it('incr/incrby: атомарно при одновременных вызовах; истёкший счётчик начинается с нуля', async () => {
    const got = await Promise.all(Array.from({ length: 25 }, () => kv.incr('hit:ip')));
    expect(got.sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(await kv.incrby('cnt:min', 30)).toBe(30);
    expect(await kv.incrby('cnt:min', 12)).toBe(42);
    await kv.expire('cnt:min', 0.001);
    await new Promise((r) => setTimeout(r, 15));
    expect(await kv.incr('cnt:min')).toBe(1);
    expect(await kv.pttl('cnt:min')).toBe(-1);
  });

  it('mget: в порядке ключей, отсутствующие — null', async () => {
    expect(await kv.mget('user:ann', 'nope', 'session:t1')).toEqual([expect.objectContaining({ login: 'ann' }), null, 'ann']);
    expect(await kv.mget()).toEqual([]);
  });

  it('хэш: hset/hgetall/hdel; пустой — null; новое поле берёт срок хэша', async () => {
    expect(await kv.hgetall('daily:2026-11-19')).toBeNull();
    await kv.hset('daily:2026-11-19', { p1: { score: 3 }, p2: { score: 5 } });
    await kv.expire('daily:2026-11-19', 1000);
    await kv.hset('daily:2026-11-19', { p3: { score: 1 }, p1: { score: 9 } });
    expect(await kv.hgetall('daily:2026-11-19')).toEqual({ p1: { score: 9 }, p2: { score: 5 }, p3: { score: 1 } });
    const r = await pool.query(`SELECT count(*) AS n FROM ${TABLE} WHERE k = 'daily:2026-11-19' AND exp IS NULL`);
    expect(Number(r.rows[0].n)).toBe(0);
    expect(await kv.hdel('daily:2026-11-19', 'p2', 'p3')).toBe(2);
    expect(Object.keys(await kv.hgetall('daily:2026-11-19'))).toEqual(['p1']);
  });

  it('множество: sadd без повторов, srem, smembers', async () => {
    expect(await kv.sadd('public_rooms', 'r1')).toBe(1);
    expect(await kv.sadd('public_rooms', 'r1')).toBe(0);
    await kv.sadd('public_rooms', 'r2');
    expect((await kv.smembers('public_rooms')).sort()).toEqual(['r1', 'r2']);
    await kv.srem('public_rooms', 'r1');
    expect(await kv.smembers('public_rooms')).toEqual(['r2']);
    expect(await kv.smembers('nope')).toEqual([]);
  });

  it('список: rpush возвращает длину, lrange 0 -1 — весь список по порядку', async () => {
    expect(await kv.rpush('re:abc', { t: 1 })).toBe(1);
    expect(await kv.rpush('re:abc', { t: 2 })).toBe(2);
    const all = await Promise.all([kv.rpush('re:abc', { t: 3 }), kv.rpush('re:abc', { t: 4 })]);
    expect(all.sort()).toEqual([3, 4]);
    expect((await kv.lrange('re:abc', 0, -1)).map((x) => x.t).sort()).toEqual([1, 2, 3, 4]);
    expect(await kv.lrange('nope', 0, -1)).toEqual([]);
  });

  it('del: удаляет значение, хэш и множество целиком; scan по шаблону; «_» и «%» в ключе — буквально', async () => {
    await kv.set('solo:p1', { a: 1 }); await kv.set('solo:p2', { a: 2 }); await kv.set('solox', 1); await kv.set('a_b', 1); await kv.set('axb', 1);
    const [cursor, keys] = await kv.scan(0, { match: 'solo:*', count: 200 });
    expect(cursor).toBe('0');
    expect(keys).toEqual(['solo:p1', 'solo:p2']);
    expect((await kv.scan(0, { match: 'a_*' }))[1]).toEqual(['a_b']);
    expect(await kv.del('solo:p1', 'public_rooms', 'daily:2026-11-19', 'nope')).toBe(3);
    expect(await kv.get('solo:p1')).toBeNull();
    expect(await kv.hgetall('daily:2026-11-19')).toBeNull();
    expect(await kv.smembers('public_rooms')).toEqual([]);
  });
});

describe('pgkv: подключение', () => {
  it('удалённая база — только с проверкой сертификата; свой корневой сертификат — из DATABASE_CA; sslmode из строки не мешает', () => {
    const remote = poolFrom('postgresql://u:p@endpoint.kaiki.onreza.ru:5432/db?sslmode=require');
    expect(remote.options.ssl).toEqual({ rejectUnauthorized: true });
    expect(remote.options.connectionString).not.toContain('sslmode');
    const withCa = poolFrom('postgresql://u:p@endpoint.kaiki.onreza.ru:5432/db', '-----BEGIN CERTIFICATE-----x');
    expect(withCa.options.ssl).toEqual({ ca: '-----BEGIN CERTIFICATE-----x', rejectUnauthorized: true });
    expect(poolFrom('postgresql://test@localhost:5432/db').options.ssl).toBe(false);
    return Promise.all([remote.end(), withCa.end()]);
  });
});

describe.skipIf(!URL_)('перенос из Upstash (scripts/upstash-to-onreza.mjs)', () => {
  it('значения, хэши, множества и списки переходят тем же видом и со сроком; повтор — тот же результат', async () => {
    const { copyAll } = await import('../../scripts/upstash-to-onreza.mjs');
    const p = poolFrom(URL_);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}`);
    const dst = pgKv(p);
    // поддельный Upstash: те же ответы type/pttl/scan, две страницы scan
    const data = {
      'user:ann': { type: 'string', v: { login: 'ann' }, ttl: -1 },
      'session:t': { type: 'string', v: 'ann', ttl: 120_000 },
      'cnt:x': { type: 'string', v: 12, ttl: -1 },
      'daily:2026-11-19': { type: 'hash', v: { p1: { score: 3 } }, ttl: 600_000 },
      public_rooms: { type: 'set', v: ['r1', 'r2'], ttl: -1 },
      're:abc': { type: 'list', v: [{ t: 1 }, { t: 2 }], ttl: -1 },
    };
    const keys = Object.keys(data);
    const src = {
      scan: async (c) => (Number(c) === 0 ? ['3', keys.slice(0, 3)] : ['0', keys.slice(3)]),
      type: async (k) => data[k].type, pttl: async (k) => data[k].ttl,
      get: async (k) => data[k].v, hgetall: async (k) => data[k].v, smembers: async (k) => data[k].v, lrange: async (k) => data[k].v,
    };
    const counts = await copyAll(src, dst);
    expect(counts).toEqual({ string: 3, hash: 1, set: 1, list: 1 });
    await copyAll(src, dst);
    expect(await dst.get('user:ann')).toEqual({ login: 'ann' });
    expect(await dst.get('cnt:x')).toBe(12);
    expect(await dst.pttl('session:t')).toBeGreaterThan(100_000);
    expect(await dst.hgetall('daily:2026-11-19')).toEqual({ p1: { score: 3 } });
    expect(await dst.pttl('daily:2026-11-19')).toBeGreaterThan(500_000);
    expect((await dst.smembers('public_rooms')).sort()).toEqual(['r1', 'r2']);
    expect(await dst.lrange('re:abc', 0, -1)).toEqual([{ t: 1 }, { t: 2 }]);
    expect(await copyAll(src, null, { dryRun: true })).toEqual({ string: 3, hash: 1, set: 1, list: 1 });
    // --missing: свежее значение в PostgreSQL не затирается, недостающий ключ переносится
    await dst.set('user:ann', { login: 'ann', xp: 99 });
    await dst.del('public_rooms');
    expect(await copyAll(src, dst, { missing: true })).toEqual({ kept: 5, set: 1 });
    expect(await dst.get('user:ann')).toEqual({ login: 'ann', xp: 99 });
    expect((await dst.smembers('public_rooms')).sort()).toEqual(['r1', 'r2']);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}`); await p.end();
  });
});
