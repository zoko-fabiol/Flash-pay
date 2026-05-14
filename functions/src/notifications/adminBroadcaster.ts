import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { broadcastOneSignal } from './onesignalSender';

// Initialize admin SDK (uses default credentials when deployed)
try {
  initializeApp();
} catch (e) {
  // already initialized
}

const db = getFirestore();

// Trigger on admin_broadcasts creations
export const onAdminBroadcastCreated = functions.firestore
  .document('admin_broadcasts/{broadcastId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    const broadcastId = snap.id;
    if (!data) return;

    if (data.sentViaClient) {
      await snap.ref.update({ status: 'sent', sentAt: Date.now(), skippedByTrigger: true });
      return;
    }

    try {
      // 1. OneSignal Push Notification (if requested)
      if (data.sendNotification) {
        try {
          await broadcastOneSignal(data.title, data.body);
        } catch (err) {
          console.error('OneSignal broadcast failed:', err);
          await snap.ref.update({ lastError: `OneSignal failed: ${String(err)}` });
        }
      }

      // 2. Email Broadcast (if requested)
      if (data.sendEmail) {
        // Find recipients who opted-in to email
        const usersSnap = await db.collection('users').where('preferences.emailOptIn', '==', true).get();
        const recipients: string[] = usersSnap.docs
          .map((d) => (d.data() as any).email)
          .filter((e) => typeof e === 'string' && e.length > 0);

        if (recipients.length) {
          // Call Google Apps Script Web App URL to send emails
          const appsScriptUrl = process.env.APPS_SCRIPT_BROADCAST_URL || functions.config().apps?.script_url;
          if (appsScriptUrl) {
            const payload = {
              title: data.title,
              body: data.body,
              broadcastId,
              recipients,
            };

            await fetch(appsScriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          }
        }
      }

      await snap.ref.update({ status: 'sent', sentAt: Date.now() });
    } catch (err: any) {
      await snap.ref.update({ status: 'failed', lastError: String(err) });
    }
  });
