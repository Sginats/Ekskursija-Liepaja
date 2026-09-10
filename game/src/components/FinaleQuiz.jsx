import { useEffect, useState } from 'react';

const QUESTIONS = [
  { question: 'Kāds ir Liepājas neoficiālais simbols?', options: ['Dzintars', 'Vējš', 'Roze', 'Ozols'], answer: 'Vējš', fact: 'Liepāju bieži dēvē par vēju pilsētu.' },
  { question: 'Kurā gadā Liepāja ieguva pilsētas tiesības?', options: ['1595', '1625', '1700', '1812'], answer: '1625', fact: 'Liepājas pilsētas tiesības apstiprināja 1625. gadā.' },
  { question: 'Kā sauc bijušo militāro kvartālu Liepājas ziemeļos?', options: ['Karosta', 'Vecliepāja', 'Ezerkrasts', 'Piejūra'], answer: 'Karosta', fact: 'Karosta izveidota kā Krievijas impērijas kara osta.' },
  { question: 'Pie kuras jūras atrodas Liepāja?', options: ['Baltijas jūras', 'Melnās jūras', 'Ziemeļjūras', 'Vidusjūras'], answer: 'Baltijas jūras', fact: 'Liepāja atrodas Baltijas jūras austrumu krastā.' },
  { question: 'Kāds vēsturisks instruments redzams Liepājas himnas simbolikā?', options: ['Vijole', 'Trompete', 'Ģitāra', 'Bungas'], answer: 'Vijole', fact: 'Liepājas kultūras dzīve ir cieši saistīta ar mūziku.' },
];

const TIME_LIMIT = 20;

export default function FinaleQuiz({ clues = [], onComplete }) {
  const [index, setIndex] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [remaining, setRemaining] = useState(TIME_LIMIT);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const [mysteryAnswer, setMysteryAnswer] = useState(null);

  useEffect(() => {
    if (feedback || finished) return undefined;
    const timer = window.setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          setFeedback({ correct: false, timedOut: true });
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [feedback, finished, index]);

  function answer(option) {
    if (feedback) return;
    const question = QUESTIONS[index];
    const correct = option === question.answer;
    if (correct) setBonusPoints(points => points + 2);
    setFeedback({ correct, selected: option });
  }

  function next() {
    if (index === QUESTIONS.length - 1) {
      setFinished(true);
      return;
    }

    function solveMystery(answer) {
      if (mysteryAnswer) return;
      const correct = answer === 'Kultūra un jūra';
      if (correct) setBonusPoints(points => points + 5);
      setMysteryAnswer({ correct });
    }
    setIndex(value => value + 1);
    setRemaining(TIME_LIMIT);
    setFeedback(null);
  }

  const question = QUESTIONS[index];
  const progress = ((TIME_LIMIT - remaining) / TIME_LIMIT) * 100;

  return (
    <div className="finale-quiz-overlay" role="dialog" aria-modal="true" aria-label="Noslēguma tests">
      <div className="finale-quiz-box">
        {finished ? (
          <div className="finale-quiz-results">
            <h2 className="finale-quiz-title">🎉 Tests pabeigts!</h2>
            <p className="finale-quiz-fact">Tu ieguvi <strong>+{bonusPoints} bonusa punktus</strong>.</p>
            <button className="finale-quiz-next-btn" onClick={() => onComplete({ bonusPoints })}>
              Turpināt
            </button>
          </div>
        ) : index === QUESTIONS.length - 1 && feedback && !mysteryAnswer ? (
          <>
            <div className="finale-quiz-header">
              <span className="finale-quiz-badge">Pilsētas noslēpums</span>
              <span className="finale-quiz-progress-label">{clues.length}/10 pavedieni</span>
            </div>
            <p className="finale-quiz-question">Ko visi savāktie pavedieni stāsta par Liepājas spēku?</p>
            <div className="finale-quiz-options">
              {['Kultūra un jūra', 'Tikai rūpniecība', 'Tikai daba'].map(option => (
                <button className="finale-quiz-opt" key={option} onClick={() => solveMystery(option)}>{option}</button>
              ))}
            </div>
          </>
        ) : mysteryAnswer ? (
          <div className={`finale-quiz-feedback ${mysteryAnswer.correct ? 'correct' : 'wrong'}`}>
            <div className="finale-quiz-feedback-line">{mysteryAnswer.correct ? '🧩 Noslēpums atrisināts! +5 punkti' : '🧩 Labs mēģinājums'}</div>
            <p className="finale-quiz-fact">Tavi pavedieni savienojas vienā stāstā: Liepāja aug tur, kur satiekas kultūra, daba un jūra.</p>
            <button className="finale-quiz-next-btn" onClick={() => setFinished(true)}>Pabeigt ekskursiju</button>
          </div>
        ) : (
          <>
            <div className="finale-quiz-header">
              <span className="finale-quiz-badge">Noslēguma tests</span>
              <span className="finale-quiz-progress-label">{index + 1}/{QUESTIONS.length}</span>
              <span className={`finale-quiz-timer ${remaining <= 5 ? 'urgent' : remaining <= 10 ? 'warning' : ''}`} aria-live="polite">
                ⏱ {remaining}s
              </span>
            </div>
            <div className="finale-quiz-timer-bar">
              <div className={`finale-quiz-timer-fill ${remaining <= 5 ? 'urgent' : remaining <= 10 ? 'warning' : ''}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="finale-quiz-question">{question.question}</p>
            {!feedback ? (
              <div className="finale-quiz-options">
                {question.options.map(option => (
                  <button className="finale-quiz-opt" key={option} onClick={() => answer(option)}>{option}</button>
                ))}
              </div>
            ) : (
              <div className={`finale-quiz-feedback ${feedback.correct ? 'correct' : 'wrong'}`}>
                <div className="finale-quiz-feedback-line">{feedback.correct ? '✅ Pareizi! +2 punkti' : feedback.timedOut ? '⏰ Laiks beidzās' : '❌ Nepareizi'}</div>
                <p className="finale-quiz-fact">{question.fact} Pareizā atbilde: <strong>{question.answer}</strong>.</p>
                <button className="finale-quiz-next-btn" onClick={next}>
                  {index === QUESTIONS.length - 1 ? 'Pabeigt testu' : 'Nākamais jautājums'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
