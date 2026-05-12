import { Capacitor } from '@capacitor/core';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '3b38ca69-e5eb-40a7-8b46-48942086dcb3';

export const initializeAdminPushNotifications = async (adminId?: string) => {
  if (Capacitor.getPlatform() === 'web') {
    console.log('Push notifications on web (admin) are handled via browser');
    return;
  }

  try {
    // 1. OneSignal Initialization
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // 2. Request Permissions
    await OneSignal.Notifications.requestPermission(true);

    if (adminId) {
      // Login and Tag as admin so GAS can target admins
      OneSignal.login(adminId);
      OneSignal.User.addTag('role', 'admin');
      console.log('OneSignal: Admin logged in and tagged.');
    }

    // 3. Foreground Listener
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('📩 Admin Push received in foreground:', event.getNotification());
    });

  } catch (error) {
    console.error('Error initializing Admin OneSignal:', error);
  }
};
