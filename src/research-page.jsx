/* СТРАНИЦА ИССЛЕДОВАНИЯ «Игра и учёба в Инфляции» — /research (research/protocol.md; docs/mechanics.md, «Исследование»).
   Своя страница без оболочки приложения; ничего не читает из прогресса Инфляции и ходит только в /api/research. Запись —
   только из аккаунта Инфляции (протокол 0.4: один аккаунт — одно участие, research/methodology.md, раздел 8): страница
   берёт ключ входа из этого браузера (ems-account, его кладёт вход в приложении) и отправляет его только при записи и
   «Продолжить с аккаунтом». Дальше участника знает случайный код (ключ ems-research-code в этом браузере; его можно ввести
   на другом устройстве или получить там же после входа).

   Пока исследование закрыто (STUDY_STATUS — 'draft', сервер отвечает «не начато»), страница показывает только это:
   информация для участника не публикуется до правовой проверки.

   Ход участника: информация и согласие → код → входной тест → группа (назначает сервер) → восемь уроков модуля → итоговый
   тест (после восьми уроков или с 14-го дня) → отсроченный (28–35-й день). Отозвать участие можно на любом шаге.

   Две версии модуля (src/research/module.js) — одно содержание: те же объяснения, задания и разборы. «Игровая» добавляет
   опыт, серию верных ответов, карту уроков со звёздами и праздник в конце урока; «обычная» — тот же текст без них.
   Правильность ответа, номер попытки и время считает сервер; страница показывает то, что он вернул. */
import React, { useCallback, useEffect, useState } from 'react';
import { MODULE } from './research/module.js';
import infoText from '../research/participant-information.md?raw';

export const CODE_KEY = 'ems-research-code';
const readCode = () => { try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
const saveCode = (c) => { try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch { /* нет хранилища */ } };

// ключ входа аккаунта Инфляции в этом браузере (src/account.jsx) — только ключ и логин для подписи
const readAccount = () => { try { const a = JSON.parse(localStorage.getItem('ems-account') || 'null'); return a && a.token && a.login ? { token: a.token, login: a.login } : null; } catch { return null; } };

async function api(action, body = {}) {
  const r = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
  let data = {}; try { data = await r.json(); } catch { data = {}; }
  return { ok: r.ok, status: r.status, data };
}

/* Текст информации для участника — из research/participant-information.md, часть после первой черты (до неё —
   служебная шапка документа). Простая разметка: заголовки, абзацы, списки, полужирный. */
function infoBody(md) {
  const parts = String(md).split(/\n---\n/);
  return parts.length > 1 ? parts.slice(1).join('\n') : md;
}
function inline(text, key) {
  const out = []; const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\([^)]+\)|`([^`]+)`/g; let last = 0; let m; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? <b key={`${key}-${k += 1}`}>{m[1]}</b> : m[3] ? <code key={`${key}-${k += 1}`}>{m[3]}</code> : m[2]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export function Markdown({ text }) {
  const blocks = []; let list = null;
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*[-*] /.test(line)) { if (!list) { list = []; blocks.push({ list }); } list.push(line.replace(/^\s*[-*] /, '')); return; }
    list = null;
    if (!line.trim() || line.trim() === '---') return;
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    blocks.push(h ? { h: h[1].length, t: h[2], i } : { p: line, i });
  });
  return blocks.map((b, i) => (b.list ? <ul key={i}>{b.list.map((t, j) => <li key={j}>{inline(t, `${i}-${j}`)}</li>)}</ul>
    : b.h ? React.createElement(`h${Math.min(4, b.h + 1)}`, { key: i }, inline(b.t, i)) : <p key={i}>{inline(b.p, i)}</p>));
}

const CSS = `
  .rs { --bg: #FBF8F2; --card: #FFFFFF; --ink: #22201C; --ink2: #5C574F; --ink3: #8A847A; --line: #E7E0D3; --acc: #2E6B4F; --acc2: #E9F3EE; --bad: #B23B3B; --bad2: #FBECEC; --gold: #B8860B;
    min-height: 100vh; background: var(--bg); color: var(--ink); font: 16px/1.55 'PT Sans', system-ui, sans-serif; padding: 24px 16px 80px; }
  @media (prefers-color-scheme: dark) { .rs { --bg: #15171A; --card: #1E2125; --ink: #ECE8E1; --ink2: #B9B3A9; --ink3: #8E887E; --line: #33373D; --acc: #6CC497; --acc2: #1E3329; --bad: #F08A8A; --bad2: #3A2222; --gold: #E3B54A; } }
  .rs * { box-sizing: border-box; }
  .rs-in { max-width: 680px; margin: 0 auto; }
  .rs h1 { font: 700 28px/1.2 'PT Serif', Georgia, serif; margin: 0 0 6px; }
  .rs h2 { font: 700 21px/1.25 'PT Serif', Georgia, serif; margin: 22px 0 8px; }
  .rs h3, .rs h4 { font: 700 17px/1.3 'PT Sans', sans-serif; margin: 18px 0 6px; }
  .rs p { margin: 0 0 10px; } .rs ul { margin: 0 0 10px; padding-left: 22px; } .rs li { margin: 3px 0; }
  .rs-sub { color: var(--ink2); margin-bottom: 18px; }
  .rs-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin: 14px 0; }
  .rs-info { max-height: 52vh; overflow-y: auto; padding-right: 6px; }
  .rs-info code { font-family: ui-monospace, Menlo, monospace; font-size: .95em; padding: 1px 6px; border-radius: 6px; background: var(--card); border: 1px solid var(--line); }
  .rs-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 20px; border-radius: 12px; border: 0; cursor: pointer;
    background: var(--acc); color: #fff; font: 700 16px 'PT Sans', sans-serif; }
  .rs-btn:disabled { opacity: .45; cursor: default; }
  .rs-btn.ghost { background: transparent; color: var(--ink2); border: 1px solid var(--line); }
  .rs-btn.wide { width: 100%; }
  .rs-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  .rs-check { display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; cursor: pointer; }
  .rs-check input { width: 20px; height: 20px; margin-top: 2px; flex: none; accent-color: var(--acc); }
  .rs-input { width: 100%; min-height: 46px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: 18px 'PT Sans', sans-serif; }
  .rs-input:focus { outline: 2px solid var(--acc); outline-offset: 1px; }
  .rs-code { font: 700 30px/1.2 'PT Mono', monospace; letter-spacing: .08em; text-align: center; padding: 14px; border: 2px dashed var(--acc); border-radius: 14px; margin: 10px 0; }
  .rs-err { color: var(--bad); margin-top: 8px; }
  .rs-q { padding: 14px 0; border-top: 1px solid var(--line); } .rs-q:first-child { border-top: 0; }
  .rs-q > b { display: block; margin-bottom: 8px; font-weight: 700; }
  .rs-opts { display: grid; gap: 8px; }
  .rs-opt { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; background: var(--card); text-align: left; color: var(--ink); font: inherit; width: 100%; }
  .rs-opt[aria-pressed="true"] { border-color: var(--acc); background: var(--acc2); }
  .rs-opt i { font-style: normal; font-weight: 700; color: var(--ink3); width: 18px; }
  .rs-unit { color: var(--ink3); white-space: nowrap; }
  .rs-num { display: flex; gap: 8px; align-items: center; } .rs-num .rs-btn { white-space: nowrap; padding: 0 14px; }
  .rs-fb { margin-top: 12px; padding: 12px 14px; border-radius: 12px; }
  .rs-fb.ok { background: var(--acc2); } .rs-fb.bad { background: var(--bad2); }
  .rs-fb b { display: block; }
  .rs-lessons { display: grid; gap: 8px; }
  .rs-lesson { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); cursor: pointer; text-align: left; color: var(--ink); font: inherit; width: 100%; }
  .rs-lesson small { display: block; color: var(--ink3); }
  .rs-lesson .st { margin-left: auto; color: var(--ink3); white-space: nowrap; }
  .rs-lesson[data-done="true"] .st { color: var(--acc); }
  .rs-meta { color: var(--ink3); font-size: 14px; }
  .rs-link { color: var(--ink2); background: none; border: 0; text-decoration: underline; cursor: pointer; font: inherit; padding: 0; }
  /* игровая подача: опыт, серия, карта со звёздами, праздник */
  .rs-hud { display: flex; gap: 10px; flex-wrap: wrap; }
  .rs-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); font-weight: 700; }
  .rs-chip.xp { color: var(--gold); } .rs-chip.fire { color: #D9622B; }
  .rs-map { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; }
  .rs-node { width: 74px; height: 74px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; font: 700 22px 'PT Sans', sans-serif;
    background: var(--card); color: var(--ink2); box-shadow: 0 5px 0 var(--line), inset 0 0 0 2px var(--line); transition: transform .15s; }
  .rs-node:nth-child(4n+2) { transform: translateX(46px); } .rs-node:nth-child(4n) { transform: translateX(-46px); }
  .rs-node[data-done="true"] { background: var(--acc); color: #fff; box-shadow: 0 5px 0 color-mix(in srgb, var(--acc) 60%, #000); }
  .rs-node[data-next="true"] { outline: 3px solid var(--gold); outline-offset: 4px; animation: rs-pulse 1.6s ease-in-out infinite; }
  .rs-node-label { font-size: 13px; color: var(--ink2); margin-top: -6px; text-align: center; }
  @keyframes rs-pulse { 50% { outline-offset: 8px; } }
  .rs-bar { height: 12px; border-radius: 6px; background: var(--line); overflow: hidden; margin: 10px 0; }
  .rs-bar i { display: block; height: 100%; background: var(--acc); border-radius: 6px; transition: width .4s ease; }
  .rs-gain { display: inline-block; color: var(--gold); font-weight: 700; animation: rs-up .9s ease-out both; }
  @keyframes rs-up { from { opacity: 0; transform: translateY(8px) scale(.9); } 30% { opacity: 1; } to { opacity: 1; transform: none; } }
  .rs-party { text-align: center; padding: 18px 0; } .rs-party b { font: 700 30px 'PT Serif', serif; display: block; animation: rs-up .6s ease-out both; }
  .rs-stars { font-size: 34px; letter-spacing: 6px; color: var(--gold); }
  @media (prefers-reduced-motion: reduce) { .rs-node, .rs-gain, .rs-party b, .rs-bar i { animation: none !important; transition: none !important; } }
`;

function Page({ children }) {
  return (
    <div className="rs" data-testid="research-page">
      <style>{CSS}</style>
      <main className="rs-in" id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}

/* одна задача теста или задание урока: варианты или число; «Не знаю» — в тесте */
function Question({ q, value, onChange, allowSkip = false, disabled = false }) {
  if (q.kind === 'choice') {
    return (
      <div className="rs-opts" role="group" aria-label={q.prompt}>
        {q.options.map((o) => (
          <button key={o.id} type="button" className="rs-opt" aria-pressed={value === o.id} disabled={disabled} data-testid="rs-opt" data-id={o.id} onClick={() => onChange(o.id)}>
            <i>{o.id})</i>{o.text}
          </button>
        ))}
        {allowSkip && <button type="button" className="rs-opt" aria-pressed={value === null} disabled={disabled} data-testid="rs-skip" onClick={() => onChange(null)}><i>—</i>Не знаю</button>}
      </div>
    );
  }
  return (
    <div className="rs-num">
      <input className="rs-input" inputMode="decimal" value={value || ''} disabled={disabled} aria-label={q.prompt} data-testid="rs-num" maxLength={24}
        onChange={(e) => onChange(e.target.value)} placeholder="Ваш ответ" />
      {q.unit && <span className="rs-unit">{q.unit}</span>}
      {allowSkip && <button type="button" className="rs-btn ghost" aria-pressed={value === null} disabled={disabled} data-testid="rs-skip" onClick={() => onChange(null)}>Не знаю</button>}
    </div>
  );
}

const KIND_TITLE = { pre: 'Входной тест', post: 'Итоговый тест', delayed: 'Отсроченный тест' };
const KIND_NOTE = {
  pre: 'Двенадцать задач о доходах, расходах и сбережениях. Это не экзамен: нужно понять, с чего вы начинаете. Если не знаете ответа — выберите «Не знаю».',
  post: 'Те же двенадцать тем, что во входном тесте, с другими числами. Отвечайте сами, без калькулятора-подсказок и поиска.',
  delayed: 'Последний шаг: тот же тест через несколько недель — чтобы узнать, что запомнилось.',
};
function TestRunner({ code, kind, onDone }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [used, setUsed] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api('form', { code, kind }).then((r) => { if (!live) return; if (r.ok) setForm(r.data); else setErr(r.data.error || 'Тест сейчас недоступен'); });
    return () => { live = false; };
  }, [code, kind]);
  if (err && !form) return <div className="rs-card"><p className="rs-err" role="alert">{err}</p></div>;
  if (!form) return <div className="rs-card" aria-busy="true">Загружаем задачи…</div>;
  const all = form.items.every((it) => it.item_id in answers);
  const send = async () => {
    setBusy(true); setErr('');
    const items = form.items.map((it) => ({ item_id: it.item_id, answer: answers[it.item_id] }));
    const r = await api(kind === 'pre' ? 'pretest' : 'test', { code, kind, form: form.form, items, ...(kind === 'post' && used ? { used_regular_app: used } : {}) });
    setBusy(false);
    if (r.ok) onDone(r.data); else setErr(r.data.error || 'Не удалось отправить');
  };
  return (
    <div className="rs-card" data-testid="rs-test" data-kind={kind} data-form={form.form}>
      <h2 style={{ marginTop: 0 }}>{KIND_TITLE[kind]}</h2>
      <p className="rs-sub">{KIND_NOTE[kind]}</p>
      {form.items.map((it, i) => (
        <div key={it.item_id} className="rs-q" data-testid="rs-item" data-item={it.item_id}>
          <b>{i + 1}. {it.prompt}</b>
          <Question q={it} value={answers[it.item_id]} allowSkip onChange={(v) => setAnswers((a) => ({ ...a, [it.item_id]: v }))} />
        </div>
      ))}
      {kind === 'post' && (
        <div className="rs-q">
          <b>Пользовались ли вы обычной Инфляцией (уроками на сайте) в эти дни? Ответ не влияет ни на что, кроме анализа.</b>
          <div className="rs-opts">
            {[['no', 'Нет'], ['yes', 'Да'], ['unsure', 'Не уверен(а)']].map(([v, l]) => <button key={v} type="button" className="rs-opt" aria-pressed={used === v} data-testid="rs-used" data-v={v} onClick={() => setUsed(v)}>{l}</button>)}
          </div>
        </div>
      )}
      {err && <p className="rs-err" role="alert">{err}</p>}
      <button type="button" className="rs-btn wide" style={{ marginTop: 14 }} disabled={!all || busy} data-testid="rs-test-send" onClick={send}>
        {all ? 'Отправить ответы' : `Ответьте на все задачи (${Object.keys(answers).length} из ${form.items.length})`}
      </button>
    </div>
  );
}

/* урок модуля: объяснение, потом задания по одному; ответ проверяет сервер, разбор — одинаковый в обеих версиях */
function Lesson({ code, lesson, game, onBack, onDone, onGain }) {
  const [step, setStep] = useState(-1); // -1 — объяснение
  const [value, setValue] = useState(undefined);
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(null);
  const [right, setRight] = useState(0);
  useEffect(() => { api('event', { code, event: { event_type: 'lesson_start', lesson_id: lesson.id } }); }, [code, lesson.id]);
  const ex = step >= 0 ? lesson.exercises[step] : null;
  const check = async () => {
    setBusy(true);
    const r = await api('answer', { code, exercise_id: ex.id, answer: String(value) });
    setBusy(false);
    if (!r.ok) { setFb({ error: r.data.error || 'Не удалось проверить ответ' }); return; }
    setFb(r.data);
    if (r.data.correct) { setRight((n) => n + 1); onGain(r.data.attempt_no === 1 ? 10 : 5, true); } else onGain(0, false);
  };
  const next = () => {
    if (step + 1 >= lesson.exercises.length) { setFinished(true); return; }
    setStep(step + 1); setValue(undefined); setFb(null);
  };
  if (finished) {
    const stars = right >= lesson.exercises.length ? 3 : right >= lesson.exercises.length - 1 ? 2 : 1;
    return (
      <div className="rs-card" data-testid="rs-lesson-done">
        {game ? (
          <div className="rs-party"><div className="rs-stars" aria-label={`${stars} из 3 звёзд`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div><b>Урок пройден!</b><p>Верно {right} из {lesson.exercises.length}.</p></div>
        ) : (
          <><h2 style={{ marginTop: 0 }}>Урок пройден</h2><p>Верно {right} из {lesson.exercises.length}.</p></>
        )}
        <button type="button" className="rs-btn wide" data-testid="rs-lesson-back" onClick={onDone}>К урокам</button>
      </div>
    );
  }
  return (
    <div className="rs-card" data-testid="rs-lesson" data-lesson={lesson.id}>
      <div className="rs-row" style={{ marginTop: 0, justifyContent: 'space-between' }}>
        <button type="button" className="rs-link" onClick={onBack}>← К урокам</button>
        <span className="rs-meta">{step < 0 ? 'Объяснение' : `Задание ${step + 1} из ${lesson.exercises.length}`}</span>
      </div>
      {game && <div className="rs-bar" aria-hidden="true"><i style={{ width: `${((step + 1) / (lesson.exercises.length + 1)) * 100}%` }} /></div>}
      <h2>{lesson.title}</h2>
      {step < 0 ? (
        <>
          {lesson.cards.map((c, i) => <p key={i} data-testid="rs-card-text">{c}</p>)}
          <button type="button" className="rs-btn wide" data-testid="rs-start" onClick={() => setStep(0)}>К заданиям</button>
        </>
      ) : (
        <>
          <p data-testid="rs-prompt"><b>{ex.prompt}</b></p>
          <Question q={ex} value={value} disabled={!!fb && !fb.error} onChange={setValue} />
          {fb && !fb.error && (
            <div className={`rs-fb ${fb.correct ? 'ok' : 'bad'}`} role="status" data-testid="rs-feedback" data-correct={String(fb.correct)}>
              <b>{fb.correct ? 'Верно' : 'Пока нет'}{game && fb.correct ? <span className="rs-gain"> +{fb.attempt_no === 1 ? 10 : 5} опыта</span> : null}</b>
              {ex.why}
            </div>
          )}
          {fb && fb.error && <p className="rs-err" role="alert">{fb.error}</p>}
          <div className="rs-row">
            {!fb || fb.error ? (
              <button type="button" className="rs-btn wide" disabled={value === undefined || value === '' || busy} data-testid="rs-check" onClick={check}>Проверить</button>
            ) : (
              <>
                {!fb.correct && <button type="button" className="rs-btn ghost" data-testid="rs-retry" onClick={() => { setFb(null); setValue(undefined); }}>Ещё раз</button>}
                <button type="button" className="rs-btn" style={{ flex: 1 }} data-testid="rs-next" onClick={next}>Дальше</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// опыт и серия игровой версии — только на этом устройстве, для отклика; в исследование не идут (их нет в словаре данных)
const GAME_KEY = 'ems-research-game';
const readGame = () => { try { const g = JSON.parse(localStorage.getItem(GAME_KEY) || '{}'); return { xp: g.xp || 0, streak: g.streak || 0 }; } catch { return { xp: 0, streak: 0 }; } };

function ModuleView({ code, progress, onChanged }) {
  const game = progress.arm === 'game';
  const [open, setOpen] = useState(null);
  const [g, setG] = useState(readGame);
  const done = new Set(progress.lessons_done);
  const gain = useCallback((xp, ok) => setG((cur) => {
    const nx = { xp: cur.xp + xp, streak: ok ? cur.streak + 1 : 0 };
    try { localStorage.setItem(GAME_KEY, JSON.stringify(nx)); } catch { /* нет хранилища */ }
    return nx;
  }), []);
  if (open) {
    return <Lesson code={code} lesson={MODULE.find((l) => l.id === open)} game={game} onBack={() => setOpen(null)} onDone={() => { setOpen(null); onChanged(); }} onGain={game ? gain : () => {}} />;
  }
  const nextId = (MODULE.find((l) => !done.has(l.id)) || {}).id;
  return (
    <div className="rs-card" data-testid="rs-module" data-arm={progress.arm}>
      <h2 style={{ marginTop: 0 }}>Модуль «Сберкасса»</h2>
      {game ? (
        <>
          <div className="rs-hud" data-testid="rs-hud">
            <span className="rs-chip xp" data-testid="rs-xp">★ {g.xp} опыта</span>
            <span className="rs-chip fire" data-testid="rs-streak">🔥 серия {g.streak}</span>
            <span className="rs-chip">{done.size} из {MODULE.length}</span>
          </div>
          <div className="rs-map">
            {MODULE.map((l, i) => (
              <React.Fragment key={l.id}>
                <button type="button" className="rs-node" data-done={String(done.has(l.id))} data-next={String(l.id === nextId)} data-testid="rs-lesson-open" data-lesson={l.id}
                  aria-label={`Урок ${i + 1}: ${l.title}${done.has(l.id) ? ' — пройден' : ''}`} onClick={() => setOpen(l.id)}>{done.has(l.id) ? '✓' : i + 1}</button>
                <div className="rs-node-label">{l.title}</div>
              </React.Fragment>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="rs-meta">Пройдено уроков: {done.size} из {MODULE.length}.</p>
          <div className="rs-lessons">
            {MODULE.map((l, i) => (
              <button key={l.id} type="button" className="rs-lesson" data-done={String(done.has(l.id))} data-testid="rs-lesson-open" data-lesson={l.id} onClick={() => setOpen(l.id)}>
                <span><b>{i + 1}. {l.title}</b><small>{l.exercises.length} задания</small></span>
                <span className="st">{done.has(l.id) ? 'пройден' : 'не пройден'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Withdraw({ code, onGone }) {
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState('');
  if (!ask) return <p className="rs-meta" style={{ marginTop: 24 }}>Передумали? <button type="button" className="rs-link" data-testid="rs-withdraw-open" onClick={() => setAsk(true)}>Отозвать участие</button> — все ваши записи будут удалены.</p>;
  return (
    <div className="rs-card" data-testid="rs-withdraw">
      <h3 style={{ marginTop: 0 }}>Отозвать участие?</h3>
      <p>Все ваши ответы, тесты и занятия будут удалены из исследования. Это нельзя отменить. Причину называть не нужно.</p>
      {err && <p className="rs-err" role="alert">{err}</p>}
      <div className="rs-row">
        <button type="button" className="rs-btn" style={{ background: 'var(--bad)' }} data-testid="rs-withdraw-yes"
          onClick={async () => { const r = await api('withdraw', { code }); if (r.ok) { saveCode(''); onGone(); } else setErr(r.data.error || 'Не удалось'); }}>Да, удалить мои записи</button>
        <button type="button" className="rs-btn ghost" onClick={() => setAsk(false)}>Остаться</button>
      </div>
    </div>
  );
}

function Enroll({ onCode }) {
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [have, setHave] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(null);
  const [account] = useState(readAccount);
  useEffect(() => { api('status').then((r) => setConsent(r.data.consent || null)); }, []);
  const go = async () => {
    setBusy(true); setErr('');
    const r = await api('enroll', { adult, consent, token: account && account.token });
    setBusy(false);
    if (r.ok) { saveCode(r.data.code); onCode(r.data.code, true); } else setErr(r.data.error || 'Не удалось записаться');
  };
  const resume = async () => {
    setErr('');
    const r = await api('resume', { token: account && account.token });
    if (r.ok) { saveCode(r.data.code); onCode(r.data.code, false); } else setErr(r.data.error || 'Не удалось найти участие');
  };
  return (
    <>
      <div className="rs-card rs-info" data-testid="rs-info"><Markdown text={infoBody(infoText)} /></div>
      {account ? (
        <div className="rs-card">
          <p className="rs-meta" data-testid="rs-account">Вы вошли как <b>{account.login}</b>. Участие привяжется к этому аккаунту: один аккаунт — одно участие, продолжить можно с любого устройства после входа.</p>
          <label className="rs-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} data-testid="rs-adult" /><span>Мне 18 лет или больше.</span></label>
          <label className="rs-check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="rs-agree" /><span>Я прочитал(а) информацию выше и согласен(на) участвовать.</span></label>
          {err && <p className="rs-err" role="alert">{err}</p>}
          <button type="button" className="rs-btn wide" disabled={!adult || !agree || busy || !consent} data-testid="rs-enroll" onClick={go}>Записаться</button>
        </div>
      ) : (
        <div className="rs-card" data-testid="rs-need-account">
          <h3 style={{ marginTop: 0 }}>Нужен аккаунт Инфляции</h3>
          <p>Участие привязывается к аккаунту: так один человек участвует один раз и может продолжить с любого устройства. Войдите или зарегистрируйтесь в Инфляции и вернитесь на эту страницу.</p>
          <a className="rs-btn ghost" href="/">Войти в Инфляцию</a>
        </div>
      )}
      <div className="rs-card">
        <h3 style={{ marginTop: 0 }}>Уже участвуете?</h3>
        {account && <p className="rs-row"><button type="button" className="rs-btn ghost" data-testid="rs-resume" onClick={resume}>Продолжить с аккаунтом {account.login}</button></p>}
        <p className="rs-meta">Или введите свой код участника.</p>
        <div className="rs-row">
          <input className="rs-input" style={{ flex: 1, minWidth: 200 }} value={have} onChange={(e) => setHave(e.target.value)} placeholder="XXXX-XXXX-XXX" aria-label="Код участника" data-testid="rs-code-input" />
          <button type="button" className="rs-btn ghost" disabled={have.trim().length < 11} data-testid="rs-code-go"
            onClick={async () => { const r = await api('progress', { code: have }); if (r.ok) { const c = have.trim().toUpperCase(); saveCode(c); onCode(c, false); } else setErr(r.data.error || 'Код не найден'); }}>Продолжить</button>
        </div>
        {!account && err && <p className="rs-err" role="alert">{err}</p>}
      </div>
    </>
  );
}

export default function ResearchPage() {
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState(readCode);
  const [fresh, setFresh] = useState(false);
  const [progress, setProgress] = useState(null);
  const [gone, setGone] = useState(false);
  const [testing, setTesting] = useState(null);
  const load = useCallback(async (c = code) => {
    if (!c) { setProgress(null); return; }
    const r = await api('progress', { code: c });
    if (r.ok) setProgress(r.data); else { saveCode(''); setCode(''); setProgress(null); }
  }, [code]);
  useEffect(() => { document.title = 'Исследование «Игра и учёба в Инфляции»'; }, []);
  useEffect(() => { fetch('/api/research?action=status').then((r) => r.json()).then((d) => setStatus(d.status || 'not-started')).catch(() => setStatus('not-started')); }, []);
  useEffect(() => {
    if (status !== 'open' || !code) return;
    load(code);
    // начало занятия — раз за открытие вкладки
    try { if (!sessionStorage.getItem('ems-research-session')) { sessionStorage.setItem('ems-research-session', '1'); api('event', { code, event: { event_type: 'session_start' } }); } } catch { /* нет хранилища */ }
  }, [status, code, load]);
  const head = (
    <>
      <h1>Игра и учёба в Инфляции</h1>
      <p className="rs-sub">Исследование: помогают ли игровые механики учиться экономике. Участие привязано к аккаунту Инфляции, записи исследования хранятся отдельно от прогресса.</p>
    </>
  );
  if (status === null) return <Page>{head}<p aria-busy="true">Загружаем…</p></Page>;
  if (status !== 'open') {
    return (
      <Page>
        {head}
        <div className="rs-card" data-testid="rs-closed">
          <h2 style={{ marginTop: 0 }}>{status === 'closed' ? 'Исследование завершено' : 'Исследование пока не проводится'}</h2>
          <p>{status === 'closed' ? 'Запись и занятия закрыты. Спасибо всем, кто участвовал.' : 'Запись откроется после проверки протокола. Сейчас здесь ничего не собирается.'}</p>
          <a className="rs-btn ghost" href="/">Вернуться в Инфляцию</a>
        </div>
      </Page>
    );
  }
  if (gone) return <Page>{head}<div className="rs-card" data-testid="rs-gone"><h2 style={{ marginTop: 0 }}>Участие отозвано</h2><p>Все ваши записи удалены. Спасибо, что попробовали.</p></div></Page>;
  if (!code) return <Page>{head}<Enroll onCode={(c, isNew) => { setCode(c); setFresh(isNew); }} /></Page>;
  if (!progress) return <Page>{head}<p aria-busy="true">Загружаем…</p></Page>;
  const after = () => { setTesting(null); load(code); };
  const d = progress.day;
  const postOpen = !progress.tests.post && progress.arm && d >= 1 && d <= 16 && (progress.lessons_done.length >= MODULE.length || d >= 14);
  const delayedOpen = !progress.tests.delayed && progress.arm && d >= 28 && d <= 35;
  return (
    <Page>
      {head}
      {fresh && (
        <div className="rs-card" data-testid="rs-code-card">
          <b>Ваш код участника</b>
          <div className="rs-code" data-testid="rs-code">{code}</div>
          <p className="rs-meta">Запишите его: по нему можно продолжить на другом устройстве (или войти там в тот же аккаунт) и отозвать участие.</p>
          <button type="button" className="rs-btn ghost" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {}); setFresh(false); }}>Скопировал(а)</button>
        </div>
      )}
      <p className="rs-meta" data-testid="rs-day">День исследования: {d}{progress.arm ? '' : ' · сначала входной тест'}</p>
      {!progress.arm ? <TestRunner code={code} kind="pre" onDone={after} />
        : testing ? <TestRunner code={code} kind={testing} onDone={after} />
          : (
            <>
              {postOpen && <div className="rs-card" data-testid="rs-post-ready"><b>Итоговый тест открыт.</b><p>{progress.lessons_done.length >= MODULE.length ? 'Вы прошли все уроки.' : 'Прошло 14 дней — тест можно пройти, даже если модуль не закончен.'}</p><button type="button" className="rs-btn wide" data-testid="rs-post-start" onClick={() => setTesting('post')}>Пройти итоговый тест</button></div>}
              {delayedOpen && <div className="rs-card" data-testid="rs-delayed-ready"><b>Отсроченный тест открыт.</b><button type="button" className="rs-btn wide" onClick={() => setTesting('delayed')}>Пройти отсроченный тест</button></div>}
              {progress.tests.post && <p className="rs-meta" data-testid="rs-post-done">Итоговый тест пройден{progress.tests.delayed ? ', отсроченный — тоже. Спасибо!' : '. Отсроченный тест откроется на 28-й день.'}</p>}
              <ModuleView code={code} progress={progress} onChanged={() => load(code)} />
            </>
          )}
      <Withdraw code={code} onGone={() => setGone(true)} />
    </Page>
  );
}
