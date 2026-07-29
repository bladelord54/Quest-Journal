// @ts-check
'use strict';
/**
 * daily-board-render.js — pure Daily-board presentation builders (Engineering Roadmap #1).
 *
 * The SEVENTEENTH render module. Holds the two Daily-board surfaces the dashboard paints each render:
 *   - renderDailyQuestBoardHTML({ quests, tracking, dailyQuestPool })
 *       the #daily-quest-board body: one row per rolled daily quest — its pool def supplies the icon (a
 *       green check once claimed), name, and description; the right rail shows "CLAIMED", a "Claim" button
 *       (when completed-but-unclaimed), or the "N XP" reward; a claimed row dims, a completed one gets a
 *       green frame. A quest whose id isn't in the pool renders nothing. Below the rows sits the sweep-bonus
 *       footer: "🏅 Board Swept!" when every quest is claimed, else "<claimed>/3 complete".
 *   - renderWoodenChestHTML({ canClaim, chestStaticHTML })
 *       the #daily-wooden-chest body: when claimable, the bouncing chest + "A free chest awaits" + an
 *       "Open Chest" button; otherwise the dimmed chest + "Already claimed today!" + "Return tomorrow".
 *
 * PURE given their inputs. The board's `def.check(tracking)` calls are pure pool predicates (and the row
 * template doesn't even use the result — it's preserved verbatim from the source); `dailyQuestPool` is the
 * manager's static DAILY_QUEST_POOL catalog. The chest's `canClaim` (the clock-derived
 * `canClaimWoodenChest()`) is computed by the wrapper, and `chestStaticHTML` is the injected
 * `_chestStaticHTML` (<img> when chest art exists, emoji otherwise — the same bound helper reward-render.js
 * takes). The wrappers keep their #daily-quest-board / #daily-wooden-chest lookups + guards, the board's
 * generateDailyQuestBoard() + ensureDailyTracking() side-effects, and the innerHTML writes.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.DAILY_BOARD_RENDER.
 *   - Jest/Node: require('./daily-board-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @param {{
     *   quests: Array<{ id: string, claimed?: boolean, completed?: boolean }>,
     *   tracking: any,
     *   dailyQuestPool: Array<{ id: string, name: string, desc: string, icon: string, xp: number, check: (t: any) => boolean }>,
     * }} deps
     * @returns {string}
     */
    function renderDailyQuestBoardHTML({ quests, tracking, dailyQuestPool }) {
        const allDone = quests.every(q => q.claimed);
        
        let html = quests.map(quest => {
            const def = dailyQuestPool.find(q => q.id === quest.id);
            if (!def) return '';
            const progress = def.check(tracking);
            const statusClass = quest.claimed ? 'opacity-50' : quest.completed ? 'border-green-500/70 bg-green-900/20' : '';
            // statusIcon kept for any external reference; daily quest row
            // below uses Remix Icon SVG for the claimed state to render
            // identically across Android brands.
            const statusIcon = quest.claimed ? '✅' : quest.completed ? '🎉' : '○';
            
            return `
                <div class="flex items-center gap-3 p-3 rounded-lg border-2 border-amber-700/40 ${statusClass} transition-all" data-daily-quest-id="${quest.id}">
                    <span class="text-2xl">${quest.claimed ? '<i class="ri-checkbox-circle-fill text-green-400"></i>' : def.icon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-amber-100 font-bold text-sm fancy-font">${def.name}</div>
                        <div class="text-amber-300/70 text-xs">${def.desc}</div>
                    </div>
                    <div class="flex-shrink-0 text-right">
                        ${quest.claimed ? '<span class="text-green-400 text-xs font-bold">CLAIMED</span>' :
                          quest.completed ? `<button data-action="quest.claimDaily" data-quest-id="${quest.id}" class="btn-ripple bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold fancy-font shadow transition-all hover:scale-105">Claim</button>` :
                          `<span class="text-amber-400/60 text-xs">${def.xp} XP</span>`}
                    </div>
                </div>
            `;
        }).join('');
        
        // Sweep bonus indicator
        if (allDone) {
            html += `<div class="text-center text-green-400 text-sm font-bold fancy-font mt-2">🏅 Board Swept! All bonuses claimed!</div>`;
        } else {
            const claimed = quests.filter(q => q.claimed).length;
            html += `<div class="text-center text-amber-400/60 text-xs mt-2">${claimed}/3 complete — sweep the board for a bonus!</div>`;
        }
        return html;
    }

    /**
     * @param {{ canClaim: boolean, chestStaticHTML: (tier: string, emoji: string, extraClasses?: string) => string }} deps
     * @returns {string}
     */
    function renderWoodenChestHTML({ canClaim, chestStaticHTML }) {
        if (canClaim) {
            return `
                ${chestStaticHTML('wooden', '🪵', 'animate-bounce')}
                <p class="text-amber-200/80 fancy-font text-sm mb-4">A free chest awaits you each day!</p>
                <button data-action="chest.claimWooden" 
                    class="btn-ripple bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white px-6 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-yellow-400/60">
                    <i class="ri-gift-line mr-2"></i>Open Chest
                </button>
            `;
        } else {
            return `
                ${chestStaticHTML('wooden', '🪵', 'opacity-40')}
                <p class="text-amber-200/50 fancy-font text-sm mb-2">Already claimed today!</p>
                <p class="text-amber-400/40 text-xs fancy-font">Return tomorrow for another chest</p>
            `;
        }
    }

    const DAILY_BOARD_RENDER = Object.freeze({ renderDailyQuestBoardHTML, renderWoodenChestHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic DAILY_BOARD_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.DAILY_BOARD_RENDER = DAILY_BOARD_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = DAILY_BOARD_RENDER;
})();
