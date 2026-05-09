import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { adminInternalNotificationService, type AdminNotification } from '../services/adminInternalNotificationService';

interface AdminNotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    const unsubscribe = adminInternalNotificationService.subscribeToNotifications(setNotifications);
    return () => unsubscribe();
  }, []);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );

  const markAsRead = async (id: string) => {
    await adminInternalNotificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    await adminInternalNotificationService.markAllAsRead();
  };

  const deleteNotification = async (id: string) => {
    await adminInternalNotificationService.deleteNotification(id);
  };

  const clearRead = async () => {
    await adminInternalNotificationService.clearRead();
  };

  return (
    <AdminNotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearRead
    }}>
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationProvider');
  }
  return context;
};
