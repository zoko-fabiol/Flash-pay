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
      // Send via OneSignal FIRST (primary for mobile/native)
      // OneSignal handles routing to Android/iOS automatically
      if (item.channels?.includes('onesignal')) {
        try {
          await sendOneSignalToUser(userId, payload.title, payload.body, payload.data);
          console.log(`✅ Sent via OneSignal to user ${userId}`);
        } catch (err) {
          console.error(`⚠️ OneSignal failed for user ${userId}:`, err);
          // Continue to FCM as fallback
        }
      }

      // Send via FCM if specified (currently for future web support)
      // Skip if OneSignal already succeeded
      if (item.channels?.includes('fcm')) {
        try {
          await sendFcmToUser(userId, {
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
          } as any);
          console.log(`✅ Sent via FCM to user ${userId}`);
        } catch (err) {
          console.warn(`⚠️ FCM failed for user ${userId}:`, err);
          // Don't throw - notification may still be delivered via OneSignal
        }
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
      console.error(`Failed to process notification queue item:`, err);
    }

    return null;
  });
