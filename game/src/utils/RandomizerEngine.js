import { getLockedIndex } from './SessionLock.js';

export function getLocationConfig(location) {
  const mgIdx = getLockedIndex(location.id, 'mg', location.miniGames.length);
  const qIdx = getLockedIndex(location.id, 'q', location.questions.length);
  return {
    miniGame: { ...location.miniGames[mgIdx], _idx: mgIdx },
    question: { ...location.questions[qIdx], _idx: qIdx },
  };
}
