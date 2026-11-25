/* БРАУЗЕР → СЕРВЕР ONREZA COMPUTE (server/index.js): без подставных ответов. Сайт и API отдаёт настоящий Express-сервер
   (SERVE_STATIC=dist, база — память процесса; на PostgreSQL сервер проверяют server/__tests__/pg.test.js), как в ONREZA:
   один домен, запросы к /api — с той же страницы. Регистрация в интерфейсе → сессия переживает перезагрузку → адрес экрана
   открывается сразу → вход с другого устройства → прогресс на месте → «Скачать мои данные». */
import { test, expect } from '@playwright/test';
import { guestToRegister, installHooks } from './helpers.js';

installHooks();
const SERVER = `http://localhost:${Number(process.env.E2E_SERVER_PORT || 4175)}`;
test.use({ baseURL: SERVER });
// каждый прогон — свой «настоящий» адрес: сервер доверяет одному прокси, тест играет его роль (лимит регистраций — на адрес)
const ip = () => `198.51.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250) + 1}`;

async function watch(page) {
  const errors = []; const external = []; const api = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(SERVER)) external.push(r.url()); });
  page.on('response', (r) => { if (r.url().includes('/api/')) api.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
  return { errors, external, api };
}

test('вход: через сервер ONREZA Compute — регистрация, сессия после перезагрузки, адрес экрана, вход с другого устройства, выгрузка данных', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip() });
  const { errors, external, api } = await watch(page);
  const doc = await page.goto('/', { waitUntil: 'load' });
  // заголовки безопасности — у страницы, которую отдал сервер
  expect(doc.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(doc.headers()['x-frame-options']).toBe('DENY');
  await page.getByRole('button', { name: 'Начать' }).click();
  const goal = page.getByTestId('welcome-goal');
  for (const g of ['Цель', 'Минут в день', 'Знания']) await goal.getByRole('group', { name: g }).getByRole('button').first().click();
  await goal.getByRole('button', { name: 'Продолжить' }).click();
  const reg = await guestToRegister(page);
  const login = `srv${Date.now().toString(36).slice(-6)}`;
  await reg.getByLabel('Логин').fill(login);
  await reg.getByLabel('Пароль', { exact: true }).fill('secret12');
  await reg.getByTestId('birth-year').fill('1995');
  await reg.getByTestId('consent-page').check();
  await reg.getByTestId('consent-pd').check();
  await reg.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByTestId('recovery-code')).toBeVisible();
  await page.getByRole('button', { name: 'Я сохранил код' }).click();
  await expect(page.getByTestId('path')).toBeVisible();
  expect(api.some((l) => /^POST \/api\/account 200$/.test(l))).toBe(true);

  // перезагрузка — сессия на сервере жива
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByTestId('path')).toBeVisible();
  // адрес экрана открывается сразу (на ONREZA — правило Edge или копия index.html на сервере)
  await page.goto('/shop', { waitUntil: 'load' });
  await expect(page.getByTestId('bottom-nav')).toBeVisible();
  await page.goto('/book', { waitUntil: 'load' });
  await expect(page.getByTestId('bottom-nav')).toBeVisible();
  // запрос со страницы — тот же домен, CSP его пропускает
  const health = await page.evaluate(async () => (await fetch('/api/health')).json());
  expect(health).toMatchObject({ runtime: 'onreza-compute' });

  // другое устройство: вход тем же логином — профиль и прогресс с сервера
  const other = await browser.newContext({ baseURL: SERVER, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
  const p2 = await other.newPage();
  await p2.goto('/', { waitUntil: 'load' });
  await p2.getByRole('button', { name: 'У меня уже есть аккаунт' }).click();
  const form = p2.getByTestId('welcome-login');
  await form.getByLabel('Логин').fill(login);
  await form.getByLabel('Пароль', { exact: true }).fill('secret12');
  await form.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(p2.getByTestId('path')).toBeVisible();
  // выгрузка данных — тем же ключом входа, что лежит у этого устройства
  const exported = await p2.evaluate(async () => {
    const acc = JSON.parse(localStorage.getItem('ems-account') || '{}');
    const r = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'export', token: acc.token }) });
    return { status: r.status, body: await r.json() };
  });
  expect(exported.status).toBe(200);
  expect(exported.body.account.login).toBe(login);
  await other.close();

  // неизвестный адрес — 404 сервера, не приложение
  expect((await page.request.get('/nope/deeper')).status()).toBe(404);
  expect((await page.request.get('/api/nope')).status()).toBe(404);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
