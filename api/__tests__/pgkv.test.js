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

  it('incrMany: пачка счётчиков одной командой — как incrby + expire на новом ключе; одновременные пачки атомарны', async () => {
    expect(await kv.incrMany([['cnt:a', 1], ['cnt:b', 5], ['cnt:a', 2]], 60)).toEqual([['cnt:a', 3], ['cnt:b', 5]]);
    const ttl = await kv.pttl('cnt:a');
    expect(ttl).toBeGreaterThan(50_000); expect(ttl).toBeLessThanOrEqual(60_000);
    // живой ключ сохраняет свой срок, значение растёт
    await kv.expire('cnt:b', 300);
    expect(await kv.incrMany([['cnt:b', 1]], 60)).toEqual([['cnt:b', 6]]);
    expect(await kv.pttl('cnt:b')).toBeGreaterThan(200_000);
    // без срока — бессрочно
    await kv.incrMany([['cnt:forever', 1]], 0);
    expect(await kv.pttl('cnt:forever')).toBe(-1);
    // истёкший — с нуля и с новым сроком
    await kv.expire('cnt:a', 0.001);
    await new Promise((r) => setTimeout(r, 15));
    expect(await kv.incrMany([['cnt:a', 1]], 60)).toEqual([['cnt:a', 1]]);
    expect(await kv.pttl('cnt:a')).toBeGreaterThan(50_000);
    // 20 одновременных пачек по трём ключам в разном порядке — без потерь и без взаимной блокировки
    await Promise.all(Array.from({ length: 20 }, (_, i) => kv.incrMany(i % 2 ? [['cnt:x', 1], ['cnt:y', 1], ['cnt:z', 1]] : [['cnt:z', 1], ['cnt:y', 1], ['cnt:x', 1]], 60)));
    expect(await kv.mget('cnt:x', 'cnt:y', 'cnt:z')).toEqual([20, 20, 20]);
    expect(await kv.incrMany([], 60)).toEqual([]);
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

/* Одна база (решение владельца 22.11.2026): данные Инфляции и исследование — две таблицы одной базы, общий пул.
   Исследование целиком — на настоящем PostgreSQL: запись из аккаунта (одновременно), распределение, отзыв, удаление набора. */
describe.skipIf(!URL_)('одна база: inflatia_kv и inflatia_research', () => {
  it('один ключ в двух таблицах — две разные записи; чужую таблицу не подставить; пул общий', async () => {
    const { RESEARCH_TABLE, sharedPool } = await import('../_lib/pgkv.js');
    const p = sharedPool(URL_);
    expect(sharedPool(URL_)).toBe(p);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}; DROP TABLE IF EXISTS ${RESEARCH_TABLE}`);
    const main = pgKv(p); const res = pgKv(p, { table: RESEARCH_TABLE });
    expect(() => pgKv(p, { table: 'users; DROP TABLE x' })).toThrow(/неизвестная таблица/);
    await main.set('rp:X', 'инфляция'); await res.set('rp:X', { arm: 'game' });
    expect(await main.get('rp:X')).toBe('инфляция');
    expect(await res.get('rp:X')).toEqual({ arm: 'game' });
    await res.del('rp:X');
    expect(await main.get('rp:X')).toBe('инфляция');
    expect(await main.count()).toBe(1); expect(await res.count()).toBe(0);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}; DROP TABLE IF EXISTS ${RESEARCH_TABLE}`);
  });
  it('исследование на PostgreSQL: один аккаунт — одно участие при одновременной записи; группа, отзыв и удаление набора', async () => {
    const { RESEARCH_TABLE, sharedPool } = await import('../_lib/pgkv.js');
    const { kvStore } = await import('../_lib/research-store.js');
    const { makeHandler, CONSENT_VERSION } = await import('../research.js');
    const { TEST_ITEMS } = await import('../../src/research/dictionary.js');
    const { keyFor } = await import('../_lib/research-key.js');
    const p = sharedPool(URL_);
    await p.query(`DROP TABLE IF EXISTS ${RESEARCH_TABLE}`);
    const st = kvStore(pgKv(p, { table: RESEARCH_TABLE }));
    const h = makeHandler({ status: 'open', store: () => st, seed: 'зерно-pg', exportToken: 'к', coin: () => true, whoIs: async (t) => (t ? { login: t, birthYear: 1990 } : null) });
    const call = (body, headers = {}) => new Promise((resolve) => {
      const r = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ status: this.code, data: d }); return this; } };
      h({ method: 'POST', query: {}, headers, body }, r);
    });
    const many = await Promise.all(Array.from({ length: 6 }, () => call({ action: 'enroll', adult: true, consent: CONSENT_VERSION, token: 'ann' })));
    expect(many.filter((r) => r.status === 200)).toHaveLength(1);
    const code = many.find((r) => r.status === 200).data.code;
    expect(await st.keys('rp:')).toEqual([`rp:${code}`]);
    await call({ action: 'form', code, kind: 'pre' });
    const items = TEST_ITEMS.map((id) => ({ item_id: id, answer: String(keyFor('A', id)) }));
    const pres = await Promise.all(Array.from({ length: 4 }, () => call({ action: 'pretest', code, form: 'A', items })));
    expect(pres.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await st.get(`rp:${code}`)).stratum).toBe('high');
    expect((await call({ action: 'resume', token: 'ann' })).data).toEqual({ code });
    // таблица данных Инфляции исследованием не тронута
    expect(Number((await p.query(`SELECT to_regclass('${TABLE}') IS NULL AS none`)).rows[0].none)).toBeTruthy();
    expect((await call({ action: 'withdraw', code })).data).toEqual({ ok: true });
    expect(await st.keys('rp:')).toEqual([]); expect(await st.keys('rl')).toEqual([]);
    const again = (await call({ action: 'enroll', adult: true, consent: CONSENT_VERSION, token: 'ann' })).data.code;
    expect(again).toBeTruthy();
    const purge = await call({ action: 'purge', confirm: 'УДАЛИТЬ НАБОР' }, { 'x-research-token': 'к' });
    expect(purge.data).toMatchObject({ ok: true, withdrawn: 1 });
    expect(await st.keys('r')).toEqual([]);
    await p.query(`DROP TABLE IF EXISTS ${RESEARCH_TABLE}`);
  });
});

describe.skipIf(!URL_)('резервная копия (scripts/db-backup.mjs)', () => {
  it('снять → проверить → развернуть в другой базе → сверить; испорченный файл — не проходит', async () => {
    const { dumpRows, writeBackup, readBackup, checkBackup, restoreRows, summarize } = await import('../../scripts/db-backup.mjs');
    const { RESEARCH_TABLE } = await import('../_lib/pgkv.js');
    const { mkdtempSync, readFileSync, writeFileSync } = await import('node:fs');
    const { gunzipSync, gzipSync } = await import('node:zlib');
    const { tmpdir } = await import('node:os');
    const p = poolFrom(URL_);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}; DROP TABLE IF EXISTS ${RESEARCH_TABLE}`);
    const main = pgKv(p); const res = pgKv(p, { table: RESEARCH_TABLE });
    await main.set('user:ann', { login: 'ann', name: 'Аня' }); await main.set('session:t', 'ann:0', { ex: 3600 });
    await main.hset('daily:2026-11-22', { p1: { score: 3 } }); await main.sadd('public_rooms', 'r1'); await main.rpush('reports', { id: 1 });
    await main.set('link:gone', 'x', { px: 1 });
    await res.set('rp:K', { arm: 'plain' }); await res.set('rla:ann', 'K');
    await new Promise((r) => setTimeout(r, 10));
    const rows = await dumpRows(p);
    expect(rows[TABLE].map((r) => r.k)).not.toContain('link:gone');
    const dir = mkdtempSync(`${tmpdir()}/bk-`); const file = `${dir}/b.jsonl.gz`;
    await writeBackup(file, rows);
    const backup = await readBackup(file);
    expect(checkBackup(backup).ok).toBe(true);
    expect(backup.head.tables[TABLE]).toMatchObject({ rows: 5, keys: 5 });
    expect(backup.head.tables[RESEARCH_TABLE]).toMatchObject({ rows: 2, keys: 2 });
    // развернуть «в другой базе» (здесь — та же тестовая база после очистки) и сверить
    await p.query(`DROP TABLE ${TABLE}; DROP TABLE ${RESEARCH_TABLE}`);
    const back = await restoreRows(p, backup.rows);
    expect(back).toEqual(summarize(rows));
    expect(await pgKv(p).get('user:ann')).toEqual({ login: 'ann', name: 'Аня' });
    expect(await pgKv(p).pttl('session:t')).toBeGreaterThan(3_000_000);
    expect(await pgKv(p).smembers('public_rooms')).toEqual(['r1']);
    expect(await pgKv(p, { table: RESEARCH_TABLE }).get('rla:ann')).toBe('K');
    // строка подменена — проверка ловит
    const text = gunzipSync(readFileSync(file)).toString().replace('Аня', 'Яна');
    writeFileSync(file, gzipSync(text));
    const bad = checkBackup(await readBackup(file));
    expect(bad.ok).toBe(false); expect(bad.problems[0]).toMatch(/хэш НЕ совпал/);
    await p.query(`DROP TABLE IF EXISTS ${TABLE}; DROP TABLE IF EXISTS ${RESEARCH_TABLE}`); await p.end();
  });
});

describe('резервная копия: Upstash в том же формате и сравнение копий', () => {
  it('копия Upstash строка в строку как в PostgreSQL; сравнение находит потерянные и изменённые ключи, значения не выводит', async () => {
    const { dumpUpstash, compareRows } = await import('../../scripts/db-backup.mjs');
    const data = {
      'user:ann': { type: 'string', v: { login: 'ann' }, ttl: -1 },
      'daily:d': { type: 'hash', v: { p1: { s: 3 } }, ttl: 600_000 },
      public_rooms: { type: 'set', v: ['r1'], ttl: -1 },
      reports: { type: 'list', v: [{ id: 1 }], ttl: -1 },
      'session:t': { type: 'string', v: 'ann:0', ttl: 60_000 },
    };
    const src = { scan: async () => ['0', Object.keys(data)], type: async (k) => data[k].type, pttl: async (k) => data[k].ttl,
      get: async (k) => data[k].v, hgetall: async (k) => data[k].v, smembers: async (k) => data[k].v, lrange: async (k) => data[k].v };
    const up = await dumpUpstash(src);
    expect(up[TABLE].map((r) => [r.k, r.f])).toEqual([['daily:d', 'p1'], ['public_rooms', 'r1'], ['reports', ''], ['session:t', ''], ['user:ann', '']]);
    expect(up[TABLE].find((r) => r.k === 'daily:d').exp).toBeGreaterThan(Date.now());
    const pgRows = { [TABLE]: up[TABLE].filter((r) => r.k !== 'public_rooms').map((r) => (r.k === 'user:ann' ? { ...r, v: { login: 'ann', xp: 1 } } : r)), inflatia_research: [] };
    const d = compareRows(up, pgRows)[TABLE];
    expect(d).toMatchObject({ keysA: 5, keysB: 4, onlyA: ['public_rooms'], onlyB: [], differ: ['user:ann'] });
  });
});
