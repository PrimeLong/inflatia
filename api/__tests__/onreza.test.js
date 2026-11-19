/* ONREZA (docs/onreza.md): сервер API для Compute даёт обработчикам тот же req/res, что и Vercel; манифест и Edge Rules
   повторяют vercel.json — те же адреса SPA и те же заголовки безопасности. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApi, HANDLERS, BODY_LIMIT } from '../../server/onreza.mjs';
import { MANIFEST, pack } from '../../scripts/onreza-pack.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rules = readFileSync(path.join(ROOT, 'onreza.rules.toml'), 'utf8');

let server = null;
afterEach(() => { if (server) server.close(); server = null; });
async function serve(handlers) {
  server = createApi(handlers);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${server.address().port}`;
}

describe('ONREZA: сервер API', () => {
  it('обслуживает каждый api/*.js — новый файл API не забыть подключить', () => {
    const files = readdirSync(path.join(ROOT, 'api')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();
    expect(Object.keys(HANDLERS).sort()).toEqual(files);
    for (const h of Object.values(HANDLERS)) expect(typeof h).toBe('function');
  });

  it('req.query, разобранный JSON, status().json() — как на Vercel', async () => {
    const seen = [];
    const base = await serve({ echo: (req, res) => { seen.push(req); return res.status(201).json({ q: req.query, b: req.body, m: req.method }); } });
    const g = await fetch(`${base}/api/echo?day=2026-11-18&playerId=p1`);
    expect(g.status).toBe(201);
    expect(g.headers.get('content-type')).toContain('application/json');
    expect(await g.json()).toEqual({ q: { day: '2026-11-18', playerId: 'p1' }, m: 'GET' });
    const p = await fetch(`${base}/api/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'status', n: 2 }) });
    expect((await p.json()).b).toEqual({ action: 'status', n: 2 });
    // кривой JSON остаётся строкой — обработчик сам ответит 400 «Некорректный JSON»
    const bad = await fetch(`${base}/api/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    expect((await bad.json()).b).toBe('{oops');
    expect(seen[0].headers['x-forwarded-for']).toBeUndefined();
  });

  it('/api/_health: жива ли база и приходит ли адрес клиента — без самого адреса', async () => {
    const base = await serve({});
    const plain = await (await fetch(`${base}/api/_health`)).json();
    expect(plain).toMatchObject({ ok: true, forwardedFor: false });
    const fwd = await (await fetch(`${base}/api/_health`, { headers: { 'x-forwarded-for': '203.0.113.7' } })).json();
    expect(fwd.forwardedFor).toBe(true);
    expect(JSON.stringify(fwd)).not.toContain('203.0.113.7');
  });

  it('неизвестный адрес — 404, падение обработчика — 500 без подробностей, большое тело — 413', async () => {
    const base = await serve({ boom: () => { throw new Error('секрет'); }, ok: (req, res) => res.status(200).json({ ok: true }) });
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/__proto__`)).status).toBe(404);
    expect((await fetch(`${base}/index.html`)).status).toBe(404);
    const boom = await fetch(`${base}/api/boom`);
    expect(boom.status).toBe(500);
    expect(JSON.stringify(await boom.json())).not.toContain('секрет');
    const big = await fetch(`${base}/api/ok`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(BODY_LIMIT + 10) }).catch(() => null);
    if (big) expect(big.status).toBe(413);
  });
});

describe('ONREZA: манифест и Edge Rules', () => {
  it('манифест: /api/* — в Compute, остальное — STATIC; шаблоны без lookahead (Rust regex)', () => {
    expect(MANIFEST.version).toBe(2);
    const byName = Object.fromEntries(MANIFEST.layers.map((l) => [l.name, l]));
    expect(byName.site).toMatchObject({ target: 'STATIC', directory: 'site' });
    expect(byName.api).toMatchObject({ target: 'COMPUTE', directory: 'server', entry: 'server.mjs' });
    expect(byName.api.runtime.network.ports[0].binding).toBe('primary');
    for (const r of MANIFEST.routes) { expect(r.pattern).not.toMatch(/\(\?[=!<>]/); expect(byName[r.layer]).toBeTruthy(); }
    const route = (p) => [...MANIFEST.routes].sort((a, b) => b.priority - a.priority).find((r) => new RegExp(r.pattern).test(p)).layer;
    expect(route('/api/account')).toBe('api');
    expect(route('/assets/index.js')).toBe('site');
    expect(route('/book/money')).toBe('site');
  });

  it('Edge Rules: каждый адрес SPA из vercel.json переписан на index.html, файлы важнее правила', () => {
    const spa = vercel.rewrites[0].source.match(/\(([^)]+)\)/)[1].split('|');
    for (const p of spa) expect(rules).toContain(`when.path = { exact = "/${p}" }`);
    expect(rules).toContain('when.path = { glob = "/book/*" }');
    const rewrites = rules.match(/action\.rewrite = \{[^}]*\}/g);
    expect(rewrites).toHaveLength(spa.length + 1);
    for (const r of rewrites) expect(r).toBe('action.rewrite = { target = "/index.html", if_no_file = true }');
  });

  it('Edge Rules: те же заголовки безопасности, что в vercel.json, слово в слово', () => {
    const hdr = vercel.headers.find((h) => h.source === '/(.*)').headers;
    for (const h of hdr) expect(rules).toContain(`"${h.key.toLowerCase()}" = "${h.value}",`);
  });

  it.skipIf(!existsSync(path.join(ROOT, 'dist/index.html')))('сборка: site — копия dist, server.mjs — один файл, манифест рядом; код сервера не в публичной раздаче', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'onreza-'));
    try {
      await pack({ out });
      expect(existsSync(path.join(out, 'site/index.html'))).toBe(true);
      expect(existsSync(path.join(out, 'server/server.mjs'))).toBe(true);
      expect(JSON.parse(readFileSync(path.join(out, '.onreza/manifest.json'), 'utf8'))).toEqual(MANIFEST);
      expect(readdirSync(path.join(out, 'server'))).toEqual(['server.mjs']);
      expect(existsSync(path.join(out, 'site/server.mjs'))).toBe(false);
    } finally { rmSync(out, { recursive: true, force: true }); }
  }, 60000);
});
