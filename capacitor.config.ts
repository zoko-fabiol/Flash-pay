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
      backgroundColor: '#6236CC',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#6236CC',
      overlaysWebView: false,
    },
    Camera: {
      // Allow camera & gallery
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
