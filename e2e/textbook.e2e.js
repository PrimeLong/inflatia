/* БРАУЗЕРНЫЕ СЦЕНАРИИ — учебник: оглавление, главы, задачи, повторение, графики, музыка.
   Общие помощники — e2e/helpers.js. Запуск одного раздела: npx playwright test e2e/textbook.e2e.js */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import katex from 'katex';
import { parseChapter, collectBlocks } from '../src/textbook/markdown.js';
import { TRACKS } from '../src/audio/tracks.js';
import {
  openApp, openTab, openTasks, openBook, bookBack, toToc, expectNoSidewaysScroll, testWav, withTestFlag, showUnit, installHooks, pathNode, startLesson,
} from './helpers.js';

installHooks();

// пункт владельца 09.11: «давай тестово заменим 5 треков на нейро» — пьеса с файлом в public/music играет запись
test('музыка: у пьесы есть запись в public/music — играет файл, в панели «Саундтрек» пометка «запись»', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript((ids) => { window.__INFLATIA_MUSIC_FILES__ = ids; }, Object.keys(TRACKS));
  const asked = [];
  const wav = testWav(8);
  await page.route('**/music/*.mp3', (route) => { asked.push(new URL(route.request().url()).pathname); return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: wav }); });
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  const bar = page.getByTestId('tb-reader-bar');
  await bar.getByTestId('music-btn').click();
  const panel = page.getByTestId('music-panel');
  await expect(panel).toBeVisible();
  if ((await panel.getByTestId('music-toggle').textContent()) !== 'вкл') await panel.getByTestId('music-toggle').click();
  await expect(panel.getByTestId('music-toggle')).toHaveText('вкл');
  const now = panel.getByTestId('music-now');
  await expect(now).toHaveAttribute('data-file', 'true', { timeout: 15000 });
  await expect(now.getByTestId('music-file')).toHaveText('запись');
  // файл — по id пьесы, из public/music
  const id = await now.getAttribute('data-track');
  expect(asked).toContain(`/music/${id}.mp3`);
  // проигрыватель (пункт владельца 15.11): описаний пьес нет; следующая запись плейлиста загружена заранее; круглые кнопки
  await expect(now).not.toContainText('BPM');
  await expect(panel.locator('.mp-cover')).toBeVisible();
  for (const b of ['music-prev', 'music-play', 'music-next']) expect((await panel.getByTestId(b).boundingBox()).height).toBeGreaterThanOrEqual(40);
  // пауза и снова «Играть» — запись продолжается с того же места, а не с начала (пункт владельца 16.11, вечер)
  const pos = async () => Number(await page.evaluate(() => window.__inflatiaAudioPos && window.__inflatiaAudioPos()));
  await expect.poll(pos, { timeout: 10000 }).toBeGreaterThan(1);
  // пункт владельца 18.11 («дизайнерский, инновационный проигрыватель»): кольцо вокруг диска — спектр настоящего звука;
  // у записи — полоса времени «прошло / осталось» и «Далее»
  await expect(panel.getByTestId('music-viz')).toHaveAttribute('data-live', 'true', { timeout: 10000 });
  await expect.poll(async () => Number(await panel.getByTestId('music-progress').getAttribute('data-pos'))).toBeGreaterThan(0.5);
  await expect(panel.getByTestId('music-progress')).toContainText('−');
  await expect(panel.getByTestId('music-upnext')).toContainText('Далее');
  await panel.getByTestId('music-play').click();
  const stopped = await pos();
  await page.waitForTimeout(700);
  await panel.getByTestId('music-play').click();
  await page.waitForTimeout(300);
  expect(await pos()).toBeGreaterThan(stopped - 0.2);
  // «Волна» выбирает следующую пьесу заранее — её запись уже загружается
  const nextId = await now.getAttribute('data-next');
  expect(nextId).toBeTruthy();
  await expect.poll(() => asked.includes(`/music/${nextId}.mp3`), { timeout: 10000 }).toBe(true);
  // у «Волны» плейлиста нет; у настроения он есть — и у записей в нём значок «запись»
  await expect(panel.getByTestId('music-row')).toHaveCount(0);
  await panel.locator('[data-testid=music-mood][data-mood="calm"]').click();
  await expect(panel.locator('[data-testid=music-row] .mp-rec[title="запись"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

// панель музыки (пункты владельца 08.11): без «Заставок событий» и справки о числе пьес
// пункт владельца 16.11: «плашка музыки выглядит ужасно в тёмной теме» — название и подписи были тёмными на тёмной панели
test('музыка в тёмной теме: панель тёмная, название пьесы, подписи и кнопки читаются (контраст ≥ 4,5)', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('ems-learn-dark', '1'); } catch { /* нет хранилища */ } });
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  await page.getByTestId('tb-reader-bar').getByTestId('music-btn').click();
  const panel = page.getByTestId('music-panel');
  await expect(panel).toBeVisible();
  const report = await panel.evaluate((el) => {
    const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    // фон панели — сплошной цвет под градиентом блика
    const bg = rgb(getComputedStyle(el).backgroundColor);
    const pick = (sel) => [...el.querySelectorAll(sel)].map((n) => ({ sel, ratio: ratio(rgb(getComputedStyle(n).color), bg) }));
    const btnBg = [...el.querySelectorAll('.mp-b:not(.main), .mp-x')].map((n) => lum(rgb(getComputedStyle(n).backgroundColor)));
    return { panelLum: lum(bg), texts: [...pick('.mp-title'), ...pick('.mp-sw-row > span'), ...pick('.mp-mood'), ...pick('.mp-row.cur .mp-name')], btnBg };
  });
  expect(report.panelLum, 'панель тёмная').toBeLessThan(0.08);
  for (const t of report.texts) expect(t.ratio, t.sel).toBeGreaterThanOrEqual(4.5);
  // круглые кнопки «назад / вперёд» и «закрыть» — не белые пятна на тёмной панели
  for (const l of report.btnBg) expect(l).toBeLessThan(0.2);
  expect(errors).toEqual([]);
});

test('музыка: в панели нет «Заставок событий» и справки о числе пьес; в учебнике — «Волна»; размер текста одной рамкой', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  const bar = page.getByTestId('tb-reader-bar');
  await bar.getByTestId('music-btn').click();
  const panel = page.getByTestId('music-panel');
  await expect(panel).toBeVisible();
  // музыку включили — заставок всё равно нет
  await panel.getByTestId('music-toggle').click();
  await expect(panel.getByTestId('music-toggle')).toHaveText('вкл');
  await expect(panel).not.toContainText('Заставки событий');
  await expect(panel).not.toContainText(/пьес в \d+ настроениях/);
  // в учебнике экономики нет: вместо «По режиму экономики» — «Волна», она и играет
  const what = panel.getByTestId('music-what');
  await expect(what).toHaveAttribute('data-value', 'wave');
  await expect(what.locator('[data-mood="auto"]')).toHaveCount(0);
  await expect(what.locator('[data-mood="wave"]')).toContainText('Волна');
  await expect(what.locator('[data-mood="wave"]')).toHaveAttribute('aria-checked', 'true');
  // «Волна» — без плейлиста (пункт владельца 16.11): пьесы подбираются сами, спокойное начало, лайки
  await expect(panel.getByTestId('music-wave-hint')).toContainText('подбирает пьесы сама');
  await expect(panel.getByTestId('music-row')).toHaveCount(0);
  // лайк — пьесе, которая звучит; помнит устройство. Пьеса могла смениться сразу после включения — сверяем с тем, что сохранено
  const like = panel.getByTestId('music-like');
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await like.click();
  const liked = await page.evaluate(() => JSON.parse(localStorage.getItem('ems-music-likes')));
  expect(liked).toHaveLength(1);
  await expect.poll(async () => (await panel.getByTestId('music-now').getAttribute('data-track')) === liked[0]
    ? await like.getAttribute('aria-pressed') : 'true').toBe('true');
  // выбрали настроение — играет оно; «Волна» — снова первая строка
  await what.locator('[data-mood="calm"]').click();
  await expect(what).toHaveAttribute('data-value', 'calm');
  await what.locator('[data-mood="wave"]').click();
  await expect(what).toHaveAttribute('data-value', 'wave');
  // размер текста — одна рамка «A · 100% · A», кнопка музыки — той же высоты
  const font = bar.getByTestId('tb-font');
  await expect(font).toContainText('100%');
  const fh = (await font.boundingBox()).height; const mh = (await bar.getByTestId('music-btn').boundingBox()).height;
  expect(Math.abs(fh - mh)).toBeLessThan(2);
  // музыку включили в учебнике обучения — в настройках обучения она тоже включена (пункт владельца 08.11, вечер)
  expect(await page.evaluate(() => localStorage.getItem('ems-learn-music'))).toBe('1');
  await page.getByTestId('music-panel').getByRole('button', { name: 'Закрыть' }).click();
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await expect(page.getByTestId('prof-music')).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

// пункт владельца 16.11: «включил музыку в обучении, гуляешь по сайту, а мини-плашки нигде нет, как с аудиокнигой»
test('музыка в обучении: мини-плашка над вкладками на всех вкладках — пауза, следующая, лайк, «×» выключает; в уроке скрыта', async ({ page }) => {
  const { errors } = await openApp(page);
  await expect(page.getByTestId('music-dock')).toHaveCount(0);
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await page.getByTestId('prof-music').click();
  await expect(page.getByTestId('prof-music')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  const dock = page.getByTestId('music-dock');
  for (const tab of ['path', 'shop', 'profile']) {
    await openTab(page, tab);
    await expect(dock, tab).toBeVisible();
    // над нижней панелью, не на ней
    const d = await dock.boundingBox(); const nav = await page.getByTestId('bottom-nav').boundingBox();
    expect(d.y + d.height, tab).toBeLessThanOrEqual(nav.y + 1);
  }
  await expect(dock).toHaveAttribute('data-state', 'playing');
  await expect(dock.getByTestId('music-dock-title')).not.toHaveText('');
  // в обучении — «Волна»: начинается со спокойной пьесы
  await expect(dock).toContainText('«Волна»');
  // пауза — плашка остаётся, музыка выключена; снова «играть»
  await dock.getByTestId('music-dock-play').click();
  await expect(dock).toHaveAttribute('data-state', 'paused');
  expect(await page.evaluate(() => localStorage.getItem('ems-learn-music'))).toBe(null);
  await dock.getByTestId('music-dock-play').click();
  await expect(dock).toHaveAttribute('data-state', 'playing');
  // лайк: на ПК — в плашке; на узком телефоне плашка без него — он в развёрнутом проигрывателе
  if (await dock.getByTestId('music-dock-like').isVisible()) await dock.getByTestId('music-dock-like').click();
  else { await dock.getByTestId('music-dock-open').click(); await page.getByTestId('music-panel').getByTestId('music-like').click(); await page.getByTestId('music-panel').getByRole('button', { name: 'Закрыть' }).click(); }
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('ems-music-likes') || '[]')).length)).toBe(1);
  // пункт владельца 16.11, вечер: переключение видно — кнопка вздрагивает, название въезжает; есть «назад»
  const title0 = await dock.getByTestId('music-dock-title').textContent();
  await dock.getByTestId('music-dock-next').click();
  await expect(dock.getByTestId('music-dock-next')).toHaveAttribute('data-kick', 'true');
  await expect(dock.getByTestId('music-dock-title')).not.toHaveText(title0);
  await expect(dock.getByTestId('music-dock-title')).toHaveClass(/in-next/);
  await dock.getByTestId('music-dock-prev').click();
  await expect(dock.getByTestId('music-dock-prev')).toHaveAttribute('data-kick', 'true');
  await expect(dock.getByTestId('music-dock-title')).toHaveText(title0);
  // касание названия разворачивает полный проигрыватель над плашкой
  await dock.getByTestId('music-dock-title-btn').click();
  const full = page.getByTestId('music-panel');
  await expect(full).toBeVisible();
  await expect.poll(async () => { const f = await full.boundingBox(); return f.y + f.height - (await dock.boundingBox()).y; }).toBeLessThanOrEqual(2);
  /* замечание владельца 18.11, вечер: «исчезает проигрыватель, когда нажимаешь на нём паузу — считает как выключение музыки»;
     «пластинка крутится, когда не играет музыка» — пауза в большом проигрывателе: он и плашка на месте, диск стоит */
  await full.getByTestId('music-play').click();
  await expect(full).toBeVisible();
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute('data-state', 'paused');
  await expect(full.getByTestId('music-cover')).toHaveAttribute('data-spin', 'false');
  await full.getByTestId('music-play').click();
  await expect(dock).toHaveAttribute('data-state', 'playing');
  await full.getByRole('button', { name: 'Закрыть' }).click();
  // в уроке плашки нет, но в шапке урока — своя кнопка музыки (пункт владельца 16.11: «в уроке нигде нет переключения музыки»)
  await openTab(page, 'path');
  await pathNode(page, 'sc-i1').click();
  await page.getByTestId('lesson-start').click();
  await expect(page.getByTestId('lesson')).toBeVisible();
  await expect(dock).toHaveCount(0);
  await page.getByTestId('lesson').getByTestId('lesson-music').click();
  await expect(page.getByTestId('music-panel')).toBeVisible();
  await page.getByTestId('music-panel').getByRole('button', { name: 'Закрыть' }).click();
  await page.getByTestId('lesson').getByRole('button', { name: 'Выйти из урока' }).click();
  await expect(dock).toBeVisible();
  // «×» — музыка выключена и в настройках обучения, плашки нет
  await dock.getByTestId('music-dock-close').click();
  await expect(dock).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ems-learn-music'))).toBe(null);
  expect(errors).toEqual([]);
});

// пункты владельца 18.11: «первый раз открываешь „Сейчас играет“ — показывает плейлист», «выпадающий список выглядит отврат»,
// «стильнее, под стиль урока, и чтобы можно было двигать эту менюшку»
test('«Сейчас играет»: в обучении сразу «Волна» без плейлиста; «Что играть» — кнопки настроений; панель двигается и помнит место; в теме урока — её цвета', async ({ page, isMobile }) => {
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-i1b': { at, runs: 1, best: 90 } }, owned: { 'theme-exchange': at }, wear: { theme: 'theme-exchange', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  // первое открытие, музыка ещё не играла: «Волна» и никакого плейлиста
  await page.getByTestId('tb-reader-bar').getByTestId('music-btn').click();
  const panel = page.getByTestId('music-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('music-what')).toHaveAttribute('data-value', 'wave');
  await expect(panel.getByTestId('music-row')).toHaveCount(0);
  await expect(panel.locator('select')).toHaveCount(0);
  expect(await panel.getByTestId('music-mood').count()).toBeGreaterThanOrEqual(6);
  // выбрать настроение — кнопкой; у настроения есть плейлист
  await panel.locator('[data-testid=music-mood][data-mood="boom"]').click();
  await expect(panel.locator('[data-testid=music-mood][data-mood="boom"]')).toHaveAttribute('aria-checked', 'true');
  await expect(panel.getByTestId('music-row').first()).toBeVisible();
  await panel.locator('[data-testid=music-mood][data-mood="wave"]').click();
  await expect(panel.getByTestId('music-row')).toHaveCount(0);
  if (!isMobile) {
    // перетащить за шапку — панель едет за мышью и помнит место
    const head = panel.getByTestId('music-drag');
    const b0 = await panel.boundingBox(); const h = await head.boundingBox();
    await page.mouse.move(h.x + 20, h.y + h.height / 2); await page.mouse.down();
    await page.mouse.move(h.x - 180, h.y + 140, { steps: 8 }); await page.mouse.up();
    const b1 = await panel.boundingBox();
    expect(b1.x).toBeLessThan(b0.x - 150); expect(b1.y).toBeGreaterThan(b0.y + 110);
    await expect(panel).toHaveAttribute('data-moved', 'true');
    await panel.getByRole('button', { name: 'Закрыть' }).click();
    await page.getByTestId('tb-reader-bar').getByTestId('music-btn').click();
    await expect(panel).toHaveAttribute('data-moved', 'true');
    await expect.poll(async () => { const b2 = await panel.boundingBox(); return Math.abs(b2.x - b1.x) + Math.abs(b2.y - b1.y); }).toBeLessThan(3);
    // двойной щелчок по шапке — обратно к кнопке
    await panel.getByTestId('music-drag').dblclick({ position: { x: 30, y: 10 } });
    await expect(panel).toHaveAttribute('data-moved', 'false');
  }
  await panel.getByRole('button', { name: 'Закрыть' }).click();
  // в уроке с темой «Биржа» проигрыватель — тёмно-зелёный терминал
  await page.goto('/', { waitUntil: 'networkidle' });
  await startLesson(page, 'sc-l1');
  await page.getByTestId('lesson').getByTestId('lesson-music').click();
  await expect(panel).toBeVisible();
  const look = await panel.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontFamily }));
  expect(look.bg).toBe('rgb(6, 20, 13)');
  expect(look.font).toMatch(/Mono/i);
  expect(errors).toEqual([]);
});

// пункт владельца 18.11: «странно, что минипроигрыватель исчезает, если поставил на паузу и ушёл с сайта, ты же не выключал музыку»
test('музыка: пауза на плашке переживает уход с сайта — плашка возвращается «на паузе» с той же пьесой, «Играть» — с той же секунды', async ({ page }) => {
  await withTestFlag(page);
  await page.addInitScript((ids) => { window.__INFLATIA_MUSIC_FILES__ = ids; }, Object.keys(TRACKS));
  const wav = testWav(20);
  await page.route('**/music/*.mp3', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: wav }));
  const { errors } = await openApp(page);
  await openTab(page, 'profile');
  await page.getByTestId('prof-settings-open').click();
  await page.getByTestId('prof-music').click();
  await page.keyboard.press('Escape');
  const dock = page.getByTestId('music-dock');
  await expect(dock).toHaveAttribute('data-state', 'playing');
  const pos = async () => Number(await page.evaluate(() => window.__inflatiaAudioPos && window.__inflatiaAudioPos()));
  await expect.poll(pos, { timeout: 15000 }).toBeGreaterThan(2);
  await dock.getByTestId('music-dock-play').click();
  await expect(dock).toHaveAttribute('data-state', 'paused');
  const title = await dock.getByTestId('music-dock-title').textContent();
  const at = await pos();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ems-music-paused')).offset)).toBeGreaterThan(1.5);
  // ушли с сайта и вернулись
  await page.goto('about:blank');
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute('data-state', 'paused');
  await expect(dock.getByTestId('music-dock-title')).toHaveText(title);
  await dock.getByTestId('music-dock-play').click();
  await expect(dock).toHaveAttribute('data-state', 'playing');
  // запись загружается заново; как только зазвучала — она уже на той секунде, где остановились, а не с начала
  await expect.poll(pos, { timeout: 10000 }).toBeGreaterThan(0);
  expect(await pos()).toBeGreaterThan(at - 0.3);
  // «×» — музыка выключена совсем: после возвращения плашки нет
  await dock.getByTestId('music-dock-close').click();
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(dock).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('учебник: оглавление, формулы KaTeX, график с ползунком, задача и повторение, без внешних запросов', async ({ page }) => {
  const { errors, external } = await openApp(page);
  await openBook(page);
  const toc = page.getByTestId('textbook');
  // главы — по уровням курса; недописанные — свёрнутым списком «Готовятся» в конце
  await expect(toc.getByTestId('tb-level-group')).toHaveCount(5);
  await expect(toc.getByText('Уровень 2 · Базовый')).toBeVisible();
  await expect(toc.locator('[data-status="ready"]')).toHaveCount(20);
  await expect(toc.getByTestId('tb-planned')).toContainText('ещё 3 главы');
  await expectNoSidewaysScroll(page);

  await toc.getByRole('button', { name: /Спрос и предложение/ }).click();
  const ch = page.getByTestId('chapter');
  await expect(ch.locator('h1')).toHaveText('Спрос и предложение');
  // оглавление главы по разделам ведёт к заголовку
  await expect(ch.getByTestId('tb-box-goals')).toContainText('После главы вы сможете');
  await expect(ch.getByTestId('tb-section-progress')).toContainText('пройдено разделов: 0 из 4');
  await ch.getByTestId('tb-sections').getByRole('button', { name: 'Равновесие и его сдвиги' }).click();
  await expect(ch.locator('h2', { hasText: 'Равновесие' })).toBeInViewport();
  // формулы отрисованы KaTeX, шрифты KaTeX — из сборки, а не с CDN
  await expect(ch.locator('.katex').first()).toBeVisible();
  expect(await ch.locator('.katex').count()).toBeGreaterThan(10);
  await page.evaluate(() => document.fonts.ready);
  const families = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
  expect(families.some((f) => f.startsWith('KaTeX'))).toBe(true);

  // ползунок сдвигает спрос: равновесная цена 20 → 25 при сдвиге на 30
  const chart = ch.getByTestId('tb-chart').filter({ has: page.getByRole('slider', { name: 'Сдвиг спроса', exact: true }) }).first();
  await expect(chart.getByTestId('tb-readout')).toContainText('Равновесная цена: 20');
  await chart.getByRole('slider', { name: 'Сдвиг спроса', exact: true }).fill('30');
  await expect(chart.getByTestId('tb-readout')).toContainText('Равновесная цена: 25');
  await expect(chart.getByTestId('tb-readout')).toContainText('Равновесное количество: 80');

  // задача: подсказка перед решением; неверный ответ уходит на повторение, верный засчитывается
  const prob = ch.locator('[data-problem="sd-equilibrium"]');
  await expect(prob.getByTestId('tb-level')).toHaveText('базовый');
  await prob.getByRole('button', { name: /^Подсказка/ }).click();
  await expect(prob.getByTestId('tb-hints')).toContainText('приравняйте');
  await prob.getByRole('textbox').fill('29');
  // уверенность — по желанию: без отметки ответ всё равно проверяется
  await prob.getByRole('button', { name: 'Проверить' }).click();
  await expect(prob.getByTestId('tb-verdict')).toContainText('Пока неверно');
  // единицу из подписи можно дописать к ответу
  await prob.getByRole('textbox').fill('30 кр.');
  await prob.getByRole('button', { name: 'Не уверен', exact: true }).click();
  await prob.getByRole('button', { name: 'Проверить' }).click();
  // задачи учебника — в кронах, как на Пути (docs/world.md, «Валюта»)
  await expect(prob.getByTestId('tb-verdict')).toContainText('Верно: 30 кр.');
  await expect(prob.getByTestId('tb-verdict')).not.toContainText('кр..');
  // ошибся, потом ответил верно — повторение остаётся через два дня, и решённой задача не считается
  await expect(prob.getByTestId('tb-verdict')).toContainText('вернётся через 2 дня');
  await expect(prob).toContainText('была ошибка · повтор через 2 дня');
  await prob.getByRole('button', { name: 'Решение' }).click();
  await expect(prob).toContainText('Приравниваем объёмы');
  // задача в несколько шагов: засчитывается, только если верны все шаги
  const multi = ch.locator('[data-problem="sd-read"]');
  await multi.getByRole('textbox', { name: 'Задача 1, шаг а)' }).fill('24');
  await multi.getByRole('textbox', { name: 'Задача 1, шаг б)' }).fill('20');
  await multi.getByRole('textbox', { name: 'Задача 1, шаг в)' }).fill('24');
  await multi.getByRole('button', { name: 'Уверен', exact: true }).click();
  await multi.getByRole('button', { name: 'Проверить' }).click();
  await expect(multi.getByTestId('tb-verdict')).toContainText('Не сошлось: в)');
  await multi.getByRole('textbox', { name: 'Задача 1, шаг в)' }).fill('39');
  await multi.getByRole('button', { name: 'Уверен', exact: true }).click();
  await multi.getByRole('button', { name: 'Проверить' }).click();
  await expect(multi.getByTestId('tb-verdict')).toContainText('Верно: а) 24 ед.; б) 20 кр.; в) 39 ед.');
  // калькулятор задачи: корень и скобки; результат — в поле, где стоял курсор
  await multi.getByRole('textbox', { name: 'Задача 1, шаг б)' }).fill('');
  await multi.getByTestId('tb-calc-open').click();
  // появляется плавно (пункт владельца 15.11): обёртка раскрывается переходом, клавиши — не меньше 44 px
  const calcWrap = multi.getByTestId('tb-calc-wrap');
  await expect(calcWrap).toHaveAttribute('data-open', 'true');
  expect(await calcWrap.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain('grid-template-rows');
  await page.waitForTimeout(350);
  expect((await multi.locator('[data-calc="7"]').boundingBox()).height).toBeGreaterThanOrEqual(43.9);
  await multi.getByRole('textbox', { name: 'Выражение для калькулятора' }).fill('√(300+100)');
  await expect(multi.getByTestId('tb-calc-value')).toHaveText('= 20');
  // «=» — как в калькуляторе урока: выражение заменяется результатом, с ним можно считать дальше
  const tbCalc = multi.getByTestId('tb-calc');
  await tbCalc.locator('[data-calc="="]').click();
  await expect(tbCalc.getByRole('textbox', { name: 'Выражение для калькулятора' })).toHaveValue('20');
  for (const k of ['×', '2', '⌫', '1']) await tbCalc.locator(`[data-calc="${k}"]`).click();
  await expect(multi.getByTestId('tb-calc-value')).toHaveText('= 20');
  await multi.getByTestId('tb-calc-use').click();
  await expect(multi.getByRole('textbox', { name: 'Задача 1, шаг б)' })).toHaveValue('20');
  // ловушка: типичный неверный ответ получает объяснение ошибки
  const floor = ch.locator('[data-problem="sd-floor"]');
  await floor.getByRole('textbox').fill('70');
  await floor.getByRole('button', { name: 'Не уверен', exact: true }).click();
  await floor.getByRole('button', { name: 'Проверить' }).click();
  await expect(floor.getByTestId('tb-trap')).toContainText('разница между предложением и спросом');
  // задачи свёрнуты по уровням: базовый открыт, семинарский — по нажатию
  await expect(ch.locator('[data-problem="sd-tf-law"]')).toHaveCount(0);
  await ch.locator('[data-testid="tb-level-group"][data-level="Семинарский уровень"]').getByRole('button').first().click();
  // «верно или неверно»: сначала объяснение, потом выбор, потом сверка с ключевыми пунктами
  const tf = ch.locator('[data-problem="sd-tf-law"]');
  await expect(tf.getByRole('button', { name: 'Неверно', exact: true })).toBeDisabled();
  await tf.getByRole('textbox').fill('сдвинулась сама кривая спроса вправо');
  await tf.getByRole('button', { name: 'Уверен', exact: true }).click();
  await tf.getByRole('button', { name: 'Неверно', exact: true }).click();
  await expect(tf.getByTestId('tb-points')).toContainText('сдвиг кривой спроса вправо');
  await expect(tf.getByTestId('tb-verdict')).toContainText('Теперь сверьте объяснение');
  await tf.getByRole('button', { name: 'Совпало', exact: true }).click();
  await expect(tf.getByTestId('tb-verdict')).toContainText('Засчитано');
  await expect(tf).toContainText('Закон спроса при этом выполняется');
  // графическая: сначала прогноз, потом сдвиг; не та кривая или не тот прогноз — неверно
  const gr = ch.locator('[data-problem="sd-graph-flour"]');
  await expect(gr.getByRole('button', { name: 'Уверен', exact: true })).toHaveCount(0);
  await gr.getByRole('button', { name: 'Проверить прогноз' }).click();
  await expect(gr.getByTestId('tb-verdict')).toContainText('Сначала отметьте прогноз');
  await gr.getByRole('button', { name: 'цена: растёт' }).click();
  await gr.getByRole('button', { name: 'количество: растёт' }).click();
  await gr.getByRole('button', { name: 'Проверить прогноз' }).click();
  await expect(gr.getByTestId('tb-verdict')).toContainText('Теперь сдвиньте');
  await gr.getByRole('slider', { name: 'Сдвиг спроса', exact: true }).fill('-20');
  await gr.getByRole('button', { name: 'Проверить прогноз' }).click();
  await expect(gr.getByTestId('tb-verdict')).toContainText('Пока неверно');
  await gr.getByRole('slider', { name: 'Сдвиг спроса', exact: true }).fill('0');
  await gr.getByRole('slider', { name: 'Сдвиг предложения' }).fill('-20');
  await gr.getByRole('button', { name: 'Проверить прогноз' }).click();
  await expect(gr.getByTestId('tb-verdict')).toContainText('Сдвиг верный, а прогноз — нет: количество падает, а не растёт');
  await gr.getByRole('button', { name: 'количество: падает' }).click();
  await gr.getByRole('button', { name: 'Проверить прогноз' }).click();
  await expect(gr.getByTestId('tb-verdict')).toContainText('Верно: цена растёт, количество падает');
  await ch.getByRole('button', { name: 'Отметить главу прочитанной' }).click();
  await expect(ch.getByRole('button', { name: /Глава прочитана/ })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // ссылка на другую главу — и «Назад» туда, где читали, на то же место
  const link = ch.getByRole('button', { name: '«Провалы рынка и налоги»' }).first();
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const y0 = await page.evaluate(() => window.scrollY);
  expect(y0).toBeGreaterThan(500);
  await link.click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'market-failures');
  await page.waitForTimeout(400);
  await bookBack(page);
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'supply-demand');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(Math.max(0, y0 - 400));
  // крупнее текст — и ничего не уезжает вбок
  await page.getByRole('button', { name: 'Крупнее текст' }).click();
  await page.getByRole('button', { name: 'Крупнее текст' }).click();
  await expect(page.getByTestId('tb-reader-bar')).toContainText('130%');
  await expectNoSidewaysScroll(page);
  await page.getByRole('button', { name: 'Мельче текст' }).click();
  await page.getByRole('button', { name: 'Мельче текст' }).click();

  await toToc(page);
  await expect(page.getByTestId('tb-stats')).toContainText('Глав прочитано: 1 из 20');
  // уверенные ответы — на странице «Мой прогресс»: два из трёх верны (включая задачу в несколько шагов; ответ
  // без отметки в счёт не идёт), неуверенный — верен; у задачи на графике вместо уверенности прогноз
  await page.getByTestId('tb-stats-link').click();
  await expect(page.getByTestId('stats-confidence')).toContainText('верно 2 из 3 (67%)');
  await expect(page.getByTestId('stats-confidence')).toContainText('неуверенные: верно 1 из 2');
  await toToc(page);
  // «На сегодня» больше нет: «Вспомните» в конце раздела — вопросы с вариантами, писать ничего не нужно
  await toc.getByRole('button', { name: /Спрос и предложение/ }).click();
  const recall = page.getByTestId('chapter').getByTestId('tb-recall').first();
  await recall.scrollIntoViewIfNeeded();
  await expect(recall.getByRole('textbox')).toHaveCount(0);
  const rightKeys = JSON.parse(await recall.getAttribute('data-answer'));
  const parts = recall.getByTestId('tb-recall-part');
  // ошибка: почему вариант неверен, разбор, «Ещё раз»
  await parts.nth(0).locator(`[data-key]:not([data-key="${rightKeys[0]}"])`).first().click();
  await expect(parts.nth(0).getByTestId('tb-recall-why')).toBeVisible();
  // ответ — с анимацией (пункт владельца 09.11): неверный вздрагивает, верный подпрыгивает
  const anim = (loc) => loc.evaluate((el) => getComputedStyle(el).animationName);
  expect(await anim(parts.nth(0).locator('.tb-recall-opt.wrong'))).toBe('tb-rc-shake');
  expect(await anim(parts.nth(0).locator('.tb-recall-opt.right'))).toBe('tb-rc-pop');
  for (let i = 1; i < rightKeys.length; i += 1) await parts.nth(i).locator(`[data-key="${rightKeys[i]}"]`).click();
  await expect(recall.getByTestId('tb-recall-answer')).toBeVisible();
  await expect(recall.getByTestId('tb-recall-verdict')).toContainText('вернётся на повторение');
  await recall.getByTestId('tb-recall-again').click();
  await expect(recall.getByTestId('tb-recall-answer')).toHaveCount(0);
  // тут же верно — раздел засчитан, а вопрос остаётся в повторении: вернётся в свой день, чтобы закрепить
  for (let i = 0; i < rightKeys.length; i += 1) await parts.nth(i).locator(`[data-key="${rightKeys[i]}"]`).click();
  await expect(recall.getByTestId('tb-recall-verdict')).toContainText('Раздел пройден');
  await expect(recall.getByTestId('tb-recall-verdict')).toContainText('вернётся на повторение');
  // верно сразу после ошибки — без опыта: опыт будет в день повторения
  await expect(recall.getByTestId('tb-recall-xp')).toHaveCount(0);
  // следующий раздел: всё верно с первого раза — раздел пройден
  const recall2 = page.getByTestId('chapter').getByTestId('tb-recall').nth(1);
  await recall2.scrollIntoViewIfNeeded();
  const rightKeys2 = JSON.parse(await recall2.getAttribute('data-answer'));
  for (let i = 0; i < rightKeys2.length; i += 1) await recall2.getByTestId('tb-recall-part').nth(i).locator(`[data-key="${rightKeys2[i]}"]`).click();
  await expect(recall2.getByTestId('tb-recall-verdict')).toContainText('Раздел пройден');
  // новый вопрос верно — немного опыта
  await expect(recall2.getByTestId('tb-recall-xp')).toHaveText('+5 опыта');
  await expectNoSidewaysScroll(page);
  // вышли и вернулись — отвеченное верно осталось отвеченным: верные варианты, разбор, «Отвечено верно», без опыта
  await toToc(page);
  await toc.getByRole('button', { name: /Спрос и предложение/ }).click();
  const again2 = page.getByTestId('chapter').getByTestId('tb-recall').nth(1);
  await again2.scrollIntoViewIfNeeded();
  await expect(again2).toHaveAttribute('data-kept', 'true');
  await expect(again2.getByTestId('tb-recall-verdict')).toContainText('Отвечено верно');
  await expect(again2.getByTestId('tb-recall-answer')).toBeVisible();
  await expect(again2.getByTestId('tb-recall-xp')).toHaveCount(0);
  await expect(again2.locator('.tb-recall-opt.right')).toHaveCount(rightKeys2.length);
  await expect(again2.locator('.tb-recall-opt:not([disabled])')).toHaveCount(0);
  // открытая отвеченной — без анимации
  expect(await again2.locator('.tb-recall-opt.right').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  // первый — с ошибкой и верным ответом после неё — тоже отвечен; повторение — через два дня
  await expect(page.getByTestId('chapter').getByTestId('tb-recall').first().getByTestId('tb-recall-verdict')).toContainText('вернётся на повторение');
  await toToc(page);
  await expect(toc.locator('.tb-toc-row', { hasText: 'Спрос и предложение' }).locator('[data-testid=tb-ch-sections][data-done="2"][data-total="4"]')).toHaveCount(1);
  // ни «На сегодня», ни «Оглавления» на страницах: один «назад» вверху
  await expect(page.getByTestId('today-card')).toHaveCount(0);

  // IS-LM: переключатель «ЦБ держит ставку» на графике, ссылка в Лабораторию с настройками
  await toc.getByRole('button', { name: /Модель IS-LM/ }).click();
  const islm = page.locator('[data-chart="is-lm"]').first();
  await expect(islm.getByTestId('tb-readout')).toContainText('Выпуск Y: 1100');
  await islm.getByRole('slider', { name: 'Госрасходы G' }).fill('150');
  await expect(islm.getByTestId('tb-readout')).toContainText('Выпуск Y: 1200');
  await islm.getByRole('button', { name: 'ЦБ держит ставку' }).click();
  await expect(islm.getByTestId('tb-readout')).toContainText('Выпуск Y: 1300');
  // кейнсианский крест: те же 1100, госзакупки +50 — выпуск +200
  const cross = page.locator('[data-chart="cross"]');
  await expect(cross.getByTestId('tb-readout')).toContainText('Выпуск Y: 1100');
  await cross.getByRole('slider', { name: 'Госзакупки G' }).fill('150');
  await expect(cross.getByTestId('tb-readout')).toContainText('Выпуск Y: 1300');
  // схема «ставка → … → цены» переключается вверх и вниз
  const flow = page.getByTestId('tb-flow');
  await expect(flow.getByTestId('tb-flow-step')).toHaveCount(6);
  await expect(flow).toContainText('кредиты дорожают');
  await flow.getByRole('button', { name: 'Ставка ЦБ: вниз' }).click();
  await expect(flow).toContainText('кредиты дешевеют');
  // «Как это устроено в игре» и «Проверьте в игре» убраны — их никто не нажимал
  await expect(page.getByTestId('tb-box-game')).toHaveCount(0);
  await expect(page.getByTestId('tb-box-try')).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  // AD-AS: кривая AD из IS-LM, те же числа; шок издержек — стагфляция
  await toToc(page);
  await toc.getByRole('button', { name: /Совокупный спрос и совокупное предложение/ }).click();
  const adas = page.locator('[data-chart="ad-as"]').nth(1);
  await expect(adas.getByTestId('tb-readout')).toContainText('Выпуск Y: 1100');
  await adas.getByRole('slider', { name: 'Ожидаемые цены Pᵉ' }).fill('2.2');
  await expect(adas.getByTestId('tb-readout')).toContainText('Выпуск Y: 1081,2');
  await expect(adas.getByTestId('tb-readout')).toContainText('Уровень цен P: 2,16');
  await expectNoSidewaysScroll(page);

  // монополия: график с ползунком издержек и правило Лернера в числах
  await toToc(page);
  await toc.getByRole('button', { name: /Совершенная конкуренция и монополия/ }).click();
  const mono = page.locator('[data-chart="monopoly"]').first();
  await expect(mono.getByTestId('tb-readout')).toContainText('Цена: 60');
  await mono.getByRole('slider', { name: 'Предельные издержки MC' }).fill('30');
  await expect(mono.getByTestId('tb-readout')).toContainText('Цена: 65');
  await expectNoSidewaysScroll(page);

  // издержки: огибающая LRAC и ссылка на производную в приложении «Математика для экономиста»
  await toToc(page);
  await toc.getByRole('button', { name: /Издержки и прибыль/ }).click();
  const lrac = page.locator('[data-chart="lrac"]');
  await expect(lrac.getByTestId('tb-readout')).toContainText('положительный эффект масштаба');
  await lrac.getByRole('slider').fill('60');
  await expect(lrac.getByTestId('tb-readout')).toContainText('минимально эффективный масштаб');
  // производная — во вставке «Вы знаете, что такое производная?»: «Нет, объясните» раскрывает объяснение со ссылкой
  const ask = page.getByTestId('chapter').locator('[data-testid=tb-ask][data-ask="derivative"]');
  await expect(ask.getByTestId('tb-ask-body')).toHaveCount(0);
  await ask.getByTestId('tb-ask-learn').click();
  await expect(ask.getByTestId('tb-ask-body')).toContainText('Сначала без формул');
  await ask.getByRole('button', { name: 'приложении «Математика для экономиста»' }).click();
  await expect(page.getByTestId('appendix')).toHaveAttribute('data-appendix', 'math');
  await expect(page.locator('#derivative')).toBeInViewport();
  await bookBack(page);
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'costs');

  // приложения: «игра ↔ учебник» с кнопками в Лабораторию, ограничения модели и словарь
  await toToc(page);
  await toc.getByRole('button', { name: /Игра ↔ учебник/ }).click();
  const cards = page.getByTestId('appendix-cards');
  await expect(cards.getByText('Закон Оукена', { exact: true })).toBeVisible();
  await expect(cards.getByRole('button', { name: 'Открыть в Лаборатории' })).toHaveCount(8);
  await expect(cards.getByRole('button', { name: 'Задача: Реальная ставка при инфляции 25%' })).toBeVisible();
  await page.getByRole('button', { name: /Чем модель не похожа на настоящую/ }).click();
  await expect(page.getByTestId('appendix-limits').getByText('Адаптивные ожидания', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Словарь/ }).click();
  await page.getByRole('textbox', { name: 'Поиск по словарю' }).fill('эластичн');
  await expect(page.getByTestId('appendix-glossary')).toContainText('Эластичность спроса по цене');

  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «нужны плавные анимации, типа изменение технологии — плавное движение графика»
test('учебник: график с ползунком едет плавно — кривые и точки проходят промежуточные положения и доезжают до нового', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
  const chart = page.getByTestId('chapter').getByTestId('tb-chart').first();
  await chart.scrollIntoViewIfNeeded();
  const slider = chart.getByRole('slider').first();
  const curves = () => chart.evaluate((el) => [...el.querySelectorAll('svg[role=img] path[data-curve], svg[role=img] circle')].map((p) => p.getAttribute('d') || `${p.getAttribute('cx')},${p.getAttribute('cy')}`).join('|'));
  const before = await curves();
  // следим за кривой кадр за кадром, пока сдвигаем ползунок до упора
  await chart.evaluate((el) => {
    window.__frames = [];
    const t0 = performance.now();
    const tick = () => { window.__frames.push([...el.querySelectorAll('svg[role=img] path[data-curve], svg[role=img] circle')].map((p) => p.getAttribute('d') || `${p.getAttribute('cx')},${p.getAttribute('cy')}`).join('|')); if (performance.now() - t0 < 700) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const max = await slider.getAttribute('max');
  await slider.fill(max);
  await page.waitForTimeout(800);
  const frames = await page.evaluate(() => window.__frames);
  const after = await curves();
  expect(after).not.toBe(before);
  // между прежним и новым положением — несколько промежуточных
  expect(new Set(frames.filter((d) => d !== before && d !== after)).size).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

// пункт владельца 15.11: «анимация движения графика очень сильно багается, когда быстро ползунок двигаешь, да и когда медленно тоже»
test('учебник: пока график едет за ползунком, подписи кривых и точек не прыгают', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Эластичность/ }).first().click();
  const chart = page.getByTestId('chapter').locator('[data-testid=tb-chart][data-chart=elasticity]').first();
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator('svg[role=img] text').first()).toBeVisible();
  // каждый ползунок ведём до правого края и обратно до левого за 2,5 с и кадр за кадром смотрим, насколько сдвинулась каждая подпись
  const worst = await chart.evaluate((el) => new Promise((done) => {
    const inputs = [...el.querySelectorAll('input[type=range]')];
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    // подписи кривых и точек; числа на осях стоят на месте и повторяются — их не берём
    const snap = () => [...el.querySelectorAll('svg[role=img] text')].filter((t) => !/^[\d\s,.−-]*$/.test(t.textContent)).map((t) => { const b = t.getBBox(); return { s: t.textContent, x: b.x, y: b.y }; });
    const T = 2500; let prev = snap(); let max = 0; let who = ''; const t0 = performance.now(); let lastT = t0; const start = [];
    const tick = (now) => {
      const t = Math.max(0, now - t0); const k = Math.min(inputs.length - 1, Math.floor(t / T)); const input = inputs[k];
      const lo = Number(input.min); const hi = Number(input.max); const step = Number(input.step) || 1; const f = Math.min(1, (t - k * T) / (T - 300));
      // без рывков: от того, где ползунок стоял, — до правого края, потом до левого
      if (start[k] == null) start[k] = Number(input.value);
      const v = f < 0.4 ? start[k] + (hi - start[k]) * (f / 0.4) : hi + (lo - hi) * ((f - 0.4) / 0.6);
      set.call(input, String(lo + Math.round((v - lo) / step) * step)); input.dispatchEvent(new Event('input', { bubbles: true }));
      const cur = snap();
      // долгий кадр (занятая машина) — не в счёт: за него подпись честно проезжает больше
      if (now - lastT < 40) cur.forEach((a) => { const b = prev.find((p) => p.s === a.s); if (b) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > max) { max = d; who = `${a.s} ${Math.round(b.x)},${Math.round(b.y)}→${Math.round(a.x)},${Math.round(a.y)} ползунок ${k} f=${f.toFixed(2)}`; } } });
      prev = cur; lastT = now;
      if (t < T * inputs.length) requestAnimationFrame(tick); else done({ max: Math.round(max), who, n: inputs.length });
    };
    requestAnimationFrame(tick);
  }));
  expect(worst.n).toBeGreaterThan(0);
  // раньше подписи перескакивали на десятки пикселей за кадр
  expect(worst.max, `подпись «${worst.who}»`).toBeLessThan(26);
  expect(errors).toEqual([]);
});

// замечание владельца 18.11, вечер, п. 20: «не нравится, как выглядит оглавление в учебнике, нужен редизайн; очень много лишнего
// места вместо чтения»: главы — карточками с цветом юнита; у главы шрифт и музыка — в строке обложки (ПК), разделы — лентой
// (телефон), текст главы начинается на первом экране
// пункт владельца 19.11, п. 3: «мне теперь ещё больше не нравится оглавление» — оглавление как в книге: строки без карточек,
// номер антиквой в цвете юнита, отточие до счётчика разделов
test('учебник: оглавление как в книге — строки глав с номером, отточием и разделами; глава без лишнего места — текст на первом экране', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  const rows = page.getByTestId('textbook').locator('.tbl-chs .tbl-ch[data-chapter]');
  expect(await rows.count()).toBeGreaterThan(10);
  const first = rows.first();
  expect(await first.evaluate((el) => getComputedStyle(el).getPropertyValue('--u').trim())).not.toBe('');
  // без карточек: ни рамки, ни тени, ни скругления — строка с линией снизу
  expect(await first.evaluate((el) => { const st = getComputedStyle(el); return [st.borderTopWidth, st.borderRadius, st.boxShadow]; })).toEqual(['0px', '0px', 'none']);
  // номер — в цвете юнита, не цветом текста
  expect(await first.locator('.tbl-no').evaluate((el) => getComputedStyle(el).color)).not.toBe(await first.locator('.tbl-ch-title').evaluate((el) => getComputedStyle(el).color));
  await expect(first.locator('.tbl-ch-state')).toHaveText(/\d+ \/ \d+|прочитана/);
  if (!isMobile) await expect(first.locator('.tbl-dots')).toBeVisible();
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
  const ch = page.getByTestId('chapter');
  await expect(ch).toBeVisible();
  const vp = page.viewportSize();
  const firstP = ch.locator('.tb-ch-main p').first();
  const top = (await firstP.boundingBox()).y;
  expect(top, 'первый абзац главы — на первом экране').toBeLessThan(vp.height * (isMobile ? 0.62 : 0.3));
  if (isMobile) {
    // разделы — лентой: все в одной строке
    const ys = await ch.getByTestId('tb-sections').locator('li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys).size).toBe(1);
  } else {
    // шрифт и музыка — в строке обложки, а не отдельной строкой над ней
    const bar = await page.getByTestId('tb-reader-bar').boundingBox(); const cover = await ch.getByTestId('chapter-cover').boundingBox();
    expect(bar.y).toBeGreaterThanOrEqual(cover.y);
    expect(bar.y + bar.height).toBeLessThanOrEqual(cover.y + cover.height);
    // разделы открытой главы — под ней в оглавлении
    await expect(ch.getByTestId('tb-side-toc').locator('[aria-current="page"] + .tb-chtoc-secs [data-testid="tb-sections"]')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

// замечания владельца 18.11, вечер: «отдалял, потом приблизил — сломанный график в прямую превратился», «странно обрывается,
// когда ты что-то сместил, исчезает значение на конце», «зачем такое далёкое отдаление с миллионами», «анимаций нет, когда
// дёргаешь ползунки», «нет флажка жалобы»
test('плоскость на весь экран: предел отдаления, после «отдалить-приблизить» кривые те же, линии до края экрана, ползунки — плавно, флажок жалобы', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
  const chart = page.getByTestId('chapter').getByTestId('tb-chart').first();
  await chart.scrollIntoViewIfNeeded();
  await chart.getByTestId('tb-chart-zoom').click();
  const pv = page.getByTestId('plane-view');
  const st = pv.getByTestId('plane-stage');
  await page.waitForTimeout(1100);
  const lvl = async () => Number((await pv.getByTestId('plane-level').textContent()).replace('×', '').replace(',', '.'));
  const shape = () => st.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [...el.querySelectorAll('[data-testid=plane-curve]')].map((p) => {
      const L = p.getTotalLength(); const a = p.getPointAtLength(0); const b = p.getPointAtLength(L);
      return { id: p.getAttribute('data-curve'), a: [a.x, a.y], b: [b.x, b.y], w: r.width, h: r.height };
    });
  });
  // линии доходят до краёв видимой плоскости (прямые продолжены, а не кончаются на краю маленького графика)
  await page.keyboard.press('Tab');
  await st.focus();
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('-');
  await page.waitForTimeout(400);
  const wide = await shape();
  expect(wide.length).toBeGreaterThan(0);
  // где на экране оси x = 0 и y = 0: прямые из первой четверти кончаются на них, а не уходят в «минус» (жалоба 19.11, копилка)
  const ax = await st.evaluate((el) => { const n = (k) => Number(el.dataset[k]); const r = el.getBoundingClientRect(); return { x: ((0 - n('x0')) / (n('x1') - n('x0'))) * r.width, y: r.height - ((0 - n('y0')) / (n('y1') - n('y0'))) * r.height }; });
  for (const c of wide) {
    const touches = [c.a, c.b].some(([x, y]) => x < 4 || y < 4 || x > c.w - 4 || y > c.h - 4 || Math.abs(x - ax.x) < 3 || Math.abs(y - ax.y) < 3);
    expect(touches, `кривая ${c.id} доходит до края экрана или до оси`).toBe(true);
    for (const [x, y] of [c.a, c.b]) { expect(x, `кривая ${c.id} не левее оси P`).toBeGreaterThan(ax.x - 3); expect(y, `кривая ${c.id} не ниже оси Q`).toBeLessThan(ax.y + 3); }
  }
  // предел отдаления: сколько ни жми «−», не дальше ×0,1 (в 8 раз от «вписать»)
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('-');
  await page.waitForTimeout(400);
  expect(await lvl()).toBeGreaterThanOrEqual(0.12);
  await expect(pv.getByTestId('plane-curve-label').first()).toBeAttached();
  // отдалили до предела и вернули — те же кривые, что после «Вписать»
  await pv.getByTestId('plane-fit').click(); await page.waitForTimeout(400);
  const fitShape = await shape();
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('-');
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('+');
  await pv.getByTestId('plane-fit').click(); await page.waitForTimeout(400);
  const back = await shape();
  expect(back.map((c) => c.id)).toEqual(fitShape.map((c) => c.id));
  for (const [i, c] of back.entries()) for (const k of ['a', 'b']) for (const j of [0, 1]) expect(Math.abs(c[k][j] - fitShape[i][k][j])).toBeLessThan(2);
  // ползунок: кривая переезжает плавно — в середине движения она не там, где была, и не там, где будет
  const ctl = pv.getByTestId('plane-side').getByTestId('plane-ctl').first();
  const d = () => st.evaluate((el) => [...el.querySelectorAll('[data-testid=plane-curve], circle')].map((p) => p.getAttribute('d') || `${p.getAttribute('cx')},${p.getAttribute('cy')}`).join('|'));
  const d0 = await d();
  const frames = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid=plane-side] [data-testid=plane-ctl]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, el.getAttribute('min')); el.dispatchEvent(new Event('input', { bubbles: true }));
    const seen = [];
    const t0 = performance.now();
    await new Promise((r) => { const tick = () => { seen.push([...document.querySelectorAll('[data-testid=plane-stage] [data-testid=plane-curve], [data-testid=plane-stage] circle')].map((p) => p.getAttribute('d') || `${p.getAttribute('cx')},${p.getAttribute('cy')}`).join('|')); if (performance.now() - t0 < 600) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); });
    return seen;
  });
  const d1 = await d();
  expect(d1).not.toBe(d0);
  expect(new Set(frames.filter((x) => x !== d0 && x !== d1)).size, 'промежуточные кадры').toBeGreaterThan(2);
  await expect(ctl).toBeVisible();
  // флажок жалобы — прямо на плоскости; шторка открывается поверх неё, Esc закрывает шторку, а не плоскость
  await pv.getByTestId('plane-report').click();
  const sheet = page.getByTestId('report-sheet');
  await expect(sheet).toBeVisible();
  const onTop = await sheet.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return el.contains(top); });
  expect(onTop).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pv).toBeVisible();
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «хотелось бы, чтобы можно было нажать на картинку и она открылась на весь экран»;
// 16.11, вечер: «должно быть реально классно, современно, реальная числовая плоскость»
test('график на весь экран — числовая плоскость: сетка мельчает при приближении, плоскость двигается, у линии — значения; Esc закрывает только её', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
  const chart = page.getByTestId('chapter').getByTestId('tb-chart').first();
  await chart.scrollIntoViewIfNeeded();
  // ползунок работает как раньше и ничего не открывает
  const slider = chart.getByRole('slider').first();
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.getByTestId('plane-view')).toHaveCount(0);
  const title = (await chart.locator('.ems-serif').first().textContent()).trim();
  await chart.getByTestId('tb-chart-zoom').click();
  const pv = page.getByTestId('plane-view');
  await expect(pv).toBeVisible();
  await expect(pv).toContainText(title);
  await expect(pv.getByTestId('plane-caption')).toBeAttached();
  const level = pv.getByTestId('plane-level');
  await expect(level).toHaveText('×1,0');
  const st = pv.getByTestId('plane-stage');
  const num = async (a) => Number(await st.getAttribute(a));
  // во весь экран: плоскость занимает основную часть окна (рядом — панель модели: справа на ПК, снизу на телефоне)
  const box = await st.boundingBox(); const vp = page.viewportSize();
  expect(box.width).toBeGreaterThan(vp.width * (isMobile ? 0.95 : 0.6)); expect(box.height).toBeGreaterThan(vp.height * (isMobile ? 0.35 : 0.6));
  // пункт владельца 18.11: «он же ничего не меняет — сделай РЕАЛЬНУЮ числовую плоскость»: ползунки модели прямо на плоскости,
  // кривая перестраивается, прежняя — пунктиром «как было», значения — живые; «Как было» возвращает
  await page.waitForTimeout(1100);
  const side = pv.getByTestId('plane-side');
  await expect(side).toContainText('Меняйте модель');
  const curveD = async () => st.locator('svg').evaluate((el) => [...el.querySelectorAll('[data-testid=plane-curve], circle')].map((e) => e.getAttribute('d') || `${e.getAttribute('cx')},${e.getAttribute('cy')}`).join('|'));
  const before = await curveD(); const read0 = await side.getByTestId('plane-readout').textContent();
  for (const ctl of await side.getByTestId('plane-ctl').all()) await ctl.fill(await ctl.getAttribute('min'));
  await expect.poll(curveD).not.toBe(before);
  await expect(st.getByTestId('plane-was').first()).toBeAttached();
  await expect(side.getByTestId('plane-readout')).not.toHaveText(read0);
  await side.getByTestId('plane-reset').click();
  await expect.poll(curveD).toBe(before);
  await expect(st.getByTestId('plane-was')).toHaveCount(0);
  // кривые — линиями в точках экрана, деления — числами
  await expect(st.locator('svg path').first()).toBeVisible();
  const step0 = await num('data-step-x');
  // «+» — ближе, и шаг сетки мельче (деления пересчитываются, а не растягиваются)
  await pv.getByTestId('plane-in').click();
  await expect(level).toHaveText('×1,6');
  await pv.getByTestId('plane-in').click(); await pv.getByTestId('plane-in').click();
  await expect.poll(() => num('data-step-x')).toBeLessThan(step0);
  // тянем — плоскость едет (сначала дожидаемся конца плавного приближения)
  await expect(level).toHaveText('×4,1');
  await page.waitForTimeout(350);
  const x0 = await num('data-x0');
  const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 80, cy, { steps: 4 }); await page.mouse.up();
  await expect.poll(() => num('data-x0')).toBeLessThan(x0);
  // «Вписать» — снова весь график
  await pv.getByTestId('plane-fit').click();
  await expect(level).toHaveText('×1,0');
  if (!isMobile) {
    // наведение на линию — её точка и значения по обеим осям
    const lineAt = await st.evaluate((el) => {
      const p = [...el.querySelectorAll('svg path')].find((x) => x.getAttribute('fill') === 'none' && !x.getAttribute('stroke-dasharray'));
      const q = p.getPointAtLength(p.getTotalLength() * 0.5); const r = el.getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y };
    });
    await page.mouse.move(lineAt.x, lineAt.y + 3);
    await expect(pv.getByTestId('plane-read')).toContainText(':');
    await expect(pv.getByTestId('plane-cursor')).toBeVisible();
    // колёсико — к курсору: прокрутили от себя — ближе
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => Number((await level.textContent()).replace('×', '').replace(',', '.'))).toBeGreaterThan(1.3);
  }
  // двойное касание — вдвое ближе
  await pv.getByTestId('plane-fit').click();
  await st.dblclick({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect.poll(async () => Number((await level.textContent()).replace('×', '').replace(',', '.'))).toBeGreaterThan(1.9);
  // Esc закрывает только плоскость: глава на месте; и крестиком
  await page.keyboard.press('Escape');
  await expect(pv).toHaveCount(0);
  await expect(page.getByTestId('chapter')).toBeVisible();
  await chart.getByTestId('tb-chart-zoom').click();
  await page.getByTestId('plane-close').click();
  await expect(page.getByTestId('plane-view')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('картинка на весь экран: фото в «Персоналиях» открывается целиком, без обрезки аркой; урок остаётся на месте', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: { 'sc-i1': { at, runs: 1, best: 90 }, 'sc-l1': { at, runs: 1, best: 90 } } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.locator('[data-testid=path-extra][data-id="people-scarcity"]').click();
  await page.getByTestId('extra-start').click();
  const pg = page.getByTestId('people');
  await expect(pg.getByTestId('people-page')).toHaveAttribute('data-person', 'robbins');
  await expect(pg.getByTestId('people-portrait')).toHaveAttribute('data-photo', 'true');
  await pg.getByTestId('people-portrait-zoom').click();
  const zv = page.getByTestId('zoom-view');
  await expect(zv).toBeVisible();
  await expect(zv).toContainText('Лайонел Роббинс');
  const img = zv.locator('img');
  await expect(img).toHaveAttribute('src', '/people/robbins.jpg');
  // целиком: пропорции картинки — как у файла, а не у рамки-арки
  await expect.poll(() => img.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
  const ratio = await img.evaluate((el) => ({ file: el.naturalWidth / el.naturalHeight, shown: el.getBoundingClientRect().width / el.getBoundingClientRect().height }));
  expect(Math.abs(ratio.file - ratio.shown)).toBeLessThan(0.02);
  await page.keyboard.press('Escape');
  await expect(zv).toHaveCount(0);
  await expect(pg.getByTestId('people-page')).toBeVisible();
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «хотелось бы свернуть оглавление, когда читаешь»
test('учебник: оглавление главы сворачивается — глава посередине освободившегося места, выбор помнится после перезагрузки', async ({ page, isMobile }) => {
  const { errors } = await openApp(page);
  const openChapter = async () => {
    await openBook(page);
    await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
    await expect(page.getByTestId('chapter')).toBeVisible();
  };
  await openChapter();
  const ch = page.getByTestId('chapter');
  await expect(ch.getByTestId('tb-sections')).toBeVisible();
  if (!isMobile) await expect(ch.getByTestId('tb-side-toc')).toBeVisible();
  // колонка текста: ширина и середина (строка главы — не длиннее 75 знаков, поэтому шире колонка не становится)
  const mainBox = async () => { const b = await ch.locator('.tb-ch-main').boundingBox(); return { w: b.width, mid: b.x + b.width / 2 }; };
  const b0 = await mainBox();
  await ch.getByTestId('tb-toc-fold').click();
  await expect(ch.getByTestId('tb-ch-grid')).toHaveAttribute('data-folded', 'true');
  // сворачивается плавно (пункт владельца 15.11): текст главы и оглавление едут переходом, а не прыгают
  await expect(ch.getByTestId('tb-ch-grid')).toHaveAttribute('data-fold-anim', '1');
  expect(await ch.locator('.tb-ch-aside').evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(ch.getByTestId('tb-sections')).toHaveCount(0);
  await expect(ch.getByTestId('tb-side-toc')).toHaveCount(0);
  if (!isMobile) {
    // оглавление ушло — колонка не сузилась и стоит посередине освободившегося места (справа от полоски «Оглавление»)
    await page.waitForTimeout(600);
    const b1 = await mainBox();
    expect(b1.w).toBeGreaterThanOrEqual(b0.w - 1);
    const cell = await ch.getByTestId('tb-ch-grid').evaluate((g) => { const r = g.getBoundingClientRect(); return { left: r.left + 44, right: r.right }; });
    expect(Math.abs(b1.mid - (cell.left + cell.right) / 2)).toBeLessThan(40);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await openChapter();
  await expect(page.getByTestId('chapter').getByTestId('tb-ch-grid')).toHaveAttribute('data-folded', 'true');
  await page.getByTestId('chapter').getByTestId('tb-toc-unfold').click();
  await expect(page.getByTestId('chapter').getByTestId('tb-sections')).toBeVisible();
  expect(errors).toEqual([]);
});

// пункт владельца 09.11: «свёрнутый раздел задачи не сохраняется» — раздел уровня помнит, свёрнут он или раскрыт
test('учебник: свёрнутый «Базовый уровень» и раскрытый «Семинарский» остаются такими после перезагрузки', async ({ page }) => {
  const { errors } = await openApp(page);
  const openChapter = async () => {
    await openBook(page);
    await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).first().click();
    await expect(page.getByTestId('chapter')).toBeVisible();
  };
  await openChapter();
  const lv = (t) => page.getByTestId('chapter').locator(`[data-testid="tb-level-group"][data-level="${t}"]`);
  await expect(lv('Базовый уровень')).toHaveAttribute('data-open', 'true');
  await expect(lv('Семинарский уровень')).toHaveAttribute('data-open', 'false');
  await lv('Базовый уровень').getByRole('button').first().click();
  await lv('Семинарский уровень').getByRole('button').first().click();
  await expect(lv('Базовый уровень')).toHaveAttribute('data-open', 'false');
  await page.reload({ waitUntil: 'networkidle' });
  await openChapter();
  await expect(lv('Базовый уровень')).toHaveAttribute('data-open', 'false');
  await expect(lv('Семинарский уровень')).toHaveAttribute('data-open', 'true');
  expect(errors).toEqual([]);
});

test('учебник: кругооборот в «ВВП» и балансы банков по шагам в «Деньгах и банках»', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  const toc = page.getByTestId('textbook');
  await toc.locator('.tb-toc-row', { hasText: 'ВВП и система национальных счетов' }).click();
  const circ = page.locator('[data-diagram="circular"]');
  await expect(circ.getByTestId('tb-diagram-note')).toContainText('потратили');
  await circ.getByRole('button', { name: 'По добавленной стоимости' }).click();
  await expect(circ.getByTestId('tb-diagram-note')).toContainText('300 + 400 + 300 = 1000');
  await circ.getByRole('button', { name: 'По доходам' }).click();
  await expect(circ.getByTestId('tb-diagram-note')).toContainText('вместе 1000');
  await expectNoSidewaysScroll(page);
  await toToc(page);
  await toc.locator('.tb-toc-row', { hasText: 'Деньги и банки' }).click();
  const bal = page.locator('[data-diagram="balance"]');
  await expect(bal.getByTestId('tb-money')).toContainText('1000');
  await bal.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(bal.getByTestId('tb-money')).toContainText('1900');
  await expect(bal.getByTestId('tb-bank')).toContainText('Вклад Бориса');
  await bal.getByRole('button', { name: /Итог/ }).click();
  await expect(bal.getByTestId('tb-money')).toContainText('10000');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('учебник: на телефоне ни одна блочная формула не шире 1,2 экрана', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'ширина формул важна на узком экране');
  // самый узкий распространённый телефон: колонка текста около 343 px
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Спрос и предложение/ }).click();
  const ch = page.getByTestId('chapter');
  await expect(ch.locator('.katex').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // все блочные формулы всех глав и приложений, включая разборы задач, — в той же колонке текста, с теми же шрифтами
  const files = ['src/textbook/chapters', 'src/textbook/appendices'].flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => `${d}/${f}`));
  const formulas = files.flatMap((f) => collectBlocks(parseChapter(fs.readFileSync(f, 'utf8')), (b) => b.type === 'math').map((b) => ({ where: f.replace(/^.*\//, ''), tex: b.tex })));
  expect(formulas.length).toBeGreaterThan(50);
  const html = formulas.map((m, i) => `<div class="tb-math" data-i="${i}">${katex.renderToString(m.tex, { displayMode: true, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })}</div>`).join('');
  const widths = await ch.locator('.tb-body').first().evaluate((body, h) => {
    const box = document.createElement('div');
    box.innerHTML = h;
    body.appendChild(box);
    const out = [...box.querySelectorAll('.tb-math')].map((el) => el.scrollWidth);
    box.remove();
    return { out, column: body.clientWidth };
  }, html);
  // «экран» — колонка текста, в которой формула прокручивается
  const limit = 1.2 * widths.column;
  const wide = formulas.map((m, i) => ({ ...m, w: widths.out[i] })).filter((m) => m.w > limit);
  expect(wide, `колонка ${widths.column} px, предел ${Math.round(limit)} px`).toEqual([]);
});

test('учебник: в главах нет «Проверьте в игре» и «Как это устроено в игре» (решение владельца 5 ноября 2026)', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Эластичность/ }).first().click();
  const ch = page.getByTestId('chapter');
  await expect(ch).toBeVisible();
  await expect(ch).not.toContainText('Проверьте в игре');
  await expect(ch).not.toContainText('Как это устроено в игре');
  await expect(ch.getByRole('button', { name: /^Своё дело:/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('учебник: прогресс уходит в профиль и приходит с другого устройства', async ({ page }) => {
  const sent = [];
  const api = (req) => {
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /* GET */ }
    if (body.action === 'progress') {
      sent.push(body.progress);
      // на другом устройстве уже прочитана глава про КПВ
      return JSON.stringify({ profile: { ...body.progress, textbook: { read: { scarcity: 1000 }, problems: {}, last: null, lastAt: 0 } } });
    }
    return '{}';
  };
  const { errors } = await openApp(page, '/', api);
  await openBook(page);
  const toc = page.getByTestId('textbook');
  await expect(toc.getByRole('button', { name: /Ограниченность и выбор/ }).locator('[aria-label="прочитана"]')).toHaveCount(1);
  await toc.getByRole('button', { name: /Спрос и предложение/ }).click();
  await page.getByTestId('chapter').getByRole('button', { name: 'Отметить главу прочитанной' }).click();
  // отметка уходит на сервер вместе с тем, что пришло с другого устройства
  await expect.poll(() => sent.some((p) => p.textbook && p.textbook.read['supply-demand'] && p.textbook.read.scarcity), { timeout: 8000 }).toBe(true);
  expect(errors).toEqual([]);
});

// «Открыть теорию» из карточки урока: учебник поверх Пути — внизу отмечен «Учебник», «Путь» возвращает на дорогу
test('теория из карточки урока: внизу отмечен «Учебник», вкладка «Путь» закрывает учебник', async ({ page }) => {
  await page.addInitScript(() => {
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum',
      'sd-i1', 'sd-l1', 'sd-w', 'sd-i2', 'sd-l3', 'sd-s1', 'sd-l-radio', 'sd-g', 'sd-rev', 'sd-sum',
      'el-i1', 'el-l1', 'el-i2', 'el-l2', 'el-w', 'el-s1', 'el-radio', 'el-g', 'el-rev', 'el-sum', 'cs-i1', 'cs-l1', 'cs-i2', 'cs-l2', 'cs-w'];
    if (!localStorage.getItem('ems-textbook-v1')) localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await showUnit(page, 'consumer');
  await page.locator('[data-testid=path-lesson][data-lesson="cs-s1"]').click();
  await expect(page.getByTestId('theory-notice')).toBeVisible();
  // пункт владельца 18.11: вместо непонятной «Теория уже была в уроке» — три ясных действия
  await expect(page.getByTestId('theory-notice')).toContainText('Можно прочитать его сейчас — или начать урок сразу');
  await expect(page.getByTestId('theory-open')).toHaveText('Открыть теорию');
  await expect(page.getByTestId('theory-notice').getByTestId('lesson-start')).toHaveText('Начать урок');
  await expect(page.getByTestId('theory-known')).toHaveText('Я знаю эту тему — не напоминать');
  await expect(page.getByTestId('theory-notice')).not.toContainText('уже была в уроке');
  await page.getByTestId('theory-open').click();
  await expect(page.getByTestId('learn-book')).toBeVisible();
  const nav = page.getByTestId('bottom-nav');
  await expect(nav.locator('[data-tab="book"]')).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('[data-tab="path"]')).not.toHaveAttribute('aria-current', 'page');
  await nav.locator('[data-tab="path"]').click();
  await expect(page.getByTestId('learn-book')).toHaveCount(0);
  await expect(page.getByTestId('path')).toBeVisible();
  await expect(nav.locator('[data-tab="path"]')).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});

test('учебник: калькулятор по полям а → б → в, решённые задачи свёрнуты, «Задачи» — к текущей, «назад» закреплён, «Учебник» ещё раз — оглавление', async ({ page }) => {
  const { errors } = await openApp(page);
  await openBook(page);
  await page.getByTestId('textbook').getByRole('button', { name: /Совершенная конкуренция и монополия/ }).click();
  const ch = page.getByTestId('chapter');
  const pr = ch.locator('[data-problem="pc-basic"]');
  await pr.scrollIntoViewIfNeeded();
  await pr.getByTestId('tb-calc-open').click();
  // результат калькулятора идёт в поля по очереди: а), потом б), потом в)
  const calc = pr.getByTestId('tb-calc');
  for (const [expr, field] of [['20/2', 'а)'], ['30*10', 'б)'], ['4*10', 'в)']]) {
    await expect(pr.getByTestId('tb-calc-use')).toHaveText(`В ответ ${field}`);
    await calc.getByRole('textbox', { name: 'Выражение для калькулятора' }).fill(expr);
    await pr.getByTestId('tb-calc-use').click();
  }
  const fields = pr.getByRole('textbox', { name: /шаг/ });
  await expect(fields.nth(0)).toHaveValue('10');
  await expect(fields.nth(1)).toHaveValue('300');
  await expect(fields.nth(2)).toHaveValue('40');
  // поле можно выбрать и вручную
  await pr.locator('[data-testid="tb-calc-target"][data-target="0"]').click();
  await expect(pr.getByTestId('tb-calc-use')).toHaveText('В ответ а)');
  await pr.getByRole('button', { name: 'Уверен', exact: true }).click();
  await pr.getByRole('button', { name: 'Проверить' }).click();
  await expect(pr.getByTestId('tb-verdict')).toContainText('Верно');
  await expect(pr).toHaveAttribute('data-solved', 'true');
  await expect(pr.getByTestId('tb-solved-chip')).toContainText('Решена');

  // «назад» закреплён сверху: из глубины главы он на виду; стрелка «наверх» — к началу главы
  await page.mouse.wheel(0, 2500);
  await expect(page.getByTestId('tb-topbar')).toBeInViewport();
  await expect(page.getByTestId('tb-to-top')).toBeVisible();
  const readY = await page.evaluate(() => window.scrollY);
  await page.getByTestId('tb-to-top').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(page.getByTestId('tb-to-top')).toHaveCount(0);
  // наверху — стрелка вниз: обратно туда, где читали (пункт владельца 09.11)
  await expect(page.getByTestId('tb-back-down')).toBeVisible();
  await page.getByTestId('tb-back-down').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(readY - 40);
  await expect(page.getByTestId('tb-back-down')).toHaveCount(0);
  await expect(page.getByTestId('tb-to-top')).toBeVisible();
  // сами пролистали вниз после «Наверх» — стрелка вниз пропадает
  await page.getByTestId('tb-to-top').click();
  await expect(page.getByTestId('tb-back-down')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await page.mouse.wheel(0, 2500);
  await expect(page.getByTestId('tb-back-down')).toHaveCount(0);
  // повторное нажатие на «Учебник» — на главную страницу учебника
  await page.getByTestId('bottom-nav').locator('[data-tab="book"]').click();
  await expect(page.getByTestId('textbook')).toBeVisible();
  await expect(page.getByTestId('chapter')).toHaveCount(0);

  // решённая задача свёрнута в строку «решена»; «Задачи» в оглавлении главы — к текущей задаче
  await page.getByTestId('textbook').getByRole('button', { name: /Совершенная конкуренция и монополия/ }).click();
  const done = ch.locator('[data-problem="pc-basic"]');
  await expect(done).toHaveAttribute('data-collapsed', 'true');
  await expect(done).toContainText('решена');
  // решённая — заметна: зелёная кайма и отметка; в оглавлении главы — «решено N из M»
  await expect(done).toHaveAttribute('data-solved', 'true');
  await expect(done.locator('.tb-solved-mark')).toBeVisible();
  await expect(ch.getByTestId('tb-secnav-solved')).toContainText(/решено [1-9]\d* из \d+/);
  await ch.getByTestId('tb-sections').getByRole('button', { name: 'Задачи' }).click();
  const curId = await ch.locator('[data-testid="tb-problem"]:not([data-collapsed="true"])').first().getAttribute('data-problem');
  await expect(ch.locator(`[data-problem="${curId}"]`)).toBeInViewport();
  await done.getByTestId('tb-problem-expand').click();
  await expect(done).not.toHaveAttribute('data-collapsed', 'true');
  await expect(done.getByRole('textbox').first()).toBeVisible();
  // развёрнутую — и свернуть обратно: кнопкой вверху карточки и внизу, у «Решения»
  // сворачивается плавно: карточка складывается по высоте в строку, а не пропадает мгновенно
  // (запоминаем вызовы animate — сама анимация короче, чем проверка на загруженной машине)
  await done.evaluate((el) => { const orig = el.animate.bind(el); el.dataset.fold = ''; el.animate = (k, o) => { if (k.some((f) => f.height)) el.dataset.fold = `${k[0].height}>${k[k.length - 1].height}`; return orig(k, o); }; });
  await done.getByTestId('tb-problem-collapse').click();
  await expect(done).toHaveAttribute('data-collapsed', 'true');
  const fold = (await done.getAttribute('data-fold')).match(/^(\d+)px>(\d+)px$/);
  expect(Number(fold[1])).toBeGreaterThan(Number(fold[2]) + 100);
  await expect.poll(() => done.evaluate((el) => el.getAnimations().length === 0 && el.style.overflow === '')).toBe(true);
  await done.getByTestId('tb-problem-expand').click();
  await done.getByTestId('tb-problem-collapse-bottom').click();
  await expect(done).toHaveAttribute('data-collapsed', 'true');
  await expect(done).toBeInViewport();
  // и нерешённую можно свернуть — отложить на потом: строка говорит «не решена», без зелёной отметки
  const todo = ch.locator(`[data-problem="${curId}"]`);
  await todo.getByTestId('tb-problem-collapse').click();
  await expect(todo).toHaveAttribute('data-collapsed', 'true');
  await expect(todo).not.toHaveAttribute('data-solved', 'true');
  await expect(todo).toContainText(/не решена|была ошибка/);
  await todo.getByTestId('tb-problem-expand').click();
  await expect(todo.getByRole('button', { name: /Проверить/ }).first()).toBeVisible();
  // «назад» в верхней панели — из главы в оглавление
  await page.getByTestId('tb-topbar').locator('[data-nav="back"]').click();
  await expect(page.getByTestId('textbook')).toBeVisible();
  expect(errors).toEqual([]);
});

test('повторение прочитанного: у вопроса «Вспомните» — флажок «Сообщить об ошибке», как у задач', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 3 * 86400000;
    localStorage.setItem('ems-textbook-v1', JSON.stringify({
      problems: { 'sc-r-oc': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at }, 'sc-oc': { tries: 1, ok: false, box: 0, due: Date.now() - 1000, lastAt: at } },
    }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTasks(page);
  await page.getByTestId('practice-review').click();
  const review = page.getByTestId('review');
  // на ПК повторение — колонкой посередине, как глава, а не во всю ширину (пункт владельца 15.11)
  if (!isMobile) {
    const col = await page.getByTestId('review-page').boundingBox();
    expect(col.width).toBeLessThanOrEqual(861);
    expect(Math.abs(col.x + col.width / 2 - page.viewportSize().width / 2)).toBeLessThan(12);
  }
  const recall = review.locator('[data-testid=review-item][data-item="sc-r-oc"]');
  await expect(recall.getByTestId('tb-recall')).toBeVisible();
  await expect(recall.getByTestId('tb-report')).toHaveCount(1);
  // и у задачи — тоже
  await expect(review.locator('[data-testid=review-item][data-item="sc-oc"]').getByTestId('tb-report')).toHaveCount(1);
  expect(errors).toEqual([]);
});

/* ЧИТАЕМОСТЬ (docs/mechanics.md, «Учебник: чтение главы»; пункт владельца 13.11): на компьютере строка главы — не шире
   75 знаков. Считаются настоящие строки абзацев и пунктов списков (без формул); раньше в строке было 110–119 знаков. */
test('учебник на ПК: строка главы не шире 75 знаков — и при свёрнутом оглавлении, и при крупном тексте', async ({ page, isMobile }) => {
  test.skip(isMobile, 'раскладка ПК');
  const { errors } = await openApp(page, '/book/supply-demand', '{}', { tab: null });
  await expect(page.getByTestId('chapter')).toBeVisible();
  const lineLengths = () => page.evaluate(() => {
    const lens = [];
    document.querySelectorAll('[data-testid=chapter] .tb-ch-main p, [data-testid=chapter] .tb-ch-main li').forEach((el) => {
      if (el.querySelector('.katex')) return;
      const rows = new Map(); const range = document.createRange();
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const n = w.currentNode;
        for (let i = 0; i < n.length; i += 1) {
          range.setStart(n, i); range.setEnd(n, i + 1);
          const rc = range.getClientRects()[0];
          if (rc) { const k = Math.round(rc.top / 4); rows.set(k, (rows.get(k) || 0) + 1); }
        }
      }
      const v = [...rows.values()];
      if (v.length >= 3) lens.push(...v.slice(0, -1)); // последняя строка абзаца короткая — не в счёт
    });
    lens.sort((a, b) => a - b);
    return { n: lens.length, median: lens[Math.floor(lens.length / 2)], max: lens[lens.length - 1] };
  });
  const check = async (name) => {
    await page.waitForTimeout(600);
    const l = await lineLengths();
    expect(l.n, `${name}: строк`).toBeGreaterThan(15);
    expect(l.max, `${name}: самая длинная строка`).toBeLessThanOrEqual(75);
    // и не узкая газетная колонка: в средней строке не меньше 50 знаков
    expect(l.median, `${name}: средняя строка`).toBeGreaterThanOrEqual(50);
  };
  await check('глава');
  // текст крупнее — знаков в строке столько же
  await page.getByRole('button', { name: 'Крупнее текст' }).click();
  await check('крупный текст');
  await page.getByRole('button', { name: 'Мельче текст' }).click();
  // оглавление свёрнуто — колонка текста не расползается
  await page.getByTestId('tb-ch-grid').getByRole('button', { name: /Свернуть/ }).first().click();
  await expect(page.getByTestId('tb-ch-grid')).toHaveAttribute('data-folded', 'true');
  await check('оглавление свёрнуто');
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

// учебник на широком ПК: поля по бокам от учебника — черновик; сам учебник не рисуется (отчёт mvfapopm)
test('учебник на широком ПК: черновик на полях, учебник не закрывает', async ({ page, isMobile }) => {
  test.skip(isMobile, 'черновик — только с мышью на широком экране');
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTab(page, 'book');
  // 1440 px: учебник занимает почти всю ширину — полей для записей нет
  await expect(page.getByTestId('sketch-dock')).toHaveCount(0);
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.getByTestId('textbook').getByRole('button', { name: /Инфляция/ }).first().click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'inflation');
  const canvas = page.getByTestId('sketch-canvas');
  await page.getByTestId('sketch-toggle').click();
  await expect(page.getByTestId('sketch-toggle')).toHaveAttribute('aria-checked', 'true');
  await page.mouse.move(120, 300); await page.mouse.down(); await page.mouse.move(280, 340, { steps: 10 }); await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-strokes', '1');
  // справа от учебника — тоже поле
  await page.mouse.move(1700, 400); await page.mouse.down(); await page.mouse.move(1820, 460, { steps: 8 }); await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  // прокрутка не перерисовывает черновик каждый кадр: в пределах запаса (полэкрана) холст только сдвигается,
  // запись едет вместе со страницей; ушли дальше — одна перерисовка, вернулись — запись на прежнем месте
  const inkAt = (x, y) => canvas.evaluate((c, [px, py]) => {
    const b = c.getBoundingClientRect(); const k = c.width / b.width;
    const d = c.getContext('2d').getImageData(Math.round((px - b.left) * k) - 3, Math.round((py - b.top) * k) - 3, 7, 7).data;
    let a = 0; for (let i = 3; i < d.length; i += 4) a = Math.max(a, d[i]);
    return a;
  }, [x, y]);
  const y0 = await page.evaluate(() => window.scrollY);
  expect(await inkAt(200, 320)).toBeGreaterThan(0);
  const paints = Number(await canvas.getAttribute('data-paints'));
  await page.evaluate((y) => window.scrollTo(0, y + 150), y0);
  await expect.poll(() => canvas.evaluate((c) => c.style.transform)).toContain('-150px');
  expect(await inkAt(200, 170)).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-paints'))).toBe(paints);
  await page.evaluate((y) => window.scrollTo(0, y + 1600), y0);
  await expect.poll(async () => Number(await canvas.getAttribute('data-paints'))).toBeGreaterThan(paints);
  await page.evaluate((y) => window.scrollTo(0, y), y0);
  await expect.poll(() => inkAt(200, 320)).toBeGreaterThan(0);
  // по тексту главы — не рисует: учебник работает как обычно
  const main = page.locator('.tb-ch-main');
  const box = await main.boundingBox();
  await page.mouse.move(box.x + 200, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 400, box.y + 80, { steps: 8 }); await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  // в режиме рисования оглавление сбоку плавно уходит — места для записей больше
  await expect(page.getByTestId('tb-side-toc')).toBeHidden();
  // черновик выключили — оглавление вернулось и работает: нажатие открывает главу, записи на полях целы
  await page.getByTestId('sketch-toggle').click();
  await expect(page.getByTestId('sketch-toggle')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('tb-side-toc')).toBeVisible();
  await page.getByTestId('tb-side-toc').getByRole('button', { name: /Деньги и банки/ }).click();
  await expect(page.getByTestId('chapter')).toHaveAttribute('data-chapter', 'money-banks');
  await expect(canvas).toHaveAttribute('data-strokes', '2');
  expect(errors).toEqual([]);
});

// пункт владельца 15.11: «в учебнике, когда включаешь черновик, тебя кидает далеко вверх с лагами, а выключаешь — вниз»
test('учебник: включили и выключили черновик — место, которое читали, остаётся на экране', async ({ page, isMobile }) => {
  test.skip(isMobile, 'черновик в учебнике — на широком экране с мышью');
  await withTestFlag(page);
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openTab(page, 'book');
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.getByTestId('textbook').getByRole('button', { name: /Инфляция/ }).first().click();
  const ch = page.getByTestId('chapter');
  await expect(ch).toHaveAttribute('data-chapter', 'inflation');
  // читаем середину главы: запоминаем заголовок раздела у верха экрана
  const h = ch.locator('.tb-ch-main h2').nth(2);
  await h.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140));
  await page.waitForTimeout(300);
  const topOf = () => h.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const before = await topOf();
  for (const state of ['true', 'false']) {
    await page.getByTestId('sketch-toggle').click();
    await expect(page.getByTestId('sketch-toggle')).toHaveAttribute('aria-checked', state);
    await page.waitForTimeout(1000);
    // раньше заголовок уезжал на сотни пикселей — за экран
    expect(Math.abs(await topOf() - before), `черновик ${state}`).toBeLessThan(24);
  }
  expect(errors).toEqual([]);
});

test('учебник из гайда юнита: черновик на полях есть и там', async ({ page, isMobile }) => {
  test.skip(isMobile, 'черновик в учебнике — на широком экране с мышью');
  await page.setViewportSize({ width: 1600, height: 950 });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.getByTestId('unit-guide').first().click();
  await expect(page.locator('.ln-book .ln-textbook')).toBeVisible();
  await expect(page.getByTestId('sketch-toggle')).toBeVisible();
  expect(errors).toEqual([]);
});

/* Подписи на графике рынка труда не налезают друг на друга (жалобы 02.11): «безработица» у минимальной
   зарплаты — над отрезком, а не на подписи точки E */
test('график рынка труда: подпись «безработица» не ложится на точку E', async ({ page }) => {
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await openBook(page);
  await page.getByTestId('textbook').locator('[data-chapter="labor"]').first().click();
  const chart = page.locator('[data-chart="labor"]').first();
  await chart.scrollIntoViewIfNeeded();
  // буквы осей — словами под графиком (жалоба mvz29zos: «обозначения w и L и никакого объяснения»)
  await expect(chart.getByTestId('chart-axes')).toHaveText('L — число работников, чел. · w — зарплата за смену, кр.');
  await chart.getByRole('slider', { name: 'Минимальная зарплата' }).fill('220');
  const seg = chart.locator('text[data-seg-side]');
  await expect(seg).toHaveText('безработица');
  await expect(seg).toHaveAttribute('data-seg-side', 'above');
  // график доезжает плавно — меряем, когда кривые и подписи встали на место
  await page.waitForTimeout(900);
  const boxes = await chart.locator('svg text').evaluateAll((els) => els.map((e) => ({ t: e.textContent, b: e.getBoundingClientRect().toJSON() })));
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const u = boxes.find((x) => x.t === 'безработица'); const e = boxes.find((x) => x.t === 'E');
  expect(hit(u.b, e.b)).toBe(false);
  expect(errors).toEqual([]);
});

// пункт владельца 18.11: «разбор графика не меняется; когда открываешь на весь экран — стиль урока исчезает»
test('«Разбор графика» на весь экран: плоскость текущего шага — его текст, выделенные кривые и ползунки; тема урока остаётся', async ({ page }) => {
  test.setTimeout(120000);
  await withTestFlag(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('ems-textbook-v1')) return;
    const at = Date.now() - 86400000;
    const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2'];
    localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])), owned: { 'theme-exchange': at }, wear: { theme: 'theme-exchange', at } } }));
  });
  const { errors } = await openApp(page, '/', '{}', { tab: 'path' });
  await page.locator('[data-testid=path-extra][data-id="graph-ppf"]').click();
  await page.getByTestId('extra-start').click();
  const g = page.getByTestId('graph-lesson');
  await g.getByTestId('graph-next').click();
  const stepText = (await g.getByTestId('graph-text').textContent()).replace(/^Шаг \d+ из \d+/, '').trim().slice(0, 30);
  await g.getByTestId('graph-full').click();
  const pv = page.getByTestId('plane-view');
  await expect(pv).toBeVisible();
  await expect(pv).toContainText('шаг 2 из');
  await expect(pv.getByTestId('plane-caption')).toContainText(stepText.slice(0, 20));
  await expect(pv).toHaveAttribute('data-skin', 'exchange');
  expect(await pv.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(6, 20, 13)');
  await expect(pv.getByTestId('plane-curve').first()).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(pv).toHaveCount(0);
  await expect(g).toBeVisible();
  expect(errors).toEqual([]);
});

