// @ts-check
'use strict';
/**
 * archive-render.js — pure Archive-panel presentation builder (Engineering Roadmap #1).
 *
 * The SIXTEENTH render module (after boss-, task-, companion-, spell-, class-, analytics-, quest-chain-,
 * enchantment-, dashboard-, player-hud-, title-, reward-, theme-, badge-, and habit-render.js). Holds the
 * populated body of the Archive (Tools tab):
 *   - renderArchivesHTML({ archivedGoals, escapeHTML })
 *       the markup `renderArchives()` writes into #archives-container when at least one goal is archived: the
 *       archived goals sorted newest-first by `archivedAt`, each a type-colored card (per-type icon + capitalized
 *       type badge, an optional "✓ Completed" flag, the escaped title, an optional escaped description, the
 *       localized "Archived: <date>" line, and Restore / Delete-Forever buttons).
 *
 * PURE given its inputs: same { archivedGoals, escapeHTML } -> same string. The sort compares each record's own
 * `archivedAt` and the date line formats that same stored timestamp (`toLocaleDateString()`) — neither reads the
 * wall clock — so output is stable given the same records + locale. `escapeHTML` is the manager's pure HTML-
 * escaper. The wrapper keeps its #archives-container lookup + guard, the separate #archive-count textContent
 * write, AND the zero-archives empty-state branch (this._renderEmptyState) — this builder only produces the
 * non-empty card list (mirroring the renderHabits / renderActiveSpells extractions).
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.ARCHIVE_RENDER.
 *   - Jest/Node: require('./archive-render.js') returns the frozen builder via module.exports.
 */
(function () {
    /**
     * @param {{
     *   archivedGoals: Array<{ id: number|string, type: string, title: string, description?: string, completed?: boolean, archivedAt: string|number|Date }>,
     *   escapeHTML: (s: string) => string,
     * }} deps
     * @returns {string}
     */
    function renderArchivesHTML({ archivedGoals, escapeHTML }) {
        const sortedArchives = [...archivedGoals].sort((a, b) => 
                new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
            );
            
            return sortedArchives.map(goal => {
                const typeIcons = {
                    life: '🏰',
                    yearly: '📅',
                    monthly: '🗓️',
                    weekly: '⚔️',
                    daily: '🗡️'
                };
                
                const typeColors = {
                    life: 'red',
                    yearly: 'purple',
                    monthly: 'blue',
                    weekly: 'green',
                    daily: 'orange'
                };
                
                const color = (/** @type {Record<string, string>} */ (typeColors))[goal.type] || 'gray';
                
                return `
                    <div class="quest-card bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-lg shadow-xl border-3 border-${color}-700">
                        <div class="flex items-start space-x-4">
                            <div class="text-3xl">${(/** @type {Record<string, string>} */ (typeIcons))[goal.type]}</div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-xs bg-${color}-800/50 text-${color}-200 px-2 py-1 rounded fancy-font capitalize">${goal.type}</span>
                                    ${goal.completed ? '<span class="text-xs text-green-400">✓ Completed</span>' : ''}
                                </div>
                                <h4 class="font-bold text-lg text-amber-300 medieval-title mb-1">${escapeHTML(goal.title)}</h4>
                                ${goal.description ? `<p class="text-sm text-${color}-200 italic mb-2">${escapeHTML(goal.description)}</p>` : ''}
                                <div class="text-xs text-${color}-300">
                                    Archived: ${new Date(goal.archivedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <button data-action="goal.restore" data-goal-id="${goal.id}" class="text-${color}-400 hover:text-${color}-200 text-xl" title="Restore" aria-label="Restore archived goal">
                                    <i class="ri-refresh-line" aria-hidden="true"></i>
                                </button>
                                <button data-action="goal.purgeArchived" data-goal-id="${goal.id}" class="text-red-500 hover:text-red-300 text-xl" title="Delete Forever" aria-label="Permanently delete goal">
                                    <i class="ri-delete-bin-line" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    const ARCHIVE_RENDER = Object.freeze({ renderArchivesHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic ARCHIVE_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.ARCHIVE_RENDER = ARCHIVE_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = ARCHIVE_RENDER;
})();
