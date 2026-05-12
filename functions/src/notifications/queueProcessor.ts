import * as functions from 'firebase-functions';
import { sendFcmToUser } from './fcmSender';
import { sendOneSignalToUser } from './onesignalSender';

export const onNotificationQueueCreated = functions.firestore
  .document('notification_queue/{queueId}')
  .onCreate(async (snap) => {
    const item = snap.data();
    const userId = item.userId as string;
    const payload = item.payload || {};

    try {
      // Send via FCM if specified
      if (item.channels?.includes('fcm')) {
        await sendFcmToUser(userId, {
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
        } as any);
      }

      // Send via OneSignal if specified
      if (item.channels?.includes('onesignal')) {
        await sendOneSignalToUser(userId, payload.title, payload.body, payload.data);
      }

      await snap.ref.update({
        status: 'sent',
        sentAt: Date.now(),
        attempts: (item.attempts || 0) + 1,
      });
    } catch (err) {
      await snap.ref.update({
        status: 'failed',
        lastError: String(err),
        attempts: (item.attempts || 0) + 1,
      });
    }

    return null;
  });
