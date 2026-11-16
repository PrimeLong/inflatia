/* МИНИ-ПЛАШКА МУЗЫКИ (docs/mechanics.md, «Музыка: мини-плашка»): музыку включили в обучении — над вкладками плашка, как у
   книги: пауза и игра, что звучит, «следующая», лайк и «×» — выключить музыку. Гуляете по Пути, лавке, профилю — музыку
   видно и ею можно управлять, не возвращаясь в учебник. Пока открыт урок — плашка скрыта (музыка звучит). Звучит и книга —
   плашка музыки встаёт над плашкой книги. В обучении играет «Волна» (src/audio/tracks.js, waveNext). */
import React, { useEffect, useState } from 'react';
import { X, Play, Pause, SkipForward, Heart } from 'lucide-react';
import { Audio } from './audio/lazy.js';
import { learnMusic, setLearnMusic, toggleMusicLike, MOOD_TINT } from './ds-tokens.js';
import { MINI_CSS, Bars } from './learn-bookdock.jsx';

const DOCK_CSS = `
  .lm-dock { z-index: 115; bottom: calc(var(--dock-b, 72px) + 10px); padding: 8px 8px 8px 9px; }
  /* звучит и книга — музыка над её плашкой */
  html[data-book-dock] .lm-dock { bottom: calc(var(--dock-b, 72px) + 88px); }
  html[data-music-dock] .ln-to-map { bottom: calc(160px + env(safe-area-inset-bottom)); }
  html[data-music-dock][data-book-dock] .ln-to-map { bottom: calc(238px + env(safe-area-inset-bottom)); }
  .lm-dock .lm-like.on { color: #E0457B; }
`;

export function MusicDock() {
  const [, tick] = useState(0);
  // плашку закрыли «×» — музыка выключена; пауза на плашке — плашка остаётся до «×» или ухода из обучения
  const [paused, setPaused] = useState(false);
  useEffect(() => Audio.onChange(() => tick((n) => n + 1)), []);
  const on = !!Audio.opts.music && learnMusic();
  const show = Audio.loaded() && (on || paused);
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
  const play = (v) => { Audio.prime(); Audio.setMusic(v); setLearnMusic(v); setPaused(!v); };
  const label = np.locked === 'wave' || !np.locked ? '«Волна»' : np.moodLabel;
  return (
    <>
      <style>{MINI_CSS}{DOCK_CSS}</style>
      <div className="lb-mini lm-dock" role="region" aria-label="Музыка" data-testid="music-dock" data-state={on ? 'playing' : 'paused'}
        style={{ '--b': MOOD_TINT[np.mood] || MOOD_TINT.wave, '--dock-b': `${navH}px` }}>
        <button type="button" className="lb-mini-play" onClick={() => play(!on)} aria-label={on ? 'Пауза' : 'Играть'} data-testid="music-dock-play">
          {on ? <Pause size={19} fill="currentColor" aria-hidden="true" /> : <Play size={19} fill="currentColor" style={{ marginLeft: 3 }} aria-hidden="true" />}
        </button>
        <div className="lb-mini-t" style={{ cursor: 'default' }}>
          <small>{on ? <><Bars />Музыка</> : 'Музыка на паузе'} · {label}</small><b data-testid="music-dock-title">{np.name}</b>
        </div>
        <button type="button" className="lb-mini-skip" onClick={() => { Audio.play('tick'); Audio.skip(true); }} aria-label="Следующая пьеса" data-testid="music-dock-next"><SkipForward size={17} aria-hidden="true" /></button>
        <button type="button" className={`lb-mini-skip lm-like${np.liked ? ' on' : ''}`} aria-pressed={!!np.liked} aria-label={np.liked ? 'Убрать лайк' : 'Нравится — чаще в «Волне»'} data-testid="music-dock-like"
          onClick={() => { if (np.id) Audio.setLikes(toggleMusicLike(np.id)); }}><Heart size={17} fill={np.liked ? 'currentColor' : 'none'} aria-hidden="true" /></button>
        <button type="button" className="lb-mini-skip" onClick={() => { Audio.setMusic(false); setLearnMusic(false); setPaused(false); }} aria-label="Выключить музыку" data-testid="music-dock-close"><X size={17} aria-hidden="true" /></button>
      </div>
    </>
  );
}
