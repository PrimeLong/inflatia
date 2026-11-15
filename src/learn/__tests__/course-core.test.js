import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import INDEX from 'virtual:course-index';
import { UNITS, LESSONS, LESSON_BY_ID, mistakeUnit, canPractice, pathState, courseHydrated, lessonMeta, LESSON_SECTIONS } from '../course-core.js';
import { EXERCISES, practiceUnitOf, buildLesson } from '../course.js';
import { buildCourseIndex } from '../course-index-build.js';
import { TEMPLATES } from '../../textbook/variants.js';
import { PROBLEMS, CHAPTER_SECTIONS } from '../../textbook/content.js';
import { emptyLearn } from '../../textbook/learn-state.js';

/* Лёгкое ядро курса (docs/mechanics.md, «Приветствие и загрузка»; пункт владельца 13.11): Путь рисуется по указателю
   курса, собранному при сборке, — без текстов глав. Указатель обязан совпадать с полным курсом, а модули Пути —
   не тянуть главы. */
describe('указатель курса: Путь без текстов глав', () => {
  it('указатель собран и совпадает с тем, что даёт полный курс', () => {
    expect(INDEX && INDEX.units.length).toBeGreaterThan(10);
    expect(buildCourseIndex()).toEqual(INDEX);
  });
  it('в указателе нет текстов уроков: ни упражнений, ни шагов, ни слов — и он заметно легче глав', () => {
    INDEX.units.flatMap((u) => u.lessons).forEach((l) => {
      ['exercises', 'inner', 'idea', 'terms', 'hard'].forEach((k) => expect(k in l, `${l.id}.${k}`).toBe(false));
      expect(typeof l.title).toBe('string');
      expect(l.min).toBeGreaterThanOrEqual(2);
    });
    expect(JSON.stringify(INDEX).length).toBeLessThan(400 * 1024);
  });
  it('полный курс дополняет те же объекты уроков: урок до и после загрузки глав — один объект', () => {
    expect(courseHydrated()).toBe(true);
    expect(LESSONS.length).toBe(INDEX.units.reduce((a, u) => a + u.lessons.length, 0));
    LESSONS.forEach((l) => {
      expect(Array.isArray(l.exercises), l.id).toBe(true);
      expect(LESSON_BY_ID[l.id]).toBe(l);
      // лёгкие поля после загрузки глав те же, что были в указателе
      expect(lessonMeta(l)).toEqual({ charts: l.charts, kinds: l.kinds, discover: l.discover, words: l.words, gemTheory: l.gemTheory });
    });
    expect(UNITS.map((u) => u.id)).toEqual(INDEX.units.map((u) => u.id));
  });
  it('минуты и опыт на билете — как у самого урока', () => {
    const l = LESSONS.find((x) => x.kind === 'practice');
    const p = buildLesson(l.id);
    expect(Math.abs(Math.max(2, Math.round(p.seconds / 60)) - l.min)).toBeLessThanOrEqual(1);
    expect(l.xp).toBeGreaterThan(0);
  });
  it('«задание → юнит» по указателю — то же, что считает полный курс, для каждого задания, задачи и варианта', () => {
    const ids = [...Object.keys(EXERCISES), ...TEMPLATES.map((t) => `var:${t.id}`), ...Object.keys(PROBLEMS).flatMap((pid) => [pid, `auto:${pid}`]), 'нет-такого'];
    expect(ids.length).toBeGreaterThan(500);
    ids.forEach((id) => {
      expect(mistakeUnit(id), id).toBe(practiceUnitOf(id));
      expect(canPractice(id), id).toBe(!!practiceUnitOf(id));
    });
  });
  it('разделы уроков в указателе — те же, что в главах', () => {
    Object.entries(LESSON_SECTIONS).forEach(([unit, list]) => list.forEach((s) => {
      const full = CHAPTER_SECTIONS[unit].find((x) => x.id === s.id);
      expect({ title: s.title, minutes: s.minutes, recall: s.recall }).toEqual({ title: full.title, minutes: full.minutes, recall: full.recall || null });
    }));
  });
  it('состояние Пути считается по указателю: у новичка открыт первый урок', () => {
    const st = pathState(emptyLearn());
    expect(st[0].lessons[0].open).toBe(true);
    expect(st[0].current.id).toBe(st[0].lessons[0].id);
  });
  it('модули Пути не тянут главы: в их статических импортах нет course.js, content.js, markdown.js, variants.js, glossary.js', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const HEAVY = ['learn/course.js', 'textbook/content.js', 'textbook/markdown.js', 'textbook/variants.js', 'textbook/glossary.js', 'textbook.jsx', 'learn/news.js', 'lib/engine.js'];
    const seen = new Set(); const bad = [];
    const walk = (file) => {
      if (seen.has(file)) return; seen.add(file);
      const src = readFileSync(file, 'utf8');
      const re = /^(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gms;
      let m;
      while ((m = re.exec(src))) {
        if (!m[1].startsWith('.')) { if (/^(katex|recharts)/.test(m[1])) bad.push(`${path.relative(root, file)} ← ${m[1]}`); continue; }
        let f = path.resolve(path.dirname(file), m[1]);
        if (!existsSync(f)) f = ['.js', '.jsx', '.ts', '.tsx'].map((e) => f + e).find(existsSync) || f;
        const rel = path.relative(root, f);
        if (HEAVY.includes(rel)) { bad.push(`${path.relative(root, file)} ← ${rel}`); continue; }
        if (existsSync(f)) walk(f);
      }
    };
    walk(path.join(root, 'learn.jsx'));
    walk(path.join(root, 'MacroSimulator.jsx'));
    expect(bad).toEqual([]);
  });
});
