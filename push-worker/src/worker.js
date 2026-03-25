// Quest Push Worker - Cloudflare Worker for Web Push notifications
// Sends wake-up pushes at scheduled reminder times so the Service Worker
// can show notifications even when the app is closed.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ==================== Base64URL Helpers ====================

function base64urlEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ==================== VAPID Authentication ====================

let vapidKeyCache = null;

async function getVapidSigningKey(env) {
  if (vapidKeyCache) return vapidKeyCache;

  const publicKeyBytes = base64urlDecode(env.VAPID_PUBLIC_KEY);
  // Uncompressed P-256 point: 0x04 || x (32 bytes) || y (32 bytes)
  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));

  vapidKeyCache = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: env.VAPID_PRIVATE_KEY },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  return vapidKeyCache;
}

async function createVapidJWT(audience, subject, privateKey) {
  const encoder = new TextEncoder();
  const header = base64urlEncode(
    encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  );
  const payload = base64urlEncode(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600, // 12 hours
        sub: subject,
      })
    )
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(signingInput)
  );

  return `${signingInput}.${base64urlEncode(signature)}`;
}

// Send a no-payload push (just wakes up the Service Worker)
async function sendPushToSubscription(subscription, env) {
  const key = await getVapidSigningKey(env);
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJWT(audience, env.VAPID_SUBJECT, key);

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
      TTL: '300',
      'Content-Length': '0',
      Urgency: 'normal',
    },
  });
}

// ==================== Helpers ====================

async function hashEndpoint(endpoint) {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(hashBuffer).substring(0, 32);
}

function getSubscriberLocalTime(timezoneName, timezoneOffset) {
  // Prefer IANA timezone name (DST-aware) over static numeric offset
  if (timezoneName) {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezoneName,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const get = (type) => parts.find(p => p.type === type)?.value || '0';
      // Build a Date whose UTC fields represent the subscriber's local time
      return new Date(Date.UTC(
        parseInt(get('year')),
        parseInt(get('month')) - 1,
        parseInt(get('day')),
        parseInt(get('hour')),
        parseInt(get('minute')),
        parseInt(get('second'))
      ));
    } catch (_) {
      // Fall through to numeric offset
    }
  }
  // Fallback: static numeric offset (not DST-aware)
  // timezoneOffset = minutes east of UTC (e.g., -420 for UTC-7)
  return new Date(Date.now() + (timezoneOffset || 0) * 60 * 1000);
}

function getLocalDateString(localTime) {
  const y = localTime.getUTCFullYear();
  const m = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWithinWindow(currentMins, targetTime, windowMinutes) {
  const [h, m] = targetTime.split(':').map(Number);
  const target = h * 60 + m;
  return currentMins >= target && currentMins < target + windowMinutes;
}

// ==================== Route Handlers ====================

async function handleSubscribe(request, env) {
  const body = await request.json();
  const { subscription, timezoneOffset, timezoneName, reminderSettings } = body;

  if (!subscription || !subscription.endpoint) {
    return jsonResponse({ error: 'Missing subscription' }, 400);
  }

  const keyHash = await hashEndpoint(subscription.endpoint);
  const key = `sub:${keyHash}`;

  // Preserve lastPushed* from existing entry so frequent re-syncs don't wipe dedup
  let existing = null;
  try {
    const raw = await env.PUSH_SUBS.get(key);
    if (raw) existing = JSON.parse(raw);
  } catch (_) { /* ignore */ }

  const data = {
    subscription,
    timezoneOffset: timezoneOffset || 0,
    timezoneName: timezoneName || existing?.timezoneName || null,
    morningTime: reminderSettings?.morningTime || '09:00',
    eveningTime: reminderSettings?.eveningTime || '18:00',
    morningEnabled: reminderSettings?.morningReminder !== false,
    eveningEnabled: reminderSettings?.eveningReminder !== false,
    enabled: reminderSettings?.enabled !== false,
    lastPushedMorning: existing?.lastPushedMorning || null,
    lastPushedEvening: existing?.lastPushedEvening || null,
    updatedAt: Date.now(),
  };

  await env.PUSH_SUBS.put(key, JSON.stringify(data));
  return jsonResponse({ success: true });
}

async function handleUnsubscribe(request, env) {
  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return jsonResponse({ error: 'Missing endpoint' }, 400);
  }

  const keyHash = await hashEndpoint(endpoint);
  await env.PUSH_SUBS.delete(`sub:${keyHash}`);
  return jsonResponse({ success: true });
}

// ==================== Cron: Send Wake-Up Pushes ====================

async function sendWakeUpPushes(env) {
  // Push window: if current local time is within WINDOW_MINUTES after reminder time
  const WINDOW_MINUTES = 10;
  let cursor = null;
  let totalSent = 0;
  let totalSkipped = 0;
  let totalExpired = 0;

  do {
    const list = await env.PUSH_SUBS.list({
      prefix: 'sub:',
      limit: 100,
      cursor,
    });

    const promises = list.keys.map(async (keyObj) => {
      try {
        const raw = await env.PUSH_SUBS.get(keyObj.name);
        if (!raw) return 'skipped';

        const data = JSON.parse(raw);
        if (!data.enabled || !data.subscription) return 'skipped';

        // Calculate subscriber's local time
        const localTime = getSubscriberLocalTime(data.timezoneName, data.timezoneOffset);
        const localMins =
          localTime.getUTCHours() * 60 + localTime.getUTCMinutes();
        const today = getLocalDateString(localTime);

        let shouldPush = false;
        let pushType = null;

        // Check morning reminder
        if (data.morningEnabled && data.lastPushedMorning !== today) {
          if (isWithinWindow(localMins, data.morningTime, WINDOW_MINUTES)) {
            shouldPush = true;
            pushType = 'morning';
          }
        }

        // Check evening reminder
        if (
          !shouldPush &&
          data.eveningEnabled &&
          data.lastPushedEvening !== today
        ) {
          if (isWithinWindow(localMins, data.eveningTime, WINDOW_MINUTES)) {
            shouldPush = true;
            pushType = 'evening';
          }
        }

        if (!shouldPush) return 'skipped';

        // Send push
        const response = await sendPushToSubscription(data.subscription, env);

        if (response.status === 201 || response.status === 200) {
          // Mark as pushed for today
          if (pushType === 'morning') data.lastPushedMorning = today;
          else data.lastPushedEvening = today;
          await env.PUSH_SUBS.put(keyObj.name, JSON.stringify(data));
          return 'sent';
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired — clean up
          await env.PUSH_SUBS.delete(keyObj.name);
          return 'expired';
        } else {
          console.log(
            `Push failed for ${keyObj.name}: ${response.status} ${response.statusText}`
          );
          return 'skipped';
        }
      } catch (e) {
        console.error(`Error processing ${keyObj.name}:`, e);
        return 'skipped';
      }
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r === 'sent') totalSent++;
      else if (r === 'expired') totalExpired++;
      else totalSkipped++;
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  console.log(
    `Push cron complete: ${totalSent} sent, ${totalSkipped} skipped, ${totalExpired} expired`
  );
}

// ==================== Worker Entry ====================

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/api/subscribe':
          if (request.method !== 'POST')
            return jsonResponse({ error: 'Method not allowed' }, 405);
          return await handleSubscribe(request, env);

        case '/api/unsubscribe':
          if (request.method !== 'POST')
            return jsonResponse({ error: 'Method not allowed' }, 405);
          return await handleUnsubscribe(request, env);

        case '/api/health':
          return jsonResponse({ status: 'ok', timestamp: Date.now() });

        default:
          return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (e) {
      console.error('Worker error:', e);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },

  async scheduled(event, env) {
    await sendWakeUpPushes(env);
  },
};
