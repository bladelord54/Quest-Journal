// @ts-check
'use strict';
/**
 * companion-render.js — pure companion-den presentation builders (Engineering Roadmap #1).
 *
 * The THIRD render module (after boss-render.js and task-render.js), covering the Companion
 * Den surface (`renderCompanionDen`). Extracted across two slices:
 *   - 31st: the per-companion COLLECTION CARD (the grid of owned companions) — the richest,
 *     most drift-prone piece, carrying the Ranger Twin-Bond two-slot logic, rarity-colour
 *     derivation, and catalog name/icon/description fallbacks.
 *   - 32nd: the remaining den templates — the active-companion display (empty egg-card vs the
 *     equipped-companion card) and the undiscovered grid (all-discovered trophy vs the locked
 *     ??? mystery cards). NOTE the collection-grid empty state is NOT here: it uses the class's
 *     shared _renderEmptyState helper.
 * renderCompanionDen is now a thin wrapper: gather data (active companion, sorted collection,
 * locked list) + inject deps, delegate each section's markup here, then write innerHTML.
 *
 * The card is pure once its instance couplings are INJECTED via deps:
 *   - `companionDefs`      — the frozen companion catalog (this.getCompanionDefinitions()),
 *   - `rarityColors`/`defaultColors` — the companion {bg,border,text} colour map + fallback
 *     (kept in the wrapper because the active-companion display shares the same copy),
 *   - `activeCompanionId` / `activeCompanionId2` — the equipped slot-1 / slot-2 companion ids,
 *   - `twinBond`           — whether the Ranger second-companion perk is active,
 *   - `rarityNameplate`    — this._rarityNameplate, a CROSS-CUTTING helper (also used by the
 *     spellbook and loot preview) so it is injected, not moved.
 *
 * Dual-environment, no bundler (mirrors task-render.js / boss-render.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.COMPANION_RENDER. goal-manager.js captures it and delegates.
 *   - Jest/Node: `require('./companion-render.js')` returns the object via module.exports.
 */

/**
 * One card in the owned-companion collection grid. Byte-faithful to the original inline
 * `sortedCompanions.map(comp => …)` callback in renderCompanionDen. Derives the rarity
 * colours, active/second-slot state, catalog fallbacks, and the footer (single click-to-equip
 * action, or the Twin-Bond two-slot buttons) INSIDE, then returns the card markup.
 * @param {{ type:any, rarity?:string, icon?:string, name?:string, description?:string }} comp
 * @param {{
 *   companionDefs: Record<string, { icon?:string, name?:string, description?:string, rarity?:string }>,
 *   rarityColors: Record<string, { bg:string, border?:string, text:string }>,
 *   defaultColors: { bg:string, border?:string, text:string },
 *   activeCompanionId: any,
 *   activeCompanionId2: any,
 *   twinBond: boolean,
 *   rarityNameplate: (rarity:any) => string,
 * }} deps
 * @returns {string}
 */
function renderCompanionCollectionCardHTML(comp, { companionDefs, rarityColors, defaultColors, activeCompanionId, activeCompanionId2, twinBond, rarityNameplate }) {
    const cColors = rarityColors[/** @type {string} */ (comp.rarity)] || defaultColors;
    const isActive = comp.type === activeCompanionId;
    const isSecond = twinBond && comp.type === activeCompanionId2;
    const compIcon = comp.icon || companionDefs[comp.type]?.icon || '🐾';
    const compName = comp.name || companionDefs[comp.type]?.name || 'Companion';
    const compDesc = comp.description || companionDefs[comp.type]?.description || '';
    const ring = isActive ? 'ring-2 ring-green-400' : (isSecond ? 'ring-2 ring-sky-400' : '');
    const slot1Cls = isActive ? 'bg-green-600 text-white' : 'bg-stone-700 text-stone-200 hover:bg-stone-600';
    const slot2Cls = isSecond ? 'bg-sky-600 text-white' : (isActive ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-stone-700 text-stone-200 hover:bg-stone-600');
    const cardOnclick = twinBond ? '' : `data-action="companion.setActive" data-companion-type="${comp.type}"`;
    const cardCursor = twinBond ? '' : 'cursor-pointer hover:scale-105';
    const footer = twinBond
        ? `<div class="flex gap-1 mt-2"><button data-action="companion.setActive" data-companion-type="${comp.type}" class="flex-1 text-xs px-1 py-1 rounded font-bold ${slot1Cls}">${isActive ? '✓ Slot 1' : 'Slot 1'}</button><button data-action="companion.setSecond" data-companion-type="${isSecond ? '' : comp.type}" ${isActive ? 'disabled' : ''} class="flex-1 text-xs px-1 py-1 rounded font-bold ${slot2Cls}">${isSecond ? '✓ Slot 2' : 'Slot 2'}</button></div>`
        : (isActive ? '<div class="text-xs text-green-400 mt-2 font-bold">✓ ACTIVE</div>' : '<div class="text-xs text-gray-400 mt-2">Click to equip</div>');

    return `
                                <div data-rarity="${comp.rarity || 'rare'}" class="quest-card rarity-frame bg-gradient-to-br from-${cColors.bg}-900 to-${cColors.bg}-950 p-5 rounded-lg ${ring} text-center ${cardCursor} transition-transform"
                                     ${cardOnclick}>
                                    <div class="text-5xl mb-2">${compIcon}</div>
                                    <h5 class="font-bold text-amber-200 text-sm mb-1">${compName}</h5>
                                    <div class="my-1">${rarityNameplate(comp.rarity || 'rare')}</div>
                                    <p class="text-xs text-${cColors.text}-300 mt-1">${compDesc}</p>
                                    ${footer}
                                </div>
                            `;
}

/**
 * The active-companion panel's EMPTY state: the egg card shown when no companion is owned
 * or equipped. Byte-faithful to the original inline template in renderCompanionDen.
 * @returns {string}
 */
function renderNoActiveCompanionHTML() {
    return `
                <div class="quest-card bg-gradient-to-br from-green-900 to-green-950 p-8 rounded-xl shadow-2xl border-4 border-green-600 text-center">
                    <div class="text-8xl mb-4">🥚</div>
                    <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-3">No Companions Yet</h4>
                    <p class="text-green-200 fancy-font text-lg mb-4">Open treasure chests to discover loyal companions!</p>
                    <p class="text-green-300 text-sm">Each chest tier has different companions with unique bonuses!</p>
                    <button data-action="nav.switchView" data-view="rewards" class="mt-4 px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg font-bold fancy-font transition-all border-2 border-amber-500">
                        <i class="ri-treasure-map-line mr-2"></i>Visit Treasury
                    </button>
                </div>
            `;
}

/**
 * The active-companion panel's POPULATED state: the equipped companion's card (icon, rarity
 * nameplate, ACTIVE badge, name, description, level). Byte-faithful to the original inline
 * template; the rarity colours, description/icon catalog fallbacks are derived INSIDE.
 * @param {{ type:any, rarity?:string, name?:any, description?:string, icon?:string, level?:number }} activeCompanion
 * @param {{
 *   rarityColors: Record<string, { bg:string, border?:string, text:string }>,
 *   defaultColors: { bg:string, border?:string, text:string },
 *   companionDefs: Record<string, { icon?:string, description?:string }>,
 *   rarityNameplate: (rarity:any) => string,
 * }} deps
 * @returns {string}
 */
function renderActiveCompanionHTML(activeCompanion, { rarityColors, defaultColors, companionDefs, rarityNameplate }) {
    const colors = rarityColors[/** @type {string} */ (activeCompanion.rarity)] || defaultColors;
    const description = activeCompanion.description || companionDefs[activeCompanion.type]?.description || 'Loyal companion';
    const icon = activeCompanion.icon || companionDefs[activeCompanion.type]?.icon || '🐾';
    return `
                <div data-rarity="${activeCompanion.rarity || 'rare'}" class="quest-card rarity-frame bg-gradient-to-br from-${colors.bg}-900 to-${colors.bg}-950 p-6 rounded-xl shadow-2xl">
                    <div class="flex items-center gap-6">
                        <div class="text-8xl">${icon}</div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                ${rarityNameplate(activeCompanion.rarity || 'rare')}
                                <span class="text-xs px-2 py-1 rounded bg-green-700 text-green-200 font-bold">ACTIVE</span>
                            </div>
                            <h4 class="text-2xl font-bold text-amber-300 medieval-title mb-1">${activeCompanion.name}</h4>
                            <p class="text-${colors.text}-200 fancy-font text-lg mb-2">${description}</p>
                            <p class="text-${colors.text}-300 text-sm">Level ${activeCompanion.level || 1}</p>
                        </div>
                    </div>
                </div>
            `;
}

/**
 * The undiscovered-grid's ALL-DISCOVERED state: the trophy card shown when every showable
 * companion is owned. Byte-faithful to the original inline template.
 * @returns {string}
 */
function renderAllCompanionsDiscoveredHTML() {
    return `
                    <div class="text-center py-6">
                        <div class="text-4xl mb-2">🏆</div>
                        <p class="text-amber-300 fancy-font font-bold text-lg">All companions discovered!</p>
                        <p class="text-amber-200 text-sm">You've collected every companion. Legendary!</p>
                    </div>
                `;
}

/**
 * The undiscovered-grid's POPULATED state: the ??? mystery cards for companions not yet owned
 * (the wrapper pre-filters out owned + Ranger-exclusive types). Byte-faithful to the original
 * inline `lockedCompanions.map(...)` template; rarity colours derived per entry INSIDE.
 * @param {Array<[string, { rarity?:string }]>} lockedCompanions
 * @param {{
 *   rarityColors: Record<string, { bg:string, text:string }>,
 *   defaultColors: { bg:string, text:string },
 * }} deps
 * @returns {string}
 */
function renderUndiscoveredCompanionsGridHTML(lockedCompanions, { rarityColors, defaultColors }) {
    return `
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        ${lockedCompanions.map(([type, def]) => {
                            const cColors = rarityColors[/** @type {string} */ (def.rarity)] || defaultColors;
                            return `
                                <div class="quest-card bg-gradient-to-br from-stone-800 to-stone-900 p-5 rounded-lg border-2 border-stone-600 text-center opacity-60">
                                    <div class="text-5xl mb-2">❓</div>
                                    <h5 class="font-bold text-stone-400 text-sm mb-1">???</h5>
                                    <span class="text-xs px-2 py-0.5 rounded bg-${cColors.bg}-800 text-${cColors.text}-300 uppercase">${def.rarity}</span>
                                    <p class="text-xs text-stone-500 mt-1">Found in treasure chests</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
}

const COMPANION_RENDER = Object.freeze({
    renderCompanionCollectionCardHTML,
    renderNoActiveCompanionHTML,
    renderActiveCompanionHTML,
    renderAllCompanionsDiscoveredHTML,
    renderUndiscoveredCompanionsGridHTML,
});


// Jest / Node

export default COMPANION_RENDER;
