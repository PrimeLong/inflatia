/* СТИЛИ УЧЕБНИКА, ЗАДАНИЙ И ЖИВОЙ МОДЕЛИ — отдельным лёгким файлом (docs/mechanics.md, «Приветствие и загрузка»).
   Вкладка обучения вставляет их в страницу сразу (так было и раньше: порядок правил важен), а сами экраны —
   учебник (src/textbook.jsx), задания урока (src/learn-play.jsx), модель и «Домино» (src/learn-model.jsx) — грузятся,
   когда их открывают. Раньше строка стилей жила в файле экрана, и ради неё до появления Пути грузился весь экран
   с формулами и графиками. */
export const TEXTBOOK_CSS = `
  .tb-to-top { position: fixed; right: 12px; bottom: calc(24px + env(safe-area-inset-bottom)); z-index: 30; width: 46px; height: 46px; display: inline-flex; align-items: center; justify-content: center;
    padding: 0; border-radius: 50%; border: 1px solid var(--ds-rule2, var(--c-border)); background: var(--ds-card, var(--c-panel)); color: var(--u-ink, var(--c-gold-soft)); box-shadow: 0 4px 14px var(--ds-shade, rgba(0,0,0,.18)); cursor: pointer; }
  .tb-to-top.with-nav { bottom: calc(84px + env(safe-area-inset-bottom)); }
  .tb-float-back { position: fixed; left: 12px; top: calc(10px + env(safe-area-inset-top)); z-index: 30; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
    border-radius: 999px; border: 1px solid var(--ds-rule2, var(--c-border)); background: var(--ds-card, var(--c-panel)); color: var(--u-ink, var(--c-gold-soft));
    font: 700 13px var(--ds-sans, inherit); box-shadow: 0 4px 14px var(--ds-shade, rgba(0,0,0,.18)); cursor: pointer; animation: tb-float-in .25s ease-out; }
  @keyframes tb-float-in { from { opacity: 0; transform: translateY(-8px); } }
  @media (prefers-reduced-motion: reduce) { .tb-float-back { animation: none; } }
  /* решённая задача — видно издалека: зелёная кайма слева, лёгкий зелёный фон, плашка «Решена» */
  .tb-chart-axes { margin: 2px auto 0; max-width: 560px; text-align: center; font: italic 12.5px/1.4 var(--ds-sans, sans-serif); color: var(--c-muted, #777); }
  .tb-solved { border-left: 4px solid var(--c-teal, #2E7D5B) !important; background: color-mix(in srgb, var(--c-teal, #2E7D5B) 7%, var(--c-panel, #fff)) !important; }
  .tb-solved-mark { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--c-teal, #2E7D5B); color: #fff; }
  .tb-todo-mark { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border: 2px dashed var(--c-border); color: var(--c-muted); font: 700 12px/1 var(--ds-sans, sans-serif); }
  /* повторение: карточка уходит — «вернётся» (ярлык-календарь, вправо) или «выучено» (печать, искры, растворяется) */
  .rv-item { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .45s ease .2s; scroll-margin-top: 76px; }
  [data-testid="review"] { scroll-margin-top: 76px; }
  .rv-item.leaving { grid-template-rows: 0fr; }
  .rv-in { min-height: 0; position: relative; }
  .rv-item.leaving .rv-in { overflow: hidden; }
  .rv-item.later.leaving .rv-in > :first-child { animation: rv-later .55s cubic-bezier(.5,0,.75,0) forwards; }
  .rv-item.done.leaving .rv-in > :first-child { animation: rv-done .6s ease-in forwards; }
  .rv-item.dropped.leaving .rv-in > :first-child { animation: rv-dropped .5s ease-in forwards; }
  @keyframes rv-dropped { to { transform: translateX(-60%); opacity: 0; } }
  .rv-badge.later.dropped { border-color: var(--c-faint, #777); }
  .rv-badge.later.dropped b { background: var(--c-muted, #666); }
  .rv-acts { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .rv-skip { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin: -6px 2px 14px; font-size: 13px; color: var(--c-muted); }
  .rv-drop { background: none; border: none; padding: 4px 2px; font: 700 13px/1.3 var(--ds-sans, sans-serif); color: var(--c-muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .rv-drop:hover { color: var(--c-text); }
  @keyframes rv-later { to { transform: translateX(70%) rotate(3deg); opacity: 0; } }
  @keyframes rv-done { to { transform: translateY(-18px) scale(.94); opacity: 0; filter: blur(3px); } }
  .rv-badge { position: absolute; top: 18px; right: 14px; z-index: 3; pointer-events: none; }
  .rv-badge.later { display: flex; flex-direction: column; align-items: center; min-width: 74px; padding: 0 0 6px; border-radius: 6px; overflow: hidden;
    background: var(--ds-card, #fff); border: 1.5px solid var(--c-blue, #3E6FA8); box-shadow: 0 6px 16px rgba(0,0,0,.18); animation: rv-pop .45s cubic-bezier(.3,1.6,.5,1) both; }
  .rv-badge.later b { display: block; width: 100%; padding: 3px 8px; background: var(--c-blue, #3E6FA8); color: #fff; font: 700 12px/1.2 var(--ds-sans, sans-serif); letter-spacing: .06em; text-transform: uppercase; text-align: center; }
  .rv-badge.later span { font: 700 14px/1.3 var(--ds-sans, sans-serif); color: var(--c-text, #222); margin-top: 4px; padding: 0 8px; white-space: nowrap; }
  .rv-badge.done { padding: 6px 14px; border: 3px double var(--c-teal, #2E7D5B); border-radius: 6px; color: var(--c-teal, #2E7D5B); background: color-mix(in srgb, var(--c-teal, #2E7D5B) 10%, var(--ds-card, #fff));
    font: 800 18px/1 var(--ds-head, Georgia, serif); letter-spacing: .12em; text-transform: uppercase; transform: rotate(-10deg); animation: rv-stamp .5s cubic-bezier(.2,1.5,.4,1) both; }
  .rv-spark { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; border-radius: 50%; background: var(--ds-gold, #C9A227); animation: rv-spark .75s ease-out both; }
  .rv-spark:nth-child(even) { background: var(--c-teal, #2E7D5B); width: 7px; height: 7px; }
  @keyframes rv-pop { from { transform: translateY(-14px) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes rv-stamp { from { transform: rotate(-10deg) scale(2.4); opacity: 0; } to { transform: rotate(-10deg) scale(1); opacity: 1; } }
  @keyframes rv-spark { from { transform: translate(-50%, -50%) scale(1); opacity: 1; } to { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.3); opacity: 0; } }
  .rv-wrong { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: space-between; margin: -4px 0 12px; padding: 10px 12px; border-radius: 4px;
    background: color-mix(in srgb, var(--c-rust, #A0522D) 9%, transparent); font-size: 13px; line-height: 1.45; color: var(--c-text); }
  .rv-tally { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--c-teal, #2E7D5B); margin: 4px 0 8px; }
  .rv-tally span { display: inline-flex; align-items: center; gap: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .rv-item, .rv-item.leaving .rv-in > :first-child, .rv-badge, .rv-spark { animation-duration: .01s !important; transition-duration: .01s !important; }
  }
  .tb-solved-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 9px; border-radius: 10px; background: var(--c-teal, #2E7D5B); color: #fff; font: 700 12px/1.4 var(--ds-sans, sans-serif); }
  @media (min-width: 1024px) { .tb-to-top { right: max(16px, calc(50vw - 560px)); } }
  .tb-sticky-top { position: sticky; top: 0; z-index: 30; background: var(--ds-paper, var(--tb-bg, #fff)); margin: 0 -16px; padding: 0 16px; border-bottom: 1px solid var(--ds-rule, transparent); }
  .tb-body { font-size: 14.5px; line-height: 1.68; color: var(--c-text); }
  .tb-body p { margin: 0 0 12px; }
  .tb-body h2 { font-family: var(--ds-head, 'PT Sans', sans-serif); font-size: 20px; font-weight: 700; color: var(--c-gold-soft); margin: 28px 0 10px; }
  .tb-body h3 { font-size: 15px; font-weight: 700; margin: 18px 0 8px; }
  .tb-body ul, .tb-body ol { margin: 0 0 12px; padding-left: 22px; }
  .tb-body li { margin-bottom: 4px; }
  .tb-math { overflow-x: auto; overflow-y: hidden; max-width: 100%; margin: 10px 0 14px; padding: 2px 0 6px; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
  .tb-math .katex-display { margin: 0; }
  .tb-body .katex { font-size: 1.08em; }
  .tb-table { overflow-x: auto; max-width: 100%; margin: 0 0 14px; }
  .tb-table table { border-collapse: collapse; font-size: 13px; min-width: 100%; }
  .tb-table th, .tb-table td { border: 1px solid var(--c-border); padding: 6px 10px; text-align: left; vertical-align: top; }
  .tb-table th { color: var(--c-gold-soft); font-weight: 600; background: var(--c-panel-alt); }
  .tb-box { border: 1px solid var(--c-border); border-left-width: 3px; padding: 12px 14px 4px; margin: 16px 0; background: var(--c-panel-alt); }
  .tb-ask { border: 1px dashed var(--c-gold); border-radius: 10px; padding: 12px 14px; margin: 16px 0; background: color-mix(in srgb, var(--c-gold) 6%, transparent); }
  .tb-ask-q { display: flex; gap: 8px; align-items: center; font-weight: 700; color: var(--c-text); }
  .tb-ask-q svg { color: var(--c-gold-soft); flex: none; }
  .tb-ask-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .tb-ask-btns .ems-btn { padding: 7px 14px; font-size: 13.5px; }
  .tb-ask[data-state="ask"], .tb-ask[data-open="true"] { border-style: solid; }
  .tb-ask-body { margin-top: 8px; animation: tb-ask-in .25s ease-out; }
  @keyframes tb-ask-in { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
  @media (prefers-reduced-motion: reduce) { .tb-ask-body { animation: none; } }
  .tb-recall-part { margin-bottom: 4px; }
  .tb-recall-opts { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 10px; }
  .tb-recall-opt { text-align: left; padding: 10px 12px; min-height: 44px; border: 1px solid var(--c-border); border-left: 3px solid var(--c-border); border-radius: 4px; background: var(--c-panel); color: var(--c-text); font: inherit; font-size: 14px; line-height: 1.45; cursor: pointer; }
  @media (hover: hover) { .tb-recall-opt:hover:not(:disabled) { border-color: var(--c-gold); } }
  .tb-recall-opt:disabled { cursor: default; }
  .tb-recall-opt.right { border-color: var(--c-teal, #2E7D5B); background: color-mix(in srgb, var(--c-teal, #2E7D5B) 12%, var(--c-panel)); color: var(--c-text); }
  /* неверный — сплошная рамка и крестик: пунктир на толстой левой кромке рассыпался на рваные куски (жалоба mvgosm0p) */
  .tb-recall-opt.wrong { border-color: var(--c-rust, #A4462A); background: color-mix(in srgb, var(--c-rust, #A4462A) 8%, var(--c-panel)); color: var(--c-text); }
  .tb-recall-opt.dim { opacity: .62; }
  /* ответ — с анимацией (пункт владельца 09.11): только для отвеченного сейчас, а не у карточки, открытой отвеченной */
  .tb-recall-opt { transition: opacity .3s ease, background-color .3s ease, border-color .3s ease; }
  .tb-recall-part.fresh .tb-recall-opt.right { animation: tb-rc-pop .5s cubic-bezier(.3, 1.6, .5, 1); }
  .tb-recall-part.fresh .tb-recall-opt.wrong { animation: tb-rc-shake .42s ease-in-out; }
  .tb-recall-part.fresh .tb-recall-opt.right > svg, .tb-recall-part.fresh .tb-recall-opt.wrong > svg { animation: tb-rc-mark .35s cubic-bezier(.3, 1.5, .5, 1) .05s backwards; }
  .tb-recall-part.fresh .tb-recall-why { animation: tb-ask-in .3s ease-out .12s backwards; }
  .tb-recall-fresh { animation: tb-ask-in .35s ease-out .18s backwards; }
  .tb-recall-fresh + .tb-recall-fresh { animation-delay: .3s; }
  @keyframes tb-rc-pop { 0% { transform: scale(1) } 40% { transform: scale(1.035) } 100% { transform: scale(1) } }
  @keyframes tb-rc-shake { 20%, 60% { transform: translateX(-5px) } 40%, 80% { transform: translateX(5px) } }
  @keyframes tb-rc-mark { from { opacity: 0; transform: scale(0) rotate(-40deg) } }
  @media (prefers-reduced-motion: reduce) { .tb-recall-part.fresh .tb-recall-opt, .tb-recall-part.fresh .tb-recall-opt > svg, .tb-recall-part.fresh .tb-recall-why, .tb-recall-fresh { animation: none !important; } .tb-recall-opt { transition: none; } }
  .tb-recall-xp { font: 700 12px/1 var(--ds-sans, sans-serif); color: var(--c-teal, #2E7D5B); padding: 4px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c-teal, #2E7D5B) 12%, transparent); animation: tb-xp-in .4s ease-out both; }
  @keyframes tb-xp-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
  @media (prefers-reduced-motion: reduce) { .tb-recall-xp { animation: none; } }
  .tb-recall-why { font-size: 13px; line-height: 1.5; color: var(--c-text); margin: -4px 0 10px; padding: 6px 10px; border-left: 3px solid var(--c-rust, #A4462A); background: color-mix(in srgb, var(--c-rust, #A4462A) 6%, transparent); }
  .tb-box-head { display: flex; align-items: center; gap: 7px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
  .tb-link { background: none; border: none; padding: 0; font: inherit; color: var(--c-gold-soft); cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
  .tb-term { border-bottom: 1px dashed var(--c-gold); cursor: help; color: var(--c-gold-soft); }
  .tb-def { display: block; margin: 6px 0; padding: 8px 11px; background: var(--c-panel); border: 1px solid var(--c-border); font-size: 12.5px; line-height: 1.55; color: var(--c-muted); }
  .tb-slider { width: 100%; accent-color: var(--c-gold); }
  .tb-toc-row { display: flex; align-items: baseline; gap: 10px; width: 100%; text-align: left; padding: 10px 12px; background: none; border: none; border-top: 1px solid var(--c-hairline); color: var(--c-text); font: inherit; cursor: pointer; }
  .tb-toc-row:hover { background: var(--c-panel-alt); }
  .tb-toc-row[disabled] { cursor: pointer; }
  .tb-chip { font-size: 12px; padding: 1px 7px; border: 1px solid var(--c-border); border-radius: 10px; color: var(--c-muted); white-space: nowrap; }
  /* чип-кнопка — без системного серого фона кнопки (в тёмной теме он съедал контраст) */
  button.tb-chip { background: transparent; font-family: inherit; cursor: pointer; }
  .tb-collapse { padding: 3px 10px; color: var(--c-text); }
  /* ключевая формула главы — её стоит знать наизусть; остальные выводятся из таких */
  .tb-key { border-left: 3px solid var(--c-gold); background: var(--c-panel-alt); padding: 6px 12px 2px; margin: 12px 0 14px; border-radius: 0 4px 4px 0; }
  .tb-key .tb-math { margin: 4px 0 8px; }
  .tb-key .tb-legend { margin: -4px 0 8px; }
  .tb-key-sum { border-top: 1px dashed var(--c-border); margin-top: 6px; padding-top: 8px; }
  .tb-key-label { font: 700 12px/1.4 var(--ds-sans, sans-serif); letter-spacing: .07em; text-transform: uppercase; color: var(--c-gold-soft); }
  .tb-legend { font-size: 13px; line-height: 1.6; color: var(--c-muted); margin: -6px 0 14px; padding-left: 10px; border-left: 2px solid var(--c-hairline); }
  /* калькулятор учебника (пункт владельца 15.11: «выглядит не очень красиво, появляется резко»): карточка с экраном
     и крупными клавишами; раскрывается и сворачивается плавно — высотой и прозрачностью */
  .tb-calc-wrap { flex-basis: 100%; display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .28s cubic-bezier(.2,.8,.2,1), opacity .22s ease; }
  .tb-calc-wrap[data-open="true"] { grid-template-rows: 1fr; opacity: 1; }
  .tb-calc-wrap > div { min-height: 0; overflow: hidden; }
  .tb-calc { margin: 10px 0 6px; max-width: 320px; border: 1px solid var(--c-border); border-radius: 16px; padding: 10px; background: var(--c-panel, #fff);
    box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 10px 24px -16px rgba(0,0,0,.35); transform-origin: top left; transition: transform .28s cubic-bezier(.2,.8,.2,1); transform: translateY(-6px) scale(.98); }
  .tb-calc-wrap[data-open="true"] .tb-calc { transform: none; }
  .tb-calc-display { border-radius: 11px; padding: 8px 10px 9px; margin-bottom: 9px; background: var(--c-panel-alt, rgba(0,0,0,.045)); border: 1px solid var(--c-hairline, var(--c-border)); }
  .tb-calc-display input { display: block; width: 100%; box-sizing: border-box; border: none; outline: none; background: none; padding: 0; text-align: right; color: var(--c-muted); font: 500 14px/1.4 var(--ds-mono, monospace); }
  .tb-calc-display:focus-within { border-color: var(--c-gold, #9C7218); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-gold, #9C7218) 18%, transparent); }
  .tb-calc-screen { text-align: right; font: 700 24px/1.25 var(--ds-mono, monospace); letter-spacing: -.01em; color: var(--c-text); min-height: 30px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tb-calc-screen[data-empty="true"] { color: var(--c-muted); }
  .tb-calc-keys { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .tb-calc-keys button { min-height: 44px; font: 600 16px/1 var(--ds-mono, monospace); padding: 0; border: 1px solid var(--c-border); border-bottom-width: 2px; border-radius: 10px; background: var(--c-panel, #fff); color: inherit; cursor: pointer;
    transition: transform .08s ease, background .12s ease, border-color .12s ease; }
  .tb-calc-keys button:hover { background: var(--c-panel-alt, rgba(0,0,0,.04)); }
  .tb-calc-keys button:active { transform: translateY(1px) scale(.97); border-bottom-width: 1px; }
  .tb-calc-keys button.op { color: var(--c-gold, #9C7218); background: color-mix(in srgb, var(--c-gold, #9C7218) 8%, var(--c-panel, #fff)); border-color: color-mix(in srgb, var(--c-gold, #9C7218) 30%, var(--c-border)); }
  .tb-calc-keys button.fn { color: var(--c-muted); }
  .tb-calc-keys button.eq { color: #fff; background: var(--c-gold, #9C7218); border-color: color-mix(in srgb, var(--c-gold, #9C7218) 70%, #000); }
  .tb-calc-keys button.tb-calc-use { grid-column: span 3; min-height: 44px; border-radius: 10px; font: 700 13.5px/1.2 var(--ds-sans, sans-serif); padding: 6px; }
  @media (prefers-reduced-motion: reduce) { .tb-calc-wrap, .tb-calc, .tb-calc-keys button { transition: none; } }
  /* карточка задачи (docs/mechanics.md, «Учебник: карточка задачи»): одно главное действие — «Проверить»,
     уверенность — короткий переключатель по желанию, подсказка/решение/калькулятор — тихая панель внизу */
  .tb-prob { background: var(--c-panel); border: 2px solid var(--c-hairline); border-radius: 18px; padding: 14px 16px; box-shadow: 0 2px 0 var(--c-hairline); }
  /* задача решена верно: плашка с галочкой выпрыгивает, от неё разлетаются искры, рамка задачи коротко
     светится — раньше был только серый текст (жалоба mvfaw0tz: «никакой анимации, когда верно решил») */
  .tb-verdict { font-size: 13px; margin-top: 8px; }
  .tb-verdict.ok { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px; color: var(--c-text);
    background: color-mix(in srgb, var(--c-teal, #2E7D5B) 13%, var(--c-panel)); animation: tb-win-in .35s cubic-bezier(.2,1.3,.4,1) both; }
  .tb-win-badge { position: relative; flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--c-teal, #2E7D5B); color: #fff;
    animation: tb-win-pop .55s .05s cubic-bezier(.3,1.7,.5,1) both; }
  .tb-win-badge i { position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; margin: -3.5px; border-radius: 50%; background: var(--c); opacity: 0; pointer-events: none;
    animation: tb-win-spark .9s .12s cubic-bezier(.2,.7,.4,1) both; }
  .tb-win-badge i:nth-child(odd) { border-radius: 2px; }
  @keyframes tb-win-in { from { opacity: 0; transform: translateY(5px) } }
  @keyframes tb-win-pop { from { transform: scale(0) rotate(-40deg) } }
  @keyframes tb-win-spark { 0% { opacity: 1; transform: rotate(var(--a)) translateX(8px) scale(1) } 60% { opacity: 1 } 100% { opacity: 0; transform: rotate(var(--a)) translateX(36px) scale(.4) } }
  .tb-prob.tb-win { animation: tb-win-glow 1.3s ease-out; }
  @keyframes tb-win-glow { 0% { box-shadow: 0 2px 0 var(--c-hairline), 0 0 0 0 color-mix(in srgb, var(--c-teal, #2E7D5B) 50%, transparent) }
    100% { box-shadow: 0 2px 0 var(--c-hairline), 0 0 0 16px transparent } }
  @media (prefers-reduced-motion: reduce) { .tb-verdict.ok, .tb-win-badge, .tb-prob.tb-win { animation: none; } .tb-win-badge i { display: none; } }
  .tb-prob-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .tb-prob-title { font: 700 16px/1.2 var(--ds-head, sans-serif); color: var(--c-text); }
  .tb-prob-from { font: 400 13px var(--ds-sans, sans-serif); color: var(--c-muted); }
  .tb-lv { font: 700 12px/1 var(--ds-sans, sans-serif); letter-spacing: .05em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; color: #fff; background: #4D7C0F; }
  .tb-lv[data-level="2"] { background: #9A6300; } .tb-lv[data-level="3"] { background: #B3123F; }
  .tb-prob-meta { font: 13px var(--ds-sans, sans-serif); color: var(--c-muted); }
  .tb-prob-acts { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }
  .tb-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 10px; background: none; color: var(--c-muted); cursor: pointer; }
  .tb-icon:hover { background: var(--c-panel-alt); color: var(--c-text); }
  .tb-fields { display: flex; gap: 10px 16px; flex-wrap: wrap; align-items: center; margin: 10px 0 2px; }
  .tb-field { display: flex; gap: 6px; align-items: center; font-size: 14px; color: var(--c-muted); }
  .tb-field b { font: 700 15px var(--ds-sans, sans-serif); color: var(--c-text); min-width: 1.4em; }
  .tb-input { padding: 10px 12px; font: 16px var(--ds-sans, sans-serif); background: var(--c-panel); border: 2px solid var(--c-border-strong, var(--c-border)); border-radius: 12px; color: var(--c-text); }
  .tb-input:focus { outline: none; border-color: var(--u, var(--c-gold)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--u, var(--c-gold)) 18%, transparent); }
  .tb-check-row { display: flex; align-items: center; gap: 10px 14px; flex-wrap: wrap; margin-top: 12px; }
  .tb-sure { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border: 2px solid var(--c-hairline); border-radius: 999px; }
  .tb-sure > span { font: 13px var(--ds-sans, sans-serif); color: var(--c-muted); padding: 0 6px 0 8px; }
  .tb-pick { font: 700 13px var(--ds-sans, sans-serif); padding: 6px 12px; border: none; border-radius: 999px; background: none; color: var(--c-muted); cursor: pointer; }
  .tb-pick[aria-pressed="true"] { background: color-mix(in srgb, var(--u, var(--c-gold)) 15%, var(--c-panel)); color: var(--c-text); }
  .ln-textbook .ems-btn.primary.tb-check { padding: 10px 22px; font-size: 15px; border-radius: 12px; }
  .tb-tools { display: flex; gap: 4px 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--c-hairline); }
  .tb-tool { display: inline-flex; align-items: center; gap: 6px; padding: 6px 2px; border: none; background: none; font: 700 13.5px var(--ds-sans, sans-serif); color: var(--c-muted); cursor: pointer; }
  .tb-tool:hover, .tb-tool[aria-expanded="true"] { color: var(--c-text); }
  .tb-guess { margin: 4px 0 10px; }
  /* прогноз — таблицей: названия в одной колонке, «растёт / падает / не меняется» — ровными столбцами,
     даже когда одно название длиннее других (жалоба mvfaw0tz) */
  .tb-guess-grid { display: grid; grid-template-columns: max-content repeat(3, max-content); align-items: center; gap: 4px 6px; }
  .tb-guess-row { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: center; }
  .tb-guess-name { font-size: 13px; padding-right: 12px; color: var(--c-text); }
  .tb-guess-row .tb-pick { text-align: left; }
  .tb-guess-row .tb-pick { white-space: nowrap; }
  @media (max-width: 560px) { .tb-guess-grid { grid-template-columns: repeat(3, max-content); row-gap: 0; } .tb-guess-name { grid-column: 1 / -1; padding-top: 6px; } .tb-guess-row .tb-pick { padding: 6px 10px; } }
  /* итоги графика — плитками: число колонок зависит только от ширины, а не от длины чисел, поэтому
     строка под ползунками не перескакивает с одной строки на две и кнопка под ней стоит на месте */
  /* ключ под графиком: образец линии и что она значит */
  .tb-chart-key { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13px; line-height: 1.35; color: var(--ds-ink2, #6b6157); }
  .tb-chart-key li { display: inline-flex; align-items: center; gap: 6px; }
  .tb-chart-key svg { flex: none; }
  .tb-ro { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 128px), 1fr)); gap: 6px; margin-top: 12px; }
  .tb-ro > div { display: flex; flex-direction: column; justify-content: space-between; gap: 3px; padding: 7px 10px; border-radius: 8px; background: color-mix(in srgb, var(--c-text) 5%, transparent); min-width: 0; }
  .tb-ro-l { font-size: 12px; line-height: 1.3; color: var(--c-muted); }
  .tb-ro b { font-size: 14px; line-height: 1.2; font-variant-numeric: tabular-nums; color: var(--c-text); }
  .tb-ro .sep { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .tb-flow-step { border: 1px solid var(--c-border); background: var(--c-panel); padding: 8px 12px; }
  .tb-news { background: #E8DFC6; color: #241C12; border: 1px solid #8C6B3E; padding: 8px 12px 10px; margin: 6px 0 10px; }
  .tb-news-mast { font-size: 12px; letter-spacing: .12em; color: #6B5A3E; border-bottom: 3px double #8C6B3E; padding-bottom: 4px; margin-bottom: 6px; }
  .tb-news-head { font-size: 17px; font-weight: 700; line-height: 1.2; }
  .tb-bar { height: 4px; background: var(--c-hairline); border-radius: 2px; overflow: hidden; }
  .tb-bar > span { display: block; height: 100%; background: var(--c-teal); }
  /* разделы главы: строка = номер, название, минуты; на телефоне ничего не «плывёт» */
  /* место, куда привела ссылка: полоса подсветки и метка «Вам сюда», через пару секунд гаснут */
  .tb-target { position: relative; animation: tb-target 3.4s ease-out; border-radius: 4px; }
  .tb-target::before { content: 'Вам сюда'; position: absolute; left: 0; top: -22px; font: 700 11px/1 var(--ds-sans, system-ui); letter-spacing: .08em; text-transform: uppercase;
    color: #fff; background: var(--u, #B4532A); padding: 4px 7px; border-radius: 3px; animation: tb-target-tag 3.4s ease-out forwards; pointer-events: none; }
  @keyframes tb-target { 0%, 55% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--u, #B4532A) 22%, transparent); background: color-mix(in srgb, var(--u, #B4532A) 12%, transparent); }
    100% { box-shadow: 0 0 0 6px transparent; background: transparent; } }
  @keyframes tb-target-tag { 0% { opacity: 0; transform: translateY(4px); } 8%, 70% { opacity: 1; transform: none; } 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .tb-target { animation-duration: .01s; outline: 2px solid var(--u, #B4532A); } .tb-target::before { animation: none; opacity: 1; } }
  .tb-secnav { border: 1px solid var(--c-border); background: var(--c-panel-alt); padding: 10px 12px 6px; margin: 0 0 16px; }
  .tb-secnav-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--c-muted); margin-bottom: 6px; }
  .tb-secnav-head [data-testid="tb-section-progress"] { text-transform: none; letter-spacing: 0; }
  .tb-secnav-list { list-style: none; margin: 6px 0 0; padding: 0; }
  .tb-secnav-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px; width: 100%; padding: 7px 2px; background: none; border: none; border-top: 1px solid var(--c-hairline);
    color: var(--c-text); font: inherit; font-size: 13.5px; line-height: 1.35; text-align: left; cursor: pointer; }
  .tb-secnav-list li:first-child .tb-secnav-row { border-top: none; }
  .tb-secnav-no { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--c-border); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: var(--c-muted); }
  .tb-secnav-no.done { background: var(--c-teal); border-color: var(--c-teal); color: #fff; }
  .tb-secnav-min { font-size: 12px; color: var(--c-faint); white-space: nowrap; }
  /* учебник внутри обучения: оглавление в стиле дизайн-системы */
  .tbl-continue { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer; padding: 14px 16px; margin: 0 0 12px; border-radius: 6px;
    background: var(--u); color: #fff; border: 1px solid color-mix(in srgb, var(--u) 70%, #000); border-bottom-width: 3px; font: inherit; }
  .tbl-continue small { display: block; font: 700 12px/1.2 var(--ds-sans); letter-spacing: .1em; text-transform: uppercase; opacity: .85; }
  .tbl-continue b { display: block; font: 700 18px/1.25 var(--ds-head); margin-top: 2px; }
  .tbl-stats { display: flex; gap: 6px 14px; flex-wrap: wrap; align-items: center; font-size: 13.5px; color: var(--ds-ink2); margin: 0 0 14px; }
  .tbl-stats b { color: var(--ds-ink); }
  .tbl-parts { display: grid; gap: 14px; }
  .tbl-part { background: var(--ds-card); border: 1px solid var(--ds-rule2); border-radius: 6px; padding: 10px 0 4px; }
  .tbl-part-title { font: 700 13px/1.2 var(--ds-sans); letter-spacing: .1em; text-transform: uppercase; color: var(--u-ink); margin: 0; padding: 0 14px 8px; }
  .tbl-ch { display: grid; grid-template-columns: 28px minmax(0, 1fr) 54px; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: none; border: none;
    border-top: 1px solid var(--ds-rule); color: var(--ds-ink); font: inherit; text-align: left; cursor: pointer; }
  .tbl-ch:hover { background: var(--ds-card2); }
  .tbl-ch[data-status="draft"] { color: var(--ds-ink3); }
  .tbl-no { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid var(--ds-rule2); display: inline-flex; align-items: center; justify-content: center; font: 700 12px/1 var(--ds-sans); color: var(--ds-ink2); }
  .tbl-no.done { background: var(--ds-ok); border-color: var(--ds-ok); color: #fff; }
  .tbl-ch-title { font: 600 15px/1.3 var(--ds-sans); }
  .tbl-ch-title small { font-weight: 500; color: var(--ds-ink3); }
  .tbl-level-text { font: 13px/1.4 var(--ds-sans); color: var(--ds-ink2); padding: 0 14px 6px; margin-top: -4px; }
  /* уровень выше нынешнего на Пути — под замком: главы видны, но приглушены, открывают объяснение */
  .tbl-part.locked .tbl-part-title { display: flex; align-items: center; gap: 6px; color: var(--ds-ink3); }
  .tbl-ch.locked { opacity: .62; }
  .tbl-ch.locked .tbl-no { color: var(--ds-ink3); }
  .tb-locked { text-align: center; padding: 34px 18px; max-width: 460px; margin: 0 auto; }
  .tb-locked-ico { width: 72px; height: 72px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: var(--ds-ink2);
    background: var(--ds-card2, rgba(127,127,127,.12)); border: 2px dashed var(--ds-rule2, rgba(127,127,127,.4)); }
  .tb-locked h2 { margin: 0 0 8px; font: 700 21px/1.25 var(--ds-head, serif); }
  .tb-locked p { margin: 0 0 16px; font: 15px/1.5 var(--ds-sans, sans-serif); color: var(--ds-ink2, inherit); }
  .tbl-planned { padding: 0; }
  .tbl-planned-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 12px 14px; background: none; border: none; cursor: pointer; font: 600 14px var(--ds-sans); color: var(--ds-ink2); }
  .tbl-planned-list { list-style: none; margin: 0; padding: 0 14px 12px; display: grid; gap: 8px; }
  .tbl-planned-list li { display: grid; gap: 2px; font: 13px/1.4 var(--ds-sans); color: var(--ds-ink3); }
  .tbl-planned-list b { color: var(--ds-ink2); font-weight: 600; }
  /* обложка главы */
  .tb-cover { --u-ink: color-mix(in srgb, var(--u) 72%, #000); }
  .ds-dark .tb-cover { --u-ink: color-mix(in srgb, var(--u) 40%, #fff); }
  .tb-cover { position: relative; overflow: hidden; margin: 2px 0 16px; border-radius: 18px; background: color-mix(in srgb, var(--u) 10%, var(--ds-card));
    border: 1.5px solid color-mix(in srgb, var(--u) 30%, var(--ds-rule2)); animation: tb-cover-in .45s cubic-bezier(.3,.8,.4,1) both; }
  .tb-cover-band { display: block; background: var(--u); }
  .tb-cover-in { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 14px 16px 12px; }
  .tb-cover-eyebrow { font: 700 12px/1.3 var(--ds-sans); letter-spacing: .12em; text-transform: uppercase; color: var(--u-ink); }
  .tb-cover-title { font: 700 24px/1.2 var(--ds-head); color: var(--ds-ink); margin: 4px 0 8px; letter-spacing: -.01em; }
  .tb-cover-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; }
  .tb-read-auto { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; font-weight: 700; font-size: 13px;
    color: var(--ds-ok-ink, #147A45); background: color-mix(in srgb, var(--ds-ok, #147A45) 12%, transparent); }
  .tb-cover-meta span { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; background: var(--ds-card); color: var(--ds-ink2); border: 1px solid var(--ds-rule); }
  .tb-cover-meta b { color: var(--ds-ink); }
  .tb-cover-meta .ok { color: var(--ds-ok-ink); border-color: color-mix(in srgb, var(--ds-ok) 40%, var(--ds-rule)); }
  .tb-cover-art { display: grid; place-items: center; width: 96px; height: 96px; border-radius: 50%; background: var(--ds-card); box-shadow: 0 0 0 4px color-mix(in srgb, var(--u) 18%, transparent); }
  .tb-cover-bar { height: 5px; background: color-mix(in srgb, var(--u) 15%, var(--ds-rule)); }
  .tb-cover-bar i { display: block; height: 100%; background: var(--u); animation: tb-bar 1s cubic-bezier(.3,.8,.4,1) both; transform-origin: 0 50%; }
  @keyframes tb-cover-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  @keyframes tb-bar { from { transform: scaleX(0) } }
  @media (max-width: 380px) { .tb-cover-art { width: 72px; height: 72px; } .tb-cover-art svg { width: 68px; height: 68px; } .tb-cover-title { font-size: 21px; } }
  @media (prefers-reduced-motion: reduce) { .tb-cover, .tb-cover-bar i { animation: none; } }
  .tbl-ch-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; margin-top: 3px; font: 13px/1.3 var(--ds-sans); color: var(--ds-ink2); }
  .tbl-ch-meta b { color: var(--ds-ink); font-weight: 700; }
  .tbl-ch-ring { position: relative; width: 42px; height: 42px; justify-self: end; }
  .tbl-ch-ring > svg { display: block; transform: rotate(-90deg); }
  .tbl-ch-ring circle { fill: none; stroke-width: 4; }
  .tbl-ch-ring .bg { stroke: var(--ds-rule); }
  .tbl-ch-ring .fg { stroke: var(--u); stroke-linecap: round; animation: tbl-ring .9s cubic-bezier(.3,.8,.4,1) both; }
  .tbl-ch-ring[data-full="true"] .fg { stroke: var(--ds-ok); }
  /* число — в кольце целиком: узкие цифры шрифта текста и маленький знак процента (моноширинное «100%» вылезало) */
  .tbl-ch-ring b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 700 12px/1 var(--ds-sans); font-variant-numeric: tabular-nums; letter-spacing: -.02em; color: var(--ds-ink); }
  .tbl-ch-ring small { font-size: 12px; font-weight: 400; color: var(--ds-ink3); }
  .tbl-ch-ring[data-full="true"] b { color: var(--ds-ok); }
  @keyframes tbl-ring { from { stroke-dashoffset: var(--len) } }
  @media (prefers-reduced-motion: reduce) { .tbl-ch-ring .fg { animation: none; } }
  .tbl-ch-bar { height: 5px; border-radius: 3px; background: var(--ds-rule); overflow: hidden; }
  .tbl-ch-bar i { display: block; height: 100%; background: var(--ds-ok); }
  .tbl-more { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  /* оглавление сбоку у главы (ПК): все главы по частям, открытая отмечена, под ним — разделы главы */
  .tb-toc-fold { display: inline-flex; align-items: center; gap: 4px; margin: 0 0 8px; padding: 4px 9px; font-size: 12px; }
  .tb-toc-rail { display: inline-flex; flex-direction: column; align-items: center; gap: 6px; width: 40px; padding: 10px 0; border-radius: 10px; font-size: 11px; writing-mode: vertical-rl; }
  .tb-toc-rail svg { writing-mode: horizontal-tb; }
  .tb-chtoc { border: 1px solid var(--c-border); background: var(--c-panel-alt); padding: 10px 12px 6px; margin: 0 0 12px; }
  .tb-chtoc-part { font-size: 12px; font-weight: 700; color: var(--c-muted); margin: 8px 0 2px; }
  .tb-chtoc-row { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 8px; width: 100%; padding: 5px 2px; background: none; border: none; color: var(--c-text); font: inherit; font-size: 13.5px; line-height: 1.3; text-align: left; cursor: pointer; border-radius: 4px; }
  .tb-chtoc-row:hover { background: var(--c-panel); }
  .tb-chtoc-row[aria-current="page"] { font-weight: 700; color: var(--u-ink, var(--c-gold-soft)); cursor: default; }
  .tb-chtoc-row[data-status="draft"] { color: var(--c-muted); }
  /* ПК (от 1024 px): учебник во весь экран — оглавление в две колонки, у главы слева закреплены
     оглавление и список разделов */
  @media (min-width: 1024px) {
    .ln-textbook.wide { max-width: 1240px !important; }
    .ln-textbook.wide .tbl-parts { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
    .ln-textbook.wide .tb-ch-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 36px; align-items: start; }
    /* учебник с увеличенным текстом масштабируется (zoom): высоту панели делим на масштаб, иначе она
       уходила за низ экрана и «В этой главе» нельзя было докрутить до конца */
    .ln-textbook.wide .tb-ch-aside { position: sticky; top: calc(64px / var(--tb-zoom, 1)); max-height: calc((100vh - 96px) / var(--tb-zoom, 1)); overflow: auto; overscroll-behavior: contain; }
    /* строка главы — не шире 75 знаков (docs/mechanics.md, «Учебник: чтение главы»; пункт владельца 13.11): колонка
       текста 33em при шрифте 18 px — в среднем 67 знаков, самая длинная строка — до 75. Раньше колонка была 860 px
       при 16 px — в среднем 109 знаков в строке, глаз терял начало следующей. Ширина в em: с размером текста (A− / A+) число знаков в строке не меняется */
    .ln-textbook.wide .tb-ch-main { max-width: 33em; }
    /* оглавление свёрнуто — узкая полоска с кнопкой, глава шире (пункт владельца 09.11) */
    .ln-textbook.wide .tb-ch-grid.folded { grid-template-columns: 44px minmax(0, 1fr); }
    /* «Повторение» на ПК — колонкой посередине, как глава (пункт владельца 15.11: «повторение в учебнике съехало вправо»):
       на строке во всю ширину метка «была ошибка», флажок и «Убрать из повторения» уезжали к правому краю экрана */
    .ln-textbook.wide [data-testid="review-page"] { max-width: 860px; margin: 0 auto; }
    .ln-textbook.wide .tb-ch-grid.folded .tb-ch-main { max-width: 33em; margin: 0 auto; width: 100%; }
    .ln-textbook.wide .tb-body { font-size: 16px; }
    .ln-textbook.wide .tb-ch-main.tb-body { font-size: 18px; }
  }
  /* ОГЛАВЛЕНИЕ КАК В КНИГЕ (пункт владельца 19.11, п. 3: «мне теперь ещё больше не нравится оглавление» — карточки 18.11
     читались как плитка приложений). Одна колонка для чтения: заголовок «Оглавление» антиквой и строка итогов; закладка
     «Продолжить чтение»; уровни — части книги («Уровень 2 · Базовый» и пояснение курсивом); главы — строками: номер антиквой
     в цвете юнита, название, отточие до счётчика разделов справа, под названием — разделы и задачи, у начатой — тонкая
     полоска прогресса. Ни коробок, ни теней: тонкие линии между строками, как в оглавлении книги. */
  .tbl { max-width: 760px; margin: 0 auto; }
  .tbl-head { margin: 4px 0 14px; }
  .tbl-head h2 { margin: 0; font: 700 clamp(28px, 4.2vw, 38px)/1.1 var(--ds-head); letter-spacing: -.01em; }
  .tbl-head .tbl-stats { margin: 8px 0 0; }
  .tbl-continue { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 14px 18px 14px 26px; margin: 0 0 22px;
    border-radius: 14px; background: var(--ds-card); color: var(--ds-ink); border: 1px solid var(--ds-rule2); border-bottom-width: 1px; box-shadow: 0 10px 26px -20px rgba(0,0,0,.45); }
  .tbl-continue::before { content: ''; position: absolute; left: 12px; top: -1px; width: 8px; height: 30px; background: var(--u); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
  .tbl-continue small { color: var(--u-ink); opacity: 1; }
  .tbl-continue b { font-size: 19px; }
  .tbl-continue:hover { border-color: color-mix(in srgb, var(--u) 45%, var(--ds-rule2)); }
  .tbl-parts { gap: 30px; }
  .tbl-part { background: none; border: 0; padding: 0; }
  .tbl-part-title { padding: 0 0 2px; margin: 0; font: 700 22px/1.2 var(--ds-head); letter-spacing: 0; text-transform: none; color: var(--ds-ink); }
  .tbl-part-k { display: block; font: 800 12px/1.3 var(--ds-sans); letter-spacing: .16em; text-transform: uppercase; color: var(--u-ink); margin-bottom: 2px; }
  .tbl-part.locked .tbl-part-title { color: var(--ds-ink3); }
  .tbl-sep { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .tbl-level-text { padding: 0 0 8px; margin: 2px 0 0; font: italic 400 14.5px/1.45 var(--ds-head); color: var(--ds-ink2); }
  .tbl-chs { display: block; border-top: 1px solid var(--ds-rule2); }
  .tbl-chs .tbl-ch { grid-template-columns: 34px minmax(0, 1fr); align-items: start; gap: 12px; padding: 13px 4px 12px; border-top: 0; border-bottom: 1px solid var(--ds-rule); border-radius: 0; background: none; }
  .tbl-chs .tbl-ch:hover { background: color-mix(in srgb, var(--u, var(--ds-ink)) 5%, transparent); }
  .tbl-chs .tbl-no { width: auto; height: auto; border: 0; border-radius: 0; justify-content: flex-start; font: 700 22px/1.1 var(--ds-head); color: var(--u, var(--ds-ink2)); font-variant-numeric: lining-nums tabular-nums; }
  .tbl-chs .tbl-no.done { background: none; color: var(--ds-ok); }
  /* в тёмной теме цвет юнита у номера — светлее: тёмные цвета юнитов на тёмном фоне не читались */
  .ds-dark .tbl-chs .tbl-no:not(.done) { color: color-mix(in srgb, var(--u, var(--ds-ink2)) 55%, #fff); }
  .tbl-ch-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .tbl-chs .tbl-ch-title { font: 600 17px/1.3 var(--ds-head); min-width: 0; }
  .tbl-chs .tbl-ch:hover .tbl-ch-title { text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--u, var(--ds-ink)) 60%, transparent); text-underline-offset: 3px; }
  .tbl-dots { flex: 1; min-width: 18px; border-bottom: 1.5px dotted color-mix(in srgb, var(--ds-ink) 30%, transparent); transform: translateY(-4px); }
  .tbl-ch-state { flex: none; font: 700 13px/1 var(--ds-mono, monospace); color: var(--ds-ink2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tbl-ch-state.done { color: var(--ds-ok); display: inline-flex; align-items: center; gap: 4px; }
  .tbl-chs .tbl-ch-meta { margin-top: 4px; font-size: 13px; color: var(--ds-ink3); }
  .tbl-ch-prog { display: block; height: 3px; margin-top: 8px; border-radius: 2px; background: var(--ds-rule); overflow: hidden; max-width: 260px; }
  .tbl-ch-prog i { display: block; height: 100%; background: var(--u, var(--ds-ok)); border-radius: 2px; }
  .tbl-chs .tbl-ch.locked .tbl-no { font-size: 16px; padding-top: 3px; color: var(--ds-ink3); }
  .tbl-part:not(.locked) .tbl-ch.locked { opacity: .62; }
  @media (max-width: 520px) { .tbl-chs .tbl-ch { grid-template-columns: 28px minmax(0, 1fr); gap: 10px; } .tbl-chs .tbl-no { font-size: 19px; } .tbl-chs .tbl-ch-title { font-size: 16px; } .tbl-dots { display: none; } .tbl-ch-line { justify-content: space-between; } }
  @media (min-width: 1024px) { .ln-textbook.wide .tbl-parts { grid-template-columns: 1fr; } }
  /* Глава на ПК: обложка тоньше, шрифт и музыка — в её строке справа (не отдельной строкой над ней), колонка текста —
     посередине свободного места, оглавление легче: без коробки, у открытой главы — её разделы прямо под ней */
  @media (min-width: 1024px) {
    .ln-textbook.wide .tb-reader-bar[data-page="chapter"] { position: relative; z-index: 3; margin: 0 18px -60px auto !important; width: max-content; top: 30px; }
    .ln-textbook.wide .tb-cover-in { padding: 10px 250px 10px 18px; grid-template-columns: auto minmax(0, 1fr); }
    .ln-textbook.wide .tb-cover-art { order: -1; width: 64px; height: 64px; }
    .ln-textbook.wide .tb-cover-art svg { width: 60px; height: 60px; }
    .ln-textbook.wide .tb-cover-title { font-size: 22px; margin: 2px 0 6px; }
    .ln-textbook.wide .tb-cover { margin-bottom: 12px; }
    .ln-textbook.wide .tb-ch-grid { grid-template-columns: 250px minmax(0, 1fr); gap: 28px; }
    .ln-textbook.wide .tb-ch-main { margin: 0 auto; width: 100%; }
    .ln-textbook.wide .tb-chtoc { border: 0; background: none; padding: 0 0 0 2px; }
    .ln-textbook.wide .tb-chtoc .tb-secnav-head { font-weight: 800; letter-spacing: .12em; }
    .ln-textbook.wide .tb-chtoc-part { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ds-ink3, var(--c-muted)); margin: 14px 0 4px; }
    .ln-textbook.wide .tb-chtoc-row { padding: 6px 8px 6px 4px; border-radius: 10px; position: relative; }
    .ln-textbook.wide .tb-chtoc-row:hover { background: color-mix(in srgb, var(--u, var(--c-gold)) 8%, transparent); }
    .ln-textbook.wide .tb-chtoc-row[aria-current="page"] { background: color-mix(in srgb, var(--u, var(--c-gold)) 13%, transparent); }
    .ln-textbook.wide .tb-chtoc-row[aria-current="page"]::before { content: ''; position: absolute; left: -2px; top: 6px; bottom: 6px; width: 3px; border-radius: 2px; background: var(--u, var(--c-gold)); }
    .ln-textbook.wide .tb-chtoc-secs { margin: 2px 0 8px 14px; padding-left: 12px; border-left: 1px solid var(--ds-rule2, var(--c-border)); }
    .ln-textbook.wide .tb-chtoc-secs .tb-secnav { border: 0; background: none; padding: 0; margin: 0; }
    .ln-textbook.wide .tb-chtoc-secs .tb-secnav-head { display: none; }
    .ln-textbook.wide .tb-chtoc-secs .tb-secnav-row { padding: 5px 2px; font-size: 13px; border-top: 0; }
    .ln-textbook.wide .tb-chtoc-secs .tb-secnav-no { width: 18px; height: 18px; font-size: 11px; }
  }
  /* Телефон и планшет: «В этой главе» — лентой разделов, которую листают вбок (а не столбиком на пол-экрана), обложка
     ниже и плотнее: текст главы начинается на первом экране */
  @media (max-width: 1023px) {
    .tb-cover-in { padding: 10px 12px 9px; }
    .tb-cover-art { width: 64px; height: 64px; } .tb-cover-art svg { width: 60px; height: 60px; }
    .tb-cover-title { font-size: 21px; margin: 2px 0 6px; }
    .tb-cover { margin-bottom: 10px; }
    .tb-reader-bar[data-page="chapter"] { margin-bottom: 8px !important; }
    .tb-ch-aside .tb-secnav { padding: 8px 0 4px; margin: 0 0 12px; border-left: 0; border-right: 0; border-radius: 0; background: none; }
    .tb-ch-aside .tb-secnav-head { padding: 0 2px; margin-bottom: 2px; }
    .tb-ch-aside .tb-secnav-list { display: flex; gap: 6px; overflow-x: auto; scroll-snap-type: x proximity; padding: 4px 2px 8px; margin: 4px 0 0; scrollbar-width: none; }
    .tb-ch-aside .tb-secnav-list::-webkit-scrollbar { display: none; }
    .tb-ch-aside .tb-secnav-list li { flex: none; scroll-snap-align: start; }
    .tb-ch-aside .tb-secnav-row { display: inline-flex; width: auto; gap: 6px; padding: 7px 12px 7px 7px; border: 1px solid var(--c-border); border-radius: 999px; background: var(--c-panel); white-space: nowrap; font-size: 13.5px; }
    .tb-ch-aside .tb-secnav-list li:first-child .tb-secnav-row { border-top: 1px solid var(--c-border); }
    .tb-ch-aside .tb-secnav-min { font-size: 12px; }
  }
`;

export const PLAY_CSS = `
  /* график мини-игры — сцена «Разбора графика» (src/graph-stage.jsx); на телефоне не выше трети экрана */
  .lp-game-graph { position: relative; }
  .lp-game-graph svg { display: block; width: 100%; height: auto; max-width: 520px; max-height: 36vh; margin: 0 auto; overflow: visible; }
  .lp-game-graph svg text { font-family: var(--ds-sans); }
  .lp-chart { width: 100%; max-width: 380px; display: block; margin: 6px auto 10px; touch-action: none; user-select: none; -webkit-user-select: none; }
  .lp-chart text { font: 700 12px var(--ds-mono); fill: var(--ds-ink2); }
  .lp-chart .lp-axis { font: 700 10.5px var(--ds-sans); letter-spacing: .03em; fill: var(--ds-ink3); paint-order: stroke; stroke: var(--ds-card); stroke-width: 3px; }
  .lp-chart .lp-eqv { font: 700 11px var(--ds-mono); fill: var(--ds-ink); paint-order: stroke; stroke: var(--ds-card); stroke-width: 3.5px; }
  .lp-chart .lp-tag text { font: 800 11.5px var(--ds-sans); }
  .lp-chart .lp-arrow { animation: lp-arrow-in .45s cubic-bezier(.3, 1.4, .5, 1) backwards; }
  @keyframes lp-arrow-in { from { opacity: 0; transform: translateX(-6px); } }
  .lp-chart .lp-eq-glow { animation: lp-eq-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes lp-eq-pulse { 50% { transform: scale(1.35); opacity: .08; } }
  .lp-chart .lp-curve { filter: drop-shadow(0 2px 3px color-mix(in srgb, currentColor 20%, transparent)); }
  @media (prefers-reduced-motion: reduce) { .lp-chart .lp-arrow, .lp-chart .lp-eq-glow { animation: none; } }
  .lp-hit { cursor: grab; }
  .lp-hit:active { cursor: grabbing; }
  .lp-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 6px 0; }
  .lp-readout { text-align: center; font-size: 15px; margin: 4px 0 10px; min-height: 22px; }
  .lp-readout b { font-family: var(--ds-mono); }
  /* спрос и предложение в подписи — оттенки линий графика, но с контрастом не ниже 4,5:1 в обеих темах */
  .lp-dem { color: #345E92; } .lp-sup { color: #9A4A1C; }
  .ds-dark .lp-dem { color: #8FB3E0; } .ds-dark .lp-sup { color: #E39A6B; }
  .lp-range { width: 100%; accent-color: var(--u); height: 32px; }
  .lp-tiles { min-height: 64px; border: 1px dashed var(--ds-rule2); border-radius: 4px; padding: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; background: var(--ds-card2); }
  .lp-tile { font: 15px/1.2 var(--ds-head); padding: 9px 12px; border-radius: 2px; border: 1px solid var(--ds-rule2); border-bottom-width: 2px; background: var(--ds-card); color: var(--ds-ink); cursor: pointer; }
  .lp-tile:active:not(:disabled) { transform: translateY(1px); }
  .lp-timer { height: 8px; border-radius: 1px; background: var(--ds-card2); border: 1px solid var(--ds-rule2); overflow: hidden; margin: 4px 0 12px; }
  .lp-timer > span { display: block; height: 100%; background: var(--u); transition: width .1s linear; }
  .lp-timer.low > span { background: var(--ds-bad); }
  .lp-card { position: relative; min-height: 150px; border-radius: 6px; border: 1px solid var(--ds-rule2); background: var(--ds-card);
    box-shadow: inset 0 0 0 3px var(--ds-card), inset 0 0 0 4px var(--ds-rule), 0 2px 4px var(--ds-shade);
    display: flex; align-items: center; justify-content: center; text-align: center; padding: 22px 18px; font: 700 20px/1.3 var(--ds-head); margin: 10px 0 14px; touch-action: pan-y; user-select: none; }
  .lp-card.ok { border-color: var(--ds-ok); box-shadow: inset 0 0 0 3px var(--ds-card), inset 0 0 0 4px var(--ds-ok); }
  .lp-card.bad { border-color: var(--ds-bad); box-shadow: inset 0 0 0 3px var(--ds-card), inset 0 0 0 4px var(--ds-bad); }
  .lp-score { display: flex; justify-content: space-between; font: 700 13px var(--ds-mono); color: var(--ds-ink2); }
  /* «Слова» — колода: сверху карточка слова, под ней край ещё не открытых. Значение сначала
     закрыто: вспомнить — открыть — честно отметить «Знаю» или «Ещё раз». */
  .lp-deck { position: relative; margin: 6px 0 14px; padding-bottom: 14px; }
  .lp-deck-ghost { position: absolute; left: 12px; right: 12px; height: 40px; bottom: 6px; border: 1px solid var(--ds-rule2); border-radius: 6px; background: var(--ds-card2); }
  .lp-deck-ghost.g2 { left: 24px; right: 24px; bottom: 0; opacity: .7; }
  .lp-word { position: relative; z-index: 1; border: 1px solid var(--ds-rule2); border-radius: 6px; background: var(--ds-card); box-shadow: 0 3px 10px var(--ds-shade);
    padding: 18px 18px 20px; min-height: 250px; display: flex; flex-direction: column; touch-action: pan-y; user-select: none;
    transition: transform .26s ease-in, opacity .26s ease-in; border-top: 5px solid var(--u); transform-origin: 50% 100%; }
  /* уходящая карточка — поверх колоды: плавно уезжает в сторону и гаснет (смахнули, «Дальше» или «Назад») */
  .lp-word-out { position: absolute; left: 0; right: 0; top: 0; z-index: 2; pointer-events: none; animation: lp-word-out .32s cubic-bezier(.25, .6, .35, 1) forwards; }
  @keyframes lp-word-out { from { transform: translateX(var(--x0, 0px)) rotate(var(--r0, 0deg)); opacity: 1 }
    to { transform: translateX(calc(var(--x0, 0px) + var(--dir) * 70%)) rotate(calc(var(--dir) * 4deg)); opacity: 0 } }
  /* появление — только «до» (backwards): после него карточкой двигает палец или мышь, а не анимация */
  .lp-word.in { animation: lp-word-in .3s ease-out backwards; }
  @keyframes lp-word-in { from { transform: translateX(var(--from, 0)) translateY(var(--rise, 14px)) scale(.97); opacity: 0 } to { transform: none; opacity: 1 } }
  .lp-word.drag { cursor: grabbing; box-shadow: 0 10px 24px var(--ds-shade); }
  .lp-swipe-tag { position: absolute; top: 46px; padding: 3px 10px; border: 2px solid var(--u); border-radius: 4px; font: 700 14px var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--u-ink); background: var(--ds-card); pointer-events: none; }
  .lp-swipe-tag.next { right: 14px; transform: rotate(8deg); }
  .lp-swipe-tag.prev { left: 14px; transform: rotate(-8deg); }
  .lp-word-top { display: flex; align-items: center; gap: 8px; font: 700 12px var(--ds-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--ds-ink3); }
  .lp-word-term { font: 700 30px/1.15 var(--ds-head); color: var(--u-ink); margin: 18px 0 6px; text-align: center; }
  .lp-word-rule { width: 56px; height: 2px; background: var(--u); opacity: .5; margin: 0 auto 16px; border-radius: 1px; }
  .lp-word-def { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 18.5px; line-height: 1.45; }
  .lp-word-def.open { animation: lp-def .35s ease-out both; }
  .lp-word-ex { display: block; margin-top: 12px; font-size: 15px; line-height: 1.4; color: var(--ds-ink2); }
  @keyframes lp-def { from { opacity: 0; transform: translateY(6px); filter: blur(3px) } to { opacity: 1; transform: none; filter: none } }
  .lp-word-tip { margin-top: 14px; font-size: 13.5px; line-height: 1.4; color: var(--ds-ink3); text-align: center; }
  .lp-word-hint .fine { display: none; }
  @media (hover: hover) and (pointer: fine) { .lp-word-hint .fine { display: inline; } .lp-word-hint .touch { display: none; } .lp-word { cursor: grab; } }
  .lp-word-dots { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; }
  .lp-word-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--ds-rule); }
  .lp-word-dots i.know { background: var(--u); }
  .lp-word-dots i.cur { box-shadow: 0 0 0 2px var(--ds-paper), 0 0 0 3.5px var(--u); }
  .lp-word-dots i.done { animation: lp-dot-done .45s cubic-bezier(.3, 1.6, .5, 1) backwards; }
  @keyframes lp-dot-done { from { transform: scale(.3); } }
  .lp-word-end { align-items: center; text-align: center; }
  .lp-word-end-mark { width: 54px; height: 54px; margin: 16px auto 0; border-radius: 50%; display: grid; place-items: center; font: 700 28px var(--ds-sans); color: #fff; background: var(--u);
    animation: lp-end-pop .55s cubic-bezier(.3, 1.7, .5, 1) .12s backwards; }
  @keyframes lp-end-pop { from { transform: scale(0) rotate(-30deg); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .lp-word-end-mark, .lp-word-dots i.done { animation: none; } }
  .lp-calc { max-width: 340px; margin: 0 auto; }
  .lp-calc-screen { display: flex; align-items: baseline; gap: 8px; border: 1px solid var(--ds-rule2); border-radius: 3px; background: var(--ds-card2); padding: 6px 10px; margin-bottom: 6px; min-height: 42px; }
  .lp-calc-expr { flex: 1; min-width: 0; font-size: 16px; color: var(--ds-ink2); overflow-wrap: anywhere; }
  .lp-calc-val { font-size: 21px; font-weight: 700; white-space: nowrap; }
  .lp-calc-keys { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .lp-calc-keys .ds-key { padding: 9px 0; font-size: 18px; }
  .lp-calc-use { grid-column: span 3; min-height: 0; padding: 8px 6px; }
  .lp-op { color: var(--u-ink); font-weight: 700; }
  .lp-game-rules { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; font-size: 13.5px; margin-top: 4px; }
  .lp-game-rules span { display: inline-flex; align-items: center; gap: 4px; }
  /* «Как играть» перед стартом: три шага и пробный заголовок без таймера */
  .lp-howto { border: 1px solid var(--ds-rule2); border-radius: 6px; background: var(--ds-card); padding: 12px 14px; margin: 10px 0; }
  .lp-howto ol { margin: 6px 0 0; padding-left: 20px; font-size: 14.5px; line-height: 1.45; }
  .lp-howto li { margin: 3px 0; }
  .lp-trial { border: 1.5px dashed var(--ds-rule2); border-radius: 6px; padding: 10px 12px; margin: 10px 0; }
  .lp-trial-card { font: 700 17px/1.35 var(--ds-head); text-align: center; margin: 6px 0 10px; }
  .lp-game-hud { display: flex; align-items: center; gap: 8px; margin: -4px 0 2px; }
  .lp-game-score { font-size: 26px; font-weight: 700; color: var(--u-ink); min-width: 48px; }
  .lp-combo { font: 700 14px var(--ds-mono); color: #fff; background: var(--u); border-radius: 999px; padding: 2px 9px; animation: lp-combo .35s ease-out; }
  @keyframes lp-combo { 0% { transform: scale(.4); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
  .lp-game-stage { position: relative; }
  .lp-game .lp-chart { margin: 0 auto 2px; max-width: 340px; }
  /* что сдвинулось — строкой под графиком, а не поверх него: не закрывает цены и подписи */
  .lp-effect-row { min-height: 26px; display: flex; justify-content: center; align-items: center; }
  .lp-effect { font: 700 13px var(--ds-sans); background: var(--ds-card); border: 1.5px solid var(--u); color: var(--u-ink); border-radius: 3px; padding: 3px 8px;
    animation: lp-effect 1.6s ease-out forwards; pointer-events: none; }
  @keyframes lp-effect { 0% { opacity: 0; transform: translateY(6px); } 12% { opacity: 1; transform: none; } 75% { opacity: 1; } 100% { opacity: 0; } }
  .lp-game-card { min-height: 104px; margin: 8px 0 10px; font-size: 19px; }
  .lp-game-final { flex-direction: column; gap: 2px; min-height: 0; margin-top: 8px; }
  .lp-pass { display: inline-flex; align-items: center; gap: 3px; font: 700 13px var(--ds-sans); padding: 2px 8px; border-radius: 10px; border: 1px dashed var(--ds-rule2); color: var(--ds-ink2); }
  .lp-pass.ok { border-style: solid; border-color: var(--ds-ok); color: var(--ds-ok); background: color-mix(in srgb, var(--ds-ok) 10%, transparent); }
  /* «Сбереги кошелёк» */
  .lw-years { display: flex; gap: 6px; justify-content: center; margin: 0 0 8px; }
  .lw-years i { width: 30px; height: 7px; border-radius: 99px; background: var(--ds-rule); transition: background .3s; }
  .lw-years i.now { background: var(--u); }
  .lw-years i.ok { background: var(--ds-ok); }
  .lw-years i.bad { background: var(--ds-bad); }
  .lw-purse { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .lw-purse > div { border: 1px solid var(--ds-rule2); border-radius: 10px; background: var(--ds-card); padding: 6px 4px 5px; text-align: center; transition: border-color .3s, background .3s; }
  .lw-purse > div.hot { border-color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 7%, var(--ds-card)); }
  .lw-purse small { display: block; font: 600 12px var(--ds-sans); color: var(--ds-ink3); }
  .lw-purse b { display: block; font: 700 21px/1.15 var(--ds-mono); color: var(--ds-ink); }
  .lw-cups-wrap { position: relative; max-width: 320px; margin: 8px auto 2px; }
  .lw-cups { display: block; width: 100%; }
  .lw-cup { transition: opacity .35s; }
  .lw-cup .b { fill: var(--u); transition: fill .35s; }
  .lw-cup .h { fill: none; stroke: var(--u); stroke-width: 1.3; stroke-linecap: round; transition: stroke .35s; }
  .lw-cup.off .b { fill: var(--ds-rule2); }
  .lw-cup.off .h { stroke: var(--ds-rule2); }
  .lw-cup.off { opacity: .55; }
  .lw-more { position: absolute; right: -4px; top: -10px; font: 700 12px var(--ds-mono); color: #fff; background: var(--ds-ok); border-radius: 999px; padding: 1px 7px; }
  .lw-paper { border: 1px solid var(--ds-rule2); background: var(--ds-card); padding: 8px 12px 10px; margin: 10px 0 4px; box-shadow: 0 2px 0 var(--ds-shade); animation: lw-paper .35s ease-out both; }
  @keyframes lw-paper { from { opacity: 0; transform: translateY(8px) rotate(-.6deg); } to { opacity: 1; transform: none; } }
  .lw-mast { font: 700 12px var(--ds-news); letter-spacing: .2em; text-transform: uppercase; border-bottom: 3px double var(--ds-ink2); padding-bottom: 4px; margin-bottom: 6px; color: var(--ds-ink2); text-align: center; }
  .lw-head { font: 700 18px/1.28 var(--ds-news); text-align: center; }
  .lw-fore { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 7px; font: 700 14.5px var(--ds-sans); color: var(--ds-bad); text-align: center; }
  .lw-scale { display: block; max-width: 380px; margin: 2px auto 0; overflow: visible; }
  .lw-scale .lw-band { fill: color-mix(in srgb, var(--ds-bad) 30%, transparent); stroke: var(--ds-bad); stroke-width: 1; }
  .lw-tick { font: 600 12px var(--ds-mono); fill: var(--ds-ink3); }
  .lw-rate { fill: #3E6FA8; }
  .lw-rate-t { font: 700 12px var(--ds-sans); fill: #345E92; }
  .ds-dark .lw-rate-t { fill: #8FB3E0; }
  .lw-pi line { stroke: var(--ds-ink); }
  .lw-pi text { font: 700 12px var(--ds-sans); fill: var(--ds-ink); }
  .lw-opts { display: grid; gap: 7px; margin-top: 10px; }
  .lw-opt { display: flex; align-items: center; gap: 11px; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--ds-rule2); border-bottom-width: 3px;
    background: var(--ds-card); cursor: pointer; color: var(--ds-ink); transition: transform .12s, border-color .15s; animation: lw-opt .3s ease-out both; }
  .lw-opt:nth-child(2) { animation-delay: .05s; } .lw-opt:nth-child(3) { animation-delay: .1s; }
  @keyframes lw-opt { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .lw-opt:hover { border-color: var(--u); }
  .lw-opt:active { transform: scale(.98); }
  .lw-opt:focus-visible { outline: 3px solid var(--u); outline-offset: 2px; }
  .lw-opt .ic { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--ds-card2); color: var(--u-ink); flex-shrink: 0; }
  .lw-opt b { display: block; font: 700 15.5px var(--ds-sans); }
  .lw-opt .h { display: block; font-size: 13.5px; line-height: 1.3; color: var(--ds-ink3); margin-top: 1px; }
  .lw-verdict { margin-top: 10px; border-radius: 12px; padding: 10px 12px 12px; border: 1.5px solid; animation: lw-paper .3s ease-out both; }
  .lw-verdict.ok { border-color: color-mix(in srgb, var(--ds-ok) 55%, transparent); background: var(--ds-ok-bg); }
  .lw-verdict.bad { border-color: color-mix(in srgb, var(--ds-sel-rule) 70%, transparent); background: color-mix(in srgb, var(--ds-sel-rule) 10%, var(--ds-card)); }
  .lw-verdict-head { display: flex; align-items: center; gap: 6px; font: 700 16px var(--ds-head); }
  .lw-verdict.ok .lw-verdict-head { color: var(--ds-ok-ink); }
  .lw-verdict.bad .lw-verdict-head { color: var(--ds-sel-ink); }
  .lw-verdict-text { font-size: 14.5px; line-height: 1.45; margin: 4px 0 8px; color: var(--ds-ink2); }
  .lw-bars { display: grid; gap: 5px; }
  .lw-bar-row { display: grid; grid-template-columns: 6.2em 1fr 4.2em; align-items: center; gap: 8px; font-size: 13.5px; }
  .lw-bar-name { display: inline-flex; align-items: center; gap: 3px; color: var(--ds-ink2); }
  .lw-bar-row.best .lw-bar-name { color: var(--ds-ok-ink); font-weight: 700; }
  .lw-bar-row.picked .lw-bar-name { text-decoration: underline; text-underline-offset: 3px; }
  .lw-bar-track { position: relative; height: 12px; border-radius: 99px; background: var(--ds-card2); }
  .lw-bar-track::before { content: ''; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1.5px; background: var(--ds-ink3); }
  .lw-bar-track i { position: absolute; top: 0; bottom: 0; border-radius: 99px; animation: lw-bar .6s ease-out both; }
  .lw-bar-track i.up { background: var(--ds-ok); }
  .lw-bar-track i.down { background: var(--ds-bad); }
  @keyframes lw-bar { from { clip-path: inset(0 50% 0 50%); } to { clip-path: inset(0 0 0 0); } }
  .lw-bar-row b { font: 700 13.5px var(--ds-mono); text-align: right; }
  .lw-final { align-items: stretch !important; text-align: center; }
  .lw-final-num { font-size: 16px; }
  .lw-final-num b { font-size: 38px; color: var(--u-ink); }
  .lw-path { display: block; max-width: 380px; margin: 4px auto 0; }
  .lw-path-100 { stroke: var(--ds-rule2); stroke-dasharray: 4 4; }
  .lw-path-cash { fill: none; stroke: var(--ds-ink3); stroke-width: 2; stroke-dasharray: 5 4; }
  .lw-path-best { fill: none; stroke: var(--ds-ok); stroke-width: 2; stroke-dasharray: 2 3; }
  .lw-path-mine { fill: none; stroke: var(--u); stroke-width: 3.2; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 600; stroke-dashoffset: 600; animation: lm-draw 1.2s ease-out forwards; }
  @keyframes lm-draw { to { stroke-dashoffset: 0; } }
  .lw-path-dot { fill: var(--u); stroke: var(--ds-card); stroke-width: 1.5; }
  .lw-legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; margin: 2px 0 4px; }
  .lw-legend span::before { content: ''; display: inline-block; width: 14px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
  .lw-legend .mine::before { background: var(--u); }
  .lw-legend .best::before { background: var(--ds-ok); }
  .lw-legend .cash::before { background: var(--ds-ink3); }
  @media (prefers-reduced-motion: reduce) { .lw-paper, .lw-opt, .lw-verdict, .lw-bar-track i, .lw-path-mine { animation: none !important; stroke-dashoffset: 0; } }
  .lp-verdict { margin-top: 6px; font: 700 14.5px var(--ds-sans); color: var(--ds-bad); text-align: center; }
  .lp-verdict.ok { color: var(--ds-ok); }
  .lp-side { margin: 0; text-align: center; font-weight: 700; min-height: 52px; }
  .lp-pop { position: absolute; left: 50%; top: 0; z-index: 2; font-size: 20px; font-weight: 700; color: var(--ds-ok); animation: lp-pop .7s ease-out forwards; pointer-events: none; }
  @keyframes lp-pop { 0% { opacity: 0; transform: translate(-50%, 10px) scale(.8); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -26px) scale(1.15); } }
  .lp-ticker { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; max-width: 340px; margin: 0 auto; }
  .lp-ticker svg { width: 100%; height: 30px; display: block; }
  .lp-bubble { position: relative; background: var(--ds-card); border: 1px solid var(--ds-rule2); border-radius: 4px; padding: 14px 16px; font-size: 17.5px; line-height: 1.5; margin-top: 12px; }
  @media (prefers-reduced-motion: reduce) { .lp-word, .lp-timer > span { transition: none !important; } .lp-word.in, .lp-word-def.open { animation: none !important; } .lp-word-out { display: none; } .lp-combo, .lp-effect, .lp-pop { animation: none !important; } }
`;

export const MODEL_CSS = `
  .lm-street { width: 100%; display: block; margin: 4px 0 8px; border: 1px solid var(--ds-rule2); border-radius: 4px; background: var(--ds-card); }
  .lm-street text { font-family: var(--ds-head); }
  .lm-chart { width: 100%; max-width: 380px; display: block; margin: 4px auto 6px; }
  .lm-chart text { font: 700 12px var(--ds-mono); fill: var(--ds-ink2); }
  .lm-chart .lm-ax { font: 600 12px var(--ds-sans); fill: var(--ds-ink3); }
  .lm-range { width: 100%; accent-color: var(--u); height: 30px; }
  .lm-read { font-size: 15px; text-align: center; min-height: 22px; margin: 2px 0 6px; }
  .lm-read b { font-family: var(--ds-mono); }
  .lm-days { display: flex; flex-wrap: wrap; gap: 4px 10px; justify-content: center; font: 12.5px var(--ds-mono); color: var(--ds-ink2); margin: 2px 0 6px; }
  .lm-say { display: flex; gap: 10px; align-items: center; border: 1px solid var(--u); border-radius: 6px; background: color-mix(in srgb, var(--u) 7%, var(--ds-card)); padding: 10px 12px; margin: 8px 0; font-size: 15.5px; line-height: 1.4; }
  .lm-line { stroke-dasharray: 420; stroke-dashoffset: 420; animation: lm-draw 1.1s ease-out forwards; }
  @keyframes lm-draw { to { stroke-dashoffset: 0; } }
  /* живая модель */
  .lm { position: relative; }
  .lm-head { display: flex; align-items: flex-start; gap: 10px; }
  .lm-title { font: 700 19px/1.25 var(--ds-head); margin-top: 2px; }
  .lm-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 3px 9px 3px 7px; border-radius: 999px; font: 700 12.5px var(--ds-sans);
    color: var(--ds-ok-ink); background: var(--ds-ok-bg); border: 1px solid color-mix(in srgb, var(--ds-ok) 45%, transparent); }
  .lm-ring { position: relative; width: 50px; height: 50px; flex-shrink: 0; }
  .lm-ring svg { transform: rotate(-90deg); display: block; }
  .lm-ring circle { fill: none; stroke-width: 3.5; }
  .lm-ring .bg { stroke: var(--ds-rule); }
  .lm-ring .fg { stroke: var(--u); stroke-linecap: round; transition: stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1); }
  .lm-ring b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 700 14px var(--ds-mono); color: var(--u-ink); letter-spacing: -.06em; }
  .lm-ring small { font-size: 12px; color: var(--ds-ink3); font-weight: 600; }
  .lm-stage { margin: 10px 0 2px; border-radius: 10px; background: color-mix(in srgb, var(--ds-card2) 55%, var(--ds-card)); border: 1px solid var(--ds-rule); padding: 4px 4px 0; }
  .lm-stage .lm-chart { max-width: 420px; margin: 0 auto; }
  .lm-guide { fill: none; stroke: var(--ds-ink3); stroke-width: 1.2; stroke-dasharray: 3 4; opacity: .8; }
  .lm-curve-name { font: 700 14px var(--ds-head) !important; }
  .lm-tag rect { fill: var(--ds-ink); }
  .lm-tag text { font: 700 11px var(--ds-mono) !important; fill: var(--ds-paper) !important; }
  .lm-short { font: 700 11.5px var(--ds-sans) !important; fill: var(--ds-bad) !important; }
  .lm-pulse { opacity: .16; transform-box: fill-box; transform-origin: center; animation: lm-pulse 2.2s ease-in-out infinite; }
  @keyframes lm-pulse { 0%, 100% { transform: scale(.7); opacity: .22; } 50% { transform: scale(1.15); opacity: .08; } }
  .lm-board { display: grid; gap: 6px; text-align: center; margin: 8px 0 6px; }
  .lm-board > div { border: 1px solid var(--ds-rule2); border-radius: 8px; padding: 6px 4px 7px; background: var(--ds-card); display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .lm-board-label { font: 600 12px var(--ds-sans); color: var(--ds-ink3); }
  .lm-board b { font: 700 21px/1.15 var(--ds-mono); color: var(--ds-ink); }
  .lm-board .bad b { color: var(--ds-bad); }
  .lm-delta { font: 700 12px var(--ds-mono); border-radius: 999px; padding: 1px 6px; }
  .lm-delta.up { color: var(--ds-ok-ink); background: var(--ds-ok-bg); }
  .lm-delta.down { color: var(--ds-bad); background: color-mix(in srgb, var(--ds-bad) 10%, var(--ds-card)); }
  .lm-story { font-size: 15px; line-height: 1.45; padding: 9px 12px; border-radius: 8px; background: var(--ds-card2); color: var(--ds-ink2); margin-bottom: 10px; }
  .lm-story.on { background: color-mix(in srgb, var(--u) 9%, var(--ds-card)); color: var(--ds-ink); border-left: 3px solid var(--u); padding-left: 10px; }
  .lm-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(138px, 1fr)); gap: 7px; }
  .lm-tile { position: relative; display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 7px 9px; text-align: left; cursor: pointer; border-radius: 10px;
    border: 1.5px solid var(--ds-rule2); background: var(--ds-card); color: var(--ds-ink); transition: border-color .15s, background .15s, transform .12s; }
  .lm-tile:active { transform: scale(.97); }
  .lm-tile.on { border-color: var(--u); background: color-mix(in srgb, var(--u) 8%, var(--ds-card)); box-shadow: 0 2px 0 color-mix(in srgb, var(--u) 35%, transparent); }
  .lm-tile.changed::after { content: ''; position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--u); }
  .lm-tile-ic { width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--ds-card2); color: var(--u-ink); }
  .lm-tile.on .lm-tile-ic { background: var(--u); color: #fff; }
  .lm-tile-txt { min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
  .lm-tile-txt b { font: 700 13.5px var(--ds-sans); }
  .lm-tile-txt span { font-size: 12.5px; color: var(--ds-ink3); margin-top: 2px; }
  .lm-tile.changed .lm-tile-txt span { color: var(--u-ink); font-weight: 700; }
  .lm-panel { margin-top: 8px; padding: 10px 12px 12px; border-radius: 10px; border: 1.5px solid var(--u); background: var(--ds-card); animation: lm-panel .22s ease-out both; }
  @keyframes lm-panel { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .lm-panel-text { font-size: 14.5px; line-height: 1.4; color: var(--ds-ink2); margin-bottom: 9px; }
  .lm-caption { font-size: 13.5px; color: var(--ds-ink3); margin-top: 7px; text-align: center; }
  .lm-caption b { color: var(--ds-ink); }
  .lm-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; border: 1.5px solid var(--ds-rule2); border-radius: 10px; overflow: hidden; background: var(--ds-card2); }
  .lm-steps button { min-height: 42px; border: none; border-left: 1px solid var(--ds-rule2); background: none; color: var(--ds-ink2); font: 700 14px var(--ds-mono); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
  .lm-steps button:first-child { border-left: none; }
  .lm-steps button[aria-checked="true"] { background: var(--u); color: #fff; }
  .lm-steps button:focus-visible, .lm-tile:focus-visible, .lm-chip:focus-visible, .lm-news-btn:focus-visible, .lm-switch:focus-visible { outline: 3px solid var(--ds-focus, var(--u)); outline-offset: 2px; }
  .lm-price .lm-scale { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; color: var(--ds-ink3); }
  .lm-price .lm-scale b { font-size: 16px; color: var(--u-ink); }
  .lm-news-list { display: grid; gap: 6px; }
  .lm-news-btn { display: flex; align-items: center; gap: 8px; text-align: left; padding: 9px 11px; border-radius: 8px; border: 1.5px solid var(--ds-rule2); background: var(--ds-card); cursor: pointer;
    font: 600 14px/1.3 var(--ds-news, var(--ds-head)); color: var(--ds-ink); }
  .lm-news-btn[aria-pressed="true"] { border-color: var(--u); background: color-mix(in srgb, var(--u) 9%, var(--ds-card)); }
  .lm-switch { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 4px 0; cursor: pointer; font: 600 14.5px var(--ds-sans); color: var(--ds-ink); }
  .lm-switch .knob { position: relative; width: 40px; height: 24px; border-radius: 999px; background: var(--ds-rule2); transition: background .2s; flex-shrink: 0; }
  .lm-switch .knob::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s; }
  .lm-switch[aria-checked="true"] .knob { background: var(--u); }
  .lm-switch[aria-checked="true"] .knob::after { transform: translateX(16px); }
  .lm-chips-wrap { margin-top: 12px; }
  .lm-chips-head { font: 700 12px var(--ds-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--ds-ink3); margin-bottom: 6px; }
  .lm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .lm-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 5px 11px; border-radius: 999px; border: 1px dashed var(--ds-rule2); background: none; cursor: pointer;
    font: 600 13px var(--ds-sans); color: var(--ds-ink3); }
  .lm-chip.got { border-style: solid; color: var(--ds-ok-ink); background: var(--ds-ok-bg); border-color: color-mix(in srgb, var(--ds-ok) 40%, transparent); }
  .lm-chip.on { border-color: var(--u); color: var(--ds-ink); }
  .lm-chip-note { margin-top: 7px; font-size: 14px; line-height: 1.4; color: var(--ds-ink2); padding: 8px 11px; border-radius: 8px; background: var(--ds-card2); animation: lm-panel .2s ease-out both; }
  .lm-empty { display: flex; gap: 12px; align-items: center; margin: 10px 0 4px; }
  .lm-ghost { width: 120px; flex-shrink: 0; }
  .lm-thumb { flex-shrink: 0; border-radius: 6px; background: var(--ds-card2); }
  .ln-fold-prog { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
  .ln-fold-bar { display: block; flex: 1; height: 5px; border-radius: 99px; background: var(--ds-rule); overflow: hidden; max-width: 140px; }
  .ln-fold-bar i { display: block; height: 100%; background: var(--u); border-radius: 99px; }
  @media (prefers-reduced-motion: reduce) { .lm-pulse, .lm-panel, .lm-chip-note { animation: none !important; } .lm-ring .fg { transition: none; } }
  @media (prefers-reduced-motion: reduce) { .lm-line { animation: none !important; stroke-dashoffset: 0 !important; } }
`;

export const DOMINO_CSS = `
  /* сцена «Домино» прилипает к верху: выкладывая звенья внизу, ученик видит, что они делают */
  .lm-scene { position: sticky; top: 0; z-index: 1; background: var(--ds-paper); padding-bottom: 2px; }
  .lm-scene .lm-chart { max-width: 290px; margin-bottom: 0; }
  .lm-scene .lm-street { max-width: 260px; margin: 0 auto 4px; }
  .lm-news { border: 1px solid var(--ds-rule2); background: var(--ds-card); padding: 8px 12px 10px; text-align: center; margin-bottom: 8px; }
  .lm-news-mast { font: 700 12px var(--ds-news); letter-spacing: .22em; text-transform: uppercase; border-bottom: 3px double var(--ds-ink2); padding-bottom: 4px; margin-bottom: 6px; color: var(--ds-ink2); }
  .lm-news-head { font: 700 19px/1.25 var(--ds-news); }
  .lm-chain { display: grid; gap: 6px; margin: 8px 0; counter-reset: dom; }
  .lm-slot { position: relative; display: flex; align-items: stretch; min-height: 44px; border: 1.5px dashed var(--ds-rule2); border-radius: 5px; background: none; overflow: visible; }
  .lm-slot .n { width: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font: 700 14px var(--ds-mono); color: var(--ds-ink3); border-right: 1.5px dashed var(--ds-rule2); }
  .lm-slot .t { flex: 1; padding: 8px 10px; font-size: 15px; line-height: 1.35; color: var(--ds-ink3); display: flex; align-items: center; }
  .lm-slot.on { border: 1.5px solid var(--ds-ink2); background: var(--ds-card); box-shadow: 0 2px 0 var(--ds-shade); }
  .lm-slot.on .n { color: var(--u-ink); border-right: 1.5px solid var(--ds-ink2); }
  .lm-slot.on .t { color: var(--ds-ink); }
  .lm-slot.on.fresh { animation: lm-set .32s ease-out; }
  @keyframes lm-set { from { transform: translateY(-8px) rotate(-2deg); opacity: .4 } to { transform: none; opacity: 1 } }
  .lm-fall { position: absolute; inset: -1.5px; display: flex; align-items: center; border: 1.5px solid var(--ds-bad); border-radius: 5px; background: var(--ds-card); padding: 8px 10px 8px 44px; font-size: 15px;
    transform-origin: 0% 100%; animation: lm-fall .7s ease-in forwards; pointer-events: none; z-index: 2; }
  @keyframes lm-fall { 0% { transform: none; opacity: 1 } 45% { transform: rotate(-14deg) translateY(4px); opacity: 1 } 100% { transform: rotate(-70deg) translateY(30px); opacity: 0 } }
  .lm-deck { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 6px; }
  .lm-card { font: 14.5px/1.3 var(--ds-sans); text-align: left; padding: 9px 11px; border-radius: 4px; border: 1px solid var(--ds-rule2); border-bottom-width: 2px; background: var(--ds-card); color: var(--ds-ink); cursor: pointer; max-width: 100%; }
  .lm-card:disabled { cursor: default; }
  .lm-card.gone { text-decoration: line-through; color: var(--ds-ink3); background: none; border-style: dashed; }
  .lm-done { border-left: 3px solid var(--ds-ok); background: var(--ds-ok-bg); color: var(--ds-ok-ink); font-weight: 700; padding: 8px 10px; font-size: 15px; margin: 6px 0; }
  .lm-why { border-left: 3px solid var(--ds-sel-rule); background: color-mix(in srgb, var(--ds-sel-rule) 12%, var(--ds-card)); padding: 8px 10px; font-size: 14.5px; line-height: 1.4; margin: 6px 0; }
  @media (prefers-reduced-motion: reduce) { .lm-slot.on.fresh, .lm-fall { animation: none !important; } .lm-fall { display: none; } }
  /* домино на широком экране — в две колонки: слева сцена (график и улица), справа цепочка и колода.
     В одну колонку урок с увеличением не влезал в экран 1920×1080 (отчёт mvmfcaud) */
  @media (min-width: 1000px) {
    .ln-inner:has(> .lm-dom) { max-width: 980px; }
    .lm-dom { display: grid; grid-template-columns: minmax(0, 330px) minmax(0, 1fr); column-gap: 22px; align-items: start; }
    .lm-dom > .lm-news, .lm-dom > .lm-dom-prompt { grid-column: 1 / -1; }
    .lm-dom > .lm-scene { grid-column: 1; grid-row: span 4; position: sticky; top: 0; }
    .lm-dom > .lm-chain, .lm-dom > .lm-done, .lm-dom > .lm-why, .lm-dom > .lm-deck { grid-column: 2; }
    .lm-dom > .lm-chain { margin-top: 0; }
    .lm-dom > .lm-deck { justify-content: flex-start; }
  }
`;
