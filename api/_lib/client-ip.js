/* АДРЕС КЛИЕНТА — для ограничений частоты (регистрация, вход, восстановление, жалобы). Один источник для всех
   обработчиков, чтобы адрес нельзя было подставить своим заголовком.

   — Сервер ONREZA Compute (server/app.js) сам вычисляет адрес из заголовков доверенного прокси и кладёт его в
     req.clientIp: Express с trust proxy = TRUST_PROXY_HOPS берёт адрес, который записал ближайший доверенный прокси
     (правый край X-Forwarded-For), а не то, что прислал браузер (левый край — его клиент может написать сам).
   — На Vercel (старый путь, пока он оставлен для отката) X-Forwarded-For выставляет сама платформа и перезаписывает
     присланный клиентом заголовок, поэтому левый элемент там — настоящий адрес.

   Адрес нигде не хранится целиком дольше часа: только в ключах счётчиков hit:<имя>:<адрес> со сроком (store.js). */
export const IP_MAX = 64;
export function clientIp(req) {
  if (req && typeof req.clientIp === 'string' && req.clientIp) return req.clientIp.slice(0, IP_MAX);
  const h = (req && req.headers) || {};
  return String(h['x-forwarded-for'] || h['x-real-ip'] || 'local').split(',')[0].trim().slice(0, IP_MAX) || 'local';
}
