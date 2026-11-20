#!/usr/bin/env node
/* Перенос данных из Upstash Redis в PostgreSQL ONREZA (docs/onreza.md, шаг 4). Запускается один раз с компьютера владельца:

     KV_REST_API_URL=… KV_REST_API_TOKEN=… DATABASE_URL=… node scripts/upstash-to-onreza.mjs            # база аккаунтов
     RESEARCH_KV_REST_API_URL=… RESEARCH_KV_REST_API_TOKEN=… RESEARCH_DATABASE_URL=… node scripts/upstash-to-onreza.mjs --research

   --dry-run — только посчитать ключи по видам, ничего не записывая. --missing — перенести только ключи, которых
   в PostgreSQL ещё нет (после переключения сайта: догнать записи, сделанные в Upstash за минуты между переносом и
   новой сборкой, не затирая более свежие данные). Без --missing повторный запуск перезаписывает PostgreSQL данными Upstash. Срок жизни ключей (комнаты, сессии, счётчики) переносится как есть. Сами значения на экран
   не выводятся — только числа. */
import { pgKv, poolFrom } from '../api/_lib/pgkv.js';
import { copyKey } from '../api/_lib/kv-copy.js';

export { copyKey } from '../api/_lib/kv-copy.js';

export async function copyAll(src, dst, { dryRun = false, missing = false, log = () => {} } = {}) {
  const counts = {};
  let cursor = 0;
  do {
    const [next, keys] = await src.scan(cursor, { match: '*', count: 500 });
    cursor = Number(next);
    for (const k of keys) {
      const kind = dryRun ? await src.type(k) : await copyKey(src, dst, k, { missing });
      counts[kind] = (counts[kind] || 0) + 1;
    }
    log(counts);
  } while (cursor !== 0);
  return counts;
}

async function main() {
  const research = process.argv.includes('--research');
  const dryRun = process.argv.includes('--dry-run');
  const missing = process.argv.includes('--missing');
  const env = (n) => process.env[research ? `RESEARCH_${n}` : n];
  const url = env('KV_REST_API_URL'); const token = env('KV_REST_API_TOKEN'); const target = env('DATABASE_URL');
  if (!url || !token || (!dryRun && !target)) {
    console.error(`Нужны ${research ? 'RESEARCH_' : ''}KV_REST_API_URL, ${research ? 'RESEARCH_' : ''}KV_REST_API_TOKEN и ${research ? 'RESEARCH_' : ''}DATABASE_URL (см. docs/onreza.md)`);
    process.exit(1);
  }
  if (research && target && target === process.env.DATABASE_URL) { console.error('RESEARCH_DATABASE_URL совпадает с DATABASE_URL — исследование хранится в отдельной базе'); process.exit(1); }
  const { Redis } = await import('@upstash/redis');
  const src = new Redis({ url, token, automaticDeserialization: true });
  const dst = dryRun ? null : pgKv(poolFrom(target, process.env.DATABASE_CA || ''));
  const counts = await copyAll(src, dst, { dryRun, missing, log: (c) => process.stdout.write(`\r${JSON.stringify(c)}   `) });
  console.log(`\n${dryRun ? 'Найдено' : 'Перенесено'}: ${Object.values(counts).reduce((a, b) => a + b, 0)} ключей — ${JSON.stringify(counts)}`);
  if (dst) await dst.end();
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Перенос остановлен:', e.message); process.exit(1); });
