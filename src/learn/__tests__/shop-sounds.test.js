/* Замечание владельца 18.11, вечер, п. 6: «странно, что есть звук, когда в лавке жмёшь по нажатым кнопкам, типа лавка
   сверху» — уже выбранный переключатель (Лавка / Сад, отдел, место в гардеробе, вид вклада, «Без вещи», цель) молчит. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const shop = readFileSync(new URL('../../learn-shop.jsx', import.meta.url), 'utf8');
const rewards = readFileSync(new URL('../../learn-rewards.jsx', import.meta.url), 'utf8');

describe('лавка: нажатие на уже выбранное — без звука', () => {
  it('«Лавка / Сад» сверху, отделы, места гардероба, вид вклада, «Без вещи» — звук только при смене', () => {
    expect(shop).toContain("onView={(v) => { if (v === view) return; Audio.play('paper');");
    expect(shop).toContain("onClick={() => { if (tab !== t.id) { Audio.play('paper'); setTab(t.id); } }}");
    expect(shop).toContain("onClick={() => { if (slot === k) return; Audio.play('tick'); setSlot(k); }}");
    expect(shop).toContain("onClick={() => { if (!topup) return; Audio.play('tick'); setTopup(false); }}");
    expect(shop).toContain("onClick={() => { if (topup) return; Audio.play('tick'); setTopup(true); }}");
    expect(shop).toContain("onClick={() => { if (wear[slot]) onWear(slot, null); }}");
  });
  it('цель в профиле: та же — без звука', () => {
    expect(rewards).toContain("onClick={() => { if (p.goal === g) return; Audio.play('tick');");
  });
});
