import { describe, it, expect } from 'vitest';
import { TRACKS, MOOD_PLAYLISTS, ROLE_PLAYLISTS, MOOD_LABEL, REGIME_MOOD, LH, BASS_LINES, STINGERS } from '../tracks.js';
import { createAudioEngine, trackSeconds, moodFor, stingerFor } from '../engine.js';

// всё, что аранжировка умеет превратить в звук (см. scheduleStep в engine.js)
const INSTRUMENTS = ['piano', 'synth', 'lead', 'bass', 'cello', 'growl', 'harp', 'bells', 'brass', 'guitar',
  'strum', 'nylon', 'marimba', 'violin', 'strings', 'pad', 'choir', 'timpani'];
const FEELS = [undefined, 'straight', 'swing', 'loose'];

describe('саундтрек: целостность данных', () => {
  const ids = Object.keys(TRACKS);

  it('у каждой пьесы есть имя, подзаголовок, настроение с подписью и разумный темп', () => {
    for (const id of ids) {
      const t = TRACKS[id];
      expect(t.id).toBe(id);
      expect(t.name, id).toBeTruthy();
      expect(t.subtitle, id).toBeTruthy();
      expect(MOOD_LABEL[t.mood], `${id}: настроение ${t.mood}`).toBeTruthy();
      expect(t.bpm, id).toBeGreaterThanOrEqual(40);
      expect(t.bpm, id).toBeLessThanOrEqual(180);
      expect(FEELS, `${id}: feel`).toContain(t.feel);
      if (t.bassLine) expect(BASS_LINES[t.bassLine], `${id}: bassLine ${t.bassLine}`).toBeTruthy();
    }
  });

  it('секции ссылаются на существующую гармонию, мелодию и фигуру левой руки', () => {
    for (const id of ids) {
      const t = TRACKS[id];
      expect(t.sections.length, id).toBeGreaterThan(0);
      for (const s of t.sections) {
        expect(Array.isArray(t[s.h]), `${id}: гармония ${s.h}`).toBe(true);
        expect(Array.isArray(t[s.mel]), `${id}: мелодия ${s.mel}`).toBe(true);
        expect(LH[s.lh], `${id}: фигура ${s.lh}`).toBeTruthy();
        expect(s.dyn, id).toBeGreaterThan(0);
        expect(s.dyn, id).toBeLessThanOrEqual(1.3);
      }
    }
  });

  it('в аранжировке только известные инструменты', () => {
    for (const id of ids) {
      for (const s of TRACKS[id].sections) {
        for (const w of s.arr.split(/\s+/).filter(Boolean)) {
          expect(INSTRUMENTS, `${id}: «${w}»`).toContain(w);
        }
      }
    }
  });

  it('аккорды из четырёх настоящих нот, мелодия укладывается в свою секцию', () => {
    for (const id of ids) {
      const t = TRACKS[id];
      for (const s of t.sections) {
        const bars = t[s.h];
        for (const chord of bars) {
          expect(chord.length, `${id}/${s.h}`).toBeGreaterThanOrEqual(3);
          for (const m of chord) expect(m, id).toBeGreaterThanOrEqual(24);
        }
        const steps = bars.length * 16;
        for (const [st, midi, dur] of t[s.mel]) {
          expect(Number.isInteger(st) && st >= 0 && st < steps, `${id}/${s.mel}: шаг ${st} из ${steps}`).toBe(true);
          expect(dur, `${id}/${s.mel}`).toBeGreaterThan(0);
          expect(midi, id).toBeGreaterThanOrEqual(36);
          expect(midi, id).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('ударные: шаги в пределах такта, известные символы', () => {
    for (const id of ids) {
      for (const s of TRACKS[id].sections) {
        if (!s.drums) continue;
        for (const k of ['kick', 'snare', 'hat']) {
          for (const [st, c] of s.drums[k]) {
            expect(st, id).toBeLessThan(16);
            if (k === 'hat') expect(['o', 'O', 'r', 'x'], `${id}: ${c}`).toContain(c);
          }
        }
      }
    }
  });

  it('плейлисты ссылаются на существующие пьесы, у каждого настроения режима — свой плейлист', () => {
    const all = [MOOD_PLAYLISTS, ...Object.values(ROLE_PLAYLISTS)];
    for (const lists of all) {
      for (const [m, list] of Object.entries(lists)) {
        expect(list.length, m).toBeGreaterThan(0);
        for (const id of list) expect(TRACKS[id], `${m}: ${id}`).toBeTruthy();
      }
    }
    for (const m of Object.values(REGIME_MOOD)) expect(MOOD_PLAYLISTS[m], m).toBeTruthy();
    for (const m of Object.keys(MOOD_LABEL)) expect(MOOD_PLAYLISTS[m], m).toBeTruthy();
  });

  it('каждая пьеса где-нибудь звучит', () => {
    const used = new Set();
    for (const lists of [MOOD_PLAYLISTS, ...Object.values(ROLE_PLAYLISTS)]) {
      for (const list of Object.values(lists)) list.forEach((id) => used.add(id));
    }
    for (const id of Object.keys(TRACKS)) expect(used.has(id), id).toBe(true);
  });

  it('проход формы — от полуминуты до четырёх минут', () => {
    for (const id of Object.keys(TRACKS)) {
      const s = trackSeconds(id);
      expect(s, id).toBeGreaterThan(30);
      expect(s, id).toBeLessThan(240);
    }
  });
});

describe('звуковой движок без Web Audio', () => {
  it('без AudioContext не падает и молчит', () => {
    const a = createAudioEngine();
    expect(a.prime()).toBe(false);
    expect(() => {
      a.play('click');
      a.startMusic();
      a.setMood({ regime: 'recession', politicalRegime: 'democracy', inflationRisk: 10, bankingRisk: 10, debtRisk: 10, recessionRisk: 60, gdpGrowth: -2 });
      a.quarterSequence({ wellbeingDelta: 1, newCrisis: false, bigNews: false });
    }).not.toThrow();
    expect(a.nowPlaying().mood).toBeTruthy();
  });

  it('настроение следует режиму экономики, тоталитаризм перекрывает всё', () => {
    const a = createAudioEngine();
    const base = { politicalRegime: 'democracy', inflationRisk: 0, bankingRisk: 0, debtRisk: 0, recessionRisk: 0, gdpGrowth: 2 };
    a.setMood({ ...base, regime: 'banking' });
    expect(a.playlist().map((p) => p.id)).toEqual(MOOD_PLAYLISTS.crisis);
    a.setMood({ ...base, regime: 'normal', politicalRegime: 'totalitarian' });
    expect(a.playlist().map((p) => p.id)).toEqual(MOOD_PLAYLISTS.totalitarian);
  });

  /* «Волна» — в обучении, где экономики нет (пункт владельца 16.11: «не должен показывать плейлист, он случайно выбирает
     треки, как реальная волна, и чтобы с агрессивных не начинало, и чтобы можно было ставить лайки») */
  it('«Волна»: случайный выбор из пяти настроений; начало — всегда спокойное; переходы плавные, без повторов подряд', async () => {
    const { waveNext, WAVE_ENERGY, WAVE_RECENT } = await import('../tracks.js');
    const { seededRandom } = await import('../../research/randomize.js');
    const moods = [...new Set(Object.values(TRACKS).map((t) => t.mood))].filter((m) => m !== 'records');
    // в волне — ВСЕ пьесы саундтрека, и «Война», и «Кризис» (пункт владельца 18.11: «должны все и война и кризис»)
    // кроме пластинок лавки: их слушают только купившие — миксом «Пластинки»
    expect([...MOOD_PLAYLISTS.wave].sort()).toEqual(Object.keys(TRACKS).filter((id) => TRACKS[id].mood !== 'records').sort());
    for (const id of ['anthem', 'firstlesson', 'chalkboard', 'openingbell', 'residence', 'graduation', 'anchor', 'warmarch', 'ironmarch', 'collapse', 'decree', 'bankrun', 'marginwire', 'thinvolume']) expect(MOOD_PLAYLISTS.wave).toContain(id);
    moods.forEach((m) => expect(WAVE_ENERGY[m], m).toBeGreaterThan(0));
    expect(MOOD_LABEL.wave).toBe('Волна');
    // начало — из спокойных, и разное (случайное)
    const firsts = new Set(Array.from({ length: 200 }, (_, k) => waveNext([], { rnd: seededRandom(k + 1) })));
    firsts.forEach((id) => expect(TRACKS[id].mood).toBe('calm'));
    expect(firsts.size).toBeGreaterThan(3);
    // длинная волна: другое настроение, энергия меняется не больше чем на ступень, недавние не повторяются
    const rnd = seededRandom(9); const hist = [];
    for (let i = 0; i < 600; i += 1) hist.push(waveNext(hist, { rnd }));
    for (let i = 1; i < hist.length; i += 1) {
      const a = TRACKS[hist[i - 1]].mood; const b = TRACKS[hist[i]].mood;
      expect(b, `${i}`).not.toBe(a);
      expect(Math.abs(WAVE_ENERGY[a] - WAVE_ENERGY[b]), `${a}→${b}`).toBeLessThanOrEqual(1);
      expect(hist.slice(Math.max(0, i - WAVE_RECENT), i), `${i}: ${hist[i]}`).not.toContain(hist[i]);
    }
    // не по списку: звучат все настроения, порядок двух волн разный; тревожные — не сразу после спокойных
    expect(new Set(hist.map((id) => TRACKS[id].mood))).toEqual(new Set(moods));
    const other = []; const rnd2 = seededRandom(10);
    for (let i = 0; i < 20; i += 1) other.push(waveNext(other, { rnd: rnd2 }));
    expect(other).not.toEqual(hist.slice(0, 20));
  });
  // пункт владельца 16.11, вечер: «музыка часто повторяется, и такое ощущение, что не вся может играть в волне»
  it('«Волна»: пока есть не звучавшие пьесы, повторов нет; за длинную волну звучит каждая пьеса', async () => {
    const { waveNext } = await import('../tracks.js');
    const { seededRandom } = await import('../../research/randomize.js');
    for (const seed of [1, 2, 3, 4, 5]) {
      const rnd = seededRandom(seed); const hist = [];
      for (let i = 0; i < 200; i += 1) hist.push(waveNext(hist, { rnd }));
      // первые 18 — без единого повтора (плавные переходы по энергии иногда вынуждают повтор позже — не раньше 19-й пьесы)
      expect(new Set(hist.slice(0, 18)).size, `зерно ${seed}`).toBe(18);
      expect(new Set(hist), `зерно ${seed}`).toEqual(new Set(MOOD_PLAYLISTS.wave));
    }
  });
  it('«Волна»: пьесы с лайком звучат чаще; у «Волны» нет плейлиста; экономика её не сбивает', async () => {
    const { waveNext } = await import('../tracks.js');
    const { seededRandom } = await import('../../research/randomize.js');
    const rnd = seededRandom(3);
    const count = (likes) => { let liked = 0; for (let k = 0; k < 3000; k += 1) if (waveNext([], { likes, rnd }) === 'ledger') liked += 1; return liked; };
    // двенадцать спокойных: без лайка «ledger» — примерно 1/12, с лайком — 3/14
    expect(count([])).toBeLessThan(350);
    expect(count(['ledger'])).toBeGreaterThan(550);
    const a = createAudioEngine({ rnd: seededRandom(1) });
    a.setPlaylist('wave');
    expect(a.playlist()).toEqual([]);
    expect(a.nowPlaying().locked).toBe('wave');
    a.setLikes(['dawn', 'нет-такой']);
    expect(a.nowPlaying().liked).toBe(a.nowPlaying().id === 'dawn');
    a.setMood({ regime: 'banking', politicalRegime: 'democracy', inflationRisk: 0, bankingRisk: 0, debtRisk: 0, recessionRisk: 0, gdpGrowth: 2 });
    expect(a.nowPlaying().locked).toBe('wave');
    a.setPlaylist(null);
    expect(a.playlist().map((p) => p.id)).toEqual(MOOD_PLAYLISTS.crisis);
  });
});

describe('настроение и заставки', () => {
  const base = { regime: 'normal', politicalRegime: 'democracy', stabilizationCred: 0, campaignActive: false };

  it('настроение: тоталитаризм и война главнее всего, стабилизация — поверх кризиса', () => {
    expect(moodFor(base)).toBe('calm');
    expect(moodFor({ ...base, regime: 'recession' })).toBe('slump');
    expect(moodFor({ ...base, campaignActive: true })).toBe('campaign');
    expect(moodFor({ ...base, regime: 'banking', campaignActive: true })).toBe('crisis');
    expect(moodFor({ ...base, politicalRegime: 'authoritarian', campaignActive: true })).toBe('authoritarian');
    expect(moodFor({ ...base, regime: 'currency', stabilizationCred: 0.4 })).toBe('stabilization');
    expect(moodFor({ ...base, regime: 'currency', stabilizationCred: 0.4, stabilizationWon: true })).toBe('crisis');
    expect(moodFor({ ...base, regime: 'war', stabilizationCred: 0.9 })).toBe('war');
    expect(moodFor({ ...base, regime: 'war', politicalRegime: 'totalitarian' })).toBe('totalitarian');
    for (const m of ['campaign', 'stabilization', 'authoritarian']) expect(MOOD_PLAYLISTS[m].length).toBeGreaterThanOrEqual(2);
  });

  it('детский режим: ни войны, ни тоталитаризма, ни ручного управления в музыке; казино-плейлиста нет', () => {
    const kids = { ...base, kidsMode: true };
    expect(moodFor({ ...kids, regime: 'war' })).toBe('calm');
    expect(moodFor({ ...kids, politicalRegime: 'totalitarian' })).toBe('calm');
    expect(moodFor({ ...kids, politicalRegime: 'authoritarian' })).toBe('calm');
    expect(moodFor({ ...kids, regime: 'recession' })).toBe('slump');
    expect(MOOD_PLAYLISTS.casino).toBeUndefined();
  });

  it('заставка выбирается по самому значимому событию квартала', () => {
    expect(stingerFor(null, base)).toBe(null);
    expect(stingerFor(base, base)).toBe(null);
    expect(stingerFor(base, { ...base, electionResult: 'incumbent', lastElection: {} })).toBe('victory');
    expect(stingerFor(base, { ...base, electionResult: 'incumbent', lastElection: { rigged: true } })).toBe('hollow');
    expect(stingerFor(base, { ...base, electionResult: 'landslide', lastElection: {} })).toBe('defeat');
    expect(stingerFor(base, { ...base, electionResult: 'incumbent', lastElection: { coup: true }, politicalRegime: 'authoritarian' })).toBe('coup');
    expect(stingerFor(base, { ...base, politicalRegime: 'authoritarian' })).toBe('regime_fall');
    expect(stingerFor({ ...base, politicalRegime: 'authoritarian' }, { ...base, politicalRegime: 'totalitarian' })).toBe('regime_fall');
    expect(stingerFor({ ...base, politicalRegime: 'crisis' }, base)).toBe('restoration');
    expect(stingerFor(base, { ...base, stabilizationWon: true })).toBe('prices_stopped');
    expect(stingerFor({ ...base, stabilizationWon: true }, { ...base, stabilizationWon: true })).toBe(null);
  });

  it('каждая возможная заставка существует, её партии укладываются в несколько секунд', () => {
    const ids = ['victory', 'hollow', 'defeat', 'coup', 'regime_fall', 'restoration', 'prices_stopped'];
    const voices = ['piano', 'brass', 'strings', 'choir', 'bell', 'harp', 'cello', 'bass', 'growl', 'violin', 'timpani', 'snare', 'kick'];
    for (const id of ids) {
      const S = STINGERS[id];
      expect(S, id).toBeTruthy();
      let steps = 0;
      for (const p of S.parts) {
        expect(voices, `${id}: ${p.inst}`).toContain(p.inst);
        for (const [st, notes, dur] of p.notes) {
          steps = Math.max(steps, st + dur);
          const drum = p.inst === 'snare' || p.inst === 'kick';
          expect(notes.length > 0, `${id}/${p.inst}@${st}`).toBe(!drum);
          for (const m of notes) expect(m, id).toBeGreaterThanOrEqual(30);
        }
      }
      const seconds = steps * 60 / S.bpm / 4;
      expect(seconds, id).toBeGreaterThan(2);
      expect(seconds, id).toBeLessThan(8);
    }
  });

  it('движок принимает заставку и без Web Audio не падает', () => {
    const a = createAudioEngine();
    expect(a.stinger('victory')).toBe(0);
    expect(() => a.quarterSequence({ wellbeingDelta: 0, newCrisis: false, bigNews: false, stinger: 'coup' })).not.toThrow();
  });
});

describe('поправки громкости', () => {
  it('замерены все пьесы и заставки, поправки в разумных пределах', async () => {
    const { TRACK_GAIN_DB, STINGER_GAIN_DB } = await import('../loudness.js');
    for (const id of Object.keys(TRACKS)) {
      expect(TRACK_GAIN_DB[id], `${id}: перезапустите npm run loudness -- --write`).toBeTypeOf('number');
      expect(Math.abs(TRACK_GAIN_DB[id]), id).toBeLessThanOrEqual(9);
    }
    for (const id of Object.keys(STINGERS)) expect(STINGER_GAIN_DB[id], id).toBeTypeOf('number');
  });

  // замечание владельца 18.11, вечер, п. 13: «звуки при каких-то событиях сохранились, при выборах там, нужно убрать»
  it('итог квартала — только «штамп»: ни заставок выборов и переворотов, ни сигналов кризиса и новостей', async () => {
    const { readFileSync } = await import('node:fs');
    const eng = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
    const body = eng.slice(eng.indexOf('    quarterSequence() {'), eng.indexOf('    },', eng.indexOf('    quarterSequence() {')));
    expect(body).toContain("playSfx('stamp')");
    for (const bad of ['playStinger', "'news'", "'alarm'", "'up'", "'down'"]) expect(body, bad).not.toContain(bad);
    for (const f of ['../../game.jsx', '../../network.jsx']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/stingerFor\(/);
    }
  });
});

// пункт владельца 21.11, п. 1: «платные пластинки почему-то в волне не появляются»
describe('«Волна» и купленные пластинки', () => {
  it('купленные пластинки звучат в «Волне» (по настроению своей основы), некупленные — нет', async () => {
    const { waveNext, RECORD_TRACKS } = await import('../tracks.js');
    const { seededRandom } = await import('../../research/randomize.js');
    const owned = RECORD_TRACKS.slice(0, 2);
    const run = (records) => { const rnd = seededRandom(7); const hist = []; for (let i = 0; i < 400; i += 1) hist.push(waveNext(hist, { rnd, records })); return hist; };
    const withRec = run(owned);
    owned.forEach((id) => expect(withRec, id).toContain(id));
    RECORD_TRACKS.slice(2).forEach((id) => expect(withRec).not.toContain(id));
    expect(run([]).some((id) => RECORD_TRACKS.includes(id))).toBe(false);
    // переход к пластинке — тоже плавный: по энергии её основы
    const { WAVE_ENERGY } = await import('../tracks.js');
    const moodOf = (id) => TRACKS[id].waveMood || TRACKS[id].mood;
    for (let i = 1; i < withRec.length; i += 1) expect(Math.abs(WAVE_ENERGY[moodOf(withRec[i])] - WAVE_ENERGY[moodOf(withRec[i - 1])])).toBeLessThanOrEqual(1);
  });
});

// пункт владельца 21.11, п. 3: «нужна кнопка дизлайка»
describe('«Волна»: дизлайк', () => {
  it('пьесы с дизлайком «Волна» не ставит; если иначе играть нечего — ставит, но не пропадает тишиной', async () => {
    const { waveNext } = await import('../tracks.js');
    const { seededRandom } = await import('../../research/randomize.js');
    const calm = MOOD_PLAYLISTS.wave.filter((id) => TRACKS[id].mood === 'calm');
    const disl = calm.slice(0, Math.max(1, calm.length - 1));
    const rnd = seededRandom(3); const hist = [];
    for (let i = 0; i < 300; i += 1) hist.push(waveNext(hist, { rnd, dislikes: disl }));
    disl.forEach((id) => expect(hist).not.toContain(id));
    // все спокойные — с дизлайком: начать всё равно есть с чего
    expect(waveNext([], { rnd, dislikes: calm })).toBeTruthy();
  });
  it('лайк и дизлайк одной пьесы не уживаются: дизлайк снимает лайк и наоборот', async () => {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const { toggleMusicLike, toggleMusicDislike, musicLikes, musicDislikes } = await import('../../ds-tokens.js');
    toggleMusicLike('dawn');
    expect(musicLikes()).toContain('dawn');
    toggleMusicDislike('dawn');
    expect(musicDislikes()).toContain('dawn');
    expect(musicLikes()).not.toContain('dawn');
    toggleMusicLike('dawn');
    expect(musicDislikes()).not.toContain('dawn');
  });
});
