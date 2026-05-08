Flash Pay Cloud Functions

This folder contains Cloud Functions for processing notifications: enqueuing on Firestore triggers, a scheduled queue processor, and senders for FCM/Email/SMS.

Setup
1. Install deps: `cd functions && npm install`
2. Configure environment variables (emulator or production):
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM` (optional)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
3. Deploy: `firebase deploy --only functions` or use emulators for local testing.

Notes
- The functions assume `fcm_tokens/{userId}/tokens` holds user push tokens documents with `{ token, createdAt }`.
- In-app notifications are written to `notifications/{userId}/items`.
- Delivery queue is `notification_queue` documents with fields: `userId, payload, channels, email, phone, status, scheduledFor, attempts`.
