// @ts-check
'use strict';
/**
 * persistence-migrations.js — the pure save-data normalizers (Engineering Roadmap #1).
 *
 * Fourteenth incremental slice of the goal-manager.js God class. `loadData()` is the
 * riskiest method in the app (it rehydrates ~150 `this.*` fields from localStorage), so
 * this slice deliberately extracts ONLY the parts with real LOGIC — the legacy-save
 * migrations — and leaves every `this.x = data.x || default` field-mapping, the
 * localStorage I/O, and the corrupted-save backup handling exactly where they are.
 *
 * Each function is pure (well, it mutates the array/object it's HANDED, matching the
 * original in-place behaviour) and takes no `this`, so they're unit-testable in
 * isolation. loadData now delegates to them; the existing loadData integration tests +
 * the Save/Load round-trip test remain the end-to-end safety net.
 *
 * (Roadmap #1, 21st slice) It also now holds the SAVE-side list pruning that `_doSave`
 * runs before persisting — `pruneArchivedGoals` / `pruneBossLog`, same mutate-what-you're-
 * handed style; `_doSave` reassigns `this.archivedGoals` / `this.bossLog` from their return.
 *
 * Why this is worth doing (the roadmap's whole thesis — kill duplicated knowledge):
 * the companion name→type table was HAND-COPIED in two places in loadData — a 4-entry
 * subset for the legacy single-companion path and the full 12-entry table for the
 * collection path. Two copies of the same map is exactly how the July 2026 loot bug
 * started. They are now ONE frozen table, `COMPANION_NAME_TO_TYPE`. The single-companion
 * path therefore upgrades from 4 → 12 known names; this is a strict SUPERSET (all four
 * original names map identically) and only ever improves inference for the (practically
 * nonexistent) legacy single companion whose name is outside the original four — it can
 * never regress the four known cases.
 *
 * Dual-environment, no bundler (mirrors loot-engine.js / boss-generator.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html;
 *     attaches to window.PERSISTENCE_MIGRATIONS. goal-manager.js captures it into a
 *     module-scoped const and delegates from loadData().
 *   - Jest/Node: `require('./persistence-migrations.js')` returns the object via
 *     module.exports (and also sets window.PERSISTENCE_MIGRATIONS under jsdom).
 */
(function () {
    /**
     * The single source of truth mapping a companion's display name to its type id.
     * Frozen so neither migration path can mutate it.
     * @type {Readonly<Record<string, string>>}
     */
    const COMPANION_NAME_TO_TYPE = Object.freeze({
        'Baby Dragon': 'dragon',
        'Wise Owl': 'owl',
        'Loyal Wolf': 'wolf',
        'Phoenix': 'phoenix',
        'Lucky Cat': 'cat',
        'Swift Rabbit': 'rabbit',
        'Clever Fox': 'fox',
        'Ancient Turtle': 'turtle',
        'Golden Eagle': 'eagle',
        'Mighty Bear': 'bear',
        'Mystic Unicorn': 'unicorn',
        'Legendary Lion': 'lion',
    });

    /** Valid goal priority enum; anything else normalizes to 'medium'. */
    const VALID_PRIORITIES = Object.freeze(['low', 'medium', 'high']);

    /**
     * Infer a companion type id from its display name, defaulting to 'wolf' for
     * unknown names (matching the original `nameToType[name] || 'wolf'`).
     * @param {string=} name
     * @returns {string}
     */
    function inferCompanionType(name) {
        return (name && COMPANION_NAME_TO_TYPE[name]) || 'wolf';
    }

    /**
     * Legacy single-companion → collection migration: ensure a `type` (inferred from
     * name) and a `rarity` (defaulting to 'rare'). Mutates + returns the companion.
     * The push into `this.companions` + `this.activeCompanionId` stamp stay in loadData.
     * @param {any} companion
     * @returns {any}
     */
    function migrateLegacySingleCompanion(companion) {
        if (!companion) return companion;
        if (!companion.type) companion.type = inferCompanionType(companion.name);
        if (!companion.rarity) companion.rarity = 'rare';
        return companion;
    }

    /**
     * Ensure every companion in the collection has a `rarity` (default 'rare') and,
     * when a name is present, an inferred `type`. Mutates the array's items in place.
     * @param {any[]} companions
     * @returns {any[]}
     */
    function migrateCompanionCollection(companions) {
        if (!Array.isArray(companions)) return companions;
        companions.forEach((comp) => {
            if (!comp) return;
            if (!comp.rarity) comp.rarity = 'rare';
            if (!comp.type && comp.name) comp.type = inferCompanionType(comp.name);
        });
        return companions;
    }

    /**
     * Defensive legacy class-id rename: 'mystic' → 'wizard'; everything else
     * (including null) passes through unchanged.
     * @param {string|null=} playerClass
     * @returns {string|null|undefined}
     */
    function normalizeClassId(playerClass) {
        return playerClass === 'mystic' ? 'wizard' : playerClass;
    }

    /**
     * Backfill `title` from `name` for any item missing a title, across every list
     * passed in (fixes the old starter-task `name`-only bug). Mutates in place.
     * @param {any[][]} arrays
     */
    function migrateTaskTitles(arrays) {
        if (!Array.isArray(arrays)) return;
        arrays.forEach((arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((item) => {
                if (item && !item.title && item.name) item.title = item.name;
            });
        });
    }

    /**
     * Give every task missing a `dueDate` today's date. `today` is INJECTED (the
     * caller passes this.getTodayDateString()) so this stays pure/testable.
     * @param {any[]} tasks
     * @param {string} today
     */
    function backfillDueDates(tasks, today) {
        if (!Array.isArray(tasks)) return;
        tasks.forEach((task) => {
            if (task && !task.dueDate) task.dueDate = today;
        });
    }

    /**
     * Normalize each goal's `priority` to the valid enum, defaulting missing/invalid
     * values to 'medium'. Mutates in place.
     * @param {any[]} goals
     */
    function normalizeGoalPriorities(goals) {
        if (!Array.isArray(goals)) return;
        goals.forEach((g) => {
            if (!g) return;
            if (!g.priority || !VALID_PRIORITIES.includes(g.priority)) g.priority = 'medium';
        });
    }

    /**
     * Cap `archivedGoals` at the `cap` (default 500) most recent to stop unbounded
     * localStorage growth. Only touches the array when it EXCEEDS the cap: sorts it by
     * archived date DESCENDING in place (newest first — `archivedAt`, then `archivedDate`,
     * missing → '') and returns the top `cap`; otherwise returns it unchanged. The
     * previously-documented "keep all < 6 months" cutoff was dead code (computed, never
     * applied) and is intentionally dropped — a hard cap alone is simpler and never deletes
     * an archive while the list is small (v2.9.x audit fix).
     * @param {any[]} archivedGoals
     * @param {number} [cap=500]
     * @returns {any[]}
     */
    function pruneArchivedGoals(archivedGoals, cap = 500) {
        if (!Array.isArray(archivedGoals) || archivedGoals.length <= cap) return archivedGoals;
        archivedGoals.sort((a, b) =>
            (b.archivedAt || b.archivedDate || '') > (a.archivedAt || a.archivedDate || '') ? 1 : -1
        );
        return archivedGoals.slice(0, cap);
    }

    /**
     * Cap the boss battle log at the `cap` (default 200) most RECENT entries. Returns the
     * last `cap` when over the cap, else the list unchanged.
     * @param {any[]} bossLog
     * @param {number} [cap=200]
     * @returns {any[]}
     */
    function pruneBossLog(bossLog, cap = 200) {
        if (!Array.isArray(bossLog) || bossLog.length <= cap) return bossLog;
        return bossLog.slice(-cap);
    }

    const PERSISTENCE_MIGRATIONS = Object.freeze({
        COMPANION_NAME_TO_TYPE,
        inferCompanionType,
        migrateLegacySingleCompanion,
        migrateCompanionCollection,
        normalizeClassId,
        migrateTaskTitles,
        backfillDueDates,
        normalizeGoalPriorities,
        pruneArchivedGoals,
        pruneBossLog,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic PERSISTENCE_MIGRATIONS property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.PERSISTENCE_MIGRATIONS = PERSISTENCE_MIGRATIONS;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = PERSISTENCE_MIGRATIONS;
})();
