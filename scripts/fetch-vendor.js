/**
 * Downloads third-party CSS/font assets into vendor/ so the app has no
 * runtime CDN dependencies (v2.9 deferred audit fix — offline first
 * launch rendered unstyled, every cold start paid CDN latency).
 *
 * Run once (and whenever versions change): node scripts/fetch-vendor.js
 *
 * What it fetches:
 *   vendor/remixicon/  — remixicon.css + woff2 (pinned 3.5.0, same as
 *                        the old jsdelivr <link>)
 *   vendor/fonts/      — fonts.css (rewritten Google Fonts CSS) + woff2
 *                        files for MedievalSharp, Cinzel 400/600/700/900,
 *                        Uncial Antiqua, Inter 400/500/600/700 (union of
 *                        index.html's and landing.html's old requests)
 *
 * Google's css2 endpoint serves woff2 @font-face rules only to browsers,
 * so we send a modern Chrome UA, then rewrite each fonts.gstatic.com URL
 * to a local file and download it.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'vendor');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const REMIXICON_BASE = 'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/';
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700;900&family=Uncial+Antiqua&family=Inter:wght@400;500;600;700&display=swap';

function fetch(url, asBuffer = false) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': CHROME_UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetch(res.headers.location, asBuffer));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve(asBuffer ? buf : buf.toString('utf8'));
        });
      })
      .on('error', reject);
  });
}

async function fetchRemixicon() {
  const dir = path.join(VENDOR, 'remixicon');
  fs.mkdirSync(dir, { recursive: true });

  let css = await fetch(REMIXICON_BASE + 'remixicon.css');
  // Find every font file the CSS references (woff2/woff/ttf/eot/svg) and
  // keep only woff2 — universally supported by every WebView/browser the
  // app targets; the legacy formats just bloat the vendor dir.
  const fontFiles = [...new Set([...css.matchAll(/url\("?(remixicon\.[a-z0-9?#=.]+)"?\)/gi)].map((m) => m[1]))];
  const woff2 = fontFiles.find((f) => f.includes('.woff2'));
  if (!woff2) throw new Error('remixicon.css: no woff2 source found');
  const woff2File = woff2.split('?')[0];
  fs.writeFileSync(path.join(dir, woff2File), await fetch(REMIXICON_BASE + woff2File, true));

  // Collapse the multi-format src list to the single local woff2.
  css = css.replace(
    /src:[^;]+;/,
    `src: url("${woff2}") format("woff2");`
  );
  fs.writeFileSync(path.join(dir, 'remixicon.css'), css);
  console.log(`  ✓ vendor/remixicon (remixicon.css + ${woff2File})`);
}

async function fetchGoogleFonts() {
  const dir = path.join(VENDOR, 'fonts');
  fs.mkdirSync(dir, { recursive: true });

  let css = await fetch(GOOGLE_FONTS_URL);
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  if (urls.length === 0) throw new Error('Google Fonts CSS contained no font URLs (UA sniffing changed?)');

  for (const url of urls) {
    // e.g. .../s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYrvDE5ZdqU.woff2
    //  → cinzel-8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYrvDE5ZdqU.woff2
    const parts = new URL(url).pathname.split('/').filter(Boolean); // ['s', family, version, file]
    const local = `${parts[1]}-${parts[parts.length - 1]}`;
    fs.writeFileSync(path.join(dir, local), await fetch(url, true));
    css = css.split(url).join(`./${local}`);
  }
  fs.writeFileSync(path.join(dir, 'fonts.css'), css);
  console.log(`  ✓ vendor/fonts (fonts.css + ${urls.length} woff2 files)`);
}

(async () => {
  console.log('Fetching vendor assets...');
  await fetchRemixicon();
  await fetchGoogleFonts();
  console.log('\nDone — vendor/ is self-contained. Re-run only when versions change.');
})().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
