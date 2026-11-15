/* УРОК ВО ВЕСЬ ЭКРАН: шаги, задания всех видов, плашка ответа, итоги (Runner). Вынесен из src/learn.jsx отдельным
   ленивым файлом (docs/mechanics.md, «Приветствие и загрузка»): всё, что нужно только уроку, — учебник с формулами
   (KaTeX), графики, мини-игры, лента «Истории» — грузится, когда урок начинается, а не до появления Пути.
   Общие с Путём вещи (раскладка CSS, значки видов урока, плашка гостя) — из src/learn.jsx. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ArrowLeft, Zap, Check, Calculator, BookOpenText, Delete, RotateCcw, Clock, Scale, Hourglass, Ticket, TrendingUp, CircleCheck, Medal, ArrowLeftRight, Handshake, Coffee, Wallet, Link,
  Utensils, Boxes, Users, Snowflake, ArrowDownToLine, ArrowUpToLine, Flag, Croissant, Landmark, Radio, SkipForward, ChartSpline, Factory, Bike,
} from 'lucide-react';
// огонёк серии на итогах — общий с итогами особых уроков
import { StreakBurst } from './learn-extra-result.jsx';
import { track, trackOnce } from './lib/client.js';
import { Audio } from './MacroSimulator.jsx';
import { Blocks, Inline, ChartSvg, ChartLegend } from './textbook.jsx';
import { CHARTS, chartDefaults } from './textbook/charts.js';
import { afterPathAnswer, dropFromReview } from './textbook/review-sync.js';
import { activeClock, tickClock, actClock } from './learn/active-time.js';
import {
  UNITS, LEVEL_BY_ID, levelUnits, LESSON_BY_ID, KIND_LABEL, SHIFT_CURVES, LESSON_KIND, GAME_KINDS, SELF_CHECK, OPEN_MIN, buildLesson, buildUnitCheck, buildLevelCheck, buildPractice,
  practiceIds, canPractice, check, ready, answerText, unitFor, buildPlacement, placementOpened, placementFailed, retryOf, retryWorth, gameNeed, gameRule, buildFix, EXAM_LETTERS,
  buildLevelReview,
} from './learn/course.js';
import {
  startLesson, recordAttempt, addMistake, resolveMistake, addHinted, clearHinted, finishLesson, passUnit, lessonDone, lessonXp, streak, XP, setPlacement, dayOf, recordSeen, recordBest,
  DIAMOND_ACCURACY, streakBonus, gameXp, syncStreak, streakNow, markFixed, finishLevelReview, levelConfirmed, LEVEL_REVIEW_OK,
} from './textbook/learn-state.js';
import { runCoins, runKey, earn, settle, indexed, hasClaim, deskOf, themeOf, boostActive } from './learn/rewards.js';
import { DeskDecor, CradleStand, CRADLE_CSS, tellAnswer, DESK_QUERY } from './learn-decor.jsx';
import { LessonSkin, SKINS, SKIN_CSS, skinTheme, skinVars, answerSound } from './learn-skins.jsx';
import { pickPhrase, situation, endKind } from './learn/voice.js';
import { lessonOpts, weakLessons, courseCtx } from './learn/program.js';
import { GainsList } from './learn-rewards.jsx';
import { saveResume, dropResume } from './learn/resume.js';
import { Mascot } from './mascot.jsx';
import { markTerms, termTitle, termText, termFormula, isWorldTerm } from './learn/terms.js';
import { PLAY_CSS, CurveEx, PriceEx, PointEx, TilesEx, TimerBar, GameRound, WalletRound, WordDeck, Calculator as CalcPad } from './learn-play.jsx';
import { Feed, FEED_CSS } from './learn-feed.jsx';
import { DiscoverDay, MODEL_CSS, DOMINO_CSS, DominoEx } from './learn-model.jsx';
import { partsOfLesson } from './learn/model.js';
import { callbackFor } from './learn/callbacks.js';
import { symbolsOf } from './textbook/symbols.js';
import { inCrowns, sceneInCrowns } from './learn/money.js';
import { ReportFlag, REPORT_CSS, exerciseContext, flatText } from './learn-report.jsx';
import { DsRoot, Button, IconButton, Card, Heading, AnswerBar, Sheet } from './ds.jsx';
import { ArtStyle, Guilloche, Rosette, ProgressChart, InflaMeter, CoinShower, CountUp, useReducedMotion, useMedia } from './ds-art.jsx';
import { placeOf, unitColor, DIAMOND_COLOR, dsThemeId } from './ds-tokens.js';
import { GRAPH_BY_CHART, openGraph } from './learn/graphs.js';
import { RaceOffer } from './learn-friends.jsx';
import { Sketch, SKETCH_CSS, SKETCH_QUERY } from './learn-sketch.jsx';
import { Antistress, antistressHidden, antistressBlocked } from './learn-antistress.jsx';
import { antistressUnlocked } from './learn/antistress.js';
import { friendsState } from './lib/friends-store.js';
import { raceOffer } from './learn/friends.js';
import { plural } from './lib/plural.js';
import { Zoomable } from './zoom-view.jsx';
import { CSS, GuestSave, nextLevelText, bareTitle } from './learn.jsx';

// ответы для e2e-тестов: только если тест сам включил флаг
const testAnswer = (inst) => {
  if (typeof window === 'undefined' || !window.__INFLATIA_TEST__) return undefined;
  switch (inst.kind) {
    case 'choice': case 'gap': return JSON.stringify(inst.options.find((o) => o.correct).key);
    case 'tf': return JSON.stringify(inst.answer);
    case 'match': return JSON.stringify(Object.fromEntries(inst.left.map((l) => [l.key, l.key])));
    case 'sort': return JSON.stringify(Object.fromEntries(inst.items.map((it) => [it.key, it.bin])));
    case 'exam': return JSON.stringify(inst.form === 'match' ? { form: 'match', map: Object.fromEntries(inst.items.map((it) => [it.key, it.bin])) }
      : inst.form === 'one' ? { form: 'one', key: inst.options.find((o) => o.correct).key } : { form: 'pick', keys: inst.options.filter((o) => o.correct).map((o) => o.key) });
    case 'calc': return JSON.stringify(String(Math.round(inst.answer * 100) / 100).replace('.', ','));
    case 'shift': return JSON.stringify(inst.answer);
    case 'news': return JSON.stringify(inst.expect);
    case 'tiles': return JSON.stringify(inst.solution);
    case 'curve': case 'price': case 'point': return JSON.stringify(inst.answer);
    case 'swipe': case 'rush': case 'wallet': return JSON.stringify('game');
    case 'open': return JSON.stringify('open');
    case 'domino': return JSON.stringify(inst.chain);
    default: return undefined;
  }
};
const noopCtx = { progress: { problems: {}, read: {} }, go: () => {}, onAnswer: () => {} };
const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* нет вибрации */ } };
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };


/* ------------------------------ ГРАФИК И КАРТИНКА ШАГА ------------------------------ */
/* Шаг с движением: anim="px=3" — график сам переходит от исходного положения к новому, держит
   его и возвращается, по кругу; прежняя линия остаётся бледной. Без анимаций — сразу новое. */
const parseAnim = (s) => Object.fromEntries(String(s).split(/[\s,]+/).filter(Boolean).map((kv) => { const [k, x] = kv.split('='); return [k, Number(x)]; }));
const ANIM = { hold: 900, go: 1300, stay: 2600, back: 900 };
const easeIO = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
function useAnimValues(type, attrs) {
  const reduced = useReducedMotion();
  const anim = attrs && attrs.anim;
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!anim || reduced) return undefined;
    let raf = 0; let last = 0; const t0 = performance.now();
    const cyc = ANIM.hold + ANIM.go + ANIM.stay + ANIM.back;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      const e = (now - t0) % cyc;
      setK(e < ANIM.hold ? 0 : e < ANIM.hold + ANIM.go ? easeIO((e - ANIM.hold) / ANIM.go)
        : e < cyc - ANIM.back ? 1 : 1 - easeIO((e - cyc + ANIM.back) / ANIM.back));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anim, reduced]);
  if (!anim) return null;
  const to = parseAnim(anim); const t = reduced ? 1 : k;
  return Object.fromEntries(Object.entries(chartDefaults(type, attrs)).map(([id, x]) => [id, id in to ? x + (to[id] - x) * t : x]));
}
/* картинка карточки: график, а если для него есть «Разбор графика» (src/learn/graphs.js) — под ним
   кнопка «Разобрать график по шагам»: разбор открывается поверх урока, без опыта */
function CardPicture({ c }) {
  if (!c.chart) return c.pic ? <Pic name={c.pic} /> : null;
  const tour = GRAPH_BY_CHART[c.chart];
  return (
    <>
      <MiniChart type={c.chart} attrs={c.attrs} zoom />
      {tour && (
        <div style={{ textAlign: 'center', margin: '-2px 0 10px' }}>
          <button type="button" className="ln-graph-btn" data-testid="graph-open" data-graph={tour.id} onClick={() => { Audio.play('paper'); openGraph(tour.id); }}>
            <ChartSpline size={16} aria-hidden="true" />Разобрать график по шагам
          </button>
        </div>
      )}
    </>
  );
}
/* «Куда сдвинется?»: новое положение кривой — не сразу, а плавным переходом от того, что на экране
   (docs/mechanics.md); перебили новым выбором — едет от того места, где была. «Уменьшить движение» — сразу. */
const TWEEN_MS = 1100;
function useTweened(v, on) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(v);
  const from = useRef(v);
  const key = JSON.stringify(v);
  const lastKey = useRef(key);
  useEffect(() => {
    // без перехода (шаги урока со своим движением) — ничего не держим и лишний раз не перерисовываем
    if (!on || key === lastKey.current) return undefined;
    lastKey.current = key;
    if (reduced) { from.current = v; setShown(v); return undefined; }
    const a = from.current; const t0 = performance.now(); let raf = 0;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / TWEEN_MS); const e = easeIO(k);
      const mid = Object.fromEntries(Object.entries(v).map(([id, x]) => [id, typeof x === 'number' && typeof a[id] === 'number' ? a[id] + (x - a[id]) * e : x]));
      from.current = mid; setShown(mid);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, on, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return on ? shown : v;
}
function MiniChart({ type, attrs, values = null, tween = false, zoom = false }) {
  const def = CHARTS[type];
  const moving = useAnimValues(type, attrs);
  const target = def ? { ...chartDefaults(type, attrs), ...moving, ...values } : {};
  const v = useTweened(target, tween);
  if (!def) return null;
  // на Пути деньги — в кронах (src/learn/money.js)
  // под графиком — ключ: что значит каждая линия, простыми словами
  const scene = sceneInCrowns(def.build(attrs, v));
  const legend = def.legend ? <ChartLegend items={def.legend(attrs, v)} /> : null;
  // картинка карточки: касание — на весь экран, с приближением (docs/mechanics.md, «Картинки на весь экран»)
  if (zoom) {
    return (
      <Zoomable title={def.title} testid="card-chart-zoom" style={{ maxWidth: 360, margin: '8px auto' }} view={() => <><ChartSvg scene={scene} />{legend}</>}>
        <ChartSvg scene={scene} />{legend}
      </Zoomable>
    );
  }
  return <div style={{ maxWidth: 360, margin: '8px auto' }}><ChartSvg scene={scene} />{legend}</div>;
}
const PICS = {
  clock: Clock, scale: Scale, hourglass: Hourglass, ticket: Ticket, 'trending-up': TrendingUp, 'circle-check': CircleCheck, medal: Medal,
  'arrow-left-right': ArrowLeftRight, handshake: Handshake, coffee: Coffee, wallet: Wallet, link: Link, utensils: Utensils, boxes: Boxes, users: Users, factory: Factory, bike: Bike,
  snowflake: Snowflake, 'arrow-down-to-line': ArrowDownToLine, 'arrow-up-to-line': ArrowUpToLine, croissant: Croissant, landmark: Landmark, radio: Radio, flag: Flag,
};
// картинка шага — значок в медальоне с розеткой, как клеймо на купюре
function Pic({ name }) {
  const Icon = PICS[name];
  if (!Icon) return null;
  return <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }} aria-hidden="true"><Rosette size={132} opacity={0.45}><Icon size={50} color="var(--u-ink)" strokeWidth={1.6} /></Rosette></div>;
}

/* ------------------------------ УПРАЖНЕНИЯ ------------------------------ */
// «___» в тексте вопроса → выбранная плитка
// пропуск «___» в условии: подставляем выбранный вариант узлами (с формулами), а не сырым текстом
const fillBlank = (blocks, word) => {
  const fill = (x) => {
    if (Array.isArray(x)) return x.flatMap((n) => {
      if (n && n.t === 'text' && n.v.includes('___')) {
        const k = n.v.indexOf('___');
        return [{ t: 'text', v: n.v.slice(0, k) }, ...(typeof word === 'string' ? [{ t: 'text', v: word }] : [{ t: 'b', c: word }]), { t: 'text', v: n.v.slice(k + 3) }];
      }
      return [fill(n)];
    });
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fill(v)]));
    return x;
  };
  return fill(blocks);
};

/* Открытый вопрос можно пропустить: писать ответ — не обязанность, а разбор всё равно откроется.
   Пропуск ошибкой не считается — у открытого вопроса неверного ответа нет. */
function OpenSkip({ onSkip }) {
  return (
    <button type="button" className="ln-skip" data-testid="open-skip" onClick={() => { Audio.play('paper'); onSkip(); }}>
      <SkipForward size={15} aria-hidden="true" /> Пропустить и посмотреть разбор
    </button>
  );
}
/* Калькулятор у выбора с числовыми вариантами: «Выбрать ответ» отмечает БЛИЖАЙШИЙ вариант, если
   он отличается от результата не больше чем на 1% (округление); 6050 не превращается в 6000, хотя
   и они близки. Подходящего варианта нет — так и сказано: ответ не выбирается за ученика. */
function ChoiceCalc({ options, numOf, onPick }) {
  const [miss, setMiss] = useState(null);
  return (
    <>
      <CalcPad useLabel="Выбрать ответ" onUse={(v) => {
        const x = Number(v.replace(',', '.'));
        const near = options.map((o) => ({ o, d: Math.abs(numOf(o) - x) })).sort((a, b) => a.d - b.d)[0];
        if (near && near.d <= 0.01 * Math.max(1, Math.abs(x))) { setMiss(null); onPick(near.o.key); } else setMiss(v);
      }} />
      {miss != null && <div className="ds-sub" style={{ fontSize: 14, textAlign: 'center', marginTop: 6 }} role="status" data-testid="calc-miss">Варианта {miss} среди ответов нет — проверьте расчёт.</div>}
    </>
  );
}
/* Перетаскивание слова в «Соедините» (docs/mechanics.md, «Задания урока»): пальцем или мышью. Сдвиг больше 8 px —
   перетаскивание: копия слова едет за пальцем (слой в корне урока, без касаний), место под пальцем подсвечено;
   отпустили — onDrop({ row }) над строкой, onDrop({ bank: true }) над банком. Без сдвига — обычное нажатие. */
const DRAG_MIN = 8;
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const row = el && el.closest('[data-drop-row]');
  if (row) return { row: row.getAttribute('data-drop-row'), el: row };
  const bank = el && el.closest('[data-drop-bank]');
  return bank ? { bank: true, el: bank } : null;
}
function DragWord({ as: Tag = 'button', label, disabled = false, onDrop, className = '', children, ...rest }) {
  const ref = useRef(null);
  const st = useRef(null);
  const [ghost, setGhost] = useState(null);
  const hover = (t) => {
    const prev = st.current && st.current.over;
    if (prev && (!t || prev !== t.el)) prev.classList.remove('drop');
    if (t) t.el.classList.add('drop');
    if (st.current) st.current.over = t ? t.el : null;
  };
  const end = (e, drop) => {
    const s = st.current; st.current = null;
    if (!s) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.drag) {
      if (s.over) s.over.classList.remove('drop');
      setGhost(null);
      // после перетаскивания браузер может прислать «нажатие» сразу за отпусканием — его глушим, следующее — уже нет
      const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener('click', kill, true); };
      window.addEventListener('click', kill, true); setTimeout(() => window.removeEventListener('click', kill, true), 0);
      const t = drop ? dropTarget(e.clientX, e.clientY) : null;
      if (t) onDrop(t.row ? { row: t.row } : { bank: true });
    }
  };
  const handlers = disabled ? {} : {
    onPointerDown: (e) => {
      if (e.button > 0 || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      st.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, drag: false, over: null };
    },
    onPointerMove: (e) => {
      const s = st.current; if (!s || s.id !== e.pointerId) return;
      if (!s.drag && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < DRAG_MIN) return;
      if (!s.drag) { s.drag = true; try { ref.current.setPointerCapture(e.pointerId); } catch { /* уже отпущен */ } Audio.play('tick'); }
      e.preventDefault();
      s.x = e.clientX; s.y = e.clientY;
      setGhost({ x: e.clientX - s.dx, y: e.clientY - s.dy, w: s.w });
      hover(dropTarget(e.clientX, e.clientY));
      /* у края урока — прокрутка: нижняя строка на телефоне может быть за экраном; пока палец у края, урок едет */
      const box = ref.current && ref.current.closest('.ln-body');
      if (box && !s.raf) {
        const tick = () => {
          const cur = st.current; if (!cur || !cur.drag) return;
          const r = box.getBoundingClientRect();
          const v = cur.y > r.bottom - 56 ? 10 : cur.y < r.top + 56 ? -10 : 0;
          if (v) { box.scrollTop += v; hover(dropTarget(cur.x, cur.y)); }
          cur.raf = requestAnimationFrame(tick);
        };
        s.raf = requestAnimationFrame(tick);
      }
    },
    onPointerUp: (e) => end(e, true),
    onPointerCancel: (e) => end(e, false),
  };
  const host = ref.current && (ref.current.closest('.ln-overlay') || document.body);
  return (
    <>
      <Tag ref={ref} className={`${className}${ghost ? ' dragging' : ''}`} disabled={Tag === 'button' ? disabled : undefined} {...rest} {...handlers}>{children}</Tag>
      {ghost && host && createPortal(<span className="ds-opt ln-m2-ghost" data-testid="match-ghost" aria-hidden="true" style={{ left: ghost.x, top: ghost.y, minWidth: Math.min(ghost.w, 260) }}>{label}</span>, host)}
    </>
  );
}

function ExerciseView({ inst, resp, setResp, locked, fb, ctx = noopCtx, onSubmit = () => {} }) {
  const pick = (v) => { if (!locked) { Audio.play('tick'); setResp(v); } };
  const optClass = (key, correct) => (!fb ? '' : correct ? 'right' : key === resp && !fb.ok ? 'wrong' : '');
  switch (inst.kind) {
    case 'choice': {
      // варианты — числа: задача на расчёт, и калькулятор нужен так же, как в «Расчёте»
      // «6 050 крон» — одно число: пробелы между разрядами (и неразрывные) не разрывают его
      const numOf = (o) => { const m = String(o.raw).replace('−', '-').replace(/(\d)[ \u00A0\u202F\u2009](?=\d{3}\b)/g, '$1').match(/^-?\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
      const numeric = inst.options.every((o) => numOf(o) != null);
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {numeric && !locked && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <button type="button" className="ds-chip" aria-pressed={!!inst._calc} data-testid="calc-open" onClick={() => { Audio.play('tick'); inst._setCalc(!inst._calc); }}>
                <Calculator size={15} style={{ verticalAlign: -3, marginRight: 4 }} aria-hidden="true" />Калькулятор
              </button>
            </div>
          )}
          {numeric && inst._calc && !locked && (
            <div style={{ marginBottom: 12 }}>
              <ChoiceCalc options={inst.options} numOf={numOf} onPick={(key) => { pick(key); inst._setCalc(false); }} />
            </div>
          )}
          {inst.options.map((o) => (
            <button key={o.key} type="button" className={`ds-opt ${optClass(o.key, o.correct)}`} aria-pressed={resp === o.key} data-key={o.key} disabled={locked}
              onClick={() => pick(o.key)}><Inline nodes={o.text} ctx={ctx} /></button>
          ))}
        </div>
      );
    }
    case 'gap': {
      const chosen = inst.options.find((o) => o.key === resp);
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={fillBlank(inst.prompt, chosen ? chosen.text : '_____')} ctx={ctx} /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {inst.options.map((o) => (
              <button key={o.key} type="button" className={`ds-chip ${optClass(o.key, o.correct)}`} aria-pressed={resp === o.key} data-key={o.key} disabled={locked}
                onClick={() => pick(o.key)}><Inline nodes={o.text} ctx={ctx} /></button>
            ))}
          </div>
        </div>
      );
    }
    case 'tf':
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[[true, 'Верно'], [false, 'Неверно']].map(([v, l]) => (
              <button key={l} type="button" className={`ds-opt ${!fb ? '' : v === inst.answer ? 'right' : v === resp ? 'wrong' : ''}`} style={{ textAlign: 'center', fontWeight: 700 }}
                aria-pressed={resp === v} data-key={String(v)} disabled={locked} onClick={() => pick(v)}>{l}</button>
            ))}
          </div>
        </div>
      );
    case 'shift': {
      const curves = SHIFT_CURVES[inst.chart];
      const shown = fb ? inst.answer : resp;
      const ctl = shown ? CHARTS[inst.chart].controls(inst.chartAttrs).find((c) => c.id === curves[shown[0]].control) : null;
      const values = ctl ? { [ctl.id]: Math.round(ctl.max / 2) * (shown[1] === '+' ? 1 : -1) } : null;
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          <MiniChart type={inst.chart} attrs={inst.chartAttrs} values={values} tween />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {inst.choices.map((c) => (
              <button key={c.key} type="button" className={`ds-opt ${optClass(c.key, c.key === inst.answer)}`} style={{ textAlign: 'center', margin: 0 }}
                aria-pressed={resp === c.key} data-key={c.key} disabled={locked} onClick={() => pick(c.key)}>
                {c.button}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'news': {
      const r = resp || {};
      return (
        <div>
          <div className="tb-news" style={{ marginTop: 0 }}><div className="ems-mono tb-news-mast">ЭКОНОМИЧЕСКІЙ ВѢСТНИКЪ</div><div className="ems-serif tb-news-head">{inst.headline}</div></div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {inst.vars.map((v) => (
            <div key={v.key} className="ln-news-row">
              <span className="ln-news-label">{v.label}</span>
              <span className="ln-news-btns">
                {[['+', '↑'], ['-', '↓'], ['0', '—']].map(([d, l]) => (
                  <button key={d} type="button" className={`ds-chip ${fb && inst.expect[v.key] === d ? 'right' : ''}`} aria-pressed={r[v.key] === d} data-var={v.key} data-dir={d}
                    aria-label={`${v.label}: ${({ '+': 'вверх', '-': 'вниз', 0: 'не изменится' })[d]}`} disabled={locked}
                    onClick={() => pick({ ...r, [v.key]: d })}>{l}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case 'match': {
      /* «Соедините» как «вставьте слово» (docs/mechanics.md, «Задания урока»): строки-определения с пустым местом,
         слова — банком сверху. Подсвечено одно пустое место: нажали слово — оно встало туда, подсветка — к
         следующему пустому. Нажали заполненное место — слово вернулось в банк, место подсвечено. Ответ — как
         раньше: { термин → определение }. */
      const r = resp || {};
      const [sel, setSel] = [inst._sel, inst._setSel];
      const termIn = Object.fromEntries(Object.entries(r).map(([l, rr]) => [rr, l]));
      const empty = inst.right.filter((x) => !(x.key in termIn)).map((x) => x.key);
      const active = sel && empty.includes(sel) ? sel : empty[0] || null;
      const bank = inst.left.filter((l) => !(l.key in r));
      const checked = !!(fb && !fb.empty);
      const place = (l) => { if (!active) return; Audio.play('tick'); setResp({ ...r, [l]: active }); setSel(null); };
      const slot = (x) => {
        Audio.play('tick');
        if (x.key in termIn) { const n = { ...r }; delete n[termIn[x.key]]; setResp(n); }
        setSel(x.key);
      };
      // перетащили слово l (из банка или с места from) — на строку: занятое слово уходит в банк или меняется местами
      const dropWord = (l, from, t) => {
        if (locked) return;
        const n = { ...r };
        if (t.bank) { if (from) { delete n[l]; setResp(n); setSel(from); Audio.play('tick'); } return; }
        if (t.row === from) return;
        const other = termIn[t.row];
        if (other) { if (from) n[other] = from; else delete n[other]; }
        n[l] = t.row;
        Audio.play('tick'); setResp(n); setSel(null);
      };
      const raw = (key) => { const l = inst.left.find((x) => x.key === key); return (l && (l.raw || '')) || ''; };
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {/* пары на время: по нулю ответ уходит на проверку таким, какой есть */}
          {inst.timer && <TimerBar seconds={inst.timer} running={!locked} onEnd={() => onSubmit(inst._resp.current || {})} />}
          {!checked && <div className="ln-m2-how" data-testid="match-how">Нажмите или перетащите слово на место. Нажмите место со словом — слово вернётся.</div>}
          {(bank.length > 0 || !checked) && <div className="ln-m2-bank" data-testid="match-bank" data-drop-bank="1">
            {bank.map((l) => (
              <DragWord key={l.key} type="button" className="ds-opt ln-m2-word" data-side="left" data-key={l.key} disabled={locked || !active} label={l.raw || <Inline nodes={l.text} ctx={ctx} />}
                onClick={() => place(l.key)} onDrop={(t) => dropWord(l.key, null, t)}>
                <Inline nodes={l.text} ctx={ctx} /></DragWord>
            ))}
            {!bank.length && <span className="ln-m2-bank-done">Все слова на местах — можно проверять.</span>}
          </div>}
          <div className="ln-m2-rows">{inst.right.map((x) => {
            const t = termIn[x.key];
            const verdict = checked ? (t === x.key ? 'ok' : 'bad') : null;
            const fix = verdict === 'bad' ? inst.left.find((l) => l.key === x.key) : null;
            const on = !locked && active === x.key;
            return (
              <button key={x.key} type="button" className={`ln-m2-row${on ? ' on' : ''}`} data-side="right" data-key={x.key} data-drop-row={locked ? undefined : x.key} data-verdict={verdict || undefined}
                aria-label={`${t ? `Слово: ${inst.left.find((l) => l.key === t).raw || ''}` : 'Пустое место'}. ${x.raw || ''}`} disabled={locked} onClick={() => slot(x)}>
                {t ? (
                  <DragWord as="span" className="ln-m2-slot full" data-testid="match-tag" disabled={locked} label={raw(t) || <Inline nodes={inst.left.find((l) => l.key === t).text} ctx={ctx} />}
                    onDrop={(d) => dropWord(t, x.key, d)}>
                    <Inline nodes={inst.left.find((l) => l.key === t).text} ctx={ctx} /></DragWord>
                ) : <span className="ln-m2-slot" data-testid="match-empty">{on ? 'слово сюда' : '…'}</span>}
                <span className="ln-m2-def"><Inline nodes={x.text} ctx={ctx} /></span>
                {verdict ? <span className="ln-m2-mark" aria-hidden="true">{verdict === 'ok' ? '✓' : '✗'}</span> : <span />}
                {fix && <span className="ln-m2-fix" data-testid="match-fix">верно: <Inline nodes={fix.text} ctx={ctx} /></span>}
              </button>
            );
          })}</div>
        </div>
      );
    }
    /* задание в формате экзамена: метка «ЕГЭ · задание N», пронумерованные пункты, ответ — цифрами, как в бланке */
    case 'exam': {
      const tag = `${inst.test}${inst.no ? ` · задание ${inst.no}` : ''}`;
      const sel = inst.form === 'pick' ? (Array.isArray(resp) ? resp : []) : [];
      const toggle = (key) => pick(sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key]);
      const r = inst.form === 'match' ? (resp || {}) : null;
      // клетки бланка: выбранные номера по возрастанию, у соответствия — цифра под каждой буквой
      const cells = inst.form === 'match' ? inst.items.map((it) => (r[it.key] ? String(inst.bins.indexOf(r[it.key]) + 1) : ''))
        : inst.form === 'one' ? [resp ? String(inst.options.findIndex((o) => o.key === resp) + 1) : '']
          : inst.options.map((o, k) => (sel.includes(o.key) ? String(k + 1) : null)).filter(Boolean);
      const mark = (o) => (!fb ? '' : o.correct ? 'right' : (inst.form === 'one' ? resp === o.key : sel.includes(o.key)) ? 'wrong' : '');
      return (
        <div className="ln-exam" data-form={inst.form}>
          <div className="ln-exam-head"><span className="ln-exam-tag" data-testid="exam-tag">{tag}</span><span className="ds-faint">в формате экзамена</span></div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {inst.form === 'match' ? (
            <>
              <div className="ln-exam-bins">{inst.bins.map((b, i) => <span key={b}><b>{i + 1}</b>{b}</span>)}</div>
              {inst.items.map((it, k) => (
                <div key={it.key} className={`ln-exam-row ${fb ? (r[it.key] === it.bin ? 'right' : 'wrong') : ''}`}>
                  <span className="ln-exam-no">{EXAM_LETTERS[k]}</span>
                  <span className="ln-exam-text"><Inline nodes={it.text} ctx={ctx} /></span>
                  <span className="ln-exam-digits">{inst.bins.map((b, i) => (
                    <button key={b} type="button" className="ln-exam-digit" aria-label={`${EXAM_LETTERS[k]} — ${i + 1}`} aria-pressed={r[it.key] === b} data-item={it.key} data-bin={b} disabled={locked}
                      onClick={() => pick({ ...r, [it.key]: b })}>{i + 1}</button>
                  ))}</span>
                </div>
              ))}
            </>
          ) : inst.options.map((o, k) => {
            const on = inst.form === 'one' ? resp === o.key : sel.includes(o.key);
            return (
              <button key={o.key} type="button" className={`ds-opt ln-exam-opt ${mark(o)}`} aria-pressed={on} data-pick={o.key} disabled={locked}
                onClick={() => (inst.form === 'one' ? pick(o.key) : toggle(o.key))}>
                <span className="ln-exam-no">{k + 1}</span><span style={{ minWidth: 0 }}><Inline nodes={o.text} ctx={ctx} /></span>
              </button>
            );
          })}
          <div className="ln-exam-form" data-testid="exam-form" aria-label={`Ответ: ${cells.join('') || 'пусто'}`}>
            <span>Ответ:</span>
            {inst.form === 'match'
              ? <span className="ln-exam-grid">{inst.items.map((it, k) => <span key={it.key}><small>{EXAM_LETTERS[k]}</small><b>{cells[k] || ' '}</b></span>)}</span>
              : <span className="ln-exam-grid">{(cells.length ? cells : ['']).map((c, k) => <span key={k}><b>{c || ' '}</b></span>)}</span>}
          </div>
        </div>
      );
    }
    case 'sort': {
      const r = resp || {};
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {inst.items.map((it) => (
            <div key={it.key} style={{ border: `2px solid ${fb ? (r[it.key] === it.bin ? 'var(--ds-ok)' : 'var(--ds-bad)') : 'var(--ds-rule2)'}`, borderRadius: 14, padding: '9px 11px', margin: '9px 0', background: 'var(--ds-card)' }}>
              <div style={{ fontSize: 14.5, marginBottom: 4 }}><Inline nodes={it.text} ctx={ctx} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {inst.bins.map((b) => (
                  <button key={b} type="button" className="ds-chip" style={{ fontSize: 13, padding: '6px 10px' }} aria-pressed={r[it.key] === b} data-item={it.key} data-bin={b} disabled={locked}
                    onClick={() => pick({ ...r, [it.key]: b })}>{b}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'calc': {
      const val = resp || '';
      const press = (k) => { if (locked) return; Audio.play('tick'); if (k === 'del') setResp(val.slice(0, -1)); else if (val.length < 10) setResp(val + k); };
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          {/* поле ответа и «Ответ / Калькулятор» — одной строкой: на телефоне задача и клавиши помещаются на экран */}
          <div className="ln-calc-row">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input value={val} onChange={(e) => !locked && setResp(e.target.value.replace(/[^0-9.,\-−/]/g, '').slice(0, 10))} inputMode="none" aria-label="Ответ числом"
                className="ds-field ds-num" style={{ width: 132, fontSize: 22, textAlign: 'center', padding: '6px 8px' }} />
              {inst.unit && <span style={{ fontSize: 15, color: 'var(--ds-ink2)' }} data-testid="calc-unit">{unitFor(inst, val)}</span>}
            </span>
            {!locked && (
              <span style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="Способ ввода">
                <button type="button" className="ds-chip" style={{ margin: 0 }} aria-pressed={!inst._calc} onClick={() => inst._setCalc(false)}>Ответ</button>
                <button type="button" className="ds-chip" style={{ margin: 0 }} aria-pressed={!!inst._calc} data-testid="calc-open" onClick={() => { Audio.play('tick'); inst._setCalc(true); }}>
                  <Calculator size={15} style={{ verticalAlign: -3, marginRight: 4 }} aria-hidden="true" />Калькулятор
                </button>
              </span>
            )}
          </div>
          {inst._calc && !locked ? <CalcPad onUse={(v) => { setResp(v.slice(0, 10)); inst._setCalc(false); }} /> : (
            <div className="ln-numpad" role="group" aria-label="Цифровая клавиатура">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((k) => <button key={k} type="button" className="ds-key" disabled={locked} onClick={() => press(k)}>{k}</button>)}
              <button type="button" className="ds-key" aria-label="Стереть" disabled={locked} onClick={() => press('del')}><Delete size={20} /></button>
              <button type="button" className="ds-key" style={{ gridColumn: 'span 3', fontSize: 15 }} disabled={locked} onClick={() => press(val.startsWith('-') ? '' : '-')}
                aria-label="Минус">{val.startsWith('-') ? 'минус уже есть' : '− минус'}</button>
            </div>
          )}
        </div>
      );
    }
    // открытый вопрос: свой ответ словами, потом — разбор (неверного ответа нет)
    case 'open': {
      const val = resp || '';
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          <textarea className="ds-field" data-testid="open-answer" value={val} disabled={locked} rows={5} maxLength={600}
            onChange={(e) => setResp(e.target.value)} aria-label="Ваш ответ" placeholder="Как бы вы поступили и почему? Пара предложений — своими словами."
            style={{ width: '100%', fontSize: 16, lineHeight: 1.45, resize: 'vertical', minHeight: 120 }} />
          {!locked && val.trim().length < OPEN_MIN && <div className="ds-sub" style={{ fontSize: 13, marginTop: 4 }}>Ещё пару слов — и можно отвечать.</div>}
        </div>
      );
    }
    case 'tiles': case 'curve': case 'price': case 'point': {
      const View = { tiles: TilesEx, curve: CurveEx, price: PriceEx, point: PointEx }[inst.kind];
      return (
        <div>
          <div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>
          <View inst={inst} resp={resp} setResp={(v) => !locked && setResp(v)} locked={locked} fb={fb} />
        </div>
      );
    }
    case 'domino':
      // цепочка собрана — задание уходит на проверку само
      return <DominoEx inst={inst} resp={resp} setResp={(v) => !locked && setResp(v)} locked={locked} fb={fb} onSubmit={onSubmit}
        prompt={<div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>} />;
    case 'wallet':
      return (
        <div>
          <div className="ds-h2" style={{ marginBottom: 6 }}>{inst.title}</div>
          <WalletRound inst={inst} locked={locked} result={resp} best={inst._best || 0} intro={<div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>}
            onDone={(r) => { setResp(r); onSubmit(r); }} />
        </div>
      );
    case 'swipe': case 'rush': {
      return (
        <div>
          <div className="ds-h2" style={{ marginBottom: 6 }}>{inst.title}</div>
          {/* игра сама решает, когда она окончена, — и сразу уходит на проверку */}
          <GameRound inst={inst} locked={locked} result={resp} best={inst._best || 0} intro={<div className="ln-prompt ds-text tb-body"><Blocks blocks={inst.prompt} ctx={ctx} /></div>}
            onDone={(r) => { setResp(r); onSubmit(r); }} />
        </div>
      );
    }
    default: return null;
  }
}
// подпись повтора: что вернулось вместо задачи с ошибкой
const RETRY_TEXT = {
  numbers: 'Похожая задача с новыми числами — решите её сами.',
  sibling: 'Похожий вопрос на ту же тему.',
  same: 'Эта задача уже была — попробуем ещё раз.',
};
// итог урока с игрой: засчитана — с цифрами; нет — сколько не хватило и что это значит
const gameResultText = (result) => {
  const g = result.game;
  if (!g) return result.accuracy >= 100 ? 'Игра засчитана.' : 'Урок пройден, игра — без зачёта.';
  const wrong = g.answered - g.right;
  if (g.kind === 'wallet') {
    if (g.ok) return `Игра засчитана: лучший выбор в ${g.right} ${plural(g.right, 'году', 'годах', 'годах')} из ${g.answered}.`;
    return `Урок пройден, игра — без зачёта: лучший выбор в ${g.right} ${plural(g.right, 'году', 'годах', 'годах')} из ${g.answered}, а нужно ${gameRule('wallet')}. Засчитанная игра даёт урок без помарок и алмаз.`;
  }
  if (g.ok) return `Игра засчитана: верных ${g.right}, ошибок ${wrong}.`;
  return `Урок пройден, игра — без зачёта: не хватило ${gameNeed(g.kind, g.right, g.answered)} (верных ${g.right}, ошибок ${wrong}). Нужно, чтобы ${gameRule(g.kind)}. Засчитанная игра даёт урок без помарок и алмаз.`;
};
// итог мини-игры для плашки
const gameLine = (inst, r) => {
  if (!r) return '';
  if (inst.kind === 'wallet') return `Лучший выбор в ${r.right} ${plural(r.right, 'году', 'годах', 'годах')} из ${r.answered} · через ${r.answered} лет — ${r.cups} ${plural(r.cups, 'чашка', 'чашки', 'чашек')}${r.record ? ' — новый рекорд!' : ''}`;
  return `Верно ${r.right} из ${r.answered} · ${r.score} очков${r.record ? ' — новый рекорд!' : ''}`;
};

// день, когда после урока последний раз предлагали забег с другом (не чаще раза в день)
const RACE_OFFER_KEY = 'ems-race-offer';
/* ------------------------------ УРОК ------------------------------
   mode: lesson — урок пути (diamond — на алмазном уровне); check — проверка юнита (ошибки не
   возвращаются, сдана при ≤ 1 ошибке); practice — повторение ошибок.
   Урок начат только с первого ответа: открыть и закрыть его — не считается нигде. Выход
   после первого ответа — с подтверждением; урок сохраняется и продолжается с того же места
   в течение суток (resume). */
// урок собирается под ученика: уровень сложности, ошибки, подсказки и слабые темы (src/learn/program.js)
function newPlan(run, learn) {
  // урок уже пройден — расчёты в нём с новыми числами
  if (run.mode === 'lesson') { const p = buildLesson(run.lessonId, Math.random, { ...lessonOpts(learn), diamond: !!run.diamond, replay: !!((learn.lessons || {})[run.lessonId] || {}).runs }); return { items: p.items, cards: p.cards, seconds: p.seconds, diamond: !!run.diamond }; }
  // проверка юнита или тест уровня (levelId): сдан — юнит или все юниты уровня сданы
  if (run.mode === 'check') { const p = run.levelId ? buildLevelCheck(run.levelId, Math.random, { seen: learn.seen || {} }) : buildUnitCheck(run.unitId, Math.random, { seen: learn.seen || {} }); return { items: p.items, cards: {}, passMistakes: p.passMistakes }; }
  if (run.mode === 'placement') return { items: buildPlacement().items, cards: {} };
  // «Большое повторение» уровня: этот уровень и прошлые (docs/mechanics.md, «Большое повторение: в конце каждого уровня»)
  if (run.mode === 'level') { const p = buildLevelReview(run.levelId, learn); return { items: p.items, cards: {}, seconds: p.seconds }; }
  // «Работа над ошибками» юнита — его нерешённые ошибки (src/learn/course.js, buildFix)
  if (run.mode === 'fix') return { items: buildFix(learn, run.unitId).items, cards: {} };
  return { items: buildPractice(practiceIds(learn), Math.random, { weak: weakLessons(learn).map((w) => w.id) }).items, cards: {} };
}
/* Верные ответы подряд — молния в шапке урока (огонёк — только серия дней, docs/mechanics.md, «Экономика
   наград»). С третьего верного подряд: «⚡ 3» — значок и число, без подписи; серия бессрочная. Каждый новый верный ответ раздувает число и
   выпускает «+1» (опыт за верные подряд); на 5, 10, 15… — вспышка искр. Ошибка — молния сереет, качается и
   гаснет. plus — показывать «+1» (на повторе урока опыт почти не идёт). */
function StreakFlame({ n, plus = true }) {
  const [gone, setGone] = useState(0);
  /* «+1» и искры — только когда серия выросла за ответ в этом уроке: урок, открытый с уже идущей серией дня,
     показывает молнию с числом без «+1» (раньше «+1» выпрыгивал при открытии урока) */
  const [grewTo, setGrewTo] = useState(null);
  const prev = useRef(n);
  useEffect(() => {
    const was = prev.current; prev.current = n;
    if (n > was) setGrewTo(n);
    if (was >= XP.streakFrom && n === 0) { setGone(was); const t = setTimeout(() => setGone(0), 900); return () => clearTimeout(t); }
    return undefined;
  }, [n]);
  const on = n >= XP.streakFrom;
  if (!on && !gone) return null;
  const shown = on ? n : gone;
  const grew = grewTo === n;
  const milestone = on && grew && n % 5 === 0;
  return (
    <span className={`ln-fire${on ? '' : ' out'}${milestone ? ' big' : ''}`} data-testid="lesson-streak" data-streak={shown} role="status" aria-label={`${shown} подряд верно`}>
      <Zap size={15} className="ln-fire-ic" aria-hidden="true" />
      <b key={shown}>{shown}</b>
      {on && plus && grew && <span key={`p${n}`} className="ln-fire-plus" data-testid="lesson-streak-plus" aria-hidden="true">+1</span>}
      {milestone && <span key={`s${n}`} className="ln-fire-sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` }} />)}</span>}
    </span>
  );
}

function Runner({ run, learn, update, onClose, onOpenBook, hidden, guest = false, backRef = { current: null } }) {
  const rs = run.resume || null;
  const [plan] = useState(() => (rs ? rs.plan : newPlan(run, learn)));
  const lesson = run.lessonId ? LESSON_BY_ID[run.lessonId] : null;
  // ПК с мышью: на полях урока можно писать черновик (learn-sketch.jsx)
  const sketch = useMedia(SKETCH_QUERY);
  // там же — антистресс, с середины первого юнита; решается при входе в урок (learn-antistress.jsx)
  const [antistress] = useState(() => antistressUnlocked(learn) && !antistressHidden() && !antistressBlocked());
  // пройден ли урок раньше — на момент начала (после финиша он уже в прогрессе); был ли уже алмаз
  const [replay] = useState(() => run.mode === 'lesson' && lessonDone(learn, run.lessonId));
  const diamond = !!plan.diamond;
  // украшение урока из лавки (learn-decor.jsx); гость лавки не видел
  // украшение урока — только на ПК и планшете: на телефоне оно отнимало высоту и закрывало угол (пункт владельца 08.11)
  const roomy = useMedia(DESK_QUERY);
  const desk = guest || !roomy ? null : deskOf(learn);
  // тема урока из лавки (learn-skins.jsx): фон, кнопки и отклик на ответ; тёмная тема — тёмная палитра
  const skin = guest ? null : SKINS[themeOf(learn)] || null;
  const [gem] = useState(() => !!(run.lessonId && learn.lessons[run.lessonId] && learn.lessons[run.lessonId].diamond));
  const [queue, setQueue] = useState(() => (rs ? rs.queue : plan.items));
  const [pos, setPos] = useState(rs ? rs.pos : 0);
  const cardsSeen = useRef(new Set(rs ? rs.cardsSeen : []));
  // голос Инфли: какие фразы уже звучали в этом уроке и сколько ошибок подряд
  const said = useRef(new Set());
  const wrongRun = useRef(0);
  const cardFor = (item) => (item && plan.cards && plan.cards[item.uid] && !cardsSeen.current.has(item.uid) ? plan.cards[item.uid] : null);
  const [stage, setStage] = useState(() => (cardFor((rs ? rs.queue : plan.items)[rs ? rs.pos : 0]) ? 'card' : 'work'));
  // карточки перед упражнением идут подряд: шаг, слово, пункт итогов
  const [cardIdx, setCardIdx] = useState(0);
  const respRef = useRef(null);
  const [resp, setResp] = useState(null);
  const [fb, setFb] = useState(null);
  const [sel, setSel] = useState(null);
  // калькулятор расчётного упражнения открыт; на следующем упражнении — снова клавиатура ответа
  const [calcOpen, setCalcOpen] = useState(false);
  const [how, setHow] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [raceDone, setRaceDone] = useState(false);
  const [term, setTerm] = useState(null);
  /* «Назад» на одну карточку: предыдущий экран урока — шаг или отвеченное задание с разбором — можно
     открыть ещё раз и вернуться. Только на один шаг: дальше в прошлое урок не листается (запрос ученика).
     Текущий экран при этом не закрывается, а прячется — ответ и игра не теряются */
  const [prevShot, setPrevShot] = useState(null);
  const [peek, setPeek] = useState(false);
  const headRef = useRef(null);
  const [anim, setAnim] = useState({ k: 0, kind: null });
  /* Встряска после неверного ответа — перезапуском CSS-анимации на том же узле: обёртка
     упражнения после ответа не пересоздаётся, и раунд мини-игры не теряет свой счёт. */
  const shakeRef = useRef(null);
  useEffect(() => {
    const el = shakeRef.current;
    if (!el || anim.kind !== 'shake') return;
    el.classList.remove('ds-shake'); void el.offsetWidth; el.classList.add('ds-shake');
  }, [anim]);
  useEffect(() => { if (shakeRef.current) shakeRef.current.classList.remove('ds-shake'); }, [pos]);
  /* серия верных подряд не обнуляется между уроками: урок начинается с сегодняшней серии дня (daily.rc в
     learn-state) — и только с неё. Своей серии у сохранённого урока нет: иначе ошибся, открыл начатый
     урок — и серия снова тут (жалоба). Каждое изменение огонька сразу пишется в rc (syncStreak). */
  const [run3, setRun3Raw] = useState(() => streakNow(learn));
  const setRun3 = (next) => { setRun3Raw(next); update((s) => syncStreak(s, next)); };
  /* серия поменялась на другом устройстве (тот же урок открыт и на телефоне: там ошибка) — молния урока берёт общее
     число из синхронизации, а не перезаписывает его своим следующим ответом (пункт владельца от 8 ноября 2026).
     Свои ответы меняют молнию и run вместе, в одном обновлении, — тут они совпадают и ничего не происходит */
  const sharedRun = learn.run && learn.run.at ? learn.run.n : null;
  useEffect(() => { if (sharedRun != null) setRun3Raw((n) => (n === sharedRun ? n : sharedRun)); }, [sharedRun]);
  // линия графика прогресса: первые попытки по порядку; pulse — короткая вспышка на верном ответе серии
  const [log, setLog] = useState(rs ? rs.log || [] : []);
  /* «Слушай» и «История» — лента: прошлые сообщения и отвеченные вопросы остаются в ней
     (и сохраняются вместе с прерванным уроком) */
  const feed = !!lesson && (lesson.kind === 'story' || lesson.kind === 'listen');
  const [history, setHistory] = useState(rs ? rs.history || [] : []);
  const [pulse, setPulse] = useState(0);
  /* время урока — только активное: вкладка видна и ученик недавно что-то делал (src/learn/active-time.js);
     itemStart — отметка этих часов на начале задания */
  const clock = useRef(activeClock(Date.now(), rs ? rs.elapsed || 0 : 0));
  const visibleNow = () => typeof document === 'undefined' || !document.hidden;
  const activeNow = () => { clock.current = tickClock(clock.current, Date.now(), visibleNow()); return clock.current.ms; };
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const act = () => { clock.current = actClock(clock.current, Date.now(), visibleNow()); };
    const vis = () => { clock.current = tickClock(clock.current, Date.now(), visibleNow()); };
    const id = setInterval(vis, 1000);
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, act, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); evs.forEach((e) => window.removeEventListener(e, act, { capture: true })); document.removeEventListener('visibilitychange', vis); };
  }, []);
  const acc = useRef({
    first: rs ? rs.first : {}, hinted: rs ? rs.hinted : {}, solved: new Set(rs ? rs.solved : []),
    itemStart: clock.current.ms, retries: rs ? rs.retries : 0, bonus: rs ? rs.bonus || 0 : 0,
    // «Работа над ошибками»: решённые ошибки снимаются, когда урок пройден целиком (docs/mechanics.md)
    fixed: new Set(rs ? rs.fixed || [] : []),
  });
  // сохранённый незаконченный урок: обычный — по уроку, «Работа над ошибками» — по юниту
  const resumeKey = run.mode === 'fix' ? `fix:${run.unitId}` : run.lessonId;
  const [started, setStarted] = useState(!!rs);
  /* урок — слой поверх страницы: пока он открыт, страница под ним не прокручивается и не
     показывает свой ползунок (на ПК он висел сбоку урока, даже когда прокручивать нечего) */
  useEffect(() => {
    if (hidden || typeof document === 'undefined') return undefined;
    const els = [document.documentElement, document.body]; const was = els.map((el) => el.style.overflow);
    els.forEach((el) => { el.style.overflow = 'hidden'; });
    return () => { els.forEach((el, k) => { el.style.overflow = was[k]; }); };
  }, [hidden]);
  const retryable = run.mode === 'lesson' || run.mode === 'practice' || run.mode === 'fix';
  const total = plan.items.length;
  const cur = queue[pos];
  const orig = cur ? (cur.orig || cur.uid) : null;
  // вступительный тест — в цвете юнита, который сейчас проверяется; алмазный уровень — в своём
  const color = diamond ? DIAMOND_COLOR : unitColor(lesson ? lesson.unitId : run.unitId || (cur && cur.placeUnit) || 'scarcity');

  // «Убрать из повторения» после ошибки в трудной задаче: из ошибок Пути и из повторения учебника,
  // повтор в конце урока тоже снимается
  const [dropped, setDropped] = useState(false);
  useEffect(() => { setDropped(false); }, [pos]);
  const dropHard = () => {
    if (!cur) return;
    Audio.play('paper');
    update((p) => dropFromReview(p, cur.of || cur.id), { whole: true });
    setQueue((q) => q.filter((x, i) => i <= pos || (x.orig || x.uid) !== orig));
    acc.current.solved.add(orig);
    setDropped(true);
  };
  const doCheck = (given) => {
    const answer = given !== undefined ? given : resp;
    if (!cur || fb || (given === undefined && !ready(cur, answer))) return;
    const r = check(cur, answer);
    if (r.empty) { setFb({ ok: false, why: null, empty: true }); return; }
    const a = acc.current;
    // ошибка поставила повтор в конец урока — подпись под ответом говорит, вернётся ли задача
    let requeued = false;
    // урок начат — с первого ответа
    /* аналитика: lesson_start — активность, на каждый урок; first_lesson_start — шаг воронки, один раз с
       устройства (docs/mechanics.md, «Аналитика») */
    if (!started) { setStarted(true); update(startLesson); if (run.mode === 'lesson') { track('lesson_start', { lesson: run.lessonId }); trackOnce('first_lesson_start'); } }
    const firstTime = !(orig in a.first);
    // верно с первого раза: собранное с падениями домино выполнено, но не с первого раза
    const firstOk = r.ok && !r.partial;
    const ms = activeNow() - a.itemStart;
    /* рекорд мини-игры — после каждой сыгранной партии, и когда игра вернулась после ошибки: экран итогов
       сравнивает с сохранённым рекордом, и несохранённый лучший счёт давал потом ложный «новый рекорд» */
    if (GAME_KINDS.includes(cur.kind) && answer && answer.score) update((s) => recordBest(s, cur.id, answer.score));
    if (firstTime) {
      a.first[orig] = firstOk;
      // аналитика без персональных данных: верно ли с первой попытки — по упражнению (api/events.js)
      track(firstOk ? 'ex_first_try_ok' : 'ex_first_try_fail', { exercise: String(cur.of || cur.id), ok: firstOk, ms });
      setLog((l) => [...l, firstOk]);
      if (firstOk && run3 >= 1) setPulse((p) => p + 1);
      // встреченное упражнение: в повторение и проверки первыми пойдут те, что виделись реже
      const seenId = cur.of || cur.id;
      update((s) => recordSeen(recordAttempt(s, cur.kind, firstOk, ms, { lesson: cur.lesson || null }), seenId));
      if (GAME_KINDS.includes(cur.kind) && answer && answer.score) a.bonus += gameXp(answer.score);
      if (GAME_KINDS.includes(cur.kind) && answer) a.game = { kind: cur.kind, right: answer.right, answered: answer.answered, ok: r.ok };
    }
    if (r.ok) {
      a.solved.add(orig);
      // похожая задача вместо исходной отвечает за исходную: ошибка по ней снимается, подсказка переходит
      const baseId = cur.of || cur.id;
      // ошибка решена в практике или верно с первой попытки на повторении в уроке — уходит из «Повторить ошибки»
      if (run.mode === 'practice' || (cur.review && firstTime && firstOk)) update((s) => resolveMistake(s, baseId));
      /* «Работа над ошибками» — ошибка снимается, когда урок пройден целиком: решили половину и вышли — ошибок
         не стало меньше, и обязательный урок не пропадает с дороги непройденным */
      if (run.mode === 'fix') a.fixed.add(baseId);
      // решено с подсказкой (или домино собрано с падениями) — невидимо уходит в «Повторение» пораньше; без подсказки — снимается
      const helped = !!a.hinted[orig] || !!r.partial;
      update((s) => (helped ? addHinted(s, baseId) : clearHinted(s, baseId)));
      // та же задача ждёт повторения в учебнике — это и есть её повторение (review-sync.js)
      if (!helped) update((p) => afterPathAnswer(p, baseId), { whole: true });
      // серия: с третьего верного подряд каждый — ещё +1 опыта (огонёк в шапке показывает «+1»)
      if (firstTime && firstOk) { a.bonus += streakBonus(run3 + 1); setRun3(run3 + 1); } else if (r.partial) setRun3(0);
      // у темы урока — свои звуки ответа (docs/mechanics.md, «Темы урока»)
      Audio.play(answerSound(skin, true)); vibrate(15);
    } else {
      setRun3(0);
      Audio.play(answerSound(skin, false)); vibrate([30, 40, 30]);
      // в «Повторить ошибки» — только то, что там можно решить: мини-игра и открытый вопрос — не задача на повтор
      if ((run.mode === 'lesson' || run.mode === 'level') && canPractice(cur.of || cur.id)) update((s) => addMistake(s, cur.of || cur.id));
      // повтор в конце урока — не та же задача: новые числа или похожий вопрос на ту же мысль;
      // возвращается ОДИН раз, а не до победного: новичок, отвечая наугад, видел одно задание
      // по пять раз. Не вышло и во второй — урок идёт дальше, задача ждёт в «Повторить ошибки»
      // замены нет (та же задача) — повтора нет: ждёт в «Повторить ошибки»
      const copy = retryable && !cur.noRetry && !cur.retry ? retryOf(cur, Math.random, queue.map((q) => q.of || q.id)) : null;
      if (retryWorth(copy)) {
        a.retries += 1;
        requeued = true;
        setQueue((q) => [...q, { ...copy, uid: `${cur.uid}r${a.retries}`, orig, retry: true }]);
      }
      else a.solved.add(orig);
    }
    setAnim((x) => ({ k: x.k + 1, kind: r.ok ? 'flash' : 'shake' }));
    wrongRun.current = r.ok ? 0 : wrongRun.current + 1;
    const say = pickPhrase(situation({ ok: r.ok, streak: firstOk && firstTime ? run3 + 1 : 0, hinted: !!a.hinted[orig] || !!r.partial, retry: !!cur.retry, wrongRun: wrongRun.current }), said.current);
    setFb({ ok: r.ok, why: r.why, say, skipped: !!r.skipped, partial: !!r.partial, requeued });
    // украшение урока отзывается на ответ
    if (!r.skipped) tellAnswer(r.ok);
  };
  const finish = () => {
    const a = acc.current;
    // подсказка ничем не наказывается: верно с первой попытки — полный опыт
    const firstOk = Object.values(a.first).filter(Boolean).length;
    const mistakes = Object.values(a.first).filter((x) => !x).length;
    // вступительный тест может закончиться раньше — точность по заданным вопросам
    const asked = run.mode === 'placement' ? Object.keys(a.first).length : total;
    const accuracy = asked ? (firstOk / asked) * 100 : 0;
    const ms = activeNow();
    const now = Date.now();
    let xp = 0; let pass = null; let opened = null;
    const done = { accuracy, now, seconds: ms / 1000, kind: lesson ? lesson.kind : null, mode: run.mode };
    let apply;
    if (run.mode === 'lesson') {
      track('lesson_done', { lesson: run.lessonId, ms });
      trackOnce('first_lesson_done');
      xp = lessonXp({ firstTry: firstOk, replay, diamond, bonus: a.bonus });
      apply = (s) => finishLesson(s, run.lessonId, { xp, ...done, diamond });
      dropResume(run.lessonId);
    } else if (run.mode === 'check') {
      pass = mistakes <= plan.passMistakes;
      xp = firstOk * XP.correct + a.bonus;
      const ids = run.levelId ? levelUnits(run.levelId).map((u) => u.id) : [run.unitId];
      // сданный тест уровня засчитывает и его большое повторение
      apply = (s) => { const t = finishLesson(s, null, { xp, ...done }); if (!pass) return t; const u = ids.reduce((x, id) => passUnit(x, id, { ace: mistakes === 0, now }), t); return run.levelId ? finishLevelReview(u, run.levelId, { accuracy, now }) : u; };
    } else if (run.mode === 'level') {
      // большое повторение: пройдено с любым результатом, 80%+ — уровень подтверждён
      pass = accuracy >= LEVEL_REVIEW_OK;
      xp = firstOk * XP.correct + a.bonus;
      apply = (s) => finishLevelReview(finishLesson(s, null, { xp, ...done }), run.levelId, { accuracy, now });
    } else if (run.mode === 'placement') {
      // открытые тестом юниты — как сданные проверкой; тест не засчитывается уроком дня
      opened = placementOpened(plan.items, a.first);
      apply = (s) => setPlacement(opened.reduce((t, u) => passUnit(t, u, { now }), s), opened, now);
    } else {
      xp = firstOk * XP.correct + a.bonus;
      // «Работа над ошибками» пройдена — Путь открыт дальше; второй такой в этом юните не будет
      apply = (s) => {
        if (run.mode !== 'fix') return finishLesson(s, null, { xp, ...done });
        const solved = [...a.fixed].reduce((t, id) => resolveMistake(t, id), s);
        return markFixed(finishLesson(solved, null, { xp, ...done }), run.unitId, now);
      };
      if (run.mode === 'fix') dropResume(resumeKey);
    }
    // купленный в лавке «двойной опыт»: пока действует, опыт за урок, практику и проверку — вдвое
    // (apply читает xp в момент вызова — удвоенный)
    const boosted = xp > 0 && boostActive(learn, now);
    if (boosted) xp *= 2;
    // монеты за урок и всё, что он выполнил: цель дня, задания, серия, печати
    // с индексацией месяца (docs/mechanics.md, «Индексация наград»)
    const confirmed = run.mode === 'level' && levelConfirmed(learn, run.levelId);
    const coins = indexed(runCoins({ mode: run.mode, replay, accuracy, pass, items: total, diamond, gem, confirmed }), now);
    const key = runKey({ mode: run.mode, lessonId: run.lessonId, replay, diamond, gem, levelId: run.levelId, pass, confirmed });
    const full = (s) => { const t = earn(apply(s), coins, key, now); return settle(t, courseCtx(t), now); };
    const preview = full(learn);
    // первый урок дня продлил серию — огонёк загорается на итогах крупно
    const before = streak(learn, now); const after = streak(preview.s, now);
    const streakUp = !before.today && after.today ? after.days : 0;
    update((s) => full(s).s);
    // касса: урок сдан
    Audio.play('register'); vibrate([20, 30, 20, 30, 60]);
    // иногда после урока — «Забег с другом?»: есть друг, бывший в сети за неделю, и не чаще раза в день
    let raceFriends = null;
    if (run.mode === 'lesson' && !guest) {
      let offered = null; try { offered = localStorage.getItem(RACE_OFFER_KEY); } catch { /* приватный режим */ }
      // автотест карточки забега просит её явно (ems-race-test): иначе она — по жребию дня
      let always = false; try { always = !!navigator.webdriver && localStorage.getItem('ems-race-test') === '1'; } catch { /* приватный режим */ }
      raceFriends = raceOffer(friendsState(), preview.s, now, offered, always);
      if (raceFriends) { try { localStorage.setItem(RACE_OFFER_KEY, dayOf(now)); } catch { /* приватный режим */ } }
    }
    // из него — за серии и мини-игру (на повторе урока опыт — десятая часть, разбивку не показываем)
    const bonus = run.mode === 'lesson' && replay && !diamond ? 0 : a.bonus * (boosted ? 2 : 1);
    setResult({ xp, bonus, accuracy, ms, pass, mistakes, coins: key && hasClaim(learn, key) ? 0 : coins, gains: preview.gains, opened, boosted, streakUp, game: a.game || null, raceFriends });
    setStage('done');
  };
  const next = () => {
    Audio.play('paper');
    if (feed && cur && fb) setHistory((h) => [...h, { type: 'q', key: `q:${cur.uid}`, inst: marked, resp, fb }]);
    // отвеченное задание — «предыдущая карточка» (мини-игру заново не показываем: её не переиграть)
    if (!feed) setPrevShot(cur && fb && !fb.empty && !GAME_KINDS.includes(cur.kind) ? { type: 'ex', inst: marked, resp, fb } : null);
    setPeek(false);
    if (pos + 1 >= queue.length) { finish(); return; }
    // вступительный тест: пятёрка юнита провалена — дальше спрашивать незачем
    if (run.mode === 'placement' && cur && placementFailed(plan.items, acc.current.first, cur.placeUnit)) { finish(); return; }
    setPos(pos + 1); setResp(null); setFb(null); setSel(null); setTerm(null); setCalcOpen(false); setHow(false);
    acc.current.itemStart = activeNow();
    if (cardFor(queue[pos + 1])) setStage('card');
  };
  const openTerm = (id) => {
    Audio.play('tick');
    // слово мира («кр.») — не подсказка к решению
    if (!fb && orig && !isWorldTerm(id)) acc.current.hinted[orig] = true;
    setTerm(id);
  };
  const termCtx = useMemo(() => ({ ...noopCtx, onTerm: openTerm }), // eslint-disable-next-line react-hooks/exhaustive-deps
    [orig, fb]);
  /* урок после первого ответа сохраняется целиком и продолжается с того же места: при выходе
     крестиком, после каждого ответа и когда страницу закрывают или прячут — закрытый браузер и
     перезагрузка больше не теряют урок (жалоба: «случайно закрыл браузер — всё слетело») */
  const snapshot = () => {
    if ((run.mode !== 'lesson' && run.mode !== 'fix') || !started || stage === 'done') return;
    const a = acc.current;
    const at = fb && !fb.empty ? pos + 1 : pos;
    if (at >= queue.length) { dropResume(resumeKey); return; }
    saveResume(resumeKey, {
      plan: { items: plan.items, cards: plan.cards, seconds: plan.seconds, diamond }, queue, pos: Math.min(at, queue.length - 1),
      first: a.first, hinted: a.hinted, solved: [...a.solved], retries: a.retries, elapsed: activeNow(),
      cardsSeen: [...cardsSeen.current], log, kind: cur ? cur.kind : 'choice', history, bonus: a.bonus, fixed: [...a.fixed],
    });
  };
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  // после каждого ответа и шага — свежий снимок
  useEffect(() => { snapRef.current(); }, [pos, fb, stage, queue.length, started]);
  // страницу закрывают, перезагружают или уводят в фон (телефон) — снимок на самом свежем месте
  useEffect(() => {
    const save = () => snapRef.current();
    const hidden = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  const leave = () => { snapshot(); onClose(); };
  // пустой план (упражнения ошибок убраны из курса) — сразу итог
  useEffect(() => { if (stage === 'work' && !cur && !result) finish(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cur, result]);
  // до первого ответа выход ничего не стоит и не спрашивает
  const exit = () => { if (stage === 'done' || !started) onClose(); else setAsking(true); };
  /* урок — запись истории (src/lib/route.js): «Назад» браузера — как крестик: посреди урока спрашивает «Выйти из урока?»
     (урок остаётся открытым, поэтому false — запись возвращается в историю), на итогах — закрывает. Саму запись держит
     вкладка (src/learn.jsx): она ставит её в тот же миг, когда закрывается карточка урока, — файл урока ещё грузится */
  backRef.current = () => { if (stage === 'done' || !started) { onClose(); return undefined; } setAsking(true); return false; };
  useEffect(() => () => { backRef.current = null; }, [backRef]);
  // термины условия — с подсказками; варианты ответа не размечаем: нажатие по ним — это выбор
  const marked = useMemo(() => (cur ? { ...cur, prompt: markTerms(cur.prompt) } : null), [cur]);
  respRef.current = resp;
  const inst = marked ? { ...marked, _sel: sel, _setSel: setSel, _resp: respRef, _calc: calcOpen, _setCalc: setCalcOpen, _best: (learn.best || {})[marked.id] || 0 } : null;
  const title = run.mode === 'lesson' ? `${diamond ? 'Алмазный уровень: ' : ''}${lesson.title}` : run.mode === 'level' ? `Большое повторение: ${LEVEL_BY_ID[run.levelId].title.toLowerCase()} уровень` : run.mode === 'check' ? (run.levelId ? `Тест уровня «${LEVEL_BY_ID[run.levelId].title}»` : 'Проверка юнита') : run.mode === 'placement' ? 'Вступительный тест' : run.mode === 'fix' ? 'Работа над ошибками' : 'Практика';

  const kindName = cur ? KIND_LABEL[cur.kind] : '';
  // плашка ответа в нижней панели — одна на все виды уроков: её видно без прокрутки
  const verdictBar = inst && fb && !fb.empty ? (
    <AnswerBar ok={fb.ok} plain={feed} stamp={GAME_KINDS.includes(inst.kind) ? (fb.ok ? 'Игра засчитана' : 'Игра без зачёта') : inst.kind === 'open' ? (fb.skipped ? 'Вопрос пропущен' : 'Ответ записан') : null}
      say={GAME_KINDS.includes(inst.kind) || inst.kind === 'open' ? null : fb.say} className={fb.ok ? 'ds-flash' : ''} key={`fb${anim.k}`}>
      <div className="ln-fb-body" data-testid="ex-feedback" data-ok={String(fb.ok)} data-partial={String(!!fb.partial)}>
        {inst.kind === 'open' && inst.explain && (
          <div className="tb-body" style={{ fontSize: 15, color: 'inherit' }} data-testid="open-review"><b>Разбор.</b> <Blocks blocks={inst.explain} ctx={noopCtx} /></div>
        )}
        {GAME_KINDS.includes(inst.kind) && <div style={{ fontSize: 15 }} data-testid="game-result">{gameLine(inst, resp)}{!fb.ok && ` Для зачёта нужно: ${answerText(inst)}.`}</div>}
        {/* «не засчитано» читалось как «урок не засчитан» — а урок с игрой пройден в любом случае (docs/mechanics.md) */}
        {GAME_KINDS.includes(inst.kind) && !fb.ok && run.mode === 'lesson' && <div style={{ fontSize: 15, marginTop: 4 }} data-testid="game-lesson-note">Урок это не отменяет — он будет пройден, только без алмаза.</div>}
        {/* «Соедините»: не абзац со всеми парами, а сколько неверных — сами пары отмечены на карточках */}
        {!fb.ok && inst.kind === 'match' && <div style={{ fontSize: 15 }} data-testid="match-summary">Неверных пар: {inst.left.filter((l) => (resp || {})[l.key] !== l.key).length} из {inst.left.length} — они отмечены красным, под каждой — верный термин.</div>}
        {!fb.ok && !GAME_KINDS.includes(inst.kind) && inst.kind !== 'match' && <div style={{ fontSize: 15 }}>Правильно: <b>{answerText(inst)}</b></div>}
        {(!fb.ok || fb.partial) && fb.why && <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.5 }} data-testid="ex-why"><Inline nodes={fb.why} ctx={noopCtx} /></div>}
        {!fb.ok && !fb.why && inst.explain && !inst.steps && <div className="tb-body" style={{ fontSize: 15, marginTop: 4, color: 'inherit' }}><Blocks blocks={inst.explain} ctx={noopCtx} /></div>}
        {!fb.ok && inst.explain && inst.steps && <StepsExplain blocks={inst.explain} key={inst.uid} />}
        {/* верный ответ на расчёт — ход решения по кнопке: важно не только число, но и почему так считают */}
        {fb.ok && inst.explain && !GAME_KINDS.includes(inst.kind) && inst.kind !== 'open' && (
          how ? <div className="tb-body" style={{ fontSize: 15, marginTop: 6, color: 'inherit' }} data-testid="ex-how"><Blocks blocks={inst.explain} ctx={noopCtx} /></div>
            : <button type="button" className="ln-how" data-testid="ex-how-open" onClick={() => { Audio.play('paper'); setHow(true); }}>Как решать</button>
        )}
        {/* пожаловаться именно на разбор: верный ответ, «почему» и ход решения — прямо здесь, под ними */}
        {!GAME_KINDS.includes(inst.kind) && (!fb.ok || inst.explain || fb.why) && (
          <div className="ln-explain-flag">
            <ReportFlag withText label="Ошибка в разборе?" testid="report-explain"
              context={() => ({ ...exerciseContext(inst, { lesson, resp: respRef.current, correct: answerText(inst), mode: run.mode }), part: 'разбор' })} />
          </div>
        )}
        {!fb.ok && retryable && !inst.noRetry && !inst.hard && (
          <div className="ds-sub" style={{ fontSize: 13.5, marginTop: 4 }} data-testid="retry-note">
            {inst.retry ? (run.mode === 'practice' || run.mode === 'fix' ? 'Ничего страшного: задача останется в «Повторить ошибки».' : 'В этом уроке она больше не вернётся — подождёт в «Повторить ошибки».')
              : !fb.requeued ? (run.mode === 'lesson' ? 'Похожего вопроса в уроке нет — задача подождёт в «Повторить ошибки».' : 'Ничего страшного: задача останется в «Повторить ошибки».')
                : feed ? 'Похожий вопрос вернётся в конце урока — один раз.' : 'Похожая задача вернётся в конце урока — один раз.'}
          </div>
        )}
        {/* трудная задача: вернётся один раз; не знаете, как решать, — можно убрать из повторения (docs/mechanics.md) */}
        {!fb.ok && retryable && inst.hard && (
          <div className="ln-hard-note" data-testid="hard-note">
            <span className="ds-sub">{dropped ? 'Убрано из повторения. Решить её можно в учебнике.' : inst.retry || !fb.requeued ? 'В этом уроке задача больше не вернётся.' : 'Задача вернётся в конце урока — один раз.'}</span>
            {!dropped && <button type="button" className="ln-how" data-testid="drop-review" onClick={dropHard}>Убрать из повторения</button>}
          </div>
        )}
      </div>
      {/* «Дальше» — под прокруткой разбора, всегда на виду (жалоба mvssly7o: «Как решать» на весь экран, не закрыть) */}
      <Button variant={fb.ok ? 'ok' : 'warm'} wide onClick={next} autoFocus style={{ marginTop: 12, flex: 'none' }}>Дальше</Button>
    </AnswerBar>
  ) : null;
  const unitId = lesson ? lesson.unitId : run.unitId;

  return (
    <DsRoot theme={skin ? skinTheme(skin) : dsThemeId()} accent={color} className={skin ? 'ln-overlay sk-on' : 'ln-overlay'} data-testid="lesson" data-mode={run.mode} data-diamond={diamond ? 'true' : undefined} role="dialog" aria-label={title}
      data-peek={peek && prevShot && stage !== 'done' ? 'true' : undefined} data-skin={skin ? skin.key : undefined} style={{ ...(skin ? skinVars(skin) : null), display: hidden ? 'none' : undefined }}>
      <ArtStyle /><style>{CSS + PLAY_CSS + FEED_CSS + REPORT_CSS + MODEL_CSS + DOMINO_CSS + (sketch ? SKETCH_CSS : '') + (skin ? SKIN_CSS : '')}</style>
      {skin && <LessonSkin id={skin.id} />}
      <h1 className="ds-sr">{title}</h1>
      <div className="ln-head" ref={headRef}>
        {stage !== 'done' && <IconButton label="Выйти из урока" icon={X} data-nav="back" onClick={exit} />}
        {/* на одну карточку назад — касанием отрезка перед текущим на полосе прогресса; идущую мини-игру не прерываем */}
        <ProgressChart answers={log} total={total} pulse={pulse}
          onBack={!feed && stage !== 'done' && prevShot && !peek && !(stage === 'work' && cur && GAME_KINDS.includes(cur.kind) && !fb) ? () => { Audio.play('paper'); setPeek(true); } : null}
          onForward={peek && prevShot && stage !== 'done' ? () => { Audio.play('paper'); setPeek(false); } : null} />
        {/* Инфля надувается с каждым верным ответом подряд и мягко сдувается после ошибки */}
        <StreakFlame n={run3} plus={!(run.mode === 'lesson' && replay && !diamond)} />
        <InflaMeter streak={run3} mood={fb && !fb.empty ? (fb.ok ? 'joy' : 'cheer') : 'hello'} size={34} />
      </div>
      {/* украшение урока из лавки — живое, его можно трогать */}
      {/* колыбель — на подставке сбоку (урок не сдвигается), гирлянда и мобиле — полосой под шапкой */}
      {desk && stage !== 'done' && (desk === 'desk-cradle' ? <><style>{CRADLE_CSS}</style><CradleStand id={desk} /></> : <div className="ln-desk"><DeskDecor id={desk} height={48} /></div>)}

      {asking && (
        <Sheet label="Выйти из урока?" onClose={() => setAsking(false)}>
          <div style={{ textAlign: 'center' }}>
            <Heading level={2} title="Выйти из урока?" sub={run.mode === 'lesson' ? 'Прогресс урока сохранится — продолжить можно в течение суток.' : 'Эту проверку можно будет пройти заново.'} />
            <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              <Button wide onClick={() => setAsking(false)} autoFocus>Продолжить урок</Button>
              <Button variant="ghost" wide onClick={leave} style={{ '--u': 'var(--ds-bad-btn)' }}>Выйти</Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* «предыдущая карточка» — слой поверх тела урока (шапка остаётся видна); текущий экран под ним
          не закрывается: ответ, ход игры и прокрутка целы */}
      {peek && prevShot && stage !== 'done' && (
        <div className="ln-peek" style={{ top: headRef.current ? headRef.current.offsetHeight : 64 }}>
          <div className="ln-body"><div className="ln-inner ds-rise" data-testid="lesson-peek" data-type={prevShot.type}>
            {/* и на прошлой карточке можно пожаловаться: нажали «Дальше» на автомате — вернулись и отметили */}
            <div className="ln-kind ds-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowLeft size={14} aria-hidden="true" />Предыдущая карточка<span style={{ flex: 1 }} />
              <ReportFlag context={() => (prevShot.type === 'card' ? stepContext(prevShot.card, lesson, prevShot.kind || 'Предыдущая карточка')
                : exerciseContext(prevShot.inst, { lesson, resp: prevShot.resp, correct: answerText(prevShot.inst), mode: run.mode }))} />
            </div>
            {prevShot.type === 'card' ? (
              <>
                <h2 className="ds-h1" style={{ fontSize: 25 }}>{prevShot.heading}</h2>
                <div className="ds-text" style={{ marginTop: 14 }}><Inline nodes={prevShot.card.text} ctx={noopCtx} /></div>
                {prevShot.card.remember && <StepRemember tex={prevShot.card.remember} />}
                {prevShot.card.chart ? <MiniChart type={prevShot.card.chart} attrs={prevShot.card.attrs} /> : prevShot.card.pic ? <Pic name={prevShot.card.pic} /> : null}
              </>
            ) : (
              <>
                <ExerciseView inst={prevShot.inst} ctx={noopCtx} resp={prevShot.resp} setResp={() => {}} locked fb={prevShot.fb} onSubmit={() => {}} />
                <div className={`ln-peek-verdict ${prevShot.fb.ok ? 'ok' : 'bad'}`} data-testid="lesson-peek-verdict">
                  {prevShot.fb.ok ? <b>Вы ответили верно.</b> : <>Правильно: <b>{answerText(prevShot.inst)}</b></>}
                  {!prevShot.fb.ok && prevShot.fb.why && <div style={{ marginTop: 4 }}><Inline nodes={prevShot.fb.why} ctx={noopCtx} /></div>}
                  {prevShot.inst.explain && prevShot.inst.kind !== 'open' && <div className="tb-body" style={{ fontSize: 15, marginTop: 6, color: 'inherit' }}><Blocks blocks={prevShot.inst.explain} ctx={noopCtx} /></div>}
                </div>
              </>
            )}
          </div></div>
          <div className="ln-foot"><div className="ln-inner">
            <Button wide variant="secondary" data-testid="lesson-peek-return" autoFocus onClick={() => { Audio.play('paper'); setPeek(false); }}>Вернуться</Button>
          </div></div>
        </div>
      )}

      {!feed && stage === 'card' && cur && cardFor(cur) && (() => {
        const list = cardFor(cur);
        const c = list[Math.min(cardIdx, list.length - 1)];
        const last = cardIdx >= list.length - 1;
        const firstStep = lesson && c === lesson.idea;
        const kind = lesson ? lesson.kind : 'intro';
        const heading = firstStep ? bareTitle(lesson.title) : c.title;
        // подпись над карточкой: вид урока на первой, дальше — «шаг», «слово», «итог N из M»
        const eyebrow = firstStep ? LESSON_KIND[kind] : kind === 'summary' ? `Итог ${cardIdx + 1} из ${list.length}` : kind === 'words' ? `Слово ${cardIdx + 1} из ${list.length}`
          : kind === 'story' ? 'История продолжается' : kind === 'listen' ? 'Слушаем дальше' : 'Шаг дальше';
        const go = () => {
          Audio.play('paper');
          setPrevShot({ type: 'card', card: c, heading, kind }); setPeek(false);
          if (!last) { setCardIdx(cardIdx + 1); return; }
          cardsSeen.current.add(cur.uid); acc.current.itemStart = activeNow(); setCardIdx(0); setStage('work');
        };
        const picture = <CardPicture c={c} />;
        // «Слова» — колода со своими кнопками: вспомнить, открыть, «Знаю» / «Ещё раз»
        if (c.flash) {
          const done = () => { setPrevShot(null); setPeek(false); cardsSeen.current.add(cur.uid); acc.current.itemStart = activeNow(); setCardIdx(0); setStage('work'); };
          return (
            <WordDeck key={cur.uid} cards={list} onDone={done}
              body={(inner) => (
                <div className="ln-body"><div className="ln-inner ds-rise" data-testid="lesson-card" data-style="flash">
                  <div className="ds-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="ln-kind" style={{ margin: 0 }}>{LESSON_KIND.words}</span><span style={{ flex: 1 }} />
                    <ReportFlag context={() => stepContext(c, lesson, 'Слова')} />
                  </div>
                  {inner}
                </div></div>
              )}
              foot={(buttons) => <div className="ln-foot"><div className="ln-inner">{buttons}</div></div>} />
          );
        }
        // «Откройте сами» — исследование со своей кнопкой: дальше — с четырёх разных цен
        if (c.discover) {
          return (
            <DiscoverDay key={`${cur.uid}:${c.id}`} card={c} onDone={go}
              body={(inner) => (
                <div className="ln-body"><div className="ln-inner ds-rise" data-testid="lesson-card" data-style="discover">
                  <div className="ds-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="ln-kind" style={{ margin: 0 }}>Откройте сами</span><span style={{ flex: 1 }} />
                    <ReportFlag context={() => stepContext(c, lesson, 'Откройте сами')} />
                  </div>
                  {inner}
                </div></div>
              )}
              foot={(button) => <div className="ln-foot"><div className="ln-inner">{button}</div></div>} />
          );
        }
        return (
          <>
            <div className="ln-body"><div className="ln-inner ds-rise" data-testid="lesson-card" data-style={kind} key={c.id}>
              <div className="ds-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="ln-kind" style={{ margin: 0 }}>{eyebrow}</span><span style={{ flex: 1 }} />
                <ReportFlag context={() => stepContext(c, lesson, eyebrow)} />
              </div>
              {kind === 'summary' ? (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Rosette size={54} opacity={0.6}><span className="ds-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--u-ink)' }}>{cardIdx + 1}</span></Rosette>
                    <h2 className="ds-h2" style={{ flex: 1 }}>{heading}</h2>
                  </div>
                  <div className="ds-text" style={{ marginTop: 12 }}><Inline nodes={c.text} ctx={noopCtx} /></div>
                  <StepLegend nodes={c.text} unitId={unitId} />
                  {picture}
                </Card>
              ) : (
                <>
                  {/* Инфля уже в шапке урока — вторая рядом с заголовком шага лишняя */}
                  <h2 className="ds-h1" style={{ fontSize: 25 }}>{heading}</h2>
                  <div className="ds-text" style={{ marginTop: 14 }}><Inline nodes={c.text} ctx={noopCtx} /></div>
                  {c.remember && <StepRemember tex={c.remember} />}
                  <StepLegend nodes={c.remember ? [...c.text, { t: 'math', v: c.remember }] : c.text} unitId={unitId} />
                  {picture}
                  {/* Инфля вспоминает механику лавки, которой ученик уже пользовался: тема знакома на деле */}
                  {(() => { const cb = callbackFor(c.id, learn); return cb ? <div className="lm-say" data-testid="step-callback" data-callback={cb.id}><Mascot mood="joy" size={38} /><span>{cb.text}</span></div> : null; })()}
                </>
              )}
            </div></div>
            <div className="ln-foot"><div className="ln-inner">
              <Button wide onClick={go}>{last ? (kind === 'summary' ? 'К тесту юнита' : 'Понятно') : 'Дальше'}</Button>
            </div></div>
          </>
        );
      })()}

      {!feed && stage === 'work' && inst && (
        <>
          <div className="ln-body"><div className="ln-inner" ref={shakeRef} key={inst.uid}
            data-testid="ex" data-kind={inst.kind} data-answer={testAnswer(inst)}>
            <div className="ln-kind ds-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* повтор ошибки — одна плашка: у повторённого задания из прошлых уроков «повторение» не дублируем */}
              {kindName}{inst.review && !inst.retry && <span className="ds-badge" data-testid="ex-review-badge" data-past={inst.past || undefined}>повторение{inst.past ? ` · ${placeOf(inst.past).place}` : ''}</span>}
              {inst.retry && <span className="ds-badge ln-retry-badge" data-testid="retry-badge">повтор ошибки</span>}
              {inst.hard && <span className="ds-badge" data-testid="ex-hard">{inst.hard >= 3 ? 'олимпиада' : 'семинар'}</span>}
              {inst.weak && <span className="ds-badge">слабая тема</span>}
              {inst.placeUnit && <span className="ds-badge">{placeOf(inst.placeUnit).place}</span>}
              <span style={{ flex: 1 }} />
              <ReportFlag context={() => exerciseContext(inst, { lesson, resp: respRef.current, correct: answerText(inst), mode: run.mode })} />
            </div>
            {inst.retry && !fb && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14 }} className="ds-sub" data-testid="ex-retry" data-fresh={inst.fresh || 'same'}>
                <RotateCcw size={16} aria-hidden="true" /> {RETRY_TEXT[inst.fresh] || RETRY_TEXT.same}
              </div>
            )}
            <ExerciseView inst={inst} ctx={termCtx} resp={resp} setResp={(v) => { setResp(v); if (fb && fb.empty) setFb(null); }} locked={!!fb && !fb.empty} fb={fb && !fb.empty ? fb : null}
              onSubmit={(v) => doCheck(v)} />
          </div></div>
          <div className={`ln-foot ${fb && !fb.empty ? `fb ${fb.ok ? 'ok' : 'bad'}` : ''}`} data-testid="lesson-foot">
            {fb && !fb.empty ? verdictBar : (
              <div className="ln-inner">
                {fb && fb.empty && <div style={{ fontSize: 14, color: 'var(--ds-bad)', marginBottom: 8 }}>Введите число: например, 25 или −0,5.</div>}
                {!GAME_KINDS.includes(inst.kind) && !SELF_CHECK.includes(inst.kind) && <Button wide disabled={!ready(inst, resp)} onClick={() => doCheck()}>{inst.kind === 'open' ? 'Ответить' : 'Проверить'}</Button>}
                {inst && inst.kind === 'open' && <OpenSkip onSkip={() => doCheck({ skip: true })} />}
              </div>
            )}
          </div>
        </>
      )}

      {feed && stage !== 'done' && cur && (() => {
        const list = stage === 'card' ? cardFor(cur) : null;
        const idx = list ? Math.min(cardIdx, list.length - 1) : 0;
        const liveCard = list ? list[idx] : null;
        const last = !list || idx >= list.length - 1;
        let n = 0;
        const entries = history.map((h) => (h.type === 'msg'
          ? { kind: 'msg', key: h.key, card: h.card, index: (n += 1) }
          : { kind: 'q', key: h.key, node: <FeedAnswer h={h} />, flag: <ReportFlag context={() => exerciseContext(h.inst, { lesson, resp: h.resp, correct: answerText(h.inst) })} /> }));
        if (liveCard) entries.push({ kind: 'msg', key: `m:${cur.uid}:${idx}`, card: liveCard, index: (n += 1), live: true });
        else if (stage === 'work' && inst) {
          entries.push({ kind: 'q', key: `q:${inst.uid}`, live: true, flag: <ReportFlag context={() => exerciseContext(inst, { lesson, resp: respRef.current, correct: answerText(inst) })} />, node: (
            <div className={anim.kind === 'shake' && fb && !fb.ok ? 'ds-shake' : ''} data-testid="ex" data-kind={inst.kind} data-answer={testAnswer(inst)}>
              {inst.retry && !fb && <div className="ds-sub" style={{ fontSize: 14, marginBottom: 6 }} data-testid="ex-retry" data-fresh={inst.fresh || 'same'}><RotateCcw size={15} aria-hidden="true" style={{ verticalAlign: -2 }} /> {RETRY_TEXT[inst.fresh] || RETRY_TEXT.same}</div>}
              <ExerciseView inst={inst} ctx={termCtx} resp={resp} setResp={(v) => { setResp(v); if (fb && fb.empty) setFb(null); }} locked={!!fb && !fb.empty} fb={fb && !fb.empty ? fb : null} onSubmit={(v) => doCheck(v)} />
            </div>
          ) });
        }
        // аудиоурок: текст сообщений перед отвеченным вопросом открыт сам
        const lastQ = entries.map((e, i) => (e.kind === 'q' && !e.live ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
        entries.forEach((e, i) => { if (e.kind === 'msg') e.revealed = i < lastQ || (stage === 'work' && !!fb && !fb.empty && i < entries.length - 1); });
        const feedGo = () => {
          Audio.play('paper');
          setHistory((h) => [...h, { type: 'msg', key: `m:${cur.uid}:${idx}`, card: liveCard }]);
          if (!last) { setCardIdx(cardIdx + 1); return; }
          cardsSeen.current.add(cur.uid); acc.current.itemStart = activeNow(); setCardIdx(0); setStage('work');
        };
        return (
          <>
            <div className="ln-body"><div className="ln-inner">
              <Feed mode={lesson.kind} title={bareTitle(lesson.title)} skipTitle={lesson.title} entries={entries}
                flagFor={(e) => <ReportFlag context={() => stepContext(e.card, lesson, `сообщение ${e.index}`)} />}
                picture={(c) => <CardPicture c={c} />} />
            </div></div>
            <div className={`ln-foot ${fb && !fb.empty ? `fb ${fb.ok ? 'ok' : 'bad'}` : ''}`} data-testid="lesson-foot">
              {!liveCard && fb && !fb.empty ? verdictBar : (
                <div className="ln-inner">
                  {liveCard ? <Button wide onClick={feedGo}>{lesson.kind === 'listen' ? 'К вопросу' : 'Дальше'}</Button>
                    : <>
                      {fb && fb.empty && <div style={{ fontSize: 14, color: 'var(--ds-bad)', marginBottom: 8 }}>Введите число: например, 25 или −0,5.</div>}
                      {inst && !GAME_KINDS.includes(inst.kind) && !SELF_CHECK.includes(inst.kind) && <Button wide disabled={!ready(inst, resp)} onClick={() => doCheck()}>{inst.kind === 'open' ? 'Ответить' : 'Проверить'}</Button>}
                {inst && inst.kind === 'open' && <OpenSkip onSkip={() => doCheck({ skip: true })} />}
                    </>}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {term && stage === 'work' && (
        <div className="ln-term-sheet ds-rise" role="dialog" aria-label={`Термин: ${termTitle(term)}`} data-testid="term-sheet">
          <div className="ln-inner">
            <div className="ds-eyebrow">{isWorldTerm(term) ? 'Мир Инфляции' : 'Словарь'}</div>
            <div className="ds-h2" style={{ marginTop: 2 }}>{termTitle(term)}</div>
            <div className="ds-text" style={{ fontSize: 15.5, margin: '8px 0 14px' }}>{termText(term)}</div>
            {termFormula(term) && <div className="ln-key-tex" style={{ margin: '-4px 0 14px' }} data-testid="term-formula"><Inline nodes={[{ t: 'math', v: termFormula(term) }]} ctx={noopCtx} /></div>}
            <Button variant="secondary" wide onClick={() => setTerm(null)} autoFocus>Понятно</Button>
          </div>
        </div>
      )}

      {stage === 'done' && result && (
        <div className="ln-body"><div className="ln-inner" data-testid="lesson-result">
          {(run.mode !== 'check' || result.pass) && <CoinShower seed={result.xp + 1} />}
          {/* итоги — как сертификат: гильош по краям, розетка-печать с Инфлей */}
          <Card style={{ padding: 0, overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 30, right: 14 }}>
              <ReportFlag context={() => ({ screen: 'result', mode: run.mode, lesson: lesson ? lesson.id : '', unit: unitId || '', answer: `точность ${Math.round(result.accuracy)}%, ошибок ${result.mistakes}, опыт ${result.xp}` })} />
            </span>
            <Guilloche height={22} />
            <div style={{ padding: '14px 16px 18px' }}>
              <div className="ds-eyebrow">{lesson ? `${placeOf(unitId).place} · ${LESSON_KIND[lesson.kind]}` : title}</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
                <Rosette size={128} opacity={0.5}><Mascot mood={run.mode === 'check' && !result.pass ? 'cheer' : result.accuracy >= 60 ? 'party' : 'cheer'} size={70} /></Rosette>
              </div>
              <h2 className="ds-h1" data-testid="result-title">{run.mode === 'level' ? (result.pass ? 'Уровень подтверждён' : 'Уровень пройден') : run.mode === 'check' ? (result.pass ? 'Проверка сдана' : 'Проверка пока не сдана') : run.mode === 'practice' ? 'Практика окончена' : run.mode === 'fix' ? 'Ошибки разобраны — Путь открыт' : run.mode === 'placement' ? 'Тест пройден' : 'Урок пройден'}</h2>
              {run.mode !== 'placement' && (
                <div className="ds-h3" style={{ color: 'var(--u-ink)', marginTop: 4 }} data-testid="result-say">
                  {pickPhrase(endKind({ mistakes: result.mistakes, accuracy: result.accuracy, failedCheck: run.mode === 'check' && !result.pass }), new Set())}
                </div>
              )}
              <div className="ds-sub" style={{ fontSize: 15.5, margin: '6px 0 16px' }} data-testid="result-text">
                {run.mode === 'placement' ? (result.opened.length
                  ? `Открыто сразу: ${result.opened.map((u) => `«${placeOf(u).place}»`).join(', ')}. ${result.opened.length >= UNITS.filter((u) => u.lessons.length).length ? 'Пройденные уроки можно взять на алмазном уровне.' : 'Путь продолжится со следующего места.'}`
                  : 'Начнём с самого начала — так надёжнее. Первые уроки короткие.')
                  : run.mode === 'level' ? (result.pass ? `Верно ${Math.round((result.accuracy * total) / 100)} из ${total} — уровень «${LEVEL_BY_ID[run.levelId].title}» подтверждён. ${nextLevelText(run.levelId)}`
                    : `Верно ${Math.round((result.accuracy * total) / 100)} из ${total}. Для подтверждения — от ${LEVEL_REVIEW_OK}%: ошибки ждут в «Повторить ошибки», а повторение можно пройти снова. ${nextLevelText(run.levelId)}`)
                  : run.mode === 'check' && run.levelId ? (result.pass ? `${nextLevelText(run.levelId)} Уроки пройденного уровня тоже открыты.` : `Ошибок с первой попытки: ${result.mistakes}. Для зачёта — не больше ${plan.passMistakes}. Уроки уровня никуда не делись.`)
                  : run.mode === 'check' && run.review ? (result.pass ? 'Юнит не забыт: знания на месте.' : `Ошибок с первой попытки: ${result.mistakes}, для зачёта — не больше ${plan.passMistakes}. Стоит повторить уроки юнита — они открыты.`)
                  : run.mode === 'check' ? (result.pass ? 'Уроки юнита открыты — можно идти дальше.' : `Ошибок с первой попытки: ${result.mistakes}. Для зачёта — не больше ${plan.passMistakes}. Уроки юнита никуда не делись.`)
                  : lesson && lesson.kind === 'summary' ? `Тест юнита: верно ${Math.round((result.accuracy * total) / 100)} из ${total}. «${placeOf(unitId).place}» пройден.`
                    : lesson && lesson.kind === 'game' ? gameResultText(result)
                      : result.mistakes === 0 ? 'Все ответы — с первой попытки.' : `Ошибок с первой попытки: ${result.mistakes}.`}
                {diamond && <div style={{ marginTop: 6, color: 'var(--u-ink)', fontWeight: 700 }} data-testid="result-diamond">
                  {result.accuracy >= DIAMOND_ACCURACY ? '◆ Алмазный уровень взят' : `◆ Для алмаза нужно от ${DIAMOND_ACCURACY}% верных`}
                </div>}
              </div>
              {result.streakUp > 0 && <StreakBurst days={result.streakUp} />}
              <div className="ln-tickets">
                <div data-testid="result-xp" data-bonus={result.bonus || 0}><div className="ds-eyebrow" style={{ fontSize: 12 }}>Опыт{result.boosted ? ' ×2' : ''}</div><div className="v"><CountUp value={result.xp} prefix="+" /></div>
                  {result.bonus > 0 && <div className="ln-xp-bonus" data-testid="result-xp-bonus" title={`+${result.bonus} ${result.game ? 'за игру и верные ответы подряд' : 'за верные ответы подряд'}`}><Zap size={15} strokeWidth={2.4} aria-hidden="true" />+{result.bonus}</div>}</div>
                <div data-testid="result-acc"><div className="ds-eyebrow" style={{ fontSize: 12 }}>Точность</div><div className="v">{Math.round(result.accuracy)}%</div></div>
                <div data-testid="result-time"><div className="ds-eyebrow" style={{ fontSize: 12 }}>Время</div><div className="v">{mmss(result.ms)}</div></div>
              </div>
              {/* пояснение к молнии — под плитками, а не в плитке: на узком телефоне оно растягивало все три */}
              {result.bonus > 0 && <div className="ln-xp-note" data-testid="result-xp-note"><Zap size={15} strokeWidth={2.4} aria-hidden="true" />+{result.bonus} опыта — {result.game ? 'за игру и верные ответы подряд' : 'за верные ответы подряд'}</div>}
              <GainsList coins={result.coins} gains={result.gains} label={run.mode === 'level' ? 'За большое повторение' : 'За урок'} />
              {lesson && run.mode === 'lesson' && !replay && partsOfLesson(lesson.id).length > 0 && (
                <div className="ds-sub" style={{ fontSize: 14.5, marginTop: 10 }} data-testid="result-model">
                  В модель рынка добавлено: {partsOfLesson(lesson.id).map((p) => `«${p.title}»`).join(', ')}. Покрутить её можно на Пути, под юнитом.
                </div>
              )}
              {replay && !diamond && <div className="ds-faint" style={{ fontSize: 13.5, marginTop: 12 }}>Урок уже был пройден: за простой повтор — немного опыта и монет. На алмазном уровне задачи сложнее, а награда больше.</div>}
            </div>
            <Guilloche height={22} />
          </Card>
          {guest && <GuestSave learn={learn} afterLesson />}
          {result.raceFriends && !raceDone && <RaceOffer friends={result.raceFriends} onDone={() => setRaceDone(true)} />}
          <div style={{ display: 'grid', gap: 6, marginTop: 16 }}>
            <Button wide data-nav="back" onClick={onClose}>Дальше</Button>
            {lesson && (
              <Button variant="ghost" wide icon={BookOpenText} data-testid="result-theory" data-nav-target={`book:chapter:${lesson.unitId}`}
                onClick={() => onOpenBook({ kind: 'chapter', id: lesson.unitId, anchor: lesson.section })}>Подробнее в учебнике</Button>
            )}
          </div>
        </div></div>
      )}
      {/* черновик — последним: холст всё равно под уроком, а панель в порядке Tab — после кнопок урока */}
      {sketch && <Sketch />}
      {sketch && antistress && <Antistress paused={!!hidden} />}
    </DsRoot>
  );
}
// контекст шага урока или сообщения ленты для «Сообщить об ошибке»
const stepContext = (card, lesson, where) => ({
  screen: 'step', lesson: lesson ? lesson.id : '', unit: lesson ? lesson.unitId : '', kind: lesson ? lesson.kind : '',
  step: `${where}${card && card.id ? ` · ${card.id}` : ''}${card && card.title ? ` · ${card.title}` : ''}`, prompt: flatText(card && card.text).slice(0, 1500),
});
/* Отвеченный вопрос в ленте (история, архив эфира) — как реплика в переписке: условие мелко, ответ
   ученика — пузырём справа, с галочкой или крестиком, а если неверно — под ним верный. Без печатей
   «Верно. Звенит как надо»: в разговоре героев штамп выглядел чужеродно. Варианты, которые не
   выбраны, в ленте не нужны — лента остаётся читаемой историей. */
function answerOf(inst, resp) {
  if (resp && resp.skip) return null;
  switch (inst.kind) {
    case 'choice': case 'gap': case 'shift': {
      const o = (inst.options || []).find((x) => x.key === resp);
      return o ? <Inline nodes={o.text} ctx={noopCtx} /> : null;
    }
    case 'tf': return resp === true || resp === 'true' ? 'Верно' : resp === false || resp === 'false' ? 'Неверно' : null;
    case 'calc': return resp ? `${String(resp).replace('-', '−')}${inst.unit ? ` ${unitFor(inst, resp)}` : ''}` : null;
    case 'open': return String(resp || '').trim() || null;
    case 'domino': {
      const falls = resp && resp.falls ? resp.falls.length : 0;
      return resp && resp.done ? `цепочка собрана${falls ? `, домино падало ${falls} ${falls % 10 === 1 && falls % 100 !== 11 ? 'раз' : 'раза'}` : ''}` : null;
    }
    default: return null;
  }
}
function FeedAnswer({ h }) {
  const { inst, resp, fb } = h;
  const skipped = !!(resp && resp.skip);
  const mine = answerOf(inst, resp);
  const tone = skipped ? 'skip' : fb.ok ? 'ok' : 'bad';
  const who = skipped ? 'Вопрос пропущен' : inst.kind === 'open' ? 'Ваш ответ' : fb.partial ? 'Ваш ответ · собрано' : fb.ok ? 'Ваш ответ · верно' : 'Ваш ответ · не совсем';
  return (
    <div className="fd-qa" data-kind={inst.kind}>
      <div className="fd-qa-q tb-body"><Blocks blocks={inst.prompt} ctx={noopCtx} /></div>
      <div className={`fd-qa-a ${tone}`} data-ok={String(fb.ok)} data-testid="feed-answer">
        <span className="fd-qa-ic" aria-hidden="true">{skipped ? <SkipForward size={13} /> : fb.ok ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}</span>
        <span className="fd-qa-txt">
          <span className="fd-qa-who">{who}</span>
          {skipped ? 'Можно вернуться к нему, пройдя урок ещё раз.' : mine || (fb.ok ? answerText(inst) : 'не совпал с верным')}
        </span>
      </div>
      {!fb.ok && <div className="fd-qa-right">Правильно: <b>{answerText(inst)}</b></div>}
    </div>
  );
}
/* Разбор по шагам — на уровне «по шагам» (точность ниже 60%): решение открывается по одному
   шагу, чтобы каждый можно было осмыслить. */
function StepsExplain({ blocks }) {
  const [n, setN] = useState(1);
  return (
    <div style={{ marginTop: 8 }} data-testid="steps" data-shown={n}>
      {blocks.slice(0, n).map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <span className="ds-num" style={{ fontWeight: 700, fontSize: 13, minWidth: 54 }}>Шаг {i + 1}</span>
          <div className="tb-body" style={{ fontSize: 15, color: 'inherit', flex: 1 }}><Blocks blocks={[b]} ctx={noopCtx} /></div>
        </div>
      ))}
      {n < blocks.length && <Button small variant="secondary" style={{ marginTop: 8 }} data-testid="steps-next" onClick={() => { Audio.play('paper'); setN(n + 1); }}>Следующий шаг</Button>}
    </div>
  );
}
/* Обозначения под шагом с формулами: каждая буква — что она значит (src/textbook/symbols.js).
   Шаг «В формуле Q_D = 100 − 2P …» — и под ним «Q_D — объём спроса…; P — цена…». */
const mathIn = (nodes, out = []) => { (nodes || []).forEach((n) => { if (n.t === 'math') out.push(n.v); else if (n.c) mathIn(n.c, out); }); return out; };
// серия на итогах урока: огонёк вспыхивает, счётчик дней перещёлкивается с прошлого на сегодняшний
// формула шага, по которой считают упражнения после него, — с пометкой «Запомнить», как в главе
function StepRemember({ tex }) {
  return (
    <div className="ln-key" data-testid="step-remember">
      <div className="ds-eyebrow" style={{ fontSize: 12 }}>Запомнить</div>
      <div className="ln-key-tex"><Inline nodes={[{ t: 'math', v: tex }]} ctx={noopCtx} /></div>
    </div>
  );
}
function StepLegend({ nodes, unitId }) {
  const list = symbolsOf(mathIn(nodes), unitId);
  if (!list.length) return null;
  return (
    <div className="ln-legend" data-testid="step-legend">
      <div className="ds-eyebrow" style={{ fontSize: 12, marginBottom: 2 }}>Обозначения</div>
      {list.map((x) => <div key={x.key}><Inline nodes={[{ t: 'math', v: x.key }]} ctx={noopCtx} /> — {inCrowns(x.text)}</div>)}
    </div>
  );
}

export default Runner;
