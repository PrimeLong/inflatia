import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NBSP, ruNum, ruSigned, ruUnit, ruPct, withUnit, ruDots } from '../num.js';
import { fmt1, fmt2, fmtSigned1, fmtMoney, fmtIndex, fmtMln, pctFmt, makeInitialEconomy, defaultDecisions, simulateQuarter, botCentralBank, botFinanceMinistry } from '../engine.js';

/* Числа «Мира» по-русски (docs/mechanics.md, «Числа в „Мире“»; пункт владельца 13.11): запятая и неразрывный пробел
   перед единицей — из одного форматтера. Раньше на экране партии стояло «4.1». */
describe('числа по-русски: один форматтер', () => {
  it('запятая вместо точки, знак, проценты, не число — тире', () => {
    expect(ruNum(4.1)).toBe('4,1');
    expect(ruNum(4.126, 2)).toBe('4,13');
    expect(ruNum(7, 0)).toBe('7');
    expect(ruNum(-0.25, 2)).toBe('-0,25');
    expect(ruNum(NaN)).toBe('—');
    expect(ruSigned(0.3)).toBe('+0,3');
    expect(ruSigned(-0.3)).toBe('-0,3');
    expect(ruPct(4.1)).toBe('4,1%');
    expect(ruDots('ставка 4.25%, курс 1.5')).toBe('ставка 4,25%, курс 1,5');
  });
  it('единица — через неразрывный пробел', () => {
    expect(NBSP).toBe('\u00a0');
    expect(ruUnit(12.5, 2, 'млрд')).toBe('12,50\u00a0млрд');
    expect(withUnit('3,2', 'п. п.')).toBe('3,2\u00a0п. п.');
    expect(withUnit('3,2', '')).toBe('3,2');
  });
  it('форматтеры движка — на нём же: ни одной десятичной точки', () => {
    const out = [fmt1(4.1), fmt2(4.126), fmtSigned1(0.3), pctFmt(4.1), fmtMoney(512.4), fmtMoney(1500), fmtMoney(6512258680), fmtIndex(1234.5), fmtIndex(54321.9),
      fmtIndex(8374980.7), fmtMln(6.5), fmtMln(6118.42), fmtMln(2_500_000)];
    out.forEach((t) => expect(t, t).not.toMatch(/\d\.\d/));
    expect(fmtMoney(512.4)).toBe('512\u00a0млрд');
    expect(fmtIndex(54321.9)).toBe('54,3\u00a0тыс.');
  });
  it('тексты квартала (новости, сводки ведомств, хроника) — без чисел вида «4.1»', () => {
    let economy = makeInitialEconomy();
    let pendingImpulses = []; let eventCooldowns = {}; let stories = [];
    const bad = [];
    const walk = (v, path) => {
      if (typeof v === 'string') { if (/\d\.\d/.test(v) && /[а-яё]/i.test(v)) bad.push(`${path}: ${v.slice(0, 140)}`); return; }
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k], `${path}.${k}`));
    };
    for (let q = 1; q <= 16; q += 1) {
      const cbAct = botCentralBank(economy, 'pragmatic', 'medium');
      const mofAct = botFinanceMinistry(economy, 'technocrat', 'medium');
      walk([cbAct.note, cbAct.newsHeadline, cbAct.publicHeadline, cbAct.publicNote, mofAct.note, mofAct.newsHeadline, mofAct.publicHeadline, mofAct.publicNote], `q${q}.ведомства`);
      const res = simulateQuarter({ economy, decisions: { ...defaultDecisions(economy), ...cbAct.decisions, ...mofAct.decisions }, pendingImpulses, eventCooldowns,
        difficulty: 'medium', quarterIndex: q, stories, botAction: cbAct, botActions: [mofAct] });
      // тексты квартала: всё, кроме самого состояния экономики (там числа — числа)
      Object.keys(res).filter((k) => k !== 'economy').forEach((k) => walk(res[k], `q${q}.${k}`));
      ({ economy, pendingImpulses, eventCooldowns, stories } = { economy: res.economy, pendingImpulses: res.pendingImpulses || [], eventCooldowns: res.eventCooldowns || {}, stories: res.stories || [] });
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
  it('в файлах «Мира» число на экран не собирают через toFixed с дробной частью — только через форматтер', () => {
    // координаты SVG, CSS и округления чисел — можно; строки, помеченные «не текст», — тоже
    const files = ['game.jsx', 'tycoon.jsx', 'trading.jsx', 'countrymap.jsx', 'tutorial.jsx', 'lib/content/news.js', 'lib/engine.js'];
    const left = [];
    files.forEach((f) => {
      readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
        if (!/\.toFixed\((?!0\))/.test(line)) return;
        // не текст: путь или атрибут SVG, значение CSS, число (+x.toFixed), комментарий
        if (/`M\$|[ML]\$\{|strokeDasharray|px`|s`|rgba\(|'--p'|\+\(|Number\(|\/\/|,\$\{y\.toFixed/.test(line)) return;
        left.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    });
    expect(left).toEqual([]);
  });
});
