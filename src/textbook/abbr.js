/* СОКРАЩЕНИЯ УЧЕБНИКА и их расшифровки (docs/mechanics.md, «Учебник»): сокращение в главе впервые —
   с расшифровкой рядом («предельная выручка $MR$», «ИПЦ — индекс потребительских цен»). near — по чему
   тест узнаёт расшифровку рядом с первым появлением (src/textbook/__tests__/abbr.test.js); новое
   сокращение без записи здесь тест не пропустит. Модуль чистый. */
export const ABBR = {
  MR: { full: 'предельная выручка (marginal revenue)', near: /предельн\S* выручк/i },
  MC: { full: 'предельные издержки (marginal cost)', near: /предельн\S* издерж/i },
  TR: { full: 'общая выручка (total revenue)', near: /(общ|вся|всей|полн)\S* выручк|выручка\S*\s*\$?TR/i },
  TC: { full: 'общие издержки (total cost)', near: /(общ|все|полн)\S* издерж/i },
  FC: { full: 'постоянные издержки (fixed cost)', near: /постоянн\S* (издерж|затрат)?/i },
  VC: { full: 'переменные издержки (variable cost)', near: /переменн\S*/i },
  AFC: { full: 'средние постоянные издержки (average fixed cost)', near: /средн\S* постоянн/i },
  AVC: { full: 'средние переменные издержки (average variable cost)', near: /средн\S* переменн/i },
  ATC: { full: 'средние общие издержки (average total cost)', near: /средн\S* (общ\S* )?издерж/i },
  LRAC: { full: 'долгосрочные средние издержки (long-run average cost)', near: /долгосрочн\S* средн/i },
  MP: { full: 'предельный продукт (marginal product); в главе IS-LM — кривая денежной политики (monetary policy)', near: /предельн\S* продукт|monetary policy/i },
  MRP: { full: 'предельный продукт труда в деньгах (marginal revenue product)', near: /продукт\S* труда в деньгах|marginal revenue product/i },
  MU: { full: 'предельная полезность (marginal utility)', near: /предельн\S* полезност/i },
  MRS: { full: 'предельная норма замещения (marginal rate of substitution)', near: /предельн\S* норм\S* замещени/i },
  DWL: { full: 'чистые потери общества (deadweight loss)', near: /чист\S* потер|deadweight/i },
  NX: { full: 'чистый экспорт (net exports)', near: /чист\S* экспорт/i },
  AD: { full: 'совокупный спрос (aggregate demand)', near: /совокупн\S* спрос/i },
  AS: { full: 'совокупное предложение (aggregate supply)', near: /совокупн\S* предложени/i },
  SRAS: { full: 'совокупное предложение в коротком периоде (short-run aggregate supply)', near: /(коротк|краткосрочн)\S* (период\S* )?(совокупн\S* )?предложени|предложение в коротком/i },
  LRAS: { full: 'совокупное предложение в длинном периоде (long-run aggregate supply)', near: /длинн\S* период|долгосрочн\S* (совокупн\S* )?предложени/i },
  IS: { full: 'кривая IS: инвестиции равны сбережениям (investment = saving), равновесие на рынке товаров', near: /investment|инвестици\S* (равны|=)? ?сбережени|рын\S* товар/i },
  LM: { full: 'кривая LM: спрос на деньги равен предложению (liquidity preference = money supply), равновесие на рынке денег', near: /liquidity|money supply|рын\S* денег|спрос\S* на деньги/i },
  QE: { full: 'количественное смягчение (quantitative easing): ЦБ покупает облигации за новые деньги', near: /количественн\S* смягчени|quantitative easing/i },
  QT: { full: 'количественное ужесточение (quantitative tightening): ЦБ продаёт облигации', near: /количественн\S* ужесточени|quantitative tightening/i },
  NAIRU: { full: 'уровень безработицы, при котором инфляция не ускоряется (non-accelerating inflation rate of unemployment)', near: /не ускоря|non-accelerating/i },
  'ВВП': { full: 'валовой внутренний продукт', near: /валов\S* внутренн\S* продукт/i },
  'ИПЦ': { full: 'индекс потребительских цен', near: /индекс\S* потребительск\S* цен|\[\[term:cpi/i },
  'ЦБ': { full: 'центральный банк', near: /центральн\S* банк|центробанк/i },
  'ФРС': { full: 'Федеральная резервная система — центральный банк США', near: /федеральн\S* резервн/i },
  'НДС': { full: 'налог на добавленную стоимость', near: /налог\S* на добавленн/i },
};
/* не сокращения, а произведения букв в формулах ($MV = PY$, $AQ - BQ^2$) и общеизвестные названия */
export const NOT_ABBR = new Set(['MV', 'PY', 'AQ', 'BQ', 'США']);
