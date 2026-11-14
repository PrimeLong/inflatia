/* ЗАГОЛОВОК СВЕЖЕГО ВЫПУСКА и лёгкие функции ленты — для точки «новое» на нижней панели (src/MacroSimulator.jsx).
   Сами выпуски (src/learn/news.js — десятки килобайт текста) грузятся вместе с лентой «Новости», а не на приветствии и
   Пути (docs/mechanics.md, «Приветствие и загрузка»). Вышел новый выпуск — LATEST_NEWS_HEAD меняется вместе с ним:
   за совпадением следит тест src/learn/__tests__/news-head.test.js. */
import { dayOf } from '../textbook/learn-state.js';

export const LATEST_NEWS_HEAD = { id: '2026-11-09', date: '2026-11-09' };

/* Первый день ученика: регистрация или самое раннее занятие; ещё ничего нет — сегодня (он только
   пришёл). Выпуск — новость для ученика, только если вышел ПОСЛЕ этого дня: тому, кто только зашёл,
   прошлое обновление не новость — для него новое всё. */
export function learnerSince(learn, now = Date.now()) {
  const l = learn || {};
  const days = [...Object.keys(l.done || {}), ...Object.keys(l.xp || {})].sort();
  const reg = l.profile && l.profile.at ? dayOf(l.profile.at) : null;
  return [days[0], reg].filter(Boolean).sort()[0] || dayOf(now);
}
export const newsForLearner = (n, since) => !since || n.date > since;

/* Прочитанные выпуски — на устройстве (ems-news-seen: id → когда открыли) и в прогрессе ученика
   (learn.shown, ключ w:<id>), общем для всех его устройств: открыл ленту на ПК — на телефоне выпуск уже
   не «новый» (жалоба). Новый ученик не видит прошлых выпусков как «новых»: всё, что вышло до его первого
   дня включительно, — не новость. */
export const SEEN_KEY = 'ems-news-seen';
export const NEWS_SEEN_PREFIX = 'w:';
export function readNewsSeen(learn = null) {
  let local = {};
  try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); local = v && typeof v === 'object' ? v : {}; } catch { /* приватный режим */ }
  const synced = Object.fromEntries(Object.entries((learn && learn.shown) || {}).filter(([k]) => k.startsWith(NEWS_SEEN_PREFIX)).map(([k, v]) => [k.slice(NEWS_SEEN_PREFIX.length), v]));
  return { ...synced, ...local };
}
/* Новое от друзей — красная точка на «⋯» и «новое» у «Новостей», как у выпусков: события друзей после
   последнего открытия ленты на этом устройстве (ems-feed-seen-at). Устройство, где ленту ещё не открывали,
   считает новым только последние двое суток. */
export const FEED_SEEN_KEY = 'ems-feed-seen-at';
export function readFeedSeenAt(now = Date.now()) {
  try { const v = Number(localStorage.getItem(FEED_SEEN_KEY)); return v > 0 ? v : now - 2 * 86400000; } catch { return now - 2 * 86400000; }
}
// то же прямо по списку друзей с сервера — для точки на «⋯» (без модуля друзей в главном чанке)
export const friendNewsSince = (friends = [], seenAt = 0) => friends.some((f) => ((f && f.card && f.card.events) || []).some((e) => e && e.at > seenAt));
