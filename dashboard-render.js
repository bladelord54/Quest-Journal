// @ts-check
'use strict';
/**
 * dashboard-render.js — pure Dashboard-card presentation builders (Engineering Roadmap #1).
 *
 * The NINTH render module (after boss-, task-, companion-, spell-, class-, analytics-,
 * quest-chain-, and enchantment-render.js). Covers the standalone cards that
 * `renderDashboard()` mounts into their own DOM slots. `renderDashboard()` itself STAYS on the
 * class — it is a textContent + hidden-toggle ORCHESTRATOR (level-title banner, motivational
 * quote, stat counts, today's-tasks list) that then calls the card renderers below.
 *
 * The 40th slice extracted the two CLEANEST cards — pure data-in → HTML-string-out, no post-render
 * DOM wiring:
 *   - renderXPEventHTML(event, { escapeHTML, xpEventTimeLeftLabel })
 *       the Double-XP-Weekend banner shown while a limited-time XP event is live. The wrapper
 *       owns the `getActiveXPEvent()` lookup + the hide/show guard; the builder is the banner
 *       markup. Clock-dependent only through the injected `xpEventTimeLeftLabel` (which reads
 *       `Date.now()`), so the builder stays deterministic given its inputs.
 *   - renderRoyalBountyHTML(activeBounties, { bountyUnlocked, bountyQuest, bountyTimeLeftLabel, isPremium, escapeHTML })
 *       the weekly/monthly Royal Bounty cards — an "add a quest" nudge (empty pool), a "Claimed ✓"
 *       receipt, or the live bounty (chest tier, escaped quest title, time-left, and a Reroll
 *       button that is premium-gated). Returns the JOINED cards (or '' when nothing qualifies);
 *       the wrapper owns the hide-when-empty / show branch.
 *
 * The 41st slice adds the other two cards, COMPLETING the suite:
 *   - renderStreakRepairHTML(entries, { isPremium, hasFreeStreakRepair, focusCrystals, getStreakRepairCost, escapeHTML, streakRepairTimeLeftLabel })
 *       the broken-streak repair card body — the pure conversion upsell (non-premium who has spent their
 *       one free repair) OR the repairable-streak rows (premium pays Focus Crystals; a free-repair player
 *       pays nothing + ignores affordability). The wrapper keeps `getRepairableStreaks()` + the hide/show +
 *       the cyan-shell container; the module's `shell` becomes a PURE string helper (no DOM write).
 *   - renderWeeklyThemeCardHTML(theme, { eyebrow, copy, cta, from, to, border, escapeHTML })
 *       the Theme-of-the-Week discovery card (swatch + eyebrow/copy + preview/dismiss). The wrapper keeps
 *       ALL guards (no featured theme / already-wearing / dismissed-this-week), the free-vs-premium
 *       eyebrow/copy/cta derivation, the swatch colour fallbacks, and the post-render `addEventListener`
 *       wiring on the two buttons — this builder is the innerHTML template only.
 *
 * The domain objects (the live XP-event, the `activeBounties` map + resolved quests) are dynamic
 * runtime shapes, so the builders take them as `any` and are documented in prose rather than
 * over-typed. They are PURE given their injected deps: same data + same injected label/predicate
 * functions → same string. Every impure coupling is injected the same arrow-bound way the other
 * render modules use (`escapeHTML: (s) => this.escapeHTML(s)`, etc.).
 *
 * Byte-faithful: each builder is the original inline method body moved verbatim (templates copied
 * to the byte, including trailing spaces + whitespace-only lines), with only the impure plumbing
 * changed — `this.<helper>` → injected fn, `this.<state>` → injected value, and the terminal
 * `wrap.innerHTML = X` folded into the wrapper (XP event returns the banner; Royal Bounty returns
 * the joined `cards`). The wrappers keep the `getElementById` + guard + hide/show bits.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.DASHBOARD_RENDER.
 *   - Jest/Node: require('./dashboard-render.js') returns the frozen builders via module.exports.
 */

/**
 * The Double-XP-Weekend banner (shown while a limited-time XP event is live).
 * @param {any} event  the active XP event (`getActiveXPEvent()`): icon, multiplier, label, endsAt.
 * @param {{ escapeHTML: (s: any) => string, xpEventTimeLeftLabel: (event: any) => string }} deps
 *   escapeHTML = user-facing label escaper; xpEventTimeLeftLabel = the clock-dependent "Xh left"
 *   countdown (reads `Date.now()`), kept off the pure builder.
 * @returns {string}
 */
function renderXPEventHTML(event, { escapeHTML, xpEventTimeLeftLabel }) {
    return `
            <div class="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-600/30 via-orange-600/25 to-amber-600/30 p-4 shadow-lg flex items-center gap-3">
                <span class="text-3xl" aria-hidden="true">${event.icon}</span>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-amber-200 medieval-title">${event.multiplier}× ${escapeHTML(event.label)}</div>
                    <div class="text-xs text-amber-100/70 fancy-font">Earn ${event.multiplier}× XP on every quest · ${xpEventTimeLeftLabel(event)}</div>
                </div>
                <span class="shrink-0 text-[10px] uppercase tracking-wide font-bold text-amber-300/80 bg-amber-500/15 border border-amber-400/40 rounded-full px-2 py-0.5">Live</span>
            </div>`;
}

/**
 * The weekly + monthly Royal Bounty cards. Returns the JOINED card markup (or '' when neither
 * cadence qualifies) — the caller owns the hide-when-empty / show branch.
 * @param {Record<string, any>} activeBounties  `this.activeBounties` keyed by cadence.
 * @param {{ bountyUnlocked: (cadence: string) => boolean, bountyQuest: (b: any) => any, bountyTimeLeftLabel: (expiresAt: any) => string, isPremium: boolean, escapeHTML: (s: any) => string }} deps
 *   bountyUnlocked = cadence-unlocked predicate; bountyQuest = resolves the live quest a bounty
 *   targets (null if deleted); bountyTimeLeftLabel = clock-dependent "Nd left"; isPremium gates
 *   the Reroll button; escapeHTML escapes the quest title.
 * @returns {string}
 */
function renderRoyalBountyHTML(activeBounties, { bountyUnlocked, bountyQuest, bountyTimeLeftLabel, isPremium, escapeHTML }) {
    /** @type {Record<string, string>} */
    const chestEmoji = { bronze: '🥉', silver: '🥈', gold: '🥇', royal: '👑' };
    /** @type {Record<string, string>} */
    const cadenceLabel = { weekly: 'Weekly', monthly: 'Monthly' };
    /** @type {string[]} */
    const cards = [];

    ['weekly', 'monthly'].forEach(cadence => {
        if (!bountyUnlocked(cadence)) return;
        const b = activeBounties && activeBounties[cadence];
        if (!b) return;

        // Empty pool → "add a quest" nudge.
        if (b.empty) {
            const addAction = cadence === 'weekly' ? 'goal.addWeekly' : 'goal.addMonthly';
            cards.push(`
                    <div class="royal-bounty-card royal-bounty-empty">
                        <div class="royal-bounty-head">
                            <span class="royal-bounty-eyebrow">👑 ${cadenceLabel[cadence]} Royal Bounty</span>
                        </div>
                        <p class="royal-bounty-copy">No ${cadence} quest to spotlight yet. Add one to make it
                        eligible for next ${cadence === 'weekly' ? "week's" : "month's"} bounty and its free chest.</p>
                        <button class="royal-bounty-cta" data-action="${addAction}">
                            <i class="ri-add-line"></i> Add a ${cadence} quest
                        </button>
                    </div>`);
            return;
        }

        if (b.status === 'claimed') {
            cards.push(`
                    <div class="royal-bounty-card royal-bounty-claimed">
                        <div class="royal-bounty-head">
                            <span class="royal-bounty-eyebrow">👑 ${cadenceLabel[cadence]} Royal Bounty</span>
                            <span class="royal-bounty-done">Claimed ✓</span>
                        </div>
                        <p class="royal-bounty-copy">Bounty claimed — your ${chestEmoji[b.chestTier] || '🎁'} ${b.chestTier} chest was awarded.
                        A fresh bounty arrives next ${cadence === 'weekly' ? 'week' : 'month'}.</p>
                    </div>`);
            return;
        }

        if (b.status !== 'active') return;        // expired → render nothing
        const quest = bountyQuest(b);
        if (!quest) return;                        // target deleted → hide

        const tier = b.chestTier;
        const emoji = chestEmoji[tier] || '🎁';
        const timeLeft = bountyTimeLeftLabel(b.expiresAt);
        const rerollBtn = b.rerolled
            ? ''
            : (isPremium
                ? `<button class="royal-bounty-reroll" data-action="bounty.reroll" data-cadence="${cadence}" title="Reroll this bounty"><i class="ri-refresh-line"></i> Reroll</button>`
                : `<button class="royal-bounty-reroll royal-bounty-reroll-locked" data-action="bounty.reroll" data-cadence="${cadence}" title="Reroll is a Premium perk"><i class="ri-refresh-line"></i> Reroll 👑</button>`);

        cards.push(`
                <div class="royal-bounty-card royal-bounty-active royal-bounty-${tier}">
                    <div class="royal-bounty-head">
                        <span class="royal-bounty-eyebrow">👑 ${cadenceLabel[cadence]} Royal Bounty</span>
                        <span class="royal-bounty-timer">${timeLeft}</span>
                    </div>
                    <div class="royal-bounty-body">
                        <div class="royal-bounty-quest" title="${escapeHTML(quest.title)}">${escapeHTML(quest.title)}</div>
                        <div class="royal-bounty-reward"><span class="royal-bounty-chest">${emoji}</span> Free ${tier} chest on completion</div>
                    </div>
                    <div class="royal-bounty-actions">${rerollBtn}</div>
                </div>`);
    });

    const html = cards.join('');
    return html;
}

/**
 * The Streak Repair card body — the inner content the wrapper drops into its cyan shell. The wrapper
 * guarantees `entries` is non-empty; this returns EITHER the pure conversion upsell (a non-premium
 * player who has already spent their one free repair) OR the repairable-streak rows (premium pays Focus
 * Crystals; a free-repair player pays nothing and ignores affordability). The rounded-2xl container +
 * the classList/hide toggles stay in the wrapper. The `shell` here is a PURE string helper (the same
 * container template the method's DOM `shell` closure used, minus the innerHTML write).
 * @param {any[]} entries  repairable streaks (`getRepairableStreaks()`): { id, kind, title?, lostStreak }.
 * @param {{ isPremium: boolean, hasFreeStreakRepair: () => boolean, focusCrystals: number, getStreakRepairCost: (lostStreak: any) => number, escapeHTML: (s: any) => string, streakRepairTimeLeftLabel: (e: any) => string }} deps
 * @returns {string}
 */
function renderStreakRepairHTML(entries, { isPremium, hasFreeStreakRepair, focusCrystals, getStreakRepairCost, escapeHTML, streakRepairTimeLeftLabel }) {
    const shell = (/** @type {string} */ inner) => `
                <div class="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-900/30 to-slate-900/60 p-4 shadow-lg">${inner}</div>`;

    // P2b — a non-premium player's one free repair is still actionable, so
    // only show the pure upsell once that freebie has been spent.
    const freeRepair = hasFreeStreakRepair();
    if (!isPremium && !freeRepair) {
        // Contextual conversion moment: a streak just broke and Premium
        // could have saved it. One compact upsell, not one per streak.
        const longest = entries.reduce((m, e) => Math.max(m, e.lostStreak || 0), 0);
        return shell(`
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-2xl">❄️</span>
                    <span class="font-bold text-cyan-200 medieval-title">Streak Repair</span>
                    <span class="ml-auto text-[10px] uppercase tracking-wide font-bold text-cyan-300/70 bg-cyan-500/10 border border-cyan-400/30 rounded-full px-2 py-0.5">Premium</span>
                </div>
                <p class="text-sm text-cyan-100/80 fancy-font">Your ${longest}-day streak just broke. Premium members can spend Focus Crystals to restore a broken streak within 48 hours.</p>
                <button data-action="premium.showModal" class="w-full mt-3 py-2.5 rounded-xl font-bold text-sm fancy-font bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow transition-all active:scale-95">
                    👑 Unlock Streak Repair
                </button>`);
    }

    // Either premium (pay Focus Crystals) or a non-premium player using their
    // one free repair (no cost). The free repair ignores affordability.
    const rows = entries.map(e => {
        const cost = freeRepair ? 0 : getStreakRepairCost(e.lostStreak);
        const affordable = freeRepair || (focusCrystals || 0) >= cost;
        const label = e.kind === 'login' ? 'Login streak' : escapeHTML(e.title || 'Habit');
        const costBadge = freeRepair ? 'Free' : `${cost} 🔮`;
        const btn = affordable
            ? `<button data-action="streak.repair" data-entity-id="${e.id}" class="shrink-0 px-3 py-2 rounded-lg font-bold text-xs fancy-font bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow transition-all active:scale-95">Repair · ${costBadge}</button>`
            : `<span class="shrink-0 px-3 py-2 rounded-lg font-bold text-xs fancy-font bg-gray-700/60 text-gray-400 border border-gray-600/50">Need ${cost} 🔮</span>`;
        return `
                <div class="flex items-center gap-3 py-2">
                    <span class="text-xl shrink-0">💔</span>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-sm text-cyan-100 truncate">${label}</div>
                        <div class="text-xs text-cyan-200/60">${e.lostStreak}-day streak lost · ${streakRepairTimeLeftLabel(e)}</div>
                    </div>
                    ${btn}
                </div>`;
    }).join('');

    const headerRight = freeRepair
        ? `<span class="ml-auto text-[10px] uppercase tracking-wide font-bold text-cyan-200 bg-emerald-500/15 border border-emerald-400/40 rounded-full px-2 py-0.5">1 free repair</span>`
        : `<span class="ml-auto text-xs text-cyan-300/70">${focusCrystals || 0} 🔮 available</span>`;
    const subcopy = freeRepair
        ? 'Your first streak repair is on us — restore one broken streak free within 48 hours.'
        : 'Restore a broken streak within 48 hours.';
    return shell(`
            <div class="flex items-center gap-2 mb-1">
                <span class="text-2xl">❄️</span>
                <span class="font-bold text-cyan-200 medieval-title">Streak Repair</span>
                ${headerRight}
            </div>
            <p class="text-xs text-cyan-100/60 fancy-font mb-1">${subcopy}</p>
            <div class="divide-y divide-cyan-500/10">${rows}</div>`);
}

/**
 * The Theme-of-the-Week discovery card markup — the swatch + eyebrow/copy + preview/dismiss buttons.
 * PURE: the wrapper owns every guard (no featured theme / already-wearing this week / dismissed-this-week),
 * the free-vs-premium eyebrow/copy/cta derivation, the swatch colour fallbacks, and the post-render
 * `addEventListener` wiring on the two buttons; this is only the innerHTML template.
 * @param {any} theme  the featured theme definition: name, icon, cardFrom?, cardTo?, color?, border?.
 * @param {{ eyebrow: string, copy: string, cta: string, from: string, to: string, border: string, escapeHTML: (s: any) => string }} deps
 * @returns {string}
 */
function renderWeeklyThemeCardHTML(theme, { eyebrow, copy, cta, from, to, border, escapeHTML }) {
    return `
            <div class="weekly-theme-card" role="region" aria-label="Theme of the Week: ${escapeHTML(theme.name)}"
                 style="--wt-border: ${border};">
                <div class="weekly-theme-swatch" style="background: linear-gradient(135deg, ${from}, ${to}); border-color: ${border};">
                    <span class="weekly-theme-swatch-icon">${theme.icon}</span>
                </div>
                <div class="weekly-theme-body">
                    <div class="weekly-theme-eyebrow">${eyebrow}</div>
                    <p class="weekly-theme-copy">${copy}</p>
                </div>
                <div class="weekly-theme-actions">
                    <button type="button" class="weekly-theme-cta" data-action="preview">${cta}</button>
                    <button type="button" class="weekly-theme-dismiss" data-action="dismiss" aria-label="Dismiss for this week">Dismiss</button>
                </div>
            </div>
        `;
}

const DASHBOARD_RENDER = Object.freeze({
    renderXPEventHTML,
    renderRoyalBountyHTML,
    renderStreakRepairHTML,
    renderWeeklyThemeCardHTML,
});


// Node / Jest

export default DASHBOARD_RENDER;
