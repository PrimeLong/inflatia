/* ЧИСЛА ПО-РУССКИ — один форматтер на весь «Мир» (docs/mechanics.md, «Числа в „Мире“»): десятичная запятая и
   неразрывный пробел между числом и единицей («4,1», «12,50 млрд», «0,3 п. п.»). Знак процента — вплотную («4,1%»).
   Раньше каждое место звало toFixed само — и на экране партии стояло «4.1», а в газете — «4,1».
   Не для координат SVG, CSS и ключей: там нужна точка. */
export const NBSP = ' ';

// число с заданной точностью; не число — тире
export const ruNum = (v, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits).replace('.', ',') : '—');
// то же со знаком «+» у неотрицательных
export const ruSigned = (v, digits = 1) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${ruNum(v, digits)}` : '—');
// число и единица через неразрывный пробел: единица не уезжает на другую строку
export const withUnit = (text, unit) => (unit ? `${text}${NBSP}${unit}` : String(text));
export const ruUnit = (v, digits, unit) => withUnit(ruNum(v, digits), unit);
// проценты: «4,1%»
export const ruPct = (v, digits = 1) => `${ruNum(v, digits)}%`;
// готовая строка с точкой («4.25») — в запятую; для чисел, собранных не здесь
export const ruDots = (s) => String(s).replace(/(\d)\.(\d)/g, '$1,$2');
