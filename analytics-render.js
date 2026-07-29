// @ts-check
'use strict';
/**
 * analytics-render.js — pure Analytics presentation builders (Engineering Roadmap #1).
 *
 * The SIXTH render module (after boss-render.js, task-render.js, companion-render.js,
 * spell-render.js, class-render.js), opening the Analytics dashboard — a suite of seven
 * `render*` methods on the God class (`renderQuickStats`, `renderActivityHeatmap`,
 * `renderXPTimeline`, `renderTaskBreakdown`, `renderProductivityPattern`, `renderPersonalRecords`,
 * `renderGoalsProgressOverview`), ~500 lines total.
 *
 * FIRST cut: the two most self-contained charts —
 *   - renderTaskBreakdownHTML(breakdown)     — the completed-task-by-category bar chart (State: a
 *     call-to-action empty-state when nothing is done, else one colored bar per non-empty category).
 *   - renderActivityHeatmapHTML(weeks)       — the 12-week GitHub-style completion heatmap. All date
 *     math + the completion lookup stay in the wrapper, which precomputes the week/day cell matrix;
 *     this builder just paints it (the green-ramp thresholds live here).
 *
 * `renderQuickStats` is intentionally NOT a target: it sets `.textContent` on four stat tiles rather
 * than building a markup string, so (like the imperative `update*` mutators) it stays on the class.
 *
 * Byte-faithful: each builder reproduces its original inline template verbatim (including the two
 * charts' 33-space attribute-continuation lines and the heatmap cell's trailing space), so the
 * wrappers keep only the impure data-gather (reading `this.dailyTasks` etc.) + the `innerHTML` write.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.ANALYTICS_RENDER.
 *   - Jest/Node: require('./analytics-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @typedef {Object} TaskBreakdownCounts
     * @property {number} daily
     * @property {number} weekly
     * @property {number} monthly
     * @property {number} yearly
     * @property {number} life
     * @property {number} side
     */

    /**
     * The Task Breakdown chart: one horizontal bar per non-empty task category — a fixed-width label,
     * a colored progress fill whose width is the category's share of the total, and a "count
     * (percent%)" readout in its OWN fixed-width column (the v2.7 fix that moved the label OUT of the
     * fill so it can't be clipped when a bar is too short on a narrow viewport). When nothing has been
     * completed it returns a call-to-action empty-state instead.
     * @param {TaskBreakdownCounts} breakdown  completed-task counts per category
     * @returns {string}
     */
    function renderTaskBreakdownHTML(breakdown) {
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

        if (total === 0) {
            return '<div class="text-center text-amber-300 py-12 fancy-font">Complete some quests to see breakdown!</div>';
        }

        /** @type {Record<string, { bg: string, text: string }>} */
        const colors = {
            daily: { bg: 'bg-orange-500', text: 'Daily' },
            weekly: { bg: 'bg-green-500', text: 'Weekly' },
            monthly: { bg: 'bg-blue-500', text: 'Monthly' },
            yearly: { bg: 'bg-purple-500', text: 'Yearly' },
            life: { bg: 'bg-red-500', text: 'Life' },
            side: { bg: 'bg-cyan-500', text: 'Side' }
        };

        let html = '<div class="w-full flex flex-col gap-3">';

        Object.entries(breakdown).forEach(([type, count]) => {
            if (count > 0) {
                const percent = ((count / total) * 100).toFixed(1);
                html += `
                    <div class="flex items-center gap-3">
                        <div class="w-16 text-right text-amber-200 text-sm fancy-font shrink-0">${colors[type].text}</div>
                        <div class="progress-bar flex-1 min-w-0 bg-stone-800 rounded-full h-6 overflow-hidden border border-amber-700/30">
                            <div class="${colors[type].bg} h-full rounded-full transition-all duration-500"
                                 style="width: ${percent}%"></div>
                        </div>
                        <div class="w-20 text-left text-amber-100 text-xs font-bold fancy-font shrink-0">${count} <span class="text-amber-300/70">(${percent}%)</span></div>
                    </div>
                `;
            }
        });

        html += '</div>';
        return html;
    }

    /**
     * @typedef {Object} HeatmapCell
     * @property {string} dateStr    canonical YYYY-MM-DD for the cell
     * @property {number} count      completed daily tasks that day (0 for future cells)
     * @property {boolean} isFuture  true if the cell is after today (drawn as a dim placeholder)
     */

    /**
     * The 12-week Activity Heatmap: a top row of day-of-week labels (S M T W T F S) over one row per
     * week of seven day-cells. Past/today cells are tinted by completion count on a GitHub-style green
     * ramp (>0 / >2 / >5 / >10); future cells render as a dim empty placeholder. The caller precomputes
     * the week/day cell matrix (all date math + the per-day completion lookup stay in the wrapper), so
     * this builder is pure — it only maps cells to markup and owns the colour thresholds.
     * @param {HeatmapCell[][]} weeks  oldest→newest weeks, each a Sunday→Saturday array of 7 cells
     * @returns {string}
     */
    function renderActivityHeatmapHTML(weeks) {
        let html = '<div class="flex flex-col gap-1">';

        // Day labels at top
        html += '<div class="flex gap-1 mb-1">';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
            html += `<div class="text-xs text-amber-300 text-center" style="flex:1;">${day}</div>`;
        });
        html += '</div>';

        // Week rows (oldest at top, newest at bottom)
        weeks.forEach(week => {
            html += '<div class="flex gap-1">';
            week.forEach(cell => {
                if (cell.isFuture) {
                    html += '<div class="rounded border border-stone-700/30" style="flex:1;aspect-ratio:1;max-height:28px;opacity:0.15;"></div>';
                } else {
                    const count = cell.count;
                    let color = 'bg-stone-700';
                    if (count > 0) color = 'bg-green-900';
                    if (count > 2) color = 'bg-green-700';
                    if (count > 5) color = 'bg-green-500';
                    if (count > 10) color = 'bg-green-300';

                    html += `<div class="${color} rounded border border-stone-600 hover:border-amber-500 transition-all cursor-pointer" 
                                 style="flex:1;aspect-ratio:1;max-height:28px;" title="${cell.dateStr}: ${count} tasks"></div>`;
                }
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    /**
     * @typedef {Object} XPTimelineBar
     * @property {string} dateStr    canonical YYYY-MM-DD for the day
     * @property {number} count      completed daily tasks that day
     * @property {string} dayLetter  single-letter day-of-week label (S/M/T/W/T/F/S)
     */

    /**
     * The 30-day XP Timeline: one vertical bar per day (height = that day's completed-task count as a
     * share of the busiest day in the window), with a hover day-letter + a "date: N tasks completed"
     * tooltip. Returns a call-to-action empty-state when the whole window is empty. The caller
     * precomputes the 30-bar array (all date math + the completion lookup stay in the wrapper); this
     * builder derives the bar scale (max, floored at 1) and paints. NOTE: bars plot task COUNTS, not
     * XP — the copy reflects that (see the wrapper's v2.6.x rationale for why true XP isn't available).
     * Layout (v2.7 fix): each column is `h-full` with the bar in a `flex-1` wrapper so `height:%`
     * resolves against a concrete pixel basis — an auto-height parent collapsed every bar to 0px.
     * @param {XPTimelineBar[]} bars  oldest→newest, one per day in the 30-day window
     * @returns {string}
     */
    function renderXPTimelineHTML(bars) {
        if (!bars.length || bars.every(b => (b.count || 0) === 0)) {
            return '<div class="flex items-center justify-center h-full text-amber-300 fancy-font text-sm text-center px-4">Complete daily quests to see your XP timeline fill in over the last 30 days.</div>';
        }

        const maxCount = Math.max(1, ...bars.map(b => b.count));

        let html = '<div class="flex items-stretch justify-between h-full gap-1">';
        bars.forEach(({ dateStr, count, dayLetter }) => {
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            html += `
                <div class="flex-1 flex flex-col items-center h-full group">
                    <div class="flex-1 w-full flex items-end min-h-0">
                        <div class="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:from-purple-500 hover:to-purple-300"
                             style="height: ${height}%"
                             title="${dateStr}: ${count} task${count === 1 ? '' : 's'} completed"></div>
                    </div>
                    <div class="text-xs text-amber-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">${dayLetter}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * The Productivity Pattern chart: seven vertical bars (Sun→Sat), height = that weekday's
     * completed-task count as a share of the busiest weekday (floored at 1). Weekend bars (Sun/Sat)
     * are tinted blue, weekdays green; each shows its count above and a 3-letter label below with a
     * "Weekday: N tasks" tooltip. Fully pure — the caller passes the 7-bucket weekday tally.
     * Layout (v2.7 fix): each column is `h-full` with the bar in a `flex-1` wrapper so `height:%`
     * resolves against a concrete pixel basis — an auto-height parent collapsed every bar to 0px.
     * @param {number[]} dayCount  completed-task counts indexed by Date.getDay() (0=Sun … 6=Sat)
     * @returns {string}
     */
    function renderProductivityPatternHTML(dayCount) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const maxCount = Math.max(...dayCount, 1);

        let html = '<div class="flex items-stretch justify-between h-full gap-2">';
        dayCount.forEach((count, index) => {
            const height = (count / maxCount) * 100;
            const color = index === 0 || index === 6 ? 'from-blue-600 to-blue-400' : 'from-green-600 to-green-400';
            html += `
                <div class="flex-1 flex flex-col items-center h-full group">
                    <div class="text-sm text-amber-300 mb-2 font-bold shrink-0">${count}</div>
                    <div class="flex-1 w-full flex items-end min-h-0">
                        <div class="w-full bg-gradient-to-t ${color} rounded-t transition-all hover:scale-105"
                             style="height: ${height}%"
                             title="${dayNames[index]}: ${count} tasks"></div>
                    </div>
                    <div class="text-xs text-amber-400 mt-2 shrink-0">${dayNames[index].slice(0, 3)}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * @typedef {Object} PersonalRecord
     * @property {string} icon
     * @property {string} label
     * @property {string|number} value
     * @property {string} color   palette key — orange | purple | blue | green | yellow | red
     */

    /**
     * The Personal Records grid: one gradient stat card per record (icon + big value + label), themed
     * by a static colour palette. The palette is a LITERAL lookup table (not interpolated Tailwind
     * class names) so every concrete class string appears verbatim in source — a v2.6.x audit fix
     * against fragile dynamic class strings. Pure — the caller computes the record VALUES (streak,
     * level, gold, chests, …) and passes them in.
     * @param {PersonalRecord[]} records
     * @returns {string}
     */
    function renderPersonalRecordsHTML(records) {
        /** @type {Record<string, { gradient: string, border: string, title: string, sub: string }>} */
        const palette = {
            orange: { gradient: 'from-orange-900 to-orange-950', border: 'border-orange-600', title: 'text-orange-300', sub: 'text-orange-200' },
            purple: { gradient: 'from-purple-900 to-purple-950', border: 'border-purple-600', title: 'text-purple-300', sub: 'text-purple-200' },
            blue: { gradient: 'from-blue-900 to-blue-950', border: 'border-blue-600', title: 'text-blue-300', sub: 'text-blue-200' },
            green: { gradient: 'from-green-900 to-green-950', border: 'border-green-600', title: 'text-green-300', sub: 'text-green-200' },
            yellow: { gradient: 'from-yellow-900 to-yellow-950', border: 'border-yellow-600', title: 'text-yellow-300', sub: 'text-yellow-200' },
            red: { gradient: 'from-red-900 to-red-950', border: 'border-red-600', title: 'text-red-300', sub: 'text-red-200' }
        };

        return records.map(record => {
            const p = palette[record.color] || palette.orange;
            return `
            <div class="bg-gradient-to-br ${p.gradient} p-4 rounded-lg border-2 ${p.border} text-center">
                <div class="text-3xl mb-2">${record.icon}</div>
                <div class="text-2xl font-bold ${p.title} medieval-title">${record.value}</div>
                <div class="text-xs ${p.sub} fancy-font mt-1">${record.label}</div>
            </div>
        `;
        }).join('');
    }

    /**
     * @typedef {Object} ProgressGoal
     * @property {string} type       goal tier — 'Life' | 'Yearly' | 'Monthly' | 'Weekly'
     * @property {any} title         user-entered goal title (escaped via the injected escapeHTML)
     * @property {number} [progress] 0–100 completion percent (clamped by the builder)
     */

    /**
     * The Goals Progress overview: one card per INCOMPLETE goal (tier chip + escaped title + percent +
     * a progress track), themed per tier by a static literal palette (same v2.6.x anti-dynamic-class
     * fix as the records grid). Returns a celebratory empty-state when nothing is in progress. Pure
     * once `escapeHTML` is INJECTED (applied to the user-entered title — the card's only coupling); the
     * caller passes the already-filtered, tier-tagged goal list.
     * @param {ProgressGoal[]} goals
     * @param {{ escapeHTML: (s: any) => string }} deps
     * @returns {string}
     */
    function renderGoalsProgressOverviewHTML(goals, { escapeHTML }) {
        if (goals.length === 0) {
            return '<div class="text-center text-amber-300 py-8 fancy-font">All goals completed! Time to set new ones! 🎉</div>';
        }

        /** @type {Record<string, { card: string, chip: string, pct: string, track: string, fill: string }>} */
        const palette = {
            Life:    { card: 'bg-red-900/30 border-red-700/50',       chip: 'bg-red-700/50 text-red-200',       pct: 'text-red-300',       track: 'bg-red-950 border-red-700',       fill: 'from-red-600 to-red-400' },
            Yearly:  { card: 'bg-purple-900/30 border-purple-700/50', chip: 'bg-purple-700/50 text-purple-200', pct: 'text-purple-300', track: 'bg-purple-950 border-purple-700', fill: 'from-purple-600 to-purple-400' },
            Monthly: { card: 'bg-blue-900/30 border-blue-700/50',     chip: 'bg-blue-700/50 text-blue-200',     pct: 'text-blue-300',     track: 'bg-blue-950 border-blue-700',     fill: 'from-blue-600 to-blue-400' },
            Weekly:  { card: 'bg-green-900/30 border-green-700/50',   chip: 'bg-green-700/50 text-green-200',   pct: 'text-green-300',   track: 'bg-green-950 border-green-700',   fill: 'from-green-600 to-green-400' }
        };

        return goals.map(goal => {
            const progress = Math.max(0, Math.min(100, goal.progress || 0));
            const p = palette[goal.type] || palette.Weekly;
            return `
                <div class="${p.card} border-2 rounded-lg p-4">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <span class="text-xs ${p.chip} px-2 py-1 rounded fancy-font shrink-0">${goal.type}</span>
                            <h4 class="text-lg font-bold text-amber-300 medieval-title break-words min-w-0">${escapeHTML(goal.title)}</h4>
                        </div>
                        <span class="${p.pct} font-bold shrink-0">${progress}%</span>
                    </div>
                    <div class="w-full ${p.track} rounded-full h-3 border">
                        <div class="bg-gradient-to-r ${p.fill} h-3 rounded-full transition-all duration-500"
                             style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const ANALYTICS_RENDER = Object.freeze({
        renderTaskBreakdownHTML,
        renderActivityHeatmapHTML,
        renderXPTimelineHTML,
        renderProductivityPatternHTML,
        renderPersonalRecordsHTML,
        renderGoalsProgressOverviewHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic ANALYTICS_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.ANALYTICS_RENDER = ANALYTICS_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = ANALYTICS_RENDER;
})();
