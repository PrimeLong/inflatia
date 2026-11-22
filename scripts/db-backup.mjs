#!/usr/bin/env node
/* Резервная копия базы ONREZA своими силами (docs/onreza.md, «Резервные копии»). Дополняет восстановление на момент времени
   (PITR) самой ONREZA: копия лежит у владельца, её можно проверить, развернув в другой базе. Нужен только Node.js и строка
   подключения — pg_dump нужной версии ставить не надо.

     DATABASE_URL=… node scripts/db-backup.mjs                          # снять копию → inflatia-backup-<дата>.jsonl.gz
     node scripts/db-backup.mjs --check inflatia-backup-….jsonl.gz       # проверить файл: целостность и число строк
     RESTORE_URL=… node scripts/db-backup.mjs --restore inflatia-backup-….jsonl.gz
                                                                         # развернуть в ДРУГОЙ базе (ветка ONREZA, локальная)
                                                                         # и сверить строки — так копия «проверенная»
     KV_REST_API_URL=… KV_REST_API_TOKEN=… node scripts/db-backup.mjs --upstash upstash-….jsonl.gz
                                                                         # копия старого Upstash в том же формате (до удаления)
     node scripts/db-backup.mjs --compare upstash-….jsonl.gz inflatia-backup-….jsonl.gz
                                                                         # что из Upstash есть в ONREZA: ключи, которых нет,
                                                                         # и ключи с другим значением — только имена и числа

   Что внутри: обе таблицы базы — inflatia_kv (данные Инфляции) и inflatia_research (исследование) — строка в строку
   (ключ, поле, значение, срок), первая строка — заголовок с числом строк и хэшем по таблицам. Это персональные данные:
   файл хранить зашифрованным, не в репозитории и не в облаке без шифрования; сколько хранить — решение владельца
   (docs/legal-todo.md). Сами значения на экран не выводятся — только числа.
   Разворачивать в рабочую базу скрипт отказывается: RESTORE_URL не может совпадать с DATABASE_URL. */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGunzip, createGzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { poolFrom, pgKv, TABLE, RESEARCH_TABLE } from '../api/_lib/pgkv.js';
import { copyKey } from '../api/_lib/kv-copy.js';

export const BACKUP_TABLES = [TABLE, RESEARCH_TABLE];
const FORMAT = 'inflatia-backup/1';

const rowLine = (table, r) => JSON.stringify({ t: table, k: r.k, f: r.f, v: r.v, exp: r.exp == null ? null : Number(r.exp) });

// снять копию: все живые строки обеих таблиц (истёкшие не нужны); таблицы, которой ещё нет, — пустая
export async function dumpRows(pool, { now = Date.now() } = {}) {
  const out = {};
  for (const t of BACKUP_TABLES) {
    await pgKv(pool, { table: t }).ping(); // создаёт таблицу, если её нет: в копии всегда обе
    const r = await pool.query(`SELECT k, f, v, exp FROM ${t} WHERE exp IS NULL OR exp > $1 ORDER BY k, f`, [now]);
    out[t] = r.rows;
  }
  return out;
}
export function summarize(rows) {
  const tables = {};
  for (const t of BACKUP_TABLES) {
    const h = createHash('sha256');
    (rows[t] || []).forEach((r) => h.update(`${rowLine(t, r)}\n`));
    tables[t] = { rows: (rows[t] || []).length, keys: new Set((rows[t] || []).map((r) => r.k)).size, sha256: h.digest('hex') };
  }
  return tables;
}
export async function writeBackup(file, rows, meta = {}) {
  const gz = createGzip(); const ws = createWriteStream(file, { mode: 0o600 });
  gz.pipe(ws);
  gz.write(`${JSON.stringify({ format: FORMAT, createdAt: new Date().toISOString(), tables: summarize(rows), ...meta })}\n`);
  for (const t of BACKUP_TABLES) for (const r of rows[t] || []) gz.write(`${rowLine(t, r)}\n`);
  gz.end();
  await once(ws, 'finish');
}
export async function readBackup(file) {
  const rl = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  let head = null; const rows = Object.fromEntries(BACKUP_TABLES.map((t) => [t, []]));
  for await (const line of rl) {
    if (!line) continue;
    const x = JSON.parse(line);
    if (!head) { head = x; if (head.format !== FORMAT) throw new Error(`не тот формат файла: ${head.format}`); continue; }
    if (!rows[x.t]) throw new Error(`неизвестная таблица в копии: ${x.t}`);
    rows[x.t].push({ k: x.k, f: x.f, v: x.v, exp: x.exp });
  }
  if (!head) throw new Error('пустой файл');
  return { head, rows };
}
// файл цел: число строк и хэш каждой таблицы совпадают с заголовком
export function checkBackup({ head, rows }) {
  const got = summarize(rows); const problems = [];
  for (const t of BACKUP_TABLES) {
    const want = head.tables[t];
    if (!want) problems.push(`${t}: нет в заголовке`);
    else if (want.rows !== got[t].rows || want.sha256 !== got[t].sha256) problems.push(`${t}: строк ${got[t].rows} из ${want.rows}, хэш ${got[t].sha256 === want.sha256 ? 'совпал' : 'НЕ совпал'}`);
  }
  return { ok: problems.length === 0, problems, tables: got };
}
// развернуть копию в пустые таблицы другой базы и сверить, что в ней ровно то же
export async function restoreRows(pool, rows) {
  for (const t of BACKUP_TABLES) {
    await pgKv(pool, { table: t }).ping();
    await pool.query(`TRUNCATE ${t}`);
    const list = rows[t] || [];
    for (let i = 0; i < list.length; i += 500) {
      const part = list.slice(i, i + 500);
      await pool.query(`INSERT INTO ${t} (k, f, v, exp) SELECT k, f, v, exp FROM unnest($1::text[], $2::text[], $3::jsonb[], $4::bigint[]) AS x(k, f, v, exp)`,
        [part.map((r) => r.k), part.map((r) => r.f), part.map((r) => (r.v === null || r.v === undefined ? null : JSON.stringify(r.v))), part.map((r) => r.exp)]);
    }
  }
  const back = summarize(await dumpRows(pool, { now: 0 }));
  return back;
}

/* Upstash → строки того же вида, что в PostgreSQL: тот же перенос copyKey (api/_lib/kv-copy.js), но вместо базы —
   сборщик строк. Так копию Upstash можно сравнить с копией ONREZA строка в строку. */
export function rowCollector() {
  const m = new Map(); const exp = new Map();
  const put = (k, f, v) => m.set(`${k}\u0000${f}`, { k, f, v });
  const drop = (k) => { for (const key of m.keys()) if (key.startsWith(`${k}\u0000`)) m.delete(key); exp.delete(k); };
  return {
    pttl: async (k) => ([...m.keys()].some((x) => x.startsWith(`${k}\u0000`)) ? -1 : -2),
    set: async (k, v, o = {}) => { drop(k); put(k, '', v); if (o.px) exp.set(k, Date.now() + o.px); return 'OK'; },
    del: async (...ks) => { ks.forEach(drop); return ks.length; },
    hset: async (k, obj) => { Object.entries(obj).forEach(([f, v]) => put(k, f, v)); return 1; },
    sadd: async (k, ...ms) => { ms.flat().forEach((x) => put(k, String(x), null)); return 1; },
    rpush: async (k, ...vals) => { put(k, '', vals); return vals.length; },
    expire: async (k, sec) => { exp.set(k, Date.now() + sec * 1000); return 1; },
    rows: () => [...m.values()].map((r) => ({ ...r, exp: exp.get(r.k) || null })).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.f < b.f ? -1 : a.f > b.f ? 1 : 0)),
  };
}
export async function dumpUpstash(src) {
  const dst = rowCollector(); let cursor = 0;
  do {
    const [next, keys] = await src.scan(cursor, { match: '*', count: 500 });
    cursor = Number(next);
    for (const k of keys) await copyKey(src, dst, k);
  } while (cursor !== 0);
  return { [TABLE]: dst.rows(), [RESEARCH_TABLE]: [] };
}
/* сравнить две копии: по каждой таблице — сколько ключей, каких нет во второй, каких нет в первой, у каких другое
   значение. Сроки не сравниваются (они идут сами), значения не выводятся. */
export function compareRows(a, b) {
  const out = {};
  for (const t of BACKUP_TABLES) {
    const byKey = (rows) => { const m = new Map(); (rows || []).forEach((r) => { const x = m.get(r.k) || {}; x[r.f] = r.v; m.set(r.k, x); }); return m; };
    const A = byKey(a[t]); const B = byKey(b[t]);
    const onlyA = [...A.keys()].filter((k) => !B.has(k));
    const onlyB = [...B.keys()].filter((k) => !A.has(k));
    const differ = [...A.keys()].filter((k) => B.has(k) && JSON.stringify(A.get(k)) !== JSON.stringify(B.get(k)));
    out[t] = { keysA: A.size, keysB: B.size, onlyA, onlyB, differ };
  }
  return out;
}
const prefixOf = (k) => (k.includes(':') ? `${k.split(':')[0]}:` : k);
const byPrefix = (keys) => keys.reduce((acc, k) => { acc[prefixOf(k)] = (acc[prefixOf(k)] || 0) + 1; return acc; }, {});

async function main() {
  const args = process.argv.slice(2);
  const ca = process.env.DATABASE_CA || '';
  if (args[0] === '--check') {
    const res = checkBackup(await readBackup(args[1]));
    console.log(JSON.stringify(res.tables)); if (!res.ok) { console.error(`Копия повреждена: ${res.problems.join('; ')}`); process.exit(1); }
    console.log('Копия цела.'); return;
  }
  if (args[0] === '--upstash') {
    const url = process.env.KV_REST_API_URL; const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) { console.error('Нужны KV_REST_API_URL и KV_REST_API_TOKEN (Vercel → Storage → база → .env.local)'); process.exit(1); }
    const { Redis } = await import('@upstash/redis');
    const rows = await dumpUpstash(new Redis({ url, token, automaticDeserialization: true }));
    const file = args[1] || `upstash-backup-${new Date().toISOString().slice(0, 10)}.jsonl.gz`;
    await writeBackup(file, rows, { source: 'upstash' });
    const res = checkBackup(await readBackup(file));
    console.log(JSON.stringify(res.tables)); if (!res.ok) process.exit(1);
    console.log(`Копия Upstash: ${file}`); return;
  }
  if (args[0] === '--compare') {
    const [a, b] = await Promise.all([readBackup(args[1]), readBackup(args[2])]);
    const diff = compareRows(a.rows, b.rows);
    // сеансы, счётчики частоты и коды связывания живут минуты-часы — их расхождение после переноса ожидаемо
    const shortLived = (k) => /^(hit|session|link|cnt):/.test(k);
    let bad = false;
    for (const t of BACKUP_TABLES) {
      const d = diff[t]; const lost = d.onlyA.filter((k) => !shortLived(k));
      console.log(`${t}: в первой ${d.keysA} ключей, во второй ${d.keysB}; нет во второй — ${d.onlyA.length} ${JSON.stringify(byPrefix(d.onlyA))}, ` +
        `только во второй — ${d.onlyB.length} ${JSON.stringify(byPrefix(d.onlyB))}, другое значение — ${d.differ.length} ${JSON.stringify(byPrefix(d.differ))}`);
      if (lost.length) { bad = true; console.log(`  потеряны долгоживущие ключи: ${lost.slice(0, 50).join(', ')}${lost.length > 50 ? ' …' : ''}`); }
    }
    console.log(bad ? 'Есть ключи, которых нет во второй копии — разобраться до удаления первой базы.' : 'Все долгоживущие ключи первой копии есть во второй (значения могли обновиться после переноса).');
    process.exit(bad ? 1 : 0);
  }
  if (args[0] === '--restore') {
    const target = process.env.RESTORE_URL;
    if (!target) { console.error('Нужен RESTORE_URL — строка ДРУГОЙ базы (ветка ONREZA или локальная)'); process.exit(1); }
    if (process.env.DATABASE_URL && target === process.env.DATABASE_URL) { console.error('RESTORE_URL совпадает с DATABASE_URL — в рабочую базу копия не разворачивается'); process.exit(1); }
    const backup = await readBackup(args[1]);
    const check = checkBackup(backup); if (!check.ok) { console.error(`Копия повреждена: ${check.problems.join('; ')}`); process.exit(1); }
    const pool = poolFrom(target, ca);
    const back = await restoreRows(pool, backup.rows);
    await pool.end();
    const same = BACKUP_TABLES.every((t) => back[t].sha256 === backup.head.tables[t].sha256 && back[t].rows === backup.head.tables[t].rows);
    console.log(JSON.stringify(back));
    if (!same) { console.error('После развёртывания строки не совпали с копией'); process.exit(1); }
    console.log('Развёрнуто и сверено: копия проверена.'); return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('Нужен DATABASE_URL (строка из панели ONREZA, см. docs/onreza.md)'); process.exit(1); }
  const pool = poolFrom(url, ca, 1);
  const rows = await dumpRows(pool);
  await pool.end();
  const file = args[0] || `inflatia-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.jsonl.gz`;
  await writeBackup(file, rows);
  const res = checkBackup(await readBackup(file));
  console.log(JSON.stringify(res.tables));
  if (!res.ok) { console.error(`Файл записан с ошибкой: ${res.problems.join('; ')}`); process.exit(1); }
  console.log(`Копия: ${file}. Проверьте её развёртыванием: RESTORE_URL=… node scripts/db-backup.mjs --restore ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Копия не снята:', e.message); process.exit(1); });
