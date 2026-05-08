import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();

// Get Apps Script URL from runtime config
const appsScriptUrl = functions.config().apps?.script_url || 
  'https://script.google.com/macros/s/AKfycbxMM0PgmUvuAyJ-5BP4R36u5aHbhSKF-OrwtmeW-ULdHJ3qzNOmM6_hI8Yopb65aAL6OQ/exec';

/**
 * Send confirmation email when transfer is confirmed
 * Triggers on transactions collection update
 */
export const onTransactionConfirmed = functions.firestore
  .document('transactions/{transactionId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only process if status changed to 'confirmed' or 'completed'
    const statusChanged = before?.status !== after?.status;
    const isConfirmed = after?.status === 'confirmed' || after?.status === 'completed';

    if (!statusChanged || !isConfirmed) {
      return null;
    }

    try {
      // Extract user email and transaction details
      const userEmail = after?.userEmail || after?.email;
      const userName = after?.userName || after?.name || 'User';
      const amount = after?.amount || 0;
      const transactionId = change.after.id;
      const currency = after?.currency || 'USD';
      const recipientName = after?.recipientName || 'Unknown';
      const transferDate = after?.confirmedAt || after?.createdAt || Date.now();

      if (!userEmail) {
        console.warn(`No email found for transaction ${transactionId}`);
        return null;
      }

      // Build email content
      const emailData = {
        type: 'transfer_confirmation',
        recipients: [userEmail],
        data: {
          transactionId,
          userName,
          amount,
          currency,
          recipientName,
          transferDate,
          status: after?.status,
          logoUrl: 'https://flash-pay-937d7.web.app/logo.png'
        }
      };

      // Call Google Apps Script to send email
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(emailData),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`Failed to send confirmation email: ${response.statusText}`);
        return null;
      }

      // Log email sent to Firestore
      await db.collection('email_logs').add({
        type: 'transfer_confirmation',
        transactionId,
        email: userEmail,
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          amount,
          currency,
          recipientName
        }
      });

      console.log(`Confirmation email sent to ${userEmail} for transaction ${transactionId}`);
      return null;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return null;
    }
  });

export default { onTransactionConfirmed };
