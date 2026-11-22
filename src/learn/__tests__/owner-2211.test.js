/* Пункты владельца и жалобы 22.11.2026: шкала свечей инвестора, ход «Нарисуй сам» на алмазе, разбор рынка труда,
   шахта убрана, полоса музыки двигается и не уходит за край, тема примеряется до покупки. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { priceRange, tickCandles } from '../../lib/candles.js';
import { DRAW_BY_ID } from '../draws.js';

const src = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');

describe('22.11: терминал инвестора', () => {
  it('«Сейчас»: шкала не уже 1,5% цены — сотые доли процента не растягиваются в «плитки»', () => {
    const ticks = [1050.66, 1050.7, 1051.1, 1050.9, 1051.5, 1051.2];
    const c = tickCandles(ticks, 3);
    const tight = priceRange(c, [], 0.08);
    const live = priceRange(c, [], 0.08, 0.015);
    expect(tight.max - tight.min).toBeLessThan(2);
    expect(live.max - live.min).toBeGreaterThanOrEqual(1051 * 0.015 - 1e-6);
    // середина шкалы — у цен: свечи по центру, а не у края
    expect(Math.abs((live.max + live.min) / 2 - 1051.08)).toBeLessThan(0.5);
    // широкий размах не трогается
    const wide = priceRange([{ h: 1100, l: 1000 }], [], 0, 0.015);
    expect([wide.min, wide.max]).toEqual([1000, 1100]);
  });
  it('лента «Сейчас» — только идущий квартал; первый кадр нового квартала со старой ценой не пишется; со второго квартала — квартальные свечи', () => {
    const t = src('trading.jsx');
    expect(t).toMatch(/if \(tapeQ\.current !== curQ\) \{ tape\.current = \{\}; tapeQ\.current = curQ; \}/);
    expect(t).toMatch(/Math\.abs\(lv \/ target - 1\) > 0\.02\) return;/);
    expect(t).toContain("(history || []).length >= 2 ? '2y' : 'live'");
    expect(t).toContain('data-testid="tt-howto"');
    expect(src('game.jsx')).toContain('Сделки сделаны? Завершите квартал');
  });
});

describe('22.11: жалобы учеников', () => {
  it('draw-moncomp, шаг 7 на алмазе: точку касания можно посчитать по условию — 90 − 3Q = 10 + Q + 400/Q при Q = 10', () => {
    const t = DRAW_BY_ID['draw-moncomp'].tasks[6];
    expect(t.text).toContain('P = 90 − 3Q');
    expect(t.text).toContain('ATC = 10 + Q + 400 / Q');
    const q = 10; expect(90 - 3 * q).toBe(10 + q + 400 / q);
  });
  it('lm-ex-ege: разбор объясняет каждое событие, и отдельно — новые печи (спрос, а не предложение)', () => {
    const md = readFileSync(new URL('../../textbook/chapters/labor.md', import.meta.url), 'utf8');
    const block = md.slice(md.indexOf(':::ex exam id=lm-ex-ege'), md.indexOf(':::recall id=labor-r-min'));
    expect(block).toMatch(/С новыми печами каждый пекарь печёт вдвое больше\*\* — кажется, что пекарей теперь нужно меньше/);
    expect((block.match(/^- \*\*/gm) || []).length).toBe(5);
  });
  it('graph-monopoly на алмазе: варианты пропуска — фишками в ряд, без полной ширины и внешних отступов', () => {
    expect(src('learn-graph.jsx')).toMatch(/\.gl-cloze \.ds-opt \{ width: auto; flex: 0 1 auto; margin: 0;/);
  });
  it('портреты и новости при наведении не поднимаются (дрожали у нижнего края)', () => {
    expect(src('learn-people.jsx')).not.toMatch(/\.pp-who-pick:hover[^}]*translateY/);
    expect(src('learn-notify.jsx')).not.toMatch(/\.nw-issue:hover[^}]*translateY/);
    expect(src('ds.jsx')).not.toMatch(/\.ds-card--button:hover[^}]*translateY/);
  });
  it('черновик и «закрасить область»: правая кнопка мыши — ластик', () => {
    expect(src('learn-sketch.jsx')).toMatch(/tool: right \? 'eraser' : p\.tool/);
    expect(src('learn-draw.jsx')).toMatch(/e\.button === 2 && e\.pointerType === 'mouse'/);
  });
  it('полоса музыки двигается и не уходит за край окна', async () => {
    const { clampDock } = await import('../../learn-musicdock.jsx');
    const rect = { left: 400, right: 940, top: 900, bottom: 960 };
    expect(clampDock({ x: -1000, y: -2000 }, rect, 1340, 1000)).toEqual({ x: -396, y: -896 });
    expect(clampDock({ x: 1000, y: 500 }, rect, 1340, 1000)).toEqual({ x: 396, y: 36 });
    expect(clampDock({ x: 30, y: -40 }, rect, 1340, 1000)).toEqual({ x: 30, y: -40 });
  });
});

describe('22.11: пункты владельца', () => {
  it('п. 10: шахты нет — ни вкладки, ни кода, ни поля в прогрессе', () => {
    ['learn-mine.jsx', 'learn/mine.js', 'learn/mine-state.js'].forEach((f) => expect(existsSync(new URL(`../../${f}`, import.meta.url)), f).toBe(false));
    expect(src('learn-shop.jsx')).not.toMatch(/id: 'mine'|MineGame/);
    expect(src('textbook/learn-state.js')).not.toMatch(/mine:/);
  });
  it('п. 11: тема урока примеряется до покупки — урок во весь экран, ответ слышит тема', () => {
    expect(src('learn-skins.jsx')).toMatch(/export function SkinTryOn/);
    expect(src('learn-skins.jsx')).toContain('tellAnswer(TRY_Q.opts[i].ok)');
    expect(src('learn-shop.jsx')).toContain('data-testid="theme-try"');
  });
  it('п. 1: Инфля внутри кнопок и плиток на касание не отвечает; реакции без оборота на 360°', () => {
    const m = src('mascot.jsx');
    expect(m).toContain("host.closest('button, a[href], [role=\"button\"], [role=\"tab\"], label')");
    expect(m).not.toMatch(/infla-pk-spin \{ 0% \{ transform: rotate\(0\) \} 100% \{ transform: rotate\(360deg\)/);
    expect(src('learn-shop.jsx')).toContain('still react={false}');
  });
  it('п. 5: у шапки особого урока нет черты снизу', () => {
    expect(src('learn-special.jsx')).not.toMatch(/\.sp-top \{[^}]*box-shadow/);
  });
});
