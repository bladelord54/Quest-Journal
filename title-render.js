// @ts-check
'use strict';
import TITLE_DEFINITIONS from './title-definitions.js';
/**
 * title-render.js — pure Title Hall presentation builders (Engineering Roadmap #1).
 *
 * The ELEVENTH render module (after boss-, task-, companion-, spell-, class-, analytics-,
 * quest-chain-, enchantment-, dashboard-, and player-hud-render.js). Covers the WHOLE Title Hall
 * surface that `renderTitleHall()` orchestrates across its two target elements:
 *   - renderActiveTitleDisplayHTML(activeTitle)
 *       the #active-title-display card — the equipped-title card when a title is active, else the
 *       "No Title Equipped" empty-state. `activeTitle` is the resolved unlocked record (or undefined).
 *   - renderTitleHallContentHTML({ unlockedTitles, currentTitle, level, titleStyle, levelTitles })
 *       the #titles-container body — the collection progress summary, one collapsible section per
 *       achievement-title category (earned cards + locked ??? cards, each with rarity chrome), and the
 *       Level Ranks section (the auto-earned L1..Ln rank chain from LEVEL_TITLES[style], driven by level).
 *
 * The presentational title catalog (`titleCategories`) was defined INLINE in renderTitleHall (no
 * `this.`); it now reads the shared TITLE_DEFINITIONS.categories (Roadmap #1, 79th slice) so the gallery
 * and checkTitleUnlocks share one source of truth and cannot drift. Both builders are PURE given their
 * inputs: same data -> same string (no clock, no DOM). Faithful to the original, every title/rank name +
 * description is interpolated RAW (this surface never escaped them). The wrapper keeps only the three
 * `getElementById` lookups, the `if (!container) return` guard, the `unlockedTitles.find(currentTitle)`
 * that resolves the active record, the two `innerHTML` writes, and the legacy `#titles-locked-grid` clear.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.TITLE_RENDER.
 *   - Jest/Node: require('./title-render.js') returns the frozen builders via module.exports.
 */

// Single source of truth for the achievement-title catalog (Roadmap #1, 79th slice): the same
// frozen TITLE_DEFINITIONS.categories that checkTitleUnlocks derives unlocks from. The gallery only
// reads presentational fields (key/icon/label/color + each title's id/name/description/rarity) and
// ignores the threshold `type`/`target`, so the two lists can no longer drift.

/**
 * The #active-title-display card. When a title is equipped (activeTitle resolved from unlockedTitles
 * by currentTitle) it renders the gold "EQUIPPED" card; otherwise the "No Title Equipped" empty-state.
 * Byte-faithful to the original inline templates.
 * @param {{ name?: string, description?: string }} [activeTitle]
 * @returns {string}
 */
function renderActiveTitleDisplayHTML(activeTitle) {
        if (activeTitle) {
            return `
                    <div class="quest-card bg-gradient-to-br from-yellow-900 to-yellow-950 p-6 rounded-xl shadow-2xl border-4 border-yellow-500">
                        <div class="flex items-center gap-6">
                            <div class="text-8xl">👑</div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs px-2 py-1 rounded bg-yellow-700 text-yellow-200 uppercase font-bold">EQUIPPED</span>
                                </div>
                                <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-1">"${activeTitle.name}"</h4>
                                <p class="text-yellow-200 fancy-font text-lg">${activeTitle.description}</p>
                            </div>
                        </div>
                    </div>
                `;
        } else {
            return `
                    <div class="quest-card bg-gradient-to-br from-purple-900 to-purple-950 p-8 rounded-xl shadow-2xl border-4 border-purple-600 text-center">
                        <div class="text-8xl mb-4">🎖️</div>
                        <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-3">No Title Equipped</h4>
                        <p class="text-purple-200 fancy-font text-lg">Earn titles by completing achievements, then equip one below!</p>
                    </div>
                `;
        }
}

/**
 * The #titles-container body: the collection progress summary, one collapsible section per
 * achievement-title category (earned + locked ??? cards, each with rarity chrome), and the Level
 * Ranks section (the auto-earned L1..Ln chain from levelTitles[style], driven by level). Byte-faithful
 * to the original inline template concatenation; the titleCategories catalog is this builder's local
 * const (it was inline, purely presentational). Names/descriptions interpolated RAW (faithful).
 * @param {{
 *   unlockedTitles: Array<{ id: string, name?: string, description?: string }>,
 *   currentTitle: string | null,
 *   level: number,
 *   titleStyle: string,
 *   levelTitles: Record<string, string[]>,
 * }} deps
 * @returns {string}
 */
function renderTitleHallContentHTML({ unlockedTitles, currentTitle, level, titleStyle, levelTitles }) {
    const titleCategories = /** @type {Array<{ key: string, icon: string, label: string, color: string, titles: Array<{ id: string, name: string, description: string, rarity: string }> }>} */ (TITLE_DEFINITIONS.categories);

    const unlockedIds = new Set(unlockedTitles.map(t => t.id));
    const unlockedMap = /** @type {Record<string, any>} */ ({});
    unlockedTitles.forEach(t => { unlockedMap[t.id] = t; });
    const totalUnlocked = unlockedTitles.length;
    const totalTitles = titleCategories.reduce((sum, cat) => sum + cat.titles.length, 0);

    // Progress summary
    const progressPct = totalTitles > 0 ? Math.round((totalUnlocked / totalTitles) * 100) : 0;
    let html = `
            <div class="mb-4 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-amber-300 fancy-font text-sm font-bold">Title Collection</span>
                    <span class="text-amber-200/70 text-xs fancy-font">${totalUnlocked} / ${totalTitles} (${progressPct}%)</span>
                </div>
                <div class="progress-bar w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style="width:${progressPct}%"></div>
                </div>
            </div>
        `;

    // Render each category as a collapsible section
    titleCategories.forEach(cat => {
        const earned = cat.titles.filter(t => unlockedIds.has(t.id));
        const locked = cat.titles.filter(t => !unlockedIds.has(t.id));
        const catComplete = locked.length === 0;
        const catPct = Math.round((earned.length / cat.titles.length) * 100);
        // Default open if category has any earned titles, or is Early Game
        const defaultOpen = earned.length > 0 || cat.key === 'early';

        html += `
                <div class="mb-3">
                    <button onclick="this.parentElement.querySelector('.title-cat-body').classList.toggle('hidden');this.querySelector('.title-cat-arrow').classList.toggle('rotate-90')"
                        class="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 transition-all cursor-pointer text-left">
                        <span class="text-2xl">${cat.icon}</span>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-${cat.color}-300 font-bold fancy-font text-sm">${cat.label}</span>
                                ${catComplete ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-700/50 text-green-300 font-bold">✓ COMPLETE</span>' : ''}
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="progress-bar flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div class="h-full bg-${cat.color}-500 rounded-full transition-all" style="width:${catPct}%"></div>
                                </div>
                                <span class="text-gray-400 text-xs">${earned.length}/${cat.titles.length}</span>
                            </div>
                        </div>
                        <i class="ri-arrow-right-s-line text-gray-400 text-lg title-cat-arrow transition-transform ${defaultOpen ? 'rotate-90' : ''}"></i>
                    </button>
                    <div class="title-cat-body ${defaultOpen ? '' : 'hidden'} mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pl-2">
            `;

        // Earned titles in this category
        earned.forEach(t => {
            const titleData = unlockedMap[t.id] || t;
            const active = currentTitle === t.id;
            const rarity = t.rarity || 'common';
            html += `
                    <div data-rarity="${rarity}" class="rarity-frame bg-gradient-to-br from-purple-900/80 to-purple-950/80 p-4 rounded-xl shadow-lg border-2 ${active ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-purple-600/60'} text-center">
                        <div class="text-3xl mb-1">🎖️</div>
                        <h5 class="font-bold text-amber-300 text-sm medieval-title mb-1">"${titleData.name}"</h5>
                        <p class="text-purple-300 text-xs mb-2 italic">${t.description}</p>
                        ${active ? `
                            <div class="bg-yellow-500/20 border border-yellow-400/50 rounded-lg px-2 py-1 text-yellow-300 text-xs font-bold">✓ Equipped</div>
                        ` : `
                            <button data-action="title.select" data-title-id="${t.id}" 
                                class="w-full bg-purple-700/80 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold fancy-font transition-all hover:scale-105">
                                Equip
                            </button>
                        `}
                    </div>
                `;
        });

        // Locked titles in this category — same rarity chrome so the
        // shape of the collection is visible even before unlock
        // (player can see at a glance which slots are the rare/epic/
        // legendary capstones in this category).
        locked.forEach(t => {
            const rarity = t.rarity || 'common';
            html += `
                    <div data-rarity="${rarity}" class="rarity-frame bg-gradient-to-br from-stone-800/60 to-stone-900/60 p-4 rounded-xl border-2 border-stone-700/40 text-center opacity-50">
                        <div class="text-3xl mb-1">🔒</div>
                        <h5 class="font-bold text-stone-400 text-sm mb-1">???</h5>
                        <p class="text-xs text-stone-500">${t.description}</p>
                    </div>
                `;
        });

        html += `</div></div>`;
    });

    // === LEVEL RANKS (L1–L50) ===
    // These are the auto-earned rank chain from getLevelTitle()
    // (Wanderer → … → Paragon), distinct from the achievement titles
    // above — they're driven by `level`, not `unlockedTitles`.
    // Surfaced here so players can see the full progression and which
    // ranks they've reached. Style-aware so the feminine chain shows
    // its gendered counterparts.
    const rankStyle = titleStyle === 'feminine' ? 'feminine' : 'masculine';
    const ranks = levelTitles[rankStyle] || [];
    const earnedRankCount = Math.min(level, ranks.length);
    const currentRankIdx = Math.min(Math.max(level - 1, 0), ranks.length - 1);
    const rankPct = ranks.length > 0 ? Math.round((earnedRankCount / ranks.length) * 100) : 0;
    const ranksComplete = earnedRankCount >= ranks.length;

    html += `
            <div class="mb-3">
                <button onclick="this.parentElement.querySelector('.title-cat-body').classList.toggle('hidden');this.querySelector('.title-cat-arrow').classList.toggle('rotate-90')"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 transition-all cursor-pointer text-left">
                    <span class="text-2xl">🎚️</span>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-cyan-300 font-bold fancy-font text-sm">Level Ranks</span>
                            ${ranksComplete ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-700/50 text-green-300 font-bold">✓ COMPLETE</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="progress-bar flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div class="h-full bg-cyan-500 rounded-full transition-all" style="width:${rankPct}%"></div>
                            </div>
                            <span class="text-gray-400 text-xs">${earnedRankCount}/${ranks.length}</span>
                        </div>
                    </div>
                    <i class="ri-arrow-right-s-line text-gray-400 text-lg title-cat-arrow transition-transform"></i>
                </button>
                <div class="title-cat-body hidden mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-2">
                    ${ranks.map((name, i) => {
                        const lvl = i + 1;
                        const earned = level >= lvl;
                        const isCurrent = i === currentRankIdx;
                        if (earned) {
                            return `
                                <div class="rounded-lg px-2 py-1.5 text-center border ${isCurrent ? 'bg-cyan-600/30 border-cyan-400 ring-2 ring-cyan-400/40' : 'bg-cyan-900/30 border-cyan-700/40'}">
                                    <div class="text-[10px] text-cyan-400/70 font-bold uppercase tracking-wide">Lv ${lvl}${isCurrent ? ' • Current' : ''}</div>
                                    <div class="text-xs font-bold text-cyan-200 medieval-title title-rank-name truncate">${name}</div>
                                </div>
                            `;
                        }
                        return `
                            <div class="rounded-lg px-2 py-1.5 text-center border bg-stone-800/40 border-stone-700/30 opacity-50">
                                <div class="text-[10px] text-stone-500 font-bold uppercase tracking-wide">Lv ${lvl}</div>
                                <div class="text-xs font-semibold text-stone-400 truncate">${name}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

    return html;
}

const TITLE_RENDER = Object.freeze({
    renderActiveTitleDisplayHTML,
    renderTitleHallContentHTML,
});


// Node / Jest

export default TITLE_RENDER;
