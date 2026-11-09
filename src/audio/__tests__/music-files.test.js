// Музыка: записи вместо синтеза (docs/mechanics.md, «Музыка: записи вместо синтеза»)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAudioEngine } from '../engine.js';
import { MOOD_PLAYLISTS } from '../tracks.js';
import { listMusicFiles } from '../../../scripts/voice-files-plugin.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/* Поддельный AudioContext: любой узел умеет connect/start/stop, любое неизвестное поле — AudioParam.
   Считаем осцилляторы (ноты синтеза) и источники-буферы (записи). */
function fakeContext() {
  const log = { osc: 0, sources: [], decoded: 0 };
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, setValueCurveAtTime() {} });
  const node = (extra = {}) => new Proxy({ connect() {}, disconnect() {}, start() {}, stop() {}, ...extra }, {
    get(t, k) { if (k in t) return t[k]; if (typeof k === 'string' && k !== 'then') { t[k] = param(); return t[k]; } return undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
  const ctx = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: node(), resume() {},
    createGain: () => node(), createBiquadFilter: () => node(), createDynamicsCompressor: () => node(), createConvolver: () => node(),
    createDelay: () => node(), createStereoPanner: () => node(), createWaveShaper: () => node(), createChannelMerger: () => node(), createChannelSplitter: () => node(),
    createOscillator: () => { log.osc += 1; return node({ setPeriodicWave() {} }); },
    createPeriodicWave: () => ({}),
    createBuffer: (ch, len) => ({ duration: len / 8000, getChannelData: () => new Float32Array(len), numberOfChannels: ch, length: len }),
    createBufferSource: () => { const src = node({ started: null, stopped: null }); src.start = (at) => { src.started = at; }; src.stop = (at) => { src.stopped = at; }; log.sources.push(src); return src; },
    decodeAudioData: () => { log.decoded += 1; return Promise.resolve({ duration: 30, length: 30 * 8000 }); },
  };
  return { ctx, log };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => { vi.useRealTimers(); });

describe('записи вместо синтеза', () => {
  it('файлы — из public/music: только .mp3, id маленькими буквами', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-'));
    ['Dawn.mp3', 'cabinet.mp3', 'notes.txt', '.gitkeep'].forEach((f) => fs.writeFileSync(path.join(dir, f), ''));
    expect(listMusicFiles(dir)).toEqual(['cabinet', 'dawn']);
    expect(listMusicFiles(path.join(dir, 'нет такой папки'))).toEqual([]);
  });

  it('пьеса с записью играет файл, секвенсор молчит; запись доиграла — следующая пьеса синтезом', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = fakeContext();
    const urls = [];
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn'], fetchMusic: async (url) => { urls.push(url); return new ArrayBuffer(8); } });
    expect(a.nowPlaying().id).toBe('dawn');
    // выбрали пьесу в панели — музыка включается с неё
    a.playTrack('dawn');
    vi.advanceTimersByTime(120);
    await flush(); await flush();
    expect(urls).toEqual(['/music/dawn.mp3']);
    expect(log.sources).toHaveLength(1);
    expect(a.nowPlaying().file).toBe(true);
    expect(a.playlist().find((x) => x.id === 'dawn').file).toBe(true);
    expect(a.playlist().find((x) => x.id === 'cabinet').file).toBe(false);
    // запись звучит 10 секунд — ни одной ноты синтеза
    const osc0 = log.osc;
    for (let k = 0; k < 80; k += 1) { ctx.currentTime += 0.125; vi.advanceTimersByTime(120); }
    expect(log.osc).toBe(osc0);
    // запись (30 с) доиграла — следующая пьеса плейлиста, она без записи: снова синтез
    for (let k = 0; k < 200; k += 1) { ctx.currentTime += 0.125; vi.advanceTimersByTime(120); }
    const list = MOOD_PLAYLISTS.calm;
    expect(a.nowPlaying().id).toBe(list[(list.indexOf('dawn') + 1) % list.length]);
    expect(a.nowPlaying().file).toBe(false);
    expect(log.osc).toBeGreaterThan(osc0);
    expect(log.sources[0].stopped).not.toBeNull();
    a.stopMusic();
  });

  it('файл не загрузился — та же пьеса синтезом; выключили музыку — запись остановлена', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = fakeContext();
    const broken = createAudioEngine({ context: ctx, musicFiles: ['dawn'], fetchMusic: async () => { throw new Error('404'); } });
    broken.startMusic();
    vi.advanceTimersByTime(120);
    await flush(); await flush();
    for (let k = 0; k < 20; k += 1) { ctx.currentTime += 0.125; vi.advanceTimersByTime(120); }
    expect(broken.nowPlaying().id).toBe('dawn');
    expect(broken.nowPlaying().file).toBe(false);
    expect(log.osc).toBeGreaterThan(0);
    broken.stopMusic();

    const two = fakeContext();
    const ok = createAudioEngine({ context: two.ctx, musicFiles: ['dawn'], fetchMusic: async () => new ArrayBuffer(8) });
    ok.startMusic();
    vi.advanceTimersByTime(120);
    await flush(); await flush();
    expect(ok.nowPlaying().file).toBe(true);
    ok.stopMusic();
    expect(two.log.sources[0].stopped).not.toBeNull();
    expect(ok.nowPlaying().file).toBe(false);
    // включили снова — запись с начала (новый источник)
    ok.startMusic();
    vi.advanceTimersByTime(120);
    await flush(); await flush();
    expect(two.log.sources).toHaveLength(2);
    expect(ok.nowPlaying().file).toBe(true);
    ok.stopMusic();
  });

  it('офлайн-замер громкости — всегда синтез, даже если запись лежит', () => {
    const { ctx } = fakeContext();
    const a = createAudioEngine({ context: ctx });
    expect(a.playlist().every((x) => x.file === false)).toBe(true);
  });
});
