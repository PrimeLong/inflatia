/* Проверка исследовательской записи и код участника (research/data-dictionary.md). Запись проходит в набор, только если
   каждое её поле есть в словаре (dictionary.js) и значение подходит; неизвестные поля отбрасываются, а запрещённое поле
   (логин, токен, адрес, свободный текст…) отклоняет запись целиком. */
import { FIELDS, forbiddenField } from './dictionary.js';

/* Код участника — случайный, не выводится из аккаунта, логина или устройства: 10 знаков из алфавита без похожих символов
   (нет O/0, I/1/L) и контрольный знак, вида «K7QM-2XRT-9H». Перебор: 31^10 ≈ 8·10^14 кодов. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const A = CODE_ALPHABET.length;
const check = (body) => CODE_ALPHABET[[...body].reduce((sum, ch, i) => (sum + (i + 1) * CODE_ALPHABET.indexOf(ch)) % A, 0)];
// randomInt(n) → целое 0…n-1; по умолчанию — криптографический генератор
const cryptoInt = (n) => {
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) { globalThis.crypto.getRandomValues(buf); if (buf[0] < max) return buf[0] % n; }
};
export function participantCode(randomInt = cryptoInt) {
  const body = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(A)]).join('');
  const c = body + check(body);
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}
// код, введённый участником: регистр и дефисы не важны; опечатку в одном знаке ловит контрольный знак
export function normalizeCode(s) {
  const raw = String(s || '').toUpperCase().replace(/[\s-]/g, '');
  if (raw.length !== 11 || [...raw].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  if (check(raw.slice(0, 10)) !== raw[10]) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}
export const isParticipantCode = (s) => typeof s === 'string' && normalizeCode(s) === s;

const ID_RE = /^[a-z0-9][a-z0-9_:.-]{0,79}$/i;
const VERSION_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;
function valid(spec, v) {
  switch (spec.type) {
    case 'code': return isParticipantCode(v);
    case 'enum': return spec.values.includes(v);
    case 'int': return Number.isInteger(v) && v >= spec.min && v <= spec.max;
    case 'bool': return typeof v === 'boolean';
    case 'id': return typeof v === 'string' && ID_RE.test(v);
    case 'version': return typeof v === 'string' && VERSION_RE.test(v);
    case 'month': return typeof v === 'string' && MONTH_RE.test(v);
    default: return false;
  }
}

/* { record } — чистая запись для таблицы; { error } — почему не принята. dropped — отброшенные неизвестные поля
   (их список возвращается, чтобы клиент, шлющий лишнее, был виден в тестах). */
export function cleanRecord(table, raw) {
  const spec = FIELDS[table];
  if (!spec) return { error: `нет таблицы ${table}` };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'запись — не объект' };
  const bad = Object.keys(raw).map(forbiddenField).find(Boolean);
  if (bad) return { error: `запрещённое поле: ${bad}` };
  const record = {};
  const dropped = [];
  for (const [k, v] of Object.entries(raw)) {
    if (!spec[k]) { dropped.push(k); continue; }
    if (v === undefined || v === null) continue;
    if (!valid(spec[k], v)) return { error: `неверное значение поля ${k}` };
    record[k] = v;
  }
  const missing = Object.entries(spec).find(([k, f]) => f.required && !(k in record));
  if (missing) return { error: `нет обязательного поля ${missing[0]}` };
  return { record, dropped };
}
