import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { locationInfo } from '../../game/locationInfo.js';
import styles from './QuizModal.module.css';

const GUIDE_BUBBLES_CORRECT = [
  'Lielisks darbs! Tu zini Liepajas vesturi!',
  'Pareizi! Tu esi istenais eksperts!',
  'Bravo! Ta turpini!',
  'Izcili! Nakamais izaicinajums gaida!',
];

const GUIDE_BUBBLES_WRONG = [
  'Ta nav pareiza atbilde. Megini velreiz!',
  'Nekas, ari kludities ir cilveciski!',
  'Gandrīz! Bet nepadodies!',
  'Ups! Nakamreiz noteikti sanaks!',
];

function randomBubble(correct) {
  const arr = correct ? GUIDE_BUBBLES_CORRECT : GUIDE_BUBBLES_WRONG;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function QuizModal({ open, location, onComplete, onClose }) {
  const { questionsRef, addScore, antiCheat, notify } = useGame();

  const [phase, setPhase] = useState('question'); // 'question' | 'theory' | 'result'
  const [answer, setAnswer] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [bubble, setBubble] = useState('Sveiks! Esmu tavs gids.');
  const [resultMsg, setResultMsg] = useState('');
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const question = location ? questionsRef.current[location] : null;
  const info = location ? locationInfo[location] : null;

  // Reset when location changes
  useEffect(() => {
    if (open) {
      setPhase('question');
      setAnswer('');
      setWrongCount(0);
      setBubble('Sveiks! Esmu tavs gids.');
      setResultMsg('');
      setEarnedPoints(0);
      setLoading(false);
      antiCheat.recordTaskStart(location);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, location]);

  const submit = useCallback(async () => {
    if (!antiCheat.validateAnswerSubmission()) {
      notify('Atbilde iesniegta parsāk atri!', 'warning');
      return;
    }
    if (!answer.trim()) {
      notify('Ievadi atbildi!', 'warning');
      return;
    }
    if (antiCheat.suspended) {
      notify('Sesija apturēta.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('../src/php/check_answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question?.id,
          answer: answer.trim(),
          sessionId: antiCheat.sessionId,
          final: wrongCount >= 1,
        }),
      });
      const data = await res.json();

      if (data.correct) {
        const pts = wrongCount === 0 ? 10 : 5;
        const newScore = addScore(pts);
        setBubble(randomBubble(true));
        setEarnedPoints(pts);
        setResultMsg(`Pareizi! +${pts} punkti`);
        setPhase('result');
        notify(`Pareiza atbilde! +${pts} punkti`, 'success', 2000);
      } else {
        const newWrong = wrongCount + 1;
        setWrongCount(newWrong);
        setBubble(randomBubble(false));
        if (newWrong >= 2) {
          setResultMsg(`Nepareizi. Pareizā atbilde: ${data.correctAnswer || '—'}`);
          setPhase('result');
          setEarnedPoints(0);
          notify('2 nepareizas atbildes. 0 punkti.', 'error', 3000);
        } else {
          setAnswer('');
          notify('Nepareiza atbilde! Vel 1 meginjums.', 'error', 2000);
          antiCheat.recordTaskStart(location); // reset timer for retry
          setTimeout(() => inputRef.current?.focus(), 80);
        }
      }
    } catch (_) {
      notify('Savienojuma kludda. Parbaudiet internetu.', 'error');
    } finally {
      setLoading(false);
    }
  }, [answer, wrongCount, question, location, addScore, antiCheat, notify]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  const handleContinue = () => {
    antiCheat.recordTaskEnd(location, earnedPoints);
    onComplete(earnedPoints);
  };

  if (!open || !location || !question) return null;

  return (
    <Modal open={open} onClose={phase === 'result' ? onClose : undefined}>
      <div className={styles.layout} data-game>
        {/* Guide */}
        <div className={styles.guideCol}>
          <img src="/atteli/kaija.png" alt="Gids" className={styles.guideImg} />
          <div className={styles.bubble}>{bubble}</div>
        </div>

        {/* Content */}
        <div className={styles.taskCol}>
          {phase === 'theory' ? (
            <>
              <h3 className={styles.locName}>{info?.name}</h3>
              <p className={styles.desc}>{info?.desc}</p>
              <button
                className={styles.btn}
                onClick={() => { setPhase('question'); antiCheat.recordTaskStart(location); setTimeout(() => inputRef.current?.focus(), 80); }}
              >
                Atpakal uz jautajumu
              </button>
            </>
          ) : phase === 'question' ? (
            <>
              <h2 className={styles.locTitle}>{location}</h2>
              <p className={styles.questionText}>{question.q}</p>
              {wrongCount === 1 && (
                <p className={styles.hint}>
                  (Pareiza atbilde tagad dos +5 punktus)
                </p>
              )}
              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                placeholder="Tava atbilde..."
                maxLength={60}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="off"
              />
              <button
                className={styles.btn}
                onClick={submit}
                disabled={loading}
              >
                {loading ? 'Parbauda...' : wrongCount === 1 ? 'Iesniegt atkartoti' : 'Iesniegt'}
              </button>
              <button
                className={styles.helpBtn}
                onClick={() => setPhase('theory')}
              >
                ? Palidziba
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.locTitle}>{location}</h2>
              <p className={earnedPoints > 0 ? styles.correct : styles.wrong}>
                {resultMsg}
              </p>
              <p className={styles.fact}>{question.fact}</p>
              <button className={styles.btn} onClick={handleContinue}>
                Turpinat
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
