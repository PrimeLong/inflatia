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

describe('«Биржа»: график котировок плывёт по кругу без обрыва', async () => {
  const { loopWalk } = await import('../skin-sounds.js');
  it('два одинаковых периода, конец периода сходится с началом, линия в поле', () => {
    [[40, 7, 14], [30, 91, 18]].forEach(([n, seed, amp]) => {
      const pts = loopWalk(n, seed, amp);
      expect(pts.length).toBe(2 * n - 1);
      expect(pts[0][0]).toBe(0);
      expect(pts[pts.length - 1][0]).toBeCloseTo(200, 9);
      expect(pts[0][1]).toBeCloseTo(pts[n - 1][1], 9);
      expect(pts[pts.length - 1][1]).toBeCloseTo(pts[0][1], 9);
      for (let i = 0; i < n; i += 1) { expect(pts[i + n - 1][0]).toBeCloseTo(pts[i][0] + 100, 9); expect(pts[i + n - 1][1]).toBe(pts[i][1]); }
      pts.forEach(([, y]) => { expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(92); });
    });
  });
});
