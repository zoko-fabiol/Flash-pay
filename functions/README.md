Flash Pay Cloud Functions

This folder contains Cloud Functions for processing notifications with a free stack: Firestore triggers + FCM push + in-app notifications.

Setup
1. Install deps: `cd functions && npm install`
2. Deploy: `firebase deploy --only functions` or use emulators for local testing.

Local testing
- Build the functions: `cd functions && npm run build`
- Start functions emulator (requires `firebase-tools`):
   - `npx firebase emulators:start --only functions --project flash-pay-dev`
- Enqueue a test notification (after setting credentials or using emulator credentials):
   - `node lib/scripts/test_enqueue.js`

Production deploy
- `firebase deploy --only functions`

Notes
- The functions assume `fcm_tokens/{userId}/tokens` holds user push tokens documents with `{ token, createdAt }`.
- In-app notifications are written to `notifications/{userId}/items`.
- Delivery queue is `notification_queue` documents with fields: `userId, payload, channels, status, scheduledFor, attempts`.
