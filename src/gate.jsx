/* ЭКРАН КЛЮЧА — закрытый сайт (пункт владельца 28.11, п. 3; сервер — api/_lib/gate.js).

   Без аккаунта на устройстве — сначала ключ на весь экран. Ключ проверяет сервер: верный — он ставит пропуск (cookie,
   её JavaScript не видит), здесь остаётся только отметка «ключ введён» (ems-gate-ok), и сразу открывается регистрация.
   Есть аккаунт — ключ не спрашиваем: при запуске сессия сама получает пропуск. «У меня есть аккаунт» — вход без ключа.
   Сервер ответил «закрыто» (403, X-Inflatia-Closed) на любой запрос — пропуск пропал или устарел: снова экран ключа.
   Ключ не хранится ни здесь, ни в сборке. */
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { DsRoot, Button } from './ds.jsx';
import { loadAccount, PasswordField } from './account.jsx';

const AuthModal = lazy(() => import('./account.jsx').then((m) => ({ default: m.AuthModal })));
export const GATE_FLAG = 'ems-gate-ok';
const flagged = () => { try { return localStorage.getItem(GATE_FLAG) === '1'; } catch { return false; } };
const setFlag = (on) => { try { if (on) localStorage.setItem(GATE_FLAG, '1'); else localStorage.removeItem(GATE_FLAG); } catch { /* приватный режим */ } };

// любой ответ API «закрыто» — событие для экрана ключа
let watching = false;
function watchClosed() {
  if (watching || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  watching = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const r = await orig(...args);
    try { if (r && r.status === 403 && r.headers && r.headers.get('X-Inflatia-Closed') === '1') window.dispatchEvent(new Event('inflatia:closed')); } catch { /* ответ без заголовков */ }
    return r;
  };
}
async function postGate(body) {
  const r = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'gate', ...body }) });
  let data = {}; try { data = await r.json(); } catch { /* пустой ответ */ }
  return { status: r.status, data };
}

const CSS = `
  .gt { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; padding: 16px; background: var(--ds-paper); overflow: auto; }
  .gt-card { width: 100%; max-width: 400px; padding: 26px 22px 22px; border-radius: 24px; background: var(--ds-card); border: 1px solid var(--ds-rule2);
    box-shadow: 0 24px 60px -32px var(--ds-shade, rgba(0,0,0,.35)); animation: gt-in .35s cubic-bezier(.2,.9,.3,1.1); }
  @keyframes gt-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  .gt-lock { width: 54px; height: 54px; border-radius: 18px; display: grid; place-items: center; margin-bottom: 14px; color: var(--u-ink, #8A4B12);
    background: color-mix(in srgb, var(--u, #C8702A) 14%, var(--ds-card)); }
  .gt-title { font: 800 24px/1.2 var(--ds-head, var(--ds-sans)); color: var(--ds-ink); margin: 0 0 6px; }
  .gt-sub { font: 15px/1.45 var(--ds-sans); color: var(--ds-ink2); margin: 0 0 18px; }
  .gt-err { margin-top: 10px; font: 600 14px var(--ds-sans); color: var(--ds-bad); }
  .gt-or { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ds-rule2); text-align: center; }
  .gt-link { background: none; border: 0; padding: 6px; font: 600 15px var(--ds-sans); color: var(--u-ink, #8A4B12); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .gt-card { animation: none; } }
`;

function GateScreen({ onOpen, onLogin }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const r = await postGate({ key: key.trim() });
      if (r.status === 200 && r.data && r.data.ok) { setFlag(true); onOpen(); return; }
      setError(r.status === 429 ? (r.data.error || 'Слишком много попыток — попробуйте позже') : (r.data && r.data.error) || 'Неверный ключ');
    } catch { setError('Нет связи с сервером — попробуйте ещё раз'); }
    setBusy(false);
  };
  return (
    <DsRoot className="gt" data-testid="site-gate">
      <style>{CSS}</style>
      <form className="gt-card" onSubmit={submit} aria-labelledby="gt-title">
        <div className="gt-lock" aria-hidden="true"><Lock size={26} /></div>
        <h1 className="gt-title" id="gt-title">Инфляция — закрытый доступ</h1>
        <p className="gt-sub">Сайт открыт только по приглашению. Введите ключ входа — после него можно завести аккаунт.</p>
        <PasswordField label="Ключ входа" value={key} onChange={(v) => { setKey(v); setError(''); }} mode="login" />
        {error && <div className="gt-err" role="alert" data-testid="gate-error">{error}</div>}
        <div style={{ marginTop: 14 }}><Button wide type="submit" disabled={!key.trim() || busy} data-testid="gate-submit">{busy ? 'Проверяем…' : 'Войти'}</Button></div>
        <div className="gt-or"><button type="button" className="gt-link" data-testid="gate-login" onClick={onLogin}>У меня есть аккаунт — войти</button></div>
      </form>
    </DsRoot>
  );
}

export function SiteGate({ children }) {
  const [open, setOpen] = useState(() => !!loadAccount() || flagged());
  const [auth, setAuth] = useState(null); // 'register' — сразу после ключа; 'login' — «у меня есть аккаунт»
  useEffect(() => {
    watchClosed();
    // аккаунт на устройстве: пропуск по сессии — ключ не нужен (у кого есть аккаунт, ключ не требуется)
    const a = loadAccount();
    if (a && a.token) postGate({ token: a.token }).catch(() => { /* нет сети — попробуем при следующем запуске */ });
    const onClosed = () => { setFlag(false); if (!loadAccount()) setOpen(false); };
    window.addEventListener('inflatia:closed', onClosed);
    return () => window.removeEventListener('inflatia:closed', onClosed);
  }, []);
  const modal = auth && (
    <Suspense fallback={null}>
      <AuthModal startTab={auth} reason={auth === 'register' ? 'Ключ принят. Заведите аккаунт — с ним ключ больше не понадобится.' : undefined}
        onClose={() => setAuth(null)} onDone={() => { setAuth(null); setOpen(true); }} />
    </Suspense>
  );
  if (!open) return <><GateScreen onOpen={() => { setOpen(true); setAuth('register'); }} onLogin={() => setAuth('login')} />{modal}</>;
  return <>{children}{modal}</>;
}
