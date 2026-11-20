/* ШАХТА — работа лавки (src/learn/mine.js, docs/mechanics.md, «Лавка»). Разрез шахты: слева — глубиномер с пластами и
   отметками, где начинается какая руда; посередине — забой цвета пласта: удар — кирка взмахивает, порода трескается
   (трещины — сколько крепости уже выбито), разбитый блок рассыпается крошкой цвета руды, кусок летит на склад. Вагонетки
   ездят по рельсам сами; динамит — с кольцом остывания. Сверху — склад (сколько руды помещается) и следующий рубеж глубины.
   Ниже — заказы дня, скупщик с рынком (цена каждой руды падает с каждым сданным сегодня куском), обмен жетонов на монеты
   и улучшения. Прогресс — в learn.mine (общий для устройств) и копией на устройстве (ems-mine-v2), монеты — в лавке. */
import { useEffect, useRef, useState } from 'react';
import { Pickaxe, Bomb, Lamp, ShoppingCart, ArrowDownToLine, Flame, Coins, Warehouse, Flag, ClipboardList, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button } from './ds.jsx';
import { useReducedMotion } from './ds-art.jsx';
import { ORES, ORE_BY_ID, STRATA, UPGRADES, EXCHANGE, stratumAt, hardness, strike, idle, blast, blastReady, blastCooldown, buyUpgrade, upgradeCost, level,
  exchange, exchangedToday, exchangeCost, emptyMine, parseMine, betterMine, MINE_STORE, MINE_STORE_V1, OFFLINE_MAX_MS, cartRate,
  capOf, oreCount, storeFull, unitPrice, quote, sellOre, dayFactor, soldToday, ordersFor, fillOrder, MILESTONES, nextMilestone, readyMilestones, claimMilestones } from './learn/mine.js';
import { coinsWord, hasClaim } from './learn/rewards.js';
import { dayOf } from './textbook/learn-state.js';

const ICON = { pick: Pickaxe, cart: ShoppingCart, lamp: Lamp, lift: ArrowDownToLine, smelter: Flame, dynamite: Bomb, store: Warehouse };
const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const big = (n) => (n >= 10000 ? `${Math.round(n / 100) / 10} тыс.`.replace('.', ',') : String(Math.floor(n)));

export const MINE_CSS = `
  .mn { --mn-ink: #EDE6DA; --mn-dim: #A99E8E; --mn-gold: #F3C553; position: relative; border-radius: 22px; overflow: hidden; color: var(--mn-ink);
    background: radial-gradient(120% 80% at 50% -10%, #3A2F26 0%, #1A1512 55%, #100D0B 100%); box-shadow: 0 24px 50px -30px rgba(0,0,0,.8); padding: 14px; }
  .mn-top { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .mn-depth { font: 800 30px/1 var(--ds-mono, monospace); letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .mn-depth small { font: 600 13px var(--ds-sans); color: var(--mn-dim); margin-left: 4px; }
  .mn-layer { font: 700 12px var(--ds-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--mn-dim); }
  .mn-tokens { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: rgba(243,197,83,.12); border: 1px solid rgba(243,197,83,.35);
    font: 800 15px var(--ds-mono, monospace); color: var(--mn-gold); font-variant-numeric: tabular-nums; }
  .mn-tokens i { width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFF1B8, #E2AE2A 60%, #8A6410); box-shadow: 0 0 0 2px rgba(0,0,0,.25) inset; }
  .mn-bag { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; min-height: 30px; }
  .mn-ore { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    font: 700 13px var(--ds-sans); font-variant-numeric: tabular-nums; transition: transform .2s; }
  .mn-ore.bump { animation: mn-bump .35s ease-out; }
  @keyframes mn-bump { 40% { transform: scale(1.12); } }
  .mn-gem { width: 16px; height: 16px; clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%); background: linear-gradient(150deg, var(--g2), var(--g1) 60%); }
  .mn-shaft { display: grid; grid-template-columns: 54px 1fr; gap: 10px; margin-top: 12px; }
  .mn-gauge { position: relative; border-radius: 12px; overflow: hidden; background: #0C0A09; border: 1px solid rgba(255,255,255,.08); min-height: 280px; }
  .mn-gauge > div { position: absolute; left: 0; right: 0; }
  .mn-gauge b { position: absolute; left: 3px; display: inline-flex; align-items: center; gap: 2px; margin-top: -6px; font: 700 12px var(--ds-mono, monospace); letter-spacing: -.04em; color: rgba(255,255,255,.85); text-shadow: 0 1px 2px #000; white-space: nowrap; }
  .mn-gauge b .mn-gem { width: 9px; height: 9px; flex: none; }
  .mn-gauge .now { position: absolute; left: -2px; right: -2px; height: 3px; background: var(--mn-gold); box-shadow: 0 0 10px var(--mn-gold); transition: top .4s; }
  .mn-face { position: relative; border-radius: 16px; overflow: hidden; min-height: 280px; cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation;
    background: var(--rock); box-shadow: inset 0 0 60px rgba(0,0,0,.65), inset 0 -40px 50px rgba(0,0,0,.4); border: 0; padding: 0; width: 100%; display: block; color: inherit; }
  .mn-face:focus-visible { outline: 3px solid var(--mn-gold); outline-offset: 2px; }
  .mn-face svg.rock { position: absolute; inset: 0; width: 100%; height: 100%; }
  .mn-face .shake { animation: mn-shake .16s ease-out; }
  @keyframes mn-shake { 30% { transform: translate(2px, -1px); } 60% { transform: translate(-2px, 1px); } }
  .mn-lamp { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(55% 45% at 50% 42%, rgba(255,220,150,.22), transparent 70%); }
  .mn-pick { position: absolute; right: 16%; top: 18%; width: 64px; height: 64px; color: #E7D8BF; transform-origin: 80% 80%; transform: rotate(18deg); pointer-events: none;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,.6)); }
  .mn-pick.swing { animation: mn-swing .22s cubic-bezier(.3,1.4,.5,1); }
  @keyframes mn-swing { 0% { transform: rotate(18deg); } 45% { transform: rotate(-38deg); } 100% { transform: rotate(18deg); } }
  .mn-bit { position: absolute; width: 7px; height: 7px; border-radius: 2px; pointer-events: none; animation: mn-bit .7s cubic-bezier(.2,.7,.4,1) forwards; }
  @keyframes mn-bit { to { transform: translate(var(--dx), var(--dy)) rotate(260deg); opacity: 0; } }
  .mn-pop { position: absolute; pointer-events: none; font: 800 14px var(--ds-sans); text-shadow: 0 2px 4px rgba(0,0,0,.8); white-space: nowrap; animation: mn-pop .9s ease-out forwards; }
  @keyframes mn-pop { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, -46px); opacity: 0; } }
  .mn-hard { position: absolute; left: 12px; bottom: 44px; right: 12px; height: 6px; border-radius: 3px; background: rgba(0,0,0,.45); overflow: hidden; pointer-events: none; }
  .mn-hard i { display: block; height: 100%; background: linear-gradient(90deg, #E8C27A, #F3C553); transition: width .12s; }
  .mn-hint { position: absolute; left: 12px; top: 10px; font: 600 12px var(--ds-sans); color: rgba(255,255,255,.7); pointer-events: none; }
  .mn-rail { position: absolute; left: 0; right: 0; bottom: 0; height: 30px; background: linear-gradient(transparent 18px, #2A221C 18px, #2A221C 22px, transparent 22px),
    repeating-linear-gradient(90deg, transparent 0 18px, #4A3B2E 18px 24px); pointer-events: none; }
  .mn-cart { position: absolute; bottom: 8px; left: -60px; width: 48px; height: 26px; pointer-events: none; animation: mn-cart var(--t, 6s) linear infinite; }
  @keyframes mn-cart { to { transform: translateX(calc(var(--w, 400px) + 120px)); } }
  .mn-acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .mn-boom { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 40px; border-radius: 12px; border: 1px solid rgba(255,140,90,.45);
    background: rgba(255,110,60,.12); color: #FFB08A; font: 700 14px var(--ds-sans); cursor: pointer; }
  .mn-boom:disabled { opacity: .5; cursor: default; }
  .mn-boom i { position: absolute; left: 0; bottom: 0; height: 3px; background: #FF8A5B; border-radius: 0 0 0 12px; }
  .mn-flash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 50%, rgba(255,220,140,.9), rgba(255,120,40,.4) 30%, transparent 60%); animation: mn-flash .6s ease-out forwards; }
  @keyframes mn-flash { from { opacity: 1; } to { opacity: 0; transform: scale(1.4); } }
  .mn-sec { margin-top: 16px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
  .mn-sec h4 { margin: 0 0 6px; font: 800 12px var(--ds-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--mn-dim); }
  .mn-sec p { margin: 0 0 8px; font: 400 13.5px/1.45 var(--ds-sans); color: var(--mn-dim); }
  .mn-ladder { display: flex; align-items: flex-end; gap: 4px; height: 56px; margin: 20px 0 8px; }
  .mn-ladder span { flex: 1; border-radius: 4px 4px 0 0; background: rgba(243,197,83,.25); position: relative; }
  .mn-ladder span.done { background: rgba(243,197,83,.7); }
  .mn-ladder span.next { background: var(--mn-gold); box-shadow: 0 0 12px rgba(243,197,83,.6); }
  .mn-ladder small { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font: 700 12px var(--ds-mono, monospace); letter-spacing: -.05em; color: var(--mn-dim); }
  .mn-ups { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
  .mn-up { display: grid; grid-template-columns: 34px 1fr; gap: 4px 10px; align-items: center; padding: 10px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
  .mn-up > svg { grid-row: span 2; color: var(--mn-gold); }
  .mn-up b { font: 700 14px var(--ds-sans); } .mn-up b em { font-style: normal; color: var(--mn-dim); font-weight: 600; margin-left: 4px; }
  .mn-up span { font: 500 12px/1.35 var(--ds-sans); color: var(--mn-dim); }
  .mn-up .ds-btn { grid-column: 1 / -1; margin-top: 4px; }
  /* кнопки — в цветах шахты, а не светлые плашки лавки */
  .mn .ds-btn--secondary { background: rgba(255,255,255,.07); color: var(--mn-ink); border-color: rgba(255,255,255,.2); box-shadow: 0 3px 0 rgba(0,0,0,.45); }
  .mn .ds-btn--secondary:not(:disabled):hover { background: rgba(243,197,83,.14); border-color: rgba(243,197,83,.5); }
  .mn .ds-btn:disabled { opacity: .45; }
  .mn-note { margin-top: 10px; padding: 8px 12px; border-radius: 12px; background: rgba(120,200,140,.12); border: 1px solid rgba(120,200,140,.3); font: 600 13px var(--ds-sans); color: #BFEACB; }
  .mn-meters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .mn-meter { padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .mn-meter > span { display: flex; align-items: center; gap: 6px; font: 600 13px var(--ds-sans); color: var(--mn-dim); flex-wrap: wrap; }
  .mn-meter > span b { color: var(--mn-ink); font-family: var(--ds-mono, monospace); margin-left: auto; }
  .mn-meter > i { display: block; height: 7px; border-radius: 4px; background: rgba(0,0,0,.45); overflow: hidden; }
  .mn-meter > i em { display: block; height: 100%; background: linear-gradient(90deg, #8FBF7A, #C8E59A); transition: width .3s; }
  .mn-meter.full > i em { background: linear-gradient(90deg, #E26A4A, #FF9C6E); }
  .mn-meter.full { border-color: rgba(255,140,90,.45); }
  .mn-meter small { font: 600 12px/1.35 var(--ds-sans); color: #FFB08A; }
  .mn-meter.goal > i em { background: linear-gradient(90deg, #E8C27A, var(--mn-gold)); }
  .mn-gauge .flag { position: absolute; right: 0; width: 10px; height: 2px; background: var(--mn-gold); opacity: .8; }
  .mn-cart.stop { animation-play-state: paused; }
  .mn-sec h4 { display: flex; align-items: center; gap: 6px; }
  .mn-orders { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
  .mn-order { display: grid; grid-template-columns: 22px 1fr; gap: 3px 8px; align-items: center; padding: 10px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
  .mn-order .mn-gem { width: 20px; height: 20px; grid-row: span 2; }
  .mn-order b { font: 700 14px var(--ds-sans); }
  .mn-order > span { font: 600 12px var(--ds-sans); color: var(--mn-gold); }
  .mn-order .ds-btn, .mn-order .ok { grid-column: 1 / -1; margin-top: 4px; }
  .mn-order .ok { display: inline-flex; align-items: center; gap: 4px; color: #BFEACB; font: 700 13px var(--ds-sans); }
  .mn-order.done { opacity: .7; border-color: rgba(120,200,140,.35); }
  .mn-market { display: flex; flex-direction: column; gap: 6px; }
  .mn-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.04); flex-wrap: wrap; }
  .mn-row > .mn-gem { width: 18px; height: 18px; flex: none; }
  .mn-row-t { flex: 1; min-width: 150px; display: flex; flex-direction: column; }
  .mn-row-t b { font: 700 14px var(--ds-sans); } .mn-row-t b em { font-style: normal; color: var(--mn-dim); font-weight: 600; }
  .mn-row-t > span { font: 500 12px var(--ds-sans); color: var(--mn-dim); }
  .mn-row-t .up, .mn-row-t .down { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; margin-left: 4px; }
  .mn-row-t .up { color: #9FE0A8; } .mn-row-t .down { color: #FFB08A; }
  @media (max-width: 520px) { .mn-meters { grid-template-columns: 1fr; } }
  .mn-msg { margin-top: 8px; font: 600 13px var(--ds-sans); color: #FFB08A; }
  @media (max-width: 520px) { .mn-ups { grid-template-columns: 1fr 1fr; } .mn-up { grid-template-columns: 1fr; } .mn-up > svg { grid-row: auto; } .mn-shaft { grid-template-columns: 40px 1fr; } .mn-face, .mn-gauge { min-height: 240px; } .mn-depth { font-size: 26px; } }
  @media (prefers-reduced-motion: reduce) { .mn *, .mn { animation: none !important; transition: none !important; } }
`;

/* шахта при входе: дальше продвинутая из копии на устройстве (или версии 1 — только с устройства) и общей learn.mine */
const loadLocal = () => {
  try {
    const raw = localStorage.getItem(MINE_STORE) || localStorage.getItem(MINE_STORE_V1);
    return raw ? parseMine(raw) : null;
  } catch { return null; }
};
const load = (learn) => betterMine(loadLocal(), learn && learn.mine) || emptyMine();
const save = (m) => { try { localStorage.setItem(MINE_STORE, JSON.stringify(m)); } catch { /* приватный режим */ } };
// в общий прогресс — не каждый удар (это весь прогресс обучения), а раз в несколько секунд и при уходе
const SYNC_MS = 5000;

// текстура породы: крапины и трещины по сиду; трещины проступают, пока блок держится (k — доля выбитой крепости)
function Rock({ seed, k, depth }) {
  const r = (i) => { const x = Math.sin(seed * 97.13 + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const ore = ORES.filter((o) => depth >= o.from);
  const flecks = Array.from({ length: 26 }, (_, i) => ({ x: r(i) * 100, y: r(i + 40) * 86, s: 1.5 + r(i + 80) * 3.5, o: ore[Math.floor(r(i + 120) * ore.length)] }));
  const cracks = Array.from({ length: 5 }, (_, i) => { const x = 30 + r(i + 200) * 40; const y = 25 + r(i + 220) * 40; return `M${x},${y} l${(r(i + 240) - 0.5) * 28},${r(i + 260) * 22} l${(r(i + 280) - 0.5) * 22},${r(i + 300) * 18}`; });
  return (
    <svg className="rock" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {flecks.map((f, i) => <rect key={i} x={f.x} y={f.y} width={f.s} height={f.s * 0.7} rx=".6" fill={f.o ? f.o.color : '#000'} opacity={f.o && f.o.id !== 'coal' ? 0.9 : 0.35}
        transform={`rotate(${r(i + 160) * 90} ${f.x} ${f.y})`} />)}
      {cracks.map((d, i) => <path key={`c${i}`} d={d} fill="none" stroke="rgba(0,0,0,.65)" strokeWidth=".9" strokeLinecap="round" opacity={Math.min(1, Math.max(0, k * 1.4 - i * 0.18))} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

export default function MineGame({ learn, update }) {
  const reduced = useReducedMotion();
  const [m, setM0] = useState(() => load(learn));
  const mRef = useRef(m); mRef.current = m;
  // каждое изменение — с отметкой времени: по ней и по числу блоков устройства решают, чья шахта дальше
  const setM = (next) => setM0((cur) => { const v = typeof next === 'function' ? next(cur) : next; return v === cur ? cur : { ...v, at: Date.now() }; });
  const [fx, setFx] = useState([]); const fxId = useRef(0);
  const [swing, setSwing] = useState(0);
  const [bump, setBump] = useState(null);
  const [flash, setFlash] = useState(0);
  const [msg, setMsg] = useState(null);
  const [note, setNote] = useState(null);
  const [away, setAway] = useState(null);
  const [now, setNow] = useState(Date.now());
  const face = useRef(null);
  const [faceW, setFaceW] = useState(400);
  const day = dayOf(now);
  // пока приложение было закрыто, вагонетки работали — досчитать при входе (до полного склада)
  useEffect(() => {
    const m0 = mRef.current; const gap = Date.now() - (m0.at || Date.now());
    if (cartRate(level(m0, 'cart')) > 0 && gap > 60000) {
      const before = m0.depth; const r = idle(m0, gap);
      if (r.drops.length || r.full) { setM(r.m); setAway({ blocks: r.drops.length, metres: r.m.depth - before, capped: gap > OFFLINE_MAX_MS, full: r.full }); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { save(m); }, [m]);
  // в общий прогресс (learn.mine): раз в SYNC_MS, если изменилось, и при уходе со вкладки или с сайта
  const synced = useRef(m);
  const updRef = useRef(update); updRef.current = update;
  useEffect(() => {
    const push = () => { const cur = mRef.current; if (synced.current === cur) return; synced.current = cur; updRef.current((s) => ({ ...s, mine: betterMine(s.mine, cur) === cur ? cur : s.mine })); };
    const t = setInterval(push, SYNC_MS);
    const hide = () => { if (document.visibilityState === 'hidden') push(); };
    window.addEventListener('pagehide', push); document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(t); window.removeEventListener('pagehide', push); document.removeEventListener('visibilitychange', hide); push(); };
  }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  // вагонетки — каждую секунду, пока шахта открыта (на полном складе стоят)
  useEffect(() => {
    if (!cartRate(level(m, 'cart'))) return undefined;
    const t = setInterval(() => { const r = idle(mRef.current, 1000); if (r.drops.length) { setM(r.m); setBump(r.drops[r.drops.length - 1].ore); } }, 1000);
    return () => clearInterval(t);
  }, [level(m, 'cart')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = face.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setFaceW(el.clientWidth)); ro.observe(el); return () => ro.disconnect();
  }, []);

  const burst = (drops, x, y) => {
    if (reduced || !drops.length) return;
    const items = [];
    drops.slice(0, 6).forEach((d, j) => {
      const o = ORE_BY_ID[d.ore];
      for (let i = 0; i < 7; i += 1) { const a = Math.random() * Math.PI * 2; const v = 30 + Math.random() * 60; items.push({ id: (fxId.current += 1), t: 'bit', x, y, c: i % 2 ? o.color : 'rgba(0,0,0,.55)', dx: Math.cos(a) * v, dy: Math.sin(a) * v - 20 }); }
      items.push({ id: (fxId.current += 1), t: 'pop', x, y: y - 10 - j * 18, c: d.n ? o.glow : '#FFB08A', text: d.n ? `+${d.n} ${o.name}` : 'склад полон' });
    });
    setFx((f) => [...f, ...items]);
    const ids = new Set(items.map((i) => i.id));
    setTimeout(() => setFx((f) => f.filter((i) => !ids.has(i.id))), 950);
  };
  const hit = (e) => {
    const r = face.current.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX - r.left : r.width / 2; const y = e && e.clientY ? e.clientY - r.top : r.height / 2;
    const res = strike(mRef.current);
    setM(res.m); setSwing((s) => s + 1);
    if (res.drops.length) { Audio.play('tick'); burst(res.drops, x, y); const got = res.drops.filter((d) => d.n); if (got.length) setBump(got[got.length - 1].ore); } else Audio.play('paper');
  };
  const boom = () => {
    const res = blast(mRef.current, Date.now());
    if (!res.drops.length) return;
    Audio.play('stamp'); setM(res.m); setFlash((f) => f + 1);
    const r = face.current.getBoundingClientRect(); burst(res.drops, r.width / 2, r.height / 2);
  };
  const sell = (id, q) => { const r = sellOre(mRef.current, id, q, dayOf(Date.now())); if (!r.n) return; Audio.play('coin'); setM(r.m); setMsg(null); setNote(`Сдано ${r.n} × ${ORE_BY_ID[id].name}: +${r.got} жетонов`); };
  const up = (id) => { const r = buyUpgrade(mRef.current, id); if (!r.ok) { setMsg(r.reason); return; } Audio.play('register'); setM(r.m); setMsg(null); };
  const trade = () => {
    let res = null;
    update((s) => { res = exchange(mRef.current, s, Date.now()); return res.ok ? res.s : s; }, { settle: true });
    if (!res || !res.ok) { setMsg(res ? res.reason : null); return; }
    Audio.play('coin'); setM(res.m); setMsg(null);
  };
  const deliver = (k) => {
    let res = null;
    update((s) => { res = fillOrder(mRef.current, s, dayOf(Date.now()), k, Date.now()); return res.ok ? res.s : s; }, { settle: true });
    if (!res || !res.ok) { setMsg(res ? res.reason : null); return; }
    Audio.play('register'); setM(res.m); setMsg(null); setNote(`Заказ выполнен: +${res.order.tokens} жетонов и ${res.order.coins} ${coinsWord(res.order.coins)} в лавку`);
  };
  const takeMilestones = () => {
    let got = [];
    update((s) => { const r = claimMilestones(mRef.current, s, Date.now()); got = r.got; return r.got.length ? r.s : s; }, { settle: true });
    if (got.length) { Audio.play('stamp'); setNote(`Рубеж ${got[got.length - 1].d} м: +${got.reduce((a, x) => a + x.coins, 0)} ${coinsWord(got.reduce((a, x) => a + x.coins, 0))} в лавку`); }
  };

  const h = hardness(m.depth); const k = Math.min(1, m.hit / h);
  const layer = stratumAt(m.depth);
  const done = exchangedToday(learn, now);
  const cost = done < EXCHANGE.perDay ? exchangeCost(done) : null;
  const dyn = level(m, 'dynamite'); const ready = blastReady(m, now);
  const cool = dyn ? Math.min(1, (now - (m.blasted || 0)) / (blastCooldown(dyn) * 1000)) : 0;
  const cap = capOf(m); const stored = oreCount(m); const full = storeFull(m);
  const ms = readyMilestones(m, learn); const nextMs = nextMilestone(m, learn);
  const prevD = nextMs ? (MILESTONES[MILESTONES.indexOf(nextMs) - 1] || { d: 0 }).d : 0;
  const orders = ordersFor(m, day);
  // глубиномер: шкала до следующего рубежа и с запасом
  const scaleMax = Math.max(60, Math.ceil(Math.max(m.depth * 1.3, (ORES.find((o) => o.from > m.depth) || { from: m.depth * 1.5 }).from * 1.1) / 10) * 10);
  const yOf = (d) => `${Math.min(100, (d / scaleMax) * 100)}%`;
  const carts = Math.min(3, level(m, 'cart'));
  return (
    <div className="mn" data-testid="mine" data-depth={m.depth} data-tokens={m.tokens} data-stored={stored} data-cap={cap}>
      <style>{MINE_CSS}</style>
      <div className="mn-top">
        <div>
          <div className="mn-layer" data-testid="mine-layer">{layer.name}</div>
          <div className="mn-depth" data-testid="mine-depth">{fmt(m.depth)}<small>м</small></div>
        </div>
        <span className="mn-tokens" data-testid="mine-tokens" title="Жетоны шахты: за них — улучшения и монеты"><i aria-hidden="true" />{big(m.tokens)}</span>
      </div>
      {/* склад и рубеж: что держит шахту в ритме дня и что впереди надолго */}
      <div className="mn-meters">
        <div className={`mn-meter${full ? ' full' : ''}`} data-testid="mine-store" data-full={String(full)}>
          <span><Warehouse size={14} aria-hidden="true" />Склад <b>{stored} / {cap}</b></span>
          <i role="progressbar" aria-label="Склад" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={stored}><em style={{ width: `${Math.min(100, (stored / cap) * 100)}%` }} /></i>
          {full && <small>Полон: вагонетки стоят, руда осыпается — сдайте или выполните заказ</small>}
        </div>
        {nextMs && (
          <div className="mn-meter goal" data-testid="mine-milestone" data-next={nextMs.d}>
            <span><Flag size={14} aria-hidden="true" />Рубеж {nextMs.d} м <b>+{nextMs.coins} {coinsWord(nextMs.coins)}</b></span>
            <i role="progressbar" aria-label={`До рубежа ${nextMs.d} м`} aria-valuemin={prevD} aria-valuemax={nextMs.d} aria-valuenow={Math.min(nextMs.d, m.depth)}><em style={{ width: `${Math.max(0, Math.min(100, ((m.depth - prevD) / (nextMs.d - prevD)) * 100))}%` }} /></i>
            {ms.length > 0 && <Button small icon={Flag} onClick={takeMilestones} data-testid="mine-milestone-take">Забрать +{ms.reduce((a, x) => a + x.coins, 0)} {coinsWord(ms.reduce((a, x) => a + x.coins, 0))}</Button>}
          </div>
        )}
      </div>
      <div className="mn-bag" data-testid="mine-bag" aria-label="Руда на складе">
        {ORES.filter((o) => m.found.includes(o.id)).map((o) => (
          <span key={o.id} className={`mn-ore${bump === o.id ? ' bump' : ''}`} data-ore={o.id} onAnimationEnd={() => setBump(null)}>
            <i className="mn-gem" style={{ '--g1': o.color, '--g2': o.glow }} aria-hidden="true" />{o.name} {m.ores[o.id] || 0}
          </span>
        ))}
      </div>
      {away && <div className="mn-note" data-testid="mine-away">Пока вас не было, вагонетки разбили {away.blocks} {away.blocks % 10 === 1 && away.blocks % 100 !== 11 ? 'блок' : 'блоков'} — шахта глубже на {fmt(away.metres)} м{away.full ? '. Склад заполнился — вагонетки встали' : away.capped ? ' (больше чем за 4 часа вагонетки не считают)' : ''}.</div>}
      {note && <div className="mn-note" data-testid="mine-note" role="status">{note}</div>}

      <div className="mn-shaft">
        <div className="mn-gauge" aria-hidden="true">
          {STRATA.filter((s) => s.from < scaleMax).map((s, i, arr) => (
            <div key={s.from} style={{ top: yOf(s.from), height: `calc(${yOf(arr[i + 1] ? arr[i + 1].from : scaleMax)} - ${yOf(s.from)})`, background: s.color }} />
          ))}
          {ORES.filter((o) => o.from > 0 && o.from < scaleMax).map((o) => <b key={o.id} style={{ top: yOf(o.from) }} title={`${o.name} — с ${o.from} м`}><i className="mn-gem" style={{ '--g1': o.color, '--g2': o.glow }} />{o.from}</b>)}
          {MILESTONES.filter((x) => x.d < scaleMax && !hasClaim(learn, x.key)).map((x) => <span key={x.d} className="flag" style={{ top: yOf(x.d) }} />)}
          <span className="now" style={{ top: yOf(m.depth) }} />
        </div>
        <button ref={face} type="button" className="mn-face" style={{ '--rock': `linear-gradient(170deg, color-mix(in srgb, ${layer.color} 85%, #fff), ${layer.color} 45%, color-mix(in srgb, ${layer.color} 55%, #000))` }}
          onClick={hit} data-testid="mine-face" aria-label={`Ударить киркой. Крепость породы ${fmt(h)}, выбито ${Math.round(k * 100)}%`}>
          <div key={`r${Math.floor(m.depth * 10)}`} className={swing ? 'shake' : ''} style={{ position: 'absolute', inset: 0 }}><Rock seed={Math.floor(m.depth * 10) + 1} k={k} depth={m.depth} /></div>
          <div className="mn-lamp" style={{ opacity: 0.6 + 0.08 * level(m, 'lamp') }} />
          <span className="mn-hint">{m.depth < 1 ? 'Бейте по породе — киркой' : full ? 'склад полон — руда осыпается' : `крепость ${fmt(h)}`}</span>
          <Pickaxe key={`p${swing}`} className={`mn-pick${swing ? ' swing' : ''}`} strokeWidth={1.6} aria-hidden="true" />
          <div className="mn-hard" aria-hidden="true"><i style={{ width: `${k * 100}%` }} /></div>
          <div className="mn-rail" aria-hidden="true" />
          {Array.from({ length: carts }, (_, i) => (
            <svg key={i} className={`mn-cart${full ? ' stop' : ''}`} viewBox="0 0 48 26" style={{ '--w': `${faceW}px`, '--t': `${7 - level(m, 'cart') * 0.15}s`, animationDelay: `${-i * 2.3}s` }} aria-hidden="true" data-testid="mine-cart">
              <path d="M4 4 H44 L39 18 H9 Z" fill="#6B5A48" stroke="#2A221C" strokeWidth="1.5" />
              <path d="M10 6 Q16 0 22 5 Q28 -1 34 5 Q38 2 40 6" fill={(ORE_BY_ID[m.found[m.found.length - 1]] || ORES[0]).color} />
              <circle cx="14" cy="21" r="4" fill="#222" stroke="#999" /><circle cx="34" cy="21" r="4" fill="#222" stroke="#999" />
            </svg>
          ))}
          {fx.map((f) => (f.t === 'bit'
            ? <span key={f.id} className="mn-bit" style={{ left: f.x, top: f.y, background: f.c, '--dx': `${f.dx}px`, '--dy': `${f.dy}px` }} />
            : <span key={f.id} className="mn-pop" style={{ left: f.x, top: f.y, color: f.c }}>{f.text}</span>))}
          {flash > 0 && <span key={`f${flash}`} className="mn-flash" aria-hidden="true" />}
        </button>
      </div>
      <div className="mn-acts">
        {dyn > 0 && (
          <button type="button" className="mn-boom" disabled={!ready} onClick={boom} data-testid="mine-blast">
            <Bomb size={16} aria-hidden="true" />{ready ? 'Динамит' : `Динамит через ${Math.ceil((1 - cool) * blastCooldown(dyn))} с`}<i style={{ width: `${cool * 100}%` }} />
          </button>
        )}
      </div>

      <div className="mn-sec" data-testid="mine-orders">
        <h4><ClipboardList size={13} aria-hidden="true" /> Заказы дня</h4>
        <p>Три заказа на сегодня — жетонов вдвое больше рынка и {coinsWord(1)} в лавку за каждый. Завтра — новые.</p>
        <div className="mn-orders">
          {orders.map((o) => {
            const ore = ORE_BY_ID[o.ore]; const got = hasClaim(learn, o.key); const have = m.ores[o.ore] || 0;
            return (
              <div key={o.k} className={`mn-order${got ? ' done' : ''}`} data-testid="mine-order" data-ore={o.ore} data-done={String(got)}>
                <i className="mn-gem" style={{ '--g1': ore.color, '--g2': ore.glow }} aria-hidden="true" />
                <b>{o.n} × {ore.name}</b>
                <span>+{big(o.tokens)} жетонов · +{o.coins} {coinsWord(o.coins)}</span>
                {got ? <span className="ok"><Check size={14} aria-hidden="true" />выполнен</span>
                  : <Button small variant="secondary" disabled={have < o.n} onClick={() => deliver(o.k)} data-testid="mine-order-give">{have < o.n ? `на складе ${have} из ${o.n}` : 'Отдать'}</Button>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mn-sec" data-testid="mine-buyer">
        <h4>Скупщик</h4>
        <p>У каждой руды своя цена дня. Скупщик берёт всё, но каждый сданный сегодня кусок дешевле предыдущего: покупателей на руду не бесконечно много. Завтра цена снова полная — выгоднее сдавать понемногу каждый день.</p>
        <div className="mn-market">
          {ORES.filter((o) => m.found.includes(o.id)).map((o) => {
            const have = m.ores[o.id] || 0; const p = unitPrice(m, o.id, day); const f = dayFactor(o.id, day); const sold = soldToday(m, o.id, day);
            const ten = Math.min(10, have); const Tr = f >= 1 ? TrendingUp : TrendingDown;
            return (
              <div key={o.id} className="mn-row" data-testid="mine-market" data-ore={o.id}>
                <i className="mn-gem" style={{ '--g1': o.color, '--g2': o.glow }} aria-hidden="true" />
                <div className="mn-row-t">
                  <b>{o.name} <em>× {have}</em></b>
                  <span data-testid="mine-price">кусок — {fmt(p)} жет. <span className={f >= 1 ? 'up' : 'down'}><Tr size={12} aria-hidden="true" />{f >= 1 ? '+' : '−'}{Math.round(Math.abs(f - 1) * 100)}% сегодня</span>{sold ? ` · сдано ${sold}` : ''}</span>
                </div>
                <Button small variant="secondary" disabled={!have} onClick={() => sell(o.id, ten)} data-testid="mine-sell-some">{ten ? `${ten}: +${quote(m, o.id, ten, day)}` : '—'}</Button>
                {have > 10 && <Button small variant="secondary" onClick={() => sell(o.id, have)} data-testid="mine-sell-all">все: +{big(quote(m, o.id, have, day))}</Button>}
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: 12 }}>Жетоны — в монеты лавки. Каждая следующая монета за день дороже: скупщику монеты тоже не бесплатны. Не больше {EXCHANGE.perDay} в день.</p>
        <div className="mn-ladder" aria-label={`Цены монет сегодня: ${Array.from({ length: EXCHANGE.perDay }, (_, i) => exchangeCost(i)).join(', ')} жетонов`} data-testid="mine-ladder">
          {Array.from({ length: EXCHANGE.perDay }, (_, i) => <span key={i} className={i < done ? 'done' : i === done ? 'next' : ''} style={{ height: `${(exchangeCost(i) / exchangeCost(EXCHANGE.perDay - 1)) * 100}%` }}><small>{exchangeCost(i)}</small></span>)}
        </div>
        <Button wide icon={Coins} disabled={cost == null || m.tokens < cost} onClick={trade} data-testid="mine-exchange">
          {cost == null ? `Сегодня обменяно ${EXCHANGE.perDay} из ${EXCHANGE.perDay} — завтра снова` : `1 ${coinsWord(1)} за ${cost} жетонов · сегодня ${done} из ${EXCHANGE.perDay}`}</Button>
        {msg && <div className="mn-msg" role="alert">{msg}</div>}
      </div>

      <div className="mn-sec">
        <h4>Улучшения</h4>
        <div className="mn-ups">
          {UPGRADES.map((u) => {
            const lv = level(m, u.id); const Ic = ICON[u.id]; const c = upgradeCost(u.id, lv); const top = lv >= u.max;
            return (
              <div key={u.id} className="mn-up" data-testid="mine-upgrade" data-id={u.id} data-level={lv}>
                <Ic size={26} aria-hidden="true" />
                <b>{u.name}<em>ур. {lv}</em></b>
                <span>{u.what(top ? lv : lv + 1)}</span>
                <Button small variant="secondary" disabled={top || m.tokens < c} onClick={() => up(u.id)} data-testid="mine-buy">{top ? 'На пределе' : `${big(c)} жетонов`}</Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
