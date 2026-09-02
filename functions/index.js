/**
 * Scheduled FCM digests for Taskplus.
 *
 * Deploy (Blaze plan required for scheduled functions):
 *   cd functions && npm i && firebase deploy --only functions
 *
 * Runs hourly; each user is notified at ~localNotifyHour (default 8) in their timezone.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

function ymdInTimeZone(timeZone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function hourInTimeZone(timeZone, date = new Date()) {
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      hour12: false,
    }).format(date);
    return Number(h);
  } catch {
    return date.getUTCHours();
  }
}

function addDaysYmd(ymd, n) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isLocked(items, it) {
  if (!it.dependsOn) return false;
  const prereq = items.find((x) => x.title === it.dependsOn);
  return prereq ? !prereq.completed : false;
}

exports.dailyDueDigest = onSchedule(
  {
    // Deliberately NOT the human-readable 'every 60 minutes' string: that's
    // App Engine's old "groc" syntax, which Cloud Scheduler interprets as
    // "one interval after this job was created/updated, then every N
    // minutes from there" — i.e. anchored to whenever this function
    // happened to get deployed, not to the top of the hour. In practice
    // that meant ticks landed at a fixed offset (e.g. :58) forever, so a
    // user's chosen notifyHour got honored ~an hour later than they picked,
    // every single day. '0 * * * *' is standard unix-cron: Cloud Scheduler
    // treats the minute field literally, so this always fires at :00.
    schedule: '0 * * * *',
    timeZone: 'Etc/UTC',
    memory: '256MiB',
  },
  async () => {
    // Toggle verbose per-user gate logging without redeploying: flip
    // admin/config { debugDigest: true|false } in Firestore. Off by
    // default so normal running doesn't spam logs with a routine skip
    // line for every user on every one-of-24 hourly runs that don't match
    // their notifyHour.
    const configSnap = await db.doc('admin/config').get();
    const debugEnabled = !!(configSnap.exists && configSnap.data().debugDigest);

    // users/{uid} is never written to directly by the client — only the
    // nested users/{uid}/taskplus/fcm and .../data docs are. In Firestore,
    // a path that only ever serves as a parent for subcollections and was
    // never explicitly set doesn't exist as a document, so a plain
    // db.collection('users').get() silently misses every real user and
    // only turns up accounts that happened to get a parent doc created
    // some other way (e.g. manual edits in the console). Querying the
    // 'taskplus' collection group instead finds every fcm/data doc
    // directly, regardless of whether the parent user doc exists.
    const taskplusSnap = await db.collectionGroup('taskplus').get();
    const fcmByUid = new Map();
    const dataByUid = new Map();
    taskplusSnap.forEach((docSnap) => {
      const parent = docSnap.ref.parent.parent;
      if (!parent) return;
      if (docSnap.id === 'fcm') fcmByUid.set(parent.id, docSnap);
      else if (docSnap.id === 'data') dataByUid.set(parent.id, docSnap);
    });

    let sent = 0;

    for (const [uid, fcmSnap] of fcmByUid) {
      const dataSnap = dataByUid.get(uid);
      if (!dataSnap) continue;

      const fcm = fcmSnap.data() || {};
      const tokensMap = fcm.tokens || {};
      const tokenEntries = Object.entries(tokensMap);
      if (tokenEntries.length === 0) continue;

      const data = dataSnap.data() || {};
      const items = data.items || [];
      // Use first token's timezone (or stored default)
      const tz =
        fcm.timeZone ||
        (tokenEntries[0][1] && tokenEntries[0][1].timeZone) ||
        'UTC';
      const notifyHour = fcm.notifyHour != null ? Number(fcm.notifyHour) : 8;
      const localHour = hourInTimeZone(tz);
      if (debugEnabled) console.log(`[debug] uid=${uid} tz=${tz} localHour=${localHour} notifyHour=${notifyHour} tokenCount=${tokenEntries.length} lastDigestDate=${fcm.lastDigestDate}`);
      // >= (not ===): a strict equality check means the ONE tick where
      // localHour === notifyHour is the only chance to send that day — if
      // it's ever missed (a cold start, a Firestore hiccup, a deploy in
      // progress, scheduler jitter), the next tick is already past it and
      // this user waits a full 24h for the next match. >= turns every later
      // tick that same local day into a catch-up chance instead, gated by
      // lastDigestDate below so it still only sends once per day.
      if (localHour < notifyHour) {
        if (debugEnabled) console.log(`[debug] uid=${uid} SKIP: not yet notifyHour`);
        continue;
      }

      const today = ymdInTimeZone(tz);
      // Avoid double-send same local day
      if (fcm.lastDigestDate === today) {
        if (debugEnabled) console.log(`[debug] uid=${uid} SKIP: already sent today (${today})`);
        continue;
      }

      const tomorrow = addDaysYmd(today, 1);
      const dueToday = items.filter(
        (it) =>
          !it.completed &&
          !it.archived &&
          !isLocked(items, it) &&
          it.due === today
      );
      const dueTmrw = items.filter(
        (it) =>
          !it.completed &&
          !it.archived &&
          !isLocked(items, it) &&
          it.due === tomorrow
      );
      if (debugEnabled) console.log(`[debug] uid=${uid} today=${today} tomorrow=${tomorrow} dueToday=${dueToday.length} dueTmrw=${dueTmrw.length}`);

      if (dueToday.length === 0 && dueTmrw.length === 0) {
        await fcmSnap.ref.set({ lastDigestDate: today }, { merge: true });
        continue;
      }

      const parts = [];
      if (dueToday.length) parts.push(`${dueToday.length} due today`);
      if (dueTmrw.length) parts.push(`${dueTmrw.length} due tomorrow`);
      const title = parts.join(' · ');
      const body = 'Open the app to plan.';

      const tokens = tokenEntries.map(([t]) => t);
      const res = await messaging.sendEachForMulticast({
        tokens,
        // Data-only on purpose (no top-level `notification`, no
        // `webpush.notification`): a payload with a `notification` field
        // gets auto-displayed by the browser/SDK in addition to whatever
        // sw.js's onBackgroundMessage does with it, producing two
        // notifications for one push. Data-only is never auto-displayed —
        // sw.js is the single source of truth for what gets shown.
        data: {
          title,
          body,
          icon: '/icons/icon-192.png',
          tag: 'taskplus-digest',
          url: '/',
          dueToday: String(dueToday.length),
          dueTomorrow: String(dueTmrw.length),
        },
      });

      // Drop invalid tokens
      const nextTokens = { ...tokensMap };
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            delete nextTokens[tokens[i]];
          }
        } else {
          sent++;
        }
      });
      await fcmSnap.ref.set(
        { tokens: nextTokens, lastDigestDate: today, lastDigestAt: Date.now() },
        { merge: true }
      );
    }

    console.log(`dailyDueDigest sent ${sent} messages`);
  }
);