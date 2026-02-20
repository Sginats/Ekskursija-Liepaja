import { useState, useEffect, useRef } from 'react';
import { applyAnswerRestore } from '../utils/WindEnergy.js';

export default function QuestionOverlay({ question, locationName, onComplete, windEnergy, onWindUpdate }) {
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && !done) submit();
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

  function submit() {
    if (done || !input.trim()) return;
    const correct = isMatch(input);
    const nextAttempts = attempts + 1;

    if (correct) {
      const pts = attempts === 0 ? 10 : 5;
      setFeedback({ type: 'success', pts });
      setDone(true);
      const newWind = applyAnswerRestore(windEnergy, nextAttempts);
      onWindUpdate?.(newWind);
      setTimeout(() => onComplete({ points: pts, correct: true, attempts: nextAttempts }), 1800);
    } else if (nextAttempts >= 2) {
      setAttempts(nextAttempts);
      setFeedback({ type: 'revealed', answer: question.answer });
      setDone(true);
      setTimeout(() => onComplete({ points: 0, correct: false, attempts: nextAttempts }), 2400);
    } else {
      setAttempts(nextAttempts);
      setFeedback({ type: 'wrong', remaining: 2 - nextAttempts });
      setInput('');
      setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 1200);
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
              ? '🎯 +10 punkti par pareizu atbildi'
              : '💡 +5 punkti — vēl 1 mēģinājums'}
          </p>
        </div>

        {!done && (
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
            ✗ Nepareizi — vēl {feedback.remaining} mēģinājums
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
