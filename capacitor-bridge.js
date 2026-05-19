/**
 * Capacitor Native Bridge
 * Detects native vs. web environment and wraps plugin calls with fallbacks.
 * In a browser/PWA context, all methods gracefully fall back to web APIs.
 *
 * NOTE: Plugins are accessed via window.Capacitor.Plugins — NOT via import().
 * Dynamic import() does not work without a bundler (Webpack/Vite).
 * Capacitor injects all registered plugins onto window.Capacitor.Plugins automatically.
 */

const CapBridge = {
    _isNative: null,

    /** True when running inside a Capacitor native shell */
    get isNative() {
        if (this._isNative === null) {
            this._isNative = typeof window !== 'undefined' &&
                window.Capacitor !== undefined &&
                window.Capacitor.isNativePlatform !== undefined &&
                window.Capacitor.isNativePlatform();
        }
        return this._isNative;
    },

    /** Safely get a plugin from Capacitor's global registry */
    _p(name) {
        return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name] || null;
    },

    // ── In-App Review ────────────────────────────────────────────────
    async requestReview() {
        if (this.isNative) {
            try {
                const plugin = this._p('InAppReview');
                if (plugin) {
                    await plugin.requestReview();
                    return { native: true };
                }
            } catch (e) {
                console.warn('[CapBridge] Native review failed, falling back:', e);
            }
        }
        window.open('https://play.google.com/store/apps/details?id=com.lifequestjournal.app', '_blank');
        return { native: false };
    },


    // ── Status Bar ───────────────────────────────────────────────────
    async styleStatusBar() {
        if (!this.isNative) return;
        try {
            const sb = this._p('StatusBar');
            if (sb) {
                await sb.setStyle({ style: 'DARK' });
                await sb.setBackgroundColor({ color: '#1c1917' });
            }
        } catch (e) {
            console.warn('[CapBridge] StatusBar styling failed:', e);
        }
    },

    // ── Local Notifications ──────────────────────────────────────────
    async scheduleNotification(opts) {
        if (this.isNative) {
            try {
                const ln = this._p('LocalNotifications');
                if (ln) {
                    const perm = await ln.requestPermissions();
                    if (perm.display === 'granted') {
                        await ln.schedule({
                            notifications: [{
                                id: opts.id || Math.floor(Math.random() * 100000),
                                title: opts.title,
                                body: opts.body,
                                schedule: opts.scheduleAt ? { at: opts.scheduleAt } : undefined,
                                smallIcon: 'ic_notification',
                                iconColor: '#fbbf24'
                            }]
                        });
                        return { scheduled: true, native: true };
                    }
                }
            } catch (e) {
                console.warn('[CapBridge] Native notification failed:', e);
            }
        }

        // Web fallback
        if ('Notification' in window && Notification.permission === 'granted') {
            if (opts.scheduleAt) {
                const delay = opts.scheduleAt.getTime() - Date.now();
                if (delay > 0) {
                    setTimeout(() => {
                        new Notification(opts.title, { body: opts.body, icon: opts.icon || './icons/icon-192x192.png' });
                    }, delay);
                }
            } else {
                new Notification(opts.title, { body: opts.body, icon: opts.icon || './icons/icon-192x192.png' });
            }
            return { scheduled: true, native: false };
        }

        return { scheduled: false, native: false };
    },

    // ── File Export (Share) ──────────────────────────────────────────
    async shareFile(fileName, content, mimeType) {
        // Web Share API with File objects (works on Android WebView 93+)
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([content], fileName, { type: mimeType });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Quest Journal Backup',
                        files: [file]
                    });
                    return { shared: true, native: false };
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    return { shared: true, native: false }; // User cancelled, still "handled"
                }
                console.warn('[CapBridge] Web Share with file failed:', e);
            }
        }

        // Native Share plugin fallback (shares as text if file sharing unavailable)
        if (this.isNative) {
            try {
                const share = this._p('Share');
                if (share) {
                    await share.share({
                        title: fileName,
                        text: content,
                        dialogTitle: 'Export Quest Data'
                    });
                    return { shared: true, native: true };
                }
            } catch (e) {
                console.warn('[CapBridge] Native share failed:', e);
            }
        }

        // Final fallback: blob download (works in desktop browsers)
        return { shared: false, native: false };
    },

    // ── Splash Screen ────────────────────────────────────────────────
    async hideSplash() {
        if (!this.isNative) return;
        try {
            const splash = this._p('SplashScreen');
            if (splash) await splash.hide();
        } catch (e) {
            console.warn('[CapBridge] SplashScreen hide failed:', e);
        }
    },

};

// Expose globally
window.CapBridge = CapBridge;
