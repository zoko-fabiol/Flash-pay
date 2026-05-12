import { Capacitor } from '@capacitor/core';
import { userService } from '../services/firebase';
import toast from 'react-hot-toast';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '3b38ca69-e5eb-40a7-8b46-48942086dcb3';

/**
 * Initialize push notifications for both web and native platforms
 */
export const initializePushNotifications = async (userId?: string) => {
  try {
    const isWeb = Capacitor.getPlatform() === 'web';

    if (isWeb) {
      // --- WEB IMPLEMENTATION ---
      const OneSignalWeb = (window as any).OneSignal;
      if (!OneSignalWeb) {
        console.warn('OneSignal Web SDK not loaded yet');
        return;
      }

      await OneSignalWeb.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      if (userId) {
        await OneSignalWeb.login(userId);
      }
      console.log('✅ OneSignal Web Initialized');
    } else {
      // --- NATIVE IMPLEMENTATION (Android/iOS) ---
      OneSignal.initialize(ONESIGNAL_APP_ID);
      await OneSignal.Notifications.requestPermission(true);

      if (userId) {
        OneSignal.login(userId);
      }

      // Foreground Listener (Native only)
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        const notification = event.getNotification();
        toast.success(notification.title || 'Nouvelle notification', {
          duration: 5000,
          position: 'top-center',
          style: { background: '#661489', color: '#fff', fontWeight: 'bold', borderRadius: '16px' }
        });
      });

      // Action Listener (Native only)
      OneSignal.Notifications.addEventListener('click', (event) => {
        const data = event.notification.additionalData as any;
        const targetPath = data?.deeplink || data?.actionUrl || data?.link;
        if (targetPath) {
          window.location.hash = `#${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
        } else if (data?.transactionId || data?.transferId) {
          window.location.hash = `#/transactions/${data.transactionId || data.transferId}`;
        }
      });
    }
  } catch (error) {
    console.error('❌ Error initializing OneSignal:', error);
  }
};

/**
 * Request notification permission from user manually
 */
export async function requestNotificationPermissionFromUser(): Promise<boolean> {
  try {
    const permission = await OneSignal.Notifications.requestPermission(true);
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get current OneSignal User ID (Subscription ID)
 */
export async function getCurrentPushToken(): Promise<string | null> {
  try {
    const id = await OneSignal.User.getOnesignalId();
    return id || null;
  } catch (error) {
    console.error('❌ Error getting OneSignal ID:', error);
    return null;
  }
}
