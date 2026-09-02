# Taskplus

Task and assignment planner PWA for tracking coursework. Handles due dates, multi-part assignments with daily pacing targets, task dependencies, and syncs across devices with push notification digests.

## Features

- Assignments organized by course, with a color per course
- Multi-part assignments (pages, chapters, problems, etc.) get a daily target so you stay on pace
- Task dependencies within a course, an assignment can stay locked until its prerequisite is done
- Recurring assignments (weekly/monthly), next occurrence created automatically on completion
- Today's Targets panel for what's tight, overdue, or optional
- 7-day workload chart broken down by course
- Dark, light, blue, and auto themes
- Completed items auto-archive after 14 days
- Installable PWA with offline support
- Cross-device sync via Firestore, with tombstone-based deletion so devices don't resurrect deleted items
- Daily push notification digest, sent at whatever hour you pick, in your local timezone

## Tech stack

- Vanilla JS, HTML, CSS
- Firebase (Firestore, Cloud Functions v2, Cloud Messaging)
- Cloudflare Workers for hosting
- GitHub Actions for CI/CD

## Project structure

```
taskplus/
├── js/
│   ├── app.js                          main app state, storage, sync
│   ├── today-logic.js                  Today's Targets computation
│   ├── form.js                          add/edit assignment form
│   ├── week-chart.js                    7-day workload chart
│   ├── theme.js                          theme switching
│   ├── notify.js                         local/foreground notifications
│   ├── fcm-config.js                     FCM client config
│   └── views/                            HTML rendering
├── css/
├── icons/
├── functions/
│   └── index.js                          dailyDueDigest scheduled function
├── firebase-sync.js
├── sw.js                                 service worker (offline + FCM background)
├── index.html
├── manifest.json
├── wrangler.toml
├── firebase.json
└── .github/workflows/
```

[app.js](./js/app.js) · [today-logic.js](./js/today-logic.js) · [form.js](./js/form.js) · [week-chart.js](./js/week-chart.js) · [theme.js](./js/theme.js) · [notify.js](./js/notify.js) · [fcm-config.js](./js/fcm-config.js) · [firebase-sync.js](./firebase-sync.js) · [sw.js](./sw.js) · [functions/index.js](./functions/index.js)

## Setup

### Local dev

```bash
cd functions
npm install
npm run serve
```

### Deploy

```bash
npm run deploy                       # site -> Cloudflare
firebase deploy --only functions     # backend -> Firebase
```

Pushing to `main` also triggers a GitHub Actions workflow that does both automatically. Needs these repo secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `FIREBASE_TOKEN`

## Push notifications

Background reminders (app closed) need three pieces set up.

Note: the FCM background handler lives inside [sw.js](./sw.js), the same service worker that handles offline caching, not a separate file. Don't register a second service worker at the same scope for messaging, a browser origin can only have one active service worker per scope, so a second registration fights the first instead of running alongside it and background push can silently stop working.

### 1. VAPID key

1. Open the [Firebase Console](https://console.firebase.google.com/), project `planner-88ab8`
2. Project settings -> Cloud Messaging -> Web Push certificates
3. Generate a key pair if you don't have one
4. Copy the key pair value into [js/fcm-config.js](./js/fcm-config.js)
5. Redeploy the static site

### 2. Enable reminders in the app

1. Sign in (tokens are stored under your user in Firestore)
2. Tap Enable Reminders and allow notifications

Tokens are saved at `users/{uid}/taskplus/fcm`.

### 3. Scheduled digests (Blaze plan required)

Local notifications only work while the page can run. For digests to arrive with the app closed, deploy the scheduled function:

```bash
npm i -g firebase-tools
firebase login
firebase use planner-88ab8
cd functions && npm i && cd ..
firebase deploy --only functions
```

Enable the Cloud Messaging API in Google Cloud if prompted.

Make sure signed-in users can read/write their own `users/{uid}/taskplus/**` documents (including `fcm`) in Firestore rules.

## How the digest works

[`dailyDueDigest`](./functions/index.js) runs hourly (Cloud Scheduler `0 * * * *`, UTC). For each user it checks the current hour in their stored timezone against their chosen notify hour (`fcm.notifyHour`, default 8am, picked in-app under "Daily digest at"). Once local time reaches that hour and today's digest hasn't gone out yet, it sends a push with what's due today and tomorrow.

The hour check only gets one shot per day, so a notify-hour change that doesn't reach Firestore before that hour's tick gets missed for the whole day, not just delayed an hour. `saveNotifyHour` in [firebase-sync.js](./firebase-sync.js) avoids this by writing the new hour immediately, with no debounce.

## How the Today's Targets algorithm works

[`today-logic.js`](./js/today-logic.js) decides what shows up in the Today panel and splits work into two tiers: required and optional.

**Daily pacing for multi-part items.** Any assignment with a total greater than 1 (pages, chapters, problems) gets a daily target computed once per day: `remaining / daysLeft`, rounded up. This target is cached on the item (`dailyTarget`) so progress made earlier in the day doesn't shift the goalpost, it only recalculates when the date, total, or due date changes.

**Slack.** An item has no slack once `remaining >= daysLeft`, meaning there's no room left to spread the work out further, every remaining day has to be a work day. No-slack items due today or earlier are required and tight. No-slack items due later are required but not urgent yet (paced work).

**Single-part items** (total of 1 or less) go straight to required if they're due today or tomorrow.

**Optional items** are grouped into buckets by due date. If a bucket is made entirely of single-part items and there are more of them than days left before their due date, the algorithm computes a pick count: how many you'd need to knock out today to stay on pace as a group, using the same ceiling-division logic as the per-item daily target. If that pick count ends up covering every item in the bucket, the whole bucket gets promoted into required instead of staying an optional pick-list, since there's no longer any real choice involved.

**"All set for today"** is shown only when there's no required work, no optional bucket that needs a pick, and there was actually something on the planner to begin with, so an empty planner doesn't get mistaken for a completed one.
