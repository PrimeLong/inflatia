/* ЗАКРЫТЫЙ САЙТ (пункт владельца 28.11, п. 3: «закрывай сайт: при входе требуется ключ; ввёл — окно регистрации; у кого
   есть аккаунт — ключ не нужен; сайт только для меня»).

   Ключ — только в переменной окружения SITE_KEY (Vercel → Settings → Environment Variables), не в исходниках и не в
   браузере. Верный ключ даёт пропуск: cookie inflatia_pass (HttpOnly, на год) — HMAC ключа, по нему не восстановить
   сам ключ. Вход в аккаунт и действующая сессия выдают тот же пропуск: у кого есть аккаунт, ключ не спрашивают.

   Без пропуска API отвечает 403 с заголовком X-Inflatia-Closed: 1 — браузер по нему показывает экран ключа
   (src/gate.jsx). Без пропуска открыты только вход, восстановление по коду и сама проверка ключа (account: login,
   recover, gate) и /api/health. SITE_KEY не задан — сайт открыт, как раньше (локальная разработка и тесты). */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { userBySession } from './accounts.js';

export const PASS_COOKIE = 'inflatia_pass';
const PASS_DAYS = 365;
const siteKey = () => String(process.env.SITE_KEY || '');
export const gateOn = () => siteKey().length > 0;
// пропуск — HMAC ключа: одинаковый для всех, меняется вместе с ключом (сменили ключ — старые пропуска не действуют)
export const gatePass = () => (gateOn() ? createHmac('sha256', siteKey()).update('inflatia-gate-v1').digest('hex').slice(0, 48) : '');

const same = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
export const keyOk = (key) => gateOn() && typeof key === 'string' && key.length > 0 && key.length <= 200 && same(key, siteKey());

function cookieOf(req, name) {
  const raw = (req.headers && (req.headers.cookie || req.headers.Cookie)) || '';
  const hit = String(raw).split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}
export const passOk = (req) => !gateOn() || same(cookieOf(req, PASS_COOKIE), gatePass());

// пропуск — в cookie: браузер сам отправляет его со всеми запросами к своему сайту, JavaScript его не читает
export function grantPass(res) {
  if (!gateOn()) return;
  const cookie = `${PASS_COOKIE}=${gatePass()}; Path=/; Max-Age=${PASS_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
  const prev = typeof res.getHeader === 'function' ? res.getHeader('Set-Cookie') : null;
  res.setHeader('Set-Cookie', prev ? [...(Array.isArray(prev) ? prev : [prev]), cookie] : cookie);
}
export function closed(res) {
  res.setHeader('X-Inflatia-Closed', '1');
  return res.status(403).json({ error: 'Сайт закрыт: нужен ключ входа или аккаунт', closed: true });
}

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { const b = JSON.parse(req.body || '{}'); return b && typeof b === 'object' ? b : {}; } catch { return {}; } }
  return {};
}
const queryOf = (req) => req.query || {};

/* Проверка на входе обработчика: true — можно дальше. open — действия, которым пропуск не нужен (вход, восстановление,
   проверка ключа). Без cookie, но с действующей сессией аккаунта в запросе (token или session в теле или в адресе) —
   пропускаем и выдаём cookie: так входят те, кто был в аккаунте до закрытия сайта. */
export async function gateGuard(req, res, { open = [] } = {}) {
  if (passOk(req)) return true;
  const body = bodyOf(req); const q = queryOf(req);
  const action = body.action || q.action || '';
  if (open.includes(action)) return true;
  const token = body.token || body.session || q.token || '';
  if (token) {
    const user = await userBySession(String(token)).catch(() => null);
    if (user) { grantPass(res); return true; }
  }
  closed(res);
  return false;
}
