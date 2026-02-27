# 🗺️ Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle, kuras mērķis ir iepazīstināt lietotājus ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām, pildot dažādus uzdevumus.

![title](https://i.ytimg.com/vi/pTI00QxgScI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBMQu4OX7XOQC2yuU-ApsFXK1TvHA)

---

## 🚀 Funkcionalitāte
* **Interaktīva karte:** Liepājas karte ar aktīviem punktiem un kategorijām.
* **Uzdevumu sistēma:** Katrā vietā ir unikāls uzdevums. Iekļautas mini-spēles (Ostas regate, Vēsturiskā secība) un nejauši jautājumi.
* **Noslēguma tests:** Pēc visu 10 vietu apmeklēšanas – bonusa Kahoot stila tests.
* **Daudzspēlētāju režīms:** Iespēja spēlēt kopā ar draugu, izmantojot istabas kodu (WebSockets).
* **Punktu un Laika uzskaite:** Rezultāts tiek fiksēts un saglabāts Top 10 tabulā, kārtojot pēc laika.
* **Vizuālās tēmas:** Iespēja izvēlēties kādu no 4 krāsu režīmiem (Klasiskā, Violeta, Sarkana, Zila).
* **Tulkošana:** Iebūvēta LV/EN valodu pārslēgšana ar DeepL API integrāciju.
* **Responsivitāte:** Optimizēta lietošanai gan uz datora, gan mobilajām ierīcēm.

---

## 🛠️ Uzstādīšana un Palaišana

Projekts sastāv no divām daļām: PHP klients (Front-end) un Node.js WebSocket serveris (Lobby funkcionalitātei).

### 1. Front-end (PHP)
Nepieciešams PHP serveris (piemēram, XAMPP, Nginx vai Apache).
1. Novietojiet projektu savā web servera direktorijā.
2. Konfigurējiet `public/php/translate.php`, iestatot savu `DEEPL_API_KEY` vides mainīgajos vai tieši failā (produkcijā ieteicams izmantot vides mainīgos).

### 2. WebSocket Serveris (Node.js)
Atrodas `ws-server/` direktorijā.
1. Atveriet termināli `ws-server/` mapē.
2. Izpildiet: `npm install`
3. Izpildiet: `npm start` (pēc noklusējuma klausās uz porta 8080).
4. Pārliecinieties, ka ports 8080 ir atvērts ugunsmūrī.

---

## 📂 Projekta struktūra
* `public/` - Visi klienta puses faili (HTML, CSS, JS, Attēli, Skaņa).
  * `js/script.js` - Galvenā spēles loģika.
  * `php/` - PHP endpoints rezultātu saglabāšanai un tulkošanai.
  * `data/` - Jautājumi (JSON) un Leaderboard dati.
* `ws-server/` - Node.js WebSocket serveris daudzspēlētāju režīmam.

---

## 📝 Autori
* **Niks Šenvalds**
* **Dans Bitenieks**

---
> © 2026 Mācību darbs - Liepājas ekskursija.
