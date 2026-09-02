/* week-chart.js — Upcoming 7-day workload chart HTML */
(function (global) {
  /**
   * @param {object} opts
   * @param {Array} opts.items
   * @param {string} opts.summaryText
   * @param {boolean} opts.animate
   * @param {() => string} opts.today
   * @param {(d: string, n: number) => string} opts.addDays
   * @param {(course: string) => string} opts.courseColor
   */
  function weekChartHtml(opts) {
    const { items, summaryText, animate, today, addDays, courseColor } = opts;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(today(), i);
      const dayItems = items.filter((it) => !it.completed && !it.archived && it.due === d);
      const byCourse = {};
      dayItems.forEach((it) => {
        const key = (it.course || '').trim() || 'Other';
        byCourse[key] = (byCourse[key] || 0) + 1;
      });
      days.push({ d, total: dayItems.length, byCourse });
    }
    const max = Math.max(1, ...days.map((x) => x.total));
    const barsHtml = days
      .map((x) => {
        const label = new Date(x.d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
        const totalH = Math.round((x.total / max) * 36) + 4;
        const courseEntries = Object.entries(x.byCourse);
        let barHtml;
        if (courseEntries.length === 0) {
          barHtml = `<div class="tp-week-bar" style="height:${totalH}px;"></div>`;
        } else {
          barHtml =
            `<div class="tp-week-bar-stack" style="height:${totalH}px;">` +
            courseEntries
              .map(([course, count]) => {
                const segH = Math.max(4, Math.round((count / x.total) * totalH));
                return `<div class="tp-week-seg" style="background:${courseColor(course)};height:${segH}px;" title="${course}: ${count}"></div>`;
              })
              .join('') +
            `</div>`;
        }
        return `<div class="tp-week-col">${barHtml}<div class="tp-week-label">${label}</div></div>`;
      })
      .join('');
    return `<div class="tp-week-block${animate ? ' tp-week-animate' : ''}">
      <div class="tp-summary">${summaryText}</div>
      <div class="tp-week">${barsHtml}</div>
    </div>`;
  }

  global.TPWeekChart = { weekChartHtml };
})(typeof window !== 'undefined' ? window : globalThis);
