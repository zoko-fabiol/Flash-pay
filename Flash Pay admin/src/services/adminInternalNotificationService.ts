import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  where,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: 'transaction' | 'kyc' | 'support' | 'security' | 'system';
  priority: 'low' | 'normal' | 'high';
  read: boolean;
  createdAt: Timestamp;
  link?: string;
  data?: any;
}

export const adminInternalNotificationService = {
  /**
   * Subscribe to recent admin notifications
   */
  subscribeToNotifications: (callback: (notifications: AdminNotification[]) => void) => {
    const q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminNotification[];
      callback(notifications);
    });
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (id: string) => {
    const docRef = doc(db, 'admin_notifications', id);
    await updateDoc(docRef, { read: true });
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    const q = query(collection(db, 'admin_notifications'), where('read', '==', false));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string) => {
    const docRef = doc(db, 'admin_notifications', id);
    await deleteDoc(docRef);
  },

  /**
   * Clear all read notifications
   */
  clearRead: async () => {
    const q = query(collection(db, 'admin_notifications'), where('read', '==', true));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }
};
