import { describe, it, expect } from 'vitest';
import { parsePath, pathFor, bookPageOf, createRouter, TAB_PATHS } from '../route.js';

/* Подделка окна: история в памяти, go/back — как в браузере, не сразу (popstate приходит следующим тиком). */
function fakeWindow(start = '/') {
  const entries = [{ state: null, url: start }];
  let idx = 0; const listeners = new Set();
  const loc = { get pathname() { return entries[idx].url.split(/[?#]/)[0]; }, get search() { const m = entries[idx].url.match(/\?[^#]*/); return m ? m[0] : ''; }, get hash() { const m = entries[idx].url.match(/#.*/); return m ? m[0] : ''; } };
  const win = {
    location: loc,
    history: {
      get state() { return entries[idx].state; },
      get length() { return entries.length; },
      pushState(state, _t, url) { entries.splice(idx + 1); entries.push({ state, url: url || entries[idx].url }); idx += 1; },
      replaceState(state, _t, url) { entries[idx] = { state, url: url || entries[idx].url }; },
      go(n) { setTimeout(() => { const to = idx + n; if (to < 0 || to >= entries.length) { win.left = true; return; } idx = to; listeners.forEach((fn) => fn({ state: entries[idx].state })); }, 0); },
      back() { win.history.go(-1); },
      forward() { win.history.go(1); },
    },
    addEventListener: (t, fn) => { if (t === 'popstate') listeners.add(fn); },
    removeEventListener: (t, fn) => { listeners.delete(fn); },
    setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (id) => clearTimeout(id),
    left: false,
    urls: () => entries.map((e) => e.url), at: () => idx,
  };
  return win;
}
const tick = () => new Promise((r) => { setTimeout(r, 5); });

describe('адреса экранов', () => {
  it('у каждой вкладки свой адрес, и он читается обратно', () => {
    expect(TAB_PATHS).toEqual({ path: '/', book: '/book', league: '/league', shop: '/shop', profile: '/profile', world: '/world', news: '/news' });
    Object.keys(TAB_PATHS).forEach((tab) => expect(parsePath(pathFor({ tab })).tab).toBe(tab));
  });
  it('глава учебника — /book/<id>; незнакомый адрес — null', () => {
    expect(parsePath('/book/supply-demand')).toEqual({ tab: 'book', chapter: 'supply-demand' });
    expect(pathFor({ tab: 'book', chapter: 'supply-demand' })).toBe('/book/supply-demand');
    expect(pathFor({ tab: 'book', page: { kind: 'chapter', id: 'gdp' } })).toBe('/book/gdp');
    expect(pathFor({ tab: 'book', page: { kind: 'review' } })).toBe('/book');
    expect(parsePath('/')).toEqual({ tab: 'path', chapter: null });
    expect(parsePath('/index.html')).toEqual({ tab: 'path', chapter: null });
    expect(parsePath('/book/')).toEqual({ tab: 'book', chapter: null });
    expect(parsePath('/nope')).toBe(null);
    expect(parsePath('/shop/x')).toBe(null);
    expect(parsePath('/book/a/b')).toBe(null);
  });
  it('страница учебника: глава из адреса; без главы — из состояния записи или оглавление', () => {
    expect(bookPageOf({ tab: 'book', chapter: 'gdp', page: null })).toEqual({ kind: 'chapter', id: 'gdp' });
    expect(bookPageOf({ tab: 'book', chapter: 'gdp', page: { kind: 'chapter', id: 'gdp', anchor: 's2' } })).toEqual({ kind: 'chapter', id: 'gdp', anchor: 's2' });
    expect(bookPageOf({ tab: 'book', chapter: null, page: { kind: 'review' } })).toEqual({ kind: 'review' });
    expect(bookPageOf({ tab: 'book', chapter: null, page: null })).toEqual({ kind: 'toc' });
    expect(bookPageOf({ tab: 'shop', chapter: null, page: null })).toBe(null);
  });
});

describe('история: экраны и слои', () => {
  it('переход между вкладками — записи истории; «Назад» возвращает прошлую вкладку', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); const seen = [];
    r.subscribe((route) => seen.push(route.tab));
    r.navigate({ tab: 'book' });
    r.navigate({ tab: 'book', page: { kind: 'chapter', id: 'gdp' } });
    expect(win.urls()).toEqual(['/', '/book', '/book/gdp']);
    win.history.back(); await tick();
    expect(r.current()).toMatchObject({ tab: 'book', chapter: null });
    win.history.back(); await tick();
    expect(r.current().tab).toBe('path');
    expect(seen).toEqual(['book', 'path']);
    // тот же адрес второй раз записи не добавляет
    r.navigate({ tab: 'path' });
    expect(win.at()).toBe(0);
  });

  it('слой — запись истории: «Назад» закрывает верхний слой и не уводит с сайта', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); const closed = [];
    r.openLayer(() => closed.push('sheet'));
    r.openLayer(() => closed.push('report'));
    expect(win.urls()).toEqual(['/', '/', '/']);
    win.history.back(); await tick();
    expect(closed).toEqual(['report']);
    win.history.back(); await tick();
    expect(closed).toEqual(['report', 'sheet']);
    expect(win.left).toBe(false);
    expect(r.depth()).toBe(0);
  });

  it('слой закрыт кнопкой — его запись уходит из истории', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); let n = 0;
    const id = r.openLayer(() => { n += 1; });
    r.closeLayer(id); await tick();
    expect(win.at()).toBe(0);
    expect(n).toBe(0); // закрыли сами — close из истории не зовётся
    expect(r.depth()).toBe(0);
  });

  it('карточка урока → урок: запись урока встаёт на место карточки, «Назад» закрывает урок', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); const closed = [];
    const sheet = r.openLayer(() => closed.push('sheet'));
    // «Начать»: карточка закрылась и урок открылся в одном тике
    r.closeLayer(sheet);
    r.openLayer(() => closed.push('run'));
    await tick();
    expect(win.urls().length).toBe(2);
    expect(win.at()).toBe(1);
    win.history.back(); await tick();
    expect(closed).toEqual(['run']);
    expect(win.at()).toBe(0);
  });

  it('слой не закрылся на «Назад» (урок спрашивает «Выйти?») — его запись возвращается, следующее «Назад» снова у него', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); let asks = 0; let stay = true;
    r.openLayer(() => { asks += 1; return stay ? false : undefined; });
    win.history.back(); await tick();
    expect(asks).toBe(1);
    expect(r.depth()).toBe(1);
    expect(win.at()).toBe(1); // запись урока снова на вершине
    stay = false;
    win.history.back(); await tick();
    expect(asks).toBe(2);
    expect(r.depth()).toBe(0);
    expect(win.at()).toBe(0);
    expect(win.left).toBe(false);
  });

  it('смена вкладки при открытом слое: запись слоя занимает новый экран', async () => {
    const win = fakeWindow('/'); const r = createRouter(win); const closed = [];
    const bell = r.openLayer(() => closed.push('bell'));
    r.navigate({ tab: 'league' }); // касание уведомления: вкладка сменилась…
    r.closeLayer(bell);            // …и центр уведомлений закрылся
    await tick();
    expect(win.urls()).toEqual(['/', '/league']);
    expect(r.current().tab).toBe('league');
    win.history.back(); await tick();
    expect(r.current().tab).toBe('path');
    expect(closed).toEqual([]);
  });

  it('перезагрузка на записи слоя: слоя нет, запись — обычный экран; мёртвые записи позади проходятся насквозь', async () => {
    const win = fakeWindow('/'); const r = createRouter(win);
    r.navigate({ tab: 'shop' });
    r.openLayer(() => {}); r.openLayer(() => {});
    r.destroy();
    // «перезагрузка»: новая страница, история та же
    const r2 = createRouter(win); const seen = [];
    r2.subscribe((route) => seen.push(route.tab));
    expect(r2.depth()).toBe(0);
    expect(win.history.state.d).toBe(0);
    win.history.back(); await tick(); await tick();
    // запись первого слоя (d = 1) — мёртвая: «Назад» прошёл её и остановился на вкладке
    expect(win.at()).toBe(1);
    expect(r2.current().tab).toBe('shop');
    win.history.back(); await tick();
    expect(r2.current().tab).toBe('path');
    expect(seen[seen.length - 1]).toBe('path');
  });

  it('страница учебника без своего адреса живёт в состоянии записи', async () => {
    const win = fakeWindow('/book'); const r = createRouter(win);
    r.navigate({ tab: 'book', page: { kind: 'review' } });
    expect(win.urls()).toEqual(['/book', '/book']);
    expect(bookPageOf(r.current())).toEqual({ kind: 'review' });
    win.history.back(); await tick();
    expect(bookPageOf(r.current())).toEqual({ kind: 'toc' });
  });
});
