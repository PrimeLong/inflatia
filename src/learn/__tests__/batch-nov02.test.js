/* Фаза 3 (2 ноября): правки владельца — чистые функции. */
import { describe, it, expect } from 'vitest';
import { questNews, gainsNote, settle, earn, PIGGY, piggyPut, balance } from '../rewards.js';
import { emptyLearn, dayOf, XP, addXp, recallXp, markBook } from '../../textbook/learn-state.js';
import { BOOK_BY_ID, readSeconds, readLockSeconds, READ_WPM, wordsIn } from '../shelf.js';

describe('прогресс заданий без открытия (карточка «Задания», src/learn-rewards.jsx)', () => {
  const quests = [
    { id: 'lessons', title: 'Пройти 2 урока', have: 1, target: 2, done: false, coins: 10 },
    { id: 'correct', title: '15 верных ответов', have: 15, target: 15, done: true, coins: 10 },
    { id: 'xp', title: 'Набрать 60 опыта', have: 20, target: 60, done: false, coins: 10 },
  ];
  it('что продвинулось с прошлого показа — от прежнего значения к новому, по порядку заданий', () => {
    expect(questNews({ lessons: 0, correct: 9, xp: 20 }, quests)).toEqual([
      { id: 'lessons', title: 'Пройти 2 урока', from: 0, to: 1, target: 2, done: false, coins: 10 },
      { id: 'correct', title: '15 верных ответов', from: 9, to: 15, target: 15, done: true, coins: 10 },
    ]);
  });
  it('первый показ сегодня (прошлого нет) или ничего не изменилось — новостей нет', () => {
    expect(questNews(null, quests)).toEqual([]);
    expect(questNews({ lessons: 1, correct: 15, xp: 20 }, quests)).toEqual([]);
  });
});

describe('монеты не появляются молча (жалоба «35 монет, пополнил на 35 — откуда-то 10»)', () => {
  it('выплата settle вне урока — плашкой «+N монет · за что»; несколько — суммой и списком', () => {
    expect(gainsNote([{ key: 'g:2026-11-02', coins: 10, title: 'Цель дня: 10 минут' }])).toMatchObject({ title: '+10 монет', text: 'Цель дня: 10 минут', icon: 'coins' });
    expect(gainsNote([{ key: 'a', coins: 10, title: 'Цель дня: 10 минут' }, { key: 'b', coins: 1, title: 'Задание: X' }])).toMatchObject({ title: '+11 монет', text: 'Цель дня: 10 минут · Задание: X' });
  });
  it('цель дня выполнена, но не выдана: действие вне урока выдаёт её — и settle говорит, что выдал', () => {
    const now = Date.parse('2026-11-02T12:00:00Z');
    const day = dayOf(now);
    // 35 монет, 10 минут занятий сегодня (цель — 10): цель дня ещё не выплачена
    let s = earn({ ...emptyLearn(), daily: { [day]: { s: 600 } } }, 35, null, now);
    const r = piggyPut(s, 35, now);
    expect(r.ok).toBe(true);
    expect(balance(r.s)).toBe(0);
    const st = settle(r.s, {}, now);
    expect(balance(st.s)).toBe(balance(r.s) + st.gains.reduce((a, g) => a + g.coins, 0));
    expect(st.gains.map((g) => g.kind)).toContain('goal');
    expect(PIGGY.min).toBeLessThanOrEqual(35);
  });
});

describe('опыт за «Вспомните» и книги полки; кнопка «Отметить прочитанной» — через половину времени чтения', () => {
  const now = Date.UTC(2026, 10, 2, 12);
  const DAY = 86400000;
  it('«Вспомните»: +1 за новый вопрос и за подошедший срок повторения', () => {
    expect(XP.recall).toBe(1);
    expect(recallXp(undefined, true, now)).toBe(1);
    expect(recallXp({ ok: false, due: now - 1 }, true, now)).toBe(1);
    expect(recallXp({ ok: true, box: 0, due: now - DAY }, true, now)).toBe(1);
  });
  it('без опыта: ошибка, выученный вопрос заново (перезагрузили главу), верно сразу после ошибки', () => {
    expect(recallXp(undefined, false, now)).toBe(0);
    expect(recallXp({ ok: true, box: null, due: null }, true, now)).toBe(0);
    expect(recallXp({ ok: false, box: 0, due: now + 2 * DAY }, true, now)).toBe(0);
  });
  it('addXp — в опыт дня; ноль ничего не меняет', () => {
    const s = addXp(addXp(emptyLearn(), 1, now), 2, now);
    expect(s.xp[dayOf(now)]).toBe(3);
    const e = emptyLearn();
    expect(addXp(e, 0, now)).toBe(e);
  });
  it('книга полки: +5 опыта один раз', () => {
    const a = markBook(emptyLearn(), 'smith-wealth', now);
    expect(a.books['smith-wealth']).toBe(now);
    expect(a.xp[dayOf(now)]).toBe(XP.book);
    expect(XP.book).toBe(5);
    const b = markBook(a, 'smith-wealth', now + 1000);
    expect(b).toBe(a);
  });
  it('время чтения — по словам, 180 слов в минуту; кнопка — через половину, с округлением вверх', () => {
    expect(READ_WPM).toBe(180);
    Object.values(BOOK_BY_ID).forEach((bk) => {
      expect(readSeconds(bk)).toBe(Math.round((wordsIn(bk) / 180) * 60));
      expect(readLockSeconds(bk)).toBe(Math.ceil(readSeconds(bk) / 2));
      expect(readLockSeconds(bk)).toBeGreaterThan(10);
    });
    // Смит — самая длинная: около шести минут чтения, кнопка — через три с небольшим
    expect(readSeconds(BOOK_BY_ID['smith-wealth'])).toBeGreaterThan(300);
    expect(readLockSeconds(BOOK_BY_ID['smith-wealth'])).toBeLessThan(240);
  });
});
