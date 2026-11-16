/* Миниатюра живой модели — две линии и точка: строка «Рынок капучино — покрутите» на Пути и знакомство с моделью.
   Отдельный лёгкий файл: сама модель (src/learn-model.jsx) грузится, когда её раскрывают. */
import React from 'react';

// цвета кривых спроса и предложения — общие с моделью
export const D_INK = '#3E6FA8'; export const S_INK = '#C0602A';

export function ModelThumb({ supply = true, empty = false }) {
  return (
    <svg className="lm-thumb" viewBox="0 0 64 44" width="64" height="44" aria-hidden="true">
      <path d="M6,4 V38 H60" fill="none" stroke="var(--ds-rule2)" strokeWidth="1.5" />
      <path d="M10,8 L56,36" fill="none" stroke={D_INK} strokeWidth="3" strokeLinecap="round" strokeOpacity={empty ? 0.3 : 1} strokeDasharray={empty ? '4 4' : undefined} />
      {supply && <path d="M10,34 L56,10" fill="none" stroke={S_INK} strokeWidth="3" strokeLinecap="round" strokeOpacity={empty ? 0.3 : 1} strokeDasharray={empty ? '4 4' : undefined} />}
      {!empty && supply && <circle cx="33" cy="22" r="3.6" fill="var(--ds-ink)" stroke="var(--ds-card)" strokeWidth="1.2" />}
    </svg>
  );
}
