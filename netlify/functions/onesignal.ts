import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * Netlify Function to proxy OneSignal requests
 * Supports both Client and Admin apps
 */
const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const DEFAULT_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_REST_API_KEY) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'OneSignal REST API Key missing' }) 
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    
    // Use the provided app_id or the default one
    const appId = payload.app_id || DEFAULT_APP_ID;

    if (!appId) {
      return { statusCode: 400, body: 'Missing app_id' };
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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(oneSignalBody)
    });

    const result = await response.json();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };
