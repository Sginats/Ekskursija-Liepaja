import { useState, useEffect, useRef, useMemo } from 'react';
import { applyAnswerRestore } from '../utils/WindEnergy.js';
import DynamicDifficulty from '../utils/DynamicDifficulty.js';
import EventBridge from '../utils/EventBridge.js';
import NotoEmoji from './NotoEmoji.jsx';
import SocketManager from '../utils/SocketManager.js';

export default function QuestionOverlay({ question, locationName, locationId, questionIdx, onComplete, windEnergy, onWindUpdate }) {
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const [wrongOption, setWrongOption] = useState(null);
  const inputRef = useRef(null);

  const isMC = Array.isArray(question.options) && question.options.length > 0;

  // Points per attempt: use question.points if defined, else DynamicDifficulty
  const _ddBase   = useMemo(
    () => DynamicDifficulty.getBasePoints(locationId, questionIdx ?? 0),
    [locationId, questionIdx]
  );
  const basePoints = useMemo(
    () => question.points?.[0] ?? _ddBase,
    [question.points, _ddBase]
  );
  const secondAttemptPts = useMemo(
    () => question.points?.[1] ?? Math.max(Math.round(basePoints * 0.5), 3),
    [question.points, basePoints]
  );
  const diffLabel = useMemo(
    () => DynamicDifficulty.getLabel(locationId, questionIdx ?? 0),
    [locationId, questionIdx]
  );

  useEffect(() => {
    if (!isMC) inputRef.current?.focus();
  }, [isMC]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && !done && !isMC) submit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function normalise(str) {
    return String(str).toLowerCase().trim().replace(/[.,!?]/g, '');
  }

  function isMatch(val) {
    const n = normalise(val);
    if (n === normalise(question.answer)) return true;
    return (question.aliases || []).some(a => normalise(a) === n);
  }

  // ── Text-input submission ────────────────────────────────────────────────────
  function submit() {
    if (done || !input.trim()) return;
    _handleAnswer(input);
  }

  // ── Multiple-choice click ────────────────────────────────────────────────────
  function selectOption(opt) {
    if (done || opt === wrongOption) return;
    _handleAnswer(opt);
  }

  // ── Shared answer logic ──────────────────────────────────────────────────────
  async function _handleAnswer(value) {
    const serverResult = await SocketManager.answerQuestion(locationId, questionIdx ?? 0, value);
    // Offline play remains available, but online scoring always uses the
    // server response rather than trusting this component's points.
    const correct = serverResult ? serverResult.correct : isMatch(value);
    const nextAttempts = attempts + 1;

    DynamicDifficulty.record(locationId, questionIdx ?? 0, correct);

    if (correct) {
      const pts = serverResult ? serverResult.points : (attempts === 0 ? basePoints : secondAttemptPts);
      setFeedback({ type: 'success', pts });
      setDone(true);
      EventBridge.emit('ANSWER_CORRECT', { delta: pts });
      const newWind = applyAnswerRestore(windEnergy, nextAttempts);
      onWindUpdate?.(newWind);
      setTimeout(() => onComplete({ points: pts, correct: true, attempts: nextAttempts }), 1800);
    } else if (nextAttempts >= 2) {
      setAttempts(nextAttempts);
      setFeedback({ type: 'revealed', answer: question.answer });
      setDone(true);
      EventBridge.emit('ANSWER_WRONG', {});
      setTimeout(() => onComplete({ points: 0, correct: false, attempts: nextAttempts }), 2400);
    } else {
      setAttempts(nextAttempts);
      EventBridge.emit('ANSWER_WRONG', {});
      const wrongFeedback = { type: 'wrong', remaining: 2 - nextAttempts };
      if (isMC) {
        setWrongOption(value);
        setFeedback(wrongFeedback);
      } else {
        setFeedback(wrongFeedback);
        setInput('');
        setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 1200);
      }
    }
  }

  return (
    <div className="question-overlay">
      <div className="question-card">
        <p className="question-location">{locationName}</p>

        <div className="question-info-box">
          <p className="question-text">{question.text}</p>
          <p className="question-attempts">
            {attempts === 0
              ? <><NotoEmoji emoji="🎯" size={16} style={{ marginRight: 4 }} />+{basePoints} punkti par pareizu atbildi{diffLabel ? ` · ${diffLabel}` : ''}</>
              : <><NotoEmoji emoji="💡" size={16} style={{ marginRight: 4 }} />+{secondAttemptPts} punkti — vēl 1 mēģinājums</>}
          </p>
        </div>

        {/* ── Multiple-choice options ─────────────────────────────────────────── */}
        {isMC && !done && (
          <div className="quiz-options">
            {question.options.map((opt) => (
              <button
                key={opt}
                className={`quiz-option-btn${opt === wrongOption ? ' quiz-option-wrong' : ''}`}
                onClick={() => selectOption(opt)}
                disabled={opt === wrongOption}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* ── Text-input form (used when no options) ──────────────────────────── */}
        {!isMC && !done && (
          <div className="quiz-form">
            <input
              ref={inputRef}
              className="quiz-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ievadi atbildi..."
              maxLength={60}
              autoComplete="off"
            />
            <button className="quiz-submit-btn" onClick={submit}>
              Iesniegt ↵
            </button>
          </div>
        )}

        {feedback?.type === 'wrong' && (
          <div className="feedback feedback-wrong">
            ✗ Nepareizi — mēģini vēlreiz! Vēl {feedback.remaining} iespēja
          </div>
        )}

        {feedback?.type === 'success' && (
          <div className="feedback feedback-success">
            <span className="feedback-pts">+{feedback.pts} punkti!</span>
            <p className="feedback-fact">{question.fact}</p>
          </div>
        )}

        {feedback?.type === 'revealed' && (
          <div className="feedback feedback-revealed">
            <p>Pareizā atbilde: <strong>{feedback.answer}</strong></p>
            <p className="feedback-fact">{question.fact}</p>
          </div>
        )}
      </div>
    </div>
  );
}
