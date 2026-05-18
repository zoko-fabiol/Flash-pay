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
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "4504627700-1c5v4j4gluq9b0m9r2l6356l1q9cplg0.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  },
};

export default config;
