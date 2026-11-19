/* СБОРКА ДЛЯ ONREZA (docs/onreza.md): после `npm run build` собирает папку .onreza-out —
     site/    — копия dist: STATIC-слой, раздаётся CDN;
     server/  — server.mjs: API одним файлом со всеми зависимостями (rolldown), COMPUTE-слой;
     .onreza/manifest.json — Build Output Manifest v2: /api/* → server, остальное → site.
   Код сервера лежит отдельно от site, поэтому он не попадает в публичную раздачу.
   Переписывание адресов SPA (/book, /shop, …) и заголовки безопасности — в onreza.rules.toml (Edge Rules). */
import { build } from 'rolldown';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST = {
  version: 2,
  layers: [
    { name: 'site', target: 'STATIC', directory: 'site' },
    {
      name: 'api', target: 'COMPUTE', directory: 'server', entry: 'server.mjs',
      runtime: {
        timeoutMs: 30000,
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
    { pattern: '^/api/.*$', layer: 'api', priority: 20 },
    { pattern: '^/.*$', layer: 'site', priority: 0 },
  ],
  meta: { framework: { name: 'vite' }, app: 'inflatia' },
};

export async function pack({ root = ROOT, out = path.join(root, '.onreza-out') } = {}) {
  const dist = path.join(root, 'dist');
  if (!existsSync(path.join(dist, 'index.html'))) throw new Error('Нет dist/index.html — сначала npm run build');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(path.join(out, '.onreza'), { recursive: true });
  cpSync(dist, path.join(out, 'site'), { recursive: true });
  await build({
    input: path.join(root, 'server/onreza.mjs'),
    platform: 'node',
    logLevel: 'warn',
    output: { file: path.join(out, 'server/server.mjs'), format: 'esm', codeSplitting: false },
  });
  writeFileSync(path.join(out, '.onreza/manifest.json'), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  return out;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  pack().then((out) => console.log(`ONREZA: ${path.relative(ROOT, out)} готова`)).catch((e) => { console.error(e.message); process.exit(1); });
}
