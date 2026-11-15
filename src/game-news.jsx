/* ГАЗЕТНАЯ ЛЕНТА ПАРТИИ: рубрики новостей со значками, строка новости с цепочкой причин и лента «Экономический
   терминал» с фильтрами по рубрикам. Вынесено из src/game.jsx (docs/mechanics.md, «Порядок в коде») — поведение то же.
   Рубрики читает и газета (src/newspaper.jsx). */
import React, { useState } from 'react';
import { Landmark, Globe2, Users, Newspaper, Factory, ChevronDown, ChevronUp, AlertTriangle, Building2, BarChart3, MessageCircle } from 'lucide-react';
import { quarterLabel } from './lib/engine.js';
import { Audio } from './audio/engine.js';
import { BookLink } from './booklink.jsx';
import { bookForChain } from './lib/booklinks.js';
import { COLOR } from './MacroSimulator.jsx';
// окно достижений и вызов дня живут с меню «Мира» (ленивый модуль)

/* ============================ НОВОСТНАЯ ПОДСИСТЕМА ============================ */
/* значок рубрики — из lucide, как у остального интерфейса (пункт владельца 13.11): эмодзи рисуются по-разному на
   каждом устройстве и не слушаются цвета темы */
export const NEWS_CATEGORIES = [
  { id: 'cb', label: 'Центральный банк', short: 'ЦБ', Icon: Landmark, color: COLOR.blue },
  { id: 'gov', label: 'Правительство', short: 'Правительство', Icon: Building2, color: COLOR.gold },
  { id: 'markets', label: 'Рынки', short: 'Рынки', Icon: BarChart3, color: COLOR.teal },
  { id: 'business', label: 'Бизнес', short: 'Бизнес', Icon: Factory, color: '#8E7CC3' },
  { id: 'households', label: 'Население', short: 'Население', Icon: Users, color: COLOR.goldSoft },
  { id: 'world', label: 'Мир', short: 'Мир', Icon: Globe2, color: '#6FA8A0' },
  { id: 'opinion', label: 'Мнения', short: 'Мнения', Icon: MessageCircle, color: '#C08A6B' },
  { id: 'crisis', label: 'Кризис', short: 'Кризис', Icon: AlertTriangle, color: COLOR.rust },
  { id: 'editorial', label: 'Сводка', short: 'Сводка', Icon: Newspaper, color: COLOR.muted },
];
// значок рубрики в строке текста
export const CatIcon = ({ cat, size = 12, color, style }) => { const I = (typeof cat === 'string' ? catOf(cat) : cat).Icon; return <I size={size} color={color} aria-hidden="true" style={{ verticalAlign: -2, flexShrink: 0, ...style }} />; };

const CATMAP = {};

NEWS_CATEGORIES.forEach((c) => { CATMAP[c.id] = c; });

export const catOf = (id) => CATMAP[id] || CATMAP.markets;

export function ChainTrail({ chain }) {
  if (!chain || !chain.length) return null;
  const book = bookForChain(chain);
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 7 }}>
        {chain.map((step, i) => (
          <React.Fragment key={i}>
            <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 2,
              background: i === 0 ? COLOR.goldDim : COLOR.panelAlt, border: `1px solid ${i === 0 ? COLOR.gold : COLOR.border}`,
              color: i === 0 ? COLOR.goldSoft : COLOR.muted, whiteSpace: 'nowrap' }}>{step}</span>
            {i < chain.length - 1 && <span style={{ color: COLOR.faint, fontSize: 12 }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      {book && <div style={{ marginTop: 6 }}><BookLink to={book} /></div>}
    </>
  );
}

function NewsItem({ item, showQuarter }) {
  const c = catOf(item.cat);
  const [open, setOpen] = useState(false);
  const hasChain = item.chain && item.chain.length > 0;
  return (
    <div style={{ borderLeft: `2px solid ${c.color}`, paddingLeft: 10, paddingBottom: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <CatIcon cat={c} color={c.color} />
        <span style={{ fontSize: 12, color: c.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{c.short}</span>
        {showQuarter && item.qLabel && <span className="ems-mono fs-12 t-faint">{item.qLabel}</span>}
        {item.storyTitle && (
          <span style={{ fontSize: 12, color: COLOR.faint, border: `1px solid ${COLOR.border}`, borderRadius: 2, padding: '0 4px' }}>
            сюжет «{item.storyTitle}» · {item.step}/{item.steps}
          </span>
        )}
      </div>
      <div className="ems-serif" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, margin: '3px 0 3px', color: COLOR.text, letterSpacing: '0.01em' }}>
        {item.headline}
      </div>
      <div style={{ fontSize: 12, color: COLOR.muted, lineHeight: 1.45 }}>{item.text}</div>
      {hasChain && (
        <>
          <button className="ems-btn" style={{ padding: '2px 7px', fontSize: 12, marginTop: 6 }} onClick={() => { Audio.play('tick'); setOpen((o) => !o); }}>
            {open ? 'Скрыть цепочку' : 'Цепочка последствий'} {open ? <ChevronUp size={10} className="va-1" /> : <ChevronDown size={10} className="va-1" />}
          </button>
          {open && <ChainTrail chain={item.chain} />}
        </>
      )}
    </div>
  );
}

export function NewsTerminal({ items, onOpenPaper }) {
  const [filter, setFilter] = useState('all');
  const present = NEWS_CATEGORIES.filter((c) => items.some((i) => i.cat === c.id));
  const list = (filter === 'all' ? items : items.filter((i) => i.cat === filter)).slice(0, 60);
  // лента растёт вставкой новых записей В НАЧАЛО массива, но скролл-позиция
  // блока сама не сбрасывается — если читали и проскроллили вниз, свежая
  // новость наверху оказывается выше видимой области и выглядит пропавшей
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    // сброс scrollTop не помогает, если сама панель уехала за пределы видимой
    // области страницы (на телефоне «Завершить квартал» — внизу длинной
    // страницы, и после клика страница остаётся там же) — довозим панель
    // в поле зрения, но мягко: 'nearest' ничего не делает, если она и так видна
    scrollRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [items[0] && items[0].id]);
  // переключение рубрики тоже должно возвращать список наверх: список
  // отфильтрованных записей короче общего, и старая позиция прокрутки
  // могла указывать на середину этого нового, более короткого списка —
  // человек видел бы старые записи там, где ждал самые свежие
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [filter]);
  return (
    <div className="ems-panel p-12">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <Newspaper size={14} color={COLOR.gold} />
        <span className="ems-serif fs-14 t-goldsoft">Экономический терминал</span>
        <button className="ems-btn" style={{ marginLeft: 'auto', padding: '3px 9px', fontSize: 12 }} onClick={() => { Audio.play('paper'); onOpenPaper(); }}>
          Газета и хроника
        </button>
      </div>
      {present.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
          <button type="button" className={`ems-tab ${filter === 'all' ? 'active' : ''}`} aria-pressed={filter === 'all'} style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => { Audio.play('tab'); setFilter('all'); }}>Всё</button>
          {present.map((c) => (
            <button type="button" key={c.id} className={`ems-tab ${filter === c.id ? 'active' : ''}`} aria-pressed={filter === c.id} style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => { Audio.play('tab'); setFilter(c.id); }}>
              <CatIcon cat={c} style={{ marginRight: 4 }} />{c.short}
            </button>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="ems-scroll" style={{ maxHeight: 430, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {list.length === 0 && <div className="fs-12 t-muted">Лента пуста — завершите первый квартал, и экономика начнёт рассказывать о себе сама.</div>}
        {/* новости шли сплошным потоком без границы между кварталами — метка
            квартала в каждой строке терялась среди заголовков и не читалась
            как раздел. Заголовок раздела перед первой новостью нового квартала
            разбивает ленту на понятные блоки — по одному на квартал. */}
        {list.map((n, i) => (
          <React.Fragment key={n.id}>
            {(i === 0 || n.q !== list[i - 1].q) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: i === 0 ? '0 0 -5px' : '3px 0 -5px' }}>
                <span className="ems-mono" style={{ fontSize: 12, color: COLOR.faint, fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {n.qLabel || quarterLabel(n.q)}
                </span>
                <div style={{ flex: 1, height: 1, background: COLOR.hairline }} />
              </div>
            )}
            <NewsItem item={n} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* Газета («Газета и хроника») подгружается лениво через React.lazy() — см.
   комментарий в начале src/newspaper.jsx. */
export const NewspaperModal = React.lazy(() => import('./newspaper.jsx').then((m) => ({ default: m.NewspaperModal })));

/* Торговый терминал и сводка портфеля подгружаются лениво через React.lazy() —
   см. комментарий в начале src/trading.jsx. */
export const TradingTerminal = React.lazy(() => import('./trading.jsx').then((m) => ({ default: m.TradingTerminal })));

export const PortfolioSummary = React.lazy(() => import('./trading.jsx').then((m) => ({ default: m.PortfolioSummary })));
