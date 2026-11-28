/* РАЗБОР ГРАФИКА (docs/mechanics.md, «Разбор графика»; шаги — src/learn/graphs.js): график юнита
   собирается на глазах. Новое на шаге прорисовывается (линии — чертятся, точки — выскакивают, площади —
   наливаются), то, о чём речь, — ярко, остальное приглушено; сдвиги — плавной перестройкой модели.
   Внизу — одна мысль простыми словами, «Назад» и «Дальше»; в конце — вопрос на понимание и «+10 опыта»
   (один раз). Открывается остановкой на дороге юнита и кнопкой «Разобрать график по шагам» на карточке
   урока с этим графиком — тогда без опыта (peek), поверх урока. При «уменьшить движение» — без анимаций. */
import { SpecialShell, SpecialDesk, SpecialHead, SpecialLabel, useAnswerRun, useSpecialResume, resumedState } from './learn-special.jsx';
import { useActiveMs } from './learn-clock.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChartSpline, RotateCcw, Maximize2 } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { Button, IconButton, AnswerBar } from './ds.jsx';
import { useMedia } from './ds-art.jsx';
import { Sketch, SKETCH_CSS, SKETCH_QUERY } from './learn-sketch.jsx';
import { CHARTS } from './textbook/charts.js';
import { sceneInCrowns } from './learn/money.js';
import { GRAPH_BY_ID, GRAPH_XP, isGraphDone, stepView, graphCloze } from './learn/graphs.js';
import { tallyAnswer, streakNow, finishLesson, markGraph, countAnswers, markGem, hasGem, addStudySeconds } from './textbook/learn-state.js';
import { DIAMOND_COLOR } from './ds-tokens.js';
import { ReportFlag, EXPLAIN_REASONS } from './learn-report.jsx';
import { ExtraResult, payExtra } from './learn-extra-result.jsx';
import { STAGE_CSS, GraphStage, W, H, M, gridTicks, stepScene, lessonDomain } from './graph-stage.jsx';

export { GraphStage, W, H, M, gridTicks, stepScene, lessonDomain };

export const GRAPH_CSS = `${STAGE_CSS}
  /* слой 310: над уроком (300), но под шторками (320) — «Сообщить об ошибке» открывается поверх */
  .gl { --g-blue: #2459A6; --g-rust: #B4441A; --g-teal: #0E7A72; --g-gold: #9A6A00; --g-grid: color-mix(in srgb, var(--ds-ink) 9%, transparent);
    position: fixed; inset: 0; z-index: 310; overflow-y: auto; overscroll-behavior: contain; color: var(--ds-ink);
    /* фон — ровный, тот же, что у липкой шапки (.sp-top): у подкрашенного сверху фона край шапки был виден полосой, которая
       «резала» текст при прокрутке (жалоба ученика 24.11, draw-prices, шаг 1: «резкая полоска, что режет текст») */
    background: var(--ds-paper); }
  .ds-dark .gl, .gl.dark { --g-blue: #8DB6F2; --g-rust: #F29A6E; --g-teal: #5ED3C4; --g-gold: #E9C25A; }
  /* шапка с полоской шагов — одним липким блоком: полоска не прилипает к кромке шапки и не уезжает
     под неё при прокрутке (на телефоне она стояла вплотную к «потолку») */
  /* шапка особого урока сама себе фон (learn-special.jsx, .sp-top) — у обёртки ни подложки, ни черты: иначе сверху две плашки */
  .gl-head { position: sticky; top: 0; z-index: 3; padding-top: env(safe-area-inset-top); }
  .gl-top { display: flex; align-items: center; gap: 10px; padding: 10px 14px 8px; max-width: 760px; margin: 0 auto; }
  .gl-title { flex: 1; min-width: 0; font: 700 15px var(--ds-head); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gl-title small { display: block; font: 700 10.5px var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--ds-ink2); }
  .gl-bar { display: flex; gap: 4px; padding: 2px 16px 12px; max-width: 720px; margin: 0 auto; }
  .gl-bar i { flex: 1; height: 5px; border-radius: 3px; background: var(--ds-rule2); overflow: hidden; position: relative; }
  .gl-bar i::after { content: ''; position: absolute; inset: 0; background: var(--g-blue); transform: scaleX(0); transform-origin: 0 50%; transition: transform .45s cubic-bezier(.3, .8, .4, 1); }
  .gl-bar i.on::after { transform: none; }
  .gl-page { max-width: 720px; margin: 0 auto; padding: 14px 16px 130px; }
  .gl-stage { position: relative; background: var(--ds-card); border: 1px solid var(--ds-rule2); border-radius: 22px; padding: 10px 6px 4px;
    box-shadow: 0 18px 40px -28px rgba(0,0,0,.45); }
  /* только сам график: значки кнопок внутри (масштаб «Нарисуй сам») правило не трогает — раньше «−» и «+» растягивались на
     всю кнопку (жалоба 21.11, draw-budget: «кнопки приближения не по стилю») */
  .gl-stage svg:not(.lucide) { display: block; width: 100%; height: auto; max-width: 560px; margin: 0 auto; overflow: visible; }
  .gl-replay { position: absolute; right: 10px; top: 10px; display: flex; gap: 6px; }
  .gl-text { margin-top: 14px; padding: 16px 18px; border-radius: 18px; background: color-mix(in srgb, var(--g-blue) 7%, var(--ds-card)); border: 1px solid color-mix(in srgb, var(--g-blue) 22%, var(--ds-rule));
    font: 400 17px/1.55 var(--ds-sans); animation: gl-rise .45s cubic-bezier(.2, .9, .3, 1) backwards; }
  /* выделенное — жирным, как в тексте урока, без маркера */
  .gl-text b { color: var(--ds-ink); font-weight: 700; }
  .gl-step { display: inline-block; margin-bottom: 6px; font: 700 12px var(--ds-sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ds-ink2); }
  @keyframes gl-rise { from { opacity: 0; transform: translateY(10px) } }
  /* низ: вместо черты поперёк графика — мягкое затухание над кнопками (та же жалоба) */
  .gl-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 3; padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); background: var(--ds-paper); }
  .gl-foot::before { content: ''; position: absolute; left: 0; right: 0; bottom: 100%; height: 22px; pointer-events: none;
    background: linear-gradient(to bottom, transparent, var(--ds-paper)); }
  .gl-foot > div { max-width: 720px; margin: 0 auto; display: flex; gap: 10px; }
  .gl-foot > div > :last-child { flex: 1; }

  /* вопрос и финал */
  .gl-quiz h2 { margin: 18px 0 12px; font: 700 21px/1.3 var(--ds-head); }
  /* варианты — плотным столбиком: у .ds-opt свои поля сверху и снизу, и вместе с промежутком сетки выходило 26 px между
     кнопками (жалоба ученика 24.11, graph-prices: «кнопки слишком далеко друг от друга») */
  .gl-opts { display: grid; gap: 8px; }
  .gl-opts .ds-opt { margin: 0; }
  .gl-gem-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font: 700 11.5px var(--ds-sans); color: #fff; background: ${DIAMOND_COLOR}; flex: none; }
  .gl-blank { display: inline-block; min-width: 64px; border-bottom: 2.5px solid var(--g-blue); margin: 0 2px; vertical-align: -2px; color: transparent; }
  .gl-cloze { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
  .gl-cloze .gl-opt { padding: 9px 14px; border-radius: 12px; font: 600 15px/1.3 var(--ds-sans); }
  /* варианты пропуска — фишками в ряд, а не полноширинными кнопками столбиком с большими промежутками (жалоба 22.11,
     graph-monopoly, алмаз: «почему такой большой промежуток у кнопок») */
  .gl-cloze .ds-opt { width: auto; flex: 0 1 auto; margin: 0; min-height: 44px; padding: 9px 16px; font: 600 15.5px/1.3 var(--ds-sans); }
  .gl-opt { text-align: left; padding: 14px 16px; border-radius: 16px; border: 2px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink);
    font: 600 16px/1.35 var(--ds-sans); cursor: pointer; transition: transform .15s, border-color .2s; }
  .gl-opt:hover:not(:disabled) { border-color: var(--g-blue); }
  .gl-opt.ok { border-color: var(--ds-ok); background: color-mix(in srgb, var(--ds-ok) 10%, var(--ds-card)); }
  .gl-opt.bad { border-color: var(--ds-warn, #D9822B); background: color-mix(in srgb, var(--ds-warn, #D9822B) 10%, var(--ds-card)); }
  .gl-fb { margin-top: 12px; padding: 12px 14px; border-radius: 14px; font: 400 15px/1.5 var(--ds-sans); background: color-mix(in srgb, var(--ds-ok) 10%, var(--ds-card)); }
  .gl-fb.bad { background: color-mix(in srgb, var(--ds-warn, #D9822B) 12%, var(--ds-card)); }
  .gl-done { text-align: center; padding-top: 18px; }
  .gl-done h2 { margin: 6px 0; font: 700 24px/1.25 var(--ds-head); }
  .gl-medal { width: 120px; height: 120px; margin: 12px auto 8px; border-radius: 50%; display: grid; place-items: center; color: #fff;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--g-blue) 55%, #fff), var(--g-blue) 65%); box-shadow: 0 0 0 8px color-mix(in srgb, var(--g-blue) 18%, transparent);
    animation: g-pop .6s cubic-bezier(.3, 1.6, .5, 1) backwards; }
  @media (prefers-reduced-motion: reduce) { .gl *, .gl { animation: none !important; transition: none !important; } .g-in .draw { stroke-dashoffset: 0; } }
`;

// **жирное** в тексте шага
const rich = (t) => String(t).split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
const PlaneViewer = React.lazy(() => import('./plane-view.jsx').then((m) => ({ default: m.PlaneViewer })));
export default function GraphLesson({ id, learn, update, onClose, peek = false, gem = false }) {
  const [full, setFull] = useState(false);
  const g = GRAPH_BY_ID[id];
  // вышли посреди разбора — продолжаем с того же шага (learn-special.jsx); подсказка из урока (peek) — без этого
  const resume = useSpecialResume('graph', id, gem);
  const was = peek ? null : resumedState(resume);
  const run = useAnswerRun(was ? was.run || 0 : streakNow(learn || {}), [], (ok) => { if (update && !peek) update((st) => tallyAnswer(st, ok)); });
  const [k, setK] = useState(() => (was ? was.k : 0));
  const [replay, setReplay] = useState(0);
  const [phase, setPhase] = useState(() => (was ? was.phase : 'tour')); // tour → quiz → done
  const [order] = useState(() => (was && was.order ? was.order : g ? g.quiz.options.map((o, i) => ({ ...o, i })).sort(() => Math.random() - 0.5) : []));
  const [picked, setPicked] = useState(() => (was ? was.picked : null));
  const firstOk = useRef(was ? was.firstOk : null);
  const activeMs = useActiveMs(was ? was.ms || 0 : 0);
  const root = useRef(null);
  const [already] = useState(() => isGraphDone(learn, id));
  const [result, setResult] = useState(null); // итоги урока: опыт, монеты, выплаты (не при подсказке из урока — peek)
  /* алмазный уровень: в тексте шага пропущено выделенное слово или число — выбрать из трёх; ошибка остаётся видна,
     можно выбрать снова, но алмаз — без единой ошибки (docs/mechanics.md, «Особые уроки юнита») */
  const cloze = useMemo(() => (gem && g ? graphCloze(g) : []), [gem, g]);
  const [cz, setCz] = useState(() => (was ? was.cz || {} : {})); // шаг → выбранные варианты по порядку
  const czMiss = useRef(new Set(was ? was.czMiss || [] : []));
  useEffect(() => {
    if (peek) return;
    if (phase === 'done') { resume.drop(); return; }
    if (k > 0 || phase !== 'tour' || Object.keys(cz).length) resume.save({ pos: k, k, phase, order, picked, firstOk: firstOk.current, cz, czMiss: [...czMiss.current], run: run.current(), ms: activeMs() });
  }, [k, phase, picked, cz]); // eslint-disable-line react-hooks/exhaustive-deps
  // ПК с мышью: поля по бокам разбора — черновик, как в уроке (learn-sketch.jsx)
  const sketch = useMedia(SKETCH_QUERY);
  useEffect(() => { if (root.current) root.current.scrollTo({ top: 0 }); }, [k, phase]);
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);
  if (!g) return null;
  const n = g.steps.length;
  const view = stepView(g, k);
  const answered = picked != null && order[picked].ok;
  const cq = gem ? cloze[k] : null;
  const cPicks = cz[k] || [];
  const cOk = !cq || cPicks.includes(cq.term);
  const pickTerm = (o) => {
    if (cOk) return;
    const ok = o === cq.term;
    if (!ok) czMiss.current.add(k);
    run.answer(ok);
    Audio.play(ok ? 'coin' : 'down');
    setCz((m) => ({ ...m, [k]: [...(m[k] || []), o] }));
  };
  /* вариант сначала выбирают, потом — «Проверить», как в обычном уроке (жалоба ученика 24.11, graph-prices: «в обычном уроке
     выбор варианта требует подтверждения») */
  const [sel, setSel] = useState(() => (was ? was.picked : null));
  const choose = (i) => { if (answered) return; Audio.play('tick'); setSel(i); };
  const pick = (i) => {
    if (answered || i == null) return;
    const ok = !!order[i].ok;
    if (firstOk.current == null) { firstOk.current = ok; run.answer(ok); }
    Audio.play(ok ? 'coin' : 'down');
    setPicked(i);
  };
  const finish = () => {
    Audio.play('register');
    // ответ на вопрос разбора — в задание дня «N верных ответов», и при повторе (docs/mechanics.md)
    // впервые — опыт и монеты, как за урок, и всё, что урок выполнил (settle); итоги — как после урока
    if (!peek && update && gem) {
      // алмаз — без единой ошибки в пропусках и в вопросе; опыт и монеты — за первый взятый
      const qs = cloze.filter(Boolean).length;
      const ok = qs - czMiss.current.size + (firstOk.current ? 1 : 0); const all = qs + 1;
      const won = ok === all; const had = hasGem(learn, id);
      const apply = (s) => { const t = countAnswers(s, ok, all); return won && !had ? markGem(finishLesson(t, null, { xp: GRAPH_XP, accuracy: 100, seconds: activeMs() / 1000, kind: 'graph', extra: { fresh: false } }), id) : addStudySeconds(t, activeMs() / 1000); };
      const pay = payExtra(learn, update, apply, { id, diamond: true, won, gem: had, accuracy: (ok / all) * 100 });
      setResult({ xp: won && !had ? GRAPH_XP : 0, right: ok, total: all, ms: activeMs(), diamond: true, won, replay: won && had, ...pay });
    } else if (!peek && update) {
      const right = firstOk.current ? 1 : 0; const accuracy = firstOk.current ? 100 : 60;
      const apply = (s) => { const t = countAnswers(s, right, 1); return already ? addStudySeconds(t, activeMs() / 1000) : markGraph(finishLesson(t, null, { xp: GRAPH_XP, accuracy, seconds: activeMs() / 1000, kind: 'graph', extra: { fresh: true } }), id); };
      const pay = payExtra(learn, update, apply, { id, fresh: !already, accuracy });
      setResult({ xp: already ? 0 : GRAPH_XP, right, total: 1, accuracy, ms: activeMs(), replay: already, ...pay });
    }
    setPhase('done');
  };
  const next = () => {
    Audio.play('paper');
    if (phase === 'tour') { if (k < n - 1) setK(k + 1); else setPhase('quiz'); return; }
    if (phase === 'quiz') finish();
  };
  const back = () => { Audio.play('paper'); if (phase === 'quiz') { setPhase('tour'); return; } if (k > 0) setK(k - 1); };
  const body = (
    <div className="gl" ref={root} role="dialog" aria-label={`Разбор графика: ${g.title}`} data-testid="graph-lesson" data-id={id} data-phase={phase}>
      <style>{GRAPH_CSS}</style>
      <div className="gl-head">
      {/* шапка как у урока: «✕», полоса прогресса по шагам и вопросу, молния «верно подряд» и Инфля (learn-special.jsx);
         подсказка из урока (peek) — без серии */}
      <SpecialHead closeLabel="Закрыть" closeTestid="graph-close" onClose={() => { Audio.play('paper'); onClose(); }} run={peek ? null : run}
        total={n + 1}
        answers={[...Array.from({ length: phase === 'tour' ? k : n }, (_, i) => !czMiss.current.has(i)), ...(firstOk.current != null ? [firstOk.current] : [])]}
        onBack={phase !== 'done' && !(phase === 'tour' && k === 0) ? back : null} >
      <SpecialLabel kind="Разбор графика" title={g.title} gem={gem} gemTestid="graph-gem-tag">
        {/* «Сообщить об ошибке»: шаг (или вопрос) и его текст уходят в жалобу */}
        <ReportFlag withText text="Ошибка?" reasons={EXPLAIN_REASONS} sub="Что не так в разборе? Шаг, его текст и устройство приложатся сами." context={() => ({
          screen: 'graph', lesson: id, unit: g.unitId, kind: 'graph',
          step: (phase === 'tour' ? `шаг ${k + 1} из ${n}` : phase === 'quiz' ? 'вопрос' : 'итог') + (gem ? ' (алмаз)' : ''),
          prompt: (phase === 'tour' ? g.steps[k].text : `${g.quiz.q} — ${g.quiz.options.map((o) => o.text).join(' / ')}`).replace(/\*\*/g, '').slice(0, 1500),
          answer: phase === 'quiz' && picked != null ? order[picked].text : '',
        })} />
      </SpecialLabel>
      </SpecialHead>
      </div>
      {!peek && <SpecialDesk learn={learn} />}
      {phase === 'tour' && (
        <div className="gl-page">
          <div className="gl-stage">
            {/* «Ещё раз» — шаг заново: линии чертятся, а сдвиг модели (спрос влево, налог…) едет с прошлого шага, а не просто перерисовывается */}
            <GraphStage g={g} k={k} key={replay} replayFrom={replay && k > 0 ? stepView(g, k - 1).values : null} hover />
            <div className="gl-replay">
              <IconButton label="Ещё раз" icon={RotateCcw} data-testid="graph-replay" onClick={() => { Audio.play('tick'); setReplay((x) => x + 1); }} />
              {/* на весь экран — числовая плоскость этого шага: ползунки модели, выделенное шага (пункт владельца 18.11) */}
              <IconButton label="На весь экран" icon={Maximize2} data-testid="graph-full" onClick={() => { Audio.play('paper'); setFull(true); }} />
            </div>
          </div>
          {full && (() => {
            const def = CHARTS[g.chart]; const v = stepView(g, k);
            const defs = Object.fromEntries((def.controls ? def.controls(g.attrs) : []).filter((c) => !c.button).map((c) => [c.id, c.def]));
            const build = (vv) => stepScene(sceneInCrowns(def.build(g.attrs, vv)), v);
            const values = { ...defs, ...v.values };
            return (
              <React.Suspense fallback={null}>
                <PlaneViewer title={`${g.title} · шаг ${k + 1} из ${n}`} scene={build(values)} caption={String(v.text || '').replace(/\*\*/g, '')}
                  model={def.controls ? { controls: def.controls(g.attrs), values, build, onButton: def.onButton ? (vv) => def.onButton(g.attrs, vv) : null } : null} focus={v.focus} from={root.current} onClose={() => setFull(false)}
                  report={() => ({ screen: 'graph', lesson: id, unit: g.unitId, kind: 'graph', step: `шаг ${k + 1} из ${n}${gem ? ' (алмаз)' : ''}`, prompt: String(v.text || '').replace(/\*\*/g, '').slice(0, 1500) })} />
              </React.Suspense>
            );
          })()}
          <div className="gl-text" key={k} data-testid="graph-text" aria-live="polite">
            <span className="gl-step">Шаг {k + 1} из {n}</span>
            {cq && !cOk
              ? <div data-testid="graph-cloze-text">{rich(cq.before)}<span className="gl-blank" aria-label="пропуск">___</span>{rich(cq.after)}</div>
              : <div>{rich(view.text)}</div>}
            {cq && (
              <div className="gl-cloze" role="group" aria-label="Что пропущено" data-testid="graph-cloze" data-done={String(cOk)}>
                {cq.options.map((o) => {
                  const st = cPicks.includes(o) ? (o === cq.term ? 'ok' : 'bad') : '';
                  return <button key={o} type="button" className={`ds-opt ${st === 'ok' ? 'right' : st === 'bad' ? 'wrong' : ''}`} aria-pressed={cPicks.includes(o)} disabled={cOk || cPicks.includes(o)} data-testid="graph-cloze-opt" data-ok={o === cq.term ? 'true' : undefined} onClick={() => pickTerm(o)}>{o}</button>;
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {phase === 'quiz' && (
        <div className="gl-page gl-quiz" data-testid="graph-quiz">
          <div className="gl-stage"><GraphStage g={g} k={n - 1} /></div>
          <h2>{g.quiz.q}</h2>
          <div className="gl-opts" role="group" aria-label="Варианты ответа">
            {order.map((o, i) => {
              const st = picked === i && sel === i ? (o.ok ? 'ok' : 'bad') : answered && o.ok ? 'ok' : '';
              return <button key={o.i} type="button" className={`ds-opt ${st === 'ok' ? 'right' : st === 'bad' ? 'wrong' : ''}`} aria-pressed={sel === i} disabled={answered} data-testid="graph-opt" data-ok={o.ok ? 'true' : 'false'} onClick={() => choose(i)}>{o.text}</button>;
            })}
          </div>
        </div>
      )}
      {phase === 'done' && result && (
        <div className="gl-page" data-testid="graph-done">
          <ExtraResult kind="graph" unitId={g.unitId} title={g.title} r={result}>
            <div className="gl-stage"><GraphStage g={g} k={n - 1} /></div>
          </ExtraResult>
        </div>
      )}
      {phase === 'done' && !result && (
        <div className="gl-page gl-done" data-testid="graph-done">
          <div className="gl-medal" aria-hidden="true"><ChartSpline size={58} strokeWidth={1.8} /></div>
          <div className="ds-eyebrow">Разбор графика</div>
          <h2>{g.title}</h2>
          <div className="ds-sub" style={{ fontSize: 15 }}>{peek || already ? 'График разобран — к нему можно вернуться на дороге юнита.' : `+${GRAPH_XP} опыта · график разобран`}</div>
        </div>
      )}
      {sketch && <><style>{SKETCH_CSS}</style><Sketch mode="graph" /></>}
      {/* нижняя полоса — как у урока (.ln-foot, жалобы 19.11: «полоса внизу не как в уроках», «кнопки не по стилю»): после ответа
         на вопрос — плашка ответа урока со штампом и пояснением */}
      {phase === 'quiz' && picked != null && sel === picked ? (
        <div className={`ln-foot sp-foot fb ${order[picked].ok ? 'ok' : 'bad'}`} data-testid="graph-foot">
          <AnswerBar ok={!!order[picked].ok}>
            <div className="ln-fb-body" role="status" data-testid="graph-feedback" data-ok={String(!!order[picked].ok)}>{order[picked].why}{order[picked].ok ? '' : ' Выберите другой ответ.'}</div>
            {order[picked].ok && <Button variant="ok" wide icon={Check} data-testid="graph-next" onClick={next} style={{ marginTop: 12 }}>Готово</Button>}
          </AnswerBar>
        </div>
      ) : (
      <div className="ln-foot sp-foot" data-testid="graph-foot">
        <div className="ln-inner">
          {phase === 'done'
            ? <Button wide data-testid="graph-finish" onClick={() => { Audio.play('click'); onClose(); }}>{result ? 'Дальше' : 'Готово'}</Button>
            : <>
              <Button variant="secondary" icon={ArrowLeft} disabled={phase === 'tour' && k === 0} data-testid="graph-back" onClick={back}>Назад</Button>
              {phase === 'quiz'
                ? <Button wide icon={Check} disabled={sel == null} data-testid="graph-check" onClick={() => pick(sel)}>Проверить</Button>
                : <Button wide icon={ArrowRight} disabled={phase === 'tour' && !cOk} data-testid="graph-next" onClick={next}>
                  {phase === 'tour' && !cOk ? 'Выберите пропущенное' : k < n - 1 ? 'Дальше' : 'К вопросу'}
                </Button>}
            </>}
        </div>
      </div>
      )}
    </div>
  );
  return peek ? body : <SpecialShell learn={learn}>{body}</SpecialShell>;
}

