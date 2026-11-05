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

describe('гравюры зданий стоят на земле (марка Порта была сломанной: склад висел над землёй)', () => {
  it('ничего прямоугольного ниже земли (y = 82); склад Порта стоит на земле, а не висит над ней', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Engraving } = await import('../../ds-art.jsx');
    ['market', 'fair', 'workshop', 'bakery', 'bank', 'exchange', 'ministry', 'port', 'store', 'factory', 'tower'].forEach((kind) => {
      [false, true].forEach((alive) => {
        const svg = renderToStaticMarkup(React.createElement(Engraving, { kind, alive }));
        const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => ({ y: +m[2], w: +m[3], h: +m[4] }));
        if (kind === 'port') {
          const main = rects.reduce((a, r) => (r.w * r.h > a.w * a.h ? r : a), { w: 0, h: 0, y: 0 });
          expect(main.y + main.h, `склад${alive ? ' жив' : ''}`).toBe(82);
        }
        // ничего прямоугольного ниже земли
        rects.forEach((r) => expect(r.y + r.h, kind).toBeLessThanOrEqual(82.5));
      });
    });
  });
});

describe('марки месяцев: цвета насыщенные (ноябрь выглядел чёрным)', () => {
  it('у каждого месяца насыщенность по HSL не ниже 0,32 — тёмный серо-синий и приглушённый индиго не проходят', async () => {
    const { MONTH_ART } = await import('../../award-art.js');
    const sat = (hex) => {
      const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
      return max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
    };
    MONTH_ART.forEach(([, color], k) => expect(sat(color), `месяц ${k + 1}: ${color}`).toBeGreaterThanOrEqual(0.32));
    // прежние цвета ноября проверку не прошли бы
    expect(sat('#5B5DA6')).toBeLessThan(0.32);
    expect(sat('#5A6E8C')).toBeLessThan(0.32);
  });
});
