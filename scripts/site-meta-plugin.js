/* АДРЕС САЙТА В РАЗМЕТКЕ И ФАЙЛЫ ДЛЯ ПОИСКА (docs/mechanics.md, «Ссылки и поиск»): абсолютные og:url, og:image и
   canonical в index.html, robots.txt и sitemap.xml с адресами экранов (src/lib/route.js) и готовых глав учебника.

   Адрес сайта: переменная SITE_URL, иначе — боевой домен проекта на Vercel (VERCEL_PROJECT_PRODUCTION_URL, её ставит
   сам Vercel), иначе — http://localhost:4173 (локальная сборка и автотесты). Домен в коде не записан: он один раз
   задаётся в настройках хостинга, а выпуск проверяет, что он задан (npm run release:check). */
import { TAB_PATHS } from '../src/lib/route.js';
import { PARTS } from '../src/textbook/toc.js';

export const LOCAL_URL = 'http://localhost:4173';
export function siteUrl(env = process.env) {
  const raw = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : LOCAL_URL);
  return String(raw).replace(/\/+$/, '');
}
// адреса для sitemap: экраны и готовые главы курса экономики (у пробного курса политологии адресов в поиске нет)
export function sitePaths() {
  const chapters = PARTS.filter((p) => (p.track || 'econ') === 'econ').flatMap((p) => p.chapters).filter((c) => c.status === 'ready').map((c) => `/book/${c.id}`);
  return [...Object.values(TAB_PATHS), ...chapters];
}
// сайт закрыт (пункт владельца 28.11, п. 3): поисковикам — ничего; адрес сайта остаётся параметром на случай открытия
export const robotsTxt = (url) => `User-agent: *\nDisallow: /\n# закрытый сайт: ${url}\n`;
export function sitemapXml(url, paths = sitePaths()) {
  const rows = paths.map((p) => `  <url><loc>${url}${p === '/' ? '/' : p}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

export default function siteMeta() {
  const url = siteUrl();
  return {
    name: 'site-meta',
    transformIndexHtml(html) { return html.replaceAll('%SITE_URL%', url); },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(url) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(url) });
    },
  };
}
