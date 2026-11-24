/* МАРШРУТЫ API — один список для сервера ONREZA Compute (server/app.js), его тестов (server/__tests__) и перечня в
   docs/api.md. Обработчики — те же файлы api/*.js, что работали функциями Vercel: (req, res) → res.status().json().
   Методы проверяет сам обработчик (405 с тем же текстом, что и раньше), поэтому маршрут принимает любой метод. */
import account from '../api/account.js';
import daily from '../api/daily.js';
import events from '../api/events.js';
import health from '../api/health.js';
import records from '../api/records.js';
import reports from '../api/reports.js';
import research from '../api/research.js';
import room from '../api/room.js';
import solo from '../api/solo.js';

export const API_ROUTES = [
  { path: '/api/account', handler: account, methods: ['POST'] },
  { path: '/api/daily', handler: daily, methods: ['GET', 'POST'] },
  { path: '/api/events', handler: events, methods: ['POST'] },
  { path: '/api/health', handler: health, methods: ['GET'] },
  { path: '/api/records', handler: records, methods: ['GET', 'POST'] },
  { path: '/api/reports', handler: reports, methods: ['POST'] },
  { path: '/api/research', handler: research, methods: ['GET', 'POST'] },
  { path: '/api/room', handler: room, methods: ['GET', 'POST'] },
  { path: '/api/solo', handler: solo, methods: ['GET', 'POST'] },
];

/* Адреса экранов приложения (src/lib/route.js): на них отдаётся index.html — как rewrites в vercel.json.
   Остальные адреса без файла — 404, как и раньше. */
export const SPA_PATHS = [/^\/$/, /^\/index\.html$/, /^\/(book|league|shop|profile|world|news|research)\/?$/, /^\/book\/[^/.]+\/?$/];
export const isSpaPath = (p) => SPA_PATHS.some((re) => re.test(p));
