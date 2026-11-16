/* ПРОВЕРКА ПЕРЕД ВЫПУСКОМ: npm run release:check — падает, пока в выпуске остались заглушки.
   - src/legal.js: оператор (имя, адрес для обращений, e-mail) и знак информационной продукции — в квадратных скобках,
     пока владелец с юристом их не заполнили (docs/owner-decisions.md, п. 1 и 2; docs/legal-todo.md, п. 6 и 7);
   - адрес сайта для og:url, canonical, robots.txt и sitemap.xml — не локальный (scripts/site-meta-plugin.js).
   Юридических выводов скрипт не делает: он только не даёт выпустить сайт с текстом «[ФИО/название]». */
import { OPERATOR, AGE_RATING, isPlaceholder } from '../src/legal.js';
import { siteUrl, LOCAL_URL } from './site-meta-plugin.js';

const OPERATOR_FIELDS = { name: 'оператор: ФИО или название', address: 'оператор: адрес для обращений', email: 'оператор: e-mail' };
export function releaseProblems({ operator = OPERATOR, ageRating = AGE_RATING, url = siteUrl() } = {}) {
  const out = [];
  Object.entries(OPERATOR_FIELDS).forEach(([k, label]) => { if (isPlaceholder(operator[k]) || !String(operator[k] || '').trim()) out.push(`src/legal.js — ${label}: заглушка «${operator[k]}»`); });
  if (isPlaceholder(ageRating) || !String(ageRating || '').trim()) out.push(`src/legal.js — возрастная маркировка: заглушка «${ageRating}»`);
  if (!url || url === LOCAL_URL || /localhost|127\.0\.0\.1/.test(url)) out.push(`адрес сайта не задан (сейчас ${url}): переменная SITE_URL или сборка на Vercel`);
  return out;
}

// запуск из командной строки (а не импорт из теста)
if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = releaseProblems();
  if (problems.length) {
    console.error(`Выпуск остановлен — осталось заполнить (${problems.length}):`);
    problems.forEach((p) => console.error(`  • ${p}`));
    console.error('Что решить и где: docs/owner-decisions.md, п. 1 и 2.');
    process.exit(1);
  }
  console.log('release:check — заглушек нет, адрес сайта задан.');
}
