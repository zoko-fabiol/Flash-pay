export const initializePushNotifications = async (userId?: string) => {
  // Push notifications disabled by user request
  console.log('Push notifications are disabled.');
};

export async function requestNotificationPermissionFromUser(): Promise<boolean> {
  return false;
}

export async function getCurrentPushToken(): Promise<string | null> {
  return null;
}

