/* «НАРИСУЙ САМ» (docs/mechanics.md, «Нарисуй сам»; задания и проверка — src/learn/draws.js): ученик сам
   строит график юнита по условию. Наверху — условие шага, ниже — график (та же сцена, что у «Разбора
   графика», GraphStage), поверх — прозрачный слой, на котором ученик ставит точки (они прилипают к сетке,
   рядом — их координаты и пунктир к осям) или тянет кривую. «Проверить»: верно — нужная линия или точка
   появляется на графике по-настоящему и под ним — что это значит; ошибка — что не так и подсказка, можно
   ещё раз; вторая ошибка — график показывает, как надо, и урок идёт дальше. В конце — «+15 опыта» (один раз). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowRight, Check, PenLine, RotateCcw, Lightbulb } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button, IconButton } from './ds.jsx';
import { GraphStage, GRAPH_CSS, W, H, M } from './learn-graph.jsx';
import { CHARTS } from './textbook/charts.js';
import { DRAW_BY_ID, DRAW_XP, isDrawDone, checkTask, solveTask, snapTo, drawScene, drawTour } from './learn/draws.js';
import { finishLesson, markDraw } from './textbook/learn-state.js';
import { ReportFlag, EXPLAIN_REASONS } from './learn-report.jsx';

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
  @media (prefers-reduced-motion: reduce) { .dl-task, .dl-fb { animation: none; } }
`;

const rich = (t) => String(t).split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
const HOW = {
  line: 'Нажмите на график в двух местах — точки прилипают к сетке; точку можно перетащить.',
  point: 'Нажмите на график — точку можно перетащить.',
  shift: 'Потяните график пальцем или мышью вбок — или двигайте ползунок под ним.',
  area: 'Нажмите внутрь нужной области.',
};

export default function DrawLesson({ id, learn, update, onClose }) {
  const d = DRAW_BY_ID[id];
  const tour = useMemo(() => (d ? drawTour(d) : null), [d]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('task'); // task → done
  const [pts, setPts] = useState([]);
  const [v, setV] = useState(0);
  const [hover, setHover] = useState(null);
  const [tries, setTries] = useState(0);
  const [res, setRes] = useState(null); // { ok, why } | { shown: true }
  const firstTry = useRef(0);
  const started = useRef(Date.now());
  const root = useRef(null);
  const ink = useRef(null);
  const drag = useRef(null);
  const fb = useRef(null);
  const [already] = useState(() => isDrawDone(learn, id));
  useEffect(() => { if (root.current) root.current.scrollTo({ top: 0 }); }, [i, phase]);
  // ответ проверен — разбор под графиком в поле зрения (на телефоне он уходил под нижнюю панель)
  useEffect(() => { if (res && fb.current && fb.current.scrollIntoView) fb.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [res]);
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);
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
  // ответ ученика в виде, который понимает checkTask
  const answer = t.do === 'line' ? (pts.length === 2 ? { a: pts[0], b: pts[1] } : null) : t.do === 'shift' ? { v } : pts.length ? { p: pts[0] } : null;
  const ready = t.do === 'shift' ? v !== 0 : t.do === 'line' ? pts.length === 2 : pts.length === 1;

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
    if (resolved || phase !== 'task') return;
    const raw = toData(e); if (!raw) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старый браузер */ }
    touch();
    if (t.do === 'shift') { drag.current = { x: raw.x, v }; return; }
    const p = place(raw);
    if (t.do === 'line') {
      // рядом с поставленной точкой — тащим её; две уже есть — переставляем ближнюю
      const near = pts.map((q, k) => ({ k, dd: Math.hypot(sx(q.x) - sx(raw.x), sy(q.y) - sy(raw.y)) })).sort((a, b) => a.dd - b.dd)[0];
      const k = near && (near.dd < 16 || pts.length >= 2) ? near.k : pts.length;
      const next = [...pts]; next[k] = p; setPts(next); drag.current = { k };
    } else { setPts([p]); drag.current = { k: 0 }; }
    Audio.play('tick');
  };
  const move = (e) => {
    const raw = toData(e); if (!raw) return;
    if (!drag.current) { if (e.pointerType === 'mouse' && !resolved && t.do !== 'shift') setHover(place(raw)); return; }
    if (t.do === 'shift') { setV(clampV(drag.current.v + (raw.x - drag.current.x))); return; }
    const p = place(raw); const k = drag.current.k;
    setPts((prev) => { const next = [...prev]; next[k] = p; return next; });
  };
  const up = () => { drag.current = null; };

  const check = () => {
    if (!ready || resolved) return;
    const r = checkTask(d, t, answer);
    setHover(null);
    if (r.ok) {
      if (tries === 0) firstTry.current += 1;
      Audio.play('coin'); setRes({ ok: true }); return;
    }
    Audio.play('down');
    if (tries >= 1) { setRes({ shown: true, why: r.why }); setTries(tries + 1); return; }
    setTries(1); setRes({ ok: false, why: r.why });
  };
  const finish = () => {
    Audio.play('register');
    if (!already && update) {
      update((s) => markDraw(finishLesson(s, null, { xp: DRAW_XP, accuracy: Math.round((firstTry.current / n) * 100), seconds: Math.min(900, (Date.now() - started.current) / 1000), kind: 'draw', extra: { fresh: true } }), id));
    }
    setPhase('done');
  };
  const next = () => {
    if (i >= n - 1) { finish(); return; }
    Audio.play('paper');
    setI(i + 1); setPts([]); setV(0); setTries(0); setRes(null); setHover(null);
  };
  const reset = () => { Audio.play('tick'); setPts([]); setV(0); touch(); };

  // что видно на графике: решено — шаг вперёд (новое появляется), иначе — как было плюс то, что нужно шагу
  const k = phase === 'done' ? n : i + (resolved ? 1 : 0);
  const sol = res && res.shown ? solveTask(d, t) : null;
  const solveView = sol ? (sol.a ? [sol.a, sol.b] : sol.p ? [sol.p] : []).map((q) => [Math.round(sx(q.x) * 10) / 10, Math.round(sy(q.y) * 10) / 10]) : [];
  const testAnswer = (() => { const s = solveTask(d, t); return JSON.stringify(s.v != null ? { v: s.v } : { pts: (s.a ? [s.a, s.b] : [s.p]).map((q) => [sx(snapTo(d, q).x), sy(snapTo(d, q).y)]) }); })();
  const mine = res && res.shown ? 'var(--g-rust)' : 'var(--g-blue)';
  const coordLabel = (q) => `${fmt(q.x)}; ${fmt(q.y)}`;
  const pin = (q, key, col, label) => (
    <g key={key} className="dl-pin">
      <line x1={sx(q.x)} x2={sx(q.x)} y1={sy(q.y)} y2={H - M.b} stroke={col} strokeOpacity=".45" strokeDasharray="3 4" />
      <line x1={sx(q.x)} x2={M.l} y1={sy(q.y)} y2={sy(q.y)} stroke={col} strokeOpacity=".45" strokeDasharray="3 4" />
      <circle cx={sx(q.x)} cy={sy(q.y)} r="6.5" fill="var(--ds-card)" stroke={col} strokeWidth="3" />
      {label && <text className="dl-coord" x={sx(q.x) + (sx(q.x) > W - 80 ? -10 : 10)} y={sy(q.y) - 10} textAnchor={sx(q.x) > W - 80 ? 'end' : 'start'} fill={col} stroke="var(--ds-card)" strokeWidth="4" paintOrder="stroke">{label}</text>}
    </g>
  );
  // линия через две точки ученика — до краёв поля, пунктиром: видно, куда она пойдёт
  const through = () => {
    if (t.do !== 'line' || pts.length !== 2 || (pts[0].x === pts[1].x && pts[0].y === pts[1].y)) return null;
    const [a, b] = pts; const dx = b.x - a.x; const dy = b.y - a.y;
    const far = 4 * Math.max(x1 - x0, y1 - y0) / Math.max(1e-9, Math.hypot(dx, dy));
    const p = { x: a.x - dx * far, y: a.y - dy * far }; const q = { x: a.x + dx * far, y: a.y + dy * far };
    return <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(q.x)} y2={sy(q.y)} stroke={mine} strokeWidth="2.2" strokeDasharray="7 6" strokeOpacity=".75" clipPath={`url(#dlc${id})`} />;
  };

  const body = (
    <div className="gl" ref={root} role="dialog" aria-label={`Нарисуй сам: ${d.title}`} data-testid="draw-lesson" data-id={id} data-phase={phase} data-task={i}>
      <style>{GRAPH_CSS}</style>
      <style>{CSS}</style>
      <div className="gl-head">
        <div className="gl-top">
          <IconButton label="Закрыть" icon={X} data-testid="draw-close" onClick={() => { Audio.play('paper'); onClose(); }} />
          <div className="gl-title"><small>Нарисуй сам</small>{d.title}</div>
          <ReportFlag withText text="Ошибка?" reasons={EXPLAIN_REASONS} sub="Что не так в задании? Шаг, его текст и устройство приложатся сами." context={() => ({
            screen: 'draw', lesson: id, unit: d.unitId, kind: 'draw',
            step: phase === 'done' ? 'итог' : `шаг ${i + 1} из ${n}`,
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
            {!resolved && <span className="dl-how">{HOW[t.do]}</span>}
          </div>
          <div className="gl-stage">
            <div className="dl-wrap">
              <GraphStage g={tour} k={k} live={t.do === 'shift' && !resolved ? { [t.control]: v } : null}
                alsoShow={!resolved && t.show ? t.show : null} alsoHide={!resolved && t.hide ? t.hide : null} />
              <svg ref={ink} className={`dl-ink${t.do === 'shift' ? ' shift' : ''}${resolved ? ' off' : ''}`} viewBox={`0 0 ${W} ${H}`} data-testid="draw-ink"
                data-answer={testAnswer} data-ready={String(ready)} aria-label="Поле для рисования"
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => setHover(null)}>
                <defs><clipPath id={`dlc${id}`}><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
                {/* мелкая сетка: крупные деления графика редкие (0, 200, 400), а в условии — «100 пекарей» */}
                <g pointerEvents="none" stroke="var(--g-grid)" strokeOpacity=".7">
                  {Array.from({ length: Math.floor((x1 - x0) / d.grid[0]) + 1 }, (_, j) => x0 + j * d.grid[0]).map((x) => <line key={`mx${x}`} x1={sx(x)} x2={sx(x)} y1={M.t} y2={H - M.b} />)}
                  {Array.from({ length: Math.floor((y1 - y0) / d.grid[1]) + 1 }, (_, j) => y0 + j * d.grid[1]).map((y) => <line key={`my${y}`} x1={M.l} x2={W - M.r} y1={sy(y)} y2={sy(y)} />)}
                </g>
                {!res?.ok && through()}
                {hover && !drag.current && pts.length < (t.do === 'line' ? 2 : 1) && (
                  <g opacity=".55" pointerEvents="none">{pin(hover, 'hover', 'var(--g-blue)', coordLabel(hover))}</g>
                )}
                {!res?.ok && pts.map((q, j) => pin(q, `p${j}`, mine, t.do === 'area' ? null : coordLabel(q)))}
                {solveView.length > 0 && t.do !== 'line' && t.do !== 'shift' && solveView.map(([cx, cy], j) => (
                  <circle key={`s${j}`} cx={cx} cy={cy} r="9" fill="none" stroke="var(--ds-ok)" strokeWidth="3" data-testid="draw-solution" />
                ))}
              </svg>
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
          {res && (
            <div ref={fb} className={`dl-fb${res.ok ? '' : res.shown ? ' shown' : ' bad'}`} role="status" data-testid="draw-feedback" data-ok={String(!!res.ok)} data-shown={String(!!res.shown)}>
              {res.ok && <><b>Верно.</b> {rich(t.done)}</>}
              {!res.ok && !res.shown && <><b>{res.why || 'Не совсем.'}</b><div className="dl-hint"><Lightbulb size={16} aria-hidden="true" /><span>{rich(t.hint)} Попробуйте ещё раз.</span></div></>}
              {res.shown && <><b>{res.why ? `${res.why} ` : ''}Вот как надо:</b> {rich(t.hint)} {rich(t.done)}</>}
            </div>
          )}
        </div>
      )}
      {phase === 'done' && (
        <div className="gl-page gl-done" data-testid="draw-done">
          <div className="gl-stage" style={{ marginBottom: 14 }}><GraphStage g={tour} k={n} /></div>
          <div className="gl-medal" aria-hidden="true"><PenLine size={54} strokeWidth={1.8} /></div>
          <div className="ds-eyebrow">Нарисуй сам</div>
          <h2>{d.title}</h2>
          <div className="ds-sub" style={{ fontSize: 15 }}>{already ? 'График построен — к нему можно вернуться на дороге юнита.' : `+${DRAW_XP} опыта · с первой попытки — ${firstTry.current} из ${n}`}</div>
        </div>
      )}
      <div className="gl-foot">
        <div>
          {phase === 'done'
            ? <Button wide data-testid="draw-finish" onClick={() => { Audio.play('click'); onClose(); }}>Готово</Button>
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
