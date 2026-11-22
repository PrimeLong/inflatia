/* «ЧТЕНИЕ» — экран урока-подборки цитат (содержание и правила — src/learn/reading.js, docs/mechanics.md).
   Страница книги: печать-монограмма автора, годы, книга и год, цитата антиквой — слова проступают, как
   чернила; ниже — контекст и вопрос. «Найдите в цитате»: слова цитаты нажимаются, верное место
   подчёркивается маркером. В конце — полка: прочитанная подборка встаёт книгой к остальным. */
import { SpecialShell, SpecialDesk, SpecialHead, SpecialLabel, useAnswerRun, useSpecialResume, resumedState } from './learn-special.jsx';
import { useActiveMs } from './learn-clock.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ArrowLeft, ArrowRight, Gem, X } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button, AnswerBar } from './ds.jsx';
import { ReportFlag, REPORT_CSS, EXPLAIN_REASONS } from './learn-report.jsx';
import { useReducedMotion } from './ds-art.jsx';
import { READING_BY_ID, READ_XP, READ_GEM_XP, quoteWords, isRead, isReadGem, shelfOf, quizWho, readingAuthorId } from './learn/reading.js';
import { PEOPLE, initialsOf } from './learn/people.js';
import { cachedPhoto } from './learn/portraits.js';
import { tallyAnswer, streakNow, finishLesson, markRead, markReadGem, countAnswers, addStudySeconds } from './textbook/learn-state.js';
import { ExtraResult, payExtra } from './learn-extra-result.jsx';

const CSS = `
  .rd-root { position: fixed; inset: 0; z-index: 300; overflow-y: auto; overscroll-behavior: contain; color: var(--ds-ink);
    background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--rd) 7%, var(--ds-paper)) 0%, var(--ds-paper) 60%), var(--ds-paper); }
  .rd-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: color-mix(in srgb, var(--ds-paper) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--ds-rule2); }
  .rd-title { flex: 1; min-width: 0; font: 700 15px var(--ds-head); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rd-marks { display: flex; gap: 5px; }
  .rd-marks i { width: 9px; height: 18px; border-radius: 0 0 3px 3px; background: var(--ds-rule); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); transition: background .3s, transform .3s; }
  .rd-marks i.on { background: var(--rd); transform: translateY(2px); }
  .rd-page { max-width: 680px; margin: 0 auto; padding: 22px 18px 120px; }
  .rd-sheet { position: relative; background: var(--ds-card); border: 1px solid var(--ds-rule2); border-radius: 22px; padding: 26px 24px 22px;
    box-shadow: 0 1px 0 var(--ds-rule2), 0 18px 40px -26px rgba(40, 24, 8, .45); animation: rd-turn .45s cubic-bezier(.2, .9, .3, 1) backwards; }
  .rd-sheet::before { content: ''; position: absolute; inset: 10px; border-radius: 15px; border: 1px solid color-mix(in srgb, var(--rd) 22%, transparent); pointer-events: none; }
  @keyframes rd-turn { from { opacity: 0; transform: translateX(26px) rotate(.6deg); } }
  .rd-who { display: flex; align-items: center; gap: 14px; }
  .rd-face { overflow: hidden; padding: 0; }
  .rd-face img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; display: block; filter: sepia(.25) contrast(1.04); }
  .rd-seal { flex: none; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; color: var(--rd-ink); font: 700 19px var(--ds-news, Georgia, serif); letter-spacing: .04em;
    background: radial-gradient(circle, color-mix(in srgb, var(--rd) 10%, var(--ds-card)) 58%, transparent 59%);
    box-shadow: inset 0 0 0 2px var(--rd), inset 0 0 0 5px var(--ds-card), inset 0 0 0 6px color-mix(in srgb, var(--rd) 55%, transparent); }
  .rd-name { font: 700 17px var(--ds-head); }
  .rd-meta { font-size: 13.5px; color: var(--ds-ink2); line-height: 1.35; margin-top: 2px; }
  .rd-meta em { font-style: italic; }
  .rd-quote { position: relative; margin: 22px 0 18px; padding-left: 26px; font: italic 400 clamp(19px, 2.4vw, 24px)/1.5 var(--ds-news, 'PT Serif', Georgia, serif); color: var(--ds-ink); }
  .rd-quote::before { content: '«'; position: absolute; left: -4px; top: -14px; font: 700 54px/1 var(--ds-news, Georgia, serif); color: var(--rd); opacity: .55; }
  .rd-w { display: inline; animation: rd-ink .7s ease-out backwards; animation-delay: calc(var(--i) * 28ms + 120ms); border-radius: 4px; }
  @keyframes rd-ink { from { opacity: 0; filter: blur(3px); } }
  .rd-w.tap { cursor: pointer; text-decoration: underline dotted color-mix(in srgb, var(--rd) 55%, transparent); text-underline-offset: 4px; }
  .rd-w.tap:hover { background: color-mix(in srgb, var(--rd) 10%, transparent); }
  .rd-w.picked { background: color-mix(in srgb, var(--ds-bad) 16%, transparent); }
  .rd-w.hit { background-image: linear-gradient(transparent 52%, color-mix(in srgb, var(--rd) 34%, transparent) 52%, color-mix(in srgb, var(--rd) 34%, transparent) 92%, transparent 92%);
    background-repeat: no-repeat; background-size: 0% 100%; animation: rd-marker .5s ease-out forwards; animation-delay: calc(var(--j) * 70ms); }
  @keyframes rd-marker { to { background-size: 100% 100%; } }
  .rd-ctx { font-size: 15px; line-height: 1.55; color: var(--ds-ink2); border-top: 1px dashed var(--ds-rule); padding-top: 12px; }
  .rd-ctx b { display: block; font: 700 11.5px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--rd-ink); margin-bottom: 3px; }
  .rd-ask { margin-top: 16px; }
  .rd-ask-q { font: 700 17px/1.35 var(--ds-head); margin-bottom: 10px; }
  .rd-opts { display: grid; gap: 8px; }
  .rd-opt { text-align: left; font: 500 15.5px/1.35 var(--ds-sans); padding: 12px 14px; border-radius: 14px; border: 2px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink); cursor: pointer; transition: border-color .15s, background .15s, transform .1s; }
  .rd-opt:hover:not(:disabled) { border-color: color-mix(in srgb, var(--rd) 60%, var(--ds-rule2)); }
  .rd-opt:active:not(:disabled) { transform: translateY(1px); }
  .rd-opt.ok { border-color: var(--ds-ok); background: var(--ds-ok-bg); }
  .rd-opt.bad { border-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 8%, var(--ds-card)); }
  .rd-opt:disabled { cursor: default; }
  .rd-fb { margin-top: 14px; padding: 12px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; border-left: 4px solid var(--ds-ok); background: var(--ds-ok-bg); color: var(--ds-ok-ink); animation: rd-up .3s ease-out backwards; }
  .rd-fb.bad { border-left-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 9%, var(--ds-card)); color: var(--ds-ink); }
  @keyframes rd-up { from { opacity: 0; transform: translateY(6px); } }
  .rd-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--ds-paper) 92%, transparent); border-top: 1px solid var(--ds-rule2); backdrop-filter: blur(8px); }
  .rd-foot > * { max-width: 680px; margin: 0 auto; }
  .rd-shelves { margin: 20px auto 6px; max-width: 520px; display: grid; gap: 30px; }
  .rd-shelf { position: relative; height: 168px; display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding: 0 18px; }
  .rd-shelf::after { content: ''; position: absolute; left: 0; right: 0; bottom: -12px; height: 12px; border-radius: 3px; background: linear-gradient(#b08a5c, #8a6a44); box-shadow: 0 6px 12px -6px rgba(0,0,0,.4); }
  .ds-dark .rd-shelf::after { background: linear-gradient(#6b5236, #4a3826); }
  .rd-book { position: relative; flex: none; width: 38px; border-radius: 4px 4px 2px 2px; display: flex; align-items: center; justify-content: center; color: #fff;
    background: linear-gradient(90deg, rgba(0,0,0,.18), transparent 18%, transparent 82%, rgba(0,0,0,.22)), var(--b);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.12), 0 2px 0 rgba(0,0,0,.08); }
  .rd-book span { writing-mode: vertical-rl; transform: rotate(180deg); font: 700 12.5px var(--ds-head); letter-spacing: .04em; white-space: nowrap; }
  .rd-book::before, .rd-book::after { content: ''; position: absolute; left: 4px; right: 4px; height: 2px; background: rgba(255,255,255,.55); }
  .rd-book::before { top: 12px; } .rd-book::after { bottom: 12px; }
  .rd-book.empty { background: color-mix(in srgb, var(--b) 7%, transparent); border: 2px dashed color-mix(in srgb, var(--b) 35%, var(--ds-rule)); box-shadow: none; color: color-mix(in srgb, var(--b) 60%, var(--ds-ink3)); }
  .rd-book.empty::before, .rd-book.empty::after { display: none; }
  .rd-book.new { animation: rd-drop .9s cubic-bezier(.3, 1.4, .5, 1) .2s backwards; }
  @keyframes rd-drop { from { transform: translateY(-180px) rotate(-14deg); opacity: 0; } 60% { opacity: 1; } }
  .rd-done { text-align: center; }
  .rd-done h2 { font: 700 26px var(--ds-head); margin: 18px 0 4px; }
  .rd-keep { margin: 22px auto 0; max-width: 520px; text-align: left; padding: 18px 20px; border-radius: 18px; background: var(--ds-card); border: 1px solid var(--ds-rule2); animation: rd-up .5s ease-out .5s backwards; }
  .rd-keep b { display: block; font: 700 11.5px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--rd-ink); margin-bottom: 6px; }
  .rd-keep q { display: block; font: italic 400 17px/1.5 var(--ds-news, 'PT Serif', Georgia, serif); quotes: '«' '»'; }
  .rd-keep small { display: block; margin-top: 8px; font-size: 13.5px; color: var(--ds-ink2); }
  /* «Чтение» на алмаз: контекст — после ответа; последняя страница — «Кто это сказал?» */
  .rd-ctx.hid { color: var(--ds-ink3); font-style: italic; }
  .rd-gem-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font: 700 11.5px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: #fff; background: #B3123F; }
  /* «Кто это сказал?» — одна цитата на экран, ответ — карточка автора (как «Чья это идея?» в «Персоналиях») */
  .rd-who-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .rd-who-dots { display: flex; gap: 6px; flex: none; } .rd-who-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--ds-rule2); transition: background .25s, transform .25s; }
  .rd-who-dots i.on { background: var(--rd); transform: scale(1.25); } .rd-who-dots i.ok { background: var(--ds-ok); } .rd-who-dots i.bad { background: var(--ds-bad); }
  .rd-who-item { margin-top: 18px; animation: rd-who-in .45s cubic-bezier(.25,.8,.3,1) backwards; }
  @keyframes rd-who-in { from { opacity: 0; transform: translateY(6px); } }
  .rd-who-quote { margin: 0 0 16px; padding: 16px 18px; border-radius: 16px; background: color-mix(in srgb, var(--rd) 6%, var(--ds-paper)); border: 1px solid color-mix(in srgb, var(--rd) 18%, var(--ds-rule2));
    font: italic 400 19px/1.5 var(--ds-news, 'PT Serif', Georgia, serif); quotes: '«' '»'; }
  .rd-who-quote::before { content: open-quote; } .rd-who-quote::after { content: close-quote; }
  .rd-who-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  @media (min-width: 640px) { .rd-who-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .rd-who-pick { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px 10px; border-radius: 16px; border: 2px solid var(--ds-rule2);
    background: var(--ds-card); color: var(--ds-ink); font: 600 14px/1.25 var(--ds-sans); text-align: center; cursor: pointer; transition: border-color .2s, box-shadow .2s, opacity .25s; }
  .rd-who-pick:hover:not(:disabled) { border-color: color-mix(in srgb, var(--rd) 55%, var(--ds-rule2)); box-shadow: 0 6px 16px -10px var(--ds-shade); }
  .rd-who-pick:disabled { cursor: default; }
  .rd-who-pick small { font: 400 12.5px var(--ds-sans); color: var(--ds-ink2); }
  .rd-who-pick.ok { border-color: var(--ds-ok); background: var(--ds-ok-bg); } .rd-who-pick.bad { border-color: var(--ds-bad); } .rd-who-pick.off { opacity: .5; }
  .rd-who-mark { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
  .rd-who-mark.ok { background: var(--ds-ok); } .rd-who-mark.bad { background: var(--ds-bad); }
  .rd-who-says { margin-top: 12px; font: 600 15px/1.4 var(--ds-sans); } .rd-who-says.ok { color: var(--ds-ok); } .rd-who-says.bad { color: var(--ds-bad); }
  @media (prefers-reduced-motion: reduce) { .rd-sheet, .rd-w, .rd-w.hit, .rd-book.new, .rd-fb, .rd-who-item { animation: none; } .rd-w.hit { background-size: 100% 100%; } }
`;

// варианты — в случайном порядке, один раз на страницу
const shuffled = (list) => list.map((o, k) => ({ ...o, k, r: Math.random() })).sort((a, b) => a.r - b.r);

function Page({ p, i, n, answered, onAnswer, gem = false }) {
  const words = useMemo(() => quoteWords(p.quote, p.ask.kind === 'mark' ? p.ask.mark : ''), [p]);
  const opts = useMemo(() => (p.ask.kind === 'choice' ? shuffled(p.ask.options) : []), [p]);
  const mark = p.ask.kind === 'mark';
  const pick = answered ? answered.pick : null;
  // ответ дан — разбор целиком на экране, а не под нижней кнопкой
  const fbRef = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => { if (answered && fbRef.current) fbRef.current.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); }, [!!answered]); // eslint-disable-line react-hooks/exhaustive-deps
  let hitNo = 0;
  return (
    <article className="rd-sheet" key={i} data-testid="reading-page" data-page={i + 1} data-kind={p.ask.kind}>
      <div className="rd-who">
        <AuthorSeal p={p} />
        <div style={{ minWidth: 0 }}>
          <div className="rd-name">{p.author} <span style={{ fontWeight: 400, color: 'var(--ds-ink3)', fontSize: 14 }}>· {p.years}</span></div>
          <div className="rd-meta"><em>{p.book}</em>, {p.year} · страница {i + 1} из {n}</div>
        </div>
      </div>
      <blockquote className="rd-quote" data-testid="reading-quote">
        {words.map((w) => {
          const hit = answered && mark && w.hit;
          const cls = ['rd-w', mark && !answered ? 'tap' : '', hit ? 'hit' : '', mark && answered && pick === w.key && !w.hit ? 'picked' : ''].filter(Boolean).join(' ');
          const style = { '--i': w.key, ...(hit ? { '--j': hitNo++ } : {}) };
          return (
            <React.Fragment key={w.key}>
              {mark && !answered
                ? <span className={cls} style={style} role="button" tabIndex={0} data-testid="reading-word" data-hit={w.hit ? '1' : undefined}
                  onClick={() => onAnswer({ pick: w.key, ok: w.hit })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnswer({ pick: w.key, ok: w.hit }); } }}>{w.w}</span>
                : <span className={cls} style={style}>{w.w}</span>}
              {' '}
            </React.Fragment>
          );
        })}
      </blockquote>
      {/* на алмазном уровне контекст — после ответа: отвечать по самой цитате */}
      {gem && !answered
        ? <div className="rd-ctx hid" data-testid="reading-context-hidden"><b>Контекст</b>Откроется после ответа — на алмазном уровне отвечаем по самой цитате.</div>
        : <div className="rd-ctx" data-testid="reading-context"><b>Контекст</b>{p.context}</div>}
      <div className="rd-ask">
        <div className="rd-ask-q">{mark ? 'Найдите в цитате' : 'Вопрос'}: <span style={{ fontWeight: 500 }}>{p.ask.prompt}</span></div>
        {!mark && (
          <div className="rd-opts" role="group" aria-label="Варианты ответа">
            {opts.map((o) => {
              const state = !answered ? '' : o.ok ? 'ok' : pick === o.k ? 'bad' : '';
              return (
                <button key={o.k} type="button" className={`ds-opt ${state === 'ok' ? 'right' : state === 'bad' ? 'wrong' : ''}`} aria-pressed={pick === o.k} disabled={!!answered} data-testid="reading-opt" data-ok={o.ok ? '1' : undefined}
                  onClick={() => onAnswer({ pick: o.k, ok: !!o.ok })}>{o.text}</button>
              );
            })}
          </div>
        )}
        {answered && (
          <div ref={fbRef} style={{ scrollMarginBottom: 96 }}>
            <AnswerBar ok={answered.ok} className="sp-inline" role="status" data-testid="reading-feedback" data-ok={String(answered.ok)}>
              <div className="ln-fb-body">
                {!answered.ok && !mark && (p.ask.options[answered.pick] || {}).why ? <>{p.ask.options[answered.pick].why} </> : null}
                {!answered.ok && mark ? <>Нужные слова подчёркнуты. </> : null}
                {p.ask.explain}
              </div>
            </AnswerBar>
          </div>
        )}
      </div>
    </article>
  );
}

// портрет автора страницы: фото из «Персоналий» или своё (src/learn/reading.js, READING_AUTHORS), иначе — печать с инициалами
function AuthorSeal({ p }) {
  const id = readingAuthorId(p.author, PEOPLE);
  const ph = id ? cachedPhoto({ id }) : null;
  const [bad, setBad] = useState(false);
  if (!ph || bad) return <span className="rd-seal" aria-hidden="true" data-testid="reading-seal">{p.initials}</span>;
  return <span className="rd-seal rd-face" data-testid="reading-face"><img src={ph.file} alt={`Портрет: ${p.author}`} loading="lazy" decoding="async" onError={() => setBad(true)} /></span>;
}

/* полка: все подборки, прочитанные — книгами; прочитанная впервые (fresh) падает на место, перечитанная (here) просто
   стоит. Книги — по шесть на полке и не сужаются: в один ряд на телефоне они сплющивались (жалоба ученика 08.11) */
const PER_SHELF = 6;
function Shelf({ learn, fresh = null, here = null }) {
  const books = shelfOf(learn);
  const rows = Array.from({ length: Math.ceil(books.length / PER_SHELF) }, (_, i) => books.slice(i * PER_SHELF, (i + 1) * PER_SHELF));
  return (
    <div className="rd-shelves" data-testid="reading-shelf" aria-label="Полка прочитанного">
      {rows.map((row, r) => (
        <div key={r} className="rd-shelf" data-testid="reading-shelf-row">
          {row.map((b, j) => {
            const k = r * PER_SHELF + j;
            const on = b.done || b.id === fresh || b.id === here;
            return (
              <div key={b.id} className={`rd-book${on ? '' : ' empty'}${b.id === fresh ? ' new' : ''}`} data-testid="reading-book" data-done={String(on)} data-new={b.id === fresh ? 'true' : undefined}
                style={{ '--b': b.color, height: 118 + (k % 3) * 14 }} title={on ? b.title : `${b.title} — ещё не прочитано`}><span>{on ? b.spine : '?'}</span></div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* «Кто это сказал?» — последняя страница «Чтения» на алмаз: у каждой цитаты выбрать автора и год, ответ — один раз */
/* «Кто это сказал?» — алмазный уровень «Чтения» в том же формате, что «Чья это идея?» в «Персоналиях» (пункт владельца 22.11,
   п. 6: «не нравится формат теста в чтении на алмазе»; прежний — все цитаты стеной кнопок на одной странице): одна цитата на
   экран, ответ — карточка автора с портретом, точки сверху — сколько верно, после ответа — автор, книга и год, и следующая
   цитата сама. Порядок цитат — не порядок страниц (п. 8). picks — по k вопроса */
const splitLabel = (o) => { const i = o.lastIndexOf(', '); return i > 0 ? [o.slice(0, i), o.slice(i + 2)] : [o, '']; };
function WhoPage({ items, picks, onPick }) {
  const reduced = useReducedMotion();
  const first = items.findIndex((it) => picks[it.k] == null);
  const [at, setAt] = useState(first < 0 ? items.length - 1 : first);
  // варианты — вперемешку у каждой цитаты, один раз за заход
  const opts = useMemo(() => items.map((it) => shuffled(it.options.map((text) => ({ text })))), [items]);
  const it = items[at];
  const mine = picks[it.k];
  useEffect(() => {
    if (mine == null || at >= items.length - 1) return undefined;
    const t = setTimeout(() => setAt(at + 1), reduced ? 500 : 1300);
    return () => clearTimeout(t);
  }, [mine, at, items.length, reduced]);
  return (
    <article className="rd-sheet rd-who-sheet" data-testid="reading-who">
      <div className="rd-who-head">
        <div style={{ minWidth: 0 }}>
          <div className="rd-name">Кто это сказал?</div>
          <div className="rd-meta">Алмазный уровень: коснитесь автора. Алмаз — без единой ошибки.</div>
        </div>
        <div className="rd-who-dots" aria-label={`Цитата ${at + 1} из ${items.length}`}>
          {items.map((x, n) => { const p = picks[x.k]; return <i key={x.k} className={p == null ? (n === at ? 'on' : '') : p === x.answer ? 'ok' : 'bad'} />; })}
        </div>
      </div>
      <div className="rd-who-item" key={it.k} data-testid="reading-who-item" data-answered={mine != null ? 'true' : 'false'}>
        <blockquote className="rd-who-quote">{it.quote}</blockquote>
        <div className="rd-who-grid" role="group" aria-label="Кто это сказал">
          {opts[at].map((o) => {
            const [name, year] = splitLabel(o.text);
            const ok = o.text === it.answer;
            const st = mine == null ? '' : ok ? 'ok' : mine === o.text ? 'bad' : 'off';
            return (
              <button key={o.text} type="button" className={`rd-who-pick ${st}`} disabled={mine != null} data-testid="reading-who-opt" data-ok={ok ? '1' : undefined}
                aria-label={`${name}${year ? `, ${year}` : ''}`} onClick={() => onPick(it.k, o.text)}>
                <AuthorSeal p={{ author: name, initials: initialsOf(name) }} />
                <span className="rd-who-name">{name}</span>
                {year && <small>{year}</small>}
                {st === 'ok' && <span className="rd-who-mark ok" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>}
                {st === 'bad' && <span className="rd-who-mark bad" aria-hidden="true"><X size={15} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
        {mine != null && <div className={`rd-who-says ${mine === it.answer ? 'ok' : 'bad'}`} role="status" data-testid="reading-who-says">
          {mine === it.answer ? 'Верно: ' : 'Это '}{it.author}, «{it.book}», {it.year}.</div>}
      </div>
    </article>
  );
}

export default function ReadingView({ id, learn, update, onClose, gem = false }) {
  const r = READING_BY_ID[id];
  // вышли посреди чтения — продолжаем с той же страницы, с теми же ответами (learn-special.jsx)
  const resume = useSpecialResume('read', id, gem);
  const was = resumedState(resume);
  const run = useAnswerRun(was ? was.run || 0 : streakNow(learn || {}), [], (ok) => { if (update) update((st) => tallyAnswer(st, ok)); });
  const [idx, setIdx] = useState(() => (was ? was.idx : 0));
  const [answers, setAnswers] = useState(() => (was ? was.answers : []));
  const [done, setDone] = useState(false);
  const [got, setGot] = useState(0);
  const [result, setResult] = useState(null); // итоги урока: опыт, монеты, выплаты
  const activeMs = useActiveMs(was ? was.ms || 0 : 0);
  // алмазный уровень: после страниц — «Кто это сказал?»; алмаз — без единой ошибки
  // порядок цитат — свой на каждый заход, при продолжении — тот же (п. 8)
  const [whoSeed] = useState(() => (was && was.whoSeed) || 1 + Math.floor(Math.random() * 2 ** 30));
  const who = useMemo(() => (gem && r ? quizWho(r, whoSeed) : []), [gem, r, whoSeed]);
  const [whoStage, setWhoStage] = useState(() => !!(was && was.whoStage));
  const [picks, setPicks] = useState(() => (was ? was.picks || {} : {}));
  const [won, setWon] = useState(null);
  const reduced = useReducedMotion();
  // место — после каждого ответа и перехода; дочитали — сохранённое убираем
  useEffect(() => {
    if (done) { resume.drop(); return; }
    if (answers.length || idx > 0 || whoStage) resume.save({ pos: idx, idx, answers, whoStage, picks, whoSeed, run: run.current(), ms: activeMs() });
  }, [idx, answers, whoStage, picks, done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null;
  const page = r.pages[idx];
  const answered = answers[idx] || null;
  const whoDone = who.length > 0 && who.every((it) => picks[it.k] != null);
  const pick = (k, text) => {
    if (picks[k] != null) return;
    const it = who.find((x) => x.k === k);
    Audio.play(text === it.answer ? 'up' : 'down');
    run.answer(text === it.answer);
    setPicks((p) => ({ ...p, [k]: text }));
  };
  const toTop = () => window.requestAnimationFrame(() => { const el = document.querySelector('.rd-root'); if (el) el.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  const answer = (a) => {
    if (answers[idx]) return;
    Audio.play(a.ok ? 'up' : 'down');
    run.answer(!!a.ok);
    setAnswers((list) => { const next = [...list]; next[idx] = a; return next; });
  };
  /* назад — к прошлой странице (пункт владельца 22.11, п. 7: «в особых уроках нельзя вернуться»): её ответ и разбор на месте,
     изменить ответ нельзя; с «Кто это сказал?» — к последней странице */
  const canBack = !done && (whoStage || idx > 0);
  const back = () => { if (!canBack) return; Audio.play('paper'); if (whoStage) setWhoStage(false); else setIdx(idx - 1); toTop(); };
  const next = () => {
    Audio.play('paper');
    if (idx + 1 < r.pages.length) { setIdx(idx + 1); toTop(); return; }
    if (gem && !whoStage) { setWhoStage(true); toTop(); return; }
    const right = answers.filter((a) => a && a.ok).length;
    const seconds = Math.round(activeMs() / 1000);
    // ответы — в задание дня «N верных ответов», и при перечитывании (docs/mechanics.md)
    const whoRight = who.filter((it) => picks[it.k] === it.answer).length;
    if (gem) {
      // алмаз — без единой ошибки и на страницах, и в «Кто это сказал?»; опыт и монеты — за первый взятый
      const clean = right === r.pages.length && who.every((it) => picks[it.k] === it.answer);
      const ok = right + whoRight; const all = r.pages.length + who.length; const had = isReadGem(learn, r.id);
      const apply = (s) => { const t = countAnswers(s, ok, all); return clean && !had ? markReadGem(finishLesson(t, null, { xp: READ_GEM_XP, accuracy: 100, seconds, kind: 'read', extra: { fresh: false } }), r.id) : addStudySeconds(t, seconds); };
      const pay = payExtra(learn, update, apply, { id: r.id, diamond: true, won: clean, gem: had, accuracy: (ok / all) * 100 });
      setResult({ xp: clean && !had ? READ_GEM_XP : 0, right: ok, total: all, ms: activeMs(), diamond: true, won: clean, replay: clean && had, ...pay });
      setWon(clean);
      if (clean && !had) setGot(READ_GEM_XP);
      setDone(true);
      Audio.play(clean ? 'stamp' : 'paper');
      return;
    }
    // дочитали: опыт и монеты — один раз, книга — на полку; итоги — как после урока
    const first = !isRead(learn, r.id);
    const accuracy = (right / r.pages.length) * 100;
    const apply = (s) => { const t = countAnswers(s, right, r.pages.length); return first ? markRead(finishLesson(t, null, { xp: READ_XP, accuracy, seconds, kind: 'read', extra: { fresh: true } }), r.id) : addStudySeconds(t, seconds); };
    const pay = payExtra(learn, update, apply, { id: r.id, fresh: first, accuracy });
    setResult({ xp: first ? READ_XP : 0, right, total: r.pages.length, ms: activeMs(), replay: !first, ...pay });
    if (first) setGot(READ_XP);
    setDone(true);
    Audio.play('stamp');
  };
  const style = { '--rd': r.color, '--rd-ink': `color-mix(in srgb, ${r.color} 80%, var(--ds-ink))` };
  return (
    <SpecialShell learn={learn}>
    <div className="rd-root" role="dialog" aria-modal="true" aria-label={`Чтение: ${r.title}`} data-testid="reading" data-id={r.id} data-gem={gem ? 'true' : undefined} style={style}>
      <style>{CSS + REPORT_CSS}</style>
      {/* шапка как у урока: «✕», полоса прогресса по страницам, молния «верно подряд» и Инфля (learn-special.jsx) */}
      <SpecialHead closeLabel="Закрыть чтение" closeTestid="reading-close" onClose={() => { Audio.play('paper'); onClose(); }} run={run}
        total={r.pages.length + (gem ? 1 : 0)}
        answers={[...answers.filter(Boolean).map((a) => !!a.ok), ...(whoDone ? [who.every((it) => picks[it.k] === it.answer)] : [])]}
        onBack={canBack ? back : null} >
      <SpecialLabel kind="Чтение" title={r.title} gem={gem} gemTestid="reading-gem-tag">
        {/* «Сообщить об ошибке» — подборка, страница, вопрос и ответ уходят в жалобу */}
        <ReportFlag withText text="Ошибка?" reasons={EXPLAIN_REASONS} sub="Что не так в чтении? Цитата, вопрос и устройство приложатся сами." context={() => ({
          screen: 'reading', lesson: r.id, unit: r.unitId, kind: 'read',
          step: done ? 'полка' : whoStage ? 'алмаз: «Кто это сказал?»' : `страница ${idx + 1} из ${r.pages.length}: ${page.author}, ${page.book}${gem ? ' (алмаз)' : ''}`,
          prompt: done ? r.title : `${page.quote} — ${page.ask.prompt}`.slice(0, 1500),
          answer: !done && answered ? `${page.ask.kind === 'choice' ? ((page.ask.options || []).find((o) => o.k === answered.pick) || {}).text || '' : `слово ${answered.pick}`} — ${answered.ok ? 'верно' : 'неверно'}` : '',
        })} />
      </SpecialLabel>
      </SpecialHead>
      <SpecialDesk learn={learn} />
      {!done ? (
        <div className="rd-page">
          {whoStage ? <WhoPage items={who} picks={picks} onPick={pick} /> : <Page key={idx} p={page} i={idx} n={r.pages.length} answered={answered} onAnswer={answer} gem={gem} />}
        </div>
      ) : gem ? (
        <div className="rd-page rd-done" data-testid="reading-done" data-won={String(!!won)}>
          {result && <ExtraResult kind="read" unitId={r.unitId} title={r.title} r={result} />}
        </div>
      ) : (
        <div className="rd-page rd-done" data-testid="reading-done">
          {result && <ExtraResult kind="read" unitId={r.unitId} title={r.title} r={result} />}
          <Shelf learn={learn} fresh={got ? r.id : null} here={r.id} />
          <div className="ds-sub" style={{ fontSize: 15.5, lineHeight: 1.5, marginTop: 18 }} data-testid="reading-shelf-count">
            {/* считаются подборки цитат «Чтения», а не книги библиотеки: «6 из 12 книг» читалось как счёт библиотеки, где книг девять (пункт владельца 15.11) */}
            {got ? 'Подборка встала на полку.' : 'Подборка уже стояла на полке.'} Прочитано подборок цитат — {shelfOf(learn).filter((b) => b.done || b.id === r.id).length} из {shelfOf(learn).length}.
          </div>
          {/* цитата на память — та, с которой подборка начиналась */}
          <div className="rd-keep" data-testid="reading-keep">
            <b>Цитата на память</b>
            <q>{r.pages[0].quote}</q>
            <small>{r.pages[0].author}, {r.pages[0].book}, {r.pages[0].year}</small>
          </div>
        </div>
      )}
      <div className="ln-foot sp-foot" data-testid="reading-foot">
        <div className="ln-inner">
          {done
            ? <Button wide icon={Check} data-testid="reading-finish" onClick={() => { Audio.play('click'); onClose(); }}>{gem ? 'Готово' : 'Дальше'}</Button>
            : whoStage ? <>
              <Button variant="secondary" icon={ArrowLeft} data-testid="reading-back" onClick={back}>Назад</Button>
              <Button wide icon={Check} disabled={!whoDone} data-testid="reading-next" onClick={next}>{whoDone ? 'Готово' : 'Выберите автора у каждой цитаты'}</Button>
            </> : <>
              <Button variant="secondary" icon={ArrowLeft} disabled={idx === 0} data-testid="reading-back" onClick={back}>Назад</Button>
              <Button wide icon={answered && idx + 1 === r.pages.length ? Check : ArrowRight} disabled={!answered} data-testid="reading-next" onClick={next}>
              {!answered ? (page.ask.kind === 'mark' ? 'Коснитесь слов в цитате' : 'Выберите ответ') : idx + 1 < r.pages.length || gem ? 'Дальше' : 'На полку'}</Button>
            </>}
        </div>
      </div>
    </div>
    </SpecialShell>
  );
}
