# Life Quest Journal — Feature Roadmap

> **Current Version:** 2.8.0 (Build 26)  
> **Last Updated:** Jun 7, 2026

---

## Current Feature Inventory

| System | Status |
|---|---|
| Quest Log (Epic / Yearly / Monthly / Weekly / Side) | ✅ Live |
| Daily Quests (Tasks / Rituals / Recurring) | ✅ Live |
| Task Checklists / Subtasks (add, toggle, progress bar, completion gating) | ✅ Live |
| Quest Calendar | ✅ Live |
| XP & Leveling (progressive unlock gating) | ✅ Live |
| Gold Economy | ✅ Live |
| Focus Timer (wall-clock, Pomodoro-style) | ✅ Live |
| Focus Crystals & Shards | ✅ Live |
| Enchantments (7 buffs, premium gating) | ✅ Live |
| Spellbook (14 spells, rarity tiers) | ✅ Live |
| Boss Battles (daily / weekly / monthly) | ✅ Live |
| Defeated Bosses Log (last 50 kills with stats) | ✅ Live |
| Quest Chains (multi-step templates) | ✅ Live |
| Companion System (collection, XP, abilities) | ✅ Live |
| Treasure Chests (wooden → royal, loot tables) | ✅ Live |
| Themes & Titles | ✅ Live |
| Daily Quest Board (3 auto-generated quests) | ✅ Live |
| Login Streak & Daily Bonuses | ✅ Live |
| Streak Shields (spell, enchantment, companion protection + login prompt) | ✅ Live |
| Challenge a Friend (share link) | ✅ Live |
| Badges / Achievements | ✅ Live |
| Share Stat Card & Weekly Recap | ✅ Live |
| Referral System | ✅ Live |
| Analytics (activity heatmap, XP timeline, task breakdown, productivity patterns, personal records) | ✅ Live |
| Habit Heatmap (GitHub-style with click-to-backfill) | ✅ Live |
| Search | ✅ Live |
| Push Notifications & Reminders | ✅ Live |
| Tutorial & Onboarding | ✅ Live |
| Beginner's Blessing (3-day 2x boost) | ✅ Live |
| Premium System (IAP gating) | ✅ Live |
| Data Export / Import (JSON backup) | ✅ Live |
| PWA + Android (Capacitor) | ✅ Live |
| Basic Accessibility (ARIA labels on key interactive elements) | ✅ Live |

---

## Phase 1 — Quality of Life & Retention (v2.4)

Small-to-medium features that improve daily engagement and reduce friction.

### 1.1 — Quick-Add Widget ✅ Shipped (v2.4.1)
- Floating action button (FAB) on mobile for rapid task entry
- Single-tap to add a daily quest without navigating away from current view
- Support quick entry with title-only (auto-set to today, normal priority)

### 1.2 — Notification Improvements ✅ Shipped
- Smart reminders: remind only for uncompleted tasks near end-of-day
- Boss expiration warnings (1 hour before daily boss resets)
- Focus timer completion push notification (when app is backgrounded)

### 1.3 — Pomodoro Chains ✅ Shipped
- Chain multiple focus sessions with configurable short breaks (e.g., 4×25 min + 5 min breaks)
- Bonus XP/crystal reward for completing a full chain
- Visual chain progress indicator on the Focus Timer view

### 1.4 — Animation & Effects System ✅ Shipped (v2.4.9)
Replace the basic toast for mid-tier events with thematic, contextual animations. Build a small reusable primitive library so future features (companion evolution, prestige, seasonal events) get visual flair for free.

**Foundation — `effects-manager.js` primitives** ✅
- `flyingReward(fromEl, toEl, icon, amount)` — sprite arcs from source to destination; destination pulses (XP, gold, crystals, items)
- `burstAt(el, options)` — themed particle burst (sparkles, runes, leaves, stars) anchored to an element
- `celebrationBanner(icon, title, subtitle, theme)` — premium slide-in banner replacing the toast for medium-importance wins
- `expandingRing(el, options)` + `floatingText(el, text)` helpers
- `prefers-reduced-motion` respect + "Animation Intensity: Full / Reduced / Minimal" setting in Tools view
- Concurrent-effect cap (mirrors the audio queue pattern) to keep mobile performance smooth

**Event coverage (initial)** ✅
- Enchantment cast — expanding rune ring + spiral particles + arcane banner
- Companion level up — bouncing icon, 3 golden ring pulses, sparkle burst, "Lv X → Lv X+1" float
- Spell unlocked — stamp-in scale punch + 3s card glow + star burst + banner

**Event coverage (follow-on)** ✅
- Crystal earned — flying crystal sprite → crystal counter (counter pulses)
- Streak milestone — giant flame-colored day number zooms in + flame banner
- Daily quest completed — sparkle burst + XP/Gold float-up from the quest card
- Side quest completed — star burst + green ring + XP float
- Challenge sent — fire-themed "Challenge Sealed!" banner when share preview opens
- Challenge accepted — fire-themed "Challenge Accepted!" banner with fire burst
- Boss crit — screen-shake + fire particle burst from the boss card

**Security, accessibility & mobile polish (May 21 audit pass)** ✅
- **XSS fix** — habit titles in the streak milestone share prompt are now properly escaped before injection (`_showMilestoneSharePrompt`)
- **`prefers-reduced-motion` CSS safety net** — strobing full-screen overlays (level-up flash, boss-defeat flash, chest flash, spell flash, confetti, screen-shake) auto-disable when the OS prefers reduced motion. Maps to Android's *Settings → Accessibility → Remove animations* toggle
- **Mobile bottom-nav collision fixed** — streak share prompt, onboarding share hook, and XP toast now lift to `calc(96px + env(safe-area-inset-bottom))` on viewports ≤ 768px so they don't sit behind the bottom tab bar
- **Celebration banner respects `safe-area-inset-top`** — no longer tucked under the Android status bar in PWA fullscreen / TWA
- **Particle counts auto-tuned by intensity + viewport** — `_particleBudget()` cuts confetti/sparkle counts on mobile-full (×0.6) and reduced (×0.4); skipped entirely on minimal. Big win for low-end Android
- **Responsive milestone streak number** — `clamp(4.5rem, 18vw, 7rem)` instead of fixed 7rem so it doesn't overrun 320px screens
- **Android build manifest fix** — `effects-manager.js` was referenced by `index.html` but missing from `scripts/copy-web.js`'s items list, so it never made it into the Capacitor `www/` bundle. Every prior Android build of v2.4.9 silently no-op'd the entire animation & effects system via the `window.effectsManager && ...` guards. **For Android users, v2.4.9 is effectively the first release with celebration banners, flying rewards, particle bursts, and screen shake.**

### 1.5 — v2.4.10 Polish & In-App Updates ✅ Shipped (Build 20)

Post-launch refinements based on real-world feedback after v2.4.9 hit the Play Store.

**Feel & timing**
- **Companion level-up celebration banner** — added a 2.8s banner (`"<Companion Name> reached Lv <N>!"`) on top of the existing bounce/sparkle/floating text. The original `Lv X → Lv X+1` float-up alone was too brief to read on mobile, especially with the small companion icon.
- **Flying reward sprite slowed** — `flyingReward` duration bumped 700ms → 1300ms, with a hold-and-shrink scale curve so the sprite reads as deliberately *dropping into* the inventory instead of stuttering past.
- **Crystal sprite retargeted** — flies to the always-visible top-right avatar badge (`#player-panel-toggle`) instead of the in-panel `#focus-crystals` element, which was hidden whenever the character sheet was closed (i.e. almost always). The previous target had no rendered position, contributing to the "wrong place" feel.
- **Gold flying sprite (new)** — `effectsManager.goldEarned()` mirrors `crystalEarned`, flying a `⚜` sprite from screen-center to the avatar badge. Auto-triggers from `addGold()` for non-quiet sources (focus session bonuses, chest loot, boss rewards). Daily/habit/weekly/monthly gold still uses the existing card float-up — no double visual.

**Update plumbing**
- **Google Play in-app updates** — added `@capawesome/capacitor-app-update@^8.0.3` and wired the Play Core *flexible* flow. On native app launch + foreground (24h throttled via `localStorage.lqj_lastUpdateCheck`), the app asks Play whether an update is available, downloads it in the background, and surfaces a non-blocking toast (*"✨ Update downloaded — restart to install"*) with **Install** and dismiss buttons when ready. `completeFlexibleUpdate()` restarts to apply.
- **Safety properties** — all calls wrapped in try/catch; sideloaded/debug builds throw `NOT_AVAILABLE` and are silently skipped. Deferred 4s after `load` so it never blocks first paint. Toast respects `safe-area-inset-bottom` + the mobile bottom-nav lift from v2.4.9.
- **Edge case** — if Play returns `flexibleUpdateAllowed=false` but `immediateUpdateAllowed=true` (rare developer-mandated update), falls back to `performImmediateUpdate()` (full-screen blocking flow).

### 1.6 — Post-2.4.10 Tech Debt ✅ Resolved (Jun 1, 2026, v2.7.1 piggyback)

Originally items intentionally left in for safety after the WebM theme background rollout. Decision (May 28, 2026): **defer indefinitely and listen for user reports of non-animating backgrounds** rather than instrument telemetry now. `minSdkVersion=24` (Android 7.0+) means every supported device is required by Google's CDD to support VP9, so the GIF fallback was almost certainly dead weight — but no real-world data was collected to confirm.

**Resolution (Jun 1, 2026)** — bundled into the v2.7.x patch-window release after the v2.7 modal-containment audit triggered a service-worker cache bump anyway. Both halves of the removal landed together because the cache-invalidation cost was already being paid. Net win on disk: ~98 MB removed from the bundle (~95 MB across 7 GIFs + 3.4 MB unreachable volcanic mp4 fallback that the `webm || mp4` selector never reached). See § 2.3.1 patch-window log for the consolidated v2.7.1 release notes.

- **Removed animated-theme GIF fallbacks** ✅ — the 7 `icons/*-bg.gif` files (forest 1.7, desert 0.3, ice 2.4, volcanic 3.6, mystic 63, golden 7.5, shadow 16.7) deleted from disk. `videoBackgrounds` map in `goal-manager.js` stripped of `gif:` keys (and the unreachable volcanic `mp4:` key); `useGifFallback` helper replaced with `hideVideoKeepThemedGradients()` which hides the failed `<video>` and keeps the `has-theme-bg` class on so the themed sidebar / quest-card gradients still paint a coherent themed look. `body.has-theme-bg::before` rule deleted from `animations.css` (the `themes.css` `has-theme-bg` transparency rules were preserved per spec — they're shared with the video path). `lazyAssets` array in `service-worker.js` emptied; `LAZY_CACHE_NAME` bumped `v270 → v280` to evict the stale ~95 MB lazy cache from returning PWA users on next launch; `CACHE_NAME` bumped `v610 → v611`.
- **Telemetry plumbing — never installed** — the original spec also outlined a codec probe (`video.canPlayType('video/webm; codecs="vp9"')` at boot, surfaced in Tools → Settings as a debug line) + a `localStorage.lqj_webmFails` breadcrumb capped at 10 entries. Skipped because no user reports of non-animating backgrounds came in during the v2.5–v2.7 window. If reports start coming in *now* against a no-GIF v2.7.1+ build (i.e. users seeing static themed gradients instead of animated backgrounds), revisit and add the probe + breadcrumb then. Until then, the static-gradient fallback is itself a graceful degradation, so the lack of telemetry isn't load-bearing.

### 1.7 — Streak Protection & Recovery (planned, v2.8 piggyback or v2.9)

Retention-focused safety net for the daily-login and habit streaks. Today, a single missed day zeroes a streak — fine for casual streaks but punishing for users with long-running habit chains who get sick, travel, or just have a bad day. Adds a forgiveness layer that preserves the *meaning* of a streak (you still have to show up most days) without making one missed day catastrophic.

- **Streak Freeze (consumable)** — single-use item that, when held in inventory at end-of-day, automatically protects the daily-login streak from being reset by a missed day. Consumed silently on use; toast next morning explains what happened ("❄️ Streak Freeze used — your 47-day streak is safe!"). Stacks up to a per-tier cap.
- **Habit-specific streak protection** — extends the same freeze mechanic to individual habit chains (the long-running per-habit streaks tracked on the Habits view). Each habit can hold its own freeze charge so a missed yoga day doesn't burn your global daily-login freeze.
- **Acquisition paths** — earned via chest drops (uncommon tier), bought from §3.7 Rotating Market for Gold, awarded as milestone rewards (every 30-day streak grants 1 freeze automatically).
- **Caps to prevent abuse** — free tier holds max 1 freeze at a time, 1 use per 7 days. Cross-link to §6.4: premium tier holds max 3 freezes and gets an automatic "sick day" shield (1 free freeze per 30 days even if inventory is empty).
- **UX safeguards** — freeze usage is always opt-out (settings toggle for users who prefer the brutal version), and a one-tap "don't use my freeze" button surfaces on the next-day toast so accidental misses can be re-broken intentionally.
- **Streak repair (premium-only, separate from freeze)** — within 48 hours of a streak break, premium users can spend Focus Crystals to restore the streak. Cost scales with streak length (longer streaks cost more) to keep it a meaningful sink rather than a trivial undo.

---

## Phase 2 — Visual & Experience Upgrades (v2.5 – v2.9)

The rest of the 2.x line continues the visual direction set by v2.4.9's animation & effects system. No new gameplay systems land in 2.x — instead each minor version sharpens "feel": navigation polish, character identity, card density, theme expression, and boss/loot drama. Every release ships with an explicit mobile-first / Android-first pass and respects the existing animation intensity setting.

**Guiding principles**
- Every effect ships behind the existing `effectsManager.intensity` gate (Full / Reduced / Minimal) and the `prefers-reduced-motion` safety net
- Every release includes a mobile breakpoint pass and a low-end Android perf sanity check
- Visual additions reuse the `effects-manager.js` primitives wherever possible
- Themeable surfaces honor the current color theme (no hardcoded amber)

### 2.1 — View Transitions & Navigation Polish (v2.5)
- Smooth cross-fade / slide transitions between top-level views (Dashboard ↔ Daily ↔ Calendar ↔ Tools)
- Skeleton loaders on first paint for analytics + heatmap views
- Active nav-link spotlight (gentle pulse on the current tab)
- Mobile bottom-nav: subtle scale + glow on the selected tab
- Quest-card press/hover states with consistent shadow + lift (touch-friendly hit areas)
- Refined button microinteractions (ripple on tap, success flash on confirm)

### 2.2 — Character Sheet & Player Panel Overhaul (v2.6) ✅ Shipped (rolled into v2.7.0)

Developed as a standalone v2.6 line through a long internal cycle but never
released to production on its own — the v2.7 Quest Card & Component Redesign
(§ 2.3) was developed on top of the v2.6 branch, so the two were consolidated
into a single v2.7.0 Play Store rollout. This avoided exposing returning
users to a stale v2.5 client during the v2.6 internal window, and kept the
player-panel + rarity-frame work aesthetically coherent on first contact.
See `CHANGELOG.md` § 2.7.0 for the consolidated breakdown.

**Original v2.6 scope — Character Sheet upgrades** ✅ Shipped
- Animated player avatar frame with rarity ring + prestige slot anchors (8 cardinal/intercardinal positions reserved for v3.0 prestige stars; SVG anchors live in `xp-ring__prestige-slots` group, opacity 0 until v3.0)
- Live-updating XP ring around the avatar (mini + panel sizes; tier-colored stroke, `pathLength="100"` for clean progress math)
- **Comet shimmer overlay** — tier-driven SVG comet image rotates around the ring at variable speed (tiers 4-6 slow, 7-8 medium, 9-10 brisk). Replaced an earlier dashed-stroke approach that rendered as broken segments
- Equipped title rendered on a parchment scroll background (uses `icons/scroll-banner.png`, opens Title Hall on tap)
- Active companion: bubble portrait with gentle idle bob (`companion-bubble` keyframe, slowed on `fx-reduced`, animation stripped on `fx-minimal`)
- Active spell sigils: 0×0 anchor at avatar center holds N rotated children; orbit container spins (24s `sigilOrbit`), inner icons counter-rotate to stay upright. Capped at 7 visible + `+N` overflow badge
- Tap-friendly stat-breakdown tooltips with backdrop-filter blur (`stat-tooltip`); transitions stripped on `fx-minimal`

**v2.6 mid-cycle — Panel & Visual Cohesion Pass** ✅ Shipped (May 27)

The v2.6 release expanded mid-cycle to address dashboard/Tools-view visual fragmentation flagged during real-world testing — different panels were using indigo, purple, blue, gray, and slate chrome simultaneously, producing a "color quilt" rather than a unified surface.

- **Dashboard button consolidation** — flattened the 6-button row (Week Summary / Month Summary / Year Summary / Share Weekly Recap / Challenge a Friend / My Challenges) into 2 amber/stone dropdown buttons (`Reports ▾` / `Challenges ▾`). Each menu uses ARIA disclosure pattern: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`. Outside-click + Escape close handlers bound once at module load. Chevron icon rotates 180° while open. Original icon colors survive as menu-row tints so green=week / blue=month learned associations are preserved.
- **Tools view panel chrome unification** — repainted 7 panels (Backup & Export, Settings, Realm Themes, Tutorial & Help, Share & Community, Privacy & Legal, plus pre-existing Task Reminders) to a single `from-stone-800 to-stone-900 + border-amber-700/50` chrome. Settings panel was the deepest refactor — every internal indigo class was remapped: timezone select, volume slider, 3 section dividers, 6 labels, 3 Animation Intensity buttons, 2 Title Style buttons, Test Sound button, helper-text paragraphs, focus rings.
- **Functional accent preservation** — explicit decision *not* to neutralize colors that carry semantic meaning: red = destructive (Delete All Data), blue = download/info (Export, Restart Tutorial), green = additive (Import, Add Starter Quests, audio toggle ON state), Discord-indigo = brand fidelity, slate = intentionally low-emphasis (Privacy Policy link), yellow/amber = premium signaling (Premium Upgrade card), per-theme palettes inside Realm Themes selector (those *are* the choices). Documented inline in HTML comments so future devs know which colors are negotiable and which aren't.
- **Default-theme particle removal** — the default theme previously spawned `icons/coin.gif` 40px spinning-coin particles (3 initial + interval-spawned, max 15 on screen). They read as visual clutter rather than atmosphere — no thematic anchor like "leaves in a forest" — and competed with the avatar XP ring for attention. Replaced the default config with `{ disabled: true }` and added a guard in `initThemeParticles()` that short-circuits both the spawn interval and the initial-burst loop. All 7 themed states (forest leaves, desert sand, ice snow, volcanic embers, mystic shine, golden sparkle, shadow wisps) keep their atmospheric particles untouched.
- **Body background darkening** — shifted `<body>` from `bg-stone-900` (#1c1917) to `bg-stone-950` (#0c0a09). Side benefit: panels using `from-stone-800 to-stone-900` no longer blend into the body on their bottom-right gradient stop, so cards visibly elevate over the surface instead of leaking into it.
- **Dashboard title decluttering** — removed the `⚔️` crossed-swords emoji from the dashboard `<h2>` because the always-visible top-right player-panel-toggle (avatar + XP ring) sat directly over it on most viewport widths. Title text remains centered in the same position.
- **Bulk Actions button color match** — Tools view quick-action button was `bg-purple-700` while neighboring Undo/Redo were `bg-gray-700`. Aligned to gray-700 so the row reads as four utility buttons of the same weight rather than three utility + one categorical action.

**Architecture notes**
- Chrome theming under non-default themes: `themes.css` re-skins via the `.quest-card` class selector + `[class*="border-amber"]` + `[class*="text-amber*"]` rules. The gradient-background selector specifically targets `from-amber*` / `from-yellow*` and does **not** match the new `from-stone-800 to-stone-900` panels — meaning under themed states, the panel BORDERS and TEXT theme-shift but the gradient background stays stone. This matches the prior behavior (the old indigo/purple/blue/gray/slate panels also weren't matched by that selector, so the Tools view has never been fully theme-aware). Verified visually acceptable because amber/stone reads as a neutral parchment under most theme palettes. If full background re-skinning is desired in a later patch, extend the gradient selector to `[class*="from-stone-8"], [class*="from-stone-9"]` (scoped to dark stones to avoid over-theming the player panel sheet, which uses `from-stone-900` intentionally).
- The disabled-particle config pattern (`{ disabled: true }`) is now the documented way to add a theme that wants no ambient motion — future custom themes can use it without re-introducing the coin.gif issue.
- The action-menu dropdown pattern is generic (`data-action-menu="<name>"` wrapper + `.action-menu` panel + button `aria-haspopup="menu"`) and reusable for any future button consolidation work.

**v2.6 polish — rolled into the consolidated v2.7.0 release**
- Mobile bottom-nav contrast check against the new darker body ✅ — bumped active-tab amber tint + glow so the selection still pops over `bg-stone-950`.
- **Recurring tasks — multi-day-per-week discoverability** ✅ — verified during the v2.6.x audit that the data model and UI already support multi-day weekly schedules (the weekly pattern routes to `showMultiSelectDays`, stores `recurrence: { type: 'weekly', days: [...] }`, and `generateRecurringTasksForToday` checks `days.includes(todayDay)`). Original "missing feature" assumption was incorrect. Polish landed: the multi-select modal subtitle now explicitly says "Tap one or more days" so a user expecting a single-pick flow discovers the multi-day option.
- **Analytics page audit** ✅ — walked every widget on the Analytics view against empty / partial / full dataset states; six root-cause fixes (completion-rate denominator, login-streak source, real task-count timeline, timezone-safe date parsing, two Tailwind dynamic-class refactors). Nine regression tests added. See `CHANGELOG.md` § 2.7.0 → "Fixed — Analytics view correctness pass" and § 5.0 for the long-term tracking entry.
- Custom dashboard background image — still deferred; user is creating the asset, default body color (`bg-stone-950`) is ready to receive it.

### 2.3 — Quest Card & Component Redesign (v2.7) ✅ Shipped

Released as part of the consolidated v2.7.0 build alongside the
§ 2.2 Character Sheet & Player Panel work that was developed but
never shipped as a standalone v2.6. See `CHANGELOG.md` § 2.7.0 for
the full breakdown.

- **Rarity frame system** ✅ — generic `.rarity-frame` chrome layer
  with `data-rarity="common|uncommon|rare|epic|legendary"`. Applied
  to spells (active + spellbook), companions (active + collection),
  loot drops, treasure chests (wooden / bronze / silver / gold /
  royal), titles in Title Hall (positional ramp within each
  category), and badges in Achievement Gallery (per-badge explicit
  rarity). Each card carries a `.rarity-nameplate` Remix Icon stamp
  pinned to the foot, driven by the same `data-rarity` attribute so
  visual tier and label can never disagree.
- **Parallax tilt on epic+ items** ✅ — pointer-tracked 3D rotation +
  follow-the-cursor sheen highlight (`parallax-tilt.js`). Event
  delegation on `document` so it survives every `render()` re-paint;
  rAF-batched so CSS custom properties update at most once per frame.
  Bails on touch and `prefers-reduced-motion`; clamps to 4° on
  `fx-reduced`; re-checks `fx-minimal` per frame.
- **Illustrated empty-state primitive** ✅ — `_renderEmptyState()`
  helper renders a parchment card with corner flourishes, rotating
  ray-burst, medallion icon, drifting sparkles, headline, body
  copy, and optional CTA. Now used on 8 surfaces: locked goals,
  recurring tasks, habits, today's tasks, side quests, companion
  collection, archived goals, active spells, calendar day-detail.
- **Progress bar polish** ✅ — ambient shimmer sweep, near-
  completion accelerator at 75%+, epic glow + pulse at 100%. All
  three layers respect `fx-reduced` (slower) and `fx-minimal` (off).
- **Iconography pass** ✅ — Remix Icon SVG glyphs replace platform-
  rendered emoji across the app's chrome (toast cosmetic-icon,
  section headers, recurring-task pattern picker, "Which Week?"
  ordinal picker, Daily Quest Pool icons, Daily Quest Board status
  badges, `index.html` chrome buttons). Content / identity emoji
  (level-up titles, chest tier reveals, boss themes, enchantment /
  spell icons, side-quest priority indicators, splash backgrounds)
  intentionally retained.

**v2.7 late-cycle — Motion Calm Pass + Motion Token System** ✅ Shipped
(June 1, 2026)

After integration testing of the consolidated v2.7 build, an audit
flagged "perpetual motion noise" as the dominant idle-state feel:
the Character Sheet (§ 2.2) added 3 ambient layers around the avatar
(comet, sigil orbit, companion bob), § 2.3 added rarity-frame sheens
and always-on progress-bar shimmer, and earlier work left infinite
nav/tab pulses and empty-state icon bobs in place. On a list-heavy
view every progress bar and every avatar accessory was animating
simultaneously, fighting for attention and softening the impact of
reward animations (boss defeats, level-ups, spell casts) that
*should* read as climactic. Calm pass trims the ambient layer so
reward moments land harder against a quieter background.

- **Nav + tab active pulses removed** ✅ — `navActivePulse`,
  `goalTabActivePulse`, and `arcaneTabActivePulse` (all 2.4s
  infinite loops) replaced with static `box-shadow` glows at the
  pulse-peak intensity. Active state still legible without the loop.
- **Empty-state icon float removed** ✅ — `.empty-state-icon` base
  `float 3s infinite` rule + keyframe deleted. Was already overridden
  by the medallion wrapper in every in-app usage; marketing-page
  `float` keyframes untouched.
- **XP-ring shimmer + shimmer-pulse layers removed** ✅ —
  `.xp-ring__shimmer { display: none }`; deleted the
  `xpRingShimmer` / `xpRingShimmerPulse` keyframes and all tier-7-10
  shimmer rules. Comet (`xpRingCometSpin`) and tier-graded
  `drop-shadow` glow preserved. Three motion layers per ring → one.
- **Progress-bar shimmer gated to scroll-into-view** ✅ —
  `.progress-bar > div::after` no longer carries an `animation:` by
  default. New `_initProgressBarShimmerObserver()` in
  `goal-manager.js` wires an `IntersectionObserver` + `MutationObserver`
  pair that toggles `.shimmer-once` for ~7.1s (2 cycles × 3.5s) when
  any bar crosses the 10% visibility threshold, then removes the
  class so subsequent re-entries can replay. Short-circuits on
  `prefers-reduced-motion` and `body.fx-minimal`. Mobile users
  (no hover) now see the shimmer on initial appearance instead of
  never seeing it.
- **Rarity sheens verified** ✅ — audit confirmed common/uncommon/
  rare frames already carry no infinite animations; only epic
  (`epicBorderSheen 4s`) and legendary (`rarityLegendaryShimmer 5s`)
  retain perpetual sheens. Kept as-is — the top two tiers earning a
  visible "this is rare" signal is intentional.

**Motion Token System** ✅ — single source of truth for animation
durations and easings across the app, defined at `:root` in
`animations.css`. Adopted alongside the calm pass so future motion
review reduces to "is this animation a `medium` or a `long`?"
instead of arguing whether 320ms or 280ms is right.

- 9 duration tokens (`--motion-micro` 80ms, `--motion-short` 200ms,
  `--motion-medium` 300ms, `--motion-long` 500ms, `--motion-confirm`
  800ms, `--motion-celebration` 1500ms, `--motion-epic` 2500ms,
  `--motion-ambient` 6000ms, `--motion-ambient-slow` 24000ms)
  mapped to Material Design 3 categories extended with gamification
  buckets (confirm/celebration/epic/ambient).
- 4 easing tokens (`--ease-out-standard`, `--ease-out-soft`,
  `--ease-in-out-loop`, `--ease-linear-loop`).
- Migrated 8 canonical exemplars: button + nav press feedback,
  view-container entrance, spell-flash, XP-ring comet, sigil orbit
  (parent + counter-rotating icons), empty-state ray rotation.
  Each migration kept an inline `/* v2.7 motion tokens — was X */`
  comment for traceability.
- Migration policy: **opportunistic**. New code uses tokens; existing
  rules migrate when next touched. Mass find/replace explicitly
  discouraged because some literal values are intentionally off-token
  (boss-defeat shatter sequence has bespoke per-keyframe timings).

### 2.3.1 — v2.7.x Patch Window 🚧 Active (Jun 1, 2026 → target ~Jun 7, 2026)

Operational posture between the v2.7 release and the start of v2.8 work.
Documented here so the cadence is explicit and future-me knows when and
on what evidence to flip back into feature-development mode.

**Why a patch window** — v2.7 is the largest visual release of the 2.x line
(consolidated v2.6 + v2.7 scope, ~5 weeks of internal work landing in a
single Play Store rollout). High change density means a higher probability
of surface-level issues that internal testing missed. Holding new feature
work briefly lets surface bugs land against a stable v2.7 baseline rather
than getting buried under v2.8 churn — worst case being shipping v2.8
themes on top of a broken v2.7 panel layout.

**Audience-sized window — ~1 week, not 2** — the project has ~50 active
users and the maintainer (me) uses the app daily. That makes **daily
self-use the dominant detection channel**, not Play Store reviews or
crash analytics. A 2-week window would mostly be waiting on signals that
won't arrive at this scale; a 1-week window matches the realistic feedback
loop. Extend only if a real issue lands.

**Active posture**
- No new feature work on the v2.8 line. § 2.4 themes paused.
- § 1.6 GIF fallback removal still deferred (see piggyback below).
- Code changes limited to: bug fixes, regressions reported by users,
  cherry-picked low-risk polish only if a fix is already touching the file.

**Monitoring channels** (in actual signal-strength order, given ~50 users)
- **Daily self-use on the live build** — primary signal. The maintainer is
  the most reliable bug reporter. Focus on the heaviest v2.7 surfaces:
  Character Sheet, Title Hall, spell/companion collections, illustrated
  empty states, progress bars across all list views.
- Direct user reports via Discord / email / in-app feedback.
- Google Play Store reviews on Build 23 and any follow-up builds.
- Play Console → Android vitals → crashes & ANRs (low-volume signal at
  this user count, but free to glance at; the in-app update flow from
  § 1.5 means any crash spike would show within ~48h of release anyway).

**Patch triage**
- **Ship immediately as v2.7.x** — crashes, broken core features (task
  creation, save/load, login bonus, focus timer), data loss, save corruption,
  any security regression.
- **Batch into next v2.7.x** — visual bugs, accessibility issues, perf
  complaints, minor render glitches on specific devices.
- **Defer to v2.8** — feature requests, polish items, edge-case rendering
  quirks that don't affect functionality.

**Piggyback opportunity** — if any v2.7.x patch ships, bundle § 1.6 GIF
fallback removal into the same release. Both require a service-worker cache
bump anyway, so combining them is effectively free; the GIF removal alone
wouldn't justify the release-ceremony overhead. If no patch ships during the
window, GIF removal slides into v2.8.0.

**Exit criteria — start v2.8 themes when either:**
- ~1 week passes (target Jun 7, 2026) with no critical issues spotted in
  daily self-use or external reports, OR
- A v2.7.x patch ships and ~3 days of follow-up daily self-use is clean.

Whichever comes first. If a serious issue lands late in the window, extend
the window rather than start v2.8 on top of an unstable v2.7.

**Patches landed during the window — bundled as v2.7.1 (Jun 1, 2026)**

- **Modal scroll-clipping fix** — the v2.7 What's New modal grew
  from 2 sections / 8 bullets to 4 sections / 11 bullets, exceeding viewport
  height on shorter phones. Outer wrapper had `fixed inset-0` with no
  `overflow-y-auto`, so `flex items-center` centered a taller-than-viewport
  card with both ends clipped behind the viewport edges and no scroll.
  Fixed by adding `overflow-y-auto` to the outer wrapper of `whats-new-modal`.
- **Preventive modal-containment audit** — same-day audit walked
  every modal in the codebase (7 in `index.html`, 18 in `goal-manager.js`)
  against the same vulnerability profile (centered modal + tall content +
  no containment on outer or inner card). Found **8 truly vulnerable** modals
  (5 false positives turned up containment I missed in the first pass:
  `connection`, `select`, `create-challenge`, `active-challenges`,
  `premium-purchase` all already had `max-h-[Nvh] overflow-y-auto` inline).
  Fixed by appending `max-h-[90vh] overflow-y-auto` to the inner gradient
  card class on each: `search-modal`, `login-shield-prompt`,
  `login-streak-modal`, `period-transition-modal`, `share-card-modal`,
  `weekly-recap-modal`, `challenge-share-modal`, `accept-challenge-modal`.
  None had been observed clipping in production yet — preventive fix to
  catch them before they show up on a shorter device.
- **GIF fallback removal piggyback (§ 1.6 resolved)** — bundled into the
  v2.7.1 release because the modal patches were already triggering a
  service-worker cache bump, making the cache-invalidation cost free.
  Deleted 8 files totaling **~98 MB** from the bundle: 7 `icons/*-bg.gif`
  runtime fallbacks (forest 1.7, desert 0.3, ice 2.4, volcanic 3.6,
  mystic 63, golden 7.5, shadow 16.7) plus the unreachable
  `icons/volcanic-bg.mp4` (3.4 MB) that the `webm || mp4` selector
  never reached because every theme has a webm. Code changes:
  `videoBackgrounds` map in `goal-manager.js` stripped to `webm:`-only
  entries; `useGifFallback` helper replaced with
  `hideVideoKeepThemedGradients()` which on hardware-decode failure
  hides the `<video>` and keeps `has-theme-bg` on so the themed
  sidebar / quest-card gradients still paint a coherent themed look
  (graceful degradation rather than the previous GIF swap);
  `body.has-theme-bg::before` rule deleted from `animations.css`
  (the `themes.css` `has-theme-bg` transparency rules were preserved
  per spec — shared with the video path); `lazyAssets` emptied in
  `service-worker.js`; `LAZY_CACHE_NAME` bumped `v270 → v280` so the
  activate handler evicts the stale ~95 MB lazy cache from returning
  PWA users on next launch.
- **Themed-particle visibility fix (Jun 2)** — uncovered during v2.8
  theme-system planning when the user reported "particles have never
  really shown up in the theme." Investigation found `.theme-particle`
  defined twice in `animations.css`: the canonical rule at line 1461
  (just `position: absolute; pointer-events: none; will-change:
  transform, opacity`) and a duplicate at line 1909 that re-declared
  `width: 10px; height: 10px; border-radius: 50%; animation:
  theme-particle-burst 0.8s ease-out forwards`. Because CSS cascade
  picks the later rule at equal specificity, every ambient particle
  (`.particle-ember`, `.particle-sand`, `.particle-gold`,
  `.particle-shadow`, `.particle-gif`, `.particle-gif-rise`) was
  silently rewritten into a 10px circle running an 0.8s burst keyframe
  that translated it off-anchor and faded to opacity:0 — then sat
  invisible until JS removed it. Net effect since the burst rule
  landed (likely v2.4.x — the comment header reads *"Particles burst
  on theme change"*): **themed ambient particles never visibly
  rendered**, despite `initThemeParticles` + `spawnParticle` in
  `goal-manager.js:9921-10023` working correctly. The intended
  completion-burst feature (`createCompletionParticles` at
  `goal-manager.js:7117`) uses the `.completion-particle` class and
  its own inline Web Animations API `.animate()` call — it never
  referenced the dead keyframe, so the duplicate `.theme-particle`
  rule + the `@keyframes theme-particle-burst` keyframe were both
  pure dead code that happened to share a class name with the
  ambient-particle system. Fixed by deleting both, with an archival
  comment in their place explaining the diagnosis so the next dev
  doesn't accidentally re-add a same-named class. Themed leaves
  (forest), sand (desert), snow (ice), embers (volcanic), shine
  (mystic), gold sparkles (golden), and shadow wisps (shadow realm)
  now visibly render for the first time in the app's history.
  *Note for release notes copy:* prior release messaging that
  mentioned "themed ambient particles" should be considered
  retroactively accurate as of this fix, not as of when the
  configurations were added — the system was wired but visually
  silent. Bug found bonus during planning; fix is a clean dead-code
  delete with zero behavior risk.

**Cumulative SW cache series during the window** — `v608` (v2.7.0
release) → `v609` (whats-new modal scroll fix) → `v610` (8-modal
preventive audit) → `v611` (v2.7.1 GIF removal). The hundreds-digit
stays in the v6xx series since this is all v2.7.x; v2.8.0 will ramp
to v7xx per the documented cache-naming convention.

**Modal-containment standard (going forward)**

Every centered modal (the `fixed inset-0 + flex items-center` pattern) MUST
carry one of these containment strategies on its inner gradient card:

1. **`max-h-[90vh] overflow-y-auto`** — preferred default. Card caps at
   90vh, scrolls internally, leaves 10vh breathing room around the modal.
   Works for modals where occasional vertical scroll is acceptable.
   Examples: every modal patched on Jun 1, plus `period-summary` and
   `connection-modal` which already used it.
2. **`max-h-[Nvh] flex flex-col` with a child `overflow-y-auto`** — when
   the modal has a sticky header / footer that should NOT scroll with the
   body. The middle scrolling region is a child div with `overflow-y-auto
   max-h-[60vh]` (or similar). Examples: quest-search modal (16539),
   starter-quests modal (17483), create-challenge-modal (18657),
   active-challenges-modal (19353).
3. **Fixed-content small modals** — `priority`, `input`, `multiselect`,
   reminder/confirm/warn alert variants — content is bounded by design
   (≤ 4 buttons or one form field), so `max-h` is unnecessary. Adding it
   does no harm; omitting it is acceptable.

A new modal that doesn't fit (1) or (2) should default to (1) unless the
content is provably bounded under (3). The trade-off: option (1) means
absolutely-positioned close buttons (`absolute top-3 right-3`) scroll
with content rather than staying pinned. This is acceptable per existing
codebase precedent (the period-summary modal accepts it). If pinning is
required, use option (2) and put the close button in a non-scrolling
header div.

### 2.4 — Theme System Expansion (v2.8) ✅ Shipped (Jun 7, 2026)

**Asset strategy — Strategy D (CSS-first hybrid)** *(pending Stormwatch
device-test validation, Jun 2–7)*. After the v2.7.1 GIF-removal trim
that clawed back ~98 MB of bundle, doubling down on video-per-theme
walks straight back into the same trap. New themes will default to
pure-CSS implementations (gradient + `--theme-*` CSS vars + the existing
per-theme particle system, now visibly working as of the Jun 2 fix
above). Video reserved for at most ONE marquee theme per release where
the ambient motion is genuinely uplifting (auroras, underwater light
shafts). Trade-offs and full rationale captured in the Jun 2 planning
conversation; key wins are infinite scalability (no MB-per-theme cost,
enables "Theme of the Week" rotation), DevTools-live iteration speed,
and zero risk of repeating the 63 MB mystic-bg.gif regression.

**Theme list — locked at 5 working titles** (Stormwatch, Sunken Library,
Verdant Grove, Obsidian Forge, Aurora Spires). Ship 4 in v2.8, hold 1
in reserve for v2.9 to keep momentum/per-theme polish budget honest.
Final cut order TBD after the prototype validates the strategy.

**Stormwatch prototype landed Jun 2 (CSS-only) → promoted to hybrid
marquee Jun 3.** Initial Jun 2 build was the proof-of-concept for
strategy D: stormy slate gradient + bluish radial highlights as the
body background (`themes.css:187-216`); fixed full-viewport
`body::after` lightning overlay using `mix-blend-mode: screen` on an
11s `stormwatch-lightning` keyframe with a double-flicker stutter for
forked-lightning realism (`animations.css:1815-1844`); `.particle-rain`
class — 1.5px slate-blue streaks with soft trailing gradient falling
top→bottom over 1.5–2.5s. Wired into `themeDefinitions` and
`getParticleConfig` in `goal-manager.js` with `unlockLevel: 0,
premium: false` for testing; constructor default + loadData migration
+ import-data migration all auto-grant `'stormwatch'` to
`unlockedThemes` (three insurance points after the Capacitor APK fresh-
install path was found to skip `loadData()`'s migration block — see
`goal-manager.js:32`, `:387-394`, `:12330-12334`). User device-tested
the CSS-only build the same day and confirmed it "looks good" with
minor particle/header tuning issues against other themes (logged in
§ 2.3.1 patch series above). **Jun 3 promotion to hybrid:** user
provided `icons/stormwatch-bg.webm` v1 (861KB, pure-atmosphere stormy
cloud footage with no baked-in lightning or rain). Wired into the
`videoBackgrounds` map at `goal-manager.js:9869-9875` with an archival
comment; `body.has-theme-bg.theme-stormwatch` added to the body- and
content-area-transparency lists at `themes.css:473` and `:492-493` so
the video shows through. Both CSS overlays (lightning + rain) initially
kept as-is and layered ON TOP of the WebM via `mix-blend-mode: screen`
(lightning) and z-index ordering (rain particles). This locks
Stormwatch as the **v2.8 marquee theme** — the four remaining v2.8
themes stay pure-CSS per strategy D's "at most ONE marquee theme per
release" clause. **Jun 3 lightning iteration & removal:** the original
lightning flash overlay was flagged as uncomfortably close to WCAG
2.3.1's three-flashes-per-second threshold (double-flicker keyframe
with two transitions in ~250ms, no `prefers-reduced-motion` gate).
Rewrote to a softer horizon glow (radial gradient anchored below
viewport, smooth ease-in-out 12s cycle, reduced-motion-gated). Device
tested and rejected by user — both the original flash and the horizon
glow read as "off" rather than atmospheric. Lightning effect removed
entirely; the storm cue is now carried by the WebM's cloud motion +
`.particle-rain` streaks alone, which is honestly accurate (most real
storms are visible primarily as rain + dark moving clouds, with the
actual bolt being a rare event rather than constant). If lightning is
ever added back IN CSS, the Jun 3 horizon-glow implementation (with
the reduced-motion gate intact) is the recommended starting point —
see git history for `animations.css` around the Jun 3 commit.
**Jun 3 WebM v2 (992KB):** user re-encoded the source video to add
small cloud-to-cloud lightning flashes baked INTO the footage
(visible behind the clouds rather than as a full-viewport overlay).
This restores the lightning cue without reintroducing the WCAG-2.3.1
or `prefers-reduced-motion` concerns that killed the CSS-side
attempts: video flashes are constrained to the cloud region,
naturally limited in contrast (the partially-occluded-by-cloud
framing keeps peaks well below pure white), and the WebView treats
them as ordinary video content rather than synthetic UI motion. Net
result: Stormwatch now reads as a proper storm theme — moving clouds
+ subtle internal lightning glints + rain streaks — with the
accessibility lessons baked in by design rather than by code gate.
File size went 861KB → 992KB; still well under the 3MB-per-WebM
budget and total bundle weight stays comfortable.

**Prototype cleanup checklist — BEFORE v2.8 RELEASE:**

- [x] **RESOLVED Jun 4 (v2.8 kickoff):** `unlockLevel` locked to **18**
      — slots cleanly between ice (15) and volcanic (20) without
      breaking the existing 5-level cadence. Boss tie-in deferred to
      v2.9 if Stormwatch warrants its own encounter.
- [x] **RESOLVED Jun 4 (v2.8 kickoff):** `premium: true` — matches
      every other non-default theme. The 2-free / 6-premium ratio
      becomes 2-free / 7-premium with Stormwatch.
- [x] **RESOLVED Jun 4 (v2.8 kickoff):** All 3 auto-grant insurance
      points removed (constructor at `goal-manager.js:25-27`, loadData
      at `:384-387`, importData at `:12368-12371`). The `special:
      'Coming Soon'` field also dropped from the themeDefinitions
      entry. Long parking comments at all sites replaced with concise
      production comments.
- [x] **RESOLVED Jun 4 (v2.8 kickoff):** Stormwatch scrollbar styling
      added at `themes.css:658-676`, matching the per-theme scrollbar
      pattern. Desaturated steel tones (`#94a3b8 → #64748b` thumb,
      slate-900 transparent track) match the Jun 3 palette tune that
      pulled accents away from saturated sky-blue toward harmonizing
      with the WebM's overcast cloud video.
- [x] **RESOLVED Jun 3:** Stormwatch is the v2.8 marquee theme. WebM
      added (`icons/stormwatch-bg.webm`, 861KB pure-atmosphere clouds);
      lightning + rain CSS overlays layer on top via mix-blend-mode +
      z-index. Sunken Library / Verdant Grove / Obsidian Forge / Aurora
      Spires stay pure-CSS for v2.8.
- [ ] **Pending user device test:** stress-test particle perf on
      low-end Android with rain spawnRate at 120ms / maxParticles 80.
      The particle config comment at `goal-manager.js:10010-10013`
      notes the existing intensity multiplier scales these down for
      reduced/minimal modes — verify on hardware that "Full" mode
      doesn't drop frames during sustained rain.
- [x] **RESOLVED Jun 3 (CSS lightning removed; reintroduced via WebM
      v2):** the WCAG-3-flashes concern was sidestepped by removing
      the CSS-side lightning effect, and the lightning cue itself was
      then restored by baking small cloud-to-cloud flashes directly
      into the WebM v2 footage (constrained to the cloud region, low-
      contrast, treated as ordinary video by the WebView). If a CSS-
      side lightning effect is ever reintroduced (e.g. for a brighter
      strike during boss-battle storm events), the reduced-motion-
      gated horizon-glow from the Jun 3 iteration is the starting
      point.

**v2.8 theme lineup — STATUS** *(Jun 5, 2026 update — strategy D
validated, all 5 themes built; SVG silhouettes deferred)*:

- **Stormwatch** ✅ SHIPPED — hybrid marquee (level 18). WebM v2 (992KB,
  baked-in cloud-to-cloud lightning) + `.particle-rain` streaks. CSS
  lightning was iterated through 3 versions then dropped Jun 3 in favor
  of letting the WebM carry the storm cue alone. Palette tuned Jun 3 to
  desaturated slate to harmonize with the overcast WebM. See §2.4 above
  for the full Jun 2-3 timeline.
- **Verdant Grove** ✅ SHIPPED — promoted from pure-CSS to hybrid (level
  22). Originally landed as palette + `.particle-leaf` + moss SVG
  variety system (84-combo cycle); promoted Jun 4 when user supplied
  ambient grove WebM (`icons/verdant-bg.webm`, currently 4.83MB pre-
  compression). Palette retuned Jun 4 to warm sun-dappled olive tones
  to match the actual WebM (was cool jade originally). Moss SVG accents
  removed Jun 4 — felt redundant against the real foliage in the video,
  preserved in git history if reintroduction wanted.
- **Sunken Library** ✅ SHIPPED — PROMOTED to **hybrid** Jun 5, 2026
  evening (round 3.5 continuation, level 13) when user supplied
  `icons/sunken-library-bg.webm` (3.28MB — second outstanding
  compression candidate alongside Verdant 4.83MB; shipped as-is
  because the drowned-archive WebM markedly elevates the underwater
  feel beyond what the pure-CSS 3-radial gradient could sell). The
  original teal/deep-blue palette + parchment-amber accent +
  `.particle-bubble` class (rising spheres with bioluminescent
  shimmer) all remain wired as the no-decode fallback (Verdant
  pattern) via `body.has-theme-bg.theme-sunken` transparency rules
  in themes.css. Bubbles continue rendering ON TOP of the WebM —
  video carries the drowned-archive scene, particles carry the
  living-water motion. SVG bookshelf silhouettes from the original
  sketch are now FULLY OBSOLETE (the WebM presumably contains real
  bookshelf imagery); the deferral note is retired. Wired into
  `videoBackgrounds` map in goal-manager.js right after the crystal
  entry; transparency entries added to both blocks at the bottom of
  themes.css.
- **Dark Cathedral** ✅ SHIPPED — PROMOTED again to **full hybrid** Jun 5
  evening (round 3.5 continuation) when user supplied
  `icons/dark-cathedral-bg.webm` (1.49MB — under the 2MB per-asset
  rule, no compression flag needed). The static image cathedral-bg.webp
  (885KB) now demotes to a pure no-decode fallback role: it remains
  referenced in the `body.theme-cathedral` background stack at the
  top of themes.css so that if the WebM fails to decode (or
  `hideVideoKeepThemedGradients` strips `has-theme-bg`) the .webp
  still paints behind the now-transparent shell. Special-case CSS
  from the static-image-only era is removed in this same change:
  the round-3 ungated `body.theme-cathedral` transparency block and
  the `html body.theme-cathedral` image-reassertion rule are both
  gone (revert via `git show HEAD~1:themes.css`); Cathedral now
  follows the **standard Verdant/Crystal/Sunken pattern** via
  `has-theme-bg.theme-cathedral` gating in the two transparency
  blocks at the bottom of themes.css. `.particle-mote` pale-moonlight
  override under `body.theme-cathedral` remains in place — motes
  ride on top of the WebM the same way bubbles ride on top of the
  Sunken WebM. **v2.8 hybrid count is now FIVE** (Stormwatch,
  Verdant, Crystal, Sunken, Cathedral); Aurora Spires is the lone
  pure-CSS theme remaining. **Jun 7, 2026 evening — smoke-particle
  experiment reverted.** Briefly swapped `.particle-mote` →
  `.particle-smoke` (cool ash-grey wisps with `filter:blur(2px)`,
  scale 0.6→1.4 dispersal, sparse 4500ms spawn) to suggest
  extinguished-candle smoke. Reverted same evening on user
  feedback after on-device test — the soft blurred wisps didn't
  read as crisply as the existing pale-moonlight motes against
  the cathedral video, and the original mote-in-light-shaft
  reading was already doing its job. The smoke prototype caught
  one real bug on the way out: `@keyframes smoke-rise` collided
  with Shadow Realm's pre-existing keyframes of the same name
  (CSS keyframes share a global namespace, last-defined wins) —
  good lesson for any future theme-specific particle keyframes
  to use a theme-prefix. Smoke CSS + JS swap fully removed; mote
  override restored to its prior shipped state.
  Earlier history: UPGRADED to static
  image Jun 5 afternoon (round 3, then round 3.5 same afternoon
  stripped the CSS candle-flicker overlay that briefly shipped
  alongside the image
  — the warm yellow-amber flame points fought the image's crimson
  palette and the irregular flicker pulled the eye away from the
  altar centerpiece rather than reinforcing it. The image carries the
  cathedral atmosphere cleanly on its own; baked-in painted highlights
  on the chandeliers/candelabras already imply candlelight without
  any motion layer. Keyframes, `.candle-flicker` class, and the
  `#theme-cathedral-candles` div in index.html were all removed —
  revert path is `git show HEAD~1:animations.css` and `index.html`).
  Originally landed
  as pure-CSS violet+amber gradient (round 2 morning, renamed from
  "Obsidian Forge" sketch). User supplied a black-and-crimson gothic
  cathedral interior image (`icons/cathedral-bg.webp`) — reading
  shifted from "solemn medieval cathedral" to "gothic crimson
  cathedral / vampire-coven ritual hall," palette retuned
  accordingly: primary violet (#6b21a8) → crimson red-800 (#991b1b),
  accent warm amber (#f59e0b) → cold cathedral-window slate-400.
  Movement layer is 4 fixed-position `.candle-flicker` divs in
  index.html (gated by `body.theme-cathedral`), positioned at
  ~44%/57% × 42% (altar candles) and ~30%/70% × 24% (inner
  chandeliers) — these survive portrait-mobile crop of the 16:9
  image at `background-size: cover`. Outer ~7%/~93% chandeliers in
  the image are NOT overlaid because they clip off-image on portrait
  phones. Flicker uses two composed keyframes (`candle-flicker-glow`
  3.7s opacity wobble + `candle-flicker-pulse` 2.3s scale wobble)
  with per-`:nth-child` `animation-delay` offsets that prevent the 4
  flames from syncing. Honors `prefers-reduced-motion` (freezes
  glow at 0.88 opacity, no pulse). Bottom vignette
  (`linear-gradient(to top, rgba(0,0,0,0.85) → transparent at 38%)`)
  fades the red benches into shadow so the saturated red doesn't
  compete with bottom-of-screen UI — this was the #1 legibility
  risk flagged in the design review. Scrollbar retuned violet →
  crimson to match. `.particle-mote` overridden to pale-moonlight
  white under `body.theme-cathedral` (the default warm-amber motes
  clash with the new crimson palette; pure-CSS round 2 themes that
  use motes elsewhere are unaffected). The original violet+amber
  pure-CSS gradient is **fully removed** from themes.css (not just
  commented out — kept in git history at the commit immediately
  before this upgrade for clean revert via `git show HEAD~1:themes.css`).
  Bundle impact: image is user-supplied (target ~300-500KB
  compressed WebP); zero JS or WebM cost. **Why static-not-WebM:**
  believable candle-flicker baked into a WebM produces seam-glitches
  when the loop repeats (eye locks onto recurring flame shapes);
  CSS-driven point-of-light flicker is what AAA games use for the
  same effect, costs nothing, and composes cleanly with the reduced-
  motion gate. The `.particle-mote` class (originally introduced in
  round 2 for the violet+amber gradient — warm dust drifting in
  light shafts, slower/softer than embers) is preserved globally
  but its appearance is overridden under `body.theme-cathedral` to
  pale-moonlight white as noted above. Anvil SVG from the original
  Obsidian Forge sketch is N/A (theme retargeted twice now).
- **Aurora Spires** ✅ SHIPPED — PROMOTED to **hybrid** Jun 6, 2026
  evening (round 4) when user supplied `icons/aurora-spires-bg.webm`
  (3.08MB — over the 2MB per-asset rule, joins Verdant 4.83MB and
  Sunken 3.28MB as the **third** outstanding compression candidate;
  shipped as-is because aurora content is ideal for VP9 (smooth
  gradients, slow temporal change, limited green/purple/magenta
  palette) and a CRF 30-32 re-encode should reclaim significant
  space at zero perceptible cost when the v2.8 compression sweep
  gets prioritized). Originally shipped as pure-CSS (level 35, top
  of unlock ladder) — indigo-midnight gradient with green-purple-
  magenta aurora bands suggested via layered radial highlights, plus
  `.particle-star` class (tiny twinkling rising specks). The pure-CSS
  layer now serves as the no-decode fallback (Verdant pattern) via
  `body.has-theme-bg.theme-aurora` transparency rules in themes.css;
  star particles continue rendering ON TOP of the WebM, same
  composition as Sunken bubbles + Crystal shards. The originally-
  sketched animated `mix-blend-mode: screen` band exploration is
  now MOOT — the WebM carries real aurora motion, no CSS animation
  needed. Wired into `videoBackgrounds` map in goal-manager.js as
  the final entry; transparency entries added to both blocks at
  the bottom of themes.css. **This was the LAST pure-CSS theme to
  fall — v2.8 hybrid count is now SIX, every theme in the lineup
  has a real asset.**

- **Crystal Caves** ✅ SHIPPED Jun 5, 2026 — PROMOTED to **hybrid**
  same-day afternoon (round 3.5) when user supplied
  `icons/crystal-cave-bg.webm`. Originally shipped that morning as
  pure-CSS theme #6 (level 31), added per user direction to even out
  the unlock ladder (was a 7-level gap Cathedral 28 → Aurora 35;
  now 28→31→35). Underground geode aesthetic — deep slate cave-rock
  base pierced by asymmetric magenta + cyan crystal-cluster radials
  (5 radials total, more than other v2.8 themes, because a
  *scattered cluster* of crystals reads differently from a single
  light source); these gradients now act as the no-decode fallback
  via `body.has-theme-bg.theme-crystal` transparency rule (Verdant
  pattern). Signature feature is the `.particle-crystal` class: 6px
  diamond shards (45deg rotated squares) that rise, tumble (continuous
  360deg via the standalone `rotate` CSS property to avoid clobbering
  the rise's transform), and shimmer via cheap GPU `hue-rotate` —
  geometric rather than organic particles, deliberately differentiated
  from Cathedral's warm round motes and Aurora's cool round starlight.
  Particles remain wired on top of the WebM (Verdant pattern: video
  carries the cave, particles carry the magic). Icon 💎. Wired into
  `videoBackgrounds` map in goal-manager.js right after the verdant
  entry; transparency entries added to both blocks at the bottom of
  themes.css. (At time of Crystal landing, v2.8 was at three hybrids
  Stormwatch+Verdant+Crystal; Sunken Library was promoted to hybrid
  later the same evening — see its bullet above for the running
  count. Strategy D's "ONE marquee per release" clause is now
  decoupled from a count cap, governed solely by total animated-bg
  bundle envelope — see the accounting paragraph below.)

**Strategy D "at most ONE marquee per release" clause — REVISITED** *(Jun
4-6, 2026)*: v2.8 originally allotted ONE marquee theme (Stormwatch).
Verdant Grove was bumped to hybrid post-WebM-supply Jun 4 (two hybrids);
Crystal Caves and Sunken Library were both bumped to hybrid Jun 5
evening making it FOUR hybrids; Cathedral landed as a static-image
theme (round 3) and was THEN promoted to full hybrid the same evening
when the user supplied a WebM (FIVE hybrids); Aurora Spires — the
last pure-CSS holdout — was promoted to hybrid Jun 6 evening (round 4)
bringing the v2.8 hybrid count to **SIX**. **Every theme in the v2.8
lineup now ships with a WebM background — zero pure-CSS themes
remaining.** Cathedral additionally retains its 885KB static .webp
as a no-decode fallback (referenced in the body background stack),
so the .webp is not "wasted" — it acts as the graceful-degradation
tier when the WebM can't decode. **Final bundle impact** (pre any
re-compression sweep): Stormwatch 992KB + Verdant 4.83MB + Crystal
1.95MB + Sunken 3.28MB + Cathedral WebM 1.49MB + Cathedral fallback
.webp 885KB + Aurora 3.08MB ≈ **16.50MB** vs the all-pure-CSS
baseline. Crystal 1.95MB, Cathedral WebM 1.49MB, Cathedral .webp
885KB, and Stormwatch 992KB sit at or under the 2MB per-asset sweet
spot; **Verdant 4.83MB, Sunken 3.28MB, and Aurora 3.08MB are the
three outstanding compression candidates** if/when the v2.8 bundle
audit gets prioritized (combined 11.19MB → realistic ~5MB target
post-CRF-32 re-encode, reclaiming ~6MB). Even at 16.50MB, the v2.7.1
GIF-removal sweep (~98MB reclaimed) leaves comfortable headroom.
Resolution: the count-cap clause is **dropped entirely** — the real
constraint is total animated-bg bundle, and player-perceived value
of multiple atmospheric backgrounds outweighs the size cost while
we sit well under the reclaimed-headroom envelope.
**New informal rule** (replacing the old "~5MB compressed total" target
floated Jun 4 before Crystal/Sunken/Cathedral/Aurora landed): prefer
pure-CSS, allow hybrids when (a) the user supplies a WebM/image that
markedly elevates the theme and (b) no single asset exceeds ~2MB
compressed without a compression-pass plan attached.

**Compression sweep — EXECUTED Jun 6, 2026 evening** (round 4 finalization):
ran 2-pass libvpx-vp9 re-encodes on the three backlog WebMs. ffmpeg
8.1.1, no audio (verified all three sources had no audio streams to
begin with), source resolutions/framerates preserved. Realized vs
predicted:

| WebM     | Before  | After   | Reduction | CRF | Notes |
|----------|---------|---------|-----------|-----|-------|
| Aurora   | 3.08 MB | 1.12 MB | **63.5%** | 32  | Smooth gradients = ideal VP9 content, exactly as predicted |
| Sunken   | 3.28 MB | 1.05 MB | **67.9%** | 32  | Caustics compressed even better than predicted |
| Verdant  | 4.82 MB | 3.26 MB | **32.3%** | 44  | Foliage = worst-case content; CRF 32 actually *grew* the file 4.82→6.22MB because source was already constrained-bitrate at 2373kb/s. Stepped through CRF 40 (4.15MB, 14% off) → CRF 44 (3.26MB, 32% off). Stopped at 44 because pushing further (46-48) risked visible smearing of the high-frequency leaf detail; Verdant remains over the 2MB rule but a deliberate exception |
| **Sum**  | 11.18 MB | 5.43 MB | **51.4%** combined | | ~5.75 MB reclaimed |

Originals preserved at `icons/_originals/` for A/B comparison and
clean revert if any of the new encodes turns out to read worse on
device. Revert command: `Move-Item -Force icons/_originals/*.webm icons/`.

**Post-sweep bundle**: Stormwatch 992KB + Verdant 3.26MB + Crystal
1.96MB + Sunken 1.05MB + Cathedral WebM 1.49MB + Cathedral fallback
.webp 885KB + Aurora 1.12MB ≈ **10.76MB** (down from 16.50MB, a
**34.8% reduction** in the v2.8 animated-bg footprint). Verdant
3.26MB is now the only single asset over the 2MB rule and remains
on the **deferred backlog** — getting it under 2MB without visible
quality loss would require either a fresh source export (the user's
upstream tool) or a completely different content approach (slower
motion, smaller resolution, or accepting some smear).

**Aurora Spires palette retune — Jun 6, 2026 evening (round 4 finalization):**
After the WebM landed and was wired in, side-by-side comparison against
the actual video showed the original indigo-monochromatic palette
(primary `#4f46e5`, light `#818cf8`, accent `#c084fc`) was a poor
match. The video is dominated by saturated **cyan-teal** (left aurora
bands + foreground ice spires) and **violet-magenta** (right aurora
bands), with indigo only as the deep night-sky base. Retuned:
primary `#4f46e5` → `#06b6d4` cyan-500, primary-light `#818cf8` →
`#22d3ee` cyan-400, accent `#c084fc` → `#a78bfa` violet-400, border
to cyan-400. Body radial gradients also retuned: top green
`rgba(34,197,94,…)` → cyan `rgba(34,211,238,…)`, bottom pink
`rgba(236,72,153,…)` → violet `rgba(168,85,247,…)`. themeDefinitions
card `color` shifted from indigo `#4f46e5` to cyan `#06b6d4` so the
theme-transition flash + selector chip identity match the new
chromatic center. Original indigo values preserved in trailing
`/* was ... */` comments next to each var (Stormwatch Jun 3 +
Verdant Jun 4 pattern) so reverting any single line is trivial.
Side-effect benefit: makes Aurora chromatically distinct from
Crystal (fuchsia-primary, cyan-accent) and Mystic (warm purple
primary) — Aurora is now cyan-primary, Crystal is fuchsia-primary,
clean separation between the two cool prestige themes.

**Other v2.8 deliverables:**

- ~~N3 — totalGoldEarned migration generosity (Option A)~~ ✅ SHIPPED
  Jun 7, 2026 late afternoon. Audit follow-up after the user reviewed
  the deferred-items list and asked for option A: seed
  `totalGoldEarned` from current `goldCoins` for existing players,
  AND auto-unlock Golden Empire on first post-upgrade load if the
  seeded value already crosses 10,000.
  
  **Rationale.** The original Jun 7 morning rebalance shipped with
  `totalGoldEarned = data.totalGoldEarned || 0`, meaning every
  existing player started fresh from 0 lifetime gold even if they
  already held tens of thousands of gold from years of play. That
  was defensible-but-stingy. Seeding from `goldCoins` is a
  **strictly correct lower bound** on lifetime earnings — gold can
  ONLY enter via `addGold()`, so currentBalance ≤ trueLifetimeEarned
  for all states. Seeding never falsely unlocks anyone; it just
  under-credits players who spent heavily. Net win for player
  experience with zero correctness risk.
  
  **Implementation — `??` not `||`.** The seed gate uses nullish
  coalesce specifically to distinguish two cases the old `||` couldn't
  separate:
    - **Field absent** in save (existing user upgrading) → seed from
      `data.goldCoins`
    - **Field present and explicitly `0`** (genuine new player or
      zero-balance returning user post-spend) → stays 0
  
  Without the `??` distinction, a new player who spent down to 0
  would get re-seeded from goldCoins on every load, double-counting
  their lifetime earnings indefinitely. Tests lock both cases in.
  
  **Two call sites updated:**
    - `goal-manager.js:556` (loadData) —
      `data.totalGoldEarned ?? (data.goldCoins || 0)`
    - `goal-manager.js:12942` (importData) —
      `data.totalGoldEarned ?? (data.goldCoins ?? this.totalGoldEarned)`
      (extra fallback to in-memory current value if BOTH fields
      absent in the imported backup — defensive for hand-edited
      backups)
  
  **Auto-unlock loop closed.** Option A's "10k+ goldCoins should
  unlock Golden Empire on first load, no extra grind" requirement
  is satisfied for free by the existing constructor flow at
  `goal-manager.js:236` — after `loadData()` completes, the
  constructor runs a retroactive `checkRewardUnlocks()` sweep with
  toasts suppressed, which iterates `themeDefinitions` and grants
  any theme whose criteria are now met. With `totalGoldEarned`
  freshly seeded from goldCoins, the Golden Empire gate
  (`totalGoldEarned >= 10000`) auto-fires for any qualifying
  player. No additional code needed — the migration and the
  unlock check compose naturally. Toasts are suppressed during
  the retroactive sweep so returning players don't get a stale
  unlock notification weeks/months after they earned it; the
  unlock just appears in the Themes panel.
  
  **Tests added (4 new in the same Theme System describe block):**
    - **Seed from goldCoins** — pre-v2.8 save with goldCoins=8500,
      no totalGoldEarned field, expects 8500 after loadData
    - **Field present as 0 stays 0** — ensures `??` correctly
      distinguishes absent from explicitly-zero, otherwise new
      players would get re-seeded every launch
    - **Defensive: missing both fields → 0** — corrupt or
      hand-edited save shouldn't throw or set NaN
    - **End-to-end auto-unlock** — pre-v2.8 save with goldCoins=12000,
      no field; expects totalGoldEarned=12000 after loadData AND
      `unlockedThemes` contains 'golden' after the constructor-
      equivalent retroactive sweep. This is the test that
      directly verifies Option A's user-visible promise.
  
  **Test fixture lesson.** First run of the new migration tests
  failed with `Expected: 8500, Received: 0`. Root cause: I used
  the wrong localStorage key (`lifeQuestJournalData`) — the
  production loadData reads from `lifeOrganizeData` (legacy
  pre-rename key, never migrated). The earlier "tolerates missing
  totalGoldEarned" test from the morning S6 batch only passed
  because the wrong key meant `loadData()` found no save, the
  `if (saved)` branch never executed, and `totalGoldEarned`
  stayed at the factory-init 0 — which happened to match the
  expected value. False green. Caught it now during N3 because
  the new tests expect non-zero values, so the wrong key
  surfaced as a real failure. All four migration tests now use
  the correct key. The earlier S6 test ("load tolerates missing
  totalGoldEarned (existing-user migration → 0)") was REPLACED
  by the new "seeds from goldCoins" test since the contract
  changed — keeping a stale 0-expectation test would just lie
  about the intended behavior.
  
  Files touched: `goal-manager.js` (2 lines + 2 anchor comment
  blocks at the seed gates), `tests/goal-manager.test.js`
  (replaced 1 test, added 3 new). Tests: 126 → **129 passing**
  (+3 net; +4 new minus 1 replaced). Cap:sync clean.

- ~~v2.8 deep audit + Tier 1/2 polish pass~~ ✅ SHIPPED Jun 7, 2026
  late morning. After the theme tier rebalance landed, ran a full
  audit of every v2.8 deliverable (themes, hybrid WebMs, preview
  modal, totalGoldEarned counter, particle configs, GIF removal,
  toast halo). Found **1 critical / 6 should-fix / 7 nice-to-have**
  issues; tackled the critical + 4 highest-value should-fix items
  in this pass. Remaining items (S2 preview particles, N1-N7) are
  documented for v2.8.x or v2.9 follow-up based on real-device
  feedback.
  
  **C1 — Preview modal `previewVideos` map was incomplete (CRITICAL).**
  Mapped only the 6 v2.8 hybrids, missing `forest`, `desert`, `ice`,
  `volcanic`, `mystic`, `golden`, `shadow` — all of which have body
  WebMs in `videoBackgrounds`. User previewed Volcanic, saw flat
  red gradient, applied it, body played a full lava video.
  Inconsistent. Now mirrors the full `videoBackgrounds` set; all 13
  themes with body videos preview their actual asset. Kept inline
  (not hoisted to a class property) per the original "may diverge
  later" rationale — leaves room for tile-specific shorter loops or
  lower-res preview assets without affecting body playback.
  
  **S1 — Body `<video>` now pauses while preview modal is open.**
  Previously when the user was on a hybrid theme and previewed
  another, both videos decoded simultaneously (body + modal).
  Pausing the body video on modal open + resuming on close
  eliminates the second decode stream and matches the ROADMAP's
  "only one WebM ever decodes at a time" claim. Element ID
  resolved as `theme-video-bg` (not the `theme-bg-video` I
  initially guessed — caught and fixed via grep against
  `updateThemeVideoBackground()`). `play()`/`pause()` calls
  wrapped in try/catch since some browsers throw when the play
  promise overlaps with a queued pause. Only resumed if it was
  playing before — so users on non-hybrid themes don't get a
  spurious play attempt that would fail autoplay-policy checks.
  
  **S3 — Modal a11y baseline.**
    - `aria-modal="true"` + `aria-label` on the dialog (was just
      `role="dialog"`)
    - `aria-hidden="true"` on the decorative `<video>` element
      (it carries no information, just ambience)
    - Initial focus moves to the primary action (Apply Theme) on
      open, falling back to the Close button when the theme is
      locked — gives keyboard users a useful first target instead
      of leaving focus on the body
    - Focus trap via Tab/Shift+Tab cycling among modal
      descendants — prevents focus from escaping into the
      (now scroll-locked) background
    - Focus restored to the previously-focused element on close,
      satisfying the standard dialog focus-restoration pattern
    - Single `closeModal()` cleanup path so all four close routes
      (X button, Close button, backdrop click, Esc) get identical
      teardown — body scroll restore, body video resume, focus
      restore, keydown listener removal
  
  **S4 — Body scroll lock while modal is open.** Previously the
  backdrop blocked clicks but touch/wheel events still scrolled
  the page underneath, especially noticeable on mobile. `overflow:
  hidden` on `document.body` during the modal lifecycle, restored
  to the prior value on close (handles the rare case where another
  modal already had it set).
  
  **S6 — Theme system regression tests (9 new).** The audit flagged
  zero coverage of `themeDefinitions`, `checkRewardUnlocks()`,
  `addGold()` lifetime counter, or save/load of `totalGoldEarned`
  — meaning the entire Proposal B + golden/shadow criteria
  rebalance shipped without a safety net. Added a new "Theme
  System (v2.8)" describe block with 9 tests covering:
    - All 14 themes present with required fields (name, icon,
      6-digit hex color, explicit boolean `premium`)
    - Proposal B split exact: `[default, forest, golden, ice,
      shadow]` free + 9-theme premium roster
    - `addGold()` increments `totalGoldEarned` by post-multiplier
      finalGold (with companion bonus verified)
    - `totalGoldEarned` never decreases when gold is spent
      (lifetime accumulator contract)
    - Save/load round-trip preserves the counter
    - Existing-user migration: missing field falls back to 0
    - Golden Empire unlocks at exactly 10,000 `totalGoldEarned`
      (boundary tested at 9,999 negative + 10,000 positive)
    - Shadow Realm unlocks at exactly 25 `bossesDefeated`
    - Already-unlocked themes don't get re-added (idempotency)
  
  **Test infrastructure addition: `extractedThemeDefs` source
  extraction.** Class fields like `themeDefinitions = { ... }` run
  as part of the constructor body, and `createTestManager()` uses
  `Object.create(GoalManager.prototype)` to bypass the heavy
  constructor (DOM lookups, audio init, render scheduling). That
  means class fields are NOT present on test instances. Solved by
  parsing the production source string for `themeDefinitions = {`
  and slicing the literal out using a brace-balance walk that
  ignores braces inside `/* ... */` comments and `'...'` strings.
  The extracted literal is `eval`'d once at module load and
  attached to every test instance via the factory. Guarantees
  tests validate the REAL theme data — not a fixture duplicate
  that could drift from production. Pattern is reusable for any
  future class-field literal that needs test access without
  constructor side effects.
  
  **Items deferred** (tracked for follow-up, not blockers):
    - S2 (preview modal doesn't render particles — Aurora's
      stars, Sunken's bubbles only show after Apply)
    - S5 (lock-reason title text grammar — minor)
    - N1 (consolidate duplicated `previewVideos` / `videoBackgrounds`
      maps into a shared class property)
    - N2 (reduced-motion gate on preview WebM autoplay)
    - N3 (totalGoldEarned migration generosity decision — should
      existing users get retroactive credit from `goldCoins`?)
    - N4 (preview stage aspect-ratio mismatch with body — 4:3 vs
      ~16:10)
    - N5 (compact selector visual lag from full Themes view —
      uses old flat 135° gradient while full view uses richer
      `.theme-tile-bg-X` radial layers)
    - N6 (compress 3 over-2MB WebMs: verdant 4.83MB, sunken
      3.28MB, aurora 3.08MB — CRF 30-32 re-encode)
    - N7 (replace `forest/leaf.gif` + `ice/snow.gif` with
      pure-CSS particles for full GIF-removal symmetry)
  
  Files touched: `goal-manager.js` (`previewTheme()` overhaul —
  full preview map, body video pause/resume, focus management,
  scroll lock, focus trap, single-source cleanup), `tests/
  goal-manager.test.js` (source-extraction helper +
  factory additions + new "Theme System (v2.8)" describe block).
  Tests: 117 → **126 passing** (+9 net). Cap:sync clean. ROADMAP
  § 2.4 audit subsection.

- ~~Free / premium theme tier rebalance (Proposal B)~~ ✅ SHIPPED
  Jun 7, 2026 morning. After the v2.8 theme expansion ballooned the
  catalog to 14 themes (8 pure-CSS + 6 hybrid), the existing 2-free /
  12-premium split felt stingy and double-gated the two
  achievement-flavored themes (Golden Empire and Shadow Realm were
  premium-locked even after a free user hit their criteria). Reviewed
  4 split proposals with the user; landed on **Proposal B (5 free /
  9 premium)**:
  
  **Free (5):**
    - 🏰 Medieval Kingdom — Lv 0 starter
    - 🌲 Forest Kingdom — Lv 6 first level reward
    - ❄️ Ice Citadel — Lv 15 mid-game reward (promoted from premium)
    - 👑 Golden Empire — Earn 10,000 gold lifetime (criteria changed,
      see below)
    - 🌑 Shadow Realm — Defeat 25 bosses (criteria changed, see below)
  
  **Premium (9):**
    - 🏜️ Desert Oasis (Lv 10), 🌋 Volcanic Forge (Lv 20),
      ✨ Mystic Realm (Lv 25) — pure-CSS prestige palette
    - 🌊 Sunken Library (Lv 13), ⛈️ Stormwatch (Lv 18),
      🌿 Verdant Grove (Lv 22), ⛪ Dark Cathedral (Lv 28),
      💎 Crystal Caves (Lv 31), 🌌 Aurora Spires (Lv 35) — all 6
      hybrid (WebM) themes, kept premium since they carry the
      highest production cost
  
  **Achievement criteria overhaul (same patch):**
    - **Golden Empire:** changed from `100 quests completed` to
      `10,000 gold lifetime earned`. Better thematic fit ("Empire" is
      about wealth amassed, not busywork done) and uses a NEW
      `totalGoldEarned` lifetime counter (not current `goldCoins`
      balance) so spending gold on chests/spells doesn't re-lock the
      unlock. Counter incremented in `addGold()` AFTER all multipliers
      (blessing, spells, enchantments, companion bonus, quest doubler)
      so it tracks what actually hit the wallet. Existing-user
      migration via `data.totalGoldEarned || 0` fallback in both load
      paths — first-time-loading existing users start at 0 and earn
      the unlock organically from their next gold drop forward.
    - **Shadow Realm:** changed from `5 life goals completed` to
      `25 bosses defeated`. Reuses existing `bossesDefeated` lifetime
      counter (no new tracking needed). 25 sits between the existing
      Champion title (10 bosses) and Dragon Slayer title (50 bosses)
      in the boss progression ladder — meaningful grind without being
      prohibitive.
  
  **Why double-gating got fixed:** previously the two
  achievement-gated themes had BOTH `premium: true` AND a special
  criteria, meaning a free user could grind 25 bosses or 10k gold
  and still see the premium lock blocking them. Promoting both to
  free makes the achievement the only gate — effort is rewarded,
  full stop.
  
  **Premium tier still strong (9 themes including all 6 hybrids):**
  the move keeps premium revenue meaningful since the high-cost
  WebM themes plus the 3 pure-CSS prestige themes (Desert, Volcanic,
  Mystic) remain locked behind subscription. Free tier doubles from
  2 → 5 themes (+ ice as a real mid-game progression target),
  giving casual users a genuine progression journey without
  cannibalizing the premium upsell.
  
  Files touched: `goal-manager.js` (constructor `totalGoldEarned`
  init, both load paths' migration fallback, both save paths'
  serialization, `addGold()` increment, `themeDefinitions` premium
  flag flips on ice/golden/shadow + special-string updates,
  `checkRewardUnlocks()` golden + shadow gate rewires). 117/117
  tests pass; no test changes needed since theme unlocks aren't
  exercised at the unit level. ROADMAP § 2.4.

- ~~Live theme preview tile in the Themes selector~~ ✅ SHIPPED
  Jun 6, 2026 evening (final v2.8 deliverable). **Two-iteration
  story** — landed first as autoplay-WebM-per-tile, REVISED same
  evening to on-demand preview modal after user feedback that 6
  simultaneous WebMs slowed Themes-panel initial load even with
  `preload="metadata"`. Final architecture:
  
  **Tile layer (zero-cost identity preview):**
  Each tile in the Themes selector renders a layered z-stack:
    - `z=0 .theme-tile-bg` — gradient/radial preview mirroring
      `body.theme-X` with alpha bumped 50-100% (body radials at
      0.10-0.15 alpha read as nearly invisible at ~120-180px tile
      size, so each preview boosts to 0.20-0.40 to keep chromatic
      identity legible while shrunken; linear-gradient base layers
      stay 1:1 with body for clean color match)
    - `z=2 .theme-tile-content` — icon, name, status pill with a
      strong text-shadow stack
      (`0 1px 3px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6)`) for
      legibility over both bright (Aurora) and dark (Shadow) preview
      backgrounds without per-theme text overrides. The "Active" /
      "Preview" pills also got `backdrop-blur-sm` for pill chrome
      legibility.
  Per-theme `.theme-tile-bg-{id}` rules in themes.css for all 14
  themes (default, forest, desert, ice, volcanic, mystic, golden,
  shadow + the six v2.8 hybrids). **No video element on the tile
  itself** — the static gradient is the chromatic identity, the
  modal carries the motion. Lock state uses dedicated
  `.theme-locked` class with `filter: grayscale(0.7) brightness(0.5)`
  on the bg only, leaving icon/name/lock-reason crisp.
  
  **Modal layer (rich preview, on-demand):**
  Tile click (any theme — locked OR unlocked) calls
  `goalManager.previewTheme(id)` which builds a fresh fullscreen
  overlay with:
    - Backdrop: black 85% + `backdrop-filter: blur(4px)`, fade-in
      0.18s, scrim z=10000
    - Modal card: max-width 480px, dark stone chrome, scale-in
      `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot bounce)
    - Stage area (4:3 aspect): the same `.theme-tile-bg-X` gradient
      layer reused at larger size + a `<video autoplay muted loop
      playsinline>` element for the six hybrid themes. Video is
      `filter: brightness(0.78)` (slightly darker than the tile
      version was, since at full preview size Aurora cyan and
      Sunken teal can wash out the foreground card).
    - Sample mock card centered over the stage: themed gradient
      (`cardFrom`→`cardTo` from themeDefinitions), themed border,
      icon/title (in `theme.color`), italic descriptor, mock quest
      panel with XP bar (filled at 62% with a `theme.color`→`accent`
      gradient + `box-shadow: 0 0 8px currentColor` glow), sample
      action button (decorative, in `theme.color`).
    - Action row: "Close" (always) + "Apply Theme" / "✓ Already
      Active" (when unlocked) OR a lock-reason message ("🔒 Reach
      Level 35 to unlock", "👑 Premium theme — upgrade to unlock",
      etc.) with just a Close button (when locked).
  
  Close paths: X button (top-right), Close button (action row),
  backdrop click (target equality check on overlay), or Esc key.
  All four routes call the same `closeModal()` which adds a
  `theme-preview-modal-closing` class for the 180ms fade-out then
  removes the overlay (DOM cleanup → video element GC → zero
  network/decode load until next preview).
  
  **Why this beat the autoplay-tile approach:**
    - Initial Themes-panel load: ~10MB WebM payload → **0 bytes**
      until user clicks (95%+ of users won't click every tile)
    - Decode contention: 6 simultaneous WebM streams → **1 stream**
      max at any time (only the actively-previewed theme decodes)
    - Locked-theme motivation actually IMPROVED — the modal shows
      a much richer preview at large size than the cramped tile
      ever could, with the lock reason called out clearly
    - Accidental theme switches eliminated — Apply now requires
      explicit confirmation in the modal rather than triggering
      on every stray tile tap
  
  **Trade-off accepted:** previewing now takes 1 click + 1 click
  (preview → apply) instead of 1 click (apply directly). Justified
  because (a) Themes selector is a low-frequency action — users
  set their theme rarely, not constantly toggling, (b) the
  reduced-accident benefit outweighs the extra click.
  
  **Unified across both selector surfaces** (Jun 6, 2026 late-evening
  correction): initial implementation left the compact
  `renderThemeSelector()` in the player panel at click=apply for
  "quick switching", but user pointed out — correctly — that
  surface had **no preview path at all** as a result. Both surfaces
  now route tile clicks through `previewTheme(id)` for consistency,
  so the user never has to remember which view applies vs previews.
  Compact tiles in the player panel kept their original flat 135°
  gradient chrome (not upgraded to the layered `.theme-tile-bg-X`
  structure) because at p-3 / 3xl-icon size the simpler gradient
  reads cleaner — the modal carries the rich preview either way.
  
  Reduced-motion gate (`@media (prefers-reduced-motion: reduce)`)
  drops the scale-bounce animation but keeps the fade. ROADMAP § 2.4
  final v2.8 item.
- ~~Per-theme accent micro-styling on toasts, banners, and primary
  buttons~~ ✅ SHIPPED Jun 5, 2026 — implemented as a deliberately
  MINIMAL layer after the audit revealed most "primary" surfaces
  carry intentional semantic / brand colors. Final scope:
  - **Toast halo** — single shared rule
    `body[class*="theme-"] #achievement-toast` adds a 1px ring +
    soft outer glow in `var(--theme-primary-light)` / `--theme-
    primary` ON TOP of the existing per-type gradient (gold for
    achievement, red for warning, etc.). Default Medieval Kingdom
    theme is excluded via the attribute selector and looks exactly
    as before. Zero JS changes.
  - **`.btn-themed-primary` opt-in class** — applied to the 3
    truly-generic primary buttons identified by the audit: Resume
    Focus Timer (`goal-manager.js` ~14829), Search filter active
    "All" chip (`goal-manager.js` ~16726 + ~16765 — both the
    initial render path AND the `filterSearchResults` re-render
    path), and Search Quests sidebar CTA (`index.html` ~728).
  - **NOT touched** (deliberately, per audit): the 7 other toast
    type gradients (semantic), branded buttons (Streak Shield blue,
    Save-to-Phone emerald, Equip Title purple, Settings amber,
    Share Stat Card amber-orange), Stop button red, level-up burst
    gold, XP toast purple. These all carry meaning that theming
    would erase.
  - **Drive-by lint fix:** removed a stray `?` BOM artifact at
    `themes.css:1` that had been raising "at-rule or selector
    expected" since the earlier mojibake recovery pass.

### 2.5 — Loot, Chest & Boss Battle Visuals + Theme of the Week (v2.9)
- Custom chest-open sequences per tier (animated lid + light shafts + sequential reveal of items)
- Boss portraits / illustrated art (replacing emoji-only boss representation in the arena)
- Boss HP bar with animated damage chunks (red flash where damage hit, drained segments)
- Crit / weakpoint visual indicators on attack
- Defeat sequence: boss dissolves into themed particles + loot fountain into the inventory
- Monthly boss final blow: brief slow-motion frame for the killing strike
- **"Theme of the Week" rotation card on the Dashboard** — deferred
  from v2.8 (Jun 7, 2026 evening). Originally lived as the trailing
  *pending* bullet in §2.4 since the strategy D pure-CSS-first design
  flagged "enables Theme of the Week rotation" as one of its scaling
  wins. Held back from v2.8 because (a) the section already grew well
  beyond charter (six hybrid themes vs. the originally planned 4-CSS
  + Stormwatch marquee, plus Proposal B rebalance, preview modal,
  totalGoldEarned migration, audit pass), (b) the live preview modal
  shipped in v2.8 already gives free users a full taster pathway for
  every premium theme, so Theme of the Week becomes a *promotion*
  layer on top of that rather than the primary discovery mechanism,
  and (c) it's not a 1-hour feature — the design has real depth
  (see open questions below). Pairs naturally with v2.9's boss-arena
  visual work — "this week's boss arena: Stormwatch" gives the
  rotation a content hook beyond just chrome.

  **Open design questions to resolve before implementation:**
  - **Rotation cadence + determinism** — deterministic week-of-year
    hash so all users see the same featured theme that week (the
    "of the Week" framing breaks if rotation is per-user random).
    Likely an ISO-week-number `% premiumThemes.length` lookup;
    needs a stable ordering of the premium roster so reordering
    doesn't reshuffle the rotation mid-cycle. Consider a curated
    rotation order in `themeDefinitions` (a `weeklyRotationIndex`
    field) rather than relying on object iteration order.
  - **Premium-bypass mechanism** — free users need access to the
    featured theme without flipping the global `premium` flag. Two
    options: (1) a `weeklyFeaturedThemeId` getter that the
    `applyTheme` / preview modal lock-check consults alongside
    `unlockedThemes`, (2) auto-grant the theme to `unlockedThemes`
    at week start and revoke at week end. Option 1 is cleaner
    (state stays normalized) but every gate site has to query the
    rotation; option 2 reuses existing infrastructure but has the
    revoke-edge-case (see next question).
  - **End-of-week revoke behavior** — if a free user selected the
    featured theme as active during its featured week, what
    happens at midnight Sunday? Three possibilities: (a) silently
    swap them back to default Medieval (jarring), (b) keep the
    theme active visually but show a "trial ended—upgrade to keep"
    upsell modal on next launch, (c) lock the theme but keep the
    selection so re-unlocking restores it. (b) is the right
    upsell hook but adds modal-fatigue risk; needs to be capped
    at one prompt per featured-theme cycle.
  - **Selection persistence after the week** — separate from
    revoke: if the user *previewed* but didn't apply during the
    week, the theme just locks again normally. If they *applied*
    it, that's where (b) above kicks in. The user-facing copy on
    the dashboard card must make this contract clear ("Free this
    week — try Verdant Grove. Subscribe to keep it after Sunday.").
  - **Dashboard card surface** — new component, themed (uses the
    featured theme's `cardFrom`/`cardTo` gradient as a teaser),
    placed where? Top of dashboard above the welcome card is
    high-visibility but pushes existing content down; alongside
    the daily summary tiles is less prominent but doesn't
    displace anything; a once-per-week dismissible toast on
    Monday is the lowest-friction option. Reduced-motion behavior
    (no parallax, no auto-cycling preview) follows existing
    parallax-tilt + mobile.css conventions.
  - **Premium upsell wiring** — the entire funnel value depends
    on a clear "Subscribe to keep it" CTA on both the dashboard
    card and the end-of-week prompt. Routes through the existing
    premium-purchase modal (`@capacitor-community/in-app-review`
    is already wired for store reviews; the actual purchase flow
    lives wherever the existing premium roster sells — audit
    needed before this lands).
  - **Analytics** — should track `weeklyFeaturedThemeId` per
    week, free-user apply rate during the trial, and conversion
    rate (apply → subscribe within N days) to validate the
    hypothesis that this funnel works. Without analytics it's
    just chrome.

  Original v2.8 framing (preserved for revert): "Optional 'Theme of
  the Week' rotation card on the Dashboard." That bullet has been
  removed from §2.4 alongside this deferral note.

#### v2.9 Implementation Plan (drafted Jun 8, 2026)

Code-surface audit complete across all seven tracks. Per-track
breakdown below with current state, file targets, function signatures,
asset needs, effort estimate, and risk profile. Suggested ordering at
the bottom.

##### Track 1 — Per-tier chest-open sequences

- **Current state:** Tier-tinted chest celebration **already
  exists** at `goal-manager.js:5739` (`celebrateChestOpen(type,
  rewards)`) with CSS at `animations.css:987-1085`. All four tiers
  (bronze/silver/gold/royal) share the same six-layer animation
  skeleton — full-screen flash, chest icon shake-then-burst, aura
  ring, light beam, coin particle burst, confetti — and differ only
  in color tint via `chest-tier-${type}` classes (`--chest-color` +
  `--chest-glow` CSS variables). The v2.9 deliverable is to
  differentiate the **sequences themselves**, not just the colors.
- **What changes:**
  - Replace the single shared `chest-open-icon` shake-then-burst
    keyframe with per-tier lid-opening behavior: bronze =
    simple latch pop with brown sparks; silver = side-hinged lid
    with starfield twinkle; gold = dual-side lid opening with
    sun-ray god-light; royal = floating lid that rotates upward
    with prismatic refraction.
  - Replace the simultaneous coin-particle burst with a
    sequential item-by-item reveal in the loot panel. Each loot
    item from the `rewards` array gets a staggered reveal
    animation keyed off its `rarity` (common: simple drop-in;
    legendary: prismatic burst with rotating glow). Hooks into
    the existing `showLootPanel(type, rewards)` call already
    fired at `:5733`.
  - Tier-specific sound variants — coordinate with §2.6 R2
    (`chest-open-bronze/silver/gold/royal`) so audio + visual
    tier differentiation lands in the same release where
    possible.
- **Files:**
  - `goal-manager.js:5739` — `celebrateChestOpen()` split into
    `celebrateChestOpenBronze/Silver/Gold/Royal()` sub-routines
    or extend with a `tier` switch on the lid layer
  - `goal-manager.js:5728` — `showChestRewards()` adjust the
    2200ms delay to accommodate longer tier sequences
    (probably 2400ms bronze, 2700ms silver, 3000ms gold, 3500ms
    royal)
  - `goal-manager.js` `showLootPanel()` — add staggered reveal
    via `animation-delay` on each item card (existing function;
    location TBD via grep when implementation begins)
  - `animations.css` — new `@keyframes chest-lid-bronze/silver/
    gold/royal` plus `@keyframes loot-reveal-{rarity}` family
- **Assets needed:** Four lid SVG sprites (one per tier); single
  reusable light-shaft sprite with `hue-rotate` per tier (cheaper
  than four separate sprites, GPU-friendly); optional per-rarity
  reveal-sparkle SVGs (or reuse existing comet SVGs already
  shipped in v2.4.10 — `icons/comet-*.svg`).
- **Effort:** Medium-large (3-5 days). Mostly visual + asset
  work; no logic refactor needed beyond the sequencing rewrite.
- **Risk:** Low — fully additive, tier system already in place,
  fallback to existing animation if a per-tier keyframe is
  missing keeps partial asset drops safe.

##### Track 2 — Boss portraits / illustrated art

- **Current state:** Boss `icon` field is a single emoji
  (`🐲`, `💀`, `👹`, etc.), rendered at `renderBossCard()` line
  14636 as `<div class="text-5xl ${animate-bounce}">${boss.icon}</
  div>`. No portrait/illustration field on the boss data
  structure. `bossThemes.daily/weekly/monthly` arrays in
  `goal-manager.js` (location: search for `bossThemes`)
  define name/icon/flavor only.
- **What changes:**
  - Add optional `portraitUrl` field to boss theme definitions.
    Fall back to emoji icon if not provided (graceful
    degradation for partial asset rollout — add monthly bosses
    first, weekly next, daily last).
  - Render `<img>` portrait when `portraitUrl` exists, swapped
    in for the emoji `<div>`. Same visual slot but at larger
    scale (~80-120px square) inside a theme-toned border frame.
  - Damaged-state visual treatment via CSS filter ramp on the
    portrait based on HP percentage:
    - 100-75% HP — no filter (full color)
    - 75-50% HP — `saturate(0.85)` + slight `brightness(0.95)`
    - 50-25% HP — `saturate(0.7)` + red tint overlay (mix-blend)
    - 25-0% HP — `saturate(0.5)` + bloodied vignette + slight
      shake on the portrait element
- **Files:**
  - `goal-manager.js` boss theme definitions block (search
    `bossThemes:` to locate; expect ~30-50 themes total across
    daily/weekly/monthly arrays)
  - `goal-manager.js:14636` — `renderBossCard()` portrait/icon
    block, plus `renderMonthlyBossChallenge()` line 14548
  - `themes.css` or new `boss-portraits.css` — portrait frame
    styling, damaged-state filters
- **Assets needed:** Illustrated portraits for each boss in
  `bossThemes.{daily,weekly,monthly}`. Need to count current
  rosters — quick audit during implementation. Recommended phased
  rollout: monthly bosses first (highest visual prominence,
  smallest count, ~5-10 images), then weekly (~10-15), then
  daily (~15-25). AI-generation source vs. commissioned art is
  a budget call to make before this track starts.
- **Effort:** Small code (1 day) + variable asset effort
  (depends on roster size and source). Likely the highest asset
  cost of the v2.9 list.
- **Risk:** Asset generation/sourcing pipeline. Code changes
  are trivial. **Decision needed before track starts:** AI
  generation (cheap, fast, style-consistent if seeded well) vs.
  commissioned art (expensive, slow, premium feel). Defer this
  call until ordering is decided.

##### Track 3 — Boss HP bar with animated damage chunks

- **Current state:** HP bar at `renderBossCard()` lines
  14649-14660 is a single flat gradient div (`bg-gradient-to-r
  from-${phaseColor}-600 to-${phaseColor}-400`) with width set
  via inline `style="width: ${hpPercent}%"` and a 500ms CSS
  transition. `updateBossHPBar(bossType, boss)` at
  `goal-manager.js:1356` updates fill width directly without
  full re-render to preserve the slash overlay animation.
  Phase-color thresholds (red → yellow → orange → purple →
  green) shift palette at HP buckets but don't add chunk drain
  or per-hit red flash.
- **What changes:**
  - Refactor HP bar from single fill div into a **segmented bar
    of N chunks** (N = `Math.min(boss.maxHP, 20)` to keep chunk
    count bounded on high-HP bosses). Each chunk is its own
    div, sequentially numbered.
  - On hit, animate the specific chunks being drained: red
    flash on the chunk(s) that are about to disappear, then
    those chunks fade out / scale-y down in sequence with a
    slight stagger (50-80ms per chunk for multi-damage hits).
  - Preserve the existing phase-color palette swap as a smooth
    cross-fade on the remaining chunks rather than the current
    instant swap.
  - Existing 500ms transition on the percentage-fill becomes
    obsolete; replace with chunk-level transitions.
- **Files:**
  - `goal-manager.js:14649` — HP bar markup in `renderBossCard()`
  - `goal-manager.js:1356` — `updateBossHPBar(bossType, boss)`
    rewritten to operate on chunks; takes `damage` parameter so
    it knows which chunks to flash-and-drain
  - `goal-manager.js:1287` — pass `damage` from `attackBoss()`
    into `updateBossHPBar()` (currently only passes `boss`)
  - `animations.css` — new `@keyframes hp-chunk-drain` and
    `@keyframes hp-chunk-flash`
- **Assets needed:** None (CSS-only).
- **Effort:** Small-medium (2 days). Foundational — sets the
  visual language for chunk-based feedback that other tracks
  can build on.
- **Risk:** Low. The chunk count cap (max 20) keeps DOM cost
  bounded; existing `updateBossHPBar()` already runs without
  full re-render so the chunk approach fits the existing
  architecture cleanly.

##### Track 4 — Crit / weakpoint visual indicators

- **Current state:** Crits exist on the `attackBoss()` path at
  `goal-manager.js:1274-1284` (Critical Strike spell, 50% chance
  for +50% damage). On crit:
  - `isCrit = true` flag set
  - `effectsManager.bossCrit(bossEl)` fires → 14-particle fire
    burst (`effects-manager.js:631`)
  - `playSlash(isCrit)` plays louder slash sound
  - `boss-slash-mark` element gets `.crit` class for amped
    visual
  - `boss-damage-float` shows `💥 ${damage}` in red
  - Battle log entry shows `💥 CRIT! ${damage} DMG`
- **What changes:** Layer additional crit-specific feedback on
  top of the existing burst:
  - **Weakpoint reticle** — brief crosshair/reticle appears on
    the boss portrait/icon at the moment of impact (~150ms
    before slash lands), fades out over 400ms. Suggests a
    targeted strike rather than a generic harder hit.
  - **Crit shockwave** — radial ring expanding outward from the
    impact point, 0% → 200% scale over 350ms with opacity 0.8 →
    0. Reads as the visceral force of the strike.
  - **Crit time-dilation** — brief 60ms freeze-frame on the
    boss element (`animation-play-state: paused` on the
    `animate-bounce` icon) right at impact, restored
    immediately after. Subtle but adds weight without committing
    to full slow-motion (which is reserved for the Track 6
    monthly killing strike).
  - **Chunk drain enhancement** (depends on Track 3) — crit
    drains chunks with a yellow-orange flash instead of red,
    visually distinguishing crit damage on the HP bar.
- **Files:**
  - `effects-manager.js:624` — extend `bossCrit(bossEl)` with
    the reticle + shockwave + time-dilation layers
  - `goal-manager.js:1280-1284` — pass impact-point coordinates
    into `bossCrit()` if anchoring the reticle precisely (or
    just center it on the boss element)
  - `animations.css` — new `@keyframes crit-reticle`,
    `@keyframes crit-shockwave`, possibly tier-specific
    crit-tint variables
- **Assets needed:** Crosshair/reticle SVG (single asset,
  reused via CSS color-tint).
- **Effort:** Small (1 day). Track 3 should land first so the
  chunk-flash enhancement can layer on cleanly.
- **Risk:** Very low. Fully additive on top of the existing
  crit path.

##### Track 5 — Defeat sequence (themed particle dissolve + loot fountain)

- **Current state:** `onBossDefeated(bossType)` at
  `goal-manager.js:1396-1509` handles the full defeat flow:
  streak update, XP/gold/crystal awards, loot generation,
  audio (`playBossDefeated()`), `celebrateBossDefeat()` call,
  confetti burst, deferred level-up celebration, loot panel
  shown after 3500ms (or 6000ms if level-up pending). The
  visual celebration today is generic — confetti + the existing
  `celebrateBossDefeat()` (need to inspect; likely a flash +
  toast). No particle dissolve of the boss itself, no loot
  fountain.
- **What changes:**
  - **Dissolve sequence** — at defeat moment, boss portrait/
    icon dissolves into themed particles tied to the boss's
    "type" (boss themes have an implicit element from their
    `flavor` text — e.g., fire bosses → ember particles; ice
    bosses → frost particles; shadow → smoke). Add a
    `particleType` field to boss theme definitions to make
    this explicit rather than inferring from flavor text. Use
    existing particle classes from the v2.8 theme system as a
    base palette (`.particle-ember`, `.particle-bubble`,
    `.particle-smoke` if reintroduced, etc.) — or define
    boss-specific dissolve particles in a new `boss-particles.
    css` if existing classes don't cover all elemental types.
  - **Loot fountain** — after the dissolve completes, loot
    items rise from the boss's defeated location and arc into
    the inventory icon in the navbar (suggesting they're being
    "collected"). Each item flies on its own arc with a slight
    delay so the fountain reads as a stream rather than a
    single pop. Lands on the inventory icon with a small
    pulse.
  - **Background screen tone** — slight desaturation pulse on
    the rest of the UI during dissolve (250ms in, 250ms out)
    to focus attention on the boss being defeated.
- **Files:**
  - `goal-manager.js:1396` — `onBossDefeated(bossType)` —
    insert dissolve sequence before existing
    `celebrateBossDefeat()` call at line 1480; insert loot
    fountain before existing `showLootPanel` call at line 1499
  - `goal-manager.js` `bossThemes` definitions — add
    `particleType` field per boss theme
  - `effects-manager.js` — new `bossDefeatDissolve(bossEl,
    particleType)` and `lootFountain(fromEl, toEl, items)`
    helpers
  - `animations.css` — new `@keyframes boss-dissolve-pixelate`,
    `@keyframes loot-arc-{n}` family (or use JS-driven
    animation via `requestAnimationFrame` for arbitrary arc
    paths)
- **Assets needed:** None (reuse existing particle classes); a
  small inventory-pulse SVG might be nice but optional.
- **Effort:** Medium-large (3-4 days). Most complex single
  track; the loot fountain in particular needs careful arc
  math + element-position tracking that survives scroll/resize.
- **Risk:** Medium. Position-tracking the inventory icon as
  the fountain target needs to be robust to nav state changes.
  Fallback: if the inventory icon isn't visible (e.g., user is
  in fullscreen modal), fountain converges to screen center
  instead.

##### Track 6 — Monthly boss final blow (slow-motion frame)

- **Current state:** Monthly boss flow goes through the same
  `attackBoss('monthly')` path as daily/weekly. Only
  differentiation today is the unlock threshold
  (`canChallengeMonthlyBoss()` requires `bossKillsThisMonth >=
  monthlyBossUnlockThreshold`), the larger HP/rewards, and the
  separate `monthly-boss-arena` container. The killing strike
  on a monthly boss is visually identical to a regular kill.
- **What changes:**
  - When `attackBoss('monthly')` reduces `currentHP <= 0`,
    instead of jumping straight to the existing 600ms
    `setTimeout` that calls `onBossDefeated`, run a
    **slow-motion sequence**:
    1. Extend the slash animation to 2x duration (1000ms
       instead of 500ms)
    2. Pause all background animations on the page
       (`document.body.classList.add('slow-motion')` which CSS
       targets to set `animation-duration` multipliers via
       `* { animation-duration: 2s !important; }` scoped to
       safe selectors — needs careful curation to avoid
       breaking the dissolve/fountain that follows)
    3. Brief screen flash (white, 80ms) at the moment of
       impact
    4. Camera shake (heavier than regular crit shake) on the
       page-level shell
    5. Audio: drop background music volume to 30% during
       slow-motion (calls a new `audioManager.dipMusic(ratio,
       durationMs)`)
    6. After ~1500ms total slow-motion duration, release back
       to normal speed and trigger the Track 5 dissolve +
       fountain at full pace
- **Files:**
  - `goal-manager.js:1305-1308` — boss defeat detection
    (existing `boss.currentHP <= 0` branch) — add monthly
    branch that routes through new `monthlyKillingStrike()`
    sequence
  - `goal-manager.js` — new `monthlyKillingStrike(bossType)`
    helper
  - `audio-manager.js` — new `dipMusic(ratio, durationMs)`
    method (independent of v2.10 R-pass)
  - `animations.css` — `body.slow-motion` selector with
    animation-duration multipliers
- **Assets needed:** None.
- **Effort:** Small-medium (1-2 days). Lands AFTER Track 5
  (dissolve/fountain) since slow-motion sequences into the
  dissolve.
- **Risk:** Low-medium. The `body.slow-motion` global
  animation-duration override needs careful testing to avoid
  breaking critical UI animations (e.g., toast slide-in,
  modal open). Scope the override to a curated allowlist
  rather than universal `*`.

##### Track 7 — Theme of the Week rotation card

Implementation depends on resolving the seven design questions
captured in the deferral note above. Recommended answers below
(propose, then user-confirm before implementation begins):

- **Q1 — Rotation cadence + determinism:** ISO week number
  modulo a curated rotation order. Add `weeklyRotationIndex:
  N` field to each premium theme in `themeDefinitions`, hand-
  ordered to alternate visual tones (cool → warm → cool → ...)
  so consecutive weeks don't feel monotonous. Expose
  `getWeeklyFeaturedThemeId()` getter that returns the same
  id for all users in the same ISO week. Implementation:
  ```js
  getWeeklyFeaturedThemeId() {
      const week = this.getISOWeekNumber(new Date());
      const ordered = Object.entries(this.themeDefinitions)
          .filter(([_, t]) => t.premium && t.weeklyRotationIndex != null)
          .sort((a, b) => a[1].weeklyRotationIndex - b[1].weeklyRotationIndex);
      return ordered[week % ordered.length]?.[0];
  }
  ```
- **Q2 — Premium-bypass mechanism:** **Recommend Option 1**
  (getter approach). State stays normalized; `unlockedThemes`
  continues to mean "permanently unlocked"; the rotation grants
  temporary access without polluting the unlock list. Two gate
  sites need updating: `previewTheme()` (already allows preview
  regardless, no change) and `applyTheme()` / theme-tile click
  handler (consult `getWeeklyFeaturedThemeId()` alongside
  `unlockedThemes` membership).
- **Q3 — End-of-week revoke behavior:** **Recommend (b) with
  capping** — keep theme active visually past Sunday midnight;
  on first launch of the new week, show a one-shot "trial
  ended — subscribe to keep [Theme Name]" upsell modal; revert
  to default theme on dismiss. Cap at one prompt per
  featured-theme cycle via `weeklyTrialPromptShown: { themeId:
  weekNumber }` flag in user data.
- **Q4 — Selection persistence:** Fall-out of Q3. If user
  previewed but didn't apply: theme just locks again, no UX
  change. If user applied: Q3's option (b) flow kicks in.
  User-facing card copy must make the contract clear: "Free
  this week — try [Theme Name]. Subscribe to keep it after
  Sunday."
- **Q5 — Dashboard card surface:** **Recommend hybrid** — a
  dismissible toast on Monday morning (first launch of the new
  week) for awareness, plus a persistent dashboard card slot
  positioned **between the daily summary tiles and the habits
  section** for ongoing-week presence. Card uses the featured
  theme's `cardFrom`/`cardTo` gradient as a teaser. Reduced-
  motion: no parallax, no auto-cycling preview, just static
  gradient + text.
- **Q6 — Premium upsell wiring:** **Audit needed before
  implementation starts.** The codebase has
  `@capacitor-community/in-app-review` wired for store reviews
  but the actual premium-purchase flow location is unclear from
  the v2.8 audit. Two possibilities: (a) it lives in an
  existing `purchasePremium()` method I haven't found yet
  (search for it during implementation), or (b) it's stubbed
  out / placeholder. **If (b), Track 7 may need to defer to a
  v2.9.x point release** until the purchase flow ships.
- **Q7 — Analytics:** Add three new events via
  `analytics-methods.js`:
  - `weekly_theme_featured` — fired on rotation change with
    `{ themeId, weekNumber }`
  - `weekly_theme_applied` — fired when user applies the
    featured theme during its trial week, with
    `{ themeId, isFreeUser }`
  - `weekly_theme_subscribe` — fired on subscription within
    N=14 days of `weekly_theme_applied`, with
    `{ themeId, daysFromApply }` (validates the funnel
    hypothesis)

- **Files (assuming Q2 = Option 1):**
  - `goal-manager.js` — `themeDefinitions`: add
    `weeklyRotationIndex` to each premium theme
  - `goal-manager.js` — new methods `getWeeklyFeaturedThemeId()`,
    `getISOWeekNumber(date)`, `renderWeeklyThemeCard()`,
    `maybeShowWeeklyThemePrompt()`
  - `goal-manager.js` `applyTheme()` / theme-tile click —
    add featured-theme bypass check
  - `goal-manager.js` `previewTheme()` modal — already covers
    locked themes, no change needed
  - `index.html` dashboard view — add `<div id="weekly-theme-
    card-slot">` between daily summary and habits sections
  - `analytics-methods.js` — register three new events
  - `themes.css` — new `.weekly-theme-card` styling
- **Assets needed:** None (uses existing theme gradients +
  particle classes).
- **Effort:** Medium (3-5 days) + audit time for Q6.
- **Risk:** Medium. The end-of-week revoke modal is the
  trickiest UX piece — easy to feel nag-y if the cap isn't
  enforced correctly. The Q6 premium-purchase audit is the
  blocker; if the flow doesn't exist, this track defers.

##### Suggested ordering

Optimized for foundational-first + perceived-value-per-week +
asset pipeline parallelism:

1. **Track 3 — Boss HP chunks** (2 days) — foundational; sets
   the chunk-flash visual language for Track 4.
2. **Track 4 — Crit indicators** (1 day) — extends Track 3's
   chunk system + the existing `bossCrit()` fire burst.
3. **Track 5 — Defeat dissolve + loot fountain** (3-4 days) —
   the biggest single visual moment in v2.9. Lands before
   Track 6 since slow-motion sequences INTO the dissolve.
4. **Track 6 — Monthly killing strike slow-mo** (1-2 days) —
   layers on top of Tracks 3-5, monthly only.
5. **Track 2 — Boss portraits** (1 day code + asset pipeline) —
   can run **in parallel** with Tracks 3-6 since the code
   change is trivial; gating factor is asset generation
   throughput. Start the asset pipeline at the same time as
   Track 3 begins so portraits land alongside the boss-combat
   visual upgrade.
6. **Track 1 — Per-tier chest-open sequences** (3-5 days) —
   independent of all boss work; can ship as a v2.8.1 polish
   release if you want an interim ship before the bigger v2.9
   surfaces, OR slot it after the boss tracks for a single
   v2.9 release.
7. **Track 7 — Theme of the Week** (3-5 days + Q6 audit) —
   last because of the Q6 dependency on the premium-purchase
   audit. If audit reveals the purchase flow doesn't exist,
   defer to v2.9.x.

**Total estimate:** ~14-21 days of focused development +
variable asset pipeline (boss portraits + chest lid sprites
are the two non-zero asset asks). Realistic v2.9 release
window: ~4-6 weeks from start.

##### Open dependencies / decisions before starting

- **D1:** Boss portrait art source (AI-generated vs.
  commissioned) — needed before Track 2 begins.
- **D2:** Chest lid sprite source (DIY in `prototypes/animation-
  preview.html` vs. commissioned) — needed before Track 1
  begins.
- **D3:** Q6 premium-purchase flow location — audit needed
  before Track 7 begins.
- **D4:** v2.8.1 polish release vs. single v2.9 release — a
  strategic call about whether to ship Track 1 standalone for
  faster cadence or hold for a single combined release.

### 2.6 — Sound Design Expansion (v2.10)

Deliberately sequenced *after* §2.5 so the audio pass can cover the v2.9 visual additions (chest-open sequences per tier, boss crit indicators, defeat dissolves, slow-mo killing strikes) at the same time as it fixes the existing sound system's repetition and coverage gaps. Pairs with §2.4–§2.5 the same way `effects-manager.js` (v2.4.9) paired with the §2.2/§2.3 visual work — sound is the audio companion to the "feel" arc, not its own gameplay system.

**Current inventory baseline:** 15 registered sounds in `audio-manager.js` (5 achievement-tier sounds + 10 gameplay sounds). Audit Jun 7, 2026 identified 6 repetition issues (R1–R6) and 17 coverage gaps. This section addresses all of them across six sub-passes.

**Pass 1 — Resolve repetition (R1–R6)**
- **R1: Split `spell` into `spell-cast` (spellbook) vs `enchantment-activate` (enchantment system)** — currently one file serves two distinct game systems. Two new files, one rename, two call-site updates (`goal-manager.js` ~6892 and ~9802).
- **R2: Add per-tier chest-open variants** — `chest-open-bronze/silver/gold/royal`. Audio should communicate rarity the same way the §2.5 visual tier work does (flash colors, particle counts, aura tints). `playChestOpen(tier)` extended to pick the right variant; fallback to base `chest-open` if a variant is missing so partial asset drops don't break.
- **R3: Conceptually split `loot-coin` from `gold-earned`** — currently both are "coin" sounds and the distinction is muddy. `loot-coin` becomes a single chest-reveal sting (one-shot, plays once when the loot panel opens); `gold-earned` becomes a shorter "currency tick" that can fire repeatedly without auditory fatigue.
- **R4: Add `boss-crit` distinct from `sword-slice`** — crits currently just play `sword-slice` louder. Crits deserve their own audio identity to match the `💥 CRIT!` visual treatment. `playSlash(isCrit)` swaps the sound, not just the volume.
- **R5: Wire up or delete the orphan `daily-achievement`** — registered in `audio-manager.js:74` but never called anywhere in the codebase. Either repurpose for the new `task-complete` event (Pass 2) or remove from the manifest + delete the file.
- **R6: Add dedicated `task-complete` sound** so achievement tier sounds stop double-duty as routine completion sounds. Tier sounds reserved for actual tier rollovers; routine daily/habit/weekly/monthly completions get a short tactile click instead.

**Pass 2 — Fill coverage gaps**

Must-have (17 → prioritized 8 ship-in-v2.10):
- **`prestige-ascension`** — the single most epic sound in the app (§3.8 Ascension is permanent + irreversible, deserves audio gravitas)
- **`streak-freeze-used`** — icy shield-activated cue (§1.7)
- **`boss-enrage`** — ominous warning sting when a boss enters Enraged state (§3.9)
- **`badge-unlock`** — distinct from tier achievement sounds (§3.5)
- **`focus-start`** — currently only completion plays via `notification`; starting a focus session deserves its own bookend
- **`focus-break-start`** / **`focus-break-end`** — bracket the break window so users know when to come back
- **`companion-evolve`** — major moment per §3.4 evolution stages
- **`error-blocked`** — short "denied" tone for blocked actions (cast spell without crystals, equip without unlock). One sound covers all error states.

Nice-to-have (deferred to backlog if v2.10 scope tightens):
- Streak milestone tier sounds (7-day / 30-day / 100-day / 365-day — could reuse achievement-tier sounds rather than add new files)
- Companion equipped/unlocked (could fold into `companion-evolve`)
- Theme unlocked / changed (low frequency event, low priority)
- Subclass selected (§3.1 — could reuse `level-up` since it's a similar milestone)
- Quest chain step completed / chain mastered (§3.10 — step could reuse `task-complete`, mastery deserves its own)
- Title equipped (low frequency, could reuse a UI confirm tick)
- Pomodoro chain milestone (§1.3 — could reuse `crystal-earn`)
- Task deleted / archived (UI-tier, debatable)
- Modal open / close (UI-tier, many users dislike — defer pending opt-in setting)

**Pass 3 — Sound variety pass (anti-habituation)**
- For high-frequency sounds (`sword-slice` plays many times per boss fight, `task-complete` plays dozens of times/day, `gold-earned` fires on every reward), add 2–3 randomized variants per sound so the ear doesn't habituate over a typical play session.
- Audio Manager extension: `play('sword-slice')` checks for `sword-slice-1.mp3` / `sword-slice-2.mp3` / `sword-slice-3.mp3` and picks randomly; falls back to the base `sword-slice.mp3` if no variants exist. Zero-impact for sounds without variants.
- Priority targets for variants (in descending frequency-of-play order): `task-complete`, `gold-earned`, `sword-slice`, `boss-damage`, `loot-coin`, `notification`.

**Pass 4 — Per-event volume audit + central tuning table**
- Volume overrides are currently scattered as magic numbers per call site (`boss-damage` 0.8, `notification` 0.6, `sword-slice` crit-vs-normal 1.0/0.6, `crystal-earn` 0.8, `daily-achievement` 0.8). Each was tuned in isolation as the sound was added, so the relative mix has never been audited holistically.
- Replace the scattered overrides with a single `_eventVolumes` map on `AudioManager` keyed by sound id. Call sites just call `play('id')`; the manager looks up the per-event volume (defaulting to 1.0 × master volume). Makes future re-balancing a one-place change.
- Audit the full mix at the end of this pass: play every sound back-to-back at master volume 0.5 and adjust so no sound dominates or vanishes relative to its neighbors.

**Pass 5 — Sound theme packs (premium hook, cross-links §6.4 + §2.4)**
- Alternative sound sets that match each animated theme — same event id, different audio asset depending on the active theme:
  - **Stormwatch** — thunder-tinged hits, rain-soaked `gold-earned`, boss-damage with a low rumble layer
  - **Verdant Grove** — woodwind/horn fanfares, rustling-leaves `task-complete`, bird-call `notification`
  - **Crystal Caves** — chime + glass tones throughout, crystalline `crystal-earn` with longer decay
  - **Dark Cathedral** — organ stabs, bell-toll `level-up`, vocal-pad `boss-defeated`
  - **Aurora Spires** — ethereal pad swells, shimmer-layered tier sounds
  - **Default Medieval Kingdom** — current sound set unchanged (stays as the baseline pack)
- One sound pack ships per theme that has dedicated audio. Themes without a custom pack fall back to the Medieval Kingdom default — same partial-coverage pattern as §2.4's theme video assets.
- **Premium monetization angle** — sound packs as a cosmetic-only premium tier addition under §6.5 (one-time microtransaction per pack, or bundled into the existing premium tier). Aligns with the §6.5 "no pay-to-win" rule: sound packs change *vibe* not *power*.

**Pass 6 — Accessibility + granular settings**
- **Split the master volume into category sliders** — current `audioManager.volume` is one knob for everything. Split into: **UI** (clicks, notifications, errors), **Combat** (boss-damage, sword-slice, crits, defeat, enrage), **Reward** (achievements, gold-earned, chest-open, loot-coin, crystal-earn), each with its own slider, each multiplying against the master.
- **"Reduced audio" mode** — paired with `prefers-reduced-motion`. Plays only critical cues (achievement-tier sounds, level-up, prestige-ascension, error-blocked) and silences ambient/feedback sounds (UI clicks, gold ticks, slash variety). Same intensity-gate philosophy as `effectsManager.intensity`.
- **Per-sound mute toggles** — for users who like everything except one specific sound (e.g., love crit but hate the crystal-earn chime). Listed under Tools → Settings → Audio in an expandable per-event mute list. Each toggle persists to localStorage like the existing `audioEnabled` / `audioVolume` keys.
- **Captioning hook (a11y)** — optional visual sound captions in the corner of the screen for hearing-impaired users (e.g., "[boss defeated fanfare]"). Tiny opt-in. Pairs with the Accessibility Deep Pass already in the Backlog.

**Asset acquisition note**
- Following §2.4's pattern (user supplies WebMs after the pure-CSS v1 ships), the implementation order is: code changes first (audio-manager.js extensions, call-site updates, variant-picker logic, settings UI), with all new event ids initially silent or pointing at sensible existing-asset fallbacks. New audio files dropped in `/sounds/` as they become available; each new file is picked up automatically on next load with zero further code changes. Lets the system ship without blocking on asset creation.
- Update `sounds/SOUNDS-README.md` (currently documents only the original 12 sounds) to reflect the full v2.10 inventory + variant naming convention (`<id>.mp3` baseline, `<id>-1.mp3` / `<id>-2.mp3` / `<id>-3.mp3` variants).

---

## Phase 3 — Depth & Progression (v3.0)

Features that deepen the RPG layer and give long-term players more to chase.

### 3.1 — Skill Trees / Class System
- Choose a "class" at a milestone level (e.g., Level 15): **Scholar**, **Warrior**, **Mystic**, **Ranger**
- Each class unlocks a small passive perk tree (3–5 nodes)
  - Scholar: bonus XP from focus sessions
  - Warrior: extra attack charges from tasks
  - Mystic: reduced enchantment costs
  - Ranger: bonus loot luck from chests
- Respec option available for Focus Crystals

**Subclass Specialization (Level 30+)**
- At Level 30 each class branches into 2 subclasses, giving newly-prestiged players (§3.8 ascension threshold is Level 25) a near-term goal to chase post-Ascension.
  - **Scholar** → *Archivist* (deeper XP scaling from long focus chains) / *Sage* (passive crystal generation from completed habits)
  - **Warrior** → *Berserker* (escalating attack damage as boss HP drops) / *Guardian* (streak protection bonus — stacks with §1.7 freezes)
  - **Mystic** → *Diviner* (spell charge re-rolls in the Rotating Market §3.7) / *Necromancer* (re-summoned bosses §3.9 keep one rarity tier instead of dropping one)
  - **Ranger** → *Hunter* (bonus damage vs. weekly/monthly bosses) / *Pathfinder* (faster Rotating Market loyalty discount accumulation)
- Each subclass adds its own 3–4 node mini-tree on top of the base class tree, so subclass picks compound rather than replace earlier perk choices.
- Same Focus Crystal respec mechanic applies; subclass respec costs more than base-class respec to make the choice feel weightier.
- Subclass unlock is a permanent character milestone — surfaced on the Character Sheet, Share Card, and the player avatar ring alongside Prestige Stars (§3.8).

### 3.2 — Crafting System
- Combine lower-rarity spell charges to craft higher-rarity ones
  - e.g., 3× Minor Wisdom → 1× Arcane Surge
- Combine crystal shards + gold to craft specific enchantment scrolls
- Gives a use for excess common drops and creates a resource sink

### 3.3 — Seasonal Events & Limited-Time Content
- Rotating monthly themed events (e.g., "Harvest Festival", "Frost Trials")
- Event-specific quest chains with unique cosmetic rewards (titles, themes, companion skins)
- Event leaderboard (personal bests, no server required)

### 3.4 — Companion Evolution
- Companions gain evolution stages at XP thresholds (e.g., Baby → Juvenile → Adult → Elder)
- Each evolution improves their passive ability multiplier
- Visual change (icon/emoji swap) at each stage
- Adds long-term attachment and collection depth
- **Cross-link to §6.4** — premium tier's second active companion slot stacks both equipped companions' passive multipliers (with a per-effect cap to prevent runaway scaling, e.g., +XP buffs cap at +15% combined regardless of how many companions stack).

### 3.5 — Achievement Gallery Overhaul
- Categorized badge pages: Combat, Productivity, Collection, Social, Milestones
- Progress tracking for locked badges (e.g., "Defeat 20 more bosses")
- Rare hidden achievements for discovery moments

### 3.6 — Boss Bestiary (refine existing)
- Expand the existing defeated bosses log into a full Bestiary page
- Add lore entries, boss art/icons, and per-boss kill stats (fastest kill, highest damage, etc.)
- Track collection progress ("Encountered X of Y boss types")

### 3.7 — Rotating Market
- A special shop that refreshes its inventory on a timer (daily deals + weekly featured stock)
- **Dual currency** based on item rarity:
  - **Common / Uncommon items** → priced in **Gold** (gives gold a meaningful sink)
  - **Rare / Epic items** → priced in **Focus Crystals** (gives crystals a spend path beyond enchantments)
  - **Legendary items** → priced in a **mix of Gold + Crystals**
- **Daily Deals (3 slots, refresh every 24h)**
  - Discounted spell charges (random rarity, 20–40% off)
  - Enchantment scrolls (pre-activated, skip the shop flow)
  - Crystal Shard or Gold bundles
- **Weekly Featured Stock (5 slots, refresh every Monday)**
  - Rare/Epic spell charges not commonly found in chests
  - Exclusive companion eggs (rotating pool of 2–3 companions)
  - Limited-run cosmetic themes or title scrolls
  - Occasional "Mystery Box" (random loot pull)
- **Market Loyalty**: consecutive days visiting the market builds a small loyalty discount (caps at 10%)
- Market UI: medieval merchant stall aesthetic, item cards with rarity borders and currency icons, "SOLD" stamps on purchased items
- Creates dual-currency sinks; prevents hoarding gold or crystals with no purpose; drives daily check-ins

### 3.8 — Prestige System & Title Perks
Two interlocking systems that reward long-term play with permanent power growth.

**Prestige (Ascension)**
- Available once a player reaches a threshold level (e.g., Level 25)
- Choosing to Ascend resets level back to 1, but grants a permanent **Prestige Star** (⭐)
- Each Prestige Star gives a small stacking passive buff (player chooses one per ascension):
  - ⭐ **Wisdom** — +5% XP from all sources
  - ⭐ **Fortune** — +5% Gold from all sources
  - ⭐ **Arcana** — +1 bonus crystal shard per focus session
  - ⭐ **Valor** — +5% boss damage
  - ⭐ **Serendipity** — +3% loot rarity luck
- Prestige stars are displayed on the player avatar ring (visual progression)
- All companions, spells, themes, titles, and badges are **kept** across prestiges — only level and XP reset
- Prestige count is shown in the Character Sheet and Share Card
- Caps at a reasonable number (e.g., 5–10 prestiges) to prevent runaway scaling

**Title Perks**
- Earned titles now grant small permanent passive bonuses when equipped:
  - *Peasant* — no perk (starting title)
  - *Knight* — +2% XP
  - *Baron* — +3% Gold
  - *Earl* — +1 attack charge per day
  - *Duke* — +5% boss damage
  - *King* — +5% loot luck
  - *Emperor* — +1 bonus crystal shard per focus session
  - *Legend* — +10% XP & Gold
  - *(Post-prestige titles)* Mythic, Ascendant, Immortal, Eternal — increasingly powerful perks
- Only the **equipped** title's perk is active (encourages strategic title choice vs. cosmetic preference)
- Title perk is shown on the Character Sheet next to the title name
- Creates meaningful choice: equip the title with the best perk, or the one that looks coolest?

### 3.9 — Boss Loop Expansion
Two paired additions that give long-term players agency over the boss cadence and a worthy target for stockpiled attack charges. Designed as a single shipping unit because each half makes the other more interesting (re-summons let you grind charges, the epic boss is what justifies grinding).

**Re-Summoning (spell + consumable item)**
- The weekly and monthly boss cadence is currently fixed — once a player defeats the boss for the period, there's no way to engage further until the timer resets. Adds two ways to summon a fresh boss within the same period for additional rewards:
  - **Spell** — *Echo of the Hunt* (rare): re-summons the current period's boss type with full HP. Single-use charge, consumed on cast.
  - **Consumable item** — *Summoning Brazier* (epic): same effect, available via Rotating Market (§3.7) or rare chest drops. Provides a non-spell path for players who don't invest in the spellbook.
- Diminishing returns to prevent grinding loops: each re-summon in the same period drops loot quality by one rarity tier (Royal→Gold→Silver→Bronze) and reduces XP/gold reward by 25% per stack. Reset at period rollover.
- Re-summoned bosses get a small HP/damage modifier scaled to the player's level so they remain a meaningful fight rather than a free farm.
- Boss log (existing defeated-bosses list) annotates re-summoned kills with a marker so the Bestiary (§3.6) can distinguish first-kill stats from re-summon stats.

**Epic / Apex Boss (single-player endgame)**
- A high-tier boss tuned for long-term players who have built up attack charges, prestige stars, and title perks. Distinct from §4.3 Cooperative Boss Raids (which is multiplayer).
- Unlock gate: minimum player level (e.g., Level 30), at least one prestige star, and a minimum lifetime boss-kill count to ensure the player has built the toolkit needed.
- Appears on a longer cadence than the monthly boss — quarterly or seasonal — so each encounter feels like an event rather than routine.
- Multi-phase fight: HP bar segmented into 3–4 phases, each with a mechanic shift (e.g., damage-reflect phase, charge-drain phase, elemental-weakness rotation). Drives strategic spell/enchantment loadout choice.
- Loot table is meaningfully better than monthly bosses: guaranteed Royal-tier chest, exclusive prestige-themed cosmetic drops, a rare chance at a unique companion or title not available elsewhere.
- Defeat unlocks a permanent badge and a Bestiary entry with lore.
- Optionally integrates with §3.3 Seasonal Events: each season's epic boss has a themed skin and a limited-time exclusive drop tied to the event window.

**Enrage Timers & Failure Penalties**
- The current boss cadence is binary: kill the boss before its period expires and you get the loot; miss it and you get nothing. Adds a *negative* consequence layer so ignoring a boss isn't free — converts boss expiration from a missed-opportunity to an active threat, giving §1.2's already-shipped boss expiration warnings real teeth.
- **Enrage windows** — each boss tier gets a soft deadline before the hard expiration:
  - **Weekly boss** — enters "Enraged" state at 72 hours remaining if still alive. Enrage applies a stacking 24h debuff to the player (e.g., −5% XP per stack, refreshes daily until the boss is killed or the period ends).
  - **Monthly boss** — enters Enraged at 7 days remaining. Debuff is harsher (−10% XP + locks one random equipped spell slot for the remainder of the period).
  - **Apex / Epic boss** — enrage shifts the fight itself: each unkilled day adds a permanent HP buff to the boss for that encounter (+5% per day) and unlocks a damage-reflect mechanic at 50% HP. Kills that happen post-enrage still award loot but at one rarity tier lower.
- **Penalty visibility** — debuffs surface on the Character Sheet under a new "Active Effects" pill row (red/orange treatment to distinguish from positive title perks). Each active curse links back to the boss that applied it so the player knows exactly how to clear it.
- **Escalating notifications** — §1.2's boss expiration warnings escalate copy from informational ("Boss expires in 1 hour!") through warning ("Boss enraged — debuff active!") to critical ("Final 24h — defeat the boss to lift the curse!"). Honors the existing notification settings so users who muted boss reminders stay muted.
- **Opt-out for casual players** — Settings toggle (default ON) to disable enrage penalties for users who want the original positive-only boss loop. Toggle is one-way per period (can't re-enable mid-period to dodge an active debuff).
- **Cross-link to §3.1 Guardian subclass** — the Guardian subclass perk includes partial enrage resistance (debuff stacks cap one tier lower), giving subclass picks a defensive use-case beyond pure damage scaling.

### 3.10 — Quest Chain Mastery
Expands the existing quest-chain concept (currently scoped to §3.3 Seasonal Events with cosmetic-only rewards) into a permanent gameplay system where completing themed quest chains grants stat buffs that stack with class perks (§3.1), title perks (§3.8), and prestige stars (§3.8). Gives players a fourth permanent-progression axis distinct from level, class, and prestige.

- **Chain types** — themed multi-step quests that span days or weeks rather than the existing single-day daily quests:
  - **Discipline chains** — complete 30 focus sessions in 30 days → permanent +2% focus session XP
  - **Combat chains** — defeat 10 weekly bosses without missing a week → permanent +1 attack charge regen per day
  - **Collection chains** — earn 50 chests of any tier → permanent +3% loot luck
  - **Mastery chains** — reach a per-habit streak milestone (e.g., 100-day yoga streak) → permanent +1% XP from that habit category
  - **Exploration chains** — try every theme at least once → permanent +5% crystal shard yield (rewards engagement with the §2.4 theme expansion work)
- **Buff stacking rules** — each completed chain grants a small permanent buff (+1–5% range). Buffs stack additively with other chain buffs, multiplicatively with class/title perks, to prevent runaway scaling. Per-chain cap of +5% so no single chain dominates.
- **Chain visibility** — new "Quest Chains" page (slots into the Tools section or as a Character Sheet sub-tab) shows in-progress chains with step-by-step progress bars, completed chains with the awarded buff displayed, and locked/preview chains teasing future targets.
- **Pacing safeguards** — chains require sustained behavior over weeks/months by design; no chain completable in under 7 days. Prevents one-week grind sessions from frontloading all buffs.
- **Cross-link to §3.3 Seasonal Events** — seasonal event chains continue to award *cosmetic* rewards (titles, themes, companion skins) on top of any stat buff. Cosmetic vs. permanent-buff distinction keeps both systems meaningful — seasonal chains feel special, permanent chains feel earned.
- **No respec** — unlike class/subclass perks, chain buffs are uncapped-stack permanent additions to the character. Once earned, never lost (survives prestige resets per the §3.8 "kept across prestiges" rule). Creates the long-tail collection motivation Phase 3 is designed around.

---

## Phase 4 — Social & Multiplayer (v4.0)

Features that connect players and drive organic growth.

### 4.1 — Guilds / Parties
- Create or join a guild (invite-link based, no server accounts needed)
- Shared guild quest board with collective goals (e.g., "Guild members complete 100 tasks this week")
- Guild XP and level — unlocks shared perks (bonus gold %, shared loot luck)
- Guild chat (simple message board via cloud sync)

### 4.2 — Leaderboards
- Opt-in anonymous leaderboards: Weekly XP, Boss Kills, Focus Hours, Streak Length
- Friend-only leaderboards via challenge links
- Seasonal leaderboard resets with cosmetic rewards for top tiers

### 4.3 — Cooperative Boss Raids
- Weekly "Raid Boss" with massive HP pool shared across guild members
- Each member's attack charges contribute to a shared damage pool
- Raid completion grants everyone in the guild unique loot
- Introduces cooperative motivation without requiring real-time play

### 4.4 — Social Feed / Activity Log
- Opt-in feed of friend achievements ("Alex defeated the Weekly Boss!", "Sam hit a 30-day streak!")
- React with quick emoji responses
- Drives friendly competition and accountability

---

## Phase 5 — Intelligence & Insights (v5.0)

Data-driven features that help users understand and improve their productivity.

### 5.0 — Analytics Foundation Audit (prerequisite)
Before any of §5.1–5.5 build new analytics on top of the existing Analytics view, the existing page needs a full correctness pass. Several widgets currently render with empty, stale, or visibly-broken state (initially reported during v2.6 testing; tracked short-term as a v2.6.x patch under §2.2, tracked long-term here as the Phase 5 prerequisite).

- Walk every widget on the Analytics view — activity heatmap, XP timeline, task breakdown, productivity patterns, personal records, habit heatmap — and verify each against empty / partial / full dataset states.
- Identify root causes (data-source mismatch, stale memoization, render-on-mount gaps, off-by-one date math) rather than papering over symptoms.
- Add light regression coverage for the analytics aggregation helpers so future feature work (§5.1 Smart Scheduling, §5.4 Focus Session Analytics, §5.5 Analytics Export) doesn't inherit silent breakage.
- Result is a known-good baseline that the rest of Phase 5 can extend with confidence.

### 5.1 — Smart Scheduling
- Analyze historical completion patterns (time of day, day of week)
- Suggest optimal scheduling for new tasks based on past behavior
- "Best time to focus" recommendation based on focus session completion rates

### 5.2 — Weekly AI Digest
- Auto-generated weekly summary: trends, highlights, areas of improvement
- Compare current week vs. previous week performance
- Celebrate improvements, gently flag declining metrics

### 5.3 — Goal Dependency Mapping
- Visual graph linking life goals → yearly → monthly → weekly → daily tasks
- See which daily actions feed into long-term objectives
- Identify "orphan" tasks with no strategic purpose

### 5.4 — Focus Session Analytics (refine existing)
- Expand the existing analytics to add focus-specific breakdowns: session length distribution, completion rate, time-of-day heatmap
- Track "deep work hours" per week with trend charts
- Integration with calendar view (show focus blocks on calendar)

### 5.5 — Analytics Export (refine existing)
- Expand the existing JSON export to include CSV/PDF export of analytics data
- Shareable productivity reports (weekly/monthly summaries)
- GDPR-compliant full data download

---

## Phase 6 — Platform & Monetization (v6.0)

Infrastructure and business model improvements.

### 6.1 — Cloud Sync & Multi-Device
- Optional cloud backup (Firebase / Supabase) with account creation
- Real-time sync across devices (phone, tablet, desktop)
- Conflict resolution for offline edits
- Foundation for all multiplayer/social features

### 6.2 — iOS App
- Capacitor build for iOS
- App Store submission with proper assets
- iOS-specific: haptics, widgets, Shortcuts integration

### 6.3 — Desktop App Polish
- Electron tray icon with quick-add
- System notification integration
- Global hotkey for starting focus timer
- Menu bar mini-timer display

### 6.4 — Premium Tier Expansion
- **Free tier**: All core productivity features, basic spells/enchantments, 1 companion slot, 1 streak freeze (§1.7) held at a time
- **Premium tier** (current + planned additions):
  - All spells/enchantments, unlimited companion collection, premium themes
  - **Second active companion slot** *(planned)* — equip two companions simultaneously; their passive multipliers stack subject to the per-effect cap noted in §3.4. First true gameplay-affecting premium perk (everything previously was cosmetic or collection-depth); justified as premium because the cap prevents pay-to-win runaway while still delivering a meaningful daily-play advantage.
  - **Streak protection upgrades** *(planned, §1.7)* — hold up to 3 streak freezes at a time + automatic "sick day" shield (1 free freeze per 30 days even if inventory is empty) + streak repair option (spend Focus Crystals to restore a recently-broken streak within 48 hours).
- **Premium+ / Annual**: Cloud sync, advanced analytics, priority seasonal content, exclusive companion evolutions

### 6.5 — Monetization Options
- Cosmetic-only microtransactions: theme packs, companion skins, title packs
- One-time "Starter Pack" bundle (crystals + spells + theme)
- Ensure no pay-to-win: all gameplay-affecting items remain earnable through play

---

## Pre-v2.7.1 UX Audit — Deferred Findings (Jun 3, 2026)

Full 6-dimension UX audit run before tagging v2.7.1. **2 ship-blockers** + **8 quick fixes** were addressed in v2.7.1 itself; the **13 deferred findings** below are captured for v2.8+ work. Each is tagged with the audit dimension it surfaced under.

| # | Finding | File / Area | Dimension |
|---|---|---|---|
| **L1** | Default level-1 title `'Peasant'` is mildly demoralizing as first impression. Rename to `'Adventurer'` (gender-neutral) or `'Novice'` across both `LEVEL_TITLES.masculine` and `.feminine` chains. Note: title chain changes will retitle existing users mid-game, so this deserves its own release-notes mention. | `goal-manager.js:2286-2287` | Onboarding |
| **L2** | Splash screen lacks accessibility attributes (`role="status"`, `aria-live`, `aria-label`). Screen readers don't announce the loading state. | `index.html:77-89` | Onboarding |
| **L3** | Motivational quote initial state `"Loading wisdom..."` causes a brief FOUC on every dashboard render. The quote is picked synchronously in JS — there's no real async load — so the placeholder is dishonest. Inline the first quote at HTML render time, or leave the slot empty until JS picks one. | `index.html:756-759` | Daily flow |
| **L4** | Achievement toast has no manual dismiss handler. Power users running through bulk completions get queued toasts they can't skip. Add tap-to-dismiss. | `goal-manager.js` (toast logic) | Daily flow |
| **L5** | Locked-nav toast copy is transactional (`🔒 Treasury & Rewards unlocks at Level 2!`). Add a teaser fragment per locked feature explaining what's coming: `🔒 Treasury & Rewards unlocks at Level 2 — open chests for spells, themes & companions!` | `goal-manager.js:2049-2051` | Discoverability |
| **L6** | 10-item desktop sidebar at full unlock is dense for new users staring at locked entries. Consider a "More" disclosure that hides level 6+ features until the user is closer to unlocking them. Mobile already handles this well via horizontal scroll + locked visuals. | `index.html:375-416` | Discoverability |
| **L7** | Tutorial tooltip lacks `max-height` (only has `max-width: 42rem`). Recreates the modal-sizing bug we just fixed for What's New if step content ever grows. Add `max-height: 90vh; overflow-y: auto;` for safety. | `index.html:327` | Mobile UX |
| **L8** | PWA install button uses flat `bottom: 90px` without safe-area handling. Other bottom-pinned overlays use `calc(96px + env(safe-area-inset-bottom))`. May collide with Android gesture bar. | `mobile.css:336-337, 502-503` | Mobile UX |
| **L9** | PWA install button shows on Capacitor APK (irrelevant prompt — they already installed via Play Store). Hide entirely when `Capacitor.isNativePlatform()`. | `pwa-handler.js` | Mobile UX |
| **L10** | `mobile.css` line 498 still uses `body > .flex > div:last-child` for main content area — the only remaining instance of the fragile DOM-position selector pattern (the `:first-child` instances were hardened to `#main-sidebar` in v2.7.1). The content area `<div>` at `index.html:421` has no id. Add `id="main-content"` and switch the selector. | `mobile.css:498`, `index.html:421` | Mobile UX |
| **L11** | No explicit offline indicator. Service worker handles caching, but sync actions (referral, challenge, share) while offline produce cryptic errors. Add a small "Offline" pill at top of viewport when `navigator.onLine === false`. | UI banner needed | Empty/edge states |
| **L12** | `deleteAllData()` confirmation flow not audited end-to-end. Worth a manual device-test pass to verify the confirmation modal text is sufficiently scary (irreversible warning, maybe a "type DELETE to confirm" pattern). | `index.html:1624-1626` + confirmation modal | Empty/edge states |
| **L13** | `future-updates.md` (6.2KB) at repo root duplicates ROADMAP content. ROADMAP is the canonical source. Either merge meaningful entries here and delete, or move to `docs/`. Same review for `SECURITY_AUDIT_v2.4.10.md` (six releases ago) — archive or confirm findings still relevant. | repo root | Polish hygiene |

**Recommended grouping for v2.8 work:** L1 + L5 + L6 land naturally with v2.8's theme expansion sprint (all are user-facing copy/discoverability tweaks). L7 + L8 + L9 + L10 are a coherent "mobile UX hardening" mini-sprint (~30 min total). L2 + L4 + L11 are accessibility/feedback polish — bundle into the Accessibility Deep Pass already in the Backlog. L3 + L12 + L13 are one-offs to grab whenever convenient.

---

## Backlog / Ideas (Unscheduled)

| Idea | Notes |
|---|---|
| **Task Templates** | Save and reuse task/quest templates for non-recurring project types (recurring tasks already exist for scheduled repeats) |
| **Calendar Integrations** | Import from Google Calendar / Apple Calendar as auto-generated quests |
| **Custom Spell Creation** | Premium feature: design a custom spell with constrained effect parameters |
| **Mini-Games** | Simple skill-check mini-games during boss battles for bonus damage |
| **Dark/Light Theme Toggle** | System-respecting light mode option (previously tested, needs more visual contrast work to be impactful) |
| **Accessibility Deep Pass** | Full screen reader audit, high-contrast themes, reduced motion mode (basic ARIA already in place) |
| **Localization / i18n** | Multi-language support starting with Spanish, Portuguese, Japanese |
| **Offline-First Improvements** | Better PWA offline experience, background sync queue |
| **Widget Support** | Android home screen widgets (today's quests, streak counter, focus timer) |

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
     Phase 3            │           Phase 2
  (Depth/Progression)   │     (Visual & Experience)
                        │
  ──────────────────────┼──────────────────────
                        │
     Phase 4            │           Phase 6
    (Social)            │        (Platform)
                        │
                    LOW IMPACT
       HIGH EFFORT ◄────┼────► LOW EFFORT
```

*(Phase 1 shipped in v2.4. Phase 5 — Intelligence & Insights — spans mid-impact / mid-effort and slots after Phase 4.)*

**Recommended execution order:** Phase 2 (v2.5–2.9 visual line) → Phase 3 (v3.0 depth) → Phase 6.1 cloud sync (foundation for social) → Phase 4 (v4.0 social) → Phase 5 (v5.0 intel) → rest of Phase 6

---

*This roadmap is a living document. Reprioritize based on user feedback and analytics.*
