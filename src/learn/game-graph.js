/* ГРАФИК МИНИ-ИГРЫ — ТОТ ЖЕ, ЧТО В «РАЗБОРЕ ГРАФИКА» ЮНИТА (пункт владельца 19.11: «в мини-игре должен быть график, такой
   же как в разборе графика, потому что там обычный дефолтный — это смешно, к чему в главе про производственную функцию
   спрос и предложение»). Игра хранит своё состояние (сдвиги, доход, наценку — src/learn-play.jsx, applyEffect), а рисует
   его модель учебника (src/textbook/charts.js) той же сценой GraphStage (src/graph-stage.jsx), что и разбор: те же
   оси, сетка, цвета, подписи без наложений, прежнее положение — бледным.
     рынок «Спроса и предложения» и «Провалов рынка» — спрос и предложение; «Биржи труда» — рынок труда;
     «Банка» — рынок кредитов (те же линии, свои названия); «Сберкассы» — вклад и копилка при текущей ставке;
     «Завода» — общий продукт цеха (своя игра: технологии и работники); КПВ, бюджет, эластичность, издержки — свои модели;
     рыночная власть и наценка — спрос на товар фирмы, MR и MC (src/learn/power-chart.js).
   gameGraph(inst, st) → { g, live }: g — «урок» для GraphStage (модель, параметры, крайние состояния игры для окна осей),
   live — значения модели при этом состоянии. Модуль чистый. */
import { CHARTS } from '../textbook/charts.js';
import { equilibrium } from './course.js';
import { powerModel, powerMc } from './power-chart.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unitOf = (inst) => String(inst.id || '').split('-')[0];

// те же линии рынка со своими словами: оси и названия кривых (рынок кредитов, процент)
function renamed(base, names) {
  if (!names) return base;
  return {
    ...base,
    build: (A, v) => {
      const sc = base.build(A, v);
      return {
        ...sc,
        xLabel: names.x || sc.xLabel, yLabel: names.y || sc.yLabel,
        curves: sc.curves.map((c) => (c.id === 'D' && names.d ? { ...c, label: names.d } : c.id === 'S' && names.s ? { ...c, label: names.s } : c)),
      };
    },
  };
}
const CREDIT = { x: 'кредиты, млн кр.', y: 'ставка, %', d: 'спрос на кредиты', s: 'предложение кредитов' };

/* рыночная власть: спрос на товар фирмы поворачивается вокруг (6; 30), MR вдвое круче, MC растёт; выпуск — где MR = MC,
   цена — со спроса; наценка — прямоугольник от MC до цены (в «Наценке» — всегда) */
const POWER = (markup) => ({
  build: (_A, v) => {
    const pm = powerModel(v.m); const QM = 12;
    const curves = [
      { id: 'MC', label: 'MC', labelPos: 0.85, points: [{ x: 0, y: powerMc(0) }, { x: 9.6, y: powerMc(9.6) }], color: 'rust' },
      { id: 'D', label: 'D', labelPos: 0.9, points: [{ x: 0, y: pm.dem(0) }, { x: QM, y: pm.dem(QM) }], color: 'blue' },
    ];
    if (pm.b > 0.05) curves.push({ id: 'MR', label: 'MR', labelPos: 0.8, points: [{ x: 0, y: pm.a }, { x: Math.min(QM, pm.mrEnd), y: pm.mr(Math.min(QM, pm.mrEnd)) }], color: 'teal', dashed: true });
    const big = pm.markup > 0.5;
    return {
      xDomain: [0, QM], yDomain: [0, 64], xLabel: 'Q', yLabel: 'P',
      curves,
      rects: big || markup ? [{ x0: 0, x1: pm.q, y0: pm.mc, y1: pm.p, tone: 'gold' }] : [],
      points: [
        { x: pm.q, y: pm.p, label: big ? `P = ${Math.round(pm.p)}` : 'P = MC', guide: true },
        ...(big ? [{ x: pm.q, y: pm.mc, label: `наценка +${Math.round(pm.markup)}`, small: true }] : []),
      ],
    };
  },
});

// какой моделью рисовать игру и как её состояние ложится на ползунки модели
export function gameGraph(inst, st) {
  const u = unitOf(inst); const chart = inst.chart;
  const g = (def, attrs, live, extremes, key) => ({ g: { id: `game-${inst.id}`, chart: key, def, attrs, title: inst.title, steps: extremes.map((values) => ({ values })) }, live });
  if (chart === 'market') {
    const m = inst.market || { a: 100, b: 2, c: 10, d: 2 };
    const attrs = { a: m.a, b: m.b, c: m.c, d: m.d };
    const sh = { dA: st.D || 0, dC: st.S || 0 };
    const ext = [{ dA: 32, dC: -32 }, { dA: -32, dC: 32 }, { dA: 32, dC: 32 }, { dA: -32, dC: -32 }];
    // «Сберкасса»: на графике — сам вклад при ставке, которую сейчас дал рынок кредитов (как в «Разборе»: «Вклад и копилка»)
    if (u === 'hh') {
      const r0 = equilibrium(m).p; const r = equilibrium({ ...m, dA: sh.dA, dC: sh.dC }).p;
      return g(CHARTS.savings, { s0: 1000, r: Math.round(r0), n: 10 }, { r: clamp(r, 0, 20), add: 0 }, [{ r: 2 }, { r: 15 }], 'savings');
    }
    if (u === 'lm') return g(CHARTS.labor, attrs, sh, ext, 'labor');
    if (u === 'mb') return g(renamed(CHARTS['supply-demand'], { ...CREDIT, ...inst.names }), attrs, sh, ext, 'credit');
    return g(renamed(CHARTS['supply-demand'], inst.names || null), attrs, sh, ext, 'supply-demand');
  }
  // «Завод»: общий продукт цеха — технологии поднимают кривую, работники двигают точку вдоль неё
  if (chart === 'product') return g(CHARTS.product, { view: 'tp', l: 3 }, { L: st.L, A: st.A }, [{ L: 1, A: 0.8 }, { L: 9, A: 1.5 }], 'product');
  if (chart === 'ppf') {
    const tx = st.rx - 100; const ty = st.ry - 100; const X = 100 * (1 + tx / 100);
    return g(CHARTS.ppf, { x: 100, y: 100 }, { tx, ty, x: X * Math.cos(st.t * (Math.PI / 2)) }, [{ tx: 38, ty: 38, x: 60 }], 'ppf');
  }
  if (chart === 'budget') {
    const base = CHARTS.budget;
    const def = { ...base, build: (A, v) => base.build({ ...A, py: v.py ?? A.py }, v) };
    return g(def, { i: 100, px: 1.25, py: 1.25 }, { I: st.I, px: st.px, py: st.py }, [{ I: 160, px: 0.9, py: 0.9 }], 'budget');
  }
  // эластичность: та же прямая спроса; точка — там, где |E| равно эластичности игры (|E| = bP / (a − bP))
  if (chart === 'elastic') {
    const a = 100; const b = 2; const e = Math.max(0.05, st.e);
    return g(CHARTS.elasticity, { a, b, p: 25 }, { P: (a * e) / (b * (1 + e)) }, [{ P: 5 }, { P: 45 }], 'elasticity');
  }
  if (chart === 'costs') return g(CHARTS.costs, { fc: 100, a: 20, b: 6, c: 1 }, { fc: 100 + 70 * (st.fc || 0), da: 8 * (st.vc || 0) }, [{ fc: 170, da: 8 }], 'costs');
  if (chart === 'power' || chart === 'markup') return g(POWER(chart === 'markup'), {}, { m: st.m }, [{ m: 0 }, { m: 1 }], chart);
  return null;
}
