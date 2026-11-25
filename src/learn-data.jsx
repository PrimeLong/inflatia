/* «ДАННЫЕ» — вид задания урока (пункт владельца 24.11, п. 12; src/learn/data.js): таблица, столбчатая (вертикальная и
   горизонтальная) и круговая диаграммы, график. Если ответ — касанием (ask=pick), элемент выбирают пальцем или с
   клавиатуры (Enter, пробел): ячейку, столбец, сектор, точку; после проверки верный — зелёный, выбранный неверный —
   красный (и значки ✓ / ✗ — не только цветом), остальные приглушены. У каждой диаграммы — та же таблица для экранного
   диктора. Рисунок — SVG во всю ширину карточки, в настоящих пикселях (ширина — по карточке): подписи 12–13 px и на
   телефоне 360 px, а не сжатые до 8–9 px. */
import React, { useEffect, useRef, useState } from 'react';
import { fmtData, niceScale, shares, multi, keyOf } from './learn/data.js';

export const DATA_CSS = `
  .dv { margin: 4px 0 12px; padding: 10px 10px 8px; border-radius: 16px; border: 1px solid var(--ds-rule2); background: var(--ds-card);
    --dv-a: var(--u, #2E6FB0); --dv-b: #0E7A72; --dv-c: #6B4FA8; --dv-grid: color-mix(in srgb, var(--ds-ink) 10%, transparent); }
  .ds-dark .dv { --dv-b: #4FC7B8; --dv-c: #B39DFF; }
  .dv-title { margin: 0 2px 6px; font: 700 14.5px/1.3 var(--ds-sans); color: var(--ds-ink); }
  .dv-title small { font-weight: 500; color: var(--ds-ink2); font-size: 13px; }
  .dv svg { display: block; width: 100%; height: auto; overflow: visible; }
  .dv text { font-family: var(--ds-sans); fill: var(--ds-ink2); }
  .dv .dv-val { fill: var(--ds-ink); font-weight: 700; }
  .dv .dv-axis { stroke: color-mix(in srgb, var(--ds-ink) 45%, transparent); stroke-width: 1.2; }
  .dv .dv-gridl { stroke: var(--dv-grid); stroke-width: 1; }
  .dv [data-key] { transition: opacity .2s ease, filter .2s ease; }
  .dv [role="button"] { cursor: pointer; outline: none; }
  .dv [role="button"]:focus-visible .dv-shape, .dv [role="button"]:focus-visible { filter: drop-shadow(0 0 0 2px var(--ds-ink)); }
  .dv [role="button"]:hover .dv-shape { filter: brightness(1.08); }
  .dv [data-state="picked"] .dv-shape { stroke: var(--ds-ink); stroke-width: 3; }
  .dv [data-state="right"] .dv-shape { fill: var(--ds-ok, #2B8A5E) !important; stroke: var(--ds-ok, #2B8A5E); stroke-width: 3; }
  .dv [data-state="wrong"] .dv-shape { fill: var(--ds-bad, #B03A2E) !important; stroke: var(--ds-bad, #B03A2E); stroke-width: 3; }
  .dv[data-checked="true"] [data-key]:not([data-state]) .dv-shape { opacity: .4; }
  .dv[data-checked="true"] .dv-cell:not([data-state]), .dv[data-checked="true"] .dv-pie-item:not([data-state]) { opacity: .55; }
  .dv .dv-mark-right { fill: var(--ds-ok, #2B8A5E); } .dv .dv-mark-wrong { fill: var(--ds-bad, #B03A2E); }
  .dv-cell .dv-mark, .dv-pie-item .dv-mark { margin-right: 4px; font-weight: 800; }
  .dv-cell[data-state="right"] .dv-mark, .dv-pie-item[data-state="right"] .dv-mark { color: var(--ds-ok, #2B8A5E); }
  .dv-cell[data-state="wrong"] .dv-mark, .dv-pie-item[data-state="wrong"] .dv-mark { color: var(--ds-bad, #B03A2E); }
  .dv-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 6px 4px 0; font: 600 13px var(--ds-sans); color: var(--ds-ink2); }
  .dv-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
  .dv-note { margin: 6px 4px 0; font: 12px var(--ds-sans); color: var(--ds-ink3); }
  .dv-table { width: 100%; border-collapse: separate; border-spacing: 0; font: 15px var(--ds-sans); color: var(--ds-ink); }
  .dv-table th, .dv-table td { padding: 8px 10px; border-bottom: 1px solid var(--ds-rule2); text-align: left; }
  .dv-table thead th { font: 700 12.5px var(--ds-sans); letter-spacing: .04em; color: var(--ds-ink2); }
  .dv-table td { text-align: right; font-variant-numeric: tabular-nums; }
  .dv-table tbody tr:last-child th, .dv-table tbody tr:last-child td { border-bottom: 0; }
  .dv-cell { width: 100%; min-height: 40px; padding: 6px 8px; border: 2px solid transparent; border-radius: 10px; background: color-mix(in srgb, var(--dv-a) 8%, transparent);
    font: 700 15px var(--ds-sans); color: var(--ds-ink); text-align: right; font-variant-numeric: tabular-nums; cursor: pointer; }
  .dv-cell:hover:not(:disabled) { background: color-mix(in srgb, var(--dv-a) 16%, transparent); }
  .dv-cell:disabled { cursor: default; }
  .dv-cell[data-state="picked"] { border-color: var(--ds-ink); }
  .dv-cell[data-state="right"] { border-color: var(--ds-ok, #2B8A5E); background: color-mix(in srgb, var(--ds-ok, #2B8A5E) 16%, transparent); }
  .dv-cell[data-state="wrong"] { border-color: var(--ds-bad, #B03A2E); background: color-mix(in srgb, var(--ds-bad, #B03A2E) 14%, transparent); }
  .dv-pie-legend { display: grid; gap: 4px; max-width: 460px; margin: 6px auto 0; }
  .dv-pie-item { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 36px; padding: 4px 10px; border: 2px solid transparent; border-radius: 10px; background: none;
    font: 600 14px var(--ds-sans); color: var(--ds-ink); text-align: left; }
  .dv-pie-item i { flex: none; width: 14px; height: 14px; border-radius: 4px; }
  .dv-pie-item b { margin-left: auto; font-variant-numeric: tabular-nums; }
  button.dv-pie-item { cursor: pointer; }
  .dv-pie-item[data-state="picked"] { border-color: var(--ds-ink); }
  .dv-pie-item[data-state="right"] { border-color: var(--ds-ok, #2B8A5E); }
  .dv-pie-item[data-state="wrong"] { border-color: var(--ds-bad, #B03A2E); }
  .dv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .dv-hint { margin: -4px 2px 10px; font-size: 13.5px; }
  .dv-fade { animation: dv-in .35s ease-out; }
  @keyframes dv-in { from { opacity: 0 } }
  @media (prefers-reduced-motion: reduce) { .dv-fade { animation: none; } .dv [data-key] { transition: none; } }
`;

const SERIES = ['var(--dv-a)', 'var(--dv-b)', 'var(--dv-c)'];
// значок к подписи элемента после проверки: верный ✓, выбранный неверный ✗
const MARK = { right: '✓', wrong: '✗' };
const markOf = (st) => (MARK[st] ? `${MARK[st]} ` : '');
const markCls = (st) => (MARK[st] ? `dv-val dv-mark-${st}` : 'dv-val');
// ширина подписи на глаз (PT Sans: ~0,56 кегля на знак) — чтобы подписи не налезали друг на друга
const textW = (str, fs) => String(str).length * fs * 0.56;
// делений шкалы — сколько влезает: подпись «1 500» — ~40 px, между ними — воздух
const ticksFor = (px, label = 44) => Math.max(2, Math.min(6, Math.floor(px / (label + 14))));
// ширина карточки в пикселях — по ней рисунок: единица viewBox = 1 px
function useBoxWidth(fallback = 320) {
  const ref = useRef(null); const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const set = () => { const x = Math.round(el.clientWidth); if (x > 0) setW((o) => (Math.abs(o - x) > 2 ? x : o)); };
    set();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, Math.max(260, Math.min(w, 760))];
}
/* секторы — своя палитра, не цвет юнита (у «Базара» он терракотовый — сливался с третьим цветом) и без зелёного и
   красного: ими после проверки помечены верный и неверный ответ. Восемь цветов — восемь секторов (PIE_MAX) */
const PIE = ['#2E6FB0', '#0E7A72', '#B7791F', '#6B4FA8', '#C24E7A', '#5B6B8A', '#8A5A3C', '#3B9AC4'];
// подпись в две строки, если длинная: «Цена за» / «килограмм»
const split2 = (s, max = 9) => { if (s.length <= max || !s.includes(' ')) return [s]; const w = s.split(' '); const half = Math.ceil(w.length / 2); return [w.slice(0, half).join(' '), w.slice(half).join(' ')]; };

/* интерактивность элемента: касание и клавиатура; без ответа касанием — просто рисунок */
function actFor({ pickable, onPick, resp }) {
  return (key, label) => (pickable
    ? { role: 'button', tabIndex: 0, 'aria-label': label, 'aria-pressed': resp === key, onClick: () => onPick(key),
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(key); } } }
    : {});
}

function Bars({ inst, act, stateOf, horizontal, W }) {
  const { data } = inst; const n = data.rows.length; const m = data.cols.length;
  const vals = data.rows.flatMap((r) => r.values);
  const from = inst.from != null ? inst.from : Math.min(0, ...vals);
  const hL = Math.round(Math.min(170, Math.max(104, W * 0.32)));
  const sc = niceScale(from, Math.max(...vals), horizontal ? ticksFor(W - hL - 58, textW(fmtData(Math.max(...vals)), 12) + 6) : 5);
  const lo = inst.from != null ? inst.from : sc.lo; const hi = sc.hi;
  const ticks = sc.ticks.filter((t) => t >= lo - 1e-9);
  const unitLabel = (r, c, v) => `${data.rows[r].label}${multi(data) ? `, ${data.cols[c]}` : ''}: ${fmtData(v)}${inst.vunit ? ` ${inst.vunit}` : ''}`;
  if (horizontal) {
    const L = hL; const R = 58; const T = 6; const rowH = m > 1 ? 20 * m + 12 : 36; const H = T + n * rowH + 24;
    const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={inst.title || 'Диаграмма'} className="dv-fade">
        {ticks.map((t) => <g key={t}><line className="dv-gridl" x1={x(t)} x2={x(t)} y1={T} y2={H - 20} /><text x={x(t)} y={H - 5} fontSize="12" textAnchor="middle">{fmtData(t)}</text></g>)}
        <line className="dv-axis" x1={x(lo)} x2={x(lo)} y1={T} y2={H - 20} />
        {data.rows.map((row, r) => {
          const y0 = T + r * rowH; const bh = m > 1 ? 18 : 24;
          return (
            <g key={row.label}>
              {split2(row.label, Math.round((L - 10) / 7.4)).map((ln, i, a) => <text key={i} x={L - 8} y={y0 + rowH / 2 + 4.5 + (i - (a.length - 1) / 2) * 14} fontSize="13" textAnchor="end">{ln}</text>)}
              {row.values.map((v, c) => {
                const key = keyOf(data, r, c); const st = stateOf(key); const yb = y0 + (rowH - bh * m - 2 * (m - 1)) / 2 + c * (bh + 2);
                return (
                  <g key={c} data-key={key} data-state={st} {...act(key, unitLabel(r, c, v))}>
                    <rect className="dv-shape" x={x(lo)} y={yb} width={Math.max(2, x(v) - x(lo))} height={bh} rx="4" fill={SERIES[c]} />
                    <text className={markCls(st)} x={x(v) + 6} y={yb + bh / 2 + 4.5} fontSize={m > 1 ? 12 : 13}>{markOf(st)}{fmtData(v)}</text>
                    <rect x={m > 1 ? L : 4} y={m > 1 ? yb - 1 : y0} width={m > 1 ? W - L : W - 4} height={m > 1 ? bh + 2 : rowH} fill="transparent" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  }
  const L = 48; const R = 8; const T = 24; const band = (W - L - R) / n;
  const fs = band < 52 ? 11 : 12.5; const fit = Math.max(6, Math.floor((band - 4) / (fs * 0.56)));
  const lines = data.rows.map((row) => split2(row.label, fit));
  // подпись шире столбца и не делится по пробелу — подписи «лесенкой» в два ряда
  const stagger = lines.some((ls) => ls.some((ln) => textW(ln, fs) > band - 4));
  const two = stagger || lines.some((ls) => ls.length > 1);
  const B = two ? 44 : 30; const H = Math.round(Math.min(320, Math.max(230, W * 0.6)));
  const inner = band * (m > 1 ? 0.78 : 0.6); const bw = inner / m;
  const y = (v) => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={inst.title || 'Диаграмма'} className="dv-fade">
      {ticks.map((t) => <g key={t}><line className="dv-gridl" x1={L} x2={W - R} y1={y(t)} y2={y(t)} /><text x={L - 6} y={y(t) + 4} fontSize="12" textAnchor="end">{fmtData(t)}</text></g>)}
      <line className="dv-axis" x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} />
      {data.rows.map((row, r) => {
        const x0 = L + r * band + (band - inner) / 2;
        return (
          <g key={row.label}>
            {(stagger ? [row.label] : lines[r]).map((ln, i) => <text key={i} x={L + r * band + band / 2} y={H - B + 17 + (stagger ? (r % 2) : i) * 14} fontSize={fs} textAnchor="middle">{ln}</text>)}
            {row.values.map((v, c) => {
              const key = keyOf(data, r, c); const st = stateOf(key); const top = y(Math.max(v, lo));
              return (
                <g key={c} data-key={key} data-state={st} {...act(key, unitLabel(r, c, v))}>
                  <rect x={x0 + c * bw} y={T - 4} width={bw} height={H - B - T + 4} fill="transparent" />
                  <rect className="dv-shape" x={x0 + c * bw + (m > 1 ? 1 : 0)} y={top} width={Math.max(2, bw - (m > 1 ? 2 : 0))} height={Math.max(1, y(lo) - top)} rx="4" fill={SERIES[c]} />
                  {(m === 1 || n <= 4) && <text className={markCls(st)} x={x0 + c * bw + bw / 2} y={top - 6} fontSize={m > 1 || band < 52 ? 11.5 : 13} textAnchor="middle">{markOf(st)}{fmtData(v)}</text>}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function Line({ inst, act, stateOf, W }) {
  const { data } = inst; const n = data.rows.length;
  const vals = data.rows.flatMap((r) => r.values);
  const from = inst.from != null ? inst.from : Math.min(0, ...vals);
  const sc = niceScale(from, Math.max(...vals));
  const lo = inst.from != null ? inst.from : sc.lo; const hi = sc.hi;
  const L = 48; const R = 18; const T = 26; const step = (W - L - R - 24) / Math.max(1, n - 1);
  const fs = step < 52 ? 11 : 12.5; const fit = Math.max(6, Math.floor((step - 4) / (fs * 0.56)));
  const lines = data.rows.map((row) => split2(row.label, fit));
  const stagger = lines.some((ls) => ls.some((ln) => textW(ln, fs) > step - 4));
  const B = stagger || lines.some((ls) => ls.length > 1) ? 44 : 30; const H = Math.round(Math.min(320, Math.max(230, W * 0.6)));
  const x = (i) => L + 12 + i * step;
  const y = (v) => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={inst.title || 'График'} className="dv-fade">
      {sc.ticks.filter((t) => t >= lo - 1e-9).map((t) => <g key={t}><line className="dv-gridl" x1={L} x2={W - R} y1={y(t)} y2={y(t)} /><text x={L - 6} y={y(t) + 4} fontSize="12" textAnchor="end">{fmtData(t)}</text></g>)}
      <line className="dv-axis" x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} />
      {data.rows.map((row, i) => (stagger ? [row.label] : lines[i]).map((ln, k) => <text key={`${i}-${k}`} x={x(i)} y={H - B + 17 + (stagger ? (i % 2) : k) * 14} fontSize={fs} textAnchor="middle">{ln}</text>))}
      {data.cols.map((_, c) => <polyline key={c} points={data.rows.map((row, i) => `${x(i)},${y(row.values[c])}`).join(' ')} fill="none" stroke={SERIES[c]} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />)}
      {data.cols.map((col, c) => data.rows.map((row, i) => {
        const key = keyOf(data, i, c); const st = stateOf(key); const v = row.values[c];
        return (
          <g key={`${c}-${i}`} data-key={key} data-state={st} {...act(key, `${row.label}${multi(data) ? `, ${col}` : ''}: ${fmtData(v)}${inst.vunit ? ` ${inst.vunit}` : ''}`)}>
            <circle cx={x(i)} cy={y(v)} r={Math.min(22, Math.max(14, step / 2))} fill="transparent" />
            <circle className="dv-shape" cx={x(i)} cy={y(v)} r="5.5" fill={SERIES[c]} stroke="var(--ds-card)" strokeWidth="1.5" />
            {data.cols.length === 1 && n <= 8 && <text className={markCls(st)} x={x(i)} y={y(v) - 11} fontSize={step < 52 ? 11.5 : 12.5} textAnchor="middle">{markOf(st)}{fmtData(v)}</text>}
          </g>
        );
      }))}
    </svg>
  );
}

function Pie({ inst, act, stateOf, pickable, onPick, resp, W }) {
  const { data } = inst; const vals = data.rows.map((r) => r.values[0]); const pc = shares(vals); const sum = vals.reduce((a, b) => a + b, 0) || 1;
  const cx = W / 2; const cy = 104; const R = 96; const r0 = 50;
  let a0 = -Math.PI / 2;
  const arcs = data.rows.map((row, i) => {
    const a1 = a0 + (vals[i] / sum) * Math.PI * 2; const mid = (a0 + a1) / 2; const big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a, rr) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
    const d = a1 - a0 >= Math.PI * 2 - 1e-6
      ? `M${p(0, R)} A${R} ${R} 0 1 1 ${p(Math.PI, R)} A${R} ${R} 0 1 1 ${p(0, R)} M${p(0, r0)} A${r0} ${r0} 0 1 0 ${p(Math.PI, r0)} A${r0} ${r0} 0 1 0 ${p(0, r0)}Z`
      : `M${p(a0, R)} A${R} ${R} 0 ${big} 1 ${p(a1, R)} L${p(a1, r0)} A${r0} ${r0} 0 ${big} 0 ${p(a0, r0)}Z`;
    const out = { row, i, d, mid, a0, a1 }; a0 = a1; return out;
  });
  return (
    <>
      <svg viewBox={`0 0 ${W} 208`} width={W} height="208" role="img" aria-label={inst.title || 'Круговая диаграмма'} className="dv-fade">
        {arcs.map(({ row, i, d, mid }) => {
          const key = keyOf(data, i);
          return (
            <g key={row.label} data-key={key} data-state={stateOf(key)} {...act(key, `${row.label}: ${pc[i]}% (${fmtData(vals[i])}${inst.vunit ? ` ${inst.vunit}` : ''})`)}>
              <path className="dv-shape" d={d} fill={PIE[i % PIE.length]} stroke="var(--ds-card)" strokeWidth="2" />
              {pc[i] >= 7 && <text x={cx + ((R + r0) / 2) * Math.cos(mid)} y={cy + ((R + r0) / 2) * Math.sin(mid) + 4} fontSize="13" fontWeight="700" textAnchor="middle" style={{ fill: '#fff' }}>{pc[i]}%</text>}
            </g>
          );
        })}
      </svg>
      <div className="dv-pie-legend">
        {data.rows.map((row, i) => {
          const key = keyOf(data, i); const Tag = pickable ? 'button' : 'div'; const st = stateOf(key);
          return (
            <Tag key={row.label} type={pickable ? 'button' : undefined} className="dv-pie-item" data-legend={key} data-state={st} aria-pressed={pickable ? resp === key : undefined}
              onClick={pickable ? () => onPick(key) : undefined} tabIndex={pickable ? -1 : undefined}>
              <i style={{ background: PIE[i % PIE.length] }} aria-hidden="true" />{MARK[st] && <span className="dv-mark" aria-hidden="true">{MARK[st]}</span>}{row.label}<b>{pc[i]}% · {fmtData(vals[i])}</b>
            </Tag>
          );
        })}
      </div>
    </>
  );
}

function Table({ inst, stateOf, pickable, onPick, resp, locked }) {
  const { data } = inst; const many = multi(data);
  return (
    <table className="dv-table dv-fade">
      {(many || data.label) && (
        <thead><tr><th scope="col">{data.label}</th>{data.cols.map((c) => <th key={c} scope="col" style={{ textAlign: 'right' }}>{c}</th>)}</tr></thead>
      )}
      <tbody>
        {data.rows.map((row, r) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {row.values.map((v, c) => {
              const key = keyOf(data, r, c); const st = stateOf(key);
              return (
                <td key={c}>
                  {pickable || st ? (
                    <button type="button" className="dv-cell" data-key={key} data-state={st} disabled={locked} aria-pressed={resp === key} onClick={() => onPick(key)}
                      aria-label={`${row.label}${many ? `, ${data.cols[c]}` : ''}: ${fmtData(v)}${inst.vunit ? ` ${inst.vunit}` : ''}`}>{MARK[st] && <span className="dv-mark" aria-hidden="true">{MARK[st]}</span>}{fmtData(v)}</button>
                  ) : fmtData(v)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* inst — экземпляр задания «Данные»; resp — выбранный элемент (ask=pick); fb — итог проверки: показываем верный и ошибку */
export function DataView({ inst, resp = null, onPick = () => {}, locked = false, fb = null }) {
  const pickable = inst.ask === 'pick' && !locked;
  const stateOf = (key) => {
    if (inst.ask !== 'pick') return undefined;
    if (fb) { if (key === inst.answer) return 'right'; if (key === resp && !fb.ok) return 'wrong'; return undefined; }
    return key === resp ? 'picked' : undefined;
  };
  const act = actFor({ pickable, onPick, resp });
  const { data, view } = inst;
  const [box, W] = useBoxWidth();
  const props = { inst, act, stateOf, pickable, onPick, resp, locked, W };
  return (
    <figure className="dv" data-testid="data-view" data-view={view} data-ask={inst.ask} data-checked={String(!!fb && inst.ask === 'pick')} style={{ margin: 0 }}>
      <style>{DATA_CSS}</style>
      {inst.title && <figcaption className="dv-title">{inst.title}{inst.vunit && <small>, {inst.vunit}</small>}</figcaption>}
      <div ref={box}>
        {view === 'table' ? <Table {...props} /> : view === 'pie' ? <Pie {...props} /> : view === 'line' ? <Line {...props} /> : <Bars {...props} horizontal={view === 'hbar'} />}
      </div>
      {multi(data) && view !== 'table' && (
        <div className="dv-legend" aria-hidden="true">{data.cols.map((c, i) => <span key={c}><i style={{ background: SERIES[i] }} />{c}</span>)}</div>
      )}
      {inst.note && <div className="dv-note">Источник: {inst.note}</div>}
      {/* для экранного диктора — те же числа таблицей */}
      {view !== 'table' && (
        <table className="dv-sr">
          <caption>{inst.title || 'Данные'}{inst.vunit ? `, ${inst.vunit}` : ''}</caption>
          <thead><tr><th scope="col">{data.label || 'Подпись'}</th>{data.cols.map((c, i) => <th key={i} scope="col">{c || 'Значение'}</th>)}</tr></thead>
          <tbody>{data.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((v, i) => <td key={i}>{fmtData(v)}</td>)}</tr>)}</tbody>
        </table>
      )}
    </figure>
  );
}

// подсказка под рисунком: что именно коснуться
export const PICK_HINT = { table: 'Коснитесь нужной ячейки', bar: 'Коснитесь нужного столбца', hbar: 'Коснитесь нужной полосы', line: 'Коснитесь нужной точки', pie: 'Коснитесь нужного сектора или строки под диаграммой' };
