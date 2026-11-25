/* БРАУЗЕРНЫЕ СЦЕНАРИИ — вид задания «Данные» (пункт владельца 24.11, п. 12): таблица, столбцы, полосы, график и круговая
   диаграмма; ответ касанием элемента, числом с экранной клавиатуры или выбором вывода. Задания — из уроков «Базара»
   (src/textbook/chapters/prices.md), урок из названных заданий — событием inflatia:test-run (только при флаге теста). */
import { test, expect } from '@playwright/test';
import { openApp, withTestFlag, answerExercise, expectNoSidewaysScroll, installHooks } from './helpers.js';

installHooks();

const DATA = {
  'tr-e1-straw': { view: 'bar', ask: 'pick', trap: 'В июле клубника дешевле всего' },
  'tr-e2-packs': { view: 'table', ask: 'pick', trap: 'за килограмм' },
  'tr-e2-budget': { view: 'pie', ask: 'number', trap: 'Это кроны' },
  'tr-e2-bread': { view: 'line', ask: 'choice', trap: null },
  'tr-e2-where': { view: 'hbar', ask: 'pick', trap: '1200 — дороже базы' },
};
const IDS = Object.keys(DATA);

// урок из названных заданий; после перезагрузки страница подписывается на событие не сразу — шлём, пока не откроется
async function runOnly(page, only) {
  await expect(async () => {
    await page.evaluate((ids) => window.dispatchEvent(new CustomEvent('inflatia:test-run', { detail: { lessonId: 'tr-l2', only: ids } })), only);
    await expect(page.getByTestId('ex')).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15000 });
}

const check = (page) => page.getByRole('button', { name: 'Проверить' });

test('«Данные»: пять видов рисунка — ответ касанием, числом и выводом; «Проверить» — только после ответа', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await runOnly(page, IDS);
  const seen = [];
  for (let k = 0; k < IDS.length; k += 1) {
    const ex = page.getByTestId('ex');
    await expect(ex).toHaveAttribute('data-kind', 'data');
    const id = await ex.getAttribute('data-id');
    const want = DATA[id];
    seen.push(id);
    const view = ex.getByTestId('data-view');
    await expect(view).toHaveAttribute('data-view', want.view);
    await expect(view).toHaveAttribute('data-ask', want.ask);
    // у рисунка — заголовок и единица, таблица для чтения с экрана — рядом
    await expect(view.locator('figcaption, .dv-title').first()).toBeVisible();
    await expect(check(page)).toBeDisabled();
    if (want.ask === 'pick') await expect(ex.getByTestId('data-hint')).toBeVisible();
    else await expect(ex.getByTestId('data-hint')).toHaveCount(0);
    await expectNoSidewaysScroll(page);
    await answerExercise(page);
    if (want.ask === 'pick') {
      const ans = JSON.parse(await ex.getAttribute('data-answer'));
      const pie = want.view === 'pie';
      await expect(view.locator(pie ? `[data-legend="${ans.key}"]` : `[data-key="${ans.key}"]`).first()).toHaveAttribute('data-state', 'right');
    }
    await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  }
  expect(seen.sort()).toEqual([...IDS].sort());
  expect(errors).toEqual([]);
});

test('«Данные»: неверный ответ — ловушка с объяснением, «Правильно: …», неверный элемент красный, верный зелёный', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  for (const id of IDS) {
    const want = DATA[id];
    await runOnly(page, [id]);
    const ex = page.getByTestId('ex');
    await expect(ex).toHaveAttribute('data-id', id);
    const ans = JSON.parse(await ex.getAttribute('data-answer'));
    const view = ex.getByTestId('data-view');
    if (want.trap && want.ask === 'pick') {
      // нарочно — ловушка задания, а не любой неверный элемент
      const traps = { 'tr-e1-straw': 'Июль', 'tr-e2-packs': 'Маленькая', 'tr-e2-where': 'Рынок у дома' };
      await view.locator(`[data-key="${traps[id]}"]`).first().click();
      await check(page).click();
      await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
      await expect(view.locator(`[data-key="${traps[id]}"]`).first()).toHaveAttribute('data-state', 'wrong');
      await expect(view.locator(`[data-key="${ans.key}"]`).first()).toHaveAttribute('data-state', 'right');
    } else if (want.ask === 'number') {
      // ловушка расчёта: 2800 (кроны вместо доли)
      for (const ch of '2800') await ex.getByRole('group', { name: 'Цифровая клавиатура' }).getByRole('button', { name: ch, exact: true }).click();
      await check(page).click();
      await expect(page.getByTestId('ex-feedback')).toHaveAttribute('data-ok', 'false');
    } else await answerExercise(page, { wrong: true });
    const fb = page.getByTestId('ex-feedback');
    if (want.trap) await expect(fb).toContainText(want.trap);
    await expect(fb).toContainText('Правильно:');
    // после проверки рисунок заперт: касание другого элемента ничего не меняет
    if (want.ask === 'pick' && want.view !== 'pie') {
      const before = await view.locator('[data-state="right"]').count();
      await view.locator('[data-key]').last().click({ force: true });
      await expect(view.locator('[data-state="right"]')).toHaveCount(before);
    }
    await expectNoSidewaysScroll(page);
    await page.reload({ waitUntil: 'networkidle' });
  }
  expect(errors).toEqual([]);
});

test('«Данные»: выбор с клавиатуры — фокус на столбце, Enter отмечает, «Проверить» включается', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'клавиатура — на ПК');
  await withTestFlag(page);
  await openApp(page, '/', '{}', { tab: 'path' });
  await runOnly(page, ['tr-e1-straw']);
  const view = page.getByTestId('data-view');
  const bar = view.locator('[data-key="Январь"]');
  await expect(bar).toHaveAttribute('role', 'button');
  await expect(bar).toHaveAttribute('aria-label', /Январь.*900/);
  await bar.focus();
  await page.keyboard.press('Enter');
  await expect(bar).toHaveAttribute('aria-pressed', 'true');
  await expect(check(page)).toBeEnabled();
  // другой столбец пробелом — выбор переходит
  await view.locator('[data-key="Май"]').focus();
  await page.keyboard.press('Space');
  await expect(view.locator('[data-key="Май"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(bar).toHaveAttribute('aria-pressed', 'false');
});
