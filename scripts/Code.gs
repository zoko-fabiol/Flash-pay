/**
 * SCRIPT GOOGLE APPS SCRIPT POUR FLASH PAY
 * Copiez ce code et collez-le dans votre projet sur script.google.com
 */

function doPost(e) {
  var result = { status: "error", message: "Requête invalide" };
  try {
    var data = JSON.parse(e.postData.contents);
    var recipients = data.recipients || [];
    var title = data.title || "";
    var body = data.body || "";

    if (!recipients.length || !title || !body) {
      throw new Error("Champs obligatoires manquants (recipients[], title, body)");
    }

    var subject = title;
    var htmlBody = body;

    // Si le corps du message n'est pas un template HTML complet (ne commence pas par un conteneur style), on l'emballe proprement avec le logo
    if (body.indexOf('<div') === -1) {
      var logoUrl = data.logoUrl || 'https://flash-pay.site/header-logo.png';
      htmlBody = '<div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height:1.4;">' +
        '<div style="padding:16px; text-align:left;">' +
        '<img src="' + logoUrl + '" alt="Flash Pay" style="height:40px; width:auto; display:block; margin-bottom:12px;" />' +
        '<div style="padding:8px 0;">' + body + '</div>' +
        '<hr style="border:none; border-top:1px solid #eee; margin-top:18px;" />' +
        '<div style="font-size:12px; color:#666; margin-top:8px;">Vous recevez cet email de la part de Flash Pay.</div>' +
        '</div></div>';
    }

    // Envoi par lot — garder un petit délai pour éviter les limites
    var sent = 0;
    for (var i = 0; i < recipients.length; i++) {
      try {
        MailApp.sendEmail({
          to: recipients[i],
          subject: subject,
          htmlBody: htmlBody,
          name: "Flash Pay"
        });
        sent++;
      } catch (err) {
        // Log et continuer
        Logger.log('Failed to send to: ' + recipients[i] + ' - ' + err);
      }
      // small delay to be polite (optional)
      Utilities.sleep(200);
    }

    result.status = "success";
    result.message = "Emails envoyés: " + sent + " / " + recipients.length;
  } catch (error) {
    result.status = "error";
    result.message = error.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fonction de test pour forcer l'autorisation Gmail
 * Sélectionnez "testMail" dans la liste et cliquez sur "Run" (Exécuter)
 */
function testMail() {
  var myEmail = Session.getActiveUser().getEmail();
  MailApp.sendEmail({
    to: myEmail,
    subject: "Test Configuration Flash Pay",
    htmlBody: "<h1>Succès !</h1><p>Si vous lisez ceci, votre script est autorisé à envoyer des emails.</p>",
    name: "Flash Pay Support"
  });
  Logger.log("Email de test envoyé à " + myEmail);
}

function doGet() {
  return ContentService.createTextOutput("Flash Pay Email Service is Online 🚀")
    .setMimeType(ContentService.MimeType.TEXT);
}
