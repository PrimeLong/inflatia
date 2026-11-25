/* Запуск server/index.js отдельным процессом для тестов: ждёт строку «слушаю», stop() шлёт SIGTERM и ждёт выхода. */
import { spawn } from 'node:child_process';
import net from 'node:net';

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

export async function spawnServer(env) {
  const port = await freePort();
  const child = spawn(process.execPath, [new URL('../index.js', import.meta.url).pathname], { env: { ...env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  child.stdout.on('data', (b) => { log += b; });
  child.stderr.on('data', (b) => { log += b; });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`сервер не запустился: ${log}`)), 15_000);
    const check = () => { if (log.includes('слушаю')) { clearTimeout(t); resolve(); } };
    child.stdout.on('data', check);
    exited.then((e) => { clearTimeout(t); reject(new Error(`сервер вышел (${e.code}): ${log}`)); });
  });
  return {
    url: `http://127.0.0.1:${port}`,
    log: () => log,
    exited,
    async stop(signal = 'SIGTERM') { child.kill(signal); const e = await exited; return { ...e, log }; },
  };
}

// запуск, который должен завершиться сам (например, без DATABASE_URL)
export function runServer(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [new URL('../index.js', import.meta.url).pathname], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', (b) => { log += b; });
    child.stderr.on('data', (b) => { log += b; });
    const t = setTimeout(() => child.kill('SIGKILL'), 15_000);
    child.on('exit', (code) => { clearTimeout(t); resolve({ code, log }); });
  });
}
