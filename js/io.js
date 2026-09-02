/* io.js — JSON backup + ICS calendar export/import */
(function (global) {
  function exportData(items) {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskplus-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportIcs(items) {
    const icsEscape = global.TPHtml ? global.TPHtml.icsEscape : (s) => s || '';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taskplus//EN'];
    items
      .filter((it) => !it.archived)
      .forEach((it, idx) => {
        const dt = (it.due || '').replace(/-/g, '');
        if (!dt) return;
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:taskplus-${idx}-${Date.now()}@local`);
        lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        lines.push(`DTSTART;VALUE=DATE:${dt}`);
        lines.push(
          `SUMMARY:${icsEscape(it.title + (it.course ? ' [' + it.course + ']' : ''))}`
        );
        if (it.notes) lines.push(`DESCRIPTION:${icsEscape(it.notes)}`);
        lines.push('END:VEVENT');
      });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskplus.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * @param {File} file
   * @param {(items: any[]) => void} onSuccess called with parsed array
   * @param {(msg: string) => void} [onError]
   */
  function importData(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          onSuccess(data);
        } else {
          (onError || alert)('Invalid file format');
        }
      } catch (err) {
        (onError || alert)('Could not read file');
      }
    };
    reader.readAsText(file);
  }

  global.TPIo = { exportData, exportIcs, importData };
})(typeof window !== 'undefined' ? window : globalThis);
