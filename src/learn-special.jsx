/* ОСОБЫЕ УРОКИ КАК ОБЫЧНЫЕ (docs/mechanics.md, «Особые уроки — как обычный урок»). Пункт владельца от 15 ноября
   2026: «в квадратных уроках нет украшений и тем урока, и вообще выглядит не как обычный урок, нету серии
   ответов, Инфли. И нельзя продолжить, только начать заново». Здесь — общее для «Персоналий», «Чтения»,
   «Разбора графика» и «Нарисуй сам»:
     SpecialShell — тема урока из лавки (фон, палитра, отклик на ответ), как у урока;
     SpecialDesk  — украшение урока (гирлянда, мобиле — полосой под шапкой; колыбель — на подставке сбоку);
     useAnswerRun + SpecialHead — шапка как у обычного урока (пункт владельца 16.11: «структура особых уроков всё ещё не
       обычная — по оформлению, по молнии и Инфле»): «✕», полоса прогресса из отрезков (верно — зелёный, ошибка — красный),
       молния «верно подряд» с третьего ответа и Инфля; SpecialLabel — над заданием вид урока и флажок «Сообщить об ошибке»,
       как «Выбор ответа» в уроке;
     useSpecialResume — продолжить с того места, где вышли (сутки, на этом устройстве, как урок); «Продолжить» — кнопкой
       в карточке урока, как у обычного урока, без полосы «Продолжаем…» внутри. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Music } from 'lucide-react';
import { DsRoot, IconButton } from './ds.jsx';
import { InflaMeter, ProgressChart, useMedia } from './ds-art.jsx';
import { StreakFlame } from './learn-flame.jsx';
import { AudioControls } from './MacroSimulator.jsx';
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
  /* шапка — как у урока (.ln-head из src/learn.jsx): колонка 592 px по центру; при прокрутке остаётся сверху */
  /* шапка — одна, без своей подложки-плашки и черты: поверх содержимого — мягкое затухание цвета фона урока */
  /* шапка — на фоне страницы, без полупрозрачной «вуали»-градиента (жалоба 21.11, draw-budget: «сверху отвратительная вуаль
     не по стилю»): содержимое под ней уходит за тонкую линию, как в уроке */
  .sp-top { position: sticky; top: 0; z-index: 3; padding-bottom: 8px; background: var(--ds-paper); box-shadow: 0 1px 0 color-mix(in srgb, var(--ds-rule) 70%, transparent); }
  .sk-on .sp-top { background: linear-gradient(to bottom, color-mix(in srgb, var(--ds-paper) 78%, transparent) 60%, transparent); }
  .sp-top .ln-head { padding-bottom: 6px; }
  /* Инфля серии — прямо в шапке, как в уроке (обёртка с высотой 40 px поджимала её к верхнему краю — пункт владельца 21.11, п. 2) */
  .sp-run { display: contents; }
  /* на ПК шапка и строка вида урока — того же размера, что у урока: урок увеличивается целиком (src/learn.jsx), а шапка
     особых уроков оставалась мелкой (пункт владельца 21.11, п. 2: «в особенных уроках шапка меньше») */
  @media (min-width: 1000px) and (min-height: 836px) { .sp-top .ln-head, .sp-top .sp-label { zoom: 1.1; } }
  @media (min-width: 1200px) and (min-height: 912px) { .sp-top .ln-head, .sp-top .sp-label { zoom: 1.2; } }
  @media (min-width: 1400px) and (min-height: 1003px) { .sp-top .ln-head, .sp-top .sp-label { zoom: 1.32; } }
  /* вид урока над заданием — как «Выбор ответа» в уроке */
  .sp-label { max-width: 592px; margin: 6px auto 0; padding: 0 14px; display: flex; align-items: center; gap: 8px; }
  .sp-label > span.ln-kind { margin: 0; }
  .sp-label > span { flex: 1; min-width: 0; font: 800 11.5px/1.3 var(--ds-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--ds-accent, var(--ds-ok)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* нижняя полоса особого урока — та же, что у урока (.ln-foot): страница особого урока прокручивается, полоса — поверх, у низа */
  .sp-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; }
  .sp-foot > .ln-inner { display: flex; gap: 10px; }
  .sp-foot > .ln-inner > :last-child { flex: 1; }
  .sp-foot.fb > .ds-answer { max-height: 62vh; overflow-y: auto; }
  /* плашка ответа урока внутри страницы особого урока (под вариантами), а не у нижнего края */
  .ds-answer.sp-inline { margin-top: 12px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--ds-rule2); border-top-width: 3px; }
  .ds-answer.sp-inline > div { max-width: none !important; }
  .ds-answer.sp-inline .ln-fb-body { margin-top: 6px; font: 400 15px/1.5 var(--ds-sans); }
  .sp-label .sp-gem { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font: 800 11px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: #fff; background: #3A8FB7; }
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

/* серия верных ответов подряд: засчитывается первая попытка вопроса; ошибка обнуляет. Начинается с бессрочной серии
   (streakNow), как у обычного урока: раньше особый урок начинал с нуля, и серия на экране «сбрасывалась» и показывала
   не то число (пункт владельца 19.11, п. 10: «персоналии почему-то сбрасывают серию верных ответов»). log — первые попытки по
   порядку (отрезки полосы прогресса). Ответ слышат и украшение, и тема (tellAnswer) — колыбель щёлкает, гирлянда
   колышется, тема вспыхивает */
export function useAnswerRun(start = 0, startLog = [], onAnswer = null) {
  const [n, setN] = useState(start);
  const [mood, setMood] = useState('hello');
  const [log, setLog] = useState(() => (Array.isArray(startLog) ? startLog.map(Boolean) : []));
  const nRef = useRef(start); const logRef = useRef(log);
  const answer = (ok) => {
    nRef.current = ok ? nRef.current + 1 : 0;
    logRef.current = [...logRef.current, !!ok];
    setN(nRef.current); setLog(logRef.current); setMood(ok ? 'joy' : 'cheer');
    tellAnswer(ok);
    // в общую серию верных подряд — для задания дня (src/textbook/learn-state.js, tallyAnswer)
    if (onAnswer) onAnswer(!!ok);
  };
  return { n, mood, log, answer, current: () => nRef.current, currentLog: () => logRef.current };
}

/* шапка особого урока — та же, что у урока: «✕», полоса прогресса (answers — верно/неверно по пройденным шагам, total — всего
   шагов), молния «верно подряд» и Инфля. Без серии (подсказка из урока — peek) — только «✕» и полоса */
export function SpecialHead({ closeLabel = 'Выйти из урока', closeTestid, onClose, answers = [], total, run = null, children = null }) {
  /* особый урок — слой поверх страницы, как урок: страница под ним не прокручивается и не показывает свой ползунок —
     на ПК их было два рядом (жалоба 21.11, draw-budget: «почему тут два скролл-ползунка») */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const els = [document.documentElement, document.body]; const was = els.map((el) => el.style.overflow);
    els.forEach((el) => { el.style.overflow = 'hidden'; });
    return () => { els.forEach((el, k) => { el.style.overflow = was[k]; }); };
  }, []);
  return (
    <div className="sp-top" data-testid="special-head">
      <style>{CSS}</style>
      <div className="ln-head">
        <IconButton label={closeLabel} icon={X} data-testid={closeTestid} data-nav="back" onClick={onClose} />
        <ProgressChart answers={answers} total={total} testid="special-progress" />
        {run && <StreakFlame n={run.n} plus={false} />}
        {run && <span className="sp-run" data-testid="special-run" data-n={run.n} aria-label={`Верных ответов подряд: ${run.n}`}><InflaMeter streak={run.n} mood={run.mood} size={34} /></span>}
        {run && <AudioControls wave learn icon={Music} label="Музыка" testid="lesson-music" className="ln-music" />}
      </div>
      {/* вид урока и флажок — в том же блоке шапки, одной полосой, а не второй плашкой (жалоба ученика 16.11, вечер) */}
      {children}
    </div>
  );
}
// над заданием: вид урока и название («ЧТЕНИЕ · НАУКА О ВЫБОРЕ»), отметка «алмаз» и флажок «Сообщить об ошибке» справа
export function SpecialLabel({ kind, title, gem = false, gemTestid, children = null }) {
  return (
    <div className="sp-label" data-testid="special-label">
      <span className="ln-kind">{kind} · {title}</span>
      {gem && <b className="sp-gem" data-testid={gemTestid}>алмаз</b>}
      {children}
    </div>
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

export const SPECIAL_CSS = CSS;
