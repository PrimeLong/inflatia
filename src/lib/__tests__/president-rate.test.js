/* «Президент просит снизить ключевую ставку ниже, чем она возможна» (пункт владельца 08.11, вечер; docs/mechanics.md,
   «„Мир“: решения квартала»): просьба о ставке не выходит за её границы — 0% снизу и потолок keyRateCap сверху. */
import { describe, it, expect } from 'vitest';
import { REQUESTS, fitStrength, makeInitialEconomy, botPresident, keyRateCap, directiveProgress } from '../engine.js';

const req = (id) => REQUESTS.find((r) => r.id === id);

describe('просьба о ставке — не дальше её границ', () => {
  it('снизить: не больше, чем до нуля; на нуле — просить нечего', () => {
    expect(fitStrength(req('rate_cut'), { keyRate: 5 })).toBe(1);
    expect(fitStrength(req('rate_cut'), { keyRate: 0.5 })).toBe(0.5);
    expect(fitStrength(req('rate_cut'), { keyRate: 1.5 }, 2)).toBe(1.5);
    expect(fitStrength(req('rate_cut'), { keyRate: 0.1 })).toBeNull();
    expect(fitStrength(req('rate_cut'), { keyRate: 0 })).toBeNull();
  });
  it('повысить: не выше потолка ставки', () => {
    const e = { keyRate: 24.5, inflation: 4, inflationExpectations: 4 };
    expect(keyRateCap(e)).toBe(25);
    expect(fitStrength(req('rate_hike'), e) * req('rate_hike').scale.base).toBe(0.5);
    expect(fitStrength(req('rate_hike'), { ...e, keyRate: 25 })).toBeNull();
  });
  it('у просьб без границ сила не меняется', () => {
    expect(fitStrength(req('liquidity_help'), { keyRate: 0 }, 1.5)).toBe(1.5);
  });
  it('бот-президент при ставке 0% не просит её снижать, при 0,5% просит снизить на 0,5 п.п., и выполнить это можно целиком', () => {
    // спад и безработица — ровно та картина, где популист требует снижения
    const base = { ...makeInitialEconomy(), outputGap: -3, unemployment: 9, inflation: 2, inflationExpectations: 2 };
    const seen = (e) => {
      const out = [];
      for (let i = 0; i < 150; i++) {
        const p = botPresident(e, 'populist', 'medium', { playerBranch: 'monetary', cooldowns: {} });
        if (p.directive) out.push(p.directive);
      }
      return out;
    };
    expect(seen({ ...base, keyRate: 6 }).some((d) => d.reqId === 'rate_cut')).toBe(true);
    expect(seen({ ...base, keyRate: 0 }).some((d) => d.reqId === 'rate_cut')).toBe(false);
    const half = seen({ ...base, keyRate: 0.5 }).filter((d) => d.reqId === 'rate_cut');
    expect(half.length).toBeGreaterThan(0);
    half.forEach((d) => { expect(d.ask).toContain('на 0,5 п.п.'); expect(d.strength).toBe(0.5); });
    // ЦБ-игрок снизил до нуля — указание выполнено полностью
    const dec = { keyRate: 0.5 };
    expect(directiveProgress('rate_cut', dec, { keyRate: 0 }, { keyRate: 0.5 }, 0.5)).toBe(1);
  });
});
