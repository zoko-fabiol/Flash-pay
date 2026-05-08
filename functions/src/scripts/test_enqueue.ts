import { initAdmin } from '../utils/admin';

async function run() {
  const admin = initAdmin();
  const db = admin.firestore();
  const sample = {
    userId: 'test-user',
    payload: { title: 'Test', body: 'This is a test notification' },
    channels: ['fcm'],
    status: 'pending',
    scheduledFor: Date.now(),
    attempts: 0,
  };
  const ref = await db.collection('notification_queue').add(sample);
  console.log('Enqueued test notification id=', ref.id);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
