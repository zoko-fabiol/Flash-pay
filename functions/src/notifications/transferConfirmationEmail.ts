import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();

// Get Apps Script URL from runtime config
const appsScriptUrl = functions.config().apps?.script_url || 
  'https://script.google.com/macros/s/AKfycbxA_g3PdHmxw3QVvttBEiFBHQa0DexwEpVckTBRDG377OvWHX2Xzzw4tL2SLso5_C-9Mg/exec';

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

      const amountText = `${amount} ${currency}`;
      const subject = `Flash Pay - Transfert ${after?.status === 'completed' ? 'complété' : 'confirmé'}`;
      const body = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.6;">
          <h2 style="margin: 0 0 12px; color: #661489;">Votre transfert a été ${after?.status === 'completed' ? 'complété' : 'confirmé'}</h2>
          <p style="margin: 0 0 12px;">Bonjour ${userName},</p>
          <p style="margin: 0 0 12px;">Nous vous confirmons que votre transfert de <strong>${amountText}</strong> vers <strong>${recipientName}</strong> a bien été traité.</p>
          <p style="margin: 0 0 12px;">Référence transaction: <strong>${transactionId}</strong></p>
          <p style="margin: 0;">Date: <strong>${new Date(transferDate).toLocaleString('fr-FR')}</strong></p>
        </div>
      `;

      // Build email content
      const emailData = {
        type: 'transfer_confirmation',
        title: subject,
        body,
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
