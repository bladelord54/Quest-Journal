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
  'goal-manager.js',
  'audio-manager.js',
  'analytics-methods.js',
  'capacitor-bridge.js',
  'mobile-touch.js',
  'pwa-handler.js',
  'service-worker.js',
  'styles.css',
  'dark-mode.css',
  'mobile.css',
  'themes.css',
  'animations.css',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'sounds',
  'icons',
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
