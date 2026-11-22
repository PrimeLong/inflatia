/* База на ONREZA (docs/onreza.md): управляемый PostgreSQL вместо Upstash Redis, сайт и функции остаются на Vercel.
   Здесь — те команды Redis, которыми пользуется сервер (api/_lib/store.js, api/_lib/research-store.js), поверх одной
   таблицы. Код обработчиков не меняется: он получает клиента с теми же методами и теми же ответами, что у @upstash/redis.

   Таблица inflatia_kv (данные Инфляции) или inflatia_research (исследование — та же база, своя таблица; цели и доступ —
   research/data-dictionary.md, раздел 1): k — ключ, f — поле ('' у обычного значения; поле хэша; элемент множества), v — значение (jsonb),
   exp — когда истекает (мс с 1970, NULL — бессрочно). Строки одного ключа — это значение, хэш или множество; типы у
   ключей сервера не пересекаются. Истёкшие строки не читаются и подчищаются заодно с записью (раз в сотню вызовов).
   Атомарность как в Redis: incr, set nx, rpush — одна команда SQL. */
import pg from 'pg';

export const TABLE = 'inflatia_kv';
export const RESEARCH_TABLE = 'inflatia_research';
const TABLES = new Set([TABLE, RESEARCH_TABLE, 'inflatia_kv_test', 'inflatia_research_test']);
const schemaOf = (t) => `CREATE TABLE IF NOT EXISTS ${t} (
  k text NOT NULL, f text NOT NULL DEFAULT '', v jsonb, exp bigint, PRIMARY KEY (k, f));
CREATE INDEX IF NOT EXISTS ${t}_exp ON ${t} (exp) WHERE exp IS NOT NULL;`;
const live = 'AND (exp IS NULL OR exp > $NOW)';

/* Подключение: строка DATABASE_URL из панели ONREZA (режим Pooled). Сертификат проверяется всегда; если ONREZA
   подписывает его своим центром (например, Russian Trusted Root CA), этот корневой сертификат кладут в DATABASE_CA. */
export function poolFrom(url, ca = '', maxConn = 3) {
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1', ''].includes(u.hostname) || u.searchParams.get('host');
  // параметры Prisma из строки панели ONREZA (connection_limit, pool_timeout) — не для pg: лимит соединений берём, но не больше 3
  const limit = Number(u.searchParams.get('connection_limit')) || maxConn;
  ['sslmode', 'sslrootcert', 'connection_limit', 'pool_timeout', 'pgbouncer', 'schema'].forEach((k) => u.searchParams.delete(k));
  return new pg.Pool({
    connectionString: u.toString(),
    ssl: local ? false : (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true }),
    max: Math.max(1, Math.min(maxConn, limit)), idleTimeoutMillis: 10_000, connectionTimeoutMillis: 8_000,
  });
}

/* Один пул на функцию: база одна (DATABASE_URL), и данные Инфляции, и исследование ходят через одни и те же ≤3 соединения
   (у PgBouncer ONREZA лимит соединений на базу). */
const pools = new Map();
export function sharedPool(url, ca = '') {
  const key = `${url}\n${ca}`;
  if (!pools.has(key)) pools.set(key, poolFrom(url, ca));
  return pools.get(key);
}

// glob Redis (solo:*, rp:*) → LIKE; спецсимволы LIKE в ключах экранируются
const likeOf = (glob) => glob.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, '%');
const msOf = (opts) => (opts && opts.ex ? Date.now() + opts.ex * 1000 : opts && opts.px ? Date.now() + opts.px : null);

export function pgKv(pool, { table = TABLE } = {}) {
  // имя таблицы подставляется в SQL — только из известного списка
  if (!TABLES.has(table)) throw new Error(`pgkv: неизвестная таблица ${table}`);
  const TABLE = table;
  let ready = null; let calls = 0;
  const q = async (sql, params = []) => {
    if (!ready) ready = pool.query(schemaOf(TABLE)).catch((e) => { ready = null; throw e; });
    await ready;
    // $NOW — «сейчас» для всех проверок срока в одной команде
    const now = Date.now();
    const text = sql.replaceAll('$NOW', String(now));
    if ((calls += 1) % 100 === 0) pool.query(`DELETE FROM ${TABLE} WHERE exp IS NOT NULL AND exp < $1`, [now]).catch(() => {});
    return pool.query(text, params);
  };
  const one = async (k) => { const r = await q(`SELECT v FROM ${TABLE} WHERE k = $1 AND f = '' ${live}`, [k]); return r.rows.length ? r.rows[0].v : null; };
  const incrBy = async (k, n) => {
    // истёкший счётчик начинается заново и без срока — как новый ключ в Redis
    const r = await q(`INSERT INTO ${TABLE} (k, f, v, exp) VALUES ($1, '', to_jsonb($2::bigint), NULL)
      ON CONFLICT (k, f) DO UPDATE SET
        v = to_jsonb(CASE WHEN ${TABLE}.exp IS NOT NULL AND ${TABLE}.exp <= $NOW THEN 0 ELSE COALESCE((${TABLE}.v #>> '{}')::bigint, 0) END + $2::bigint),
        exp = CASE WHEN ${TABLE}.exp IS NOT NULL AND ${TABLE}.exp <= $NOW THEN NULL ELSE ${TABLE}.exp END
      RETURNING v`, [k, n]);
    return Number(r.rows[0].v);
  };
  return {
    kind: 'postgres',
    table: TABLE,
    get: one,
    async set(k, v, opts = {}) {
      const exp = msOf(opts);
      if (opts.nx) {
        // записать, только если ключа нет или он истёк
        const r = await q(`INSERT INTO ${TABLE} (k, f, v, exp) VALUES ($1, '', $2::jsonb, $3)
          ON CONFLICT (k, f) DO UPDATE SET v = EXCLUDED.v, exp = EXCLUDED.exp WHERE ${TABLE}.exp IS NOT NULL AND ${TABLE}.exp <= $NOW
          RETURNING k`, [k, JSON.stringify(v), exp]);
        return r.rowCount ? 'OK' : null;
      }
      await q(`INSERT INTO ${TABLE} (k, f, v, exp) VALUES ($1, '', $2::jsonb, $3)
        ON CONFLICT (k, f) DO UPDATE SET v = EXCLUDED.v, exp = EXCLUDED.exp`, [k, JSON.stringify(v), exp]);
      return 'OK';
    },
    async del(...ks) { if (!ks.length) return 0; const r = await q(`DELETE FROM ${TABLE} WHERE k = ANY($1::text[]) RETURNING k`, [ks]); return new Set(r.rows.map((x) => x.k)).size; },
    async expire(k, seconds) { const r = await q(`UPDATE ${TABLE} SET exp = $2 WHERE k = $1 ${live}`, [k, Date.now() + seconds * 1000]); return r.rowCount ? 1 : 0; },
    async mget(...ks) {
      if (!ks.length) return [];
      const r = await q(`SELECT k, v FROM ${TABLE} WHERE k = ANY($1::text[]) AND f = '' ${live}`, [ks]);
      const m = new Map(r.rows.map((x) => [x.k, x.v]));
      return ks.map((k) => (m.has(k) ? m.get(k) : null));
    },
    incr: (k) => incrBy(k, 1),
    incrby: (k, n) => incrBy(k, n),
    // хэш: поле — f; пустой хэш — null, как у Upstash
    async hgetall(k) {
      const r = await q(`SELECT f, v FROM ${TABLE} WHERE k = $1 AND f <> '' ${live}`, [k]);
      return r.rows.length ? Object.fromEntries(r.rows.map((x) => [x.f, x.v])) : null;
    },
    async hset(k, obj) {
      const fields = Object.keys(obj);
      if (!fields.length) return 0;
      // новое поле берёт срок хэша, если он есть (как поле внутри одного ключа Redis)
      await q(`INSERT INTO ${TABLE} (k, f, v, exp)
        SELECT $1, f, v, (SELECT max(exp) FROM ${TABLE} WHERE k = $1 AND f <> '' ${live}) FROM unnest($2::text[], $3::jsonb[]) AS t(f, v)
        ON CONFLICT (k, f) DO UPDATE SET v = EXCLUDED.v`, [k, fields, fields.map((f) => JSON.stringify(obj[f]))]);
      return fields.length;
    },
    async hdel(k, ...fields) { if (!fields.length) return 0; const r = await q(`DELETE FROM ${TABLE} WHERE k = $1 AND f = ANY($2::text[])`, [k, fields.filter(Boolean)]); return r.rowCount; },
    // множество: элемент — f, значения нет
    async sadd(k, ...members) {
      const ms = members.flat().map(String).filter(Boolean);
      if (!ms.length) return 0;
      const r = await q(`INSERT INTO ${TABLE} (k, f, v, exp) SELECT $1, m, NULL, NULL FROM unnest($2::text[]) AS m ON CONFLICT (k, f) DO NOTHING`, [k, ms]);
      return r.rowCount;
    },
    async srem(k, ...members) { const r = await q(`DELETE FROM ${TABLE} WHERE k = $1 AND f = ANY($2::text[])`, [k, members.flat().map(String)]); return r.rowCount; },
    async smembers(k) { const r = await q(`SELECT f FROM ${TABLE} WHERE k = $1 AND f <> '' ${live}`, [k]); return r.rows.map((x) => x.f); },
    // список — массив jsonb в одном значении
    async rpush(k, ...vals) {
      const r = await q(`INSERT INTO ${TABLE} (k, f, v, exp) VALUES ($1, '', $2::jsonb, NULL)
        ON CONFLICT (k, f) DO UPDATE SET v = COALESCE(${TABLE}.v, '[]'::jsonb) || EXCLUDED.v
        RETURNING jsonb_array_length(v) AS n`, [k, JSON.stringify(vals)]);
      return Number(r.rows[0].n);
    },
    async lrange(k, start, stop) {
      const list = (await one(k)) || [];
      const end = stop < 0 ? list.length + stop + 1 : stop + 1;
      return list.slice(start, end);
    },
    // scan: все подходящие ключи за один проход — курсор сразу '0'
    async scan(_cursor, { match = '*' } = {}) {
      const r = await q(`SELECT DISTINCT k FROM ${TABLE} WHERE k LIKE $1 ${live} ORDER BY k`, [likeOf(match)]);
      return ['0', r.rows.map((x) => x.k)];
    },
    // для переноса из Upstash и проверки: «что за ключ», срок в мс
    async pttl(k) { const r = await q(`SELECT max(exp) AS exp, count(*) AS n FROM ${TABLE} WHERE k = $1 ${live}`, [k]); const { exp, n } = r.rows[0]; return Number(n) === 0 ? -2 : exp == null ? -1 : Number(exp) - Date.now(); },
    ping: async () => { await q('SELECT 1'); return 'PONG'; },
    // сколько живых ключей в таблице — для проверки переноса и резервной копии (scripts/db-backup.mjs)
    count: async () => Number((await q(`SELECT count(DISTINCT k) AS n FROM ${TABLE} WHERE true ${live}`)).rows[0].n),
    end: () => pool.end(),
  };
}

/* клиент по переменным окружения: null — переменной нет (тогда store.js берёт Upstash или память). Одна база: таблица
   данных Инфляции и таблица исследования — через общий пул DATABASE_URL */
export function pgKvFromEnv(name = 'DATABASE_URL', { table = TABLE } = {}) {
  const url = process.env[name];
  if (!url) return null;
  return pgKv(sharedPool(url, process.env.DATABASE_CA || ''), { table });
}
