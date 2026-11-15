import { describe, it, expect } from 'vitest';
import { newGlide, glideAt, glideDecay, glideKeep, GLIDE } from '../glide.js';

describe('подписи графика не прыгают (пункт владельца 15.11)', () => {
  it('обычное движение — без задержки; скачок места — подпись остаётся и доезжает плавно', () => {
    const g = newGlide();
    expect(glideAt(g, 'D', 100, 50)).toEqual({ x: 100, y: 50 });
    // едет вместе с кривой: мельче порога — ровно туда, куда ставит расчёт
    expect(glideAt(g, 'D', 106, 47)).toEqual({ x: 106, y: 47 });
    // расчёт перекинул подпись на другой край (на 80 px) — на экране она пока там же
    const a = glideAt(g, 'D', 186, 47);
    expect(a).toEqual({ x: 106, y: 47 });
    // и за несколько кадров доезжает, ни разу не шагнув больше чем на треть пути
    let prev = a.x; let frames = 0; let live = true;
    while (live && frames < 100) {
      live = glideDecay(g, 16); const p = glideAt(g, 'D', 186, 47);
      expect(p.x).toBeGreaterThanOrEqual(prev); expect(p.x - prev).toBeLessThan(80 / 3);
      prev = p.x; frames += 1;
    }
    expect(prev).toBe(186);
    expect(frames).toBeGreaterThan(8); expect(frames).toBeLessThan(60);
  });
  it('скачок посреди движения: рисованное место непрерывно', () => {
    const g = newGlide(); let shown = glideAt(g, 'MR', 0, 0); let max = 0;
    for (let f = 1; f <= 60; f += 1) {
      glideDecay(g, 16);
      const x = f * 3 + (f > 20 ? 40 : 0) - (f > 40 ? 70 : 0); // два разрыва по пути
      const p = glideAt(g, 'MR', x, 10);
      max = Math.max(max, Math.abs(p.x - shown.x)); shown = p;
    }
    expect(max).toBeLessThan(GLIDE.jump + 4);
  });
  it('пропавшая подпись забывается: появится — встанет на место сразу', () => {
    const g = newGlide(); glideAt(g, 'E', 10, 10); glideAt(g, 'E', 200, 10);
    glideKeep(g, []);
    expect(glideAt(g, 'E', 300, 300)).toEqual({ x: 300, y: 300 });
    expect(glideDecay(g, 16)).toBe(false);
  });
});
