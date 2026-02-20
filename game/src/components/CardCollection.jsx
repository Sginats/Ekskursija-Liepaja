import { CARD_META } from '../utils/Cards.js';
import { LOCATIONS } from '../data/LocationData.js';

export default function CardCollection({ unlockedCards, onClose }) {
  return (
    <div className="card-collection-overlay" role="dialog" aria-modal="true">
      <div className="card-collection-panel">
        <div className="panel-header">
          <h2>🃏 Kolekcionējamās Kartītes</h2>
          <button className="close-btn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>

        <p className="panel-sub">{unlockedCards.length} / {LOCATIONS.length} atbloķētas</p>

        <div className="cards-grid">
          {LOCATIONS.map(loc => {
            const meta = CARD_META[loc.id];
            const unlocked = unlockedCards.includes(loc.id);
            return (
              <div
                key={loc.id}
                className={`card ${unlocked ? 'card-unlocked' : 'card-locked'} card-${meta?.rarity}`}
                style={{ borderColor: unlocked ? meta?.color : '#444' }}
              >
                <span className="card-emoji">{unlocked ? meta?.emoji : '🔒'}</span>
                <span className="card-name">{unlocked ? meta?.title : '???'}</span>
                {unlocked && <span className={`card-rarity rarity-${meta?.rarity}`}>{meta?.rarity}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
