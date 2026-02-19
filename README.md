# 🗺️ Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle par Liepājas kultūrvēsturiskajām vietām. Izpēti 10 apmeklējuma punktus kartē, atbildi uz jautājumiem un sacenšoties par vietu Top 10!

**Autori:** Niks Šenvalds, Dans Bitenieks (Grupa 2PT)

---

## 🎮 Spēles noteikumi

1. Apmeklē **10 vietas** Liepājā noteiktā secībā.
2. Katrā vietā saņem informāciju par vietu un **uzdevumu** (jautājums, mini-spēle vai secības uzdevums).
3. Punktu sistēma:
   - ✅ Pareiza atbilde 1. mēģinājumā → **+10 punkti**
   - ⚠️ Pareiza atbilde pēc 1 kļūdas → **+5 punkti**
   - ❌ 2 kļūdas → **0 punkti**, atbilde parādās automātiski
4. Pēdējā vieta vienmēr ir **atpūtas vieta**.
5. Spēles beigās saglabā rezultātu un iekļūsti **Top 10**!

---

## 🗺️ Kartes leģenda

| Krāsa | Kategorija |
|-------|-----------|
| 🟢 Zaļš | Daba un atpūta |
| 🔵 Zils | Kultūra un vēsture |
| 🟡 Dzeltens | RTU Liepājas akadēmija |
| 🔴 Sarkans | Industrija un osta |

---

## ✨ Galvenās funkcijas

- **Viena spēlētāja** un **multiplayer** režīms (spēlē ar draugu reālajā laikā)
- **Mini-spēles:** laivas sacīkstes, kukaiņu ķeršana, vēstures secības kārtošana
- **4 krāsu tēmas:** Noklusējuma (zelts), Violeta, Tumši sarkana, Zila
- **Animēts fons:** daļiņu sistēma, kas pielāgojas izvēlētajai tēmai
- **Iestatījumi:** mūzikas/SFX skaļums, tēma, animācijas on/off
- **Top 10 tabula** ar kombinēto punktu + laika vērtējumu

---

## 🛠️ Tehnoloģijas

| Slānis | Rīki |
|--------|------|
| Frontend | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3.2 |
| Backend | PHP (leaderboard, multiplayer lobby) |
| Real-time | WebSocket (Node.js) + PHP polling fallback |
| Cits | Google Fonts (Poppins), LocalStorage, AI: Gemini, Claude, Copilot |

---

## 📁 Struktūra

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

## 🚀 Palaišana

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

## 📚 Resursi

- **Karte:** OpenStreetMap (© OpenStreetMap contributors)
- **Gida attēls (Kaija):** Autoru oriģinālzīmējums
- **Informācija:** liepaja.lv, rtu.lv, Liepājas muzejs, wikipedia.org
- **Audio:** Brīvās licences mūzika, autoru SFX ieraksti

---

© 2026 Niks Šenvalds, Dans Bitenieks — izglītības projekts.
