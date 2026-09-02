/* notify.js — Due-soon notifications + local digests.
   Quiet hours (a device-local do-not-disturb window) has been removed:
   the server-side hourly digest (functions/index.js) replaced it with a
   single "what hour do you want your digest" setting (fcm.notifyHour),
   picked in the UI and synced straight to Firestore — see
   firebase-sync.js#saveNotifyHour and app.js#setNotifyHour. */
(function (global) {
  const NOTIFY_LOG_KEY = 'tp-notify-log';

  function getNotifyLog() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFY_LOG_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveNotifyLog(log) {
    localStorage.setItem(NOTIFY_LOG_KEY, JSON.stringify(log));
  }

  function notify(title, body) {
    try {
      new Notification(title, { body, icon: 'icons/icon-192.png' });
    } catch (e) {}
  }

  /**
   * @param {object} ctx
   * @param {Array} ctx.items
   * @param {(it:any)=>boolean} ctx.isLocked
   * @param {()=>string} ctx.today
   * @param {(d:string,n:number)=>string} ctx.addDays
   * @param {boolean} [ctx.notifyDigest=true] always prefer digest when 2+ items
   * @param {string|null} [ctx.remoteDigestDate] fcm.lastDigestDate from Firestore,
   *   if known — when it matches today, the FCM push already covered today's
   *   items, so this run is skipped entirely to avoid a duplicate notification.
   * @param {(dateStr:string)=>void} [ctx.onNotified] called with today's date
   *   after a notification actually fires, so the caller can stamp
   *   fcm.lastDigestDate and make the FCM push skip this user today too.
   */
  function checkAndNotify(ctx) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const {
      items,
      isLocked,
      today,
      addDays,
      notifyDigest = true,
      remoteDigestDate = null,
      onNotified,
    } = ctx;

    const t = today();
    if (remoteDigestDate === t) return;

    const log = getNotifyLog();
    const logSet = new Set(log);
    const tmrw = addDays(t, 1);
    const dueSoon = items.filter(
      (it) => !it.completed && !it.archived && !isLocked(it) && (it.due === t || it.due === tmrw)
    );

    let firedToday = false;
    ['today', 'tomorrow'].forEach((when) => {
      const dueDate = when === 'today' ? t : tmrw;
      const bucketItems = dueSoon.filter((it) => it.due === dueDate);
      // One log key per day-bucket so we send a single digest per day, not per item
      const digestKey = t + '|digest|' + when;
      const newItems = bucketItems.filter((it) => !logSet.has(t + '|' + (it.id || it.title)));
      if (newItems.length === 0) return;
      if (logSet.has(digestKey) && notifyDigest) return;

      // Title matches the FCM push digest style; body differs since the app is already open here.
      const title = `${newItems.length} due ${when}`;
      const body = "Let's make a plan.";
      notify(title, body);
      firedToday = true;
      if (newItems.length > 1) {
        log.push(digestKey);
        logSet.add(digestKey);
      }

      newItems.forEach((it) => {
        const key = t + '|' + (it.id || it.title);
        log.push(key);
        logSet.add(key);
      });
    });

    const cutoff = addDays(t, -3);
    saveNotifyLog(log.filter((k) => k.split('|')[0] >= cutoff));

    if (firedToday && typeof onNotified === 'function') onNotified(t);
  }

  global.TPNotify = {
    checkAndNotify,
    getNotifyLog,
    saveNotifyLog,
  };
})(typeof window !== 'undefined' ? window : globalThis);