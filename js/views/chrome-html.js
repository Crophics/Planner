/* views/chrome-html.js — Topbar, banners, controls, modal, FAB */
(function (global) {
  function topbarHtml({ searchTerm, sortMode }) {
    return `<div class="tp-topbar">
      <div class="tp-search-wrap">
        <input id="tp-filter" placeholder="Search title, course, notes..." value="${searchTerm}">
        ${searchTerm ? `<button id="tp-search-clear" type="button" class="tp-search-clear" aria-label="Clear search">&times;</button>` : ''}
      </div>
      <select id="tp-sort">
        <option value="urgency" ${sortMode === 'urgency' ? 'selected' : ''}>Urgency</option>
        <option value="due" ${sortMode === 'due' ? 'selected' : ''}>Due date</option>
        <option value="custom" ${sortMode === 'custom' ? 'selected' : ''}>Custom (drag order)</option>
      </select>
    </div>`;
  }

  function overdueBannerHtml({ overdueCount, overdueFilterActive }) {
    if (overdueCount <= 0) return '';
    return `<div class="tp-overdue-banner ${overdueFilterActive ? 'tp-active' : ''}" id="tp-overdue-banner">
        \u26a0 ${overdueCount} overdue ${overdueFilterActive ? '\u00b7 tap to clear' : '\u00b7 tap to view'}
      </div>`;
  }

  function streakBannerHtml({ streakNotice }) {
    if (!streakNotice) return '';
    return `<div class="tp-streak-banner" id="tp-streak-banner">
        <div class="tp-streak-banner-text">${streakNotice.message}</div>
        <button type="button" class="tp-streak-dismiss" id="tp-streak-dismiss" aria-label="Dismiss daily streak notice">×</button>
      </div>`;
  }

  function emptyStateHtml({ itemsLength, searchTerm, hideDone, overdueFilterActive }) {
    const filtersActive = !!(searchTerm || hideDone || overdueFilterActive);
    return `<div class="tp-empty">${itemsLength === 0
      ? "No assignments yet. Click \u201c+ Add Assignment\u201d to get started."
      : "Nothing matches your current filters."}
        ${(itemsLength > 0 && filtersActive) ? `<div style="margin-top:10px;"><button id="tp-clear-filters" type="button" class="tp-secondary">Clear search &amp; filters</button></div>` : ''}
      </div>`;
  }

  function notifyHourOptionsHtml(selected) {
    const h = Number.isInteger(selected) ? selected : 8;
    let opts = '';
    for (let i = 0; i < 24; i++) {
      const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
      opts += `<option value="${i}" ${i === h ? 'selected' : ''}>${label}</option>`;
    }
    return opts;
  }

  function ioControlsHtml({ hideDone, showArchived, theme, notifyHour, notifyDigest }) {
    let html = `<div class="tp-io">
      <details class="tp-export-dropdown">
        <summary>Export \u25be</summary>
        <div class="tp-dropdown-panel">
          <button id="tp-export" class="tp-secondary">Backup (JSON)</button>
          <button id="tp-export-ics" class="tp-secondary">Calendar (.ics)</button>
        </div>
      </details>
      <label style="display:inline-block;">
        <button id="tp-import-btn" class="tp-secondary">Import Backup</button>
        <input type="file" id="tp-import" accept="application/json" style="display:none;">
      </label>
      <button id="tp-clear-completed" class="tp-danger">Clear Completed</button>
    </div>`;

    html += `<div class="tp-controls">
      <label><input type="checkbox" id="tp-show-completed" style="width:auto;" ${!hideDone ? 'checked' : ''}> Show completed</label>
      <label><input type="checkbox" id="tp-show-archived" style="width:auto;" ${showArchived ? 'checked' : ''}> Show archived</label>
    </div>`;

    html += `<div class="tp-bottom-row">
      <label>Theme: <select id="tp-theme-select">
        <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
        <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
        <option value="blue" ${theme === 'blue' ? 'selected' : ''}>Blue (classic)</option>
        <option value="auto" ${theme === 'auto' ? 'selected' : ''}>Auto (system)</option>
      </select></label>
      <button id="tp-manage-courses" type="button" class="tp-secondary">Manage Courses</button>
      <button id="tp-sync-btn" type="button" class="tp-secondary">${window.tpSyncLabel || 'Sign in to sync'}</button>
      ${('Notification' in window) ? (
        Notification.permission === 'granted'
          ? `<span style="font-size:12px;">Reminders: On${(window.tpSync && window.tpSync.hasVapidKey && window.tpSync.hasVapidKey()) ? ' (incl. background)' : ''}</span>`
          : Notification.permission === 'denied'
            ? `<span style="font-size:12px;">Reminders blocked in browser settings</span>`
            : `<button id="tp-enable-notify" class="tp-secondary">Enable Reminders</button>`
      ) : ''}
    </div>`;

    html += `<div class="tp-bottom-row tp-notify-prefs">
      <label title="Hourly digest of what's due, sent even when the app is closed">Daily digest at
        <select id="tp-notify-hour" style="width:auto;margin:0 4px;">${notifyHourOptionsHtml(notifyHour)}</select>
      </label>
      <label style="display:inline-flex;align-items:center;gap:6px;">
        <input type="checkbox" id="tp-notify-digest" style="width:auto;margin:0;" ${notifyDigest !== false ? 'checked' : ''}>
        Digest reminders
      </label>
    </div>`;

    return html;
  }

  function devToolbarHtml({ devMode, devPanelOpen }) {
    if (!devMode) return '';
    return `<button id="tp-dev-toolbar-btn" type="button">🛠️ Dev Menu</button>
      <div id="tp-dev-toolbar-panel" style="display:${devPanelOpen ? 'block' : 'none'};">
        <h4>Dev Testing Controls</h4>
        <button type="button" id="tp-dev-trigger-notify">🔔 Trigger Test Notification</button>
        <button type="button" id="tp-dev-advance-1">⏩ Advance Time +1 Day</button>
        <button type="button" id="tp-dev-advance-7">⏩ Advance Time +7 Days</button>
        <button type="button" id="tp-dev-reset">⚠️ Hard Reset Everything</button>
        <div id="tp-dev-reset-confirm" style="display:none;font-size:12px;margin-top:4px;">
          <span>This clears all data. </span>
          <button type="button" id="tp-dev-reset-confirm-yes">Confirm reset</button>
          <button type="button" id="tp-dev-reset-confirm-no">Cancel</button>
        </div>
        <button type="button" id="tp-dev-exit">🚪 Exit Dev Mode</button>
      </div>`;
  }

  function courseManagerHtml({ showCourseManager, items, courseColor }) {
    if (!showCourseManager) return '';
    const courseNames = [...new Set(items.map((i) => (i.course || '').trim()).filter(Boolean))];
    let html = `<div class="tp-course-manager" id="tp-course-manager">`;
    if (courseNames.length === 0) {
      html += `<div style="font-size:12.5px;color:var(--tp-muted);">No courses yet.</div>`;
    } else {
      courseNames.forEach((c) => {
        html += `<div class="tp-course-row">
        <input type="text" class="tp-course-rename" data-course="${c}" value="${c}">
        <input type="color" class="tp-course-color" data-course="${c}" value="${courseColor(c)}">
      </div>`;
      });
    }
    html += `</div>`;
    return html;
  }

  function modalHtml({ editIndex, showForm, formInnerHtml }) {
    if (editIndex === null && !showForm) return '';
    return `<div id="tp-modal-backdrop">
    <div id="tp-modal-box" role="dialog" aria-modal="true" aria-label="${editIndex !== null ? 'Edit Assignment' : 'Add Assignment'}">
      <button id="tp-modal-close" aria-label="Close">&times;</button>
      ${formInnerHtml}
    </div>
  </div>`;
  }

  function fabHtml() {
    return `<button id="tp-add-toggle" class="tp-fab" aria-label="Add Assignment">+</button>`;
  }

  global.TPViews = global.TPViews || {};
  Object.assign(global.TPViews, {
    topbarHtml,
    overdueBannerHtml,
    streakBannerHtml,
    emptyStateHtml,
    ioControlsHtml,
    devToolbarHtml,
    courseManagerHtml,
    modalHtml,
    fabHtml,
  });
})(typeof window !== 'undefined' ? window : globalThis);