import * as functions from 'firebase-functions';
import { getFirestore } from '../utils/admin';
import { buildNotificationForTransaction, buildNotificationForKyc, buildNotificationForReferral } from './factory';

const db = getFirestore();

export const onTransactionUpdated = functions.firestore.document('transactions/{txId}').onUpdate(async (change, ctx) => {
  const before = change.before.data();
  const after = change.after.data();
  if (!after) return null;
  if (before?.status === after.status) return null;

  const userId = after.userId;
  const notif = buildNotificationForTransaction({ id: ctx.params.txId, status: after.status });

  // write in-app notification (this will trigger onInAppNotificationCreated for push)
  const notifRef = db.collection('notifications').doc(userId).collection('items').doc();
  await notifRef.set({ ...notif, createdAt: Date.now(), read: false });

  return null;
});

export const onKycStatusChanged = functions.firestore.document('kyc/{kycId}').onUpdate(async (change, ctx) => {
  const before = change.before.data();
  const after = change.after.data();
  if (!after) return null;
  if (before?.status === after.status) return null;
  const userId = after.userId;
  const notif = buildNotificationForKyc({ id: ctx.params.kycId, status: after.status });
  await db.collection('notifications').doc(userId).collection('items').doc().set({ ...notif, createdAt: Date.now(), read: false });
  return null;
});

export const onReferralReward = functions.firestore.document('referrals/{refId}').onCreate(async (snap, ctx) => {
  const data = snap.data();
  if (!data) return null;
  const userId = data.userId;
  const notif = buildNotificationForReferral({ id: ctx.params.refId, amount: data.amount });
  await db.collection('notifications').doc(userId).collection('items').doc().set({ ...notif, createdAt: Date.now(), read: false });
  return null;
});

/**
 * Universal Push Trigger: Any in-app notification added to a user's items 
 * will automatically enqueue a push notification delivery.
 */
export const onInAppNotificationCreated = functions.firestore
  .document('notifications/{userId}/items/{notifId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data();
    if (!data) return;
    const userId = ctx.params.userId;

    // Enqueue for FCM delivery
    await db.collection('notification_queue').add({
      userId,
      payload: {
        title: data.title,
        body: data.body,
        data: data.data || {}
      },
      channels: ['fcm', 'onesignal'],
      status: 'pending',
      scheduledFor: Date.now(),
      attempts: 0,
    });
  });
