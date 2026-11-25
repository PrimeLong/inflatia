/* ТОЧКА ЗАПУСКА СЕРВЕРА В ONREZA COMPUTE (docs/onreza.md). Платформа задаёт PORT и ждёт, что процесс слушает 0.0.0.0
   (docs.onreza.ru/compute: «сервер должен слушать на 0.0.0.0»); запуск должен уложиться в 30 секунд.

   — INFLATIA_RUNTIME=compute: store.js не подключает Upstash (США), только PostgreSQL ONREZA.
   — Без DATABASE_URL сервер в ONREZA не запускается: в памяти процесса данные пропали бы при остановке (scale-to-zero),
     новой версии или перезапуске. Для локального запуска без базы — ALLOW_MEMORY_STORE=1 (данные только до остановки).
   — Остановка (SIGTERM от платформы, SIGINT в терминале): сервер перестаёт принимать соединения, ждёт начатые запросы
     (не дольше SHUTDOWN_MS, по умолчанию 10 с), закрывает пул соединений с базой и выходит. */
process.env.INFLATIA_RUNTIME = 'compute';

const onPlatform = !!process.env.ONREZA_ENV || process.env.NODE_ENV === 'production';
if (!process.env.DATABASE_URL && !process.env.ALLOW_MEMORY_STORE) {
  console.error(onPlatform
    ? 'DATABASE_URL не задан: без базы сервер не запускается (данные в памяти процесса пропали бы). Задайте DATABASE_URL в Environment Variables ONREZA.'
    : 'DATABASE_URL не задан. Для локального запуска без базы: ALLOW_MEMORY_STORE=1 npm run start');
  process.exit(1);
}

const { createApp } = await import('./app.js');
const { closePools } = await import('../api/_lib/pgkv.js');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST_BIND || '0.0.0.0';
const SHUTDOWN_MS = Number(process.env.SHUTDOWN_MS) > 0 ? Number(process.env.SHUTDOWN_MS) : 10_000;

// копия index.html рядом со сборкой сервера (scripts/build-onreza.mjs кладёт её в site/) — для адресов экранов
const { fileURLToPath } = await import('node:url');
const pathMod = await import('node:path');
const fsMod = await import('node:fs');
const here = pathMod.dirname(fileURLToPath(import.meta.url));
const spaIndex = process.env.SPA_INDEX || pathMod.join(here, 'site', 'index.html');
const app = createApp({ spaIndex: fsMod.existsSync(spaIndex) ? spaIndex : '' });
const server = app.listen(PORT, HOST, () => {
  console.log(`inflatia api: слушаю ${HOST}:${PORT}, база: ${process.env.DATABASE_URL ? 'postgres' : 'память'}`);
});
// долгие соединения держат процесс (scale-to-zero ждёт их конца): простаивающее keep-alive закрываем быстрее
server.keepAliveTimeout = 15_000;
server.headersTimeout = 20_000;
server.requestTimeout = 60_000;

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`inflatia api: ${signal}, останавливаюсь`);
  const timer = setTimeout(() => { console.error('inflatia api: не успел за отведённое время — выхожу'); process.exit(1); }, SHUTDOWN_MS);
  timer.unref();
  await new Promise((resolve) => {
    server.close(() => resolve());
    // простаивающие keep-alive соединения не должны держать остановку
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  });
  const n = await closePools();
  console.log(`inflatia api: остановлен, закрыто пулов базы: ${n}`);
  clearTimeout(timer);
  process.exit(0);
}
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });
// необработанная ошибка в обещании не должна молча оставить процесс в неизвестном состоянии
process.on('unhandledRejection', (e) => { console.error('unhandledRejection:', e && e.message ? e.message.slice(0, 200) : 'unknown'); });
