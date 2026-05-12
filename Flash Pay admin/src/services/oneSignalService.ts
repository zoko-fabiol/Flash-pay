/**
 * OneSignal Service for Admin Portal
 * Sends push notifications directly via OneSignal REST API
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

export const oneSignalService = {
  /**
   * Send a push notification to a specific user
   * @param userId The internal Flash Pay user ID (used as an external ID in OneSignal)
   * @param title Title of the notification
   * @param body Body text of the notification
   * @param data Optional data payload for deep linking
   */
  async sendNotificationToUser(userId: string, title: string, body: string, data: any = {}) {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.warn('OneSignal credentials missing. Notification not sent.');
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
      console.log('OneSignal push result:', result);
      return result;
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
      throw error;
    }
  },

  /**
   * Broadcast a notification to all users
   */
  async broadcastNotification(title: string, body: string, data: any = {}) {
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

      return await response.json();
    } catch (error) {
      console.error('Error broadcasting OneSignal notification:', error);
      throw error;
    }
  }
};
