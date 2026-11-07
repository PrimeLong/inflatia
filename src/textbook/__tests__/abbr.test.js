/* Сокращения в главах учебника — с расшифровкой при первом появлении в главе (docs/mechanics.md):
   жалоба «вводишь новые аббревиатуры — вводи и расшифровку». */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ABBR, NOT_ABBR, abbrEn } from '../abbr.js';
import { SYMBOLS, formulaSymbols } from '../symbols.js';

const DIR = path.resolve(__dirname, '../chapters');
const chapters = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
// строки-заголовки блоков (:::ex news headline="…") — не текст главы: заголовки газет пишут капслоком
const prose = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter((l) => !l.trimStart().startsWith(':::')).join('\n');
const TOKEN = /(?<![A-Za-zА-Яа-яЁё\\{])([A-Z]{2,5}|[А-ЯЁ]{2,5})(?:_\{?[A-Za-z]+\}?)?(?![A-Za-zА-Яа-яЁё])/g;
const CYR = new Set(Object.keys(ABBR).filter((k) => /[А-ЯЁ]/.test(k)));
const WINDOW = 240;

function firstUses(text) {
  const out = new Map();
  for (const m of text.matchAll(TOKEN)) {
    const t = m[1];
    if (out.has(t) || NOT_ABBR.has(t)) continue;
    if (/[А-ЯЁ]/.test(t) && !CYR.has(t)) continue; // русские слова капслоком (в цитатах газет) — не сокращения
    out.set(t, m.index);
  }
  return out;
}

describe('сокращения в учебнике — с расшифровкой', () => {
  it('у каждого латинского сокращения в главах есть расшифровка в src/textbook/abbr.js', () => {
    const unknown = [];
    chapters.forEach((f) => firstUses(prose(f)).forEach((_, t) => { if (!ABBR[t]) unknown.push(`${f}: ${t}`); }));
    expect(unknown).toEqual([]);
  });
  chapters.forEach((f) => {
    it(`${f}: при первом появлении сокращения расшифровка рядом`, () => {
      const text = prose(f);
      const bad = [];
      firstUses(text).forEach((at, t) => {
        if (!ABBR[t]) return;
        const near = text.slice(Math.max(0, at - WINDOW), at + WINDOW);
        if (!ABBR[t].near.test(near)) bad.push(`${t}: …${text.slice(Math.max(0, at - 60), at + 40).replace(/\n/g, ' ')}…`);
      });
      expect(bad).toEqual([]);
    });
  });

  /* английская расшифровка латинского сокращения в скобках (пункт владельца 08.11: «AP — аббревиатура на английском»):
     у каждого латинского сокращения она есть и сама встаёт в строку обозначений под формулой */
  it('у каждого латинского сокращения — английская расшифровка; в строке обозначений она в скобках', () => {
    Object.keys(ABBR).filter((k) => /^[A-Z]+$/.test(k)).forEach((k) => expect(ABBR[k].en, k).toMatch(/^[a-z][a-z –-]+$/));
    const missing = [];
    Object.entries(SYMBOLS).forEach(([ch, map]) => Object.keys(map).forEach((key) => {
      const m = /^([A-Z]{2,5})(?:_|$)/.exec(key);
      const en = m && abbrEn(m[1], ch);
      if (!en) return;
      const found = formulaSymbols(key, ch).find((x) => x.key === key);
      if (!found || !found.text.includes(`(${en})`)) missing.push(`${ch}: ${key} — ${found ? found.text : 'не найдено'}`);
    }));
    expect(missing).toEqual([]);
    expect(formulaSymbols('AP_L = Q/L', 'production')[0].text).toBe('средний продукт труда (average product): выпуск на одного работника');
  });
  it('«Завод»: при первом появлении латинского сокращения в тексте главы — и английская расшифровка', () => {
    const text = prose('production.md');
    const bad = [];
    firstUses(text).forEach((at, t) => {
      const en = abbrEn(t, 'production');
      if (en && !text.slice(Math.max(0, at - WINDOW), at + WINDOW).toLowerCase().includes(en)) bad.push(t);
    });
    expect(bad).toEqual([]);
  });
});
