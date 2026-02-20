export default function ScoreBar({ score, locationName, phase }) {
  return (
    <div className="score-bar">
      <span className="score-bar-phase">{locationName}</span>
      <span className="score-bar-score">⭐ {score} punkti</span>
      {phase && <span className="score-bar-hint">{phase}</span>}
    </div>
  );
}
