/* Исследовательская основа (research/): словарь данных, проверка записей, код участника, распределение по группам,
   статистика плана анализа и сверка с документами. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { FIELDS, FORBIDDEN, TABLES, ARMS, PROTOCOL_VERSION, STUDY_STATUS, MODULE_LESSONS, forbiddenField } from '../dictionary.js';
import { cleanRecord, participantCode, normalizeCode, isParticipantCode, CODE_ALPHABET } from '../record.js';
import { allocate, emptyAllocation, seededRandom, stratumOf, newBlock } from '../randomize.js';
import { tCdf, tQuantile, normCdf, welch, hedgesG, mannWhitney, fisherExact, diffProportions, ancova, kr20, holm, mean } from '../stats.js';
import { analyze, toMarkdown } from '../analyze.js';

const doc = (name) => readFileSync(new URL(`../../../research/${name}`, import.meta.url), 'utf8');
const code = participantCode(() => 0);

describe('исследование: документы', () => {
  it('семь документов на месте; протокол — черновик той же версии, что и код; сбор не начат', () => {
    for (const f of ['protocol.md', 'data-dictionary.md', 'methodology.md', 'analysis-plan.md', 'participant-information.md', 'retention-policy.md', 'results.md']) {
      expect(existsSync(new URL(`../../../research/${f}`, import.meta.url)), f).toBe(true);
    }
    expect(STUDY_STATUS).toBe('draft');
    expect(doc('protocol.md')).toContain(`Версия протокола: ${PROTOCOL_VERSION}`);
    expect(doc('protocol.md')).toContain('Сбор данных не начат');
    expect(doc('results.md')).toContain('Данных пока нет');
  });
  it('учебный модуль — восемь уроков «Сберкассы», все есть в главе и в таблице методики; эфира и мини-игры в модуле нет', () => {
    const chapter = readFileSync(new URL('../../textbook/chapters/household.md', import.meta.url), 'utf8');
    const method = doc('methodology.md');
    for (const id of MODULE_LESSONS) { expect(chapter, id).toMatch(new RegExp(`:::idea id=${id} `)); expect(method, id).toContain(`\`${id}\``); }
    expect(MODULE_LESSONS).toHaveLength(8);
    expect(MODULE_LESSONS).not.toContain('hh-radio'); expect(MODULE_LESSONS).not.toContain('hh-g');
  });
  it('словарь данных в документе и в коде совпадает: каждое поле и каждый запрет описаны, и у каждого поля есть «зачем»', () => {
    const dd = doc('data-dictionary.md');
    for (const t of TABLES) for (const [k, f] of Object.entries(FIELDS[t])) {
      expect(dd, `${t}.${k}`).toContain(`\`${k}\``);
      expect(f.purpose.length, `${t}.${k}`).toBeGreaterThan(20);
    }
    for (const f of FORBIDDEN) expect(dd, f.name).toContain(f.name);
  });
});

describe('исследование: словарь и записи', () => {
  it('ни одно поле набора не запрещено; запрещённые поля узнаются под любым написанием', () => {
    for (const t of TABLES) for (const k of Object.keys(FIELDS[t])) expect(forbiddenField(k), k).toBe(null);
    for (const k of ['login', 'Password', 'recHash', 'token', 'x-forwarded-for', 'IP', 'parentName', 'chat', 'friends', 'playerId', 'userAgent', 'nickname', 'birthYear', 'createdAt', 'comment']) {
      expect(forbiddenField(k), k).not.toBe(null);
    }
  });
  it('запись с логином, токеном или адресом отклоняется целиком; неизвестные поля отбрасываются; значения проверяются', () => {
    const ok = { participant_code: code, study_day: 3, event_type: 'exercise_answer', lesson_id: 'hh-l1', task_no: 2, exercise_id: 'hh-e1-calc', correct: true, attempt_no: 1, active_seconds: 40 };
    expect(cleanRecord('events', ok)).toEqual({ record: ok, dropped: [] });
    for (const extra of [{ login: 'anna' }, { token: 'x' }, { ip: '1.2.3.4' }, { userAgent: 'Chrome' }, { comment: 'привет' }, { playerId: 'u1' }]) {
      expect(cleanRecord('events', { ...ok, ...extra }).error).toMatch(/^запрещённое поле/);
    }
    expect(cleanRecord('events', { ...ok, coins: 50 })).toEqual({ record: ok, dropped: ['coins'] });
    expect(cleanRecord('events', { ...ok, attempt_no: 0 }).error).toMatch(/attempt_no/);
    expect(cleanRecord('events', { ...ok, event_type: 'buy' }).error).toMatch(/event_type/);
    expect(cleanRecord('events', { ...ok, participant_code: 'anna' }).error).toMatch(/participant_code/);
    const { study_day: _drop, ...noDay } = ok;
    expect(cleanRecord('events', noDay).error).toMatch(/study_day/);
    expect(cleanRecord('nope', ok).error).toBeTruthy();
  });
  it('код участника — случайный, 11 знаков с контрольным; опечатка в одном знаке и перестановка соседних не проходят', () => {
    const c = participantCode();
    expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{3}$/);
    expect(isParticipantCode(c)).toBe(true);
    expect(normalizeCode(c.toLowerCase().replace(/-/g, ' '))).toBe(c);
    expect(new Set(Array.from({ length: 200 }, () => participantCode())).size).toBe(200);
    for (const ch of 'O0I1L') expect(CODE_ALPHABET).not.toContain(ch);
    const raw = c.replace(/-/g, '');
    for (let i = 0; i < 10; i += 1) {
      const other = CODE_ALPHABET[(CODE_ALPHABET.indexOf(raw[i]) + 1) % CODE_ALPHABET.length];
      expect(normalizeCode(raw.slice(0, i) + other + raw.slice(i + 1)), `знак ${i}`).toBe(null);
      if (raw[i] !== raw[i + 1]) expect(normalizeCode(raw.slice(0, i) + raw[i + 1] + raw[i] + raw.slice(i + 2)), `перестановка ${i}`).toBe(null);
    }
  });
});

describe('исследование: распределение по группам', () => {
  it('блоки по 2 и 4: в каждом группы поровну; внутри слоя разница численностей не больше 2; последовательность воспроизводится по зерну', () => {
    const rnd = seededRandom(7);
    for (let i = 0; i < 50; i += 1) { const b = newBlock(rnd); expect([2, 4]).toContain(b.length); expect(b.filter((a) => a === 'game').length).toBe(b.length / 2); }
    const run = (seed) => {
      let st = emptyAllocation(); const r = seededRandom(seed); const out = [];
      for (let i = 0; i < 101; i += 1) { const s = i % 3 ? 'low' : 'high'; const a = allocate(st, s, r); st = a.state; out.push(a.arm);
        for (const k of ['low', 'high']) expect(Math.abs(st.strata[k].n.game - st.strata[k].n.plain)).toBeLessThanOrEqual(2); }
      return out;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
    expect(new Set(run(1))).toEqual(new Set(ARMS));
    expect(stratumOf(6, 12)).toBe('high'); expect(stratumOf(5, 12)).toBe('low');
  });
});

describe('исследование: статистика', () => {
  it('распределение Стьюдента и нормальное — по табличным значениям', () => {
    expect(tCdf(2.228139, 10)).toBeCloseTo(0.975, 5);
    expect(tCdf(-1.812461, 10)).toBeCloseTo(0.05, 5);
    expect(tQuantile(0.975, 5)).toBeCloseTo(2.570582, 4);
    expect(tQuantile(0.995, 20)).toBeCloseTo(2.84534, 4);
    expect(normCdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(normCdf(-1)).toBeCloseTo(0.158655, 5);
  });
  it('Уэлч, g Хеджеса, Манн — Уитни, Фишер, Ньюкомб, KR-20, Холм — на примерах, посчитанных вручную', () => {
    const w = welch([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(w.diff).toBe(-3); expect(w.t).toBeCloseTo(-1.897367, 5); expect(w.df).toBeCloseTo(5.882353, 5);
    expect(w.p).toBeCloseTo(2 * tCdf(-1.897367, 5.882353), 6);
    expect(w.ci[0]).toBeLessThan(-3); expect(w.ci[1]).toBeGreaterThan(0);
    // d = (3 − 6) / √6.25 = −1.2; J = 1 − 3/31
    expect(hedgesG([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]).g).toBeCloseTo(-1.2 * (1 - 3 / 31), 6);
    expect(mannWhitney([1, 2, 3], [4, 5, 6]).u).toBe(0);
    expect(mannWhitney([4, 5, 6], [1, 2, 3]).u).toBe(9);
    // «леди, пробующая чай» (Фишер): двусторонний p = 34/70
    expect(fisherExact([[3, 1], [1, 3]])).toBeCloseTo(34 / 70, 8);
    expect(fisherExact([[5, 0], [0, 5]])).toBeCloseTo(2 / 252, 8);
    const d = diffProportions(8, 10, 4, 10);
    expect(d.diff).toBeCloseTo(0.4, 9); expect(d.ci[0]).toBeGreaterThan(-0.1); expect(d.ci[1]).toBeLessThan(0.75);
    expect(kr20([[1, 1, 1], [1, 1, 0], [1, 0, 0], [0, 0, 0]])).toBeCloseTo(0.75, 9);
    expect(holm([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06].map((x) => expect.closeTo(x, 9)));
  });
  it('ковариационный анализ находит заложенную разность групп при учёте входного теста', () => {
    const pre = [0.2, 0.4, 0.5, 0.7, 0.3, 0.6, 0.1, 0.8];
    const group = [1, 1, 1, 1, 0, 0, 0, 0];
    const noise = [0.01, -0.02, 0.015, -0.005, -0.01, 0.02, -0.015, 0.005];
    const post = pre.map((x, i) => 0.3 + 0.1 * group[i] + 0.5 * x + noise[i]);
    const a = ancova(post, pre, group);
    expect(a.effect).toBeCloseTo(0.1, 1); expect(a.slope).toBeCloseTo(0.5, 1); expect(a.df).toBe(5);
    expect(a.ci[0]).toBeLessThan(a.effect); expect(a.ci[1]).toBeGreaterThan(a.effect); expect(a.p).toBeLessThan(0.01);
  });
});

describe('исследование: анализ и отчёт', () => {
  // искусственный набор: 8 участников, модуль из двух уроков
  const lessons = ['hh-i1', 'hh-l1'];
  const people = Array.from({ length: 8 }, (_, i) => ({ participant_code: participantCode(() => i + 1), arm: i < 4 ? 'game' : 'plain', stage: i % 4 === 3 ? 'posttest' : 'delayed', protocol_version: '0.1', consent_version: '0.1', adult_confirmed: true, period: '2027-02', stratum: 'low' }));
  const events = people.flatMap((p, i) => lessons.slice(0, i < 4 ? 2 : 1 + (i % 2)).map((l, k) => ({ participant_code: p.participant_code, event_type: 'lesson_done', lesson_id: l, study_day: k, active_seconds: 300 })));
  const test = (p, kind, score, dayN) => Array.from({ length: 4 }, (_, j) => ({ participant_code: p.participant_code, test_kind: kind, form: 'A', item_id: `q${j}`, correct: j < score, study_day: dayN }));
  const tests = people.flatMap((p, i) => [...test(p, 'pre', 1 + (i % 2), 0), ...test(p, 'post', 2 + (i % 3 === 0 ? 1 : 0), 1), ...(p.stage === 'delayed' ? test(p, 'delayed', 2 + (i < 4 ? 1 : 0) - (i % 2 ? 1 : 0), 29) : [])]);
  it('пилот: поток участников, основные показатели с поправкой Холма, без вывода «гипотеза подтверждена»', () => {
    const r = analyze({ participants: people, events, tests }, { studyType: 'pilot', moduleLessons: lessons });
    expect(r.flow.randomized).toEqual({ game: 4, plain: 4 });
    expect(r.flow.reached.game.delayed).toBe(3);
    expect(r.primary.completion.x).toEqual([4, 2]);
    expect(r.primary.completion.supported).toBe(null);
    expect(r.primary.retention.supported).toBe(null);
    expect(r.primary.retention.n).toEqual({ game: 3, plain: 3 });
    const md = toMarkdown(r);
    expect(md).toContain('Пилотное исследование');
    expect(md).toContain('| Завершили модуль | 4 из 4 (100%) | 2 из 4 (50%) |');
    // в отчёте — только группы: ни одного кода участника
    for (const p of people) expect(md).not.toContain(p.participant_code);
  });
  it('тип исследования задаёт протокол, а не число участников', () => {
    expect(() => analyze({ participants: people, events, tests }, { studyType: 'big', moduleLessons: lessons })).toThrow(/pilot или confirmatory/);
    expect(mean([1, 2, 3])).toBe(2);
  });
});
