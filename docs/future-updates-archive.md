# Life Quest Journal — Future Updates Design Doc

---

## 1. Prestige System

**Trigger:** Level 50

**What resets:** Level (to 1), XP (to 0)
**What stays:** Gold, crystals, spells, companions, themes, premium, titles, all goal/habit data

**Rewards per Ascension:**
- Player Panel Border: Bronze (I) → Silver (II) → Gold (III) → Diamond (IV) → Animated glow (V+)
- Prestige Badge: Roman numeral/stars next to player name
- XP Multiplier: +5% permanent per ascension
- Exclusive Titles: "The Ascended," "Twice-Forged," "Legendary Questor," etc.
- Prestige-only Themes: Unique color schemes
- Loot Luck Bonus: Better chest odds per rank

**UI:**
- Player panel shows border + prestige stars
- "Ascension Chamber" view at level 50 with dramatic animation
- Prestige rank visible on dashboard

**Premium Angle:** Free users get 1-2 ascensions. Premium unlocks unlimited + animated borders + prestige themes.

---

## 2. Market / Bazaar (Treasury Evolution)

**Concept:** The Treasury evolves into a Market with two sections — Treasure Chests (existing) and a Rotating Shop (new).

### Rotating Shop
- **Refresh cycle:** Daily reset (3-4 items) + 1 Weekly featured item
- **Currency:** Gold for common/uncommon, Focus Crystals for rare+, or a mix
- **Available items:**
  - Specific spells (target what you need instead of relying on chest RNG)
  - Companion XP potions
  - Enchantment scrolls (activate an enchantment without spending crystals)
  - Themes with preview + buy option
  - Streak Freeze tokens
  - Focus Crystal bundles (gold → crystals conversion)
- **Rarity indication:** Each slot shows item rarity with standard color coding
- **"Sold Out" state:** Once bought, slot shows "Sold Out" until next refresh

### Design Principles
- Reduces RNG frustration — players can target specific items
- Gold sink — gives gold more value at higher levels
- Daily engagement — "What's in the shop today?" reason to open the app
- Shop prices higher than chest expected value — chests still worthwhile for gamblers

### Premium Angle
- Free users: 3 daily slots
- Premium users: 5 daily slots + weekly featured legendary item

### UI
- Left side: Chest section (as-is)
- Right side: "Wandering Merchant" shop with merchant character, item cards with prices, countdown timer to next refresh

---

## 3. New Loot Items

### Consumables
- Focus Crystal Shard — grants 1-3 Focus Crystals
- Shield Charge — blocks 1 boss attack reset
- Lucky Coin — next chest opened is guaranteed one rarity tier higher
- Streak Freeze Token — preserves a streak for 1 missed day

### Spells
- Mirror Image — duplicates XP from next completed task
- Treasure Hunter — +25% gold rewards for 24 hours
- Chain Lightning — completing 3 tasks in a row deals bonus boss damage
- Second Wind — restores 1 attack charge when you complete a habit
- Alchemist's Touch — converts Focus Crystals to Gold (or vice versa)
- Phoenix Rebirth (Legendary) — if boss resets at end of period, revive it at 25% HP

### Companions
- Raven (Rare) — +10% gold from boss defeats
- Golem (Epic) — +1 attack charge at daily reset
- Kraken (Legendary) — boss attacks deal splash damage to other active bosses

### Themes (Loot-Exclusive)
- Volcanic Fortress — lava particles, red/orange (rare drop only)
- Crystal Cavern — glowing crystal particles, cyan/purple
- Celestial Observatory — star/constellation particles, deep blue/gold

### New Item Types
- Enchantment Scrolls — free enchantment activation
- Boss Trophies — cosmetic collectibles unique to each boss theme, displayed in Trophy Case

---

## 4. Social Features

- Accountability partners
- Leaderboards
- Shared quest chains

---

## 5. Cloud Sync & Backup

**Concept:** Allow users to back up and sync their data across devices, eliminating the single-device localStorage limitation.

### Options (in order of complexity)
- **Manual Export/Import** (simplest) — Export data as a JSON file to device storage or Google Drive. Import on another device. No server needed.
- **Firebase Firestore** — Real-time cloud sync with Google sign-in. Data stored per-user in the cloud. Enables cross-device play.
- **Supabase** — Open-source Firebase alternative with PostgreSQL. Self-hostable.

### What syncs
- All tasks, habits, goals, streaks
- Player state: level, XP, gold, crystals, inventory, companions, themes
- Premium status
- Settings & preferences

### Premium Angle
- Free users: Manual export/import
- Premium users: Automatic cloud sync

---

## 6. Integrations

- Calendar/scheduling integration (Google Calendar, etc.)
- Analytics export (PDF reports)

---

## 7. Extended Title Tiers

Current titles cap at level 10 ("Legend"). Add more tiers:
- Level 12: Mythic
- Level 15: Ascendant
- Level 20: Immortal
- Level 25: Celestial
- Level 30: Eternal
- Level 40: Transcendent
- Level 50: Prestige-eligible

---

## 8. Native Mobile App (Capacitor Migration)

**Recommended path:** Wrap existing PWA in Capacitor for native Android + iOS support.

### Benefits over current TWA
- Removes Chrome dependency (notifications, background tasks use native OS APIs)
- iOS App Store support
- Native in-app purchases (no Digital Goods API workaround)
- Better offline support and background sync
- Access to native device APIs (haptics, biometrics, etc.)

### Migration steps
1. Initialize Capacitor project wrapping existing web code
2. Replace service worker notifications with `@capacitor/local-notifications`
3. Replace Digital Goods API with `@capawesome/capacitor-in-app-purchases`
4. Replace localStorage with `@capacitor/preferences` (or keep localStorage — Capacitor supports it)
5. Build & sign for Android (.apk/.aab) and iOS (.ipa)
6. Publish to both Play Store and App Store

### Timeline estimate: 1-3 days for basic migration, 1-2 weeks for full native feature parity

---

## Design Principles (All Features)
- No direct power creep — focus on QoL, economy bridges, streak protection
- Free users get consumables + commons/uncommons; premium gates legendary spells and epic companions
- Seasonal rotation — swap shop items monthly to keep loot fresh
- No auto-completion mechanics — the user must complete tasks themselves
