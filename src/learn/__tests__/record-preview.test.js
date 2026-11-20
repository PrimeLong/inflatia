/* Фрагмент пластинки (пункты владельца 20.11, п. 3–5): загрузка видна, переключение пластинок не будит проигрыватель,
   сбой не молчит. src/learn/record-preview.js */
import { describe, it, expect } from 'vitest';
import { createPreview } from '../record-preview.js';

function fakeAudio() {
  const ls = {}; let res; let rej;
  const a = {
    url: '', paused: true,
    addEventListener: (k, f) => { (ls[k] = ls[k] || new Set()).add(f); },
    removeEventListener: (k, f) => { if (ls[k]) ls[k].delete(f); },
    emit: (k) => [...(ls[k] || [])].forEach((f) => f()),
    play: () => new Promise((r, j) => { res = r; rej = j; }),
    pause: () => { a.paused = true; a.emit('pause'); },
    load: () => { a.paused = false; res(); a.emit('playing'); },
    reject: () => rej(new Error('NotAllowedError')),
  };
  return a;
}
function setup() {
  const made = []; const log = [];
  const timers = [];
  const music = { on: true, playing: () => music.on, pause: () => { music.on = false; log.push('pause'); }, resume: () => { music.on = true; log.push('resume'); } };
  const p = createPreview({ make: (url) => { const a = fakeAudio(); a.url = url; made.push(a); return a; }, music,
    setTimer: (f, ms) => { const t = { f, ms, live: true }; timers.push(t); return t; }, clearTimer: (t) => { if (t) t.live = false; }, now: () => 1000 });
  const fire = (ms) => timers.filter((t) => t.live && t.ms === ms).forEach((t) => { t.live = false; t.f(); });
  return { p, made, log, music, fire };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('фрагмент пластинки', () => {
  it('сразу после касания — «грузится», после загрузки — «играет»; проигрыватель на паузе', async () => {
    const { p, made, log } = setup();
    p.play('rec-a', '/music/a.mp3');
    expect(p.get()).toMatchObject({ id: 'rec-a', status: 'loading' });
    expect(log).toEqual(['pause']);
    made[0].load(); await flush();
    expect(p.get()).toMatchObject({ id: 'rec-a', status: 'playing', startedAt: 1000 });
  });
  it('вторая пластинка во время первой: первая молчит, проигрыватель так и на паузе; после второй — продолжает', async () => {
    const { p, made, log, music } = setup();
    p.play('rec-a', '/a'); made[0].load(); await flush();
    p.play('rec-b', '/b');
    expect(made[0].paused).toBe(true);
    expect(music.on).toBe(false);
    expect(log).toEqual(['pause']);
    expect(p.get()).toMatchObject({ id: 'rec-b', status: 'loading' });
    made[1].load(); await flush();
    p.play('rec-b', '/b');
    expect(p.get().status).toBe('idle');
    expect(log).toEqual(['pause', 'resume']);
  });
  it('20 секунд — и стоп, проигрыватель продолжает', async () => {
    const { p, made, log, fire } = setup();
    p.play('rec-a', '/a'); made[0].load(); await flush();
    fire(20000);
    expect(p.get().status).toBe('idle');
    expect(log).toEqual(['pause', 'resume']);
  });
  it('музыка не играла — фрагмент всё равно звучит и ничего не включает после', async () => {
    const { p, made, log, music } = setup();
    music.on = false;
    p.play('rec-a', '/a'); made[0].load(); await flush();
    expect(p.get().status).toBe('playing');
    p.stop();
    expect(log).toEqual([]);
  });
  it('не включилась (отказ браузера или долгая загрузка) — видно, что не вышло; проигрыватель возвращается', async () => {
    const { p, made, log, fire } = setup();
    p.play('rec-a', '/a'); made[0].reject(); await flush();
    expect(p.get()).toMatchObject({ status: 'idle', failed: 'rec-a' });
    expect(log).toEqual(['pause', 'resume']);
    p.play('rec-b', '/b'); fire(15000);
    expect(p.get()).toMatchObject({ status: 'idle', failed: 'rec-b' });
  });
  it('ушли с витрины — фрагмент этой пластинки стоп, чужой — нет', async () => {
    const { p, made } = setup();
    p.play('rec-a', '/a'); made[0].load(); await flush();
    p.leave('rec-b'); expect(p.get().status).toBe('playing');
    p.leave('rec-a'); expect(p.get().status).toBe('idle');
  });
});
