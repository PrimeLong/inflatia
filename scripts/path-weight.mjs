/* Вес Пути: что грузится до появления Пути и до затишья сети (docs/mechanics.md, «Приветствие и загрузка»).
   Нужен запущенный собранный сайт:  npm run build && npx vite preview --port 4173
   node scripts/path-weight.mjs [адрес] [--phone] — печатает JS-файлы по порядку, с размером без сжатия. */
import { chromium, devices } from 'playwright';

const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4173';
const phone = process.argv.includes('--phone');
const ACCOUNT = { token: 't', login: 'tester', name: 'Тест', emblem: 'star', kidsMode: false, birthYear: 1990 };

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext(phone ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.addInitScript((a) => {
  localStorage.setItem('ems-storage-notice', '1'); localStorage.setItem('ems-account', JSON.stringify(a));
  localStorage.setItem('ems-model-intro', JSON.stringify(['supply-demand']));
}, ACCOUNT);
const files = []; let shown = null; const t0 = Date.now();
page.on('response', async (r) => {
  const u = new URL(r.url());
  if (!/\.(js|css|woff2?|mp3|jpg|png|svg)$/.test(u.pathname)) return;
  let size = 0; try { size = (await r.body()).length; } catch { /* без тела */ }
  files.push({ name: u.pathname.split('/').pop().replace(/-[\w-]{8}\.(js|css)$/, '.$1'), kind: u.pathname.split('.').pop(), size, at: Date.now() - t0, before: shown == null });
});
await page.goto(`${base}/`, { waitUntil: 'commit' });
await page.getByTestId('path').waitFor({ state: 'visible' });
shown = Date.now() - t0;
await page.waitForLoadState('networkidle');
await page.waitForTimeout(6000); // фоновая подгрузка после простоя
const kb = (n) => Math.round(n / 1024);
const sum = (list) => list.reduce((a, f) => a + f.size, 0);
const js = files.filter((f) => f.kind === 'js');
console.log(`ПУТЬ (${phone ? 'телефон' : 'ПК'}): виден через ${shown} мс`);
console.log(`  JS до появления Пути: ${kb(sum(js.filter((f) => f.before)))} КБ в ${js.filter((f) => f.before).length} файлах`);
console.log(`  JS до затишья сети и после простоя: ${kb(sum(js))} КБ в ${js.length} файлах`);
console.log(`  всё остальное (шрифты, стили, картинки, звук): ${kb(sum(files.filter((f) => f.kind !== 'js')))} КБ`);
const row = (f) => `    ${String(kb(f.size)).padStart(4)} КБ  ${f.name}`;
console.log('  — до появления Пути:'); js.filter((f) => f.before).sort((a, b) => b.size - a.size).forEach((f) => console.log(row(f)));
console.log('  — после появления Пути:'); js.filter((f) => !f.before).sort((a, b) => b.size - a.size).forEach((f) => console.log(row(f)));
if (process.argv.includes('--all')) { console.log('  — не JS:'); files.filter((f) => f.kind !== 'js').sort((a, b) => b.size - a.size).forEach((f) => console.log(row(f))); }
await browser.close();
