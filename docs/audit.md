# Project Audit - Ekskursija Liepāja

## Strengths
- **Diverse Activity Sets:** Includes multiple minigames (Regatta, Sequence, Catcher, etc.) and quizzes.
- **Multiplayer Support:** Has both a lobby-based raw WebSocket system and a Socket.io-based real-time system with cooperative features.
- **Advanced Features:** Includes anti-cheat, dynamic difficulty, day/night cycles, and global progress tracking.
- **Tech Stack:** Modern stack in subdirectories (`game/` uses React + Phaser + Vite).

## Issues
### High Priority
- **Redundancy & Confusion:** The repo contains at least 3-4 versions of the game (root, `game/`, `client/`, `main/`). It's unclear which one is the "live" one.
- **Committed `node_modules`:** Large amount of library code is committed to git, bloating the repo.
- **Deployment Complexity:** Multiple `package.json` files and server entry points.
- **Error Handling:** Root `script.js` suppresses console errors, making debugging difficult.

### Medium Priority
- **Inconsistent UI:** Different versions have different UI styles.
- **Code Organization:** `src/js/script.js` is over 3800 lines long.
- **Mixed Protocols:** Uses both raw WebSockets and Socket.io on the same port, which might cause conflicts or confusion.

### Low Priority
- **Language/Spelling:** Some inconsistent naming between Latvian and English in code.
- **Unused Files:** Many legacy files (like `lobby.php`) seem to be replaced by the Node server.

## Deployment Risks
- **Supabase Dependency:** The server relies on Supabase for DB writes but defaults to disabled if env vars are missing.
- **Port Conflict:** Multiple servers might try to bind to port 8080 if not carefully managed.
- **Static vs Dynamic:** PHP backend mixed with Node.js backend.

## Merge Risks (Maksligais-nocopilot vs main)
- **Extreme Divergence:** Almost every file has been moved, renamed, or heavily modified.
- **Structural Overlap:** Files like `index.html` and `style.css` exist in both branches but with completely different content/structure.
- **Dependency Conflicts:** `main` uses a simple `ws-server/` while this branch has a complex `src/js/server.js`.

## Recommendation
- Focus on the `game/` (React/Phaser) version as it provides the most "premium" feel.
- Clean up the root directory by moving legacy/redundant versions to an `archive/` folder if they must be kept.
- Consolidate the Node server to handle all multiplayer needs through Socket.io.
