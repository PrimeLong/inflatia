#!/usr/bin/env node
/* Отчёт исследования по плану анализа (research/analysis-plan.md): читает выгрузку исследовательской базы (JSON из
   api/research.js, действие export) и печатает таблицы для research/results.md. Тип исследования задаёт протокол:
     node scripts/research-report.mjs выгрузка.json --type pilot
   Ничего не пишет и никуда не отправляет. */
import { readFileSync } from 'node:fs';
import { analyze, toMarkdown } from '../src/research/analyze.js';
import { MODULE_LESSONS } from '../src/research/dictionary.js';

const [file, ...rest] = process.argv.slice(2);
const type = rest[rest.indexOf('--type') + 1];
if (!file || !rest.includes('--type')) {
  console.error('Использование: node scripts/research-report.mjs выгрузка.json --type pilot|confirmatory');
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const result = analyze(data, { studyType: type, moduleLessons: MODULE_LESSONS });
console.log(toMarkdown(result));
if (data.withdrawn) console.log(`\nОтозвали участие: ${data.withdrawn}.`);
