/* Сцена «Разбора графика» (src/learn-graph.jsx): оси, сетка, кривые, точки, площади и подписи без наложений — одна на
   весь курс. Ею рисуют «Разбор графика», «Нарисуй сам» (src/learn-draw.jsx) и мини-игры (src/learn-play.jsx, жалоба
   владельца 19.11: «в мини-игре должен быть график, такой же как в разборе»). Переменные цветов — у .gl и .gs-vars. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from './ds-art.jsx';
import { CHARTS } from './textbook/charts.js';
import { sceneInCrowns } from './learn/money.js';
import { stepView } from './learn/graphs.js';
import { newGlide, glideAt, glideDecay, glideKeep } from './lib/glide.js';
import { textBox, dotBox, aroundPoint, placeLabels, freeTicks } from './learn/label-place.js';

export const STAGE_CSS = `
  .gs-vars { --g-blue: #2459A6; --g-rust: #B4441A; --g-teal: #0E7A72; --g-gold: #9A6A00; --g-grid: color-mix(in srgb, var(--ds-ink) 9%, transparent); }
  .ds-dark .gs-vars, .gs-vars.dark { --g-blue: #8DB6F2; --g-rust: #F29A6E; --g-teal: #5ED3C4; --g-gold: #E9C25A; }
  /* сцена */
  .gl svg text { font-family: var(--ds-sans); }
  .g-el { transition: opacity .45s ease, stroke-width .3s ease, filter .3s ease; }
  .g-el.dim { opacity: .22; }
  .g-el.on path.c, .g-el.on line.c { stroke-width: 3.6; }
  /* без свечения (жалоба 19.11, «Налог»: «почему всё такое светящееся»): то, о чём речь, — толще и ярче, остальное бледнее */
  .g-in .draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: g-draw .95s cubic-bezier(.45, .05, .25, 1) forwards; }
  @keyframes g-draw { to { stroke-dashoffset: 0 } }
  .g-in .pop { transform-box: fill-box; transform-origin: center; animation: g-pop .5s cubic-bezier(.3, 1.6, .5, 1) .35s backwards; }
  @keyframes g-pop { from { transform: scale(0); opacity: 0 } }
  .g-in .fade { animation: g-fade .6s ease .5s backwards; }
  @keyframes g-fade { from { opacity: 0 } }
  .g-in .grow { transform-box: fill-box; transform-origin: 50% 100%; animation: g-grow .8s cubic-bezier(.3, .9, .3, 1) .2s backwards; }
  /* область закрашивается проходом кисти слева направо (жалоба ученика 18.11, «Налог на кофе», шаг 3: «странная анимация, когда
     закрашивает область»): раньше она росла растяжением от нижнего края — треугольник излишка сплющивался и вытягивался */
  .g-in .sweep { animation: g-sweep .9s cubic-bezier(.35, .7, .3, 1) .2s backwards; }
  @keyframes g-sweep { from { clip-path: inset(0 100% 0 0); fill-opacity: 0; } }
  @keyframes g-grow { from { transform: scaleY(0); opacity: 0 } }
  .g-pulse { animation: g-pulse 1.8s ease-in-out infinite; }
  @keyframes g-pulse { 50% { fill-opacity: .42 } }
  .g-axes.on line { stroke: var(--g-blue); stroke-width: 2.6; }
  .g-axes.on text { fill: var(--g-blue); font-weight: 800; }
  .g-mark { animation: g-fade .5s ease .25s backwards; }

`;

export const KCOLOR = { blue: 'var(--g-blue)', rust: 'var(--g-rust)', teal: 'var(--g-teal)', gold: 'var(--g-gold)' };
export const W = 360; export const H = 290; export const M = { l: 42, r: 16, t: 14, b: 34 };
function ticks(lo, hi, n = 4) {
  const span = hi - lo; const raw = span / n; const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((x) => x >= raw) || 10 * pow;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
/* подписи по шагу сетки «Нарисуй сам»: только на её линиях (шаг × 1, 2, 4, 5, 10…), не больше пяти промежутков —
   иначе линии сетки (через 20) и подписи (через 50) шли вперемешку («сетка неровная») */
export function gridTicks(lo, hi, g) {
  const m = [1, 2, 4, 5, 10, 20, 25, 50, 100].find((k) => (hi - lo) / (g * k) <= 5) || 100;
  const step = g * m; const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6 + 0);
  return out;
}
const gridLines = (lo, hi, g) => Array.from({ length: Math.floor((hi - lo) / g + 1e-9) + 1 }, (_, j) => Math.round((Math.ceil(lo / g - 1e-9) * g + j * g) * 1e6) / 1e6).filter((v) => v <= hi + 1e-9);
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* сцена шага для числовой плоскости на весь экран: только то, что видно на этом шаге (кривые, точки, области) */
export function stepScene(scene, view) {
  const has = (id) => view.shown.has(id);
  return {
    ...scene,
    curves: (scene.curves || []).filter((c) => has(c.id)),
    points: (scene.points || []).filter((p, i) => has(`pt#${i}`) || has(`pt:${p.label}`)),
    polys: (scene.polys || []).filter((p, i) => has(`poly#${i}`) || has(`poly:${p.label}`)),
    rects: (scene.rects || []).filter((r, i) => has(`rect:${i}`)),
  };
}
// окно графика, общее для всех шагов урока: объединение границ сцены при значениях каждого шага
const unionDomain = (a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
export function lessonDomain(g, def, defaults) {
  if (!g || !Array.isArray(g.steps) || !g.steps.length) return null;
  let x = null; let y = null;
  for (let k = 0; k < g.steps.length; k += 1) {
    const view = stepView(g, k);
    const sc = def.build(g.attrs, { ...defaults, ...view.values });
    x = x ? unionDomain(x, sc.xDomain) : [...sc.xDomain]; y = y ? unionDomain(y, sc.yDomain) : [...sc.yDomain];
  }
  return { x, y };
}

/* значения ползунков на шаге: по умолчанию модели, поверх — значения шага; переход — плавный */
function useTweenValues(target, reduced, start = null) {
  const [cur, setCur] = useState(start ? { ...target, ...start } : target);
  const from = useRef(start ? { ...target, ...start } : target);
  const key = JSON.stringify(target);
  useEffect(() => {
    if (reduced) { setCur(target); from.current = target; return undefined; }
    const a = { ...from.current }; const b = target; const t0 = performance.now(); let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 850); const e = ease(t);
      const v = Object.fromEntries(Object.keys(b).map((k) => [k, (a[k] ?? b[k]) + (b[k] - (a[k] ?? b[k])) * e]));
      from.current = v; setCur(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return cur;
}

/* «Нарисуй сам» (src/learn-draw.jsx) рисует на той же сцене: live — ползунки, которые ученик тянет прямо
   сейчас (без плавного перехода — линия идёт за пальцем), alsoShow и alsoHide — что видно и что спрятано,
   пока шаг решают (бледная прежняя линия; прежнее равновесие, чтобы оно не подсказало ответ) */
/* grid — шаг сетки «Нарисуй сам» [по X, по Y]: линии через этот шаг, подписи — только на них */
// vb — окно графика, когда его приблизили («Нарисуй сам», src/lib/view-zoom.js); по умолчанию — весь график
/* мини-игра: g.def — своя модель вместо CHARTS[g.chart]; showAll — видно всё, без подсветки и без прорисовки заново
   на каждом ходу; lockLive — оси одни на всю игру (окно — по крайним состояниям в g.steps), хотя значения идут из live */
export function GraphStage({ g, k, live = null, alsoShow = null, alsoHide = null, grid = null, vb = null, showAll = false, lockLive = false, replayFrom = null }) {
  const reduced = useReducedMotion();
  const def = g.def || CHARTS[g.chart];
  const view0 = showAll ? { shown: new Set(), focus: new Set(), added: new Set(), values: {}, marks: [], text: '' } : stepView(g, k);
  const view = alsoShow || alsoHide ? { ...view0, shown: new Set([...view0.shown, ...(alsoShow || [])].filter((id) => !(alsoHide || []).includes(id))) } : view0;
  const defaults = useMemo(() => Object.fromEntries((def.controls ? def.controls(g.attrs) : []).map((c) => [c.id, c.def])), [def, g.attrs]);
  const vals = useTweenValues({ ...defaults, ...view.values, ...live }, reduced || !!live, replayFrom ? { ...defaults, ...replayFrom } : null);
  /* подписи не прыгают, пока график едет (src/lib/glide.js; жалоба graph-moncomp: «что-то странное произошло с текстом
     MR, когда двинулся график»): место подписи выбирается заново на каждый кадр, и, когда лучшим становится другое
     место, подпись раньше перескакивала туда разом. Теперь она доезжает плавно. */
  const glide = useRef(null); if (!glide.current) glide.current = newGlide();
  const [, bumpGlide] = useState(0); const glideLoop = useRef(0); const glideT = useRef(0); const glideUsed = useRef([]);
  useEffect(() => {
    if (reduced) return;
    glideKeep(glide.current, glideUsed.current);
    if (glide.current.off.size && !glideLoop.current) {
      glideT.current = performance.now();
      const tick = (now) => {
        const alive = glideDecay(glide.current, now - glideT.current); glideT.current = now;
        glideLoop.current = alive ? requestAnimationFrame(tick) : 0;
        bumpGlide((n) => n + 1);
      };
      glideLoop.current = requestAnimationFrame(tick);
    }
  });
  useEffect(() => () => { if (glideLoop.current) cancelAnimationFrame(glideLoop.current); glideLoop.current = 0; }, []);
  /* оси — одни на весь урок (жалоба ученика 17.11, «Деньги», шаг 6: «очень странное движение»): границы графика
     считаются по значениям шага, и пока кривая плавно ехала, ось рывками сжималась (верх мультипликатора — ceil, с 11 до 8).
     Теперь окно — объединение окон всех шагов урока, и при переходе двигается только то, что меняется по смыслу */
  const lock = useMemo(() => lessonDomain(g, def, defaults), [g, def, defaults]);
  const scene0 = sceneInCrowns(def.build(g.attrs, vals));
  const scene = lock && (!live || lockLive) ? { ...scene0, xDomain: unionDomain(lock.x, scene0.xDomain), yDomain: unionDomain(lock.y, scene0.yDomain) } : scene0;
  if (showAll) {
    ['axes', ...scene.curves.map((c) => c.id), ...scene.points.flatMap((p, i) => [`pt#${i}`, `guide#${i}`]), ...(scene.polys || []).map((p, i) => `poly#${i}`), ...(scene.rects || []).map((r, i) => `rect:${i}`)]
      .forEach((id) => view.shown.add(id));
  }
  const [x0, x1] = scene.xDomain; const [y0, y1] = scene.yDomain;
  const sx = (x) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (y) => H - M.b - ((y - y0) / (y1 - y0)) * (H - M.t - M.b);
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const anyFocus = view.focus.size > 0;
  // состояние элемента: не показан — нет; новый — анимация; в фокусе — ярко; остальное — приглушено
  const cls = (id) => `g-el${view.focus.has(id) ? ' on' : anyFocus ? ' dim' : ''}`;
  const isIn = (id) => view.added.has(id);
  const ptId = (p, i) => (view.shown.has(`pt#${i}`) ? `pt#${i}` : `pt:${p.label}`);
  const guideId = (p, i) => (view.shown.has(`guide#${i}`) ? `guide#${i}` : `guide:${p.label}`);
  const clip = `glc${g.id}`;
  /* подписи без наложений (src/learn/label-place.js): названия осей, значения у пунктиров и метки шага
     стоят на месте; деления, которые на них налезают, прячутся; подписи кривых и точек выбирают место
     вокруг — где не закрывают другие подписи, точки и линии */
  const shownPts = scene.points.map((p, i) => ({ p, i, id: ptId(p, i) })).filter(({ p, id }) => view.shown.has(id) && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1);
  const guides = scene.points.map((p, i) => ({ p, i, id: guideId(p, i) })).filter(({ p, id }) => p.guide && view.shown.has(id));
  // значение у пунктира — как в тексте шага: на крупной шкале целым (44, а не 43,6)
  const gv = (v, lo, hi) => (hi - lo >= 20 ? String(Math.round(v)) : fmt(v));
  const fixedText = [
    textBox(scene.xLabel, W - M.r, H - 4, 13, 'end'), textBox(scene.yLabel, M.l - 34, M.t + 2, 13, 'start'),
    ...guides.flatMap(({ p }) => [textBox(gv(p.x, x0, x1), sx(p.x), H - M.b + 15, 12, 'middle'), textBox(gv(p.y, y0, y1), M.l + 4, sy(p.y) - 5, 12, 'start')]),
    ...view.marks.flatMap((m) => (m.t === 'x' ? [{ x0: sx(m.x) - 30, x1: sx(m.x) + 30, y0: H - M.b + 18, y1: H - M.b + 35 }]
      : m.t === 'y' ? [textBox(m.label, M.l + 4, sy(m.y) - 5, 12, 'start')]
        : m.t === 'seg' ? [textBox(m.label, (sx(m.x0) + sx(m.x1)) / 2, sy(m.y) - 9, 12.5, 'middle')] : [])),
  ];
  const tx = grid ? gridTicks(x0, x1, grid[0]) : ticks(x0, x1); const ty = grid ? gridTicks(y0, y1, grid[1]) : ticks(y0, y1);
  const xTicks = freeTicks(tx.map((t) => ({ t, box: textBox(fmt(t), sx(t), H - M.b + 15, 12, 'middle') })), fixedText);
  const yTicks = freeTicks(ty.filter((t) => sy(t) - M.t > 10).map((t) => ({ t, box: textBox(fmt(t), M.l - 6, sy(t) + 4, 12, 'end') })), fixedText);
  const curveLabels = scene.curves.filter((c) => c.label && !c.ghost && view.shown.has(c.id));
  const inField = (q) => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1;
  const lines = scene.curves.filter((c) => view.shown.has(c.id)).flatMap((c) => c.points.filter(inField).map((q) => dotBox(sx(q.x), sy(q.y), 2.5)));
  const dots = [...shownPts.map(({ p }) => dotBox(sx(p.x), sy(p.y), 7)), ...view.marks.filter((m) => m.t === 'pt').map((m) => dotBox(sx(m.x), sy(m.y), 6))];
  const along = (c) => {
    const vis = c.points.filter(inField);
    if (!vis.length) return [];
    const first = typeof c.labelPos === 'number' ? c.labelPos : 0.94;
    return [first, 0.8, 0.65, 0.5, 0.35, 0.2].map((f) => vis[Math.round(f * (vis.length - 1))]).flatMap((q) => {
      const x = sx(q.x); const y = sy(q.y);
      return [{ x: x + 6, y: y - 8, anchor: 'start' }, { x: x - 6, y: y - 8, anchor: 'end' }, { x: x + 6, y: y + 16, anchor: 'start' }];
    });
  };
  const labelList = [
    ...view.marks.map((m, i) => ({ m, i })).filter(({ m }) => m.t === 'pt').map(({ m, i }) => {
      const c = aroundPoint(sx(m.x), sy(m.y));
      return { id: `m${i}`, text: m.label, size: 12.5, cands: m.below ? [c[2], c[3], ...c] : c };
    }),
    ...shownPts.filter(({ p }) => p.label).map(({ p, id }) => ({ id, text: p.label, size: p.small ? 12 : 14, cands: aroundPoint(sx(p.x), sy(p.y)) })),
    ...curveLabels.map((c) => ({ id: `c:${c.id}`, text: c.label, size: 14, cands: along(c) })),
  ];
  const spots = placeLabels(labelList, { fixed: [...fixedText, ...xTicks.map((t) => t.box), ...yTicks.map((t) => t.box), ...dots], lines, bounds: { x0: M.l + 2, x1: W - 2, y0: 2, y1: H - M.b - 2 } });
  if (!reduced) {
    glideUsed.current = [];
    labelList.forEach((l) => {
      const at = spots[l.id]; if (!at) return;
      // считаем по левому краю надписи: смена выравнивания — тоже скачок
      const w = String(l.text).length * l.size * 0.56 * (at.anchor === 'end' ? 1 : at.anchor === 'middle' ? 0.5 : 0);
      const p = glideAt(glide.current, l.id, at.x - w, at.y);
      glideUsed.current.push(l.id);
      spots[l.id] = { ...at, x: p.x + w, y: p.y };
    });
  }
  return (
    <svg viewBox={vb || `0 0 ${W} ${H}`} role="img" aria-label={`График: ${g.title}`} data-testid="graph-stage" data-step={k}>
      <defs><clipPath id={clip}><rect x={M.l} y={M.t - 6} width={W - M.l - M.r + 6} height={H - M.t - M.b + 6} /></clipPath></defs>
      {(grid ? gridLines(x0, x1, grid[0]) : tx).map((t) => <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} stroke="var(--g-grid)" />)}
      {(grid ? gridLines(y0, y1, grid[1]) : ty).map((t) => <line key={`gy${t}`} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="var(--g-grid)" />)}
      <g className={`g-axes${view.focus.has('axes') ? ' on' : ''}`} data-testid="graph-el" data-el="axes" data-on={String(view.focus.has('axes'))}>
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="var(--ds-ink2)" strokeWidth="1.6" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="var(--ds-ink2)" strokeWidth="1.6" />
        {/* значение пунктира («10») встаёт в строку делений, а не под неё: там оно налезало на подпись оси «годы»
           (жалоба ученика 16.11); деление рядом с ним не рисуем */}
        {xTicks.filter(({ t }) => guides.every(({ p }) => Math.abs(sx(t) - sx(p.x)) > 22)).map(({ t }) => <text key={`tx${t}`} x={sx(t)} y={H - M.b + 15} fontSize="12" fill="var(--ds-ink3)" textAnchor="middle">{fmt(t)}</text>)}
        {yTicks.map(({ t }) => <text key={`ty${t}`} x={M.l - 6} y={sy(t) + 4} fontSize="12" fill="var(--ds-ink3)" textAnchor="end">{fmt(t)}</text>)}
        <text x={W - M.r} y={H - 4} fontSize="13" fill="var(--ds-ink2)" textAnchor="end" fontStyle="italic">{scene.xLabel}</text>
        <text x={M.l - 34} y={M.t + 2} fontSize="13" fill="var(--ds-ink2)" fontStyle="italic">{scene.yLabel}</text>
      </g>
      <g clipPath={`url(#${clip})`}>
        {(scene.rects || []).map((r, i) => {
          const id = `rect:${i}`; if (!view.shown.has(id)) return null;
          const c = r.tone === 'rust' ? 'var(--g-rust)' : 'var(--g-gold)';
          return (
            <g key={`${id}-${isIn(id) ? k : 0}`} className={`${cls(id)}${isIn(id) ? ' g-in' : ''}`} style={{ '--k': c }} data-testid="graph-el" data-el={id} data-on={String(view.focus.has(id))}>
              <rect className="sweep" x={sx(r.x0)} y={sy(r.y1)} width={Math.max(0, sx(r.x1) - sx(r.x0))} height={Math.max(0, sy(r.y0) - sy(r.y1))} fill={c} fillOpacity=".2" stroke={c} strokeOpacity=".6" />
            </g>
          );
        })}
        {(scene.polys || []).map((p, i) => {
          const id = view.shown.has(`poly#${i}`) ? `poly#${i}` : `poly:${p.label}`; if (!view.shown.has(id)) return null;
          const c = KCOLOR[p.tone] || 'var(--g-rust)';
          return (
            <g key={`${id}-${isIn(id) ? k : 0}`} className={`${cls(id)}${isIn(id) ? ' g-in' : ''}`} style={{ '--k': c }} data-testid="graph-el" data-el={id} data-on={String(view.focus.has(id))}>
              <polygon className="sweep" points={p.points.map((q) => `${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ')} fill={c} fillOpacity=".24" stroke={c} strokeOpacity=".6" />
            </g>
          );
        })}
        {scene.curves.map((c) => {
          if (!view.shown.has(c.id)) return null;
          const col = KCOLOR[c.color] || 'var(--g-gold)'; const d = path(c.points);
          const dashed = c.ghost || c.dashed;
          const mid = `glm${g.id}${c.id}${k}`.replace(/[^A-Za-z0-9-]/g, '');
          return (
            <g key={`${c.id}-${isIn(c.id) ? k : 0}`} className={`${cls(c.id)}${isIn(c.id) ? ' g-in' : ''}`} style={{ '--k': col }} data-testid="graph-el" data-el={c.id} data-on={String(view.focus.has(c.id))}>
              {/* линия чертится: маска-копия рисуется от начала к концу и открывает настоящую (с пунктиром). Область маски — во всё
                 поле (userSpaceOnUse): по умолчанию она равна рамке линии, а у горизонтальной или вертикальной линии рамка нулевой
                 высоты или ширины — и линия не видна вовсе (жалоба ученика 14.11, «Нарисуй сам: монополия»: «на графике уже есть
                 MC = 20», а линии MC нет — «тут нет этого») */}
              {isIn(c.id) && <mask id={mid} maskUnits="userSpaceOnUse" x={-W} y={-H} width={3 * W} height={3 * H}><path className="draw" pathLength="1" d={d} fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" /></mask>}
              <path className="c" d={d} fill="none" stroke={col} strokeWidth={c.ghost ? 1.8 : 2.8} strokeOpacity={c.ghost ? 0.45 : 1} strokeDasharray={dashed ? '6 5' : undefined}
                strokeLinecap="round" mask={isIn(c.id) ? `url(#${mid})` : undefined} />
            </g>
          );
        })}
      </g>
      {/* пунктир от точки к осям и её координаты — вне обрезки: подписи под осью видны */}
      {scene.points.map((p, i) => {
        const id = guideId(p, i); if (!p.guide || !view.shown.has(id)) return null;
        return (
          <g key={`${id}-${isIn(id) ? k : 0}`} className={`${cls(id)}${isIn(id) ? ' g-in' : ''}`} data-testid="graph-el" data-el={id} data-on={String(view.focus.has(id))}>
            <line className="draw" pathLength="1" x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)} y2={H - M.b} stroke="var(--ds-ink3)" strokeWidth="1.4" strokeDasharray="4 4" />
            <line className="draw" pathLength="1" x1={sx(p.x)} x2={M.l} y1={sy(p.y)} y2={sy(p.y)} stroke="var(--ds-ink3)" strokeWidth="1.4" strokeDasharray="4 4" />
            <text className="fade" x={sx(p.x)} y={H - M.b + 15} fontSize="12" fontWeight="700" fill="var(--ds-ink)" textAnchor="middle" stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{gv(p.x, x0, x1)}</text>
            <text className="fade" x={M.l + 4} y={sy(p.y) - 5} fontSize="12" fontWeight="700" fill="var(--ds-ink)" stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{gv(p.y, y0, y1)}</text>
          </g>
        );
      })}
      {curveLabels.map((c) => {
        const at = spots[`c:${c.id}`]; if (!at) return null;
        return <text key={`l${c.id}-${isIn(c.id) ? k : 0}`} className={`${cls(c.id)}${isIn(c.id) ? ' g-in' : ''}`} x={at.x} y={at.y} fontSize="14" fontWeight="800" fill={KCOLOR[c.color] || 'var(--g-gold)'} textAnchor={at.anchor} stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">
          <tspan className={isIn(c.id) ? 'fade' : undefined}>{c.label}</tspan></text>;
      })}
      {shownPts.map(({ p, id }) => {
        const col = p.color ? KCOLOR[p.color] : p.small ? 'var(--ds-ink2)' : 'var(--g-gold)';
        const at = spots[id];
        return (
          <g key={`${id}-${isIn(id) ? k : 0}`} className={`${cls(id)}${isIn(id) ? ' g-in' : ''}`} style={{ '--k': col }} data-testid="graph-el" data-el={id} data-on={String(view.focus.has(id))}>
            <circle className="pop" cx={sx(p.x)} cy={sy(p.y)} r={p.small ? 4.5 : 6.5} fill={col} stroke="var(--ds-card)" strokeWidth="2" />
            {at && <text className="pop" x={at.x} y={at.y} fontSize={p.small ? 12 : 14} fontWeight="800" fill={col} textAnchor={at.anchor} stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{p.label}</text>}
          </g>
        );
      })}
      {view.marks.map((m, i) => {
        const col = KCOLOR[m.tone] || 'var(--ds-ink)';
        const key = `m${k}-${i}`;
        if (m.t === 'pt') {
          const at = spots[`m${i}`];
          return (
            <g key={key} className="g-mark g-in" data-testid="graph-mark">
              <circle className="pop" cx={sx(m.x)} cy={sy(m.y)} r="5" fill="var(--ds-card)" stroke={m.tone ? col : 'var(--g-blue)'} strokeWidth="2.6" />
              {at && <text x={at.x} y={at.y} fontSize="12.5" fontWeight="700" fill={m.tone ? col : 'var(--ds-ink)'} textAnchor={at.anchor} stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{m.label}</text>}
            </g>
          );
        }
        if (m.t === 'x') {
          return (
            <g key={key} className="g-mark g-in" data-testid="graph-mark">
              <line className="draw" pathLength="1" x1={sx(m.x)} x2={sx(m.x)} y1={H - M.b} y2={sy(m.y ?? y1)} stroke="var(--g-teal)" strokeWidth="1.8" strokeDasharray="4 4" />
              <rect x={sx(m.x) - 30} y={H - M.b + 18} width="60" height="17" rx="8.5" fill="var(--g-teal)" />
              <text x={sx(m.x)} y={H - M.b + 30.5} fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">{m.label}</text>
            </g>
          );
        }
        if (m.t === 'y') {
          return (
            <g key={key} className="g-mark g-in" data-testid="graph-mark">
              <line className="draw" pathLength="1" x1={M.l} x2={sx(m.x ?? x1)} y1={sy(m.y)} y2={sy(m.y)} stroke="var(--g-teal)" strokeWidth="1.8" strokeDasharray="4 4" />
              <text x={M.l + 4} y={sy(m.y) - 5} fontSize="12" fontWeight="800" fill="var(--g-teal)">{m.label}</text>
            </g>
          );
        }
        if (m.t === 'seg') {
          const a = sx(m.x0); const b = sx(m.x1); const y = sy(m.y);
          return (
            <g key={key} className="g-mark g-in" data-testid="graph-mark">
              <line className="draw" pathLength="1" x1={a} x2={b} y1={y} y2={y} stroke={col} strokeWidth="6" strokeLinecap="round" strokeOpacity=".75" />
              <text className="fade" x={(a + b) / 2} y={y - 9} fontSize="12.5" fontWeight="800" fill={col} textAnchor="middle" stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{m.label}</text>
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}


/* сцена шага для числовой плоскости на весь экран («Нарисуй сам», src/learn-draw.jsx): то же, что видно в GraphStage —
   значения шага и живые ползунки, кривые и точки, показанные на шаге (с alsoShow / alsoHide) */
export function stageScene(g, k, { live = null, alsoShow = null, alsoHide = null } = {}) {
  const def = g.def || CHARTS[g.chart];
  const view0 = stepView(g, k);
  const view = alsoShow || alsoHide ? { ...view0, shown: new Set([...view0.shown, ...(alsoShow || [])].filter((id) => !(alsoHide || []).includes(id))) } : view0;
  const defaults = Object.fromEntries((def.controls ? def.controls(g.attrs) : []).filter((c) => !c.button).map((c) => [c.id, c.def]));
  return stepScene(sceneInCrowns(def.build(g.attrs, { ...defaults, ...view.values, ...live })), view);
}
