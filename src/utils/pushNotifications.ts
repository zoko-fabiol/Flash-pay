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
    // 1. OneSignal Initialization (Works for BOTH Web and Native via the same plugin)
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // 2. Request Permissions / Register
    if (Capacitor.getPlatform() === 'web') {
      // On web, we use OneSignal's sliding prompt or native prompt
      await OneSignal.Notifications.requestPermission(true);
    } else {
      await OneSignal.Notifications.requestPermission(true);
    }

    if (userId) {
      OneSignal.login(userId);
      console.log('✅ OneSignal: User logged in with ID:', userId);
    }

    // 3. Foreground Listener
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      const notification = event.getNotification();
      console.log('📩 Foreground notification:', notification);
      
      toast.success(notification.title || 'Nouvelle notification', {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#661489',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '16px',
        }
      });
    });

    // 4. Action Listener
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('🔔 Notification clicked:', event);
      const data = event.notification.additionalData as any;
      const targetPath = data?.deeplink || data?.actionUrl || data?.link;
      
      if (targetPath) {
        const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
        window.location.hash = `#${cleanPath}`;
      } else if (data?.transactionId || data?.transferId) {
        window.location.hash = `#/transactions/${data.transactionId || data.transferId}`;
      }
    });

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
