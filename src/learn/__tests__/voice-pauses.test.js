import { describe, it, expect } from 'vitest';
import { keepSegments, PAUSE_MAX } from '../../../scripts/voice-normalize.mjs';

/* Жалоба mvrvhtya: после озвучки — шум, субтитры отстают. Сервис озвучки вставил в три сюжета эфира
   по 73 секунды шипения между фразами; npm run voice:normalize теперь вырезает паузы длиннее PAUSE_MAX. */
describe('паузы в записях эфира (scripts/voice-normalize.mjs)', () => {
  it('длинная пауза посреди сюжета сжимается до полсекунды: речь до и после остаётся', () => {
    expect(PAUSE_MAX).toBe(2);
    expect(keepSegments([[8.57, 81.67]])).toEqual([[0, 8.82], [81.42, Infinity]]);
  });
  it('пауза в конце записи (без конца тишины) — срезается, остаётся четверть секунды', () => {
    expect(keepSegments([[10, Infinity]])).toEqual([[0, 10.25]]);
  });
  it('несколько пауз — отрезки речи по порядку, без наложений', () => {
    const segs = keepSegments([[3, 6], [9, 20]]);
    expect(segs).toEqual([[0, 3.25], [5.75, 9.25], [19.75, Infinity]]);
    segs.slice(1).forEach(([a], k) => expect(a).toBeGreaterThanOrEqual(segs[k][1]));
  });
});
