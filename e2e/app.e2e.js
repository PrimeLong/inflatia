/* БРАУЗЕРНЫЕ СЦЕНАРИИ — вход, адреса и история, доступность, память браузера, безопасность, офлайн, сбои экрана.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/app.e2e.js */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { SCREENS } from '../src/learn/screens.js';
import {
  openApp, shopTab, openTab, openTasks, openBook, bookBack, expectNoSidewaysScroll, startSoloGame, accountApi, guestToRegister, expectGateOnly,
  FIRST_SCREEN_JS_KB, answerExercise, playLesson, withTestFlag, slowInWebkit, pathNode, showUnit, startLesson, expectScreen, clickBack, pathOf,
  landmarks, installHooks,
} from './helpers.js';

installHooks();

test('заголовки безопасности: CSP без нарушений на Пути, в уроке, учебнике, лавке и «Мире»', async ({ page }) => {
  const violations = [];
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { (window.__csp = window.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`); }); });
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  const resp = await page.goto('/', { waitUntil: 'networkidle' });
  const h = resp.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBeTruthy();
  expect(h['permissions-policy']).toBeTruthy();
  await expect(page.getByTestId('path')).toBeVisible();
  await startLesson(page, 'sc-i1');
  await expect(page.getByTestId('lesson')).toBeVisible();
  await page.goto('/', { waitUntil: 'networkidle' });
  for (const tab of ['book', 'shop', 'world']) { await openTab(page, tab); await page.waitForTimeout(300); }
  const caught = await page.evaluate(() => window.__csp || []);
  expect([...violations, ...caught]).toEqual([]);
});

/* Приветствие на ПК (docs/mechanics.md, «Приветствие и загрузка»): одна колонка посередине, без мини-урока (пункт
   владельца 08.11, вечер), «Начать» видна без прокрутки при 1440×900, уведомление о памяти браузера её не закрывает. */
test('вход: приветствие на ПК — одна колонка посередине, без мини-урока, «Начать» без прокрутки, плашка про cookie не на кнопках', async ({ page, isMobile }) => {
  test.skip(isMobile, 'раскладка ПК');
  await page.setViewportSize({ width: 1440, height: 900 });
  // уведомление о памяти браузера — как при первом открытии (скрипт страницы идёт после скрипта контекста)
  await page.addInitScript(() => localStorage.removeItem('ems-storage-notice'));
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  const start = page.getByRole('button', { name: 'Начать', exact: true });
  const notice = page.getByTestId('storage-notice');
  await expect(start).toBeVisible();
  await expect(notice).toBeVisible();
  await expect(page.getByTestId('welcome-try')).toHaveCount(0);
  await page.waitForTimeout(1500); // приветствие проявляется по шагам
  const [s, n, v, b] = await Promise.all([start.boundingBox(), notice.boundingBox(), page.getByTestId('welcome-values').boundingBox(), page.getByTestId('brand').boundingBox()]);
  // одна колонка посередине: знак, обещания и «Начать» — по центру экрана, друг под другом
  for (const box of [s, v, b]) expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(40);
  expect(b.y).toBeLessThan(v.y); expect(v.y).toBeLessThan(s.y);
  // «Начать» — в первом экране, без прокрутки
  expect(s.y + s.height).toBeLessThanOrEqual(900);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  // плашка не закрывает «Начать»
  const hit = (a, c) => a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height;
  expect(hit(n, s), 'плашка на «Начать»').toBe(false);
  expect(errors).toEqual([]);
});

test('вход: приветствие грузит не больше 600 КБ JS — движок партии и меню «Мира» не грузятся', async ({ page }) => {
  const js = [];
  page.on('response', async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    try { js.push({ url: r.url(), size: (await r.body()).length }); } catch { /* ответ без тела */ }
  });
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  await expect(page.getByRole('button', { name: 'Начать' })).toBeVisible();
  // всё, что первый экран догружает сам (без нажатий)
  await page.waitForTimeout(1500);
  const kb = Math.round(js.reduce((a, x) => a + x.size, 0) / 1024);
  const list = js.map((x) => `${x.url.split('/').pop()} ${Math.round(x.size / 1024)} КБ`).join(', ');
  expect(kb, `JS на приветствии: ${list}`).toBeLessThanOrEqual(FIRST_SCREEN_JS_KB);
  expect(js.map((x) => x.url).filter((u) => /\/assets\/(catalog|world-menu|game|tycoon|network)-/.test(u)), 'ленивые чанки «Мира»').toEqual([]);
  expect(errors).toEqual([]);
});

test('вход: первый запуск — приветствие, цель, урок гостем, «Сохраните прогресс», регистрация; выход, вход и восстановление', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  const { errors, external } = await openApp(page, '/', accountApi, { tab: null });
  // приветствие: три обещания; мини-урока «за 30 секунд» нет (пункт владельца 08.11, вечер)
  await expect(page.getByTestId('welcome-values').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('welcome-try')).toHaveCount(0);
  const hello = page.getByTestId('welcome');
  await expect(hello).toBeVisible();
  await expect(hello.getByTestId('mascot').first()).toHaveAttribute('data-mood', 'wave');
  await expectGateOnly(page);
  // у первого экрана «назад» нет, у остальных — один
  await expect(page.locator('[data-nav="back"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Начать' }).click();
  const goal = page.getByTestId('welcome-goal');
  await expect(goal.locator('[data-nav="back"]')).toHaveCount(1);
  await expect(goal.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  await goal.getByRole('group', { name: 'Цель' }).getByRole('button', { name: 'Поступление в вуз' }).click();
  await goal.getByRole('group', { name: 'Минут в день' }).getByRole('button', { name: '10 минут' }).click();
  await goal.getByRole('group', { name: 'Знания' }).getByRole('button', { name: 'Начинаю с нуля' }).click();
  await goal.getByRole('button', { name: 'Продолжить' }).click();
  // гостевой старт: сразу первый урок, без аккаунта; после урока — «Сохраните прогресс»
  await expect(page.getByTestId('lesson')).toBeVisible();
  await playLesson(page);
  const save = page.getByTestId('lesson-result').getByTestId('guest-save');
  await expect(save).toContainText('Сохраните прогресс');
  await save.getByTestId('guest-register').click();
  const reg = page.getByTestId('welcome-register');
  await expect(reg).toContainText('Сохраните прогресс');
  await expect(reg.locator('[data-nav="back"]')).toHaveCount(1);
  await expectNoSidewaysScroll(page);
  await reg.getByLabel('Логин').fill('anna');
  await reg.getByLabel('Пароль', { exact: true }).fill('secret12');
  await reg.getByLabel('Имя').fill('Анна');
  // год рождения: до 16 лет «Мир» — в детском режиме, подсказка говорит об этом сразу
  await reg.getByTestId('birth-year').fill('2013');
  await expect(reg.getByText(/детском режиме/)).toBeVisible();
  await reg.getByTestId('birth-year').fill('2000');
  // две отдельные отметки: «ознакомлен со страницей» и «согласие на обработку данных»; без обеих аккаунт не создать
  await expect(reg.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  await reg.getByTestId('consent-privacy').click();
  await expect(page.getByTestId('privacy')).toContainText('Что мы храним');
  await expect(page.getByTestId('privacy')).toContainText('Upstash');
  await expect(page.getByTestId('privacy')).toContainText('за пределами России');
  await expect(page.getByTestId('privacy')).toContainText('ONREZA');
  // оператор и контакты — заглушки до решения владельца; знак маркировки — из одной константы (src/legal.js)
  await expect(page.getByTestId('privacy').getByTestId('operator')).toContainText('[ФИО/название]');
  await expect(page.getByTestId('privacy').getByTestId('operator')).toContainText('[адрес для обращений]');
  await expect(page.getByTestId('privacy').getByTestId('operator')).toContainText('[e-mail]');
  await expect(page.getByTestId('privacy').getByTestId('age-rating')).toContainText('[возрастная маркировка]');
  await page.getByTestId('privacy').getByRole('button', { name: 'Закрыть' }).click();
  await reg.getByTestId('consent-terms').click();
  await expect(page.getByTestId('terms')).toContainText('Учебная игра, не финансовый совет');
  await expect(page.getByTestId('terms').getByTestId('operator')).toContainText('Оператор и контакты');
  await expect(page.getByTestId('terms').getByTestId('age-rating')).toContainText('[возрастная маркировка]');
  await page.getByTestId('terms').getByRole('button', { name: 'Закрыть' }).click();
  await reg.getByTestId('consent-page').check();
  await expect(reg.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  await reg.getByTestId('consent-pd').check();
  // пароль — не короче 8 символов; «Показать пароль» открывает набранное, второе нажатие прячет
  const pw = reg.getByLabel('Пароль', { exact: true });
  await pw.fill('secret1');
  await expect(reg.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  await pw.fill('secret12');
  await expect(pw).toHaveAttribute('type', 'password');
  await reg.getByRole('button', { name: 'Показать пароль' }).click();
  await expect(pw).toHaveAttribute('type', 'text');
  await reg.getByRole('button', { name: 'Скрыть пароль' }).click();
  await expect(pw).toHaveAttribute('type', 'password');
  await reg.getByRole('button', { name: 'Создать аккаунт' }).click();
  // почты нет — код восстановления показывается один раз: скопировать, скачать .txt и «Я сохранил код»
  await expect(page.getByTestId('recovery-code')).toHaveText('ABCD-EFGH-JKMN');
  await expectGateOnly(page);
  await expect(page.getByRole('button', { name: 'Скопировать код' })).toBeVisible();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Скачать код .txt' }).click()]);
  expect(file.suggestedFilename()).toBe('inflatia-kod-anna.txt');
  const text = fs.readFileSync(await file.path(), 'utf8');
  expect(text).toContain('Код: ABCD-EFGH-JKMN');
  expect(text).toContain('Логин: anna');
  await page.getByRole('button', { name: 'Я сохранил код' }).click();
  // Путь; цель дня — минуты занятий (10 минут); урок гостя перешёл в аккаунт и засчитан
  await expect(page.getByTestId('path')).toBeVisible();
  await expect(page.getByTestId('goal')).toContainText('/10');
  await expect(page.getByTestId('guest-save')).toHaveCount(0);
  expect(await page.evaluate(() => (JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.lessons['sc-i1'] || {}).runs)).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('ems-guest'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-onboarding')))).toEqual({ goal: 'exam', minutes: 10, knows: false });

  // аккаунт — в профиле, под шестерёнкой; выход возвращает на приветствие
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await page.getByTestId('prof-account').click();
  const prof = page.getByRole('dialog', { name: 'Профиль' });
  await expect(prof.getByText('Кварталов по сети')).toBeVisible();
  await prof.getByRole('button', { name: 'Корона' }).click();
  await expect(prof.getByText('Сохранено')).toBeVisible();
  await prof.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expectGateOnly(page);

  // «У меня уже есть аккаунт» → вход
  await page.getByRole('button', { name: 'У меня уже есть аккаунт' }).click();
  const login = page.getByTestId('welcome-login');
  await login.getByLabel('Логин').fill('anna');
  await login.getByLabel('Пароль', { exact: true }).fill('secret12');
  await login.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByTestId('path')).toBeVisible();

  // забыли пароль: логин, код и новый пароль → новый код → Путь
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await page.getByTestId('prof-account').click();
  await page.getByRole('dialog', { name: 'Профиль' }).getByRole('button', { name: 'Выйти' }).click();
  await page.getByRole('button', { name: 'У меня уже есть аккаунт' }).click();
  await page.getByRole('button', { name: 'Забыли пароль?' }).click();
  const rec = page.getByTestId('welcome-recover');
  await rec.getByLabel('Логин').fill('anna');
  await rec.getByLabel('Код восстановления').fill('abcd-efgh-jkmn');
  await rec.getByLabel('Новый пароль', { exact: true }).fill('fresh123');
  await rec.getByRole('button', { name: 'Задать пароль' }).click();
  await expect(page.getByTestId('recovery-code')).toHaveText('PQRS-TUVW-XYZ2');
  await page.getByRole('button', { name: 'Я сохранил код' }).click();
  await expect(page.getByTestId('path')).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('вход: до 14 лет — отдельный шаг «Подтверждение родителя», сервер получает отметку и имя', async ({ page }) => {
  let sent = null;
  await openApp(page, '/', (req) => {
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    if (body && body.action === 'register') sent = body;
    return accountApi(req);
  }, { tab: null });
  await page.getByRole('button', { name: 'Начать' }).click();
  const goal = page.getByTestId('welcome-goal');
  for (const g of ['Цель', 'Минут в день', 'Знания']) await goal.getByRole('group', { name: g }).getByRole('button').first().click();
  await goal.getByRole('button', { name: 'Продолжить' }).click();
  const reg = await guestToRegister(page);
  await reg.getByLabel('Логин').fill('kid');
  await reg.getByLabel('Пароль', { exact: true }).fill('secret12');
  await reg.getByTestId('birth-year').fill(String(new Date().getFullYear() - 12));
  await reg.getByTestId('consent-page').check();
  await reg.getByTestId('consent-pd').check();
  await reg.getByRole('button', { name: 'Дальше: подтверждение родителя' }).click();
  const parent = page.getByTestId('welcome-parent');
  await expect(parent.getByRole('heading', { name: 'Подтверждение родителя' })).toBeVisible();
  await expect(parent.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  await parent.getByTestId('parent-name').fill('Ольга Петрова');
  await expect(parent.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  await parent.getByTestId('parent-consent').check();
  // «назад» возвращает к форме, ответы не теряются
  await parent.locator('[data-nav="back"]').click();
  await expect(page.getByTestId('welcome-register').getByTestId('consent-pd')).toBeChecked();
  await page.getByRole('button', { name: 'Дальше: подтверждение родителя' }).click();
  await page.getByTestId('welcome-parent').getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByTestId('recovery-code')).toBeVisible();
  expect(sent).toMatchObject({ consentPage: true, consentPd: true, parentConsent: true, parentName: 'Ольга Петрова' });
});

test('вход: без аккаунта закрыто всё — и приглашение в сетевую комнату', async ({ page }) => {
  const { errors } = await openApp(page, '/?room=E2E', '{}', { tab: null });
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expectGateOnly(page);
  await expect(page.getByText('Минфин', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('нижняя панель: «Мир» без учебных карточек; «Задания»: повторение, итоговая проверка, вперемешку; «Мой прогресс» в учебнике', async ({ page }) => {
  const { errors, external } = await openApp(page);
  await expect(page.locator('.menu-section-label', { hasText: 'Модель в действии' })).toBeVisible();
  await expect(page.locator('.menu-section-label', { hasText: 'Играть' })).toBeVisible();
  await expect(page.locator('[data-mode="tutorial"]')).toContainText('Как играть');
  // учебник — своя вкладка внизу; «На сегодня» больше нет
  await expect(page.getByTestId('menu-study')).toHaveCount(0);
  await expect(page.locator('[data-mode="textbook"]')).toHaveCount(0);
  await expect(page.locator('[data-mode="lab"]')).toBeVisible();
  // Мир открыт — подпись пятой вкладки не меняется: «Ещё»; открытый пункт подсвечен в меню
  await expect(page.getByTestId('bottom-nav').locator('[data-tab]')).toHaveText(['Путь', 'Учебник', 'Лиги', 'Лавка', 'Ещё']);
  await page.getByTestId('bottom-nav').locator('[data-tab="more"]').click();
  await expect(page.getByTestId('more-menu').locator('[data-tab="world"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('more-menu').locator('[data-tab="world"]')).toContainText('сейчас открыто');
  await expect(page.getByTestId('more-menu').locator('[data-tab="profile"]')).not.toHaveAttribute('aria-current', 'page');
  await page.getByTestId('bottom-nav').locator('[data-tab="more"]').click();
  await expect(page.getByTestId('more-menu')).toHaveCount(0);
  await openTasks(page);
  await expect(page.getByTestId('practice-today')).toHaveCount(0);
  // повторять пока нечего — кнопка выключена
  await expect(page.getByTestId('practice-review')).toBeDisabled();
  await expect(page.getByTestId('practice-review')).toContainText('Сегодня повторять нечего');
  // вперемешку: пока ни одна глава не начата — не из чего выбирать
  await page.getByTestId('practice-mixed').click();
  await expect(page.getByTestId('mixed')).toContainText('Пока не из чего выбирать');
  await expectNoSidewaysScroll(page);
  await bookBack(page);
  // итоговая проверка: без подсказок и решений до конца, в конце — счёт по темам
  await page.getByTestId('practice-exam').click();
  const exam = page.getByTestId('exam');
  await expect(exam.getByTestId('exam-problem')).toHaveCount(24);
  await expect(exam.getByRole('button', { name: /^Подсказка/ })).toHaveCount(0);
  await expect(exam.getByRole('button', { name: 'Решение' })).toHaveCount(0);
  // заведомо неверный ответ: «1» бывал верным (задача «Рынка труда» с ответом 1 — «Верно 1 из 24»)
  await exam.getByRole('textbox', { name: 'Проверка, ответ к задаче 1' }).or(exam.getByRole('textbox', { name: 'Проверка, задача 1, шаг а)' })).first().fill('98765');
  await exam.getByRole('button', { name: 'Завершить проверку' }).click();
  await expect(exam.getByTestId('exam-result')).toContainText('Верно 0 из 24');
  await expect(exam.getByTestId('exam-weak')).toContainText('Слабое место');
  await expect(exam.getByRole('button', { name: 'Решение' })).toHaveCount(24);
  await expectNoSidewaysScroll(page);
  // пересдача — те же темы, новые числа
  const before = await exam.getByTestId('exam-problem').allInnerTexts();
  await exam.getByRole('button', { name: 'Пересдать с новыми числами' }).click();
  await expect(exam.getByTestId('exam-result')).toHaveCount(0);
  await expect(exam.getByTestId('exam-problem')).toHaveCount(24);
  const after = await exam.getByTestId('exam-problem').allInnerTexts();
  expect(after.filter((t, i) => t === before[i]).length).toBeLessThan(3);
  await exam.getByRole('button', { name: 'Завершить проверку' }).click();
  await bookBack(page);
  // «Мой прогресс» — внизу оглавления учебника: слабые темы со ссылками и журнал
  await openBook(page);
  await page.getByTestId('tb-stats-link').click();
  const stats = page.getByTestId('stats');
  await expect(stats.getByTestId('stats-weak').getByRole('button')).toHaveCount(3);
  await expect(stats.getByTestId('tb-journal')).toContainText('За четыре недели');
  await stats.getByTestId('stats-weak').getByRole('button').first().click();
  await expect(page.getByTestId('chapter')).toBeVisible();
  await page.getByTestId('chapter').getByRole('button', { name: 'Отметить главу прочитанной' }).click();
  // вперемешку: теперь глава прочитана — сначала выбор модели, потом задача
  await openTasks(page);
  await page.getByTestId('practice-mixed').click();
  const item = page.getByTestId('mixed-item').first();
  await expect(item).toContainText('какая модель нужна');
  await item.getByRole('group').getByRole('button').first().click();
  await expect(item.getByTestId('mixed-model')).toBeVisible();
  await expect(item.getByTestId('tb-problem')).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('урок, пройденный на другом устройстве, появляется сам — при возвращении на вкладку, без перезагрузки', async ({ page }) => {
  await page.clock.install();
  let other = false;
  const api = (req) => {
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /* GET */ }
    if (body.action !== 'progress') return '{}';
    const tb = body.progress.textbook || {};
    // на телефоне тем временем пройден первый урок
    const learn = other ? { ...tb.learn, lessons: { ...tb.learn?.lessons, 'sc-i1': { at: Date.now() - 60000, runs: 1, best: 90 } } } : tb.learn;
    return JSON.stringify({ profile: { ...body.progress, textbook: { ...tb, learn } } });
  };
  const { errors } = await openApp(page, '/', api, { tab: 'path' });
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'open');
  other = true;
  await page.clock.fastForward(30000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(pathNode(page, 'sc-i1')).toHaveAttribute('data-state', 'done');
  expect(errors).toEqual([]);
});

test('настройки: одна полоса прокрутки — страница под экраном настроек не прокручивается, после «назад» — снова прокручивается', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  const htmlOverflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
  expect(await htmlOverflow()).not.toBe('hidden');
  await page.getByTestId('prof-settings-open').click();
  const set = page.getByTestId('settings');
  await expect(set).toBeVisible();
  expect(await htmlOverflow()).toBe('hidden');
  // прокручивается сам экран настроек
  expect(await set.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  await set.locator('[data-nav="back"]').first().click();
  await expect(set).toHaveCount(0);
  expect(await htmlOverflow()).not.toBe('hidden');
  expect(errors).toEqual([]);
});

/* Персональная программа и награды: регистрация с «Кое-что знаю» → вступительный тест
   открывает известный юнит → сундук, задания дня, монеты и лавка с курсом; назавтра —
   утренний экран серии. */
test('вход: программа — вступительный тест, сундук, задания дня, монеты, лавка, утренний экран серии', async ({ page }) => {
  test.setTimeout(150_000);
  await withTestFlag(page);
  const { errors, external } = await openApp(page, '/', accountApi, { tab: null });
  await page.getByRole('button', { name: 'Начать' }).click();
  const goal = page.getByTestId('welcome-goal');
  await goal.getByRole('group', { name: 'Цель' }).getByRole('button', { name: 'Олимпиада' }).click();
  await goal.getByRole('group', { name: 'Минут в день' }).getByRole('button', { name: '15 минут' }).click();
  await goal.getByRole('group', { name: 'Знания' }).getByRole('button', { name: 'Кое-что знаю' }).click();
  await goal.getByRole('button', { name: 'Продолжить' }).click();
  const reg = await guestToRegister(page);
  await reg.getByLabel('Логин').fill('anna');
  await reg.getByLabel('Пароль', { exact: true }).fill('secret12');
  await reg.getByTestId('birth-year').fill('2000');
  await reg.getByTestId('consent-page').check();
  await reg.getByTestId('consent-pd').check();
  await reg.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.getByRole('button', { name: 'Я сохранил код' }).click();
  await expect(page.getByTestId('path')).toBeVisible();
  // ответы при регистрации — в программе ученика: цель дня — 15 минут занятий
  await expect(page.getByTestId('goal')).toContainText('0/15');
  // наверху Пути — уровень в курсе вместо опыта и монет: до первого урока — 0 ед. из 1000, без ступеней
  await expect(page.getByTestId('wallet-balance')).toHaveCount(0);
  await expect(page.getByTestId('course-level')).toHaveAttribute('data-done', '0');
  await expect(page.getByTestId('course-points')).toHaveText('0');
  await expect(page.getByTestId('course-level')).toContainText('Уровень знаний');
  await expect(page.getByTestId('course-level')).not.toContainText('A1');
  await expect(page.getByTestId('chest')).toHaveCount(0);
  // задания дня и испытание месяца — экран «Задания» с карточки наверху Пути; испытание считается от цели в минутах
  await expect(page.getByTestId('quests')).toHaveCount(0);
  await openTasks(page);
  await expect(page.getByTestId('quests').getByTestId('quest')).toHaveCount(3);
  await expect(page.getByTestId('goal-row')).toContainText('Цель дня: 15 минут занятий');
  await expect(page.getByTestId('month')).toBeVisible();
  // новичок за неделю до конца месяца (по всемирному времени) испытания не получает: первое — с 1-го числа
  const nowUtc = new Date(); const daysLeft = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth() + 1, 0)).getUTCDate() - nowUtc.getUTCDate() + 1;
  if (daysLeft < 7) {
    await expect(page.getByTestId('month')).toHaveAttribute('data-waiting', 'true');
    await expect(page.getByTestId('month-title')).toContainText('Первое испытание — с 1 ');
  // вид испытания выпадает по месяцу: объёмное объясняется целью дня, «постоянство» — днями месяца
  } else await expect(page.getByTestId('month-why')).toContainText(/15 минут в день|Испытание постоянства/);
  await openTab(page, 'path');

  // вступительный тест: юнит 1 — без ошибок, юнит 2 — две ошибки подряд: тест заканчивается
  await expect(page.getByTestId('placement-card')).toBeVisible();
  await page.getByTestId('placement-start').click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-mode', 'placement');
  for (let i = 0; i < 5; i += 1) { await answerExercise(page); await page.getByRole('button', { name: 'Дальше', exact: true }).click(); }
  for (let i = 0; i < 2; i += 1) { await answerExercise(page, { wrong: true }); await page.getByRole('button', { name: 'Дальше', exact: true }).click(); }
  const result = page.getByTestId('lesson-result');
  await expect(result).toContainText('Тест пройден');
  await expect(result.getByTestId('result-text')).toContainText('«Мастерская»');
  await expect(result.getByTestId('result-text')).not.toContainText('«Биржа труда»');
  // тест ничего не раздаёт: ни монет, ни печатей
  await expect(result.getByTestId('result-coins')).toHaveCount(0);
  await result.getByRole('button', { name: 'Дальше', exact: true }).click();
  // уроки юнита 1 открыты, но не пройдены; юнит 2 открыт с начала; приглашения на тест больше нет
  await expect(page.getByTestId('placement-card')).toHaveCount(0);
  await expect(page.locator('[data-testid="path-unit"][data-unit="scarcity"] [data-testid="path-lesson"][data-state="open"]')).toHaveCount(15);
  await expect(page.locator('[data-testid="path-unit"][data-unit="scarcity"] [data-testid="path-lesson"][data-state="done"]')).toHaveCount(0);
  await expect(page.getByTestId('path-rec')).toHaveText(/рекомендуем/i);
  await showUnit(page, 'labor');
  await expect(pathNode(page, 'lm-i1')).toHaveAttribute('data-state', 'open');
  // сундук — только за по-настоящему пройденный юнит
  await expect(page.getByTestId('chest')).toHaveCount(0);

  // первый урок юнита 2 («Биржа труда»): монеты за урок и выполненные задания
  await startLesson(page, 'lm-i1');
  await playLesson(page);
  await expect(page.getByTestId('result-coins')).toContainText('За урок');
  await page.getByTestId('lesson-result').getByRole('button', { name: 'Дальше', exact: true }).click();

  // лавка — отдельная вкладка: курс дня и график, страховка серии по курсу, наряд Инфли (монеты — как будто накоплены)
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    p.learn.coins = { ...p.learn.coins, '2026-01-01': 500 };
    localStorage.setItem('ems-textbook-v1', JSON.stringify(p));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'shop');
  const shop = page.getByTestId('shop');
  await expect(shop.getByTestId('rate-value')).toContainText(/1 крона = \d,\d\d монеты/);
  // инфляция в Лавке: строка под курсом — за этот месяц и с октября 2026; в раскрытом курсе — что это значит
  await expect(shop.getByTestId('shop-inflation')).toContainText(/Инфляция в Лавке(: за [а-я]+ \+\d+,\d%, с октября 2026 \+\d+,\d%|: цены держатся| — с ноября 2026)/);
  // лавка короткая: график курса и «что такое кроны» — по касанию курса
  await expect(shop.getByTestId('rate-chart')).toHaveCount(0);
  await shop.getByTestId('rate-toggle').click();
  await expect(shop.getByTestId('coins-crowns')).toBeVisible();
  await expect(shop.getByTestId('rate-chart')).toBeVisible();
  await expect(shop.getByTestId('shop-inflation-more')).toContainText('в копилке растут быстрее цен');
  // индексация наград: каждый месяц — на инфляцию прошлого (пункт 3 от 06.11)
  await expect(shop.getByTestId('reward-index')).toContainText(/Награды за учёбу(: \+\d+,\d% к начальным| растут вслед за ценами)/);
  await expect(shop.getByTestId('shop-inflation-more')).toContainText('Награды за учёбу догоняют цены с опозданием на месяц');
  // палец ведёт по графику — текст вокруг не выделяется
  expect(await shop.locator('.rw-rate-box').evaluate((el) => getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect)).toBe('none');
  // подсказка графика курса у правого края не расширяет страницу (иначе телефон перемасштабирует её и панель внизу «уезжает»)
  const chartBox = await shop.getByTestId('rate-chart').boundingBox();
  for (const fx of [0.02, 0.5, 0.9, 0.99]) {
    await shop.getByTestId('rate-chart').hover({ position: { x: Math.round(chartBox.width * fx), y: 30 } });
    await expect(shop.getByTestId('rate-tip')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `подсказка на ${fx}`).toBe(true);
  }
  // страховка серии — полис: первый взнос сразу, дальше по неделям; расторгнуть можно в любой момент
  await shopTab(page, 'useful');
  const coins = Number(await shop.getByTestId('shop-balance').innerText().then((t) => t.replace(/\D/g, '')));
  await shop.getByTestId('policy-take').click();
  await expect(shop.getByTestId('shop-msg')).toContainText('Полис оформлен');
  await expect(shop.getByTestId('policy-on')).toBeVisible();
  await expect(shop.getByTestId('policy-stats')).toContainText('Всего взносов: 8');
  const premiums = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.premiums || {}));
  expect(premiums).toEqual([8]);
  expect(coins).toBeGreaterThan(8);
  await shop.getByTestId('policy-cancel').click();
  await expect(shop.getByTestId('shop-freeze')).toHaveAttribute('data-policy', 'off');
  await expect(shop.getByTestId('policy-take')).toBeVisible();
  await expectNoSidewaysScroll(page);

  // профиль: программа с ответами регистрации — в настройках под шестерёнкой
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  const prog = page.getByTestId('prof-program');
  await expect(prog.getByRole('group', { name: 'Цель' }).getByRole('button', { name: 'Олимпиада' })).toHaveAttribute('aria-pressed', 'true');
  await expect(prog.getByRole('group', { name: 'Минут в день' }).getByRole('button', { name: /15 мин/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('settings').locator('[data-nav="back"]').click();
  // печати: в профиле — короткий ряд, «Все» — весь список
  await expect(page.getByTestId('prof-seals').getByTestId('ach-mini')).toHaveCount(4);
  await page.getByTestId('prof-seals-all').click();
  // печать «Знаток» — только за проверку юнита без ошибок, вступительный тест её не даёт
  await expect(page.locator('[data-testid=ach][data-ach="ace"]')).toHaveAttribute('data-got', 'false');
  await expect(page.locator('[data-testid=ach][data-ach="shop"]')).toHaveAttribute('data-got', 'true');
  // полученная печать — цветная, без мелкого текста по кругу; неполученная — отдельно, с замком; под ней — только название
  await expect(page.locator('[data-testid=ach][data-ach="shop"] svg[data-got="true"]')).toHaveCount(1);
  await expect(page.locator('[data-testid=ach][data-ach="ace"] svg[data-got="false"]')).toHaveCount(1);
  await expect(page.locator('.rw-stamps-locked [data-ach="ace"]')).toHaveText('Знаток');
  await expect(page.getByTestId('achievements').locator('textPath')).toHaveCount(0);
  // касание — печать крупно: «как получить» у неполученной, дата у полученной
  await page.locator('[data-testid=ach][data-ach="ace"]').click();
  await expect(page.getByTestId('item-how')).toContainText('Сдайте проверку юнита без единой ошибки');
  await page.getByTestId('item-sheet').getByRole('button', { name: 'Хорошо' }).click();
  await page.locator('[data-testid=ach][data-ach="shop"]').click();
  await expect(page.getByTestId('item-date')).toContainText(/Получена \d+ [а-я]+ \d{4}/);
  await page.getByTestId('item-sheet').getByRole('button', { name: 'Хорошо' }).click();
  await page.getByTestId('collection').locator('[data-nav="back"]').click();

  // назавтра: утренний экран серии — один раз в день. Состояние пишется до загрузки страницы:
  // правка из page.evaluate могла быть затёрта сохранением, которое приложение успевало сделать
  await page.addInitScript(() => {
    if (sessionStorage.getItem('morning-seeded')) return;
    sessionStorage.setItem('morning-seeded', '1');
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    const d = new Date(Date.now() - 86400000); const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const t = new Date(); const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    p.learn.done = { [y]: 2 }; p.learn.daily = {}; delete p.learn.done[today];
    localStorage.setItem('ems-textbook-v1', JSON.stringify(p));
    localStorage.setItem('ems-learn-morning', y);
  });
  // утренний экран — на Пути; перезагрузка осталась бы на профиле (docs/mechanics.md, «Адреса и история»)
  await page.goto('/', { waitUntil: 'networkidle' });
  const morning = page.getByTestId('morning');
  await expect(morning).toBeVisible();
  await expect(morning.getByTestId('morning-days')).toHaveAttribute('data-value', '1');
  await expect(morning).toContainText('день подряд');
  await expect(morning.getByTestId('morning-week').locator('.rw-dot')).toHaveCount(7);
  await page.getByTestId('morning-go').click();
  await expect(morning).toHaveCount(0);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  await expect(page.getByTestId('morning')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('навигация: у каждого экрана один «назад» туда, откуда пришли, и нет двух путей в одно место', async ({ page }) => {
  /* обход всех экранов одним сеансом (в конце — проверка, что обойдены все из src/learn/screens.js) — около
     сорока переходов; в WebKit (iPhone) это дольше минуты, и тест падал по таймауту в конце обхода
     (smoke :3029 на webkit). Сеанс делить нельзя — в WebKit у теста тройной бюджет, в Chromium — обычный. */
  slowInWebkit();
  await withTestFlag(page);
  // юнит 1 пройден — в конце его дороги сундук
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', accountApi, { tab: 'path' });
  const seen = new Set();
  await expectScreen(page, 'path', seen);
  // на Пути текущий уровень — Базовый; плашка уровня → список уровней → пройденный Начальный
  await expect(page.getByTestId('level-switch')).toHaveAttribute('data-level', 'basic');
  await page.getByTestId('level-switch-open').click();
  await expectScreen(page, 'levelPicker', seen);
  await page.locator('[data-testid=level-pick][data-level="start"]').click();
  await expect(page.getByTestId('level-picker')).toHaveCount(0);
  await expect(page.getByTestId('path-unit').first()).toHaveAttribute('data-unit', 'scarcity');
  await expectScreen(page, 'path', seen);
  // Путь → карточка урока → назад
  await pathNode(page, 'sc-i1').click();
  await expectScreen(page, 'lessonCard', seen);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // Путь → карточка → урок → назад (до первого ответа — сразу)
  await startLesson(page, 'sc-i1');
  await expectScreen(page, 'lesson', seen);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // Путь → гайд юнита → назад: у справочника поверх экрана один «назад», оглавления на странице нет
  await page.getByTestId('path-unit').first().getByTestId('unit-guide').click();
  // учебник грузится по требованию — ждём главу
  await expect(page.getByTestId('chapter')).toBeVisible();
  await expectScreen(page, 'book', seen);
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'scarcity');
  await expect(page.getByTestId('tb-toc')).toHaveCount(0);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // лиги и лавка — вкладки нижней панели; Путь → сундук → назад
  await openTab(page, 'league');
  await expectScreen(page, 'league', seen);
  await openTab(page, 'shop');
  await expectScreen(page, 'shop', seen);
  await openTab(page, 'path');
  await expectScreen(page, 'path', seen);
  await page.getByTestId('chest').first().click();
  await expectScreen(page, 'chest', seen);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // Путь → Задания (карточка наверху) → задачи вперемешку → назад в Задания → назад на Путь
  await page.getByTestId('tasks-card').click();
  await expectScreen(page, 'tasks', seen);
  await page.getByTestId('practice-mixed').click();
  await expectScreen(page, 'book', seen);
  await clickBack(page);
  await expectScreen(page, 'tasks', seen);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // повторное нажатие на вкладку «Путь» тоже закрывает Задания
  await page.getByTestId('tasks-card').click();
  await openTab(page, 'path');
  await expectScreen(page, 'path', seen);
  // вкладка «Учебник»: оглавление без «назад», глава — один «назад» в оглавление
  await openTab(page, 'book');
  await expectScreen(page, 'bookTab', seen);
  // оглавление — по уровням курса и в его порядке; недописанные главы — свёрнутым списком в конце
  const groups = page.getByTestId('tb-level-group');
  await expect(groups.first()).toHaveAttribute('data-level', 'start');
  await expect(groups.nth(1)).toContainText('Базовый');
  expect(await groups.nth(1).locator('[data-chapter]').evaluateAll((els) => els.map((e) => e.dataset.chapter))).toEqual(['supply-demand', 'elasticity', 'market-failures', 'money-banks', 'inflation']);
  await expect(page.getByTestId('textbook').getByText('Открытая экономика')).toHaveCount(0);
  await page.getByTestId('tb-planned').getByRole('button').click();
  await expect(page.getByTestId('tb-planned-list')).toContainText('Открытая экономика');
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  await expectScreen(page, 'bookPage', seen);
  await clickBack(page);
  await expectScreen(page, 'bookTab', seen);
  await expect(page.getByTestId('textbook')).toBeVisible();
  // Профиль → прогресс в учебнике → назад; Профиль → аккаунт → назад
  await openTab(page, 'profile');
  await expectScreen(page, 'profile', seen);
  await page.getByTestId('prof-book-stats').click();
  await expectScreen(page, 'book', seen);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  // Профиль → шестерёнка → настройки → аккаунт → назад в настройки → назад в профиль
  await page.getByTestId('prof-settings-open').click();
  await expectScreen(page, 'settings', seen);
  await page.getByTestId('prof-account').click();
  await expectScreen(page, 'account', seen);
  // в аккаунте нет счётчика, который стыдит
  await expect(page.getByTestId('account')).not.toContainText('Выходов из партий');
  await clickBack(page);
  await expectScreen(page, 'settings', seen);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  // Профиль → «Все» у печатей → весь список → печать крупно → назад в список → назад в профиль
  await page.getByTestId('prof-seals-all').click();
  await expectScreen(page, 'collection', seen);
  await page.getByTestId('collection').locator('[data-testid=ach]').first().click();
  await expectScreen(page, 'item', seen);
  await clickBack(page);
  await expectScreen(page, 'collection', seen);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  // марка из короткого ряда альбома — сразу крупно; колокольчик — уведомления; назад — в профиль
  await page.getByTestId('album-stamp').first().click();
  await expectScreen(page, 'item', seen);
  // крупная марка цела (пункт владельца 15.11): здание не наезжает ни на строку «Почта Инфляции», ни на подпись
  await page.waitForTimeout(800); // марка «падает» с увеличением — меряем, когда встала
  const parts = await page.locator('.pf-stamp.big').first().evaluate((el) => {
    const r = (q) => el.querySelector(q).getBoundingClientRect();
    return { top: r('.pf-stamp-top').bottom, art0: r('[data-testid=engraving]').top, art1: r('[data-testid=engraving]').bottom, cap: r('.pf-stamp-cap').top };
  });
  // марка повёрнута на 2° — у рамок элементов запас в несколько пикселей
  expect(parts.art0).toBeGreaterThanOrEqual(parts.top - 6);
  expect(parts.art1).toBeLessThanOrEqual(parts.cap + 6);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  await page.getByTestId('prof-bell').click();
  await expectScreen(page, 'notifications', seen);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  // Профиль → «Друзья» → профиль друга → назад в список → назад в профиль
  await page.getByTestId('prof-friends').click();
  await expectScreen(page, 'friends', seen);
  await page.getByTestId('friend-row').first().click();
  await expectScreen(page, 'friend', seen);
  await clickBack(page);
  await expectScreen(page, 'friends', seen);
  await clickBack(page);
  await expectScreen(page, 'profile', seen);
  // Новости — вкладка под «⋯»; колокольчик на Пути — те же уведомления, «назад» — на Путь
  await openTab(page, 'news');
  await expectScreen(page, 'news', seen);
  await openTab(page, 'path');
  await page.getByTestId('bell').click();
  await expectScreen(page, 'notifications', seen);
  await clickBack(page);
  await expectScreen(page, 'path', seen);
  // Мир — корень без «назад»; профиль игрока — только во вкладке «Профиль»
  await openTab(page, 'world');
  await expectScreen(page, 'world', seen);
  await expect(page.getByRole('button', { name: /Войти в профиль|Профиль:/ })).toHaveCount(0);
  // смена вкладки закрывает подэкран: учебник не остаётся висеть под другой вкладкой
  await openTab(page, 'profile');
  await page.getByTestId('prof-book-stats').click();
  await openTab(page, 'path');
  await expect(page.getByTestId('learn-book')).toHaveCount(0);
  // учебник поверх профиля: внизу горит «Учебник», касание по нему — оглавление учебника, а не пустое нажатие
  await openTab(page, 'profile');
  await page.getByTestId('prof-book-stats').click();
  await page.getByTestId('bottom-nav').locator('[data-tab="book"]').click();
  await expect(page.getByTestId('learn-book')).toHaveCount(0);
  await expect(page.getByTestId('book-tab').getByTestId('textbook')).toBeVisible();
  // обойдены все экраны после входа
  expect([...seen].sort()).toEqual(Object.keys(SCREENS).filter((k) => !SCREENS[k].gate && !SCREENS[k].owner).sort());
  expect(errors).toEqual([]);
});

test('вход: экраны до входа — у каждого один «назад» туда, откуда пришли', async ({ page }) => {
  const { errors } = await openApp(page, '/', accountApi, { tab: null });
  const seen = new Set();
  await expectScreen(page, 'welcome', seen);
  await page.getByRole('button', { name: 'Начать' }).click();
  await expectScreen(page, 'welcome-goal', seen);
  for (const g of ['Цель', 'Минут в день', 'Знания']) await page.getByRole('group', { name: g }).getByRole('button').first().click();
  await clickBack(page);
  await expectScreen(page, 'welcome', seen);
  await page.getByRole('button', { name: 'Начать' }).click();
  for (const g of ['Цель', 'Минут в день', 'Знания']) await page.getByRole('group', { name: g }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  // гость: урок → Путь → «Сохраните прогресс» → регистрация; «назад» с неё — обратно на Путь
  await guestToRegister(page);
  await expectScreen(page, 'welcome-register', seen);
  await clickBack(page);
  await expect(page.getByTestId('path')).toBeVisible();
  await page.getByTestId('guest-register').click();
  await expectScreen(page, 'welcome-register', seen);
  // выйти из гостя нельзя кнопкой, но вход доступен: сбросим гостя и вернёмся к приветствию
  await page.evaluate(() => localStorage.removeItem('ems-guest'));
  await page.reload({ waitUntil: 'networkidle' });
  await expectScreen(page, 'welcome', seen);
  await page.getByRole('button', { name: 'У меня уже есть аккаунт' }).click();
  await expectScreen(page, 'welcome-login', seen);
  await page.getByRole('button', { name: 'Забыли пароль?' }).click();
  await expectScreen(page, 'welcome-recover', seen);
  await clickBack(page);
  await expectScreen(page, 'welcome-login', seen);
  await clickBack(page);
  await expectScreen(page, 'welcome', seen);
  expect([...seen].sort()).toEqual(Object.keys(SCREENS).filter((k) => SCREENS[k].gate).sort());
  expect(errors).toEqual([]);
});

test('анимации выключены, если в системе «уменьшить движение»', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withTestFlag(page);
  // вчера занимался — утром экран серии
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const d = new Date(Date.now() - 86400000); const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { done: { [y]: 1 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const anim = (loc, pseudo = null) => loc.evaluate((el, p) => getComputedStyle(el, p).animationName, pseudo);
  await expect(page.getByTestId('morning')).toBeVisible();
  // билет не выезжает, огонёк-гравюра не колышется, печать не проставляется, цифры не падают — сразу на месте
  expect(await anim(page.locator('.rw-ticket'))).toBe('none');
  expect(await anim(page.locator('.rw-flame'))).toBe('none');
  expect(await anim(page.locator('.rw-flame path').first())).toBe('none');
  expect(await anim(page.locator('.rw-days span').first())).toBe('none');
  await expect(page.getByTestId('morning-days')).toHaveAttribute('data-value', '1');
  await page.getByTestId('morning-go').click();
  await expect(page.getByTestId('path')).toBeVisible();
  expect(await anim(pathNode(page, 'sc-i1'))).toBe('none');
  expect(await anim(pathNode(page, 'sc-i1'), '::after')).toBe('none');
  expect(await anim(page.locator('.ln-pin').first())).toBe('none');
  expect(await anim(page.locator('.infla-eyes').first())).toBe('none');
  await startLesson(page, 'sc-i1');
  await page.getByRole('button', { name: 'Понятно' }).click();
  await answerExercise(page, { wrong: true });
  expect(await anim(page.getByTestId('ex'))).toBe('none');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await playLesson(page);
  // без монет, опыт — сразу итоговым числом
  await expect(page.getByTestId('coins')).toHaveCount(0);
  const xp = page.getByTestId('result-xp').locator('[data-value]');
  await expect(xp).toHaveText(`+${await xp.getAttribute('data-value')}`);
  expect(errors).toEqual([]);
});

test.describe('офлайн', () => {
  test.use({ serviceWorkers: 'allow' });
  test('приложение ставится на экран: манифест, service worker, урок открывается без сети', async ({ page, context }) => {
    await context.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto('/', { waitUntil: 'networkidle' });
    const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
    expect(manifest.display).toBe('standalone');
    // светлая тема — по умолчанию: и манифест, и строка браузера; цвет строки — один, без привязки к теме системы
    expect([manifest.theme_color, manifest.background_color]).toEqual(['#FFF8EE', '#FFF8EE']);
    expect(await page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((e) => e.media || ''))).toEqual(['']);
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.ready);
    // со второго открытия страницей управляет service worker и складывает файлы в кэш
    await page.reload({ waitUntil: 'networkidle' });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expect(page.getByTestId('path')).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('path')).toBeVisible();
    await page.getByTestId('path').getByTestId('path-lesson').first().click();
    await page.getByTestId('lesson-start').click();
    await expect(page.getByTestId('lesson-card')).toBeVisible();
    await context.setOffline(false);
  });
});

test('адреса: «назад» из главы ведёт в оглавление, перезагрузка в главе — та же глава', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTab(page, 'book');
  await expect(page.getByTestId('textbook')).toBeVisible();
  expect(pathOf(page)).toBe('/book');
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  await expect(page.getByTestId('chapter')).toBeVisible();
  expect(pathOf(page)).toBe('/book/supply-demand');
  // перезагрузка — та же глава по тому же адресу
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('chapter')).toBeVisible();
  await expect(page.getByTestId('tb-topbar')).toContainText('Спрос и предложение');
  expect(pathOf(page)).toBe('/book/supply-demand');
  // «Назад» браузера — оглавление, не уход с сайта
  await page.goBack();
  await expect(page.getByTestId('textbook')).toBeVisible();
  await expect(page.getByTestId('chapter')).toHaveCount(0);
  expect(pathOf(page)).toBe('/book');
  // ещё раз — Путь; «Вперёд» дважды — снова глава
  await page.goBack();
  await expect(page.getByTestId('path')).toBeVisible();
  expect(pathOf(page)).toBe('/');
  await page.goForward(); await page.goForward();
  await expect(page.getByTestId('chapter')).toBeVisible();
  expect(pathOf(page)).toBe('/book/supply-demand');
  expect(errors).toEqual([]);
});

test('адреса: прямая ссылка на главу открывает главу; «назад» в ней — в оглавление; у каждой вкладки свой адрес', async ({ page }) => {
  const { errors } = await openApp(page, '/book/elasticity', '{}', { tab: null });
  await expect(page.getByTestId('chapter')).toBeVisible();
  await expect(page.getByTestId('tb-topbar')).toContainText('Эластичность');
  await expect(page.getByTestId('bottom-nav').locator('[data-tab="book"]')).toHaveAttribute('aria-current', 'page');
  await bookBack(page);
  await expect(page.getByTestId('textbook')).toBeVisible();
  expect(pathOf(page)).toBe('/book');
  // вкладки: адрес меняется вместе с вкладкой, прямая ссылка открывает её
  for (const [tab, path, testid] of [['league', '/league', 'league'], ['shop', '/shop', 'shop'], ['profile', '/profile', 'learn-profile'], ['news', '/news', 'news'], ['world', '/world', 'world'], ['path', '/', 'path']]) {
    await openTab(page, tab);
    await expect(page.getByTestId(testid)).toBeVisible();
    expect(pathOf(page), tab).toBe(path);
  }
  for (const [path, testid] of [['/shop', 'shop'], ['/league', 'league'], ['/profile', 'learn-profile'], ['/news', 'news'], ['/world', 'world'], ['/book', 'textbook']]) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByTestId(testid), path).toBeVisible();
    expect(pathOf(page)).toBe(path);
  }
  // главы нет — оглавление; адреса нет — Путь
  await page.goto('/book/net-takoy-glavy', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('textbook')).toBeVisible();
  expect(pathOf(page)).toBe('/book');
  await page.goto('/chto-to', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  expect(pathOf(page)).toBe('/');
  expect(errors).toEqual([]);
});

test('адреса: карточка урока, урок и шторки — записи истории; «Назад» закрывает верхний слой и не уводит с сайта', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.getByTestId('path')).toBeVisible();
  // карточка урока: «Назад» закрывает её, Путь на месте
  await showUnit(page, 'scarcity');
  await pathNode(page, 'sc-i1').click();
  await expect(page.getByTestId('lesson-sheet')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('lesson-sheet')).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  expect(pathOf(page)).toBe('/');
  // урок: до первого ответа «Назад» закрывает его сразу
  await startLesson(page, 'sc-i1');
  await page.goBack();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  // задания поверх Пути и шторка списка уровней — тоже слои
  await page.getByTestId('tasks-card').click();
  await expect(page.getByTestId('tasks')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('tasks')).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  // слой закрыли кнопкой — его записи в истории нет: «Назад» с вкладки ведёт на прошлую вкладку, а не в закрытую шторку
  await openTab(page, 'shop');
  await expect(page.getByTestId('shop')).toBeVisible();
  await openTab(page, 'path');
  await pathNode(page, 'sc-i1').click();
  await expect(page.getByTestId('lesson-sheet')).toBeVisible();
  await page.getByTestId('lesson-sheet-back').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('lesson-sheet')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByTestId('shop')).toBeVisible();
  expect(pathOf(page)).toBe('/shop');
  expect(errors).toEqual([]);
});

test('адреса: посреди урока «Назад» спрашивает «Выйти из урока?», а не закрывает молча', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const lessons = Object.fromEntries(['sd-i1', 'sd-l1', 'sd-w', 'sd-i2'].map((id) => [id, { at, runs: 1, best: 90 }]));
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'supply-demand');
  await startLesson(page, 'sd-l3');
  const lesson = page.getByTestId('lesson');
  // первый ответ дан — урок начат
  await answerExercise(page);
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Выйти из урока?' })).toBeVisible();
  await expect(lesson).toBeVisible();
  // «Продолжить урок» — урок на месте; «Назад» снова спрашивает
  await page.getByRole('button', { name: 'Продолжить урок' }).click();
  await expect(page.getByRole('dialog', { name: 'Выйти из урока?' })).toHaveCount(0);
  // шторка закрылась кнопкой — её запись уходит из истории своим шагом назад; дать ему завершиться
  await page.waitForTimeout(400);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Выйти из урока?' })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  expect(pathOf(page)).toBe('/');
  expect(errors).toEqual([]);
});

test('адреса: из партии «Назад» выходит в меню «Мира»; партия ждёт в автосохранении и сама после перезагрузки не открывается', async ({ page }) => {
  const { errors } = await openApp(page);
  expect(pathOf(page)).toBe('/world');
  await startSoloGame(page);
  await page.goBack();
  await expect(page.getByTestId('world')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Завершить квартал и применить решения' })).toHaveCount(0);
  expect(pathOf(page)).toBe('/world');
  expect(await page.evaluate(() => !!localStorage.getItem('ems-autosave-v1'))).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('world')).toBeVisible();
  expect(errors).toEqual([]);
});

/* СТРОКА БРАУЗЕРА (docs/mechanics.md, «Доступность»; пункт владельца 13.11): theme-color — фон действующей темы приложения.
   Раньше он шёл за системой: при тёмной системе строка была тёмной (#0B0F17), а обучение — светлым. */
test('строка браузера: цвет — по теме приложения, а не системы: светлое обучение при тёмной системе, тёмная тема, «Мир»', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const bar = () => page.evaluate(() => { const m = document.querySelectorAll('meta[name="theme-color"]'); return { n: m.length, color: m[0].content.toUpperCase(), media: m[0].media || '' }; });
  const lum = (hex) => { const v = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((k) => parseInt(v.slice(k, k + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  // фон страницы и цвет строки — одного тона
  const pageBg = () => page.evaluate(() => { const el = document.querySelector('.ems-root') || document.body; const c = getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; });
  let b = await bar();
  expect(b).toMatchObject({ n: 1, media: '' });
  expect(lum(b.color), `Путь при тёмной системе: ${b.color}`).toBeGreaterThan(0.8);
  expect(await pageBg()).toBeGreaterThan(0.8);
  // тёмная тема обучения — строка тёмная
  await page.evaluate(() => localStorage.setItem('ems-learn-dark', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  b = await bar();
  expect(lum(b.color), `тёмная тема обучения: ${b.color}`).toBeLessThan(0.25);
  // обратно в светлую, вкладка «Мир» — цвет его темы; назад на Путь — снова светлый
  await page.evaluate(() => localStorage.removeItem('ems-learn-dark'));
  await page.reload({ waitUntil: 'networkidle' });
  await openTab(page, 'world');
  await expect(page.getByTestId('world')).toBeVisible();
  const world = await bar();
  expect(Math.abs(lum(world.color) - await pageBg()), `«Мир»: ${world.color}`).toBeLessThan(0.12);
  await openTab(page, 'path');
  await expect(page.getByTestId('path')).toBeVisible();
  expect(lum((await bar()).color)).toBeGreaterThan(0.8);
  expect(errors).toEqual([]);
});

/* ОШИБКИ ЭКРАНА (docs/mechanics.md, «Ошибки экрана»; пункт владельца 13.11): необработанная ошибка страницы уходит
   владельцам обезличенным сообщением — не больше трёх за открытие страницы, одна и та же — один раз. */
test('сбой экрана: window.onerror и unhandledrejection шлют обезличенное сообщение в api/reports; частота ограничена', async ({ page }) => {
  const sent = [];
  await page.route('**/api/**', (r) => {
    let body = null; try { body = r.request().postDataJSON(); } catch { body = null; }
    if (r.request().url().includes('/api/reports') && body && body.action === 'crash') sent.push(body);
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  // ошибка в обработчике и отклонённое обещание — с «личным» в тексте
  await page.evaluate(() => {
    setTimeout(() => { throw new Error('упало: https://example.org/x?token=secret123 anna@example.com'); }, 0);
    Promise.reject(new Error('обещание отклонено'));
  });
  await expect.poll(() => sent.length).toBe(2);
  const [a, b] = [sent.find((x) => x.kind === 'error'), sent.find((x) => x.kind === 'promise')];
  expect(a.message).toContain('упало: https://example.org/x');
  expect(a.message).not.toMatch(/secret123|anna@example\.com/);
  expect(b.message).toBe('обещание отклонено');
  // в сообщении — только ошибка, экран, сборка и устройство: ни логина, ни сессии
  for (const m of sent) {
    expect(Object.keys(m).sort()).toEqual(['action', 'build', 'device', 'kind', 'message', 'screen', 'stack', 'viewport']);
    expect(JSON.stringify(m)).not.toMatch(/tester|"t"|Тест/);
    expect(m.screen).toBe('/');
  }
  // та же ошибка снова — не шлётся; всего за открытие страницы — не больше трёх
  await page.evaluate(() => { for (let k = 0; k < 8; k += 1) setTimeout(() => { throw new Error(k < 2 ? 'обещание отклонено' : `ещё ${k}`); }, 0); });
  await page.waitForTimeout(800);
  expect(sent.length).toBe(3);
});

/* ССЫЛКИ И ПОИСК (docs/mechanics.md, «Ссылки и поиск»; пункт владельца 13.11). */
test('вход: ссылки и поиск — абсолютные og:image, og:url и canonical; robots.txt и sitemap.xml; документы с приветствия', async ({ page, request }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  await expect(page.getByTestId('welcome')).toBeVisible();
  const meta = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel=canonical]').href, ogUrl: document.querySelector('meta[property="og:url"]').content,
    ogImage: document.querySelector('meta[property="og:image"]').content, tw: document.querySelector('meta[name="twitter:image"]').content,
  }));
  for (const [k, v] of Object.entries(meta)) expect(v, k).toMatch(/^https?:\/\/[^/]+\//);
  expect(meta.ogImage).toMatch(/\/og-image\.png$/);
  expect((await request.get(meta.ogImage.replace(/^https?:\/\/[^/]+/, ''))).ok()).toBe(true);
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toMatch(/Disallow: \/api\/[\s\S]*Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  const map = await request.get('/sitemap.xml');
  expect(map.ok()).toBe(true);
  const xml = await map.text();
  for (const p of ['/', '/book', '/league', '/shop', '/profile', '/world', '/news', '/book/supply-demand']) expect(xml, p).toMatch(new RegExp(`<loc>https?://[^/<]+${p === '/' ? '/' : p}</loc>`));
  // документы — с первого экрана, до регистрации
  await page.getByTestId('welcome-privacy').click();
  await expect(page.getByTestId('privacy')).toBeVisible();
  await page.getByTestId('privacy').locator('[data-nav="back"]').click();
  await page.getByTestId('welcome-terms').click();
  await expect(page.getByTestId('terms')).toBeVisible();
  await page.getByTestId('terms').locator('[data-nav="back"]').click();
  await expect(page.getByTestId('welcome')).toBeVisible();
  expect(errors).toEqual([]);
});

test('адреса: canonical и og:url следуют за экраном — у главы учебника её собственный адрес', async ({ page }) => {
  const { errors } = await openApp(page, '/book/supply-demand', '{}', { tab: null });
  await expect(page.getByTestId('chapter')).toBeVisible();
  const canon = () => page.evaluate(() => [new URL(document.querySelector('link[rel=canonical]').href).pathname, new URL(document.querySelector('meta[property="og:url"]').content).pathname]);
  expect(await canon()).toEqual(['/book/supply-demand', '/book/supply-demand']);
  await openTab(page, 'shop');
  await expect(page.getByTestId('shop')).toBeVisible();
  expect(await canon()).toEqual(['/shop', '/shop']);
  await page.goBack();
  await expect(page.getByTestId('chapter')).toBeVisible();
  expect(await canon()).toEqual(['/book/supply-demand', '/book/supply-demand']);
  expect(errors).toEqual([]);
});

test('доступность: на каждом экране один h1, одна область main и первая ссылка «К содержимому»', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const check = async (name) => {
    await page.waitForTimeout(250);
    const l = await landmarks(page);
    expect(l.h1.length, `${name}: h1 — ${JSON.stringify(l.h1)}`).toBe(1);
    expect(l.main, `${name}: main`).toBe(1);
  };
  for (const [path, testid] of [['/', 'path'], ['/book', 'textbook'], ['/book/supply-demand', 'chapter'], ['/league', 'league'], ['/shop', 'shop'], ['/profile', 'learn-profile'], ['/news', 'news'], ['/world', 'world']]) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByTestId(testid)).toBeVisible();
    await check(path);
  }
  // ссылка «К содержимому» — первая остановка Tab; Enter ставит фокус в main
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  // Путь прокручен к текущему уроку — первое нажатие Tab всё равно ведёт на ссылку наверху
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('skip-link')).toBeFocused();
  await expect(page.getByTestId('skip-link')).toBeInViewport();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.tagName)).toBe('MAIN');
  expect(pathOf(page)).toBe('/');
  // задания поверх Пути, урок, анкета партии и партия
  await page.getByTestId('tasks-card').click();
  await expect(page.getByTestId('tasks')).toBeVisible();
  await check('задания');
  await page.goBack();
  await startLesson(page, 'sc-i1');
  await check('урок');
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await openTab(page, 'world');
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Вступление в должность' })).toBeVisible();
  await check('анкета');
  // карточки поста сообщают выбранный (aria-pressed) и выбираются с клавиатуры
  const cb = page.locator('[data-role="central_bank"]'); const fin = page.locator('[data-role="ministry_finance"]');
  await fin.focus(); await page.keyboard.press('Enter');
  await expect(fin).toHaveAttribute('aria-pressed', 'true');
  await expect(cb).toHaveAttribute('aria-pressed', 'false');
  await cb.focus(); await page.keyboard.press('Space');
  await expect(cb).toHaveAttribute('aria-pressed', 'true');
  await expect(fin).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('checkbox', { name: /Обучение по экрану/ }).uncheck();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  await expect(page.getByRole('button', { name: 'Завершить квартал и применить решения' })).toBeVisible();
  await check('партия');
  expect(errors).toEqual([]);
});

test('вход: доступность — на приветствии, выборе цели и форме входа один h1 и область main', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  await expect(page.getByTestId('welcome')).toBeVisible();
  for (const step of ['приветствие', 'цель', 'вход']) {
    if (step === 'цель') await page.getByRole('button', { name: 'Начать', exact: true }).click();
    if (step === 'вход') { await page.goBack(); await page.getByRole('button', { name: 'У меня уже есть аккаунт', exact: true }).click(); }
    await page.waitForTimeout(250);
    const l = await landmarks(page);
    expect(l.h1.length, `${step}: h1 — ${JSON.stringify(l.h1)}`).toBe(1);
    expect(l.main, `${step}: main`).toBe(1);
  }
  expect(errors).toEqual([]);
});

test('доступность: карточка урока — фокус внутри, Tab не уходит наружу, Esc закрывает, фокус возвращается на урок Пути', async ({ page, isMobile }) => {
  test.skip(isMobile, 'клавиатура');
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'scarcity');
  const node = pathNode(page, 'sc-i1');
  await node.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByTestId('lesson-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('aria-modal', 'true');
  const inside = () => page.evaluate(() => { const s = document.querySelector('[data-testid=lesson-sheet]'); return !!s && s.contains(document.activeElement); });
  expect(await inside(), 'фокус не в карточке').toBe(true);
  // Tab и Shift+Tab ходят по кругу внутри карточки
  for (let k = 0; k < 12; k += 1) { await page.keyboard.press('Tab'); expect(await inside(), `Tab ${k + 1}: фокус ушёл из карточки`).toBe(true); }
  for (let k = 0; k < 4; k += 1) { await page.keyboard.press('Shift+Tab'); expect(await inside()).toBe(true); }
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(node).toBeFocused();
  // закрытие «Назад» браузера возвращает фокус туда же
  await page.keyboard.press('Enter');
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(node).toBeFocused();
  expect(errors).toEqual([]);
});

test('доступность: во время урока нижняя панель недоступна с клавиатуры', async ({ page, isMobile }) => {
  test.skip(isMobile, 'клавиатура');
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-i1');
  const nav = page.getByTestId('bottom-nav');
  expect(await nav.evaluate((el) => !!el.closest('[inert]'))).toBe(true);
  // сорок нажатий Tab: фокус ни разу не на вкладке нижней панели
  for (let k = 0; k < 40; k += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!(document.activeElement && document.activeElement.closest('[data-testid=bottom-nav]'))), `Tab ${k + 1}`).toBe(false);
  }
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  expect(await nav.evaluate((el) => !!el.closest('[inert]'))).toBe(false);
  expect(errors).toEqual([]);
});

test('доступность: цели касания не меньше 44×44 — флажок жалобы, размер шрифта, музыка и звуки', async ({ page }) => {
  const { errors } = await openApp(page, '/book/supply-demand', '{}', { tab: null });
  await expect(page.getByTestId('chapter')).toBeVisible();
  const big = async (loc, name) => {
    const b = await loc.boundingBox();
    expect(b, `${name}: не на экране`).toBeTruthy();
    // дробные доли пикселя при масштабе экрана телефона — не в счёт
    expect(b.width, `${name}: ширина`).toBeGreaterThanOrEqual(43.9);
    expect(b.height, `${name}: высота`).toBeGreaterThanOrEqual(43.9);
  };
  await big(page.getByRole('button', { name: 'Мельче текст' }), 'мельче текст');
  await big(page.getByRole('button', { name: 'Крупнее текст' }), 'крупнее текст');
  await big(page.getByTestId('tb-reader-bar').getByTestId('music-btn'), 'музыка в учебнике');
  await big(page.getByTestId('tb-topbar').getByTestId('report-flag'), 'флажок страницы учебника');
  // флажок в уроке
  await page.goto('/', { waitUntil: 'networkidle' });
  await startLesson(page, 'sc-i1');
  await big(page.getByTestId('lesson').getByTestId('report-flag').first(), 'флажок в уроке');
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  // музыка и звуки в «Мире»
  await openTab(page, 'world');
  await expect(page.getByTestId('world')).toBeVisible();
  await big(page.getByTestId('music-btn').first(), 'музыка в «Мире»');
  expect(errors).toEqual([]);
});

/* Первый визит на телефоне (docs/mechanics.md, «Приветствие и загрузка»; пункт владельца 13.11): уведомление о памяти
   браузера стоит в потоке страницы и ничего не перекрывает — «Начать» и «У меня уже есть аккаунт» целиком на первом
   экране и нажимаются. Раньше плашка висела поверх низа экрана и на 360×640 лежала на кнопках. */
for (const [w, h] of [[360, 640], [390, 844]]) {
  test(`вход: первый визит на телефоне ${w}×${h} — плашка о памяти браузера в потоке страницы, «Начать» и «У меня уже есть аккаунт» целиком видны и нажимаются`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    // первый визит: ключа ems-storage-notice нет (скрипт страницы идёт после скрипта контекста)
    await page.addInitScript(() => { if (!sessionStorage.getItem('t-keep')) localStorage.removeItem('ems-storage-notice'); });
    const { errors } = await openApp(page, '/', '{}', { tab: null });
    const notice = page.getByTestId('storage-notice');
    const start = page.getByRole('button', { name: 'Начать', exact: true });
    const login = page.getByRole('button', { name: 'У меня уже есть аккаунт', exact: true });
    await expect(notice).toBeVisible();
    await page.waitForTimeout(1500); // приветствие проявляется по шагам
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const n = await notice.boundingBox();
    for (const btn of [start, login]) {
      await expect(btn).toBeInViewport({ ratio: 1 });
      const b = await btn.boundingBox();
      // целиком на первом экране и не под плашкой
      expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(h);
      const apart = b.y >= n.y + n.height - 0.5 || b.y + b.height <= n.y + 0.5 || b.x >= n.x + n.width || b.x + b.width <= n.x;
      expect(apart, 'кнопка под плашкой о памяти браузера').toBe(true);
      // по краям и в середине кнопки — сама кнопка, а не то, что лежит сверху (углы скруглены — точки чуть внутри)
      const own = await btn.evaluate((el) => {
        const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
        return [[r.left + 16, cy], [r.right - 16, cy], [cx, r.top + 5], [cx, r.bottom - 5], [cx, cy]]
          .every(([x, y]) => { const hit = document.elementFromPoint(x, y); return !!hit && el.contains(hit); });
      });
      expect(own, 'кнопка чем-то закрыта').toBe(true);
    }
    // плашка — в потоке: над приветствием, страница под неё подвинулась
    expect(await notice.evaluate((el) => getComputedStyle(el).position)).not.toBe('fixed');
    const brand = await page.getByTestId('brand').boundingBox();
    expect(n.y + n.height).toBeLessThanOrEqual(brand.y);
    await expectNoSidewaysScroll(page);
    // обе кнопки нажимаются, пока плашка ещё на экране
    await login.click();
    await expect(page.getByTestId('auth-to-register')).toBeVisible();
    await expect(notice).toBeVisible();
    await page.locator('[data-nav="back"]').filter({ visible: true }).click();
    await start.click();
    await expect(page.getByTestId('welcome-goal')).toBeVisible();
    // «Понятно» — полоса уходит, приветствие снова во весь экран
    await notice.getByTestId('storage-notice-ok').click();
    await expect(notice).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ems-notice-h'))).toBe('');
    expect(errors).toEqual([]);
  });
}

test('память браузера: уведомление один раз — cookie нет, «Подробнее» ведёт на страницу данных', async ({ page }) => {
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const note = page.getByTestId('storage-notice');
  await expect(note).toContainText('Cookie мы не используем');
  await note.getByTestId('storage-notice-more').click();
  await expect(page.getByTestId('privacy')).toContainText('Cookie и память браузера');
  await page.getByTestId('privacy').locator('[data-nav="back"]').click();
  await note.getByTestId('storage-notice-ok').click();
  await expect(note).toHaveCount(0);
  // после перезагрузки — не возвращается
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('path')).toBeVisible();
  await expect(page.getByTestId('storage-notice')).toHaveCount(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  expect(errors).toEqual([]);
});

test('ник: грубый — окно «Смените ник» со сроком; срок вышел — экран блокировки, смена ника открывает аккаунт', async ({ page }) => {
  // сервер отвечает по «фазе»: сначала срок на смену идёт, потом вышел; смена ника снимает всё
  let phase = 'rename';
  const profile = (extra) => JSON.stringify({ profile: { login: 'tester', name: 'Грубиян', emblem: 'star', kidsMode: false, nameNextAt: 0, ...extra } });
  const { errors } = await openApp(page, '/', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.action === 'update') { phase = 'ok'; return profile({ name: body.name, renameBy: null, blocked: false }); }
    if (body.action === 'me') {
      if (phase === 'rename') return profile({ renameBy: Date.now() + 3 * 86400000, blocked: false });
      if (phase === 'blocked') return profile({ renameBy: Date.now() - 1000, blocked: true });
      return profile({ name: 'Тимур', renameBy: null, blocked: false });
    }
    return '{}';
  }, { tab: 'path' });
  const ask = page.getByTestId('name-rename');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText('нарушает правила');
  await expect(ask).toContainText('иначе аккаунт будет заблокирован');
  // «Позже» — до следующего запуска; уведомление в колокольчике остаётся
  await ask.getByRole('button', { name: 'Позже' }).click();
  await expect(ask).toHaveCount(0);
  await page.getByTestId('bell').first().click();
  const note = page.locator('[data-testid=notifications] [data-id^="rename:"]');
  await expect(note).toContainText('Смените ник');
  await note.click();
  await expect(ask).toBeVisible();
  await page.getByLabel('Новый ник').fill('Тимур');
  await page.getByTestId('rename-save').click();
  await expect(ask).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-account')).renameBy)).toBe(null);
  // срок вышел (сервер ответил «заблокирован»): закрыть нельзя, только сменить ник или выйти
  phase = 'blocked';
  await page.evaluate(() => window.dispatchEvent(new Event('ems-blocked')));
  const blocked = page.getByTestId('name-blocked');
  await expect(blocked).toContainText('Аккаунт заблокирован');
  await expect(blocked.getByRole('button', { name: 'Позже' })).toHaveCount(0);
  await expect(blocked.getByRole('button', { name: 'Выйти' })).toBeVisible();
  await page.getByLabel('Новый ник').fill('Тимур');
  await page.getByTestId('rename-save').click();
  await expect(blocked).toHaveCount(0);
  expect(errors).toEqual([]);
});

/* Политология — проба только для команды (docs/mechanics.md): переключатель в «Настройки → Для команды»,
   после перезапуска Путь, карта и учебник — по политологии; выключили — снова экономика */
test('политология — проба для команды: переключатель, юнит «Власть и государство» и его глава', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 } } } }));
  });
  let owner = true;
  const api = (req) => {
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    if (req.url().includes('/api/reports') && body && body.action === 'me') return JSON.stringify({ owner });
    return '{}';
  };
  const { errors } = await openApp(page, '/', api, { tab: 'path' });
  // у учеников (и у команды до переключения) — экономика
  await expect(page.getByTestId('track-badge')).toHaveCount(0);
  await expect(pathNode(page, 'sc-i1')).toHaveCount(1);
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  const sw = page.getByTestId('set-politics');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await Promise.all([page.waitForEvent('load'), sw.click()]);
  await page.waitForLoadState('networkidle');
  // Путь — по политологии: плашка пробы, юнит «Власть и государство», уроков экономики нет
  await expect(page.getByTestId('track-badge')).toContainText('Политология');
  await expect(pathNode(page, 'pw-i1')).toHaveCount(1);
  await expect(pathNode(page, 'sc-i1')).toHaveCount(0);
  // урок открывается и идёт как обычный
  await pathNode(page, 'pw-i1').click();
  await expect(page.getByTestId('lesson-sheet')).toContainText('Что такое власть');
  await expect(page.getByTestId('lesson-sheet')).toContainText('Парламент');
  await page.getByTestId('lesson-sheet').getByTestId('lesson-start').click();
  await expect(page.getByTestId('lesson')).toBeVisible();
  await expect(page.getByTestId('lesson')).toContainText('власть');
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  const ask = page.getByRole('dialog', { name: 'Выйти из урока?' });
  if (await ask.isVisible().catch(() => false)) await ask.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  // учебник — одна глава «Власть и государство»
  await openBook(page);
  const toc = page.getByTestId('textbook');
  await expect(toc.locator('[data-chapter]')).toHaveCount(1);
  await toc.locator('[data-chapter="power"]').click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'power');
  await expect(page.getByTestId('chapter')).toContainText('Легитимность');
  await expect(page.getByTestId('chapter').getByTestId('tb-recall')).toHaveCount(3);
  // выключили — снова экономика
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await expect(page.getByTestId('set-politics')).toHaveAttribute('aria-checked', 'true');
  await Promise.all([page.waitForEvent('load'), page.getByTestId('set-politics').click()]);
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('track-badge')).toHaveCount(0);
  await expect(pathNode(page, 'sc-i1')).toHaveCount(1);
  // не команда — политологию не включить и подменой хранилища: курс снова экономика
  owner = false;
  await page.evaluate(() => { localStorage.setItem('ems-track', 'politics'); localStorage.setItem('ems-team', 'tester'); });
  await page.reload({ waitUntil: 'networkidle' });
  // «не команда» — приложение само сбрасывает курс и перезапускается: чтение может попасть на перезагрузку
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ems-track')).catch(() => 'перезагрузка')).toBe(null);
  await expect(page.getByTestId('track-badge')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// нет связи с сервером (VPN, сеть) — плашка с советом и «Повторить» (пункт владельца 08.11, вечер)
test('синхронизация не прошла — плашка «Нет связи с сервером»; «Повторить» после восстановления убирает её', async ({ page }) => {
  let down = true;
  const api = (req) => (down && req.url().includes('/api/solo') ? 'not json' : '{}');
  const { errors } = await openApp(page, '/', api, { tab: 'path' });
  const banner = page.getByTestId('sync-fail');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Нет связи с сервером');
  await expect(banner).toContainText('VPN');
  // связь вернулась — «Повторить» синхронизирует, плашка уходит
  down = false;
  await banner.getByTestId('sync-retry').click();
  await expect(banner).toHaveCount(0);
  expect(errors.filter((e) => !/JSON/.test(e))).toEqual([]);
});

test('вход: гость может войти — «Войти» рядом с «Создать аккаунт», регистрация и вход ведут друг в друга', async ({ page }) => {
  test.setTimeout(120_000);
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', accountApi, { tab: null });
  await page.getByRole('button', { name: 'Начать' }).click();
  const goal = page.getByTestId('welcome-goal');
  await goal.getByRole('group', { name: 'Цель' }).getByRole('button', { name: 'Для себя' }).click();
  await goal.getByRole('group', { name: 'Минут в день' }).getByRole('button', { name: '10 минут' }).click();
  await goal.getByRole('group', { name: 'Знания' }).getByRole('button', { name: 'Начинаю с нуля' }).click();
  await goal.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByTestId('lesson')).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из урока' }).click();
  const ask = page.getByRole('dialog', { name: 'Выйти из урока?' });
  if (await ask.isVisible().catch(() => false)) await ask.getByRole('button', { name: 'Выйти', exact: true }).click();
  const card = page.getByTestId('guest-save');
  await expect(card.getByTestId('guest-register')).toBeVisible();
  await expect(card.getByTestId('guest-login')).toHaveText('Войти');
  await card.getByTestId('guest-login').click();
  const login = page.getByTestId('welcome-login');
  await expect(login).toBeVisible();
  await expect(login.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  // из входа — в регистрацию и обратно
  await login.getByTestId('auth-to-register').click();
  const reg = page.getByTestId('welcome-register');
  await expect(reg).toBeVisible();
  await reg.getByTestId('auth-to-login').click();
  await expect(page.getByTestId('welcome-login')).toBeVisible();
  // вошли — гость стал учеником с аккаунтом, Путь на месте
  await page.getByTestId('welcome-login').getByLabel('Логин').fill('anna');
  await page.getByTestId('welcome-login').getByLabel('Пароль', { exact: true }).fill('secret12');
  await page.getByTestId('welcome-login').getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByTestId('path')).toBeVisible();
  await expect(page.getByTestId('guest-save')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «с входного экрана можно попасть в мир без регистрации и играть какое-то время, потом —
// уведомление, что нужно зарегистрироваться; игра сохранится, а мир закроется, пока человек не дойдёт до него уроками»
test('вход: «Мир» на пробу — с приветствия в «Мир» без аккаунта; время вышло — «Пробная игра окончена», «Мир» закрыт до регистрации и 10-го урока', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript(() => { window.__INFLATIA_TRIAL_SECONDS__ = 4; localStorage.setItem('ems-unlock-test', '1'); });
  const { errors } = await openApp(page, '/', '{}', { tab: null });
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expect(page.getByTestId('welcome-world-note')).toHaveText('10 минут без регистрации');
  await page.getByTestId('welcome-world').click();
  // сразу «Мир»: меню партии, без уроков и аккаунта; в углу — сколько осталось пробы
  await expect(page.getByTestId('shell')).toHaveAttribute('data-tab', 'world');
  await expect(page.getByTestId('world-title')).toBeVisible();
  await expect(page.getByTestId('world-locked')).toHaveCount(0);
  await expect(page.getByTestId('world-trial-chip')).toContainText('Проба «Мира»');
  // время вышло — окно поверх: партия сохранена, создать аккаунт, войти или к урокам
  const end = page.getByTestId('world-trial-end');
  await expect(end).toBeVisible({ timeout: 15000 });
  await expect(end).toContainText('Пробная игра окончена');
  await expect(end).toContainText('Партия сохранена');
  await expect(end.getByTestId('world-trial-register')).toBeVisible();
  await expect(end.getByTestId('world-trial-login')).toBeVisible();
  await expect(page.getByTestId('world-trial-chip')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-world-trial')).ended)).toBeGreaterThan(0);
  // «К урокам» — на Путь; вкладка «Мир» — под замком, с карточкой сохранённой партии
  await end.getByTestId('world-trial-lessons').click();
  await expect(page.getByTestId('shell')).toHaveAttribute('data-tab', 'path');
  await openTab(page, 'world');
  await expect(page.getByTestId('world-locked')).toBeVisible();
  await expect(page.getByTestId('world-trial-saved')).toContainText('Пробная партия сохранена');
  await expect(page.getByTestId('feature-locked')).toHaveAttribute('data-feature', 'world');
  // и после перезагрузки «Мир» сам не открывается
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('world-title')).toHaveCount(0);
  // «Создать аккаунт» с карточки — регистрация
  await openTab(page, 'world');
  await page.getByTestId('world-trial-saved-register').click();
  await expect(page.getByTestId('welcome-register')).toBeVisible();
  expect(errors).toEqual([]);
});

// пункт владельца 21.11, п. 5: «анимации взаимодействия с Инфлёй — нажать на неё»
test('Инфля откликается на касание: прыжок, сплющилась, крутанулась по очереди, на миг радуется, сердечки; пять касаний — закружилась', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const infla = page.getByTestId('mascot').filter({ visible: true }).first();
  await infla.scrollIntoViewIfNeeded();
  await infla.click();
  await expect(infla).toHaveAttribute('data-poke', '1');
  await expect(infla).toHaveAttribute('data-reaction', /jump|squish|spin/);
  await expect(infla.locator('.infla-heart')).toHaveCount(3);
  await expect(infla.locator('svg[aria-label]')).toHaveAttribute('aria-label', /Инфля/);
  // на миг — радость (рот и глаза радости), потом снова как была
  await expect(infla).not.toHaveAttribute('data-reaction', /./, { timeout: 3000 });
  // пять быстрых касаний (щелчок Playwright ждёт конца анимации — касания шлём сами)
  const seen = await infla.evaluate(async (el) => { const out = []; for (let k = 0; k < 5; k += 1) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise((r) => setTimeout(r, 60)); out.push(el.getAttribute('data-reaction')); } return out; });
  // пятое касание подряд — закружилась; пока кружится, новые касания её не сбивают
  expect(seen).toContain('dizzy');
  expect(seen[seen.length - 1]).toBe('dizzy');
  expect(errors).toEqual([]);
});
