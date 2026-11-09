# Музыка из Suno: пять пьес на пробу

Правило — `docs/mechanics.md`, «Музыка: записи вместо синтеза». Положили файл `public/music/<id>.mp3` — после сборки пьеса `<id>` играет запись, а не синтез. Файла нет — играет синтез, как раньше. Права на записи — `docs/legal-todo.md`, п. 20: генерировать на платном тарифе Suno.

## Как генерировать

1. Suno → Create → **Custom**, включить **Instrumental** (без голоса).
2. В **Style of Music** вставить строку «Стиль» из таблицы ниже как есть (по-английски Suno понимает точнее).
3. В **Exclude styles** (если есть) — строку «Исключить».
4. **Title** — название пьесы (можно по-русски, на звук не влияет).
5. Сгенерировать 2–4 варианта и выбрать тот, где нет резких ударных, вокальных звуков и обрыва в конце. Хороший вариант — ровный, без «дропа», с мягким вступлением и затиханием в конце.
6. Скачать **MP3**, назвать по столбцу «Файл» и положить в `public/music/`.

Одно и то же для всех пяти: **Исключить** — `vocals, singing, choir, rap, heavy drums, distortion, EDM drop, dubstep, sound effects`.

## Пять пьес

| Файл | Пьеса | Где звучит | Стиль (Style of Music) |
|---|---|---|---|
| `dawn.mp3` | «Рассвет над министерством» | первая пьеса Пути и учебника | `instrumental, cinematic ambient piano, warm string section, soft analog synth pad, gentle hopeful morning, F major, 72 bpm, slow build, no drums, warm and intimate` |
| `cabinet.mp3` | «Кабинет в семь утра» | Путь, «Спокойствие» | `instrumental, jazz piano trio, upright walking bass, brushed drums, light swing, 86 bpm, F major, cozy early morning office, mellow cafe jazz, warm vintage recording` |
| `sixstring.mp3` | «Шесть струн» | Путь, «Спокойствие» | `instrumental, acoustic folk pop, strummed steel-string guitar, nylon guitar melody, soft bass, light brushed drums, 104 bpm, G major, sunny easygoing, warm and bright` |
| `ledger.mp3` | «Тихая бухгалтерия» | Путь, «Спокойствие» | `instrumental, solo felt piano, intimate and quiet, D minor, 68 bpm, contemplative study music, gentle rubato, soft cello joins near the end, warm room reverb, no drums` |
| `northlight.mp3` | «Северный свет» | Путь, «Спокойствие» | `instrumental, ambient, celesta and glockenspiel melody, soft piano, warm analog synth pad, slow strings, 64 bpm, E-flat major, calm nordic night, dreamy, spacious reverb, no drums` |

Темп и тональность — как у нынешних синтезированных пьес, чтобы запись встала на их место по настроению. Если Suno упорно уводит в другой темп — не страшно, главное — спокойный характер.

## Требования к файлу

- **MP3**, 44,1 кГц, 128–192 кбит/с, **1,5–3 минуты**, не больше **4 МБ**.
- Без тишины в начале и в конце; конец — затихание, а не обрыв.
- Громкость — около **−16 LUFS**, как у остальной музыки, иначе запись будет громче или тише синтезированных пьес. Выровнять и пережать можно одной командой (нужен ffmpeg):

```bash
ffmpeg -i "скачанный файл.mp3" -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -b:a 160k public/music/dawn.mp3
```

## Как проверить

Собрать или открыть приложение, включить музыку и открыть панель «Саундтрек» (кнопка с динамиком): у пьесы, которая звучит записью, — пометка «запись». Нет пометки — файл не подхватился: проверьте имя (маленькими буквами, `.mp3`) и папку `public/music/`.
