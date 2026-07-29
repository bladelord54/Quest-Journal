// @ts-check
'use strict';
/**
 * task-render.js — pure task/goal presentation builders (Engineering Roadmap #1).
 *
 * Twentieth incremental slice of the goal-manager.js God class, and the SECOND render
 * module (after boss-render.js). This opens the home for the task/goal LIST renderers
 * (daily / weekly / side-quest cards) that come next; it starts with their shared LEAF —
 * the per-task checklist — so those bigger card builders can compose it as a tested pure
 * function (exactly as renderBossArena composes the already-extracted renderBossCard).
 *
 * `getChecklistProgress` is fully pure (a fold over task.checklist). `renderChecklistHTML`
 * is pure once `escapeHTML` (its only coupling, applied to user-entered checklist item
 * text) is INJECTED via deps; the manager passes `this.escapeHTML`.
 *
 * Dual-environment, no bundler (mirrors boss-render.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.TASK_RENDER. goal-manager.js captures it and delegates.
 *   - Jest/Node: `require('./task-render.js')` returns the object via module.exports.
 */
(function () {
    /**
     * Checklist completion fold: {completed, total, percent}. Pure — reads only
     * task.checklist. percent is floored (matches the original) and 0 when the list is empty.
     * @param {{ checklist?: Array<{ completed?: boolean }> }} task
     * @returns {{ completed: number, total: number, percent: number }}
     */
    function getChecklistProgress(task) {
        if (!task.checklist || task.checklist.length === 0) {
            return { completed: 0, total: 0, percent: 0 };
        }

        const completed = task.checklist.filter(i => i.completed).length;
        const total = task.checklist.length;
        const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;

        return { completed, total, percent };
    }

    /**
     * The per-task checklist block: an "Add Checklist Item" prompt when empty, else the
     * header (done/total) + a row per item (checkbox + text + delete) + a progress bar shown
     * only while partially complete. `escapeHTML` is INJECTED and applied to the user-entered
     * item text (the block's only coupling); everything else is task/item data. Indentation
     * matches the original method so both branch templates are byte-identical.
     * @param {{ id: any, checklist?: Array<{ id: any, text: any, completed?: boolean }> }} task
     * @param {string} taskType
     * @param {{ escapeHTML: (s: any) => string }} deps
     * @returns {string}
     */
    function renderChecklistHTML(task, taskType, { escapeHTML }) {
        if (!task.checklist || task.checklist.length === 0) {
            return `
                <div class="mt-3 pt-3 border-t border-gray-700/50">
                    <button data-action="checklist.add" data-task-type="${taskType}" data-task-id="${task.id}" 
                        class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                        ✓ Add Checklist Item
                    </button>
                </div>
            `;
        }

        const progress = getChecklistProgress(task);

        return `
            <div class="mt-3 pt-3 border-t border-gray-700/50">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-xs text-purple-300 font-semibold">✓ Checklist (${progress.completed}/${progress.total})</p>
                    <button data-action="checklist.add" data-task-type="${taskType}" data-task-id="${task.id}" 
                        class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-2 py-1 rounded border border-purple-600 fancy-font">
                        + Add
                    </button>
                </div>
                <div class="space-y-2 pl-2">
                    ${task.checklist.map(item => `
                        <div class="flex items-center text-sm group">
                            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                                data-action="checklist.toggle" data-task-type="${taskType}" data-task-id="${task.id}" data-item-id="${item.id}"
                                class="mr-2">
                            <span class="${item.completed ? 'line-through text-purple-400 opacity-60' : 'text-purple-100'} flex-1">${escapeHTML(item.text)}</span>
                            <button data-action="checklist.delete" data-task-type="${taskType}" data-task-id="${task.id}" data-item-id="${item.id}" 
                                class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2 text-xs">
                                <i class="ri-close-circle-line"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                ${progress.completed > 0 && progress.completed < progress.total ? `
                    <div class="progress-bar w-full bg-purple-950/60 rounded-full h-2 mt-2 border border-purple-700">
                        <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full shadow-lg transition-all duration-500" style="width: ${progress.percent}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * The priority badge `<span>` for a task/goal — the small colored 🔥 High / 🪶 Low /
     * ⭐ Medium pill. Validates the raw priority (anything not low/medium/high falls back to
     * medium) then returns the matching badge markup. This is the ONE source of the badge that
     * the daily-task, weekly-goal, yearly-goal, and monthly-goal cards all render via
     * `${priorityBadge}` — previously each card inlined an identical copy of this block (the exact
     * kind of duplicated knowledge that drifts). Pure; no injected deps.
     * @param {string|undefined} priority
     * @returns {string}
     */
    function priorityBadgeHTML(priority) {
        const p = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
        return p === 'high'
            ? '<span class="text-xs bg-red-700/50 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">🔥 High</span>'
            : p === 'low'
                ? '<span class="text-xs bg-gray-700/50 text-gray-200 px-2 py-1 rounded border border-gray-600/40 fancy-font">🪶 Low</span>'
                : '<span class="text-xs bg-yellow-700/50 text-yellow-200 px-2 py-1 rounded border border-yellow-600/40 fancy-font">⭐ Medium</span>';
    }

    /**
     * A single side-quest card: drag/drop wrapper + completion checkbox + priority icon,
     * escaped title, optional royal-bounty badge + escaped description, priority/added meta,
     * the checklist block, and edit/delete buttons. Pure once `escapeHTML` (title/description)
     * and `isBountyTarget` (the bounty-badge predicate — reads game state) are INJECTED; it
     * COMPOSES this module's own `renderChecklistHTML` for the checklist (passing `escapeHTML`
     * through). `color` is the theme color the caller (renderSideQuests) picks per card. The
     * inline `ondrag*` / `onchange` handlers reference the global `goalManager` and stay as
     * literal template text. Indentation matches the original method so the template is
     * byte-identical.
     * @param {{ id:any, completed?:boolean, priority:string, title:any, description?:any, created:any, checklist?:any[] }} quest
     * @param {string} color
     * @param {{ escapeHTML:(s:any)=>string, isBountyTarget:(type:string,id:any)=>boolean }} deps
     * @returns {string}
     */
    function renderSideQuestCardHTML(quest, color, { escapeHTML, isBountyTarget }) {
        /** @type {Record<string, string>} */
        const priorityIcons = {
            high: '⚡',
            medium: '⭐',
            low: '💫'
        };
        const bountyBadge = isBountyTarget('sidequest', quest.id)
            ? '<span class="bounty-badge text-xs px-2 py-1 rounded fancy-font" title="Royal Bounty target — complete for a free chest!">👑 Royal Bounty</span>'
            : '';

        return `
            <div class="quest-card goal-item bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-lg shadow-xl border-3 border-${color}-700 hover:shadow-2xl transition-all draggable-item"
                data-side-quest-id="${quest.id}"
                draggable="true"
                ondragstart="goalManager.handleDragStart('side', ${quest.id}, event)"
                ondragend="goalManager.handleDragEnd(event)"
                ondragover="goalManager.handleDragOver(event)"
                ondragenter="goalManager.handleDragEnter(event)"
                ondragleave="goalManager.handleDragLeave(event)"
                ondrop="goalManager.handleDrop('side', ${quest.id}, event)">
                <div class="flex items-start space-x-4">
                    <i class="ri-draggable drag-handle text-${color}-400 mr-1"></i>
                    <input 
                        type="checkbox" 
                        ${quest.completed ? 'checked' : ''} 
                        onchange="goalManager.toggleSideQuest(${quest.id})">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <span class="text-lg">${priorityIcons[quest.priority]}</span>
                            <h4 class="font-bold text-lg text-amber-300 medieval-title ${quest.completed ? 'line-through opacity-60' : ''}">${escapeHTML(quest.title)}</h4>
                            ${bountyBadge}
                        </div>
                        ${quest.description ? `<p class="text-sm text-${color}-100 mb-2 fancy-font italic">${escapeHTML(quest.description)}</p>` : ''}
                        <div class="flex items-center gap-2 text-xs text-${color}-200">
                            <span class="bg-${color}-800/50 px-2 py-1 rounded fancy-font capitalize">${quest.priority} Priority</span>
                            <span class="fancy-font">Added: ${new Date(quest.created).toLocaleDateString()}</span>
                        </div>
                        ${renderChecklistHTML(quest, 'sidequest', { escapeHTML })}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button data-action="goal.edit" data-goal-type="side" data-goal-id="${quest.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit side quest">
                            <i class="ri-edit-line" aria-hidden="true"></i>
                        </button>
                        <button data-action="goal.delete" data-goal-type="side" data-goal-id="${quest.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete side quest">
                            <i class="ri-delete-bin-line" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * A single daily-task card: drag/drop wrapper, optional bulk-select checkbox, completion
     * checkbox, escaped title + optional description, a priority badge, linked-parent chips, the
     * checklist block, and the connections/edit/delete controls. Pure once its per-task IMPURE
     * inputs (computed by the class wrapper) are injected: `parentNames` (from getParentNames over
     * weeklyGoals), `isSelected` (selectedItems membership), `bulkSelectionMode` (the class flag),
     * and `escapeHTML`. The pure `priority`/`priorityBadge` derivation stays INSIDE; the card
     * COMPOSES this module's own renderChecklistHTML. Inline `goalManager.*` handlers stay as
     * literal template text. Template indentation is preserved byte-for-byte from the original
     * map callback (hence the deep base indent).
     * @param {{ id:any, completed?:boolean, priority?:string, title:any, description?:any, checklist?:any[] }} task
     * @param {{ parentNames:any[], isSelected:boolean, bulkSelectionMode:boolean, escapeHTML:(s:any)=>string }} deps
     * @returns {string}
     */
    function renderDailyTaskCardHTML(task, { parentNames, isSelected, bulkSelectionMode, escapeHTML }) {
        const priorityBadge = priorityBadgeHTML(task.priority);
        return `
                <div class="quest-card bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-lg shadow-xl border-2 border-amber-700/50 task-item mb-4 ${isSelected ? 'ring-4 ring-purple-500' : ''}"
                    draggable="true"
                    ondragstart="goalManager.handleDragStart('daily', ${task.id}, event)"
                    ondragend="goalManager.handleDragEnd(event)"
                    ondragover="goalManager.handleDragOver(event)"
                    ondragenter="goalManager.handleDragEnter(event)"
                    ondragleave="goalManager.handleDragLeave(event)"
                    ondrop="goalManager.handleDrop('daily', ${task.id}, event)">
                    <div class="flex items-start space-x-4">
                        ${bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${task.id}, 'daily')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${task.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleTask(${task.id}, event)"
                            class="mt-1">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2 ${task.completed ? 'line-through opacity-60' : ''}">${escapeHTML(task.title)}</h4>
                            ${task.description ? `<p class="text-sm text-amber-200/80 mb-2 fancy-font">${escapeHTML(task.description)}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-green-700/40 text-green-200 px-2 py-1 rounded border border-green-600/40 fancy-font">
                                            🎯 ${escapeHTML(name)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${renderChecklistHTML(task, 'daily', { escapeHTML })}
                            
                            <div class="flex gap-2 mt-3">
                                <button data-action="goal.manageParents" data-scope="daily" data-goal-id="${task.id}" 
                                    class="text-xs bg-green-800/50 hover:bg-green-700/60 text-green-200 px-3 py-1 rounded border border-green-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button data-action="goal.edit" data-goal-type="daily" data-goal-id="${task.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit daily task">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button data-action="goal.delete" data-goal-type="daily" data-goal-id="${task.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete daily task">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    /**
     * A single weekly-goal card: drag-less goal wrapper, optional bulk-select checkbox, completion
     * checkbox, escaped title + optional description, priority badge, linked-parent chips, a
     * progress bar, the linked daily-tasks list, the checklist block, and the add-task/connections
     * + edit/delete controls. Pure once its per-goal IMPURE inputs (computed by the class wrapper)
     * are injected: `linkedTasks` (daily tasks whose weeklyGoalId(s) include this goal),
     * `parentNames` (getParentNames over monthlyGoals), `isSelected` (selectedItems membership),
     * `bulkSelectionMode` (the class flag), and `escapeHTML` (×4 — title, description, parent
     * chips, linked-task titles). The pure `priority`/`priorityBadge` derivation stays INSIDE; the
     * card COMPOSES this module's own renderChecklistHTML. NOTE: the original method also computed
     * a `bountyBadge` here but never interpolated it (dead code — an unused isBountyTarget call);
     * it is intentionally dropped, leaving the rendered output byte-identical. Inline
     * `goalManager.*` handlers stay as literal text; template indentation is preserved byte-for-
     * byte from the original map callback.
     * @param {{ id:any, completed?:boolean, priority?:string, title:any, description?:any, progress?:any, checklist?:any[] }} goal
     * @param {{ linkedTasks:any[], parentNames:any[], isSelected:boolean, bulkSelectionMode:boolean, escapeHTML:(s:any)=>string }} deps
     * @returns {string}
     */
    function renderWeeklyGoalCardHTML(goal, { linkedTasks, parentNames, isSelected, bulkSelectionMode, escapeHTML }) {
        const priorityBadge = priorityBadgeHTML(goal.priority);
        return `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-5 rounded-lg shadow-xl border-3 border-green-700 goal-item mb-4 ${isSelected ? 'ring-4 ring-purple-500' : ''}">
                    <div class="flex items-start space-x-4">
                        ${bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${goal.id}, 'weekly')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleWeeklyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${escapeHTML(goal.title)}</h4>
                            ${goal.description ? `<p class="text-sm text-green-200/80 mb-2 fancy-font">${escapeHTML(goal.description)}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-blue-700/40 text-blue-200 px-2 py-1 rounded border border-blue-600/40 fancy-font">
                                            🎯 ${escapeHTML(name)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="progress-bar w-full bg-green-950/60 rounded-full h-3 mt-2 border border-green-700">
                                <div class="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            <p class="text-xs text-green-200 mt-1 fancy-font">${goal.progress}% complete (${linkedTasks.filter(t => t.completed).length}/${linkedTasks.length} tasks)</p>
                            
                            ${linkedTasks.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-green-600/40 space-y-2">
                                    <p class="text-xs text-green-300 font-semibold mb-2">⚔️ Linked Daily Tasks:</p>
                                    ${linkedTasks.map(task => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleTask(${task.id}, event)"
                                                class="mr-2">
                                            <span class="${task.completed ? 'line-through text-green-400 opacity-60' : 'text-green-100'}">${escapeHTML(task.title)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${renderChecklistHTML(goal, 'weekly', { escapeHTML })}
                            
                            <div class="flex gap-2 mt-3">
                                <button data-action="task.addDaily" data-goal-id="${goal.id}" 
                                    class="text-xs bg-green-800/50 hover:bg-green-700/60 text-green-200 px-3 py-1 rounded border border-green-600 fancy-font">
                                    + Add Daily Task
                                </button>
                                <button data-action="goal.manageParents" data-scope="weekly" data-goal-id="${goal.id}" 
                                    class="text-xs bg-blue-800/50 hover:bg-blue-700/60 text-blue-200 px-3 py-1 rounded border border-blue-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button data-action="goal.edit" data-goal-type="weekly" data-goal-id="${goal.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit weekly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button data-action="goal.delete" data-goal-type="weekly" data-goal-id="${goal.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete weekly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    /**
     * A single life-goal card: completion checkbox, escaped title (h3) + optional description, a
     * created-date line, then EITHER a progress bar + linked yearly-campaigns list (when the goal
     * has linked yearly goals) OR a "Legendary Quest" badge, plus the add-yearly + edit/delete
     * controls. Pure once `linkedYearly` (yearly goals whose lifeGoalId(s) include this goal) and
     * `escapeHTML` are injected; `progress` is derived from them. Life goals have NO priority,
     * bulk-select, parent chips, or checklist (they sit at the top of the hierarchy). Inline
     * `goalManager.*` handlers stay literal; template indentation preserved byte-for-byte from the
     * original map callback.
     * @param {{ id:any, completed?:boolean, title:any, description?:any, created:any, progress?:any }} goal
     * @param {{ linkedYearly:any[], escapeHTML:(s:any)=>string }} deps
     * @returns {string}
     */
    function renderLifeGoalCardHTML(goal, { linkedYearly, escapeHTML }) {
        const progress = linkedYearly.length > 0 ? goal.progress || 0 : 0;
        return `
                <div class="quest-card bg-gradient-to-br from-red-900 to-red-950 p-5 rounded-xl shadow-2xl border-4 border-red-700 goal-item">
                    <div class="flex items-start space-x-4">
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleLifeGoal(${goal.id}, event)"
                            class="mt-1">
                        <div class="flex-1">
                            <h3 class="text-2xl font-bold text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${escapeHTML(goal.title)}</h3>
                            ${goal.description ? `<p class="text-sm text-red-200/80 mb-2 fancy-font">${escapeHTML(goal.description)}</p>` : ''}
                            <p class="text-sm text-red-200 mb-3 fancy-font">Created: ${new Date(goal.created).toLocaleDateString()}</p>
                            
                            ${linkedYearly.length > 0 ? `
                                <div class="progress-bar w-full bg-red-950/60 rounded-full h-4 mt-3 border border-red-700">
                                    <div class="bg-gradient-to-r from-red-500 to-red-400 h-4 rounded-full shadow-lg transition-all duration-500" style="width: ${progress}%"></div>
                                </div>
                                <p class="text-xs text-red-200 mt-2 fancy-font">${progress}% complete (${linkedYearly.filter(y => y.completed).length}/${linkedYearly.length} yearly campaigns)</p>
                                
                                <div class="mt-3 pl-4 border-l-2 border-red-600/40 space-y-2">
                                    <p class="text-xs text-red-300 font-semibold mb-2">🏆 Linked Yearly Campaigns:</p>
                                    ${linkedYearly.map(yearly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${yearly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleYearlyGoal(${yearly.id}, event)"
                                                class="mr-2">
                                            <span class="${yearly.completed ? 'line-through text-red-400 opacity-60' : 'text-red-100'}">${escapeHTML(yearly.title)} (${yearly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="flex items-center space-x-2 mt-2">
                                    <span class="text-xs bg-red-800/50 text-red-200 px-3 py-1 rounded-full border border-red-600 fancy-font">
                                        ⚡ Legendary Quest
                                    </span>
                                </div>
                            `}
                            
                            <button data-action="goal.addYearly" data-parent-id="${goal.id}" 
                                class="mt-3 text-xs bg-red-800/50 hover:bg-red-700/60 text-red-200 px-3 py-1 rounded border border-red-600 fancy-font">
                                + Add Yearly Campaign
                            </button>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button data-action="goal.edit" data-goal-type="life" data-goal-id="${goal.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit life goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button data-action="goal.delete" data-goal-type="life" data-goal-id="${goal.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete life goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    /**
     * A single yearly-goal (campaign) card: completion checkbox, escaped title (h4) + optional
     * description, priority badge, linked-parent (life-goal) chips, a "Campaign Progress" line +
     * progress bar, the linked monthly-raids list, and the add-monthly/connections + edit/delete
     * controls. Pure once `linkedMonthly` (monthly goals whose `yearlyGoalId(s)` include this goal
     * — filter stays in the wrapper), `parentNames` (getParentNames over `lifeGoals`), and
     * `escapeHTML` (×4 — title, description, parent chips, monthly titles) are injected; the pure
     * `priority`/`priorityBadge` derivation stays INSIDE. Yearly goals have NO bulk-select, bounty
     * badge, or checklist. Inline `goalManager.*` handlers stay literal; template indentation is
     * preserved byte-for-byte from the original map callback.
     * @param {{ id:any, completed?:boolean, priority?:string, title:any, description?:any, progress?:any }} goal
     * @param {{ linkedMonthly:any[], parentNames:any[], escapeHTML:(s:any)=>string }} deps
     * @returns {string}
     */
    function renderYearlyGoalCardHTML(goal, { linkedMonthly, parentNames, escapeHTML }) {
        const priorityBadge = priorityBadgeHTML(goal.priority);
        return `
                <div class="quest-card bg-gradient-to-br from-purple-900 to-purple-950 p-5 rounded-lg shadow-xl border-3 border-purple-700 goal-item">
                    <div class="flex items-start space-x-4">
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleYearlyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-xl text-amber-300 medieval-title mb-2 ${goal.completed ? 'line-through opacity-60' : ''}">${escapeHTML(goal.title)}</h4>
                            ${goal.description ? `<p class="text-sm text-purple-200/80 mb-2 fancy-font">${escapeHTML(goal.description)}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-red-700/40 text-red-200 px-2 py-1 rounded border border-red-600/40 fancy-font">
                                            🎯 ${escapeHTML(name)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <p class="text-xs text-purple-200 mt-1 fancy-font">Campaign Progress: ${goal.progress}% (${linkedMonthly.filter(m => m.completed).length}/${linkedMonthly.length} monthly raids)</p>
                            <div class="progress-bar w-full bg-purple-950/60 rounded-full h-3 mt-2 border border-purple-700">
                                <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            
                            ${linkedMonthly.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-purple-600/40 space-y-2">
                                    <p class="text-xs text-purple-300 font-semibold mb-2">👑 Linked Monthly Raids:</p>
                                    ${linkedMonthly.map(monthly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${monthly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleMonthlyGoal(${monthly.id}, event)"
                                                class="mr-2">
                                            <span class="${monthly.completed ? 'line-through text-purple-400 opacity-60' : 'text-purple-100'}">${escapeHTML(monthly.title)} (${monthly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="flex gap-2 mt-3">
                                <button data-action="goal.addMonthly" data-parent-id="${goal.id}" 
                                    class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                                    + Add Monthly Raid
                                </button>
                                <button data-action="goal.manageParents" data-scope="yearly" data-goal-id="${goal.id}" 
                                    class="text-xs bg-red-800/50 hover:bg-red-700/60 text-red-200 px-3 py-1 rounded border border-red-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button data-action="goal.edit" data-goal-type="yearly" data-goal-id="${goal.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit yearly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button data-action="goal.delete" data-goal-type="yearly" data-goal-id="${goal.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete yearly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    /**
     * A single monthly-goal (raid) card: the richest goal card — an optional bulk-select checkbox,
     * completion checkbox, escaped title (h4) + optional description, a priority badge AND a
     * royal-bounty badge (both in one row), linked-parent (yearly) chips, a progress bar + weekly
     * tally, the linked weekly-goals list, and the add-weekly/connections + edit/delete controls.
     * Pure once injected: `linkedWeekly` (weekly goals whose `monthlyGoalId(s)` include this goal —
     * filter stays in the wrapper), `parentNames` (getParentNames over `yearlyGoals`), `isSelected`,
     * `bulkSelectionMode`, `isBountyTarget` (predicate for the bounty badge — UNLIKE the weekly
     * card, the badge is actually rendered here), and `escapeHTML` (×4 — title, description, parent
     * chips, weekly titles). The pure `priority`/`priorityBadge` and the `bountyBadge` (via
     * `isBountyTarget`) are derived INSIDE. No checklist. Inline `goalManager.*` handlers stay
     * literal; template indentation preserved byte-for-byte from the original map callback.
     * @param {{ id:any, completed?:boolean, priority?:string, title:any, description?:any, progress?:any }} goal
     * @param {{ linkedWeekly:any[], parentNames:any[], isSelected:boolean, bulkSelectionMode:boolean, isBountyTarget:(type:string,id:any)=>boolean, escapeHTML:(s:any)=>string }} deps
     * @returns {string}
     */
    function renderMonthlyGoalCardHTML(goal, { linkedWeekly, parentNames, isSelected, bulkSelectionMode, isBountyTarget, escapeHTML }) {
        const priorityBadge = priorityBadgeHTML(goal.priority);
        const bountyBadge = isBountyTarget('monthly', goal.id)
            ? '<span class="bounty-badge text-xs px-2 py-1 rounded fancy-font" title="Royal Bounty target — complete for a free chest!">👑 Royal Bounty</span>'
            : '';
        return `
                <div class="quest-card bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-xl shadow-xl border-3 border-blue-700 goal-item ${isSelected ? 'ring-4 ring-purple-500' : ''}">
                    <div class="flex items-start space-x-4">
                        ${bulkSelectionMode ? `
                            <input 
                                type="checkbox" 
                                ${isSelected ? 'checked' : ''}
                                onchange="goalManager.toggleItemSelection(${goal.id}, 'monthly')"
                                class="mt-1 mr-2 w-5 h-5 cursor-pointer">
                        ` : ''}
                        <input 
                            type="checkbox" 
                            ${goal.completed ? 'checked' : ''} 
                            onchange="goalManager.toggleMonthlyGoal(${goal.id}, event)">
                        <div class="flex-1">
                            <h4 class="font-bold text-xl text-amber-300 medieval-title mb-3 ${goal.completed ? 'line-through opacity-60' : ''}">${escapeHTML(goal.title)}</h4>
                            ${goal.description ? `<p class="text-sm text-blue-200/80 mb-2 fancy-font">${escapeHTML(goal.description)}</p>` : ''}
                            <div class="mb-2 flex flex-wrap gap-1">${priorityBadge}${bountyBadge}</div>
                            
                            ${parentNames.length > 0 ? `
                                <div class="mb-2 flex flex-wrap gap-1">
                                    ${parentNames.map(name => `
                                        <span class="text-xs bg-purple-700/40 text-purple-200 px-2 py-1 rounded border border-purple-600/40 fancy-font">
                                            🎯 ${escapeHTML(name)}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="progress-bar w-full bg-blue-950/60 rounded-full h-3 mt-3 border border-blue-700">
                                <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full shadow-lg transition-all duration-500" style="width: ${goal.progress}%"></div>
                            </div>
                            <p class="text-xs text-blue-200 mt-2 fancy-font">${goal.progress}% complete (${linkedWeekly.filter(w => w.completed).length}/${linkedWeekly.length} weekly goals)</p>
                            
                            ${linkedWeekly.length > 0 ? `
                                <div class="mt-3 pl-4 border-l-2 border-blue-600/40 space-y-2">
                                    <p class="text-xs text-blue-300 font-semibold mb-2">🛡️ Linked Weekly Goals:</p>
                                    ${linkedWeekly.map(weekly => `
                                        <div class="flex items-center text-sm">
                                            <input type="checkbox" ${weekly.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleWeeklyGoal(${weekly.id}, event)"
                                                class="mr-2">
                                            <span class="${weekly.completed ? 'line-through text-blue-400 opacity-60' : 'text-blue-100'}">${escapeHTML(weekly.title)} (${weekly.progress}%)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="flex gap-2 mt-3">
                                <button data-action="goal.addWeekly" data-parent-id="${goal.id}" 
                                    class="text-xs bg-blue-800/50 hover:bg-blue-700/60 text-blue-200 px-3 py-1 rounded border border-blue-600 fancy-font">
                                    + Add Weekly Goal
                                </button>
                                <button data-action="goal.manageParents" data-scope="monthly" data-goal-id="${goal.id}" 
                                    class="text-xs bg-purple-800/50 hover:bg-purple-700/60 text-purple-200 px-3 py-1 rounded border border-purple-600 fancy-font">
                                    🔗 Connections
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button data-action="goal.edit" data-goal-type="monthly" data-goal-id="${goal.id}" class="text-blue-400 hover:text-blue-200 text-xl" title="Edit quest" aria-label="Edit monthly goal">
                                <i class="ri-edit-line" aria-hidden="true"></i>
                            </button>
                            <button data-action="goal.delete" data-goal-type="monthly" data-goal-id="${goal.id}" class="text-red-400 hover:text-red-200 text-xl" title="Delete quest" aria-label="Delete monthly goal">
                                <i class="ri-delete-bin-line" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    /**
     * The "This Week's Scheduled Tasks" summary card shown atop renderWeeklyGoals when there are
     * daily tasks due this week that aren't linked to a weekly goal. Lists each task with its
     * weekday abbreviation, an overdue highlight, and a toggle. Pure once `todayStr` (today's
     * YYYY-MM-DD, computed ONCE by the caller from `_cachedToday || getTodayDateString()`) and
     * `escapeHTML` are injected; the per-task weekday/overdue derivation is pure given `todayStr`.
     * The day-row IIFE is preserved as-is (its `const _todayStr = todayStr` just aliases the
     * injected value) so the template stays byte-identical to the original inline block.
     * @param {Array<{ id:any, dueDate:string, completed?:boolean, title:any }>} tasks
     * @param {{ todayStr: string, escapeHTML: (s:any)=>string }} deps
     * @returns {string}
     */
    function renderWeeklyScheduledTasksHTML(tasks, { todayStr, escapeHTML }) {
        return `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-5 rounded-lg shadow-xl border-3 border-green-700 goal-item mb-4">
                    <div class="flex items-start space-x-4">
                        <div class="flex-1">
                            <h4 class="font-bold text-lg text-amber-300 medieval-title mb-2"><i class="ri-calendar-line mr-2"></i>This Week's Scheduled Tasks</h4>
                            <p class="text-xs text-green-200 mb-3 fancy-font">${tasks.filter(t => t.completed).length}/${tasks.length} tasks complete</p>
                            
                            <div class="mt-3 pl-4 border-l-2 border-green-600/40 space-y-2">
                                ${(() => { const _todayStr = todayStr; const _todayDate = new Date(_todayStr + 'T00:00:00'); return tasks.map(task => {
                                    const [year, month, day] = task.dueDate.split('-').map(Number);
                                    const taskDate = new Date(year, month - 1, day);
                                    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][taskDate.getDay()];
                                    const isOverdue = taskDate < _todayDate && task.dueDate !== _todayStr && !task.completed;
                                    return `
                                    <div class="flex items-center text-sm ${isOverdue ? 'bg-red-900/20 p-2 rounded' : ''}">
                                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                            onchange="goalManager.toggleTask(${task.id}, event)"
                                            class="mr-2">
                                        <span class="text-xs text-green-300 mr-2 font-bold">${dayName}</span>
                                        <span class="${task.completed ? 'line-through text-green-400 opacity-60' : isOverdue ? 'text-red-300 font-semibold' : 'text-green-100'}">${escapeHTML(task.title)}</span>
                                        ${isOverdue ? '<span class="ml-2 text-xs text-red-400">⚠️ Overdue</span>' : ''}
                                    </div>
                                `;}).join(''); })()}
                            </div>
                        </div>
                    </div>
                </div>
                `;
    }

    /**
     * The "This Month's Scheduled Tasks" summary card shown atop renderMonthlyGoals when there are
     * daily tasks due this month that aren't linked to a monthly goal. Groups the tasks by calendar
     * week (the `weekGroups` fold, moved in from the wrapper) and renders one mini-panel per week,
     * each listing its tasks with an overdue highlight + toggle. Pure once `todayStr` (today's
     * YYYY-MM-DD, computed ONCE by the caller from `_cachedToday || getTodayDateString()`) and
     * `escapeHTML` are injected; the grouping and per-task overdue derivation are otherwise pure.
     * The day-row IIFE is preserved as-is so the template stays byte-identical to the original.
     * @param {Array<{ id:any, dueDate:string, completed?:boolean, title:any }>} tasks
     * @param {{ todayStr: string, escapeHTML: (s:any)=>string }} deps
     * @returns {string}
     */
    function renderMonthlyScheduledTasksHTML(tasks, { todayStr, escapeHTML }) {
        /** @type {Record<string, Array<{ id:any, dueDate:string, completed?:boolean, title:any }>>} */
        const weekGroups = {};
        tasks.forEach(task => {
            // Parse date as local time to avoid timezone issues
            const [year, month, day] = task.dueDate.split('-').map(Number);
            const taskDate = new Date(year, month - 1, day);
            const startOfWeek = new Date(taskDate);
            startOfWeek.setDate(taskDate.getDate() - taskDate.getDay());
            const weekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;

            if (!weekGroups[weekKey]) {
                weekGroups[weekKey] = [];
            }
            weekGroups[weekKey].push(task);
        });

        return `
                <div class="col-span-2 quest-card bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-xl shadow-xl border-3 border-blue-700 goal-item mb-4">
                    <h4 class="font-bold text-xl text-amber-300 medieval-title mb-3"><i class="ri-calendar-line mr-2"></i>This Month's Scheduled Tasks</h4>
                    <p class="text-xs text-blue-200 mb-3 fancy-font">${tasks.filter(t => t.completed).length}/${tasks.length} tasks complete</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(weekGroups).sort().map(weekKey => {
                            const weekTasks = weekGroups[weekKey];
                            const [wy, wm, wd] = weekKey.split('-').map(Number);
                            const weekStart = new Date(wy, wm - 1, wd);
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `
                            <div class="bg-blue-950/40 p-3 rounded-lg border border-blue-700/30">
                                <p class="text-sm text-blue-300 font-semibold mb-2">${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} Week</p>
                                <div class="space-y-1">
                                    ${(() => { const _todayStr = todayStr; const _todayDate = new Date(_todayStr + 'T00:00:00'); return weekTasks.map(task => {
                                        const [ty, tm, td] = task.dueDate.split('-').map(Number);
                                        const taskDate = new Date(ty, tm - 1, td);
                                        const isOverdue = taskDate < _todayDate && task.dueDate !== _todayStr && !task.completed;
                                        return `
                                        <div class="flex items-center text-xs ${isOverdue ? 'bg-red-900/20 p-1 rounded' : ''}">
                                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                                onchange="goalManager.toggleTask(${task.id}, event)"
                                                class="mr-2">
                                            <span class="${task.completed ? 'line-through text-blue-400 opacity-60' : isOverdue ? 'text-red-300' : 'text-blue-100'}">${escapeHTML(task.title)}</span>
                                        </div>
                                    `;}).join(''); })()}
                                </div>
                            </div>
                        `;}).join('')}
                    </div>
                </div>
                `;
    }

    const TASK_RENDER = Object.freeze({
        getChecklistProgress,
        renderChecklistHTML,
        priorityBadgeHTML,
        renderSideQuestCardHTML,
        renderDailyTaskCardHTML,
        renderWeeklyGoalCardHTML,
        renderLifeGoalCardHTML,
        renderYearlyGoalCardHTML,
        renderMonthlyGoalCardHTML,
        renderWeeklyScheduledTasksHTML,
        renderMonthlyScheduledTasksHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic TASK_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.TASK_RENDER = TASK_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = TASK_RENDER;
})();
