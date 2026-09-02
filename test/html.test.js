const { test } = require('node:test');
const assert = require('node:assert');

global.window = global; // js/html.js attaches to `window`
require('../js/html.js');

test('escapeHtml escapes HTML special characters', () => {
  const result = TPHtml.escapeHtml('<img src=x onerror=alert(1)>');
  assert.strictEqual(result, '&lt;img src=x onerror=alert(1)&gt;');
});

test('escapeHtml leaves plain text unchanged', () => {
  assert.strictEqual(TPHtml.escapeHtml('Reading Ch. 3'), 'Reading Ch. 3');
});