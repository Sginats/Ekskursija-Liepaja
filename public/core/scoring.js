(() => {
  const activityScores = {};
  let totalScore = 0;

  function clampScore(activityId, delta, cap) {
    const current = activityScores[activityId] || 0;
    const next = Math.min(cap, Math.max(0, current + delta));
    const applied = next - current;
    activityScores[activityId] = next;
    totalScore = Math.max(0, totalScore + applied);
    return { applied, activityTotal: next, totalScore };
  }

  function resetAll() {
    totalScore = 0;
    Object.keys(activityScores).forEach((key) => delete activityScores[key]);
  }

  window.GameScore = {
    add: clampScore,
    reset: resetAll,
    getTotal: () => totalScore,
    getActivity: (activityId) => activityScores[activityId] || 0
  };
})();
