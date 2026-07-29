// @ts-check
'use strict';
/**
 * spell-render.js — pure spellbook presentation builders (Engineering Roadmap #1).
 *
 * The FOURTH render module (after boss-render.js, task-render.js, companion-render.js),
 * covering the Spellbook surface split across renderActiveSpells + renderSpellCollection.
 * Extracted as the 33rd slice. Six pure `input → HTML-string` builders:
 *   - renderActiveSpellCardHTML     — one card in the "Active Spells" row (rarity chrome +
 *     the caller-computed, time-sensitive `timeDisplay`).
 *   - renderFreeSpellsHeaderHTML / renderPremiumSpellsHeaderHTML — the two section banners.
 *   - renderFreeSpellCardHTML / renderPremiumSpellCardHTML — the collection cards. They are
 *     SIMILAR but deliberately kept as TWO builders because the premium card diverges: an
 *     `opacity-60` lock tint on the frame, a lock icon by the nameplate, and an extra leading
 *     "Unlock Premium" action branch ahead of the shared active / cast / empty states.
 *
 * The collection-grid + active-spells EMPTY states are NOT here — they delegate to the class's
 * shared `_renderEmptyState` helper, so renderActiveSpells/renderSpellCollection keep that call.
 *
 * DRY win: the spellbook's rarity→Tailwind-color word map lived as TWO identical inline copies
 * (one per method); it is now the single SPELL_RARITY_COLORS const below, and each builder
 * applies its own historical fallback ('purple' for the active row, 'gray' for the collection).
 *
 * Cross-cutting instance couplings are INJECTED (not moved), matching the other render modules:
 *   - `rarityNameplate`     — this._rarityNameplate (also used by companions + loot preview),
 *   - `overchargeButtonHTML`— this._overchargeButtonHTML (a Wizard-capstone perk probe that
 *     stays a tested class method),
 *   - the premium banner string (this.getPremiumBannerHTML(...)) is passed in pre-rendered.
 *
 * Dual-environment, no bundler (mirrors companion-render.js / task-render.js):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.SPELL_RENDER.
 *   - Jest/Node: require('./spell-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @typedef {Object} SpellDef
     * @property {string} id
     * @property {string} rarity
     * @property {string} icon
     * @property {string} name
     * @property {string} description
     */

    // The spellbook rarity→color word map (formerly duplicated inline in both
    // renderActiveSpells and renderSpellCollection). Index signature so @ts-check
    // is happy indexing it with an arbitrary spell.rarity string.
    /** @type {Record<string, string>} */
    const SPELL_RARITY_COLORS = {
        common: 'gray',
        uncommon: 'green',
        rare: 'blue',
        epic: 'purple',
        legendary: 'yellow',
    };

    /**
     * One card in the "Active Spells" row. `timeDisplay` is computed by the caller because it is
     * time-sensitive (Date.now()); everything else is pure. Byte-faithful to the original inline
     * template — note the active row's rarity fallback is 'purple' (not the collection's 'gray').
     * @param {SpellDef} spell
     * @param {{ timeDisplay: string, rarityNameplate: (rarity: string) => string }} deps
     * @returns {string}
     */
    function renderActiveSpellCardHTML(spell, { timeDisplay, rarityNameplate }) {
        const color = SPELL_RARITY_COLORS[spell.rarity] || 'purple';
        return `
                    <div data-rarity="${spell.rarity}" class="quest-card rarity-frame bg-gradient-to-br from-${color}-800 to-${color}-900 p-5 rounded-xl shadow-2xl active-spell">
                        <div class="text-5xl mb-2 text-center rune-text">${spell.icon}</div>
                        <h4 class="text-xl font-bold text-${color}-200 medieval-title mb-2 text-center">${spell.name}</h4>
                        <div class="text-center mb-2">${rarityNameplate(spell.rarity)}</div>
                        <p class="text-${color}-300 text-sm mb-3 text-center">${spell.description}</p>
                        <div class="bg-${color}-950 rounded-lg px-3 py-2 text-center">
                            <p class="text-${color}-200 text-sm font-bold">${timeDisplay}</p>
                        </div>
                    </div>
                `;
    }

    /**
     * The "Free Spells" section header. Byte-faithful to the original inline template.
     * @param {number} freeCount
     * @returns {string}
     */
    function renderFreeSpellsHeaderHTML(freeCount) {
        return `
            <div class="w-full mb-2">
                <h3 class="text-lg font-bold text-green-300 medieval-title flex items-center justify-center md:justify-start gap-2">
                    <span>✨</span> Free Spells <span class="text-sm font-normal text-green-400">(${freeCount} available)</span>
                </h3>
            </div>
        `;
    }

    /**
     * One free-spell collection card. Derives its rarity color internally (fallback 'gray').
     * Byte-faithful to the original inline template; the ownership/active/empty action block is
     * unchanged. `overchargeButtonHTML` is injected (the tested Wizard-capstone class helper).
     * @param {SpellDef} spell
     * @param {{
     *   charges: number,
     *   isActive: boolean,
     *   rarityNameplate: (rarity: string) => string,
     *   overchargeButtonHTML: (spell: SpellDef, charges: number) => string,
     * }} deps
     * @returns {string}
     */
    function renderFreeSpellCardHTML(spell, { charges, isActive, rarityNameplate, overchargeButtonHTML }) {
        const color = SPELL_RARITY_COLORS[spell.rarity] || 'gray';
        return `
                <div data-rarity="${spell.rarity}" class="quest-card rarity-frame bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-xl shadow-xl">
                    <div class="text-5xl mb-2 text-center">${spell.icon}</div>
                    <h4 class="text-lg font-bold text-${color}-200 medieval-title mb-2 text-center">${spell.name}</h4>
                    <div class="text-center mb-2">${rarityNameplate(spell.rarity)}</div>
                    <p class="text-${color}-300 text-sm mb-3 text-center">${spell.description}</p>
                    <div class="text-center mb-3">
                        <span class="text-${color}-200 text-sm font-bold">⚡ Charges: ${charges}</span>
                    </div>
                    ${isActive ? `
                        <div class="bg-green-500/20 border-2 border-green-400 rounded-lg px-3 py-2 text-green-300 text-sm font-bold text-center">
                            ✓ Active
                        </div>
                    ` : charges > 0 ? `
                        <button data-action="spell.cast" data-spell-id="${spell.id}" 
                            class="w-full bg-${color}-700 hover:bg-${color}-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            Cast Spell
                        </button>
                        ${overchargeButtonHTML(spell, charges)}
                    ` : `
                        <div class="bg-${color}-950 border-2 border-${color}-800 rounded-lg px-3 py-2 text-${color}-500 text-sm font-bold text-center">
                            Open chests for charges
                        </div>
                    `}
                </div>
            `;
    }

    /**
     * The "Premium Spells" section header. The premium upsell banner is passed in pre-rendered
     * (this.getPremiumBannerHTML(...)). Byte-faithful to the original inline template.
     * @param {number} premiumCount
     * @param {string} bannerHTML
     * @returns {string}
     */
    function renderPremiumSpellsHeaderHTML(premiumCount, bannerHTML) {
        return `
            <div class="w-full mt-6 mb-2">
                ${bannerHTML}
                <h3 class="text-lg font-bold text-yellow-300 medieval-title flex items-center justify-center md:justify-start gap-2">
                    <span>👑</span> Premium Spells <span class="text-sm font-normal text-yellow-400">(${premiumCount} spells)</span>
                </h3>
            </div>
        `;
    }

    /**
     * One premium-spell collection card. Same rarity color derivation (fallback 'gray') as the
     * free card, but the frame gains an `opacity-60` tint + a lock icon when premium-locked, and
     * the action block leads with an "Unlock Premium" branch before the shared active/cast/empty
     * states. Byte-faithful to the original inline template.
     * @param {SpellDef} spell
     * @param {{
     *   charges: number,
     *   isActive: boolean,
     *   isPremiumLocked: boolean,
     *   rarityNameplate: (rarity: string) => string,
     *   overchargeButtonHTML: (spell: SpellDef, charges: number) => string,
     * }} deps
     * @returns {string}
     */
    function renderPremiumSpellCardHTML(spell, { charges, isActive, isPremiumLocked, rarityNameplate, overchargeButtonHTML }) {
        const color = SPELL_RARITY_COLORS[spell.rarity] || 'gray';
        return `
                <div data-rarity="${spell.rarity}" class="quest-card rarity-frame bg-gradient-to-br from-${color}-900 to-${color}-950 p-5 rounded-xl shadow-xl ${isPremiumLocked ? 'opacity-60' : ''}">
                    <div class="text-5xl mb-2 text-center">${spell.icon}</div>
                    <h4 class="text-lg font-bold text-${color}-200 medieval-title mb-2 text-center">${spell.name}</h4>
                    <div class="text-center mb-2 flex items-center justify-center gap-2">
                        ${rarityNameplate(spell.rarity)}
                        ${isPremiumLocked ? '<i class="ri-lock-line text-yellow-500/80" aria-label="Premium locked"></i>' : ''}
                    </div>
                    <p class="text-${color}-300 text-sm mb-3 text-center">${spell.description}</p>
                    <div class="text-center mb-3">
                        <span class="text-${color}-200 text-sm font-bold">⚡ Charges: ${charges}</span>
                    </div>
                    ${isPremiumLocked ? `
                        <button data-action="premium.showModal" 
                            class="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            👑 Unlock Premium
                        </button>
                    ` : isActive ? `
                        <div class="bg-green-500/20 border-2 border-green-400 rounded-lg px-3 py-2 text-green-300 text-sm font-bold text-center">
                            ✓ Active
                        </div>
                    ` : charges > 0 ? `
                        <button data-action="spell.cast" data-spell-id="${spell.id}" 
                            class="w-full bg-${color}-700 hover:bg-${color}-600 text-white px-4 py-2 rounded-lg font-bold fancy-font shadow-lg transition-transform hover:scale-105">
                            Cast Spell
                        </button>
                        ${overchargeButtonHTML(spell, charges)}
                    ` : `
                        <div class="bg-${color}-950 border-2 border-${color}-800 rounded-lg px-3 py-2 text-${color}-500 text-sm font-bold text-center">
                            Open chests for charges
                        </div>
                    `}
                </div>
            `;
    }

    const SPELL_RENDER = Object.freeze({
        renderActiveSpellCardHTML,
        renderFreeSpellsHeaderHTML,
        renderFreeSpellCardHTML,
        renderPremiumSpellsHeaderHTML,
        renderPremiumSpellCardHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic SPELL_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.SPELL_RENDER = SPELL_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = SPELL_RENDER;
})();
