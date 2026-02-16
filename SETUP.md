# 🚀 Kā palaist projektu lokāli / How to Run Locally

## Problēma / Problem

### WebSocket kļūda:
```
Firefox can't establish a connection to the server at wss://liepajaprojekts.gamer.gd:8080/
```

### Leaderboard kļūda:
```
GET https://liepajaprojekts.gamer.gd/php/leaderboard.php [HTTP/1.1 404 Not Found]
```

**Abas kļūdas nozīmē, ka tev jāpalaiž serveris lokāli, jo tu nekontrolē hosting uz liepajaprojekts.gamer.gd.**

**Both errors mean you need to run the server locally since you don't control the hosting.**

---

## ⚡ Ātrā palaišana / Quick Start

### 🎯 VIENKĀRŠĀKAIS VEIDS (Tikai PHP)

**Tu vajag tikai PHP!** Node.js nav nepieciešams.

### 1️⃣ Instalē PHP (Obligāti / Required)  
- Lejupielādē: https://www.php.net/downloads
- Nepieciešams leaderboard un multiplayer darbībai

Pārbaudi instalāciju:
```bash
php --version
```

### 2️⃣ Palaid vienu komandu:

**Linux/Mac:**
```bash
php -S localhost:8000
```

**Windows:**
```bash
php -S localhost:8000
```

### 3️⃣ Atvēr pārlūkprogrammā:

```
http://localhost:8000/index.html
```

✅ **Tas ir viss! Tagad viss darbojas:**
- ✅ Viena spēlētāja režīms
- ✅ Multiplayer režīms (PHP polling)
- ✅ Leaderboard
- ✅ Rezultātu saglabāšana

---

## 🚀 Papildus: Node.js (Tikai lokālai izstrādei)

**⚠️ Node.js WebSocket serveris darbojas TIKAI uz localhost!**  
**⚠️ To NEVAR izmantot uz parasta hostinga!**

Ja vēlies ātrāku multiplayer savienojumu lokāli:

### 1️⃣ Instalē Node.js
- Lejupielādē: https://nodejs.org/

### 2️⃣ Palaid abus serverus

**1. terminālis - WebSocket serveris:**
```bash
npm install
node src/js/server.js
```

**2. terminālis - PHP serveris:**
```bash
php -S localhost:8000
```

Sistēma automātiski izmantos WebSocket, ja tas ir pieejams.

---

## 🎮 Kas darbojas bez Node.js?

### ✅ Ar tikai PHP serveri:
- 🎯 Viena spēlētāja režīms - **Pilnībā darbojas**
- 👥 Multiplayer režīms - **Darbojas** (PHP polling, 2s latence)
- 🏆 Leaderboard - **Darbojas**
- 💾 Rezultātu saglabāšana - **Darbojas**

### ⚡ Ar PHP + Node.js (tikai localhost):
- 👥 Multiplayer - **Ātrāks** (real-time WebSocket, <100ms latence)

---

## 🔧 Problēmu risināšana / Troubleshooting

### Kļūda: "Port 8080 already in use"

Ports jau ir aizņemts. Apstādini citu procesu vai izmanto citu portu:

```bash
# Linux/Mac: Atrodi procesu uz porta 8080
lsof -i :8080
kill -9 <PID>

# Windows: Atrodi un apstādini procesu
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

Vai izmanto citu portu, rediģējot `src/js/server.js` un `src/js/script.js`:
- Maini `port: 8080` uz `port: 8081` failā `server.js`
- Maini `const WS_PORT = 8080;` uz `const WS_PORT = 8081;` failā `script.js`

### Kļūda: "npm: command not found"

Node.js nav instalēts. Lūdzu, instalē Node.js no: https://nodejs.org/

### WebSocket joprojām nedarbojas

1. Pārliecinies, ka serveris darbojas (skatīt 3. soli)
2. Pārbaudi, vai lietojat `localhost`, nevis `127.0.0.1` vai kādu citu domēnu
3. Atver pārlūkprogrammas konsoli (F12) un pārbaudi kļūdu ziņojumus

---

## 📦 Kas tiek instalēts? / What gets installed?

Tikai viena atkarība:
- **ws** (v8.19.0) - WebSocket bibliotēka Node.js

---

## 🌐 Spēlēšana tīklā / Playing over Network

Ja vēlies spēlēt ar draugu no cita datora tajā pašā tīklā:

1. Palaid serveri kā parasti
2. Uzzini savu lokālo IP adresi:
   ```bash
   # Linux/Mac
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

3. Draugs var piekļūt spēlei caur:
   ```
   http://<TAVA-IP>:8000/index.html
   ```
   Piemēram: `http://192.168.1.100:8000/index.html`

⚠️ **Ievērošana:** WebSocket serverim jābūt pieejamam no drauga datora. Pārliecinies, ka ugunsmūris ļauj savienojumus uz portu 8080.

---

## ☁️ Izvietošana uz servera / Deploying to a Server

Ja vēlies izvietot projektu uz reāla servera ar savu domēnu:

1. Augšupielādē visus failus uz serveri
2. Palaid WebSocket serveri kā background process:
   ```bash
   nohup node src/js/server.js > server.log 2>&1 &
   ```
   
3. Izmanto reverse proxy (piemēram, nginx vai Apache), lai nodrošinātu HTTPS un WebSocket atbalstu

4. Pārliecinies, ka:
   - Ports 8080 ir atvērts ugunsmūrī
   - SSL sertifikāts ir uzstādīts (ja izmanto HTTPS)
   - WebSocket tiek pareizi novirzīts caur reverse proxy

---

## 💡 Papildu informācija / Additional Info

- WebSocket serveris ir iestatīts uz `localhost:8080`
- Klients automātiski izvēlas `ws://` vai `wss://` atkarībā no lapas protokola
- Ja lapa darbojas uz HTTPS, tad WebSocket arī izmantos WSS (drošs savienojums)
- Servera kods atrodas: `src/js/server.js`
- Klienta kods atrodas: `src/js/script.js`

---

## 📞 Palīdzība / Help

Ja rodas problēmas:
1. Pārbaudi, vai visi soļi ir pareizi izpildīti
2. Atver pārlūkprogrammas konsoli (F12) un pārbaudi kļūdu ziņojumus
3. Pārbaudi, vai ports 8080 ir brīvs
4. Pārbaudi server.log failu, ja tas ir izveidots

Veiksmi spēlē! 🎮
