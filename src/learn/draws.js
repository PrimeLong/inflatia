/* «НАРИСУЙ САМ» (docs/mechanics.md, «Нарисуй сам»): ученик сам строит график юнита по условию — как задача
   (каждый шаг проверяется) и как «Разбор графика» (график собирается по шагам, на каждом — одна мысль).
   Задание (task):
     do: 'line'  — отметить две точки линии el (засчитана любая пара точек на ней, не слишком близких);
         'point' — отметить точку: el = 'pt:<подпись>' точки графика или at = { x, y };
         'shift' — сдвинуть кривую: ползунок модели control до target;
         'area'  — нажать внутрь площади el ('rect:0' или 'poly:<подпись>');
     values — положения ползунков модели на этом шаге; add — что появляется на графике после верного ответа;
     show — что видно, пока шаг решают (бледная прежняя линия при сдвиге), hide — что прячется с этого шага
     (прежнее равновесие: иначе точка E поехала бы за кривой и подсказала ответ); mark — пометка точки, у которой
     нет своего элемента графика; text — условие, hint — подсказка после ошибки, done — что это значит.
   snap — шаг, к которому прилипают точки; grid — мелкая сетка поверх графика (по ней легче найти «20 чашек»).
   Элементы — те же имена, что у «Разбора графика» (src/learn/graphs.js): кривые по id модели, «pt:E»,
   «guide:E», «rect:0», «poly:DWL», «axes». Модуль чистый: его читают урок (src/learn-draw.jsx), дорога
   юнита (src/learn/stops.js) и тесты. */
import { CHARTS, chartDefaults } from '../textbook/charts.js';

export const DRAW_XP = 15;
// допуск: расстояние в долях осей (5% ширины и высоты поля) — точку не нужно ставить до пикселя
export const DRAW_TOL = 0.05;
// две точки линии — не ближе пятой части поля: иначе линию не провести уверенно
export const DRAW_MIN_SPAN = 0.2;

export const DRAWS = [
  {
    id: 'draw-sd', unitId: 'supply-demand', chart: 'supply-demand', attrs: {}, title: 'Спрос и предложение', snap: [5, 5], grid: [10, 10],
    given: ['axes'],
    intro: 'Постройте график рынка кофе в Велеграде сами: по горизонтали — **чашки в день Q**, по вертикали — **цена P** в кронах.',
    tasks: [
      { do: 'line', el: 'D', add: ['D'],
        text: 'По 40 крон за чашку покупают **20 чашек** в день, по 10 крон — **80**. Отметьте эти две точки — через них пройдёт **спрос D**.',
        hint: 'Точка — пара чисел: найдите 20 на горизонтальной оси и поднимитесь до цены 40; вторая — 80 по горизонтали и 10 по вертикали.',
        done: 'Спрос падает: чем дешевле кофе, тем больше чашек покупают.' },
      { do: 'line', el: 'S', add: ['S'],
        text: 'Кофейни готовы варить по 10 крон **20 чашек**, по 30 крон — **100**. Отметьте две точки **предложения S**.',
        hint: 'Предложение растёт с ценой: 20 чашек при цене 10, 100 чашек при цене 30.',
        done: 'Предложение растёт: чем дороже кофе, тем выгоднее варить больше.' },
      { do: 'point', el: 'pt:E', add: ['pt:E', 'guide:E'],
        text: 'Отметьте **равновесие** — цену, при которой хотят купить столько же чашек, сколько сварят.',
        hint: 'Равновесие — там, где линии спроса и предложения пересекаются.',
        done: 'По 20 крон и покупают, и варят **60 чашек**: ни очередей, ни остывших чашек.' },
      { do: 'shift', el: 'D', control: 'dA', target: 30, show: ['D0'], hide: ['pt:E', 'guide:E'], add: ['D0'], values: { dA: 30 },
        text: 'Доходы выросли: при каждой цене покупают на **30 чашек больше**. Сдвиньте спрос — потяните график вправо или влево.',
        hint: '«При каждой цене больше» — вся линия спроса едет вправо, на 30 чашек.',
        done: 'Спрос сдвинулся **вправо** на 30 чашек при каждой цене — прежний остался бледным.' },
      { do: 'point', el: 'pt:E', values: { dA: 30 }, add: ['pt:E', 'guide:E'],
        text: 'Отметьте **новое равновесие**.',
        hint: 'Ищите пересечение нового спроса с тем же предложением.',
        done: 'Цена выросла до **25 крон**, продают **80 чашек**: рост спроса поднимает и цену, и количество.' },
    ],
  },
  {
    id: 'draw-labor', unitId: 'labor', chart: 'labor', attrs: { a: 300, b: 1, c: -60, d: 1 }, title: 'Рынок труда пекарей', snap: [10, 10], grid: [50, 50],
    given: ['axes'],
    intro: 'Постройте рынок труда пекарей сами: по горизонтали — **пекари L**, по вертикали — **зарплата за смену w** в кронах.',
    tasks: [
      { do: 'line', el: 'D', add: ['D'],
        text: 'При зарплате 200 крон за смену пекарни наймут **100 пекарей**, при 100 кронах — **200**. Отметьте две точки **спроса на труд**.',
        hint: 'Первая точка — 100 пекарей по горизонтали и 200 крон по вертикали, вторая — 200 пекарей и 100 крон.',
        done: 'Спрос на труд падает: чем дороже смена, тем меньше пекарей окупается.' },
      { do: 'line', el: 'S', add: ['S'],
        text: 'При 100 кронах за смену работать пекарем готовы **40 человек**, при 200 — **140**. Отметьте две точки **предложения труда**.',
        hint: 'Предложение труда растёт с зарплатой: 40 человек при 100 кронах, 140 — при 200.',
        done: 'Предложение труда растёт: высокая зарплата перекрывает альтернативную стоимость часа у большего числа людей.' },
      { do: 'point', el: 'pt:E', add: ['pt:E', 'guide:E'],
        text: 'Отметьте **равновесную зарплату** — где пекарен нанимают ровно столько, сколько людей хотят работать.',
        hint: 'Равновесие — пересечение спроса на труд и предложения труда.',
        done: 'При **180 кронах** за смену работают **120 пекарей**: желающих и мест поровну.' },
      { do: 'shift', el: 'S', control: 'dC', target: 60, show: ['S0'], hide: ['pt:E', 'guide:E'], add: ['S0'], values: { dC: 60 },
        text: 'Летом в город приехали студенты: при каждой зарплате работать хотят на **60 человек больше**. Сдвиньте предложение труда.',
        hint: '«При каждой зарплате больше желающих» — линия предложения едет вправо, на 60 человек.',
        done: 'Предложение труда сдвинулось **вправо** — прежнее осталось бледным.' },
      { do: 'point', el: 'pt:E', values: { dC: 60 }, add: ['pt:E', 'guide:E'],
        text: 'Отметьте **новое равновесие**.',
        hint: 'Новое предложение пересекается с тем же спросом на труд — ниже и правее.',
        done: 'Зарплата упала до **150 крон**, работают **150 человек**: желающих больше — труд дешевле.' },
    ],
  },
  {
    id: 'draw-monopoly', unitId: 'competition-monopoly', chart: 'monopoly', attrs: { a: 100, b: 1, mc: 20 }, title: 'Монополия', snap: [5, 5], grid: [10, 10],
    given: ['axes', 'MC'],
    intro: 'Постройте график монополиста сами. На графике уже есть его предельные издержки: **MC = 20** крон за каждую единицу.',
    tasks: [
      { do: 'line', el: 'D', add: ['D'],
        text: 'Спрос на товар монополиста: по 80 крон покупают **20 штук**, по 40 крон — **60**. Отметьте две точки **спроса D**.',
        hint: 'Первая точка — 20 штук по горизонтали и 80 крон по вертикали, вторая — 60 штук и 40 крон.',
        done: 'Продавец один, поэтому весь спрос рынка — его: чтобы продать больше, придётся снизить цену.' },
      { do: 'line', el: 'MR', add: ['MR'],
        text: '**Предельная выручка MR** падает вдвое быстрее спроса: при 20 штуках — **60 крон**, при 40 штуках — **20**. Отметьте две точки MR.',
        hint: 'MR начинается там же, где спрос, но падает круче: 20 штук — 60 крон, 40 штук — 20 крон.',
        done: 'Чтобы продать ещё единицу, монополист снижает цену на все — поэтому выручка от ещё одной единицы меньше цены.' },
      { do: 'point', at: { x: 40, y: 20 }, mark: { t: 'pt', x: 40, y: 20, label: 'MR = MC', tone: 'teal' },
        text: 'Монополист выбирает выпуск там, где **MR = MC**. Отметьте эту точку.',
        hint: 'Ищите пересечение линии MR с горизонтальной линией MC = 20.',
        done: 'Выпуск — **40 штук**: левее ещё выгодно добавлять, правее — каждая единица приносит меньше, чем стоит.' },
      { do: 'point', el: 'pt:M', add: ['pt:M', 'guide:M'],
        text: 'Цену монополист берёт **со спроса** — над своим выпуском. Отметьте точку его цены.',
        hint: 'Поднимитесь от выпуска 40 вертикально до линии спроса D.',
        done: 'Цена — **60 крон**: по ней покупатели берут ровно 40 штук.' },
      { do: 'area', el: 'poly:DWL', add: ['poly:DWL'],
        text: 'Где на графике **безвозвратные потери** монополии? Нажмите внутрь этой области.',
        hint: 'Это треугольник между спросом и MC — от выпуска монополиста до выпуска при конкуренции.',
        done: 'Треугольник от 40 до 80 штук между спросом и MC — сделки, которые были бы выгодны и покупателям, и продавцу, но не состоялись.' },
    ],
  },
];
export const DRAW_BY_ID = Object.fromEntries(DRAWS.map((d) => [d.id, d]));
export const DRAW_BY_UNIT = Object.fromEntries(DRAWS.map((d) => [d.unitId, d]));
export const isDrawDone = (learn, id) => !!((learn && learn.draws) || {})[id];

// сцена графика на шаге: ползунки модели — по умолчанию, потом values шага и живое значение (сдвиг)
export function drawScene(d, values = {}) {
  const def = CHARTS[d.chart];
  return def.build(d.attrs, { ...chartDefaults(d.chart, d.attrs), ...values });
}
// где задание ищет ответ: точка графика по подписи или явные координаты
export function taskTarget(d, t, values = t.values || {}) {
  const sc = drawScene(d, values);
  if (t.do === 'point') {
    if (t.at) return t.at;
    const label = t.el.replace(/^pt:/, '');
    const p = sc.points.find((q) => q.label === label);
    return p ? { x: p.x, y: p.y } : null;
  }
  return null;
}
const norm = (sc) => ({ dx: sc.xDomain[1] - sc.xDomain[0], dy: sc.yDomain[1] - sc.yDomain[0] });
// расстояние от точки до отрезка — в долях осей
function segDist(p, a, b, n) {
  const ax = a.x / n.dx; const ay = a.y / n.dy; const bx = b.x / n.dx; const by = b.y / n.dy; const px = p.x / n.dx; const py = p.y / n.dy;
  const vx = bx - ax; const vy = by - ay; const len = vx * vx + vy * vy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
const curveDist = (p, pts, n) => pts.slice(1).reduce((m, q, i) => Math.min(m, segDist(p, pts[i], q, n)), Infinity);
function inPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i]; const b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* Проверка ответа ученика: для линии — две точки { a, b }, для точки и площади — { p }, для сдвига — { v }.
   Ответ — { ok, why } (why — что не так, коротко; подробнее — hint задания). */
export function checkTask(d, t, ans) {
  const values = t.values || {};
  const sc = drawScene(d, values); const n = norm(sc);
  if (t.do === 'line') {
    const c = sc.curves.find((q) => q.id === t.el);
    if (!c || !ans || !ans.a || !ans.b) return { ok: false, why: 'Отметьте две точки.' };
    if (Math.hypot((ans.a.x - ans.b.x) / n.dx, (ans.a.y - ans.b.y) / n.dy) < DRAW_MIN_SPAN) return { ok: false, why: 'Точки слишком близко — отметьте их подальше друг от друга.' };
    const off = [ans.a, ans.b].filter((p) => curveDist(p, c.points, n) > DRAW_TOL).length;
    return off ? { ok: false, why: off === 2 ? 'Обе точки не на той линии.' : 'Одна точка встала не туда.' } : { ok: true };
  }
  if (t.do === 'point') {
    const tg = taskTarget(d, t, values);
    if (!tg || !ans || !ans.p) return { ok: false, why: 'Отметьте точку.' };
    return Math.hypot((ans.p.x - tg.x) / n.dx, (ans.p.y - tg.y) / n.dy) <= DRAW_TOL ? { ok: true } : { ok: false, why: 'Точка не там.' };
  }
  if (t.do === 'shift') {
    const v = ans && Number(ans.v);
    if (!Number.isFinite(v) || v === 0) return { ok: false, why: 'Потяните линию.' };
    if (Math.sign(v) !== Math.sign(t.target)) return { ok: false, why: 'Не в ту сторону.' };
    return Math.abs(v - t.target) <= d.snap[0] ? { ok: true } : { ok: false, why: Math.abs(v) < Math.abs(t.target) ? 'Сдвиг маловат.' : 'Сдвиг великоват.' };
  }
  if (t.do === 'area') {
    if (!ans || !ans.p) return { ok: false, why: 'Нажмите внутрь области.' };
    const shape = t.el.startsWith('rect:') ? (() => { const r = (sc.rects || [])[Number(t.el.slice(5))]; return r && [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }]; })()
      : ((sc.polys || []).find((q) => q.label === t.el.slice(5)) || {}).points;
    return shape && inPoly(ans.p, shape) ? { ok: true } : { ok: false, why: 'Это не та область.' };
  }
  return { ok: false, why: '' };
}
// правильный ответ — для «вот как надо» после второй ошибки и для тестов
export function solveTask(d, t) {
  const values = t.values || {};
  const sc = drawScene(d, values);
  if (t.do === 'line') {
    const c = sc.curves.find((q) => q.id === t.el);
    const inF = (p) => p.x >= sc.xDomain[0] && p.x <= sc.xDomain[1] && p.y >= sc.yDomain[0] && p.y <= sc.yDomain[1];
    const a = c.points[0]; const b = c.points[c.points.length - 1];
    const at = (f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    const pts = [0.2, 0.3, 0.7, 0.8].map(at).filter(inF);
    return { a: pts[0], b: pts[pts.length - 1] };
  }
  if (t.do === 'point') return { p: taskTarget(d, t, values) };
  if (t.do === 'shift') return { v: t.target };
  if (t.do === 'area') {
    const shape = t.el.startsWith('rect:') ? (() => { const r = (sc.rects || [])[Number(t.el.slice(5))]; return [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y1 }]; })()
      : ((sc.polys || []).find((q) => q.label === t.el.slice(5)) || {}).points;
    const cx = shape.reduce((s, q) => s + q.x, 0) / shape.length; const cy = shape.reduce((s, q) => s + q.y, 0) / shape.length;
    return { p: { x: cx, y: cy } };
  }
  return null;
}
// точка — к ближайшему узлу сетки (snap — шаг по осям)
export const snapTo = (d, p) => ({ x: Math.round(p.x / d.snap[0]) * d.snap[0], y: Math.round(p.y / d.snap[1]) * d.snap[1] });

/* «Разбор» для графика урока: шаг 0 — то, что дано; шаг i + 1 — решено задание i (появилось add,
   ползунки — values). Его рисует GraphStage из src/learn-graph.jsx. */
export function drawTour(d) {
  return {
    id: d.id, chart: d.chart, attrs: d.attrs, title: d.title,
    steps: [{ add: d.given, focus: [] }, ...d.tasks.map((t) => ({ add: t.add || [], focus: [], hide: t.hide, values: t.values || {}, marks: t.mark ? [t.mark] : [], text: t.done }))],
  };
}
