/* ОБЩИЕ ПОМОЩНИКИ браузерных сценариев (e2e/*.e2e.js): открыть приложение с подменённым сервером, вкладки, урок
   целиком, ответы на задания, проверки «ничего не уезжает вбок». Раньше они жили в одном файле со всеми
   сценариями (smoke.e2e.js, 8 тысяч строк); сценарии разложены по разделам — app, world, textbook, path, lesson,
   extras, rewards. */
import { test, expect } from '@playwright/test';
import { SCREENS } from '../src/learn/screens.js';

/* Общая подготовка каждой страницы: серверные функции подменены, внешние
   запросы и ошибки страницы собираются — тест падает, если сайт полез за
   чем-то наружу (шрифты должны быть свои) или упал JavaScript. */
export async function openApp(page, path = '/', apiBody = '{}', { tab = 'world' } = {}) {
  const errors = []; const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost')) external.push(r.url()); });
  // свой API — только на своём адресе: чужие …/api/… (например, Википедия) тест подменяет сам
  await page.route('**/api/**', (r) => (!r.request().url().startsWith('http://localhost') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json',
    body: typeof apiBody === 'function' ? apiBody(r.request()) : apiBody })));
  await gotoApp(page, path, tab);
  return { errors, external };
}

/* Главный экран — Путь с нижней панелью; игровые тесты начинают с вкладки «Мир» (там
   прежнее меню). Если открылась партия из автосохранения, панели нет — ничего не жмём. */
export async function gotoApp(page, path = '/', tab = 'world') {
  await page.goto(path, { waitUntil: 'networkidle' });
  if (tab && tab !== 'path' && await page.getByTestId('bottom-nav').isVisible()) await openTab(page, tab);
}

// лавка — по отделам: вкладки «Витрина», «Для урока», «Ювелир», «Гардероб», «Полезное»
export async function shopTab(page, tab) {
  await page.getByTestId('shop-tabs').locator(`[data-tab="${tab}"]`).click();
  await expect(page.getByTestId('shop-panel')).toHaveAttribute('data-tab', tab);
}

/* вкладки нижней панели; Мир и Профиль — под «⋯»: касание открывает выбор из двух */
export async function openTab(page, tab) {
  const nav = page.getByTestId('bottom-nav');
  if (tab === 'world' || tab === 'profile' || tab === 'news') {
    await nav.locator('[data-tab="more"]').click();
    await nav.getByTestId('more-menu').locator(`[data-tab="${tab}"]`).click();
    return;
  }
  await nav.locator(`[data-tab="${tab}"]`).click();
}

// «Задания» — не вкладка, а экран поверх Пути: вкладка «Путь» (повторное нажатие закрывает
// открытый подэкран) и карточка «Задания» наверху
export async function openTasks(page) {
  await openTab(page, 'path');
  await page.getByTestId('tasks-card').click();
  await expect(page.getByTestId('tasks')).toBeVisible();
}

/* Вход обязателен: во всех тестах, кроме тестов первого запуска («вход: …»), пользователь уже
   вошёл — аккаунт лежит на устройстве до загрузки страницы. */
export const ACCOUNT = { token: 't', login: 'tester', name: 'Тест', emblem: 'star', kidsMode: false, birthYear: 1990 };

// учебник — своя вкладка внизу; поверх урока он открывается справочником
export async function openBook(page) {
  await openTab(page, 'book');
  await expect(page.getByTestId('textbook')).toBeVisible();
}

// у учебника в обучении один «назад»: на прошлую страницу, с первой — в оглавление (вкладка) или туда, откуда открыли
export const bookBack = (page) => page.locator('[data-testid=learn-book], [data-testid=book-tab]').locator('[data-nav="back"]').filter({ visible: true }).first().click();

export async function toToc(page) {
  for (let k = 0; k < 6 && !(await page.getByTestId('textbook').isVisible()); k += 1) await bookBack(page);
  await expect(page.getByTestId('textbook')).toBeVisible();
}

// ничего на странице не шире окна — ровно та жалоба «сайт можно увести вбок»
export async function expectNoSidewaysScroll(page) {
  // с clientWidth, а не innerWidth: на телефоне широкая страница раздвигает и innerWidth, и сравнение молчит
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - Math.min(window.innerWidth, document.documentElement.clientWidth));
  expect(overflow, 'страницу можно прокрутить вбок').toBeLessThanOrEqual(1);
}

export async function startSoloGame(page, role = 'Глава Центрального банка') {
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await page.getByText(role, { exact: true }).click();
  await page.getByRole('checkbox', { name: /Обучение по экрану/ }).uncheck();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  await expect(page.getByRole('button', { name: 'Завершить квартал и применить решения' })).toBeVisible();
}

export const accountApi = (req) => {
  let body = null; try { body = req.postDataJSON(); } catch { body = null; }
  const profile = { login: 'anna', name: 'Анна', emblem: 'star', playerId: 'p1', createdAt: Date.now(), stats: { rooms: 3, quarters: 12, leaves: 1 } };
  if (body && body.action === 'register') return JSON.stringify({ token: 'sess', profile, recoveryCode: 'ABCD-EFGH-JKMN' });
  if (body && body.action === 'recover') return JSON.stringify({ token: 'sess2', profile, recoveryCode: 'PQRS-TUVW-XYZ2' });
  if (body && body.action === 'login') return JSON.stringify({ token: 'sess', profile });
  if (body && body.action === 'me') return JSON.stringify({ profile });
  if (body && body.action === 'update') return JSON.stringify({ profile: { ...profile, emblem: body.emblem || 'star' } });
  // один друг, бывший в сети вчера, — для экранов «Друзья» и «Профиль друга»
  if (body && body.action === 'friends') {
    const at = Date.now() - 86400000;
    return JSON.stringify({ me: 'tester', friends: [{ login: 'boris', name: 'Борис', emblem: 'crown', since: at,
      card: { at, wear: {}, streak: 3, xp: 120, level: 'start', league: 'bronze', seals: ['first'], album: 1, months: [], xpDays: {}, events: [] } }], incoming: [], outgoing: [], races: [] });
  }
  return '{}';
};

/* Гостевой старт: после цели — сразу первый урок без аккаунта. Выйти из урока и с Пути
   открыть регистрацию («Сохраните прогресс»). */
export async function guestToRegister(page) {
  await expect(page.getByTestId('lesson')).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  const ask = page.getByRole('dialog', { name: 'Выйти из урока?' });
  if (await ask.isVisible().catch(() => false)) await ask.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByTestId('guest-save').getByTestId('guest-register').click();
  await expect(page.getByTestId('welcome-register')).toBeVisible();
  return page.getByTestId('welcome-register');
}

// без аккаунта не открыто ничего, кроме приветствия, входа и регистрации
export async function expectGateOnly(page) {
  for (const id of ['bottom-nav', 'shell', 'path', 'tasks', 'learn-profile', 'world', 'lesson', 'learn-book']) await expect(page.getByTestId(id)).toHaveCount(0);
}

/* Бюджет первого экрана (docs/mechanics.md, «Приветствие и загрузка»): приветствие грузит не больше 600 КБ JS
   без сжатия. Движок партии, справочники «Мира» и меню партии — ленивые чанки; раньше статический импорт
   src/lib/catalog.js тянул на приветствие весь движок, и выходило ~1,08 МБ. */
export const FIRST_SCREEN_JS_KB = 600;

/* короткая запись для теста: WAV (браузер распознаёт формат по содержимому, а не по имени .mp3), тихий синус */
/* ответ файлом с поддержкой Range, как у настоящего сервера статики: музыка играет потоком через <audio>, и перемотка
   (продолжить с той же секунды) без Range в Chromium не работает */
export function fulfillRange(route, body, contentType) {
  const m = /bytes=(\d*)-(\d*)/.exec(route.request().headers().range || '');
  if (!m) return route.fulfill({ status: 200, contentType, body, headers: { 'accept-ranges': 'bytes', 'content-length': String(body.length) } });
  const start = m[1] ? Number(m[1]) : Math.max(0, body.length - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), body.length - 1) : body.length - 1;
  const part = body.subarray(start, end + 1);
  return route.fulfill({ status: 206, contentType, body: part,
    headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': String(part.length) } });
}
export function testWav(seconds = 3, rate = 8000) {
  const n = seconds * rate; const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 2000), 44 + i * 2);
  return buf;
}

/* ------------------------------ ПУТЬ УРОКОВ ------------------------------
   Правильный ответ упражнения приложение отдаёт в data-answer только при флаге теста. */
export async function answerExercise(page, { wrong = false, skipOpen = false } = {}) {
  const ex = page.getByTestId('ex');
  const kind = await ex.getAttribute('data-kind');
  const ans = JSON.parse(await ex.getAttribute('data-answer'));
  if (kind === 'choice' || kind === 'gap') {
    await ex.locator(wrong ? `[data-key]:not([data-key="${ans}"])` : `[data-key="${ans}"]`).first().click();
  } else if (kind === 'tf') await ex.locator(`[data-key="${wrong ? !ans : ans}"]`).click();
  else if (kind === 'shift') await ex.locator(wrong ? `[data-key]:not([data-key="${ans}"])` : `[data-key="${ans}"]`).first().click();
  else if (kind === 'calc') {
    // рядом с полем — единица измерения, а не имя главы латиницей
    const unitEl = ex.getByTestId('calc-unit');
    if (await unitEl.count()) expect(await unitEl.innerText()).not.toMatch(/^[a-z_-]+$/i);
    // цифры — с экранной клавиатуры, как на телефоне
    for (const ch of wrong ? '99999' : ans) {
      if (ch === '-') await ex.getByRole('button', { name: 'Минус' }).click();
      else await ex.getByRole('group', { name: 'Цифровая клавиатура' }).getByRole('button', { name: ch, exact: true }).click();
    }
  } else if (kind === 'match') {
    // «вставьте слово»: место (определение), потом слово из банка
    const keys = Object.keys(ans);
    for (const [i, l] of keys.entries()) {
      const r = wrong ? keys[(i + 1) % keys.length] : ans[l];
      await ex.locator(`[data-side=right][data-key="${r}"]`).click();
      await ex.locator(`[data-side=left][data-key="${l}"]`).click();
    }
  } else if (kind === 'sort') {
    const bins = await ex.locator('[data-bin]').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.bin))]);
    for (const [it, b] of Object.entries(ans)) await ex.locator(`[data-item="${it}"][data-bin="${wrong ? bins.find((x) => x !== b) : b}"]`).click();
  } else if (kind === 'exam') {
    // задание экзамена: соответствие — цифра под каждой буквой, «верные суждения» — отметить пункты, один ответ — один пункт
    if (ans.form === 'match') {
      const bins = await ex.locator('[data-bin]').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.bin))]);
      for (const [it, b] of Object.entries(ans.map)) await ex.locator(`[data-item="${it}"][data-bin="${wrong ? bins.find((x) => x !== b) : b}"]`).click();
    } else if (ans.form === 'one') await ex.locator(wrong ? `[data-pick]:not([data-pick="${ans.key}"])` : `[data-pick="${ans.key}"]`).first().click();
    else {
      const all = await ex.locator('[data-pick]').evaluateAll((els) => els.map((e) => e.dataset.pick));
      for (const k of wrong ? all.filter((x) => !ans.keys.includes(x)) : ans.keys) await ex.locator(`[data-pick="${k}"]`).click();
    }
  } else if (kind === 'news') {
    for (const [v, d] of Object.entries(ans)) await ex.locator(`[data-var="${v}"][data-dir="${wrong ? (d === '+' ? '-' : '+') : d}"]`).click();
  } else if (kind === 'tiles') {
    for (const k of wrong ? [...ans].reverse() : ans) await ex.locator(`[data-tile="${k}"]`).click();
  } else if (kind === 'curve') {
    await ex.locator(`[data-curve="${ans[0]}"][data-dir="${wrong === (ans[1] === '+') ? '-' : '+'}"]`).click();
  } else if (kind === 'price') {
    await ex.getByRole('slider', { name: 'Цена' }).fill(String(wrong ? ans + 1 : ans));
  } else if (kind === 'point') {
    // точка по координатам графика: поле графика — в data-plot, в единицах viewBox
    const svg = ex.getByTestId('market-chart');
    const pl = JSON.parse(await svg.getAttribute('data-plot'));
    const box = await svg.boundingBox();
    const q = wrong ? pl.qMax * 0.1 : ans.q; const pr = wrong ? pl.pMax * 0.9 : ans.p;
    await svg.click({ position: { x: ((pl.x0 + (q / pl.qMax) * pl.w) / pl.vw) * box.width, y: ((pl.y0 + pl.h - (pr / pl.pMax) * pl.h) / pl.vh) * box.height } });
  } else if (kind === 'swipe' || kind === 'rush') {
    await playRound(page, () => wrong);
  } else if (kind === 'wallet') {
    await playWallet(page, { wrong });
  } else if (kind === 'open') {
    // открытый вопрос: неверного ответа нет — пишем свой и читаем разбор; или пропускаем — разбор откроется и так
    if (skipOpen) await page.getByTestId('open-skip').click();
    else await ex.getByTestId('open-answer').fill('Я бы не вводил потолок, а помог студентам адресно.');
  } else if (kind === 'domino') {
    // «Домино»: звенья по порядку; ошибка — ложная карточка роняет домино, дальше — с верного места
    const dom = ex.getByTestId('domino');
    await dom.locator(`[data-key="${ans[0]}"]`).click();
    if (wrong) { await dom.locator('[data-testid="domino-card"][data-key^="f"]').first().click(); await expect(dom.getByTestId('domino-why')).toBeVisible(); }
    for (const k of ans.slice(1)) await dom.locator(`[data-key="${k}"]`).click();
  }
  // мини-игра и «Домино» проверяются сами, когда доиграны
  if (!['swipe', 'rush', 'wallet', 'domino'].includes(kind) && !(kind === 'open' && skipOpen)) await page.getByRole('button', { name: kind === 'open' ? 'Ответить' : 'Проверить' }).click();
  const fb = page.getByTestId('ex-feedback');
  // домино с падением собрано — засчитано не с первого раза (data-partial), но и не ошибка
  await expect(fb).toHaveAttribute('data-ok', String(!wrong || kind === 'open' || kind === 'domino'));
  if (kind === 'domino') await expect(fb).toHaveAttribute('data-partial', String(wrong));
  if (kind === 'open' && skipOpen) { await expect(page.getByTestId('lesson-foot')).toContainText('Вопрос пропущен'); await expect(page.getByTestId('open-review')).toBeVisible(); }
  return kind;
}

/* Нарочная ошибка возможна не везде: собранное с падением домино засчитано (не с первого раза), у открытого
   вопроса неверного ответа нет. Порядок упражнений в уроке случайный, поэтому ошибка, назначенная на такое
   упражнение, переносится на следующее. mistake: true — ошибка нужна «на повтор» (практика «Повторить
   ошибки»): тогда переносится и с мини-игр — они в практику не идут (canPractice). Без переноса тест через
   раз не находил ошибку в практике (flaky на phone, smoke :1621). */
export const NO_WRONG_KINDS = ['domino', 'open'];

export const GAME_KINDS_E2E = ['swipe', 'rush', 'wallet'];

// пройти урок до экрана итогов; wrongAt — номера упражнений, где ошибиться нарочно
export async function playLesson(page, { wrongAt = [], skipOpen = false, mistake = false } = {}) {
  const kinds = new Set();
  let retries = 0;
  let cards = 0;
  let owe = 0;
  for (let i = 0; i < 70; i += 1) {
    if (await page.getByTestId('lesson-result').isVisible()) break;
    // карточки перед упражнением: шаг, слово (перевернуть), пункт итогов — прочитать и дальше
    cards += await passCards(page);
    if (await page.getByTestId('ex-retry').isVisible()) retries += 1;
    if (wrongAt.includes(i)) owe += 1;
    const kind = await page.getByTestId('ex').getAttribute('data-kind');
    const wrong = owe > 0 && !NO_WRONG_KINDS.includes(kind) && !(mistake && GAME_KINDS_E2E.includes(kind));
    if (wrong) owe -= 1;
    kinds.add(await answerExercise(page, { wrong, skipOpen }));
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  await expect(page.getByTestId('lesson-result')).toBeVisible();
  return { kinds, retries, cards };
}

export const withTestFlag = (page) => page.addInitScript(() => { window.__INFLATIA_TEST__ = true; });

/* Длинные сценарии в WebKit (эмуляция iPhone) идут в полтора-два раза дольше, чем в Chromium, и не укладывались
   в минуту — падали по таймауту в случайном месте второй половины («element is not stable» — это просто
   последнее ожидание перед таймаутом). Тройной бюджет — только в WebKit: в Chromium замедление ловится как раньше. */
export const slowInWebkit = () => test.slow(test.info().project.name === 'webkit', 'WebKit (iPhone) медленнее Chromium: длинный сценарий');

// «Откройте сами»: четыре разные цены — четыре дня в «Зерне», точки на графике, линия, «Дальше»
export async function playDiscover(page, prices = [12, 18, 26, 33]) {
  const d = page.getByTestId('discover');
  for (const p of prices) {
    await d.getByTestId('discover-price').fill(String(p));
    await expect(d.getByTestId('discover-open')).toBeEnabled({ timeout: 4000 });
    await d.getByTestId('discover-open').click();
  }
  await expect(d.getByTestId('discover-infla')).toBeVisible();
  await expect(page.getByTestId('discover-next')).toBeEnabled({ timeout: 4000 });
  await page.getByTestId('discover-next').click();
}

export async function passCards(page) {
  let n = 0;
  const card = page.getByTestId('lesson-card');
  // подпись карточки: вид и номер слова в «Словах» — по ней видно, что нажатие сработало
  // читается одним вызовом в странице: карточка может смениться между шагами, и тогда
  // getAttribute по исчезнувшему элементу ждал бы бесконечно
  const sig = () => page.evaluate(() => {
    const c = document.querySelector('[data-testid="lesson-card"]');
    if (!c || !c.checkVisibility()) return 'gone';
    const kind = c.querySelector('.ln-kind'); const word = c.querySelector('[data-word]');
    return `${c.dataset.style}|${kind ? kind.innerText : ''}|${word ? word.dataset.word : ''}`;
  });
  while (await card.isVisible()) {
    n += 1;
    // «Откройте сами»: четыре дня с разными ценами — потом «Дальше»
    if (await card.getAttribute('data-style') === 'discover') { await playDiscover(page); continue; }
    // «Все слова — ваши»: карточка конца «Слов» сама уходит к упражнениям — кнопка на это время выключена
    if (await page.getByTestId('word-end').isVisible()) { await expect(page.getByTestId('word-end')).toBeHidden({ timeout: 8000 }); continue; }
    const before = await sig();
    // в «Словах» в подвале две кнопки — «Назад» и «Дальше»: берём последнюю
    await page.getByTestId('lesson').locator('.ln-foot button').last().click();
    await expect.poll(sig).not.toBe(before);
  }
  return n;
}

export const pathNode = (page, id) => page.getByTestId('path').getByTestId('path-lesson').and(page.locator(`[data-lesson="${id}"]`));

export const UNIT_OF = { sc: 'scarcity', lm: 'labor', hh: 'household', tr: 'prices', sd: 'supply-demand', el: 'elasticity', mf: 'market-failures', mb: 'money-banks', in: 'inflation', cs: 'consumer', pr: 'production', ct: 'costs', cm: 'competition-monopoly', mc: 'monopolistic' };

export const LEVEL_OF = { scarcity: 'start', labor: 'start', household: 'start', prices: 'start', 'supply-demand': 'basic', elasticity: 'basic', 'market-failures': 'basic', 'money-banks': 'basic', inflation: 'basic', consumer: 'middle', production: 'middle', costs: 'middle', 'competition-monopoly': 'middle', monopolistic: 'middle' };

// на Пути юниты одного уровня: уровень нужного юнита — через плашку и список уровней, если юнита ещё нет на экране
export async function showUnit(page, id) {
  const unit = page.getByTestId('path').locator(`[data-testid="path-unit"][data-unit="${id}"]`);
  // повторное касание вкладки «Путь» возвращает к текущему уровню — даём ему отработать
  await page.waitForTimeout(150);
  if (await unit.count()) return unit;
  await page.getByTestId('level-switch-open').click();
  await page.getByTestId('level-picker').locator(`[data-testid=level-pick][data-level="${LEVEL_OF[id]}"]`).click();
  await expect(unit).toBeVisible();
  return unit;
}

// карточка урока → «Начать» (или «Продолжить»)
export async function startLesson(page, id, button = /Начать|Повторить/) {
  await showUnit(page, UNIT_OF[id.split('-')[0]]);
  await pathNode(page, id).click();
  const sheet = page.getByTestId('lesson-sheet');
  await expect(sheet).toHaveAttribute('data-lesson', id);
  await sheet.getByRole('button', { name: button }).click();
  await expect(page.getByTestId('lesson')).toBeVisible();
}

/* Подписи остановок Пути (docs/mechanics.md, «Навигация»): прямоугольник каждой подписи не пересекается ни с
   другой подписью, ни с плашкой «рекомендуем сейчас» / «продолжить», ни с линией дороги (полоса 16 px вдоль пути). */
export async function pathLabelClashes(page) {
  return page.evaluate(() => {
    const out = [];
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    document.querySelectorAll('[data-testid=path] .ln-route').forEach((route) => {
      const box = route.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const labels = [...route.querySelectorAll('.ln-stop-title')].map((el) => ({ r: el.getBoundingClientRect(), name: el.textContent.trim() }));
      const pins = [...route.querySelectorAll('.ln-pin')].map((el) => ({ r: el.getBoundingClientRect(), name: el.textContent.trim() }));
      labels.forEach((a, i) => labels.slice(i + 1).forEach((b) => { if (hit(a.r, b.r)) out.push(`«${a.name}» × «${b.name}»`); }));
      labels.forEach((a) => pins.forEach((p) => { if (hit(a.r, p.r)) out.push(`«${a.name}» × плашка «${p.name}»`); }));
      const path = route.querySelector('svg path');
      if (!path) return;
      const m = path.getScreenCTM(); const len = path.getTotalLength(); const half = 8 * Math.hypot(m.a, m.b);
      for (let d = 0; d <= len; d += 3) {
        const q = path.getPointAtLength(d);
        const x = m.a * q.x + m.c * q.y + m.e; const y = m.b * q.x + m.d * q.y + m.f;
        const road = { left: x - half, right: x + half, top: y - half, bottom: y + half };
        labels.forEach((a) => { if (hit(a.r, road)) out.push(`«${a.name}» × дорога`); });
      }
      // подписи не выходят за экран
      labels.forEach((a) => { if (a.r.left < 0 || a.r.right > document.documentElement.clientWidth) out.push(`«${a.name}» за краем экрана`); });
    });
    return [...new Set(out)];
  });
}

// юнит «Спрос и предложение» пройден — любой его урок открыт для повтора
export const unitDone = (page) => page.addInitScript(() => {
  if (localStorage.getItem('ems-textbook-v1')) return;
  const at = Date.now() - 86400000;
  const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum'];
  localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
});

/* Мини-игра на время: в тесте игра короче (window.__INFLATIA_GAME_SECONDS__), каждая карточка —
   один раз, пока не кончится колода или время; wrong(i) — ошибиться на i-й. max — сколько карточек
   ответить (дальше — ждать конца времени). Проверка — сама по окончании игры. */
export async function playRound(page, wrong = () => false, { seconds = 6, max = Infinity } = {}) {
  const ex = page.getByTestId('ex');
  const kind = await ex.getAttribute('data-kind');
  await page.evaluate((sec) => { window.__INFLATIA_GAME_SECONDS__ = sec; }, seconds);
  await ex.getByTestId('game-start').click();
  const card = ex.getByTestId('game-card');
  for (let i = 0; i < max && await card.count(); i += 1) {
    const side = await card.getAttribute('data-answer', { timeout: 1000 }).catch(() => null);
    if (!side) break;
    const pick = wrong(i) ? (side === 'left' ? 'right' : side === 'right' ? 'left' : side === 'up' ? 'down' : 'up') : side;
    await ex.locator(`button[data-side="${pick}"]`).click({ timeout: 1500 }).catch(() => {});
  }
  await expect(ex.getByTestId('game-final')).toBeVisible({ timeout: (seconds + 5) * 1000 });
  return kind;
}

/* «Сбереги кошелёк»: пять лет — в каждом выбрать, где держать деньги; лучший вариант игра отдаёт
   в data-best только при флаге теста. wrong — каждый год «наличными дома» (лучшим он не бывает). */
export async function playWallet(page, { wrong = false, speed = 6 } = {}) {
  const ex = page.getByTestId('ex');
  await page.evaluate((sp) => { window.__INFLATIA_GAME_SPEED__ = sp; }, speed);
  await ex.getByTestId('game-start').click();
  for (let k = 1; k <= 5; k += 1) {
    const year = ex.getByTestId('wallet-year');
    await expect(year).toHaveAttribute('data-year', String(k));
    const best = await year.getAttribute('data-best');
    await ex.locator(`[data-testid=wallet-opt][data-opt="${wrong ? 'cash' : best}"]`).click();
    await expect(ex.getByTestId('wallet-verdict')).toHaveAttribute('data-ok', String(!wrong));
    await ex.getByTestId('wallet-next').click();
  }
  await expect(ex.getByTestId('game-final')).toBeVisible();
  return 'wallet';
}

/* Навигация по карте экранов (src/learn/screens.js): на каждом экране не больше одного
   «назад» (у вкладок — ни одного), нет двух видимых переходов в одно место, а «назад» ведёт
   туда, откуда пришли. */
export async function navState(page) {
  return page.evaluate(() => {
    const vis = (el) => el.checkVisibility() && !el.closest('[inert]');
    const targets = [...document.querySelectorAll('[data-nav-target]')].filter(vis).map((el) => el.dataset.navTarget);
    const backs = [...document.querySelectorAll('[data-nav="back"]')].filter(vis).length;
    return { targets, backs };
  });
}

export async function expectScreen(page, name, seen) {
  const scr = SCREENS[name];
  await expect(page.getByTestId(scr.testid).first(), `экран «${scr.title}»`).toBeVisible();
  const { targets, backs } = await navState(page);
  const dup = targets.filter((t, i) => targets.indexOf(t) !== i);
  expect(dup, `«${scr.title}»: два пути в одно место`).toEqual([]);
  expect(backs, `«${scr.title}»: кнопок «назад»`).toBe(scr.root ? 0 : 1);
  seen.add(name);
}

// «назад» верхнего слоя: под шторкой и страницей поверх экран недоступен (inert) — его «назад» не в счёт
export const clickBack = (page) => page.locator('[data-nav="back"]:not([inert] *)').filter({ visible: true }).click();

/* АДРЕСА И ИСТОРИЯ (docs/mechanics.md, «Адреса и история»; пункт владельца 13.11): у экранов свои адреса, слои — записи
   истории. Раньше адрес был один — «/»: «Назад» браузера уводил с сайта, перезагрузка в главе возвращала на Путь,
   на главу нельзя было дать ссылку. */
export const pathOf = (page) => new URL(page.url()).pathname;

/* ВЕС ПУТИ (docs/mechanics.md, «Приветствие и загрузка»; пункт владельца 13.11): до появления Пути — не больше 1600 КБ JS
   без сжатия; главы, KaTeX, движок партии, графики, учебник, урок и лавка — по требованию. Раньше до появления Пути
   грузилось 4,9 МБ в 68 файлах: все главы и всё перечисленное. Фоновая подгрузка для офлайна — после простоя и не
   при экономии трафика. */
export const PATH_JS_KB = 1600;

export const HEAVY_CHUNK = /\/assets\/(katex|engine|recharts|recharts-deps|textbook|learn-lesson|learn-shop|learn-model(?!-thumb)|course(?!-core)|variants|glossary|game|tycoon|scarcity|supply-demand|labor|elasticity|inflation|money-banks|gdp)-[\w-]+\.js/;

/* ЧИСЛА В «МИРЕ» ПО-РУССКИ (docs/mechanics.md, «Числа в „Мире“»; пункт владельца 13.11): запятая, а не точка — на экране
   партии и в газете; в рубриках газеты — значки, а не эмодзи. Раньше ставка стояла как «5.50%», шаг ползунка — «0.25». */
export const dottedNumbers = (page) => page.evaluate(() => {
  const re = /(?<![\d.,])\d+\.\d+(?![\d.])/;
  const out = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement;
    if (!el || el.closest('script, style')) continue;
    const t = w.currentNode.textContent;
    if (re.test(t)) out.add(`«${t.trim().slice(0, 70)}» <${el.tagName.toLowerCase()}>`);
  }
  document.querySelectorAll('[aria-label], [title]').forEach((el) => ['aria-label', 'title'].forEach((a) => { const t = el.getAttribute(a) || ''; if (re.test(t)) out.add(`${a}: ${t.slice(0, 90)}`); }));
  return [...out];
});

/* КЛАВИАТУРА И ДОСТУПНОСТЬ (docs/mechanics.md, «Доступность»; пункт владельца 13.11). */
// видимые (или только для чтения с экрана) h1 и области main, которые сейчас доступны: не под уроком и не под страницей поверх
export const landmarks = (page) => page.evaluate(() => {
  const live = (el) => !el.closest('[inert]') && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  return { h1: [...document.querySelectorAll('h1')].filter(live).map((h) => h.textContent.trim().slice(0, 40)), main: [...document.querySelectorAll('main')].filter(live).length };
});

/* Общая подготовка перед каждым тестом. Файл раздела зовёт installHooks() один раз, наверху: хук должен быть
   объявлен в самом файле тестов. */
export function installHooks() {
  test.beforeEach(async ({ page }, info) => {
    // уведомление о памяти браузера уже прочитано — кроме теста самого уведомления
    if (!info.title.startsWith('память браузера:')) await page.context().addInitScript(() => { try { localStorage.setItem('ems-storage-notice', '1'); } catch { /* нет хранилища */ } });
    // знакомство с живой моделью уже показано — кроме теста самого знакомства
    if (!info.title.startsWith('живая модель: знакомство')) await page.context().addInitScript(() => { try { localStorage.setItem('ems-model-intro', JSON.stringify(['supply-demand'])); } catch { /* нет хранилища */ } });
    if (info.title.startsWith('вход:')) return;
    await page.context().addInitScript((a) => { try { localStorage.setItem('ems-account', JSON.stringify(a)); } catch { /* нет хранилища */ } }, ACCOUNT);
  });
}
