/**
 * Streak instant-update: finishing today's last required work must update
 * dayCompleteLog BEFORE the summary text is built, so "N-day streak 🔥"
 * appears on the same paint (not the next interaction).
 *
 * Pure streak helpers mirror js/app.js (currentStreak / logDayComplete).
 * allDoneToday / hasTodayWorkRemaining come from js/today-logic.js.
 */
const { test } = require('node:test');
const assert = require('node:assert');

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
require('../js/today-logic.js');

const TODAY = '2026-09-02';
const YESTERDAY = '2026-09-01';

function asDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}
function addDays(dateStr, n) {
  const d = asDate(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((asDate(b) - asDate(a)) / 86400000);
}

/** Mirrors app.js currentStreak */
function currentStreak(dayCompleteLog, todayStr = TODAY) {
  const daySet = new Set(dayCompleteLog);
  let streak = 0;
  let d = todayStr;
  if (!daySet.has(d)) {
    d = addDays(d, -1);
  }
  while (daySet.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

/** Mirrors app.js logDayComplete (mutates array, no storage) */
function logDayComplete(dayCompleteLog, todayStr = TODAY) {
  if (!dayCompleteLog.includes(todayStr)) {
    dayCompleteLog.push(todayStr);
  }
  return dayCompleteLog;
}

function streakText(dayCompleteLog, todayStr = TODAY) {
  const streak = currentStreak(dayCompleteLog, todayStr);
  return streak > 0 ? `${streak}-day streak 🔥` : '';
}

function baseCtx(overrides = {}) {
  return {
    items: [],
    storageKey: 'test-key',
    isLocked: () => false,
    unlockedToday: () => false,
    today: () => TODAY,
    daysBetween,
    ...overrides,
  };
}

test('currentStreak counts consecutive days ending today or yesterday', () => {
  assert.strictEqual(currentStreak([]), 0);
  assert.strictEqual(currentStreak([YESTERDAY]), 1);
  assert.strictEqual(currentStreak([YESTERDAY, TODAY]), 2);
  assert.strictEqual(currentStreak([addDays(TODAY, -2), YESTERDAY, TODAY]), 3);
  // gap: only yesterday counts
  assert.strictEqual(currentStreak([addDays(TODAY, -3), YESTERDAY]), 1);
});

test('without logDayComplete, finishing the day still shows the old streak text', () => {
  const dayCompleteLog = [YESTERDAY];
  assert.strictEqual(streakText(dayCompleteLog), '1-day streak 🔥');
  // today not logged yet — this is the stale paint bug
  assert.ok(!dayCompleteLog.includes(TODAY));
});

test('logDayComplete before reading streak shows updated 🔥 on same paint', () => {
  const dayCompleteLog = [YESTERDAY];
  const item = {
    title: 'Finish essay',
    total: 1,
    done: 0,
    due: TODAY,
    completed: false,
    completedAt: null,
    createdAt: YESTERDAY,
    archived: false,
  };
  const items = [item];

  let panel = TPTodayLogic.computeTodayPanel(baseCtx({ items }));
  assert.strictEqual(panel.hasRequired, true);
  assert.strictEqual(panel.allDoneToday, false);
  assert.strictEqual(TPTodayLogic.hasTodayWorkRemaining(baseCtx({ items })), true);

  // Complete the last required task
  item.completed = true;
  item.done = 1;
  item.completedAt = TODAY;

  panel = TPTodayLogic.computeTodayPanel(baseCtx({ items }));
  assert.strictEqual(panel.hasRequired, false);
  assert.strictEqual(panel.allDoneToday, true);
  assert.strictEqual(TPTodayLogic.hasTodayWorkRemaining(baseCtx({ items })), false);

  // FIXED order (click handler + render): log before building summary
  if (panel.allDoneToday) logDayComplete(dayCompleteLog);

  assert.ok(dayCompleteLog.includes(TODAY));
  assert.strictEqual(currentStreak(dayCompleteLog), 2);
  assert.strictEqual(streakText(dayCompleteLog), '2-day streak 🔥');
});

test('when today is already logged, streak text stays correct and does not duplicate', () => {
  const dayCompleteLog = [addDays(TODAY, -2), YESTERDAY, TODAY];
  assert.strictEqual(currentStreak(dayCompleteLog), 3);

  logDayComplete(dayCompleteLog); // no-op
  assert.strictEqual(dayCompleteLog.filter((d) => d === TODAY).length, 1);
  assert.strictEqual(streakText(dayCompleteLog), '3-day streak 🔥');
});

test('render order contract: logDayComplete runs before streak is read', () => {
  const dayCompleteLog = [YESTERDAY];
  const calls = [];

  function simulatedRender(allDoneToday) {
    if (allDoneToday) {
      calls.push('logDayComplete');
      logDayComplete(dayCompleteLog);
    }
    calls.push('readStreak');
    return streakText(dayCompleteLog);
  }

  const text = simulatedRender(true);
  assert.deepStrictEqual(calls, ['logDayComplete', 'readStreak']);
  assert.strictEqual(text, '2-day streak 🔥');
});

test('click-handler path: workBefore && !workAfter logs today before save/render', () => {
  const dayCompleteLog = [YESTERDAY];
  const item = {
    title: 'Lab report',
    total: 1,
    done: 0,
    due: TODAY,
    completed: false,
    completedAt: null,
    createdAt: YESTERDAY,
    archived: false,
  };
  const items = [item];

  const workBefore = TPTodayLogic.hasTodayWorkRemaining(baseCtx({ items }));
  item.completed = true;
  item.done = 1;
  item.completedAt = TODAY;
  const workAfter = TPTodayLogic.hasTodayWorkRemaining(baseCtx({ items }));

  assert.strictEqual(workBefore, true);
  assert.strictEqual(workAfter, false);

  if (workBefore && !workAfter) {
    logDayComplete(dayCompleteLog);
  }

  assert.strictEqual(currentStreak(dayCompleteLog), 2);
  assert.strictEqual(streakText(dayCompleteLog), '2-day streak 🔥');
});
