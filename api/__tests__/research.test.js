/* Исследование отдельно от аккаунтов: закрыто, пока протокол — черновик; не читает заголовки, сессию и адрес; пишет только
   поля словаря и только в свою базу; отзыв участия стирает всё. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import liveHandler, { makeHandler, CONSENT_VERSION } from '../research.js';
import { memoryStore } from '../_lib/research-store.js';
import { participantCode } from '../../src/research/record.js';
import { seededRandom } from '../../src/research/randomize.js';

// запрос, у которого чтение любого заголовка, кроме ключа выгрузки, — ошибка теста
const strictHeaders = (extra = {}) => new Proxy(extra, { get(t, k) { if (typeof k === 'string' && k !== 'x-research-token') throw new Error(`прочитан заголовок ${k}`); return t[k]; } });
const call = (handler, body, { method = 'POST', headers = {} } = {}) => new Promise((resolve) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ status: this.code, data: d }); return this; } };
  handler({ method, query: method === 'GET' ? body : {}, headers: strictHeaders(headers), body: method === 'GET' ? undefined : body }, res);
});
let n = 0;
const openStudy = () => { const st = memoryStore(); return { st, h: makeHandler({ status: 'open', store: () => st, exportToken: 'секрет-исследователя', rnd: seededRandom(5), newCode: () => participantCode(() => (n += 1) % 31), now: () => Date.UTC(2027, 1, 1) }) }; };
const items = (k, right) => Array.from({ length: k }, (_, i) => ({ item_id: `hh-q${i + 1}`, correct: i < right, active_seconds: 30 }));

describe('исследование: сервер', () => {
  it('рабочий обработчик закрыт: протокол — черновик; ничего не пишет и сообщает «не начато»', async () => {
    expect((await call(liveHandler, { action: 'status' }, { method: 'GET' })).data.status).toBe('not-started');
    const r = await call(liveHandler, { action: 'enroll', adult: true, consent: CONSENT_VERSION });
    expect(r.status).toBe(403);
    expect(r.data.error).toBe('Исследование сейчас не проводится');
    expect((await call(liveHandler, { action: 'export' }, { headers: { 'x-research-token': '' } })).status).toBe(403);
  });
  it('отдельно от аккаунтов: не импортирует базу аккаунтов и сессии, исследовательская база — только по своим переменным', () => {
    const api = readFileSync(new URL('../research.js', import.meta.url), 'utf8');
    const store = readFileSync(new URL('../_lib/research-store.js', import.meta.url), 'utf8');
    for (const src of [api, store]) {
      expect(src).not.toMatch(/from '\.\.?\/(_lib\/)?(store|accounts|friends)\.js'/);
      expect(src).not.toMatch(/userBySession|x-forwarded-for|x-real-ip|cookie/i);
    }
    expect(store).toContain('RESEARCH_KV_REST_API_URL');
    expect(store).not.toMatch(/Redis\.fromEnv/);
  });
  it('без совершеннолетия и согласия с текущей версией — не записывает', async () => {
    const { h, st } = openStudy();
    expect((await call(h, { action: 'enroll', adult: false, consent: CONSENT_VERSION })).status).toBe(400);
    expect((await call(h, { action: 'enroll', adult: true, consent: '0.0' })).status).toBe(400);
    expect(await st.keys('rp:')).toEqual([]);
  });
  it('полный путь участника: запись → входной тест и группа → события → итоговый и отсроченный тесты → выгрузка только полей словаря', async () => {
    const { h } = openStudy();
    const { data: { code } } = await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION, login: 'anna' });
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{3}$/);
    // до входного теста группы нет — событие не принимается
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } })).status).toBe(409);
    const pre = await call(h, { action: 'pretest', code, form: 'A', items: items(12, 4), material_version: 'c87eaba' });
    expect(['game', 'plain']).toContain(pre.data.arm);
    expect((await call(h, { action: 'pretest', code, form: 'A', items: items(12, 4) })).status).toBe(409);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'hh-i1', active_seconds: 420 } })).data).toEqual({ ok: true });
    // лишнее поле отклоняет событие целиком
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'hh-i1', ip: '1.2.3.4' } })).data.error).toMatch(/запрещённое поле: ip/);
    expect((await call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(12, 9), used_regular_app: 'no' })).data).toEqual({ ok: true });
    expect((await call(h, { action: 'test', code, kind: 'delayed', form: 'C', items: items(12, 8) })).data).toEqual({ ok: true });
    expect((await call(h, { action: 'export' }, { headers: { 'x-research-token': 'не тот' } })).status).toBe(403);
    const ex = (await call(h, { action: 'export' }, { headers: { 'x-research-token': 'секрет-исследователя' } })).data;
    expect(ex.participants).toHaveLength(1);
    expect(ex.participants[0]).toEqual({ participant_code: code, protocol_version: '0.1', consent_version: CONSENT_VERSION, adult_confirmed: true, period: '2027-02', stage: 'delayed', stratum: 'low', arm: pre.data.arm, material_version: 'c87eaba', used_regular_app: 'no' });
    expect(ex.events).toEqual([{ participant_code: code, study_day: 0, event_type: 'lesson_done', lesson_id: 'hh-i1', active_seconds: 420 }]);
    expect(ex.tests).toHaveLength(36);
    expect(JSON.stringify(ex)).not.toMatch(/anna|enrolledMs|1\.2\.3\.4/);
  });
  it('отзыв участия стирает все записи участника; остаётся только общее число отозвавших', async () => {
    const { h, st } = openStudy();
    const { data: { code } } = await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION });
    await call(h, { action: 'pretest', code, form: 'A', items: items(12, 8) });
    await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } });
    expect((await call(h, { action: 'withdraw', code: code.toLowerCase() })).data).toEqual({ ok: true });
    expect((await st.keys('rp:')).length + (await st.keys('re:')).length + (await st.keys('rt:')).length).toBe(0);
    expect(await st.get('rwithdrawn')).toBe(1);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start' } })).status).toBe(404);
  });
});
