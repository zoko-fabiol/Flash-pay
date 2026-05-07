import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { userService } from '../services/firebase';

export const initializePushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not supported on web.');
    return;
  }

  // Request permission to use push notifications
  // iOS will prompt a system dialog, Android will check if it's enabled
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('Push notification permission denied.');
    return;
  }

  // Register with Apple / Google to receive push notifications
  await PushNotifications.register();

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    try {
      await userService.savePushToken(userId, token.value);
    } catch (err) {
      console.error('Error saving push token to Firestore:', err);
    }
  });

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};
