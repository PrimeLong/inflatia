/* Звуки ответа в темах урока (docs/mechanics.md, «Темы урока»): у каждой темы своя пара [верно, неверно]
   из src/audio/engine.js; без темы — общие «монетка» и «вниз». Модуль чистый: его читают урок и тесты. */
export const SKIN_SOUNDS = { exchange: ['ex-up', 'ex-down'], mint: ['mint-up', 'mint-down'], blueprint: ['bp-up', 'bp-down'], aurora: ['au-up', 'au-down'] };
export const PLAIN_SOUNDS = ['coin', 'down'];
export const answerSound = (skin, ok) => ((skin && SKIN_SOUNDS[skin.key]) || PLAIN_SOUNDS)[ok ? 0 : 1];
