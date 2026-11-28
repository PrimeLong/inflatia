import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { siteUrl, sitePaths, robotsTxt, sitemapXml, LOCAL_URL } from '../../../scripts/site-meta-plugin.js';
import { TAB_PATHS } from '../route.js';

/* Ссылки и поиск (docs/mechanics.md, «Ссылки и поиск»; пункт владельца 13.11): абсолютные og:image и og:url, canonical,
   robots.txt и sitemap.xml с адресами экранов. Раньше og:image был относительным («/og-image.png»), og:url и canonical
   не было вовсе — превью ссылки в мессенджерах не находило картинку. */
describe('ссылки и поиск', () => {
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  it('адрес сайта: SITE_URL, иначе боевой домен Vercel, иначе локальный; без косой черты в конце', () => {
    expect(siteUrl({})).toBe(LOCAL_URL);
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'inflatia.example' })).toBe('https://inflatia.example');
    expect(siteUrl({ SITE_URL: 'https://a.example/', VERCEL_PROJECT_PRODUCTION_URL: 'b.example' })).toBe('https://a.example');
  });
  it('в index.html og:image, og:url, twitter:image и canonical — от адреса сайта, относительных нет', () => {
    expect(html).toContain('<link rel="canonical" href="%SITE_URL%/" />');
    expect(html).toContain('<meta property="og:url" content="%SITE_URL%/" />');
    expect(html).toContain('<meta property="og:image" content="%SITE_URL%/og-image.png" />');
    expect(html).toContain('<meta name="twitter:image" content="%SITE_URL%/og-image.png" />');
    expect(html).not.toMatch(/property="og:(image|url)" content="\//);
  });
  it('sitemap: все адреса экранов и готовые главы; robots: всё открыто, кроме /api, и ссылка на sitemap', () => {
    const paths = sitePaths();
    Object.values(TAB_PATHS).forEach((p) => expect(paths).toContain(p));
    expect(paths).toContain('/book/supply-demand');
    expect(paths.some((p) => p.includes('power'))).toBe(false); // пробный курс политологии — не в поиске
    expect(new Set(paths).size).toBe(paths.length);
    const xml = sitemapXml('https://a.example');
    expect(xml).toContain('<loc>https://a.example/</loc>');
    expect(xml).toContain('<loc>https://a.example/book/supply-demand</loc>');
    expect((xml.match(/<url>/g) || []).length).toBe(paths.length);
    // сайт закрыт (пункт владельца 28.11): поисковикам закрыто всё
    const robots = robotsTxt('https://a.example');
    expect(robots).toMatch(/^User-agent: \*\nDisallow: \/\n/);
    expect(robots).not.toContain('Sitemap:');
  });
});
