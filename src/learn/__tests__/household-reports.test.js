/* Жалобы учеников 17.11 по юниту «Сберкасса»: «почему за месяц — доход может быть и за год, и за день»; «не было сказано про
   округление» (hh-s1-cut: 4,8462, а ответ — 5 месяцев); «первая реплика истории не по теме» (hh-s1). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChapter, collectBlocks } from '../../textbook/markdown.js';
import { equilibrium } from '../course.js';

const md = readFileSync(new URL('../../textbook/chapters/household.md', import.meta.url), 'utf8');
const block = (id) => { const i = md.indexOf(`id=${id}`); return md.slice(i, md.indexOf('\n:::', i)); };

describe('«Сберкасса»: тексты после жалоб учеников', () => {
  it('доход, расходы и бюджет — «за период», а не только «за месяц»', () => {
    const words = block('hh-w');
    expect(words).toMatch(/income: все деньги, \/ которые приходят \/ за период/);
    expect(words).toMatch(/expenses: все деньги, \/ которые уходят \/ за период/);
    expect(words).toMatch(/hbudget: план \/ доходов и расходов \/ на период/);
    expect(block('hh-e1-match')).not.toMatch(/за месяц/);
  });
  it('задача про телефон прямо говорит, что ответ — целое число месяцев и почему пятый', () => {
    const t = block('hh-s1-cut');
    expect(t).toMatch(/полных месяцев/);
    expect(t).toMatch(/нужен ещё один месяц/);
    expect(t).toMatch(/5200/);
  });
  it('первая реплика истории — про доход, расходы и накопление, а не «ничего не есть»', () => {
    const t = block('hh-s1');
    expect(t).toMatch(/доход/); expect(t).toMatch(/копить/);
    expect(t).not.toMatch(/ничего не есть/);
  });

  // жалоба 18.11 (hh-g, rush): «самый обычный дефолтный график, а не тот, что разбирается в разборе»
  it('мини-игра про процент: на графике — процент и вклады с кредитами, а не «P, цена» и «Q, количество»; равновесие — правдоподобный процент', () => {
    const [round] = collectBlocks(parseChapter(md), (b) => b.type === 'round' && b.id === 'hh-g-rate');
    expect(round.names).toEqual({ x: 'деньги в долг, тыс. кр.', y: 'процент, %', d: 'кредиты', s: 'вклады', unit: '%' });
    const e = equilibrium(round.market);
    expect(e.p).toBeGreaterThanOrEqual(3); expect(e.p).toBeLessThanOrEqual(15);
  });
});
