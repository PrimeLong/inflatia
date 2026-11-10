// «Мир» на пробу — без регистрации (docs/mechanics.md, «„Мир“ на пробу — без регистрации»)
import { describe, it, expect } from 'vitest';
import { TRIAL_SECONDS, trialOf, trialActive, trialEnded, trialLeft, startTrial, tickTrial, trialWorldOpen } from '../world-trial.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

describe('«Мир» на пробу', () => {
  it('проба — 10 минут игры; время копится, повторный старт его не сбрасывает', () => {
    const st = memory();
    expect(TRIAL_SECONDS).toBe(600);
    expect(trialOf(st)).toBe(null);
    startTrial(1000, st);
    expect(trialActive(st)).toBe(true);
    expect(tickTrial(250, 2000, st, 600)).toBe(false);
    startTrial(3000, st);
    expect(trialOf(st)).toEqual({ at: 1000, used: 250, ended: 0 });
    expect(trialLeft(st, 600)).toBe(350);
  });
  it('время вышло — проба кончается один раз, в тот самый момент', () => {
    const st = memory();
    startTrial(1, st);
    expect(tickTrial(599, 10, st, 600)).toBe(false);
    expect(tickTrial(5, 20, st, 600)).toBe(true);
    expect(trialEnded(st)).toBe(true);
    expect(trialOf(st)).toEqual({ at: 1, used: 600, ended: 20 });
    expect(tickTrial(5, 30, st, 600)).toBe(false);
    expect(trialLeft(st, 600)).toBe(0);
  });
  it('«Мир» после пробы: идёт — открыт, кончилась — закрыт без аккаунта, с аккаунтом — по урокам', () => {
    const st = memory();
    expect(trialWorldOpen({ store: st })).toBe(null);
    startTrial(1, st);
    expect(trialWorldOpen({ store: st })).toBe(true);
    tickTrial(600, 2, st, 600);
    expect(trialWorldOpen({ store: st, hasAccount: false })).toBe(false);
    expect(trialWorldOpen({ store: st, hasAccount: true })).toBe(null);
  });
  it('испорченная отметка — как будто пробы не было', () => {
    const st = memory();
    st.setItem('ems-world-trial', '{oops');
    expect(trialOf(st)).toBe(null);
    st.setItem('ems-world-trial', JSON.stringify({ at: -5, used: 'x', ended: null }));
    expect(trialOf(st)).toEqual({ at: 0, used: 0, ended: 0 });
  });
});
