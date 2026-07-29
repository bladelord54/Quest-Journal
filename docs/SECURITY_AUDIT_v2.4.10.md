# Security Audit — v2.4.10

**Date:** 2026-05-22  
**Scope:** Web bundle (`goal-manager.js`, `pwa-handler.js`, `service-worker.js`, `effects-manager.js`, `capacitor-bridge.js`, `index.html`), Capacitor config, Android manifest.  
**Threat model:** Client-side webapp running inside a Capacitor WebView (Android) or as a PWA. No backend (data is localStorage). Attacker vectors: (a) crafted URL params, (b) malicious backup JSON import, (c) other users' devtools tampering (own device — out of scope), (d) third-party CDN compromise.

---

## Findings by severity

### 🔴 HIGH — FIXED in this audit

#### H1. Stored / reflected XSS in `showAcceptChallengeModal`
**File:** `goal-manager.js` ~17496  
**Root cause:** Challenge data is decoded from a base64 URL param (`?challenge=...`) → parsed as JSON → interpolated into `innerHTML` without escaping. Fields `data.i` (icon), `data.dl` (deadline days), `data.d` (difficulty), `rewards.xp`, `rewards.gold` were inserted raw.  
**Impact:** Anyone sending a crafted challenge link could execute arbitrary JS in the victim's app context — full localStorage exfiltration, premium unlock, etc.  
**Fix:** All attacker-controlled fields now sanitized:
- `data.d` whitelisted against `{easy,medium,hard,epic}` map
- numeric fields coerced through `parseInt` + clamped to sane ranges
- `data.i` length-limited (≤4 chars) and HTML-escaped
- `data.t`, `data.c.t` length-truncated and HTML-escaped
- `data.ty` whitelisted to `'preset'|'custom'`

---

### 🟡 MEDIUM — Acceptable risk / partially mitigated

#### M1. No Content Security Policy meta tag
**File:** `index.html`  
**Status:** No `<meta http-equiv="Content-Security-Policy">`.  
**Impact:** If a future XSS slips through, no defense-in-depth. Inline scripts and event handlers (lots of `onclick="..."` in template literals) prevent a strict CSP without major refactor.  
**Recommendation (future):** Move to event delegation, then ship CSP `default-src 'self'; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob:;`. Not blocking 2.4.10.

#### M2. External CDN scripts without Subresource Integrity (SRI)
**File:** `index.html:55-57`  
**Vulnerable resources:**
- `https://cdn.tailwindcss.com` (executes JS)
- `https://cdn.jsdelivr.net/.../remixicon.css`
- `https://fonts.googleapis.com/...`

**Impact:** If Tailwind CDN is compromised, attacker has full JS execution. Tailwind CDN doesn't publish stable hashes (script is dynamically generated), so SRI is not practical there. Remixicon CSS can take SRI but worst case is CSS injection.  
**Recommendation:** Long-term — vendor Tailwind locally (precompile a small CSS bundle). For 2.4.10 the Android build runs in a WebView with `allowMixedContent:false` so traffic is HTTPS; risk is bounded by Cloudflare/jsDelivr trust.

#### M3. `unlockPremium()` callable from devtools
**File:** `goal-manager.js:10404`  
**Status:** `window.goalManager.unlockPremium()` flips `isPremium = true` with no server verification.  
**Impact:** Determined user can self-unlock premium. This is inherent to a serverless app — *not a security vulnerability per OWASP* (attacker can only "attack" their own device), but business risk.  
**Mitigation:** Already routed through Google Play Billing for the legitimate path; revenue impact is bounded by the small population of devtools-capable users. Server-side receipt validation is the only true fix.

---

### 🟢 LOW — Reviewed and clean

#### L1. JSON import (`importData` / backup restore)
**Reviewed:** `JSON.parse` paths in `goal-manager.js` and `analytics-methods.js` are all wrapped in `try/catch`. Imported fields are coerced before use (`data.isPremium || false`, etc.) and rendered through `escapeHTML`. No prototype-pollution sinks reachable (no `Object.assign(this, parsed)` on raw input).

#### L2. URL / link safety
**Reviewed:** All external `<a target="_blank">` in `index.html` (Discord invite line 1455, share links) include `rel="noopener noreferrer"`. `window.open` callers in `capacitor-bridge.js` only open hardcoded URLs.

#### L3. Code execution sinks
**Reviewed:** No `eval`, no `new Function`, no `setTimeout(string)` / `setInterval(string)`. All timer callbacks are functions.

#### L4. Service worker scope / cache poisoning
**Reviewed:** `service-worker.js`
- Only caches same-origin or known-CDN-allowlist responses (line 130-132, 154-159).
- Skips opaque/non-200 responses (line 150).
- Skips non-GET (line 125) — no POST cache poisoning.
- Cache version `v392` increments correctly on releases.
- Push handler validates `data.settings.enabled` before showing notifications; falls back to generic content (no user data in fallback).

#### L5. Capacitor config + AndroidManifest
**Reviewed:**
- `androidScheme: 'https'` ✅
- `allowMixedContent: false` ✅
- Permissions: `INTERNET`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `VIBRATE` — minimal, no over-grant.
- Only `MainActivity` is exported (required for launcher).
- FileProvider `exported="false"` ✅
- No `android:debuggable="true"`, no `android:usesCleartextTraffic="true"`.

#### L6. No test/debug backdoors
- `?godmode=1` hook in `index.html` confirmed removed.
- No `window.cheatMode`, `window.debugMode`, no commented-out test hooks in shipping bundle.

#### L7. Challenge code encoder/decoder
- `decodeChallengeCode` wraps in try/catch, validates required fields (`data.t && data.d`) before returning.
- URL param is stripped via `history.replaceState` so reload won't re-trigger.

---

## Recommendations beyond 2.4.10

1. **Add CSP meta tag** after refactoring inline event handlers to delegated listeners. Biggest hardening win.
2. **Vendor Tailwind locally** — eliminates the single biggest CDN supply-chain risk and improves offline-first PWA story.
3. **Server-side receipt validation** for premium (requires backend; non-trivial).
4. **Consider Trusted Types** policy once CSP is in place — would have caught H1 statically.
5. **Add a fuzzer test** that feeds random JSON into `decodeChallengeCode` + `showAcceptChallengeModal` to guard against future regressions. Could plug into existing `tests/goal-manager.test.js` harness.

---

## Changes applied in this audit
- `goal-manager.js` `showAcceptChallengeModal` hardened against XSS via challenge URL param.

## Ready to ship v2.4.10? 
**Yes** — high-severity XSS is closed. Remaining items are defense-in-depth and out-of-scope for a point release.
