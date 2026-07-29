// @ts-check
'use strict';
/**
 * theme-render.js — pure Themes-panel presentation builders (Engineering Roadmap #1).
 *
 * The THIRTEENTH render module (after boss-, task-, companion-, spell-, class-, analytics-, quest-chain-,
 * enchantment-, dashboard-, player-hud-, title-, and reward-render.js). Holds the two Themes surfaces:
 *   - renderThemesHTML({ themeDefinitions, unlockedThemes, currentTheme, featuredId })
 *       the full #themes-container body `renderThemes()` writes: the optional "✨ Theme of the Week" banner
 *       above the grid, then one layered tile per theme (static-gradient bg + icon/name + an
 *       Active/Preview/locked/"Free this week" status pill), with the featured theme flagged by a ✨ corner
 *       badge + glow ring.
 *   - renderThemeSelectorHTML({ themeDefinitions, unlockedThemes, currentTheme, isPremium, featuredId, darkenColor })
 *       the compact #theme-selector-container tiles (Tools tab): a flat 135°-gradient chip per theme with the
 *       same lock / featured / selected logic, premium themes gated by `isPremium`.
 *
 * Both builders are PURE given their inputs: same data -> same string (no clock, no DOM). The clock-derived
 * featured-week id (`featuredId`, from the manager's `getWeeklyFeaturedThemeId()`) comes in as a param, as do
 * the themeDefinitions catalog + unlockedThemes/currentTheme/isPremium state. The selector's tile gradient is
 * produced by the injected `darkenColor` (the manager's pure helper, kept on the class). The wrappers keep the
 * clock call, their container lookups + guards + `innerHTML` writes, the separate #theme-premium-banner write
 * (renderThemeSelector), and the deferred `setTimeout(maybeShowFeaturedThemeSpotlight)` prompt (renderThemes).
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.THEME_RENDER.
 *   - Jest/Node: require('./theme-render.js') returns the frozen builders via module.exports.
 */
(function () {
    /**
     * @param {{
     *   themeDefinitions: Record<string, any>,
     *   unlockedThemes: string[],
     *   currentTheme: string,
     *   featuredId: string | null,
     * }} deps
     * @returns {string}
     */
    function renderThemesHTML({ themeDefinitions, unlockedThemes, currentTheme, featuredId }) {
        const featuredTheme = featuredId ? themeDefinitions[featuredId] : null;
        const banner = featuredTheme ? `
            <div class="theme-featured-banner col-span-full mb-4">
                <div class="flex items-center gap-3">
                    <span class="theme-featured-banner-icon">${featuredTheme.icon}</span>
                    <div class="flex-1">
                        <div class="theme-featured-banner-eyebrow">✨ Theme of the Week</div>
                        <div class="theme-featured-banner-title">${featuredTheme.name} — free for everyone this week!</div>
                    </div>
                    <button class="theme-featured-banner-cta" data-action="theme.preview" data-theme-id="${featuredId}">
                        Preview →
                    </button>
                </div>
            </div>
        ` : '';

        return banner + Object.entries(themeDefinitions).map(([id, theme]) => {
            const isUnlocked = unlockedThemes.includes(id);
            const isSelected = currentTheme === id;
            const isFeatured = id === featuredId;
            const lockReason = !isUnlocked ?
                (theme.special ? theme.special : `Level ${theme.unlockLevel}`) : '';

            // Layered tile structure (z-stack):
            //   .theme-tile-bg      z=0 — static gradient preview mirroring body.theme-X
            //   .theme-tile-content z=2 — icon, name, status pill
            // CSS for these classes lives in themes.css "THEME TILE LIVE
            // PREVIEWS" section. (Previously had a `.theme-tile-video`
            // layer at z=1 with autoplay WebM per hybrid tile — REMOVED
            // Jun 6, 2026 evening after user feedback that 6 simultaneous
            // WebMs on the Themes panel slowed initial load too much. The
            // tile now shows only the static gradient identity; clicking
            // the tile opens a preview modal via `previewTheme(id)` which
            // renders the WebM ON DEMAND for one theme at a time. docs/HISTORY.md
            // § 2.4 final v2.8 deliverable revision.)
            //
            // Tile click changed from `selectTheme(id)` to `previewTheme(id)`
            // — selection now requires explicit Apply confirmation in the
            // modal, which (a) reduces accidental theme switches and
            // (b) lets locked themes display a preview as motivation
            // before unlock.
            // v2.9 Track 7 — featured tile decoration. Locked-but-featured
            // themes get a "✨ FREE this week" pill instead of the
            // standard "🔒 Level N" lock chip; unlocked-and-featured
            // themes keep their normal Active/Preview pill but still
            // get the ✨ corner badge + glow ring via `theme-featured`.
            const tileTitle = isFeatured
                ? `✨ Free this week — click to preview`
                : (isUnlocked ? 'Click to preview' : '🔒 Locked (' + lockReason.replace(/^[🔒👑]\s*/, '') + ') — click to preview');
            return `
                <div data-action="theme.preview" data-theme-id="${id}"
                    class="theme-option quest-card rounded-xl shadow-xl text-center cursor-pointer transition-all ${isSelected ? 'ring-4 ring-yellow-400' : ''} ${!isUnlocked && !isFeatured ? 'theme-locked' : ''} ${isFeatured ? 'theme-featured' : ''}"
                    title="${tileTitle}">
                    <div class="theme-tile-bg theme-tile-bg-${id}"></div>
                    ${isFeatured ? `<div class="theme-featured-badge" aria-label="Free this week">✨ FREE</div>` : ''}
                    <div class="theme-tile-content p-5">
                        <div class="text-5xl mb-2">${theme.icon}</div>
                        <h4 class="text-lg font-bold text-white medieval-title mb-2">${theme.name}</h4>
                        ${isFeatured && !isSelected ? `
                            <div class="theme-featured-pill">
                                ✨ Free this week
                            </div>
                        ` : !isUnlocked ? `
                            <p class="text-white/80 text-xs mb-2">
                                🔒 ${lockReason}
                            </p>
                            <div class="text-white/70 text-sm italic">Click to preview</div>
                        ` : isSelected ? `
                            <div class="bg-yellow-500/30 border-2 border-yellow-400 rounded-lg px-3 py-2 text-yellow-300 text-sm font-bold backdrop-blur-sm">
                                ✓ Active Theme
                            </div>
                        ` : `
                            <div class="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-white text-sm font-bold transition-all backdrop-blur-sm">
                                👁 Preview
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * @param {{
     *   themeDefinitions: Record<string, any>,
     *   unlockedThemes: string[],
     *   currentTheme: string,
     *   isPremium: boolean,
     *   featuredId: string | null,
     *   darkenColor: (hex: string, percent: number) => string,
     * }} deps
     * @returns {string}
     */
    function renderThemeSelectorHTML({ themeDefinitions, unlockedThemes, currentTheme, isPremium, featuredId, darkenColor }) {
        return Object.entries(themeDefinitions).map(([id, theme]) => {
            const isUnlocked = unlockedThemes.includes(id);
            const isSelected = currentTheme === id;
            const isPremiumTheme = theme.premium && !isPremium;
            const isFeatured = id === featuredId;

            let lockReason = '';
            if (isPremiumTheme) {
                lockReason = '👑 Premium';
            } else if (!isUnlocked) {
                lockReason = theme.special ? theme.special : `Level ${theme.unlockLevel}`;
            }

            // Featured themes override the lock visualization for the
            // duration of their week — the user CAN apply them, so the
            // 🔒 chip would be misleading.
            const isLocked = (isPremiumTheme || !isUnlocked) && !isFeatured;

            // Compact selector tiles — unified Jun 6, 2026 late-evening
            // with the full Themes view so BOTH surfaces open the
            // preview modal on click (previously this compact selector
            // was left at click=apply for "quick switching", but with
            // no preview affordance the user couldn't see what locked
            // / unlocked themes look like before switching). Now
            // consistent: click any tile anywhere → preview modal →
            // explicit Apply confirmation. Visual chrome of these
            // compact tiles intentionally kept as the original flat
            // 135°-gradient (not upgraded to the layered
            // `.theme-tile-bg-X` structure used in the full view)
            // because at p-3 / 3xl-icon size the simpler gradient
            // reads cleaner — the modal carries the rich preview.
            const tileTitle = isFeatured
                ? '✨ Free this week — click to preview'
                : (!isLocked ? 'Click to preview' : '🔒 Locked (' + lockReason.replace(/^[🔒👑]\s*/, '') + ') — click to preview');
            return `
                <div data-action="theme.preview" data-theme-id="${id}"
                    class="theme-option p-3 rounded-lg text-center transition-all cursor-pointer ${isSelected ? 'selected ring-2 ring-yellow-400' : ''} ${isLocked ? 'opacity-70' : ''} ${isFeatured ? 'theme-featured' : ''}"
                    style="background: linear-gradient(135deg, ${theme.color}, ${darkenColor(theme.color, 30)})"
                    title="${tileTitle}">
                    ${isFeatured ? `<div class="theme-featured-badge theme-featured-badge-sm" aria-label="Free this week">✨</div>` : ''}
                    <div class="text-3xl mb-1">${theme.icon}</div>
                    <div class="text-xs font-bold text-white truncate">${theme.name}</div>
                    ${isFeatured && !isSelected ? '<div class="text-xs text-yellow-200 mt-1 font-bold">✨ Free this week</div>' : isLocked ? `<div class="text-xs text-white/70 mt-1">🔒 ${lockReason}</div>` : ''}
                    ${isSelected ? '<div class="text-xs text-yellow-300 mt-1">✓ Active</div>' : ''}
                </div>
            `;
        }).join('');
    }

    const THEME_RENDER = Object.freeze({
        renderThemesHTML,
        renderThemeSelectorHTML,
    });

    // Browser (window / globalThis) — cast to `any` so checkJs doesn't flag the
    // dynamic THEME_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.THEME_RENDER = THEME_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = THEME_RENDER;
})();
