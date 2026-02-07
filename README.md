# 🗺️ Mācību ekskursija Liepājā

Interaktīva tīmekļa spēle, kuras mērķis ir iepazīstināt lietotājus ar Liepājas kultūrvēsturiskajām vietām, uzņēmumiem un izglītības iespējām, pildot dažādus uzdevumus.
![title](https://i.ytimg.com/vi/pTI00QxgScI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBMQu4OX7XOQC2yuU-ApsFXK1TvHA)
---

## 📝 Par projektu

Šis projekts tika izstrādāts kā mācību darbs. Spēle piedāvā virtuālu ekskursiju pa Liepāju, kurā spēlētājam jāatrod objekti kartē, jāatbild uz jautājumiem un jāsacenšas par labāko rezultātu.

**Autori:**
* **Niks Šenvalds** (Grupa 2PT)
* **Dans Bitenieks** (Grupa 2PT)

---
## 🚀 Funkcionalitāte

Spēle ietver šādas funkcijas, balstoties uz prasībām:

* **Interaktīva karte:** Liepājas karte ar aktīviem punktiem, kurus var izvēlēties.
* **Objektu kategorijas:**
    * 🟢 **Zaļš:** Daba un atpūta (Viegli)
    * 🔵 **Zils:** Kultūra un vēsture (Vidēji)
    * 🟡 **Dzeltens:** RTU Liepājas akadēmija (Eksperts)
    * 🔴 **Sarkans:** Industrija un osta (Izaicinājums)
* **Uzdevumu sistēma:** Katrā vietā ir unikāls uzdevums.
* **Punktu skaitīšana:**
    * Pareiza atbilde: **+10 punkti**.
    * Kļudaina atbilde: **-5 punkti**.
* **Laika uzskaite:** Tiek fiksēts laiks, cik ilgi spēlētājs pavada spēlē.
* **Top 10 Rezultāti:** Pēc spēles beigām rezultāts (Vārds, Punkti, Laiks) tiek saglabāts serverī un attēlots "Leaderboard" tabulā.
* **Iestatījumi:** Iespēja mainīt mūzikas un skaņas efektu skaļumu, kā arī valodu (LV/EN).

---
## 🛠️ Tehnoloģijas

* **HTML** - Lapas struktūra un saturs.
* **CSS** - Dizains, animācijas un responsivitāte.
* **JavaScript** - Spēles loģika, interaktivitāte, punktu skaitīšana.
* **PHP** - Datu apstrāde servera pusē (rezultātu saglabāšana failā `leaderboard.txt`).

---

## 🛠️ Izstrādes gaita (TODO)

### 🟢 Pabeigts
* [x] **V2, V4:** "Par spēli" logs ar noteikumiem un aizvēršanas iespēju.
* [x] **V5, P1:** Sākuma poga atver interaktīvu Liepājas karti.
* [x] **P2:** Kartē uzvedot peli uz punkta, parādās vietas nosaukums (Tooltip).
* [x] **P3:** Punktiem ir dažādas krāsas (kategorijas) un grūtība.
* [x] **V6:** Spēlē ir iekļautas 10 apmeklējuma vietas.
* [x] **V12, P4:** Pārstāvētas visas kategorijas (Kultūra, Daba, Uzņēmumi).
* [x] **V13:** Katru vietu var izspēlēt tikai vienu reizi.
* [x] **V19, P8:** Beigu ekrāns ar rezultātu un vārda ievadi.
* [x] **V20:** Sadaļā "Par spēli" norādīti autori un tehnoloģijas.
* [x] **P9:** Rezultātu saglabāšana failā (`leaderboard.txt`).

### 🔵 Daļēji pabeigts
* [ ] **V1 (Titulkadrs):** Autori ir redzami sadaļā "Par spēli", tiem jābūt ari sākuma ekrānā.
* [ ] **P10 (Top 10):** Tabula strādā, bet tā kārto pēc **punktiem**, savukārt prasība nosaka kārtošanu pēc **laika** (augošā secībā).
* [ ] **P6 (Statistika):** Tiek parādīti tikai punkti. Varētu pievienot papildus statistiku (piem., pareizās/nepareizās atbildes).
* [ ] **V15, V16:** Punktu skaitīšana (+10) un samazināšana kļūdas gadījumā (-5).

### 🟡 Jāizdara / Jālabo
* [ ] **V3:** Logā "Par spēli" trūkst pogas "Sākt spēli".
* [ ] **P5 (Nejauši jautājumi):** Katrai vietai šobrīd ir tikai viens jautājums. Jābūt vairākiem, kas izkrīt nejauši.
* [ ] **V14 (Ārējs fails):** Jautājumi jāielādē no ārēja faila (piem. JSON), nevis jāieraksta kodā.
* [ ] **V17 (Pēdējā aktivitāte):** Spēles beigām obligāti jābūt "atpūtas vietā".
* [ ] **V18 (Bloķēšana):** Jāizliedz aizvērt jautājuma logu ar `ESC` taustiņu, kamēr nav atbildēts.
* [ ] **P7 (Laiks):** Jāuzskaita spēles ilgums (minūtes/sekundes), nevis pulksteņa laiks.
* [ ] **P11 (Noteikumi kartē):** Kartes skatā jāpievieno poga, lai atvērtu noteikumus.
* [ ] **V7, V8, V9:** Uzklikšķinot uz punkta, atveras logs ar info un uzdevumu.

---
## 📚 Izmantotie avoti
* **Karte:** OpenStreetMap
* **Attēli:** Freepik, Autoru zīmējumi (Gids "Kaija")
* **Informācija:** liepaja.lv, rtu.lv

---
> © 2026 Niks Šenvalds, Dans Bitenieks.
