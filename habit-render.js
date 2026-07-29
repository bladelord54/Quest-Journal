// @ts-check
'use strict';
/**
 * habit-render.js — pure Rituals/Habits-panel presentation builder (Engineering Roadmap #1).
 *
 * The FIFTEENTH render module (after boss-, task-, companion-, spell-, class-, analytics-, quest-chain-,
 * enchantment-, dashboard-, player-hud-, title-, reward-, theme-, and badge-render.js). Holds the populated
 * body of the Rituals tab:
 *   - renderHabitsHTML({ habits, escapeHTML, heatmapHTML })
 *       the markup `renderHabits()` writes into #habits-container when at least one habit exists: one draggable
 *       ritual card per habit — a completion checkbox (line-through + dimmed when done), the escaped title, an
 *       optional "🔥 N day(s)" streak badge (hidden at streak 0), an optional escaped description, a
 *       total-completions line, edit/delete buttons, and the habit's completion heatmap.
 *
 * PURE given its inputs: same { habits, escapeHTML, heatmapHTML } -> same string (no clock, no DOM). The
 * clock-dependent GitHub-style heatmap is injected as `heatmapHTML(habit)` (the wrapper passes the manager's
 * generateHabitHeatMap, which reads "today"); `escapeHTML` is the manager's pure HTML-escaper. The wrapper keeps
 * its #habits-container lookup + guard AND the zero-habits empty-state branch (this._renderEmptyState) — this
 * builder only produces the non-empty card list (mirroring the renderActiveSpells extraction).
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.HABIT_RENDER.
 *   - Jest/Node: require('./habit-render.js') returns the frozen builder via module.exports.
 */
(function () {
    /**
     * @param {{
     *   habits: Array<{ id: number|string, title: string, completedToday?: boolean, streak: number, description?: string, totalCompletions?: number }>,
     *   escapeHTML: (s: string) => string,
     *   heatmapHTML: (habit: any) => string,
     * }} deps
     * @returns {string}
     */
    function renderHabitsHTML({ habits, escapeHTML, heatmapHTML }) {
        return habits.map(habit => `
                <div class="quest-card bg-gradient-to-br from-yellow-100 to-amber-50 p-5 rounded-lg shadow-lg border-3 border-yellow-600 hover:shadow-xl transition-all draggable-item"
                    data-habit-id="${habit.id}"
                    draggable="true"
                    ondragstart="goalManager.handleDragStart('habit', ${habit.id}, event)"
                    ondragend="goalManager.handleDragEnd(event)"
                    ondragover="goalManager.handleDragOver(event)"
                    ondragenter="goalManager.handleDragEnter(event)"
                    ondragleave="goalManager.handleDragLeave(event)"
                    ondrop="goalManager.handleDrop('habit', ${habit.id}, event)">
                    
                    <div class="flex items-center">
                        <i class="ri-draggable drag-handle text-amber-600 mr-2"></i>
                        <input 
                            type="checkbox" 
                            ${habit.completedToday ? 'checked' : ''} 
                            onchange="goalManager.toggleHabit(${habit.id})">
                        <div class="ml-4 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-bold fancy-font ${habit.completedToday ? 'line-through text-amber-700 opacity-60' : 'text-amber-900'}">${escapeHTML(habit.title)}</span>
                                ${habit.streak > 0 ? `<span class="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold">🔥 ${habit.streak} day${habit.streak !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                            ${habit.description ? `<p class="text-sm text-amber-800 italic mt-1">${escapeHTML(habit.description)}</p>` : ''}
                            <div class="text-xs text-amber-700 mt-1">
                                Total: ${habit.totalCompletions || 0} completions
                            </div>
                        </div>
                        <button data-action="goal.edit" data-goal-type="habit" data-goal-id="${habit.id}" class="text-blue-400 hover:text-blue-200 text-xl mr-2" title="Edit habit" aria-label="Edit habit">
                            <i class="ri-edit-line" aria-hidden="true"></i>
                        </button>
                        <button data-action="goal.delete" data-goal-type="habit" data-goal-id="${habit.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete habit" aria-label="Delete habit">
                            <i class="ri-delete-bin-line" aria-hidden="true"></i>
                        </button>
                    </div>
                    
                    ${heatmapHTML(habit)}
                </div>
            `).join('');
    }

    const HABIT_RENDER = Object.freeze({ renderHabitsHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic HABIT_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.HABIT_RENDER = HABIT_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = HABIT_RENDER;
})();
