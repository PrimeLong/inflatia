/* Замечание владельца 18.11, вечер, п. 11: «у меня написано политический капитал 29, а сверху 30» — капитал дробный,
   одни места округляли до ближайшего, другие вниз. Теперь везде вниз — одной функцией capitalShown. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { capitalShown } from '../politics/president.js';

describe('политический капитал на экране', () => {
  it('всегда вниз до целого: 29,6 — это 29, не 30; ровные — как есть', () => {
    expect(capitalShown(29.6)).toBe(29);
    expect(capitalShown(29.999999999)).toBe(30);
    expect(capitalShown(30)).toBe(30);
    expect(capitalShown(undefined)).toBe(0);
  });
  it('ни один экран «Мира» и обучения не округляет капитал по-своему', () => {
    for (const f of ['game.jsx', 'tutorial.jsx', 'countrymap.jsx', 'world-menu.jsx']) {
      const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/(Math\.round|Math\.floor)\(\(?(c\.)?(economy|e)\.politicalCapital/);
      expect(src, f).not.toMatch(/politicalCapital[^\n]{0,40}toFixed/);
      expect(src, f).not.toMatch(/капитал \$\{Math\.(round|floor)\(capital/);
    }
  });
});
