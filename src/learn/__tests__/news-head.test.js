import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NEWS, LATEST_NEWS } from '../news.js';
import { LATEST_NEWS_HEAD } from '../news-head.js';

/* Точка «новое» на нижней панели читает только заголовок свежего выпуска (news-head.js): тексты выпусков не едут в
   стартовом файле. Заголовок обязан совпадать с первым выпуском ленты. */
describe('заголовок свежего выпуска новостей', () => {
  it('совпадает с первым выпуском ленты', () => {
    expect(LATEST_NEWS_HEAD).toEqual({ id: NEWS[0].id, date: NEWS[0].date });
    expect(LATEST_NEWS.id).toBe(LATEST_NEWS_HEAD.id);
  });
  it('оболочка не тянет тексты выпусков: импортирует news-head.js, а не news.js', () => {
    const shell = readFileSync(new URL('../../MacroSimulator.jsx', import.meta.url), 'utf8');
    expect(shell).toContain("from './learn/news-head.js'");
    expect(shell).not.toMatch(/from '\.\/learn\/news\.js'/);
  });
});
