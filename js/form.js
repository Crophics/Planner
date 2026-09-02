/* form.js — Add/edit assignment form HTML */
(function (global) {
  function dependsOptionsHtml(items, course, selected, excludeItem) {
    const escapeHtml = window.TPHtml.escapeHtml;
    const matches = items.filter(
      (it) =>
        it !== excludeItem &&
        (it.course || '').trim().toLowerCase() === (course || '').trim().toLowerCase() &&
        course
    );
    return (
      `<option value="">No prerequisite</option>` +
      matches
        .map(
          (it) =>
            `<option value="${escapeHtml(it.title)}" ${selected === it.title ? 'selected' : ''}>${escapeHtml(it.title)}</option>`
        )
        .join('')
    );
  }

  function formHtml(items, existing) {
    const escapeHtml = window.TPHtml.escapeHtml;
    const e = existing || {
      title: '',
      due: '',
      total: '',
      course: '',
      unit: '',
      dependsOn: '',
      notes: '',
      recurring: '',
      subtasks: [],
    };
    return `<h3>${existing ? 'Edit Assignment' : 'Add Assignment'}</h3>
      <input id="tp-title" placeholder="Title" value="${escapeHtml(e.title)}">
      <input id="tp-course" placeholder="Course (e.g. NT)" value="${escapeHtml(e.course || '')}">
      <div class="tp-date-wrap">
        <input id="tp-due" type="date" value="${e.due}" required aria-label="Due date">
        <span class="tp-date-placeholder">Due Date</span>
      </div>
      <input id="tp-units" type="number" placeholder="Total amount" value="${e.total}">
      <input id="tp-unitlabel" placeholder="Unit (pages, chapters, problems...)" value="${escapeHtml(e.unit || '')}">
      <textarea id="tp-notes" placeholder="Notes (optional)">${escapeHtml(e.notes || '')}</textarea>
      <textarea id="tp-subtasks" placeholder="Subtasks, one per line (optional)">${escapeHtml((e.subtasks || []).map((s) => s.text).join('\n'))}</textarea>
      <label>Repeat:</label>
      <select id="tp-recurring">
        <option value="" ${!e.recurring ? 'selected' : ''}>Does not repeat</option>
        <option value="weekly" ${e.recurring === 'weekly' ? 'selected' : ''}>Weekly</option>
        <option value="monthly" ${e.recurring === 'monthly' ? 'selected' : ''}>Monthly</option>
      </select>
      <label>Do this after (same course only):</label>
      <select id="tp-depends">
        ${dependsOptionsHtml(items, e.course, e.dependsOn, existing)}
      </select>
      <button id="tp-save">${existing ? 'Save Changes' : 'Add'}</button>`;
  }

  global.TPForm = { dependsOptionsHtml, formHtml };
})(typeof window !== 'undefined' ? window : globalThis);