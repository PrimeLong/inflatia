/* «Нарисуй сам» (docs/mechanics.md): задания построены на тех же элементах графика, что и «Разбор графика»;
   верный ответ засчитывается, неверный — нет; правильный ответ, который показывают после второй ошибки,
   сам проходит проверку. */
import { describe, it, expect } from 'vitest';
import { DRAWS, DRAW_BY_UNIT, DRAW_XP, checkTask, solveTask, snapTo, drawScene, taskTarget, drawTour } from '../draws.js';
import { CHARTS } from '../../textbook/charts.js';
import { UNIT_BY_ID, pathState } from '../course.js';
import { unitStops, extraLocks } from '../stops.js';
import { emptyLearn, markDraw } from '../../textbook/learn-state.js';
import { courseLevel } from '../grade.js';

describe('«Нарисуй сам»: содержание', () => {
  it('в каждом юните Пути — по уроку (правило «четыре особых урока»); опыт 15', () => {
    const units = Object.values(UNIT_BY_ID).filter((u) => u.lessons.length).map((u) => u.id).sort();
    expect(DRAWS.map((d) => d.unitId).sort()).toEqual(units);
    expect(DRAW_XP).toBe(15);
    DRAWS.forEach((d) => { expect(UNIT_BY_ID[d.unitId], d.id).toBeTruthy(); expect(CHARTS[d.chart], d.id).toBeTruthy(); expect(DRAW_BY_UNIT[d.unitId]).toBe(d); });
  });
  it('каждое задание ссылается на существующий элемент графика, у каждого — условие, подсказка и итог', () => {
    DRAWS.forEach((d) => d.tasks.forEach((t, i) => {
      const id = `${d.id}#${i}`;
      expect(t.text && t.hint && t.done, id).toBeTruthy();
      expect(d.grid, d.id).toHaveLength(2);
      const sc = drawScene(d, t.values || {});
      if (t.do === 'line' || t.do === 'shift') expect(sc.curves.some((c) => c.id === t.el), id).toBe(true);
      if (t.do === 'point') expect(taskTarget(d, t), id).toBeTruthy();
      if (t.do === 'area') expect((sc.polys || []).some((p) => `poly:${p.label}` === t.el) || /^rect:\d$/.test(t.el), id).toBe(true);
      if (t.do === 'shift') { const c = CHARTS[d.chart].controls(d.attrs).find((x) => x.id === t.control); expect(c, id).toBeTruthy(); expect(t.target).toBeGreaterThanOrEqual(c.min); expect(t.target).toBeLessThanOrEqual(c.max); }
    }));
  });
  it('числа из условий лежат на своих линиях (две точки из текста засчитываются)', () => {
    const pairs = { 'draw-sd': [[[20, 40], [80, 10]], [[20, 10], [100, 30]]], 'draw-labor': [[[100, 200], [200, 100]], [[40, 100], [140, 200]]], 'draw-monopoly': [[[20, 80], [60, 40]], [[20, 60], [40, 20]]],
      'draw-ppf': [[[100, 0], [0, 100]]], 'draw-revenue': [[[10, 800], [20, 1200]], [[30, 1200], [40, 800]]], 'draw-tax': [[[20, 40], [80, 10]], [[20, 10], [100, 30]]],
      'draw-money': [[[10, 5.5], [20, 3.7]]], 'draw-inflation': [[[1, 108], [5, 147]], [[1, 110], [5, 161]]], 'draw-budget': [[[0, 120], [60, 0]]],
      'draw-product': [[[2, 20], [6, 108]]], 'draw-costs': [[[2, 8], [5, 35]]], 'draw-moncomp': [[[16, 90], [26, 60]], [[10, 78], [20, 18]]] };
    DRAWS.forEach((d) => {
      const lines = d.tasks.filter((t) => t.do === 'line');
      lines.forEach((t, k) => { const [a, b] = pairs[d.id][k]; expect(checkTask(d, t, { a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] } }).ok, `${d.id} ${t.el}`).toBe(true); });
    });
  });
  it('итоги в тексте совпадают с графиком: равновесия 60/20 → 80/25, 120/180 → 150/150, монополист 40 по 60', () => {
    const sd = DRAWS[0]; expect(taskTarget(sd, sd.tasks[2])).toEqual({ x: 60, y: 20 }); expect(taskTarget(sd, sd.tasks[4])).toEqual({ x: 80, y: 25 });
    const lb = DRAWS[1]; expect(taskTarget(lb, lb.tasks[2])).toEqual({ x: 120, y: 180 }); expect(taskTarget(lb, lb.tasks[4])).toEqual({ x: 150, y: 150 });
    const mo = DRAWS[2]; expect(taskTarget(mo, mo.tasks[3])).toEqual({ x: 40, y: 60 });
    // новые: числа из итогов — с графика
    const by = Object.fromEntries(DRAWS.map((d) => [d.id, d]));
    const at = (id, i) => { const d = by[id]; const p = taskTarget(d, d.tasks[i]); return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]; };
    expect(at('draw-ppf', 1)).toEqual([60, 80]); expect(Math.round(at('draw-ppf', 4)[1])).toBe(89);
    expect(at('draw-revenue', 2)).toEqual([25, 1250]); expect(at('draw-revenue', 3)).toEqual([35, 1050]);
    expect(at('draw-tax', 2)).toEqual([60, 20]); expect(at('draw-tax', 4)).toEqual([52, 24]);
    expect(at('draw-money', 1)).toEqual([15, 4.4]); expect(at('draw-money', 2)).toEqual([20, 3.67]); expect(at('draw-money', 3)).toEqual([15, 2.89]);
    expect(at('draw-inflation', 2)).toEqual([5, 146.93]); expect(at('draw-inflation', 3)).toEqual([5, 176.23]);
    expect(at('draw-budget', 3)).toEqual([40, 0]); expect(at('draw-budget', 4)).toEqual([0, 150]);
    expect(at('draw-product', 1)).toEqual([4, 64]); expect(at('draw-product', 3)).toEqual([4, 80]);
    expect(at('draw-costs', 1)).toEqual([3, 11]); expect(at('draw-costs', 2)).toEqual([5, 35]);
    expect(at('draw-moncomp', 3)).toEqual([16, 90]); expect(at('draw-moncomp', 5)).toEqual([10, 60]);
  });
});

describe('«Нарисуй сам»: проверка', () => {
  it('правильный ответ (его показывают после второй ошибки) проходит проверку и стоит на сетке', () => {
    DRAWS.forEach((d) => d.tasks.forEach((t, i) => {
      const s = solveTask(d, t);
      expect(checkTask(d, t, s).ok, `${d.id}#${i}`).toBe(true);
      const snapped = s.p ? { p: snapTo(d, s.p) } : s.a ? { a: snapTo(d, s.a), b: snapTo(d, s.b) } : s;
      expect(checkTask(d, t, snapped).ok, `${d.id}#${i} на сетке`).toBe(true);
    }));
  });
  it('неверное не засчитывается: точка далеко, линия не та, сдвиг не туда или не на столько, площадь не та', () => {
    const sd = DRAWS[0];
    expect(checkTask(sd, sd.tasks[0], { a: { x: 20, y: 10 }, b: { x: 100, y: 30 } }).ok).toBe(false);
    expect(checkTask(sd, sd.tasks[0], { a: { x: 20, y: 40 }, b: { x: 25, y: 37.5 } }).why).toMatch(/близко/);
    expect(checkTask(sd, sd.tasks[2], { p: { x: 80, y: 25 } }).ok).toBe(false);
    expect(checkTask(sd, sd.tasks[3], { v: -30 }).why).toMatch(/сторону/);
    expect(checkTask(sd, sd.tasks[3], { v: 10 }).why).toMatch(/маловат/);
    expect(checkTask(sd, sd.tasks[3], { v: 30 }).ok).toBe(true);
    const mo = DRAWS[2];
    expect(checkTask(mo, mo.tasks[4], { p: { x: 20, y: 40 } }).ok).toBe(false);
  });
  it('«разбор» урока: шаг 0 — данное, дальше — по заданию на шаг', () => {
    DRAWS.forEach((d) => { const g = drawTour(d); expect(g.steps).toHaveLength(d.tasks.length + 1); expect(g.steps[0].add).toEqual(d.given); });
  });
});

describe('«Нарисуй сам» на дороге юнита', () => {
  it('остановка — сразу за «Разбором графика» (правило: в каждом юните есть оба)', () => {
    const order = (unitId) => unitStops(pathState(emptyLearn()).find((s) => s.course.id === unitId), emptyLearn()).map((x) => x.type);
    const sd = order('supply-demand'); expect(sd[sd.indexOf('graph') + 1]).toBe('draw');
    const cm = order('competition-monopoly'); expect(cm[cm.indexOf('graph') + 1]).toBe('draw');
    const lm = order('labor'); expect(lm.slice(0, 3)).toEqual(['lesson', 'graph', 'draw']);
  });
  it('следующий урок ждёт его, пройденное помнит прогресс и засчитывает в уровень знаний', () => {
    const unit = UNIT_BY_ID.labor;
    expect(extraLocks(unit, emptyLearn())[0].find((x) => x.type === 'draw')).toEqual({ type: 'draw', id: 'draw-labor', title: 'Рынок труда пекарей', done: false });
    const s = markDraw(emptyLearn(), 'draw-labor', 5);
    expect(s.draws).toEqual({ 'draw-labor': 5 });
    expect(markDraw(s, 'draw-labor', 9)).toBe(s);
    expect(extraLocks(unit, s)[0].find((x) => x.type === 'draw').done).toBe(true);
    expect(courseLevel(s).parts.extras - courseLevel(emptyLearn()).parts.extras).toBe(1);
  });
});
