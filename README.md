# 🗺️ Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle, kuras mērķis ir iepazīstināt lietotājus ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām, pildot dažādus uzdevumus un sacenšoties par labākajiem rezultātiem.

---

## 📝 Par projektu

Šis projekts tika izstrādāts kā mācību darbs. Spēle piedāvā virtuālu ekskursiju pa Liepāju, kurā spēlētājam jāatrod objekti kartē, jāatbild uz jautājumiem un jāsacenšas par labāko rezultātu. Spēlē ir iespējams spēlēt vienam vai ar draugu reālajā laikā.

**Autori:**
* **Niks Šenvalds** (Grupa 2PT)
* **Dans Bitenieks** (Grupa 2PT)

---

## 📸 Ekrānuzņēmumi

| Galvenā izvēlne | Spēles režīmu izvēle |
|---|---|
| ![Galvenā izvēlne](atteli/screenshots/menu.png) | ![Spēles režīmu izvēle](atteli/screenshots/mode.png) |

| Iestatījumi | Spēles karte |
|---|---|
| ![Iestatījumi](atteli/screenshots/settings.png) | ![Spēles karte](atteli/screenshots/map.png) |

---

## 🚀 Galvenā funkcionalitāte

### 🎮 Spēles režīmi
* **Viena spēlētāja režīms:** Izpēti Liepāju savā tempā
* **Multiplayer režīms:** Spēlē ar draugu reālajā laikā, izmantojot WebSocket savienojumu

### 🗺️ Interaktīvā karte
* Liepājas karte ar 10 aktīviem apmeklējuma punktiem
* Dinamiska punktu aktivizācija (spīdošs efekts aktīvajiem punktiem)
* Tooltip ar vietas nosaukumu, uzvedot peli
* Punkti ir sagrupēti pēc kategorijām:
    * 🟢 **Zaļš:** Daba un atpūta
    * 🔵 **Zils:** Kultūra un vēsture
    * 🟡 **Dzeltens:** RTU Liepājas akadēmija
    * 🔴 **Sarkans:** Industrija un osta

### 🎯 Uzdevumu sistēma
* Katrai vietai ir unikāls interaktīvs uzdevums (viktorīnas, mini-spēles, secības uzdevumi)
* Punktu skaitīšana:
    * ✅ Pareiza atbilde pirmajā mēģinājumā: **+10 punkti**
    * ⚠️ Pareiza atbilde pēc 1 nepareizas: **+5 punkti**
    * ❌ 2 nepareizas atbildes: **0 punkti**, atbilde tiek parādīta
* Teorija par vietu tiek parādīta pirms uzdevuma — atbildes jāatrod pašam
* Secīga vietu izpilde (jāievēro noteikta kārta)

### 📊 Rezultātu sistēma
* **Top 10 rezultātu tabula** ar labākajiem spēlētājiem
* Kombinēts vērtējums: punkti + laiks
* Laika uzskaite spēles laikā
* Rezultātu saglabāšana servera pusē (PHP + leaderboard.txt)

### 🎨 Lietotāja saskarne
* Animēts trīsstūru fona efekts ar 3D perspektīvu
* 4 krāsu tēmas (Noklusējuma, Violeta, Tumši sarkana, Zila)
* Virsraksts un akcenti mainās atbilstoši izvēlētajai tēmai
* Poppins fonts visam tekstam
* Animētas modālās lodziņi un pogas
* Custom paziņojumu sistēma
* Responsive dizains visiem ekrāna izmēriem

### ⚙️ Iestatījumi
* Mūzikas skaļuma kontrole
* Skaņas efektu skaļuma kontrole
* 4 krāsu tēmas
* Animāciju ieslēgšana/izslēgšana
* Iestatījumi pieejami gan galvenajā izvēlnē, gan spēles laikā

### 🔌 Real-time funkcionalitāte
* WebSocket savienojums multiplayer režīmam
* PHP polling kā fallback hostinga vidēm
* Connection status indikators
* Lobby sistēma ar unikāliem kodiem
* Reāllaika spēlētāju sinhronizācija

---

## 🛠️ Tehnoloģijas

* **Frontend:**
  * HTML5 - Semantiska lapas struktūra
  * CSS3 - Moderns dizains ar gradientiem, animācijām un pārejām
  * JavaScript (ES6+) - Spēles loģika, WebSocket komunikācija, DOM manipulācija
  * Google Fonts (Poppins) - Tipografija

* **Backend:**
  * PHP - Rezultātu saglabāšana un leaderboard API
  * Node.js - WebSocket servera implementācija multiplayer režīmam

* **Papildus:**
  * WebSocket - Reāllaika divvirzienu komunikācija
  * LocalStorage - Lietotāja preferenču saglabāšana (tēma, skaļums, animācijas)
  * Bootstrap 5.3.2 - UI komponentu bāze

---

## 📁 Projekta struktūra

```
Ekskursija-Liepaja/
├── index.html              # Galvenā izvēlne
├── map.html                # Spēles karte
├── style.css               # Visi stili
├── atteli/                 # Attēli (karte, gids)
├── skana/                  # Audio faili (mūzika, skaņas)
└── src/
    ├── js/
    │   ├── script.js       # Galvenā spēles loģika
    │   └── server.js       # WebSocket serveris
    ├── php/
    │   ├── leaderboard.php # Rezultātu tabula
    │   ├── save_score.php  # Rezultātu saglabāšana
    │   ├── lobby.php       # Multiplayer lobby backend
    │   └── mini_backend.php # Mini-spēļu backend
    └── data/
        ├── leaderboard.txt # Rezultātu fails
        └── lobbies.json    # Aktīvo lobby stāvoklis
```

---

## 🎯 Pabeigtas funkcijas

### ✅ Pilnībā implementēts
* [x] Interaktīva karte ar tooltip sistēmu
* [x] 10 apmeklējuma vietas ar unikāliem uzdevumiem
* [x] Punktu skaitīšana (+10/+5/0 sistēma)
* [x] Mini-spēles: laivas sacīkstes, kukaiņu ķeršana, vēstures secība
* [x] "Par spēli" logs ar pilnu informāciju
* [x] Iestatījumu logs (audio, tēma, animācijas)
* [x] Top 10 rezultātu tabula ar kombinēto vērtējumu
* [x] Rezultātu saglabāšana serverī ar anti-cheat validāciju
* [x] Multiplayer režīms ar WebSocket + PHP polling fallback
* [x] Custom paziņojumu sistēma (bez browser alerts)
* [x] 4 krāsu tēmas ar dinamisku virsrakstu
* [x] Animēts 3D trīsstūru fona efekts
* [x] Poppins fonts visam tekstam
* [x] Animētas pārejas un efekti
* [x] Connection status indikators
* [x] Sākuma ekrāns ar autoriem
* [x] Secīga vietu izpilde

---

## 🚀 Instalācija un palaišana

⚠️ **SVARĪGI: Tev vajag tikai PHP! Node.js nav obligāts.**

### Ātrā palaišana (Ieteicams):

Palaid vienu komandu:
```bash
php -S localhost:8000
```

Atvēr pārlūkprogrammā:
```
http://localhost:8000/index.html
```

✅ **Viss darbojas!** Multiplayer, leaderboard, viss!

### Papildus opcija: WebSocket (tikai localhost):

**⚠️ WebSocket darbojas TIKAI lokāli, NEVAR izmantot uz hostinga!**

Ja vēlies ātrāku multiplayer lokāli:

1. **1. terminālis - WebSocket:**
   ```bash
   npm install
   node src/js/server.js
   ```

2. **2. terminālis - PHP:**
   ```bash
   php -S localhost:8000
   ```

3. **Atvērt pārlūkprogrammā:**
   ```
   http://localhost:8000/index.html
   ```

---

## 📊 Multiplayer sistēma

Projekts izmanto **hibrīdu pieeju**:
- **PHP polling** (noklusējums) - Darbojas uz jebkura hostinga
- **WebSocket** (localhost) - Ātrāks, bet tikai lokālai izstrādei

Sistēma automātiski izvēlas labāko pieejamo variantu.

---

## 📚 Izmantotie resursi

* **Karte:** OpenStreetMap (© OpenStreetMap contributors)
* **Attēli:**
  * Kaija (Gids): Autoru oriģinālzīmējums
* **Informācija:** liepaja.lv, rtu.lv, Liepājas muzejs, wikipedia.org
* **Fonts:** Google Fonts (Poppins)
* **Tehnoloģijas:** Bootstrap 5.3.2, Node.js, WebSocket

---

## 📄 Licences

© 2026 Niks Šenvalds, Dans Bitenieks.

Šis projekts ir izstrādāts izglītības nolūkos.
