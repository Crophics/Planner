/* html.js — Small string/HTML helpers */
(function (global) {
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function linkifyNotes(s) {
    const escaped = escapeHtml(s);
    return escaped.replace(/((?:https?:\/\/|www\.)[^\s<]+)/gi, (match) => {
      let trailing = '';
      const trailingMatch = match.match(/[.,;:!?)\]]+$/);
      if (trailingMatch) {
        trailing = trailingMatch[0];
        match = match.slice(0, -trailing.length);
      }
      const href = /^https?:\/\//i.test(match) ? match : 'https://' + match;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>${trailing}`;
    });
  }

  function icsEscape(s) {
    return (s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  global.TPHtml = { escapeHtml, linkifyNotes, icsEscape };
})(typeof window !== 'undefined' ? window : globalThis);
