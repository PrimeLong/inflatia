/* ОДНОРАЗОВЫЙ ПЕРЕНОС Upstash → PostgreSQL ONREZA изнутри Vercel (docs/onreza.md). Работает, только пока задан MIGRATE_TOKEN
   (секрет в настройках Vercel) и есть обе базы: KV_REST_API_* (откуда) и DATABASE_URL (куда). Порциями: GET
   /api/migrate?token=…&cursor=0 → { cursor, done, counts }; следующий вызов — с полученным курсором, пока done не true.
   dry=1 — только посчитать ключи по видам, missing=1 — переносить только ключи, которых в PostgreSQL ещё нет. verify=1 —
   сколько ключей в каждой базе. Ни ключей, ни значений ответ не показывает — только числа. После переноса MIGRATE_TOKEN
   удаляют, и адрес отвечает 404. */
import { timingSafeEqual } from 'node:crypto';
import { pgKvFromEnv } from './_lib/pgkv.js';
import { copyBatch } from './_lib/kv-copy.js';

const same = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
let dst = null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.MIGRATE_TOKEN;
  if (!secret || secret.length < 24) return res.status(404).json({ error: 'Не найдено' });
  const q = req.query || {};
  if (!same(q.token || '', secret)) return res.status(403).json({ error: 'Нет доступа' });
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return res.status(400).json({ error: 'Нет Upstash (KV_REST_API_*)' });
  if (!dst) dst = pgKvFromEnv('DATABASE_URL');
  if (!dst) return res.status(400).json({ error: 'Нет DATABASE_URL' });
  try {
    const { Redis } = await import('@upstash/redis');
    const src = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    if (q.verify) {
      const upstash = await src.dbsize();
      const [, keys] = await dst.scan(0, { match: '*' });
      return res.status(200).json({ upstash, postgres: keys.length });
    }
    const out = await copyBatch(src, dst, { cursor: String(q.cursor || '0'), count: Math.min(100, Number(q.count) || 40), missing: q.missing === '1', dry: q.dry === '1' });
    return res.status(200).json(out);
  } catch (err) {
    console.error('migrate handler error:', err && err.message);
    return res.status(500).json({ error: 'Перенос остановлен', why: String((err && err.code) || (err && err.message) || '').slice(0, 120) });
  }
}
