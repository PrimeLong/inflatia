/* БРАУЗЕРНЫЕ СЦЕНАРИИ — урок: задания всех видов, мини-игры, ленты, темы и украшения, итоги.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/lesson.e2e.js */
import { test, expect } from '@playwright/test';
import {
  openApp, gotoApp, shopTab, openTab, expectNoSidewaysScroll, answerExercise, playLesson, withTestFlag, playDiscover, passCards, pathNode, showUnit,
  startLesson, unitDone, installHooks,
} from './helpers.js';

installHooks();

// тот же урок открыт на телефоне и на ПК: на телефоне ошибка — молния урока на ПК берёт общую серию из
// синхронизации, а не продолжает свою (пункт владельца от 8 ноября 2026)
test('урок: серия, обнулённая на другом устройстве, гасит молнию открытого урока — следующий верный «4», а не «9»', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, run: { n: 7, at: Date.now() - 60000 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const flame = page.getByTestId('lesson-streak');
  await startLesson(page, 'sc-l1');
  await expect(flame).toHaveAttribute('data-streak', '7');
  await passCards(page); await answerExercise(page);
  await expect(flame).toHaveAttribute('data-streak', '8');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  // пришла синхронизация: на другом устройстве (тот же урок открыт и там) ошибка и три верных ответа
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    p.learn.run = { n: 3, at: Date.now(), z: Date.now() - 1000 };
    window.dispatchEvent(new CustomEvent('ems-progress', { detail: p }));
  });
  await expect(flame).toHaveAttribute('data-streak', '3');
  await passCards(page); await answerExercise(page);
  await expect(flame).toHaveAttribute('data-streak', '4');
  expect(errors).toEqual([]);
});

// урок не теряется: закрыли или перезагрузили страницу — «Продолжить» с того же места. Серия — одна на день:
// начатый раньше урок не возвращает серию, сбитую ошибкой в другом (жалоба на абуз)
test('урок: «+1» у молнии серии — за ответ в этом уроке; урок, открытый с идущей серией, — без «+1»', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
  });
  await openApp(page, '/', '{}', { tab: 'path' });
  const flame = page.getByTestId('lesson-streak');
  // урок впервые: три верных подряд — молния «3» и «+1» за третий
  await startLesson(page, 'sc-l1');
  for (let k = 0; k < 3; k += 1) { await passCards(page); await answerExercise(page); await page.getByRole('button', { name: 'Дальше', exact: true }).click(); }
  await expect(flame).toHaveAttribute('data-streak', '3');
  await expect(flame.getByTestId('lesson-streak-plus')).toHaveCount(1);
  // урок открыли снова (после перезагрузки) — серия дня та же, молния «3», но «+1» нет: ответа ещё не было
  await page.reload({ waitUntil: 'networkidle' });
  await startLesson(page, 'sc-l1', /Продолжить/);
  await expect(flame).toHaveAttribute('data-streak', '3');
  await expect(flame.getByTestId('lesson-streak-plus')).toHaveCount(0);
  // следующий верный — «+1» снова
  await passCards(page); await answerExercise(page);
  await expect(flame).toHaveAttribute('data-streak', '4');
  await expect(flame.getByTestId('lesson-streak-plus')).toHaveCount(1);
});

test('урок: после перезагрузки продолжается с того же места; начатый урок не воскрешает сбитую серию', async ({ page }) => {
  test.setTimeout(150_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2'].map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // серия дня — в сохранённом состоянии ученика
  const rc = () => page.evaluate(() => {
    const d = new Date(); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return ((JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.daily || {})[day] || {}).rc || 0;
  });
  // бессрочная серия молнии — run в прогрессе (общая для устройств)
  const run = () => page.evaluate(() => ((JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.run || {}).n || 0));
  const flame = page.getByTestId('lesson-streak');
  const leaveLesson = async () => {
    await page.getByRole('button', { name: 'Выйти из урока' }).click();
    await page.getByRole('dialog', { name: 'Выйти из урока?' }).getByRole('button', { name: 'Выйти', exact: true }).click();
    await expect(page.getByTestId('lesson')).toHaveCount(0);
  };
  // первый урок: три верных подряд — молния «3 подряд верно» (огонёк — только у серии дней)
  await startLesson(page, 'sc-l1');
  for (let k = 0; k < 3; k += 1) { await passCards(page); await answerExercise(page); await page.getByRole('button', { name: 'Дальше', exact: true }).click(); }
  await passCards(page);
  await expect(flame).toHaveAttribute('data-streak', '3');
  // молния — значок и число, без подписи (подпись — только для экранного диктора)
  await expect(flame).toHaveText('3');
  await expect(flame).toHaveAttribute('aria-label', '3 подряд верно');
  await expect(flame.locator('svg.lucide-zap')).toHaveCount(1);
  await expect(flame.locator('svg.lucide-flame')).toHaveCount(0);
  expect(await rc()).toBe(3);
  expect(await run()).toBe(3);
  const ex = page.getByTestId('ex');
  const here = [await ex.getAttribute('data-kind'), await ex.getAttribute('data-answer')];
  // браузер закрыли посреди урока — после перезагрузки урок ждёт с того же места, с той же серией
  await page.reload({ waitUntil: 'networkidle' });
  await startLesson(page, 'sc-l1', /Продолжить/);
  await passCards(page);
  expect([await ex.getAttribute('data-kind'), await ex.getAttribute('data-answer')]).toEqual(here);
  await expect(flame).toHaveAttribute('data-streak', '3');
  // ушли в другой урок и ошиблись — серия гаснет
  await leaveLesson();
  await startLesson(page, 'sc-l2');
  await passCards(page);
  await answerExercise(page, { wrong: true });
  expect(await rc()).toBe(0);
  expect(await run()).toBe(0);
  await leaveLesson();
  // вернулись в первый урок — серия не воскресает из сохранённого урока
  await startLesson(page, 'sc-l1', /Продолжить/);
  await passCards(page);
  await expect(flame).toHaveCount(0);
  expect(await rc()).toBe(0);
  expect(errors).toEqual([]);
});

// жалоба mw83dngv (09.11): «график всё ещё сломан» — в «Наценке» каждый ответ двигает график, подписи видны всегда
test('игра «Наценка ниже или выше?»: каждое событие сдвигает наценку, подписи «наценка» и MR на месте и не на оси', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const units = ['scarcity', 'labor', 'supply-demand', 'elasticity', 'market-failures', 'money-banks', 'inflation', 'consumer', 'production', 'costs', 'competition-monopoly'];
    const ids = ['mc-i1', 'mc-l1', 'mc-i2', 'mc-l2', 'mc-w', 'mc-s1', 'mc-radio'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { units: Object.fromEntries(units.map((u) => [u, { tested: at }])),
      lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'mc-g');
  const ex = page.getByTestId('ex');
  await ex.getByTestId('game-start').click();
  const chart = ex.getByTestId('game-chart');
  const card = ex.getByTestId('game-card');
  const states = [JSON.parse(await chart.getAttribute('data-state')).m];
  for (let i = 0; i < 8; i += 1) {
    const side = await card.getAttribute('data-answer');
    await ex.locator(`button[data-side="${side}"]`).click();
    await expect.poll(async () => JSON.parse(await chart.getAttribute('data-state')).m).not.toBe(states[states.length - 1]);
    states.push(JSON.parse(await chart.getAttribute('data-state')).m);
    await expect(chart.getByTestId('game-markup-label')).toBeVisible();
    await expect(chart.getByTestId('game-mr-label')).toBeVisible();
  }
  // полосы от оси цен нет, отрезок наценки — ровно на пунктире выпуска (владелец 09.11: «полоса не ровная, она слева»)
  await expect(chart.locator('rect')).toHaveCount(0);
  // график доезжает до нового состояния плавно — сравниваем в один момент, когда он встал
  await expect.poll(() => chart.evaluate((svg) => {
    const bar = svg.querySelector('[data-testid=game-markup-bar]'); const q = svg.querySelector('line[stroke-dasharray="3 3"]');
    return Math.abs(Number(bar.getAttribute('x1')) - Number(q.getAttribute('x1')));
  })).toBeLessThan(0.01);
  // подпись MR не на оси Q: её низ выше оси
  const axisY = await chart.evaluate((svg) => { const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal; return r.top + ((200 - 26) / vb.height) * r.height; });
  expect((await chart.getByTestId('game-mr-label').boundingBox()).y + (await chart.getByTestId('game-mr-label').boundingBox()).height).toBeLessThanOrEqual(axisY + 1);
  expect(errors).toEqual([]);
});

test('урок: длинный разбор и «Как решать» прокручиваются в панели ответа — «Дальше» всегда на экране (жалоба mvssly7o)', async ({ page }) => {
  test.setTimeout(240_000);
  await withTestFlag(page);
  // экран из жалобы: 360×768
  await page.setViewportSize({ width: 360, height: 768 });
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2', 'l3', 's1', 'l-radio', 'g', 'rev', 'sum'] };
    for (const u of ['lm', 'el', 'mf', 'mb', 'in', 'cs', 'ct']) units[u] = ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'];
    units.cm = ['i1', 'l1', 'i2'];
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // практика монополии из жалобы: «Какую цену назначит монополист?» — самый длинный разбор в курсе
  await startLesson(page, 'cm-l2');
  let opened = 0;
  for (let i = 0; i < 40 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    await passCards(page);
    await answerExercise(page);
    // верный ответ без разбора — панель пустая, но на месте
    await expect(page.getByTestId('ex-feedback')).toBeAttached();
    const how = page.getByTestId('ex-how-open');
    if (await how.isVisible()) { await how.click(); await expect(page.getByTestId('ex-how')).toBeVisible(); opened += 1; }
    const next = page.getByRole('button', { name: 'Дальше', exact: true });
    await expect(next).toBeInViewport({ ratio: 1 });
    // панель ответа — не выше трёх четвертей экрана: задание над ней остаётся видно
    expect((await page.getByTestId('lesson-foot').boundingBox()).height).toBeLessThanOrEqual(768 * 0.76);
    await next.click();
  }
  expect(opened, 'хотя бы один разбор «Как решать» раскрыт').toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('«Соедините» на телефоне: термины фишками сверху, определения во всю ширину, у соединённого — метка термина (жалоба mvu7oqpw)', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.setViewportSize({ width: 360, height: 768 });
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2', 'l3', 's1', 'l-radio', 'g', 'rev', 'sum'] };
    for (const u of ['lm', 'el', 'mf', 'mb', 'in', 'cs', 'ct']) units[u] = ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'];
    units.cm = ['i1', 'l1', 'i2', 'l2'];
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // «Слова» «Биржи»: пары «термин — определение» на время
  await startLesson(page, 'cm-w');
  for (let i = 0; i < 30; i += 1) {
    await passCards(page);
    if (await page.getByTestId('ex').getAttribute('data-kind') === 'match') break;
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'match');
  const exW = (await ex.boundingBox()).width;
  // определения — во всю ширину, термины — короткими фишками
  for (const b of await ex.locator('[data-side=right]').all()) expect((await b.boundingBox()).width).toBeGreaterThan(exW * 0.9);
  expect((await ex.locator('[data-side=left]').first().boundingBox()).width).toBeLessThan(exW * 0.75);
  // соединили — в месте определения встало слово (место — потом слово из банка)
  const term = (await ex.locator('[data-side=left]').first().innerText()).trim();
  await ex.locator('[data-side=right]').nth(1).click();
  await ex.locator('[data-side=left]').first().click();
  await expect(ex.locator('[data-side=right]').nth(1).getByTestId('match-tag')).toHaveText(term);
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('задание в формате ЕГЭ: метка и номер, пункты по номерам, бланк цифрами; одна ошибка — «1 балл из 2»', async ({ page }) => {
  test.setTimeout(180_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const units = { sc: ['i1', 'l1', 'l2', 'i2', 'l3', 'l4', 'l5', 'l6', 'w', 's1', 'radio', 'g', 'rev', 'sum'], lm: ['i1', 'l1', 'i2', 'l2', 'w', 's1', 'radio', 'g', 'rev', 'sum'], sd: ['i1', 'l1', 'w', 'i2'] };
    const ids = Object.entries(units).flatMap(([u, ls]) => ls.map((l) => `${u}-${l}`));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // практика «Предложение и равновесие»: задание ЕГЭ в ней всегда
  await startLesson(page, 'sd-l3');
  let seen = false;
  for (let i = 0; i < 40 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    await passCards(page);
    const ex = page.getByTestId('ex');
    if (await ex.getAttribute('data-kind') === 'exam') {
      seen = true;
      await expect(ex.getByTestId('exam-tag')).toHaveText('ЕГЭ · задание 7');
      const ans = JSON.parse(await ex.getAttribute('data-answer'));
      const all = await ex.locator('[data-pick]').evaluateAll((els) => els.map((e) => e.dataset.pick));
      // все верные и один лишний — одна ошибка
      for (const k of [...ans.keys, all.find((x) => !ans.keys.includes(x))]) await ex.locator(`[data-pick="${k}"]`).click();
      await expect(ex.getByTestId('exam-form')).toHaveAttribute('aria-label', /^Ответ: \d{3,4}$/);
      await page.getByRole('button', { name: 'Проверить' }).click();
      await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
      await expect(page.getByTestId('ex-why')).toContainText('1 балл из 2');
      await expectNoSidewaysScroll(page);
      await page.getByRole('button', { name: 'Дальше', exact: true }).click();
      continue;
    }
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(seen, 'задание ЕГЭ было в практике').toBe(true);
  expect(errors).toEqual([]);
});

test('мини-игра: одна игра на минуту — очки с множителем серии, график двигается, итог и рекорд', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await unitDone(page);
  await page.clock.install();
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sd-g');
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'rush');
  await expect(ex.getByTestId('game')).toHaveAttribute('data-phase', 'ready');
  await expect(ex.getByTestId('game')).toContainText('зачёт — когда верных на 8 больше, чем ошибок');
  // до таймера — «Как играть» и пробный заголовок без очков: ответ с объяснением
  await expect(ex.getByTestId('game-howto')).toContainText('Как играть');
  await expect(ex.getByTestId('game-start')).toHaveText(/Сразу к игре/);
  const trialSide = await ex.locator('.lp-trial-card').getAttribute('data-answer');
  await ex.locator(`[data-trial="${trialSide}"]`).click();
  await expect(ex.getByTestId('game-trial-result')).toHaveAttribute('data-ok', 'true');
  await expect(ex.getByTestId('game-start')).toHaveText(/Старт/);
  await ex.getByTestId('game-start').click();
  const card = ex.getByTestId('game-card');
  // четыре верных, ошибка, шесть верных: 10+10+10+20, серия сброшена, 10+10+10+20+20+20
  for (let i = 0; i < 11; i += 1) {
    const side = await card.getAttribute('data-answer');
    await ex.locator(`button[data-side="${i === 4 ? (side === 'up' ? 'down' : 'up') : side}"]`).click();
    if (i === 2) await expect(ex.getByTestId('game-combo')).toHaveText('×2');
    if (i === 4) await expect(ex.getByTestId('game-combo')).toHaveCount(0);
  }
  await expect(ex.getByTestId('game-score')).toHaveText('140');
  // до зачёта — на виду: 10 верных и 1 ошибка — чистых 9, зачёт есть
  await expect(ex.getByTestId('game-pass')).toHaveAttribute('data-left', '0');
  await expect(ex.getByTestId('game-pass')).toContainText('зачёт есть');
  // каждая карточка двигает кривую: подпись сдвига и история цены
  await expect(ex.getByTestId('game-effect')).toBeVisible();
  await expect(ex.getByTestId('price-ticker')).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(ex.getByTestId('game-final')).toContainText('140');
  await expect(ex.getByTestId('game-final')).toContainText('верно 10 из 11');
  await expect(ex.getByTestId('game-verdict')).toHaveText('Игра засчитана: верных 10, ошибок 1');
  await expect(page.getByTestId('game-result')).toContainText('Верно 10 из 11 · 140 очков');
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'true');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('lesson-result')).toContainText('Игра засчитана: верных 10, ошибок 1.');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();

  // заново: рекорд на старте; три верных — меньше планки, игра не засчитана
  await startLesson(page, 'sd-g');
  await expect(ex.getByTestId('game-best')).toContainText('рекорд: 140');
  await ex.getByTestId('game-start').click();
  for (let i = 0; i < 3; i += 1) await ex.locator(`button[data-side="${await card.getAttribute('data-answer')}"]`).click();
  await expect(ex.getByTestId('game-pass')).toHaveText('до зачёта: 5');
  await page.clock.fastForward(61_000);
  await expect(ex.getByTestId('game-final')).toContainText('верно 3 из 3');
  await expect(ex.getByTestId('game-verdict')).toContainText('Зачёта нет, не хватило 5');
  await expect(page.getByTestId('game-result')).toContainText('верных минус ошибок — не меньше 8');
  // плашка не говорит «не засчитано»: урок с игрой будет пройден в любом случае
  await expect(page.getByTestId('game-lesson-note')).toContainText('Урок это не отменяет');
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
  expect(errors).toEqual([]);
});

test('мини-игра: каждая новость — один раз; колода разобрана раньше времени — секунды в запасе идут в очки', async ({ page }) => {
  await withTestFlag(page);
  await unitDone(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sd-g');
  const ex = page.getByTestId('ex');
  await expect(ex.getByTestId('game-howto')).toContainText('каждая по одному разу, всего 16');
  await ex.getByTestId('game-start').click();
  const card = ex.getByTestId('game-card');
  const seen = [];
  for (let i = 0; i < 16; i += 1) {
    seen.push(await card.innerText());
    await ex.locator(`button[data-side="${await card.getAttribute('data-answer')}"]`).click();
  }
  expect(new Set(seen).size).toBe(16);
  await expect(ex.getByTestId('game-final')).toContainText('Все новости разобраны!');
  await expect(ex.getByTestId('game-final')).toContainText('верно 16 из 16');
  await expect(ex.getByTestId('game-time-bonus')).toContainText('в запасе');
  // 16 верных подряд — 460 очков, сверху — бонус за секунды
  expect(Number(await ex.locator('.lp-game-final .ds-num').innerText())).toBeGreaterThan(460);
  expect(errors).toEqual([]);
});

test('лента «История»: сообщения по одному, вопросы между ними, прошлое остаётся в ленте', async ({ page }) => {
  await withTestFlag(page);
  await unitDone(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sd-s1');
  const feed = page.getByTestId('story-feed');
  await expect(feed).toBeVisible();
  // первое сообщение — от героини, с портретом; «Дальше» открывает следующее, прошлые остаются
  await expect(page.getByTestId('lesson-card').getByTestId('portrait')).toHaveAttribute('data-who', 'masha');
  await expect(feed.getByTestId('feed-msg')).toHaveCount(0);
  let msgs = 0;
  while (await page.getByTestId('lesson-card').isVisible()) {
    await page.getByTestId('lesson').locator('.ln-foot button').click();
    msgs += 1;
    await expect(feed.getByTestId('feed-msg')).toHaveCount(msgs);
  }
  // вопрос — прямо в ленте, ответ и плашка — там же; после «Дальше» вопрос остаётся в ленте
  await expect(feed.getByTestId('ex')).toBeVisible();
  await answerExercise(page);
  // плашка ответа — в нижней панели урока, её видно без прокрутки
  await expect(page.getByTestId('lesson-foot').getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'true');
  await expect(page.getByTestId('lesson-foot').getByTestId('ex-feedback')).toBeInViewport();
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(feed.getByTestId('feed-q')).toHaveCount(1);
  await expect(feed.getByTestId('feed-msg')).toHaveCount(msgs);
  // отвеченный вопрос — репликой: ответ ученика с галочкой, без печати и без невыбранных вариантов
  await expect(feed.getByTestId('feed-q').getByTestId('feed-answer')).toHaveAttribute('data-ok', 'true');
  await expect(feed.locator('.ds-answer-stamp')).toHaveCount(0);
  await expect(feed.getByTestId('feed-q').locator('.ds-opt')).toHaveCount(0);
  // дальше — новые сообщения после вопроса; лента сама доехала до низа — новое сообщение видно целиком
  await expect(page.getByTestId('lesson-card')).toBeVisible();
  await expect.poll(() => page.locator('.ln-body').evaluate((sc) => {
    const card = sc.querySelector('[data-testid="lesson-card"]').getBoundingClientRect(); const box = sc.getBoundingClientRect();
    return card.bottom <= box.bottom + 1 || card.top <= box.top + 14;
  })).toBe(true);
  // шапка «Вестника» — без значка, название по центру
  await expect(feed.locator('.fd-mast-name svg')).toHaveCount(0);
  const mast = await feed.locator('.fd-mast-name').evaluate((el) => { const p = el.parentElement.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(el); const t = r.getBoundingClientRect(); return [t.left - p.left, p.right - t.right]; });
  expect(Math.abs(mast[0] - mast[1])).toBeLessThan(6);
  // портрет — погрудный, в медальоне: тело обрезано кругом, а не прямой линией
  await expect(feed.getByTestId('portrait').first().locator('clipPath')).toHaveCount(1);
  await expectNoSidewaysScroll(page);
  // второй вопрос встаёт в ленту под новыми сообщениями, первый — выше
  await passCards(page);
  await answerExercise(page);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(feed.getByTestId('feed-q')).toHaveCount(2);
  // письменный вопрос в конце истории можно пропустить
  const { kinds } = await playLesson(page, { skipOpen: true });
  expect(kinds.has('open')).toBe(true);
  expect(errors).toEqual([]);
});

test('лента «Слушай»: текст скрыт, «прослушать» читает сообщение с подсветкой, после вопроса текст открыт', async ({ page }) => {
  await withTestFlag(page);
  await unitDone(page);
  // русский голос браузера — подмена: запоминаем, что читали, и сразу «дочитываем»
  await page.addInitScript(() => {
    window.__spoken = []; window.__heard = [];
    // три русских голоса: у ведущей Лады — женский, со своим темпом и высотой
    const voices = [{ lang: 'ru-RU', name: 'Тест', default: true }, { lang: 'ru-RU', name: 'Milena' }, { lang: 'ru-RU', name: 'Yuri' }];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, addEventListener() {}, removeEventListener() {}, cancel() {},
      speak(u) { window.__spoken.push(u.text); window.__heard.push({ name: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch }); setTimeout(() => { if (u.onboundary) u.onboundary({ charIndex: 0 }); }, 50); setTimeout(() => u.onend && u.onend(), 400); },
    } });
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sd-l-radio');
  const feed = page.getByTestId('listen-card');
  await expect(feed).toHaveAttribute('data-voice', 'on');
  const live = page.getByTestId('lesson-card');
  // новое сообщение эфира читается само; текст скрыт до «показать текст»
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__spoken[0])).toContain('морозы');
  // эфир ведёт Лада: её голос (женский), темп и высота; под эфиром — подпись про синтез
  expect(await page.evaluate(() => window.__heard[0])).toEqual({ name: 'Milena', rate: 1.04, pitch: 1.12 });
  await expect(feed.getByTestId('voice-caption')).toHaveText('голос синтезирован браузером');
  await expect(live.getByTestId('feed-hidden')).toBeVisible();
  await live.getByTestId('feed-toggle').click();
  await expect(live.getByTestId('listen-text')).toContainText('морозы');
  await live.getByTestId('feed-toggle').click();
  await expect(live.getByTestId('feed-hidden')).toBeVisible();
  // «прослушать» ещё раз — то же сообщение (пока сообщение звучит, та же кнопка его останавливает)
  await expect(live.getByTestId('feed-play')).toHaveAttribute('data-playing', 'false');
  await live.getByTestId('feed-play').click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(1);
  while (await live.isVisible()) await page.getByTestId('lesson').locator('.ln-foot button').click();
  // вопрос про то, что прозвучало; после ответа текст прошлых сообщений открыт сам
  await expect(feed.getByTestId('feed-msg').first().getByTestId('feed-hidden')).toBeVisible();
  await answerExercise(page);
  await expect(feed.getByTestId('feed-msg').first().getByTestId('listen-text')).toContainText('морозы');
  // прошлое сообщение можно переслушать
  const before = await page.evaluate(() => window.__spoken.length);
  await feed.getByTestId('feed-msg').first().getByTestId('feed-play').click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBe(before + 1);
  // «Не могу слушать»: голос выключен на час — текст открыт, эфир сам не читается; «Включить звук» возвращает
  await feed.getByTestId('no-listen').click();
  await expect(feed).toHaveAttribute('data-voice', 'off');
  await expect(feed.getByTestId('no-listen-on')).toContainText('Звук выключен на час');
  const until = await page.evaluate(() => Number(localStorage.getItem('ems-no-listen-until')));
  expect(until - Date.now()).toBeGreaterThan(50 * 60 * 1000);
  const spoken = await page.evaluate(() => window.__spoken.length);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('lesson-card').getByTestId('listen-text')).toBeVisible();
  await expect(page.getByTestId('lesson-card').getByTestId('feed-hidden')).toHaveCount(0);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(spoken);
  await feed.getByTestId('no-listen-off').click();
  await expect(feed).toHaveAttribute('data-voice', 'on');
  expect(await page.evaluate(() => localStorage.getItem('ems-no-listen-until'))).toBe(null);
  expect(errors).toEqual([]);
});

test('«Слушай» с записями (FreeTTS): сюжет играет запись с подсветкой, не загрузилась — читает браузер', async ({ page }) => {
  await withTestFlag(page);
  await unitDone(page);
  await page.addInitScript(() => {
    // каждый сюжет считается записанным; проигрыватель — подмена: запоминает файл, «играет» и доигрывает
    localStorage.setItem('ems-voice-test', '1');
    window.__spoken = []; window.__tapes = []; window.__tapeFail = false;
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ lang: 'ru-RU', name: 'Milena' }], addEventListener() {}, removeEventListener() {}, cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 300); },
    } });
    // ход записи двигает сам тест: window.__tapeAt(доля) — «прослушано столько», 1 — запись кончилась
    window.Audio = class {
      constructor() { this.src = ''; this.currentTime = 0; this.duration = 0; window.__tape = this; }
      pause() {}
      play() {
        window.__tapes.push(this.src);
        if (window.__tapeFail) { setTimeout(() => this.onerror && this.onerror(), 20); return Promise.resolve(); }
        this.duration = 2; this.currentTime = 0;
        return Promise.resolve();
      }
    };
    window.__tapeAt = (f) => { const a = window.__tape; a.currentTime = f * a.duration; if (f >= 1) a.onended(); else a.ontimeupdate(); };
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sd-l-radio');
  const feed = page.getByTestId('listen-card');
  const live = page.getByTestId('lesson-card');
  await expect(feed).toHaveAttribute('data-voice', 'on');
  // новый сюжет играет запись ведущей: файл /voice/host-<7 знаков>.mp3; голос браузера молчит
  await expect.poll(() => page.evaluate(() => window.__tapes.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__tapes[0])).toMatch(/\/voice\/host-[0-9a-z]{7}\.mp3$/);
  await expect(feed.getByTestId('voice-caption')).toHaveText('голос синтезирован');
  await expect(live.getByTestId('feed-hidden')).toBeVisible();
  // запись идёт — подсвечено слово под голосом: к середине записи — слово из середины текста; кончилась — подсветки нет
  await live.getByTestId('feed-toggle').click();
  await expect(live.locator('.fd-word.on')).toHaveCount(1);
  await expect(live.locator('.fd-word').first()).toHaveClass(/\bon\b/);
  await page.evaluate(() => window.__tapeAt(0.5));
  const words = await live.locator('.fd-word').count();
  const at = await live.locator('.fd-word').evaluateAll((els) => els.findIndex((e) => e.classList.contains('on')));
  expect(at).toBeGreaterThan(words * 0.3);
  expect(at).toBeLessThan(words * 0.7);
  // «остановить» посреди сюжета (жалоба «не могу выключить звук»): подсветка гаснет, ход записи слова больше
  // не двигает; касание снова — сюжет сначала
  await expect(live.getByTestId('feed-play')).toHaveAttribute('data-playing', 'true');
  await live.getByTestId('feed-play').click();
  await expect(live.getByTestId('feed-play')).toHaveAttribute('data-playing', 'false');
  await expect(live.locator('.fd-word')).toHaveCount(0);
  await page.evaluate(() => window.__tapeAt(0.6));
  await expect(live.locator('.fd-word')).toHaveCount(0);
  const played = await page.evaluate(() => window.__tapes.length);
  await live.getByTestId('feed-play').click();
  await expect.poll(() => page.evaluate(() => window.__tapes.length)).toBe(played + 1);
  await expect(live.locator('.fd-word').first()).toHaveClass(/\bon\b/);
  await page.evaluate(() => window.__tapeAt(1));
  await expect(live.locator('.fd-word')).toHaveCount(0);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(0);
  // запись не загрузилась — тот же сюжет читает голос браузера
  await page.evaluate(() => { window.__tapeFail = true; });
  await live.getByTestId('feed-play').click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBe(1);
  expect(await page.evaluate(() => window.__spoken[0])).toContain('морозы');
  // больше эту запись не просим: следующее «слушать» сразу читает браузер
  const tapes = await page.evaluate(() => window.__tapes.length);
  await expect(live.getByTestId('feed-play')).toHaveAttribute('data-playing', 'false');
  await live.getByTestId('feed-play').click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBe(2);
  expect(await page.evaluate(() => window.__tapes.length)).toBe(tapes);
  expect(errors).toEqual([]);
});

test('сообщить об ошибке: флажок на упражнении, причина и контекст уходят на сервер, урок продолжается', async ({ page, context }) => {
  await withTestFlag(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const sent = [];
  const reports = [
    { id: 'r1', at: Date.now() - 60000, login: 'kate', name: 'Катя', status: 'new', reason: 'answer', comment: 'должно быть 20', context: { exercise: 'sd-l1:x', answer: '25', correct: '20', build: 'abc' } },
    { id: 'r2', at: Date.now() - 120000, login: 'ivan', name: 'Иван', status: 'new', reason: 'typo', comment: '', context: { screen: 'step', lesson: 'sd-i1' } },
  ];
  const api = (req) => {
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    if (req.url().includes('/api/reports') && body) {
      if (body.action === 'send') { sent.push(body); return JSON.stringify({ ok: true, id: 'x' }); }
      if (body.action === 'me') return JSON.stringify({ owner: true });
      if (body.action === 'list') return JSON.stringify({ reports: body.status === 'done' ? [] : reports, counts: { new: 2, done: 0 } });
    }
    // аналитика: события уходят без логина и сессии; отчёт — владельцу
    if (req.url().includes('/api/events') && body) {
      if (body.action === 'report') {
        const day = (k) => new Date(Date.now() - k * 86400000).toISOString().slice(0, 10);
        const daily = Array.from({ length: 30 }, (_, i) => ({ day: day(29 - i), welcome_start: i % 3, goal_done: 0, lesson_start: 4 + (i % 5), lesson_done: 2 + (i % 4), register_done: i % 7 === 0 ? 1 : 0, return_d1: 0, return_d7: 0, ex_first_try_ok: 10 + i, ex_first_try_fail: 5 }));
        return JSON.stringify({ funnel: [{ event: 'welcome_start', label: 'Нажали «Начать»', count: 40 }, { event: 'first_lesson_done', label: 'Прошли первый урок', count: 25 }],
          hardest: [{ id: 'sd-q2', total: 12, correct: 3, share: 0.25 }], daily,
          features: [{ event: 'shop_open', label: 'Лавка', now: 12, prev: 8, today: 2, month: 40 }, { event: 'garden_open', label: 'Сад Инфли', now: 0, prev: 0, today: 0, month: 0 }],
          totals: { lessons: { now: 30, prev: 20, today: 4 }, starts: { now: 45, prev: 40, today: 6 }, accounts: { now: 3, prev: 4, today: 0 }, newcomers: { now: 9, prev: 7, today: 1 }, accuracy: { now: 0.7, prev: 0.65 } },
          lessons: [{ id: 'sd-i1', start: 20, done: 15, finish: 0.75, minutes: 4.2 }, { id: 'sd-l1', start: 8, done: 2, finish: 0.25, minutes: 6 }],
          reports: { fresh: 2, byReason: { answer: 1, typo: 1 } } });
      }
      events.push(body);
    }
    return '{}';
  };
  const events = [];
  const { errors } = await openApp(page, '/', api, { tab: 'path' });
  await startLesson(page, 'sc-i1');
  await page.getByRole('button', { name: 'Понятно' }).click();
  const ex = page.getByTestId('ex');
  const exId = await ex.getAttribute('data-kind');
  await answerExercise(page, { wrong: true });
  // флажок есть и после ответа
  await ex.getByTestId('report-flag').click();
  const sheet = page.getByTestId('report-sheet');
  await expect(sheet.getByTestId('report-send')).toBeDisabled();
  await sheet.locator('[data-reason="accept"]').click();
  // выбранная причина видна: подсвечена и с галочкой, остальные — нет
  const bg = (r) => sheet.locator(`[data-reason="${r}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(sheet.locator('[data-reason="accept"]')).toHaveAttribute('aria-checked', 'true');
  expect(await bg('accept')).not.toBe(await bg('typo'));
  // у каждой причины круглый переключатель; выбранная — с точкой внутри
  await expect(sheet.locator('[data-reason] .rp-radio')).toHaveCount(await sheet.locator('[data-reason]').count());
  expect(await sheet.locator('[data-reason="accept"] .rp-radio').evaluate((el) => getComputedStyle(el, '::after').content)).not.toBe('none');
  expect(await sheet.locator('[data-reason="typo"] .rp-radio').evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
  // нажатие на нижнюю причину не сдвигает верхние: шторка прижата к низу, а размеры кнопки при нажатии не меняются
  const reasons = sheet.locator('[data-reason]');
  const firstTop = async () => (await reasons.first().boundingBox()).y;
  const before = await firstTop();
  const last = await reasons.last().boundingBox();
  await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2);
  await page.mouse.down();
  expect(Math.abs((await firstTop()) - before)).toBeLessThan(0.5);
  await page.mouse.up();
  await sheet.locator('[data-reason="accept"]').click();
  await sheet.getByLabel(/Комментарий/).fill('мне кажется, мой ответ верный');
  await sheet.getByTestId('report-send').click();
  await expect(page.getByTestId('report-thanks')).toContainText('Спасибо! Посмотрим');
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ reason: 'accept', comment: 'мне кажется, мой ответ верный', session: 't' });
  expect(sent[0].context).toMatchObject({ screen: 'exercise', kind: exId, lesson: 'sc-i1', unit: 'scarcity' });
  expect(sent[0].context.exercise).toBeTruthy();
  expect(sent[0].context.answer).toBeTruthy();
  expect(sent[0].context.correct).toBeTruthy();
  expect(sent[0].context.build).toBeTruthy();
  expect(sent[0].context.device).toBeTruthy();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  // урок — с того же места: плашка ответа на месте
  await expect(page.getByTestId('report-sheet')).toHaveCount(0);
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
  // флажок — и на шаге «Знакомства», и в учебнике, и на итогах
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByTestId('lesson-card').getByTestId('report-flag')).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await page.getByRole('dialog', { name: 'Выйти из урока?' }).getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByTestId('unit-guide').first().click();
  await expect(page.getByTestId('learn-book').getByTestId('report-flag').first()).toBeVisible();
  // у каждой задачи учебника — своя кнопка «Сообщить об ошибке»
  expect(await page.getByTestId('learn-book').getByTestId('tb-report').count()).toBeGreaterThanOrEqual(3);
  // флажок страницы учебника — про теорию, а не про ответ
  await page.getByTestId('learn-book').getByTestId('report-flag').first().click();
  await expect(page.getByTestId('report-sheet').locator('[data-reason="theory"]')).toBeVisible();
  await expect(page.getByTestId('report-sheet').locator('[data-reason="accept"]')).toHaveCount(0);
  await page.getByTestId('report-sheet').getByRole('button', { name: 'Закрыть' }).click();
  // выделили фразу в тексте — внизу кнопка «Сообщить об ошибке в выделенном», цитата уходит с сообщением
  const quote = await page.getByTestId('learn-book').evaluate((root) => {
    const p = [...root.querySelectorAll('.ln-textbook p')].find((x) => x.textContent.trim().length > 40);
    const node = [...p.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim().length > 12);
    const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, 12);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return sel.toString().replace(/\s+/g, ' ').trim();
  });
  await page.getByTestId('report-quote-btn').click();
  await expect(page.getByTestId('report-quote')).toContainText(quote);
  await page.getByTestId('report-sheet').locator('[data-reason="unclear"]').click();
  await page.getByTestId('report-send').click();
  await expect(page.getByTestId('report-thanks')).toBeVisible();
  expect(sent[1]).toMatchObject({ reason: 'unclear', context: { screen: 'textbook', quote } });
  await page.getByRole('button', { name: 'Продолжить' }).click();
  // после жалобы выделение снято — старая цитата не прилипает; выделение на кнопке (браузер сам выделяет слово от
  // двойного нажатия) — не цитата (пункт владельца 08.11, вечер: «показывается текст, что я не выделял»)
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
  await expect(page.getByTestId('report-quote-btn')).toHaveCount(0);
  await page.getByTestId('learn-book').evaluate((root) => {
    const b = [...root.querySelectorAll('.ln-textbook button')].find((x) => x.textContent.trim().length > 4);
    const r = document.createRange(); r.selectNodeContents(b);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await page.waitForTimeout(300);
  await expect(page.getByTestId('report-quote-btn')).toHaveCount(0);
  await page.evaluate(() => window.getSelection().removeAllRanges());

  // владелец: список сообщений, фильтр и «скопировать всё» — в настройках профиля
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await page.getByTestId('prof-reports').click();
  const view = page.getByTestId('reports');
  await expect(view.getByTestId('report-item')).toHaveCount(2);
  await view.getByTestId('reports-copy').click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Ошибка в ответе');
  expect(text).toContain('ответ ученика: 25');
  expect(text).toContain('правильный ответ: 20');
  expect(text).toContain('Опечатка');
  await view.locator('[data-filter="done"]').click();
  await expect(view.getByTestId('reports-empty')).toBeVisible();
  await view.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByTestId('settings')).toBeVisible();
  // аналитика без персональных данных: в событиях нет ни логина, ни сессии
  expect(events.some((e) => e.event === 'lesson_start' && e.lesson === 'sc-i1')).toBe(true);
  // шаг воронки «начали первый урок» — разовый, без id урока
  expect(events.filter((e) => e.event === 'first_lesson_start')).toEqual([{ event: 'first_lesson_start' }]);
  expect(events.some((e) => e.event === 'ex_first_try_fail' && e.exercise)).toBe(true);
  events.forEach((e) => { expect(e.session).toBeUndefined(); expect(e.login).toBeUndefined(); expect(e.playerId).toBeUndefined(); });
  await page.getByTestId('prof-analytics').click();
  const an = page.getByTestId('analytics');
  await expect(an.getByTestId('analytics-funnel').locator('[data-event]')).toHaveCount(2);
  // воронка с конверсией шага: 25 из 40 — 63%
  await expect(an.getByTestId('analytics-funnel').locator('[data-event="first_lesson_done"]')).toContainText('Прошли первый урок');
  await expect(an.getByTestId('analytics-funnel').locator('[data-event="first_lesson_done"]')).toContainText('63%');
  // разделы: устройств за неделю против прошлой — лавка +50%, сад не открывали
  await expect(an.getByTestId('analytics-features').locator('[data-event="shop_open"]')).toContainText('+50%');
  await expect(an.getByTestId('analytics-features').locator('[data-event="garden_open"]')).toContainText('—');
  await expect(an.getByTestId('analytics-hardest').locator('[data-exercise="sd-q2"]')).toContainText('25%');
  await expect(an.getByTestId('analytics-hardest').locator('[data-exercise="sd-q2"]')).toContainText('3 из 12');
  // сводка недели против прошлой: +50% уроков
  await expect(an.getByTestId('analytics-tile-lessons')).toContainText('+50%');
  await expect(an.getByTestId('analytics-tile-reports')).toContainText('2');
  // активность по дням: подсказка по наведению; уроки — популярные и «чаще бросают»
  await an.getByTestId('analytics-activity').locator('svg').hover({ position: { x: 200, y: 80 } });
  await expect(an.getByTestId('analytics-activity').locator('.an-tip')).toContainText('прошли');
  await expect(an.getByTestId('analytics-lessons').locator('tr[data-lesson]').first()).toHaveAttribute('data-lesson', 'sd-i1');
  await an.locator('[data-sort="drop"]').click();
  await expect(an.getByTestId('analytics-lessons').locator('tr[data-lesson]').first()).toHaveAttribute('data-lesson', 'sd-l1');
  await an.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByTestId('settings')).toBeVisible();
  expect(errors).toEqual([]);
});

// «Мир»: выключенная музыка остаётся выключенной после перезагрузки страницы
test('мир: выключенная музыка не включается после перезагрузки', async ({ page }) => {
  const { errors } = await openApp(page);
  const soundBtn = page.locator('button[title^="Музыка"]');
  await soundBtn.click();
  const row = page.locator('div', { has: page.locator('span', { hasText: /^Музыка$/ }) }).last();
  await row.getByRole('button', { name: 'вкл' }).click();
  await expect(row.getByRole('button', { name: 'выкл' })).toBeVisible();
  await gotoApp(page);
  await page.locator('button[title^="Музыка"]').click();
  const row2 = page.locator('div', { has: page.locator('span', { hasText: /^Музыка$/ }) }).last();
  await expect(row2.getByRole('button', { name: 'выкл' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('новые глаголы: «Откройте сами», живая модель на Пути, «Домино» в практике, копилка Инфли и цена отказа', async ({ page }) => {
  test.setTimeout(180_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum'];
    // sc-l1 пройден со слабой точностью: «рекомендуем» над ним висеть не должно
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: {
      lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), topics: { 'sc-l1': { n: 5, ok: 1 } }, coins: { '2026-01-01': 400 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const path = page.getByTestId('path');
  // «рекомендуем сейчас» — над следующей остановкой, а не над пройденным слабым уроком; слабое место — строкой
  await expect(path.getByTestId('path-rec')).toHaveCount(1);
  await expect(pathNode(page, 'sd-i1').locator('xpath=..').getByTestId('path-rec')).toHaveCount(1);
  await expect(path).toContainText('Слабое место');
  // живая модель юнита пока пуста: первая деталь — в первом уроке; на телефоне модель свёрнута строкой
  const fold = path.getByTestId('model-fold').first();
  if (await fold.isVisible()) { await expect(fold).toContainText('Соберётся по ходу юнита'); await fold.click(); }
  const model = path.locator('[data-testid=unit-model]').first();
  await expect(model).toHaveAttribute('data-open', '0');
  await expect(model.getByTestId('model-empty')).toContainText('Знакомство: спрос');

  // «Откройте сами» — первый шаг первого урока юнита, до карточки-идеи
  await startLesson(page, 'sd-i1');
  // урок — слой поверх страницы: страница под ним не прокручивается и не показывает свой ползунок
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
  const d = page.getByTestId('discover');
  await expect(d).toBeVisible();
  await expect(page.getByTestId('lesson-card')).toHaveAttribute('data-style', 'discover');
  await expect(page.getByTestId('discover-next')).toBeDisabled();
  // одна и та же цена дважды — одна точка исследования, дальше не пускает
  for (let k = 0; k < 2; k += 1) {
    await d.getByTestId('discover-price').fill('20');
    await expect(d.getByTestId('discover-open')).toBeEnabled({ timeout: 4000 });
    await d.getByTestId('discover-open').click();
  }
  await expect(d).toHaveAttribute('data-distinct', '1');
  await expect(d.getByTestId('discover-point')).toHaveCount(2);
  await expect(d.getByTestId('discover-line')).toHaveCount(0);
  await expect(page.getByTestId('discover-next')).toBeDisabled();
  await expect(page.getByTestId('street')).toBeVisible();
  // ещё четыре разные цены — проступает линия, Инфля называет её, можно дальше
  await playDiscover(page);
  await expect(page.getByTestId('lesson-card')).not.toHaveAttribute('data-style', 'discover');
  await expect(page.getByTestId('lesson-card').getByText('Спрос — это зависимость')).toBeVisible();
  await playLesson(page);
  await expect(page.getByTestId('result-model')).toContainText('«Спрос»');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');

  // модель на Пути: деталь открыта, на карте счётчика модели нет (лишний шум); закрытые — «откроется в уроке …»
  await expect(model).toHaveAttribute('data-open', '1');
  await expect(path.getByTestId('atlas-model')).toHaveCount(0);
  await expect(model.locator('[data-part="demand"]')).toHaveAttribute('data-open', 'true');
  await model.locator('[data-part="income"]').click();
  await expect(model.getByTestId('model-part-note')).toContainText('Откроется в уроке «Спрос: закон и сдвиги»');
  await model.locator('[data-part="elastic"]').click();
  await expect(model.getByTestId('model-part-note')).toContainText('юнит «Эластичность»');
  await model.getByTestId('model-price').fill('30');
  await expect(model.getByTestId('model-readout')).toContainText('При цене 30 кр. купят 30');
  await expect(model.getByTestId('model-stats')).toContainText('30');
  // ничего не трогали — «Вернуть как было» не нужна; сдвинули цену — появилась
  await expect(model.getByTestId('model-reset')).toBeVisible();
  await model.getByTestId('model-reset').click();
  await expect(model.getByTestId('model-readout')).toContainText('При цене 20 кр. купят 60');
  await expect(model.getByTestId('model-reset')).toHaveCount(0);

  // «Домино» в практике — всегда: неверная карточка роняет домино с разбором, задание не засчитано
  await startLesson(page, 'sd-l1');
  let met = false;
  for (let i = 0; i < 40 && !(await page.getByTestId('lesson-result').isVisible()); i += 1) {
    await passCards(page);
    const ex = page.getByTestId('ex');
    if (!met && await ex.getAttribute('data-kind') === 'domino') {
      met = true;
      const dom = ex.getByTestId('domino');
      const chain = JSON.parse(await ex.getAttribute('data-answer'));
      await expect(dom.getByTestId('domino-headline')).toHaveText('ЗАРПЛАТЫ В ВЕЛЕГРАДЕ ВЫРОСЛИ НА 10%');
      await expect(dom.getByTestId('domino-slot')).toHaveCount(chain.length);
      await expect(page.getByRole('button', { name: 'Проверить' })).toHaveCount(0);
      await dom.locator(`[data-key="${chain[0]}"]`).click();
      await expect(dom.locator('[data-testid="domino-slot"][data-on="true"]')).toHaveCount(1);
      // через звено — «есть в цепочке, но позже»
      await dom.locator(`[data-key="${chain[2]}"]`).click();
      await expect(dom.getByTestId('domino-why')).toContainText('позже');
      await dom.locator('[data-testid="domino-card"][data-key^="f"]').first().click();
      await expect(dom).toHaveAttribute('data-falls', '2');
      await expect(dom.locator('[data-testid="domino-card"][data-key^="f"]:disabled')).toHaveCount(1);
      for (const k of chain.slice(1)) await dom.locator(`[data-key="${k}"]`).click();
      // собранная цепочка — задание выполнено, но не с первого раза: без «Правильно: …» с той же цепочкой
      await expect(dom.getByTestId('domino-done')).toHaveText('Собрано, было падений: 2');
      await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'true');
      await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-partial', 'true');
      await expect(page.getByTestId('ex-feedback')).not.toContainText('Правильно:');
      await expect(page.getByTestId('ex-why')).toContainText('Домино падало 2 раза');
      // сцена ожила: спрос сдвинулся вправо
      await expect(dom.getByTestId('domino-scene')).toHaveAttribute('data-da', '24');
    } else await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(met, 'в практике sd-l1 не встретилось «Домино»').toBe(true);
  await expect(page.getByTestId('lesson-result')).toBeVisible();
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();

  // лавка: под ценой — цена отказа; копилка — положить, забрать раньше (процент сгорает)
  await openTab(page, 'shop');
  const shop = page.getByTestId('shop');
  await expect(shop.getByTestId('shop-forgone').first()).toHaveText(/≈ \d+ урок.* · копилка дала бы \+\d+/);
  await shopTab(page, 'useful');
  await expect(shop.getByTestId('shop-freeze')).toContainText('Страховка серии');
  const piggy = shop.getByTestId('shop-piggy');
  await expect(piggy).toHaveAttribute('data-open', 'false');
  const before = Number((await shop.getByTestId('shop-balance').innerText()).match(/\d+/)[0]);
  await piggy.getByTestId('piggy-amount').fill('100');
  await expect(piggy.getByTestId('piggy-chart')).toBeVisible();
  // ставка недели — на карточке копилки; честно про проценты (годовые простыми и рост со сложным; рядом обычные для вклада 8%) — свёрнуто
  await expect(piggy.getByTestId('rate-week')).toBeVisible();
  await piggy.getByTestId('piggy-real').locator('summary').click();
  await expect(piggy.getByTestId('piggy-real')).toContainText(/\d+% годовых простыми, а со сложным процентом деньги за год выросли бы примерно в [\d\s ,]+ раз/);
  await expect(piggy.getByTestId('piggy-real')).toContainText('обычные для вклада 8% годовых');
  await expect(piggy.getByTestId('piggy-real')).not.toContainText('реальные');
  await piggy.getByTestId('piggy-put').click();
  // вклад — под ставку этой недели
  await expect(shop.getByTestId('shop-msg')).toContainText(/Срочный вклад: 100 монет под \d+(,\d)?% в день\. Через 7 дней станет 1[0-2]\d\./);
  await expect(piggy.getByTestId('piggy-kind')).toContainText('срочный');
  await expect(piggy.getByTestId('piggy-add-form')).toHaveCount(0);
  await expect(piggy.getByTestId('piggy-rate')).toHaveText(await piggy.getByTestId('rate-week-value').innerText() + ' в день');
  await expect(shop.getByTestId('shop-balance')).toContainText(String(before - 100));
  await expect(piggy.getByTestId('piggy-state')).toContainText('День 0 из 7');
  await piggy.getByTestId('piggy-take').click();
  await expect(shop.getByTestId('shop-msg')).toContainText('проценты не успели набежать');
  await expect(shop.getByTestId('shop-balance')).toContainText(String(before));
  // пополняемый вклад: ставка ниже, докладывать можно в любой день
  await piggy.getByTestId('piggy-kind-topup').click();
  await piggy.getByTestId('piggy-amount').fill('50');
  await piggy.getByTestId('piggy-put').click();
  await expect(shop.getByTestId('shop-msg')).toContainText('Пополняемый вклад: 50 монет');
  await expect(piggy.getByTestId('piggy-kind')).toContainText('пополняемый');
  await piggy.getByTestId('piggy-add-form').locator('input').fill('20');
  await piggy.getByTestId('piggy-add').click();
  await expect(shop.getByTestId('shop-msg')).toContainText('Пополнено на 20 монет');
  await expect(piggy.getByTestId('piggy-amount-in')).toHaveText('70');
  // пополнение на графике — ступенька с подписью
  await expect(piggy.getByTestId('piggy-step')).toHaveText('+20');
  await expect(shop.getByTestId('shop-balance')).toContainText(String(before - 70));
  await piggy.getByTestId('piggy-take').click();
  await expect(shop.getByTestId('shop-balance')).toContainText(String(before));
  // вклад, пролежавший неделю: забрать с процентами
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    p.learn.piggy = { ...p.learn.piggy, [Date.now() - 8 * 86400000]: 100 };
    localStorage.setItem('ems-textbook-v1', JSON.stringify(p));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'shop');
  // созревший вклад — зелёная точка на вкладке «Полезное»
  await expect(page.getByTestId('shop-tabs').locator('[data-tab="useful"] .sh-dot')).toBeVisible();
  await shopTab(page, 'useful');
  await expect(page.getByTestId('shop-piggy').getByTestId('piggy-state')).toContainText('срок вышел');
  await page.getByTestId('shop-piggy').getByTestId('piggy-take').click();
  await expect(page.getByTestId('shop-msg')).toContainText(/Забрано 1[0-2]\d монет[аы]? — с процентами за неделю\./);
  // своя анимация «забрать»: свинка встряхивается, монеты вылетают, всплывает «+N»; потом всё уходит
  const art = page.getByTestId('shop-piggy').getByTestId('piggy-art');
  await expect(art).toHaveAttribute('data-taking', 'true');
  await expect(art.getByTestId('piggy-plus')).toHaveText(/^\+1[0-2]\d$/);
  await expect(art.locator('.rw-pig-out:not(.lost)')).not.toHaveCount(0);
  await expect(art.getByTestId('piggy-plus')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('время урока — только когда ученик на месте: три часа паузы не попадают в «Время»', async ({ page }) => {
  await page.clock.install();
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  // ученик ушёл: вкладка открыта, но три часа ни касания
  await page.clock.fastForward(3 * 3600 * 1000);
  await playLesson(page);
  await expect(page.getByTestId('lesson-result')).toBeVisible();
  const [mm] = (await page.getByTestId('result-time').locator('.v').innerText()).split(':').map(Number);
  expect(mm).toBeLessThan(10);
  expect(errors).toEqual([]);
});

test('«Слушай» можно пропустить с билета урока: следующий урок открыт, пропущенный — с отметкой', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'supply-demand');
  await expect(pathNode(page, 'sd-g')).toHaveAttribute('data-state', 'locked');
  await pathNode(page, 'sd-l-radio').click();
  const sheet = page.getByTestId('lesson-sheet');
  await sheet.getByTestId('lesson-skip').click();
  await expect(sheet).toHaveCount(0);
  await expect(pathNode(page, 'sd-l-radio')).toHaveAttribute('data-skipped', 'true');
  await expect(pathNode(page, 'sd-g')).toHaveAttribute('data-state', 'open');
  // на билете пропущенного — «Начать» и пояснение, кнопки пропуска больше нет
  await pathNode(page, 'sd-l-radio').click();
  await expect(sheet.getByTestId('lesson-skipped-note')).toBeVisible();
  await expect(sheet.getByTestId('lesson-skip')).toHaveCount(0);
  await expect(sheet.getByTestId('lesson-start')).toHaveText(/^Начать/);
  expect(errors).toEqual([]);
});

test('урок на ПК: увеличен, только если окно высокое — под шаг не меньше места, чем на телефоне', async ({ page, isMobile }) => {
  test.skip(isMobile, 'увеличение урока — только на ПК');
  await withTestFlag(page);
  await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  const look = () => page.evaluate(() => { const b = document.querySelector('.ln-overlay .ln-body'); return { zoom: Number(getComputedStyle(b).zoom), h: b.getBoundingClientRect().height / Number(getComputedStyle(b).zoom) }; });
  // ноутбук 1920×1080 с масштабом Windows 125 %: окно 1536×730 — без увеличения, шрифт и так крупнее
  await page.setViewportSize({ width: 1536, height: 730 });
  let v = await look();
  expect(v.zoom).toBe(1);
  expect(v.h).toBeGreaterThan(540);
  // высокое окно — урок крупнее целиком, а под шаг по-прежнему не меньше, чем на телефоне
  for (const [width, height, zoom] of [[1440, 950, 1.2], [1920, 1080, 1.32]]) {
    await page.setViewportSize({ width, height });
    v = await look();
    expect(v.zoom).toBe(zoom);
    expect(v.h).toBeGreaterThan(540);
  }
});

test('урок на ПК: черновик на полях — включается кнопкой; ручка, маркер, ластик, отмена, «Стереть всё»', async ({ page, isMobile }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  const canvas = page.getByTestId('sketch-canvas');
  if (isMobile) {
    // телефон: полей у урока нет — и черновика нет
    await expect(canvas).toHaveCount(0);
    await expect(page.getByTestId('sketch-dock')).toHaveCount(0);
    return;
  }
  const lesson = page.getByTestId('lesson');
  const toggle = page.getByTestId('sketch-toggle');
  // непрозрачность холста в точке окна: есть ли там чернила
  const inkAt = (x, y) => page.evaluate(([px, py]) => {
    const c = document.querySelector('[data-testid=sketch-canvas]');
    const k = c.width / c.getBoundingClientRect().width;
    return c.getContext('2d').getImageData(Math.round(px * k), Math.round(py * k), 1, 1).data[3];
  }, [x, y]);
  const draw = async (pts) => {
    await page.mouse.move(...pts[0]); await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 8 });
    await page.mouse.up();
  };
  // режим выключен: обычный курсор, поле не рисует; кнопка «Черновик» и подсказка «Новое»
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('sketch-callout')).toBeVisible();
  await expect(lesson).not.toHaveAttribute('data-sketch', /./);
  await draw([[80, 300], [240, 300]]);
  await expect(canvas).toHaveAttribute('data-strokes', '0');
  // включили: сетка на полях, курсор-ручка, выбор запомнен на устройстве
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('sketch-callout')).toHaveCount(0);
  await expect(page.getByTestId('sketch-grid')).toHaveClass(/on/);
  await expect(lesson).toHaveAttribute('data-sketch', 'pen');
  expect(await page.evaluate(() => localStorage.getItem('ems-sketch-on'))).toBe('1');
  // левое поле: линия ручкой
  await draw([[80, 300], [240, 300]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  expect(await inkAt(160, 300)).toBeGreaterThan(200);
  expect(await inkAt(160, 330)).toBe(0);
  // протянуть мышью по тексту урока — не рисует: это урок, а не поле
  const card = await page.getByTestId('lesson-card').boundingBox();
  await draw([[card.x + 40, card.y + 60], [card.x + 200, card.y + 60]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  // маркер цвета юнита, толстый: полупрозрачная полоса
  await page.getByTestId('sketch-marker').click();
  await page.getByTestId('sketch-color-unit').click();
  await page.getByTestId('sketch-size-l').click();
  await expect(page.getByTestId('sketch-marker')).toHaveAttribute('aria-pressed', 'true');
  await expect(lesson).toHaveAttribute('data-sketch', 'marker');
  await draw([[80, 420], [240, 420]]);
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  const marker = await inkAt(160, 420);
  expect(marker).toBeGreaterThan(40);
  expect(marker).toBeLessThan(160);
  // ластик поперёк линии ручки; у ластика цветов нет — только толщина
  await page.getByTestId('sketch-eraser').click();
  await expect(page.getByTestId('sketch-color-ink')).toHaveCount(0);
  await draw([[160, 260], [160, 340]]);
  await expect(canvas).toHaveAttribute('data-strokes', '3');
  expect(await inkAt(160, 300)).toBe(0);
  expect(await inkAt(100, 300)).toBeGreaterThan(200);
  // «Отменить» и Ctrl+Z убирают последний штрих: линия снова целая, потом нет и маркера
  await page.getByTestId('sketch-undo').click();
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  expect(await inkAt(160, 300)).toBeGreaterThan(200);
  await page.keyboard.press('Control+z');
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  expect(await inkAt(160, 420)).toBe(0);
  // Ctrl+Y и «Повторить» возвращают отменённое по одному штриху; новый штрих стирает очередь повтора
  await page.keyboard.press('Control+y');
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  expect(await inkAt(160, 420)).toBeGreaterThan(40);
  await page.getByTestId('sketch-redo').click();
  await expect(canvas).toHaveAttribute('data-strokes', '3');
  await expect(page.getByTestId('sketch-redo')).toBeDisabled();
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  // «Стереть всё» — холст чист, «Вернуть» возвращает стёртое
  await page.getByTestId('sketch-clear').click();
  await expect(canvas).toHaveAttribute('data-strokes', '0');
  expect(await inkAt(160, 300)).toBe(0);
  await page.getByTestId('sketch-restore').click();
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  expect(await inkAt(160, 300)).toBeGreaterThan(200);
  // выключили: записи видны, но поле больше не рисует и курсор обычный
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(lesson).not.toHaveAttribute('data-sketch', /./);
  await draw([[80, 500], [240, 500]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  expect(await inkAt(160, 300)).toBeGreaterThan(200);
  expect(await page.evaluate(() => localStorage.getItem('ems-sketch-on'))).toBe(null);
  // урок идёт как обычно, черновик остаётся до конца урока
  await page.getByRole('button', { name: 'Понятно' }).click();
  await expect(page.getByTestId('ex')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  expect(errors).toEqual([]);
});

test('урок на ПК: «Предыдущая карточка» не закрывает черновик — поля видны и рисуют', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне черновика нет');
  await withTestFlag(page);
  await page.addInitScript(() => { localStorage.setItem('ems-sketch-on', '1'); localStorage.setItem('ems-sketch-tried', '1'); });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  const canvas = page.getByTestId('sketch-canvas');
  const draw = async (pts) => {
    await page.mouse.move(...pts[0]); await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 8 });
    await page.mouse.up();
  };
  await draw([[80, 300], [240, 300]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  await page.getByTestId('lesson').locator('.ln-foot button').last().click();
  await page.getByTestId('lesson-back').click();
  await expect(page.getByTestId('lesson-peek')).toBeVisible();
  // слой прошлой карточки прозрачен: поле с записью — не под бумагой; текущая карточка на это время спрятана
  const clear = await page.evaluate(() => {
    const peek = document.querySelector('.ln-peek'); const cur = document.querySelector('[data-testid=lesson] > .ln-body');
    return { bg: getComputedStyle(peek).backgroundColor, img: getComputedStyle(peek).backgroundImage, cur: getComputedStyle(cur).visibility };
  });
  expect(clear).toEqual({ bg: 'rgba(0, 0, 0, 0)', img: 'none', cur: 'hidden' });
  // и на полях можно писать дальше, пока смотрим назад
  await draw([[80, 420], [240, 420]]);
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  await page.getByTestId('lesson-peek-return').click();
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  expect(errors).toEqual([]);
});

test('антистресс: после четырёх уроков — знакомство, каналы и меню, растягивание, кружок, любой угол; скрыть и вернуть в настройках', async ({ page, isMobile }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    localStorage.setItem('ems-antistress-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(['sc-i1', 'sc-i1b', 'sc-l1'].map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const box = page.getByTestId('antistress');
  const exit = async () => {
    await page.getByRole('button', { name: 'Выйти из урока' }).click();
    await expect(page.getByTestId('lesson')).toHaveCount(0);
  };
  // три урока — окошка ещё нет
  await startLesson(page, 'sc-l1');
  await page.waitForTimeout(900);
  await expect(box).toHaveCount(0);
  await exit();
  // четвёртый пройден (середина первого юнита) — в следующем уроке окошко и знакомство
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    s.learn.lessons['sc-i2'] = { at: Date.now() - 3600000, runs: 1, best: 90 };
    localStorage.setItem('ems-textbook-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await startLesson(page, 'sc-l3');
  if (isMobile) {
    // телефон: полей у урока нет — и окошка нет
    await page.waitForTimeout(900);
    await expect(box).toHaveCount(0);
    expect(errors).toEqual([]);
    return;
  }
  const intro = page.getByTestId('antistress-intro');
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Антистресс');
  await expect(intro).not.toContainText(/фокус|стрим/i);
  await expect(box).toHaveAttribute('data-corner', 'br');
  await expect(box).toHaveAttribute('data-channel', 'ring');
  // окошко — на поле справа от урока, не на нём
  const col = await page.getByTestId('lesson').locator('.ln-body > .ln-inner').boundingBox();
  const vp = page.viewportSize();
  const b0 = await box.boundingBox();
  expect(b0.x).toBeGreaterThan(col.x + col.width);
  expect(b0.x + b0.width).toBeLessThanOrEqual(vp.width - 8);
  expect(b0.y + b0.height).toBeLessThanOrEqual(vp.height - 8);
  // Enter закрывает знакомство и не уходит уроку; второй раз его нет
  await page.keyboard.press('Enter');
  await expect(intro).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ems-antistress-intro'))).toBe('1');
  // канал живой: кадр за кадром картинка меняется
  const frame = () => page.getByTestId('antistress-canvas').evaluate((c) => c.toDataURL());
  const before = await frame();
  await expect.poll(frame).not.toBe(before);
  // стрелки — по кругу; название открывает меню всех каналов
  await page.getByTestId('antistress-next').click();
  await expect(box).toHaveAttribute('data-channel', 'rings');
  await expect(page.getByTestId('antistress-name')).toHaveText('Сквозь кольца');
  await page.getByTestId('antistress-name').click();
  const menu = page.getByTestId('antistress-menu');
  await expect(menu.getByTestId('antistress-pick')).toHaveCount(10);
  await menu.locator('[data-channel="sand"]').click();
  await expect(menu).toHaveCount(0);
  await expect(box).toHaveAttribute('data-channel', 'sand');
  // песок: зажали мышь на экране — сыплется оттуда, окошко при этом не едет
  const canvas = page.getByTestId('antistress-canvas');
  const cb = await canvas.boundingBox();
  // самая яркая точка около мыши: тёмный фон — около 120, песчинка — больше 300
  const sandAt = () => canvas.evaluate((c) => {
    const s = Math.round(c.width / 232 * 8); const d = c.getContext('2d').getImageData(Math.round(c.width * 0.2) - s, Math.round(c.height * 0.25) - s, 2 * s, 2 * s).data;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i] + d[i + 1] + d[i + 2]);
    return max;
  });
  expect(await sandAt()).toBeLessThan(250);
  await page.mouse.move(cb.x + cb.width * 0.2, cb.y + cb.height * 0.25);
  await page.mouse.down();
  await expect.poll(sandAt).toBeGreaterThan(300);
  await expect(box).toHaveAttribute('data-player', 'you');
  await page.mouse.up();
  await expect(box).toHaveAttribute('data-corner', 'br');
  // поп-ит: сам себя не жмёт первые секунды; пупырку в середине нажали — она ваша
  await page.getByTestId('antistress-next').click();
  await expect(box).toHaveAttribute('data-channel', 'pop');
  await expect(box).toHaveAttribute('data-player', 'bot');
  await page.mouse.click(cb.x + cb.width / 2, cb.y + (cb.height / 164) * 83);
  await expect(box).toHaveAttribute('data-player', 'you');
  // змейка: играет бот, кнопка — и змейка ваша, урок стрелку не получает
  await page.getByTestId('antistress-next').click();
  await page.getByTestId('antistress-next').click();
  await expect(box).toHaveAttribute('data-channel', 'snake');
  await expect(box).toHaveAttribute('data-player', 'bot');
  await box.hover();
  await page.getByTestId('antistress-pad-up').click();
  await expect(box).toHaveAttribute('data-player', 'you');
  // тетрис — тоже можно перехватить, и буквами WASD (здесь A — влево)
  await page.getByTestId('antistress-prev').click();
  await expect(box).toHaveAttribute('data-channel', 'tetris');
  await box.hover();
  await page.keyboard.press('a');
  await expect(box).toHaveAttribute('data-player', 'you');
  // пауза и снова
  await page.getByTestId('antistress-play').click();
  await expect(box).toHaveAttribute('data-playing', 'false');
  await page.getByTestId('antistress-play').click();
  await expect(box).toHaveAttribute('data-playing', 'true');
  // растянуть за внутренний уголок: окошко растёт к уроку, прижатый угол стоит, на урок не заходит
  const grip = await page.getByTestId('antistress-grip').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x - 400, grip.y - 400, { steps: 8 });
  await page.mouse.up();
  const b1 = await box.boundingBox();
  expect(b1.width).toBeGreaterThan(b0.width * 1.15);
  expect(Math.round(b1.x + b1.width)).toBe(Math.round(b0.x + b0.width));
  expect(b1.x).toBeGreaterThan(col.x + col.width);
  expect(b1.height).toBeLessThanOrEqual(vp.height * 0.62 + 1);
  expect(Number(await page.evaluate(() => localStorage.getItem('ems-antistress-size')))).toBeGreaterThan(1.1);
  // ○ — живой кружок; нажатие разворачивает в прежнем размере
  await page.getByTestId('antistress-min').click();
  await expect(box).toHaveAttribute('data-min', 'true');
  await expect.poll(async () => (await box.boundingBox()).width).toBeLessThan(70);
  await page.getByTestId('antistress-expand').click();
  await expect(box).toHaveAttribute('data-min', 'false');
  await expect.poll(async () => Math.round((await box.boundingBox()).width)).toBe(Math.round(b1.width));
  // перетащили за название — окошко встаёт в ближайший угол и помнит его, меню не открылось; черновик при этом не рисует
  const b = await box.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + 18);
  await page.mouse.down();
  await page.mouse.move(300, 200, { steps: 10 });
  await page.mouse.up();
  await expect(box).toHaveAttribute('data-corner', 'tl');
  await expect(page.getByTestId('antistress-menu')).toHaveCount(0);
  await expect.poll(async () => Math.round((await box.boundingBox()).x)).toBe(16);
  expect(await page.evaluate(() => localStorage.getItem('ems-antistress-corner'))).toBe('tl');
  await expect(page.getByTestId('sketch-canvas')).toHaveAttribute('data-strokes', '0');
  // × — скрыт, «Вернуть» — на месте
  await page.getByTestId('antistress-hide').click();
  await expect(box).toHaveCount(0);
  await expect(page.getByTestId('antistress-snack')).toContainText('вернуть можно в настройках');
  await page.getByTestId('antistress-restore').click();
  await expect(box).toHaveAttribute('data-channel', 'tetris');
  await page.getByTestId('antistress-hide').click();
  await expect(page.getByTestId('antistress-snack')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ems-antistress'))).toBe('off');
  await exit();
  // скрыт — в уроке его нет; включили в настройках — снова есть, без знакомства, в своём углу
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  const toggle = page.getByTestId('prof-antistress');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('settings').locator('[data-nav="back"]').click();
  await openTab(page, 'path');
  await startLesson(page, 'sc-l3');
  await expect(box).toBeVisible();
  await expect(box).toHaveAttribute('data-corner', 'tl');
  await page.waitForTimeout(900);
  await expect(intro).toHaveCount(0);
  expect(errors).toEqual([]);
});

/* ------------------------------ ВЫПУСК 25 ОКТЯБРЯ ------------------------------ */
test('урок: «Ошибка в разборе?» — под разбором в плашке ответа, открывает «Сообщить об ошибке»', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  await passCards(page);
  await answerExercise(page, { wrong: true });
  const bar = page.getByTestId('ex-feedback');
  await expect(bar).toHaveAttribute('data-ok', 'false');
  await page.getByTestId('report-explain').click();
  await expect(page.getByTestId('report-sheet')).toBeVisible();
  await page.getByTestId('report-sheet-back').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('report-sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('урок: назад ровно на одну карточку — прошлое задание с ответом и разбором, дальше назад нельзя', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  // на первом шаге назад некуда
  await expect(page.getByTestId('lesson-back')).toHaveCount(0);
  await page.getByTestId('lesson').locator('.ln-foot button').last().click();
  // со второго экрана — назад к прошлой карточке
  await expect(page.getByTestId('lesson-back')).toBeVisible();
  await answerExercise(page);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.getByTestId('lesson-back').click();
  const peek = page.getByTestId('lesson-peek');
  await expect(peek).toHaveAttribute('data-type', 'ex');
  await expect(page.getByTestId('lesson-peek-verdict')).toContainText('Вы ответили верно');
  // назад — касанием отрезка полосы прогресса перед текущим, без отдельной кнопки-стрелки в шапке
  expect(await page.getByTestId('lesson').locator('.ln-head [data-testid=lesson-progress]').count()).toBe(1);
  // и обратно к текущей — тоже сверху: текущий отрезок — стрелка «вперёд» (жалоба mw0f1tkr); «Вернуться» внизу тоже есть
  await expect(page.getByTestId('lesson-peek-return')).toBeVisible();
  await page.getByTestId('lesson-forward').click();
  await expect(peek).toHaveCount(0);
  await expect(page.getByTestId('lesson-forward')).toHaveCount(0);
  await page.getByTestId('lesson-back').click();
  await expect(peek).toBeVisible();
  // на прошлой карточке есть флажок «Сообщить об ошибке»: нажали «Дальше» на автомате — вернулись и пожаловались
  await peek.getByRole('button', { name: 'Сообщить об ошибке' }).click();
  await expect(page.getByTestId('report-sheet')).toBeVisible();
  await page.getByTestId('report-sheet-back').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('report-sheet')).toHaveCount(0);
  // пока смотрим назад, второго шага назад нет
  await expect(page.getByTestId('lesson-back')).toHaveCount(0);
  await page.getByTestId('lesson-peek-return').click();
  await expect(peek).toHaveCount(0);
  await expect(page.getByTestId('lesson-back')).toBeVisible();
  expect(errors).toEqual([]);
});

test('живая модель: знакомство — карточка «Новое» на Пути, «Открыть модель», больше не показывается', async ({ page, isMobile }) => {
  // на ПК модель и так открыта в боковой колонке — знакомство нужно телефону
  test.skip(!isMobile, 'на ПК модель открыта сбоку');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'sd-i1'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const unit = await showUnit(page, 'supply-demand');
  const intro = page.getByTestId('model-intro').first();
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Рынок, который можно покрутить');
  await intro.getByTestId('model-intro-open').click();
  await expect(page.getByTestId('model-open').first()).toBeVisible();
  await expect(page.getByTestId('model-intro')).toHaveCount(0);
  await gotoApp(page, '/', 'path');
  await showUnit(page, 'supply-demand');
  await expect(page.getByTestId('model-intro')).toHaveCount(0);
  await expect(unit.getByTestId('model-fold').or(page.getByTestId('path-side').getByTestId('model-fold')).first()).toBeVisible();
  expect(errors).toEqual([]);
});

// жалоба ученика (mc-sum, ПК 1910×950): «тут сломана предыдущая карточка с аксессуаром»
test('украшения урока: на «Предыдущей карточке» гирлянда не ложится на её заголовок и флажок', async ({ page, isMobile }) => {
  test.skip(isMobile, 'украшения урока — на ПК и планшете');
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, owned: { 'desk-bunting': at }, wear: { desk: 'desk-bunting', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.setViewportSize({ width: 1910, height: 950 });
  await startLesson(page, 'sc-i1');
  const band = page.locator('.ln-desk');
  await expect(band).toBeVisible();
  await page.getByTestId('lesson').locator('.ln-foot button').last().click();
  await page.getByTestId('lesson-back').click();
  const peek = page.getByTestId('lesson-peek');
  await expect(peek).toBeVisible();
  const b = await band.boundingBox();
  const head = await peek.locator('.ln-kind').boundingBox();
  // заголовок прошлой карточки и флажок — ниже полосы гирлянды
  expect(head.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  expect(errors).toEqual([]);
});

test('украшения урока: своя витрина с живыми превью, покупка вешает вещицу в уроки, она отзывается на ответ', async ({ page, isMobile }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 5000 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  // на витрине ювелира их нет — они во вкладке «Для урока»
  await shopTab(page, 'rare');
  await expect(page.getByTestId('shop-rare').getByTestId('shop-item').first()).toBeVisible();
  await expect(page.getByTestId('shop-rare').locator('[data-item^="desk-"]')).toHaveCount(0);
  await shopTab(page, 'lesson');
  const desk = page.getByTestId('shop-desk');
  await desk.scrollIntoViewIfNeeded();
  await expect(desk.getByTestId('shop-item')).toHaveCount(3);
  await expect(desk.getByTestId('decor-preview')).toHaveCount(3);
  // превью живое: оттянуть крайний шарик колыбели — шарики качаются
  const cradle = desk.locator('[data-testid=shop-item][data-item="desk-cradle"]');
  const prev = cradle.getByTestId('decor-preview');
  await expect(prev).toHaveAttribute('data-awake', 'false', { timeout: 5000 });
  const box = await prev.boundingBox();
  const cx = box.x + box.width / 2 - 2 * 14.6; const cy = box.y + 5 + (64 - 5 - 7 - 4);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 30, cy - 10, { steps: 5 });
  await expect(prev).toHaveAttribute('data-drag', 'true');
  await page.mouse.up();
  await expect(prev).toHaveAttribute('data-awake', 'true');
  // покупка — сразу в уроках
  await cradle.getByRole('button', { name: 'Купить' }).click();
  await expect(page.getByTestId('shop-msg')).toContainText('висит в уроках на ПК и планшете');
  await expect(cradle.getByTestId('desk-toggle')).toHaveText('Убрать из уроков');
  // в гардеробе их нет
  await shopTab(page, 'wardrobe');
  await expect(page.getByTestId('shop-wardrobe')).toBeVisible();
  await expect(page.getByTestId('shop-wardrobe').locator('[data-item^="desk-"]')).toHaveCount(0);
  // в уроке колыбель — на подставке сбоку, а не полосой над заданием: урок не сдвигается вниз; ответ её будит
  await openTab(page, 'path');
  await startLesson(page, 'sc-l1');
  const decor = page.getByTestId('lesson').getByTestId('lesson-decor');
  // на телефоне украшения в уроке нет — ни полосы, ни подставки: только на ПК и планшете (пункт владельца 08.11)
  if (isMobile) {
    await expect(page.getByTestId('lesson')).toBeVisible();
    await expect(decor).toHaveCount(0);
    await expect(page.getByTestId('cradle-stand')).toHaveCount(0);
    await expect(page.getByTestId('lesson').locator('.ln-desk')).toHaveCount(0);
    expect(errors).toEqual([]);
    return;
  }
  await expect(decor).toHaveAttribute('data-decor', 'desk-cradle');
  await expect(decor).toHaveAttribute('data-awake', 'false', { timeout: 5000 });
  const stand = page.getByTestId('cradle-stand');
  expect(await stand.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  await expect(page.getByTestId('lesson').locator('.ln-desk')).toHaveCount(0);
  const sb = await stand.boundingBox();
  expect(sb.width).toBeGreaterThanOrEqual(250);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]);
  while (!(await page.getByTestId('ex').count())) await page.getByTestId('lesson').locator('.ln-foot button').last().click();
  await answerExercise(page);
  await expect(decor).toHaveAttribute('data-awake', 'true');
  // перетащили за ручку — подставка едет за пальцем и остаётся на экране; место помнит устройство
  const grip = await page.getByTestId('cradle-grip').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 - 60, grip.y + grip.height / 2 - 80, { steps: 6 });
  await page.mouse.up();
  const moved = await stand.boundingBox();
  expect(Math.round(sb.x - moved.x)).toBeGreaterThan(40);
  expect(Math.round(sb.y - moved.y)).toBeGreaterThan(50);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-cradle-pos')))).toEqual({ x: Math.round(moved.x), y: Math.round(moved.y) });
  // подставка не мешает уроку: нажатие мимо шариков уходит тому, что под ней; шарик на подставке тянется
  const through = await stand.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + 12, r.top + r.height / 2); return !!hit && !el.contains(hit); });
  expect(through).toBe(true);
  const cv = await decor.locator('canvas').boundingBox();
  const m = await decor.evaluate((el) => { const c = el.querySelector('canvas'); return { w: c.clientWidth, h: c.clientHeight }; });
  const r = Math.max(7, Math.min(13, Math.round(m.h * 0.075))); const top = 14; const L = m.h - top - r - 12;
  // средний шарик: после ответа крайние ещё качаются, средний стоит на месте
  const bx = cv.x + m.w / 2; const by = cv.y + top + L;
  await page.mouse.move(bx, by);
  await page.mouse.down();
  await page.mouse.move(bx - 30, by - 8, { steps: 5 });
  await expect(decor).toHaveAttribute('data-drag', 'true');
  await page.mouse.up();
  await expect(decor).toHaveAttribute('data-drag', 'false');
  // убрали в лавке — в уроке полосы нет
  await page.getByTestId('lesson').locator('[data-nav="back"]').first().click();
  const leave = page.getByRole('button', { name: 'Выйти', exact: true });
  if (await leave.count()) await leave.click();
  await openTab(page, 'shop');
  // лавка помнит вкладку, пока открыто приложение
  await expect(page.getByTestId('shop-panel')).toHaveAttribute('data-tab', 'wardrobe');
  await shopTab(page, 'lesson');
  await page.getByTestId('shop-desk').locator('[data-item="desk-cradle"]').getByTestId('desk-toggle').click();
  await openTab(page, 'path');
  await startLesson(page, 'sc-l1', /Начать|Продолжить|Повторить/);
  await expect(page.getByTestId('lesson')).toBeVisible();
  await expect(page.getByTestId('lesson-decor')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «когда берёшь шарик в режиме рисования, у тебя карандаш вместо мышки»
test('колыбель в черновике на полях: над шариком — рука, тянут — сжатая рука, мимо шарика — карандаш; шарик не рисует', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне колыбели в уроке нет, курсора тоже');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, owned: { 'desk-cradle': at }, wear: { desk: 'desk-cradle', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-l1');
  const decor = page.getByTestId('lesson').getByTestId('lesson-decor');
  await expect(decor).toHaveAttribute('data-decor', 'desk-cradle');
  await expect(decor).toHaveAttribute('data-awake', 'false', { timeout: 5000 });
  await page.getByTestId('sketch-toggle').click();
  await expect(page.getByTestId('sketch-toggle')).toHaveAttribute('aria-checked', 'true');
  const cv = await decor.locator('canvas').boundingBox();
  const m = await decor.evaluate((el) => { const c = el.querySelector('canvas'); return { w: c.clientWidth, h: c.clientHeight }; });
  const r = Math.max(7, Math.min(13, Math.round(m.h * 0.075))); const top = 14; const L = m.h - top - r - 12;
  const bx = cv.x + m.w / 2; const by = cv.y + top + L;
  const offX = cv.x + 6; const offY = cv.y + m.h / 2;
  const cursorAt = (x, y) => page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)).cursor, [x, y]);
  const mode = () => page.evaluate(() => document.documentElement.dataset.cradleCursor || null);
  // мимо шарика — курсор черновика (карандаш)
  await page.mouse.move(offX, offY);
  const pencil = await cursorAt(offX, offY);
  expect(pencil).toContain('url(');
  // над шариком — рука
  await page.mouse.move(bx, by, { steps: 3 });
  await expect.poll(mode).toBe('grab');
  expect(await cursorAt(bx, by)).toBe('grab');
  // взяли — сжатая рука; шарик тянется, а на полях ничего не нарисовано
  await page.mouse.down();
  await expect(decor).toHaveAttribute('data-drag', 'true');
  expect(await mode()).toBe('grabbing');
  expect(await cursorAt(bx, by)).toBe('grabbing');
  await page.mouse.move(bx - 30, by - 8, { steps: 5 });
  await page.mouse.up();
  await expect(decor).toHaveAttribute('data-drag', 'false');
  await expect(page.getByRole('button', { name: 'Отменить' })).toBeDisabled();
  // ушли с шарика — снова карандаш
  await page.mouse.move(offX, offY, { steps: 3 });
  await expect.poll(mode).toBe(null);
  expect(await cursorAt(offX, offY)).toBe(pencil);
  expect(errors).toEqual([]);
});

test('темы урока: живые превью во вкладке «Для урока»; купленная тема меняет урок — фон, кнопки, отклик на ответ', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, coins: { '2026-01-01': 5000 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'shop' });
  await expect(page.getByTestId('shop-panel')).toHaveAttribute('data-tab', 'showcase');
  await shopTab(page, 'lesson');
  const themes = page.getByTestId('shop-themes');
  await expect(themes.getByTestId('shop-item')).toHaveCount(4);
  await expect(themes.getByTestId('skin-preview')).toHaveCount(4);
  // превью — тот же фон и те же кнопки, что в уроке
  const pv = themes.locator('[data-item="theme-exchange"]').getByTestId('skin-preview');
  await expect(pv).toHaveAttribute('data-skin', 'exchange');
  expect(await pv.locator('.ds-opt').first().evaluate((el) => getComputedStyle(el, '::before').content)).toContain('>');
  const item = themes.locator('[data-testid=shop-item][data-item="theme-exchange"]');
  await item.getByRole('button', { name: 'Купить' }).click();
  await expect(page.getByTestId('shop-msg')).toContainText('тема уже включена');
  await expect(item.getByTestId('theme-toggle')).toHaveText('Выключить');
  await expect(item).toHaveAttribute('data-on', 'true');
  // не на Инфле: ни в гардеробе, ни у ювелира
  await shopTab(page, 'wardrobe');
  await expect(page.getByTestId('shop-wardrobe').locator('[data-item^="theme-"]')).toHaveCount(0);
  await shopTab(page, 'rare');
  await expect(page.getByTestId('shop-rare').locator('[data-item^="theme-"]')).toHaveCount(0);
  // урок — в теме: тёмный терминал, варианты — строки «> …», ответ — свеча
  await openTab(page, 'path');
  await startLesson(page, 'sc-l1');
  const lesson = page.getByTestId('lesson');
  await expect(lesson).toHaveAttribute('data-skin', 'exchange');
  await expect(lesson).toHaveClass(/ds-dark/);
  await expect(lesson.getByTestId('lesson-skin')).toHaveAttribute('data-skin', 'exchange');
  while (!(await page.getByTestId('ex').count())) await lesson.locator('.ln-foot button').last().click();
  const fx = lesson.getByTestId('lesson-skin-fx');
  await expect(fx).toHaveAttribute('data-fired', '0');
  // лента тикеров — целиком над нижней панелью урока (на ПК панель выше, и лента уходила под неё)
  await expect.poll(async () => {
    const tape = await lesson.locator('.sk-ex-tape').boundingBox(); const foot = await lesson.locator('.ln-foot').first().boundingBox();
    return tape && foot ? Math.round(foot.y - (tape.y + tape.height)) : -1;
  }).toBeGreaterThanOrEqual(0);
  await answerExercise(page);
  await expect(fx).not.toHaveAttribute('data-fired', '0');
  // панель ответа — терминал темы, а не тёплая плашка приложения: тёмно-зелёный фон, моноширинный заголовок
  const answer = lesson.locator('.ds-answer');
  await expect(answer).toBeVisible();
  const look = await answer.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, img: getComputedStyle(el).backgroundImage, font: getComputedStyle(el.querySelector('.ds-answer-say, .ds-answer-stamp')).fontFamily }));
  expect(`${look.bg} ${look.img}`).toMatch(/rgb\(7, 22, 15\)/);
  expect(look.font).toMatch(/mono/i);
  // назад к прошлой карточке — на фоне темы, а не на чёрной плашке (пункт владельца 08.11); внизу — «Вернуться»,
  // а не «Проверить» текущей карточки (нижняя панель темы раньше перекрывала кнопку)
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await lesson.getByTestId('lesson-back').click();
  const peek = page.getByTestId('lesson-peek');
  await expect(peek).toBeVisible();
  const behind = await page.evaluate(() => {
    const pk = document.querySelector('.ln-peek'); const cur = document.querySelector('[data-testid=lesson] > .ln-body');
    const at = document.elementFromPoint(innerWidth / 2, innerHeight - 30);
    return { bg: getComputedStyle(pk).backgroundColor, img: getComputedStyle(pk).backgroundImage, cur: getComputedStyle(cur).visibility, at: at && at.closest('button') ? at.closest('button').textContent : '' };
  });
  expect(behind).toEqual({ bg: 'rgba(0, 0, 0, 0)', img: 'none', cur: 'hidden', at: 'Вернуться' });
  await page.getByTestId('lesson-peek-return').click();
  await expect(peek).toHaveCount(0);
  expect(await lesson.locator(':scope > .ln-body').evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
  // фон не ловит касаний и не расширяет страницу
  expect(await lesson.getByTestId('lesson-skin').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]);
  // выключили в лавке — урок обычный
  await lesson.locator('[data-nav="back"]').first().click();
  const leave = page.getByRole('button', { name: 'Выйти', exact: true });
  if (await leave.count()) await leave.click();
  await openTab(page, 'shop');
  await shopTab(page, 'lesson');
  await page.getByTestId('shop-themes').locator('[data-item="theme-exchange"]').getByTestId('theme-toggle').click();
  await openTab(page, 'path');
  await startLesson(page, 'sc-l1', /Начать|Продолжить|Повторить/);
  await expect(page.getByTestId('lesson')).toBeVisible();
  await expect(page.getByTestId('lesson')).not.toHaveAttribute('data-skin', /.+/);
  await expect(page.getByTestId('lesson-skin')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// ввод числа в теме урока: поле ответа, цифровая клавиатура и калькулятор — в цветах и шрифте темы (пункт владельца 08.11)
test('темы урока: поле ответа, цифровая клавиатура и калькулятор — в стиле темы', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), owned: { 'theme-exchange': at }, wear: { theme: 'theme-exchange', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-s1');
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-skin', 'exchange');
  await passCards(page);
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'calc');
  const look = (loc) => loc.evaluate((el) => { const c = getComputedStyle(el); return { bg: c.backgroundColor, border: c.borderTopColor, font: c.fontFamily }; });
  const terminal = { bg: 'rgba(8, 26, 18, 0.92)', border: 'rgb(30, 90, 62)' };
  expect(await look(ex.locator('.ln-numpad .ds-key').first())).toMatchObject(terminal);
  expect((await look(ex.locator('.ln-numpad .ds-key').first())).font).toMatch(/mono/i);
  expect(await look(ex.locator('input.ds-field'))).toMatchObject(terminal);
  await ex.getByTestId('calc-open').click();
  const calc = page.getByTestId('calculator');
  expect(await look(calc.locator('.ds-key').first())).toMatchObject(terminal);
  expect(await look(calc.locator('.lp-calc-screen'))).toMatchObject(terminal);
  expect(errors).toEqual([]);
});

/* «Куда сдвинется?»: после выбора кривая едет плавно, как на шаге с движением (жалоба mvz56ive) */
test('«Куда сдвинется?»: кривая сдвигается плавно, а не появляется сразу', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'lm-i2');
  for (let i = 0; i < 20; i += 1) {
    await passCards(page);
    if (await page.getByTestId('ex').getAttribute('data-kind') === 'shift') break;
    await answerExercise(page, {});
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'shift');
  const lines = () => ex.locator('svg path').evaluateAll((els) => els.map((e) => e.getAttribute('d')).join('|'));
  const before = await lines();
  const ans = JSON.parse(await ex.getAttribute('data-answer'));
  // все положения линий, которые побывали на экране после выбора: плавный сдвиг — много промежуточных
  await ex.evaluate((el) => {
    window.__shiftFrames = new Set();
    const snap = () => window.__shiftFrames.add([...el.querySelectorAll('svg path')].map((p) => p.getAttribute('d')).join('|'));
    new MutationObserver(snap).observe(el, { subtree: true, attributes: true, attributeFilter: ['d'] });
  });
  await ex.locator(`[data-key="${ans}"]`).click();
  await page.waitForTimeout(1600);
  const end = await lines();
  await page.waitForTimeout(400);
  expect(await lines()).toBe(end);
  expect(end).not.toBe(before);
  expect(await page.evaluate(() => window.__shiftFrames.size)).toBeGreaterThan(4);
  expect(errors).toEqual([]);
});

/* Итоги урока на телефоне 360 px: молния в плитке «Опыт» не крошечная, пояснение — строкой под плитками,
   плитки не растягиваются (жалоба mvz2jtzc) */
test('итоги урока на телефоне 360: плитки ровные, молния видна, пояснение под плитками', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'lm-i1');
  await playLesson(page);
  const res = page.getByTestId('lesson-result');
  await expect(res.getByTestId('result-xp-bonus')).toHaveText(/^\+\d+$/);
  await expect(res.getByTestId('result-xp-note')).toContainText(/\+\d+ опыта — за верные ответы подряд/);
  const icon = await res.getByTestId('result-xp-bonus').locator('svg').boundingBox();
  expect(icon.width).toBeGreaterThanOrEqual(14);
  const tiles = await res.locator('.ln-tickets > div').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(tiles).toHaveLength(3);
  expect(Math.max(...tiles) - Math.min(...tiles)).toBeLessThanOrEqual(1);
  expect(Math.max(...tiles)).toBeLessThan(110);
  expect(errors).toEqual([]);
});

test('«Соедините» — как «вставьте слово»: слово встаёт в подсвеченное место, место возвращает слово; после проверки ✓ и ✗ (жалобы mw05gjte, mw1sv3gr)', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2'];
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // в «Словах» пары есть всегда
  await startLesson(page, 'lm-w', /Начать|Повторить/);
  for (let i = 0; i < 30; i += 1) {
    await passCards(page);
    if (await page.getByTestId('ex').getAttribute('data-kind') === 'match') break;
    await answerExercise(page);
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  const ex = page.getByTestId('ex');
  await expect(ex).toHaveAttribute('data-kind', 'match');
  const ans = JSON.parse(await ex.getAttribute('data-answer'));
  const keys = Object.keys(ans);
  // подсказка, как это делать; подсвечено первое пустое место
  await expect(ex.getByTestId('match-how')).toContainText('Нажмите или перетащите слово');
  await expect(ex.locator('.ln-m2-row.on')).toHaveCount(1);
  // слово из банка встаёт в подсвеченное место и уходит из банка; подсветка — к следующему пустому
  const first = ex.locator('.ln-m2-row.on');
  const firstKey = await first.getAttribute('data-key');
  const word = ex.locator('[data-side=left]').first();
  const wordKey = await word.getAttribute('data-key');
  await word.click();
  await expect(ex.locator(`[data-side=right][data-key="${firstKey}"]`).getByTestId('match-tag')).toBeVisible();
  await expect(ex.locator(`[data-side=left][data-key="${wordKey}"]`)).toHaveCount(0);
  await expect(ex.locator('.ln-m2-row.on')).not.toHaveAttribute('data-key', firstKey);
  // место со словом — слово вернулось в банк
  await ex.locator(`[data-side=right][data-key="${firstKey}"]`).click();
  await expect(ex.locator(`[data-side=left][data-key="${wordKey}"]`)).toHaveCount(1);
  await expect(ex.locator('.ln-m2-row.on')).toHaveAttribute('data-key', firstKey);
  /* перетаскивание (пункт владельца 08.11): слово — пальцем или мышью на любое место, с места — на другое место
     или обратно в банк; копия едет за пальцем, место под ней подсвечено */
  const drag = async (from, to) => {
    await to.scrollIntoViewIfNeeded();
    const a = await from.boundingBox(); const b = await to.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
    await expect(page.getByTestId('match-ghost')).toBeVisible();
    // копия — своего размера, а не во всё окно (жалоба mw9jj3fg: на ПК плитка тянулась на 1900 px)
    expect((await page.getByTestId('match-ghost').boundingBox()).width).toBeLessThanOrEqual(340);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await expect(to).toHaveClass(/\bdrop\b/);
    await page.mouse.up();
    await expect(page.getByTestId('match-ghost')).toHaveCount(0);
  };
  const rowKeys = await ex.locator('[data-side=right]').evaluateAll((els) => els.map((e) => e.dataset.key));
  // не подсвеченное место, а третье — слово встаёт туда, куда его принесли
  const lastRow = ex.locator(`[data-side=right][data-key="${rowKeys[2]}"]`);
  await drag(ex.locator(`[data-side=left][data-key="${wordKey}"]`), lastRow);
  await expect(lastRow.getByTestId('match-tag')).toBeVisible();
  await expect(ex.locator(`[data-side=left][data-key="${wordKey}"]`)).toHaveCount(0);
  // с места — на другое место
  const otherRow = ex.locator(`[data-side=right][data-key="${rowKeys[1]}"]`);
  await drag(lastRow.getByTestId('match-tag'), otherRow);
  await expect(otherRow.getByTestId('match-tag')).toBeVisible();
  await expect(lastRow.getByTestId('match-tag')).toHaveCount(0);
  // и обратно в банк
  await drag(otherRow.getByTestId('match-tag'), ex.getByTestId('match-bank'));
  await expect(ex.locator(`[data-side=left][data-key="${wordKey}"]`)).toHaveCount(1);
  await expect(ex.getByTestId('match-tag')).toHaveCount(0);
  // первые два слова — наоборот, остальные верно
  const plan = Object.fromEntries(keys.map((k, i) => [k, i === 0 ? ans[keys[1]] : i === 1 ? ans[keys[0]] : ans[k]]));
  for (const [l, r] of Object.entries(plan)) { await ex.locator(`[data-side=right][data-key="${r}"]`).click(); await ex.locator(`[data-side=left][data-key="${l}"]`).click(); }
  await expect(ex.getByTestId('match-bank')).toContainText('Все слова на местах');
  await page.getByRole('button', { name: 'Проверить' }).click();
  await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
  await expect(ex.locator('[data-side=right][data-verdict="bad"]')).toHaveCount(2);
  await expect(ex.locator('[data-side=right][data-verdict="ok"]')).toHaveCount(keys.length - 2);
  await expect(ex.getByTestId('match-fix')).toHaveCount(2);
  await expect(page.getByTestId('match-summary')).toContainText(`Неверных пар: 2 из ${keys.length}`);
  await expect(page.getByTestId('ex-feedback')).not.toContainText('Правильно:');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});
