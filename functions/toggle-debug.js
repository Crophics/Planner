#!/usr/bin/env node
/**
 * toggle-debug.js — flip dailyDueDigest's verbose per-user gate logging
 * on or off without redeploying functions.
 *
 * Usage:
 *   node toggle-debug.js on
 *   node toggle-debug.js off
 *   node toggle-debug.js status
 *
 * Requires local credentials for the planner-88ab8 project. If you
 * haven't set this up before, run once:
 *   gcloud auth application-default login
 * (or set GOOGLE_APPLICATION_CREDENTIALS to a service account key).
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const arg = (process.argv[2] || '').toLowerCase();
if (!['on', 'off', 'status'].includes(arg)) {
  console.error('Usage: node toggle-debug.js <on|off|status>');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'planner-88ab8',
});
const db = getFirestore();
const ref = db.doc('admin/config');

(async () => {
  if (arg === 'status') {
    const snap = await ref.get();
    const enabled = !!(snap.exists && snap.data().debugDigest);
    console.log(`debugDigest is currently ${enabled ? 'ON' : 'OFF'}`);
    return;
  }

  const debugDigest = arg === 'on';
  await ref.set({ debugDigest }, { merge: true });
  console.log(`debugDigest is now ${debugDigest ? 'ON' : 'OFF'}`);
  if (debugDigest) {
    console.log('Remember to turn it back off when you\'re done — leave it on and it logs a skip/result line for every user on every hourly run.');
  }
})().catch((err) => {
  console.error('Failed to update debugDigest:', err.message);
  process.exit(1);
});
