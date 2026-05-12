import { Capacitor } from '@capacitor/core';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '987f03ae-6b3f-49ca-9fd4-da1d6323d31e';

export const initializeAdminPushNotifications = async (adminId?: string) => {
  try {
    const isWeb = Capacitor.getPlatform() === 'web';

    if (isWeb) {
      // --- WEB IMPLEMENTATION ---
      const OneSignalWeb = (window as any).OneSignal;
      if (!OneSignalWeb) {
        console.warn('OneSignal Web SDK not loaded yet (Admin)');
        return;
      }

      await OneSignalWeb.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      if (adminId) {
        await OneSignalWeb.login(adminId);
        // We can't add tags as easily via the page SDK init, 
        // but it's often done via User.addTag if available
      }
      console.log('✅ OneSignal Admin Web Initialized');
    } else {
      // --- NATIVE IMPLEMENTATION ---
      OneSignal.initialize(ONESIGNAL_APP_ID);
      await OneSignal.Notifications.requestPermission(true);

      if (adminId) {
        OneSignal.login(adminId);
        OneSignal.User.addTag('role', 'admin');
        console.log('OneSignal: Admin logged in and tagged.');
      }

      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        console.log('📩 Admin Push received in foreground:', event.getNotification());
      });
    }
  } catch (error) {
    console.error('❌ Error initializing Admin OneSignal:', error);
  }
};
