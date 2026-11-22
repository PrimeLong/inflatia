# Портреты «Персоналий»

У каждого человека в «Персоналиях» и в галерее профиля — портрет в рамке-арке. Пока фото нет,
вместо него гравированный медальон с инициалами. Чтобы появилось фото, положите картинку в папку
`public/people/` под именем из таблицы. После сборки на Vercel портрет появится сам —
сайт отдаёт его со своего адреса, поэтому Википедия ученику не нужна.

Сейчас лежит 43 из 46. Этот файл пишет команда `npm run people:export`.

## Как добавить портрет

1. **Найдите фото.** Проще всего — через статью из таблицы. Нажмите на портрет в статье, затем
   «More details» («Подробнее») — откроется страница файла на Wikimedia Commons. Там же видна
   лицензия.
2. **Проверьте лицензию.** Подходят «Public domain», «CC0», «CC BY …», «CC BY-SA …». Если написано
   «Fair use», «Non-free» или лицензии нет — это фото брать нельзя, пусть остаётся медальон.
3. **Скачайте.** На Commons — «Download», размер около 500–800 px по ширине. Сразу запишите автора и
   лицензию в `credits.csv` (ниже): при пережатии метаданные файла стираются.
4. **Назовите файл** как в столбце «Имя файла» — например, `robbins.jpg`. Маленькие латинские
   буквы, как в таблице. Подходят `.jpg`, `.png` и `.webp`.
5. **Загрузите в `public/people/`.** На GitHub: откройте `public/people` → **Add file → Upload
   files** → перетащите картинки → **Commit changes**.
6. **Пережмите:** `npm run people:optimize` (нужен ffmpeg) — ширина до 480 px, JPEG до 80 КБ, без
   метаданных. `npm run people:optimize -- --check` только проверяет. Загрузили через GitHub без
   пережатия — фото всё равно появится, но будет тяжелее; пережать можно потом.
7. Vercel соберёт сайт сам — и вместо медальона появится фото.

**Как фото встанет в рамку.** Рамка вертикальная, примерно 4:5, верх — арка. Фото обрезается по
рамке, середина чуть выше центра: лицо лучше держать в верхней трети кадра. На сайте файл — не шире
480 px и не больше 80 КБ (`npm run people:optimize`). Портрет в овале (старая гравюра, фото в паспарту) обрежьте до прямоугольника внутри овала: иначе в
рамке-арке виден овал в прямоугольнике.

## Подпись: автор и лицензия

Подпись нужна **у каждого фото** — и для «Public domain» тоже: без автора, лицензии и ссылки фото не
проходит проверку (`npm test`). Откройте [`credits.csv`](credits.csv) и заполните строку человека:
`id;автор;лицензия;ссылка;заметка`. Например:

```
robbins;Имя Фамилия автора;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:Имя_файла.jpg;
```

Автор и лицензия — со страницы файла на Commons, ссылка — адрес этой страницы (файла на Commons нет —
адрес источника). Под портретом появится «Фото: автор · лицензия · Wikimedia Commons» (файл из самой Википедии — «· Википедия»). Заметка — для
себя (на экран не идёт): откуда фото, что ещё проверить. Точку с запятой внутри полей не ставьте — это
разделитель. Лицензию найти нельзя или фото не то, что на странице, — не кладите его: пусть будет
медальон.

## Кто есть

| № | Кто | Годы | Уроки | Имя файла | Где взять фото | Лежит |
|---:|---|---|---|---|---|---|
| 1 | Лайонел Роббинс | 1898–1984 | Люди выбора | `robbins.jpg` | [статья](https://en.wikipedia.org/wiki/Lionel_Robbins,_Baron_Robbins) | ✓ robbins.jpg, подпись есть |
| 2 | Томас Мальтус | 1766–1834 | Люди выбора | `malthus.jpg` | [статья](https://en.wikipedia.org/wiki/Thomas_Robert_Malthus) | ✓ malthus.jpg, подпись есть |
| 3 | Давид Рикардо | 1772–1823 | Люди выбора | `ricardo.jpg` | [статья](https://en.wikipedia.org/wiki/David_Ricardo) | ✓ ricardo.jpg, подпись есть |
| 4 | Франко Модильяни | 1918–2003 | Люди сбережений | `modigliani.jpg` | [статья](https://en.wikipedia.org/wiki/Franco_Modigliani) | ✓ modigliani.jpg, подпись есть |
| 5 | Милтон Фридман | 1912–2006 | Люди сбережений, Люди цен | `friedman.jpg` | [статья](https://en.wikipedia.org/wiki/Milton_Friedman) | ✓ friedman.jpg, подпись есть |
| 6 | Ирвинг Фишер | 1867–1947 | Люди сбережений, Люди цен | `fisher.jpg` | [статья](https://en.wikipedia.org/wiki/Irving_Fisher) | ✓ fisher.jpg, подпись есть |
| 7 | Карл Менгер | 1840–1921 | Люди ценности | `menger.jpg` | [статья](https://en.wikipedia.org/wiki/Carl_Menger) | — |
| 8 | Адам Смит | 1723–1790 | Люди ценности, Люди рынка | `smith.jpg` | [статья](https://en.wikipedia.org/wiki/Adam_Smith) | ✓ smith.jpg, подпись есть |
| 9 | Фридрих Хайек | 1899–1992 | Люди ценности | `hayek.jpg` | [статья](https://en.wikipedia.org/wiki/Friedrich_Hayek) | ✓ hayek.jpg, подпись есть |
| 10 | Джон Бейтс Кларк | 1847–1938 | Люди труда | `clark.jpg` | [статья](https://en.wikipedia.org/wiki/John_Bates_Clark) | ✓ clark.jpg, подпись есть |
| 11 | Джоан Робинсон | 1903–1983 | Люди труда, Люди бренда | `robinson.jpg` | [статья](https://en.wikipedia.org/wiki/Joan_Robinson) | ✓ robinson.jpg, подпись есть |
| 12 | Гэри Беккер | 1930–2014 | Люди труда | `becker.jpg` | [статья](https://en.wikipedia.org/wiki/Gary_Becker) | ✓ becker.jpg, подпись есть |
| 13 | Флеминг Дженкин | 1833–1885 | Люди рынка | `jenkin.jpg` | [статья](https://en.wikipedia.org/wiki/Fleeming_Jenkin) | ✓ jenkin.jpg, подпись есть |
| 14 | Альфред Маршалл | 1842–1924 | Люди рынка | `marshall.jpg` | [статья](https://en.wikipedia.org/wiki/Alfred_Marshall) | ✓ marshall.jpg, подпись есть |
| 15 | Торстейн Веблен | 1857–1929 | Люди чисел | `veblen.jpg` | [статья](https://en.wikipedia.org/wiki/Thorstein_Veblen) | — |
| 16 | Эрнст Энгель | 1821–1896 | Люди чисел | `engel.jpg` | [статья](https://en.wikipedia.org/wiki/Ernst_Engel) | ✓ engel.jpg, подпись есть |
| 17 | Роберт Гиффен | 1837–1910 | Люди чисел | `giffen.jpg` | [статья](https://en.wikipedia.org/wiki/Robert_Giffen) | ✓ giffen.jpg, подпись есть |
| 18 | Артур Пигу | 1877–1959 | Люди общего | `pigou.jpg` | [статья](https://en.wikipedia.org/wiki/Arthur_Cecil_Pigou) | ✓ pigou.jpg, подпись есть |
| 19 | Рональд Коуз | 1910–2013 | Люди общего | `coase.jpg` | [статья](https://en.wikipedia.org/wiki/Ronald_Coase) | ✓ coase.jpg, подпись есть |
| 20 | Элинор Остром | 1933–2012 | Люди общего | `ostrom.jpg` | [статья](https://en.wikipedia.org/wiki/Elinor_Ostrom) | ✓ ostrom.jpg, подпись есть |
| 21 | Джон Ло | 1671–1729 | Люди денег | `law.jpg` | [статья](https://en.wikipedia.org/wiki/John_Law_%28economist%29) | ✓ law.jpg, подпись есть |
| 22 | Уолтер Бэджет | 1826–1877 | Люди денег | `bagehot.jpg` | [статья](https://en.wikipedia.org/wiki/Walter_Bagehot) | ✓ bagehot.jpg, подпись есть |
| 23 | Сергей Витте | 1849–1915 | Люди денег | `witte.jpg` | [статья](https://en.wikipedia.org/wiki/Sergei_Witte) | ✓ witte.jpg, подпись есть |
| 24 | Пол Волкер | 1927–2019 | Люди цен | `volcker.jpg` | [статья](https://en.wikipedia.org/wiki/Paul_Volcker) | ✓ volcker.jpg, подпись есть |
| 25 | Уильям Стэнли Джевонс | 1835–1882 | Люди пользы | `jevons.jpg` | [статья](https://en.wikipedia.org/wiki/William_Stanley_Jevons) | ✓ jevons.jpg, подпись есть |
| 26 | Жюль Дюпюи | 1804–1866 | Люди пользы | `dupuit.jpg` | [статья](https://en.wikipedia.org/wiki/Jules_Dupuit) | ✓ dupuit.jpg, подпись есть |
| 27 | Даниэль Канеман | 1934–2024 | Люди пользы | `kahneman.jpg` | [статья](https://en.wikipedia.org/wiki/Daniel_Kahneman) | ✓ kahneman.jpg, подпись есть |
| 28 | Генри Форд | 1863–1947 | Люди производства | `ford.jpg` | [статья](https://en.wikipedia.org/wiki/Henry_Ford) | ✓ ford.jpg, подпись есть |
| 29 | Фредерик Тейлор | 1856–1915 | Люди производства | `taylor.jpg` | [статья](https://en.wikipedia.org/wiki/Frederick_Winslow_Taylor) | ✓ taylor.jpg, подпись есть |
| 30 | Якоб Винер | 1892–1970 | Люди производства | `viner.jpg` | [статья](https://en.wikipedia.org/wiki/Jacob_Viner) | ✓ viner.jpg, подпись есть |
| 31 | Антуан Огюстен Курно | 1801–1877 | Люди власти рынка | `cournot.jpg` | [статья](https://en.wikipedia.org/wiki/Antoine_Augustin_Cournot) | ✓ cournot.jpg, подпись есть |
| 32 | Джон Д. Рокфеллер | 1839–1937 | Люди власти рынка | `rockefeller.jpg` | [статья](https://en.wikipedia.org/wiki/John_D._Rockefeller) | ✓ rockefeller.jpg, подпись есть |
| 33 | Йозеф Шумпетер | 1883–1950 | Люди власти рынка | `schumpeter.jpg` | [статья](https://en.wikipedia.org/wiki/Joseph_Schumpeter) | ✓ schumpeter.jpg, подпись есть |
| 34 | Эдвард Чемберлин | 1899–1967 | Люди бренда | `chamberlin.jpg` | [статья](https://en.wikipedia.org/wiki/Edward_Chamberlin) | ✓ chamberlin.jpg, подпись есть |
| 35 | Гарольд Хотеллинг | 1895–1973 | Люди бренда | `hotelling.jpg` | [статья](https://en.wikipedia.org/wiki/Harold_Hotelling) | — |
| 36 | Анн Робер Жак Тюрго | 1727–1781 | Люди отдачи | `turgot.jpg` | [статья](https://en.wikipedia.org/wiki/Anne_Robert_Jacques_Turgot) | ✓ turgot.jpg, подпись есть |
| 37 | Иоганн Генрих фон Тюнен | 1783–1850 | Люди отдачи | `thunen.jpg` | [статья](https://en.wikipedia.org/wiki/Johann_Heinrich_von_Thunen) | ✓ thunen.jpg, подпись есть |
| 38 | Пол Дуглас | 1892–1976 | Люди отдачи | `douglas.jpg` | [статья](https://en.wikipedia.org/wiki/Paul_Douglas) | ✓ douglas.jpg, подпись есть |
| 39 | Бенджамин Франклин | 1706–1790 | «Чтение» | `franklin.jpg` | [статья](https://en.wikipedia.org/wiki/Benjamin_Franklin) | ✓ franklin.jpg, подпись есть |
| 40 | Генри Хэзлитт | 1894–1993 | «Чтение» | `hazlitt.jpg` | [статья](https://en.wikipedia.org/wiki/Henry_Hazlitt) | ✓ hazlitt.jpg, подпись есть |
| 41 | Джон Мейнард Кейнс | 1883–1946 | «Чтение» | `keynes.jpg` | [статья](https://en.wikipedia.org/wiki/John_Maynard_Keynes) | ✓ keynes.jpg, подпись есть |
| 42 | Джон Хикс | 1904–1989 | «Чтение» | `hicks.jpg` | [статья](https://en.wikipedia.org/wiki/John_Hicks) | ✓ hicks.jpg, подпись есть |
| 43 | Дэвид Юм | 1711–1776 | «Чтение» | `hume.jpg` | [статья](https://en.wikipedia.org/wiki/David_Hume) | ✓ hume.jpg, подпись есть |
| 44 | Пьеро Сраффа | 1898–1983 | «Чтение» | `sraffa.jpg` | [статья](https://en.wikipedia.org/wiki/Piero_Sraffa) | ✓ sraffa.jpg, подпись есть |
| 45 | Томас Соуэлл | род. 1930 | «Чтение» | `sowell.jpg` | [статья](https://en.wikipedia.org/wiki/Thomas_Sowell) | ✓ sowell.jpg, подпись есть |
| 46 | Фредерик Бастиа | 1801–1850 | «Чтение» | `bastiat.jpg` | [статья](https://en.wikipedia.org/wiki/Fr%C3%A9d%C3%A9ric_Bastiat) | ✓ bastiat.jpg, подпись есть |
