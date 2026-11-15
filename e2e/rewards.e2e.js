/* БРАУЗЕРНЫЕ СЦЕНАРИИ — лавка, сад, копилка, лиги, церемонии, уведомления, новости, профиль, защита монет.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/rewards.e2e.js */
import { test, expect } from '@playwright/test';
import {
  openApp, gotoApp, shopTab, openTab, openBook, expectNoSidewaysScroll, accountApi, playLesson, withTestFlag, pathNode, startLesson, installHooks, ACCOUNT,
} from './helpers.js';

installHooks();

test('сад: полили две сухие грядки подряд — дождь над обеими, второй полив не обрывает первый', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const now = Date.now(); const H = 3600000;
    // два пиона посажены почти сутки назад и не политы — земля сухая
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: now - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: now - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 500 },
      garden: { [now - 20 * H]: 'peony@0', [now - 21 * H]: 'peony@1' } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await page.getByTestId('shop').getByTestId('shop-switch').locator('[data-view="garden"]').click();
  const garden = page.getByTestId('garden');
  await expect(garden.getByTestId('garden-dry')).toHaveCount(2);
  await garden.getByTestId('garden-pour').first().click();
  await garden.getByTestId('garden-pour').first().click();
  await expect(garden.getByTestId('garden-rain')).toHaveCount(2);
  await expect(garden.getByTestId('garden-dry')).toHaveCount(0);
  // дождь доигрывает и уходит сам
  await expect(garden.getByTestId('garden-rain')).toHaveCount(0, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test('лавка → сад: урожай с редкостью — продать или оставить, семена садятся за монеты, растение растёт без приложения', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const now = Date.now(); const H = 3600000;
    // ромашка посажена три часа назад (растёт два) — созрела; тюльпан — пять часов из восьми
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: now - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: now - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 500 },
      garden: { [now - 3 * H]: 'chamomile@0', [now - 5 * H]: 'tulip@1' } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  const shop = page.getByTestId('shop');
  await expect(shop.getByTestId('garden-ripe')).toHaveText('1');
  await shop.getByTestId('shop-switch').locator('[data-view="garden"]').click();
  await expect(shop).toHaveAttribute('data-view', 'garden');
  const garden = page.getByTestId('garden');
  await expect(garden.locator('[data-testid=garden-plot][data-plant="chamomile"]')).toHaveAttribute('data-stage', 'bloom');
  await expect(garden.locator('[data-testid=garden-plot][data-plant="tulip"]')).toHaveAttribute('data-stage', 'bud');
  await expect(garden.locator('[data-testid=garden-plot][data-plant="tulip"] [data-testid=garden-left]')).toContainText('3 ч');
  // шансы показываем: у каждой редкости — шанс и во сколько раз дороже; кнопка «Шансы урожая» — таблица
  await expect(garden.locator('[data-testid=garden-grades] > [data-grade="rare"]')).toContainText('6% ×1,4');
  await expect(garden.locator('[data-testid=garden-grades] > [data-grade="myth"]')).toContainText('0,1% ×6');
  await expect(garden.getByTestId('garden-odds-open')).toHaveCount(1);
  // на пакетике видно, можно ли купить: «Посадить» — или что мешает, и кнопка выключена
  const seedStates = await garden.getByTestId('garden-seed').evaluateAll((els) => els.map((e) => { const b = e.querySelector('[data-testid=garden-plant]'); return [e.dataset.state, b.textContent, b.disabled]; }));
  seedStates.forEach(([st, text, off]) => {
    if (st === 'ok') expect([text, off]).toEqual(['Посадить', false]);
    else { expect(off).toBe(true); expect(text).toMatch(/^(Не хватает \d+|Грядки заняты)$/); }
  });
  // собрать — урожай с редкостью, грядка свободна, ромашка в гербарии
  await garden.getByTestId('garden-harvest').click();
  const result = garden.getByTestId('garden-result');
  // редкость выпадает от времени посадки: у легендарного и небывалого заголовок — сама редкость
  await expect(result).toContainText(/Новое растение в гербарии|(Легендарный|Небывалый) урожай!/i);
  await expect(result.locator('[data-grade]').first()).toBeVisible();
  await expect(garden.locator('[data-testid=herb-item][data-plant="chamomile"]')).toHaveAttribute('data-kept', '1');
  await expect(garden.locator('[data-testid=herb-item][data-plant="orchid"]')).toHaveAttribute('data-got', 'false');
  await expect(garden.getByTestId('garden-crop')).toHaveCount(1);
  // в урожае — за сколько куплены семена, цена на рынке и разница
  await expect(garden.getByTestId('garden-crop-price')).toContainText(/семена — \d+ · на рынке — \d+/);
  await expect(garden.getByTestId('garden-crop').getByTestId('garden-profit')).toBeVisible();
  await expect(shop.getByTestId('garden-ripe')).toHaveCount(0);
  // продать — монеты в кошелёк, в коллекции пусто, но ромашка уже выращена
  const coins0 = Number(await garden.getByTestId('garden-balance').innerText());
  await result.getByTestId('garden-result-sell').click();
  await expect(garden.getByTestId('garden-msg')).toContainText('Продано: Ромашка');
  expect(Number(await garden.getByTestId('garden-balance').innerText())).toBeGreaterThan(coins0);
  await expect(garden.getByTestId('garden-crop')).toHaveCount(0);
  await expect(garden.locator('[data-testid=herb-item][data-plant="chamomile"]')).toHaveAttribute('data-got', 'true');
  await expect(garden.locator('[data-testid=herb-item][data-plant="chamomile"]')).toHaveAttribute('data-kept', '0');
  // посадить подсолнух: монеты списаны по курсу, на грядке — семечко
  const before = Number(await garden.getByTestId('garden-balance').innerText());
  await garden.locator('[data-testid=garden-seed][data-plant="sunflower"] [data-testid=garden-plant]').click();
  await expect(garden.getByTestId('garden-msg')).toContainText('Посадили: Подсолнух');
  await expect(garden.locator('[data-testid=garden-plot][data-plant="sunflower"]')).toHaveAttribute('data-stage', 'seed');
  expect(Number(await garden.getByTestId('garden-balance').innerText())).toBeLessThan(before);
  await expect(garden.getByTestId('garden-free')).toHaveText('4');
  // долгим растениям нужен полив: на пакетике — «полив раз в 12 ч», на грядке — запас воды
  await expect(garden.locator('[data-testid=garden-seed][data-plant="peony"] [data-testid=garden-seed-water]')).toContainText('полив раз в 12 ч');
  await expect(garden.locator('[data-testid=garden-seed][data-plant="sunflower"] [data-testid=garden-seed-water]')).toHaveCount(0);
  await garden.locator('[data-testid=garden-seed][data-plant="peony"] [data-testid=garden-plant]').click();
  await expect(garden.locator('[data-testid=garden-plot][data-plant="peony"] [data-testid=garden-water]')).toContainText('12 ч');
  await expect(garden.locator('[data-testid=garden-plot][data-plant="peony"] [data-testid=garden-pour]')).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  // посадка сохранена в профиле: после перезагрузки подсолнух на месте
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'shop');
  await page.getByTestId('shop-switch').locator('[data-view="garden"]').click();
  await expect(page.locator('[data-testid=garden-plot][data-plant="sunflower"]')).toBeVisible();
  expect(errors).toEqual([]);
});

// лиги по минутам: темп лиги нигде не называется минутами — только «чем выше лига, тем сильнее соперники»
test('лиги: на вкладке нет «остаться хватит около N минут», в правилах — без минут', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T12:00:00'));
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    // утренний экран серии уже видели сегодня
    localStorage.setItem('ems-learn-morning', '2026-11-04');
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, xp: { '2026-11-02': 20, '2026-11-03': 20 }, done: { '2026-11-02': 1, '2026-11-03': 1 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'league' });
  await expect(page.getByTestId('league')).toBeVisible();
  await expect(page.getByTestId('league-pace')).toHaveCount(0);
  await expect(page.getByTestId('league')).not.toContainText('минут уроков в день');
  await page.getByTestId('league-rules-toggle').click();
  await expect(page.getByTestId('league-rules')).toContainText('Чем выше лига, тем сильнее соперники');
  await expect(page.getByTestId('league-rules')).not.toContainText('минут');
  // награда растёт с лигой; в Бронзовой 4-е и 5-е (повышение) — тоже с монетами
  await expect(page.getByTestId('league-prize')).toContainText('в лиге N — в N раз больше');
  await expect(page.locator('[data-testid=league-row][data-place="1"]').getByTestId('league-row-coins')).toHaveText('+50 мон.');
  await expect(page.locator('[data-testid=league-row][data-place="5"]').getByTestId('league-row-coins')).toHaveText('+10 мон.');
  await expect(page.locator('[data-testid=league-row][data-place="6"]').getByTestId('league-row-coins')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('лиги: отдельная вкладка — медаль, что нужно сейчас, все лиги, три зоны, награда — окном и один раз', async ({ page }) => {
  // среда: неделя лиги идёт (понедельник — суббота), в воскресенье — перерыв
  await page.clock.setFixedTime(new Date('2026-10-14T12:00:00'));
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const day = (k) => { const d = new Date(Date.now() + k * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    // восемь дней назад — много опыта (первое место прошлой недели), сегодня — немного
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, xp: { [day(-8)]: 3000, [day(0)]: 40 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'league' });
  const lg = page.getByTestId('league');
  await expect(lg).toHaveAttribute('data-league', 'silver');
  await expect(lg).toHaveAttribute('data-rest', 'false');
  await expect(lg.getByTestId('league-title')).toHaveText('Серебряная лига');
  await expect(lg.getByTestId('league-status')).toContainText('40 опыта');
  await expect(lg.getByTestId('league-when')).toContainText('4 дня до итогов');
  await expect(lg.getByTestId('league-goal')).toHaveAttribute('data-kind', /stay|down|up/);
  // «Соперники — боты» — заметной плашкой вверху вкладки, над медалью и названием лиги, а не мелкой строкой внизу
  const note = lg.getByTestId('league-note');
  await expect(note).toContainText('Соперники — боты');
  await expect(note).toContainText('опыт выдуманный');
  await expect(note).toBeInViewport();
  expect((await note.boundingBox()).y).toBeLessThan((await lg.getByTestId('league-title').boundingBox()).y);
  expect(await note.locator('b').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // все семь лиг: Бронзовая пройдена, Серебряная — здесь, дальше — закрыты
  await expect(lg.getByTestId('league-tier')).toHaveCount(7);
  await expect(lg.locator('[data-testid=league-tier][data-tier="bronze"]')).toHaveAttribute('data-state', 'passed');
  await expect(lg.locator('[data-testid=league-tier][data-tier="silver"]')).toHaveAttribute('data-state', 'now');
  await expect(lg.locator('[data-testid=league-tier][data-tier="diamond"]')).toHaveAttribute('data-state', 'locked');
  // таблица — вся группа, в трёх зонах: повышение, «остаётесь», понижение
  await expect(lg.getByTestId('league-row')).toHaveCount(20);
  await expect(lg.getByTestId('league-zone')).toHaveCount(3);
  await expect(lg.locator('[data-testid=league-zone][data-zone="stay"]')).toContainText('Остаётесь в лиге');
  await expect(lg.locator('[data-testid=league-zone][data-zone="up"] [data-testid=league-row]')).toHaveCount(5);
  await expect(lg.locator('[data-testid=league-row][data-me="true"]')).toHaveCount(1);
  // полоски опыта: дорожка одной длины во всех строках, и больше опыта — длиннее полоска
  const bars = await lg.getByTestId('league-row').evaluateAll((rows) => rows.map((r) => {
    const track = r.querySelector('.lg-xpbar'); const fill = track.firstElementChild;
    return { xp: Number(r.querySelector('.lg-xp').firstChild.textContent), track: Math.round(track.getBoundingClientRect().width), fill: fill.getBoundingClientRect().width };
  }));
  expect(new Set(bars.map((b) => b.track)).size).toBe(1);
  bars.forEach((b, k) => { if (k > 0 && b.xp < bars[k - 1].xp) expect(b.fill).toBeLessThanOrEqual(bars[k - 1].fill + 0.5); });
  // награда за первое место в Бронзовой — 50 монет: окно вручения, один раз
  await expect(lg.getByTestId('league-reward')).toContainText('1-е место в Бронзовой лиге');
  await lg.getByTestId('league-claim').click();
  const sheet = page.getByTestId('league-reward-sheet');
  await expect(sheet.getByTestId('league-msg')).toContainText('+50 монет');
  await expect(sheet).toContainText('Повышение');
  await sheet.getByTestId('league-reward-ok').click();
  await expect(lg.getByTestId('league-reward')).toHaveCount(0);
  await expect(lg.getByTestId('league-last')).toContainText('повышение в Серебряную');
  await expectNoSidewaysScroll(page);
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'league');
  await expect(page.getByTestId('league').getByTestId('league-reward')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('лиги: в воскресенье перерыв — итоги недели, опыт в лигу не идёт', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-18T12:00:00'));
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    // вся неделя с понедельника — много опыта: первое место и повышение
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, xp: { '2026-10-12': 3000 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'league' });
  const lg = page.getByTestId('league');
  await expect(lg).toHaveAttribute('data-rest', 'true');
  await expect(lg.getByTestId('league-when')).toContainText('Перерыв');
  await expect(lg.getByTestId('league-goal')).toContainText('повышение в Серебряную лигу');
  await expect(lg.getByTestId('league-reward')).toContainText('1-е место в Бронзовой лиге');
  expect(errors).toEqual([]);
});

// напоминание о повторении учебника — от пяти задач, днём; касание открывает «Повторение» учебника
test('уведомления: задачи учебника ждут повторения — напоминание от пяти задач, касание ведёт на «Повторение»', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T16:00:00'));
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    const ids = ['sc-inside', 'sc-oc', 'sc-hours', 'sc-ppf-cost', 'sc-terms', 'sc-gains'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: Object.fromEntries(ids.map((id) => [id, { tries: 1, ok: true, box: 1, due: Date.now() - 1000, lastAt: at }])),
      learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, done: { [new Date(at).toISOString().slice(0, 10)]: 1 } },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.getByTestId('bell').first().click();
  const note = page.locator('[data-testid=notifications] [data-id^="book-review:"]');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('6 задач');
  await note.click();
  await expect(page.getByTestId('review')).toBeVisible();
  await expect(page.getByTestId('review-item')).toHaveCount(6);
  expect(errors).toEqual([]);
});

/* НАГРАДЫ ЗА УРОК — ТОЛЬКО ЗА ЧЕСТНУЮ РАБОТУ (docs/mechanics.md, «Награды за урок…»; пункт владельца 13.11): точность с
   первой попытки ниже 60% или среднее время на вопрос меньше трети нормы — монет «За урок» и печатей нет, вместо них
   «Пройдите работу над ошибками». Раньше урок, пройденный наугад, платил 10 монет и печать «Первый шаг». */
test('награды: урок наугад (точность ниже 60%) — без монет «За урок» и печатей, «Пройдите работу над ошибками»; честный повтор платит', async ({ page }) => {
  test.setTimeout(150_000);
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  // почти все ответы — неверно с первой попытки
  await playLesson(page, { wrongAt: Array.from({ length: 30 }, (_, k) => k) });
  const res = page.getByTestId('lesson-result');
  expect(Number((await res.getByTestId('result-acc').innerText()).replace(/\D+/g, ''))).toBeLessThan(60);
  const note = res.getByTestId('result-unfair');
  await expect(note).toBeVisible();
  await expect(note).toHaveAttribute('data-why', 'accuracy');
  await expect(note).toContainText('Пройдите работу над ошибками');
  // ни строки «За урок», ни печатей
  await expect(res.getByTestId('gain').filter({ hasText: 'Печать' })).toHaveCount(0);
  await expect(res.getByTestId('result-lesson-coins')).toHaveCount(0);
  const held = () => page.evaluate(() => { const l = JSON.parse(localStorage.getItem('ems-textbook-v1')).learn; return { held: !!l.lessons['sc-i1'].held, paid: !!(l.claimed || {})['l:sc-i1'], runs: l.lessons['sc-i1'].runs }; });
  expect(await held()).toEqual({ held: true, paid: false, runs: 1 });
  await res.getByRole('button', { name: /Дальше|Готово|На Путь/ }).first().click();
  // урок засчитан: следующий открыт
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'done');
  // честный повтор: монеты «За урок» выданы как за первое прохождение, отметка снята
  await startLesson(page, 'sc-i1');
  await playLesson(page);
  const res2 = page.getByTestId('lesson-result');
  await expect(res2.getByTestId('result-unfair')).toHaveCount(0);
  await expect(res2.getByTestId('result-lesson-coins')).toBeVisible();
  expect(await held()).toEqual({ held: false, paid: true, runs: 2 });
  expect(errors).toEqual([]);
});

test('награды: урок «на скорость» (быстрее трети нормы на вопрос) — без монет и печатей, даже без ошибок', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  // автотест отвечает мгновенно; проверку скорости включаем сами
  await page.addInitScript(() => localStorage.setItem('ems-fair-test', '1'));
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  await playLesson(page);
  const res = page.getByTestId('lesson-result');
  await expect(res.getByTestId('result-acc')).toContainText('100%');
  await expect(res.getByTestId('result-unfair')).toHaveAttribute('data-why', 'speed');
  await expect(res.getByTestId('result-unfair')).toContainText('слишком быстро');
  await expect(res.getByTestId('result-lesson-coins')).toHaveCount(0);
  await expect(res.getByTestId('gain').filter({ hasText: 'Печать' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('копилка: график вклада — подписи не налезают друг на друга, «сейчас» — плашкой над графиком, пополнения — ступеньками', async ({ page }) => {
  await withTestFlag(page);
  const D = 86400000;
  for (const [days, adds] of [[1, []], [5, []], [6, [[2, 60], [4, 300]]]]) {
    await page.addInitScript(({ days, adds, D }) => {
      const at = Date.now() - days * D - 3600000;
      const learn = { lessons: { 'sc-i1': { at: Date.now() - D, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - D, runs: 1, best: 90 } }, coins: { '2026-01-01': 900 }, piggy: { [at]: 100 } };
      if (adds.length) { learn.piggyTop = { [at]: 1 }; learn.piggyAdd = Object.fromEntries(adds.map(([d, n]) => [at + d * D, `${at}:${n}`])); }
      localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn }));
    }, { days, adds, D });
    await openApp(page, '/', '{}', { tab: 'shop' });
    await shopTab(page, 'useful');
    const chart = page.getByTestId('shop-piggy').getByTestId('piggy-chart');
    await expect(chart).toBeVisible();
    await expect(chart.getByTestId('piggy-now')).toHaveCount(1);
    // подписи графика попарно не пересекаются
    const boxes = await chart.evaluate((svg) => [...svg.querySelectorAll('text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent, l: r.left, r: r.right, top: r.top, b: r.bottom }; }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]; const b = boxes[j];
        const cross = a.l < b.r - 1 && b.l < a.r - 1 && a.top < b.b - 1 && b.top < a.b - 1;
        expect(cross, `«${a.t}» налезает на «${b.t}» (день ${days})`).toBe(false);
      }
    }
    if (adds.length) await expect(chart.getByTestId('piggy-step')).toHaveText(['+60', '+300']);
  }
});

test('монеты не появляются молча: цель дня выполнена, а выдаётся при вкладе в копилку — плашкой «+N монет · Цель дня»', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const D = 86400000; const at = Date.now() - D;
    const day = new Date().toISOString().slice(0, 10);
    // 35 монет; сегодня позанимались 10 минут (цель дня по умолчанию) — награда за цель ещё не выдана
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), coins: { '2026-01-01': 35 }, daily: { [day]: { s: 600 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await shopTab(page, 'useful');
  const piggy = page.getByTestId('shop-piggy');
  await piggy.getByTestId('piggy-put').click();
  await expect(piggy.getByTestId('piggy-open')).toBeVisible();
  // выплата пришла не молча: плашка говорит, сколько и за что
  const note = page.getByTestId('notify-toast');
  // здесь сразу две выплаты: цель дня (+10) и печать «Первый шаг» — суммой и списком
  await expect(note).toContainText(/\+\d+ монет/);
  await expect(note).toContainText('Цель дня: 10 минут');
  expect(errors).toEqual([]);
});

test('новости: выпуск раскрывается и сворачивается плавно, после «Свернуть» — снова на экране и не прозрачный; на ПК поля ленты — черновик', async ({ page, isMobile }) => {
  await withTestFlag(page);
  // ученик с первого дня раньше выпусков — свежие выпуски с плашкой «Новое»
  await page.addInitScript(() => {
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { done: { '2026-09-20': 1 }, xp: { '2026-09-20': 10 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTab(page, 'news');
  const issue = page.locator('[data-testid=news-issue][data-new=true]').first();
  await expect(issue).toBeVisible();
  // высота — по вёрстке: карточка ещё может доигрывать появление с лёгким масштабом
  const short = await issue.evaluate((el) => el.offsetHeight);
  await issue.getByTestId('news-more').click();
  await expect(issue).toHaveAttribute('data-open', 'true');
  await expect.poll(() => issue.evaluate((el) => el.offsetHeight)).toBeGreaterThan(short + 100);
  await issue.getByTestId('news-more').scrollIntoViewIfNeeded();
  await issue.getByTestId('news-more').click();
  await expect(issue).toHaveAttribute('data-open', 'false');
  // свернулся — снова короткий, его начало на экране; прозрачности и висящих анимаций появления нет
  await expect.poll(() => issue.evaluate((el) => el.offsetHeight)).toBe(short);
  await expect.poll(() => issue.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  const look = await issue.evaluate((el) => ({
    opacity: [el, ...el.querySelectorAll('*')].map((e) => Number(getComputedStyle(e).opacity)).filter((o) => o < 0.9).length,
    held: el.getAnimations({ subtree: true }).filter((a) => a.playState === 'finished').length,
  }));
  expect(look).toEqual({ opacity: 0, held: 0 });
  if (!isMobile) {
    // поля по бокам ленты — черновик: включить, провести линию слева
    const canvas = page.getByTestId('sketch-canvas');
    await page.getByTestId('sketch-toggle').click();
    await expect(page.getByTestId('sketch-toggle')).toHaveAttribute('aria-checked', 'true');
    await page.mouse.move(80, 300); await page.mouse.down(); await page.mouse.move(260, 320, { steps: 10 }); await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-strokes', '1');
    // кнопки ленты работают как раньше
    await page.getByTestId('news-more').first().click();
    await expect(page.getByTestId('news-issue').first()).toHaveAttribute('data-open', 'true');
    await expect(canvas).toHaveAttribute('data-strokes', '1');
  } else {
    await expect(page.getByTestId('sketch-canvas')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('церемонии: юнит пройден — «Новая марка», «Марка месяца» и «Новая печать» по очереди; показанное не повторяется', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-celebrate-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    // юнит 1 пройден час назад, печать «Место на карте» и марка этого месяца — ещё не праздновали
    localStorage.setItem('ems-celebrated', '{}');
    const at = Date.now() - 3600000; const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), claimed: { 'a:unit': at, [`m:${ym}`]: at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const scene = page.getByTestId('celebrate');
  // почтовая марка юнита со зданием; касание по сцене — сразу финал
  await expect(scene).toHaveAttribute('aria-label', 'Новая марка в альбоме: Мастерская');
  await expect(scene.getByTestId('celebrate-stamp')).toBeVisible();
  await expect(scene.getByTestId('celebrate-stamp').getByTestId('engraving')).toHaveAttribute('data-alive', 'true');
  await scene.click({ position: { x: 8, y: 8 } });
  await expect(scene.getByTestId('celebrate-done')).toBeVisible();
  await scene.getByTestId('celebrate-done').click();
  // марка месяца — с монетами испытания
  await expect(scene).toHaveAttribute('aria-label', /^Марка месяца: /);
  await expect(scene.getByTestId('celebrate-coins')).toHaveAttribute('data-value', '100');
  await scene.getByTestId('celebrate-done').click();
  // печать — сургуч и знак; Enter — «Дальше»
  await expect(scene).toHaveAttribute('aria-label', 'Новая печать: Место на карте');
  await expect(scene.getByTestId('celebrate-seal')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(scene).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  // перезагрузка — показанное не повторяется
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('celebrate')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('церемонии: первое открытие не празднует уже полученное; печать за первую покупку — сценой сразу, «Все печати» ведёт в профиль', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-celebrate-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3600000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, claimed: { 'a:first': at }, coins: { '2026-01-01': 500 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.getByTestId('path')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('celebrate')).toHaveCount(0);
  // покупка в лавке выдаёт печать «Первая покупка» — сцена сразу
  await openTab(page, 'shop');
  await page.getByTestId('shop-showcase').getByTestId('shop-item').getByRole('button', { name: 'Купить' }).first().click();
  const scene = page.getByTestId('celebrate');
  await expect(scene).toHaveAttribute('aria-label', 'Новая печать: Первая покупка');
  await scene.click({ position: { x: 8, y: 8 } });
  await scene.getByTestId('celebrate-go').click();
  // та же покупка выдала и «Пятьсот монет» (заработано 500) — следующая сцена, уже над профилем; Esc — закрыть
  await expect(scene).toHaveAttribute('aria-label', 'Новая печать: Пятьсот монет');
  await page.keyboard.press('Escape');
  await expect(scene).toHaveCount(0);
  await expect(page.getByTestId('learn-profile')).toBeVisible();
  expect(errors).toEqual([]);
});

test('уведомления: смахнуть в сторону — убрано совсем, не в «Ранее»; из «Ранее» — тоже; текст не выделяется', async ({ page, isMobile }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T16:00:00'));
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    const ids = ['sc-inside', 'sc-oc', 'sc-hours', 'sc-ppf-cost', 'sc-terms', 'sc-gains'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: Object.fromEntries(ids.map((id) => [id, { tries: 1, ok: true, box: 1, due: Date.now() - 1000, lastAt: at }])),
      learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, done: { [new Date(at).toISOString().slice(0, 10)]: 1 } },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.getByTestId('bell').first().click();
  const note = page.locator('[data-testid=notifications] [data-id^="book-review:"]');
  await expect(note).toHaveAttribute('data-unread', 'true');
  await expect(page.getByTestId('notify-swipe-hint')).toBeVisible();
  const swipeLeft = async (el) => {
    const box = await el.boundingBox();
    const y = box.y + box.height / 2;
    if (isMobile) {
      // пальцем: касание — тоже указатель
      await el.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: box.x + box.width / 2, clientY: y, isPrimary: true, button: 0 });
      for (let k = 1; k <= 8; k += 1) await el.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: box.x + box.width / 2 - k * 25, clientY: y, isPrimary: true });
      await el.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: box.x + box.width / 2 - 200, clientY: y, isPrimary: true });
    } else {
      await page.mouse.move(box.x + box.width / 2, y); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 200, y, { steps: 10 });
      // тянем мышью — текст уведомления не выделяется
      expect(await page.evaluate(() => String(window.getSelection()))).toBe('');
      await page.mouse.up();
    }
  };
  await swipeLeft(note);
  // смахнутое из «Новых» уходит совсем — в «Ранее» его нет; вкладка не сменилась
  await expect(page.locator('[data-testid=notifications] [data-id^="book-review:"]')).toHaveCount(0);
  await expect(page.getByTestId('review')).toHaveCount(0);
  await page.getByTestId('notifications').locator('[data-nav="back"]').click();
  await page.getByTestId('bell').first().click();
  await expect(page.getByTestId('notifications')).toBeVisible();
  await expect(page.locator('[data-testid=notifications] [data-id^="book-review:"]')).toHaveCount(0);
  // «Прочитано» — всё остальное в «Ранее»; смахнутое оттуда уходит из списка, без пустого места
  const rest = page.locator('[data-testid=notifications] [data-unread="true"]');
  if (await rest.count()) {
    await page.getByTestId('notify-read-all').click();
    await page.getByTestId('bell').first().click();
    const old = page.locator('[data-testid=notifications] [data-unread="false"]').first();
    const id = await old.getAttribute('data-id');
    await swipeLeft(old);
    await expect(page.locator(`[data-testid=notifications] [data-id="${id}"]`)).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('лига: до первого урока ученика в лиге нет — так и написано', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'league' });
  const goal = page.getByTestId('league-goal');
  await expect(goal).toHaveAttribute('data-kind', 'first');
  await expect(goal).toContainText('Лига — после первого урока');
  await page.getByTestId('league-rules-toggle').click();
  await expect(page.getByTestId('league-rules')).toContainText('после первого урока');
  await expect(page.getByTestId('league-utc')).toContainText('всемирное');
  expect(errors).toEqual([]);
});

/* ------------------------------ ВЫПУСК 26 ОКТЯБРЯ ------------------------------ */
test('лига: неделя кончилась — церемония «Итоги недели»: кольцо мест, щит меняется на новую лигу, «К лиге»', async ({ page }) => {
  await withTestFlag(page);
  await page.clock.setFixedTime(new Date('2026-10-19T10:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('ems-celebrate-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-celebrated', '{}');
    const at = Date.parse('2026-10-12T08:00:00Z');
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, xp: { '2026-10-12': 900, '2026-10-13': 900 }, done: { '2026-10-12': 1, '2026-10-13': 1 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const scene = page.getByTestId('celebrate');
  await expect(scene).toHaveAttribute('aria-label', 'Итоги недели: Повышение!');
  const lg = scene.getByTestId('celebrate-league');
  await expect(lg).toHaveAttribute('data-move', 'up');
  await expect(lg).toHaveAttribute('data-place', '1');
  await expect(scene.getByTestId('celebrate-shield')).toHaveAttribute('data-league', 'silver');
  await expect(scene.getByTestId('celebrate-place')).toHaveText('№ 1 из 20');
  await scene.click({ position: { x: 8, y: 8 } });
  await expect(scene.getByTestId('celebrate-coins')).toHaveAttribute('data-value', '50');
  await expect(scene).toContainText('1-е место из 20 в Бронзовой лиге — дальше Серебряная лига');
  await scene.getByTestId('celebrate-go').click();
  await expect(page.getByTestId('league')).toBeVisible();
  await expect(page.getByTestId('celebrate')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('открытия: новичку лиги, лавка, копилка и сад открываются по урокам; открытие — сцена «Открылось»', async ({ page }) => {
  // замки и церемонии в автотесте включаются явно
  await page.addInitScript(() => {
    localStorage.setItem('ems-unlock-test', '1');
    localStorage.setItem('ems-celebrate-test', '1');
    localStorage.setItem('ems-celebrated', JSON.stringify({}));
    if (localStorage.getItem('ems-textbook-v1')) return;
    // один урок пройден вчера: лиги открыты (сцена — давно позади), лавка — после второго
    const at = Date.now() - 5 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const nav = page.getByTestId('bottom-nav');
  await expect(nav.locator('[data-tab="league"] [data-testid=nav-lock]')).toHaveCount(0);
  await expect(nav.locator('[data-tab="shop"] [data-testid=nav-lock]')).toHaveCount(1);
  // закрытая лавка: что там будет и сколько уроков осталось
  await openTab(page, 'shop');
  const locked = page.getByTestId('feature-locked');
  await expect(locked).toHaveAttribute('data-feature', 'shop');
  await expect(locked).toContainText('Лавка — после 2-го урока');
  await expect(locked).toContainText('Осталось 1 урок');
  await locked.getByTestId('feature-locked-go').click();
  await expect(page.getByTestId('path')).toBeVisible();
  // «Мир» — после 10-го урока: в меню «⋯» замок, на вкладке — что там будет и сколько осталось
  await nav.locator('[data-tab="more"]').click();
  await expect(nav.getByTestId('more-menu').getByTestId('world-lock')).toHaveCount(1);
  await expect(nav.getByTestId('more-menu').locator('[data-tab="world"]')).toContainText('Откроется после 10-го урока');
  await nav.getByTestId('more-menu').locator('[data-tab="world"]').click();
  await expect(page.getByTestId('world-locked').getByTestId('feature-locked')).toContainText('Мир — после 10-го урока');
  await expect(page.getByTestId('world-locked')).toContainText('Осталось 9 уроков');
  await expect(page.getByTestId('world')).toHaveCount(0);
  await page.getByTestId('world-locked').getByTestId('feature-locked-go').click();
  await expect(page.getByTestId('path')).toBeVisible();
  // второй урок пройден только что — лавка открылась: сцена «Открылось», «Заглянуть» ведёт в лавку
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    p.learn.lessons['sc-i1b'] = { at: Date.now() - 60000, runs: 1, best: 90 };
    localStorage.setItem('ems-textbook-v1', JSON.stringify(p));
  });
  await page.reload({ waitUntil: 'networkidle' });
  const scene = page.getByTestId('celebrate');
  await expect(scene.getByTestId('celebrate-unlock')).toHaveAttribute('data-feature', 'shop');
  await expect(scene).toContainText('Открылось');
  await scene.getByTestId('celebrate-go').click();
  await expect(page.getByTestId('shop')).toBeVisible();
  await expect(nav.locator('[data-tab="shop"] [data-testid=nav-lock]')).toHaveCount(0);
  // внутри лавки копилка (после 4-го урока) и сад (после 6-го) пока закрыты
  await shopTab(page, 'useful');
  await expect(page.locator('[data-testid=feature-locked][data-feature="piggy"]')).toContainText('Осталось 2 урока');
  await expect(page.getByTestId('shop-piggy')).toHaveCount(0);
  await expect(page.getByTestId('shop-switch').getByTestId('garden-lock')).toHaveCount(1);
  await page.getByTestId('shop-switch').locator('[data-view="garden"]').click();
  await expect(page.locator('[data-testid=feature-locked][data-feature="garden"]')).toContainText('Сад — после 6-го урока');
  expect(errors).toEqual([]);
});

test('открытия: учебник — уровни выше нынешнего на Пути под замком', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ems-unlock-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
    // глава «Деньги и банки» когда-то читалась далеко внизу: место чтения запомнено
    localStorage.setItem('ems-textbook-scroll', JSON.stringify({ 'chapter:money-banks': 3000 }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openBook(page);
  const groups = page.getByTestId('tb-level-group');
  // глава под замком — всегда с начала страницы: ни прокрутка оглавления, ни старое место чтения
  // не уводят замок с названием под шапку
  const money = page.locator('[data-chapter="money-banks"][data-locked="true"]');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await money.click();
  await expect(page.getByTestId('tb-chapter-locked')).toContainText('Деньги и банки');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByTestId('tb-chapter-locked').locator('.tb-locked-ico')).toBeInViewport({ ratio: 1 });
  // и на странице замка место не запоминается
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-scroll'))['chapter:money-banks'])).toBe(3000);
  await page.getByTestId('tb-chapter-locked').getByRole('button', { name: 'К оглавлению' }).click();
  await expect(groups.and(page.locator('[data-level="start"]'))).not.toHaveAttribute('data-locked', 'true');
  const basic = groups.and(page.locator('[data-level="basic"]'));
  await expect(basic).toHaveAttribute('data-locked', 'true');
  await expect(basic).toContainText('Откроется, когда вы дойдёте до этого уровня на Пути');
  // глава закрытого уровня открывает не текст, а объяснение
  await basic.locator('[data-chapter="supply-demand"]').click();
  const lock = page.getByTestId('tb-chapter-locked');
  await expect(lock).toContainText('Глава уровня «Базовый»');
  await expect(page.getByTestId('textbook').locator('.katex')).toHaveCount(0);
  await lock.getByRole('button', { name: 'К оглавлению' }).click();
  await expect(basic).toBeVisible();
  // глава своего уровня читается как раньше
  await groups.and(page.locator('[data-level="start"]')).locator('[data-chapter="scarcity"]').click();
  await expect(page.getByTestId('tb-chapter-locked')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// «Шансы урожая» — шансы показываем (SHOW_ODDS): таблица редкость · шанс · цена
test('сад: экран «Шансы урожая» — редкость, шанс и цена, в сумме 100%', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 50 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await page.getByTestId('shop').getByTestId('shop-switch').locator('[data-view="garden"]').click();
  await page.getByTestId('garden-odds-open').click();
  const t = page.getByTestId('garden-odds-table');
  expect(await t.locator('tbody tr').evaluateAll((rows) => rows.map((r) => r.children[1].textContent))).toEqual(['55%', '25%', '12%', '6%', '1,9%', '0,1%']);
  await expect(t.locator('tr[data-grade="myth"]')).toContainText('×6');
  await page.getByTestId('garden-odds-sheet').getByRole('button', { name: 'Понятно' }).click();
  await expect(page.getByTestId('garden-odds-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// профиль новичка (docs/mechanics.md, «Профиль»): вместо нулей — приглашение к первому уроку; после урока — рекорды
test('профиль: новичок без уроков — «Пройдите первый урок — здесь появятся рекорды», а не нули', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  const rec = page.getByTestId('prof-records');
  await expect(rec).toHaveAttribute('data-empty', 'true');
  await expect(rec).toContainText('Пройдите первый урок — здесь появятся рекорды');
  await expect(rec).not.toContainText('0 дней подряд');
  await expect(rec).not.toContainText('Рекорд — 0');
  await expect(page.getByTestId('prof-coins')).toHaveCount(0);
  await page.getByTestId('prof-first-lesson').click();
  await expect(page.getByTestId('path')).toBeVisible();
  // после урока — обычные рекорды: серия 1 день
  await startLesson(page, 'sc-i1');
  await playLesson(page);
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await openTab(page, 'profile');
  await expect(page.getByTestId('prof-records')).not.toHaveAttribute('data-empty', 'true');
  await expect(page.getByTestId('prof-streak')).toContainText('1');
  expect(errors).toEqual([]);
});

/* Лавка без давления дефицитом (docs/mechanics.md, «Хеллоуин»): младше 16 — ни «−30%», ни зачёркнутой цены, ни
   отсчётов «обновится через», «ещё N дней, потом через год»; скидка дня остаётся. Взрослому — как раньше. */
test('лавка: младше 16 — без «−30%» и «ещё N дней, потом через год»; взрослому — со скидкой и сроком', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-31T10:00:00Z'));
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } }, coins: { '2026-01-01': 50 } } }));
  });
  // ученик 2013 года рождения: в 2026 году ему 12 или 13
  await page.context().addInitScript((a) => { localStorage.setItem('ems-account', JSON.stringify(a)); }, { ...ACCOUNT, birthYear: 2013, kidsMode: true });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  const shop = page.getByTestId('shop');
  await expect(shop.getByTestId('shop-halloween')).toBeVisible();
  await expect(shop.getByTestId('shop-halloween')).toContainText('Хеллоуинские вещи для Инфли. Купленное остаётся навсегда.');
  await expect(shop).not.toContainText('потом через год');
  await expect(shop).not.toContainText('Обновится через');
  await expect(shop).not.toContainText('−30%');
  await expect(shop.getByTestId('shop-deal')).toHaveCount(0);
  await expect(shop.locator('[data-testid=shop-item][data-deal="true"] .rw-price s')).toHaveCount(0);
  // взрослому — плашка скидки и срок сезона
  // (скрипты страницы идут после скриптов контекста — взрослый аккаунт перекрывает детский)
  await page.addInitScript((a) => { localStorage.setItem('ems-account', JSON.stringify(a)); }, { ...ACCOUNT, birthYear: 1990 });
  await gotoApp(page, '/', 'shop');
  await expect(shop.getByTestId('shop-halloween')).toContainText('потом через год');
  await expect(shop.getByTestId('shop-deal')).toHaveCount(1);
  await expect(shop.getByTestId('shop-tabs')).toContainText('−30%');
  expect(errors).toEqual([]);
});

// пункт владельца 15.11: «в „Протереть“ одно улучшение на твой выбор, чтобы купить и через какое-то время окупить»
test('«Пыльная витрина»: микрофибра — купить за 24 монеты; тряпка шире, шестая витрина в день, видно, сколько вернула', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, coins: { '2026-10-01': 50 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await page.getByTestId('shop-tabs').locator('[data-tab="dust"]').click();
  await page.getByTestId('shop-dust').getByTestId('dust-open').click();
  const game = page.getByTestId('dust-game');
  const cloth = game.getByTestId('dust-cloth');
  await expect(cloth).toHaveAttribute('data-owned', 'false');
  await expect(cloth).toContainText('Окупится за 12 дней');
  await expect(game.getByTestId('dust-hint')).toContainText('из 5');
  // одна и та же полоса до покупки и после: с микрофиброй стёрто заметно больше
  const glass = game.getByTestId('dust-glass');
  const swipe = async (y) => { const b = await glass.boundingBox(); await page.mouse.move(b.x + 6, b.y + b.height * y); await page.mouse.down(); await page.mouse.move(b.x + b.width - 6, b.y + b.height * y, { steps: 14 }); await page.mouse.up(); };
  const pct = async () => Number(await game.getByTestId('dust-percent').getAttribute('data-value'));
  await swipe(0.2); const p1 = await pct();
  await game.getByTestId('dust-cloth-buy').click();
  await expect(cloth).toHaveAttribute('data-owned', 'true');
  await expect(cloth).toContainText('Вернула 0 из 24');
  await expect(game.getByTestId('dust-hint')).toContainText('из 6');
  const spent = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.spent || {}).reduce((a, x) => a + x, 0));
  expect(spent).toBe(24);
  await swipe(0.7); const p2 = (await pct()) - p1;
  expect(p2).toBeGreaterThan(p1 * 1.25);
  expect(errors).toEqual([]);
});

test('«Пыльная витрина»: протирка не выделяет текст', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await page.getByTestId('shop-tabs').locator('[data-tab="dust"]').click();
  await page.getByTestId('shop-dust').getByTestId('dust-open').click();
  const game = page.getByTestId('dust-game');
  await expect(game).toHaveAttribute('data-phase', 'play');
  expect(await game.evaluate((el) => getComputedStyle(el).userSelect)).toBe('none');
  // тряпка соскользнула со стекла на подпись под ним и прошлась по ней — выделения нет
  const hint = await game.getByTestId('dust-hint').boundingBox();
  await page.mouse.move(hint.x + 4, hint.y + hint.height / 2); await page.mouse.down();
  await page.mouse.move(hint.x + hint.width - 4, hint.y + hint.height / 2, { steps: 12 }); await page.mouse.up();
  expect(await page.evaluate(() => String(window.getSelection()))).toBe('');
  expect(errors).toEqual([]);
});

test('«Пыльная витрина»: тряпка одна — второй палец не стирает (два пальца чистили витрину за секунду)', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await page.getByTestId('shop-tabs').locator('[data-tab="dust"]').click();
  await page.getByTestId('shop-dust').getByTestId('dust-open').click();
  const game = page.getByTestId('dust-game');
  await expect(game).toHaveAttribute('data-phase', 'play');
  // первый палец стоит в левом краю, второй проходит по правому краю сверху вниз: раньше каждое движение
  // стирало полосу от одного пальца до другого — веер на полвитрины; теперь стирает только первый
  await game.getByTestId('dust-glass').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const ev = (type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: r.left + x * r.width, clientY: r.top + y * r.height, bubbles: true, cancelable: true }));
    ev('pointerdown', 1, 0.1, 0.5); ev('pointerdown', 2, 0.9, 0.05);
    for (let k = 0; k <= 30; k += 1) { ev('pointermove', 1, 0.1 + (k % 2) * 0.01, 0.5); ev('pointermove', 2, 0.9, 0.05 + k * 0.03); }
    ev('pointerup', 2, 0.9, 0.95); ev('pointerup', 1, 0.1, 0.5);
  });
  const pct = Number(await game.getByTestId('dust-percent').getAttribute('data-value'));
  expect(pct).toBeLessThan(8);
  // а один палец по-прежнему протирает
  const box = await game.getByTestId('dust-glass').boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height * 0.3); await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height * 0.3, { steps: 12 }); await page.mouse.up();
  await expect.poll(async () => Number(await game.getByTestId('dust-percent').getAttribute('data-value'))).toBeGreaterThan(pct);
  expect(errors).toEqual([]);
});

test('лавка: «Пыльная витрина» — тряпкой по стеклу; 90% — засчитано, 2 монеты и «можно дотереть»; 100% — блик; до пяти витрин в день', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, coins: { '2026-10-01': 50 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  // своя вкладка лавки «Протереть», а не карточка внизу «Витрины»
  await expect(page.getByTestId('shop-panel').getByTestId('shop-dust')).toHaveCount(0);
  await page.getByTestId('shop-tabs').locator('[data-tab="dust"]').click();
  await expect(page.getByTestId('shop-panel')).toHaveAttribute('data-tab', 'dust');
  await expect(page.getByTestId('shop-panel')).toContainText('Пыльная витрина');
  const card = page.getByTestId('shop-dust');
  await expect(card).toHaveAttribute('data-done', '0');
  const earnedNow = () => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.coins || {}).reduce((a, x) => a + x, 0));
  const before = await earnedNow();
  await card.getByTestId('dust-open').click();
  const game = page.getByTestId('dust-game');
  await expect(game).toHaveAttribute('data-phase', 'play');
  await expect(game.getByTestId('dust-hint')).toContainText('2 монеты');
  // мазок мышью — часть стекла уже чистая
  const glass = game.getByTestId('dust-glass');
  const box = await glass.boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height * 0.4, { steps: 16 });
  await page.mouse.move(box.x + 10, box.y + box.height * 0.42, { steps: 16 });
  await page.mouse.up();
  await expect.poll(async () => Number(await game.getByTestId('dust-percent').getAttribute('data-value'))).toBeGreaterThan(0);
  // остальное — с клавиатуры: Enter протирает полосу за полосой
  await glass.focus();
  const enough = game.getByTestId('dust-enough');
  for (let k = 0; k < 40 && !(await enough.count()); k += 1) await page.keyboard.press('Enter');
  // 90% — засчитано: монеты сразу, плашка «можно дотереть до 100%», игра идёт дальше
  await expect(enough).toHaveAttribute('data-paid', '2');
  await expect(enough).toContainText('+2 монеты');
  await expect(enough).toContainText('Можно дотереть до 100%');
  await expect(enough.getByTestId('dust-next')).toBeVisible();
  await expect(game).toHaveAttribute('data-phase', 'play');
  const mid = Number(await game.getByTestId('dust-percent').getAttribute('data-value'));
  expect(mid).toBeGreaterThanOrEqual(90);
  expect(mid).toBeLessThan(100);
  // перфекционист дотирает до 100% — блик и «Блестит!», второй раз монеты не платятся
  for (let k = 0; k < 120 && (await game.getAttribute('data-phase')) === 'play'; k += 1) await page.keyboard.press('Enter');
  await expect(game.getByTestId('dust-percent')).toHaveAttribute('data-value', '100');
  const res = game.getByTestId('dust-result');
  await expect(res).toHaveAttribute('data-paid', '2');
  await expect(res.getByTestId('dust-coins')).toContainText('+2 монеты');
  await expect(res).toContainText('ещё 4 из 5');
  // ещё витрина — снова пыль, проценты с нуля
  await res.getByTestId('dust-again').click();
  await expect(game).toHaveAttribute('data-phase', 'play');
  await expect(game.getByTestId('dust-percent')).toHaveAttribute('data-value', '0');
  await game.getByTestId('dust-close').click();
  await expect(game).toHaveCount(0);
  await expect(card).toHaveAttribute('data-done', '1');
  // две монеты витрины (вместе с ними могли прийти и печати, которые ждали расчёта наград)
  expect(await earnedNow()).toBeGreaterThanOrEqual(before + 2);
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.claimed).filter((k) => k.startsWith('dust:')).length)).toBe(1);
  expect(errors).toEqual([]);
});

test('юнит пройден — после «Дальше» на итогах сам открывается сундук юнита (раньше Путь уезжал дальше, сундук оставался позади)', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-chest-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.getByTestId('chest')).toHaveCount(0);
  // урок, который ничего не завершает (повтор первого), сундук не открывает
  await startLesson(page, 'sc-i1', /Повторить/);
  await playLesson(page);
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  await page.waitForTimeout(900);
  await expect(page.getByTestId('chest-sheet')).toHaveCount(0);
  // «Итоги юнита» — юнит пройден: «Дальше» — и сундук открыт сам
  await startLesson(page, 'sc-sum');
  await playLesson(page);
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  const sheet = page.getByTestId('chest-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Мастерская');
  await sheet.getByTestId('chest-open').click();
  await expect(sheet.getByTestId('chest-coins')).toBeVisible();
  await sheet.getByTestId('chest-take').click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-testid=path-unit][data-unit="scarcity"]')).toHaveAttribute('data-folded', 'true');
  // второй раз не открывается
  await page.waitForTimeout(900);
  await expect(page.getByTestId('chest-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('защита монет: у ученика с длинной историей операции в лавке не дают бонусы серии снова (дюп «+255 монет» 6 ноября)', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const D = 86400000; const now = Date.now();
    const day = (k) => new Date(now - k * D).toISOString().slice(0, 10);
    // утренний экран серии уже видели сегодня
    localStorage.setItem('ems-learn-morning', day(0));
    const done = Object.fromEntries(Array.from({ length: 30 }, (_, k) => [day(k), 1]));
    // 300 ключей уроков и алмазов — раньше из-за них при обрезке по алфавиту терялись «st:3», «st:7», «st:30»
    const claimed = { 'st:3': now - 20 * D, 'st:7': now - 15 * D, 'st:14': now - 10 * D, 'st:30': now - D };
    for (let i = 0; i < 300; i += 1) claimed[`l:x${i}`] = now - 40 * D;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at: now - D, runs: 1, best: 90 }])), done, xp: done, claimed, coins: { [day(1)]: 500 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTab(page, 'shop');
  const coins = () => page.evaluate(() => { const l = JSON.parse(localStorage.getItem('ems-textbook-v1')).learn; const sum = (m) => Object.values(m || {}).reduce((a, x) => a + x, 0); return sum(l.coins) - sum(l.spent); });
  const claims = () => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.claimed).filter((k) => k.startsWith('st:')).sort());
  await expect.poll(claims).toEqual(['st:14', 'st:3', 'st:30', 'st:7']);
  await shopTab(page, 'useful');
  const piggy = page.getByTestId('shop-piggy');
  await piggy.getByTestId('piggy-put').click();
  await expect(piggy.getByTestId('piggy-open')).toBeVisible();
  const after = await coins();
  // ни одна выплата не приносит «Серия: … дней» снова
  await page.waitForTimeout(600);
  const toast = page.getByTestId('notify-toast');
  if (await toast.count()) await expect(toast).not.toContainText('Серия');
  expect(await claims()).toEqual(['st:14', 'st:3', 'st:30', 'st:7']);
  // перезагрузка (прогресс нормализуется) и ещё одна операция — монет не прибавилось
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'shop');
  await shopTab(page, 'useful');
  await expect.poll(coins).toBe(after);
  expect(errors).toEqual([]);
});

/* «Забег с другом?» после урока (пункт 2 от 06.11: «очень странно выглядит»): компактная карточка — две Инфли у флажка
   целиком внутри картинки, друг строкой, «Не сейчас» в одну строку; «Не сейчас» убирает карточку */
test('после урока: «Забег с другом?» — компактная карточка: Инфли у флажка, друг строкой, «Не сейчас» в одну строку', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-race-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', accountApi, { tab: 'path' });
  await startLesson(page, 'sc-l1', /Начать|Повторить/);
  await playLesson(page);
  const offer = page.getByTestId('race-offer');
  await offer.scrollIntoViewIfNeeded();
  await expect(offer).toBeVisible();
  await expect(offer.getByTestId('race-offer-who')).toContainText('Борис');
  await expect(offer.getByTestId('race-offer-who')).toContainText('в сети вчера');
  await expect(offer.locator('.fr-chip')).toHaveCount(0);
  // обе Инфли и флажок — целиком внутри картинки (раньше половина Инфли торчала из края пустой полосы)
  await page.waitForTimeout(700);
  const art = await offer.getByTestId('race-offer-art').boundingBox();
  for (const el of await offer.getByTestId('race-offer-art').locator('> span, > i').all()) {
    const b = await el.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(art.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(art.x + art.width + 1);
  }
  // «Позвать на забег» и «Не сейчас» — в одну строку, «Не сейчас» не переносится
  const later = offer.getByTestId('race-offer-later');
  const inv = await offer.getByTestId('race-invite').boundingBox();
  const lb = await later.boundingBox();
  expect(Math.abs(inv.y + inv.height / 2 - (lb.y + lb.height / 2))).toBeLessThan(4);
  expect(lb.height).toBeLessThan(inv.height + 4);
  await later.click();
  await expect(offer).toHaveCount(0);
  expect(errors).toEqual([]);
});

/* «Ранее» (пункт 7 от 06.11): последние три прочитанных, свежее сверху; прочитанное, которого в расчёте уже нет
   (обогнали в лиге, а потом сами обогнали), остаётся в «Ранее» снимком на устройстве */
test('уведомления: «Ранее» — последние три прочитанных, свежее сверху; прошедшее событие не пропадает', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, done: { [new Date(at).toISOString().slice(0, 10)]: 1 } } }));
    const n = (id, h, title) => ({ id, kind: 'league', icon: 'trophy', tone: '#9A7413', title, text: 'Загляните во вкладку «Лиги».', at: Date.now() - h * 3600000, go: 'league' });
    localStorage.setItem('ems-notify-history', JSON.stringify([n('lg-pass:e2e', 1, 'Вас обогнали в лиге'), n('lg-old:e2e1', 50, 'Старое 1'), n('lg-old:e2e2', 60, 'Старое 2'), n('lg-old:e2e3', 70, 'Старое 3')]));
    localStorage.setItem('ems-notify-seen', JSON.stringify({ 'lg-pass:e2e': Date.now() - 3000000 }));
    // утренний экран серии сегодня уже был: в иные дни заморозки держат серию из одного урока, и экран закрывал колокольчик
    localStorage.setItem('ems-learn-morning', new Date().toISOString().slice(0, 10));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.getByTestId('bell').first().click();
  const center = page.getByTestId('notifications');
  const old = center.locator('[data-testid=notify-item][data-unread="false"]');
  await expect(old.first()).toBeVisible();
  // события «обогнали» в расчёте нет — а в «Ранее» оно есть, первым как самое свежее
  await expect(center.locator('[data-id="lg-pass:e2e"]')).toHaveCount(1);
  expect(await old.count()).toBeLessThanOrEqual(3);
  const ats = (await old.evaluateAll((els) => els.map((e) => Number(e.dataset.at))));
  expect(ats).toEqual([...ats].sort((a, b) => b - a));
  await expect(center.locator('[data-id="lg-old:e2e3"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

/* Сад (пункт 12 от 06.11): растения не одинаковые — у каждого свой рост, наклон и сторона, от момента посадки */
test('сад: шесть ромашек на соседних грядках — разного роста, а после перезагрузки — те же', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const now = Date.now(); const H = 3600000;
    const garden = Object.fromEntries([1, 2, 3, 4, 5, 6].map((k) => [now - k * H - k * 7919, `chamomile@${k % 4}`]));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: now - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: now - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 500 }, garden } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  const shop = page.getByTestId('shop');
  await shop.getByTestId('shop-switch').locator('[data-view="garden"]').click();
  const looks = page.getByTestId('garden').getByTestId('garden-look');
  await expect(looks).toHaveCount(6);
  const ks = await looks.evaluateAll((els) => els.map((e) => Number(e.dataset.k)));
  ks.forEach((k) => { expect(k).toBeGreaterThanOrEqual(0.84); expect(k).toBeLessThanOrEqual(1.16); });
  expect(new Set(ks).size).toBeGreaterThanOrEqual(3);
  // разный рост виден: высота нарисованного растения отличается
  const hs = await looks.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(Math.max(...hs) - Math.min(...hs)).toBeGreaterThan(4);
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'shop');
  const sw = page.getByTestId('shop').getByTestId('shop-switch').locator('[data-view="garden"]');
  if ((await page.getByTestId('shop').getAttribute('data-view')) !== 'garden') await sw.click();
  await expect(page.getByTestId('garden').getByTestId('garden-look')).toHaveCount(6);
  expect(await page.getByTestId('garden').getByTestId('garden-look').evaluateAll((els) => els.map((e) => Number(e.dataset.k)))).toEqual(ks);
  expect(errors).toEqual([]);
});

/* Списание монет дюпа (решение владельца от 07.11, docs/legal-todo.md, п. 16): лишнее сверх честного заработка
   списывается, минус в кошельке закрывают покупки на эти монеты — с самых новых; ученику — уведомление */
test('дюп: лишние монеты списаны, купленная на них вещь вернулась в лавку и снята; уведомление объясняет почему', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const now = Date.now(); const day = new Date(now - 86400000).toISOString().slice(0, 10);
    // шесть уроков (лавка открыта), а монет — 4000 за один день (повторные бонусы серии), и всё потрачено на корону и медаль
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: {
      lessons: Object.fromEntries(ids.map((id) => [id, { at: now - 86400000, runs: 1, best: 90 }])),
      done: { [day]: 6 }, xp: { [day]: 120 }, coins: { [day]: 4000 }, spent: { [day]: 4000 },
      owned: { crown: now - 7200000, medal: now - 3600000 }, wear: { head: 'crown', neck: 'medal', at: now - 3600000 },
    } }));
  });
  await page.addInitScript(() => { try { localStorage.setItem('ems-learn-morning', new Date().toISOString().slice(0, 10)); localStorage.setItem('ems-audit-test', '1'); } catch { /* нет хранилища */ } });
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  // плашка сверху — почему баланс изменился
  const toast = page.getByTestId('notify-toast');
  await expect(toast).toHaveAttribute('data-id', 'fine:dupe-2026-11');
  await expect(toast).toContainText('Исправили ошибку с монетами');
  await expect(toast).toContainText('вернулось в лавку');
  const learn = () => page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-v1')).learn);
  // корона и медаль не покрыли всё списанное — остаток минуса прощается второй записью (пункт владельца 08.11, вечер)
  await expect.poll(async () => Object.keys((await learn()).fines || {}).sort()).toEqual(['dupe-2026-11', 'dupe-2026-11-forgive']);
  const s = await learn();
  const f = s.fines['dupe-2026-11'];
  expect(s.fines['dupe-2026-11-forgive'].refund).toBeGreaterThan(0);
  expect(f.coins).toBeGreaterThan(3000);
  // откатывается с самой новой покупки — медаль; она снята
  expect(Object.keys(f.items)[0]).toBe('medal');
  expect(s.owned.medal).toBeUndefined();
  expect(s.wear.neck).toBeNull();
  // в кошельке не минус
  await openTab(page, 'shop');
  expect(Number((await page.getByTestId('shop-balance').innerText()).replace(/\D/g, ''))).toBeGreaterThanOrEqual(0);
  // после перезагрузки — не списывается второй раз
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(async () => (await learn()).fines['dupe-2026-11'].at).toBe(f.at);
  expect((await learn()).fines['dupe-2026-11-forgive'].at).toBe(s.fines['dupe-2026-11-forgive'].at);
  expect(errors).toEqual([]);
});

/* Вход для гостя (пункт 1 от 08.11: «нигде нет кнопки войти, только огромная „создать“»): в карточке «Сохраните
   прогресс» — «Создать аккаунт» и «Войти»; из регистрации — «У меня уже есть аккаунт — войти», из входа — «Нет аккаунта?» */
// пункт владельца 09.11: «пришло уведомление „страховка серии прекращена“, хотя она прекращена давно» — телефон со
// старым прогрессом (полис ещё «действует», монет нет) не прекращает полис сам до синхронизации: на сервере он давно расторгнут
test('страховка серии: устройство со старым прогрессом не шлёт «Страховка серии прекращена» — полис давно расторгнут на другом', async ({ page }) => {
  const DAY = 86400000; const now = Date.now();
  await page.addInitScript(([now, DAY]) => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const day = (t) => new Date(t).toISOString().slice(0, 10);
    // монет нет, полис оформлен 30 дней назад, оплачена только первая неделя — по этому прогрессу взноса не хватит
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: now - 2 * DAY, runs: 1, best: 90 }, 'sc-i1b': { at: now - 2 * DAY, runs: 1, best: 90 } },
      done: { [day(now - 2 * DAY)]: 1 }, policyAt: now - 30 * DAY, premiums: { [day(now - 30 * DAY)]: 8 } } }));
  }, [now, DAY]);
  // сервер: тот же ученик расторг полис на другом устройстве 20 дней назад
  const api = (req) => {
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /* не JSON */ }
    if (body.action !== 'progress' || !body.progress) return '{}';
    // прогресс обучения — в учебном прогрессе профиля (textbook.learn)
    const p = body.progress; const tb = p.textbook || {}; const learn = tb.learn || {};
    return JSON.stringify({ profile: { ...p, textbook: { ...tb, learn: { ...learn, policyOff: Math.max(learn.policyOff || 0, now - 20 * DAY) } } } });
  };
  const { errors } = await openApp(page, '/', api, { tab: 'path' });
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-testid=notify-toast][data-id^="lapse:"]')).toHaveCount(0);
  const learn = await page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-v1')).learn);
  expect(learn.policyLapse || 0).toBe(0);
  expect(learn.policyOff).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

// марка идущего месяца в тёмной теме — на бумаге, без чёрной рамки (пункт владельца 08.11, вечер)
test('марка идущего месяца в тёмной теме: зубчатый край — бумага, а не тёмная карточка', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('ems-learn-dark', '1'); });
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  const cur = page.locator('.pf-mstamp[data-state="current"]').first();
  await cur.scrollIntoViewIfNeeded();
  const bg = await cur.locator('.pf-perf').evaluate((el) => getComputedStyle(el).backgroundColor);
  // бумага: все каналы светлые
  const [r, g, b] = bg.match(/\d+/g).map(Number);
  expect(Math.min(r, g, b)).toBeGreaterThan(190);
  expect(errors).toEqual([]);
});
