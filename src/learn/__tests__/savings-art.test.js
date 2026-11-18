/* Пункт владельца 18.11: «чёт странная картинка у юнита Сберкассы» — копилка налезала на окно, монета — на углы окон.
   Новая гравюра: колонны на ступенях, копилка с монетой — на фронтоне, ничего не перекрывается, всё стоит на земле (y = 82). */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('гравюра Сберкассы', () => {
  it('копилка — на фронтоне, не пересекается с колоннами и дверью; четыре колонны; ничего ниже земли', async () => {
    const { Engraving } = await import('../../ds-art.jsx');
    const svg = renderToStaticMarkup(React.createElement(Engraving, { kind: 'savings', alive: true }));
    const piggy = svg.match(/<g data-part="piggy">(.*?)<\/g>/)[1];
    const nums = (re, str) => [...str.matchAll(re)].map((m) => Number(m[1]));
    // копилка целиком между y 17 и 39 (фронтон)
    const ys = [...nums(/cy="([\d.]+)"/g, piggy)];
    ys.forEach((y) => { expect(y).toBeGreaterThan(17); expect(y).toBeLessThan(39); });
    expect((svg.match(/data-part="column"/g) || []).length).toBe(4);
    // всё — выше земли
    nums(/ y="([\d.]+)"/g, svg).forEach((y) => expect(y).toBeLessThanOrEqual(82));
    // старой копилки у окна (эллипс на y 70) больше нет
    expect(svg).not.toMatch(/cy="70"/);
  });
});
