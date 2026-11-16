# Музыка из Suno: все пьесы саундтрека

Правило — `docs/mechanics.md`, «Музыка: записи вместо синтеза». Положили файл `public/music/<id>.mp3` — после сборки пьеса `<id>` играет запись, а не синтез. Файла нет — играет синтез, как раньше. Права на записи — `docs/legal-todo.md`, п. 20: генерировать на платном тарифе Suno.

## Как генерировать

1. Suno → Create → **Custom**, включить **Instrumental** (без голоса).
2. В **Style of Music** вставить строку «Стиль» из таблицы ниже как есть (по-английски Suno понимает точнее).
3. В **Exclude styles** (если есть) — строку «Исключить».
4. **Title** — название пьесы (можно по-русски, на звук не влияет).
5. Сгенерировать 2–4 варианта и выбрать тот, где нет резких ударных, вокальных звуков и обрыва в конце. Хороший вариант — ровный, без «дропа», с мягким вступлением и затиханием в конце.
6. Скачать **MP3**, назвать по столбцу «Файл» и положить в `public/music/`.

Одно и то же для всех пяти: **Исключить** — `vocals, singing, choir, rap, heavy drums, distortion, EDM drop, dubstep, sound effects`.

## Пять пьес на пробу

| Файл | Пьеса | Где звучит | Стиль (Style of Music) |
|---|---|---|---|
| `dawn.mp3` | «Рассвет над министерством» | первая пьеса Пути и учебника | `instrumental, cinematic ambient piano, warm string section, soft analog synth pad, gentle hopeful morning, F major, 72 bpm, slow build, no drums, warm and intimate` |
| `cabinet.mp3` | «Кабинет в семь утра» | Путь, «Спокойствие» | `instrumental, jazz piano trio, upright walking bass, brushed drums, light swing, 86 bpm, F major, cozy early morning office, mellow cafe jazz, warm vintage recording` |
| `sixstring.mp3` | «Шесть струн» | Путь, «Спокойствие» | `instrumental, acoustic folk pop, strummed steel-string guitar, nylon guitar melody, soft bass, light brushed drums, 104 bpm, G major, sunny easygoing, warm and bright` |
| `ledger.mp3` | «Тихая бухгалтерия» | Путь, «Спокойствие» | `instrumental, solo felt piano, intimate and quiet, D minor, 68 bpm, contemplative study music, gentle rubato, soft cello joins near the end, warm room reverb, no drums` |
| `northlight.mp3` | «Северный свет» | Путь, «Спокойствие» | `instrumental, ambient, celesta and glockenspiel melody, soft piano, warm analog synth pad, slow strings, 64 bpm, E-flat major, calm nordic night, dreamy, spacious reverb, no drums` |

## Остальные пьесы

Описание каждой пьесы саундтрека (пункт владельца от 15 ноября 2026). Темп — как у синтезированной пьесы, инструменты — те же, что в её подписи в «Саундтреке». Если в столбце «Исключить» пусто — общая строка выше; в маршах и гимнах барабаны и хор нужны, поэтому у них своя.

| Файл | Пьеса | Где звучит | Стиль (Style of Music) | Исключить |
|---|---|---|---|---|
| `promenade.mp3` | «Прогулка по столице» | Путь, «Спокойствие»; меню «Мира» | `instrumental, light piano melody over gentle synth arpeggio, soft bass, 84 bpm, C major, relaxed city walk, sunny afternoon, lo-fi warmth, no drums` |  |
| `meadow.mp3` | «Загородная тишина» | Путь, «Спокойствие» | `instrumental, nylon-string classical guitar fingerpicking, soft upright bass, 88 bpm, A major, countryside quiet, warm and pastoral, intimate acoustic, no drums` |  |
| `anthem.mp3` | «Герб на двери» | меню «Мира» — заглавная тема | `instrumental, cinematic main theme, grand piano, warm string orchestra, pizzicato double bass, 88 bpm, B-flat major, dignified and hopeful, slow build to a full but gentle climax, no drums` |  |
| `residence.mp3` | «Резиденция» | «Мир», президент — спокойные кварталы | `instrumental, chamber music, grand piano, string quartet, harp arpeggios, solo violin melody, 76 bpm, E-flat major, elegant palace interior, calm and refined` |  |
| `firstlesson.mp3` | «Первый урок» | обучение «Мира» | `instrumental, soft grand piano and nylon guitar duet, 92 bpm, G major, curious and friendly, first day at school, light and warm, no drums` |  |
| `chalkboard.mp3` | «Мел и доска» | обучение «Мира» | `instrumental, marimba melody, round acoustic bass, brushed snare, 100 bpm, F major, playful classroom, light bouncy, gentle` |  |
| `openingbell.mp3` | «Открытие торгов» | биржа, «Спокойствие» | `instrumental, retro synth lead melody, crisp closed hi-hats, round synth bass, 92 bpm, D major, morning stock exchange, optimistic electronic, 80s synth, clean` |  |
| `fullhouse.mp3` | «Полный зал» | «Мир», «Подъём» | `instrumental, upbeat jazz, grand piano, walking bass, swinging drums, 138 bpm, F major, busy full restaurant, energetic and joyful, big band feel without vocals` |  |
| `ascent.mp3` | «Восхождение» | «Мир», «Подъём» | `instrumental, uplifting piano chords, punchy bass, soft drum machine, 108 bpm, D major, growth and momentum, motivational, modern cinematic pop` |  |
| `boulevard.mp3` | «Бульвар» | «Мир», «Подъём» | `instrumental, warm analog synth pad, bright electric piano, groovy bass, 116 bpm, A major, evening boulevard, confident and stylish, city pop, light drums` |  |
| `overdrive.mp3` | «Перегрев» | «Мир», «Подъём» — экономика перегрета | `instrumental, driving piano riff, busy bass, energetic drums, 126 bpm, E minor, overheated economy, restless and fast, tension under the excitement` |  |
| `graduation.mp3` | «Выпуск» | обучение «Мира», экзамен | `instrumental, fast grand piano, bass, drums, 126 bpm, C major, exam time, focused and bright, triumphant ending` |  |
| `bidask.mp3` | «Бид и аск» | биржа, «Подъём» | `instrumental, synth lead arpeggios, tight drum machine, 118 bpm, G minor, trading floor rush, quick bids and asks, electronic, focused` |  |
| `nightshift.mp3` | «Ночная смена» | «Мир», «Спад»; обучение | `instrumental, late-night jazz, grand piano, double bass, sparse brushed drums, 74 bpm, D minor, empty office at night, tired but steady, mellow` |  |
| `longwinter.mp3` | «Долгая зима» | «Мир», «Спад» | `instrumental, slow piano, deep bass notes, 56 bpm, C minor, long cold winter, melancholic, sparse, lots of space, no drums` |  |
| `emptyhalls.mp3` | «Пустые цеха» | «Мир», «Спад» | `instrumental, low bass motif, distant piano, 60 bpm, F minor, empty factory halls, echoing reverb, quiet sadness, no drums` |  |
| `patience.mp3` | «Терпение» | «Мир», «Спад» | `instrumental, gentle piano, warm analog synth pad, 66 bpm, A minor turning to C major, waiting it out, patient and hopeful, no drums` |  |
| `bearmarket.mp3` | «Медвежий рынок» | биржа, «Спад» | `instrumental, dark synth bass, slow synth lead, 62 bpm, E minor, falling market, heavy and gloomy, retro electronic, no drums` |  |
| `treadmill.mp3` | «Бег на месте» | «Мир», «Стагфляция»; обучение | `instrumental, syncopated bass, repeating piano figure, drums, 112 bpm, B minor, running in place, busy but going nowhere, nervous groove` |  |
| `deadlock.mp3` | «Тупик» | «Мир», «Стагфляция» | `instrumental, looping synth arpeggio, low drone pad, 80 bpm, D minor, stuck, unresolved tension, minimal, hypnotic, no drums` |  |
| `friction.mp3` | «Трение» | «Мир», «Стагфляция» | `instrumental, uneasy piano, pulse-width synth pad, 86 bpm, G minor, friction and doubt, slightly dissonant, slow, no drums` |  |
| `thinvolume.mp3` | «Тонкий рынок» | биржа, «Стагфляция» | `instrumental, quiet synth arpeggio, thin pulse-width pad, 76 bpm, C minor, thin trading volume, waiting, minimal electronic, no drums` |  |
| `collapse.mp3` | «Обвал» | «Мир», «Кризис» | `instrumental, urgent bass ostinato, tense drums, falling piano lines, 128 bpm, E minor, market crash, dramatic tension, cinematic thriller, no drop` |  |
| `panic.mp3` | «Паника» | «Мир», «Кризис» | `instrumental, dark analog synth pad, timpani hits, pulsing bass, 136 bpm, C minor, panic, cinematic tension, rising, no drop` |  |
| `bankrun.mp3` | «Очередь у банка» | «Мир», «Кризис» | `instrumental, nervous synth arpeggio, pulse-width pad, bass, 118 bpm, F-sharp minor, queue at the bank, anxious and hurried, cinematic electronic` |  |
| `marginwire.mp3` | «Маржин-колл» | биржа, «Кризис» | `instrumental, aggressive synth bass, electronic toms, dark analog pad, 132 bpm, D minor, margin call, alarm and urgency, retro synthwave thriller, no drop` |  |
| `glass.mp3` | «Стеклянный воздух» | «Мир», «Дефляция» | `instrumental, glassy celesta bell, cold pulse-width pad, 52 bpm, E major, frozen still air, fragile and crystalline, ambient, no drums` |  |
| `hoarfrost.mp3` | «Иней» | «Мир», «Дефляция» | `instrumental, soft marimba, harp, small bells, 60 bpm, B major, frost on the window, delicate winter morning, ambient, no drums` |  |
| `stillness.mp3` | «Ничего не происходит» | «Мир», «Дефляция» | `instrumental, slow evolving pulse-width pad, low drone, 48 bpm, A minor, nothing happens, frozen economy, deep ambient, minimal, no melody, no drums` |  |
| `warmarch.mp3` | «Марш» | «Мир», «Война» | `instrumental, military march, brass stabs, snare drum rolls, marching bass, 112 bpm, D minor, wartime march, determined, cinematic` | `vocals, singing, choir, rap, distortion, EDM drop, dubstep, sound effects` |
| `homefront.mp3` | «Тыл» | «Мир», «Война» | `instrumental, string orchestra, soft wordless choir pad, piano, solo violin, 76 bpm, G minor, the home front, quiet courage, emotional cinematic` | `vocals, singing, lyrics, rap, heavy drums, distortion, EDM drop, dubstep, sound effects` |
| `trenches.mp3` | «Окопы» | «Мир», «Война» | `instrumental, timpani, low cello, slow heavy steps, 90 bpm, C minor, trenches, grim and tense, sparse cinematic war score` | `vocals, singing, choir, rap, distortion, EDM drop, dubstep, sound effects` |
| `rally.mp3` | «Митинг на площади» | «Мир», «Предвыборная кампания» | `instrumental, campaign rally, bright brass, piano, bass, upbeat drums, 116 bpm, C major, crowd on the square, energetic and optimistic, marching pop` | `vocals, singing, choir, rap, distortion, EDM drop, dubstep, sound effects` |
| `doorbell.mp3` | «От двери к двери» | «Мир», «Предвыборная кампания» | `instrumental, strummed acoustic guitar, nylon guitar melody, bass, small bells, 100 bpm, G major, door to door canvassing, friendly and upbeat folk` |  |
| `anchor.mp3` | «Якорь» | «Мир», «Стабилизация» | `instrumental, steady grand piano, warm strings, soft bells, 80 bpm, F major, holding steady, calm confidence, gentle cinematic, no drums` |  |
| `firmhand.mp3` | «Твёрдая рука» | «Мир», «Стабилизация» | `instrumental, piano, cello, steady soft drum pulse, 96 bpm, D minor to F major, firm hand, disciplined and resolute, restrained cinematic` |  |
| `decree.mp3` | «Указ» | «Мир», «Ручное управление» | `instrumental, solemn strings, grand piano, cello, timpani, 84 bpm, B-flat minor, official decree, stern and formal, cinematic` | `vocals, singing, choir, rap, distortion, EDM drop, dubstep, sound effects` |
| `corridors.mp3` | «Коридоры власти» | «Мир», «Ручное управление» | `instrumental, dark synthesizer, pulsing bass, low pad, 92 bpm, E minor, corridors of power, secretive political thriller, restrained, no drop` |  |
| `ironmarch.mp3` | «Железный марш» | «Мир», «Тоталитаризм» | `instrumental, distorted guitar riff, heavy bass, drum machine, 104 bpm, D minor, iron march, cold and oppressive, industrial, no vocals` | `vocals, singing, choir, rap, EDM drop, dubstep, sound effects` |
| `parade.mp3` | «Парад» | «Мир», «Тоталитаризм» | `instrumental, distorted guitar, wordless choir pad, timpani, drum machine, 96 bpm, C minor, grim military parade, monumental and cold, industrial cinematic` | `vocals, singing, lyrics, rap, EDM drop, dubstep, sound effects` |
| `curfew.mp3` | «Комендантский час» | «Мир», «Тоталитаризм» | `instrumental, low bass drone, rare distant guitar bursts, 72 bpm, A minor, curfew, empty streets at night, uneasy and sparse, dark ambient, no drums` |  |

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
