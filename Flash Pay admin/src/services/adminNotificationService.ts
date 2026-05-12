import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
 * Send broadcast to opted-in users via Google Apps Script + create in-app notifications
 * Runs entirely client-side - NO CLOUD FUNCTIONS NEEDED
 */
export async function sendBroadcastDirect(
  title: string,
  body: string,
  options: BroadcastOptions = { sendEmail: true, sendNotification: true }
): Promise<{ sent: number; failed: number }> {
  try {
    // Query users who opted in for emails
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    // DEBUG: Log all users and their preferences
    console.log(`Total users found: ${usersSnap.docs.length}`);
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\n📧 User ${doc.id}:`, JSON.stringify(data, null, 2));
    });

    // Try multiple ways to find opted-in users + all users for notifications
    let recipients: string[] = [];
    let allUserIds: string[] = [];

    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      const userEmail = data.email;

      // Store all user IDs for notifications
      if (userId) {
        allUserIds.push(userId);
      }

      // Check multiple possible structures for email opt-in
      const hasOptIn = (data.preferences?.promotionalEmails === true) || 
             (data.preferences?.emailOptIn === true) || 
             (data.emailOptIn === true) ||
             (data.preferences?.notifications?.email === true);

      console.log(`  Checking ${userId}: promotionalEmails=${data.preferences?.promotionalEmails}, emailOptIn=${data.preferences?.emailOptIn}, notifications.email=${data.preferences?.notifications?.email} → ${hasOptIn}`);
      
      if (hasOptIn && userEmail) {
        recipients.push(userEmail);
      }
    });

    console.log(`✅ Users with email opt-in: ${recipients.length}`, recipients);

    // Send emails to opted-in users (if enabled)
    if (options.sendEmail && recipients.length > 0) {
      await fetch('https://script.google.com/macros/s/AKfycbyquLPwMLLu8i7c27Htlw8lBV94HcHcWDTpE9bxJe2KBFBbd3LG6mBk1J_I-TpQF3myuA/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          recipients,
          logoUrl: 'https://flash-pay-937d7.web.app/logo.png'
        })
      });
    }

    // Create in-app notifications for ALL users (if enabled)
    let notificationsCreated = 0;
    if (options.sendNotification) {
      const notificationsRef = collection(db, 'notifications');
      const createdAt = Date.now();
      const broadcastId = `${createdAt}-${Math.random().toString(36).slice(2, 9)}`;

      for (const userId of allUserIds) {
        try {
          await addDoc(notificationsRef, {
            userId,
            title,
            body,
            type: 'broadcast',
            read: false,
            createdAt,
            broadcastId,
            icon: '📢',
            priority: 'high'
          });
          notificationsCreated++;
        } catch (err) {
          console.error(`Failed to create notification for user ${userId}:`, err);
        }
      }
    }

    // Log to Firestore for audit trail
    await addAdminBroadcastLog({
      title,
      body,
      recipientCount: recipients.length,
      notificationsCreated,
      status: 'sent',
      sendEmail: options.sendEmail,
      sendNotification: options.sendNotification,
      createdAt: Date.now()
    });

    console.log(`✅ Broadcast complete: ${recipients.length} emails, ${notificationsCreated} notifications`);
    return { sent: recipients.length + notificationsCreated, failed: 0 };
  } catch (err) {
    console.error('Failed to send broadcast:', err);
    // Still log the failed attempt
    await addAdminBroadcastLog({
      title,
      body,
      recipientCount: 0,
      status: 'failed',
      error: String(err),
      createdAt: Date.now()
    });
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
