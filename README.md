# Macību ekskursija Liepājā

Interaktīva tīmekļa spēle par Liepājas kultūrvēsturiskajām vietām. Izpēti 10 apmeklējuma punktus kartē, atbildi uz jautājumiem un sacenšoties par vietu Top 10!

**Autori:** Niks Šenvalds, Dans Bitenieks (Grupa 2PT)

---

## Ekrānuzņēmumi

| Galvenā izvēlne | Karte |
|---|---|
| ![Galvenā izvēlne](https://github.com/user-attachments/assets/2c789e74-9af4-4ac9-b5b8-a9ad561d3fb2) | ![Karte](https://github.com/user-attachments/assets/760394d0-f15d-4934-ab0f-836fe24204ce) |

| Spēles režīms | Iestatījumi |
|---|---|
| ![Spēles režīms](https://github.com/user-attachments/assets/a781828b-e696-47cf-8716-8363b8c1eaf2) | ![Iestatījumi](https://github.com/user-attachments/assets/5565a59e-b661-4354-96c9-d15137f8de0c) |

---

## Spēles noteikumi

1. Apmeklē **10 vietas** Liepājā noteiktā secībā.
2. Katrā vietā saņem informāciju par vietu un **uzdevumu** (jautājums, mini-spēle vai secības uzdevums).
3. Punktu sistēma:
   - Pareiza atbilde 1. mēģinājumā — **+10 punkti**
   - Pareiza atbilde pēc 1 kļūdas — **+5 punkti**
   - 2 kļūdas — **0 punkti**, atbilde parādās automātiski
4. Pēdējā vieta vienmēr ir **atpūtas vieta**.
5. Spēles beigās parādās **noslēguma tests** — 5 jautājumi par Liepāju (katra pareiza atbilde: +2 bonusa punkti, maks. +10).
6. Saglabā rezultātu un iekļūsti **Top 10**! Maksimālais rezultāts: **110 punkti**.

---

## Kartes leģenda

| Krāsa | Kategorija |
|-------|-----------|
| Zals | Daba un atpūta |
| Zils | Kultūra un vēsture |
| Dzeltens | RTU Liepājas akadēmija |
| Sarkans | Industrija un osta |

---

## Galvenās funkcijas

- **Viena spēlētāja** un **multiplayer** režīms (spēlē ar draugu reālajā laikā)
- **Mini-spēles:** laivas sacīkstes, kukaiņu ķeršana, vēstures secības kārtošana
- **Noslēguma tests:** 5 jautājumi pēc visu 10 vietu apmeklēšanas
- **4 krāsu tēmas:** Noklusējuma (zelts), Violeta, Tumši sarkana, Zila
- **Animēts fons:** daļiņu sistēma, kas pielāgojas izvēlētajai tēmai
- **Iestatījumi:** mūzikas/SFX skaļums, tēma, animācijas on/off
- **Top 10 tabula** ar kombinēto punktu + laika vērtējumu

---

## Tehnoloģijas

| Slānis | Rīki |
|--------|------|
| Frontend | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3.2 |
| Backend | PHP (leaderboard, multiplayer lobby) |
| Real-time | WebSocket (Node.js) + PHP polling fallback |
| Cits | Google Fonts (Poppins), LocalStorage, AI: Gemini, Claude, Copilot |

---

## Struktūra

```
Ekskursija-Liepaja/
├── index.html          # Galvenā izvēlne
├── map.html            # Spēles karte
├── style.css           # Visi stili
├── atteli/             # Attēli
├── skana/              # Audio
└── src/
    ├── js/
    │   ├── script.js   # Spēles loģika
    │   └── server.js   # WebSocket serveris
    ├── php/            # Backend (leaderboard, lobby, mini-spēles)
    └── data/           # leaderboard.txt, lobbies.json
```

---

## Palaišana

> Vajadzīgs tikai **PHP**. Node.js ir neobligāts.

```bash
# Ieteicamā metode
php -S localhost:8000
# Atvērt: http://localhost:8000/index.html
```

**Papildus — ātrāks WebSocket lokāli** *(tikai localhost, uz hostinga nedarbojas)*:

```bash
# 1. terminālis
npm install && node src/js/server.js

# 2. terminālis
php -S localhost:8000
```

Sistēma automātiski izvēlas labāko pieejamo savienojumu (WebSocket → PHP polling).

---

## Resursi

- **Karte:** OpenStreetMap (© OpenStreetMap contributors)
- **Gida attēls (Kaija):** Autoru oriģinālzīmējums
- **Informācija:** liepaja.lv, rtu.lv, Liepājas muzejs, wikipedia.org
- **Audio:** Brīvās licences mūzika, autoru SFX ieraksti

---

© 2026 Niks Šenvalds, Dans Bitenieks — izglītības projekts.
