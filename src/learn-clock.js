/* Часы особых уроков («Персоналии», «Чтение», «Разбор графика», «Нарисуй сам») — те же, что у обычного урока
   (src/learn/active-time.js): считают только время, когда вкладка видна и ученик недавно что-то делал.
   Раньше особые уроки мерили время по стене: открыл «Чтение», выключил телефон — на итогах «58 минут»
   (пункт владельца 15.11). Хук отдаёт функцию: сколько активных миллисекунд набралось к этому моменту. */
import { useEffect, useRef } from 'react';
import { activeClock, tickClock, actClock } from './learn/active-time.js';

// base — уже набранное время (особый урок продолжили с места)
export function useActiveMs(base = 0) {
  const clock = useRef(null);
  if (!clock.current) clock.current = activeClock(Date.now(), base);
  const read = useRef(null);
  if (!read.current) {
    const visible = () => typeof document === 'undefined' || !document.hidden;
    read.current = () => { clock.current = tickClock(clock.current, Date.now(), visible()); return clock.current.ms; };
  }
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const visible = () => !document.hidden;
    const act = () => { clock.current = actClock(clock.current, Date.now(), visible()); };
    const vis = () => { clock.current = tickClock(clock.current, Date.now(), visible()); };
    const id = setInterval(vis, 1000);
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, act, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); evs.forEach((e) => window.removeEventListener(e, act, { capture: true })); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return read.current;
}
