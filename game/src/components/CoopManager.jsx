/**
 * CoopManager
 *
 * React context provider that:
 *   1. Connects to the Socket.io /game namespace via SocketManager
 *   2. Listens for all cooperative events from the server
 *   3. Maintains shared coop state via CoopState
 *   4. Exposes a CoopContext consumed by MapScreen, App, etc.
 *   5. Renders FlashQuiz and FinaleLobby overlays
 *
 * Usage:
 *   <CoopProvider playerName="Jānis" currentLocationId="dzintars">
 *     {children}
 *   </CoopProvider>
 *
 *   // Inside a child:
 *   const { otherPlayers, coopSession, sharedLoot, coopMultiplier } = useCoopContext();
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import SocketManager from '../utils/SocketManager.js';
import CoopState     from '../utils/CoopState.js';
import EventBridge   from '../utils/EventBridge.js';
import { LOCATIONS } from '../data/LocationData.js';
import FlashQuiz     from './FlashQuiz.jsx';
import FinaleLobby   from './FinaleLobby.jsx';

// ── Context ───────────────────────────────────────────────────────────────────
const CoopContext = createContext({
  otherPlayers:     [],
  occupiedLocations: new Set(),
  sharedLoot:       [],
  coopSession:      null,
  flashQuiz:        null,
  finaleLobby:      [],
  cityProgress:     { completed: 0, total: 0, pct: 0 },
  inboundRequest:   null,
  coopMultiplier:   1.0,
  requestCoop:      () => {},
  acceptCoop:       () => {},
  declineCoop:      () => {},
  shareClue:        () => {},
  submitDualKey:    () => {},
  useLootItem:      () => {},
  joinFinale:       () => {},
  dismissFlashQuiz: () => {},
});

export function useCoopContext() {
  return useContext(CoopContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export default function CoopProvider({ children, playerName, currentLocationId, score }) {
  const [state, setState] = useState(() => CoopState.get());
  const playerNameRef = useRef(playerName);

  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  // Sync CoopState → local React state
  useEffect(() => {
    const unsub = CoopState.subscribe(s => setState({ ...s }));
    return unsub;
  }, []);

  // ── Socket event wiring ───────────────────────────────────────────────────
  useEffect(() => {
    if (!playerName) return;

    const sock = SocketManager.connect();
    SocketManager.joinGame(playerName);

    const unsubs = [
      // Map presence: other players' locations
      SocketManager.on('map:presence', (list) => {
        const others = list.filter(p => p.socketId !== sock.id);
        const occupied = new Set(others.map(p => p.currentLocation).filter(Boolean));
        CoopState.set({ otherPlayers: others, occupiedLocations: occupied });
      }),

      // Location pulse (another player entered a location)
      SocketManager.on('location:pulse', ({ locationId, playerName: pName }) => {
        if (pName === playerNameRef.current) return; // skip own pulses
        // State update already handled by map:presence; nothing extra needed
      }),

      // City global progress
      SocketManager.on('city:progress', (progress) => {
        CoopState.set({ cityProgress: progress });
      }),

      // Loot pool updates
      SocketManager.on('loot:pool_update', (pool) => {
        CoopState.set({ sharedLoot: pool });
      }),

      // Loot item found by this player (server-triggered)
      SocketManager.on('loot:found_notification', ({ itemId }) => {
        // Will be displayed by parent; just expose via state
        CoopState.set({ latestLootFound: itemId });
      }),

      // Cooperative session started (dual-key validation or asymmetric)
      SocketManager.on('coop:session_start', (session) => {
        CoopState.set({ coopSession: session, coopMultiplier: 1.0 });
        // Bridge to Phaser for operator role: inject sessionId + coopRole into active scene
        EventBridge.emit('COOP_SESSION_START', {
          role:        session.role,
          partnerName: session.partnerName,
          locationId:  session.locationId,
          sessionId:   session.sessionId,
        });
      }),

      // Inbound coop request from another player
      SocketManager.on('coop:requested', (req) => {
        CoopState.set({ inboundRequest: req });
      }),

      // Coop request expired (requester left the location)
      SocketManager.on('coop:request_expired', () => {
        CoopState.set({ inboundRequest: null });
      }),

      // Partner left mid-session
      SocketManager.on('coop:partner_left', () => {
        CoopState.set({ coopSession: null, coopMultiplier: 1.0 });
      }),

      // Clue received from partner
      SocketManager.on('clue:received', (clueData) => {
        const cur = CoopState.get();
        if (cur.coopSession) {
          CoopState.set({
            coopSession: { ...cur.coopSession, receivedClue: clueData },
          });
        }
        // Bridge to Phaser: show clue notification in active scene
        EventBridge.emit('COOP_CLUE_RECEIVED', clueData);
      }),

      // Dual-key result
      SocketManager.on('dual_key:result', ({ success, multiplier, penalty, locationId }) => {
        if (success) {
          CoopState.set({ coopMultiplier: multiplier || 1.2, coopSession: null });
        } else {
          CoopState.set({ coopMultiplier: 1.0, coopSession: null, coopPenalty: penalty || 3 });
        }
      }),

      // Asymmetric (Navigator/Operator) result
      SocketManager.on('asym:result', ({ success, multiplier, penalty }) => {
        if (success) {
          CoopState.set({ coopMultiplier: multiplier || 1.2, coopSession: null });
        } else {
          CoopState.set({ coopMultiplier: 1.0, coopSession: null, coopPenalty: penalty || 3 });
        }
        // Bridge to Phaser: tell KeypadScene the result
        EventBridge.emit('ASYM_RESULT', { success });
      }),

      // Multiplier applied notification
      SocketManager.on('coop:multiplier_applied', ({ multiplier }) => {
        CoopState.set({ coopMultiplier: multiplier });
        // Bridge to Phaser: display multiplier bonus overlay in active scene
        EventBridge.emit('COOP_MULTIPLIER', { multiplier });
      }),

      // Flash quiz
      SocketManager.on('flash_quiz:start', (quiz) => {
        CoopState.set({ flashQuiz: quiz, flashQuizResult: null });
      }),
      SocketManager.on('flash_quiz:result', (result) => {
        CoopState.set({ flashQuizResult: result, flashQuiz: null });
      }),

      // Finale lobby
      SocketManager.on('finale:lobby_update', (players) => {
        CoopState.set({ finaleLobby: players });
      }),

      // Admin force-refresh is handled inside SocketManager
    ];

    return () => unsubs.forEach(u => u());
  }, [playerName]);

  // Report location joins/leaves to server
  useEffect(() => {
    if (!playerName) return;
    if (currentLocationId) {
      SocketManager.reportLocation(currentLocationId);
      // Also emit location:join for coop matching
      if (SocketManager.connected) {
        SocketManager.connect().emit('location:join', { locationId: currentLocationId });
      }
    } else {
      // Emit leave for previous location (currentLocationId just turned null)
      // We rely on map:presence broadcast to clean up
    }
  }, [currentLocationId, playerName]);

  // ── Forward ASYM_SUBMIT from Phaser KeypadScene to server ─────────────────
  useEffect(() => {
    const unsub = EventBridge.on('ASYM_SUBMIT', ({ code, locationId }) => {
      const session = CoopState.get().coopSession;
      if (!session?.sessionId) return;
      SocketManager.connect().emit('asym:submit', {
        sessionId: session.sessionId,
        code,
        locationId,
      });
    });
    return unsub;
  }, []);

  // ── Action callbacks ──────────────────────────────────────────────────────
  const requestCoop = useCallback((targetSocketId, locationId) => {
    SocketManager.connect().emit('coop:request', { targetSocketId, locationId });
  }, []);

  const acceptCoop = useCallback(({ requesterId, locationId }) => {
    SocketManager.connect().emit('coop:accept', { requesterId, locationId });
    CoopState.set({ inboundRequest: null });
  }, []);

  const declineCoop = useCallback(() => {
    CoopState.set({ inboundRequest: null });
  }, []);

  const shareClue = useCallback((targetSocketId, clue, locationId) => {
    SocketManager.connect().emit('clue:share', { targetSocketId, clue, locationId });
  }, []);

  const submitDualKey = useCallback((sessionId, locationId, correct) => {
    SocketManager.connect().emit('dual_key:submit', { sessionId, locationId, correct });
  }, []);

  const useLootItem = useCallback((itemId, targetLocationId) => {
    SocketManager.connect().emit('loot:use', { itemId, targetLocationId });
  }, []);

  const joinFinale = useCallback((finalScore, timeSeconds) => {
    SocketManager.connect().emit('finale:join', { score: finalScore, timeSeconds });
  }, []);

  const dismissFlashQuiz = useCallback(() => {
    CoopState.set({ flashQuizResult: null });
  }, []);

  const value = {
    otherPlayers:      state.otherPlayers     || [],
    occupiedLocations: state.occupiedLocations || new Set(),
    sharedLoot:        state.sharedLoot        || [],
    coopSession:       state.coopSession       || null,
    flashQuiz:         state.flashQuiz         || null,
    flashQuizResult:   state.flashQuizResult   || null,
    finaleLobby:       state.finaleLobby       || [],
    cityProgress:      state.cityProgress      || { completed: 0, total: 0, pct: 0 },
    inboundRequest:    state.inboundRequest    || null,
    coopMultiplier:    state.coopMultiplier    || 1.0,
    coopPenalty:       state.coopPenalty       || null,
    latestLootFound:   state.latestLootFound   || null,
    requestCoop,
    acceptCoop,
    declineCoop,
    shareClue,
    submitDualKey,
    useLootItem,
    joinFinale,
    dismissFlashQuiz,
  };

  return (
    <CoopContext.Provider value={value}>
      {children}

      {/* Inbound coop request toast */}
      {state.inboundRequest && (
        <div className="coop-toast">
          <p>🤝 <strong>{state.inboundRequest.requesterName}</strong> piedāvā kooperāciju!</p>
          <p className="coop-toast-loc">📍 {state.inboundRequest.locationId}</p>
          <div className="coop-toast-btns">
            <button className="coop-accept-btn" onClick={() => acceptCoop(state.inboundRequest)}>
              Pieņemt
            </button>
            <button className="coop-decline-btn" onClick={declineCoop}>
              Noraidīt
            </button>
          </div>
        </div>
      )}

      {/* Active coop session: clue holder panel */}
      {state.coopSession?.role === 'clue_holder' && (
        <div className="coop-clue-panel">
          <div className="coop-clue-header">
            <span>🔑 Mājienu panelis</span>
            <span className="coop-partner-badge">Partner: {state.coopSession.partnerName}</span>
          </div>
          <p className="coop-clue-hint">Dalies ar šiem mājienutiem ar savu partneri:</p>
          <ul className="coop-clue-list">
            {(state.coopSession.clues || []).map((clue, i) => (
              <li key={i}>
                <span className="coop-clue-num">{i + 1}.</span> {clue}
                <button
                  className="coop-share-btn"
                  onClick={() => shareClue(
                    state.coopSession.questionerSocketId,
                    clue,
                    state.coopSession.locationId
                  )}
                >
                  📤 Nosūtīt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigator panel: shows the secret code they must communicate to the Operator */}
      {state.coopSession?.role === 'navigator' && (
        <div className="coop-clue-panel">
          <div className="coop-clue-header">
            <span>🗺️ Navigators</span>
            <span className="coop-partner-badge">Operators: {state.coopSession.partnerName}</span>
          </div>
          <p className="coop-clue-hint">Pastāsti partnerim šo kodu (viņš to ievada uz tastatūras):</p>
          <div className="asym-code-display">
            {String(state.coopSession.code).split('').map((digit, i) => (
              <span key={i} className="asym-code-digit">{digit}</span>
            ))}
          </div>
        </div>
      )}

      {/* Operator panel: instructions to listen for the code from navigator */}
      {state.coopSession?.role === 'operator' && (
        <div className="coop-clue-panel">
          <div className="coop-clue-header">
            <span>🎮 Operators</span>
            <span className="coop-partner-badge">Navigators: {state.coopSession.partnerName}</span>
          </div>
          <p className="coop-clue-hint">Klausies navigatoru un ievadi dzirdēto kodu uz tastatūras!</p>
        </div>
      )}

      {/* Received clue (questioner) */}
      {state.coopSession?.role === 'questioner' && state.coopSession.receivedClue && (
        <div className="coop-received-clue">
          💡 <strong>{state.coopSession.receivedClue.fromName}</strong>:{' '}
          "{state.coopSession.receivedClue.clue}"
        </div>
      )}

      {/* Flash quiz overlay */}
      {state.flashQuiz && (
        <FlashQuiz
          quiz={state.flashQuiz}
          onSubmit={(quizId, answer) => {
            SocketManager.connect().emit('flash_quiz:answer', { quizId, answer });
          }}
        />
      )}

      {/* Flash quiz result brief */}
      {state.flashQuizResult && !state.flashQuiz && (
        <div className="flash-quiz-result-toast" onClick={dismissFlashQuiz}>
          {state.flashQuizResult.majority
            ? `🎉 Kopiena atbildēja pareizi! +${state.flashQuizResult.communityPoints} kopīgie punkti`
            : `😔 Kopiena neizdevās. Mēģiniet vēlreiz!`
          }
          <span className="close-hint"> (klikšķis lai aizvērtu)</span>
        </div>
      )}

      {/* Finale lobby */}
      {state.finaleLobby.length > 0 && (
        <FinaleLobby players={state.finaleLobby} />
      )}
    </CoopContext.Provider>
  );
}
