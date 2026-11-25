// Музыка: записи вместо синтеза (docs/mechanics.md, «Музыка: записи вместо синтеза»)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAudioEngine, DUCK_LEVEL } from '../engine.js';
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

  it('следующая запись грузится заранее и входит поверх затухающей — без тишины (пункт владельца 15.11)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = fakeContext();
    const list = MOOD_PLAYLISTS.calm; const next = list[(list.indexOf('dawn') + 1) % list.length];
    const urls = [];
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn', next], fetchMusic: async (url) => { urls.push(url); return new ArrayBuffer(8); } });
    a.playTrack('dawn');
    vi.advanceTimersByTime(120);
    await flush(); await flush(); await flush();
    // играет первая — вторая уже скачана и декодируется заранее
    expect(urls).toEqual(['/music/dawn.mp3', `/music/${next}.mp3`]);
    expect(log.decoded).toBe(2);
    const osc0 = log.osc;
    // ведём время к концу записи (30 с): вторая стартует до того, как первая замолчит
    for (let k = 0; k < 260 && log.sources.length < 2; k += 1) { ctx.currentTime += 0.125; vi.advanceTimersByTime(120); }
    expect(log.sources).toHaveLength(2);
    const [first, second] = log.sources;
    expect(a.nowPlaying().id).toBe(next);
    expect(a.nowPlaying().file).toBe(true);
    expect(second.started).toBeLessThan(first.stopped);
    // наложение — секунды, а не мгновение
    expect(first.stopped - second.started).toBeGreaterThan(2);
    // синтез всё это время молчал
    expect(log.osc).toBe(osc0);
    a.stopMusic();
  });

  it('офлайн-замер громкости — всегда синтез, даже если запись лежит', () => {
    const { ctx } = fakeContext();
    const a = createAudioEngine({ context: ctx });
    expect(a.playlist().every((x) => x.file === false)).toBe(true);
  });

  // замечание владельца 18.11, вечер, п. 16: «в „Слушай“ когда воспроизводится запись, музыка должна притихать»
  it('голос поверх музыки: duck(true) уводит музыку к DUCK_LEVEL, duck(false) возвращает; звуки интерфейса не трогает', () => {
    const { ctx } = fakeContext();
    const gains = []; const make = ctx.createGain;
    ctx.createGain = () => { const g = make(); const calls = []; g.gain = { value: 1, setTargetAtTime: (v) => calls.push(v), setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }; g.calls = calls; gains.push(g); return g; };
    const a = createAudioEngine({ context: ctx });
    a.prime(); a.setMusic(true);
    a.duck(true);
    expect(a.ducked).toBe(true);
    const duckNode = gains.find((g) => g.calls.includes(DUCK_LEVEL));
    expect(duckNode, 'узел приглушения').toBeTruthy();
    a.duck(false);
    expect(a.ducked).toBe(false);
    expect(duckNode.calls[duckNode.calls.length - 1]).toBe(1);
    expect(DUCK_LEVEL).toBeGreaterThan(0.1); expect(DUCK_LEVEL).toBeLessThan(0.4);
  });

  // замечание владельца 18.11, вечер: «непонятно, когда песня грузится; пластинка крутится, когда не играет музыка»
  it('пока запись грузится — loading, но не playing; загрузилась — playing; музыка выключена — ни то, ни другое', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx } = fakeContext();
    let release; const gate = new Promise((r) => { release = r; });
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn'], fetchMusic: async () => { await gate; return new ArrayBuffer(8); } });
    expect(a.nowPlaying()).toMatchObject({ playing: false, loading: false });
    a.playTrack('dawn');
    vi.advanceTimersByTime(120); await flush();
    expect(a.nowPlaying()).toMatchObject({ loading: true, playing: false });
    release(); await flush(); await flush(); await flush();
    expect(a.nowPlaying()).toMatchObject({ loading: false, playing: true });
    a.setMusic(false);
    expect(a.nowPlaying()).toMatchObject({ loading: false, playing: false });
  });

  // замечание владельца 18.11, вечер, п. 14: «музыка по режиму экономики не должна так резко переключаться, только в экстренных случаях»
  it('смена режима: спад — через два квартала и после конца пьесы, без обрыва; война и кризис — сразу', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx } = fakeContext();
    const { MOOD_PLAYLISTS } = await import('../tracks.js');
    const a = createAudioEngine({ context: ctx });
    const base = { politicalRegime: 'democracy', inflationRisk: 0, bankingRisk: 0, debtRisk: 0, recessionRisk: 0, gdpGrowth: 2, regime: 'normal' };
    a.prime(); a.setMusic(true); a.setMood(base); a.startMusic();
    vi.advanceTimersByTime(200);
    const calm = a.playlist().map((p) => p.id); const id0 = a.nowPlaying().id;
    // один квартал спада — ничего не меняется
    a.setMood({ ...base, regime: 'recession', recessionRisk: 60, gdpGrowth: -2 });
    vi.advanceTimersByTime(500);
    expect(a.playlist().map((p) => p.id)).toEqual(calm);
    expect(a.nowPlaying().id).toBe(id0);
    // второй квартал подряд — смена назначена, но пьеса доигрывает; «Далее» — уже из нового настроения
    a.setMood({ ...base, regime: 'recession', recessionRisk: 61, gdpGrowth: -2.1 });
    vi.advanceTimersByTime(500);
    expect(a.nowPlaying().id).toBe(id0);
    expect(MOOD_PLAYLISTS.slump).toContain(a.nowPlaying().next);
    // пьеса кончилась (переход к следующей) — играет уже спад
    a.skip(true); vi.advanceTimersByTime(500);
    expect(a.playlist().map((p) => p.id)).toEqual(MOOD_PLAYLISTS.slump);
    // война — сразу: плейлист войны, не дожидаясь конца пьесы
    a.setMood({ ...base, regime: 'war' });
    expect(a.playlist().map((p) => p.id)).toEqual(MOOD_PLAYLISTS.war);
  });
});

/* Поддельный <audio>: canplay — когда тест скажет (набралось несколько секунд), play/pause, позиция и длительность. */
function fakeAudio(log, { duration = 30 } = {}) {
  return () => {
    const ls = {};
    const el = {
      paused: true, currentTime: 0, duration: NaN, preload: '', src: '', played: 0, pausedAt: [],
      addEventListener(type, fn) { (ls[type] = ls[type] || new Set()).add(fn); },
      removeEventListener(type, fn) { if (ls[type]) ls[type].delete(fn); },
      emit(type) { if (type === 'canplay') el.duration = duration; [...(ls[type] || [])].forEach((fn) => fn()); },
      load() {},
      play() { el.paused = false; el.played += 1; return Promise.resolve(); },
      pause() { el.paused = true; el.pausedAt.push(el.currentTime); },
    };
    log.els.push(el);
    return el;
  };
}

describe('записи потоком (пункт владельца 24.11, п. 1: не ждать, пока песня скачается целиком)', () => {
  const streamCtx = () => {
    const { ctx, log } = fakeContext();
    log.els = []; log.mediaNodes = 0;
    ctx.createMediaElementSource = () => { log.mediaNodes += 1; return { connect() {}, disconnect() {} }; };
    return { ctx, log };
  };
  it('играет, как только набралось на старт (canplay): ни fetch целиком, ни декодирования', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = streamCtx();
    const fetched = [];
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn'], createAudioElement: fakeAudio(log), fetchMusic: async (u) => { fetched.push(u); return new ArrayBuffer(8); } });
    a.playTrack('dawn');
    vi.advanceTimersByTime(120); await flush();
    expect(log.els).toHaveLength(1);
    expect(log.els[0].src).toBe('/music/dawn.mp3');
    expect(log.els[0].preload).toBe('auto');
    expect(a.nowPlaying()).toMatchObject({ loading: true, playing: false });
    log.els[0].emit('canplay'); await flush(); await flush();
    expect(fetched).toEqual([]);
    expect(log.decoded).toBe(0);
    expect(log.mediaNodes).toBe(1);
    expect(log.els[0].played).toBe(1);
    expect(a.nowPlaying()).toMatchObject({ loading: false, playing: true, file: true, duration: 30 });
    a.stopMusic();
  });
  it('пауза — элемент на паузе; «играть» — с того же места', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = streamCtx();
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn'], createAudioElement: fakeAudio(log) });
    a.playTrack('dawn'); vi.advanceTimersByTime(120); await flush();
    log.els[0].emit('canplay'); await flush(); await flush();
    for (let k = 0; k < 40; k += 1) { ctx.currentTime += 0.25; log.els[0].currentTime += 0.25; vi.advanceTimersByTime(120); }
    a.stopMusic();
    await new Promise((r) => setTimeout(r, 450));
    expect(log.els[0].paused).toBe(true);
    a.startMusic(); vi.advanceTimersByTime(240); await flush(); await flush();
    // тот же элемент, а не новый: докачанное не качается заново
    expect(log.els).toHaveLength(1);
    expect(log.els[0].currentTime).toBeGreaterThan(5);
    expect(log.els[0].paused).toBe(false);
    a.stopMusic();
  });
  it('следующая пьеса готовится заранее своим элементом и входит поверх затухающей', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = streamCtx();
    const list = MOOD_PLAYLISTS.calm; const next = list[(list.indexOf('dawn') + 1) % list.length];
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn', next], createAudioElement: fakeAudio(log) });
    a.playTrack('dawn'); vi.advanceTimersByTime(120); await flush();
    log.els[0].emit('canplay'); await flush(); await flush();
    expect(log.els).toHaveLength(2);
    expect(log.els[1].src).toBe(`/music/${next}.mp3`);
    log.els[1].emit('canplay'); await flush(); await flush();
    expect(log.els[1].played).toBe(0);
    for (let k = 0; k < 280 && a.nowPlaying().id !== next; k += 1) { ctx.currentTime += 0.125; log.els[0].currentTime = Math.min(30, log.els[0].currentTime + 0.125); vi.advanceTimersByTime(120); }
    expect(a.nowPlaying().id).toBe(next);
    expect(log.els[1].played).toBe(1);
    a.stopMusic();
  });
  it('запись постояла, пока докачивалась: переход — по позиции элемента, а не по часам', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = streamCtx();
    const list = MOOD_PLAYLISTS.calm; const next = list[(list.indexOf('dawn') + 1) % list.length];
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn', next], createAudioElement: fakeAudio(log) });
    a.playTrack('dawn'); vi.advanceTimersByTime(120); await flush();
    log.els[0].emit('canplay'); await flush(); await flush();
    log.els[1].emit('canplay'); await flush(); await flush();
    // 40 секунд по часам, а запись прошла только 20 (стояла, пока качалась) — пьеса ещё та же
    for (let k = 0; k < 320; k += 1) { ctx.currentTime += 0.125; log.els[0].currentTime = Math.min(20, log.els[0].currentTime + 0.0625); vi.advanceTimersByTime(120); }
    expect(a.nowPlaying().id).toBe('dawn');
    a.stopMusic();
  });
  it('файл не открылся (error) — та же пьеса синтезом', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { ctx, log } = streamCtx();
    const a = createAudioEngine({ context: ctx, musicFiles: ['dawn'], createAudioElement: fakeAudio(log) });
    a.playTrack('dawn'); vi.advanceTimersByTime(120); await flush();
    const osc0 = log.osc;
    log.els[0].emit('error'); await flush(); await flush();
    for (let k = 0; k < 40; k += 1) { ctx.currentTime += 0.125; vi.advanceTimersByTime(120); }
    expect(a.nowPlaying().file).toBe(false);
    expect(log.osc).toBeGreaterThan(osc0);
    a.stopMusic();
  });
});
