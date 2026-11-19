/* «НАРИСУЙ САМ» (docs/mechanics.md, «Нарисуй сам»; задания и проверка — src/learn/draws.js): ученик сам
   строит график юнита по условию. Наверху — условие шага, ниже — график (та же сцена, что у «Разбора
   графика», GraphStage), поверх — прозрачный слой, на котором ученик ставит точки (они прилипают к сетке,
   рядом — их координаты и пунктир к осям) или тянет кривую. «Проверить»: верно — нужная линия или точка
   появляется на графике по-настоящему и под ним — что это значит; ошибка — что не так и подсказка, можно
   ещё раз; вторая ошибка — график показывает, как надо, и урок идёт дальше. В конце — итоги, как после урока
   (ExtraResult из src/learn-extra-result.jsx): 15 опыта и монеты — один раз, под итогами — построенный график. */
import { SpecialShell, SpecialDesk, SpecialHead, SpecialLabel, useAnswerRun, useSpecialResume, resumedState } from './learn-special.jsx';
import { useActiveMs } from './learn-clock.js';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowRight, Check, RotateCcw, Lightbulb, Maximize2, Minimize2, Plus, Minus, Hand, Expand, Undo2, ChevronUp, ChevronDown, Paintbrush, Eraser } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button } from './ds.jsx';
import { GraphStage, GRAPH_CSS, W, H, M } from './learn-graph.jsx';
import { CHARTS } from './textbook/charts.js';
import { DRAW_BY_ID, DRAW_XP, isDrawDone, checkTask, solveTask, snapTo, drawScene, drawTour, paintCoverage, PAINT_BRUSH, previewCurve } from './learn/draws.js';
import { tallyAnswer, finishLesson, markDraw, countAnswers, markGem, hasGem, addStudySeconds } from './textbook/learn-state.js';
import { DIAMOND_COLOR } from './ds-tokens.js';
import { ReportFlag, EXPLAIN_REASONS } from './learn-report.jsx';
import { ExtraResult, payExtra } from './learn-extra-result.jsx';
import { FIT_MAX, ZOOM_MAX, fullVb, zoomVb, panVb, pinchVb, vbZoom, vbString } from './lib/view-zoom.js';

const CSS = `
  .dl-task { padding: 14px 16px; margin-bottom: 12px; border-radius: 18px; background: var(--ds-card); border: 1px solid var(--ds-rule2);
    font: 400 16.5px/1.5 var(--ds-sans); animation: gl-rise .45s cubic-bezier(.2, .9, .3, 1) backwards; }
  .dl-task b { color: var(--ds-ink); background: linear-gradient(transparent 60%, color-mix(in srgb, var(--g-gold) 28%, transparent) 60%); }
  .dl-lead { margin: 0 0 8px; color: var(--ds-ink2); font-size: 15px; }
  .dl-how { display: block; margin-top: 6px; font: 600 13px var(--ds-sans); color: var(--ds-ink3); }
  .dl-wrap { position: relative; max-width: 560px; margin: 0 auto; }
  .dl-paint-chip { position: absolute; right: 10px; top: 10px; padding: 3px 10px; border-radius: 999px; font: 700 12.5px var(--ds-sans); font-variant-numeric: tabular-nums; color: var(--ds-ink); background: color-mix(in srgb, var(--g-blue) 14%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--g-blue) 35%, var(--ds-rule2)); pointer-events: none; }
  .dl-wrap .dl-ink { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; margin: 0; touch-action: none; cursor: crosshair;
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .dl-wrap .dl-ink.shift { cursor: ew-resize; }
  .dl-wrap .dl-ink.off { cursor: default; touch-action: auto; }
  .dl-coord { font: 700 11.5px var(--ds-sans); }
  .dl-gem-rules { margin-top: 10px; padding: 9px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; color: var(--ds-ink);
    background: linear-gradient(120deg, color-mix(in srgb, ${DIAMOND_COLOR} 16%, var(--ds-card)), color-mix(in srgb, ${DIAMOND_COLOR} 6%, var(--ds-card)));
    border: 1px solid color-mix(in srgb, ${DIAMOND_COLOR} 45%, transparent); }
  .dl-gem-rules b { display: block; color: ${DIAMOND_COLOR}; letter-spacing: .02em; margin-bottom: 2px; }
  .dl-box[data-gem="true"] .gl-stage { box-shadow: 0 0 0 2px ${DIAMOND_COLOR}, 0 0 28px -8px ${DIAMOND_COLOR}; }
  .dl-gem-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font: 700 11.5px var(--ds-sans); color: #fff; background: ${DIAMOND_COLOR}; flex: none; }
  .dl-table { margin: 10px 0 2px; border-collapse: collapse; font: 400 15px var(--ds-sans); font-variant-numeric: tabular-nums; }
  .dl-table th { padding: 4px 16px 4px 0; text-align: left; font: 600 12.5px var(--ds-sans); color: var(--ds-ink3); border-bottom: 1px solid var(--ds-rule2); }
  .dl-table td { padding: 4px 16px 4px 0; color: var(--ds-ink); border-bottom: 1px solid var(--ds-rule); }
  .dl-table td:first-child { color: var(--ds-ink3); }
  .dl-mini-rows { font-weight: 700; white-space: nowrap; }
  .dl-shift { display: flex; align-items: center; gap: 10px; padding: 8px 12px 6px; font: 600 14px var(--ds-sans); color: var(--ds-ink2); }
  .dl-shift input { flex: 1; accent-color: var(--g-blue); }
  .dl-shift output { min-width: 7.5em; text-align: right; font-weight: 800; color: var(--ds-ink); font-variant-numeric: tabular-nums; }
  .dl-fb { scroll-margin: 90px 0 120px; margin-top: 14px; padding: 14px 16px; border-radius: 18px; font: 400 16px/1.5 var(--ds-sans);
    background: color-mix(in srgb, var(--ds-ok) 10%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--ds-ok) 30%, var(--ds-rule));
    animation: gl-rise .4s cubic-bezier(.2, .9, .3, 1) backwards; }
  .dl-fb.bad { background: color-mix(in srgb, var(--ds-warn, #D9822B) 11%, var(--ds-card)); border-color: color-mix(in srgb, var(--ds-warn, #D9822B) 35%, var(--ds-rule)); }
  .dl-fb.shown { background: color-mix(in srgb, var(--g-blue) 8%, var(--ds-card)); border-color: color-mix(in srgb, var(--g-blue) 26%, var(--ds-rule)); }
  .dl-fb b { font-weight: 800; }
  .dl-fb .dl-hint { display: flex; gap: 8px; margin-top: 6px; color: var(--ds-ink2); }
  .dl-fb .dl-hint svg { flex: none; margin-top: 3px; color: var(--g-gold); }
  .dl-pin { transition: transform .12s; }
  /* «На весь экран»: график — во весь экран, сверху условие, снизу кнопки (на телефоне сетка была мелкой) */
  .dl-box { position: relative; }
  .dl-box .gl-stage { position: relative; }
  /* над графиком, а не поверх него: поверх угла кнопка перехватывала касания точек */
  .dl-tools { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0 0 4px; }
  .dl-full-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 999px; white-space: nowrap; width: auto; line-height: 1;
    border: 1px solid var(--ds-rule2); background: color-mix(in srgb, var(--ds-card) 92%, transparent); color: var(--ds-ink2); font: 600 12.5px var(--ds-sans); cursor: pointer; }
  .dl-full-btn:hover { color: var(--ds-ink); border-color: var(--g-blue); }
  .dl-full-btn svg { width: 14px !important; height: 14px; flex: none; }
  .dl-full-btn[aria-pressed="true"] { color: #fff; background: var(--g-blue); border-color: var(--g-blue); }
  /* приближение: «−», сколько сейчас, «+»; приближено — ещё «Вписать» и «Двигать» */
  .dl-zoom { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .dl-zbtn { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink2); }
  .dl-zbtn:not(:disabled):hover { color: var(--ds-ink); border-color: var(--g-blue); }
  .dl-zbtn:disabled { opacity: .4; cursor: default; }
  .dl-zlevel { min-width: 3.1em; text-align: center; font: 700 12.5px var(--ds-sans); color: var(--ds-ink2); font-variant-numeric: tabular-nums; }
  .dl-wrap.zoomed, .dl-wrap.zoomed > svg { overflow: hidden; }
  .dl-wrap .dl-ink.hand { cursor: grab; touch-action: none; }
  .dl-box.full { position: fixed; inset: 0; z-index: 60; background: var(--ds-paper); display: flex; flex-direction: column; gap: 6px;
    padding: calc(8px + env(safe-area-inset-top)) max(10px, calc((100vw - 1000px) / 2)) calc(8px + env(safe-area-inset-bottom)); }
  .dl-box.full .dl-mini { font: 400 14.5px/1.35 var(--ds-sans); max-height: min(9.5em, 26vh); overflow: auto; padding: 0 2px; flex: none; }
  .dl-box.full .dl-mini b { font-weight: 800; }
  @media (min-width: 720px) { .dl-box.full .dl-mini { font-size: 16px; } }
  /* график — по своим пропорциям и посередине свободного места: подписи не растягиваются, а пустота — бумага,
     а не белая карточка; крупнее, чем вдвое, не растёт — дальше приближают (docs/mechanics.md, «Нарисуй сам») */
  .dl-box.full .gl-stage { flex: 1; min-height: 0; display: flex; flex-direction: column; margin: 0; padding: 0; background: none; border: 0; box-shadow: none; }
  .dl-box.full .dl-fit { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; overflow: hidden; }
  .dl-box.full .dl-tools { margin: 0; flex: none; max-width: 100%; }
  .dl-box.full .dl-wrap { flex: none; max-width: none; margin: 0; background: var(--ds-card); border: 1px solid var(--ds-rule2); border-radius: 16px; overflow: hidden; }
  .dl-box.full .dl-wrap > svg { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; margin: 0; }
  .dl-box.full .dl-ink { touch-action: none; }
  @media (max-height: 520px) { .dl-box.full .dl-mini { max-height: 2.8em; font-size: 13.5px; } }
  .dl-box.full .dl-mini-fb { font: 600 14px/1.35 var(--ds-sans); padding: 6px 10px; border-radius: 10px; background: color-mix(in srgb, var(--ds-ok) 10%, var(--ds-card)); }
  .dl-box.full .dl-mini-fb.bad { background: color-mix(in srgb, var(--ds-warn, #D9822B) 12%, var(--ds-card)); }
  .dl-full-row { display: flex; gap: 8px; }
  .dl-fhead { display: flex; align-items: center; gap: 10px; flex: none; }
  .dl-fstep { font: 800 13px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--g-blue); }
  .dl-fdots { display: flex; gap: 5px; flex: 1; } .dl-fdots i { width: 9px; height: 9px; border-radius: 50%; background: var(--ds-rule2); }
  .dl-fdots i.on { background: var(--g-blue); transform: scale(1.2); } .dl-fdots i.ok { background: var(--ds-ok); }
  .dl-pts { display: flex; flex-wrap: wrap; gap: 6px; flex: none; }
  .dl-pt { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px 4px 10px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--g-blue) 40%, var(--ds-rule2));
    background: color-mix(in srgb, var(--g-blue) 8%, var(--ds-card)); color: var(--ds-ink); font: 600 13px var(--ds-mono, monospace); cursor: pointer; }
  .dl-pt:hover { border-color: var(--ds-bad); } .dl-pt svg { opacity: .6; }
  .dl-box.full .dl-ink:focus-visible { outline: 3px solid var(--g-blue); outline-offset: -3px; }
  .dl-full-btn:disabled { opacity: .45; cursor: default; }
  .dl-full-row > :last-child { flex: 1; }
  /* Редизайн 18.11 (жалобы mwm30dxk и mwm31hpr, draw-inflation: «кнопки на весь экран не по стилю», «почему тут страшное
     открытие на весь экран, а не красивое современное, как с числовой плоскостью»). Одна система кнопок с числовой
     плоскостью (src/plane-view.jsx): 36 px, скругление 12, карточка с рамкой; масштаб — одной капсулой «− ×1,0 +». */
  .dl-full-btn { height: 36px; padding: 0 12px; border-radius: 12px; gap: 6px; font: 600 13px var(--ds-sans); background: var(--ds-card);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--ds-ink) 6%, transparent); transition: border-color .15s, background .15s, transform .12s; }
  .dl-full-btn:active:not(:disabled) { transform: scale(.96); }
  .dl-full-btn svg { width: 15px !important; height: 15px; }
  .dl-full-btn.accent { color: var(--g-blue); border-color: color-mix(in srgb, var(--g-blue) 45%, var(--ds-rule2)); }
  .dl-full-btn.accent:hover { background: color-mix(in srgb, var(--g-blue) 8%, var(--ds-card)); }
  .dl-seg { display: inline-flex; align-items: stretch; height: 36px; border: 1px solid var(--ds-rule2); border-radius: 12px; background: var(--ds-card); overflow: hidden;
    box-shadow: 0 1px 0 color-mix(in srgb, var(--ds-ink) 6%, transparent); }
  .dl-seg .dl-zbtn { width: 38px; height: auto; border: 0; border-radius: 0; background: none; }
  .dl-seg .dl-zbtn:not(:disabled):hover { background: color-mix(in srgb, var(--g-blue) 10%, transparent); color: var(--g-blue); }
  .dl-seg .dl-zlevel { display: grid; place-items: center; min-width: 3.6em; border-left: 1px solid var(--ds-rule2); border-right: 1px solid var(--ds-rule2); font: 700 12.5px var(--ds-mono, monospace); }
  .dl-tools { gap: 8px; margin: 0 0 8px; }
  .dl-zoom { gap: 8px; }
  /* во весь экран — как числовая плоскость: шапка с названием, шагом и крестиком; задание — карточкой с полосой темы;
     поле — крупной карточкой с тенью; внизу — «Сбросить» и «Проверить» */
  .dl-box.full { gap: 10px; animation: dl-full-in .22s ease-out;
    background: radial-gradient(120% 70% at 50% -20%, color-mix(in srgb, var(--g-blue) 10%, var(--ds-paper)), var(--ds-paper) 62%), var(--ds-paper); }
  @keyframes dl-full-in { from { opacity: 0; } }
  .dl-fhead { gap: 10px; min-height: 40px; }
  .dl-ftitle { flex: 1; min-width: 0; font: 800 15px/1.25 var(--ds-sans); color: var(--ds-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dl-ftitle small { display: block; font: 800 10.5px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--ds-ink3); }
  .dl-fstep { padding: 5px 10px; border-radius: 999px; font-size: 12px; background: color-mix(in srgb, var(--g-blue) 12%, var(--ds-card)); white-space: nowrap; }
  .dl-fdots { flex: none; }
  .dl-fclose { width: 40px; height: 40px; flex: none; display: grid; place-items: center; padding: 0; border-radius: 12px; cursor: pointer; border: 1px solid var(--ds-rule2);
    background: var(--ds-card); color: var(--ds-ink); transition: border-color .15s, transform .12s; }
  .dl-fclose:hover { border-color: var(--g-blue); } .dl-fclose:active { transform: scale(.92); }
  .dl-box.full .dl-mini { padding: 10px 14px; border-radius: 14px; background: var(--ds-card); border: 1px solid var(--ds-rule2); border-left: 4px solid var(--g-blue); }
  .dl-box.full .dl-wrap { border-radius: 18px; box-shadow: 0 22px 44px -30px rgba(0,0,0,.5); }
  .dl-box.full .dl-full-row { align-items: stretch; }
  @media (max-width: 560px) { .dl-fdots { display: none; } .dl-ftitle { font-size: 14px; } }
  @media (prefers-reduced-motion: reduce) { .dl-task, .dl-fb, .dl-box.full { animation: none; } }
`;

const rich = (t) => String(t).split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const HOW = {
  line: 'Проведите линию: нажмите в первой точке и протяните до второй — или нажмите в двух местах. Точки прилипают к сетке; точку можно перетащить, а касанием — убрать.',
  points: 'Каждая строка таблицы — точка на графике; точки прилипают к сетке, их можно перетащить, а касанием — убрать.',
  point: 'Нажмите на график — точку можно перетащить, а касанием — убрать.',
  shift: 'Потяните график пальцем или мышью вбок — или двигайте ползунок под ним.',
  area: 'Нажмите внутрь нужной области.',
};

export default function DrawLesson({ id, learn, update, onClose, gem = false }) {
  const d = DRAW_BY_ID[id];
  const tour = useMemo(() => (d ? drawTour(d) : null), [d]);
  // вышли посреди задания — продолжаем с того же шага (learn-special.jsx)
  const resume = useSpecialResume('draw', id, gem);
  const was = resumedState(resume);
  // первые попытки шагов (отрезки полосы прогресса) — переживают выход, как и серия
  const run = useAnswerRun(was ? was.run || 0 : 0, was ? was.log || [] : [], (ok) => { if (update) update((st) => tallyAnswer(st, ok)); });
  const [i, setI] = useState(() => (was ? was.i : 0));
  const [phase, setPhase] = useState('task'); // task → done
  const [pts, setPts] = useState([]);
  /* «закрасить область»: pts — точки мазков, у каждой s — номер мазка; tool — кисть или ластик (пункт владельца 18.11: «нельзя
     стирать накрашенное, и когда красишь — почему-то точка, а не кисточка»); history — снимки до каждого мазка (для «Отменить») */
  const strokes = useRef(0);
  const history = useRef([]);
  const [tool, setTool] = useState('brush');
  const [v, setV] = useState(0);
  const [hover, setHover] = useState(null);
  const [tries, setTries] = useState(0);
  const [res, setRes] = useState(null); // { ok, why } | { shown: true }
  const [result, setResult] = useState(null); // итоги урока: опыт, монеты, выплаты
  const firstTry = useRef(was ? was.firstTry || 0 : 0);
  const activeMs = useActiveMs(was ? was.ms || 0 : 0);
  useEffect(() => {
    if (phase === 'done') { resume.drop(); return; }
    if (i > 0) resume.save({ pos: i, i, firstTry: firstTry.current, run: run.current(), log: run.currentLog(), ms: activeMs() });
  }, [i, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const root = useRef(null);
  const ink = useRef(null);
  const drag = useRef(null);
  const fb = useRef(null);
  const [already] = useState(() => isDrawDone(learn, id));
  /* «На весь экран»: свой слой поверх урока; где можно — ещё и полноэкранный режим браузера с поворотом в альбомный */
  const [full, setFull] = useState(false);
  /* на весь экран (пункт владельца 15.11: «раскрытие на весь экран всё ещё отвратительное — полный редизайн и куча
     фич»): задание сворачивается, перекрестие к осям, список точек с удалением, «Отменить» (Ctrl+Z), клавиатура */
  const [taskOpen, setTaskOpen] = useState(true);
  const [kc, setKc] = useState(null); // курсор клавиатуры — точка на сетке
  const fullRef = useRef(false);
  fullRef.current = full;
  /* приближение графика (docs/mechanics.md, «Нарисуй сам»): окно viewBox у обоих слоев — графика и поля точек,
     поэтому точки ставятся туда же, куда смотрит ученик (getScreenCTM учитывает окно). Щипок двумя пальцами,
     колёсико (во весь экран; в уроке — щипок тачпада), «+» / «−»; приближенное двигают «Двигать» или средней кнопкой */
  const [vb, setVbState] = useState(() => fullVb(W, H));
  const vbRef = useRef(vb);
  const setVb = (nv) => { vbRef.current = nv; setVbState(nv); };
  const [handOn, setHand] = useState(false);
  const wrap = useRef(null);
  const fitArea = useRef(null);
  const [fitBox, setFitBox] = useState(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const pan = useRef(null);
  const lockTouch = useRef(false); // после щипка, пока не убраны все пальцы, — не рисуем
  const goFull = () => {
    Audio.play('click'); setFull(true);
    try {
      const el = root.current;
      if (el && el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().then(() => { try { if (window.screen.orientation && window.screen.orientation.lock) window.screen.orientation.lock('landscape').catch(() => {}); } catch { /* не телефон */ } }).catch(() => {});
      }
    } catch { /* браузер не умеет — хватит слоя */ }
  };
  const leaveFull = () => {
    Audio.play('click'); setFull(false);
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); if (window.screen.orientation && window.screen.orientation.unlock) window.screen.orientation.unlock(); } catch { /* ничего */ }
  };
  // вышли из полноэкранного режима жестом «назад» — слой тоже сворачивается
  useEffect(() => {
    const on = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  useEffect(() => { if (root.current) root.current.scrollTo({ top: 0 }); }, [i, phase]);
  // ответ проверен — разбор под графиком в поле зрения (на телефоне он уходил под нижнюю панель)
  useEffect(() => { if (res && fb.current && fb.current.scrollIntoView) fb.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [res]);
  // Esc во весь экран — сначала сворачивает график, а не закрывает урок
  useEffect(() => { const esc = (e) => { if (e.key !== 'Escape') return; if (fullRef.current) { setFull(false); try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch { /* ничего */ } } else onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);
  // во весь экран: график по своим пропорциям вписан в свободное место, но не крупнее, чем вдвое
  useLayoutEffect(() => {
    if (!full) { setFitBox(null); return undefined; }
    const el = fitArea.current;
    if (!el) return undefined;
    // кнопки масштаба — прямо над графиком, в той же колонке: их высоту вычитаем
    const measure = () => {
      const r = el.getBoundingClientRect(); const tools = el.querySelector('.dl-tools');
      const k = Math.min(r.width / W, (r.height - (tools ? tools.offsetHeight + 4 : 0)) / H, FIT_MAX);
      if (k > 0) setFitBox({ w: Math.floor(W * k), h: Math.floor(H * k) });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [full, phase, i]);
  // колёсико: во весь экран — приближает к курсору; в уроке — только щипок тачпада (ctrl), иначе листает страницу.
  // Щипок тачпада в Safari — gesture-события
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const at = (e) => { const svg = ink.current; if (!svg || !svg.getScreenCTM) return null; return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); };
    const wheel = (e) => {
      if (!fullRef.current && !e.ctrlKey) return;
      e.preventDefault();
      const p = at(e); if (!p) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      setVb(zoomVb(vbRef.current, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), p.x, p.y, W, H));
    };
    let gs = 1;
    const gStart = (e) => { e.preventDefault(); gs = 1; };
    const gChange = (e) => { e.preventDefault(); const p = at(e); if (!p) return; const f = e.scale / gs; gs = e.scale; setVb(zoomVb(vbRef.current, f, p.x, p.y, W, H)); };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gStart, { passive: false });
    el.addEventListener('gesturechange', gChange, { passive: false });
    return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('gesturestart', gStart); el.removeEventListener('gesturechange', gChange); };
  }, [phase, i]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return null;
  const n = d.tasks.length;
  const t = d.tasks[Math.min(i, n - 1)];
  const resolved = !!res && (res.ok || res.shown);
  const sc = drawScene(d, {});
  const [x0, x1] = sc.xDomain; const [y0, y1] = sc.yDomain;
  const sx = (x) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (y) => H - M.b - ((y - y0) / (y1 - y0)) * (H - M.t - M.b);
  const ctl = t.do === 'shift' ? CHARTS[d.chart].controls(d.attrs).find((c) => c.id === t.control) : null;
  const clampV = (x) => (ctl ? Math.max(ctl.min, Math.min(ctl.max, Math.round(x / d.snap[0]) * d.snap[0])) : x);
  // сколько точек ставит ученик: линия — две, таблица — по строке, точка и площадь — одну
  const maxPts = t.do === 'line' ? 2 : t.do === 'points' ? t.at.length : t.do === 'area' ? Infinity : 1;
  // ответ ученика в виде, который понимает checkTask
  const answer = t.do === 'line' ? (pts.length === 2 ? { a: pts[0], b: pts[1] } : null) : t.do === 'points' ? (pts.length === maxPts ? { ps: pts } : null)
    : t.do === 'shift' ? { v } : t.do === 'area' ? (pts.length ? { paint: pts } : null) : pts.length ? { p: pts[0] } : null;
  const ready = t.do === 'shift' ? v !== 0 : t.do === 'area' ? pts.length > 0 : pts.length === maxPts;
  // сколько области уже закрашено — подпись под графиком
  const cov = t.do === 'area' && pts.length ? paintCoverage(d, t, pts) : null;
  // кисть на экране: радиус в долях осей → в точках поля (по ширине и по высоте)
  const brushPx = PAINT_BRUSH * Math.min(W - M.l - M.r, H - M.t - M.b);
  const z = vbZoom(vb, W);
  const zoomed = z > 1.01;
  const hand = handOn && zoomed;
  const pz = vb.w / W; // точки, подписи и пунктир — одного размера на экране при любом приближении
  const zoomBy = (f) => { Audio.play('tick'); const c = vbRef.current; setVb(zoomVb(c, f, c.x + c.w / 2, c.y + c.h / 2, W, H)); };
  const zoomFit = () => { Audio.play('tick'); setVb(fullVb(W, H)); setHand(false); };
  const vbAt = (cx, cy) => new DOMPoint(cx, cy).matrixTransform(ink.current.getScreenCTM().inverse());
  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const m = vbAt((a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch.current = { v0: vbRef.current, d0: Math.hypot(a.x - b.x, a.y - b.y), m0: { x: m.x, y: m.y } };
  };

  // экран → данные графика: viewBox слоя совпадает со сценой, getScreenCTM учитывает масштаб
  const toData = (e) => {
    const svg = ink.current; if (!svg || !svg.getScreenCTM) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const x = x0 + ((p.x - M.l) / (W - M.l - M.r)) * (x1 - x0);
    const y = y0 + ((H - M.b - p.y) / (H - M.t - M.b)) * (y1 - y0);
    return { x: Math.max(x0, Math.min(x1, x)), y: Math.max(y0, Math.min(y1, y)) };
  };
  const place = (raw) => (t.do === 'area' ? { x: Math.round(raw.x), y: Math.round(raw.y) } : snapTo(d, raw));
  const touch = () => { if (res && !resolved) setRes(null); };
  const down = (e) => {
    if (!ink.current || !ink.current.getScreenCTM) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старый браузер */ }
    // второй палец — щипок: то, что успел сделать первый (точка, сдвиг), отменяется
    if (pointers.current.size >= 2) {
      e.preventDefault();
      const dr = drag.current;
      if (dr && dr.before) setPts(dr.before);
      if (dr && t.do === 'shift' && dr.v != null) setV(dr.v);
      drag.current = null; pan.current = null; lockTouch.current = true; setHover(null);
      startPinch();
      return;
    }
    // «Двигать» или средняя кнопка мыши — сдвигаем приближенный график, точки не ставим
    if (zoomed && (hand || e.button === 1)) { e.preventDefault(); pan.current = { x: e.clientX, y: e.clientY, v0: vbRef.current }; return; }
    if (resolved || phase !== 'task') return;
    const raw = toData(e); if (!raw) return;
    e.preventDefault();
    touch();
    if (t.do === 'shift') { drag.current = { x: raw.x, v }; return; }
    // закрасить область: новый мазок с этой точки
    if (t.do === 'area') {
      history.current = [...history.current, pts];
      if (tool === 'erase') { setPts(eraseAt(pts, raw)); drag.current = { erase: true, before: pts }; return; }
      strokes.current += 1; setPts([...pts, { ...raw, s: strokes.current }]); drag.current = { paint: true, before: pts }; return;
    }
    const p = place(raw);
    // касание прямо в поставленную точку: отпустили, не сдвинув, — точка убирается; потянули — едет за пальцем
    const near = pts.map((q, k) => ({ k, dd: Math.hypot(sx(q.x) - sx(raw.x), sy(q.y) - sy(raw.y)) })).sort((a, b) => a.dd - b.dd)[0];
    const onPin = t.do !== 'area' && near && near.dd < 16 * pz;
    if (onPin) { drag.current = { k: near.k, x: e.clientX, y: e.clientY, tap: true, before: pts }; return; }
    if (t.do === 'line' || t.do === 'points') {
      // все уже стоят — переставляем ближнюю
      const k = near && pts.length >= maxPts ? near.k : pts.length;
      const next = [...pts]; next[k] = p; setPts(next);
      /* линия с первой точки — протягивается (пункт ученика 17.11: «тут нет рисования»): ведёте от первой точки, вторая едет
         за пальцем; отпустили на месте — осталась одна точка, как при касании */
      drag.current = t.do === 'line' && pts.length === 0 ? { k, before: pts, stretch: true, x: e.clientX, y: e.clientY } : { k, before: pts };
    } else { setPts([p]); drag.current = { k: 0, before: pts }; }
    Audio.play('tick');
  };
  const move = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const r = ink.current.getBoundingClientRect();
      setVb(pinchVb(pinch.current.v0, pinch.current.d0, pinch.current.m0, Math.hypot(a.x - b.x, a.y - b.y), ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height, W, H));
      return;
    }
    if (pan.current) { const r = ink.current.getBoundingClientRect(); setVb(panVb(pan.current.v0, e.clientX - pan.current.x, e.clientY - pan.current.y, r.width, W, H)); return; }
    if (lockTouch.current) return;
    const raw = toData(e); if (!raw) return;
    if (!drag.current) { if (e.pointerType === 'mouse' && !resolved && !hand && t.do !== 'shift') setHover(t.do === 'area' ? raw : place(raw)); return; }
    if (drag.current.erase) { setHover(raw); setPts((prev) => eraseAt(prev, raw)); return; }
    if (t.do === 'shift') { setV(clampV(drag.current.v + (raw.x - drag.current.x))); return; }
    // мазок кистью: точка — когда кисть ушла хотя бы на пятую часть своего радиуса
    if (drag.current.paint) {
      setHover(raw);
      setPts((prev) => { const last = prev[prev.length - 1]; if (last && last.s === strokes.current && Math.hypot((raw.x - last.x) / (x1 - x0), (raw.y - last.y) / (y1 - y0)) < PAINT_BRUSH / 5) return prev; return [...prev, { ...raw, s: strokes.current }]; });
      return;
    }
    // протягивание линии: палец ушёл от первой точки — появилась вторая, дальше она едет за ним
    if (drag.current.stretch) {
      if (Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) < 12) return;
      const p2 = place(raw);
      setPts((prev) => [prev[0], p2]); drag.current = { k: 1, before: drag.current.before, drawn: true }; setHover(null);
      return;
    }
    // от касания точки — в перетаскивание, только когда палец сдвинулся заметно
    if (drag.current.tap) { if (Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) < 6) return; drag.current = { k: drag.current.k, before: drag.current.before }; }
    const p = place(raw); const k = drag.current.k;
    setPts((prev) => { const next = [...prev]; next[k] = p; return next; });
  };
  const release = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) { pan.current = null; lockTouch.current = false; }
  };
  const up = (e) => {
    const wasLocked = lockTouch.current || !!pan.current;
    release(e);
    const dr = drag.current; drag.current = null;
    if (!wasLocked && dr && dr.tap) { Audio.play('tick'); setPts((prev) => prev.filter((_, j) => j !== dr.k)); }
  };
  const cancel = (e) => { release(e); drag.current = null; };

  const check = () => {
    if (!ready || resolved) return;
    const r = checkTask(d, t, answer);
    setHover(null);
    if (r.ok) {
      if (tries === 0) { firstTry.current += 1; run.answer(true); }
      Audio.play('coin'); setRes({ ok: true }); return;
    }
    if (tries === 0) run.answer(false);
    Audio.play('down');
    // алмазный уровень — одна попытка: ошибка — сразу «вот как надо» (docs/mechanics.md, «Особые уроки юнита»)
    if (tries >= 1 || gem) { setRes({ shown: true, why: r.why }); setTries(tries + 1); return; }
    setTries(1); setRes({ ok: false, why: r.why });
  };
  const finish = () => {
    Audio.play('register');
    const right = firstTry.current; const accuracy = Math.round((right / n) * 100);
    const seconds = Math.min(900, activeMs() / 1000);
    if (gem && update) {
      // алмаз — все шаги с первой (и единственной) попытки; опыт и монеты — за первый взятый
      const won = right === n; const had = hasGem(learn, id);
      const apply = (s) => { const t = countAnswers(s, right, n); return won && !had ? markGem(finishLesson(t, null, { xp: DRAW_XP, accuracy: 100, seconds, kind: 'draw', extra: { fresh: false } }), id) : addStudySeconds(t, seconds); };
      const pay = payExtra(learn, update, apply, { id, diamond: true, won, gem: had, accuracy });
      setResult({ xp: won && !had ? DRAW_XP : 0, right, total: n, ms: activeMs(), diamond: true, won, replay: won && had, ...pay });
      setPhase('done');
      return;
    }
    // шаги, верные с первой попытки, — в задание дня «N верных ответов», и при повторе (docs/mechanics.md);
    // впервые — опыт и монеты, как за урок, и всё, что урок выполнил (settle)
    const apply = (s) => { const t = countAnswers(s, right, n); return already ? addStudySeconds(t, seconds) : markDraw(finishLesson(t, null, { xp: DRAW_XP, accuracy, seconds, kind: 'draw', extra: { fresh: true } }), id); };
    const pay = update ? payExtra(learn, update, apply, { id, fresh: !already, accuracy }) : { coins: 0, gains: [], streakUp: 0 };
    setResult({ xp: already ? 0 : DRAW_XP, right, total: n, ms: activeMs(), replay: already, ...pay });
    setPhase('done');
  };
  const next = () => {
    if (i >= n - 1) { finish(); return; }
    Audio.play('paper');
    setI(i + 1); setPts([]); strokes.current = 0; history.current = []; setTool('brush'); setV(0); setTries(0); setRes(null); setHover(null); setVb(fullVb(W, H)); setHand(false);
  };
  const reset = () => { Audio.play('tick'); if (pts.length) history.current = [...history.current, pts]; setPts([]); setV(0); touch(); };

  // что видно на графике: решено — шаг вперёд (новое появляется), иначе — как было плюс то, что нужно шагу
  const k = phase === 'done' ? n : i + (resolved ? 1 : 0);
  const sol = res && res.shown ? solveTask(d, t) : null;
  const solveView = sol && !sol.paint ? (sol.ps || (sol.a ? [sol.a, sol.b] : sol.p ? [sol.p] : [])).map((q) => [Math.round(sx(q.x) * 10) / 10, Math.round(sy(q.y) * 10) / 10]) : [];
  const testAnswer = (() => { const s = solveTask(d, t); return JSON.stringify(s.v != null ? { v: s.v } : s.paint ? { pts: s.paint.map((q) => [sx(q.x), sy(q.y)]) } : { pts: (s.ps || (s.a ? [s.a, s.b] : [s.p])).map((q) => [sx(snapTo(d, q).x), sy(snapTo(d, q).y)]) }); })();
  const mine = res && res.shown ? 'var(--g-rust)' : 'var(--g-blue)';
  // расстояние в долях осей; ластик убирает мазки в круге кисти; мазок рисуется кусками — там, где ластик прошёл, разрыв
  const nd = (a, b) => Math.hypot((a.x - b.x) / (x1 - x0), (a.y - b.y) / (y1 - y0));
  function eraseAt(list, q) { return list.filter((p) => nd(p, q) > PAINT_BRUSH * 1.15); }
  function paintSegments(list) {
    const out = []; let cur = null;
    for (const p of list) {
      if (cur && cur.s === p.s && nd(cur.pts[cur.pts.length - 1], p) <= PAINT_BRUSH * 0.9) cur.pts.push(p);
      else { cur = { s: p.s, pts: [p] }; out.push(cur.pts); }
    }
    return out;
  }
  const coordLabel = (q) => `${fmt(q.x)}; ${fmt(q.y)}`;
  // поставить точку в q — как касание (линия и таблица: следующая или ближняя, если все стоят)
  const placeAt = (q) => {
    if (resolved || phase !== 'task' || t.do === 'shift') return;
    touch();
    const p = place(q);
    if (t.do === 'line' || t.do === 'points') {
      const near = pts.map((r, k) => ({ k, dd: Math.hypot(sx(r.x) - sx(p.x), sy(r.y) - sy(p.y)) })).sort((a, b) => a.dd - b.dd)[0];
      const k = near && pts.length >= maxPts ? near.k : pts.length;
      const next = [...pts]; next[k] = p; setPts(next);
    } else if (t.do === 'area') { history.current = [...history.current, pts]; if (tool === 'erase') setPts(eraseAt(pts, q)); else { strokes.current += 1; setPts([...pts, { ...q, s: strokes.current }]); } } else setPts([p]);
    Audio.play('tick');
  };
  const undoPt = () => {
    if (resolved || (!pts.length && !(t.do === 'area' && history.current.length))) return; Audio.play('tick'); touch();
    // закрашивание — отменяется весь последний мазок или ластик (снимок до него)
    if (t.do === 'area') { const prev = history.current[history.current.length - 1] || []; history.current = history.current.slice(0, -1); setPts(prev); return; }
    setPts(pts.slice(0, -1));
  };
  const dropPt = (k) => { if (resolved) return; Audio.play('tick'); touch(); setPts(pts.filter((_, j) => j !== k)); };
  // клавиатура на весь экран: стрелки — курсор по сетке (Shift — ×5), Enter или пробел — точка, Ctrl+Z — отменить
  const onKeys = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я')) { e.preventDefault(); undoPt(); return; }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (t.do === 'shift' && dir && dir[0] && !resolved) { e.preventDefault(); touch(); setV(clampV(v + dir[0] * d.snap[0] * (e.shiftKey ? 5 : 1))); return; }
    if (dir) {
      e.preventDefault();
      const m = e.shiftKey ? 5 : 1;
      const c = kc || place({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
      const q = { x: Math.max(x0, Math.min(x1, c.x + dir[0] * d.snap[0] * m)), y: Math.max(y0, Math.min(y1, c.y + dir[1] * d.snap[1] * m)) };
      setKc(q); setHover(q); return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && kc) { e.preventDefault(); placeAt(kc); }
  };
  // перекрестие: от точки под курсором — пунктир к осям и значения на них
  const cross = (q) => {
    const cx = sx(q.x); const cy = sy(q.y);
    const tag = (x, y, text, anchor) => (
      <g key={text + anchor}><rect x={anchor === 'end' ? x - (text.length * 7.4 + 10) * pz : x - (text.length * 3.7 + 5) * pz} y={y - 11 * pz} width={(text.length * 7.4 + 10) * pz} height={20 * pz} rx={6 * pz} fill="var(--g-blue)" />
        <text x={anchor === 'end' ? x - 5 * pz : x} y={y + 4 * pz} fontSize={12.5 * pz} fontWeight="700" fill="#fff" textAnchor={anchor}>{text}</text></g>
    );
    return (
      <g pointerEvents="none" data-testid="draw-cross">
        <line x1={cx} x2={cx} y1={cy} y2={H - M.b} stroke="var(--g-blue)" strokeWidth={1.4 * pz} strokeDasharray={`${4 * pz} ${4 * pz}`} />
        <line x1={M.l} x2={cx} y1={cy} y2={cy} stroke="var(--g-blue)" strokeWidth={1.4 * pz} strokeDasharray={`${4 * pz} ${4 * pz}`} />
        {tag(cx, H - M.b + 14 * pz, fmt(q.x), 'middle')}
        {tag(M.l - 2 * pz, cy, fmt(q.y), 'end')}
      </g>
    );
  };
  // у правого края окна подпись — слева от точки
  const nearRight = (q) => sx(q.x) > vb.x + vb.w - 80 * pz;
  const pin = (q, key, col, label) => (
    <g key={key} className="dl-pin" data-pin={key}>
      <line x1={sx(q.x)} x2={sx(q.x)} y1={sy(q.y)} y2={H - M.b} stroke={col} strokeOpacity=".45" strokeWidth={pz} strokeDasharray={`${3 * pz} ${4 * pz}`} />
      <line x1={sx(q.x)} x2={M.l} y1={sy(q.y)} y2={sy(q.y)} stroke={col} strokeOpacity=".45" strokeWidth={pz} strokeDasharray={`${3 * pz} ${4 * pz}`} />
      <circle cx={sx(q.x)} cy={sy(q.y)} r={6.5 * pz} fill="var(--ds-card)" stroke={col} strokeWidth={3 * pz} />
      {label && <text className="dl-coord" style={{ fontSize: `${11.5 * pz}px` }} x={sx(q.x) + (nearRight(q) ? -10 : 10) * pz} y={sy(q.y) - 10 * pz} textAnchor={nearRight(q) ? 'end' : 'start'} fill={col} stroke="var(--ds-card)" strokeWidth={4 * pz} paintOrder="stroke">{label}</text>}
    </g>
  );
  // линия через две точки ученика — до краёв поля, пунктиром: видно, куда она пойдёт; у кривой (сложный процент,
  // выручка, издержки) — той же формы, что нужная кривая (previewCurve в src/learn/draws.js)
  const targetCurve = t.do === 'line' ? (drawScene(d, t.values || {}).curves || []).find((c) => c.id === t.el) : null;
  const curvePath = (a, b) => {
    const cp = previewCurve(targetCurve, a, b, [x0, x1]);
    return cp ? cp.map((q, k) => `${k ? 'L' : 'M'}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ') : null;
  };
  const through = () => {
    if (t.do !== 'line' || pts.length !== 2 || (pts[0].x === pts[1].x && pts[0].y === pts[1].y)) return null;
    const cd = curvePath(pts[0], pts[1]);
    if (cd) return <path d={cd} fill="none" stroke={mine} strokeWidth={2.2 * pz} strokeDasharray={`${7 * pz} ${6 * pz}`} strokeOpacity=".75" clipPath={`url(#dlc${id})`} data-testid="draw-through" data-shape="curve" />;
    const [a, b] = pts; const dx = b.x - a.x; const dy = b.y - a.y;
    const far = 4 * Math.max(x1 - x0, y1 - y0) / Math.max(1e-9, Math.hypot(dx, dy));
    const p = { x: a.x - dx * far, y: a.y - dy * far }; const q = { x: a.x + dx * far, y: a.y + dy * far };
    return <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(q.x)} y2={sy(q.y)} stroke={mine} strokeWidth={2.2 * pz} strokeDasharray={`${7 * pz} ${6 * pz}`} strokeOpacity=".75" clipPath={`url(#dlc${id})`} data-testid="draw-through" data-shape="line" />;
  };

  const body = (
    <div className="gl" ref={root} role="dialog" aria-label={`Нарисуй сам: ${d.title}`} data-testid="draw-lesson" data-id={id} data-phase={phase} data-task={i}>
      <style>{GRAPH_CSS}</style>
      <style>{CSS}</style>
      <div className="gl-head">
        {/* шапка как у урока: «✕», полоса прогресса по шагам, молния «верно подряд» и Инфля (learn-special.jsx) */}
        <SpecialHead closeLabel="Закрыть" closeTestid="draw-close" onClose={() => { Audio.play('paper'); onClose(); }} run={run}
          total={n} answers={run.log.slice(0, n)} >
        <SpecialLabel kind="Нарисуй сам" title={d.title} gem={gem} gemTestid="draw-gem-tag">
          <ReportFlag withText text="Ошибка?" reasons={EXPLAIN_REASONS} sub="Что не так в задании? Шаг, его текст и устройство приложатся сами." context={() => ({
            screen: 'draw', lesson: id, unit: d.unitId, kind: 'draw',
            step: (phase === 'done' ? 'итог' : `шаг ${i + 1} из ${n}`) + (gem ? ' (алмаз)' : ''),
            prompt: (phase === 'done' ? d.title : t.text).replace(/\*\*/g, '').slice(0, 1500),
            answer: answer ? JSON.stringify(answer).slice(0, 300) : '',
          })} />
        </SpecialLabel>
        </SpecialHead>
      </div>
      <SpecialDesk learn={learn} />
      {phase === 'task' && (
        <div className="gl-page">
          <div className="dl-task" key={i} data-testid="draw-task" data-do={t.do}>
            {i === 0 && <p className="dl-lead">{rich(d.intro)}</p>}
            <span className="gl-step">Шаг {i + 1} из {n}</span>
            <div>{rich(t.text)}</div>
            {t.do === 'points' && (
              <table className="dl-table" data-testid="draw-table">
                <thead><tr><th>Вариант</th>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{t.at.map((q, j) => <tr key={j}><td>{j + 1}</td><td>{fmt(q.x)}</td><td>{fmt(q.y)}</td></tr>)}</tbody>
              </table>
            )}
            {!resolved && <span className="dl-how">{HOW[t.do]}</span>}
            {/* алмаз — не тот же урок с меткой (жалоба ученика 18.11: «а в чём отличие от обычного урока»): одна попытка, без
                координат под курсором, без процента закраски и без подсказки — по памяти и по графику */}
            {gem && !resolved && <div className="dl-gem-rules" data-testid="draw-gem-rules"><b>◆ Алмазный уровень</b> Одна попытка на шаг — ошибка сразу покажет решение. Без координат под курсором и без процента закраски: стройте по графику и по памяти.</div>}
          </div>
          <div className={`dl-box${full ? ' full' : ''}`} data-testid="draw-box" data-full={String(full)} data-zoom={z.toFixed(2)} data-gem={String(!!gem)}>
          {full && (
            <div className="dl-fhead" data-testid="draw-full-head">
              <span className="dl-ftitle"><small>Нарисуй сам</small>{d.title}</span>
              <span className="dl-fstep">Шаг {i + 1} из {n}</span>
              <span className="dl-fdots" aria-hidden="true">{d.tasks.map((_, j) => <i key={j} className={j < i || (j === i && resolved) ? 'ok' : j === i ? 'on' : ''} />)}</span>
              <button type="button" className="dl-full-btn" aria-expanded={taskOpen} data-testid="draw-task-toggle" onClick={() => { Audio.play('tick'); setTaskOpen(!taskOpen); }}>
                {taskOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}{taskOpen ? 'Скрыть задание' : 'Задание'}</button>
              <button type="button" className="dl-fclose" aria-label="Свернуть график" title="Свернуть (Esc)" data-testid="draw-full-exit" onClick={leaveFull}><Minimize2 size={18} aria-hidden="true" /></button>
            </div>
          )}
          {full && taskOpen && <div className="dl-mini" data-testid="draw-full-task">{rich(t.text)}
            {t.do === 'points' && <span className="dl-mini-rows"> {t.cols.join('; ')}: {t.at.map((q) => `${fmt(q.x)}; ${fmt(q.y)}`).join(' · ')}</span>}</div>}
          <div className="gl-stage">
            <div className="dl-fit" ref={fitArea}>
            <div className="dl-tools" style={full && fitBox ? { width: fitBox.w } : undefined}>
              <div className="dl-zoom" role="group" aria-label="Масштаб графика" data-testid="draw-zoom">
                <span className="dl-seg">
                <button type="button" className="dl-zbtn" aria-label="Отдалить график" title="Отдалить" data-testid="draw-zoom-out" disabled={!zoomed} onClick={() => zoomBy(1 / 1.6)}><Minus size={15} aria-hidden="true" /></button>
                <span className="dl-zlevel" data-testid="draw-zoom-level" aria-live="polite">×{(Math.round(z * 10) / 10).toFixed(1).replace('.', ',')}</span>
                <button type="button" className="dl-zbtn" aria-label="Приблизить график" title="Приблизить (щипок двумя пальцами, колёсико во весь экран)" data-testid="draw-zoom-in" disabled={z >= ZOOM_MAX - 0.01} onClick={() => zoomBy(1.6)}><Plus size={15} aria-hidden="true" /></button>
                </span>
                {zoomed && <button type="button" className="dl-full-btn" data-testid="draw-zoom-fit" onClick={zoomFit}><Expand size={14} aria-hidden="true" />Вписать</button>}
                {zoomed && <button type="button" className="dl-full-btn" aria-pressed={hand} data-testid="draw-hand" title="Двигать график, а не ставить точки"
                  onClick={() => { Audio.play('tick'); setHand(!hand); setHover(null); }}><Hand size={14} aria-hidden="true" />Двигать</button>}
              </div>
              {t.do === 'area' && !resolved && (
                <div className="dl-zoom" role="group" aria-label="Кисть или ластик" data-testid="draw-tools">
                  <button type="button" className="dl-full-btn" aria-pressed={tool === 'brush'} data-testid="draw-brush" onClick={() => { Audio.play('tick'); setTool('brush'); }}><Paintbrush size={14} aria-hidden="true" />Кисть</button>
                  <button type="button" className="dl-full-btn" aria-pressed={tool === 'erase'} data-testid="draw-eraser" onClick={() => { Audio.play('tick'); setTool('erase'); }}><Eraser size={14} aria-hidden="true" />Ластик</button>
                </div>
              )}
              {!full && <button type="button" className="dl-full-btn accent" data-testid="draw-full" onClick={goFull}><Maximize2 size={14} aria-hidden="true" />На весь экран</button>}
              {(full || t.do === 'area') && t.do !== 'shift' && (
                <button type="button" className="dl-full-btn" data-testid="draw-undo" disabled={resolved || (!pts.length && !(t.do === 'area' && history.current.length))} title="Отменить (Ctrl+Z)" onClick={undoPt}><Undo2 size={14} aria-hidden="true" />Отменить</button>
              )}
            </div>
            <div ref={wrap} className={`dl-wrap${zoomed ? ' zoomed' : ''}`} data-testid="draw-wrap" style={full && fitBox ? { width: fitBox.w, height: fitBox.h } : undefined}>
              <GraphStage g={tour} k={k} grid={d.grid} vb={vbString(vb)} live={t.do === 'shift' && !resolved ? { [t.control]: v } : null}
                alsoShow={!resolved && t.show ? t.show : null} alsoHide={!resolved && t.hide ? t.hide : null} />
              <svg ref={ink} className={`dl-ink${t.do === 'shift' ? ' shift' : ''}${resolved ? ' off' : ''}${hand ? ' hand' : ''}`} viewBox={vbString(vb)} data-testid="draw-ink"
                data-answer={testAnswer} data-ready={String(ready)} aria-label={full ? 'Поле для рисования. Стрелки — курсор по сетке, Enter — поставить точку, Ctrl+Z — отменить' : 'Поле для рисования'}
                tabIndex={full ? 0 : undefined} onKeyDown={full ? onKeys : undefined}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onPointerLeave={() => setHover(null)}>
                <defs><clipPath id={`dlc${id}`}><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
                {/* сетка — в самом графике (GraphStage, grid): линии через шаг задания, подписи — только на них */}
                {!res?.ok && through()}
                {full && hover && !resolved && t.do !== 'shift' && !gem && cross(hover)}
                {/* одна точка линии стоит — к курсору тянется пунктирная «резинка»: видно, какая выйдет линия */}
                {t.do === 'line' && pts.length === 1 && hover && !drag.current && !resolved && (curvePath(pts[0], hover)
                  ? <path d={curvePath(pts[0], hover)} fill="none" stroke={mine} strokeWidth={2.4 * pz} strokeDasharray={`${6 * pz} ${5 * pz}`} strokeLinecap="round" opacity=".6" pointerEvents="none" clipPath={`url(#dlc${id})`} data-testid="draw-rubber" />
                  : <line x1={sx(pts[0].x)} y1={sy(pts[0].y)} x2={sx(hover.x)} y2={sy(hover.y)} stroke={mine} strokeWidth={2.4 * pz} strokeDasharray={`${6 * pz} ${5 * pz}`} strokeLinecap="round" opacity=".6" pointerEvents="none" data-testid="draw-rubber" />)}
                {hover && !drag.current && pts.length < maxPts && t.do !== 'area' && (
                  <g opacity=".55" pointerEvents="none">{pin(hover, 'hover', 'var(--g-blue)', gem ? null : coordLabel(hover))}</g>
                )}
                {/* кисть и ластик — круг размера кисти под курсором, а не точка */}
                {t.do === 'area' && hover && !resolved && (
                  <circle cx={sx(hover.x)} cy={sy(hover.y)} r={brushPx} pointerEvents="none" data-testid="draw-brush-cursor" data-tool={tool}
                    fill={tool === 'erase' ? 'none' : mine} fillOpacity=".18" stroke={tool === 'erase' ? 'var(--ds-ink2)' : mine} strokeWidth={1.6 * pz} strokeDasharray={tool === 'erase' ? `${4 * pz} ${3 * pz}` : undefined} />
                )}
                {/* закрашивание — мазки кистью: полупрозрачные полосы цвета ответа, по краю поля обрезаны */}
                {t.do === 'area' && pts.length > 0 && (
                  <g clipPath={`url(#dlc${id})`} pointerEvents="none" data-testid="draw-paint" data-coverage={cov ? Math.round(cov.inside * 100) : 0}>
                    {paintSegments(pts).map((seg, si) => (seg.length === 1 ? <circle key={si} cx={sx(seg[0].x)} cy={sy(seg[0].y)} r={brushPx} fill={res?.ok ? 'var(--ds-ok)' : mine} fillOpacity=".32" />
                      : <polyline key={si} points={seg.map((q) => `${sx(q.x)},${sy(q.y)}`).join(' ')} fill="none" stroke={res?.ok ? 'var(--ds-ok)' : mine} strokeOpacity=".32" strokeWidth={brushPx * 2} strokeLinecap="round" strokeLinejoin="round" />))}
                  </g>
                )}
                {!res?.ok && t.do !== 'area' && pts.map((q, j) => pin(q, `p${j}`, mine, coordLabel(q)))}
                {sol && sol.paint && (
                  <g clipPath={`url(#dlc${id})`} pointerEvents="none" data-testid="draw-solution">
                    {sol.paint.map((q, j) => <circle key={j} cx={sx(q.x)} cy={sy(q.y)} r={brushPx} fill="var(--ds-ok)" fillOpacity=".22" />)}
                  </g>
                )}
                {solveView.length > 0 && t.do !== 'line' && t.do !== 'shift' && solveView.map(([cx, cy], j) => (
                  <circle key={`s${j}`} cx={cx} cy={cy} r={9 * pz} fill="none" stroke="var(--ds-ok)" strokeWidth={3 * pz} data-testid="draw-solution" />
                ))}
              </svg>
              {/* сколько области закрашено — пока шаг не решён */}
              {cov && !resolved && !gem && <div className="dl-paint-chip" data-testid="draw-coverage" aria-live="polite">Закрашено {Math.round(cov.inside * 100)}%</div>}
            </div>
            </div>
            {t.do === 'shift' && ctl && (
              <label className="dl-shift">
                <span>Сдвиг</span>
                <input type="range" min={ctl.min} max={ctl.max} step={d.snap[0]} value={v} disabled={resolved} data-testid="draw-slider"
                  onChange={(e) => { touch(); setV(clampV(Number(e.target.value))); }} />
                <output data-testid="draw-shift">{v === 0 ? 'нет' : `${v > 0 ? 'вправо' : 'влево'} на ${Math.abs(v)}`}</output>
              </label>
            )}
          </div>
          {full && t.do !== 'shift' && t.do !== 'area' && pts.length > 0 && !resolved && (
            <div className="dl-pts" data-testid="draw-pts" aria-label="Поставленные точки">
              {pts.map((q, j) => <button key={j} type="button" className="dl-pt" data-testid="draw-pt" onClick={() => dropPt(j)} aria-label={`Убрать точку ${coordLabel(q)}`}>({coordLabel(q)})<X size={12} aria-hidden="true" /></button>)}
            </div>
          )}
          {full && res && (
            <div className={`dl-mini-fb${res.ok ? '' : ' bad'}`} data-testid="draw-full-feedback">{res.ok ? 'Верно.' : res.shown ? 'Вот как надо — смотрите на графике.' : `${res.why || 'Не совсем.'} Попробуйте ещё раз.`}</div>
          )}
          {full && (
            <div className="dl-full-row">
              <Button variant="ghost" icon={RotateCcw} disabled={resolved || (!pts.length && v === 0)} onClick={reset}>Сбросить</Button>
              {resolved
                ? <Button wide icon={i < n - 1 ? ArrowRight : Check} data-testid="draw-full-next" onClick={() => { if (i >= n - 1) leaveFull(); next(); }}>{i < n - 1 ? 'Дальше' : 'Готово'}</Button>
                : <Button wide icon={Check} disabled={!ready} data-testid="draw-full-check" onClick={check}>Проверить</Button>}
            </div>
          )}
          </div>
          {res && (
            <div ref={fb} className={`dl-fb${res.ok ? '' : res.shown ? ' shown' : ' bad'}`} role="status" data-testid="draw-feedback" data-ok={String(!!res.ok)} data-shown={String(!!res.shown)}>
              {res.ok && <><b>Верно.</b> {rich(t.done)}</>}
              {!res.ok && !res.shown && <><b>{res.why || 'Не совсем.'}</b><div className="dl-hint"><Lightbulb size={16} aria-hidden="true" /><span>{rich(t.hint)} Попробуйте ещё раз.</span></div></>}
              {res.shown && <><b>{res.why ? `${res.why} ` : ''}Вот как надо:</b> {rich(t.hint)} {rich(t.done)}</>}
            </div>
          )}
        </div>
      )}
      {phase === 'done' && result && (
        <div className="gl-page" data-testid="draw-done">
          <ExtraResult kind="draw" unitId={d.unitId} title={d.title} r={result}>
            <div className="gl-stage" data-testid="draw-done-graph"><GraphStage g={tour} k={n} grid={d.grid} /></div>
          </ExtraResult>
        </div>
      )}
      <div className="gl-foot">
        <div>
          {phase === 'done'
            ? <Button wide data-testid="draw-finish" onClick={() => { Audio.play('click'); onClose(); }}>Дальше</Button>
            : <>
              <Button variant="ghost" icon={RotateCcw} disabled={resolved || (!pts.length && v === 0)} data-testid="draw-reset" onClick={reset}>Сбросить</Button>
              {resolved
                ? <Button wide icon={i < n - 1 ? ArrowRight : Check} data-testid="draw-next" onClick={next}>{i < n - 1 ? 'Дальше' : 'Готово'}</Button>
                : <Button wide icon={Check} disabled={!ready} data-testid="draw-check" onClick={check}>Проверить</Button>}
            </>}
        </div>
      </div>
    </div>
  );
  return <SpecialShell learn={learn}>{body}</SpecialShell>;
}
