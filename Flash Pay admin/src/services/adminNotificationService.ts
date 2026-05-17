import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { oneSignalService } from './oneSignalService';

export interface AdminBroadcast {
  title: string;
  body: string;
  createdAt: number;
}

export interface BroadcastOptions {
  sendEmail: boolean;
  sendNotification: boolean;
}

/**
 * Send broadcast to opted-in users via Google Apps Script + create in-app notifications + OneSignal Push
 */
export async function sendBroadcastDirect(
  title: string,
  body: string,
  options: BroadcastOptions = { sendEmail: true, sendNotification: true }
): Promise<{ sent: number; failed: number }> {
  try {
    const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbxA_g3PdHmxw3QVvttBEiFBHQa0DexwEpVckTBRDG377OvWHX2Xzzw4tL2SLso5_C-9Mg/exec';
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    let emailRecipients: string[] = [];
    let allUserIds: string[] = [];

    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      const userEmail = data.email;

      if (userId) allUserIds.push(userId);

      // Send to every user that has an email address
      if (userEmail) {
        emailRecipients.push(userEmail);
      }
    });

    // 1. Send Push Notification via Netlify Proxy (Free & No CORS)
    if (options.sendNotification) {
      try {
        await oneSignalService.broadcastNotification(title, body);
      } catch (err) {
        console.error('OneSignal broadcast failed:', err);
      }
    }

    // 2. Send Emails via Google Apps Script (GAS)
    if (options.sendEmail && emailRecipients.length > 0 && GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            title,
            body,
            recipients: emailRecipients,
            logoUrl: 'https://flash-pay.site/logo.png'
          })
        });
      } catch (err) {
        console.error('Email broadcast failed:', err);
      }
    }

    // 3. Log to Firestore for History
    await addDoc(collection(db, 'admin_broadcasts'), {
      title,
      body,
      sendEmail: options.sendEmail,
      sendNotification: options.sendNotification,
      status: 'sent',
      createdAt: Date.now()
    });

    // 3. Create In-App Notifications
    let notificationsCreated = 0;
    if (options.sendNotification) {
      const createdAt = Date.now();
      for (const userId of allUserIds) {
        try {
          // This creates the entry in the notifications list for each user
          await addDoc(collection(db, 'notifications', userId, 'items'), {
            title,
            body,
            type: 'broadcast',
            isRead: false,
            createdAt: createdAt,
            priority: 'high'
          });
          notificationsCreated++;
        } catch (err) {
          console.error(`Failed to create in-app notification for user ${userId}:`, err);
        }
      }
    }

    // Audit Log
    await addAdminBroadcastLog({
      title,
      body,
      recipientCount: emailRecipients.length,
      notificationsCreated,
      status: 'sent',
      sendEmail: options.sendEmail,
      sendNotification: options.sendNotification,
      createdAt: Date.now()
    });

    return { sent: emailRecipients.length + notificationsCreated, failed: 0 };
  } catch (err) {
    console.error('Failed to send broadcast:', err);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Log broadcast to Firestore for audit trail
 */
async function addAdminBroadcastLog(item: any) {
  try {
    const col = collection(db, 'admin_broadcasts');
    await addDoc(col, item);
  } catch (err) {
    console.error('Failed to log broadcast:', err);
  }
}

export async function addAdminBroadcast(item: AdminBroadcast) {
  const col = collection(db, 'admin_broadcasts');
  return await addDoc(col, { ...item, status: 'pending' });
}

export default { sendBroadcastDirect, addAdminBroadcast };
