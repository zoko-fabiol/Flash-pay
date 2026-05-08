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

  // write in-app notification
  const notifRef = db.collection('notifications').doc(userId).collection('items').doc();
  await notifRef.set({ ...notif, createdAt: Date.now(), read: false });

  // enqueue delivery
  await db.collection('notification_queue').add({
    userId,
    payload: notif,
    channels: ['fcm', 'email'],
    email: after.userEmail || null,
    phone: after.userPhone || null,
    status: 'pending',
    scheduledFor: Date.now(),
    attempts: 0,
  });

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
  await db.collection('notification_queue').add({ userId, payload: notif, channels: ['fcm', 'email'], email: after.userEmail || null, status: 'pending', scheduledFor: Date.now(), attempts: 0 });
  return null;
});

export const onReferralReward = functions.firestore.document('referrals/{refId}').onCreate(async (snap, ctx) => {
  const data = snap.data();
  if (!data) return null;
  const userId = data.userId;
  const notif = buildNotificationForReferral({ id: ctx.params.refId, amount: data.amount });
  await db.collection('notifications').doc(userId).collection('items').doc().set({ ...notif, createdAt: Date.now(), read: false });
  await db.collection('notification_queue').add({ userId, payload: notif, channels: ['fcm', 'email', 'sms'], email: data.email || null, phone: data.phone || null, status: 'pending', scheduledFor: Date.now(), attempts: 0 });
  return null;
});
