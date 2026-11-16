/* ГРАФИК НА ВЕСЬ ЭКРАН — НАСТОЯЩАЯ ЧИСЛОВАЯ ПЛОСКОСТЬ (пункт владельца 16.11, вечер: «открытие графика на весь экран всё ещё
   отвратительное, должно быть реально классно, современно, реальная числовая плоскость»; docs/mechanics.md, «Картинки на весь
   экран»). Не увеличенная картинка, а окно в бесконечную плоскость:
   — сетка и деления пересчитываются под масштаб (шаг 1–2–2,5–5·10ⁿ), мелкая сетка между крупными; оси x = 0 и y = 0 — ярче;
     уехали за край — деления прилипают к краю экрана;
   — плоскость двигают пальцем или мышью, приближают колёсиком к курсору, щипком, двойным касанием, кнопками и клавишами
     (стрелки, «+», «−», «0» — вписать); Shift + колёсико — только по горизонтали, Alt + колёсико — только по вертикали;
   — линии, области и точки графика перерисовываются в точках экрана: при любом приближении линии тонкие и чёткие;
   — наведение (касание) показывает ближайшую точку линии и её значения по обеим осям;
   — «Вписать» плавно возвращает весь график. Математика — src/lib/plane.js. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Maximize2 } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { themeOf } from './zoom-view.jsx';
import { niceStep, ticks, fitPlane, toPx, toData, zoomPlane, panPlane, zoomLevel, nearestOnCurves, fmtPlane, lerpPlane } from './lib/plane.js';

const CSS = `
  .pv { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: var(--ds-paper, #FBF6EC); color: var(--ds-ink, #222);
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); animation: pv-in .2s ease-out;
    --pv-blue: #2459A6; --pv-rust: #B4441A; --pv-teal: #0E7A72; --pv-gold: #9A6A00; --pv-grid: color-mix(in srgb, var(--ds-ink, #222) 7%, transparent);
    --pv-grid2: color-mix(in srgb, var(--ds-ink, #222) 15%, transparent); --pv-axis: color-mix(in srgb, var(--ds-ink, #222) 55%, transparent); }
  .ds-dark .pv, .pv.ds-dark, .pv.dark { --pv-blue: #8DB6F2; --pv-rust: #F29A6E; --pv-teal: #5ED3C4; --pv-gold: #E9C25A; }
  @keyframes pv-in { from { opacity: 0; transform: scale(.985); } }
  .pv-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px 6px; }
  .pv-title { flex: 1; min-width: 0; font: 700 15px/1.3 var(--ds-sans, sans-serif); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pv-btn { width: 40px; height: 40px; flex: none; display: grid; place-items: center; padding: 0; border-radius: 12px; cursor: pointer; border: 1px solid var(--ds-rule2, #d9cdb8);
    background: var(--ds-card, #fff); color: var(--ds-ink, #222); transition: transform .12s, border-color .15s; }
  .pv-btn:hover { border-color: var(--pv-blue); } .pv-btn:active { transform: scale(.92); }
  .pv-btn.wide { width: auto; padding: 0 12px; gap: 6px; display: inline-flex; align-items: center; font: 600 13px var(--ds-sans, sans-serif); }
  .pv-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; overscroll-behavior: contain;
    border-top: 1px solid var(--ds-rule2, #d9cdb8); border-bottom: 1px solid var(--ds-rule2, #d9cdb8); background: var(--ds-card, #fff); }
  .pv-stage.dragging { cursor: grabbing; }
  .pv-stage svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .pv-stage text { font-family: var(--ds-sans, sans-serif); }
  .pv-foot { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px 12px; flex-wrap: wrap; }
  .pv-level { min-width: 4.2em; text-align: center; font: 700 13px var(--ds-sans, sans-serif); color: var(--ds-ink2, #555); font-variant-numeric: tabular-nums; }
  .pv-read { position: absolute; left: 12px; top: 10px; padding: 6px 10px; border-radius: 10px; font: 600 13px/1.35 var(--ds-sans, sans-serif); font-variant-numeric: tabular-nums;
    background: color-mix(in srgb, var(--ds-card, #fff) 92%, transparent); border: 1px solid var(--ds-rule2, #d9cdb8); box-shadow: 0 8px 20px -12px rgba(0,0,0,.35); pointer-events: none; }
  .pv-read b { font-weight: 800; }
  .pv-hint { position: absolute; right: 12px; bottom: 10px; font: 500 12px var(--ds-sans, sans-serif); color: var(--ds-ink3, #888); pointer-events: none; }
  .pv-cap { width: 100%; max-width: 720px; margin: 0 auto; padding: 0 12px 4px; font: 400 13.5px/1.45 var(--ds-sans, sans-serif); color: var(--ds-ink2, #555); max-height: 4.5em; overflow: auto; text-align: center; }
  @media (prefers-reduced-motion: reduce) { .pv { animation: none; } }
`;
const COL = { gold: 'var(--pv-gold)', teal: 'var(--pv-teal)', rust: 'var(--pv-rust)', blue: 'var(--pv-blue)' };
const col = (c) => COL[c] || 'var(--pv-gold)';
const easeOut = (t) => 1 - (1 - t) ** 3;

export function PlaneViewer({ title, scene, caption = null, from = null, onClose }) {
  const stage = useRef(null);
  const closeBtn = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fit = useRef(fitPlane(scene.xDomain, scene.yDomain));
  const [v, setV] = useState(fit.current);
  const vRef = useRef(v); const sizeRef = useRef(size);
  const [hover, setHover] = useState(null);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map()); const gesture = useRef(null); const lastTap = useRef({ t: 0, x: 0, y: 0 }); const anim = useRef(0);
  const [theme] = useState(() => themeOf(from));
  const set = (nv) => { vRef.current = nv; setV(nv); };
  // плавно к виду target (кнопки, «вписать», двойное касание)
  const glide = (target) => {
    cancelAnimationFrame(anim.current);
    const a = vRef.current; const t0 = performance.now(); const dur = 260;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); set(lerpPlane(a, target, easeOut(k))); if (k < 1) anim.current = requestAnimationFrame(step); };
    anim.current = requestAnimationFrame(step);
  };

  useLayoutEffect(() => {
    const measure = () => { const st = stage.current; if (!st) return; const s = { w: st.clientWidth, h: st.clientHeight }; sizeRef.current = s; setSize(s); };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure); ro.observe(stage.current);
    return () => ro.disconnect();
  }, []);
  // Esc закрывает только просмотр; страница под слоем не прокручивается; фокус — на крестик
  useEffect(() => {
    const prev = document.activeElement;
    const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', esc, true);
    const over = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (closeBtn.current) closeBtn.current.focus({ preventScroll: true });
    return () => { window.removeEventListener('keydown', esc, true); document.body.style.overflow = over; cancelAnimationFrame(anim.current); if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch { /* нет элемента */ } } };
  }, [onClose]);
  const local = (e) => { const r = stage.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // колёсико — к курсору (Shift — только x, Alt — только y); жест тачпада Safari
  useEffect(() => {
    const st = stage.current; if (!st) return undefined;
    const wheel = (e) => {
      e.preventDefault(); cancelAnimationFrame(anim.current);
      const { w, h } = sizeRef.current; if (!w) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; const p = local(e);
      set(zoomPlane(vRef.current, Math.exp(-dy * 0.0022), p.x, p.y, w, h, { ax: !e.altKey, ay: !e.shiftKey }));
    };
    let gs = 1;
    const gStart = (e) => { e.preventDefault(); gs = 1; };
    const gChange = (e) => { e.preventDefault(); const { w, h } = sizeRef.current; const f = e.scale / gs; gs = e.scale; set(zoomPlane(vRef.current, f, w / 2, h / 2, w, h)); };
    st.addEventListener('wheel', wheel, { passive: false });
    st.addEventListener('gesturestart', gStart, { passive: false });
    st.addEventListener('gesturechange', gChange, { passive: false });
    return () => { st.removeEventListener('wheel', wheel); st.removeEventListener('gesturestart', gStart); st.removeEventListener('gesturechange', gChange); };
  }, []);

  const down = (e) => {
    cancelAnimationFrame(anim.current);
    pointers.current.set(e.pointerId, local(e));
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старый браузер */ }
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), v0: vRef.current, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; return; }
    const p = local(e);
    // двойное касание — приблизить вдвое к этому месту
    const now = Date.now(); const lt = lastTap.current;
    if (now - lt.t < 320 && Math.hypot(p.x - lt.x, p.y - lt.y) < 24) { const { w, h } = sizeRef.current; glide(zoomPlane(vRef.current, 2, p.x, p.y, w, h)); lastTap.current = { t: 0, x: 0, y: 0 }; return; }
    lastTap.current = { t: now, x: p.x, y: p.y };
    gesture.current = { pan: true, x: p.x, y: p.y, v0: vRef.current, moved: false };
  };
  const move = (e) => {
    const p = local(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    const g = gesture.current; const { w, h } = sizeRef.current;
    if (g && g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y); const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      set(panPlane(zoomPlane(g.v0, d / (g.d0 || 1), g.m.x, g.m.y, w, h), m.x - g.m.x, m.y - g.m.y, w, h));
      return;
    }
    if (g && g.pan) {
      if (!g.moved && Math.hypot(p.x - g.x, p.y - g.y) > 4) { g.moved = true; setDragging(true); }
      if (g.moved) { set(panPlane(g.v0, p.x - g.x, p.y - g.y, w, h)); setHover(null); return; }
    }
    if (!g || e.pointerType === 'mouse') setHover(p);
  };
  const up = (e) => {
    const g = gesture.current; const p = local(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && g && g.pinch) gesture.current = null;
    if (!pointers.current.size) { if (g && g.pan && !g.moved) setHover(p); gesture.current = null; setDragging(false); }
  };
  const zoomBy = (f) => { Audio.play('tick'); const { w, h } = sizeRef.current; glide(zoomPlane(vRef.current, f, w / 2, h / 2, w, h)); };
  const fitAll = () => { Audio.play('tick'); glide(fit.current); };
  const keys = (e) => {
    const { w, h } = sizeRef.current;
    const pan = { ArrowLeft: [w * 0.12, 0], ArrowRight: [-w * 0.12, 0], ArrowUp: [0, h * 0.12], ArrowDown: [0, -h * 0.12] }[e.key];
    if (pan) { e.preventDefault(); glide(panPlane(vRef.current, pan[0], pan[1], w, h)); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.5); } else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.5); } else if (e.key === '0') { e.preventDefault(); fitAll(); }
  };

  const { w, h } = size;
  const P = toPx(v, w, h);
  const ready = w > 0 && h > 0;
  const sxStep = ready ? niceStep(v.x1 - v.x0, w) : 1; const syStep = ready ? niceStep(v.y1 - v.y0, h) : 1;
  const xt = ready ? ticks(v.x0, v.x1, sxStep) : []; const yt = ready ? ticks(v.y0, v.y1, syStep) : [];
  const xm = ready ? ticks(v.x0, v.x1, sxStep / 5) : []; const ym = ready ? ticks(v.y0, v.y1, syStep / 5) : [];
  // оси: x = 0 и y = 0, а уехали — деления у края экрана
  const axY = Math.max(16, Math.min(h - 22, P.y(0))); const axX = Math.max(8, Math.min(w - 8, P.x(0)));
  const path = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${P.x(q.x).toFixed(1)},${P.y(q.y).toFixed(1)}`).join(' ');
  const curves = (scene.curves || []).filter((c) => c.points && c.points.length > 1);
  const hit = hover && ready ? nearestOnCurves(curves.filter((c) => !c.ghost), v, w, h, hover.x, hover.y) : null;
  const read = hit ? hit : hover && ready ? { ...toData(v, w, h, hover.x, hover.y), curve: null } : null;
  const halo = { stroke: 'var(--ds-card, #fff)', strokeWidth: 4, paintOrder: 'stroke', strokeLinejoin: 'round' };
  const level = zoomLevel(fit.current, v);

  return createPortal(
    <div className={`pv ${theme.className}`} style={theme.style || undefined} role="dialog" aria-modal="true" aria-label={`${title} — числовая плоскость`} data-testid="plane-view">
      <style>{CSS}</style>
      <div className="pv-head">
        <div className="pv-title">{title}</div>
        <button ref={closeBtn} type="button" className="pv-btn" aria-label="Закрыть" data-testid="plane-close" onClick={() => { Audio.play('paper'); onClose(); }}><X size={18} /></button>
      </div>
      <div ref={stage} className={`pv-stage${dragging ? ' dragging' : ''}`} tabIndex={0} aria-label="График: двигайте и приближайте. Стрелки — сдвиг, плюс и минус — масштаб, ноль — вписать"
        data-testid="plane-stage" data-x0={v.x0} data-x1={v.x1} data-y0={v.y0} data-y1={v.y1} data-step-x={sxStep} data-step-y={syStep}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }} onKeyDown={keys}>
        {ready && (
          <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {/* за пределами смысла (отрицательные количества и цены) — чуть притенено */}
            <rect x={0} y={0} width={Math.max(0, P.x(0))} height={h} fill="var(--pv-grid)" />
            <rect x={Math.max(0, P.x(0))} y={Math.max(0, P.y(0))} width={w} height={Math.max(0, h - P.y(0))} fill="var(--pv-grid)" />
            {xm.map((t) => <line key={`mx${t}`} x1={P.x(t)} x2={P.x(t)} y1={0} y2={h} stroke="var(--pv-grid)" />)}
            {ym.map((t) => <line key={`my${t}`} x1={0} x2={w} y1={P.y(t)} y2={P.y(t)} stroke="var(--pv-grid)" />)}
            {xt.map((t) => <line key={`gx${t}`} x1={P.x(t)} x2={P.x(t)} y1={0} y2={h} stroke="var(--pv-grid2)" />)}
            {yt.map((t) => <line key={`gy${t}`} x1={0} x2={w} y1={P.y(t)} y2={P.y(t)} stroke="var(--pv-grid2)" />)}
            <line x1={0} x2={w} y1={P.y(0)} y2={P.y(0)} stroke="var(--pv-axis)" strokeWidth="1.6" />
            <line x1={P.x(0)} x2={P.x(0)} y1={0} y2={h} stroke="var(--pv-axis)" strokeWidth="1.6" />
            {(scene.rects || []).map((r, i) => <rect key={`r${i}`} x={P.x(r.x0)} y={P.y(r.y1)} width={Math.max(0, P.x(r.x1) - P.x(r.x0))} height={Math.max(0, P.y(r.y0) - P.y(r.y1))} fill={col(r.tone === 'rust' ? 'rust' : 'gold')} fillOpacity=".18" />)}
            {(scene.polys || []).map((g, i) => <path key={`p${i}`} d={`${path(g.points)} Z`} fill={col(g.tone || 'gold')} fillOpacity=".2" />)}
            {curves.map((c) => <path key={c.id} d={path(c.points)} fill="none" stroke={col(c.color)} strokeWidth={c.ghost ? 2 : 3} strokeOpacity={c.ghost ? 0.4 : 1} strokeDasharray={c.dashed || c.ghost ? '7 6' : undefined} strokeLinecap="round" strokeLinejoin="round" />)}
            {(scene.points || []).filter((q) => q.guide).map((q, i) => (
              <g key={`gd${i}`} stroke="var(--pv-axis)" strokeDasharray="4 5" strokeWidth="1.2"><line x1={P.x(q.x)} x2={P.x(q.x)} y1={P.y(q.y)} y2={P.y(0)} /><line x1={P.x(0)} x2={P.x(q.x)} y1={P.y(q.y)} y2={P.y(q.y)} /></g>
            ))}
            {(scene.points || []).map((q, i) => <circle key={`pt${i}`} cx={P.x(q.x)} cy={P.y(q.y)} r={q.small ? 4.5 : 6.5} fill="var(--ds-card, #fff)" stroke="var(--pv-gold)" strokeWidth="2.6" />)}
            {/* подписи: деления — у осей (или у края экрана), названия осей — в углах */}
            {xt.filter((t) => Math.abs(t) > 1e-12 || P.x(0) < 8 || P.x(0) > w - 8).map((t) => <text key={`tx${t}`} x={P.x(t)} y={axY + 15} fontSize="12.5" fill="var(--ds-ink3, #888)" textAnchor="middle" {...halo}>{fmtPlane(t, sxStep)}</text>)}
            {yt.filter((t) => Math.abs(t) > 1e-12).map((t) => <text key={`ty${t}`} x={axX - 6 < 40 ? axX + 6 : axX - 6} y={P.y(t) + 4} fontSize="12.5" fill="var(--ds-ink3, #888)" textAnchor={axX - 6 < 40 ? 'start' : 'end'} {...halo}>{fmtPlane(t, syStep)}</text>)}
            <text x={w - 12} y={axY - 8} fontSize="14" fontStyle="italic" fill="var(--ds-ink2, #555)" textAnchor="end" {...halo}>{scene.xLabel}</text>
            <text x={axX + 8} y={18} fontSize="14" fontStyle="italic" fill="var(--ds-ink2, #555)" {...halo}>{scene.yLabel}</text>
            {curves.filter((c) => c.label && !c.ghost).map((c) => {
              const k = Math.max(0, Math.min(c.points.length - 1, Math.round((c.labelPos ?? 0.85) * (c.points.length - 1)))); const q = c.points[k];
              return <text key={`l${c.id}`} x={P.x(q.x) + 6} y={P.y(q.y) - 8} fontSize="15" fontWeight="800" fill={col(c.color)} {...halo}>{c.label}</text>;
            })}
            {(scene.polys || []).filter((g) => g.label).map((g, i) => { const cx = g.points.reduce((s, q) => s + q.x, 0) / g.points.length; const cy = g.points.reduce((s, q) => s + q.y, 0) / g.points.length;
              return <text key={`pl${i}`} x={P.x(cx)} y={P.y(cy)} fontSize="13.5" fontWeight="700" fill={col(g.tone || 'gold')} textAnchor="middle" {...halo}>{g.label}</text>; })}
            {(scene.points || []).filter((q) => q.label).map((q, i) => <text key={`ptl${i}`} x={P.x(q.x) + 9} y={P.y(q.y) - 9} fontSize="13.5" fontWeight="700" fill="var(--ds-ink, #222)" {...halo}>{q.label}</text>)}
            {/* курсор: ближайшая точка линии и значения на осях */}
            {read && (
              <g pointerEvents="none" data-testid="plane-cursor">
                <line x1={P.x(read.x)} x2={P.x(read.x)} y1={P.y(read.y)} y2={axY} stroke="var(--pv-blue)" strokeDasharray="3 4" strokeWidth="1.3" />
                <line x1={axX} x2={P.x(read.x)} y1={P.y(read.y)} y2={P.y(read.y)} stroke="var(--pv-blue)" strokeDasharray="3 4" strokeWidth="1.3" />
                <circle cx={P.x(read.x)} cy={P.y(read.y)} r={hit ? 6 : 3.5} fill={hit ? col(hit.curve.color) : 'var(--pv-blue)'} stroke="var(--ds-card, #fff)" strokeWidth="2.5" />
              </g>
            )}
          </svg>
        )}
        {read && (
          <div className="pv-read" data-testid="plane-read">
            {read.curve && read.curve.label ? <b style={{ color: col(read.curve.color) }}>{read.curve.label}: </b> : null}
            {scene.xLabel || 'x'} <b>{fmtPlane(read.x, sxStep / 10)}</b> · {scene.yLabel || 'y'} <b>{fmtPlane(read.y, syStep / 10)}</b>
          </div>
        )}
        <div className="pv-hint">тяните — двигать · колёсико или щипок — масштаб</div>
      </div>
      {caption && <div className="pv-cap" data-testid="plane-caption">{caption}</div>}
      <div className="pv-foot">
        <button type="button" className="pv-btn" aria-label="Отдалить" data-testid="plane-out" onClick={() => zoomBy(1 / 1.6)}><Minus size={18} /></button>
        <span className="pv-level" data-testid="plane-level" aria-live="polite">×{(Math.round(level * 10) / 10).toFixed(1).replace('.', ',')}</span>
        <button type="button" className="pv-btn" aria-label="Приблизить" data-testid="plane-in" onClick={() => zoomBy(1.6)}><Plus size={18} /></button>
        <button type="button" className="pv-btn wide" data-testid="plane-fit" onClick={fitAll}><Maximize2 size={15} aria-hidden="true" />Вписать</button>
      </div>
    </div>,
    document.body,
  );
}
