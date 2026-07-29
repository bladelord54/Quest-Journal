// @ts-check
'use strict';
/**
 * reward-economy.js — pure XP/gold reward-stack math (Engineering Roadmap #1).
 *
 * 67th incremental slice of the goal-manager.js God class, and the FIFTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage pattern). `addXP` and `addGold` are the TWO choke points every reward in the
 * game routes through, and they had grown into parallel multiplier stacks that independently hardcoded the
 * same knowledge:
 *
 *   1. The Beginner's Blessing 2× was written TWICE — once in each method — as `active ? 2 : 1`.
 *   2. The Quest Doubler 2× was written TWICE, and split ACROSS the two methods: addXP sets the multiplier
 *      and stashes `_questDoublerGoldPending = 2` for addGold to pick up on the next synchronous call.
 *      Two hand-written 2s that must always agree, in different methods, hundreds of lines apart.
 *   3. Both ended in the same `Math.floor(amount × m1 × m2 × …)` convention (7 factors for XP, 6 for gold).
 *
 * NOTE ON `applyStack` — it folds LEFT-TO-RIGHT starting from `amount`, exactly reproducing the inline
 * `amount * m1 * m2 * …` evaluation order. Seeding the fold at 1 and multiplying the product by `amount`
 * afterwards would REGROUP the floating-point multiply; with non-terminating binary fractions (1.1 companion
 * bonuses, 1.15 pathfinder, …) that can shift the result by one ulp and flip the `Math.floor` by a whole
 * point. The accumulator therefore starts at `amount`, and a test pins a case where the two groupings differ.
 *
 * Also lifted are the two PRE-multiplier XP bonus rules, which had NO direct test coverage before this slice:
 *
 *   - Early Bird (enchantment): the first N daily tasks each day are worth 3×. The counter keeps climbing
 *     past the cap — only the COMPARISON is capped — so the caller increments first and passes the new count.
 *   - Momentum (enchantment): a +5 XP per-stack bonus that ramps 5/10/15/20/25 and clamps at 5 stacks. It is
 *     ADDED AFTER Early Bird's ×3, so the momentum bonus is NOT tripled — `(amount × 3) + stack × 5`, not
 *     `(amount + stack × 5) × 3`. A test pins that ordering.
 *
 * Plus the two source rule-sets: QUEST_DOUBLER_SOURCES (quest completions only, so chest/focus/habit XP can't
 * consume the spell) and QUIET_GOLD_SOURCES (routine completions that own their own sound/animation, so
 * addGold stays silent for them).
 *
 * Everything impure stays on the class: `hasActiveEnchantment`, the counter/stack WRITES, the pending-gold
 * flag and its microtask cleanup, consuming the Quest Doubler spell, toasts, sounds, sprites and `saveData`.
 *
 * Dual-environment, no bundler (mirrors combat-damage.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.REWARD_ECONOMY. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./reward-economy.js') returns the frozen object via module.exports (and also sets
 *     window.REWARD_ECONOMY under jsdom).
 */
(function () {
    /** Beginner's Blessing: 2× XP and gold during the first few days. */
    const BEGINNER_BLESSING_MULTIPLIER = 2;
    /** Quest Doubler spell: 2× XP and gold on the next quest completion. */
    const QUEST_DOUBLER_MULTIPLIER = 2;
    /** Early Bird enchantment multiplier. */
    const EARLY_BIRD_MULTIPLIER = 3;
    /** Early Bird applies only to the first N daily tasks of the day. */
    const EARLY_BIRD_TASK_CAP = 5;
    /** Momentum enchantment stack ceiling. */
    const MOMENTUM_MAX_STACK = 5;
    /** Bonus XP granted per Momentum stack. */
    const MOMENTUM_XP_PER_STACK = 5;

    /** Sources that may consume the Quest Doubler (quest completions only). */
    const QUEST_DOUBLER_SOURCES = Object.freeze(['daily', 'weekly', 'monthly', 'life', 'epic', 'side']);
    /** Routine sources whose gold is silent — they own their own sound/animation. */
    const QUIET_GOLD_SOURCES = Object.freeze(['daily', 'habit', 'weekly', 'monthly']);

    /**
     * Fold a reward's multiplier stack and floor the result. The accumulator starts at `amount` so the
     * multiplication is grouped LEFT-TO-RIGHT exactly as the inline expression was — see the module note on
     * floating-point regrouping. PURE.
     * @param {number} amount
     * @param {number[]} multipliers applied in order
     * @returns {number}
     */
    function applyStack(amount, multipliers) {
        return Math.floor((multipliers || []).reduce((total, m) => total * m, amount));
    }

    /**
     * Beginner's Blessing multiplier for an active/inactive blessing. PURE.
     * @param {boolean} active
     * @returns {number}
     */
    function blessingMultiplier(active) {
        return active ? BEGINNER_BLESSING_MULTIPLIER : 1;
    }

    /**
     * Early Bird XP for a daily task. `tasksToday` is the ALREADY-INCREMENTED count, because the counter
     * keeps rising past the cap while only the comparison is capped. PURE.
     * @param {number} amount
     * @param {number} tasksToday
     * @param {number|null|undefined} [cap] defaults to EARLY_BIRD_TASK_CAP (5)
     * @param {number|null|undefined} [multiplier] defaults to EARLY_BIRD_MULTIPLIER (3)
     * @returns {number}
     */
    function earlyBirdAmount(amount, tasksToday, cap, multiplier) {
        const limit = cap ?? EARLY_BIRD_TASK_CAP;
        return tasksToday <= limit ? amount * (multiplier ?? EARLY_BIRD_MULTIPLIER) : amount;
    }

    /**
     * The Momentum stack after one more consecutive task, clamped at the ceiling. PURE.
     * @param {number} current
     * @param {number|null|undefined} [max] defaults to MOMENTUM_MAX_STACK (5)
     * @returns {number}
     */
    function nextMomentumStack(current, max) {
        return Math.min((current || 0) + 1, max ?? MOMENTUM_MAX_STACK);
    }

    /**
     * Flat bonus XP for a Momentum stack. Added AFTER Early Bird's multiplier, so it is never tripled. PURE.
     * @param {number} stack
     * @param {number|null|undefined} [perStack] defaults to MOMENTUM_XP_PER_STACK (5)
     * @returns {number}
     */
    function momentumBonus(stack, perStack) {
        return (stack || 0) * (perStack ?? MOMENTUM_XP_PER_STACK);
    }

    /**
     * True when a source is a quest completion and may consume the Quest Doubler. PURE.
     * @param {string} source
     * @returns {boolean}
     */
    function isQuestDoublerSource(source) {
        return QUEST_DOUBLER_SOURCES.includes(source);
    }

    /**
     * True when gold from this source should be silent (no sound, no flying sprite). PURE.
     * @param {string} source
     * @returns {boolean}
     */
    function isQuietGoldSource(source) {
        return QUIET_GOLD_SOURCES.includes(source);
    }

    const REWARD_ECONOMY = Object.freeze({
        BEGINNER_BLESSING_MULTIPLIER,
        QUEST_DOUBLER_MULTIPLIER,
        EARLY_BIRD_MULTIPLIER,
        EARLY_BIRD_TASK_CAP,
        MOMENTUM_MAX_STACK,
        MOMENTUM_XP_PER_STACK,
        QUEST_DOUBLER_SOURCES,
        QUIET_GOLD_SOURCES,
        applyStack,
        blessingMultiplier,
        earlyBirdAmount,
        nextMomentumStack,
        momentumBonus,
        isQuestDoublerSource,
        isQuietGoldSource,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // REWARD_ECONOMY property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.REWARD_ECONOMY = REWARD_ECONOMY;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = REWARD_ECONOMY;
})();
