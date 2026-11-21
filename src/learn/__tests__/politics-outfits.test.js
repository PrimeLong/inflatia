/* Политические аксессуары Инфли (пункт владельца 21.11, п. 9: «нужны новые аксессуары, какие-нибудь политические»).
   Вымышленный Велеград: без флагов, гербов и партий настоящих стран. src/learn/rewards.js, src/mascot.jsx */
import { describe, it, expect } from 'vitest';
import { OUTFITS, OUTFIT_BY_ID, RATE_MAX } from '../rewards.js';
import { OUTFIT_IDS } from '../../mascot.jsx';

const POLITICS = ['laurel', 'boater', 'rosette', 'sash', 'mayorchain', 'ballot', 'megaphone', 'gavel'];
describe('политические аксессуары', () => {
  it('восемь вещей на голову, шею и в руку, у каждой — рисунок', () => {
    POLITICS.forEach((id) => {
      expect(OUTFIT_BY_ID[id], id).toBeTruthy();
      expect(['head', 'neck', 'hand']).toContain(OUTFIT_BY_ID[id].slot);
      expect(OUTFIT_IDS, id).toContain(id);
    });
    // одна редкая — у ювелира
    expect(POLITICS.filter((id) => OUTFIT_BY_ID[id].rare)).toEqual(['mayorchain']);
  });
  it('у каждой вещи Инфли из лавки есть рисунок', () => {
    OUTFITS.filter((o) => ['head', 'face', 'neck', 'hand', 'frame'].includes(o.slot)).forEach((o) => expect(OUTFIT_IDS, o.id).toContain(o.id));
  });
  it('цены — по шкале обычных вещей: обычные дешевле самой дорогой обычной, редкая — как редкие', () => {
    const commonMax = Math.max(...OUTFITS.filter((o) => !o.rare && ['head', 'face', 'neck', 'hand'].includes(o.slot) && !POLITICS.includes(o.id)).map((o) => o.crowns));
    POLITICS.filter((id) => !OUTFIT_BY_ID[id].rare).forEach((id) => expect(OUTFIT_BY_ID[id].crowns).toBeLessThanOrEqual(commonMax));
    expect(OUTFIT_BY_ID.mayorchain.crowns * RATE_MAX).toBeGreaterThan(800);
  });
});
