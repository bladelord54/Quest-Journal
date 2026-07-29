// @ts-check
'use strict';
/**
 * boss-render.js — the pure boss-card presentation helpers (Engineering Roadmap #1).
 *
 * Fifteenth incremental slice of the goal-manager.js God class, and the FIRST cut into
 * the rendering surface (the roadmap's last remaining #1 target). Rendering is mostly
 * DOM-writing methods (querySelector + innerHTML side effects) that are hard to unit-test;
 * the deliberate strategy is to start where it is SAFEST — the handful of render helpers
 * that are already pure `input → HTML-string` (or a plain value) functions with zero DOM.
 * These three qualify (they had no `this` beyond `bossThemes`, now injected) and already
 * carry 19 tests, so lifting them out and leaving thin delegators keeps every caller and
 * every existing test green while proving the `renderX(state) → html` module pattern that
 * the bigger render methods will follow.
 *
 * Together with boss-themes.js (data) and boss-generator.js (spawn logic), this completes
 * the boss cluster: catalog → generator → presentation.
 *
 * All three functions are pure — no `this`, no DOM, no globals. `getBossParticleType`
 * takes the theme pools as a parameter (the manager passes `this.bossThemes`).
 *
 * Dual-environment, no bundler (mirrors loot-engine.js / boss-generator.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.BOSS_RENDER. goal-manager.js captures it and delegates.
 *   - Jest/Node: `require('./boss-render.js')` returns the object via module.exports.
 */
(function () {
    /**
     * Boss-card phase color + label from the current HP ratio. Single source of truth
     * shared by renderBossCard (initial paint) and updateBossHPBar (mid-fight cross-fade).
     * @param {number} currentHP
     * @param {number} maxHP
     * @returns {{ color: string, text: string }}
     */
    function getBossPhase(currentHP, maxHP) {
        const pct = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
        if (pct <= 0) return { color: 'green', text: 'DEFEATED' };
        if (pct <= 25) return { color: 'purple', text: 'CRITICAL!' };
        if (pct <= 50) return { color: 'orange', text: 'Wounded' };
        if (pct <= 75) return { color: 'yellow', text: 'Injured' };
        return { color: 'red', text: 'Full Power' };
    }

    /**
     * Two-layer damage-trail HP bar markup (back-to-front: .boss-hp-damage flash trail,
     * .boss-hp-fill live gradient). `data-phase` drives the gradient palette via CSS vars.
     * Returns '' for a zero/absent maxHP. currentHP is clamped to [0, maxHP].
     * @param {{ maxHP?: number, currentHP?: number }} boss
     * @param {string} phaseColor
     * @returns {string}
     */
    function renderBossHPBar(boss, phaseColor) {
        const maxHP = Math.max(0, (boss && boss.maxHP) || 0);
        const currentHP = Math.max(0, Math.min(maxHP, (boss && boss.currentHP) || 0));
        if (maxHP <= 0) return '';
        const hpPercent = (currentHP / maxHP) * 100;

        const labelHtml = hpPercent > 15
            ? `<span class="boss-hp-percent">${Math.round(hpPercent)}%</span>`
            : '';

        return `
            <div class="boss-hp-bar relative w-full bg-stone-900 rounded-full h-6 border-2 border-${phaseColor}-700/70 overflow-hidden"
                 data-phase="${phaseColor}">
                <div class="boss-hp-damage" style="--hp-current: ${hpPercent}%; --hp-previous: ${hpPercent}%;"></div>
                <div class="boss-hp-fill" style="width: ${hpPercent}%">${labelHtml}</div>
            </div>
        `;
    }

    /**
     * Resolve a boss's defeat-dissolve particle palette. Newly generated bosses carry
     * `particleType` directly; legacy saves fall back to a name lookup across the theme
     * pools, then to 'shadow'. `bossThemes` is INJECTED (the manager passes this.bossThemes).
     * @param {{ name?: string, particleType?: string }|null|undefined} boss
     * @param {{ daily?: any[], weekly?: any[], monthly?: any[] }=} bossThemes
     * @returns {string}
     */
    function getBossParticleType(boss, bossThemes) {
        if (!boss) return 'shadow';
        if (boss.particleType) return boss.particleType;
        const themes = bossThemes || {};
        const all = [
            ...(themes.daily || []),
            ...(themes.weekly || []),
            ...(themes.monthly || []),
        ];
        const match = all.find((t) => t && t.name === boss.name);
        return (match && match.particleType) || 'shadow';
    }

    /**
     * Full active/defeated boss-card markup (the string renderBossBattles writes into a
     * container). Pure: the manager's instance state + the time-dependent reset label are
     * INJECTED via `deps`, and the two already-pure helpers (getBossPhase, renderBossHPBar)
     * are called in-module. Kept at the same indentation as the original method so the
     * template's internal whitespace — and therefore the emitted HTML — is byte-identical.
     * @param {any} boss
     * @param {string} type  'daily' | 'weekly' | 'monthly'
     * @param {{
     *   activeSpells?: any[],
     *   spellDefinitions?: Record<string, any>,
     *   attackCharges?: number,
     *   bossResetLabel?: (type: string, isDefeated: boolean) => string
     * }=} deps
     * @returns {string}
     */
    function renderBossCard(boss, type, deps) {
        const {
            activeSpells = [],
            spellDefinitions = {},
            attackCharges = 0,
            bossResetLabel = () => '',
        } = deps || {};

        const hpPercent = boss.maxHP > 0 ? (boss.currentHP / boss.maxHP) * 100 : 0;
        const isDefeated = boss.defeated;

        // Phase colors — v2.9 Track 3 factored this into `getBossPhase()` so
        // `updateBossHPBar` can cross-fade the chunk track to the new phase
        // without a full re-render.
        const { color: phaseColor, text: phaseText } = getBossPhase(boss.currentHP, boss.maxHP);

        const typeLabel = type === 'daily' ? 'DAILY FOE' : type === 'weekly' ? 'WEEKLY NEMESIS' : 'MONTHLY CHAMPION';
        const typeColor = type === 'daily' ? 'amber' : type === 'weekly' ? 'purple' : 'red';

        // Check if Execute spell is usable
        const executeSpell = activeSpells.find(s => s.spellId === 'execute');
        const canExecute = executeSpell && hpPercent > 0 && hpPercent <= 25;

        // Active boss spell buffs
        const bossSpells = activeSpells.filter(s =>
            ['berserker_rage', 'critical_strike', 'boss_slayer'].includes(s.spellId)
        );
        const spellBuffsHtml = bossSpells.length > 0 ? `
            <div class="flex gap-2 mt-3 justify-center flex-wrap">
                ${bossSpells.map(s => {
                    const def = spellDefinitions[s.spellId];
                    return `<span class="bg-purple-900/60 text-purple-200 px-2 py-1 rounded text-xs border border-purple-600/50">${def ? def.icon : '🔮'} ${def ? def.name : s.spellId}</span>`;
                }).join('')}
            </div>
        ` : '';

        return `
            <div id="boss-card-${type}" class="boss-card bg-gradient-to-br ${isDefeated ? 'from-green-950 to-stone-950 border-green-600/50' : `from-${phaseColor}-950 via-red-950 to-stone-950 border-${phaseColor}-600`} p-5 rounded-xl border-2 shadow-2xl relative overflow-hidden">
                ${!isDefeated ? `<div class="absolute inset-0 bg-gradient-to-t from-${phaseColor}-900/20 to-transparent animate-pulse pointer-events-none"></div>` : ''}
                
                <div class="relative z-10">
                    <!-- Boss Header -->
                    <div class="flex items-center gap-4 mb-4">
                        <div class="boss-portrait text-5xl ${isDefeated ? 'grayscale opacity-50' : 'animate-bounce'}">${boss.icon}</div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="text-xs bg-${typeColor}-700 text-white px-2 py-0.5 rounded fancy-font">${typeLabel}</span>
                                <span class="text-xs bg-${phaseColor}-700 text-white px-2 py-0.5 rounded fancy-font ${!isDefeated && hpPercent <= 25 ? 'animate-pulse' : ''}">${phaseText}</span>
                                <span class="text-xs text-amber-400 fancy-font">Lv.${boss.level}</span>
                                <span class="boss-reset-timer text-xs text-amber-200/70 fancy-font" data-boss-type="${type}">${bossResetLabel(type, isDefeated)}</span>
                            </div>
                            <h3 class="text-xl font-bold text-amber-300 medieval-title">${boss.name}</h3>
                            <p class="text-xs text-amber-200/60 italic fancy-font">${boss.flavor}</p>
                        </div>
                    </div>
                    
                    <!-- HP Bar (v2.9 Track 3 — two-layer damage-trail bar; see
                         renderBossHPBar() for markup and updateBossHPBar() for
                         the per-hit white-flash drain logic). -->
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm text-amber-200 font-bold fancy-font">HP</span>
                            <span class="text-sm text-${phaseColor}-300 font-bold">${boss.currentHP} / ${boss.maxHP}</span>
                        </div>
                        ${renderBossHPBar(boss, phaseColor)}
                    </div>
                    
                    ${boss.totalDamage > 0 ? `<div class="text-center text-sm text-amber-300 mb-3 fancy-font">${boss.totalDamage} total damage dealt</div>` : ''}
                    
                    ${spellBuffsHtml}
                    
                    <!-- Action Buttons -->
                    ${!isDefeated ? `
                        <div class="flex gap-3 mt-4">
                            <button data-action="boss.attack" data-boss-type="${type}" 
                                class="btn-ripple flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-red-400/50 text-lg"
                                ${attackCharges <= 0 ? 'disabled' : ''}>
                                <i class="ri-sword-fill mr-2"></i>ATTACK!${attackCharges > 0 ? ` (${attackCharges})` : ''}
                            </button>
                            ${canExecute ? `
                                <button data-action="boss.execute" data-boss-type="${type}"
                                    class="bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white px-4 py-3 rounded-lg font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-purple-400/50 animate-pulse">
                                    <i class="ri-skull-2-fill mr-1"></i>EXECUTE!
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="mt-4 text-center">
                            <div class="text-2xl font-bold text-green-300 medieval-title">DEFEATED!</div>
                            <div class="text-sm text-green-200 fancy-font">+${boss.rewards.xp} XP, +${boss.rewards.gold} Gold</div>
                        </div>
                    `}
                    
                    <!-- Rewards Preview -->
                    ${!isDefeated ? `
                        <div class="mt-3 text-center text-xs text-amber-200/50 fancy-font">
                            Rewards: ${boss.rewards.xp} XP, ${boss.rewards.gold} Gold, + Loot
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * The defeated-bosses gallery markup: the empty-state prompt when there are no
     * victories, otherwise the summary banner + victories bucketed into This Week /
     * This Month / Older collapsible sections. Pure: the list is passed in and `now`
     * is INJECTED so the time-bucketing is deterministic/testable. The manager's
     * renderDefeatedBosses wrapper keeps the container lookup + innerHTML write. Kept at
     * the original method's indentation so the templates' whitespace is byte-identical.
     * @param {any[]} defeatedBossList
     * @param {Date} [now]
     * @returns {string}
     */
    function renderDefeatedBossesHTML(defeatedBossList, now = new Date()) {
        if (defeatedBossList.length === 0) {
            return `
                <div class="col-span-3 text-center py-8 text-amber-200">
                    <div class="text-6xl mb-3 opacity-30">🏆</div>
                    <p class="fancy-font">No victories yet. Defeat your first boss to start your legend!</p>
                </div>
            `;
        }

        // Time period boundaries
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = startOfToday.getDay(); // 0=Sun
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Bucket bosses into time periods. The cast keeps bosses as any[] instead of the
        // never[] TS infers from the empty literal (runtime/output identical).
        const periods = /** @type {Array<{ key: string, label: string, icon: string, color: string, bosses: any[] }>} */ ([
            { key: 'week', label: 'This Week', icon: '⚔️', color: 'green', bosses: [] },
            { key: 'month', label: 'This Month', icon: '🗓️', color: 'blue', bosses: [] },
            { key: 'older', label: 'Older Victories', icon: '📜', color: 'stone', bosses: [] },
        ]);

        defeatedBossList.forEach(boss => {
            const d = new Date(boss.defeatedAt);
            if (d >= startOfWeek) periods[0].bosses.push(boss);
            else if (d >= startOfMonth) periods[1].bosses.push(boss);
            else periods[2].bosses.push(boss);
        });

        // Summary stats
        const totalXP = defeatedBossList.reduce((s, b) => s + (b.rewards?.xp || 0), 0);
        const totalGold = defeatedBossList.reduce((s, b) => s + (b.rewards?.gold || 0), 0);

        let html = `
            <div class="col-span-full mb-4 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-amber-300 fancy-font text-sm font-bold">Total Victories: ${defeatedBossList.length}</span>
                    <div class="flex gap-4 text-xs text-amber-200/70 fancy-font">
                        <span>⚡ ${totalXP.toLocaleString()} XP earned</span>
                        <span>💰 ${totalGold.toLocaleString()} Gold plundered</span>
                    </div>
                </div>
            </div>
        `;

        // Render each time period as a collapsible section
        periods.forEach(period => {
            if (period.bosses.length === 0) return;
            const periodXP = period.bosses.reduce((s, b) => s + (b.rewards?.xp || 0), 0);
            const periodGold = period.bosses.reduce((s, b) => s + (b.rewards?.gold || 0), 0);
            // This Week starts open, others collapsed
            const defaultOpen = period.key === 'week';

            html += `
                <div class="col-span-full mb-3">
                    <button onclick="this.parentElement.querySelector('.boss-period-body').classList.toggle('hidden');this.querySelector('.boss-period-arrow').classList.toggle('rotate-90')"
                        class="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 transition-all cursor-pointer text-left">
                        <span class="text-2xl">${period.icon}</span>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-${period.color}-300 font-bold fancy-font text-sm">${period.label}</span>
                                <span class="text-xs px-1.5 py-0.5 rounded bg-${period.color}-700/30 text-${period.color}-300/80 font-bold">${period.bosses.length} ${period.bosses.length === 1 ? 'boss' : 'bosses'}</span>
                            </div>
                            <div class="flex gap-3 mt-1 text-xs text-gray-400 fancy-font">
                                <span>⚡ ${periodXP.toLocaleString()} XP</span>
                                <span>💰 ${periodGold.toLocaleString()} Gold</span>
                            </div>
                        </div>
                        <i class="ri-arrow-right-s-line text-gray-400 text-lg boss-period-arrow transition-transform ${defaultOpen ? 'rotate-90' : ''}"></i>
                    </button>
                    <div class="boss-period-body ${defaultOpen ? '' : 'hidden'} mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            `;

            period.bosses.forEach(boss => {
                const date = new Date(boss.defeatedAt).toLocaleDateString();
                const typeLabel = boss.type === 'daily' ? 'Daily' : boss.type === 'weekly' ? 'Weekly' : 'Monthly';
                html += `
                    <div class="bg-gradient-to-br from-green-900/30 to-stone-900/30 p-4 rounded-lg border border-green-600/30 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-t from-green-500/5 to-transparent"></div>
                        <div class="relative z-10">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-3xl grayscale opacity-60">${boss.icon}</span>
                                <div>
                                    <h4 class="text-sm font-bold text-green-300 medieval-title">${boss.name}</h4>
                                    <span class="text-xs text-green-200/60 fancy-font">${typeLabel} Lv.${boss.level} (${boss.maxHP} HP)</span>
                                </div>
                            </div>
                            <div class="flex justify-between text-xs text-amber-300/60 fancy-font">
                                <span>+${boss.rewards.xp} XP, +${boss.rewards.gold} Gold</span>
                                <span>${date}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        return html;
    }

    /**
     * The boss battle-log markup: an empty-state prompt, or one row per entry
     * (sanitized message + relative time). Pure string assembly — the three couplings
     * are INJECTED via deps and deliberately STAY on the class: getTimeAgo (reads
     * Date.now()), sanitizeMessage (the _sanitizeBossLogMessage security chokepoint that
     * lets legacy <i class="ri-..."> icon chrome through innerHTML while blocking script),
     * and escapeHTML. The renderBossLog wrapper keeps the container lookup + innerHTML
     * write. Indentation matches the original method so the row template is byte-identical.
     * @param {any[]} bossLog
     * @param {{ getTimeAgo: (t: any) => string, sanitizeMessage: (m: any) => string, escapeHTML: (s: any) => string }} deps
     * @returns {string}
     */
    function renderBossLogHTML(bossLog, deps) {
        if (bossLog.length === 0) {
            return '<div class="text-amber-200/50 text-sm fancy-font text-center py-4">No battles yet. Complete tasks to earn attacks!</div>';
        }

        const { getTimeAgo, sanitizeMessage, escapeHTML } = deps;
        return bossLog.map(entry => {
            const timeAgo = getTimeAgo(entry.time);
            const safeMessage = sanitizeMessage(entry.message);
            return `<div class="text-sm text-amber-200/80 fancy-font flex justify-between"><span>${safeMessage}</span><span class="text-amber-400/40 text-xs ml-2 shrink-0">${escapeHTML(timeAgo)}</span></div>`;
        }).join('');
    }

    /**
     * The monthly-champion CHALLENGE prompt (shown when the kill threshold is met but no
     * monthly boss is active). Pure render of a PRE-BUILT preview boss — the renderBossArena
     * wrapper keeps the seedKey (currentMonth via new Date()) + BOSS_GENERATOR.buildBoss(...)
     * call so the preview can't drift from what challengeMonthlyBoss() actually summons
     * (Roadmap #1, 13th slice). Indentation matches the original method so the template is
     * byte-identical.
     * @param {{ icon: string, name: string, flavor: string, maxHP: number, level: number, rewards: { xp: number, gold: number } }} preview
     * @returns {string}
     */
    function renderMonthlyBossChallengeHTML(preview) {
        return `
            <div class="bg-gradient-to-br from-red-950 via-purple-950 to-stone-950 p-6 rounded-xl border-2 border-red-500/70 shadow-2xl relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent animate-pulse pointer-events-none"></div>
                <div class="relative z-10 text-center">
                    <div class="text-6xl mb-3 animate-bounce">${preview.icon}</div>
                    <div class="text-xs bg-red-700 text-white px-3 py-1 rounded inline-block fancy-font mb-2">MONTHLY CHAMPION</div>
                    <h3 class="text-2xl font-bold text-red-300 medieval-title mb-2">${preview.name}</h3>
                    <p class="text-sm text-amber-200/60 italic fancy-font mb-4">${preview.flavor}</p>
                    <div class="flex items-center justify-center gap-4 mb-4 text-sm text-amber-300 fancy-font">
                        <span>HP: ${preview.maxHP}</span>
                        <span>•</span>
                        <span>Lv.${preview.level}</span>
                    </div>
                    <div class="bg-stone-900/60 rounded-lg p-3 mb-4 border border-amber-700/30">
                        <div class="text-xs text-amber-200/70 fancy-font mb-1">Champion Rewards</div>
                        <div class="flex items-center justify-center gap-3 text-sm">
                            <span class="text-yellow-300">${preview.rewards.xp} XP</span>
                            <span class="text-amber-400">${preview.rewards.gold} Gold</span>
                            <span class="text-purple-300">+ Bonus Loot</span>
                        </div>
                    </div>
                    <button data-action="boss.challengeMonthly" 
                        class="bg-gradient-to-r from-red-600 via-purple-600 to-red-600 hover:from-red-500 hover:via-purple-500 hover:to-red-500 text-white px-8 py-4 rounded-xl font-bold fancy-font shadow-lg transition-all hover:scale-105 border-2 border-red-400/50 text-lg animate-pulse">
                        <i class="ri-skull-2-fill mr-2"></i>CHALLENGE THE CHAMPION!
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * The monthly-champion PROGRESS panel (shown before the kill threshold is met). Pure:
     * both the bar % width and the remaining-count are derived from (kills, threshold),
     * which the renderBossArena wrapper reads off the instance. Indentation matches the
     * original method so the template is byte-identical.
     * @param {number} kills
     * @param {number} threshold
     * @returns {string}
     */
    function renderMonthlyBossProgressHTML(kills, threshold) {
        const progress = Math.min((kills / threshold) * 100, 100);
        const remaining = Math.max(0, threshold - kills);

        return `
            <div class="bg-gradient-to-br from-stone-900/60 to-stone-950/60 p-5 rounded-xl border-2 border-stone-700/50 text-center">
                <div class="text-4xl mb-2 opacity-40">🏴</div>
                <h3 class="text-lg font-bold text-amber-300/60 medieval-title mb-2">Monthly Champion</h3>
                <p class="text-sm text-amber-200/40 fancy-font mb-3">
                    ${remaining > 0 
                        ? `Defeat ${remaining} more boss${remaining !== 1 ? 'es' : ''} this month to unlock the challenge!` 
                        : 'Challenge available!'}
                </p>
                <div class="progress-bar w-full bg-stone-800 rounded-full h-4 border border-stone-600/50 mb-2">
                    <div class="bg-gradient-to-r from-red-600 to-purple-600 h-4 rounded-full transition-all duration-500" 
                         style="width: ${progress}%"></div>
                </div>
                <div class="text-xs text-amber-400/50 fancy-font">${kills} / ${threshold} bosses defeated</div>
            </div>
        `;
    }

    const BOSS_RENDER = Object.freeze({
        getBossPhase,
        renderBossHPBar,
        getBossParticleType,
        renderBossCard,
        renderDefeatedBossesHTML,
        renderBossLogHTML,
        renderMonthlyBossChallengeHTML,
        renderMonthlyBossProgressHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic BOSS_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.BOSS_RENDER = BOSS_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = BOSS_RENDER;
})();
