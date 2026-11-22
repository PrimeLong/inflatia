/* ИССЛЕДОВАНИЕ — В ОБЩЕЙ БАЗЕ, В СВОЕЙ ТАБЛИЦЕ (решение владельца 22.11.2026: одна база, docs/onreza.md).
   База одна — PostgreSQL ONREZA по DATABASE_URL. Записи исследования лежат в отдельной таблице inflatia_research той же
   базы (api/_lib/pgkv.js): у исследования своя цель обработки и свой круг доступа (research/data-dictionary.md, раздел 1),
   поэтому таблица своя — её можно выгрузить, удалить при фиксации набора и закрыть отдельными правами, не трогая данные
   Инфляции. Отдельная переменная RESEARCH_DATABASE_URL больше не нужна; Upstash для исследования не используется.
   Без DATABASE_URL (локально, превью на Upstash) — память, и исследование закрыто (api/research.js).

   Ключи: rp:<код> — участник, re:<код> — события, rt:<код>:<pre|post|delayed> — ответы теста (пишутся один раз, setNx),
   rlock:<код> — короткая блокировка участника на время входного теста и распределения, rslot:<код> — номер участника в слое,
   rcount:<слой> — сколько распределено в слое (атомарный счётчик), rday:<ГГГГ-ММ-ДД> — сколько записалось за день (защита от
   массовой записи), rwithdrawn — сколько отозвали участие (только число). rx:<код>:… — служебный ход участника по модулю,
   который ведёт сервер: номер попытки задания (att:<задание>), отвеченные задания (seen:<задание>), сколько заданий урока
   отвечено (cnt:<урок>), активные секунды урока (sec:<урок>), пройденные уроки (done:<урок> — день), номер занятия (sess);
   и две короткоживущие отметки времени сервера — последнее действие (last, живёт 30 минут) и выдача задач теста
   (issue:<вид>, живёт 4 часа, стирается при отправке теста): по ним сервер сам считает время, а не верит клиенту.

   СВЯЗЬ С АККАУНТОМ — только там, где она нужна методике (research/methodology.md, раздел 8): rla:<логин> → код участника,
   rlc:<код> → логин. Одна пара на участника; в записях participants/events/tests логина по-прежнему нет. Нужна для четырёх
   вещей: один аккаунт — одно участие (нельзя записаться второй раз и «перевыбрать» группу), критерий 18+ по году рождения
   аккаунта, продолжение на другом устройстве после входа, и чтобы «удалить аккаунт» и «скачать мои данные» в Инфляции
   касались и исследования. В выгрузку для анализа связь не идёт; стирается при отзыве участия и при фиксации набора.
   В выгрузку rx:… тоже не идёт. Адресов и токенов здесь нет.
   Атомарность: incr и setNx — одна команда базы; у памяти — синхронный участок без await, тоже неделимый. */
import { pgKvFromEnv, RESEARCH_TABLE } from './pgkv.js';

const redis = pgKvFromEnv('DATABASE_URL', { table: RESEARCH_TABLE });

export const hasResearchDb = () => !!redis;
export const researchDbKind = () => (redis ? 'postgres' : 'none');

// хранилище в памяти: те же операции, что и у базы
export function memoryStore() {
  const m = new Map();
  return {
    kind: 'memory',
    get: async (k) => { if (!m.has(k)) return null; const v = m.get(k); if (v && v.__until) return v.__until < Date.now() ? null : structuredClone(v.v); return structuredClone(v); },
    set: async (k, v) => { m.set(k, structuredClone(v)); return true; },
    // записать, только если ключа нет; ttl — секунды жизни (для блокировки). true — записано
    setNx: async (k, v, ttl = 0) => {
      const cur = m.get(k);
      if (cur !== undefined && !(cur && cur.__until && cur.__until < Date.now())) return false;
      m.set(k, ttl ? { __until: Date.now() + ttl * 1000, v: structuredClone(v) } : structuredClone(v)); return true;
    },
    del: async (...ks) => { ks.forEach((k) => m.delete(k)); return true; },
    incr: async (k) => { const v = (m.get(k) || 0) + 1; m.set(k, v); return v; },
    incrBy: async (k, n) => { const v = (m.get(k) || 0) + n; m.set(k, v); return v; },
    // записать с временем жизни ttl секунд (служебные отметки времени — живут недолго)
    setEx: async (k, v, ttl) => { m.set(k, { __until: Date.now() + ttl * 1000, v: structuredClone(v) }); return true; },
    push: async (k, v) => { const list = m.get(k) || []; list.push(structuredClone(v)); m.set(k, list); return list.length; },
    list: async (k) => structuredClone(m.get(k) || []),
    keys: async (prefix) => [...m.keys()].filter((k) => k.startsWith(prefix)),
  };
}
// те же операции поверх таблицы inflatia_research (клиент pgkv отвечает как Redis)
export function kvStore(r) {
  return {
    kind: r.kind || 'redis',
    get: (k) => r.get(k),
    set: (k, v) => r.set(k, v),
    setNx: async (k, v, ttl = 0) => (await r.set(k, v, ttl ? { nx: true, ex: ttl } : { nx: true })) === 'OK',
    del: (...ks) => r.del(...ks),
    incr: (k) => r.incr(k),
    incrBy: (k, n) => r.incrby(k, n),
    setEx: (k, v, ttl) => r.set(k, v, { ex: ttl }),
    push: (k, v) => r.rpush(k, v),
    list: async (k) => (await r.lrange(k, 0, -1)) || [],
    keys: async (prefix) => {
      const out = []; let cursor = 0;
      do { const [next, ks] = await r.scan(cursor, { match: `${prefix}*`, count: 500 }); out.push(...ks); cursor = Number(next); } while (cursor !== 0);
      return out;
    },
  };
}
let mem = null;
let db = null;
// хранилище исследования: таблица исследования в общей базе или (без базы) память
export function researchStore() {
  if (redis) return db || (db = kvStore(redis));
  if (!mem) mem = memoryStore();
  return mem;
}

// ключи связи с аккаунтом
export const linkKeyOfLogin = (login) => `rla:${login}`;
export const linkKeyOfCode = (code) => `rlc:${code}`;

/* Стереть участника целиком: записи, тесты, служебный ход и связь с аккаунтом; остаётся только общее число отозвавших.
   Общая для отзыва участия (api/research.js) и удаления аккаунта (api/account.js через api/_lib/research-link.js). */
export async function wipeParticipant(st, code) {
  const progress = await st.keys(`rx:${code}:`);
  const login = await st.get(linkKeyOfCode(code));
  await st.del(`rp:${code}`, `re:${code}`, `rt:${code}:pre`, `rt:${code}:post`, `rt:${code}:delayed`, `rslot:${code}`, `rlock:${code}`,
    ...progress, linkKeyOfCode(code), ...(login ? [linkKeyOfLogin(login)] : []));
  await st.incr('rwithdrawn');
  return true;
}
