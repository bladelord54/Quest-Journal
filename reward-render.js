// @ts-check
'use strict';
/**
 * reward-render.js — pure Treasury / rewards presentation builders (Engineering Roadmap #1).
 *
 * The TWELFTH render module (after boss-, task-, companion-, spell-, class-, analytics-, quest-chain-,
 * enchantment-, dashboard-, player-hud-, and title-render.js). Opens the Rewards surface with the
 * Treasury tab body that `renderTreasureChests()` writes to #treasure-chests-container:
 *   - renderTreasureChestsHTML({ canClaimWooden, goldCoins, treasureChests, chestStaticHTML })
 *       the free Daily Wooden Chest card on top (FREE badge + claim/claimed button, driven by
 *       canClaimWooden) followed by the four purchasable chest tiles (bronze/silver/gold/royal) with
 *       rarity-frame chrome, affordability gating against goldCoins, and a per-type "Opened N times"
 *       count derived from treasureChests.
 *
 * The static chestTypes catalog was defined INLINE in renderTreasureChests (no `this.`), so it moves
 * here as the builder's local const. The builder is PURE given its inputs: same data -> same string (no
 * clock, no DOM). The clock-dependent daily-claim flag (canClaimWooden) and the goldCoins/treasureChests
 * state come in as params; the chest visual (<img> when art exists, emoji otherwise) is produced by the
 * injected `chestStaticHTML` — the manager's `_chestStaticHTML`, which reads the chest-art config and
 * STAYS on the class (renderWoodenChest shares it). The wrapper keeps only its `getElementById` lookup,
 * the `if (!container) return` guard, and the terminal `innerHTML` write.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.REWARD_RENDER.
 *   - Jest/Node: require('./reward-render.js') returns the frozen builders via module.exports.
 */

/**
 * @param {{
 *   canClaimWooden: boolean,
 *   goldCoins: number,
 *   treasureChests: Array<{ type: string }>,
 *   chestStaticHTML: (tier: string, emoji: string, extraClasses?: string) => string,
 * }} deps
 * @returns {string}
 */
function renderTreasureChestsHTML({ canClaimWooden, goldCoins, treasureChests, chestStaticHTML }) {
    const chestTypes = [
        { type: 'bronze', name: 'Bronze Chest', cost: 200, color: 'orange', icon: '🎁', rarity: 'uncommon' },
        { type: 'silver', name: 'Silver Chest', cost: 600, color: 'gray', icon: '💎', rarity: 'rare' },
        { type: 'gold', name: 'Gold Chest', cost: 1500, color: 'yellow', icon: '👑', rarity: 'epic' },
        { type: 'royal', name: 'Royal Chest', cost: 5000, color: 'purple', icon: '⭐', rarity: 'legendary' }
    ];

    // Daily Free Wooden Chest at the top
    const woodenChestHTML = `
            <div data-rarity="common" class="quest-card rarity-frame bg-gradient-to-br from-yellow-900/80 to-amber-950/80 p-5 rounded-xl shadow-xl border-3 border-yellow-600 text-center relative overflow-hidden">
                ${canClaimWooden ? '<div class="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full fancy-font animate-pulse">FREE</div>' : ''}
                ${chestStaticHTML('wooden', '🪵', canClaimWooden ? 'animate-bounce' : 'opacity-40')}
                <h4 class="text-xl font-bold text-yellow-300 medieval-title mb-2">Wooden Chest</h4>
                <p class="text-yellow-200 text-lg font-bold mb-2">Free Daily!</p>
                <button data-action="chest.claimWooden" 
                    class="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white px-4 py-3 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105 ${!canClaimWooden ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${!canClaimWooden ? 'disabled' : ''}>
                    ${canClaimWooden ? '🪵 Open Chest!' : '<i class="ri-checkbox-circle-fill mr-1"></i>Claimed Today'}
                </button>
            </div>
        `;

    return woodenChestHTML + chestTypes.map(chest => {
        const canAfford = goldCoins >= chest.cost;
        const timesOpened = treasureChests.filter(c => c.type === chest.type).length;
        
        return `
                <div data-rarity="${chest.rarity}" class="quest-card rarity-frame bg-gradient-to-br from-${chest.color}-900 to-${chest.color}-950 p-5 rounded-xl shadow-xl border-3 border-${chest.color}-600 text-center">
                    ${chestStaticHTML(chest.type, chest.icon)}
                    <h4 class="text-xl font-bold text-amber-300 medieval-title mb-2">${chest.name}</h4>
                    <p class="text-${chest.color}-200 text-lg font-bold mb-2">${chest.cost} Gold</p>
                    ${timesOpened > 0 ? `
                        <p class="text-${chest.color}-300 text-xs mb-2 fancy-font">Opened ${timesOpened} time${timesOpened !== 1 ? 's' : ''}</p>
                    ` : ''}
                    <button data-action="chest.openTreasure" data-chest-type="${chest.type}" 
                        class="w-full bg-gradient-to-r from-${chest.color}-600 to-${chest.color}-700 hover:from-${chest.color}-700 hover:to-${chest.color}-800 text-white px-4 py-3 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105 ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? '🎁 Open Chest!' : `🔒 Need ${chest.cost - goldCoins} More Gold`}
                    </button>
                </div>
            `;
    }).join('');
}

const REWARD_RENDER = Object.freeze({
    renderTreasureChestsHTML,
});


// Node / Jest

export default REWARD_RENDER;
