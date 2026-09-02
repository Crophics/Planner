const { test } = require('node:test');
const assert = require('node:assert');

global.window = global;
global.localStorage = { setItem: () => {} }; // stub, not testing storage here
require('../js/today-logic.js');

function baseCtx(overrides = {}) {
  return {
    items: [],
    storageKey: 'test-key',
    isLocked: () => false,
    unlockedToday: () => false,
    today: () => '2026-09-02',
    daysBetween: (a, b) => {
      const d1 = new Date(a), d2 = new Date(b);
      return Math.round((d2 - d1) / 86400000);
    },
    addDays: (d, n) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + n);
      return dt.toISOString().slice(0, 10);
    },
    ...overrides,
  };
}

test('a single-part item due today is required', () => {
  const item = { title: 'Reading', total: 1, done: 0, due: '2026-09-02', completed: false, archived: false };
  const ctx = baseCtx({ items: [item] });
  const result = TPTodayLogic.computeTodayPanel(ctx);
  assert.ok(result.hasRequired, 'expected hasRequired to be truthy');
  assert.strictEqual(result.requiredTight.length, 1);
});

test('completing your only assignment today counts as all done today', () => {
  const item = {
    title: 'Reading',
    total: 1,
    done: 1,
    due: '2026-09-02',
    completed: true,
    completedAt: '2026-09-02',
    archived: false,
  };
  const ctx = baseCtx({ items: [item] });
  const result = TPTodayLogic.computeTodayPanel(ctx);
  assert.strictEqual(result.allDoneToday, true);
});

test('finishing today\'s daily target on a multi-part book counts as all done, even if the book itself is not complete', () => {
  const item = {
    title: 'Big Book',
    total: 20,          // 20 chapters total
    done: 8,             // finished 8 so far, 12 left
    due: '2026-09-14',   // exactly 12 days out -> no slack, 1 chapter/day required
    completed: false,    // NOT fully done
    archived: false,
    createdAt: '2026-08-01', // existed before "today"
  };
  const ctx = baseCtx({ items: [item] });

  // Simulate having already made today's target progress: bump `done` up
  // by the item's dailyTarget amount, same as completing today's chapters would.
  const panelBefore = TPTodayLogic.computeTodayPanel(ctx);
  assert.ok(panelBefore.hasRequired, 'should require some chapters today before finishing them');

  item.done += item.dailyTarget.amt; // finish today's assigned chapters
  const panelAfter = TPTodayLogic.computeTodayPanel(ctx);

  assert.strictEqual(panelAfter.hasRequired, false, 'no more required once daily target is hit');
  assert.strictEqual(panelAfter.allDoneToday, true, 'should count as all done today');
});