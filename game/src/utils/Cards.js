const STORE_KEY = 'eksk_cards_v1';

export function getUnlockedCards() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function unlockCard(locationId) {
  const cards = getUnlockedCards();
  if (!cards.includes(locationId)) {
    localStorage.setItem(STORE_KEY, JSON.stringify([...cards, locationId]));
    return true;
  }
  return false;
}

export function clearCards() {
  try { localStorage.removeItem(STORE_KEY); } catch {}
}

export const CARD_META = {
  dzintars:   { emoji: '🎵', title: 'Lielais Dzintars',         rarity: 'rare',   color: '#bb86fc' },
  teatris:    { emoji: '🎭', title: 'Liepājas Teātris',         rarity: 'rare',   color: '#ff9800' },
  mols:       { emoji: '⚓', title: 'Ziemeļu Mols',             rarity: 'common', color: '#4caf50' },
  rtu:        { emoji: '🎓', title: 'RTU Liepājas akadēmija',   rarity: 'epic',   color: '#ffd700' },
  ezerkrasts: { emoji: '🦢', title: 'Ezerkrasta taka',          rarity: 'common', color: '#26c6da' },
  kanals:     { emoji: '🚢', title: 'Tirdzniecības kanāls',     rarity: 'common', color: '#2196f3' },
  osta:       { emoji: '🏭', title: 'Liepājas Osta',            rarity: 'rare',   color: '#f44336' },
  lsez:       { emoji: '⚙️', title: 'LSEZ',                     rarity: 'epic',   color: '#ff5722' },
  cietums:    { emoji: '🔒', title: 'Karostas cietums',         rarity: 'rare',   color: '#78909c' },
  parks:      { emoji: '🌲', title: 'Jūrmalas parks',           rarity: 'legendary', color: '#66bb6a' },
};
