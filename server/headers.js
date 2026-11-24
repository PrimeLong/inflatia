/* ЗАГОЛОВКИ БЕЗОПАСНОСТИ — те же, что были в vercel.json для всех ответов. Один источник: сервер ставит их на ответы API
   (и на статику, если сам её раздаёт — SERVE_STATIC), а onreza.rules.toml для ONREZA Static собирается из этого же списка
   (scripts/build-onreza.mjs проверяет, что они совпадают). */
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
};
