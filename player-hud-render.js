// @ts-check
'use strict';
/**
 * player-hud-render.js — pure Player-HUD presentation builders (Engineering Roadmap #1).
 *
 * The TENTH render module (after boss-, task-, companion-, spell-, class-, analytics-,
 * quest-chain-, enchantment-, and dashboard-render.js). Covers the avatar-HUD "active effect"
 * surfaces — the arcane-tab active-buffs bar + the avatar sigil orbit — PLUS the two markup blocks
 * embedded in the character-sheet `renderPlayerPanel`. Every wrapper reduces to a `getElementById` + guard
 * + `innerHTML` write once its markup moves here.
 *
 * The 42nd slice extracted the two CLEANEST, most self-contained HUD builders; the 43rd added the two
 * `renderPlayerPanel`-embedded blocks, completing the module. All four:
 *   - renderActiveBuffsSummaryHTML(activeSpells, activeEnchantments, { spellDefinitions, now })
 *       the arcane-tab active-buffs bar (#active-buffs-container). Emits one purple badge per active
 *       spell (icon + name + an optional "(Nm)" / "(Until triggered)" time hint) followed by one pink
 *       badge per still-live enchantment, or a "No active buffs" empty-state. Clock-dependent only
 *       through the injected `now` (spells read `now`; enchantments compare `new Date(expiresAt)` to
 *       `new Date(now)`), so the builder is deterministic given its inputs. NOTE: faithful to the
 *       original, the spell/enchantment names are interpolated RAW (this surface never escaped them).
 *   - renderActiveSpellSigilsHTML(activeSpells, activeEnchantments, { spellDefinitions, enchantmentDefinitions, now, escapeHTML })
 *       the avatar sigil-orbit bubbles (shared by #player-sigil-orbit + #panel-sigil-orbit). Filters to
 *       truly-active effects (spells: `expiresAt === -1 || > now`; enchantments: `> now`), distributes up
 *       to 7 sigils evenly around 360° (rarity-tinted for spells, a unified crystal tint for enchantments),
 *       and appends a "+N" overflow bubble in the last slot when there are more than 7. Returns '' when
 *       nothing is active. The `title` is the ONLY escaped field (matches the original `escapeHTML(name)`).
 *   - renderPanelCompanionHTML(active, { companionDefinitions })
 *       the character-sheet panel's active-companion portrait (#panel-companion) — the `.companion-bubble`
 *       emoji + name + description with catalog fallbacks. Rendered only when a companion is active (the
 *       wrapper keeps the `getActiveCompanion()` + `if (active)` guard).
 *   - renderPanelActiveBuffsHTML(activeSpells, activeEnchantments, { spellDefinitions, now })
 *       the character-sheet panel's compact active-buffs row (#panel-active-buffs) — small spell/enchantment
 *       chips (no time hints) or a "No active buffs" empty-state. A sibling to the arcane-tab bar above but
 *       with smaller chips + a different empty-state colour; enchantments filtered live via the injected `now`.
 *
 * These four builders are PURE given their inputs: same data + same injected deps → same string. The
 * wrappers keep every impure bit: `renderActiveBuffsSummary` keeps the `#active-buffs-container` lookup +
 * the terminal `innerHTML` write; `renderActiveSpellSigils` keeps the two orbit lookups, the empty-clear
 * early-return, the change-detect `innerHTML` writes (skip rewrite when unchanged so the spawn-fade
 * animation isn't restarted), and the post-render `requestAnimationFrame(_syncSigilCounterRotation)`;
 * `renderPlayerPanel` keeps its `#panel-companion` + `#panel-active-buffs` lookups + guards (companion also
 * keeps its `getActiveCompanion()` + `if (active)` gate) and the two terminal `innerHTML` writes.
 *
 * (`renderXPDisplay` STAYS on the class — it is a textContent/style/setAttribute/createElement DOM
 * mutator, not a markup builder, so it is NOT an extraction target. With the four builders above, every
 * `input → HTML-string` block of the Player-HUD surface now lives here; `renderPlayerPanel`'s remaining body
 * is textContent/className DOM mutation + inventory/analytics counts + a `renderClassPanel()` call.)
 *
 * Byte-faithful: each builder is the original inline method body moved verbatim (templates + string
 * concatenations copied to the byte), with only the impure plumbing changed — `this.<state>` → params,
 * `this.<helper>` → injected fn, `Date.now()`/`new Date()` → the injected `now`, and the terminal DOM
 * writes folded back into the wrapper (buffs returns the string; sigils returns the bubble HTML or '').
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.PLAYER_HUD_RENDER.
 *   - Jest/Node: require('./player-hud-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * The arcane-tab active-buffs bar — one badge per active spell (with an optional time hint) then one
     * per still-live enchantment, or a "No active buffs" empty-state.
     * @param {any[]} activeSpells  `this.activeSpells` — each { spellId, expiresAt } (expiresAt = epoch ms, or -1 = until-triggered).
     * @param {any[]} activeEnchantments  `this.activeEnchantments` — each { name, icon?, expiresAt } (expiresAt = ISO/parseable date).
     * @param {{ spellDefinitions: Record<string, any>, now: number }} deps
     *   spellDefinitions = the spell catalog (icon/name lookup); now = the wall clock (`Date.now()`), injected
     *   so the "(Nm)" remaining-minutes hints are deterministic.
     * @returns {string}
     */
    function renderActiveBuffsSummaryHTML(activeSpells, activeEnchantments, { spellDefinitions, now }) {
        /** @type {string[]} */ const buffs = [];
        
        // Collect active spells
        if (activeSpells && activeSpells.length > 0) {
            activeSpells.forEach(active => {
                const spell = spellDefinitions ? spellDefinitions[active.spellId] : null;
                if (spell) {
                    const remaining = (active.expiresAt && active.expiresAt !== -1) ? Math.max(0, Math.ceil((active.expiresAt - now) / 60000)) : null;
                    const timeText = remaining !== null ? `${remaining}m` : (active.expiresAt === -1 ? 'Until triggered' : '');
                    buffs.push(`
                        <div class="flex items-center gap-1.5 bg-purple-800/50 border border-purple-600/50 rounded-lg px-3 py-1.5 text-sm">
                            <span class="text-lg">${spell.icon}</span>
                            <span class="text-purple-200 fancy-font">${spell.name}</span>
                            ${timeText ? `<span class="text-purple-400 text-xs">(${timeText})</span>` : ''}
                        </div>
                    `);
                }
            });
        }
        
        // Collect active enchantments
        if (activeEnchantments && activeEnchantments.length > 0) {
            activeEnchantments.forEach(active => {
                const remaining = Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - now) / 60000));
                if (remaining > 0) {
                    buffs.push(`
                        <div class="flex items-center gap-1.5 bg-pink-800/50 border border-pink-600/50 rounded-lg px-3 py-1.5 text-sm">
                            <span class="text-lg">${active.icon || '🔮'}</span>
                            <span class="text-pink-200 fancy-font">${active.name}</span>
                            <span class="text-pink-400 text-xs">(${remaining}m)</span>
                        </div>
                    `);
                }
            });
        }
        
        if (buffs.length === 0) {
            return '<span class="text-purple-400/60 fancy-font text-sm">No active buffs</span>';
        } else {
            return buffs.join('');
        }
    }

    /**
     * The avatar sigil-orbit bubbles (shared markup for the mini + panel orbits). Filters to truly-active
     * effects, caps at 7 visible sigils + a "+N" overflow bubble, and distributes them evenly around 360°.
     * @param {any[]} activeSpells  `this.activeSpells` — each { spellId, expiresAt }.
     * @param {any[]} activeEnchantments  `this.activeEnchantments` — each { id, name?, icon?, expiresAt }.
     * @param {{ spellDefinitions: Record<string, any>, enchantmentDefinitions: Record<string, any>, now: number, escapeHTML: (s: any) => string }} deps
     *   spellDefinitions/enchantmentDefinitions = catalogs for rarity/icon/name fallbacks; now = the wall clock
     *   used for the active-effect filter; escapeHTML = the title-attribute escaper (the only escaped field).
     * @returns {string}  the bubble HTML, or '' when no effect is active.
     */
    function renderActiveSpellSigilsHTML(activeSpells, activeEnchantments, { spellDefinitions, enchantmentDefinitions, now, escapeHTML }) {
        /** @type {Array<{ cls: string, icon: string, name: string }>} */ const orbitItems = [];
        (activeSpells || []).forEach(activeSpell => {
            if (!(activeSpell.expiresAt === -1 || activeSpell.expiresAt > now)) return;
            const spellDef = spellDefinitions[activeSpell.spellId];
            if (!spellDef) return;  // Defensive: skip if definition vanished
            orbitItems.push({
                cls: `avatar-sigil--${spellDef.rarity || 'common'}`,
                icon: spellDef.icon || '✨',
                name: spellDef.name || 'Active spell'
            });
        });
        (activeEnchantments || []).forEach(activeEnch => {
            if (!(activeEnch.expiresAt > now)) return;
            const def = enchantmentDefinitions[activeEnch.id] || {};
            orbitItems.push({
                cls: 'avatar-sigil--enchantment',
                icon: activeEnch.icon || def.icon || '🔮',
                name: activeEnch.name || def.name || 'Active enchantment'
            });
        });

        // Visual cap: 7 individual sigils + 1 overflow badge = 8 slots.
        // The badge only appears if there are >7 active effects.
        const MAX_VISIBLE_SIGILS = 7;
        const visible = orbitItems.slice(0, MAX_VISIBLE_SIGILS);
        const overflowCount = orbitItems.length - visible.length;
        const totalBubbles = visible.length + (overflowCount > 0 ? 1 : 0);

        if (totalBubbles === 0) return '';

        // Build the bubble HTML once; both orbits use identical markup.
        // The orbit-radius / sigil-size differences come from the CSS
        // custom properties on `.avatar-sigil-orbit--mini` vs `--panel`,
        // so the per-sigil transform automatically scales to each size.
        /** @type {string[]} */ const bubbles = [];
        visible.forEach((item, index) => {
            // Even angular distribution around the full 360° orbit.
            const angle = (index / totalBubbles) * 360;
            bubbles.push(
                `<div class="avatar-sigil ${item.cls}"` +
                ` style="--angle: ${angle.toFixed(2)}deg"` +
                ` title="${escapeHTML(item.name)}">` +
                `<span class="avatar-sigil__icon">${item.icon}</span>` +
                `</div>`
            );
        });

        if (overflowCount > 0) {
            // Overflow badge always takes the LAST slot in the rotation
            // so the 7 named sigils stay together and the "+N" reads as
            // a continuation marker rather than a random bubble.
            const angle = ((totalBubbles - 1) / totalBubbles) * 360;
            bubbles.push(
                `<div class="avatar-sigil avatar-sigil--overflow"` +
                ` style="--angle: ${angle.toFixed(2)}deg"` +
                ` title="+${overflowCount} more active effect${overflowCount === 1 ? '' : 's'}">` +
                `<span class="avatar-sigil__icon">+${overflowCount}</span>` +
                `</div>`
            );
        }

        return bubbles.join('');
    }

    /**
     * The character-sheet panel's active-companion portrait (#panel-companion) — a circular
     * `.companion-bubble` holding the companion emoji, its name, and its description. Only rendered when
     * a companion is active: the wrapper keeps the `getActiveCompanion()` + `if (active)` guard, so this
     * builder assumes `active` is present and resolves icon/name/desc with catalog fallbacks.
     * @param {any} active  the active companion — { type, icon?, name? }.
     * @param {{ companionDefinitions: Record<string, any> }} deps
     *   companionDefinitions = the companion catalog (icon/name/description fallbacks keyed by `active.type`).
     * @returns {string}
     */
    function renderPanelCompanionHTML(active, { companionDefinitions }) {
        const def = companionDefinitions[active.type];
        const icon = active.icon || (def ? def.icon : '🐾');
        const name = active.name || (def ? def.name : 'Companion');
        const desc = def ? def.description : '';
        // v2.6 Item 4: companion rendered in a circular bubble
        // portrait with a gentle idle bob (`.companion-bubble` in
        // styles.css). The bubble's animation, gradient, and glow
        // all respect prefers-reduced-motion / fx-minimal via the
        // CSS-side gates. Mirrors the no-companion fallback markup
        // in `index.html` so the visual is identical regardless
        // of whether the player has an active companion.
        return `
                    <div class="companion-bubble">
                        <span class="text-3xl">${icon}</span>
                    </div>
                    <div>
                        <div class="text-green-200 fancy-font text-sm font-bold">${name}</div>
                        <div class="text-green-400 text-xs fancy-font">${desc}</div>
                    </div>
                `;
    }

    /**
     * The character-sheet panel's compact active-buffs row (#panel-active-buffs) — one small chip per
     * active spell (icon + name, NO time hint) then one per still-live enchantment, or a "No active buffs"
     * empty-state. Distinct from the arcane-tab `renderActiveBuffsSummaryHTML`: smaller chips, a different
     * empty-state colour (`text-purple-500/60 text-xs`), and no "(Nm)" hints. Names are interpolated RAW
     * (faithful — this surface never escaped them).
     * @param {any[]} activeSpells  `this.activeSpells` — each { spellId }.
     * @param {any[]} activeEnchantments  `this.activeEnchantments` — each { name, icon?, expiresAt } (expiresAt = ISO/parseable date).
     * @param {{ spellDefinitions: Record<string, any>, now: number }} deps
     *   spellDefinitions = the spell catalog (icon/name lookup); now = the wall clock (`Date.now()`), injected
     *   so the enchantment "still-live" filter (remaining > 0) is deterministic.
     * @returns {string}
     */
    function renderPanelActiveBuffsHTML(activeSpells, activeEnchantments, { spellDefinitions, now }) {
        /** @type {string[]} */
        const buffs = [];

        if (activeSpells && activeSpells.length > 0) {
            activeSpells.forEach(active => {
                const spell = spellDefinitions ? spellDefinitions[active.spellId] : null;
                if (spell) {
                    buffs.push(`<span class="inline-flex items-center gap-1 bg-purple-800/50 border border-purple-600/50 rounded-lg px-2 py-1 text-xs"><span>${spell.icon}</span><span class="text-purple-200 fancy-font">${spell.name}</span></span>`);
                }
            });
        }

        if (activeEnchantments && activeEnchantments.length > 0) {
            activeEnchantments.forEach(active => {
                const remaining = Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - now) / 60000));
                if (remaining > 0) {
                    buffs.push(`<span class="inline-flex items-center gap-1 bg-pink-800/50 border border-pink-600/50 rounded-lg px-2 py-1 text-xs"><span>${active.icon || '🔮'}</span><span class="text-pink-200 fancy-font">${active.name}</span></span>`);
                }
            });
        }

        return buffs.length > 0 ? buffs.join('') : '<span class="text-purple-500/60 fancy-font text-xs">No active buffs</span>';
    }

    const PLAYER_HUD_RENDER = Object.freeze({
        renderActiveBuffsSummaryHTML,
        renderActiveSpellSigilsHTML,
        renderPanelCompanionHTML,
        renderPanelActiveBuffsHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic PLAYER_HUD_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.PLAYER_HUD_RENDER = PLAYER_HUD_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = PLAYER_HUD_RENDER;
})();
