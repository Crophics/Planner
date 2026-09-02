/* views/today-html.js — Today's Targets panel HTML */
(function (global) {
  /**
   * Builds the Today's Targets panel.
   * @param {object} ctx
   * @returns {{ html: string, requiredItemSet: Set }}
   */
  function todayPanelHtml(ctx) {
    const {
      itemIndexMap, todayExpanded, requiredTight, requiredPace, optionalBuckets,
      pickBuckets, hasRequired, allDoneToday, onAllDone,
      relativeDueLabel, fmt, unitLabel, capUnit,
    } = ctx;
    const escapeHtml = window.TPHtml.escapeHtml;
function requiredRowHtml(t, subheadClass){
  const dotClass = t.overdue ? 'tp-today-dot-tight' : (t.dueToday ? 'tp-today-dot-due-today' : '');
  const idx = itemIndexMap.get(t.it);
  const idxAttr = idx!==undefined ? ` data-item-i="${idx}"` : '';
  const dueHint = `<span class="tp-today-due-hint">Due ${relativeDueLabel(t.it.due)}</span>`;
  // Single-part assignments are binary (do it or don't) - an amount
  // badge like "1 reading" adds nothing, so only multi-part items get one.
  const amtBadge = `<span class="tp-today-amt">${t.it.total>1 ? fmt(t.amt)+' '+unitLabel(t.amt,t.unit) : capUnit(t.unit)}</span>`;
  return `<div class="tp-today-row tp-today-clickable"${idxAttr}>
    <span class="tp-today-title"><span class="tp-today-dot ${dotClass}"></span><span class="tp-today-title-col"><span class="tp-today-title-main">${escapeHtml(t.title)}</span>${dueHint}</span></span>
    ${amtBadge}
  </div>`;
}

function optionalBucketHtml(bucket){
  const headerText = bucket.pickCount
    ? `Due ${relativeDueLabel(bucket.due)} - do ${bucket.pickCount} of these`
    : `Due ${relativeDueLabel(bucket.due)}`;
  // Pick buckets have no slack left, so they're required (green), not
  // optional (dashed grey) - same meaning as the compact view.
  const dotClass = bucket.pickCount ? '' : 'tp-today-dot-optional';
  const rowClass = bucket.pickCount ? 'tp-today-clickable' : 'tp-today-clickable tp-today-optional';
  const rows = bucket.entries.map(e=>{
    const idx = itemIndexMap.get(e.it);
    const idxAttr = idx!==undefined ? ` data-item-i="${idx}"` : '';
    const amtBadge = `<span class="tp-today-amt">${e.kind==='multi' ? fmt(e.amt)+' '+unitLabel(e.amt,e.unit) : capUnit(e.unit)}</span>`;
    return `<div class="tp-today-row ${rowClass}"${idxAttr}>
      <span class="tp-today-title"><span class="tp-today-dot ${dotClass}"></span><span class="tp-today-title-main">${escapeHtml(e.title)}</span></span>
      ${amtBadge}
    </div>`;
  }).join('');
  return `<div class="tp-today-group-header">${headerText}</div>` + rows;
}

// A pick-count bucket ("do 1 of these 2") still represents real work needed
// today to keep pace, even though which item satisfies it is a free choice —
// so the condensed view surfaces it as one summary line, without spelling out
// every option (that detail lives in the expanded view).
function compactPickBucketHtml(bucket){
  const headerText = `Due ${relativeDueLabel(bucket.due)} - do ${bucket.pickCount} of these`;
  const rows = bucket.entries.map(e=>{
    const idx = itemIndexMap.get(e.it);
    const idxAttr = idx!==undefined ? ` data-item-i="${idx}"` : '';
    return `<div class="tp-today-row tp-today-clickable"${idxAttr}>
      <span class="tp-today-title"><span class="tp-today-dot"></span><span class="tp-today-title-main">${escapeHtml(e.title)}</span></span>
      <span class="tp-today-amt">${capUnit(e.unit)}</span>
    </div>`;
  }).join('');
  return `<div class="tp-today-group-header">${headerText}</div>` + rows;
}
function compactOptionalBucketHtml(bucket){
  const headerText = `Later - due ${relativeDueLabel(bucket.due)}`;
  const rows = bucket.entries.slice(0, 2).map(e=>{
    const idx = itemIndexMap.get(e.it);
    const idxAttr = idx!==undefined ? ` data-item-i="${idx}"` : '';
    return `<div class="tp-today-row tp-today-clickable tp-today-optional"${idxAttr}>
      <span class="tp-today-title"><span class="tp-today-dot tp-today-dot-optional"></span><span class="tp-today-title-main">${escapeHtml(e.title)}</span></span>
      <span class="tp-today-amt">${capUnit(e.unit)}</span>
    </div>`;
  }).join('');
  const more = bucket.entries.length > 2 ? `<div class="tp-today-row tp-today-optional"><span class="tp-today-title"><span class="tp-today-dot tp-today-dot-optional"></span><span class="tp-today-title-main">+${bucket.entries.length - 2} more</span></span></div>` : '';
  return `<div class="tp-today-group-header">${headerText}</div>` + rows + more;
}

const laterBuckets = optionalBuckets.filter(b=>!b.pickCount);
const requiredItemSet = new Set([
  ...requiredTight.map(t => t.it),
  ...requiredPace.map(t => t.it),
  ...pickBuckets.flatMap(bucket => bucket.entries.map(e => e.it))
]);
if(allDoneToday && onAllDone) onAllDone();
const requiredRowsHtml = requiredTight.map(t=>requiredRowHtml(t,false)).join('') + requiredPace.map(t=>requiredRowHtml(t,true)).join('');

const compactHasAnything = hasRequired || pickBuckets.length;
const compactBody = compactHasAnything
  ? requiredRowsHtml + pickBuckets.map(b=>compactPickBucketHtml(b)).join('')
  : '<div class="tp-today-row"><span>You\'re all set for today.</span></div>';

const expandedBody = (hasRequired
    ? requiredRowsHtml
    : (optionalBuckets.length
        ? '<div class="tp-today-row"><span>You\'re all set for today - but here\'s what you can do to get ahead:</span></div>'
        : '<div class="tp-today-row"><span>Nothing due today - you\'re caught up.</span></div>')) +
  optionalBuckets.map(b=>optionalBucketHtml(b)).join('');

const panelHtml = `<div class="tp-today" id="tp-today-card">
  <div class="tp-today-header-row">
    <b>Today's Targets</b>
    <button type="button" id="tp-today-toggle" class="tp-today-toggle-btn" aria-expanded="${todayExpanded}" aria-label="${todayExpanded? 'Show less' : 'Show all'}"><span class="tp-today-arrow${todayExpanded?' tp-today-arrow-open':''}">\u203a</span></button>
  </div>
  <div class="tp-today-body-anim">` +
  (todayExpanded? expandedBody : compactBody) +
  `</div></div>`;
    return { html: panelHtml, requiredItemSet };
  }

  global.TPViews = global.TPViews || {};
  global.TPViews.todayPanelHtml = todayPanelHtml;
})(typeof window !== 'undefined' ? window : globalThis);