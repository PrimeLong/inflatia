import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NEWS, LATEST_NEWS } from '../news.js';
import { LATEST_NEWS_HEAD } from '../news-head.js';

/* Точка «новое» на нижней панели читает только заголовок свежего выпуска (news-head.js): тексты выпусков не едут в
   стартовом файле. Заголовок обязан совпадать с первым выпуском ленты. */
describe('заголовок свежего выпуска новостей', () => {
  it('совпадает с первым выпуском ленты', () => {
    expect(LATEST_NEWS_HEAD).toEqual({ id: NEWS[0].id, date: NEWS[0].date, color: NEWS[0].color, title: NEWS[0].title });
    expect(LATEST_NEWS.id).toBe(LATEST_NEWS_HEAD.id);
  });
  it('новый юнит объявлен в ленте: «Сберкасса» — первым пунктом своего выпуска (16.11), с уровнем и местом на Пути', () => {
    const issue = NEWS.find((n) => n.id === '2026-11-16');
    const item = issue.items[0];
    expect(item.title).toContain('«Сберкасса»');
    expect(item.text).toContain('Начальном уровне');
    expect(item.text).toContain('«Биржи труда»');
    expect(issue.title).toContain('Сберкасса');
  });
  it('выпуск 16.11, вечер: терминал инвестора, альбом персоналий, график на весь экран; пункты выпуска не повторяются', () => {
    expect(NEWS[0].id).toBe('2026-11-16-evening');
    const titles = NEWS[0].items.map((i) => i.title).join(' | ');
    ['Терминал частного инвестора', 'альбом марок', 'График на весь экран', 'Музыка', 'закрасьте область'].forEach((w) => expect(titles).toContain(w));
    NEWS.forEach((n) => expect(new Set(n.items.map((i) => i.title)).size).toBe(n.items.length));
  });
  it('оболочка не тянет тексты выпусков: импортирует news-head.js, а не news.js', () => {
    const shell = readFileSync(new URL('../../MacroSimulator.jsx', import.meta.url), 'utf8');
    expect(shell).toContain("from './learn/news-head.js'");
    expect(shell).not.toMatch(/from '\.\/learn\/news\.js'/);
  });
});
