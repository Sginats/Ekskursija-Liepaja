import { useState, useEffect, useCallback, useRef } from 'react';
import MainMenu from './components/MainMenu.jsx';
import MapScreen from './components/MapScreen.jsx';
import PhaserScene from './phaser/PhaserScene.jsx';
import QuestionOverlay from './components/QuestionOverlay.jsx';
import ScoreBar from './components/ScoreBar.jsx';
import CardCollection from './components/CardCollection.jsx';
import LeaderboardView from './components/LeaderboardView.jsx';
import AboutModal from './components/AboutModal.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import IntroModal from './components/IntroModal.jsx';
import PreFinalModal from './components/PreFinalModal.jsx';
import CoopProvider, { useCoopContext } from './components/CoopManager.jsx';
import Confetti from './components/Confetti.jsx';
import NotoEmoji from './components/NotoEmoji.jsx';
import { LOCATIONS } from './data/LocationData.js';
import { getLocationConfig } from './utils/RandomizerEngine.js';
import EventBridge from './utils/EventBridge.js';
import { clearSession } from './utils/SessionLock.js';
import { WIND_MAX, applyTravelCost, WIND_PENALTY_EMPTY } from './utils/WindEnergy.js';
import { getUnlockedCards, unlockCard, CARD_META } from './utils/Cards.js';
import { saveScore, getTopTen } from './utils/Leaderboard.js';
import { getDayNightState } from './utils/DayNight.js';
import AntiCheat from './utils/AntiCheat.js';
import SocketManager from './utils/SocketManager.js';
import { generateJournal, downloadJournal } from './utils/JournalGenerator.js';
import GhostRun from './utils/GhostRun.js';
import usePersistence from './hooks/usePersistence.js';
import FinaleQuiz from './components/FinaleQuiz.jsx';

const PHASE = { MENU: 'menu', MAP: 'map', MINIGAME: 'minigame', QUESTION: 'question', CARD: 'card', FINALE: 'finale', END: 'end' };
const LAST_LOCATION_ID = 'parks';
const SCORE_CAP = 110;

// ── Inner game wrapped inside CoopProvider ────────────────────────────────────
function GameRoot({ onPlayerNameChange, onLocationChange, onScoreChange }) {
  const [phase, setPhase] = useState(PHASE.MENU);
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [windEnergy, setWindEnergy] = useState(WIND_MAX);
  const [completedLocations, setCompletedLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [newCardId, setNewCardId] = useState(null);
  const [newCardPerfect, setNewCardPerfect] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showPreFinal, setShowPreFinal] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [emptyTravelPenalties, setEmptyTravelPenalties] = useState(0);
  const [unlockedCards, setUnlockedCards] = useState(getUnlockedCards());
  const [route, setRoute] = useState([]);
  const [routePlan, setRoutePlan] = useState([]);
  // Live question overrides received from admin hot-swap
  const [questionOverrides, setQuestionOverrides] = useState({});
  // Ghost run: elapsedMs from map start for playback
  const [mapElapsedMs, setMapElapsedMs] = useState(0);
  // Finale rank (fetched after saving score)
  const [finaleRank, setFinaleRank] = useState(null);
  const mapTimerRef = useRef(null);

  const { isNight } = getDayNightState();
  const { coopMultiplier, coopPenalty, joinFinale, activeLobbyCode, finaleLobby } = useCoopContext();
  const { saveState, loadState, clearState } = usePersistence();

  useEffect(() => {
    document.body.setAttribute('data-night', isNight ? '1' : '0');
  }, [isNight]);

  // ── Persist state on key changes ──────────────────────────────────────────
  useEffect(() => {
    if (phase === PHASE.MENU || phase === PHASE.END) return; // don't persist end states
    if (!playerName) return;
    saveState({
      playerName,
      score,
      windEnergy,
      completedLocations,
      currentLocationId: currentLocation?.id ?? null,
      startTime,
      routePlan,
    });
  }, [score, windEnergy, completedLocations, currentLocation, phase, routePlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore saved state on mount ─────────────────────────────────────────
  useEffect(() => {
    const saved = loadState();
    if (!saved) return;
    setPlayerName(saved.playerName);
    setScore(saved.score ?? 0);
    setWindEnergy(saved.windEnergy ?? WIND_MAX);
    setCompletedLocations(saved.completedLocations ?? []);
    setStartTime(saved.startTime ?? Date.now());
    setRoutePlan(saved.routePlan ?? []);
    SocketManager.joinGame(saved.playerName);
    onPlayerNameChange?.(saved.playerName);
    onScoreChange?.(saved.score ?? 0);
    setPhase(PHASE.MAP);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hot-swap question overrides ───────────────────────────────────────────
  useEffect(() => {
    const unsub1 = SocketManager.on('questions:overrides', (data) => {
      setQuestionOverrides(data || {});
    });
    const unsub2 = SocketManager.on('questions:override', ({ locationId, questionIdx, patch }) => {
      setQuestionOverrides(prev => ({
        ...prev,
        [`${locationId}:${questionIdx}`]: { ...(prev[`${locationId}:${questionIdx}`] || {}), ...patch },
      }));
    });
    const unsub3 = SocketManager.on('questions:reset', ({ locationId, questionIdx }) => {
      setQuestionOverrides(prev => {
        const next = { ...prev };
        delete next[`${locationId}:${questionIdx}`];
        return next;
      });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // ── Minigame → question transition ───────────────────────────────────────
  useEffect(() => {
    const unsub = EventBridge.on('MINIGAME_COMPLETE', ({ bonusPoints }) => {
      setScore(s => Math.min(SCORE_CAP, s + (bonusPoints || 0)));
      setPhase(PHASE.QUESTION);
    });
    return unsub;
  }, []);

  // ── Apply co-op penalty if any ────────────────────────────────────────────
  useEffect(() => {
    if (coopPenalty && coopPenalty > 0) {
      setScore(s => Math.max(0, s - coopPenalty));
    }
  }, [coopPenalty]);

  // ── Ghost run: advance elapsed-ms counter while on map ────────────────────
  useEffect(() => {
    if (phase === PHASE.MAP && startTime) {
      mapTimerRef.current = setInterval(() => {
        setMapElapsedMs(Date.now() - startTime);
      }, 500);
    } else {
      clearInterval(mapTimerRef.current);
    }
    return () => clearInterval(mapTimerRef.current);
  }, [phase, startTime]);

  // ── Start ─────────────────────────────────────────────────────────────────
  const handleStart = useCallback((name) => {
    setPlayerName(name);
    setScore(0);
    setWindEnergy(WIND_MAX);
    setCompletedLocations([]);
    setCurrentLocation(null);
    setStartTime(Date.now());
    setEmptyTravelPenalties(0);
    setRoute([]);
    setFinaleRank(null);
    setShowPreFinal(false);

    // Shuffle locations excluding Atpūtas vieta (parks) which must be last
    const pool = LOCATIONS.filter(l => l.id !== LAST_LOCATION_ID);
    const shuffled = pool.sort(() => Math.random() - 0.5).map(l => l.id);
    const newPlan = [...shuffled, LAST_LOCATION_ID];
    setRoutePlan(newPlan);

    clearState();
    clearSession();
    SocketManager.joinGame(name);
    GhostRun.startRun();
    setMapElapsedMs(0);
    onPlayerNameChange?.(name);
    onScoreChange?.(0);
    setShowIntro(true);
    setPhase(PHASE.MAP);
  }, [clearState]);

  // ── Location select ───────────────────────────────────────────────────────
  const selectLocation = useCallback((locationId) => {
    const loc = LOCATIONS.find(l => l.id === locationId);
    if (!loc || completedLocations.includes(locationId)) return;

    // Strict order based on randomized routePlan
    const nextExpectedId = routePlan[completedLocations.length];
    if (locationId !== nextExpectedId) return;

    let newEnergy = applyTravelCost(windEnergy);
    let penalty = emptyTravelPenalties;
    if (windEnergy === 0) {
      penalty++;
      setEmptyTravelPenalties(penalty);
      setScore(s => Math.max(0, s - WIND_PENALTY_EMPTY));
    }
    setWindEnergy(newEnergy);
    setCurrentLocation(loc);
    setCurrentConfig(getLocationConfig(loc));
    AntiCheat.startLocation(loc.id);
    SocketManager.reportLocation(loc.id);
    GhostRun.mark(loc.id, startTime ? Date.now() - startTime : 0);
    onLocationChange?.(loc.id);
    setPhase(PHASE.MINIGAME);
  }, [completedLocations, windEnergy, emptyTravelPenalties]);

  // ── Question complete ─────────────────────────────────────────────────────
  const handleQuestionComplete = useCallback(({ points, correct, attempts }) => {
    // Apply coop multiplier if active
    const finalPoints = Math.round(points * (coopMultiplier > 1 ? coopMultiplier : 1));
    setScore(s => Math.min(SCORE_CAP, s + finalPoints));
    onScoreChange?.(score + finalPoints);

    const locId = currentLocation.id;
    const elapsed = AntiCheat.finishLocation(locId, score + finalPoints);
    // Perfect answer: first attempt, correct, full points (equal to question.points[0])
    const isPerfect = correct && attempts === 1 && points === (currentConfig?.question?.points?.[0] ?? 10);

    // Build route entry for journal
    const cfg = currentConfig;
    setRoute(prev => [...prev, {
      locationId:        locId,
      locationName:      currentLocation.name,
      pointsEarned:      finalPoints,
      questionText:      cfg?.question?.text,
      fact:              cfg?.question?.fact,
      answeredCorrectly: correct,
    }]);

    setCompletedLocations(prev => {
      const next = [...prev, locId];
      if (next.length === LOCATIONS.length) {
        setShowPreFinal(true);
      }
      return next;
    });

    const isNew = unlockCard(locId);
    setUnlockedCards(getUnlockedCards());
    onLocationChange?.(null);
    if (isNew) {
      setNewCardId(locId);
      setNewCardPerfect(isPerfect);
      setPhase(PHASE.CARD);
    } else {
      setPhase(PHASE.MAP);
    }
  }, [currentLocation, currentConfig, completedLocations, score, coopMultiplier]);

  const handleCardDismiss = useCallback(() => {
    setNewCardId(null);
    setNewCardPerfect(false);
    setPhase(PHASE.MAP);
    if (completedLocations.length >= LOCATIONS.length) {
      setShowPreFinal(true);
    }
  }, [completedLocations]);

  const handlePreFinalReady = useCallback(() => {
    setShowPreFinal(false);
    setPhase(PHASE.FINALE);
  }, []);

  const handleFinaleComplete = useCallback(({ bonusPoints }) => {
    setScore(s => Math.min(SCORE_CAP, s + (bonusPoints || 0)));
    setPhase(PHASE.END);
  }, []);

  const handleSaveScore = useCallback(async () => {
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    let finalName = playerName;
    let finalScore = score;
    let finalTime = elapsed;
    let mode = 'single';

    if (activeLobbyCode && finaleLobby.length > 1) {
      mode = 'multi';
      // Combine scores/names for everyone in the finale lobby
      const names = finaleLobby.map(p => p.name).sort().join(' + ');
      const totalScore = finaleLobby.reduce((sum, p) => sum + p.score, 0);
      const maxTime = Math.max(...finaleLobby.map(p => p.timeSeconds));
      
      finalName = names;
      finalScore = totalScore;
      finalTime = maxTime;
    }

    await saveScore({ name: finalName, score: finalScore, timeSeconds: finalTime, mode });
    GhostRun.finish(elapsed * 1000, score);
    joinFinale(score, elapsed);
    clearState();
    // Fetch rank — score count+1 if not in top-10 list yet
    try {
      const top = await getTopTen(mode);
      const idx = top.findIndex(r => r.name === finalName && r.score === finalScore);
      setFinaleRank(idx >= 0 ? idx + 1 : (top.length > 0 ? top.length + 1 : 1));
    } catch { /* non-critical */ }
    setShowLeaderboard(true);
  }, [playerName, score, startTime, joinFinale, clearState, activeLobbyCode, finaleLobby]);

  const handleDownloadJournal = useCallback(() => {
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const text = generateJournal({ playerName, score, timeSeconds: elapsed, route });
    downloadJournal(text);
  }, [playerName, score, startTime, route]);

  const formattedTime = (() => {
    if (!startTime || phase !== PHASE.END) return '00:00';
    const s = Math.round((Date.now() - startTime) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  })();

  // Merge hot-swap overrides into the current config question
  const effectiveConfig = (() => {
    if (!currentConfig || !currentLocation) return currentConfig;
    const key = `${currentLocation.id}:${currentConfig.question._idx ?? 0}`;
    const ovr = questionOverrides[key];
    if (!ovr) return currentConfig;
    return { ...currentConfig, question: { ...currentConfig.question, ...ovr } };
  })();

  return (
    <div className={`app-root ${isNight ? 'night' : 'day'}`}>
      {phase === PHASE.MENU && <MainMenu onStart={handleStart} onAbout={() => setShowAbout(true)} />}

      {phase === PHASE.MAP && (
        <>
          <div className="map-nav-btns">
            <button className="nav-btn" onClick={() => setShowCards(true)}>
              <NotoEmoji emoji="🃏" size={18} style={{ marginRight: 5 }} />Kartītes
            </button>
            <button className="nav-btn" onClick={() => setShowLeaderboard(true)}>
              <NotoEmoji emoji="🏆" size={18} style={{ marginRight: 5 }} />TOP 10
            </button>
            <button className="nav-btn" onClick={() => setShowAbout(true)}>ℹ Par spēli</button>
            <button className="nav-btn admin-nav-btn" onClick={() => setShowAdmin(true)}>⚙ Admin</button>
          </div>
          <MapScreen
            completedLocations={completedLocations}
            onSelectLocation={selectLocation}
            score={score}
            windEnergy={windEnergy}
            ghostLocationId={GhostRun.getGhostLocation(mapElapsedMs)}
            ghostBestTime={GhostRun.getBestTimeLabel()}
            startTime={startTime}
            routePlan={routePlan}
          />
        </>
      )}

      {phase === PHASE.MINIGAME && currentLocation && currentConfig && (
        <div className="game-screen">
          <ScoreBar score={score} locationName={currentLocation.name} phase="Mini-spēle" />
          <PhaserScene miniGame={currentConfig.miniGame} locationId={currentLocation.id} score={score} />
        </div>
      )}

      {phase === PHASE.QUESTION && currentLocation && effectiveConfig && (
        <div className="game-screen">
          <ScoreBar score={score} locationName={currentLocation.name} phase="Jautājums" />
          <QuestionOverlay
            question={effectiveConfig.question}
            locationName={currentLocation.name}
            locationId={currentLocation.id}
            questionIdx={effectiveConfig.question._idx ?? 0}
            onComplete={handleQuestionComplete}
            windEnergy={windEnergy}
            onWindUpdate={setWindEnergy}
          />
        </div>
      )}

      {phase === PHASE.CARD && newCardId && (
        <div className="card-reveal-overlay">
          <div className="card-reveal-box">
            {newCardPerfect && (
              <div className="perfect-badge">
                <NotoEmoji emoji="⭐" size={18} style={{ marginRight: 5 }} />
                Perfekts! Max punkti!
              </div>
            )}
            <p className="card-reveal-label">
              <NotoEmoji emoji="🎉" size={22} style={{ marginRight: 6 }} />
              Jaunā kartīte atbloķēta!
            </p>
            <div className="card-reveal-card">
              <span style={{ fontSize: 56 }}>{CARD_META[newCardId]?.emoji}</span>
              <strong>{CARD_META[newCardId]?.title}</strong>
            </div>
            <button className="menu-start-btn" onClick={handleCardDismiss}>Turpināt →</button>
          </div>
        </div>
      )}

      {phase === PHASE.FINALE && (
        <FinaleQuiz onComplete={handleFinaleComplete} />
      )}

      {phase === PHASE.END && (
        <div className="end-screen">
          <Confetti />
          <div className="end-card">
            <h2>
              <NotoEmoji emoji="🎊" size={36} style={{ marginRight: 8 }} />
              Ekskursija Pabeigta!
            </h2>
            <p className="end-name">{playerName}</p>
            <div className="end-stats">
              <span><NotoEmoji emoji="⭐" size={20} style={{ marginRight: 4 }} />{score} punkti</span>
              <span><NotoEmoji emoji="⏱️" size={20} style={{ marginRight: 4 }} />{formattedTime}</span>
              <span><NotoEmoji emoji="🃏" size={20} style={{ marginRight: 4 }} />{unlockedCards.length}/{LOCATIONS.length} kartītes</span>
            </div>
            {finaleRank && (
              <p className="end-rank">
                <NotoEmoji emoji="🏆" size={20} style={{ marginRight: 5 }} />
                Tu esi <strong>{finaleRank}.</strong> vietā no visiem spēlētājiem!
              </p>
            )}
            <div className="end-btns">
              <button className="menu-start-btn" onClick={handleSaveScore}>
                <NotoEmoji emoji="💾" size={18} style={{ marginRight: 6 }} />Saglabāt rezultātu
              </button>
              <button className="nav-btn" onClick={handleDownloadJournal}>
                <NotoEmoji emoji="📄" size={18} style={{ marginRight: 6 }} />Lejupielādēt žurnālu
              </button>
              <button className="nav-btn" onClick={() => setShowLeaderboard(true)}>
                <NotoEmoji emoji="🏆" size={18} style={{ marginRight: 6 }} />TOP 10
              </button>
              <button className="nav-btn" onClick={() => handleStart(playerName)}>
                <NotoEmoji emoji="🔄" size={18} style={{ marginRight: 6 }} />Spēlēt vēlreiz
              </button>
            </div>
          </div>
        </div>
      )}

      {showCards       && <CardCollection unlockedCards={unlockedCards} onClose={() => setShowCards(false)} />}
      {showLeaderboard && <LeaderboardView onClose={() => setShowLeaderboard(false)} />}
      {showAbout       && <AboutModal onClose={() => setShowAbout(false)} onStart={phase === PHASE.MENU ? () => { setShowAbout(false); } : undefined} />}
      {showAdmin       && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showIntro       && <IntroModal onDismiss={() => setShowIntro(false)} />}
      {showPreFinal    && <PreFinalModal onReady={handlePreFinalReady} />}
    </div>
  );
}

// ── Root export: App state is lifted above CoopProvider ──────────────────────
export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [currentLocationId, setCurrentLocationId] = useState(null);
  const [score, setScore] = useState(0);

  return (
    <CoopProvider
      playerName={playerName}
      currentLocationId={currentLocationId}
      score={score}
    >
      <GameRoot
        onPlayerNameChange={setPlayerName}
        onLocationChange={setCurrentLocationId}
        onScoreChange={setScore}
      />
    </CoopProvider>
  );
}
