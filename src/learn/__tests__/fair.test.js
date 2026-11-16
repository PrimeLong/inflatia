import { describe, it, expect } from 'vitest';
import { FAIR, fairRun, heldLessons, settle, earn, hasClaim } from '../rewards.js';
import { emptyLearn, finishLesson, normalizeLearn, mergeLearn } from '../../textbook/learn-state.js';
import { SECONDS, LESSON_BY_ID, UNIT_BY_ID } from '../course.js';
import { courseCtx } from '../program.js';

/* Награды за урок — только за честную работу (docs/mechanics.md; пункт владельца 13.11): точность с первой попытки
   ниже 60% или среднее время на вопрос меньше трети нормы — монеты «За урок» и печати не выдаются. */
describe('награды за урок: честная работа', () => {
  const norm = (kinds) => kinds.reduce((a, k) => a + SECONDS[k], 0) * 1000;
  it('порог точности — 60% с первой попытки', () => {
    expect(FAIR.accuracy).toBe(60);
    expect(fairRun({ accuracy: 59.9, ms: 1e6, normMs: 1000 })).toBe('accuracy');
    expect(fairRun({ accuracy: 60, ms: 1e6, normMs: 1000 })).toBe(null);
    expect(fairRun({ accuracy: 100, ms: 1e6, normMs: 1000 })).toBe(null);
  });
  it('порог скорости — треть нормы из SECONDS: десять выборов по 12 секунд — не быстрее 40 секунд', () => {
    const n = norm(Array(10).fill('choice'));
    expect(n).toBe(120000);
    expect(fairRun({ accuracy: 100, ms: 39000, normMs: n })).toBe('speed');
    expect(fairRun({ accuracy: 100, ms: 40000, normMs: n })).toBe(null);
    // автотест скорость не проверяет, пока сам не попросит
    expect(fairRun({ accuracy: 100, ms: 1000, normMs: n, checkSpeed: false })).toBe(null);
    // точность важнее: наугад и быстро — «точность»
    expect(fairRun({ accuracy: 30, ms: 1000, normMs: n })).toBe('accuracy');
  });
  it('придержанный урок: печати не выдаются, пока он не повторён честно', () => {
    const now = Date.UTC(2026, 10, 13, 12);
    let s = finishLesson(emptyLearn(), 'sc-i1', { xp: 10, accuracy: 40, now, held: true });
    expect(s.lessons['sc-i1'].held).toBe(1);
    expect(heldLessons(s)).toEqual(['sc-i1']);
    const a = settle(s, courseCtx(s), now);
    expect(a.gains.filter((g) => g.kind === 'achievement')).toEqual([]);
    // тот же урок без отметки — печать «первый урок» выдаётся
    const fair = finishLesson(emptyLearn(), 'sc-i1', { xp: 10, accuracy: 90, now });
    expect(settle(fair, courseCtx(fair), now).gains.some((g) => g.kind === 'achievement')).toBe(true);
    // честный повтор снимает отметку, монеты «За урок» получены — печати идут
    s = earn(finishLesson(s, 'sc-i1', { xp: 5, accuracy: 80, now: now + 1000 }), 10, 'l:sc-i1', now + 1000);
    expect(s.lessons['sc-i1'].held).toBeUndefined();
    expect(hasClaim(s, 'l:sc-i1')).toBe(true);
    expect(heldLessons(s)).toEqual([]);
    expect(settle(s, courseCtx(s), now + 2000).gains.some((g) => g.kind === 'achievement')).toBe(true);
  });
  it('settle с seals: false печати не выдаёт, остальное — выдаёт', () => {
    const now = Date.UTC(2026, 10, 13, 12);
    const s = finishLesson(emptyLearn(), 'sc-i1', { xp: 10, accuracy: 90, now, seconds: 600 });
    const withSeals = settle(s, courseCtx(s), now).gains; const without = settle(s, courseCtx(s), now, { seals: false }).gains;
    expect(without.some((g) => g.kind === 'achievement')).toBe(false);
    expect(without.filter((g) => g.kind !== 'achievement').map((g) => g.key)).toEqual(withSeals.filter((g) => g.kind !== 'achievement').map((g) => g.key));
  });
  it('отметка переживает сохранение и слияние устройств; честный повтор на одном снимает её на обоих', () => {
    const now = Date.UTC(2026, 10, 13, 12);
    const held = finishLesson(emptyLearn(), 'sc-i1', { xp: 10, accuracy: 40, now, held: true });
    expect(normalizeLearn(JSON.parse(JSON.stringify(held))).lessons['sc-i1'].held).toBe(1);
    const fixed = finishLesson(held, 'sc-i1', { xp: 5, accuracy: 80, now: now + 1000 });
    expect(mergeLearn(held, fixed).lessons['sc-i1'].held).toBeUndefined();
    expect(mergeLearn(held, held).lessons['sc-i1'].held).toBe(1);
  });
});

describe('первый урок — не больше четырёх новых идей', () => {
  const ideas = (id) => LESSON_BY_ID[id].inner.filter((c) => !c.diamond && !c.discover).length;
  it('sc-i1 разделён: четыре идеи и три, вторая часть идёт сразу за первой', () => {
    expect(ideas('sc-i1')).toBe(4);
    expect(ideas('sc-i1b')).toBe(3);
    expect(UNIT_BY_ID.scarcity.lessons.slice(0, 3).map((l) => l.id)).toEqual(['sc-i1', 'sc-i1b', 'sc-l1']);
    // у каждой идеи — свой вопрос сразу после неё
    ['sc-i1', 'sc-i1b'].forEach((id) => expect(LESSON_BY_ID[id].exercises.filter((e) => !e.diamond).length).toBe(ideas(id)));
  });
  it('первый урок курса и его продолжение — не больше четырёх обычных шагов каждый', () => {
    ['sc-i1', 'sc-i1b'].forEach((id) => expect(ideas(id), id).toBeLessThanOrEqual(4));
  });
  it('кто ушёл дальше прежнего урока — прошёл и новую часть; кто прошёл только его — встретит её следующим уроком', () => {
    const at = Date.UTC(2026, 9, 1);
    const far = normalizeLearn({ lessons: { 'sc-i1': { at, runs: 2, best: 90 }, 'sc-l1': { at: at + 1, runs: 1, best: 80 } } });
    expect(far.lessons['sc-i1b']).toEqual({ at, runs: 1, best: 90 });
    expect(normalizeLearn({ lessons: { 'sc-i1': { at, runs: 1, best: 90 } } }).lessons['sc-i1b']).toBeUndefined();
    // вступительный тест (runs: 0) уроков не засчитывает
    expect(normalizeLearn({ lessons: { 'sc-i1': { at, runs: 0, best: 0 }, 'sc-l1': { at, runs: 0, best: 0 } } }).lessons['sc-i1b']).toBeUndefined();
    // уже пройденную новую часть не трогаем
    expect(normalizeLearn({ lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at: at + 5, runs: 3, best: 70 }, 'sc-l1': { at, runs: 1, best: 80 } } }).lessons['sc-i1b'].runs).toBe(3);
  });
});
