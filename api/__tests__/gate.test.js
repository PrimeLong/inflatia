/* ЗАКРЫТЫЙ САЙТ (api/_lib/gate.js; пункт владельца 28.11, п. 3): ключ — только в SITE_KEY, пропуск — cookie; без
   пропуска открыты вход, восстановление и проверка ключа; аккаунт с действующей сессией пропуск получает сам. Ключ в
   тесте — синтетический, к настоящему отношения не имеет. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import accountHandler from '../account.js';
import dailyHandler from '../daily.js';
import eventsHandler from '../events.js';
import { gatePass, PASS_COOKIE } from '../_lib/gate.js';

const KEY = 'synthetic-test-key-7Hq2';
let saved;
beforeAll(() => { saved = process.env.SITE_KEY; process.env.SITE_KEY = KEY; });
afterAll(() => { if (saved == null) delete process.env.SITE_KEY; else process.env.SITE_KEY = saved; });

let ipN = 0;
const call = (handler, { method = 'POST', body = null, query = {}, cookie = '' } = {}) => new Promise((resolve) => {
  const headers = {};
  const res = {
    code: 200,
    setHeader(k, v) { headers[k.toLowerCase()] = v; }, getHeader(k) { return headers[k.toLowerCase()]; },
    status(c) { this.code = c; return this; }, json(d) { resolve({ status: this.code, data: d, headers }); return this; },
  };
  handler({ method, query, body, headers: { 'x-forwarded-for': `10.9.0.${ipN++}`, ...(cookie ? { cookie } : {}) } }, res);
});
const passCookie = () => `${PASS_COOKIE}=${gatePass()}`;
const setCookieOf = (r) => [].concat(r.headers['set-cookie'] || []).join('; ');
let n = 0; const uniq = () => `gate${n++}user`;
const reg = (login, cookie = '') => call(accountHandler, { body: { action: 'register', consentPage: true, consentPd: true, birthYear: 1990, login, password: 'secret12', name: 'Тест', playerId: `dev-${login}` }, cookie });

describe('закрытый сайт: ключ входа', () => {
  it('без пропуска регистрация закрыта: 403 и заголовок X-Inflatia-Closed', async () => {
    const r = await reg(uniq());
    expect(r.status).toBe(403);
    expect(r.data.closed).toBe(true);
    expect(r.headers['x-inflatia-closed']).toBe('1');
  });
  it('неверный ключ — 403 без «закрыто» (экран ключа остаётся, просто ошибка); верный — пропуск в cookie', async () => {
    const bad = await call(accountHandler, { body: { action: 'gate', key: 'не тот' } });
    expect(bad.status).toBe(403);
    expect(bad.data.error).toBe('Неверный ключ');
    expect(bad.headers['x-inflatia-closed']).toBeUndefined();
    const ok = await call(accountHandler, { body: { action: 'gate', key: KEY } });
    expect(ok.status).toBe(200);
    const sc = setCookieOf(ok);
    expect(sc).toContain(`${PASS_COOKIE}=${gatePass()}`);
    expect(sc).toMatch(/HttpOnly/); expect(sc).toMatch(/Secure/);
    // в cookie — не сам ключ
    expect(sc).not.toContain(KEY);
  });
  it('с пропуском регистрация работает; вход в аккаунт — без ключа и сам выдаёт пропуск', async () => {
    const login = uniq();
    const r = await reg(login, passCookie());
    expect(r.status).toBe(200);
    expect(r.data.token).toBeTruthy();
    const lg = await call(accountHandler, { body: { action: 'login', login, password: 'secret12' } });
    expect(lg.status).toBe(200);
    expect(setCookieOf(lg)).toContain(`${PASS_COOKIE}=${gatePass()}`);
  });
  it('у кого есть аккаунт: действующая сессия без cookie пропускается и получает пропуск; чужая выдуманная — нет', async () => {
    const login = uniq();
    const r = await reg(login, passCookie());
    const me = await call(accountHandler, { body: { action: 'me', token: r.data.token } });
    expect(me.status).toBe(200);
    expect(setCookieOf(me)).toContain(PASS_COOKIE);
    const gate = await call(accountHandler, { body: { action: 'gate', token: r.data.token } });
    expect(gate.status).toBe(200);
    const fake = await call(accountHandler, { body: { action: 'me', token: 'x'.repeat(40) } });
    expect(fake.status).toBe(403);
    expect(fake.data.closed).toBe(true);
  });
  it('остальные адреса API без пропуска закрыты, с пропуском — работают', async () => {
    const d0 = await call(dailyHandler, { method: 'GET', query: { day: '2026-11-28', playerId: 'p1' } });
    expect(d0.status).toBe(403);
    const d1 = await call(dailyHandler, { method: 'GET', query: { day: '2026-11-28', playerId: 'p1' }, cookie: passCookie() });
    expect(d1.status).not.toBe(403);
    const e0 = await call(eventsHandler, { body: { event: 'app_open' } });
    expect(e0.status).toBe(403);
    // поддельный пропуск не подходит
    const e1 = await call(eventsHandler, { body: { event: 'app_open' }, cookie: `${PASS_COOKIE}=${'0'.repeat(48)}` });
    expect(e1.status).toBe(403);
  });
});
