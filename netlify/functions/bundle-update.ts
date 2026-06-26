import type { Handler } from '@netlify/functions';

/**
 * Endpoint de mise à jour du bundle JS Flash Pay
 * 
 * Le plugin @capgo/capacitor-updater appelle cet endpoint au démarrage de l'app.
 * Il envoie les infos de la version actuelle, et reçoit en réponse la dernière version disponible.
 * 
 * Si la version du serveur est différente → le plugin télécharge automatiquement le bundle.
 * Si aucune mise à jour → on retourne {} et le plugin ne fait rien.
 * 
 * METTRE À JOUR ces valeurs à chaque nouvelle release JS :
 * - LATEST_VERSION  : numéro de version (ex: "1.1.2")
 * - BUNDLE_URL      : URL directe vers le zip du bundle sur GitHub Releases
 */

const LATEST_VERSION = '1.1.1';
const BUNDLE_URL = 'https://github.com/zoko-fabiol/Flash-pay/releases/download/v1.1.1/bundle.zip';

export const handler: Handler = async (event) => {
  // Autoriser les requêtes du plugin Capacitor
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Lire la version actuelle envoyée par le plugin
    let currentVersion = '';
    if (event.body) {
      const body = JSON.parse(event.body);
      currentVersion = body.version_name || body.version || '';
    }

    console.log(`[bundle-update] Device version: "${currentVersion}" | Latest: "${LATEST_VERSION}"`);

    // Si la version actuelle est déjà la dernière → pas de mise à jour
    if (currentVersion === LATEST_VERSION) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({}),
      };
    }

    // Nouvelle version disponible → retourner l'URL du bundle
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        version: LATEST_VERSION,
        url: BUNDLE_URL,
      }),
    };
  } catch (error: any) {
    console.error('[bundle-update] Error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({}), // En cas d'erreur → ne pas crasher l'app
    };
  }
};
