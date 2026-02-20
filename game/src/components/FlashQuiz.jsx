/**
 * FlashQuiz
 *
 * Full-screen overlay that presents a community flash quiz question.
 * Activated server-side when ≥ 3 players are connected.
 * Correct answers contribute to the global city progress.
 */

import { useState, useEffect, useRef } from 'react';

export default function FlashQuiz({ quiz, onSubmit }) {
  const { quizId, question, options, timeLimit } = quiz;
  const [selected,  setSelected]  = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(timeLimit);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          if (!submitted) handleSubmit(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(answer) {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(intervalRef.current);
    if (answer) onSubmit(quizId, answer);
  }

  const urgency = timeLeft <= 5 ? 'urgent' : timeLeft <= 10 ? 'warning' : '';

  return (
    <div className="flash-quiz-overlay">
      <div className="flash-quiz-box">
        <div className="flash-quiz-header">
          <span className="flash-quiz-badge">⚡ Zibens Viktorīna</span>
          <span className={`flash-quiz-timer ${urgency}`}>{timeLeft}s</span>
        </div>

        <div className="flash-quiz-progress">
          <div
            className="flash-quiz-progress-fill"
            style={{ width: `${(timeLeft / timeLimit) * 100}%`, transition: 'width 1s linear' }}
          />
        </div>

        <p className="flash-quiz-question">{question}</p>

        <div className="flash-quiz-options">
          {options.map((opt) => (
            <button
              key={opt}
              className={`flash-quiz-opt ${selected === opt ? 'selected' : ''} ${submitted ? 'disabled' : ''}`}
              onClick={() => {
                if (submitted) return;
                setSelected(opt);
                handleSubmit(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {submitted && (
          <p className="flash-quiz-submitted">
            ✓ Atbilde iesniegta! Gaidām rezultātus...
          </p>
        )}

        <p className="flash-quiz-community-note">
          🌍 Pareizas atbildes veicina kopīgo pilsētas progresu!
        </p>
      </div>
    </div>
  );
}
