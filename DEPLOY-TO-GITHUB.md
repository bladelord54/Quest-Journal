# 🚀 Deploy Quest Journal to GitHub Pages (5 Minutes)

This is the fastest way to get your app online for free!

---

## Prerequisites
- GitHub account (free at github.com)
- Git installed on your computer

---

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `quest-journal`
   - **Description**: "RPG-themed task manager - Level up your life!"
   - **Public** (required for free GitHub Pages)
   - ✅ Add a README file
3. Click "Create repository"

---

## Step 2: Upload Your Code

### Option A: Using Git (Command Line)

```bash
# Open terminal in your project folder
cd "c:\Users\ryanc\CascadeProjects\Life Organize\CascadeProjects\windsurf-project"

# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Quest Journal v1.0"

# Connect to GitHub (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/quest-journal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option B: Using GitHub Desktop (No Command Line)

1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Click "Add" → "Add Existing Repository"
4. Browse to your project folder
5. Click "Publish repository"
6. Select your created repository
7. Click "Publish"

### Option C: Drag & Drop (Easiest, but slower)

1. Go to your repository on GitHub
2. Click "uploading an existing file"
3. Drag your entire project folder
4. Click "Commit changes"

---

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Pages" in the left sidebar
4. Under "Source", select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click "Save"
6. Wait 1-2 minutes for deployment
7. Your app will be live at:
   ```
   https://YOUR-USERNAME.github.io/quest-journal/
   ```

---

## Step 4: Test Your Deployment

1. Open the URL in your browser
2. Verify:
   - [ ] App loads correctly
   - [ ] You can create tasks
   - [ ] All views work
   - [ ] PWA install prompt appears
   - [ ] Icons load correctly

---

## Step 5: Update Privacy Policy

1. Open `privacy-policy.html`
2. Find this line:
   ```html
   Email: <a href="mailto:support@questjournal.app"...
   ```
3. Replace with your email:
   ```html
   Email: <a href="mailto:your-email@example.com"...
   ```
4. Save and push changes:
   ```bash
   git add privacy-policy.html
   git commit -m "Update contact email"
   git push
   ```

---

## Step 6: Use This URL for Bubblewrap

When running Bubblewrap, use your GitHub Pages URL:

```bash
bubblewrap init --manifest https://YOUR-USERNAME.github.io/quest-journal/manifest.json
```

---

## Troubleshooting

### Issue: Page shows 404
**Solution**: Wait 2-5 minutes. GitHub Pages takes time to deploy.

### Issue: Icons don't load
**Solution**: Check that `/icons/` folder is in your repository

### Issue: Manifest not found
**Solution**: Verify `manifest.json` is in the root folder

### Issue: Styles not loading
**Solution**: Ensure all CSS files are in repository

---

## Updating Your App

After making changes:

```bash
# Stage changes
git add .

# Commit with message
git commit -m "Add new feature"

# Push to GitHub
git push

# Wait 1-2 minutes for GitHub Pages to update
```

---

## Custom Domain (Optional)

Want to use your own domain instead of `.github.io`?

1. Buy domain (e.g., Namecheap, Google Domains)
2. In repository Settings → Pages:
   - Enter your custom domain
   - Click "Save"
3. In your domain registrar:
   - Add CNAME record pointing to `YOUR-USERNAME.github.io`
4. Wait for DNS propagation (5-30 minutes)

---

## Free HTTPS ✅

GitHub Pages automatically provides:
- ✅ Free SSL certificate (HTTPS)
- ✅ CDN (fast worldwide)
- ✅ Unlimited bandwidth
- ✅ 99.9% uptime

Perfect for PWAs!

---

## Next Steps

After deploying to GitHub Pages:

1. ✅ Your app is now online!
2. 📸 Take screenshots for Play Store
3. 🤖 Build Android app with Bubblewrap
4. 🏪 Submit to Google Play Store

See `PLAYSTORE-SUBMISSION-GUIDE.md` for complete instructions.

---

## Your URLs

Fill these in after deployment:

- **App URL**: `https://________________________________.github.io/quest-journal/`
- **Privacy Policy**: `https://________________________________.github.io/quest-journal/privacy-policy.html`
- **Manifest**: `https://________________________________.github.io/quest-journal/manifest.json`

---

**That's it! Your app is now live! 🎉⚔️**
