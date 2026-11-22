/* БРАУЗЕРНЫЕ СЦЕНАРИИ — особые уроки: «Персоналии», «Чтение», «Разбор графика», «Нарисуй сам», книжная полка.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/extras.e2e.js */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { BOOK_BY_ID, bookSpeech, passageAt, passageStart } from '../src/learn/shelf.js';
import { PEOPLE } from '../src/learn/people.js';
import { listPeoplePhotos, readPhotoCredits } from '../scripts/voice-files-plugin.js';
import { openApp, openTab, pathNode, installHooks, showUnit, startLesson } from './helpers.js';

installHooks();

// пункт владельца 15.11: «в квадратных уроках нет украшений и тем урока, … нету серии ответов, инфли. И нельзя продолжить, только начать заново»
test('особые уроки как обычный: тема и украшение урока, серия ответов с Инфлей, продолжить с места', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])),
      owned: { 'theme-aurora': at, 'desk-bunting': at }, wear: { theme: 'theme-aurora', desk: 'desk-bunting', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const open = async () => {
    const card = page.locator('[data-testid=path-extra][data-id="read-choice"]');
    await card.scrollIntoViewIfNeeded(); await card.click();
    await page.getByTestId('extra-sheet').getByTestId('extra-start').click();
    await expect(page.getByTestId('reading')).toBeVisible();
  };
  await open();
  // тема урока из лавки — и в «Чтении»; украшение — на ПК и планшете
  await expect(page.getByTestId('special-skin')).toHaveAttribute('data-skin', 'aurora');
  await expect(page.getByTestId('special-desk')).toHaveCount(isMobile ? 0 : 1);
  // шапка — как у урока (пункт владельца 16.11): «✕», полоса прогресса из отрезков со счётом «0/3», Инфля; молния — с трёх верных подряд;
  // вид урока и название — над заданием, а не в шапке
  const head = page.getByTestId('reading').getByTestId('special-head');
  await expect(head.locator('.ln-head')).toHaveCount(1);
  await expect(head.getByTestId('special-progress')).toContainText('0/3');
  await expect(head.locator('.ln-head')).not.toContainText('Чтение');
  // вид урока — в том же блоке шапки, одной полосой (жалоба ученика 16.11: «сверху две какие-то плашки»)
  await expect(head.getByTestId('special-label')).toHaveCount(1);
  await expect(head.getByTestId('lesson-streak')).toHaveCount(0);
  await expect(page.getByTestId('reading').getByTestId('special-label')).toContainText('Чтение · ');
  // серия верных ответов с Инфлей в шапке
  const run = page.getByTestId('reading').getByTestId('special-run');
  await expect(run).toHaveAttribute('data-n', '0');
  const p = page.getByTestId('reading-page');
  if (await p.getAttribute('data-kind') === 'mark') await p.locator('[data-testid=reading-word][data-hit="1"]').first().click();
  else await p.locator('[data-testid=reading-opt][data-ok]').click();
  await expect(run).toHaveAttribute('data-n', '1');
  await expect(head.getByTestId('special-progress')).toContainText('1/3');
  await page.getByTestId('reading-next').click();
  await expect(p).toHaveAttribute('data-page', '2');
  // вышли посреди чтения — при входе продолжаем со второй страницы, серия та же
  await page.getByTestId('reading-close').click();
  await expect(page.getByTestId('reading')).toHaveCount(0);
  // в карточке — «Продолжить», как у обычного урока (пункт владельца 16.11); внутри — без полосы «Продолжаем…»
  const card = page.locator('[data-testid=path-extra][data-id="read-choice"]');
  await card.scrollIntoViewIfNeeded(); await card.click();
  await expect(page.getByTestId('extra-sheet').getByTestId('extra-start')).toHaveText('Продолжить');
  await expect(page.getByTestId('extra-sheet').getByTestId('extra-resume-note')).toContainText('сохранён');
  await page.getByTestId('extra-sheet').getByTestId('extra-start').click();
  await expect(page.getByTestId('reading')).toBeVisible();
  await expect(page.getByTestId('special-resumed')).toHaveCount(0);
  await expect(page.getByTestId('reading-page')).toHaveAttribute('data-page', '2');
  await expect(page.getByTestId('reading').getByTestId('special-run')).toHaveAttribute('data-n', '1');
  expect(errors).toEqual([]);
});

test('«Чтение» — урок на дороге юнита: после урока перед ним; цитаты, «найдите в цитате», полка и опыт один раз', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const card = page.locator('[data-testid=path-extra][data-id="read-choice"]');
  await expect(card).toHaveAttribute('data-id', 'read-choice');
  await expect(card).toHaveAttribute('data-state', 'open');
  // «Персоналии» юнита — тоже остановка дороги, открыта после второго урока
  await expect(page.locator('[data-testid=path-extra][data-id="people-scarcity"]')).toHaveAttribute('data-state', 'open');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  // сначала — карточка урока, как у обычного: что внутри, сколько минут и опыта
  const sheet = page.getByTestId('extra-sheet');
  await expect(sheet).toHaveAttribute('data-extra', 'read');
  await expect(sheet.getByTestId('extra-meta')).toContainText(/≈\d+ мин/);
  await expect(sheet.getByTestId('extra-meta')).toContainText('+12 опыта');
  await expect(sheet.getByTestId('extra-inside')).toContainText('цитат');
  await expect(sheet.getByTestId('extra-start')).toHaveText('Начать');
  await sheet.getByTestId('extra-start').click();
  const reading = page.getByTestId('reading');
  await expect(reading).toBeVisible();
  // «Ошибка?» — в шапке чтения
  await expect(reading.getByTestId('report-flag')).toContainText('Ошибка?');
  for (let k = 1; k <= 3; k += 1) {
    const p = reading.getByTestId('reading-page');
    await expect(p).toHaveAttribute('data-page', String(k));
    await expect(page.getByTestId('reading-next')).toBeDisabled();
    // «найдите в цитате» — касание слова; выбор — вариант
    if (await p.getAttribute('data-kind') === 'mark') await p.locator('[data-testid=reading-word][data-hit="1"]').first().click();
    else await p.locator('[data-testid=reading-opt][data-ok]').click();
    await expect(page.getByTestId('reading-feedback')).toHaveAttribute('data-ok', 'true');
    await page.getByTestId('reading-next').click();
  }
  await expect(page.getByTestId('reading-done')).toContainText('Подборка встала на полку');
  // итоги — как после урока (пункт владельца 08.11, вечер): опыт, точность, время и монеты за урок
  const rres = page.getByTestId('reading-done').getByTestId('extra-result');
  await expect(rres).toHaveAttribute('data-kind', 'read');
  await expect(rres.getByTestId('result-xp')).toContainText('+12');
  await expect(rres.getByTestId('result-acc')).toContainText('100%');
  await expect(rres.getByTestId('result-coins')).toBeVisible();
  expect(Number(await rres.getAttribute('data-coins'))).toBeGreaterThanOrEqual(15);
  await expect(page.locator('[data-testid=reading-book][data-done="true"]')).toHaveCount(1);
  // прочитана впервые — книга падает на полку
  await expect(page.locator('[data-testid=reading-book][data-new="true"]')).toHaveCount(1);
  await expect(page.getByTestId('reading-keep')).toContainText('Роббинс');
  await page.getByTestId('reading-finish').click();
  await expect(reading).toHaveCount(0);
  await expect(card).toHaveAttribute('data-state', 'done');
  expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.read['read-choice'])).toBe(true);
  // перечитать можно, опыт — уже нет; «Найдите в цитате» с ошибкой — верные слова подчёркнуты
  await card.click();
  await expect(page.getByTestId('extra-done-mark')).toBeVisible();
  await page.getByTestId('extra-start').click();
  await reading.locator('[data-testid=reading-word]:not([data-hit])').first().click();
  await expect(page.getByTestId('reading-feedback')).toHaveAttribute('data-ok', 'false');
  await expect(page.getByTestId('reading-feedback')).toContainText('Нужные слова подчёркнуты');
  await page.getByTestId('reading-close').click();
  await expect(reading).toHaveCount(0);
  expect(errors).toEqual([]);
});

// жалоба ученика mw7qac86 (08.11): «у меня уже была эта книга, и на телефоне книги сжались» — перечитанная не падает заново, полки по шесть
test('«Чтение» перечитано: книга уже стоит на полке (без падения), монет нет; книги на полках по шесть и не сужаются', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), read: { 'read-choice': at }, met: { 'people-scarcity': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const card = page.locator('[data-testid=path-extra][data-id="read-choice"]');
  await card.scrollIntoViewIfNeeded(); await card.click();
  await page.getByTestId('extra-start').click();
  const reading = page.getByTestId('reading');
  for (let k = 1; k <= 3; k += 1) {
    const p = reading.getByTestId('reading-page');
    await expect(p).toHaveAttribute('data-page', String(k));
    if (await p.getAttribute('data-kind') === 'mark') await p.locator('[data-testid=reading-word][data-hit="1"]').first().click();
    else await p.locator('[data-testid=reading-opt][data-ok]').click();
    await page.getByTestId('reading-next').click();
  }
  const done = page.getByTestId('reading-done');
  await expect(done.getByTestId('extra-result')).toHaveAttribute('data-replay', 'true');
  await expect(done.getByTestId('extra-result')).toHaveAttribute('data-coins', '0');
  await expect(done.getByTestId('reading-shelf-count')).toContainText('Подборка уже стояла на полке');
  // счёт — подборок цитат, а не книг: книг в библиотеке другое число (пункт владельца 15.11)
  await expect(done.getByTestId('reading-shelf-count')).toContainText(/Прочитано подборок цитат — \d+ из \d+/);
  await expect(done.getByTestId('reading-shelf-count')).not.toContainText('Книга');
  await expect(done.locator('[data-testid=reading-book][data-new]')).toHaveCount(0);
  await expect(done.locator('[data-testid=reading-book][data-done="true"]')).toHaveCount(1);
  // полки по шесть книг, каждая — во всю свою ширину (38px), а не сплющена
  const rows = done.getByTestId('reading-shelf-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(2);
  for (const n of await rows.evaluateAll((els) => els.map((e) => e.children.length))) expect(n).toBeLessThanOrEqual(6);
  const widths = await done.getByTestId('reading-book').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  widths.forEach((w) => expect(w).toBeGreaterThanOrEqual(37));
  const shelf = await done.getByTestId('reading-shelf').boundingBox();
  expect(shelf.x + shelf.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(errors).toEqual([]);
});

// «Чтение» на алмаз (пункт владельца 08.11): контекст — после ответа, «Кто это сказал?», алмаз — без ошибок
test('«Чтение» на алмаз: контекст после ответа, «Кто это сказал?», с ошибкой — не взят, без ошибок — алмаз на дороге', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), read: { 'read-choice': at }, met: { 'people-scarcity': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const card = page.locator('[data-testid=path-extra][data-id="read-choice"]');
  await expect(card).toHaveAttribute('data-state', 'done');
  await expect(card).not.toHaveAttribute('data-diamond', 'true');
  const pass = async (wrongWho) => {
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const sheet = page.getByTestId('extra-sheet');
    await expect(sheet.getByTestId('extra-gem')).toBeVisible();
    await sheet.getByTestId('extra-gem').click();
    const reading = page.getByTestId('reading');
    await expect(reading).toHaveAttribute('data-gem', 'true');
    for (let k = 1; k <= 3; k += 1) {
      const p = reading.getByTestId('reading-page');
      await expect(p).toHaveAttribute('data-page', String(k));
      // контекст скрыт до ответа, после — открыт
      await expect(p.getByTestId('reading-context-hidden')).toBeVisible();
      await expect(p.getByTestId('reading-context')).toHaveCount(0);
      if (await p.getAttribute('data-kind') === 'mark') await p.locator('[data-testid=reading-word][data-hit="1"]').first().click();
      else await p.locator('[data-testid=reading-opt][data-ok]').click();
      await expect(p.getByTestId('reading-context')).toBeVisible();
      // «Назад» — к прошлой странице: её ответ на месте (пункт владельца 22.11, п. 7), «Дальше» — обратно
      if (k === 2) {
        await page.getByTestId('reading-back').click();
        await expect(reading.getByTestId('reading-page')).toHaveAttribute('data-page', '1');
        await expect(reading.getByTestId('reading-context')).toBeVisible();
        await page.getByTestId('reading-next').click();
        await expect(reading.getByTestId('reading-page')).toHaveAttribute('data-page', '2');
      }
      await page.getByTestId('reading-next').click();
    }
    // «Кто это сказал?» — одна цитата на экран, ответ — карточка автора; цитаты не в порядке страниц (пункт владельца 22.11, пп. 6, 8)
    const who = reading.getByTestId('reading-who');
    await expect(who).toBeVisible();
    await expect(who.getByTestId('reading-who-item')).toHaveCount(1);
    await expect(page.getByTestId('reading-next')).toBeDisabled();
    for (let k = 0; k < 3; k += 1) {
      const it = who.getByTestId('reading-who-item');
      await expect(it).toHaveAttribute('data-answered', 'false');
      if (wrongWho && k === 0) await it.locator('[data-testid=reading-who-opt]:not([data-ok])').first().click();
      else await it.locator('[data-testid=reading-who-opt][data-ok]').click();
      await expect(who.getByTestId('reading-who-says')).toContainText(/\d{4}/);
      await expect(who.locator('.rd-who-dots i.ok, .rd-who-dots i.bad')).toHaveCount(k + 1);
    }
    await page.getByTestId('reading-next').click();
    return page.getByTestId('reading-done');
  };
  // ошибка в «Кто это сказал?» — алмаз не взят
  let done = await pass(true);
  await expect(done).toHaveAttribute('data-won', 'false');
  await expect(done).toContainText('Алмаз не взят');
  await page.getByTestId('reading-finish').click();
  await expect(card).not.toHaveAttribute('data-diamond', 'true');
  // без ошибок — алмаз и +12 опыта; на дороге — алмазная печать
  done = await pass(false);
  await expect(done).toHaveAttribute('data-won', 'true');
  // итоги — как после урока на алмазе: опыт и монеты за алмаз (25 и ещё 10 «без ошибок») — один раз
  const gres = done.getByTestId('extra-result');
  await expect(gres).toHaveAttribute('data-diamond', 'true');
  await expect(gres.getByTestId('result-diamond')).toContainText('Алмазный уровень взят');
  await expect(gres.getByTestId('result-xp')).toContainText('+12');
  expect(Number(await gres.getAttribute('data-coins'))).toBeGreaterThanOrEqual(35);
  await page.getByTestId('reading-finish').click();
  await expect(card).toHaveAttribute('data-diamond', 'true');
  expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.readGem['read-choice'])).toBe(true);
  await card.click();
  await expect(page.getByTestId('extra-done-mark')).toContainText('алмаз');
  await expect(page.getByTestId('extra-gem')).toContainText('ещё раз');
  expect(errors).toEqual([]);
});

test('«Персоналии» — урок на дороге юнита: три портрета, лента веков, вопрос; галерея и книжная полка в профиле', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="people-scarcity"]');
  await expect(stop).toHaveAttribute('data-state', 'open');
  // «Чтение» ещё закрыто — касание объясняет, когда откроется
  await page.locator('[data-testid=path-extra][data-id="read-choice"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid=path-extra][data-id="read-choice"]').click();
  await expect(page.getByTestId('extra-locked')).toContainText('Откроется, когда пройдёте урок');
  await page.getByTestId('extra-locked').getByRole('button', { name: 'Понятно' }).click();
  await stop.scrollIntoViewIfNeeded();
  await stop.click();
  await page.getByTestId('extra-start').click();
  const view = page.getByTestId('people');
  await expect(view).toHaveAttribute('data-id', 'people-scarcity');
  // флажок «Сообщить об ошибке» — в шапке, как в любом уроке
  await view.getByTestId('report-flag').click();
  await expect(page.getByTestId('report-sheet')).toBeVisible();
  await page.getByTestId('report-sheet-back').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('report-sheet')).toHaveCount(0);
  for (const id of ['robbins', 'malthus', 'ricardo']) {
    const pg = view.getByTestId('people-page');
    await expect(pg).toHaveAttribute('data-person', id);
    await expect(pg.getByTestId('people-portrait')).toBeVisible();
    await expect(pg.getByTestId('people-era')).toBeVisible();
    await expect(page.getByTestId('people-next')).toBeDisabled();
    // сначала ошибка — объяснение и «попробуйте ещё», потом верный
    await pg.locator('[data-testid=people-opt][data-ok="false"]').first().click();
    await expect(page.getByTestId('people-feedback')).toHaveAttribute('data-ok', 'false');
    await pg.locator('[data-testid=people-opt][data-ok="true"]').click();
    await expect(page.getByTestId('people-feedback')).toHaveAttribute('data-ok', 'true');
    // на первом человеке назад некуда; со второго — «Назад»: прошлый человек с его ответом и разбором
    if (id === 'robbins') await expect(page.getByTestId('people-back')).toBeDisabled();
    if (id === 'malthus') {
      await page.getByTestId('people-back').click();
      await expect(view.getByTestId('people-page')).toHaveAttribute('data-person', 'robbins');
      await expect(page.getByTestId('people-feedback')).toHaveAttribute('data-ok', 'true');
      await expect(page.getByTestId('people-next')).toBeEnabled();
      await page.getByTestId('people-next').click();
      await expect(view.getByTestId('people-page')).toHaveAttribute('data-person', 'malthus');
      await expect(page.getByTestId('people-feedback')).toHaveAttribute('data-ok', 'true');
    }
    await page.getByTestId('people-next').click();
  }
  // итоги — как после урока: опыт и монеты за урок; портреты — под итогами
  const pres = page.getByTestId('people-done').getByTestId('extra-result');
  await expect(pres.getByTestId('result-xp')).toContainText('+12');
  expect(Number(await pres.getAttribute('data-coins'))).toBeGreaterThanOrEqual(10);
  await expect(page.getByTestId('people-wall').locator('figure')).toHaveCount(3);
  await page.getByTestId('people-finish').click();
  await expect(stop).toHaveAttribute('data-state', 'done');
  // профиль: в галерее — трое знакомых, на полке открылись «Богатство народов» и «Начала»
  await openTab(page, 'profile');
  const shelf = page.getByTestId('prof-shelf');
  await shelf.scrollIntoViewIfNeeded();
  // в каждом юните «Персоналии» (пункт 2 от 08.11): «Люди отдачи» в «Заводе» — ещё трое
  await expect(page.getByTestId('gallery-count')).toHaveText('3 из 36');
  await expect(shelf.locator('[data-testid=gallery-person][data-met="true"]')).toHaveCount(3);
  await expect(page.getByTestId('shelf-count')).toHaveText('2 из 11');
  await expect(page.getByTestId('shelf-read')).toHaveCount(0);
  await shelf.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  const book = page.getByTestId('book-reader');
  await expect(book).toBeVisible();
  await expect(book.getByTestId('book-passage')).toHaveCount(BOOK_BY_ID['smith-wealth'].passages.length);
  await expect(book).toContainText('Не от благожелательности мясника, пивовара или булочника');
  // «Отметить прочитанной» — не сразу, а через половину времени чтения: полку не «прокликать» ради опыта
  await expect(book.getByTestId('book-mark-read')).toBeDisabled();
  await expect(book.getByTestId('book-read-wait')).toContainText(/Откроется через \d+:\d\d/);
  const left = Number(await book.getByTestId('book-read-wait').getAttribute('data-left'));
  expect(left).toBeGreaterThan(150);
  await expect.poll(async () => Number(await book.getByTestId('book-read-wait').getAttribute('data-left'))).toBeLessThan(left);
  // время помнит устройство: закрыли, «дочитали» (накопленное время — в ems-book-time) и открыли снова
  await page.getByTestId('book-close').click();
  await page.evaluate(() => localStorage.setItem('ems-book-time', JSON.stringify({ 'smith-wealth': 600 })));
  await shelf.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  await expect(book.getByTestId('book-read-wait')).toHaveCount(0);
  // дочитали — в конце «Отметить прочитанной»: штамп с датой и «+5 опыта», на полке — закладка
  await book.getByTestId('book-mark-read').click();
  await expect(book.getByTestId('book-read-stamp')).toContainText('Прочитано');
  await expect(book.getByTestId('book-xp')).toHaveText('+5 опыта');
  await page.getByTestId('book-close').click();
  const smith = shelf.locator('[data-testid=shelf-book][data-book="smith-wealth"]');
  await expect(smith).toHaveAttribute('data-read', 'true');
  await expect(smith).toHaveAttribute('aria-label', /прочитана/);
  await expect(smith.locator('.lb-ribbon')).toHaveCount(1);
  await expect(page.getByTestId('shelf-read')).toHaveText('прочитано 1');
  await expect(shelf.locator('[data-testid=shelf-book][data-book="ricardo-principles"]')).toHaveAttribute('data-read', 'false');
  // закрытая книга — подсказка, что её откроет
  await shelf.locator('[data-testid=shelf-book][data-book="keynes-tract"]').click();
  await expect(page.getByTestId('shelf-locked')).toContainText('«Гастроном»');
  expect(errors).toEqual([]);
});

test('книгу на полке можно слушать: голос браузера без «[…]»; запись — перемотка, скорость, «слушать отсюда», мини-проигрыватель', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ems-textbook-v1')) {
      localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, met: { 'people-scarcity': Date.now() - 86400000 } } }));
    }
    // голос браузера — подмена: запоминает текст и сразу «дочитывает»; запись — подмена проигрывателя
    window.__spoken = []; window.__tapes = [];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ lang: 'ru-RU', name: 'Milena' }], addEventListener() {}, removeEventListener() {}, cancel() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 20); },
    } });
    window.Audio = class {
      constructor() { this.src = ''; this.currentTime = 0; this.duration = 0; this.playbackRate = 1; this.paused = true; window.__tape = this; }
      pause() { this.paused = true; }
      play() { window.__tapes.push(this.src); this.duration = 600; this.paused = false; return Promise.resolve(); }
    };
    window.__tapeAt = (f) => { const a = window.__tape; a.currentTime = f * a.duration; a.ontimeupdate(); };
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const openSmith = async () => {
    await openTab(page, 'profile');
    await page.getByTestId('prof-shelf').scrollIntoViewIfNeeded();
    await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
    await expect(page.getByTestId('book-reader')).toBeVisible();
  };
  await openSmith();
  const book = page.getByTestId('book-reader');
  const listen = book.getByTestId('book-listen');
  // записи нет — читает голос браузера, часть за частью, без «[…]»; дочитал — снова «Слушать книгу»
  await expect(listen).toHaveAttribute('data-mode', 'speech');
  await expect(listen.getByTestId('book-voice-caption')).toContainText('голос браузера');
  await listen.getByTestId('book-play').click();
  // между отрывками — по три секунды тишины: на границе отрывка голос молчит, потом читает дальше
  await page.waitForTimeout(1500);
  const firstPassage = await page.evaluate(() => window.__spoken.length);
  expect(firstPassage).toBeLessThan(bookSpeech(BOOK_BY_ID['smith-wealth']).length);
  await expect(listen).toHaveAttribute('data-state', 'paused', { timeout: 40_000 });
  const spoken = await page.evaluate(() => window.__spoken);
  expect(spoken.length).toBe(bookSpeech(BOOK_BY_ID['smith-wealth']).length);
  expect(spoken[0]).toContain('Адам Смит');
  expect(spoken.filter((t) => /\[|\]/.test(t))).toEqual([]);
  expect(spoken.join(' ')).toContain('Рабочий, не обученный этому делу, едва ли');
  await page.getByTestId('book-close').click();
  // запись есть (флаг автотеста): играет /books/smith-wealth.mp3
  await page.evaluate(() => localStorage.setItem('ems-book-audio-test', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await openSmith();
  await expect(listen).toHaveAttribute('data-mode', 'file');
  await expect(listen.getByTestId('book-voice-caption')).toHaveText('голос синтезирован');
  await listen.getByTestId('book-play').click();
  await expect(listen).toHaveAttribute('data-state', 'playing');
  expect(await page.evaluate(() => window.__tapes[0])).toMatch(/\/books\/smith-wealth\.mp3$/);
  // прослушана половина — отмечен отрывок, который звучит
  const parts = bookSpeech(BOOK_BY_ID['smith-wealth']);
  await page.evaluate(() => window.__tapeAt(0.5));
  await expect(book.locator('[data-testid=book-passage][data-now="true"]')).toHaveAttribute('data-passage', passageAt(parts, 0.5));
  await expect(listen.getByTestId('book-now')).toHaveText(BOOK_BY_ID['smith-wealth'].passages.find((x) => x.id === passageAt(parts, 0.5)).title);
  // скорость: 1× → 1,25×
  await listen.getByTestId('book-speed').click();
  await expect(listen.getByTestId('book-speed')).toHaveText('1,25×');
  // громкость — ползунок с динамиком; динамик выключает звук и возвращает прежнюю громкость; громкость помнит устройство
  const vol = listen.getByTestId('book-volume');
  await expect(vol).toHaveValue('100');
  await vol.fill('40');
  await expect(vol).toHaveAttribute('aria-valuetext', '40%');
  await listen.getByTestId('book-mute').click();
  await expect(vol).toHaveValue('0');
  await listen.getByTestId('book-mute').click();
  await expect(vol).toHaveValue('40');
  expect(await page.evaluate(() => localStorage.getItem('ems-book-volume'))).toBe('0.4');
  expect(await page.evaluate(() => window.__tape.playbackRate)).toBe(1.25);
  // «слушать» у отрывка — запись перематывается к его началу
  const taxes = book.locator('[data-testid=book-passage][data-passage="taxes"]');
  await taxes.getByTestId('book-passage-play').click();
  expect(await page.evaluate(() => window.__tape.currentTime)).toBeCloseTo(passageStart(parts, 'taxes') * 600, 0);
  await page.evaluate((f) => window.__tapeAt(f + 0.001), passageStart(parts, 'taxes'));
  await expect(taxes).toHaveAttribute('data-now', 'true');
  await expect(taxes.getByTestId('book-passage-play')).toContainText('звучит');
  // проигрыватель ушёл с экрана — внизу мини-проигрыватель; пауза из него
  const mini = book.getByTestId('book-mini');
  await expect(mini).toBeVisible();
  await expect(mini).toContainText('Четыре правила налогов');
  // и в мини-проигрывателе можно перематывать: ползунок и ±15 секунд
  await mini.getByTestId('book-mini-seek').fill('250');
  expect(await page.evaluate(() => window.__tape.currentTime)).toBeCloseTo(150, 0);
  await mini.getByTestId('book-mini-back').click();
  expect(await page.evaluate(() => window.__tape.currentTime)).toBeCloseTo(135, 0);
  await mini.getByTestId('book-mini-fwd').click();
  expect(await page.evaluate(() => window.__tape.currentTime)).toBeCloseTo(150, 0);
  // громкость и в мини-проигрывателе (пункт владельца 08.11): на ПК — ползунок при наведении на динамик, на телефоне — по касанию
  const hov = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  const mv = mini.getByTestId('book-mini-vol');
  const mvol = mini.getByTestId('book-mini-volume');
  await expect(mvol).toHaveCount(0);
  if (hov) await mv.hover(); else await mv.getByTestId('book-mini-vol-btn').click();
  await expect(mvol).toBeVisible();
  await expect(mvol).toHaveValue('40');
  await mvol.fill('70');
  await expect(vol).toHaveValue('70');
  expect(await page.evaluate(() => localStorage.getItem('ems-book-volume'))).toBe('0.7');
  // на ПК нажатие на динамик — без звука и обратно
  if (hov) {
    await mv.getByTestId('book-mini-vol-btn').click();
    await expect(mvol).toHaveValue('0');
    await mv.getByTestId('book-mini-vol-btn').click();
    await expect(mvol).toHaveValue('70');
    await page.mouse.move(4, 4);
  } else await mv.getByTestId('book-mini-vol-btn').click();
  await expect(mvol).toHaveCount(0);
  await page.evaluate((f) => window.__tapeAt(f + 0.001), passageStart(parts, 'taxes'));
  await mini.getByTestId('book-mini-play').click();
  await expect(listen).toHaveAttribute('data-state', 'paused');
  expect(await page.evaluate(() => window.__tape.paused)).toBe(true);
  // закрыли и открыли снова — место запомнилось
  await page.getByTestId('book-close').click();
  // на паузе книга не пропала: над вкладками — мини-проигрыватель
  await expect(page.getByTestId('book-dock')).toBeVisible();
  await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  await expect(page.getByTestId('book-dock')).toHaveCount(0);
  await expect(listen).toContainText('Вы остановились здесь');
  await expect(listen.getByTestId('book-now')).toHaveText('Четыре правила налогов');
  await expect(listen.getByTestId('book-speed')).toHaveText('1,25×');
  // включили и закрыли книгу — звучит дальше; над вкладками мини-проигрыватель, и на Пути тоже
  await listen.getByTestId('book-play').click();
  await expect(listen).toHaveAttribute('data-state', 'playing');
  await page.getByTestId('book-close').click();
  await expect(page.getByTestId('book-reader')).toHaveCount(0);
  const dock = page.getByTestId('book-dock');
  await expect(dock).toHaveAttribute('data-state', 'playing');
  expect(await page.evaluate(() => window.__tape.paused)).toBe(false);
  await openTab(page, 'path');
  await expect(dock).toBeVisible();
  await expect(dock).toContainText('Четыре правила налогов');
  expect(await page.evaluate(() => window.__tape.paused)).toBe(false);
  // перемотка и пауза — прямо над вкладками
  await dock.getByTestId('book-mini-seek').fill('500');
  expect(await page.evaluate(() => window.__tape.currentTime)).toBeCloseTo(300, 0);
  await dock.getByTestId('book-mini-play').click();
  await expect(dock).toHaveAttribute('data-state', 'paused');
  expect(await page.evaluate(() => window.__tape.paused)).toBe(true);
  // касание названия — книга поверх Пути, на звучащем отрывке; мини-проигрыватель над вкладками прячется
  await page.evaluate(() => window.__tapeAt(0.5));
  await dock.getByTestId('book-mini-title').click();
  await expect(page.getByTestId('book-reader')).toBeVisible();
  await expect(dock).toHaveCount(0);
  await page.getByTestId('book-close').click();
  // «×» — тишина, мини-проигрыватель уходит
  await dock.getByTestId('book-mini-play').click();
  await expect(dock).toHaveAttribute('data-state', 'playing');
  await dock.getByTestId('book-mini-close').click();
  await expect(dock).toHaveCount(0);
  expect(await page.evaluate(() => window.__tape.paused)).toBe(true);
  expect(errors).toEqual([]);
});

// читалка книги (пункты владельца 08.11): размер текста, «Сообщить об ошибке», «Наверх», один ползунок прокрутки
test('читалка книги: размер текста — пять ступеней, помнит устройство; «Наверх» после экрана прокрутки; ползунок один', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, met: { 'people-scarcity': Date.now() - 86400000 } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  const open = async () => {
    await openTab(page, 'profile');
    await page.getByTestId('prof-shelf').scrollIntoViewIfNeeded();
    await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
    await expect(page.getByTestId('book-reader')).toBeVisible();
  };
  const pageScroll = () => page.evaluate(() => [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY]);
  const before = await pageScroll();
  await open();
  const book = page.getByTestId('book-reader');
  // ползунок один — у книги: страница под читалкой не прокручивается (пункт владельца 08.11)
  expect(await pageScroll()).toEqual(['hidden', 'hidden']);
  const size = () => book.locator('[data-testid=book-passage] p').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await expect(book).toHaveAttribute('data-font', '1');
  expect(await size()).toBe(18);
  await book.getByTestId('book-font-up').click();
  await book.getByTestId('book-font-up').click();
  await book.getByTestId('book-font-up').click();
  await expect(book).toHaveAttribute('data-font', '4');
  expect(await size()).toBeCloseTo(25.2, 1);
  await expect(book.getByTestId('book-font-up')).toBeDisabled();
  await book.getByTestId('book-font-down').click();
  await expect(book).toHaveAttribute('data-font', '3');
  // помнит устройство — и в другой книге тот же размер
  await page.getByTestId('book-close').click();
  expect(await pageScroll()).toEqual(before);
  await page.reload({ waitUntil: 'networkidle' });
  await open();
  await expect(book).toHaveAttribute('data-font', '3');
  expect(await size()).toBeCloseTo(22.5, 1);
  // «Наверх»: у обложки кнопки нет; прокрутили больше экрана — есть; касание — к обложке (пункт владельца 08.11)
  await expect(book.getByTestId('book-top')).toHaveCount(0);
  await book.evaluate((el) => { el.scrollTop = el.clientHeight * 2; });
  await expect(book.getByTestId('book-top')).toBeVisible();
  await book.getByTestId('book-top').click();
  await expect.poll(() => book.evaluate((el) => el.scrollTop)).toBeLessThan(5);
  await expect(book.getByTestId('book-top')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// мини-проигрыватель — как только большая кнопка ушла под шапку читалки, а не когда ушёл весь проигрыватель (пункт 08.11)
test('читалка книги: большая кнопка ушла под шапку — сразу мини-проигрыватель', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ems-book-audio-test', '1');
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, met: { 'people-scarcity': Date.now() - 86400000 } } }));
    window.Audio = class {
      constructor() { this.src = ''; this.currentTime = 0; this.duration = 0; this.playbackRate = 1; this.paused = true; }
      pause() { this.paused = true; }
      play() { this.duration = 600; this.paused = false; return Promise.resolve(); }
    };
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  await page.getByTestId('prof-shelf').scrollIntoViewIfNeeded();
  await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  const book = page.getByTestId('book-reader');
  await book.getByTestId('book-play').click();
  await expect(book.getByTestId('book-mini')).toHaveCount(0);
  // кнопка целиком под шапкой ещё не ушла, но уже наполовину закрыта ею — мини-проигрыватель есть
  const top = await book.locator('.lb-top').boundingBox();
  const btn = await book.getByTestId('book-play').boundingBox();
  await book.evaluate((el, dy) => { el.scrollTop += dy; }, Math.round(btn.y - (top.y + top.height) + btn.height / 2));
  await expect(book.getByTestId('book-mini')).toBeVisible();
  // вернулись к кнопке — мини-проигрыватель ушёл
  await book.evaluate((el) => { el.scrollTop = 0; });
  await expect(book.getByTestId('book-mini')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// «Ошибка?» в читалке книги (пункт владельца 08.11): уходят книга и отрывок на экране
test('читалка книги: «Ошибка?» в шапке — жалоба с книгой и отрывком на экране', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, met: { 'people-scarcity': Date.now() - 86400000 } } }));
  });
  const sent = [];
  const api = (req) => {
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    if (req.url().includes('/api/reports') && body && body.action === 'send') { sent.push(body); return JSON.stringify({ ok: true, id: 'x' }); }
    return '{}';
  };
  const { errors } = await openApp(page, '/', api, { tab: 'profile' });
  await page.getByTestId('prof-shelf').scrollIntoViewIfNeeded();
  await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  const book = page.getByTestId('book-reader');
  // прокрутили к «Воде и алмазу» — жалоба про него
  await book.locator('[data-passage="water"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await book.getByTestId('report-flag').click();
  const sheet = page.getByTestId('report-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-reason]')).toHaveCount(4);
  await sheet.locator('[data-reason="typo"]').click();
  await sheet.getByTestId('report-send').click();
  await expect(page.getByTestId('report-thanks')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ reason: 'typo' });
  expect(sent[0].context).toMatchObject({ screen: 'book', kind: 'book', lesson: 'smith-wealth' });
  expect(sent[0].context.step).toContain('Вода и алмаз');
  expect(sent[0].context.quote.length).toBeGreaterThan(40);
  expect(errors).toEqual([]);
});

test('книга по отрывкам: у каждого отрывка свой файл — играют друг за другом, «слушать» у отрывка — его файл', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ems-textbook-v1')) {
      localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at: Date.now() - 86400000, runs: 1, best: 90 }, 'sc-i1b': { at: Date.now() - 86400000, runs: 1, best: 90 } }, met: { 'people-scarcity': Date.now() - 86400000 } } }));
    }
    // запись по отрывкам (флаг автотеста «2»); проигрыватель — подмена, длина каждой записи — 100 с
    localStorage.setItem('ems-book-audio-test', '2');
    window.__tapes = [];
    window.Audio = class {
      constructor() { this.src = ''; this.currentTime = 0; this.duration = 0; this.playbackRate = 1; this.paused = true; window.__tape = this; }
      pause() { this.paused = true; }
      play() { window.__tapes.push(new URL(this.src, location.href).pathname); this.duration = 100; this.paused = false; return Promise.resolve(); }
    };
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  await page.getByTestId('prof-shelf').scrollIntoViewIfNeeded();
  await page.locator('[data-testid=shelf-book][data-book="smith-wealth"]').click();
  const book = page.getByTestId('book-reader');
  const listen = book.getByTestId('book-listen');
  await expect(listen).toHaveAttribute('data-mode', 'parts');
  await expect(listen.getByTestId('book-voice-caption')).toHaveText('голос синтезирован');
  await listen.getByTestId('book-play').click();
  expect(await page.evaluate(() => window.__tapes)).toEqual(['/books/smith-wealth/pins.mp3']);
  // отрывок дослушан — три секунды тишины (отрывки не сливаются), потом следующий, отмечен звучащим
  await page.evaluate(() => window.__tape.onended());
  expect(await page.evaluate(() => window.__tapes.at(-1))).toBe('/books/smith-wealth/pins.mp3');
  await expect.poll(() => page.evaluate(() => window.__tapes.at(-1)), { timeout: 6000 }).toBe('/books/smith-wealth/butcher.mp3');
  await expect(book.locator('[data-testid=book-passage][data-now="true"]')).toHaveAttribute('data-passage', 'butcher');
  // «слушать» у отрывка — сразу его файл
  await book.locator('[data-testid=book-passage][data-passage="taxes"]').getByTestId('book-passage-play').click();
  expect(await page.evaluate(() => window.__tapes.at(-1))).toBe('/books/smith-wealth/taxes.mp3');
  await expect(listen.getByTestId('book-now')).toHaveText('Четыре правила налогов');
  expect(errors).toEqual([]);
});

test('особые уроки не пропустить: после урока с «Разбором графика» следующий урок ждёт его', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ems-extra-test', '1');
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="graph-ppf"]');
  await expect(stop).toHaveAttribute('data-state', 'open');
  await expect(pathNode(page, 'sc-l3')).toHaveAttribute('data-state', 'locked');
  // разбор пройден — урок ещё ждёт «Нарисуй сам» сразу за ним (в каждом юните все четыре особых урока)
  const passExtra = (key, id) => page.evaluate(([k, x]) => {
    const p = JSON.parse(localStorage.getItem('ems-textbook-v1'));
    p.learn[k] = { ...(p.learn[k] || {}), [x]: Date.now() - 60000 };
    localStorage.setItem('ems-textbook-v1', JSON.stringify(p));
  }, [key, id]);
  await passExtra('graphs', 'graph-ppf');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid=path-extra][data-id="draw-ppf"]')).toHaveAttribute('data-state', 'open');
  await expect(pathNode(page, 'sc-l3')).toHaveAttribute('data-state', 'locked');
  // и рисунок пройден — следующий урок открылся
  await passExtra('draws', 'draw-ppf');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(pathNode(page, 'sc-l3')).not.toHaveAttribute('data-state', 'locked');
  expect(errors).toEqual([]);
});

test('«Разбор графика» — остановка на дороге юнита: график собирается по шагам, вопрос, +10 опыта; кнопка на карточке урока', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="graph-ppf"]');
  await expect(stop).toHaveAttribute('data-state', 'open');
  await stop.scrollIntoViewIfNeeded();
  await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('graph-lesson');
  await expect(g).toHaveAttribute('data-id', 'graph-ppf');
  // первый шаг — оси в фокусе; дальше на каждом шаге новое — подсвечено
  await expect(g.locator('[data-testid=graph-el][data-el="axes"]')).toHaveAttribute('data-on', 'true');
  await expect(g.getByTestId('graph-back')).toBeDisabled();
  // пожаловаться на разбор — кнопкой «Ошибка?» в шапке; причины — про объяснение и график, а не про ответ
  await expect(g.getByTestId('report-flag')).toContainText('Ошибка?');
  await g.getByTestId('report-flag').click();
  await expect(page.getByTestId('report-sheet')).toContainText('Ошибка в формуле или на графике');
  await expect(page.getByTestId('report-sheet')).not.toContainText('Мой ответ должен быть засчитан');
  await page.getByTestId('report-sheet-back').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('report-sheet')).toHaveCount(0);
  await g.getByTestId('graph-next').click();
  await expect(g.locator('[data-testid=graph-el][data-el="PPF"]')).toHaveAttribute('data-on', 'true');
  await expect(g.getByTestId('graph-text')).toContainText('КПВ');
  await expect(g.getByTestId('graph-mark')).toHaveCount(2);
  await g.getByTestId('graph-next').click();
  await expect(g.locator('[data-testid=graph-el][data-el="pt:A"]')).toHaveAttribute('data-on', 'true');
  await expect(g.locator('[data-testid=graph-el][data-el="PPF"]')).toHaveAttribute('data-on', 'false');
  // назад — на шаг раньше
  await g.getByTestId('graph-back').click();
  await expect(g.getByTestId('graph-text')).toContainText('Шаг 2 из 8');
  for (let k = 2; k < 8; k += 1) await g.getByTestId('graph-next').click();
  await expect(g.getByTestId('graph-next')).toHaveText(/К вопросу/);
  await g.getByTestId('graph-next').click();
  // вопрос: сначала ошибка — объяснение, потом верно
  await expect(g).toHaveAttribute('data-phase', 'quiz');
  await expect(g.getByTestId('graph-next')).toBeDisabled();
  await g.locator('[data-testid=graph-opt][data-ok="false"]').first().click();
  await expect(g.getByTestId('graph-feedback')).toHaveAttribute('data-ok', 'false');
  await g.locator('[data-testid=graph-opt][data-ok="true"]').click();
  await expect(g.getByTestId('graph-feedback')).toHaveAttribute('data-ok', 'true');
  await g.getByTestId('graph-next').click();
  // итоги — как после урока: с ошибкой в вопросе — 10 монет без надбавки «без ошибок»
  const gres = g.getByTestId('graph-done').getByTestId('extra-result');
  await expect(gres.getByTestId('result-xp')).toContainText('+10');
  await expect(gres.getByTestId('result-text')).toContainText('Ответ — не с первой попытки');
  await expect(gres.getByTestId('result-acc')).toContainText('60%');
  expect(Number(await gres.getAttribute('data-coins'))).toBeGreaterThanOrEqual(10);
  await g.getByTestId('graph-finish').click();
  await expect(stop).toHaveAttribute('data-state', 'done');
  // карточка урока с этим графиком — «Разобрать график по шагам»: разбор поверх урока, без опыта
  await page.locator('[data-testid=path-lesson][data-lesson="sc-i2"]').click();
  await page.getByTestId('lesson-start').click();
  const btn = page.getByTestId('lesson').getByTestId('graph-open');
  await expect(btn).toHaveAttribute('data-graph', 'graph-ppf');
  await btn.click();
  await expect(page.getByTestId('graph-lesson')).toBeVisible();
  await page.getByTestId('graph-close').click();
  await expect(page.getByTestId('graph-lesson')).toHaveCount(0);
  await expect(page.getByTestId('lesson')).toBeVisible();
  expect(errors).toEqual([]);
});

test('«Разбор графика» на ПК: черновик на полях — рисует по бокам, а не по графику; запись переживает шаг; Ctrl+Z — штрих разбора', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне полей нет — и черновика нет');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
    localStorage.setItem('ems-sketch-on', '1');
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="graph-ppf"]');
  await stop.scrollIntoViewIfNeeded();
  await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('graph-lesson');
  await expect(g).toBeVisible();
  const canvas = g.getByTestId('sketch-canvas');
  await expect(g.getByTestId('sketch-dock')).toHaveAttribute('data-on', 'true');
  await expect(g).toHaveAttribute('data-sketch', 'pen');
  const draw = async (pts) => {
    await page.mouse.move(...pts[0]); await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 8 });
    await page.mouse.up();
  };
  // левое поле — линия; по самому графику — нет
  await draw([[80, 300], [240, 300]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  const stage = await g.locator('.gl-stage').boundingBox();
  await draw([[stage.x + 60, stage.y + 80], [stage.x + 200, stage.y + 80]]);
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  // следующий шаг — запись на месте
  await g.getByTestId('graph-next').click();
  await expect(g.getByTestId('graph-text')).toContainText('Шаг 2 из');
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  await draw([[1300, 400], [1400, 420]]);
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  await page.keyboard.press('Control+z');
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  await g.getByTestId('graph-close').click();
  await expect(g).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('«Персоналии»: портреты подгружаются заранее — когда остановка открылась на Пути, ещё до входа в урок', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  const asked = new Set();
  page.on('request', (r) => { const m = new URL(r.url()).pathname.match(/^\/people\/([a-z-]+)\.jpg$/); if (m) asked.add(m[1]); });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.locator('[data-testid=path-extra][data-id="people-scarcity"]')).toHaveAttribute('data-state', 'open');
  // урок ещё не открыт, а фото Роббинса, Мальтуса и Рикардо уже запрошены
  await expect.poll(() => ['robbins', 'malthus', 'ricardo'].filter((id) => asked.has(id)).length, { timeout: 8000 }).toBe(3);
  await expect(page.getByTestId('people')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('«Персоналии на ПК»: страница в две колонки целиком на экране, разбор ответа — на виду, без прокрутки', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне — одна колонка');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="people-scarcity"]');
  await stop.scrollIntoViewIfNeeded();
  await stop.click();
  await page.getByTestId('extra-start').click();
  const view = page.getByTestId('people');
  for (const id of ['robbins', 'malthus', 'ricardo']) {
    const pg = view.getByTestId('people-page');
    await expect(pg).toHaveAttribute('data-person', id);
    // вся страница — без прокрутки: высота слоя не больше окна
    const fit = await view.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(fit, `${id}: страница выше окна на ${fit} px`).toBeLessThanOrEqual(2);
    // вопрос справа от портрета, а не под рассказом
    const story = await pg.locator('.pp-story').boundingBox();
    const ask = await pg.locator('.pp-ask').boundingBox();
    expect(ask.x).toBeGreaterThan(story.x + story.width);
    await pg.locator('[data-testid=people-opt][data-ok="false"]').first().click();
    const fb = await page.getByTestId('people-feedback').boundingBox();
    const foot = await page.getByTestId('people-foot').boundingBox();
    expect(fb.y + fb.height).toBeLessThanOrEqual(foot.y);
    await pg.locator('[data-testid=people-opt][data-ok="true"]').click();
    await page.getByTestId('people-next').click();
  }
  await expect(page.getByTestId('people-done')).toBeVisible();
  expect(errors).toEqual([]);
});

test('«Персоналии»: портрет — свой файл из public/people с подписью из people/credits.csv; нет файла — медальон; Википедию не спрашиваем', async ({ page }) => {
  // что лежит в public/people и что написано в people/credits.csv — тем же разбором, что и при сборке
  const files = listPeoplePhotos();
  const credits = readPhotoCredits();
  // знакомый, вернувшийся в другом юните, в галерее один
  const everyone = [...new Map(PEOPLE.flatMap((g) => g.people).map((p) => [p.id, p])).values()];
  const noFile = everyone.find((p) => !files[p.id]);
  // знакомы все группы, кроме «Людей выбора»: их проходим сейчас — потом вся галерея в профиле
  await page.addInitScript((met) => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    // прежний кеш ответов Википедии и прежний флаг теста «сходи в Википедию» — больше ни на что не влияют
    localStorage.setItem('ems-portraits-test', '1');
    localStorage.setItem('ems-portraits-v1', JSON.stringify({ king: { file: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/King.jpg', author: 'x', license: 'CC0', at: Date.now() } }));
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } }, met } }));
  }, Object.fromEntries(PEOPLE.filter((g) => g.id !== 'people-scarcity').map((g) => [g.id, Date.now() - 86400000])));
  const wiki = [];
  page.on('request', (r) => { if (/wikipedia\.org|wikimedia\.org/.test(r.url())) wiki.push(r.url()); });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.locator('[data-testid=path-extra][data-id="people-scarcity"]').click();
  await page.getByTestId('extra-start').click();
  const pg = page.getByTestId('people');
  for (const p of PEOPLE.find((g) => g.id === 'people-scarcity').people) {
    await expect(pg.getByTestId('people-page')).toHaveAttribute('data-person', p.id);
    const pic = pg.getByTestId('people-portrait');
    if (files[p.id]) {
      // фото — со своего адреса; подпись — автор, лицензия и ссылка из credits.csv
      await expect(pic).toHaveAttribute('data-photo', 'true');
      await expect(pic.locator('img')).toHaveAttribute('src', `/people/${files[p.id]}`);
      const c = credits[p.id];
      if (c) {
        const credit = pg.getByTestId('people-credit');
        if (c.author) await expect(credit).toContainText(c.author);
        if (c.license) await expect(credit).toContainText(c.license);
        if (c.source) await expect(credit.locator('a')).toHaveAttribute('href', c.source);
      } else await expect(pg.getByTestId('people-credit')).toHaveCount(0);
    } else {
      await expect(pic).toHaveAttribute('data-photo', 'false');
      await expect(pg.getByTestId('people-credit')).toHaveCount(0);
    }
    await pg.locator('[data-testid=people-opt][data-ok="true"]').click();
    await page.getByTestId('people-next').click();
  }
  await page.getByTestId('people-finish').click();
  // пункт владельца 18.11: ответы особого урока — в серию «верных ответов подряд» (задание дня)
  const people = PEOPLE.find((g) => g.id === 'people-scarcity').people.length;
  expect(await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('ems-textbook-v1')).learn; const d = l.daily[new Date().toISOString().slice(0, 10)]; return d && d.r; })).toBeGreaterThanOrEqual(people);
  // галерея профиля: у кого есть файл — фото, у кого нет — медальон с инициалами
  await openTab(page, 'profile');
  // вся галерея — в альбоме («Все»): людей много, в профиле — четыре марки (пункт владельца 16.11, вечер)
  await page.getByTestId('gallery-all').click();
  const gallery = page.getByTestId('people-album');
  await expect(gallery.locator('[data-testid=gallery-person][data-met="true"]')).toHaveCount(everyone.length);
  await expect(gallery.locator('[data-testid=people-portrait][data-photo="true"]')).toHaveCount(everyone.filter((p) => files[p.id]).length);
  if (noFile) {
    const card = gallery.locator(`[data-testid=gallery-person][data-person="${noFile.id}"]`);
    await expect(card.getByTestId('people-portrait')).toHaveAttribute('data-photo', 'false');
    await expect(card.getByRole('img', { name: `${noFile.name} — медальон с инициалами` })).toHaveCount(1);
  }
  expect(wiki, 'портреты не берутся с Википедии').toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('ems-portraits-v1')), 'старый кеш Википедии стёрт').toBeNull();
  expect(errors).toEqual([]);
});

// «Нарисуй сам» на телефоне (пункт владельца 08.11, вечер): ровная сетка и «На весь экран»
// пункт владельца 15.11: «раскрытие на весь экран в „Нарисуй“ всё ещё отвратительное — полный редизайн и куча фич»
// пункт владельца 19.11: «почему всё ещё в „Нарисуй сам“ на весь экран нет числовой плоскости, как в разборе»
test('«Нарисуй сам» на весь экран — числовая плоскость разбора: точки касанием, список с удалением, «Отменить» и Ctrl+Z, масштаб и «Двигать», «Проверить», Esc сворачивает', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), graphs: { 'graph-ppf': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="draw-ppf"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  await g.getByTestId('draw-full').click();
  const pv = page.getByTestId('plane-view');
  await expect(pv).toBeVisible();
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-full', 'true');
  const side = pv.getByTestId('plane-side');
  await expect(side).toContainText('Шаг 1 из');
  await expect(side.getByTestId('draw-full-task')).toBeVisible();
  const st = pv.getByTestId('plane-stage');
  const ink = pv.getByTestId('draw-ink');
  // точки решения — в точках плоскости (от её левого верхнего угла)
  const at = async ([x, y]) => { const b = await st.boundingBox(); return [b.x + x, b.y + y]; };
  const ans = async () => JSON.parse(await ink.getAttribute('data-answer')).pts;
  let pts = await ans();
  expect(pts).toHaveLength(3);
  for (const q of pts.slice(0, 2)) { const [cx, cy] = await at(q); await page.mouse.click(cx, cy); await page.waitForTimeout(120); }
  await expect(side.getByTestId('draw-pt')).toHaveCount(2);
  // Ctrl+Z и «Отменить» — последняя точка уходит; касание точки в списке — убирает её
  await page.keyboard.press('Control+z');
  await expect(side.getByTestId('draw-pt')).toHaveCount(1);
  { const [cx, cy] = await at(pts[1]); await page.mouse.click(cx, cy); }
  await expect(side.getByTestId('draw-pt')).toHaveCount(2);
  await side.getByTestId('draw-undo').click();
  await expect(side.getByTestId('draw-pt')).toHaveCount(1);
  await side.getByTestId('draw-pt').first().click();
  await expect(side.getByTestId('draw-pts')).toHaveCount(0);
  // мышью: курсор плоскости показывает значения
  if (!isMobile) { const b = await st.boundingBox(); await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.45); await expect(pv.getByTestId('plane-read')).toBeVisible(); }
  // масштаб — кнопками плоскости; «Двигать» — тянем плоскость, точки не ставятся
  await pv.getByTestId('plane-in').click();
  await expect(pv.getByTestId('plane-level')).toHaveText('×1,6');
  await side.getByTestId('draw-hand').click();
  await expect(side.getByTestId('draw-hand')).toHaveAttribute('aria-pressed', 'true');
  const x0 = Number(await st.getAttribute('data-x0'));
  { const b = await st.boundingBox(); const mx = b.x + b.width / 2; const my = b.y + b.height / 2;
    await page.mouse.move(mx, my); await page.mouse.down(); await page.mouse.move(mx + 30, my, { steps: 3 }); await page.mouse.move(mx + 60, my, { steps: 3 }); await page.mouse.up(); }
  await expect.poll(async () => Number(await st.getAttribute('data-x0'))).toBeLessThan(x0);
  await expect(side.getByTestId('draw-pts')).toHaveCount(0);
  await side.getByTestId('draw-hand').click();
  // целиком — и решить: три точки и «Проверить»
  await pv.getByTestId('plane-fit').click(); await page.waitForTimeout(500);
  pts = await ans();
  // плоскость не переезжает, пока ставят точки: размер поля тот же после каждой
  const size0 = await st.boundingBox();
  for (const [j, q] of pts.entries()) {
    await expect(ink).toHaveAttribute('data-ready', 'false');
    const [cx, cy] = await at(q); await page.mouse.click(cx, cy); await page.waitForTimeout(120);
    expect(Math.abs((await st.boundingBox()).height - size0.height)).toBeLessThan(1);
    if (j < pts.length - 1) await expect(side.getByTestId('draw-full-check')).toBeDisabled();
  }
  await expect(ink).toHaveAttribute('data-ready', 'true');
  await side.getByTestId('draw-full-check').click();
  await expect(side.getByTestId('draw-full-feedback')).toContainText('Верно.');
  await expect(side.getByTestId('draw-full-next')).toBeVisible();
  // Esc — сворачивает плоскость, урок открыт
  await page.keyboard.press('Escape');
  await expect(pv).toHaveCount(0);
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-full', 'false');
  await expect(g).toBeVisible();
  expect(errors).toEqual([]);
});

test('«Нарисуй сам»: подписи осей — на линиях сетки; «На весь экран» — график во весь экран с кнопками', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), graphs: { 'graph-ppf': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="draw-ppf"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  await expect(g.getByTestId('draw-ink')).toBeVisible();
  // КПВ строят по таблице (жалоба ученика 08.11): три варианта, а не две крайние точки
  await expect(g.getByTestId('draw-task')).toHaveAttribute('data-do', 'points');
  await expect(g.getByTestId('draw-table').locator('tbody tr')).toHaveCount(3);
  // подписи оси X — через 40, на линиях сетки (через 20), а не через 50
  const xs = await g.locator('[data-testid=graph-stage] [data-el="axes"] text[text-anchor="middle"]').allTextContents();
  const nums = xs.filter((x) => /^\d+$/.test(x)).map(Number);
  // подпись у края может спрятаться под названием оси — остальные кратны 40, а не 50
  expect(nums.length).toBeGreaterThanOrEqual(4);
  nums.forEach((x) => expect(x % 40, String(x)).toBe(0));
  await g.getByTestId('draw-full').click();
  // на весь экран — плоскость во весь экран, крестик сворачивает
  const pv = page.getByTestId('plane-view');
  const vp = page.viewportSize();
  // плоскость открывается с лёгким приближением (0,2 с) — меряем, когда встала
  await expect.poll(async () => (await pv.boundingBox()).height).toBeGreaterThan(vp.height - 4);
  await expect.poll(async () => (await pv.boundingBox()).width).toBeGreaterThan(vp.width - 4);
  await pv.getByTestId('draw-full-exit').click();
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-full', 'false');
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «открытие графика на весь экран странно выглядит, а приближать всё так же нельзя»
test('«Нарисуй сам»: в уроке приближается кнопками и «Вписать»; на весь экран — плоскость, щипок приближает и точку не ставит; Esc сворачивает', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), graphs: { 'graph-ppf': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="draw-ppf"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  const ink = g.getByTestId('draw-ink');
  const level = g.getByTestId('draw-zoom-level');
  await expect(ink).toBeVisible();
  // и в уроке: «+» приближает, «Вписать» — снова весь график
  await expect(level).toHaveText('×1,0');
  await g.getByTestId('draw-zoom-in').click();
  await expect(level).toHaveText('×1,6');
  await expect(g.getByTestId('graph-stage')).not.toHaveAttribute('viewBox', '0 0 360 290');
  await g.getByTestId('draw-zoom-fit').click();
  await expect(level).toHaveText('×1,0');
  await expect(g.getByTestId('draw-zoom-fit')).toHaveCount(0);

  // на весь экран — числовая плоскость: щипок двумя пальцами приближает, точку первый палец не оставляет
  await g.getByTestId('draw-full').click();
  const pv = page.getByTestId('plane-view');
  const st = pv.getByTestId('plane-stage');
  await expect(pv.getByTestId('plane-level')).toHaveText('×1,0');
  await st.evaluate((el) => {
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    const ev = (type, id, px) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: px, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    ev('pointerdown', 11, x - 20); ev('pointerdown', 12, x + 20);
    for (let k = 1; k <= 5; k += 1) { ev('pointermove', 11, x - 20 - k * 12); ev('pointermove', 12, x + 20 + k * 12); }
    ev('pointerup', 11, x - 80); ev('pointerup', 12, x + 80);
  });
  await expect.poll(async () => Number((await pv.getByTestId('plane-level').textContent()).replace('×', '').replace(',', '.'))).toBeGreaterThan(2);
  await expect(pv.getByTestId('draw-pts')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-full', 'false');
  await expect(g).toBeVisible();
  expect(errors).toEqual([]);
});

// алмаз у всех особых уроков (пункт владельца 08.11, вечер: «все квадратные уроки тоже должны проходиться на алмаз»)
test('«Разбор графика» на алмаз: пропущенное слово в каждом шаге; с ошибкой — не взят, без ошибок — алмаз и монеты, ромб на дороге', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), graphs: { 'graph-ppf': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="graph-ppf"]');
  await expect(stop).toHaveAttribute('data-state', 'done');
  const pass = async (slip) => {
    await stop.scrollIntoViewIfNeeded(); await stop.click();
    const sheet = page.getByTestId('extra-sheet');
    await expect(sheet.getByTestId('extra-gem-what')).toContainText('пропущено главное слово');
    await sheet.getByTestId('extra-gem').click();
    const g = page.getByTestId('graph-lesson');
    await expect(g.getByTestId('graph-gem-tag')).toBeVisible();
    for (let k = 0; k < 12 && await g.getAttribute('data-phase') === 'tour'; k += 1) {
      const cz = g.getByTestId('graph-cloze');
      if (await cz.count()) {
        // пока пропуск не выбран — дальше нельзя; ошибка видна и снимает алмаз
        await expect(g.getByTestId('graph-next')).toBeDisabled();
        if (slip && k === 0) await cz.locator('[data-testid=graph-cloze-opt]:not([data-ok])').first().click();
        await cz.locator('[data-testid=graph-cloze-opt][data-ok]').click();
        await expect(cz).toHaveAttribute('data-done', 'true');
      }
      await g.getByTestId('graph-next').click();
    }
    await g.locator('[data-testid=graph-opt][data-ok="true"]').click();
    await g.getByTestId('graph-next').click();
    const res = g.getByTestId('extra-result');
    await expect(res).toHaveAttribute('data-diamond', 'true');
    return res;
  };
  let res = await pass(true);
  await expect(res).toHaveAttribute('data-won', 'false');
  await expect(res).toContainText('Алмаз не взят');
  await expect(res).toHaveAttribute('data-coins', '0');
  await page.getByTestId('graph-finish').click();
  await expect(stop).not.toHaveAttribute('data-diamond', 'true');
  res = await pass(false);
  await expect(res).toHaveAttribute('data-won', 'true');
  await expect(res.getByTestId('result-diamond')).toContainText('Алмазный уровень взят');
  await expect(res.getByTestId('result-xp')).toContainText('+10');
  expect(Number(await res.getAttribute('data-coins'))).toBeGreaterThanOrEqual(35);
  await page.getByTestId('graph-finish').click();
  await expect(stop).toHaveAttribute('data-diamond', 'true');
  // та же гранёная обводка, что у урока на алмазном уровне (пункт владельца 09.11)
  await expect(stop).toHaveClass(/\bdiamond\b/);
  const lessonGem = await page.evaluate(() => { const b = document.createElement('button'); b.className = 'ln-token diamond'; document.querySelector('[data-testid=path]').appendChild(b); const c = getComputedStyle(b); const out = [c.backgroundImage, c.borderTopColor]; b.remove(); return out; });
  expect(await stop.evaluate((el) => [getComputedStyle(el).backgroundImage, getComputedStyle(el).borderTopColor])).toEqual(lessonGem);
  expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.gems['graph-ppf'])).toBe(true);
  expect(errors).toEqual([]);
});

test('«Персоналии» на алмаз — «Чья это идея?»; «Нарисуй сам» на алмаз — одна попытка: ошибка — сразу «вот как надо»', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), met: { 'people-scarcity': at }, graphs: { 'graph-ppf': at }, draws: { 'draw-ppf': at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const pp = page.locator('[data-testid=path-extra][data-id="people-scarcity"]');
  await pp.scrollIntoViewIfNeeded(); await pp.click();
  await expect(page.getByTestId('extra-gem-what')).toContainText('Чья это идея?');
  await page.getByTestId('extra-gem').click();
  const view = page.getByTestId('people');
  await expect(view.getByTestId('people-gem-tag')).toBeVisible();
  for (let k = 0; k < 3; k += 1) {
    await view.locator('[data-testid=people-opt][data-ok="true"]').click();
    await view.getByTestId('people-next').click();
  }
  const who = view.getByTestId('people-who');
  // одна идея на экран, ответ — портрет (пункт владельца 15.11: прежний формат — стена кнопок с именами)
  await expect(who.getByTestId('people-who-item')).toHaveCount(1);
  await expect(who.getByTestId('people-who-opt')).toHaveCount(4);
  await expect(who.getByTestId('people-who-opt').first().locator('.pp-who-face')).toBeVisible();
  await expect(view.getByTestId('people-next')).toBeDisabled();
  for (let k = 0; k < 3; k += 1) {
    await expect(who.getByTestId('people-who-item')).toHaveAttribute('data-answered', 'false');
    await who.locator('[data-testid=people-who-opt][data-ok]').click();
    await expect(who.locator('.pp-who-dots i.ok')).toHaveCount(k + 1);
  }
  await view.getByTestId('people-next').click();
  const res = view.getByTestId('extra-result');
  await expect(res).toHaveAttribute('data-won', 'true');
  expect(Number(await res.getAttribute('data-coins'))).toBeGreaterThanOrEqual(35);
  await view.getByTestId('people-finish').click();
  await expect(pp).toHaveAttribute('data-diamond', 'true');
  // «Нарисуй сам» на алмаз: точки не там — проверка сразу показывает, как надо, без второй попытки
  const dr = page.locator('[data-testid=path-extra][data-id="draw-ppf"]');
  await dr.scrollIntoViewIfNeeded(); await dr.click();
  await expect(page.getByTestId('extra-gem-what')).toContainText('одна попытка');
  await page.getByTestId('extra-gem').click();
  const g = page.getByTestId('draw-lesson');
  await expect(g.getByTestId('draw-gem-tag')).toBeVisible();
  // жалоба 21.11 (draw-moncomp, алмаз): рамка поля — тонкая линия, без кольца и свечения
  expect(await g.locator('.gl-stage').first().evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  // у алмаза — алмазная рамка поля; отдельной плашки правил нет, координаты под курсором есть (жалоба 19.11: «к чему это
  // пояснение про алмазный урок, а про то, что не пишутся координаты, — бред»)
  await expect(g.getByTestId('draw-gem-rules')).toHaveCount(0);
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-gem', 'true');
  // алмаз виден по цвету рамки поля (тонкая линия), а не по кольцу со свечением
  expect(await g.locator('.gl-stage').first().evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(await page.evaluate(() => getComputedStyle(document.querySelector('.gl-stage')).getPropertyValue('--ds-rule2')));
  const ink = g.getByTestId('draw-ink');
  // шапка теперь как у урока (с подписью вида урока) — график ниже: прокручиваем его в середину экрана
  await ink.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  if (!isMobile) {
    const b = await ink.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await expect(ink.locator('.dl-coord')).toHaveCount(1);
  }
  for (const [x, y] of JSON.parse(await ink.getAttribute('data-answer')).pts) {
    const [cx, cy] = await ink.evaluate((svg, [vx, vy]) => { const q = new DOMPoint(vx, vy).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x + 40, Math.max(30, y - 40)]);
    await page.mouse.click(cx, cy);
  }
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toContainText('Вот как надо');
  await expect(g.getByTestId('draw-solution').first()).toBeVisible();
  await expect(g.getByTestId('draw-next')).toBeVisible();
  await g.getByTestId('draw-close').click();
  expect(errors).toEqual([]);
});

/* жалоба ученика 14.11 («Нарисуй сам: монополия», шаг 1 из 5: «Тут нет этого»): в условии «на графике уже есть MC = 20», а
   линии не было — горизонтальную линию прятала маска анимации с рамкой нулевой высоты. Проверяем пиксели снимка. */
test('«Нарисуй сам: монополия»: данная линия MC видна с первого шага (горизонтальные линии не пропадают)', async ({ page }) => {
  const ids = fs.readdirSync('src/textbook/chapters').flatMap((f) => [...fs.readFileSync(`src/textbook/chapters/${f}`, 'utf8').matchAll(/:::idea id=(\S+)/g)].map((m) => m[1]));
  await page.addInitScript((list) => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(list.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  }, ids);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'competition-monopoly');
  const stop = page.locator('[data-testid=path-extra][data-id="draw-monopoly"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-sheet').getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  const mc = g.locator('[data-testid=graph-el][data-el="MC"] path.c');
  await expect(mc).toHaveCount(1);
  await page.waitForTimeout(1500);
  // маска анимации — на всё поле, а не по рамке линии
  for (const m of await g.locator('mask').all()) expect(await m.getAttribute('maskUnits')).toBe('userSpaceOnUse');
  // точки на линии MC (в координатах экрана) — среди них есть рыжие пиксели самой линии
  const pts = await mc.evaluate((el) => { const L = el.getTotalLength(); const m = el.getScreenCTM(); return [0.3, 0.45, 0.6, 0.75].map((f) => { const q = el.getPointAtLength(L * f).matrixTransform(m); return [Math.round(q.x), Math.round(q.y)]; }); });
  const shot = (await page.screenshot()).toString('base64');
  const rust = await page.evaluate(async ([b64, list]) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return list.map(([x, y]) => { let hit = false; for (let dy = -2; dy <= 2; dy += 1) { const [r, gg, b] = ctx.getImageData(Math.round(x * k), Math.round((y + dy) * k), 1, 1).data; if (r > gg + 40 && r > b + 40) hit = true; } return hit; });
  }, [shot, pts]);
  expect(rust).toEqual([true, true, true, true]);
  expect(errors).toEqual([]);
});

test('«Нарисуй сам» — остановка за графиком юнита: точки по условию, ошибка — подсказка, вторая — «вот как надо», сдвиг ползунком, +15 опыта', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // «Биржа труда»: «Нарисуй сам» — сразу за «Разбором графика», после урока, где график появился (правило «четыре особых урока»)
  const stop = page.locator('[data-testid=path-extra][data-extra="draw"][data-id="draw-labor"]');
  await stop.scrollIntoViewIfNeeded();
  await expect(stop).toHaveAttribute('data-state', 'open');
  await stop.click();
  await expect(page.getByTestId('extra-sheet')).toContainText('Постройте график сами');
  await expect(page.getByTestId('extra-sheet')).toContainText('15');
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  await expect(g).toHaveAttribute('data-id', 'draw-labor');
  const ink = g.getByTestId('draw-ink');
  const at = async (vx, vy) => { const b = await ink.boundingBox(); return [b.x + (vx / 360) * b.width, b.y + (vy / 290) * b.height]; };
  const tap = async (vx, vy) => { const [x, y] = await at(vx, vy); await page.mouse.click(x, y); };
  const answer = async () => JSON.parse(await ink.getAttribute('data-answer'));
  // шаг 1 — спрос на труд: «Проверить» ждёт двух точек
  await expect(g.getByTestId('draw-task')).toHaveAttribute('data-do', 'line');
  await expect(g.getByTestId('draw-check')).toBeDisabled();
  await tap(60, 30); await tap(140, 60);
  await expect(ink).toHaveAttribute('data-ready', 'true');
  // касание поставленной точки убирает её; поставили снова (пункт владельца 08.11, вечер)
  await tap(60, 30);
  await expect(ink).toHaveAttribute('data-ready', 'false');
  await tap(60, 30);
  await expect(ink).toHaveAttribute('data-ready', 'true');
  // ошибка — что не так и подсказка, можно ещё раз
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'false');
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-shown', 'false');
  await expect(g.getByTestId('draw-feedback')).toContainText('Попробуйте ещё раз');
  // вторая ошибка — график показывает, как надо, урок идёт дальше
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-shown', 'true');
  await expect(g.locator('[data-testid=graph-el][data-el="D"]')).toBeVisible();
  await g.getByTestId('draw-next').click();
  // шаг 2 — предложение труда: верно с первого раза
  for (const [x, y] of (await answer()).pts) await tap(x, y);
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  await expect(g.locator('[data-testid=graph-el][data-el="S"]')).toBeVisible();
  await g.getByTestId('draw-next').click();
  // шаг 3 — равновесие: точку ставят не туда и перетаскивают на место
  const [[ex, ey]] = (await answer()).pts;
  const [fx, fy] = await at(ex + 50, ey - 40); const [tx, ty] = await at(ex, ey);
  await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 6 }); await page.mouse.up();
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  await expect(g.locator('[data-testid=graph-el][data-el="pt:E"]')).toBeVisible();
  await g.getByTestId('draw-next').click();
  // шаг 4 — сдвиг предложения: прежнее равновесие спрятано (не подсказывает), прежняя линия — бледная
  await expect(g.getByTestId('draw-task')).toHaveAttribute('data-do', 'shift');
  await expect(g.locator('[data-testid=graph-el][data-el="pt:E"]')).toHaveCount(0);
  await g.getByTestId('draw-slider').fill(String((await answer()).v));
  await expect(g.getByTestId('draw-shift')).toHaveText('вправо на 60');
  await expect(g.locator('[data-testid=graph-el][data-el="S0"]')).toBeVisible();
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  await g.getByTestId('draw-next').click();
  // шаг 5 — новое равновесие
  for (const [x, y] of (await answer()).pts) await tap(x, y);
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toContainText('150 крон');
  await g.getByTestId('draw-next').click();
  // итоги — как после урока: опыт, «с первой попытки — 4 из 5», монеты; под итогами — построенный график
  const dres = g.getByTestId('draw-done').getByTestId('extra-result');
  await expect(dres.getByTestId('result-xp')).toContainText('+15');
  await expect(dres.getByTestId('result-text')).toContainText('С первой попытки — 4 из 5');
  await expect(dres.getByTestId('result-acc')).toContainText('80%');
  expect(Number(await dres.getAttribute('data-coins'))).toBeGreaterThanOrEqual(10);
  await expect(g.getByTestId('draw-done-graph')).toBeVisible();
  await g.getByTestId('draw-finish').click();
  await expect(stop).toHaveAttribute('data-state', 'done');
  expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('ems-textbook-v1')).learn.draws['draw-labor'])).toBe(true);
  expect(errors).toEqual([]);
});

test('новая сборка во время занятия: часть приложения не загрузилась — страница один раз перезагружается и открывается', async ({ page }) => {
  // жалоба ученика 16.11, вечер: «Failed to fetch dynamically imported module: …/assets/learn-Mk-1KRoX.js» — экран падал
  let blocked = 0; const reports = [];
  await page.route(/\/assets\/learn-[\w-]+\.js$/, (r) => { if (blocked === 0) { blocked += 1; return r.abort(); } return r.continue(); });
  page.on('request', (r) => { if (r.url().includes('/api/reports')) reports.push(r.postData()); });
  let loads = 0; page.on('load', () => { loads += 1; });
  await openApp(page, '/', '{}', { tab: 'path' });
  await expect(page.getByTestId('bottom-nav')).toBeVisible({ timeout: 15000 });
  expect(blocked).toBe(1);
  expect(loads).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Экран не открылся')).toHaveCount(0);
  expect(reports.filter((p) => p && p.includes('"crash"'))).toEqual([]);
});

// пункт владельца 16.11, вечер: «профиль: мышка на нижнем крае книги — дёргается»; «людей много — нужна настоящая галерея, как с марками»
test('профиль: книга под курсором у нижнего края не дёргается; галерея персоналий — альбом марок с листом на каждый юнит', async ({ page, isMobile }) => {
  await page.addInitScript((ids) => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 } }, read: { 'read-choice': at }, met: Object.fromEntries(ids.map((id) => [id, at])) } }));
  }, ['people-scarcity']);
  const { errors } = await openApp(page, '/', '{}', { tab: 'profile' });
  const shelf = page.getByTestId('prof-shelf');
  await shelf.scrollIntoViewIfNeeded();
  if (!isMobile) {
    const book = shelf.locator('[data-testid=shelf-book][data-book="smith-wealth"]');
    await expect(book).toHaveAttribute('data-open', 'true');
    const box = await book.boundingBox();
    // курсор — на 2 точки выше нижнего края: книга приподнимается и остаётся приподнятой, а не прыгает вверх-вниз
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2);
    await page.waitForTimeout(400);
    const lifts = [];
    for (let k = 0; k < 8; k += 1) {
      await page.mouse.move(box.x + box.width / 2 + (k % 2), box.y + box.height - 2);
      await page.waitForTimeout(60);
      lifts.push(await book.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42));
    }
    lifts.forEach((y) => expect(y).toBeLessThan(-6));
  }
  // в профиле — четыре марки и «ещё»: знакомые первыми
  const gallery = page.getByTestId('prof-gallery');
  await expect(gallery.getByTestId('gallery-person')).toHaveCount(4);
  await expect(gallery.getByTestId('gallery-person').first()).toHaveAttribute('data-met', 'true');
  await expect(gallery.getByTestId('gallery-more')).toBeVisible();
  // альбом: лист на каждый юнит, знакомые «Люди выбора» вклеены, остальные — пустые ячейки
  await gallery.getByTestId('gallery-more').click();
  const album = page.getByTestId('people-album');
  await expect(album).toBeVisible();
  const sheets = album.getByTestId('people-album-sheet');
  expect(await sheets.count()).toBeGreaterThanOrEqual(6);
  const first = album.locator('[data-testid=people-album-sheet][data-group="people-scarcity"]');
  const n = await first.getByTestId('gallery-person').count();
  await expect(first.getByTestId('people-album-sheet-count')).toHaveText(`${n} из ${n}`);
  await expect(first.locator('[data-testid=gallery-person][data-met="false"]')).toHaveCount(0);
  await expect(album.locator('[data-testid=people-album-sheet][data-group="people-household"] [data-testid=gallery-person][data-met="true"]')).toHaveCount(0);
  // марка — с перфорацией (вырезанные маской зубцы)
  const mask = await first.locator('.lb-ps-perf').first().evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
  expect(mask).toContain('radial-gradient');
  // встреченный — карточка с идеей; пустая ячейка — где он откроется
  await first.getByTestId('gallery-person').first().click();
  await expect(page.getByTestId('gallery-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('gallery-card')).toHaveCount(0);
  await album.locator('[data-testid=people-album-sheet][data-group="people-household"] [data-testid=gallery-person]').first().click();
  await expect(page.getByTestId('gallery-locked')).toContainText('Люди сбережений');
  await page.getByTestId('gallery-locked').getByRole('button', { name: 'Понятно' }).click();
  await page.getByTestId('people-album-back').click();
  await expect(album).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  expect(errors).toEqual([]);
});

// сбой 17.11 на /shop: «Cannot read properties of undefined (reading 'default')» — часть лавки не загрузилась после новой
// сборки, а отменённая ошибка Vite превращала её в пустой модуль. Теперь — одна перезагрузка, лавка открывается, сбоя нет
test('новая сборка: часть лавки не загрузилась при переходе — перезагрузка вместо сбоя, лавка открывается', async ({ page }) => {
  let blocked = 0; const reports = [];
  page.on('request', (r) => { if (r.url().includes('/api/reports')) reports.push(r.postData() || ''); });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.route(/\/assets\/learn-shop-[\w-]+\.js$/, (r) => { if (blocked === 0) { blocked += 1; return r.abort(); } return r.continue(); });
  await openTab(page, 'shop');
  await expect(page.getByTestId('shop-panel')).toBeVisible({ timeout: 20000 });
  expect(blocked).toBe(1);
  await expect(page.getByText('Экран не открылся')).toHaveCount(0);
  expect(reports.filter((p) => p.includes('"crash"'))).toEqual([]);
  expect(errors.filter((e) => /reading 'default'/.test(e))).toEqual([]);
});


// пункт владельца 18.11: «когда в разборе нужно закрасить область — нельзя стирать накрашенное, и когда красишь — почему-то точка, а не кисточка»
test('«Нарисуй сам»: закраска — кисть с кругом-курсором, ластик стирает, «Отменить» возвращает', async ({ page, isMobile }) => {
  test.skip(isMobile, 'курсор кисти — у мыши');
  test.setTimeout(120000);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'household');
  const stop = page.locator('[data-testid=path-extra][data-extra="draw"][data-id="draw-household"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  const ink = g.getByTestId('draw-ink');
  const at = async (vx, vy) => { const b = await ink.boundingBox(); return [b.x + (vx / 360) * b.width, b.y + (vy / 290) * b.height]; };
  const tap = async (vx, vy) => { const [x, y] = await at(vx, vy); await page.mouse.click(x, y); };
  const answer = async () => JSON.parse(await ink.getAttribute('data-answer'));
  for (let k = 0; k < 3; k += 1) {
    for (const [x, y] of (await answer()).pts) await tap(x, y);
    await g.getByTestId('draw-check').click();
    await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
    await g.getByTestId('draw-next').click();
  }
  await expect(g.getByTestId('draw-task')).toHaveAttribute('data-do', 'area');
  // курсор — круг кисти, а не маркер точки
  const pts = (await answer()).pts;
  const [hx, hy] = await at(pts[0][0], pts[0][1]);
  await page.mouse.move(hx, hy);
  await expect(g.getByTestId('draw-brush-cursor')).toHaveAttribute('data-tool', 'brush');
  expect(Number(await g.getByTestId('draw-brush-cursor').getAttribute('r'))).toBeGreaterThan(5);
  // закрасили всё мазком по точкам решения
  const [sx0, sy0] = await at(pts[0][0], pts[0][1]);
  await page.mouse.move(sx0, sy0); await page.mouse.down();
  for (const [x, y] of pts) { const [px, py] = await at(x, y); await page.mouse.move(px, py, { steps: 3 }); }
  await page.mouse.up();
  const cov = async () => Number(await g.getByTestId('draw-paint').getAttribute('data-coverage'));
  const full = await cov();
  expect(full).toBeGreaterThan(50);
  // ластик: стёр часть — закрашено меньше; курсор — пунктирный круг
  await g.getByTestId('draw-eraser').click();
  await expect(g.getByTestId('draw-eraser')).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(sx0, sy0); await page.mouse.down();
  for (const [x, y] of pts.slice(0, Math.ceil(pts.length / 2))) { const [px, py] = await at(x, y); await page.mouse.move(px, py, { steps: 3 }); }
  await page.mouse.up();
  await expect(g.getByTestId('draw-brush-cursor')).toHaveAttribute('data-tool', 'erase');
  expect(await cov()).toBeLessThan(full - 15);
  // «Отменить» — ластик отменён, снова как было
  await g.getByTestId('draw-undo').click();
  await expect.poll(cov).toBe(full);
  await g.getByTestId('draw-brush').click();
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  expect(errors).toEqual([]);
});

// жалоба ученика 17.11 («Горка выручки», шаг 1): «тут нет рисования» — линию можно провести: нажать в первой точке и протянуть до второй
test('«Нарисуй сам»: линию проводят — от первой точки протянули ко второй; после одной точки к курсору тянется резинка', async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2', 'hh-w', 'hh-s1', 'hh-radio', 'hh-g', 'hh-rev', 'hh-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum', 'el-i1', 'el-l1', 'el-i2', 'el-l2', 'el-w', 'el-s1', 'el-radio', 'el-g', 'el-rev', 'el-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), levels: { start: { at } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'elasticity');
  const stop = page.locator('[data-testid=path-extra][data-extra="draw"][data-id="draw-revenue"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  const ink = g.getByTestId('draw-ink');
  await expect(g.getByTestId('draw-task')).toContainText('Проведите линию');
  await ink.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const at = async (vx, vy) => ink.evaluate((svg, [x, y]) => { const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [vx, vy]);
  const [[ax, ay], [bx, by]] = JSON.parse(await ink.getAttribute('data-answer')).pts;
  const [x1, y1] = await at(ax, ay); const [x2, y2] = await at(bx, by);
  if (!isMobile) {
    // одна точка — и к курсору тянется резинка
    await page.mouse.click(x1, y1);
    await page.mouse.move(x2, y2, { steps: 4 });
    await expect(g.getByTestId('draw-rubber')).toBeVisible();
    await g.getByTestId('draw-reset').click();
  }
  // одним движением: нажали в первой точке, протянули, отпустили во второй
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 5 }); await page.mouse.move(x2, y2, { steps: 5 }); await page.mouse.up();
  await expect(ink).toHaveAttribute('data-ready', 'true');
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  expect(errors).toEqual([]);
});

// жалобы 18.11 (draw-inflation): «две точки — пунктиром прямая, а не кривая, ведь тут сложный процент»; «кнопки на весь экран
// не по стилю»; «страшное открытие на весь экран» — шапка с названием, шагом и крестиком, кнопки одной системы с плоскостью
test('«Нарисуй сам», сложный процент: пунктир через две точки — кривая; на весь экран — шапка с названием и крестиком', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000; const ids = ['sc-i1','sc-i1b','sc-i2','sc-l1','sc-l2','sc-l3','sc-l4','sc-l5','sc-l6','sc-w','sc-s1','sc-radio','sc-l-radio','sc-g','sc-rev','sc-sum','lm-i1','lm-i1b','lm-i2','lm-l1','lm-l2','lm-l3','lm-l4','lm-l5','lm-l6','lm-w','lm-s1','lm-radio','lm-l-radio','lm-g','lm-rev','lm-sum','hh-i1','hh-i1b','hh-i2','hh-l1','hh-l2','hh-l3','hh-l4','hh-l5','hh-l6','hh-w','hh-s1','hh-radio','hh-l-radio','hh-g','hh-rev','hh-sum','sd-i1','sd-i1b','sd-i2','sd-l1','sd-l2','sd-l3','sd-l4','sd-l5','sd-l6','sd-w','sd-s1','sd-radio','sd-l-radio','sd-g','sd-rev','sd-sum','el-i1','el-i1b','el-i2','el-l1','el-l2','el-l3','el-l4','el-l5','el-l6','el-w','el-s1','el-radio','el-l-radio','el-g','el-rev','el-sum','mf-i1','mf-i1b','mf-i2','mf-l1','mf-l2','mf-l3','mf-l4','mf-l5','mf-l6','mf-w','mf-s1','mf-radio','mf-l-radio','mf-g','mf-rev','mf-sum','mb-i1','mb-i1b','mb-i2','mb-l1','mb-l2','mb-l3','mb-l4','mb-l5','mb-l6','mb-w','mb-s1','mb-radio','mb-l-radio','mb-g','mb-rev','mb-sum','in-i1','in-i1b','in-i2','in-l1','in-l2','in-l3','in-l4','in-l5','in-l6','in-w','in-s1','in-radio','in-l-radio','in-g','in-rev','in-sum'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), levels: { start: { at } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'inflation');
  const stop = page.locator('[data-testid=path-extra][data-extra="draw"][data-id="draw-inflation"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  const ink = g.getByTestId('draw-ink');
  await ink.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const at = async (vx, vy) => ink.evaluate((svg, [x, y]) => { const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [vx, vy]);
  const [[ax, ay], [bx, by]] = JSON.parse(await ink.getAttribute('data-answer')).pts;
  const [x1, y1] = await at(ax, ay); const [x2, y2] = await at(bx, by);
  await page.mouse.click(x1, y1); await page.waitForTimeout(150); await page.mouse.click(x2, y2);
  const through = g.getByTestId('draw-through');
  await expect(through).toHaveAttribute('data-shape', 'curve');
  // пунктир не прямой: середина дуги ниже хорды (цены растут всё быстрее)
  const bend = await through.evaluate((p) => { const L = p.getTotalLength(); const a = p.getPointAtLength(0); const b = p.getPointAtLength(L); const m = p.getPointAtLength(L / 2); return m.y - (a.y + b.y) / 2; });
  expect(Math.abs(bend)).toBeGreaterThan(2);
  // кнопка «На весь экран» — в системе кнопок плоскости, масштаб — одной капсулой
  await expect(g.getByTestId('draw-full')).toHaveClass(/accent/);
  await expect(g.locator('.dl-seg')).toBeVisible();
  await g.getByTestId('draw-full').click();
  const pv = page.getByTestId('plane-view');
  await expect(pv).toHaveAttribute('aria-label', /Нарисуй сам · Цены и вклад/);
  await expect(pv.getByTestId('plane-side')).toContainText('Шаг 1 из 4');
  // точки, поставленные в уроке, — и на плоскости; пунктир через них — та же дуга
  await expect(pv.getByTestId('draw-pt')).toHaveCount(2);
  await expect(pv.getByTestId('draw-through')).toHaveAttribute('data-shape', 'curve');
  await pv.getByTestId('draw-full-exit').click();
  await expect(g.getByTestId('draw-box')).toHaveAttribute('data-full', 'false');
  expect(errors).toEqual([]);
});


/* пункт владельца 21.11, п. 2: «в особенных уроках другой дизайн: шапка меньше, Инфля вылазит за границы»; жалоба
   21.11 (people-household): «тут съехали эмодзи» — значок карточки «Главная идея» и «Знаете ли вы» лежал на тексте */
test('особый урок на ПК: шапка того же размера, что у урока; Инфля целиком в шапке; значки карточек не на тексте', async ({ page, isMobile }) => {
  test.skip(isMobile, 'увеличение шапки — на широком экране');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  await page.setViewportSize({ width: 1910, height: 950 });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await startLesson(page, 'sc-l2');
  const lessonHead = await page.getByTestId('lesson').locator('.ln-head').boundingBox();
  await page.getByTestId('lesson').getByRole('button', { name: 'Выйти из урока' }).click();
  const leave = page.getByRole('button', { name: /Выйти/ }).last();
  if (await leave.isVisible().catch(() => false)) await leave.click();
  await expect(page.getByTestId('lesson')).toHaveCount(0);
  const stop = page.locator('[data-testid=path-extra][data-id="people-scarcity"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click(); await page.getByTestId('extra-start').click();
  const view = page.getByTestId('people');
  const head = await view.getByTestId('special-head').locator('.ln-head').boundingBox();
  expect(Math.abs(head.width - lessonHead.width)).toBeLessThan(4);
  expect(Math.abs(head.height - lessonHead.height)).toBeLessThan(4);
  // Инфля серии — внутри шапки, не за её верхним краем
  const infla = await view.getByTestId('special-head').locator('.ln-head svg').last().boundingBox();
  expect(infla.y).toBeGreaterThanOrEqual(head.y - 1);
  // значок карточки — левее текста, а не на нём
  for (const sel of ['.pp-idea', '.pp-fact']) {
    const card = view.locator(sel).first();
    const pad = await card.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    const cb = await card.boundingBox(); const ib = await card.locator('svg').first().boundingBox();
    expect(ib.x + ib.width, sel).toBeLessThanOrEqual(cb.x + pad + 1);
  }
  expect(errors).toEqual([]);
});

// пункт владельца 21.11, п. 6: «нажимаю на урок — ничего не происходит; прошла минута — оказывается, грузилось, нет анимаций»
test('медленная сеть: особый урок сразу показывает заставку во весь экран, через 6 секунд — «сеть медленная»', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  // код урока грузится 8 секунд
  await page.route(/\/assets\/.*\.js$/, async (r) => { await new Promise((res) => setTimeout(res, 8000)); return r.continue(); });
  const stop = page.locator('[data-testid=path-extra][data-id="people-scarcity"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click(); await page.getByTestId('extra-start').click();
  const loading = page.getByTestId('lesson-loading');
  await expect(loading).toBeVisible({ timeout: 1000 });
  await expect(loading).toContainText('Открываем «Персоналии»');
  // заставка — на экране, а не под Путём
  const b = await loading.boundingBox();
  expect(b.y).toBeLessThanOrEqual(1);
  expect(b.height).toBeGreaterThanOrEqual(page.viewportSize().height - 2);
  await expect(page.getByTestId('lesson-loading-slow')).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('people')).toBeVisible({ timeout: 20000 });
  expect(errors).toEqual([]);
});

/* жалобы 21.11 (draw-budget, draw-moncomp, 1910×950): «два скролл-ползунка, кнопка снизу прифигачена, сверху отвратительная
   вуаль не по стилю»; «кнопки приближения не по стилю» */
test('«Нарисуй сам» на ПК: один ползунок (страница под уроком не прокручивается), шапка без вуали, значки «−/+» своего размера, строка точек не вылезает', async ({ page, isMobile }) => {
  test.skip(isMobile, 'ПК');
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), graphs: { 'graph-ppf': at } } }));
  });
  await page.setViewportSize({ width: 1910, height: 950 });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-id="draw-ppf"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click(); await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  await expect(g).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
  const bg = await page.getByTestId('special-head').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toBe('none');
  for (const id of ['draw-zoom-out', 'draw-zoom-in']) {
    const s = await g.getByTestId(id).locator('svg').boundingBox();
    expect(s.width, id).toBeLessThanOrEqual(17);
  }
  // во весь экран: строка точек задания переносится, а не уходит за край карточки
  await g.getByTestId('draw-full').click();
  const rows = page.locator('.dl-mini-rows').first();
  if (await rows.count()) expect(await rows.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByTestId('draw-close').click();
  await expect(g).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  expect(errors).toEqual([]);
});

// пункты владельца 22.11, пп. 4, 5, 7: в особых уроках можно вернуться на шаг; вышли посреди — на Пути «продолжить»; у шапки нет черты
test('особые уроки 22.11: «Назад» в «Нарисуй сам» открывает прошлый шаг с решением; вышли — на Пути «продолжить», в карточке — «Продолжить»', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-w', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  const stop = page.locator('[data-testid=path-extra][data-extra="draw"][data-id="draw-labor"]');
  await stop.scrollIntoViewIfNeeded(); await stop.click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('draw-lesson');
  // у шапки особого урока нет черты снизу — как у урока
  expect(await g.getByTestId('special-head').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  const ink = g.getByTestId('draw-ink');
  await ink.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  // шаг 1 — верно: точки из ответа
  for (const [x, y] of JSON.parse(await ink.getAttribute('data-answer')).pts) {
    const [cx, cy] = await ink.evaluate((svg, [vx, vy]) => { const q = new DOMPoint(vx, vy).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
    await page.mouse.click(cx, cy);
  }
  await g.getByTestId('draw-check').click();
  await expect(g.getByTestId('draw-feedback')).toHaveAttribute('data-ok', 'true');
  await g.getByTestId('draw-next').click();
  await expect(g).toHaveAttribute('data-task', '1');
  // «Назад» — прошлый шаг для просмотра: решение на графике, рисовать нельзя; «Вернуться» — к текущему
  await g.getByTestId('draw-back').click();
  await expect(g.getByTestId('draw-peek')).toContainText('Шаг 1 из');
  // на прошлом шаге поле не принимает точки, проверки нет
  await expect(ink).toHaveClass(/\boff\b/);
  await expect(g.getByTestId('draw-check')).toHaveCount(0);
  await g.getByTestId('draw-return').click();
  await expect(g.getByTestId('draw-peek')).toHaveCount(0);
  await expect(g.getByTestId('draw-check')).toBeVisible();
  // вышли посреди — на Пути у остановки «продолжить», в карточке — «Продолжить»
  await g.getByTestId('draw-close').click();
  await expect(page.locator('[data-testid=path-extra-title]').filter({ hasText: 'продолжить — нарисуй сам' })).toHaveCount(1);
  await stop.click();
  await expect(page.getByTestId('extra-start')).toHaveText('Продолжить');
  await expect(page.getByTestId('extra-resume-note')).toBeVisible();
  await page.getByTestId('extra-start').click();
  await expect(page.getByTestId('draw-lesson')).toHaveAttribute('data-task', '1');
  expect(errors).toEqual([]);
});
