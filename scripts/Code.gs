/**
 * SCRIPT GOOGLE APPS SCRIPT POUR FLASH PAY
 * Copiez ce code et collez-le dans votre projet sur script.google.com
 */

function doPost(e) {
  var result = {
    "status": "error",
    "message": "Requête invalide"
  };
  
  try {
    // Lecture des données envoyées par l'application
    var data = JSON.parse(e.postData.contents);
    var recipient = data.recipient;
    var subject = data.subject;
    var htmlBody = data.htmlBody;
    
    // Vérification des champs obligatoires
    if (!recipient || !subject || !htmlBody) {
      throw new Error("Champs obligatoires manquants (recipient, subject, htmlBody)");
    }

    // Envoi de l'email via le service Gmail de Google
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody,
      name: "Flash Pay" // Nom de l'expéditeur qui apparaîtra dans la boîte aux lettres
    });

    result.status = "success";
    result.message = "Email envoyé avec succès à " + recipient;
    
  } catch (error) {
    result.status = "error";
    result.message = error.toString();
  }

  // Retour de la réponse au format JSON pour l'application React
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
