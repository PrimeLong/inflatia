/* БРАУЗЕРНЫЕ СЦЕНАРИИ — «Мир»: партия, карта, война и дипломатия, «Своё дело», сетевая игра, лаборатория, обучение «Мира».
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/world.e2e.js */
import { test, expect } from '@playwright/test';
import { freshRoom, resolveQuarter, publicView } from '../api/room.js';
import { defaultDecisions, makeInitialEconomy } from '../src/lib/engine.js';
import {
  openApp, gotoApp, ACCOUNT, expectNoSidewaysScroll, startSoloGame, dottedNumbers, installHooks,
} from './helpers.js';

installHooks();

test('меню открывается, шрифты свои, внешних запросов нет', async ({ page }) => {
  const { errors, external } = await openApp(page);
  await expect(page.getByRole('heading', { name: 'Инфляция' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const families = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(families.map((f) => f.replace(/"/g, ''))).toContain('PT Sans');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await expectNoSidewaysScroll(page);
});

test('одиночная партия: квартал проходит, газета закрывается, карта рисуется', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page);
  await expectNoSidewaysScroll(page);

  const finish = page.getByRole('button', { name: 'Завершить квартал и применить решения' });
  await finish.click();
  // газета открывается сама после квартала или по кнопке — закрыть её обязаны оба способа
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (!(await close.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /Газета/ }).first().click();
  }
  await expect(close).toBeVisible();
  await expectNoSidewaysScroll(page);
  await close.click();
  await expect(close).toBeHidden();

  if (!isMobile) {
    await page.getByRole('button', { name: 'Карта', exact: true }).click();
    await expect(page.locator('svg path').first()).toBeVisible();
    expect(await page.locator('svg path').count()).toBeGreaterThan(50);
    // соседняя страна открывает свою карточку; карта разворачивается во весь экран и сворачивается по Esc
    await page.getByRole('button', { name: 'Вестравия', exact: true }).click();
    await expect(page.getByText('Вестравская Республика', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Развернуть карту на весь экран' }).click();
    await expect(page.getByText('Карта открыта во весь экран.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Развернуть карту на весь экран' })).toBeVisible();
    // мир больше листа: карту можно отдалить до всего мира и вернуться к своей стране
    await page.getByRole('button', { name: 'Отдалить карту' }).click();
    await page.getByRole('button', { name: 'Отдалить карту' }).click();
    await expect(page.getByRole('button', { name: 'Отдалить карту' })).toBeDisabled();
    await page.getByRole('button', { name: 'Вернуться к нашей стране' }).click();
    await expect(page.getByRole('button', { name: 'Вернуться к нашей стране' })).toBeHidden();
  }
  expect(errors).toEqual([]);
});

// «Мир» (пункт владельца 08.11, вечер): обещание рынку — сколько ещё действует, видно наверху денежных решений
test('«Мир»: обещание рынку — плашка наверху вкладки решений ЦБ, сколько кварталов ещё действует, касание ведёт к выбору', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page);
  const decide = async () => { if (isMobile && !(await page.getByRole('button', { name: 'Будем снижать' }).isVisible().catch(() => false))) await page.getByText('Решения', { exact: true }).click(); };
  await decide();
  await expect(page.getByTestId('guidance-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'Будем снижать' }).click();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible({ timeout: 3000 }).catch(() => false)) await close.click();
  await decide();
  const badge = page.getByTestId('guidance-badge');
  await expect(badge).toContainText('Обещание рынку: снижать ставку');
  await expect(badge).toContainText('ещё 2 квартала');
  // плашка — выше выбора обещания и ползунка ставки: листать не нужно
  const pick = page.locator('#ems-guidance');
  expect((await badge.boundingBox()).y).toBeLessThan((await pick.boundingBox()).y);
  await badge.click();
  await expect(pick).toBeInViewport();
  expect(errors).toEqual([]);
});

// «Мир» (пункт владельца 08.11, вечер): компас ставки сворачивается, ссылку на учебник под рычагом можно закрыть крестиком
test('«Мир»: компас ставки сворачивается в строку; ссылка «IS-LM» под рычагом закрывается крестиком и возвращается в «Настройках вида»', async ({ page, isMobile }) => {
  // уровень «Средний» на Пути — компас и IS-LM открыты с первого квартала
  await page.addInitScript(() => { try { localStorage.setItem('ems-learn-level', '2'); } catch { /* нет хранилища */ } });
  const { errors } = await openApp(page);
  await startSoloGame(page);
  if (isMobile) await page.getByText('Решения', { exact: true }).click();
  const compass = page.getByTestId('rate-compass');
  await expect(compass).toHaveAttribute('data-collapsed', 'false');
  await expect(compass).toContainText('Нейтральная r*');
  await compass.getByTestId('compass-toggle').click();
  await expect(compass).toHaveAttribute('data-collapsed', 'true');
  await expect(compass.getByTestId('compass-summary')).toContainText('Реальная ставка');
  await expect(compass).not.toContainText('Нейтральная r*');
  expect(await page.evaluate(() => localStorage.getItem('ems-compass-collapsed'))).toBe('1');
  await compass.getByTestId('compass-toggle').click();
  await expect(compass).toContainText('Нейтральная r*');
  // ссылка компаса «Политика: правило Тейлора» тоже закрывается крестиком (пункт владельца 09.11)
  const taylorLink = compass.locator('.ems-booklink[data-chapter="policy"]');
  await expect(taylorLink).toBeVisible();
  await taylorLink.hover();
  await taylorLink.getByTestId('book-link-close').click();
  await expect(compass.getByTestId('book-link')).toHaveCount(0);
  // ссылка «IS-LM» под рычагами: крестик — и её нет ни у ставки, ни у госрасходов
  const islm = page.locator('.ems-booklink[data-chapter]', { has: page.getByTestId('book-link').filter({ hasText: 'IS-LM' }) });
  await expect(islm.first()).toBeVisible();
  await islm.first().hover();
  await islm.first().getByTestId('book-link-close').click();
  await expect(islm).toHaveCount(0);
  // «Настройки вида» → вернуть
  await page.getByRole('button', { name: 'Настройки вида' }).first().click();
  await page.getByTestId('booklinks-restore').click();
  await expect(islm.first()).toBeAttached();
  await expect(taylorLink).toBeAttached();
  expect(errors).toEqual([]);
});

test('обучение: хаб и программа курса открываются', async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByText('Как играть', { exact: true }).click();
  await expect(page.getByText('Четыре курса')).toBeVisible();
  await page.getByText('Экономическая политика', { exact: true }).first().click();
  await expect(page.getByText('ПРОГРАММА КУРСА', { exact: false })).toBeVisible();
  await expect(page.getByText('Общество: семь групп вместо одного рейтинга', { exact: true })).toBeVisible();
  await expectNoSidewaysScroll(page);
  // режимы игры открыты в любом порядке: сразу в «Своё дело», пройти тест
  await page.getByRole('button', { name: /Ко всем курсам/ }).click();
  await page.getByText('Режимы игры', { exact: true }).click();
  await page.getByText('Своё дело', { exact: true }).click();
  await expect(page.getByText('Другая игра на той же экономике')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Далее/ }).click();
  await expect(page.getByText('Тест: своё дело')).toBeVisible();
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('сетевая партия: лобби, вход, пресс-конференция и карта', async ({ page, isMobile }) => {
  // настоящая комната из серверного кода: Минфин и ЦБ заняты людьми, выборы уже прошли
  let r = freshRoom({ id: 'E2E', mode: 'policy', difficulty: 'medium', president: null, cbPersona: 'hawk', mofPersona: 'austerity' });
  r = { ...r, names: { ...r.names, central_bank: 'Анна', ministry_finance: 'Борис' },
    seats: { ...r.seats, central_bank: 'tok', ministry_finance: 'tok' }, economy: { ...r.economy, quartersToElection: 1 } };
  const sub = () => ({ decisions: { ...r.decisions }, president: null, note: '', pressAnswer: null });
  r = resolveQuarter({ ...r, submissions: { central_bank: sub(), ministry_finance: sub() } });
  const room = publicView(r);
  const lobby = { ...room, occupied: { ...room.occupied, central_bank: false, ministry_finance: false } };
  let joined = false; let submitted = null;
  const { errors } = await openApp(page, '/?room=E2E', (req) => {
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    if (body && body.action === 'join') {
      if (body.session !== ACCOUNT.token) return JSON.stringify({ error: 'нет сессии' });
      joined = true; return JSON.stringify({ token: 'tok', seat: 'ministry_finance', storage: 'memory', room });
    }
    if (body && body.action === 'submit') submitted = body;
    return JSON.stringify({ room: joined ? room : lobby, storage: 'memory' });
  });

  await page.getByText('Минфин', { exact: true }).first().click();
  // по сети — только с профилем: вход уже выполнен, место занимается под ним
  await expect(page.getByText('@tester')).toBeVisible();
  await page.getByRole('button', { name: 'Войти в партию' }).click();

  // на телефоне колонки переключаются вкладками: решения — в первой
  if (isMobile) await page.getByText('Решения', { exact: true }).click();
  // без президента голос власти — Минфин: ему и отвечать на вопрос прессы
  const press = page.locator('.ems-panel').filter({ has: page.locator('> .ems-serif', { hasText: 'Пресс-конференция' }) });
  await expect(press).toBeVisible();
  await press.locator('.ems-card-btn').first().click();
  await expectNoSidewaysScroll(page);

  if (isMobile) await page.getByText('Новости и графики', { exact: true }).click();
  await page.getByRole('tab', { name: /Карта страны/ }).click();
  await expect(page.locator('svg path').first()).toBeVisible();

  await page.getByRole('button', { name: /Отправить решения/ }).first().click();
  await expect.poll(() => submitted && submitted.decisions && submitted.decisions.pressAnswer).toBeTruthy();
  expect(errors).toEqual([]);
});

test('разбор партии открывается из меню «⋯» и показывает сводку', async ({ page }) => {
  test.setTimeout(90_000);
  const { errors } = await openApp(page);
  await startSoloGame(page);
  const finish = page.getByRole('button', { name: 'Завершить квартал и применить решения' });
  for (let i = 0; i < 3; i++) {
    await expect(finish).toBeEnabled({ timeout: 10_000 });
    await finish.click();
    const close = page.getByRole('button', { name: 'Закрыть газету' });
    if (await close.isVisible({ timeout: 2000 }).catch(() => false)) await close.click();
  }
  await page.getByRole('button', { name: 'Ещё действия' }).click();
  await page.getByRole('button', { name: 'Разбор партии' }).click();
  const dialog = page.getByRole('dialog', { name: 'Разбор партии' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Кварталов у руля')).toBeVisible();
  await expectNoSidewaysScroll(page);
  // Escape закрывает разбор; диалог подписывается на клавиатуру после открытия — нажимаем, пока не закроется
  await expect(async () => { await page.keyboard.press('Escape'); await expect(dialog).toBeHidden({ timeout: 1000 }); }).toPass({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('бот-Минфин показывает свои бюджетные ползунки: закупки, выплаты, инвестиции', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page);
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  if (isMobile) await page.getByText('Решения', { exact: true }).click();
  for (const label of ['Госзакупки и содержание государства', 'Социальные выплаты', 'Госинвестиции в инфраструктуру']) {
    await expect(page.getByRole('slider', { name: new RegExp(`^${label}: .*от -15 до 15`) })).toBeAttached();
  }
  await page.getByRole('slider', { name: /^Социальные выплаты:/ }).locator('xpath=ancestor::div[contains(@class,"ems-panel")][1]')
    .screenshot({ path: `test-results/bot-mof-${isMobile ? 'phone' : 'desktop'}.png` });
  expect(errors).toEqual([]);
});

test('бот-ЦБ показывает свои ползунки, когда играешь за Минфин', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Глава Министерства финансов');
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  if (isMobile) await page.getByText('Решения', { exact: true }).click();
  for (const label of ['Ключевая ставка', 'Норма резервирования', 'Операции с денежной массой', 'Валютные интервенции']) {
    await expect(page.getByRole('slider', { name: new RegExp(`^${label}: -?\\d`) })).toBeAttached();
  }
  await page.getByRole('slider', { name: /^Ключевая ставка:/ }).locator('xpath=ancestor::div[contains(@class,"ems-panel")][1]')
    .screenshot({ path: `test-results/bot-cb-${isMobile ? 'phone' : 'desktop'}.png` });
  expect(errors).toEqual([]);
});

test('карта: соседние страны на месте, Минфин запускает стройку, после квартала она идёт', async ({ page }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Глава Министерства финансов');
  // «Карта» — отдельный экран, а не колонка: на телефоне вкладки колонок тут не нужны
  const openMap = () => page.getByRole('button', { name: 'Карта', exact: true }).click();
  await openMap();
  const map = page.locator('svg[aria-label="Карта областей страны"]');
  for (const nb of ['КОРОЛЕВСТВО НОРЛАНД', 'ВЕСТРАВСКАЯ РЕСПУБЛИКА', 'РЕСПУБЛИКА ДЕШТ']) await expect(map.getByText(nb)).toBeAttached();
  await page.getByRole('button', { name: 'Начать стройку' }).click();
  await expect(page.getByRole('button', { name: /Стройка начнётся в конце квартала/ })).toBeVisible();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  await openMap();
  await expect(page.getByText(/^ещё \d+ кв\.$/)).toBeVisible();
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('общество: после квартала видны группы, коалиция и их лидеры', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Глава Министерства финансов');
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByRole('button', { name: 'Общество', exact: true }).click();
  await expect(page.getByText(/^Коалиция власти:/)).toBeVisible();
  for (const name of ['Пенсионеры', 'Силовики', 'Молодёжь']) await expect(page.getByLabel(new RegExp(`^${name}: \\d+ из 100`))).toBeVisible();
  await expect(page.getByText('Галина Воронцова,', { exact: false })).toBeVisible();
  // две бедности рядом — относительная и абсолютная, с пояснением разницы
  await expect(page.getByTestId('poverty')).toContainText('Относительная бедность');
  await expect(page.getByTestId('poverty')).toContainText('Абсолютная бедность');
  await page.screenshot({ path: `test-results/society-${isMobile ? 'phone' : 'desktop'}.png`, fullPage: true });
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('президент ведёт наступление на карте: цель, штурм, продвижение', async ({ page, isMobile }) => {
  test.skip(isMobile, 'сценарий проверяется на ширине компьютера');
  // жребий квартала фиксирован: случайное событие (соседи, кризис) не должно подменять проверяемый штурм
  await page.addInitScript(() => { let x = 42; Math.random = () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; });
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Президент');
  // войну объявляют на карте — из карточки Норланда
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByRole('button', { name: /^Норланд/ }).first().click();
  await page.getByRole('button', { name: /Объявить войну/ }).click();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  // полоса войны — на «Панели»: на вкладке карты операция видна в самой карте
  await page.getByRole('button', { name: 'Панель', exact: true }).click();
  await expect(page.getByText('Наступление: Норланд.')).toBeVisible();
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByRole('button', { name: /^Копи Хальвика: продвижение 0 из 100/ }).click();
  await page.getByRole('button', { name: /^Штурм/ }).click();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(page.getByText(/^Прошлый квартал: штурм — Копи Хальвика, \+\d+/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Копи Хальвика: (продвижение [1-9]\d* из 100|взята)/ })).toBeAttached();
  await page.locator('svg[aria-label="Карта областей страны"]').locator('xpath=../..').screenshot({ path: 'test-results/war-operation.png' });
  expect(errors).toEqual([]);
});

test('детский режим «Мира»: без войны на карте и без вкладки «Война» у президента', async ({ page, isMobile }) => {
  test.skip(isMobile, 'логика та же, проверяется на ширине компьютера');
  await page.context().addInitScript((a) => { try { localStorage.setItem('ems-account', JSON.stringify(a)); } catch { /* нет хранилища */ } }, { ...ACCOUNT, kidsMode: true });
  const { errors } = await openApp(page);
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await page.getByText('Президент', { exact: true }).click();
  // вместо «Только экономика» — пояснение детского режима
  await expect(page.getByTestId('kids-note')).toContainText('Без войн, переворотов');
  await expect(page.getByRole('checkbox', { name: /Только экономика/ })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Обучение по экрану/ }).uncheck();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  await expect(page.getByRole('button', { name: 'Завершить квартал и применить решения' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Война', exact: true })).toHaveCount(0);
  await expect(page.getByText('Распустить парламент')).toHaveCount(0);
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByRole('button', { name: /^Норланд/ }).first().click();
  await expect(page.getByRole('button', { name: /Объявить войну/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('вызов дня: карточка в меню, общий старт и счётчик кварталов', async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByTestId('daily-card')).toContainText('Вызов дня');
  await page.getByRole('button', { name: 'Таблица дня' }).click();
  await expect(page.getByText('Сегодня ещё никто не прошёл вызов — будьте первым.')).toBeVisible();
  await page.getByRole('button', { name: 'Принять вызов' }).click();
  await expect(page.getByText(/квартал 1 из 12/)).toBeVisible();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  await expect(page.getByText(/квартал 2 из 12/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('своё дело: старт из меню, время идёт, стройка, склад и вкладки', async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByText('Своё дело', { exact: true }).click();
  await page.getByText('Лавка', { exact: true }).click();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  const cash = page.getByLabel('Деньги на счёте');
  await expect(cash).toBeVisible();
  // первый запуск — короткое вступление
  await page.getByRole('dialog', { name: 'Своё дело' }).getByRole('button', { name: 'Начать' }).click();
  await expect(page.getByText(/Задание 1 из/)).toBeVisible();
  await page.getByRole('button', { name: 'Скорость 4×' }).click();
  const before = await cash.textContent();
  await expect.poll(async () => cash.textContent(), { timeout: 10000 }).not.toBe(before);
  for (const name of ['Склад и рынок', 'Исследования', 'Финансы', 'Страна', 'Производство']) {
    await page.getByRole('tab', { name }).click();
  }
  await expect(page.getByText('Хлебозавод').first()).toBeVisible();
  await expect(page.getByText(/автосохранение/)).toBeVisible();
  await expectNoSidewaysScroll(page);
  // перезагрузка страницы открывает то же дело, а не меню
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByLabel('Деньги на счёте')).toBeVisible();
  expect(errors).toEqual([]);
});

test('оборонительная война: фронт на карте и приказ армии', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const e = { ...makeInitialEconomy(), warQuartersLeft: 3, warType: 'defensive', warElapsed: 2, activeCrises: ['war'], regime: 'war',
    defenseCampaign: { pressure: { agri: 72, periphery: 30 }, occupied: [], morale: 70, next: 'agri', last: { target: 'periphery', stance: 'defend', hit: 'agri', gain: 14, pushed: 0 } } };
  const snap = { app: 'economic-panel', v: 99, setup: { role: 'president', difficulty: 'medium', goal: 'living_standards', scenario: 'sandbox', cbPersona: 'pragmatic', mofPersona: 'technocrat', president: { enabled: false, persona: 'technocrat' } },
    economy: e, history: [{ q: 0, label: 'x', ...e }], decisions: defaultDecisions(e), quarterIndex: 5 };
  await page.addInitScript((s) => { localStorage.setItem('ems-autosave-v1', JSON.stringify({ ...s, v: 1 })); }, snap);
  await gotoApp(page);
  await expect(page.getByText(/Республика Дешт наступает/).first()).toBeVisible();
  await page.getByText(/Республика Дешт наступает/).first().click();
  await expect(page.getByLabel('Оборонительная война')).toBeVisible();
  await page.getByLabel('Оборонительная война').getByRole('button', { name: /Контрудар/ }).click();
  await expect(page.getByLabel('Оборонительная война').getByRole('button', { name: /Контрудар/ })).toHaveCSS('color', /./);
  expect(errors).toEqual([]);
});

test('своё дело: дерево технологий, команда и сохранение в слот на сервере', async ({ page }) => {
  const { makeTycoon, snapshotTycoon } = await import('../src/lib/tycoon.js');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let saved = null;
  await page.route('**/api/**', (r) => {
    const req = r.request();
    if (req.url().includes('/api/solo') && req.method() === 'POST') {
      saved = JSON.parse(req.postData());
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slots: [{ savedAt: new Date().toISOString(), buildings: 3, cash: 4, quarterIndex: 1 }, null, null, null] }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slots: [null, null, null, null] }) });
  });
  const save = { ...snapshotTycoon(makeTycoon({ start: 'farm' })), introSeen: true };
  await page.addInitScript((s) => { localStorage.setItem('ems-tycoon-v1', JSON.stringify({ ...s, savedAt: Date.now() })); }, save);
  await gotoApp(page);
  await page.getByText('Продолжить', { exact: true }).click();
  await expect(page.getByText(/Задание 1 из/)).toBeVisible();
  // таблица рекордов открывается; вход выполнен — рекорд записывается сам
  await page.getByRole('button', { name: 'Рекорды' }).click();
  const recs = page.getByRole('dialog', { name: 'Рекорды «Своего дела»' });
  await expect(recs.getByText(/Рекорд записывается сам/)).toBeVisible();
  await recs.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('tab', { name: 'Исследования' }).click();
  await page.getByRole('button', { name: /Кадровое агентство/ }).click();
  await expect(page.getByText('Люди на новые здания набираются вдвое быстрее.')).toBeVisible();
  await page.getByRole('tab', { name: 'Команда' }).click();
  await expect(page.getByText('Управляющий производством')).toBeVisible();
  await page.getByRole('button', { name: 'Партии' }).click();
  await page.getByRole('button', { name: 'Сохранить сюда' }).first().click();
  await expect.poll(() => saved && saved.kind).toBe('tycoon');
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('обучение: практика «требование пенсионеров» решается уступкой', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.addInitScript(() => localStorage.setItem('ems-course-progress', JSON.stringify({ basics: true, budget: true, fx: true, expectations: true, crisis: true, stabilization: true, pr_capital: true, pr_reforms: true, pr_regime: true })));
  await gotoApp(page);
  await page.getByText('Как играть', { exact: true }).click();
  await page.getByText('Экономическая политика', { exact: true }).first().click();
  await page.getByText('Общество: семь групп вместо одного рейтинга', { exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /^Далее/ }).click();
  await expect(page.getByText('Тест: общество')).toBeVisible();
  // ответы теста перемешаны — отвечаем по тексту верного варианта
  for (const t of ['Силовики в оппозиции', 'Сначала поддержка немного подрастёт', 'Бизнес: дорогой кредит']) await page.getByText(t, { exact: false }).first().click();
  await page.getByRole('button', { name: 'Проверить ответы' }).click();
  await page.getByRole('button', { name: /^Далее/ }).click();
  await expect(page.getByText('Практика: требование пенсионеров')).toBeVisible();
  // у задачи есть инструменты — ответ лидеру, соцвыплаты и ставка — и видна экономика целиком
  await expect(page.getByText(/Соцвыплаты|Социальные выплаты/).first()).toBeVisible();
  await expect(page.getByText(/Ключевая ставка/).first()).toBeVisible();
  await expect(page.getByTestId('practice-economy')).toContainText('Безработица');
  await page.getByRole('button', { name: /Проиндексировать пенсии/ }).click();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Завершить квартал' }).click();
  await expect(page.getByRole('button', { name: /^Далее/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('обучение: практика обороны от Дешта — контрудар удерживает фронт', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.addInitScript(() => localStorage.setItem('ems-course-progress', JSON.stringify({ pr_capital: true, society: true, pr_reforms: true, pr_regime: true })));
  await gotoApp(page);
  await page.getByText('Как играть', { exact: true }).click();
  await page.getByText('Президент', { exact: true }).first().click();
  await page.getByText('Война, мир и реванш', { exact: true }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^Далее/ }).click();
  for (const t of ['Сначала нужно взять Ледяной перевал', 'Действуют партизаны', 'Признание новой границы', 'Доля обороны держится на новом уровне']) await page.getByText(t, { exact: false }).first().click();
  await page.getByRole('button', { name: 'Проверить ответы' }).click();
  await page.getByRole('button', { name: /^Далее/ }).click();
  await expect(page.getByText('Практика: отбить наступление Дешта')).toBeVisible();
  await page.getByRole('button', { name: /Контрудар/ }).click();
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole('button', { name: 'Завершить квартал' });
    if (!(await btn.isVisible())) break;
    await btn.click();
  }
  await expect(page.getByRole('button', { name: /^Далее/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('дипломатия: президент отвечает на инцидент с Дештом и отправляет помощь', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const e = { ...makeInitialEconomy(), deshtMobilized: 3, relations: { north: 50, west: 64, southwest: 18 },
    neighborEvent: { id: 'border_incident', country: 'southwest', q: 5, deadline: 6 } };
  const snap = { app: 'economic-panel', v: 99, setup: { role: 'president', difficulty: 'medium', goal: 'living_standards', scenario: 'sandbox', cbPersona: 'pragmatic', mofPersona: 'technocrat', president: { enabled: false, persona: 'technocrat' } },
    economy: e, history: [{ q: 0, label: 'x', ...e }], decisions: defaultDecisions(e), quarterIndex: 5 };
  await page.addInitScript((s) => { localStorage.setItem('ems-autosave-v1', JSON.stringify({ ...s, v: 1 })); }, snap);
  await gotoApp(page);
  await page.getByText(/Пограничный инцидент с Дештом/).first().click();
  await page.getByRole('button', { name: /Пограничный инцидент/ }).click();
  await page.getByRole('button', { name: /Замять тихо/ }).click();
  await page.getByRole('button', { name: /Помощь/ }).click();
  await expect(page.getByRole('button', { name: /Помощь/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  // скрытая панель не перерисовывается, пока открыта карта: новости — после возврата на неё
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByRole('button', { name: 'Панель', exact: true }).click();
  await expect(page.getByText(/ПОМОЩЬ ДЕШТУ/i).first()).toBeAttached();
  expect(errors).toEqual([]);
});

test('своё дело: конкуренты — доля рынка, карточки компаний и поглощение', async ({ page }) => {
  const T = await import('../src/lib/tycoon.js');
  const { withSeededRandom } = await import('../src/lib/catalog.js');
  let st = T.makeTycoon({ start: 'retail' });
  st = withSeededRandom(3, () => T.tick(st, 60 * 7 + 20));
  st = { ...st, cash: 500, rivals: st.rivals.map((c) => (c.id === 'kolos' ? { ...c, distress: 1 } : c)) };
  const save = { ...T.snapshotTycoon(st), introSeen: true };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"slots":[null,null,null,null]}' }));
  await page.addInitScript((s) => { localStorage.setItem('ems-tycoon-v1', JSON.stringify({ ...s, savedAt: Date.now() })); }, save);
  await gotoApp(page);
  await page.getByText('Продолжить', { exact: true }).click();
  await page.getByRole('button', { name: 'Пауза' }).click();
  await page.getByRole('tab', { name: 'Конкуренты' }).click();
  await expect(page.getByText('Доля рынка')).toBeVisible();
  await expect(page.getByText('Хлебный дом «Колос»')).toBeVisible();
  await page.getByRole('button', { name: /^Купить/ }).first().click();
  await expect(page.getByText('куплен вами')).toBeVisible();
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('война на карте: президент объявляет войну Дешту из карточки страны', async ({ page, isMobile }) => {
  test.skip(isMobile, 'сценарий проверяется на ширине компьютера');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { let x = 42; Math.random = () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; });
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await gotoApp(page);
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await page.getByText('Президент', { exact: true }).click();
  await page.getByRole('checkbox', { name: /Обучение по экрану/ }).uncheck();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByRole('button', { name: /^Дешт/ }).first().click();
  await page.getByRole('button', { name: /Объявить войну/ }).click();
  await expect(page.getByText('Война будет объявлена в конце квартала.')).toBeVisible();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  await page.waitForTimeout(2500);
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(page.getByText(/Наступление: Дешт/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Приграничные степи: продвижение/ })).toBeAttached();
  expect(errors).toEqual([]);
});

test('обучение по экрану: включено в первой партии, проходит все шаги и повторяется из меню', async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await page.getByText('Глава Центрального банка', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Обучение по экрану/ })).toBeChecked();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  const tour = page.getByRole('dialog', { name: /Обучение/ });
  await expect(tour).toBeVisible();
  await expect(tour.getByText('Первая партия')).toBeVisible();
  for (let i = 0; i < 20; i++) {
    const done = tour.getByRole('button', { name: 'Понятно, играть' });
    if (await done.isVisible().catch(() => false)) { await done.click(); break; }
    await tour.getByRole('button', { name: 'Далее' }).click();
  }
  await expect(tour).toBeHidden();
  await page.getByRole('button', { name: 'Ещё действия' }).click();
  await page.getByText('Обучение по экрану').click();
  await expect(page.getByRole('dialog', { name: /Обучение/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Обучение/ })).toBeHidden();
  expect(errors).toEqual([]);
});

// кнопка квартала всегда под рукой: закреплена внизу экрана, листать к ней не нужно
test('кнопка квартала закреплена внизу экрана', async ({ page }) => {
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await gotoApp(page);
  await page.getByText('Партия у руля страны', { exact: true }).click();
  await page.getByText('Глава Центрального банка', { exact: true }).click();
  await page.getByRole('checkbox', { name: /Обучение по экрану/ }).uncheck();
  await page.getByRole('button', { name: 'Принять полномочия' }).click();
  const btn = page.getByRole('button', { name: 'Завершить квартал и применить решения' });
  await expect(btn).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const box = await btn.boundingBox();
  const vh = page.viewportSize().height;
  expect(box.y + box.height).toBeLessThanOrEqual(vh + 1);
  expect(box.y).toBeGreaterThan(vh - 140);
});

test('лаборатория: один рычаг, четыре графика разницы с базой', async ({ page }) => {
  const { errors } = await openApp(page);
  await page.getByText('Лаборатория', { exact: true }).first().click();
  const charts = page.getByTestId('lab-charts');
  await expect(charts).toBeVisible();
  // четыре показателя и ставка: по умолчанию шок ставки живёт в правиле Тейлора
  await expect(charts.locator('.recharts-line')).toHaveCount(5);
  await expect(page.getByText(/пик .* на \d+-м кв\./).first()).toBeVisible();
  await expect(page.getByTestId('lab-cb-note')).toContainText('правилу Тейлора');
  await page.getByRole('button', { name: 'держит ставку выше' }).click();
  await expect(page.getByTestId('lab-cb-note')).toContainText('сама почти не возвращается');
  await page.getByRole('button', { name: 'НДС', exact: true }).click();
  await expect(page.getByText(/НДС сразу поднимает уровень цен/)).toBeVisible();
  await page.getByRole('button', { name: 'ставка стоит' }).click();
  await expect(charts.locator('.recharts-line')).toHaveCount(4);
  // темп расходов: по умолчанию разовый сдвиг, уровень расходов — около +0,5%, а не +2%
  await page.getByRole('button', { name: 'Госзакупки и содержание государства', exact: true }).click();
  await expect(page.getByRole('button', { name: 'расходы разово выше навсегда' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('lab-level')).toContainText('через квартал +0,5%');
  // фон: без шумов или на фоне шумов с полосой
  await page.getByRole('button', { name: /на фоне шумов/ }).click();
  await expect(page.getByTestId('lab-cb-note').locator('..')).toContainText('медиана');
  // казино — не игра, а расчёт: пять гостей сходятся к матожиданию, ставок и наград нет
  const casino = page.getByTestId('lab-casino');
  await expect(casino).toContainText('Почему казино всегда в плюсе');
  await expect(casino.getByTestId('lab-casino-chart').locator('.recharts-line')).toHaveCount(5);
  await expect(casino.getByTestId('lab-casino-table').locator('tbody tr')).toHaveCount(3);
  await expect(casino.getByTestId('lab-casino-table')).toContainText('27,0 кр.');
  await casino.getByRole('button', { name: 'бинарный опцион' }).click();
  await expect(casino.getByTestId('lab-casino-table')).toContainText('75,0 кр.');
  await expect(casino.getByTestId('lab-casino-binary')).toContainText('−7,5%');
  await expect(casino.getByRole('button', { name: /ставк/i })).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

test('после квартала: «а если бы вы ничего не делали» показывает вклад решения', async ({ page, isMobile }) => {
  test.skip(isMobile, 'рычаги на телефоне в отдельной вкладке — логика та же');
  const { errors } = await openApp(page);
  await startSoloGame(page);
  const slider = page.getByRole('slider', { name: /^Ключевая ставка, текущее значение/ });
  await slider.focus();
  for (let i = 0; i < 4; i++) await slider.press('ArrowRight');
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (await close.isVisible().catch(() => false)) await close.click();
  const card = page.getByTestId('counterfactual');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Вы изменили: ключевая ставка');
  await expect(card).toContainText('ваш вклад');
  // накопленное сравнение: вся партия в мире без ваших решений
  await expect(page.getByTestId('counterfactual-cum')).toContainText('С начала партии');
  await expect(page.getByTestId('counterfactual-cum')).toContainText('Средняя инфляция за партию');
  expect(errors).toEqual([]);
});

test('игра → учебник: «Подробнее в учебнике» открывает раздел, «В игру» видна сразу и возвращает в ту же партию', async ({ page, isMobile }) => {
  test.skip(isMobile, 'рычаги на телефоне в отдельной вкладке — логика та же');
  // на Пути уже уровень «Средний» — компас ставки и IS-LM открыты с первого квартала
  await page.addInitScript(() => { try { localStorage.setItem('ems-learn-level', '2'); } catch { /* нет хранилища */ } });
  const { errors, external } = await openApp(page);
  await startSoloGame(page);
  // у ставки — ссылки на IS-LM и AD-AS
  await expect(page.getByTestId('book-link').filter({ hasText: 'IS-LM' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  if (!(await close.isVisible().catch(() => false))) await page.getByRole('button', { name: /Газета/ }).first().click();
  await close.click();
  await page.getByRole('button', { name: /Почему это произошло/ }).first().click();
  const why = page.locator('.ems-panel-raised', { hasText: 'Почему это произошло?' });
  await why.getByRole('button', { name: 'Инфляция', exact: true }).click();
  await why.getByTestId('book-link').click();
  // учебник поверх партии: нужный раздел на экране
  const ch = page.getByTestId('chapter');
  await expect(ch).toHaveAttribute('data-chapter', 'phillips');
  await expect(ch.locator('#expectations')).toBeInViewport();
  // учебник пролистан к разделу — «← Назад в игру» наверху за краем, а плашка «В игру» на экране (пункт владельца 08.11, вечер)
  await expect(page.getByRole('button', { name: '← Назад в игру' })).not.toBeInViewport();
  await expect(page.getByTestId('tb-float-back')).toBeInViewport();
  // в новой главе работает свой график: ожидания сдвигают кривую Филлипса
  const ph = page.locator('[data-chart="phillips"]').first();
  await ph.getByRole('slider', { name: /Ожидаемая инфляция/ }).fill('6');
  await expect(ph.getByTestId('tb-readout')).toContainText('Инфляция π, %: 6');
  await page.getByRole('button', { name: '← Назад в игру' }).click();
  // та же партия, то же окно «Почему это произошло?», квартал не сбросился
  await expect(why).toBeVisible();
  await expect(page.getByRole('button', { name: 'Завершить квартал и применить решения' })).toBeVisible();
  // «Компас ставки» ведёт к правилу Тейлора
  await why.getByRole('button').first().click();
  await expect(why).toBeHidden();
  const compass = page.getByTestId('rate-compass');
  await compass.getByTestId('book-link').click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'policy');
  await expect(page.locator('#taylor')).toBeInViewport();
  // обратно — плашкой «В игру», не листая наверх
  await page.getByTestId('tb-float-back').click();
  await expect(compass).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('задача на 10 минут: цель на экране, прогноз записывается, в конце разбор', async ({ page, isMobile }) => {
  test.skip(isMobile, 'восемь кварталов подряд — достаточно одного экрана');
  test.setTimeout(120_000);
  const { errors } = await openApp(page);
  await page.getByText('Задачи на 10 минут', { exact: true }).first().click();
  await expect(page.getByTestId('drills').getByRole('button', { name: 'Начать' })).toHaveCount(10);
  await page.getByTestId('drills').getByRole('button', { name: 'Начать' }).first().click();
  await expect(page.getByTestId('drill-banner')).toContainText('Инфляция с 12% до 4%');
  await page.getByRole('textbox', { name: 'Прогноз инфляции через четыре квартала' }).fill('8');
  const finish = page.getByRole('button', { name: 'Завершить квартал и применить решения' });
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  for (let q = 1; q <= 8; q++) {
    await expect(finish).toBeEnabled({ timeout: 10_000 });
    await finish.click();
    if (await close.isVisible().catch(() => false)) await close.click();
    if (q === 1) await expect(page.getByTestId('forecast')).toContainText('Ждут проверки: 1');
  }
  const result = page.getByTestId('drill-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText('Инфляция с 12% до 4%');
  await expect(result).toContainText('Слепой прогноз');
  await result.getByRole('button', { name: 'Посмотреть графики' }).click();
  await expect(page.getByRole('button', { name: 'Разбор' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('«Мир»: числа по-русски — на экране партии и в газете нет чисел вида «4.1»; рубрики газеты — со значками, без эмодзи', async ({ page }) => {
  test.setTimeout(120_000);
  const { errors } = await openApp(page);
  await startSoloGame(page);
  await page.waitForTimeout(600);
  expect(await dottedNumbers(page), 'экран партии до первого квартала').toEqual([]);
  // ставка с дробью — и на рычаге, и в подписи для чтения с экрана — через запятую
  const rate = page.locator('input[type=range][aria-label^="Ключевая ставка, текущее"]');
  if (await rate.count()) await expect(rate.first()).toHaveAttribute('aria-label', /текущее значение \d+(,\d+)?%.*шаг 0,25/);
  for (let q = 1; q <= 3; q += 1) {
    await page.getByRole('button', { name: 'Завершить квартал и применить решения' }).click();
    const close = page.getByRole('button', { name: 'Закрыть газету' });
    // газета открывается сама после квартала или по кнопке
    await page.waitForTimeout(700);
    if (!(await close.isVisible().catch(() => false))) await page.getByRole('button', { name: /Газета/ }).first().click();
    await expect(close).toBeVisible();
    await page.waitForTimeout(400);
    expect(await dottedNumbers(page), `газета, квартал ${q}`).toEqual([]);
    // в газете есть дробные числа — и они с запятой
    if (q === 1) expect(await page.evaluate(() => /\d,\d/.test(document.body.innerText))).toBe(true);
    await close.click();
    await expect(close).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(await dottedNumbers(page), `экран партии после квартала ${q}`).toEqual([]);
  }
  // лента новостей на экране партии: в фильтрах рубрик — значок, не эмодзи
  const emoji = await page.evaluate(() => [...document.querySelectorAll('.ems-tab')].map((b) => b.textContent).filter((t) => /\p{Extended_Pictographic}/u.test(t)));
  expect(emoji, 'эмодзи в кнопках-фильтрах').toEqual([]);
  expect(errors).toEqual([]);
});

test('«Мир» на компонентах дизайн-системы: тот же знак, шрифт и кнопки, что в обучении', async ({ page }) => {
  // приветствие (до входа) и «Мир» — один знак рядом с одним начертанием названия
  const brandOf = (loc) => loc.evaluate((el) => ({ font: getComputedStyle(el).fontFamily, mark: !!(el.querySelector('svg') || (el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.querySelector('svg[aria-hidden="true"]'))) }));
  const { errors } = await openApp(page, '/', '{}', { tab: 'world' });
  const world = page.getByTestId('world');
  await expect(world).toHaveAttribute('data-ds-theme', 'world');
  const w = await brandOf(world.getByTestId('brand'));
  expect(w.mark).toBe(true);
  // заголовки — PT Sans (docs/world.md, «Один облик»)
  expect(w.font).toContain('PT Sans');
  // кнопки меню — из ds.jsx; старая игровая кнопка осталась только у общего регулятора звука
  const old = await world.locator('button.ems-btn').count();
  expect(old).toBeLessThanOrEqual(1);
  expect(await world.locator('.ds-btn, .ds-card, .ds-chip').count()).toBeGreaterThan(4);
  // «Мир» по умолчанию светлый; основная кнопка на тёмном золоте — белый текст, читается
  await expect(world).not.toHaveClass(/ds-dark/);
  const daily = world.getByTestId('daily-card');
  if (await daily.count()) {
    const c = await daily.locator('.ds-btn').first().evaluate((el) => getComputedStyle(el).color);
    expect(c).toBe('rgb(255, 255, 255)');
  }
  // приветствие — тот же знак и шрифт
  const p2 = await page.context().newPage();
  await p2.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p2.addInitScript(() => { try { localStorage.removeItem('ems-account'); } catch { /* нет хранилища */ } });
  await p2.goto('/', { waitUntil: 'networkidle' });
  const b = await brandOf(p2.getByTestId('welcome').getByTestId('brand'));
  expect(b.mark).toBe(true);
  expect(b.font).toBe(w.font);
  await p2.close();
  expect(errors).toEqual([]);
});

test('первый экран партии: компас ставки, Тейлор, IS-LM и риски — с 4-го квартала', async ({ page, isMobile }) => {
  test.skip(isMobile, 'рычаги на телефоне в отдельной вкладке — логика та же');
  const { errors } = await openApp(page);
  await startSoloGame(page);
  // 1-й квартал, на Пути уровня «Средний» нет: продвинутых панелей нет, вместо компаса — одна строка
  await expect(page.getByTestId('advanced-later')).toContainText('с 4-го квартала');
  await expect(page.getByTestId('rate-compass')).toHaveCount(0);
  await expect(page.getByTestId('summary-risks')).toHaveCount(0);
  await expect(page.getByTestId('book-link').filter({ hasText: 'IS-LM' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Риски', exact: true })).toHaveCount(0);
  await expect(page.getByText('Ставка по правилу Тейлора')).toHaveCount(0);
  // три квартала спустя — 4-й квартал: всё на месте
  const finish = page.getByRole('button', { name: 'Завершить квартал и применить решения' });
  const close = page.getByRole('button', { name: 'Закрыть газету' });
  for (let q = 0; q < 3; q += 1) {
    await finish.click();
    // газета может открыться сама — закрываем, чтобы не заслоняла рычаги
    await close.waitFor({ state: 'visible', timeout: 2500 }).then(() => close.click()).catch(() => {});
    await expect(finish).toBeEnabled();
  }
  await expect(page.getByTestId('rate-compass')).toBeVisible();
  await expect(page.getByTestId('summary-risks')).toBeVisible();
  await expect(page.getByTestId('advanced-later')).toHaveCount(0);
  await expect(page.getByTestId('book-link').filter({ hasText: 'IS-LM' }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

// пункт владельца 16.11, вечер: «сделай интерфейс частного инвестора не хуже, чем на фото — не один в один, современно, приятно»
test('частный инвестор: тёмный терминал — бегущая строка, карточки счёта, список со спарклайнами, свечи с периодами, заявка с быстрыми суммами', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Частный инвестор');
  const t = page.getByTestId('trader-terminal');
  await expect(t).toBeVisible();
  // тёмная панель в любой теме; старая строка «ТОРГИ» над терминалом не дублирует бегущую строку внутри
  expect(await t.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(10, 14, 19)');
  await expect(page.getByText('ТОРГИ', { exact: true })).toHaveCount(0);
  await expect(t.getByTestId('tt-tape').locator('.tt-tick').first()).toBeVisible();
  await expect(t.getByTestId('tt-stat')).toHaveCount(5);
  await expect(t.locator('[data-testid=tt-row] .tt-spark').first()).toBeVisible();
  // «Сейчас»: свечи из живых котировок набираются сами
  await expect(t.locator('[data-testid=tt-tf][data-tf="live"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => Number(await t.getByTestId('tt-chart').getAttribute('data-candles')), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  // выбор инструмента в списке — шапка и цена
  await t.locator('[data-testid=tt-row][data-id="eq_banks"]').click();
  await expect(t.getByTestId('tt-name')).toHaveText('Банки (ETF)');
  await expect(t.locator('[data-testid=tt-row][data-id="eq_banks"]')).toHaveAttribute('aria-pressed', 'true');
  // быстрая сумма и «Макс»
  await t.getByTestId('tt-quick').filter({ hasText: /^2$/ }).click();
  await expect(t.getByTestId('tt-amount')).toHaveValue('2');
  await t.getByTestId('tt-max').click();
  expect(Number(await t.getByTestId('tt-amount').inputValue())).toBeGreaterThan(9);
  await t.getByTestId('tt-quick').filter({ hasText: /^1$/ }).click();
  await expect(t.getByTestId('tt-submit')).toHaveText(/Купить BNK на 1,00\s*млн/);
  await t.getByTestId('tt-submit').click();
  await expect(t.getByTestId('tt-trades')).toContainText('BNK');
  await expect(t.getByTestId('tt-position')).toContainText('лонг');
  // квартальные свечи: идущий квартал — последняя свеча; сделка отмечена треугольником; вид «Линия»
  await t.locator('[data-testid=tt-tf][data-tf="all"]').click();
  await expect(t.getByTestId('tt-candle').first()).toBeVisible();
  await expect(t.locator('[data-testid=tt-mark][data-side="buy"]')).toHaveCount(1);
  await t.locator('[data-testid=tt-mode][data-mode="line"]').click();
  await expect(t.getByTestId('tt-chart')).toHaveAttribute('data-mode', 'line');
  await expect(t.getByTestId('tt-candle')).toHaveCount(0);
  // раскладка: на ПК — три колонки рядом, на телефоне — друг под другом
  const box = async (sel) => t.locator(sel).boundingBox();
  const [list, main, order] = [await box('.tt-list'), await box('.tt-main'), await box('.tt-order')];
  if (isMobile) { expect(main.y).toBeGreaterThan(list.y); expect(order.y).toBeGreaterThan(main.y); }
  else { expect(main.x).toBeGreaterThan(list.x + list.width - 2); expect(order.x).toBeGreaterThan(main.x + main.width - 2); expect(list.height).toBeLessThan(main.height + 40); }
  await expectNoSidewaysScroll(page);
  // доступность терминала: без серьёзных нарушений axe
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const res = await new AxeBuilder({ page }).include('[data-testid="trader-terminal"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('; ')}`)).toEqual([]);
  expect(errors).toEqual([]);
});

// замечание владельца 18.11, вечер, п. 10: «в мире нет кнопки жалобы»
test('«Мир»: флажок «Сообщить об ошибке» в шапке партии — шторка в цветах «Мира», в жалобу уходят роль, квартал и числа', async ({ page }) => {
  await page.addInitScript((a) => { localStorage.setItem('ems-account', JSON.stringify(a)); }, ACCOUNT);
  const sent = [];
  const { errors } = await openApp(page, '/', (req) => { if (req.url().includes('/api/reports') && req.method() === 'POST') sent.push(req.postDataJSON()); return '{"ok":true}'; });
  await startSoloGame(page);
  await page.getByTestId('world-report').click();
  const sheet = page.getByTestId('report-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Что не так в «Мире»');
  await sheet.locator('[data-reason="theory"]').click();
  await expect(sheet.locator('[data-reason="theory"]')).toContainText('Экономика ведёт себя странно');
  await sheet.getByTestId('report-send').click();
  await expect(page.getByTestId('report-thanks')).toBeVisible();
  const r = sent.find((x) => x.action === 'send');
  expect(r.reason).toBe('theory');
  expect(r.context).toMatchObject({ screen: 'world', kind: 'central_bank', mode: 'solo', step: 'квартал 1' });
  expect(JSON.parse(r.context.numbers)).toHaveProperty('inflation');
  expect(errors).toEqual([]);
});

// замечание владельца 18.11, вечер, п. 12: «странно, что внешняя политика есть в кабинете, хотя должна быть на карте»
test('президент: внешняя политика — на карте («Наша страна»), в кабинете — только подсказка, куда идти', async ({ page }) => {
  const { errors } = await openApp(page);
  await startSoloGame(page, 'Президент');
  await expect(page.getByTestId('pres-foreign-hint')).toContainText('на вкладке «Карта»');
  await expect(page.getByText('Ввести санкции против торгового партнёра')).toHaveCount(0);
  await page.getByRole('button', { name: 'Карта' }).first().click();
  await page.getByRole('button', { name: 'Наша страна' }).click();
  const fp = page.getByTestId('map-foreign-policy');
  await expect(fp).toBeVisible();
  await expect(fp).toContainText('Вступить в торговый блок');
  await fp.getByText('Вступить в торговый блок').click();
  await expect(fp).toContainText('Свободно');
  expect(errors).toEqual([]);
});
