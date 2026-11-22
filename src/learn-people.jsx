/* «ПЕРСОНАЛИИ» — экран особого урока на дороге юнита (данные — src/learn/people.js, docs/mechanics.md).
   Три человека по очереди. Карточка: портрет в раме (фото с Wikimedia Commons или гравированный
   медальон с инициалами), имя крупно, кто он, годы жизни на ленте веков с отметкой главного года,
   рассказ, главная идея, «Знаете ли вы» и вопрос. В конце — стена галереи: три портрета
   повисают в рамах, опыт — один раз. Отдельный ленивый чанк. */
import { SpecialShell, SpecialDesk, SpecialHead, SpecialLabel, useAnswerRun, useSpecialResume, resumedState } from './learn-special.jsx';
import { useActiveMs } from './learn-clock.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Sparkles, Lightbulb, Check } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button, AnswerBar } from './ds.jsx';
import { useReducedMotion } from './ds-art.jsx';
import { personByName, PEOPLE_BY_ID, MET_XP, isMet, initialsOf, eraPos, galleryOf, quizIdea } from './learn/people.js';
import { cachedPhoto, loadPhoto, preloadPhotos } from './learn/portraits.js';
import { tallyAnswer, streakNow, finishLesson, markMet, countAnswers, markGem, hasGem, addStudySeconds } from './textbook/learn-state.js';
import { DIAMOND_COLOR } from './ds-tokens.js';
import { ReportFlag, REPORT_CSS } from './learn-report.jsx';
import { ExtraResult, payExtra } from './learn-extra-result.jsx';
import { Zoomable } from './zoom-view.jsx';

export const PEOPLE_CSS = `
  .pp-root { position: fixed; inset: 0; z-index: 300; overflow-y: auto; overscroll-behavior: contain; color: var(--ds-ink);
    background: radial-gradient(130% 70% at 50% -10%, color-mix(in srgb, var(--pp) 16%, var(--ds-paper)) 0%, var(--ds-paper) 62%), var(--ds-paper); }
  .pp-top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: color-mix(in srgb, var(--ds-paper) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--ds-rule2); }
  .pp-title { flex: 1; min-width: 0; font: 700 15px var(--ds-head); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pp-title small { display: block; font: 700 10.5px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--ds-ink2); }
  .pp-pips { display: flex; gap: 6px; }
  .pp-pips i { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 700 10px var(--ds-sans); color: var(--ds-ink3);
    border: 2px solid var(--ds-rule2); background: var(--ds-card); font-style: normal; transition: all .3s; }
  .pp-pips i.on { border-color: var(--pp); color: var(--pp-ink); }
  .pp-pips i.ok { background: var(--pp); border-color: var(--pp); color: #fff; }
  .pp-page { max-width: 720px; margin: 0 auto; padding: 18px 16px 130px; }

  /* герой: портрет в раме слева, имя и роль справа; на телефоне — друг под другом */
  .pp-hero { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; animation: pp-in .55s cubic-bezier(.2, .9, .3, 1) backwards; }
  @keyframes pp-in { from { opacity: 0; transform: translateY(16px) } }
  .pp-frame { position: relative; width: 168px; height: 208px; flex: none; border-radius: 84px 84px 18px 18px; padding: 7px;
    background: linear-gradient(145deg, color-mix(in srgb, var(--pp) 40%, #F3E3B5), color-mix(in srgb, var(--pp) 70%, #3A2A12));
    box-shadow: 0 22px 40px -22px rgba(30, 20, 8, .7), inset 0 0 0 1px rgba(255,255,255,.35); }
  .pp-frame > .pp-pic { width: 100%; height: 100%; border-radius: 78px 78px 13px 13px; overflow: hidden; background: var(--ds-card2); position: relative; }
  .pp-pic img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; filter: sepia(.25) contrast(1.04); animation: pp-ken 14s ease-in-out infinite alternate; }
  @keyframes pp-ken { from { transform: scale(1.02) } to { transform: scale(1.1) translate(-2%, -2%) } }
  /* блик — редко: проход за 2 с, когда портрет появился, и дальше раз в 30 с (было каждые 5 с — портрет «мигал»);
     в галерее профиля, где портретов много, — один проход (.lb-gal ниже) */
  .pp-pic::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.28) 50%, transparent 65%); background-size: 260% 100%;
    background-position: -40% 0; animation: pp-sheen 30s linear 1s infinite; pointer-events: none; }
  @keyframes pp-sheen { 0% { background-position: 130% 0; animation-timing-function: ease-in-out } 6.6%, 100% { background-position: -40% 0 } }
  .lb-gal .pp-pic::after { animation-iteration-count: 1; }
  .pp-credit { margin-top: 6px; font-size: 12px; line-height: 1.3; color: var(--ds-ink2); max-width: 168px; overflow-wrap: anywhere; }
  .pp-credit a { color: inherit; }
  .pp-name { font: 700 clamp(26px, 4.4vw, 36px)/1.08 var(--ds-news, 'PT Serif', Georgia, serif); letter-spacing: -.01em; }
  .pp-role { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .pp-role span { padding: 4px 10px; border-radius: 999px; font: 600 13px var(--ds-sans); background: color-mix(in srgb, var(--pp) 12%, var(--ds-card)); color: var(--pp-ink);
    border: 1px solid color-mix(in srgb, var(--pp) 28%, transparent); }
  .pp-lead { margin-top: 12px; font: 400 17px/1.45 var(--ds-sans); color: var(--ds-ink2); }
  /* знакомый из прошлого юнита: метка и строка, где встречались */
  .pp-role .pp-again { background: var(--pp); color: #fff; border-color: var(--pp); }
  .pp-again-note { margin-top: 8px; font: 500 14px/1.4 var(--ds-sans); color: var(--pp-ink); }

  /* лента веков: шкала 1640–2030, годы жизни — полоса, главный год — флажок */
  .pp-era { position: relative; margin: 26px 4px 8px; height: 58px; }
  .pp-era-axis { position: absolute; left: 0; right: 0; top: 26px; height: 2px; background: var(--ds-rule2); }
  .pp-era-tick { position: absolute; top: 22px; width: 1px; height: 10px; background: var(--ds-rule2); }
  .pp-era-tick span { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); font: 600 11px var(--ds-mono); color: var(--ds-ink3); }
  .pp-era-life { position: absolute; top: 21px; height: 12px; border-radius: 6px; background: linear-gradient(90deg, color-mix(in srgb, var(--pp) 55%, #fff), var(--pp));
    transform-origin: left; animation: pp-life .9s cubic-bezier(.2, .9, .3, 1) .25s backwards; box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--pp) 60%, transparent); }
  @keyframes pp-life { from { transform: scaleX(0) } }
  .pp-era-mark { position: absolute; top: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; animation: pp-drop .5s cubic-bezier(.3, 1.5, .5, 1) 1s backwards; }
  .pp-era-mark b { font: 700 11.5px var(--ds-mono); padding: 2px 7px; border-radius: 6px; background: var(--pp); color: #fff; }
  .pp-era-mark i { width: 2px; height: 10px; background: var(--pp); }
  @keyframes pp-drop { from { opacity: 0; transform: translate(-50%, -10px) } }

  .pp-story p { font: 400 16.5px/1.6 var(--ds-sans); margin: 14px 0 0; }
  /* .pp-root впереди — сильнее .ds-card: у неё свой отступ 16 px, и он сдвигал текст под значок (жалоба 21.11, people-household:
     «съехали эмодзи») */
  .pp-root .pp-idea { position: relative; margin: 20px 0 0; padding: 18px 20px 18px 54px; border-radius: 18px; font: italic 600 18px/1.45 var(--ds-news, 'PT Serif', Georgia, serif);
    background: color-mix(in srgb, var(--pp) 10%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--pp) 30%, transparent); }
  .pp-idea svg { position: absolute; left: 18px; top: 19px; color: var(--pp-ink); }
  .pp-root .pp-fact { margin-top: 12px; padding: 14px 16px 14px 48px; position: relative; border-radius: 16px; font: 400 15px/1.5 var(--ds-sans); background: var(--ds-card); border: 1px dashed var(--ds-rule); color: var(--ds-ink2); }
  .pp-fact b { display: block; font: 700 11px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--pp-ink); margin-bottom: 2px; }
  .pp-fact svg { position: absolute; left: 16px; top: 15px; color: var(--ds-gold); }
  .pp-ask { margin-top: 22px; }
  .pp-ask-q { font: 700 18px/1.35 var(--ds-head); margin-bottom: 10px; }
  .pp-opts { display: grid; gap: 8px; }
  .pp-gem-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font: 700 11.5px var(--ds-sans); color: #fff; background: ${DIAMOND_COLOR}; }
  .pp-who-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .pp-who-dots { display: flex; gap: 6px; } .pp-who-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--ds-rule2); transition: background .2s, transform .2s; }
  .pp-who-dots i.on { background: var(--pp); transform: scale(1.25); } .pp-who-dots i.ok { background: var(--ds-ok); } .pp-who-dots i.bad { background: var(--ds-bad); }
  .pp-who-item { margin: 0 0 22px; animation: pp-in .4s cubic-bezier(.2,.9,.3,1) backwards; }
  .pp-who-idea { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 16px; padding: 16px 18px; border-radius: 18px; background: var(--ds-card); border: 1px solid var(--ds-rule2);
    border-left: 4px solid var(--pp); font: 600 18px/1.45 var(--ds-sans); }
  .pp-who-idea svg { flex: none; margin-top: 3px; color: var(--ds-gold); }
  .pp-who-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  @media (min-width: 720px) { .pp-who-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .pp-who-pick { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 8px 10px; border-radius: 18px; border: 2px solid var(--ds-rule2);
    background: var(--ds-card); color: var(--ds-ink); cursor: pointer; font: 700 14px/1.25 var(--ds-sans); text-align: center; transition: border-color .15s, transform .15s, opacity .2s; }
  /* наведение — без подъёма: поднятая карточка уходила из-под курсора у нижнего края и дрожала вверх-вниз (жалоба 22.11, people-power) */
  .pp-who-pick:hover:not(:disabled) { border-color: color-mix(in srgb, var(--pp) 60%, var(--ds-rule2)); box-shadow: 0 6px 16px -10px var(--ds-shade); }
  .pp-who-pick:disabled { cursor: default; }
  .pp-who-pick.ok { border-color: var(--ds-ok); background: var(--ds-ok-bg); } .pp-who-pick.bad { border-color: var(--ds-bad); } .pp-who-pick.off { opacity: .5; }
  .pp-who-face .pp-pic { width: 84px; height: 104px; border-radius: 42px 42px 10px 10px; overflow: hidden; }
  .pp-who-face { display: block; width: 84px; height: 104px; border-radius: 42px 42px 10px 10px; overflow: hidden; }
  .pp-who-face > * { width: 100%; height: 100%; }
  .pp-who-mark { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
  .pp-who-mark.ok { background: var(--ds-ok); } .pp-who-mark.bad { background: var(--ds-bad); }
  .pp-who-says { margin-top: 12px; font: 600 15px var(--ds-sans); } .pp-who-says.ok { color: var(--ds-ok); } .pp-who-says.bad { color: var(--ds-bad); }
  @media (prefers-reduced-motion: reduce) { .pp-who-item, .pp-who-dots i, .pp-who-pick { animation: none; transition: none; } }
  .pp-opt { text-align: left; font: 500 15.5px/1.35 var(--ds-sans); padding: 13px 15px; border-radius: 14px; border: 2px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink); cursor: pointer; transition: border-color .15s, background .15s, transform .1s; }
  .pp-opt:hover:not(:disabled) { border-color: color-mix(in srgb, var(--pp) 60%, var(--ds-rule2)); }
  .pp-opt.ok { border-color: var(--ds-ok); background: var(--ds-ok-bg); }
  .pp-opt.bad { border-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 8%, var(--ds-card)); }
  .pp-opt:disabled { cursor: default; }
  .pp-fb { margin-top: 12px; padding: 12px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; border-left: 4px solid var(--ds-ok); background: var(--ds-ok-bg); color: var(--ds-ok-ink); animation: pp-in .3s ease-out backwards; }
  .pp-fb.bad { border-left-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 9%, var(--ds-card)); color: var(--ds-ink); }
  /* разбор выезжает на экран над нижней кнопкой, а не под неё */
  .pp-fb { scroll-margin-bottom: calc(96px + env(safe-area-inset-bottom)); }
  /* ПК: две колонки на всю ширину окна — страница целиком на экране, разбор под вариантами, на виду
     (жалоба: «экран может влезть во весь экран, но не влезает, и за плашкой „верно“ приходится мотать») */
  @media (min-width: 1024px) {
    .pp-page.pp-two { max-width: 1180px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); column-gap: 40px; align-items: start; padding: 20px 28px 110px; }
    .pp-two .pp-col-r { position: sticky; top: 72px; }
    .pp-two .pp-col-r > :first-child { margin-top: 0; }
    .pp-two .pp-era { margin-top: 18px; }
    .pp-two .pp-story p { font-size: 16px; line-height: 1.55; margin-top: 10px; }
    .pp-two .pp-ask { margin-top: 16px; }
    .pp-foot > * { max-width: 1124px; }
  }
  .pp-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--ds-paper) 92%, transparent); border-top: 1px solid var(--ds-rule2); backdrop-filter: blur(8px); }
  .pp-foot > * { max-width: 720px; margin: 0 auto; display: flex; gap: 10px; }
  .pp-foot > * > :last-child { flex: 1; }

  /* стена галереи: три рамы повисают на гвоздях и качаются */
  .pp-wall { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin: 26px 0 10px; }
  .pp-hang { position: relative; padding-top: 22px; transform-origin: 50% 0; animation: pp-hang 1.2s cubic-bezier(.3, 1.4, .5, 1) backwards; animation-delay: calc(var(--i) * .25s + .2s); }
  .pp-hang::before { content: ''; position: absolute; left: 50%; top: 0; width: 46px; height: 24px; margin-left: -23px; border: 1.5px solid var(--ds-ink3); border-bottom: 0; border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
  .pp-hang::after { content: ''; position: absolute; left: 50%; top: -3px; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: var(--ds-ink2); }
  @keyframes pp-hang { 0% { opacity: 0; transform: translateY(-60px) rotate(-14deg) } 55% { opacity: 1; transform: rotate(7deg) } 75% { transform: rotate(-3deg) } 100% { transform: rotate(0) } }
  .pp-hang .pp-frame { width: 112px; height: 138px; border-radius: 56px 56px 12px 12px; padding: 5px; }
  .pp-hang .pp-frame > .pp-pic { border-radius: 51px 51px 8px 8px; }
  .pp-hang figcaption { margin-top: 8px; text-align: center; font: 700 13px var(--ds-head); max-width: 120px; }
  .pp-done { text-align: center; }
  @media (max-width: 560px) {
    .pp-hero { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 14px; }
    .pp-role { justify-content: center; }
    .pp-frame { width: 140px; height: 174px; border-radius: 70px 70px 16px 16px; }
    .pp-frame > .pp-pic { border-radius: 64px 64px 11px 11px; }
    .pp-credit { margin: 6px auto 0; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) { .pp-hero, .pp-pic img, .pp-pic::after, .pp-era-life, .pp-era-mark, .pp-hang, .pp-fb { animation: none; } }
`;

/* Фото человека: свой файл из public/people (src/learn/portraits.js; в Википедию браузер не ходит) — если
   свободного фото нет, null */
export function usePhoto(p, off = false) {
  const [ph, setPh] = useState(() => (off ? null : cachedPhoto(p) || null));
  useEffect(() => {
    if (off) { setPh(null); return undefined; }
    let alive = true;
    loadPhoto(p).then((x) => { if (alive) setPh(x || null); });
    return () => { alive = false; };
  }, [p.id, off]); // eslint-disable-line react-hooks/exhaustive-deps
  return ph;
}
/* Портрет: свой файл из public/people (с подписью автора и лицензии), иначе — гравированный медальон: штриховка гравюры,
   двойная рамка и инициалы антиквой. Фото не загрузилось — тоже медальон. */
export function Portrait({ p, color, hidden = false, eager = false, zoom = false }) {
  const loaded = usePhoto(p, hidden);
  const [broken, setBroken] = useState(false);
  const photo = loaded && !broken ? loaded : null;
  const gid = `pp-h-${p.id}`;
  return (
    <div className="pp-pic" data-testid="people-portrait" data-photo={photo ? 'true' : 'false'}>
      {photo && zoom ? (
        // фото — касание открывает его на весь экран, целиком и с приближением (docs/mechanics.md, «Картинки на весь экран»)
        <Zoomable title={p.name} testid="people-portrait-zoom" width={480} badge="br" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
          view={() => <img src={photo.file} alt={`Портрет: ${p.name}`} referrerPolicy="no-referrer" style={{ filter: 'sepia(.25) contrast(1.04)' }} />}>
          <img src={photo.file} alt={`Портрет: ${p.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        </Zoomable>
      ) : photo ? <img src={photo.file} alt={`Портрет: ${p.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        : (
          <svg viewBox="0 0 120 150" width="100%" height="100%" role="img" aria-label={hidden ? 'Ещё не знакомы' : `${p.name} — медальон с инициалами`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id={gid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1" opacity=".22" /></pattern>
              <radialGradient id={`${gid}-g`} cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#FFF8E8" /><stop offset="1" stopColor={color} stopOpacity=".28" /></radialGradient>
            </defs>
            <rect width="120" height="150" fill={`url(#${gid}-g)`} />
            <rect width="120" height="150" fill={`url(#${gid})`} />
            {/* силуэт бюста — гравюрной штриховкой */}
            <path d="M60 30 C44 30 37 43 38 57 C39 70 46 79 52 82 L50 92 C34 96 22 106 18 150 L102 150 C98 106 86 96 70 92 L68 82 C74 79 81 70 82 57 C83 43 76 30 60 30 Z" fill={color} opacity=".16" />
            <path d="M60 30 C44 30 37 43 38 57 C39 70 46 79 52 82 L50 92 C34 96 22 106 18 150 L102 150 C98 106 86 96 70 92 L68 82 C74 79 81 70 82 57 C83 43 76 30 60 30 Z" fill="none" stroke={color} strokeWidth="1.1" opacity=".45" />
            <circle cx="60" cy="112" r="22" fill="#FFF8E8" stroke={color} strokeWidth="1.6" />
            <circle cx="60" cy="112" r="18.5" fill="none" stroke={color} strokeWidth=".7" opacity=".7" />
            <text x="60" y="119" textAnchor="middle" fontFamily="'PT Serif', Georgia, serif" fontWeight="700" fontSize="19" fill={color}>{hidden ? '?' : initialsOf(p.name)}</text>
          </svg>
        )}
    </div>
  );
}
// подпись под портретом: автор и лицензия, ссылка — на страницу файла (Commons или другой источник);
// у фото, положенного руками без строки в people/credits.csv, подписи нет
export function PhotoCredit({ p }) {
  const ph = usePhoto(p);
  if (!ph || (!ph.author && !ph.license)) return null;
  // файл в самой Википедии (не на Commons) — «Википедия»: так у Робинсон
  const where = /wikipedia\.org\/wiki\/File:/.test(ph.source || '') ? 'Википедия'
    : /wikimedia\.org|wikipedia\.org/.test(ph.source || '') || /^https:\/\/upload\.wikimedia/.test(ph.file || '') ? 'Wikimedia Commons' : 'источник';
  return (
    <div className="pp-credit" data-testid="people-credit">
      Фото: {[ph.author, ph.license].filter(Boolean).join(' · ')}{ph.source ? <> · <a href={ph.source} target="_blank" rel="noopener noreferrer">{where}</a></> : where === 'Wikimedia Commons' ? ' · Wikimedia Commons' : ''}
    </div>
  );
}

function Era({ p }) {
  const ticks = [1700, 1800, 1900, 2000];
  const pc = (y) => `${(eraPos(y) * 100).toFixed(2)}%`;
  return (
    <div className="pp-era" role="img" aria-label={`Годы жизни ${p.years}; главный год — ${p.mark}`} data-testid="people-era">
      <div className="pp-era-axis" />
      {ticks.map((t) => <div key={t} className="pp-era-tick" style={{ left: pc(t) }}><span>{t}</span></div>)}
      <div className="pp-era-life" style={{ left: pc(p.born), width: `calc(${pc(p.died)} - ${pc(p.born)})` }} />
      <div className="pp-era-mark" style={{ left: pc(p.mark) }}><b>{p.mark}</b><i /></div>
    </div>
  );
}

/* Алмазный уровень: «Чья это идея?» — идея без имени, выбрать автора; ответ один раз, ошибка видна сразу */
/* Алмаз «Персоналий»: «Чья это идея?» (пункт владельца 15.11: «мне не нравится формат теста в персоналиях на алмазном
   уровне» — была стена из трёх идей с одними и теми же четырьмя кнопками-именами). Теперь — одна идея на экран, ответ —
   касание портрета: трое людей урока и один лишний из другой группы. Ответили — рамка верного портрета зелёная (ошибка —
   красная у выбранного), через мгновение — следующая идея; сверху — точки: какие идеи уже взяты. */
function WhoIdea({ items, picks, onPick, color }) {
  const reduced = useReducedMotion();
  const first = items.findIndex((it) => picks[it.k] == null);
  const [at, setAt] = useState(first < 0 ? items.length - 1 : first);
  const it = items[at];
  const mine = picks[it.k];
  useEffect(() => {
    if (mine == null || at >= items.length - 1) return undefined;
    const t = setTimeout(() => setAt(at + 1), reduced ? 500 : 1100);
    return () => clearTimeout(t);
  }, [mine, at, items.length, reduced]);
  return (
    <div className="pp-page" data-testid="people-who">
      <div className="pp-who-head">
        <div className="pp-ask-q" style={{ fontSize: 22, margin: 0 }}>Чья это идея?</div>
        <div className="pp-who-dots" aria-label={`Идея ${at + 1} из ${items.length}`}>
          {items.map((x, n) => {
            const p = picks[x.k];
            return <i key={x.k} className={p == null ? (n === at ? 'on' : '') : p === x.answer ? 'ok' : 'bad'} />;
          })}
        </div>
      </div>
      <div className="ds-sub" style={{ fontSize: 15, margin: '4px 0 14px' }}>Алмазный уровень: коснитесь портрета автора. Алмаз — без единой ошибки.</div>
      <div className="pp-who-item" key={it.k} data-testid="people-who-item" data-answered={mine != null ? 'true' : 'false'}>
        <blockquote className="pp-who-idea"><Lightbulb size={20} aria-hidden="true" />{it.idea}</blockquote>
        <div className="pp-who-grid" role="group" aria-label="Кто автор">
          {it.options.map((o) => {
            const who = personByName(o);
            const st = mine == null ? '' : o === it.answer ? 'ok' : o === mine ? 'bad' : 'off';
            return (
              <button key={o} type="button" className={`pp-who-pick ${st}`} disabled={mine != null} data-testid="people-who-opt" data-ok={o === it.answer ? 'true' : undefined}
                aria-label={o} onClick={() => onPick(it.k, o)}>
                <span className="pp-who-face">{who ? <Portrait p={who.p} color={who.g.color || color} /> : null}</span>
                <span className="pp-who-name">{o}</span>
                {st === 'ok' && <span className="pp-who-mark ok" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
                {st === 'bad' && <span className="pp-who-mark bad" aria-hidden="true"><X size={16} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
        {mine != null && <div className={`pp-who-says ${mine === it.answer ? 'ok' : 'bad'}`} role="status">{mine === it.answer ? `Верно: это ${it.answer}.` : `Это ${it.answer}.`}</div>}
      </div>
    </div>
  );
}

export default function PeopleView({ id, learn, update, onClose, gem = false }) {
  const g = PEOPLE_BY_ID[id];
  const reduced = useReducedMotion();
  // вышли посреди урока — продолжаем с того же человека, с теми же ответами и порядком вариантов (learn-special.jsx)
  const resume = useSpecialResume('people', id, gem);
  const was = resumedState(resume);
  const [k, setK] = useState(() => (was ? was.k : 0));
  const [picked, setPicked] = useState(() => (was ? was.picked : {}));
  const [order] = useState(() => (was && was.order ? was.order : g.people.map((p) => p.ask.options.map((o, i) => ({ ...o, i })).sort(() => Math.random() - 0.5))));
  const run = useAnswerRun(was ? was.run || 0 : streakNow(learn || {}), [], (ok) => { if (update) update((st) => tallyAnswer(st, ok)); });
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null); // итоги урока: опыт, монеты, выплаты
  // алмазный уровень: после людей — «Чья это идея?»; алмаз — без единой ошибки
  // порядок идей — не порядок людей и свой на каждый заход; при продолжении — тот же (пункт владельца 22.11, п. 8)
  const [whoSeed] = useState(() => (was && was.whoSeed) || 1 + Math.floor(Math.random() * 2 ** 30));
  const who = useMemo(() => (gem && g ? quizIdea(g, whoSeed) : []), [gem, g, whoSeed]);
  const [whoStage, setWhoStage] = useState(() => !!(was && was.whoStage));
  const [whoPicks, setWhoPicks] = useState(() => (was ? was.whoPicks || {} : {}));
  const whoDone = who.length > 0 && who.every((it) => whoPicks[it.k] != null);
  const pickWho = (k, name) => {
    if (whoPicks[k] != null) return;
    Audio.play(name === who[k].answer ? 'coin' : 'down');
    run.answer(name === who[k].answer);
    setWhoPicks((m) => ({ ...m, [k]: name }));
  };
  const activeMs = useActiveMs(was ? was.ms || 0 : 0);
  const firstOk = useRef(was ? { ...was.firstOk } : {});
  const root = useRef(null);
  // знакомы ли были до этого захода: после финиша прогресс уже отмечен, а на экране — «+12 опыта»
  const [already] = useState(() => isMet(learn, id));
  // все три портрета — сразу при входе, а не по одному при переходе к человеку
  useEffect(() => { preloadPhotos(g.people); }, [g]);
  useEffect(() => { if (root.current) root.current.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }, [k, finished, whoStage, reduced]);
  const p = g.people[k];
  const choice = picked[k];
  const answered = choice != null && order[k][choice].ok;
  const pick = (i) => {
    if (answered) return;
    const ok = !!order[k][i].ok;
    if (!(k in firstOk.current)) { firstOk.current[k] = ok; run.answer(ok); }
    Audio.play(ok ? 'coin' : 'down');
    setPicked((m) => ({ ...m, [k]: i }));
    pickedAt.current = Date.now();
  };
  // ответили — разбор выезжает на экран (над нижней кнопкой), если он ниже края; при переходе назад не дёргаем
  const fbRef = useRef(null);
  const pickedAt = useRef(0);
  useEffect(() => {
    const el = fbRef.current;
    if (!el || Date.now() - pickedAt.current > 1000 || !el.scrollIntoView) return;
    el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [choice, k, reduced]);
  // место урока — после каждого ответа и перехода; урок закончен — сохранённое убираем
  useEffect(() => {
    if (finished) { resume.drop(); return; }
    if (Object.keys(picked).length || k > 0 || whoStage) resume.save({ pos: k, k, picked, order, whoStage, whoPicks, whoSeed, firstOk: firstOk.current, run: run.current(), ms: activeMs() });
  }, [k, picked, whoStage, whoPicks, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => {
    Audio.play('paper');
    if (k < g.people.length - 1) { setK(k + 1); return; }
    if (gem && !whoStage) { setWhoStage(true); return; }
    const acc = (Object.values(firstOk.current).filter(Boolean).length / g.people.length) * 100;
    const right = Object.values(firstOk.current).filter(Boolean).length;
    if (gem) {
      // алмаз — без единой ошибки и в вопросах о людях, и в «Чья это идея?»; опыт и монеты — за первый взятый
      const whoRight = who.filter((it) => whoPicks[it.k] === it.answer).length;
      const all = g.people.length + who.length; const ok = right + whoRight;
      const won = ok === all; const had = hasGem(learn, id);
      const apply = (s) => { const t = countAnswers(s, ok, all); return won && !had ? markGem(finishLesson(t, null, { xp: MET_XP, accuracy: 100, seconds: activeMs() / 1000, kind: 'people', extra: { fresh: false } }), id) : addStudySeconds(t, activeMs() / 1000); };
      const pay = payExtra(learn, update, apply, { id, diamond: true, won, gem: had, accuracy: (ok / all) * 100 });
      Audio.play(won ? 'stamp' : 'register');
      setResult({ xp: won && !had ? MET_XP : 0, right: ok, total: all, ms: activeMs(), diamond: true, won, replay: won && had, ...pay });
      setFinished(true);
      return;
    }
    // верные ответы — в задание дня «N верных ответов», и при повторе (docs/mechanics.md);
    // впервые — опыт и монеты, как за урок, и всё, что урок выполнил (settle); итоги — как после урока
    const apply = (s) => { const t = countAnswers(s, right, g.people.length); return already ? addStudySeconds(t, activeMs() / 1000) : markMet(finishLesson(t, null, { xp: MET_XP, accuracy: acc, seconds: activeMs() / 1000, kind: 'people', extra: { fresh: true } }), id); };
    const pay = payExtra(learn, update, apply, { id, fresh: !already, accuracy: acc });
    Audio.play('register');
    setResult({ xp: already ? 0 : MET_XP, right, total: g.people.length, ms: activeMs(), replay: already, ...pay });
    setFinished(true);
  };
  // назад — к прошлому человеку: его ответ и разбор на месте
  // с «Чья это идея?» — назад к последнему человеку (пункт владельца 22.11, п. 7)
  const back = () => { if (whoStage) { Audio.play('paper'); setWhoStage(false); return; } if (k > 0) { Audio.play('paper'); setK(k - 1); } };
  const style = { '--pp': g.color, '--pp-ink': `color-mix(in srgb, ${g.color} 82%, #000)` };
  const met = galleryOf({ ...learn, met: { ...learn.met, [id]: 1 } }).filter((x) => x.met).length;
  return (
    <SpecialShell learn={learn}>
    <div className="pp-root" ref={root} style={style} data-testid="people" data-id={id} role="dialog" aria-label={`Персоналии: ${g.title}`}>
      <style>{PEOPLE_CSS + REPORT_CSS}</style>
      {/* шапка как у урока: «✕», полоса прогресса по людям, молния «верно подряд» и Инфля (learn-special.jsx) */}
      <SpecialHead closeLabel="Закрыть" closeTestid="people-close" onClose={() => { Audio.play('paper'); onClose(); }} run={run}
        total={g.people.length + (gem ? 1 : 0)}
        answers={[...g.people.map((_, i) => firstOk.current[i]).filter((v) => v !== undefined), ...(whoDone ? [who.every((it) => whoPicks[it.k] === it.answer)] : [])]}
        onBack={!finished && (whoStage || k > 0) ? back : null} >
      <SpecialLabel kind="Персоналии" title={g.title} gem={gem} gemTestid="people-gem-tag">
        {/* «Сообщить об ошибке» — как в любом уроке: человек, вопрос и выбранный ответ уходят в жалобу */}
        <ReportFlag context={() => ({
          screen: 'people', lesson: id, unit: g.unitId, kind: 'people',
          step: finished ? 'итог' : whoStage ? 'алмаз: «Чья это идея?»' : `${p.name}, ${k + 1} из ${g.people.length}${gem ? ' (алмаз)' : ''}`,
          prompt: finished ? g.title : whoStage ? `Чья это идея? ${who.map((it) => it.idea).join(' / ')}`.slice(0, 1500) : `${p.ask.prompt} — ${p.ask.options.map((o) => o.text).join(' / ')}`.slice(0, 1500),
          answer: finished ? '' : whoStage ? who.map((it) => whoPicks[it.k] || '—').join(' / ') : choice != null ? order[k][choice].text : '',
        })} />
      </SpecialLabel>
      </SpecialHead>
      <SpecialDesk learn={learn} />
      {!finished && whoStage ? <WhoIdea items={who} picks={whoPicks} onPick={pickWho} color={g.color} /> : !finished ? (
        <div className="pp-page pp-two" key={p.id} data-testid="people-page" data-person={p.id}>
          <div className="pp-col-l">
          <div className="pp-hero">
            <div>
              <div className="pp-frame"><Portrait p={p} color={g.color} eager zoom /></div>
              <PhotoCredit p={p} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="pp-name" data-testid="people-name">{p.name}</div>
              <div className="pp-role"><span>{p.years}</span><span>{p.role}</span>{p.again && <span className="pp-again" data-testid="people-again">Уже знакомы</span>}</div>
              {p.again && PEOPLE_BY_ID[p.firstGroup] && <div className="pp-again-note" data-testid="people-again-note">Вы встречали {p.name.split(' ').pop()} в «{PEOPLE_BY_ID[p.firstGroup].title}» — теперь о другом.</div>}
              <div className="pp-lead">{p.lead}</div>
            </div>
          </div>
          <Era p={p} />
          <div className="pp-story">{p.story.map((t, i) => <p key={i}>{t}</p>)}</div>
          </div>
          <div className="pp-col-r">
          <div className="pp-idea ds-card" data-testid="people-idea"><Lightbulb size={22} aria-hidden="true" />{p.idea}</div>
          <div className="pp-fact ds-card"><Sparkles size={20} aria-hidden="true" /><b>Знаете ли вы</b>{p.fact}</div>
          <div className="pp-ask">
            <div className="pp-ask-q">{p.ask.prompt}</div>
            <div className="pp-opts" role="group" aria-label="Варианты ответа">
              {order[k].map((o, i) => {
                const st = choice === i ? (o.ok ? 'ok' : 'bad') : answered && o.ok ? 'ok' : '';
                return <button key={o.i} type="button" className={`ds-opt ${st === 'ok' ? 'right' : st === 'bad' ? 'wrong' : ''}`} aria-pressed={choice === i} disabled={answered} data-testid="people-opt" data-ok={o.ok ? 'true' : 'false'} onClick={() => pick(i)}>{o.text}</button>;
              })}
            </div>
            {choice != null && (
              <div ref={fbRef} key={choice}>
                <AnswerBar ok={!!order[k][choice].ok} className="sp-inline" role="status" data-testid="people-feedback" data-ok={String(!!order[k][choice].ok)}>
                  <div className="ln-fb-body">{order[k][choice].ok ? p.idea : <>{order[k][choice].why} Попробуйте ещё раз.</>}</div>
                </AnswerBar>
              </div>
            )}
          </div>
          </div>
        </div>
      ) : (
        <div className="pp-page pp-done" data-testid="people-done">
          {result && <ExtraResult kind="people" unitId={g.unitId} title={g.title} r={result} />}
          <div className="ds-eyebrow" style={{ marginTop: 22 }}>{already ? 'Портреты — в галерее профиля' : 'Новые знакомства — в галерее профиля'}</div>
          <div className="pp-wall" data-testid="people-wall">
            {g.people.map((x, i) => (
              <figure key={x.id} className="pp-hang" style={{ '--i': i, margin: 0 }}>
                <div className="pp-frame"><Portrait p={x} color={g.color} /></div>
                <figcaption>{x.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className="ds-sub" style={{ fontSize: 14 }} data-testid="people-count">В галерее: {met} из {galleryOf(learn).length}</div>
        </div>
      )}
      <div className="ln-foot sp-foot" data-testid="people-foot">
        <div className="ln-inner">
          {finished
            ? <Button wide data-testid="people-finish" onClick={() => { Audio.play('click'); onClose(); }}>Дальше</Button>
            : whoStage ? <>
              <Button variant="secondary" icon={ArrowLeft} data-testid="people-back" onClick={back}>Назад</Button>
              <Button wide icon={Check} disabled={!whoDone} data-testid="people-next" onClick={next}>{whoDone ? 'Готово' : 'Выберите автора у каждой идеи'}</Button>
            </>
            : <>
              <Button variant="secondary" icon={ArrowLeft} disabled={k === 0} data-testid="people-back" onClick={back}>Назад</Button>
              <Button wide icon={ArrowRight} disabled={!answered} data-testid="people-next" onClick={next}>{k < g.people.length - 1 ? 'Следующий человек' : gem ? 'Чья это идея?' : 'В галерею'}</Button>
            </>}
        </div>
      </div>
    </div>
    </SpecialShell>
  );
}
