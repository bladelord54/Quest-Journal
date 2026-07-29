// @ts-check
'use strict';
/**
 * badge-render.js — pure Badges/Achievements-panel presentation builder (Engineering Roadmap #1).
 *
 * The FOURTEENTH render module (after boss-, task-, companion-, spell-, class-, analytics-, quest-chain-,
 * enchantment-, dashboard-, player-hud-, title-, reward-, and theme-render.js). Holds the one Badges surface:
 *   - renderBadgesHTML({ achievements, progress, badges })
 *       the full #badges-container body `renderBadges()` writes: an "Unlocked" header + one amber rarity-frame
 *       card per earned achievement (icon, name, description, and a "✓ <unlock date>" line), then an "In Progress"
 *       header + the locked achievements sorted closest-to-completion, each a dimmed rarity-frame card with a
 *       progress bar whose color steps through gray/orange/yellow/green by percent and a "current/target" label
 *       (a "(N to go!)" hint at >=75%, otherwise "(P%)"). If nothing qualifies, the "Complete quests to unlock
 *       badges!" empty state.
 *
 * PURE given its inputs: same { achievements, progress, badges } -> same string (no clock, no DOM). The unlock
 * date is `new Date(badge.unlockedAt).toLocaleDateString()` — deterministic for a given record + environment
 * (it reads the record's timestamp, never "now"). The achievement catalog (achievements) + the progress map
 * (keyed by achievement `type`) are computed by the wrapper via getAchievementDefinitions() /
 * getAchievementProgress(); the earned-badge records (badges) are the manager's `this.badges`. The wrapper keeps
 * its container lookup + guard + the terminal `innerHTML` write.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.BADGE_RENDER.
 *   - Jest/Node: require('./badge-render.js') returns the frozen builder via module.exports.
 */
(function () {
    /**
     * @param {{
     *   achievements: Array<{ id: string, type: string, target: number, rarity?: string, icon: string, name: string, description: string }>,
     *   progress: Record<string, number>,
     *   badges: Array<{ id: string, unlockedAt: string | number | Date }>,
     * }} deps
     * @returns {string}
     */
    function renderBadgesHTML({ achievements, progress, badges }) {
        const unlockedIds = badges.map(b => b.id);
        
        // Separate unlocked and locked achievements
        const unlocked = achievements.filter(a => unlockedIds.includes(a.id));
        const locked = achievements.filter(a => !unlockedIds.includes(a.id));
        
        // Sort locked by closest to completion
        locked.sort((a, b) => {
            const progressA = (progress[a.type] || 0) / a.target;
            const progressB = (progress[b.type] || 0) / b.target;
            return progressB - progressA;
        });
        
        let html = '';
        
        // Unlocked badges section
        if (unlocked.length > 0) {
            html += '<div class="col-span-2 md:col-span-4 mb-2"><h4 class="text-amber-300 font-bold fancy-font text-sm"><i class="ri-trophy-line mr-1.5"></i>Unlocked</h4></div>';
            html += unlocked.map(achievement => {
                const badge = badges.find(b => b.id === achievement.id);
                return `
                    <div data-rarity="${achievement.rarity || 'common'}" class="quest-card rarity-frame bg-amber-950/60 p-5 rounded-lg border-2 border-amber-500 text-center">
                        <div class="text-4xl mb-2">${achievement.icon}</div>
                        <div class="text-amber-300 font-bold fancy-font text-sm">${achievement.name}</div>
                        <div class="text-amber-200 text-xs mt-1">${achievement.description}</div>
                        <div class="text-green-400 text-xs mt-2">✓ ${badge ? new Date(badge.unlockedAt).toLocaleDateString() : 'Unlocked'}</div>
                    </div>
                `;
            }).join('');
        }
        
        // In-progress achievements section
        if (locked.length > 0) {
            html += '<div class="col-span-2 md:col-span-4 mt-4 mb-2"><h4 class="text-amber-300 font-bold fancy-font text-sm"><i class="ri-line-chart-line mr-1.5"></i>In Progress</h4></div>';
            html += locked.map(achievement => {
                const current = progress[achievement.type] || 0;
                const target = achievement.target;
                const percent = Math.min(100, Math.round((current / target) * 100));
                const remaining = target - current;
                
                // Color based on progress
                let progressColor = 'bg-gray-600';
                let borderColor = 'border-gray-600';
                if (percent >= 75) {
                    progressColor = 'bg-green-500';
                    borderColor = 'border-green-600';
                } else if (percent >= 50) {
                    progressColor = 'bg-yellow-500';
                    borderColor = 'border-yellow-600';
                } else if (percent >= 25) {
                    progressColor = 'bg-orange-500';
                    borderColor = 'border-orange-600';
                }
                
                return `
                    <div data-rarity="${achievement.rarity || 'common'}" class="quest-card rarity-frame bg-gray-900/60 p-5 rounded-lg border-2 ${borderColor} text-center opacity-80 hover:opacity-100">
                        <div class="text-3xl mb-2 grayscale-[50%]">${achievement.icon}</div>
                        <div class="text-gray-300 font-bold fancy-font text-sm">${achievement.name}</div>
                        <div class="text-gray-400 text-xs mt-1">${achievement.description}</div>
                        <div class="mt-2">
                            <div class="progress-bar w-full bg-gray-700 rounded-full h-2">
                                <div class="${progressColor} h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                            </div>
                            <div class="text-xs mt-1 ${percent >= 75 ? 'text-green-400' : 'text-gray-400'}">
                                ${current}/${target} ${percent >= 75 ? `(${remaining} to go!)` : `(${percent}%)`}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        if (html === '') {
            html = '<p class="col-span-2 md:col-span-4 text-center text-amber-200 py-8 fancy-font">Complete quests to unlock badges!</p>';
        }

        return html;
    }

    const BADGE_RENDER = Object.freeze({ renderBadgesHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic BADGE_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.BADGE_RENDER = BADGE_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = BADGE_RENDER;
})();
