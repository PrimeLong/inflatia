/* Исследование отдельно от аккаунтов: закрыто, пока протокол — черновик; не читает заголовки, сессию и адрес; пишет только
   поля словаря и только в свою базу; распределение — по зерну и атомарно; тесты — строго по банку, форме и окну; отзыв
   участия стирает всё. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import liveHandler, { makeHandler, CONSENT_VERSION, formFor } from '../research.js';
import { memoryStore } from '../_lib/research-store.js';
import { participantCode } from '../../src/research/record.js';
import { armAt } from '../../src/research/randomize.js';
import { TEST_ITEMS, MODULE_LESSONS } from '../../src/research/dictionary.js';
import { MODULE } from '../../src/research/module.js';
import { keyFor, publicForm, scoreItem } from '../_lib/research-key.js';

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
// ответы формы: первые right — по ключу, остальные — заведомо неверные (сервер сам решает, что верно)
const wrongOf = (form, id) => { const k = keyFor(form, id); return typeof k === 'number' ? String(k + 777) : (k === 'а' ? 'б' : 'а'); };
const items = (right, form = 'A') => TEST_ITEMS.map((id, i) => ({ item_id: id, answer: i < right ? String(keyFor(form, id)).replace('.', ',') : wrongOf(form, id) }));
const enroll = async (h) => (await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION })).data.code;
// тест целиком: получить задачи (с этого момента сервер считает время) и отправить ответы
const take = async (h, code, kind, form, right, extra = {}) => {
  await call(h, { action: 'form', code, kind });
  return call(h, { action: kind === 'pre' ? 'pretest' : 'test', code, kind, form, items: items(right, form), ...extra });
};
// пройти урок модуля: ответить на каждое задание (верно)
const passLesson = async (h, code, lesson) => {
  for (const ex of MODULE.find((l) => l.id === lesson).exercises) await call(h, { action: 'answer', code, exercise_id: ex.id, answer: String(ex.answer) });
};

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
  it('полный путь участника: запись → входной тест и группа по зерну → занятия (ответы проверяет сервер) → итоговый и отсроченный тесты в своих окнах → выгрузка', async () => {
    const { h, clock } = openStudy();
    const r = await call(h, { action: 'enroll', adult: true, consent: CONSENT_VERSION, login: 'anna' });
    const { code, forms } = r.data;
    expect(forms).toEqual({ pre: 'A', post: 'B', delayed: 'C' });
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } })).status).toBe(409);
    // задачи входного теста — от сервера и без ответов
    const form = (await call(h, { action: 'form', code, kind: 'pre' })).data;
    expect(form.form).toBe('A'); expect(form.items).toHaveLength(12);
    expect(JSON.stringify(form)).not.toMatch(/"answer"|"tol"/);
    clock.t += 300000;
    const pre = await call(h, { action: 'pretest', code, form: 'A', items: items(4), material_version: 'c87eaba' });
    // первый участник слоя «low» — группа по зерну, позиция 0
    expect(pre.data.arm).toBe(armAt('зерно-теста', 'low', 0));
    clock.t = T0 + 2 * DAY;
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } })).data).toEqual({ ok: true });
    clock.t += 40000;
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-a', answer: '8 000' })).data).toEqual({ correct: true, attempt_no: 1, lesson_done: false });
    clock.t += 20000;
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-b', answer: '3000' })).data).toMatchObject({ correct: false, attempt_no: 1 });
    clock.t += 15000;
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-b', answer: '3500' })).data).toMatchObject({ correct: true, attempt_no: 2 });
    clock.t += 30000; await call(h, { action: 'answer', code, exercise_id: 'hh-i1-c', answer: 'а' });
    clock.t += 3600000; // час простоя — в активное время входит не больше 3 минут
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-d', answer: '−3000' })).data).toMatchObject({ correct: true, lesson_done: true });
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_done', lesson_id: 'sc-i1' } })).data.error).toMatch(/пишет сервер/);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'sc-i1' } })).data.error).toMatch(/не из модуля/);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1', ip: '1.2.3.4' } })).data.error).toMatch(/запрещённое поле: ip/);
    for (const l of MODULE_LESSONS.slice(1)) await passLesson(h, code, l);
    clock.t = T0 + 10 * DAY;
    expect((await take(h, code, 'post', 'B', 9, { used_regular_app: 'no' })).data).toEqual({ ok: true });
    clock.t = T0 + 30 * DAY;
    expect((await take(h, code, 'delayed', 'C', 8)).data).toEqual({ ok: true });
    expect((await call(h, { action: 'export' }, { headers: { 'x-research-token': 'не тот' } })).status).toBe(403);
    const ex = (await call(h, { action: 'export' }, { headers: { 'x-research-token': 'секрет-исследователя' } })).data;
    expect(ex.participants).toEqual([{ participant_code: code, protocol_version: '0.3', consent_version: CONSENT_VERSION, adult_confirmed: true, period: '2027-02', stage: 'delayed',
      stratum: 'low', arm: pre.data.arm, material_version: 'c87eaba', used_regular_app: 'no', form_order: 'AB' }]);
    const first = ex.events.filter((e) => e.lesson_id === 'hh-i1');
    expect(first[0]).toEqual({ participant_code: code, study_day: 2, event_type: 'lesson_start', lesson_id: 'hh-i1' });
    expect(first.filter((e) => e.event_type === 'exercise_answer').map((e) => [e.exercise_id, e.task_no, e.correct, e.attempt_no, e.active_seconds])).toEqual([
      ['hh-i1-a', 1, true, 1, 40], ['hh-i1-b', 2, false, 1, 20], ['hh-i1-b', 2, true, 2, 15], ['hh-i1-c', 3, true, 1, 30], ['hh-i1-d', 4, true, 1, 180]]);
    expect(first.find((e) => e.event_type === 'lesson_done')).toEqual({ participant_code: code, study_day: 2, event_type: 'lesson_done', lesson_id: 'hh-i1', active_seconds: 285 });
    expect(ex.events.filter((e) => e.event_type === 'lesson_done')).toHaveLength(8);
    expect(ex.tests).toHaveLength(36);
    // «верно» — по ключу сервера: во входном 4 из 12, в итоговом 9, в отсроченном 8
    expect(['pre', 'post', 'delayed'].map((k) => ex.tests.filter((t) => t.test_kind === k && t.correct).length)).toEqual([4, 9, 8]);
    expect(ex.tests.filter((t) => t.test_kind === 'pre').every((t) => t.test_seconds === 300)).toBe(true);
    expect(ex.tests.filter((t) => t.test_kind === 'delayed').every((t) => t.study_day === 30)).toBe(true);
    expect(JSON.stringify(ex)).not.toMatch(/anna|enrolled|1\.2\.3\.4|"answer"/);
  });
  // замечания владельца 18.11, пп. 1–3: клиенту не верим ни в правильности, ни во времени, ни в завершении уроков
  it('правильность считает сервер: поле correct и время от клиента — 400; ответы сверяются с ключом; задачи — только после выдачи', async () => {
    const { h } = openStudy();
    const code = await enroll(h);
    // без выдачи задач тест не принимается
    expect((await call(h, { action: 'pretest', code, form: 'A', items: items(6) })).data.error).toMatch(/Сначала получите задачи/);
    await call(h, { action: 'form', code, kind: 'pre' });
    const cheat = TEST_ITEMS.map((id) => ({ item_id: id, answer: 'x', correct: true }));
    expect((await call(h, { action: 'pretest', code, form: 'A', items: cheat })).data.error).toMatch(/считает сервер/);
    const timed = items(3).map((it) => ({ ...it, active_seconds: 5 }));
    expect((await call(h, { action: 'pretest', code, form: 'A', items: timed })).data.error).toMatch(/считает сервер/);
    // «все верно» по мнению клиента не помогает: сырые неверные ответы — слой low
    const r = await call(h, { action: 'pretest', code, form: 'A', items: items(0) });
    expect(r.status).toBe(200);
    expect(scoreItem('A', 'q01', '6 500')).toBe(true); expect(scoreItem('A', 'q01', '6400')).toBe(false); expect(scoreItem('B', 'q11', '12,5%')).toBe(true);
    // ответ на задание модуля: correct, attempt_no, active_seconds от клиента — 400
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-a', answer: '1', correct: true })).status).toBe(400);
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-a', answer: '1', active_seconds: 600 })).status).toBe(400);
    expect((await call(h, { action: 'answer', code, exercise_id: 'нет-такого', answer: '1' })).status).toBe(400);
    expect((await call(h, { action: 'answer', code, exercise_id: 'hh-i1-a', answer: '1' })).data.correct).toBe(false);
    // события «урок пройден» и «ответ на задание» клиент не пишет
    for (const ev of [{ event_type: 'lesson_done', lesson_id: 'hh-i1' }, { event_type: 'exercise_answer', lesson_id: 'hh-i1', exercise_id: 'hh-i1-a' }]) {
      expect((await call(h, { action: 'event', code, event: ev })).status).toBe(400);
    }
    expect((await call(h, { action: 'event', code, event: { event_type: 'session_start', session_no: 5 } })).status).toBe(400);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1', active_seconds: 9 } })).status).toBe(400);
    // клиентские тексты формы не содержат ключа
    for (const f of ['A', 'B', 'C']) expect(JSON.stringify(publicForm(f))).not.toMatch(/answer|tol/);
  });
  it('итоговый тест до 14-го дня — только после восьми уроков по данным сервера; с 14-го по 16-й — у всех', async () => {
    const { h, clock } = openStudy();
    const a = await enroll(h); const b = await enroll(h);
    for (const c of [a, b]) expect((await take(h, c, 'pre', 'A', 6)).status).toBe(200);
    clock.t = T0 + 5 * DAY;
    // 7 уроков из 8 — рано; даже выдать задачи нельзя
    for (const l of MODULE_LESSONS.slice(0, 7)) await passLesson(h, a, l);
    expect((await call(h, { action: 'form', code: a, kind: 'post' })).data.error).toMatch(/пройдено 7/);
    expect((await call(h, { action: 'test', code: a, kind: 'post', form: 'B', items: items(9, 'B') })).status).toBe(409);
    expect((await call(h, { action: 'progress', code: a })).data.lessons_done).toHaveLength(7);
    await passLesson(h, a, MODULE_LESSONS[7]);
    expect((await take(h, a, 'post', 'B', 9)).status).toBe(200);
    // второй не прошёл ни урока: до 14-го дня — нет, на 14-й — да (позднее окно протокола)
    clock.t = T0 + 13 * DAY;
    expect((await take(h, b, 'post', 'B', 5)).status).toBe(409);
    clock.t = T0 + 14 * DAY;
    expect((await take(h, b, 'post', 'B', 5)).status).toBe(200);
    // повторный ответ на уже отвеченное задание не «доделывает» урок второй раз
    await passLesson(h, a, MODULE_LESSONS[0]);
    const ex = (await call(h, { action: 'export' }, { headers: { 'x-research-token': 'секрет-исследователя' } })).data;
    expect(ex.events.filter((e) => e.participant_code === a && e.event_type === 'lesson_done')).toHaveLength(8);
  });
  it('одновременные ответы на последнее задание урока: «урок пройден» записывается один раз', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    await take(h, code, 'pre', 'A', 6);
    const lesson = MODULE[0];
    for (const ex of lesson.exercises.slice(0, -1)) await call(h, { action: 'answer', code, exercise_id: ex.id, answer: String(ex.answer) });
    const last = lesson.exercises[lesson.exercises.length - 1];
    const res = await Promise.all(Array.from({ length: 5 }, () => call(h, { action: 'answer', code, exercise_id: last.id, answer: String(last.answer) })));
    expect(res.filter((r) => r.data.lesson_done)).toHaveLength(1);
    expect(res.map((r) => r.data.attempt_no).sort()).toEqual([1, 2, 3, 4, 5]);
    expect((await st.list(`re:${code}`)).filter((e) => e.event_type === 'lesson_done')).toHaveLength(1);
  });
  it('строгая проверка теста: число и id задач банка, форма участника, окно', async () => {
    const { h, clock } = openStudy();
    const code = await enroll(h);
    await call(h, { action: 'form', code, kind: 'pre' });
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
    expect((await take(h, code, 'delayed', 'C', 5)).status).toBe(409);
    expect((await take(h, code, 'post', 'B', 5)).status).toBe(409);
    clock.t = T0 + 40 * DAY;
    expect((await call(h, { action: 'event', code, event: { event_type: 'session_start' } })).data.error).toMatch(/закончилось/);
  });
  it('повторная отправка: входной, итоговый и отсроченный тест принимаются один раз — даже одновременно', async () => {
    const { h, st, clock } = openStudy();
    const code = await enroll(h);
    await call(h, { action: 'form', code, kind: 'pre' });
    const pres = await Promise.all(Array.from({ length: 6 }, () => call(h, { action: 'pretest', code, form: 'A', items: items(8) })));
    expect(pres.filter((r) => r.status === 200)).toHaveLength(1);
    expect(pres.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await st.get('rcount:high')).toBe(1);
    expect(await st.get(`rt:${code}:pre`)).toHaveLength(12);
    clock.t = T0 + 14 * DAY;
    await call(h, { action: 'form', code, kind: 'post' });
    const posts = await Promise.all(Array.from({ length: 4 }, () => call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(9, 'B') })));
    expect(posts.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await call(h, { action: 'test', code, kind: 'post', form: 'B', items: items(2, 'B') })).status).toBe(409);
    expect((await st.get(`rt:${code}:post`)).filter((r) => r.correct)).toHaveLength(9);
  });
  it('одновременное распределение многих участников: у каждого своя позиция в слое, группы — ровно по зерну, без дыр и повторов', async () => {
    const { h, st } = openStudy();
    const codes = [];
    for (let i = 0; i < 40; i += 1) codes.push(await enroll(h));
    // половина — в слое «high», половина — в «low»; все отправляют входной тест одновременно
    for (const code of codes) await call(h, { action: 'form', code, kind: 'pre' });
    const res = await Promise.all(codes.map((code, i) => call(h, { action: 'pretest', code, form: 'A', items: items(i % 2 ? 9 : 2) })));
    expect(res.every((r) => r.status === 200)).toBe(true);
    for (const stratum of ['low', 'high']) {
      const mine = codes.filter((_, i) => (i % 2 ? 'high' : 'low') === stratum);
      const slots = await Promise.all(mine.map((c) => st.get(`rslot:${c}`)));
      expect([...slots].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, k) => k));
      const ps = await Promise.all(mine.map((c) => st.get(`rp:${c}`)));
      ps.forEach((p, k) => expect(p.arm).toBe(armAt('зерно-теста', stratum, slots[k])));
      expect(Math.abs(ps.filter((p) => p.arm === 'game').length - ps.filter((p) => p.arm === 'plain').length)).toBeLessThanOrEqual(3);
    }
    expect(await st.get('rcount:low')).toBe(20);
  });
  it('оборванное назначение доводится повтором: тест уже записан, группы нет — тот же тест, новая позиция один раз', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    await st.setNx(`rt:${code}:pre`, TEST_ITEMS.map((id, i) => ({ item_id: id, correct: i < 8, participant_code: code, test_kind: 'pre', form: 'A', study_day: 0 })));
    const r = await call(h, { action: 'pretest', code, form: 'A', items: items(1) });
    expect(r.status).toBe(200);
    // слой — по записанному тесту (8 из 12), а не по повторной отправке
    expect((await st.get(`rp:${code}`)).stratum).toBe('high');
    expect(r.data.arm).toBe(armAt('зерно-теста', 'high', 0));
  });
  it('отзыв участия стирает все записи участника; остаётся только общее число отозвавших', async () => {
    const { h, st } = openStudy();
    const code = await enroll(h);
    await take(h, code, 'pre', 'A', 8);
    await call(h, { action: 'event', code, event: { event_type: 'lesson_start', lesson_id: 'hh-i1' } });
    await passLesson(h, code, 'hh-i1');
    expect((await st.keys(`rx:${code}:`)).length).toBeGreaterThan(5);
    expect((await call(h, { action: 'withdraw', code: code.toLowerCase() })).data).toEqual({ ok: true });
    for (const prefix of ['rp:', 're:', 'rt:', 'rslot:', 'rlock:', 'rx:']) expect(await st.keys(prefix), prefix).toEqual([]);
    expect(await st.get('rwithdrawn')).toBe(1);
    expect((await call(h, { action: 'event', code, event: { event_type: 'lesson_start' } })).status).toBe(404);
    expect(formFor({ form_order: 'BA' }, 'post')).toBe('A');
  });
  it('информация для участника — той же версии, что принимает сервер, и с контактом ответственного (без ФИО)', () => {
    const info = readFileSync(new URL('../../research/participant-information.md', import.meta.url), 'utf8');
    expect(info).toContain(`Версия информации: ${CONSENT_VERSION}`);
    expect(info).toContain('Discord **privet1**'); expect(info).toContain('Telegram **@Yyyeeeeessssss**');
    expect(info).not.toMatch(/заполнить при фиксации/);
  });
});
