// @ts-check
'use strict';
/**
 * calendar-render.js — pure Calendar-tab presentation builders (Engineering Roadmap #1).
 *
 * The NINETEENTH render module. Holds the two pure input->HTML-string builders behind the Calendar tab:
 *   - renderCalendarDayHTML({ day, isToday, completedTasks, totalTasks })
 *       the inner content of ONE calendar day cell: the day number (white on today's amber-highlighted cell,
 *       amber-200 otherwise) and, when the day has any scheduled tasks, a "<completed>/<total> ⚔️" progress
 *       badge (its text tint also shifts on today's cell). Returns just the cell's innerHTML string.
 *   - renderCalendarTasksHTML({ tasksForDay, dateString, escapeHTML })
 *       the populated selected-date panel body: one quest-card per task in tasksForDay (a checkbox wired to
 *       goalManager.toggleTask, the escaped title with line-through/dimmed styling when done, a delete button,
 *       an optional escaped description, and an optional checklist of escaped items) followed by an "Add Another
 *       Quest" button whose data-date carries the selected dateString.
 *
 * Both are PURE. The wrappers stay imperative on the class and own every DOM side-effect:
 *   - renderCalendar keeps its getElementById lookups, the month/year textContent write, the tasksByDate
 *     pre-indexing, the createElement/appendChild grid loop (including the per-day onclick selectDate closure
 *     and data-date attribute), and the previously-selected-day highlight; it calls renderCalendarDayHTML per cell.
 *   - renderCalendarTasks keeps its dateString parse, the selected-date-title textContent write, the dailyTasks
 *     filter, the container lookup, and the zero-tasks empty-state branch (this._renderEmptyState, which threads
 *     dateString through its CTA); it calls renderCalendarTasksHTML for the populated body, injecting escapeHTML.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.CALENDAR_RENDER.
 *   - Jest/Node: require('./calendar-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @param {{ day: number, isToday: boolean, completedTasks: number, totalTasks: number }} args
     * @returns {string}
     */
    function renderCalendarDayHTML({ day, isToday, completedTasks, totalTasks }) {
        return `
                <div class="text-center">
                    <div class="text-lg font-bold ${isToday ? 'text-white' : 'text-amber-200'}">${day}</div>
                    ${totalTasks > 0 ? `
                        <div class="mt-1">
                            <div class="text-xs ${isToday ? 'text-amber-100' : 'text-amber-300'} font-semibold">
                                ${completedTasks}/${totalTasks} ⚔️
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
    }

    /**
     * @param {{
     *   tasksForDay: Array<{ id: number, completed?: boolean, title: string, description?: string, checklist?: Array<{ completed?: boolean, text: string }> }>,
     *   dateString: string,
     *   escapeHTML: (s: string) => string,
     * }} deps
     * @returns {string}
     */
    function renderCalendarTasksHTML({ tasksForDay, dateString, escapeHTML }) {
        return tasksForDay.map(task => `
                <div class="quest-card bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-lg shadow-lg border-2 border-amber-700/50 task-item hover:shadow-xl transition-all">
                    <div class="flex items-center">
                        <input 
                            type="checkbox" 
                            ${task.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleTask(${task.id}, event)">
                        <span class="ml-4 flex-1 text-lg font-semibold fancy-font ${task.completed ? 'line-through text-amber-600 opacity-60' : 'text-amber-100'}">${escapeHTML(task.title)}</span>
                        <button data-action="goal.delete" data-goal-type="daily" data-goal-id="${task.id}" class="text-red-400 hover:text-red-200 text-xl">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                    ${task.description ? `<p class="text-sm text-amber-200/70 mt-2 ml-8 fancy-font italic">${escapeHTML(task.description)}</p>` : ''}
                    ${task.checklist && task.checklist.length > 0 ? `
                        <div class="ml-8 mt-2 space-y-1">
                            ${task.checklist.map((item, i) => `
                                <div class="flex items-center gap-2 text-sm text-amber-200/80">
                                    <span>${item.completed ? '☑' : '☐'}</span>
                                    <span class="${item.completed ? 'line-through opacity-60' : ''}">${escapeHTML(item.text)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('') + `
                <div class="text-center mt-4">
                    <button data-action="task.addDaily" data-date="${dateString}" 
                        class="btn-ripple bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all fancy-font">
                        <i class="ri-add-line mr-2"></i>Add Another Quest
                    </button>
                </div>
            `;
    }

    const CALENDAR_RENDER = Object.freeze({ renderCalendarDayHTML, renderCalendarTasksHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic CALENDAR_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.CALENDAR_RENDER = CALENDAR_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = CALENDAR_RENDER;
})();
