import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

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
    try {
      // Find recipients who opted-in to email
      const usersSnap = await db.collection('users').where('preferences.emailOptIn', '==', true).get();
      const recipients: string[] = usersSnap.docs
        .map((d) => (d.data() as any).email)
        .filter((e) => typeof e === 'string' && e.length > 0);

      if (!recipients.length) {
        await snap.ref.update({ status: 'no_recipients', sentAt: Date.now() });
        return;
      }

      // Call Google Apps Script Web App URL to send emails
      const appsScriptUrl = process.env.APPS_SCRIPT_BROADCAST_URL || functions.config().apps?.script_url;
      if (!appsScriptUrl) {
        await snap.ref.update({ status: 'failed', lastError: 'Missing APPS_SCRIPT_BROADCAST_URL' });
        return;
      }

      const payload = {
        title: data.title,
        body: data.body,
        broadcastId,
        recipients,
      };

      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        await snap.ref.update({ status: 'failed', lastError: text });
        return;
      }

      await snap.ref.update({ status: 'sent', sentAt: Date.now(), recipientsCount: recipients.length });
    } catch (err: any) {
      await snap.ref.update({ status: 'failed', lastError: String(err) });
    }
  });
