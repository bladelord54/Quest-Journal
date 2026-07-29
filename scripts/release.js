// @ts-check
'use strict';
/**
 * release.js — one-command release prep (Engineering Roadmap #2).
 *
 * Previously every release hand-edited up to six version strings across five
 * files (the CACHE_NAME counter alone was bumped 600+ times by hand) and then
 * ran cap:sync manually; one missed edit shipped stale code. This script makes
 * the whole sequence atomic and fail-loud.
 *
 * Usage:
 *   npm run release                 # code-only release: jest → cap:sync
 *   npm run release -- 3.0.1        # + set the app version everywhere & bump versionCode
 *   npm run release -- --no-test    # skip jest (not recommended)
 *   npm run release -- --no-sync    # skip copy:web + cap sync (bump only)
 *
 * Notes:
 * - Passing the SAME version again still bumps versionCode, which is exactly
 *   what a Play Store re-upload of an unchanged versionName requires.
 * - The full version-string map lives in docs/ENGINEERING_ROADMAP.md.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/**
 * @param {string} msg
 * @returns {never}
 */
function fail(msg) {
    console.error(`\n[X] RELEASE ABORTED — ${msg}`);
    process.exit(1);
}

/**
 * Count occurrences of `pattern` in `text` (independent of the /g flag).
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {number}
 */
function countMatches(text, pattern) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    return (text.match(new RegExp(pattern.source, flags)) || []).length;
}

/**
 * Regex-replace inside a repo file, aborting unless the pattern matches
 * EXACTLY once — a silent no-op replacement is how version strings drift.
 * @param {string} relPath  path relative to the repo root
 * @param {RegExp} pattern
 * @param {string | ((substring: string, ...groups: string[]) => string)} replacement
 */
function editFile(relPath, pattern, replacement) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) fail(`${relPath} not found`);
    const before = fs.readFileSync(abs, 'utf8');
    const count = countMatches(before, pattern);
    if (count !== 1) fail(`expected exactly 1 match of ${pattern} in ${relPath}, found ${count}`);
    const after = typeof replacement === 'string'
        ? before.replace(pattern, replacement)
        : before.replace(pattern, replacement);
    fs.writeFileSync(abs, after, 'utf8');
}

/** @param {string} cmd */
function run(cmd) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

// ---- argument parsing ------------------------------------------------------
const args = process.argv.slice(2);
const KNOWN_FLAGS = ['--no-test', '--no-sync'];
const flags = new Set(args.filter(a => a.startsWith('--')));
for (const f of flags) {
    if (!KNOWN_FLAGS.includes(f)) fail(`unknown flag ${f} (known: ${KNOWN_FLAGS.join(', ')})`);
}
const positional = args.filter(a => !a.startsWith('--'));
if (positional.length > 1) fail(`expected at most one version argument, got: ${positional.join(', ')}`);
const versionArg = positional[0] || null;
if (versionArg && !/^\d+\.\d+\.\d+$/.test(versionArg)) {
    fail(`'${versionArg}' is not a semver version (expected x.y.z)`);
}

// ---- 1) tests first: nothing is touched if the suite fails ------------------
if (flags.has('--no-test')) {
    console.log('(--no-test: skipping jest — not recommended for real releases)');
} else {
    try {
        run('npx jest --colors');
    } catch {
        fail('test suite failed — nothing was modified');
    }
}

// ---- 2) app-version strings (only with an explicit version) -----------------
if (versionArg) {
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;
    pkg.version = versionArg;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`[ok] package.json              version ${oldVersion} -> ${versionArg}`);

    let newCode = 0;
    editFile('android/app/build.gradle', /versionCode (\d+)/, (_m, n) => {
        newCode = Number(n) + 1;
        return `versionCode ${newCode}`;
    });
    editFile('android/app/build.gradle', /versionName "[^"]*"/, `versionName "${versionArg}"`);
    console.log(`[ok] android/app/build.gradle  versionCode -> ${newCode}, versionName -> "${versionArg}"`);

    editFile('goal-manager.js', /CHANGELOG_VERSION = '[^']*';/, `CHANGELOG_VERSION = '${versionArg}';`);
    console.log(`[ok] goal-manager.js           CHANGELOG_VERSION -> '${versionArg}' (re-arms the What's New modal)`);

    editFile('pwa-handler.js', /const APP_VERSION = '[^']*';/, `const APP_VERSION = '${versionArg}';`);
    console.log(`[ok] pwa-handler.js            APP_VERSION -> '${versionArg}'`);

    editFile('index.html', /Life Quest Journal v\d+\.\d+\.\d+/, `Life Quest Journal v${versionArg}`);
    console.log(`[ok] index.html                footer -> v${versionArg}`);
}

// ---- 3) ship into www/ + the Android project --------------------------------
if (flags.has('--no-sync')) {
    console.log('\n(--no-sync: skipped copy:web + cap sync — www/ and android/ are now BEHIND the repo root)');
} else {
    run('npm run cap:sync');
}

console.log('\n[done] Release prep complete.');
console.log(versionArg
    ? '  Next: npm run cap:open -> build the signed AAB in Android Studio.'
    : '  (code-only release: app version unchanged — pass x.y.z to cut a version release)');
