import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { gameState } from '../game/GameState.js';
import { MAX_LIVES, LIVES_BY_DIFFICULTY } from '../game/GameState.js';
import { antiCheat } from '../game/AntiCheat.js';
import { taskSequence, TOTAL_TASKS } from '../game/taskSequence.js';
import { pickQuestion } from '../game/questions.js';

const GameContext = createContext(null);

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
const initialState = {
  playerName: 'Anonims',
  mode: 'single',           // 'single' | 'multi'
  role: null,               // 'host' | 'guest'
  lobbyCode: null,
  startTime: null,
  score: 0,
  completedTasks: 0,
  lives: null,              // null = Normal (no lives system), number = Hard
  maxLives: null,
  combo: 0,
  difficulty: 'normal',
  currentLocation: null,
  selectedQuestions: {},    // { locationKey: { id, q, fact } }
  notifications: [],
  connectionMode: 'php',    // 'websocket' | 'php'
  connectionStatus: 'disconnected',
  gamePhase: 'menu',        // 'menu' | 'map' | 'playing' | 'ended'
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerName: action.name };
    case 'SET_MODE':
      return { ...state, mode: action.mode, role: action.role || null, lobbyCode: action.lobbyCode || null };
    case 'START_GAME':
      return {
        ...state,
        gamePhase: 'map',
        startTime: action.startTime,
        score: action.score || 0,
        completedTasks: action.completedTasks || 0,
        lives: action.lives !== undefined ? action.lives : MAX_LIVES,
        maxLives: action.maxLives !== undefined ? action.maxLives : MAX_LIVES,
        difficulty: action.difficulty || 'normal',
        combo: action.combo || 0,
        selectedQuestions: action.questions || {},
      };
    case 'SET_LOCATION':
      return { ...state, currentLocation: action.location };
    case 'ADD_SCORE':
      return { ...state, score: action.score };
    case 'COMPLETE_TASK':
      return { ...state, completedTasks: action.completedTasks };
    case 'SET_LIVES':
      return { ...state, lives: action.lives };
    case 'SET_COMBO':
      return { ...state, combo: action.combo };
    case 'END_GAME':
      return { ...state, gamePhase: 'ended' };
    case 'RESET_GAME':
      return {
        ...initialState,
        playerName: state.playerName,
      };
    case 'SET_CONNECTION':
      return {
        ...state,
        connectionMode: action.mode || state.connectionMode,
        connectionStatus: action.status || state.connectionStatus,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          { id: Date.now(), message: action.message, kind: action.kind, duration: action.duration || 3000 },
        ],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Pre-select one random question per location at session start.
  const questionsRef = useRef({});
  useEffect(() => {
    const q = {};
    taskSequence.forEach((loc) => {
      q[loc] = pickQuestion(loc);
    });
    questionsRef.current = q;
  }, []);

  // Notify helper
  const notify = useCallback((message, kind = 'info', duration = 3000) => {
    dispatch({ type: 'ADD_NOTIFICATION', message, kind, duration });
  }, []);

  const dismissNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', id });
  }, []);

  // Score helpers that go through GameState (integrity-protected)
  const addScore = useCallback((points) => {
    const newScore = gameState.addScore(points);
    dispatch({ type: 'ADD_SCORE', score: newScore });
    return newScore;
  }, []);

  const completeTask = useCallback(() => {
    const n = gameState.completeTask();
    dispatch({ type: 'COMPLETE_TASK', completedTasks: n });
    return n;
  }, []);

  const loseLife = useCallback(() => {
    const remaining = gameState.loseLife();
    dispatch({ type: 'SET_LIVES', lives: remaining });
    return remaining;
  }, []);

  const incrementCombo = useCallback(() => {
    const c = gameState.incrementCombo();
    dispatch({ type: 'SET_COMBO', combo: c });
    return c;
  }, []);

  const resetCombo = useCallback(() => {
    gameState.resetCombo();
    dispatch({ type: 'SET_COMBO', combo: 0 });
  }, []);

  const gameTokenRef = useRef(null);

  const startFreshGame = useCallback(async (name, mode, role, lobbyCode, difficulty = 'normal') => {
    gameState.reset(difficulty);
    antiCheat._recordAction && antiCheat._recordAction('game_start', { name, mode });

    // Request a server-side game token
    try {
      const res = await fetch('../src/php/start_game.php', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.token) {
        gameTokenRef.current = data.token;
      }
    } catch (_) {}

    // Build new question set
    const q = {};
    taskSequence.forEach((loc) => {
      q[loc] = pickQuestion(loc);
    });
    questionsRef.current = q;

    const startTime = Date.now();
    gameState.saveStartTime(startTime);

    dispatch({
      type: 'SET_PLAYER',
      name: name || 'Anonims',
    });
    dispatch({
      type: 'SET_MODE',
      mode: mode || 'single',
      role: role || null,
      lobbyCode: lobbyCode || null,
    });
    dispatch({
      type: 'START_GAME',
      startTime,
      score: 0,
      completedTasks: 0,
      lives: gameState.getLives(),      // null for Normal, 3 for Hard
      maxLives: gameState.getMaxLives(), // null for Normal, 3 for Hard
      difficulty,
      combo: 0,
      questions: q,
    });
  }, []);

  const restoreSession = useCallback((name, mode, role, lobbyCode) => {
    const restored = gameState.loadFromSession();
    const savedStart = gameState.getStartTime();

    const q = {};
    taskSequence.forEach((loc) => {
      q[loc] = pickQuestion(loc);
    });
    questionsRef.current = q;

    const startTime = savedStart || Date.now();
    if (!savedStart) gameState.saveStartTime(startTime);

    dispatch({ type: 'SET_PLAYER', name: name || 'Anonims' });
    dispatch({ type: 'SET_MODE', mode: mode || 'single', role, lobbyCode });
    dispatch({
      type: 'START_GAME',
      startTime,
      score: restored ? gameState.getScore() : 0,
      completedTasks: restored ? gameState.getCompleted() : 0,
      lives: restored ? gameState.getLives() : null,
      maxLives: restored ? gameState.getMaxLives() : null,
      difficulty: restored ? (gameState.getMaxLives() === null ? 'normal' : 'hard') : 'normal',
      combo: restored ? gameState.getCombo() : 0,
      questions: q,
    });

    return {
      completedTasks: restored ? gameState.getCompleted() : 0,
      score: restored ? gameState.getScore() : 0,
    };
  }, []);

  const value = {
    state,
    dispatch,
    notify,
    dismissNotification,
    addScore,
    completeTask,
    loseLife,
    incrementCombo,
    resetCombo,
    startFreshGame,
    restoreSession,
    questionsRef,
    antiCheat,
    gameState,
    gameTokenRef,
    TOTAL_TASKS,
    MAX_LIVES,
    taskSequence,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
