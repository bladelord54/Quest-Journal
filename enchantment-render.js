// @ts-check
'use strict';
/**
 * enchantment-render.js — pure Enchantments presentation builders (Engineering Roadmap #1).
 *
 * The EIGHTH render module (after boss-, task-, companion-, spell-, class-, analytics-, and
 * quest-chain-render.js). Covers the WHOLE Enchantments view — the two columns that
 * `renderEnchantments()` orchestrates:
 *   - renderActiveEnchantmentsHTML(activeEnchantments, { now, enchantmentDefinitions })
 *       the in-effect enchantment cards (icon, name, time-remaining label, countdown progress bar).
 *       Empty-state when NO enchantments are active. Time math is pure-but-clock-dependent, so the
 *       wall clock is INJECTED as `now` (the wrapper passes `Date.now()`); the width falls back to the
 *       `enchantmentDefinitions[id].duration` catalog entry (then a literal 180m) when a card carries
 *       no `totalDuration`.
 *   - renderEnchantmentShopHTML(enchantmentDefinitions, { focusCrystals, isPremium, hasActiveEnchantment })
 *       the shop grid (free enchantments first, then premium), each a locked "Unlock" teaser (premium
 *       while not `isPremium`) or a live Purchase/✓-Active/🔒-Need-crystals card. Returns ONLY the
 *       cards; the wrapper prepends the impure `getPremiumBannerHTML(...)`.
 *
 * The domain objects are dynamic runtime shapes (active-enchantment instances + the
 * `enchantmentDefinitions` catalog), so the builders take them as `any` and are documented in prose
 * rather than over-typed. They are PURE given their injected deps: same data + same `now` +
 * same `hasActiveEnchantment` predicate → same string.
 *
 * What STAYS on the class (impure, injected or wrapped):
 *   - `checkExpiredEnchantments()` — a state-pruning side-effect; the active wrapper calls it BEFORE
 *     delegating, so the builder only ever sees live cards.
 *   - `Date.now()` — injected as `now` (the sole clock read moves to the wrapper).
 *   - `hasActiveEnchantment(effect)` — a predicate over `activeEnchantments`; injected bound so the
 *     shop builder can flag ✓ Active without reaching into instance state.
 *   - `getPremiumBannerHTML(msg)` — reads `isPremium`; prepended in the wrapper, never in the builder.
 *
 * Byte-faithful: each builder is the original inline method body moved verbatim (templates copied to
 * the byte, including trailing spaces + whitespace-only lines), with only the impure plumbing changed —
 * `this.<state>` → injected params, `Date.now()` → `now`, and `container.innerHTML = X` → `return X`
 * (the shop's `container.innerHTML = getPremiumBannerHTML(...) + html` → `return html`, banner rejoined
 * in the wrapper). The wrappers keep the `getElementById` + guard + the impure bits above.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.ENCHANTMENT_RENDER.
 *   - Jest/Node: require('./enchantment-render.js') returns the frozen builders via module.exports.
 */

/**
 * Active (in-effect) enchantment cards.
 * @param {any[]} activeEnchantments  `this.activeEnchantments` — each has id, icon, name,
 *   expiresAt, and optionally totalDuration.
 * @param {{ now: number, enchantmentDefinitions: Record<string, any> }} deps
 *   now = the wall clock (`Date.now()`), injected for purity; enchantmentDefinitions = the catalog
 *   keyed by id (its `.duration` is the progress-bar denominator fallback).
 * @returns {string}
 */
function renderActiveEnchantmentsHTML(activeEnchantments, { now, enchantmentDefinitions }) {
    if (activeEnchantments.length === 0) {
        return `
                <div class="col-span-3 text-center py-8 text-pink-200">
                    <div class="text-6xl mb-3 opacity-30">✨</div>
                    <p class="fancy-font">No active enchantments. Purchase some below!</p>
                </div>
            `;
    }
    
    const html = activeEnchantments.map(ench => {
        const timeRemaining = ench.expiresAt - now;
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        const hoursRemaining = Math.floor(minutesRemaining / 60);
        const mins = minutesRemaining % 60;
        
        let timeDisplay = '';
        if (hoursRemaining > 0) {
            timeDisplay = `${hoursRemaining}h ${mins}m remaining`;
        } else {
            timeDisplay = `${mins}m remaining`;
        }
        
        return `
                <div class="bg-gradient-to-br from-pink-900 to-purple-900 p-4 rounded-lg border-3 border-pink-600 shadow-xl animate-pulse-slow">
                    <div class="text-4xl text-center mb-2">${ench.icon}</div>
                    <h4 class="text-lg font-bold text-pink-200 medieval-title text-center mb-2">${ench.name}</h4>
                    <div class="text-xs text-pink-300 fancy-font text-center">
                        ⏱️ ${timeDisplay}
                    </div>
                    <div class="mt-2 w-full bg-pink-950 rounded-full h-2">
                        <div class="bg-gradient-to-r from-pink-500 to-purple-400 h-2 rounded-full transition-all" 
                            style="width: ${Math.max(0, Math.min(100, (timeRemaining / (ench.totalDuration || (enchantmentDefinitions[ench.id]?.duration || 180) * 60000)) * 100))}%"></div>
                    </div>
                </div>
            `;
    }).join('');
    
    return html;
}

/**
 * Enchantment shop cards (free first, then premium). Returns ONLY the cards — the caller prepends
 * the premium banner.
 * @param {Record<string, any>} enchantmentDefinitions  `this.enchantmentDefinitions` catalog.
 * @param {{ focusCrystals: number, isPremium: boolean, hasActiveEnchantment: (effect: string) => boolean }} deps
 *   focusCrystals = the player's crystal balance (affordability); isPremium = premium unlock flag
 *   (gates the locked teaser); hasActiveEnchantment = bound predicate flagging ✓ Active cards.
 * @returns {string}
 */
function renderEnchantmentShopHTML(enchantmentDefinitions, { focusCrystals, isPremium, hasActiveEnchantment }) {
    const enchantments = Object.values(enchantmentDefinitions);
    
    // Sort: free enchantments first, then premium
    const sorted = [...enchantments].sort((a, b) => (a.premium === b.premium) ? 0 : a.premium ? 1 : -1);
    
    const html = sorted.map(ench => {
        const isActive = hasActiveEnchantment(ench.effect);
        const canAfford = focusCrystals >= ench.cost;
        const isLocked = ench.premium && !isPremium;
        
        if (isLocked) {
            return `
                    <div class="bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-6 rounded-xl border-3 border-gray-600/50 shadow-xl relative overflow-hidden opacity-60">
                        <div class="absolute top-2 right-2 bg-yellow-600/90 text-black text-xs font-bold px-2 py-1 rounded-full fancy-font">
                            <i class="ri-vip-crown-2-fill mr-1"></i>Premium
                        </div>
                        <div class="text-5xl text-center mb-3 grayscale">${ench.icon}</div>
                        <h4 class="text-xl font-bold text-gray-400 medieval-title text-center mb-2">${ench.name}</h4>
                        <p class="text-sm text-gray-500 fancy-font text-center mb-4">${ench.description}</p>
                        
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-sm text-gray-500 fancy-font">
                                💎 ${ench.cost} Crystals
                            </div>
                            <div class="text-sm text-gray-500 fancy-font">
                                ⏱️ ${ench.duration >= 60 ? Math.floor(ench.duration / 60) + 'h' : ench.duration + 'm'}
                            </div>
                        </div>
                        
                        <button data-action="premium.showModal" 
                            class="bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-black w-full py-3 rounded-lg font-bold fancy-font shadow-lg transition-all">
                            <i class="ri-vip-crown-2-fill mr-1"></i> Unlock
                        </button>
                    </div>
                `;
        }
        
        return `
                <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border-3 ${isActive ? 'border-green-600' : 'border-amber-600'} shadow-xl ${isActive ? 'opacity-50' : ''}">
                    <div class="text-5xl text-center mb-3">${ench.icon}</div>
                    <h4 class="text-xl font-bold text-amber-300 medieval-title text-center mb-2">${ench.name}</h4>
                    <p class="text-sm text-amber-200 fancy-font text-center mb-4">${ench.description}</p>
                    
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-sm text-cyan-300 fancy-font">
                            💎 ${ench.cost} Crystals
                        </div>
                        <div class="text-sm text-purple-300 fancy-font">
                            ⏱️ ${ench.duration >= 60 ? Math.floor(ench.duration / 60) + 'h' : ench.duration + 'm'}
                        </div>
                    </div>
                    
                    <button 
                        data-action="premium.enchant" data-id="${ench.id}" 
                        class="${isActive ? 'bg-gray-600 cursor-not-allowed' : (canAfford ? 'bg-pink-600 hover:bg-pink-500' : 'bg-gray-600 cursor-not-allowed')} text-white w-full py-3 rounded-lg font-bold fancy-font shadow-lg transition-all"
                        ${isActive || !canAfford ? 'disabled' : ''}>
                        ${isActive ? '✓ Active' : (canAfford ? '✨ Purchase' : '🔒 Need ' + ench.cost + ' 💎')}
                    </button>
                </div>
            `;
    }).join('');
    
    return html;
}

const ENCHANTMENT_RENDER = Object.freeze({
    renderActiveEnchantmentsHTML,
    renderEnchantmentShopHTML,
});


// Node / Jest

export default ENCHANTMENT_RENDER;
