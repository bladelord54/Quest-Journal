import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifequestjournal.app',
  appName: 'Life Quest Journal',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1c1917'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1c1917',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchShowDuration: 1500
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#fbbf24'
    }
  }
};

export default config;
