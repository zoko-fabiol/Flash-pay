import { Capacitor } from '@capacitor/core';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '3b38ca69-e5eb-40a7-8b46-48942086dcb3';

let webInitialized = false;
let nativeInitialized = false;

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

      // Guard against double initialization (React StrictMode / HMR)
      if (webInitialized) {
        console.log('✅ OneSignal Web already initialized, skipping');
        if (userId) {
          try { await OneSignalWeb.login(userId); } catch (_) {}
        }
        return;
      }

      await OneSignalWeb.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });
      webInitialized = true;

      if (userId) {
        await OneSignalWeb.login(userId);
      }
      console.log('✅ OneSignal Web Initialized');
    } else {
      // --- NATIVE IMPLEMENTATION (Android/iOS) ---
      // Guard against double initialization
      if (nativeInitialized) {
        console.log('✅ OneSignal Native already initialized, skipping');
        if (userId) {
          try { OneSignal.login(userId); } catch (_) {}
        }
        return;
      }

      OneSignal.initialize(ONESIGNAL_APP_ID);
      nativeInitialized = true;
      
      // Request permission from user
      const hasPermission = await OneSignal.Notifications.requestPermission(true);
      console.log('🔔 Permission requested, granted:', hasPermission);

      if (userId) {
        OneSignal.login(userId);

        // ✅ CRITICAL FIX: Register the OneSignal token in Firestore
        // This allows Cloud Functions to find and send notifications to this device
        try {
          const token = await getCurrentPushToken();
          const platform = Capacitor.getPlatform() as 'android' | 'ios';
          if (token) {
            await notificationService.registerFCMToken(userId, token, platform);
            console.log(`✅ ${platform} FCM token registered:`, token.substring(0, 20) + '...');
          }
        } catch (err) {
          console.warn('⚠️ Could not register native FCM token:', err);
        }
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

      console.log('✅ OneSignal Native Initialized');
    }
  } catch (error: any) {
    // Silently handle "already initialized" errors
    if (error?.message?.includes('already initialized') || error?.message?.includes('Can only be used on')) {
      console.warn('⚠️ OneSignal init skipped:', error.message);
    } else {
      console.error('❌ Error initializing OneSignal:', error);
    }
  }
};

/**
 * Request notification permission from user manually
 */
export async function requestNotificationPermissionFromUser(): Promise<boolean> {
  try {
    const permission = await OneSignal.Notifications.requestPermission(true);
    return permission;
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
