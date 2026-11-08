/* УВЕДОМЛЕНИЯ: что сейчас важно ученику — серия ждёт урока, его обогнали в лиге, созрел урожай,
   вклад готов, сундук не открыт, вышла новость (docs/mechanics.md, «Новости и уведомления»).

   Список не хранится: он выводится из прогресса и времени, как лига. Пройденное само уходит —
   собрали урожай, и «Созрело» исчезает. На устройстве хранится только, что уже прочитано
   (ems-notify-seen), какие виды включены (ems-notify-prefs) и что уже ушло в браузер
   (ems-notify-pushed). Модуль чистый, кроме этих трёх ключей: его читают колокольчик, центр
   уведомлений, всплывающая плашка и напоминания в браузере (src/learn-notify.jsx), и тесты. */
import { streak, goalToday, dayOf, addDays, dayAt } from '../textbook/learn-state.js';
import { leagueState, pendingRewards, standings, LEAGUE_BY_ID, LESSON_XP } from './league.js';
import { gardenPlots, growth, PLANT_BY_ID } from './garden.js';
import { piggyState, monthChallenge, hasClaim, chestKey, coinsWord, plural, OUTFIT_BY_ID } from './rewards.js';
import { pathState, practiceIds, unitTitle } from './course.js';
import { placeOf } from '../ds-tokens.js';
import { NEWS, newsForLearner, learnerSince } from './news.js';
import { halloween } from './halloween.js';
import { raceView, raceClaimed, RACE } from './friends.js';

const HOUR = 3600 * 1000;
// виды уведомлений: подпись в настройках и включено ли по умолчанию
export const NOTIFY_KINDS = [
  { id: 'streak', title: 'Серия и цель дня', text: 'Напомнить, если сегодня ещё не занимались' },
  { id: 'league', title: 'Лига', text: 'Обогнали, зона повышения или понижения, итоги недели' },
  { id: 'garden', title: 'Сад и копилка', text: 'Урожай созрел, грядке нужна вода, вклад готов' },
  { id: 'path', title: 'Путь и задания', text: 'Сундук не открыт, ошибки и задачи учебника ждут повторения, испытание месяца, изредка — глава учебника к юниту' },
  { id: 'news', title: 'Новости', text: 'Вышел новый выпуск «Что нового»' },
  { id: 'friends', title: 'Друзья', text: 'Заявки в друзья, приглашения на забег, итоги забега' },
];
// часы напоминания о серии: с этого часа колокольчик (и браузер, если разрешено) напомнит
export const REMIND_HOURS = [9, 13, 17, 19, 21];
// напоминание о повторении учебника — от стольких задач, которым подошёл срок
export const BOOK_REVIEW_MIN = 5;
/* Учебник — редкое приглашение почитать главу к юниту, который ученик сейчас проходит на Пути.
   Редко и к месту: не чаще раза в BOOK_NUDGE_DAYS дней (окна по дням UTC), только тому, кто занимается
   (отвечал на Пути за последнюю неделю), но не открывал учебник BOOK_QUIET_DAYS дней, и только если глава
   этого юнита ещё не отмечена прочитанной. book — прогресс учебника { read, days } (src/textbook/progress.js). */
export const BOOK_NUDGE_DAYS = 14;
export const BOOK_QUIET_DAYS = 10;
export function bookNudge(learn, now, book) {
  if (!book) return null;
  const st = pathState(learn).find((s) => s.current && !s.complete && !s.tested);
  if (!st || (book.read || {})[st.course.id]) return null;
  const day = dayOf(now);
  const last = Math.max(learn.recentAt || 0, ...Object.values(learn.lessons || {}).map((l) => l.at || 0));
  if (!last || now - last > 7 * 24 * HOUR) return null;
  const studied = Object.keys(book.days || {}).filter((k) => book.days[k] > 0).sort().pop();
  if (studied && studied > addDays(day, -BOOK_QUIET_DAYS)) return null;
  const slot = Math.floor(Math.round(dayAt(day, 0) / (24 * HOUR)) / BOOK_NUDGE_DAYS);
  return { unitId: st.course.id, title: unitTitle(st.course.id), slot };
}
export const DEFAULT_PREFS = { streak: true, league: true, garden: true, path: true, news: true, friends: true, browser: false, remindAt: 19 };

const store = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};
export const readPrefs = () => ({ ...DEFAULT_PREFS, ...store.get('ems-notify-prefs', {}) });
export const writePrefs = (p) => store.set('ems-notify-prefs', { ...readPrefs(), ...p });
export const readSeen = () => store.get('ems-notify-seen', {});
// отметить прочитанными: храним не больше 300 последних, старые ключи (прошедшие дни) уходят сами
export function markSeen(ids, now = Date.now()) {
  const seen = { ...readSeen() };
  ids.forEach((id) => { if (!seen[id]) seen[id] = now; });
  const keep = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 300);
  store.set('ems-notify-seen', Object.fromEntries(keep));
  return Object.fromEntries(keep);
}
/* Плашки сверху: каждое событие всплывает один раз за всё время на этом устройстве — даже если его не
   успели прочитать, а приложение перерисовалось (вышли из урока, вернулись на вкладку). */
export const readToasted = () => store.get('ems-notify-toasted', {});
export function markToasted(id, now = Date.now()) {
  const t = { ...readToasted(), [id]: now };
  store.set('ems-notify-toasted', Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 200)));
}
/* «Ранее» (docs/mechanics.md, «Уведомления»): последние EARLIER_MAX прочитанных — свежее сверху. Прочитанное
   запоминается снимком (ems-notify-history, до 30), поэтому в «Ранее» остаётся и то, чего в расчёте уже нет. */
export const EARLIER_MAX = 3;
const HISTORY_KEY = 'ems-notify-history';
export const readHistory = () => { const v = store.get(HISTORY_KEY, []); return Array.isArray(v) ? v.filter((n) => n && n.id && Number.isFinite(n.at)) : []; };
export function rememberNotes(notes) {
  if (!notes.length) return readHistory();
  const by = new Map(readHistory().map((n) => [n.id, n]));
  notes.forEach((n) => { const { id, kind, icon, tone, title, text, at, go, chapter, login } = n; by.set(id, { id, kind, icon, tone, title, text, at, go, chapter, login }); });
  const keep = [...by.values()].sort((a, b) => b.at - a.at).slice(0, 30);
  store.set(HISTORY_KEY, keep);
  return keep;
}
// list — уведомления сейчас, history — снимки прочитанного, seen — прочитанные id, skip — id, которых в «Ранее» нет
// (новые на экране и смахнутые)
export function earlierOf(list, history, seen, skip = {}, max = EARLIER_MAX) {
  const by = new Map(history.map((n) => [n.id, n]));
  list.forEach((n) => { if (seen[n.id] || by.has(n.id)) by.set(n.id, n); });
  return [...by.values()].filter((n) => !skip[n.id] && (seen[n.id] || history.some((h) => h.id === n.id)))
    .sort((a, b) => b.at - a.at).slice(0, max);
}
export const readPushed = () => store.get('ems-notify-pushed', {});
export function markPushed(id, now = Date.now()) {
  const p = { ...readPushed(), [id]: now };
  store.set('ems-notify-pushed', Object.fromEntries(Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 200)));
}

const place = (n) => `${n}-е место`;
// «подсолнух», «подсолнух и мята», «подсолнух, мята и тыква», «подсолнух, мята и ещё 2»; одинаковые — «мята ×2»
export function plantList(names) {
  const n = new Map(); names.forEach((x) => n.set(x, (n.get(x) || 0) + 1));
  const u = [...n].map(([x, k]) => (k > 1 ? `${x} ×${k}` : x));
  if (u.length <= 1) return u.join('');
  if (u.length <= 3) return `${u.slice(0, -1).join(', ')} и ${u[u.length - 1]}`;
  return `${u.slice(0, 2).join(', ')} и ещё ${u.length - 2}`;
}
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/* Уведомления к моменту now. opts.since — первый день ученика (новости до него не «новые»),
   opts.prefs — включённые виды. Каждое: id (одно и то же событие — один id), kind (вид для
   настроек), icon, tone (цвет значка), title, text, at (когда случилось), go (куда ведёт касание:
   path | league | shop | garden | piggy | tasks | news | friends | book-review | book-chapter (с chapter) | rename), toast — показать плашкой, если появилось,
   пока приложение открыто, push — можно отправить в браузер. */
export function notificationsOf(learn, now = Date.now(), opts = {}) {
  const prefs = { ...DEFAULT_PREFS, ...opts.prefs };
  const day = dayOf(now);
  // «день key, час h» по всемирному времени (дни — UTC, src/textbook/learn-state.js); будущее — не позже «сейчас»
  const at = (key, h) => Math.min(now, dayAt(key, h));
  const hour = new Date(now).getHours();
  const out = [];
  /* списание монет дюпа (src/learn/audit.js): честно и один раз — сколько списано и что вернулось в лавку;
     всплывает плашкой и не отключается в настройках, как и «Смените ник» */
  const fine = (learn.fines || {})['dupe-2026-11'];
  if (fine && fine.coins > 0) {
    const names = Object.keys(fine.items || {}).map((id) => (OUTFIT_BY_ID[id] ? `«${OUTFIT_BY_ID[id].title}»` : null)).filter(Boolean);
    out.push({ id: 'fine:dupe-2026-11', kind: 'path', icon: 'shield-alert', tone: '#B8423A', at: Math.min(now, fine.at), go: 'shop', toast: true,
      title: 'Исправили ошибку с монетами',
      text: `Из-за ошибки бонусы серии выплачивались снова и снова. Лишние ${fine.coins} ${coinsWord(fine.coins)} списаны.`
        + (fine.piggy ? ` Вклад в копилке закрыт: ${fine.piggy.n} ${coinsWord(fine.piggy.n)} из него пошли на списание.` : '')
        + (names.length ? ` Купленное на них вернулось в лавку: ${names.join(', ')} — ${fine.refund} ${coinsWord(fine.refund)} снова в кошельке.` : '') });
  }
  // второй проход списания (8 ноября 2026): монеты дюпа лежали в копилке — вклад закрыт, при нужде откачены покупки
  const pass = (learn.fines || {})['dupe-2026-11-piggy'];
  if (pass && (pass.piggy || Object.keys(pass.items || {}).length)) {
    const names = Object.keys(pass.items || {}).map((id) => (OUTFIT_BY_ID[id] ? `«${OUTFIT_BY_ID[id].title}»` : null)).filter(Boolean);
    out.push({ id: 'fine:dupe-2026-11-piggy', kind: 'path', icon: 'shield-alert', tone: '#B8423A', at: Math.min(now, pass.at), go: pass.piggy ? 'piggy' : 'shop', toast: true,
      title: 'Списание дошло до копилки',
      text: 'Часть монет из-за ошибки с бонусами серии лежала в копилке, и прошлое списание её не тронуло.'
        + (pass.piggy ? ` Вклад закрыт: ${pass.piggy.n} ${coinsWord(pass.piggy.n)} из него пошли на списание, остальное вложенное — в кошельке.` : '')
        + (names.length ? ` Вернулось в лавку: ${names.join(', ')}.` : '') });
  }
  const add = (n) => { if (prefs[n.kind] !== false) out.push(n); };
  const started = Object.keys(learn.done || {}).length > 0 || Object.keys(learn.lessons || {}).length > 0;

  // серия и цель дня
  const st = streak(learn, now);
  const g = goalToday(learn, now);
  // напоминание — в выбранный час по часам устройства
  const localAt = (h) => { const d = new Date(now); d.setHours(h, 0, 0, 0); return Math.min(now, d.getTime()); };
  if (started && !st.today && hour >= prefs.remindAt) {
    add(st.days > 0
      ? { id: `streak:${day}`, kind: 'streak', icon: 'flame', tone: '#D9822B', at: localAt(prefs.remindAt), go: 'path', push: true,
        title: `Серия ${st.days} ${plural(st.days, 'день', 'дня', 'дней')} ждёт урока`, text: hour >= 21 ? 'До полуночи — один урок, и серия продолжится.' : 'Пять минут сегодня — и серия продолжится.' }
      : { id: `comeback:${day}`, kind: 'streak', icon: 'map', tone: '#C2490B', at: localAt(prefs.remindAt), go: 'path', push: true,
        title: 'Инфля ждёт на Пути', text: 'Одна остановка — три–пять минут, и новая серия начнётся сегодня.' });
  }
  if (g.done >= g.goal && g.goal > 0) {
    add({ id: `goal:${day}`, kind: 'streak', icon: 'target', tone: '#147A45', at: at(day, Math.min(hour, 23)), go: 'tasks', toast: true,
      title: 'Цель дня выполнена', text: `${g.goal} ${plural(g.goal, 'минута', 'минуты', 'минут')} занятий — монеты уже в кошельке.` });
  }

  // лига: только у тех, кто уже набирал опыт
  if (Object.values(learn.xp || {}).some((x) => x > 0)) {
    const ls = leagueState(learn, now);
    const lg = LEAGUE_BY_ID[ls.league];
    const week = ls.week;
    if (ls.rest) {
      const reward = pendingRewards(learn, now);
      const last = ls.history[ls.history.length - 1];
      if (reward.length) {
        const coins = reward.reduce((a, h) => a + h.coins, 0);
        add({ id: `lg-reward:${reward.map((h) => h.week).join(',')}`, kind: 'league', icon: 'trophy', tone: '#9A7413', at: at(day, 0), go: 'league', toast: true, push: true,
          title: 'Награда лиги ждёт', text: `${coins} ${coinsWord(coins)} за призовое место — заберите во вкладке «Лиги».` });
      } else if (last && last.week === week) {
        const to = LEAGUE_BY_ID[last.to];
        add({ id: `lg-result:${week}`, kind: 'league', icon: 'trophy', tone: lg.color, at: at(day, 0), go: 'league',
          title: 'Итоги недели лиги', text: `${place(last.place)} в ${lg.title.replace(/ая$/, 'ой')} лиге. ${last.move === 'up' ? `Новая неделя — в ${to.title.replace(/ая$/, 'ой')}.` : last.move === 'down' ? `Новая неделя — в ${to.title.replace(/ая$/, 'ой')}.` : 'Остаётесь в лиге.'}` });
      }
    } else if (ls.joined) {
      /* Обогнали за последние часы: соперники набрали опыт, а вы — нет. Только если вы сами за эти часы
         не занимались (сразу после своего урока «обогнали» не бывает — ваш опыт уже другой) и не чаще
         раза в день. Сколько опыта нужно, чтобы вернуть место, — честно: обогнать того, кто на нём сейчас. */
      const before = Math.max(at(week, 0), now - 4 * HOUR);
      // когда занимались в последний раз: lessons[].at — время ПЕРВОГО прохождения урока (повтор его не
      // меняет), поэтому ещё и время последнего ответа (recentAt) — иначе «обогнали» после повтора урока
      const lastRun = Math.max(0, learn.recentAt || 0, ...Object.values(learn.lessons || {}).map((l) => (l && l.at) || 0));
      const prev = standings(learn, week, ls.league, before);
      const was = prev.find((r) => r.me).place;
      if (ls.me.place > was && lastRun < before) {
        const by = ls.table.filter((r) => !r.me && r.place < ls.me.place && prev.find((p) => p.id === r.id).place > was);
        const holder = ls.table.find((r) => r.place === was);
        const gap = Math.max(1, holder.xp - ls.me.xp + 1);
        const runs = Math.ceil(gap / LESSON_XP);
        add({ id: `lg-down:${week}:${day}`, kind: 'league', icon: 'trending-down', tone: '#C2490B', at: now - HOUR, go: 'league', toast: true, push: true,
          title: `Вас обогнали — ${place(ls.me.place)}`,
          text: `${by.length ? `Вперёд ${by.length > 1 ? 'вышли' : 'вышел соперник'}: ${by.slice(0, 2).map((r) => r.name).join(' и ')}. ` : ''}До ${was}-го места — ${gap} опыта: ${runs <= 1 ? 'хватит одного урока' : `это примерно ${runs} ${plural(runs, 'урок', 'урока', 'уроков')}`}.` });
      }
      if (ls.me.zone === 'down') {
        add({ id: `lg-zone-down:${week}:${day}`, kind: 'league', icon: 'arrow-down', tone: '#BF3A2B', at: at(day, 9), go: 'league',
          title: 'Вы в зоне понижения', text: `До безопасного места — ${ls.toSafe} опыта. До итогов ${ls.daysLeft} ${plural(ls.daysLeft, 'день', 'дня', 'дней')}.` });
      } else if (ls.me.zone === 'up') {
        add({ id: `lg-zone-up:${week}`, kind: 'league', icon: 'arrow-up', tone: '#147A45', at: at(day, Math.min(hour, 23)), go: 'league', toast: true,
          title: 'Вы в зоне повышения', text: `${place(ls.me.place)} в ${lg.title.replace(/ая$/, 'ой')} лиге. Держитесь до итогов.` });
      }
      if (ls.daysLeft === 1 && hour >= 10) {
        add({ id: `lg-last:${week}`, kind: 'league', icon: 'hourglass', tone: '#9A7413', at: at(day, 10), go: 'league', push: true,
          title: 'Последний день недели лиги', text: `Итоги — в полночь. Сейчас у вас ${place(ls.me.place)}.` });
      }
    }
  }

  /* сад: созрело или нужна вода — одно уведомление на все грядки (раньше каждая грядка присылала своё «нужно
     полить»: посадил шесть — шесть одинаковых). Созрело ещё — id меняется, уведомление всплывает снова;
     «нужна вода» — одно в день, полили часть — в тексте остаются остальные */
  const beds = gardenPlots(learn).plots.filter(Boolean).map((pl) => ({ pl, gr: growth(pl, now), p: PLANT_BY_ID[pl.plant] })).filter((b) => b.p);
  const ripe = beds.filter((b) => b.gr.ripe); const dry = beds.filter((b) => !b.gr.ripe && b.gr.water && b.gr.water.dry);
  if (ripe.length) {
    /* собрали часть урожая — набор созревших меньше, но нового в нём нет: остаётся уже показанное уведомление, а не новое
       (раньше id менялся после каждого сбора и «Созрело» всплывало снова — пункт владельца 08.11, вечер) */
    const shownRipe = Object.entries(learn.shown || {}).map(([k, t]) => [/^[nt]:(ripe:[\d+]+)$/.exec(k), t]).filter(([m]) => m).map(([m, t]) => ({ id: m[1], t }));
    const seenAts = new Set(shownRipe.flatMap((x) => x.id.slice(5).split('+')));
    const ats = ripe.map((b) => String(b.pl.at));
    const known = shownRipe.length && ats.every((a) => seenAts.has(a)) ? shownRipe.sort((x, y) => y.t - x.t)[0].id : null;
    add({ id: known || (ripe.length === 1 ? `ripe:${ripe[0].pl.at}` : `ripe:${ripe.map((b) => b.pl.at).sort((x, y) => x - y).join('+')}`), kind: 'garden', icon: 'sprout', tone: '#4D7C0F',
      at: Math.min(now, Math.max(...ripe.map((b) => b.gr.ripeAt || now))), go: 'garden', toast: true, push: true,
      title: `Созрело: ${plantList(ripe.map((b) => b.p.title.toLowerCase()))}`,
      text: ripe.length === 1 ? 'Соберите урожай в саду — продайте или оставьте в гербарии.' : 'Соберите урожай в саду — продайте или оставьте в гербарии. Грядки освободятся для новых посадок.' });
  }
  if (dry.length) {
    add({ id: `dry:${dayOf(now)}`, kind: 'garden', icon: 'droplet', tone: '#2E5F8A', at: now - 30 * 60 * 1000, go: 'garden', push: true,
      title: dry.length === 1 ? 'Грядке нужна вода' : 'Грядкам нужна вода',
      text: dry.length === 1 ? `${dry[0].p.title} не растёт, пока землю не польют.` : `${capital(plantList(dry.map((b) => b.p.title.toLowerCase())))} — не растут, пока землю не польют.` });
  }
  const pig = piggyState(learn, now);
  if (pig && pig.ripe) {
    add({ id: `piggy:${pig.at}`, kind: 'garden', icon: 'piggy', tone: '#8A6416', at: pig.ripeAt, go: 'piggy', toast: true, push: true,
      title: 'Вклад созрел', text: `${pig.final} ${coinsWord(pig.final)} — заберите в копилке.` });
  }

  // Путь: сундуки, ошибки, испытание месяца
  pathState(learn).filter((s) => s.complete && !hasClaim(learn, chestKey(s.course.id))).forEach((s) => {
    add({ id: `chest:${s.course.id}`, kind: 'path', icon: 'chest', tone: placeOf(s.course.id).color, at: now - 5 * 60 * 1000, go: 'path', toast: true,
      title: `Сундук «${placeOf(s.course.id).place}» ждёт`, text: 'Юнит пройден — внутри монеты.' });
  });
  const mist = practiceIds(learn).length;
  if (mist >= 3 && hour >= 12) {
    add({ id: `mistakes:${day}`, kind: 'path', icon: 'repeat', tone: '#BF3A2B', at: at(day, 12), go: 'tasks',
      title: 'Ошибки ждут повторения', text: `${mist} ${plural(mist, 'упражнение', 'упражнения', 'упражнений')} из прошлых уроков — повторите в «Заданиях».` });
  }
  /* учебник: задачи и вопросы, которым подошёл срок повторения (opts.bookDue — их число, считает экран
     из прогресса учебника). Напоминаем, когда набралось хотя бы BOOK_REVIEW_MIN, — ради одной задачи не дёргаем */
  const due = Math.max(0, Math.round(opts.bookDue || 0));
  if (due >= BOOK_REVIEW_MIN && hour >= 15) {
    add({ id: `book-review:${day}`, kind: 'path', icon: 'book', tone: '#3E6FA8', at: at(day, 15), go: 'book-review', toast: true, push: true,
      title: 'Пора повторить учебник', text: `${due} ${plural(due, 'задача', 'задачи', 'задач')} из учебника — подошёл срок повторения. Это пара минут.` });
  }
  const nudge = bookNudge(learn, now, opts.book);
  if (nudge) {
    add({ id: `book-read:${nudge.slot}`, kind: 'path', icon: 'book', tone: '#8A5A2B', at: at(day, 16), go: 'book-chapter', chapter: nudge.unitId, toast: true, push: true,
      title: 'Загляните в учебник', text: `Глава «${nudge.title}» — про юнит, который вы сейчас проходите. Пара страниц — и задачи на Пути пойдут легче.` });
  }
  const m = monthChallenge(learn, now);
  if (m.claimed) {
    const when = (learn.claimed || {})[m.key] || now;
    if (now - when < 3 * 24 * HOUR) {
      add({ id: `month-done:${m.month}`, kind: 'path', icon: 'calendar', tone: '#9A6300', at: when, go: 'tasks', toast: true,
        title: 'Испытание месяца выполнено', text: `Марка «${m.name}» — в альбоме профиля.` });
    }
  } else if (started && !m.waiting && m.daysLeft <= 5) {
    add({ id: `month:${m.month}:${m.daysLeft <= 2 ? 'last' : 'soon'}`, kind: 'path', icon: 'calendar', tone: '#9A6300', at: at(day, 8), go: 'tasks',
      title: m.daysLeft <= 1 ? 'Испытание месяца: последний день' : `Испытание месяца: ${m.daysLeft} ${plural(m.daysLeft, 'день', 'дня', 'дней')}`, text: `${m.title} — осталось ${m.need} ${m.unit}.` });
  }
  if ((learn.policyLapse || 0) > 0 && now - learn.policyLapse < 7 * 24 * HOUR && (learn.policyLapse > (learn.policyAt || 0))) {
    add({ id: `lapse:${learn.policyLapse}`, kind: 'path', icon: 'shield', tone: '#2E5F8A', at: learn.policyLapse, go: 'shop',
      title: 'Страховка серии прекращена', text: 'Не хватило монет на взнос. Оформить заново можно в лавке.' });
  }

  // Хеллоуин (src/learn/halloween.js): начало сезона, корзина полна, последний день
  const hw = halloween(learn, now);
  if (hw.on && !hw.claimed) {
    const year = hw.key.slice(3);
    if (hw.ready) {
      add({ id: `hw-ready:${year}`, kind: 'path', icon: 'pumpkin', tone: '#B4500F', at: now - 60 * 1000, go: 'path', toast: true, push: true,
        title: `${hw.goal} тыкв собраны!`, text: 'Заберите рамку «Паутина» — карточка Хеллоуина на Пути.' });
    } else if (hw.lastDay) {
      add({ id: `hw-last:${year}`, kind: 'path', icon: 'pumpkin', tone: '#7B3FA0', at: at(day, 10), go: 'path', push: true,
        title: 'Последний день Хеллоуина', text: `Тыкв: ${hw.pumpkins} из ${hw.goal}. Завтра хеллоуинская витрина закроется до следующего года.` });
    } else {
      add({ id: `hw-start:${year}`, kind: 'path', icon: 'pumpkin', tone: '#7B3FA0', at: Math.min(now - 60 * 1000, at(hw.from, 9)), go: 'path', toast: true,
        title: 'Хеллоуин в Инфляции', text: `До 2 ноября: каждый урок — тыква, ${hw.goal} тыкв — рамка «Паутина». В лавке — хеллоуинская витрина.` });
    }
  }

  // новости: только выпуск, вышедший после первого дня ученика — новичку прошлое обновление не новость
  const since = opts.since || null;
  // только свежий выпуск: прошлые — в самой ленте
  const fresh = NEWS[0];
  if (newsForLearner(fresh, since)) {
    add({ id: `news:${fresh.id}`, kind: 'news', icon: 'newspaper', tone: fresh.color, at: Math.min(now - 60 * 1000, at(fresh.date, 9)), go: 'news', toast: true,
      title: 'Что нового в Инфляции', text: fresh.title });
  }

  /* ник нарушает правила (opts.account — профиль, src/account.jsx): сменить до renameBy, иначе блок.
     Отключить в настройках нельзя — вида нет в NOTIFY_KINDS. */
  const acc = opts.account;
  if (acc && acc.renameBy) {
    const date = new Date(acc.renameBy).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    add({ id: `rename:${acc.renameBy}`, kind: 'account', icon: 'shield-alert', tone: '#BF3A2B', at: Math.min(now, acc.renameBy - 7 * 24 * HOUR), go: 'rename', toast: true, push: true,
      title: 'Смените ник', text: `Ник «${acc.name}» нарушает правила. Смените его до ${date} — иначе аккаунт будет заблокирован.` });
  }

  // друзья (opts.friends — ответ сервера, src/lib/friends-store.js): заявки, приглашения на забег, итоги
  const fr = opts.friends;
  if (fr) {
    (fr.incoming || []).forEach((f) => add({ id: `fr-req:${f.login}:${f.at}`, kind: 'friends', icon: 'user-plus', tone: '#2F5D8C', at: Math.min(now, f.at), go: 'friends', toast: true, push: true,
      title: 'Заявка в друзья', text: `${f.name} (@${f.login}) хочет дружить — примите в «Друзьях» профиля.` }));
    const byLogin = Object.fromEntries((fr.friends || []).map((f) => [f.login, f]));
    (fr.races || []).forEach((r) => {
      const v = raceView(r, learn, byLogin[r.other], now);
      if (v.status === 'incoming') {
        add({ id: `race-inv:${r.id}`, kind: 'friends', icon: 'flag', tone: '#BF3A2B', at: Math.min(now, r.at), go: 'path', toast: true, push: true,
          title: `${v.name} зовёт на забег`, text: `Три дня — кто наберёт больше опыта. Ответить — ещё ${v.hoursLeft} ${plural(v.hoursLeft, 'час', 'часа', 'часов')}.` });
      } else if (v.status === 'active') {
        if (r.mine && r.acceptedAt) {
          add({ id: `race-go:${r.id}`, kind: 'friends', icon: 'flag', tone: '#BF3A2B', at: Math.min(now, r.acceptedAt), go: 'path', toast: true,
            title: 'Забег начался', text: `${v.name} принимает вызов: три дня, кто больше опыта.` });
        }
        /* по ходу забега — не тишина (жалоба: «нет никаких уведомлений о гонке»): друг обогнал — раз в день,
           пока вы позади; вышли вперёд; последний день — утром, с тем, кто впереди и на сколько */
        if (v.dayNo > 0 && v.lead < 0) {
          add({ id: `race-behind:${r.id}:${day}`, kind: 'friends', icon: 'flag', tone: '#BF3A2B', at: Math.min(now - 60 * 1000, at(day, 12)), go: 'path', toast: true, push: true,
            title: `${v.name} впереди в забеге`, text: `${v.their} опыта против ваших ${v.my}: не хватает ${v.their - v.my + 1}. До финиша ${v.daysLeft} ${plural(v.daysLeft, 'день', 'дня', 'дней')} — один урок может всё решить.` });
        } else if (v.dayNo > 0 && v.lead > 0 && v.their > 0) {
          add({ id: `race-ahead:${r.id}:${day}`, kind: 'friends', icon: 'flag', tone: '#147A45', at: Math.min(now - 60 * 1000, at(day, 12)), go: 'path',
            title: 'Вы впереди в забеге', text: `${v.my} опыта против ${v.their} — ${v.name} позади. До финиша ${v.daysLeft} ${plural(v.daysLeft, 'день', 'дня', 'дней')} — держите темп.` });
        }
        if (v.daysLeft === 1 && v.dayNo > 0) {
          add({ id: `race-last:${r.id}`, kind: 'friends', icon: 'hourglass', tone: '#9A7413', at: Math.min(now - 60 * 1000, at(day, 9)), go: 'path', toast: true, push: true,
            title: 'Последний день забега', text: v.lead > 0 ? `Вы впереди на ${v.my - v.their} опыта — не сбавляйте.` : v.lead < 0 ? `${v.name} впереди на ${v.their - v.my} опыта — сегодня ещё можно догнать.` : 'Пока ничья — сегодня всё решится.' });
        }
      } else if ((v.status === 'declined' || v.status === 'expired') && r.mine && now - (r.answeredAt || r.at) < 3 * 24 * HOUR) {
        add({ id: `race-no:${r.id}`, kind: 'friends', icon: 'flag', tone: '#8A7F72', at: Math.min(now, r.answeredAt || (r.at + RACE.acceptHours * HOUR)), go: 'path',
          title: v.status === 'declined' ? 'Забег отклонён' : 'Приглашение на забег истекло', text: v.status === 'declined' ? `${v.name}: пока без забега. Позовите позже — или другого друга.` : `${v.name}: ответа не было сутки. Позвать можно снова.` });
      } else if (v.status === 'finished' && !raceClaimed(learn, v)) {
        add({ id: `race-end:${r.id}`, kind: 'friends', icon: 'trophy', tone: '#9A7413', at: at(addDays(v.end, 1), 0), go: 'path', toast: true, push: true,
          title: v.result === 'won' ? 'Забег выигран!' : v.result === 'tie' ? 'Забег: ничья' : 'Забег окончен', text: `Вы — ${v.my} опыта, ${v.name} — ${v.their}. Награда — на Пути.` });
      }
    });
  }

  return out.filter((n) => n.at <= now + 60 * 1000).sort((a, b) => b.at - a.at);
}
// непрочитанные — те, которых нет в seen
export const unreadOf = (list, seen) => list.filter((n) => !seen[n.id]);

// первый день ученика: регистрация или самое раннее занятие (нет ничего — сегодня); выпуски этого дня и раньше — не новость
export const firstDayOf = (learn, now = Date.now()) => learnerSince(learn, now);

// «только что», «12 мин назад», «3 ч назад», «вчера», «15 октября»
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function agoText(ts, now = Date.now()) {
  const d = Math.max(0, now - ts);
  if (d < 2 * 60 * 1000) return 'только что';
  if (d < HOUR) return `${Math.floor(d / 60000)} мин назад`;
  if (dayOf(ts) === dayOf(now)) return `${Math.floor(d / HOUR)} ч назад`;
  if (dayOf(ts) === addDays(dayOf(now), -1)) return 'вчера';
  const t = new Date(ts);
  return `${t.getDate()} ${MONTHS_GEN[t.getMonth()]}`;
}
