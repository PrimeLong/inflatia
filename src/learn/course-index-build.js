/* УКАЗАТЕЛЬ КУРСА — что Путь знает об уроках до загрузки глав (src/learn/course-core.js). Собирается из полного
   курса: при сборке сайта — один раз (scripts/course-index-plugin.js), в тестах — так же, через тот же плагин.
   Модуль тяжёлый (тянет все главы) и в сам сайт не попадает: его результат — готовые данные. */
import { UNITS, EXERCISES, buildLesson, practiceUnitOf } from './course.js';
import { GAME_KINDS, lessonMeta } from './course-core.js';
import { TEMPLATES, seeded } from '../textbook/variants.js';
import { PROBLEMS, CHAPTER_SECTIONS } from '../textbook/content.js';
import { maxLessonXp, XP } from '../textbook/learn-state.js';

/* id задания → юнит: всё, что может лежать в ошибках ученика и решается в практике — упражнения уроков (без мини-игр
   и открытых вопросов), варианты с новыми числами (var:<id>), задачи учебника (сами и как auto:<id>) */
export function mistakeUnitsMap() {
  const out = {};
  const keys = [...Object.keys(EXERCISES), ...TEMPLATES.map((t) => `var:${t.id}`), ...Object.keys(PROBLEMS).flatMap((pid) => [pid, `auto:${pid}`])];
  keys.forEach((id) => { const u = practiceUnitOf(id); if (u) out[id] = u; });
  return out;
}

/* та же карта в указателе — по юнитам: { юнит: "id id id" }. Пара «id: юнит» на каждое задание — 1–2 тысячи раз имя
   юнита; так указатель на ~40 КБ легче, и стартовый чанк course-core не упирается в предел 400 КБ (25.11: 29 новых
   заданий «Данные» и ЕГЭ — и сборка падала). Распаковывает installCourse (src/learn/course-core.js) */
export function packMistakeUnits(map) {
  const out = {};
  Object.entries(map).forEach(([id, u]) => {
    if (/\s/.test(id)) throw new Error(`id задания с пробелом не упаковать: «${id}»`);
    out[u] = out[u] ? `${out[u]} ${id}` : id;
  });
  return out;
}

// минуты и опыт на билете урока: как считает сам урок (все ответы верны и подряд, мини-игры — на максимум)
function ticket(lessonId, opts) {
  try {
    const p = buildLesson(lessonId, seeded(7), opts);
    const games = p.items.filter((it) => GAME_KINDS.includes(it.kind)).length;
    return { min: Math.max(2, Math.round(p.seconds / 60)), xp: maxLessonXp(p.items.length, games) };
  } catch { return null; }
}

export function buildCourseIndex() {
  const units = UNITS.map((u) => ({
    id: u.id, title: u.title, part: u.part, ready: u.ready, level: u.level, order: u.order,
    lessons: u.lessons.map((l) => {
      const base = ticket(l.id) || { min: 2, xp: 0 };
      const gem = ticket(l.id, { diamond: true });
      return {
        id: l.id, unitId: l.unitId, no: l.no, title: l.title, kind: l.kind, section: l.section || null, ...lessonMeta(l),
        min: base.min, xp: base.xp, ...(gem ? { gemMin: gem.min, gemXp: Math.round(gem.xp * XP.diamond) } : {}),
      };
    }),
  }));
  // разделы, к которым привязаны уроки: напоминание о теории перед уроком (src/learn/program.js)
  const sections = {};
  UNITS.forEach((u) => {
    const used = new Set(u.lessons.map((l) => l.section).filter(Boolean));
    const list = (CHAPTER_SECTIONS[u.id] || []).filter((s) => used.has(s.id)).map((s) => ({ id: s.id, title: s.title, minutes: s.minutes, recall: s.recall || null }));
    if (list.length) sections[u.id] = list;
  });
  return { units, mistakeUnits: packMistakeUnits(mistakeUnitsMap()), sections };
}
export default buildCourseIndex;
