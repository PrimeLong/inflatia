/* Проверка базы после переезда на ONREZA (docs/onreza.md, шаг 5): какая база подключена и отвечает ли. Ни данных,
   ни адресов, ни строк подключения в ответе нет. */
import { dbKind, dbPing } from './_lib/store.js';
import { researchDbKind } from './_lib/research-store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const db = dbKind();
  const dbOk = db === 'memory' ? false : await dbPing();
  return res.status(200).json({ ok: dbOk, db, research: researchDbKind(), region: process.env.VERCEL_REGION || null });
}
