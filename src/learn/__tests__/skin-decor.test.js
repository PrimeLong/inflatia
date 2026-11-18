/* Жалоба 18.11 (graph-labor, алмаз): «как-то не по теме выглядят кнопки и менюшка шаров Ньютона» — подставка колыбели,
   её рама и «Черновик» берут цвета темы урока. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const skins = readFileSync(new URL('../../learn-skins.jsx', import.meta.url), 'utf8');
const decor = readFileSync(new URL('../../learn-decor.jsx', import.meta.url), 'utf8');

describe('украшения урока в теме', () => {
  it('подставка колыбели, ручка, основание и «Черновик» — в поверхности, линиях и акценте темы', () => {
    for (const sel of ['.ln-cradle-stand', '.ln-cradle-grip i', '.ln-cradle-base', '.sk-glass', '.sk-dock.on .sk-switch']) {
      expect(skins, sel).toContain(`.sk-on[data-skin] ${sel} {`);
    }
    expect(skins).toMatch(/\.ln-cradle-stand \{ background: var\(--sk-surface\); border-color: var\(--sk-edge\); border-radius: var\(--sk-radius\)/);
  });
  it('рама колыбели рисуется цветом темы (--sk-frame), без темы — чернилами страницы', () => {
    expect(skins).toContain('.sk-on[data-skin] { --sk-frame: var(--sk-accent); }');
    expect(decor).toContain("css(el, '--sk-frame', css(el, '--ds-ink2'");
  });
  // жалоба 18.11 (lm-radio): «чёт не по стилю урока выглядит»
  it('«Слушай» и «История» — шапка эфира, приёмник, реплики, кнопка «слушать» и «в эфире» в цветах темы', () => {
    expect(skins).toContain('.sk-on[data-skin] .fd { --u: var(--sk-accent); --u-ink: var(--sk-accent); }');
    expect(skins).toMatch(/\.fd :is\(\.fd-mast, \.fd-set, \.fd-bubble, \.fd-archive\) \{ background: var\(--sk-surface\)/);
    for (const sel of ['.fd .fd-play', '.fd .fd-onair', '.fd .fd-mast-name']) expect(skins, sel).toContain(`.sk-on[data-skin] ${sel} {`);
  });
});
