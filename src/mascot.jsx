/* ИНФЛЯ — талисман пути уроков: монета-шарик с логотипа, только вместо колонны «I» — лицо.
   Семь настроений: wave (машет на приветствии), hello (привет), joy (радость после верного ответа), cheer (подбадривание
   после ошибки), party (праздник в конце урока), sleep (сон, если день пропущен),
   think (задумчивость на подсказке). Реакции короткие: лёгкое покачивание, без звука и без
   всплывающих окон; при «меньше движения» в системе — стоит на месте. */
import React from 'react';

const EYES = {
  hello: (c) => <><circle cx="24.5" cy="23" r="2.6" fill={c} /><circle cx="39.5" cy="23" r="2.6" fill={c} /></>,
  joy: (c) => <><path d="M21.5 24 Q24.5 19.8 27.5 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" /><path d="M36.5 24 Q39.5 19.8 42.5 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" /></>,
  party: (c) => <><path d="M21.5 23.5 Q24.5 19 27.5 23.5" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" /><path d="M36.5 23.5 Q39.5 19 42.5 23.5" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" /></>,
  cheer: (c) => <><circle cx="24.5" cy="23.5" r="2.5" fill={c} /><circle cx="39.5" cy="23.5" r="2.5" fill={c} /><path d="M21 18.4 L27.4 17.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" /><path d="M43 18.4 L36.6 17.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></>,
  sleep: (c) => <><path d="M21.5 24 Q24.5 26.2 27.5 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M36.5 24 Q39.5 26.2 42.5 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" /></>,
  think: (c) => <><circle cx="26" cy="21.5" r="2.5" fill={c} /><circle cx="41" cy="21.5" r="2.5" fill={c} /><path d="M22 17 L28.5 16.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></>,
};
EYES.wave = EYES.hello;
/* рот: открыт только в коротких реакциях (радость, праздник); привет и помахать — сомкнутая улыбка
   (жалоба: «вечно открытый рот» — машущая Инфля на Пути смотрела так часами) */
const MOUTH = {
  wave: (c) => <path d="M25.5 30.6 Q32 36.4 38.5 30.6" fill="none" stroke={c} strokeWidth="2.3" strokeLinecap="round" />,
  hello: (c) => <path d="M26 31 Q32 35.6 38 31" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />,
  joy: (c) => <path d="M24.5 29.5 Q32 38.5 39.5 29.5 Z" fill={c} />,
  party: (c) => <path d="M23.5 29 Q32 40 40.5 29 Z" fill={c} />,
  cheer: (c) => <path d="M26.5 31 Q32 34.6 37.5 31" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />,
  sleep: (c) => <ellipse cx="32" cy="32" rx="2.2" ry="1.6" fill={c} />,
  think: (c) => <path d="M27.5 32.5 L36 31.2" stroke={c} strokeWidth="2.2" strokeLinecap="round" />,
};
export const MOODS = Object.keys(MOUTH);
const CSS = `
  @keyframes infla-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
  @keyframes infla-hop { 0% { transform: translateY(0) scale(1) } 18% { transform: translateY(.5px) scale(1.02, .98) } 48% { transform: translateY(-4px) scale(1.01) } 100% { transform: translateY(0) scale(1) } }
  .infla { transform-origin: 50% 90%; }
  .infla-bob { animation: infla-bob 3.2s ease-in-out infinite; }
  .infla-hop { animation: infla-hop .7s cubic-bezier(.37,0,.2,1) 1; }
  /* моргает неровно, как живая: в долгом цикле одно моргание и одно двойное, а длина цикла и сдвиг у
     каждой Инфли свои (--blink, --blink-at) — несколько Инфль на экране не моргают хором и не «по метроному» */
  @keyframes infla-blink { 0%, 27%, 31%, 74%, 77%, 80%, 83%, 100% { transform: scaleY(1) } 29% { transform: scaleY(.08) } 75.5% { transform: scaleY(.1) } 81.5% { transform: scaleY(.1) } }
  /* машет — два взмаха и передышка; рука вращается вокруг плеча на краю монеты и от тела не отрывается */
  @keyframes infla-wave { 0%, 46%, 100% { transform: rotate(0) } 9% { transform: rotate(-24deg) } 19% { transform: rotate(12deg) } 29% { transform: rotate(-20deg) } 38% { transform: rotate(8deg) } }
  @keyframes infla-sway { 0%, 100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
  .infla-eyes { transform-box: fill-box; transform-origin: center; animation: infla-blink var(--blink, 6.4s) ease-in-out infinite; animation-delay: var(--blink-at, 0s); }
  .infla-hand { transform-box: view-box; transform-origin: 51px 34.6px; animation: infla-wave 2.6s ease-in-out infinite; }
  /* правая рука занята вещью из лавки — машет левой (зеркально), иначе выходит «третья рука» */
  @keyframes infla-wave-l { 0%, 46%, 100% { transform: rotate(0) } 9% { transform: rotate(24deg) } 19% { transform: rotate(-12deg) } 29% { transform: rotate(20deg) } 38% { transform: rotate(-8deg) } }
  .infla-hand.left { transform-origin: 13px 34.6px; animation-name: infla-wave-l; }
  .infla-sway { animation: infla-sway 3.6s ease-in-out infinite; }
  /* редкие вещи лавки — живые: шар дышит, орден качается, камни вспыхивают, огранка плывёт */
  @keyframes infla-breathe { 0%, 100% { transform: scale(.78) } 50% { transform: scale(1.12) } }
  @keyframes infla-swing { 0%, 100% { transform: rotate(-9deg) } 50% { transform: rotate(9deg) } }
  @keyframes infla-spark { 0%, 62%, 100% { opacity: 0; transform: scale(.3) } 76% { opacity: 1; transform: scale(1.25) } 88% { opacity: .6; transform: scale(.8) } }
  @keyframes infla-spin { to { transform: rotate(360deg) } }
  @keyframes infla-flicker { 0%, 100% { opacity: 1 } 18% { opacity: .72 } 30% { opacity: .95 } 52% { opacity: .66 } 70% { opacity: 1 } 84% { opacity: .82 } }
  .infla-flicker { animation: infla-flicker 1.9s ease-in-out infinite; }
  .infla-balloon { transform-box: fill-box; transform-origin: 50% 100%; animation: infla-breathe 4.2s ease-in-out infinite; }
  .infla-swing { transform-box: fill-box; transform-origin: 50% 0; animation: infla-swing 2.6s ease-in-out infinite; }
  .infla-spark { transform-box: fill-box; transform-origin: center; animation: infla-spark 2.4s ease-in-out infinite; opacity: 0; }
  .infla-spin { transform-box: view-box; transform-origin: 32px 25px; animation: infla-spin 24s linear infinite; }
  /* касание Инфли (пункт владельца 21.11, п. 5: «анимации взаимодействия с Инфлёй — нажать на неё»): подпрыгнула, сплющилась,
     качнулась — по очереди; сердечки вылетают; пять касаний подряд — закружилась голова.
     Мягко и по-живому (пункт владельца 22.11, п. 1: «очень неестественно выглядят анимации взаимодействия и слишком резкие»):
     без оборота на 360° и перелёта пружиной — небольшой замах перед движением, малая амплитуда, плавное затухание */
  .infla-touch { position: relative; display: inline-block; line-height: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .infla-touch.quiet { cursor: inherit; }
  .infla-touch > .infla-pk { display: inline-block; line-height: 0; transform-origin: 50% 90%; }
  .infla-pk.p-jump { animation: infla-pk-jump .8s cubic-bezier(.37,0,.2,1); }
  .infla-pk.p-squish { animation: infla-pk-squish .7s cubic-bezier(.45,0,.25,1); }
  .infla-pk.p-tilt { animation: infla-pk-tilt .9s cubic-bezier(.45,0,.3,1); }
  .infla-pk.p-dizzy { animation: infla-pk-dizzy 1.1s cubic-bezier(.45,0,.3,1); }
  @keyframes infla-pk-jump { 0% { transform: none } 16% { transform: translateY(1%) scale(1.03, .97) } 46% { transform: translateY(-11%) scale(.99, 1.02) } 74% { transform: translateY(.5%) scale(1.015, .985) } 100% { transform: none } }
  @keyframes infla-pk-squish { 0% { transform: none } 32% { transform: scale(1.07, .93) } 64% { transform: scale(.985, 1.015) } 100% { transform: none } }
  @keyframes infla-pk-tilt { 0% { transform: rotate(0) } 28% { transform: rotate(-7deg) } 58% { transform: rotate(4deg) } 82% { transform: rotate(-1.5deg) } 100% { transform: rotate(0) } }
  .infla-face { animation: infla-face .22s ease-out; transform-box: fill-box; transform-origin: 50% 50%; }
  @keyframes infla-face { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: none } }
  @keyframes infla-pk-dizzy { 0%, 100% { transform: rotate(0) } 20% { transform: rotate(-9deg) } 42% { transform: rotate(7deg) } 64% { transform: rotate(-4deg) } 84% { transform: rotate(2deg) } }
  /* неподвижная Инфля (still): плитки гардероба и витрины — каждая не дышит, не моргает и не машет; живая — только в зеркале */
  .infla-still .infla, .infla-still .infla * { animation: none !important; }
  .infla-still .infla-spark { opacity: 1; }
  .infla-heart { position: absolute; left: 50%; top: 30%; width: 12px; height: 12px; margin-left: -6px; pointer-events: none; opacity: 0; animation: infla-heart 1.1s cubic-bezier(.25,.6,.3,1) forwards; }
  .infla-heart::before { content: ''; position: absolute; inset: 0; background: #E0457B; clip-path: path('M6 11 L1 6 A2.6 2.6 0 0 1 6 2.4 A2.6 2.6 0 0 1 11 6 Z'); }
  .infla-heart.star::before { background: #F3C553; clip-path: polygon(50% 0, 62% 38%, 100% 38%, 69% 60%, 80% 100%, 50% 76%, 20% 100%, 31% 60%, 0 38%, 38% 38%); }
  @keyframes infla-heart { 0% { opacity: 0; transform: translate(0, 0) scale(.5) } 18% { opacity: 1 } 100% { opacity: 0; transform: translate(var(--hx), -38px) scale(1) } }
  @media (prefers-reduced-motion: reduce) { .infla-pk, .infla-heart, .infla-face, .infla-bob, .infla-hop, .infla-eyes, .infla-hand, .infla-sway, .infla-balloon, .infla-swing, .infla-spin, .infla-flicker { animation: none; } .infla-spark { animation: none; opacity: 1; } }
`;

/* Наряды из лавки (src/learn/rewards.js): голова, лицо, шея. Рисуются поверх монеты тушью и
   одним цветом; для головного убора поле рисунка чуть выше. */
const INK = '#2A1D05';
// блик-звёздочка: вспыхивает с задержкой d секунд
const spark = (x, y, d, r = 2.4) => <path key={`${x}-${y}`} className="infla-spark" style={{ animationDelay: `${d}s` }} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill="#FFFDF2" stroke="#E3B53C" strokeWidth=".3" />;
// вещи политики: листья венка вдоль ветки, гофрированная розетка, звенья цепи мэра по дуге на плечах
const f2p = (x) => Math.round(x * 100) / 100;
const quadAt = (p0, c, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]];
const quadDir = (p0, c, p2, t) => [2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]), 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1])];
const LAUREL = [0.03, 0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87].map((t, i) => {
  const P0 = [10.4, 22]; const C = [12.2, 6.2]; const P2 = [29.4, 1.4];
  const [x, y] = quadAt(P0, C, P2, t); const [dx, dy] = quadDir(P0, C, P2, t); const len = Math.hypot(dx, dy); const side = i % 2 ? 1 : -1;
  return [f2p(x - (dy / len) * side * 1.3 + (dx / len) * 1.2), f2p(y + (dx / len) * side * 1.3 + (dy / len) * 1.2), f2p((Math.atan2(dy, dx) * 180) / Math.PI + side * 16), 1 - t * 0.2];
});
const ROSETTE_RING = (() => {
  const cx = 40.6; const cy = 40.6; const n = 14; const R = 7.4; const r = 5.6; const p = (a, rr) => `${f2p(cx + rr * Math.cos(a))} ${f2p(cy + rr * Math.sin(a))}`;
  let d = '';
  for (let k = 0; k < n; k += 1) { const a0 = (k / n) * Math.PI * 2; const a1 = ((k + 0.5) / n) * Math.PI * 2; const a2 = ((k + 1) / n) * Math.PI * 2; d += `${k ? '' : `M${p(a0, r)} `}Q${p(a1, R)} ${p(a2, r)} `; }
  return `${d}Z`;
})();
const MAYOR_LINKS = [0, 0.09, 0.18, 0.27, 0.36, 0.445, 0.555, 0.64, 0.73, 0.82, 0.91, 1].map((t) => {
  const P0 = [12.8, 33]; const C = [32, 58]; const P2 = [51.2, 33];
  const [x, y] = quadAt(P0, C, P2, t); const [dx, dy] = quadDir(P0, C, P2, t);
  return [f2p(x), f2p(y), f2p((Math.atan2(dy, dx) * 180) / Math.PI)];
});
const OUTFIT = {
  cap: <g><path d="M13 13 Q32 -6 51 13 Q32 9 13 13 Z" fill="#3E6FA8" stroke={INK} strokeWidth="1.1" /><path d="M42 11.6 Q55 10 60 14.6 Q51 15.6 42 14 Z" fill="#2E568A" stroke={INK} strokeWidth="1" /><circle cx="32" cy="2.6" r="1.6" fill="#2E568A" stroke={INK} strokeWidth=".8" /></g>,
  beret: <g><ellipse cx="29" cy="5.5" rx="18" ry="6.4" fill="#A0372A" stroke={INK} strokeWidth="1.1" transform="rotate(-8 29 5.5)" /><path d="M29 -0.8 l1 -3" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /></g>,
  bowler: <g><path d="M18 9.5 Q18 -8 32 -8 Q46 -8 46 9.5 Z" fill="#3A3530" stroke={INK} strokeWidth="1.1" /><ellipse cx="32" cy="9.5" rx="20" ry="3.4" fill="#2A2622" stroke={INK} strokeWidth="1" /><path d="M18.6 5.6 Q32 8 45.4 5.6" fill="none" stroke="#86461F" strokeWidth="1.8" /></g>,
  tophat: <g><rect x="21" y="-11" width="22" height="19" rx="1.5" fill="#22201E" stroke={INK} strokeWidth="1.1" /><rect x="21" y="3" width="22" height="3.4" fill="#A0372A" /><ellipse cx="32" cy="8" rx="19" ry="3.2" fill="#22201E" stroke={INK} strokeWidth="1" /></g>,
  glasses: <g fill="none" stroke={INK} strokeWidth="1.5"><circle cx="24.5" cy="23" r="5.6" fill="#DDEBF7" fillOpacity=".35" /><circle cx="39.5" cy="23" r="5.6" fill="#DDEBF7" fillOpacity=".35" /><path d="M30.1 22.4 Q32 21 33.9 22.4 M18.9 22 L12.5 20.5 M45.1 22 L51.5 20.5" /></g>,
  monocle: <g fill="none" stroke={INK} strokeWidth="1.4"><circle cx="39.5" cy="23" r="6.2" fill="#DDEBF7" fillOpacity=".35" stroke="#94700F" strokeWidth="1.8" /><path d="M44 27.6 Q49 36 45 44" strokeDasharray="1.4 1.6" stroke="#94700F" /></g>,
  bowtie: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><path d="M24 45.5 L32 49 L24 52.5 Z" fill="#A0372A" /><path d="M40 45.5 L32 49 L40 52.5 Z" fill="#A0372A" /><rect x="30.3" y="47.3" width="3.4" height="3.4" rx=".8" fill="#7A2A20" /></g>,
  /* шарф (пункт владельца 24.11, п. 15: «аксессуар шарф выглядит не очень»): два витка вязки с рубчиками, узел спереди и
     два конца в полоску с бахромой — вместо плоской ленты и прямоугольника */
  scarf: <g stroke={INK} strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round"><path d="M12.2 37.4 Q32 47.6 51.8 37.4 L52.8 41.6 Q32 52.8 11.2 41.6 Z" fill="#8A2F1F" /><path d="M24.6 50.2 Q27 56.4 26.4 63.4 L31 63 Q30.9 55.8 28.8 49.8 Z" fill="#8A2F1F" /><path d="M25.6 55.6 L30.2 55.2 M26.1 59.2 L30.6 58.9" stroke="#E9D6B4" strokeWidth="1.1" /><path d="M11 41 Q22 49.4 32 49.6 Q42 49.4 53 41 Q54 43.9 53.1 46.7 Q42 55.4 32 55.6 Q22 55.4 10.9 46.7 Q10 43.9 11 41 Z" fill="#B5452F" /><path d="M14.6 44.6 l1 2.9 M18.6 46.8 l.9 3 M36.6 49.6 l.5 3 M41.2 48.6 l.8 3 M45.6 46.9 l1 2.9 M49.4 44.6 l1 2.7" stroke="#E2876B" strokeWidth=".8" fill="none" /><path d="M31.4 49.7 Q31.6 52.6 31.4 55.5 M34 49.6 Q34.2 52.5 34 55.3" stroke="#E9D6B4" strokeWidth="1.1" fill="none" /><path d="M19.6 49.4 Q18.5 56 16.2 62.4 L21.4 64 Q23.5 57 24.8 50.4 Z" fill="#B5452F" /><path d="M18.4 55 L23.6 56.4 M17.4 58.3 L22.6 59.8" stroke="#E9D6B4" strokeWidth="1.1" /><path d="M16.6 63.2 l-.7 2.4 M18.3 63.7 l-.4 2.5 M20 64.2 l-.1 2.4 M27 63.4 l.1 2.3 M28.8 63.3 l.3 2.3 M30.4 63.1 l.4 2.2" stroke="#8A2F1F" strokeWidth=".9" fill="none" /><path d="M18.8 47.4 Q21.8 45 25.8 46.2 Q27.4 49.6 25 52.2 Q21 52.9 19 51 Q18.1 49.1 18.8 47.4 Z" fill="#C4513A" /><path d="M20.4 47.8 Q22.4 46.6 24.6 47.3" stroke="#EDA48C" strokeWidth=".9" fill="none" /></g>,
  tie: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><path d="M29.5 45.6 L34.5 45.6 L33.6 49 L30.4 49 Z" fill="#2C5A8E" /><path d="M30.4 49 L33.6 49 L35.6 61 L32 64.5 L28.4 61 Z" fill="#3E6FA8" /><path d="M29.6 53 L34.4 55.5 M29 58 L35 60.6" stroke="#9FB3C8" strokeWidth="1" /></g>,
  // новые вещи лавки: голова, лицо, шея
  ushanka: <g stroke={INK} strokeWidth="1.1" strokeLinejoin="round"><path d="M14 10 Q32 -9 50 10 L50 13 Q32 6 14 13 Z" fill="#6B4E32" /><path d="M14 10 Q32 4 50 10 L50 14.5 Q32 9 14 14.5 Z" fill="#E9DDC7" /><path d="M13.5 13 L11 27 Q14.5 28.5 17 25 L17.5 13.5 Z M50.5 13 L53 27 Q49.5 28.5 47 25 L46.5 13.5 Z" fill="#E9DDC7" /><circle cx="32" cy="2.5" r="2.4" fill="#A0372A" /></g>,
  crown: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><path d="M17 10 L19 -6 L25.5 3 L32 -9 L38.5 3 L45 -6 L47 10 Z" fill="#E3B53C" /><path d="M17 10 L47 10 L47 6.8 L17 6.8 Z" fill="#B88A1A" /><circle cx="32" cy="-4.5" r="1.9" fill="#2E8FB8" /><circle cx="24" cy="5" r="1.5" fill="#A0372A" /><circle cx="40" cy="5" r="1.5" fill="#A0372A" /><circle cx="19" cy="-6" r="1.2" fill="#FBE7A1" /><circle cx="45" cy="-6" r="1.2" fill="#FBE7A1" />{spark(32, -4.5, 0, 3)}{spark(24, 5, .8)}{spark(40, 5, 1.6)}</g>,
  pince: <g fill="none" stroke={INK} strokeWidth="1.3"><ellipse cx="25.5" cy="23.5" rx="4.6" ry="4" fill="#DDEBF7" fillOpacity=".35" /><ellipse cx="38.5" cy="23.5" rx="4.6" ry="4" fill="#DDEBF7" fillOpacity=".35" /><path d="M30.1 22.8 Q32 20.5 33.9 22.8" /><path d="M43 25 Q49 33 46 43" strokeDasharray="1.2 1.6" stroke="#94700F" /></g>,
  medal: <g className="infla-swing"><g stroke={INK} strokeWidth="1" strokeLinejoin="round"><path d="M26 44 L30 52 L34 52 L38 44 Z" fill="#A0372A" /><path d="M30 44 L32 50 L34 44 Z" fill="#3E6FA8" /><circle cx="32" cy="56" r="5.2" fill="#E3B53C" /><path d="M32 52.2 L33.1 54.9 L36 55.1 L33.8 56.9 L34.5 59.7 L32 58.2 L29.5 59.7 L30.2 56.9 L28 55.1 L30.9 54.9 Z" fill="#FBE7A1" strokeWidth=".6" /></g>{spark(35.4, 53.4, .4, 2.6)}</g>,
  // в руке: справа, у края монеты
  paper: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><circle cx="54" cy="39" r="3.2" fill="#E8C766" /><path d="M50 26 L62 28.5 L59.5 46 L47.5 43.5 Z" fill="#F4ECD8" /><path d="M51 29.5 L60 31.4 M50.6 32.6 L59.4 34.5 M50.2 35.7 L58.9 37.6 M49.8 38.8 L58.4 40.7" stroke="#8A7A5C" strokeWidth=".8" /><path d="M51.2 27.6 L56 28.6" stroke="#A0372A" strokeWidth="1.6" /></g>,
  abacus: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><rect x="49" y="29" width="13" height="17" rx="1.5" fill="#B9874E" /><rect x="50.6" y="30.6" width="9.8" height="13.8" fill="#F4ECD8" />{[33.5, 37.5, 41.5].map((y) => <g key={y}><path d={`M50.6 ${y} H60.4`} stroke="#6B4E32" strokeWidth=".7" /><circle cx="52.6" cy={y} r="1.1" fill="#A0372A" strokeWidth=".5" /><circle cx="55" cy={y} r="1.1" fill="#A0372A" strokeWidth=".5" /><circle cx="58.6" cy={y} r="1.1" fill="#3E6FA8" strokeWidth=".5" /></g>)}<circle cx="51" cy="44.5" r="3" fill="#E8C766" /></g>,
  briefcase: <g stroke={INK} strokeWidth="1" strokeLinejoin="round"><path d="M52.5 35 Q52.5 31.5 55.5 31.5 Q58.5 31.5 58.5 35" fill="none" strokeWidth="1.4" /><rect x="48" y="35" width="15" height="12" rx="1.6" fill="#7A4A2A" /><path d="M48 39.5 H63" stroke="#4E2E18" /><rect x="54.3" y="38.4" width="2.4" height="2.4" fill="#E3B53C" strokeWidth=".6" /><circle cx="55.5" cy="33" r="2.6" fill="#E8C766" /></g>,
  /* трость: лакированное древко с бликом, металлический наконечник, литой набалдашник-«луковица»
     с воротничком; рука держит древко ниже набалдашника — не путается с ним */
  cane: <g stroke={INK} strokeWidth="1" strokeLinejoin="round">
    <path d="M56.3 29 L59.3 63" stroke={INK} strokeWidth="3.6" strokeLinecap="round" /><path d="M56.3 29 L59.3 63" stroke="#7A4A26" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M56.6 33 L58.9 59" stroke="#C08A5A" strokeWidth=".7" strokeLinecap="round" />
    <path d="M58.9 60.6 L59.4 64.2" stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><path d="M58.9 60.6 L59.4 64.2" stroke="#C9CDD2" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M53.4 24.6 Q53 19.6 56 18.6 Q59 19.6 58.6 24.6 Q58.2 27 56 27.4 Q53.8 27 53.4 24.6 Z" fill="#E3B53C" />
    <path d="M54.2 27.2 L57.8 27.2 L57.6 29.4 L54.4 29.4 Z" fill="#94700F" strokeWidth=".8" />
    <path d="M55 20.6 Q54.4 22.6 54.7 24.6" fill="none" stroke="#FBE7A1" strokeWidth="1" strokeLinecap="round" />
    <circle cx="57.6" cy="41" r="3" fill="#E8C766" />
  </g>,
  /* ПОЛИТИКА ВЕЛЕГРАДА (пункт владельца 21.11, п. 9): вымышленные — без флагов, гербов и партий настоящих стран.
     Голова: лавровый венок сенатора, соломенная шляпа кандидата; шея: розетка избирателя, лента мэра, цепь мэра (редкая);
     в руке: бюллетень с галочкой, рупор агитатора, молоток спикера.
     Перерисованы 22.11 (пункт владельца 22.11, п. 9: «новые аксессуары выглядят ужасно»): в пропорциях прежних вещей —
     вещи в руке того же размера, что портфель, и рука держит их, а не висит рядом; розетка приколота к монете, лента идёт
     по монете дугой ниже рта, цепь лежит на плечах, а не болтается под Инфлёй */
  laurel: <g stroke="#2F5A2A" strokeWidth=".55" strokeLinejoin="round">
    <path d="M10.4 22 Q12.2 6.2 29.4 1.4 M53.6 22 Q51.8 6.2 34.6 1.4" fill="none" stroke="#5E4A1E" strokeWidth="1.1" strokeLinecap="round" />
    {LAUREL.map(([x, y, r, k], i) => <g key={i}>
      <ellipse cx={x} cy={y} rx={3.9 * k} ry={1.65 * k} fill={i % 2 ? '#5E9A46' : '#467F35'} transform={`rotate(${r} ${x} ${y})`} />
      <ellipse cx={f2p(64 - x)} cy={y} rx={3.9 * k} ry={1.65 * k} fill={i % 2 ? '#5E9A46' : '#467F35'} transform={`rotate(${-r} ${f2p(64 - x)} ${y})`} />
    </g>)}
    {[[13.6, 15], [19.6, 7.4], [50.4, 15], [44.4, 7.4]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="1" fill="#E3B53C" stroke="#94700F" strokeWidth=".4" />)}
    <path d="M29.6 0.6 Q32 2.6 34.4 0.6 L33.6 3.4 Q32 2.4 30.4 3.4 Z" fill="#E3B53C" stroke="#94700F" />
  </g>,
  boater: <g stroke={INK} strokeWidth="1" strokeLinejoin="round">
    <ellipse cx="32" cy="8.2" rx="22.6" ry="4.3" fill="#E2C27A" />
    <path d="M12 9.6 Q32 13.4 52 9.6" fill="none" stroke="#B89A55" strokeWidth=".6" strokeDasharray="1.2 1.3" />
    <path d="M19.6 7.6 L20.4 -1.6 Q32 -3.8 43.6 -1.6 L44.4 7.6 Q32 10.2 19.6 7.6 Z" fill="#EBD08F" />
    <ellipse cx="32" cy="-1.7" rx="11.6" ry="2.2" fill="#F3DFA9" />
    <path d="M20.1 1.8 Q32 4.1 43.9 1.8 L44.1 5.4 Q32 7.8 19.9 5.4 Z" fill="#2C5A8E" strokeWidth=".8" />
    <path d="M22.4 -0.2 Q32 1.4 41.6 -0.2" fill="none" stroke="#C7A75E" strokeWidth=".55" strokeDasharray="1 1.2" />
    <path d="M39.6 2.6 L41.8 3.2 L41.4 6.2 L39.2 5.6 Z" fill="#E3B53C" strokeWidth=".6" />
  </g>,
  rosette: <g stroke={INK} strokeWidth=".8" strokeLinejoin="round">
    <path d="M37.4 44 L35.4 54.6 L37.9 53 L39.6 55.4 L40.8 45.2 Z" fill="#2C5A8E" />
    <path d="M41.6 45 L43.4 55.2 L44.8 52.6 L47.4 53.8 L44.6 43.8 Z" fill="#A0372A" />
    <path d={ROSETTE_RING} fill="#F4ECD8" />
    <circle cx="40.6" cy="40.6" r="4.2" fill="#2C5A8E" />
    <circle cx="40.6" cy="40.6" r="2.3" fill="#E3B53C" stroke="#94700F" strokeWidth=".6" />
    <path d="M39.4 39.4 Q40.6 38.6 41.8 39.4" fill="none" stroke="#FFF3CF" strokeWidth=".6" strokeLinecap="round" />
  </g>,
  sash: <g stroke={INK} strokeWidth=".9" strokeLinejoin="round">
    <path d="M10.4 29.6 Q27 47 48.3 40.4 L47.3 45.6 Q26 52.6 11.5 35.4 Z" fill="#A0372A" />
    <path d="M10.8 31.4 Q27 48.6 48 42.1 M11.2 33.6 Q26.6 50.8 47.6 44" fill="none" stroke="#E3B53C" strokeWidth=".75" />
    <path d="M44.2 46 L42.4 55.2 L44.6 53.8 L46 56 L47.2 46.6 Z" fill="#8A2C22" />
    <path d="M47.6 45.8 L50 54.6 L51 52.2 L53.2 52.8 L50.4 45 Z" fill="#8A2C22" />
    <circle cx="47.2" cy="44.4" r="2.8" fill="#E3B53C" stroke="#94700F" />
  </g>,
  mayorchain: <g>
    <g stroke={INK} strokeWidth=".6">
      {MAYOR_LINKS.map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="2.3" ry="1.55" fill={i % 2 ? '#C99A2A' : '#E8C25A'} transform={`rotate(${r} ${x} ${y})`} />)}
      <path d="M30.4 46.2 L33.6 46.2 L33.1 48.8 L30.9 48.8 Z" fill="#B88A1A" />
      <circle cx="32" cy="53.6" r="5.8" fill="#E8C25A" strokeWidth=".9" />
      <circle cx="32" cy="53.6" r="4" fill="#B88A1A" />
      <path d="M30.4 50.8 H33.6 M30.4 56.4 H33.6 M31.2 51 V56.2 M32.8 51 V56.2" stroke="#FBE7A1" strokeWidth=".7" />
    </g>
    {spark(29.4, 51.6, 0, 2.2)}{spark(46.6, 37.4, 1.1, 1.7)}{spark(17.4, 37.4, 2.2, 1.7)}
  </g>,
  ballot: <g stroke={INK} strokeWidth=".9" strokeLinejoin="round">
    <g transform="rotate(9 56.4 31)">
      <rect x="49.6" y="21" width="13.6" height="18" rx="1.2" fill="#FFFDF6" />
      <path d="M49.6 22.2 Q49.6 21 50.8 21 L62 21 Q63.2 21 63.2 22.2 L63.2 24.6 L49.6 24.6 Z" fill="#2C5A8E" strokeWidth=".7" />
      <path d="M51.8 27.6 H60.8 M51.8 30.2 H58.4 M57.8 34.6 H61.2" stroke="#8A7A5C" strokeWidth=".7" />
      <rect x="51.8" y="32.4" width="4.4" height="4.4" rx=".6" fill="#fff" strokeWidth=".75" />
      <path d="M52.5 34.4 L53.9 36 L57.8 31" fill="none" stroke="#2E8A5B" strokeWidth="1.6" strokeLinecap="round" />
    </g>
    <circle cx="51.4" cy="40" r="3.1" fill="#E8C766" strokeWidth="1" />
  </g>,
  megaphone: <g stroke={INK} strokeWidth=".95" strokeLinejoin="round">
    <path d="M52.4 35.8 L53.2 40.6" stroke="#3A3530" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M50.3 33.3 L56 22 L64 30 L52.7 35.7 Z" fill="#D9472B" />
    <path d="M53.2 27.7 L58.3 32.8" stroke="#FFF3E6" strokeWidth="1.5" />
    <ellipse cx="60" cy="26" rx="5.6" ry="2" fill="#F4ECD8" transform="rotate(45 60 26)" />
    <path d="M61.9 18.9 A7.4 7.4 0 0 1 67.1 24.1 M64 17.3 A9.6 9.6 0 0 1 68.7 21.9" fill="none" strokeWidth=".75" strokeLinecap="round" />
    <circle cx="53.4" cy="42.4" r="3.1" fill="#E8C766" strokeWidth="1" />
  </g>,
  gavel: <g stroke={INK} strokeWidth="1" strokeLinejoin="round">
    <path d="M54.4 43 L60.8 27.6" strokeWidth="3.4" strokeLinecap="round" /><path d="M54.4 43 L60.8 27.6" stroke="#9A6634" strokeWidth="2" strokeLinecap="round" />
    <g transform="rotate(22.4 61.4 26)">
      <rect x="54.4" y="22.6" width="14" height="6.8" rx="2" fill="#7A4A26" />
      <rect x="55.8" y="22.2" width="1.8" height="7.6" rx=".5" fill="#E3B53C" strokeWidth=".7" />
      <rect x="65.2" y="22.2" width="1.8" height="7.6" rx=".5" fill="#E3B53C" strokeWidth=".7" />
      <path d="M58.6 24 H64" stroke="#B57A45" strokeWidth=".8" strokeLinecap="round" />
    </g>
    <circle cx="54.2" cy="43.4" r="3.1" fill="#E8C766" />
  </g>,
  // шар «Инфляция» на нитке: то надувается, то сдувается — как цены
  balloon: <g stroke={INK} strokeLinejoin="round"><path d="M54.5 41 Q51 33 56 26 Q60 20 57 15.5" fill="none" strokeWidth=".9" /><circle cx="54.5" cy="42" r="3.2" fill="#E8C766" strokeWidth="1" /><g className="infla-balloon"><ellipse cx="57" cy="3.5" rx="9.5" ry="11" fill="#C8442F" strokeWidth="1.1" /><path d="M55.4 14.3 L57 16 L58.6 14.3 Z" fill="#A0372A" strokeWidth=".8" /><path d="M51 -2 Q52.5 -5.5 56 -6" fill="none" stroke="#FFD9CC" strokeWidth="1.8" strokeLinecap="round" /><text x="57" y="7.8" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="sans-serif" fill="#FFF3E6" stroke="none">%</text></g></g>,
};
/* ХЕЛЛОУИН (src/learn/halloween.js): продаются только в сезон, носятся всегда */
const NIGHT = '#2B2238';
Object.assign(OUTFIT, {
  // рожки чертёнка: два загнутых рожка с бликом
  horns: <g stroke={INK} strokeWidth="1" strokeLinejoin="round">
    <path d="M21.5 7 Q13 0 16.5 -9.5 Q19 -2.5 27 3 Z" fill="#C8382A" /><path d="M42.5 7 Q51 0 47.5 -9.5 Q45 -2.5 37 3 Z" fill="#C8382A" />
    <path d="M17.6 -5.6 Q17.2 -1 21 2.6 M46.4 -5.6 Q46.8 -1 43 2.6" fill="none" stroke="#FFB4A6" strokeWidth=".9" strokeLinecap="round" />
  </g>,
  // шляпа ведьмы: широкие поля, конус с заломом, фиолетовая лента и золотая пряжка
  witch: <g stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
    <path d="M19.5 8.5 Q25 -4 29.5 -14 Q33 -22 43.5 -21 Q37 -17.5 36.4 -9 Q37.4 0 45.5 8.5 Z" fill={NIGHT} />
    <ellipse cx="32" cy="9.6" rx="22.5" ry="3.6" fill={NIGHT} />
    <path d="M21.4 3 Q32 6 43.2 3 L44.4 6.2 Q32 9.4 20.4 6.2 Z" fill="#7B3FA0" />
    <rect x="29.3" y="3.2" width="5.4" height="4.6" rx=".6" fill="none" stroke="#E3B53C" strokeWidth="1.3" />
    <path d="M30.5 -12 Q33 -18 39 -19.6" fill="none" stroke="#5E4A7A" strokeWidth=".9" strokeLinecap="round" />
  </g>,
  // маска летучей мыши: крылья с острыми кончиками, прорези для глаз — глаза видно
  batmask: <g>
    <path fillRule="evenodd" fill={NIGHT} stroke={INK} strokeWidth=".9" strokeLinejoin="round"
      d="M12.5 24.5 L8.5 14.5 L15 18.4 L18.6 15.3 Q26 14.6 32 18.6 Q38 14.6 45.4 15.3 L49 18.4 L55.5 14.5 L51.5 24.5 Q46 30 39.5 27.8 Q35 26.6 32 24.6 Q29 26.6 24.5 27.8 Q18 30 12.5 24.5 Z M20.3 23 a4.2 3.5 0 1 0 8.4 0 a4.2 3.5 0 1 0 -8.4 0 Z M35.3 23 a4.2 3.5 0 1 0 8.4 0 a4.2 3.5 0 1 0 -8.4 0 Z" />
    <path d="M17 18.6 Q22 17 27 18.4" fill="none" stroke="#7E6C9E" strokeWidth=".8" strokeLinecap="round" />
  </g>,
  /* воротник графа: стоячий чёрный воротник с красной подкладкой и застёжка с камнем. Внутренний край
     идёт ровно по краю монеты (дуга с её радиусами), так что воротник обнимает Инфлю снизу и встаёт
     за ней углами, а не висит рядом крыльями (жалоба: «летает и не примыкает») */
  cape: <g stroke={INK} strokeWidth="1" strokeLinejoin="round">
    {[false, true].map((m) => (
      <g key={String(m)} transform={m ? 'translate(64 0) scale(-1 1)' : undefined}>
        <path d="M31 48.18 L31 51 C22 53.6 9.4 49.2 6.2 36 L3.4 12.6 Q8.4 14.4 11.03 18 A22 23.2 0 0 0 31 48.18 Z" fill="#1E1A24" />
        <path d="M30.6 48.15 C23 51.2 11.4 48.2 8.7 37 L6.5 19.6 Q8.7 20 10.33 21 A22 23.2 0 0 0 30.6 48.15 Z" fill="#B3122E" stroke="none" />
      </g>
    ))}
    <circle cx="32" cy="50.6" r="2.7" fill="#E3B53C" /><circle cx="32" cy="50.6" r="1.2" fill="#B3122E" strokeWidth=".5" />
  </g>,
  // тыква-фонарь: резная рожица светится изнутри и мерцает
  lantern: <g stroke={INK} strokeLinejoin="round">
    <circle className="infla-flicker" cx="55" cy="30" r="11" fill="#FFB13B" opacity=".25" stroke="none" />
    <path d="M51.4 41.6 Q55 46.5 58.6 41.6" fill="none" strokeWidth="1.1" />
    <circle cx="55" cy="44.4" r="3" fill="#E8C766" strokeWidth="1" />
    <path d="M55 21.6 Q54.2 18.6 56.4 16.6" fill="none" stroke="#4D7C0F" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="55" cy="30.5" rx="8.6" ry="7.6" fill="#E8701E" strokeWidth="1.1" />
    <path d="M55 23 Q51 30.5 55 38 M55 23 Q59 30.5 55 38 M49 25.4 Q46.6 30.5 49 35.6 M61 25.4 Q63.4 30.5 61 35.6" fill="none" stroke="#B4500F" strokeWidth=".7" />
    <g className="infla-flicker" fill="#FFE07A" stroke="#7A3A08" strokeWidth=".5">
      <path d="M50.4 29 L52.6 25.8 L54 29 Z" /><path d="M56 29 L57.4 25.8 L59.6 29 Z" />
      <path d="M49.8 32 L51.6 33.6 L53.2 32.2 L55 34 L56.8 32.2 L58.4 33.6 L60.2 32 Q58.6 36 55 36.2 Q51.4 36 49.8 32 Z" />
    </g>
  </g>,
});
OUTFIT.goldbar = OUTFIT.balloon; // старое имя шара: наряд с ним рисуется до первого сохранения

/* РАМКИ — медальон вокруг монеты: сплошное кольцо под монетой, без просвета, с узором. Рисуются
   первыми — узелок и нитка шарика ложатся поверх рамки. g — префикс id градиентов этой Инфли:
   у каждой картинки свои, чтобы спрятанная копия не гасила градиент соседней. */
const C = { x: 32, y: 25 };
const polar = (r, a) => [C.x + Math.cos(a) * r, C.y + Math.sin(a) * r];
const f2 = (x) => Math.round(x * 100) / 100;
// гильош: замкнутая волна r(θ) = r0 + amp·sin(n·θ + φ) — как сетка на банкноте
const wave = (r0, amp, n, ph) => {
  const pts = Array.from({ length: n * 12 + 1 }, (_, k) => { const a = (k / (n * 12)) * Math.PI * 2; return polar(r0 + amp * Math.sin(n * a + ph), a); });
  return `M${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join(' L')} Z`;
};
const GUILLOCHE = [0, 1, 2].map((k) => wave(27.6, 2.2, 14, (k * 2 * Math.PI) / 3));
const GUILLOCHE_FINE = [0, 1].map((k) => wave(27.6, 1.1, 28, k * Math.PI));
const at = (n, r, off = 0) => Array.from({ length: n }, (_, k) => polar(r, off + (k / n) * Math.PI * 2));
// бриллиант сверху: восьмиугольник, площадка и грани к углам
const gem = (x, y, s, key) => {
  const o = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; return [x + Math.cos(a) * s, y + Math.sin(a) * s]; });
  const t = o.map(([px, py]) => [x + (px - x) * 0.45, y + (py - y) * 0.45]);
  const poly = (ps) => ps.map(([px, py]) => `${f2(px)},${f2(py)}`).join(' ');
  return (
    <g key={key}>
      <polygon points={poly(o)} fill="#8FDCF5" stroke="#1D6A8E" strokeWidth=".45" />
      {o.map((p, k) => <polygon key={k} points={poly([p, o[(k + 1) % 8], t[(k + 1) % 8], t[k]])} fill={k % 2 ? '#D9F6FF' : '#5FC2E8'} opacity=".9" />)}
      <polygon points={poly(t)} fill="#F4FDFF" stroke="#7CCBE6" strokeWidth=".3" />
    </g>
  );
};
const FRAMES = {
  // гильош: сиреневый медальон с сеткой волн, как на банкноте
  'frame-guilloche': () => (
    <g>
      <circle cx={C.x} cy={C.y} r="31.2" fill="#ECE6F7" />
      <g fill="none" stroke="#6A5C99" strokeWidth=".5">{GUILLOCHE.map((d, k) => <path key={k} d={d} />)}</g>
      <g fill="none" stroke="#9C8FC7" strokeWidth=".35">{GUILLOCHE_FINE.map((d, k) => <path key={k} d={d} />)}</g>
      <circle cx={C.x} cy={C.y} r="31.2" fill="none" stroke="#4B3F75" strokeWidth="1.2" />
      <circle cx={C.x} cy={C.y} r="30" fill="none" stroke="#4B3F75" strokeWidth=".45" />
      <circle cx={C.x} cy={C.y} r="24.4" fill="none" stroke="#4B3F75" strokeWidth=".8" />
    </g>
  ),
  // золотой багет: литое кольцо со светом слева сверху, профиль-бортик, жемчужный ряд и четыре розетки с гранатом
  'frame-gold': (g) => (
    <g>
      <defs>
        <linearGradient id={`${g}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3C2" /><stop offset=".35" stopColor="#E6B744" /><stop offset=".7" stopColor="#B88A1A" /><stop offset="1" stopColor="#7A5508" />
        </linearGradient>
      </defs>
      <circle cx={C.x} cy={C.y} r="31.6" fill={`url(#${g}-gold)`} stroke="#5E4208" strokeWidth=".9" />
      <circle cx={C.x} cy={C.y} r="29.4" fill="none" stroke="#7A5508" strokeWidth=".7" />
      <circle cx={C.x} cy={C.y} r="29.95" fill="none" stroke="#FFF1B8" strokeWidth=".5" opacity=".85" />
      <circle cx={C.x} cy={C.y} r="25.3" fill="none" stroke="#7A5508" strokeWidth=".8" />
      {at(32, 27.1).filter((_, k) => k % 8 !== 4).map(([x, y], k) => <circle key={k} cx={f2(x)} cy={f2(y)} r="1" fill="#FFF6D6" stroke="#8C6410" strokeWidth=".35" />)}
      {at(4, 27.4, Math.PI / 4).map(([x, y], k) => (
        <g key={k}>
          <path d={`M${f2(x)} ${f2(y - 3)} Q${f2(x + 1)} ${f2(y - 1)} ${f2(x + 3)} ${f2(y)} Q${f2(x + 1)} ${f2(y + 1)} ${f2(x)} ${f2(y + 3)} Q${f2(x - 1)} ${f2(y + 1)} ${f2(x - 3)} ${f2(y)} Q${f2(x - 1)} ${f2(y - 1)} ${f2(x)} ${f2(y - 3)} Z`} fill="#FFF3C2" stroke="#5E4208" strokeWidth=".55" />
          <circle cx={f2(x)} cy={f2(y)} r="1.05" fill="#A0372A" stroke="#5E4208" strokeWidth=".3" />
        </g>
      ))}
    </g>
  ),
  // алмазная огранка: платиновое кольцо в ледяном свечении, по нему медленно плывут бриллианты
  'frame-diamond': (g) => (
    <g>
      <defs>
        <radialGradient id={`${g}-halo`} cx="50%" cy="50%" r="50%"><stop offset=".6" stopColor="#BDEBFF" stopOpacity=".75" /><stop offset="1" stopColor="#BDEBFF" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${g}-plat`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBFEFF" /><stop offset=".3" stopColor="#B7C9D6" /><stop offset=".55" stopColor="#EEF6FB" /><stop offset=".8" stopColor="#8EA4B5" /><stop offset="1" stopColor="#D5E3EC" />
        </linearGradient>
      </defs>
      <circle cx={C.x} cy={C.y} r="35" fill={`url(#${g}-halo)`} />
      <circle cx={C.x} cy={C.y} r="31.4" fill={`url(#${g}-plat)`} stroke="#4F6B80" strokeWidth=".9" />
      <circle cx={C.x} cy={C.y} r="25.2" fill="none" stroke="#6C8799" strokeWidth=".6" />
      <circle cx={C.x} cy={C.y} r="30.3" fill="none" stroke="#6C8799" strokeWidth=".6" />
      <g className="infla-spin">{at(12, 27.75).map(([x, y], k) => gem(x, y, 2.85, k))}</g>
      {spark(32, -4.5, 0, 3)}{spark(61.5, 25, .8, 3)}{spark(2.5, 25, 1.6, 3)}
    </g>
  ),
  // паутина (награда Хеллоуина): ночной медальон, серебряная сеть и паучок, который качается на нитке
  'frame-web': (g) => (
    <g>
      <defs>
        <radialGradient id={`${g}-night`} cx="50%" cy="45%" r="55%"><stop offset=".55" stopColor="#4A3A63" /><stop offset="1" stopColor="#241C33" /></radialGradient>
      </defs>
      <circle cx={C.x} cy={C.y} r="31.6" fill={`url(#${g}-night)`} stroke="#18121F" strokeWidth=".9" />
      <g fill="none" stroke="#DCD5EA" strokeWidth=".55" opacity=".9">
        {at(16, 31.2).map(([x, y], k) => <path key={k} d={`M${C.x} ${C.y} L${f2(x)} ${f2(y)}`} />)}
        {[25.6, 28.2, 30.6].map((r) => {
          const pts = at(16, r);
          return <path key={r} d={`M${pts.map(([x, y], k) => { const [nx, ny] = pts[(k + 1) % 16]; const mx = (x + nx) / 2; const my = (y + ny) / 2; const cx = C.x + (mx - C.x) * 0.95; const cy = C.y + (my - C.y) * 0.95; return `${k ? '' : `${f2(x)} ${f2(y)} `}Q${f2(cx)} ${f2(cy)} ${f2(nx)} ${f2(ny)}`; }).join(' ')}`} />;
        })}
      </g>
      <g className="infla-swing">
        <path d="M52.5 -4 L52.5 9" stroke="#DCD5EA" strokeWidth=".55" />
        <g stroke="#120E18" strokeWidth=".8" strokeLinecap="round" fill="none">
          <path d="M50.6 10.4 L47.4 8.4 M50.4 11.6 L46.8 11.4 M50.6 12.8 L47.4 14.8 M54.4 10.4 L57.6 8.4 M54.6 11.6 L58.2 11.4 M54.4 12.8 L57.6 14.8" />
        </g>
        <ellipse cx="52.5" cy="11.8" rx="2.6" ry="3" fill="#120E18" /><circle cx="52.5" cy="8.9" r="1.6" fill="#120E18" />
        <circle cx="51.9" cy="8.6" r=".42" fill="#fff" /><circle cx="53.1" cy="8.6" r=".42" fill="#fff" />
      </g>
      {spark(9, 5, .4, 1.8)}{spark(57, 44, 1.4, 1.6)}
    </g>
  ),
};
export const OUTFIT_IDS = [...Object.keys(OUTFIT), ...Object.keys(FRAMES)];
/* Наряд ученика для всех Инфль внутри обучения (урок, итоги, Путь, профиль): его задаёт корень
   обучения, а явный outfit (витрина лавки) — важнее. */
export const OutfitContext = React.createContext(null);
// высота рисунка с учётом головного убора — чтобы место под Инфлю оставляли заранее
// длительность движений касания (CSS .infla-pk.p-*) и передышка после «закружилась»
export const PK_MS = { jump: 800, squish: 700, tilt: 900, dizzy: 1100 };
export const PK_REST_MS = 1200;
export const mascotHeight = (size, outfit) => size * (70 - (outfit && outfit.head && OUTFIT[outfit.head] ? -12 : 0)) / 64;

/* react — откликаться на касание (по умолчанию да; внутри кнопки или плитки — нет: там касание — это нажатие кнопки, и
   Инфля в каждой плитке не должна прыгать, пункт владельца 22.11, п. 1); still — неподвижная, без дыхания и моргания */
export function Mascot({ mood = 'hello', size = 56, label, outfit = null, react = true, still = false }) {
  const ctxOutfit = React.useContext(OutfitContext);
  const m = MOUTH[mood] ? mood : 'hello';
  const gid = `infla-g-${React.useId().replace(/:/g, '')}`;
  const ink = '#2A1D05';
  const wear = outfit || ctxOutfit || {};
  // головной убор выше монеты — поле рисунка растёт вверх
  const top = wear.head && OUTFIT[wear.head] ? -12 : 0;
  const motion = m === 'joy' || m === 'party' ? 'infla-hop' : m === 'sleep' ? '' : m === 'wave' ? 'infla-sway' : 'infla-bob';
  // свой ритм моргания у каждой Инфли: длина цикла 5,2–8,4 с и случайный сдвиг — не хором и не по метроному
  const blink = React.useMemo(() => ({ '--blink': `${(5.2 + Math.random() * 3.2).toFixed(2)}s`, '--blink-at': `${(-Math.random() * 8).toFixed(2)}s` }), []);
  /* касание: реакция по очереди, на миг — радость; пять касаний за 2,5 с — «закружилась» (думает).
     Частые касания (пункт владельца 24.11, п. 2: «можно много спамить нажатием по Инфле, и она ведёт себя неестественно»):
     начатое движение доигрывает до конца — касания во время него не перезапускают его с начала, а только считаются;
     пятое подряд — «закружилась» сразу после текущего движения, и потом Инфле нужна передышка (касания не действуют) */
  const [pk, setPk] = React.useState({ n: 0, kind: '', hearts: [] });
  const taps = React.useRef([]); const pkTimer = React.useRef(0); const dizzyTimer = React.useRef(0);
  React.useEffect(() => () => { window.clearTimeout(pkTimer.current); window.clearTimeout(dizzyTimer.current); }, []);
  const busyUntil = React.useRef(0); const restUntil = React.useRef(0);
  const start = (dizzy) => {
    const now = Date.now();
    setPk((p) => {
      const n = p.n + 1;
      const kind = dizzy ? 'dizzy' : ['jump', 'squish', 'tilt'][n % 3];
      const ms = PK_MS[kind];
      busyUntil.current = now + ms;
      if (dizzy) restUntil.current = now + ms + PK_REST_MS;
      window.clearTimeout(pkTimer.current);
      pkTimer.current = window.setTimeout(() => setPk((q) => ({ ...q, kind: '', hearts: [] })), ms + 250);
      const hearts = Array.from({ length: dizzy ? 5 : 3 }, (_, i) => ({ id: `${n}-${i}`, x: Math.round((i - (dizzy ? 2 : 1)) * 16 + (Math.random() - 0.5) * 10), star: dizzy || i === 1, d: i * 70 }));
      return { n, kind, hearts };
    });
  };
  const poke = (e) => {
    if (!react) return;
    const host = e && e.currentTarget && e.currentTarget.parentElement;
    if (host && host.closest && host.closest('button, a[href], [role="button"], [role="tab"], label')) return;
    const now = Date.now();
    if (now < restUntil.current || dizzyTimer.current) return; // кружится или переводит дух — не мешаем
    taps.current = [...taps.current.filter((x) => now - x < 2500), now];
    const dizzy = taps.current.length >= 5;
    if (dizzy) {
      taps.current = [];
      const wait = Math.max(0, busyUntil.current - now);
      if (!wait) { start(true); return; }
      dizzyTimer.current = window.setTimeout(() => { dizzyTimer.current = 0; start(true); }, wait);
      return;
    }
    if (now < busyUntil.current) return; // движение ещё идёт — доигрывает, касание только посчитано
    start(false);
  };
  const shown = pk.kind === 'dizzy' ? 'think' : pk.kind ? (m === 'sleep' ? 'hello' : 'joy') : m;
  const sm = MOUTH[shown] ? shown : m;
  return (
    <span className={`infla-touch${react ? '' : ' quiet'}${still ? ' infla-still' : ''}`} data-testid="mascot" data-mood={m} data-poke={pk.n} data-reaction={pk.kind || undefined} onPointerDown={poke}>
      <style>{CSS}</style>
      <span className={`infla-pk${pk.kind ? ` p-${pk.kind}` : ''}`} key={`pk${pk.n}`}>
      <svg viewBox={`0 ${top} 64 ${70 - top}`} width={size} height={size * (70 - top) / 64} role="img" aria-label={label || `Инфля: ${({ hello: 'привет', wave: 'машет', joy: 'радуется', cheer: 'подбадривает', party: 'празднует', sleep: 'спит', think: 'думает' })[m]}`}
        className={`infla ${motion}`} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={gid} cx="36%" cy="28%" r="78%">
            <stop offset="0" stopColor="#FBE7A1" /><stop offset="0.5" stopColor="#D9B23A" /><stop offset="1" stopColor="#94700F" />
          </radialGradient>
        </defs>
        {wear.frame && FRAMES[wear.frame] && <g data-outfit={wear.frame}>{FRAMES[wear.frame](gid)}</g>}
        <path d="M32 50.2 C 28.8 53.6, 35.6 56.4, 31.8 60.4 C 30.6 61.6, 31.4 62.6, 32.6 63.4" fill="none" stroke="#D9B23A" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M29.3 51.6 L32 47.6 L34.7 51.6 Q32 52.6 29.3 51.6 Z" fill="#A9841A" stroke="#3A2A08" strokeWidth="0.9" strokeLinejoin="round" />
        <ellipse cx="32" cy="25" rx="22" ry="23.2" fill={`url(#${gid})`} stroke="#3A2A08" strokeWidth="1.6" />
        <ellipse cx="32" cy="25" rx="18.2" ry="19.3" fill="none" stroke="#5A4210" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="1.2 2" />
        <path d="M17.4 18.6 C 18.6 13.6, 22.4 9.8, 27 8.8" fill="none" stroke="#FFF7DC" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" />
        {/* шея — сразу за монетой: стоячий воротник встаёт по бокам, и машущая рука должна быть поверх него */}
        {wear.neck && OUTFIT[wear.neck] && <g data-outfit={wear.neck}>{OUTFIT[wear.neck]}</g>}
        {(sm === 'joy' || sm === 'party' || sm === 'hello') && <><ellipse cx="20" cy="29.5" rx="2.6" ry="1.6" fill="#E07A5F" opacity="0.45" /><ellipse cx="44" cy="29.5" rx="2.6" ry="1.6" fill="#E07A5F" opacity="0.45" /></>}
        {/* лицо меняется плавно (пункт владельца 24.11, п. 13: «очень странно выглядит резкая смена лица у Инфли, когда на неё
            нажимаешь»): новые глаза и рот проявляются за 0,2 с, а монета, дыхание и наряд не перерисовываются */}
        <g className="infla-face" key={`f-${sm}`}>{sm === 'sleep' ? EYES[sm](ink) : <g className="infla-eyes" style={blink}>{EYES[sm](ink)}</g>}</g>
        {/* рука начинается чуть внутри края монеты, и плечо — центр вращения: при взмахе она не отрывается */}
        {m === 'wave' && (wear.hand && OUTFIT[wear.hand] ? (
          <g className="infla-hand left">
            <path d="M13 34.6 Q7 30.5 6 24" fill="none" stroke="#3A2A08" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="13" cy="34.6" r="1.3" fill="#3A2A08" />
            <circle cx="5.5" cy="21.5" r="4" fill="#E8C766" stroke="#3A2A08" strokeWidth="1.2" />
          </g>
        ) : (
          <g className="infla-hand">
            <path d="M51 34.6 Q57 30.5 58 24" fill="none" stroke="#3A2A08" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="51" cy="34.6" r="1.3" fill="#3A2A08" />
            <circle cx="58.5" cy="21.5" r="4" fill="#E8C766" stroke="#3A2A08" strokeWidth="1.2" />
          </g>
        ))}
        <g className="infla-face" key={`m-${sm}`}>{MOUTH[sm](ink)}</g>
        {m === 'party' && <>
          <path d="M26 3.5 L32 -4 L38 3.5 Z" fill="#4FA38F" stroke="#3A2A08" strokeWidth="0.8" transform="translate(0 4)" />
          {[[8, 12, '#E07A5F'], [56, 10, '#6FA8DC'], [5, 34, '#4FA38F'], [59, 32, '#E07A5F'], [12, 4, '#D9B23A']].map(([x, y, c], i) => <rect key={i} x={x} y={y} width="3" height="3" fill={c} transform={`rotate(${i * 37} ${x + 1.5} ${y + 1.5})`} />)}
        </>}
        {['face', 'head', 'hand'].map((sl) => (wear[sl] && OUTFIT[wear[sl]] ? <g key={sl} data-outfit={wear[sl]}>{OUTFIT[wear[sl]]}</g> : null))}
        {m === 'sleep' && <text x="46" y="9" fontSize="9" fill="#9FB3C8" fontFamily="sans-serif">z z</text>}
        {sm === 'think' && <><circle cx="52" cy="9" r="1.6" fill="#9FB3C8" /><circle cx="56.5" cy="4.5" r="2.4" fill="#9FB3C8" /></>}
        {m === 'cheer' && <path d="M52 30 l2 -4 l2 4 l4 1 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 z" fill="#FBE7A1" stroke="#94700F" strokeWidth="0.6" />}
      </svg>
      </span>
      {pk.hearts.map((h) => <i key={h.id} className={`infla-heart${h.star ? ' star' : ''}`} style={{ '--hx': `${h.x}px`, animationDelay: `${h.d}ms` }} aria-hidden="true" />)}
    </span>
  );
}
