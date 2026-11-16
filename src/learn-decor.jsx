/* УКРАШЕНИЯ УРОКА — живые вещицы из лавки (docs/mechanics.md, «Украшения урока»). Узкая полоса между
   шапкой урока и заданием: её можно трогать, а вещица отзывается и на ответы (событие ems-answer из
   урока). Три вещицы, у каждой своя физика:
   • «Гирлянда флажков» — верёвка из звеньев (интегрирование Верле): потяните — флажки качаются;
     верный ответ — порыв ветра, ошибка — гирлянда вздрагивает и провисает;
   • «Колыбель Ньютона» — пять шариков-маятников: оттяните крайний — удар проходит по ряду, толкните
     крайний внутрь — качаются все; взмах передаёт шарикам скорость руки;
     верный ответ — щелчок сам;
   • «Мобиле из монет» — монетки на нитях разной длины: качаются и вращаются, касание закручивает;
     верный ответ — все крутятся и вспыхивают.
   Цикл анимации засыпает, когда вещица успокоилась, — в покое она не тратит ни кадра. При «уменьшить
   движение» вещица нарисована неподвижно. */
import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from './ds-art.jsx';

export const DECOR_IDS = ['desk-bunting', 'desk-cradle', 'desk-mobile'];
// где украшение висит в уроке: ПК и планшет; на телефоне (уже 700 px) его нет (docs/mechanics.md, «Украшения урока»)
export const DESK_QUERY = '(min-width: 700px)';
export const ANSWER_EVENT = 'ems-answer';
// урок сообщает вещице об ответе
export const tellAnswer = (ok) => { try { window.dispatchEvent(new CustomEvent(ANSWER_EVENT, { detail: { ok } })); } catch { /* нет окна */ } };

const FLAG_COLORS = ['#C2490B', '#D9A21B', '#4D7C0F', '#2E5F8A', '#B0198F', '#C21E56'];
const css = (el, name, def) => { const v = el ? getComputedStyle(el).getPropertyValue(name).trim() : ''; return v || def; };

/* ---------- гирлянда: натянутая струна с флажками ----------
   Точки висят на параболе покоя; соседи тянут друг друга (волновое уравнение), каждую —
   слабая пружина к месту покоя, трение гасит. Потянули одну — волна бежит по гирлянде. */
function makeBunting(W, H) {
  const n = Math.max(8, Math.round(W / 26));
  const span = W - 16; const sag = Math.min(12, (H - 26) * 0.5);
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n; const rx = 8 + span * t; const ry = 6 + sag * 4 * t * (1 - t);
    return { rx, ry, x: rx, y: ry, ox: 0, oy: 0, vx: 0, vy: 0, pin: i === 0 || i === n };
  });
  return { kind: 'bunting', pts, wind: 0, sag: 0, t: 0 };
}
const placePt = (p, x, y, H) => { p.ox = x - p.rx; p.oy = Math.max(-p.ry, Math.min(H - 22 - p.ry, y - p.ry)); p.x = p.rx + p.ox; p.y = p.ry + p.oy; };
function stepBunting(m, dt, H) {
  const sub = 4; const h = dt / sub; const P = m.pts;
  for (let s = 0; s < sub; s += 1) {
    // сначала скорости всех точек по старым положениям, потом шаг — иначе струна раскачивается сама
    for (let i = 1; i < P.length - 1; i += 1) {
      const p = P[i];
      if (p.drag) { p.vx = 0; p.vy = 0; continue; }
      p.vx += (2400 * (P[i - 1].ox - 2 * p.ox + P[i + 1].ox) - 30 * p.ox - 3.2 * p.vx + m.wind * Math.sin(i * 0.9 + m.t * 9) * 900) * h;
      p.vy += (2400 * (P[i - 1].oy - 2 * p.oy + P[i + 1].oy) - 30 * p.oy - 3.2 * p.vy + m.sag * 500 - m.wind * 260) * h;
    }
    for (let i = 1; i < P.length - 1; i += 1) {
      const p = P[i];
      if (p.drag) continue;
      const y = p.y + p.vy * h; placePt(p, p.x + p.vx * h, y, H);
      // упёрлась в край полосы — скорость поперёк гасится
      if (p.y !== y) p.vy = 0;
    }
  }
  m.wind *= 0.96; m.sag *= 0.97;
  return P.reduce((e, p) => e + (Math.abs(p.vx) + Math.abs(p.vy)) * dt + (Math.abs(p.ox) + Math.abs(p.oy)) * 0.01, 0) + Math.abs(m.wind) * 5 + m.sag * 5;
}
function drawBunting(ctx, m, col) {
  ctx.lineWidth = 1.6; ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.55;
  ctx.beginPath(); m.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < m.pts.length - 1; i += 1) {
    const a = m.pts[i]; const b = m.pts[i + 1];
    const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const sway = (a.vx + b.vx) * 0.004;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ang * 0.6 + sway);
    ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(0, 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-2, 0); ctx.lineTo(-1, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* ---------- колыбель Ньютона: маятники и упругие удары соседей ---------- */
/* Шарики крупнее на большой подставке (радиус — от высоты); размах ограничен CRADLE_MAX, как у настоящей
   колыбели, где нити упираются в раму, — шарик не вылетает за холст, как ни взмахни (docs/mechanics.md) */
export const CRADLE_MAX = 0.75;
export const CRADLE_LIFT = { to: -0.62, dur: 0.4 };
function makeCradle(W, H) {
  const r = Math.max(7, Math.min(13, Math.round(H * 0.075))); const gap = r * 2 + 0.6; const top = H > 80 ? 14 : 5; const L = H - top - r - (H > 80 ? 12 : 4); const cx = W / 2;
  const balls = Array.from({ length: 5 }, (_, i) => ({ ax: cx + (i - 2) * gap, a: 0, w: 0 }));
  return { kind: 'cradle', r, L, balls, top, clicks: 0, t: 0, lift: null };
}
// какая ширина нужна колыбели высоты H, чтобы крайний шарик на пределе размаха оставался на холсте
export function cradleWidth(H) {
  const m = makeCradle(400, H);
  return Math.ceil(4 * (m.r * 2 + 0.6) + 2 * (m.L * Math.sin(CRADLE_MAX) + m.r) + 8);
}
const ballPos = (m, b) => ({ x: b.ax + Math.sin(b.a) * m.L, y: m.top + Math.cos(b.a) * m.L });
/* Взять можно любой шарик и вести в любую сторону — он толкает все шарики до края в эту сторону, как в
   настоящей колыбели: второй слева влево — подняли два, вправо — толкает четыре; правый крайний влево —
   качаются все пять. Отпустили — сколько ударило, столько и вылетит. */
export function cradleGroup(m, idx, dir) {
  const left = dir < 0;
  return { left, group: left ? m.balls.slice(0, idx + 1) : m.balls.slice(idx) };
}
/* держать шарик idx, оттянутый на dx по горизонтали: рука тянет группу до края к одному углу — шарики не
   прыгают под палец, а летят к нему как на упругой нити (pull — куда тянут, шаг расчёта — CRADLE_PULL);
   docs/mechanics.md, «Украшения урока» */
export const CRADLE_PULL = { k: 110, zeta: 0.8, maxW: 7 };
export function holdCradle(m, idx, dx) {
  const L = m.L; const lim = L * Math.sin(CRADLE_MAX); const d = Math.max(-lim, Math.min(lim, dx));
  m.lift = null;
  const { group } = cradleGroup(m, idx, d);
  const a = Math.asin(d / L);
  m.balls.forEach((b) => { const held = group.includes(b); b.drag = held; b.pull = held ? a : null; });
  return group.length;
}
// отпустили: шарики уходят с той скоростью, с какой летели к руке (не больше предела)
export function releaseCradle(m) {
  const lim = CRADLE_PULL.maxW;
  m.balls.forEach((b) => { if (b.drag && b.pull != null) b.w = Math.max(-lim, Math.min(lim, b.w)); b.drag = false; b.pull = null; });
}
/* затухание колыбели — в секунду, а не за шаг расчёта: прежние 0,2% за подшаг гасили размах вдвое
   за полторы секунды. Теперь размах уменьшается вдвое примерно за 4–5 секунд: заметно качается
   секунд 15 и затихает за полминуты (и тогда анимация засыпает — батарею не тратит) */
export const CRADLE_DAMP = 0.3;
const easeOut = (x) => 1 - (1 - x) * (1 - x);
function stepCradle(m, dt) {
  const sub = 8; const h = dt / sub; let hit = 0;
  const keep = Math.exp(-CRADLE_DAMP * h);
  // верный ответ: крайний шарик плавно поднимается (а не перескакивает наверх), потом отпускается
  if (m.lift) {
    const b = m.balls[0]; m.lift.t += dt;
    const k = Math.min(1, m.lift.t / CRADLE_LIFT.dur);
    b.a = m.lift.from + (CRADLE_LIFT.to - m.lift.from) * easeOut(k); b.w = 0; b.drag = k < 1;
    if (k >= 1) { b.drag = false; m.lift = null; }
  }
  const k = CRADLE_PULL.k; const c = 2 * CRADLE_PULL.zeta * Math.sqrt(k);
  for (let s = 0; s < sub; s += 1) {
    m.balls.forEach((b) => {
      // в руке: тянется к руке пружиной с затуханием — догоняет без рывка и почти без перелёта
      if (b.drag) {
        if (b.pull == null) return;
        b.w += (k * (b.pull - b.a) - c * b.w) * h; b.a += b.w * h;
        if (Math.abs(b.a) > CRADLE_MAX) { b.a = Math.sign(b.a) * CRADLE_MAX; b.w = 0; }
        return;
      }
      b.w += (-(980 / m.L) * Math.sin(b.a)) * h; b.w *= keep; b.a += b.w * h;
      // нить упёрлась в раму: дальше предела шарик не идёт, отскакивает мягко
      if (Math.abs(b.a) > CRADLE_MAX) { b.a = Math.sign(b.a) * CRADLE_MAX; b.w = -b.w * 0.25; }
    });
    // соседи касаются и сближаются — обмен скоростями (равные массы, упругий удар)
    for (let i = 0; i < m.balls.length - 1; i += 1) {
      const p = m.balls[i]; const q = m.balls[i + 1];
      const pp = ballPos(m, p); const qq = ballPos(m, q);
      if (qq.x - pp.x < m.r * 2 && p.w > q.w) {
        // два шарика в руке летят вместе — между собой не ударяются
        if (p.drag && q.drag && p.pull != null && q.pull != null) continue;
        const t = p.w; p.w = q.w; q.w = t;
        if (Math.abs(t) > 1.2) hit += 1;
        const over = m.r * 2 - (qq.x - pp.x);
        if (!p.drag) p.a -= over / m.L / 2;
        if (!q.drag) q.a += over / m.L / 2;
      }
    }
  }
  m.clicks += hit;
  return m.balls.reduce((e, b) => e + Math.abs(b.w) + Math.abs(b.a) * 4, 0) + (m.lift ? 1 : 0);
}
function drawCradle(ctx, m, col, W, H) {
  const stand = m.top > 10;
  // на подставке — рама во всю ширину: перекладина и две стойки до основания
  const x0 = stand ? 6 : m.balls[0].ax - 16; const x1 = stand ? W - 6 : m.balls[4].ax + 16;
  ctx.strokeStyle = col.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, m.top); ctx.lineTo(x1, m.top); ctx.stroke();
  if (stand) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, m.top); ctx.lineTo(x0, H - 1); ctx.moveTo(x1, m.top); ctx.lineTo(x1, H - 1); ctx.stroke(); }
  ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
  m.balls.forEach((b) => { const p = ballPos(m, b); ctx.beginPath(); ctx.moveTo(b.ax, m.top); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  ctx.globalAlpha = 1;
  m.balls.forEach((b) => {
    const p = ballPos(m, b);
    const g = ctx.createRadialGradient(p.x - 2.5, p.y - 2.5, 1, p.x, p.y, m.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d9dde3'); g.addColorStop(1, '#7c8591');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, m.r, 0, Math.PI * 2); ctx.fill();
  });
}

/* ---------- мобиле: монеты на нитях — качаются и вращаются ---------- */
// нити разной длины, но монета (радиус 9) всегда целиком в полосе
function makeMobile(W, H) {
  const n = Math.max(5, Math.min(9, Math.round(W / 60)));
  const top = 4; const Lmin = 8; const Lmax = Math.max(Lmin, H - top - 9 - 11);
  const coins = Array.from({ length: n }, (_, i) => ({ ax: 22 + ((W - 44) * i) / (n - 1), L: Lmin + ((((i * 7) % 5) / 4) * (Lmax - Lmin)), a: i % 2 ? 0.12 : -0.12, w: 0, spin: 0, sv: 2 + (i % 3), glow: 0 }));
  return { kind: 'mobile', coins, top, t: 0 };
}
/* Монета на нити — два маятника: качание в плоскости полосы и кручение. Закрученная нить
   раскручивается обратно, так что в покое монета смотрит на вас, а не застывает ребром. */
function stepMobile(m, dt) {
  m.coins.forEach((c) => {
    if (!c.drag) { c.w += (-(980 / (c.L + 10)) * Math.sin(c.a)) * dt; c.w *= 0.984; c.a += c.w * dt; }
    c.sv += -7 * Math.sin(c.spin) * dt; c.sv *= 0.976; c.spin += c.sv * dt; c.glow *= 0.96;
  });
  return m.coins.reduce((e, c) => e + Math.abs(c.w) + Math.abs(c.a) + Math.abs(c.sv) + Math.abs(Math.sin(c.spin)) + c.glow, 0);
}
function drawMobile(ctx, m, col) {
  const x0 = m.coins[0].ax - 10; const x1 = m.coins[m.coins.length - 1].ax + 10;
  ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, m.top); ctx.lineTo(x1, m.top); ctx.stroke();
  m.coins.forEach((c) => {
    const x = c.ax + Math.sin(c.a) * c.L; const y = m.top + Math.cos(c.a) * c.L;
    ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.ax, m.top); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1;
    const sx = Math.max(0.12, Math.abs(Math.cos(c.spin)));
    ctx.save(); ctx.translate(x, y + 9); ctx.scale(sx, 1);
    const g = ctx.createLinearGradient(-9, -9, 9, 9);
    g.addColorStop(0, '#FFE9A3'); g.addColorStop(0.5, Math.cos(c.spin) > 0 ? '#E0AE2E' : '#C99417'); g.addColorStop(1, '#9A7413');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(122, 88, 10, .7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.stroke();
    if (c.glow > 0.05) { ctx.globalAlpha = Math.min(1, c.glow); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -3, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  });
}

const MAKE = { 'desk-bunting': makeBunting, 'desk-cradle': makeCradle, 'desk-mobile': makeMobile };
const STEP = { bunting: stepBunting, cradle: stepCradle, mobile: stepMobile };
// для тестов: модель вещицы без холста — создать, сделать шаг, толкнуть
export const decorModel = (id, W, H) => MAKE[id](W, H);
export const decorStep = (m, dt, H) => STEP[m.kind](m, dt, H);
const DRAW = { bunting: drawBunting, cradle: drawCradle, mobile: drawMobile };

// реакция на ответ урока
export function kick(m, ok) {
  if (m.kind === 'bunting') { if (ok) m.wind = 1.4; else { m.sag = 1; m.pts.forEach((p, i) => { if (!p.pin) p.vy -= Math.sin(i) * 120; }); } }
  if (m.kind === 'cradle') { if (ok) m.lift = { t: 0, from: m.balls[0].a }; else m.balls.forEach((x) => { x.w += (Math.random() - 0.5) * 0.6; }); }
  if (m.kind === 'mobile') m.coins.forEach((c, i) => { c.sv += ok ? 5 + (i % 3) : 1.2; c.glow = ok ? 1 : 0; c.w += ok ? 0.6 * (i % 2 ? 1 : -1) : 0.2; });
}

/* passThrough — вещица на подставке поверх урока: холст касаний не ловит, нажатие ловится на окне и берётся,
   только если попало в шарик; мимо шарика — уходит уроку под подставкой (кнопки под ней нажимаются) */
export function DeskDecor({ id, height = 56, preview = false, label = null, passThrough = false }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = wrap.current; const cv = canvas.current;
    if (!el || !cv || !MAKE[id]) return undefined;
    const ctx = cv.getContext('2d');
    if (!ctx) return undefined;
    let W = Math.max(120, el.clientWidth); const H = height;
    let m = MAKE[id](W, H);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { W = Math.max(120, el.clientWidth); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = `${W}px`; cv.style.height = `${H}px`; };
    size();
    const col = { ink: css(el, '--ds-ink2', '#5b4a3a') };
    let raf = 0; let last = 0; let calm = 0; let drag = null; let awake = null;
    const mark = (v) => { if (awake !== v) { awake = v; el.dataset.awake = String(v); } };
    const draw = () => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); DRAW[m.kind](ctx, m, col, W, H); };
    const frame = (ts) => {
      const dt = Math.min(1 / 30, last ? (ts - last) / 1000 : 1 / 60); last = ts; m.t += dt;
      const energy = STEP[m.kind](m, dt, H);
      draw();
      calm = energy < 0.05 && !drag ? calm + 1 : 0;
      mark(true);
      if (calm > 50) { raf = 0; last = 0; mark(false); return; }
      raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && !reduced) { calm = 0; raf = requestAnimationFrame(frame); } };
    // покой: в начале вещица устраивается — несколько кадров, потом сон
    if (reduced) { for (let k = 0; k < 240; k += 1) STEP[m.kind](m, 1 / 60, H); draw(); } else wake();

    // касание: ближайшая точка вещицы в радиусе — тянется за пальцем
    const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const pick = (p) => {
      if (m.kind === 'bunting') { let best = null; m.pts.forEach((q) => { if (q.pin) return; const d = Math.hypot(q.x - p.x, q.y + 8 - p.y); if (d < 30 && (!best || d < best.d)) best = { q, d }; }); return best && { kind: 'pt', q: best.q, dy: best.q.y - p.y }; }
      if (m.kind === 'cradle') {
        let best = -1; let bd = 22;
        m.balls.forEach((x, i) => { const q = ballPos(m, x); const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = i; } });
        return best >= 0 && { kind: 'ball', idx: best };
      }
      const c = m.coins.find((x) => Math.hypot(x.ax + Math.sin(x.a) * x.L - p.x, m.top + Math.cos(x.a) * x.L + 9 - p.y) < 20);
      return c && { kind: 'coin', c, x0: p.x };
    };
    let swallow = false;
    // курсор на подставке: над шариком — рука, тянут — сжатая рука (холст сам курсор не показывает — он прозрачен)
    const root = document.documentElement;
    const cursorAt = (v) => { if (!passThrough || m.kind !== 'cradle') return; if (v) { if (root.dataset.cradleCursor !== v) root.dataset.cradleCursor = v; } else if (root.dataset.cradleCursor) delete root.dataset.cradleCursor; };
    const overBall = (p) => p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H && !!pick(p);
    const down = (e) => {
      if (reduced) return;
      const p = local(e);
      if (passThrough && (p.x < 0 || p.y < 0 || p.x > W || p.y > H)) return;
      const g = pick(p);
      if (!g) return;
      // взяли шарик на подставке: урок под ней этого нажатия не получает (ни нажатия, ни щелчка после)
      if (passThrough) { e.stopPropagation(); swallow = true; }
      drag = g; el.dataset.drag = 'true'; cursorAt('grabbing');
      if (g.kind === 'pt') g.q.drag = true;
      if (g.kind === 'coin') { g.c.sv += 3.5; g.c.glow = 0.6; }
      // взяли шарик — рука сразу держит его там, где нажали (он больше не качается сам)
      if (g.kind === 'ball') holdCradle(m, g.idx, p.x - m.balls[g.idx].ax);
      if (!passThrough) { try { cv.setPointerCapture(e.pointerId); } catch { /* указатель уже отпущен */ } }
      e.preventDefault(); wake();
    };
    const eatClick = (e) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } };
    const move = (e) => {
      if (!drag) { if (passThrough && !reduced && e.pointerType !== 'touch') cursorAt(overBall(local(e)) ? 'grab' : null); return; }
      const p = local(e);
      if (drag.kind === 'pt') placePt(drag.q, p.x, p.y + drag.dy, H);
      // шарик тянется к руке (а не встаёт под неё) — куда тянуть, считаем от точки подвеса
      if (drag.kind === 'ball') holdCradle(m, drag.idx, p.x - m.balls[drag.idx].ax);
      if (drag.kind === 'coin') { const c = drag.c; c.a = Math.max(-0.9, Math.min(0.9, (p.x - c.ax) / (c.L + 10))); c.w = 0; }
      wake();
    };
    const up = (e) => {
      if (!drag) return;
      cursorAt(e && e.clientX != null && overBall(local(e)) ? 'grab' : null);
      if (drag.kind === 'pt') drag.q.drag = false;
      if (drag.kind === 'ball') releaseCradle(m);
      if (drag.kind === 'coin') drag.c.drag = false;
      drag = null; el.dataset.drag = 'false'; wake();
    };
    const onAnswer = (e) => { if (preview || reduced) return; kick(m, !!(e.detail && e.detail.ok)); wake(); };
    // на подставке — слушаем окно (холст прозрачен для касаний), иначе — сам холст
    const tgt = passThrough ? window : cv; const opt = passThrough ? { capture: true } : undefined;
    tgt.addEventListener('pointerdown', down, opt);
    tgt.addEventListener('pointermove', move, opt);
    tgt.addEventListener('pointerup', up, opt);
    tgt.addEventListener('pointercancel', up, opt);
    if (passThrough) window.addEventListener('click', eatClick, true);
    window.addEventListener(ANSWER_EVENT, onAnswer);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const w = el.clientWidth; if (Math.abs(w - W) > 2) { size(); m = MAKE[id](W, H); if (reduced) { for (let k = 0; k < 240; k += 1) STEP[m.kind](m, 1 / 60, H); draw(); } else wake(); } }) : null;
    if (ro) ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      tgt.removeEventListener('pointerdown', down, opt); tgt.removeEventListener('pointermove', move, opt); tgt.removeEventListener('pointerup', up, opt); tgt.removeEventListener('pointercancel', up, opt);
      if (passThrough) window.removeEventListener('click', eatClick, true);
      window.removeEventListener(ANSWER_EVENT, onAnswer);
      if (ro) ro.disconnect();
      cursorAt(null);
    };
  }, [id, height, preview, reduced, passThrough]);
  if (!MAKE[id]) return null;
  return (
    <div ref={wrap} className={`ln-decor${preview ? ' preview' : ''}`} data-testid={preview ? 'decor-preview' : 'lesson-decor'} data-decor={id} data-awake="false"
      role="img" aria-label={label || 'Украшение урока — его можно потрогать'} style={{ height, position: 'relative', touchAction: passThrough ? undefined : 'none', userSelect: 'none', pointerEvents: passThrough ? 'none' : undefined }}>
      <canvas ref={canvas} style={{ display: 'block', cursor: reduced ? 'default' : 'grab', pointerEvents: passThrough ? 'none' : undefined }} />
    </div>
  );
}

/* КОЛЫБЕЛЬ НА ПОДСТАВКЕ (docs/mechanics.md, «Украшения урока»): не полоса над заданием, а подставка сбоку —
   урок не сдвигается. На ПК — справа от колонки урока, на телефоне — в правом нижнем углу над нижней
   панелью; перетаскивается за ручку сверху, место помнит устройство, при смене окна остаётся на экране. */
export const CRADLE_POS_KEY = 'ems-cradle-pos';
const PAD = 8; const GRIP = 18;
const standSize = (vw) => { const H = vw < 640 ? 120 : 170; const W = cradleWidth(H); return { H, W, w: W + PAD * 2, h: H + GRIP + PAD + 6 }; };
export function clampStand(p, size, vw, vh) {
  return { x: Math.round(Math.max(4, Math.min(vw - size.w - 4, p.x))), y: Math.round(Math.max(4, Math.min(vh - size.h - 4, p.y))) };
}
export function defaultStand(size, vw, vh) {
  // ПК: справа от колонки урока (≈ 600 px по центру); телефон: справа внизу, над нижней панелью урока
  if (vw >= 900) return clampStand({ x: Math.min(vw - size.w - 16, vw / 2 + 330), y: vh / 2 - size.h / 2 }, size, vw, vh);
  return clampStand({ x: vw - size.w - 10, y: vh - size.h - 110 }, size, vw, vh);
}
const readPos = () => { try { const p = JSON.parse(localStorage.getItem(CRADLE_POS_KEY) || 'null'); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null; } catch { return null; } };
export function CradleStand({ id }) {
  const view = () => ({ vw: typeof window === 'undefined' ? 1024 : window.innerWidth, vh: typeof window === 'undefined' ? 768 : window.innerHeight });
  const [vp, setVp] = React.useState(view);
  const size = standSize(vp.vw);
  const [pos, setPos] = React.useState(() => { const v = view(); const sz = standSize(v.vw); const saved = readPos(); return saved ? clampStand(saved, sz, v.vw, v.vh) : defaultStand(sz, v.vw, v.vh); });
  const drag = useRef(null);
  useEffect(() => {
    const on = () => { const v = view(); setVp(v); setPos((p) => clampStand(p, standSize(v.vw), v.vw, v.vh)); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const down = (e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* уже отпущен */ } e.preventDefault(); };
  const move = (e) => { if (!drag.current) return; setPos(clampStand({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, size, vp.vw, vp.vh)); };
  const up = () => { if (!drag.current) return; drag.current = null; setPos((p) => { try { localStorage.setItem(CRADLE_POS_KEY, JSON.stringify(p)); } catch { /* приватный режим */ } return p; }); };
  return (
    <div className="ln-cradle-stand" data-testid="cradle-stand" style={{ left: pos.x, top: pos.y, width: size.w }}>
      <div className="ln-cradle-grip" role="button" tabIndex={-1} aria-label="Передвинуть колыбель" title="Перетащите, чтобы передвинуть" data-testid="cradle-grip"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><i /></div>
      <div style={{ width: size.W }}><DeskDecor id={id} height={size.H} passThrough /></div>
      <div className="ln-cradle-base" aria-hidden="true" />
    </div>
  );
}
export const CRADLE_CSS = `
  /* подставка касаний не ловит — только ручка и шарики (DeskDecor passThrough): кнопки урока под ней нажимаются */
  .ln-cradle-stand { position: fixed; z-index: 3; padding: 0 ${PAD}px ${PAD}px; border-radius: 14px; pointer-events: none; user-select: none; -webkit-user-select: none;
    background: color-mix(in srgb, var(--ds-card) 82%, transparent); border: 1px solid var(--ds-rule2); box-shadow: 0 8px 22px rgba(40, 25, 10, .18); }
  .ln-cradle-grip { height: ${GRIP}px; display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; pointer-events: auto; }
  .ln-cradle-grip:active { cursor: grabbing; }
  .ln-cradle-grip i { width: 34px; height: 4px; border-radius: 2px; background: var(--ds-rule2); }
  /* подставка прозрачна для касаний, и курсор брался у того, что под ней (в черновике — карандаш): над шариком —
     рука, пока тянут — сжатая рука, поверх любого курсора страницы (docs/mechanics.md, «Украшения урока») */
  html[data-cradle-cursor="grab"], html[data-cradle-cursor="grab"] * { cursor: grab !important; }
  html[data-cradle-cursor="grabbing"], html[data-cradle-cursor="grabbing"] * { cursor: grabbing !important; }
  .ln-cradle-base { height: 6px; margin: 0 2px; border-radius: 3px; background: linear-gradient(#9A7650, #6B4F30); }
  /* панель ответа и нижняя панель урока — над подставкой */
  .ln-overlay > .ln-foot { position: relative; z-index: 4; }
`;
