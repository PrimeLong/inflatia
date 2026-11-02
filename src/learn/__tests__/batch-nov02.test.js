/* Фаза 3 (2 ноября): правки владельца — чистые функции. */
import { describe, it, expect } from 'vitest';
import { questNews } from '../rewards.js';

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
