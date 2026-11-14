/* «ДАННЫЕ И КОНФИДЕНЦИАЛЬНОСТЬ»: что Инфляция хранит, где, зачем и сколько. Страница
   открывается из регистрации (согласие — галочкой), из профиля и из окна аккаунта. Там же —
   права: скачать свои данные (JSON) и удалить аккаунт со всеми данными. Среди учеников есть
   школьники, поэтому текст — простыми словами, без мелкого шрифта. */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { OperatorBlock, AgeRating } from './legal-block.jsx';

export const PRIVACY_TITLE = 'Данные и конфиденциальность';
// раздел: заголовок и пункты; сроки — те же, что в api/_lib/store.js
export const PRIVACY_SECTIONS = [
  { title: 'Что мы храним', items: [
    'Логин, имя и значок, которые вы выбрали. Почту, телефон и настоящее имя мы не спрашиваем.',
    'Год рождения — без даты и месяца. По нему до 16 лет «Мир» работает в детском режиме, а до 14 лет при регистрации нужен родитель. Год видите только вы.',
    'Отметки о согласиях: когда вы согласились со страницей и на обработку данных; до 14 лет — когда родитель подтвердил регистрацию и его имя.',
    'Пароль — только в виде хэша (scrypt с солью): сам пароль не хранится и никому не виден. Так же — код восстановления.',
    'Прогресс: пройденные уроки, ответы для повторения, серию, монеты, покупки в лавке, сохранения партий, достижения и рекорды.',
    'Сообщения об ошибках, которые вы отправили: текст, упражнение, ваш ответ, версия приложения и данные устройства (браузер и размер экрана).',
    'IP-адрес — только чтобы ограничить частоту регистраций, попыток входа и сообщений. Он хранится как счётчик и стирается через час, с профилем не связывается.',
    'Обезличенные счётчики для улучшения уроков: сколько раз за день нажали «Начать», выбрали цель, начали и прошли первый урок, создали аккаунт, вернулись на следующий день и через неделю; сколько уроков начали и прошли; сколько раз упражнение решили верно с первой попытки; сколько устройств за день открывали «Мир», учебник, лавку, сад, лиги, «Своё дело» и сетевую партию. Без логина, имени и IP-адреса — только числа.',
    'Чтобы не считать одно устройство дважды, браузер помнит у себя (localStorage), какие из этих отметок уже отправлены: «первый урок» — один раз, открытие раздела — раз в день. На сервер эти отметки не уходят.',
  ] },
  { title: 'Где', items: [
    'Сайт и серверные функции работают на Vercel.',
    'Профиль, прогресс и сохранения лежат в базе данных Upstash (Redis).',
    'Физически это дата-центры Vercel и Upstash за пределами России. Регион базы Upstash выбирается при её создании (у Upstash есть регионы в США, Европе и Азии); у Vercel и Upstash нет дата-центров в России.',
    'Часть данных — настройки, прогресс без входа, музыка и тема — хранится только в вашем браузере (localStorage).',
  ] },
  { title: 'Cookie и память браузера', items: [
    'Cookie Инфляция не ставит: ни своих, ни рекламных, ни счётчиков посещений.',
    'В памяти браузера на этом устройстве (localStorage) лежит то, без чего приложение не работает: ключ входа, прогресс до входа в аккаунт, настройки, тема, громкость музыки и отметка, что вы прочитали уведомление о памяти браузера.',
    'Эти записи не уходят третьим лицам и не нужны для рекламы. Стереть их можно, выйдя из аккаунта или очистив данные сайта в настройках браузера.',
  ] },
  { title: 'Зачем', items: [
    'Чтобы прогресс был с вами на любом устройстве, а повторение подбирало то, что пора повторить.',
    'Чтобы место в сетевой партии и рекорды были закреплены за вами.',
    'Чтобы исправлять ошибки в уроках по вашим сообщениям.',
    'В лигах недели ваше имя другим ученикам не показывается: соперники там — боты.',
    'Рекламы нет. Данные не продаются и не передаются третьим лицам, кроме хостинга (Vercel) и базы (Upstash), которые их хранят.',
  ] },
  { title: 'Сколько', items: [
    'Обезличенные счётчики событий — 120 дней, счётчики упражнений — пока упражнение есть в курсе.',
    'Профиль и прогресс — пока вы не удалите аккаунт.',
    'Вход на устройстве и сохранения партий — полгода с последнего использования.',
    'Таблица вызова дня — месяц.',
    'Сообщения об ошибках — пока их не разберут, и не больше двух тысяч последних.',
    'Счётчики с IP-адресом — час.',
  ] },
  { title: 'Ваши права', items: [
    '«Скачать мои данные» в окне аккаунта — всё, что хранится о вашем профиле, одним файлом JSON.',
    '«Удалить аккаунт и все данные» там же — с подтверждением паролем. Удаляются профиль, прогресс, сохранения, рекорды, строки вызова дня и ваши сообщения об ошибках. Отменить удаление нельзя.',
    'Вопросы — через «Сообщить об ошибке» в любом уроке.',
  ] },
  { title: 'Если вам меньше 14 лет', items: [
    'Зарегистрироваться можно только вместе с родителем или другим законным представителем: он читает эту страницу и подтверждает регистрацию отдельным шагом — отметкой и своим именем.',
    'Не указывайте в имени и логине настоящую фамилию, школу и другие сведения о себе.',
  ] },
];

export function PrivacyPage({ onClose }) {
  return (
    <div role="dialog" aria-label={PRIVACY_TITLE} data-testid="privacy"
      style={{ position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto', background: 'var(--ds-paper, #F6F1E6)', color: 'var(--ds-ink, #2A2420)', padding: '12px 16px calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h1 className="ds-h1" style={{ flex: 1, fontSize: 26, margin: 0 }}>{PRIVACY_TITLE}</h1>
          <button type="button" className="ds-iconbtn" aria-label="Закрыть" data-nav="back" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 6 }}><X size={22} /></button>
        </div>
        <p className="ds-sub" style={{ fontSize: 15, lineHeight: 1.5, margin: '0 0 12px' }}>
          Инфляция — учебное приложение. Мы храним только то, без чего оно не работает, и объясняем это простыми словами.
        </p>
        {PRIVACY_SECTIONS.map((s) => (
          <section key={s.title} style={{ margin: '14px 0' }}>
            <h2 className="ds-h3" style={{ margin: '0 0 6px' }}>{s.title}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.5 }}>
              {s.items.map((t) => <li key={t} style={{ margin: '4px 0' }}>{t}</li>)}
            </ul>
          </section>
        ))}
        <OperatorBlock />
        <p className="ds-faint" style={{ fontSize: 13, marginTop: 18 }}>Редакция от 31 октября 2026 года. <AgeRating /></p>
      </div>
    </div>
  );
}

/* Уведомление о памяти браузера: один раз, при первом открытии. Cookie приложение не ставит,
   но вход и прогресс лежат в localStorage — об этом говорим прямо и даём ссылку на страницу
   данных. Нужно ли что-то сверх уведомления — вопрос юристу (docs/legal-todo.md, № 9).
   Где стоит (docs/mechanics.md, «Приветствие и загрузка»): у́же 1024 px — в потоке страницы, полосой
   наверху, и ничего не перекрывает; его высота — в переменной --ems-notice-h на <html>, чтобы приветствие
   заняло оставшуюся высоту экрана. От 1024 px — карточкой в левом нижнем углу. */
export const STORAGE_NOTICE_KEY = 'ems-storage-notice';
const NOTICE_CSS = `
  .ems-storage-notice { position: relative; z-index: 2; box-sizing: border-box; width: 100%; background: #FFFDF6; color: #2A2420; border-bottom: 1px solid #CDBFA3;
    padding: calc(8px + env(safe-area-inset-top)) 14px 8px; font: 13px/1.35 "PT Sans", system-ui, sans-serif; }
  .ems-storage-notice-in { max-width: 520px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
  .ems-storage-notice-text { flex: 1; min-width: 0; }
  .ems-storage-notice button { font: inherit; cursor: pointer; }
  /* «Подробнее» — ссылка в строке текста */
  .ems-storage-notice .ems-sn-more { background: none; border: 0; padding: 0; color: #9A3A08; text-decoration: underline; text-underline-offset: 2px; }
  .ems-storage-notice .ems-sn-ok { flex: none; min-height: 44px; background: #C2490B; border: 1px solid #C2490B; border-radius: 10px; padding: 7px 16px; font-weight: 700; font-size: 14px; color: #fff; }
  @media (min-width: 1024px) {
    .ems-storage-notice { position: fixed; left: 24px; bottom: 24px; z-index: 300; width: auto; max-width: 380px; border: 1px solid #CDBFA3; border-radius: 8px;
      box-shadow: 0 6px 22px rgba(40,30,15,.22); padding: 12px 14px; font-size: 14px; line-height: 1.45; }
    .ems-storage-notice-in { flex-direction: column; align-items: flex-end; gap: 10px; }
    .ems-storage-notice .ems-sn-ok { min-height: 0; }
  }
`;
export function StorageNotice() {
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem(STORAGE_NOTICE_KEY); } catch { return true; } });
  const [more, setMore] = useState(false);
  const box = useRef(null);
  // высота полосы — странице: приветствие занимает остаток экрана (на ПК полоса не в потоке — ноль)
  useLayoutEffect(() => {
    const root = document.documentElement; const el = box.current;
    const set = () => {
      const inFlow = el && getComputedStyle(el).position !== 'fixed';
      root.style.setProperty('--ems-notice-h', `${inFlow ? Math.ceil(el.getBoundingClientRect().height) : 0}px`);
    };
    if (!el) { root.style.removeProperty('--ems-notice-h'); return undefined; }
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', set);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', set); root.style.removeProperty('--ems-notice-h'); };
  }, [hidden]);
  if (hidden) return null;
  const ok = () => { try { localStorage.setItem(STORAGE_NOTICE_KEY, String(Date.now())); } catch { /* приватный режим */ } setHidden(true); };
  return (
    <>
      <style>{NOTICE_CSS}</style>
      <div ref={box} role="region" aria-label="Память браузера" data-testid="storage-notice" className="ems-storage-notice">
        <div className="ems-storage-notice-in">
          <div className="ems-storage-notice-text">
            <b>Cookie мы не используем.</b> Вход и прогресс хранятся в памяти браузера на этом устройстве — без рекламы и слежки.{' '}
            <button type="button" className="ems-sn-more" data-testid="storage-notice-more" onClick={() => setMore(true)}>Подробнее</button>
          </div>
          <button type="button" className="ems-sn-ok" data-testid="storage-notice-ok" onClick={ok}>Понятно</button>
        </div>
      </div>
      {more && <PrivacyPage onClose={() => setMore(false)} />}
    </>
  );
}
