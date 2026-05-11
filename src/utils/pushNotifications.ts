import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { userService } from '../services/firebase';
import { initializeMessaging, requestNotificationPermission, getFCMToken } from '../config/firebaseMessaging';

/**
 * Initialize push notifications for both web and native platforms
 */
export const initializePushNotifications = async (userId: string) => {
  // Initialize platform-specific push notifications
  if (Capacitor.isNativePlatform()) {
    await initializeNativePushNotifications(userId);
  } else {
    // Web platform - use Firebase Cloud Messaging
    await initializeWebPushNotifications(userId);
  }
};

/**
 * Initialize push notifications for native platforms (Android/iOS)
 */
async function initializeNativePushNotifications(userId: string) {
  try {
    // Request permission to use push notifications
    // iOS will prompt a system dialog, Android will check if it's enabled
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('⚠️ Push notification permission denied.');
      return;
    }

    // Remove existing listeners to prevent duplicates
    await PushNotifications.removeAllListeners();

    // Register with Apple / Google to receive push notifications
    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('✅ Push registration success (native)');
      try {
        // Only update if needed (this prevents loops)
        await userService.savePushToken(userId, token.value);
      } catch (err) {
        console.error('❌ Error saving push token to Firestore:', err);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Error on registration:', JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📩 Push received (native):', JSON.stringify(notification));
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('🔔 Push action performed (native):', JSON.stringify(notification));
      
      const data = notification.notification.data;
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
}

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
