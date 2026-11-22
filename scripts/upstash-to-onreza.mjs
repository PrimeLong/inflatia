#!/usr/bin/env node
/* Перенос данных из Upstash Redis в PostgreSQL ONREZA (docs/onreza.md, шаг 4). Запускается один раз с компьютера владельца:

     KV_REST_API_URL=… KV_REST_API_TOKEN=… DATABASE_URL=… node scripts/upstash-to-onreza.mjs            # данные Инфляции
     RESEARCH_KV_REST_API_URL=… RESEARCH_KV_REST_API_TOKEN=… DATABASE_URL=… node scripts/upstash-to-onreza.mjs --research

   --research — только если где-то осталась прежняя отдельная база исследования (Upstash по RESEARCH_KV_REST_API_*):
   её ключи переносятся в ту же базу DATABASE_URL, в таблицу исследования inflatia_research (база одна — решение владельца
   22.11.2026, docs/onreza.md). На 22.11.2026 отдельной базы исследования не было (/api/health: "research":"none",
   переменных RESEARCH_* в Vercel нет) — переносить нечего, режим оставлен на случай, если она найдётся.

   --dry-run — только посчитать ключи по видам, ничего не записывая. --missing — перенести только ключи, которых
   в PostgreSQL ещё нет (после переключения сайта: догнать записи, сделанные в Upstash за минуты между переносом и
   новой сборкой, не затирая более свежие данные). Без --missing повторный запуск перезаписывает PostgreSQL данными Upstash. Срок жизни ключей (комнаты, сессии, счётчики) переносится как есть. Сами значения на экран
   не выводятся — только числа. */
import { pgKv, poolFrom, TABLE, RESEARCH_TABLE } from '../api/_lib/pgkv.js';
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
  const url = env('KV_REST_API_URL'); const token = env('KV_REST_API_TOKEN'); const target = process.env.DATABASE_URL;
  if (!url || !token || (!dryRun && !target)) {
    console.error(`Нужны ${research ? 'RESEARCH_' : ''}KV_REST_API_URL, ${research ? 'RESEARCH_' : ''}KV_REST_API_TOKEN и DATABASE_URL (см. docs/onreza.md)`);
    process.exit(1);
  }
  if (research && url === process.env.KV_REST_API_URL) { console.error('RESEARCH_KV_REST_API_URL совпадает с KV_REST_API_URL — это база Инфляции, не исследования'); process.exit(1); }
  const { Redis } = await import('@upstash/redis');
  const src = new Redis({ url, token, automaticDeserialization: true });
  // одна база: исследование — в свою таблицу той же базы
  const dst = dryRun ? null : pgKv(poolFrom(target, process.env.DATABASE_CA || ''), { table: research ? RESEARCH_TABLE : TABLE });
  const counts = await copyAll(src, dst, { dryRun, missing, log: (c) => process.stdout.write(`\r${JSON.stringify(c)}   `) });
  console.log(`\n${dryRun ? 'Найдено' : 'Перенесено'}: ${Object.values(counts).reduce((a, b) => a + b, 0)} ключей — ${JSON.stringify(counts)}`);
  if (dst) await dst.end();
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Перенос остановлен:', e.message); process.exit(1); });
