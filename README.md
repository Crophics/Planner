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
│   ├── app.js              main app state, storage, sync
│   ├── today-logic.js      Today's Targets computation
│   ├── form.js              add/edit assignment form
│   ├── week-chart.js        7-day workload chart
│   ├── theme.js              theme switching
│   ├── notify.js             local/foreground notifications
│   ├── fcm-config.js         FCM client config
│   └── views/                HTML rendering
├── css/
├── icons/
├── functions/
│   └── index.js               dailyDueDigest scheduled function
├── firebase-sync.js
├── sw.js                       service worker (offline + FCM background)
├── index.html
├── manifest.json
├── wrangler.toml
├── firebase.json
└── .github/workflows/
```

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

### Push notifications

See `FCM-SETUP.md` for the VAPID key setup and enabling the scheduled digest function.

## How the digest works

`dailyDueDigest` runs hourly. For each user it checks the current time in their stored timezone against their chosen notify hour (default 8am). Once local time reaches that hour and today's digest hasn't gone out yet, it sends a push with what's due today and tomorrow.
