/* ЛАВКА: витрина дня, вещи для урока, ювелир, гардероб, полезное (заморозка, усилитель, страховка серии, копилка),
   «Пыльная витрина» и переход в сад. Вынесена из src/learn-rewards.jsx отдельным ленивым файлом
   (docs/mechanics.md, «Приветствие и загрузка»): грузится, когда открывают вкладку «Лавка», а не до появления Пути.
   Стили лавки — в REWARD_CSS (src/learn-rewards.jsx): их вставляет вкладка обучения. */
import React, { useEffect, useRef, useState } from 'react';
import { trackDaily } from './lib/client.js';
import { loadAccount } from './account.jsx';
import { noScarcity } from './lib/age.js';
import { ShieldCheck, Check, Coins, TrendingUp, TrendingDown, Minus, Gem, Zap, Ghost, Crown, Lock, Plus, Store, Palette, Shirt, PiggyBank, ChevronDown, Sparkles } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Mascot } from './mascot.jsx';
import { Button, Card, Heading } from './ds.jsx';
import { halloween, seasonLeftText, WEB_FRAME } from './learn/halloween.js';
import { Rosette } from './ds-art.jsx';
import { ShopSwitch, RateWeek } from './learn-rate.jsx';
import { featureOpen, FeatureLocked } from './learn-unlock.jsx';
import { DeskDecor } from './learn-decor.jsx';
import { SkinPreview, SKIN_CSS } from './learn-skins.jsx';
// сад — отдельный ленивый чанк: грузится, только когда открыли «Сад»
const GardenView = React.lazy(() => import('./learn-garden.jsx').then((m) => ({ default: m.GardenView })));
const DustGame = React.lazy(() => import('./learn-dust.jsx'));
import {
  balance, rateOn, rateHistory, priceOf, crownsOn, inflationInfo, buy, setWear, outfitOf, deskOf, themeOf, FREEZE, BOOST, WARDROBE, OUTFIT_BY_ID, SLOT_LABEL, shopDay, boostActive, DEAL_OFF,
  policyInfo, takePolicy, cancelPolicy, PREMIUM, coinsWord, plural, PIGGY, piggyState, piggyPut, piggyTake, piggyAdd, topupRate, piggyValue, forgone, REAL_RATE, realCurve, weekRate,
  yearGrowth, rewardInfo,
} from './learn/rewards.js';
import { DUST, dustDone, dustItem } from './learn/dust.js';
import { dayOf, addDays, dayStart, ownedFreezes, rolloverLocal } from './textbook/learn-state.js';


const fmtRate = (r) => r.toFixed(2).replace('.', ',');

/* ------------------------------ ГРАФИК КУРСА ------------------------------
   Одна линия за 14 дней, пунктир — 1,0 (крона = монета). Касание или наведение — день и курс. */
/* График курса: ширина рисунка — ширина экрана (иначе рисунок сжимается к середине, и
   наведение показывает не тот день). Подпись точки — «сегодня», «вчера», «позавчера»,
   «N дн. назад» и дата. */
const agoText = (n) => (n === 0 ? 'сегодня' : n === 1 ? 'вчера' : n === 2 ? 'позавчера' : `${n} ${plural(n, 'день', 'дня', 'дней')} назад`);
function RateChart({ hist }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const [W, setW] = useState(300);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width) || 300));
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 64; const pad = 8;
  const lo = Math.min(0.9, ...hist.map((h) => h.rate)); const hi = Math.max(1.1, ...hist.map((h) => h.rate));
  const x = (i) => pad + (i / (hist.length - 1)) * (W - pad * 2);
  const y = (r) => pad + (1 - (r - lo) / (hi - lo)) * (H - pad * 2);
  const pts = hist.map((h, i) => `${x(i).toFixed(1)},${y(h.rate).toFixed(1)}`).join(' ');
  // ближайшая к пальцу точка — в тех же координатах, в которых нарисована
  const pick = (e) => { const b = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - b.left) / b.width) * W; const k = Math.round(((px - pad) / (W - pad * 2)) * (hist.length - 1)); setHover(Math.max(0, Math.min(hist.length - 1, k))); };
  const h = hover != null ? hist[hover] : null;
  const last = hist.length - 1;
  /* подсказка не выходит за края графика: шире экрана документ — и телефон перемасштабирует
     страницу, нижняя панель «уезжает» вниз (было у правого края, где подпись длиннее) */
  const tip = useRef(null);
  const [tipW, setTipW] = useState(150);
  React.useLayoutEffect(() => { if (tip.current) setTipW(tip.current.offsetWidth); }, [hover]);
  const tipLeft = h ? Math.max(0, Math.min(W - tipW, x(hover) - tipW / 2)) : 0;
  return (
    <div className="rw-rate-box" style={{ position: 'relative' }} ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="rw-rate" role="img" data-testid="rate-chart"
        aria-label={`Курс за ${hist.length} дней: от ${fmtRate(Math.min(...hist.map((q) => q.rate)))} до ${fmtRate(Math.max(...hist.map((q) => q.rate)))} монеты за крону, сегодня ${fmtRate(hist[last].rate)}`}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        <line x1={pad} x2={W - pad} y1={y(1)} y2={y(1)} stroke="var(--ds-rule2)" strokeWidth="1" strokeDasharray="3 4" />
        <polyline points={pts} fill="none" stroke="var(--u-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hist.map((q, i) => <circle key={q.day} cx={x(i)} cy={y(q.rate)} r={i === last ? 4 : 1.8} fill="var(--u-ink)" stroke={i === last ? 'var(--ds-card)' : 'none'} strokeWidth="2" />)}
        {h && <><line x1={x(hover)} x2={x(hover)} y1={pad / 2} y2={H - pad / 2} stroke="var(--ds-ink3)" strokeWidth="1" /><circle cx={x(hover)} cy={y(h.rate)} r="4.5" fill="var(--u-ink)" stroke="var(--ds-card)" strokeWidth="2" /></>}
      </svg>
      {h && (
        <div ref={tip} className="ds-num" data-testid="rate-tip" style={{ position: 'absolute', top: -8, left: tipLeft, maxWidth: W, overflow: 'hidden', background: 'var(--ds-ink)', color: 'var(--ds-paper)', fontSize: 12, padding: '3px 6px', borderRadius: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {agoText(last - hover)} · {h.day.slice(8)}.{h.day.slice(5, 7)} · {fmtRate(h.rate)}
        </div>
      )}
      <div className="ds-faint" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>две недели назад</span><span>пунктир — 1,00</span><span>сегодня</span></div>
    </div>
  );
}

/* ------------------------------ ЛАВКА ------------------------------ */
// до полуночи по всемирному времени — когда обновится витрина
const untilMidnight = (now) => { const m = dayStart(now) + 24 * 3600000 - now; const hh = Math.floor(m / 3600000); const mm = Math.floor((m % 3600000) / 60000); return `${hh} ч ${mm} мин`; };
// карточка вещи: Инфля в ней, цена по курсу (со скидкой — старая зачёркнута), купить / надеть
function ShopItem({ o, learn, day, wear, b, onBuy, onToggle, deal = false, goal = false, hw = null, calm = false }) {
  const desk = o.slot === 'desk'; const theme = o.slot === 'theme';
  const owned = !!(learn.owned || {})[o.id]; const on = (desk ? deskOf(learn) : theme ? themeOf(learn) : wear[o.slot]) === o.id;
  const price = priceOf(o.id, day, learn); const full = priceOf(o.id, day);
  return (
    <div className="rw-item" data-testid="shop-item" data-item={o.id} data-owned={String(owned)} data-on={String(on)} data-deal={deal ? 'true' : undefined} data-rare={o.rare && !o.season ? 'true' : undefined} data-season={o.season || undefined}>
      {deal && !owned && !calm && <span className="rw-deal" data-testid="shop-deal">−{Math.round(DEAL_OFF * 100)}%</span>}
      {o.season ? <span className="rw-rare rw-season"><Ghost size={11} aria-hidden="true" />хеллоуин</span> : theme ? <span className="rw-rare rw-theme-tag"><Palette size={11} aria-hidden="true" />тема урока</span> : desk ? <span className="rw-rare rw-desk-tag"><Gem size={11} aria-hidden="true" />в урок</span> : o.rare && <span className="rw-rare"><Gem size={11} aria-hidden="true" />редкое</span>}
      {/* украшение урока — живое прямо на витрине: его можно потрогать до покупки */}
      {theme ? <SkinPreview id={o.id} /> : desk ? <div className="rw-desk-stage"><DeskDecor id={o.id} height={64} preview label={`${o.title}: потрогайте`} /></div>
        : <Mascot mood="hello" size={o.rare ? 62 : 50} outfit={{ [o.slot]: o.id }} label={`Инфля: ${o.title}`} />}
      <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>{o.title}</div>
      {o.note && <div className="rw-note">{o.note}</div>}
      {owned
        ? <Button small variant={on ? 'secondary' : 'primary'} onClick={() => onToggle(o)} data-testid={desk ? 'desk-toggle' : theme ? 'theme-toggle' : undefined}>{on ? (desk ? 'Убрать из уроков' : theme ? 'Выключить' : 'Снять') : (desk ? 'Повесить в уроки' : theme ? 'Включить в уроках' : 'Надеть')}</Button>
        : o.reward ? <>
          {/* награда события: не продаётся — собирается тыквами за уроки */}
          <div className="rw-forgone" data-testid="shop-reward">Не продаётся: {hw ? `тыкв ${hw.pumpkins} из ${hw.goal}` : 'награда за 13 тыкв'}</div>
          {hw && <div className="rw-goal" role="progressbar" aria-label="Собрано тыкв" aria-valuemin={0} aria-valuemax={hw.goal} aria-valuenow={hw.pumpkins}><i style={{ width: `${(hw.pumpkins / hw.goal) * 100}%` }} /></div>}
          <div className="ds-sub" style={{ fontSize: 12.5 }}>{hw && hw.ready ? 'Заберите её на Пути' : 'Каждый урок — тыква'}</div>
        </> : <>
          <div className="rw-price">{price < full && !calm && <s>{full}</s>}{price} <span style={{ fontWeight: 400 }}>мон.</span><small>{crownsOn(o.id, day)} кр.</small></div>
          {/* цена отказа: чего стоит вещь, кроме монет */}
          <div className="rw-forgone" data-testid="shop-forgone" title={`Цена отказа: ${forgone(price).text} или +${forgone(price).week} в копилке за неделю`}>{forgone(price).text} · копилка дала бы +{forgone(price).week}</div>
          {goal && b < price && <div className="rw-goal" role="progressbar" aria-label="Накоплено на покупку" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor((b / price) * 100)}><i style={{ width: `${Math.min(100, (b / price) * 100)}%` }} /></div>}
          <Button small variant="secondary" disabled={b < price} onClick={() => onBuy(o.id)}>Купить</Button>
        </>}
    </div>
  );
}
/* «Страховка серии» — полис: взнос каждую неделю, второй пропуск в оплаченной неделе прощается.
   Видно, сколько уже заплачено и сколько дней полис спас: окупается ли страховка. */
const fmtDay = (d) => `${d.slice(8)}.${d.slice(5, 7)}`;
function PolicyCard({ learn, update, now, b, onMsg }) {
  const p = policyInfo(learn, now);
  const old = ownedFreezes(learn);
  const take = () => {
    const r = takePolicy(learn, now);
    if (!r.ok) { Audio.play('down'); onMsg({ ok: false, text: r.reason }); return; }
    Audio.play('register'); update(() => r.s, { settle: true });
    onMsg({ ok: true, text: r.price ? `Полис оформлен: первый взнос — ${r.price} ${coinsWord(r.price)}, дальше по ${PREMIUM} в неделю.` : 'Полис снова действует: эта неделя уже оплачена.' });
  };
  const cancel = () => { Audio.play('paper'); update((s) => cancelPolicy(s, now)); onMsg({ ok: true, text: `Полис расторгнут. Оплаченная неделя покрыта${p.paidUntil ? ` до ${fmtDay(p.paidUntil)}` : ''}.` }); };
  return (
    <Card style={{ margin: '8px 0 10px' }} data-testid="shop-freeze" data-policy={p.active ? 'on' : 'off'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Rosette size={54} opacity={0.5}><ShieldCheck size={24} color="#3E6FA8" aria-hidden="true" /></Rosette>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{FREEZE.title}{p.active && <span className="ds-badge" style={{ marginLeft: 6 }} data-testid="policy-on">полис действует</span>}</div>
          <div className="ds-sub" style={{ fontSize: 13, lineHeight: 1.35 }}>
            Взнос — <b>{PREMIUM} {coinsWord(PREMIUM)} в неделю</b>, сам в начале недели. В оплаченной неделе прощается ещё один пропуск сверх бесплатной поблажки — это страховой случай. Расторгнуть можно в любой момент.
          </div>
        </div>
      </div>
      <div className="ds-sub" style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.4 }} data-testid="policy-stats">
        {p.active && p.paidUntil ? `Оплачено до ${fmtDay(p.paidUntil)}. ` : ''}Всего взносов: {p.paidTotal} {coinsWord(p.paidTotal)} · полис спас дней: {p.saved}{old ? ` · старых разовых полисов: ${old}` : ''}
      </div>
      {p.lapsed && <div role="status" data-testid="policy-lapsed" style={{ fontSize: 13.5, color: 'var(--ds-bad-ink)', marginTop: 6 }}>Полис прекращён: на взнос не хватило монет. Неоплаченная неделя не покрыта.</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        {p.active
          ? <Button small variant="secondary" onClick={cancel} data-testid="policy-cancel">Расторгнуть</Button>
          : <Button small disabled={b < PREMIUM} onClick={take} data-testid="policy-take">Оформить полис · {PREMIUM} мон.</Button>}
      </div>
    </Card>
  );
}
/* ГАРДЕРОБ — примерочная: Инфля в зеркале во всём надетом, вкладки по местам (голова, лицо,
   шея, в руке, рамка) и плитки купленных вещей. Касание плитки надевает вещь или снимает её,
   «Без вещи» — снять с этого места, «Снять всё» — всё сразу. Открыто место последней покупки. */
function Wardrobe({ learn, wear, onWear }) {
  const owned = learn.owned || {};
  const list = WARDROBE.filter((o) => owned[o.id]);
  const slots = Object.keys(SLOT_LABEL);
  const latest = list.slice().sort((a, b) => (owned[b.id] || 0) - (owned[a.id] || 0))[0];
  const [slot, setSlot] = useState(latest ? latest.slot : slots[0]);
  // новая покупка — сразу её место: купленную вещь видно и можно примерить
  const latestId = latest ? latest.id : null;
  useEffect(() => { if (latest) setSlot(latest.slot); }, [latestId]); // eslint-disable-line react-hooks/exhaustive-deps
  const here = list.filter((o) => o.slot === slot);
  const worn = slots.filter((k) => wear[k]).map((k) => OUTFIT_BY_ID[wear[k]]).filter(Boolean);
  return (
    <Card style={{ margin: '10px 0 16px' }} data-testid="shop-wardrobe">
      <div className="rw-ward">
        <div className="rw-mirror">
          <div className="rw-mirror-glass"><Mascot mood="joy" size={110} outfit={wear} label={worn.length ? `Инфля в зеркале: ${worn.map((o) => o.title).join(', ')}` : 'Инфля в зеркале, без нарядов'} /></div>
          <div className="rw-worn" data-testid="wardrobe-worn">{worn.length ? worn.map((o) => <span key={o.id}>{o.title}</span>) : <span>ничего не надето</span>}</div>
          {worn.length > 0 && <Button small variant="ghost" data-testid="wardrobe-clear" onClick={() => slots.forEach((k) => wear[k] && onWear(k, null))}>Снять всё</Button>}
        </div>
        <div style={{ minWidth: 0 }}>
          {list.length ? (
            <>
              <div className="rw-slots" role="tablist" aria-label="Место вещи">
                {slots.map((k) => {
                  const n = list.filter((o) => o.slot === k).length;
                  return <button key={k} type="button" role="tab" aria-selected={slot === k} disabled={!n} data-slot={k} onClick={() => { Audio.play('tick'); setSlot(k); }}>{SLOT_LABEL[k]} <b>{n}</b></button>;
                })}
              </div>
              <div className="rw-tiles" role="group" aria-label={`Вещи: ${SLOT_LABEL[slot].toLowerCase()}`}>
                <button type="button" className="rw-tile none" aria-pressed={!wear[slot]} data-testid="wardrobe-none" onClick={() => onWear(slot, null)}>Без вещи</button>
                {here.map((o) => {
                  const on = wear[o.slot] === o.id;
                  return (
                    <button key={o.id} type="button" className="rw-tile" aria-pressed={on} data-item={o.id} data-on={String(on)} onClick={() => onWear(o.slot, on ? null : o.id)}>
                      {on && <span className="rw-on" aria-hidden="true"><Check size={13} /></span>}
                      <Mascot mood="hello" size={50} outfit={{ [o.slot]: o.id }} label={`Инфля: ${o.title}`} />
                      <span>{o.title}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <div className="ds-sub" style={{ fontSize: 14.5 }}>Пока пусто — купленные вещи будут здесь, и их можно будет примерить.</div>}
          <div className="ds-sub" style={{ fontSize: 13, marginTop: 10 }} data-testid="wardrobe-count">В гардеробе вещей: {list.length} из {WARDROBE.length}.</div>
        </div>
      </div>
    </Card>
  );
}

/* «Пыльная витрина» — карточка мини-игры на «Витрине» (src/learn-dust.jsx): окошко в пыли с протёртой
   полосой, сколько витрин оплачено сегодня и кнопка «Протереть» */
const DUST_CSS = `
  .sh-dust { display: flex; align-items: center; gap: 14px; margin: 4px 0 18px; padding: 14px; border-radius: 20px; color: #F6EEE2; position: relative; overflow: hidden;
    background: radial-gradient(120% 120% at 0% 0%, #4A3628, #21180F 70%); box-shadow: 0 16px 30px -22px rgba(0,0,0,.8); }
  .sh-dust-win { position: relative; flex: none; width: 74px; height: 92px; border-radius: 12px; padding: 5px; background: linear-gradient(145deg, #E2C084, #8A6532 40%, #D9B97D 60%, #6E4B22); }
  .sh-dust-win > div { position: relative; width: 100%; height: 100%; border-radius: 8px; overflow: hidden; display: grid; place-items: end center; padding-bottom: 6px;
    background: radial-gradient(80% 60% at 50% 30%, #FFF8E8, #C6A472); }
  .sh-dust-win > div::after { content: ''; position: absolute; inset: 0; background:
      radial-gradient(circle at 20% 30%, rgba(120,108,90,.35) 0 2px, transparent 3px) 0 0 / 9px 11px,
      linear-gradient(rgba(176,164,144,.88), rgba(150,138,118,.92));
    -webkit-mask: linear-gradient(118deg, #000 30%, transparent 36%, transparent 52%, #000 60%); mask: linear-gradient(118deg, #000 30%, transparent 36%, transparent 52%, #000 60%);
    animation: sh-dust-wipe 3.6s ease-in-out infinite; }
  @keyframes sh-dust-wipe { 0%, 100% { -webkit-mask-position: 0 0; mask-position: 0 0; } 50% { -webkit-mask-position: 12px 0; mask-position: 12px 0; } }
  .sh-dust-t { flex: 1; min-width: 0; }
  .sh-dust-t b { display: block; font: 700 17px var(--ds-head); }
  .sh-dust-t span { display: block; margin-top: 3px; font: 500 13.5px/1.4 var(--ds-sans); color: rgba(246,238,226,.78); }
  .sh-dust-dots { display: flex; gap: 5px; margin-top: 8px; }
  .sh-dust-dots i { width: 22px; height: 6px; border-radius: 3px; background: rgba(246,238,226,.18); }
  .sh-dust-dots i.on { background: #F3D98E; }
  .sh-dust .ds-btn { flex: none; }
  @media (max-width: 420px) { .sh-dust { flex-wrap: wrap; } .sh-dust .ds-btn { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .sh-dust-win > div::after { animation: none; } }
`;
function DustCard({ learn, onOpen }) {
  const done = dustDone(learn);
  const item = dustItem(learn, dayOf(Date.now()), done);
  return (
    <div className="sh-dust" data-testid="shop-dust" data-done={done}>
      <style>{DUST_CSS}</style>
      <div className="sh-dust-win" aria-hidden="true"><div><Mascot mood="hello" size={44} outfit={item ? { [OUTFIT_BY_ID[item].slot]: item } : outfitOf(learn)} /></div></div>
      <div className="sh-dust-t">
        <b>Пыльная витрина</b>
        <span>{done < DUST.perDay ? `Протрите стекло — под пылью новинка дня. За витрину — ${DUST.coins} ${coinsWord(DUST.coins)}.` : 'Монеты за сегодня собраны. Протирать можно и просто так.'}</span>
        <div className="sh-dust-dots" aria-label={`Сегодня протёрто ${Math.min(done, DUST.perDay)} из ${DUST.perDay}`} role="img">
          {Array.from({ length: DUST.perDay }, (_, k) => <i key={k} className={k < done ? 'on' : ''} />)}
        </div>
      </div>
      <Button small variant="warm" onClick={() => { Audio.play('paper'); onOpen(); }} data-testid="dust-open">Протереть</Button>
    </div>
  );
}
/* ЛАВКА — вкладки вместо одной длинной ленты (docs/mechanics.md, «Лавка»): сверху кошелёк и курс
   дня (касание — график и что такое кроны), ниже шесть вкладок: «Витрина» (вещи дня, на Хеллоуин —
   и сезонные), «Для урока» (темы и украшения урока), «Ювелир» (редкое, на что копят), «Гардероб»
   (примерочная), «Полезное» (копилка, страховка серии, двойной опыт) и «Протереть» (мини-игра
   «Пыльная витрина»). Вкладка помнится, пока открыто приложение; из уведомления «вклад созрел»
   лавка открывается на «Полезном». */
const SHOP_TABS = [
  { id: 'showcase', label: 'Витрина', icon: Store },
  { id: 'lesson', label: 'Для урока', icon: Palette },
  { id: 'rare', label: 'Ювелир', icon: Gem },
  { id: 'wardrobe', label: 'Гардероб', icon: Shirt },
  { id: 'useful', label: 'Полезное', icon: PiggyBank },
  { id: 'dust', label: 'Протереть', icon: Sparkles },
];
let lastShopTab = 'showcase';
// «за ноябрь»; проценты — до десятых, с запятой
// «1 декабря», «инфляция ноября»
const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_IN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const pct = (x) => `${(Math.round(x * 1000) / 10).toFixed(1).replace('.', ',')}%`;
export function ShopView({ learn, update, now = Date.now(), focus = null }) {
  // аналитика: раздел открыт — не чаще раза в день с устройства (docs/mechanics.md, «Аналитика»)
  useEffect(() => { trackDaily('shop_open'); }, []);
  const day = dayOf(now);
  const rate = rateOn(day); const prev = rateOn(addDays(day, -1));
  const [msg, setMsg] = useState(null);
  // «Лавка · Сад»: сад — в той же вкладке, переключателем вверху
  const [view, setView] = useState(focus === 'garden' ? 'garden' : 'shop');
  const [tab, setTabState] = useState(focus === 'piggy' ? 'useful' : lastShopTab);
  const [rateOpen, setRateOpen] = useState(false);
  const [dust, setDust] = useState(false);
  const setTab = (t) => { lastShopTab = t; setTabState(t); setMsg(null); };
  // из уведомления «вклад созрел» — сразу к копилке
  useEffect(() => {
    if (focus !== 'piggy') return undefined;
    lastShopTab = 'useful';
    const t = setTimeout(() => { const el = document.querySelector('[data-testid="shop-piggy"]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
    return () => clearTimeout(t);
  }, [focus]);
  const b = balance(learn);
  const wear = outfitOf(learn);
  const today = shopDay(learn, day);
  const boosted = boostActive(learn, now);
  const pig = piggyState(learn, now);
  const Trend = rate > prev ? TrendingUp : rate < prev ? TrendingDown : Minus;
  const infl = inflationInfo(day);
  const rinfo = rewardInfo(day);
  const doBuy = (id) => {
    const r = buy(learn, id, now);
    if (!r.ok) { Audio.play('down'); setMsg({ ok: false, text: r.reason }); return; }
    Audio.play('register');
    update(() => r.s, { settle: true });
    const slot = id === BOOST.id ? null : OUTFIT_BY_ID[id].slot;
    setMsg({ ok: true, text: id === BOOST.id ? `Двойной опыт на ${BOOST.minutes} минут — за ${r.price} ${coinsWord(r.price)}.`
      : slot === 'desk' ? `Куплено за ${r.price} ${coinsWord(r.price)} — украшение уже висит в уроках на ПК и планшете.`
        : slot === 'theme' ? `Куплено за ${r.price} ${coinsWord(r.price)} — тема уже включена: откройте любой урок.`
          : `Куплено за ${r.price} ${coinsWord(r.price)} — Инфля уже в обновке. Снять и переодеть — во вкладке «Гардероб».` });
  };
  const toggle = (o) => { Audio.play('paper'); update((s) => setWear(s, o.slot, (s.wear || {})[o.slot] === o.id ? null : o.id, now)); };
  const putOn = (slot, id) => { Audio.play('paper'); update((s) => setWear(s, slot, id, now)); };
  /* младше 16 (или возраст не известен) — без давления дефицитом: ни «−30%», ни зачёркнутой цены, ни отсчётов
     (docs/mechanics.md, «Хеллоуин»); скидка дня остаётся — просто без плашки */
  const calm = noScarcity((loadAccount() || {}).birthYear, now);
  const itemProps = { learn, day, wear, b, onBuy: doBuy, onToggle: toggle, calm };
  const dealOpen = today.deal && !(learn.owned || {})[today.deal];
  const hw = today.season.length > 0 ? halloween(learn, now) : null;
  return (
    <div className="ln-wrap" data-testid="shop" data-view={view} data-tab={view === 'shop' ? tab : undefined}>
      <h1 className="ds-sr">{view === 'garden' ? 'Сад Инфли' : 'Лавка'}</h1>
      <div>
        <ShopSwitch view={view} onView={(v) => { Audio.play('paper'); setView(v); setMsg(null); }} learn={learn} gardenLocked={!featureOpen(learn, 'garden')} />
        {/* сад и копилка открываются не сразу (src/learn/unlocks.js): до того — карточка «откроется после N-го урока» */}
        {view === 'garden' ? (featureOpen(learn, 'garden')
          ? <React.Suspense fallback={<div className="ds-sub" style={{ padding: 20 }}>Сад загружается…</div>}><GardenView learn={learn} update={update} /></React.Suspense>
          : <FeatureLocked id="garden" learn={learn} />) : <>
        <Card className="sh-head-card" data-testid="rate">
          <div className="sh-head">
            <Mascot mood="joy" size={52} outfit={wear} />
            <div style={{ minWidth: 0 }}>
              <div className="ds-eyebrow">В кошельке</div>
              <div className="ds-num sh-bal" data-testid="shop-balance">{b} <span>{coinsWord(b)}</span></div>
            </div>
          </div>
          <button type="button" className="sh-rate" aria-expanded={rateOpen} data-testid="rate-toggle" onClick={() => { Audio.play('paper'); setRateOpen((v) => !v); }}>
            <span className="sh-rate-main">
              <span className="sh-rate-k">Курс дня</span>
              <b className="ds-num" data-testid="rate-value">1 крона = {fmtRate(rate)} монеты</b>
            </span>
            <span className="ds-num sh-rate-prev"><Trend size={14} aria-hidden="true" />вчера {fmtRate(prev)}</span>
            <ChevronDown size={18} className="sh-chev" aria-hidden="true" />
          </button>
          {/* инфляция в Лавке: цены в кронах растут каждый месяц (docs/mechanics.md, «Лавка») */}
          <div className="sh-infl" data-testid="shop-inflation" data-rate={infl.rate} data-capped={infl.capped ? 'true' : undefined}>
            <TrendingUp size={15} aria-hidden="true" />
            {infl.capped ? <span>Инфляция в Лавке: цены держатся — дороже не будет, пока не выйдет новый юнит</span>
              : infl.since === 0 ? <span>Инфляция в Лавке — с ноября 2026: цены будут расти на 1–2% в месяц</span>
              : <span>Инфляция в Лавке: за {MONTH_IN[Number(infl.month.slice(5)) - 1]} <b className="ds-num">+{pct(infl.rate)}</b>, с октября 2026 <b className="ds-num">+{pct(infl.since)}</b></span>}
          </div>
          {/* индексация наград: каждый месяц — на инфляцию прошлого (docs/mechanics.md, «Индексация наград») */}
          <div className="sh-infl" data-testid="reward-index" data-since={rinfo.since}>
            <Coins size={15} aria-hidden="true" />
            {rinfo.since > 0
              ? <span>Награды за учёбу: <b className="ds-num">+{pct(rinfo.since)}</b> к начальным — растут каждый месяц на инфляцию прошлого{rinfo.next > 0 ? <>, 1 {MONTH_GEN[Number(rinfo.nextMonth.slice(5)) - 1]} — ещё <b className="ds-num">+{pct(rinfo.next)}</b></> : ''}</span>
              : rinfo.next > 0 ? <span>Награды за учёбу растут вслед за ценами: первая индексация — 1 {MONTH_GEN[Number(rinfo.nextMonth.slice(5)) - 1]}, <b className="ds-num">+{pct(rinfo.next)}</b> (инфляция {MONTH_GEN[Number(infl.month.slice(5)) - 1]})</span>
                : <span>Награды за учёбу растут вслед за ценами Лавки — каждый месяц на инфляцию прошлого</span>}
          </div>
          {rateOpen && (
            <div className="sh-more" data-testid="rate-more">
              {/* новичок не знает, что такое кроны и «кр.»: две строки — что своё, что чужое, и как одно меняется на другое */}
              <div className="rw-money" data-testid="coins-crowns">
                <div><span className="rw-money-ico coin"><Coins size={17} aria-hidden="true" /></span>
                  <span><b>Монеты</b> — ваши: за уроки, серию, задания и печати.</span></div>
                <div><span className="rw-money-ico crown"><Crown size={17} aria-hidden="true" /></span>
                  <span><b>Кроны (кр.)</b> — деньги страны Инфляции, где живут герои уроков. В них назначены цены — как в настоящем магазине.</span></div>
              </div>
              <RateChart hist={rateHistory(day, 14)} />
              <div className="rw-money-rate">Платите монетами по курсу дня. Курс ниже — покупка дешевле: можно подождать удачного дня.</div>
              <div className="rw-money-rate" data-testid="shop-inflation-more"><b>Инфляция.</b> Цены Лавки в кронах растут каждый месяц на 1–2%: те же вещи стоят всё больше крон. Монеты в кошельке от этого дешевеют, а в копилке растут быстрее цен — её ставка 1–3% в день. Отложенная покупка дорожает; сбережения под процент — нет. Награды за учёбу догоняют цены с опозданием на месяц: в декабре они больше на инфляцию ноября — как индексация зарплат и пенсий.</div>
            </div>
          )}
        </Card>

        <div className="sh-tabs" role="tablist" aria-label="Отделы лавки" data-testid="shop-tabs">
          {SHOP_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" className="sh-tab" aria-selected={tab === t.id} data-testid="shop-tab" data-tab={t.id}
                onClick={() => { if (tab !== t.id) { Audio.play('paper'); setTab(t.id); } }}>
                <Icon size={19} aria-hidden="true" /><span>{t.label}</span>
                {t.id === 'showcase' && dealOpen && !calm && <span className="sh-badge" aria-label="скидка дня">−{Math.round(DEAL_OFF * 100)}%</span>}
                {t.id === 'showcase' && (!dealOpen || calm) && hw && <span className="sh-badge hw" aria-label="хеллоуин"><Ghost size={10} aria-hidden="true" /></span>}
                {t.id === 'useful' && pig && pig.ripe && <span className="sh-dot" aria-label="вклад созрел" />}
              </button>
            );
          })}
        </div>
        {msg && <div role="status" data-testid="shop-msg" className="sh-msg" data-ok={String(msg.ok)}>{msg.text}</div>}

        <div className="sh-panel" role="tabpanel" key={tab} data-testid="shop-panel" data-tab={tab}>
          {tab === 'showcase' && <>
            {hw && (
              <div className="rw-hw" data-testid="shop-halloween">
                <Heading level={3} title="Хеллоуинская витрина" sub={calm ? 'Хеллоуинские вещи для Инфли. Купленное остаётся навсегда.' : `Только на Хеллоуин — ${seasonLeftText(hw)}, потом через год. Купленное остаётся навсегда.`} />
                <div className="rw-items" style={{ margin: '10px 0 16px' }}>
                  {[...today.season, WEB_FRAME].map((id) => <ShopItem key={id} o={OUTFIT_BY_ID[id]} goal={OUTFIT_BY_ID[id].rare} hw={hw} {...itemProps} />)}
                </div>
              </div>
            )}
            <Heading level={3} title="Витрина дня" sub={calm ? 'Каждый день — новые вещи.' : `Обновится через ${untilMidnight(now)} — в ${rolloverLocal(now)} по вашему времени (полночь по Гринвичу). На одну вещь — скидка дня ${Math.round(DEAL_OFF * 100)}%.`} />
            <div className="rw-items" style={{ margin: '10px 0 16px' }} data-testid="shop-showcase">
              {today.showcase.map((id) => <ShopItem key={id} o={OUTFIT_BY_ID[id]} deal={id === today.deal} {...itemProps} />)}
              {!today.showcase.length && <div className="ds-sub" style={{ gridColumn: '1 / -1', fontSize: 14.5 }}>Всё обычное уже ваше — дальше вкладки «Ювелир» и «Для урока».</div>}
            </div>
          </>}

          {tab === 'dust' && <>
            <Heading level={3} title="Пыльная витрина" sub={`Мини-игра: ночью в лавке пыль — протрите стекло тряпкой, под ним новинка витрины дня. За витрину — ${DUST.coins} ${coinsWord(DUST.coins)}, до ${DUST.perDay} витрин в день.`} />
            <div style={{ marginTop: 10 }}><DustCard learn={learn} onOpen={() => setDust(true)} /></div>
          </>}

          {tab === 'lesson' && <>
            <style>{SKIN_CSS}</style>
            <p className="sh-intro">Не для Инфли, а для самих уроков. Тема меняет урок целиком, украшение висит над заданием. Включить и выключить — здесь же, в любой момент.</p>
            <Heading level={3} title="Темы урока" sub="Живой фон, свои кнопки вариантов и отклик на каждый ответ. Включена может быть одна тема." />
            <div className="rw-items rw-desk-items" style={{ margin: '10px 0 18px' }} data-testid="shop-themes">
              {today.theme.map((id) => <ShopItem key={id} o={OUTFIT_BY_ID[id]} goal {...itemProps} />)}
            </div>
            <Heading level={3} title="Украшения урока" sub="Висят над заданием: живые — их можно потрогать, и они отзываются на ваши ответы. На телефоне в уроке их нет — только на ПК и планшете." />
            <div className="rw-items rw-desk-items" style={{ margin: '10px 0 16px' }} data-testid="shop-desk">
              {today.desk.map((id) => <ShopItem key={id} o={OUTFIT_BY_ID[id]} goal {...itemProps} />)}
            </div>
          </>}

          {tab === 'rare' && <>
            <Heading level={3} title="Витрина ювелира" sub="Редкие вещи для Инфли — всегда здесь. На них копят: полоска показывает, сколько уже собрано." />
            <div className="rw-items" style={{ margin: '10px 0 16px' }} data-testid="shop-rare">
              {today.rare.map((id) => <ShopItem key={id} o={OUTFIT_BY_ID[id]} goal {...itemProps} />)}
            </div>
          </>}

          {tab === 'wardrobe' && <>
            <p className="sh-intro">Примерочная: по одной вещи на голову, лицо, шею, в руку и рамку. Касание — надеть или снять.</p>
            <Wardrobe learn={learn} wear={wear} onWear={putOn} />
          </>}

          {tab === 'useful' && <>
            <p className="sh-intro">Не вещи, а сделки: вклад под процент, страховка серии и двойной опыт.</p>
            {featureOpen(learn, 'piggy') ? <PiggyCard learn={learn} update={update} now={now} b={b} onMsg={setMsg} /> : <FeatureLocked id="piggy" learn={learn} compact />}
            <PolicyCard learn={learn} update={update} now={now} b={b} onMsg={setMsg} />
            <Card style={{ margin: '0 0 16px' }} data-testid="shop-boost">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Rosette size={54} opacity={0.5}><Zap size={24} color="var(--ds-gold)" aria-hidden="true" /></Rosette>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{BOOST.title}{boosted && <span className="ds-badge" style={{ marginLeft: 6 }} data-testid="boost-on">действует до {new Date(learn.boost).toTimeString().slice(0, 5)}</span>}</div>
                  <div className="ds-sub" style={{ fontSize: 13, lineHeight: 1.35 }}>{BOOST.text}</div>
                  <div className="rw-price">{priceOf(BOOST.id, day)} <span style={{ fontWeight: 400 }}>мон.</span><small>{crownsOn(BOOST.id, day)} кр.</small></div>
                </div>
                <Button small disabled={boosted} onClick={() => doBuy(BOOST.id)} data-testid="buy-boost">Купить</Button>
              </div>
            </Card>
          </>}
        </div>
        </>}
      </div>
      {dust && (
        <React.Suspense fallback={null}>
          <DustGame learn={learn} update={update} onClose={() => setDust(false)} onShowcase={() => { setDust(false); setView('shop'); setTab('showcase'); }} />
        </React.Suspense>
      )}
    </div>
  );
}

/* ------------------------------ КОПИЛКА ИНФЛИ ------------------------------
   Сберкнижка: положить монеты на неделю под ставку недели; рост по дням — столбики, каждый чуть
   выше прошлого не на одно и то же число, а на процент от уже накопленного. Забрать раньше —
   процент сгорит. Ставка и что она значит для сада — плашка «Ставка недели» сверху. */
const fmtPct = (r) => `${String(Math.round(r * 1000) / 10).replace('.', ',')}%`;
/* Рост вклада за неделю — на ОБЩЕЙ шкале для обоих видов вклада: выбранный вклад — яркая линия
   с заливкой, другой вид — пунктир рядом. Открытый вклад — его настоящий путь по дням (path):
   пополнение — ступенька вверх с подписью «+N», точка «сейчас» и плашка «сейчас» над графиком.
   Подписи снизу — только «начало»/«сегодня» и «через 7 дней»: «сейчас» наверху их не задевает. Итог —
   над концом линии, внутри графика (а не справа от него: длинное число съедало поле, и справа был
   большой пустой отступ); итог другого вида — под концом пунктира. */
function PiggyChart({ amount, rate, other = null, day = null, path = null, steps = [] }) {
  const W = 300; const H = 134; const L = 10; const R = 10; const T = 28; const B = 24; const N = PIGGY.days;
  const curve = (r) => Array.from({ length: N + 1 }, (_, d) => amount * (1 + r) ** d);
  const vals = path || curve(rate);
  const otherVals = other != null ? curve(other) : null;
  const end = vals[N]; const otherEnd = otherVals ? otherVals[N] : null;
  const base = Math.min(vals[0], otherVals ? otherVals[0] : vals[0]);
  const top = Math.max(end, otherEnd || 0);
  const x = (d) => L + (d / N) * (W - L - R);
  const y = (v) => H - B - ((v - base) / Math.max(1e-9, top - base)) * (H - T - B);
  const line = (list) => list.map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${x(0)},${H - B} ${line(vals)} ${x(N)},${H - B}`;
  const endY = y(end); const otherY = otherEnd != null ? y(otherEnd) : null;
  // итог — над концом линии; итог другого вида — под концом пунктира (но не ниже оси)
  const endLabelY = endY - 10;
  const otherLabelY = otherY != null ? Math.min(otherY + 16, H - B - 4) : null;
  const live = day != null && day < N;
  // плашка «сейчас» у правого края не наезжает на итог над концом линии: сдвигается левее него
  const endW = String(Math.floor(end + 1e-9)).length * 7.5 + 4;
  const nowMax = endLabelY < T + 4 ? x(N) - 4 - endW - 28 : W - R - 26;
  const nowX = live ? Math.min(nowMax, Math.max(L + 26, x(day))) : 0;
  return (
    <svg className="rw-piggy-chart rw-grow" viewBox={`0 0 ${W} ${H}`} role="img" data-testid="piggy-chart"
      aria-label={`${amount} под ${fmtPct(rate)} в день: через неделю ${Math.floor(end + 1e-9)}${otherEnd != null ? `; другой вид вклада — ${Math.floor(otherEnd + 1e-9)}` : ''}`}>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="axis" />
      {vals.map((_, d) => <line key={d} x1={x(d)} x2={x(d)} y1={H - B} y2={H - B + 4} className="axis" />)}
      {otherVals && <polyline points={line(otherVals)} className="other" />}
      <polygon points={area} className="area" />
      <polyline points={line(vals)} className="main" pathLength="1" />
      {vals.map((v, d) => <circle key={d} cx={x(d)} cy={y(v)} r={d === N ? 4.4 : 2.6} className={`dot${day != null && d <= day ? ' past' : ''}`} style={{ '--i': d }} />)}
      {steps.map((st) => <text key={st.day} x={x(st.day)} y={y(vals[st.day]) - 9} textAnchor="middle" className="step" data-testid="piggy-step">+{st.n}</text>)}
      {live && (
        <g className="now" data-testid="piggy-now">
          <line x1={x(day)} x2={x(day)} y1={T - 6} y2={H - B} />
          <rect x={nowX - 24} y={2} width={48} height={18} rx={9} />
          <text x={nowX} y={15} textAnchor="middle">сейчас</text>
          <circle cx={x(day)} cy={y(vals[day])} r="5.5" />
        </g>
      )}
      <text x={x(N) - 4} y={endLabelY} textAnchor="end" className="end num">{Math.floor(end + 1e-9)}</text>
      {otherEnd != null && <text x={x(N) - 4} y={otherLabelY} textAnchor="end" className="end other-t num">{Math.floor(otherEnd + 1e-9)}</text>}
      <text x={x(0)} y={H - 6} textAnchor="start">{path ? 'начало' : 'сегодня'}</text>
      <text x={x(N)} y={H - 6} textAnchor="end">через {N} дней</text>
    </svg>
  );
}
/* Честно про проценты: ставка в день — сотни процентов годовых простыми, а со сложным процентом — рост в сотни и
   тысячи раз за год, такого не бывает; а вот обычные для вклада 8% годовых — 1000 крон за 10 лет
   (docs/mechanics.md). Свёрнуто: «Это много или мало?» */
function RealRate({ rate }) {
  const pts = realCurve();
  const W = 300; const H = 70; const pad = 14; const top = pts[pts.length - 1].value;
  const x = (i) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v) => H - 14 - ((v - 900) / (top - 900)) * (H - 30);
  return (
    <details className="rw-real" data-testid="piggy-real">
      <summary>Это много или мало?</summary>
      <div className="ds-sub" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 6 }}>
        {fmtPct(rate)} в день — это {Math.round(rate * 365 * 100)}% годовых простыми, а со сложным процентом деньги за год выросли бы примерно в {yearGrowth(rate).toLocaleString('ru-RU')} раз. В жизни так не бывает, а вот как выглядят обычные для вклада {Math.round(REAL_RATE * 100)}% годовых:
      </div>
      <svg className="rw-piggy-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`1000 крон под ${Math.round(REAL_RATE * 100)}% годовых: через 10 лет ${top}`}>
        <polyline points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke="var(--u-ink)" strokeWidth="1.6" />
        {pts.map((p, i) => <circle key={p.year} cx={x(i)} cy={y(p.value)} r={i === 0 || i === pts.length - 1 ? 2.6 : 1.4} fill="var(--u-ink)" />)}
        <text x={x(0)} y={y(1000) - 7} textAnchor="start" className="num">1000</text>
        <text x={x(pts.length - 1)} y={y(top) - 7} textAnchor="end" className="num">{top}</text>
        <text x={x(0)} y={H - 2} textAnchor="start">сейчас</text>
        <text x={x(pts.length - 1)} y={H - 2} textAnchor="end">через 10 лет</text>
      </svg>
    </details>
  );
}
const PRESETS = [['¼', 0.25], ['½', 0.5], ['Всё', 1]];
/* Копилка-свинка: монета падает в прорезь, когда кладёте; пока вклад лежит — монета выглядывает из
   прорези и рядом искорки. Свинка розовая и улыбается (жалоба: прежняя, зелёная и с хвостом-клином,
   выглядела страшно), цвета свои — не цвет юнита. */
const PIG = { body: '#F8BACA', far: '#EE9CB0', ear: '#F4A7BA', snout: '#F49AB0', line: '#A84E68', ink: '#5A2434' };
// монеты, вылетающие при «Забрать»: фонтаном из прорези и рассыпаются у ног свинки; число — от суммы, 3…9
const outCoins = (payout, lost) => {
  const n = Math.max(3, Math.min(9, Math.round(payout / 15)));
  const gold = Array.from({ length: n }, (_, i) => ({ i, dx: (i % 2 ? 1 : -1) * (10 + ((i * 17) % 40)) + 8, up: -14 - ((i * 11) % 16), dy: 30 + ((i * 7) % 12) }));
  const grey = lost ? Array.from({ length: Math.min(3, Math.max(1, Math.round(lost / 10))) }, (_, i) => ({ i: n + i, dx: -22 + i * 16, lost: true })) : [];
  return [...gold, ...grey];
};
function PiggyArt({ full = false, drop = 0, out = null }) {
  const clip = `pig${React.useId().replace(/:/g, '')}`;
  const leg = (x, fill) => <rect x={x} y="44" width="7.5" height="15" rx="3.4" fill={fill} stroke={PIG.line} strokeWidth="2" />;
  const ear = (d) => <path d={d} fill={PIG.ear} stroke={PIG.line} strokeWidth="2" strokeLinejoin="round" />;
  return (
    <span className={`rw-pig-box${out ? ' taking' : ''}`} data-testid="piggy-art" data-taking={out ? 'true' : undefined}>
    {out && (
      <React.Fragment key={out.k}>
        {outCoins(out.payout, out.lost).map((c) => (
          <i key={c.i} className={`rw-pig-out${c.lost ? ' lost' : ''}`} style={{ '--i': c.i, '--dx': `${c.dx}px`, '--up': `${c.up || 0}px`, '--dy': `${c.dy || 0}px` }} aria-hidden="true" />
        ))}
        <span className="rw-pig-plus" data-testid="piggy-plus" aria-hidden="true">+{out.payout}{out.lost ? <small>−{out.lost} сгорело</small> : null}</span>
      </React.Fragment>
    )}
    <svg className="rw-pig" viewBox="0 0 80 64" width="80" height="64" aria-hidden="true">
      <defs><clipPath id={clip}><rect x="20" y="-20" width="40" height="38.4" /></clipPath></defs>
      {drop > 0 && <g key={drop} className="rw-pig-coin"><circle cx="37.5" cy="6" r="6" fill="#E3B23C" stroke="#8A6416" strokeWidth="1.4" /><circle cx="37.5" cy="6" r="3" fill="none" stroke="#8A6416" strokeWidth="1" /></g>}
      <ellipse cx="39" cy="60" rx="23" ry="2.6" fill="#000" opacity=".08" />
      <path d="M14.5 33.5c-3.2-.6-5.6 1.2-5 3.6.5 2 3.4 2.2 4-.1.5-2-1.6-3-3.1-1.9" fill="none" stroke={PIG.line} strokeWidth="2" strokeLinecap="round" />
      {leg(26, PIG.far)}{leg(48, PIG.far)}{leg(19, PIG.body)}{leg(41, PIG.body)}
      {ear('M44 21.5c1-6.5 5.5-9.5 10.5-9 .3 5-2.2 9-6.5 11z')}
      <ellipse cx="38" cy="35" rx="25" ry="17.5" fill={PIG.body} stroke={PIG.line} strokeWidth="2" />
      <path d="M22 26c3-4 8-6.5 13-7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
      {ear('M50 21c1.5-5.5 5-8 9-7.6.2 4.4-2 7.6-5.6 9.4z')}
      <ellipse cx="63.5" cy="38" rx="5.6" ry="6.6" fill={PIG.snout} stroke={PIG.line} strokeWidth="2" />
      <ellipse cx="62.4" cy="36" rx="1.1" ry="1.6" fill={PIG.line} /><ellipse cx="65.2" cy="38.6" rx="1.1" ry="1.6" fill={PIG.line} />
      <path d="M50.5 31.5q2.6-3 5.2 0" fill="none" stroke={PIG.ink} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="54" cy="40.5" rx="3.4" ry="2" fill="#EF6F8E" opacity=".45" />
      <path d="M53 45q3 2 6 .2" fill="none" stroke={PIG.line} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="31" y="17" width="13" height="3.2" rx="1.6" fill={PIG.ink} />
      {full && (
        <g className="rw-pig-in">
          <g clipPath={`url(#${clip})`}><g className="rw-pig-peek"><circle cx="37.5" cy="15" r="6" fill="#E3B23C" stroke="#8A6416" strokeWidth="1.4" /><circle cx="37.5" cy="15" r="3" fill="none" stroke="#8A6416" strokeWidth="1" /></g></g>
          {[[27, 9, 1.6], [48.5, 7.5, 1.3], [52, 13.5, 1]].map(([cx, cy, r], k) => <circle key={k} className="spark" cx={cx} cy={cy} r={r} fill="#E3B23C" style={{ '--i': k }} />)}
        </g>
      )}
    </svg>
    </span>
  );
}
function PiggyCard({ learn, update, now, b, onMsg }) {
  const st = piggyState(learn, now);
  const day = dayOf(now);
  const rateNow = weekRate(day);
  const [amount, setAmount] = useState(() => Math.max(PIGGY.min, Math.min(100, Math.floor(b / 2))));
  // вид вклада: срочный (без пополнений, ставка недели) или пополняемый (ставка ниже) — docs/mechanics.md
  const [topup, setTopup] = useState(false);
  const [addAmt, setAddAmt] = useState(() => Math.max(PIGGY.addMin, Math.min(50, Math.floor(b / 4))));
  const [drop, setDrop] = useState(0);
  // «Забрать»: сколько вылетело и сколько сгорело — для анимации свинки
  const [out, setOut] = useState(null);
  useEffect(() => { if (!out) return undefined; const t = setTimeout(() => setOut(null), 2200); return () => clearTimeout(t); }, [out]);
  const can = b >= PIGGY.min;
  const n = Math.max(PIGGY.min, Math.min(amount, b));
  const rTop = topupRate(rateNow);
  const rateFor = topup ? rTop : rateNow;
  const fixedEnd = piggyValue(n, PIGGY.days, rateNow); const topEnd = piggyValue(n, PIGGY.days, rTop);
  const put = () => {
    const r = piggyPut(learn, n, now, { topup });
    if (!r.ok) { Audio.play('down'); onMsg({ ok: false, text: r.reason }); return; }
    Audio.play('register'); setDrop((k) => k + 1); update(() => r.s, { settle: true });
    onMsg({ ok: true, text: `${r.topup ? 'Пополняемый вклад' : 'Срочный вклад'}: ${r.amount} ${coinsWord(r.amount)} под ${fmtPct(r.rate)} в день. Через ${PIGGY.days} дней станет ${piggyValue(r.amount, PIGGY.days, r.rate)}${r.topup ? ' — и больше, если пополнять' : ''}.` });
  };
  const addN = Math.max(PIGGY.addMin, Math.min(addAmt, b));
  const add = () => {
    const r = piggyAdd(learn, addN, now);
    if (!r.ok) { Audio.play('down'); onMsg({ ok: false, text: r.reason }); return; }
    Audio.play('register'); setDrop((k) => k + 1); update(() => r.s, { settle: true });
    onMsg({ ok: true, text: `Пополнено на ${r.amount} ${coinsWord(r.amount)}: эти монеты растут с сегодняшнего дня до конца срока.` });
  };
  const take = () => {
    const r = piggyTake(learn, now);
    if (!r.ok) { onMsg({ ok: false, text: r.reason }); return; }
    Audio.play(r.early ? 'paper' : 'register'); update(() => r.s, { settle: true });
    setOut((o) => ({ k: (o ? o.k : 0) + 1, payout: r.payout, lost: r.lost || 0 }));
    onMsg({ ok: true, text: !r.early ? `Забрано ${r.payout} ${coinsWord(r.payout)} — с процентами за неделю.` : r.lost ? `Забрано ${r.payout} ${coinsWord(r.payout)}: раньше срока процент сгорел (−${r.lost}).` : `Забрано ${r.payout} ${coinsWord(r.payout)}: проценты не успели набежать.` });
  };
  return (
    <Card className="rw-piggy" style={{ margin: '0 0 14px', padding: 0, overflow: 'hidden' }} data-testid="shop-piggy" data-open={String(!!st)}>
      <div className="rw-piggy-head">
        <PiggyArt full={!!st} drop={drop} out={out} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ds-eyebrow">Сберкнижка</div>
          <div className="ds-h3">Копилка Инфли</div>
          <div className="ds-sub" style={{ fontSize: 13.5, lineHeight: 1.35 }}>Положите монеты на {PIGGY.days} дней — вернутся с процентами. Раньше срока процент сгорит.</div>
        </div>
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <RateWeek day={day} focus="piggy" />
        {st ? (
          <div className="rw-book" data-testid="piggy-open">
            <div className="rw-book-top">
              <span className="rw-book-kind" data-testid="piggy-kind">{st.topup ? 'пополняемый' : 'срочный, без пополнений'}</span>
              <span className="ds-num" data-testid="piggy-rate">{fmtPct(st.rate)} в день</span>
            </div>
            <div className="rw-book-sum">
              <div><small>Положено{st.adds ? ` · пополнений: ${st.adds}` : ''}</small><b className="ds-num" data-testid="piggy-amount-in">{st.amount}</b></div>
              <div><small>Сейчас</small><b className="ds-num">{st.value}</b></div>
              <div className="fin"><small>{st.ripe ? 'Готово' : `Через ${PIGGY.days - st.days} ${plural(PIGGY.days - st.days, 'день', 'дня', 'дней')}`}</small><b className="ds-num">{st.final}</b></div>
            </div>
            <div className="rw-book-dayline" data-testid="piggy-state">
              <b>День {st.days} из {PIGGY.days}</b>
              <span>{st.ripe ? 'срок вышел — можно забирать' : `ещё ${PIGGY.days - st.days} ${plural(PIGGY.days - st.days, 'день', 'дня', 'дней')}`}</span>
            </div>
            <div className="rw-book-days" aria-hidden="true">{Array.from({ length: PIGGY.days }, (_, k) => <i key={k} className={k < st.days ? 'on' : k === st.days ? 'cur' : ''} style={{ '--i': k }} />)}</div>
            <PiggyChart amount={st.amount} rate={st.rate} day={st.days} path={st.path} steps={st.steps} />
            {st.canAdd && (b >= PIGGY.addMin ? (
              <div className="rw-add" data-testid="piggy-add-form">
                <label className="rw-book-row" htmlFor="piggy-add-amount"><span>Пополнить</span><b className="ds-num">{addN} {coinsWord(addN)}</b></label>
                <input id="piggy-add-amount" type="range" min={PIGGY.addMin} max={Math.max(PIGGY.addMin, b)} step={1} value={addN} style={{ width: '100%', accentColor: 'var(--u)' }}
                  onChange={(e) => { Audio.play('tick'); setAddAmt(Number(e.target.value)); }} />
                <Button small wide variant="secondary" data-testid="piggy-add" onClick={add}>Пополнить на {addN} {coinsWord(addN)}</Button>
              </div>
            ) : <div className="ds-sub" style={{ fontSize: 13, margin: '0 0 8px' }}>Пополнить можно от {PIGGY.addMin} монет.</div>)}
            <Button small wide={st.ripe} variant={st.ripe ? 'primary' : 'ghost'} data-testid="piggy-take" onClick={take}>
              {st.ripe ? `Забрать ${st.payout} ${coinsWord(st.payout)}` : `Забрать раньше: только ${st.payout}`}
            </Button>
          </div>
        ) : can ? (
          <div className="rw-book" data-testid="piggy-form">
            <label className="rw-book-row" htmlFor="piggy-amount"><span>Положить</span><b className="ds-num">{n} {coinsWord(n)}</b></label>
            <input id="piggy-amount" type="range" min={PIGGY.min} max={Math.max(PIGGY.min, b)} step={1} value={n} data-testid="piggy-amount" style={{ width: '100%', accentColor: 'var(--u)' }}
              onChange={(e) => { Audio.play('tick'); setAmount(Number(e.target.value)); }} />
            <div className="rw-presets" role="group" aria-label="Сколько положить">
              {PRESETS.map(([label, k]) => <button key={label} type="button" onClick={() => { Audio.play('tick'); setAmount(Math.max(PIGGY.min, Math.floor(b * k))); }}>{label}</button>)}
            </div>
            {/* вид вклада — с итогом для этой суммы: сравнение честное, цифрами */}
            <div className="rw-kinds" role="group" aria-label="Вид вклада">
              <button type="button" aria-pressed={!topup} data-testid="piggy-kind-fixed" onClick={() => { Audio.play('tick'); setTopup(false); }}>
                <span className="t"><Lock size={14} aria-hidden="true" /> Срочный</span>
                <b>{fmtPct(rateNow)} в день</b>
                <span className="res">{n} → <em>{fixedEnd}</em> <i>+{fixedEnd - n}</i></span>
                <small>Больше процент, но докладывать нельзя</small>
              </button>
              <button type="button" aria-pressed={topup} data-testid="piggy-kind-topup" onClick={() => { Audio.play('tick'); setTopup(true); }}>
                <span className="t"><Plus size={14} aria-hidden="true" /> Пополняемый</span>
                <b>{fmtPct(rTop)} в день</b>
                <span className="res">{n} → <em>{topEnd}</em> <i>+{topEnd - n}</i></span>
                <small>Процент ниже, зато можно докладывать</small>
              </button>
            </div>
            <PiggyChart amount={n} rate={rateFor} other={topup ? rateNow : rTop} />
            <div className="rw-legend" aria-hidden="true"><span className="m">{topup ? 'пополняемый' : 'срочный'}</span><span className="o">{topup ? 'срочный' : 'пополняемый'} — для сравнения</span></div>
            <div className="rw-book-row"><span>Через {PIGGY.days} дней</span><b className="ds-num" data-testid="piggy-final">{piggyValue(n, PIGGY.days, rateFor)} <small>(+{piggyValue(n, PIGGY.days, rateFor) - n})</small></b></div>
            {topup && <div className="ds-sub" style={{ fontSize: 13, marginTop: 4 }}>Без пополнений пополняемый всегда даёт меньше срочного: он выгоден, только если докладывать.</div>}
            <Button small wide data-testid="piggy-put" onClick={put}>Положить {n} {coinsWord(n)}</Button>
          </div>
        ) : (
          <div className="ds-sub" style={{ fontSize: 14, marginTop: 8 }}>Положить можно от {PIGGY.min} монет — их дают уроки.</div>
        )}
        <RealRate rate={st ? st.rate : rateNow} />
      </div>
    </Card>
  );
}

export default ShopView;
