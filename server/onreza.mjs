/* СЕРВЕР API ДЛЯ ONREZA COMPUTE (docs/onreza.md). На Vercel каждый файл api/*.js — отдельная функция с вызовом
   handler(req, res), где у req есть query и уже разобранный body, а у res — status() и json(). ONREZA Functions так не
   умеют (один самодостаточный файл без npm-зависимостей), поэтому API идёт в Compute: этот файл — обычный Node-сервер,
   который даёт обработчикам тот же req/res, что и Vercel, и маршрутизирует /api/<имя> к api/<имя>.js. Статика (dist)
   раздаётся отдельным STATIC-слоем через CDN, а не этим процессом (scripts/onreza-pack.mjs, манифест).

   Порт — из PORT, адрес — 0.0.0.0: так требует Compute. */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import account from '../api/account.js';
import daily from '../api/daily.js';
import events from '../api/events.js';
import records from '../api/records.js';
import reports from '../api/reports.js';
import research from '../api/research.js';
import room from '../api/room.js';
import solo from '../api/solo.js';

export const HANDLERS = { account, daily, events, records, reports, research, room, solo };
export const BODY_LIMIT = 4.5 * 1024 * 1024;   // как у функций Vercel: больше — 413

// тело запроса: JSON разбирается, как на Vercel; непонятный JSON остаётся строкой — обработчики сами отвечают 400
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > BODY_LIMIT) { reject(Object.assign(new Error('too big'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      const type = String(req.headers['content-type'] || '');
      if (type.includes('application/json')) { try { return resolve(JSON.parse(raw)); } catch { return resolve(raw); } }
      return resolve(raw);
    });
    req.on('error', reject);
  });
}

// res в духе Vercel: status(code) по цепочке и json(data)
function vercelRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => {
    if (!res.headersSent) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); }
    res.end(JSON.stringify(data));
    return res;
  };
  return res;
}

export function createApi(handlers = HANDLERS) {
  return http.createServer(async (req, res) => {
    vercelRes(res);
    const url = new URL(req.url, 'http://local');
    // проверка после переезда: жив ли процесс, видна ли база и приходит ли адрес клиента (сам адрес не показываем) —
    // без x-forwarded-for лимит попыток входа (api/account.js) считался бы общим на всех
    if (url.pathname === '/api/_health') {
      return res.status(200).json({ ok: true, kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
        forwardedFor: !!(req.headers['x-forwarded-for'] || req.headers['x-real-ip']), commit: (process.env.ONREZA_GIT_COMMIT_SHA || '').slice(0, 7) || null });
    }
    const m = /^\/api\/([a-z]+)\/?$/.exec(url.pathname);
    const handler = m && Object.hasOwn(handlers, m[1]) ? handlers[m[1]] : null;
    if (!handler) return res.status(404).json({ error: 'Не найдено' });
    req.query = Object.fromEntries(url.searchParams);
    try {
      req.body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    } catch (e) {
      return res.status(e.code === 413 ? 413 : 400).json({ error: e.code === 413 ? 'Слишком большой запрос' : 'Некорректный запрос' });
    }
    try {
      await handler(req, res);
      if (!res.writableEnded) res.status(500).json({ error: 'Пустой ответ' });
    } catch (e) {
      console.error(`api/${m[1]}`, e);
      if (!res.writableEnded) res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  });
}

// запуск: node server/onreza.mjs (и собранный server.mjs в Compute)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  createApi().listen(port, '0.0.0.0', () => console.log(`api: 0.0.0.0:${port}`));
}
