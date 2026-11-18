/* «СООБЩИТЬ ОБ ОШИБКЕ» В «МИРЕ» (замечание владельца 18.11, вечер, п. 10: «в мире нет кнопки жалобы»). Флажок в шапке
   партии — одиночной и сетевой. Шторка та же, что в уроках (src/learn-report.jsx, ReportSheet), в цветах «Мира»; в жалобу
   уходят роль, квартал, режим экономики, сценарий и ключевые числа — то, без чего жалобу на «Мир» не разобрать. Модуль
   шторки грузится при первом нажатии: партия от него не тяжелеет. */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from 'lucide-react';
import { Audio, COLOR } from './MacroSimulator.jsx';

const Sheet = React.lazy(() => import('./learn-report.jsx').then((m) => ({ default: ({ context, onClose }) => <><style>{m.REPORT_CSS}</style><m.ReportSheet context={context} reasons={m.WORLD_REASONS} sub="Что не так в «Мире»? Роль, квартал и состояние экономики приложатся сами." onClose={onClose} /></> })));
const Root = React.lazy(() => import('./ds.jsx').then((m) => ({ default: m.DsRoot })));
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

// что приложить к жалобе: коротко и только то, что помогает её разобрать
export function worldReportContext({ economy = {}, role, mode = 'solo', scenario = null, quarter = null, view = null }) {
  const numbers = { inflation: r1(economy.inflation), rate: r1(economy.policyRate), growth: r1(economy.gdpGrowth), unemployment: r1(economy.unemployment), approval: r1(economy.approval) };
  return {
    screen: 'world', kind: String(role || '').slice(0, 30), mode,
    page: [scenario && `сценарий: ${scenario}`, view && `вид: ${view}`, economy.regime && `режим: ${economy.regime}`, economy.politicalRegime && `власть: ${economy.politicalRegime}`].filter(Boolean).join(' · ').slice(0, 200),
    step: quarter != null ? `квартал ${quarter}` : '',
    numbers: JSON.stringify(Object.fromEntries(Object.entries(numbers).filter(([, v]) => v != null))),
  };
}

export function WorldReportButton({ context, style = null }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <button type="button" className="ems-btn" style={{ padding: '7px 9px', minWidth: 40, minHeight: 40, display: 'inline-grid', placeItems: 'center', ...style }}
        aria-label="Сообщить об ошибке" title="Сообщить об ошибке" data-testid="world-report"
        onClick={() => { Audio.play('click'); setOpen(context()); }}>
        <Flag size={14} color={COLOR.muted} aria-hidden="true" />
      </button>
      {open && createPortal(
        <React.Suspense fallback={null}>
          <Root world={COLOR} style={{ position: 'fixed', inset: 0, zIndex: 1200, pointerEvents: 'none', background: 'none' }}>
            <div className="ln-report-root" style={{ pointerEvents: 'auto' }}><Sheet context={open} onClose={() => setOpen(null)} /></div>
          </Root>
        </React.Suspense>, document.body)}
    </>
  );
}
