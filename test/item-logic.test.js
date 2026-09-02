const { test } = require('node:test');
const assert = require('node:assert');

global.window = global;
require('../js/item-logic.js');

test('item is locked when its prerequisite is not completed', () => {
  const items = [
    { title: 'Ch. 1', completed: false },
    { title: 'Ch. 2', dependsOn: 'Ch. 1' },
  ];
  const it = items[1];
  assert.strictEqual(TPItemLogic.isLocked(items, it), true);
});

test('item unlocks the day AFTER its prerequisite is completed', () => {
  const items = [
    { title: 'Ch. 1', completed: true, completedAt: '2026-09-01' },
    { title: 'Ch. 2', dependsOn: 'Ch. 1' },
  ];
  const it = items[1];
  const today = () => '2026-09-02'; // day after completion
  assert.strictEqual(TPItemLogic.isLocked(items, it), false);
  assert.strictEqual(TPItemLogic.unlockedToday(items, it, today), false);
});

test('item does NOT surface as required on the SAME day its prerequisite is completed', () => {
  const items = [
    { title: 'Ch. 1', completed: true, completedAt: '2026-09-02' },
    { title: 'Ch. 2', dependsOn: 'Ch. 1' },
  ];
  const it = items[1];
  const today = () => '2026-09-02'; // same day as completion
  assert.strictEqual(TPItemLogic.isLocked(items, it), false);
  assert.strictEqual(TPItemLogic.unlockedToday(items, it, today), true);
});