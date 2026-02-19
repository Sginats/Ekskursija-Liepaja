import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { locationInfo } from '../../game/locationInfo.js';
import styles from './QuizModal.module.css';

const GUIDE_BUBBLES_CORRECT = [
  'Lielisks darbs! Tu zini Liepājas vēsturi!',
  'Pareizi! Tu esi īstais eksperts!',
  'Bravo! Tā turpini!',
  'Izcili! Nākamais izaicinājums gaida!',
];

const GUIDE_BUBBLES_WRONG = [
  'Tā nav pareiza atbilde. Mēģini vēlreiz!',
  'Nekas, arī kļūdīties ir cilvēciski!',
  'Gandrīz! Bet nepadodies!',
  'Ups! Nākamreiz noteikti sanāks!',
];

function randomBubble(correct) {
  const arr = correct ? GUIDE_BUBBLES_CORRECT : GUIDE_BUBBLES_WRONG;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function QuizModal({ open, location, onComplete, onClose }) {
  const { questionsRef, addScore, antiCheat, notify, gameTokenRef, state, loseLife, incrementCombo, resetCombo } = useGame();
  const { setMusicRate } = useAudio();

  const [phase, setPhase] = useState('question'); // 'question' | 'theory' | 'result'
  const [answer, setAnswer] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [bubble, setBubble] = useState('Sveiks! Esmu tavs gids.');
  const [resultMsg, setResultMsg] = useState('');
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const getComboMultiplier = (combo) => (combo >= 3 ? Math.min(combo - 1, 4) : 1);

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

      // Start countdown timer — limit shrinks as more tasks are completed;
      // Hard mode uses tighter limits
      if (timerRef.current) clearInterval(timerRef.current);
      const done = state.completedTasks;
      const isHard = state.difficulty === 'hard';
      const limit = isHard
        ? (done < 3 ? 45 : done < 7 ? 30 : 20)
        : (done < 3 ? 60 : done < 7 ? 45 : 30);
      setTimeLeft(limit);
      timerRef.current = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setMusicRate(1);
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [open, location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop timer and restore music rate when result is shown
  useEffect(() => {
    if (phase === 'result') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setMusicRate(1);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adaptive music + timeout handling
  useEffect(() => {
    if (phase !== 'question' || timeLeft === null) return;
    if (timeLeft <= 10 && timeLeft > 0) {
      // Gradually speed up: 1.0x at 10s → 1.4x at 0s
      setMusicRate(1 + (10 - timeLeft) * 0.04);
    } else if (timeLeft > 10) {
      setMusicRate(1);
    }
    if (timeLeft === 0) {
      // Time's up — treat as final wrong answer
      resetCombo();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      let lifeMsg = '';
      if (state.difficulty === 'hard') {
        const remaining = loseLife();
        lifeMsg = remaining > 0 ? ` Palicis ${remaining} ❤` : ' Dzīvības beidzās! 💔';
      }
      setResultMsg('Laiks beidzās! 0 punkti.');
      setPhase('result');
      setEarnedPoints(0);
      notify(`Laiks beidzās! 0 punkti.${lifeMsg}`, 'error', 3000);
    }
  }, [timeLeft, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async () => {
    if (!antiCheat.validateAnswerSubmission()) {
      notify('Atbilde iesniegta pārāk ātri!', 'warning');
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

    // Compute potential combo multiplier (only applies on first attempt)
    const potentialCombo = wrongCount >= 1 ? 1 : state.combo + 1;
    const multiplier = getComboMultiplier(potentialCombo);

    setLoading(true);
    try {
      const res = await fetch('../src/php/check_answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionId: question?.id,
          answer: answer.trim(),
          sessionId: antiCheat.sessionId,
          gameToken: gameTokenRef?.current || '',
          final: wrongCount >= 1,
          multiplier,
        }),
      });
      const data = await res.json();

      if (data.correct) {
        const newCombo = wrongCount >= 1 ? 1 : state.combo + 1;
        const pts = (wrongCount === 0 ? 10 : 5) * (wrongCount >= 1 ? 1 : getComboMultiplier(newCombo));
        addScore(pts);
        if (wrongCount === 0) {
          incrementCombo();
        } else {
          resetCombo();
          incrementCombo(); // restart combo at 1 after recovering with second attempt
        }
        const comboSuffix = getComboMultiplier(newCombo) > 1 ? ` 🔥 x${getComboMultiplier(newCombo)} COMBO!` : '';
        setBubble(randomBubble(true));
        setEarnedPoints(pts);
        setResultMsg(`Pareizi! +${pts} punkti${comboSuffix}`);
        setPhase('result');
        notify(`Pareiza atbilde! +${pts} punkti${comboSuffix}`, 'success', 2000);
      } else {
        const newWrong = wrongCount + 1;
        setWrongCount(newWrong);
        setBubble(randomBubble(false));
        if (navigator.vibrate) navigator.vibrate(150);
        if (newWrong >= 2) {
          resetCombo();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          let lifeMsg = '';
          if (state.difficulty === 'hard') {
            const remaining = loseLife();
            lifeMsg = remaining > 0 ? ` Palicis ${remaining} ❤` : ' Dzīvības beidzās! 💔';
          }
          setResultMsg(`Nepareizi. Pareizā atbilde: ${data.correctAnswer || '—'}`);
          setPhase('result');
          setEarnedPoints(0);
          notify(`2 nepareizas atbildes. 0 punkti.${lifeMsg}`, 'error', 3000);
        } else {
          setAnswer('');
          notify('Nepareiza atbilde! Vēl 1 mēģinājums.', 'error', 2000);
          antiCheat.recordTaskStart(location); // reset timer for retry
          setTimeout(() => inputRef.current?.focus(), 80);
        }
      }
    } catch (_) {
      notify('Savienojuma kļūda. Pārbaudiet internetu.', 'error');
    } finally {
      setLoading(false);
    }
  }, [answer, wrongCount, question, location, addScore, antiCheat, notify, gameTokenRef, state, loseLife, incrementCombo, resetCombo]);

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
                Atpakaļ uz jautājumu
              </button>
            </>
          ) : phase === 'question' ? (
            <>
              <div className={styles.questionHeader}>
                <h2 className={styles.locTitle}>{location}</h2>
                {timeLeft !== null && (
                  <span className={timeLeft <= 10 ? styles.timerCritical : styles.timer}>
                    ⏱ {timeLeft}s
                  </span>
                )}
              </div>
              {state.combo >= 2 && (
                <div className={styles.combo}>
                  🔥 {state.combo >= 3
                    ? `x${getComboMultiplier(state.combo + 1)} COMBO!`
                    : 'Vēl 1 pareiza atbilde → x2!'}
                </div>
              )}
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
                {loading ? 'Pārbauda…' : wrongCount === 1 ? 'Iesniegt atkārtoti' : 'Iesniegt'}
              </button>
              <button
                className={styles.helpBtn}
                onClick={() => setPhase('theory')}
              >
                ? Palīdzība
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
