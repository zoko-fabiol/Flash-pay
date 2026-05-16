import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);

const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbyfnpE8gpa-_uVnhEvlJN4WnvgUjdpekThBgfZHkvoyyCErm8O9QV0LuFoMGNvKN9sCZQ/exec';

export interface AdminBroadcast {
  title: string;
  body: string;
  createdAt: number;
}

export interface BroadcastOptions {
  sendEmail?: boolean;
}

export async function sendBroadcastDirect(
  title: string,
  body: string,
  options: BroadcastOptions = { sendEmail: true }
): Promise<{ sent: number; failed: number }> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const recipients = usersSnap.docs
      .map((doc) => (doc.data() as any).email)
      .filter((email): email is string => typeof email === 'string' && email.length > 0);

    if (options.sendEmail && recipients.length > 0) {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          recipients,
          title,
          body,
        }),
      });
    }

    await addDoc(collection(db, 'admin_broadcasts'), {
      title,
      body,
      status: 'sent',
      sentViaClient: true,
      recipientCount: recipients.length,
      createdAt: Date.now(),
    });

    return { sent: recipients.length, failed: 0 };
  } catch (error) {
    console.error('Failed to send broadcast directly:', error);
    return { sent: 0, failed: 1 };
  }
}

export async function addAdminBroadcast(item: AdminBroadcast) {
  const col = collection(db, 'admin_broadcasts');
  return await addDoc(col, { ...item, status: 'pending' });
}

export default { addAdminBroadcast, sendBroadcastDirect };
