# 🚀 Deploy Quest Journal NOW - Quick Start

## ✅ Step-by-Step Deployment (30 minutes)

### **STEP 1: Get GitHub Desktop**

1. Download: https://desktop.github.com/
2. Install and sign in (or create GitHub account)

---

### **STEP 2: Create Repository**

1. Open GitHub Desktop
2. Click **"Create a New Repository"**
3. Fill in:
   ```
   Name: quest-journal
   Description: RPG-style task manager app
   Local Path: c:\Users\ryanc\CascadeProjects\Life Organize\CascadeProjects\windsurf-project
   ```
4. ✅ Check "Initialize with README"
5. Click **"Create Repository"**

---

### **STEP 3: Publish to GitHub**

1. Click **"Publish repository"** (top right)
2. ⚠️ **UNCHECK** "Keep this code private" 
   - Must be public for GitHub Pages!
3. Click **"Publish Repository"**
4. Wait 30 seconds for upload

---

### **STEP 4: Enable GitHub Pages**

1. Open browser: `https://github.com/YOUR-USERNAME/quest-journal`
2. Click **"Settings"** tab
3. Click **"Pages"** (left sidebar)
4. Under **Source**:
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **"Save"**
6. Wait 1-2 minutes
7. Refresh - You'll see:
   ```
   ✅ Your site is live at https://YOUR-USERNAME.github.io/quest-journal/
   ```

---

### **STEP 5: Update Your Contact Email**

**BEFORE Play Store submission:**

1. Open `privacy-policy.html`
2. Find line 190: `YOUR-EMAIL@example.com`
3. Replace with your real email
4. Save and commit changes
5. Push to GitHub

---

### **STEP 6: Test Your Live App**

Visit: `https://YOUR-USERNAME.github.io/quest-journal/`

**Test checklist:**
- [ ] App loads correctly
- [ ] Can create and complete tasks
- [ ] XP and gold increase
- [ ] All navigation works
- [ ] Privacy policy link works
- [ ] Sound files play (if you added them)
- [ ] PWA install prompt appears (on mobile)

---

## 📝 Save Your Deployment URL

Once deployed, **write down your URL here:**

```
🌐 Live App URL: https://_________________________________.github.io/quest-journal/

📧 Privacy Policy: https://_________________________________.github.io/quest-journal/privacy-policy.html
```

**You'll need this URL for:**
- Building Android app with Bubblewrap
- Google Play Store submission
- Privacy policy link in Play Console

---

## 🎯 Next Steps After Deployment

Once your app is live on GitHub Pages:

1. ✅ **Create Screenshots** (2-4 hours)
   - Use Chrome DevTools
   - Capture 8 different views
   - 1080 x 1920 px each

2. ✅ **Create Feature Graphic** (1-2 hours)
   - 1024 x 500 px
   - Use Canva or Figma
   - Fantasy/RPG theme

3. ✅ **Build Android App** (2-3 hours)
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest https://YOUR-URL/manifest.json
   bubblewrap build
   ```

4. ✅ **Create Play Console Account** ($25)
   - https://play.google.com/console
   - Upload AAB file
   - Fill store listing
   - Submit for review

---

## 🆘 Troubleshooting

**App not loading on GitHub Pages?**
- Wait 2-3 minutes after enabling Pages
- Check repo is public (not private)
- Verify `index.html` is in root folder
- Try hard refresh: Ctrl + Shift + R

**404 error?**
- Make sure URL includes `/quest-journal/` at the end
- Check GitHub Pages is enabled in Settings
- Verify branch is set to `main` (or `master`)

**Privacy policy not loading?**
- Check file is named `privacy-policy.html` exactly
- Should be in root folder, same level as `index.html`

---

## 📞 Need Help?

- GitHub Pages Docs: https://pages.github.com/
- GitHub Desktop Guide: https://docs.github.com/en/desktop
- GitHub Community: https://github.community/

---

## ✅ Deployment Checklist

- [ ] GitHub Desktop installed
- [ ] Repository created locally
- [ ] Repository published to GitHub (public)
- [ ] GitHub Pages enabled
- [ ] App loads at GitHub Pages URL
- [ ] All features tested and working
- [ ] Contact email updated in privacy policy
- [ ] URL saved for next steps

---

**Once complete, move on to creating graphics!**

See `PLAYSTORE-SUBMISSION-GUIDE.md` for the full guide.

Good luck! You're one step closer to launching! 🎮⚔️
