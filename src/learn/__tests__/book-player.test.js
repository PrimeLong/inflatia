/* Книга по отрывкам (docs/mechanics.md, «Профиль»): запись каждого отрывка — свой файл, проигрыватель играет
   их друг за другом, перемотка — по всей книге; текст для озвучки — по отрывку; список записей видит и
   папки книг. Плюс: книга звучит, когда читалку закрыли — проигрыватель один на всё приложение. */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BOOKS, BOOK_BY_ID, bookSpeech, speechScript, passageScript, speechSeconds } from '../shelf.js';
import { listBookAudio } from '../../../scripts/voice-files-plugin.js';
import { bookPlayer, getState, viewOf, resetBookPlayer, passageTracks, audioMode, canSetVolume, clampVolume } from '../book-player.js';

// подмена проигрывателя: запоминает адреса; длина каждой записи — 100 с
class FakeTape {
  constructor() { this.src = ''; this.currentTime = 0; this.duration = 0; this.playbackRate = 1; this.paused = true; FakeTape.last = this; }
  pause() { this.paused = true; }
  play() { FakeTape.played.push(this.src.replace(/^.*\/books\//, '')); this.duration = 100; this.paused = false; return Promise.resolve(); }
}
FakeTape.played = [];

describe('книга по отрывкам', () => {
  beforeEach(() => {
    // браузер — подменой: автотест (webdriver) с флагом «записан каждый отрывок», хранилище в памяти
    const m = new Map();
    globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { webdriver: true } });
    globalThis.window = globalThis;
    localStorage.setItem('ems-book-audio-test', '2');
    globalThis.Audio = FakeTape; FakeTape.played = [];
    resetBookPlayer();
  });

  it('текст отрывка — его название и абзацы, у первого ещё вступление; отрывки вместе — вся книга', () => {
    for (const b of BOOKS) {
      const whole = speechScript(b);
      const joined = b.passages.map((p) => passageScript(b, p.id)).join('\n\n');
      expect(joined).toBe(whole);
      expect(passageScript(b, b.passages[0].id)).toMatch(/Год издания/);
      if (b.passages[1]) expect(passageScript(b, b.passages[1].id)).not.toMatch(/Год издания/);
    }
  });

  it('список записей видит папки книг: smith-wealth/pins рядом с записью целиком', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'books-'));
    fs.writeFileSync(path.join(dir, 'smith-wealth.mp3'), '');
    fs.mkdirSync(path.join(dir, 'smith-wealth'));
    fs.writeFileSync(path.join(dir, 'smith-wealth', 'pins.mp3'), '');
    fs.writeFileSync(path.join(dir, 'smith-wealth', 'notes.txt'), '');
    expect(listBookAudio(dir)).toEqual(['smith-wealth', 'smith-wealth/pins']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('записаны все отрывки — играют друг за другом; «слушать» у отрывка — его файл; перемотка — по всей книге', () => {
    const b = BOOK_BY_ID['smith-wealth']; const parts = bookSpeech(b); const est = speechSeconds(b);
    expect(audioMode(b)).toBe('parts');
    expect(passageTracks(b).map((t) => t.url)).toEqual(b.passages.map((p) => `/books/smith-wealth/${p.id}.mp3`));
    bookPlayer.play(b, parts, est, 0);
    expect(FakeTape.played).toEqual(['smith-wealth/pins.mp3']);
    // отрывок кончился — следующий
    FakeTape.last.onended();
    expect(FakeTape.played).toEqual(['smith-wealth/pins.mp3', 'smith-wealth/butcher.mp3']);
    expect(getState().track).toBe(1);
    // «слушать» у последнего — сразу его файл; кончился — книга дослушана
    bookPlayer.playFrom(b, parts, est, 'taxes');
    expect(FakeTape.played.at(-1)).toBe('smith-wealth/taxes.mp3');
    expect(viewOf(getState(), b, parts, est).now).toBe('taxes');
    FakeTape.last.onended();
    expect(getState().playing).toBe(false);
    expect(getState().at).toBe(0);
    // перемотка на середину книги — в отрывок, где эта середина, и на секунду внутри него
    bookPlayer.play(b, parts, est, 0);
    bookPlayer.seek(b, parts, est, 0.5);
    const s = getState();
    const durs = s.tracks.map((t) => t.dur || t.est);
    const before = durs.slice(0, s.track).reduce((a, d) => a + d, 0);
    expect(before).toBeLessThanOrEqual(0.5 * s.dur + 1e-6);
    expect(before + durs[s.track]).toBeGreaterThan(0.5 * s.dur);
    expect(FakeTape.last.src).toMatch(new RegExp(`/books/smith-wealth/${s.tracks[s.track].passage}\\.mp3$`));
  });

  it('проигрыватель один на всё приложение: звук не зависит от экрана; другая книга ставит прежнюю на паузу', () => {
    const smith = BOOK_BY_ID['smith-wealth']; const ricardo = BOOK_BY_ID['ricardo-principles'];
    bookPlayer.play(smith, bookSpeech(smith), speechSeconds(smith), 0.3);
    expect(getState()).toMatchObject({ id: 'smith-wealth', playing: true, started: true });
    const tape = FakeTape.last;
    bookPlayer.play(ricardo, bookSpeech(ricardo), speechSeconds(ricardo), 0);
    expect(tape.paused).toBe(true);
    expect(getState().id).toBe('ricardo-principles');
    // место прежней книги запомнено — её проигрыватель покажет «где остановились»
    expect(viewOf(getState(), smith, bookSpeech(smith), speechSeconds(smith)).at).toBeCloseTo(0.3, 2);
    // «×» — тишина, проигрыватель над вкладками уходит
    bookPlayer.stop();
    expect(getState()).toMatchObject({ playing: false, started: false });
  });

  it('записаны не все отрывки — играет запись целиком, если она есть', () => {
    localStorage.setItem('ems-book-audio-test', '1');
    const b = BOOK_BY_ID['smith-wealth'];
    expect(audioMode(b)).toBe('file');
    bookPlayer.play(b, bookSpeech(b), speechSeconds(b), 0);
    expect(FakeTape.played).toEqual(['smith-wealth.mp3']);
  });
});

describe('громкость книги (docs/mechanics.md, «Книжная полка»)', () => {
  const book = () => BOOK_BY_ID['smith-wealth'];
  beforeEach(() => {
    const m = new Map();
    globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { webdriver: true } });
    globalThis.window = globalThis;
    localStorage.setItem('ems-book-audio-test', '2');
    globalThis.Audio = FakeTape; FakeTape.played = [];
    resetBookPlayer();
  });
  it('ползунок двигает громкость записи, она в пределах 0…1 и запоминается на устройстве', async () => {
    const b = book(); const parts = bookSpeech(b);
    bookPlayer.play(b, parts, speechSeconds(b), 0);
    expect(getState().volume).toBe(1);
    bookPlayer.setVolume(0.4);
    expect(getState().volume).toBe(0.4);
    expect(FakeTape.last.volume).toBe(0.4);
    expect(localStorage.getItem('ems-book-volume')).toBe('0.4');
    bookPlayer.setVolume(7); expect(getState().volume).toBe(1);
    bookPlayer.setVolume(-1); expect(getState().volume).toBe(0);
    expect(clampVolume('x')).toBe(1);
    // новая сессия — та же громкость; новая дорожка получает её сразу
    localStorage.setItem('ems-book-volume', '0.3');
    resetBookPlayer();
    expect(getState().volume).toBe(0.3);
    bookPlayer.play(b, parts, speechSeconds(b), 0.5);
    expect(FakeTape.last.volume).toBe(0.3);
  });
  it('там, где страница громкость не меняет (iPhone), ползунка нет', () => {
    class IosTape extends FakeTape { set volume(v) { this.v = v; } get volume() { return 1; } }
    globalThis.Audio = IosTape; resetBookPlayer();
    expect(canSetVolume()).toBe(false);
    globalThis.Audio = FakeTape; resetBookPlayer();
    expect(canSetVolume()).toBe(true);
  });
});
