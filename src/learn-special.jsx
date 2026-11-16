/* ОСОБЫЕ УРОКИ КАК ОБЫЧНЫЕ (docs/mechanics.md, «Особые уроки — как обычный урок»). Пункт владельца от 15 ноября
   2026: «в квадратных уроках нет украшений и тем урока, и вообще выглядит не как обычный урок, нету серии
   ответов, Инфли. И нельзя продолжить, только начать заново». Здесь — общее для «Персоналий», «Чтения»,
   «Разбора графика» и «Нарисуй сам»:
     SpecialShell — тема урока из лавки (фон, палитра, отклик на ответ), как у урока;
     SpecialDesk  — украшение урока (гирлянда, мобиле — полосой под шапкой; колыбель — на подставке сбоку);
     useAnswerRun + SpecialRun — серия верных ответов подряд с Инфлей в шапке (первая попытка каждого вопроса);
     useSpecialResume — продолжить с того места, где вышли (сутки, на этом устройстве, как урок). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { DsRoot } from './ds.jsx';
import { InflaMeter, useMedia } from './ds-art.jsx';
import { LessonSkin, SKINS, SKIN_CSS, skinTheme, skinVars } from './learn-skins.jsx';
import { DeskDecor, CradleStand, CRADLE_CSS, tellAnswer, DESK_QUERY } from './learn-decor.jsx';
import { themeOf, deskOf } from './learn/rewards.js';
import { saveResume, dropResume, getResume } from './learn/resume.js';

const CSS = `
  .sp-shell { position: fixed; inset: 0; z-index: 300; isolation: isolate; background: var(--ds-paper); }
  /* с темой урока фон особого урока — фон темы: свои подложки страниц прозрачные */
  .sp-shell.sk-on > .pp-root, .sp-shell.sk-on > .rd-root, .sp-shell.sk-on > .gl { background: transparent; }
  .sp-shell.sk-on .pp-top, .sp-shell.sk-on .rd-top { background: color-mix(in srgb, var(--ds-paper) 72%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  .sp-desk { max-width: 640px; width: 100%; margin: 0 auto; padding: 0 14px; }
  /* шапка не становится выше: Инфля с ниткой шарика свисает за строку, а не раздвигает её (на телефоне иначе низ графика уезжал под кнопки) */
  .sp-run { display: inline-flex; align-items: center; gap: 4px; flex: none; height: 40px; overflow: visible; }
  .sp-run > :last-child { max-height: 40px; }
  .sp-run b { display: inline-flex; align-items: center; gap: 2px; min-width: 26px; padding: 3px 7px; border-radius: 999px; font: 800 13px var(--ds-sans); font-variant-numeric: tabular-nums;
    color: #7A4A00; background: #FFE08A; box-shadow: 0 0 0 1px rgba(122,74,0,.18); transition: transform .2s; }
  .sp-run b.grew { animation: sp-pop .45s cubic-bezier(.3,1.6,.5,1); }
  @keyframes sp-pop { 0% { transform: scale(.7) } 60% { transform: scale(1.2) } 100% { transform: none } }
  .sp-resume { max-width: 640px; margin: 8px auto 0; padding: 8px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    border-radius: 14px; font: 14px/1.35 var(--ds-sans); color: var(--ds-ink2); background: color-mix(in srgb, var(--ds-gold, #B8860B) 12%, var(--ds-card)); }
  .sp-resume button { border: none; background: none; padding: 4px 2px; font: 700 14px var(--ds-sans); color: var(--ds-accent, var(--ds-ink)); text-decoration: underline; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .sp-run b.grew { animation: none; } }
`;

// тема урока из лавки — как у обычного урока (learn-lesson.jsx); без темы — как было
export function SpecialShell({ learn, children }) {
  const skin = SKINS[themeOf(learn || {})] || null;
  if (!skin) return <>{children}</>;
  return (
    <DsRoot theme={skinTheme(skin)} className="sp-shell sk-on" data-skin={skin.key} data-testid="special-skin" style={skinVars(skin)}>
      <style>{CSS + SKIN_CSS}</style>
      <LessonSkin id={skin.id} />
      {children}
    </DsRoot>
  );
}

// украшение урока: на ПК и планшете, как в уроке (DESK_QUERY)
export function SpecialDesk({ learn }) {
  const desk = deskOf(learn || {});
  const wide = useMedia(DESK_QUERY);
  if (!desk || !wide) return null;
  if (desk === 'desk-cradle') return <><style>{CRADLE_CSS}</style><CradleStand id={desk} /></>;
  return <div className="sp-desk" data-testid="special-desk"><style>{CSS}</style><DeskDecor id={desk} height={48} /></div>;
}

/* серия верных ответов подряд в этом уроке: засчитывается первая попытка вопроса; ошибка обнуляет. Ответ
   слышат и украшение, и тема (tellAnswer) — колыбель щёлкает, гирлянда колышется, тема вспыхивает */
export function useAnswerRun(start = 0) {
  const [n, setN] = useState(start);
  const [mood, setMood] = useState('hello');
  const nRef = useRef(start);
  const answer = (ok) => {
    nRef.current = ok ? nRef.current + 1 : 0;
    setN(nRef.current); setMood(ok ? 'joy' : 'cheer');
    tellAnswer(ok);
  };
  return { n, mood, answer, current: () => nRef.current };
}

export function SpecialRun({ n, mood = 'hello' }) {
  const prev = useRef(n);
  const grew = n > prev.current;
  useEffect(() => { prev.current = n; }, [n]);
  return (
    <span className="sp-run" data-testid="special-run" data-n={n} aria-label={`Верных ответов подряд: ${n}`}>
      <style>{CSS}</style>
      {n > 0 && <b key={n} className={grew ? 'grew' : ''}><Zap size={12} aria-hidden="true" />{n}</b>}
      <InflaMeter streak={n} mood={mood} size={30} />
    </span>
  );
}

/* продолжить с места: состояние особого урока — в том же хранилище, что и незаконченные уроки (src/learn/resume.js),
   ключ «<вид>:<id>[:gem]»; сутки, на этом устройстве. saved — что было сохранено при входе (null — начинаем сначала) */
export function useSpecialResume(kind, id, gem = false) {
  const key = `${kind}:${id}${gem ? ':gem' : ''}`;
  const saved = useMemo(() => getResume(key), [key]);
  const done = useRef(false);
  return {
    saved,
    save: (data) => { if (!done.current) saveResume(key, { kind, pos: data.pos || 0, special: data }); },
    drop: () => { done.current = true; dropResume(key); },
    restart: () => { dropResume(key); },
  };
}
// state = сохранённые данные урока или null
export const resumedState = (r) => (r.saved && r.saved.special) || null;

export function ResumeNote({ shown, onRestart }) {
  if (!shown) return null;
  return (
    <div className="sp-resume" data-testid="special-resumed" role="status">
      <style>{CSS}</style>
      Продолжаем с того места, где вы остановились.
      <button type="button" onClick={onRestart} data-testid="special-restart">Начать заново</button>
    </div>
  );
}

export const SPECIAL_CSS = CSS;
