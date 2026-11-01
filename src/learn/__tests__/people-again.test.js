/* «Персоналии»: не обязательно каждый раз новый человек — знакомый возвращается в другом юните с новой идеей,
   а в галерее он один (docs/mechanics.md, «Персоналии»). */
import { describe, it, expect } from 'vitest';
import { resolvePeople, galleryOf, PEOPLE, PERSON_BY_ID } from '../people.js';

const base = (id, name) => ({ id, name, years: '1723–1790', born: 1723, died: 1790, role: 'шотландский экономист', mark: 1776, lead: 'первый раз', story: ['a'], idea: 'рука', fact: 'f', ask: { prompt: 'q', options: [{ text: 'x', ok: true }] } });
const RAW = [
  { id: 'g-market', unitId: 'supply-demand', title: 'Люди рынка', people: [base('smith', 'Адам Смит'), base('marshall', 'Альфред Маршалл')] },
  { id: 'g-labor', unitId: 'labor', title: 'Люди труда', people: [{ again: 'smith', lead: 'снова', story: ['b'], idea: 'зарплаты', fact: 'g', ask: { prompt: 'q2', options: [{ text: 'y', ok: true }] } }, base('mill', 'Джон Стюарт Милль')] },
];

describe('знакомый возвращается', () => {
  const groups = resolvePeople(RAW);
  it('имя, годы, роль — из первой встречи; рассказ, идея и вопрос — свои; отмечен «снова» и где встречались', () => {
    const smith = groups[1].people[0];
    expect(smith).toMatchObject({ id: 'smith', name: 'Адам Смит', years: '1723–1790', mark: 1776, again: true, firstGroup: 'g-market' });
    expect(smith).toMatchObject({ lead: 'снова', idea: 'зарплаты', story: ['b'] });
    expect(smith.ask.prompt).toBe('q2');
    expect(groups[0].people[0].again).toBeUndefined();
  });
  it('в галерее — по одному разу; встречен, если пройдены любые «Персоналии», где он есть', () => {
    const g = galleryOf({ met: { 'g-labor': 1 } }, groups);
    expect(g.map((p) => p.id)).toEqual(['smith', 'marshall', 'mill']);
    expect(g.find((p) => p.id === 'smith').met).toBe(true);
    expect(g.find((p) => p.id === 'marshall').met).toBe(false);
  });
  it('вернуться может только тот, кто уже встречался', () => {
    expect(() => resolvePeople([{ id: 'x', title: 'X', people: [{ again: 'nobody' }] }])).toThrow(/nobody/);
  });
  it('в курсе: у каждого человека один портрет и одна строка галереи', () => {
    const ids = galleryOf({}).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    PEOPLE.forEach((g) => g.people.forEach((p) => expect(PERSON_BY_ID[p.id], p.id).toBeTruthy()));
  });
});
