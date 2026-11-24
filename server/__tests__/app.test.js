/* Сервер ONREZA Compute (server/app.js): те же адреса, методы, коды и тексты, что у функций Vercel; заголовки безопасности;
   адрес клиента — только от доверенного прокси; раздача сайта с адресами экранов; сценарии ученика через настоящий HTTP.
   База — память (без DATABASE_URL) или PostgreSQL, если задан PGKV_TEST_URL (server/__tests__/pg.test.js). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { API_ROUTES, isSpaPath } from '../routes.js';
import { SECURITY_HEADERS } from '../headers.js';

let server; let base; let staticDir;
const start = (opts) => new Promise((resolve) => { const s = createApp(opts).listen(0, '127.0.0.1', () => resolve(s)); });
const urlOf = (s) => `http://127.0.0.1:${s.address().port}`;

beforeAll(async () => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inflatia-static-'));
  fs.mkdirSync(path.join(staticDir, 'assets'));
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Инфляция</title><div id="root"></div>');
  fs.writeFileSync(path.join(staticDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(staticDir, 'favicon.svg'), '<svg/>');
  server = await start({ staticDir });
  base = urlOf(server);
});
afterAll(async () => { await new Promise((r) => server.close(r)); fs.rmSync(staticDir, { recursive: true, force: true }); });

const post = (p, body, headers = {}) => fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const json = async (r) => ({ status: r.status, data: await r.json(), headers: r.headers });
let n = 0;
const uniq = (p) => `${p}${Date.now().toString(36).slice(-4)}${n++}`;
const reg = (login, ip) => post('/api/account', { action: 'register', consentPage: true, consentPd: true, birthYear: 1990, login, password: 'secret12' }, ip ? { 'x-forwarded-for': ip } : {});

describe('маршруты API', () => {
  it('все девять адресов /api/* на месте — те же, что функции Vercel (api/*.js)', () => {
    const files = fs.readdirSync(new URL('../../api', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `/api/${f.replace(/\.js$/, '')}`).sort();
    expect(API_ROUTES.map((r) => r.path).sort()).toEqual(files);
  });
  it('метод проверяет обработчик: те же 405 и тексты, что раньше', async () => {
    for (const r of API_ROUTES) {
      const wrong = r.methods.includes('GET') ? 'DELETE' : 'GET';
      const res = await fetch(`${base}${r.path}`, { method: wrong });
      if (r.path === '/api/health' || r.path === '/api/research') continue;  // эти отвечают на любой метод, как раньше
      expect(res.status, `${wrong} ${r.path}`).toBe(405);
      expect((await res.json()).error).toMatch(/^Только (POST|GET и POST)$/);
    }
  });
  it('незнакомый адрес API — 404 JSON, а не страница сайта', async () => {
    const r = await json(await fetch(`${base}/api/nope`));
    expect(r.status).toBe(404);
    expect(r.data.error).toBe('Нет такого адреса API');
    expect((await fetch(`${base}/api/account/extra`, { method: 'POST' })).status).toBe(404);
  });
  it('битый JSON — 400 «Некорректный JSON»; тело больше 4,5 МБ — 413', async () => {
    const bad = await json(await post('/api/account', '{"action":'));
    expect(bad).toMatchObject({ status: 400, data: { error: 'Некорректный JSON' } });
    const big = await json(await post('/api/solo', JSON.stringify({ action: 'save', pad: 'x'.repeat(5 * 1024 * 1024) })));
    expect(big.status).toBe(413);
  });
  it('тело text/plain разбирает сам обработчик — как у Vercel', async () => {
    const r = await json(await fetch(`${base}/api/account`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ action: 'me', token: 'nope' }) }));
    expect(r.status).toBe(401);
  });
  it('заголовки безопасности и no-store на каждом ответе API; ни x-powered-by, ни CORS', async () => {
    for (const r of [await fetch(`${base}/api/health`), await fetch(`${base}/api/nope`), await post('/api/account', '{')]) {
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(r.headers.get(k), k).toBe(v);
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('x-powered-by')).toBeNull();
      expect(r.headers.get('access-control-allow-origin')).toBeNull();
    }
  });
  it('/api/health: сервер в Compute, без адресов; ?proxy=1 — только форма заголовков', async () => {
    const h = await json(await fetch(`${base}/api/health`));
    expect(h.status).toBe(200);
    expect(h.data).toMatchObject({ db: process.env.DATABASE_URL ? 'postgres' : 'memory' });
    const p = await json(await fetch(`${base}/api/health?proxy=1`, { headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.7' } }));
    expect(p.data.proxy).toMatchObject({ xffEntries: 2, xffRightPrivate: true, xRealIp: false, chosenPrivate: true });
    expect(JSON.stringify(p.data)).not.toMatch(/203\.0\.113|10\.0\.0/);
  });
});

describe('адрес клиента: только от доверенного прокси', () => {
  it('подставленный браузером X-Forwarded-For не обходит лимит регистраций с адреса', async () => {
    // прокси дописывает настоящий адрес справа; слева — что угодно от клиента
    const real = '198.51.100.23';
    const codes = [];
    for (let i = 0; i < 7; i += 1) codes.push((await reg(uniq('ipx'), `6.6.6.${i}, ${real}`)).status);
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(codes.slice(5)).toEqual([429, 429]);
    // другой настоящий адрес — свой счётчик
    expect((await reg(uniq('ipy'), `6.6.6.6, 198.51.100.24`)).status).toBe(200);
  });
  it('TRUST_PROXY_HOPS=2: адрес — второй справа (два доверенных прокси)', async () => {
    const s = await start({ hops: 2 });
    try {
      const h = await (await fetch(`${urlOf(s)}/api/health?proxy=1`, { headers: { 'x-forwarded-for': '6.6.6.6, 198.51.100.40, 10.1.2.3' } })).json();
      expect(h.proxy.chosenPrivate).toBe(false);
    } finally { await new Promise((r) => s.close(r)); }
  });
  it('CLIENT_IP_HEADER: адрес из заголовка платформы, X-Forwarded-For не читается', async () => {
    const s = await start({ ipHeader: 'x-real-ip' });
    try {
      const h = await (await fetch(`${urlOf(s)}/api/health?proxy=1`, { headers: { 'x-forwarded-for': '10.9.9.9', 'x-real-ip': '198.51.100.50' } })).json();
      expect(h.proxy.chosenPrivate).toBe(false);
    } finally { await new Promise((r) => s.close(r)); }
  });
});

describe('сценарии ученика через HTTP', () => {
  it('регистрация → вход → профиль → смена пароля → восстановление кодом → выгрузка → удаление', async () => {
    const login = uniq('flow'); const ip = '198.51.100.61';
    const r1 = await json(await reg(login, ip));
    expect(r1.status).toBe(200);
    expect(r1.data.recoveryCode).toBeTruthy();
    const bad = await json(await post('/api/account', { action: 'login', login, password: 'wrong123' }, { 'x-forwarded-for': ip }));
    expect(bad).toMatchObject({ status: 401, data: { error: 'Неверный логин или пароль' } });
    const r2 = await json(await post('/api/account', { action: 'login', login, password: 'secret12' }, { 'x-forwarded-for': ip }));
    expect(r2.status).toBe(200);
    const token = r2.data.token;
    expect((await json(await post('/api/account', { action: 'me', token }))).data.profile.login).toBe(login);
    const pw = await json(await post('/api/account', { action: 'password', token, oldPassword: 'secret12', newPassword: 'secret34' }));
    expect(pw.status).toBe(200);
    // старая сессия больше не действует
    expect((await post('/api/account', { action: 'me', token })).status).toBe(401);
    const rec = await json(await post('/api/account', { action: 'recover', login, code: r1.data.recoveryCode, newPassword: 'secret56' }, { 'x-forwarded-for': ip }));
    expect(rec.status).toBe(200);
    const t2 = rec.data.token;
    const exp = await json(await post('/api/account', { action: 'export', token: t2 }));
    expect(exp.status).toBe(200);
    expect(exp.data.account.login).toBe(login);
    expect(exp.data).toHaveProperty('research');
    expect((await post('/api/account', { action: 'delete', token: t2, password: 'secret56' })).status).toBe(200);
    expect((await post('/api/account', { action: 'login', login, password: 'secret56' }, { 'x-forwarded-for': ip })).status).toBe(401);
  });
  it('прогресс и сохранения: записать, прочитать с другого устройства по профилю', async () => {
    const login = uniq('prog');
    const { data } = await json(await reg(login, '198.51.100.62'));
    const playerId = data.profile.playerId;
    const saved = await json(await post('/api/solo', { action: 'progress', playerId, session: data.token, progress: { learn: { xp: 120, lessons: { 'sc-i1': { at: 1, runs: 1, best: 90 } } } } }));
    expect(saved.status).toBe(200);
    const read = await json(await fetch(`${base}/api/solo?playerId=${encodeURIComponent(playerId)}&kind=progress`));
    expect(read.status).toBeLessThan(500);
  });
  it('друзья: заявка, ответ, список', async () => {
    const a = uniq('fra'); const b = uniq('frb');
    const ta = (await json(await reg(a, '198.51.100.63'))).data.token;
    const tb = (await json(await reg(b, '198.51.100.64'))).data.token;
    const sent = await json(await post('/api/account', { action: 'friend-add', token: ta, login: b }));
    expect(sent).toMatchObject({ status: 200, data: { status: 'sent' } });
    const ans = await json(await post('/api/account', { action: 'friend-answer', token: tb, login: a, accept: true }));
    expect(ans.status).toBe(200);
    const list = await json(await post('/api/account', { action: 'friends', token: ta }));
    expect(JSON.stringify(list.data)).toContain(b);
  });
  it('сетевая комната: создать, войти, чат, прочитать', async () => {
    const a = uniq('rma');
    const ta = (await json(await reg(a, '198.51.100.65'))).data.token;
    const created = await json(await post('/api/room', { action: 'create', session: ta, mode: 'cooperative', scenario: 'sandbox', public: false }));
    expect(created.status).toBe(200);
    const id = created.data.id || (created.data.room && created.data.room.id);
    expect(id).toBeTruthy();
    const got = await json(await fetch(`${base}/api/room?id=${encodeURIComponent(id)}`));
    expect(got.status).toBe(200);
  });
  it('исследование закрыто: статус отвечает, запись — 403 и ничего не пишет', async () => {
    const st = await json(await fetch(`${base}/api/research?action=status`));
    expect(st.status).toBe(200);
    expect(st.data.status).not.toBe('open');
    const en = await json(await post('/api/research', { action: 'enroll', adult: true, consent: st.data.consent }));
    expect(en.status).toBe(403);
  });
  it('события, вызов дня, рекорды, жалобы: обработчики отвечают через сервер', async () => {
    expect((await post('/api/events', { event: 'nope' })).status).toBe(400);
    expect((await fetch(`${base}/api/daily`)).status).toBe(200);
    expect((await fetch(`${base}/api/records?kind=tycoon`)).status).toBe(200);
    expect((await post('/api/reports', { action: 'send', session: 'nope' })).status).toBeGreaterThanOrEqual(400);
  });
});

describe('раздача сайта (SERVE_STATIC — локально и в браузерных тестах)', () => {
  it('адреса экранов → index.html; файлы — сами; чужой адрес — 404', async () => {
    for (const p of ['/', '/shop', '/book', '/book/supply-demand', '/research', '/profile/']) {
      expect(isSpaPath(p), p).toBe(true);
      const r = await fetch(`${base}${p}`);
      expect(r.status, p).toBe(200);
      expect(await r.text()).toContain('<div id="root">');
      expect(r.headers.get('content-security-policy')).toBe(SECURITY_HEADERS['Content-Security-Policy']);
    }
    const asset = await fetch(`${base}/assets/app-abc123.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${base}/favicon.svg`)).status).toBe(200);
    expect((await fetch(`${base}/nope/deeper`)).status).toBe(404);
    expect((await fetch(`${base}/book/a/b`)).status).toBe(404);
  });
});
