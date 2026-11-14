/* АДРЕСА И ИСТОРИЯ (docs/mechanics.md, «Адреса и история»): History API, без библиотеки.

   У экранов свои адреса: / (Путь), /book, /book/<id главы>, /league, /shop, /profile, /world, /news.
   Всё, что открывается поверх экрана, — «слой»: карточка урока, сам урок, шторки, страницы настроек и
   уведомлений, партия «Мира». Слой — запись истории без своего адреса: «Назад» браузера закрывает
   верхний слой, а не уводит с сайта.

   В состоянии каждой записи (history.state): { ems, i, d, top, page }
     i    — порядковый номер записи (по нему видно, назад пошли или вперёд);
     d    — сколько слоёв открыто на этой записи;
     top  — id верхнего слоя;
     page — страница учебника без своего адреса (повторение, приложение, экзамен).

   Модуль не знает о React, кроме хука useHistoryLayer внизу; createRouter(win) принимает окно —
   в тестах это подделка с историей в памяти. */
import { useEffect, useRef } from 'react';

export const TAB_PATHS = { path: '/', book: '/book', league: '/league', shop: '/shop', profile: '/profile', world: '/world', news: '/news' };
export const ROUTE_TABS = Object.keys(TAB_PATHS);
const TAB_BY_SEGMENT = Object.fromEntries(Object.entries(TAB_PATHS).map(([tab, p]) => [p.slice(1), tab]));

/* адрес → экран: { tab, chapter }. Незнакомый адрес — null (оболочка откроет Путь и поправит адрес). */
export function parsePath(pathname) {
  const parts = String(pathname || '/').split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  if (!parts.length || (parts.length === 1 && parts[0] === 'index.html')) return { tab: 'path', chapter: null };
  const tab = TAB_BY_SEGMENT[parts[0]];
  if (!tab || tab === 'path') return null;
  if (tab === 'book') return parts.length <= 2 ? { tab, chapter: parts[1] || null } : null;
  return parts.length === 1 ? { tab, chapter: null } : null;
}
/* экран → адрес; страница учебника: глава — /book/<id>, остальные — /book */
export function pathFor({ tab = 'path', chapter = null, page = null } = {}) {
  const base = TAB_PATHS[tab] || '/';
  const ch = chapter || (page && page.kind === 'chapter' ? page.id : null);
  return tab === 'book' && ch ? `${base}/${encodeURIComponent(ch)}` : base;
}
// страница учебника по адресу и состоянию записи: глава из адреса важнее сохранённого состояния
export function bookPageOf(route) {
  if (!route || route.tab !== 'book') return null;
  if (route.chapter) return route.page && route.page.kind === 'chapter' && route.page.id === route.chapter ? route.page : { kind: 'chapter', id: route.chapter };
  return route.page && route.page.kind !== 'chapter' ? route.page : { kind: 'toc' };
}

export function createRouter(win) {
  const hist = win.history; const loc = win.location;
  const layers = [];       // открытые слои, снизу вверх: { id, close }
  const subs = new Set();  // подписчики на «Назад»/«Вперёд»
  let seq = 0; let lastI = 0;
  // слои, закрытые интерфейсом в этом тике: их записи уходят из истории одним шагом назад
  let pendingBack = 0; let anchored = false; let flushId = null;

  const own = () => (hist.state && hist.state.ems ? hist.state : null);
  const url = () => `${loc.pathname}${loc.search || ''}${loc.hash || ''}`;
  const write = (st, to, replace) => {
    if (replace) hist.replaceState(st, '', to); else hist.pushState(st, '', to);
    lastI = st.i;
  };
  // первая загрузка или перезагрузка: запись без нашего состояния — заводим; слоёв после перезагрузки нет
  const adopt = () => {
    const st = own();
    if (!st) write({ ems: true, i: 0, d: 0, top: null, page: null }, url(), true);
    else if (st.d) write({ ...st, d: 0, top: null }, url(), true);
    else lastI = st.i;
  };
  adopt();
  // прокрутку при «Назад» ведёт приложение: вкладка открывается сверху, учебник — там, где читали
  try { hist.scrollRestoration = 'manual'; } catch { /* старый браузер */ }

  const current = () => {
    const st = own() || {};
    const parsed = parsePath(loc.pathname);
    return { ...(parsed || { tab: 'path', chapter: null }), known: !!parsed, page: st.page || null };
  };
  const flush = () => {
    flushId = null;
    const n = pendingBack; pendingBack = 0; anchored = false;
    if (n > 0) hist.go(-n);
  };

  /* Переход на другой экран. Новая запись — кроме случаев: replace; адрес и страница те же; мы стоим на
     записи слоя (экран сменился — слои закрываются, и их запись занимает новый экран, а не висит позади). */
  const navigate = (route, { replace = false } = {}) => {
    const st = own() || { i: lastI, d: 0 };
    const to = `${pathFor(route)}${route.keepSearch ? loc.search || '' : ''}`;
    const page = route.page && route.page.kind !== 'toc' ? route.page : null;
    const same = to === `${loc.pathname}${route.keepSearch ? loc.search || '' : ''}` && JSON.stringify(page) === JSON.stringify(st.page || null);
    if (same && !st.d) return;
    const onLayer = st.d > 0;
    write({ ems: true, i: replace || onLayer || same ? st.i : st.i + 1, d: 0, top: null, page }, to, replace || onLayer || same);
    pendingBack = 0; anchored = false;
  };

  /* Слой открылся: новая запись истории с тем же адресом. Если в этом же тике интерфейс закрыл другой слой
     (карточка урока → урок), новая запись встаёт на его место, а не поверх. */
  const openLayer = (close) => {
    seq += 1;
    const id = `${Date.now().toString(36)}-${seq}`;
    layers.push({ id, close });
    const st = own() || { i: lastI, page: null };
    const reuse = pendingBack > 0;
    if (reuse) pendingBack -= 1;
    write({ ems: true, i: reuse ? st.i : st.i + 1, d: layers.length, top: id, page: st.page || null }, url(), reuse);
    return id;
  };
  /* Слой закрыт интерфейсом (крестик, «Дальше», смена вкладки). Если его запись — на вершине истории,
     убираем её шагом назад; иначе (поверх уже другой экран) историю не трогаем. */
  const closeLayer = (id) => {
    const k = layers.findIndex((l) => l.id === id);
    if (k < 0) return; // уже закрыт «Назад» браузера
    if (pendingBack === 0) { const st = own(); anchored = !!st && st.d > 0 && st.top === layers[layers.length - 1].id; }
    layers.splice(k, 1);
    if (!anchored) return;
    pendingBack += 1;
    if (flushId == null) flushId = win.setTimeout(flush, 0);
  };

  const onPop = () => {
    let st = own();
    if (!st) { adopt(); st = own(); } // запись не наша (например, якорь #ds) — заводим состояние
    const back = st.i < lastI;
    lastI = st.i;
    // «Назад» закрывает верхние слои — до числа, записанного в состоянии
    let kept = false;
    while (layers.length > st.d && !kept) {
      const l = layers.pop();
      try { kept = l.close() === false; } catch { /* слой уже размонтирован */ }
      /* слой не закрылся (урок спрашивает «Выйти из урока?») — его запись возвращается в историю:
         следующее «Назад» снова придёт к нему, а не уведёт с экрана */
      if (kept) { layers.push(l); const cur = own(); write({ ems: true, i: cur.i + 1, d: layers.length, top: l.id, page: cur.page || null }, url(), false); }
    }
    // запись слоя, которого уже нет (закрыли кнопкой, а запись осталась позади): назад — проходим её насквозь
    if (!kept && st.d > layers.length && back && st.i > 0) { hist.back(); return; }
    const r = current();
    subs.forEach((fn) => fn(r));
  };
  win.addEventListener('popstate', onPop);

  return {
    current, navigate, openLayer, closeLayer,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    depth: () => layers.length,
    // шаг назад по истории, если это наша запись не первая (кнопка «назад» в учебнике)
    back: () => { const st = own(); if (st && st.i > 0) { hist.back(); return true; } return false; },
    destroy: () => { win.removeEventListener('popstate', onPop); if (flushId != null) win.clearTimeout(flushId); },
  };
}

let shared = null;
/* общий маршрутизатор страницы; вне браузера (тесты модулей, сервер) — заглушка без истории */
export function router() {
  if (shared) return shared;
  if (typeof window === 'undefined' || !window.history || !window.history.pushState) {
    shared = { current: () => ({ tab: 'path', chapter: null, known: true, page: null }), navigate: () => {}, openLayer: () => null, closeLayer: () => {},
      subscribe: () => () => {}, depth: () => 0, back: () => false, destroy: () => {} };
  } else shared = createRouter(window);
  return shared;
}

/* Слой как запись истории: пока open — в истории лишняя запись; «Назад» браузера зовёт close.
   Хук ставят там, где слой открывается (шторка, урок, страница поверх вкладки). close вернул false —
   слой остался открытым (спросил подтверждение), и его запись возвращается в историю. */
export function useHistoryLayer(open, close) {
  const fn = useRef(close);
  fn.current = close;
  useEffect(() => {
    if (!open) return undefined;
    const id = router().openLayer(() => (fn.current ? fn.current() : undefined));
    return () => router().closeLayer(id);
  }, [open]);
}
