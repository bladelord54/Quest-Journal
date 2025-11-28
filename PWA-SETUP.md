# 📱 PWA Setup Guide

Your Quest Journal app is now **PWA-enabled**! Here's what was added and how to test it.

---

## ✅ What Was Added

### 1. **PWA Meta Tags** (`index.html`)
- Theme color for mobile browsers
- Apple mobile web app configuration
- Viewport settings for responsive design
- Manifest link

### 2. **Manifest File** (`manifest.json`)
- App name, description, and branding
- Display mode (standalone = looks like native app)
- Icon references (multiple sizes)
- Shortcuts for quick actions
- Categories and orientation settings

### 3. **Service Worker** (`service-worker.js`)
- Caches app files for offline use
- Serves cached content when offline
- Updates cache automatically
- Handles network failures gracefully

### 4. **PWA Handler** (`pwa-handler.js`)
- Registers service worker
- Detects install prompt
- Shows install button
- Handles app installation

### 5. **Mobile CSS** (`mobile.css`)
- Responsive design for phones & tablets
- Bottom navigation bar on mobile
- Touch-friendly buttons and inputs
- Safe area handling for notched phones
- Landscape mode support

### 6. **Install Button**
- Floating button appears when app is installable
- Disappears after installation
- Shows success message

---

## 🎨 Generate Icons

**You need to create icon files before the PWA works fully.**

### Option 1: Use the Icon Generator (Quick)

1. Open `generate-icons.html` in your browser
2. Right-click each icon and "Save Image As..."
3. Create a folder: `icons/` in your project root
4. Save each as: `icon-72.png`, `icon-96.png`, `icon-128.png`, etc.

**Sizes needed:** 72, 96, 128, 144, 152, 192, 384, 512

### Option 2: Use Custom Icons (Better)

Create your own icons with a tool like:
- [Figma](https://figma.com)
- [Canva](https://canva.com)
- [Icon Kitchen](https://icon.kitchen/)
- Photoshop/GIMP

**Design tips:**
- Use the sword ⚔️ or castle 🏰 theme
- Amber/brown color scheme (#78350f)
- Keep it simple for small sizes
- Make sure it looks good on light & dark backgrounds

---

## 🧪 Testing Your PWA

### Desktop Testing (Chrome/Edge)

1. **Serve over HTTPS or localhost**
   - PWAs require secure connection
   - File:// won't work for service workers
   - Use a local server:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Node.js (with http-server)
     npx http-server
     ```

2. **Open in browser**: `http://localhost:8000`

3. **Check PWA readiness**:
   - Open DevTools (F12)
   - Go to **Application** tab
   - Check **Manifest** - should show all details
   - Check **Service Workers** - should be registered
   - Look for **Install** button in address bar

4. **Install the app**:
   - Click install button in address bar OR
   - Click the floating "📱 Install App" button
   - App opens in its own window

### Mobile Testing (Real Device)

1. **Deploy to web host** (GitHub Pages, Netlify, Vercel)
   - Must be HTTPS
   - Upload all files

2. **Visit on phone**:
   - Open in Chrome (Android) or Safari (iOS)
   - Look for "Add to Home Screen" prompt
   - Or click the "📱 Install App" button

3. **Install from browser menu**:
   - **Android Chrome**: Menu → "Install app" or "Add to Home screen"
   - **iOS Safari**: Share → "Add to Home Screen"

4. **Launch installed app**:
   - Tap icon on home screen
   - Opens fullscreen like native app
   - No browser UI

### Testing Offline

1. Install the app
2. Open DevTools → Application → Service Workers
3. Check "Offline" box
4. Reload app - should still work!
5. Your data is in localStorage, so everything persists

---

## 🔧 Customization

### Change App Name
Edit `manifest.json`:
```json
"name": "Your Custom Name",
"short_name": "Short Name"
```

### Change Theme Color
Edit `manifest.json` and `index.html`:
```json
"theme_color": "#your-color",
"background_color": "#your-color"
```

### Add More Shortcuts
Edit `manifest.json`:
```json
"shortcuts": [
  {
    "name": "Custom Action",
    "url": "./index.html?action=custom",
    "icons": [...]
  }
]
```

### Update Cache
When you change files, update the cache version in `service-worker.js`:
```javascript
const CACHE_NAME = 'quest-journal-v2'; // Increment version
```

---

## 📊 What Works Now

### Desktop
✅ Exact same experience as before
✅ Optional: Install as desktop app
✅ Works offline after first visit
✅ Auto-updates when you reload

### Mobile (Phone/Tablet)
✅ Bottom tab navigation
✅ Responsive layout
✅ Touch-friendly buttons
✅ Install to home screen
✅ Fullscreen app mode
✅ Works offline
✅ Safe area handling (notched phones)

---

## 🐛 Troubleshooting

### "Install button never appears"
- Check if HTTPS or localhost
- Open DevTools → Console for errors
- Ensure manifest.json has no syntax errors
- Icons must exist in /icons/ folder

### "Service worker not registering"
- Must be HTTPS or localhost
- Check console for errors
- Make sure service-worker.js is in root directory
- Try hard refresh (Ctrl+Shift+R)

### "App doesn't work offline"
- Install the app first
- Check Application → Service Workers → Status should be "activated"
- Visit pages while online first (they get cached)
- Check Cache Storage in DevTools

### "Mobile layout broken"
- Clear cache and reload
- Check if mobile.css loaded (DevTools → Network)
- Try in Chrome DevTools mobile emulator
- Check console for CSS errors

---

## 🚀 Next Steps

1. **Generate icons** using `generate-icons.html`
2. **Test locally** with a local server
3. **Deploy to web** (GitHub Pages, Netlify, etc.)
4. **Test on real phone**
5. **Share the link** - anyone can install it!

---

## 📱 Deployment Options

### GitHub Pages (Free)
1. Push code to GitHub repo
2. Go to Settings → Pages
3. Select branch → Save
4. Visit: `https://username.github.io/repo-name`

### Netlify (Free, Recommended)
1. Drag & drop folder to [netlify.com/drop](https://netlify.com/drop)
2. Get instant HTTPS URL
3. Can connect to GitHub for auto-deploy

### Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project folder
3. Get instant deployment

---

**Your app is now a Progressive Web App!** 🎉

Once icons are generated and deployed to HTTPS, it will work on any device as an installable app.
