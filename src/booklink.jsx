/* «Подробнее в учебнике» из партии. Корень приложения кладёт в контекст функцию, которая
   открывает учебник поверх партии (партия не размонтируется) и возвращает обратно; вне
   партии контекста нет — и кнопки нет. */
import React, { useContext, useEffect, useState } from 'react';
import { BookOpenText, X } from 'lucide-react';
import { COLOR, Audio } from './MacroSimulator.jsx';
import { BookLinkContext } from './booklink-context.js';

/* Ссылки на учебник под рычагами можно закрыть (пункт владельца 08.11, вечер: «навёл на IS-LM — и крестик»;
   docs/mechanics.md, «„Мир“: решения квартала»): закрытая глава пропадает у всех рычагов — на устройстве, пока в
   «Настройках вида» не вернуть ссылки. */
const HIDE_KEY = 'ems-booklinks-hidden';
const HIDE_EVENT = 'ems-booklinks';
export function hiddenBookLinks() {
  try { const v = JSON.parse(localStorage.getItem(HIDE_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function saveHidden(list) {
  try { if (list.length) localStorage.setItem(HIDE_KEY, JSON.stringify(list)); else localStorage.removeItem(HIDE_KEY); } catch { /* приватный режим */ }
  try { window.dispatchEvent(new CustomEvent(HIDE_EVENT)); } catch { /* нет окна */ }
}
export const restoreBookLinks = () => saveHidden([]);
export function useHiddenBookLinks() {
  const [hidden, setHidden] = useState(hiddenBookLinks);
  useEffect(() => {
    const on = () => setHidden(hiddenBookLinks());
    window.addEventListener(HIDE_EVENT, on);
    return () => window.removeEventListener(HIDE_EVENT, on);
  }, []);
  return hidden;
}

export function BookLink({ to, compact = false, closable = false }) {
  const open = useContext(BookLinkContext);
  const hidden = useHiddenBookLinks();
  if (!open || !to) return null;
  if (closable && hidden.includes(to.chapter)) return null;
  const link = (
    <button type="button" className="ems-btn ghost" data-testid="book-link" title={to.label}
      style={{ padding: compact ? '2px 6px' : '4px 9px', fontSize: 12, color: COLOR.goldSoft, display: 'inline-flex', alignItems: 'center', gap: 5 }}
      onClick={(e) => { e.stopPropagation(); Audio.play('click'); open({ kind: 'chapter', id: to.chapter, anchor: to.anchor }); }}>
      <BookOpenText size={12} />{compact ? to.label : <>Подробнее в учебнике: {to.label}</>}
    </button>
  );
  if (!closable) return link;
  return (
    <span className="ems-booklink" data-chapter={to.chapter}>
      {link}
      <button type="button" className="ems-booklink-x" data-testid="book-link-close" aria-label={`Скрыть ссылку на учебник: ${to.label}`} title="Скрыть ссылку"
        onClick={(e) => { e.stopPropagation(); Audio.play('tick'); saveHidden([...new Set([...hiddenBookLinks(), to.chapter])]); }}>
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  );
}
