/* Исследование отдельно от аккаунтов: закрыто, пока протокол — черновик; не читает заголовки, сессию и адрес; пишет только
   поля словаря и только в свою базу; распределение — по зерну и атомарно; тесты — строго по банку, форме и окну; отзыв
   участия стирает всё. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import liveHandler, { makeHandler, CONSENT_VERSION, formFor } from '../research.js';
import { memoryStore } from '../_lib/research-store.js';
import { participantCode } from '../../src/research/record.js';
import { armAt } from '../../src/research/randomize.js';
import { TEST_ITEMS } from '../../src/research/dictionary.js';

// запрос, у которого чтение любого заголовка, кроме ключа выгрузки, — ошибка теста
const strictHeaders = (extra = {}) => new Proxy(extra, { get(t, k) { if (typeof k === 'string' && k !== 'x-research-token') throw new Error(`прочитан заголовок ${k}`); return t[k]; } });
const call = (handler, body, { method = 'POST', headers = {} } = {}) => new Promise((resolve) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ status: this.code, data: d }); return this; } };
  handler({ method, query: method === 'GET' ? body : {}, headers: strictHeaders(headers), body: method === 'GET' ? undefined : body }, res);
});
const DAY = 86400000;
const T0 = Date.UTC(2027, 1, 1, 10);
let n = 0;
const openStudy = (clock = { t: T0 }) => {
  const st = memoryStore();
  return { st, clock, h: makeHandler({ status: 'open', store: () => st, seed: 'зерно-теста', exportToken: 'секрет-исследователя',
    // коды — разные: номер по порядку, разложенный по алфавиту кода
    newCode: () => { let k = (n += 1); return participantCode((a) => { const d = k % a; k = Math.floor(k / a); return d; }); }, now: () => clock.t, coin: () => true }) };
};
const items = (right) => TEST_ITEMS.map((id, i) => ({ item_id: id, correct: i < right, active_seconds: 30 }));
const enroll = async (h) => (await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION })).data.code;

describe('исследование: сервер', () => {
  it('рабочий обработчик закрыт: протокол — черновик; ничего не пишет и сообщает «не начато»', async () => {
    expect((await call(liveHandler, { action: 'status' }, { method: 'GET' })).data.status).toBe('not-started');
    const r = await call(liveHandler, { action: 'enroll', adult: true, consent: CONSENT_VERSION });
    expect(r.status).toBe(403);
    expect(r.data.error).toBe('Исследование сейчас не проводится');
    expect((await call(liveHandler, { action: 'export' }, { headers: { 'x-research-token': '' } })).status).toBe(403);
  });
  it('без зерна распределения исследование не открывается, даже если статус «open»', async () => {
    const st = memoryStore();
    const h = makeHandler({ status: 'open', store: () => st, seed: null });
    expect((await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION })).status).toBe(403);
    expect((await call(h, { action: 'status' }, { method: 'GET' })).data.status).toBe('not-started');
  });
  it('отдельно от аккаунтов: не импортирует базу аккаунтов и сессии; группы — без Math.random', () => {
    const api = readFileSync(new URL('../research.js', import.meta.url), 'utf8');
    const store = readFileSync(new URL('../_lib/research-store.js', import.meta.url), 'utf8');
    for (const src of [api, store]) {
      expect(src).not.toMatch(/from '\.\.?\/(_lib\/)?(store|accounts|friends)\.js'/);
      expect(src).not.toMatch(/userBySession|x-forwarded-for|x-real-ip|cookie/i);
    }
    expect(api).not.toMatch(/Math\.random/);
    expect(store).toContain('RESEARCH_KV_REST_API_URL');
    expect(store).not.toMatch(/Redis\.fromEnv/);
  });
  it('без совершеннолетия и согласия с текущей версией — не записывает', async () => {
    const { h, st } = openStudy();
    expect((await call(h, { action: 'enroll', adult: false, consent: CONSENT_VERSION })).status).toBe(400);
    expect((await call(h, { action: 'enroll', adult: true, consent: '0.1' })).status).toBe(400);
    expect(await st.keys('rp:')).toEqual([]);
  });
  it('в базе нет точного времени: дата записи — днём, служебное поле, в выгрузку не идёт', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    const p = await st.get(`rp:${code}`);
    expect(p.enrolled_on).toBe('2027-02-01');
    expect(JSON.stringify(p)).not.toMatch(/\d{2}:\d{2}|T\d|enrolledMs|1\d{12}/);
    const ex = (await call(h, { action: 'export' }, { headers: { 'x-research-token': 'секрет-исследователя' } })).data;
    expect(ex.participants[0]).not.toHaveProperty('enrolled_on');
  });
  it('полный путь участника: запись → входной тест и группа по зерну → события → итоговый и отсроченный тесты в своих окнах → выгрузка', async () => {
    const { h, clock } = openStudy();
    const r = await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION, login: 'anna' });
    const { code, forms } = r.data;
    expect(forms).toEqual({ pre: 'A', post: 'B', delayed: 'C' });
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } })).status).toBe(409);
    const pre = await call(h, { action: 'pretest', code, form: 'A', items: items(4), material_version: 'c87eaba' });
    // первый участник слоя «low» — группа по зерну, позиция 0
    expect(pre.data.arm).toBe(armAt('зерно-теста', 'low', 0));
    clock.t = T0 + 2 * DAY;
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'hh-i1', active_seconds: 420 } })).data).toEqual({ ok: true });
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'sc-i1' } })).data.error).toMatch(/не из модуля/);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'hh-i1', ip: '1.2.3.4' } })).data.error).toMatch(/запрещённое поле: ip/);
    clock.t = T0 + 10 * DAY;
    expect((await call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(9), used_regular_app: 'no' })).data).toEqual({ ok: true });
    clock.t = T0 + 30 * DAY;
    expect((await call(h, { action: 'test', code, kind: 'delayed', form: 'C', items: items(8) })).data).toEqual({ ok: true });
    expect((await call(h, { action: 'export' }, { headers: { 'x-research-token': 'не тот' } })).status).toBe(403);
    const ex = (await call(h, { action: 'export' }, { headers: { 'x-research-token': 'секрет-исследователя' } })).data;
    expect(ex.participants).toEqual([{ participant_code: code, protocol_version: '0.2', consent_version: CONSENT_VERSION, adult_confirmed: true, period: '2027-02', stage: 'delayed',
      stratum: 'low', arm: pre.data.arm, material_version: 'c87eaba', used_regular_app: 'no', form_order: 'AB' }]);
    expect(ex.events).toEqual([{ participant_code: code, study_day: 2, event_type: 'lesson_done', lesson_id: 'hh-i1', active_seconds: 420 }]);
    expect(ex.tests).toHaveLength(36);
    expect(ex.tests.filter((t) => t.test_kind === 'delayed').every((t) => t.study_day === 30)).toBe(true);
    expect(JSON.stringify(ex)).not.toMatch(/anna|enrolled|1\.2\.3\.4/);
  });
  it('строгая проверка теста: число и id задач банка, форма участника, окно', async () => {
    const { h, clock } = openStudy();
    const code = await enroll(h);
    expect((await call(h, { action: 'pretest', code, form: 'B', items: items(4) })).data.error).toMatch(/Форма теста не та/);
    expect((await call(h, { action: 'pretest', code, form: 'A', items: items(4).slice(0, 11) })).data.error).toMatch(/12 задач/);
    const dup = items(4); dup[11] = { ...dup[0] };
    expect((await call(h, { action: 'pretest', code, form: 'A', items: dup })).data.error).toMatch(/не совпадают с банком/);
    const alien = items(4); alien[0] = { ...alien[0], item_id: 'q99' };
    expect((await call(h, { action: 'pretest', code, form: 'A', items: alien })).data.error).toMatch(/не совпадают с банком/);
    clock.t = T0 + 3 * DAY;
    expect((await call(h, { action: 'pretest', code, form: 'A', items: items(4) })).status).toBe(409);
    clock.t = T0;
    expect((await call(h, { action: 'pretest', code, form: 'A', items: items(4) })).status).toBe(200);
    // отсроченный тест на 20-й день — вне окна 28–35; итоговый на 20-й — тоже вне окна
    clock.t = T0 + 20 * DAY;
    expect((await call(h, { action: 'test', code, kind: 'delayed', form: 'C', items: items(5) })).status).toBe(409);
    expect((await call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(5) })).status).toBe(409);
    clock.t = T0 + 40 * DAY;
    expect((await call(h, { action: 'event', code, event: { event_type: 'session_start' } })).data.error).toMatch(/закончилось/);
  });
  it('повторная отправка: входной, итоговый и отсроченный тест принимаются один раз — даже одновременно', async () => {
    const { h, st, clock } = openStudy();
    const code = await enroll(h);
    const pres = await Promise.all(Array.from({ length: 6 }, () => call(h, { action: 'pretest', code, form: 'A', items: items(8) })));
    expect(pres.filter((r) => r.status === 200)).toHaveLength(1);
    expect(pres.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await st.get('rcount:high')).toBe(1);
    expect(await st.get(`rt:${code}:pre`)).toHaveLength(12);
    clock.t = T0 + 5 * DAY;
    const posts = await Promise.all(Array.from({ length: 4 }, () => call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(9) })));
    expect(posts.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(2) })).status).toBe(409);
    expect((await st.get(`rt:${code}:post`)).filter((r) => r.correct)).toHaveLength(9);
  });
  it('одновременное распределение многих участников: у каждого своя позиция в слое, группы — ровно по зерну, без дыр и повторов', async () => {
    const { h, st } = openStudy();
    const codes = [];
    for (let i = 0; i < 40; i += 1) codes.push(await enroll(h));
    // половина — в слое «high», половина — в «low»; все отправляют входной тест одновременно
    const res = await Promise.all(codes.map((code, i) => call(h, { action: 'pretest', code, form: 'A', items: items(i % 2 ? 9 : 2) })));
    expect(res.every((r) => r.status === 200)).toBe(true);
    for (const stratum of ['low', 'high']) {
      const mine = codes.filter((_, i) => (i % 2 ? 'high' : 'low') === stratum);
      const slots = await Promise.all(mine.map((c) => st.get(`rslot:${c}`)));
      expect([...slots].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, k) => k));
      const ps = await Promise.all(mine.map((c) => st.get(`rp:${c}`)));
      ps.forEach((p, k) => expect(p.arm).toBe(armAt('зерно-теста', stratum, slots[k])));
      expect(ps.filter((p) => p.arm === 'game')).toHaveLength(ps.filter((p) => p.arm === 'plain').length);
    }
    expect(await st.get('rcount:low')).toBe(20);
  });
  it('оборванное назначение доводится повтором: тест уже записан, группы нет — тот же тест, новая позиция один раз', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    await st.setNx(`rt:${code}:pre`, items(8).map((it) => ({ ...it, participant_code: code, test_kind: 'pre', form: 'A', study_day: 0 })));
    const r = await call(h, { action: 'pretest', code, form: 'A', items: items(1) });
    expect(r.status).toBe(200);
    // слой — по записанному тесту (8 из 12), а не по повторной отправке
    expect((await st.get(`rp:${code}`)).stratum).toBe('high');
    expect(r.data.arm).toBe(armAt('зерно-теста', 'high', 0));
  });
  it('отзыв участия стирает все записи участника; остаётся только общее число отозвавших', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    await call(h, { action: 'pretest', code, form: 'A', items: items(8) });
    await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } });
    expect((await call(h, { action: 'withdraw', code: code.toLowerCase() })).data).toEqual({ ok: true });
    for (const prefix of ['rp:', 're:', 'rt:', 'rslot:', 'rlock:']) expect(await st.keys(prefix), prefix).toEqual([]);
    expect(await st.get('rwithdrawn')).toBe(1);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start' } })).status).toBe(404);
    expect(formFor({ form_order: 'BA' }, 'post')).toBe('A');
  });
});
