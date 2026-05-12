import { Capacitor } from '@capacitor/core';
import { userService } from '../services/firebase';
import toast from 'react-hot-toast';
import OneSignal from '@onesignal/capacitor-plugin';
import { initializeMessaging, getFCMToken, requestNotificationPermission } from '../config/firebaseMessaging';

const ONESIGNAL_APP_ID = '3b38ca69-e5eb-40a7-8b46-48942086dcb3';

/**
 * Initialize push notifications for both web and native platforms
 */
export const initializePushNotifications = async (userId?: string) => {
  if (Capacitor.getPlatform() === 'web') {
    if (userId) {
      await initializeWebPushNotifications(userId);
    }
    return;
  }

  try {
    // 1. OneSignal Initialization (Native APK)
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // 2. Request Permissions
    const permission = await OneSignal.Notifications.requestPermission(true);
    console.log('OneSignal permission:', permission);

    if (userId) {
      // Link OneSignal subscription to our internal userId
      OneSignal.login(userId);
      console.log('OneSignal: User logged in with ID:', userId);
    }

    // 3. Foreground Listener
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('📩 OneSignal foreground notification:', event.getNotification());
      const notification = event.getNotification();
      
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

    // 4. Action Listener (Tapping notification)
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('🔔 OneSignal notification clicked:', event);
      
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
    console.error('❌ Error initializing native push notifications:', error);
  }
};

/**
 * Initialize push notifications for web (FCM)
 */
async function initializeWebPushNotifications(userId: string) {
  try {
    // Initialize Firebase Messaging
    const messaging = await initializeMessaging();
    if (!messaging) {
      console.warn('⚠️ Firebase Cloud Messaging not supported');
      return;
    }

    console.log('✅ Firebase Messaging initialized');

    // Set up foreground message handler
    window.addEventListener('fcm-message', async (event: any) => {
      const { title, body, data } = event.detail;
      console.log('📩 Foreground message received (web):', { title, body, data });

      // Save notification to Firestore if needed
      try {
        if (data?.notificationId) {
          // Notification already saved by Cloud Function
        }
      } catch (err) {
        console.error('Error handling foreground message:', err);
      }
    });

    // Listen for notification clicks via Service Worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 Notification clicked (web):', event.data.notification);
        
        const { data } = event.data.notification;
        const targetPath = data?.deeplink || data?.actionUrl || data?.link;
        
        if (targetPath) {
          const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
          window.location.hash = `#${cleanPath}`;
        } else if (data?.transactionId || data?.transferId) {
          window.location.hash = `#/transactions/${data.transactionId || data.transferId}`;
        }
      } else if (event.data.type === 'NOTIFICATION_CLOSED') {
        console.log('❌ Notification closed (web):', event.data.notification);
      }
    });

    // Auto-request notification permission
    const permissionGranted = await isNotificationsAlreadyGranted();
    if (permissionGranted) {
      const token = await getFCMToken();
      if (token) {
        await saveFCMToken(userId, token);
        console.log('✅ FCM token saved for user:', userId);
      }
    } else if (shouldPromptForNotifications()) {
      // Don't auto-prompt, wait for user interaction
      console.log('⏳ Notification permission not granted, waiting for user action');
    }
  } catch (error) {
    console.error('❌ Error initializing web push notifications:', error);
  }
}

/**
 * Check if notification permission is already granted
 */
function isNotificationsAlreadyGranted(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Determine if we should prompt for notifications
 * (based on user preferences, number of prompts, etc.)
 */
function shouldPromptForNotifications(): boolean {
  // Check localStorage for user preference
  const hasPromptedBefore = localStorage.getItem('notification-prompted');
  const promptCount = parseInt(localStorage.getItem('notification-prompt-count') || '0');
  
  // Only prompt if we haven't asked more than 2 times
  if (promptCount >= 2) {
    return false;
  }

  // Prompt if not denied explicitly
  return Notification.permission === 'default';
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermissionFromUser(): Promise<boolean> {
  try {
    const token = await requestNotificationPermission();
    return token !== null;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Save FCM token to Firestore
 */
async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    await userService.savePushToken(userId, token);
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
  }
}

/**
 * Get current FCM token
 */
export async function getCurrentFCMToken(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native platform token handling
      return null; // Handled by Capacitor
    } else {
      // Web platform
      return await getFCMToken();
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}
