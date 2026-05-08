import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Notification } from '../types/notifications';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { getCurrentFCMToken, requestNotificationPermissionFromUser } from '../utils/pushNotifications';

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  enablePushNotifications: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  const refresh = async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const [items, count] = await Promise.all([
        notificationService.getUserNotifications(userId),
        notificationService.getUnreadCount(userId),
      ]);

      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to refresh notifications', err);
      setError('Impossible de charger les notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribeNotifications = notificationService.subscribeToNotifications(
      userId,
      (items) => {
        setNotifications(items);
        setIsLoading(false);
      }
    );

    const unsubscribeUnread = notificationService.subscribeToUnreadCount(userId, setUnreadCount);

    return () => {
      unsubscribeNotifications();
      unsubscribeUnread();
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    if (!userId) return;
    await notificationService.markAsRead(userId, id);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
  };

  const deleteNotification = async (id: string) => {
    if (!userId) return;
    await notificationService.deleteNotification(userId, id);
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    await notificationService.clearAllNotifications(userId);
  };

  const enablePushNotifications = async (): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    const granted = await requestNotificationPermissionFromUser();
    if (!granted) {
      return false;
    }

    const token = await getCurrentFCMToken();
    if (!token) {
      return false;
    }

    await notificationService.registerFCMToken(userId, token, 'web');
    return true;
  };

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      refresh,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      enablePushNotifications,
    }),
    [notifications, unreadCount, isLoading, error]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
