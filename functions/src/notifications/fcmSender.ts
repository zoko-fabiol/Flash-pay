import { getFirestore, getMessaging } from '../utils/admin';

export async function sendFcmToUser(userId: string, payload: admin.messaging.MulticastMessage | admin.messaging.Message) {
  const db = getFirestore();
  const messaging = getMessaging();

  // Read tokens from collection: fcm_tokens/{userId}/tokens
  const tokensSnap = await db.collection('fcm_tokens').doc(userId).collection('tokens').get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean) as string[];
  if (tokens.length === 0) return { success: false, reason: 'no_tokens' };

  // If payload is a single Message, convert to multicast
  if ('token' in (payload as any) && !('tokens' in payload)) {
    // send to single token
    try {
      const res = await messaging.send(payload as any);
      return { success: true, result: res };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  // Multicast
  try {
    const multicast = await messaging.sendMulticast({
      ...(payload as any),
      tokens,
    });
    // Optionally: remove invalid tokens
    const invalidTokens: string[] = [];
    multicast.responses.forEach((r, i) => {
      if (!r.success) {
        const err = r.error;
        if (err && (err.code === 'messaging/invalid-registration-token' || err.code === 'messaging/registration-token-not-registered')) {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    if (invalidTokens.length) {
      const batch = db.batch();
      const tokenCol = db.collection('fcm_tokens').doc(userId).collection('tokens');
      const snap = await tokenCol.where('token', 'in', invalidTokens).get();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return { success: true, result: multicast }; 
  } catch (error) {
    return { success: false, error };
  }
}
