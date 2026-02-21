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
| Frontend | React 18, Vite, HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3.2 |
| Spēļu dzinējs | Phaser 3 (mini-spēles) |
| Backend | Node.js + PHP (leaderboard, multiplayer lobby) |
| Real-time | Socket.IO 4.8 (WebSocket + polling fallback) |
| Datubāze | Supabase (PostgreSQL) |
| Cits | Google Fonts (Poppins), LocalStorage, AI: Gemini, Claude, Copilot |

---

## Struktūra

```
Ekskursija-Liepaja/
├── index.html              # Galvenā izvēlne (legacy)
├── map.html                # Spēles karte (legacy)
├── style.css               # Globālie stili
├── atteli/                 # Attēli
├── skana/                  # Audio
├── src/
│   ├── js/
│   │   ├── script.js       # Spēles loģika (legacy)
│   │   └── server.js       # ★ Socket.IO serveris (Node.js)
│   ├── php/                # Backend (leaderboard, lobby, anti-cheat)
│   └── data/               # lobbies.json, questions.json, answers.json
├── client/                 # React + Phaser — viena spēlētāja režīms
│   └── src/
│       ├── components/     # React UI (izvēlnes, modālie logi)
│       ├── phaser/scenes/  # Phaser mini-spēles
│       └── context/        # React konteksts (Game, Admin, Audio, Theme)
└── game/                   # React + Phaser — multiplayer režīms
    └── src/
        ├── components/     # UI (leaderboard, coop, flash quiz)
        ├── phaser/scenes/  # Phaser ainas (flashlight, keypad, catcher, sequence)
        ├── utils/
        │   ├── SocketManager.js  # ★ Socket.IO klients (singleton)
        │   ├── CoopState.js      # Co-op stāvokļa pārvaldība
        │   ├── AntiCheat.js      # Anti-cheat validācija
        │   └── ...               # EventBridge, DayNight, Leaderboard u.c.
        └── data/           # LocationData, CoopData
```

---

## Socket.IO struktūra

Reāllaika multiplayer funkcionalitāte izmanto **Socket.IO 4.8** (WebSocket ar polling fallback).

### Galvenie faili

| Fails | Apraksts |
|-------|----------|
| `src/js/server.js` | **Serveris** — Node.js Socket.IO serveris ar diviem namespace |
| `game/src/utils/SocketManager.js` | **Klients** — Singleton Socket.IO klients (`/game` namespace) |
| `game/src/components/CoopManager.jsx` | React komponents — klausās 15+ Socket.IO notikumus |
| `game/src/components/AdminPanel.jsx` | Admin panelis — tieša savienošanās ar `/admin` namespace |

### Namespace

| Namespace | Mērķis |
|-----------|--------|
| `/game` | Spēlētāju savienojumi — spēles notikumi, co-op, flash quiz, loot |
| `/admin` | Administrēšana (aizsargāts ar `ADMIN_SECRET`) — spēlētāju saraksts, logi, jautājumu maiņa |

### Galvenie notikumi (serveris ↔ klients)

**Klients → Serveris:**

| Notikums | Apraksts |
|----------|----------|
| `player:join` | Reģistrē spēlētāja vārdu |
| `player:location` | Ziņo pašreizējo lokāciju |
| `player:complete` | Lokācija pabeigta + rezultāts |
| `location:join` / `location:leave` | Ienāk/iziet no lokācijas |
| `coop:request` / `coop:accept` | Co-op pieprasījums un pieņemšana |
| `lobby:create` / `lobby:join` | Multiplayer lobby darbības |
| `ping:req` | Latentuma mērījums |

**Serveris → Klients:**

| Notikums | Apraksts |
|----------|----------|
| `map:presence` | Visu spēlētāju lokācijas kartē |
| `city:progress` | Pilsētas kopējais progress (%) |
| `flash_quiz:start` / `flash_quiz:result` | Flash viktorīna (≥3 spēlētāji) |
| `coop:session_start` | Co-op sesija sākas |
| `loot:pool_update` | Kopīgo priekšmetu statuss |
| `questions:override` / `questions:reset` | Jautājumu hot-swap no admin |
| `session:refresh` | Admin piespiedu sesijas atjaunošana |

### Datu plūsma

```
Klients (game/)  ──Socket.IO──▶  Node.js serveris (src/js/server.js)
                                    │
                           ┌────────┼────────┐
                           ▼        ▼        ▼
                    /game namespace  Supabase  /admin namespace
                           │        (DB)      │
                           ▼                  ▼
                  Visi savienotie       Admin panelis
                    klienti
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
