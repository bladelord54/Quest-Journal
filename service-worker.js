const CACHE_NAME = 'life-quest-journal-v220';
const LAZY_CACHE_NAME = 'life-quest-journal-lazy-v220';
// Local files: must all succeed or install fails (a missing local file = real bug)
const localUrlsToCache = [
  './',
  './index.html',
  './goal-manager.js',
  './audio-manager.js',
  './mobile-touch.js',
  './pwa-handler.js',
  './styles.css',
  './dark-mode.css',
  './animations.css',
  './mobile.css',
  './themes.css',
  './manifest.json',
  // Small particle/icon assets (safe to cache at install)
  './icons/coin.gif',
  './icons/leaf.gif',
  './icons/snow.gif',
  './icons/shine.gif',
  './icons/badge-96.png',
  './icons/badge-192.png',
  // Sound files (only files that exist on disk)
  './sounds/achievement-daily.wav',
  './sounds/achievement-weekly.wav',
  './sounds/achievement-monthly.wav',
  './sounds/achievement-yearly.wav',
  './sounds/achievement-life.wav',
  './sounds/spells.mp3',
  './sounds/notification.wav',
  './sounds/level-up.wav',
  './sounds/crystal-earn.wav',
  './sounds/boss-damage.mp3',
  './sounds/boss-defeated.mp3'
];

// CDN files: best-effort caching — failure must NOT block SW install/activation
const cdnUrlsToCache = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=Uncial+Antiqua&display=swap'
];

// Large assets cached lazily on first use (theme backgrounds, etc.)
const lazyAssets = [
  './icons/forest-bg.gif',
  './icons/desert-bg.gif',
  './icons/ice-bg.gif',
  './icons/volcanic-bg.gif',
  './icons/volcanic-bg.mp4',
  './icons/mystic-bg.gif',
  './icons/golden-bg.gif',
  './icons/shadow-bg.gif'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache local files (must succeed)
        const localPromise = cache.addAll(localUrlsToCache);
        
        // Cache CDN files individually — failures are logged but don't block install
        const cdnPromise = Promise.all(
          cdnUrlsToCache.map(url =>
            fetch(url).then(response => {
              if (response.ok) return cache.put(url, response);
            }).catch(err => console.warn('[SW] CDN cache skipped:', url, err.message))
          )
        );
        
        return Promise.all([localPromise, cdnPromise]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== LAZY_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Piggyback: check reminders on fetch activity (throttled)
  maybeCheckReminders();
  
  const url = new URL(event.request.url);

  // Determine if this is a lazy-cacheable asset (large theme backgrounds)
  const isLazyAsset = lazyAssets.some(asset => url.pathname.endsWith(asset.replace('./', '')));

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Put lazy assets in the lazy cache, everything else in the main cache
          const targetCache = isLazyAsset ? LAZY_CACHE_NAME : CACHE_NAME;
          caches.open(targetCache)
            .then(cache => {
              if (event.request.url.indexOf('http') === 0) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        }).catch(() => {
          // Network failed, try to serve offline page if available
          return caches.match('./index.html');
        });
      })
  );
});

// ==================== PERSISTENT REMINDER SYSTEM ====================
// Uses Cache API for persistent storage (survives SW termination).
// Checks reminders on fetch events (piggyback), periodicsync, and messages.

const REMINDER_CACHE = 'quest-reminders-data';
let lastReminderCheck = 0; // Throttle: check at most once per 5 minutes

// Save reminder data to Cache API (persistent, accessible from SW)
async function saveReminderData(data) {
  try {
    const cache = await caches.open(REMINDER_CACHE);
    const response = new Response(JSON.stringify(data));
    await cache.put('reminder-data', response);
  } catch (e) { /* cache write failed, not critical */ }
}

// Load reminder data from Cache API
async function loadReminderData() {
  try {
    const cache = await caches.open(REMINDER_CACHE);
    const response = await cache.match('reminder-data');
    if (response) return await response.json();
  } catch (e) { /* cache read failed */ }
  return null;
}

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Receive reminder settings and task counts from the app — persist to Cache API
  if (event.data && event.data.type === 'SYNC_REMINDERS') {
    event.waitUntil((async () => {
      const existing = await loadReminderData() || {};
      await saveReminderData({
        ...existing,
        settings: event.data.settings,
        taskCounts: event.data.taskCounts,
        lastSync: Date.now()
      });
      // Also run a reminder check immediately after sync
      await checkAndSendReminders();
    })());
  }
});

// Handle notification click - open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(event.notification.data?.url || './');
    })
  );
});

// Periodic Background Sync - fires even when app is closed (Android Chrome)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndSendReminders());
  }
});

// Piggyback reminder check on fetch events (throttled to once per 5 minutes)
// This is the most reliable way to check reminders since fetch fires whenever
// the browser makes ANY request while the SW is active
function maybeCheckReminders() {
  const now = Date.now();
  if (now - lastReminderCheck < 5 * 60 * 1000) return; // Throttle: 5 min
  lastReminderCheck = now;
  checkAndSendReminders().catch(() => {});
}

// Check if any reminders should fire based on persistently stored settings
async function checkAndSendReminders() {
  const data = await loadReminderData();
  if (!data || !data.settings || !data.settings.enabled) return;
  
  const settings = data.settings;
  const counts = data.taskCounts || { todayTasks: 0, incompleteHabits: 0, overdueTasks: 0 };
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMins = now.getHours() * 60 + now.getMinutes();
  
  // Track which reminders were already sent today (avoid duplicates)
  const sentToday = data.sentToday || {};
  let updated = false;
  
  // Reset tracking if it's a new day
  if (sentToday._date !== today) {
    sentToday._date = today;
    sentToday.morning = false;
    sentToday.evening = false;
    updated = true;
  }
  
  // Check morning reminder
  if (settings.morningReminder && !sentToday.morning) {
    const [th, tm] = settings.morningTime.split(':').map(Number);
    const targetMins = th * 60 + tm;
    // Fire if we're past the reminder time (within a 2-hour catch-up window)
    if (currentMins >= targetMins && currentMins < targetMins + 120) {
      await sendReminderNotification('morning', counts);
      sentToday.morning = true;
      updated = true;
    }
  }
  
  // Check evening reminder
  if (settings.eveningReminder && !sentToday.evening) {
    const [th, tm] = settings.eveningTime.split(':').map(Number);
    const targetMins = th * 60 + tm;
    if (currentMins >= targetMins && currentMins < targetMins + 120) {
      await sendReminderNotification('evening', counts);
      sentToday.evening = true;
      updated = true;
    }
  }
  
  // Save updated tracking data
  if (updated) {
    await saveReminderData({ ...data, sentToday });
  }
}

async function sendReminderNotification(type, counts) {
  let title, body;
  if (type === 'morning') {
    title = '🌅 Good Morning, Adventurer!';
    body = '';
    if (counts.todayTasks > 0) body += `📋 ${counts.todayTasks} task${counts.todayTasks !== 1 ? 's' : ''} for today`;
    if (counts.incompleteHabits > 0) body += (body ? ' • ' : '') + `🔄 ${counts.incompleteHabits} habit${counts.incompleteHabits !== 1 ? 's' : ''} to complete`;
    if (!body) body = 'Ready for a new day of quests!';
  } else {
    title = '🌙 Evening Quest Report';
    body = '';
    if (counts.todayTasks > 0) body += `📋 ${counts.todayTasks} task${counts.todayTasks !== 1 ? 's' : ''} remaining`;
    if (counts.overdueTasks > 0) body += (body ? ' • ' : '') + `⚠️ ${counts.overdueTasks} overdue`;
    if (!body) body = 'All quests completed! Well done!';
  }
  
  try {
    return await self.registration.showNotification(title, {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/badge-96.png',
      tag: 'quest-reminder-' + type,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: './' }
    });
  } catch (e) {
    // Notification permission may not be granted — nothing we can do from SW
  }
}
