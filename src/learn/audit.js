/* СПИСАНИЕ МОНЕТ ДЮПА (docs/mechanics.md, «Защита монет»; решение владельца — docs/legal-todo.md, п. 16).

   До исправления 6 ноября 2026 бонусы серии выплачивались снова и снова (ключи наград урезались по алфавиту).
   Отдельной записи о каждой выплате нет: монеты хранятся суммой за день. Поэтому лишнее считается так:
   по прогрессу ученика — щедрая ВЕРХНЯЯ граница того, что он мог заработать честно (coinCeiling), и всё, что
   заработано сверх неё, — монеты дюпа. Граница считается с запасом: честному ученику не списывается ничего.

   Списание — один раз (запись learn.fines[DUPE_FINE]). Если после него в кошельке минус, откатываются покупки на
   эти монеты — с самых новых: вещь уходит из гардероба, её цена возвращается в кошелёк, — пока минус не уйдёт.
   Запись переживает слияние устройств: остаётся самая ранняя, а откаченная вещь не возвращается с другого
   устройства (normalizeLearn убирает её из owned). Купленная заново после списания — остаётся. Модуль чистый. */
import { COIN, STREAK_BONUS, ACHIEVEMENTS, achievementKey, chestCoins, MONTH_COINS, RATE_MAX, priceIndex, priceOf, earned, balance, OUTFIT_BY_ID, hasClaim, QUEST_COINS, goalCoins } from './rewards.js';
import { dayOf, longestStreak } from '../textbook/learn-state.js';
import { leagueState, PLACE_COINS, PROMO_COINS, LEAGUES } from './league.js';
import { RACE } from './friends.js';
import { PLANT_BY_ID, GRADE_BY_ID, gradeOf } from './garden.js';
import { UNITS } from './course.js';

export const DUPE_FINE = 'dupe-2026-11';
// за активный день — пять витрин по 2 монеты; цель дня (до 20 минут → 20 монет) — по ключам g: или по максимуму
export const DAY_CEILING = 10;
const GOAL_MAX = goalCoins(20);
// задание дня — по своей цене (QUEST_COINS), «все три» — COIN.allQuests; за день без записи заданий — все три по максимуму
const QUEST_MAX = Math.max(...Object.values(QUEST_COINS)); const QUESTS_DAY = Object.values(QUEST_COINS).sort((a, b) => b - a).slice(0, 3).reduce((a, x) => a + x, 0);
/* старое урезание ключей наград (до 6 ноября 2026) оставляло первые 250 по алфавиту: a:, c:, d:, g:… — у кого их
   набиралось столько, у того свежие ключи цели дня (g:) и всё дальше по алфавиту могли пропасть */
const OLD_CUT = 250;
// ключи заданий дня хранятся последние 250 (src/textbook/learn-state.js, claimedMap)
const QUEST_KEEP = 250;
const MARGIN = 1.1; const MARGIN_ABS = 100;

/* Верхняя граница честного заработка в монетах — по частям, чтобы её можно было проверить. bookFirst — сколько
   задач учебника решено с первой попытки (прогресс учебника лежит отдельно от learn). */
export function coinCeiling(s, now = Date.now(), { bookFirst = null } = {}) {
  const lessons = Object.values(s.lessons || {});
  const days = new Set([...Object.keys(s.coins || {}), ...Object.keys(s.done || {}), ...Object.keys(s.xp || {})]);
  const longest = longestStreak(s);
  const parts = {};
  // уроки: первый раз — урок и «без ошибок», повторы — по максимуму повтора, алмаз — с «без ошибок»
  parts.lessons = lessons.reduce((a, l) => a + COIN.lesson + COIN.perfect + Math.max(0, (l.runs || 1) - 1) * Math.max(COIN.replay, COIN.diamondReplay)
    + (l.diamond ? COIN.diamond + COIN.diamondPerfect : 0), 0);
  // практика, работа над ошибками, проверки и тесты уровня — по числу законченных прохождений сверх уроков
  const lessonRuns = lessons.reduce((a, l) => a + Math.max(1, l.runs || 1), 0);
  parts.runs = Math.max(0, ((s.runs || {}).finished || 0) - lessonRuns) * Math.max(COIN.practice, COIN.check);
  parts.daily = days.size * DAY_CEILING;
  /* задания дня — по ключам q:<день>:<задание> (они хранятся по дате и не урезались по алфавиту); за дни раньше
     самого старого ключа, если ключей уже 250, — по максимуму */
  const qKeys = Object.keys(s.claimed || {}).filter((k) => k.startsWith('q:'));
  parts.quests = qKeys.reduce((a, k) => a + (k.endsWith(':all') ? COIN.allQuests : QUEST_COINS[k.slice(13)] || QUEST_MAX), 0);
  if (qKeys.length >= QUEST_KEEP) {
    const oldest = qKeys.map((k) => k.slice(2, 12)).sort()[0];
    parts.quests += [...days].filter((d) => d < oldest).length * (QUESTS_DAY + COIN.allQuests);
  }
  // цель дня — по ключам g:<день>; если старое урезание могло их съесть — за дни после последнего ключа по максимуму
  const early = Object.keys(s.claimed || {}).filter((k) => /^[a-g]/.test(k)).length;
  const gDays = Object.keys(s.claimed || {}).filter((k) => k.startsWith('g:')).map((k) => k.slice(2, 12)).sort();
  parts.goal = gDays.length * GOAL_MAX;
  if (early >= OLD_CUT - 10) parts.goal += [...days].filter((d) => !gDays.length || d > gDays[gDays.length - 1]).length * GOAL_MAX;
  // сундуки и печати — по ключам c: и a: (в начале алфавита — не урезались никогда)
  parts.chests = UNITS.filter((u) => hasClaim(s, `c:${u.id}`)).reduce((a, u) => a + chestCoins(u.id), 0);
  parts.streak = STREAK_BONUS.filter(([n]) => n <= longest).reduce((a, [, c]) => a + c, 0);
  parts.seals = ACHIEVEMENTS.reduce((a, x) => a + (hasClaim(s, achievementKey(x.id)) ? x.coins || 0 : 0), 0);
  parts.month = new Set([...days].map((d) => d.slice(0, 7))).size * MONTH_COINS;
  // лига: итоги недель по прогрессу и ещё — за недели, которых в истории уже нет, по высшей награде
  let league = 0; let hist = [];
  try { hist = leagueState(s, now).history || []; } catch { hist = []; }
  league += hist.reduce((a, h) => a + (h.coins || 0), 0);
  const topWeek = Math.max(...PLACE_COINS, PROMO_COINS) * LEAGUES.length;
  const lgKeys = Object.keys(s.claimed || {}).filter((k) => k.startsWith('lg:') && !hist.some((h) => `lg:${h.week}` === k));
  league += lgKeys.length * topWeek;
  parts.league = league;
  // забег — не чаще раза в шесть дней (три дня забега и отдых), победа — высшая награда
  const races = Object.keys(s.claimed || {}).filter((k) => /^race:[a-z0-9]+(:won)?$/.test(k)).length;
  const cut = Object.keys(s.claimed || {}).length >= OLD_CUT - 10;
  parts.race = races || cut ? (races + Math.ceil(days.size / 6)) * RACE.win : 0;
  // сад: каждый собранный урожай — по наибольшей возможной цене (высший спрос, худший курс)
  parts.garden = Object.keys(s.harvest || {}).reduce((a, at) => {
    const v = (s.garden || {})[at]; const p = v && PLANT_BY_ID[String(v).split('@')[0]];
    const g = GRADE_BY_ID[gradeOf(at)];
    return a + (p && g ? Math.ceil(p.crowns * g.mult * 1.15 * RATE_MAX) : 0);
  }, 0);
  parts.book = (bookFirst != null ? bookFirst : days.size * 10) * COIN.book;
  const raw = Object.values(parts).reduce((a, x) => a + x, 0);
  // индексация наград — не выше индекса цен на сегодня
  const index = Math.max(1, priceIndex(dayOf(now)));
  return { total: Math.ceil(raw * index * MARGIN) + MARGIN_ABS, parts };
}

// покупки, которые можно откатить: вещи лавки за монеты (не подарки за печати и сезон), новые — первыми
const refundable = (s) => Object.entries(s.owned || {})
  .filter(([id, at]) => OUTFIT_BY_ID[id] && !OUTFIT_BY_ID[id].reward && OUTFIT_BY_ID[id].crowns > 0 && at > 0)
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

/* Расчёт списания: { at, coins — сколько списано, refund — сколько вернулось за откаченные вещи, items — id → время
   покупки }. Пока прогресса нет (новое устройство до синхронизации) — null: считать не по чему. */
export function dupeFine(s, now = Date.now(), opts = {}) {
  if (!Object.keys(s.lessons || {}).length) return null;
  const { total } = coinCeiling(s, now, opts);
  const coins = Math.max(0, Math.round(earned(s) - total));
  const items = {}; let refund = 0;
  if (coins > 0) {
    let bal = balance(s) - coins;
    for (const [id, at] of refundable(s)) {
      if (bal >= 0) break;
      const price = priceOf(id, dayOf(at));
      items[id] = at; refund += price; bal += price;
    }
  }
  return { at: now, coins, refund, items };
}
export const needsDupeAudit = (s) => !((s.fines || {})[DUPE_FINE]) && Object.keys(s.lessons || {}).length > 0;
// записать списание (один раз); вернуть то же состояние, если записывать нечего
export function applyDupeAudit(s, now = Date.now(), opts = {}) {
  if (!needsDupeAudit(s)) return s;
  const f = dupeFine(s, now, opts);
  return f ? { ...s, fines: { ...s.fines, [DUPE_FINE]: f } } : s;
}
// что увидит ученик: сколько списано и какие вещи вернулись в лавку
export const fineOf = (s) => (s.fines || {})[DUPE_FINE] || null;
