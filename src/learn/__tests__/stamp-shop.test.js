/* Печать «Первая покупка» и «Гардероб» (пункт владельца 20.11, п. 1: «печать „первая покупка“ выдаётся за протёртость
   витрины»). Подарок (паутина за тыквы) — не покупка; тряпка и полироль — покупка, но не наряд. И печать приходит в
   момент покупки улучшения, а не при следующей протёртой витрине. src/learn/rewards.js, src/learn/dust.js */
import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, settle, earn, achievementKey, hasClaim } from '../rewards.js';
import { WEB_FRAME } from '../halloween.js';
import { buyCloth, dustClaim } from '../dust.js';
import { emptyLearn } from '../../textbook/learn-state.js';

const T = Date.UTC(2026, 10, 20, 12);
const test = (id, s) => ACHIEVEMENTS.find((a) => a.id === id).test(s, { longest: 0, lessonsDone: 0, unitsDone: 0, kinds: 0 });

describe('печать «Первая покупка» — только за покупку', () => {
  it('паутина-подарок в owned — не покупка', () => {
    expect(test('shop', { ...emptyLearn(), owned: { [WEB_FRAME]: T } })).toBe(false);
  });
  it('купленная тряпка — покупка, но не наряд Инфли', () => {
    const s = { ...emptyLearn(), owned: { 'dust-cloth': T, 'dust-polish': T, 'rec-x': T } };
    expect(test('shop', s)).toBe(true);
    expect(test('wardrobe', s)).toBe(false);
  });
  it('протёртая витрина без покупок печать не даёт', () => {
    let s = { ...emptyLearn(), owned: { [WEB_FRAME]: T } };
    s = dustClaim(s, T);
    expect(hasClaim(settle(s, {}, T).s, achievementKey('shop'))).toBe(false);
  });
  it('печать — в момент покупки тряпки: settle сразу после buyCloth', () => {
    const s = earn(emptyLearn(), 100, 'seed', T);
    const r = buyCloth(s, T);
    expect(r.ok).toBe(true);
    expect(settle(r.s, {}, T).gains.map((g) => g.key)).toContain(achievementKey('shop'));
  });
});
