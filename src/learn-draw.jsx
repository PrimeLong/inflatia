/* «НАРИСУЙ САМ» (docs/mechanics.md, «Нарисуй сам»; задания и проверка — src/learn/draws.js): ученик сам
   строит график юнита по условию. Наверху — условие шага, ниже — график (та же сцена, что у «Разбора
   графика», GraphStage), поверх — прозрачный слой, на котором ученик ставит точки (они прилипают к сетке,
   рядом — их координаты и пунктир к осям) или тянет кривую. «Проверить»: верно — нужная линия или точка
   появляется на графике по-настоящему и под ним — что это значит; ошибка — что не так и подсказка, можно
   ещё раз; вторая ошибка — график показывает, как надо, и урок идёт дальше. В конце — итоги, как после урока
   (ExtraResult из src/learn-extra-result.jsx): 15 опыта и монеты — один раз, под итогами — построенный график. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowRight, Check, RotateCcw, Lightbulb, Maximize2, Minimize2, Gem, Plus, Minus, Hand, Expand } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button, IconButton } from './ds.jsx';
import { GraphStage, GRAPH_CSS, W, H, M } from './learn-graph.jsx';
import { CHARTS } from './textbook/charts.js';
import { DRAW_BY_ID, DRAW_XP, isDrawDone, checkTask, solveTask, snapTo, drawScene, drawTour } from './learn/draws.js';
import { finishLesson, markDraw, countAnswers, markGem, hasGem } from './textbook/learn-state.js';
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
  .dl-wrap .dl-ink { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; margin: 0; touch-action: none; cursor: crosshair;
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .dl-wrap .dl-ink.shift { cursor: ew-resize; }
  .dl-wrap .dl-ink.off { cursor: default; touch-action: auto; }
  .dl-coord { font: 700 11.5px var(--ds-sans); }
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
  .dl-full-row > :last-child { flex: 1; }
  @media (prefers-reduced-motion: reduce) { .dl-task, .dl-fb { animation: none; } }
`;

const rich = (t) => String(t).split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const HOW = {
  line: 'Нажмите на график в двух местах — точки прилипают к сетке; точку можно перетащить, а касанием — убрать.',
  points: 'Каждая строка таблицы — точка на графике; точки прилипают к сетке, их можно перетащить, а касанием — убрать.',
  point: 'Нажмите на график — точку можно перетащить, а касанием — убрать.',
  shift: 'Потяните график пальцем или мышью вбок — или двигайте ползунок под ним.',
  area: 'Нажмите внутрь нужной области.',
};

export default function DrawLesson({ id, learn, update, onClose, gem = false }) {
  const d = DRAW_BY_ID[id];
  const tour = useMemo(() => (d ? drawTour(d) : null), [d]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('task'); // task → done
  const [pts, setPts] = useState([]);
  const [v, setV] = useState(0);
  const [hover, setHover] = useState(null);
  const [tries, setTries] = useState(0);
  const [res, setRes] = useState(null); // { ok, why } | { shown: true }
  const [result, setResult] = useState(null); // итоги урока: опыт, монеты, выплаты
  const firstTry = useRef(0);
  const started = useRef(Date.now());
  const root = useRef(null);
  const ink = useRef(null);
  const drag = useRef(null);
  const fb = useRef(null);
  const [already] = useState(() => isDrawDone(learn, id));
  /* «На весь экран»: свой слой поверх урока; где можно — ещё и полноэкранный режим браузера с поворотом в альбомный */
  const [full, setFull] = useState(false);
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
  const maxPts = t.do === 'line' ? 2 : t.do === 'points' ? t.at.length : 1;
  // ответ ученика в виде, который понимает checkTask
  const answer = t.do === 'line' ? (pts.length === 2 ? { a: pts[0], b: pts[1] } : null) : t.do === 'points' ? (pts.length === maxPts ? { ps: pts } : null)
    : t.do === 'shift' ? { v } : pts.length ? { p: pts[0] } : null;
  const ready = t.do === 'shift' ? v !== 0 : pts.length === maxPts;
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
    const p = place(raw);
    // касание прямо в поставленную точку: отпустили, не сдвинув, — точка убирается; потянули — едет за пальцем
    const near = pts.map((q, k) => ({ k, dd: Math.hypot(sx(q.x) - sx(raw.x), sy(q.y) - sy(raw.y)) })).sort((a, b) => a.dd - b.dd)[0];
    const onPin = t.do !== 'area' && near && near.dd < 16 * pz;
    if (onPin) { drag.current = { k: near.k, x: e.clientX, y: e.clientY, tap: true, before: pts }; return; }
    if (t.do === 'line' || t.do === 'points') {
      // все уже стоят — переставляем ближнюю
      const k = near && pts.length >= maxPts ? near.k : pts.length;
      const next = [...pts]; next[k] = p; setPts(next); drag.current = { k, before: pts };
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
    if (!drag.current) { if (e.pointerType === 'mouse' && !resolved && !hand && t.do !== 'shift') setHover(place(raw)); return; }
    if (t.do === 'shift') { setV(clampV(drag.current.v + (raw.x - drag.current.x))); return; }
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
      if (tries === 0) firstTry.current += 1;
      Audio.play('coin'); setRes({ ok: true }); return;
    }
    Audio.play('down');
    // алмазный уровень — одна попытка: ошибка — сразу «вот как надо» (docs/mechanics.md, «Особые уроки юнита»)
    if (tries >= 1 || gem) { setRes({ shown: true, why: r.why }); setTries(tries + 1); return; }
    setTries(1); setRes({ ok: false, why: r.why });
  };
  const finish = () => {
    Audio.play('register');
    const right = firstTry.current; const accuracy = Math.round((right / n) * 100);
    const seconds = Math.min(900, (Date.now() - started.current) / 1000);
    if (gem && update) {
      // алмаз — все шаги с первой (и единственной) попытки; опыт и монеты — за первый взятый
      const won = right === n; const had = hasGem(learn, id);
      const apply = (s) => { const t = countAnswers(s, right, n); return won && !had ? markGem(finishLesson(t, null, { xp: DRAW_XP, accuracy: 100, seconds, kind: 'draw', extra: { fresh: false } }), id) : t; };
      const pay = payExtra(learn, update, apply, { id, diamond: true, won, gem: had, accuracy });
      setResult({ xp: won && !had ? DRAW_XP : 0, right, total: n, ms: Date.now() - started.current, diamond: true, won, replay: won && had, ...pay });
      setPhase('done');
      return;
    }
    // шаги, верные с первой попытки, — в задание дня «N верных ответов», и при повторе (docs/mechanics.md);
    // впервые — опыт и монеты, как за урок, и всё, что урок выполнил (settle)
    const apply = (s) => { const t = countAnswers(s, right, n); return already ? t : markDraw(finishLesson(t, null, { xp: DRAW_XP, accuracy, seconds, kind: 'draw', extra: { fresh: true } }), id); };
    const pay = update ? payExtra(learn, update, apply, { id, fresh: !already, accuracy }) : { coins: 0, gains: [], streakUp: 0 };
    setResult({ xp: already ? 0 : DRAW_XP, right, total: n, ms: Date.now() - started.current, replay: already, ...pay });
    setPhase('done');
  };
  const next = () => {
    if (i >= n - 1) { finish(); return; }
    Audio.play('paper');
    setI(i + 1); setPts([]); setV(0); setTries(0); setRes(null); setHover(null); setVb(fullVb(W, H)); setHand(false);
  };
  const reset = () => { Audio.play('tick'); setPts([]); setV(0); touch(); };

  // что видно на графике: решено — шаг вперёд (новое появляется), иначе — как было плюс то, что нужно шагу
  const k = phase === 'done' ? n : i + (resolved ? 1 : 0);
  const sol = res && res.shown ? solveTask(d, t) : null;
  const solveView = sol ? (sol.ps || (sol.a ? [sol.a, sol.b] : sol.p ? [sol.p] : [])).map((q) => [Math.round(sx(q.x) * 10) / 10, Math.round(sy(q.y) * 10) / 10]) : [];
  const testAnswer = (() => { const s = solveTask(d, t); return JSON.stringify(s.v != null ? { v: s.v } : { pts: (s.ps || (s.a ? [s.a, s.b] : [s.p])).map((q) => [sx(snapTo(d, q).x), sy(snapTo(d, q).y)]) }); })();
  const mine = res && res.shown ? 'var(--g-rust)' : 'var(--g-blue)';
  const coordLabel = (q) => `${fmt(q.x)}; ${fmt(q.y)}`;
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
  // линия через две точки ученика — до краёв поля, пунктиром: видно, куда она пойдёт
  const through = () => {
    if (t.do !== 'line' || pts.length !== 2 || (pts[0].x === pts[1].x && pts[0].y === pts[1].y)) return null;
    const [a, b] = pts; const dx = b.x - a.x; const dy = b.y - a.y;
    const far = 4 * Math.max(x1 - x0, y1 - y0) / Math.max(1e-9, Math.hypot(dx, dy));
    const p = { x: a.x - dx * far, y: a.y - dy * far }; const q = { x: a.x + dx * far, y: a.y + dy * far };
    return <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(q.x)} y2={sy(q.y)} stroke={mine} strokeWidth={2.2 * pz} strokeDasharray={`${7 * pz} ${6 * pz}`} strokeOpacity=".75" clipPath={`url(#dlc${id})`} />;
  };

  const body = (
    <div className="gl" ref={root} role="dialog" aria-label={`Нарисуй сам: ${d.title}`} data-testid="draw-lesson" data-id={id} data-phase={phase} data-task={i}>
      <style>{GRAPH_CSS}</style>
      <style>{CSS}</style>
      <div className="gl-head">
        <div className="gl-top">
          <IconButton label="Закрыть" icon={X} data-testid="draw-close" onClick={() => { Audio.play('paper'); onClose(); }} />
          <div className="gl-title"><small>Нарисуй сам</small>{d.title}</div>
          {gem && <span className="dl-gem-tag" data-testid="draw-gem-tag"><Gem size={12} aria-hidden="true" />алмаз</span>}
          <ReportFlag withText text="Ошибка?" reasons={EXPLAIN_REASONS} sub="Что не так в задании? Шаг, его текст и устройство приложатся сами." context={() => ({
            screen: 'draw', lesson: id, unit: d.unitId, kind: 'draw',
            step: (phase === 'done' ? 'итог' : `шаг ${i + 1} из ${n}`) + (gem ? ' (алмаз)' : ''),
            prompt: (phase === 'done' ? d.title : t.text).replace(/\*\*/g, '').slice(0, 1500),
            answer: answer ? JSON.stringify(answer).slice(0, 300) : '',
          })} />
        </div>
        <div className="gl-bar" aria-hidden="true">{d.tasks.map((_, j) => <i key={j} className={phase === 'done' || j < i || (j === i && resolved) ? 'on' : ''} />)}</div>
      </div>
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
            {!resolved && <span className="dl-how">{HOW[t.do]}{gem ? ' Алмаз: одна попытка на шаг.' : ''}</span>}
          </div>
          <div className={`dl-box${full ? ' full' : ''}`} data-testid="draw-box" data-full={String(full)} data-zoom={z.toFixed(2)}>
          {full && <div className="dl-mini" data-testid="draw-full-task"><b>Шаг {i + 1} из {n}.</b> {rich(t.text)}
            {t.do === 'points' && <span className="dl-mini-rows"> {t.cols.join('; ')}: {t.at.map((q) => `${fmt(q.x)}; ${fmt(q.y)}`).join(' · ')}</span>}</div>}
          <div className="gl-stage">
            <div className="dl-fit" ref={fitArea}>
            <div className="dl-tools" style={full && fitBox ? { width: fitBox.w } : undefined}>
              <div className="dl-zoom" role="group" aria-label="Масштаб графика" data-testid="draw-zoom">
                <button type="button" className="dl-zbtn" aria-label="Отдалить график" title="Отдалить" data-testid="draw-zoom-out" disabled={!zoomed} onClick={() => zoomBy(1 / 1.6)}><Minus size={15} aria-hidden="true" /></button>
                <span className="dl-zlevel" data-testid="draw-zoom-level" aria-live="polite">×{(Math.round(z * 10) / 10).toFixed(1).replace('.', ',')}</span>
                <button type="button" className="dl-zbtn" aria-label="Приблизить график" title="Приблизить (щипок двумя пальцами, колёсико во весь экран)" data-testid="draw-zoom-in" disabled={z >= ZOOM_MAX - 0.01} onClick={() => zoomBy(1.6)}><Plus size={15} aria-hidden="true" /></button>
                {zoomed && <button type="button" className="dl-full-btn" data-testid="draw-zoom-fit" onClick={zoomFit}><Expand size={14} aria-hidden="true" />Вписать</button>}
                {zoomed && <button type="button" className="dl-full-btn" aria-pressed={hand} data-testid="draw-hand" title="Двигать график, а не ставить точки"
                  onClick={() => { Audio.play('tick'); setHand(!hand); setHover(null); }}><Hand size={14} aria-hidden="true" />Двигать</button>}
              </div>
              {!full && <button type="button" className="dl-full-btn" data-testid="draw-full" onClick={goFull}><Maximize2 size={14} aria-hidden="true" />На весь экран</button>}
            </div>
            <div ref={wrap} className={`dl-wrap${zoomed ? ' zoomed' : ''}`} data-testid="draw-wrap" style={full && fitBox ? { width: fitBox.w, height: fitBox.h } : undefined}>
              <GraphStage g={tour} k={k} grid={d.grid} vb={vbString(vb)} live={t.do === 'shift' && !resolved ? { [t.control]: v } : null}
                alsoShow={!resolved && t.show ? t.show : null} alsoHide={!resolved && t.hide ? t.hide : null} />
              <svg ref={ink} className={`dl-ink${t.do === 'shift' ? ' shift' : ''}${resolved ? ' off' : ''}${hand ? ' hand' : ''}`} viewBox={vbString(vb)} data-testid="draw-ink"
                data-answer={testAnswer} data-ready={String(ready)} aria-label="Поле для рисования"
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onPointerLeave={() => setHover(null)}>
                <defs><clipPath id={`dlc${id}`}><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
                {/* сетка — в самом графике (GraphStage, grid): линии через шаг задания, подписи — только на них */}
                {!res?.ok && through()}
                {hover && !drag.current && pts.length < maxPts && (
                  <g opacity=".55" pointerEvents="none">{pin(hover, 'hover', 'var(--g-blue)', coordLabel(hover))}</g>
                )}
                {!res?.ok && pts.map((q, j) => pin(q, `p${j}`, mine, t.do === 'area' ? null : coordLabel(q)))}
                {solveView.length > 0 && t.do !== 'line' && t.do !== 'shift' && solveView.map(([cx, cy], j) => (
                  <circle key={`s${j}`} cx={cx} cy={cy} r={9 * pz} fill="none" stroke="var(--ds-ok)" strokeWidth={3 * pz} data-testid="draw-solution" />
                ))}
              </svg>
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
          {full && res && (
            <div className={`dl-mini-fb${res.ok ? '' : ' bad'}`} data-testid="draw-full-feedback">{res.ok ? 'Верно.' : res.shown ? 'Вот как надо — смотрите на графике.' : `${res.why || 'Не совсем.'} Попробуйте ещё раз.`}</div>
          )}
          {full && (
            <div className="dl-full-row">
              <Button variant="ghost" icon={Minimize2} data-testid="draw-full-exit" onClick={leaveFull}>Свернуть</Button>
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
  return body;
}
