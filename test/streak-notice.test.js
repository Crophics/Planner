/**
 * Daily streak banner (onboarding notice).
 *
 * "Streak ended" must only appear when a real streak just broke — not on
 * empty installs, data imports with no recent history, or old broken streaks.
 *
 * Pure helpers mirror js/app.js getDailyStreakNotice / currentStreak.
 */
const { test } = require('node:test');
const assert = require('node:assert');

const TODAY = '2026-09-02';
const YESTERDAY = '2026-09-01';
const DAY_BEFORE = '2026-08-31';

function asDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}
function addDays(dateStr, n) {
  const d = asDate(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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

/**
 * Mirrors app.js getDailyStreakNotice (pure: log + flags in, notice or null out).
 * @returns {{ message: string } | null}
 */
function getDailyStreakNotice({
  dayCompleteLog = [],
  todayStr = TODAY,
  seen = null,
  dismissed = null,
} = {}) {
  if (seen === todayStr || dismissed === todayStr) return null;

  const streak = currentStreak(dayCompleteLog, todayStr);
  if (streak > 0) {
    return {
      message: `Your ${streak}-day streak is still active. Keep the momentum going today.`,
    };
  }

  const yesterday = addDays(todayStr, -1);
  const dayBeforeYesterday = addDays(todayStr, -2);
  const daySet = new Set(dayCompleteLog);
  const justEnded = daySet.has(dayBeforeYesterday) && !daySet.has(yesterday);
  if (!justEnded) return null;

  return {
    message: 'Your streak ended today. Reset your focus and build it back tomorrow.',
  };
}

test('no notice on empty install (no dayCompleteLog)', () => {
  assert.strictEqual(getDailyStreakNotice({ dayCompleteLog: [] }), null);
});

test('no notice after importing data with no recent completions', () => {
  // Import brought old history from weeks ago — not a streak that "just ended"
  const old = [addDays(TODAY, -30), addDays(TODAY, -29), addDays(TODAY, -28)];
  assert.strictEqual(getDailyStreakNotice({ dayCompleteLog: old }), null);
});

test('no notice when streak died several days ago', () => {
  // Last complete day was 5 days ago; missing yesterday is not "just ended"
  const log = [addDays(TODAY, -5), addDays(TODAY, -4)];
  assert.strictEqual(currentStreak(log), 0);
  assert.strictEqual(getDailyStreakNotice({ dayCompleteLog: log }), null);
});

test('shows "streak ended" only when day-before-yesterday was complete and yesterday was missed', () => {
  // Streak was alive through DAY_BEFORE; missed YESTERDAY → broke this morning
  const log = [addDays(DAY_BEFORE, -1), DAY_BEFORE];
  assert.strictEqual(currentStreak(log), 0);
  const notice = getDailyStreakNotice({ dayCompleteLog: log });
  assert.ok(notice, 'expected a notice');
  assert.match(notice.message, /streak ended/i);
});

test('shows "still active" when yesterday is complete (streak alive, today not yet logged)', () => {
  const log = [DAY_BEFORE, YESTERDAY];
  assert.strictEqual(currentStreak(log), 2);
  const notice = getDailyStreakNotice({ dayCompleteLog: log });
  assert.ok(notice);
  assert.match(notice.message, /2-day streak is still active/);
});

test('shows "still active" when today is already logged', () => {
  const log = [DAY_BEFORE, YESTERDAY, TODAY];
  assert.strictEqual(currentStreak(log), 3);
  const notice = getDailyStreakNotice({ dayCompleteLog: log });
  assert.ok(notice);
  assert.match(notice.message, /3-day streak is still active/);
});

test('no notice when already dismissed today', () => {
  const log = [DAY_BEFORE]; // would otherwise be "ended"
  assert.strictEqual(
    getDailyStreakNotice({ dayCompleteLog: log, dismissed: TODAY }),
    null
  );
});

test('no notice when already seen today', () => {
  const log = [YESTERDAY]; // would otherwise be "still active"
  assert.strictEqual(
    getDailyStreakNotice({ dayCompleteLog: log, seen: TODAY }),
    null
  );
});

test('single day-before-yesterday without longer history still counts as just ended', () => {
  // Even a 1-day streak that wasn't continued is a real streak that ended
  const notice = getDailyStreakNotice({ dayCompleteLog: [DAY_BEFORE] });
  assert.ok(notice);
  assert.match(notice.message, /streak ended/i);
});
