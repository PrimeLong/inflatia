/* Торговый терминал (донат-диаграмма портфеля, разбор цены инструмента,
   сам терминал и сводка портфеля), вынесенный из MacroSimulator.jsx в
   отдельный чанк: виден только трейдеру и только на вкладке «Рынок», а
   не сразу при загрузке приложения, поэтому грузится лениво через
   React.lazy() в MacroSimulator.jsx — как и src/tutorial.jsx.

   COLOR/Audio/INSTR_BY_ID/... — те же самые общие объекты/функции, что и
   в MacroSimulator.jsx (экспортированы оттуда), а не копия. */
import { ruNum } from './lib/num.js';
import { plural } from './lib/plural.js';
import { niceStep, ticks } from './lib/plane.js';
import { quarterCandles, tickCandles, pushTick, noteExtreme, seenFor, priceRange, quickAmounts, change, sparkPath } from './lib/candles.js';
import React, { useState, useMemo, Suspense } from 'react';
import { Coins } from 'lucide-react';
import { GOALS, clamp, fmt1, fmt2, fmtSigned1, fmtMoney, mlnScale, fmtMln, fmtMlnSigned, quarterLabel } from './lib/engine.js';
import { COLOR, Audio } from './MacroSimulator.jsx';
import {
  ChartFallback, MemoChart, INSTRUMENTS, INSTR_BY_ID, GOV_BOND_INVESTOR_SHARE,
  MAINTENANCE, BORROW_FEE, bookParts, impliedVol, optionValue, priceOf, useLiveQuotes,
} from './game.jsx';

/* Эталоны сравнения: индекс, облигации, депозит и просто сохранённая покупательная способность */
const BENCHMARKS = [
  { id: 'stock', label: 'Индекс акций', key: 'stockIndex', color: COLOR.gold },
  { id: 'bond', label: 'Гособлигации', key: 'bondIndex', color: COLOR.blue },
  { id: 'dep', label: 'Депозит', key: 'depositIndex', color: COLOR.teal },
  { id: 'infl', label: 'Инфляция (сохранение покупательной способности)', key: 'priceLevel', color: COLOR.rust },
];
/* Отраслевая принадлежность позиций — для круговой диаграммы портфеля */
const SECTOR_OF = {
  eq_broad: 'Рынок целиком', eq_banks: 'Банки', eq_industry: 'Промышленность',
  eq_consumer: 'Потребительский сектор', eq_resources: 'Сырьевой сектор', reit: 'Недвижимость',
  eq_world: 'Мировые акции',
  bond_gov: 'Госдолг', bond_short: 'Госдолг', bond_linker: 'Линкеры', bond_corp: 'Корпоративный долг',
  dep: 'Депозит', mm: 'Денежный рынок', fx: 'Валюта', gold: 'Товары',
  fut_idx: 'Плечо: индекс', fut_fx: 'Плечо: валюта', fut_bond: 'Плечо: долг', fut_cmd: 'Плечо: сырьё',
};

function AllocationDonut({ rows, size = 124, thickness = 16 }) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!(total > 0)) return null;
  const c = size / 2; const rad = c - thickness / 2; const CIRC = 2 * Math.PI * rad;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={c} cy={c} r={rad} fill="none" stroke={COLOR.hairline} strokeWidth={thickness} />
      {rows.map((row) => {
        const frac = row.value / total; const off = acc; acc += frac;
        return (
          <circle key={row.label} cx={c} cy={c} r={rad} fill="none" stroke={row.color}
            strokeWidth={thickness} strokeLinecap="butt" opacity={row.short ? 0.5 : 1}
            strokeDasharray={`${Math.max(0.5, frac * CIRC - 1.5)} ${CIRC}`}
            strokeDashoffset={-off * CIRC} transform={`rotate(-90 ${c} ${c})`} />
        );
      })}
      <text x={c} y={c - 3} textAnchor="middle" fontSize={9} fill={COLOR.muted}>ЭКСПОЗИЦИЯ</text>
      <text x={c} y={c + 12} textAnchor="middle" fontSize={13} fill={COLOR.text}>{fmtMln(total)}</text>
    </svg>
  );
}
function benchValues(book, economy) {
  // benchStart обычно проставляется в settleQuarter при первом переходе
  // квартала — но до этого момента (весь первый квартал партии) книга его
  // ещё не имеет, а не «нет данных»: значит, отсчёт эталонов = сейчас, и
  // все они совпадают со стартовым капиталом, а не пропадают из интерфейса
  const start = book.benchStart || { stockIndex: economy.stockIndex, bondIndex: economy.bondIndex,
    depositIndex: economy.depositIndex, priceLevel: economy.priceLevel };
  const out = {};
  BENCHMARKS.forEach((b) => { out[b.id] = (book.startValue || 10) * economy[b.key] / start[b.key]; });
  return out;
}

/* ---------------- ТЕРМИНАЛ ЧАСТНОГО ИНВЕСТОРА (docs/mechanics.md, «Терминал частного инвестора») ----------------
   Пункт владельца 16.11, вечер: «сделай интерфейс частного инвестора не хуже, чем на фото — не один в один, современно,
   приятно». Тёмная торговая панель в любой теме: бегущая строка котировок, карточки счёта, слева — список инструментов
   со спарклайнами, в центре — свечной график с периодами («Сейчас», «2 года», «5 лет», «Всё») и карточки инструмента,
   справа — заявка: «Купить» / «Продать», сумма с быстрыми кнопками и «Макс», итог сделки, позиция и журнал; внизу —
   строка состояния. Ширину раскладка берёт у самого терминала (container queries): в обучении он уже, чем на «Рынке». */
const TT_CSS = `
  .tt { --tt-bg: #0A0E13; --tt-panel: #10151C; --tt-card: #151B24; --tt-card2: #1B2330; --tt-line: #222B37; --tt-line2: #2C3746;
    --tt-ink: #E9EEF4; --tt-ink2: #A2AEBD; --tt-ink3: #6B7787; --tt-up: #26C281; --tt-down: #F0546A; --tt-acc: #F2B84B; --tt-blue: #5EA2FF;
    container: tt / inline-size; position: relative; background: var(--tt-bg); color: var(--tt-ink); border-radius: 16px; overflow: hidden;
    border: 1px solid var(--tt-line); box-shadow: 0 18px 40px -24px rgba(0,0,0,.55); font-size: 13px; line-height: 1.4; }
  .tt button { font: inherit; color: inherit; }
  .tt .num, .tt-mono { font-family: var(--ds-mono, 'PT Mono', monospace); font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .tt-up { color: var(--tt-up); } .tt-down { color: var(--tt-down); } .tt-flat { color: var(--tt-ink3); }
  /* бегущая строка */
  .tt-tape { display: flex; overflow: hidden; border-bottom: 1px solid var(--tt-line); background: #070A0E; height: 34px; align-items: center;
    -webkit-mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
  .tt-tape-in { display: flex; flex: none; gap: 26px; padding-right: 26px; animation: tt-tape 60s linear infinite; }
  .tt-tape:hover .tt-tape-in { animation-play-state: paused; }
  @keyframes tt-tape { to { transform: translateX(-100%); } }
  .tt-tick { display: inline-flex; align-items: baseline; gap: 7px; border: 0; background: none; padding: 0; cursor: pointer; white-space: nowrap; font-size: 12.5px; }
  .tt-tick b { font-weight: 700; color: var(--tt-ink2); } .tt-tick:hover b { color: var(--tt-ink); }
  /* карточки счёта */
  .tt-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; padding: 12px; border-bottom: 1px solid var(--tt-line); }
  .tt-stat { background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 12px; padding: 10px 12px; min-width: 0; }
  .tt-stat > span { display: block; font-size: 11.5px; color: var(--tt-ink3); text-transform: uppercase; letter-spacing: .06em; }
  .tt-stat > b { display: block; font-size: 18px; font-weight: 700; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tt-stat > small { display: block; font-size: 12px; margin-top: 1px; }
  .tt-meter { height: 6px; border-radius: 3px; background: var(--tt-line2); overflow: hidden; margin-top: 8px; }
  .tt-meter i { display: block; height: 100%; border-radius: 3px; transition: width .4s ease; }
  .tt-alert { margin: 0 12px 12px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; border: 1px solid; }
  .tt-alert.warn { background: rgba(242,184,75,.08); border-color: rgba(242,184,75,.35); color: #F6CF7E; }
  .tt-alert.bad { background: rgba(240,84,106,.1); border-color: rgba(240,84,106,.4); color: #FF8C9C; }
  /* раскладка */
  .tt-grid { display: grid; grid-template-columns: minmax(0, 1fr); }
  .tt-grid > * { min-width: 0; }
  .tt-list { border-bottom: 1px solid var(--tt-line); background: var(--tt-panel); display: flex; flex-direction: column; max-height: 360px; }
  .tt-main { padding: 14px; border-bottom: 1px solid var(--tt-line); }
  .tt-order { padding: 14px; background: var(--tt-panel); display: flex; flex-direction: column; gap: 12px; }
  @container tt (min-width: 760px) {
    .tt-stats { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .tt-grid { grid-template-columns: 270px minmax(0, 1fr); grid-template-areas: "list main" "list order"; }
    /* список не растягивает терминал: высоту ряда задают график и заявка, список прокручивается внутри */
    .tt-list { grid-area: list; max-height: none; height: 0; min-height: 100%; border-bottom: 0; border-right: 1px solid var(--tt-line); }
    .tt-main { grid-area: main; } .tt-order { grid-area: order; }
  }
  @container tt (min-width: 1120px) {
    .tt-grid { grid-template-columns: 300px minmax(0, 1fr) 330px; grid-template-areas: "list main order"; }
    .tt-main { border-bottom: 0; } .tt-order { border-left: 1px solid var(--tt-line); }
  }
  @container tt (max-width: 620px) { .tt-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tt-stats > :last-child { grid-column: 1 / -1; } .tt-stat > b { font-size: 16px; } }
  /* список инструментов */
  .tt-find { padding: 12px 12px 8px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--tt-line); }
  .tt-search { display: flex; gap: 6px; }
  .tt-search input { flex: 1; min-width: 0; background: var(--tt-card); border: 1px solid var(--tt-line2); border-radius: 10px; color: var(--tt-ink); padding: 8px 10px; font: inherit; outline: none; }
  .tt-search input:focus { border-color: var(--tt-blue); box-shadow: 0 0 0 3px rgba(94,162,255,.18); }
  .tt-search input::placeholder { color: var(--tt-ink3); }
  .tt-chips { display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none; }
  .tt-chip { flex: none; border: 1px solid var(--tt-line2); background: transparent; border-radius: 999px; padding: 4px 10px; font-size: 12px !important; color: var(--tt-ink2) !important; cursor: pointer; white-space: nowrap; }
  .tt-chip:hover { border-color: var(--tt-ink3); color: var(--tt-ink) !important; }
  .tt-chip[aria-pressed="true"] { background: var(--tt-ink); border-color: var(--tt-ink); color: var(--tt-bg) !important; font-weight: 700; }
  .tt-rows { overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: var(--tt-line2) transparent; }
  .tt-grp { padding: 10px 14px 4px; font-size: 11px; letter-spacing: .1em; color: var(--tt-ink3); text-transform: uppercase; }
  .tt-row { display: grid; grid-template-columns: 30px minmax(0, 1fr) 44px 72px; align-items: center; gap: 9px; width: 100%; padding: 8px 12px; border: 0; border-left: 2px solid transparent;
    background: none; text-align: left; cursor: pointer; transition: background .15s; }
  .tt-row:hover { background: var(--tt-card); }
  .tt-row[aria-selected="true"] { background: var(--tt-card2); border-left-color: var(--tt-acc); }
  .tt-row .nm { min-width: 0; } .tt-row .nm b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tt-row .nm small { display: block; font-size: 11.5px; color: var(--tt-ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tt-row .px { text-align: right; } .tt-row .px b { display: block; font-size: 13px; font-weight: 700; } .tt-row .px small { font-size: 11.5px; }
  .tt-badge { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font: 700 9.5px var(--ds-mono, monospace); letter-spacing: -.02em;
    color: color-mix(in srgb, var(--c) 35%, #fff); background: color-mix(in srgb, var(--c) 26%, #0A0E13); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--c) 60%, transparent); }
  .tt-badge.big { width: 46px; height: 46px; font-size: 12px; }
  .tt-spark path { fill: none; stroke-width: 1.5; stroke-linejoin: round; }
  .tt-empty { padding: 16px 14px; color: var(--tt-ink3); font-size: 12.5px; }
  /* выбранный инструмент */
  .tt-head { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .tt-head .ttl { flex: 1; min-width: 180px; } .tt-head .ttl b { font-size: 18px; font-weight: 700; display: block; }
  .tt-head .ttl small { color: var(--tt-ink3); font-size: 12.5px; display: block; margin-top: 1px; }
  .tt-price { text-align: right; } .tt-price b { display: block; font-size: 28px; font-weight: 700; line-height: 1.1; transition: color .45s; }
  .tt-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-top: 4px; }
  .tt-pill.tt-up { background: rgba(38,194,129,.14); } .tt-pill.tt-down { background: rgba(240,84,106,.14); } .tt-pill.tt-flat { background: var(--tt-card2); }
  .tt-note { color: var(--tt-ink2); font-size: 12.5px; margin: 8px 0 0; }
  .tt-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
  @container tt (max-width: 520px) { .tt-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .tt-card { background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 10px; padding: 8px 10px; min-width: 0; }
  .tt-card span { display: block; font-size: 11px; color: var(--tt-ink3); text-transform: uppercase; letter-spacing: .06em; }
  .tt-card b { display: block; font-size: 14px; font-weight: 700; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tt-tools { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .tt-seg { display: inline-flex; background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 10px; padding: 3px; gap: 2px; }
  .tt-seg button { border: 0; background: none; border-radius: 7px; padding: 4px 10px; font-size: 12.5px !important; color: var(--tt-ink2) !important; cursor: pointer; white-space: nowrap; }
  .tt-seg button:hover { color: var(--tt-ink) !important; }
  .tt-seg button[aria-pressed="true"] { background: var(--tt-card2); color: var(--tt-ink) !important; font-weight: 700; box-shadow: 0 1px 0 rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.4); }
  .tt-live { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--tt-up); margin-right: 5px; box-shadow: 0 0 0 0 rgba(38,194,129,.6); animation: tt-pulse 1.6s infinite; vertical-align: 1px; }
  @keyframes tt-pulse { 70% { box-shadow: 0 0 0 7px rgba(38,194,129,0); } 100% { box-shadow: 0 0 0 0 rgba(38,194,129,0); } }
  .tt-chart { position: relative; background: linear-gradient(180deg, #0D1219, #0A0E13); border: 1px solid var(--tt-line); border-radius: 12px; overflow: hidden; touch-action: pan-y; }
  .tt-chart svg { display: block; width: 100%; }
  .tt-read { position: absolute; left: 10px; top: 8px; font-size: 11.5px; color: var(--tt-ink2); pointer-events: none; display: flex; gap: 9px; flex-wrap: wrap; }
  .tt-read b { color: var(--tt-ink); font-weight: 700; }
  .tt-legend { color: var(--tt-ink3); font-size: 12px; margin-top: 6px; }
  .tt-primer { margin-top: 12px; font-size: 12.5px; background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 12px; padding: 10px 12px; }
  .tt-primer > b { display: block; color: var(--tt-acc); margin-bottom: 5px; font-size: 12.5px; }
  .tt-primer .r { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; } .tt-primer .r > span:first-child { color: var(--tt-ink2); }
  .tt-primer p { color: var(--tt-ink3); margin: 6px 0 0; } .tt-primer p b { color: var(--tt-ink2); display: inline; margin: 0; font-size: inherit; }
  /* заявка */
  .tt-side { display: grid; grid-template-columns: 1fr 1fr; background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 12px; padding: 4px; gap: 4px; }
  .tt-side button { border: 0; border-radius: 9px; padding: 9px 6px; background: none; cursor: pointer; font-weight: 700 !important; color: var(--tt-ink2) !important; line-height: 1.15; }
  .tt-side button small { display: block; font-weight: 400; font-size: 11px; opacity: .75; }
  .tt-side button[aria-pressed="true"][data-side="buy"] { background: var(--tt-up); color: #04130C !important; }
  .tt-side button[aria-pressed="true"][data-side="sell"] { background: var(--tt-down); color: #1A0408 !important; }
  .tt-lbl { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; color: var(--tt-ink3); margin-bottom: 6px; }
  .tt-amt { display: flex; align-items: center; background: var(--tt-card); border: 1px solid var(--tt-line2); border-radius: 12px; padding: 4px 12px; }
  .tt-amt:focus-within { border-color: var(--tt-blue); box-shadow: 0 0 0 3px rgba(94,162,255,.18); }
  .tt-amt input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: var(--tt-ink); font: 700 22px var(--ds-mono, monospace); padding: 6px 0; }
  .tt-amt input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .tt-amt span { color: var(--tt-ink3); font-size: 13px; }
  .tt-quick { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin-top: 8px; }
  .tt-quick button { border: 1px solid var(--tt-line2); background: var(--tt-card); border-radius: 8px; padding: 6px 0; font-size: 12px !important; color: var(--tt-ink2) !important; cursor: pointer; white-space: nowrap; }
  .tt-quick button:hover { border-color: var(--tt-ink3); color: var(--tt-ink) !important; }
  .tt-quick button.max { color: var(--tt-acc) !important; border-color: rgba(242,184,75,.4); }
  .tt-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; margin: 12px 0 2px; outline: none;
    background: linear-gradient(90deg, var(--fill) 0 var(--p), var(--tt-line2) var(--p) 100%); }
  .tt-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--tt-ink); border: 3px solid var(--fill); cursor: pointer; }
  .tt-range::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--tt-ink); border: 3px solid var(--fill); cursor: pointer; }
  .tt-margin { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--tt-ink3); }
  .tt-switch { flex: none; width: 34px; height: 20px; border-radius: 999px; border: 0; background: var(--tt-line2); position: relative; cursor: pointer; padding: 0; }
  .tt-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--tt-ink2); transition: transform .2s, background .2s; }
  .tt-switch[aria-checked="true"] { background: var(--tt-down); } .tt-switch[aria-checked="true"]::after { transform: translateX(14px); background: #fff; }
  .tt-sum { background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 12px; padding: 8px 12px; font-size: 12.5px; }
  .tt-sum .r { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; } .tt-sum .r > span:first-child { color: var(--tt-ink3); }
  .tt-sum p { margin: 6px 0 0; font-size: 12px; color: var(--tt-ink3); }
  .tt-go { width: 100%; border: 0; border-radius: 12px; padding: 13px 0; font-weight: 700 !important; font-size: 15px !important; cursor: pointer; transition: transform .1s, filter .15s; }
  .tt-go[data-side="buy"] { background: var(--tt-up); color: #04130C !important; } .tt-go[data-side="sell"] { background: var(--tt-down); color: #1A0408 !important; }
  .tt-go:hover:not(:disabled) { filter: brightness(1.08); } .tt-go:active:not(:disabled) { transform: scale(.98); }
  .tt-go:disabled { background: var(--tt-card2); color: var(--tt-ink3) !important; cursor: default; }
  .tt-close { width: 100%; border: 1px solid var(--tt-line2); background: none; border-radius: 12px; padding: 9px 0; cursor: pointer; color: var(--tt-ink2) !important; }
  .tt-close:hover { border-color: var(--tt-ink3); color: var(--tt-ink) !important; }
  .tt-box { background: var(--tt-card); border: 1px solid var(--tt-line); border-radius: 12px; padding: 10px 12px; }
  .tt-box > b { display: flex; justify-content: space-between; font-size: 12px; color: var(--tt-ink3); text-transform: uppercase; letter-spacing: .06em; font-weight: 700; margin-bottom: 6px; }
  .tt-pos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
  .tt-pos span { display: block; font-size: 11.5px; color: var(--tt-ink3); } .tt-pos strong { display: block; font-size: 14px; }
  .tt-log { max-height: 150px; overflow-y: auto; font-size: 12px; scrollbar-width: thin; scrollbar-color: var(--tt-line2) transparent; }
  .tt-log .q { color: var(--tt-ink3); font-size: 11px; letter-spacing: .08em; padding: 5px 0 2px; }
  .tt-log .t { display: grid; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 8px; padding: 2px 0; color: var(--tt-ink2); }
  .tt-log .t span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* строка состояния */
  .tt-status { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; padding: 8px 14px; border-top: 1px solid var(--tt-line); background: #070A0E; font-size: 12px; color: var(--tt-ink3); }
  .tt-status b { color: var(--tt-ink2); font-weight: 700; }
  .tt-flash-up { animation: tt-fu .7s ease-out; } .tt-flash-down { animation: tt-fd .7s ease-out; }
  @keyframes tt-fu { from { background: rgba(38,194,129,.22); } } @keyframes tt-fd { from { background: rgba(240,84,106,.22); } }
  @media (prefers-reduced-motion: reduce) { .tt-tape-in, .tt-live, .tt-flash-up, .tt-flash-down { animation: none !important; } .tt-tape { overflow-x: auto; } }
`;
// координата SVG — до десятых (не число на экран)
const c1 = (v) => Math.round(v * 10) / 10;
const tone = (d) => (d > 0 ? 'tt-up' : d < 0 ? 'tt-down' : 'tt-flat');
const arrow = (d) => (d > 0 ? '▲' : d < 0 ? '▼' : '•');

function Spark({ values, w = 52, h = 22 }) {
  const d = sparkPath(values, w, h);
  const vs = (values || []).filter(Number.isFinite);
  const dir = vs.length > 1 ? Math.sign(vs[vs.length - 1] - vs[0]) : 0;
  return (
    <svg className="tt-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {d && <path d={d} stroke={dir > 0 ? 'var(--tt-up)' : dir < 0 ? 'var(--tt-down)' : 'var(--tt-ink3)'} />}
    </svg>
  );
}

// цена, которая вспыхивает зелёным или красным при изменении
function FlashPrice({ value, dec = 2, className = '', testid }) {
  const prev = React.useRef(value);
  const [dir, setDir] = useState(0);
  React.useEffect(() => {
    const d = value > prev.current + 1e-9 ? 1 : value < prev.current - 1e-9 ? -1 : 0;
    prev.current = value;
    if (!d) return undefined;
    setDir(d); const t = setTimeout(() => setDir(0), 700);
    return () => clearTimeout(t);
  }, [value]);
  return <b className={`num ${className} ${dir > 0 ? 'tt-up' : dir < 0 ? 'tt-down' : ''}`} data-testid={testid}>{Number.isFinite(value) ? ruNum(value, dec) : '—'}</b>;
}

/* свечной график: ось цен справа, сетка, последняя цена — линия с ярлыком, средняя цена входа — пунктир,
   сделки — треугольники B/S, перекрестие с ценами открытия, максимума, минимума и закрытия */
function CandleChart({ candles, mode, avg, marks, bench, height = 300, unitLabel }) {
  const box = React.useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);
  React.useEffect(() => {
    const el = box.current; if (!el) return undefined;
    const set = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect();
  }, []);
  const AX = 64; const T = 30; const B = 24; const H = height;
  const plotW = w - AX - 8; const plotH = H - T - B;
  const r = priceRange(candles, [avg, ...(bench || [])]);
  const y = (v) => T + (1 - (v - r.min) / (r.max - r.min)) * plotH;
  const n = Math.max(candles.length, 12);
  const step = plotW / n;
  const x = (i) => 8 + step * (i + 0.5) + (n - candles.length) * step;
  const bw = Math.max(2, Math.min(16, step * 0.62));
  const gStep = niceStep(r.max - r.min, plotH, 52);
  const grid = ticks(r.min, r.max, gStep);
  const dec = gStep >= 1 ? 0 : gStep >= 0.1 ? 1 : 2;
  const last = candles[candles.length - 1];
  const lastDir = last ? Math.sign(last.c - last.o) : 0;
  const lineD = candles.map((k, i) => `${i ? 'L' : 'M'}${c1(x(i))} ${c1(y(k.c))}`).join(' ');
  const benchD = bench ? bench.map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(bench[i - 1]) ? 'L' : 'M'}${c1(x(i))} ${c1(y(v))}` : '')).join(' ') : '';
  const labEvery = Math.max(1, Math.ceil(candles.length / Math.max(2, Math.floor(plotW / 70))));
  const pick = (e) => {
    const rect = box.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px - 8 - (n - candles.length) * step) / step - 0.5);
    setHover(i >= 0 && i < candles.length ? i : null);
  };
  const hk = hover != null ? candles[hover] : last;
  const up = 'var(--tt-up)'; const down = 'var(--tt-down)';
  return (
    <div className="tt-chart" ref={box} data-testid="tt-chart" data-candles={candles.length} data-mode={mode}
      onPointerMove={pick} onPointerLeave={() => setHover(null)}>
      {hk && (
        <div className="tt-read num" data-testid="tt-read">
          {hk.label && <span>{hk.label}</span>}
          <span>О <b>{ruNum(hk.o, 2)}</b></span><span>М <b>{ruNum(hk.h, 2)}</b></span><span>Н <b>{ruNum(hk.l, 2)}</b></span>
          <span>З <b className={tone(Math.sign(hk.c - hk.o))}>{ruNum(hk.c, 2)}</b></span>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${H}`} height={H} role="img" aria-label={`График цены${unitLabel ? `: ${unitLabel}` : ''}, ${candles.length} ${plural(candles.length, 'свеча', 'свечи', 'свечей')}`}>
        <defs>
          <linearGradient id="tt-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={lastDir >= 0 ? '#26C281' : '#F0546A'} stopOpacity=".28" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
        </defs>
        {grid.map((g) => (
          <g key={g}>
            <line x1={8} x2={w - AX} y1={y(g)} y2={y(g)} stroke="#1A222C" strokeWidth={1} />
            <text x={w - AX + 8} y={y(g) + 4} fontSize={11} fill="#6B7787" className="tt-mono">{ruNum(g, dec)}</text>
          </g>
        ))}
        {candles.map((k, i) => (i % labEvery === 0 && k.label && !k.open ? <text key={`l${i}`} x={x(i)} y={H - 7} fontSize={10.5} fill="#6B7787" textAnchor="middle">{k.label}</text> : null))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T - 6} y2={H - B} stroke="#3A4656" strokeDasharray="3 3" />}
        {benchD && <path d={benchD} fill="none" stroke="#8C98A8" strokeWidth={1.4} strokeDasharray="5 4" data-testid="tt-bench" />}
        {mode === 'line' ? (
          <>
            <path d={`${lineD} L${c1(x(candles.length - 1))} ${H - B} L${c1(x(0))} ${H - B} Z`} fill="url(#tt-area)" />
            <path d={lineD} fill="none" stroke={lastDir >= 0 ? up : down} strokeWidth={2} strokeLinejoin="round" />
          </>
        ) : candles.map((k, i) => {
          const d = k.c >= k.o; const c = d ? up : down;
          const top = y(Math.max(k.o, k.c)); const hgt = Math.max(1.5, Math.abs(y(k.o) - y(k.c)));
          return (
            <g key={i} data-testid="tt-candle" data-dir={d ? 'up' : 'down'} opacity={k.open ? 0.85 : 1}>
              <line x1={x(i)} x2={x(i)} y1={y(k.h)} y2={y(k.l)} stroke={c} strokeWidth={1.2} />
              <rect x={x(i) - bw / 2} y={top} width={bw} height={hgt} rx={1.5} fill={c} />
            </g>
          );
        })}
        {Number.isFinite(avg) && (
          <g data-testid="tt-avg">
            <line x1={8} x2={w - AX} y1={y(avg)} y2={y(avg)} stroke="#F2B84B" strokeDasharray="6 4" strokeWidth={1.2} />
            <text x={12} y={y(avg) - 5} fontSize={11} fill="#F2B84B">ваша средняя {ruNum(avg, 2)}</text>
          </g>
        )}
        {(marks || []).map((m, j) => (m.idx >= 0 && m.idx < candles.length ? (
          <g key={`m${j}`} data-testid="tt-mark" data-side={m.side}>
            <path d={m.side === 'buy' ? `M${x(m.idx)} ${y(candles[m.idx].l) + 6} l5 8 h-10 Z` : `M${x(m.idx)} ${y(candles[m.idx].h) - 6} l5 -8 h-10 Z`} fill={m.side === 'buy' ? up : down} />
          </g>
        ) : null))}
        {last && (
          <g>
            <line x1={8} x2={w - AX} y1={y(last.c)} y2={y(last.c)} stroke={lastDir >= 0 ? up : down} strokeDasharray="2 3" strokeWidth={1} opacity={0.8} />
            <rect x={w - AX + 2} y={y(last.c) - 10} width={AX - 6} height={20} rx={5} fill={lastDir >= 0 ? '#26C281' : '#F0546A'} />
            <text x={w - AX + 2 + (AX - 6) / 2} y={y(last.c) + 4} fontSize={11.5} fontWeight={700} fill="#06100B" textAnchor="middle" className="tt-mono">{ruNum(last.c, last.c >= 1000 ? 0 : 2)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function InstrumentPrimer({ instr, economy, prev, amt }) {
  const Row = ({ k, v, t }) => <div className="r"><span>{k}</span><span className={`num ${t || ''}`} style={{ textAlign: 'right' }}>{v}</span></div>;
  if (instr.kind === 'fut') {
    const m = Math.max(0.01, amt);
    return (
      <div className="tt-primer" data-testid="tt-primer">
        <b>Как считается фьючерс</b>
        <Row k="Вы вносите (гарантийное обеспечение)" v={fmtMln(m)} />
        <Row k={`Работает позиция размером (×${instr.lev})`} v={fmtMln(m * instr.lev)} />
        <Row k="Движение цены на 1%" v={`± ${fmtMln(m * instr.lev * 0.01)} = ${instr.lev}% вашего ГО`} />
        <Row k="Убыток съедает ГО полностью при" v={`падении на ${ruNum(100 / instr.lev, 1)}%`} t="tt-down" />
        <p>Прибыль и убыток считаются от всей позиции, а не от внесённых денег, и живут в строке «Прибыль» — на счёт они попадают
          только когда вы нажмёте «Закрыть». Продажа при нулевой позиции открывает шорт: заработок на падении.</p>
      </div>
    );
  }
  if (instr.id === 'bond_gov' || instr.id === 'bond_corp') {
    const corp = instr.id === 'bond_corp';
    const yv = corp ? economy.corpYield : economy.yield10y;
    const yPrev = prev ? (corp ? prev.corpYield : prev.yield10y) : yv;
    const dur = corp ? 4.1 : 7.4;
    const coupon = yv / 4; const reval = -dur * (yv - yPrev);
    const total = Number.isFinite(corp ? economy.corpReturn : economy.bondReturn) ? (corp ? economy.corpReturn : economy.bondReturn) : coupon + reval;
    return (
      <div className="tt-primer" data-testid="tt-primer">
        <b>Откуда берётся результат</b>
        <Row k={`Купон за квартал (доходность ${fmt2(yv)}% ÷ 4)`} v={`+${fmt2(coupon)}%`} t="tt-up" />
        <Row k={`Переоценка (дюрация ${dur} × изменение доходности)`} v={`${fmtSigned1(reval)}%`} t={reval >= 0 ? 'tt-up' : 'tt-down'} />
        <Row k="Итого за прошлый квартал" v={`${fmtSigned1(total)}%`} t={total >= 0 ? 'tt-up' : 'tt-down'} />
        <p>Это индекс постоянной дюрации, а не одна бумага: он <b>не гасится</b>, и купон <b>не приходит отдельной выплатой</b> — он
          уже внутри цены и сразу реинвестируется. Позиция закрывается только вашей продажей. Доходность вверх — цена вниз.</p>
      </div>
    );
  }
  return null;
}

const TIMEFRAMES = [['live', 'Сейчас'], ['2y', '2 года'], ['5y', '5 лет'], ['all', 'Всё']];
const TF_SPAN = { '2y': 8, '5y': 20, all: Infinity };

export function TradingTerminal({ economy, prev, book, onTrade, history }) {
  const live = useLiveQuotes(economy);
  const [sel, setSel] = useState('eq_broad');
  const [activeGroup, setActiveGroup] = useState('all');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState(1);
  const [useMargin, setUseMargin] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState('group');
  const [tf, setTf] = useState('live');
  const [chartMode, setChartMode] = useState('candle');
  const [showBench, setShowBench] = useState(false);
  // живые котировки, которые терминал видел: лента на каждый ключ цены и экстремумы идущего квартала (src/lib/candles.js)
  const tape = React.useRef({}); const seen = React.useRef({});
  const parts = bookParts(book, economy, live);
  const equity = book.cash + parts.spot + parts.futPnl + parts.optVal;
  const lvl = parts.gross > 0.01 ? equity / parts.gross : 9;
  const freeRisk = Math.max(0, equity / MAINTENANCE - parts.gross);
  const instr = INSTR_BY_ID[sel];
  const price = priceOf(instr, economy, live);
  const held = book.pos[sel] || 0;
  const heldValue = held * price / 1000;
  const avg = book.avg[sel];
  const lots = (book.opts || []).filter((l) => l.instr === sel);
  const vol = impliedVol(economy);
  const lotsValue = lots.reduce((a, l) => a + optionValue(l.type, price, l.strike, vol, l.left) * l.qty / 1000, 0);
  const unreal = instr.kind === 'opt' ? lotsValue - lots.reduce((a, l) => a + l.premium * l.qty / 1000, 0)
    : held !== 0 && avg ? held * (price - avg) / 1000 : 0;
  let maxBuy = instr.kind === 'fut' ? Math.max(0, freeRisk / (instr.lev || 1))
    : instr.kind === 'opt' ? Math.max(0, book.cash)
      : useMargin ? Math.max(0, Math.min(book.cash + Math.max(0, equity * 0.6), freeRisk)) : Math.max(0, book.cash);
  // гособлигации существуют в конечном количестве — весь госдолг разом. Один
  // инвестор не может выкупить в него больше разумной доли рынка, иначе
  // «купить гособлигаций» превращается в «купить сколько угодно денег из
  // ниоткуда». Фьючерс на облигации — расчётный дериватив, а не сама бумага,
  // поэтому его это ограничение не касается.
  const govBondRoom = instr.id === 'bond_gov'
    ? Math.max(0, (economy.govDebt || 0) * 1000 * GOV_BOND_INVESTOR_SHARE - Math.max(0, heldValue))
    : Infinity;
  if (instr.id === 'bond_gov') maxBuy = Math.min(maxBuy, govBondRoom);
  const maxSell = instr.kind === 'opt' ? lotsValue
    : instr.kind === 'fut' ? Math.max(0, freeRisk / (instr.lev || 1))
      : Math.max(0, heldValue) + (useMargin ? Math.max(0, Math.min(equity * 0.5, freeRisk)) : 0);
  const maxAmount = side === 'buy' ? maxBuy : maxSell;
  const amt = clamp(amount, 0, maxAmount);
  const chg = prev && prev[instr.key] ? (economy[instr.key] / prev[instr.key] - 1) * 100 : 0;
  // одна таблица «как на бирже»: цена, изменение, позиция и результат по каждой
  // строке считаются в одном месте — и для сортировки, и для отрисовки
  const rows = useMemo(() => INSTRUMENTS.map((i) => {
    const pr = priceOf(i, economy, live);
    const q = book.pos[i.id] || 0;
    const myLots = (book.opts || []).filter((l) => l.instr === i.id);
    const value = i.kind === 'opt'
      ? myLots.reduce((a, l) => a + optionValue(l.type, pr, l.strike, vol, l.left) * l.qty / 1000, 0)
      : i.kind === 'fut' ? Math.abs(q) * pr / 1000 : q * pr / 1000;
    const avgP = book.avg[i.id];
    const pnl = i.kind === 'opt'
      ? value - myLots.reduce((a, l) => a + l.premium * l.qty / 1000, 0)
      : (q !== 0 && avgP) ? q * (pr - avgP) / 1000 : 0;
    const chgQ = prev && prev[i.key] ? (economy[i.key] / prev[i.key] - 1) * 100 : 0;
    return { i, pr, q, myLots, value, pnl, chgQ, has: Math.abs(q) > 0.001 || myLots.length > 0 };
  }), [economy, live, book, prev, vol]);
  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const out = rows.filter((r) => (activeGroup === 'all' || r.i.group === activeGroup)
      && (!onlyMine || r.has)
      && (!term || r.i.name.toLowerCase().includes(term) || r.i.ticker.toLowerCase().includes(term)));
    if (sortBy === 'chg') return [...out].sort((a, b) => b.chgQ - a.chgQ);
    if (sortBy === 'pnl') return [...out].sort((a, b) => b.pnl - a.pnl);
    return out;
  }, [rows, activeGroup, onlyMine, query, sortBy]);
  const openCount = rows.filter((r) => r.has).length;
  // «Движение квартала»: три лидера и три аутсайдера среди спот-инструментов —
  // производные повторяют базовый актив и в этой строке были бы дублями
  const movers = useMemo(() => {
    const spot = rows.filter((r) => r.i.kind === 'spot' && Math.abs(r.chgQ) > 0.05).sort((a, b) => b.chgQ - a.chgQ);
    if (spot.length < 2) return [];
    return [...spot.slice(0, 3), ...spot.slice(-3).filter((r) => !spot.slice(0, 3).includes(r)).reverse()];
  }, [rows]);
  const premium = instr.kind === 'opt' ? optionValue(instr.optType, price, price, vol, instr.life) : 0;
  const qty = instr.kind === 'opt' ? (premium > 0 ? amt * 1000 / (premium * (1 + instr.fee)) : 0)
    : amt * (instr.lev || 1) * 1000 / price;
  const willShort = instr.kind !== 'opt' && side === 'sell' && amt > Math.max(0, heldValue) + 1e-9;
  const setPct = (p) => { Audio.play('tick'); setAmount(Math.round(maxAmount * p * 100) / 100); };
  const posLabel = (i, q) => {
    if (i.kind === 'opt') return lots.length ? `${lots.length} серии` : '—';
    if (!q) return '—';
    return `${q > 0 ? 'лонг' : 'шорт'} ${ruNum(Math.abs(q), 1)}`;
  };

  const lastQRow = (history || [])[(history || []).length - 1];
  const curQ = (lastQRow && Number.isFinite(lastQRow.q) ? lastQRow.q : -1) + 1;
  React.useEffect(() => {
    const done = new Set();
    INSTRUMENTS.forEach((i) => {
      if (done.has(i.key)) return; done.add(i.key);
      const p = priceOf(i, economy, live);
      pushTick(tape.current, i.key, p, 360); noteExtreme(seen.current, curQ, i.key, p);
    });
  }, [live, economy, curQ]);
  // квартальные свечи + идущая сейчас; «Сейчас» — свечи по 3 живых тика
  const qCandles = useMemo(() => {
    const all = quarterCandles(history, instr.key, seenFor(seen.current, instr.key));
    const lastC = all.length ? all[all.length - 1].c : price;
    const s0 = (seen.current[curQ] || {})[instr.key];
    all.push({ t: curQ, label: 'сейчас', o: lastC, c: price, h: Math.max(lastC, price, s0 ? s0.h : -Infinity), l: Math.min(lastC, price, s0 ? s0.l : Infinity), open: true });
    return tf === 'all' || tf === 'live' ? all : all.slice(-(TF_SPAN[tf] + 1));
  }, [history, instr.key, price, curQ, tf]);
  const candles = tf === 'live' ? tickCandles(tape.current[instr.key] || [], 3) : qCandles;
  const marks = useMemo(() => (tf === 'live' ? [] : (book.trades || []).filter((t) => t.id === sel).map((t) => {
    const k = qCandles.findIndex((c) => c.t === t.q);
    return { idx: k >= 0 ? k : t.q >= curQ ? qCandles.length - 1 : -1, side: t.side };
  }).filter((m) => m.idx >= 0)), [tf, book.trades, sel, qCandles, curQ]);
  // сводный индекс от той же стартовой цены
  const benchLine = useMemo(() => {
    if (tf === 'live' || !qCandles.length) return null;
    const byQ = Object.fromEntries((history || []).map((h) => [h.q, h.stockIndex]));
    const vals = qCandles.map((c) => (c.t === curQ ? live.stockIndex || economy.stockIndex : byQ[c.t]));
    const first = vals.find(Number.isFinite);
    if (!first) return null;
    const k = qCandles[0].c / first;
    return vals.map((v) => (Number.isFinite(v) ? v * k : null));
  }, [tf, qCandles, history, curQ, live, economy]);
  // спарклайн строки: закрытия последних кварталов и цена сейчас; в первых кварталах — живые тики
  const sparkOf = (key) => {
    const closes = (history || []).slice(-12).map((h) => h[key]).filter(Number.isFinite);
    return closes.length >= 4 ? [...closes, live[key] || economy[key]] : (tape.current[key] || []).slice(-40);
  };
  const groups = [...new Set(INSTRUMENTS.map((i) => i.group))];
  const pick = (id) => { Audio.play('tick'); setSel(id); setAmount(1); setSide('buy'); };
  const startEq = book.startValue || 10;
  const eqChg = change(startEq, equity);
  const lvlTone = lvl < MAINTENANCE ? 'var(--tt-down)' : lvl < 0.45 ? 'var(--tt-acc)' : 'var(--tt-up)';
  const quick = quickAmounts(maxAmount);
  const fillPct = maxAmount > 0 ? Math.round((amt / maxAmount) * 100) : 0;
  const lastHist = (history || [])[history && history.length - 1];
  const qName = lastHist && lastHist.label ? lastHist.label : '';
  const tfCandles = candles;
  const rangeLo = tfCandles.length ? Math.min(...tfCandles.map((k) => k.l)) : price;
  const rangeHi = tfCandles.length ? Math.max(...tfCandles.map((k) => k.h)) : price;
  return (
    <div className="tt" data-testid="trader-terminal">
      <style>{TT_CSS}</style>
      {/* бегущая строка: касание тикера выбирает инструмент */}
      <div className="tt-tape" data-testid="tt-tape" aria-label="Котировки">
        {[0, 1].map((copy) => (
          <div key={copy} className="tt-tape-in" aria-hidden={copy ? 'true' : undefined}>
            {rows.filter((r) => r.i.kind !== 'opt').map((r) => (
              <button key={r.i.id} type="button" className="tt-tick num" tabIndex={copy ? -1 : 0} onClick={() => pick(r.i.id)} title={r.i.name}>
                <b>{r.i.ticker}</b><span>{ruNum(r.pr, 2)}</span><span className={tone(Math.sign(r.chgQ))}>{arrow(Math.sign(r.chgQ))} {ruNum(Math.abs(r.chgQ), 1)}%</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="tt-stats">
        <div className="tt-stat" data-testid="tt-stat" data-kind="equity"><span>Капитал</span><b className="num">{fmtMln(equity)}</b>
          <small className={`num ${tone(eqChg.dir)}`}>{arrow(eqChg.dir)} {fmtSigned1(eqChg.pct)}% с начала</small></div>
        <div className="tt-stat" data-testid="tt-stat" data-kind="cash"><span>Свободно</span><b className={`num ${book.cash < 0 ? 'tt-down' : ''}`}>{fmtMln(book.cash)}</b>
          <small className="tt-flat">{book.cash < 0 ? 'в долг у брокера' : 'можно вложить'}</small></div>
        <div className="tt-stat" data-testid="tt-stat" data-kind="gross"><span>В позициях</span><b className="num">{fmtMln(parts.gross)}</b>
          <small className="tt-flat">{openCount} {plural(openCount, 'позиция', 'позиции', 'позиций')}</small></div>
        <div className="tt-stat" data-testid="tt-stat" data-kind="realized"><span>Зафиксировано</span><b className={`num ${tone(Math.sign(book.realized))}`}>{fmtMlnSigned(book.realized)}</b>
          <small className="tt-flat">по закрытым сделкам</small></div>
        <div className="tt-stat" data-testid="tt-stat" data-kind="margin"><span>Обеспечение</span>
          <b className="num" style={{ color: parts.gross > 0.01 ? lvlTone : undefined }} data-testid="tt-margin-level">{parts.gross <= 0.01 ? 'без позиций' : lvl > 1.2 ? 'с запасом' : `${Math.round(lvl * 100)}%`}</b>
          <div className="tt-meter" aria-hidden="true"><i style={{ width: `${clamp(lvl / 1.2 * 100, 0, 100)}%`, background: lvlTone }} /></div></div>
      </div>
      {parts.gross > 0.01 && lvl < 0.45 && (
        <div className={`tt-alert ${lvl < MAINTENANCE ? 'bad' : 'warn'}`} role="status">
          {lvl < MAINTENANCE
            ? `Уровень обеспечения ниже ${MAINTENANCE * 100}%: в конце квартала брокер принудительно закроет часть позиций по рынку.`
            : `Обеспечение ${Math.round(lvl * 100)}% — запас до маржин-колла невелик. Падение рынка на ${Math.round((lvl - MAINTENANCE) / Math.max(0.01, lvl) * 100)}% приведёт к принудительному закрытию.`}
        </div>
      )}

      <div className="tt-grid">
        <aside className="tt-list" aria-label="Инструменты">
          <div className="tt-find">
            <div className="tt-search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск: тикер или название" aria-label="Поиск инструмента" data-testid="tt-search" />
              <button type="button" className="tt-chip" aria-pressed={onlyMine} title="Только инструменты, где у вас есть позиция" onClick={() => { Audio.play('tick'); setOnlyMine((v) => !v); }}>
                Мои{openCount > 0 ? ` · ${openCount}` : ''}
              </button>
            </div>
            <div className="tt-chips" role="group" aria-label="Группа">
              {['all', ...groups].map((g) => (
                <button type="button" key={g} className="tt-chip" aria-pressed={activeGroup === g} onClick={() => { Audio.play('tab'); setActiveGroup(g); }}>{g === 'all' ? 'Все' : g}</button>
              ))}
            </div>
            <div className="tt-chips" role="group" aria-label="Сортировка">
              {[['group', 'По группам'], ['chg', 'Рост за квартал'], ['pnl', 'Мой результат']].map(([id, label]) => (
                <button type="button" key={id} className="tt-chip" aria-pressed={sortBy === id} onClick={() => { Audio.play('tab'); setSortBy(id); }}>{label}</button>
              ))}
            </div>
          </div>
          <div className="tt-rows" role="listbox" aria-label="Список инструментов">
            {visibleRows.length === 0 && (
              <div className="tt-empty">{onlyMine ? 'Открытых позиций нет — снимите фильтр «Мои», чтобы увидеть весь список.' : 'Ничего не найдено по этому запросу.'}</div>
            )}
            {visibleRows.map((r, idx) => {
              const { i, pr, q, myLots, value, pnl, chgQ, has } = r;
              const groupHeader = sortBy === 'group' && (idx === 0 || visibleRows[idx - 1].i.group !== i.group);
              const sub = has ? (i.kind === 'opt' ? `${myLots.length} серии · ${fmtMln(value)}` : `${q < 0 ? 'шорт' : 'лонг'} ${fmtMln(Math.abs(value))}${Math.abs(pnl) > 0.0005 ? ` · ${fmtMlnSigned(pnl)}` : ''}`)
                : i.kind === 'fut' ? `${i.group} · плечо ${i.lev}:1` : i.group;
              return (
                <React.Fragment key={i.id}>
                  {groupHeader && <div className="tt-grp">{i.group}</div>}
                  <button type="button" role="option" className="tt-row" aria-selected={sel === i.id} data-testid="tt-row" data-id={i.id} onClick={() => pick(i.id)}>
                    <span className="tt-badge" style={{ '--c': i.color }} aria-hidden="true">{i.ticker.replace('F-', '').slice(0, 4)}</span>
                    <span className="nm"><b>{i.name}</b><small className={has && q < 0 ? 'tt-down' : ''}>{i.ticker} · {sub}</small></span>
                    <Spark values={sparkOf(i.key)} w={44} />
                    <span className="px num"><b>{ruNum(pr, 2)}</b><small className={tone(Math.sign(chgQ))}>{arrow(Math.sign(chgQ))} {ruNum(Math.abs(chgQ), 1)}%</small></span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </aside>

        <main className="tt-main" aria-label={`${instr.ticker}: ${instr.name}`}>
          <div className="tt-head">
            <span className="tt-badge big" style={{ '--c': instr.color }} aria-hidden="true">{instr.ticker.replace('F-', '').slice(0, 4)}</span>
            <div className="ttl"><b data-testid="tt-name">{instr.name}</b><small>{instr.ticker} · {instr.group}{instr.kind === 'fut' ? ` · плечо ${instr.lev}:1` : ''}</small></div>
            <div className="tt-price">
              <FlashPrice value={price} testid="tt-price" />
              <span className={`tt-pill num ${tone(Math.sign(chg))}`}>{arrow(Math.sign(chg))} {fmtSigned1(chg)}% за квартал</span>
            </div>
          </div>
          <p className="tt-note">{instr.note}</p>
          <div className="tt-cards">
            <div className="tt-card"><span>Цена</span><b className="num">{ruNum(price, 2)}</b></div>
            <div className="tt-card"><span>Диапазон</span><b className="num">{ruNum(rangeLo, 1)}–{ruNum(rangeHi, 1)}</b></div>
            <div className="tt-card"><span>Волатильность</span><b className="num">{ruNum(vol * 100, 0)}%</b></div>
            <div className="tt-card"><span>{instr.kind === 'fut' ? 'Плечо' : 'Комиссия'}</span><b className="num">{instr.kind === 'fut' ? `${instr.lev}:1` : `${ruNum(instr.fee * 100, 2)}%`}</b></div>
          </div>
          <div className="tt-tools">
            <div className="tt-seg" role="group" aria-label="Период графика">
              {TIMEFRAMES.map(([id, label]) => (
                <button type="button" key={id} aria-pressed={tf === id} data-testid="tt-tf" data-tf={id} onClick={() => { Audio.play('tab'); setTf(id); }}>
                  {id === 'live' && <span className="tt-live" aria-hidden="true" />}{label}
                </button>
              ))}
            </div>
            <div className="tt-seg" role="group" aria-label="Вид графика">
              {[['candle', 'Свечи'], ['line', 'Линия']].map(([id, label]) => (
                <button type="button" key={id} aria-pressed={chartMode === id} data-testid="tt-mode" data-mode={id} onClick={() => { Audio.play('tab'); setChartMode(id); }}>{label}</button>
              ))}
            </div>
            {tf !== 'live' && instr.key !== 'stockIndex' && (
              <div className="tt-seg" style={{ marginLeft: 'auto' }}>
                <button type="button" aria-pressed={showBench} data-testid="tt-bench-toggle" title="Наложить сводный индекс, приведённый к той же стартовой точке"
                  onClick={() => { Audio.play('tab'); setShowBench((v) => !v); }}>С индексом</button>
              </div>
            )}
          </div>
          {candles.length >= 2 ? (
            <CandleChart candles={candles} mode={chartMode} avg={instr.kind === 'opt' ? null : avg} marks={tf === 'live' ? [] : marks} bench={tf !== 'live' && showBench ? benchLine : null} unitLabel={instr.name} />
          ) : (
            <div className="tt-chart tt-empty" data-testid="tt-chart" data-candles={candles.length} style={{ height: 300, display: 'grid', placeItems: 'center' }}>Котировки собираются — первая свеча через несколько секунд.</div>
          )}
          <div className="tt-legend">
            {tf === 'live'
              ? 'Сейчас: свеча — 3,6 секунды живых котировок между кварталами; цена дышит вокруг расчётной.'
              : 'Свеча — квартал: открытие — цена конца прошлого квартала, закрытие — этого; тени — живые котировки, которые терминал видел за квартал. Последняя свеча ещё идёт.'}
            {tf !== 'live' && marks.length > 0 && ' ▲ — ваши покупки, ▼ — продажи.'}
            {tf !== 'live' && showBench && ' Пунктир — сводный индекс от той же стартовой цены: расхождение — опережение или отставание от рынка.'}
          </div>
          <InstrumentPrimer instr={instr} economy={economy} prev={prev} amt={amt} />
        </main>

        <section className="tt-order" aria-label="Заявка">
          <div className="tt-side" role="group" aria-label="Сторона сделки">
            {[['buy', 'Купить', instr.kind === 'opt' ? 'новая серия' : 'лонг'], ['sell', instr.kind === 'opt' ? 'Закрыть' : 'Продать', instr.kind === 'opt' ? 'по оценке' : 'или шорт']].map(([id, label, sub]) => (
              <button key={id} type="button" data-side={id} aria-pressed={side === id} data-testid="tt-side" onClick={() => { Audio.play('tick'); setSide(id); setAmount(1); }}>
                {label}<small>{sub}</small>
              </button>
            ))}
          </div>
          <div>
            <div className="tt-lbl"><span>{instr.kind === 'fut' ? 'Гарантийное обеспечение' : instr.kind === 'opt' ? 'Премия' : 'Сумма сделки'}</span>
              <span className="num">доступно {fmtMln(maxAmount)}</span></div>
            <label className="tt-amt">
              <input type="number" inputMode="decimal" min={0} step={0.1} value={Number(amt.toFixed(2))} aria-label="Сумма сделки, млн" data-testid="tt-amount"
                onChange={(e) => { const v = parseFloat(String(e.target.value).replace(',', '.')); setAmount(Number.isFinite(v) ? v : 0); }} />
              <span>млн</span>
            </label>
            <div className="tt-quick">
              {Array.from({ length: 4 }, (_, k) => quick[k]).map((v, k) => (
                v ? <button key={v} type="button" data-testid="tt-quick" onClick={() => { Audio.play('tick'); setAmount(v); }}>{v >= 1000 ? `${ruNum(v / 1000, 1)} млрд` : ruNum(v, v < 1 ? 2 : 0)}</button>
                  : <span key={`e${k}`} />
              ))}
              <button type="button" className="max" data-testid="tt-max" onClick={() => setPct(1)}>Макс</button>
            </div>
            <input type="range" className="tt-range" min={0} max={Math.max(0.1, Math.round(maxAmount * 100) / 100)} step={0.05} aria-label="Сумма сделки"
              value={amt} onChange={(e) => { Audio.play('tick'); setAmount(parseFloat(e.target.value)); }}
              style={{ '--p': `${fillPct}%`, '--fill': side === 'buy' ? 'var(--tt-up)' : 'var(--tt-down)' }} />
          </div>
          {instr.kind === 'spot' && (
            <div className="tt-margin">
              <button type="button" role="switch" className="tt-switch" aria-checked={useMargin} aria-label="Торговать в кредит" data-testid="tt-margin"
                onClick={() => { Audio.play('tick'); setUseMargin((m) => !m); setAmount(1); }} />
              <span>{useMargin ? `Кредитное плечо: доступно ${fmtMln(maxBuy)}, из них ${fmtMln(Math.max(0, maxBuy - Math.max(0, book.cash)))} заёмных под ${fmt1(economy.lendingRate)}% годовых.`
                : `Торговать в кредит выключено: сделки только на свои — ${fmtMln(Math.max(0, book.cash))}.`}</span>
            </div>
          )}
          {instr.id === 'bond_gov' && side === 'buy' && (
            <div className="tt-margin"><span>Рынок гособлигаций ограничен размером госдолга ({fmtMoney(economy.govDebt)}): один инвестор не выкупит больше {Math.round(GOV_BOND_INVESTOR_SHARE * 100)}%. Свободно ещё {fmtMln(govBondRoom)}.</span></div>
          )}
          <div className="tt-sum" data-testid="tt-summary">
            {instr.kind === 'opt' ? (
              <>
                <div className="r"><span>Контрактов</span><span className="num">{ruNum(qty, 1)}</span></div>
                <div className="r"><span>Страйк · экспирация</span><span className="num">{ruNum(price, 0)} · {instr.life} кв.</span></div>
                <p>{side === 'buy' ? `Премия ${fmtMln(amt)} — максимум, который можно потерять. Волатильность в цене опциона: ${ruNum(vol * 100, 0)}%.` : `Закрытие позиций по опционам на ${fmtMln(amt)} по текущей оценке.`}</p>
              </>
            ) : (
              <>
                <div className="r"><span>Количество</span><span className="num">{ruNum(qty, 1)} ед.</span></div>
                <div className="r"><span>Цена</span><span className="num">{ruNum(price, 2)}</span></div>
                {instr.kind === 'fut' && <div className="r"><span>Номинал</span><span className="num">{fmtMln(amt * instr.lev)}</span></div>}
                <div className="r"><span>Комиссия</span><span className="num">{fmtMln(amt * instr.fee * (instr.lev || 1))}</span></div>
                {willShort && <p className="tt-down">Шорт: прибыль при падении цены, плата за заём {ruNum(BORROW_FEE * 100, 1)}% годовых, убыток теоретически не ограничен.</p>}
                {instr.kind === 'spot' && side === 'buy' && book.cash - amt < 0 && <p className="tt-down">Сделка в плечо под {fmt1(economy.lendingRate)}% годовых.</p>}
              </>
            )}
          </div>
          <button type="button" className="tt-go" data-side={side} disabled={amt <= 0.001} data-testid="tt-submit"
            onClick={() => { Audio.play(side === 'buy' ? 'coin' : 'click'); onTrade(sel, amt, side, live); setAmount(1); }}>
            {amt <= 0.001 ? 'Выберите сумму' : `${side === 'buy' ? 'Купить' : willShort ? 'Открыть шорт' : instr.kind === 'opt' ? 'Закрыть' : 'Продать'} ${instr.ticker} на ${fmtMln(amt)}`}
          </button>
          {(Math.abs(held) > 0.001 || lots.length > 0) && (
            <button type="button" className="tt-close" data-testid="tt-close"
              onClick={() => { Audio.play('click'); onTrade(sel, instr.kind === 'opt' ? lotsValue : Math.abs(heldValue) / (instr.lev || 1), held < 0 ? 'buy' : 'sell', live); }}>
              Закрыть позицию
            </button>
          )}
          <div className="tt-box" data-testid="tt-position">
            <b><span>Позиция · {instr.ticker}</span></b>
            <div className="tt-pos">
              <div><span>Позиция</span><strong className="num">{posLabel(instr, held)}</strong></div>
              <div><span>{instr.kind === 'opt' ? 'Страйк' : 'Средняя'}</span><strong className="num">{instr.kind === 'opt' ? (lots[0] ? ruNum(lots[0].strike, 0) : '—') : (avg ? ruNum(avg, 2) : '—')}</strong></div>
              <div><span>{instr.kind === 'fut' ? 'Номинал' : 'Стоимость'}</span><strong className="num">{instr.kind === 'opt' ? (lotsValue > 0 ? fmtMln(lotsValue) : '—') : Math.abs(held) > 0.001 ? fmtMln(Math.abs(heldValue)) : '—'}</strong></div>
              <div><span>Прибыль</span><strong className={`num ${tone(Math.abs(unreal) > 0.0005 ? Math.sign(unreal) : 0)}`}>{Math.abs(unreal) > 0.0005 ? fmtMlnSigned(unreal) : '—'}</strong></div>
            </div>
            {instr.kind === 'opt' && lots.length > 0 && (
              <div className="tt-log" style={{ marginTop: 8 }}>
                {lots.map((l, k) => <div key={l.id}>серия {k + 1}: страйк {l.strike.toFixed(0)}, до экспирации {l.left} кв., премия {fmtMln(l.premium * l.qty / 1000)}, сейчас {fmtMln(optionValue(l.type, price, l.strike, vol, l.left) * l.qty / 1000)}</div>)}
              </div>
            )}
          </div>
          {(book.trades || []).length > 0 && (
            <div className="tt-box" data-testid="tt-trades">
              <b><span>Исполнено</span><span className="num">{book.trades.length}</span></b>
              <div className="tt-log">
                {(() => {
                  let lastQ = null;
                  return (book.trades || []).slice(-40).reverse().map((t, k) => {
                    const ins = INSTR_BY_ID[t.id]; const showQ = t.q !== lastQ; lastQ = t.q;
                    return (
                      <React.Fragment key={`${t.q}-${k}`}>
                        {showQ && <div className="q">{(t.label || quarterLabel(t.q)).toUpperCase()}</div>}
                        <div className="t"><span className={t.side === 'buy' ? 'tt-up' : 'tt-down'}>{t.side === 'buy' ? 'покупка' : 'продажа'}</span>
                          <span>{ins ? ins.ticker : t.id} · по {ruNum(t.price, 2)}</span><span className="num">{fmtMln(t.amt)}</span></div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="tt-status" data-testid="tt-status">
        <span><span className="tt-live" aria-hidden="true" /><b>Торги идут</b>{qName ? ` · после ${qName}` : ''}</span>
        <span>Котировки обновляются каждые 1,2 с</span>
        <span>Сделок за партию: <b className="num">{(book.trades || []).length}</b></span>
        {movers.length > 0 && <span>Лидер квартала: <b className={tone(Math.sign(movers[0].chgQ))}>{movers[0].i.ticker} {fmtSigned1(movers[0].chgQ)}%</b></span>}
      </footer>
    </div>
  );
}

export function PortfolioSummary({ book, economy, live, prevValue, goal, opponent }) {
  const parts = bookParts(book, economy, live);
  const equity = book.cash + parts.spot + parts.futPnl + parts.optVal;
  const real = equity * 100 / economy.priceLevel;
  const qRet = prevValue ? (equity / prevValue - 1) * 100 : 0;
  const start = book.startValue || 10;
  const totalRet = (equity / start - 1) * 100;
  const bench = benchValues(book, economy);
  const optVal = parts.optVal;
  const alloc = useMemo(() => {
    const map = {};
    const put = (label, color, v, short) => {
      if (!map[label]) map[label] = { label, color, value: 0, net: 0, short: false };
      map[label].value += Math.abs(v); map[label].net += v;
      if (short) map[label].short = true;
    };
    INSTRUMENTS.forEach((i) => {
      const q = book.pos[i.id] || 0;
      if (!q) return;
      const pr = priceOf(i, economy, live);
      put(SECTOR_OF[i.id] || i.group, i.color, q * pr / 1000, q < 0);
    });
    (book.opts || []).forEach((lot) => {
      const ins = INSTR_BY_ID[lot.instr];
      if (!ins) return;
      const S = priceOf(ins, economy, live);
      put('Опционы', COLOR.teal, optionValue(lot.type, S, lot.strike, impliedVol(economy), lot.left) * lot.qty / 1000, false);
    });
    if (book.cash > 0.005) put('Свободные деньги', COLOR.faint, book.cash, false);
    return Object.values(map).filter((r) => r.value > 0.005).sort((a, b) => b.value - a.value);
  }, [book, economy, live]);
  const allocTotal = alloc.reduce((a, r) => a + r.value, 0);
  const goalDef = GOALS.find((g) => g.id === goal);
  const goalLine = () => {
    if (!bench) return null;
    if (goal === 'beat_index') return `Индекс: ${fmtMln(bench.stock)} против вашего ${fmtMln(equity)} — вы ${equity >= bench.stock ? 'впереди' : 'позади'} на ${fmtMln(Math.abs(equity - bench.stock))}.`;
    if (goal === 'beat_inflation') return `Сохранение покупательной способности требует ${fmtMln(bench.infl)} — у вас ${fmtMln(equity)}.`;
    if (goal === 'survive') return `Маржин-коллов: ${book.marginCalls || 0}. Цель — пройти цикл без принудительных закрытий.`;
    return `Капитал вырос на ${fmtSigned1(totalRet)}% с начала игры.`;
  };
  return (
    <div className="ems-panel" style={{ padding: 14 }}>
      <div className="ems-serif" style={{ fontSize: 14, color: COLOR.goldSoft, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Coins size={14} />Ваш капитал
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 9, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: COLOR.muted }}>Стоимость</div>
          <div className="ems-mono" style={{ fontSize: 22 }}>{mlnScale(equity).v}<span style={{ fontSize: 12, color: COLOR.faint }}> {mlnScale(equity).unit}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: COLOR.muted }}>В ценах старта</div>
          <div className="ems-mono" style={{ fontSize: 15, color: real >= start ? COLOR.teal : COLOR.rust }}>{mlnScale(real).v}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: COLOR.muted }}>За квартал</div>
          <div className="ems-mono" style={{ fontSize: 15, color: qRet >= 0 ? COLOR.teal : COLOR.rust }}>{fmtSigned1(qRet)}%</div>
        </div>
      </div>
      {book.history && book.history.length > 2 && (
        <Suspense fallback={<ChartFallback height={54} />}>
          <MemoChart data={book.history} color={COLOR.gold} height={54} label="Капитал" fmt={fmt2} />
        </Suspense>
      )}
      {bench && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${COLOR.hairline}`, paddingTop: 7 }}>
          <div style={{ fontSize: 12, color: COLOR.blue, marginBottom: 4 }}>Против эталонов</div>
          {[{ id: 'me', label: 'Ваш портфель', v: equity, color: COLOR.gold }]
            .concat(BENCHMARKS.map((b) => ({ id: b.id, label: b.label, v: bench[b.id], color: b.color })))
            .concat(opponent && Number.isFinite(opponent.value) ? [{ id: 'opponent', label: opponent.label, v: opponent.value, color: COLOR.rust }] : [])
            .sort((a, b) => b.v - a.v)
            .map((r, idx) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '2px 0',
                color: r.id === 'me' ? COLOR.text : COLOR.muted, fontWeight: r.id === 'me' ? 600 : 400 }}>
                <span className="ems-mono" style={{ width: 14, color: COLOR.faint }}>{idx + 1}</span>
                <span style={{ width: 8, height: 8, background: r.color, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                <span className="ems-mono">{fmtMln(r.v)}</span>
                <span className="ems-mono" style={{ width: 52, textAlign: 'right', color: (r.v / start - 1) >= 0 ? COLOR.teal : COLOR.rust }}>
                  {fmtSigned1((r.v / start - 1) * 100)}%
                </span>
              </div>
            ))}
          {opponent && !Number.isFinite(opponent.value) && (
            <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 3 }}>{opponent.label} ещё не выходил на рынок в этой партии.</div>
          )}
        </div>
      )}
      {alloc.length > 0 && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${COLOR.hairline}`, paddingTop: 7 }}>
          <div style={{ fontSize: 12, color: COLOR.blue, marginBottom: 6 }}>Портфель по отраслям</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <AllocationDonut rows={alloc} />
            <div style={{ flex: 1, minWidth: 165 }}>
              {alloc.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '1.5px 0' }}>
                  <span style={{ width: 8, height: 8, background: r.color, borderRadius: 1, flexShrink: 0, opacity: r.short ? 0.5 : 1 }} />
                  <span style={{ flex: 1, minWidth: 0, color: COLOR.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.label}{r.short ? ' · шорт' : ''}
                  </span>
                  <span className="ems-mono" style={{ color: r.net < 0 ? COLOR.rust : COLOR.text }}>{fmtMln(r.value)}</span>
                  <span className="ems-mono" style={{ width: 38, textAlign: 'right', color: COLOR.faint }}>
                    {Math.round(r.value / Math.max(0.0001, allocTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          {Math.abs(optVal) > 0.005 && (
            <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 5 }}>
              Опционы учтены по текущей оценке, фьючерсы — по номиналу позиции, шорты — по модулю: диаграмма показывает риск, а не вложенные деньги.
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0 0', color: COLOR.muted }}>
        <span>Свободные деньги</span>
        <span className="ems-mono" style={{ color: book.cash < 0 ? COLOR.rust : COLOR.text }}>{fmtMln(book.cash)}</span>
      </div>
      <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 9, lineHeight: 1.45 }}>
        <b style={{ color: COLOR.goldSoft }}>Ваша цель: {goalDef ? goalDef.label.toLowerCase() : 'приумножить капитал'}.</b> {goalLine()}
        {' '}Инфляция за квартал забирает {fmt1(economy.inflation / 4)}% номинальной стоимости, поэтому «ничего не делать» — это тоже ставка, и обычно проигрышная.
      </div>
      {(book.lastEvents || []).length > 0 && (
        <div style={{ marginTop: 8 }}>
          {book.lastEvents.map((ev, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.45, color: ev.kind === 'call' ? COLOR.rust : ev.kind === 'ok' ? COLOR.teal : COLOR.muted,
              borderLeft: `2px solid ${ev.kind === 'call' ? COLOR.rust : COLOR.border}`, paddingLeft: 8, marginTop: 4 }}>
              {ev.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
