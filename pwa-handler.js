// PWA Installation and Service Worker Handler

let deferredPrompt;
let installButton;

// Register Service Worker
if ('serviceWorker' in navigator) {
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

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar
  e.preventDefault();
  
  // Store the event for later use
  deferredPrompt = e;
  
  // Show custom install button
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
});

// Export install function for use in HTML
window.installPWA = installPWA;
