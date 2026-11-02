/* Фаза 3 (2 ноября): правки владельца — чистые функции. */
import { describe, it, expect } from 'vitest';
import { questNews, gainsNote, settle, earn, PIGGY, piggyPut, balance } from '../rewards.js';
import { emptyLearn, dayOf } from '../../textbook/learn-state.js';

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
