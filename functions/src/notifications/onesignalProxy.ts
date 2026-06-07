import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

export const onesignal = functions.https.onRequest(async (req, res) => {
  // Configurer CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const DEFAULT_APP_ID = process.env.ONESIGNAL_APP_ID || '3b38ca69-e5eb-40a7-8b46-48942086dcb3';
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || functions.config().onesignal?.rest_api_key;
  const ADMIN_ONESIGNAL_REST_API_KEY = process.env.ADMIN_ONESIGNAL_REST_API_KEY || functions.config().onesignal?.admin_rest_api_key || ONESIGNAL_REST_API_KEY;
  const ADMIN_APP_ID = process.env.VITE_ADMIN_ONESIGNAL_APP_ID || '987f03ae-6b3f-49ca-9fd4-da1d6323d31e';

  try {
    const payload = req.body || {};
    const appId = payload.app_id || DEFAULT_APP_ID;

    if (!appId) {
      res.status(400).json({ error: 'Missing app_id' });
      return;
    }

    let apiKey = ONESIGNAL_REST_API_KEY;
    if (appId === ADMIN_APP_ID) {
      apiKey = ADMIN_ONESIGNAL_REST_API_KEY;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'OneSignal REST API Key missing',
        details: `REST API Key missing for appId: ${appId}`
      });
      return;
    }

    const oneSignalBody: any = {
      app_id: appId,
      headings: { en: payload.title, fr: payload.title },
      contents: { en: payload.body, fr: payload.body },
      data: payload.data || {}
    };

    if (payload.broadcast) {
      oneSignalBody.included_segments = ['All'];
    } else if (payload.userId) {
      oneSignalBody.include_external_user_ids = [payload.userId];
    } else {
      oneSignalBody.included_segments = ['All'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(oneSignalBody)
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unexpected function error' });
  }
});
