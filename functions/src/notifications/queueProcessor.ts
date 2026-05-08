import * as functions from 'firebase-functions';
import { getFirestore } from '../utils/admin';
import { sendFcmToUser } from './fcmSender';
import { sendEmail } from './emailSender';
import { sendSms } from './smsSender';

const db = getFirestore();

export const processNotificationQueue = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = Date.now();
  const q = db.collection('notification_queue').where('status', '==', 'pending').where('scheduledFor', '<=', now).limit(100);
  const snap = await q.get();
  if (snap.empty) return null;

  const promises: Promise<any>[] = [];
  for (const doc of snap.docs) {
    const item = doc.data();
    const id = doc.id;
    const userId = item.userId;
    const payload = item.payload || {};

    // attempt delivery
    const sendPromises: Promise<any>[] = [];
    if (item.channels?.includes('fcm')) {
      sendPromises.push(sendFcmToUser(userId, { notification: { title: payload.title, body: payload.body }, data: payload.data } as any));
    }
    if (item.channels?.includes('email') && item.email) {
      sendPromises.push(sendEmail(item.email, payload.title || 'Notification', payload.body || ''));
    }
    if (item.channels?.includes('sms') && item.phone) {
      sendPromises.push(sendSms(item.phone, payload.body || ''));
    }

    const aggregate = Promise.allSettled(sendPromises).then(async results => {
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length === 0) {
        await doc.ref.update({ status: 'sent', sentAt: Date.now() });
      } else {
        const nextAttempt = (item.attempts || 0) + 1;
        if (nextAttempt > 5) {
          await doc.ref.update({ status: 'failed', attempts: nextAttempt, lastError: JSON.stringify(failed) });
        } else {
          const backoffMs = Math.pow(2, nextAttempt) * 1000;
          await doc.ref.update({ attempts: nextAttempt, scheduledFor: Date.now() + backoffMs });
        }
      }
    }).catch(err => doc.ref.update({ status: 'failed', lastError: String(err) }));

    promises.push(aggregate);
  }

  await Promise.all(promises);
  return null;
});
