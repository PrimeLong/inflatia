/* Молния «верно подряд» в шапке урока — общая для обычного урока (src/learn-lesson.jsx) и особых уроков
   (src/learn-special.jsx): одна и та же молния, с третьего верного ответа подряд. Стили — .ln-fire в src/learn.jsx. */
import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { XP } from './textbook/learn-state.js';

/* Верные ответы подряд — молния в шапке урока (огонёк — только серия дней, docs/mechanics.md, «Экономика
   наград»). С третьего верного подряд: «⚡ 3» — значок и число, без подписи; серия бессрочная. Каждый новый верный ответ раздувает число и
   выпускает «+1» (опыт за верные подряд); на 5, 10, 15… — вспышка искр. Ошибка — молния сереет, качается и
   гаснет. plus — показывать «+1» (на повторе урока опыт почти не идёт). */
export function StreakFlame({ n, plus = true }) {
  const [gone, setGone] = useState(0);
  /* «+1» и искры — только когда серия выросла за ответ в этом уроке: урок, открытый с уже идущей серией дня,
     показывает молнию с числом без «+1» (раньше «+1» выпрыгивал при открытии урока) */
  const [grewTo, setGrewTo] = useState(null);
  const prev = useRef(n);
  useEffect(() => {
    const was = prev.current; prev.current = n;
    if (n > was) setGrewTo(n);
    if (was >= XP.streakFrom && n === 0) { setGone(was); const t = setTimeout(() => setGone(0), 900); return () => clearTimeout(t); }
    return undefined;
  }, [n]);
  const on = n >= XP.streakFrom;
  if (!on && !gone) return null;
  const shown = on ? n : gone;
  const grew = grewTo === n;
  const milestone = on && grew && n % 5 === 0;
  return (
    <span className={`ln-fire${on ? '' : ' out'}${milestone ? ' big' : ''}`} data-testid="lesson-streak" data-streak={shown} role="status" aria-label={`${shown} подряд верно`}>
      <Zap size={15} className="ln-fire-ic" aria-hidden="true" />
      <b key={shown}>{shown}</b>
      {on && plus && grew && <span key={`p${n}`} className="ln-fire-plus" data-testid="lesson-streak-plus" aria-hidden="true">+1</span>}
      {milestone && <span key={`s${n}`} className="ln-fire-sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` }} />)}</span>}
    </span>
  );
}
