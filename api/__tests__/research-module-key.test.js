/* Ключ ответов исследования — только на сервере (замечание владельца 24.11, исследование, п. 1). Модуль для страницы —
   без ответов, допусков и разборов; код страницы не импортирует серверные ключи; в собранном сайте нет ни одного разбора
   и ни одного ответа ключа (та же проверка — в scripts/build-onreza.mjs перед выпуском). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MODULE } from '../../src/research/module.js';
import { MODULE_KEY, EXERCISE_INDEX } from '../_lib/research-module-key.js';
import { leakedKeys } from '../../scripts/build-onreza.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

describe('ключ ответов исследования — только на сервере', () => {
  it('у заданий модуля для страницы нет ответа, допуска и разбора', () => {
    for (const l of MODULE) for (const e of l.exercises) {
      expect(Object.keys(e).sort()).toEqual(e.kind === 'choice' ? ['id', 'kind', 'options', 'prompt'] : ['id', 'kind', 'prompt', 'unit']);
    }
  });
  it('у каждого задания — ключ на сервере; лишних ключей нет', () => {
    const ids = MODULE.flatMap((l) => l.exercises.map((e) => e.id)).sort();
    expect(Object.keys(MODULE_KEY).sort()).toEqual(ids);
    expect(Object.keys(EXERCISE_INDEX).sort()).toEqual(ids);
    for (const id of ids) expect(MODULE_KEY[id].why.length).toBeGreaterThan(5);
  });
  it('код страницы (src/) не импортирует серверные ключи', () => {
    const bad = walk(path.join(ROOT, 'src')).filter((f) => /\.(jsx?|tsx?|mjs)$/.test(f) && !f.includes('__tests__'))
      .filter((f) => /(from\s*|import\s*\(\s*)['"][^'"]*research-(module-)?key/.test(fs.readFileSync(f, 'utf8')));
    expect(bad.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
  it('проверка собранного сайта находит утечку, если разбор попал в JS', () => {
    const dir = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.leak-'));
    try {
      fs.mkdirSync(path.join(dir, 'assets'));
      fs.writeFileSync(path.join(dir, 'assets', 'ok.js'), 'const a = 1;');
      expect(leakedKeys(dir)).toEqual([]);
      fs.writeFileSync(path.join(dir, 'assets', 'bad.js'), `const w = ${JSON.stringify(MODULE_KEY['hh-l2-a'].why)};`);
      expect(leakedKeys(dir)).toEqual(['assets/bad.js']);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
