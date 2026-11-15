/* БРАУЗЕРНЫЕ СЦЕНАРИИ — особые уроки: «Персоналии», «Чтение», «Разбор графика», «Нарисуй сам», книжная полка.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/extras.e2e.js */
import { test, expect } from '@playwright/test';
import { BOOK_BY_ID, bookSpeech, passageAt, passageStart } from '../src/learn/shelf.js';
import { PEOPLE } from '../src/learn/people.js';
import { listPeoplePhotos, readPhotoCredits } from '../scripts/voice-files-plugin.js';
import { openApp, openTab, pathNode, installHooks } from './helpers.js';

installHooks();

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
  await expect(page.getByTestId('reading-done')).toContainText('Книга на полке');
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
      await page.getByTestId('reading-next').click();
    }
    // «Кто это сказал?» — у каждой цитаты автор и год
    const who = reading.getByTestId('reading-who');
    await expect(who).toBeVisible();
    const items = who.getByTestId('reading-who-item');
    await expect(items).toHaveCount(3);
    await expect(page.getByTestId('reading-next')).toBeDisabled();
    for (let k = 0; k < 3; k += 1) {
      const it = items.nth(k);
      if (wrongWho && k === 0) await it.locator('[data-testid=reading-who-opt]:not([data-ok])').first().click();
      else await it.locator('[data-testid=reading-who-opt][data-ok]').click();
      await expect(it).toHaveAttribute('data-answered', 'true');
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
  await expect(page.getByTestId('gallery-count')).toHaveText('3 из 35');
  await expect(shelf.locator('[data-testid=gallery-person][data-met="true"]')).toHaveCount(3);
  await expect(page.getByTestId('shelf-count')).toHaveText('2 из 9');
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
    const foot = await page.locator('.pp-foot').boundingBox();
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
  // галерея профиля: у кого есть файл — фото, у кого нет — медальон с инициалами
  await openTab(page, 'profile');
  const gallery = page.getByTestId('prof-gallery');
  await gallery.scrollIntoViewIfNeeded();
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
  const small = (await g.getByTestId('draw-ink').boundingBox()).width;
  await g.getByTestId('draw-full').click();
  const box = g.getByTestId('draw-box');
  await expect(box).toHaveAttribute('data-full', 'true');
  const vp = page.viewportSize();
  const bb = await box.boundingBox();
  expect(bb.height).toBeGreaterThan(vp.height - 4);
  await expect(g.getByTestId('draw-full-task')).toContainText('Шаг 1 из');
  expect((await g.getByTestId('draw-ink').boundingBox()).width).toBeGreaterThanOrEqual(small - 1);
  // во весь экран — и решать: точки и «Проверить»
  const ink = g.getByTestId('draw-ink');
  const pts = JSON.parse(await ink.getAttribute('data-answer')).pts;
  expect(pts).toHaveLength(3);
  for (const [j, [x, y]] of pts.entries()) {
    await expect(ink).toHaveAttribute('data-ready', 'false');
    // во весь экран график вписан в поле с полями по краям — координаты переводим так же, как само приложение (getScreenCTM)
    const [cx, cy] = await ink.evaluate((svg, [vx, vy]) => { const q = new DOMPoint(vx, vy).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
    await page.mouse.click(cx, cy);
    if (j < pts.length - 1) await expect(g.getByTestId('draw-full-check')).toBeDisabled();
  }
  await expect(ink).toHaveAttribute('data-ready', 'true');
  await g.getByTestId('draw-full-check').click();
  await expect(g.getByTestId('draw-full-feedback')).toHaveText('Верно.');
  await g.getByTestId('draw-full-exit').click();
  await expect(box).toHaveAttribute('data-full', 'false');
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «открытие графика на весь экран странно выглядит, а приближать всё так же нельзя»
test('«Нарисуй сам»: во весь экран график — по своим пропорциям, не раздут; приближается кнопками и щипком, «Двигать» сдвигает, точки — того же размера; Esc сворачивает', async ({ page }) => {
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

  await g.getByTestId('draw-full').click();
  const box = g.getByTestId('draw-box');
  await expect(box).toHaveAttribute('data-full', 'true');
  // график — с пропорциями 360 × 290, посередине и не крупнее, чем вдвое; условие — обычного размера
  const wrap = await g.getByTestId('draw-wrap').boundingBox();
  const vp = page.viewportSize();
  expect(Math.abs(wrap.width / wrap.height - 360 / 290)).toBeLessThan(0.02);
  expect(wrap.width).toBeLessThanOrEqual(720 + 2);
  expect(Math.abs(wrap.x + wrap.width / 2 - vp.width / 2)).toBeLessThan(3);
  const fs = await g.getByTestId('draw-full-task').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fs).toBeGreaterThanOrEqual(13.5);
  if (vp.width >= 720) expect(fs).toBeGreaterThanOrEqual(16);

  const pts = JSON.parse(await ink.getAttribute('data-answer')).pts;
  const at = (x, y) => ink.evaluate((svg, [vx, vy]) => { const q = new DOMPoint(vx, vy).matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
  const placed = ink.locator('g[data-pin^="p"]');
  const pinBox = () => placed.first().locator('circle').boundingBox();
  // точка на ×1
  let [cx, cy] = await at(...pts[1]);
  await page.mouse.click(cx, cy);
  await expect(placed).toHaveCount(1);
  const b1 = await pinBox();
  // приблизили — точка на экране того же размера, график крупнее
  await g.getByTestId('draw-zoom-in').click();
  await expect(level).toHaveText('×1,6');
  await expect(box).toHaveAttribute('data-zoom', '1.60');
  const b2 = await pinBox();
  expect(Math.abs(b2.width - b1.width)).toBeLessThan(1.5);
  // «Двигать»: мышь сдвигает график, точки не ставятся
  await g.getByTestId('draw-hand').click();
  await expect(g.getByTestId('draw-hand')).toHaveAttribute('aria-pressed', 'true');
  const mid = await ink.boundingBox();
  const mx = mid.x + mid.width / 2; const my = mid.y + mid.height / 2;
  await page.mouse.move(mx, my);
  await page.mouse.down();
  await page.mouse.move(mx + 20, my, { steps: 2 });
  await page.mouse.move(mx + 40, my, { steps: 2 });
  await page.mouse.up();
  await expect(placed).toHaveCount(1);
  await expect.poll(async () => (await pinBox()).x).toBeGreaterThan(b2.x + 25);
  await g.getByTestId('draw-hand').click();
  await expect(g.getByTestId('draw-hand')).toHaveAttribute('aria-pressed', 'false');
  // щипок двумя пальцами: приближает к месту между ними, точку первый палец не оставляет
  await g.getByTestId('draw-zoom-fit').click();
  await expect(level).toHaveText('×1,0');
  await ink.evaluate((svg) => {
    const r = svg.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    const ev = (type, id, px) => svg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: px, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    ev('pointerdown', 11, x - 20); ev('pointerdown', 12, x + 20);
    for (let k = 1; k <= 5; k += 1) { ev('pointermove', 11, x - 20 - k * 12); ev('pointermove', 12, x + 20 + k * 12); }
    ev('pointerup', 11, x - 80); ev('pointerup', 12, x + 80);
  });
  await expect(level).toHaveText('×4,0');
  await expect(placed).toHaveCount(1);
  // целиком — и дорешать: оставшиеся точки и «Проверить»
  await g.getByTestId('draw-zoom-fit').click();
  for (const p of [pts[0], pts[2]]) { [cx, cy] = await at(...p); await page.mouse.click(cx, cy); }
  await expect(ink).toHaveAttribute('data-ready', 'true');
  await g.getByTestId('draw-full-check').click();
  await expect(g.getByTestId('draw-full-feedback')).toHaveText('Верно.');
  // Esc — сворачивает график, урок открыт
  await page.keyboard.press('Escape');
  await expect(box).toHaveAttribute('data-full', 'false');
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

test('«Персоналии» на алмаз — «Чья это идея?»; «Нарисуй сам» на алмаз — одна попытка: ошибка — сразу «вот как надо»', async ({ page }) => {
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
  await expect(who.getByTestId('people-who-item')).toHaveCount(3);
  await expect(view.getByTestId('people-next')).toBeDisabled();
  for (let k = 0; k < 3; k += 1) await who.getByTestId('people-who-item').nth(k).locator('[data-testid=people-who-opt][data-ok]').click();
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
  const ink = g.getByTestId('draw-ink');
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
