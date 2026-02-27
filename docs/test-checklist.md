# QA Test Checklist - Ekskursija Liepāja

## Pass Items

- [x] **Full Singleplayer Playthrough:** Start -> Select singleplayer -> Complete all 10 locations -> Finale Quiz -> End Screen.
- [x] **Wrong Answer + Retry Penalty:**
    - [x] Incorrect answer triggers visual feedback (shake/vibration).
    - [x] Second attempt awards fewer points (handled in `QuestionOverlay.jsx`).
    - [x] Failing twice reveals correct answer and gives zero points.
- [x] **Final Unlock Flow:** Finale Quiz triggers correctly after all locations are visited.
- [x] **Theme Switching:** Day/Night cycle works (check `App.jsx` and `DayNight.js`).
- [x] **Mobile 320px Check:** UI is usable on small screens without overflow (added responsive CSS rules).
- [x] **Multiplayer with Two Clients:**
    - [x] Players can see each other on the map.
    - [x] Cooperative sessions (Navigator/Operator) can be initiated and completed.
- [x] **Refresh Mid-session:**
    - [x] Player state is persisted via `localStorage` (hook `usePersistence`).
    - [x] Reconnect logic in `SocketManager` restores lobby/game association.
- [x] **Zero Console Errors:** 
    - [x] `EventBridge` handles errors gracefully.
    - [x] `src/js/server.js` validates inputs.
- [x] **Deployment Stability:**
    - [x] `npm install` and `npm start` work without pre-installed `node_modules`.
    - [x] `ConnectionStatus` overlay appears when server is down.

## Technical Checks
- [x] `node_modules` removed from git index.
- [x] `.gitignore` updated.
- [x] `package.json` scripts are accurate.
- [x] JSDoc types provide coverage for core multiplayer logic.
