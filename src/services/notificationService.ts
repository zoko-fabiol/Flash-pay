import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification, PlatformType } from '../types/notifications';

const DEFAULT_LIMIT = 50;

function userNotificationsCollection(userId: string) {
  return collection(db, 'notifications', userId, 'items');
}

function userTokensCollection(userId: string) {
  return collection(db, 'fcm_tokens', userId, 'tokens');
}

function mapNotification(docSnap: QueryDocumentSnapshot): Notification {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    title: data.title,
    body: data.body,
    type: data.type,
    status: data.status,
    priority: data.priority || 'normal',
    channels: data.channels || [],
    icon: data.icon,
    imageUrl: data.imageUrl,
    data: data.data || {},
    deeplink: data.deeplink,
    actionUrl: data.actionUrl,
    actions: data.actions || [],
    read: Boolean(data.read),
    readAt: data.readAt,
    deletedAt: data.deletedAt,
    createdAt: data.createdAt,
    sentAt: data.sentAt,
    deliveredAt: data.deliveredAt,
    failureReason: data.failureReason,
    expiresAt: data.expiresAt,
  } as Notification;
}

export const notificationService = {
  async registerFCMToken(userId: string, token: string, platform: PlatformType = 'web'): Promise<void> {
    await addDoc(userTokensCollection(userId), {
      userId,
      token,
      platform,
      enabled: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  },

  async updateFCMToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    const tokenQuery = query(userTokensCollection(userId), where('token', '==', oldToken), limit(1));
    const tokenSnapshot = await getDocs(tokenQuery);

    if (tokenSnapshot.empty) {
      await this.registerFCMToken(userId, newToken);
      return;
    }

    await updateDoc(tokenSnapshot.docs[0].ref, {
      token: newToken,
      enabled: true,
      lastSeen: serverTimestamp(),
    });
  },

  async revokeFCMToken(userId: string, token: string): Promise<void> {
    const tokenQuery = query(userTokensCollection(userId), where('token', '==', token));
    const tokenSnapshot = await getDocs(tokenQuery);

    if (tokenSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    tokenSnapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        enabled: false,
        lastSeen: serverTimestamp(),
      });
    });
    await batch.commit();
  },

  async getUserNotifications(userId: string, max = DEFAULT_LIMIT): Promise<Notification[]> {
    // Load sub-collection notifications
    const notificationsQuery = query(
      userNotificationsCollection(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );

    const snapshot = await getDocs(notificationsQuery);
    const subCollectionItems = snapshot.docs
      .map(mapNotification)
      .filter((item) => !item.deletedAt);

    // Load broadcast notifications from flat collection (no orderBy to avoid index requirement)
    const broadcastQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    let broadcastItems: Notification[] = [];
    try {
      const broadcastSnapshot = await getDocs(broadcastQuery);
      broadcastItems = broadcastSnapshot.docs
        .map(mapNotification)
        .filter((item) => !item.deletedAt);
    } catch (err) {
      console.error('Error loading broadcast notifications:', err);
      // Continue without broadcasts if there's an error
    }

    // Combine and sort by createdAt desc, then slice to max
    const combined = [...subCollectionItems, ...broadcastItems]
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'number' ? a.createdAt : 0);
        const bTime = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'number' ? b.createdAt : 0);
        return bTime - aTime;
      })
      .slice(0, max);

    return combined;
  },

  async getUnreadCount(userId: string): Promise<number> {
    // Count unread from sub-collection
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));
    const countSnapshot = await getCountFromServer(unreadQuery);
    const subCollectionCount = countSnapshot.data().count;

    // Count unread from broadcasts
    const unreadBroadcastQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const broadcastCountSnapshot = await getCountFromServer(unreadBroadcastQuery);
    const broadcastCount = broadcastCountSnapshot.data().count;

    return subCollectionCount + broadcastCount;
  },

  async getNotificationById(userId: string, notificationId: string): Promise<Notification | null> {
    try {
      // Try sub-collection first
      const docRef = doc(db, 'notifications', userId, 'items', notificationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...(docSnap.data() as Omit<Notification, 'id'>),
        };
      }
    } catch {
      // Continue to flat collection
    }

    // Try flat collection (broadcast)
    try {
      const docRef = doc(db, 'notifications', notificationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...(docSnap.data() as Omit<Notification, 'id'>),
        };
      }
    } catch {
      // Not found
    }

    return null;
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // Try sub-collection first
      await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch {
      // If not in sub-collection, try flat collection (broadcast)
      try {
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true,
          readAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Could not mark notification as read:', err);
      }
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    // Mark all sub-collection notifications as read
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));
    const unreadSnapshot = await getDocs(unreadQuery);

    if (!unreadSnapshot.empty) {
      const batch = writeBatch(db);
      unreadSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // Mark all broadcast notifications as read
    const unreadBroadcastQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const unreadBroadcastSnapshot = await getDocs(unreadBroadcastQuery);

    if (!unreadBroadcastSnapshot.empty) {
      const batch = writeBatch(db);
      unreadBroadcastSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      // Try sub-collection first
      await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
        deletedAt: serverTimestamp(),
      });
    } catch {
      // If not in sub-collection, try flat collection (broadcast)
      try {
        await updateDoc(doc(db, 'notifications', notificationId), {
          deletedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Could not delete notification:', err);
      }
    }
  },

  async clearAllNotifications(userId: string): Promise<void> {
    // Clear all sub-collection notifications
    const notificationsSnapshot = await getDocs(userNotificationsCollection(userId));

    if (!notificationsSnapshot.empty) {
      const batch = writeBatch(db);
      notificationsSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          deletedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // Clear all broadcast notifications
    const broadcastSnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      )
    );

    if (!broadcastSnapshot.empty) {
      const batch = writeBatch(db);
      broadcastSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          deletedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  },

  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    max = DEFAULT_LIMIT
  ): Unsubscribe {
    // Listen to sub-collection notifications (legacy)
    const subCollectionQuery = query(
      userNotificationsCollection(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );

    // Listen to flat collection broadcasts (new admin messages)
    // Note: We query without orderBy to avoid needing composite index,
    // then sort and filter client-side
    const broadcastQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    let subCollectionItems: Notification[] = [];
    let broadcastItems: Notification[] = [];

    const unsubscribeSub = onSnapshot(subCollectionQuery, (snapshot) => {
      subCollectionItems = snapshot.docs
        .map(mapNotification)
        .filter((item) => !item.deletedAt);
      
      // Combine and sort both sources
      const combined = [...subCollectionItems, ...broadcastItems]
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'number' ? a.createdAt : 0);
          const bTime = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'number' ? b.createdAt : 0);
          return bTime - aTime;
        })
        .slice(0, max);
      
      callback(combined);
    }, (err) => {
      console.error('Error subscribing to sub-collection notifications:', err);
      callback(broadcastItems.slice(0, max));
    });

    const unsubscribeBroadcast = onSnapshot(broadcastQuery, (snapshot) => {
      broadcastItems = snapshot.docs
        .map(mapNotification)
        .filter((item) => !item.deletedAt)
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'number' ? a.createdAt : 0);
          const bTime = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'number' ? b.createdAt : 0);
          return bTime - aTime;
        })
        .slice(0, max);
      
      // Combine and sort both sources
      const combined = [...subCollectionItems, ...broadcastItems]
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'number' ? a.createdAt : 0);
          const bTime = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'number' ? b.createdAt : 0);
          return bTime - aTime;
        })
        .slice(0, max);
      
      callback(combined);
    }, (err) => {
      console.error('Error subscribing to broadcast notifications:', err);
      // Still call callback with sub-collection items
      callback(subCollectionItems.slice(0, max));
    });

    return () => {
      unsubscribeSub();
      unsubscribeBroadcast();
    };
  },

  subscribeToUnreadCount(userId: string, callback: (count: number) => void): Unsubscribe {
    // Count unread from sub-collection
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));

    // Count unread from broadcasts (query without orderBy to avoid index requirement)
    const unreadBroadcastQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    let subCollectionCount = 0;
    let broadcastCount = 0;

    const unsubscribeSub = onSnapshot(unreadQuery, (snapshot) => {
      subCollectionCount = snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).length;
      callback(subCollectionCount + broadcastCount);
    }, (err) => {
      console.error('Error counting unread sub-collection notifications:', err);
      callback(broadcastCount);
    });

    const unsubscribeBroadcast = onSnapshot(unreadBroadcastQuery, (snapshot) => {
      broadcastCount = snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).length;
      callback(subCollectionCount + broadcastCount);
    }, (err) => {
      console.error('Error counting unread broadcast notifications:', err);
      callback(subCollectionCount);
    });

    return () => {
      unsubscribeSub();
      unsubscribeBroadcast();
    };
  },
};
