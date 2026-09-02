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