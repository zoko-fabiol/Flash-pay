/**
 * OneSignal Service for Admin Portal
 * Sends push notifications directly via OneSignal REST API
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

export const oneSignalService = {
  async sendNotificationToUser(userId: string, title: string, body: string, data: any = {}) {
    console.log('[OneSignal Disabled] Not sending notification to user', userId);
    return { success: true };
  },

  async broadcastNotification(title: string, body: string, data: any = {}) {
    console.log('[OneSignal Disabled] Not broadcasting notification');
    return { success: true };
  }
};
