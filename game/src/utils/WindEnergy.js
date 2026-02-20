export const WIND_MAX = 100;
export const WIND_TRAVEL_COST = 10;
export const WIND_RESTORE_FIRST = 15;
export const WIND_RESTORE_SECOND = 8;
export const WIND_PENALTY_EMPTY = 5;

export function applyTravelCost(current) {
  return Math.max(0, current - WIND_TRAVEL_COST);
}

export function applyAnswerRestore(current, attemptNumber) {
  const gain = attemptNumber === 1 ? WIND_RESTORE_FIRST : WIND_RESTORE_SECOND;
  return Math.min(WIND_MAX, current + gain);
}

export function getWindLevel(energy) {
  if (energy >= 70) return { label: 'Spēcīgs', color: '#4caf50' };
  if (energy >= 40) return { label: 'Vidējs', color: '#ffaa00' };
  if (energy >= 15) return { label: 'Vājš', color: '#ff9800' };
  return { label: 'Kritiski!', color: '#f44336' };
}
