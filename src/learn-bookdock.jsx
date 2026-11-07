/* МИНИ-ПРОИГРЫВАТЕЛЬ КНИГИ (docs/mechanics.md, «Профиль»): в читалке — когда большой проигрыватель ушёл
   с экрана, и над вкладками — когда книга звучит, а читалку закрыли: слушать можно, гуляя по приложению.
   Пауза, название звучащего отрывка (касание — открыть книгу на нём), ±15 секунд, скорость; сверху —
   полоса прослушанного, она же ползунок перемотки. «×» над вкладками — остановить и убрать.
   Звук — один проигрыватель на всё приложение (src/learn/book-player.js). Модуль лёгкий: он в основном
   чанке, а читалка и тексты книг — в отдельном (src/learn-shelf.jsx). */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { X, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { subscribe, getState, bookPlayer, viewOf, nowPassage } from './learn/book-player.js';

export const useBookState = () => useSyncExternalStore(subscribe, getState, getState);
/* проигрыватель книги b для экрана: звучит она — живое состояние, нет — где остановились; действия
   делают её текущей (другая книга, если звучала, встаёт на паузу) */
export function useBookPlayer(b, parts, est) {
  const s = useBookState();
  const v = viewOf(s, b, parts, est);
  return {
    ...v,
    toggle: () => bookPlayer.toggle(b, parts, est),
    play: (from) => bookPlayer.play(b, parts, est, from),
    pause: () => bookPlayer.pause(),
    seek: (f) => bookPlayer.seek(b, parts, est, f),
    skip: (sec) => bookPlayer.skip(b, parts, est, sec),
    playFrom: (pid) => bookPlayer.playFrom(b, parts, est, pid),
    nextRate: () => bookPlayer.nextRate(),
    setVolume: (v) => bookPlayer.setVolume(v),
  };
}

export const clock = (sec) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const rateText = (r) => `${String(r).replace('.', ',')}×`;
export const Bars = () => <span className="lb-bars" aria-hidden="true"><i /><i /><i /></span>;

export const MINI_CSS = `
  .lb-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 13px; }
  .lb-bars i { width: 3px; height: 4px; border-radius: 1.5px; background: currentColor; animation: lb-eq .8s ease-in-out infinite alternate; }
  .lb-bars i:nth-child(2) { animation-delay: -.35s; } .lb-bars i:nth-child(3) { animation-delay: -.6s; }
  @keyframes lb-eq { to { height: 13px; } }
  .lb-rate { height: 38px; min-width: 56px; padding: 0 14px; border: 0; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    background: color-mix(in srgb, var(--b) 11%, transparent); color: var(--ds-ink); font: 700 13.5px var(--ds-sans); font-variant-numeric: tabular-nums; transition: background .15s; }
  .lb-rate:hover { background: color-mix(in srgb, var(--b) 20%, transparent); }
  .lb-mini { position: fixed; z-index: 3; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); width: min(520px, calc(100% - 24px)); transform: translateX(-50%);
    display: flex; align-items: center; gap: 10px; padding: 17px 10px 8px 9px; border-radius: 18px; overflow: hidden; color: var(--ds-ink);
    background: color-mix(in srgb, var(--ds-card) 92%, transparent); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
    border: 1px solid color-mix(in srgb, var(--b) 30%, var(--ds-rule2)); box-shadow: 0 18px 36px -18px rgba(0,0,0,.5); animation: lb-mini-in .4s cubic-bezier(.2, 1.3, .4, 1) backwards; }
  @keyframes lb-mini-in { from { transform: translate(-50%, 150%); } }
  /* над вкладками: над нижней панелью, под слоями уроков и читалки */
  .lb-mini.lb-dock { z-index: 115; bottom: calc(var(--dock-b, 72px) + 10px); }
  /* полоса прослушанного сверху — ползунок перемотки: тонкая, а касаться можно полосы повыше */
  .lb-mini-seek { position: absolute; left: 14px; right: 14px; top: 2px; width: auto; height: 14px; margin: 0; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
  .lb-mini-seek::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(var(--b), var(--b)) 0 0 / var(--v, 0%) 100% no-repeat, color-mix(in srgb, var(--b) 16%, var(--ds-rule2)); }
  .lb-mini-seek::-moz-range-track { height: 4px; border-radius: 2px; background: linear-gradient(var(--b), var(--b)) 0 0 / var(--v, 0%) 100% no-repeat, color-mix(in srgb, var(--b) 16%, var(--ds-rule2)); }
  .lb-mini-seek::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border-radius: 50%; background: var(--b); border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
  .lb-mini-seek::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: var(--b); border: 2px solid #fff; }
  .lb-mini-seek:focus-visible { outline: 2px solid var(--b); outline-offset: 2px; }
  .lb-mini-skip { flex: none; height: 36px; min-width: 36px; padding: 0 6px; border: 0; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 2px;
    background: transparent; color: var(--ds-ink2); font: 800 11px var(--ds-sans); }
  .lb-mini-skip:hover { background: color-mix(in srgb, var(--b) 12%, transparent); color: var(--ds-ink); }
  .lb-mini .lb-mini-rate { height: 34px; min-width: 50px; padding: 0 10px; }
  @media (max-width: 420px) { .lb-mini .lb-mini-rate { display: none; } .lb-mini { gap: 4px; } }
  .lb-mini-play { flex: none; width: 42px; height: 42px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; color: #fff; background: var(--b); }
  .lb-mini-t { flex: 1; min-width: 0; border: 0; background: none; padding: 0; text-align: left; cursor: pointer; color: inherit; }
  .lb-mini-t small { display: flex; align-items: center; gap: 6px; font: 700 12px var(--ds-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--ds-ink3); white-space: nowrap; overflow: hidden; }
  .lb-mini-t small .lb-bars { height: 9px; color: var(--b); } .lb-mini-t small .lb-bars i { width: 2px; }
  .lb-mini-t b { display: block; font: 700 14.5px/1.3 var(--ds-head); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (prefers-reduced-motion: reduce) { .lb-mini, .lb-bars i { animation: none !important; } }
`;

/* мини-проигрыватель: пауза, название звучащего отрывка, ±15 секунд и скорость; сверху — полоса прослушанного,
   она же ползунок перемотки (тянуть или коснуться места) */
export function MiniPlayer({ b, p, onGo, onClose = null, testid = 'book-mini', sub = null, className = '', style = null }) {
  const nowTitle = p.now ? (b.passages.find((x) => x.id === p.now) || {}).title : b.short;
  return (
    <div className={`lb-mini ${className}`} role="region" aria-label="Проигрыватель книги" data-testid={testid} data-state={p.playing ? 'playing' : 'paused'} style={{ '--b': b.color, ...style }}>
      <input type="range" className="lb-mini-seek" min="0" max="1000" step="1" value={Math.round(p.at * 1000)} onChange={(e) => p.seek(Number(e.target.value) / 1000)}
        aria-label="Перемотка" aria-valuetext={`${clock(p.at * p.dur)} из ${clock(p.dur)}`} data-testid="book-mini-seek" style={{ '--v': `${p.at * 100}%` }} />
      <button type="button" className="lb-mini-play" onClick={p.toggle} aria-label={p.playing ? 'Пауза' : 'Продолжить слушать'} data-testid="book-mini-play">
        {p.playing ? <Pause size={19} fill="currentColor" aria-hidden="true" /> : <Play size={19} fill="currentColor" style={{ marginLeft: 3 }} aria-hidden="true" />}
      </button>
      <button type="button" className="lb-mini-t" onClick={() => onGo(p.now)} aria-label={`К отрывку «${nowTitle}»`} data-testid="book-mini-title">
        <small>{p.playing ? <><Bars />{sub || 'Сейчас звучит'}</> : sub || 'На паузе'} · <span className="ds-num">{clock(p.at * p.dur)}</span></small><b>{nowTitle}</b>
      </button>
      <button type="button" className="lb-mini-skip" onClick={() => p.skip(-15)} aria-label="Назад на 15 секунд" data-testid="book-mini-back"><RotateCcw size={16} aria-hidden="true" /><small>15</small></button>
      <button type="button" className="lb-mini-skip" onClick={() => p.skip(15)} aria-label="Вперёд на 15 секунд" data-testid="book-mini-fwd"><RotateCw size={16} aria-hidden="true" /><small>15</small></button>
      <button type="button" className="lb-rate lb-mini-rate" onClick={p.nextRate} aria-label={`Скорость ${rateText(p.rate)} — сменить`}>{rateText(p.rate)}</button>
      {onClose && <button type="button" className="lb-mini-skip" onClick={onClose} aria-label="Остановить и убрать проигрыватель" data-testid="book-mini-close"><X size={17} aria-hidden="true" /></button>}
    </div>
  );
}

/* над вкладками: книга звучит (или на паузе), а читалку закрыли — слушать дальше, гуляя по приложению.
   Касание названия — открыть книгу на звучащем отрывке; «×» — остановить и убрать */
export function BookDock({ onOpen }) {
  const s = useBookState();
  const show = !!s.id && s.started && s.reader !== s.id;
  const [navH, setNavH] = useState(72);
  useEffect(() => {
    if (!show) return undefined;
    const nav = () => { const n = document.querySelector('[data-testid="bottom-nav"]'); setNavH(n ? Math.round(n.getBoundingClientRect().height) : 0); };
    nav(); window.addEventListener('resize', nav);
    // кнопка «Наверх, к карте» и другие нижние кнопки поднимаются над проигрывателем
    document.documentElement.setAttribute('data-book-dock', '');
    return () => { window.removeEventListener('resize', nav); document.documentElement.removeAttribute('data-book-dock'); };
  }, [show]);
  if (!show) return null;
  const b = s.book;
  const p = {
    ...s, now: nowPassage(s),
    toggle: () => bookPlayer.toggle(), seek: (f) => bookPlayer.seek(null, null, null, f), skip: (sec) => bookPlayer.skip(null, null, null, sec), nextRate: () => bookPlayer.nextRate(),
  };
  const who = b.author.split(' ').pop();
  return (
    <>
      <style>{MINI_CSS}</style>
      <MiniPlayer b={b} p={p} testid="book-dock" className="lb-dock" style={{ '--dock-b': `${navH}px` }} sub={`${who}, «${b.short}»`}
        onGo={(pid) => onOpen(b.id, pid)} onClose={() => bookPlayer.stop()} />
    </>
  );
}
