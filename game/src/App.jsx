import { useState, useEffect, useCallback } from 'react';
import MainMenu from './components/MainMenu.jsx';
import MapScreen from './components/MapScreen.jsx';
import PhaserScene from './phaser/PhaserScene.jsx';
import QuestionOverlay from './components/QuestionOverlay.jsx';
import ScoreBar from './components/ScoreBar.jsx';
import CardCollection from './components/CardCollection.jsx';
import LeaderboardView from './components/LeaderboardView.jsx';
import AboutModal from './components/AboutModal.jsx';
import { LOCATIONS } from './data/LocationData.js';
import { getLocationConfig } from './utils/RandomizerEngine.js';
import EventBridge from './utils/EventBridge.js';
import { clearSession } from './utils/SessionLock.js';
import { WIND_MAX, applyTravelCost, WIND_PENALTY_EMPTY } from './utils/WindEnergy.js';
import { getUnlockedCards, unlockCard, CARD_META } from './utils/Cards.js';
import { saveScore } from './utils/Leaderboard.js';
import { getDayNightState } from './utils/DayNight.js';

const PHASE = { MENU: 'menu', MAP: 'map', MINIGAME: 'minigame', QUESTION: 'question', CARD: 'card', END: 'end' };

const LAST_LOCATION_ID = 'parks';

export default function App() {
  const [phase, setPhase] = useState(PHASE.MENU);
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [windEnergy, setWindEnergy] = useState(WIND_MAX);
  const [completedLocations, setCompletedLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [newCardId, setNewCardId] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [emptyTravelPenalties, setEmptyTravelPenalties] = useState(0);
  const [unlockedCards, setUnlockedCards] = useState(getUnlockedCards());
  const { isNight } = getDayNightState();

  useEffect(() => {
    const unsub = EventBridge.on('MINIGAME_COMPLETE', ({ bonusPoints }) => {
      setScore(s => s + (bonusPoints || 0));
      setPhase(PHASE.QUESTION);
    });
    return unsub;
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-night', isNight ? '1' : '0');
  }, [isNight]);

  const handleStart = useCallback((name) => {
    setPlayerName(name);
    setScore(0);
    setWindEnergy(WIND_MAX);
    setCompletedLocations([]);
    setCurrentLocation(null);
    setStartTime(Date.now());
    setEmptyTravelPenalties(0);
    clearSession();
    setPhase(PHASE.MAP);
  }, []);

  const selectLocation = useCallback((locationId) => {
    const loc = LOCATIONS.find(l => l.id === locationId);
    if (!loc || completedLocations.includes(locationId)) return;

    const availableOrder = LOCATIONS.filter(l => !completedLocations.includes(l.id));
    const isLast = availableOrder.length === 1;

    if (isLast && locationId !== LAST_LOCATION_ID) {
      return;
    }

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
    setPhase(PHASE.MINIGAME);
  }, [completedLocations, windEnergy, emptyTravelPenalties]);

  const handleQuestionComplete = useCallback(({ points }) => {
    setScore(s => s + points);
    const locId = currentLocation.id;
    setCompletedLocations(prev => {
      const next = [...prev, locId];
      if (next.length === LOCATIONS.length) {
        setPhase(PHASE.END);
      }
      return next;
    });
    const isNew = unlockCard(locId);
    setUnlockedCards(getUnlockedCards());
    if (isNew) {
      setNewCardId(locId);
      setPhase(PHASE.CARD);
    } else {
      setPhase(prev => prev === PHASE.CARD ? PHASE.CARD : PHASE.MAP);
      if (completedLocations.length + 1 === LOCATIONS.length) {
        setPhase(PHASE.END);
      } else {
        setPhase(PHASE.MAP);
      }
    }
  }, [currentLocation, completedLocations]);

  const handleCardDismiss = useCallback(() => {
    setNewCardId(null);
    if (completedLocations.length >= LOCATIONS.length) {
      setPhase(PHASE.END);
    } else {
      setPhase(PHASE.MAP);
    }
  }, [completedLocations]);

  const handleSaveScore = useCallback(async () => {
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    await saveScore({ name: playerName, score, timeSeconds: elapsed, mode: 'single' });
    setShowLeaderboard(true);
  }, [playerName, score, startTime]);

  const formattedTime = (() => {
    if (!startTime || phase !== PHASE.END) return '00:00';
    const s = Math.round((Date.now() - startTime) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  })();

  return (
    <div className={`app-root ${isNight ? 'night' : 'day'}`}>
      {phase === PHASE.MENU && <MainMenu onStart={handleStart} />}

      {phase === PHASE.MAP && (
        <>
          <div className="map-nav-btns">
            <button className="nav-btn" onClick={() => setShowCards(true)}>🃏 Kartītes</button>
            <button className="nav-btn" onClick={() => setShowLeaderboard(true)}>🏆 TOP 10</button>
            <button className="nav-btn" onClick={() => setShowAbout(true)}>ℹ Par spēli</button>
          </div>
          <MapScreen
            completedLocations={completedLocations}
            onSelectLocation={selectLocation}
            score={score}
            windEnergy={windEnergy}
          />
        </>
      )}

      {phase === PHASE.MINIGAME && currentLocation && currentConfig && (
        <div className="game-screen">
          <ScoreBar score={score} locationName={currentLocation.name} phase="Mini-spēle" />
          <PhaserScene miniGame={currentConfig.miniGame} locationId={currentLocation.id} />
        </div>
      )}

      {phase === PHASE.QUESTION && currentLocation && currentConfig && (
        <div className="game-screen">
          <ScoreBar score={score} locationName={currentLocation.name} phase="Jautājums" />
          <QuestionOverlay
            question={currentConfig.question}
            locationName={currentLocation.name}
            onComplete={handleQuestionComplete}
            windEnergy={windEnergy}
            onWindUpdate={setWindEnergy}
          />
        </div>
      )}

      {phase === PHASE.CARD && newCardId && (
        <div className="card-reveal-overlay">
          <div className="card-reveal-box">
            <p className="card-reveal-label">🎉 Jaunā kartīte atbloķēta!</p>
            <div className="card-reveal-card">
              <span style={{ fontSize: 56 }}>
                {CARD_META[newCardId]?.emoji}
              </span>
              <strong>{CARD_META[newCardId]?.title}</strong>
            </div>
            <button className="menu-start-btn" onClick={handleCardDismiss}>Turpināt →</button>
          </div>
        </div>
      )}

      {phase === PHASE.END && (
        <div className="end-screen">
          <div className="end-card">
            <h2>🎊 Ekskursija Pabeigta!</h2>
            <p className="end-name">{playerName}</p>
            <div className="end-stats">
              <span>⭐ {score} punkti</span>
              <span>⏱ {formattedTime}</span>
              <span>🃏 {unlockedCards.length}/{LOCATIONS.length} kartītes</span>
            </div>
            <div className="end-btns">
              <button className="menu-start-btn" onClick={handleSaveScore}>
                💾 Saglabāt rezultātu
              </button>
              <button className="nav-btn" onClick={() => setShowLeaderboard(true)}>
                🏆 TOP 10
              </button>
              <button className="nav-btn" onClick={() => handleStart(playerName)}>
                🔄 Spēlēt vēlreiz
              </button>
            </div>
          </div>
        </div>
      )}

      {showCards && (
        <CardCollection unlockedCards={unlockedCards} onClose={() => setShowCards(false)} />
      )}
      {showLeaderboard && (
        <LeaderboardView onClose={() => setShowLeaderboard(false)} />
      )}
      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
    </div>
  );
}
