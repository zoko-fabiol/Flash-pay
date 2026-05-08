/**
 * Hook: usePushNotifications
 * Manages push notification setup and state
 */

import { useEffect, useState, useCallback } from 'react';
import {
  initializeMessaging,
  requestNotificationPermission,
  getFCMToken,
  isNotificationsEnabled,
  onForegroundMessage,
} from '../config/firebaseMessaging';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  fcmToken: string | null;
  requestPermission: () => Promise<boolean>;
  foregroundMessage: any | null;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [foregroundMessage, setForegroundMessage] = useState(null);

  // Check support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Initialize messaging
        const messaging = await initializeMessaging();
        setIsSupported(messaging !== null);

        // Check if notifications are enabled
        const enabled = await isNotificationsEnabled();
        setIsEnabled(enabled);

        // Get FCM token if enabled
        if (enabled) {
          const token = await getFCMToken();
          setFcmToken(token);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Setup foreground message listener
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload: any) => {
      setForegroundMessage(payload);
      console.log('📩 Foreground message:', payload);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        setIsEnabled(true);
        setError(null);
        return true;
      } else {
        setError('Permission denied by user');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    error,
    fcmToken,
    requestPermission,
    foregroundMessage,
  };
}
