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

## 5. Integrations

- Calendar/scheduling integration (Google Calendar, etc.)
- Analytics export (PDF reports)

---

## 6. Extended Title Tiers

Current titles cap at level 10 ("Legend"). Add more tiers:
- Level 12: Mythic
- Level 15: Ascendant
- Level 20: Immortal
- Level 25: Celestial
- Level 30: Eternal
- Level 40: Transcendent
- Level 50: Prestige-eligible

---

## 7. Native Mobile App

Consider building a native Android/iOS app if the PWA/TWA approach hits limitations.

---

## Design Principles (All Features)
- No direct power creep — focus on QoL, economy bridges, streak protection
- Free users get consumables + commons/uncommons; premium gates legendary spells and epic companions
- Seasonal rotation — swap shop items monthly to keep loot fresh
- No auto-completion mechanics — the user must complete tasks themselves
