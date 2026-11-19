/* Пункт владельца 19.11, п. 11: новое улучшение витрины — «Полироль»: после микрофибры, за «Блестит!» (100%) ещё +1 монета
   за ту же витрину, один раз; окупается за 6 дней. */
import { describe, it, expect } from 'vitest';
import { POLISH, CLOTH, buyCloth, buyPolish, hasPolish, dustClaim, dustShine, polishReturn, polishPaybackDays, clothReturn, dustDone } from '../dust.js';
import { emptyLearn } from '../../textbook/learn-state.js';
import { balance } from '../rewards.js';

const T = Date.UTC(2026, 10, 19, 12);
const rich = () => ({ ...emptyLearn(), coins: { '2026-11-01': 200 } });

describe('«Полироль»', () => {
  it('продаётся только после микрофибры; один раз; деньги списываются', () => {
    expect(buyPolish(rich(), T)).toMatchObject({ ok: false, reason: 'Сначала — микрофибра' });
    const c = buyCloth(rich(), T).s;
    const r = buyPolish(c, T);
    expect(r.ok).toBe(true); expect(hasPolish(r.s)).toBe(true);
    expect(balance(r.s)).toBe(200 - CLOTH.price - POLISH.price);
    expect(buyPolish(r.s, T).ok).toBe(false);
  });
  it('«Блестит!» — +1 за оплаченную витрину, второй раз за неё не платит; без полироли — ничего; микрофибре не мешает', () => {
    let s = buyPolish(buyCloth(rich(), T).s, T).s;
    const b0 = balance(s);
    expect(balance(dustShine(s, T))).toBe(b0); // ни одной оплаченной витрины — блеска не за что
    s = dustClaim(s, T);
    s = dustShine(s, T);
    expect(balance(s)).toBe(b0 + 2 + POLISH.bonus);
    expect(balance(dustShine(s, T))).toBe(balance(s));
    expect(polishReturn(s)).toBe(POLISH.bonus);
    expect(dustDone(s, T)).toBe(1);
    expect(clothReturn(s)).toBe(0);
    const plain = dustClaim(rich(), T);
    expect(balance(dustShine(plain, T))).toBe(balance(plain));
  });
  it('окупается за 6 дней, если дотирать все витрины дня', () => {
    expect(polishPaybackDays()).toBe(6);
  });
});
