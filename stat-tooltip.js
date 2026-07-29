// @ts-check
/* ===================================================================
   StatTooltip — v2.6 Item 6
   ===================================================================
   Tap-friendly stat-breakdown tooltips for the character sheet (and
   anywhere else we want to surface "where does this number come from?"
   without dedicating panel real-estate to a permanent breakdown row).

   Triggering surface
   ──────────────────
   Any element with `data-stat-tooltip="<key>"` becomes a trigger:

       <div data-stat-tooltip="xp">142 XP</div>

   On desktop:  hovering for 250ms shows the tooltip; mouseleave hides.
   On touch:    a single tap shows the tooltip and auto-hides after
                3s; tap-elsewhere dismisses sooner.
   Always:      `Escape` dismisses; only one tooltip visible at a time.

   Why single-tap (not long-press) on touch
   ────────────────────────────────────────
   The original revision used a 500ms long-press, matching Android's
   native long-press gesture. In practice that collides with the
   system text-selection long-press, which surfaces a Copy/Cut/Paste
   menu over our content (especially on numeric stat values that the
   selection engine happily treats as selectable text). Switching to
   single-tap eliminates the collision entirely; we additionally set
   `user-select: none` and `-webkit-touch-callout: none` on the
   triggers via CSS to suppress any remaining selection chrome.

   Single-tap also has to coexist with parent click handlers (the
   Quest Analytics card has its own onclick that navigates to the
   analytics view). The tap handler calls `stopPropagation()` on the
   trigger's pointer event so the parent's click does not fire when
   the user is reaching for a breakdown.

   Why a custom module instead of the native `title` attribute
   ───────────────────────────────────────────────────────────
   • `title` works only on desktop hover — invisible on mobile, which
     is the primary platform for this app.
   • `title` can't render rich content (multiple lines, icons, color
     accents per breakdown row).
   • `title` is not styleable; this app's look-and-feel demands a
     parchment/dark-glass aesthetic, not the OS's native chrome.

   How breakdowns are sourced
   ──────────────────────────
   The module calls `window.goalManager.getStatBreakdown(key)` and
   expects an array of `{ label, value, accent }` rows back. If the
   method is missing or returns nothing, the tooltip silently no-ops
   (graceful degradation — non-fatal if the page loads before
   goal-manager.js or if a key isn't recognized).

   Performance
   ───────────
   • Single shared DOM element (`#stat-tooltip`) reused for every
     trigger — no per-element overhead.
   • Event delegation from `document` so dynamically rendered stat
     elements (e.g., the stats inside `panel-companion`'s render) work
     without re-attaching listeners.
   • The module respects `effectsManager.intensity` only insofar as
     the show/hide *opacity-fade* duration is shortened on `reduced`
     and zeroed on `minimal` via CSS — the tooltip itself always
     surfaces, since it's information, not chrome.
   ================================================================== */
(() => {
    'use strict';

    // Single shared tooltip element id; created lazily on first use so
    // the module can be loaded before the DOM is fully built without
    // throwing.
    const TOOLTIP_ID = 'stat-tooltip';

    // Hover delay (mouse): how long the user must hover before the
    // tooltip appears. Long enough to avoid accidental triggers on
    // pass-over, short enough to feel responsive.
    const HOVER_DELAY_MS = 250;

    // Auto-hide delay after a tap-to-show on touch devices. 3.5s is
    // long enough to read 4-6 breakdown rows but short enough that the
    // tooltip doesn't linger past the player's attention.
    const TAP_AUTOHIDE_MS = 3500;

    // Movement tolerance for the tap-vs-swipe heuristic: if the
    // touchstart→touchend pointer moves more than this many pixels,
    // it's a scroll/swipe gesture and we should NOT treat it as a tap.
    const TAP_MOVE_TOLERANCE = 10;

    /** @type {HTMLElement | null} */
    let tooltipEl = null;
    /** @type {HTMLElement | null} */
    let activeTrigger = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let pendingTimer = null;       // hover-delay timer (desktop only)
    /** @type {ReturnType<typeof setTimeout> | null} */
    let autohideTimer = null;      // auto-hide timer after a touch tap
    /** @type {{ x: number, y: number, trigger: HTMLElement } | null} */
    let touchStart = null;         // { x, y, trigger } captured on touchstart

    function ensureTooltipEl() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.getElementById(TOOLTIP_ID);
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = TOOLTIP_ID;
            tooltipEl.className = 'stat-tooltip';
            tooltipEl.setAttribute('role', 'tooltip');
            tooltipEl.setAttribute('aria-hidden', 'true');
            document.body.appendChild(tooltipEl);
        }
        return tooltipEl;
    }

    /**
     * Render the tooltip content from a breakdown array.
     * Returns false if the breakdown is empty (caller should not show).
     */
    /** @param {string} key @param {HTMLElement} trigger */
    function renderContent(key, trigger) {
        const gm = /** @type {any} */ (window).goalManager;
        if (!gm || typeof gm.getStatBreakdown !== 'function') return false;

        /** @type {any} */
        let breakdown;
        try {
            breakdown = gm.getStatBreakdown(key, trigger);
        } catch (err) {
            // Defensive: a broken breakdown function shouldn't crash
            // the page. Log and bail.
            console.warn('[StatTooltip] getStatBreakdown threw for key', key, err);
            return false;
        }
        if (!breakdown || !breakdown.rows || breakdown.rows.length === 0) {
            return false;
        }

        const titleHtml = breakdown.title
            ? `<div class="stat-tooltip__title">${escapeHtml(breakdown.title)}</div>`
            : '';
        const rowsHtml = breakdown.rows.map((/** @type {any} */ row) => {
            const accent = row.accent ? ` stat-tooltip__row--${escapeHtml(row.accent)}` : '';
            return `
                <div class="stat-tooltip__row${accent}">
                    <span class="stat-tooltip__row-label">${escapeHtml(row.label)}</span>
                    <span class="stat-tooltip__row-value">${escapeHtml(row.value)}</span>
                </div>
            `;
        }).join('');
        const footHtml = breakdown.footnote
            ? `<div class="stat-tooltip__footnote">${escapeHtml(breakdown.footnote)}</div>`
            : '';

        const el = ensureTooltipEl();
        el.innerHTML = titleHtml + rowsHtml + footHtml;
        return true;
    }

    /**
     * Position the tooltip relative to the trigger element.
     * Prefers above the trigger; falls back to below if no room above.
     * Always clamps to the viewport with an 8px margin.
     */
    /** @param {HTMLElement} trigger */
    function positionTooltip(trigger) {
        const el = ensureTooltipEl();
        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const MARGIN = 8;
        const GAP = 10;

        // Vertical: prefer above, fall back to below.
        let top;
        if (triggerRect.top - tooltipRect.height - GAP >= MARGIN) {
            top = triggerRect.top - tooltipRect.height - GAP;
            el.classList.add('stat-tooltip--above');
            el.classList.remove('stat-tooltip--below');
        } else {
            top = triggerRect.bottom + GAP;
            el.classList.add('stat-tooltip--below');
            el.classList.remove('stat-tooltip--above');
        }

        // Horizontal: center on trigger, then clamp.
        let left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        left = Math.max(MARGIN, Math.min(left, vw - tooltipRect.width - MARGIN));
        top = Math.max(MARGIN, Math.min(top, vh - tooltipRect.height - MARGIN));

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }

    /** @param {HTMLElement | null} trigger */
    function show(trigger) {
        if (!trigger || activeTrigger === trigger) return;
        const key = trigger.getAttribute('data-stat-tooltip');
        if (!key) return;

        const rendered = renderContent(key, trigger);
        if (!rendered) return;

        const el = ensureTooltipEl();
        el.classList.add('stat-tooltip--visible');
        el.setAttribute('aria-hidden', 'false');
        // Position AFTER content render so dimensions are accurate.
        // requestAnimationFrame so the browser has laid out the new
        // innerHTML before we measure it.
        requestAnimationFrame(() => positionTooltip(trigger));

        activeTrigger = trigger;
    }

    function hide() {
        if (!activeTrigger) return;
        const el = ensureTooltipEl();
        el.classList.remove('stat-tooltip--visible');
        el.setAttribute('aria-hidden', 'true');
        activeTrigger = null;
    }

    function clearPendingTimer() {
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
        }
    }

    /** @param {EventTarget | null} target @returns {HTMLElement | null} */
    function findTrigger(target) {
        // Walk up the DOM looking for an element with the data attr.
        // Cap at 6 levels so we don't traverse the whole tree.
        let el = /** @type {Element | null} */ (target);
        for (let i = 0; i < 6 && el; i++) {
            if (el.hasAttribute && el.hasAttribute('data-stat-tooltip')) return /** @type {HTMLElement} */ (el);
            el = el.parentElement;
        }
        return null;
    }

    /** @param {*} s */
    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─── Mouse (desktop) ────────────────────────────────────────────
    document.addEventListener('mouseover', (e) => {
        const trigger = findTrigger(e.target);
        if (!trigger) return;
        clearPendingTimer();
        pendingTimer = setTimeout(() => show(trigger), HOVER_DELAY_MS);
    });

    document.addEventListener('mouseout', (e) => {
        const trigger = findTrigger(e.target);
        if (!trigger) return;
        // Only hide if the relatedTarget (where the mouse moved to)
        // is outside the trigger AND outside the tooltip itself —
        // moving from trigger into the tooltip shouldn't dismiss.
        const movedTo = /** @type {Node | null} */ (e.relatedTarget);
        if (movedTo && (trigger.contains(movedTo) || (tooltipEl && tooltipEl.contains(movedTo)))) {
            return;
        }
        clearPendingTimer();
        hide();
    });

    // ─── Touch (mobile single-tap) ──────────────────────────────────
    // Strategy: capture touchstart coordinates, then on touchend
    // verify the pointer didn't move much (= it was a tap, not a
    // swipe/scroll). On a confirmed tap, show the tooltip and
    // stop the click event from bubbling to parent handlers.
    document.addEventListener('touchstart', (e) => {
        const trigger = findTrigger(e.target);
        if (!trigger) {
            touchStart = null;
            return;
        }
        const touch = e.touches[0];
        touchStart = { x: touch.clientX, y: touch.clientY, trigger };
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!touchStart) return;
        const t = touchStart;
        touchStart = null;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - t.x;
        const dy = touch.clientY - t.y;
        if (Math.hypot(dx, dy) > TAP_MOVE_TOLERANCE) {
            // It was a swipe/scroll, not a tap — don't show tooltip.
            return;
        }
        // Confirmed tap on a tooltip trigger. Show the tooltip and
        // schedule auto-hide. The companion `click` listener below
        // calls stopPropagation on touch-originated clicks so the
        // parent card's onclick (e.g., "open analytics") does not
        // also fire from this tap.
        if (autohideTimer) { clearTimeout(autohideTimer); autohideTimer = null; }
        // Toggle behavior: tapping the same trigger again hides the
        // tooltip immediately (matches user mental model of "tap to
        // peek, tap again to dismiss").
        if (activeTrigger === t.trigger) {
            hide();
            return;
        }
        show(t.trigger);
        autohideTimer = setTimeout(hide, TAP_AUTOHIDE_MS);
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        touchStart = null;
    });

    // Click capture: suppress the synthetic click that follows a
    // touchend on a tooltip trigger. Without this, the parent card's
    // onclick handler (e.g., the Quest Analytics card navigating to
    // the analytics view) fires every time the player taps a stat to
    // see its breakdown. Using `capture: true` so we intercept BEFORE
    // the parent's listener runs. We only suppress when the click was
    // a tap to reveal the tooltip — desktop mouse clicks on stat
    // elements that have no other behavior pass through normally.
    document.addEventListener('click', (e) => {
        const trigger = findTrigger(e.target);
        if (!trigger) return;
        // If the tooltip is currently visible for this trigger, the
        // click was the tap that opened it (or a follow-up dismiss);
        // either way, do not let it propagate to the parent card.
        if (activeTrigger === trigger || autohideTimer) {
            e.stopPropagation();
        }
    }, true);

    // ─── Dismissal ─────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hide();
    });

    // Tap-elsewhere dismissal (touch only — desktop relies on
    // mouseout). Skip if the tap is inside the trigger or tooltip.
    document.addEventListener('pointerdown', (e) => {
        if (!activeTrigger) return;
        if (e.pointerType !== 'touch') return;
        if (activeTrigger.contains(/** @type {Node} */ (e.target))) return;
        if (tooltipEl && tooltipEl.contains(/** @type {Node} */ (e.target))) return;
        hide();
    });

    // Re-position on scroll/resize so the tooltip stays anchored to
    // its trigger. Throttled via rAF.
    let repositionPending = false;
    function scheduleReposition() {
        if (!activeTrigger || repositionPending) return;
        repositionPending = true;
        requestAnimationFrame(() => {
            repositionPending = false;
            if (activeTrigger) positionTooltip(activeTrigger);
        });
    }
    window.addEventListener('scroll', scheduleReposition, { passive: true });
    window.addEventListener('resize', scheduleReposition);

    // Expose a tiny API for goal-manager.js to call if it wants to
    // force-hide (e.g., when closing the player panel).
    /** @type {any} */ (window).statTooltip = {
        hide,
        /** @param {string | HTMLElement} triggerOrSelector */
        show: (triggerOrSelector) => {
            const trigger = typeof triggerOrSelector === 'string'
                ? /** @type {HTMLElement | null} */ (document.querySelector(triggerOrSelector))
                : triggerOrSelector;
            if (trigger) show(trigger);
        }
    };
})();
