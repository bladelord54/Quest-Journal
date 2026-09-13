/**
 * Copies web assets to the www/ directory for Capacitor builds.
 * Run with: node scripts/copy-web.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// Files and directories to copy
// Root .js files that are tooling, not app code.
const NON_APP_JS = new Set(['babel.config.js', 'jest.config.js', 'tailwind.config.js']);

const items = [
  'index.html',
  'landing.html',
  'privacy-policy.html',
  // Every root-level .js file (Engineering Roadmap #3, criterion 3): main.js is the ES-module
  // entry, goal-manager.js imports the catalog / logic / render modules, and the standalone
  // classic scripts sit alongside. No hand-maintained list — a new module is picked up by name.
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !NON_APP_JS.has(f)),
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
