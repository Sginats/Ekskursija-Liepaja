# Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle, kas iepazīstina ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām, pildot uzdevumus un minispēles.

## Par projektu

Šis projekts ir mācību darbs. Spēle piedāvā virtuālu ekskursiju pa Liepāju, kurā spēlētājam jāizpilda uzdevumi noteiktā maršrutā un jānokārto fināla tests.

Autori:
- Niks Šenvalds (Grupa 2PT)
- Dans Bitenieks (Grupa 2PT)

## Funkcionalitāte

- Interaktīva karte ar 10 aktivitātēm
- Nejauši ģenerēts maršruts katrai sesijai, pēdējā vieta vienmēr ir Atpūtas vieta
- 5 Phaser minispēles un 5 interaktīvi uzdevumi
- Fināla tests ar 10 jautājumiem, nejaušu secību un atbilžu jaukšanu
- Punktu skaitīšana ar vienotu scoring sistēmu
- Vienpēlētāja un multiplayer režīmi ar atsevišķiem līderu sarakstiem

## Tehnoloģijas

- HTML, CSS, JavaScript
- Phaser 3
- PHP (rezultātu un lobby glabāšana failos)

## Struktūra

- `public/data/` – jautājumi un lokāciju dati
- `public/core/` – koplietoti palīgmoduļi
- `docs/` – audita un testu dokumentācija

## Lokāla palaišana

1. Ievieto projektu servera mapē (piemēram, XAMPP).
2. Atver `public/index.html` pārlūkā.
3. Multiplayer režīmam nepieciešams PHP serveris.

## Licence

© 2026 Niks Šenvalds, Dans Bitenieks.
