import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { releaseProblems } from '../../../scripts/release-check.mjs';
import { OPERATOR, AGE_RATING, isPlaceholder } from '../../legal.js';

/* Выпуск (docs/mechanics.md, «Выпуск»; пункт владельца 13.11): npm run release:check падает, пока в src/legal.js
   заглушки в квадратных скобках. */
describe('release:check', () => {
  const filled = { operator: { name: 'ИП Иванов И. И.', address: 'Москва, а/я 1', email: 'hello@inflatia.example' }, ageRating: '6+', url: 'https://inflatia.example' };
  it('заглушки в квадратных скобках — список того, что осталось заполнить', () => {
    const p = releaseProblems({ operator: { name: '[ФИО/название]', address: '[адрес для обращений]', email: '[e-mail]' }, ageRating: '[возрастная маркировка]', url: 'http://localhost:4173' });
    expect(p).toHaveLength(5);
    expect(p.join('\n')).toMatch(/оператор: ФИО[\s\S]*адрес для обращений[\s\S]*e-mail[\s\S]*возрастная маркировка[\s\S]*адрес сайта/);
  });
  it('всё заполнено — проблем нет; пустая строка — тоже заглушка', () => {
    expect(releaseProblems(filled)).toEqual([]);
    expect(releaseProblems({ ...filled, ageRating: '' })).toHaveLength(1);
    expect(releaseProblems({ ...filled, operator: { ...filled.operator, email: '[e-mail]' } })).toHaveLength(1);
  });
  it('сам скрипт завершается с ошибкой ровно тогда, когда в src/legal.js остались заглушки', () => {
    const placeholders = [...Object.values(OPERATOR), AGE_RATING].some(isPlaceholder);
    let code = 0; let out = '';
    try { execFileSync(process.execPath, ['scripts/release-check.mjs'], { env: { ...process.env, SITE_URL: 'https://inflatia.example' }, stdio: 'pipe' }); }
    catch (e) { code = e.status; out = String(e.stderr); }
    expect(code).toBe(placeholders ? 1 : 0);
    if (placeholders) expect(out).toContain('Выпуск остановлен');
  });
  it('команда записана в package.json', () => {
    expect(JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).scripts['release:check']).toBe('node scripts/release-check.mjs');
  });
});
