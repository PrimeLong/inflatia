/* Фаза 4 (5 ноября): правки владельца — чистые функции. */
import { describe, it, expect } from 'vitest';
import { SKIN_SOUNDS, PLAIN_SOUNDS, answerSound } from '../skin-sounds.js';
import { SFX_NAMES } from '../../audio/engine.js';
import { SFX_GAIN_DB } from '../../audio/loudness.js';

describe('темы урока: свои звуки ответа', () => {
  const KEYS = ['exchange', 'mint', 'blueprint', 'aurora'];
  it('у каждой темы два разных звука, свои — не общие и не чужие', () => {
    expect(Object.keys(SKIN_SOUNDS).sort()).toEqual([...KEYS].sort());
    const all = Object.values(SKIN_SOUNDS).flat();
    expect(new Set(all).size).toBe(all.length);
    all.forEach((n) => expect(PLAIN_SOUNDS).not.toContain(n));
  });
  it('звуки есть в движке и выровнены по громкости вместе со звуками ответа', () => {
    Object.values(SKIN_SOUNDS).flat().forEach((n) => {
      expect(SFX_NAMES, n).toContain(n);
      expect(typeof SFX_GAIN_DB[n], n).toBe('number');
      expect(Math.abs(SFX_GAIN_DB[n]), n).toBeLessThanOrEqual(4);
    });
  });
  it('верно и неверно — свои звуки темы; без темы — «монетка» и «вниз»', () => {
    expect(answerSound({ key: 'exchange' }, true)).toBe('ex-up');
    expect(answerSound({ key: 'exchange' }, false)).toBe('ex-down');
    expect(answerSound({ key: 'aurora' }, true)).toBe('au-up');
    expect(answerSound(null, true)).toBe('coin');
    expect(answerSound(null, false)).toBe('down');
  });
});
