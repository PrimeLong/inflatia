import { useEffect, useRef } from 'react';
import MacroSimulator from './MacroSimulator.jsx';
import { StorageNotice } from './privacy.jsx';

/* «К содержимому» — первая остановка клавиатуры: фокус сразу в область main, мимо уведомления и панелей.
   Не якорь (#main): якорь — запись истории, а история занята экранами (src/lib/route.js). */
const toMain = (e) => {
  e.preventDefault();
  const m = document.querySelector('main');
  if (m) { m.focus({ preventScroll: true }); m.scrollIntoView({ block: 'start' }); }
};

export default function App() {
  const skip = useRef(null);
  /* Первое нажатие Tab после загрузки, пока фокус нигде не стоит, — на ссылку «К содержимому». Сам браузер на
     прокрученной странице (Путь открывается на текущем уроке) начинает обход с того, что на экране, и ссылку
     наверху пропускает. Кто уже нажимал мышью или пальцем — тому обход с места нажатия, как обычно. */
  useEffect(() => {
    let armed = true;
    const off = () => { armed = false; };
    const onKey = (e) => {
      if (!armed || e.key !== 'Tab') return;
      armed = false;
      if (e.shiftKey || !skip.current || (document.activeElement && document.activeElement !== document.body)) return;
      e.preventDefault();
      skip.current.focus();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', off, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', off, true); };
  }, []);
  return (
    <>
      <a className="ems-skip" href="#main" data-testid="skip-link" ref={skip} onClick={toMain}>К содержимому</a>
      {/* уведомление о памяти браузера — до приложения: на телефоне оно в потоке страницы, полосой наверху */}
      <StorageNotice />
      <MacroSimulator />
    </>
  );
}
