// «Большое повторение» в конце уровня (docs/mechanics.md, «Большое повторение: в конце каждого уровня»)
import { describe, it, expect } from 'vitest';
import { pathState, buildLevelReview, levelUnits, LEVEL_REVIEW_SIZE, EXERCISES, LEVELS } from '../course.js';
import { extraLocks } from '../stops.js';
import { emptyLearn, finishLesson, passUnit, addMistake, normalizeLearn, mergeLearn, finishLevelReview, levelReviewDone, levelConfirmed, LEVEL_REVIEW_OK } from '../../textbook/learn-state.js';
import { runCoins, runKey, COIN } from '../rewards.js';
import { seeded } from '../../textbook/variants.js';

const AT = Date.UTC(2026, 10, 9, 12);
// пройти юнит уроками: все уроки и все особые уроки его дороги
function completeUnit(s, u) {
  let t = u.lessons.reduce((x, l) => finishLesson(x, l.id, { xp: 10, accuracy: 90, now: AT }), s);
  const ex = Object.values(extraLocks(u, t)).flat();
  const field = { people: 'met', read: 'read', graph: 'graphs', draw: 'draws' };
  ex.forEach((e) => { t = { ...t, [field[e.type]]: { ...(t[field[e.type]] || {}), [e.id]: AT } }; });
  return t;
}
const completeLevel = (s, levelId) => levelUnits(levelId).reduce(completeUnit, s);
const unitOf = (it) => (EXERCISES[it.of || it.id] || {}).unitId || it.unitId;

describe('сборка: этот уровень и прошлые', () => {
  it('первый уровень — 15 заданий только из его юнитов, без повторов', () => {
    const p = buildLevelReview('start', emptyLearn(), seeded(3));
    const own = new Set(levelUnits('start').map((u) => u.id));
    expect(p.items).toHaveLength(LEVEL_REVIEW_SIZE);
    p.items.forEach((it) => expect(own.has(unitOf(it)), it.id).toBe(true));
    expect(new Set(p.items.map((it) => it.of || it.id)).size).toBe(p.items.length);
    // от каждого юнита уровня — хотя бы по несколько
    levelUnits('start').forEach((u) => expect(p.items.filter((it) => unitOf(it) === u.id).length).toBeGreaterThanOrEqual(3));
  });
  it('второй уровень — две трети его, треть — из первого', () => {
    const p = buildLevelReview('basic', emptyLearn(), seeded(5));
    const basic = new Set(levelUnits('basic').map((u) => u.id));
    const start = new Set(levelUnits('start').map((u) => u.id));
    expect(p.items).toHaveLength(LEVEL_REVIEW_SIZE);
    expect(p.items.filter((it) => basic.has(unitOf(it)))).toHaveLength(10);
    expect(p.items.filter((it) => start.has(unitOf(it)))).toHaveLength(5);
  });
  it('ошибки юнита идут первыми — похожей задачей или с новыми числами', () => {
    const u = levelUnits('start')[0];
    const wrong = u.lessons.flatMap((l) => l.exercises).find((e) => e.kind === 'choice' || e.kind === 'calc');
    const s = addMistake(emptyLearn(), wrong.id, AT);
    let hits = 0;
    for (let k = 1; k <= 6; k += 1) if (buildLevelReview('start', s, seeded(k)).items.some((it) => (it.of || it.id) === wrong.id)) hits += 1;
    expect(hits).toBe(6);
  });
});

describe('Путь: новый уровень ждёт большого повторения', () => {
  it('уровень пройден — первый урок следующего закрыт, остановка «Большое повторение» — текущая', () => {
    const s = completeLevel(emptyLearn(), 'start');
    const st = pathState(s);
    const lastStart = st.filter((x) => x.course.level === 'start').pop();
    const firstBasic = st.find((x) => x.course.level === 'basic');
    expect(lastStart.complete).toBe(true);
    expect(lastStart.levelReview).toMatchObject({ levelId: 'start', done: false });
    expect(lastStart.current).toMatchObject({ extra: 'level-review', levelId: 'start' });
    expect(firstBasic.lessons[0].open).toBe(false);
    expect(firstBasic.lessons[0].levelWait).toBe('start');
    // прошли — уровень открыт, с любым результатом
    const after = pathState(finishLevelReview(s, 'start', { accuracy: 40, now: AT }));
    expect(after.find((x) => x.course.level === 'basic').lessons[0].open).toBe(true);
    expect(after.filter((x) => x.course.level === 'start').pop().levelReview.done).toBe(true);
  });
  it('кто уже начал следующий уровень — того задним числом не останавливает', () => {
    let s = completeLevel(emptyLearn(), 'start');
    const firstBasic = levelUnits('basic')[0];
    s = finishLesson(s, firstBasic.lessons[0].id, { xp: 10, accuracy: 90, now: AT });
    const st = pathState(s);
    const fb = st.find((x) => x.course.id === firstBasic.id);
    expect(fb.lessons[0].open).toBe(true);
    expect(fb.lessons[1].open).toBe(true);
    expect(fb.lessons[0].levelWait).toBeUndefined();
  });
  it('уровень, целиком сданный тестами, — повторение засчитано', () => {
    const s = levelUnits('start').reduce((x, u) => passUnit(x, u.id, { now: AT }), emptyLearn());
    const st = pathState(s);
    expect(st.find((x) => x.course.level === 'basic').lessons[0].open).toBe(true);
    expect(st.filter((x) => x.course.level === 'start').pop().levelReview.done).toBe(true);
  });
  it('у каждого уровня с уроками — своя остановка после его последнего юнита', () => {
    const st = pathState(emptyLearn());
    const withLessons = LEVELS.map((l) => l.id).filter((id) => levelUnits(id).length);
    withLessons.forEach((id) => {
      const last = st.filter((x) => x.course.level === id).pop();
      expect(last.levelReview, id).toMatchObject({ levelId: id });
    });
  });
});

describe('прогресс и награды', () => {
  it('80% и выше — уровень подтверждён; лучшая точность и первое прохождение помнятся', () => {
    let s = finishLevelReview(emptyLearn(), 'start', { accuracy: 60, now: 100 });
    expect(levelReviewDone(s, 'start')).toBe(true);
    expect(levelConfirmed(s, 'start')).toBe(false);
    s = finishLevelReview(s, 'start', { accuracy: LEVEL_REVIEW_OK, now: 200 });
    expect(s.levels.start).toEqual({ at: 100, best: 80, ok: 200 });
    s = finishLevelReview(s, 'start', { accuracy: 50, now: 300 });
    expect(s.levels.start).toEqual({ at: 100, best: 80, ok: 200 });
  });
  it('на другом устройстве: раньшее прохождение, лучшая точность, подтверждение — если было хоть где-то', () => {
    const a = finishLevelReview(emptyLearn(), 'start', { accuracy: 90, now: 500 });
    const b = finishLevelReview(emptyLearn(), 'start', { accuracy: 70, now: 300 });
    expect(mergeLearn(normalizeLearn(a), normalizeLearn(b)).levels.start).toEqual({ at: 300, best: 90, ok: 500 });
    expect(normalizeLearn({ levels: { start: { at: 'x' }, basic: { at: 5, best: 400, ok: 6 } } }).levels).toEqual({ basic: { at: 5, best: 100, ok: 6 } });
  });
  it('монеты: подтверждение — как проверка, иначе — как урок; каждое — один раз', () => {
    expect(runCoins({ mode: 'level', pass: true })).toBe(COIN.check);
    expect(runCoins({ mode: 'level', pass: false })).toBe(COIN.lesson);
    expect(runCoins({ mode: 'level', pass: false, confirmed: true })).toBe(0);
    expect(runKey({ mode: 'level', levelId: 'start', pass: true })).toBe('lvok:start');
    expect(runKey({ mode: 'level', levelId: 'start', pass: false })).toBe('lv:start');
    expect(runKey({ mode: 'level', levelId: 'start', pass: false, confirmed: true })).toBe(null);
  });
});
