/* ИТОГИ ОСОБОГО УРОКА (docs/mechanics.md, «Особые уроки юнита»): «Персоналии», «Чтение», «Разбор графика» и
   «Нарисуй сам» заканчиваются тем же экраном, что и урок, — розетка с Инфлей, реплика, опыт, точность, время,
   монеты «За урок» и всё, что урок выполнил по пути (цель дня, задания, печати), огонёк серии. Своё у вида урока
   (галерея, полка, построенный график) — под итогами. Здесь же — выплата: монеты урока и settle, как в уроке. */
import React from 'react';
import { Flame } from 'lucide-react';
import { Card } from './ds.jsx';
import { DIAMOND_COLOR } from './ds-tokens.js';
import { Guilloche, Rosette, CoinShower, CountUp } from './ds-art.jsx';
import { Mascot } from './mascot.jsx';
import { GainsList } from './learn-rewards.jsx';
import { pickPhrase, endKind } from './learn/voice.js';
import { placeOf } from './ds-tokens.js';
import { EXTRA_KIND } from './learn/stops.js';
import { earn, settle, indexed, hasClaim, extraCoins, extraKey, plural } from './learn/rewards.js';
import { courseCtx } from './learn/program.js';
import { streak } from './textbook/learn-state.js';

/* Выплата особого урока: apply — что урок пишет в прогресс (опыт, отметка «пройден» или алмаз, ответы дня); сверху —
   монеты (один раз: ключ x:<id>, алмаз — xd:<id>) и всё, что набралось (settle). Возвращает, что показать в итогах.
   diamond — пройден на алмазном уровне, won — алмаз взят сейчас, gem — алмаз уже был раньше. */
export function payExtra(learn, update, apply, { id, fresh = false, accuracy, diamond = false, won = false, gem = false, now = Date.now() }) {
  const coins = indexed(extraCoins({ fresh, accuracy, diamond, won, gem }), now);
  const key = extraKey(id, diamond);
  const full = (s) => { const t = earn(apply(s), coins, key, now); return settle(t, courseCtx(t), now); };
  const preview = full(learn);
  // первый урок дня продлил серию — огонёк, как после урока
  const before = streak(learn, now); const after = streak(preview.s, now);
  update((s) => full(s).s);
  return { coins: hasClaim(learn, key) ? 0 : coins, gains: preview.gains, streakUp: !before.today && after.today ? after.days : 0 };
}

const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const SPARKS = [-70, -35, 0, 35, 70, 110, -110];
// огонёк серии на итогах: первый урок дня продлил серию (стили — .ln-burst в src/learn.jsx)
export function StreakBurst({ days }) {
  return (
    <div className="ln-burst" data-testid="result-streak" data-days={days} role="img" aria-label={`Серия: ${days} ${plural(days, 'день', 'дня', 'дней')} подряд`}>
      <span className="ln-burst-flame">
        {SPARKS.map((a) => <i key={a} style={{ '--a': `${a}deg` }} />)}
        <Flame size={52} color="var(--ds-bad)" fill="color-mix(in srgb, var(--ds-bad) 30%, transparent)" aria-hidden="true" />
      </span>
      <span style={{ textAlign: 'left' }} aria-hidden="true">
        <span className="ln-burst-num"><span className="old">{days - 1}</span><span className="new">{days}</span></span>
        <span className="ln-burst-cap">{plural(days, 'день', 'дня', 'дней')} подряд</span>
      </span>
    </div>
  );
}

const CSS = `
  .xr { max-width: 560px; margin: 0 auto; text-align: center; animation: xr-up .45s cubic-bezier(.2, .9, .3, 1) backwards;
    --u-ink: color-mix(in srgb, var(--u) 80%, #000); }
  .ds-dark .xr { --u-ink: color-mix(in srgb, var(--u) 42%, #fff); }
  .xr .ds-h1 { margin: 0; }
  .xr-own { margin-top: 18px; }
  @keyframes xr-up { from { opacity: 0; transform: translateY(14px); } }
  @media (prefers-reduced-motion: reduce) { .xr { animation: none; } }
`;

/* kind — вид особого урока, unitId — юнит (место на карте), title — название; r — итоги:
   { xp, right, total, accuracy?, ms, coins, gains, streakUp, replay, diamond?, won? } (diamond — алмазный уровень,
   won — алмаз взят; replay на алмазе — алмаз уже был).  children — своё у вида урока, под итогами. */
export function ExtraResult({ kind, unitId, title, r, children = null }) {
  // точность — как записана в прогресс (у «Разбора графика» один вопрос: промах — 60%, а не 0%)
  const accuracy = r.accuracy != null ? Math.round(r.accuracy) : r.total ? Math.round((r.right / r.total) * 100) : 100;
  const mistakes = Math.max(0, (r.total || 0) - (r.right || 0));
  const pl = placeOf(unitId);
  return (
    <div className="xr" data-testid="extra-result" data-kind={kind} data-coins={r.coins} data-replay={r.replay ? 'true' : undefined}
      data-diamond={r.diamond ? 'true' : undefined} data-won={r.diamond ? String(!!r.won) : undefined} style={{ '--u': pl.color }}>
      <style>{CSS}</style>
      <CoinShower seed={(r.xp || 0) + (r.coins || 0) + 1} />
      <Card style={{ padding: 0, overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
        <Guilloche height={22} />
        <div style={{ padding: '14px 16px 18px' }}>
          <div className="ds-eyebrow">{pl.place} · {EXTRA_KIND[kind]}</div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
            <Rosette size={128} opacity={0.5}><Mascot mood={r.diamond && !r.won ? 'cheer' : accuracy >= 60 ? 'party' : 'cheer'} size={70} /></Rosette>
          </div>
          <h2 className="ds-h1">{r.diamond ? (r.won ? 'Алмаз взят' : 'Алмаз не взят') : 'Урок пройден'}</h2>
          <div className="ds-h3" style={{ color: 'var(--u-ink)', marginTop: 4 }} data-testid="result-say">
            {pickPhrase(endKind({ mistakes, accuracy }), new Set())}
          </div>
          <div className="ds-sub" style={{ fontSize: 15.5, margin: '6px 0 16px' }} data-testid="result-text">
            «{title}». {!r.total ? '' : r.total === 1 ? (mistakes ? 'Ответ — не с первой попытки.' : 'Ответ — с первой попытки.')
              : mistakes === 0 ? 'Все ответы — с первой попытки.' : `С первой попытки — ${r.right} из ${r.total}.`}
            {r.diamond && <div style={{ marginTop: 6, color: DIAMOND_COLOR, fontWeight: 700 }} data-testid="result-diamond">
              {r.won ? '◆ Алмазный уровень взят' : '◆ Для алмаза — без единой ошибки. Можно ещё раз.'}
            </div>}
          </div>
          {r.streakUp > 0 && <StreakBurst days={r.streakUp} />}
          <div className="ln-tickets">
            <div data-testid="result-xp"><div className="ds-eyebrow" style={{ fontSize: 12 }}>Опыт</div><div className="v"><CountUp value={r.xp || 0} prefix="+" /></div></div>
            <div data-testid="result-acc"><div className="ds-eyebrow" style={{ fontSize: 12 }}>Точность</div><div className="v">{accuracy}%</div></div>
            <div data-testid="result-time"><div className="ds-eyebrow" style={{ fontSize: 12 }}>Время</div><div className="v">{mmss(r.ms)}</div></div>
          </div>
          <GainsList coins={r.coins || 0} gains={r.gains || []} />
          {r.replay && <div className="ds-faint" style={{ fontSize: 13.5, marginTop: 12 }} data-testid="result-replay">
            {r.diamond ? 'Алмаз уже был взят: опыт и монеты за него получены раньше.' : 'Урок уже был пройден: опыт и монеты за него получены раньше. На алмазном уровне — сложнее, а награда больше.'}
          </div>}
        </div>
        <Guilloche height={22} />
      </Card>
      {children && <div className="xr-own">{children}</div>}
    </div>
  );
}
