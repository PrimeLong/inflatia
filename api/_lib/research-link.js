/* МОСТ «АККАУНТ ↔ ИССЛЕДОВАНИЕ» — единственное место, где код Инфляции и код исследования касаются друг друга
   (research/data-dictionary.md, раздел 1, «Права доступа»). База одна, но цели обработки разные, поэтому доступ узкий
   и в обе стороны описан здесь:

   исследование → аккаунт (api/research.js): по ключу входа узнаёт только логин и год рождения. Логин — чтобы держать
     связь «один аккаунт — одно участие» (rla:/rlc: в таблице исследования), год рождения — критерий включения 18+;
     в записи исследования ни то ни другое не попадает. Прогресс, монеты, друзей, сообщения и всё остальное из аккаунта
     исследование не читает.
   аккаунт → исследование (api/account.js): «Удалить аккаунт и все данные» стирает и участие в исследовании (как отзыв,
     до фиксации набора); «Скачать мои данные» отдаёт человеку его собственные записи исследования. Больше код Инфляции
     в таблицу исследования не ходит. */
import { userBySession } from './accounts.js';
import { researchStore, wipeParticipant, linkKeyOfLogin } from './research-store.js';
import { exportRecord } from '../../src/research/record.js';

// кто вошёл: только логин и год рождения — остального исследование не получает
export async function accountOf(token) {
  const u = await userBySession(token);
  return u ? { login: u.login, birthYear: Number(u.birthYear) || null } : null;
}

// код участника этого аккаунта или null
export const codeOfLogin = async (login, st = researchStore()) => (login ? (await st.get(linkKeyOfLogin(login))) || null : null);

// удаление аккаунта: если он участвует в исследовании — участие отзывается и все записи стираются
export async function forgetAccountResearch(login, st = researchStore()) {
  const code = await codeOfLogin(login, st);
  if (!code) return false;
  await wipeParticipant(st, code);
  return true;
}

// «Скачать мои данные»: записи исследования этого человека — те же поля, что в выгрузке для анализа, плюс этап и код
export async function researchExportFor(login, st = researchStore()) {
  const code = await codeOfLogin(login, st);
  if (!code) return null;
  const p = await st.get(`rp:${code}`);
  if (!p) return null;
  const tests = [];
  for (const kind of ['pre', 'post', 'delayed']) tests.push(...((await st.get(`rt:${code}:${kind}`)) || []));
  return { participant: { ...exportRecord('participants', p), enrolled_on: p.enrolled_on || null }, events: await st.list(`re:${code}`), tests };
}
