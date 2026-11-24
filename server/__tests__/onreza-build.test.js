/* Сборка для ONREZA (scripts/build-onreza.mjs, onreza.rules.toml): манифест по схеме docs.onreza.ru/manifest, заголовки
   правил Edge — те же, что у сервера, адреса экранов — одни и те же в приложении, на сервере, в манифесте и в правилах. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { MANIFEST, checkRules, rulesHeaders } from '../../scripts/build-onreza.mjs';
import { isSpaPath } from '../routes.js';
import { SECURITY_HEADERS } from '../headers.js';
import { TAB_PATHS } from '../../src/lib/route.js';

const toml = fs.readFileSync(new URL('../../onreza.rules.toml', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

describe('манифест ONREZA', () => {
  it('версия 2, слой STATIC и слой COMPUTE с полным runtime.network', () => {
    expect(MANIFEST.version).toBe(2);
    const [site, api] = MANIFEST.layers;
    expect(site).toEqual({ name: 'site', target: 'STATIC', directory: 'site' });
    expect(api).toMatchObject({ name: 'api', target: 'COMPUTE', directory: 'api', entry: 'index.mjs' });
    expect(api.runtime.network).toMatchObject({ schemaVersion: 'COMPUTE_NETWORK_V1', exposure: 'PUBLIC', readiness: { protocol: 'tcp', port: 'http' } });
    expect(api.runtime.network.ports.filter((p) => p.binding === 'primary')).toHaveLength(1);
  });
  it('маршруты: только известные слои, без lookahead (Rust regex), /api — серверу, остальное — статике', () => {
    const names = new Set(MANIFEST.layers.map((l) => l.name));
    for (const r of MANIFEST.routes) {
      expect(names.has(r.layer)).toBe(true);
      expect(r.pattern).not.toMatch(/\(\?[=!<>]/);
      expect(r.pattern.length).toBeLessThanOrEqual(500);
    }
    const pick = (p) => [...MANIFEST.routes].sort((a, b) => b.priority - a.priority).find((r) => new RegExp(r.pattern).test(p)).layer;
    expect(pick('/api/account')).toBe('api');
    expect(pick('/api/room')).toBe('api');
    expect(pick('/assets/index-abc.js')).toBe('site');
    expect(pick('/music/anchor.mp3')).toBe('site');
    expect(pick('/')).toBe('site');
    // адреса экранов: запасной путь к index.html — сервер (если правило Edge не применилось)
    for (const p of ['/shop', '/book', '/book/prices', '/research', '/news']) expect(pick(p), p).toBe('api');
  });
});

describe('правила Edge и адреса экранов', () => {
  it('заголовки безопасности в onreza.rules.toml = server/headers.js = прежний vercel.json', () => {
    expect(checkRules()).toBe(true);
    const got = rulesHeaders(toml);
    const all = vercel.headers.find((h) => h.source === '/(.*)').headers;
    for (const { key, value } of all) {
      expect(got[key.toLowerCase()], key).toBe(value);
      expect(SECURITY_HEADERS[key], key).toBe(value);
    }
  });
  it('адреса экранов одни и те же: приложение, сервер, манифест, правила Edge, прежние rewrites Vercel', () => {
    const screens = [...Object.values(TAB_PATHS).filter((p) => p !== '/'), '/research'];
    const exact = [...toml.matchAll(/path = \{ exact = "([^"]+)" \}/g)].map((m) => m[1]).sort();
    expect(exact).toEqual([...screens].sort());
    for (const p of screens) {
      expect(isSpaPath(p), p).toBe(true);
      expect(new RegExp(MANIFEST.routes[1].pattern).test(p), p).toBe(true);
    }
    expect(toml).toContain('glob = "/book/{chapter}"');
    const vsrc = vercel.rewrites.map((r) => r.source).join(' ');
    for (const p of screens) expect(vsrc).toContain(p.slice(1));
    // не экраны — не переписываются
    for (const p of ['/nope', '/book/a/b', '/api/account', '/assets/x.js']) expect(isSpaPath(p), p).toBe(false);
  });
});
