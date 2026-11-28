/* БРАУЗЕРНЫЕ СЦЕНАРИИ — закрытый сайт (пункт владельца 28.11, п. 3; src/gate.jsx, api/_lib/gate.js): без аккаунта —
   ключ на весь экран; неверный — ошибка, верный — окно регистрации; «У меня есть аккаунт» — вход без ключа; ответ API
   «закрыто» — снова экран ключа. API подменён: ключ в тесте синтетический. */
import { test, expect } from '@playwright/test';
import { installHooks, expectNoSidewaysScroll } from './helpers.js';

installHooks();
const KEY = 'synthetic-e2e-key';

async function openClosed(page, { closedAfterKey = false } = {}) {
  let passed = false;
  await page.route('**/api/**', async (r) => {
    const req = r.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { body = {}; }
    if (req.url().includes('/api/account') && body.action === 'gate') {
      if (body.key === KEY) { passed = true; return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
      return r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"Неверный ключ"}' });
    }
    if (!passed || closedAfterKey) return r.fulfill({ status: 403, contentType: 'application/json', headers: { 'X-Inflatia-Closed': '1' }, body: '{"error":"Сайт закрыт","closed":true}' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/', { waitUntil: 'load' });
}

test('ключ: без аккаунта — экран ключа на весь экран; неверный ключ — ошибка; верный — окно регистрации', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await openClosed(page);
  const gate = page.getByTestId('site-gate');
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('Инфляция — закрытый доступ');
  // приложения под экраном нет: ни нижней панели, ни Пути
  await expect(page.getByTestId('bottom-nav')).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  await gate.getByTestId('password').fill('не тот ключ');
  await gate.getByTestId('gate-submit').click();
  await expect(gate.getByTestId('gate-error')).toHaveText('Неверный ключ');
  await gate.getByTestId('password').fill(KEY);
  await gate.getByTestId('gate-submit').click();
  await expect(page.getByTestId('site-gate')).toHaveCount(0);
  await expect(page.getByRole('dialog').filter({ hasText: 'Ключ принят' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ems-gate-ok'))).toBe('1');
  // ключ не остаётся в браузере
  expect(await page.evaluate((k) => JSON.stringify(localStorage).includes(k), KEY)).toBe(false);
  expect(errors).toEqual([]);
});

test('ключ: «У меня есть аккаунт — войти» открывает вход без ключа, закрыли — снова экран ключа', async ({ page }) => {
  await openClosed(page);
  await page.getByTestId('gate-login').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('password')).toBeVisible();
  await dialog.getByRole('button', { name: 'Закрыть' }).click();
  await expect(page.getByTestId('site-gate')).toBeVisible();
});

test('ключ: ответ API «закрыто» после входа без аккаунта — снова экран ключа', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('ems-gate-ok', '1'); } catch { /* нет хранилища */ } });
  await openClosed(page, { closedAfterKey: true });
  // отметка «ключ введён» есть, но сервер пропуска не видит — первый же запрос API возвращает экран ключа
  await expect(page.getByTestId('site-gate')).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem('ems-gate-ok'))).toBe(null);
});
