/* ПЕРВЫЙ ЗАПУСК И ВХОД. Приветствие с Инфлей (три обещания и мини-задача) → «Начать» →
   цель и минуты в день → сразу первый урок, без аккаунта (гость, src/lib/guest.js). После
   урока — «Сохраните прогресс» → регистрация: аккаунт забирает прогресс устройства.
   «У меня уже есть аккаунт» → вход (и восстановление по коду, если забыт пароль).
   У каждого экрана один «назад» — стрелка вверху слева. */
import React, { useState } from 'react';
import { ArrowLeft, Timer, Coffee, Globe2 } from 'lucide-react';
import { Audio } from './MacroSimulator.jsx';
import { authenticate, RecoveryCodeView, StorageWarning, NameRefused, ConsentBox, ParentStep, consentsReady, BirthYearField, birthYearOf, PasswordField, passwordLongEnough } from './account.jsx';
import { validBirthYear, needsParent } from './lib/age.js';
import { RUDE_NAME } from './lib/moderation.js';
import { Mascot } from './mascot.jsx';
import { InflatiaMark } from './logo.jsx';
import { DsRoot, Button, IconButton, Heading } from './ds.jsx';
import { useHistoryLayer } from './lib/route.js';
import { ArtStyle, Guilloche, Rosette } from './ds-art-core.jsx';
import { dsThemeId } from './ds-tokens.js';
import { loadProgress, saveProgress } from './textbook/progress.js';
import { setGoal, setProfile, PROFILE_GOAL_LABEL, LESSONS_FOR_MINUTES } from './textbook/learn-state.js';
import { startGuest, endGuest } from './lib/guest.js';
import { startWorldTrial, TRIAL_SECONDS } from './lib/world-trial.js';
import { track, trackOnce } from './lib/client.js';

// ответы первого запуска: после регистрации они уходят в программу ученика (learn.profile)
const ONBOARD_KEY = 'ems-onboarding';
export const loadOnboarding = () => { try { return JSON.parse(localStorage.getItem(ONBOARD_KEY) || 'null'); } catch { return null; } };
const saveOnboarding = (v) => { try { localStorage.setItem(ONBOARD_KEY, JSON.stringify(v)); } catch { /* приватный режим */ } };

// программа ученика: цель, минуты (из них — цель дня и задание дня) и знания (вступительный тест)
function applyPlan(plan) {
  if (!plan || !plan.minutes) return;
  const p = loadProgress();
  saveProgress({ ...p, learn: setGoal(setProfile(p.learn, plan), LESSONS_FOR_MINUTES[plan.minutes] || 1) });
}

export const GOALS = Object.entries(PROFILE_GOAL_LABEL).map(([id, label]) => ({ id, label }));
export const MINUTES = [5, 10, 15, 20];

const CSS = `
  /* высота — экран без полосы уведомления о памяти браузера (src/privacy.jsx): она стоит в потоке над приветствием */
  .wl { max-width: 460px; margin: 0 auto; padding: calc(18px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom)); min-height: calc(100vh - var(--ems-notice-h, 0px)); min-height: calc(100dvh - var(--ems-notice-h, 0px)); display: flex; flex-direction: column; box-sizing: border-box; }
  .wl-top { display: flex; align-items: center; min-height: 44px; }
  .wl-body { flex: 1; display: flex; flex-direction: column; }
  .wl-foot { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
  .wl-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .wl-opts .ds-opt { margin: 0; text-align: center; font-weight: 700; }
  .wl-err { color: var(--ds-bad); font-size: 14px; margin: 4px 0 8px; }
  /* приветствие оживает по шагам: гильош, Инфля, название, обещания */
  .wl-hello .wl-g1, .wl-hello .wl-g2 { animation: wl-wipe .9s cubic-bezier(.3,.8,.4,1) both; width: 100%; }
  .wl-hello .wl-g2 { animation-delay: .9s; }
  @keyframes wl-wipe { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
  .wl-hero { margin: 12px 0 4px; animation: wl-pop .6s cubic-bezier(.3,1.5,.5,1) .15s both; }
  .wl-bob { display: inline-block; animation: wl-bob 3s ease-in-out .8s infinite; }
  @keyframes wl-pop { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: none } }
  @keyframes wl-bob { 0%, 100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(-6px) rotate(-2deg) } }
  .wl-brand { animation: wl-up .5s ease-out .35s both; }
  .wl-slogan { animation: wl-up .5s ease-out .45s both; }
  @keyframes wl-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
  .wl-values { list-style: none; padding: 0; margin: 16px 0; text-align: left; max-width: 380px; display: grid; gap: 10px; }
  .wl-values li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; align-items: start; font-size: 15px; line-height: 1.4; animation: wl-up .45s ease-out both; animation-delay: calc(.55s + var(--i) * .12s); }
  .wl-v-ico { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; color: var(--u-ink); background: color-mix(in srgb, var(--u) 13%, var(--ds-card)); }
  @media (prefers-reduced-motion: reduce) { .wl-hello *, .wl-hello { animation: none !important; } }
  /* ПК (docs/mechanics.md, «Приветствие и загрузка»): та же колонка посередине экрана, по высоте — по центру; без
     деления на две части (пункт владельца 08.11, вечер). Уведомление о памяти браузера — в левом нижнем углу */
  /* низкий телефон (docs/mechanics.md, «Приветствие и загрузка»): розетка меньше, гильоши убраны — «Начать» и
     «У меня уже есть аккаунт» видны на первом экране и с полосой уведомления о памяти браузера наверху */
  @media (max-height: 700px) and (max-width: 1023px) {
    .wl-hello { padding-top: calc(10px + env(safe-area-inset-top)); }
    .wl-hello .wl-g1, .wl-hello .wl-g2 { display: none; }
    .wl-hello .wl-hero { zoom: .6; margin: 6px 0 2px; }
    .wl-hello .wl-brand { font-size: 28px !important; }
    .wl-hello .wl-values { margin: 10px 0 0; gap: 7px; }
    .wl-hello .wl-values li { font-size: 14px; line-height: 1.32; }
    .wl-hello .wl-foot { margin-top: 12px; gap: 8px; }
  }
  @media (min-width: 1024px) {
    .wl.wl-hello { justify-content: center; }
    .wl-hello > .wl-body { flex: none; }
  }
`;

function Top({ onBack }) {
  return (
    <div className="wl-top">
      {onBack && <IconButton label="Назад" icon={ArrowLeft} data-nav="back" onClick={() => { Audio.play('paper'); onBack(); }} />}
    </div>
  );
}

// три обещания приветствия (мини-урок «за 30 секунд» убран — пункт владельца 08.11, вечер)
export const VALUE_POINTS = [
  ['Пять минут в день', 'Короткие уроки: одна мысль, график, вопрос — и сразу ответ.', Timer],
  ['Экономика вокруг вас', 'Кофейня у метро, пекарня, банк и министерство — герои одного города.', Coffee],
  ['Знания в деле', 'В «Мире» вы ведёте страну и видите, как работают ставка, бюджет и рынок.', Globe2],
];
function Hello({ go }) {
  return (
    <div className="wl wl-hello" data-testid="welcome">
      {/* титул — как купюра: гильош, розетка-водяной знак, Инфля в середине */}
      <div className="wl-body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="wl-g1"><Guilloche height={26} /></div>
        <div className="wl-hero"><Rosette size={150} opacity={0.4}><span className="wl-bob"><Mascot mood="wave" size={92} /></span></Rosette></div>
        {/* один знак и одно начертание названия с «Миром» (src/logo.jsx) */}
        <h1 className="ds-h1 wl-brand" style={{ fontSize: 34, letterSpacing: '.02em', display: 'flex', alignItems: 'center', gap: 10 }} data-testid="brand"><InflatiaMark size={40} title={null} />Инфляция</h1>
        <div className="ds-eyebrow wl-slogan" style={{ marginTop: 6 }}>экономика пять минут в день</div>
        <ul data-testid="welcome-values" className="wl-values">
          {VALUE_POINTS.map(([t, d, Icon], k) => (
            <li key={t} style={{ '--i': k }}><span className="wl-v-ico"><Icon size={19} aria-hidden="true" /></span><span><b>{t}.</b> <span className="ds-sub">{d}</span></span></li>
          ))}
        </ul>
        <div style={{ marginTop: 14, width: '100%' }} className="wl-g2"><Guilloche height={20} /></div>
      </div>
      <div className="wl-foot">
        <Button wide onClick={() => { Audio.prime(); Audio.play('click'); trackOnce('welcome_start'); go('goal'); }}>Начать</Button>
        <Button variant="secondary" wide onClick={() => { Audio.prime(); Audio.play('click'); go('login'); }}>У меня уже есть аккаунт</Button>
        {/* «Мир» на пробу — без регистрации и уроков (docs/mechanics.md, «„Мир“ на пробу — без регистрации») */}
        <Button variant="ghost" wide icon={Globe2} data-testid="welcome-world" onClick={() => { Audio.prime(); Audio.play('click'); trackOnce('welcome_world_trial'); startWorldTrial(); }}>Сначала сыграть в «Мир»</Button>
        <div className="ds-faint" style={{ textAlign: 'center', fontSize: 13, marginTop: -6 }} data-testid="welcome-world-note">{Math.round(TRIAL_SECONDS / 60)} минут без регистрации</div>
      </div>
    </div>
  );
}

function Goal({ go, plan, setPlan }) {
  const ok = plan.goal && plan.minutes;
  const pick = (patch) => { Audio.play('tick'); setPlan((p) => ({ ...p, ...patch })); };
  return (
    <div className="wl" data-testid="welcome-goal">
      <Top onBack={() => go('hello')} />
      <div className="wl-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Mascot mood="hello" size={56} />
          <Heading level={1} look={2} eyebrow="Шаг 1 из 2" title="Зачем вам экономика?" />
        </div>
        <div className="wl-opts" role="group" aria-label="Цель">
          {GOALS.map((g) => <button key={g.id} type="button" className="ds-opt" aria-pressed={plan.goal === g.id} onClick={() => pick({ goal: g.id })}>{g.label}</button>)}
        </div>
        <h2 className="ds-h3" style={{ margin: '22px 0 10px' }}>Сколько минут в день?</h2>
        <div className="wl-opts" role="group" aria-label="Минут в день">
          {MINUTES.map((m) => <button key={m} type="button" className="ds-opt" aria-pressed={plan.minutes === m} onClick={() => pick({ minutes: m })}>{m} минут</button>)}
        </div>
        <h2 className="ds-h3" style={{ margin: '22px 0 10px' }}>Уже знакомы с экономикой?</h2>
        <div className="wl-opts" role="group" aria-label="Знания">
          {[[false, 'Начинаю с нуля'], [true, 'Кое-что знаю']].map(([v, l]) => (
            <button key={l} type="button" className="ds-opt" aria-pressed={plan.knows === v} onClick={() => pick({ knows: v })}>{l}</button>
          ))}
        </div>
      </div>
      <div className="wl-foot">
        <Button wide disabled={!ok} onClick={() => { Audio.play('click'); saveOnboarding(plan); applyPlan(plan); trackOnce('goal_done'); startGuest(); }}>Продолжить</Button>
      </div>
    </div>
  );
}

/* Форма регистрации, входа или восстановления. После регистрации и восстановления
   показываем код восстановления — почты у игры нет, без кода забытый пароль не вернуть. */
function AuthForm({ mode, go, plan, onCancel = null }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [consents, setConsents] = useState({});
  const [year, setYear] = useState('');
  const [parentStep, setParentStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(null);
  const finish = () => {
    if (mode === 'register' && plan.minutes) applyPlan(plan);
    if (mode === 'register') track('register_done');
    // аккаунт уже сохранён и забрал прогресс гостя (тот же playerId) — гостем больше не считаем
    endGuest();
    window.dispatchEvent(new Event('ems-account-ready'));
  };
  const kidYear = mode === 'register' && validBirthYear(birthYearOf(year)) && needsParent(birthYearOf(year));
  const submit = async (e) => {
    e.preventDefault();
    // до 14 лет — сначала отдельный шаг «Подтверждение родителя»
    if (kidYear && !parentStep) { setParentStep(true); window.scrollTo(0, 0); return; }
    setBusy(true); setError('');
    try {
      const r = await authenticate(mode, { login, password, name, code, consents, birthYear: birthYearOf(year) });
      Audio.play('up');
      if (r.recoveryCode) setShown(r); else finish();
    } catch (err) { setError(err.message); Audio.play('down'); setBusy(false); }
  };
  if (shown) {
    return (
      <div className="wl" data-testid="welcome-code">
        <Top />
        <div className="wl-body">
          <Heading level={2} title="Сохраните код восстановления" style={{ marginBottom: 12 }} />
          {shown.storage === 'memory' && <StorageWarning />}
          <RecoveryCodeView code={shown.recoveryCode} onDone={finish} login={(shown.profile || {}).login || login.trim().toLowerCase()} />
        </div>
      </div>
    );
  }
  const title = { register: 'Создайте аккаунт', login: 'Вход', recover: 'Новый пароль по коду' }[mode];
  const canSubmit = login.trim().length >= 3 && passwordLongEnough(password, mode) && (mode !== 'recover' || code.replace(/[^A-Za-z0-9]/g, '').length >= 12)
    && (mode !== 'register' || (validBirthYear(birthYearOf(year)) && consents.page && consents.pd && (!parentStep || consentsReady(consents, birthYearOf(year)))));
  return (
    <div className="wl" data-testid={parentStep ? 'welcome-parent' : `welcome-${mode}`}>
      <Top onBack={() => (parentStep ? setParentStep(false) : onCancel && mode === 'register' ? onCancel() : go(mode === 'register' ? 'goal' : mode === 'recover' ? 'login' : 'hello'))} />
      <form className="wl-body" onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Mascot mood={mode === 'register' ? 'joy' : 'hello'} size={52} />
          <Heading level={1} eyebrow={mode === 'register' ? (onCancel ? 'Сохраните прогресс' : 'Шаг 2 из 2') : 'Аккаунт'} title={parentStep ? 'Подтверждение родителя' : title} />
        </div>
        {parentStep ? <ParentStep value={consents} set={setConsents} /> : (<>
          {mode === 'register' && <div className="ds-sub" style={{ fontSize: 14.5, lineHeight: 1.5, marginBottom: 14 }}>Прогресс, серия и опыт хранятся в аккаунте — войдите на другом устройстве, и всё будет там.</div>}
          {mode === 'recover' && <div className="ds-sub" style={{ fontSize: 14.5, lineHeight: 1.5, marginBottom: 14 }}>Логин, код восстановления из регистрации и новый пароль.</div>}
          <label className="ds-label">Логин
            <input className="ds-field" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="латиница, цифры, _" />
          </label>
          {mode === 'recover' && (
            <label className="ds-label">Код восстановления
              <input className="ds-field" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="XXXX-XXXX-XXXX" />
            </label>
          )}
          <PasswordField label={mode === 'recover' ? 'Новый пароль' : 'Пароль'} value={password} onChange={setPassword} mode={mode} />
          {mode === 'register' && (
            <label className="ds-label">Имя
              <input className="ds-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="как вас называть" />
            </label>
          )}
          {mode === 'register' && <BirthYearField value={year} set={setYear} />}
          {mode === 'register' && <div style={{ marginTop: 12 }}><ConsentBox value={consents} set={setConsents} /></div>}
        </>)}
        {error && (error === RUDE_NAME ? <NameRefused text={error} login={login} name={name} /> : <div className="wl-err" role="alert">{error}</div>)}
        <div style={{ flex: 1 }} />
        <div className="wl-foot">
          <Button type="submit" wide disabled={busy || !canSubmit}>
            {busy ? 'Минутку…' : mode === 'register' ? (kidYear && !parentStep ? 'Дальше: подтверждение родителя' : 'Создать аккаунт') : mode === 'recover' ? 'Задать пароль' : 'Войти'}
          </Button>
          {mode === 'login' && <Button variant="ghost" wide onClick={() => go('recover')}>Забыли пароль?</Button>}
          {/* войти и создать — друг из друга: гость, открывший «Сохраните прогресс», мог уже иметь аккаунт */}
          {mode === 'register' && !parentStep && <Button variant="ghost" wide data-testid="auth-to-login" onClick={() => { Audio.play('paper'); go('login'); }}>У меня уже есть аккаунт — войти</Button>}
          {mode === 'login' && <Button variant="ghost" wide data-testid="auth-to-register" onClick={() => { Audio.play('paper'); go(onCancel ? 'register' : 'goal'); }}>Нет аккаунта? Создать</Button>}
        </div>
      </form>
    </div>
  );
}

export function Welcome({ initialScreen = 'hello', onCancel = null }) {
  const [screen, setScreen] = useState(initialScreen);
  const [plan, setPlan] = useState(() => loadOnboarding() || { goal: null, minutes: null, knows: false });
  const go = (s) => { setScreen(s); window.scrollTo(0, 0); };
  // шаги после приветствия (цель, вход, регистрация) — запись истории: «Назад» браузера возвращает на первый экран
  useHistoryLayer(screen !== initialScreen, () => go(initialScreen));
  return (
    <DsRoot theme={dsThemeId()} page accent="#C2490B">
      <ArtStyle />
      <style>{CSS}</style>
      {screen === 'hello' && <Hello go={go} />}
      {screen === 'goal' && <Goal go={go} plan={plan} setPlan={setPlan} />}
      {(screen === 'register' || screen === 'login' || screen === 'recover') && <AuthForm key={screen} mode={screen} go={go} plan={plan} onCancel={screen === initialScreen ? onCancel : null} />}
    </DsRoot>
  );
}
export default Welcome;
