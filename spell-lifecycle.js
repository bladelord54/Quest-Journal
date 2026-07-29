// @ts-check
'use strict';
/**
 * spell-lifecycle.js — pure active-spell state math (Engineering Roadmap #1).
 *
 * 69th incremental slice of the goal-manager.js God class, and the SEVENTEENTH LOGIC extraction (the
 * loot-engine / boss-generator / persistence-migrations / streak-logic / leveling-logic / effort-xp-logic /
 * buff-multipliers / companion-logic / class-perks / class-progression / skill-points / crystal-economy /
 * charge-rules / combat-damage / reward-economy / focus-session-logic pattern).
 *
 * The `activeSpells` array was read at THIRTEEN call sites using THREE mutually inconsistent phrasings of the
 * single question "is this spell active?":
 *
 *   A. `spellId === X && (expiresAt === -1 || expiresAt > now)`  — 4 sites (time_freeze, streak_shield ×2,
 *      focus_mode)
 *   B. `spellId === X && expiresAt > now`                        — 2 sites (boss_slayer, critical_strike)
 *   C. `spellId === X`  (no expiry check at all)                 — 7 sites (berserker_rage, execute,
 *      quest_doubler, lucky_draw, the cast guard, 2 render reads)
 *
 * …plus the consume idiom `filter(s => s.spellId !== X)` hand-written SIX times.
 *
 * IMPORTANT — this was a LATENT-DRIFT slice, not a bug fix. Every one of those sites was already CORRECT
 * against the current `spell-definitions.js`, and that was verified spell-by-spell before extracting:
 *
 *   - Variant B's two spells are both finite (boss_slayer 7 days, critical_strike 24h), so there is no
 *     `-1` for the missing branch to miss.
 *   - Variant C's spells all declare `duration: -1` (trigger-consumed — they never time-expire, they are
 *     removed on use), so skipping the expiry check is right for them.
 *   - Variant A's spells are ALL finite, which means its `expiresAt === -1` branch was DEAD CODE at all four
 *     sites — and actively misleading, since it implies focus_mode could be permanent when it cannot.
 *
 * The exposure was therefore conditional but real: the "time-based vs trigger-consumed" distinction was
 * IMPLICIT knowledge duplicated across thirteen sites with no single source of truth. Re-balance focus_mode to
 * `-1`, or give lucky_draw a finite duration, and several sites silently stop working — the exact shape of the
 * July 2026 loot bug. `isTriggerConsumed` now names that distinction once, and a test walks EVERY spell
 * definition through it so a future duration change fails loudly instead of drifting.
 *
 * `isActive` deliberately adopts variant A's full predicate, which is behaviour-identical at ten of the
 * thirteen sites given current definitions. THREE SITES DELIBERATELY KEPT their bare `spellId` check and were
 * NOT swapped: the `castSpell` "already active" guard and the two spellbook-card `isActive` reads. For a
 * FINITE spell that has expired but not yet been swept by the `checkExpiredSpells` interval, a bare check
 * reports "active" while this predicate reports "expired" — so switching them would let a player re-cast
 * marginally sooner and would change which card renders as active. That is a GAMEPLAY change, not a
 * refactor, so it stays out of this slice.
 *
 * The PURE functions:
 *
 *   - isActive(spells, spellId, now) / findActive(spells, spellId, now) — the canonical predicate; findActive
 *     returns the entry or null.
 *   - consume(spells, spellId) — a NEW array with every entry of that spell removed (trigger-consumption).
 *   - expirySweep(spells, now) — {kept, expired}, splitting on the same rule the two filters used: permanent
 *     entries and future expiries are kept, `expiresAt <= now` is expired.
 *   - effectiveDuration(duration, multiplier) — class perks extend TIMED spells only; the `-1` and `0`
 *     sentinels pass through untouched.
 *   - castEntry(spell, {now, effectiveDuration, overcharged}) — the active-spell record, or null for an
 *     INSTANT (duration 0) spell that never enters the array. The permanent branch intentionally omits the
 *     `overcharged` key, exactly as the inline code did.
 *   - isTriggerConsumed(def) / isInstant(def) — names the definition-level distinction.
 *
 * Everything impure stays on the class: `Date.now()` at the call sites, the `this.activeSpells` writes, the
 * expiry toasts, `saveData`, the re-renders, charge/refund handling and every instant-effect dispatch.
 *
 * Dual-environment, no bundler (mirrors focus-session-logic.js):
 *   - Browser: loaded as a plain <script> BEFORE goal-manager.js in index.html; attaches to
 *     window.SPELL_LIFECYCLE. goal-manager.js captures it into a module-scoped const and delegates.
 *   - Jest/Node: require('./spell-lifecycle.js') returns the frozen object via module.exports (and also sets
 *     window.SPELL_LIFECYCLE under jsdom).
 */
(function () {
    /**
     * @typedef {{ spellId: string, castedAt?: number, expiresAt: number, overcharged?: any }} ActiveSpell
     */

    /** `duration`/`expiresAt` sentinel: active until triggered, never expires on a clock. */
    const PERMANENT = -1;
    /** `duration` sentinel: an instant effect that never enters the activeSpells array. */
    const INSTANT = 0;

    /**
     * The canonical "is this spell active right now" predicate: the id matches AND the entry is either
     * permanent or not yet expired. PURE.
     * @param {ActiveSpell[]|null|undefined} spells
     * @param {string} spellId
     * @param {number} now epoch ms
     * @returns {boolean}
     */
    function isActive(spells, spellId, now) {
        return (spells || []).some(s => s.spellId === spellId && (s.expiresAt === PERMANENT || s.expiresAt > now));
    }

    /**
     * The active entry for a spell, or null. Same predicate as isActive. PURE.
     * @param {ActiveSpell[]|null|undefined} spells
     * @param {string} spellId
     * @param {number} now epoch ms
     * @returns {ActiveSpell|null}
     */
    function findActive(spells, spellId, now) {
        return (spells || []).find(s => s.spellId === spellId && (s.expiresAt === PERMANENT || s.expiresAt > now)) || null;
    }

    /**
     * A NEW array with every entry of the given spell removed — trigger-consumption. Does not mutate. PURE.
     * @param {ActiveSpell[]|null|undefined} spells
     * @param {string} spellId
     * @returns {ActiveSpell[]}
     */
    function consume(spells, spellId) {
        return (spells || []).filter(s => s.spellId !== spellId);
    }

    /**
     * Split the active spells into those that survive and those that just expired. Permanent entries are
     * NEVER expired by the clock; `expiresAt <= now` is expired. PURE.
     * @param {ActiveSpell[]|null|undefined} spells
     * @param {number} now epoch ms
     * @returns {{ kept: ActiveSpell[], expired: ActiveSpell[] }}
     */
    function expirySweep(spells, now) {
        const all = spells || [];
        return {
            kept: all.filter(s => s.expiresAt === PERMANENT || s.expiresAt > now),
            expired: all.filter(s => s.expiresAt !== PERMANENT && s.expiresAt <= now),
        };
    }

    /**
     * Apply a duration multiplier (Wizard Sustained Casting / Archmage) to a spell duration. Only TIMED
     * spells scale — the -1 and 0 sentinels pass through untouched so an "until triggered" spell can never be
     * turned into a timed one by a perk. PURE.
     * @param {number} duration
     * @param {number} multiplier
     * @returns {number}
     */
    function effectiveDuration(duration, multiplier) {
        return duration > 0 ? Math.round(duration * (multiplier || 1)) : duration;
    }

    /**
     * True when a definition is "active until triggered" rather than clock-bound. This is the single source of
     * truth for the distinction that used to be implicit across thirteen call sites. PURE.
     * @param {{ duration?: number }|null|undefined} def
     * @returns {boolean}
     */
    function isTriggerConsumed(def) {
        return !!def && def.duration === PERMANENT;
    }

    /**
     * True for an instant-effect definition, which never enters the activeSpells array at all. PURE.
     * @param {{ duration?: number }|null|undefined} def
     * @returns {boolean}
     */
    function isInstant(def) {
        return !!def && def.duration === INSTANT;
    }

    /**
     * Build the activeSpells record for a cast, or null for an instant spell that never enters the array.
     * The permanent branch intentionally omits `overcharged` (an until-triggered cast records no
     * overcharge flag), matching the inline code exactly. PURE.
     * @param {{ id: string, duration: number }|null|undefined} spell
     * @param {{ now?: number, effectiveDuration?: number, overcharged?: any }} [opts]
     * @returns {ActiveSpell|null}
     */
    function castEntry(spell, opts) {
        if (!spell) return null;
        const o = opts || {};
        const now = o.now || 0;
        if (spell.duration > 0) {
            const dur = o.effectiveDuration === undefined ? spell.duration : o.effectiveDuration;
            return { spellId: spell.id, castedAt: now, expiresAt: now + dur, overcharged: o.overcharged };
        }
        if (spell.duration === PERMANENT) {
            return { spellId: spell.id, castedAt: now, expiresAt: PERMANENT };
        }
        return null;
    }

    const SPELL_LIFECYCLE = Object.freeze({
        PERMANENT,
        INSTANT,
        isActive,
        findActive,
        consume,
        expirySweep,
        effectiveDuration,
        isTriggerConsumed,
        isInstant,
        castEntry,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the dynamic
    // SPELL_LIFECYCLE property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.SPELL_LIFECYCLE = SPELL_LIFECYCLE;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = SPELL_LIFECYCLE;
})();
