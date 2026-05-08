import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);

export interface AdminBroadcast {
  title: string;
  body: string;
  createdAt: number;
}

export async function addAdminBroadcast(item: AdminBroadcast) {
  const col = collection(db, 'admin_broadcasts');
  return await addDoc(col, { ...item, status: 'pending' });
}

export default { addAdminBroadcast };
