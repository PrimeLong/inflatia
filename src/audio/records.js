/* ПЛАСТИНКИ ЛАВКИ (замечание владельца 18.11, вечер, п. 4: «нужны платные пластинки в лавке, какие-то прям афигенные
   треки; генерацию не делать — я сам сгенерирую по твоему описанию»). Пластинка — только запись: public/music/<track>.mp3
   (описание для генерации — music/README.md, «Пластинки лавки»). Пока файла нет, пластинки нет и в лавке. Купленные —
   отдельный микс «Пластинки» в проигрывателе обучения, и они же звучат в «Волне» (с 21.11); в музыку «Мира» по режиму экономики не входят.
   Синтез у пластинки — запасной (сбой загрузки файла): взят у спокойной пьесы того же склада, чтобы не было тишины. */
export const RECORDS = [
  { id: 'rec-nights', track: 'velnights', bpm: 84, name: 'Ночи Велеграда', subtitle: 'нео-соул, электропиано Rhodes, тёплый бас', base: 'cabinet', crowns: 180 },
  { id: 'rec-gold', track: 'goldstandard', bpm: 132, name: 'Золотой стандарт', subtitle: 'биг-бэнд, медные, свинг', base: 'fullhouse', crowns: 220 },
  { id: 'rec-aurora', track: 'aurorasynth', bpm: 100, name: 'Северное сияние', subtitle: 'синтвейв, арпеджио, широкие пады', base: 'northlight', crowns: 200 },
  { id: 'rec-gong', track: 'openinggong', bpm: 96, name: 'Гонг открытия', subtitle: 'оркестр и барабаны тайко, эпик', base: 'anthem', crowns: 240 },
  { id: 'rec-rain', track: 'rainledger', bpm: 70, name: 'Дождь над бухгалтерией', subtitle: 'неоклассика: рояль и виолончель', base: 'ledger', crowns: 160 },
  { id: 'rec-funk', track: 'coinfunk', bpm: 108, name: 'Монетный фанк', subtitle: 'фанк, слэп-бас, вау-гитара, медь', base: 'boulevard', crowns: 230 },
];
