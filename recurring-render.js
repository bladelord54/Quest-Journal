// @ts-check
'use strict';
/**
 * recurring-render.js — pure Recurring-tasks presentation builder (Engineering Roadmap #1).
 *
 * The EIGHTEENTH render module. Holds the populated Recurring-tasks panel (Daily view → Recurring tab) body:
 *   - renderRecurringTasksHTML({ recurringTasks, escapeHTML })
 *       one row per configured recurring task — a toggle button (a green filled circle when active, a blank
 *       circle when paused; the whole row is cyan-tinted when active, dimmed gray when paused), the escaped
 *       title, a human-readable schedule line derived from rt.recurrence, and a delete button. The schedule
 *       line covers all four recurrence shapes: weekly ("Every Mon, Wed"), biweekly ("Every other Fri"),
 *       monthly-date ("Monthly on day 12"), and monthly-weekday ("2nd Tue of month", or "Last Fri of month"
 *       when week === -1). An unrecognized recurrence type leaves the schedule line blank.
 *
 * PURE given its inputs: recurringTasks is the manager's list and escapeHTML is injected (the wrapper passes
 * (s) => this.escapeHTML(s)). The wrapper (renderRecurringTasks) keeps its #recurring-tasks-container lookup +
 * guard and the zero-tasks empty-state branch (this._renderEmptyState) inline, and only delegates the
 * populated list body to this builder.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.RECURRING_RENDER.
 *   - Jest/Node: require('./recurring-render.js') returns the frozen builder via module.exports.
 */
(function () {
    /**
     * @param {{
     *   recurringTasks: Array<{ id: number, active?: boolean, title: string, recurrence: { type: 'weekly', days: string[] } | { type: 'biweekly', day: string } | { type: 'monthly-date', dayOfMonth: number } | { type: 'monthly-weekday', week: number, day: string } }>,
     *   escapeHTML: (s: string) => string,
     * }} deps
     * @returns {string}
     */
    function renderRecurringTasksHTML({ recurringTasks, escapeHTML }) {
        /** @type {Record<string, string>} */
        const dayLabels = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
        
        return recurringTasks.map(rt => {
            let scheduleText = '';
            switch (rt.recurrence.type) {
                case 'weekly':
                    scheduleText = 'Every ' + rt.recurrence.days.map(d => dayLabels[d] || d).join(', ');
                    break;
                case 'biweekly':
                    scheduleText = 'Every other ' + (dayLabels[rt.recurrence.day] || rt.recurrence.day);
                    break;
                case 'monthly-date':
                    scheduleText = 'Monthly on day ' + rt.recurrence.dayOfMonth;
                    break;
                case 'monthly-weekday':
                    const weekLabel = rt.recurrence.week === -1 ? 'Last' : ['', '1st', '2nd', '3rd', '4th'][rt.recurrence.week];
                    scheduleText = weekLabel + ' ' + (dayLabels[rt.recurrence.day] || rt.recurrence.day) + ' of month';
                    break;
            }
            
            return `
                <div class="flex items-center gap-2 p-2 rounded-lg ${rt.active ? 'bg-cyan-900/40' : 'bg-gray-800/40 opacity-60'} border border-cyan-700/50">
                    <button data-action="recurring.toggle" data-rt-id="${rt.id}" 
                        class="text-lg ${rt.active ? 'text-green-400' : 'text-gray-500'}">
                        ${rt.active ? '<i class="ri-checkbox-circle-fill"></i>' : '<i class="ri-checkbox-blank-circle-line"></i>'}
                    </button>
                    <div class="flex-1 min-w-0">
                        <div class="text-white text-sm font-bold truncate">${escapeHTML(rt.title)}</div>
                        <div class="text-cyan-300/70 text-xs">${scheduleText}</div>
                    </div>
                    <button data-action="recurring.delete" data-rt-id="${rt.id}" 
                        class="text-red-400 hover:text-red-300 p-1" aria-label="Delete recurring task">
                        <i class="ri-delete-bin-line" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    const RECURRING_RENDER = Object.freeze({ renderRecurringTasksHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic RECURRING_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.RECURRING_RENDER = RECURRING_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = RECURRING_RENDER;
})();
