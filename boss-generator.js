// @ts-check
'use strict';
/**
 * boss-generator.js — the pure boss-spawn engine (Engineering Roadmap #1).
 *
 * Thirteenth incremental slice of the goal-manager.js God class, and the SECOND
 * logic slice (after loot-engine.js). Two pure, stateless functions:
 *
 *   - hashDateString(str) — the deterministic date→int hash used to seed which boss
 *     theme spawns for a given day / week / month. Same day always picks the same
 *     boss (no persistence needed for the choice).
 *   - buildBoss({ cadence, themes, seedKey, level }) — the shared boss factory. It
 *     picks a theme (`themes[hash(seedKey) % themes.length]`) and scales HP + rewards
 *     by the player level per the cadence's tuning, returning a fresh boss object.
 *     The boss-object SHAPE used to be hand-copied in generateDailyBoss /
 *     generateWeeklyBoss / challengeMonthlyBoss AND the cadence formulas were also
 *     re-derived inside renderMonthlyBossChallenge (the "here's what you'll face"
 *     preview) — a live drift risk. Both now flow through this one function.
 *
 * SIDE EFFECTS STAY IN THE MANAGER: assigning `this.dailyBoss` / `this.weeklyBoss` /
 * `this.monthlyBoss`, the `addBossLog(...)` UI line, and (monthly) `saveData()` +
 * `renderBossBattles()` remain in goal-manager.js. This module only COMPUTES the
 * boss object — it holds no state and touches no DOM.
 *
 * Cadence tuning (unchanged from the original inline formulas):
 *   - daily:   bossLevel max(1, ⌊lvl/2⌋),  HP 8 + ⌊lvl/3⌋,      xp 50 + 20·bl,  gold 30 + 15·bl
 *   - weekly:  bossLevel max(1, lvl),       HP 30 + 5·⌊lvl/2⌋,   xp 200 + 30·bl, gold 150 + 25·bl
 *   - monthly: bossLevel max(1, lvl),       HP 100 + 10·lvl,     xp 500 + 50·bl, gold 400 + 40·bl
 * (HP scales on the RAW level; rewards scale on the derived bossLevel — matching the
 * original exactly.)
 *
 * Dual-environment, no bundler (mirrors balance.js / loot-engine.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.BOSS_GENERATOR. goal-manager.js captures it into a
 *     module-scoped const and delegates from the boss methods.
 *   - Jest/Node: `require('./boss-generator.js')` returns the object via
 *     module.exports (and also sets window.BOSS_GENERATOR under jsdom).
 */
(function () {
    /**
     * Deterministic string→non-negative-int hash (djb2-ish, `<<5` variant). Used to
     * seed which boss theme spawns for a date key. Pure.
     * @param {string} str
     * @returns {number}
     */
    function hashDateString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    /**
     * @typedef {{
     *   spawnField: string,
     *   bossLevel: (lvl: number) => number,
     *   maxHP: (lvl: number) => number,
     *   xp: (bossLevel: number) => number,
     *   gold: (bossLevel: number) => number
     * }} CadenceConfig
     */

    /** @type {Record<string, CadenceConfig>} */
    const CADENCE = {
        daily: {
            spawnField: 'spawnDate',
            bossLevel: (lvl) => Math.max(1, Math.floor(lvl / 2)),
            maxHP: (lvl) => 8 + Math.floor(lvl / 3),
            xp: (bl) => 50 + bl * 20,
            gold: (bl) => 30 + bl * 15,
        },
        weekly: {
            spawnField: 'spawnWeek',
            bossLevel: (lvl) => Math.max(1, lvl),
            maxHP: (lvl) => 30 + Math.floor(lvl / 2) * 5,
            xp: (bl) => 200 + bl * 30,
            gold: (bl) => 150 + bl * 25,
        },
        monthly: {
            spawnField: 'spawnMonth',
            bossLevel: (lvl) => Math.max(1, lvl),
            maxHP: (lvl) => 100 + lvl * 10,
            xp: (bl) => 500 + bl * 50,
            gold: (bl) => 400 + bl * 40,
        },
    };

    /**
     * Build a fresh boss object for the given cadence. Picks a theme by hashing the
     * seed key and scaling by player level. PURE — returns a new object every call.
     * @param {{ cadence: string, themes: any[], seedKey: string, level: number }} args
     *   - cadence: 'daily' | 'weekly' | 'monthly'
     *   - themes: the theme pool for that cadence (from boss-themes.js)
     *   - seedKey: the date key that both seeds the theme AND is stored as the spawn
     *     stamp (today's date / ISO week / 'YYYY-MM')
     *   - level: the player's current level
     * @returns {Record<string, any>}
     */
    function buildBoss({ cadence, themes, seedKey, level }) {
        const cfg = CADENCE[cadence];
        const seed = hashDateString(seedKey);
        const theme = themes[seed % themes.length];
        const bossLevel = cfg.bossLevel(level);
        const maxHP = cfg.maxHP(level);
        /** @type {Record<string, any>} */
        const boss = {
            name: theme.name,
            icon: theme.icon,
            flavor: theme.flavor,
            particleType: theme.particleType, // v2.9 Track 5
            maxHP: maxHP,
            currentHP: maxHP,
            level: bossLevel,
            type: cadence,
            defeated: false,
            totalDamage: 0,
            rewards: {
                xp: cfg.xp(bossLevel),
                gold: cfg.gold(bossLevel),
            },
        };
        // Cadence-specific spawn stamp (spawnDate / spawnWeek / spawnMonth).
        boss[cfg.spawnField] = seedKey;
        return boss;
    }

    const BOSS_GENERATOR = Object.freeze({ hashDateString, buildBoss });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic BOSS_GENERATOR property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.BOSS_GENERATOR = BOSS_GENERATOR;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = BOSS_GENERATOR;
})();
