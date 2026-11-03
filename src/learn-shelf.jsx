/* БИБЛИОТЕКА ПРОФИЛЯ (docs/mechanics.md, «Профиль»): книжная полка — целые абзацы из книг сверх цитат
   урока (src/learn/shelf.js) — и галерея персоналий (src/learn/people.js). Книга на полке — корешок
   цвета книги; закрытая — пунктиром с замком и подсказкой, что её откроет; прочитанная — с закладкой-
   ляссе и галочкой. Касание — книга во весь экран: обложка, оглавление, отрывки с буквицей, «Подумайте»
   после каждого, в конце — «Отметить прочитанной» (после — штамп «Прочитано» с датой). Книгу можно слушать:
   под обложкой — проигрыватель (запись public/books/<id>.mp3, без неё — голос браузера по абзацам), у
   каждого отрывка — «слушать отсюда», звучащий отрывок отмечен; ушли от проигрывателя вниз — внизу
   экрана мини-проигрыватель. Место, где остановились, и скорость запоминаются. Галерея — портреты в
   рамах: знакомые — в цвете, остальные — силуэтом; касание знакомого — карточка с главной идеей.
   Отдельный ленивый чанк: тексты книг не грузятся, пока профиль не открыт. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Lock, BookOpen, Lightbulb, Check, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Card, IconButton, Sheet, Button } from './ds.jsx';
import { shelfBooks, BOOK_BY_ID, wordsIn, bookReadAt, bookSpeech, speechSeconds, readLockSeconds } from './learn/shelf.js';
import { useBookPlayer, MiniPlayer, MINI_CSS, clock, rateText, Bars } from './learn-bookdock.jsx';
import { bookPlayer, getState as getBookState } from './learn/book-player.js';
import { plural } from './lib/plural.js';
import { markBook, XP } from './textbook/learn-state.js';
import { fullDate } from './learn/collections.js';
import { galleryOf } from './learn/people.js';
import { READING_BY_UNIT } from './learn/reading.js';
import { PEOPLE_BY_UNIT } from './learn/people.js';
import { placeOf } from './ds-tokens.js';
import { Portrait, PEOPLE_CSS, PhotoCredit } from './learn-people.jsx';

const CSS = `
  .lb-shelf { position: relative; display: flex; align-items: flex-end; gap: 6px; padding: 14px 10px 0; margin: 10px 0 18px; min-height: 164px; overflow-x: auto; scrollbar-width: thin; }
  .lb-plank { height: 12px; margin: -18px 0 14px; border-radius: 3px; background: linear-gradient(#b08a5c, #8a6a44); box-shadow: 0 6px 12px -6px rgba(0,0,0,.4); }
  .ds-dark .lb-plank { background: linear-gradient(#6b5236, #4a3826); }
  .lb-book { position: relative; flex: none; width: var(--w, 40px); height: var(--h, 140px); border: 0; border-radius: 4px 4px 2px 2px; cursor: pointer; color: #fff; padding: 0;
    display: flex; align-items: center; justify-content: center; transform-origin: bottom center; transition: transform .2s cubic-bezier(.3, 1.4, .5, 1);
    background: linear-gradient(90deg, rgba(0,0,0,.2), transparent 18%, transparent 80%, rgba(0,0,0,.25)), var(--b); box-shadow: inset 0 0 0 1px rgba(0,0,0,.12), 0 2px 0 rgba(0,0,0,.08); }
  .lb-book:hover:not(.locked) { transform: translateY(-8px) rotate(-2deg); }
  .lb-book span { writing-mode: vertical-rl; transform: rotate(180deg); font: 700 12.5px var(--ds-head); letter-spacing: .03em; white-space: nowrap; max-height: calc(var(--h, 140px) - 34px); overflow: hidden; text-overflow: ellipsis; }
  .lb-book::before, .lb-book::after { content: ''; position: absolute; left: 4px; right: 4px; height: 2px; background: rgba(255,255,255,.5); }
  .lb-book::before { top: 12px; } .lb-book::after { bottom: 12px; }
  .lb-book.locked { cursor: pointer; background: color-mix(in srgb, var(--b) 7%, transparent); border: 2px dashed color-mix(in srgb, var(--b) 40%, var(--ds-rule)); box-shadow: none; color: color-mix(in srgb, var(--b) 40%, var(--ds-ink)); }
  .lb-book.locked::before, .lb-book.locked::after { display: none; }
  .lb-book.locked svg { position: absolute; bottom: 8px; }
  .lb-book.locked span { margin-bottom: 22px; max-height: calc(var(--h, 140px) - 56px); }
  /* прочитанная: закладка-ляссе торчит над корешком, внизу — золотая печатка с галочкой */
  .lb-book.read span { margin-bottom: 24px; max-height: calc(var(--h, 140px) - 58px); }
  .lb-ribbon { position: absolute; top: -12px; right: 7px; width: 9px; height: 30px; background: linear-gradient(90deg, #B8860B, #E9C25A 55%, #C99A2E); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
  .lb-tick { position: absolute; bottom: 19px; left: 50%; width: 20px; height: 20px; margin-left: -10px; border-radius: 50%; display: grid; place-items: center; background: #E9C25A; color: #4A3200; box-shadow: 0 0 0 2px rgba(255,255,255,.55); }
  .lb-book.fresh .lb-ribbon { animation: lb-drop .6s cubic-bezier(.3, 1.5, .5, 1) .2s backwards; }
  .lb-book.fresh .lb-tick { animation: lb-pop .5s cubic-bezier(.3, 1.6, .5, 1) .45s backwards; }
  @keyframes lb-drop { from { transform: translateY(-16px); opacity: 0 } }
  @keyframes lb-pop { from { transform: scale(0); opacity: 0 } }
  .lb-end { margin-top: 30px; text-align: center; }
  .lb-stamp { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border: 2.5px solid var(--b); border-radius: 10px; color: var(--b); font: 700 15px var(--ds-sans); letter-spacing: .08em; text-transform: uppercase; transform: rotate(-3deg); }
  .ds-dark .lb-stamp { color: color-mix(in srgb, var(--b) 45%, #fff); border-color: color-mix(in srgb, var(--b) 45%, #fff); }
  .lb-wait { margin-top: 8px; font: 13px/1.4 var(--ds-sans); color: var(--ds-ink3); font-variant-numeric: tabular-nums; }
  .lb-xp { margin-top: 10px; font: 700 14px var(--ds-sans); color: var(--b); animation: lb-xp .5s .25s ease-out backwards; }
  .ds-dark .lb-xp { color: color-mix(in srgb, var(--b) 45%, #fff); }
  @keyframes lb-xp { from { opacity: 0; transform: translateY(6px) } }
  .lb-stamp.fresh { animation: lb-stamp .5s cubic-bezier(.3, 1.4, .5, 1) backwards; }
  .lb-stamp small { font: 600 13px var(--ds-sans); letter-spacing: 0; text-transform: none; opacity: .85; }
  @keyframes lb-stamp { from { transform: rotate(-3deg) scale(1.8); opacity: 0 } }
  /* галерея — одной лентой: сначала знакомые, дальше силуэты; листается вбок */
  .lb-gal { display: grid; grid-auto-flow: column; grid-auto-columns: 86px; gap: 10px; margin-top: 10px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; scroll-snap-type: x proximity; }
  .lb-gal > * { scroll-snap-align: start; }
  .lb-p { border: 0; background: none; padding: 0; cursor: pointer; text-align: center; color: var(--ds-ink); font: 600 12px/1.25 var(--ds-sans); }
  .lb-p .pp-frame { width: 78px; height: 96px; border-radius: 39px 39px 10px 10px; padding: 4px; margin: 0 auto 6px; }
  .lb-p .pp-frame > .pp-pic { border-radius: 35px 35px 7px 7px; }
  .lb-p.locked { cursor: default; color: var(--ds-ink3); }
  .lb-p.locked .pp-frame { filter: grayscale(1) opacity(.45); }
  .lb-reader { position: fixed; inset: 0; z-index: 320; overflow-y: auto; overscroll-behavior: contain; background: var(--ds-paper); color: var(--ds-ink); }
  .lb-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--ds-paper) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--ds-rule2); }
  .lb-top b { flex: 1; min-width: 0; font: 700 15px var(--ds-head); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lb-page { max-width: 680px; margin: 0 auto; padding: 22px 18px 120px; }
  .lb-cover { position: relative; margin: 6px auto 26px; width: min(300px, 80vw); aspect-ratio: 3 / 4; border-radius: 6px 14px 14px 6px; padding: 30px 24px; color: #FFF8E8; text-align: center;
    display: flex; flex-direction: column; justify-content: center; gap: 12px; box-shadow: 0 30px 50px -28px rgba(0,0,0,.65), inset 8px 0 0 rgba(0,0,0,.22);
    background: radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.16), transparent 55%), var(--b); animation: lb-open .7s cubic-bezier(.2, .9, .3, 1) backwards; }
  .lb-cover::before { content: ''; position: absolute; inset: 14px 14px 14px 22px; border: 1.5px solid rgba(255,248,232,.55); border-radius: 4px 10px 10px 4px; pointer-events: none; }
  @keyframes lb-open { from { opacity: 0; transform: perspective(900px) rotateY(-28deg) translateX(-20px) } }
  .lb-cover small { font: 700 11px var(--ds-sans); letter-spacing: .16em; text-transform: uppercase; opacity: .85; }
  .lb-cover h2 { margin: 0; font: 700 22px/1.25 var(--ds-news, 'PT Serif', Georgia, serif); }
  .lb-toc { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 18px; }
  .lb-passage { position: relative; margin: 30px 0 0; scroll-margin-top: 70px; }
  .lb-passage h3 { margin: 0; flex: 1; min-width: 0; font: 700 22px/1.25 var(--ds-news, 'PT Serif', Georgia, serif); }
  .lb-ph { display: flex; align-items: flex-start; gap: 10px; }
  /* звучащий отрывок — полоса цвета книги слева */
  .lb-passage.now::before { content: ''; position: absolute; left: -12px; top: 0; bottom: 0; width: 3px; border-radius: 2px; background: var(--b); animation: lb-fade .4s backwards; }
  @keyframes lb-fade { from { opacity: 0 } }
  .lb-pplay { flex: none; margin-top: 2px; display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px 0 10px; border-radius: 999px; cursor: pointer;
    border: 1.5px solid color-mix(in srgb, var(--b) 40%, transparent); background: none; color: color-mix(in srgb, var(--b) 75%, var(--ds-ink)); font: 700 12.5px var(--ds-sans); transition: background .15s, color .15s; }
  .lb-pplay:hover { background: color-mix(in srgb, var(--b) 10%, transparent); }
  .lb-pplay.on { background: var(--b); border-color: var(--b); color: #fff; }
  .ds-dark .lb-pplay:not(.on) { color: color-mix(in srgb, var(--b) 45%, #fff); }
  /* проигрыватель книги: круглая кнопка с кольцом прослушанного, перемотка, ±15 секунд, скорость */
  .lb-listen { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px 16px; max-width: 460px; margin: -4px auto 24px; padding: 16px 18px 12px; border-radius: 24px;
    background: linear-gradient(140deg, color-mix(in srgb, var(--b) 15%, var(--ds-card)), color-mix(in srgb, var(--b) 4%, var(--ds-card)));
    border: 1px solid color-mix(in srgb, var(--b) 28%, transparent); box-shadow: 0 18px 34px -26px color-mix(in srgb, var(--b) 85%, #000); }
  .lb-play { position: relative; width: 62px; height: 62px; margin: 6px; border: 0; border-radius: 50%; padding: 0; cursor: pointer; display: grid; place-items: center; color: #fff;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--b) 70%, #fff), var(--b) 70%); box-shadow: 0 10px 20px -10px var(--b), inset 0 -2px 0 rgba(0,0,0,.15); transition: transform .15s cubic-bezier(.3, 1.5, .5, 1); }
  .lb-play:hover { transform: scale(1.05); } .lb-play:active { transform: scale(.94); }
  .lb-play svg.ring { position: absolute; inset: -7px; width: 76px; height: 76px; transform: rotate(-90deg); pointer-events: none; overflow: visible; }
  .lb-play .trk { fill: none; stroke: color-mix(in srgb, var(--b) 20%, transparent); stroke-width: 3; }
  .lb-play .val { fill: none; stroke: var(--b); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset .35s linear; }
  .lb-listen.on .lb-play::after { content: ''; position: absolute; inset: 0; border-radius: 50%; animation: lb-pulse 1.8s ease-out infinite; }
  @keyframes lb-pulse { from { box-shadow: 0 0 0 0 color-mix(in srgb, var(--b) 45%, transparent); } to { box-shadow: 0 0 0 18px transparent; } }
  .lb-listen-t b { display: flex; align-items: center; gap: 8px; font: 700 17px/1.2 var(--ds-head); }
  .lb-listen-t span { display: block; margin-top: 3px; font: 500 13.5px/1.35 var(--ds-sans); color: var(--ds-ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lb-seek { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; font: 600 12px var(--ds-sans); color: var(--ds-ink2); }
  .lb-seek .ds-num { min-width: 38px; } .lb-seek .ds-num:last-child { text-align: right; }
  .lb-seek input { flex: 1; min-width: 0; height: 24px; margin: 0; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
  .lb-seek input::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(var(--b), var(--b)) 0 0 / var(--v, 0%) 100% no-repeat, color-mix(in srgb, var(--b) 16%, var(--ds-rule2)); }
  .lb-seek input::-moz-range-track { height: 6px; border-radius: 3px; background: linear-gradient(var(--b), var(--b)) 0 0 / var(--v, 0%) 100% no-repeat, color-mix(in srgb, var(--b) 16%, var(--ds-rule2)); }
  .lb-seek input::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; margin-top: -6px; border-radius: 50%; background: #fff; border: 4px solid var(--b); box-shadow: 0 1px 4px rgba(0,0,0,.3); }
  .lb-seek input::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 4px solid var(--b); }
  .lb-ctl { grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; gap: 12px; }
  .lb-ctl button, .lb-rate { height: 38px; min-width: 56px; padding: 0 14px; border: 0; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    background: color-mix(in srgb, var(--b) 11%, transparent); color: var(--ds-ink); font: 700 13.5px var(--ds-sans); font-variant-numeric: tabular-nums; transition: background .15s; }
  .lb-ctl button:hover, .lb-rate:hover { background: color-mix(in srgb, var(--b) 20%, transparent); }
  .lb-ctl small { font: 800 12px var(--ds-sans); }
  .lb-cap { grid-column: 1 / -1; text-align: center; font: 500 12px var(--ds-sans); color: var(--ds-ink3); }
  .lb-listen-t .lb-bars { color: var(--b); }
  .lb-passage .where { font: 600 12.5px var(--ds-sans); color: var(--ds-ink2); margin-top: 2px; letter-spacing: .02em; }
  .lb-passage p { font: 400 18px/1.7 var(--ds-news, 'PT Serif', Georgia, serif); margin: 14px 0 0; text-wrap: pretty; }
  .lb-passage p:first-of-type::first-letter { float: left; font: 700 54px/.9 var(--ds-news, 'PT Serif', Georgia, serif); padding: 6px 8px 0 0; color: var(--b); }
  .lb-think { margin-top: 16px; padding: 14px 16px 14px 48px; position: relative; border-radius: 14px; background: color-mix(in srgb, var(--b) 8%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--b) 25%, transparent); font: 400 15px/1.5 var(--ds-sans); }
  .lb-think b { display: block; font: 700 11px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 2px; }
  .lb-think svg { position: absolute; left: 16px; top: 15px; color: var(--ds-gold); }
  .lb-orn { text-align: center; color: var(--ds-ink3); letter-spacing: .6em; margin-top: 26px; }
  .lb-note { margin-top: 30px; font-size: 13px; color: var(--ds-ink3); line-height: 1.5; border-top: 1px dashed var(--ds-rule); padding-top: 12px; }
  @media (prefers-reduced-motion: reduce) { .lb-cover, .lb-stamp, .lb-xp, .lb-ribbon, .lb-tick, .lb-mini, .lb-bars i, .lb-listen.on .lb-play::after, .lb-passage.now::before { animation: none !important; } .lb-book { transition: none; } }
`;

/* ПРОИГРЫВАТЕЛЬ КНИГИ — один на всё приложение (src/learn/book-player.js): включили книгу — она звучит и
   после того, как читалку закрыли; внизу над вкладками — мини-проигрыватель (src/learn-bookdock.jsx).
   Запись по отрывкам или целиком — перемотка, скорость, ±15 секунд; записи нет или не загрузилась — читает
   голос браузера по частям. Где остановились и скорость — на этом устройстве. */
function ListenCard({ b, p, cardRef }) {
  const R = 35; const C = 2 * Math.PI * R;
  const nowTitle = p.now ? (b.passages.find((x) => x.id === p.now) || {}).title : null;
  const est = p.mode === 'speech' ? '≈ ' : '';
  const label = p.playing ? 'Пауза' : p.started || p.at > 0 ? 'Продолжить слушать' : 'Слушать книгу';
  return (
    <div className={`lb-listen${p.playing ? ' on' : ''}`} ref={cardRef} data-testid="book-listen" data-mode={p.mode} data-state={p.playing ? 'playing' : 'paused'}>
      <button type="button" className="lb-play" onClick={p.toggle} aria-label={label} data-testid="book-play">
        <svg className="ring" viewBox="0 0 76 76" aria-hidden="true">
          <circle cx="38" cy="38" r={R} className="trk" />
          <circle cx="38" cy="38" r={R} className="val" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - p.at) }} />
        </svg>
        {p.playing ? <Pause size={26} fill="currentColor" aria-hidden="true" /> : <Play size={26} fill="currentColor" style={{ marginLeft: 4 }} aria-hidden="true" />}
      </button>
      <div className="lb-listen-t">
        <b>{p.playing ? <><Bars />Сейчас звучит</> : p.started || p.at > 0 ? 'Вы остановились здесь' : 'Слушать книгу'}</b>
        <span data-testid="book-now">{nowTitle || `${b.passages.length} ${plural(b.passages.length, 'отрывок', 'отрывка', 'отрывков')} · ${est || '≈ '}${Math.max(1, Math.round(p.dur / 60))} мин`}</span>
      </div>
      <div className="lb-seek">
        <span className="ds-num">{clock(p.at * p.dur)}</span>
        <input type="range" min="0" max="1000" step="1" value={Math.round(p.at * 1000)} onChange={(e) => p.seek(Number(e.target.value) / 1000)}
          aria-label="Перемотка" aria-valuetext={`${clock(p.at * p.dur)} из ${clock(p.dur)}`} data-testid="book-seek" style={{ '--v': `${p.at * 100}%` }} />
        <span className="ds-num">{est}{clock(p.dur)}</span>
      </div>
      <div className="lb-ctl">
        <button type="button" onClick={() => p.skip(-15)} aria-label="Назад на 15 секунд" data-testid="book-back"><RotateCcw size={17} aria-hidden="true" /><small>15</small></button>
        <button type="button" className="lb-rate" onClick={p.nextRate} aria-label={`Скорость ${rateText(p.rate)} — сменить`} data-testid="book-speed">{rateText(p.rate)}</button>
        <button type="button" onClick={() => p.skip(15)} aria-label="Вперёд на 15 секунд" data-testid="book-fwd"><small>15</small><RotateCw size={17} aria-hidden="true" /></button>
      </div>
      <div className="lb-cap" data-testid="book-voice-caption">{p.mode === 'speech' ? 'читает голос браузера — запись книги появится позже' : 'голос синтезирован'}</div>
    </div>
  );
}

/* Сколько книга была открыта (секунды, на этом устройстве; ems-book-time): «Отметить прочитанной» открывается
   через половину примерного времени чтения (readLockSeconds). Время идёт, только пока читалка открыта и экран
   виден; закрыли — накопленное не теряется. Возвращает, сколько секунд ещё ждать. */
const TIME_KEY = 'ems-book-time';
const readTimes = () => { try { const m = JSON.parse(localStorage.getItem(TIME_KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } };
function useReadClock(id, need, on) {
  const spent = useRef(Math.min(need, Math.max(0, Number(readTimes()[id]) || 0)));
  const [left, setLeft] = useState(need - spent.current);
  useEffect(() => {
    if (!on || spent.current >= need) return undefined;
    const save = () => { try { localStorage.setItem(TIME_KEY, JSON.stringify({ ...readTimes(), [id]: spent.current })); } catch { /* приватный режим — время только до закрытия */ } };
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      spent.current = Math.min(need, spent.current + 1);
      setLeft(need - spent.current);
      if (spent.current % 5 === 0 || spent.current >= need) save();
      if (spent.current >= need) clearInterval(t);
    }, 1000);
    return () => { clearInterval(t); save(); };
  }, [id, need, on]);
  return left;
}

export function Reader({ id, onClose, readAt = 0, onRead = null, passage = null }) {
  const b = BOOK_BY_ID[id];
  const [fresh, setFresh] = useState(false);
  const wait = useReadClock(id, readLockSeconds(b), !readAt && !!onRead);
  const root = useRef(null);
  const parts = useMemo(() => bookSpeech(b), [b]);
  const player = useBookPlayer(b, parts, speechSeconds(b));
  const card = useRef(null);
  const [cardSeen, setCardSeen] = useState(true);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  /* читалка открыта — мини-проигрыватель над вкладками прячется (у читалки свой); закрыли — книга звучит
     дальше, а над вкладками снова мини-проигрыватель */
  useEffect(() => { bookPlayer.setReader(id); return () => { if (getBookState().reader === id) bookPlayer.setReader(null); }; }, [id]);
  // открыли из мини-проигрывателя над вкладками — сразу к звучащему отрывку
  useEffect(() => {
    if (!passage) return undefined;
    const t = setTimeout(() => { const el = root.current && root.current.querySelector(`[data-passage="${passage}"]`); if (el) el.scrollIntoView({ block: 'start' }); }, 60);
    return () => clearTimeout(t);
  }, [passage]);
  // проигрыватель под обложкой ушёл с экрана — внизу мини-проигрыватель
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver !== 'function') return undefined;
    const io = new IntersectionObserver(([e]) => setCardSeen(e.isIntersecting), { root: root.current, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [player.mode]);
  const go = (pid) => { const el = root.current && root.current.querySelector(`[data-passage="${pid}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (
    <div className="lb-reader" ref={root} style={{ '--b': b.color }} role="dialog" aria-label={`${b.author}. ${b.title}`} data-testid="book-reader" data-book={id}>
      <div className="lb-top">
        <IconButton label="Закрыть книгу" icon={X} data-testid="book-close" onClick={() => { Audio.play('paper'); onClose(); }} />
        <b>{b.author} · {b.short}</b>
      </div>
      <div className="lb-page">
        <div className="lb-cover"><small>{b.author}</small><h2>{b.title}</h2><small>{b.year}</small></div>
        {player.mode && <ListenCard b={b} p={player} cardRef={card} />}
        {b.passages.length > 1 && (
          <div className="lb-toc" role="navigation" aria-label="Отрывки">
            {b.passages.map((p) => <button key={p.id} type="button" className="ds-chip" onClick={() => go(p.id)}>{p.title}</button>)}
          </div>
        )}
        {b.passages.map((p, i) => {
          const now = player.now === p.id && (player.playing || player.started);
          return (
          <section key={p.id} className={`lb-passage${now ? ' now' : ''}`} data-passage={p.id} data-testid="book-passage" data-now={now ? 'true' : undefined}>
            {i > 0 && <div className="lb-orn" aria-hidden="true">✦ ✦ ✦</div>}
            <div className="lb-ph">
              <h3>{p.title}</h3>
              {player.mode && (
                <button type="button" className={`lb-pplay${now && player.playing ? ' on' : ''}`} data-testid="book-passage-play" aria-label={now && player.playing ? `Пауза — «${p.title}»` : `Слушать с отрывка «${p.title}»`}
                  onClick={() => (now && player.playing ? player.pause() : player.playFrom(p.id))}>
                  {now && player.playing ? <><Bars />звучит</> : <><Play size={12} fill="currentColor" aria-hidden="true" />слушать</>}
                </button>
              )}
            </div>
            <div className="where">{p.where}</div>
            {p.text.map((t, k) => <p key={k}>{t}</p>)}
            <div className="lb-think"><Lightbulb size={20} aria-hidden="true" /><b>Подумайте</b>{p.think}</div>
          </section>
          );
        })}
        {/* в конце — отметить книгу прочитанной: на полке у неё появится закладка */}
        <div className="lb-end" data-testid="book-end">
          {readAt ? (
            <>
              <span className={`lb-stamp${fresh ? ' fresh' : ''}`} data-testid="book-read-stamp" role="status"><Check size={18} aria-hidden="true" />Прочитано<small>{fullDate(readAt)}</small></span>
              {fresh && <div className="lb-xp" data-testid="book-xp">+{XP.book} опыта</div>}
            </>
          ) : onRead ? (
            <>
              <Button icon={Check} data-testid="book-mark-read" disabled={wait > 0} onClick={() => { if (wait > 0) return; Audio.play('up'); setFresh(true); onRead(id); }}>Отметить прочитанной</Button>
              {wait > 0 && <div className="lb-wait" data-testid="book-read-wait" data-left={wait}>Откроется через {clock(wait)} — книгу нужно сначала прочитать</div>}
            </>
          ) : null}
        </div>
        <div className="lb-note">Перевод — редакции «Инфляции», с сокращениями: пропуски отмечены «[…]». Текст {b.year} года — в общественном достоянии.</div>
      </div>
      {player.started && !cardSeen && <MiniPlayer b={b} p={player} onGo={go} />}
      <style>{MINI_CSS}</style>
    </div>
  );
}

const unlockHint = (b) => {
  const parts = [];
  if (READING_BY_UNIT[b.unitId]) parts.push('«Чтение»');
  if (PEOPLE_BY_UNIT[b.unitId]) parts.push('«Персоналии»');
  return `Откроется, когда пройдёте ${parts.join(' или ')} в юните «${placeOf(b.unitId).place}».`;
};

export default function Library({ learn, update = null }) {
  const books = shelfBooks(learn);
  // знакомые — первыми
  const people = galleryOf(learn).sort((a, b) => Number(b.met) - Number(a.met));
  const [reading, setReading] = useState(null);
  const [locked, setLocked] = useState(null);
  const [person, setPerson] = useState(null);
  const [fresh, setFresh] = useState(null);
  const open = books.filter((b) => b.open).length;
  const done = books.filter((b) => b.read).length;
  const markRead = update ? (id) => { setFresh(id); update((s) => markBook(s, id)); } : null;
  const met = people.filter((p) => p.met).length;
  return (
    <>
      <style>{PEOPLE_CSS + CSS + MINI_CSS}</style>
      <Card style={{ margin: '12px 0' }} data-testid="prof-shelf">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div className="ds-h3" style={{ flex: 1 }}>Книжная полка</div>
          <span className="ds-num ds-faint" style={{ fontSize: 13 }} data-testid="shelf-count">{open} из {books.length}{done ? <> · <span data-testid="shelf-read">прочитано {done}</span></> : null}</span>
        </div>
        <div className="ds-sub" style={{ fontSize: 13.5, marginTop: 2 }}>Целые отрывки из книг, которые изменили экономику, — больше, чем цитата в уроке. Книги можно и слушать.</div>
        <div className="lb-shelf" role="list">
          {books.map((b) => {
            const h = 112 + (wordsIn(b) % 5) * 8; const w = 36 + Math.min(6, b.passages.length - 1) * 4;
            return (
              <button key={b.id} type="button" role="listitem" className={`lb-book${b.open ? '' : ' locked'}${b.open && b.read ? ' read' : ''}${fresh === b.id ? ' fresh' : ''}`} style={{ '--b': b.color, '--h': `${h}px`, '--w': `${w}px` }}
                data-testid="shelf-book" data-book={b.id} data-open={String(b.open)} data-read={String(b.read)} aria-label={`${b.author}, «${b.short}», ${b.year}${b.open ? (b.read ? ' — прочитана' : '') : ' — закрыта'}`}
                onClick={() => { Audio.play(b.open ? 'paper' : 'tick'); if (b.open) setReading(b.id); else setLocked(b); }}>
                <span>{b.short}</span>{!b.open && <Lock size={13} aria-hidden="true" />}
                {b.open && b.read && <><i className="lb-ribbon" aria-hidden="true" /><i className="lb-tick" aria-hidden="true"><Check size={13} strokeWidth={3} /></i></>}
              </button>
            );
          })}
        </div>
        <div className="lb-plank" aria-hidden="true" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div className="ds-h3" style={{ flex: 1 }}>Галерея персоналий</div>
          <span className="ds-num ds-faint" style={{ fontSize: 13 }} data-testid="gallery-count">{met} из {people.length}</span>
        </div>
        <div className="lb-gal" data-testid="prof-gallery" role="region" aria-label="Галерея знакомств" tabIndex={0}>
          {people.map((p) => (
            <button key={p.id} type="button" className={`lb-p${p.met ? '' : ' locked'}`} data-testid="gallery-person" data-person={p.id} data-met={String(p.met)} disabled={!p.met}
              aria-label={p.met ? p.name : `${p.name} — откроется в «Персоналиях» юнита`} onClick={() => { Audio.play('paper'); setPerson(p); }}>
              <div className="pp-frame" style={{ '--pp': p.group.color }}><Portrait p={p} color={p.group.color} hidden={!p.met} /></div>
              {p.met ? p.name : '???'}
            </button>
          ))}
        </div>
      </Card>
      {reading && <Reader id={reading} onClose={() => setReading(null)} readAt={bookReadAt(learn, reading)} onRead={markRead} />}
      {locked && (
        <Sheet label={locked.short} onClose={() => setLocked(null)} testid="shelf-locked">
          <div style={{ textAlign: 'center' }}>
            <BookOpen size={30} color={locked.color} aria-hidden="true" />
            <div className="ds-h3" style={{ marginTop: 6 }}>{locked.author}, «{locked.title}»</div>
            <div className="ds-sub" style={{ fontSize: 15, marginTop: 6 }}>{unlockHint(locked)}</div>
            <Button wide style={{ marginTop: 14 }} onClick={() => setLocked(null)}>Понятно</Button>
          </div>
        </Sheet>
      )}
      {person && (
        <Sheet label={person.name} onClose={() => setPerson(null)} testid="gallery-card">
          <div style={{ '--pp': person.group.color, '--pp-ink': `color-mix(in srgb, ${person.group.color} 82%, #000)` }}>
            <div className="pp-hero" style={{ animation: 'none' }}>
              <div><div className="pp-frame"><Portrait p={person} color={person.group.color} /></div><PhotoCredit p={person} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="pp-name" style={{ fontSize: 26 }}>{person.name}</div>
                <div className="pp-role"><span>{person.years}</span><span>{person.role}</span></div>
                <div className="pp-lead" style={{ fontSize: 15.5 }}>{person.lead}</div>
              </div>
            </div>
            <div className="pp-idea" style={{ fontSize: 16 }}><Lightbulb size={22} aria-hidden="true" />{person.idea}</div>
          </div>
        </Sheet>
      )}
    </>
  );
}

/* книга поверх любой вкладки — из мини-проигрывателя над вкладками: та же читалка, отметка о прочтении — в прогресс */
export function BookOverlay({ id, passage = null, learn, update = null, onClose }) {
  if (!BOOK_BY_ID[id]) return null;
  return (
    <>
      <style>{CSS + MINI_CSS}</style>
      <Reader id={id} passage={passage} onClose={onClose} readAt={bookReadAt(learn, id)} onRead={update ? (bid) => update((s) => markBook(s, bid)) : null} />
    </>
  );
}
