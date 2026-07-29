// @ts-check
'use strict';
/**
 * reminder-render.js - pure Reminder-settings presentation builder (Engineering Roadmap #1).
 *
 * The TWENTY-SECOND render module, and the LAST tab-render surface: this completes item #1's
 * render burn-down (no inline render-view builders remain on the God class). One builder:
 *   - renderReminderSettingsHTML({ settings, notificationsEnabled, isNative, notificationSupported,
 *       permissionDenied })
 *       the #reminder-settings-container body (Tools -> Reminders). A master "Enable Reminders"
 *       toggle; when settings.enabled, the morning / evening / overdue / streak / bounty rows (each a
 *       data-action="reminder.toggle" switch; the timed ones carry an <input type=time>), else a
 *       "configure times" hint; then the status footer - an Enabled / Blocked / Not-Enabled /
 *       Not-Supported label, a native-only delivery row, and the enable / guide / test button.
 *
 * PURE. The renderReminderSettings wrapper keeps the getElementById lookup + guard AND the permission
 * re-check that MUTATES this.notificationsEnabled (native plugin state vs Notification.permission vs the
 * notificationsConfirmedWorking localStorage fallback), then passes the five resolved flags in. The time
 * <input>s keep their inline onchange="goalManager.updateReminderSettings(...)" handlers verbatim (a
 * global ref, not a data-action) - faithful markup, no behaviour change.
 *
 * Dual-environment, no bundler (mirrors the other render modules):
 *   - Browser: plain <script> BEFORE goal-manager.js; attaches window.REMINDER_RENDER.
 *   - Jest/Node: require('./reminder-render.js') returns the frozen builder via module.exports.
 */
(function () {
    /**
     * @param {{
     *   settings: { enabled: boolean, morningTime: string, morningReminder: boolean, eveningTime: string,
     *     eveningReminder: boolean, overdueAlert: boolean, streakReminderTime: string, streakReminder: boolean,
     *     bountyReminderTime: string, bountyReminder: boolean },
     *   notificationsEnabled: boolean, isNative: boolean, notificationSupported: boolean, permissionDenied: boolean
     * }} state
     * @returns {string}
     */
    function renderReminderSettingsHTML({ settings, notificationsEnabled, isNative, notificationSupported, permissionDenied }) {
        // Build notification status section based on native vs web
        let notifStatusLabel = '';
        if (notificationsEnabled) {
            notifStatusLabel = '<span class="text-green-400">✓ Enabled</span>';
        } else if (isNative) {
            notifStatusLabel = '<span class="text-red-400">○ Not Enabled</span>';
        } else if (notificationSupported) {
            notifStatusLabel = permissionDenied 
                ? '<span class="text-red-400">✗ Blocked</span>' 
                : '<span class="text-red-400">○ Not Enabled</span>';
        } else {
            notifStatusLabel = '<span class="text-red-400">✗ Not Supported</span>';
        }
        
        // Delivery method row (native only — web/PWA service-worker delivery retired)
        const deliveryRow = isNative 
            ? `<div class="flex items-center justify-between text-sm mt-1">
                    <span class="text-amber-300/70">Delivery:</span>
                    <span class="text-green-400">✓ Native</span>
               </div>`
            : '';
        
        // Enable button section when not enabled
        let enableSection = '';
        if (!notificationsEnabled) {
            if (isNative) {
                enableSection = `
                    <button data-action="reminder.enable"
                        class="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded text-sm fancy-font">
                        Enable Notifications
                    </button>
                    <p class="text-amber-400/60 text-xs mt-2 text-center">If the prompt doesn't appear, open your device's Settings > Apps > Life Quest Journal > Notifications and enable them.</p>
                `;
            } else if (notificationSupported && permissionDenied) {
                enableSection = `
                    <button data-action="reminder.guide"
                        class="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-2.5 rounded-lg text-sm fancy-font flex items-center justify-center gap-2">
                        <i class="ri-settings-3-line"></i> How to Enable Notifications
                    </button>
                    <p class="text-red-400/80 text-xs mt-2 text-center">Notifications are blocked. Tap above for step-by-step instructions.</p>
                `;
            } else {
                enableSection = `
                    <button data-action="reminder.enable"
                        class="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded text-sm fancy-font">
                        Enable Notifications
                    </button>
                `;
            }
        } else {
            enableSection = `
                <button data-action="reminder.test"
                    class="w-full mt-2 bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded text-sm fancy-font">
                    🔔 Send Test Notification
                </button>
                <p class="text-amber-400/60 text-xs mt-1 text-center">If no notification appears, check that notifications are enabled in your device's app settings.</p>
            `;
        }
        
        return `
            <div class="space-y-4">
                <!-- Master Toggle -->
                <div class="flex items-center justify-between">
                    <span class="text-amber-200 fancy-font">Enable Reminders</span>
                    <button data-action="reminder.toggle" data-setting="enabled"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.enabled ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.enabled ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                
                ${settings.enabled ? `
                <!-- Morning Reminder -->
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-amber-200 fancy-font text-sm whitespace-nowrap">🌅 Morning</span>
                        <input type="time" value="${settings.morningTime}" 
                            onchange="goalManager.updateReminderSettings('morningTime', this.value)"
                            class="bg-amber-900/50 text-white rounded border border-amber-600" style="padding:2px 6px;font-size:12px;width:5.5rem">
                    </div>
                    <button data-action="reminder.toggle" data-setting="morningReminder"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.morningReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.morningReminder ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                
                <!-- Evening Reminder -->
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-amber-200 fancy-font text-sm whitespace-nowrap">🌆 Evening</span>
                        <input type="time" value="${settings.eveningTime}" 
                            onchange="goalManager.updateReminderSettings('eveningTime', this.value)"
                            class="bg-amber-900/50 text-white rounded border border-amber-600" style="padding:2px 6px;font-size:12px;width:5.5rem">
                    </div>
                    <button data-action="reminder.toggle" data-setting="eveningReminder"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.eveningReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.eveningReminder ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                
                <!-- Overdue Alert -->
                <div class="flex items-center justify-between gap-3">
                    <span class="text-amber-200 fancy-font text-sm">⚠️ Overdue Alerts</span>
                    <button data-action="reminder.toggle" data-setting="overdueAlert"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.overdueAlert ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.overdueAlert ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                
                <!-- Streak-Risk Reminder -->
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-amber-200 fancy-font text-sm whitespace-nowrap">🔥 Streak Saver</span>
                        <input type="time" value="${settings.streakReminderTime}" 
                            onchange="goalManager.updateReminderSettings('streakReminderTime', this.value)"
                            class="bg-amber-900/50 text-white rounded border border-amber-600" style="padding:2px 6px;font-size:12px;width:5.5rem">
                    </div>
                    <button data-action="reminder.toggle" data-setting="streakReminder"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.streakReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.streakReminder ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                <p class="text-amber-400/50 text-xs -mt-2">Reminds you before your daily login streak breaks at midnight (only on days you haven't opened the app).</p>

                <!-- Royal Bounty Ready Reminder -->
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-amber-200 fancy-font text-sm whitespace-nowrap">👑 Bounty Reminder</span>
                        <input type="time" value="${settings.bountyReminderTime}"
                            onchange="goalManager.updateReminderSettings('bountyReminderTime', this.value)"
                            class="bg-amber-900/50 text-white rounded border border-amber-600" style="padding:2px 6px;font-size:12px;width:5.5rem">
                    </div>
                    <button data-action="reminder.toggle" data-setting="bountyReminder"
                        style="width:56px;height:32px;flex-shrink:0" class="rounded-full transition-all duration-200 ${settings.bountyReminder ? 'bg-green-600' : 'bg-gray-600'} relative">
                        <span style="width:24px;height:24px;top:4px;${settings.bountyReminder ? 'left:28px' : 'left:4px'}" class="absolute bg-white rounded-full transition-all duration-200 shadow"></span>
                    </button>
                </div>
                <p class="text-amber-400/50 text-xs -mt-2">Nudges you to finish an active Royal Bounty for its free chest before the window closes.</p>
                ` : '<p class="text-gray-400 text-sm text-center">Enable reminders to configure notification times</p>'}
                
                <!-- Notification Status -->
                <div class="mt-4 pt-4 border-t border-amber-700/50">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-amber-300/70">Notifications:</span>
                        ${notifStatusLabel}
                    </div>
                    ${deliveryRow}
                    ${enableSection}
                </div>
            </div>
        `;
    }

    const REMINDER_RENDER = Object.freeze({ renderReminderSettingsHTML });

    // Browser (window / globalThis) - cast to `any` so checkJs doesn't flag the
    // dynamic REMINDER_RENDER property on the global object.
    const root = /** @type {any} */ (
        typeof window !== 'undefined' ? window
        : (typeof globalThis !== 'undefined' ? globalThis : null)
    );
    if (root) root.REMINDER_RENDER = REMINDER_RENDER;

    // Node / Jest
    if (typeof module !== 'undefined' && module.exports) module.exports = REMINDER_RENDER;
})();
