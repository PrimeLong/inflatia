# Источники и обзор литературы

К [протоколу](protocol.md) версии 0.2. Обзор объясняет, почему исследование устроено именно так: что уже известно о геймификации в обучении, где в этих данных слабые места и какие методические решения из них следуют. Перед фиксацией протокола каждую ссылку нужно сверить по DOI с оригиналом. Номера в квадратных скобках — источники из списка в конце.

## 1. Что такое геймификация и чем она не является

Геймификация — использование элементов игрового дизайна в неигровом контексте [1]. Это не обучающая игра целиком, а игровой слой поверх обычной деятельности: очки, награды, достижения, уровни, серии, рейтинги, персонажи. Теория геймифицированного обучения [2] разделяет два пути влияния:

- игровые элементы меняют **поведение и установки** учащегося: сколько он занимается, возвращается ли, вовлечён ли;
- уже это поведение влияет на **результат обучения**.

Следовательно, эффект на знания, если он есть, ожидается прежде всего через вовлечённость. Поэтому в исследовании два основных показателя — вовлечённость (H1) и знания (H2), а связь между ними анализируется разведочно ([план анализа](analysis-plan.md), раздел 5).

## 2. Что показывают обзоры и метаанализы

- **Ранние обзоры** [3] нашли преимущественно положительные, но неоднородные результаты. Многие исследования были малыми, без контрольной группы и с коротким сроком; эффект сильно зависел от контекста и пользователей. Более поздний обзор поля [4] подтверждает рост числа исследований и ту же неоднородность.
- **Метаанализ по обучению** [5] нашёл значимые положительные эффекты: на когнитивные результаты (g ≈ 0,49), мотивацию (g ≈ 0,36) и поведение (g ≈ 0,25). Однако эффект на когнитивные результаты оставался устойчивым только в исследованиях с более строгим дизайном. Важна и роль контекста: игровой слой и сама учебная задача могут смешиваться.
- **Метаанализ образовательных исследований** [6] — средний положительный эффект на учебные результаты (g ≈ 0,50) с заметной неоднородностью. Качественная часть того же обзора называет и механизмы — признание, обратную связь, соревнование, — и риски: тревогу от сравнения и потерю интереса после новизны.

**Вывод для дизайна.** Средний эффект ожидаемо положительный и умеренный. Но он неустойчив к строгости дизайна, поэтому нужны рандомизация, контроль исходных знаний и заранее зафиксированный план анализа [24].

## 3. Риски и противоречия

- **Подрыв внутренней мотивации внешними наградами.** Метаанализ экспериментов [7] показал, что ожидаемые материальные награды, зависящие от выполнения задания, снижают внутреннюю мотивацию к самому занятию. Теория самодетерминации [8] объясняет это так: награда, которую воспринимают как контроль, ущемляет чувство автономии. Геймификация с монетами и наградами может работать так же.
- **Отрицательные результаты в реальных курсах.** В лонгитюдном исследовании геймифицированного университетского курса с бейджами и рейтингом [9] у студентов геймифицированной группы снизились внутренняя мотивация и удовлетворённость, а итоговые оценки оказались ниже.
- **Эффект новизны.** Воспринимаемая польза от геймификации снижается по мере использования [10]. Короткое исследование может завысить эффект.

**Вывод для дизайна:**
- Гипотезы проверяются двусторонне: результат «игровая версия хуже» возможен и будет сообщён.
- Лиги с соревнованием исключены из обеих версий ([протокол](protocol.md), п. 6).
- Отсроченный тест (через две недели после модуля) важнее итогового: он отчасти отделяет закрепление от кратковременного эффекта новизны.
- Ограничение «короткий срок» прямо названо в протоколе.

## 4. Обратная связь, тестирование и интервалы — что должно быть одинаковым в обеих версиях

- **Обратная связь** о правильности и о том, как исправить ошибку, — один из самых сильных факторов обучения [11]. Если дать её только игровой версии, сравнение будет мерить эффект обратной связи, а не игры. Поэтому содержательная обратная связь в обеих версиях одинакова, и обычную группу ею не обделяют.
- **Эффект тестирования**: сама проверка знаний улучшает их сохранение [12]. Входной и итоговый тесты «учат» обе группы одинаково, поэтому они не смещают сравнение. Но абсолютные приросты нельзя приписывать только модулю ([методика](methodology.md), раздел 6).
- **Распределённая практика** улучшает долговременное сохранение [13]. Повторение ошибок по расписанию входит в обе версии, иначе различалось бы не только игровое оформление.

## 5. Почему базовые экономические знания и почему отсроченный тест

- **Финансовая грамотность** связана с экономическими решениями людей, и её уровень у взрослых во многих странах низок [14].
- Метаанализы обучения финансовой грамотности расходятся:
  - одни находят небольшие эффекты на знания и ещё меньшие — на поведение, причём эффект ослабевает со временем [15];
  - другие — более заметные эффекты на грамотность, особенно у вмешательств с большей «дозой» и в момент, когда решение актуально («teachable moment») [16].

Это довод в пользу модуля про бюджет, подушку безопасности и сложный процент: темы практичные, взрослому актуальные. И довод за обязательный отсроченный тест: знания, видимые сразу, быстро угасают.

## 6. Методические источники

- **Отчётность рандомизированных исследований** — CONSORT 2010 [17] и его расширение для пилотных исследований и исследований выполнимости [18]. По ним построены схема потока участников и разделы [отчёта](results.md).
- **Размер пилота**:
  - правило «около 12 человек в группе» для оценки разброса [19];
  - зависимость рекомендуемого размера пилота от ожидаемого эффекта основного исследования [20];
  - пилоты не годятся для оценки величины эффекта и расчёта мощности по ней [21] — поэтому из пилота берутся только разброс, корреляции и выбывание ([план анализа](analysis-plan.md), раздел 2).
- **Ковариационный анализ с входным измерением** точнее сравнения приростов или итоговых значений [22]. Формула размера выборки для него учитывает корреляцию входного и итогового измерений [23].
- **Предрегистрация** протокола и плана анализа до сбора данных [24].
- **Наименьший интересующий эффект и проверка эквивалентности** — чтобы честно писать «эффекта практически нет», а не просто «не значимо» [25].
- **Статистические процедуры**:
  - поправка Холма на множественные сравнения [26];
  - интервал Ньюкомба для разности долей [27];
  - надёжность теста по KR-20 [28].
- **Пропущенные данные**: теория пропусков [29] и практика множественной импутации [30] — для плана по H2 ([план анализа](analysis-plan.md), раздел 7).
- **Содержательная валидность теста** и её оценка экспертами — индекс содержательной валидности [31] ([методика](methodology.md), раздел 10).
- **Угрозы валидности** экспериментальных дизайнов, в том числе влияние предварительного тестирования [32].
- **Сокрытие распределения.** Предсказуемость следующей группы оценивают стратегией «сходимости» — ставить на отстающую группу [37]; перемешанные блоки малого размера угадываются заметно чаще, чем менее строгие схемы с ограниченным перекосом [36]. Поэтому распределение идёт по схеме «большая палка» [35] (перекос в слое не больше 3), а не блоками по 2 и 4 ([методика](methodology.md), раздел 1).

## 7. Этика и право

- Этические принципы исследований в образовании [33]: добровольное информированное согласие, право выйти без последствий, минимизация данных, недопущение вреда группе сравнения.
- Обработка персональных данных в России — Федеральный закон № 152-ФЗ [34]. Применимость к исследованию (в том числе п. 8 ч. 1 ст. 6) определяет правовая проверка, а не этот обзор ([протокол](protocol.md), п. 11).

## Список источников

1. Deterding S., Dixon D., Khaled R., Nacke L. From game design elements to gamefulness: defining "gamification" // Proceedings of the 15th International Academic MindTrek Conference. 2011. P. 9–15. doi:10.1145/2181037.2181040
2. Landers R. N. Developing a theory of gamified learning: linking serious games and gamification of learning // Simulation & Gaming. 2014. Vol. 45, № 6. P. 752–768. doi:10.1177/1046878114563660
3. Hamari J., Koivisto J., Sarsa H. Does gamification work? A literature review of empirical studies on gamification // Proceedings of the 47th Hawaii International Conference on System Sciences. 2014. P. 3025–3034. doi:10.1109/HICSS.2014.377
4. Koivisto J., Hamari J. The rise of motivational information systems: a review of gamification research // International Journal of Information Management. 2019. Vol. 45. P. 191–210. doi:10.1016/j.ijinfomgt.2018.10.013
5. Sailer M., Homner L. The gamification of learning: a meta-analysis // Educational Psychology Review. 2020. Vol. 32, № 1. P. 77–112. doi:10.1007/s10648-019-09498-w
6. Bai S., Hew K. F., Huang B. Does gamification improve student learning outcome? Evidence from a meta-analysis and synthesis of qualitative data in educational contexts // Educational Research Review. 2020. Vol. 30. Art. 100322. doi:10.1016/j.edurev.2020.100322
7. Deci E. L., Koestner R., Ryan R. M. A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation // Psychological Bulletin. 1999. Vol. 125, № 6. P. 627–668. doi:10.1037/0033-2909.125.6.627
8. Ryan R. M., Deci E. L. Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being // American Psychologist. 2000. Vol. 55, № 1. P. 68–78. doi:10.1037/0003-066X.55.1.68
9. Hanus M. D., Fox J. Assessing the effects of gamification in the classroom: a longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance // Computers & Education. 2015. Vol. 80. P. 152–161. doi:10.1016/j.compedu.2014.08.019
10. Koivisto J., Hamari J. Demographic differences in perceived benefits from gamification // Computers in Human Behavior. 2014. Vol. 35. P. 179–188. doi:10.1016/j.chb.2014.03.007
11. Hattie J., Timperley H. The power of feedback // Review of Educational Research. 2007. Vol. 77, № 1. P. 81–112. doi:10.3102/003465430298487
12. Roediger H. L., Karpicke J. D. Test-enhanced learning: taking memory tests improves long-term retention // Psychological Science. 2006. Vol. 17, № 3. P. 249–255. doi:10.1111/j.1467-9280.2006.01693.x
13. Cepeda N. J., Pashler H., Vul E., Wixted J. T., Rohrer D. Distributed practice in verbal recall tasks: a review and quantitative synthesis // Psychological Bulletin. 2006. Vol. 132, № 3. P. 354–380. doi:10.1037/0033-2909.132.3.354
14. Lusardi A., Mitchell O. S. The economic importance of financial literacy: theory and evidence // Journal of Economic Literature. 2014. Vol. 52, № 1. P. 5–44. doi:10.1257/jel.52.1.5
15. Fernandes D., Lynch J. G., Netemeyer R. G. Financial literacy, financial education, and downstream financial behaviors // Management Science. 2014. Vol. 60, № 8. P. 1861–1883. doi:10.1287/mnsc.2013.1849
16. Kaiser T., Menkhoff L. Does financial education impact financial literacy and financial behavior, and if so, when? // The World Bank Economic Review. 2017. Vol. 31, № 3. P. 611–630. doi:10.1093/wber/lhx018
17. Schulz K. F., Altman D. G., Moher D. CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials // BMJ. 2010. Vol. 340. c332. doi:10.1136/bmj.c332
18. Eldridge S. M., Chan C. L., Campbell M. J. et al. CONSORT 2010 statement: extension to randomised pilot and feasibility trials // BMJ. 2016. Vol. 355. i5239. doi:10.1136/bmj.i5239
19. Julious S. A. Sample size of 12 per group rule of thumb for a pilot study // Pharmaceutical Statistics. 2005. Vol. 4, № 4. P. 287–291. doi:10.1002/pst.185
20. Whitehead A. L., Julious S. A., Cooper C. L., Campbell M. J. Estimating the sample size for a pilot randomised trial to minimise the overall trial sample size for the external pilot and main trial for a continuous outcome variable // Statistical Methods in Medical Research. 2016. Vol. 25, № 3. P. 1057–1073. doi:10.1177/0962280215588241
21. Leon A. C., Davis L. L., Kraemer H. C. The role and interpretation of pilot studies in clinical research // Journal of Psychiatric Research. 2011. Vol. 45, № 5. P. 626–629. doi:10.1016/j.jpsychires.2010.10.008
22. Vickers A. J., Altman D. G. Analysing controlled trials with baseline and follow up measurements // BMJ. 2001. Vol. 323. P. 1123–1124. doi:10.1136/bmj.323.7321.1123
23. Borm G. F., Fransen J., Lemmens W. A. J. G. A simple sample size formula for analysis of covariance in randomized clinical trials // Journal of Clinical Epidemiology. 2007. Vol. 60, № 12. P. 1234–1238. doi:10.1016/j.jclinepi.2007.02.006
24. Nosek B. A., Ebersole C. R., DeHaven A. C., Mellor D. T. The preregistration revolution // Proceedings of the National Academy of Sciences. 2018. Vol. 115, № 11. P. 2600–2606. doi:10.1073/pnas.1708274114
25. Lakens D. Equivalence tests: a practical primer for t tests, correlations, and meta-analyses // Social Psychological and Personality Science. 2017. Vol. 8, № 4. P. 355–362. doi:10.1177/1948550617697177
26. Holm S. A simple sequentially rejective multiple test procedure // Scandinavian Journal of Statistics. 1979. Vol. 6, № 2. P. 65–70.
27. Newcombe R. G. Interval estimation for the difference between independent proportions: comparison of eleven methods // Statistics in Medicine. 1998. Vol. 17, № 8. P. 873–890.
28. Kuder G. F., Richardson M. W. The theory of the estimation of test reliability // Psychometrika. 1937. Vol. 2, № 3. P. 151–160.
29. Little R. J. A., Rubin D. B. Statistical Analysis with Missing Data. 3rd ed. Hoboken: Wiley, 2019.
30. White I. R., Royston P., Wood A. M. Multiple imputation using chained equations: issues and guidance for practice // Statistics in Medicine. 2011. Vol. 30, № 4. P. 377–399. doi:10.1002/sim.4067
31. Lynn M. R. Determination and quantification of content validity // Nursing Research. 1986. Vol. 35, № 6. P. 382–385.
32. Campbell D. T., Stanley J. C. Experimental and Quasi-Experimental Designs for Research. Chicago: Rand McNally, 1963.
33. British Educational Research Association. Ethical Guidelines for Educational Research. 4th ed. London: BERA, 2018.
34. Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных».
35. Soares J. F., Wu C. F. J. Some restricted randomization rules in sequential designs // Communications in Statistics — Theory and Methods. 1983. Vol. 12, № 17. P. 2017–2034. doi:10.1080/03610928308828586
36. Berger V. W., Ivanova A., Knoll M. D. Minimizing predictability while retaining balance through the use of less restrictive randomization procedures // Statistics in Medicine. 2003. Vol. 22, № 19. P. 3017–3028. doi:10.1002/sim.1538
37. Blackwell D., Hodges J. L. Design for the control of selection bias // Annals of Mathematical Statistics. 1957. Vol. 28, № 2. P. 449–460.
