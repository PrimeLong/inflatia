/* СЕРВЕР API ДЛЯ ONREZA COMPUTE (docs/onreza.md, «Сервер ONREZA Compute»). Express вместо функций Vercel: те же адреса
   /api/*, те же обработчики api/*.js, те же методы, тела, коды ответов и тексты ошибок. Обработчик получает req/res
   Express — у них те же req.method, req.query, req.body, req.headers и res.status().json(), res.setHeader().

   Отличия от Vercel — только там, где Vercel делал работу за сервер:
   — тело запроса разбирает express.json (как Vercel: application/json → объект, text/plain → строка), до 4,5 МБ — тот же
     предел, что у функций Vercel; битый JSON — 400 «Некорректный JSON», слишком большое тело — 413;
   — адрес клиента: Express с trust proxy берёт адрес, который записал доверенный прокси ONREZA (правый край
     X-Forwarded-For, TRUST_PROXY_HOPS шагов), а не то, что прислал браузер; обработчики читают его через
     api/_lib/client-ip.js (req.clientIp). CLIENT_IP_HEADER — если ONREZA ставит отдельный заголовок с адресом и
     перезаписывает присланный клиентом (проверка — /api/health?proxy=1 на тестовой версии, docs/onreza.md);
   — заголовки безопасности (server/headers.js) и Cache-Control: no-store — на каждом ответе API: в ответах персональные данные;
   — CORS нет: страница и API на одном домене, чужим сайтам браузер ответ не отдаст.

   SERVE_STATIC=<папка> — сервер сам раздаёт собранный сайт (локальный запуск и браузерные тесты на сервере). В ONREZA
   статику раздаёт слой STATIC, а не этот процесс (.onreza/manifest.json); сервер держит только копию index.html для адресов
   экранов (spaIndex). */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { API_ROUTES, isSpaPath } from './routes.js';
import { SECURITY_HEADERS } from './headers.js';

export const BODY_LIMIT = '4.5mb';

export function trustHops() {
  const n = Number(process.env.TRUST_PROXY_HOPS);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 1;
}

export function createApp({ routes = API_ROUTES, staticDir = process.env.SERVE_STATIC || '', spaIndex = '', hops = trustHops(), ipHeader = (process.env.CLIENT_IP_HEADER || '').toLowerCase() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  // trust proxy = число доверенных прокси перед процессом: req.ip — адрес, который записал ближайший из них
  app.set('trust proxy', hops);

  const security = (res) => { for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v); };

  // адрес клиента для ограничений частоты (api/_lib/client-ip.js)
  app.use((req, _res, next) => {
    let ip = '';
    if (ipHeader) ip = String(req.headers[ipHeader] || '').split(',')[0].trim();
    req.clientIp = (ip || req.ip || 'local').slice(0, 64);
    next();
  });

  const api = express.Router();
  api.use((req, res, next) => { security(res); res.setHeader('Cache-Control', 'no-store'); next(); });
  api.use(express.json({ limit: BODY_LIMIT, type: ['application/json', 'application/*+json'] }));
  api.use(express.text({ limit: BODY_LIMIT, type: ['text/plain'] }));
  for (const r of routes) {
    api.all(r.path, async (req, res, next) => {
      // Express 5 оставляет req.body пустым (undefined) без тела — у Vercel там был пустой объект или строка
      if (req.body === undefined) req.body = {};
      try { await r.handler(req, res); } catch (err) { next(err); }
    });
  }
  // незнакомый адрес API — 404 JSON, а не страница сайта
  api.all(/^\/api(\/.*)?$/, (req, res) => res.status(404).json({ error: 'Нет такого адреса API' }));
  app.use(api);

  /* Адреса экранов (/shop, /book/<глава>…) без файла: index.html. В ONREZA их переписывает правило Edge (onreza.rules.toml)
     на /index.html слоя STATIC; если правило не применилось, манифест ведёт эти адреса сюда, и сервер отдаёт копию
     index.html из своей сборки (spaIndex) — страница не станет 404. */
  if (spaIndex && !staticDir) {
    app.get(/.*/, (req, res, next) => {
      if (!isSpaPath(req.path) || !fs.existsSync(spaIndex)) return next();
      security(res);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.resolve(spaIndex));
    });
  }

  if (staticDir) {
    const root = path.resolve(staticDir);
    const index = path.join(root, 'index.html');
    app.use((req, res, next) => { security(res); next(); });
    // файлы сборки с хэшем в имени не меняются — их можно хранить долго; остальное — с проверкой
    app.use(express.static(root, {
      index: false, redirect: false, dotfiles: 'ignore',
      setHeaders: (res, file) => res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'),
    }));
    app.get(/.*/, (req, res, next) => {
      if (!isSpaPath(req.path) || !fs.existsSync(index)) return next();
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(index);
    });
    app.use((req, res) => { res.status(404).type('text/plain; charset=utf-8').send('Страница не найдена'); });
  }

  // ошибки: битое или слишком большое тело — как ответ обработчика; остальное — 500 без подробностей (данные запроса в журнал не идут)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (res.headersSent) return;
    security(res);
    res.setHeader('Cache-Control', 'no-store');
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос' });
    if (err && (err.type === 'encoding.unsupported' || err.type === 'charset.unsupported')) return res.status(415).json({ error: 'Неподдерживаемая кодировка' });
    console.error('server error:', req.method, req.path, err && err.message ? err.message.slice(0, 200) : 'unknown');
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });
  return app;
}
