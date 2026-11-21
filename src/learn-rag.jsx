/* Тряпка-микрофибра: курсор в «Пыльной витрине» (src/learn-dust.jsx) и значок улучшения «Микрофибра» на вкладке
   «Протереть» лавки (src/learn-shop.jsx). Рядом — значки двух других улучшений витрины, в том же рисунке (пункт
   владельца 21.11, п. 7: у полироли был голый значок-звёздочка, растянутый на всю клетку и вплотную к тексту). */
import React from 'react';

export const Rag = () => (
  <svg viewBox="0 0 60 46" width="60" height="46" aria-hidden="true">
    <path d="M6 12 Q3 4 12 4 L46 3 Q57 3 56 13 L55 33 Q55 43 45 42 L13 43 Q4 43 5 33 Z" fill="#3B8DB0" />
    <path d="M10 10 L50 9 L49 36 L12 37 Z" fill="none" stroke="#9FD3E8" strokeWidth="1.2" strokeDasharray="3 2.5" opacity=".8" />
    <path d="M14 18 Q28 13 46 17 M13 27 Q30 23 47 28" fill="none" stroke="#2A6F8E" strokeWidth="2.2" strokeLinecap="round" opacity=".7" />
    <path d="M8 13 Q10 7 18 7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
  </svg>
);

// «Полироль»: флакон с распылителем и блик
export const PolishBottle = () => (
  <svg viewBox="0 0 60 46" width="60" height="46" aria-hidden="true">
    <rect x="4" y="4" width="52" height="38" rx="10" fill="#7A5BD8" opacity=".16" />
    <path d="M24 9 H34 V14 H24 Z" fill="#5B4AA8" />
    <path d="M34 10 H41 L43 12 H34 Z" fill="#5B4AA8" />
    <path d="M22 14 H36 Q39 14 39 17 L40 37 Q40 40 37 40 H21 Q18 40 18 37 L19 17 Q19 14 22 14 Z" fill="#8F74E6" />
    <rect x="22" y="22" width="14" height="9" rx="2" fill="#F4EEFF" />
    <path d="M23.5 26.5 H34.5" stroke="#8F74E6" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M21.5 17.5 Q22 16 24 16" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
    <path d="M48 9 l1.3 3.2 l3.2 1.3 l-3.2 1.3 l-1.3 3.2 l-1.3 -3.2 l-3.2 -1.3 l3.2 -1.3 z" fill="#F3C553" />
    <path d="M51 22 l.8 1.9 l1.9 .8 l-1.9 .8 l-.8 1.9 l-.8 -1.9 l-1.9 -.8 l1.9 -.8 z" fill="#F3C553" opacity=".8" />
  </svg>
);
// «Журнал уборки»: тетрадь с галочками дней
export const CleanLog = () => (
  <svg viewBox="0 0 60 46" width="60" height="46" aria-hidden="true">
    <rect x="4" y="4" width="52" height="38" rx="10" fill="#2E8A5B" opacity=".14" />
    <rect x="15" y="7" width="30" height="33" rx="3" fill="#FFFDF6" stroke="#2E6B4E" strokeWidth="1.6" />
    <path d="M15 7 V40" stroke="#2E6B4E" strokeWidth="3" />
    <path d="M21 15 H40 M21 23 H40 M21 31 H40" stroke="#C9D9CF" strokeWidth="1.2" />
    <path d="M22 13.5 l2 2 l3.4 -3.6 M22 21.5 l2 2 l3.4 -3.6 M22 29.5 l2 2 l3.4 -3.6" fill="none" stroke="#2E8A5B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
