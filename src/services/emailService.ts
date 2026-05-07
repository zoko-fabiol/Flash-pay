import axios from 'axios';

// URL de votre script Google Apps Script (À remplacer par l'URL obtenue à l'étape 1)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxbIrQTSE586Ewd0DxririCkuB2vAvnae5cFIFKoGgpI-jBn08f0OV8ny8WCLWTkzhi7A/exec';

export const emailService = {
  /**
   * Envoie un email via Google Apps Script
   */
  async sendEmail(recipient: string, subject: string, htmlBody: string) {
    if (!GAS_URL || GAS_URL.includes('VOTRE_URL')) {
      console.warn('URL Google Apps Script non configurée.');
      return;
    }

    try {
      // Utilisation d'une requête simple pour éviter les problèmes de CORS avec GAS
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // Mode no-cors pour éviter les erreurs de redirection Google
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          recipient,
          subject,
          htmlBody
        })
      });
      console.log('Requête d\'envoi d\'email transmise à GAS');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  },

  /**
   * Génère le template HTML pour la vérification
   */
  getVerificationTemplate(code: string) {
    return `
      <div style="font-family: sans-serif; background-color: #f7f3ff; padding: 40px; text-align: center;">
        <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; border: 1px solid #eadfff;">
          <h1 style="color: #6236CC; margin-bottom: 8px;">FLASH PAY</h1>
          <h2 style="color: #1e293b;">Code de vérification</h2>
          <p style="color: #64748b; font-size: 15px;">Voici votre code de validation pour finaliser votre inscription :</p>
          <div style="background-color: #f7f3ff; color: #6236CC; font-size: 32px; font-weight: 900; padding: 20px; border-radius: 16px; margin: 30px 0; letter-spacing: 5px; border: 2px dashed #6236CC;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Ce code expirera bientôt. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      </div>
    `;
  },

  /**
   * Génère le template HTML pour la notification de transfert (Admin)
   */
  getAdminTransferTemplate(txData: any) {
    return `
      <div style="font-family: sans-serif; background-color: #f8fafc; padding: 30px;">
        <div style="background-color: #ffffff; border-radius: 20px; padding: 30px; border-left: 6px solid #6236CC;">
          <div style="font-size: 12px; font-weight: bold; color: #6236CC; text-transform: uppercase; margin-bottom: 15px;">Nouveau Transfert à traiter</div>
          <div style="font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 20px;">${txData.amount} ${txData.currency}</div>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; font-size: 14px;">
            <div style="margin-bottom: 8px;"><strong>Client :</strong> ${txData.clientName}</div>
            <div style="margin-bottom: 8px;"><strong>Bénéficiaire :</strong> ${txData.receiverName}</div>
            <div style="margin-bottom: 8px;"><strong>Pays :</strong> ${txData.country}</div>
            <div style="margin-bottom: 8px;"><strong>ID Transaction :</strong> ${txData.txId}</div>
          </div>
          <p style="margin-top: 20px;"><a href="https://flashpay-admin.web.app" style="background-color: #6236CC; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Accéder au Panel Admin</a></p>
        </div>
      </div>
    `;
  }
};
