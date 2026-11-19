/* ВЗАИМОДЕЙСТВИЯ УРОКОВ ЭТАПА 2: рынок на графике (сдвинуть кривую пальцем, двигать цену,
   пока не исчезнет дефицит, поставить точку равновесия), определение из плиток, мини-игра
   на минуту с живым графиком, таймер, карточки видов уроков
   (слово с оборотом, герой «Истории», «Слушай» с голосом браузера и подсветкой текста).
   Всё своё: SVG и Web Speech API, без библиотек и внешних запросов. При «уменьшить движение»
   карточки не летают, подсветка текста не бежит. */
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Coffee, Croissant, Landmark, ScrollText, RotateCcw, Play, Timer, Delete, Trophy, GraduationCap, Radio, Feather, Check,
  Banknote, ShoppingBasket, Thermometer, X,
} from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Inline } from './textbook.jsx';
import { equilibrium, marketAxes, qd, qs, gameScore, comboOf, gameLeft, timeBonus, GAME_PASS, GAME_TIME_BONUS } from './learn/course.js';
import { WALLET, WALLET_OPTIONS, FORECAST, walletPath, walletResult, realPct } from './learn/wallet.js';
import { plural } from './lib/plural.js';
import { CAST } from './learn/cast.js';
import { useReducedMotion } from './ds-art.jsx';
import { Button } from './ds.jsx';
import { evalExpr, fmtResult, pressRoot } from './learn/calc.js';
import { powerModel, powerMc } from './learn/power-chart.js';

export { PLAY_CSS } from './learn-styles.js';

/* ------------------------------ ГРАФИК РЫНКА ------------------------------ */
const VW = 320; const VH = 232; const PL = 34; const PR = 14; const PT = 12; const PB = 28;
const PW = VW - PL - PR; const PH = VH - PT - PB;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
// линия кривой: точки на сетке цен, которые попадают в поле графика
function curvePath(fq, ax) {
  const pts = [];
  for (let k = 0; k <= 80; k += 1) {
    const p = (ax.pMax * k) / 80; const q = fq(p);
    if (q >= -0.001 && q <= ax.qMax + 0.001) pts.push([PL + (q / ax.qMax) * PW, PT + PH - (p / ax.pMax) * PH]);
  }
  return pts.length > 1 ? `M${pts.map((x) => x.map((v) => v.toFixed(1)).join(',')).join('L')}` : '';
}
const xOf = (q, ax) => PL + (q / ax.qMax) * PW;
const yOf = (p, ax) => PT + PH - (p / ax.pMax) * PH;
/* m — рынок упражнения; shift — { D, S } сдвиг кривых поверх m; show — какие кривые рисовать;
   ghost — исходные кривые пунктиром; price — горизонталь цены с объёмами; mark — точка ученика;
   good — верная точка (после ответа); onDrag / onPlot — перетаскивание кривой и нажатие по полю. */
export function MarketChart({ m, shift = { D: 0, S: 0 }, show = ['D', 'S'], ghost = false, price = null, mark = null, good = null, onDrag = null, onPlot = null, eq = false, label = 'График рынка', names = null }) {
  // названия осей и кривых — из раунда (процент, вклады, кредиты…), иначе общие
  const nm = { x: 'Q, количество', y: 'P, цена', d: null, s: null, unit: '', ...(names || {}) };
  if (!nm.x) nm.x = 'Q, количество'; if (!nm.y) nm.y = 'P, цена';
  const ax = marketAxes(m);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const dm = { ...m, dA: (m.dA || 0) + (shift.D || 0) }; const sm = { ...m, dC: (m.dC || 0) + (shift.S || 0) };
  const fD = (mm) => (p) => qd(mm, p); const fS = (mm) => (p) => qs(mm, p);
  // цвета и подписи — как в «Разборе графика» (пункт владельца 18.11: «в разборе графиков один график, а в мини-игре самый обычный»)
  const CD = 'var(--g-blue, #3E6FA8)'; const CS = 'var(--g-rust, #C0602A)';
  const toUnits = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const sx = VW / r.width; const sy = VH / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy, sx };
  };
  const down = (curve) => (e) => {
    if (!onDrag) return;
    e.preventDefault();
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { curve, x0: toUnits(e).x, start: shift[curve] || 0 };
  };
  const move = (e) => {
    if (!drag.current || !onDrag) return;
    const { x } = toUnits(e);
    const dq = ((x - drag.current.x0) / PW) * ax.qMax;
    onDrag(drag.current.curve, drag.current.start + dq);
  };
  const up = () => { drag.current = null; };
  const click = (e) => {
    if (!onPlot) return;
    const { x, y } = toUnits(e);
    const q = clampN(((x - PL) / PW) * ax.qMax, 0, ax.qMax); const p = clampN(((PT + PH - y) / PH) * ax.pMax, 0, ax.pMax);
    onPlot(Math.round(q), Math.round(p * 2) / 2);
  };
  const e0 = show.length === 2 && eq ? equilibrium({ ...m, dA: dm.dA, dC: sm.dC }) : null;
  const ticksP = []; for (let p = 0; p <= ax.pMax; p += ax.pMax > 40 ? 20 : 10) ticksP.push(p);
  const ticksQ = []; for (let q = 0; q <= ax.qMax; q += ax.qMax > 100 ? 40 : 20) ticksQ.push(q);
  return (
    <svg ref={svgRef} className="lp-chart" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label} data-testid="market-chart"
      data-plot={JSON.stringify({ x0: PL, y0: PT, w: PW, h: PH, vw: VW, vh: VH, qMax: ax.qMax, pMax: ax.pMax })}
      onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click} style={{ cursor: onPlot ? 'crosshair' : undefined }}>
      <defs>
        <linearGradient id="lp-plot-bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--ds-card2)" stopOpacity=".55" /><stop offset="1" stopColor="var(--ds-card)" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x={PL} y={PT} width={PW} height={PH} fill="url(#lp-plot-bg)" rx="4" />
      {/* сетка: основные линии с подписями и тонкие между ними */}
      {ticksP.slice(0, -1).map((p, i) => <line key={`pm${p}`} x1={PL} x2={PL + PW} y1={yOf(p + (ticksP[i + 1] - p) / 2, ax)} y2={yOf(p + (ticksP[i + 1] - p) / 2, ax)} stroke="var(--ds-rule)" strokeWidth=".6" opacity=".55" />)}
      {ticksQ.map((q) => <line key={`qg${q}`} x1={xOf(q, ax)} x2={xOf(q, ax)} y1={PT} y2={PT + PH} stroke="var(--ds-rule)" strokeWidth=".6" opacity=".55" />)}
      {ticksP.map((p) => <g key={`p${p}`}><line x1={PL} x2={PL + PW} y1={yOf(p, ax)} y2={yOf(p, ax)} stroke="var(--ds-rule)" strokeWidth="1" /><text x={PL - 6} y={yOf(p, ax) + 4} textAnchor="end">{p}</text></g>)}
      {ticksQ.map((q) => <text key={`q${q}`} x={xOf(q, ax)} y={PT + PH + 16} textAnchor="middle">{q}</text>)}
      <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="var(--ds-ink2)" strokeWidth="2" />
      <line x1={PL} y1={PT + PH} x2={PL + PW} y2={PT + PH} stroke="var(--ds-ink2)" strokeWidth="2" />
      <text x={PL + 6} y={PT + 11} className="lp-axis" data-testid="market-y">{nm.y}</text><text x={PL + PW - 4} y={PT + PH - 7} textAnchor="end" className="lp-axis" data-testid="market-x">{nm.x}</text>
      {ghost && show.includes('D') && (shift.D || m.dA) ? <path d={curvePath(fD({ ...m, dA: 0 }), ax)} stroke={CD} strokeOpacity=".4" strokeWidth="2.5" strokeDasharray="6 5" fill="none" data-testid="curve-ghost" /> : null}
      {ghost && show.includes('S') && (shift.S || m.dC) ? <path d={curvePath(fS({ ...m, dC: 0 }), ax)} stroke={CS} strokeOpacity=".4" strokeWidth="2.5" strokeDasharray="6 5" fill="none" data-testid="curve-ghost" /> : null}
      {/* куда сдвинулась кривая: стрелка от прежнего положения к новому на средней цене */}
      {ghost && show.map((c) => {
        const sh = c === 'D' ? (shift.D || 0) + (m.dA || 0) : (shift.S || 0) + (m.dC || 0);
        if (Math.abs(sh) < 3) return null;
        const pMid = ax.pMax * (c === 'D' ? 0.62 : 0.5); const f = c === 'D' ? qd : qs;
        const q0 = clampN(f({ ...m, ...(c === 'D' ? { dA: 0 } : { dC: 0 }) }, pMid), 0, ax.qMax); const q1 = clampN(f(c === 'D' ? dm : sm, pMid), 0, ax.qMax);
        if (Math.abs(xOf(q1, ax) - xOf(q0, ax)) < 10) return null;
        const y = yOf(pMid, ax); const dir = Math.sign(q1 - q0); const x1 = xOf(q1, ax) - dir * 6;
        return (
          <g key={`arr${c}`} data-testid="shift-arrow" data-curve={c} className="lp-arrow" style={{ color: c === 'D' ? CD : CS }}>
            <line x1={xOf(q0, ax)} y1={y} x2={x1} y2={y} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M${x1 + dir * 6},${y} l${-dir * 8},-5 l0,10 Z`} fill="currentColor" />
          </g>
        );
      })}
      {show.includes('D') && <path d={curvePath(fD(dm), ax)} stroke={CD} strokeWidth="3.6" fill="none" strokeLinecap="round" data-curve-line="D" className="lp-curve" />}
      {show.includes('S') && <path d={curvePath(fS(sm), ax)} stroke={CS} strokeWidth="3.6" fill="none" strokeLinecap="round" data-curve-line="S" className="lp-curve" />}
      {onDrag && show.map((c) => (
        <path key={c} d={curvePath(c === 'D' ? fD(dm) : fS(sm), ax)} stroke="transparent" strokeWidth="26" fill="none" className="lp-hit" onPointerDown={down(c)} data-hit={c} />
      ))}
      {/* подписи кривых — плашками, как в «Разборе графика» */}
      {/* плашка кривой: буква и, если раунд назвал кривую, её смысл («D · кредиты») */}
      {show.map((c) => {
        const isD = c === 'D'; const name = isD ? nm.d : nm.s; const txt = name ? `${c} · ${name}` : c;
        const wdt = name ? Math.round(txt.length * 6.4 + 12) : 18;
        const pp = ax.pMax * (isD ? 0.14 : 0.88); const q = clampN(isD ? qd(dm, pp) : qs(sm, pp), 0, ax.qMax);
        const x = Math.max(PL + wdt / 2 + 4, Math.min(PL + PW - wdt / 2 - 2, xOf(q, ax) + (isD ? 12 : 14) + (name ? wdt / 2 - 9 : 0)));
        return <g key={`tag${c}`} className="lp-tag" data-testid="market-tag" data-curve={c} transform={`translate(${x},${yOf(pp, ax) + (isD ? -10 : 2)})`}><rect x={-wdt / 2} y="-9" width={wdt} height="17" rx="5" fill={isD ? CD : CS} /><text y="4" textAnchor="middle" style={{ fill: '#fff' }}>{txt}</text></g>;
      })}
      {price != null && (() => {
        const d = clampN(qd(dm, price), 0, ax.qMax); const s = clampN(qs(sm, price), 0, ax.qMax);
        return (
          <g data-testid="price-line">
            <line x1={PL} x2={PL + PW} y1={yOf(price, ax)} y2={yOf(price, ax)} stroke="var(--u)" strokeWidth="2" strokeDasharray="4 4" />
            <line x1={xOf(Math.min(d, s), ax)} x2={xOf(Math.max(d, s), ax)} y1={yOf(price, ax)} y2={yOf(price, ax)} stroke={d > s ? 'var(--ds-bad)' : '#C0602A'} strokeWidth="7" strokeLinecap="round" opacity=".75" />
            <circle cx={xOf(d, ax)} cy={yOf(price, ax)} r="5" fill="#3E6FA8" /><circle cx={xOf(s, ax)} cy={yOf(price, ax)} r="5" fill="#C0602A" />
          </g>
        );
      })()}
      {e0 && (
        <g data-testid="market-eq">
          <line x1={PL} x2={xOf(e0.q, ax)} y1={yOf(e0.p, ax)} y2={yOf(e0.p, ax)} stroke="var(--ds-ink2)" strokeWidth="1.2" strokeDasharray="3 4" />
          <line x1={xOf(e0.q, ax)} x2={xOf(e0.q, ax)} y1={yOf(e0.p, ax)} y2={PT + PH} stroke="var(--ds-ink2)" strokeWidth="1.2" strokeDasharray="3 4" />
          <circle cx={xOf(e0.q, ax)} cy={yOf(e0.p, ax)} r="11" fill="var(--u, #9A7413)" opacity=".18" className="lp-eq-glow" />
          <circle cx={xOf(e0.q, ax)} cy={yOf(e0.p, ax)} r="6" fill="var(--ds-ink)" stroke="var(--ds-card)" strokeWidth="2" />
          <text x={PL + 4} y={yOf(e0.p, ax) - 5} className="lp-eqv">P* {Math.round(e0.p)}{nm.unit}</text>
          {/* длинное название оси — справа у оси: Q* тогда слева от пунктира, чтобы не налезать */}
          <text x={xOf(e0.q, ax) + (names && names.x ? -5 : 5)} y={PT + PH - 5} textAnchor={names && names.x ? 'end' : 'start'} className="lp-eqv">Q* {Math.round(e0.q)}</text>
        </g>
      )}
      {good && <circle cx={xOf(good.q, ax)} cy={yOf(good.p, ax)} r="9" fill="none" stroke="var(--ds-ok)" strokeWidth="3" data-testid="point-good" />}
      {mark && <circle cx={xOf(mark.q, ax)} cy={yOf(mark.p, ax)} r="7" fill="var(--u)" stroke="#fff" strokeWidth="2" data-testid="point-mark" />}
    </svg>
  );
}

const CURVE_NAME = { D: 'спрос', S: 'предложение' };
const CURVE_TITLE = { D: 'Спрос', S: 'Предложение' };
// сдвиг кривой пальцем: шаг — 10 единиц объёма, не дальше ±40; кнопки — то же без пальца
export function CurveEx({ inst, resp, setResp, locked, fb }) {
  const r = resp || { D: 0, S: 0 };
  const curves = inst.only ? [inst.only] : ['D', 'S'];
  const set = (curve, v) => {
    if (locked) return;
    const n = clampN(Math.round(v / inst.step) * inst.step, -40, 40);
    if (n !== (r[curve] || 0)) { Audio.play('tick'); setResp({ ...r, [curve]: n }); }
  };
  const shown = fb && !fb.ok ? { D: 0, S: 0, [inst.answer[0]]: inst.answer[1] === '+' ? 20 : -20 } : r;
  return (
    <div data-testid="curve-ex">
      <MarketChart m={inst.market} show={curves} shift={shown} ghost eq={curves.length === 2} onDrag={locked ? null : set} label="Кривые рынка: перетащите нужную кривую" />
      <div className="lp-readout ds-sub">{fb && !fb.ok ? 'Так должна была сдвинуться кривая' : curves.some((c) => r[c]) ? curves.filter((c) => r[c]).map((c) => `${CURVE_TITLE[c]} ${r[c] > 0 ? 'вправо' : 'влево'} на ${Math.abs(r[c])}`).join(', ') : 'Потяните кривую пальцем или нажмите стрелку'}</div>
      {curves.map((c) => (
        <div key={c} className="lp-row">
          <button type="button" className="ds-chip" data-curve={c} data-dir="-" aria-label={`Сдвинуть ${CURVE_NAME[c]} влево`} disabled={locked} onClick={() => set(c, (r[c] || 0) - inst.step)}><ArrowLeft size={16} /> {CURVE_TITLE[c]}</button>
          <button type="button" className="ds-chip" data-curve={c} data-dir="+" aria-label={`Сдвинуть ${CURVE_NAME[c]} вправо`} disabled={locked} onClick={() => set(c, (r[c] || 0) + inst.step)}>{CURVE_TITLE[c]} <ArrowRight size={16} /></button>
        </div>
      ))}
      {curves.some((c) => r[c]) && !locked && (
        <div className="lp-row"><button type="button" className="ds-btn ds-btn--ghost" style={{ padding: '6px 10px', fontSize: 14 }} onClick={() => setResp(null)}><RotateCcw size={14} style={{ verticalAlign: -2 }} /> Вернуть кривые</button></div>
      )}
    </div>
  );
}

// цена ползунком: видно, сколько хотят купить и сколько продают, и разрыв между ними
export function PriceEx({ inst, resp, setResp, locked }) {
  const ax = marketAxes(inst.market);
  const p = resp == null ? inst.start : resp;
  const d = Math.round(qd(inst.market, p)); const s = Math.round(qs(inst.market, p));
  const gap = d - s;
  return (
    <div data-testid="price-ex">
      <MarketChart m={inst.market} price={p} label={`Рынок при цене ${p}`} />
      <div className="lp-readout" data-testid="price-readout">
        Цена <b>{p}</b>: хотят купить <b className="lp-dem">{Math.max(0, d)}</b>, продают <b className="lp-sup">{Math.max(0, s)}</b>
        {gap > 0 ? <> — <b style={{ color: 'var(--ds-bad-ink)' }}>дефицит {gap}</b></> : gap < 0 ? <> — <b className="lp-sup">избыток {-gap}</b></> : <> — <b style={{ color: 'var(--ds-ok-ink)' }}>ни дефицита, ни избытка</b></>}
      </div>
      <input type="range" className="lp-range" min={0} max={ax.pMax} step={1} value={p} disabled={locked} aria-label="Цена"
        onChange={(e) => { Audio.play('tick'); setResp(Number(e.target.value)); }} />
    </div>
  );
}

// точка равновесия: нажать по графику там, где пересекаются кривые
export function PointEx({ inst, resp, setResp, locked, fb }) {
  return (
    <div data-testid="point-ex">
      <MarketChart m={inst.market} ghost mark={resp} good={fb ? inst.answer : null} onPlot={locked ? null : (q, p) => { Audio.play('tick'); setResp({ q, p }); }}
        label="Нажмите на график там, где новое равновесие" />
      <div className="lp-readout ds-sub">{resp ? <>Ваша точка: объём <b>{resp.q}</b>, цена <b>{String(resp.p).replace('.', ',')}</b></> : 'Нажмите на график, чтобы поставить точку'}</div>
    </div>
  );
}

// определение из плиток: нажатые плитки встают в строку, нажатие по плитке в строке — убирает её
export function TilesEx({ inst, resp, setResp, locked, fb }) {
  const seq = resp || [];
  const tile = (k) => inst.tiles.find((t) => t.key === k);
  return (
    <div data-testid="tiles-ex">
      <div className="lp-tiles" data-testid="tiles-answer" style={fb ? { borderColor: fb.ok ? 'var(--ds-ok)' : 'var(--ds-bad)', borderStyle: 'solid' } : undefined}>
        {seq.map((k) => (
          <button key={k} type="button" className="lp-tile" disabled={locked} onClick={() => { Audio.play('tick'); setResp(seq.filter((x) => x !== k)); }}>{tile(k).text}</button>
        ))}
        {!seq.length && <span style={{ fontSize: 14, color: 'var(--ds-ink3)', padding: 8 }}>Нажимайте плитки по порядку</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }} role="group" aria-label="Плитки">
        {inst.tiles.filter((t) => !seq.includes(t.key)).map((t) => (
          <button key={t.key} type="button" className="lp-tile" data-tile={t.key} disabled={locked} onClick={() => { Audio.play('tick'); setResp([...seq, t.key]); }}>{t.text}</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ ТАЙМЕР И РАУНДЫ ------------------------------ */
// полоса времени: идёт, пока running; по нулю — onEnd (один раз)
export function TimerBar({ seconds, running, onEnd }) {
  const [left, setLeft] = useState(seconds * 1000);
  const end = useRef(onEnd); end.current = onEnd;
  const fired = useRef(false);
  useEffect(() => {
    if (!running) return undefined;
    const t0 = Date.now(); const from = left;
    const id = setInterval(() => {
      const l = Math.max(0, from - (Date.now() - t0));
      setLeft(l);
      if (l <= 0 && !fired.current) { fired.current = true; clearInterval(id); end.current(); }
    }, 100);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const pct = (left / (seconds * 1000)) * 100;
  return (
    <div>
      <div className="lp-score"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Timer size={14} />{Math.ceil(left / 1000)} с</span></div>
      <div className={`lp-timer ${pct < 25 ? 'low' : ''}`} role="timer" aria-label={`Осталось ${Math.ceil(left / 1000)} секунд`} data-testid="timer"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

const testing = () => typeof window !== 'undefined' && !!window.__INFLATIA_TEST__;

/* ------------------------------ МИНИ-ИГРА ------------------------------
   Одна игра на урок, на время. Карточки идут по кругу, пока не кончится время; за верный
   ответ — очки с множителем серии (comboOf), ошибка серию обнуляет. Каждая карточка меняет
   график игры — так видно, что делает с рынком заголовок или со страной решение:
   chart=market — кривая спроса или предложения сдвигается, цена едет, внизу — её история;
   chart=ppf — КПВ растёт или сжимается, точка страны скользит по кривой;
   chart=budget — бюджетная линия: доход сдвигает её параллельно, цена товара поворачивает.
   Ответ — смахнуть карточку (swipe), кнопки или стрелки клавиатуры. */
const EFFECT_LABEL = {
  'D+': 'Спрос вправо', 'D-': 'Спрос влево', 'S+': 'Предложение вправо', 'S-': 'Предложение влево',
  out: 'КПВ наружу', in: 'КПВ внутрь', ox: 'КПВ наружу по хлебу', oy: 'КПВ наружу по станкам', ix: 'КПВ внутрь по хлебу', iy: 'КПВ внутрь по станкам',
  x: 'Точка — к хлебу', y: 'Точка — к станкам',
};
const BUDGET_LABEL = { out: 'Доход вырос', in: 'Доход упал', ox: 'Товар X дешевле', ix: 'Товар X дороже', oy: 'Товар Y дешевле', iy: 'Товар Y дороже' };
const ELASTIC_LABEL = { in: 'Неэластичный: выручка растёт', el: 'Эластичный: выручка падает' };
const COSTS_LABEL = { fc: 'Постоянные: поднялись только средние', vc: 'Переменные: поднялись все три кривые' };
const POWER_LABEL = { pt: 'Ценополучатель: цена с рынка, P = MC', mp: 'Власть над ценой: цена выше MC' };
const MARKUP_LABEL = { lo: 'Заменителей больше: спрос эластичнее, наценка ниже', hi: 'Товар заметнее: спрос менее эластичен, наценка выше' };
/* подпись эффекта в пробной карточке: «Власть над ценой: цена выше MC» после ответа «Власть над ценой» —
   без повтора ответа, и MC не превращается в «mc» (было «власть над ценой: власть над ценой: цена выше mc») */
const trialEffect = (answer, label) => {
  const t = String(label || '');
  const rest = t.toLowerCase().startsWith(`${String(answer).toLowerCase()}:`) ? t.slice(answer.length + 1).trim() : t;
  return rest.charAt(0).toLowerCase() + rest.slice(1);
};
const effectLabel = (chart, eff) => (chart === 'budget' ? BUDGET_LABEL[eff] : chart === 'elastic' ? ELASTIC_LABEL[eff] : chart === 'costs' ? COSTS_LABEL[eff] : chart === 'power' ? POWER_LABEL[eff] : chart === 'markup' ? MARKUP_LABEL[eff] : EFFECT_LABEL[eff]);
const BUDGET0 = { I: 100, px: 1.25, py: 1.25 };
const MARKET_STEP = 16;
// состояние графика после карточки: сдвиги понемногу забываются, чтобы график не уезжал за край
// границы «Наценки»: спрос никогда не горизонтален (это уже совершенная конкуренция) и не круче монопольного
const MARKUP_LO = 0.08; const MARKUP_HI = 1;
function applyEffect(chart, st, eff) {
  // эластичность: крутая или пологая кривая спроса через одну точку
  if (chart === 'elastic') return { e: eff === 'in' ? 0.4 : eff === 'el' ? 2.5 : st.e };
  // издержки: постоянная трата поднимает только средние общие, переменная — все три кривые
  if (chart === 'costs') return { fc: eff === 'fc' ? 1 : eff ? 0 : st.fc, vc: eff === 'vc' ? 1 : eff ? 0 : st.vc };
  // рыночная власть: спрос на товар фирмы — горизонтальный у ценополучателя, падающий у монополиста
  if (chart === 'power') return { m: eff === 'mp' ? 1 : eff === 'pt' ? 0 : st.m };
  /* наценка при монополистической конкуренции: событие делает спрос на товар фирмы чуть круче или положе — на треть
     оставшегося пути к краю. Постоянный шаг ±0,22 после трёх «ниже» упирался в границу, и график переставал двигаться
     (жалоба mw83dngv «график всё ещё сломан»): теперь каждый ответ его сдвигает */
  if (chart === 'markup') return { m: eff === 'hi' ? st.m + (MARKUP_HI - st.m) / 3 : eff === 'lo' ? st.m - (st.m - MARKUP_LO) / 3 : st.m };
  if (chart === 'market') {
    const d = { D: st.D * 0.6, S: st.S * 0.6 };
    if (eff) d[eff[0]] = clampN(d[eff[0]] + (eff[1] === '+' ? MARKET_STEP : -MARKET_STEP), -32, 32);
    return d;
  }
  if (chart === 'budget') {
    // доход и цены понемногу возвращаются к исходным, чтобы линия не уезжала за край
    const back = (key, v) => BUDGET0[key] + (v - BUDGET0[key]) * 0.85;
    let { I, px, py } = { I: back('I', st.I), px: back('px', st.px), py: back('py', st.py) };
    if (eff === 'out') I = clampN(I * 1.2, 60, 160);
    if (eff === 'in') I = clampN(I / 1.2, 60, 160);
    if (eff === 'ox') px = clampN(px / 1.25, 0.9, 2.6);
    if (eff === 'ix') px = clampN(px * 1.25, 0.9, 2.6);
    if (eff === 'oy') py = clampN(py / 1.25, 0.9, 2.6);
    if (eff === 'iy') py = clampN(py * 1.25, 0.9, 2.6);
    return { I, px, py };
  }
  const k = (v) => 100 + (v - 100) * 0.85;
  let { rx, ry, t } = { rx: k(st.rx), ry: k(st.ry), t: st.t };
  const mul = { out: [1.14, 1.14], in: [0.88, 0.88], ox: [1.18, 1], oy: [1, 1.18], ix: [0.84, 1], iy: [1, 0.84] }[eff];
  if (mul) { rx = clampN(rx * mul[0], 62, 138); ry = clampN(ry * mul[1], 62, 138); }
  if (eff === 'x') t = clampN(t - 0.16, 0.08, 0.92);
  if (eff === 'y') t = clampN(t + 0.16, 0.08, 0.92);
  return { rx, ry, t };
}
const startState = (chart) => (chart === 'market' ? { D: 0, S: 0 } : chart === 'budget' ? { ...BUDGET0 } : chart === 'elastic' ? { e: 1 } : chart === 'costs' ? { fc: 0, vc: 0 } : chart === 'power' || chart === 'markup' ? { m: 0.5 } : { rx: 100, ry: 100, t: 0.5 });
// плавный переход к новому состоянию графика (при «уменьшить движение» — сразу)
function useTween(target, ms = 420) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced) { setV(target); from.current = target; return undefined; }
    const a = from.current; const t0 = performance.now(); let id;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms); const e = 1 - (1 - k) ** 3;
      const cur = Object.fromEntries(Object.keys(target).map((key) => [key, a[key] + (target[key] - a[key]) * e]));
      setV(cur); from.current = cur;
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(target), reduced]);
  return v;
}
// бюджетная линия игры: от «всё на Y» до «всё на X», закрашены доступные наборы; пунктир — с чего начинали
function BudgetGameChart({ st }) {
  const W = 300; const H = 200; const L = 34; const B = 26; const T = 10; const R = 12; const M = 170;
  const sx = (v) => L + (Math.min(v, M) / M) * (W - L - R); const sy = (v) => H - B - (Math.min(v, M) / M) * (H - B - T);
  const xm = st.I / st.px; const ym = st.I / st.py;
  const x0 = BUDGET0.I / BUDGET0.px; const y0 = BUDGET0.I / BUDGET0.py;
  return (
    <svg className="lp-chart lp-game-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Бюджетная линия: всё на X — ${Math.round(xm)}, всё на Y — ${Math.round(ym)}`} data-testid="game-chart" data-chart="budget"
      data-state={JSON.stringify({ x: Math.round(xm), y: Math.round(ym) })}>
      <path d={`M${sx(0)},${sy(0)}L${sx(0)},${sy(ym)}L${sx(xm)},${sy(0)}Z`} fill="var(--u)" opacity=".12" />
      <line x1={sx(0)} y1={sy(y0)} x2={sx(x0)} y2={sy(0)} stroke="var(--ds-ink3)" strokeWidth="2" strokeDasharray="5 5" />
      <line x1={sx(0)} y1={sy(ym)} x2={sx(xm)} y2={sy(0)} stroke="var(--u)" strokeWidth="4" strokeLinecap="round" />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <text x={W - R} y={H - 8} textAnchor="end" className="lp-ax">X</text>
      <text x={L - 6} y={T + 8} textAnchor="end" className="lp-ax">Y</text>
      <circle cx={sx(xm)} cy={sy(0)} r="4.5" fill="var(--u)" /><circle cx={sx(0)} cy={sy(ym)} r="4.5" fill="var(--u)" />
      <text x={sx(xm)} y={H - B - 8} textAnchor="middle" className="lp-ax">{Math.round(xm)}</text>
      <text x={L + 8} y={sy(ym) + 4} className="lp-ax">{Math.round(ym)}</text>
    </svg>
  );
}
/* Эластичность в игре: спрос через точку «цена 20, покупают 60». Крутая кривая — неэластичный
   спрос, пологая — эластичный. Прямоугольники — выручка сейчас и после подорожания на 10%. */
function ElasticGameChart({ st }) {
  const W = 300; const H = 200; const L = 34; const B = 26; const T = 10; const R = 12;
  const QM = 140; const PM = 40;
  const sx = (q) => L + (Math.max(0, Math.min(q, QM)) / QM) * (W - L - R); const sy = (p) => H - B - (Math.max(0, Math.min(p, PM)) / PM) * (H - B - T);
  const b = 3 * st.e; // |E| = b·P/Q в точке (60, 20)
  const qAt = (p) => 60 - b * (p - 20);
  const pAt = (q) => 20 - (q - 60) / b;
  // концы прямой — там, где она входит в рамку графика и выходит из неё (а не по отдельности по осям: иначе наклон врёт)
  const top = qAt(PM) >= 0 ? { q: qAt(PM), p: PM } : { q: 0, p: pAt(0) };
  const bottom = qAt(0) <= QM ? { q: qAt(0), p: 0 } : { q: QM, p: pAt(QM) };
  const p1 = 22; const q1 = Math.max(0, qAt(p1));
  const r0 = 20 * 60; const r1 = p1 * q1;
  const up = r1 >= r0;
  return (
    <svg className="lp-chart lp-game-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Спрос ${st.e < 1 ? 'неэластичный' : 'эластичный'}: выручка после подорожания ${Math.round(r1)} против ${r0}`}
      data-testid="game-chart" data-chart="elastic" data-state={JSON.stringify({ e: Math.round(st.e * 100) / 100, up })}>
      <rect x={sx(0)} y={sy(20)} width={sx(60) - sx(0)} height={sy(0) - sy(20)} fill="var(--ds-ink3)" opacity=".12" />
      <rect x={sx(0)} y={sy(p1)} width={sx(q1) - sx(0)} height={sy(0) - sy(p1)} fill="none" stroke={up ? 'var(--ds-ok)' : 'var(--ds-bad)'} strokeWidth="2" strokeDasharray="5 4" />
      <line x1={sx(top.q)} y1={sy(top.p)} x2={sx(bottom.q)} y2={sy(bottom.p)} stroke="var(--u)" strokeWidth="4" strokeLinecap="round" data-testid="elastic-demand" />
      <circle cx={sx(60)} cy={sy(20)} r="4.5" fill="var(--u)" />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <text x={W - R} y={H - 8} textAnchor="end" className="lp-ax">Q</text>
      <text x={L - 6} y={T + 8} textAnchor="end" className="lp-ax">P</text>
      {/* подложка цвета фона: крутая кривая спроса проходит под надписью, но не перечёркивает её */}
      <text x={W - R - 4} y={T + 14} textAnchor="end" className="lp-ax" style={{ fill: up ? 'var(--ds-ok)' : 'var(--ds-bad)', fontWeight: 700, stroke: 'var(--ds-paper)', strokeWidth: 5, paintOrder: 'stroke', strokeLinejoin: 'round' }}>
        выручка при +10% цены: {up ? '↑' : '↓'} {Math.round(r1)}
      </text>
    </svg>
  );
}
/* Издержки игры: средние общие (ATC), средние переменные (AVC) и предельные (MC) пекарни; пунктир —
   с чего начинали. Постоянная трата поднимает только ATC, переменная — все три кривые: так видно,
   почему аренда не меняет цену ещё одной партии. fc и vc — доля сдвига от 0 до 1 (плавный переход). */
function CostsGameChart({ st }) {
  const W = 300; const H = 200; const L = 34; const B = 26; const T = 10; const R = 12;
  const QM = 8; const PM = 60;
  const sx = (q) => L + (q / QM) * (W - L - R); const sy = (p) => H - B - (Math.max(0, Math.min(p, PM)) / PM) * (H - B - T);
  const curve = (f) => { const pts = []; for (let k = 0; k <= 40; k += 1) { const q = 0.6 + (k / 40) * (QM - 0.6); pts.push(`${sx(q).toFixed(1)},${sy(f(q)).toFixed(1)}`); } return `M${pts.join('L')}`; };
  const fc = 30 + 25 * (st.fc || 0); const v = 6 * (st.vc || 0);
  const avc = (q, dv) => 14 - 3 * q + 0.5 * q * q + dv;
  const mc = (q, dv) => 14 - 6 * q + 1.5 * q * q + dv;
  const atc = (q, f, dv) => f / q + avc(q, dv);
  return (
    <svg className="lp-chart lp-game-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={st.fc > 0.5 ? 'Постоянные издержки выросли: поднялись только средние общие' : st.vc > 0.5 ? 'Переменные издержки выросли: поднялись все три кривые' : 'Кривые издержек пекарни'}
      data-testid="game-chart" data-chart="costs" data-state={JSON.stringify({ fc: Math.round((st.fc || 0) * 100) / 100, vc: Math.round((st.vc || 0) * 100) / 100 })}>
      <path d={curve((q) => atc(q, 30, 0))} fill="none" stroke="var(--ds-ink3)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={curve((q) => mc(q, 0))} fill="none" stroke="var(--ds-ink3)" strokeWidth="1.5" strokeDasharray="4 4" opacity=".7" />
      <path d={curve((q) => avc(q, v))} fill="none" stroke="var(--ds-ok)" strokeWidth="2.5" data-testid="costs-avc" />
      <path d={curve((q) => mc(q, v))} fill="none" stroke="var(--ds-bad)" strokeWidth="2.5" data-testid="costs-mc" />
      <path d={curve((q) => atc(q, fc, v))} fill="none" stroke="var(--u)" strokeWidth="3.5" strokeLinecap="round" data-testid="costs-atc" />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <text x={W - R} y={H - 8} textAnchor="end" className="lp-ax">Q</text>
      <text x={L - 6} y={T + 8} textAnchor="end" className="lp-ax">C</text>
      {[['ATC', atc(7.2, fc, v), 'var(--u)'], ['AVC', avc(7.2, v), 'var(--ds-ok)'], ['MC', mc(6.1, v), 'var(--ds-bad)']].map(([t, y, c], k) => (
        <text key={t} x={k === 2 ? sx(6.1) - 4 : sx(7.6)} y={sy(y) - 4} textAnchor="end" className="lp-ax" style={{ fill: c, fontWeight: 700, stroke: 'var(--ds-paper)', strokeWidth: 4, paintOrder: 'stroke' }}>{t}</text>
      ))}
    </svg>
  );
}
/* Рыночная власть: спрос на товар фирмы. У ценополучателя он горизонтален на уровне рыночной цены —
   фирма продаёт там, где цена равна MC. У монополиста спрос падает, предельная выручка MR ниже
   него, выпуск — где MR = MC, а цена со спроса выше MC: между ними — наценка. m — от 0 к 1. */
/* markup — та же картинка для игры «Наценка ниже или выше?» (монополистическая конкуренция): спрос
   никогда не горизонтален, каждое событие делает его чуть положе (больше заменителей) или круче */
function PowerGameChart({ st, markup: mk = false }) {
  const W = 300; const H = 200; const L = 34; const B = 26; const T = 10; const R = 12;
  const QM = 12; const PM = 64;
  const sx = (q) => L + (Math.max(0, Math.min(q, QM)) / QM) * (W - L - R); const sy = (p) => H - B - (Math.max(0, Math.min(p, PM)) / PM) * (H - B - T);
  // спрос, MR и выпуск — по одной модели (src/learn/power-chart.js): цена лежит на спросе, выпуск — где MR = MC
  const pm = powerModel(st.m);
  const { m, q, p, dem, mr } = pm; const mc = powerMc;
  const line = (f, q0, q1) => `M${sx(q0).toFixed(1)},${sy(f(q0)).toFixed(1)}L${sx(q1).toFixed(1)},${sy(f(q1)).toFixed(1)}`;
  const markup = Math.round(pm.markup);
  // подпись MR — у дальнего конца её линии, а не у точки MR = MC (там и так тесно)
  // в «Наценке» наценка есть всегда — её подпись и MR не бледнеют до невидимости
  const op = mk ? Math.max(m, 0.7) : m;
  const mrTo = Math.min(QM, pm.mrEnd); const mrLabelQ = Math.min(QM - 1, mrTo) - 1;
  const halo = { stroke: 'var(--ds-paper)', strokeWidth: 4, paintOrder: 'stroke', strokeLinejoin: 'round' };
  return (
    <svg className="lp-chart lp-game-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={mk ? `Наценка над предельными издержками: ${markup}` : m > 0.5 ? `Власть над ценой: цена ${Math.round(p)} выше предельных издержек на ${markup}` : 'Ценополучатель: цена с рынка равна предельным издержкам'}
      data-testid="game-chart" data-chart={mk ? 'markup' : 'power'} data-state={JSON.stringify({ m: Math.round(m * 100) / 100, markup })}>
      {/* в «Наценке» полосы от оси нет: она висела слева и ни с чем на графике не совпадала (владелец 09.11: «эта полоса
          не ровная, она слева») — наценка видна отрезком на линии выпуска */}
      {!mk && <rect x={sx(0)} y={sy(p)} width={sx(q) - sx(0)} height={Math.max(0, sy(mc(q)) - sy(p))} fill="var(--u)" opacity={0.14 * m} />}
      <path d={line(mc, 0, 9.6)} fill="none" stroke="var(--ds-ok)" strokeWidth="2.5" />
      <path d={line(mr, 0, mrTo)} fill="none" stroke="var(--ds-ink3)" strokeWidth="2" strokeDasharray="5 4" opacity={op} />
      <path d={line(dem, 0, QM - 0.6)} fill="none" stroke="var(--u)" strokeWidth="4" strokeLinecap="round" data-testid="power-demand" />
      <line x1={sx(q)} y1={sy(p)} x2={sx(q)} y2={sy(0)} stroke="var(--ds-ink3)" strokeDasharray="3 3" />
      {/* наценка — отрезок от цены до MC ровно на линии выпуска (в «Наценке»), а не сбоку от неё */}
      <line x1={sx(q) + (mk ? 0 : 7)} y1={sy(p)} x2={sx(q) + (mk ? 0 : 7)} y2={sy(mc(q))} stroke="var(--u)" strokeWidth={mk ? 4 : 2} strokeLinecap="round" opacity={op} data-testid="game-markup-bar" />
      <circle cx={sx(q)} cy={sy(p)} r="5" fill="var(--u)" />
      <circle cx={sx(q)} cy={sy(mc(q))} r="3.5" fill="var(--ds-ok)" opacity={m} />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="1.5" />
      <text x={W - R} y={H - 8} textAnchor="end" className="lp-ax">Q</text>
      <text x={L - 6} y={T + 8} textAnchor="end" className="lp-ax">P</text>
      <text x={sx(1.2)} y={sy(mc(1.2)) - 7} className="lp-ax" style={{ fill: 'var(--ds-ok)', fontWeight: 700, ...halo }}>MC</text>
      <text x={sx(1)} y={sy(dem(1)) - 8} className="lp-ax" style={{ fill: 'var(--u-ink)', fontWeight: 700, ...halo }}>спрос</text>
      {/* подписи не на линиях (жалоба mvuaw8zo «что за ужас с графиком»): MR — слева от своей линии над осью,
          наценка — над точкой цены, где нет ни спроса, ни MC */}
      {/* в «Наценке» подписи — при любой наценке (на малой они пропадали, жалоба mw83dngv); MR — не на оси: у самой оси
          подпись встаёт над линией */}
      {/* в «Наценке» MR подписана у конца своей линии: дошла до оси Q внутри графика — справа от этой точки, над осью;
          ушла за правый край — у края, над линией. Подпись не лежит ни на оси, ни на самой линии */}
      {mk ? <text x={pm.mrEnd < QM - 1 ? sx(pm.mrEnd) + 6 : sx(QM) - 2} y={pm.mrEnd < QM - 1 ? H - B - 10 : Math.min(sy(mr(QM)) - 8, H - B - 10)} textAnchor={pm.mrEnd < QM - 1 ? 'start' : 'end'}
        className="lp-ax" style={{ opacity: op, ...halo }} data-testid="game-mr-label">MR</text>
        : m > 0.15 && <text x={sx(mrLabelQ) + 6} y={sy(mr(mrLabelQ)) + 12} className="lp-ax" style={{ opacity: op, ...halo }}>MR</text>}
      {(mk || m > 0.15) && <text x={sx(q) + 10} y={sy(p) - 9} className="lp-ax" style={{ opacity: op, fill: 'var(--u-ink)', fontWeight: 700, ...halo }} data-testid="game-markup-label">наценка +{markup}</text>}
      {/* в «Наценке» подпись — только при явном перевесе: на старте спрос средний, «много заменителей» было неправдой */}
      {(!mk || Math.abs(m - 0.5) > 0.05) && <text x={W - R - 4} y={T + 14} textAnchor="end" className="lp-ax" style={{ fill: m > 0.5 ? 'var(--u-ink)' : 'var(--ds-ok)', fontWeight: 700, ...halo }}>{mk ? (m > 0.5 ? 'мало заменителей' : 'много заменителей') : m > 0.5 ? 'цена выше MC' : 'цена = MC'}</text>}
    </svg>
  );
}
// КПВ игры: четверть эллипса с концами rx (хлеб) и ry (станки); пунктир — с чего начинали
function PpfGameChart({ st }) {
  const W = 300; const H = 200; const L = 34; const B = 26; const T = 10; const R = 12;
  const sx = (v) => L + (v / 140) * (W - L - R); const sy = (v) => H - B - (v / 140) * (H - B - T);
  const path = (rx, ry) => { const pts = []; for (let k = 0; k <= 40; k += 1) { const a = (k / 40) * (Math.PI / 2); pts.push(`${sx(rx * Math.cos(a)).toFixed(1)},${sy(ry * Math.sin(a)).toFixed(1)}`); } return `M${pts.join('L')}`; };
  const a = st.t * (Math.PI / 2);
  const px = sx(st.rx * Math.cos(a)); const py = sy(st.ry * Math.sin(a));
  return (
    <svg className="lp-chart lp-game-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`КПВ: хлеба до ${Math.round(st.rx)}, станков до ${Math.round(st.ry)}`} data-testid="game-chart" data-chart="ppf"
      data-state={JSON.stringify({ rx: Math.round(st.rx), ry: Math.round(st.ry), t: Math.round(st.t * 100) / 100 })}>
      <path d={`${path(st.rx, st.ry)}L${sx(0)},${sy(0)}Z`} fill="var(--u)" opacity=".1" />
      <path d={path(100, 100)} stroke="var(--ds-ink3)" strokeWidth="2" strokeDasharray="5 5" fill="none" />
      <path d={path(st.rx, st.ry)} stroke="var(--u)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="2" />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--ds-ink2)" strokeWidth="2" />
      <text x={L + 4} y={T + 10}>станки</text><text x={W - R} y={H - B - 6} textAnchor="end">хлеб</text>
      <line x1={px} y1={py} x2={px} y2={H - B} stroke="var(--u)" strokeDasharray="3 4" opacity=".6" />
      <line x1={L} y1={py} x2={px} y2={py} stroke="var(--u)" strokeDasharray="3 4" opacity=".6" />
      <circle cx={px} cy={py} r="8" fill="var(--ds-card)" stroke="var(--u)" strokeWidth="4" />
    </svg>
  );
}
// история цены за игру: маленькая линия под графиком рынка
function PriceTicker({ prices, name = 'Цена', unit = '' }) {
  if (prices.length < 2) return null;
  const W = 300; const H = 34; const lo = Math.min(...prices) - 1; const hi = Math.max(...prices) + 1;
  const pts = prices.map((p, i) => `${((i / (prices.length - 1)) * (W - 8) + 4).toFixed(1)},${(H - 4 - ((p - lo) / (hi - lo)) * (H - 8)).toFixed(1)}`);
  const last = prices[prices.length - 1]; const prev = prices[prices.length - 2];
  return (
    <div className="lp-ticker" data-testid="price-ticker">
      <span className="ds-eyebrow" style={{ fontSize: 12 }}>{name}</span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={pts.join(' ')} fill="none" stroke="var(--u)" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <b className="ds-num" style={{ color: last > prev ? 'var(--ds-bad)' : last < prev ? 'var(--ds-ok)' : 'inherit' }}>{fmtResult(Math.round(last * 10) / 10)}{unit} {last > prev ? '↑' : last < prev ? '↓' : ''}</b>
    </div>
  );
}
const SIDE_ICON = { left: ArrowLeft, right: ArrowRight, up: ArrowUp, down: ArrowDown };
const KEY_SIDE = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
export function GameRound({ inst, onDone, locked, result = null, best = 0, intro = null }) {
  const reduced = useReducedMotion();
  const sides = inst.kind === 'swipe' ? ['left', 'right'] : ['up', 'down'];
  const [phase, setPhase] = useState(locked ? 'over' : 'ready');
  /* колода — каждая новость один раз (пробная — в самом конце): разобрали всё раньше времени —
     игра кончается, а секунды в запасе идут в очки */
  const sample = inst.items.find((x) => x.effect) || inst.items[0];
  const deck = useRef([...inst.items.filter((x) => x !== sample), sample]);
  const t0 = useRef(0);
  const [bonus, setBonus] = useState(0);
  const [idx, setIdx] = useState(0);
  const [st, setSt] = useState(() => startState(inst.chart));
  const [prices, setPrices] = useState(() => (inst.market ? [equilibrium(inst.market).p] : []));
  const [answers, setAnswers] = useState([]);
  const [flash, setFlash] = useState(null);
  const [pop, setPop] = useState(null);
  const [tag, setTag] = useState(null);
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const done = useRef(false);
  const ans = useRef([]);
  const shown = useTween(st);
  const item = deck.current[idx % deck.current.length];
  const { score, bestRun } = gameScore(answers);
  const run = (() => { let n = 0; for (let k = answers.length - 1; k >= 0 && answers[k]; k -= 1) n += 1; return n; })();
  const combo = comboOf(run);
  const seconds = testing() && window.__INFLATIA_GAME_SECONDS__ ? Number(window.__INFLATIA_GAME_SECONDS__) : inst.seconds;
  const finish = (early = false) => {
    if (done.current) return; done.current = true;
    const a = ans.current; const sc = gameScore(a);
    const tb = early ? timeBonus(seconds - (Date.now() - t0.current) / 1000) : 0;
    const total = sc.score + tb;
    setBonus(tb); setPhase('over');
    onDone({ right: a.filter(Boolean).length, answered: a.length, score: total, timeBonus: tb, bestRun: sc.bestRun, record: total > best && total > 0, timeout: !early, done: true });
  };
  const decide = (side) => {
    if (phase !== 'play' || locked || done.current || !item || ans.current.length >= deck.current.length) return;
    const ok = side === item.side;
    Audio.play(ok ? 'coin' : 'down');
    const next = [...ans.current, ok]; ans.current = next; setAnswers(next);
    if (ok) { const r = (() => { let n = 0; for (let k = next.length - 1; k >= 0 && next[k]; k -= 1) n += 1; return n; })(); setPop({ k: next.length, v: 10 * comboOf(r - 1) }); }
    setFlash(ok ? 'ok' : 'bad'); setDx(0);
    setTimeout(() => setFlash(null), 260);
    if (item.effect) {
      const ns = applyEffect(inst.chart, st, item.effect);
      setSt(ns); setTag({ k: next.length, text: effectLabel(inst.chart, item.effect) });
      if (inst.market) setPrices((p) => [...p, equilibrium({ ...inst.market, dA: ns.D, dC: ns.S }).p].slice(-24));
    }
    if (idx + 1 >= deck.current.length) setTimeout(() => finish(true), 280);
    else setIdx(idx + 1);
  };
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const key = (e) => { const side = KEY_SIDE[e.key]; if (side && sides.includes(side)) { e.preventDefault(); decide(side); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const down = (e) => { if (phase !== 'play' || inst.kind !== 'swipe') return; start.current = e.clientX; if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (start.current != null) setDx(e.clientX - start.current); };
  const up = () => { if (start.current == null) return; const d = dx; start.current = null; if (Math.abs(d) > 80) decide(d > 0 ? 'right' : 'left'); else setDx(0); };
  /* Пробный ход: один заголовок без таймера и без очков — ответ с объяснением, график показывает
     сдвиг. Перед стартом график возвращается на место. */
  const [trial, setTrial] = useState(null);
  const tryIt = (side) => {
    if (trial) return;
    const ok = side === sample.side;
    Audio.play(ok ? 'coin' : 'down');
    setTrial({ ok });
    if (sample.effect) setSt(applyEffect(inst.chart, startState(inst.chart), sample.effect));
  };
  const begin = () => { Audio.play('click'); setSt(startState(inst.chart)); t0.current = Date.now(); setPhase('play'); };
  const sideHint = inst.kind === 'swipe' ? `кнопки внизу, стрелки ← → или смахните карточку` : 'кнопки внизу или стрелки ↑ ↓ на клавиатуре';
  const r = result || (phase === 'over' ? { right: answers.filter(Boolean).length, answered: answers.length, score: score + bonus, timeBonus: bonus, bestRun, record: false } : null);
  const chart = inst.chart === 'market'
    ? <><MarketChart m={inst.market} names={inst.names || null} shift={{ D: shown.D || 0, S: shown.S || 0 }} ghost eq label="Рынок в игре: спрос и предложение" /><PriceTicker prices={prices} name={inst.names && inst.names.y ? inst.names.y.split(',')[0].replace(/^./, (c) => c.toUpperCase()) : 'Цена'} unit={(inst.names && inst.names.unit) || ''} /></>
    : inst.chart === 'ppf' ? <PpfGameChart st={shown} /> : inst.chart === 'budget' ? <BudgetGameChart st={shown} /> : inst.chart === 'elastic' ? <ElasticGameChart st={shown} />
      : inst.chart === 'costs' ? <CostsGameChart st={shown} /> : inst.chart === 'power' ? <PowerGameChart st={shown} /> : inst.chart === 'markup' ? <PowerGameChart st={shown} markup /> : null;
  return (
    <div data-testid="game" data-phase={phase} className="lp-game">
      {phase === 'ready' && (
        <>
          {intro}
          <div className="lp-howto" data-testid="game-howto">
            <div className="ds-eyebrow">Как играть</div>
            <ol>
              <li>Появляются карточки — каждая по одному разу, всего {inst.items.length}.</li>
              <li>Решите: {inst.labels[sides[0]].toLowerCase()} или {inst.labels[sides[1]].toLowerCase()}? Отвечайте — {sideHint}.</li>
              <li>График покажет, что сдвинулось. Три верных подряд — очки ×2, дальше ещё больше; ошибка обнуляет серию. Разобрали все раньше времени — секунды в запасе тоже идут в очки, а очки — в опыт урока.</li>
            </ol>
          </div>
          {chart}
          <div className="lp-trial" data-testid="game-trial">
            <div className="ds-eyebrow">Пробная карточка — без таймера</div>
            <div className="lp-trial-card" data-answer={testing() ? sample.side : undefined}><Inline nodes={sample.text} /></div>
            {!trial ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {sides.map((sd) => <button key={sd} type="button" className="ds-opt lp-side" data-trial={sd} onClick={() => tryIt(sd)}>{inst.labels[sd]}</button>)}
              </div>
            ) : (
              <div style={{ fontSize: 14.5, lineHeight: 1.45 }} data-testid="game-trial-result" data-ok={String(trial.ok)}>
                <b style={{ color: trial.ok ? 'var(--ds-ok)' : 'var(--ds-bad)' }}>{trial.ok ? 'Верно.' : 'Не совсем.'}</b>{' '}
                Ответ — «{inst.labels[sample.side]}»{sample.effect ? `: ${trialEffect(inst.labels[sample.side], effectLabel(inst.chart, sample.effect))}, это видно на графике` : ''}. В игре так же — только быстро.
              </div>
            )}
          </div>
          <div className="lp-game-rules ds-sub">
            <span><Timer size={14} aria-hidden="true" /> {seconds} секунд</span>
            <span>зачёт — когда верных на {GAME_PASS} больше, чем ошибок</span>
            {best > 0 && <span data-testid="game-best"><Trophy size={14} aria-hidden="true" /> рекорд: {best}</span>}
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button type="button" className="ds-btn" data-testid="game-start" onClick={begin}><Play size={16} style={{ verticalAlign: -3 }} /> {trial ? 'Старт' : 'Сразу к игре'}</button>
          </div>
        </>
      )}
      {phase === 'play' && (
        <>
          <TimerBar seconds={seconds} running={!locked} onEnd={finish} />
          <div className="lp-game-hud">
            <span className="ds-num lp-game-score" data-testid="game-score">{score}</span>
            {combo > 1 && <span className="lp-combo" key={`c${combo}`} data-testid="game-combo">×{combo}</span>}
            <span style={{ flex: 1 }} />
            {/* до зачёта — всё время на виду: набрал — отметка, дальше игра на очки и рекорд */}
            {(() => { const left = gameLeft(answers.filter(Boolean).length, answers.length); return (
              <span className={`lp-pass${left ? '' : ' ok'}`} data-testid="game-pass" data-left={left}>{left ? `до зачёта: ${left}` : <><Check size={13} strokeWidth={3} aria-hidden="true" /> зачёт есть</>}</span>
            ); })()}
          </div>
          <div className="lp-game-stage">{chart}</div>
          <div className="lp-effect-row">{tag && <span className="lp-effect" key={`t${tag.k}`} data-testid="game-effect">{tag.text}</span>}</div>
          <div style={{ position: 'relative' }}>
            {pop && <span className="lp-pop ds-num" key={`p${pop.k}`}>+{pop.v}</span>}
            <div className={`lp-card lp-game-card ${flash || ''}`} data-testid="game-card" data-answer={testing() ? item.side : undefined}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} key={`${idx}:${answers.length}`}
              style={{ transform: reduced || inst.kind !== 'swipe' ? undefined : `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: start.current != null || reduced ? 'none' : 'transform .2s' }}>
              <Inline nodes={item.text} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {sides.map((sd) => { const Icon = SIDE_ICON[sd]; return (
              <button key={sd} type="button" className="ds-opt lp-side" data-side={sd} onClick={() => decide(sd)}>
                {sd === 'right' ? <>{inst.labels[sd]} <Icon size={16} style={{ verticalAlign: -3 }} /></> : <><Icon size={16} style={{ verticalAlign: -3 }} /> {inst.labels[sd]}</>}
              </button>
            ); })}
          </div>
        </>
      )}
      {phase === 'over' && r && (
        <>
          {chart}
          <div className="lp-card lp-game-final" data-testid="game-final">
            <div className="ds-eyebrow">{r.timeBonus ? 'Все новости разобраны!' : 'Время!'}</div>
            <div className="ds-num" style={{ fontSize: 34, fontWeight: 700, color: 'var(--u-ink)' }}>{r.score}</div>
            <div style={{ fontSize: 16 }}>очков · верно {r.right} из {r.answered} · лучшая серия {r.bestRun}</div>
            {r.timeBonus > 0 && <div className="ds-sub" data-testid="game-time-bonus">в том числе +{r.timeBonus} за {r.timeBonus / GAME_TIME_BONUS} {plural(r.timeBonus / GAME_TIME_BONUS, 'секунду', 'секунды', 'секунд')} в запасе</div>}
            {(() => { const left = gameLeft(r.right, r.answered); const wrong = r.answered - r.right; return (
              <div className={`lp-verdict${left ? '' : ' ok'}`} data-testid="game-verdict" data-ok={String(!left)}>
                {left ? `Зачёта нет, не хватило ${left}: верных ${r.right}, ошибок ${wrong} — нужно, чтобы верных было на ${GAME_PASS} больше` : `Игра засчитана: верных ${r.right}, ошибок ${wrong}`}
              </div>
            ); })()}
            {r.record && <div className="ds-badge" style={{ marginTop: 6 }} data-testid="game-record">Новый рекорд!</div>}
          </div>
        </>
      )}
    </div>
  );
}
/* ------------------------------ «СБЕРЕГИ КОШЕЛЁК» ------------------------------
   Мини-игра юнита «Инфляция» (src/learn/wallet.js): пять лет, в каждом — полоса «Вестника» с
   новостью и прогнозом инфляции, шкала, где рядом прогноз и ставка банка, и три решения:
   наличными дома, во вклад, купить впрок. Год проигрывается на глазах: стрелка инфляции идёт по
   шкале, ценник чашки растёт, кошелёк пересчитывается, а чашки, на которые его хватает, гаснут
   или прибавляются. Разбор года — полоски реального итога трёх вариантов. В конце — путь
   сбережений по годам против «всё время наличными». */
const WALLET_OPT = {
  cash: { icon: Banknote, title: 'Наличными дома', hint: () => 'Крон останется столько же' },
  deposit: { icon: Landmark, title: 'Во вклад', hint: (y) => `Банк добавит ${y.r}% к сумме` },
  stock: { icon: ShoppingBasket, title: 'Купить впрок', hint: () => 'Кофе и крупы: дорожают вместе с ценами, но 3% в год портится' },
};
const OPT_NAME = { cash: 'держать наличными', deposit: 'положить во вклад', stock: 'купить впрок' };
const BAR_NAME = { cash: 'Наличные', deposit: 'Вклад', stock: 'Запас' };
const signPct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${String(Math.abs(v)).replace('.', ',')}%`;
const kr = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
// шкала года: полоса прогноза инфляции, отметка ставки банка и, после хода, — сколько вышло
function RateScale({ year, pi = null }) {
  const [lo, hi] = FORECAST[year.level];
  const X = (v) => 12 + (Math.max(0, Math.min(25, v)) / 25) * 276;
  return (
    <svg viewBox="0 0 300 66" width="100%" className="lw-scale" role="img" data-testid="wallet-scale"
      aria-label={`Прогноз инфляции ${lo}–${hi}%, вклад ${year.r}%${pi != null ? `, вышло ${pi}%` : ''}`}>
      <line x1="12" x2="288" y1="30" y2="30" stroke="var(--ds-rule2)" strokeWidth="6" strokeLinecap="round" />
      <rect x={X(lo)} y="24" width={Math.max(6, X(hi) - X(lo))} height="12" rx="6" className="lw-band" />
      {/* деления — там, где их не закрывает подпись ставки */}
      {[0, 5, 10, 15, 20, 25].filter((v) => Math.abs(X(v) - X(year.r)) > 34).map((v) => <text key={v} x={X(v)} y="60" textAnchor="middle" className="lw-tick">{v}%</text>)}
      <g style={{ transform: `translateX(${X(year.r)}px)` }} data-testid="wallet-rate-mark">
        <path d="M0,38 l-6,9 h12 Z" className="lw-rate" />
        <text x="0" y="60" textAnchor="middle" className="lw-rate-t">вклад {year.r}%</text>
      </g>
      {pi != null && (
        <g style={{ transform: `translateX(${X(pi)}px)` }} className="lw-pi">
          <line x1="0" x2="0" y1="18" y2="42" strokeWidth="3" />
          <text x="0" y="13" textAnchor="middle">вышло {String(Math.round(pi * 10) / 10).replace('.', ',')}%</text>
        </g>
      )}
    </svg>
  );
}
// чашки, на которые хватает сбережений: 100 мест сеткой 20 × 5; сверх сотни — бейдж «+N»
// чашка на блюдце: корпус, ручка справа, блюдце снизу — узнаётся и в 12 пикселях
const CUP_BODY = 'M1.4,2.6 h7.6 l-.9,5.6 a1.3,1.3 0 0 1 -1.3,1.1 h-3.2 a1.3,1.3 0 0 1 -1.3,-1.1 Z';
const CUP_HANDLE = 'M8.8,3.9 h1.2 a1.6,1.6 0 0 1 0,3.2 h-1.6';
function Cups({ n }) {
  const on = Math.max(0, Math.min(100, Math.round(n)));
  return (
    <div className="lw-cups-wrap">
      <svg viewBox="0 0 280 72" className="lw-cups" role="img" aria-label={`Хватает на ${Math.round(n)} чашек`} data-testid="wallet-cups" data-cups={Math.round(n)}>
        {Array.from({ length: 100 }, (_, i) => (
          <g key={i} transform={`translate(${(i % 20) * 14},${Math.floor(i / 20) * 14 + 1})`} className={`lw-cup${i < on ? '' : ' off'}`}>
            <path d={CUP_BODY} className="b" /><path d={CUP_HANDLE} className="h" /><path d="M0.4,11 h9.8" className="h" />
          </g>
        ))}
      </svg>
      {n > 100.5 && <span className="lw-more">+{Math.round(n) - 100}</span>}
    </div>
  );
}
// разбор года: реальный итог трёх вариантов полосками от нуля; лучший — с галочкой
function YearBars({ year, picked }) {
  const vals = WALLET_OPTIONS.map((o) => ({ o, v: realPct(o, year.pi, year.r) }));
  const max = Math.max(4, ...vals.map((x) => Math.abs(x.v)));
  return (
    <div className="lw-bars" data-testid="wallet-bars">
      {vals.map(({ o, v }) => (
        <div key={o} className={`lw-bar-row${o === year.best ? ' best' : ''}${o === picked ? ' picked' : ''}`}>
          <span className="lw-bar-name">{o === year.best && <Check size={13} strokeWidth={3} aria-hidden="true" />}{BAR_NAME[o]}</span>
          <span className="lw-bar-track"><i className={v >= 0 ? 'up' : 'down'} style={{ width: `${(Math.abs(v) / max) * 50}%`, [v >= 0 ? 'left' : 'right']: '50%' }} /></span>
          <b className="ds-num">{signPct(v)}</b>
        </div>
      ))}
    </div>
  );
}
// путь сбережений по годам: ваш против «всё время наличными»
function WalletPathChart({ years, choices }) {
  const mine = walletPath(years, choices).map((p) => p.cups);
  const cash = walletPath(years, years.map(() => 'cash')).map((p) => p.cups);
  const best = walletPath(years, years.map((y) => y.best)).map((p) => p.cups);
  const top = Math.max(110, ...mine, ...best); const bot = Math.min(60, ...cash);
  const W = 300; const H = 130; const X = (k) => 34 + (k / years.length) * (W - 46); const Y = (v) => 10 + ((top - v) / (top - bot)) * (H - 34);
  const line = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lw-path" role="img" aria-label={`Чашек по годам: ${mine.map((v) => Math.round(v)).join(', ')}`} data-testid="wallet-path">
      <line x1="34" x2={W - 12} y1={Y(100)} y2={Y(100)} className="lw-path-100" />
      <text x="30" y={Y(100) + 4} textAnchor="end" className="lw-tick">100</text>
      <path d={line(cash)} className="lw-path-cash" />
      <path d={line(best)} className="lw-path-best" />
      <path d={line(mine)} className="lw-path-mine" />
      {mine.map((v, k) => <circle key={k} cx={X(k)} cy={Y(v)} r="3.6" className="lw-path-dot" />)}
      {years.map((y, k) => <text key={k} x={X(k + 1)} y={H - 6} textAnchor="middle" className="lw-tick">{choices[k] === y.best ? '✓' : '✗'} {k + 1}</text>)}
    </svg>
  );
}
export function WalletRound({ inst, onDone, locked, result = null, best = 0, intro = null }) {
  const reduced = useReducedMotion();
  const years = inst.years;
  const [phase, setPhase] = useState(locked ? 'over' : 'ready');
  const [k, setK] = useState(0);
  const [choices, setChoices] = useState(result && result.choices ? result.choices : []);
  const [t, setT] = useState(1);
  const done = useRef(false);
  // в тестах год можно проиграть быстрее
  const speed = testing() && window.__INFLATIA_GAME_SPEED__ ? Number(window.__INFLATIA_GAME_SPEED__) : 1;
  const path = walletPath(years, choices);
  const year = years[Math.min(k, years.length - 1)];
  const pick = (o) => {
    if (phase !== 'pick') return;
    Audio.play('paper');
    setChoices((c) => [...c.slice(0, k), o]);
    setPhase('reveal');
  };
  // год идёт около полутора секунд: стрелка инфляции, ценник, кошелёк, чашки
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    if (reduced) { setT(1); return undefined; }
    let raf = 0; const t0 = performance.now(); const ms = 1500 / speed;
    const step = (now) => { const v = Math.min(1, (now - t0) / ms); setT(v); if (v < 1) raf = requestAnimationFrame(step); };
    setT(0); raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, k]);
  const revealed = phase === 'reveal' && t >= 1;
  useEffect(() => { if (revealed) Audio.play(choices[k] === year.best ? 'coin' : 'down'); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);
  const finish = (all) => {
    if (done.current) return; done.current = true;
    const res = walletResult(years, all);
    setPhase('over');
    onDone({ ...res, done: true, choices: all, bestRun: res.right, record: res.score > best && res.score > 0 });
  };
  const next = () => {
    Audio.play('click');
    if (k + 1 >= years.length) { finish(choices); return; }
    setK(k + 1); setPhase('pick');
  };
  const ease = 1 - (1 - t) ** 3;
  const from = path[k]; const to = path[Math.min(k + 1, path.length - 1)];
  const lerp = (a, b) => a + (b - a) * (phase === 'reveal' ? ease : 0);
  const now = phase === 'reveal' ? { wallet: lerp(from.wallet, to.wallet), cup: lerp(from.cup, to.cup), cups: lerp(from.cups, to.cups) } : path[Math.min(k, path.length - 1)];
  const r = result || (phase === 'over' ? { ...walletResult(years, choices), record: false } : null);
  const strip = (
    <div className="lw-years" aria-label="Годы">
      {years.map((y, i) => <i key={i} className={i < choices.length && (i < k || revealed || phase === 'over') ? (choices[i] === y.best ? 'ok' : 'bad') : i === k && phase !== 'over' ? 'now' : ''} />)}
    </div>
  );
  return (
    <div data-testid="game" data-phase={phase} data-kind="wallet" className="lp-game lw">
      {phase === 'ready' && (
        <>
          {intro}
          <div className="lp-howto" data-testid="game-howto">
            <div className="ds-eyebrow">Как играть</div>
            <ol>
              <li>Каждый год «Вестник» даёт новость и прогноз: на сколько вырастут цены.</li>
              <li>Банк предлагает вклад. Сравните ставку с прогнозом — на шкале они рядом.</li>
              <li>Решите, где держать деньги год: наличными дома, во вкладе или купить впрок.</li>
              <li>Цель — чтобы сбережений хватало на столько же чашек. Зачёт — лучший выбор хотя бы в {WALLET.pass} годах из {WALLET.years}.</li>
            </ol>
          </div>
          <div className="lw-purse">
            <div><small>кошелёк</small><b className="ds-num">{kr(WALLET.start)}</b><small>крон</small></div>
            <div><small>чашка</small><b className="ds-num">{WALLET.cup}</b><small>крон</small></div>
            <div><small>хватит на</small><b className="ds-num">100</b><small>чашек</small></div>
          </div>
          <Cups n={100} />
          <div className="lp-game-rules ds-sub">
            <span><Timer size={14} aria-hidden="true" /> {WALLET.years} лет, без спешки</span>
            {best > 0 && <span data-testid="game-best"><Trophy size={14} aria-hidden="true" /> рекорд: {best} чашек</span>}
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button type="button" className="ds-btn" data-testid="game-start" onClick={() => { Audio.play('click'); setPhase('pick'); }}><Play size={16} style={{ verticalAlign: -3 }} /> Начать</button>
          </div>
        </>
      )}
      {(phase === 'pick' || phase === 'reveal') && (
        <div className="lw-year" key={k} data-testid="wallet-year" data-year={k + 1} data-best={testing() ? year.best : undefined}>
          {strip}
          <div className="lw-purse" aria-live="polite">
            <div><small>кошелёк</small><b className="ds-num" data-testid="wallet-sum">{kr(now.wallet)}</b><small>крон</small></div>
            <div className={phase === 'reveal' ? 'hot' : ''}><small>чашка</small><b className="ds-num" data-testid="wallet-cup">{kr(now.cup)}</b><small>крон</small></div>
            <div><small>хватит на</small><b className="ds-num">{Math.round(now.cups)}</b><small>чашек</small></div>
          </div>
          <Cups n={now.cups} />
          <div className="lw-paper">
            <div className="lw-mast">Вестник Инфляции · год {k + 1} из {years.length}</div>
            <div className="lw-head" data-testid="wallet-news"><Inline nodes={year.text} /></div>
            <div className="lw-fore"><Thermometer size={16} aria-hidden="true" />Прогноз: цены за год вырастут на {FORECAST[year.level][0]}–{FORECAST[year.level][1]}%</div>
          </div>
          <RateScale year={year} pi={phase === 'reveal' ? year.pi * ease : null} />
          {phase === 'pick' && (
            <div className="lw-opts" role="group" aria-label="Где держать деньги год">
              {WALLET_OPTIONS.map((o) => {
                const O = WALLET_OPT[o]; const Icon = O.icon;
                return (
                  <button key={o} type="button" className="lw-opt" data-testid="wallet-opt" data-opt={o} onClick={() => pick(o)}>
                    <span className="ic"><Icon size={20} aria-hidden="true" /></span>
                    <span><b>{o === 'deposit' ? `Во вклад под ${year.r}%` : O.title}</b><span className="h">{O.hint(year)}</span></span>
                  </button>
                );
              })}
            </div>
          )}
          {revealed && (
            <div className={`lw-verdict ${choices[k] === year.best ? 'ok' : 'bad'}`} data-testid="wallet-verdict" data-ok={String(choices[k] === year.best)}>
              <div className="lw-verdict-head">
                {choices[k] === year.best ? <><Check size={17} strokeWidth={3} aria-hidden="true" />Лучший выбор в этом году</> : <><X size={17} strokeWidth={3} aria-hidden="true" />Лучше было {OPT_NAME[year.best]}</>}
              </div>
              <div className="lw-verdict-text">
                Цены выросли на {year.pi}%. Вклад: ≈ {year.r} − {year.pi} = {signPct(year.r - year.pi)} реально. Запас теряет только порчу — 3%. Наличные — столько, сколько выросли цены.
              </div>
              <YearBars year={year} picked={choices[k]} />
              <Button wide data-testid="wallet-next" onClick={next} style={{ marginTop: 10 }}>{k + 1 >= years.length ? 'Итоги' : 'Следующий год'}</Button>
            </div>
          )}
        </div>
      )}
      {phase === 'over' && r && (
        <div className="lp-card lp-game-final lw-final" data-testid="game-final">
          <div className="ds-eyebrow">Через {years.length} лет</div>
          <div className="lw-final-num"><b className="ds-num">{r.cups}</b> {plural(r.cups, 'чашка', 'чашки', 'чашек')}<span className="ds-sub"> вместо 100 в начале</span></div>
          {(r.choices || choices).length === years.length && <WalletPathChart years={years} choices={r.choices || choices} />}
          <div className="lw-legend ds-sub"><span className="mine">ваш путь</span><span className="best">лучший выбор</span><span className="cash">всё время наличными</span></div>
          <div className={`lp-verdict${r.right >= WALLET.pass ? ' ok' : ''}`} data-testid="game-verdict" data-ok={String(r.right >= WALLET.pass)}>
            {r.right >= WALLET.pass ? `Игра засчитана: лучший выбор в ${r.right} ${plural(r.right, 'году', 'годах', 'годах')} из ${years.length}` : `Зачёта нет: лучший выбор в ${r.right} ${plural(r.right, 'году', 'годах', 'годах')} из ${years.length} — нужно хотя бы ${WALLET.pass}`}
          </div>
          {r.record && <div className="ds-badge" style={{ marginTop: 6 }} data-testid="game-record">Новый рекорд!</div>}
        </div>
      )}
    </div>
  );
}
/* ------------------------------ КАРТОЧКИ ВИДОВ УРОКОВ ------------------------------ */
const CAST_ICON = { coffee: Coffee, croissant: Croissant, landmark: Landmark, 'scroll-text': ScrollText, graduation: GraduationCap, radio: Radio, feather: Feather };
// причёски: у каждого героя своя
const HAIR = {
  vera: 'M19 27c0-10 6-15 13-15s13 5 13 15c-3-5-8-7-13-7s-10 2-13 7z',
  masha: 'M18 30c-1-12 6-18 14-18s15 6 14 18c-2-6-6-9-9-10-3 3-10 5-19 10z',
  host: 'M17 36c-2-14 5-23 15-23s17 9 15 23c-1-7-4-12-7-14-5 2-12 3-18 4-2 3-4 6-5 10z',
  timur: 'M20 25c0-8 5-12 12-12s12 4 12 12c-2-2-5-4-9-4l-1 3-2-3c-5 0-9 2-12 4z',
};
// портрет героя: лицо, причёска его цвета и значок его дела
export function Portrait({ who, size = 64 }) {
  const clip = `pt-${React.useId().replace(/:/g, '')}`;
  const c = CAST[who];
  if (!c) return null;
  const Icon = CAST_ICON[c.icon] || Coffee;
  // рассказчик — не человек в кадре: вместо лица перо
  if (c.nofs) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0, borderRadius: '50%',
        background: `color-mix(in srgb, ${c.color} 12%, var(--ds-card))`, border: `2px solid ${c.color}`, color: c.color }} data-testid="portrait" data-who={who}>
        <Icon size={size * 0.46} aria-hidden="true" />
      </span>
    );
  }
  /* погрудный портрет в медальоне: плечи уходят за край круга, а не обрываются ровной линией
     посреди него; шея соединяет голову с телом */
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }} data-testid="portrait" data-who={who}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs><clipPath id={clip}><circle cx="32" cy="32" r="30" /></clipPath></defs>
        <circle cx="32" cy="32" r="31" fill={`color-mix(in srgb, ${c.color} 18%, white)`} />
        <g clipPath={`url(#${clip})`}>
          <path d="M28 36h8v9c-1.3 1.2-2.6 1.8-4 1.8s-2.7-.6-4-1.8z" fill="#E9BFA2" />
          <path d="M3 72c0-17 12.5-27.5 29-27.5S61 55 61 72z" fill={c.color} />
          <path d="M26.5 44.8l5.5 5.4 5.5-5.4" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
        <circle cx="32" cy="32" r="31" fill="none" stroke={c.color} strokeWidth="2" />
        <circle cx="32" cy="28" r="12.5" fill="#F6D2B8" />
        <path d={HAIR[who] || 'M20 24c1-7 6-10 12-10s11 3 12 10c-4-3-8-4-12-4s-8 1-12 4z'} fill={c.hair} />
        <circle cx="27.5" cy="29" r="1.6" fill="#3B2A20" /><circle cx="36.5" cy="29" r="1.6" fill="#3B2A20" />
        <path d="M28 34c2.4 2 5.6 2 8 0" stroke="#3B2A20" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.4, height: size * 0.4, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ds-card)' }}>
        <Icon size={size * 0.22} />
      </span>
    </span>
  );
}
export function StoryCard({ card, children }) {
  const c = CAST[card.who];
  return (
    <div data-style="story">
      {c && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Portrait who={card.who} size={64} />
          <div><div className="ds-h3" style={{ fontSize: 19 }}>{c.name}</div><div className="ds-sub" style={{ fontSize: 13.5 }}>{c.role}</div></div>
        </div>
      )}
      <div className="lp-bubble">{children}</div>
    </div>
  );
}

/* «Слова»: колода карточек. На карточке — слово, значение закрыто: сначала вспомнить, потом
   открыть (кнопка, касание карточки или пробел) и отметить «Знаю» или «Ещё раз». «Ещё раз»
   возвращает слово в конец колоды (один раз), «Знаю» — убирает. Можно и смахнуть:
   вправо — «Знаю», влево — «Ещё раз»; на клавиатуре — стрелки. Точки внизу — все слова урока. */
/* «Слова» — знакомство со словами, а не проверка (docs/mechanics.md): каждое слово сразу со
   значением и примером — до этого урока ученик мог его не встречать. Листать — «Дальше» и
   «Назад», стрелками или смахиванием: смахнуть в любую сторону — следующее слово (запоминать
   направление не нужно), вернуться — «Назад»; после последнего — лёгкие упражнения на эти слова. */
// наклон карточки за пальцем или мышью: не больше 4° — вокруг нижнего края, верх не уходит за край экрана
const wordTilt = (dx) => Math.max(-4, Math.min(4, dx / 45));
export function WordDeck({ cards, onDone, body, foot }) {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(() => new Set([0]));
  const [dx, setDx] = useState(0);
  const [dir, setDir] = useState(0); // откуда въезжает новая: 1 — справа, −1 — слева
  const [out, setOut] = useState(null); // уходящая карточка: { idx, side, x0, key }
  /* последняя карточка уходит так же, как остальные, и на её место выезжает карточка «Все слова — ваши»; упражнения — после
     неё (пункт владельца 18.11: «последнюю карточку мотаешь — резко исчезает без анимации, и задания») */
  const [ending, setEnding] = useState(false);
  const outT = useRef(0); const endT = useRef(0);
  const drag = useRef(null);
  const card = cards[idx];
  const last = idx === cards.length - 1;
  useEffect(() => () => { clearTimeout(outT.current); clearTimeout(endT.current); }, []);
  /* from — откуда въезжает новая карточка: «дальше» справа, «назад» слева; старая уходит в другую сторону —
     с того места, где её отпустили (x0). Индекс меняется сразу: быстрые нажатия не теряются. */
  const go = (d, from = d, x0 = 0) => {
    const n = idx + d;
    if (n < 0) return;
    if (ending) return;
    Audio.play('paper'); setDx(0); setDir(from);
    if (n >= cards.length) {
      setEnding(true); setOut({ idx, side: -from, x0, key: Date.now() });
      endT.current = setTimeout(() => onDone(), 1100);
      return;
    }
    clearTimeout(outT.current);
    setOut({ idx, side: -from, x0, key: Date.now() });
    outT.current = setTimeout(() => setOut(null), 340);
    setIdx(n); setSeen((st) => new Set([...st, n]));
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!card) return null;
  /* смахнуть в любую сторону — следующее слово. Карточка едет за пальцем или мышью и чуть наклоняется,
     сверху — «Дальше»; отпустили дальше порога — плавно уезжает в ту же сторону, а новая въезжает с
     другой; не дотянули — пружинит обратно. Назад — кнопкой «Назад» или стрелкой влево. */
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, mouse: e.pointerType === 'mouse' };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* старый браузер */ }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    setDx(e.clientX - drag.current.x);
  };
  const onUp = () => {
    if (!drag.current) return;
    const d = dx; const lim = drag.current.mouse ? 60 : 80; drag.current = null;
    if (Math.abs(d) <= lim) { setDx(0); return; }
    const side = d < 0 ? -1 : 1;
    go(1, -side, d);
  };
  const style = dx ? { transform: `translateX(${dx}px) rotate(${wordTilt(dx)}deg)`, transition: 'none' }
    : dir ? { '--from': `${dir * 60}px`, '--rise': '0px' } : undefined;
  const pull = Math.min(1, Math.abs(dx) / 80);
  const face = (c, i) => (<>
    <div className="lp-word-top">
      <span>Новое слово {i + 1} из {cards.length}</span>
      <span style={{ flex: 1 }} />
      <span className="lp-word-hint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}><span className="touch">смахните ↔</span><span className="fine">← → на клавиатуре</span></span>
    </div>
    <div className="lp-word-term">{c.title}</div>
    <div className="lp-word-rule" />
  </>);
  const prevCard = out && cards[out.idx];
  return (
    <>
      {body(<>
      <div className="lp-deck">
        {!last && <div className="lp-deck-ghost" aria-hidden="true" />}
        {ending ? (
          <div className="lp-word lp-word-end in" key="end" style={{ '--from': `${(dir || 1) * 60}px`, '--rise': '0px' }} data-testid="word-end" role="status">
            <div className="lp-word-top"><span>Слова · {cards.length} из {cards.length}</span></div>
            <div className="lp-word-end-mark" aria-hidden="true">✓</div>
            <div className="lp-word-term">Все слова — ваши</div>
            <div className="lp-word-rule" />
            <div className="lp-word-def"><span>Дальше — упражнения на них: определения из плиток и пары на время.</span></div>
          </div>
        ) : (
        <div className={`lp-word in${dx ? ' drag' : ''}`} key={idx} style={style} data-testid="flash-card" data-word={idx} data-dx={Math.round(dx)}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDragStart={(e) => e.preventDefault()}>
          {dx !== 0 && <span className={`lp-swipe-tag ${dx < 0 ? 'next' : 'prev'}`} style={{ opacity: pull }} aria-hidden="true">{last ? 'К упражнениям' : 'Дальше'}</span>}
          {face(card, idx)}
          <div className="lp-word-def open" data-testid="word-def"><span><Inline nodes={card.text} />{card.example && <span className="lp-word-ex"><b>Пример:</b> <Inline nodes={card.example} /></span>}</span></div>
          {idx === 0 && <div className="lp-word-tip" data-testid="word-tip">Прочитайте и запомните: после слов — пара лёгких упражнений на них.</div>}
        </div>
        )}
        {/* прошлая карточка уходит поверх новой — только картинка, без текста значения (его уже не читают) */}
        {prevCard && (
          <div className="lp-word lp-word-out" key={`out-${out.key}`} aria-hidden="true" inert data-testid="flash-card-out" data-side={out.side}
            style={{ '--x0': `${out.x0}px`, '--r0': `${wordTilt(out.x0)}deg`, '--dir': out.side }}>
            {face(prevCard, out.idx)}
          </div>
        )}
      </div>
      <div className="lp-word-dots" data-testid="word-dots" role="img" aria-label={`Прочитано слов: ${seen.size} из ${cards.length}`}>
        {cards.map((_, i) => <i key={i} className={`${seen.has(i) || ending ? 'know' : ''} ${i === idx && !ending ? 'cur' : ''}${ending ? ' done' : ''}`} style={ending ? { animationDelay: `${i * 50}ms` } : undefined} />)}
      </div>
      </>)}
      {foot(
        <div style={{ display: 'grid', gridTemplateColumns: idx > 0 ? '1fr 2fr' : '1fr', gap: 10 }}>
          {idx > 0 && <Button variant="secondary" onClick={() => go(-1)} data-testid="word-prev">Назад</Button>}
          <Button onClick={() => go(1)} disabled={ending} data-testid="word-next">{last ? 'К упражнениям' : 'Дальше'}</Button>
        </div>,
      )}
    </>
  );
}

/* Калькулятор расчётного упражнения: выражение, результат по ходу набора и «В ответ» —
   результат уходит в поле ответа. Подсказкой не считается: считать в уме никто не просит. */
export function Calculator({ onUse = null, disabled = false, useLabel = 'В ответ' }) {
  const [expr, setExpr] = useState('');
  const v = evalExpr(expr);
  const press = (k) => {
    if (disabled) return;
    Audio.play('tick');
    if (k === 'C') setExpr('');
    else if (k === 'del') setExpr((e) => e.slice(0, -1));
    else if (k === '=') { if (v != null) setExpr(fmtResult(v).replace('−', '-')); }
    else if (k === '√') setExpr((e) => pressRoot(e));
    else setExpr((e) => (e.length < 40 ? e + k : e));
  };
  /* Компактно, чтобы на телефоне задача и калькулятор помещались на один экран: экран в одну
     строку (выражение слева, результат справа), пять колонок клавиш, «стереть» и «очистить» —
     в той же сетке, «В ответ» — в последнем ряду. */
  const KEYS = [['7', '8', '9', '÷', 'del'], ['4', '5', '6', '×', 'C'], ['1', '2', '3', '−', '('], ['0', ',', '^', '+', ')'], ['√', '=']];
  const LABEL = { '÷': 'Разделить', '×': 'Умножить', '−': 'Вычесть', '+': 'Прибавить', '^': 'Степень', '√': 'Квадратный корень', '=': 'Равно', del: 'Стереть символ', C: 'Очистить' };
  return (
    <div className="lp-calc" data-testid="calculator">
      <div className="lp-calc-screen" aria-live="polite">
        <span className="ds-num lp-calc-expr" data-testid="calc-expr">{expr.replace(/-/g, '−') || ' '}</span>
        <span className="ds-num lp-calc-val" data-testid="calc-value">{v != null ? `= ${fmtResult(v)}` : expr ? '…' : '0'}</span>
      </div>
      <div className="lp-calc-keys" role="group" aria-label="Калькулятор">
        {KEYS.flat().map((k) => (
          <button key={k} type="button" className={`ds-key ${'÷×−+^√='.includes(k) ? 'lp-op' : ''}`} disabled={disabled} data-calc={k} aria-label={LABEL[k] || k}
            onClick={() => press(k === '÷' ? '/' : k === '×' ? '*' : k === '−' ? '-' : k)}>{k === 'del' ? <Delete size={18} aria-hidden="true" /> : k}</button>
        ))}
        {onUse && <button type="button" className="ds-btn lp-calc-use" disabled={disabled || v == null} data-testid="calc-use" onClick={() => { Audio.play('click'); onUse(fmtResult(v).replace('−', '-')); }}>{useLabel}</button>}
      </div>
    </div>
  );
}
