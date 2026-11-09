/* КАРТИНКА НА ВЕСЬ ЭКРАН (docs/mechanics.md, «Картинки на весь экран»): нажали на график, схему или портрет —
   он открывается поверх всего экрана, целиком. Приблизить — щипком, колёсиком (к курсору), двойным касанием
   или кнопками «+» / «−»; приближенную картинку двигают пальцем или мышью; «Вписать» — снова целиком.
   Закрыть — крестик или Esc. Расчёт масштаба и сдвига — src/lib/view-zoom.js.
   Слой — в body (у предков бывают transform и zoom, с ними position: fixed съезжает), а цвета темы
   (CSS-переменные корня .ds) переносятся с того места, где картинка стояла. Esc закрывает только просмотр. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Maximize2, Expand } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { fitView, zoomAround, panBy, pinchView, zoomOf, ZOOM_MAX } from './lib/view-zoom.js';

const CSS = `
  .zv-hit { position: relative; cursor: zoom-in; border-radius: 10px; outline-offset: 3px; }
  .zv-hit:focus-visible { outline: 2px solid var(--ds-sel-rule, #2459A6); }
  .zv-badge { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--ds-card, #fff) 88%, transparent); border: 1px solid var(--ds-rule2, #d9cdb8); color: var(--ds-ink2, #555);
    opacity: .78; pointer-events: none; transition: opacity .15s; }
  .zv-badge.br { top: auto; right: 10px; bottom: 10px; }
  .zv-hit:hover .zv-badge, .zv-hit:focus-visible .zv-badge { opacity: 1; }
  .zv { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: var(--ds-paper, #FBF6EC); color: var(--ds-ink, #222);
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); animation: zv-in .18s ease-out; }
  @keyframes zv-in { from { opacity: 0; } to { opacity: 1; } }
  .zv-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px 6px; }
  .zv-title { flex: 1; min-width: 0; font: 700 15px/1.3 var(--ds-sans, sans-serif); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .zv-btn { width: 40px; height: 40px; flex: none; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 12px; cursor: pointer;
    border: 1px solid var(--ds-rule2, #d9cdb8); background: var(--ds-card, #fff); color: var(--ds-ink, #222); }
  .zv-btn:disabled { opacity: .4; cursor: default; }
  .zv-btn:not(:disabled):hover { border-color: var(--ds-sel-rule, #2459A6); }
  .zv-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; overscroll-behavior: contain; }
  .zv-stage.fit { cursor: zoom-in; }
  .zv-stage.dragging { cursor: grabbing; }
  .zv-content { position: absolute; left: 0; top: 0; transform-origin: 0 0; background: var(--ds-card, #fff); border-radius: 6px; }
  .zv-content.ready { transition: none; }
  .zv-content img { display: block; width: 100%; height: auto; -webkit-user-drag: none; pointer-events: none; }
  .zv-content svg { pointer-events: none; }
  .zv-foot { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px 12px; flex-wrap: wrap; }
  .zv-level { min-width: 4.2em; text-align: center; font: 700 13px var(--ds-sans, sans-serif); color: var(--ds-ink2, #555); font-variant-numeric: tabular-nums; }
  .zv-cap { width: 100%; max-width: 720px; margin: 0 auto; padding: 0 12px 4px; font: 400 13.5px/1.45 var(--ds-sans, sans-serif); color: var(--ds-ink2, #555);
    max-height: 4.5em; overflow: auto; text-align: center; }
  .zv-fit-btn { width: auto; padding: 0 12px; gap: 6px; font: 600 13px var(--ds-sans, sans-serif); }
  @media (prefers-reduced-motion: reduce) { .zv { animation: none; } }
`;

const fmtZoom = (z) => `×${(Math.round(z * 10) / 10).toFixed(1).replace('.', ',')}`;

// корень темы (.ds) — его CSS-переменные нужны слою в body
function themeOf(el) {
  const root = el && el.closest ? el.closest('.ds') : null;
  if (!root) return { className: '', style: null };
  const style = {};
  for (let i = 0; i < root.style.length; i += 1) { const k = root.style[i]; if (k.startsWith('--') || k === 'color-scheme') style[k === 'color-scheme' ? 'colorScheme' : k] = root.style.getPropertyValue(k); }
  return { className: `ds${root.classList.contains('ds-dark') ? ' ds-dark' : ''}`, style };
}

/* Сам просмотр. width — родная ширина содержимого (график рисуется в ней и потом масштабируется целиком) */
export function ZoomViewer({ title, caption = null, width = 560, from = null, onClose, children }) {
  const stage = useRef(null);
  const content = useRef(null);
  const closeBtn = useRef(null);
  const [dims, setDims] = useState(null);
  const [v, setV] = useState(null);
  const vRef = useRef(null);
  const dimsRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [theme] = useState(() => themeOf(from));
  const set = (nv) => { vRef.current = nv; setV(nv); };

  // размер сцены и картинки; поменялся (поворот экрана, картинка догрузилась) — снова целиком
  useLayoutEffect(() => {
    const measure = () => {
      const st = stage.current; const ct = content.current;
      if (!st || !ct) return;
      const d = { nw: ct.offsetWidth, nh: ct.offsetHeight, sw: st.clientWidth, sh: st.clientHeight };
      const p = dimsRef.current;
      if (p && p.nw === d.nw && p.nh === d.nh && p.sw === d.sw && p.sh === d.sh) return;
      dimsRef.current = d; setDims(d); set(fitView(d.nw, d.nh, d.sw, d.sh));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stage.current); ro.observe(content.current);
    return () => ro.disconnect();
  }, []);

  // Esc закрывает; страница под слоем не прокручивается; фокус — на крестик, после — туда, где был
  useEffect(() => {
    const prev = document.activeElement;
    // перехват раньше всех: Esc закрывает только просмотр, а не урок под ним
    const esc = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', esc, true);
    const over = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeBtn.current) closeBtn.current.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', esc, true);
      document.body.style.overflow = over;
      if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch { /* элемента уже нет */ } }
    };
  }, [onClose]);

  const local = (e) => { const r = stage.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // колёсико и щипок тачпада (Safari — gesture-события) — к курсору; страницу не листаем
  useEffect(() => {
    const st = stage.current;
    if (!st) return undefined;
    const wheel = (e) => {
      e.preventDefault();
      const d = dimsRef.current; const cur = vRef.current; if (!d || !cur) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const p = local(e);
      set(zoomAround(cur, Math.exp(-dy * 0.0022), p.x, p.y, d));
    };
    let gs = 1;
    const gStart = (e) => { e.preventDefault(); gs = 1; };
    const gChange = (e) => {
      e.preventDefault();
      const d = dimsRef.current; const cur = vRef.current; if (!d || !cur) return;
      const f = e.scale / gs; gs = e.scale; const p = local(e);
      set(zoomAround(cur, f, p.x, p.y, d));
    };
    st.addEventListener('wheel', wheel, { passive: false });
    st.addEventListener('gesturestart', gStart, { passive: false });
    st.addEventListener('gesturechange', gChange, { passive: false });
    return () => { st.removeEventListener('wheel', wheel); st.removeEventListener('gesturestart', gStart); st.removeEventListener('gesturechange', gChange); };
  }, []);

  const startGesture = () => {
    const ps = [...pointers.current.values()];
    if (ps.length >= 2) {
      const [a, b] = ps;
      gesture.current = { kind: 'pinch', v0: vRef.current, d0: Math.hypot(a.x - b.x, a.y - b.y), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (ps.length === 1) {
      gesture.current = { kind: 'pan', v0: vRef.current, x: ps[0].x, y: ps[0].y };
    } else gesture.current = null;
  };
  const down = (e) => {
    if (!dimsRef.current) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старый браузер */ }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    startGesture();
    setDragging(true);
    // двойное касание или двойной клик: целиком ↔ ×2,5 к этому месту
    const now = performance.now(); const lt = lastTap.current;
    if (pointers.current.size === 1 && now - lt.t < 320 && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
      const d = dimsRef.current; const cur = vRef.current;
      set(zoomOf(cur, d) > 1.05 ? fitView(d.nw, d.nh, d.sw, d.sh) : zoomAround(cur, 2.5, p.x, p.y, d));
      Audio.play('tick');
      lastTap.current = { t: 0, x: 0, y: 0 };
      startGesture();
      return;
    }
    lastTap.current = { t: now, x: p.x, y: p.y };
  };
  const move = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current; const d = dimsRef.current;
    if (!g || !d) return;
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      set(pinchView(g.v0, g.d0, g.m0, Math.hypot(a.x - b.x, a.y - b.y), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d));
    } else {
      set(panBy(g.v0, p.x - g.x, p.y - g.y, d));
    }
  };
  const up = (e) => {
    pointers.current.delete(e.pointerId);
    startGesture();
    if (!pointers.current.size) setDragging(false);
  };
  const center = () => { const d = dimsRef.current; return { x: d.sw / 2, y: d.sh / 2 }; };
  const zoomBy = (f) => { const d = dimsRef.current; if (!d) return; Audio.play('tick'); const c = center(); set(zoomAround(vRef.current, f, c.x, c.y, d)); };
  const fit = () => { const d = dimsRef.current; if (!d) return; Audio.play('tick'); set(fitView(d.nw, d.nh, d.sw, d.sh)); };
  const z = v && dims ? zoomOf(v, dims) : 1;

  return createPortal(
    <div className={`zv ${theme.className}`} style={theme.style || undefined}
      role="dialog" aria-modal="true" aria-label={`На весь экран: ${title}`} data-testid="zoom-view" data-zoom={z.toFixed(2)}>
      <style>{CSS}</style>
      <div className="zv-head">
        <div className="zv-title">{title}</div>
        <button ref={closeBtn} type="button" className="zv-btn" aria-label="Закрыть" title="Закрыть (Esc)" data-testid="zoom-close" onClick={() => { Audio.play('paper'); onClose(); }}><X size={20} /></button>
      </div>
      <div ref={stage} className={`zv-stage${z <= 1.01 ? ' fit' : ''}${dragging ? ' dragging' : ''}`} data-testid="zoom-stage"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div ref={content} className="zv-content" data-testid="zoom-content" style={{ width, visibility: v ? 'visible' : 'hidden',
          transform: v ? `translate(${v.tx}px, ${v.ty}px) scale(${v.s})` : undefined }}>
          {children}
        </div>
      </div>
      {caption && <div className="zv-cap" data-testid="zoom-caption">{caption}</div>}
      <div className="zv-foot">
        <button type="button" className="zv-btn" aria-label="Отдалить" title="Отдалить" data-testid="zoom-out" disabled={z <= 1.01} onClick={() => zoomBy(1 / 1.6)}><Minus size={18} /></button>
        <span className="zv-level" data-testid="zoom-level" aria-live="polite">{fmtZoom(z)}</span>
        <button type="button" className="zv-btn" aria-label="Приблизить" title="Приблизить (колёсико, щипок, двойное касание)" data-testid="zoom-in" disabled={z >= ZOOM_MAX - 0.01} onClick={() => zoomBy(1.6)}><Plus size={18} /></button>
        <button type="button" className="zv-btn zv-fit-btn" data-testid="zoom-fit" disabled={z <= 1.01} onClick={fit}><Maximize2 size={15} aria-hidden="true" />Вписать</button>
      </div>
    </div>,
    document.body,
  );
}

/* Обёртка картинки: касание или Enter — на весь экран. view() — что показать там (по умолчанию — то же самое) */
export function Zoomable({ title, caption = null, width = 560, view = null, testid = 'zoom-open', className = '', style = null, badge = 'tr', children }) {
  const [open, setOpen] = useState(false);
  const self = useRef(null);
  const go = (e) => {
    // кнопки и ссылки внутри картинки работают как раньше
    const inner = e && e.target && e.target.closest ? e.target.closest('button, a, input, select, textarea, label, [role="button"]') : null;
    if (inner && inner !== e.currentTarget) return;
    if (e) e.stopPropagation();
    Audio.play('paper'); setOpen(true);
  };
  return (
    <>
      <style>{CSS}</style>
      <div ref={self} className={`zv-hit ${className}`} style={style || undefined} role="button" tabIndex={0} aria-label={`Открыть на весь экран: ${title}`} title="Открыть на весь экран"
        data-testid={testid} onClick={go} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>
        {children}
        <span className={`zv-badge ${badge}`} aria-hidden="true"><Expand size={14} /></span>
      </div>
      {open && <ZoomViewer title={title} caption={caption} width={width} from={self.current} onClose={() => setOpen(false)}>{view ? view() : children}</ZoomViewer>}
    </>
  );
}
