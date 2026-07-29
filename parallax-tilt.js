// @ts-check
/**
 * v2.7 Phase 4 — Parallax Tilt for Epic+ Items
 * ──────────────────────────────────────────────────────────────────────────
 * Wires a pointer-tracked 3D tilt and a follow-the-cursor sheen highlight
 * to any element matching `.rarity-frame[data-rarity="epic"]` or
 * `[data-rarity="legendary"]`. Operates purely by writing CSS custom
 * properties (`--tilt-x`, `--tilt-y`, `--mx`, `--my`) on the hovered card;
 * the actual transform + radial-gradient paint is defined in animations.css.
 *
 * Why event delegation
 *   Cards are dynamically rendered (spells, companions, loot drops) and
 *   re-created on every render() cycle. Attaching listeners to each card
 *   would require re-binding after every render. A single set of delegated
 *   pointer listeners on `document` survives all re-renders for free.
 *
 * Why rAF batching
 *   `pointermove` can fire up to ~1000Hz on modern hardware. We coalesce
 *   updates into a single rAF tick so we never write the same CSS custom
 *   properties more than once per frame.
 *
 * Gates
 *   - Touch (`(hover: none)`)              → bail at init, never attach.
 *   - `prefers-reduced-motion: reduce`     → bail at init, never attach.
 *   - `body.fx-reduced`                    → clamp max tilt from 8° to 4°.
 *   - `body.fx-minimal`                    → bail at runtime (re-checked
 *                                            per pointermove so toggling
 *                                            intensity in Tools applies
 *                                            without a reload).
 */
(function () {
    'use strict';

    // Max rotation in degrees. 8° is roughly the threshold above which the
    // tilt starts reading as a "card on a hinge" rather than an ambient
    // depth cue; below ~3° it's nearly invisible.
    const MAX_TILT_DEG = 8;
    const MAX_TILT_DEG_REDUCED = 4;

    const SELECTOR = '.rarity-frame[data-rarity="epic"], .rarity-frame[data-rarity="legendary"]';

    // These states never change at runtime in practice (you don't plug
    // in a mouse mid-session, and reduced-motion is an OS-level setting),
    // so we can early-return instead of re-checking each pointer event.
    const isTouch = window.matchMedia('(hover: none)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    // Pending state coalesced into a single rAF flush per frame.
    /** @type {HTMLElement | null} */
    let pendingCard = null;
    let pendingX = 0;       // normalized 0..1 within card rect
    let pendingY = 0;
    let rafId = 0;

    function flush() {
        rafId = 0;
        if (!pendingCard) return;
        const card = pendingCard;

        // Live opt-out: if the user flipped intensity to "minimal" via
        // the Tools view between this and the previous frame, drop the
        // tilt immediately rather than waiting for a page reload.
        if (document.body.classList.contains('fx-minimal')) {
            clearCard(card);
            pendingCard = null;
            return;
        }

        const maxTilt = document.body.classList.contains('fx-reduced')
            ? MAX_TILT_DEG_REDUCED
            : MAX_TILT_DEG;

        // Map normalized pointer (0..1) → tilt range (-maxTilt..+maxTilt).
        // Y-axis inverted so the card "leans toward" the cursor: pointer
        // at the top edge tilts the top edge AWAY (negative rotateX) which
        // matches how a real card would behave under a light source above.
        const tiltY = (pendingX - 0.5) * 2 * maxTilt;   // rotateY: left/right tilt
        const tiltX = (0.5 - pendingY) * 2 * maxTilt;   // rotateX: top/bottom tilt
        const mx = (pendingX * 100).toFixed(2) + '%';
        const my = (pendingY * 100).toFixed(2) + '%';

        card.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', tiltY.toFixed(2) + 'deg');
        card.style.setProperty('--mx', mx);
        card.style.setProperty('--my', my);
    }

    /** @param {HTMLElement} card */
    function clearCard(card) {
        // Remove BOTH the class and the inline custom properties — leaving
        // properties around would let the next pointermove inherit stale
        // values during the rAF gap before the new card's flush.
        card.classList.remove('is-tilting');
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
    }

    document.addEventListener('pointermove', (e) => {
        // Skip touch events delivered through the unified pointer pipeline.
        // The `(hover: none)` gate above handles touch-only devices, but a
        // 2-in-1 with both touch + trackpad can still produce touch
        // pointermoves — those should NOT tilt the card.
        if (e.pointerType === 'touch') return;

        const card = /** @type {HTMLElement | null} */ (
            /** @type {Element | null} */ (e.target)?.closest(SELECTOR) ?? null
        );
        if (!card) {
            // Pointer left an epic+ card without entering another one.
            // Reset whatever was last active so it springs back to rest.
            if (pendingCard) {
                clearCard(pendingCard);
                pendingCard = null;
            }
            return;
        }

        const rect = card.getBoundingClientRect();
        // Clamp to [0, 1] — pointermove can fire one frame outside the
        // bounding rect during fast cursor sweeps; clamping avoids
        // overshoot tilt past the configured max.
        pendingX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        pendingY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        if (pendingCard !== card) {
            if (pendingCard) clearCard(pendingCard);
            pendingCard = card;
            card.classList.add('is-tilting');
        }

        if (!rafId) rafId = requestAnimationFrame(flush);
    }, { passive: true });

    // pointerout with `relatedTarget === null` fires when the cursor
    // leaves the viewport entirely (alt-tab, dragging out the top of
    // the window). Without this, a card mid-tilt would stay tilted
    // until the user moused back over a non-card area.
    document.addEventListener('pointerout', (e) => {
        if (!e.relatedTarget && pendingCard) {
            clearCard(pendingCard);
            pendingCard = null;
        }
    }, { passive: true });
})();
