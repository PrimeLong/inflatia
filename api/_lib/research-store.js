/* ИССЛЕДОВАТЕЛЬСКАЯ БАЗА — отдельная от базы аккаунтов (research/data-dictionary.md, «Где хранится»). Подключается только
   своими переменными окружения RESEARCH_KV_REST_API_URL и RESEARCH_KV_REST_API_TOKEN: к базе аккаунтов (KV_REST_API_*)
   этот файл не обращается и на неё не переключается, даже если своей базы нет. Без своей базы исследование закрыто
   (api/research.js). Память — только для локальной разработки и тестов.
   Ключи: rp:<код> — участник, re:<код> — события, rt:<код>:<pre|post|delayed> — ответы теста (пишутся один раз, setNx),
   rlock:<код> — короткая блокировка участника на время входного теста и распределения, rslot:<код> — номер участника в слое,
   rcount:<слой> — сколько распределено в слое (атомарный счётчик), rday:<ГГГГ-ММ-ДД> — сколько записалось за день (защита от
   массовой записи), rwithdrawn — сколько отозвали участие (только число). Логинов, адресов и токенов здесь нет.
   Атомарность: incr и setNx — одна команда базы; у памяти — синхронный участок без await, тоже неделимый. */
let redis = null;
try {
  const url = process.env.RESEARCH_KV_REST_API_URL;
  const token = process.env.RESEARCH_KV_REST_API_TOKEN;
  if (url && token && url !== process.env.KV_REST_API_URL) {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({ url, token });
  }
} catch { redis = null; }

export const hasResearchDb = () => !!redis;

// хранилище в памяти: те же операции, что и у Redis
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
    push: async (k, v) => { const list = m.get(k) || []; list.push(structuredClone(v)); m.set(k, list); return list.length; },
    list: async (k) => structuredClone(m.get(k) || []),
    keys: async (prefix) => [...m.keys()].filter((k) => k.startsWith(prefix)),
  };
}
function redisStore(r) {
  return {
    kind: 'redis',
    get: (k) => r.get(k),
    set: (k, v) => r.set(k, v),
    setNx: async (k, v, ttl = 0) => (await r.set(k, v, ttl ? { nx: true, ex: ttl } : { nx: true })) === 'OK',
    del: (...ks) => r.del(...ks),
    incr: (k) => r.incr(k),
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
// хранилище исследования: своя база или (без неё) память — но никогда не база аккаунтов
export function researchStore() {
  if (redis) return redisStore(redis);
  if (!mem) mem = memoryStore();
  return mem;
}
