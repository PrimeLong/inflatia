/* БРАУЗЕРНЫЕ СЦЕНАРИИ — Путь: дорога юнитов, уровни, повторение, работа над ошибками, раскладка.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/path.e2e.js */
import { test, expect } from '@playwright/test';
import {
  openApp, gotoApp, openTab, openTasks, bookBack, expectNoSidewaysScroll, answerExercise, playLesson, withTestFlag, slowInWebkit, passCards, pathNode,
  showUnit, startLesson, pathLabelClashes, unitDone, PATH_JS_KB, HEAVY_CHUNK, installHooks,
} from './helpers.js';

installHooks();

test('путь: карточка урока, «Знакомство» шагами, ошибка и её повтор, итоги, замок следующего урока', async ({ page }) => {
  slowInWebkit();
  await withTestFlag(page);
  const { errors, external } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  await expect(path).toBeVisible();
  await expect(page.getByTestId('bottom-nav').getByRole('button')).toHaveCount(5);
  await expect(page.getByTestId('bottom-nav').getByRole('button', { name: 'Теория' })).toHaveCount(0);
  await expect(page.getByTestId('streak')).toHaveText('0');
  await expect(page.getByTestId('streak-chip')).toHaveAttribute('data-today', 'false');
  // на Пути — юниты одного уровня: Начальный, в нём «Мастерская» (14 уроков), «Биржа труда» (10) и «Сберкасса» (10); плашка
  // «Уровень 1 из 5», назад некуда, следующий уровень закрыт; будущих уровней на экране нет
  expect(await path.getByTestId('path-unit').evaluateAll((els) => els.map((e) => e.dataset.unit))).toEqual(['scarcity', 'labor', 'household']);
  await expect(path.getByTestId('level-switch')).toContainText('Уровень 1 из 5');
  await expect(path.getByTestId('level-switch')).toContainText('Начальный');
  await expect(path.getByTestId('level-prev')).toBeDisabled();
  await expect(path.getByTestId('level-next')).toHaveAttribute('data-locked', 'true');
  await expect(path.getByTestId('path-lesson')).toHaveCount(35);
  await expect(path.getByTestId('path-level')).toContainText('основные термины');
  // глав «в планах» в Начальном больше нет — «Рынок труда» вышел
  await expect(path.getByTestId('path-soon')).toHaveCount(0);
  // в списке уровней: Начальный открыт, Базовый — с тестом (по Начальному), Средний — после него,
  // Продвинутый и Профессиональный строятся
  await path.getByTestId('level-switch-open').click();
  const picker = page.getByTestId('level-picker');
  expect(await picker.getByTestId('level-pick').evaluateAll((els) => els.map((e) => `${e.dataset.level}:${e.dataset.state}`)))
    .toEqual(['start:open', 'basic:locked', 'middle:locked', 'advanced:soon', 'pro:soon']);
  await expect(picker.getByTestId('level-pick-test')).toHaveCount(1);
  await expect(picker.locator('[data-testid=level-pick][data-level="basic"]')).toContainText('тест по уровню «Начальный»');
  await expect(picker.locator('[data-testid=level-pick][data-level="basic"]')).toContainText('Рынок · Кофейня · Порт · Банк · Гастроном');
  await expect(picker.locator('[data-testid=level-pick][data-level="middle"]')).toContainText('сначала откройте уровень «Базовый»');
  await expect(picker.locator('[data-testid=level-pick][data-level="advanced"]')).toContainText('строится');
  await expectNoSidewaysScroll(page);
  await picker.locator('[data-nav="back"]').click();
  await expect(picker).toHaveCount(0);
  await expect(path.locator('[data-state="open"]')).toHaveCount(1);
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'open');
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-kind', 'intro');
  await expectNoSidewaysScroll(page);

  // нажатие на кружок — только карточка урока: название, вид, минуты и опыт
  await pathNode(page, 'sc-i1').click();
  const sheet = page.getByTestId('lesson-sheet');
  await expect(sheet).toContainText('Знакомство');
  await expect(sheet).toContainText(/≈\d+ мин/);
  await expect(sheet).toContainText(/до \d+ опыта/);
  await sheet.getByRole('button', { name: 'Закрыть' }).click();
  await expect(sheet).toHaveCount(0);
  // урок открывается и нажатием на название; до первого ответа выйти можно молча — ничего не засчитано
  await path.getByTestId('path-lesson-title').and(path.locator('[data-lesson="sc-i1"]')).click();
  await page.getByTestId('lesson-start').click();
  const card = page.getByTestId('lesson-card');
  await expect(card).toContainText('Ресурсов');
  await expect(card.locator('svg').first()).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await expect(page.getByText('Выйти из урока?')).toHaveCount(0);
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  await openTab(page, 'profile');
  await expect(page.getByTestId('prof-lessons')).toHaveText('0');
  await openTab(page, 'path');

  // «Знакомство»: шаг — вопрос — шаг — вопрос; первое упражнение неверно
  await startLesson(page, 'sc-i1');
  await page.getByRole('button', { name: 'Понятно' }).click();
  await answerExercise(page, { wrong: true });
  await expect(page.getByTestId('lesson-foot')).toContainText('Правильно:');
  // в «Знакомстве» все вопросы урока уже в очереди — замены нет, и та же задача сразу не возвращается
  await expect(page.getByTestId('retry-note')).toHaveText('Похожего вопроса в уроке нет — задача подождёт в «Повторить ошибки».');
  await expect(page.getByTestId('lesson-foot')).not.toHaveClass(/ds-flash/);
  await expectNoSidewaysScroll(page);
  // встряска после ошибки не даёт ползунка: у тела урока прокрутка только по вертикали и только по делу
  const body = page.getByTestId('lesson').locator('.ln-body').first();
  expect(await body.evaluate((el) => [getComputedStyle(el).overflowX, el.scrollWidth <= el.clientWidth])).toEqual(['hidden', true]);
  expect(await body.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  const { retries, cards } = await playLesson(page);
  expect(retries, 'та же задача в конце урока не возвращается').toBe(0);
  // в первом уроке четыре идеи (docs/mechanics.md, «Первый урок — не больше четырёх новых идей»): первая уже пройдена выше
  expect(cards, 'перед каждым вопросом — свой шаг').toBeGreaterThanOrEqual(3);
  const result = page.getByTestId('lesson-result');
  await expect(result).toContainText('Урок пройден');
  await expect(page.getByTestId('coins')).toHaveCount(1);
  await expect(result.getByTestId('result-xp').locator('[data-value]')).toHaveText(/^\+\d+$/);
  await expect(result.getByTestId('result-acc')).not.toContainText('100%');
  await expect(result).not.toContainText('Урок уже был пройден');
  // первый урок дня — серия на итогах: огонёк вспыхивает, счётчик дней перещёлкивается (без надписи)
  await expect(result.getByTestId('result-streak')).toHaveAttribute('data-days', '1');
  await expect(result.getByTestId('result-streak')).toHaveAttribute('aria-label', 'Серия: 1 день подряд');
  await expect(result).not.toContainText('Огонёк сохранён');
  await expect(result.getByTestId('mascot')).toHaveAttribute('data-mood', 'party');
  // на итогах выход один
  await expect(page.getByTestId('lesson').locator('[data-nav="back"]')).toHaveCount(1);
  await result.getByRole('button', { name: 'Дальше', exact: true }).click();

  // путь: урок пройден, у следующего открывается замок, серия и цель дня засчитаны
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'done');
  // прогресс заданий виден без открытия: строка «что продвинулось» и подросшее кольцо в карточке «Задания»
  await expect(page.getByTestId('tasks-news').first()).toBeAttached();
  expect(await page.getByTestId('tasks-ring').evaluateAll((els) => els.some((e) => Number(e.dataset.have) > 0))).toBe(true);
  await expect(pathNode(page, 'sc-i1b')).toHaveAttribute('data-state', 'open');
  await expect(pathNode(page, 'sc-i1b').getByTestId('unlock-anim')).toHaveCount(1);
  await expect(pathNode(page, 'sc-i1b').getByTestId('unlock-anim')).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByTestId('streak')).toHaveText('1');
  await expect(page.getByTestId('streak-chip')).toHaveAttribute('data-today', 'true');
  // цель дня — минуты занятий (по умолчанию 10)
  await expect(page.getByTestId('goal')).toContainText(/\d+\/10\s*мин/);
  // ошибка ушла в практику (экран «Задания» с Пути), статистика — в «Профиль»
  await openTasks(page);
  await expect(page.getByTestId('practice-mistakes')).toBeEnabled();
  await openTab(page, 'profile');
  // «Мои четыре недели»: календарь и уроки; разбивки по типам упражнений нет
  await expect(page.getByTestId('prof-lessons')).toHaveText('1');
  await expect(page.getByTestId('prof-calendar').locator('.today')).toHaveCount(1);
  // подпись цели — в легенде, а не поверх столбиков; выросшие столбики стоят на оси
  await expect(page.getByTestId('prof-calendar').getByTestId('bars-goal')).toHaveText('цель 10 мин');
  await expect(page.getByTestId('prof-calendar').locator('.st-bars-plot')).toHaveText('');
  await expect.poll(() => page.getByTestId('prof-calendar').evaluate((el) => {
    const axis = el.querySelector('.st-bars-plot').getBoundingClientRect().bottom - 1;
    return [...el.querySelectorAll('.st-col i')].every((i) => getComputedStyle(i).transform === 'none' && Math.abs(i.getBoundingClientRect().bottom - axis) < 0.5);
  })).toBe(true);
  await expect(page.getByTestId('prof-types')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

/* Повтор пройденного урока — отдельным тестом: вместе с первым прохождением это два полных урока «Знакомство»
   в одном тесте, и в WebKit (iPhone) он не укладывался в минуту — падал по таймауту в случайном месте второй
   половины (flaky на CI, smoke :1495 на webkit). Урок здесь уже пройден вчера — как после теста выше. */
test('путь: повтор пройденного урока — «Урок уже был пройден», «Подробнее в учебнике» открывает главу, «назад» — снова итоги', async ({ page }) => {
  slowInWebkit();
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 80 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 80 } } } }));
  });
  const { errors, external } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'done');
  await startLesson(page, 'sc-i1', 'Повторить');
  await playLesson(page);
  await expect(page.getByTestId('lesson-result')).toContainText('Урок уже был пройден');
  await page.getByTestId('result-theory').click();
  await expect(page.getByTestId('learn-book')).toBeVisible();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'scarcity');
  await bookBack(page);
  await expect(page.getByTestId('learn-book')).toHaveCount(0);
  await expect(page.getByTestId('lesson-result')).toBeVisible();
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(path).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('путь: подписи остановок не пересекаются друг с другом, с плашкой «рекомендуем сейчас» и с дорогой', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  await expect(path.getByTestId('path-lesson').first()).toBeVisible();
  // остановки юнита по порядку дороги: уроки и особые уроки
  const ids = await path.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.lesson));
  expect(ids.length).toBeGreaterThan(8);
  // новичок; два урока (рекомендуем — «Персоналии»); середина юнита; почти весь юнит
  for (const k of [0, 2, 5, ids.length - 2]) {
    await page.evaluate(({ done }) => {
      const at = Date.now() - 86400000;
      localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(done.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
    }, { done: ids.slice(0, k) });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(path.getByTestId('path-lesson').first()).toBeVisible();
    if (k) await expect(path.locator('[data-testid=path-lesson][data-state="done"]')).toHaveCount(k);
    await expect(path.getByTestId('path-rec')).toHaveCount(1);
    expect(await pathLabelClashes(page), `пройдено уроков: ${k}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('путь: выход после первого ответа — урок продолжается с того же места; брошенный за сутки — в статистике', async ({ page }) => {
  // урок «Практика» играется целиком дважды — дольше минуты под нагрузкой
  test.setTimeout(120_000);
  await withTestFlag(page);
  // уроки юнита 2 до второй «Практики» уже пройдены (прогресс кладётся один раз — перезагрузка его не стирает)
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const lessons = Object.fromEntries(['sd-i1', 'sd-l1', 'sd-w', 'sd-i2'].map((id) => [id, { at, runs: 1, best: 90 }]));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  await showUnit(page, 'supply-demand');
  await expect(pathNode(page, 'sd-l3')).toHaveAttribute('data-state', 'open');
  // открыть и сразу закрыть — не считается
  await startLesson(page, 'sd-l3');
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  // после первого ответа — вопрос с обещанием сохранить прогресс
  await startLesson(page, 'sd-l3');
  await answerExercise(page);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  const ask = page.getByRole('dialog', { name: 'Выйти из урока?' });
  await expect(ask).toContainText('Прогресс урока сохранится');
  await ask.getByRole('button', { name: 'Продолжить урок' }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.getByTestId('ex')).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await ask.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  await expect(path.locator('[data-unit="supply-demand"] .ln-pin')).toHaveText(/продолжить/i);
  // продолжить — с того же места: прогресс урока не с нуля
  await openTab(page, 'path');
  await startLesson(page, 'sd-l3', 'Продолжить');
  expect(Number(await page.getByTestId('lesson-progress').getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await page.getByRole('dialog', { name: 'Выйти из урока?' }).getByRole('button', { name: 'Выйти', exact: true }).click();
  // не продолжили за сутки — урок брошен: только теперь он в «не доведён до конца»
  await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('ems-learn-resume'));
    Object.values(m).forEach((r) => { r.at -= 25 * 3600 * 1000; });
    localStorage.setItem('ems-learn-resume', JSON.stringify(m));
  });
  await gotoApp(page, '/', 'profile');
  await expect(page.getByTestId('prof-calendar')).toBeVisible();

  // вторая «Практика» заново и целиком, с одной ошибкой; термины — с подсказкой
  await openTab(page, 'path');
  await startLesson(page, 'sd-l3', 'Начать');
  await expect(page.getByTestId('lesson-card')).toHaveCount(0);
  const term = page.getByTestId('ex').locator('.tb-term').first();
  if (await term.count()) {
    await term.click();
    // подсказка ничем не наказывается — и ни о каком штрафе не пишет
    await expect(page.getByTestId('term-sheet')).not.toContainText('опыта');
    await page.getByTestId('term-sheet').getByRole('button', { name: 'Понятно' }).click();
    await expect(page.getByTestId('term-sheet')).toHaveCount(0);
  }
  await playLesson(page, { wrongAt: [2], mistake: true });
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  // практика: ошибка решается — и уходит из списка
  await openTasks(page);
  await page.getByTestId('practice-mistakes').click();
  await playLesson(page);
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('practice-mistakes')).toBeDisabled();

  // проверки юнита у непройденного юнита нет (пункт владельца от 06.11: «доступна проверка юнита, что не пройден, и того,
  // что вообще не открыт»); у закрытого — тем более
  await openTab(page, 'path');
  await expect((await showUnit(page, 'supply-demand')).getByTestId('unit-check')).toHaveCount(0);
  await expect(path.locator('[data-testid="path-unit"][data-unit="elasticity"]').getByTestId('unit-check')).toHaveCount(0);
  // юнит не пройден — сундука нет, пока уроки не пройдены по-настоящему
  await expect(path.locator('[data-testid="path-unit"][data-unit="supply-demand"]').getByTestId('chest')).toHaveCount(0);
  // «уровня легенды» больше нет: пройденный урок берут на алмазном уровне — задачи и теория сложнее
  await expect(page.getByTestId('unit-legend')).toHaveCount(0);
  await pathNode(page, 'sd-i1').click();
  await expect(page.getByTestId('lesson-sheet').getByTestId('lesson-diamond-info')).toContainText('теория глубже');
  await expect(page.getByTestId('lesson-sheet').getByTestId('lesson-start')).toHaveText('Повторить без усложнения');
  // алмазный уровень — малиновый гранат из тёплой палитры, не холодный синий
  expect(await page.getByTestId('lesson-diamond').evaluate((el) => getComputedStyle(el).getPropertyValue('--u').trim().toLowerCase())).toBe('#b3123f');
  await page.getByTestId('lesson-diamond').click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-diamond', 'true');
  // алмазные шаги — с формулами, плашкой «Запомнить» и строкой обозначений
  let legend = false; let remember = false;
  for (let i = 0; i < 40 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    if (await page.getByTestId('step-legend').isVisible()) legend = true;
    if (await page.getByTestId('step-remember').isVisible()) remember = true;
    if (await page.getByTestId('lesson-card').isVisible()) { await page.getByTestId('lesson').locator('.ln-foot button').click(); continue; }
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(legend).toBe(true);
  expect(remember).toBe(true);
  await expect(page.getByTestId('result-diamond')).toContainText('Алмазный уровень взят');
  await expect(page.getByTestId('result-coins')).toContainText(/За урок\+(25|35)/);
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(pathNode(page, 'sd-i1')).toHaveAttribute('data-diamond', 'true');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

// алмазный урок на прошлом уровне: после итогов Путь остаётся на этом уровне, а не прыгает к текущему
test('путь: после алмазного урока на прошлом уровне Путь остаётся на нём', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const sw = page.getByTestId('level-switch');
  await expect(sw).toContainText('Базовый');
  // повторное касание «Пути» до урока — оно не должно сбрасывать выбранный потом уровень
  await page.getByTestId('bottom-nav').locator('[data-tab="path"]').click();
  await startLesson(page, 'sc-i1', /Алмазный/);
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-diamond', 'true');
  for (let i = 0; i < 40 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    if (await page.getByTestId('lesson-card').isVisible()) { await page.getByTestId('lesson').locator('.ln-foot button').last().click(); continue; }
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  await expect(sw).toContainText('Начальный');
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-diamond', 'true');
  // уход на другую вкладку и обратно — тоже на нём; повторное касание «Пути» — к текущему уровню
  await openTab(page, 'shop');
  await openTab(page, 'path');
  await expect(sw).toContainText('Начальный');
  await page.getByTestId('bottom-nav').locator('[data-tab="path"]').click();
  await expect(sw).toContainText('Базовый');
  // серия верных ответов не обнуляется между уроками: следующий урок начинается с неё
  await startLesson(page, 'sc-l1');
  expect(Number(await page.getByTestId('lesson-streak').getAttribute('data-streak'))).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('путь: юнит «Спрос и предложение» — каждый вид урока проходится на телефоне', async ({ page }) => {
  test.setTimeout(180_000);
  await withTestFlag(page);
  // юнит пройден — любой урок открыт для повтора
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'supply-demand');
  // у каждого вида — свой значок на Пути
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  const kinds = await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind));
  expect(kinds).toEqual(['intro', 'practice', 'words', 'intro', 'practice', 'story', 'listen', 'game', 'review', 'summary']);
  const icons = await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.querySelector('svg').getAttribute('class')));
  expect(new Set(icons).size, 'восемь видов — восемь разных значков').toBe(8);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };

  // «Слова»: знакомство, а не проверка — значение и пример сразу, «Дальше» / «Назад»; потом плитки и пары на время
  await startLesson(page, 'sd-w');
  await expect(page.getByTestId('lesson-card')).toHaveAttribute('data-style', 'flash');
  const word = page.getByTestId('flash-card');
  await expect(word).toContainText('Новое слово 1 из 8');
  await expect(word.getByTestId('word-def')).toContainText('сколько покупатели готовы купить');
  await expect(page.getByTestId('word-tip')).toBeVisible();
  await expect(page.getByTestId('word-prev')).toHaveCount(0);
  // карточку тянут мышью: едет за курсором и наклоняется, сверху «Дальше»; отпустили — следующее слово
  const wb = await word.boundingBox();
  await page.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2);
  await page.mouse.down();
  await page.mouse.move(wb.x + wb.width / 2 - 70, wb.y + wb.height / 2, { steps: 6 });
  await expect(word).not.toHaveAttribute('data-dx', '0');
  expect(await word.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
  await expect(word.locator('.lp-swipe-tag.next')).toBeVisible();
  await page.mouse.move(wb.x + wb.width / 2 - 170, wb.y + wb.height / 2, { steps: 6 });
  // наклон — не больше 4°, и верх карточки не уходит за край области урока (раньше до 16° и обрезалось сверху)
  const tilt = await word.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.abs((Math.atan2(m.b, m.a) * 180) / Math.PI); });
  expect(tilt).toBeGreaterThan(0.5);
  expect(tilt).toBeLessThanOrEqual(4.01);
  const bodyTop = await page.locator('.ln-body').evaluate((el) => el.getBoundingClientRect().top);
  expect(await word.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(bodyTop);
  await page.mouse.up();
  // отпустили — старая карточка плавно уезжает в ту же сторону, новая уже на месте
  await expect(page.getByTestId('flash-card-out')).toHaveAttribute('data-side', '-1');
  await expect(word).toContainText('Новое слово 2 из 8');
  await expect(page.getByTestId('flash-card-out')).toHaveCount(0);
  await expect(page.getByTestId('word-dots').locator('i.know')).toHaveCount(2);
  // смахнуть вправо — тоже дальше: направление запоминать не нужно
  const wb2 = await word.boundingBox();
  await page.mouse.move(wb2.x + wb2.width / 2, wb2.y + wb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(wb2.x + wb2.width / 2 + 70, wb2.y + wb2.height / 2, { steps: 6 });
  await expect(word.locator('.lp-swipe-tag')).toHaveText('Дальше');
  await page.mouse.move(wb2.x + wb2.width / 2 + 170, wb2.y + wb2.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(word).toContainText('Новое слово 3 из 8');
  // назад — кнопкой, к прошлому слову: старая карточка уходит вправо (по «Дальше» — влево), а не просто пропадает
  await page.getByTestId('word-prev').click();
  await expect(page.getByTestId('flash-card-out')).toHaveAttribute('data-side', '1');
  await expect(word).toContainText('Новое слово 2 из 8');
  for (let i = 0; i < 6; i += 1) await page.getByTestId('word-next').click();
  await expect(word).toContainText('Новое слово 8 из 8');
  await expect(page.getByTestId('word-next')).toHaveText('К упражнениям');
  // пункт владельца 18.11: последняя карточка уходит с анимацией, на её место — «Все слова — ваши», потом упражнения
  await page.getByTestId('word-next').click();
  await expect(page.getByTestId('flash-card-out')).toBeVisible();
  await expect(page.getByTestId('word-end')).toContainText('Все слова — ваши');
  await expect(page.locator('[data-testid=word-dots] i.know')).toHaveCount(8);
  await expect(page.getByTestId('word-end')).toHaveCount(0, { timeout: 4000 });
  const { kinds: wk } = await playLesson(page, { wrongAt: [0] });
  expect([...wk]).toEqual(expect.arrayContaining(['tiles', 'match', 'choice']));
  await finish();

  // «История»: герои с портретами, цена ползунком, точка равновесия, кривая пальцем
  await startLesson(page, 'sd-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'masha');
  const { kinds: sk } = await playLesson(page);
  expect([...sk]).toEqual(expect.arrayContaining(['price', 'curve', 'point']));
  await finish();

  // «Слушай»: голоса в браузере теста нет — текст на экране с подсветкой
  await startLesson(page, 'sd-l-radio');
  await expect(page.getByTestId('listen-card')).toBeVisible();
  await expect(page.getByTestId('listen-text')).toContainText('морозы');
  await playLesson(page);
  await finish();

  // «Мини-игра»: одна игра на время с графиком рынка; проверка — сама по окончании; неудачная не возвращается
  await startLesson(page, 'sd-g');
  await expect(page.getByTestId('ex').getByTestId('market-chart')).toBeVisible();
  // пункт владельца 18.11: график мини-игры — как в «Разборе графика»: плашки D и S, равновесие с P* и Q*, подписи осей
  const mk = page.getByTestId('ex').getByTestId('market-chart');
  await expect(mk.locator('.lp-tag')).toHaveCount(2);
  await expect(mk.getByTestId('market-eq')).toContainText('P*');
  await expect(mk.getByTestId('market-eq')).toContainText('Q*');
  await expect(mk.locator('.lp-axis')).toHaveCount(2);
  const { kinds: gk, retries } = await playLesson(page, { wrongAt: [0] });
  expect([...gk]).toEqual(['rush']);
  expect(retries).toBe(0);
  await expect(page.getByTestId('lesson-result')).toContainText('Урок пройден, игра — без зачёта: не хватило');
  await finish();

  // «Повторение» и «Итоги юнита»: пункты-карточки, потом тест юнита. В «Повторении» — и задания прошлых юнитов
  // Пути, с меткой места («повторение · Мастерская»): пункт владельца от 06.11
  await startLesson(page, 'sd-rev');
  const pastSeen = [];
  for (let i = 0; i < 16 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    await passCards(page);
    const badge = page.getByTestId('ex-review-badge');
    if (await badge.count() && await badge.getAttribute('data-past')) pastSeen.push(await badge.innerText());
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(pastSeen.length).toBeGreaterThanOrEqual(1);
  expect(pastSeen.length).toBeLessThanOrEqual(3);
  pastSeen.forEach((t) => expect(t).toMatch(/повторение · \S/i));
  await finish();
  await startLesson(page, 'sd-sum');
  await expect(page.getByTestId('lesson-card').locator('.ln-kind')).toHaveText(/Итоги юнита/i);
  const { cards } = await playLesson(page);
  expect(cards).toBe(6);
  await expect(page.getByTestId('lesson-result')).toContainText('Тест юнита');
  await finish();

  // новые взаимодействия вне историй: точка равновесия и сдвиг кривой в «Практиках»
  await startLesson(page, 'sd-l3');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('путь: юнит «Порт» (провалы рынка) — каждый урок проходится, игра — рынок на графике', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum',
      'el-i1', 'el-l1', 'el-i2', 'el-l2', 'el-w', 'el-s1', 'el-radio', 'el-g', 'el-rev', 'el-sum',
      'mf-i1', 'mf-l1', 'mf-i2', 'mf-l2', 'mf-w', 'mf-s1', 'mf-radio', 'mf-g', 'mf-rev', 'mf-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'market-failures');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  for (const id of ['mf-i1', 'mf-l1', 'mf-i2', 'mf-l2']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «Слова»: на карточке излишка потребителя — пример
  await startLesson(page, 'mf-w');
  await expect(page.getByTestId('word-def')).toContainText('Пример:');
  await playLesson(page);
  await finish();
  // «История»: открывает Вера Павловна (крючок в универмаг и открытый вопрос проверяет course.test.js)
  await startLesson(page, 'mf-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'vera');
  await playLesson(page);
  await finish();
  await startLesson(page, 'mf-radio');
  await expect(page.getByTestId('listen-text')).toContainText('газировк');
  await playLesson(page);
  await finish();
  await startLesson(page, 'mf-g');
  await expect(page.getByTestId('ex').getByTestId('market-chart')).toBeVisible();
  await playLesson(page);
  await finish();
  for (const id of ['mf-rev', 'mf-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('путь: юнит «Банк» (деньги и банки) — каждый урок проходится, игра — рынок кредитов на графике', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum',
      'el-i1', 'el-l1', 'el-i2', 'el-l2', 'el-w', 'el-s1', 'el-radio', 'el-g', 'el-rev', 'el-sum',
      'mf-i1', 'mf-l1', 'mf-i2', 'mf-l2', 'mf-w', 'mf-s1', 'mf-radio', 'mf-g', 'mf-rev', 'mf-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'money-banks');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  for (const id of ['mb-i1', 'mb-l1', 'mb-i2', 'mb-l2']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «Слова»: на карточке бартера — пример
  await startLesson(page, 'mb-w');
  await expect(page.getByTestId('word-def')).toContainText('Пример:');
  await playLesson(page);
  await finish();
  // «История»: очередь у «Златобанка» глазами Тимура
  await startLesson(page, 'mb-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'timur');
  await playLesson(page);
  await finish();
  await startLesson(page, 'mb-radio');
  await expect(page.getByTestId('listen-text')).toContainText('денежная масса');
  await playLesson(page);
  await finish();
  await startLesson(page, 'mb-g');
  await expect(page.getByTestId('ex').getByTestId('market-chart')).toBeVisible();
  await playLesson(page);
  await finish();
  for (const id of ['mb-rev', 'mb-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('путь: юнит «Инфляция» — каждый урок проходится, игра «Сбереги кошелёк» засчитывается', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum',
      'el-i1', 'el-l1', 'el-i2', 'el-l2', 'el-w', 'el-s1', 'el-radio', 'el-g', 'el-rev', 'el-sum',
      'mf-i1', 'mf-l1', 'mf-i2', 'mf-l2', 'mf-w', 'mf-s1', 'mf-radio', 'mf-g', 'mf-rev', 'mf-sum',
      'mb-i1', 'mb-l1', 'mb-i2', 'mb-l2', 'mb-w', 'mb-s1', 'mb-radio', 'mb-g', 'mb-rev', 'mb-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'inflation');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  for (const id of ['in-i1', 'in-l1', 'in-i2', 'in-l2', 'in-w']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «История»: копилка Тимура — ноутбук подорожал
  await startLesson(page, 'in-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'timur');
  await playLesson(page);
  await finish();
  await startLesson(page, 'in-radio');
  await expect(page.getByTestId('listen-text')).toContainText('корзина');
  await playLesson(page);
  await finish();
  // «Сбереги кошелёк»: кошелёк и чашки, газета с прогнозом, шкала «прогноз — ставка», три решения
  await startLesson(page, 'in-g');
  const ex = page.getByTestId('ex');
  await expect(ex.getByTestId('game')).toHaveAttribute('data-kind', 'wallet');
  await expect(ex.getByTestId('game-howto')).toBeVisible();
  await expect(ex.getByTestId('wallet-cups')).toHaveAttribute('data-cups', '100');
  await page.evaluate(() => { window.__INFLATIA_GAME_SPEED__ = 6; });
  await ex.getByTestId('game-start').click();
  await expect(ex.getByTestId('wallet-news')).not.toBeEmpty();
  await expect(ex.getByTestId('wallet-scale')).toBeVisible();
  await expect(ex.getByTestId('wallet-opt')).toHaveCount(3);
  // первый год — наличными: лучшим он не бывает, кошелёк тот же, чашек меньше; разбор — полосками
  await ex.locator('[data-testid=wallet-opt][data-opt="cash"]').click();
  await expect(ex.getByTestId('wallet-verdict')).toHaveAttribute('data-ok', 'false');
  await expect(ex.getByTestId('wallet-sum')).toHaveText('10\u00A0000');
  expect(Number(await ex.getByTestId('wallet-cups').getAttribute('data-cups'))).toBeLessThan(100);
  await expect(ex.getByTestId('wallet-bars')).toBeVisible();
  await ex.getByTestId('wallet-next').click();
  // дальше — лучший выбор: 4 из 5, зачёт
  for (let k = 2; k <= 5; k += 1) {
    const year = ex.getByTestId('wallet-year');
    await expect(year).toHaveAttribute('data-year', String(k));
    await ex.locator(`[data-testid=wallet-opt][data-opt="${await year.getAttribute('data-best')}"]`).click();
    await expect(ex.getByTestId('wallet-verdict')).toHaveAttribute('data-ok', 'true');
    await ex.getByTestId('wallet-next').click();
  }
  await expect(ex.getByTestId('wallet-path')).toBeVisible();
  await expect(ex.getByTestId('game-verdict')).toHaveAttribute('data-ok', 'true');
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'true');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await finish();
  for (const id of ['in-rev', 'in-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // учебник: глава «Инфляция» в Базовом уровне, график «Цены и вклад» и словарь
  await openTab(page, 'book');
  await page.getByTestId('textbook').getByRole('button', { name: /Инфляция/ }).first().click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'inflation');
  await expect(page.getByTestId('chapter')).toContainText('Базовый уровень');
  await expect(page.getByTestId('chapter')).toContainText('потребительскую корзину');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('путь: юнит «Пекарня» (издержки) — каждый урок проходится, игра — кривые издержек на графике', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2', 'l3', 's1', 'l-radio', 'g', 'rev', 'sum'] };
    // «Завод» (производство) стоит на Пути перед «Пекарней»
    for (const u of ['el', 'mf', 'mb', 'in', 'cs', 'pr']) units[u] = ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'];
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'costs');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  for (const id of ['ct-i1', 'ct-l1', 'ct-i2', 'ct-l2']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «Слова»: на карточке постоянных издержек — пример
  await startLesson(page, 'ct-w');
  await expect(page.getByTestId('word-def')).toContainText('Пример:');
  await playLesson(page);
  await finish();
  // «История»: пекарня Гриши — мука дорожает
  await startLesson(page, 'ct-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'grisha');
  await playLesson(page);
  await finish();
  await startLesson(page, 'ct-radio');
  await expect(page.getByTestId('listen-text')).toContainText('мука');
  await playLesson(page);
  await finish();
  // игра: постоянные или переменные — кривые средних и предельных издержек на графике
  await startLesson(page, 'ct-g');
  await expect(page.getByTestId('ex').getByTestId('game-chart')).toHaveAttribute('data-chart', 'costs');
  await playLesson(page);
  await finish();
  for (const id of ['ct-rev', 'ct-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('путь: юнит «Биржа» (конкуренция и монополия) — каждый урок проходится, игра — спрос на товар фирмы и наценка', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2', 'l3', 's1', 'l-radio', 'g', 'rev', 'sum'] };
    for (const u of ['el', 'mf', 'mb', 'in', 'cs', 'ct']) units[u] = ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'];
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'competition-monopoly');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  for (const id of ['cm-i1', 'cm-l1', 'cm-i2', 'cm-l2']) { await startLesson(page, id); await playLesson(page); await finish(); }
  await startLesson(page, 'cm-w');
  await expect(page.getByTestId('word-def')).toContainText('Пример:');
  await playLesson(page);
  await finish();
  // «История»: одна мельница на область — Гриша и монополия «Колоса»
  await startLesson(page, 'cm-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'grisha');
  await playLesson(page);
  await finish();
  await startLesson(page, 'cm-radio');
  await expect(page.getByTestId('listen-text')).toContainText('бирже');
  await playLesson(page);
  await finish();
  // игра: ценополучатель или власть над ценой — спрос на товар фирмы и наценка на графике
  await startLesson(page, 'cm-g');
  await expect(page.getByTestId('ex').getByTestId('game-chart')).toHaveAttribute('data-chart', 'power');
  await playLesson(page);
  await finish();
  for (const id of ['cm-rev', 'cm-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('путь: юнит «Ярмарка» (монополистическая конкуренция) — каждый урок проходится, игра — наценка ниже или выше', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2', 'l3', 's1', 'l-radio', 'g', 'rev', 'sum'] };
    for (const u of ['el', 'mf', 'mb', 'in', 'cs', 'ct', 'cm']) units[u] = ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'];
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'monopolistic');
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  // «Знакомство»: спрос на свою чашку и правило MR = MC — на графике кофейни
  await startLesson(page, 'mc-i1');
  await expect(page.getByTestId('lesson-card')).toContainText('монополистическая конкуренция');
  await playLesson(page);
  await finish();
  for (const id of ['mc-l1', 'mc-i2', 'mc-l2', 'mc-w']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «История»: соседки «Зерна» — Маша, Тимур, Гриша и Вера Павловна
  await startLesson(page, 'mc-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'masha');
  await playLesson(page);
  await finish();
  await startLesson(page, 'mc-radio');
  await expect(page.getByTestId('listen-text')).toContainText('ярмарке');
  await playLesson(page);
  await finish();
  // игра: каждое событие сдвигает наценку шагом — график «наценка»
  await startLesson(page, 'mc-g');
  await expect(page.getByTestId('ex').getByTestId('game-chart')).toHaveAttribute('data-chart', 'markup');
  await playLesson(page);
  await finish();
  for (const id of ['mc-rev', 'mc-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('путь: юнит «Биржа труда» (рынок труда) — каждый урок проходится, игра — зарплата на графике рынка', async ({ page }) => {
  test.setTimeout(300_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'].map((l) => `sc-${l}`);
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // «Биржа труда» — в Начальном уровне, сразу после «Мастерской»
  const unit = await showUnit(page, 'labor');
  expect(await page.getByTestId('path').getByTestId('path-unit').evaluateAll((els) => els.map((e) => e.dataset.unit))).toEqual(['scarcity', 'labor', 'household']);
  await expect(unit.getByTestId('path-lesson')).toHaveCount(10);
  expect(await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind)))
    .toEqual(['intro', 'practice', 'intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']);
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); await expect(page.getByTestId('lesson')).toHaveCount(0); };
  // «Знакомство»: пекарня покупает труд, цена на рынке труда — зарплата
  await startLesson(page, 'lm-i1');
  await expect(page.getByTestId('lesson-card')).toContainText('рынок труда');
  await playLesson(page);
  await finish();
  for (const id of ['lm-l1', 'lm-i2', 'lm-l2', 'lm-w']) { await startLesson(page, id); await playLesson(page); await finish(); }
  // «История»: ночная смена в пекарне Гриши
  await startLesson(page, 'lm-s1');
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'grisha');
  await playLesson(page);
  await finish();
  await startLesson(page, 'lm-radio');
  await expect(page.getByTestId('listen-text')).toContainText('сборщиков яблок');
  await playLesson(page);
  await finish();
  // игра: зарплата вверх или вниз — график рынка
  await startLesson(page, 'lm-g');
  await expect(page.getByTestId('ex').getByTestId('market-chart')).toBeVisible();
  await playLesson(page);
  await finish();
  for (const id of ['lm-rev', 'lm-sum']) { await startLesson(page, id); await playLesson(page); await finish(); }
  expect(errors).toEqual([]);
});

test('юнит 1 «Ограниченность и выбор»: все виды уроков, калькулятор в расчёте, повтор после ошибки — другой задачей', async ({ page }) => {
  test.setTimeout(180_000);
  await withTestFlag(page);
  await unitDone(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'scarcity');
  const kinds = await unit.getByTestId('path-lesson').evaluateAll((els) => els.map((e) => e.dataset.kind));
  expect(new Set(kinds)).toEqual(new Set(['intro', 'practice', 'words', 'story', 'listen', 'game', 'review', 'summary']));
  const finish = async () => { await expect(page.getByTestId('lesson-result')).toBeVisible(); await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click(); };

  // «История» Гриши: первый вопрос — расчёт; калькулятор считает и вставляет ответ
  await startLesson(page, 'sc-s1');
  await expect(page.getByTestId('story-feed')).toBeVisible();
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'grisha');
  await passCards(page);
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'calc');
  await ex.getByTestId('calc-open').click();
  // условие и калькулятор целиком — на одном экране урока: от начала условия до «В ответ» не выше области урока
  expect(await ex.evaluate((el) => {
    // на ПК урок увеличен (zoom): высоту области меряем так же, как и прямоугольники, — на экране
    const body = el.closest('.ln-body'); const p = el.querySelector('.ln-prompt').getBoundingClientRect(); const u = el.querySelector('[data-testid=calc-use]').getBoundingClientRect();
    return u.bottom - p.top <= body.getBoundingClientRect().height;
  })).toBe(true);
  for (const k of ['1', '0', '0', '÷', '5', '0']) await ex.locator(`[data-calc="${k}"]`).click();
  await expect(ex.getByTestId('calc-value')).toHaveText('= 2');
  await ex.getByTestId('calc-use').click();
  await expect(ex.getByRole('textbox', { name: 'Ответ числом' })).toHaveValue('2');
  await page.getByRole('button', { name: 'Проверить' }).click();
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'true');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await playLesson(page);
  await finish();

  // «Слова», «Слушай», «Мини-игра», «Повторение», «Итоги юнита»
  for (const id of ['sc-w', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum']) {
    await startLesson(page, id);
    await playLesson(page);
    await finish();
  }

  // ошибка в «Практике» возвращается в конце урока новыми числами или похожим вопросом
  await startLesson(page, 'sc-l1');
  let fresh = null;
  for (let i = 0; i < 30 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    if (await page.getByTestId('ex-retry').isVisible()) fresh = await page.getByTestId('ex-retry').getAttribute('data-fresh');
    await answerExercise(page, { wrong: i === 0 });
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(fresh).toBeTruthy();
  expect(fresh).not.toBe('same');
  expect(errors).toEqual([]);
});

test('Путь: открывается на рекомендованном уроке, юниты одного уровня и плашка уровня, пройденный юнит — строкой, место на карте ведёт к уроку, «К карте»', async ({ page, isMobile }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum', 'sd-i1', 'sd-l1'];
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: {
      lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), claimed: { 'c:scarcity': at }, coins: { '2026-01-01': 400 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  // сразу на рекомендованном уроке: он на экране, карта уехала вверх
  const rec = path.locator('[data-testid=path-lesson][data-rec="true"]');
  await expect(rec).toHaveAttribute('data-lesson', 'sd-w');
  await expect(rec).toBeInViewport();
  // на экране — юниты текущего уровня (Базовый: пять юнитов); плашка уровня закреплена наверху и видна рядом с уроком
  expect(await path.getByTestId('path-unit').evaluateAll((els) => els.map((e) => e.dataset.unit))).toEqual(['supply-demand', 'elasticity', 'market-failures', 'money-banks', 'inflation']);
  const plate = path.getByTestId('level-switch');
  await expect(plate).toBeInViewport();
  await expect(plate).toContainText('Базовый');
  expect((await plate.boundingBox()).y).toBeLessThan(4);
  await expect(path.getByTestId('level-next')).toHaveAttribute('data-locked', 'true');
  // уровень назад — Начальный: пройденный юнит с открытым сундуком — одна строка, не выше 80 px;
  // у узкого экрана название не наезжает на значки; «Уроки» разворачивает
  await path.getByTestId('level-prev').click();
  const sc = path.locator('[data-testid=path-unit][data-unit="scarcity"]');
  expect(await path.getByTestId('path-unit').evaluateAll((els) => els.map((e) => e.dataset.unit))).toEqual(['scarcity', 'labor', 'household']);
  await expect(sc).toHaveAttribute('data-folded', 'true');
  expect((await sc.boundingBox()).height).toBeLessThan(80);
  const titleBox = await sc.locator('.ln-mini-title').boundingBox();
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual((await sc.getByTestId('unit-guide').boundingBox()).x + 1);
  await sc.getByTestId('unit-fold').click();
  await expect(sc).toHaveAttribute('data-folded', 'false');
  await expect(sc.getByTestId('path-lesson')).toHaveCount(15);
  // и обратно — свернуть (ниже касание места на карте раскроет его само)
  await sc.getByTestId('unit-fold').click();
  await expect(sc).toHaveAttribute('data-folded', 'true');
  await expect(path.getByTestId('level-prev')).toBeDisabled();
  // вперёд — снова Базовый
  await path.getByTestId('level-next').click();
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  // замок у следующего уровня — список уровней, у «Среднего» — тест по «Базовому»
  await path.getByTestId('level-next').click();
  const picker = page.getByTestId('level-picker');
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-testid=level-pick][data-level="middle"]').getByTestId('level-pick-test')).toBeVisible();
  await expect(picker.locator('[data-testid=level-pick][data-level="middle"]')).toContainText('тест по уровню «Базовый»');
  await expectNoSidewaysScroll(page);
  await picker.locator('[data-nav="back"]').click();
  await expect(picker).toHaveCount(0);
  // на карте места юнитов уровня на экране — в кольце
  await expect(path.locator('[data-testid=atlas-place][data-unit="supply-demand"]')).toHaveAttribute('data-selected', 'true');
  await expect(path.locator('[data-testid=atlas-place][data-unit="inflation"]')).toHaveAttribute('data-selected', 'true');
  await expect(path.locator('[data-testid=atlas-place][data-unit="scarcity"]')).toHaveAttribute('data-selected', 'false');
  // кнопка «К карте» — пока карта за верхом экрана; касание возвращает к карте
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByTestId('to-map')).toBeVisible();
  await page.getByTestId('to-map').click();
  await expect(path.getByTestId('atlas')).toBeInViewport();
  await expect(page.getByTestId('to-map')).toHaveCount(0);
  // место на карте — уровень этого юнита; у пройденного места дымит труба — оно всё время чуть
  // движется, поэтому без ожидания неподвижности (но после того, как плавная прокрутка закончилась)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // место — посреди экрана: на телефоне низ карты прячется под нижней панелью
  await path.locator('[data-testid=atlas-place][data-unit="scarcity"]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await path.locator('[data-testid=atlas-place][data-unit="scarcity"]').click({ force: true });
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'start');
  // свёрнутый юнит касанием места на карте раскрывается
  await expect(path.locator('[data-testid=path-unit][data-unit="scarcity"]')).toHaveAttribute('data-folded', 'false');
  // на карте 25 мест — по пять на уровень: юниты и места под будущие юниты
  await expect(path.getByTestId('atlas-soon')).toHaveCount(2);
  await expect(path.locator('[data-testid=atlas-place], [data-testid=atlas-soon]')).toHaveCount(25);
  // повторное касание вкладки «Путь» — снова текущий уровень и рекомендованный урок
  await page.getByTestId('bottom-nav').locator('[data-tab="path"]').click();
  await expect(rec).toBeInViewport();
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  // место закрытого уровня — список уровней с тестом
  await page.evaluate(() => window.scrollTo(0, 0));
  await path.locator('[data-testid=atlas-place][data-unit="consumer"]').click();
  await expect(picker).toBeVisible();
  await picker.locator('[data-nav="back"]').click();
  if (isMobile) {
    // телефон: живая модель — свёрнутой строкой, раскрывается касанием
    const fold = path.getByTestId('model-fold');
    await expect(fold).toHaveCount(1);
    expect((await fold.boundingBox()).height).toBeLessThan(80);
    await expect(path.getByTestId('unit-model')).toHaveCount(0);
    await fold.click();
    await expect(path.getByTestId('unit-model')).toBeVisible();
    await path.getByTestId('model-fold-close').click();
    await expect(path.getByTestId('unit-model')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('Путь: проверку пройденного юнита можно пройти ещё раз — уроки остаются пройденными', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'scarcity');
  await unit.getByTestId('unit-check').click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-mode', 'check');
  await expect(page.getByTestId('lesson')).toHaveAttribute('aria-label', 'Проверка юнита');
  await playLesson(page);
  await expect(page.getByTestId('lesson-result')).toContainText('Юнит не забыт');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('path').locator('[data-testid="path-unit"][data-unit="scarcity"] [data-testid="path-lesson"]:not([data-state="done"])')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('повторение: длинная карточка ушла, а решали её внизу — экран сам подводит к следующей', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: {
        'pc-basic': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at },
        'sc-oc': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at },
      },
      learn: { mistakes: [{ id: 'auto:sc-oc', at }] },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTasks(page);
  await page.getByTestId('practice-review').click();
  const review = page.getByTestId('review');
  const items = review.getByTestId('review-item');
  await expect(items).toHaveCount(2);
  const first = items.first();
  const firstId = await first.getAttribute('data-item');
  const next = review.locator(`[data-testid=review-item][data-item="${await items.nth(1).getAttribute('data-item')}"]`);
  // решали внизу длинной карточки: её начало ушло выше края экрана
  await first.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top + 80));
  expect((await first.boundingBox()).y).toBeLessThan(0);
  await first.getByTestId('review-drop').click();
  await expect(review.locator(`[data-testid=review-item][data-item="${firstId}"]`)).toHaveCount(0);
  // следующая карточка — у верха экрана, мотать вверх не нужно
  await expect.poll(async () => (await next.boundingBox()).y, { timeout: 4000 }).toBeGreaterThanOrEqual(0);
  expect((await next.boundingBox()).y).toBeLessThan(200);
  expect(errors).toEqual([]);
});

test('повторение: трудную задачу можно убрать — уходит и из учебника, и из ошибок Пути', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: { 'mb-rounds': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at } },
      learn: { mistakes: [{ id: 'auto:mb-rounds', at }, { id: 'auto:sc-oc', at }] },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTasks(page);
  // многошаговая задача решается только в учебнике — в «Повторить ошибки» её не считаем
  await expect(page.getByTestId('practice-mistakes')).toContainText('1 упражнение');
  await page.getByTestId('practice-review').click();
  const review = page.getByTestId('review');
  const item = review.locator('[data-testid=review-item][data-item="mb-rounds"]');
  // ещё не отвечали — под карточкой «Не знаете, как решать? Убрать из повторения»
  await item.getByTestId('review-drop').click();
  await expect(item.getByTestId('review-badge')).toContainText('убрано');
  await expect(item).toHaveCount(0);
  await expect(review.getByTestId('review-tally')).toContainText('убрано: 1');
  await expect(review.getByTestId('review-empty')).toBeVisible();
  // одно повторение: ушла и ошибка той же задачи на Пути
  await bookBack(page);
  await expect(page.getByTestId('practice-mistakes')).toContainText('1 упражнение');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-v1')));
  expect(saved.problems['mb-rounds']).toMatchObject({ ok: false, due: null });
  expect(saved.learn.mistakes.map((m) => m.id)).toEqual(['auto:sc-oc']);
  expect(errors).toEqual([]);
});

test('повторение: ошибку не снять тут же, карточка уходит «вернётся» или «выучено», Путь и учебник — одно повторение', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: {
        'pc-basic': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at },
        'sc-oc': { tries: 2, ok: true, box: 2, due: Date.now() - 1000, lastAt: at },
      },
      learn: { mistakes: [{ id: 'auto:pc-basic', at }, { id: 'auto:sc-oc', at }] },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTasks(page);
  // pc-basic — многошаговая: решается в учебнике, в «Повторить ошибки» её нет
  await expect(page.getByTestId('practice-mistakes')).toContainText('1 упражнение');
  await page.getByTestId('practice-review').click();
  const review = page.getByTestId('review');
  await expect(review.getByTestId('review-item')).toHaveCount(2);
  // термин в условии нажимается — определение прямо в тексте
  const pc = review.locator('[data-testid=review-item][data-item="pc-basic"]');
  await pc.locator('[data-term]').first().click();
  await expect(pc.locator('.tb-def').first()).toBeVisible();
  // ошибка — карточка остаётся; тут же верно — повторение не снято
  const solve = async (vals) => {
    const inputs = pc.getByRole('textbox');
    for (let k = 0; k < vals.length; k += 1) await inputs.nth(k).fill(vals[k]);
    await pc.getByRole('button', { name: 'Уверен', exact: true }).click();
    await pc.getByRole('button', { name: 'Проверить' }).click();
  };
  await solve(['1', '2', '3']);
  await expect(pc).toHaveAttribute('data-outcome', 'wrong');
  await solve(['10', '300', '40']);
  await expect(pc.getByTestId('tb-verdict')).toContainText('в этот раз была ошибка');
  await expect(pc).toHaveAttribute('data-outcome', 'wrong');
  await pc.getByTestId('review-dismiss').click();
  await expect(pc.getByTestId('review-badge')).toContainText('через 2 дня');
  await expect(pc).toHaveCount(0);
  // последний шаг расписания — «Выучено», и карточка исчезает
  const oc = review.locator('[data-testid=review-item][data-item="sc-oc"]');
  await oc.getByRole('textbox').fill('3');
  await oc.getByRole('button', { name: 'Уверен', exact: true }).click();
  await oc.getByRole('button', { name: 'Проверить' }).click();
  await expect(oc.getByTestId('review-badge')).toContainText('Выучено');
  await expect(oc).toHaveCount(0);
  await expect(review.getByTestId('review-tally')).toContainText('выучено: 1');
  await expect(review.getByTestId('review-tally')).toContainText('отложено до следующего раза: 1');
  await expect(review.getByTestId('review-empty')).toBeVisible();
  // одно повторение: решённая в учебнике задача ушла и из ошибок Пути, нерешённая — осталась (в учебнике)
  await bookBack(page);
  await expect(page.getByTestId('practice-mistakes')).toContainText('Ошибок нет');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-v1')));
  expect(saved.learn.mistakes.map((m) => m.id)).toEqual(['auto:pc-basic']);
  expect(errors).toEqual([]);
});

test('Путь: тест уровня — сдан, и Путь сразу на следующем уровне; уроки сданного уровня открыты', async ({ page }) => {
  test.setTimeout(150_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  await expect(path.locator('[data-testid=path-lesson][data-state="locked"]').first()).toBeVisible();
  // тест «Базового» из списка уровней — задачи всех четырёх юнитов уровня
  await path.getByTestId('level-next').click();
  const picker = page.getByTestId('level-picker');
  await picker.locator('[data-testid=level-pick][data-level="middle"]').getByTestId('level-pick-test').click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-mode', 'check');
  await expect(page.getByTestId('lesson')).toHaveAttribute('aria-label', 'Тест уровня «Базовый»');
  await playLesson(page);
  await expect(page.getByTestId('lesson-result')).toContainText('Проверка сдана');
  await expect(page.getByTestId('lesson-result')).toContainText('Уровень «Средний» открыт');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  // Путь — сразу на «Среднем»: прошлых уровней на экране нет
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'middle');
  expect(await path.getByTestId('path-unit').evaluateAll((els) => els.map((e) => e.dataset.unit))).toEqual(['consumer', 'production', 'costs', 'competition-monopoly', 'monopolistic']);
  await expect(pathNode(page, 'cs-i1')).toHaveAttribute('data-state', 'open');
  await path.getByTestId('level-switch-open').click();
  expect(await picker.getByTestId('level-pick').evaluateAll((els) => els.map((e) => `${e.dataset.level}:${e.dataset.state}`)))
    .toEqual(['start:done', 'basic:open', 'middle:open', 'advanced:soon', 'pro:soon']);
  await expect(picker.getByTestId('level-pick-test')).toHaveCount(0);
  await picker.locator('[data-nav="back"]').click();
  // уровень назад — уроки сданного «Базового» открыты, но пройденными не стали
  await path.getByTestId('level-prev').click();
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  await expect(path.locator('[data-testid=path-lesson][data-state="locked"]')).toHaveCount(0);
  await expect(path.locator('[data-testid=path-lesson][data-state="done"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «после каждого уровня — экзамен по всему уровню и прошлым, только не называй его экзамен»
test('«Большое повторение» в конце уровня: новый уровень ждёт его; 15 заданий, «Уровень подтверждён» и печать; потом — следующий уровень', async ({ page }) => {
  test.setTimeout(180_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-level-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  // Путь стоит на «Начальном»: под последним юнитом — «Большое повторение», это следующая остановка
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'start');
  const stop = path.getByTestId('level-review');
  await expect(stop).toHaveAttribute('data-level', 'start');
  await expect(stop).toHaveAttribute('data-state', 'open');
  await expect(stop).toHaveAttribute('data-cur', 'true');
  await expect(stop).toContainText('Большое повторение');
  await expect(stop).not.toContainText(/экзамен/i);
  // следующий уровень закрыт, пока повторение не пройдено
  await expect(path.getByTestId('level-next')).toHaveAttribute('data-locked', 'true');
  await stop.getByTestId('level-review-start').click();
  const lesson = page.getByTestId('lesson');
  await expect(lesson).toHaveAttribute('data-mode', 'level');
  await expect(lesson).toHaveAttribute('aria-label', 'Большое повторение: начальный уровень');
  await expect(lesson.getByRole('progressbar').first()).toHaveAccessibleName(/из 15$/);
  await playLesson(page);
  const res = page.getByTestId('lesson-result');
  await expect(res.getByTestId('result-title')).toHaveText('Уровень подтверждён');
  await expect(res).toContainText('Уровень «Базовый» открыт');
  await expect(res.getByTestId('result-coins')).toContainText('За большое повторение+20');
  await res.getByRole('button', { name: 'Дальше', exact: true }).click();
  // Путь — на «Базовом», первый урок открыт
  await expect(path.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  await expect(pathNode(page, 'sd-i1')).toHaveAttribute('data-state', 'open');
  // на «Начальном» — печать «Уровень подтверждён» и «Пройти ещё раз»
  await path.getByTestId('level-prev').click();
  await expect(stop).toHaveAttribute('data-state', 'done');
  await expect(stop).toHaveAttribute('data-ok', 'true');
  await expect(stop.getByTestId('level-review-seal')).toBeVisible();
  await expect(stop.getByTestId('level-review-start')).toHaveText('Пройти ещё раз');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.levels.start.best)).toBe(100);
  expect(errors).toEqual([]);
});

for (const saveData of [true, false]) {
  test(`путь: до появления Пути — не больше ${PATH_JS_KB} КБ JS, главы, формулы, движок и лавка не грузятся; фоновая подгрузка ${saveData ? 'при экономии трафика не идёт' : 'идёт после простоя'}`, async ({ page }) => {
    const js = []; let shown = false;
    page.on('response', async (r) => {
      if (!/\.js(\?|$)/.test(r.url())) return;
      const before = !shown;
      try { js.push({ url: r.url(), size: (await r.body()).length, before }); } catch { /* ответ без тела */ }
    });
    if (saveData) await page.addInitScript(() => { Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g' } }); });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByTestId('path')).toBeVisible();
    shown = true;
    await page.waitForLoadState('networkidle');
    const before = js.filter((x) => x.before);
    const kb = Math.round(before.reduce((a, x) => a + x.size, 0) / 1024);
    const list = before.sort((a, b) => b.size - a.size).slice(0, 12).map((x) => `${x.url.split('/').pop()} ${Math.round(x.size / 1024)} КБ`).join(', ');
    expect(kb, `JS до появления Пути: ${list}`).toBeLessThanOrEqual(PATH_JS_KB);
    expect(before.map((x) => x.url).filter((u) => HEAVY_CHUNK.test(u)), 'тяжёлые чанки до появления Пути').toEqual([]);
    // после простоя (4 с и пауза браузера): фоновая подгрузка урока — или её нет при экономии трафика
    await page.waitForTimeout(7000);
    const lesson = js.filter((x) => /\/assets\/learn-lesson-/.test(x.url)).length;
    if (saveData) expect(js.map((x) => x.url).filter((u) => HEAVY_CHUNK.test(u)), 'при экономии трафика ничего не догружается').toEqual([]);
    else expect(lesson, 'файл урока догружен в фоне').toBeGreaterThan(0);
    // урок открывается и там, и там
    await startLesson(page, 'sc-i1');
    await expect(page.getByTestId('lesson')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('узкий телефон 320 px: Путь без бокового скролла, нижняя панель целиком на экране', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'только телефон');
  await withTestFlag(page);
  await page.setViewportSize({ width: 320, height: 658 });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.getByTestId('path')).toBeVisible();
  await expectNoSidewaysScroll(page);
  // последняя вкладка «⋯» целиком на экране; её меню — тоже
  const nav = await page.getByTestId('bottom-nav').locator('[data-tab="more"]').boundingBox();
  expect(nav.x + nav.width).toBeLessThanOrEqual(321);
  await page.getByTestId('bottom-nav').locator('[data-tab="more"]').click();
  const menu = await page.getByTestId('more-menu').boundingBox();
  expect(menu.x).toBeGreaterThanOrEqual(0);
  expect(menu.x + menu.width).toBeLessThanOrEqual(321);
  await page.getByTestId('more-menu').locator('[data-tab="profile"]').click();
  await expect(page.getByTestId('learn-profile')).toBeVisible();
  await expect(page.getByTestId('bottom-nav').locator('[data-tab="more"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('bottom-nav').locator('[data-tab="more"]')).toHaveText('Ещё');
  expect(errors).toEqual([]);
});

test('ПК от 1024 px: Путь в две колонки, у главы учебника оглавление сбоку', async ({ page, isMobile }) => {
  await withTestFlag(page);
  // юнит 1 пройден — на Пути «Рынок» с живой моделью
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (isMobile) {
    // телефон: одна колонка, карточка «Задания» наверху Пути, живая модель — под своим юнитом
    await expect(path).toHaveAttribute('data-layout', 'column');
    await expect(page.getByTestId('path-side')).toHaveCount(0);
    await expect(path.getByTestId('tasks-card')).toBeVisible();
  } else {
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(path).toHaveAttribute('data-layout', 'columns');
      const side = page.getByTestId('path-side');
      // справа: задания (карточка и задания дня) и живая модель юнита на экране — ровно одна на Пути
      await expect(side.getByTestId('tasks-card')).toBeVisible();
      await expect(side.getByTestId('side-quests').getByTestId('quest')).toHaveCount(3);
      await expect(side.getByTestId('unit-model')).toHaveCount(1);
      await expect(path.getByTestId('unit-model')).toHaveCount(1);
      await expect(path.getByTestId('tasks-card')).toHaveCount(1);
      // колонки рядом: правая начинается правее левой и не уезжает вбок
      const main = await path.locator('.ln-path-main').boundingBox();
      const box = await side.boundingBox();
      expect(box.x).toBeGreaterThan(main.x + main.width - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await noScroll()).toBe(true);
    }
    // живая модель на ПК сворачивается в строку и разворачивается обратно; выбор запоминается
    const side = page.getByTestId('path-side');
    await side.getByTestId('model-fold-close').click();
    await expect(side.getByTestId('unit-model')).toHaveCount(0);
    await expect(side.getByTestId('model-fold')).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByTestId('path-side').getByTestId('model-fold')).toBeVisible();
    await page.getByTestId('path-side').getByTestId('model-fold').click();
    await expect(page.getByTestId('path-side').getByTestId('unit-model')).toHaveCount(1);
    // уже 1024 — одна колонка
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(path).toHaveAttribute('data-layout', 'column');
    await expect(page.getByTestId('path-side')).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  // учебник: у главы сбоку оглавление всех глав, открытая отмечена; переход — по клику
  await openTab(page, 'book');
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'supply-demand');
  const toc = page.getByTestId('tb-side-toc');
  if (isMobile) {
    await expect(toc).toHaveCount(0);
  } else {
    await expect(toc).toBeVisible();
    await expect(toc.locator('[aria-current="page"]')).toContainText('Спрос и предложение');
    const tb = await toc.boundingBox();
    const body = await page.locator('.tb-ch-main').boundingBox();
    expect(tb.x + tb.width).toBeLessThanOrEqual(body.x);
    await toc.getByRole('button', { name: /Эластичность/ }).click();
    await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'elasticity');
    await expect(toc.locator('[aria-current="page"]')).toContainText('Эластичность');
    expect(await noScroll()).toBe(true);
    // крупный текст: боковая панель не уходит за низ экрана, «В этой главе» докручивается до конца
    const plus = page.getByRole('button', { name: 'Крупнее текст' });
    while (await plus.isEnabled()) await plus.click();
    const aside = page.locator('.tb-ch-aside');
    // страницу прокрутили вниз — панель закреплена у верха и целиком на экране
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(200);
    await aside.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const last = page.getByTestId('tb-sections').locator('li').last();
    await expect(last).toBeInViewport();
    const ab = await aside.boundingBox();
    expect(ab.y + ab.height).toBeLessThanOrEqual(900 + 1);
  }
  expect(errors).toEqual([]);
});

test('Путь: наверху — уровень знаний маленьким числом, уровень курса и точки уровней; рост — «+N»', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
    // в прошлый раз ученик видел 2 — теперь 5: рост показывается «+3»
    if (!sessionStorage.getItem('seen-once')) { localStorage.setItem('ems-know-seen', '2'); sessionStorage.setItem('seen-once', '1'); }
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const grade = page.getByTestId('course-level');
  await expect(grade).toHaveAttribute('data-done', '5');
  // 5 уроков на 90%: по 1 за урок, без «условных единиц из 1000» и без ступеней A1…C2
  await expect(grade).toHaveAttribute('data-points', '5');
  await expect(page.getByTestId('course-points')).toHaveText('5');
  await expect(grade).toHaveAttribute('data-gain', '3');
  await expect(page.getByTestId('course-gain')).toHaveText('+3');
  await expect(grade).toContainText('Уровень знаний');
  await expect(grade).toContainText('Начальный уровень курса');
  await expect(page.getByTestId('course-next')).toHaveText('Пройдено уроков уровня: 5 из 35');
  await expect(grade.locator('.ln-know-steps i')).toHaveCount(5);
  await expect(grade.locator('.ln-know-steps i.on')).toHaveText('1');
  await expect(grade).not.toContainText(/условн|из 1000|\b[ABC][12]\b/);
  await expect(page.getByTestId('wallet-balance')).toHaveCount(0);
  // число запомнено: при следующем заходе роста нет
  await page.reload();
  await expect(page.getByTestId('course-level')).toHaveAttribute('data-points', '5');
  await expect(page.getByTestId('course-gain')).toHaveCount(0);
  // на узком телефоне подписи не вылезают за рамку
  // текст для чтения с экрана обрезан нарочно — его не считаем
  const over = await grade.evaluate((el) => [...el.querySelectorAll('*')].filter((x) => !x.classList.contains('ds-sr') && x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== 'visible').length);
  expect(over).toBe(0);
  const gb = await grade.boundingBox(); const vw = page.viewportSize().width;
  expect(gb.x + gb.width).toBeLessThanOrEqual(vw);
  expect(errors).toEqual([]);
});

test('«Работа над ошибками»: много ошибок в юните — обязательный урок перед следующим, после него Путь открыт', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2'];
    const mistakes = ['sc-e1-best', 'sc-e1-free', 'sc-e1-gap', 'sc-e1-uni', 'sc-e2-concert', 'sc-e2-project'].map((id, k) => ({ id, at: at + k }));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 60 }])), mistakes } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const fix = page.locator('[data-testid=path-extra][data-extra="fix"]');
  await expect(fix).toBeVisible();
  await expect(page.getByTestId('path-fix-count')).toHaveText('6');
  await expect(fix.locator('xpath=following-sibling::button[1]')).toContainText('сначала — ошибки юнита');
  // следующий урок закрыт — и сказано почему
  await pathNode(page, 'sc-i2').click();
  await expect(page.getByTestId('lesson-sheet-locked')).toContainText('Работа над ошибками');
  await page.getByTestId('lesson-sheet').getByRole('button', { name: 'Закрыть' }).click();
  await fix.click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('aria-label', 'Работа над ошибками');
  // сколько на значке, столько и заданий — без добора
  await expect(page.getByTestId('lesson-progress').locator('.ds-level-n')).toHaveText('0/6');
  // решили половину и вышли — урок не пропал с дороги (ошибки снимаются, когда он пройден целиком)
  for (let i = 0; i < 3; i += 1) {
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  const third = await page.getByTestId('ex').getAttribute('data-answer');
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await page.getByRole('dialog', { name: 'Выйти из урока?' }).getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(fix).toBeVisible();
  await expect(page.getByTestId('path-fix-count')).toHaveText('6');
  await expect(fix.locator('xpath=following-sibling::button[1]')).toContainText('продолжить');
  // открыли снова — тот же урок с того же места, а не новые задания
  await fix.click();
  await expect(page.getByTestId('lesson-progress').locator('.ds-level-n')).toHaveText('3/6');
  expect(await page.getByTestId('ex').getAttribute('data-answer')).toBe(third);
  for (let i = 0; i < 30 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  await expect(page.getByTestId('lesson-result')).toContainText('Ошибки разобраны — Путь открыт');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(fix).toHaveCount(0);
  await expect(pathNode(page, 'sc-i2')).toHaveAttribute('data-state', 'open');
  expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.fixed.scarcity)).toBe(true);
  expect(errors).toEqual([]);
});
