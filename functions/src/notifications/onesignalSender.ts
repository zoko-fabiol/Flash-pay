import fetch from 'node-fetch';

/**
 * Sends a push notification to a specific user via OneSignal REST API
 * This runs on the server (Firebase Functions) to avoid CORS issues and protect the API Key.
 */
export async function sendOneSignalToUser(userId: string, title: string, body: string, data: any = {}) {
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '3b38ca69-e5eb-40a7-8b46-48942086dcb3';
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ OneSignal REST API Key missing in environment variables');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: title, fr: title },
        contents: { en: body, fr: body },
        data: data
      })
    });

    const result = await response.json();
    console.log(`✅ OneSignal push sent to user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error sending OneSignal notification to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Broadcasts a notification to all subscribed users via OneSignal
 */
export async function broadcastOneSignal(title: string, body: string, data: any = {}) {
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '3b38ca69-e5eb-40a7-8b46-48942086dcb3';
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ OneSignal REST API Key missing in environment variables');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title, fr: title },
        contents: { en: body, fr: body },
        data: data
      })
    });

    const result = await response.json();
    console.log('✅ OneSignal broadcast sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error broadcasting OneSignal notification:', error);
    throw error;
  }
}
