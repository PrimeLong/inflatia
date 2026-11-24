/* Проверка сервера и базы (docs/onreza.md): какая база подключена и отвечает ли, где выполняется сервер. Ни данных,
   ни адресов, ни строк подключения в ответе нет.
   ?proxy=1 — форма заголовков прокси на тестовой версии ONREZA (docs/onreza.md, «Адрес клиента»): сколько адресов
   в X-Forwarded-For, есть ли X-Real-IP, частный ли адрес выбрал сервер. Самих адресов в ответе нет. */
import { dbKind, dbPing } from './_lib/store.js';
import { researchDbKind } from './_lib/research-store.js';

// частный адрес (10/8, 172.16/12, 192.168/16, 127/8, fc00::/7, ::1) — так выглядит адрес прокси, а не ученика
const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|::ffff:(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i;
export const isPrivateIp = (ip) => PRIVATE.test(String(ip || '').trim());

export function proxyShape(req) {
  const h = req.headers || {};
  const xff = String(h['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const socket = req.socket && req.socket.remoteAddress;
  return {
    xffEntries: xff.length,
    xffRightPrivate: xff.length ? isPrivateIp(xff[xff.length - 1]) : null,
    xRealIp: !!h['x-real-ip'],
    socketPrivate: socket ? isPrivateIp(socket) : null,
    chosenPrivate: req.clientIp ? isPrivateIp(req.clientIp) : null,
    otherIpHeaders: Object.keys(h).filter((k) => /(client|real|true|connecting).*ip|^x-forwarded-(?!for)/i.test(k)).sort(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const db = dbKind();
  const dbOk = db === 'memory' ? false : await dbPing();
  const runtime = process.env.INFLATIA_RUNTIME === 'compute' ? 'onreza-compute' : process.env.VERCEL_REGION ? 'vercel' : 'local';
  const out = { ok: dbOk, db, research: researchDbKind(), runtime, region: process.env.VERCEL_REGION || null, env: process.env.ONREZA_ENV || null };
  if (req.query && req.query.proxy === '1') out.proxy = proxyShape(req);
  return res.status(200).json(out);
}
