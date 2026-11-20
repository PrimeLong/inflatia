import { test, expect } from '@playwright/test';
import { openApp, installHooks, startLesson, answerExercise } from './helpers.js';
installHooks();
const S = '/tmp/claude-0/-home-user-my-site/4f5fd3bd-661b-59b3-9889-1bf10e39d566/scratchpad/walk/';
for (const [lesson, want] of [['sc-l3', 'снаружи её КПВ'], ['hh-l2', 'Соедините'], ['hh-i1', 'Шаг дальше']]) {
  test(`walk ${lesson}`, async ({ page }) => {
    test.setTimeout(240000);
    await page.addInitScript(() => { if (localStorage.getItem('ems-textbook-v1')) return; const at = Date.now() - 86400000;
      const ids = ['sc-i1', 'sc-i1b', 'sc-l1', 'sc-l2', 'sc-i2', 'sc-l3', 'sc-l4', 'sc-l5', 'sc-l6', 'sc-w', 'sc-s1', 'sc-radio', 'sc-g', 'sc-rev', 'sc-sum', 'lm-i1', 'lm-l1', 'lm-i2', 'lm-l2', 'lm-w', 'lm-s1', 'lm-radio', 'lm-g', 'lm-rev', 'lm-sum', 'hh-i1', 'hh-l1', 'hh-i2', 'hh-l2'];
      localStorage.setItem('ems-textbook-v1', JSON.stringify({ learn: { lessons: Object.fromEntries(ids.map((id) => [id, { at, runs: 1, best: 90 }])) } })); });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openApp(page, '/', '{}', { tab: 'path' });
    await startLesson(page, lesson, /Начать|Повторить|Пройти/);
    let shots = 0;
    for (let i = 0; i < 80 && shots < 3; i += 1) {
      if (await page.getByTestId('lesson-result').isVisible()) break;
      const card = page.getByTestId('lesson-card');
      if (await card.isVisible()) {
        const txt = await page.getByTestId('lesson').innerText();
        if (txt.includes(want)) { await page.screenshot({ path: `${S}${lesson}-${i}.png` }); shots += 1; }
        const deeper = page.getByRole('button', { name: /Шаг дальше/ });
        if (lesson === 'hh-i1' && await deeper.isVisible().catch(() => false)) { await deeper.first().click(); await page.waitForTimeout(500); await page.screenshot({ path: `${S}${lesson}-deep-${i}.png` }); shots += 1; }
        await page.getByTestId('lesson').locator('.ln-foot button').last().click(); await page.waitForTimeout(250);
        continue;
      }
      const ex = page.getByTestId('ex');
      if (!(await ex.isVisible())) { await page.waitForTimeout(300); continue; }
      const t = await ex.innerText();
      if (t.includes(want)) { await page.screenshot({ path: `${S}${lesson}-ex-${i}.png` }); shots += 1; }
      await answerExercise(page, { wrong: false }).catch(() => {});
      const next = page.getByRole('button', { name: 'Дальше', exact: true });
      if (await next.isVisible().catch(() => false)) await next.click();
      await page.waitForTimeout(200);
    }
  });
}
