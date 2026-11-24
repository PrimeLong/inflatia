/* СБОРКА ДЛЯ ONREZA (docs/onreza.md, «Сервер ONREZA Compute»): после `npm run build` (сайт в dist/) собирает папку
   onreza-build/ — её указывают в настройках проекта ONREZA как Output Directory:

     onreza-build/
       .onreza/manifest.json   — что где работает (docs.onreza.ru/manifest): слой STATIC «site» и слой COMPUTE «api»
       site/                   — сайт как есть (копия dist/): CDN ONREZA
       api/index.mjs           — сервер Express одним файлом со всеми зависимостями (pg, express): node_modules не нужны
       api/site/index.html     — копия index.html для адресов экранов, если правило Edge не применилось

   Маршруты: /api/* → сервер (приоритет 20); адреса экранов → сервер (10, запасной путь к index.html); всё остальное →
   STATIC (0). Запуск: npm run build:onreza. Проверка без сборки сайта: node scripts/build-onreza.mjs --check. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import { SECURITY_HEADERS } from '../server/headers.js';
import { MODULE_KEY } from '../api/_lib/research-module-key.js';
import { MODULE } from '../src/research/module.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'onreza-build');
const DIST = path.join(ROOT, 'dist');

export const MANIFEST = {
  version: 2,
  layers: [
    { name: 'site', target: 'STATIC', directory: 'site' },
    {
      name: 'api', target: 'COMPUTE', directory: 'api', entry: 'index.mjs',
      runtime: {
        timeoutMs: 60000,
        memoryMb: 256,
        network: {
          schemaVersion: 'COMPUTE_NETWORK_V1', exposure: 'PUBLIC',
          ports: [{ name: 'http', protocol: 'http', port: 3000, binding: 'primary' }],
          readiness: { protocol: 'tcp', port: 'http' },
          allowFrom: [],
        },
      },
    },
  ],
  routes: [
    { pattern: '^/api(/.*)?$', layer: 'api', priority: 20 },
    { pattern: '^/(book|league|shop|profile|world|news|research)/?$', layer: 'api', priority: 10, methods: ['GET', 'HEAD'] },
    { pattern: '^/book/[^/.]+/?$', layer: 'api', priority: 10, methods: ['GET', 'HEAD'] },
    { pattern: '^/.*$', layer: 'site', priority: 0 },
  ],
  meta: { framework: { name: 'vite+express' }, app: 'inflatia' },
};

// заголовки в onreza.rules.toml — те же, что у сервера (server/headers.js)
export function rulesHeaders(toml) {
  const block = toml.split('[actions.security_headers.set_headers]')[1] || '';
  const out = {};
  for (const m of block.matchAll(/^\s*"([a-z-]+)"\s*=\s*"((?:[^"\\]|\\.)*)"/gm)) out[m[1]] = m[2];
  return out;
}
export function checkRules() {
  const toml = fs.readFileSync(path.join(ROOT, 'onreza.rules.toml'), 'utf8');
  const got = rulesHeaders(toml);
  const want = Object.fromEntries(Object.entries(SECURITY_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
  const bad = Object.keys(want).filter((k) => got[k] !== want[k]);
  if (bad.length) throw new Error(`onreza.rules.toml: заголовки не совпадают с server/headers.js: ${bad.join(', ')}`);
  return true;
}

/* В браузерный код не должен попасть ключ ответов исследования (api/_lib/research-module-key.js, api/_lib/research-key.js):
   ищем в собранном сайте каждый разбор заданий модуля и каждую формулировку правильного варианта теста. Возвращает файлы с утечкой. */
export function leakedKeys(siteDir) {
  // разбор, дословно совпадающий с публичным текстом урока (пример в объяснении), — не секрет: его участник видит до ответа
  const pub = MODULE.flatMap((l) => [...l.cards, ...l.exercises.flatMap((e) => [e.prompt, ...(e.options || []).map((o) => o.text)])]).join('\n');
  const needles = Object.values(MODULE_KEY).map((k) => k.why).filter((w) => !pub.includes(w));
  const files = fs.readdirSync(siteDir, { recursive: true }).map(String).filter((f) => /\.(m?js|html|json)$/.test(f));
  const out = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(siteDir, f), 'utf8');
    if (needles.some((n) => n && (text.includes(n) || text.includes(JSON.stringify(n).slice(1, -1))))) out.push(f.split(path.sep).join('/'));
  }
  return out.sort();
}

export async function bundleServer(outFile) {
  const bundle = await rolldown({
    input: path.join(ROOT, 'server', 'index.js'),
    platform: 'node',
    // pg-native — необязательная часть pg (не используется); Upstash в Compute не подключается (api/_lib/store.js)
    external: ['pg-native', '@upstash/redis', /^node:/],
    logLevel: 'warn',
  });
  await bundle.write({ file: outFile, format: 'esm', codeSplitting: false, banner: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" });
  await bundle.close();
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  checkRules();
  if (checkOnly) { console.log('onreza.rules.toml: заголовки совпадают с server/headers.js'); return; }
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Нет dist/index.html — сначала npm run build');
  const leaks = leakedKeys(DIST);
  if (leaks.length) throw new Error(`В собранном сайте — ключ ответов исследования: ${leaks.join(', ')}. Ключ должен быть только на сервере.`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, '.onreza'), { recursive: true });
  fs.cpSync(DIST, path.join(OUT, 'site'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'api', 'site'), { recursive: true });
  await bundleServer(path.join(OUT, 'api', 'index.mjs'));
  fs.copyFileSync(path.join(DIST, 'index.html'), path.join(OUT, 'api', 'site', 'index.html'));
  fs.writeFileSync(path.join(OUT, '.onreza', 'manifest.json'), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  const kb = Math.round(fs.statSync(path.join(OUT, 'api', 'index.mjs')).size / 1024);
  const files = fs.readdirSync(path.join(OUT, 'site'), { recursive: true }).length;
  console.log(`onreza-build: сайт — ${files} файлов, сервер — api/index.mjs (${kb} КБ), манифест — .onreza/manifest.json`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
