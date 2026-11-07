/* Фаза 4 (5 ноября): правки владельца — чистые функции. */
import { describe, it, expect } from 'vitest';
import { SKIN_SOUNDS, PLAIN_SOUNDS, answerSound } from '../skin-sounds.js';
import { SFX_NAMES } from '../../audio/engine.js';
import { SFX_GAIN_DB } from '../../audio/loudness.js';

describe('темы урока: свои звуки ответа', () => {
  const KEYS = ['exchange', 'mint', 'blueprint', 'aurora'];
  it('у каждой темы два разных звука, свои — не общие и не чужие', () => {
    expect(Object.keys(SKIN_SOUNDS).sort()).toEqual([...KEYS].sort());
    const all = Object.values(SKIN_SOUNDS).flat();
    expect(new Set(all).size).toBe(all.length);
    all.forEach((n) => expect(PLAIN_SOUNDS).not.toContain(n));
  });
  it('звуки есть в движке и выровнены по громкости вместе со звуками ответа', () => {
    Object.values(SKIN_SOUNDS).flat().forEach((n) => {
      expect(SFX_NAMES, n).toContain(n);
      expect(typeof SFX_GAIN_DB[n], n).toBe('number');
      expect(Math.abs(SFX_GAIN_DB[n]), n).toBeLessThanOrEqual(4);
    });
  });
  it('верно и неверно — свои звуки темы; без темы — «монетка» и «вниз»', () => {
    expect(answerSound({ key: 'exchange' }, true)).toBe('ex-up');
    expect(answerSound({ key: 'exchange' }, false)).toBe('ex-down');
    expect(answerSound({ key: 'aurora' }, true)).toBe('au-up');
    expect(answerSound(null, true)).toBe('coin');
    expect(answerSound(null, false)).toBe('down');
  });
});

describe('«Биржа»: график котировок плывёт по кругу без обрыва', async () => {
  const { loopWalk } = await import('../skin-sounds.js');
  it('два одинаковых периода, конец периода сходится с началом, линия в поле', () => {
    [[40, 7, 14], [30, 91, 18]].forEach(([n, seed, amp]) => {
      const pts = loopWalk(n, seed, amp);
      expect(pts.length).toBe(2 * n - 1);
      expect(pts[0][0]).toBe(0);
      expect(pts[pts.length - 1][0]).toBeCloseTo(200, 9);
      expect(pts[0][1]).toBeCloseTo(pts[n - 1][1], 9);
      expect(pts[pts.length - 1][1]).toBeCloseTo(pts[0][1], 9);
      for (let i = 0; i < n; i += 1) { expect(pts[i + n - 1][0]).toBeCloseTo(pts[i][0] + 100, 9); expect(pts[i + n - 1][1]).toBe(pts[i][1]); }
      pts.forEach(([, y]) => { expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(92); });
    });
  });
});

describe('гравюры зданий стоят на земле (марка Порта была сломанной: склад висел над землёй)', () => {
  it('ничего прямоугольного ниже земли (y = 82); склад Порта стоит на земле, а не висит над ней', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { Engraving } = await import('../../ds-art.jsx');
    ['market', 'fair', 'workshop', 'bakery', 'bank', 'exchange', 'ministry', 'port', 'store', 'factory', 'tower'].forEach((kind) => {
      [false, true].forEach((alive) => {
        const svg = renderToStaticMarkup(React.createElement(Engraving, { kind, alive }));
        const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => ({ y: +m[2], w: +m[3], h: +m[4] }));
        if (kind === 'port') {
          const main = rects.reduce((a, r) => (r.w * r.h > a.w * a.h ? r : a), { w: 0, h: 0, y: 0 });
          expect(main.y + main.h, `склад${alive ? ' жив' : ''}`).toBe(82);
        }
        // ничего прямоугольного ниже земли
        rects.forEach((r) => expect(r.y + r.h, kind).toBeLessThanOrEqual(82.5));
      });
    });
  });
});

describe('марки месяцев: цвета насыщенные (ноябрь выглядел чёрным)', () => {
  it('у каждого месяца насыщенность по HSL не ниже 0,32 — тёмный серо-синий и приглушённый индиго не проходят', async () => {
    const { MONTH_ART } = await import('../../award-art.js');
    const sat = (hex) => {
      const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
      return max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
    };
    MONTH_ART.forEach(([, color], k) => expect(sat(color), `месяц ${k + 1}: ${color}`).toBeGreaterThanOrEqual(0.32));
    // прежние цвета ноября проверку не прошли бы
    expect(sat('#5B5DA6')).toBeLessThan(0.32);
    expect(sat('#5A6E8C')).toBeLessThan(0.32);
  });
});

describe('подпись автора портрета — один раз и по-русски (у Кларка было «Unknown author» дважды)', () => {
  it('повтор схлопывается, «Unknown author» — «автор неизвестен», настоящие имена не трогаем', async () => {
    const { cleanAuthor, photoFromCommons } = await import('../commons.js');
    expect(cleanAuthor('<span class="fn">Unknown author</span><span style="display:none">Unknown author</span>')).toBe('автор неизвестен');
    expect(cleanAuthor('Unknown author Unknown author')).toBe('автор неизвестен');
    expect(cleanAuthor("Unknown author (The World's Work, published no later than 1913)")).toBe("автор неизвестен (The World's Work, published no later than 1913)");
    expect(cleanAuthor('John Palmer Clarke')).toBe('John Palmer Clarke');
    expect(cleanAuthor('Elliott &amp; Fry')).toBe('Elliott & Fry');
    const ph = photoFromCommons({ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Clark.jpg', extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: '<span>Unknown author</span> <span>Unknown author</span>' } } });
    expect(ph.author).toBe('автор неизвестен');
  });
});

describe('защита монет: дюп «серия 3, 7, 30 дней» за каждую витрину (6 ноября 2026)', () => {
  it('разовые ключи наград не урезаются, сколько бы их ни было; по дате — только задания дня, витрины и цель дня', async () => {
    const { normalizeLearn, emptyLearn } = await import('../../textbook/learn-state.js');
    const claimed = {};
    for (let i = 0; i < 2000; i += 1) { claimed[`l:x${i}`] = 1e12 + i; claimed[`d:x${i}`] = 1e12 + i; }
    ['st:3', 'st:7', 'st:30', 'a:first', 'c:scarcity', 'm:2026-10', 'lg:2026-10-26'].forEach((k) => { claimed[k] = 1e12; });
    for (let d = 1; d <= 500; d += 1) { const day = new Date(Date.UTC(2025, 0, d)).toISOString().slice(0, 10); claimed[`g:${day}`] = 1e12 + d; claimed[`q:${day}:a`] = 1e12 + d; claimed[`dust:${day}:1`] = 1e12 + d; }
    const n = normalizeLearn({ ...emptyLearn(), claimed });
    ['st:3', 'st:7', 'st:30', 'a:first', 'c:scarcity', 'm:2026-10', 'lg:2026-10-26', 'l:x1999', 'd:x0'].forEach((k) => expect(n.claimed[k], k).toBeTruthy());
    const count = (p) => Object.keys(n.claimed).filter((k) => k.startsWith(p)).length;
    expect(count('g:')).toBe(400); expect(count('q:')).toBe(250); expect(count('dust:')).toBe(30);
    // остаются свежие дни
    expect(n.claimed['g:2026-05-15']).toBeTruthy(); expect(n.claimed['g:2025-01-01']).toBeUndefined();
  });
  it('после нормализации повторная выплата вне урока не даёт бонусов серии снова', async () => {
    const { normalizeLearn, emptyLearn, dayOf, addDays } = await import('../../textbook/learn-state.js');
    const { settle, resetCoinGuard, balance } = await import('../rewards.js');
    resetCoinGuard();
    const now = Date.UTC(2026, 10, 6, 12);
    const today = dayOf(now);
    // 30 дней подряд с уроками и уже выплаченные бонусы серии; 300 ключей уроков и алмазов
    const done = Object.fromEntries(Array.from({ length: 30 }, (_, k) => [addDays(today, -k), 1]));
    const claimed = { 'st:3': now - 9e8, 'st:7': now - 5e8, 'st:14': now - 4e8, 'st:30': now - 1e6 };
    for (let i = 0; i < 300; i += 1) claimed[`l:x${i}`] = now - 1e9;
    let s = normalizeLearn({ ...emptyLearn(), done, xp: done, claimed, coins: { [today]: 100 } });
    // первая выплата может дать честные награды (печати за серию); бонусов серии в ней нет — они уже выплачены
    const first = settle(s, {}, now);
    expect(first.gains.filter((g) => g.kind === 'streak')).toEqual([]);
    s = normalizeLearn(first.s);
    const before = balance(s);
    // пять операций в лавке подряд — ни одной монеты сверх
    for (let k = 1; k <= 5; k += 1) { const r = settle(s, {}, now + k * 60000); expect(r.gains, `операция ${k}`).toEqual([]); s = normalizeLearn(r.s); }
    expect(balance(s)).toBe(before);
  });
  it('предохранитель: ключ выплаты пропал из прогресса — второй раз не платим, ключ возвращаем, случай — в аналитику', async () => {
    const { emptyLearn, dayOf } = await import('../../textbook/learn-state.js');
    const { settle, resetCoinGuard, onCoinGuard, balance } = await import('../rewards.js');
    resetCoinGuard();
    const seen = []; onCoinGuard((x) => seen.push(x.key));
    const now = Date.UTC(2026, 10, 6, 12); const day = dayOf(now);
    const s0 = { ...emptyLearn(), daily: { [day]: { s: 900 } }, done: { [day]: 1 } };
    const r1 = settle(s0, {}, now);
    const goal = r1.gains.find((g) => g.kind === 'goal');
    expect(goal).toBeTruthy();
    // ключ пропал (как при прежней обрезке) — через минуту повторной выплаты нет
    const lost = { ...r1.s, claimed: Object.fromEntries(Object.entries(r1.s.claimed).filter(([k]) => k !== goal.key)) };
    const r2 = settle(lost, {}, now + 60000);
    expect(r2.gains.find((g) => g.key === goal.key)).toBeUndefined();
    expect(balance(r2.s)).toBe(balance(lost));
    expect(r2.s.claimed[goal.key]).toBeTruthy();
    expect(seen).toContain(goal.key);
    // тот же расчёт, повторённый сразу (React вызвал обновление дважды), — не повтор: платит как обычно
    resetCoinGuard();
    const a = settle(s0, {}, now); const b = settle(s0, {}, now + 10);
    expect(b.gains.length).toBe(a.gains.length);
    onCoinGuard(null);
  });
  it('аналитика принимает coins_guard и считает его в отчёте', async () => {
    const { sanitizeEvent, EVENTS } = await import('../../../api/events.js');
    expect(EVENTS).toContain('coins_guard');
    expect(sanitizeEvent({ event: 'coins_guard', login: 'x' })).toEqual({ event: 'coins_guard' });
  });
});
