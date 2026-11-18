/* ИССЛЕДОВАНИЕ — полный цикл на настоящей странице /research и настоящем обработчике api/research.js (база — в памяти,
   исследование открыто только в этом тесте; рабочий сервер закрыт: STUDY_STATUS — 'draft'). Замечание владельца 18.11,
   п. 8: «регистрация участника, тесты, распределение, прохождение, отзыв, выгрузка и удаление». */
import { test, expect } from '@playwright/test';
import { makeHandler } from '../api/research.js';
import { memoryStore } from '../api/_lib/research-store.js';
import { keyFor } from '../api/_lib/research-key.js';
import { MODULE } from '../src/research/module.js';
import { armAt } from '../src/research/randomize.js';

const DAY = 86400000;
const T0 = Date.UTC(2027, 2, 1, 9);

// подменяем /api/research настоящим обработчиком; часы сервера двигает тест
async function serve(page, { open = true } = {}) {
  const st = memoryStore(); const clock = { t: T0 }; const seen = [];
  const h = makeHandler({ status: open ? 'open' : 'draft', store: () => st, seed: 'зерно-e2e', exportToken: 'ключ', now: () => clock.t, coin: () => true });
  const run = (req) => new Promise((resolve) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ status: this.code, body: d }); return this; } };
    h(req, res);
  });
  await page.route('**/api/**', async (route) => {
    const r = route.request(); const url = new URL(r.url()); seen.push(url.pathname);
    if (url.pathname !== '/api/research') return route.fulfill({ status: 404, body: '{}' });
    const out = r.method() === 'GET'
      ? await run({ method: 'GET', query: Object.fromEntries(url.searchParams), headers: {} })
      : await run({ method: 'POST', query: {}, headers: {}, body: r.postDataJSON() });
    return route.fulfill({ status: out.status, contentType: 'application/json', body: JSON.stringify(out.body) });
  });
  return { st, clock, seen, h, run };
}

async function answerTest(page, { right = 12 } = {}) {
  const t = page.getByTestId('rs-test');
  await expect(t).toBeVisible();
  const form = await t.getAttribute('data-form');
  const items = t.getByTestId('rs-item');
  const n = await items.count();
  for (let i = 0; i < n; i += 1) {
    const it = items.nth(i); const id = await it.getAttribute('data-item');
    const k = keyFor(form, id);
    if (i >= right) { await it.getByTestId('rs-skip').click(); continue; }
    if (typeof k === 'number') await it.getByTestId('rs-num').fill(String(k).replace('.', ','));
    else await it.locator(`[data-testid=rs-opt][data-id="${k}"]`).click();
  }
  return form;
}
async function passLesson(page, lesson, { wrongFirst = false } = {}) {
  await page.locator(`[data-testid=rs-lesson-open][data-lesson="${lesson.id}"]`).click();
  await expect(page.getByTestId('rs-lesson')).toHaveAttribute('data-lesson', lesson.id);
  const texts = await page.getByTestId('rs-card-text').allTextContents();
  await page.getByTestId('rs-start').click();
  const prompts = [];
  for (const [i, ex] of lesson.exercises.entries()) {
    prompts.push(await page.getByTestId('rs-prompt').textContent());
    if (wrongFirst && i === 0) {
      if (ex.kind === 'number') await page.getByTestId('rs-num').fill('999999'); else await page.locator(`[data-testid=rs-opt]:not([data-id="${ex.answer}"])`).first().click();
      await page.getByTestId('rs-check').click();
      await expect(page.getByTestId('rs-feedback')).toHaveAttribute('data-correct', 'false');
      await page.getByTestId('rs-retry').click();
    }
    if (ex.kind === 'number') await page.getByTestId('rs-num').fill(String(ex.answer));
    else await page.locator(`[data-testid=rs-opt][data-id="${ex.answer}"]`).click();
    await page.getByTestId('rs-check').click();
    await expect(page.getByTestId('rs-feedback')).toHaveAttribute('data-correct', 'true');
    await page.getByTestId('rs-next').click();
  }
  await expect(page.getByTestId('rs-lesson-done')).toBeVisible();
  await page.getByTestId('rs-lesson-back').click();
  return { texts, prompts };
}

test('исследование закрыто (черновик): страница говорит «пока не проводится» и не показывает информацию и запись', async ({ page }) => {
  const { seen } = await serve(page, { open: false });
  await page.goto('/research');
  await expect(page.getByTestId('rs-closed')).toContainText('пока не проводится');
  await expect(page.getByTestId('rs-info')).toHaveCount(0);
  await expect(page.getByTestId('rs-enroll')).toHaveCount(0);
  // страница отдельна от приложения: нет нижней панели и запросов к аккаунтам
  await expect(page.getByTestId('bottom-nav')).toHaveCount(0);
  expect(seen.every((p) => p === '/api/research')).toBe(true);
});

test('исследование: полный цикл — запись, входной тест, группа, восемь уроков, итоговый и отсроченный тесты, выгрузка, отзыв и удаление', async ({ page }) => {
  test.setTimeout(180000);
  const { st, clock, seen, run } = await serve(page);
  await page.goto('/research');
  // информация для участника — из research/participant-information.md; без двух отметок записаться нельзя
  await expect(page.getByTestId('rs-info')).toContainText('Что видят технические провайдеры');
  await expect(page.getByTestId('rs-info')).toContainText('Telegram');
  await expect(page.getByTestId('rs-enroll')).toBeDisabled();
  await page.getByTestId('rs-adult').check();
  await page.getByTestId('rs-agree').check();
  await page.getByTestId('rs-enroll').click();
  const code = (await page.getByTestId('rs-code').textContent()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{3}$/);
  // входной тест: форма A (порядок форм — AB), ответы сырые, «верно» считает сервер; 8 из 12 → слой high
  const pre = await answerTest(page, { right: 8 });
  expect(pre).toBe('A');
  clock.t += 6 * 60000;
  await page.getByTestId('rs-test-send').click();
  await expect(page.getByTestId('rs-module')).toBeVisible();
  const arm = await page.getByTestId('rs-module').getAttribute('data-arm');
  expect(arm).toBe(armAt('зерно-e2e', 'high', 0));
  // версия модуля: игровая — опыт, серия, карта; обычная — без них
  await expect(page.getByTestId('rs-hud')).toHaveCount(arm === 'game' ? 1 : 0);
  // итоговый тест пока закрыт
  await expect(page.getByTestId('rs-post-ready')).toHaveCount(0);
  clock.t = T0 + 2 * DAY;
  for (const [i, lesson] of MODULE.entries()) await passLesson(page, lesson, { wrongFirst: i === 0 });
  await page.reload();
  await expect(page.getByTestId('rs-post-ready')).toContainText('Вы прошли все уроки');
  await page.getByTestId('rs-post-start').click();
  expect(await answerTest(page, { right: 10 })).toBe('B');
  await page.locator('[data-testid=rs-used][data-v="no"]').click();
  await page.getByTestId('rs-test-send').click();
  await expect(page.getByTestId('rs-post-done')).toContainText('Отсроченный тест откроется');
  clock.t = T0 + 30 * DAY;
  await page.reload();
  await expect(page.getByTestId('rs-delayed-ready')).toBeVisible();
  await page.getByTestId('rs-delayed-ready').getByRole('button').click();
  expect(await answerTest(page, { right: 9 })).toBe('C');
  await page.getByTestId('rs-test-send').click();
  await expect(page.getByTestId('rs-post-done')).toContainText('отсроченный — тоже');
  // выгрузка: только поля словаря; уроки пройдены по данным сервера; баллы — по ключу
  const ex = (await run({ method: 'POST', query: {}, headers: { 'x-research-token': 'ключ' }, body: { action: 'export' } })).body;
  expect(ex.participants).toHaveLength(1);
  expect(ex.participants[0]).toMatchObject({ participant_code: code, arm, stratum: 'high', stage: 'delayed', used_regular_app: 'no', protocol_version: '0.3' });
  expect(ex.events.filter((e) => e.event_type === 'lesson_done').map((e) => e.lesson_id)).toEqual(MODULE.map((l) => l.id));
  expect(ex.events.find((e) => e.exercise_id === MODULE[0].exercises[0].id && e.attempt_no === 1).correct).toBe(false);
  expect(['pre', 'post', 'delayed'].map((k) => ex.tests.filter((t) => t.test_kind === k && t.correct).length)).toEqual([8, 10, 9]);
  expect(ex.tests.find((t) => t.test_kind === 'pre').test_seconds).toBe(360);
  // отзыв: все записи участника удалены
  await page.getByTestId('rs-withdraw-open').click();
  await page.getByTestId('rs-withdraw-yes').click();
  await expect(page.getByTestId('rs-gone')).toBeVisible();
  for (const prefix of ['rp:', 're:', 'rt:', 'rx:', 'rslot:']) expect(await st.keys(prefix), prefix).toEqual([]);
  expect(await st.get('rwithdrawn')).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('ems-research-code'))).toBeNull();
  // фиксация набора: удаление всей исследовательской базы по ключу и фразе подтверждения
  const purge = (await run({ method: 'POST', query: {}, headers: { 'x-research-token': 'ключ' }, body: { action: 'purge', confirm: 'УДАЛИТЬ НАБОР' } })).body;
  expect(purge).toMatchObject({ ok: true, withdrawn: 1 });
  expect(await st.keys('r')).toEqual([]);
  // страница ходила только в /api/research
  expect(seen.every((p) => p === '/api/research')).toBe(true);
});

test('исследование: две версии модуля — одно содержание (объяснения и задания совпадают), разная подача', async ({ browser }) => {
  test.setTimeout(120000);
  const texts = {};
  // два участника в одном слое: по зерну первые позиции слоя дают разные группы — ищем их
  for (const want of ['game', 'plain']) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const { st } = await serve(page);
    // занять позиции слоя так, чтобы следующий участник попал в нужную группу
    let slot = 0; while (armAt('зерно-e2e', 'high', slot) !== want) slot += 1;
    for (let k = 0; k < slot; k += 1) await st.incr('rcount:high');
    await page.goto('/research');
    await page.getByTestId('rs-adult').check(); await page.getByTestId('rs-agree').check(); await page.getByTestId('rs-enroll').click();
    await answerTest(page, { right: 9 }); await page.getByTestId('rs-test-send').click();
    await expect(page.getByTestId('rs-module')).toHaveAttribute('data-arm', want);
    await expect(page.getByTestId('rs-hud')).toHaveCount(want === 'game' ? 1 : 0);
    texts[want] = await passLesson(page, MODULE[1]);
    if (want === 'game') await expect(page.getByTestId('rs-xp')).not.toHaveText('★ 0 опыта');
    await ctx.close();
  }
  expect(texts.game).toEqual(texts.plain);
  expect(texts.game.prompts).toEqual(MODULE[1].exercises.map((e) => e.prompt));
});
