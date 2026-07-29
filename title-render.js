// @ts-check
'use strict';
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
 * `this.`), so it moves here as the content builder's local const. Both builders are PURE given their
 * inputs: same data -> same string (no clock, no DOM). Faithful to the original, every title/rank name +
 * description is interpolated RAW (this surface never escaped them). The wrapper keeps only the three
 * `getElementById` lookups, the `if (!container) return` guard, the `unlockedTitles.find(currentTitle)`
 * that resolves the active record, the two `innerHTML` writes, and the legacy `#titles-locked-grid` clear.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.TITLE_RENDER.
 *   - Jest/Node: require('./title-render.js') returns the frozen builders via module.exports.
 */
(function () {
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
        const titleCategories = [
            { key: 'early', icon: '⚔️', label: 'Early Game', color: 'green', titles: [
                { id: 'beginner', name: 'The Beginner', description: 'Complete your first task', rarity: 'common' },
                { id: 'habit_starter', name: 'Habit Starter', description: 'Create your first habit', rarity: 'common' },
                { id: 'apprentice', name: 'The Apprentice', description: 'Reach Level 5', rarity: 'common' },
            ]},
            { key: 'tasks', icon: '📜', label: 'Quest Milestones', color: 'amber', titles: [
                { id: 'determined', name: 'The Determined', description: 'Complete 10 tasks', rarity: 'common' },
                { id: 'dedicated', name: 'The Dedicated', description: 'Complete 50 tasks', rarity: 'uncommon' },
                { id: 'seasoned_adventurer', name: 'Seasoned Adventurer', description: 'Complete 100 tasks', rarity: 'rare' },
                { id: 'relentless', name: 'The Relentless', description: 'Complete 250 tasks', rarity: 'epic' },
                { id: 'quest_master', name: 'Quest Master', description: 'Complete 500 tasks', rarity: 'epic' },
                { id: 'grand_master', name: 'Grand Master', description: 'Complete 1000 tasks', rarity: 'legendary' },
            ]},
            { key: 'streaks', icon: '🔥', label: 'Habit Streaks', color: 'orange', titles: [
                { id: 'consistent', name: 'The Consistent', description: 'Maintain a 3-day streak', rarity: 'common' },
                { id: 'disciplined', name: 'The Disciplined', description: 'Maintain a 7-day streak', rarity: 'uncommon' },
                { id: 'devoted', name: 'The Devoted', description: 'Maintain a 14-day streak', rarity: 'rare' },
                { id: 'unstoppable', name: 'The Unstoppable', description: 'Maintain a 30-day streak', rarity: 'epic' },
                { id: 'iron_will', name: 'Iron Will', description: 'Maintain a 60-day streak', rarity: 'epic' },
                { id: 'the_ascended', name: 'The Ascended', description: 'Maintain a 100-day streak', rarity: 'legendary' },
                { id: 'eternal', name: 'The Eternal', description: 'Maintain a 365-day streak', rarity: 'legendary' },
            ]},
            { key: 'levels', icon: '⬆️', label: 'Level Milestones', color: 'blue', titles: [
                { id: 'journeyman', name: 'Journeyman', description: 'Reach Level 10', rarity: 'uncommon' },
                { id: 'veteran', name: 'Veteran', description: 'Reach Level 25', rarity: 'rare' },
                { id: 'elite', name: 'Elite', description: 'Reach Level 50', rarity: 'epic' },
                { id: 'legendary_hero', name: 'Legendary Hero', description: 'Reach Level 100', rarity: 'legendary' },
            ]},
            { key: 'goals', icon: '🏰', label: 'Goal Conqueror', color: 'purple', titles: [
                // Life goals are major arcs even at count=1, so they skew
                // higher than raw count suggests. Yearly goal = legendary
                // because it represents a full annual commitment.
                { id: 'legendary', name: 'The Legendary', description: 'Complete a life goal', rarity: 'epic' },
                { id: 'dream_chaser', name: 'Dream Chaser', description: 'Complete 5 life goals', rarity: 'legendary' },
                { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Complete 10 weekly goals', rarity: 'epic' },
                { id: 'monthly_champion', name: 'Monthly Champion', description: 'Complete 6 monthly goals', rarity: 'epic' },
                { id: 'visionary', name: 'The Visionary', description: 'Complete a yearly goal', rarity: 'legendary' },
            ]},
            { key: 'wealth', icon: '💰', label: 'Wealth & Treasury', color: 'yellow', titles: [
                { id: 'wealthy', name: 'The Wealthy', description: 'Accumulate 1,000 gold', rarity: 'uncommon' },
                { id: 'rich', name: 'The Rich', description: 'Accumulate 10,000 gold', rarity: 'epic' },
                { id: 'tycoon', name: 'Tycoon', description: 'Accumulate 100,000 gold', rarity: 'legendary' },
                { id: 'treasure_hunter', name: 'Treasure Hunter', description: 'Open your first chest', rarity: 'common' },
                { id: 'loot_seeker', name: 'Loot Seeker', description: 'Open 25 chests', rarity: 'rare' },
                { id: 'chest_master', name: 'Chest Master', description: 'Open 100 chests', rarity: 'legendary' },
            ]},
            { key: 'arcane', icon: '✨', label: 'Arcane Mastery', color: 'indigo', titles: [
                { id: 'focused', name: 'The Focused', description: 'Complete your first focus session', rarity: 'common' },
                { id: 'zen_master', name: 'Zen Master', description: 'Complete 25 focus sessions', rarity: 'rare' },
                { id: 'meditation_guru', name: 'Meditation Guru', description: 'Complete 100 focus sessions', rarity: 'legendary' },
                { id: 'spellcaster', name: 'Spellcaster', description: 'Cast your first spell', rarity: 'common' },
                { id: 'mage', name: 'Mage', description: 'Cast 25 spells', rarity: 'rare' },
                { id: 'archmage', name: 'Archmage', description: 'Cast 50 spells', rarity: 'epic' },
            ]},
            { key: 'combat', icon: '🐉', label: 'Combat & Companions', color: 'red', titles: [
                { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first boss', rarity: 'common' },
                { id: 'champion', name: 'Champion', description: 'Defeat 10 bosses', rarity: 'rare' },
                { id: 'dragon_slayer', name: 'Dragon Slayer', description: 'Defeat 50 bosses', rarity: 'legendary' },
                // Companions drop from chests, so first companion is
                // onboarding tier; collecting all 10 is the capstone.
                { id: 'beast_friend', name: 'Beast Friend', description: 'Obtain your first companion', rarity: 'common' },
                { id: 'beast_master', name: 'Beast Master', description: 'Collect 5 companions', rarity: 'rare' },
                { id: 'menagerie_keeper', name: 'Menagerie Keeper', description: 'Collect 10 companions', rarity: 'legendary' },
            ]},
            { key: 'login', icon: '👑', label: 'Login Streak Milestones', color: 'yellow', titles: [
                { id: 'centurion', name: '🌟 Centurion', description: '100-day login streak', rarity: 'epic' },
                { id: 'mythic_warrior', name: '🏆 Mythic Warrior', description: '365-day login streak', rarity: 'legendary' },
            ]},
        ];

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

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic TITLE_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.TITLE_RENDER = TITLE_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = TITLE_RENDER;
})();
