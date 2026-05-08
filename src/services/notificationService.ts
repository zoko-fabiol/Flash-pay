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
    const notificationsQuery = query(
      userNotificationsCollection(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs
      .map(mapNotification)
      .filter((item) => !item.deletedAt);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));
    const countSnapshot = await getCountFromServer(unreadQuery);
    return countSnapshot.data().count;
  },

  async getNotificationById(userId: string, notificationId: string): Promise<Notification | null> {
    const docRef = doc(db, 'notifications', userId, 'items', notificationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<Notification, 'id'>),
    };
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
      read: true,
      readAt: serverTimestamp(),
    });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));
    const unreadSnapshot = await getDocs(unreadQuery);

    if (unreadSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    unreadSnapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        read: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
      deletedAt: serverTimestamp(),
    });
  },

  async clearAllNotifications(userId: string): Promise<void> {
    const notificationsSnapshot = await getDocs(userNotificationsCollection(userId));

    if (notificationsSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    notificationsSnapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        deletedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  },

  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    max = DEFAULT_LIMIT
  ): Unsubscribe {
    const notificationsQuery = query(
      userNotificationsCollection(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );

    return onSnapshot(notificationsQuery, (snapshot) => {
      const items = snapshot.docs
        .map(mapNotification)
        .filter((item) => !item.deletedAt);
      callback(items);
    });
  },

  subscribeToUnreadCount(userId: string, callback: (count: number) => void): Unsubscribe {
    const unreadQuery = query(userNotificationsCollection(userId), where('read', '==', false));

    return onSnapshot(unreadQuery, (snapshot) => {
      callback(snapshot.docs.filter((docSnap) => !docSnap.data().deletedAt).length);
    });
  },
};
