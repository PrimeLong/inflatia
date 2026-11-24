/* УДЕРЖАНИЕ КЛАВИШИ — повтор, как на клавиатуре (пункт владельца 24.11, п. 11: «зажать в калькуляторе удаление — и он всё
   бы начал удалять»). Нажатие срабатывает сразу; держат дольше HOLD_DELAY — повторяется каждые HOLD_EVERY мс, пока палец или
   кнопка мыши не отпущены и указатель на клавише. Щелчок с клавиатуры (Enter, пробел) — одно нажатие, как раньше. */
import { useEffect, useRef } from 'react';

export const HOLD_DELAY = 450;
export const HOLD_EVERY = 70;

export function useHoldRepeat(fn, { delay = HOLD_DELAY, every = HOLD_EVERY } = {}) {
  const timer = useRef(0); const tick = useRef(0); const fnRef = useRef(fn);
  fnRef.current = fn;
  const stop = () => { window.clearTimeout(timer.current); window.clearInterval(tick.current); timer.current = 0; tick.current = 0; };
  useEffect(() => stop, []);
  return {
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      stop();
      fnRef.current();
      timer.current = window.setTimeout(() => { tick.current = window.setInterval(() => fnRef.current(), every); }, delay);
    },
    onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
    // мышь и палец уже нажали в pointerdown; клавиатура (detail 0) — одно нажатие
    onClick: (e) => { if (e.detail === 0) fnRef.current(); },
    onContextMenu: (e) => e.preventDefault(),
  };
}
