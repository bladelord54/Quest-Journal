// ============================================================================
// Effects Manager — Phase 1.4 Animation & Effects System
// Provides reusable animation primitives + composite event helpers.
// Self-contained: injects own CSS on init.
// ============================================================================

(function() {
    'use strict';

    const CSS = `
.fx-reward-sprite {
    position: fixed;
    pointer-events: none;
    z-index: 9000;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 4px;
    text-shadow: 0 0 8px rgba(255,200,80,0.9), 0 2px 4px rgba(0,0,0,0.8);
    color: #ffe585;
    font-weight: bold;
    will-change: transform;
}
@keyframes fx-target-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,200,80,0.7); }
    50% { transform: scale(1.12); box-shadow: 0 0 18px 8px rgba(255,200,80,0.5); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,200,80,0); }
}
.fx-target-pulse { animation: fx-target-pulse 0.5s ease-out; }

.fx-burst-particle {
    position: fixed;
    pointer-events: none;
    z-index: 8500;
    font-size: 1.2rem;
    will-change: transform, opacity;
}
@keyframes fx-burst-fly {
    0% { transform: translate(-50%, -50%) scale(0.4) rotate(0deg); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--fx-bx)), calc(-50% + var(--fx-by))) scale(1.15) rotate(var(--fx-br)); opacity: 0; }
}

.fx-expand-ring {
    position: fixed;
    pointer-events: none;
    z-index: 8400;
    border: 3px solid;
    border-radius: 50%;
    will-change: transform, opacity;
    transform: translate(-50%, -50%);
}
@keyframes fx-ring-expand {
    0% { width: 20px; height: 20px; opacity: 1; }
    100% { width: 220px; height: 220px; opacity: 0; }
}

.fx-celebration-banner {
    position: fixed;
    /* Respect Android/iOS safe-area-inset-top so the banner doesn't tuck
       under the status bar/notch in PWA fullscreen or TWA. Falls back to
       24px on devices without insets. */
    top: max(24px, calc(env(safe-area-inset-top) + 12px));
    left: 50%;
    transform: translateX(-50%) translateY(-150%);
    z-index: 9500;
    min-width: 280px;
    max-width: 92vw;
    padding: 14px 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(80,55,20,0.97), rgba(40,25,10,0.97));
    border: 2px solid #d4a022;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(218,165,32,0.4), inset 0 1px 0 rgba(255,220,150,0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fx-celebration-banner.fx-show { transform: translateX(-50%) translateY(0); }
.fx-celebration-banner .fx-cb-icon { font-size: 2.2rem; flex-shrink: 0; }
.fx-celebration-banner .fx-cb-title { font-size: 1.05rem; font-weight: bold; color: #ffe585; }
.fx-celebration-banner .fx-cb-subtitle { font-size: 0.82rem; color: rgba(255,229,133,0.7); margin-top: 2px; }
.fx-celebration-banner.fx-theme-arcane { border-color: #9966ff; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(153,102,255,0.5); }
.fx-celebration-banner.fx-theme-arcane .fx-cb-title { color: #cdb4ff; }
.fx-celebration-banner.fx-theme-nature { border-color: #66cc66; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(102,204,102,0.4); }
.fx-celebration-banner.fx-theme-nature .fx-cb-title { color: #bbeebb; }
.fx-celebration-banner.fx-theme-fire { border-color: #ff8844; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(255,136,68,0.5); }

.fx-floating-text {
    position: fixed;
    pointer-events: none;
    z-index: 9100;
    font-weight: bold;
    font-size: 1.3rem;
    text-shadow: 0 0 10px rgba(255,200,80,0.8), 0 2px 4px rgba(0,0,0,0.8);
    will-change: transform, opacity;
}
@keyframes fx-float-up {
    0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
    20% { transform: translate(-50%, -10px) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -80px) scale(1); opacity: 0; }
}

@keyframes fx-companion-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-22px) scale(1.16); }
    60% { transform: translateY(-4px) scale(0.96); }
}
.fx-companion-bounce { animation: fx-companion-bounce 0.7s ease-out; }

@keyframes fx-card-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,200,80,0); }
    50% { box-shadow: 0 0 28px 8px rgba(255,200,80,0.7); }
}
.fx-card-glow { animation: fx-card-glow 1.5s ease-in-out 2; }

body.fx-reduced .fx-burst-particle,
body.fx-reduced .fx-expand-ring,
body.fx-reduced .fx-reward-sprite { display: none !important; }
body.fx-minimal .fx-burst-particle,
body.fx-minimal .fx-expand-ring,
body.fx-minimal .fx-reward-sprite,
body.fx-minimal .fx-celebration-banner,
body.fx-minimal .fx-floating-text { display: none !important; }
body.fx-minimal .fx-companion-bounce,
body.fx-minimal .fx-card-glow { animation: none !important; }

@keyframes fx-screen-shake {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-4px, 2px); }
    20% { transform: translate(5px, -2px); }
    30% { transform: translate(-5px, -3px); }
    40% { transform: translate(4px, 3px); }
    50% { transform: translate(-3px, 2px); }
    60% { transform: translate(3px, -2px); }
    70% { transform: translate(-2px, -1px); }
    80% { transform: translate(2px, 2px); }
    90% { transform: translate(-1px, 1px); }
}
.fx-screen-shake { animation: fx-screen-shake 0.45s ease-in-out; }
body.fx-minimal .fx-screen-shake { animation: none !important; }

@keyframes fx-milestone-zoom {
    0%   { transform: scale(0.3); opacity: 0; }
    40%  { transform: scale(1.4); opacity: 1; }
    70%  { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.1); opacity: 0; }
}
.fx-milestone-number {
    position: fixed;
    top: 38%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* Responsive: shrinks on narrow phones, grows on tablets/desktop.
       7rem is fine on a 360px screen but feels cramped at 320px. */
    font-size: clamp(4.5rem, 18vw, 7rem);
    font-weight: bold;
    color: #ff8844;
    text-shadow: 0 0 30px rgba(255,136,68,0.9), 0 0 60px rgba(255,136,68,0.6), 0 4px 12px rgba(0,0,0,0.8);
    z-index: 9300;
    pointer-events: none;
    font-family: 'Cinzel', Georgia, serif;
    will-change: transform, opacity;
}
`;

    const STORAGE_KEY = 'animationIntensity';

    const EffectsManager = {
        intensity: 'full',  // 'full' | 'reduced' | 'minimal'
        _activeEffects: 0,
        _maxConcurrent: 8,
        _initialized: false,

        init() {
            if (this._initialized) return;
            this._initialized = true;

            // Inject CSS
            const style = document.createElement('style');
            style.id = 'fx-styles';
            style.textContent = CSS;
            document.head.appendChild(style);

            // Load saved intensity, or default to 'reduced' if user prefers reduced motion
            let saved = null;
            try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
            if (saved && ['full', 'reduced', 'minimal'].includes(saved)) {
                this.setIntensity(saved, false);
            } else if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.setIntensity('reduced', false);
            } else {
                this.setIntensity('full', false);
            }

            // v2.5 — wire up the delegated click-ripple handler exactly once.
            this._initRipple();
        },

        // ── _initRipple (v2.5) ───────────────────────────────────────
        // Delegated `pointerdown` listener that spawns a Material-style
        // expanding circle at the exact click/tap point on any element
        // matching `.btn-ripple`. CSS-only attempts (v2.5.1-v2.5.3) failed
        // on Android Chromium WebView due to mix-blend-mode + pseudo-element
        // rendering quirks, so the v2.5 final implementation is JS-driven —
        // which also gives us the correct click-origin (impossible in pure
        // CSS without per-button coordinate hooks).
        //
        // Single document-level listener handles every existing AND future
        // `.btn-ripple` button, including those re-injected via innerHTML —
        // no per-button wiring needed. `pointerdown` covers mouse + touch
        // + pen on every modern browser including Android WebView.
        //
        // Honored gates:
        //   • `intensity: 'minimal'` skips spawn entirely
        //   • `prefers-reduced-motion` is enforced via the CSS `display: none`
        //     fallback on `.ripple-wave` (so even if a wave element is
        //     created in some edge case, it's invisible).
        //   • Disabled buttons skip spawn (no feedback for unresponsive UI).
        _initRipple() {
            if (this._rippleInited) return;
            this._rippleInited = true;
            document.addEventListener('pointerdown', (e) => {
                if (this.intensity === 'minimal') return;
                const btn = e.target.closest('.btn-ripple');
                if (!btn || btn.disabled) return;
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                // Radius = distance from click point to the farthest corner,
                // so the wave fully covers the button regardless of where
                // it was tapped (corner taps would otherwise leave the
                // opposite corner untouched).
                const dx = Math.max(x, rect.width - x);
                const dy = Math.max(y, rect.height - y);
                const radius = Math.sqrt(dx * dx + dy * dy);
                const wave = document.createElement('span');
                wave.className = 'ripple-wave';
                wave.style.left = `${x}px`;
                wave.style.top = `${y}px`;
                wave.style.width = `${radius * 2}px`;
                wave.style.height = `${radius * 2}px`;
                btn.appendChild(wave);
                wave.addEventListener('animationend', () => wave.remove(), { once: true });
                // Safety: nuke the wave after 800ms even if animationend
                // somehow doesn't fire (e.g., button removed mid-animation).
                setTimeout(() => { if (wave.parentNode) wave.remove(); }, 800);
            }, { passive: true });
        },

        setIntensity(level, persist = true) {
            if (!['full', 'reduced', 'minimal'].includes(level)) return;
            this.intensity = level;
            document.body.classList.remove('fx-reduced', 'fx-minimal');
            if (level === 'reduced') document.body.classList.add('fx-reduced');
            else if (level === 'minimal') document.body.classList.add('fx-minimal');
            if (persist) {
                try { localStorage.setItem(STORAGE_KEY, level); } catch (e) {}
            }
        },

        getIntensity() { return this.intensity; },

        _canSpawn() {
            if (this.intensity === 'minimal') return false;
            return this._activeEffects < this._maxConcurrent;
        },

        _resolveCenter(elOrCoords) {
            if (!elOrCoords) {
                return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            }
            if (typeof elOrCoords.x === 'number' && typeof elOrCoords.y === 'number') {
                return elOrCoords;
            }
            // Element
            try {
                const r = elOrCoords.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) {
                    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                }
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            } catch (e) {
                return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            }
        },

        // ── flyingReward ──────────────────────────────────────────────
        flyingReward(fromEl, toEl, icon, amount, onArrive) {
            if (this.intensity === 'minimal' || !this._canSpawn()) {
                if (onArrive) onArrive();
                return;
            }
            const from = this._resolveCenter(fromEl);
            const to = this._resolveCenter(toEl);

            const sprite = document.createElement('div');
            sprite.className = 'fx-reward-sprite';
            sprite.innerHTML = `<span>${icon}</span><span>+${amount}</span>`;
            sprite.style.left = from.x + 'px';
            sprite.style.top = from.y + 'px';
            sprite.style.transform = 'translate(-50%, -50%) scale(0.6)';
            document.body.appendChild(sprite);

            this._activeEffects++;
            // 1300ms reads as a deliberate arc ("going into your inventory")
            // instead of a quick flash. 700ms felt like a stutter on mobile.
            const duration = 1300;
            const peakY = Math.min(from.y, to.y) - 80;
            const start = performance.now();
            const self = this;

            function tick(now) {
                const t = Math.min(1, (now - start) / duration);
                const midX = (from.x + to.x) / 2;
                const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
                const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * peakY + t * t * to.y;
                // Grow quickly, hold near full size through the arc, shrink slightly
                // on approach so it reads as "dropping into" the target badge.
                const scale = t < 0.25 ? 0.6 + t * 2.4 : (t < 0.85 ? 1.2 : 1.2 - (t - 0.85) * 1.5);
                sprite.style.left = x + 'px';
                sprite.style.top = y + 'px';
                sprite.style.transform = `translate(-50%, -50%) scale(${scale})`;
                sprite.style.opacity = t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1;
                if (t < 1) requestAnimationFrame(tick);
                else {
                    sprite.remove();
                    self._activeEffects--;
                    if (toEl && toEl.classList) {
                        toEl.classList.remove('fx-target-pulse');
                        void toEl.offsetWidth;
                        toEl.classList.add('fx-target-pulse');
                    }
                    if (onArrive) onArrive();
                }
            }
            requestAnimationFrame(tick);
        },

        // ── burstAt ──────────────────────────────────────────────────
        burstAt(elOrCoords, options = {}) {
            if (!this._canSpawn()) return;
            const themes = {
                sparkle: { glyphs: ['✨', '⭐', '✦', '·'], colors: ['#ffe585', '#fff'] },
                rune:    { glyphs: ['ᚠ', 'ᚱ', 'ᚺ', '◈', '✦'], colors: ['#c8a0ff', '#9966ff'] },
                leaf:    { glyphs: ['🍃', '🌿', '✿'], colors: ['#9fdc7a'] },
                star:    { glyphs: ['⭐', '✨', '★'], colors: ['#ffe585'] },
                fire:    { glyphs: ['🔥', '✨', '·'], colors: ['#ff8844'] }
            };
            const theme = themes[options.type || 'sparkle'] || themes.sparkle;
            let count = options.count || 8;
            if (this.intensity === 'reduced') count = Math.min(count, 4);

            const c = this._resolveCenter(elOrCoords);
            this._activeEffects++;
            let remaining = count;
            const self = this;

            for (let i = 0; i < count; i++) {
                const p = document.createElement('div');
                p.className = 'fx-burst-particle';
                p.textContent = theme.glyphs[Math.floor(Math.random() * theme.glyphs.length)];
                p.style.color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
                p.style.left = c.x + 'px';
                p.style.top = c.y + 'px';
                const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
                const dist = 60 + Math.random() * 50;
                p.style.setProperty('--fx-bx', Math.cos(angle) * dist + 'px');
                p.style.setProperty('--fx-by', Math.sin(angle) * dist + 'px');
                p.style.setProperty('--fx-br', (Math.random() * 360 - 180) + 'deg');
                p.style.animation = `fx-burst-fly ${600 + Math.random() * 300}ms ease-out forwards`;
                document.body.appendChild(p);
                p.addEventListener('animationend', () => {
                    p.remove();
                    if (--remaining === 0) self._activeEffects--;
                });
            }
        },

        // ── celebrationBanner ────────────────────────────────────────
        celebrationBanner({ icon, title, subtitle, theme, duration = 2500 } = {}) {
            if (this.intensity === 'minimal') return;
            const existing = document.querySelector('.fx-celebration-banner');
            if (existing) existing.remove();

            // Build via DOM (NOT innerHTML interpolation) so titles/subtitles
            // sourced from untrusted input — e.g. challenge titles decoded from
            // a shared URL in challengeAccepted — cannot inject HTML/scripts.
            const banner = document.createElement('div');
            banner.className = `fx-celebration-banner ${theme ? 'fx-theme-' + theme : ''}`;
            const iconEl = document.createElement('div');
            iconEl.className = 'fx-cb-icon';
            iconEl.textContent = icon || '⭐';
            const textWrap = document.createElement('div');
            const titleEl = document.createElement('div');
            titleEl.className = 'fx-cb-title';
            titleEl.textContent = title || '';
            textWrap.appendChild(titleEl);
            if (subtitle) {
                const subEl = document.createElement('div');
                subEl.className = 'fx-cb-subtitle';
                subEl.textContent = subtitle;
                textWrap.appendChild(subEl);
            }
            banner.appendChild(iconEl);
            banner.appendChild(textWrap);
            document.body.appendChild(banner);
            void banner.offsetWidth;
            banner.classList.add('fx-show');

            setTimeout(() => {
                banner.classList.remove('fx-show');
                setTimeout(() => banner.remove(), 500);
            }, duration);
        },

        // ── expandingRing ────────────────────────────────────────────
        expandingRing(elOrCoords, { color = '#d4a022', count = 1, stagger = 200 } = {}) {
            if (!this._canSpawn()) return;
            const c = this._resolveCenter(elOrCoords);
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const ring = document.createElement('div');
                    ring.className = 'fx-expand-ring';
                    ring.style.borderColor = color;
                    ring.style.left = c.x + 'px';
                    ring.style.top = c.y + 'px';
                    ring.style.animation = 'fx-ring-expand 800ms ease-out forwards';
                    document.body.appendChild(ring);
                    ring.addEventListener('animationend', () => ring.remove());
                }, i * stagger);
            }
        },

        // ── floatingText ─────────────────────────────────────────────
        floatingText(elOrCoords, text, color = '#ffe585') {
            if (this.intensity === 'minimal') return;
            const c = this._resolveCenter(elOrCoords);
            const ft = document.createElement('div');
            ft.className = 'fx-floating-text';
            ft.textContent = text;
            ft.style.color = color;
            ft.style.left = c.x + 'px';
            ft.style.top = c.y + 'px';
            ft.style.animation = 'fx-float-up 1.4s ease-out forwards';
            document.body.appendChild(ft);
            ft.addEventListener('animationend', () => ft.remove());
        },

        // ────────────────────────────────────────────────────────────
        // Composite event helpers (used by goal-manager.js)
        // ────────────────────────────────────────────────────────────

        enchantmentCast(enchantment, sourceEl) {
            const el = sourceEl || document.querySelector(`[data-enchantment-id="${enchantment.id}"]`) || null;
            this.expandingRing(el, { color: '#9966ff', count: 2 });
            this.burstAt(el, { type: 'rune', count: 10 });
            setTimeout(() => this.celebrationBanner({
                icon: enchantment.icon || '🔮',
                title: `${enchantment.name} Activated`,
                subtitle: enchantment.description || 'Enchantment is now active',
                theme: 'arcane',
                duration: 2400
            }), 250);
            // Audio handled by caller (preserves existing playSpell call)
        },

        companionLevelUp(companion, sourceEl) {
            const el = sourceEl || document.querySelector('[data-companion-display]') || null;
            if (el && el.classList) {
                el.classList.remove('fx-companion-bounce');
                void el.offsetWidth;
                el.classList.add('fx-companion-bounce');
            }
            this.expandingRing(el, { color: '#d4a022', count: 3 });
            this.burstAt(el, { type: 'sparkle', count: 8 });
            const fromLv = (companion.level || 1) - 1;
            this.floatingText(el, `Lv ${fromLv} → Lv ${companion.level}`);
            // A celebration banner (~2.8s on screen) so the milestone is unmistakably
            // readable. The float-up text alone is too brief, especially on mobile
            // where the companion icon is small.
            setTimeout(() => this.celebrationBanner({
                icon: companion.icon || '🐾',
                title: `${companion.name || 'Companion'} reached Lv ${companion.level}!`,
                subtitle: companion.description || 'Your bond grows stronger.',
                theme: 'companion',
                duration: 2800
            }), 250);
        },

        // ── screenShake ──────────────────────────────────────────────
        // Shakes a specific element (NOT <body>, which would break position:fixed
        // overlays like the top nav, modals, banners, and toasts).
        // Pass an element; if omitted/null, this is a no-op.
        screenShake(target) {
            if (this.intensity === 'minimal' || !target || !target.classList) return;
            target.classList.remove('fx-screen-shake');
            void target.offsetWidth;
            target.classList.add('fx-screen-shake');
            setTimeout(() => target.classList.remove('fx-screen-shake'), 500);
        },

        // ── successFlash (v2.5) ──────────────────────────────────────
        // Brief 600ms green pulse on a button/card after a confirm action
        // (claim reward, complete quest, redeem code, etc). The CSS class
        // `.fx-success-flash` lives in animations.css; this helper just
        // handles the reflow-restart pattern + auto-cleanup so callers
        // don't have to. Safe to call repeatedly on the same element.
        successFlash(target) {
            if (this.intensity === 'minimal' || !target || !target.classList) return;
            target.classList.remove('fx-success-flash');
            void target.offsetWidth;
            target.classList.add('fx-success-flash');
            setTimeout(() => target.classList.remove('fx-success-flash'), 700);
        },

        // ────────────────────────────────────────────────────────────
        // More composite event helpers
        // ────────────────────────────────────────────────────────────

        crystalEarned(amount, sourceEl) {
            // Prefer the always-visible top-right avatar badge so the sprite
            // reads as "going into your inventory." The in-panel #focus-crystals
            // element is hidden when the character sheet is closed (the common case),
            // which made the previous target effectively invisible.
            const target = document.getElementById('player-panel-toggle')
                || document.getElementById('focus-crystals')
                || document.getElementById('focus-crystals-display');
            const from = sourceEl || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            if (target) {
                this.flyingReward(from, target, '💎', amount);
            } else {
                this.burstAt(sourceEl, { type: 'sparkle', count: 6 });
            }
        },

        // Mirror of crystalEarned for gold. Triggered from addGold() for any
        // non-quiet source (focus session bonuses, chest loot, boss rewards, etc.).
        // Daily/habit/weekly/monthly gold continues to use dailyQuestCompleted's
        // float-up so we don't double up on visuals.
        goldEarned(amount, sourceEl) {
            const target = document.getElementById('player-panel-toggle')
                || document.getElementById('gold-coins');
            const from = sourceEl || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            if (target) {
                this.flyingReward(from, target, '⚜', amount);
            }
        },

        streakMilestone(streak, label) {
            if (this.intensity === 'minimal') return;
            // Big day-number zoom in center of screen
            if (this.intensity !== 'reduced') {
                const num = document.createElement('div');
                num.className = 'fx-milestone-number';
                num.textContent = streak;
                num.style.animation = 'fx-milestone-zoom 1.6s ease-out forwards';
                document.body.appendChild(num);
                num.addEventListener('animationend', () => num.remove());
                // Flame burst around it
                this.burstAt({ x: window.innerWidth / 2, y: window.innerHeight * 0.38 }, { type: 'fire', count: 14 });
            }
            setTimeout(() => this.celebrationBanner({
                icon: '🔥',
                title: label || `${streak}-Day Streak!`,
                subtitle: `${streak} consecutive days of quests conquered`,
                theme: 'fire',
                duration: 2800
            }), 600);
        },

        dailyQuestCompleted(sourceEl, xp, gold) {
            // Pre-resolve coords NOW because the caller (claimDailyQuest) calls
            // this.render() immediately after, which destroys sourceEl before
            // the delayed gold floatingText fires.
            const coords = this._resolveCenter(sourceEl);
            this.burstAt(coords, { type: 'sparkle', count: 6 });
            if (xp) this.floatingText(coords, `+${xp} XP`, '#ffe585');
            if (gold) {
                setTimeout(() => this.floatingText(coords, `+${gold} ⚜`, '#ffd700'), 200);
            }
        },

        // Mirror of dailyQuestCompleted for habit ritual completion. Habits are
        // the most-triggered completion action, so the visual feedback matches
        // the daily quest pattern: pre-resolved coords (caller re-renders the
        // list which destroys sourceEl), sparkle burst, and floating XP/gold.
        habitCompleted(sourceEl, xp, gold) {
            const coords = this._resolveCenter(sourceEl);
            this.burstAt(coords, { type: 'sparkle', count: 6 });
            if (xp) this.floatingText(coords, `+${xp} XP`, '#ffe585');
            if (gold) {
                setTimeout(() => this.floatingText(coords, `+${gold} ⚜`, '#ffd700'), 200);
            }
        },

        sideQuestCompleted(sourceEl, xp) {
            this.burstAt(sourceEl, { type: 'star', count: 8 });
            this.expandingRing(sourceEl, { color: '#9fdc7a', count: 1 });
            if (xp) this.floatingText(sourceEl, `+${xp} XP 🧭`, '#9fdc7a');
        },

        challengeSent() {
            this.celebrationBanner({
                icon: '✉️',
                title: 'Challenge Sealed!',
                subtitle: 'Your gauntlet has been thrown',
                theme: 'fire',
                duration: 2200
            });
            this.burstAt(null, { type: 'star', count: 10 });
        },

        challengeAccepted(title) {
            this.celebrationBanner({
                icon: '⚔️',
                title: 'Challenge Accepted!',
                subtitle: title || 'The quest begins',
                theme: 'fire',
                duration: 2600
            });
            this.burstAt(null, { type: 'fire', count: 12 });
        },

        bossCrit(bossEl) {
            // NOTE: We deliberately do NOT call screenShake here. The boss card
            // already gets `boss-hit-shake` (transform animation) applied by
            // animateBossHit() 80ms after a hit, and stacking two transform
            // animations on the same element causes them to fight. The crit
            // fire burst + existing boss-hit-shake + crit damage float + crit
            // audio variant already provide ample feedback.
            this.burstAt(bossEl, { type: 'fire', count: 14 });

            // ── v2.9 Track 4 — Crit / weakpoint visual indicators ──
            //
            // Three additive layers on top of the legacy fire burst:
            //   1) Weakpoint reticle — lock-on crosshair that snaps onto the
            //      boss portrait (suggests a targeted strike, not just a
            //      harder hit).
            //   2) Shockwave ring — radial ring expanding from impact (reads
            //      as visceral force).
            //   3) Time-dilation freeze — brief 80ms "hitch" on the portrait
            //      to add weight without committing to full slow-motion (that
            //      effect is reserved for the Track 6 monthly killing blow).
            //
            // Anchored to the bouncing portrait (`.boss-portrait`) when
            // present, so the visuals land on the boss face rather than the
            // center of the entire card (which sits over the HP bar).
            // Falls back to the card itself for defensive parity.
            //
            // Intensity gates:
            //   • minimal — skip all three (the fire burst above is already
            //     gated via burstAt → _canSpawn).
            //   • reduced — keep the reticle (cheap, single SVG element);
            //     drop the shockwave + freeze.
            //   • full    — all three.
            if (!bossEl || this.intensity === 'minimal') return;

            const portrait = bossEl.querySelector('.boss-portrait') || bossEl;
            // Portrait anchors absolute children — `position: relative` is
            // already on the card via animateBossHit; force it on the portrait
            // too so the reticle/shockwave overlay the icon, not the card.
            if (portrait !== bossEl && !portrait.style.position) {
                portrait.style.position = 'relative';
            }

            // ─── Weakpoint reticle (full + reduced) ───
            const reticle = document.createElement('div');
            reticle.className = 'crit-reticle';
            reticle.setAttribute('aria-hidden', 'true');
            reticle.innerHTML =
                '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
                  '<circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="3"/>' +
                  '<circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" stroke-width="2"/>' +
                  '<line x1="50" y1="2"  x2="50" y2="22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
                  '<line x1="50" y1="78" x2="50" y2="98" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
                  '<line x1="2"  y1="50" x2="22" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
                  '<line x1="78" y1="50" x2="98" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
                  '<circle cx="50" cy="50" r="3" fill="currentColor"/>' +
                '</svg>';
            portrait.appendChild(reticle);
            setTimeout(() => reticle.remove(), 650);

            // ─── Shockwave + freeze (full intensity only) ───
            if (this.intensity !== 'full') return;

            const shockwave = document.createElement('div');
            shockwave.className = 'crit-shockwave';
            shockwave.setAttribute('aria-hidden', 'true');
            portrait.appendChild(shockwave);
            setTimeout(() => shockwave.remove(), 420);

            // Brief freeze-frame: pauses any descendant animations (the
            // animate-bounce on the portrait, the animate-pulse glow on the
            // card backdrop) for 80ms via a class that sets
            // animation-play-state: paused. Restored immediately after.
            bossEl.classList.add('crit-freeze');
            setTimeout(() => bossEl.classList.remove('crit-freeze'), 80);
        },

        spellUnlocked(spell, sourceEl) {
            const el = sourceEl || document.querySelector(`[data-spell-id="${spell.id || spell.spellId}"]`) || null;
            if (el && el.animate) {
                try {
                    el.animate([
                        { transform: 'scale(0.3)', opacity: 0 },
                        { transform: 'scale(1.3)', opacity: 1, offset: 0.6 },
                        { transform: 'scale(1)', opacity: 1 }
                    ], { duration: 500, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
                } catch (e) {}
                el.classList.add('fx-card-glow');
                setTimeout(() => el.classList.remove('fx-card-glow'), 3000);
            }
            this.burstAt(el, { type: 'star', count: 12 });
            setTimeout(() => this.celebrationBanner({
                icon: '📖',
                title: 'Spell Unlocked!',
                subtitle: `${spell.name} is now in your spellbook`,
                theme: 'arcane',
                duration: 2600
            }), 200);
        }
    };

    // Update Animation Intensity button states in the Tools UI
    function refreshIntensityButtons() {
        const levels = ['full', 'reduced', 'minimal'];
        levels.forEach(l => {
            const btn = document.getElementById('fx-intensity-' + l);
            if (!btn) return;
            const active = (l === EffectsManager.intensity);
            btn.classList.toggle('bg-indigo-500', active);
            btn.classList.toggle('ring-2', active);
            btn.classList.toggle('ring-amber-300', active);
            btn.classList.toggle('bg-indigo-700', !active);
        });
    }

    // Global setter exposed to onclick handlers in the Tools UI
    window.setAnimationIntensity = function(level) {
        EffectsManager.setIntensity(level);
        refreshIntensityButtons();
    };

    // Auto-init on load
    function bootstrap() {
        EffectsManager.init();
        refreshIntensityButtons();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
    // Also refresh buttons after Tools view renders (lazy DOM)
    window.addEventListener('load', refreshIntensityButtons);

    window.effectsManager = EffectsManager;
})();
