/**
 * OneSignal Service for Admin Portal
 * Sends push notifications directly via OneSignal REST API
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

export const oneSignalService = {
  /**
   * Send a push notification to a specific user via Netlify Function Proxy
   */
  async sendNotificationToUser(userId: string, title: string, body: string, data: any = {}) {
    try {
      console.log(`[OneSignal] Sending notification via proxy...`);
      const response = await fetch('/.netlify/functions/onesignal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          body,
          data
        })
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error sending notification via Netlify:', error);
      // Fallback message to help debugging
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('[OneSignal] The proxy function might be missing or blocked by CORS. Check if Netlify Functions are deployed.');
      }
      throw error;
    }
  },

  /**
   * Broadcast a notification to all users via Netlify Function Proxy
   */
  async broadcastNotification(title: string, body: string, data: any = {}) {
    try {
      const response = await fetch('/.netlify/functions/onesignal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast: true,
          title,
          body,
          data
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error broadcasting via Netlify:', error);
      throw error;
    }
  }
};
