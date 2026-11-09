/* ЗАКРЫТАЯ ПОКА ВОЗМОЖНОСТЬ (docs/mechanics.md, «Открытия»; правила — src/learn/unlocks.js): вкладка или
   отдел на месте, но вместо содержимого — карточка «откроется после N-го урока»: что там будет, сколько
   уроков осталось (кружки) и кнопка к уроку. Открытие празднует церемония (src/learn-celebrate.jsx).
   Автотест (Playwright, navigator.webdriver) видит всё открытым, если сам не включил замки
   (ems-unlock-test) — как с церемониями: иначе каждая проверка лавки начиналась бы с уроков. */
import React from 'react';
import { Lock, Trophy, ShoppingBag, PiggyBank, Sprout, Globe, ArrowRight, Hourglass, Save } from 'lucide-react';
import { Card, Button } from './ds.jsx';
import { askSave, askLogin } from './lib/guest.js';
import { UNLOCK_BY_ID, isUnlocked, lessonsLeft, progressOf } from './learn/unlocks.js';
import { plural } from './lib/plural.js';
import { trialOf, trialWorldOpen } from './lib/world-trial.js';

export const unlockBypass = () => {
  try { return typeof navigator !== 'undefined' && !!navigator.webdriver && localStorage.getItem('ems-unlock-test') !== '1'; } catch { return false; }
};
/* «Мир» уже открывали до замка (есть сохранённая партия или выбрана тема «Мира») — он и остаётся
   открытым: у игравших игру не отнимаем. Следы пробы с приветствия (src/lib/world-trial.js) не в счёт */
const WORLD_TRACES = ['ems-autosave-v1', 'ems-tycoon-v1', 'ems-world-theme', 'ems-world-music'];
export const worldPlayed = () => { try { return !trialOf() && WORLD_TRACES.some((k) => localStorage.getItem(k) != null); } catch { return false; } };
const hasAccount = () => { try { const a = JSON.parse(localStorage.getItem('ems-account') || 'null'); return !!(a && a.login); } catch { return false; } };
/* «Мир» на пробу: идёт проба — открыт; кончилась — закрыт до регистрации, потом — после 10-го урока, как у всех */
export const featureOpen = (learn, id) => {
  if (unlockBypass()) return true;
  if (id === 'world') { const t = trialWorldOpen({ hasAccount: hasAccount() }); if (t !== null) return t; return isUnlocked(learn, id) || worldPlayed(); }
  return isUnlocked(learn, id);
};
export const ICON = { trophy: Trophy, shop: ShoppingBag, piggy: PiggyBank, sprout: Sprout, globe: Globe };

const CSS = `
  .fl { text-align: center; padding: 22px 18px 18px; }
  .fl-ico { position: relative; width: 104px; height: 104px; margin: 4px auto 12px; border-radius: 50%; display: grid; place-items: center;
    color: var(--fl); background: color-mix(in srgb, var(--fl) 10%, var(--ds-card)); border: 2px dashed color-mix(in srgb, var(--fl) 45%, var(--ds-rule)); }
  .fl-ico .lk { position: absolute; right: -2px; bottom: -2px; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
    background: var(--ds-card); color: var(--ds-ink2); border: 2px solid var(--ds-rule2); animation: fl-wiggle 3.6s ease-in-out 1s infinite; }
  @keyframes fl-wiggle { 0%, 86%, 100% { transform: none } 89% { transform: rotate(-14deg) } 92% { transform: rotate(10deg) } 95% { transform: rotate(-6deg) } }
  .fl h2 { margin: 0; font: 700 22px/1.25 var(--ds-head); }
  .fl p { margin: 8px auto 0; max-width: 34ch; font: 400 15px/1.5 var(--ds-sans); color: var(--ds-ink2); }
  .fl-dots { display: flex; justify-content: center; gap: 8px; margin: 14px 0 6px; }
  .fl-dots i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--fl) 55%, var(--ds-rule)); }
  .fl-dots i.on { background: var(--fl); border-color: var(--fl); }
  .fl-left { font: 700 14px var(--ds-sans); color: var(--ds-ink); }
  .fl.compact { padding: 14px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; align-items: center; text-align: left; }
  .fl.compact .fl-ico { width: 56px; height: 56px; margin: 0; grid-row: span 3; }
  .fl.compact .fl-ico .lk { width: 24px; height: 24px; }
  .fl.compact h2 { font-size: 17px; }
  .fl.compact p { margin: 0; font-size: 14px; max-width: none; }
  .fl.compact .fl-dots { justify-content: flex-start; margin: 4px 0 0; }
  @media (prefers-reduced-motion: reduce) { .fl-ico .lk { animation: none; } }
  /* «Мир» на пробу: плашка с оставшимся временем, окно «Пробная игра окончена», карточка сохранённой партии */
  .wt-chip { position: fixed; left: 10px; bottom: calc(78px + env(safe-area-inset-bottom)); z-index: 80; pointer-events: none; display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 999px; font: 700 12.5px var(--ds-sans, sans-serif); font-variant-numeric: tabular-nums; color: #fff; background: rgba(46, 94, 140, .92); box-shadow: 0 4px 12px rgba(0,0,0,.18); }
  .wt-chip.low { background: rgba(194, 73, 11, .95); }
  .wt-back { position: fixed; inset: 0; z-index: 400; background: rgba(20, 14, 8, .48); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .wt-sheet { width: 100%; max-width: 420px; text-align: center; padding: 22px 18px 18px; }
  .wt-sheet h2 { margin: 6px 0 0; font: 700 22px/1.25 var(--ds-head); }
  .wt-sheet p { margin: 8px auto 0; max-width: 36ch; font: 400 15px/1.5 var(--ds-sans); color: var(--ds-ink2); }
  .wt-btns { display: grid; gap: 8px; margin-top: 16px; }
  .wt-card { padding: 14px 16px; margin: 8px 0 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; align-items: center; }
  .wt-card .ico { grid-row: span 2; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: #2E5E8C; }
`;
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
// сколько осталось пробы — в углу, пока «Мир» на экране
export function WorldTrialChip({ left }) {
  return (
    <div className={`wt-chip${left <= 60 ? ' low' : ''}`} data-testid="world-trial-chip" role="status" aria-label={`Проба «Мира»: осталось ${mmss(left)}`}>
      <style>{CSS}</style><Hourglass size={14} aria-hidden="true" />Проба «Мира»: {mmss(left)}
    </div>
  );
}
// время пробы вышло: партия сохранена, дальше — с аккаунтом и после 10-го урока
export function WorldTrialEnd({ hasAccount, onLessons }) {
  return (
    <div className="wt-back" data-testid="world-trial-end" role="dialog" aria-modal="true" aria-label="Пробная игра окончена">
      <style>{CSS}</style>
      <Card className="wt-sheet">
        <div style={{ display: 'flex', justifyContent: 'center' }}><span className="fl-ico" style={{ '--fl': '#2E5E8C', width: 84, height: 84, margin: 0 }} aria-hidden="true"><Globe size={40} strokeWidth={1.8} /><span className="lk"><Lock size={15} /></span></span></div>
        <h2>Пробная игра окончена</h2>
        <p>Партия сохранена и подождёт вас. {hasAccount ? '' : 'Чтобы продолжить, создайте аккаунт — это бесплатно. '}«Мир» откроется снова после 10-го урока: уроки по 3–5 минут, и решения в игре станут понятнее.</p>
        <div className="wt-btns">
          {!hasAccount && <Button wide data-testid="world-trial-register" onClick={askSave}>Создать аккаунт</Button>}
          {!hasAccount && <Button wide variant="secondary" data-testid="world-trial-login" onClick={askLogin}>У меня есть аккаунт — войти</Button>}
          <Button wide variant={hasAccount ? 'primary' : 'ghost'} data-testid="world-trial-lessons" onClick={onLessons}>К урокам</Button>
        </div>
      </Card>
    </div>
  );
}
// на закрытой вкладке «Мир» после пробы: партия сохранена; без аккаунта — сначала регистрация
export function WorldTrialSaved({ hasAccount }) {
  return (
    <Card className="wt-card" data-testid="world-trial-saved">
      <style>{CSS}</style>
      <span className="ico" aria-hidden="true"><Save size={22} /></span>
      <b style={{ font: '700 16px var(--ds-head)' }}>Пробная партия сохранена</b>
      <span className="ds-sub" style={{ fontSize: 14 }}>{hasAccount ? 'Продолжите её, когда «Мир» откроется, — после 10-го урока.' : 'Чтобы продолжить, создайте аккаунт; «Мир» откроется после 10-го урока.'}</span>
      {!hasAccount && <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <Button small data-testid="world-trial-saved-register" onClick={askSave}>Создать аккаунт</Button>
        <Button small variant="ghost" onClick={askLogin}>Войти</Button>
      </div>}
    </Card>
  );
}

export function FeatureLocked({ id, learn, onPath = null, compact = false }) {
  const u = UNLOCK_BY_ID[id];
  if (!u) return null;
  const Icon = ICON[u.icon] || Lock;
  const left = lessonsLeft(learn, id); const have = Math.min(u.lessons, progressOf(learn));
  return (
    <Card className={`fl${compact ? ' compact' : ''}`} style={{ '--fl': u.color, margin: compact ? '0 0 14px' : '8px 0 14px' }} data-testid="feature-locked" data-feature={id} data-left={left}>
      <style>{CSS}</style>
      <div className="fl-ico" aria-hidden="true"><Icon size={compact ? 28 : 50} strokeWidth={1.8} /><span className="lk"><Lock size={compact ? 13 : 17} /></span></div>
      <h2>{u.title} — после {u.lessons}-го урока</h2>
      <p>{u.text}</p>
      <div>
        <div className="fl-dots" aria-hidden="true">{Array.from({ length: u.lessons }, (_, k) => <i key={k} className={k < have ? 'on' : ''} />)}</div>
        <span className="fl-left">{left ? `Осталось ${left} ${plural(left, 'урок', 'урока', 'уроков')}` : 'Уже открыто'}</span>
      </div>
      {onPath && !compact && <Button style={{ marginTop: 14 }} onClick={onPath} data-testid="feature-locked-go">К уроку<ArrowRight size={17} aria-hidden="true" /></Button>}
    </Card>
  );
}
