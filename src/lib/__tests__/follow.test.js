import { describe, it, expect } from 'vitest';
import { followStep } from '../follow.js';

const run = (targetAt, frames, dt = 16) => {
  let cur = { x: 0 }; let vel = null; const seen = [];
  for (let f = 1; f <= frames; f += 1) { const r = followStep(cur, { x: targetAt(f) }, dt, { x: 100 }, vel); cur = r.values; vel = r.vel; seen.push(cur.x); if (r.done && f > 1) break; }
  return seen;
};
const speeds = (seen) => seen.map((v, k) => (k ? v - seen[k - 1] : v));

describe('график идёт за ползунком без рывков (пункт владельца 15.11)', () => {
  it('к новой цели: плавный разгон, без перелёта, останавливается ровно на цели примерно за треть секунды', () => {
    const seen = run(() => 100, 200);
    expect(seen[seen.length - 1]).toBe(100);
    expect(seen.length).toBeGreaterThan(12); expect(seen.length).toBeLessThan(40);
    seen.forEach((v, k) => { expect(v).toBeLessThanOrEqual(100); if (k) expect(v).toBeGreaterThanOrEqual(seen[k - 1]); });
    // первый кадр — не рывок: прежний переход проходил за первый кадр 14% пути
    expect(seen[0]).toBeLessThan(6);
  });
  it('ползунок идёт шагами (раз в 80 мс) — скорость сцены меняется плавно, без «рывок — стоп»', () => {
    // цель прыгает на 10 каждые пять кадров
    const seen = run((f) => Math.ceil(f / 5) * 10, 60);
    const v = speeds(seen).slice(15);
    // сцена не останавливается между шагами…
    expect(Math.min(...v)).toBeGreaterThan(0.8);
    // …и скорость от кадра к кадру меняется понемногу (у прежнего перехода — скачком в несколько раз)
    const dv = v.map((x, k) => (k ? Math.abs(x - v[k - 1]) : 0));
    expect(Math.max(...dv)).toBeLessThan(0.9);
  });
  it('цель меняется на каждом кадре (быстрый ползунок) — сцена едет ровно и отстаёт ограниченно', () => {
    const seen = run((f) => f * 10, 30);
    seen.forEach((x, k) => { if (k) expect(x).toBeGreaterThan(seen[k - 1]); });
    expect(300 - seen[29]).toBeLessThan(70);
  });
  it('переключатели и новые ключи — сразу; долгий кадр не даёт перелёта', () => {
    const r = followStep({ x: 0, on: false }, { x: 10, on: true, y: 5 }, 5000);
    expect(r.values.on).toBe(true); expect(r.values.y).toBe(5);
    expect(r.values.x).toBeGreaterThan(0); expect(r.values.x).toBeLessThan(10);
    expect(followStep({ x: 9.999 }, { x: 10 }, 16, { x: 100 })).toEqual({ values: { x: 10 }, vel: {}, done: true });
  });
});
