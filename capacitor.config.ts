import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashpay.app',
  appName: 'Flash Pay',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  server: {
    androidScheme: 'https',
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#661489',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#661489',
      overlaysWebView: false,
    },
    Camera: {
      // Allow camera & gallery
    },
  },
};

export default config;
