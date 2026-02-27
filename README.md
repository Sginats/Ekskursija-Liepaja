# 🗺️ Mācību ekskursija Liepājā — Competition Edition 🏆

Interaktīva tīmekļa spēle, kuras mērķis ir iepazīstināt lietotājus ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām. Šī ir uzlabotā versija ar React, Phaser un Socket.io atbalstu.

![title](https://i.ytimg.com/vi/pTI00QxgScI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBMQu4OX7XOQC2yuU-ApsFXK1TvHA)

---

## 🚀 Galvenās funkcijas

*   **Premium UI/UX:** Moderna saskarne izmantojot React un pielāgotu dizaina sistēmu.
*   **Interaktīvas Mini-spēles:** Izstrādātas ar Phaser dzinēju (Regate, Secība, Ķērājs u.c.).
*   **Daudzspēlētāju Režīms:** Reāllaika sadarbība un sacensība izmantojot Socket.io.
*   **Kooperatīvie Uzdevumi:** Dual-key un Navigator/Operator režīmi kopīgai spēlēšanai.
*   **Globālais Progress:** Visi spēlētāji kopā palīdz pilsētas attīstībā.
*   **Anti-Cheat & Validācija:** Droša punktu skaitīšana un servera puses pārbaudes.
*   **Responsivitāte:** Pilnīgs atbalsts no 320px mobilajām ierīcēm līdz desktopam.

---

## 🛠️ Uzstādīšana un Palaišana

Projekts sastāv no divām galvenajām daļām: **Serveris** (Node.js) un **Klients** (React/Phaser).

### 1. Servera uzstādīšana
1.  Atveriet termināli projekta saknes mapē.
2.  Izpildiet: `npm install`
3.  Izveidojiet `.env` failu (izmantojiet `.env.example` kā paraugu).
4.  Palaidiet: `npm start` (noklusējuma ports: 8080).

### 2. Spēles klienta uzstādīšana
1.  Atveriet termināli `game/` mapē.
2.  Izpildiet: `npm install`
3.  Palaidiet izstrādes režīmā: `npm run dev`
4.  Lai uzbūvētu produkcijas versiju: `npm run build`

---

## 📂 Projekta struktūra

*   `game/` — Galvenais spēles klients (React + Phaser + Vite).
*   `src/js/server.js` — Socket.io un WebSocket serveris.
*   `src/data/` — Jautājumi (JSON) un spēles dati.
*   `public/` — Mantotie (Legacy) klienta faili.
*   `docs/` — Audita un testēšanas dokumentācija.

---

## 📝 Autori
*   **Niks Šenvalds**
*   **Dans Bitenieks**

---
> © 2026 Mācību darbs — Liepājas ekskursija (Maksligais-nocopilot Edition).
