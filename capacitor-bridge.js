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
    // v2.7.1 (Jun 2, 2026): accepts an optional `{ color, style }` override
    // so callers can re-tint the system status bar to match the active
    // color theme. Without an override, the previous behavior is preserved
    // (#1c1917 stone-dark + DARK style for the boot/default theme). Now
    // invoked from `applyColorTheme()` on every theme switch so the status
    // bar blends with each theme's gradient — specifically fixes the harsh
    // dark band that golden-empire's bright bokeh video exposed at the top
    // of the viewport. Style stays `'DARK'` (Capacitor terminology for
    // "dark background, light icons") since every supported theme is dark.
    async styleStatusBar(opts = {}) {
        if (!this.isNative) return;
        const color = opts.color || '#1c1917';
        const style = opts.style || 'DARK';
        try {
            const sb = this._p('StatusBar');
            if (sb) {
                await sb.setStyle({ style });
                await sb.setBackgroundColor({ color });
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

    /**
     * Cancel a previously scheduled native notification by id. Used to
     * call off a pre-scheduled streak-risk reminder once the user opens
     * the app (which auto-claims the day's login bonus, making the streak
     * safe). No-op on web — the web path relies on the service worker,
     * which re-evaluates the streak state at fire time.
     */
    async cancelNotification(id) {
        if (!this.isNative || id == null) return { cancelled: false };
        try {
            const ln = this._p('LocalNotifications');
            if (ln) {
                await ln.cancel({ notifications: [{ id }] });
                return { cancelled: true, native: true };
            }
        } catch (e) {
            console.warn('[CapBridge] cancelNotification failed:', e);
        }
        return { cancelled: false };
    },

    // ── File Save (to user-visible storage) ──────────────────────────
    /**
     * v2.7 — Write a text file directly into the device's Documents
     * folder so it appears in the system Files app. Users reported
     * the export flow only surfaced the share sheet, with no obvious
     * way to actually save the backup to their phone. This method
     * gives them a true "Save to Phone" path. Returns the absolute
     * URI (when available) so the caller can show it in a toast.
     *
     * Only meaningful on native; on web it returns { saved: false }
     * so the caller can fall back to the existing blob-download path.
     */
    async saveFileToDevice(fileName, content) {
        if (!this.isNative) return { saved: false, native: false };
        try {
            const fs = this._p('Filesystem');
            if (!fs) return { saved: false, native: true };
            const base64 = (typeof btoa === 'function')
                ? btoa(unescape(encodeURIComponent(content)))
                : Buffer.from(content, 'utf-8').toString('base64');
            // Directory.Documents → /storage/emulated/0/Documents on
            // Android, visible immediately in the Files app. `recursive`
            // ensures any nested subpath in `fileName` is created.
            const writeResult = await fs.writeFile({
                path: fileName,
                data: base64,
                directory: 'DOCUMENTS',
                recursive: true
            });
            return {
                saved: true,
                native: true,
                uri: writeResult && writeResult.uri,
                displayPath: 'Documents/' + fileName
            };
        } catch (e) {
            console.warn('[CapBridge] saveFileToDevice failed:', e);
            return { saved: false, native: true, error: e && e.message };
        }
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

        // Native: write file to cache dir, then share the file URI
        if (this.isNative) {
            try {
                const fs = this._p('Filesystem');
                const share = this._p('Share');
                if (fs && share) {
                    // Encode content to base64 for Filesystem.writeFile
                    const base64 = (typeof btoa === 'function')
                        ? btoa(unescape(encodeURIComponent(content)))
                        : Buffer.from(content, 'utf-8').toString('base64');
                    const writeResult = await fs.writeFile({
                        path: fileName,
                        data: base64,
                        directory: 'CACHE',
                        recursive: true
                    });
                    const fileUri = writeResult && writeResult.uri;
                    if (fileUri) {
                        await share.share({
                            title: 'Quest Journal Backup',
                            url: fileUri,
                            dialogTitle: 'Export Quest Data'
                        });
                        return { shared: true, native: true };
                    }
                }
            } catch (e) {
                if (e && e.message && /cancel/i.test(e.message)) {
                    return { shared: true, native: true }; // User cancelled
                }
                console.warn('[CapBridge] Native file share failed:', e);
            }
        }

        // Final fallback: blob download (works in desktop browsers)
        return { shared: false, native: false };
    },

    // ── External URL ─────────────────────────────────────────────────
    /** Open a URL in the system browser (works in Capacitor native and web) */
    async openUrl(url) {
        if (this.isNative) {
            try {
                const app = this._p('App');
                if (app && app.openUrl) {
                    await app.openUrl({ url });
                    return { opened: true, native: true };
                }
            } catch (e) {
                console.warn('[CapBridge] Native openUrl failed:', e);
            }
        }
        // Web fallback
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            return { opened: true, native: false };
        } catch (e) {
            console.warn('[CapBridge] window.open failed:', e);
            return { opened: false, native: false };
        }
    },

    // ── Hardware Back Button ─────────────────────────────────────────
    /**
     * v2.9.x UX audit fix — register an Android hardware back button
     * handler. `handler` should return true when it consumed the press
     * (closed a modal, navigated in-app). When unhandled, the app is
     * minimized (standard Android root-screen behavior) rather than
     * killed, so the WebView and in-memory state survive resume.
     *
     * No-op on web — the browser back button manages history itself.
     */
    registerBackButton(handler) {
        if (!this.isNative) return { registered: false };
        try {
            const app = this._p('App');
            if (app && app.addListener) {
                // Capacitor passes { canGoBack } reflecting WebView hash
                // history; deliberately ignored — this app's hash entries
                // are navigation dead weight (no popstate/hashchange
                // listeners), so in-app state is the only source of truth.
                app.addListener('backButton', () => {
                    let handled = false;
                    try {
                        handled = !!handler();
                    } catch (e) {
                        console.warn('[CapBridge] backButton handler threw:', e);
                    }
                    if (!handled) {
                        if (app.minimizeApp) app.minimizeApp();
                        else if (app.exitApp) app.exitApp();
                    }
                });
                return { registered: true };
            }
        } catch (e) {
            console.warn('[CapBridge] backButton registration failed:', e);
        }
        return { registered: false };
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
