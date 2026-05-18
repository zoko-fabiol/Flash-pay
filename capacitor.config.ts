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
