/* Перенос ключей Upstash → PostgreSQL ONREZA (docs/onreza.md): общий для скрипта scripts/upstash-to-onreza.mjs и одноразового
   адреса /api/migrate (перенос изнутри Vercel, где есть и ключи Upstash, и строка базы). src — клиент @upstash/redis,
   dst — api/_lib/pgkv.js. */

// один ключ: значение, хэш, множество или список — тем же видом и с тем же остатком срока
export async function copyKey(src, dst, k, { missing = false } = {}) {
  // --missing: ключи, которые уже есть в PostgreSQL, не трогать (догоняющий перенос после переключения)
  if (missing && (await dst.pttl(k)) !== -2) return 'kept';
  const type = await src.type(k);
  const ttl = await src.pttl(k);
  const px = ttl > 0 ? ttl : 0;
  if (type === 'none' || ttl === -2) return 'none';
  if (type === 'string') {
    const v = await src.get(k);
    if (v === null) return 'none';
    await dst.set(k, v, px ? { px } : {});
  } else if (type === 'hash') {
    const h = (await src.hgetall(k)) || {};
    await dst.del(k);
    if (Object.keys(h).length) await dst.hset(k, h);
  } else if (type === 'set') {
    await dst.del(k);
    const m = (await src.smembers(k)) || [];
    if (m.length) await dst.sadd(k, ...m);
  } else if (type === 'list') {
    await dst.del(k);
    const items = (await src.lrange(k, 0, -1)) || [];
    if (items.length) await dst.rpush(k, ...items);
  } else return `skip:${type}`;
  if (px && type !== 'string') await dst.expire(k, px / 1000);
  return type;
}


/* одна порция для /api/migrate: SCAN с курсора, по count ключей, несколько ключей одновременно (до базы — океан, каждый
   запрос ~0,1 с). Возвращает следующий курсор ('0' — всё) и что перенесено по видам. dry — только посчитать. */
export async function copyBatch(src, dst, { cursor = '0', count = 40, missing = false, dry = false, parallel = 8 } = {}) {
  const [next, keys] = await src.scan(cursor, { match: '*', count });
  const counts = {};
  const one = async (k) => { const kind = dry ? await src.type(k) : await copyKey(src, dst, k, { missing }); counts[kind] = (counts[kind] || 0) + 1; };
  for (let i = 0; i < keys.length; i += parallel) await Promise.all(keys.slice(i, i + parallel).map(one));
  return { cursor: String(next), done: String(next) === '0', counts, seen: keys.length };
}
