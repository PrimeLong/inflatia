/* ИССЛЕДОВАНИЕ (research/protocol.md): запись участника, входной тест и распределение по группам, события обучения, итоговый
   и отсроченный тесты, отзыв участия и выгрузка для анализа. Отдельно от аккаунтов: этот файл не читает сессию, логин
   и сетевой адрес (заголовки запроса не читаются вовсе, кроме ключа выгрузки), не импортирует store.js и
   accounts.js и пишет только в исследовательскую базу (api/_lib/research-store.js).

   Сейчас исследование ЗАКРЫТО: STUDY_STATUS в src/research/dictionary.js — 'draft' (протокол не утверждён, правовые
   основания не проверены). Пока это так, любое действие, кроме «status», отвечает 403 и ничего не пишет — даже если
   исследовательская база подключена. Открыть — только коммитом, по порядку из research/protocol.md, «Порядок запуска».

   Целостность (research/methodology.md, «Распределение»):
   — группа назначается только после входного теста, один раз: на время назначения участник блокируется (rlock, setNx на
     30 с), тест пишется один раз (rt:<код>:pre, setNx), номер в слое выдаёт атомарный счётчик (rcount:<слой>), группа —
     armAt(зерно, слой, номер), без встроенного случайного генератора; оборванное назначение при повторе доводится до конца с тем же номером
     (rslot:<код>);
   — тест принимается, только если в нём ровно задачи банка (TEST_ITEMS), форма — назначенная этому участнику, и он пришёл
     в своё окно (TEST_WINDOWS); повторная отправка того же теста — 409;
   — в базе нет точного времени: дата записи (день) — служебное поле, в выгрузку не идёт. */
import { timingSafeEqual } from 'node:crypto';
import { PROTOCOL_VERSION, STUDY_STATUS, TEST_ITEMS, TEST_WINDOWS, EVENT_LAST_DAY, MODULE_LESSONS } from '../src/research/dictionary.js';
import { cleanRecord, exportRecord, participantCode, normalizeCode } from '../src/research/record.js';
import { armAt, stratumOf } from '../src/research/randomize.js';
import { researchStore, hasResearchDb } from './_lib/research-store.js';

// версия информации для участника (research/participant-information.md); согласие с другой версией не принимается
export const CONSENT_VERSION = '0.2';
export const ENROLL_PER_DAY = 300;      // защита от массовой записи без адреса и логина
export const EVENTS_PER_PARTICIPANT = 3000;
export const LOCK_SECONDS = 30;
export const STAGE_ORDER = ['enrolled', 'pretest', 'material', 'posttest', 'delayed'];
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
   seed — зерно распределения; без него исследование открыть нельзя. coin — выбор порядка форм при записи (честная монета). */
export function makeHandler({ status, store, seed = null, exportToken = '', now = () => Date.now(), newCode = participantCode, coin = () => globalThis.crypto.getRandomValues(new Uint8Array(1))[0] < 128 }) {
  const open = () => status === 'open' && seed != null && seed !== '';
  async function loadParticipant(code) {
    const c = normalizeCode(code);
    if (!c) return { error: 'Код участника не распознан', status: 400 };
    const p = await store().get(`rp:${c}`);
    if (!p) return { error: 'Участник не найден', status: 404 };
    return { p, code: c };
  }
  /* строгая проверка теста: вид, форма участника, окно, ровно задачи банка по разу; возвращает строки для записи */
  function checkTest(p, kind, form, items) {
    if (!TEST_WINDOWS[kind]) return { error: 'Тест не распознан', status: 400 };
    if (form !== formFor(p, kind)) return { error: `Форма теста не та: ждали ${formFor(p, kind)}`, status: 400 };
    const d = studyDay(p, now()); const [from, to] = TEST_WINDOWS[kind];
    if (d < from || d > to) return { error: `Тест вне своего окна: день ${d}, окно ${from}–${to}`, status: 409 };
    if (!Array.isArray(items) || items.length !== TEST_ITEMS.length) return { error: `В тесте должно быть ${TEST_ITEMS.length} задач`, status: 400 };
    const ids = items.map((it) => it && it.item_id);
    if (new Set(ids).size !== ids.length || TEST_ITEMS.some((id) => !ids.includes(id))) return { error: 'Задачи теста не совпадают с банком', status: 400 };
    const rows = [];
    for (const it of items) {
      const { record, error } = cleanRecord('tests', { ...it, participant_code: p.participant_code, test_kind: kind, form, study_day: d });
      if (error) return { error, status: 400 };
      rows.push(record);
    }
    return { rows };
  }

  const actions = {
    // состояние — без записи чего-либо: открыто ли исследование и какая версия протокола
    status: async () => ({ status: open() ? 'open' : STUDY_STATUS === 'closed' ? 'closed' : 'not-started', protocol: PROTOCOL_VERSION, consent: CONSENT_VERSION }),
    // запись: только с подтверждением совершеннолетия и согласием с текущей версией информации; сервер назначает порядок форм
    enroll: async (b) => {
      if (b.adult !== true) return { error: 'В пилоте участвуют только совершеннолетние', status: 400 };
      if (b.consent !== CONSENT_VERSION) return { error: 'Нужно согласие с текущей версией информации для участника', status: 400 };
      const t = now();
      if ((await store().incr(`rday:${day(t)}`)) > ENROLL_PER_DAY) return { error: 'Запись на сегодня закрыта', status: 429 };
      const code = newCode();
      const p = { participant_code: code, protocol_version: PROTOCOL_VERSION, consent_version: CONSENT_VERSION, adult_confirmed: true, period: month(t), stage: 'enrolled',
        form_order: coin() ? 'AB' : 'BA', enrolled_on: day(t) };
      if (cleanRecord('participants', p).error) return { error: 'Запись не прошла проверку', status: 500 };
      if (!(await store().setNx(`rp:${code}`, p))) return { error: 'Код уже занят — попробуйте ещё раз', status: 409 };
      return { code, forms: { pre: formFor(p, 'pre'), post: formFor(p, 'post'), delayed: 'C' } };
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
        const checked = checkTest(p0, 'pre', b.form, b.items); if (checked.error) return checked;
        let rows = checked.rows;
        if (!(await store().setNx(`rt:${got.code}:pre`, rows))) rows = await store().get(`rt:${got.code}:pre`);
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
    // событие обучения: только поля словаря, только уроки модуля и до конца окна отсроченного теста; день ставит сервер
    event: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const d = studyDay(got.p, now());
      if (d > EVENT_LAST_DAY) return { error: 'Исследование для участника закончилось', status: 409 };
      const raw = b.event && typeof b.event === 'object' && !Array.isArray(b.event) ? b.event : {};
      if (raw.lesson_id != null && !MODULE_LESSONS.includes(raw.lesson_id)) return { error: 'Урок не из модуля исследования', status: 400 };
      const { record, error } = cleanRecord('events', { ...raw, participant_code: got.code, study_day: d });
      if (error) return { error, status: 400 };
      if ((await store().push(`re:${got.code}`, record)) > EVENTS_PER_PARTICIPANT) return { error: 'Слишком много событий', status: 429 };
      if (got.p.stage === 'pretest') await store().set(`rp:${got.code}`, advance(got.p, 'material'));
      return { ok: true };
    },
    // итоговый и отсроченный тесты: своя форма, своё окно, ровно задачи банка, один раз
    test: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!['post', 'delayed'].includes(b.kind)) return { error: 'Тест не распознан', status: 400 };
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const checked = checkTest(got.p, b.kind, b.form, b.items); if (checked.error) return checked;
      if (!(await store().setNx(`rt:${got.code}:${b.kind}`, checked.rows))) return { error: 'Этот тест уже пройден', status: 409 };
      // после итогового теста — вопрос о смешении групп: пользовались ли обычной Инфляцией (необязательный)
      const used = b.kind === 'post' && ['no', 'yes', 'unsure'].includes(b.used_regular_app) ? { used_regular_app: b.used_regular_app } : {};
      const fresh = (await store().get(`rp:${got.code}`)) || got.p;
      await store().set(`rp:${got.code}`, advance({ ...fresh, ...used }, b.kind === 'post' ? 'posttest' : 'delayed'));
      return { ok: true };
    },
    // отзыв участия (до фиксации набора): все записи участника стираются, остаётся только общее число отозвавших
    withdraw: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      await store().del(`rp:${got.code}`, `re:${got.code}`, `rt:${got.code}:pre`, `rt:${got.code}:post`, `rt:${got.code}:delayed`, `rslot:${got.code}`, `rlock:${got.code}`);
      await store().incr('rwithdrawn');
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
   подключена своя исследовательская база и задано зерно распределения (RESEARCH_ALLOC_SEED). */
const liveStatus = STUDY_STATUS === 'open' && process.env.RESEARCH_STATUS === 'open' && hasResearchDb() ? 'open' : 'closed';
export default makeHandler({ status: liveStatus, store: researchStore, seed: process.env.RESEARCH_ALLOC_SEED || null, exportToken: process.env.RESEARCH_EXPORT_TOKEN || '' });
