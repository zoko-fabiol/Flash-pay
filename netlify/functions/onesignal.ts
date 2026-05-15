import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Netlify Function to proxy OneSignal requests
 * Supports both Client and Admin apps
 */
const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const DEFAULT_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  const ADMIN_ONESIGNAL_REST_API_KEY = process.env.ADMIN_ONESIGNAL_REST_API_KEY;
  const ADMIN_APP_ID = process.env.VITE_ADMIN_ONESIGNAL_APP_ID;

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const appId = payload.app_id || DEFAULT_APP_ID;

    if (!appId) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing app_id' }) };
    }

    // Select the correct REST API Key
    let apiKey = ONESIGNAL_REST_API_KEY || process.env.VITE_ONESIGNAL_REST_API_KEY;
    
    // If it's the admin app, prioritize the admin key
    if (appId === ADMIN_APP_ID && ADMIN_APP_ID) {
      apiKey =
        ADMIN_ONESIGNAL_REST_API_KEY ||
        process.env.VITE_ADMIN_ONESIGNAL_REST_API_KEY ||
        ONESIGNAL_REST_API_KEY ||
        process.env.VITE_ONESIGNAL_REST_API_KEY;
    }

    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'OneSignal REST API Key missing',
          details: `Neither ONESIGNAL_REST_API_KEY nor ADMIN_ONESIGNAL_REST_API_KEY found for appId: ${appId}`
        }) 
      };
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
      // If no target specified, default to All for the specified app
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

    const rawText = await response.text();
    let result: any = {};

    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch {
      result = { raw: rawText };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'OneSignal upstream request failed',
          oneSignal: result
        })
      };
    }
    
    return {
      statusCode: response.status,
      headers: CORS_HEADERS,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error?.message || 'Unexpected function error' })
    };
  }
};

export { handler };
