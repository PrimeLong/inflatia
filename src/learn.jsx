/* ПУТЬ ПО ИНФЛАТИИ: главный экран учёбы — дорога по карте страны, юниты — места (Рынок,
   Мастерская, Банк…), уроки — остановки на дороге; пройденный юнит «оживляет» своё здание.
   Здесь же карточка урока (билет), урок во весь экран, итоги, практика, профиль с альбомом
   марок и учебник-справочник. Отдельный ленивый чанк вместе с учебником.

   Оформление — только дизайн-система: src/ds.jsx (кнопка-билет, карточка-документ, плашка
   ответа-штамп, заголовки, панели) и src/ds-art.jsx (гравюры, гильош, печати, марки, график
   прогресса, Инфля). Данные — src/learn/course.js, src/textbook/learn-state.js,
   src/learn/resume.js. Места юнитов и их цвета — src/ds-tokens.js (PLACES).

   Навигация: у каждого экрана один «назад» (data-nav="back"), переходы помечены
   data-nav-target — e2e проверяет, что на одном экране нет двух путей в одно место.
   Карта экранов — src/learn/screens.js. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  X, ArrowLeft, Flame, Coins, Target, Lock, Check, Gem, ChevronLeft, BookOpenText, BookOpen, Trophy, Timer, ChevronRight, RotateCcw, Sparkles, Dumbbell, Users, Languages, MessageCircle,
  Headphones, Gamepad2, Repeat, Flag, Landmark, MapPin, ArrowUp, ChevronDown, Wrench, Feather, ChartSpline, PenLine, WifiOff, Award, ArrowRight,
} from 'lucide-react';
import { unitStops, EXTRA_KIND } from './learn/stops.js';
import { PEOPLE_BY_ID, MET_XP } from './learn/people.js';
import { BookDock } from './learn-bookdock.jsx';
import { MusicDock } from './learn-musicdock.jsx';
// огонёк серии на итогах — общий с итогами особых уроков
import { preloadPhotos } from './learn/portraits.js';
import { STATS_CSS } from './learn-stats.jsx';
import { askSave, askLogin } from './lib/guest.js';
import { writeLearnLevel } from './lib/disclosure.js';
import { track, reportsMe } from './lib/client.js';
import { TRACK, rememberTeam } from './learn/track.js';
import { Audio, getPlayerId, syncProfile, SYNC_EVENT, syncState } from './MacroSimulator.jsx';
import { loadProgress, saveProgress, latestProgress, PROGRESS_EVENT, reviewQueue } from './textbook/progress.js';
import { applyDupeAudit, fineOf } from './learn/audit.js';
// курс — из лёгкого ядра: Путь рисуется по указателю курса, главы грузятся с уроком (src/learn/course-core.js)
import { UNITS, LESSONS, LEVELS, LEVEL_BY_ID, levelOf, LESSON_BY_ID, LESSON_KIND, practiceIds, PRACTICE_MAX, PRACTICE_PAD, pathState, LEVEL_REVIEW_SIZE, reachedLevel } from './learn/course-core.js';
import { abandonLesson, skipLesson, streak, goalToday, missedYesterday, applyFreezes, setPlacement, dayOf, markShown, shownWith, levelConfirmed, LEVEL_REVIEW_OK } from './textbook/learn-state.js';
import { courseLevel } from './learn/grade.js';
import { settle, questsFor, indexed, COIN, chestKey, hasClaim, outfitOf, chargePremiums, fixMonth, gainsNote, onCoinGuard, ownedRecordTracks } from './learn/rewards.js';
import { weakLessons, recommend, courseCtx, theoryNotice } from './learn/program.js';
import { REWARD_CSS, QuestsCard, MonthCard, TasksEntry, ChestSheet, MorningStreak, PlacementCard } from './learn-rewards.jsx';
import { getResume, takeExpiredResumes, resumeIds } from './learn/resume.js';
import { pendingMoments, baselineSeen, nextBatch } from './learn/celebrate.js';
import { Mascot, OutfitContext } from './mascot.jsx';
import { LeagueView } from './learn-league.jsx';
import { NOTIFY_CSS, useNotify, useToasts, useBrowserReminders, NotifyCenter, NotifyToast, BellButton } from './learn-notify.jsx';
import { HALLOWEEN_CSS, HalloweenCard, Pumpkin, Bat } from './learn-halloween.jsx';
import { halloweenOn } from './learn/halloween.js';
import { TEXTBOOK_CSS, PLAY_CSS, MODEL_CSS } from './learn-styles.js';
import { ModelThumb } from './learn-model-thumb.jsx';
import { hasModel, modelProgress, modelParts } from './learn/model.js';
import { ReportFlag, QuoteReport, ReportsView, REPORT_CSS, THEORY_REASONS } from './learn-report.jsx';
import { DsRoot, Button, IconButton, Card, MenuCard, Heading, Sheet, TopBar } from './ds.jsx';
import { useHistoryLayer } from './lib/route.js';
import { scheduleWarmup } from './lib/warmup.js';
import { ArtStyle, Guilloche, Rosette, Chest, Engraving, EngravingG, useReducedMotion, useWide, useMedia } from './ds-art.jsx';
import { placeOf, DIAMOND_COLOR, dsThemeId } from './ds-tokens.js';
import { countryPath, RIVER, curveTo } from './lib/mapgeo.js';
import { levelRegions, mapSlots } from './learn/levelmap.js';
import { featureOpen, FeatureLocked } from './learn-unlock.jsx';
import { GRAPH_EVENT, GRAPH_BY_ID, GRAPH_XP } from './learn/graphs.js';
import { DRAW_BY_ID, DRAW_XP } from './learn/draws.js';
import { READING_BY_ID, READ_XP } from './learn/reading.js';
import { BrandLoader } from './logo.jsx';
import { FRIENDS_CSS, FriendsPage, FriendProfile, RaceCard, racesToShow } from './learn-friends.jsx';
import { SKETCH_BOOK_QUERY } from './learn/sketch.js';
// черновик на полях учебника — своим файлом: нужен, только когда открыта глава, а не до появления Пути
const BookSketch = React.lazy(() => import('./learn-sketch.jsx').then((m) => ({ default: ({ mode }) => <><style>{m.SKETCH_CSS}</style><m.Sketch mode={mode} /></> })));
import { useFriends, pushCard } from './lib/friends-store.js';
import { buildCard } from './learn/friends.js';
import { plural } from './lib/plural.js';

export { SCREENS } from './learn/screens.js';

// раскладка экранов обучения; цвета, шрифты и компоненты — из дизайн-системы
export const CSS = `
  .ln-root { padding: 12px 16px 104px; }
  .ln-wrap { max-width: 560px; margin: 0 auto; }
  .ln-path-wide { max-width: 1120px; display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 28px; align-items: start; }
  .ln-path-side { position: sticky; top: 12px; max-height: calc(100vh - 110px); overflow: auto; padding-bottom: 8px; }
  .ln-stats { display: flex; gap: 6px; padding: 2px 0 12px; }
  .ln-stat { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 4px; border: 1px solid var(--ds-rule2); border-radius: 3px;
    background: var(--ds-card); font: 700 15px var(--ds-mono); white-space: nowrap; box-shadow: inset 0 0 0 2px var(--ds-card), inset 0 0 0 3px var(--ds-rule); }
  .ln-stat small { font: 12px var(--ds-sans); color: var(--ds-ink3); letter-spacing: .04em; }
  /* уровень знаний: медальон с числом и кольцом прогресса уровня курса, справа — уровень курса и точки уровней */
  .ln-grade { display: flex; align-items: center; gap: 14px; margin: -4px 0 14px; padding: 12px 16px 12px 12px; border-radius: 22px; border: 1px solid color-mix(in srgb, var(--u) 26%, var(--ds-rule));
    background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--u) 14%, var(--ds-card)), var(--ds-card) 62%); box-shadow: 0 14px 30px -24px color-mix(in srgb, var(--u) 70%, #000), 0 2px 0 color-mix(in srgb, var(--u) 18%, var(--ds-rule)); }
  .ln-know { position: relative; flex: none; width: 76px; height: 76px; display: grid; place-items: center; }
  .ln-know svg { position: absolute; inset: 0; }
  .ln-know-ring { transition: stroke-dasharray .9s cubic-bezier(.2, .9, .3, 1); }
  .ln-know b { position: relative; font: 800 30px/1 var(--ds-head); font-variant-numeric: tabular-nums; color: var(--u-ink); letter-spacing: -.02em; }
  .ds-dark .ln-know b { color: color-mix(in srgb, var(--u) 45%, #fff); }
  .ln-know::before { content: ''; position: absolute; inset: 11px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, var(--ds-card), color-mix(in srgb, var(--u) 10%, var(--ds-card)));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--u) 20%, transparent); }
  .ln-know.up { animation: ln-know-hop .7s cubic-bezier(.3, 1.6, .5, 1) .25s backwards; }
  @keyframes ln-know-hop { 0% { transform: scale(.85) } 60% { transform: scale(1.08) } 100% { transform: none } }
  .ln-know-plus { position: absolute; right: -6px; top: -4px; font: 800 13px/1 var(--ds-sans); font-style: normal; color: #fff; background: var(--ds-ok, #2E7D32); padding: 4px 7px; border-radius: 999px;
    box-shadow: 0 4px 10px -4px rgba(0,0,0,.4); animation: ln-know-plus 2.6s ease-out .4s both; }
  @keyframes ln-know-plus { 0% { opacity: 0; transform: translateY(8px) scale(.6) } 15% { opacity: 1; transform: translateY(0) scale(1.1) } 25% { transform: none } 80% { opacity: 1 } 100% { opacity: 0; transform: translateY(-10px) } }
  .ln-grade-word { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .ln-grade-word b { font: 700 17px/1.2 var(--ds-head); }
  .ln-grade-word small { font: 13.5px/1.35 var(--ds-sans); color: var(--ds-ink2); }
  .ln-know-steps { display: flex; gap: 5px; margin-top: 5px; }
  .ln-know-steps i { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 700 12px/1 var(--ds-mono); font-style: normal; color: var(--ds-ink3);
    background: var(--ds-card2); box-shadow: inset 0 0 0 1px var(--ds-rule2); }
  .ln-know-steps i.past { color: #fff; background: color-mix(in srgb, var(--u) 70%, var(--ds-card)); box-shadow: none; }
  .ln-know-steps i.on { color: var(--u-ink); background: color-mix(in srgb, var(--u) 16%, var(--ds-card)); box-shadow: inset 0 0 0 2px var(--u); }
  .ds-dark .ln-know-steps i.on { color: color-mix(in srgb, var(--u) 45%, #fff); }
  /* телефон: карточка ниже — карта Пути не уезжает под нижнюю панель */
  @media (max-width: 560px) {
    .ln-grade { padding: 10px 12px 10px 10px; gap: 12px; margin-bottom: 12px; }
    .ln-grade-word b { font-size: 16px; }
  }
  @media (prefers-reduced-motion: reduce) { .ln-know.up, .ln-know-plus { animation: none; } .ln-know-plus { display: none; } .ln-know-ring { transition: none; } }
  .ln-streak.on { background: color-mix(in srgb, var(--ds-bad) 12%, var(--ds-card)); border-color: color-mix(in srgb, var(--ds-bad) 55%, var(--ds-rule2)); color: var(--ds-bad); }
  .ln-streak.on small { color: inherit; }
  .ln-streak.wait { border-style: dashed; color: var(--ds-ink3); }
  .ln-flame-wrap { position: relative; display: inline-flex; }
  .ln-flame-ok { position: absolute; right: -5px; bottom: -3px; width: 12px; height: 12px; border-radius: 50%; background: var(--ds-ok); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
  /* серия на итогах — без надписи: огонёк вспыхивает, разлетаются искры, счётчик дней перещёлкивается */
  .ln-burst { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 0 0 14px; color: var(--ds-bad); }
  .ln-burst-flame { position: relative; display: inline-flex; transform-origin: 50% 90%; animation: ln-ignite .8s cubic-bezier(.2, 1.5, .4, 1) both, ln-flicker 1.3s ease-in-out .8s 2; }
  .ln-burst-flame::before { content: ''; position: absolute; inset: -14px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--ds-bad) 35%, transparent), transparent 70%); animation: ln-glow 1.6s ease-out .2s both; }
  .ln-burst-flame svg { position: relative; }
  .ln-burst-flame i { position: absolute; left: 50%; top: 45%; width: 6px; height: 6px; margin: -3px; border-radius: 50%; background: var(--ds-bad); opacity: 0; animation: ln-spark .9s ease-out .45s both; }
  .ln-burst-num { position: relative; display: inline-block; height: 40px; min-width: 1.2ch; overflow: hidden; font: 800 36px/40px var(--ds-sans); font-variant-numeric: tabular-nums; }
  .ln-burst-num > span { display: block; }
  .ln-burst-num .old { position: absolute; left: 0; right: 0; animation: ln-num-out .45s ease-in .55s both; }
  .ln-burst-num .new { animation: ln-num-in .5s cubic-bezier(.2, 1.4, .4, 1) .7s both; }
  .ln-burst-cap { display: block; font: 700 13.5px var(--ds-sans); color: var(--ds-ink2); }
  @keyframes ln-ignite { 0% { transform: scale(.2) translateY(12px); opacity: 0; filter: grayscale(1) } 60% { transform: scale(1.25); opacity: 1; filter: none } 100% { transform: scale(1) } }
  @keyframes ln-flicker { 0%, 100% { transform: scale(1) rotate(0) } 30% { transform: scale(1.06, .95) rotate(-3deg) } 65% { transform: scale(.97, 1.05) rotate(2deg) } }
  @keyframes ln-glow { 0% { opacity: 0; transform: scale(.4) } 40% { opacity: 1; transform: scale(1.1) } 100% { opacity: .35; transform: scale(1) } }
  @keyframes ln-spark { 0% { opacity: 1; transform: rotate(var(--a)) translateY(0) scale(1) } 100% { opacity: 0; transform: rotate(var(--a)) translateY(-36px) scale(.3) } }
  @keyframes ln-num-out { to { transform: translateY(-100%); opacity: 0 } }
  @keyframes ln-num-in { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { .ln-burst-flame, .ln-burst-flame::before, .ln-burst-num .new { animation: none; } .ln-burst-flame i, .ln-burst-num .old { display: none; } }
  .ln-atlas { position: relative; padding: 10px 10px 8px; margin: 4px 0 18px; }
  .ln-atlas svg text { font-family: var(--ds-head); }
  /* области уровней: мягкая заливка цветом уровня, выбранный уровень — ярче; граница — пунктир */
  .ln-lvl { fill: color-mix(in srgb, var(--lv) 13%, var(--ds-paper)); stroke: color-mix(in srgb, var(--lv) 13%, var(--ds-paper)); stroke-width: 1; transition: fill .4s; }
  .ln-lvl[data-current="true"] { fill: color-mix(in srgb, var(--lv) 24%, var(--ds-paper)); stroke: color-mix(in srgb, var(--lv) 24%, var(--ds-paper)); }
  .ln-lvl-border { stroke: var(--ds-paper); stroke-width: 5; stroke-linecap: round; }
  .ln-lvl-badge circle { fill: var(--ds-card); stroke: color-mix(in srgb, var(--lv) 60%, var(--ds-card)); stroke-width: 3; }
  .ln-lvl-badge text { font: 700 21px var(--ds-head); fill: color-mix(in srgb, var(--lv) 75%, var(--ds-ink)); }
  .ln-lvl-badge[data-current="true"] circle { fill: var(--lv); stroke: var(--ds-card); }
  .ln-lvl-badge[data-current="true"] text { fill: #fff; }
  .ds-dark .ln-lvl-badge text { fill: color-mix(in srgb, var(--lv) 40%, #fff); }
  .ln-lvl-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 8px 4px 2px; font: 600 13px var(--ds-sans); color: var(--ds-ink2); }
  .ln-lvl-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .ln-lvl-legend b { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font: 700 12px var(--ds-head); color: color-mix(in srgb, var(--lv) 75%, var(--ds-ink));
    background: color-mix(in srgb, var(--lv) 16%, var(--ds-card)); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lv) 55%, var(--ds-card)); }
  .ln-lvl-legend [data-current="true"] { color: var(--ds-ink); }
  .ln-lvl-legend [data-current="true"] b { background: var(--lv); color: #fff; box-shadow: none; }
  .ds-dark .ln-lvl-legend b { color: color-mix(in srgb, var(--lv) 40%, #fff); }
  .ds-dark .ln-lvl-legend [data-current="true"] b { color: #fff; }
  .ln-bill { position: relative; overflow: hidden; padding: 0; margin: 20px 0 6px; background: color-mix(in srgb, var(--u) 7%, var(--ds-card)); }
  .ln-bill-in { display: flex; align-items: center; gap: 12px; padding: 12px 14px 10px; }
  .ln-bill-no { font: 700 30px/1 var(--ds-head); color: var(--u-ink); }
  .ln-bill-btns { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 12px; }
  /* пройденный юнит свёрнут в одну строку — билет с корешком: слева гравюра места с печатью «пройден»,
     за перфорацией — «Юнит N · пройден», место, полоска уроков (алмазные — цветом алмаза) и стрелка;
     вся середина раскрывает уроки, справа — гайд */
  .ds-card.ln-bill-mini { position: relative; display: flex; align-items: stretch; gap: 0; padding: 0; min-height: 70px; margin: 10px 0 4px; overflow: hidden;
    background: color-mix(in srgb, var(--u) 6%, var(--ds-card)); border-color: color-mix(in srgb, var(--u) 22%, var(--ds-rule)); }
  .ln-mini-stub { position: relative; flex: none; width: 70px; display: grid; place-items: center; background: color-mix(in srgb, var(--u) 13%, var(--ds-card));
    border-right: 2px dashed color-mix(in srgb, var(--u) 30%, var(--ds-rule2)); }
  .ln-mini-stub::before, .ln-mini-stub::after { content: ''; position: absolute; right: -8px; width: 14px; height: 14px; border-radius: 50%; background: var(--ds-paper);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--u) 22%, var(--ds-rule)); }
  .ln-mini-stub::before { top: -9px; } .ln-mini-stub::after { bottom: -9px; }
  .ln-mini-seal { position: absolute; right: 7px; bottom: 6px; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; color: #fff;
    background: var(--ds-ok, #2E7D5B); box-shadow: 0 0 0 2px color-mix(in srgb, var(--u) 13%, var(--ds-card)); transform: rotate(-8deg); }
  .ln-mini-main { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto auto; column-gap: 8px; align-items: center;
    padding: 8px 6px 8px 14px; border: none; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; transition: background .2s; }
  .ln-mini-main:hover { background: color-mix(in srgb, var(--u) 7%, transparent); }
  .ln-mini-main:focus-visible { outline: 3px solid var(--u); outline-offset: -3px; border-radius: 12px; }
  .ln-mini-eyebrow { grid-column: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font: 700 12px/1.1 var(--ds-sans); letter-spacing: .1em; text-transform: uppercase; color: var(--u-ink); }
  .ds-dark .ln-mini-eyebrow { color: color-mix(in srgb, var(--u) 45%, #fff); }
  .ln-mini-title { grid-column: 1; margin: 1px 0 3px; line-height: 1.15; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ln-mini-meta { grid-column: 1; display: flex; align-items: center; gap: 8px; min-width: 0; font: 600 12.5px/1 var(--ds-sans); color: var(--ds-ink2); white-space: nowrap; }
  .ln-mini-strip { display: flex; gap: 2px; flex: 0 1 112px; min-width: 40px; }
  .ln-mini-strip i { flex: 1; height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--u) 55%, var(--ds-card)); }
  .ln-mini-strip i[data-d] { background: ${DIAMOND_COLOR}; }
  .ln-mini-open { grid-column: 2; grid-row: 1 / 4; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--u-ink);
    background: color-mix(in srgb, var(--u) 12%, var(--ds-card)); transition: transform .3s cubic-bezier(.3, 1.5, .5, 1), background .2s; }
  .ds-dark .ln-mini-open { color: color-mix(in srgb, var(--u) 45%, #fff); }
  .ln-mini-main:hover .ln-mini-open { transform: translateY(2px); background: color-mix(in srgb, var(--u) 20%, var(--ds-card)); }
  .ln-bill-mini .ln-mini-guide { width: 44px; height: auto; align-self: stretch; border-radius: 0; border-left: 1px dotted var(--ds-rule2); }
  /* юнит только что свернулся после сундука: строка «впечатывается», по ней пробегает блик */
  .ln-just-folded .ln-bill-mini { position: relative; overflow: hidden; animation: ln-mini-in .55s cubic-bezier(.3,1.4,.5,1) both; }
  .ln-just-folded .ln-bill-mini::after { content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--ds-gold-soft) 55%, transparent) 48%, transparent 66%) no-repeat; background-size: 250% 100%;
    animation: ln-sheen 1.3s ease-out .25s both; }
  @keyframes ln-mini-in { 0% { transform: scale(1.06); opacity: 0 } 100% { transform: none; opacity: 1 } }
  @keyframes ln-sheen { from { background-position: 130% 0 } to { background-position: -40% 0 } }
  .ln-unit-body { overflow-anchor: none; transform-origin: 50% 0; }
  /* смена вкладки: экран мягко проявляется */
  /* только прозрачность: сдвиг (transform) сделал бы вкладку рамкой для fixed-слоёв внутри — шторки и
     страницы поверх профиля встали бы не по экрану, а по вкладке */
  .ln-tab { animation: ln-tab-in .3s ease-out; }
  @keyframes ln-tab-in { from { opacity: 0 } to { opacity: 1 } }
  /* плашка уровня наверху Пути: стрелки к соседним уровням, касание — список уровней */
  .ln-switch { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 6px; margin: 4px -4px 8px; padding: 6px 4px;
    background: color-mix(in srgb, var(--ds-paper) 92%, transparent); backdrop-filter: blur(6px); }
  .ln-switch-arrow { width: 40px; height: 40px; flex-shrink: 0; color: var(--u-ink); }
  .ln-switch-arrow:disabled { opacity: .3; cursor: default; }
  .ln-switch-plate { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 7px 12px 7px 8px; border-radius: 16px; cursor: pointer; text-align: left; font: inherit; color: var(--ds-ink);
    background: color-mix(in srgb, var(--u) 9%, var(--ds-card)); border: 2px solid color-mix(in srgb, var(--u) 40%, var(--ds-rule2)); box-shadow: 0 4px 0 color-mix(in srgb, var(--u) 35%, var(--ds-rule2)); margin-bottom: 4px; }
  .ln-switch-plate:active { transform: translateY(3px); box-shadow: 0 1px 0 color-mix(in srgb, var(--u) 35%, var(--ds-rule2)); }
  .ln-switch-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ln-switch-place { font: 700 18px/1.2 var(--ds-head); color: var(--u-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ln-switch-count { font: 600 12.5px/1 var(--ds-sans); color: var(--ds-ink2); margin-left: 4px; }
  .ln-unit-no { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font: 700 17px/1 var(--ds-head);
    color: #fff; background: var(--u); border: none; box-shadow: 0 3px 0 color-mix(in srgb, var(--u) 68%, #000); }
  .ln-pick { display: flex; flex-direction: column; gap: 6px; max-height: min(58vh, 520px); overflow-y: auto; margin: 0 -4px; padding: 2px 4px; }
  .ln-pick-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 14px; text-align: left; font: inherit; color: var(--ds-ink);
    background: color-mix(in srgb, var(--u) 6%, var(--ds-card)); border: 2px solid var(--ds-rule2); }
  button.ln-pick-row { cursor: pointer; }
  .ln-pick-row[aria-current="true"] { border-color: var(--u-ink); box-shadow: inset 0 0 0 1px var(--u-ink); }
  .ln-pick-row[data-state="locked"] { background: var(--ds-card); }
  .ln-pick-row[data-state="locked"] .ln-unit-no { color: var(--ds-ink3); background: var(--ds-card2); box-shadow: inset 0 0 0 2px var(--ds-rule2); }
  .ln-pick-txt { flex: 1; min-width: 0; }
  .ln-pick-title { font: 700 16px/1.25 var(--ds-head); }
  .ln-pick-sub { font-size: 13px; color: var(--ds-ink2); line-height: 1.3; }
  /* живая модель на телефоне — свёрнутой строкой; касание раскрывает */
  .ln-fold-row { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; padding: 10px 12px; text-align: left; cursor: pointer; color: var(--ds-ink); font: inherit; }
  /* знакомство с живой моделью: карточка «Новое» с цветной кромкой и мягким появлением */
  .ln-model-intro { border-color: color-mix(in srgb, var(--u) 45%, var(--ds-rule)); background: color-mix(in srgb, var(--u) 6%, var(--ds-card)); animation: ln-intro-in .5s cubic-bezier(.2, .9, .3, 1.2) backwards; }
  @keyframes ln-intro-in { from { opacity: 0; transform: translateY(10px) scale(.98) } }
  .ln-model-intro-top { display: flex; align-items: center; gap: 12px; }
  .ln-model-intro-thumb { flex: none; display: grid; place-items: center; border-radius: 12px; background: var(--ds-card); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--u) 25%, var(--ds-rule)); padding: 4px; }
  .ln-new-pill { display: inline-block; padding: 2px 7px; margin-right: 4px; border-radius: 999px; background: var(--u); color: #fff; letter-spacing: .06em; }
  @media (prefers-reduced-motion: reduce) { .ln-model-intro { animation: none; } }
  .ln-fold-row .lm-pips { margin-right: 4px; }
  /* «К карте»: появляется, когда карта уехала за верх экрана */
  .ln-to-map { position: fixed; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); transition: bottom .25s ease; z-index: 30; width: 46px; height: 46px; display: inline-flex; align-items: center; justify-content: center;
    padding: 0; border-radius: 50%; border: 2px solid var(--ds-rule); background: var(--ds-card); color: var(--u-ink); box-shadow: 0 3px 0 var(--ds-rule2), 0 6px 16px var(--ds-shade); cursor: pointer; }
  @media (min-width: 1024px) { .ln-to-map { right: max(16px, calc(50vw - 560px)); } }
  /* над вкладками звучит книга — кнопка поднимается над её мини-проигрывателем */
  html[data-book-dock] .ln-to-map { bottom: calc(160px + env(safe-area-inset-bottom)); }
  .ln-route { position: relative; margin: 0 auto; }
  /* телефон уже 340 px (320 px — старые и маленькие): дорога чуть мельче, чтобы не вылезать за экран */
  @media (max-width: 340px) { .ln-route { zoom: .9; } }
  .ln-route > svg { position: absolute; inset: 0; pointer-events: none; }
  /* остановка — жетон в точке дороги; подпись — сбоку, на высоте жетона (docs/mechanics.md, «Навигация»):
     там дорога проходит внутри круга, и подпись её не задевает */
  .ln-stop { position: absolute; width: 62px; margin-left: -31px; display: flex; flex-direction: column; align-items: center; }
  .ln-stop.ln-stop-chest { width: 170px; margin-left: -85px; gap: 4px; }
  /* остановка Пути — объёмная монета: снизу кромка темнее, нажатие опускает её */
  .ln-token { position: relative; width: 62px; height: 62px; border-radius: 50%; border: 3px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink2); cursor: pointer;
    display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 0 var(--ds-rule2); margin-bottom: 5px; transition: transform .08s, box-shadow .08s; }
  /* наведение — подсветка без движения (пункт владельца 24.11, п. 9: «можно наводиться на задание, и анимация будет
     проигрываться постоянно и неестественно»): покачивание значка запускалось заново при каждом входе курсора, а у края
     остановки — снова и снова. Теперь значок не двигается, остановка мягко светлеет и получает кольцо */
  .ln-token:not(.locked) { transition: transform .08s, box-shadow .08s, filter .18s ease, outline-color .18s ease; outline: 3px solid transparent; outline-offset: 3px; }
  .ln-token:not(.locked):hover { filter: brightness(1.05); outline-color: color-mix(in srgb, var(--u, var(--ds-accent)) 28%, transparent); }
  .ln-token:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--ds-rule2); }
  .ln-token.done { background: var(--u); color: #fff; border-color: color-mix(in srgb, var(--u) 82%, #fff); box-shadow: 0 5px 0 color-mix(in srgb, var(--u) 68%, #000); }
  .ln-token.done:active { box-shadow: 0 1px 0 color-mix(in srgb, var(--u) 68%, #000); }
  .ln-token.locked { border-style: dashed; color: var(--ds-ink3); box-shadow: none; background: var(--ds-card2); }
  /* пропущенный «Слушай»: открыт, но не пройден — пунктир цвета юнита */
  .ln-token.skipped { border-style: dashed; border-color: color-mix(in srgb, var(--u) 60%, var(--ds-rule2)); color: var(--u-ink); }
  .ln-token.cur { border-color: var(--u); border-width: 3px; color: var(--u-ink); box-shadow: 0 5px 0 color-mix(in srgb, var(--u) 45%, var(--ds-rule2)); }
  .ln-token.cur::after { content: ''; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--u) 55%, transparent); animation: ds-ring 1.8s ease-out infinite; pointer-events: none; }
  /* пройдено — золотая отметка (не красная: красный читается как ошибка) */
  .ln-seal { position: absolute; right: -5px; bottom: -5px; width: 25px; height: 25px; border-radius: 50%; background: var(--ds-gold-soft); color: #3A2600; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 2.5px var(--ds-paper); transform: rotate(-12deg); }
  /* урок, взятый на алмазном уровне: гранёный камень вместо цвета юнита */
  .ln-token.diamond { background: linear-gradient(135deg, #FFC2D2 0%, #E5527B 45%, #B3123F 62%, #7A0C2B 100%); border-color: #FFD6E1;
    box-shadow: 0 5px 0 #7A0C2B, 0 6px 14px rgba(179,18,63,.35); }
  .ln-seal.diamond { background: #B3123F; color: #fff; }
  .ln-pin { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); white-space: nowrap; font: 700 12px/1 var(--ds-sans); letter-spacing: .08em; text-transform: uppercase;
    color: #fff; background: var(--u); padding: 6px 10px 5px; border-radius: 10px; box-shadow: 0 2px 0 color-mix(in srgb, var(--u) 68%, #000); }
  .ln-pin.rec { background: var(--ds-gold); color: var(--ds-card); animation: ln-bob 2.8s ease-in-out infinite; }
  @keyframes ln-bob { 0%, 100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(-3px) } }
  /* счётчики наверху Пути: изменилось число — оно коротко подпрыгивает */
  .ln-bump { display: inline-block; animation: ln-bump .45s cubic-bezier(.3,1.6,.5,1); }
  @keyframes ln-bump { 0% { transform: scale(1) } 35% { transform: scale(1.3); color: var(--u-ink) } 100% { transform: scale(1) } }
  .ln-stat { transition: border-color .2s, background-color .2s; }
  .ln-pin.rec::after { border-top-color: var(--ds-gold); }
  .ln-chest { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; color: inherit; cursor: pointer; font: 700 13.5px/1.25 var(--ds-head); }
  .ln-chest-art { display: inline-flex; filter: drop-shadow(0 2px 2px var(--ds-shade)); transition: transform .15s; }
  .ln-chest:hover .ln-chest-art { transform: translateY(-2px) rotate(-2deg); }
  .ln-chest[data-opened="false"] .ln-chest-art { animation: ln-chest-wiggle 2.8s ease-in-out infinite; }
  @keyframes ln-chest-wiggle { 0%, 82%, 100% { transform: none; } 86% { transform: rotate(-5deg); } 90% { transform: rotate(4deg); } 94% { transform: rotate(-2deg); } }
  @media (prefers-reduced-motion: reduce) { .ln-chest[data-opened="false"] .ln-chest-art { animation: none; } }
  .ln-pin::after { content: ''; position: absolute; left: 50%; bottom: -5px; margin-left: -5px; border: 5px solid transparent; border-bottom: 0; border-top-color: var(--u); }
  .ln-stop-title { position: absolute; top: 31px; transform: translateY(-50%); width: max-content; max-width: var(--tw, 150px); background: none; border: none; padding: 2px 4px;
    font: 700 13.5px/1.25 var(--ds-head); cursor: pointer; color: var(--ds-ink); }
  .ln-stop-title.side-l { right: calc(100% + 8px); text-align: right; }
  .ln-stop-title.side-r { left: calc(100% + 8px); text-align: left; }
  /* особые уроки дороги: «Персоналии» — портретная рамка цвета чернил, «Чтение» — пергамент, «Работа над
     ошибками» — красная, с меткой «сначала ошибки»; квадратные со скруглением — видно, что это не урок юнита */
  .ln-token.ln-extra { border-radius: 22px; --x: #3E6FA8; border-color: color-mix(in srgb, var(--x) 55%, var(--ds-rule2)); color: var(--x);
    background: color-mix(in srgb, var(--x) 9%, var(--ds-card)); box-shadow: 0 5px 0 color-mix(in srgb, var(--x) 35%, var(--ds-rule2)); }
  .ln-token.ln-extra.read { --x: #8A5A2B; }
  .ln-token.ln-extra.graph { --x: #2459A6; }
  .ln-token.ln-extra.draw { --x: #0E7A72; }
  .ln-graph-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
    border: 1.5px solid color-mix(in srgb, #2459A6 45%, var(--ds-rule2)); background: color-mix(in srgb, #2459A6 8%, var(--ds-card)); color: var(--ds-ink);
    font: 700 14px var(--ds-sans); transition: transform .15s, background .2s; }
  .ln-graph-btn:hover { background: color-mix(in srgb, #2459A6 14%, var(--ds-card)); }
  .ln-graph-btn svg { color: #2459A6; }
  .ds-dark .ln-graph-btn svg { color: #8DB6F2; }
  .ln-token.ln-extra.fix { --x: var(--ds-bad); border-width: 3px; }
  .ln-token.ln-extra.fix::after { content: ''; position: absolute; inset: -9px; border-radius: 26px; border: 3px solid color-mix(in srgb, var(--ds-bad) 55%, transparent); animation: ds-ring 1.8s ease-out infinite; pointer-events: none; }
  .ds-dark .ln-token.ln-extra { color: color-mix(in srgb, var(--x) 55%, #fff); }
  .ln-token.ln-extra.done { background: var(--x); color: #fff; border-color: color-mix(in srgb, var(--x) 80%, #fff); box-shadow: 0 5px 0 color-mix(in srgb, var(--x) 65%, #000); }
  /* особый урок на алмаз — тот же гранёный камень и обводка, что у урока на алмазном уровне (пункт владельца 09.11) */
  .ln-token.ln-extra.diamond { background: linear-gradient(135deg, #FFC2D2 0%, #E5527B 45%, #B3123F 62%, #7A0C2B 100%); border-color: #FFD6E1; color: #fff;
    box-shadow: 0 5px 0 #7A0C2B, 0 6px 14px rgba(179,18,63,.35); }
  .ln-token.ln-extra.locked { border-style: dashed; color: var(--ds-ink3); background: var(--ds-card2); box-shadow: none; }
  .ln-token.ln-extra:not(.locked):hover { filter: brightness(1.04); }
  .ds .nw { white-space: nowrap; }
  .ln-ticket-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; font-size: 14px; }
  .ln-ticket-meta > span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
  .ln-extra-title small { display: block; font: 700 12px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink2); margin-bottom: 1px; }
  .ln-fix-count { position: absolute; top: -8px; right: -8px; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px; display: grid; place-items: center;
    background: var(--ds-bad-btn, var(--ds-bad)); color: #fff; font: 700 13px var(--ds-mono); box-shadow: 0 0 0 3px var(--ds-paper); }
  .ln-extra-title.fix small, .ln-token.fix + .ln-extra-title small { color: var(--ds-bad-ink, var(--ds-bad)); }
  @media (prefers-reduced-motion: reduce) { .ln-token.ln-extra.fix::after { animation: none; } }
  .ln-stop-title.locked { color: var(--ds-ink3); }
  .ln-skip-tag { font: 700 12px var(--ds-sans); color: var(--ds-ink2); }
  .ln-overlay { position: fixed; inset: 0; z-index: 300; display: flex; flex-direction: column; }
  /* «предыдущая карточка» — слой под шапкой урока: своё тело с прокруткой и «Вернуться» внизу */
  /* прошлая карточка — на фоне самого урока (тема из лавки, украшения, черновик): слой прозрачный, а текущая карточка
     с нижней панелью на это время прячется — ответ, ход и прокрутка целы (раньше слой цвета бумаги в теме урока был чёрным прямоугольником) */
  .ln-peek { position: absolute; left: 0; right: 0; bottom: 0; z-index: 7; display: flex; flex-direction: column; background: transparent; animation: ln-peek-in .28s cubic-bezier(.2, .9, .3, 1); }
  .ln-overlay[data-peek] > .ln-body, .ln-overlay[data-peek] > .ln-foot { visibility: hidden; }
  @keyframes ln-peek-in { from { opacity: 0; transform: translateX(-18px) } }
  .ln-peek-verdict { margin-top: 12px; padding: 10px 12px; border-radius: 12px; font-size: 15.5px; line-height: 1.45; border-left: 4px solid var(--ds-ok); background: var(--ds-ok-bg); color: var(--ds-ok-ink); }
  .ln-peek-verdict.bad { border-left-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 10%, var(--ds-card)); color: var(--ds-ink); }
  @media (prefers-reduced-motion: reduce) { .ln-peek { animation: none; } }
  .ln-head .ln-music { flex: none; width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; padding: 0 !important; border-radius: 50% !important; border: 1px solid var(--ds-rule2) !important; background: transparent !important; box-shadow: none !important; color: var(--ds-ink2); cursor: pointer; }
  .ln-head .ln-music:hover { color: var(--ds-ink); border-color: var(--ds-ink2) !important; }
  .ln-head { display: flex; align-items: center; gap: 10px; padding: calc(10px + env(safe-area-inset-top)) 14px 4px; max-width: 592px; width: 100%; margin: 0 auto; }
  /* молния с числом — верные ответы подряд, бессрочная серия (огонёк — только серия дней) */
  .ln-fire { position: relative; flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px; height: 28px; padding: 0 10px 0 7px; border-radius: 999px;
    background: linear-gradient(135deg, #FFB547, #FF6A3D); color: #fff; font: 800 14px var(--ds-head); box-shadow: 0 3px 0 #C2410C, 0 8px 16px -8px rgba(255, 106, 61, .8);
    animation: ln-fire-in .45s cubic-bezier(.3, 1.6, .5, 1) both; }
  .ln-fire b { display: inline-block; min-width: 1ch; text-align: center; animation: ln-fire-bump .35s cubic-bezier(.3, 1.8, .5, 1); }
  /* молния покачивается медленно и мягко — раньше дёргалась и раздувалась раз в 1,2 с (жалоба «качается быстро и странно») */
  .ln-fire-ic { animation: ln-fire-sway 3.2s ease-in-out infinite; transform-origin: 50% 85%; }
  .ln-fire.big { animation: ln-fire-big .6s cubic-bezier(.3, 1.6, .5, 1); }
  .ln-fire.out { background: linear-gradient(135deg, #B9B2A6, #8E877C); box-shadow: 0 3px 0 #6F695F; animation: ln-fire-out .9s ease-in forwards; }
  .ln-fire.out .ln-fire-ic { animation: none; }
  .ln-fire-plus { position: absolute; right: -6px; top: -4px; font: 800 12px var(--ds-head); color: #E8701E; text-shadow: 0 1px 0 var(--ds-paper); pointer-events: none; animation: ln-plus .9s ease-out forwards; }
  .ln-fire-sparks i { position: absolute; left: 50%; top: 50%; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%; background: #FFC24B; pointer-events: none; animation: ln-spark .7s ease-out forwards; }
  @keyframes ln-fire-in { from { transform: scale(.3); opacity: 0 } }
  @keyframes ln-fire-bump { 0% { transform: scale(1.7) } 100% { transform: scale(1) } }
  @keyframes ln-flicker { 0%, 100% { transform: scale(1) rotate(-4deg) } 50% { transform: scale(1.14) rotate(5deg) } }
  @keyframes ln-fire-sway { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
  @keyframes ln-fire-big { 0% { transform: scale(1) } 40% { transform: scale(1.3) } 100% { transform: scale(1) } }
  @keyframes ln-fire-out { 0% { transform: none; opacity: 1 } 30% { transform: rotate(-7deg) } 60% { transform: rotate(5deg); opacity: .8 } 100% { transform: scale(.6); opacity: 0 } }
  @keyframes ln-plus { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-22px); opacity: 0 } }
  @keyframes ln-spark { from { transform: rotate(var(--a)) translateX(4px); opacity: 1 } to { transform: rotate(var(--a)) translateX(28px); opacity: 0 } }
  .ln-xp-bonus { display: inline-flex; align-items: center; gap: 2px; margin-top: 3px; padding: 1px 7px 1px 5px; border-radius: 999px; font: 700 13px/1.4 var(--ds-sans); color: #C2490B; background: color-mix(in srgb, #C2490B 10%, transparent); white-space: nowrap; }
  .ln-xp-note { display: flex; align-items: center; justify-content: center; gap: 5px; margin: 8px 0 0; font: 600 13.5px/1.35 var(--ds-sans); color: #C2490B; text-align: center; }
  .ds.ds-dark .ln-xp-bonus, .ds.ds-dark .ln-xp-note { color: #FFB27A; }
  @media (prefers-reduced-motion: reduce) { .ln-fire, .ln-fire b, .ln-fire-ic, .ln-fire-plus, .ln-fire-sparks i { animation: none !important; } .ln-fire-plus, .ln-fire-sparks { display: none; } }
  /* прокрутка урока — только по вертикали и только когда содержимое правда длиннее экрана:
     встряска после ошибки и свайп карточки двигают его вбок (без overflow-x: hidden из-за
     overflow-y: auto появлялся горизонтальный ползунок), а появление шага — не сдвигом вниз
     (сдвиг на 14 px на миг давал вертикальный), а проявлением */
  /* «Газета»: подпись слева переносится, три кнопки справа — всегда в одну строку (жалоба mv79vr3e: съезжали на 360 px) */
  .ln-news-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 6px 0; padding: 6px 0; border-bottom: 1px dashed var(--ds-rule2); }
  .ln-news-row:last-child { border-bottom: none; }
  .ln-news-label { flex: 1; min-width: 0; font-size: 15px; line-height: 1.35; }
  .ln-news-btns { display: flex; gap: 6px; flex-shrink: 0; }
  .ln-news-btns .ds-chip { margin: 0; min-width: 46px; padding: 8px 0; }
  .ln-hard-note { display: flex; align-items: center; justify-content: space-between; gap: 6px 12px; flex-wrap: wrap; margin-top: 6px; font-size: 13.5px; }
  .ln-hard-note .ln-how { margin-top: 0; }
  .ln-calc-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 12px; margin: 8px 0 10px; }
  .ln-numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 320px; margin: 0 auto; }
  @media (max-width: 600px) { .ln-numpad .ds-key { padding: 10px 0; } }
  .ln-skip { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 6px; padding: 9px 8px; background: none; border: none; cursor: pointer; font: 700 14.5px var(--ds-sans); color: var(--ds-ink2); }
  .ln-skip:hover { color: var(--u-ink); }
  .ln-desk { max-width: 592px; width: 100%; margin: 0 auto; padding: 0 14px; flex: none; }
  .ln-body { flex: 1; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 14px 16px 24px; }
  /* под полосой украшения урока (гирлянда, мобиле) задание уезжает при прокрутке не по резкой линии, а растворяется: у верха
     прокрутки — мягкий переход на высоту верхнего отступа, на месте всё видно целиком (жалоба 19.11, hh-g: «мотнул чуть
     вниз — украшение резко обрывает плашку „Как играть“») */
  .ln-overlay:has(> .ln-desk) .ln-body { -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px); mask-image: linear-gradient(to bottom, transparent 0, #000 14px); }
  .ln-body .ds-rise { animation-name: ln-appear; }
  @keyframes ln-appear { from { opacity: 0; } to { opacity: 1; } }
  .ln-inner { max-width: 560px; margin: 0 auto; }
  .ln-foot { border-top: 2px solid var(--ds-rule); padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); background: var(--ds-paper); }
  .ln-foot.fb { padding: 0; border-top: none; }
  /* задание в формате экзамена: метка, номера пунктов, бланк ответа клетками */
  .ln-exam-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12.5px; }
  .ln-exam-tag { font: 800 12px/1 var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--ds-paper); background: var(--u-ink); padding: 5px 8px 4px; border-radius: 6px; }
  .ln-exam .ln-exam-opt { display: flex; gap: 10px; align-items: flex-start; }
  .ln-exam-no { flex: none; width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--ds-rule2); display: inline-flex; align-items: center; justify-content: center; font: 700 13px var(--ds-sans); color: var(--ds-ink2); margin-top: 1px; }
  .ln-exam .ln-exam-opt[aria-pressed="true"] .ln-exam-no { background: var(--u-ink); border-color: var(--u-ink); color: var(--ds-paper); }
  .ln-exam-bins { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 4px 0 8px; font-size: 14px; }
  .ln-exam-bins b { display: inline-flex; width: 20px; height: 20px; border-radius: 6px; background: var(--ds-card2); border: 1.5px solid var(--ds-rule2); align-items: center; justify-content: center; margin-right: 6px; font-size: 12.5px; }
  .ln-exam-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 6px 0; border: 2px solid var(--ds-rule2); border-radius: 12px; background: var(--ds-card); }
  .ln-exam-row.right { border-color: var(--ds-ok); } .ln-exam-row.wrong { border-color: var(--ds-bad); }
  .ln-exam-text { flex: 1; min-width: 0; font-size: 15px; line-height: 1.35; }
  .ln-exam-digits { display: inline-flex; gap: 4px; flex: none; }
  .ln-exam-digit { width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid var(--ds-rule2); background: var(--ds-card); font: 700 15px var(--ds-sans); color: var(--ds-ink); cursor: pointer; }
  .ln-exam-digit[aria-pressed="true"] { background: var(--u-ink); border-color: var(--u-ink); color: var(--ds-paper); }
  .ln-exam-form { display: flex; align-items: center; gap: 10px; margin-top: 10px; font: 700 14px var(--ds-sans); color: var(--ds-ink2); }
  .ln-exam-grid { display: inline-flex; gap: 3px; }
  .ln-exam-grid > span { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
  .ln-exam-grid small { font-size: 11px; color: var(--ds-ink3); }
  .ln-exam-grid b { width: 26px; height: 30px; border: 1.5px solid var(--ds-ink3); border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font: 700 17px var(--ds-mono, monospace); color: var(--ds-ink); background: var(--ds-card); }
  /* «Соедините» — как «вставьте слово»: строки-определения с пустым местом, слова банком сверху */
  .ln-m2-how { margin: 2px 0 8px; font: 600 13.5px/1.35 var(--ds-sans); color: var(--ds-ink2); }
  .ln-m2-bank { display: flex; flex-wrap: wrap; gap: 6px; position: sticky; top: 0; z-index: 2; background: color-mix(in srgb, var(--ds-paper) 82%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); padding: 4px 0 8px; min-height: 40px; }
  .ln-body .ln-m2-bank .ds-opt { width: auto; margin: 0; padding: 8px 12px; font-size: 14.5px; line-height: 1.25; }
  .ln-m2-bank-done { font: 600 13.5px var(--ds-sans); color: var(--ds-ink3); align-self: center; }
  .ln-m2-rows { display: grid; gap: 8px; }
  .ln-m2-row { display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr) auto; gap: 12px; align-items: center; width: 100%; text-align: left; padding: 10px 12px;
    border-radius: 14px; border: 2px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink); font: 400 15px/1.35 var(--ds-sans); cursor: pointer;
    transition: border-color .15s, box-shadow .15s; }
  .ln-m2-row.on { border-color: var(--u-ink); box-shadow: 0 0 0 3px color-mix(in srgb, var(--u) 22%, transparent); }
  .ln-m2-row:disabled { cursor: default; }
  .ln-m2-slot { display: flex; align-items: center; min-height: 34px; padding: 5px 10px; border-radius: 10px; border: 2px dashed var(--ds-rule2);
    color: var(--ds-ink3); font: 700 14px/1.2 var(--ds-sans); overflow-wrap: anywhere; }
  .ln-m2-row.on .ln-m2-slot { border-color: var(--u-ink); color: var(--u-ink); }
  .ln-m2-slot.full { border-style: solid; border-color: color-mix(in srgb, var(--u-ink) 60%, var(--ds-rule2)); background: color-mix(in srgb, var(--u) 12%, var(--ds-card)); color: var(--ds-ink); }
  .ln-m2-mark { font: 800 18px var(--ds-sans); }
  /* перетаскивание: слово под пальцем не прокручивает страницу; копия едет за пальцем; место под ней подсвечено */
  .ln-m2-word, .ln-m2-slot.full { touch-action: none; -webkit-user-select: none; user-select: none; }
  .ln-m2-word.dragging, .ln-m2-slot.full.dragging { opacity: .35; }
  /* копия — своего размера: у .ds-opt «display: block; width: 100%», и при position: fixed она растягивалась на всё окно
     (жалоба mw9jj3fg: «плитки, когда их беру, очень длинные» на ПК 1910 px) */
  .ds-opt.ln-m2-ghost { display: inline-block; width: auto; max-width: min(320px, 86vw); white-space: normal; }
  .ln-m2-ghost { position: fixed; z-index: 60; pointer-events: none; width: auto; margin: 0; padding: 8px 12px; font-size: 14.5px; line-height: 1.25; transform: rotate(-2deg) scale(1.04);
    box-shadow: 0 14px 26px -12px rgba(0,0,0,.45); border-color: var(--u-ink); }
  .ln-m2-row.drop { border-color: var(--u-ink); box-shadow: 0 0 0 3px color-mix(in srgb, var(--u) 30%, transparent); }
  .ln-m2-row.drop .ln-m2-slot { border-color: var(--u-ink); background: color-mix(in srgb, var(--u) 14%, var(--ds-card)); }
  .ln-m2-bank.drop { outline: 2px dashed var(--u-ink); outline-offset: 2px; border-radius: 10px; }
  /* после проверки: верная строка — зелёная с ✓, неверная — красная с ✗, зачёркнутым словом и «верно: …» */
  .ln-m2-row[data-verdict="ok"] { border-color: var(--ds-ok); background: color-mix(in srgb, var(--ds-ok) 8%, var(--ds-card)); }
  .ln-m2-row[data-verdict="bad"] { border-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 7%, var(--ds-card)); }
  .ln-m2-row[data-verdict="ok"] .ln-m2-mark { color: var(--ds-ok); }
  .ln-m2-row[data-verdict="bad"] .ln-m2-mark { color: var(--ds-bad); }
  .ln-m2-row[data-verdict="bad"] .ln-m2-slot { text-decoration: line-through; opacity: .75; }
  .ln-m2-fix { grid-column: 1 / -1; font: 700 13px/1.3 var(--ds-sans); color: var(--ds-ok); }
  @media (max-width: 560px) {
    .ln-m2-row { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 10px; }
    .ln-m2-row .ln-m2-def { grid-column: 1 / -1; grid-row: 2; }
  }
  /* длинный разбор прокручивается внутри панели ответа, «Дальше» под ним всегда на виду */
  .ln-foot.fb .ds-answer { max-height: 75dvh; display: flex; flex-direction: column; }
  .ln-foot.fb .ds-answer > div { display: flex; flex-direction: column; align-items: flex-start; min-height: 0; width: 100%; }
  .ln-foot.fb .ds-answer > div > * { flex: none; }
  .ln-foot.fb .ds-answer > div > .ln-fb-body { flex: 0 1 auto; align-self: stretch; }
  .ln-foot.fb .ds-answer > div > button { align-self: stretch; }
  .ln-fb-body { margin-top: 10px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .ln-kind { margin-bottom: 8px; }
  /* отметки в строке вида задания («повторение · Ферма», «повтор ошибки», «семинар») — тем же шрифтом, что и сама строка,
     тонкой рамкой, а не цветной таблеткой другого размера (жалоба 21.11, sc-e3-far: «не по стилю плашка повторение») */
  .ln-kind .ds-badge { background: none; border: 1px solid color-mix(in srgb, currentColor 35%, transparent); color: inherit; opacity: .85;
    font: inherit; font-size: .92em; letter-spacing: inherit; padding: 2px 8px; border-radius: 999px; line-height: 1.3; }
  .ln-prompt { margin-bottom: 12px; }
  /* урок на ПК — крупнее: на большом экране колонка телефона в 560 px терялась посередине. Шрифт
     крупнее всегда; весь урок (шапка, текст, графики, кнопки, плашка ответа) увеличивается целиком,
     только если окно достаточно высокое: по высоте после увеличения остаётся не меньше 760 px —
     не меньше, чем на телефоне (docs/mechanics.md). Низкое окно ноутбука — без увеличения */
  @media (min-width: 1000px) {
    .ln-body .ds-text { font-size: 19px; line-height: 1.5; }
    .ln-body .ds-opt { font-size: 18px; line-height: 1.4; padding: 15px 18px; }
    .ln-body .ds-h1 { font-size: 30px !important; }
  }
  @media (min-width: 1000px) and (min-height: 836px) { .ln-overlay .ln-head, .ln-overlay .ln-body, .ln-overlay .ln-foot { zoom: 1.1; } .ln-overlay .ln-desk { max-width: calc(592px * 1.1); padding: 0 calc(14px * 1.1); } }
  @media (min-width: 1200px) and (min-height: 912px) { .ln-overlay .ln-head, .ln-overlay .ln-body, .ln-overlay .ln-foot { zoom: 1.2; } .ln-overlay .ln-desk { max-width: calc(592px * 1.2); padding: 0 calc(14px * 1.2); } }
  @media (min-width: 1400px) and (min-height: 1003px) { .ln-overlay .ln-head, .ln-overlay .ln-body, .ln-overlay .ln-foot { zoom: 1.32; } .ln-overlay .ln-desk { max-width: calc(592px * 1.32); padding: 0 calc(14px * 1.32); } }
  /* урок на телефоне — крупнее: экран почти пустой, а читать и попадать пальцем должно быть легко */
  @media (max-width: 600px) {
    .ln-body .ds-text { font-size: 19px; line-height: 1.5; }
    .ln-body .ln-prompt { margin-bottom: 14px; }
    .ln-body .ds-opt { font-size: 18px; line-height: 1.4; padding: 16px 14px 16px 16px; margin: 10px 0; }
    .ln-body .ds-h1 { font-size: 28px !important; }
    .ln-body .ds-eyebrow { font-size: 13px; }
    .ln-body .ln-legend, .ln-body .ln-key { font-size: 16px; }
    .ln-body .ln-key-tex { font-size: 22px; }
  }
  .tb-term { background: none; border: none; padding: 0; margin: 0; font: inherit; color: inherit; cursor: help; text-decoration: underline dotted var(--u-ink); text-underline-offset: 4px; text-decoration-thickness: 2px; }
  .ln-term-sheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; background: var(--ds-card); border-top: 4px solid var(--u); border-radius: 22px 22px 0 0;
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 30px rgba(60,30,0,.16); }
  .ln-tickets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .ln-tickets > div { border: 2px solid var(--ds-rule); border-radius: 14px; padding: 8px 4px; text-align: center; background: var(--ds-card); }
  .ln-tickets .v { font: 700 21px var(--ds-mono); margin-top: 2px; }
  .ln-ticket { display: flex; border: 2px solid var(--ds-rule); border-radius: 18px; background: var(--ds-card); overflow: hidden; box-shadow: 0 2px 0 var(--ds-rule); }
  .ln-ticket-main { flex: 1; min-width: 0; padding: 14px 14px 12px; }
  .ln-ticket-stub { width: 86px; background: color-mix(in srgb, var(--u) 13%, var(--ds-card)); display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; color: var(--u-ink); position: relative; }
  .ln-album { display: flex; flex-wrap: wrap; gap: 10px; }
  .ln-sync { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid color-mix(in srgb, var(--ds-bad) 45%, var(--ds-rule2));
    background: color-mix(in srgb, var(--ds-bad) 8%, var(--ds-card)); color: var(--ds-ink); }
  .ln-sync > svg { flex: none; color: var(--ds-bad); }
  .ln-sync b { display: block; font: 700 15px var(--ds-sans); }
  .ln-sync span { display: block; font-size: 13.5px; line-height: 1.4; color: var(--ds-ink2); margin-top: 2px; }
  /* «Запомнить» — в одном виде с остальными плашками шага (легенда, «Разбор»): тонкая рамка, полоса цвета юнита слева, а не
     толстая цветная рамка с заливкой; слова в формуле — шрифтом урока, а не шрифтом формул (жалоба 21.11, hh-i1, «Шаг
     дальше · Накопить на цель»: «не по стилю») */
  .ln-key { margin-top: 14px; padding: 8px 12px 10px 14px; border: 1px solid var(--ds-rule2); border-left: 4px solid var(--u); border-radius: 4px 12px 12px 4px; background: var(--ds-card); }
  .ln-key-tex .katex .text, .ln-key-tex .katex .textrm { font-family: var(--ds-sans); }
  .ln-key .ds-eyebrow { color: var(--u-ink); }
  /* формула целиком: дробь (ΔQ над ΔL) — блоком с запасом по вертикали, а не строкой, у которой верх срезался (жалоба mw6t15ic) */
  .ln-key-tex { font-size: 19px; text-align: center; margin-top: 4px; padding: 4px 0 6px; overflow-x: auto; overflow-y: hidden; }
  .ln-key-tex .katex { display: inline-block; padding: 3px 0; }
  .ln-legend { margin-top: 12px; padding: 8px 12px; border-left: 4px solid var(--u); background: color-mix(in srgb, var(--u) 6%, var(--ds-card)); font-size: 14.5px; line-height: 1.55; border-radius: 4px 12px 12px 4px; }
  .ln-how { background: none; border: none; padding: 4px 0; margin-top: 6px; font: 700 14px var(--ds-sans); color: inherit; text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; }
  /* «Ошибка в разборе?» — тихая ссылка под разбором в плашке ответа */
  .ln-explain-flag { margin-top: 8px; display: flex; }
  .ln-explain-flag .ln-flag { color: inherit; opacity: .72; padding: 4px 8px 4px 0; margin: 0; }
  .ln-explain-flag .ln-flag:hover, .ln-explain-flag .ln-flag:focus-visible { opacity: 1; background: none; color: var(--ds-bad); }
  .ln-book { min-height: 100vh; margin: -12px -16px 0; }
  .ln-track { display: flex; align-items: center; gap: 7px; margin: 0 0 10px; padding: 7px 12px; border-radius: 10px; font: 600 13px/1.3 var(--ds-sans); color: #7A1F31; background: color-mix(in srgb, #8C2337 10%, var(--ds-card)); border: 1px dashed color-mix(in srgb, #8C2337 45%, transparent); }
  .ds-dark .ln-track { color: #F0B9C4; }
  /* кнопки учебника-справочника — те же, что у дизайн-системы: объёмные, со скруглением */
  .ln-textbook .ems-btn { font: 700 13.5px/1.25 var(--ds-sans); border: 2px solid var(--ds-rule2); border-bottom-width: 4px; border-radius: 12px; background: var(--ds-card);
    color: var(--u-ink); box-shadow: none; letter-spacing: 0; }
  .ln-textbook .ems-btn:hover { background: var(--ds-card2); border-color: var(--ds-rule2); box-shadow: none; }
  .ln-textbook .ems-btn.primary { background: var(--u); color: #fff; border-color: color-mix(in srgb, var(--u) 70%, #000); font: 700 13.5px/1.25 var(--ds-head); letter-spacing: .06em; text-transform: uppercase; }
  .ln-textbook .ems-btn.primary:hover { background: var(--u); filter: brightness(1.07); }
  .ln-textbook .ems-btn[aria-pressed="true"] { background: var(--ds-sel); color: var(--ds-sel-ink); border-color: var(--ds-sel-rule); }
  .ln-theory { border: 2px solid var(--ds-rule); border-left: 5px solid var(--u); border-radius: 6px 16px 16px 6px; background: var(--ds-card2); padding: 12px 14px; }
  .ln-level-text { font-size: 13.5px; line-height: 1.35; margin: -2px 2px 4px; }
  /* «Большое повторение» под последним юнитом уровня: карточка-остановка; следующая остановка — золотое кольцо */
  .ln-lvrev { margin: 6px 0 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; border: 1.5px dashed color-mix(in srgb, var(--u) 55%, var(--ds-rule2)); }
  .ln-lvrev[data-state="done"] { border-style: solid; }
  /* закрытая — серым значком с замком, без полупрозрачности: текст должен читаться (контраст 4,5:1) */
  .ln-lvrev.cur { border: 2px solid var(--ds-gold); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-gold) 22%, transparent); animation: ln-lvrev-glow 2.4s ease-in-out infinite; }
  @keyframes ln-lvrev-glow { 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--ds-gold) 12%, transparent); } }
  .ln-lvrev-in { display: flex; align-items: center; gap: 12px; }
  .ln-lvrev-icon { width: 48px; height: 48px; flex: none; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--u); box-shadow: 0 3px 0 var(--u-ink); }
  .ln-lvrev[data-state="locked"] .ln-lvrev-icon { background: var(--ds-card2); color: var(--ds-ink3); box-shadow: none; }
  .ln-lvrev-seal { width: 30px; height: 30px; flex: none; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--ds-ok); transform: rotate(-8deg); }
  @media (prefers-reduced-motion: reduce) { .ln-lvrev.cur { animation: none; } }
  .ln-unfair { margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--ds-rule2); background: var(--ds-card2); font-size: 14.5px; line-height: 1.45; text-align: left; }
  .ln-soon-head { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; color: inherit; font: inherit; padding: 12px 14px; cursor: pointer; text-align: left; }
`;

/* ------------------------------ ПРОГРЕСС ------------------------------ */
function useLearn() {
  const [progress, setProgress] = useState(loadProgress);
  const playerId = useMemo(getPlayerId, []);
  const timer = useRef(null);
  /* выплаты при действии вне урока (лавка, копилка, сад, витрина): settle выдаёт накопленное — цель дня,
     задания, печати; раньше монеты приходили молча (жалоба «откуда-то 10 монет»), теперь — плашкой */
  const gainsRef = useRef([]);
  const [gains, setGains] = useState([]);
  // opts.settle — после изменения выдать всё выполненное: задания дня, печати, бонусы серии
  // opts.whole — fn получает весь прогресс (с задачами учебника), а не только Путь
  const update = (fn, opts = {}) => {
    setProgress((mem) => {
      const p = latestProgress(mem);
      if (opts.whole) { const next = fn(p); return next === p ? mem : saveProgress(next); }
      let learn = fn(p.learn);
      if (opts.settle) { const r = settle(learn, courseCtx(learn)); learn = r.s; if (r.gains.length) gainsRef.current = r.gains; }
      return learn === p.learn ? mem : saveProgress({ ...p, learn });
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; syncProfile(playerId).catch(() => {}); }, 2000);
  };
  /* тихая синхронизация (docs/mechanics.md): вернулись на вкладку (разблокировали телефон, пришли
     домой к компьютеру) и раз в минуту, пока вкладка открыта, — забираем общий прогресс профиля.
     Пройденный на телефоне урок появляется на компьютере сам, без перезагрузки. Не чаще раза в 20 с. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let last = Date.now(); let alive = true;
    const pull = () => {
      if (document.hidden || Date.now() - last < 20000) return;
      last = Date.now();
      syncProfile(playerId).then((pf) => { if (alive && pf) setProgress(loadProgress()); }).catch(() => {});
    };
    const id = setInterval(pull, 60000);
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('focus', pull);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', pull); window.removeEventListener('focus', pull); };
  }, [playerId]);
  // учебник записал прогресс (ответ снял ошибку с повторения Пути) — перечитываем
  useEffect(() => {
    const reload = (e) => { if (e.detail) setProgress((p) => (p === e.detail ? p : e.detail)); };
    window.addEventListener(PROGRESS_EVENT, reload);
    return () => window.removeEventListener(PROGRESS_EVENT, reload);
  }, []);
  useEffect(() => {
    let alive = true;
    /* списание монет дюпа (src/learn/audit.js, docs/mechanics.md, «Защита монет») — один раз, после первой
       синхронизации: считаем по общему прогрессу всех устройств */
    // автотест засевает монеты без уроков — списание в нём только по просьбе теста (ems-audit-test)
    let auditOff = false; try { auditOff = !!navigator.webdriver && localStorage.getItem('ems-audit-test') !== '1'; } catch { /* приватный режим */ }
    const audit = () => !auditOff && update((p) => {
      const learn = applyDupeAudit(p.learn, Date.now(), { bookFirst: Object.values(p.problems || {}).filter((r) => r && r.ok && (r.tries || 0) <= 1).length });
      if (learn === p.learn) return p;
      const f = fineOf(learn);
      if (f && f.coins > 0 && !AUDIT_TRACKED.size) { AUDIT_TRACKED.add(1); track('coins_clawback'); }
      return { ...p, learn };
    }, { whole: true });
    /* взносы страховки — только по общему прогрессу (docs/mechanics.md, «Страховка серии»): устройство со старым прогрессом
       иначе «прекращало» давно расторгнутый на другом устройстве полис — с уведомлением (пункт владельца 09.11) */
    syncProfile(playerId).then((pf) => { if (alive && pf) { setProgress(loadProgress()); update((s) => chargePremiums(s)); } }).catch(() => {}).finally(() => { if (alive) audit(); });
    // редкое задание дня, выполненное вне урока (кварталы в «Мире»), выдаётся при возвращении на Путь; обычные — как раньше, после урока
    if (questsFor(loadProgress().learn).some((q) => q.rare && q.done && !q.claimed)) update((x) => x, { settle: true });
    // уроки, которые не продолжили за сутки, — брошенные: только они портят долю доведённых
    const expired = takeExpiredResumes();
    if (expired.length) update((s) => expired.reduce((acc, r) => abandonLesson(acc, r.kind || 'choice', r.pos || 0), s));
    // купленные заморозки спасают серию сами — при открытии, если пропуск уже не покрыт недельной
    update((s) => fixMonth(applyFreezes(s)));
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); syncProfile(playerId).catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);
  // выплата из settle — после записи прогресса, один раз (апдейтер setProgress может вызываться дважды)
  useEffect(() => { if (gainsRef.current.length) { const g = gainsRef.current; gainsRef.current = []; setGains(g); } }, [progress]);
  return [progress.learn, update, gains, () => setGains([])];
}


// значок вида урока: на остановке Пути и в билете урока
export const KIND_ICON = { intro: BookOpen, practice: Dumbbell, words: Languages, story: MessageCircle, listen: Headphones, game: Gamepad2, review: Repeat, summary: Flag };
// «Знакомство: спрос» под подписью вида урока — просто «Спрос»
export const bareTitle = (t) => { const x = String(t).replace(/^Знакомство:\s*/, ''); return x.charAt(0).toUpperCase() + x.slice(1); };

/* ------------------------------ БИЛЕТ УРОКА ------------------------------
   Нажатие на остановку ещё ничего не начинает: сначала билет — вид урока, название, минуты
   и опыт — и кнопка «Начать» (или «Продолжить», если урок был прерван). Пройденный урок
   можно взять на алмазном уровне — задачи сложнее, опыт и монеты больше — или просто
   повторить. Если тема слабая, первым предлагается простой повтор. */
/* разделы, про которые больше не спрашиваем: урок начали, не открывая теорию, — тема знакома (удобство устройства) */
const THEORY_KEY = 'ems-learn-theory-known';
const readKnown = () => { try { const v = JSON.parse(localStorage.getItem(THEORY_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const addKnown = (id) => { try { localStorage.setItem(THEORY_KEY, JSON.stringify([...new Set([...readKnown(), id])].slice(-200))); } catch { /* приватный режим */ } };
function LessonSheet({ l, learn, weak = false, onStart, onClose, onOpenBook, onSkip = null }) {
  const lesson = LESSON_BY_ID[l.id];
  // уроку нужна теория из учебника, которой ученик ещё не видел — спросим перед стартом
  const [theory] = useState(() => (l.open && !l.done && !getResume(l.id) ? theoryNotice(lesson, learn, loadProgress(), readKnown()) : null));
  // до скольких опыта: все ответы верны и подряд (за серию — больше), мини-игры — на максимум
  // минуты и опыт посчитаны при сборке указателя курса (src/learn/course-index-build.js): билет не ждёт загрузки глав
  const info = { min: lesson.min || 2, xp: lesson.xp || 0 };
  const gemInfo = l.done && lesson.gemMin ? { min: lesson.gemMin, xp: lesson.gemXp } : null;
  const resume = l.open ? getResume(l.id) : null;
  const Icon = KIND_ICON[lesson.kind] || Dumbbell;
  const pl = placeOf(lesson.unitId);
  return (
    <Sheet label={`Урок: ${l.title}`} onClose={onClose} testid="lesson-sheet" data-lesson={l.id} style={{ '--u': pl.color }}
      returnTo={() => document.querySelector(`[data-testid="path-lesson"][data-lesson="${l.id}"]`)}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginRight: -8 }}><IconButton label="Закрыть" icon={X} data-nav="back" onClick={onClose} size={22} /></div>
      <div className="ln-ticket">
        <div className="ln-ticket-main">
          <div className="ds-eyebrow">{LESSON_KIND[lesson.kind]} · {pl.place}</div>
          <div className="ds-h2" style={{ marginTop: 4 }}>{bareTitle(l.title)}</div>
          {/* время и опыт — каждое целиком, без переноса внутри («≈4 мин» и «до 48 опыта» не рвутся на две строки) */}
          <div className="ds-num ds-sub ln-ticket-meta" data-testid="lesson-meta">
            <span><Timer size={15} aria-hidden="true" />≈{info.min} мин</span>
            <span><Coins size={15} aria-hidden="true" />до {info.xp} опыта</span>
            {/* пройденный урок — короткая отметка в строке билета, без печати поверх */}
            {l.done && <span data-testid="lesson-done-mark" style={{ color: l.diamond ? DIAMOND_COLOR : 'var(--ds-ok)', fontWeight: 700 }}>
              {l.diamond ? <Gem size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}{l.diamond ? 'алмаз' : 'пройден'}
            </span>}
          </div>
        </div>
        <div className="ln-ticket-stub">
          <Icon size={30} aria-hidden="true" />
          <span className="ds-num" style={{ fontSize: 12 }}>№ {String(l.no).padStart(2, '0')}</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {l.skipped && <div className="ds-sub" style={{ fontSize: 14, textAlign: 'center', marginBottom: 10 }} data-testid="lesson-skipped-note">Урок пропущен: следующие уже открыты. Вернитесь, когда сможете слушать, — или пройдите текстом: «Не могу слушать» внутри урока.</div>}
        {!l.open ? (
          <div className="ds-sub" style={{ fontSize: 15, textAlign: 'center' }} data-testid="lesson-sheet-locked">
            <Lock size={15} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />{l.fixLock ? 'Сначала — «Работа над ошибками» перед этим уроком: она откроет Путь дальше.' : l.levelWait ? `Сначала — «Большое повторение» уровня «${LEVEL_BY_ID[l.levelWait].title}»: оно откроет новый уровень.` : 'Откроется после предыдущего урока — или сдайте проверку юнита.'}
          </div>
        ) : theory ? (
          <div className="ln-theory" data-testid="theory-notice">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <BookOpenText size={22} color="var(--u-ink)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div className="ds-sub" style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                Урок опирается на раздел учебника <b>«{theory.section.title}»</b>{theory.section.minutes ? ` (≈${theory.section.minutes} мин)` : ''}. Можно прочитать его сейчас — или начать урок сразу, и про этот раздел мы больше не напомним.
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <Button wide variant="secondary" icon={BookOpenText} data-testid="theory-open"
                onClick={() => { Audio.play('paper'); onClose(); onOpenBook({ kind: 'chapter', id: theory.chapter, anchor: theory.section.id }); }}>Открыть теорию</Button>
              {/* «Начать урок» — это и есть «тема знакома»: про этот раздел больше не напоминаем (пункт владельца 24.11, п. 16:
                  «кнопка "Я знаю эту тему — не напоминать" — зачем, если по функционалу она то же, что "Начать урок"») */}
              <Button wide data-testid="lesson-start" onClick={() => { Audio.prime(); Audio.play('click'); addKnown(theory.section.id); onStart({ mode: 'lesson', lessonId: l.id }); }}>Начать урок</Button>
            </div>
          </div>
        ) : resume || !l.done ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <Button wide data-testid="lesson-start" onClick={() => { Audio.prime(); Audio.play('click'); onStart({ mode: 'lesson', lessonId: l.id, resume }); }}>
              {resume ? 'Продолжить' : 'Начать'}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {(() => {
              const gemBtn = (
                <Button key="gem" wide variant={weak ? 'secondary' : 'primary'} icon={Gem} data-testid="lesson-diamond" style={{ '--u': DIAMOND_COLOR }}
                  onClick={() => { Audio.prime(); Audio.play('click'); onStart({ mode: 'lesson', lessonId: l.id, diamond: true }); }}>
                  Алмазный уровень
                </Button>
              );
              const plainBtn = (
                <Button key="plain" wide variant={weak ? 'primary' : 'ghost'} data-testid="lesson-start" onClick={() => { Audio.prime(); Audio.play('click'); onStart({ mode: 'lesson', lessonId: l.id }); }}>
                  Повторить без усложнения
                </Button>
              );
              return weak ? [plainBtn, gemBtn] : [gemBtn, plainBtn];
            })()}
            <div className="ds-sub" style={{ fontSize: 13.5, textAlign: 'center' }} data-testid="lesson-diamond-info">
              {/* число и единица — неразрывно: «≈4 мин» и «до 45 опыта» не рвутся на две строки */}
              Алмазный уровень: задачи сложнее{lesson.gemTheory ? ', теория глубже' : ''}, <span className="nw">≈{gemInfo.min}{'\u00a0'}мин</span>, <span className="nw">до {gemInfo.xp}{'\u00a0'}опыта</span> и <span className="nw">{l.diamond ? indexed(COIN.diamondReplay) : `${indexed(COIN.diamond)}–${indexed(COIN.diamond + COIN.diamondPerfect)}`}{'\u00a0'}монет</span>.
              {weak && ' Тема пока даётся трудно — сначала стоит повторить.'}
            </div>
          </div>
        )}
        {/* «Слушай» можно пропустить, не заходя в урок: следующий урок откроется (docs/mechanics.md) */}
        {lesson.kind === 'listen' && l.open && !l.done && !l.skipped && onSkip && (
          <Button wide variant="ghost" data-testid="lesson-skip" style={{ marginTop: 8 }} onClick={() => onSkip(l.id)}>Не могу слушать сейчас — пропустить</Button>
        )}
        {resume && <div className="ds-faint" style={{ fontSize: 13, textAlign: 'center', marginTop: 8 }}>Урок сохранён с того места, где вы вышли.</div>}
      </div>
    </Sheet>
  );
}

/* ------------------------------ ПУТЬ ------------------------------ */
const SEEN_KEY = 'ems-learn-open-seen';
const readSeen = () => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null'); return Array.isArray(v) ? new Set(v) : null; } catch { return null; } };
const writeSeen = (set) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* приватный режим */ } };

/* Уровень знаний (src/learn/grade.js): маленькое число, которое растёт от урока к уроку, — в медальоне с
   кольцом прогресса нынешнего уровня курса. Выросло с прошлого раза — медальон подпрыгивает, число
   досчитывает, всплывает «+N» (где ученик видел число в прошлый раз — на устройстве, ems-know-seen):
   рост — событие. Справа — уровень курса и сколько уроков уровня пройдено, точки пяти уровней. */
const KNOW_SEEN = 'ems-know-seen';
const readKnowSeen = () => { try { const v = Number(localStorage.getItem(KNOW_SEEN)); return Number.isFinite(v) ? v : null; } catch { return null; } };
function GradeCard({ learn }) {
  const c = useMemo(() => courseLevel(learn), [learn]);
  const reduced = useReducedMotion();
  // прирост с прошлого показа: запоминаем при первом показе, дальше — каждый раз, когда число выросло
  const [from] = useState(() => { const v = readKnowSeen(); return v == null || v > c.points ? c.points : v; });
  const gain = c.points - from;
  const shownNum = useCountUp(c.points, reduced || gain <= 0 ? c.points : from);
  useEffect(() => { try { localStorage.setItem(KNOW_SEEN, String(c.points)); } catch { /* приватный режим */ } }, [c.points]);
  const share = c.level.total ? c.level.done / c.level.total : 0;
  const R = 31; const L = 2 * Math.PI * R;
  return (
    <div className="ln-grade" data-testid="course-level" data-points={c.points} data-done={c.done} data-level={c.level.id} data-gain={gain > 0 ? gain : undefined}>
      <span className={`ln-know${gain > 0 ? ' up' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 76 76" width="76" height="76">
          <circle cx="38" cy="38" r={R} fill="none" stroke="color-mix(in srgb, var(--u) 16%, var(--ds-card2))" strokeWidth="6" />
          <circle className="ln-know-ring" cx="38" cy="38" r={R} fill="none" stroke="var(--u)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${Math.max(share > 0 ? 3 : 0, share * L)} ${L}`} transform="rotate(-90 38 38)" />
        </svg>
        <b data-testid="course-points">{shownNum}</b>
        {gain > 0 && <i className="ln-know-plus" data-testid="course-gain">+{gain}</i>}
      </span>
      <span className="ln-grade-word">
        <span className="ds-eyebrow">Уровень знаний</span>
        <b>{c.level.title} уровень курса</b>
        <small data-testid="course-next">{c.points ? `Пройдено уроков уровня: ${c.level.done} из ${c.level.total}` : 'Каждый урок добавляет к уровню знаний — начните с первого.'}</small>
        <span className="ln-know-steps" aria-hidden="true">
          {LEVELS.map((l, k) => <i key={l.id} className={l.id === c.level.id ? 'on' : c.past.includes(l.id) ? 'past' : ''} title={l.title}>{k + 1}</i>)}
        </span>
      </span>
      <span className="ds-sr">Уровень знаний: {c.points}. {c.level.title} уровень курса: пройдено {c.level.done} из {c.level.total} уроков. Всего пройдено {c.done} из {c.total} уроков.</span>
    </div>
  );
}
// число досчитывает до нового значения (рост — событием), без анимации — сразу
function useCountUp(target, from) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (from === target) { setV(target); return undefined; }
    let raf = 0; const t0 = performance.now(); const dur = 900;
    const tick = (now) => { const t = Math.min(1, (now - t0) / dur); setV(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)))); if (t < 1) raf = requestAnimationFrame(tick); };
    const delay = setTimeout(() => { raf = requestAnimationFrame(tick); }, 350);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [target, from]);
  return v;
}

function TopStats({ learn, bell = null }) {
  const st = streak(learn); const g = goalToday(learn);
  return (
    <>
    {/* у каждого счётчика подпись для чтения с экрана: значок и сокращение её не заменяют */}
    <div className="ln-stats" data-testid="path-stats" role="group" aria-label="Ваш прогресс">
      {/* огонёк: сегодня уже занимались — горит (цветной, с галочкой); ещё нет — блёклый, ждёт урока */}
      <span className={`ln-stat ln-streak${st.today ? ' on' : st.days ? ' wait' : ''}`} data-testid="streak-chip" data-today={String(st.today)}
        title={st.today ? 'Серия продлена сегодня' : st.days ? 'Сегодня ещё не занимались: один урок — и серия продлится' : 'Серия дней'}>
        <span className="ln-flame-wrap"><Flame size={17} color={st.today ? 'var(--ds-bad)' : 'var(--ds-ink3)'} fill={st.today ? 'color-mix(in srgb, var(--ds-bad) 35%, transparent)' : 'none'} aria-hidden="true" />
          {st.today && <i className="ln-flame-ok" aria-hidden="true"><Check size={9} strokeWidth={4} /></i>}</span>
        <span className="ds-sr">Серия, дней: </span><span data-testid="streak" key={st.days} className="ln-bump">{st.days}</span><small aria-hidden="true">дн.</small>
        <span className="ds-sr">{st.today ? ', сегодня продлена' : st.days ? ', сегодня ещё не продлена' : ''}</span>
      </span>
      <span className="ln-stat" title={`Цель дня — ${g.goal} минут занятий`} data-testid="goal" style={{ color: g.done >= g.goal ? 'var(--ds-ok)' : undefined }}><Target size={17} aria-hidden="true" /><span className="ds-sr">Цель дня, минут занятий: </span><span key={Math.min(g.done, g.goal)} className="ln-bump">{Math.min(g.done, g.goal)}</span>/{g.goal}<small aria-hidden="true">мин</small></span>
      {bell}
    </div>
    <GradeCard learn={learn} />
    </>
  );
}

/* Карта Инфляции: берег, пять областей уровней (src/learn/levelmap.js), река Велья и дорога через
   места юнитов. Здание места —
   гравюра; пройденный юнит его «оживляет» (цвет, свет в окнах, дым). Нажатие по месту —
   прокрутка к юниту на дороге ниже. */
const MAP_BOX = { x: 130, y: 70, w: 780, h: 610 };
// sel — юниты, которые сейчас на экране Пути (выбранный уровень): их места в сплошном кольце
const LEVEL_MAP = levelRegions();
// 25 мест по порядку дороги: юниты и места под будущие юниты уровня (по пять на уровень)
const MAP_SLOTS = mapSlots();
function Atlas({ states, sel = [], onPick }) {
  const units = UNITS.map((u, k) => ({ u, no: k + 1, st: states.find((x) => x.course.id === u.id), pl: placeOf(u.id) }));
  const soon = MAP_SLOTS.filter((x) => x.soon);
  // уровень, юниты которого сейчас на экране Пути: его область чуть ярче
  const selLevel = sel.length ? (UNITS.find((u) => u.id === sel[0]) || {}).level : null;
  const onPath = units.filter((x) => x.st);
  const route = MAP_SLOTS.map((x) => x.at);
  /* пройденная часть дороги — от начала до следующего места на Пути после последнего пройденного:
     места будущих и строящихся юнитов дорога проходит насквозь */
  const onIds = new Set(onPath.map((y) => y.u.id));
  const lastDone = MAP_SLOTS.reduce((k, x, i) => (onPath.some((y) => y.u.id === x.id && y.st.complete) ? i : k), -1);
  let doneTill = lastDone;
  if (lastDone >= 0) { doneTill += 1; while (doneTill < MAP_SLOTS.length - 1 && !onIds.has(MAP_SLOTS[doneTill].id)) doneTill += 1; }
  // места ещё без уроков — точки на дороге; их здания появятся, когда юнит выйдет на Путь
  const cur = onPath.find((x) => !x.st.complete) || null;
  const pathD = (pts) => (pts.length > 1 ? `M${pts[0][0]},${pts[0][1]}${curveTo(pts)}` : '');
  return (
    <Card className="ln-atlas" data-testid="atlas">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '0 4px 6px' }}>
        <div><div className="ds-eyebrow">Путь</div><div className="ds-h3">Дорога по Инфляции</div></div>
        <span className="ds-faint ds-num" style={{ fontSize: 12 }}>{onPath.filter((x) => x.st.complete).length}/{UNITS.length} мест</span>
      </div>
      <svg viewBox={`${MAP_BOX.x} ${MAP_BOX.y} ${MAP_BOX.w} ${MAP_BOX.h}`} width="100%" role="img" aria-label="Карта Инфляции: места юнитов на дороге" style={{ display: 'block', borderRadius: 4 }}>
        <defs>
          <pattern id="ln-sea" width="28" height="18" patternUnits="userSpaceOnUse"><path d="M0,10 q7,-5 14,0 t14,0" fill="none" stroke="#5F82B3" strokeWidth="1" opacity=".22" /></pattern>
          <clipPath id="ln-land"><path d={countryPath} /></clipPath>
        </defs>
        {/* море — голубоватая тушь с волнами, суша — бумага */}
        <rect x={MAP_BOX.x} y={MAP_BOX.y} width={MAP_BOX.w} height={MAP_BOX.h} fill="color-mix(in srgb, #5F82B3 8%, var(--ds-card))" />
        <rect x={MAP_BOX.x} y={MAP_BOX.y} width={MAP_BOX.w} height={MAP_BOX.h} fill="url(#ln-sea)" />
        <path d={countryPath} fill="var(--ds-paper)" />
        {/* области уровней вместо административных округов: заливка цветом уровня, граница — между разными уровнями */}
        <g clipPath="url(#ln-land)">
          {LEVEL_MAP.regions.map((r) => (
            <path key={r.id} d={r.d} className="ln-lvl" data-testid="atlas-level" data-level={r.id} data-current={String(r.id === selLevel)}
              style={{ '--lv': r.tint }} />
          ))}
          {LEVEL_MAP.borders.map((b, k) => <line key={k} x1={b.a[0]} y1={b.a[1]} x2={b.b[0]} y2={b.b[1]} className="ln-lvl-border" />)}
        </g>
        <path d={countryPath} fill="none" stroke="var(--ds-ink2)" strokeWidth="2.6" />
        <path d={`M${RIVER[0][0]},${RIVER[0][1]}${curveTo(RIVER)}`} fill="none" stroke="#5F82B3" strokeWidth="3.2" opacity=".75" />

        {/* дорога через все места: пройденная часть — сплошная тушь, дальше — пунктир */}
        <path d={pathD(route)} fill="none" stroke="var(--ds-card2)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathD(route)} fill="none" stroke="var(--ds-ink3)" strokeWidth="2.4" strokeDasharray="8 8" strokeLinecap="round" />
        {lastDone >= 0 && <path d={pathD(route.slice(0, doneTill + 1))} fill="none" stroke="var(--u-ink)" strokeWidth="4" strokeLinecap="round" />}
        {/* места под будущие юниты — пунктирные кружки: юнит появится здесь позже */}
        {soon.map((x) => (
          <circle key={x.id} cx={x.at[0]} cy={x.at[1]} r="6.5" fill="var(--ds-card)" stroke="var(--ds-ink3)" strokeWidth="1.8" strokeDasharray="3 2.6" data-testid="atlas-soon" data-level={x.level} />
        ))}
        {/* номер уровня — в самом свободном месте его области; названия — в легенде под картой */}
        {LEVEL_MAP.regions.filter((r) => r.label).map((r) => (
          <g key={r.id} className="ln-lvl-badge" style={{ '--lv': r.tint }} data-current={String(r.id === selLevel)} aria-hidden="true">
            <circle cx={r.label[0]} cy={r.label[1]} r="19" />
            <text x={r.label[0]} y={r.label[1] + 7} textAnchor="middle">{r.no}</text>
          </g>
        ))}
        {units.filter((x) => !x.st).map(({ u, pl }) => (
          <circle key={u.id} cx={pl.at[0]} cy={pl.at[1]} r="7" fill="var(--ds-card)" stroke="var(--ds-ink3)" strokeWidth="2" data-testid="atlas-place" data-unit={u.id} data-alive="false" />
        ))}
        {onPath.map(({ u, st, pl }) => {
          const alive = st.complete; const here = cur && cur.u.id === u.id;
          const [x, y] = pl.at;
          return (
            <g key={u.id} style={{ '--u': pl.color, cursor: 'pointer' }} data-testid="atlas-place" data-unit={u.id} data-alive={String(alive)} data-selected={String(sel.includes(u.id))}
              onClick={() => onPick(u.id)} role="button" aria-label={`${pl.place}: к юниту`} aria-current={sel.includes(u.id) ? 'true' : undefined}>
              {/* спокойно: места уровня на экране — тонкое кольцо приглушённого цвета юнита, текущее — пунктир цвета юнита
                  (жалоба «карта вырвиглазная»: пять толстых ярких колец подряд кричали) */}
              {here && <circle cx={x} cy={y - 26} r="57" fill="none" stroke="color-mix(in srgb, var(--u) 70%, var(--ds-card))" strokeWidth="2.5" strokeDasharray="5 6" />}
              {sel.includes(u.id) && <circle cx={x} cy={y - 26} r="51" fill="none" stroke="color-mix(in srgb, var(--u) 45%, var(--ds-card))" strokeWidth="2.5" />}
              <circle cx={x} cy={y - 26} r="49" fill="var(--ds-card)" opacity=".8" />
              <EngravingG kind={pl.building} alive={alive} x={x - 54} y={y - 72} scale={0.9} color={pl.color} />
              <text x={x} y={y + 28} textAnchor="middle" fontSize="23" fontWeight="700" fill="var(--ds-ink)" stroke="var(--ds-paper)" strokeWidth="6" paintOrder="stroke">{pl.place}</text>
            </g>
          );
        })}
      </svg>
      <div className="ln-lvl-legend" data-testid="atlas-legend">
        {LEVEL_MAP.regions.map((r) => (
          <span key={r.id} style={{ '--lv': r.tint }} data-current={String(r.id === selLevel)}><b>{r.no}</b>{r.title}</span>
        ))}
      </div>
    </Card>
  );
}

// после сданного теста уровня: какой уровень открылся
export const nextLevelText = (levelId) => { const k = LEVELS.findIndex((l) => l.id === levelId); const next = LEVELS[k + 1]; return next ? `Уровень «${next.title}» открыт — Путь уже на нём.` : 'Это последний уровень курса.'; };

/* Остановки юнита на дороге: жетоны вдоль извилистой дороги. Пройденная — в цвете юнита с
   сургучной печатью, текущая — с золотым кольцом и флажком «Вы здесь», закрытая — пунктир. */
/* средние остановки — не ровно посередине (±30): подписи сбоку от жетона нужно место до края дороги
   под самое длинное слово названия («чувствительность») */
const ROW = 118; const ZIG = [-30, 56, 92, 56, 30, -56, -92, -56];
/* подпись остановки — сбоку от жетона, где больше места до края дороги шириной W: у остановки справа —
   слева, слева — справа, у средней — с другой стороны, чем следующая остановка (её дорога уходит туда);
   ширина — до края дороги, не больше 150 px (docs/mechanics.md, «Навигация») */
const TOKEN_R = 31; const TITLE_GAP = 8;
function titleSide(x, nextX, W) {
  if (Math.abs(x - W / 2) > 1) return x > W / 2 ? 'l' : 'r';
  return nextX != null && nextX > x ? 'l' : 'r';
}
const titleWidth = (x, side, W) => Math.min(150, Math.floor((side === 'l' ? x : W - x) - TOKEN_R - TITLE_GAP - 2));
const titleStyle = (pts, i, W) => { const side = titleSide(pts[i][0], pts[i + 1] ? pts[i + 1][0] : null, W); return { side, style: { '--tw': `${titleWidth(pts[i][0], side, W)}px` } }; };
/* Убранство дороги: у каждой остановки, на другой стороне от неё, — дерево, фонарь, куст или
   верстовой столб с номером урока; в начале юнита — указатель с названием места. У пройденных
   остановок убранство в цвете юнита («дорога оживает»), у закрытых — серое. Чисто украшение:
   скрыто от чтения с экрана и не ловит нажатий. */
function Prop({ kind, x, y, alive, no, scale = 1, flip = false }) {
  const ink = alive ? 'var(--u-ink)' : 'var(--ds-ink3)';
  const fill = alive ? 'var(--u)' : 'var(--ds-rule2)';
  const o = alive ? 1 : 0.55;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -scale : scale},${scale})`} opacity={o} className="ln-prop" data-prop={kind}>
      {kind === 'tree' && <>
        <line x1="0" y1="2" x2="0" y2="22" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="0" cy="-8" r="13" fill={fill} fillOpacity=".22" stroke={ink} strokeWidth="1.6" />
        <circle cx="-7" cy="-2" r="7" fill={fill} fillOpacity=".18" stroke={ink} strokeWidth="1.2" />
        <path d="M-6 -12 l4 4 M2 -14 l4 4 M-2 -4 l4 4" stroke={ink} strokeWidth="1" opacity=".7" />
        <line x1="-9" y1="22" x2="9" y2="22" stroke={ink} strokeWidth="1.2" opacity=".6" />
      </>}
      {kind === 'lamp' && <>
        <line x1="0" y1="-16" x2="0" y2="22" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <path d="M0 -16 q8 0 10 6" fill="none" stroke={ink} strokeWidth="1.6" />
        <circle cx="10" cy="-7" r="4" fill={alive ? 'var(--ds-gold)' : 'none'} fillOpacity=".8" stroke={ink} strokeWidth="1.4" />
        {alive && <circle cx="10" cy="-7" r="9" fill="var(--ds-gold)" opacity=".18" />}
        <line x1="-6" y1="22" x2="6" y2="22" stroke={ink} strokeWidth="1.6" />
      </>}
      {kind === 'bush' && <>
        <circle cx="-8" cy="14" r="8" fill={fill} fillOpacity=".2" stroke={ink} strokeWidth="1.3" />
        <circle cx="6" cy="12" r="10" fill={fill} fillOpacity=".24" stroke={ink} strokeWidth="1.3" />
        <circle cx="-1" cy="6" r="7" fill={fill} fillOpacity=".2" stroke={ink} strokeWidth="1.2" />
        <line x1="-16" y1="22" x2="16" y2="22" stroke={ink} strokeWidth="1.2" opacity=".6" />
      </>}
      {/* Хеллоуин: тыква у дороги (у пройденной остановки — с зажжённой рожицей) и летучая мышь над деревом */}
      {kind === 'pumpkin' && <g transform="translate(-17 -6)" opacity={alive ? 1 : 0.7}>{alive ? <Pumpkin size={34} /> : <Pumpkin size={34} lit={false} />}</g>}
      {kind === 'bat' && <g transform="translate(-12 -6)"><g className="hw-wing"><Bat size={24} color={alive ? 'var(--ds-ink)' : 'var(--ds-ink3)'} /></g></g>}
      {kind === 'mile' && <>
        <path d="M-9 22 V2 q0 -9 9 -9 q9 0 9 9 V22 Z" fill="var(--ds-card)" stroke={ink} strokeWidth="1.6" />
        <text x="0" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill={ink} fontFamily="var(--ds-head)">{no}</text>
        <line x1="-13" y1="22" x2="13" y2="22" stroke={ink} strokeWidth="1.2" />
      </>}
    </g>
  );
}
/* Расстановка без линейки: вид, смещение, размер и соседи у каждой остановки свои, но
   постоянные — из хэша id урока (дорога не «пляшет» при каждом открытии). Иногда у
   остановки пусто, иногда дерево с кустом; верстовой столб — изредка, с номером урока. */
const hashOf = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
/* убранство — между рядами остановок (y — середина между остановкой и следующей), у края, дальнего от
   дороги: под подписями остановок его нет */
function propsFor(id, i, W, y, left, spooky = false) {
  const r = rng(hashOf(id));
  if (r() < 0.18) return [];
  const pick = r();
  const kind = i % 5 === 3 && pick < 0.5 ? 'mile' : pick < 0.45 ? 'tree' : pick < 0.7 ? 'bush' : pick < 0.9 ? 'lamp' : 'tree';
  const side = (dx) => (left ? dx : W - dx);
  const main = { kind, x: side(24 + r() * 30), y: y - 8 + r() * 12, scale: 0.68 + r() * 0.3, flip: kind !== 'mile' && r() < 0.5 };
  const out = [main];
  // у дерева иногда куст рядом — пара, а не одиночка
  if (kind === 'tree' && r() < 0.45) out.push({ kind: 'bush', x: main.x + (left ? 1 : -1) * (14 + r() * 10), y: main.y + 8 + r() * 6, scale: 0.55 + r() * 0.2, flip: r() < 0.5 });
  // Хеллоуин (src/learn/halloween.js): кусты — тыквы, над деревом иногда летучая мышь; места те же
  if (!spooky) return out;
  const bat = r() < 0.5;
  return out.flatMap((p) => (p.kind === 'bush' ? [{ ...p, kind: 'pumpkin', flip: false, scale: p.scale * 0.8 }]
    : p.kind === 'tree' && bat ? [p, { kind: 'bat', x: p.x + 10, y: p.y - 34 * p.scale, scale: 0.8, flip: false }] : [p]));
}
/* Остановки дороги: уроки юнита и особые уроки между ними («Персоналии», «Чтение», «Работа над
   ошибками» — src/learn/stops.js). У особого — свой значок и цвет; «Работа над ошибками» — с меткой
   «сначала ошибки» и закрывает следующий урок. */
const EXTRA_ICON = { people: Users, read: Feather, graph: ChartSpline, draw: PenLine, fix: Wrench };

/* КАРТОЧКА ОСОБОГО УРОКА (docs/mechanics.md, «Особые уроки»): «Персоналии», «Чтение», «Разбор графика» —
   как у обычного урока: вид и место юнита, название, что внутри, ≈ минут и опыт, «Начать». Раньше касание
   остановки сразу открывало урок, без слова о том, что это и сколько займёт */
const lastName = (n) => n.split(' ').filter((w) => !/^[А-ЯЁA-Z]\.$/.test(w)).pop();
export function extraInfo(x) {
  if (x.type === 'people') {
    const g = PEOPLE_BY_ID[x.id];
    // знакомый из прошлого юнита — «снова»
    return g && { title: g.title, inside: `Три человека: ${g.people.map((p) => `${lastName(p.name)}${p.again ? ' (снова)' : ''}`).join(', ')} — портрет, годы жизни, главная идея и вопрос к каждому.`, min: 5, xp: MET_XP, unitId: g.unitId };
  }
  if (x.type === 'read') {
    const r = READING_BY_ID[x.id];
    const n = r ? r.pages.length : 0;
    return r && { title: r.title, inside: `${n} ${plural(n, 'цитата', 'цитаты', 'цитат')} из книг экономистов — кто, когда и зачем написал, и вопрос к каждой.`, min: Math.max(3, n + 1), xp: READ_XP, unitId: r.unitId };
  }
  if (x.type === 'graph') {
    const g = GRAPH_BY_ID[x.id];
    const n = g ? g.steps.length : 0;
    return g && { title: g.title, inside: `График собирается на глазах: ${n} ${plural(n, 'шаг', 'шага', 'шагов')}, на каждом — одна мысль простыми словами, в конце — вопрос на понимание.`, min: Math.max(2, Math.round(n * 0.35 + 1)), xp: GRAPH_XP, unitId: g.unitId };
  }
  if (x.type === 'draw') {
    const d = DRAW_BY_ID[x.id];
    const n = d ? d.tasks.length : 0;
    return d && { title: d.title, inside: `Постройте график сами: ${n} ${plural(n, 'шаг', 'шага', 'шагов')} — по условию отметить точки, провести и сдвинуть линии. Каждый шаг проверяется, после ошибки — подсказка.`, min: Math.max(3, Math.round(n * 0.8)), xp: DRAW_XP, unitId: d.unitId };
  }
  return null;
}
// чем алмазный уровень особого урока сложнее (docs/mechanics.md, «Особые уроки юнита»)
const EXTRA_GEM = {
  read: 'контекст цитаты — только после ответа, в конце — «Кто это сказал?»',
  people: 'в конце — «Чья это идея?»: идея без имени, кто её автор',
  graph: 'в каждом шаге пропущено главное слово или число — выберите его',
  draw: 'на каждый шаг — одна попытка, без подсказки',
};
// алмазы юнита — уроки и особые уроки вместе (пункт владельца 09.11: «квадратные не считаются»)
function unitGems(st, learn) {
  const ex = unitStops(st, learn).filter((x) => x.type !== 'lesson' && x.type !== 'fix');
  return { ex, n: st.lessons.filter((l) => l.diamond).length + ex.filter((x) => x.gem).length, of: st.lessons.length + ex.length };
}
function ExtraSheet({ x, onStart, onClose }) {
  const info = extraInfo(x);
  /* незаконченный особый урок — сохранён на сутки, как урок (src/learn-special.jsx, useSpecialResume); алмазный уровень —
     своё место (ключ с «:gem»): «Продолжить» и у него (пункт владельца 22.11, п. 4: «в обычном уроке предлагают продолжить,
     а в особенном такого нет») */
  const resumable = ['read', 'people', 'graph', 'draw'].includes(x.type);
  const resume = resumable ? getResume(`${x.type}:${x.id}`) : null;
  const gemResume = resumable ? getResume(`${x.type}:${x.id}:gem`) : null;
  if (!info) return null;
  const Icon = EXTRA_ICON[x.type] || BookOpen;
  const pl = placeOf(info.unitId);
  return (
    <Sheet label={`${EXTRA_KIND[x.type]}: ${info.title}`} onClose={onClose} testid="extra-sheet" data-extra={x.type} data-id={x.id} style={{ '--u': pl.color }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginRight: -8 }}><IconButton label="Закрыть" icon={X} data-nav="back" onClick={onClose} size={22} /></div>
      <div className="ln-ticket">
        <div className="ln-ticket-main">
          <div className="ds-eyebrow">{EXTRA_KIND[x.type]} · {pl.place}</div>
          <div className="ds-h2" style={{ marginTop: 4 }}>{info.title}</div>
          <div className="ds-num ds-sub ln-ticket-meta" data-testid="extra-meta">
            <span><Timer size={15} aria-hidden="true" />≈{info.min} мин</span>
            <span><Coins size={15} aria-hidden="true" />{x.done ? 'опыт получен' : `+${info.xp} опыта`}</span>
            {x.done && <span data-testid="extra-done-mark" style={{ color: x.gem ? DIAMOND_COLOR : 'var(--ds-ok)', fontWeight: 700 }}>{x.gem ? <Gem size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}{x.gem ? 'алмаз' : 'пройден'}</span>}
          </div>
        </div>
        <div className="ln-ticket-stub"><Icon size={30} aria-hidden="true" /></div>
      </div>
      <p className="ds-sub" style={{ fontSize: 15, lineHeight: 1.45, margin: '14px 2px 0' }} data-testid="extra-inside">{info.inside}</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {/* пройденный особый урок — и на алмазном уровне, у всех четырёх видов (пункты владельца 08.11 и 08.11, вечер) */}
        {x.done && EXTRA_GEM[x.type] && (
          <>
            <Button wide icon={Gem} data-testid="extra-gem" data-resume={gemResume ? 'true' : undefined} style={{ '--u': DIAMOND_COLOR }} onClick={() => { Audio.prime(); Audio.play('click'); onStart({ ...x, diamond: true }); }}>
              {gemResume ? 'Алмазный уровень — продолжить' : x.gem ? 'Алмазный уровень — ещё раз' : 'Алмазный уровень'}
            </Button>
            <div className="ds-faint" style={{ fontSize: 13.5, lineHeight: 1.4, textAlign: 'center', margin: '-2px 6px 2px' }} data-testid="extra-gem-what">
              Алмаз: {EXTRA_GEM[x.type]}; без единой ошибки{x.gem ? '' : ` — ${indexed(COIN.diamond)}–${indexed(COIN.diamond + COIN.diamondPerfect)} монет`}.
            </div>
          </>
        )}
        {/* вышли посреди — «Продолжить», как у обычного урока (пункт владельца 16.11); внутри урока полосы «Продолжаем…» нет */}
        <Button wide variant={x.done && EXTRA_GEM[x.type] && !resume ? 'ghost' : undefined} data-testid="extra-start" onClick={() => { Audio.prime(); Audio.play('click'); onStart(x); }}>{resume ? 'Продолжить' : x.done ? 'Открыть снова' : 'Начать'}</Button>
        {(resume || gemResume) && <div className="ds-faint" style={{ fontSize: 13, textAlign: 'center', marginTop: 2 }} data-testid="extra-resume-note">{resume && gemResume ? 'Урок и алмазный уровень сохранены' : gemResume ? 'Алмазный уровень сохранён' : 'Урок сохранён'} с того места, где вы вышли.</div>}
      </div>
    </Sheet>
  );
}
function Route({ st, stops, seen, reduced, visible, resumes, onLesson, onExtra = () => {}, rec = null, chest = null, onChest, spooky = false }) {
  // открытая остановка «Персоналии» — портреты её людей грузятся заранее, в фоне (docs/mechanics.md, «Персоналии»)
  const peopleOpen = stops.filter((x) => x.type === 'people' && x.open && !x.done).map((x) => x.id).join(',');
  useEffect(() => {
    if (!peopleOpen) return undefined;
    const go = () => peopleOpen.split(',').forEach((id) => { if (PEOPLE_BY_ID[id]) preloadPhotos(PEOPLE_BY_ID[id].people); });
    const idle = typeof window !== 'undefined' && window.requestIdleCallback;
    const h = idle ? window.requestIdleCallback(go, { timeout: 3000 }) : setTimeout(go, 1500);
    return () => (idle ? window.cancelIdleCallback(h) : clearTimeout(h));
  }, [peopleOpen]);
  const W = 300;
  // пройденный юнит — в конце дороги сундук
  const n = stops.length + (chest ? 1 : 0);
  const pts = Array.from({ length: n }, (_, i) => [W / 2 + ZIG[i % ZIG.length], i * ROW + 60]);
  const lastDone = stops.reduce((k, x, i) => ((x.type === 'lesson' ? x.l.done : x.done) ? i : k), -1);
  const seg = (list) => (list.length > 1 ? `M${list[0][0]},${list[0][1]}${curveTo(list)}` : '');
  return (
    <div className="ln-route" style={{ width: W, height: n * ROW + 10 }}>
      <svg viewBox={`0 0 ${W} ${n * ROW + 10}`} width={W} height={n * ROW + 10} aria-hidden="true">
        <path d={seg(pts)} fill="none" stroke="var(--ds-rule2)" strokeWidth="16" strokeLinecap="round" opacity=".55" />
        <path d={seg(pts)} fill="none" stroke="var(--ds-card)" strokeWidth="11" strokeLinecap="round" />
        <path d={seg(pts)} fill="none" stroke="var(--ds-rule2)" strokeWidth="1.5" strokeDasharray="6 7" />
        {lastDone >= 0 && <path d={seg(pts.slice(0, lastDone + 2))} fill="none" stroke="var(--u-ink)" strokeWidth="2.5" strokeDasharray="6 7" />}
        {stops.map((x, i) => {
          // между этой остановкой и следующей, у края, дальнего от дороги; после последней — не ставим
          if (!pts[i + 1]) return null;
          const mid = (pts[i][0] + pts[i + 1][0]) / 2;
          const left = mid > W / 2 || (mid === W / 2 && i % 2 === 0);
          const done = x.type === 'lesson' ? x.l.done : x.done;
          return propsFor(x.id, i, W, (pts[i][1] + pts[i + 1][1]) / 2, left, spooky).map((pp, k) => <Prop key={`${x.id}:${k}`} {...pp} alive={done} no={x.type === 'lesson' ? x.l.no : i + 1} />);
        })}
      </svg>
      {stops.map((x, i) => {
        if (x.type !== 'lesson') {
          const Icon = EXTRA_ICON[x.type] || BookOpen;
          const state = x.done ? 'done' : x.open ? 'open' : 'locked';
          // особый урок, которого ждёт следующий, — текущая остановка: «рекомендуем сейчас»
          const isRec = !x.done && rec === x.id;
          const ts = titleStyle(pts, i, W);
          return (
            <div key={x.id} className="ln-stop" style={{ left: pts[i][0], top: pts[i][1] - 31 }}>
              {isRec && <span className="ln-pin rec" data-testid="path-rec">рекомендуем сейчас</span>}
              <button type="button" className={`ln-token ln-extra ${x.type} ${state === 'open' ? '' : state} ${x.gem ? 'diamond' : ''} ${isRec ? 'cur' : ''}`} data-testid="path-extra" data-extra={x.type} data-id={x.id} data-state={state} data-rec={isRec ? 'true' : undefined} data-diamond={x.gem ? 'true' : undefined}
                data-nav-target={`extra:${x.id}`} aria-label={`${EXTRA_KIND[x.type]}: ${x.title}${x.done ? ', пройдено' : x.open ? '' : ', закрыто'}`}
                onClick={() => { Audio.prime(); Audio.play('click'); onExtra(x); }}>
                {x.open || x.done ? <Icon size={25} /> : <Lock size={22} />}
                {x.done && <span className={`ln-seal ${x.gem ? 'diamond' : ''}`} aria-hidden="true">{x.gem ? <Gem size={13} strokeWidth={2.6} /> : <Check size={13} strokeWidth={3.2} />}</span>}
                {x.type === 'fix' && <span className="ln-fix-count" data-testid="path-fix-count" aria-hidden="true">{x.count}</span>}
              </button>
              <button type="button" className={`ln-stop-title ln-extra-title side-${ts.side} ${x.open || x.done ? '' : 'locked'}`} tabIndex={-1} aria-hidden="true"
                data-testid="path-extra-title" data-side={ts.side} style={ts.style}
                onClick={() => { Audio.play('click'); onExtra(x); }}><small>{x.type === 'fix' ? (resumes.has(x.id) ? 'продолжить — ошибки юнита' : 'сначала — ошибки юнита')
                  : resumes.has(`${x.type}:${x.id}`) || resumes.has(`${x.type}:${x.id}:gem`) ? `продолжить — ${EXTRA_KIND[x.type].toLowerCase()}` : EXTRA_KIND[x.type]}</small>{x.title}</button>
            </div>
          );
        }
        const l = x.l;
        const isCur = st.current && st.current.id === l.id;
        const isRec = rec === l.id;
        const lesson = LESSON_BY_ID[l.id];
        const unlocking = !reduced && visible && l.open && !l.done && !seen.has(l.id);
        const KindIcon = KIND_ICON[lesson.kind] || Dumbbell;
        const cls = l.done ? `done${l.diamond ? ' diamond' : ''}` : l.skipped ? 'skipped' : l.open ? '' : 'locked';
        const ts = titleStyle(pts, i, W);
        return (
          <div key={l.id} className="ln-stop" style={{ left: pts[i][0], top: pts[i][1] - 31 }}>
            {/* отметка: прерванный урок — «продолжить»; программа советует — «рекомендуем сейчас» */}
            {(isCur || isRec) && (
              <span className={`ln-pin ${isRec && !resumes.has(l.id) ? 'rec' : ''}`} data-testid={isRec ? 'path-rec' : undefined}>
                {resumes.has(l.id) ? 'продолжить' : isRec ? 'рекомендуем сейчас' : 'вы здесь'}
              </span>
            )}
            <button type="button" className={`ln-token ${cls} ${isCur ? 'cur' : ''}`} data-testid="path-lesson" data-lesson={l.id} data-kind={lesson.kind} data-rec={isRec ? 'true' : undefined}
              data-state={l.done ? 'done' : l.open ? 'open' : 'locked'} data-diamond={l.diamond ? 'true' : undefined} data-skipped={l.skipped ? 'true' : undefined} data-nav-target={`lesson:${l.id}`}
              aria-label={`${LESSON_KIND[lesson.kind]} ${l.no}: ${l.title}${l.diamond ? ', взят на алмазном уровне' : l.done ? ', пройден' : l.skipped ? ', пропущен' : l.open ? '' : ', закрыт'}`}
              onClick={() => { Audio.prime(); Audio.play('click'); onLesson(l); }}>
              {l.done ? <><KindIcon size={26} /><span className={`ln-seal ${l.diamond ? 'diamond' : ''}`} aria-hidden="true">{l.diamond ? <Gem size={13} strokeWidth={2.6} /> : <Check size={13} strokeWidth={3.2} />}</span></>
                : unlocking ? (
                  <span style={{ position: 'relative', display: 'inline-flex' }} data-testid="unlock-anim">
                    <Lock size={24} className="ds-unlock" style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
                    <KindIcon size={26} className="ds-appear" style={{ animationDelay: '.7s', animationFillMode: 'backwards' }} />
                  </span>
                ) : l.open ? <KindIcon size={26} /> : <Lock size={22} />}
            </button>
            {/* название — тоже кнопка урока: в жетон на телефоне попадают не всегда; сбоку, шириной до края
                дороги — не вылезает за экран узкого телефона */}
            <button type="button" className={`ln-stop-title side-${ts.side} ${l.open ? '' : 'locked'}`} tabIndex={-1} aria-hidden="true" data-testid="path-lesson-title" data-lesson={l.id}
              data-side={ts.side} style={ts.style}
              onClick={() => { Audio.play('click'); onLesson(l); }}>{l.title}{l.skipped && <span className="ln-skip-tag"> · пропущен</span>}</button>
          </div>
        );
      })}
      {chest && (
        <div className="ln-stop ln-stop-chest" style={{ left: pts[n - 1][0], top: pts[n - 1][1] - 31 }}>
          <button type="button" className="ln-chest" data-testid="chest" data-unit={chest.unitId} data-opened={String(chest.opened)} data-nav-target={`chest:${chest.unitId}`}
            aria-label={chest.opened ? 'Сундук юнита открыт' : 'Сундук юнита: открыть'} onClick={() => { Audio.play('click'); onChest(chest.unitId); }}>
            <span className="ln-chest-art"><Chest size={60} open={false} spent={chest.opened} label={chest.opened ? 'Сундук открыт' : 'Сундук юнита'} /></span>
            <span>{chest.opened ? 'Сундук открыт' : 'Сундук юнита'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* Живая модель юнита: свёрнутая — одной строкой (что это, сколько деталей собрано), касание
   раскрывает саму модель (улица, график, ползунки), «Свернуть» — обратно. На телефоне она
   свёрнута, пока её не откроют; на ПК (side — правая колонка) открыта, но тоже сворачивается,
   и выбор запоминается на устройстве. */
const MODEL_SIDE_KEY = 'ems-model-side-open';
/* Знакомство с моделью (жалоба: «живая модель никак не вводится — можно даже не знать, что она есть»):
   в первый раз под юнитом — карточка «Новое»: что это, как она собирается и кнопка «Открыть модель».
   «Понятно» или открытие — и дальше обычная строка. Помним по юнитам на устройстве. */
const MODEL_INTRO_KEY = 'ems-model-intro';
const introSeen = () => { try { return JSON.parse(localStorage.getItem(MODEL_INTRO_KEY) || '[]'); } catch { return []; } };
function ModelFold({ unitId, learn, side = false }) {
  const [open, setOpenRaw] = useState(() => {
    if (!side) return false;
    try { return localStorage.getItem(MODEL_SIDE_KEY) !== '0'; } catch { return true; }
  });
  const setOpen = (v) => {
    setOpenRaw(v);
    if (side) { try { localStorage.setItem(MODEL_SIDE_KEY, v ? '1' : '0'); } catch { /* приватный режим */ } }
  };
  const prog = modelProgress(unitId, learn);
  const gap = side ? 0 : 10;
  const [intro, setIntro] = useState(() => !introSeen().includes(unitId));
  const dismiss = () => {
    setIntro(false);
    try { localStorage.setItem(MODEL_INTRO_KEY, JSON.stringify([...new Set([...introSeen(), unitId])])); } catch { /* приватный режим */ }
  };
  if (intro && !open) {
    return (
      <Card className="ln-model-intro" style={{ marginTop: gap }} data-testid="model-intro">
        <div className="ln-model-intro-top">
          <span className="ln-model-intro-thumb"><ModelThumb empty={!prog.open} supply={modelParts(unitId, learn).some((x) => x.id === 'supply' && x.open)} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="ds-eyebrow" style={{ display: 'block' }}><span className="ln-new-pill">Новое</span> Живая модель юнита</span>
            <span className="ds-h3" style={{ display: 'block', marginTop: 2 }}>Рынок, который можно покрутить</span>
          </span>
        </div>
        <div className="ds-text" style={{ fontSize: 15, marginTop: 8 }}>
          Каждый урок юнита добавляет в модель деталь: спрос, предложение, налог. Двигайте ползунки — и смотрите, как меняются цена, очередь и выручка кофейни.
          {' '}{prog.open ? `Уже собрано: ${prog.open} из ${prog.total} ${plural(prog.total, 'детали', 'деталей', 'деталей')}.` : 'Первая деталь появится после первого урока юнита.'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {prog.open > 0 && <Button small data-testid="model-intro-open" onClick={() => { Audio.play('paper'); dismiss(); setOpen(true); }}>Открыть модель</Button>}
          <Button small variant="ghost" data-testid="model-intro-ok" onClick={() => { Audio.play('tick'); dismiss(); }}>Понятно</Button>
        </div>
      </Card>
    );
  }
  if (open) {
    return (
      <Card style={{ marginTop: gap }} data-testid="model-open">
        <Lazy><MarketModel unitId={unitId} learn={learn} /></Lazy>
        <Button variant="ghost" small icon={ChevronDown} data-testid="model-fold-close" style={{ marginTop: 6 }} onClick={() => { Audio.play('paper'); setOpen(false); }}>Свернуть модель</Button>
      </Card>
    );
  }
  return (
    <Card style={{ marginTop: gap, padding: 0 }}>
      <button type="button" className="ln-fold-row" data-testid="model-fold" data-open={prog.open} aria-expanded="false" onClick={() => { Audio.play('paper'); setOpen(true); }}>
        <ModelThumb empty={!prog.open} supply={modelParts(unitId, learn).some((x) => x.id === 'supply' && x.open)} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="ds-eyebrow" style={{ display: 'block' }}>Живая модель юнита</span>
          <span style={{ font: '700 15px var(--ds-head)', display: 'block' }}>{prog.open ? 'Рынок капучино — покрутите' : 'Соберётся по ходу юнита'}</span>
          <span className="ln-fold-prog">
            <span className="ln-fold-bar" aria-hidden="true"><i style={{ width: `${(prog.open / Math.max(1, prog.total)) * 100}%` }} /></span>
            <span className="ds-sub" style={{ fontSize: 12.5 }}>{prog.open} из {prog.total} {plural(prog.total, 'детали', 'деталей', 'деталей')}</span>
          </span>
        </span>
        <ChevronRight size={18} color="var(--ds-ink3)" aria-hidden="true" />
      </button>
    </Card>
  );
}
// «К карте»: видна, пока карта Пути за верхом экрана
function ToMap({ target }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  if (!show) return null;
  return (
    <button type="button" className="ln-to-map" data-testid="to-map" aria-label="Наверх, к карте" title="Наверх, к карте" onClick={() => { Audio.play('paper'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
      <ArrowUp size={22} aria-hidden="true" />
    </button>
  );
}
// урок, к которому ведёт Путь: «рекомендуем», иначе текущий, иначе первый открытый
const focusLesson = (root, unitId = null) => {
  if (!root) return null;
  const scope = unitId ? root.querySelector(`[data-testid="path-unit"][data-unit="${unitId}"]`) : root;
  if (!scope) return null;
  return scope.querySelector('[data-testid="path-lesson"][data-rec="true"]') || scope.querySelector('.ln-token.cur') || (unitId ? null : scope.querySelector('[data-testid="level-review"][data-cur="true"]'))
    || scope.querySelector('[data-testid="path-lesson"][data-state="open"]');
};

/* Юниты Пути: номер, место, уровень; reach — в юните есть открытый урок. */
const pathUnits = (states) => UNITS.map((u, k) => ({ u, no: k + 1, st: states.find((x) => x.course.id === u.id), pl: placeOf(u.id), lv: levelOf(u.id) }))
  .filter((x) => x.st).map((x) => ({ ...x, reach: x.st.lessons.some((l) => l.open) }));
/* Уровни Пути: юниты с уроками на каждом уровне; open — в уровне есть открытый урок (туда можно
   перейти), done — сколько юнитов пройдено или сдано, soon — готовых юнитов пока нет. test — у
   первого закрытого уровня после открытых: его открывает тест предыдущего уровня (prev). */
function pathLevels(list) {
  const rows = LEVELS.map((lv, k) => {
    const units = list.filter((x) => x.u.level === lv.id);
    return { lv: { ...lv, no: k + 1 }, units, open: units.some((x) => x.reach), done: units.filter((x) => x.st.complete || x.st.tested).length, soon: !units.length };
  });
  const real = rows.filter((x) => !x.soon);
  const k = real.findIndex((x) => !x.open);
  if (k > 0) real[k].test = real[k - 1].lv.id;
  return rows;
}
const levelColor = (row) => (row.units[0] ? row.units[0].pl.color : 'var(--ds-ink3)');
function levelStatus(row, levels) {
  if (row.soon) return 'строится — гайды готовых глав уже можно читать';
  const cur = row.units.find((x) => x.st.current);
  if (row.done === row.units.length && row.units.every((x) => x.st.complete)) return `пройден · юнитов ${row.units.length} из ${row.units.length}`;
  if (row.open) return `${cur ? `сейчас: «${cur.st.current.title}» · ` : ''}юнитов пройдено ${row.done} из ${row.units.length}`;
  if (row.test) return `тест по уровню «${LEVEL_BY_ID[row.test].title}»: сдадите — этот уровень откроется`;
  const before = levels.slice(0, row.lv.no - 1).reverse().find((x) => !x.soon && !x.open);
  return `закрыт · сначала откройте уровень «${(before || row).lv.title}»`;
}

/* «Большое повторение» — остановка под последним юнитом уровня (docs/mechanics.md, «Большое повторение: в конце
   каждого уровня»): закрыта, пока не пройдены все юниты уровня; открыта — «Начать»; пройдена — лучший результат и
   печать «Уровень подтверждён» (80%+), можно пройти ещё раз. cur — это следующая остановка Пути. */
function LevelReviewStop({ review, learn, color, locked, cur, onStart }) {
  const rec = (learn.levels || {})[review.levelId] || {};
  const ok = levelConfirmed(learn, review.levelId);
  const done = review.done;
  const lv = LEVEL_BY_ID[review.levelId];
  const state = locked ? 'locked' : done ? 'done' : 'open';
  return (
    <Card className={`ln-lvrev${cur ? ' cur' : ''}`} style={{ '--u': color }} data-testid="level-review" data-level={review.levelId} data-state={state} data-ok={String(ok)} data-cur={String(!!cur)}>
      <div className="ln-lvrev-in">
        <span className="ln-lvrev-icon" aria-hidden="true">{locked ? <Lock size={22} /> : ok ? <Award size={24} /> : <Flag size={22} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ds-eyebrow">Большое повторение{cur ? ' · следующая остановка' : ''}</div>
          <div className="ds-h3" style={{ color: 'var(--u-ink)' }}>{lv.title} уровень</div>
          <div className="ds-sub" style={{ fontSize: 14, lineHeight: 1.4 }} data-testid="level-review-text">
            {locked ? `Откроется, когда пройдены все юниты уровня: ${LEVEL_REVIEW_SIZE} заданий по нему и прошлым уровням.`
              : done ? (ok ? `Уровень подтверждён · лучший результат ${rec.best || 0}%` : `Пройдено · лучший результат ${rec.best || 0}%. Подтвердить уровень — от ${LEVEL_REVIEW_OK}% верных`)
                : `${LEVEL_REVIEW_SIZE} заданий по этому уровню и прошлым, минут на шесть. Это повторение: результат Путь не закроет.`}
          </div>
        </div>
        {ok && <span className="ln-lvrev-seal" data-testid="level-review-seal" aria-label="Уровень подтверждён"><Check size={16} strokeWidth={3} /></span>}
      </div>
      {!locked && <Button wide={!done} variant={done ? 'ghost' : 'primary'} small={done} icon={done ? RotateCcw : ArrowRight} data-testid="level-review-start" onClick={onStart}>{done ? 'Пройти ещё раз' : 'Начать'}</Button>}
    </Card>
  );
}

/* Плашка уровня наверху Пути: номер, название, «из скольких» и сколько юнитов пройдено.
   ‹ — на уровень назад, › — на следующий, если он открыт; закрыт — замок, касание открывает
   список уровней с тестом. Касание плашки — тот же список. */
function LevelSwitch({ levels, sel, onSel, onOpen }) {
  const real = levels.filter((x) => !x.soon);
  const k = real.findIndex((x) => x.lv.id === sel);
  const cur = real[k]; const prev = real[k - 1]; const next = real[k + 1];
  const nextLocked = !!(next && !next.open);
  const prevLocked = !!(prev && !prev.open);
  return (
    <div className="ln-switch" data-testid="level-switch" data-level={sel} style={{ '--u': levelColor(cur) }}>
      <IconButton label={!prev ? 'Это первый уровень' : prevLocked ? `Уровень «${prev.lv.title}» закрыт` : `Уровень назад: «${prev.lv.title}»`} icon={prevLocked ? Lock : ChevronLeft} size={prevLocked ? 20 : 24}
        className="ln-switch-arrow" data-testid="level-prev" data-locked={String(prevLocked)} disabled={!prev}
        onClick={() => { if (!prev) return; Audio.play('paper'); if (prevLocked) onOpen(prev.lv.id); else onSel(prev.lv.id); }} />
      <button type="button" className="ln-switch-plate" data-testid="level-switch-open" aria-haspopup="dialog" aria-label={`Уровень ${cur.lv.no} из ${LEVELS.length}: ${cur.lv.title}. Выбрать уровень`}
        onClick={() => { Audio.play('paper'); onOpen(); }}>
        <span className="ln-unit-no" aria-hidden="true">{cur.lv.no}</span>
        <span className="ln-switch-txt">
          <span className="ds-eyebrow">Уровень {cur.lv.no} из {LEVELS.length}</span>
          <span className="ln-switch-place">{cur.lv.title} <span className="ln-switch-count">юнитов {cur.done} из {cur.units.length}</span></span>
        </span>
        <ChevronDown size={20} color="var(--ds-ink3)" aria-hidden="true" />
      </button>
      <IconButton label={!next ? 'Дальше уровни строятся' : nextLocked ? `Уровень «${next.lv.title}» закрыт: пройти тест` : `Следующий уровень: «${next.lv.title}»`} icon={nextLocked ? Lock : ChevronRight} size={nextLocked ? 20 : 24}
        className="ln-switch-arrow" data-testid="level-next" data-locked={String(nextLocked)} disabled={!next}
        onClick={() => { if (!next) return; Audio.play('paper'); if (nextLocked) onOpen(next.lv.id); else onSel(next.lv.id); }} />
    </div>
  );
}

/* Список уровней: в открытый — перейти, у первого закрытого — «Пройти тест» (тест предыдущего
   уровня), дальние закрытые — после него, уровни без готовых юнитов — «строится». */
function LevelPicker({ levels, sel, focus, onSel, onTest, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current && ref.current.querySelector(`[data-level="${focus || sel}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [focus, sel]);
  return (
    <Sheet label="Уровни Пути" onClose={onClose} testid="level-picker">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <IconButton label="Закрыть" icon={X} data-nav="back" onClick={onClose} />
        <div className="ds-h3" style={{ flex: 1 }}>Уровни Пути</div>
      </div>
      <div className="ds-sub" style={{ fontSize: 13.5, margin: '0 0 10px' }}>На Пути — юниты одного уровня. Назад можно всегда; следующий уровень откроется, когда пройдёте уроки уровня или сдадите его тест.</div>
      <div className="ln-pick" ref={ref}>
        {levels.map((x) => {
          const state = x.soon ? 'soon' : x.open ? (x.units.every((y) => y.st.complete) ? 'done' : 'open') : 'locked';
          const body = (
            <>
              <span className="ln-unit-no" aria-hidden="true">{x.lv.no}</span>
              <span className="ln-pick-txt">
                <span className="ln-pick-title" style={{ display: 'block', color: x.open ? 'var(--u-ink)' : 'var(--ds-ink2)' }}>{x.lv.title}</span>
                <span className="ln-pick-sub" style={{ display: 'block' }}>{x.lv.text}</span>
                {x.units.length > 0 && <span className="ln-pick-sub" style={{ display: 'block' }}>Юниты: {x.units.map((y) => y.pl.place).join(' · ')}</span>}
                <span className="ln-pick-sub" style={{ display: 'block', fontWeight: 600 }} data-testid="level-pick-status">{levelStatus(x, levels)}</span>
                {x.test && (
                  <span style={{ display: 'block', marginTop: 8 }}>
                    <Button small variant={x.lv.id === focus ? 'primary' : 'secondary'} icon={Sparkles} data-testid="level-pick-test" data-nav-target={`check:level:${x.test}`}
                      onClick={() => { Audio.prime(); onTest(x.test, x.lv.id); }}>Пройти тест</Button>
                  </span>
                )}
              </span>
            </>
          );
          if (x.open) {
            return (
              <button key={x.lv.id} type="button" className="ln-pick-row" data-testid="level-pick" data-level={x.lv.id} data-state={state} aria-current={x.lv.id === sel ? 'true' : undefined}
                style={{ '--u': levelColor(x) }} onClick={() => { Audio.play('paper'); onSel(x.lv.id); }}>
                {body}
                {x.lv.id === sel ? <Check size={20} color="var(--u-ink)" aria-label="сейчас на экране" /> : <ChevronRight size={20} color="var(--ds-ink3)" aria-hidden="true" />}
              </button>
            );
          }
          return (
            <div key={x.lv.id} className="ln-pick-row" data-testid="level-pick" data-level={x.lv.id} data-state={state}
              style={{ '--u': levelColor(x), ...(x.soon ? { background: 'transparent', borderStyle: 'dashed' } : {}) }}>
              {body}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/* Выбранный уровень Пути помнится и после ухода на другую вкладку (экран Пути при этом
   закрывается) — пока не сменился текущий уровень; jump — уровень, который откроет сдаваемый тест. */
let pathMem = { level: null, cur: null, jump: null, folded: 0 };

/* Свёртка пройденного юнита после сундука: тело юнита (модель и дорога) плавно сжимается в ноль,
   соседи снизу подъезжают — без скачка прокрутки. */
function Collapse({ closing, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !closing) return;
    el.style.maxHeight = `${el.scrollHeight}px`; el.style.overflow = 'hidden';
    void el.offsetHeight;
    el.style.transition = 'max-height .62s cubic-bezier(.4,0,.2,1), opacity .4s ease, transform .62s ease';
    el.style.maxHeight = '0px'; el.style.opacity = '0'; el.style.transform = 'scale(.97)';
  }, [closing]);
  return <div ref={ref} className="ln-unit-body">{children}</div>;
}

function PathView({ learn, update, onLesson, onStart, onOpenBook, onChest, onTasks, onExtra = () => {}, visible, homeTick = 0, folded: foldReq = null, bell = null, races = null }) {
  const states = pathState(learn);
  const rec = recommend(learn, states);
  const recTitle = rec ? rec.title || LESSON_BY_ID[rec.lessonId].title : null;
  const askPlacement = !!(learn.profile && learn.profile.knows) && !(learn.placement && learn.placement.at);
  const sleepy = missedYesterday(learn);
  const g = goalToday(learn);
  const hello = g.done >= g.goal ? 'joy' : sleepy ? 'sleep' : 'hello';
  const first = states.find((x) => x.current) || states[0];
  // уровень текущего юнита — «Миру» (хранится наибольший): с «Среднего» продвинутые панели партии открыты сразу
  const levelNo = reachedLevel(states);
  useEffect(() => { writeLearnLevel(Math.max(0, levelNo)); }, [levelNo]);
  const [soonOpen, setSoonOpen] = useState(false);
  /* На Пути — юниты одного уровня. По умолчанию — уровень, где ученик сейчас (иначе последний
     открытый); выбранный вручную держится, пока текущий уровень не сменился. Сданный тест
     уровня — сразу на открытом им уровне. */
  const list = pathUnits(states);
  const levels = pathLevels(list);
  const curUnit = first && first.current ? list.find((x) => x.u.id === first.course.id) : [...list].reverse().find((x) => x.reach) || list[0];
  const curLevel = curUnit ? curUnit.u.level : null;
  const [chosen, setChosenState] = useState(() => (pathMem.cur === curLevel ? pathMem.level : null));
  const setChosen = (id) => { pathMem = { ...pathMem, level: id, cur: curLevel }; setChosenState(id); };
  const [picker, setPicker] = useState(null); // null — закрыт, иначе { focus }
  useEffect(() => { if (pathMem.cur !== curLevel) { pathMem = { ...pathMem, level: null, cur: curLevel }; setChosenState(null); } }, [curLevel]);
  const openLevel = (id) => levels.some((x) => x.lv.id === id && x.open);
  useEffect(() => {
    const id = pathMem.jump;
    if (id && openLevel(id)) { pathMem = { level: id, cur: curLevel, jump: null }; setChosenState(id); }
  });
  const sel = chosen && openLevel(chosen) ? chosen : curLevel;
  const selRow = levels.find((x) => x.lv.id === sel);
  const shown = list.filter((x) => x.u.level === sel);
  /* Пройденный юнит с открытым сундуком сворачивается в одну карточку: уровень не уезжает
     вниз длинной лентой. Развернуть — по кнопке, на время этого экрана. */
  const [unfolded, setUnfolded] = useState({});
  const resumes = new Set(resumeIds());
  /* Замок открывшегося урока анимируется один раз, когда Путь снова на виду (урок и билет
     его закрывают). При первом запуске уже открытое — без анимации. */
  const reduced = useReducedMotion();
  const openIds = states.flatMap((s) => s.lessons.filter((l) => l.open).map((l) => l.id));
  const [seen, setSeen] = useState(() => readSeen() || new Set(openIds));
  useEffect(() => {
    if (!visible) return undefined;
    const fresh = openIds.filter((id) => !seen.has(id));
    if (!fresh.length) { writeSeen(seen); return undefined; }
    const t = setTimeout(() => { const next = new Set([...seen, ...fresh]); writeSeen(next); setSeen(next); }, 1600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds.join(), visible]);
  /* Выбор уровня в списке — его юниты на экране, к уроку, который советует Путь; касание места
     на карте — к этому юниту (уровень закрыт — список уровней с тестом). При открытии Путь
     сразу стоит на рекомендованном уроке — посередине экрана. */
  const rootRef = useRef(null);
  const atlasRef = useRef(null);
  const [scrollTo, setScrollTo] = useState({ n: 0, unit: null });
  const show = (levelId, unit = null) => { setPicker(null); setChosen(levelId); setScrollTo((x) => ({ n: x.n + 1, unit })); };
  // касание места на карте: юнит на дороге, свёрнутый — раскрыт
  const pick = (unitId) => {
    const x = list.find((y) => y.u.id === unitId);
    if (x && openLevel(x.u.level)) { setUnfolded((m) => ({ ...m, [unitId]: true })); show(x.u.level, unitId); } else if (x) setPicker({ focus: x.u.level });
  };
  useEffect(() => {
    if (!scrollTo.n) return;
    const lesson = focusLesson(rootRef.current, scrollTo.unit);
    const el = lesson || (scrollTo.unit && document.getElementById(`unit-${scrollTo.unit}`));
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: lesson ? 'center' : 'start' });
  }, [scrollTo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const center = () => {
      const el = focusLesson(rootRef.current);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'auto', block: 'center' });
    };
    center();
    /* Шрифты догрузились после первой прокрутки — строки над уроком перенеслись иначе, и урок
       уехал от середины (на 17 пикселей на телефоне). Поставить его заново, если ученик ещё не
       листал и не касался экрана. Сверять scrollY нельзя: браузер сам сдвигает прокрутку, когда
       текст выше подрастает (scroll anchoring), — это не ученик листал. Ждём только первые секунды. */
    let alive = true; let touched = false;
    const stop = () => { touched = true; };
    const again = () => { if (alive && !touched) center(); };
    const evs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    evs.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    const fonts = document.fonts;
    if (fonts && fonts.ready) fonts.ready.then(again);
    if (fonts && fonts.addEventListener) fonts.addEventListener('loadingdone', again);
    const off = () => { alive = false; evs.forEach((e) => window.removeEventListener(e, stop)); if (fonts && fonts.removeEventListener) fonts.removeEventListener('loadingdone', again); };
    const t = setTimeout(off, 4000);
    return () => { clearTimeout(t); off(); };
  }, []);
  /* Сундук открыт (docs/mechanics.md, «Навигация»): Путь подводит шапку юнита к верху экрана, дорога
     юнита сворачивается, юнит становится строкой — и Путь сам едет к рекомендованному уроку. */
  const [folding, setFolding] = useState(null);
  const [justFolded, setJustFolded] = useState(null);
  useEffect(() => {
    // запрос на сворачивание — разовый: Путь пересоздаётся при каждом возвращении на вкладку, и без
    // отметки «уже свернули» пройденный юнит разворачивался и сворачивался заново при каждом входе
    if (!foldReq || !foldReq.n || pathMem.folded === foldReq.n) return undefined;
    pathMem = { ...pathMem, folded: foldReq.n };
    const unit = foldReq.unit;
    const head = document.getElementById(`unit-${unit}`);
    if (reduced || !head) { setScrollTo((x) => ({ n: x.n + 1, unit: null })); return undefined; }
    setFolding(unit);
    head.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const t1 = setTimeout(() => setFolding((f) => (f === unit ? `${unit}:closing` : f)), 420);
    const t2 = setTimeout(() => { setFolding(null); setJustFolded(unit); setScrollTo((x) => ({ n: x.n + 1, unit: null })); }, 1100);
    const t3 = setTimeout(() => setJustFolded(null), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [foldReq && foldReq.n]); // eslint-disable-line react-hooks/exhaustive-deps
  /* повторное касание вкладки «Путь» — снова текущий уровень и рекомендованный урок, где бы ни был экран.
     Считается только новое касание: Путь пересоздаётся при каждом возвращении на вкладку, и старый
     счётчик при этом сбрасывал выбранный уровень (сыграл алмазный урок на прошлом уровне, зашёл в лавку —
     и снова на текущем) */
  const homeSeen = useRef(homeTick);
  useEffect(() => {
    if (homeTick === homeSeen.current) return;
    homeSeen.current = homeTick;
    setChosen(null); setPicker(null); setScrollTo((x) => ({ n: x.n + 1, unit: null }));
  }, [homeTick]);
  // строящиеся юниты выбранного уровня — строкой внизу; будущих уровней на Пути не видно
  const soon = UNITS.map((u, k) => ({ u, no: k + 1 })).filter(({ u }) => u.level === sel && !states.some((x) => x.course.id === u.id));
  /* ПК (от 1024 px): две колонки — слева карта и юниты уровня, справа закреплены задания дня и
     живая модель юнита этого уровня (под самим юнитом её тогда нет). На телефоне — одна колонка. */
  const wide = useWide();
  const sideModel = wide ? ((shown.find((x) => hasModel(x.u.id)) || { u: {} }).u.id || null) : null;
  return (
    <div ref={rootRef} className={`ln-wrap${wide ? ' ln-path-wide' : ''}`} data-testid="path" data-layout={wide ? 'columns' : 'column'}>
      {/* у каждого экрана один h1 (docs/mechanics.md, «Доступность»); на Пути он не виден — экран начинается с плашки уровня */}
      <h1 className="ds-sr">Путь</h1>
      <div className="ln-path-main">
      <TopStats learn={learn} bell={bell} />
      {TRACK === 'politics' && <div className="ln-track" data-testid="track-badge"><Landmark size={15} aria-hidden="true" />Курс «Политология» — проба для команды</div>}
      {!wide && <TasksEntry learn={learn} onOpen={onTasks} />}
      {!wide && races}
      {!wide && <HalloweenCard learn={learn} update={update} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Mascot mood={hello} size={44} />
        <div className="ds-sub" style={{ fontSize: 15, lineHeight: 1.4 }}>
          {rec && rec.weak ? `Слабое место — «${LESSON_BY_ID[rec.weak.lessonId].title}»: его задачи первыми придут в «Повторение». А дальше по Пути — «${recTitle}».`
            : g.done >= g.goal ? 'Цель дня выполнена — можно и дальше.' : sleepy ? 'Инфля заскучала. Одна остановка — и снова в пути.' : first && first.current ? `Следующая остановка: «${first.current.title}»` : 'Уроки по 3–5 минут.'}
        </div>
      </div>
      {askPlacement && <PlacementCard onStart={() => onStart({ mode: 'placement' })} onSkip={() => { Audio.play('paper'); update((s) => setPlacement(s, [])); }} />}
      <div ref={atlasRef}><Atlas states={states} sel={shown.map((x) => x.u.id)} onPick={pick} /></div>
      <ToMap target={atlasRef} />
      {selRow && <LevelSwitch levels={levels} sel={sel} onSel={show} onOpen={(focus = null) => setPicker({ focus })} />}
      {picker && <LevelPicker levels={levels} sel={sel} focus={picker.focus} onSel={show} onClose={() => setPicker(null)}
        onTest={(levelId, target) => {
          setPicker(null); pathMem = { ...pathMem, jump: target };
          onStart({ mode: 'check', levelId, unitId: (levels.find((x) => x.lv.id === levelId).units[0] || { u: {} }).u.id });
        }} />}
      {selRow && <div className="ds-sub ln-level-text" data-testid="path-level" data-level={sel}>{selRow.lv.text}</div>}
      {shown.map(({ u, no, st, pl }) => {
        const isFolding = !!folding && folding.split(':')[0] === u.id;
        const folded = st.complete && hasClaim(learn, chestKey(u.id)) && !unfolded[u.id] && !isFolding;
        return (
        <section key={u.id} id={`unit-${u.id}`} data-testid="path-unit" data-unit={u.id} data-folded={String(folded)} data-folding={isFolding ? 'true' : undefined}
          className={justFolded === u.id ? 'ln-just-folded' : undefined} style={{ '--u': pl.color, scrollMarginTop: 64 }}>
          {/* шапка юнита — как купюра своего достоинства: гильош, номер, место и здание;
              пройденный и свёрнутый — одной строкой */}
          {folded ? (
            <Card className="ln-bill-mini">
              {/* корешок билета: гравюра места с печатью «пройден», за перфорацией — название и уроки */}
              <span className="ln-mini-stub" aria-hidden="true">
                <Engraving kind={pl.building} alive size={50} color={pl.color} />
                <span className="ln-mini-seal"><Check size={12} strokeWidth={3.2} /></span>
              </span>
              <button type="button" className="ln-mini-main" data-testid="unit-fold" aria-expanded="false"
                aria-label={`Юнит ${no}, ${pl.place}, пройден. Показать уроки: ${st.lessons.length}`}
                onClick={() => { Audio.play('paper'); setUnfolded((m) => ({ ...m, [u.id]: true })); }}>
                <span className="ln-mini-eyebrow">Юнит {no} · пройден</span>
                <span className="ds-h3 ln-mini-title">{pl.place}</span>
                <span className="ln-mini-meta">
                  <span className="ln-mini-strip" aria-hidden="true">{st.lessons.map((l) => <i key={l.id} data-d={l.diamond ? '1' : undefined} />)}{unitGems(st, learn).ex.map((x) => <i key={x.id} data-d={x.gem ? '1' : undefined} />)}</span>
                  <span data-testid="unit-diamonds" data-n={unitGems(st, learn).n} data-of={unitGems(st, learn).of}><Gem size={13} style={{ verticalAlign: -2, color: DIAMOND_COLOR }} aria-hidden="true" /> {unitGems(st, learn).n}/{unitGems(st, learn).of}</span>
                </span>
                <span className="ln-mini-open" aria-hidden="true"><ChevronDown size={18} /></span>
              </button>
              <IconButton label="Гайд юнита" icon={BookOpenText} size={20} className="ln-mini-guide" data-testid="unit-guide" data-nav-target={`book:chapter:${u.id}`} onClick={() => { Audio.play('paper'); onOpenBook({ kind: 'chapter', id: u.id }); }} />
            </Card>
          ) : (
          <Card className="ln-bill">
            <Guilloche height={16} opacity={0.45} />
            <div className="ln-bill-in">
              <Rosette size={58} opacity={0.5}><span className="ln-bill-no">{no}</span></Rosette>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ds-eyebrow">Юнит {no}{st.complete ? ' · пройден' : ''}</div>
                <div className="ds-h2" style={{ color: 'var(--u-ink)' }}>{pl.place}</div>
                <div className="ds-sub" style={{ fontSize: 13.5, lineHeight: 1.3 }}>{u.title}</div>
              </div>
              <Engraving kind={pl.building} alive={st.complete} size={92} color={pl.color} label={`${pl.place}${st.complete ? ', юнит пройден' : ''}`} />
            </div>
            <div className="ln-bill-btns">
              <Button variant="secondary" small icon={BookOpenText} data-testid="unit-guide" data-nav-target={`book:chapter:${u.id}`} onClick={() => { Audio.play('paper'); onOpenBook({ kind: 'chapter', id: u.id }); }}>Гайд юнита</Button>
              {/* проверка юнита — только у пройденного: не забылось ли (docs/mechanics.md, «Тест уровня»); у непройденного
                  и закрытого её нет — перескочить вперёд можно тестом уровня */}
              {st.complete && <Button variant="secondary" small icon={Sparkles} data-testid="unit-check" data-nav-target={`check:${u.id}`} onClick={() => { Audio.prime(); onStart({ mode: 'check', unitId: u.id, review: true }); }}>Проверка юнита</Button>}
              {st.complete && hasClaim(learn, chestKey(u.id)) && (
                <Button variant="ghost" small icon={ChevronRight} data-testid="unit-fold" aria-expanded={!folded}
                  onClick={() => { Audio.play('paper'); setUnfolded((m) => ({ ...m, [u.id]: !m[u.id] })); }}>{folded ? `Уроки: ${st.lessons.length}` : 'Свернуть'}</Button>
              )}
              {st.complete && <span className="ds-sub" style={{ fontSize: 13, alignSelf: 'center' }} data-testid="unit-diamonds" data-n={unitGems(st, learn).n} data-of={unitGems(st, learn).of}><Gem size={14} style={{ verticalAlign: -2, color: DIAMOND_COLOR }} aria-hidden="true" /> алмазов: {unitGems(st, learn).n} из {unitGems(st, learn).of}</span>}
            </div>
            <Guilloche height={16} opacity={0.45} />
          </Card>
          )}
          {/* живая модель юнита: собирается урок за уроком — главный видимый прогресс юнита; на
              телефоне — свёрнутой строкой, у свёрнутого юнита её нет */}
          {!folded && (
            <Collapse closing={isFolding && folding.endsWith(':closing')}>
              {hasModel(u.id) && !wide && <ModelFold unitId={u.id} learn={learn} />}
              <Route st={st} stops={unitStops(st, learn)} seen={seen} reduced={reduced} visible={visible} resumes={resumes} onLesson={onLesson} onExtra={onExtra} rec={rec ? rec.lessonId : null} spooky={halloweenOn(dayOf(Date.now()))}
                chest={st.complete ? { unitId: u.id, opened: hasClaim(learn, chestKey(u.id)) } : null} onChest={onChest} />
            </Collapse>
          )}
        </section>
        );
      })}
      {selRow && shown.length > 0 && shown[shown.length - 1].st.levelReview && (
        <LevelReviewStop review={shown[shown.length - 1].st.levelReview} learn={learn} color={shown[shown.length - 1].pl.color}
          locked={!shown.every((x) => x.st.complete || x.st.tested)}
          cur={!!(first && first.current && first.current.extra === 'level-review' && first.current.levelId === sel)}
          onStart={() => { Audio.prime(); Audio.play('click'); onStart({ mode: 'level', levelId: sel, unitId: shown[shown.length - 1].u.id }); }} />
      )}
      {soon.length > 0 && (
        <Card flat style={{ padding: 0, marginTop: 8 }} data-testid="path-soon">
          <button type="button" className="ln-soon-head" aria-expanded={soonOpen} onClick={() => { Audio.play('paper'); setSoonOpen((v) => !v); }}>
            <MapPin size={18} color="var(--ds-ink3)" aria-hidden="true" />
            <span style={{ flex: 1 }}><span className="ds-h3" style={{ display: 'block' }}>Ещё в этом уровне: {soon.length} {plural(soon.length, 'место строится', 'места строятся', 'мест строятся')}</span>
              <span className="ds-faint" style={{ fontSize: 13 }}>гайды готовых глав уже можно читать</span></span>
            <ChevronRight size={18} style={{ transform: soonOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} aria-hidden="true" />
          </button>
          {soonOpen && (
            <div style={{ padding: '0 14px 10px' }} data-testid="path-soon-list">
              {soon.map(({ u, no }) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px dotted var(--ds-rule2)' }} data-unit={u.id}>
                  <span style={{ flex: 1, fontSize: 14.5 }}><b style={{ fontFamily: 'var(--ds-head)' }}>{placeOf(u.id).place}</b> <span className="ds-faint">· юнит {no} · {u.title}</span></span>
                  {u.ready && <Button variant="ghost" small data-nav-target={`book:chapter:${u.id}`} onClick={() => onOpenBook({ kind: 'chapter', id: u.id })}>Гайд</Button>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      </div>
      {wide && (
        <aside className="ln-path-side" data-testid="path-side" aria-label="Задания дня и живая модель">
          <TasksEntry learn={learn} onOpen={onTasks} />
          {races}
          <HalloweenCard learn={learn} update={update} />
          <QuestsCard learn={learn} testid="side-quests" />
          {sideModel && <ModelFold unitId={sideModel} learn={learn} side />}
        </aside>
      )}
    </div>
  );
}

/* ------------------------------ ПРАКТИКА ------------------------------ */
/* ------------------------------ ЗАДАНИЯ ------------------------------
   Экран поверх Пути (открывается карточкой «Задания» наверху): цель дня в минутах и три
   задания дня, персональное испытание месяца, ниже — практика: ошибки уроков, задачи
   вперемешку и итоговая проверка. Один «назад» — на Путь. */
function TasksView({ learn, onStart, onOpenBook, onBack }) {
  const n = practiceIds(learn).length;
  // вышли посреди «Повторить ошибки» — продолжается с того же места (сутки, как обычный урок)
  const [practiceResume] = useState(() => getResume('practice'));
  // задачи и вопросы учебника, которым подошёл срок повторения
  const [due] = useState(() => reviewQueue(loadProgress()).due.length);
  const arrow = <ChevronRight size={20} color="var(--ds-ink3)" aria-hidden="true" />;
  return (
    <div className="ln-wrap" data-testid="tasks">
      <TopBar back={<IconButton label="Назад, на Путь" icon={ArrowLeft} data-nav="back" onClick={onBack} />} title="Задания" main />
      <div className="ds-sub" style={{ fontSize: 14, margin: '6px 0 12px' }}>На сегодня, на неделю и на месяц. Задания дня обновляются в полночь и начинаются с нуля.</div>
      <QuestsCard learn={learn} />
      <MonthCard learn={learn} />
      <div data-testid="practice">
        <div className="ds-h3" style={{ margin: '18px 0 6px' }}>Практика</div>
        <MenuCard icon={RotateCcw} tone="var(--ds-bad)" title={practiceResume ? 'Повторить ошибки — продолжить' : 'Повторить ошибки'} data-testid="practice-mistakes" data-resume={practiceResume ? 'true' : undefined} data-nav-target={n ? 'run:practice' : undefined} disabled={!n && !practiceResume}
          text={n ? `${n} ${plural(n, 'упражнение', 'упражнения', 'упражнений')} из прошлых уроков${n > PRACTICE_MAX ? ` — за раз ${PRACTICE_MAX}` : n < PRACTICE_PAD ? ' и похожие задания тех же уроков' : ''}. Решённое верно уходит из списка` : 'Ошибок нет — всё решено верно'} right={n ? arrow : null}
          onClick={() => { Audio.prime(); onStart({ mode: 'practice', resume: practiceResume }); }} />
        <MenuCard icon={BookOpenText} tone="#3E6FA8" title="Повторить задачи учебника" data-testid="practice-review" data-nav-target={due ? 'book:review' : undefined} disabled={!due}
          text={due ? `${due} ${plural(due, 'задача или вопрос', 'задачи или вопроса', 'задач или вопросов')} — подошёл срок` : 'Сегодня повторять нечего'} right={due ? arrow : null}
          onClick={() => { Audio.play('paper'); onOpenBook({ kind: 'review' }); }} />
        <MenuCard icon={Target} tone="#65408F" title="Задачи вперемешку" data-testid="practice-mixed" data-nav-target="book:mixed" right={arrow} text="Из начатых глав учебника, без подсказки, какая нужна модель"
          onClick={() => { Audio.play('paper'); onOpenBook({ kind: 'mixed' }); }} />
        <MenuCard icon={Trophy} tone="var(--ds-gold)" title="Итоговая проверка: Микро" data-testid="practice-exam" data-nav-target="book:exam:micro" right={arrow} text="Шестнадцать задач с новыми числами при каждой попытке"
          onClick={() => { Audio.play('paper'); onOpenBook({ kind: 'exam', id: 'micro' }); }} />
      </div>
    </div>
  );
}

/* ------------------------------ ПРОФИЛЬ ------------------------------
   Профиль, коллекции и настройки — src/learn-profile.jsx; уведомления и новости — src/learn-notify.jsx. */

// профиль с настройками и лента новостей — свои ленивые чанки: нужны не при каждом открытии
const ProfileView = React.lazy(() => import('./learn-profile.jsx').then((m) => ({ default: m.ProfileView })));
const SettingsView = React.lazy(() => import('./learn-profile.jsx').then((m) => ({ default: m.SettingsView })));
const NewsView = React.lazy(() => import('./learn-news.jsx'));
const ReadingView = React.lazy(() => import('./learn-reading.jsx'));
const PeopleView = React.lazy(() => import('./learn-people.jsx'));
// книга поверх вкладки — из мини-проигрывателя над вкладками (src/learn-bookdock.jsx); читалка — в чанке полки
const BookOverlay = React.lazy(() => import('./learn-shelf.jsx').then((m) => ({ default: m.BookOverlay })));
const GraphLesson = React.lazy(() => import('./learn-graph.jsx'));
const DrawLesson = React.lazy(() => import('./learn-draw.jsx'));
// отчёт владельца — только когда его открывают (docs/mechanics.md: ни один чанк не больше 400 КБ)
const AnalyticsView = React.lazy(() => import('./learn-analytics.jsx').then((m) => ({ default: m.AnalyticsView })));
// предохранитель выплат остановил повторную выплату — в аналитику, без логина и имени (docs/mechanics.md, «Защита монет»)
onCoinGuard(() => track('coins_guard'));
// списание дюпа уходит в аналитику один раз за запуск
const AUDIT_TRACKED = new Set();
// пока файл урока грузится — пустой экран урока с заставкой, а не Путь под ним
// грузится дольше 6 секунд — сказать, что дело в сети, а не в касании
function LessonLoading({ text = 'Открываем урок' }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 6000); return () => clearTimeout(t); }, []);
  return (
    <DsRoot theme={dsThemeId()} className="ln-overlay" data-testid="lesson-loading" role="status" aria-label={text}>
      <div style={{ margin: 'auto', textAlign: 'center' }}>
        <BrandLoader compact text={text} />
        {slow && <div className="ds-sub" data-testid="lesson-loading-slow" style={{ fontSize: 14, marginTop: -40, padding: '0 20px' }}>Сеть медленная — ещё немного. Урок откроется сам.</div>}
      </div>
    </DsRoot>
  );
}
/* слой поверх Пути (особый урок, книга, настройки): пока его код грузится — та же заставка во весь экран, что у урока.
   Обычная заглушка вставала в конец страницы, под Путём, — ученик её не видел и думал, что касание не сработало
   (пункт владельца 21.11, п. 6: «нажимаю на урок — ничего не происходит, прошла минута, оказывается, грузилось») */
const LazyLayer = ({ text, children }) => <React.Suspense fallback={<LessonLoading text={text} />}>{children}</React.Suspense>;
const Lazy = ({ children }) => <React.Suspense fallback={<BrandLoader compact text="Открываем" />}>{children}</React.Suspense>;
const Celebration = React.lazy(() => import('./learn-celebrate.jsx'));
// урок во весь экран — отдельным файлом: грузится, когда урок начинается (src/learn-lesson.jsx)
const Runner = React.lazy(() => import('./learn-lesson.jsx'));
// учебник (вкладка и справочник поверх урока) и живая модель юнита — тоже по требованию: с ними приходят формулы и графики
const TextbookScreen = React.lazy(() => import('./textbook.jsx').then((m) => ({ default: m.TextbookScreen })));
const MarketModel = React.lazy(() => import('./learn-model.jsx').then((m) => ({ default: m.MarketModel })));
// лавка — когда открывают вкладку «Лавка» (src/learn-shop.jsx)
const ShopView = React.lazy(() => import('./learn-shop.jsx'));
/* Церемонии (src/learn/celebrate.js): что из полученного ещё не праздновали. Показанное помнит
   устройство; первое знакомство — всё уже полученное как показанное. Автотест (Playwright,
   navigator.webdriver) — без сцен, если тест сам их не включил (ems-celebrate-test): сцена во весь
   экран перехватывала бы касания остальных проверок. */
const CELEBRATED_KEY = 'ems-celebrated';
/* Показанное — ещё и в профиле (learn.shown, ключи c:…): церемония, показанная на одном устройстве,
   не повторяется на другом (жалоба: «прошёл юнит на ПК — марка дублируется на телефоне») */
function useCelebrations(learn, update) {
  const [seen, setSeen] = useState(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.webdriver && localStorage.getItem('ems-celebrate-test') !== '1') return null;
      const raw = localStorage.getItem(CELEBRATED_KEY);
      if (raw) return JSON.parse(raw) || {};
      const base = baselineSeen(learn);
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify(base));
      return base;
    } catch { return null; }
  });
  const synced = useMemo(() => shownWith(learn, 'c:'), [learn.shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = useMemo(() => (seen ? pendingMoments(learn, { ...seen, ...synced }) : []), [learn, seen, synced]);
  const mark = (keys) => {
    setSeen((m) => {
      const next = { ...m };
      keys.forEach((k) => { next[k] = Date.now(); });
      try { localStorage.setItem(CELEBRATED_KEY, JSON.stringify(next)); } catch { /* приватный режим */ }
      return next;
    });
    update((s) => markShown(s, keys.map((k) => `c:${k}`)));
  };
  // больше трёх подряд — лишние без сцен
  useEffect(() => { const { skip } = nextBatch(pending); if (skip.length) mark(skip.map((m) => m.key)); }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  return [pending[0] || null, (m) => mark([m.key])];
}

/* ------------------------------ ВКЛАДКИ ------------------------------
   Корень экранов обучения. Учебник — подэкран поверх вкладки (или поверх итогов урока):
   его «назад» возвращает туда, откуда открыли. Нижняя панель — в корне приложения. */
const MORNING_KEY = 'ems-learn-morning';
/* Гость (src/lib/guest.js): прогресс пока только на этом устройстве — карточка зовёт создать
   аккаунт. После урока — на итогах, потом — вверху Пути. Регистрация заберёт прогресс. */
/* «Нет связи с сервером»: последняя синхронизация не прошла (VPN, сеть, сбой) — прогресс других устройств не подтянулся.
   «Повторить» — синхронизировать сейчас; удачная синхронизация убирает плашку сама (docs/mechanics.md, «Регистрация и вход») */
function SyncBanner() {
  const [fail, setFail] = useState(() => { const s = syncState(); return !!s && !s.ok; });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = (e) => setFail(!!e.detail && !e.detail.ok);
    window.addEventListener(SYNC_EVENT, on);
    return () => window.removeEventListener(SYNC_EVENT, on);
  }, []);
  if (!fail) return null;
  const retry = () => {
    Audio.play('click'); setBusy(true);
    syncProfile(getPlayerId()).then((pf) => { if (pf) window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: loadProgress() })); }).finally(() => setBusy(false));
  };
  return (
    <div className="ln-sync" role="alert" data-testid="sync-fail">
      <WifiOff size={20} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>Нет связи с сервером</b>
        <span>Прогресс с других устройств не подтянулся, а этот пока сохраняется только здесь. Проверьте интернет; если включён VPN — попробуйте без него.</span>
      </div>
      <Button small variant="secondary" disabled={busy} data-testid="sync-retry" onClick={retry}>{busy ? 'Проверяем…' : 'Повторить'}</Button>
    </div>
  );
}

export function GuestSave({ learn, afterLesson = false }) {
  const done = Object.values(learn.lessons || {}).filter((l) => l && l.runs > 0).length;
  return (
    <Card data-testid="guest-save" style={{ margin: afterLesson ? '14px 0 0' : '0 0 12px', textAlign: 'left' }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Сохраните прогресс</div>
      <div className="ds-sub" style={{ fontSize: 14.5, lineHeight: 1.45, margin: '4px 0 10px' }}>
        {done ? `${done} ${plural(done, 'урок', 'урока', 'уроков')} и монеты пока хранятся только в этом браузере.` : 'Пока прогресс хранится только в этом браузере.'} Создайте аккаунт — и он будет с вами на любом устройстве.
      </div>
      {/* у кого аккаунт уже есть (начал на новом устройстве) — «Войти»: прогресс гостя объединится с аккаунтом */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <Button wide small data-testid="guest-register" onClick={() => { Audio.play('click'); askSave(); }}>Создать аккаунт</Button>
        <Button wide small variant="secondary" data-testid="guest-login" onClick={() => { Audio.play('click'); askLogin(); }}>Войти</Button>
      </div>
    </Card>
  );
}

export function LearnTab({ tab, bookHandlers = {}, reopenBook = false, onBookReopened = () => {}, onThemeChange = () => {}, onBookOver = () => {}, onBusy = () => {}, closeTick = 0, bookHome = 0, pathHome = 0, guest = false, firstLesson = false, onFirstLesson = () => {}, onTab = () => {} }) {
  const [learn, update, gains, gainsDone] = useLearn();
  // курс политологии (проба для команды, src/learn/track.js): сервер больше не считает вошедшего командой — обратно к экономике
  useEffect(() => {
    if (TRACK !== 'politics') return;
    let acc = null;
    try { acc = JSON.parse(localStorage.getItem('ems-account') || 'null'); } catch { /* повреждённая запись */ }
    if (!acc || !acc.token) return;
    reportsMe(acc.token).then((r) => { if (r && r.owner === false) { rememberTeam(acc.login, false); window.location.assign('/'); } }).catch(() => {});
  }, []);
  /* Фоновая подгрузка (src/lib/warmup.js): Путь появился — после простоя догружаем урок (с ним главы, формулы и графики)
     и учебник, чтобы урок открылся и без сети; следом — лавку, особые уроки, профиль и новости (пункт владельца 24.11, п. 1:
     «модули типа лавки, особых уроков долго грузятся»): к первому касанию они уже в кэше браузера. Не при экономии трафика
     и не на медленной связи; вторая очередь — только после первой, чтобы не спорить с ней за сеть. */
  useEffect(() => scheduleWarmup(() => Promise.all([import('./learn-lesson.jsx'), import('./textbook.jsx')])
    .then(() => Promise.all([import('./learn-shop.jsx'), import('./learn-people.jsx'), import('./learn-reading.jsx'), import('./learn-graph.jsx'),
      import('./learn-draw.jsx'), import('./learn-profile.jsx'), import('./learn-news.jsx')]))), []);
  const [run, setRun] = useState(null);
  // «Чтение» юнита — подборка цитат поверх Пути (src/learn-reading.jsx)
  const [reading, setReading] = useState(null);
  const sketchBook = useMedia(SKETCH_BOOK_QUERY);
  const [sheet, setSheet] = useState(null);
  const [book, setBook] = useState(null);
  const [bookKey, setBookKey] = useState(0);
  const [reports, setReports] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  // «Задания» — экран поверх Пути (карточка наверху Пути)
  const [tasks, setTasks] = useState(false);
  const [chest, setChest] = useState(null);
  // сундук открыт — пройденный юнит сворачивается, Путь едет к рекомендованному уроку
  const [folded, setFolded] = useState({ n: 0, unit: null });
  // настройки (шестерёнка в профиле) и центр уведомлений (колокольчик на Пути и в профиле)
  const [settings, setSettings] = useState(false);
  const [bell, setBell] = useState(false);
  // друзья (страница поверх профиля) и профиль друга (поверх друзей или новостей)
  const [friendsPage, setFriendsPage] = useState(false);
  const [friendLogin, setFriendLogin] = useState(null);
  const friends = useFriends();
  // своя карточка для друзей — через пару секунд после изменения прогресса
  useEffect(() => {
    if (guest) return undefined;
    const id = setTimeout(() => pushCard(buildCard(learn)), 2500);
    return () => clearTimeout(id);
  }, [learn, guest]);
  // куда вести после смены вкладки из уведомления: задания поверх Пути, сад или копилка в лавке
  const afterTab = useRef(null);
  const [shopFocus, setShopFocus] = useState({ n: 0, to: null });
  // утренний экран серии: один раз в день, при первом открытии Пути, если серия уже идёт
  const [morning, setMorning] = useState(() => {
    if (tab !== 'path') return false;
    const today = dayOf(Date.now());
    let seen = null; try { seen = localStorage.getItem(MORNING_KEY); localStorage.setItem(MORNING_KEY, today); } catch { /* приватный режим */ }
    // утренний экран сегодня уже показали на другом устройстве — второй раз не нужен
    const p = loadProgress().learn;
    return seen !== today && !(p.shown || {})[`m:${today}`] && streak(p).days >= 1;
  });
  useEffect(() => { if (morning) update((s) => markShown(s, [`m:${dayOf(Date.now())}`])); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const notify = useNotify(learn, update);
  // церемония — когда ученик не занят: не в уроке, не в карточке урока, сундуке или утреннем экране
  const [moment, celebrated] = useCelebrations(learn, update);
  const celebrate = moment && !run && !sheet && !chest && !morning ? moment : null;
  const [toast, toastDone] = useToasts(notify, !!run || !!sheet || !!chest || morning || bell || !!celebrate);
  /* Юнит пройден — сундук открывается сам (docs/mechanics.md, «Путь»): после «Дальше» на итогах и марки юнита.
     Раньше Путь уезжал к следующему уроку — часто на следующий уровень, — и сундук оставался позади.
     Автотест — без этого, если сам не попросил (ems-chest-test), как и церемонии. */
  const chestBefore = useRef(null);
  const [chestNext, setChestNext] = useState(null);
  useEffect(() => {
    const waiting = () => pathState(learn).filter((x) => x.complete && !hasClaim(learn, chestKey(x.course.id))).map((x) => x.course.id);
    if (run) { if (!chestBefore.current) chestBefore.current = new Set(waiting()); return; }
    if (!chestBefore.current) return;
    const fresh = waiting().filter((id) => !chestBefore.current.has(id));
    chestBefore.current = null;
    let off = false; try { off = !!navigator.webdriver && localStorage.getItem('ems-chest-test') !== '1'; } catch { /* приватный режим */ }
    if (fresh.length === 1 && !off) setChestNext(fresh[0]);
  }, [run, learn]);
  useEffect(() => {
    if (!chestNext || run || moment || sheet || morning || chest || tab !== 'path') return undefined;
    // пауза: марка юнита появляется не в тот же миг — она идёт первой
    const id = setTimeout(() => { setChest(chestNext); setChestNext(null); }, 450);
    return () => clearTimeout(id);
  }, [chestNext, run, moment, sheet, morning, chest, tab]);
  useBrowserReminders(notify);
  const openBook = (page, resume = false) => { setBook({ page, resume }); setBookKey((k) => k + 1); window.scrollTo(0, 0); };
  // смена вкладки закрывает подэкраны; переход из уведомления может открыть нужный сразу
  useEffect(() => {
    setBook(null); setSheet(null); setChest(null); setReports(false); setAnalytics(false); setTasks(false); setSettings(false); setBell(false); setFriendsPage(false); setFriendLogin(null);
    const go = afterTab.current; afterTab.current = null;
    if (go && go.friends) setFriendsPage(true);
    if (go && go.tasks) setTasks(true);
    if (go && go.chest) setChest(go.chest);
  }, [tab]);
  // нажата вкладка внизу, пока открыт учебник поверх (в том числе та же самая) — закрываем его
  useEffect(() => { if (closeTick) { setBook(null); setSheet(null); setSettings(false); setBell(false); setFriendsPage(false); setFriendLogin(null); } }, [closeTick]);
  useEffect(() => { if (pathHome) { setTasks(false); setBell(false); } }, [pathHome]);
  // учебник поверх вкладки — нижняя панель отмечает «Учебник»
  useEffect(() => { onBookOver(!!book && !run); }, [book, run]); // eslint-disable-line react-hooks/exhaustive-deps
  // вернулись из Лаборатории или партии, открытой из учебника, — снова в учебник, на то же место
  useEffect(() => { if (reopenBook) { openBook(null, true); onBookReopened(); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopenBook]);
  const start = (r) => { setSheet(null); setRun(r); };
  /* Всё, что открыто поверх вкладки, — записи истории (src/lib/route.js; docs/mechanics.md, «Адреса и история»): «Назад»
     браузера закрывает верхний слой — урок, страницу настроек, уведомления, учебник поверх вкладки. Шторки (карточка
     урока, сундук, список уровней) — тоже записи: это делает сам компонент Sheet; урок — сам Runner. */
  // урок: запись ставится сразу (файл урока грузится лениво), что делать на «Назад» — говорит сам урок (backRef)
  const runBack = useRef(null);
  useHistoryLayer(!!run, () => (runBack.current ? runBack.current() : (setRun(null), undefined)));
  useHistoryLayer(!!book, () => setBook(null));
  useHistoryLayer(tasks, () => setTasks(false));
  useHistoryLayer(settings, () => setSettings(false));
  useHistoryLayer(bell, () => setBell(false));
  useHistoryLayer(friendsPage, () => setFriendsPage(false));
  useHistoryLayer(!!friendLogin, () => setFriendLogin(null));
  useHistoryLayer(reports, () => setReports(false));
  useHistoryLayer(analytics, () => setAnalytics(false));
  useHistoryLayer(!!reading, () => setReading(null));
  /* особые уроки дороги (src/learn/stops.js): «Чтение», «Персоналии», «Работа над ошибками»;
     закрытый — подсказка, когда откроется */
  const [people, setPeople] = useState(null);
  const [dockBook, setDockBook] = useState(null);
  // «Разбор графика»: с дороги юнита — урок с опытом; с карточки урока (событие) — поверх урока, без опыта
  const [graph, setGraph] = useState(null);
  useEffect(() => {
    const on = (e) => { if (e.detail && e.detail.id) setGraph({ id: e.detail.id, peek: true }); };
    window.addEventListener(GRAPH_EVENT, on);
    return () => window.removeEventListener(GRAPH_EVENT, on);
  }, []);
  // «Нарисуй сам» — только с дороги юнита
  const [draw, setDraw] = useState(null);
  /* вышли из урока (обычного или особого, дочитав или посреди) — выдать выполненное в нём: задание дня «N верных подряд»
     засчитывается ответом, и раньше его монеты приходили при следующем действии в лавке — «дало деньги, когда я мыл
     витрину» (замечание владельца 18.11, вечер, п. 7). Теперь — плашкой на Пути сразу после урока */
  const inLesson = !!(run || graph || draw);
  const wasInLesson = useRef(false);
  useEffect(() => {
    if (wasInLesson.current && !inLesson) update((x) => x, { settle: true });
    wasInLesson.current = inLesson;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inLesson]);
  // купленные пластинки — проигрывателю: микс «Пластинки» играет только их (src/audio/records.js)
  const recordKey = ownedRecordTracks(learn).join(',');
  useEffect(() => { Audio.setRecords(recordKey ? recordKey.split(',') : []); }, [recordKey]);
  const [extraLocked, setExtraLocked] = useState(null);
  // урок и особые уроки во весь экран — нижняя панель (она вне этой вкладки) на это время недоступна с клавиатуры
  const fullOver = !!run || !!reading || !!people || !!graph || !!draw || !!dockBook || morning;
  useEffect(() => { onBusy(fullOver); return () => onBusy(false); }, [fullOver]); // eslint-disable-line react-hooks/exhaustive-deps
  useHistoryLayer(!!people, () => setPeople(null));
  useHistoryLayer(!!graph, () => setGraph(null));
  useHistoryLayer(!!draw, () => setDraw(null));
  useHistoryLayer(!!dockBook, () => setDockBook(null));
  // «Персоналии», «Чтение», «Разбор графика», «Нарисуй сам» — сначала карточка урока, «Начать» — сам урок
  const [extraSheet, setExtraSheet] = useState(null);
  const onExtra = (x) => {
    if (!x.open && !x.done) { Audio.play('down'); setExtraLocked(x); return; }
    if (x.type !== 'fix' && extraInfo(x)) { setExtraSheet(x); return; }
    openExtra(x);
  };
  const openExtra = (x) => {
    setExtraSheet(null);
    // x.gem — алмаз у остановки уже взят; x.diamond — открыть на алмазном уровне
    if (x.type === 'read') setReading({ id: x.id, gem: !!x.diamond });
    else if (x.type === 'people') setPeople({ id: x.id, gem: !!x.diamond });
    else if (x.type === 'graph') setGraph({ id: x.id, peek: false, gem: !!x.diamond });
    else if (x.type === 'draw') setDraw({ id: x.id, gem: !!x.diamond });
    // вышли посреди «Работы над ошибками» — она продолжается с того же места (сутки, как обычный урок)
    else if (x.type === 'fix') start({ mode: 'fix', unitId: x.unitId, resume: getResume(`fix:${x.unitId}`) });
  };
  // только в тестах (window.__INFLATIA_TEST__): открыть особый урок сразу, без дороги юнита — для снимков экранов
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__INFLATIA_TEST__) return undefined;
    const on = (e) => { if (e.detail && e.detail.id) openExtra({ open: true, ...e.detail }); };
    window.addEventListener('inflatia:test-open-extra', on);
    return () => window.removeEventListener('inflatia:test-open-extra', on);
  });
  // гость: после выбора цели — сразу первый урок Пути, без карточки урока
  useEffect(() => { if (firstLesson) { onFirstLesson(); start({ mode: 'lesson', lessonId: LESSONS[0].id }); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstLesson]);
  /* Касание уведомления (в центре или на плашке): туда, где можно действовать. Та же вкладка —
     сразу, другая — после её открытия (смена вкладки закрывает подэкраны). */
  const goNotify = (n) => {
    notify.markOne(n.id);
    setBell(false);
    // повторение учебника — сразу страница «Повторение» учебника, поверх любой вкладки
    if (n.go === 'book-review') { openBook({ kind: 'review' }); return; }
    if (n.go === 'book-chapter' && n.chapter) { openBook({ kind: 'chapter', id: n.chapter }); return; }
    // ник под запретом — окно смены ника (src/account.jsx, NameGate)
    if (n.go === 'rename') { window.dispatchEvent(new Event('ems-rename')); return; }
    const want = { path: 'path', tasks: 'path', league: 'league', shop: 'shop', garden: 'shop', piggy: 'shop', news: 'news', friends: 'profile', world: 'world' }[n.go] || 'path';
    const extra = n.go === 'tasks' ? { tasks: true } : n.go === 'friends' ? { friends: true } : n.id.startsWith('chest:') ? { chest: n.id.slice(6) } : null;
    if (n.go === 'garden' || n.go === 'piggy') setShopFocus((f) => ({ n: f.n + 1, to: n.go }));
    if (want === tab) {
      if (extra && extra.tasks) setTasks(true);
      if (extra && extra.friends) setFriendsPage(true);
      if (extra && extra.chest) setChest(extra.chest);
      if (want !== 'shop') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    afterTab.current = extra;
    onTab(want);
  };
  // «Сообщить об ошибке» в учебнике: на странице (вверху) и у каждой задачи
  const bookReports = {
    reportSlot: (cur) => {
      const context = () => ({ screen: 'textbook', page: `${cur.kind}${cur.id ? `:${cur.id}` : ''}${cur.anchor ? `#${cur.anchor}` : ''}`, unit: cur.kind === 'chapter' ? cur.id : '' });
      // флажок страницы — про теорию; выделенный в тексте кусок приложится цитатой
      return <><ReportFlag context={context} reasons={THEORY_REASONS} /><QuoteReport context={context} /></>;
    },
    reportFlag: (context) => <ReportFlag context={context} label="Сообщить об ошибке" />,
  };
  const accent = placeOf((pathState(learn).find((s) => s.current) || pathState(learn)[0] || { course: { id: 'supply-demand' } }).course.id).color;
  // наряд из лавки — на всех Инфлях обучения: в уроке, на итогах, на Пути и в профиле
  const outfitKey = JSON.stringify(outfitOf(learn));
  const outfit = useMemo(() => JSON.parse(outfitKey), [outfitKey]);
  const over = !!run || !!sheet || !!book || !!chest || morning || reports || analytics || settings || bell || friendsPage || !!friendLogin;
  const raceCards = racesToShow(friends, learn).map((v) => <RaceCard key={v.id} v={v} learn={learn} update={update} myWear={outfit} />);
  return (
    <OutfitContext.Provider value={outfit}>
    <DsRoot theme={dsThemeId()} accent={accent} page className="ln-root">
      <ArtStyle />
      <style>{TEXTBOOK_CSS + CSS + PLAY_CSS + REWARD_CSS + REPORT_CSS + MODEL_CSS + STATS_CSS + NOTIFY_CSS + HALLOWEEN_CSS + FRIENDS_CSS}</style>
      {book && (
        <div className="ln-book" data-testid="learn-book">
          <Lazy><TextbookScreen key={bookKey} startPage={book.page} resume={book.resume} onExit={() => setBook(null)} {...bookHandlers} {...bookReports} /></Lazy>
          {/* черновик на полях — и в учебнике, открытом «Гайдом юнита» или из урока; пока идёт урок, у урока свой */}
          {sketchBook && !run && <React.Suspense fallback={null}><BookSketch key={bookKey} mode="bookOver" /></React.Suspense>}
        </div>
      )}
      {/* пока идёт урок или открыт учебник, экран под ними недоступен ни с клавиатуры, ни для чтения с экрана */}
      <div inert={over} style={book || reports || analytics ? { display: 'none' } : undefined} className="ln-tab" key={tab}>
        <SyncBanner />
        {tab === 'path' && !tasks && guest && <GuestSave learn={learn} />}
        {tab === 'path' && !tasks && <PathView learn={learn} update={update} onLesson={setSheet} onStart={start} onOpenBook={openBook} onChest={setChest}
          onTasks={() => { setTasks(true); window.scrollTo(0, 0); }} visible={!over} homeTick={pathHome} folded={folded}
          bell={<BellButton count={notify.unread.length} onClick={() => setBell(true)} />} races={raceCards.length ? raceCards : null} onExtra={onExtra} />}
        {tab === 'path' && tasks && <TasksView learn={learn} onStart={start} onOpenBook={openBook} onBack={() => { Audio.play('paper'); setTasks(false); window.scrollTo(0, 0); }} />}
        {tab === 'book' && <div className="ln-book" data-testid="book-tab"><Lazy><TextbookScreen asTab homeTick={bookHome} {...bookHandlers} {...bookReports} /></Lazy>
          {/* черновик на полях учебника — на широком экране с мышью; пока идёт урок, у урока свой */}
          {sketchBook && !over && <React.Suspense fallback={null}><BookSketch mode="book" /></React.Suspense>}</div>}
        {/* лиги и лавка открываются не сразу (src/learn/unlocks.js): до того — что там будет и сколько уроков осталось */}
        {tab === 'shop' && (featureOpen(learn, 'shop') ? <Lazy><ShopView key={shopFocus.n} learn={learn} update={update} focus={shopFocus.to} /></Lazy>
          : <div className="ln-wrap"><FeatureLocked id="shop" learn={learn} onPath={() => onTab('path')} /></div>)}
        {tab === 'league' && <div className="ln-wrap">{featureOpen(learn, 'league') ? <LeagueView learn={learn} update={update} /> : <FeatureLocked id="league" learn={learn} onPath={() => onTab('path')} />}</div>}
        {tab === 'news' && <Lazy><NewsView learn={learn} update={update} friends={friends} onFriend={(l) => setFriendLogin(l)} /></Lazy>}
        {tab === 'profile' && <Lazy><ProfileView learn={learn} update={update} onOpenBook={openBook} onSettings={() => setSettings(true)} onNotify={() => setBell(true)} unread={notify.unread.length}
          friends={friends} guest={guest} onFriends={() => { Audio.play('paper'); setFriendsPage(true); }} onPath={() => onTab('path')} /></Lazy>}
      </div>
      {settings && !reports && !analytics && <LazyLayer text="Открываем настройки"><SettingsView learn={learn} update={update} notify={notify} onBack={() => setSettings(false)} onThemeChange={onThemeChange}
        onPlacement={() => { setSettings(false); start({ mode: 'placement' }); }}
        onReports={() => { setReports(true); window.scrollTo(0, 0); }} onAnalytics={() => { setAnalytics(true); window.scrollTo(0, 0); }} /></LazyLayer>}
      {friendsPage && !friendLogin && <FriendsPage data={friends} onBack={() => setFriendsPage(false)} onOpen={(l) => setFriendLogin(l)} />}
      {friendLogin && <FriendProfile login={friendLogin} data={friends} learn={learn} update={update} myWear={outfit} onBack={() => setFriendLogin(null)} />}
      {bell && <NotifyCenter notify={notify} onClose={() => setBell(false)} onGo={goNotify} />}
      {toast && <NotifyToast n={toast} onGo={(n) => { toastDone(); goNotify(n); }} onClose={toastDone} onRead={(n) => notify.markOne(n.id)} />}
      {!toast && !run && gains.length > 0 && <NotifyToast n={gainsNote(gains)} onGo={gainsDone} onClose={gainsDone} />}
      {reports && <ReportsView onBack={() => { Audio.play('paper'); setReports(false); }} />}
      {analytics && <LazyLayer text="Открываем аналитику"><AnalyticsView onBack={() => { Audio.play('paper'); setAnalytics(false); }} /></LazyLayer>}
      {chest && <ChestSheet unitId={chest} place={placeOf(chest).place} learn={learn} update={update}
        onClose={(opened) => { setChest(null); if (opened) setFolded({ n: Date.now(), unit: chest }); }} />}
      {morning && !run && <MorningStreak learn={learn} onClose={() => setMorning(false)} />}
      {celebrate && <React.Suspense fallback={null}><Celebration moment={celebrate} learn={learn} onDone={() => celebrated(celebrate)}
        onGo={() => {
          celebrated(celebrate);
          // открылась возможность — «Заглянуть» ведёт туда же, куда уведомление: лига, лавка, копилка, сад
          if (celebrate.kind === 'unlock') { goNotify({ id: `o:${celebrate.it.id}`, go: celebrate.it.id }); return; }
          onTab(celebrate.kind === 'league' ? 'league' : 'profile');
        }} /></React.Suspense>}
      {sheet && <LessonSheet l={sheet} learn={learn} weak={weakLessons(learn).some((w) => w.id === sheet.id)} onStart={start} onClose={() => setSheet(null)} onOpenBook={openBook}
        onSkip={(id) => { Audio.play('paper'); update((s) => skipLesson(s, id)); setSheet(null); }} />}
      {reading && <LazyLayer text="Открываем «Чтение»"><ReadingView key={`${reading.id}:${reading.gem}`} id={reading.id} gem={reading.gem} learn={learn} update={update} onClose={() => setReading(null)} /></LazyLayer>}
      {people && <LazyLayer text="Открываем «Персоналии»"><PeopleView key={`${people.id}:${people.gem}`} id={people.id} gem={people.gem} learn={learn} update={update} onClose={() => setPeople(null)} /></LazyLayer>}
      {/* книга звучит, а читалку закрыли — мини-проигрыватель над вкладками; касание названия — книга на звучащем отрывке */}
      {!run && <BookDock onOpen={(id, passage) => { Audio.play('paper'); setDockBook({ id, passage }); }} />}
      {/* музыка включена в обучении — мини-плашка над вкладками (пункт владельца 16.11), над плашкой книги, если звучит и она */}
      {!run && <MusicDock />}
      {dockBook && <LazyLayer text="Открываем книгу"><BookOverlay id={dockBook.id} passage={dockBook.passage} learn={learn} update={update} onClose={() => setDockBook(null)} /></LazyLayer>}
      {extraSheet && <ExtraSheet x={extraSheet} onStart={openExtra} onClose={() => setExtraSheet(null)} />}
      {extraLocked && (
        <Sheet label={EXTRA_KIND[extraLocked.type]} onClose={() => setExtraLocked(null)} testid="extra-locked">
          <div style={{ textAlign: 'center' }}>
            <Heading level={2} title={`${EXTRA_KIND[extraLocked.type]}: ${extraLocked.title}`} sub="Откроется, когда пройдёте урок перед этой остановкой на дороге юнита." />
            <Button wide style={{ marginTop: 14 }} onClick={() => setExtraLocked(null)}>Понятно</Button>
          </div>
        </Sheet>
      )}
      {run && <React.Suspense fallback={<LessonLoading />}><Runner key={JSON.stringify({ ...run, resume: !!run.resume })} run={run} learn={learn} update={update} hidden={!!book} guest={guest} backRef={runBack}
        onClose={() => setRun(null)} onOpenBook={(page) => openBook(page)} /></React.Suspense>}
      {graph && <LazyLayer text="Открываем «Разбор графика»"><GraphLesson key={`${graph.id}:${!!graph.gem}`} id={graph.id} learn={learn} update={update} peek={graph.peek} gem={!!graph.gem} onClose={() => setGraph(null)} /></LazyLayer>}
      {draw && <LazyLayer text="Открываем «Нарисуй сам»"><DrawLesson key={`${draw.id}:${draw.gem}`} id={draw.id} gem={draw.gem} learn={learn} update={update} onClose={() => setDraw(null)} /></LazyLayer>}
    </DsRoot>
    </OutfitContext.Provider>
  );
}
export default LearnTab;
