/* ЭКРАНЫ НАГРАД И ПРОГРАММЫ: кошелёк, лавка с курсом дня, задания дня и испытание месяца,
   сундук юнита, утренний экран серии, печати-достижения, «Моя программа» в профиле и
   приглашение на вступительный тест. Всё — из компонентов дизайн-системы (src/ds.jsx,
   src/ds-art.jsx); расчёты — в чистых модулях src/learn/rewards.js и src/learn/program.js. */
import React, { useEffect, useState } from 'react';
import { X, Wallet, ShieldCheck, CalendarDays, Check, Flame, GraduationCap, Timer, Map as MapIcon, Target, Coins, Zap, ListChecks, ChevronRight, Globe, Repeat } from 'lucide-react';
import { ACH_ICON } from './award-art.js';
import { Audio } from './MacroSimulator.jsx';
import { Button, IconButton, Card, Row, Sheet } from './ds.jsx';
import { Rosette, Medal, CoinShower, CountUp, Chest, Guilloche } from './ds-art.jsx';
import { balance, questsFor, questNews, QUEST_ICON, monthChallenge, monthStamps, chestCoins, chestKey, hasClaim, openChest, achievementsOf, coinsWord, plural, greetingAt, COIN, goalCoins, indexed } from './learn/rewards.js';
import { skillLevel, LEVEL_NAME, levelNote } from './learn/program.js';
import { dayOf, streak, weekDots, rolloverLocal, setProfile, PROFILE_GOALS, PROFILE_MINUTES, PROFILE_GOAL_LABEL, goalMinutes, goalToday, pendingGoal } from './textbook/learn-state.js';

export const REWARD_CSS = `
  .rw-bar { height: 6px; border-radius: 3px; background: var(--ds-rule); overflow: hidden; }
  .rw-bar > i { display: block; height: 100%; background: var(--u); border-radius: 3px; transition: width .3s ease-out; animation: rw-fill .8s cubic-bezier(.3,.8,.4,1) both; transform-origin: 0 50%; }
  @keyframes rw-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  .rw-quest { animation: rw-in .35s ease-out both; }
  .rw-quest:nth-of-type(2) { animation-delay: .05s; } .rw-quest:nth-of-type(3) { animation-delay: .1s; } .rw-quest:nth-of-type(4) { animation-delay: .15s; }
  @keyframes rw-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  .rw-ico.ok { animation: rw-ok .45s cubic-bezier(.3,1.6,.5,1) both; }
  @keyframes rw-ok { 0% { transform: scale(.6) } 100% { transform: scale(1) } }
  .rw-bar.ok > i { background: var(--ds-ok); }
  .rw-quest { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 9px 0; border-top: 1px dotted var(--ds-rule2); }
  .rw-quest:first-of-type { border-top: none; }
  .rw-ico { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--ds-rule2); color: var(--u-ink); background: var(--ds-card); }
  .rw-tasks-entry { margin: 0 0 12px; padding: 12px 14px; }
  /* кольца заданий дня в карточке «Задания»: дорастают плавно, выполненное — зелёное с галочкой */
  .rw-qrings { display: inline-flex; gap: 3px; flex-shrink: 0; }
  .rw-qring { position: relative; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; color: var(--ds-ok); }
  .rw-qring > svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .rw-qring circle { fill: none; stroke-width: 3.2; }
  .rw-qring .bg { stroke: var(--ds-rule); }
  .rw-qring .fg { stroke: var(--u); stroke-linecap: round; transition: stroke-dashoffset .9s cubic-bezier(.3,.8,.4,1), stroke .3s; }
  .rw-qring[data-done="true"] .fg { stroke: var(--ds-ok); }
  .rw-tasks-entry.grew { animation: rw-tasks-glow 1.4s ease-out 1; }
  .rw-tasks-news { color: var(--u-ink); font-weight: 700; animation: rw-news-in .35s ease-out both; }
  @keyframes rw-tasks-glow { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--u) 45%, transparent) } 60% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--u) 0%, transparent) } }
  @keyframes rw-news-in { from { opacity: 0; transform: translateY(4px) } }
  @media (prefers-reduced-motion: reduce) { .rw-qring .fg { transition: none; } .rw-tasks-entry.grew, .rw-tasks-news { animation: none; } }
  .rw-money { display: grid; gap: 8px; margin: 0 0 12px; font-size: 14px; line-height: 1.4; }
  .rw-money > div:not(.rw-money-rate) { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 10px; align-items: center; }
  .rw-money-ico { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; }
  .rw-money-ico.coin { color: #8A6416; background: color-mix(in srgb, var(--ds-gold) 22%, var(--ds-card)); }
  .rw-money-ico.crown { color: #fff; background: color-mix(in srgb, var(--u) 85%, #000); }
  .ds-dark .rw-money-ico.coin { color: var(--ds-gold); }
  .rw-money-rate { font-size: 13px; color: var(--ds-ink2); margin-top: 6px; line-height: 1.4; }
  /* цель дня — отдельно от заданий: кольцо минут, а не четвёртая строка списка */
  .rw-goalbox { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; margin: 0 -2px 12px;
    border-radius: 14px; background: color-mix(in srgb, var(--u) 9%, var(--ds-card)); animation: rw-in .35s ease-out both; }
  .rw-ring { position: relative; width: 52px; height: 52px; }
  /* поворот — только кольцу прогресса (дуга начинается сверху), не галочке внутри */
  .rw-ring > svg { display: block; transform: rotate(-90deg); }
  .rw-ring circle { fill: none; stroke-width: 6; }
  .rw-ring .bg { stroke: var(--ds-rule); }
  .rw-ring .fg { stroke: var(--u); stroke-linecap: round; transition: stroke-dashoffset .6s cubic-bezier(.3,.8,.4,1); animation: rw-ring 1s cubic-bezier(.3,.8,.4,1) both; }
  .rw-ring[data-ok="true"] .fg { stroke: var(--ds-ok); }
  .rw-ring b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 700 13px var(--ds-mono); color: var(--ds-ink); }
  @keyframes rw-ring { from { stroke-dashoffset: var(--len) } }
  .rw-qhead { display: flex; align-items: baseline; justify-content: space-between; padding-top: 2px; }
  .rw-ico.ok { background: var(--ds-ok-btn); border-color: var(--ds-ok-btn); color: #fff; }
  .rw-coin { font: 700 13px var(--ds-mono); color: var(--ds-ink2); display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .rw-page { position: fixed; inset: 0; z-index: 250; overflow-y: auto; background: var(--ds-paper); padding: 8px 16px calc(40px + env(safe-area-inset-bottom)); }
  .rw-page-in { max-width: 560px; margin: 0 auto; }
  .rw-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .rw-item { border: 1px solid var(--ds-rule2); border-radius: 4px; background: var(--ds-card); padding: 10px 10px 12px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;
    box-shadow: inset 0 0 0 3px var(--ds-card), inset 0 0 0 4px var(--ds-rule); }
  .rw-item[data-on="true"] { box-shadow: inset 0 0 0 3px var(--ds-card), inset 0 0 0 4px var(--u); }
  .rw-item { transition: transform .15s ease; }
  .rw-item:hover { transform: translateY(-2px); }
  /* гардероб — примерочная: Инфля в зеркале, вкладки по местам, плитки купленных вещей */
  .rw-ward { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 520px) { .rw-ward { grid-template-columns: 170px minmax(0, 1fr); align-items: start; } }
  .rw-mirror { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .rw-mirror-glass { width: 150px; height: 176px; border-radius: 75px 75px 18px 18px; display: grid; place-items: center;
    background: radial-gradient(ellipse at 40% 30%, color-mix(in srgb, #fff 55%, var(--ds-card)), var(--ds-card2) 70%);
    border: 6px solid #B8923A; box-shadow: inset 0 0 0 2px rgba(255,255,255,.6), 0 0 0 2px #7D5A10, 0 6px 14px var(--ds-shade); }
  .rw-worn { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 100%; }
  .rw-worn span { font: 12px var(--ds-sans); padding: 2px 8px; border-radius: 999px; background: var(--ds-card2); color: var(--ds-ink2); }
  .rw-slots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .rw-slots button { border: 1.5px solid var(--ds-rule2); background: var(--ds-card); border-radius: 999px; padding: 7px 12px; min-height: 40px; font: 700 13.5px var(--ds-sans); color: var(--ds-ink2); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
  .rw-slots button[aria-selected="true"] { border-color: var(--u); color: var(--u-ink); background: var(--ds-sel); }
  .rw-slots button:disabled { opacity: .45; cursor: default; }
  .rw-slots b { font: 700 12px var(--ds-mono); }
  .rw-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
  .rw-tile { border: 1.5px solid var(--ds-rule2); border-radius: 8px; background: var(--ds-card); padding: 6px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; font: 700 12.5px/1.2 var(--ds-sans); color: var(--ds-ink); position: relative; min-height: 112px; }
  .rw-tile[aria-pressed="true"] { border-color: var(--u); box-shadow: 0 0 0 2px color-mix(in srgb, var(--u) 35%, transparent); }
  .rw-tile .rw-on { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--u); color: #fff; display: grid; place-items: center; }
  .rw-tile.none { color: var(--ds-ink3); justify-content: center; border-style: dashed; }
  .rw-price { font: 700 14px var(--ds-mono); }
  .rw-price small { font: 12px var(--ds-sans); color: var(--ds-ink3); margin-left: 4px; }
  .rw-dots { display: flex; justify-content: center; gap: 8px; }
  .rw-forgone { font-size: 12px; line-height: 1.25; color: var(--ds-ink3); }
  /* на ПК график не растягивается во всю карточку: подписи остаются размером с текст */
  .rw-piggy-chart { width: 100%; max-width: 460px; display: block; margin: 6px auto 2px; overflow: visible; }
  .rw-book { border: 1px solid var(--ds-rule2); border-radius: 14px; background: var(--ds-card); padding: 10px 12px 12px; }
  .rw-book-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font: 14.5px var(--ds-sans); padding: 3px 0; border-bottom: 1px dotted var(--ds-rule2); }
  .rw-book-row b { font-size: 16px; } .rw-book-row small { font: 12.5px var(--ds-mono); color: var(--ds-ok); }
  .rw-book-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 8px 0 2px; }
  .rw-book-days i { height: 8px; border-radius: 4px; background: var(--ds-rule); }
  .rw-book-days i.on { background: var(--u); animation: rw-fill .5s ease-out both; animation-delay: calc(var(--i) * 60ms); transform-origin: 0 50%; }
  .rw-book-days i.cur { background: color-mix(in srgb, var(--u) 35%, var(--ds-rule)); animation: rw-pulse 1.6s ease-in-out infinite; }
  @keyframes rw-pulse { 50% { opacity: .45 } }
  .rw-piggy-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px 4px; background: linear-gradient(180deg, color-mix(in srgb, var(--u) 8%, var(--ds-card)), var(--ds-card)); }
  .rw-pig { flex: none; overflow: visible; }
  .rw-pig-coin { animation: rw-coin-drop .7s cubic-bezier(.5,0,.8,.5) both; }
  @keyframes rw-coin-drop { 0% { transform: translateY(-18px); opacity: 0 } 25% { opacity: 1 } 85% { transform: translateY(12px); opacity: 1 } 100% { transform: translateY(14px); opacity: 0 } }
  .rw-pig-in .spark { animation: rw-pop .4s cubic-bezier(.3,1.6,.5,1) both; animation-delay: calc(var(--i) * 90ms + .45s); transform-box: fill-box; transform-origin: center; }
  .rw-pig-peek { animation: rw-peek .5s .25s cubic-bezier(.3,1.5,.5,1) both; }
  @keyframes rw-peek { from { transform: translateY(8px) } }
  @keyframes rw-pop { from { transform: scale(0) } }
  /* забрали вклад: свинка подпрыгивает и встряхивается, из прорези фонтаном вылетают монеты, всплывает «+N»;
     раньше срока — сгоревший процент падает серыми монетками вниз */
  .rw-pig-box { position: relative; flex: none; line-height: 0; }
  .rw-pig-box.taking .rw-pig { animation: rw-pig-shake .95s cubic-bezier(.3,1.2,.5,1) both; transform-origin: 50% 92%; }
  @keyframes rw-pig-shake { 0% { transform: none } 14% { transform: translateY(3px) scale(1.06, .9) } 30% { transform: translateY(-9px) rotate(-7deg) } 46% { transform: translateY(-2px) rotate(6deg) } 62% { transform: rotate(-4deg) } 78% { transform: rotate(2deg) } 100% { transform: none } }
  .rw-pig-out { position: absolute; left: 31px; top: 11px; width: 13px; height: 13px; border-radius: 50%; pointer-events: none; opacity: 0;
    background: radial-gradient(circle at 35% 32%, #FFF3C4, #E3B23C 55%, #A8800F); box-shadow: inset 0 0 0 1.4px #8A6416;
    animation: rw-out 1s cubic-bezier(.2,.75,.35,1) both; animation-delay: calc(var(--i) * 65ms + .18s); }
  .rw-pig-out.lost { background: radial-gradient(circle at 35% 32%, #eee, #a7a29b 60%, #6f6a63); box-shadow: inset 0 0 0 1.4px #5f5a54; animation-name: rw-lost; animation-duration: 1.1s; }
  @keyframes rw-out { 0% { transform: translate(0, 0) scale(.3); opacity: 0 } 12% { opacity: 1 } 40% { transform: translate(calc(var(--dx) * .5), var(--up)) scale(1) rotate(160deg); animation-timing-function: cubic-bezier(.5, 0, .9, .6) } 85% { transform: translate(var(--dx), var(--dy)) scale(.9) rotate(380deg); opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(.9) rotate(380deg); opacity: 0 } }
  @keyframes rw-lost { 0% { transform: translate(0, 0) scale(.3); opacity: 0 } 15% { opacity: .9 } 35% { transform: translate(calc(var(--dx) * .4), -14px) scale(.9) } 100% { transform: translate(var(--dx), 46px) scale(.6) rotate(-120deg); opacity: 0 } }
  .rw-pig-plus { position: absolute; left: 50%; top: -4px; z-index: 1; transform: translateX(-50%); white-space: nowrap; pointer-events: none; line-height: 1.15; text-align: center;
    padding: 3px 10px; border-radius: 12px; background: var(--ds-card); border: 2px solid #E3B23C; box-shadow: 0 6px 14px -8px rgba(0,0,0,.45);
    font: 800 16px var(--ds-mono); color: #7A5600; animation: rw-plus 1.7s .4s ease-out both; }
  .ds-dark .rw-pig-plus { color: #F2C14E; }
  .rw-pig-plus small { display: block; font: 700 12px var(--ds-sans); color: var(--ds-ink2); }
  @keyframes rw-plus { 0% { opacity: 0; transform: translate(-50%, 12px) scale(.7) } 22% { opacity: 1; transform: translate(-50%, -6px) scale(1.1) } 75% { opacity: 1; transform: translate(-50%, -10px) scale(1) } 100% { opacity: 0; transform: translate(-50%, -16px) } }
  .rw-book-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; font: 700 14px var(--ds-sans); }
  .rw-book-kind { padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--u) 12%, var(--ds-card)); color: var(--u-ink); }
  .rw-book-sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .rw-book-sum > div { padding: 8px 10px; border-radius: 12px; background: var(--ds-card2); }
  .rw-book-sum small { display: block; font: 12px/1.25 var(--ds-sans); color: var(--ds-ink2); }
  .rw-book-sum b { font-size: 19px; }
  .rw-book-sum .fin { background: color-mix(in srgb, var(--ds-ok) 12%, var(--ds-card)); }
  .rw-book-sum .fin b { color: var(--ds-ok-ink); }
  .rw-grow .axis { stroke: var(--ds-rule2); stroke-width: 1; }
  /* график вклада оживает по очереди: заливка проявляется, линия рисуется, точки выскакивают по дням */
  .rw-grow .area { fill: color-mix(in srgb, var(--u) 14%, transparent); stroke: none; animation: rw-area .9s ease-out .15s backwards; }
  .rw-grow .main { fill: none; stroke: var(--u); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1; animation: rw-draw .9s ease-out backwards; }
  .rw-grow .other { fill: none; stroke: var(--ds-ink3); stroke-width: 1.8; stroke-dasharray: 4 4; animation: rw-area .6s ease-out .5s backwards; }
  .rw-grow .dot { fill: var(--ds-card); stroke: var(--u); stroke-width: 1.8; transform-box: fill-box; transform-origin: center;
    animation: rw-pop .35s cubic-bezier(.3, 1.6, .5, 1) backwards; animation-delay: calc(var(--i) * 90ms + .2s); }
  .rw-grow .dot.past { fill: var(--u); }
  .rw-grow .now line { stroke: var(--u-ink); stroke-width: 1; stroke-dasharray: 2 3; }
  .rw-grow .now rect { fill: var(--u); }
  .rw-grow .now text { font: 700 11px var(--ds-sans); fill: #fff; letter-spacing: .02em; }
  .rw-grow .now { animation: rw-drop .45s cubic-bezier(.3, 1.4, .5, 1) .7s backwards; }
  .rw-grow .now circle { fill: var(--u); stroke: var(--ds-card); stroke-width: 2.5; transform-box: fill-box; transform-origin: center; animation: rw-beat 1.6s ease-in-out infinite; }
  .rw-grow text { font: 600 11.5px var(--ds-sans); fill: var(--ds-ink2); }
  .rw-grow text.end { font: 700 14px var(--ds-mono); fill: var(--ds-ink); animation: rw-area .4s ease-out .9s backwards; }
  .rw-grow text.other-t { font-size: 12px; fill: var(--ds-ink3); }
  .rw-grow text.step { font: 700 11px var(--ds-mono); fill: var(--ds-ok-ink); animation: rw-area .4s ease-out 1s backwards; }
  @keyframes rw-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
  @keyframes rw-area { from { opacity: 0 } }
  @keyframes rw-drop { from { opacity: 0; transform: translateY(-8px) } }
  @keyframes rw-beat { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.25) } }
  .rw-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--ds-ink2); margin: -2px 0 6px; }
  .rw-legend span::before { content: ''; display: inline-block; width: 16px; height: 0; margin-right: 6px; vertical-align: middle; border-top: 3px solid var(--u); }
  .rw-legend .o::before { border-top: 2px dashed var(--ds-ink3); }
  .rw-presets { display: flex; gap: 6px; margin: 2px 0 4px; }
  /* вид вклада: срочный или пополняемый — две плитки со ставкой */
  .rw-kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 2px 0 10px; }
  .rw-kinds button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 11px; text-align: left; border: 2px solid var(--ds-rule2); border-radius: 14px; background: var(--ds-card); color: var(--ds-ink); font: 700 14px/1.25 var(--ds-sans); cursor: pointer; box-shadow: 0 3px 0 var(--ds-rule2); }
  .rw-kinds button small { font: 400 12.5px/1.3 var(--ds-sans); color: var(--ds-ink2); }
  .rw-kinds button b { font: 700 15px var(--ds-mono); color: var(--u-ink); }
  .rw-kinds button[aria-pressed="true"] { border-color: var(--u); background: color-mix(in srgb, var(--u) 10%, var(--ds-card)); box-shadow: 0 3px 0 color-mix(in srgb, var(--u) 60%, var(--ds-card)); }
  .rw-kinds .t { display: inline-flex; align-items: center; gap: 5px; }
  .rw-kinds .res { font: 400 13px var(--ds-mono); color: var(--ds-ink2); margin-top: 2px; }
  .rw-kinds .res em { font-style: normal; font-weight: 700; color: var(--ds-ink); font-size: 15px; }
  .rw-kinds .res i { font-style: normal; color: var(--ds-ok-ink); font-weight: 700; }
  .rw-add { margin: 4px 0 10px; padding: 10px 12px; border-radius: 14px; background: var(--ds-card2); }
  .rw-presets button { flex: 1; min-height: 36px; border: 1.5px solid var(--ds-rule2); border-radius: 999px; background: var(--ds-card2); font: 700 13.5px var(--ds-sans); color: var(--ds-ink2); cursor: pointer; }
  .rw-book .ds-btn { margin-top: 8px; }
  .rw-real { margin-top: 10px; padding-top: 8px; border-top: 1px dotted var(--ds-rule2); }
  .rw-real summary { cursor: pointer; font: 700 14px var(--ds-sans); color: var(--u-ink); }
  .rw-piggy-chart text { font: 600 11.5px var(--ds-sans); fill: var(--ds-ink2); }
  .rw-piggy-chart text.num { font: 700 12px var(--ds-mono); }
  .rw-piggy-chart text.end { paint-order: stroke; stroke: var(--ds-card); stroke-width: 4px; stroke-linejoin: round; }
  .rw-book-dayline { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 10px 0 6px; font: 600 13.5px var(--ds-sans); color: var(--ds-ink2); }
  .rw-book-dayline b { color: var(--ds-ink); }
  .rw-dot { width: 38px; display: flex; flex-direction: column; align-items: center; gap: 5px; font: 700 12px var(--ds-sans); color: var(--ds-ink2); }
  .rw-dot i { width: 34px; height: 34px; border-radius: 50%; border: 1.5px dashed var(--ds-rule2); display: flex; align-items: center; justify-content: center; color: var(--ds-ink3); }
  /* день с уроком — оттиск: кольцо цветом огня, внутри огонёк чернилами; ставится как печать */
  .rw-dot.done i { border: 2px solid var(--rw-fire, #C2531E); color: var(--rw-fire-ink, #8E3512); background: var(--rw-fire-tint, #FBE7D9);
    box-shadow: inset 0 0 0 2px var(--ds-card), inset 0 0 0 3px color-mix(in srgb, var(--rw-fire, #C2531E) 45%, transparent);
    animation: rw-dot-press .42s cubic-bezier(.3,1.4,.5,1) both; animation-delay: calc(1.1s + var(--i, 0) * 80ms); }
  .rw-dot.frozen i { border: 2px solid #3E6FA8; color: #2B4F7A; background: color-mix(in srgb, #3E6FA8 12%, var(--ds-card));
    animation: rw-dot-press .42s cubic-bezier(.3,1.4,.5,1) both; animation-delay: calc(1.1s + var(--i, 0) * 80ms); }
  .rw-dot.today { color: var(--ds-ink); }
  .rw-dot.today:not(.done) i { border: 2px dashed var(--rw-fire, #C2531E); animation: rw-today 1.8s ease-in-out 1.8s infinite; }
  @keyframes rw-dot-press { 0% { transform: scale(1.5) rotate(-14deg); opacity: 0 } 60% { opacity: 1 } 100% { transform: none; opacity: 1 } }
  @keyframes rw-today { 0%, 100% { transform: none } 50% { transform: scale(1.08) } }
  .rw-stamps { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px 6px; justify-items: center; }
  .rw-stamp { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
  /* ещё не полученная печать: блёклый серый оттиск, а подпись читается полным контрастом */
  .rw-stamp[data-got="false"] b { color: var(--ds-ink2); font-weight: 600; }
  .rw-stamp[data-got="false"] span { color: var(--ds-ink3); }
  .rw-stamp b { font: 700 12px/1.2 var(--ds-head); }
  .rw-stamp span { font: 12px/1.25 var(--ds-sans); color: var(--ds-ink2); }
  /* утренний экран серии — в языке сайта: бумажный билет с гильошной каймой, розетка-печать с огоньком,
     нарисованным чернилами (контур и штриховка, как гравюра), цифра шрифтом заголовков и неделя —
     оттисками печатей. Огонёк чуть дышит, розетка дорисовывается, оттиски дней ставятся по очереди */
  .rw-morning { --rw-fire: #C2531E; --rw-fire-ink: #8E3512; --rw-fire-tint: color-mix(in srgb, #E27A3A 16%, var(--ds-card));
    position: fixed; inset: 0; z-index: 320; display: flex; flex-direction: column; overflow: auto; background: var(--ds-paper); padding: 24px 20px calc(24px + env(safe-area-inset-bottom)); }
  .ds-dark .rw-morning, .rw-morning.ds-dark { --rw-fire: #F08A4B; --rw-fire-ink: #F3A877; --rw-fire-tint: color-mix(in srgb, #F08A4B 18%, var(--ds-card)); }
  .rw-morning-in { position: relative; flex: 1; max-width: 420px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: stretch; justify-content: center; text-align: center; }
  @media (min-width: 700px) { .rw-morning { justify-content: center; } .rw-morning-in { flex: 0 0 auto; } }
  .rw-ticket { position: relative; background: var(--ds-card); border: 2px solid var(--ds-rule2); border-radius: 18px; box-shadow: 0 3px 0 var(--ds-rule), inset 0 0 0 5px var(--ds-card), inset 0 0 0 6px var(--ds-rule);
    padding: 10px 6px; animation: rw-up .45s ease-out both; }
  .rw-ticket-in { padding: 6px 18px 4px; display: flex; flex-direction: column; align-items: center; }
  .rw-seal { position: relative; margin: 10px 0 2px; }
  .rw-seal > span > svg path, .rw-seal > span > svg circle { stroke-dasharray: 900; stroke-dashoffset: 900; animation: rw-draw 1.6s ease-out .15s forwards; }
  @keyframes rw-draw { to { stroke-dashoffset: 0; } }
  .rw-flame { display: block; overflow: visible; }
  .rw-flame .sway { transform-box: fill-box; transform-origin: 50% 100%; animation: rw-sway 3.2s ease-in-out 1s infinite; }
  @keyframes rw-sway { 0%, 100% { transform: none } 30% { transform: skewX(-2.5deg) scaleY(1.03) } 65% { transform: skewX(2deg) scaleY(.98) } }
  .rw-flame .rise { animation: rw-rise .7s cubic-bezier(.3,1.5,.5,1) .35s both; transform-box: fill-box; transform-origin: 50% 100%; }
  @keyframes rw-rise { from { transform: scale(.4); opacity: 0 } }
  .rw-days { display: flex; justify-content: center; font: 800 76px/1 var(--ds-head); font-variant-numeric: tabular-nums; color: var(--rw-fire-ink); letter-spacing: -.01em; margin-top: 4px; }
  .rw-days span { display: inline-block; animation: rw-digit .5s cubic-bezier(.3,1.5,.5,1) both; animation-delay: calc(.6s + var(--i, 0) * 90ms); }
  @keyframes rw-digit { 0% { transform: translateY(-24px); opacity: 0 } 100% { transform: none; opacity: 1 } }
  .rw-days-label { font: 700 13px/1.2 var(--ds-sans); letter-spacing: .16em; text-transform: uppercase; color: var(--ds-ink2); margin-top: 6px; animation: rw-up .45s ease-out .8s both; }
  .rw-days-sub { font-size: 15px; line-height: 1.45; color: var(--ds-ink2); margin: 12px 0 14px; max-width: 300px; animation: rw-up .45s ease-out .9s both; }
  @keyframes rw-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  .rw-week { width: 100%; border-top: 1px dashed var(--ds-rule2); padding: 14px 0 6px; }
  .rw-dots { display: flex; justify-content: center; gap: 6px; }
  /* сундук при открытии чуть подпрыгивает и пружинит — без поворота и крена */
  .rw-chest-open { animation: rw-chest-pop .5s ease-out 1 both; transform-origin: 50% 90%; }
  @keyframes rw-chest-pop { 0% { transform: none; } 30% { transform: scale(1.08, .92); } 60% { transform: scale(.96, 1.05) translateY(-4px); } 100% { transform: none; } }
  .rw-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .rw-rate { width: 100%; height: 64px; display: block; touch-action: none; }
  /* палец ведёт по графику — подписи вокруг не выделяются и не всплывает меню «Копировать» */
  .rw-rate-box, .rw-piggy-chart { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  .rw-item { position: relative; }
  .rw-deal { position: absolute; top: -8px; right: -6px; transform: rotate(6deg); background: var(--ds-bad-btn); color: #fff; font: 700 12px var(--ds-sans); letter-spacing: .04em; padding: 3px 7px; border-radius: 2px; box-shadow: 0 1px 2px var(--ds-shade); }
  .rw-rare.rw-season { background: linear-gradient(135deg, #3B2D52, #7B3FA0); }
  .rw-hw { margin: 4px -6px 6px; padding: 10px 6px 2px; border-radius: 18px; background: linear-gradient(180deg, color-mix(in srgb, #7B3FA0 10%, transparent), transparent 70%); }
  .rw-rare { position: absolute; top: -9px; left: -6px; transform: rotate(-6deg); display: inline-flex; align-items: center; gap: 3px; background: linear-gradient(135deg, #B3123F, #9B2C8F); color: #fff; font: 700 12px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; padding: 3px 8px; border-radius: 8px; box-shadow: 0 1px 3px var(--ds-shade); }
  /* редкая вещь: золотистая карточка, по ней пробегает блик, Инфля в ней крупнее */
  .rw-item[data-rare="true"] { border-color: #C9A43A;
    background: linear-gradient(110deg, transparent 35%, rgba(255, 246, 214, .75) 48%, transparent 61%) 0 0 / 260% 100% no-repeat, color-mix(in srgb, var(--ds-card) 84%, #E3B53C);
    box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--ds-card) 84%, #E3B53C), inset 0 0 0 4px #C9A43A, 0 2px 10px rgba(201, 164, 58, .28);
    animation: rw-shine 5s ease-in-out infinite; }
  .rw-item[data-rare="true"][data-owned="true"] { animation: none; }
  @keyframes rw-shine { 0%, 55% { background-position: 130% 0, 0 0 } 100% { background-position: -30% 0, 0 0 } }
  .rw-note { font: italic 12px/1.3 var(--ds-sans); color: var(--ds-ink2); }
  .rw-desk-items { grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); }
  .rw-desk-stage { width: 100%; border-radius: 4px; background: repeating-linear-gradient(0deg, transparent 0 15px, var(--ds-rule) 15px 16px), var(--ds-paper); padding-top: 4px; }
  .rw-desk-tag { background: linear-gradient(135deg, #2E5F8A, #4D7C0F); }
  .rw-theme-tag { background: linear-gradient(135deg, #0F6B4A, #3B2D8F); }
  /* лавка: кошелёк и курс сверху, вкладки отделов */
  .sh-head-card { margin: 0 0 12px; padding: 12px 14px; }
  .sh-head { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; }
  .sh-bal { font-size: 26px; font-weight: 700; line-height: 1.15; }
  .sh-bal span { font-size: 14.5px; }
  .sh-rate { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 10px; padding: 8px 12px; min-height: 48px; border: 1px solid var(--ds-rule2); border-radius: 12px;
    background: var(--ds-card2); color: var(--ds-ink); font: 14px var(--ds-sans); text-align: left; cursor: pointer; }
  .sh-rate:hover { border-color: var(--u); }
  .sh-rate-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .sh-rate-k { font: 600 12px var(--ds-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--ds-ink3); }
  .sh-infl { display: flex; align-items: flex-start; gap: 6px; margin-top: 8px; padding: 0 4px; font: 13px/1.4 var(--ds-sans); color: var(--ds-ink2); }
  .sh-infl svg { flex-shrink: 0; margin-top: 2px; color: var(--ds-bad, #A4462A); }
  .sh-infl b { color: var(--ds-ink); font-weight: 700; }
  .sh-rate-prev { font-size: 12.5px; color: var(--ds-ink2); display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .sh-chev { flex: none; color: var(--ds-ink3); transition: transform .2s ease; }
  .sh-rate[aria-expanded="true"] .sh-chev { transform: rotate(180deg); }
  .sh-more { margin-top: 12px; animation: rw-in .25s ease-out both; }
  .sh-tabs { display: flex; gap: 3px; padding: 4px; margin: 0 0 12px; border: 1px solid var(--ds-rule2); border-radius: 16px; background: var(--ds-card2); overflow-x: auto; scrollbar-width: none; }
  .sh-tabs::-webkit-scrollbar { display: none; }
  .sh-tab { position: relative; flex: 1 1 0; min-width: 58px; min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 4px;
    border: 0; border-radius: 12px; background: transparent; color: var(--ds-ink2); font: 600 12px/1.15 var(--ds-sans); white-space: nowrap; cursor: pointer; transition: background .15s ease, color .15s ease; }
  .sh-tab:hover { color: var(--ds-ink); }
  .sh-tab[aria-selected="true"] { background: var(--ds-card); color: var(--ds-ink); box-shadow: 0 1px 3px var(--ds-shade); }
  .sh-tab[aria-selected="true"] svg { color: var(--u-ink); }
  .sh-badge { position: absolute; top: 1px; right: 1px; display: inline-flex; align-items: center; font: 700 12px/1.2 var(--ds-sans); color: #fff; background: var(--ds-bad-btn); border-radius: 999px; padding: 0 5px; }
  .sh-badge.hw { background: #6B3FA0; padding: 2px 4px; }
  .sh-dot { position: absolute; top: 6px; right: calc(50% - 16px); width: 8px; height: 8px; border-radius: 50%; background: var(--ds-ok); box-shadow: 0 0 0 2px var(--ds-card2); }
  .sh-msg { margin: 0 0 12px; font-size: 14.5px; color: var(--ds-bad); }
  .sh-msg[data-ok="true"] { color: var(--ds-ok); }
  .sh-panel { animation: rw-in .25s ease-out both; }
  .sh-intro { margin: 0 0 12px; font-size: 14px; line-height: 1.4; color: var(--ds-ink2); }
  .rw-price s { color: var(--ds-ink3); font-weight: 400; margin-right: 4px; }
  .rw-goal { height: 5px; width: 100%; border-radius: 3px; background: var(--ds-rule); overflow: hidden; }
  .rw-goal > i { display: block; height: 100%; background: #8A2F45; }
  .rw-quest-rare { display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: .02em; vertical-align: 1px; color: var(--ds-gold-ink, #7A5A12); background: color-mix(in srgb, var(--ds-gold) 22%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--ds-gold) 55%, var(--ds-rule)); }
  @media (prefers-reduced-motion: reduce) { .rw-ticket, .rw-seal svg *, .rw-flame *, .rw-days span, .rw-days-label, .rw-days-sub, .rw-dot i { animation: none !important; stroke-dashoffset: 0 !important; } }
  @media (prefers-reduced-motion: reduce) { .sh-panel, .sh-more, .rw-flame, .rw-chest-open, .rw-item[data-rare="true"], .rw-bar > i, .rw-quest, .rw-ico.ok, .rw-goalbox, .rw-ring .fg, .rw-book-days i, .rw-pig-coin, .rw-pig-in .spark, .rw-pig-peek, .rw-pig-box.taking .rw-pig, .rw-pig-plus, .rw-grow .main, .rw-grow .now circle, .rw-grow .area, .rw-grow .other, .rw-grow .dot, .rw-grow .now, .rw-grow text { animation: none; } .rw-grow .main { stroke-dasharray: none; } .rw-bar > i, .rw-item { transition: none; } }
`;

const Q_ICON = { timer: Timer, map: MapIcon, check: Check, target: Target, coins: Coins, flame: Flame, spark: Zap, globe: Globe, repeat: Repeat };
export const Bar = ({ have, target, ok }) => <div className={`rw-bar ${ok ? 'ok' : ''}`} role="presentation"><i style={{ width: `${Math.round((Math.min(have, target) / target) * 100)}%` }} /></div>;
export const CoinTag = ({ n, testid }) => <span className="rw-coin" data-testid={testid}><Coins size={14} color="var(--ds-gold)" aria-hidden="true" />{n}</span>;

/* ------------------------------ КОШЕЛЁК ------------------------------ */
// монеты в кошельке; тратятся во вкладке «Лавка» нижней панели
export function WalletStat({ learn }) {
  const b = balance(learn);
  return (
    <span className="ln-stat" title="Монеты — тратятся во вкладке «Лавка»" data-testid="wallet">
      <Wallet size={17} color="var(--ds-gold)" aria-hidden="true" /><span className="ds-sr">Монеты: </span><span data-testid="wallet-balance">{b}</span>
    </span>
  );
}

/* Карточка «Задания» наверху Пути: сколько заданий дня сделано, цель в минутах и испытание
   месяца — одной строкой. Касание открывает экран заданий (задания дня, испытание, практика).
   Прогресс виден без открытия: три маленьких кольца заданий дня; продвинулось с прошлого показа —
   кольцо дорастает от прежнего значения, карточка вспыхивает, на 4 с — строка «что продвинулось»
   (docs/mechanics.md, «Навигация»). Показанное помнит устройство на сегодня. */
const QUESTS_SEEN = 'ems-quests-seen';
const readQuestsSeen = (day) => { try { const v = JSON.parse(localStorage.getItem(QUESTS_SEEN)); return v && v.day === day && v.have ? v.have : null; } catch { return null; } };
function QuestRing({ have, target, done, id }) {
  const r = 8; const len = 2 * Math.PI * r; const k = target ? Math.min(1, have / target) : 0;
  return (
    <span className="rw-qring" data-testid="tasks-ring" data-quest={id} data-have={have} data-done={String(done)} aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 22 22"><circle className="bg" cx="11" cy="11" r={r} />
        <circle className="fg" cx="11" cy="11" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - k)} /></svg>
      {done && <Check size={10} strokeWidth={3.2} />}
    </span>
  );
}
export function TasksEntry({ learn, onOpen, now = Date.now() }) {
  const quests = questsFor(learn, now);
  const g = goalToday(learn, now);
  const m = monthChallenge(learn, now);
  const day = dayOf(now);
  const done = quests.filter((q) => q.done).length;
  const goalOk = g.done >= g.goal;
  const month = m.claimed ? 'выполнено' : m.waiting ? `с ${m.startsText}` : `${m.have} из ${m.target}`;
  const text = `Задания дня: ${done} из 3 · цель ${Math.min(g.done, g.goal)}/${g.goal} мин · испытание месяца ${month}`;
  // кольца рисуются сначала с прежним значением, потом — с новым: так они плавно дорастают
  const haveKey = quests.map((q) => `${q.id}:${q.have}`).join(',');
  const [shown, setShown] = useState(() => { const prev = readQuestsSeen(day); return Object.fromEntries(quests.map((q) => [q.id, prev ? Math.min(q.have, prev[q.id] || 0) : q.have])); });
  const [news, setNews] = useState(null);
  useEffect(() => {
    const ch = questNews(readQuestsSeen(day), quests);
    const now2 = Object.fromEntries(quests.map((q) => [q.id, q.have]));
    try { localStorage.setItem(QUESTS_SEEN, JSON.stringify({ day, have: now2 })); } catch { /* приватный режим */ }
    if (!ch.length) { setShown(now2); return undefined; }
    const grow = setTimeout(() => setShown(now2), 120);
    setNews(ch[ch.length - 1]);
    const hide = setTimeout(() => setNews(null), 4000);
    return () => { clearTimeout(grow); clearTimeout(hide); };
  }, [day, haveKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const newsText = news ? (news.done ? `${news.title} — выполнено, +${news.coins} ${coinsWord(news.coins)}` : `${news.title}: ${news.to} из ${news.target}`) : null;
  return (
    <button type="button" className={`ds-card ds-card--button rw-tasks-entry${news ? ' grew' : ''}`} data-testid="tasks-card" data-nav-target="tasks" aria-label={`Задания. ${text}`}
      onClick={() => { Audio.play('paper'); onOpen(); }}>
      <span className={`rw-ico ${done === 3 && goalOk ? 'ok' : ''}`}>{done === 3 && goalOk ? <Check size={16} aria-hidden="true" /> : <ListChecks size={16} aria-hidden="true" />}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 15.5 }}>Задания</span>
        {newsText
          ? <span className="rw-tasks-news" style={{ display: 'block', fontSize: 13, lineHeight: 1.35 }} data-testid="tasks-news" role="status">{newsText}</span>
          : <span className="ds-sub" style={{ display: 'block', fontSize: 13, lineHeight: 1.35 }} data-testid="tasks-card-text">{text}</span>}
      </span>
      <span className="rw-qrings" data-testid="tasks-rings">
        {quests.map((q) => <QuestRing key={q.id} id={q.id} have={shown[q.id] ?? q.have} target={q.target} done={(shown[q.id] ?? q.have) >= q.target} />)}
      </span>
      <ChevronRight size={20} color="var(--ds-ink3)" aria-hidden="true" />
    </button>
  );
}

/* ------------------------------ ЗАДАНИЯ ДНЯ ------------------------------
   Цель дня (минуты) — отдельным блоком с кольцом, а не четвёртой строкой: раньше под заголовком
   «Задания дня 0/3» стояло четыре строки, и было непонятно, почему заданий четыре. */
function GoalRing({ have, goal }) {
  const r = 22; const len = 2 * Math.PI * r; const k = Math.min(1, have / goal);
  return (
    <span className="rw-ring" data-ok={String(have >= goal)} aria-hidden="true">
      <svg width="52" height="52" viewBox="0 0 52 52"><circle className="bg" cx="26" cy="26" r={r} />
        <circle className="fg" cx="26" cy="26" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - k)} style={{ '--len': len }} /></svg>
      <b>{have >= goal ? <Check size={20} color="var(--ds-ok)" /> : Math.min(have, goal)}</b>
    </span>
  );
}
export function QuestsCard({ learn, now = Date.now(), testid = 'quests' }) {
  const quests = questsFor(learn, now);
  const g = goalToday(learn, now);
  const done = quests.filter((q) => q.done).length;
  const goalOk = g.done >= g.goal;
  return (
    <Card style={{ margin: '0 0 14px' }} data-testid={testid}>
      {/* цель дня — минуты занятий: у всех своя скорость, а время честно сравнивается само с собой */}
      <div className="rw-goalbox" data-testid="goal-row" data-done={String(goalOk)}>
        <GoalRing have={g.done} goal={g.goal} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Цель дня: {g.goal} минут занятий</div>
          <div className="ds-sub" style={{ fontSize: 13 }}>{goalOk ? 'Выполнена — монеты уже в кошельке' : `Сделано ${Math.min(g.done, g.goal)} из ${g.goal} мин · осталось ${g.goal - g.done}`}</div>
        </div>
        <CoinTag n={`+${indexed(goalCoins(g.goal), now)}`} />
      </div>
      <div className="rw-qhead">
        <div className="ds-h3">Задания дня</div>
        <span className="ds-num ds-faint" style={{ fontSize: 13 }} data-testid="quests-done">{done} из 3</span>
      </div>
      <div className="ds-sub" style={{ fontSize: 12.5, margin: '-2px 0 6px' }} data-testid="quests-utc">Новые — в {rolloverLocal(now)} по вашему времени (полночь по Гринвичу)</div>
      <div>
        {quests.map((q) => {
          const Icon = Q_ICON[QUEST_ICON[q.id]] || Target;
          return (
            <div key={q.id} className="rw-quest" data-testid="quest" data-quest={q.id} data-done={String(q.done)}>
              <span className={`rw-ico ${q.done ? 'ok' : ''}`}>{q.done ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{q.title}{q.rare && <span className="rw-quest-rare" data-testid="quest-rare">Редкое</span>}</div>
                <Bar have={q.have} target={q.target} ok={q.done} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <CoinTag n={`+${indexed(q.coins, now)}`} />
                <div className="ds-num ds-faint" style={{ fontSize: 12 }}>{q.have}/{q.target}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ds-faint" style={{ fontSize: 12, marginTop: 6 }}>Все три задания — ещё +{indexed(COIN.allQuests, now)}. Новые задания — завтра, с нуля.</div>
    </Card>
  );
}
// испытание месяца: цель от самого ученика (цель дня в минутах, прошлый месяц) — и откуда она взялась
export function MonthCard({ learn, now = Date.now() }) {
  const m = monthChallenge(learn, now);
  return (
    <Card style={{ margin: '0 0 14px' }} data-testid="month" data-done={String(m.done)} data-kind={m.id || undefined} data-waiting={m.waiting ? 'true' : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <CalendarDays size={18} color="var(--u-ink)" aria-hidden="true" />
        <span className="ds-h3" style={{ flex: 1 }}>Испытание месяца</span>
        <CoinTag n={`+${indexed(m.coins, now)}`} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }} data-testid="month-title">{m.title}</div>
      {m.waiting ? <div className="ds-faint" style={{ fontSize: 12, marginTop: 2 }} data-testid="month-why">{m.why}</div> : <>
      <Bar have={m.have} target={m.target} ok={m.done} />
      <div className="ds-faint" style={{ fontSize: 12, marginTop: 4 }}>
        {m.claimed ? `Выполнено — марка «${m.name}» в альбоме.`
          : `${m.have} из ${m.target}${m.need ? ` · нужно ещё ${m.need} ${m.unit}` : ''} · до конца месяца ${m.daysLeft} ${plural(m.daysLeft, 'день', 'дня', 'дней')}${m.daysLeft === 1 ? ' — сегодня последний' : ''}`}
      </div>
      <div className="ds-faint" style={{ fontSize: 12, marginTop: 2 }} data-testid="month-why">{m.why}</div>
      </>}
    </Card>
  );
}

/* ------------------------------ СУНДУК ЮНИТА ------------------------------ */
export function ChestSheet({ unitId, place, learn, update, onClose }) {
  const n = indexed(chestCoins(unitId));
  const [opened, setOpened] = useState(false);
  const was = hasClaim(learn, chestKey(unitId));
  const open = () => { Audio.play('register'); update((s) => openChest(s, unitId), { settle: true }); setOpened(true); };
  // закрытие сообщает, открыли ли сундук сейчас: тогда Путь свернёт пройденный юнит и поедет дальше
  const close = () => onClose(opened);
  return (
    <Sheet label={`Сундук: ${place}`} onClose={close} testid="chest-sheet">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginRight: -8 }}><IconButton label="Закрыть" icon={X} data-nav="back" onClick={close} size={22} /></div>
      <div style={{ textAlign: 'center' }}>
        {opened && <CoinShower seed={n} n={18} />}
        <div className="ds-eyebrow">Сундук юнита · {place}</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }} className={opened ? 'rw-chest-open' : ''}>
          <Chest size={132} open={opened} animate spent={was && !opened} label={opened ? 'Сундук открыт: монеты' : was ? 'Сундук пуст' : 'Сундук закрыт'} />
        </div>
        {opened ? (
          <><div className="ds-h2" data-testid="chest-coins">+{n} {coinsWord(n)}</div><div className="ds-sub" style={{ fontSize: 14.5, margin: '4px 0 14px' }}>Место на карте ваше — монеты в кошельке.</div>
            <Button wide data-testid="chest-take" onClick={close}>Забрать</Button></>
        ) : was ? (
          <div className="ds-sub" style={{ fontSize: 15 }}>Сундук уже открыт — монеты в кошельке.</div>
        ) : (
          <><div className="ds-sub" style={{ fontSize: 15, marginBottom: 14 }}>Юнит пройден — внутри монеты.</div><Button wide data-testid="chest-open" onClick={open}>Открыть</Button></>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------ УТРЕННИЙ ЭКРАН СЕРИИ ------------------------------
   Один раз в день, при первом открытии — бумажный билет в стиле сайта: розетка-печать с огоньком-
   гравюрой, число дней, «дней подряд», что делать сегодня и неделя оттисками печатей. Без мелкого текста. */
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
/* Огонёк серии — гравюра: контуры чернилами, штриховка внутри, сердцевина — светлой бумагой;
   при появлении поднимается, потом чуть колышется. */
const FLAME_OUT = 'M32 4 C 36 20, 54 30, 54 52 C 54 68, 44 76, 32 76 C 20 76, 10 68, 10 52 C 10 40, 17 33, 21 24 C 23 33, 26 37, 29 38 C 27 26, 28 14, 32 4 Z';
const FLAME_MID = 'M32 32 C 36 43, 46 49, 46 59 C 46 69, 40 74, 32 74 C 24 74, 18 69, 18 59 C 18 52, 23 47, 25 42 C 27 49, 29 51, 31 52 C 30 45, 30 39, 32 32 Z';
const FLAME_CORE = 'M32 53 C 35 59, 39 62, 39 66.5 C 39 70.5, 36 72.5, 32 72.5 C 28 72.5, 25 70.5, 25 66.5 C 25 62, 29 59, 32 53 Z';
export function EngravedFlame({ size = 64 }) {
  const id = `fl${React.useId().replace(/:/g, '')}`;
  const hatch = (step, from = -40, to = 110) => Array.from({ length: Math.ceil((to - from) / step) }, (_, k) => `M${from + k * step} 80 L${from + k * step + 60} 0`).join(' ');
  return (
    <svg className="rw-flame" viewBox="0 0 64 80" width={size} height={size * 1.25} aria-hidden="true">
      <defs>
        <clipPath id={`${id}o`}><path d={FLAME_OUT} /></clipPath>
        <clipPath id={`${id}m`}><path d={FLAME_MID} /></clipPath>
      </defs>
      <ellipse cx="32" cy="77.5" rx="17" ry="2.2" fill="var(--rw-fire-ink)" opacity=".14" />
      <g className="rise"><g className="sway">
        <path d={FLAME_OUT} fill="var(--rw-fire-tint)" />
        <path d={hatch(3.2)} stroke="var(--rw-fire)" strokeWidth=".9" opacity=".75" clipPath={`url(#${id}o)`} />
        <path d={FLAME_MID} fill="var(--ds-card)" />
        <path d={hatch(5.2)} stroke="var(--rw-fire)" strokeWidth=".7" opacity=".45" clipPath={`url(#${id}m)`} />
        <path d={FLAME_CORE} fill="var(--ds-card)" stroke="var(--rw-fire-ink)" strokeWidth="1" />
        <path d={FLAME_MID} fill="none" stroke="var(--rw-fire-ink)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d={FLAME_OUT} fill="none" stroke="var(--rw-fire-ink)" strokeWidth="1.8" strokeLinejoin="round" />
      </g></g>
    </svg>
  );
}
export function MorningStreak({ learn, onClose, now = Date.now() }) {
  const st = streak(learn, now);
  const hello = greetingAt(new Date(now).getHours());
  const label = `${plural(st.days, 'день', 'дня', 'дней')} подряд`;
  return (
    <div className="rw-morning" data-testid="morning" role="dialog" aria-label="Серия дней">
      <div className="rw-morning-in">
        <div className="rw-ticket">
          <Guilloche height={20} color="var(--rw-fire)" opacity={0.4} />
          <div className="rw-ticket-in">
            <div className="ds-eyebrow" style={{ color: 'var(--rw-fire-ink)', marginTop: 8 }}>{hello}</div>
            <div className="rw-seal"><Rosette size={146} color="var(--rw-fire)" opacity={0.32}><EngravedFlame size={76} /></Rosette></div>
            <div className="rw-days" data-testid="morning-days" data-value={st.days} role="img" aria-label={`${st.days} ${label}`}>
              {String(st.days).split('').map((c, k) => <span key={k} style={{ '--i': k }} aria-hidden="true">{c}</span>)}
            </div>
            <div className="rw-days-label">{label}</div>
            <div className="rw-days-sub">{st.today ? 'Сегодня уже занимались — серия продлена.' : 'Один урок сегодня — и огонёк горит дальше.'}</div>
            <div className="rw-week">
              <div className="rw-dots" data-testid="morning-week">
                {weekDots(learn, now).map((d, k) => (
                  <div key={d.day} className={`rw-dot ${d.done ? 'done' : d.frozen ? 'frozen' : ''} ${d.today ? 'today' : ''}`}>
                    <i style={{ '--i': k }}>{d.done ? <Flame size={16} strokeWidth={2.2} aria-hidden="true" /> : d.frozen ? <ShieldCheck size={15} aria-hidden="true" /> : null}</i>{DOW[d.dow]}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Guilloche height={20} color="var(--rw-fire)" opacity={0.4} />
        </div>
      </div>
      <div style={{ position: 'relative', maxWidth: 420, width: '100%', margin: '18px auto 0' }}><Button wide autoFocus data-testid="morning-go" onClick={() => { Audio.play('paper'); onClose(); }}>{st.today ? 'В путь' : 'Продолжить серию'}</Button></div>
    </div>
  );
}

/* ------------------------------ ПЕЧАТИ ------------------------------
   Полученные — цветные сургучные печати, первыми; ещё не полученные — отдельно, пунктирным
   контуром с замком и подписью «как получить»: что есть, а чего нет, видно с первого взгляда. */
export function Achievements({ learn }) {
  const list = achievementsOf(learn);
  const months = monthStamps(learn);
  const got = list.filter((a) => a.got); const rest = list.filter((a) => !a.got);
  const item = (a) => {
    const Icon = ACH_ICON[a.icon] || Check;
    return (
      <div key={a.id} className="rw-stamp" data-testid="ach" data-ach={a.id} data-got={String(a.got)} title={a.text}>
        <Medal icon={<Icon size={24} strokeWidth={a.got ? 2.2 : 1.8} />} got={a.got} color="var(--u)" size={68} label={`${a.title}: ${a.got ? 'получена' : 'ещё не получена'}`} />
        <b>{a.title}</b><span>{a.got ? a.text : a.how || a.text}</span>
      </div>
    );
  };
  return (
    <div data-testid="achievements">
      <div className="ds-eyebrow" style={{ margin: '2px 0 8px' }} data-testid="ach-got-count">Получено: {got.length + months.length} из {list.length + months.length}</div>
      {(got.length > 0 || months.length > 0) ? (
        <div className="rw-stamps">
          {got.map(item)}
          {months.map((m) => (
            <div key={m.key} className="rw-stamp" data-testid="ach-month" data-got="true">
              <Medal icon={<CalendarDays size={24} strokeWidth={2.2} />} got color="var(--ds-gold)" size={68} label={`Марка месяца: ${m.name}`} />
              <b>{m.name}</b><span>марка месяца</span>
            </div>
          ))}
        </div>
      ) : <div className="ds-sub" style={{ fontSize: 14 }}>Пока ни одной — первая печать за первый пройденный урок.</div>}
      {rest.length > 0 && (
        <>
          <div className="ds-eyebrow" style={{ margin: '16px 0 8px', color: 'var(--ds-ink2)' }}>Ещё не получены</div>
          <div className="rw-stamps rw-stamps-locked">{rest.map(item)}</div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ НАГРАДЫ ЗА УРОК ------------------------------ */
// label — за что монеты основной строки («За урок»; у большого повторения — «За большое повторение»)
export function GainsList({ coins, gains, label = 'За урок' }) {
  const total = coins + gains.reduce((a, g) => a + g.coins, 0);
  if (!total) return null;
  return (
    <div style={{ marginTop: 14, textAlign: 'left' }} data-testid="result-coins" data-total={total}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, font: '700 18px var(--ds-mono)' }}>
        <Coins size={20} color="var(--ds-gold)" aria-hidden="true" /><CountUp value={total} prefix="+" /> <span style={{ font: '15px var(--ds-sans)' }}>{coinsWord(total)}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        {coins > 0 && <div className="ds-row" style={{ fontSize: 13.5 }} data-testid="result-lesson-coins"><span>{label}</span><b className="ds-num">+{coins}</b></div>}
        {gains.map((g) => <div key={g.key} className="ds-row" style={{ fontSize: 13.5 }} data-testid="gain" data-kind={g.kind}><span>{g.title}</span><b className="ds-num">+{g.coins}</b></div>)}
      </div>
    </div>
  );
}

/* ------------------------------ МОЯ ПРОГРАММА ------------------------------ */
export function ProgramCard({ learn, update, onPlacement }) {
  const p = learn.profile || {};
  const level = skillLevel(learn);
  const setMinutes = (m) => { Audio.play('tick'); update((s) => setProfile(s, { minutes: m })); };
  const mins = goalMinutes(learn);
  const next = pendingGoal(learn);
  // выбранная кнопка — цель, которую выбрали (новая действует с завтра)
  const chosen = next ? next.minutes : mins;
  return (
    <Card style={{ margin: '12px 0' }} data-testid="prof-program">
      <div className="ds-h3" style={{ marginBottom: 8 }}>Моя программа</div>
      <div className="ds-eyebrow" style={{ marginBottom: 6 }}>Цель</div>
      <div className="rw-chip-row" role="group" aria-label="Цель">
        {PROFILE_GOALS.map((g) => <button key={g} type="button" className="ds-chip" aria-pressed={p.goal === g} onClick={() => { Audio.play('tick'); update((s) => setProfile(s, { goal: g })); }}>{PROFILE_GOAL_LABEL[g]}</button>)}
      </div>
      <div className="ds-eyebrow" style={{ margin: '12px 0 6px' }}>Цель дня · минут занятий</div>
      <div className="rw-chip-row" role="group" aria-label="Минут в день">
        {PROFILE_MINUTES.map((m) => (
          <button key={m} type="button" className="ds-chip" aria-pressed={chosen === m} data-minutes={m} onClick={() => setMinutes(m)}>{m} мин</button>
        ))}
      </div>
      <div className="ds-faint" style={{ fontSize: 13, marginTop: 6 }} data-testid="prof-goal-note">
        {next ? `Сегодня цель — ${mins} мин. Новая, ${next.minutes} мин, — с завтрашнего дня.` : `За выполненную цель — ${indexed(goalCoins(mins))} ${coinsWord(indexed(goalCoins(mins)))}: столько, сколько минут (с индексацией месяца). Новая цель начинает действовать с завтрашнего дня.`}
      </div>
      <Row label="Уровень заданий" value={LEVEL_NAME[level]} data-testid="prof-level" data-level={level} />
      <div className="ds-faint" style={{ fontSize: 13, marginTop: 4 }} data-testid="prof-level-note">{levelNote(learn)}</div>
      <div style={{ marginTop: 12 }}>
        <Button small variant="secondary" icon={GraduationCap} data-testid="prof-placement" data-nav-target="run:placement" onClick={() => { Audio.prime(); onPlacement(); }}>
          {(learn.placement || {}).at ? 'Вступительный тест ещё раз' : 'Вступительный тест'}
        </Button>
      </div>
    </Card>
  );
}

/* Приглашение на вступительный тест — на Пути, если при регистрации выбрано «Кое-что знаю». */
export function PlacementCard({ onStart, onSkip }) {
  return (
    <Card style={{ margin: '0 0 14px', background: 'color-mix(in srgb, var(--u) 7%, var(--ds-card))' }} data-testid="placement-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Rosette size={58} opacity={0.5}><GraduationCap size={26} color="var(--u-ink)" aria-hidden="true" /></Rosette>
        <div style={{ flex: 1 }}>
          <div className="ds-h3">Вступительный тест</div>
          <div className="ds-sub" style={{ fontSize: 14, lineHeight: 1.4 }}>Пять вопросов на юнит. Что знаете — откроется сразу, дальше Путь продолжится с нужного места.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Button small data-testid="placement-start" data-nav-target="run:placement" onClick={() => { Audio.prime(); onStart(); }}>Пройти тест</Button>
        <Button small variant="ghost" data-testid="placement-skip" onClick={onSkip}>Начать с начала</Button>
      </div>
    </Card>
  );
}
