/**
 * Firebase Cloud Messaging Configuration
 * Handles FCM token registration and initialization
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '../services/firebase';

// Reuse app configured in src/services/firebase.ts

let messaging: ReturnType<typeof getMessaging> | null = null;

/**
 * Initialize Firebase Messaging
 * Should be called on app startup
 */
export async function initializeMessaging() {
  try {
    // Check if messaging is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Cloud Messaging is not supported in this browser');
      return null;
    }

    messaging = getMessaging(app);
    console.log('✅ Firebase Cloud Messaging initialized');
    
    // Setup foreground message handler
    setupForegroundMessageHandler();
    
    return messaging;
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if messaging is initialized
    if (!messaging) {
      messaging = getMessaging(app);
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('⚠️ Notification permission denied');
      return null;
    }

    // Get VAPID key from environment
    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) {
      console.error('❌ FCM VAPID Key not configured in environment');
      return null;
    }

    // Get registration token
    const token = await getToken(messaging, {
      vapidKey,
    });

    console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Get current FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    if (!messaging) {
      messaging = getMessaging(app);
    }

    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) {
      console.error('❌ FCM VAPID Key not configured');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

/**
 * Setup foreground message handler
 * Called when app is open and a message is received
 */
function setupForegroundMessageHandler() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('📩 Foreground message received:', payload);

    // Extract notification data
    const { notification, data } = payload;
    
    if (notification) {
      // Show notification or dispatch event
      const event = new CustomEvent('fcm-message', {
        detail: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
          data: data || {},
        },
      });
      window.dispatchEvent(event);

      // Optional: Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'Flash Pay', {
          body: notification.body,
          icon: notification.image || '/assets/icon.png',
          badge: '/assets/badge.png',
        });
      }
    }
  });
}

/**
 * Check if notifications are supported and enabled
 */
export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const supported = await isSupported();
    if (!supported) return false;

    const permission = Notification.permission;
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Error checking notification status:', error);
    return false;
  }
}

/**
 * Request notification permission (simple wrapper)
 */
export async function requestNotificationAlert(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  return Notification.permission;
}

/**
 * Listen to foreground messages
 * Usage: 
 * const unsubscribe = onForegroundMessage((payload) => {
 *   console.log('Message:', payload);
 * });
 */
export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  if (!messaging) return null;

  return onMessage(messaging, callback);
}

export { messaging };
