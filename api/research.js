/* ИССЛЕДОВАНИЕ (research/protocol.md): запись участника, входной тест и распределение по группам, события обучения, итоговый
   и отсроченный тесты, отзыв участия и выгрузка для анализа. Отдельно от аккаунтов: этот файл не читает сессию, логин
   и сетевой адрес (заголовки запроса не читаются вовсе, кроме ключа выгрузки), не импортирует store.js и
   accounts.js и пишет только в исследовательскую базу (api/_lib/research-store.js).

   Сейчас исследование ЗАКРЫТО: STUDY_STATUS в src/research/dictionary.js — 'draft' (протокол не утверждён, правовые
   основания не проверены). Пока это так, любое действие, кроме «status», отвечает 403 и ничего не пишет — даже если
   исследовательская база подключена. Открыть — только коммитом, по порядку из research/protocol.md, «Порядок запуска». */
import { timingSafeEqual } from 'node:crypto';
import { PROTOCOL_VERSION, STUDY_STATUS, TEST_FORMS } from '../src/research/dictionary.js';
import { cleanRecord, participantCode, normalizeCode } from '../src/research/record.js';
import { allocate, emptyAllocation, stratumOf } from '../src/research/randomize.js';
import { researchStore, hasResearchDb } from './_lib/research-store.js';

// версия информации для участника (research/participant-information.md); согласие с другой версией не принимается
export const CONSENT_VERSION = '0.1';
export const ENROLL_PER_DAY = 300;      // защита от массовой записи без адреса и логина
export const EVENTS_PER_PARTICIPANT = 3000;
export const STAGE_ORDER = ['enrolled', 'pretest', 'material', 'posttest', 'delayed'];
const VERSION_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const month = (now) => new Date(now).toISOString().slice(0, 7);
const day = (now) => new Date(now).toISOString().slice(0, 10);
const studyDay = (p, now) => Math.max(0, Math.floor((now - p.enrolledMs) / 86400000));

// участник в базе: запись словаря + служебное время записи (в выгрузку не идёт — вместо него день исследования)
const publicParticipant = (p) => cleanRecord('participants', Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'enrolledMs'))).record;
const advance = (p, stage) => (STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(p.stage) ? { ...p, stage } : p);
const sameToken = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); };

/* Обработчик собирается из настроек: тест подставляет открытое исследование и хранилище в памяти; рабочий — ниже. */
export function makeHandler({ status, store, exportToken = '', now = () => Date.now(), rnd = Math.random, newCode = participantCode }) {
  const open = () => status === 'open';
  async function loadParticipant(code) {
    const c = normalizeCode(code);
    if (!c) return { error: 'Код участника не распознан', status: 400 };
    const p = await store().get(`rp:${c}`);
    if (!p) return { error: 'Участник не найден', status: 404 };
    return { p, code: c };
  }
  async function saveTests(p, kind, form, items) {
    if (!TEST_FORMS.includes(form) || !Array.isArray(items) || !items.length || items.length > 40) return { error: 'Тест не распознан', status: 400 };
    const rows = [];
    for (const it of items) {
      const { record, error } = cleanRecord('tests', { ...it, participant_code: p.participant_code, test_kind: kind, form, study_day: studyDay(p, now()) });
      if (error) return { error, status: 400 };
      rows.push(record);
    }
    const prev = await store().list(`rt:${p.participant_code}`);
    if (prev.some((r) => r.test_kind === kind)) return { error: 'Этот тест уже пройден', status: 409 };
    for (const r of rows) await store().push(`rt:${p.participant_code}`, r);
    return { rows };
  }

  const actions = {
    // состояние — без записи чего-либо: открыто ли исследование и какая версия протокола
    status: async () => ({ status: open() ? 'open' : STUDY_STATUS === 'closed' ? 'closed' : 'not-started', protocol: PROTOCOL_VERSION, consent: CONSENT_VERSION }),
    // запись: только с подтверждением совершеннолетия и согласием с текущей версией информации
    enroll: async (b) => {
      if (b.adult !== true) return { error: 'В пилоте участвуют только совершеннолетние', status: 400 };
      if (b.consent !== CONSENT_VERSION) return { error: 'Нужно согласие с текущей версией информации для участника', status: 400 };
      const t = now();
      if ((await store().incr(`rday:${day(t)}`)) > ENROLL_PER_DAY) return { error: 'Запись на сегодня закрыта', status: 429 };
      const code = newCode();
      const p = { participant_code: code, protocol_version: PROTOCOL_VERSION, consent_version: CONSENT_VERSION, adult_confirmed: true, period: month(t), stage: 'enrolled', enrolledMs: t };
      if (cleanRecord('participants', publicParticipant(p)).error) return { error: 'Запись не прошла проверку', status: 500 };
      await store().set(`rp:${code}`, p);
      return { code };
    },
    // входной тест → слой → группа; группа назначается только здесь и только раз
    pretest: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (got.p.arm) return { error: 'Входной тест уже пройден', status: 409 };
      const saved = await saveTests(got.p, 'pre', b.form, b.items); if (saved.error) return saved;
      const stratum = stratumOf(saved.rows.filter((r) => r.correct).length, saved.rows.length);
      const { arm, state } = allocate((await store().get('ralloc')) || emptyAllocation(), stratum, rnd);
      await store().set('ralloc', state);
      const mv = typeof b.material_version === 'string' && VERSION_RE.test(b.material_version) ? b.material_version : undefined;
      const p = advance({ ...got.p, stratum, arm, ...(mv ? { material_version: mv } : {}) }, 'pretest');
      await store().set(`rp:${got.code}`, p);
      return { arm };
    },
    // событие обучения: только поля словаря; день исследования ставит сервер
    event: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const raw = b.event && typeof b.event === 'object' && !Array.isArray(b.event) ? b.event : {};
      const { record, error } = cleanRecord('events', { ...raw, participant_code: got.code, study_day: studyDay(got.p, now()) });
      if (error) return { error, status: 400 };
      if ((await store().push(`re:${got.code}`, record)) > EVENTS_PER_PARTICIPANT) return { error: 'Слишком много событий', status: 429 };
      if (got.p.stage === 'pretest') await store().set(`rp:${got.code}`, advance(got.p, 'material'));
      return { ok: true };
    },
    // итоговый и отсроченный тесты
    test: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      if (!['post', 'delayed'].includes(b.kind)) return { error: 'Тест не распознан', status: 400 };
      if (!got.p.arm) return { error: 'Сначала входной тест', status: 409 };
      const saved = await saveTests(got.p, b.kind, b.form, b.items); if (saved.error) return saved;
      // после итогового теста — вопрос о смешении групп: пользовались ли обычной Инфляцией (необязательный)
      const used = ['no', 'yes', 'unsure'].includes(b.used_regular_app) ? { used_regular_app: b.used_regular_app } : {};
      await store().set(`rp:${got.code}`, advance({ ...got.p, ...used }, b.kind === 'post' ? 'posttest' : 'delayed'));
      return { ok: true };
    },
    // отзыв участия: все записи участника стираются, остаётся только общее число отозвавших
    withdraw: async (b) => {
      const got = await loadParticipant(b.code); if (got.error) return got;
      await store().del(`rp:${got.code}`, `re:${got.code}`, `rt:${got.code}`);
      await store().incr('rwithdrawn');
      return { ok: true };
    },
  };

  return async function handler(req, res) {
    try {
      const b = (req.body && typeof req.body === 'object') ? req.body : {};
      const action = req.method === 'GET' ? (req.query && req.query.action) || 'status' : b.action;
      // выгрузка для анализа: только по ключу исследователя, только поля словаря
      if (action === 'export') {
        if (!exportToken || !sameToken(req.headers && req.headers['x-research-token'], exportToken)) return res.status(403).json({ error: 'Нет доступа' });
        const keys = await store().keys('rp:');
        const participants = []; const events = []; const tests = [];
        for (const k of keys) {
          const p = await store().get(k);
          participants.push(publicParticipant(p));
          events.push(...(await store().list(`re:${p.participant_code}`)));
          tests.push(...(await store().list(`rt:${p.participant_code}`)));
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
   И подключена своя исследовательская база. */
const liveStatus = STUDY_STATUS === 'open' && process.env.RESEARCH_STATUS === 'open' && hasResearchDb() ? 'open' : 'closed';
export default makeHandler({ status: liveStatus, store: researchStore, exportToken: process.env.RESEARCH_EXPORT_TOKEN || '' });
