/* Сокращения в главах учебника — с расшифровкой при первом появлении в главе (docs/mechanics.md):
   жалоба «вводишь новые аббревиатуры — вводи и расшифровку». */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ABBR, NOT_ABBR } from '../abbr.js';

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
});
