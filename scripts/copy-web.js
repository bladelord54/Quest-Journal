/**
 * Copies web assets to the www/ directory for Capacitor builds.
 * Run with: node scripts/copy-web.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// Files and directories to copy
const items = [
  'index.html',
  'landing.html',
  'privacy-policy.html',
  'balance.js',
  'level-titles.js',
  'companion-definitions.js',
  'spell-definitions.js',
  'theme-definitions.js',
  'achievement-definitions.js',
  'boss-themes.js',
  'class-definitions.js',
  'enchantment-definitions.js',
  'starter-task-presets.js',
  'quest-chain-templates.js',
  'loot-engine.js',
  'loot-pool.js',
  'boss-generator.js',
  'persistence-migrations.js',
  'streak-logic.js',
  'leveling-logic.js',
  'effort-xp-logic.js',
  'buff-multipliers.js',
  'companion-logic.js',
  'class-perks.js',
  'class-progression.js',
  'skill-points.js',
  'crystal-economy.js',
  'charge-rules.js',
  'combat-damage.js',
  'reward-economy.js',
  'focus-session-logic.js',
  'spell-lifecycle.js',
  'period-summary-logic.js',
  'reminder-schedule-logic.js',
  'boss-render.js',
  'task-render.js',
  'companion-render.js',
  'spell-render.js',
  'class-render.js',
  'analytics-render.js',
  'quest-chain-render.js',
  'enchantment-render.js',
  'dashboard-render.js',
  'player-hud-render.js',
  'title-render.js',
  'reward-render.js',
  'theme-render.js',
  'badge-render.js',
  'habit-render.js',
  'archive-render.js',
  'daily-board-render.js',
  'recurring-render.js',
  'calendar-render.js',
  'focus-timer-render.js',
  'premium-render.js',
  'reminder-render.js',
  'goal-manager.js',
  'audio-manager.js',
  'effects-manager.js',
  'analytics-methods.js',
  'capacitor-bridge.js',
  'mobile-touch.js',
  'stat-tooltip.js',
  'parallax-tilt.js',
  'pwa-handler.js',
  'styles.css',
  'tailwind.css',
  'dark-mode.css',
  'mobile.css',
  'themes.css',
  'animations.css',
  'robots.txt',
  'sitemap.xml',
  'sounds',
  'icons',
  'images',
  'vendor',
  '.well-known'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Clean and recreate www/
if (fs.existsSync(OUT)) {
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });

let copied = 0;
for (const item of items) {
  const src = path.join(ROOT, item);
  const dest = path.join(OUT, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    copied++;
    console.log(`  ✓ ${item}`);
  } else {
    console.log(`  ⚠ ${item} (not found, skipping)`);
  }
}

console.log(`\nDone — copied ${copied} items to www/`);
