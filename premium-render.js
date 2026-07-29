// @ts-check
'use strict';
/**
 * premium-render.js — pure Premium-surface presentation builders (Engineering Roadmap #1).
 *
 * The TWENTY-FIRST render module. Holds the two Premium markup builders:
 *   - renderPremiumCardHTML({ isPremium, purchaseDate })
 *       the #premium-content Tools-tab card. When isPremium: the "Premium Adventurer" thank-you view
 *       (a "Member since: <purchaseDate>" line + a 4-perk grid). Otherwise: the free upgrade prompt
 *       (a 6-perk grid + a $4.99 "Go Premium" CTA).
 *   - renderPremiumBannerHTML(message, isPremium)
 *       the small dismissible gradient upsell banner several surfaces prepend (spellbook, themes, boss
 *       arena, enchantments shop). Returns '' for premium users; otherwise a "Go Premium" pill with the
 *       surface-specific message. The class keeps a thin getPremiumBannerHTML(message) delegator
 *       (forwarding this.isPremium) so its five call sites are unchanged.
 *
 * Both are PURE. renderPremiumCard's wrapper keeps the getElementById lookup + guard and the
 * locale-dependent new Date(premiumPurchaseDate).toLocaleDateString() (or 'Unknown') that formats
 * purchaseDate before delegating.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.PREMIUM_RENDER.
 *   - Jest/Node: require('./premium-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @param {{ isPremium: boolean, purchaseDate: string }} state
     * @returns {string}
     */
    function renderPremiumCardHTML({ isPremium, purchaseDate }) {
        if (isPremium) {
            // Premium user view
            return `
                <div class="text-center">
                    <div class="text-6xl mb-4">👑</div>
                    <h3 class="text-2xl font-bold text-yellow-200 medieval-title mb-2">Premium Adventurer</h3>
                    <p class="text-yellow-100 fancy-font mb-4">Thank you for your support!</p>
                    <div class="bg-black/20 rounded-lg p-4 mb-4">
                        <p class="text-yellow-200 text-sm fancy-font">Member since: ${purchaseDate}</p>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🐉</div>
                            <div class="text-xs text-yellow-200">Boss Battles</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🎨</div>
                            <div class="text-xs text-yellow-200">All Themes</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">🏆</div>
                            <div class="text-xs text-yellow-200">Achievements</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-2xl mb-1">📊</div>
                            <div class="text-xs text-yellow-200">Stats</div>
                        </div>
                    </div>
                    
                </div>
            `;
        }
        // Free user view - show upgrade prompt
        return `
                <div class="flex flex-col md:flex-row gap-6 items-center">
                    <div class="flex-1">
                        <h3 class="text-2xl font-bold text-yellow-200 medieval-title mb-2 flex items-center">
                            <i class="ri-vip-crown-2-line mr-2"></i> Upgrade to Premium
                        </h3>
                        <p class="text-yellow-100 fancy-font mb-4 text-sm">Unlock the full power of your Life Quest Journal!</p>
                        
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🐉</span> Boss Battles
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🎨</span> 8+ Themes
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">🏆</span> Achievements
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">📖</span> Full Spellbook
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">✨</span> Enchantments
                            </div>
                            <div class="flex items-center gap-2 text-yellow-100 text-sm">
                                <span class="text-lg">📊</span> Advanced Stats
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center">
                        <div class="text-5xl mb-2">👑</div>
                        <div class="text-3xl font-bold text-yellow-200 medieval-title mb-1">$4.99</div>
                        <div class="text-yellow-300 text-sm fancy-font mb-3">One-time purchase</div>
                        <button data-action="premium.showModal" 
                            class="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black px-8 py-3 rounded-lg font-bold shadow-lg transition-all hover:scale-105 border-2 border-yellow-400">
                            <i class="ri-vip-crown-2-fill mr-2"></i> Go Premium
                        </button>
                    </div>
                </div>
            `;
    }

    /**
     * @param {string} message
     * @param {boolean} isPremium
     * @returns {string}
     */
    function renderPremiumBannerHTML(message, isPremium) {
        if (isPremium) return '';
        return `
            <div class="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border border-yellow-600/50 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 cursor-pointer hover:border-yellow-500/70 transition-colors"
                 data-action="premium.showModal">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-xl flex-shrink-0">👑</span>
                    <span class="text-yellow-200 text-sm fancy-font truncate">${message}</span>
                </div>
                <button class="bg-gradient-to-r from-yellow-500 to-amber-600 text-black px-3 py-1.5 rounded-lg font-bold text-xs fancy-font flex-shrink-0 shadow-lg hover:from-yellow-400 hover:to-amber-500 transition-all">
                    Go Premium
                </button>
            </div>
        `;
    }

    const PREMIUM_RENDER = Object.freeze({ renderPremiumCardHTML, renderPremiumBannerHTML });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic PREMIUM_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.PREMIUM_RENDER = PREMIUM_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = PREMIUM_RENDER;
})();
