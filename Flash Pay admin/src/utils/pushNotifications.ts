import { Capacitor } from '@capacitor/core';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '3b38ca69-e5eb-40a7-8b46-48942086dcb3';

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

      try {
        await OneSignalWeb.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
        });

        if (adminId) {
          await OneSignalWeb.login(adminId);
        }
        console.log('✅ OneSignal Admin Web Initialized');
      } catch (webError) {
        console.warn('⚠️ OneSignal Admin Web Push not fully configured in dashboard:', webError);
      }
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
