/* СОКРАЩЕНИЯ УЧЕБНИКА и их расшифровки (docs/mechanics.md, «Учебник»): сокращение в главе впервые —
   с расшифровкой рядом («предельная выручка $MR$», «ИПЦ — индекс потребительских цен»). near — по чему
   тест узнаёт расшифровку рядом с первым появлением (src/textbook/__tests__/abbr.test.js); новое
   сокращение без записи здесь тест не пропустит. en — английская расшифровка латинского сокращения: она встаёт
   в скобках в строку обозначений под формулой (src/textbook/symbols.js); enBy — своя для главы. Модуль чистый. */
export const ABBR = {
  MR: { full: 'предельная выручка (marginal revenue)', near: /предельн\S* выручк/i, en: 'marginal revenue' },
  MC: { full: 'предельные издержки (marginal cost)', near: /предельн\S* издерж/i, en: 'marginal cost' },
  TR: { full: 'общая выручка (total revenue)', near: /(общ|вся|всей|полн)\S* выручк|выручка\S*\s*\$?TR/i, en: 'total revenue' },
  TC: { full: 'общие издержки (total cost)', near: /(общ|все|полн)\S* издерж/i, en: 'total cost' },
  FC: { full: 'постоянные издержки (fixed cost)', near: /постоянн\S* (издерж|затрат)?/i, en: 'fixed cost' },
  VC: { full: 'переменные издержки (variable cost)', near: /переменн\S*/i, en: 'variable cost' },
  AFC: { full: 'средние постоянные издержки (average fixed cost)', near: /средн\S* постоянн/i, en: 'average fixed cost' },
  AVC: { full: 'средние переменные издержки (average variable cost)', near: /средн\S* переменн/i, en: 'average variable cost' },
  ATC: { full: 'средние общие издержки (average total cost)', near: /средн\S* (общ\S* )?издерж/i, en: 'average total cost' },
  LRAC: { full: 'долгосрочные средние издержки (long-run average cost)', near: /долгосрочн\S* средн/i, en: 'long-run average cost' },
  MP: { full: 'предельный продукт (marginal product); в главе IS-LM — кривая денежной политики (monetary policy)', near: /предельн\S* продукт|monetary policy/i, en: 'marginal product', enBy: { 'is-lm': 'monetary policy' } },
  TP: { full: 'общий продукт (total product): весь выпуск при данном числе работников', near: /общ\S* продукт/i, en: 'total product' },
  AP: { full: 'средний продукт (average product): выпуск на одного работника', near: /средн\S* продукт/i, en: 'average product' },
  MRTS: { full: 'предельная норма технического замещения (marginal rate of technical substitution)', near: /технического замещени/i, en: 'marginal rate of technical substitution' },
  MRP: { full: 'предельный продукт труда в деньгах (marginal revenue product)', near: /продукт\S* труда в деньгах|marginal revenue product/i, en: 'marginal revenue product' },
  MU: { full: 'предельная полезность (marginal utility)', near: /предельн\S* полезност/i, en: 'marginal utility' },
  MRS: { full: 'предельная норма замещения (marginal rate of substitution)', near: /предельн\S* норм\S* замещени/i, en: 'marginal rate of substitution' },
  DWL: { full: 'чистые потери общества (deadweight loss)', near: /чист\S* потер|deadweight/i, en: 'deadweight loss' },
  NX: { full: 'чистый экспорт (net exports)', near: /чист\S* экспорт/i, en: 'net exports' },
  AD: { full: 'совокупный спрос (aggregate demand)', near: /совокупн\S* спрос/i, en: 'aggregate demand' },
  AS: { full: 'совокупное предложение (aggregate supply)', near: /совокупн\S* предложени/i, en: 'aggregate supply' },
  SRAS: { full: 'совокупное предложение в коротком периоде (short-run aggregate supply)', near: /(коротк|краткосрочн)\S* (период\S* )?(совокупн\S* )?предложени|предложение в коротком/i, en: 'short-run aggregate supply' },
  LRAS: { full: 'совокупное предложение в длинном периоде (long-run aggregate supply)', near: /длинн\S* период|долгосрочн\S* (совокупн\S* )?предложени/i, en: 'long-run aggregate supply' },
  IS: { full: 'кривая IS: инвестиции равны сбережениям (investment = saving), равновесие на рынке товаров', near: /investment|инвестици\S* (равны|=)? ?сбережени|рын\S* товар/i, en: 'investment – saving' },
  LM: { full: 'кривая LM: спрос на деньги равен предложению (liquidity preference = money supply), равновесие на рынке денег', near: /liquidity|money supply|рын\S* денег|спрос\S* на деньги/i, en: 'liquidity preference – money supply' },
  QE: { full: 'количественное смягчение (quantitative easing): ЦБ покупает облигации за новые деньги', near: /количественн\S* смягчени|quantitative easing/i, en: 'quantitative easing' },
  QT: { full: 'количественное ужесточение (quantitative tightening): ЦБ продаёт облигации', near: /количественн\S* ужесточени|quantitative tightening/i, en: 'quantitative tightening' },
  NAIRU: { full: 'уровень безработицы, при котором инфляция не ускоряется (non-accelerating inflation rate of unemployment)', near: /не ускоря|non-accelerating/i, en: 'non-accelerating inflation rate of unemployment' },
  'ВВП': { full: 'валовой внутренний продукт', near: /валов\S* внутренн\S* продукт/i },
  'ИПЦ': { full: 'индекс потребительских цен', near: /индекс\S* потребительск\S* цен|\[\[term:cpi/i },
  'ЦБ': { full: 'центральный банк', near: /центральн\S* банк|центробанк/i },
  'ФРС': { full: 'Федеральная резервная система — центральный банк США', near: /федеральн\S* резервн/i },
  'НДС': { full: 'налог на добавленную стоимость', near: /налог\S* на добавленн/i },
};
/* не сокращения, а произведения букв в формулах ($MV = PY$, $AQ - BQ^2$) и общеизвестные названия */
export const NOT_ABBR = new Set(['MV', 'PY', 'AQ', 'BQ', 'США']);

// английская расшифровка латинского сокращения в главе (AP → average product); для русских и чужих — null
export const abbrEn = (key, chapter) => {
  const a = ABBR[key];
  return a && a.en ? (a.enBy && a.enBy[chapter]) || a.en : null;
};
