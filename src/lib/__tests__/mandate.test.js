/* Мандат власти — цель с числами (пункт владельца 08.11, вечер: «„привести бюджет в порядок“ — а в чём требование?»;
   docs/mechanics.md, «„Мир“: решения квартала»). */
import { describe, it, expect } from 'vitest';
import { mandateGoal, mandateWho, makeInitialEconomy, MANDATE_LABEL } from '../engine.js';

describe('мандат власти: что ждут, сколько сейчас, выполняется ли', () => {
  const e = makeInitialEconomy();
  it('бюджет: дефицит не больше 3% ВВП; сейчас — дефицит и долг', () => {
    const bad = mandateGoal({ ...e, mandate: 'budget', budgetBalancePctGdp: -5.2, debtToGdp: 92 });
    expect(bad.goal).toContain('не больше 3% ВВП');
    expect(bad.now).toBe('5,2% ВВП');
    expect(bad.by).toEqual(['ministry_finance']);
    expect(bad.met).toBe(false);
    expect(mandateGoal({ ...e, mandate: 'budget', budgetBalancePctGdp: -2.5, debtToGdp: 90 }).met).toBe(true);
  });
  it('цены, занятость, рост — свои пороги', () => {
    expect(mandateGoal({ ...e, mandate: 'prices', inflation: 6, inflationTarget: 4 }).met).toBe(false);
    expect(mandateGoal({ ...e, mandate: 'prices', inflation: 4.8, inflationTarget: 4 }).met).toBe(true);
    expect(mandateGoal({ ...e, mandate: 'jobs', unemployment: 7, nairu: 5 }).met).toBe(false);
    expect(mandateGoal({ ...e, mandate: 'jobs', unemployment: 5.4, nairu: 5 }).goal).toContain('5,5%');
    expect(mandateGoal({ ...e, mandate: 'growth', gdpGrowth: 2.4 }).met).toBe(true);
  });
  it('у каждого мандата есть цель; без мандата — ничего', () => {
    Object.keys(MANDATE_LABEL).forEach((m) => { const g = mandateGoal({ ...e, mandate: m }); expect(g && g.goal && g.now, m).toBeTruthy(); });
    expect(mandateGoal({ ...e, mandate: null })).toBeNull();
  });
});

describe('мандат: кто отвечает (пункт владельца 09.11)', () => {
  it('бюджет — Минфин, цены — ЦБ; своё ведомство — «это ваша задача»', () => {
    expect(mandateWho(['ministry_finance'], 'ministry_finance')).toBe('Это ваша задача — бюджет у Минфина.');
    expect(mandateWho(['ministry_finance'], 'central_bank')).toBe('Отвечает Минфин.');
    expect(mandateWho(['central_bank'], 'central_bank')).toBe('Это ваша задача — ставка и цены у ЦБ.');
    expect(mandateWho(['central_bank', 'ministry_finance'], 'trader')).toBe('Отвечают ЦБ и Минфин.');
    expect(mandateWho(['central_bank', 'ministry_finance'], 'central_bank')).toContain('Это и ваша задача');
    expect(mandateWho(['ministry_finance'], 'president')).toContain('указания им даёте вы');
    expect(mandateWho(['central_bank'], 'full_control')).toContain('оба ведомства');
  });
});
