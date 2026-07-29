// @ts-check
'use strict';
/**
 * quest-chain-render.js — pure Quest Chains presentation builders (Engineering Roadmap #1).
 *
 * The SEVENTH render module (after boss-render.js, task-render.js, companion-render.js,
 * spell-render.js, class-render.js, analytics-render.js). Covers the WHOLE Quest Chains tab —
 * the three columns that `renderQuestChains()` orchestrates:
 *   - renderActiveQuestChainsHTML(activeChains, { templates, spellDefinitions })
 *       the in-progress saga cards (chapter progress bar, current-chapter task checklist, chapter
 *       reward preview). Empty-state when NO chains are active; chains whose template has gone
 *       missing are filtered out (so a stale save can't crash the column).
 *   - renderAvailableQuestChainsHTML(activeChains, completedChains, { templates })
 *       the catalog of not-yet-started chains (every template minus the active + completed ones),
 *       each a "Begin Adventure" card. Empty-state when everything is started or done.
 *   - renderCompletedQuestChainsHTML(completedChains, { templates })
 *       the trophy shelf of finished sagas. Empty-state when none are done; missing-template chains
 *       filtered out as above.
 *
 * The domain objects are dynamic runtime shapes (chain instances + the `questChainTemplates` catalog
 * + the `spellDefinitions` catalog for the reward spell name), so the builders take them as `any` and
 * are documented in prose rather than over-typed. They are PURE: given the same chains + catalogs they
 * always return the same string. `renderQuestChains()` stays on the class as a thin 3-call orchestrator.
 *
 * Byte-faithful: each builder is the original inline method body moved verbatim (templates copied to
 * the byte, including trailing spaces + whitespace-only lines), with only the impure plumbing changed —
 * `this.<state>` → injected params and `container.innerHTML = X` → `return X`. The wrappers keep just
 * the `getElementById` + guard + `innerHTML` write.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.QUEST_CHAIN_RENDER.
 *   - Jest/Node: require('./quest-chain-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * Active (in-progress) quest-chain cards.
     * @param {any[]} activeChains  `this.activeQuestChains` — each has id, templateId,
     *   currentChapterIndex, chapters[], completedTasks[].
     * @param {{ templates: Record<string, any>, spellDefinitions: Record<string, any> }} deps
     *   templates = the `questChainTemplates` catalog keyed by templateId; spellDefinitions =
     *   the spell catalog (for the chapter reward's spell name).
     * @returns {string}
     */
    function renderActiveQuestChainsHTML(activeChains, { templates, spellDefinitions }) {
        if (activeChains.length === 0) {
            return `
                <div class="text-center py-12 text-cyan-200">
                    <div class="text-8xl mb-4 opacity-30">⛓️</div>
                    <p class="fancy-font text-lg">No active quest chains. Start an adventure below!</p>
                </div>
            `;
        }

        // Filter out chains with missing templates
        const validChains = activeChains.filter(chain => 
            templates[chain.templateId] !== undefined
        );
        
        const html = validChains.map(chain => {
            const template = templates[chain.templateId];
            const currentChapter = chain.chapters[chain.currentChapterIndex];
            const progress = Math.round((chain.currentChapterIndex / template.chapters.length) * 100);
            
            return `
                <div class="bg-gradient-to-br from-cyan-900 to-cyan-950 p-6 rounded-xl border-3 border-cyan-600 shadow-2xl">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="text-6xl">${template.icon}</div>
                            <div>
                                <h3 class="text-2xl font-bold text-cyan-300 medieval-title">${template.name}</h3>
                                <p class="text-sm text-cyan-200">${template.description}</p>
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="text-xs bg-cyan-700 text-white px-2 py-1 rounded">${template.category}</span>
                                    <span class="text-xs bg-${template.difficulty === 'easy' ? 'green' : template.difficulty === 'medium' ? 'yellow' : 'red'}-700 text-white px-2 py-1 rounded">
                                        ${template.difficulty.toUpperCase()}
                                    </span>
                                    <span class="text-xs text-cyan-300">Chapter ${chain.currentChapterIndex + 1}/${template.chapters.length}</span>
                                </div>
                            </div>
                        </div>
                        <button data-action="questChain.abandon" data-chain-id="${chain.id}" 
                            class="text-red-400 hover:text-red-200" title="Abandon Quest Chain">
                            <i class="ri-close-circle-line text-2xl"></i>
                        </button>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-cyan-200 font-bold">Overall Progress</span>
                            <span class="text-sm text-cyan-300">${progress}%</span>
                        </div>
                        <div class="w-full bg-cyan-950 rounded-full h-3 border border-cyan-700">
                            <div class="bg-gradient-to-r from-cyan-600 to-cyan-400 h-3 rounded-full transition-all duration-500" 
                                 style="width: ${progress}%"></div>
                        </div>
                    </div>

                    <!-- Current Chapter -->
                    <div class="bg-stone-900/60 rounded-lg p-4 border border-cyan-700/50">
                        <h4 class="text-lg font-bold text-cyan-300 mb-2"><i class="ri-book-open-line mr-2"></i>${currentChapter.title}</h4>
                        <p class="text-sm text-cyan-200 mb-3">${currentChapter.description}</p>
                        
                        <!-- Chapter Tasks -->
                        <div class="space-y-2">
                            ${/** @type {string[]} */ (currentChapter.tasks).map((task, index) => {
                                const isCompleted = chain.completedTasks.includes(index);
                                return `
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                                            onchange="goalManager.toggleChainTask('${chain.id}', ${index})"
                                            class="cursor-pointer">
                                        <span class="${isCompleted ? 'line-through text-green-400' : 'text-cyan-100'} text-sm">
                                            ${task}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Chapter Reward Preview -->
                        <div class="mt-4 p-3 bg-amber-900/30 rounded border border-amber-700/50">
                            <div class="text-xs text-amber-300 mb-1">🏆 Chapter Reward:</div>
                            <div class="text-sm text-amber-200">
                                +${currentChapter.reward.xp} XP, 
                                +${currentChapter.reward.gold} Gold, 
                                ${spellDefinitions[currentChapter.reward.spell]?.name} x${currentChapter.reward.charges}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return html;
    }

    /**
     * Available (not-yet-started) quest-chain catalog cards.
     * @param {any[]} activeChains     `this.activeQuestChains` (excluded from the catalog)
     * @param {any[]} completedChains  `this.completedQuestChains` (excluded from the catalog)
     * @param {{ templates: Record<string, any> }} deps  the `questChainTemplates` catalog
     * @returns {string}
     */
    function renderAvailableQuestChainsHTML(activeChains, completedChains, { templates }) {
        // Get templates that aren't currently active or completed
        const activeIds = activeChains.map(c => c.templateId);
        const completedIds = completedChains.map(c => c.templateId);
        const availableTemplates = Object.values(templates)
            .filter(t => !activeIds.includes(t.id) && !completedIds.includes(t.id));

        if (availableTemplates.length === 0) {
            return `
                <div class="col-span-3 text-center py-8 text-cyan-200">
                    <p class="fancy-font">All quest chains completed or in progress! More coming soon...</p>
                </div>
            `;
        }

        const html = availableTemplates.map(template => {
            const difficultyColor = template.difficulty === 'easy' ? 'green' : template.difficulty === 'medium' ? 'yellow' : 'red';
            
            return `
                <div class="bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-lg border-2 border-cyan-700/50 hover:border-cyan-500 transition-all cursor-pointer group">
                    <div class="text-5xl mb-3 text-center group-hover:scale-110 transition-transform">${template.icon}</div>
                    <h4 class="text-lg font-bold text-cyan-300 medieval-title mb-2 text-center">${template.name}</h4>
                    <p class="text-sm text-cyan-200 mb-3 text-center">${template.description}</p>
                    
                    <div class="flex flex-wrap justify-center gap-2 mb-3">
                        <span class="text-xs bg-cyan-700 text-white px-2 py-1 rounded">${template.category}</span>
                        <span class="text-xs bg-${difficultyColor}-700 text-white px-2 py-1 rounded">${template.difficulty.toUpperCase()}</span>
                        <span class="text-xs bg-purple-700 text-white px-2 py-1 rounded">${template.chapters.length} Chapters</span>
                        <span class="text-xs bg-blue-700 text-white px-2 py-1 rounded">~${template.estimatedWeeks} weeks</span>
                    </div>

                    <button data-action="questChain.start" data-template-id="${template.id}"
                        class="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105">
                        🗺️ Begin Adventure
                    </button>
                </div>
            `;
        }).join('');

        return html;
    }

    /**
     * Completed quest-chain trophy cards.
     * @param {any[]} completedChains  `this.completedQuestChains` — each has templateId + completedAt.
     * @param {{ templates: Record<string, any> }} deps  the `questChainTemplates` catalog
     * @returns {string}
     */
    function renderCompletedQuestChainsHTML(completedChains, { templates }) {
        if (completedChains.length === 0) {
            return `
                <div class="col-span-3 text-center py-8 text-cyan-200">
                    <div class="text-6xl mb-3 opacity-30">🏆</div>
                    <p class="fancy-font">No completed quest chains yet. Finish your first saga!</p>
                </div>
            `;
        }

        // Filter out chains with missing templates
        const validChains = completedChains.filter(chain => 
            templates[chain.templateId] !== undefined
        );
        
        const html = validChains.map(chain => {
            const template = templates[chain.templateId];
            const completedDate = chain.completedAt ? new Date(chain.completedAt).toLocaleDateString() : '';

            return `
                <div class="bg-gradient-to-br from-green-900/40 to-stone-900/40 p-4 rounded-lg border-2 border-green-600/50">
                    <div class="text-4xl mb-2 text-center grayscale opacity-75">${template.icon}</div>
                    <h4 class="text-lg font-bold text-green-300 medieval-title mb-1 text-center">${template.name}</h4>
                    <div class="text-xs text-green-200 mb-2 text-center">
                        <span class="bg-green-700/50 px-2 py-1 rounded">${template.category}</span>
                    </div>
                    <div class="text-xs text-amber-300 fancy-font text-center">
                        <i class="ri-checkbox-circle-fill text-green-400 mr-1"></i>Completed: ${completedDate}
                    </div>
                    <div class="text-xs text-cyan-300 mt-1 text-center">
                        ${template.chapters.length} Chapters Conquered
                    </div>
                    <div class="mt-2 text-center">
                        <span class="text-2xl">🏆</span>
                    </div>
                </div>
            `;
        }).join('');

        return html;
    }

    const QUEST_CHAIN_RENDER = Object.freeze({
        renderActiveQuestChainsHTML,
        renderAvailableQuestChainsHTML,
        renderCompletedQuestChainsHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic QUEST_CHAIN_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.QUEST_CHAIN_RENDER = QUEST_CHAIN_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = QUEST_CHAIN_RENDER;
})();
