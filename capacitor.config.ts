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
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    Camera: {
      // Allow camera & gallery
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "4504627700-t3orkamdujgdmqn9b38dlt1900q4t1ml.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    CapacitorUpdater: {
      // URL de l'endpoint Netlify qui retourne la dernière version du bundle
      updateUrl: 'https://flash-pay.netlify.app/.netlify/functions/bundle-update',
      // Pas de stats (privacy)
      statsUrl: '',
      // Mode automatique : télécharge et applique sans intervention utilisateur
      autoUpdate: true,
      // Délai avant de vérifier (ms) - laisse l'app s'initialiser d'abord
      directUpdate: false,
    },
  },
};

export default config;
