/* РАЗНООБРАЗИЕ ПРАКТИКИ (пункт владельца 25.11): «практика скучная — только вопросы, где нужно выбрать вариант ответа;
   какие-то типы карточек встречаются только в конкретных юнитах». Правила:
   - собранная практика — разных видов: «Выбор ответа», «Верно или неверно» и «Заполните пропуск» считаются одним
     видом «в одно касание», и их в уроке в среднем не больше половины (по всем практикам — не больше трети); видов в
     уроке — не меньше шести, в среднем — восемь. Было до 25.11: в среднем 5,5 вида и 49% «в одно касание», в первой
     практике курса — 70%;
   - «Домино», живой график («Сдвиньте кривую», «Отметьте равновесие», «Найдите цену»), «Соберите определение»,
     «Данные» и задания экзамена — не в одном юните, а по всему Пути. */
import { describe, it, expect } from 'vitest';
import { UNITS, buildLesson, pickDiverse } from '../course.js';
import { seeded } from '../../textbook/variants.js';

const TAP = ['choice', 'gap', 'tf'];
const family = (k) => (TAP.includes(k) ? 'tap' : k);
const practice = UNITS.flatMap((u) => u.lessons.filter((l) => l.kind === 'practice'));
const unitsWith = (pred) => new Set(practice.filter((l) => l.exercises.some(pred)).map((l) => l.unitId));

describe('практика — разных видов', () => {
  it('в каждой практике не меньше шести видов, «в одно касание» — не больше половины; в среднем — восемь видов', () => {
    let kinds = 0; let n = 0; let tapAll = 0;
    practice.forEach((l) => {
      let tap = 0;
      for (let s = 1; s <= 12; s += 1) {
        const { items } = buildLesson(l.id, seeded(s));
        const fam = new Set(items.map((i) => family(i.kind)));
        expect(fam.size, `${l.id} s=${s}: ${[...fam].join(', ')}`).toBeGreaterThanOrEqual(6);
        tap += items.filter((i) => TAP.includes(i.kind)).length / items.length;
        kinds += fam.size; n += 1;
      }
      expect(tap / 12, `${l.id}: доля «в одно касание»`).toBeLessThanOrEqual(0.5);
      tapAll += tap / 12;
    });
    expect(kinds / n).toBeGreaterThanOrEqual(8);
    expect(tapAll / practice.length).toBeLessThanOrEqual(1 / 3);
  });
  it('среди одинаково виденных заданий урок добирает вид, которого в нём ещё нет', () => {
    const list = [{ id: 'a', kind: 'choice' }, { id: 'b', kind: 'tf' }, { id: 'c', kind: 'gap' }, { id: 'd', kind: 'calc' }, { id: 'e', kind: 'sort' }];
    expect(pickDiverse(list, 3).map((e) => e.id)).toEqual(['a', 'd', 'e']);
    // реже виденное — всё равно первым: разнообразие не возвращает задание, которое ученик видел много раз
    expect(pickDiverse(list, 2, { d: 5, e: 5 }).map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('редкие виды — по всему Пути, а не в одном юните', () => {
  it('«Домино» — в практике не меньше одиннадцати юнитов', () => {
    expect(unitsWith((e) => e.kind === 'domino').size).toBeGreaterThanOrEqual(11);
  });
  it('живой график рынка — не меньше чем в четырёх юнитах; «Соберите определение» — в шести', () => {
    expect(unitsWith((e) => ['curve', 'point', 'price'].includes(e.kind)).size).toBeGreaterThanOrEqual(4);
    expect(unitsWith((e) => e.kind === 'tiles').size).toBeGreaterThanOrEqual(6);
  });
  it('«Данные» и задание экзамена (ЕГЭ или ОГЭ) — в практике каждого юнита', () => {
    // юниты Пути — те, где есть практика (остальные главы — только учебник)
    const all = new Set(practice.map((l) => l.unitId));
    expect(all.size).toBeGreaterThanOrEqual(14);
    expect(unitsWith((e) => e.kind === 'data')).toEqual(all);
    expect(unitsWith((e) => e.kind === 'exam')).toEqual(all);
  });
});
