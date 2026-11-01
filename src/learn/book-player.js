/* ПРОИГРЫВАТЕЛЬ КНИГ ПОЛКИ — один на всё приложение (docs/mechanics.md, «Профиль»). Книгу включили — она
   звучит, даже когда книгу закрыли и ушли на Путь, в лавку или в учебник: внизу над вкладками —
   мини-проигрыватель (src/learn-bookdock.jsx). Остановить — пауза или «×» в нём.

   Откуда звук:
   - запись по отрывкам — public/books/<книга>/<отрывок>.mp3 для каждого отрывка книги: отрывки играют
     друг за другом, перемотка — по всей книге (mode 'parts');
   - запись книги целиком — public/books/<книга>.mp3 (mode 'file');
   - записи нет или не загрузилась — книгу по частям читает голос браузера (mode 'speech').
   Список записанных считается при сборке (scripts/voice-files-plugin.js); тексты для озвучки — папка books/
   (npm run books:export). Доля прослушанного — at (0…1); где остановились и скорость — на этом устройстве.

   Модуль без React: состояние — неизменяемый объект, подписка — subscribe; экраны читают его через
   useSyncExternalStore (src/learn-bookdock.jsx). Книги (src/learn/shelf.js) сюда передают экраны — сам
   модуль тексты книг не грузит. */
import BOOK_FILES from 'virtual:book-audio';

const RECORDED = new Set(BOOK_FILES);
/* Автотест (Playwright) настоящих записей не слышит; со своим флагом ems-book-audio-test он считает
   записанной каждую книгу: '1' — целиком, '2' — по отрывкам; без флага — голос браузера */
const testMode = () => {
  try { return typeof navigator !== 'undefined' && navigator.webdriver ? (localStorage.getItem('ems-book-audio-test') || '') : null; } catch { return null; }
};
export const hasBookAudio = (id) => { const t = testMode(); return t === null ? RECORDED.has(id) : t === '1'; };
export const bookAudioUrl = (id) => `/books/${id}.mp3`;
export const passageAudioUrl = (id, pid) => `/books/${id}/${pid}.mp3`;
// запись по отрывкам — только если записан каждый отрывок книги; иначе — целиком или голос браузера
export function passageTracks(b) {
  const t = testMode();
  const all = t === null ? b.passages.every((p) => RECORDED.has(`${b.id}/${p.id}`)) : t === '2';
  return all ? b.passages.map((p) => ({ passage: p.id, url: passageAudioUrl(b.id, p.id) })) : null;
}
const canSpeak = () => typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
export const audioMode = (b) => (passageTracks(b) ? 'parts' : hasBookAudio(b.id) ? 'file' : canSpeak() ? 'speech' : null);

const POS_KEY = 'ems-book-pos';
const RATE_KEY = 'ems-book-rate';
export const RATES = [1, 1.25, 1.5, 0.75];
const readStore = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
export const savedPos = (id) => Number(readStore(POS_KEY, {})[id]) || 0;
const savePos = (id, f) => {
  if (!id) return;
  try {
    const m = readStore(POS_KEY, {});
    if (f > 0.002 && f < 0.995) m[id] = Math.round(f * 10000) / 10000; else delete m[id];
    localStorage.setItem(POS_KEY, JSON.stringify(m));
  } catch { /* нет хранилища */ }
};
export const savedRate = () => { const r = Number(readStore(RATE_KEY, 1)); return RATES.includes(r) ? r : 1; };
const ruVoice = () => { try { return window.speechSynthesis.getVoices().find((v) => /^ru/i.test(v.lang)) || null; } catch { return null; } };

// какой отрывок звучит на доле f и с какой доли он начинается — по частям текста (bookSpeech)
const partPassage = (parts, f) => { const p = parts.find((x) => f >= x.from && f < x.to) || parts[parts.length - 1]; return p ? p.passage : null; };
const partStart = (parts, id) => { const p = parts.find((x) => x.passage === id); return p ? p.from : 0; };

/* дорожки записи по отрывкам: длина каждой, пока запись не загрузилась, — оценка по числу знаков отрывка
   (вступление с автором и названием — в первом отрывке) */
function trackList(b, parts, est) {
  const tr = passageTracks(b);
  if (!tr) return null;
  const chars = Object.fromEntries(tr.map((t) => [t.passage, 0]));
  parts.forEach((x) => { const id = x.passage && chars[x.passage] != null ? x.passage : tr[0].passage; chars[id] += x.text.length; });
  const total = Object.values(chars).reduce((a, c) => a + c, 0) || 1;
  return tr.map((t) => ({ ...t, est: (chars[t.passage] / total) * est, dur: null }));
}
const trackDur = (t) => t.dur || t.est;
const tracksTotal = (tracks) => tracks.reduce((a, t) => a + trackDur(t), 0) || 1;
const trackStart = (tracks, i) => tracks.slice(0, i).reduce((a, t) => a + trackDur(t), 0);
// доля f всей книги → номер дорожки и секунда в ней
function trackAt(tracks, f) {
  const target = f * tracksTotal(tracks);
  let cum = 0;
  for (let i = 0; i < tracks.length; i += 1) {
    const d = trackDur(tracks[i]);
    if (target < cum + d || i === tracks.length - 1) return { i, sec: Math.max(0, Math.min(d, target - cum)) };
    cum += d;
  }
  return { i: 0, sec: 0 };
}

const IDLE = { id: null, book: null, parts: [], mode: null, playing: false, started: false, at: 0, dur: 0, rate: 1, tracks: null, track: 0, reader: null };
let S = { ...IDLE, rate: typeof localStorage !== 'undefined' ? savedRate() : 1 };
const subs = new Set();
const set = (patch) => { S = { ...S, ...patch }; subs.forEach((fn) => fn()); };
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const getState = () => S;

let tape = null; let pending = null; let tok = 0; let spoke = false;

function stopSound() {
  tok += 1;
  if (tape) { try { tape.pause(); } catch { /* уже остановлен */ } }
  if (spoke) { try { window.speechSynthesis.cancel(); } catch { /* нет голоса */ } }
}
// звучащий отрывок: по дорожке (запись по отрывкам) или по доле (запись целиком, голос браузера)
export const nowPassage = (s = S) => (!s.id || !(s.started || s.at > 0) ? null : s.mode === 'parts' && s.tracks ? s.tracks[s.track].passage : partPassage(s.parts, s.at));

/* сделать книгу текущей: другая книга, если звучала, — на паузу, её место запоминается */
function select(b, parts, est) {
  if (S.id === b.id) return;
  if (S.id) { stopSound(); savePos(S.id, S.at); }
  if (tape) { tape.onloadedmetadata = null; tape.ontimeupdate = null; tape.onended = null; tape.onerror = null; tape = null; }
  pending = null;
  const mode = audioMode(b);
  const tracks = mode === 'parts' ? trackList(b, parts, est) : null;
  const at = savedPos(b.id);
  set({ ...IDLE, id: b.id, book: b, parts, mode, tracks, track: tracks ? trackAt(tracks, at).i : 0, at, dur: tracks ? tracksTotal(tracks) : est, rate: S.rate, reader: S.reader });
}

function ended() {
  stopSound();
  savePos(S.id, 0);
  set({ playing: false, started: false, at: 0, track: 0 });
  media(false);
}

// голос браузера: часть за частью; новый запуск (пауза, перемотка) гасит прежний — по номеру tok
function speakFrom(k) {
  const synth = window.speechSynthesis; const my = ++tok; spoke = true;
  try { synth.cancel(); } catch { /* нет голоса */ }
  const parts = S.parts;
  const run = (i) => {
    if (my !== tok) return;
    if (i >= parts.length) { ended(); return; }
    const part = parts[i]; set({ at: part.from });
    const u = new window.SpeechSynthesisUtterance(part.text);
    u.lang = 'ru-RU'; u.rate = S.rate; const v = ruVoice(); if (v) u.voice = v;
    u.onboundary = (e) => { if (my === tok && e && e.charIndex >= 0) set({ at: part.from + (part.to - part.from) * Math.min(1, e.charIndex / part.text.length) }); };
    u.onend = () => run(i + 1);
    u.onerror = (e) => { if (my === tok && !(e && /interrupted|canceled/.test(e.error))) set({ playing: false }); };
    synth.speak(u);
  };
  run(k);
}
const partIndex = (f) => Math.max(0, S.parts.findIndex((x) => f >= x.from && f < x.to));

// запись: одна дорожка на всё время — меняется только её адрес (запись целиком или отрывок)
function tapeFor() {
  if (tape) return tape;
  const a = new window.Audio();
  a.preload = 'metadata';
  a.onloadedmetadata = () => {
    if (!a.duration || !isFinite(a.duration)) return;
    if (S.mode === 'parts') {
      const tracks = S.tracks.map((t, i) => (i === S.track ? { ...t, dur: a.duration } : t));
      set({ tracks, dur: tracksTotal(tracks) });
    } else set({ dur: a.duration });
    if (pending != null) { a.currentTime = S.mode === 'parts' ? pending : pending * a.duration; pending = null; }
  };
  a.ontimeupdate = () => {
    if (!a.duration || !isFinite(a.duration)) return;
    if (S.mode === 'parts') {
      const tracks = S.tracks[S.track].dur === a.duration ? S.tracks : S.tracks.map((t, i) => (i === S.track ? { ...t, dur: a.duration } : t));
      const total = tracksTotal(tracks);
      set({ tracks, dur: total, at: Math.min(0.999, (trackStart(tracks, S.track) + a.currentTime) / total) });
    } else set({ at: a.currentTime / a.duration, dur: a.duration });
  };
  // отрывок кончился — следующий; последний — книга дослушана
  a.onended = () => {
    if (S.mode === 'parts' && S.track < S.tracks.length - 1) { loadTrack(S.track + 1, 0); playTape(); return; }
    ended();
  };
  // запись не загрузилась — книгу дочитает голос браузера с того же места
  a.onerror = () => {
    if (!a.src) return;
    tape = null;
    if (!canSpeak()) { set({ mode: null, playing: false }); return; }
    set({ mode: 'speech', tracks: null, dur: Math.max(S.dur, 1) });
    if (S.playing) speakFrom(partIndex(S.at));
  };
  a.playbackRate = S.rate;
  tape = a;
  return a;
}
function loadTrack(i, sec) {
  const a = tapeFor();
  const url = S.tracks[i].url;
  set({ track: i });
  if (!a.src || !a.src.endsWith(url)) { a.src = url; a.playbackRate = S.rate; pending = sec; return; }
  if (a.duration && isFinite(a.duration)) a.currentTime = sec; else pending = sec;
}
function playTape() {
  const a = tapeFor();
  const pr = a.play();
  if (pr && pr.catch) pr.catch(() => set({ playing: false }));
}

function playFromAt(f0) {
  if (!S.mode) return;
  const f = f0 >= 0.995 ? 0 : f0;
  set({ playing: true, started: true, at: f });
  if (S.mode === 'file') {
    const a = tapeFor();
    if (!a.src) { a.src = bookAudioUrl(S.id); a.playbackRate = S.rate; }
    playTape();
    if (a.duration && isFinite(a.duration)) a.currentTime = f * a.duration; else pending = f;
  } else if (S.mode === 'parts') {
    const { i, sec } = trackAt(S.tracks, f);
    loadTrack(i, sec);
    playTape();
  } else speakFrom(partIndex(f));
  media(true);
}
function pauseNow() {
  stopSound();
  savePos(S.id, S.at);
  set({ playing: false });
  media(true);
}
function seekTo(to) {
  const f = Math.max(0, Math.min(0.999, to));
  set({ at: f });
  savePos(S.id, f);
  if (S.mode === 'file') {
    const a = tape;
    if (a && a.duration && isFinite(a.duration)) a.currentTime = f * a.duration; else pending = f;
  } else if (S.mode === 'parts') {
    const { i, sec } = trackAt(S.tracks, f);
    if (tape || S.playing) { loadTrack(i, sec); if (S.playing) playTape(); } else set({ track: i });
  } else if (S.playing) speakFrom(partIndex(f));
}
function rateTo(r) {
  set({ rate: r });
  try { localStorage.setItem(RATE_KEY, String(r)); } catch { /* нет хранилища */ }
  if (tape) tape.playbackRate = r;
  if (S.mode === 'speech' && S.playing) speakFrom(partIndex(S.at));
}

/* кнопки на экране блокировки телефона и в шторке: пауза, ±15 секунд; название — отрывок и книга */
function media(on) {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
  if (!ms) return;
  try {
    if (!on || !S.id || S.mode === 'speech') {
      ['play', 'pause', 'seekbackward', 'seekforward'].forEach((k) => ms.setActionHandler(k, null));
      return;
    }
    const b = S.book; const pid = nowPassage(); const p = pid ? b.passages.find((x) => x.id === pid) : null;
    if (typeof window.MediaMetadata === 'function') ms.metadata = new window.MediaMetadata({ title: p ? p.title : b.short, artist: b.author, album: `${b.short} · Инфляция` });
    ms.setActionHandler('play', () => playFromAt(S.at));
    ms.setActionHandler('pause', () => pauseNow());
    ms.setActionHandler('seekbackward', () => seekTo(S.at - 15 / Math.max(1, S.dur)));
    ms.setActionHandler('seekforward', () => seekTo(S.at + 15 / Math.max(1, S.dur)));
  } catch { /* браузер не умеет */ }
}

/* Действия над книгой b (parts — bookSpeech(b), est — speechSeconds(b)): книга сначала становится текущей.
   Без книги — над той, что звучит (мини-проигрыватель над вкладками). */
export const bookPlayer = {
  play: (b, parts, est, from) => { select(b, parts, est); playFromAt(from == null ? S.at : from); },
  pause: () => { if (S.id) pauseNow(); },
  toggle: (b, parts, est) => { if (b) select(b, parts, est); if (S.playing) pauseNow(); else playFromAt(S.at); },
  seek: (b, parts, est, f) => { if (b) select(b, parts, est); seekTo(f); },
  skip: (b, parts, est, sec) => { if (b) select(b, parts, est); seekTo(S.at + sec / Math.max(1, S.dur)); },
  playFrom: (b, parts, est, pid) => {
    select(b, parts, est);
    const f = S.mode === 'parts' ? trackStart(S.tracks, Math.max(0, S.tracks.findIndex((t) => t.passage === pid))) / tracksTotal(S.tracks) : partStart(S.parts, pid);
    playFromAt(f);
  },
  nextRate: () => rateTo(RATES[(RATES.indexOf(S.rate) + 1) % RATES.length]),
  // «×» в мини-проигрывателе: тишина, место запомнено, проигрыватель уходит
  stop: () => { if (!S.id) return; stopSound(); savePos(S.id, S.at); set({ playing: false, started: false }); media(false); },
  // открыта читалка этой книги — мини-проигрыватель над вкладками прячется: у читалки свой
  setReader: (id) => set({ reader: id }),
  passageStart: (b, parts, est, pid) => {
    if (S.id !== b.id) {
      const tracks = audioMode(b) === 'parts' ? trackList(b, parts, est) : null;
      if (!tracks) return partStart(parts, pid);
      return trackStart(tracks, Math.max(0, tracks.findIndex((t) => t.passage === pid))) / tracksTotal(tracks);
    }
    return S.mode === 'parts' ? trackStart(S.tracks, Math.max(0, S.tracks.findIndex((t) => t.passage === pid))) / tracksTotal(S.tracks) : partStart(S.parts, pid);
  },
};

/* что показать для книги b: звучит она сейчас — живое состояние; нет — где остановились и сколько длится */
export function viewOf(s, b, parts, est) {
  if (s.id === b.id) return { ...s, now: nowPassage(s) };
  const mode = audioMode(b);
  const tracks = mode === 'parts' ? trackList(b, parts, est) : null;
  const at = savedPos(b.id);
  const view = { ...IDLE, id: b.id, book: b, parts, mode, tracks, at, dur: tracks ? tracksTotal(tracks) : est, rate: s.rate, track: tracks ? trackAt(tracks, at).i : 0 };
  return { ...view, now: nowPassage(view) };
}

// для тестов: начать с чистого листа
export function resetBookPlayer() { stopSound(); tape = null; pending = null; S = { ...IDLE, rate: savedRate() }; subs.forEach((fn) => fn()); }
