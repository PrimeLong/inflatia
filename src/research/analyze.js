/* Анализ по заранее зафиксированному плану (research/analysis-plan.md). На входе — выгрузка исследовательской базы
   { participants, events, tests } (только поля словаря dictionary.js), на выходе — таблицы отчёта (research/results.md).
   Всё, что здесь считается, названо в плане анализа до сбора данных; разведочный анализ сюда не добавляется задним числом —
   он идёт отдельным разделом отчёта с пометкой «разведочный». */
import { ARMS, STAGES } from './dictionary.js';
import { mean, sd, median, welch, hedgesG, mannWhitney, fisherExact, diffProportions, ancova, kr20, holm } from './stats.js';

// пилот или полноценное сравнение: тип задаёт протокол, а не число участников (research/protocol.md, «Тип исследования»)
export const STUDY_TYPES = ['pilot', 'confirmatory'];
export const ALPHA = 0.05;

const byArm = (rows) => Object.fromEntries(ARMS.map((a) => [a, rows.filter((r) => r.arm === a)]));
const round = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

// доля верных по тесту каждого участника: { код → доля }
function testScores(tests, kind) {
  const acc = new Map();
  for (const t of tests.filter((x) => x.test_kind === kind)) {
    const cur = acc.get(t.participant_code) || { right: 0, total: 0 };
    cur.total += 1; if (t.correct) cur.right += 1;
    acc.set(t.participant_code, cur);
  }
  return new Map([...acc].map(([k, v]) => [k, v.right / v.total]));
}
// матрица 0/1 по задачам теста (только участники, ответившие на все задачи этой формы) — для KR-20
function itemMatrix(tests, kind) {
  const rows = tests.filter((x) => x.test_kind === kind);
  const items = [...new Set(rows.map((r) => r.item_id))].sort();
  const people = new Map();
  for (const r of rows) { if (!people.has(r.participant_code)) people.set(r.participant_code, {}); people.get(r.participant_code)[r.item_id] = r.correct ? 1 : 0; }
  return [...people.values()].filter((p) => items.every((i) => i in p)).map((p) => items.map((i) => p[i]));
}

export function analyze({ participants, events, tests }, { studyType, moduleLessons, testWindowDays = [28, 35] }) {
  if (!STUDY_TYPES.includes(studyType)) throw new Error('тип исследования задаёт протокол: pilot или confirmatory');
  const groups = byArm(participants.filter((p) => p.arm));
  const flow = {
    enrolled: participants.length,
    randomized: Object.fromEntries(ARMS.map((a) => [a, groups[a].length])),
    // дошли до этапа или дальше
    reached: Object.fromEntries(ARMS.map((a) => [a, Object.fromEntries(['material', 'posttest', 'delayed'].map((s) => [s, groups[a].filter((p) => STAGES.indexOf(p.stage) >= STAGES.indexOf(s)).length]))])),
  };
  const pre = testScores(tests, 'pre'); const post = testScores(tests, 'post'); const delayed = testScores(tests, 'delayed');
  // отсроченный тест засчитывается только в окне дней, заданном протоколом
  const inWindow = new Set(tests.filter((t) => t.test_kind === 'delayed' && t.study_day >= testWindowDays[0] && t.study_day <= testWindowDays[1]).map((t) => t.participant_code));

  // вовлечённость по событиям
  const perPerson = (code) => {
    const ev = events.filter((e) => e.participant_code === code);
    const done = new Set(ev.filter((e) => e.event_type === 'lesson_done').map((e) => e.lesson_id));
    const answers = ev.filter((e) => e.event_type === 'exercise_answer');
    const first = answers.filter((e) => e.attempt_no === 1);
    return {
      lessonsDone: moduleLessons.filter((l) => done.has(l)).length,
      completed: moduleLessons.every((l) => done.has(l)),
      activeDays: new Set(ev.map((e) => e.study_day)).size,
      // активное время уроков: у события «урок закончен» — секунды без простоя за весь урок
      activeMinutes: ev.filter((e) => e.event_type === 'lesson_done').reduce((s, e) => s + (e.active_seconds || 0), 0) / 60,
      firstTry: first.length ? first.filter((e) => e.correct).length / first.length : null,
    };
  };
  const eng = Object.fromEntries(ARMS.map((a) => [a, groups[a].map((p) => perPerson(p.participant_code))]));

  // основной показатель 1: завершили модуль (анализ по назначенной группе — все рандомизированные)
  const doneG = eng.game.filter((e) => e.completed).length; const doneP = eng.plain.filter((e) => e.completed).length;
  const completion = { ...diffProportions(doneG, eng.game.length, doneP, eng.plain.length), x: [doneG, doneP], n: [eng.game.length, eng.plain.length],
    p: fisherExact([[doneG, eng.game.length - doneG], [doneP, eng.plain.length - doneP]]) };

  // основной показатель 2: отсроченный тест с поправкой на входной (только прошедшие оба теста в окне)
  const paired = (scores, needWindow) => participants.filter((p) => p.arm && pre.has(p.participant_code) && scores.has(p.participant_code) && (!needWindow || inWindow.has(p.participant_code)));
  const model = (scores, needWindow) => {
    const rows = paired(scores, needWindow);
    const n = Object.fromEntries(ARMS.map((a) => [a, rows.filter((r) => r.arm === a).length]));
    if (n.game < 2 || n.plain < 2) return { n, enough: false };
    const a = ancova(rows.map((r) => scores.get(r.participant_code)), rows.map((r) => pre.get(r.participant_code)), rows.map((r) => (r.arm === 'game' ? 1 : 0)));
    const g = hedgesG(rows.filter((r) => r.arm === 'game').map((r) => scores.get(r.participant_code)), rows.filter((r) => r.arm === 'plain').map((r) => scores.get(r.participant_code)));
    return { n, enough: true, ...a, g: g.g, gCi: g.ci };
  };
  const retention = model(delayed, true);
  const [pCompletion, pRetention] = holm([completion.p, retention.enough ? retention.p : 1]);

  // вторичные показатели
  const immediate = model(post, false);
  const cmp = (key) => {
    const a = eng.game.map((e) => e[key]).filter((v) => v !== null); const b = eng.plain.map((e) => e[key]).filter((v) => v !== null);
    if (a.length < 2 || b.length < 2) return { enough: false };
    return { enough: true, median: [median(a), median(b)], mean: [mean(a), mean(b)], ...mannWhitney(a, b) };
  };
  const secondary = { lessonsDone: cmp('lessonsDone'), activeDays: cmp('activeDays'), activeMinutes: cmp('activeMinutes'), firstTry: cmp('firstTry') };
  // равенство групп на входе: входной тест по группам (описательно, без проверки значимости — CONSORT)
  const baseline = Object.fromEntries(ARMS.map((a) => { const xs = groups[a].map((p) => pre.get(p.participant_code)).filter((v) => v !== undefined); return [a, { n: xs.length, mean: xs.length ? mean(xs) : null, sd: xs.length > 1 ? sd(xs) : null }]; }));
  const reliability = Object.fromEntries(['pre', 'post', 'delayed'].map((k) => { const m = itemMatrix(tests, k); return [k, m.length > 2 ? kr20(m) : null]; }));
  const confirmatory = studyType === 'confirmatory';
  return {
    studyType, flow, baseline, reliability,
    primary: {
      completion: { ...completion, pHolm: pCompletion, supported: confirmatory ? pCompletion < ALPHA && completion.diff > 0 : null },
      retention: { ...retention, pHolm: retention.enough ? pRetention : null, supported: confirmatory && retention.enough ? pRetention < ALPHA && retention.effect > 0 : null },
    },
    secondary: { immediate, ...secondary },
    welchDelayed: retention.enough ? welch(paired(delayed, true).filter((r) => r.arm === 'game').map((r) => delayed.get(r.participant_code)), paired(delayed, true).filter((r) => r.arm === 'plain').map((r) => delayed.get(r.participant_code))) : null,
  };
}

const pct = (x) => (x === null || x === undefined ? '—' : `${round(x * 100, 1)}%`);
const num = (x, d = 2) => (x === null || x === undefined ? '—' : String(round(x, d)));
const ci = (c, f = num) => (c ? `[${f(c[0])}; ${f(c[1])}]` : '—');
// таблицы для research/results.md: группы — «игровая» и «обычная»; индивидуальных строк нет
export function toMarkdown(r) {
  const pilot = r.studyType === 'pilot';
  const lines = [];
  lines.push(pilot
    ? '> **Пилотное исследование.** Цель — проверить выполнимость и оценить разброс; p-значения ниже описательные, гипотезы этим набором не подтверждаются и не опровергаются.'
    : '> **Сравнительное исследование.** Гипотезы проверяются по основным показателям с поправкой Холма, уровень значимости 0,05.');
  lines.push('', '### Поток участников', '', '| | Игровая | Обычная |', '|---|---|---|');
  lines.push(`| Распределены | ${r.flow.randomized.game} | ${r.flow.randomized.plain} |`);
  for (const [k, label] of [['material', 'Начали материал'], ['posttest', 'Прошли итоговый тест'], ['delayed', 'Прошли отсроченный тест']]) lines.push(`| ${label} | ${r.flow.reached.game[k]} | ${r.flow.reached.plain[k]} |`);
  lines.push('', `Всего записались: ${r.flow.enrolled}.`, '', '### Группы на входе', '', '| | Игровая | Обычная |', '|---|---|---|');
  lines.push(`| Входной тест, среднее (SD) | ${pct(r.baseline.game.mean)} (${pct(r.baseline.game.sd)}) | ${pct(r.baseline.plain.mean)} (${pct(r.baseline.plain.sd)}) |`);
  lines.push('', '### Основные показатели', '', '| Показатель | Игровая | Обычная | Разность [95% ДИ] | p | p (Холм) |', '|---|---|---|---|---|---|');
  const c = r.primary.completion;
  lines.push(`| Завершили модуль | ${c.x[0]} из ${c.n[0]} (${pct(c.p1)}) | ${c.x[1]} из ${c.n[1]} (${pct(c.p2)}) | ${pct(c.diff)} ${ci(c.ci, pct)} | ${num(c.p, 3)} | ${num(c.pHolm, 3)} |`);
  const t = r.primary.retention;
  lines.push(t.enough
    ? `| Отсроченный тест с поправкой на входной | n = ${t.n.game} | n = ${t.n.plain} | ${pct(t.effect)} ${ci(t.ci, pct)}; g = ${num(t.g)} | ${num(t.p, 3)} | ${num(t.pHolm, 3)} |`
    : `| Отсроченный тест с поправкой на входной | n = ${t.n.game} | n = ${t.n.plain} | мало данных | — | — |`);
  lines.push('', '### Вторичные показатели', '', '| Показатель | Игровая | Обычная | Сравнение |', '|---|---|---|---|');
  const im = r.secondary.immediate;
  lines.push(im.enough ? `| Итоговый тест с поправкой на входной | n = ${im.n.game} | n = ${im.n.plain} | ${pct(im.effect)} ${ci(im.ci, pct)}, p = ${num(im.p, 3)} |` : '| Итоговый тест с поправкой на входной | — | — | мало данных |');
  for (const [k, label, f] of [['lessonsDone', 'Пройдено уроков (медиана)', num], ['activeDays', 'Активных дней (медиана)', num], ['activeMinutes', 'Активных минут на уроках (медиана)', num], ['firstTry', 'Верно с первой попытки (медиана)', pct]]) {
    const s = r.secondary[k];
    lines.push(s.enough ? `| ${label} | ${f(s.median[0])} | ${f(s.median[1])} | Манн — Уитни, p = ${num(s.p, 3)} |` : `| ${label} | — | — | мало данных |`);
  }
  lines.push('', '### Надёжность теста (KR-20)', '', `Входной: ${num(r.reliability.pre)}; итоговый: ${num(r.reliability.post)}; отсроченный: ${num(r.reliability.delayed)}.`);
  return lines.join('\n');
}
