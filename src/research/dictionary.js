/* ИССЛЕДОВАТЕЛЬСКИЙ НАБОР ДАННЫХ — единственный перечень того, что исследование может хранить (research/data-dictionary.md).
   Обычная работа Инфляции (аккаунт, прогресс, монеты, друзья, достижения) сюда не входит и этим модулем не читается:
   исследовательские записи собираются отдельно, в отдельную базу (api/_lib/research-store.js), под случайным кодом
   участника, который не выводится из аккаунта. У каждого поля — зачем оно нужно именно исследованию; поля без такого
   обоснования в наборе нет. Модуль чистый: его читают проверка записей (record.js), сервер (api/research.js),
   анализ (analyze.js) и тест, сверяющий этот перечень с research/data-dictionary.md. */

// версия протокола, под которую собраны данные; меняется только вместе с research/protocol.md (журнал изменений)
export const PROTOCOL_VERSION = '0.2';
/* Состояние исследования. 'draft' — протокол не утверждён, правовые основания не проверены, сбор НЕ ведётся: сервер
   отклоняет любую запись, даже если исследовательская база подключена. Сменить на 'open' можно только коммитом —
   после фиксации протокола и решения владельца (research/protocol.md, «Порядок запуска»). */
export const STUDY_STATUS = 'draft';
export const STUDY_STATUSES = ['draft', 'open', 'closed'];

// учебный модуль пилота — восемь уроков юнита «Сберкасса» (research/methodology.md, «Учебный модуль»); эфир hh-radio и
// мини-игра hh-g в модуль не входят
export const MODULE_UNIT = 'household';
export const MODULE_LESSONS = ['hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-rev', 'hh-sum'];
// варианты подачи материала (research/methodology.md, «Две версии»)
export const ARMS = ['game', 'plain'];
export const ARM_LABEL = { game: 'с игровыми механиками', plain: 'обычная подача' };
// какие тесты знаний бывают и из каких форм (параллельные формы — те же шаблоны задач с другими числами)
export const TEST_KINDS = ['pre', 'post', 'delayed'];
export const TEST_FORMS = ['A', 'B', 'C'];
// слой по входному тесту: рандомизация идёт внутри слоя, чтобы группы не разошлись по исходным знаниям
export const STRATA = ['low', 'high'];
export const EVENT_TYPES = ['lesson_start', 'lesson_done', 'exercise_answer', 'session_start'];
export const STAGES = ['enrolled', 'pretest', 'material', 'posttest', 'delayed'];
/* Банк теста: 12 задач, у каждой — один id во всех формах (формы A, B, C — те же шаблоны с другими числами). Сервер принимает
   тест, только если в нём ровно эти задачи, каждая по разу (research/methodology.md, «Измерения»). */
export const TEST_ITEMS = Array.from({ length: 12 }, (_, i) => `q${String(i + 1).padStart(2, '0')}`);
/* Окна (день исследования от записи, research/methodology.md, «Ход исследования»): входной — в день записи или на следующий;
   итоговый — с первого по шестнадцатый; отсроченный — с 28-го по 35-й. Вне окна тест не принимается. */
export const TEST_WINDOWS = { pre: [0, 1], post: [1, 16], delayed: [28, 35] };
// события обучения принимаются до конца окна отсроченного теста
export const EVENT_LAST_DAY = 35;

/* Поля по таблицам. type: code — код участника; enum — одно из values; int — целое от min до max; bool; id — короткий
   идентификатор учебного материала (урок, упражнение, задача теста); month — «ГГГГ-ММ»; version — строка версии.
   purpose — зачем поле исследованию (это же — в research/data-dictionary.md). */
const ID = { type: 'id' };
export const FIELDS = {
  participants: {
    participant_code: { type: 'code', required: true, purpose: 'Связать занятия, тесты и ответы одного участника без логина и аккаунта; по нему же участник отзывает участие.' },
    protocol_version: { type: 'version', required: true, purpose: 'Знать, по какой версии протокола собраны данные; данные разных версий не смешиваются без отдельного решения.' },
    consent_version: { type: 'version', required: true, purpose: 'Подтвердить, с каким текстом информации для участника он согласился.' },
    adult_confirmed: { type: 'bool', required: true, purpose: 'Критерий включения пилота — только совершеннолетние; без подтверждения запись не принимается.' },
    period: { type: 'month', required: true, purpose: 'Период проведения (месяц, без даты и времени) — для описания исследования и проверки, не сместились ли группы во времени.' },
    stratum: { type: 'enum', values: STRATA, purpose: 'Слой по входному тесту, внутри которого шла рандомизация; нужен для анализа с учётом схемы распределения.' },
    arm: { type: 'enum', values: ARMS, purpose: 'Экспериментальная группа — основное сравнение исследования.' },
    material_version: { type: 'version', purpose: 'Версия учебного модуля (сборка), которую проходил участник; обе группы должны проходить одну и ту же.' },
    stage: { type: 'enum', values: STAGES, purpose: 'Докуда дошёл участник: нужен для схемы потока участников (сколько выбыло и на каком этапе).' },
    used_regular_app: { type: 'enum', values: ['no', 'yes', 'unsure'], purpose: 'Ответ «пользовались ли вы обычной Инфляцией во время исследования» — проверка, не получила ли обычная группа игровые механики в обход схемы (смешение групп).' },
    form_order: { type: 'enum', values: ['AB', 'BA'], required: true, purpose: 'Порядок параллельных форм входного и итогового тестов (A, затем B или наоборот), назначенный сервером случайно при записи, — чтобы различие форм не совпало с этапом и его можно было учесть в анализе.' },
    /* служебное поле: хранится в исследовательской базе, НЕ выгружается. Дата записи (день, без времени) нужна серверу, чтобы
       считать день исследования и проверять окна тестов; удаляется вместе с базой при фиксации набора (retention-policy.md) */
    enrolled_on: { type: 'date', required: true, service: true, purpose: 'Дата записи — без времени; служебное поле сервера: по ней считается день исследования и проверяются окна итогового и отсроченного тестов. В выгрузку не идёт, удаляется при фиксации набора.' },
  },
  events: {
    participant_code: { type: 'code', required: true, purpose: 'Какому участнику принадлежит событие обучения.' },
    study_day: { type: 'int', min: 0, max: 60, required: true, purpose: 'День исследования от записи (0, 1, 2…) вместо даты и времени: нужен для числа активных дней и интервала до отсроченного теста.' },
    session_no: { type: 'int', min: 1, max: 200, purpose: 'Номер занятия участника — для показателя «сколько раз возвращался».' },
    event_type: { type: 'enum', values: EVENT_TYPES, required: true, purpose: 'Что произошло: начал урок, закончил урок, ответил на задание, начал занятие.' },
    lesson_id: { ...ID, purpose: 'Какой урок модуля — для доли завершённых уроков и сравнения уроков между группами.' },
    task_no: { type: 'int', min: 1, max: 99, purpose: 'Номер задания внутри урока — где в уроке участник ошибался или останавливался.' },
    exercise_id: { ...ID, purpose: 'Какое задание (одинаково в обеих группах) — для сравнения трудности заданий.' },
    correct: { type: 'bool', purpose: 'Правильность ответа на задание.' },
    attempt_no: { type: 'int', min: 1, max: 20, purpose: 'Номер попытки — для показателя «верно с первой попытки» и числа попыток.' },
    active_seconds: { type: 'int', min: 0, max: 7200, purpose: 'Активное время на уроке или задании (без простоя) — продолжительность обучения.' },
  },
  tests: {
    participant_code: { type: 'code', required: true, purpose: 'Какому участнику принадлежат ответы теста.' },
    test_kind: { type: 'enum', values: TEST_KINDS, required: true, purpose: 'Входной, итоговый или отсроченный тест — основа сравнения усвоения и закрепления.' },
    form: { type: 'enum', values: TEST_FORMS, required: true, purpose: 'Какая параллельная форма теста — чтобы учесть различия форм по трудности.' },
    item_id: { ...ID, required: true, purpose: 'Какая задача теста — для анализа надёжности теста и трудности задач.' },
    correct: { type: 'bool', required: true, purpose: 'Решена ли задача теста (балл 0/1).' },
    study_day: { type: 'int', min: 0, max: 60, required: true, purpose: 'День исследования, когда пройден тест: проверить интервал до отсроченного теста.' },
    active_seconds: { type: 'int', min: 0, max: 3600, purpose: 'Время на задачу теста — чтобы отличить попытку решения от пропуска наугад.' },
  },
};
export const TABLES = Object.keys(FIELDS);

/* Чего в исследовательских записях быть не может — ни под каким именем. Запись с таким полем сервер отклоняет целиком, а не
   «чистит»: значит, клиент собран неправильно, и это нужно увидеть. why — почему поле не нужно исследованию. */
export const FORBIDDEN = [
  { name: 'login', aliases: ['username', 'user'], why: 'Логин указывает на аккаунт; исследование связывает данные случайным кодом участника.' },
  { name: 'password', aliases: ['pass', 'hash', 'salt', 'recHash', 'recSalt'], why: 'Пароли и их хэши нужны только входу в аккаунт.' },
  { name: 'recoveryCode', aliases: ['recovery', 'rec'], why: 'Коды восстановления нужны только входу в аккаунт.' },
  { name: 'token', aliases: ['session', 'authorization', 'auth', 'cookie'], why: 'Токены авторизации нужны только входу в аккаунт.' },
  { name: 'ip', aliases: ['x-forwarded-for', 'xForwardedFor', 'remoteAddress'], why: 'Сетевой адрес не нужен ни одному показателю исследования.' },
  { name: 'parentName', aliases: ['parent'], why: 'Пилот — только совершеннолетние; имена родителей исследованию не нужны.' },
  { name: 'chat', aliases: ['messages', 'message', 'comment', 'text'], why: 'Переписки и свободный текст могут содержать что угодно о человеке; исследование их не анализирует.' },
  { name: 'friends', aliases: ['fin', 'fout', 'races'], why: 'Социальные связи — часть обычной работы Инфляции, не исследования.' },
  { name: 'playerId', aliases: ['accountId', 'userId', 'profileId', 'deviceId'], why: 'Технический идентификатор аккаунта позволил бы соединить записи с профилем.' },
  { name: 'name', aliases: ['nickname', 'nick', 'email', 'phone', 'birthYear', 'emblem'], why: 'Имя, ник, контакты, год рождения и значок не нужны показателям; совершеннолетие подтверждается отдельной отметкой.' },
  { name: 'userAgent', aliases: ['ua', 'device', 'viewport'], why: 'Строка браузера и размер экрана помогают узнать устройство и не входят в показатели.' },
  { name: 'timestamp', aliases: ['at', 'time', 'date', 'createdAt'], why: 'Точное время заменено днём исследования и месяцем проведения.' },
];
// нормализованное имя: без регистра, дефисов и подчёркиваний
const norm = (k) => String(k).toLowerCase().replace(/[-_\s]/g, '');
const FORBIDDEN_NAMES = new Map(FORBIDDEN.flatMap((f) => [f.name, ...f.aliases].map((n) => [norm(n), f.name])));
// если поле запрещено — имя его группы (login, password…), иначе null
export const forbiddenField = (key) => FORBIDDEN_NAMES.get(norm(key)) || null;
