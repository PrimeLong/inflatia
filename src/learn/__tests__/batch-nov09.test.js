/* Пункты владельца от 9 ноября 2026 — проверки правил (docs/mechanics.md). */
import { describe, it, expect } from 'vitest';
import { emptyLearn, finishLesson, markGem, markReadGem, diamondCount } from '../../textbook/learn-state.js';
import { ACHIEVEMENTS } from '../rewards.js';

const at = (h, m = 0) => new Date(Date.UTC(2026, 10, 9, h, m)).getTime();

describe('алмазы особых уроков — в общем счёте (пункт 5)', () => {
  it('уроки на алмазном уровне, «Чтение» на алмаз и остальные особые — вместе', () => {
    let s = finishLesson(emptyLearn(), 'sc-i1', { xp: 20, accuracy: 100, diamond: true, now: at(9) });
    expect(diamondCount(s)).toBe(1);
    s = markGem(s, 'graph-ppf', at(10));
    s = markReadGem(s, 'read-choice', at(11));
    expect(diamondCount(s)).toBe(3);
  });
  it('печати «Огранщик» и «Ювелир» считают и особые уроки', () => {
    const seal = (id) => ACHIEVEMENTS.find((a) => a.id === id);
    const one = markGem(emptyLearn(), 'draw-ppf', at(9));
    expect(seal('diamond').test(one)).toBe(true);
    const ten = ['people-scarcity', 'graph-ppf', 'draw-ppf', 'graph-sd', 'draw-sd', 'graph-labor', 'draw-labor', 'people-market', 'graph-tax', 'draw-tax']
      .reduce((s, id, i) => markGem(s, id, at(9, i)), emptyLearn());
    expect(seal('diamond10').test(ten)).toBe(true);
    expect(seal('diamond10').test(markGem(emptyLearn(), 'graph-ppf'))).toBe(false);
  });
});
