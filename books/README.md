# Озвучка книг полки

На книжной полке профиля 9 книг, 42 отрывков, около 27 622 знаков. **Каждый отрывок —
отдельная запись**: его проще озвучить за раз, при правке текста переозвучить один отрывок, а не всю книгу.
Когда записаны **все** отрывки книги, кнопка «Слушать книгу» играет их друг за другом: с перемоткой по всей
книге, скоростью, «слушать с этого отрывка» и подсветкой отрывка, который звучит. Пока записаны не все —
играет запись книги целиком, если она есть (сейчас так: Адам Смит, `smith-wealth.mp3`), иначе книгу по абзацам читает голос браузера.
Слушать можно и закрыв книгу: внизу над вкладками остаётся мини-проигрыватель.

Этот файл и тексты отрывков пишет команда `npm run books:export` — править их руками не нужно.

Записано отрывков: **0 из 42**.

## Как озвучить

1. Откройте FreeTTS (или другой сервис) и выберите **один русский голос** для всех книг — спокойный,
   «дикторский», темп обычный.
2. Откройте текст отрывка из таблицы ниже (папка книги, файл отрывка) и скопируйте всё, что ниже строки
   «— текст для озвучки —». В первом отрывке книги — ещё и вступление: автор, название, год.
3. Вставьте текст в сервис, озвучьте и скачайте MP3.
4. Назовите файл как в столбце «Файл записи» (например, `pins.mp3`) — маленькими буквами, ровно как в
   таблице — и положите в папку книги: `public/books/<книга>/` (например, `public/books/smith-wealth/pins.mp3`).
   На GitHub: откройте `public/books` → **Add file → Upload files**; чтобы файл попал в папку книги,
   допишите её имя в начало пути: `smith-wealth/pins.mp3`. Нажмите **Commit changes**.
5. **Выровняйте громкость:** `npm run voice:normalize` (нужен ffmpeg) — речь −16 LUFS, пик не выше
   −1,5 dBTP, моно, 56 кбит/с, без обложки; `npm run voice:normalize -- --check` только проверяет.
6. Vercel соберёт сайт сам. Как только у книги записаны все отрывки, она играет по отрывкам — ничего
   больше перечислять не нужно.

Записывать всё сразу не обязательно: книги, у которых записаны не все отрывки, по-прежнему играют запись
целиком или их читает браузер.

## Отрывки

### Адам Смит, «Исследование о природе и причинах богатства народов» — 11 отрывков · сейчас играет запись целиком

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Булавочная мастерская | [pins.txt](smith-wealth/pins.txt) | `public/books/smith-wealth/pins.mp3` | 1 080 | ≈ 1 мин 43 с | — |
| 2 | Мясник, пивовар и булочник | [butcher.txt](smith-wealth/butcher.txt) | `public/books/smith-wealth/butcher.mp3` | 570 | ≈ 54 с | — |
| 3 | Чем шире рынок | [market.txt](smith-wealth/market.txt) | `public/books/smith-wealth/market.mp3` | 807 | ≈ 1 мин 17 с | — |
| 4 | Вода и алмаз | [water.txt](smith-wealth/water.txt) | `public/books/smith-wealth/water.mp3` | 633 | ≈ 1 мин 00 с | — |
| 5 | Настоящая цена вещи | [toil.txt](smith-wealth/toil.txt) | `public/books/smith-wealth/toil.mp3` | 402 | ≈ 38 с | — |
| 6 | Рыночная и естественная цена | [price.txt](smith-wealth/price.txt) | `public/books/smith-wealth/price.mp3` | 1 215 | ≈ 1 мин 56 с | — |
| 7 | Люди одного ремесла | [trade.txt](smith-wealth/trade.txt) | `public/books/smith-wealth/trade.mp3` | 442 | ≈ 42 с | — |
| 8 | Невидимая рука | [hand.txt](smith-wealth/hand.txt) | `public/books/smith-wealth/hand.mp3` | 757 | ≈ 1 мин 12 с | — |
| 9 | Портной и сапожник | [tailor.txt](smith-wealth/tailor.txt) | `public/books/smith-wealth/tailor.mp3` | 856 | ≈ 1 мин 22 с | — |
| 10 | Цель всякого производства | [consumer.txt](smith-wealth/consumer.txt) | `public/books/smith-wealth/consumer.mp3` | 481 | ≈ 46 с | — |
| 11 | Четыре правила налогов | [taxes.txt](smith-wealth/taxes.txt) | `public/books/smith-wealth/taxes.mp3` | 663 | ≈ 1 мин 03 с | — |

### Давид Рикардо, «Начала политической экономии и налогообложения» — 5 отрывков

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Главная задача | [preface.txt](ricardo-principles/preface.txt) | `public/books/ricardo-principles/preface.mp3` | 805 | ≈ 1 мин 17 с | — |
| 2 | Редкость и труд | [scarce.txt](ricardo-principles/scarce.txt) | `public/books/ricardo-principles/scarce.mp3` | 967 | ≈ 1 мин 32 с | — |
| 3 | Сукно и вино | [wine.txt](ricardo-principles/wine.txt) | `public/books/ricardo-principles/wine.mp3` | 1 563 | ≈ 2 мин 29 с | — |
| 4 | Шляпы и башмаки | [hats.txt](ricardo-principles/hats.txt) | `public/books/ricardo-principles/hats.mp3` | 367 | ≈ 35 с | — |
| 5 | О машинах | [machinery.txt](ricardo-principles/machinery.txt) | `public/books/ricardo-principles/machinery.mp3` | 590 | ≈ 56 с | — |

### Альфред Маршалл, «Принципы экономической науки» — 7 отрывков

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Обычная жизнь | [business.txt](marshall-principles/business.txt) | `public/books/marshall-principles/business.mp3` | 458 | ≈ 44 с | — |
| 2 | Каждый следующий кусок | [satiable.txt](marshall-principles/satiable.txt) | `public/books/marshall-principles/satiable.mp3` | 569 | ≈ 54 с | — |
| 3 | Закон спроса | [demand.txt](marshall-principles/demand.txt) | `public/books/marshall-principles/demand.mp3` | 269 | ≈ 26 с | — |
| 4 | Эластичность | [elastic.txt](marshall-principles/elastic.txt) | `public/books/marshall-principles/elastic.mp3` | 458 | ≈ 44 с | — |
| 5 | Что такое рынок | [market.txt](marshall-principles/market.txt) | `public/books/marshall-principles/market.mp3` | 248 | ≈ 24 с | — |
| 6 | Два лезвия ножниц | [scissors.txt](marshall-principles/scissors.txt) | `public/books/marshall-principles/scissors.mp3` | 423 | ≈ 40 с | — |
| 7 | Загон «при прочих равных» | [ceteris.txt](marshall-principles/ceteris.txt) | `public/books/marshall-principles/ceteris.mp3` | 441 | ≈ 42 с | — |

### Фредерик Бастиа, «Что видно и чего не видно» — 3 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Хороший и плохой экономист | [intro.txt](bastiat-seen/intro.txt) | `public/books/bastiat-seen/intro.mp3` | 859 | ≈ 1 мин 22 с | — |
| 2 | Разбитое окно | [window.txt](bastiat-seen/window.txt) | `public/books/bastiat-seen/window.mp3` | 1 080 | ≈ 1 мин 43 с | — |
| 3 | Разрушение — не прибыль | [moral.txt](bastiat-seen/moral.txt) | `public/books/bastiat-seen/moral.mp3` | 672 | ≈ 1 мин 04 с | — |

### Фредерик Бастиа, «Экономические софизмы: петиция свечных мастеров» — 3 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Против солнца | [sun.txt](bastiat-candles/sun.txt) | `public/books/bastiat-candles/sun.mp3` | 863 | ≈ 1 мин 22 с | — |
| 2 | Кому выгодна темнота | [gain.txt](bastiat-candles/gain.txt) | `public/books/bastiat-candles/gain.mp3` | 523 | ≈ 50 с | — |
| 3 | Цена, равная нулю | [zero.txt](bastiat-candles/zero.txt) | `public/books/bastiat-candles/zero.mp3` | 722 | ≈ 1 мин 09 с | — |

### Дэвид Юм, «Политические рассуждения: «О деньгах», «О проценте», «О торговом балансе»» — 4 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Масло, а не колёса | [oil.txt](hume-essays/oil.txt) | `public/books/hume-essays/oil.mp3` | 521 | ≈ 50 с | — |
| 2 | Пока цены не выросли | [interval.txt](hume-essays/interval.txt) | `public/books/hume-essays/interval.mp3` | 960 | ≈ 1 мин 31 с | — |
| 3 | Если исчезнут четыре пятых денег | [fifths.txt](hume-essays/fifths.txt) | `public/books/hume-essays/fifths.mp3` | 931 | ≈ 1 мин 29 с | — |
| 4 | Отчего процент высок | [interest.txt](hume-essays/interest.txt) | `public/books/hume-essays/interest.mp3` | 472 | ≈ 45 с | — |

### Джон Мейнард Кейнс, «Экономические последствия мира» — 3 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Европа до войны | [before.txt](keynes-peace/before.txt) | `public/books/keynes-peace/before.mp3` | 822 | ≈ 1 мин 18 с | — |
| 2 | Расстроить валюту | [debauch.txt](keynes-peace/debauch.txt) | `public/books/keynes-peace/debauch.mp3` | 967 | ≈ 1 мин 32 с | — |
| 3 | Цены по закону | [prices.txt](keynes-peace/prices.txt) | `public/books/keynes-peace/prices.mp3` | 504 | ≈ 48 с | — |

### Джон Мейнард Кейнс, «Трактат о денежной реформе» — 4 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Чем важны деньги | [unit.txt](keynes-tract/unit.txt) | `public/books/keynes-tract/unit.mp3` | 635 | ≈ 1 мин 00 с | — |
| 2 | Несправедливо и нецелесообразно | [unjust.txt](keynes-tract/unjust.txt) | `public/books/keynes-tract/unjust.mp3` | 248 | ≈ 24 с | — |
| 3 | Налог печатным станком | [tax.txt](keynes-tract/tax.txt) | `public/books/keynes-tract/tax.mp3` | 579 | ≈ 55 с | — |
| 4 | В долгом периоде | [longrun.txt](keynes-tract/longrun.txt) | `public/books/keynes-tract/longrun.mp3` | 277 | ≈ 26 с | — |

### Уильям Стэнли Джевонс, «Угольный вопрос» — 2 отрывка

| № | Отрывок | Текст | Файл записи | Знаков | Звучит | Записано |
|---:|---|---|---|---:|---:|:---:|
| 1 | Над всеми товарами | [above.txt](jevons-coal/above.txt) | `public/books/jevons-coal/above.mp3` | 346 | ≈ 33 с | — |
| 2 | Экономия, которая увеличивает расход | [paradox.txt](jevons-coal/paradox.txt) | `public/books/jevons-coal/paradox.mp3` | 577 | ≈ 55 с | — |

## Полезно знать

- **Без «[…]».** В тексте для озвучки пропуски убраны, чтобы сервис не молчал на них. На экране книги
  пропуски по-прежнему отмечены «[…]».
- **Произношение.** Текст в сервисе можно править: ставить ударения так, как их понимает сервис, писать
  годы и числа словами. Имя файла от этого не меняется.
- **Текст отрывка поменяли.** Команда `npm run books:export` (или просьба к Claude) обновит эту папку —
  переозвучить нужно только этот отрывок.
- **Длительность** в таблице — оценка по записи Смита (около 10,5 знака в секунду); точная — после записи.
- **Размер.** Хватит моно MP3 на 48–64 кбит/с: минута записи — около 0,4 МБ. Записи не скачиваются
  заранее: браузер берёт их по кускам, когда книгу слушают.
- **Лицензия.** Перед публикацией проверьте в условиях сервиса, можно ли выкладывать записи на сайт.
  Под проигрывателем всегда видна подпись «голос синтезирован». Сами тексты — в общественном
  достоянии, перевод — редакции «Инфляции».
