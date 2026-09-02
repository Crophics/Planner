/* item-logic.js — Prerequisite lock/unlock logic */
(function (global) {
  function isLocked(items, it) {
    if (!it.dependsOn) return false;
    const prereq = items.find((x) => x.title === it.dependsOn);
    return prereq ? !prereq.completed : false;
  }

  function unlockedToday(items, it, today) {
    if (!it.dependsOn) return false;
    const prereq = items.find((x) => x.title === it.dependsOn);
    return !!(prereq && prereq.completed && prereq.completedAt === today());
  }

  global.TPItemLogic = { isLocked, unlockedToday };
})(typeof window !== 'undefined' ? window : globalThis);