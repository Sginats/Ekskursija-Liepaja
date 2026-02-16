# 🗺️ Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle, kuras mērķis ir iepazīstināt lietotājus ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām, pildot dažādus uzdevumus un sacenšoties par labākajiem rezultātiem.

![title](https://i.ytimg.com/vi/pTI00QxgScI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBMQu4OX7XOQC2yuU-ApsFXK1TvHA)

---

## 📝 Par projektu

Šis projekts tika izstrādāts kā mācību darbs. Spēle piedāvā virtuālu ekskursiju pa Liepāju, kurā spēlētājam jāatrod objekti kartē, jāatbild uz jautājumiem un jāsacenšas par labāko rezultātu. Spēlē ir iespējams spēlēt vienam vai ar draugu reālajā laikā.

**Autori:**
* **Niks Šenvalds** (Grupa 2PT)
* **Dans Bitenieks** (Grupa 2PT)

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
* Katrai vietai ir unikāls interaktīvs uzdevums
* Punktu skaitīšana:
    * ✅ Pareiza atbilde: **+10 punkti**
    * ❌ Nepareiza atbilde: **-5 punkti**
* Faktu uzrādīšana pēc atbildes sniegšanas
* Secīga vietu izpilde (jāievēro noteikta kārta)

### 📊 Rezultātu sistēma
* **Top 10 rezultātu tabula** ar ātrākajiem spēlētājiem
* Laika uzskaite spēles laikā
* Rezultātu saglabāšana servera pusē (PHP + leaderboard.txt)
* Rezultāti kārtoti pēc pabeigšanas laika

### 🎨 Lietotāja saskarne
* Profesionāls, tumšs dizains ar zelta akcentiem
* Animētas modālās lodziņi un pogās
* Custom paziņojumu sistēma (nevis browser alerts)
* Smooth hover efekti un transitions
* Responsive dizains

### ⚙️ Iestatījumi
* Mūzikas skaļuma kontrole
* Skaņas efektu skaļuma kontrole
* Valodu maiņa (Latviešu/Angļu) ar DeepL API integrāciju
* Iestatījumi pieejami gan galvenajā izvēlnē, gan spēles laikā

### 🔌 Real-time funkcionalitāte
* WebSocket savienojums multiplayer režīmam
* Connection status indikators
* Lobby sistēma ar unikāliem kodiem
* Reāllaika spēlētāju sinhronizācija

---

## 🛠️ Tehnoloģijas

* **Frontend:**
  * HTML5 - Semantiska lapas struktūra
  * CSS3 - Moderns dizains ar gradientiem, animācijām un pārejām
  * JavaScript (ES6+) - Spēles loģika, WebSocket komunikācija, DOM manipulācija

* **Backend:**
  * PHP - Rezultātu saglabāšana un leaderboard API
  * Node.js - WebSocket servera implementācija multiplayer režīmam

* **Papildus:**
  * WebSocket - Reāllaika divvirzienu komunikācija
  * DeepL API - Automātiska tulkošana
  * LocalStorage - Lietotāja preferenču saglabāšana

---

## 📁 Projekta struktūra

```
Ekskursija-Liepaja/
├── index.html              # Galvenā izvēlne
├── map.html                # Spēles karte
├── style.css               # Visi stili
├── atteli/                 # Attēli (karte, fons, gids)
├── skana/                  # Audio faili (mūzika, skaņas)
└── src/
    ├── js/
    │   ├── script.js       # Galvenā spēles loģika
    │   └── server.js       # WebSocket serveris
    ├── php/
    │   ├── leaderboard.php # Rezultātu tabula
    │   ├── save_score.php  # Rezultātu saglabāšana
    │   └── translate.php   # Tulkošanas API
    └── data/
        └── leaderboard.txt # Rezultātu fails
```

---

## 🎯 Pabeigtas funkcijas

### ✅ Pilnībā implementēts
* [x] Interaktīva karte ar tooltip sistēmu
* [x] 10 apmeklējuma vietas ar unikāliem jautājumiem
* [x] Punktu skaitīšana (+10/-5 sistēma)
* [x] "Par spēli" logs ar pilnu informāciju
* [x] Iestatījumu logs (audio + valoda)
* [x] Top 10 rezultātu tabula
* [x] Rezultātu saglabāšana serverī
* [x] Valodu atbalsts (LV/EN)
* [x] Multiplayer režīms ar WebSocket
* [x] Custom paziņojumu sistēma (bez browser alerts)
* [x] Profesionāls UX/UI dizains
* [x] Animētas pārejas un efekti
* [x] Connection status indikators
* [x] Sākuma ekrāns ar autoriem
* [x] Secīga vietu izpilde

---

## 🚀 Instalācija un palaišana

1. **Klonēt repozitoriju:**
   ```bash
   git clone https://github.com/Sginats/Ekskursija-Liepaja.git
   cd Ekskursija-Liepaja
   ```

2. **Palaist WebSocket serveri (multiplayer režīmam):**
   ```bash
   npm install
   node src/js/server.js
   ```

3. **Palaist ar lokālu serveri:**
   ```bash
   # Izmantojiet jebkuru web serveri, piemēram:
   php -S localhost:8000
   # vai
   python -m http.server 8000
   ```

4. **Atvērt pārlūkprogrammā:**
   ```
   http://localhost:8000/index.html
   ```

---

## 📚 Izmantotie resursi

* **Karte:** OpenStreetMap
* **Attēli:** 
  * Fons: Freepik
  * Kaija (Gids): Autoru oriģinālzīmējums
* **Informācija:** liepaja.lv, rtu.lv
* **Mūzika un skaņas:** Autoru izvēle

---

## 📄 Licences

© 2026 Niks Šenvalds, Dans Bitenieks. Visi tiesības aizsargātas.

Šis projekts ir izstrādāts izglītības nolūkos.
