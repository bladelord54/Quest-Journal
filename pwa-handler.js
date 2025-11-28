// PWA Installation and Service Worker Handler

let deferredPrompt;
let installButton;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(error => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 Install prompt available');
  
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
    console.log('❌ No install prompt available');
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }
    
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
  console.log('✅ PWA was installed successfully');
  
  // Hide install button
  if (installButton) {
    installButton.classList.add('hidden');
  }
  
  // Show success message
  if (typeof goalManager !== 'undefined' && goalManager.showAchievement) {
    goalManager.showAchievement('📱 Quest Journal installed! Welcome, hero!', 'yearly');
  }
});

// Detect if running as installed PWA
function isRunningStandalone() {
  return (window.matchMedia('(display-mode: standalone)').matches) || 
         (window.navigator.standalone) || 
         document.referrer.includes('android-app://');
}

// Show special message if running as PWA
if (isRunningStandalone()) {
  console.log('🎮 Running as installed PWA');
}

// Export install function for use in HTML
window.installPWA = installPWA;
