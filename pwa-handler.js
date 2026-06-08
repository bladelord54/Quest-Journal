// PWA Installation and Service Worker Handler

let deferredPrompt;
let installButton;

// Skip PWA handling entirely inside Capacitor native shell
const _isCapacitorNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

// === Native: clean up any legacy service workers + caches from PWA installs ===
// If a user installed as a PWA before switching to the native app, an old SW can
// keep serving stale assets after APK updates. Unregister and purge caches once.
if (_isCapacitorNative && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length > 0) {
      console.log('[Native] Unregistering', regs.length, 'legacy service worker(s)');
      regs.forEach(r => r.unregister().catch(() => {}));
    }
  }).catch(() => {});
  // Purge any SW caches left behind
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(k => caches.delete(k).catch(() => {}));
    }).catch(() => {});
  }
}

// === Native: detect app version change and clear runtime state if needed ===
// Persists installed app version; if it changes, optionally trigger one-time cleanups.
if (_isCapacitorNative) {
  try {
    const APP_VERSION = '2.5.0';
    const lastVer = localStorage.getItem('appVersion');
    if (lastVer !== APP_VERSION) {
      console.log('[Native] App version changed:', lastVer, '->', APP_VERSION);
      localStorage.setItem('appVersion', APP_VERSION);
      // Reserved for future per-version migrations.
      // Do NOT clear localStorage data here — user data must persist.
    }
  } catch (e) { /* localStorage may be unavailable */ }
}

// === Native: Google Play in-app updates ============================
// Uses @capawesome/capacitor-app-update (Play Core "flexible" flow):
//   1. On app launch, ask Play whether an update is available.
//   2. If yes and a flexible update is allowed, kick off background download
//      (the user keeps using the app while it downloads).
//   3. When the download completes, show a non-blocking toast inviting the
//      user to install — completeFlexibleUpdate() restarts the app to apply.
//
// All calls are wrapped in try/catch. The plugin throws NOT_AVAILABLE when
// the APK was sideloaded (not installed via Play Store) — that must not
// break app startup. Sandbox / debug builds are silently skipped.
//
// Throttled to once per 24h per launch via localStorage, so we don't spam
// the Play Core API or annoy users with repeated download prompts.
if (_isCapacitorNative) {
  const UPDATE_CHECK_KEY = 'lqj_lastUpdateCheck';
  const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

  const showUpdateReadyToast = (onInstall) => {
    // Idempotent — bail if a toast is already up.
    if (document.getElementById('lqj-update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'lqj-update-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:calc(96px + env(safe-area-inset-bottom))',
      'transform:translateX(-50%)',
      'z-index:9999',
      'max-width:92vw',
      'background:linear-gradient(135deg,#1e3a8a,#312e81)',
      'color:#fff',
      'padding:14px 18px',
      'border-radius:12px',
      'border:2px solid #fbbf24',
      'box-shadow:0 10px 40px rgba(0,0,0,0.5)',
      'font-family:inherit',
      'display:flex',
      'align-items:center',
      'gap:12px'
    ].join(';');
    const msg = document.createElement('span');
    msg.style.cssText = 'flex:1;font-size:14px;line-height:1.3;';
    msg.textContent = '✨ Update downloaded — restart to install';
    const btn = document.createElement('button');
    btn.textContent = 'Install';
    btn.style.cssText = 'background:#fbbf24;color:#1e293b;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;';
    btn.addEventListener('click', () => {
      toast.remove();
      try { onInstall(); } catch (e) { console.warn('[AppUpdate] completeFlexibleUpdate failed:', e); }
    });
    const dismiss = document.createElement('button');
    dismiss.textContent = '✕';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.style.cssText = 'background:transparent;color:#fff;border:none;font-size:18px;cursor:pointer;opacity:0.7;padding:0 4px;';
    dismiss.addEventListener('click', () => toast.remove());
    toast.appendChild(msg);
    toast.appendChild(btn);
    toast.appendChild(dismiss);
    document.body.appendChild(toast);
  };

  const tryFlexibleUpdate = async () => {
    const AppUpdate = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppUpdate;
    if (!AppUpdate) {
      console.log('[AppUpdate] Plugin not registered (likely a non-Android build)');
      return;
    }

    // 24h throttle so we don't pester Play Core on every cold start.
    let lastCheck = 0;
    try { lastCheck = parseInt(localStorage.getItem(UPDATE_CHECK_KEY) || '0', 10) || 0; } catch (e) {}
    if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
      return;
    }

    let info;
    try {
      info = await AppUpdate.getAppUpdateInfo();
    } catch (e) {
      // NOT_AVAILABLE is expected for sideloaded / internal builds — silent skip.
      console.log('[AppUpdate] getAppUpdateInfo unavailable:', e && e.message);
      return;
    }

    try { localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now())); } catch (e) {}

    // AppUpdateAvailability.UPDATE_AVAILABLE === 2
    if (!info || info.updateAvailability !== 2) return;
    if (!info.flexibleUpdateAllowed) {
      // Edge case: developer-mandated immediate-only update (rare).
      // Fall back to opening the Play Store listing.
      if (info.immediateUpdateAllowed) {
        try { await AppUpdate.performImmediateUpdate(); } catch (e) {
          console.warn('[AppUpdate] performImmediateUpdate failed:', e);
        }
      }
      return;
    }

    // Listen for download completion BEFORE starting the update.
    // FlexibleUpdateInstallStatus.DOWNLOADED === 11
    try {
      await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
        if (state && state.installStatus === 11) {
          showUpdateReadyToast(() => AppUpdate.completeFlexibleUpdate());
        }
      });
    } catch (e) {
      console.warn('[AppUpdate] addListener failed:', e);
    }

    try {
      await AppUpdate.startFlexibleUpdate();
      console.log('[AppUpdate] Flexible update started — downloading in background');
    } catch (e) {
      console.warn('[AppUpdate] startFlexibleUpdate failed:', e);
    }
  };

  // Defer until after first paint so the update check never blocks startup.
  // 4s gives the app time to render and is generous enough that Play Core's
  // first call doesn't compete with goal-manager hydration.
  window.addEventListener('load', () => {
    setTimeout(() => { tryFlexibleUpdate(); }, 4000);
  });

  // Also re-check when the app returns to foreground after >= 24h.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => { tryFlexibleUpdate(); }, 1500);
    }
  });
}

// Register Service Worker (not needed in native — assets load from APK)
if ('serviceWorker' in navigator && !_isCapacitorNative) {
  let refreshing = false;

  // Auto-reload when a new SW takes control (ensures users see latest version)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    // Flush any pending debounced save before reloading to prevent data loss
    if (typeof goalManager !== 'undefined' && goalManager.saveTimeout) {
      clearTimeout(goalManager.saveTimeout);
      goalManager._doSave();
    }
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        
        // Check for updates periodically (30 min) and on foreground
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Handle install prompt (not applicable in native app)
if (_isCapacitorNative) {
  // No install prompt or appinstalled events in native — skip all PWA install logic
  window.installPWA = function() {};
} else {

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar
  e.preventDefault();
  
  // Store the event for later use
  deferredPrompt = e;
  
  // Show static FAB as fallback
  showInstallButton();
});

// Show install button in UI
function showInstallButton() {
  installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.classList.remove('hidden');
  }
}

// Handle install button click
function installPWA() {
  if (!deferredPrompt) {
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond
  deferredPrompt.userChoice.then(() => {
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Hide install button
    if (installButton) {
      installButton.classList.add('hidden');
    }
  });
}

// Check if app is already installed
window.addEventListener('appinstalled', () => {
  // Hide install button
  if (installButton) {
    installButton.classList.add('hidden');
  }
  
  // Show success message
  if (typeof goalManager !== 'undefined' && goalManager.showAchievement) {
    goalManager.showAchievement('📱 Life Quest Journal installed! Welcome, hero!', 'yearly');
  }

  // Track the install
  if (typeof trackEvent === 'function') trackEvent('app_installed');
});

// Export functions for use in HTML and goal-manager.js
window.installPWA = installPWA;

} // end else (!_isCapacitorNative)
