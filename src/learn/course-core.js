/* ЛЁГКОЕ ЯДРО КУРСА — всё, что нужно, чтобы нарисовать Путь: уровни, юниты, уроки (название, вид, порядок),
   состояние Пути (что открыто, что пройдено, где «Работа над ошибками») — без текстов глав
   (docs/mechanics.md, «Приветствие и загрузка»).

   Откуда данные. Уроки курса написаны в главах учебника (src/textbook/chapters/*.md); раньше Путь ждал все главы,
   чтобы узнать список уроков. Теперь при сборке из тех же глав собирается УКАЗАТЕЛЬ КУРСА (virtual:course-index,
   scripts/course-index-plugin.js; что в него входит — src/learn/course-index-build.js): по уроку — id, название,
   вид, раздел, минуты и опыт на билете, виды заданий, графики шагов; id заданий, которые могут попасть в ошибки,
   с их юнитом; разделы учебника, к которым привязаны уроки.

   Полные уроки (шаги, упражнения, слова) собирает тяжёлая часть — src/learn/course.js — и дополняет ТЕ ЖЕ объекты
   (hydrateCourse): урок до и после загрузки глав — один и тот же объект. course.js грузится, когда начинается урок,
   открывается учебник или проверка, и в фоне после простоя.

   Правило для кода: модули Пути (rewards, program, grade, notify, levelmap…) берут курс отсюда и не читают у урока
   exercises, inner, idea, terms и hard — этих полей до загрузки глав нет. */
import INDEX from 'virtual:course-index';
import { LEVELS, UNIT_LEVEL } from '../textbook/levels.js';
import { CHAPTER_BY_ID } from '../textbook/toc.js';
import { extraLocks } from './stops.js';
import { TRACK } from './track.js';

export { LEVELS, UNIT_LEVEL };
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l, k) => [l.id, { ...l, no: k + 1 }]));
export const levelOf = (unitId) => LEVEL_BY_ID[UNIT_LEVEL[unitId] || 'pro'];

// мини-игры: у них свой счёт внутри, в проверку юнита и повторение они не идут
export const GAME_KINDS = ['swipe', 'rush', 'wallet'];
export const LESSON_KIND = {
  intro: 'Знакомство', practice: 'Практика', words: 'Слова', story: 'История', listen: 'Слушай', game: 'Мини-игра', review: 'Повторение', summary: 'Итоги юнита',
};
/* Практика: ошибки прошлых уроков (по id упражнения), не больше двенадцати. Если ошибок
   мало — добираем до восьми упражнениями из слабых тем. */
export const PRACTICE_MIN = 8;
export const PRACTICE_MAX = 12;
export const LEVEL_REVIEW_SIZE = 15;

/* ------------------------------ ЮНИТЫ И УРОКИ ------------------------------
   Массивы и словари заполняются на месте (installCourse): модули, которые их импортировали, видят данные
   без повторного импорта. */
export const UNITS = [];
export const UNIT_BY_ID = {};
export const LESSONS = [];
export const LESSON_BY_ID = {};
// id задания, которое можно решить в практике, → его юнит (упражнения уроков без мини-игр и открытых вопросов, задачи и варианты)
const MISTAKE_UNIT = {};
// разделы учебника, к которым привязаны уроки: { глава: [{ id, title, minutes, recall }] } — для напоминания о теории
export const LESSON_SECTIONS = {};
let hydrated = false;

/* Лёгкие поля урока, которые считаются из полного урока: графики шагов (где встаёт «Разбор графика»), виды заданий
   без алмазных (детали живой модели), число шагов «Откройте сами», число слов, есть ли алмазная теория. */
export function lessonMeta(l) {
  const steps = [l.idea, ...(l.inner || []).map((c) => c.idea)].filter(Boolean);
  return {
    charts: [...new Set(steps.map((b) => b.chart).filter(Boolean))],
    kinds: (l.exercises || []).filter((e) => !e.diamond).map((e) => e.kind),
    discover: (l.inner || []).filter((c) => c.discover).length,
    words: (l.terms || []).length,
    gemTheory: (l.inner || []).some((c) => c.diamond),
  };
}
function fill(units) {
  UNITS.length = 0; LESSONS.length = 0;
  Object.keys(UNIT_BY_ID).forEach((k) => delete UNIT_BY_ID[k]);
  Object.keys(LESSON_BY_ID).forEach((k) => delete LESSON_BY_ID[k]);
  units.forEach((u) => { UNITS.push(u); UNIT_BY_ID[u.id] = u; u.lessons.forEach((l) => { LESSONS.push(l); LESSON_BY_ID[l.id] = l; }); });
}
// указатель курса: юниты с лёгкими уроками, карта «задание → юнит», разделы
export function installCourse(index) {
  // свои копии: полный курс потом дополняет эти объекты, а сам указатель остаётся как был
  fill(index.units.map((u) => ({ ...u, lessons: u.lessons.map((l) => ({ ...l, charts: [...l.charts], kinds: [...l.kinds] })) })));
  Object.keys(MISTAKE_UNIT).forEach((k) => delete MISTAKE_UNIT[k]);
  Object.assign(MISTAKE_UNIT, index.mistakeUnits || {});
  Object.keys(LESSON_SECTIONS).forEach((k) => delete LESSON_SECTIONS[k]);
  Object.assign(LESSON_SECTIONS, index.sections || {});
}
/* Полные уроки из глав (src/learn/course.js). Указатель уже установлен — дополняем те же объекты уроков; указателя нет
   (так собирается сам указатель) — полные уроки и становятся курсом. */
export function hydrateCourse(fullUnits) {
  if (!UNITS.length) {
    fullUnits.forEach((u) => u.lessons.forEach((l) => Object.assign(l, lessonMeta(l))));
    fill(fullUnits);
  } else {
    fullUnits.forEach((fu) => fu.lessons.forEach((fl) => {
      const l = LESSON_BY_ID[fl.id];
      if (!l) throw new Error(`Указатель курса устарел: в нём нет урока ${fl.id} — пересоберите сайт`);
      Object.assign(l, fl);
    }));
  }
  hydrated = true;
}
export const courseHydrated = () => hydrated;
// для указателя: карта «задание → юнит» считается тяжёлой частью, когда курс собран целиком
export function installMistakeUnits(map) { Object.keys(MISTAKE_UNIT).forEach((k) => delete MISTAKE_UNIT[k]); Object.assign(MISTAKE_UNIT, map); }
/* указатель собран для курса экономики; у пробного курса политологии (src/learn/track.js) указателя нет — его курс
   целиком ставит course.js, который оболочка в этом случае грузит до вкладки обучения (src/MacroSimulator.jsx) */
if (INDEX && TRACK === 'econ') installCourse(INDEX);

export const pilotUnits = () => UNITS.filter((u) => u.lessons.length);
export const levelUnits = (levelId) => pilotUnits().filter((u) => u.level === levelId);

/* Что из ошибок можно решить в практике: упражнения уроков (кроме мини-игр и открытых
   вопросов) и задачи семинарского уровня из уроков. Ошибки, которых в практике нет, на
   «Повторить ошибки» не считаются — иначе счётчик не пустел бы никогда. */
export const mistakeUnit = (id) => MISTAKE_UNIT[id] || null;
export const canPractice = (id) => !!MISTAKE_UNIT[id];
export const practiceIds = (learn) => (learn.mistakes || []).map((m) => m.id).filter(canPractice);

/* ------------------------------ СОСТОЯНИЕ ПУТИ ------------------------------
   Урок открыт, если пройден предыдущий урок Пути (первый урок — всегда) или юнит сдан
   проверкой / открыт вступительным тестом. Пройден — только если урок доведён до конца
   (runs > 0): проверка и тест уроки открывают, но не засчитывают. Юнит пройден, когда
   пройдены все его уроки — тогда и сундук. diamond — урок взят на алмазном уровне. */
/* РАБОТА НАД ОШИБКАМИ (docs/mechanics.md, «Работа над ошибками»): набралось в юните FIX_MIN
   нерешённых ошибок — на Пути перед следующим уроком встаёт обязательный урок из этих ошибок, и
   дальше Путь не пускает, пока его не пройти. Не больше одного на юнит (learn.fixed). Встаёт только
   там, где ученик сейчас: перед первым непройденным уроком юнита — или в конце юнита, если ошибки
   набрались в последнем уроке; в пройденных давно юнитах задним числом не появляется. */
export const FIX_MIN = 6;
export const fixIds = (learn, unitId) => (learn.mistakes || []).map((m) => m.id).filter((id) => mistakeUnit(id) === unitId);
export const fixDue = (learn, unitId) => !(learn.fixed || {})[unitId] && !((learn.units || {})[unitId] || {}).tested && fixIds(learn, unitId).length >= FIX_MIN;
// урок — ровно ошибки юнита (свежие, если их больше двенадцати), без добора: сколько на значке, столько заданий
export const fixCount = (learn, unitId) => Math.min(PRACTICE_MAX, fixIds(learn, unitId).length);

/* в автотестах замок уровня выключен (как замок особых уроков, src/learn/stops.js): длинные сценарии ставят пройденный
   уровень и идут дальше; тест большого повторения включает его сам (ems-level-test) */
const levelGateOff = () => {
  try { return typeof navigator !== 'undefined' && !!navigator.webdriver && localStorage.getItem('ems-level-test') !== '1'; } catch { return false; }
};
/* До какого уровня курса дошёл ученик (индекс в LEVELS): самый высокий уровень юнита, в котором он учится или
   который закончил (пройден или сдан проверкой). Его читает «Мир» (src/lib/disclosure.js): с «Среднего» компас
   ставки и риски открыты сразу. Раньше уровень искали через LEVELS.indexOf(levelOf(...)) — levelOf отдаёт копию
   объекта, indexOf её не находил, и уровень всегда был «Начальный» (пункт владельца 15.11: «давно на
   продвинутом», а «Мир» ждал «Средний»). */
export function reachedLevel(states) {
  let top = 0;
  (states || []).forEach((st) => {
    if (st.current || st.complete || st.tested || st.lessons.some((l) => l.done)) top = Math.max(top, levelOf(st.course.id).no - 1);
  });
  return top;
}
export function pathState(learn) {
  // Путь сквозной: первый урок юнита открывается, когда пройден последний урок прошлого юнита
  // или прошлый юнит сдан проверкой
  let prevDone = true; let frontier = false;
  /* особый урок, которого ждёт следующий: он и есть текущая остановка юнита (waiting, current —
     { id, title, extra }); если он стоит после последнего урока, его ждёт первый урок следующего юнита */
  let pending = null;
  const out = [];
  /* «Большое повторение» в конце уровня: первый урок нового уровня ждёт его, если уровень ещё не начат
     (ни урока, ни сданного юнита); начатый раньше — не останавливаем задним числом */
  let prevLevel = null; let gate = null;
  const levelStarted = (levelId) => pilotUnits().some((x) => x.level === levelId
    && (!!(learn.units || {})[x.id] || x.lessons.some((l) => ((learn.lessons || {})[l.id] || {}).runs > 0)));
  pilotUnits().forEach((u) => {
    if (prevLevel && u.level !== prevLevel) {
      const last = out[out.length - 1];
      // весь уровень сдан тестами (тест уровня, вступительный тест) — повторение засчитано: знания уже проверены
      const allTested = pilotUnits().filter((x) => x.level === prevLevel).every((x) => !!(learn.units || {})[x.id]);
      const review = { levelId: prevLevel, title: `Большое повторение: ${LEVEL_BY_ID[prevLevel].title.toLowerCase()} уровень`, done: !!((learn.levels || {})[prevLevel] || {}).at || allTested };
      if (last) last.levelReview = review;
      if (prevDone && !review.done && !levelGateOff() && !levelStarted(u.level)) {
        prevDone = false;
        const w = { id: `level:${prevLevel}`, title: review.title, extra: 'level-review', levelId: prevLevel };
        if (last && !last.current) last.current = w;
        gate = w;
      }
    }
    prevLevel = u.level;
    const tested = !!(learn.units || {})[u.id];
    const lessons = [];
    // особые уроки дороги (Персоналии, Чтение, Разбор графика) — такие же уроки: следующий ждёт их
    const extras = extraLocks(u, learn);
    u.lessons.forEach((l, i) => {
      const entry = learn.lessons[l.id];
      const done = !!(entry && entry.runs > 0);
      let open = done || prevDone || tested;
      let fixLock = false;
      if (!open && pending) {
        const w = { id: pending.e.id, title: pending.e.title, extra: pending.e.type };
        if (pending.st) { pending.st.waiting = w; if (!pending.st.current) pending.st.current = w; } else lessons.waiting = w;
        pending = null;
      }
      // первый урок уровня ждёт большого повторения прошлого
      const levelWait = i === 0 && gate && !open ? gate.levelId : null;
      if (i === 0) gate = null;
      // первый непройденный урок Пути: не набралось ли ошибок — в этом юните или в только что пройденном прошлом
      if (open && !done && !tested && !frontier) {
        frontier = true;
        const prev = out[out.length - 1];
        const owner = i > 0 && lessons.some((x) => x.done) ? { st: null, unitId: u.id, at: i }
          : i === 0 && prev && prev.complete ? { st: prev, unitId: prev.course.id, at: prev.lessons.length } : null;
        if (owner && fixDue(learn, owner.unitId)) {
          open = false; fixLock = true;
          const fix = { unitId: owner.unitId, at: owner.at, count: fixCount(learn, owner.unitId) };
          if (owner.st) owner.st.fix = fix; else lessons.fix = fix;
        }
      }
      // пропущенный «Слушай» открывает следующий урок, но сам остаётся не пройденным
      const skipped = !done && open && !!(learn.skipped || {})[l.id];
      const waits = (extras[i] || []).filter((e) => !e.done);
      prevDone = (done || tested || skipped) && !fixLock && (tested || !waits.length);
      pending = (done || skipped) && !tested && waits.length ? { e: waits[0], st: null } : null;
      lessons.push({ id: l.id, no: l.no, title: l.title, done, open, diamond: !!(done && entry.diamond), ...(skipped ? { skipped: true } : {}), ...(fixLock ? { fixLock: true } : {}),
        ...(waits.length && !tested ? { waits: waits.map((e) => e.type) } : {}), ...(levelWait ? { levelWait } : {}) });
    });
    const current = lessons.find((l) => l.open && !l.done && !l.skipped) || lessons.waiting || lessons.find((l) => l.open && !l.done) || null;
    out.push({ course: u, lessons: [...lessons], current, complete: lessons.every((l) => l.done), tested, fix: lessons.fix || null, waiting: lessons.waiting || null });
    if (pending) pending.st = out[out.length - 1];
  });
  // последний уровень с уроками: его большое повторение — после последнего юнита
  const last = out[out.length - 1];
  if (last && prevLevel) last.levelReview = { levelId: prevLevel, title: `Большое повторение: ${LEVEL_BY_ID[prevLevel].title.toLowerCase()} уровень`, done: !!((learn.levels || {})[prevLevel] || {}).at };
  return out;
}
export const unitTitle = (id) => (CHAPTER_BY_ID[id] || {}).title || id;
