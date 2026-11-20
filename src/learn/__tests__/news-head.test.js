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
  it('выпуск 21.11: политика, журнал уборки, дизлайк, Инфля откликается, особые уроки — свежий', () => {
    expect(NEWS[0].id).toBe('2026-11-21');
    const t21 = NEWS[0].items.map((i) => i.title).join(' | ');
    ['Политика', 'Журнал уборки', 'Дизлайк', 'Инфля откликается', 'Особые уроки'].forEach((w) => expect(t21).toContain(w));
  });
  it('выпуск 20.11: шахта 2.0, одна шахта на устройствах, пластинки, музыка и книги, живая модель', () => {
    const t20 = NEWS.find((n) => n.id === '2026-11-20').items.map((i) => i.title).join(' | ');
    ['Шахта 2.0', 'Одна шахта', 'Пластинки', 'Музыка и книги', 'Живая модель'].forEach((w) => expect(t20).toContain(w));
  });
  it('выпуск 19.11: шахта, графики мини-игр, «Нарисуй сам», один дизайн уроков', () => {
    const t19 = NEWS.find((n) => n.id === '2026-11-19').items.map((i) => i.title).join(' | ');
    ['Шахта', 'Мини-игры', '«Нарисуй сам»', 'Один дизайн', 'Оглавление', 'Пластинки', 'Полироль'].forEach((w) => expect(t19).toContain(w));
  });
  it('выпуск 18.11, вечер: пластинки, учебник, график на весь экран, «Мир»', () => {
    const t = NEWS.find((n) => n.id === '2026-11-18-evening').items.map((i) => i.title).join(' | ');
    ['Пластинки', 'Учебник', 'График на весь экран', '«Нарисуй сам»', 'Музыка', '«Мир»'].forEach((w) => expect(t).toContain(w));
  });
  it('выпуск 18.11: проигрыватель, живой график, кисть и ластик; пункты не повторяются', () => {
    const issue = NEWS.find((n) => n.id === '2026-11-18');
    const t18 = issue.items.map((i) => i.title).join(' | ');
    ['Новый проигрыватель', 'График на весь экран', '«Нарисуй сам»', 'Тема урока', 'Задания и забег'].forEach((w) => expect(t18).toContain(w));
  });
  it('выпуск 16.11, вечер: терминал инвестора, альбом персоналий, график на весь экран; пункты выпуска не повторяются', () => {
    const issue = NEWS.find((n) => n.id === '2026-11-16-evening');
    const titles = issue.items.map((i) => i.title).join(' | ');
    ['Терминал частного инвестора', 'альбом марок', 'График на весь экран', 'Музыка', 'закрасьте область'].forEach((w) => expect(titles).toContain(w));
    NEWS.forEach((n) => expect(new Set(n.items.map((i) => i.title)).size).toBe(n.items.length));
  });
  it('оболочка не тянет тексты выпусков: импортирует news-head.js, а не news.js', () => {
    const shell = readFileSync(new URL('../../MacroSimulator.jsx', import.meta.url), 'utf8');
    expect(shell).toContain("from './learn/news-head.js'");
    expect(shell).not.toMatch(/from '\.\/learn\/news\.js'/);
  });
});
