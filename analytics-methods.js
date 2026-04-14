// Lightweight Analytics — local event tracking for key user actions
// All data stays in localStorage; nothing is sent externally.

const _analyticsKey = 'lqj_analytics';
const _analyticsSessionKey = 'lqj_session';
const _MAX_EVENTS = 500; // Rolling cap to keep storage lean

function _getAnalyticsStore() {
    try {
        return JSON.parse(localStorage.getItem(_analyticsKey)) || { events: [], summary: {} };
    } catch { return { events: [], summary: {} }; }
}

function _saveAnalyticsStore(store) {
    try {
        // Trim oldest events if over cap
        if (store.events.length > _MAX_EVENTS) {
            store.events = store.events.slice(-_MAX_EVENTS);
        }
        localStorage.setItem(_analyticsKey, JSON.stringify(store));
    } catch { /* storage full — silently skip */ }
}

// ── Session tracking ─────────────────────────────────────────────
function _initSession() {
    const now = Date.now();
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(_analyticsSessionKey)); } catch {}
    if (!session) {
        session = { id: now.toString(36), start: now, pageviews: 0 };
        sessionStorage.setItem(_analyticsSessionKey, JSON.stringify(session));
        trackEvent('session_start');
    }
    session.pageviews++;
    sessionStorage.setItem(_analyticsSessionKey, JSON.stringify(session));
}

// ── Core tracking function ───────────────────────────────────────
function trackEvent(name, data) {
    const store = _getAnalyticsStore();
    const evt = {
        n: name,
        t: Date.now(),
        d: data || null
    };
    store.events.push(evt);

    // Increment summary counter
    store.summary[name] = (store.summary[name] || 0) + 1;

    _saveAnalyticsStore(store);
}

// ── Query helpers ────────────────────────────────────────────────
function getAnalyticsSummary() {
    return _getAnalyticsStore().summary;
}

function getRecentEvents(count) {
    const store = _getAnalyticsStore();
    return store.events.slice(-(count || 50));
}

function getEventCount(name) {
    return _getAnalyticsStore().summary[name] || 0;
}

function getEventsToday() {
    const store = _getAnalyticsStore();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ts = todayStart.getTime();
    return store.events.filter(e => e.t >= ts);
}

function clearAnalytics() {
    localStorage.removeItem(_analyticsKey);
}

// ── Engagement score (simple heuristic) ──────────────────────────
function getEngagementScore() {
    const today = getEventsToday();
    let score = 0;
    for (const evt of today) {
        switch (evt.n) {
            case 'session_start': score += 5; break;
            case 'task_completed': score += 3; break;
            case 'habit_completed': score += 3; break;
            case 'level_up': score += 10; break;
            case 'boss_defeated': score += 15; break;
            case 'quest_completed': score += 8; break;
            case 'stat_card_shared': score += 5; break;
            case 'referral_sent': score += 10; break;
            case 'app_installed': score += 20; break;
            default: score += 1; break;
        }
    }
    return Math.min(score, 100);
}

// Initialize session on load
_initSession();

// Export for global use
window.trackEvent = trackEvent;
window.getAnalyticsSummary = getAnalyticsSummary;
window.getRecentEvents = getRecentEvents;
window.getEventCount = getEventCount;
window.getEventsToday = getEventsToday;
window.clearAnalytics = clearAnalytics;
window.getEngagementScore = getEngagementScore;
