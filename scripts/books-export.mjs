#!/usr/bin/env node
/* Тексты для озвучки книг полки (src/learn/shelf.js) — по файлу на отрывок: books/<книга>/<отрывок>.txt, и
   инструкция books/README.md с таблицей — какой файл записи ждёт каждый отрывок и какие уже записаны.
   Готовую запись отрывка кладут в public/books/<книга>/<отрывок>.mp3; когда записаны все отрывки книги,
   после сборки она играет по отрывкам (src/learn/book-player.js). В тексте для озвучки нет пропусков
   «[…]» — на них сервисы долго молчат.

   Запуск: npm run books:export */
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { BOOKS, passageScript, speechScript, SPEECH_CPS } from '../src/learn/shelf.js';
import { listBookAudio } from './voice-files-plugin.js';
import { plural } from '../src/lib/plural.js';

const out = new URL('../books/', import.meta.url);
const recorded = new Set(listBookAudio());
const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dur = (chars) => { const s = Math.max(5, Math.round(chars / SPEECH_CPS)); return s < 60 ? `${s} с` : `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, '0')} с`; };

await mkdir(out, { recursive: true });
// прежние тексты книги целиком (books/<книга>.txt) — больше не нужны: запись теперь по отрывкам
for (const f of await readdir(out)) if (/\.txt$/.test(f)) await rm(new URL(f, out));

const rows = [];
for (const b of BOOKS) {
  const dir = new URL(`${b.id}/`, out);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  b.passages.forEach((p, i) => {
    const text = passageScript(b, p.id);
    const file = `${b.id}/${p.id}`;
    rows.push({ b, p, i, text, file, done: recorded.has(file) });
  });
  for (const r of rows.filter((x) => x.b === b)) {
    const head = [
      `${b.author} — «${b.title}» (${b.year})`,
      `Отрывок ${r.i + 1} из ${b.passages.length}: «${r.p.title}»`,
      `Файл записи: ${r.p.id}.mp3 — положить в папку public/books/${b.id}/`,
      `Знаков: ${num(r.text.length)} · звучит примерно ${dur(r.text.length)} · записано: ${r.done ? 'да ✓' : 'нет'}`,
      '',
      '— текст для озвучки (копировать всё, что ниже этой строки) —',
      '',
    ];
    await writeFile(new URL(`${r.p.id}.txt`, dir), `${head.join('\n')}\n${r.text}\n`);
  }
}

const total = rows.reduce((a, r) => a + r.text.length, 0);
const done = rows.filter((r) => r.done).length;
const wholeOnly = BOOKS.filter((b) => recorded.has(b.id) && !b.passages.every((p) => recorded.has(`${b.id}/${p.id}`)));
const table = BOOKS.map((b) => {
  const mine = rows.filter((r) => r.b === b);
  const lines = mine.map((r) => `| ${r.i + 1} | ${r.p.title} | [${r.p.id}.txt](${b.id}/${r.p.id}.txt) | \`public/books/${b.id}/${r.p.id}.mp3\` | ${num(r.text.length)} | ≈ ${dur(r.text.length)} | ${r.done ? '✓' : '—'} |`);
  const ready = mine.every((r) => r.done);
  return `### ${b.author}, «${b.title}» — ${mine.length} ${plural(mine.length, 'отрывок', 'отрывка', 'отрывков')}${ready ? ' · записано ✓' : ''}${recorded.has(b.id) && !ready ? ' · сейчас играет запись целиком' : ''}

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
${lines.join('\n')}`;
}).join('\n\n');

const readme = `# Озвучка книг полки

На книжной полке профиля ${BOOKS.length} книг, ${rows.length} отрывков, около ${num(total)} знаков. **Каждый отрывок —
отдельная запись**: его проще озвучить за раз, при правке текста переозвучить один отрывок, а не всю книгу.
Когда записаны **все** отрывки книги, кнопка «Слушать книгу» играет их друг за другом: с перемоткой по всей
книге, скоростью, «слушать с этого отрывка» и подсветкой отрывка, который звучит. Пока записаны не все —
играет запись книги целиком, если она есть${wholeOnly.length ? ` (сейчас так: ${wholeOnly.map((b) => `${b.author}, \`${b.id}.mp3\``).join('; ')})` : ''}, иначе книгу по абзацам читает голос браузера.
Слушать можно и закрыв книгу: внизу над вкладками остаётся мини-проигрыватель.

Этот файл и тексты отрывков пишет команда \`npm run books:export\` — править их руками не нужно.

Записано отрывков: **${done} из ${rows.length}**.

## Как озвучить

1. Откройте FreeTTS (или другой сервис) и выберите **один русский голос** для всех книг — спокойный,
   «дикторский», темп обычный.
2. Откройте текст отрывка из таблицы ниже (папка книги, файл отрывка) и скопируйте всё, что ниже строки
   «— текст для озвучки —». В первом отрывке книги — ещё и вступление: автор, название, год.
3. Вставьте текст в сервис, озвучьте и скачайте MP3.
4. Назовите файл как в столбце «Файл записи» (например, \`pins.mp3\`) — маленькими буквами, ровно как в
   таблице — и положите в папку книги: \`public/books/<книга>/\` (например, \`public/books/smith-wealth/pins.mp3\`).
   На GitHub: откройте \`public/books\` → **Add file → Upload files**; чтобы файл попал в папку книги,
   допишите её имя в начало пути: \`smith-wealth/pins.mp3\`. Нажмите **Commit changes**.
5. **Выровняйте громкость:** \`npm run voice:normalize\` (нужен ffmpeg) — речь −16 LUFS, пик не выше
   −1,5 dBTP, моно, 56 кбит/с, без обложки; \`npm run voice:normalize -- --check\` только проверяет.
6. Vercel соберёт сайт сам. Как только у книги записаны все отрывки, она играет по отрывкам — ничего
   больше перечислять не нужно.

Записывать всё сразу не обязательно: книги, у которых записаны не все отрывки, по-прежнему играют запись
целиком или их читает браузер.

## Отрывки

${table}

## Полезно знать

- **Без «[…]».** В тексте для озвучки пропуски убраны, чтобы сервис не молчал на них. На экране книги
  пропуски по-прежнему отмечены «[…]».
- **Произношение.** Текст в сервисе можно править: ставить ударения так, как их понимает сервис, писать
  годы и числа словами. Имя файла от этого не меняется.
- **Текст отрывка поменяли.** Команда \`npm run books:export\` (или просьба к Claude) обновит эту папку —
  переозвучить нужно только этот отрывок.
- **Длительность** в таблице — оценка по записи Смита (около 10,5 знака в секунду); точная — после записи.
- **Размер.** Хватит моно MP3 на 48–64 кбит/с: минута записи — около 0,4 МБ. Записи не скачиваются
  заранее: браузер берёт их по кускам, когда книгу слушают.
- **Лицензия.** Перед публикацией проверьте в условиях сервиса, можно ли выкладывать записи на сайт.
  Под проигрывателем всегда видна подпись «голос синтезирован». Сами тексты — в общественном
  достоянии, перевод — редакции «Инфляции».
`;
await writeFile(new URL('README.md', out), readme);
console.log(`Книг: ${BOOKS.length}, отрывков: ${rows.length}, знаков: ${num(total)}, записано отрывков: ${done}. Папка books/ обновлена.`);
// весь текст книги — для проверки, что отрывки покрывают его целиком
const lost = BOOKS.filter((b) => speechScript(b).length !== b.passages.reduce((a, p) => a + passageScript(b, p.id).length, 0) + 2 * (b.passages.length - 1));
if (lost.length) { console.error(`Отрывки не покрывают текст книги: ${lost.map((b) => b.id).join(', ')}`); process.exit(1); }
