# Audits

## Mērķis

Nodrošināt, ka spēle atbilst sacensību prasībām: 10 aktivitātes, stabils multiplayer, droša ievade, skaidra UX un tīrs deploy stāvoklis.

## Galvenie uzlabojumi

- Centralizēta punktu skaitīšana ar ierobežotu score cap
- Nejauši ģenerēts maršruts ar fiksētu finišu
- Fināla tests ar 10 jautājumiem un atbilžu jaukšanu
- Atsevišķi leaderboard vienpēlētājam un multiplayer režīmam
- Phaser minispēles bez ārējiem vizuālajiem resursiem

## Riska punkti

- Multiplayer lobby sinhronizācija starp klientiem
- PHP failu piekļuves tiesības uz servera
- Pārlūku autoplay ierobežojumi audio izmantošanā
