# Taskplus — Firebase Cloud Messaging setup

Background (app closed) reminders need three pieces.

**Note:** the FCM background handler lives inside `sw.js` (the same service
worker that provides offline caching), not a separate file. Don't register a
second service worker at the same scope for messaging — a browser origin can
only have one active service worker per scope, so a second registration
fights the first instead of running alongside it, and background push can
silently stop working.

## 1. VAPID key (required on the client)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **planner-88ab8**
2. **Project settings → Cloud Messaging → Web Push certificates**
3. Generate a key pair if you don’t have one
4. Copy the **Key pair** value into `js/fcm-config.js`:

```js
export const FCM_VAPID_KEY = 'YOUR_KEY_PAIR_HERE';
```

5. Redeploy the static site

## 2. Enable reminders in the app

1. Sign in (tokens are stored under your user in Firestore)
2. Tap **Enable Reminders** and allow notifications

Tokens are saved at `users/{uid}/taskplus/fcm`.

## 3. Scheduled digests (Cloud Functions — Blaze plan)

Local notifications only work while the page can run. For morning digests with the app closed:

```bash
npm i -g firebase-tools
firebase login
firebase use planner-88ab8
cd functions && npm i && cd ..
firebase deploy --only functions
```

Function `dailyDueDigest` runs every hour on the hour (Cloud Scheduler `0 * * * *`, UTC) and, for each user, sends once when the current hour in their stored timezone matches their chosen digest hour (`fcm.notifyHour`, default **08:00**, picked in-app under "Daily digest at"). Because the check is an exact hour match done once per day, a hour-change that doesn't reach Firestore before that hour's tick misses the whole day, not just an hour — see `saveNotifyHour` in `firebase-sync.js` for how the app avoids that (writes the new hour immediately, no debouncing).

## Firestore

Ensure signed-in users can read/write their own `users/{uid}/taskplus/**` documents (including `fcm`).