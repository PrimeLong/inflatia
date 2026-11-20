/* МИНИ-ПЛАШКА МУЗЫКИ (docs/mechanics.md, «Музыка: мини-плашка»): музыку включили в обучении — над вкладками плашка, как у
   книги: «назад», пауза и игра, «вперёд», что звучит, лайк, «развернуть» и «×» — выключить музыку. Касание названия или
   стрелки «вверх» разворачивает полный проигрыватель (тот же, что в учебнике). Пауза — не стоп: «Играть» продолжает пьесу
   с того же места (src/audio/engine.js). Переключение пьесы видно: кнопка вздрагивает в свою сторону, название въезжает.
   Пока открыт урок — плашка скрыта (в шапке урока своя кнопка музыки). Звучит и книга — плашка музыки встаёт над плашкой
   книги. В обучении играет «Волна» (src/audio/tracks.js, waveNext). */
import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Heart, ThumbsDown, ChevronUp } from 'lucide-react';
import { Audio, AudioControls } from './MacroSimulator.jsx';
import { learnMusic, setLearnMusic, toggleMusicLike, toggleMusicDislike, musicLikes, musicDislikes, MOOD_TINT, musicPaused, setMusicPaused } from './ds-tokens.js';
import { MINI_CSS, Bars } from './learn-bookdock.jsx';

const DOCK_CSS = `
  .lm-dock { z-index: 115; bottom: calc(var(--dock-b, 72px) + 10px); padding: 8px 8px 8px 9px; gap: 4px; }
  /* открыта книга с полки (читалка — слой во весь экран, z 320): плашка музыки не прячется под ней, а встаёт у нижнего края
     читалки; звучит и сама книга — её мини-проигрыватель внизу, плашка музыки над ним (пункт владельца 20.11, п. 6:
     «когда открываешь книгу, мини-проигрыватель исчезает»). Текст и «Наверх» читалки — выше плашки. */
  html:has(.lb-reader) .lm-dock { z-index: 330; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
  html:has(.lb-reader .lb-mini) .lm-dock { bottom: calc(90px + env(safe-area-inset-bottom, 0px)); }
  html[data-music-dock] .lb-reader { padding-bottom: 76px; }
  html[data-music-dock] .lb-reader .lb-up { bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  html[data-music-dock] .lb-reader .lb-up.over { bottom: calc(164px + env(safe-area-inset-bottom, 0px)); }
  /* звучит и книга — музыка над её плашкой */
  html[data-book-dock] .lm-dock { bottom: calc(var(--dock-b, 72px) + 88px); }
  html[data-music-dock] .ln-to-map { bottom: calc(160px + env(safe-area-inset-bottom)); }
  html[data-music-dock][data-book-dock] .ln-to-map { bottom: calc(238px + env(safe-area-inset-bottom)); }
  .lm-dock .lm-like.on { color: #E0457B; }
  .lm-dock .lm-dislike.on { color: #5B6B8A; }
  .lm-dock .lb-mini-t { margin: 0 4px; }
  .lm-dock .lb-mini-t b { display: block; }
  .lm-dock .lb-mini-t b.in-next { animation: lm-in-r .35s ease-out; } .lm-dock .lb-mini-t b.in-prev { animation: lm-in-l .35s ease-out; }
  @keyframes lm-in-r { from { opacity: 0; transform: translateX(14px); } } @keyframes lm-in-l { from { opacity: 0; transform: translateX(-14px); } }
  .lm-dock .lm-skip { position: relative; }
  .lm-dock .lm-skip.kick { animation: lm-ring .45s ease-out; } .lm-dock .lm-skip.kick.next svg { animation: lm-nudge-r .4s cubic-bezier(.3,1.6,.5,1); } .lm-dock .lm-skip.kick.prev svg { animation: lm-nudge-l .4s cubic-bezier(.3,1.6,.5,1); }
  .lm-dock .lm-skip:active { transform: scale(.88); }
  @keyframes lm-ring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--b) 45%, transparent); } 100% { box-shadow: 0 0 0 12px transparent; } }
  @keyframes lm-nudge-r { 40% { transform: translateX(5px); } } @keyframes lm-nudge-l { 40% { transform: translateX(-5px); } }
  .lm-dock .lm-open { flex: none; width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; padding: 0 !important; border: 0 !important; border-radius: 999px !important;
    background: transparent !important; box-shadow: none !important; color: var(--ds-ink2); cursor: pointer; }
  .lm-dock .lm-open:hover { background: color-mix(in srgb, var(--b) 12%, transparent) !important; color: var(--ds-ink); }
  @media (max-width: 420px) { .lm-dock .lm-like { display: none; } }
  /* запись грузится: вокруг кнопки бежит дуга (замечание владельца 18.11, вечер: «непонятно, когда песня грузится») */
  .lm-dock .lb-mini-play { position: relative; }
  .lm-dock .lb-mini-play.loading::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2.5px solid transparent; border-top-color: var(--b); border-right-color: var(--b);
    animation: lm-load 0.9s linear infinite; }
  @keyframes lm-load { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .lm-dock .lb-mini-play.loading::after { animation-duration: 3s; } }
  @media (prefers-reduced-motion: reduce) { .lm-dock .lb-mini-t b, .lm-dock .lm-skip, .lm-dock .lm-skip svg { animation: none !important; } }
`;

export function MusicDock() {
  const [, tick] = useState(0);
  // пауза на плашке — плашка остаётся до «×» или ухода из обучения; пауза сохраняется и после ухода с сайта (ems-music-paused)
  const [paused, setPaused] = useState(() => !!musicPaused() && !learnMusic());
  const [kick, setKick] = useState(null);
  const kickT = useRef(0);
  const wrap = useRef(null);
  useEffect(() => Audio.onChange(() => tick((n) => n + 1)), []);
  /* вернулись на сайт: та же пьеса встаёт на паузу на той же секунде — движок грузится без звука (пункт владельца 18.11) */
  useEffect(() => {
    const st = musicPaused();
    if (!st || (Audio.loaded() && Audio.nowPlaying().id === st.id)) return;
    Promise.resolve(Audio.preload()).then(() => { if (!Audio.loaded()) return; if (!Audio.nowPlaying().locked) Audio.setPlaylist('wave'); Audio.restorePaused(st); });
  }, []);
  // ушли с сайта, пока играло, — запомнить пьесу и секунду: вернётесь — продолжит оттуда же
  useEffect(() => {
    const save = () => { if (!Audio.loaded() || !learnMusic()) return; const n = Audio.nowPlaying(); if (n.id) setMusicPaused({ id: n.id, offset: n.position }); };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);
  useEffect(() => () => window.clearTimeout(kickT.current), []);
  const on = !!Audio.opts.music && learnMusic();
  /* пауза из большого проигрывателя (открыт с плашки) — тоже пауза, а не выключение: плашка остаётся, и проигрыватель над
     ней не пропадает (замечание владельца 18.11, вечер: «исчезает проигрыватель, когда нажимаешь на нём паузу») */
  const pausedNow = paused || (!on && !!musicPaused());
  const show = Audio.loaded() && (on || pausedNow);
  const np = Audio.nowPlaying();
  // в обучении экономики нет — играет «Волна», если музыку не закрепили за настроением
  useEffect(() => { if (on && Audio.loaded() && !Audio.nowPlaying().locked) Audio.setPlaylist('wave'); }, [on]);
  const [navH, setNavH] = useState(72);
  useEffect(() => {
    if (!show) return undefined;
    const nav = () => { const n = document.querySelector('[data-testid="bottom-nav"]'); setNavH(n ? Math.round(n.getBoundingClientRect().height) : 0); };
    nav(); window.addEventListener('resize', nav);
    document.documentElement.setAttribute('data-music-dock', '');
    return () => { window.removeEventListener('resize', nav); document.documentElement.removeAttribute('data-music-dock'); };
  }, [show]);
  if (!show) return null;
  const play = (v) => {
    if (!v) { const n = Audio.nowPlaying(); setMusicPaused({ id: n.id, offset: n.position }); }
    Audio.prime(); Audio.setMusic(v); setLearnMusic(v); setPaused(!v);
  };
  const skip = (forward) => {
    Audio.play('tick'); setKick(forward ? 'next' : 'prev');
    window.clearTimeout(kickT.current); kickT.current = window.setTimeout(() => setKick(null), 450);
    if (!on) play(true);
    Audio.skip(forward);
  };
  // развернуть: тот же проигрыватель, что в учебнике, — открывается над плашкой
  const expand = () => { const b = wrap.current && wrap.current.querySelector('[data-testid="music-dock-open"]'); if (b) b.click(); };
  const label = np.locked === 'wave' || !np.locked ? '«Волна»' : np.moodLabel;
  return (
    <>
      <style>{MINI_CSS}{DOCK_CSS}</style>
      <div ref={wrap} className="lb-mini lm-dock" role="region" aria-label="Музыка" data-dd-anchor="" data-testid="music-dock" data-state={on ? 'playing' : 'paused'}
        style={{ '--b': MOOD_TINT[np.mood] || MOOD_TINT.wave, '--dock-b': `${navH}px` }}>
        <button type="button" className={`lb-mini-skip lm-skip${kick === 'prev' ? ' kick prev' : ''}`} onClick={() => skip(false)} aria-label="Предыдущая пьеса" data-testid="music-dock-prev" data-kick={kick === 'prev' ? 'true' : undefined}>
          <SkipBack size={17} aria-hidden="true" />
        </button>
        <button type="button" className={`lb-mini-play${on && np.loading ? ' loading' : ''}`} onClick={() => play(!on)} aria-label={on ? 'Пауза' : 'Играть'} data-testid="music-dock-play" data-loading={on && np.loading ? 'true' : undefined}>
          {on ? <Pause size={19} fill="currentColor" aria-hidden="true" /> : <Play size={19} fill="currentColor" style={{ marginLeft: 3 }} aria-hidden="true" />}
        </button>
        <button type="button" className={`lb-mini-skip lm-skip${kick === 'next' ? ' kick next' : ''}`} onClick={() => skip(true)} aria-label="Следующая пьеса" data-testid="music-dock-next" data-kick={kick === 'next' ? 'true' : undefined}>
          <SkipForward size={17} aria-hidden="true" />
        </button>
        <button type="button" className="lb-mini-t" onClick={expand} aria-label="Развернуть проигрыватель" data-testid="music-dock-title-btn">
          <small>{on ? (np.loading ? 'Загружаем…' : <><Bars />Музыка</>) : 'На паузе'} · {label}</small>
          <b key={np.id || 'none'} className={kick ? `in-${kick}` : ''} data-testid="music-dock-title">{np.name}</b>
        </button>
        <button type="button" className={`lb-mini-skip lm-like${np.liked ? ' on' : ''}`} aria-pressed={!!np.liked} aria-label={np.liked ? 'Убрать лайк' : 'Нравится — чаще в «Волне»'} data-testid="music-dock-like"
          onClick={() => { if (np.id) { Audio.setLikes(toggleMusicLike(np.id)); Audio.setDislikes(musicDislikes()); } }}><Heart size={17} fill={np.liked ? 'currentColor' : 'none'} aria-hidden="true" /></button>
        <button type="button" className={`lb-mini-skip lm-like lm-dislike${np.disliked ? ' on' : ''}`} aria-pressed={!!np.disliked} aria-label={np.disliked ? 'Убрать дизлайк' : 'Не нравится — «Волна» больше не поставит'} data-testid="music-dock-dislike"
          onClick={() => { if (!np.id) return; const was = !!np.disliked; Audio.setDislikes(toggleMusicDislike(np.id)); Audio.setLikes(musicLikes()); if (!was && on) skip(true); }}><ThumbsDown size={17} fill={np.disliked ? 'currentColor' : 'none'} aria-hidden="true" /></button>
        {/* развернуть полный проигрыватель: плейлист, «Что играть», громкость */}
        <AudioControls wave learn icon={ChevronUp} label="Развернуть проигрыватель" testid="music-dock-open" className="lm-open" />
        <button type="button" className="lb-mini-skip" onClick={() => { Audio.setMusic(false); setLearnMusic(false); setMusicPaused(null); setPaused(false); }} aria-label="Выключить музыку" data-testid="music-dock-close"><X size={17} aria-hidden="true" /></button>
      </div>
    </>
  );
}
