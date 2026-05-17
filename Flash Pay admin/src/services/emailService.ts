import axios from 'axios';

// URL de votre script Google Apps Script
const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbyfnpE8gpa-_uVnhEvlJN4WnvgUjdpekThBgfZHkvoyyCErm8O9QV0LuFoMGNvKN9sCZQ/exec';

export const emailService = {
  /**
   * Envoie un email via Google Apps Script
   */
  async sendEmail(recipient: string | string[], subject: string, htmlBody: string) {
    const recipients = Array.isArray(recipient) ? recipient : [recipient];
    try {
      // URL absolue pour supporter l'APK (qui n'a pas de domaine relatif)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://flash-pay.site';
      const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients,
          title: subject,
          body: htmlBody
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      console.log('Email envoyé via proxy Netlify');
    } catch (proxyError) {
      console.warn('Proxy Netlify échoué, tentative directe vers GAS...', proxyError);
      
      if (!GAS_URL || GAS_URL.includes('VOTRE_URL')) {
        throw new Error('URL Google Apps Script non configurée.');
      }

      try {
        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            recipients: recipients,
            title: subject,
            body: htmlBody
          })
        });
        console.log('Email envoyé via GAS (direct)');
      } catch (error) {
        console.error('Échec total de l\'envoi d\'email:', error);
        throw error;
      }
    }
  },

  /**
   * Génère le template HTML pour la vérification
   */
  getVerificationTemplate(code: string) {
    return `
      <div style="font-family: sans-serif; background-color: #F5E8FF; padding: 40px; text-align: center;">
        <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; border: 1px solid #eadfff;">
          <h1 style="color: #6344B6; margin-bottom: 8px;">FLASH PAY</h1>
          <h2 style="color: #1e293b;">Code de vérification</h2>
          <p style="color: #64748b; font-size: 15px;">Voici votre code de validation pour finaliser votre inscription :</p>
          <div style="background-color: #F5E8FF; color: #6344B6; font-size: 32px; font-weight: 900; padding: 20px; border-radius: 16px; margin: 30px 0; letter-spacing: 5px; border: 2px dashed #6344B6;">
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
        <div style="background-color: #ffffff; border-radius: 20px; padding: 30px; border-left: 6px solid #6344B6;">
          <div style="font-size: 12px; font-weight: bold; color: #6344B6; text-transform: uppercase; margin-bottom: 15px;">Nouveau Transfert à traiter</div>
          <div style="font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 20px;">${txData.amount} ${txData.currency}</div>
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; font-size: 14px;">
            <div style="margin-bottom: 8px;"><strong>Client :</strong> ${txData.clientName}</div>
            <div style="margin-bottom: 8px;"><strong>Bénéficiaire :</strong> ${txData.receiverName}</div>
            <div style="margin-bottom: 8px;"><strong>Pays :</strong> ${txData.country}</div>
            <div style="margin-bottom: 8px;"><strong>ID Transaction :</strong> ${txData.txId}</div>
          </div>
          <p style="margin-top: 20px;"><a href="https://admin.flash-pay.site/#/queue/${txData.txId}" style="background-color: #6344B6; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Accéder au Panel Admin</a></p>
        </div>
      </div>
    `;
  },

  /**
   * Génère le template HTML pour un transfert réussi
   */
  getTransferSuccessTemplate(txData: any) {
    return `
      <div style="font-family: sans-serif; background-color: #F5E8FF; padding: 40px; text-align: center;">
        <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; border: 1px solid #eadfff; text-align: left;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background-color: #e8fff3; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="color: #10b981; font-size: 30px;">✓</span>
            </div>
            <h1 style="color: #1e293b; margin: 0; font-size: 24px;">Transfert Réussi !</h1>
            <p style="color: #64748b; margin-top: 8px;">Votre argent a été envoyé avec succès.</p>
          </div>
          
          <div style="background-color: #F5E8FF; padding: 20px; border-radius: 16px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-size: 13px;">Montant envoyé :</span>
              <span style="color: #1e293b; font-weight: bold;">${txData.amount} ${txData.currency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-size: 13px;">Bénéficiaire :</span>
              <span style="color: #1e293b; font-weight: bold;">${txData.recipientName}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 13px;">ID Transaction :</span>
              <span style="color: #1e293b; font-size: 11px;">${txData.txId}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">Merci d'avoir choisi Flash Pay pour vos transferts.</p>
            <a href="https://flash-pay.site" style="background-color: #6344B6; color: white; padding: 14px 28px; border-radius: 14px; text-decoration: none; font-weight: bold; display: inline-block;">Voir mes transactions</a>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Génère le template HTML pour un message personnalisé
   */
  getCustomMessageTemplate(message: string, userName?: string) {
    const greeting = userName ? `Bonjour <strong>${userName}</strong>,<br><br>` : 'Bonjour,<br><br>';
    const formattedMessage = message.replace(/\n/g, '<br>');
    return `
      <div style="font-family: sans-serif; background-color: #F5E8FF; padding: 40px;">
        <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; max-width: 500px; margin: 0 auto; border: 1px solid #eadfff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6344B6; margin: 0; font-size: 28px;">FLASH PAY</h1>
            <div style="height: 2px; width: 40px; background-color: #6344B6; margin: 15px auto;"></div>
          </div>
          
          <div style="color: #1e293b; font-size: 16px; line-height: 1.6;">
            ${greeting}
            ${formattedMessage}
          </div>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">L'équipe Flash Pay</p>
            <p style="color: #cbd5e1; font-size: 11px; margin-top: 8px;">Ceci est un message officiel de Flash Pay.</p>
          </div>
        </div>
      </div>
    `;
  }
};


