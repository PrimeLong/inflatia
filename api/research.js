/* ИССЛЕДОВАНИЕ (research/protocol.md): запись участника, входной тест и распределение по группам, события обучения, итоговый
   и отсроченный тесты, отзыв участия и выгрузка для анализа. База одна с Инфляцией (DATABASE_URL), но таблица своя —
   inflatia_research (api/_lib/research-store.js); этот файл не импортирует store.js и accounts.js и не читает заголовки
   запроса (кроме ключа выгрузки): сетевой адрес в исследование не попадает.

   Связь с аккаунтом — только там, где она нужна методике (research/methodology.md, раздел 8), и только через мост
   api/_lib/research-link.js: при записи и продолжении сервер по ключу входа (поле token в теле) узнаёт логин и год рождения.
   Логин держит пару rla:/rlc: — один аккаунт, одно участие; год рождения проверяет критерий 18+. В записи исследования
   (participants, events, tests) ни логин, ни год не пишутся; в выгрузку для анализа связь не идёт.

   Сейчас исследование ЗАКРЫТО: STUDY_STATUS в src/research/dictionary.js — 'draft' (протокол не утверждён, правовые
   основания не проверены). Пока это так, любое действие, кроме «status», отвечает 403 и ничего не пишет — даже если
   база подключена. Открыть — только коммитом, по порядку из research/protocol.md, «Порядок запуска».

   Целостность (research/methodology.md, «Распределение»):
   — группа назначается только после входного теста, один раз: на время назначения участник блокируется (rlock, setNx на
     30 с), тест пишется один раз (rt:<код>:pre, setNx), номер в слое выдаёт атомарный счётчик (rcount:<слой>), группа —
     armAt(зерно, слой, номер), без встроенного случайного генератора; оборванное назначение при повторе доводится до конца с тем же номером
     (rslot:<код>);
   — тест принимается, только если в нём ровно задачи банка (TEST_ITEMS), форма — назначенная этому участнику, и он пришёл
     в своё окно (TEST_WINDOWS); повторная отправка того же теста — 409;
   — в базе нет точного времени: дата записи (день) — служебное поле, в выгрузку не идёт.

   Достоверность (замечания владельца 18.11, пп. 1–3) — клиенту не верим ни в правильности, ни во времени, ни в завершении:
   — задачи теста выдаёт сервер (действие «form»), ключ ответов — только на сервере (api/_lib/research-key.js); клиент шлёт
     сырые ответы, «верно / неверно» считает сервер; поле correct от клиента — 400;
   — ответы на задания модуля идут действием «answer»: сервер сверяет с ключом модуля (src/research/module.js), сам ставит
     номер попытки, номер задания и активное время по своим часам; «урок пройден» пишет сервер, когда получил ответ на каждое
     задание урока; клиент может сообщить только «начал урок» и «начал занятие» (CLIENT_EVENT_TYPES);
   — итоговый тест до 14-го дня — только после восьми уроков, пройденных по данным сервера; с 14-го по 16-й — у всех. */
import { timingSafeEqual } from 'node:crypto';
import { PROTOCOL_VERSION, STUDY_STATUS, TEST_ITEMS, TEST_WINDOWS, EVENT_LAST_DAY, MODULE_LESSONS, CLIENT_EVENT_TYPES, SERVER_FIELDS, POST_FREE_DAY, IDLE_CAP } from '../src/research/dictionary.js';
import { MODULE_BY_LESSON, EXERCISE_INDEX, checkModuleAnswer } from '../src/research/module.js';
import { publicForm, scoreItem, answerOk } from './_lib/research-key.js';
import { cleanRecord, exportRecord, participantCode, normalizeCode } from '../src/research/record.js';
import { forbiddenField as forbiddenFieldOf } from '../src/research/dictionary.js';
import { armAt, stratumOf } from '../src/research/randomize.js';
import { researchStore, hasResearchDb, wipeParticipant, linkKeyOfLogin, linkKeyOfCode } from './_lib/research-store.js';
import { accountOf } from './_lib/research-link.js';

// версия информации для участника (research/participant-information.md); согласие с другой версией не принимается
export const CONSENT_VERSION = '0.4';
export const ADULT_AGE = 18;
export const ENROLL_PER_DAY = 300;      // защита от массовой записи без адреса и логина
export const EVENTS_PER_PARTICIPANT = 3000;
export const LOCK_SECONDS = 30;
export const STAGE_ORDER = ['enrolled', 'pretest', 'material', 'posttest', 'delayed'];
export const PURGE_PHRASE = 'УДАЛИТЬ НАБОР';
export const PURGE_PREFIXES = ['rp:', 're:', 'rt:', 'rx:', 'rslot:', 'rlock:', 'rcount:', 'rday:', 'rla:', 'rlc:', 'rwithdrawn'];
export const ISSUE_SECONDS = 4 * 3600;   // выданные задачи теста ждут ответа 4 часа
export const LAST_SECONDS = 30 * 60;     // отметка последнего действия живёт 30 минут
const VERSION_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const month = (now) => new Date(now).toISOString().slice(0, 7);
const day = (now) => new Date(now).toISOString().slice(0, 10);
// день исследования: сколько полных суток (по датам UTC) прошло с даты записи
const studyDay = (p, now) => Math.max(0, Math.round((Date.parse(day(now)) - Date.parse(p.enrolled_on)) / 86400000));
// форма теста этого вида для участника: входной — первая в порядке, итоговый — вторая, отсроченный — C
export const formFor = (p, kind) => (kind === 'delayed' ? 'C' : kind === 'pre' ? p.form_order[0] : p.form_order[1]);

const advance = (p, stage) => (STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(p.stage) ? { ...p, stage } : p);
const sameToken = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); };

/* Обработчик собирается из настроек: тест подставляет открытое исследование, хранилище в памяти и зерно; рабочий — ниже.
   seed — зерно распределения; без него исследование открыть нельзя. coin — выбор порядка форм при записи (честная монета).
   whoIs — кто вошёл по ключу входа: { login, birthYear } или null (рабочий — мост api/_lib/research-link.js). */
export function makeHandler({ status, store, seed = null, exportToken = '', now = () => Date.now(), newCode = participantCode, coin = () => globalThis.crypto.getRandomValues(new Uint8Array(1))[0] < 128, whoIs = async () => null }) {
  const open = () => status === 'open' && seed != null && seed !== '';
  async function loadParticipant(code) {
    const c = normalizeCode(code);
    if (!c) return { error: 'Код участника не распознан', status: 400 };
    const p = await store().get(`rp:${c}`);
    if (!p) return { error: 'Участник не найден', status: 404 };
    return { p, code: c };
  }
  // ход участника по модулю, который ведёт сервер (rx:<код>:…)
  const rx = (code, k) => `rx:${code}:${k}`;
  const lessonsDone = async (code) => {
    const out = [];
    for (const id of MODULE_LESSONS) if ((await store().get(rx(code, `done:${id}`))) != null) out.push(id);
    return out;
  };
  // можно ли сейчас проходить тест этого вида: окно, а для итогового до 14-го дня — все восемь уроков по данным сервера
  async function testAllowed(p, code, kind) {
    if (!TEST_WINDOWS[kind]) return { error: 'Тест не распознан', status: 400 };
    const d = studyDay(p, now()); const [from, to] = TEST_WINDOWS[kind];
    if (d < from || d > to) return { error: `Тест вне своего окна: день ${d}, окно ${from}–${to}`, status: 409 };
    if (kind === 'pre' && p.arm) return { error: 'Входной тест уже пройден', status: 409 };
    if (kind !== 'pre' && !p.arm) return { error: 'Сначала входной тест', status: 409 };
    if (kind === 'post' && d < POST_FREE_DAY) {
      const done = await lessonsDone(code);
      if (done.length < MODULE_LESSONS.length) return { error: `Итоговый тест — после всех ${MODULE_LESSONS.length} уроков модуля или с ${POST_FREE_DAY}-го дня: пройдено ${done.length}`, status: 409 };
    }
    return { day: d };
  }
  /* строгая проверка теста: вид, форма участника, окно, ровно задачи банка по разу, ответы — сырые; «верно» считает сервер
     по ключу, длительность — по своим часам от выдачи задач; возвращает строки для записи */
  async function checkTest(p, code, kind, form, items) {
    const ok = await testAllowed(p, code, kind); if (ok.error) return ok;
    if (form !== formFor(p, kind)) return { error: `Форма теста не та: ждали ${formFor(p, kind)}`, status: 400 };
    if (!Array.isArray(items) || items.length !== TEST_ITEMS.length) return { error: `В тесте должно быть ${TEST_ITEMS.length} задач`, status: 400 };
    const ids = items.map((it) => it && it.item_id);
    if (new Set(ids).size !== ids.length || TEST_ITEMS.some((id) => !ids.includes(id))) return { error: 'Задачи теста не совпадают с банком', status: 400 };
    if (items.some((it) => SERVER_FIELDS.some((f) => f in it))) return { error: 'Правильность и время теста считает сервер — клиент присылает только ответы', status: 400 };
    if (items.some((it) => !answerOk(it.answer))) return { error: 'Ответ не распознан', status: 400 };
    const issued = await store().get(rx(code, `issue:${kind}`));
    if (issued == null) return { error: 'Сначала получите задачи теста', status: 409 };
    const secs = Math.max(0, Math.min(14400, Math.round((now() - issued) / 1000)));
    const rows = [];
    for (const it of items) {
      const { record, error } = cleanRecord('tests', { participant_code: p.participant_code, test_kind: kind, form, item_id: it.item_id,
        correct: scoreItem(form, it.item_id, it.answer) === true, study_day: ok.day, test_seconds: secs });
      if (error) return { error, status: 400 };
      rows.push(record);
    }
    return { rows };
  }
  // активное время по часам сервера: промежуток с прошлого действия, простой дольше IDLE_CAP не считается
  async function tick(code) {
    const t = now();
    const last = await store().get(rx(code, 'last'));
    await store().setEx(rx(code, 'last'), t, LAST_SECONDS);
    return last == null ? 0 : Math.max(0, Math.min(IDLE_CAP, Math.round((t - last) / 1000)));
  }

  const actions = {
    // состояние — без записи чего-либо: открыто ли исследование и какая версия протокола
    status: async () => ({ status: open() ? 'open' : STUDY_STATUS === 'closed' ? 'closed' : 'not-started', protocol: PROTOCOL_VERSION, consent: CONSENT_VERSION }),
    /* запись: только из аккаунта Инфляции (один аккаунт — одно участие), с подтверждением совершеннолетия и согласием
       с текущей версией информации; сервер назначает порядок форм. Логин идёт только в пару связи rla:/rlc: */
    enroll: async (b) => {
      if (b.adult !== true) return { error: 'В пилоте участвуют только совершеннолетние', status: 400 };
      if (b.consent !== CONSENT_VERSION) return { error: 'Нужно согласие с текущей версией информации для участника', status: 400 };
      const acc = await whoIs(b.token);
      if (!acc || !acc.login) return { error: 'Войдите в аккаунт Инфляции: участие привязывается к аккаунту', status: 401 };
      const t = now();
      // год рождения аккаунта: по году младше 18 — не принимаем, даже с отметкой (точной даты рождения нет)
      if (acc.birthYear && new Date(t).getUTCFullYear() - acc.birthYear < ADULT_AGE) return { error: 'В пилоте участвуют только совершеннолетние', status: 400 };
      if (await store().get(linkKeyOfLogin(acc.login))) return { error: 'Этот аккаунт уже участвует в исследовании', status: 409 };
      if ((await store().incr(`rday:${day(t)}`)) > ENROLL_PER_DAY) return { error: 'Запись на сегодня закрыта', status: 429 };
      const code = newCode();
      const p = { participant_code: code, protocol_version: PROTOCOL_VERSION, consent_version: CONSENT_VERSION, adult_confirmed: true, period: month(t), stage: 'enrolled',
        form_order: coin() ? 'AB' : 'BA', enrolled_on: day(t) };
      if (cleanRecord('participants', p).error) return { error: 'Запись не прошла проверку', status: 500 };
      // сначала связь (setNx — два одновременных запроса одного аккаунта не запишут двух участников), потом участник
      if (!(await store().setNx(linkKeyOfLogin(acc.login), code))) return { error: 'Этот аккаунт уже участвует в исследовании', status: 409 };
      if (!(await store().setNx(`rp:${code}`, p))) { await store().del(linkKeyOfLogin(acc.login)); return { error: 'Код уже занят — попробуйте ещё раз', status: 409 }; }
      await store().set(linkKeyOfCode(code), acc.login);
      return { code, forms: { pre: formFor(p, 'pre'), post: formFor(p, 'post'), delayed: 'C' } };
    },
    // продолжить на другом устройстве: по ключу входа — код участника этого аккаунта
    resume: async (b) => {
      const acc = await whoIs(b.token);
      if (!acc || !acc.login) return { error: 'Войдите в аккаунт Инфляции', status: 401 };
      const code = await store().get(linkKeyOfLogin(acc.login));
      if (!code || !(await store().get(`rp:${code}`))) return { error: 'Этот аккаунт не участвует в исследовании', status: 404 };
      return { code };
    },
    // задачи теста — без ответов; с этого момента сервер считает время теста
    form: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      const ok = await testAllowed(got.p, got.code, b.kind); if (ok.error) return ok;
      if ((await store().get(`rt:${got.code}:${b.kind}`)) && got.p.arm) return { error: 'Этот тест уже пройден', status: 409 };
      await store().setNx(rx(got.code, `issue:${b.kind}`), now(), ISSUE_SECONDS);
      const form = formFor(got.p, b.kind);
      return { kind: b.kind, form, items: publicForm(form) };
    },
    /* входной тест → слой → группа. Под блокировкой участника; тест пишется один раз; номер в слое — атомарный счётчик.
       Оборвалось посередине (тест записан, группы нет) — повтор доводит назначение по уже записанному тесту */
    pretest: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (got.p.arm) return { error: 'Входной тест уже пройден', status: 409 };
      if (!(await store().setNx(`rlock:${got.code}`, 1, LOCK_SECONDS))) return { error: 'Входной тест уже отправляется', status: 409 };
      try {
        const p0 = await store().get(`rp:${got.code}`);
        if (!p0 || p0.arm) return { error: 'Входной тест уже пройден', status: 409 };
        let rows = await store().get(`rt:${got.code}:pre`);
        if (!rows) {
          const checked = await checkTest(p0, got.code, 'pre', b.form, b.items); if (checked.error) return checked;
          rows = checked.rows;
          if (!(await store().setNx(`rt:${got.code}:pre`, rows))) rows = await store().get(`rt:${got.code}:pre`);
          await store().del(rx(got.code, 'issue:pre'));
        }
        const stratum = stratumOf(rows.filter((r) => r.correct).length, rows.length);
        let slot = await store().get(`rslot:${got.code}`);
        if (slot == null) {
          const n = await store().incr(`rcount:${stratum}`);
          if (!(await store().setNx(`rslot:${got.code}`, n - 1))) slot = await store().get(`rslot:${got.code}`); else slot = n - 1;
        }
        const arm = armAt(seed, stratum, slot);
        const mv = typeof b.material_version === 'string' && VERSION_RE.test(b.material_version) ? b.material_version : undefined;
        await store().set(`rp:${got.code}`, advance({ ...p0, stratum, arm, ...(mv ? { material_version: mv } : {}) }, 'pretest'));
        return { arm };
      } finally {
        await store().del(`rlock:${got.code}`);
      }
    },
    /* событие от клиента — только «начал урок» и «начал занятие»; день, номер занятия и время ставит сервер.
       Ответы на задания и «урок пройден» клиент не присылает: их пишет сервер (действие «answer») */
    event: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const d = studyDay(got.p, now());
      if (d > EVENT_LAST_DAY) return { error: 'Исследование для участника закончилось', status: 409 };
      const raw = b.event && typeof b.event === 'object' && !Array.isArray(b.event) ? b.event : {};
      const bad = Object.keys(raw).map(forbiddenFieldOf).find(Boolean);
      if (bad) return { error: `запрещённое поле: ${bad}`, status: 400 };
      if (SERVER_FIELDS.some((f) => f in raw)) return { error: 'Это поле события ставит сервер', status: 400 };
      if (!CLIENT_EVENT_TYPES.includes(raw.event_type)) return { error: 'Это событие пишет сервер: ответ на задание — действием «answer», «урок пройден» — сам по ответам', status: 400 };
      if (raw.event_type === 'lesson_start' && !MODULE_LESSONS.includes(raw.lesson_id)) return { error: 'Урок не из модуля исследования', status: 400 };
      const extra = raw.event_type === 'session_start' ? { session_no: Math.min(200, await store().incr(rx(got.code, 'sess'))) } : { lesson_id: raw.lesson_id };
      await tick(got.code);
      const { record, error } = cleanRecord('events', { participant_code: got.code, study_day: d, event_type: raw.event_type, ...extra });
      if (error) return { error, status: 400 };
      if ((await store().push(`re:${got.code}`, record)) > EVENTS_PER_PARTICIPANT) return { error: 'Слишком много событий', status: 429 };
      if (got.p.stage === 'pretest') await store().set(`rp:${got.code}`, advance(got.p, 'material'));
      return { ok: true };
    },
    /* ответ на задание модуля: «верно» — по ключу модуля, попытка и номер задания — по счётчикам сервера, время — по часам
       сервера; когда отвечено каждое задание урока — сервер сам пишет «урок пройден» с суммой активного времени урока */
    answer: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const d = studyDay(got.p, now());
      if (d > EVENT_LAST_DAY) return { error: 'Исследование для участника закончилось', status: 409 };
      if (SERVER_FIELDS.some((f) => f in b)) return { error: 'Правильность, попытку и время ставит сервер', status: 400 };
      const hit = EXERCISE_INDEX[b.exercise_id];
      if (!hit) return { error: 'Задание не из модуля исследования', status: 400 };
      if (!answerOk(b.answer) || b.answer == null || b.answer === '') return { error: 'Ответ не распознан', status: 400 };
      const code = got.code; const lesson = hit.lesson_id;
      const correct = checkModuleAnswer(b.exercise_id, b.answer) === true;
      const attempt = await store().incr(rx(code, `att:${b.exercise_id}`));
      const secs = await tick(code);
      await store().incrBy(rx(code, `sec:${lesson}`), secs);
      const { record, error } = cleanRecord('events', { participant_code: code, study_day: d, event_type: 'exercise_answer', lesson_id: lesson,
        task_no: hit.task_no, exercise_id: b.exercise_id, correct, attempt_no: Math.min(99, attempt), active_seconds: secs });
      if (error) return { error, status: 400 };
      if ((await store().push(`re:${code}`, record)) > EVENTS_PER_PARTICIPANT) return { error: 'Слишком много событий', status: 429 };
      let lessonDone = false;
      if (await store().setNx(rx(code, `seen:${b.exercise_id}`), 1)) {
        const answered = await store().incr(rx(code, `cnt:${lesson}`));
        if (answered === MODULE_BY_LESSON[lesson].exercises.length && (await store().setNx(rx(code, `done:${lesson}`), d))) {
          lessonDone = true;
          const total = Math.min(7200, (await store().get(rx(code, `sec:${lesson}`))) || 0);
          await store().push(`re:${code}`, { participant_code: code, study_day: d, event_type: 'lesson_done', lesson_id: lesson, active_seconds: total });
        }
      }
      const fresh = (await store().get(`rp:${code}`)) || got.p;
      if (fresh.stage === 'pretest') await store().set(`rp:${code}`, advance(fresh, 'material'));
      return { correct, attempt_no: attempt, lesson_done: lessonDone };
    },
    // где участник: группа, день, пройденные по данным сервера уроки, какие тесты уже приняты
    progress: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      const tests = {};
      for (const kind of Object.keys(TEST_WINDOWS)) tests[kind] = !!(await store().get(`rt:${got.code}:${kind}`));
      return { arm: got.p.arm || null, day: studyDay(got.p, now()), lessons_done: await lessonsDone(got.code), tests, forms: { pre: formFor(got.p, 'pre'), post: formFor(got.p, 'post'), delayed: 'C' } };
    },
    // итоговый и отсроченный тесты: своя форма, своё окно, ровно задачи банка, один раз
    test: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!['post', 'delayed'].includes(b.kind)) return { error: 'Тест не распознан', status: 400 };
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      if (await store().get(`rt:${got.code}:${b.kind}`)) return { error: 'Этот тест уже пройден', status: 409 };
      const checked = await checkTest(got.p, got.code, b.kind, b.form, b.items); if (checked.error) return checked;
      if (!(await store().setNx(`rt:${got.code}:${b.kind}`, checked.rows))) return { error: 'Этот тест уже пройден', status: 409 };
      await store().del(rx(got.code, `issue:${b.kind}`));
      // после итогового теста — вопрос о смешении групп: пользовались ли обычной Инфляцией (необязательный)
      const used = b.kind === 'post' && ['no', 'yes', 'unsure'].includes(b.used_regular_app) ? { used_regular_app: b.used_regular_app } : {};
      const fresh = (await store().get(`rp:${got.code}`)) || got.p;
      await store().set(`rp:${got.code}`, advance({ ...fresh, ...used }, b.kind === 'post' ? 'posttest' : 'delayed'));
      return { ok: true };
    },
    // отзыв участия (до фиксации набора): все записи участника и связь с аккаунтом стираются, остаётся только общее число отозвавших
    withdraw: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      await wipeParticipant(store(), got.code);
      return { ok: true };
    },
  };

  return async function handler(req, res) {
    try {
      const b = (req.body && typeof req.body === 'object') ? req.body : {};
      const action = req.method === 'GET' ? (req.query && req.query.action) || 'status' : b.action;
      // выгрузка для анализа: только по ключу исследователя, только поля словаря без служебных
      if (action === 'export') {
        if (!exportToken || !sameToken(req.headers && req.headers['x-research-token'], exportToken)) return res.status(403).json({ error: 'Нет доступа' });
        const keys = await store().keys('rp:');
        const participants = []; const events = []; const tests = [];
        for (const k of keys) {
          const p = await store().get(k);
          participants.push(exportRecord('participants', p));
          events.push(...(await store().list(`re:${p.participant_code}`)));
          for (const kind of Object.keys(TEST_WINDOWS)) tests.push(...((await store().get(`rt:${p.participant_code}:${kind}`)) || []));
        }
        return res.status(200).json({ protocol: PROTOCOL_VERSION, participants, events, tests, withdrawn: (await store().get('rwithdrawn')) || 0 });
      }
      /* удаление набора при фиксации (research/retention-policy.md, «Удаление»): только по ключу исследователя и с фразой
         подтверждения; стирает все ключи таблицы исследования (и связь с аккаунтами), число отозвавших возвращает для отчёта */
      if (action === 'purge') {
        if (!exportToken || !sameToken(req.headers && req.headers['x-research-token'], exportToken)) return res.status(403).json({ error: 'Нет доступа' });
        if (b.confirm !== PURGE_PHRASE) return res.status(400).json({ error: `Нужна фраза подтверждения: ${PURGE_PHRASE}` });
        const withdrawn = (await store().get('rwithdrawn')) || 0;
        const keys = [];
        for (const prefix of PURGE_PREFIXES) keys.push(...(await store().keys(prefix)));
        if (keys.length) await store().del(...keys);
        return res.status(200).json({ ok: true, deleted: keys.length, withdrawn });
      }
      if (!actions[action]) return res.status(400).json({ error: 'Неизвестное действие' });
      if (action !== 'status' && !open()) return res.status(403).json({ error: 'Исследование сейчас не проводится' });
      const out = await actions[action](b);
      if (out && out.error) return res.status(out.status || 400).json({ error: out.error });
      return res.status(200).json(out);
    } catch (err) {
      console.error('research handler error:', err && err.message);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  };
}

/* Рабочий обработчик: открыт, только если исследование открыто И в коде (STUDY_STATUS), И в окружении (RESEARCH_STATUS),
   подключена база (DATABASE_URL — таблица исследования в ней) и задано зерно распределения (RESEARCH_ALLOC_SEED). */
const liveStatus = STUDY_STATUS === 'open' && process.env.RESEARCH_STATUS === 'open' && hasResearchDb() ? 'open' : 'closed';
export default makeHandler({ status: liveStatus, store: researchStore, seed: process.env.RESEARCH_ALLOC_SEED || null, exportToken: process.env.RESEARCH_EXPORT_TOKEN || '', whoIs: accountOf });
