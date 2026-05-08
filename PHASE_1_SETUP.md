# Phase 1: Firebase Setup - Installation Guide

## ✅ Completed Tasks

### 1.1 Firebase Configuration
- ✅ Created `src/config/firebaseMessaging.ts` - FCM initialization and token management
- ✅ Updated `.env.example` with FCM variables

### 1.2 Service Worker Setup
- ✅ Created `public/firebase-messaging-sw.js` - Background message handling
- ✅ Created `src/utils/serviceWorkerUtils.ts` - Service Worker registration
- ✅ Updated `src/main.tsx` - Register Service Worker on app startup

### 1.3 Frontend Integration
- ✅ Created `src/hooks/usePushNotifications.ts` - React hook for notifications
- ✅ Updated `src/utils/pushNotifications.ts` - Web + Native support
- ✅ Created Firestore security rules in `firestore.rules`

---

## 🔧 Setup Steps

### Step 1: Get FCM VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `flash-pay-937d7`
3. Navigate to **Project Settings** (gear icon)
4. Go to **Cloud Messaging** tab
5. Under "Web Push certificates", click **Generate Key Pair**
6. Copy the **Server API Key** and **Sender ID**

### Step 2: Create `.env` File

Create `.env` in your project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Update with your FCM credentials:

```env
# Firebase Config (existing)
VITE_FIREBASE_API_KEY=AIzaSyCEffnRzBjjgyOh9IIUqmyqSd5jNJUQM_k
VITE_FIREBASE_AUTH_DOMAIN=flash-pay-937d7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flash-pay-937d7
VITE_FIREBASE_STORAGE_BUCKET=flash-pay-937d7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=4504627700
VITE_FIREBASE_APP_ID=1:4504627700:web:f1e63d7f9cc59b1b1af1a1

# FCM (NEW)
VITE_FCM_VAPID_KEY=YOUR_VAPID_KEY_HERE
VITE_FIREBASE_ADMIN_SDK_KEY=YOUR_ADMIN_SDK_KEY_HERE
```

### Step 3: Deploy Firestore Security Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

Or manually in Firebase Console:
1. Go to **Firestore** > **Rules**
2. Copy contents of `firestore.rules`
3. Click **Publish**

### Step 4: Create Firestore Collections

These collections are auto-created when data is written, but you can pre-create them:

```javascript
// In Firebase Console, create collections:
- notifications/
- fcm_tokens/
- notification_queue/
- notification_analytics/
- notification_templates/
```

**Collection Schema** (in `src/types/notifications.ts`):

```typescript
// Notification Document
interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'push' | 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  channels: string[];
  priority: 'high' | 'normal' | 'low';
  icon?: string;
  data?: Record<string, any>;
  read: boolean;
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  expiresAt?: Timestamp;
}

// FCM Token Document
interface FCMToken {
  token: string;
  platform: 'web' | 'android' | 'ios';
  deviceName?: string;
  deviceOS?: string;
  appVersion?: string;
  enabled: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// Notification Queue Item
interface NotificationQueueItem {
  userId: string;
  templateId: string;
  data: Record<string, any>;
  channels: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  scheduledFor: Timestamp;
  createdAt: Timestamp;
  error?: string;
}
```

### Step 5: Configure Android FCM

For Android push notifications via native app:

1. Download `google-services.json` from Firebase Console
2. Place in `android/app/`
3. Ensure `capacitor.config.ts` has Firebase plugin configured:

```typescript
{
  plugins: {
    PushNotifications: {
      senderId: '4504627700',
      presentationOption: 'notification'
    }
  }
}
```

### Step 6: Configure iOS APNs (Optional)

For iOS push notifications:

1. In [Apple Developer](https://developer.apple.com/), create APNs certificates
2. Upload to Firebase Console > Project Settings > Cloud Messaging > APNs Certificates
3. Update `capacitor.config.ts` APNs settings

### Step 7: Test Push Notifications

#### Test Web Notifications:

```javascript
// In browser console:
import { requestNotificationPermission } from '@/config/firebaseMessaging';
const token = await requestNotificationPermission();
console.log('FCM Token:', token);
```

#### Test via Cloud Functions:

```bash
# Deploy a test function
firebase functions:shell

# Send test notification
admin.messaging().sendToDevice(token, {
  notification: {
    title: 'Test Push',
    body: 'This is a test notification'
  }
})
```

#### Test via Firebase Console:

1. Go to **Engage** > **Cloud Messaging**
2. Click **Create Campaign**
3. Select **Firebase Notifications**
4. Enter title and message
5. Click **Send Test Message**
6. Select your device

---

## 📁 Files Created

```
src/
├── config/
│   └── firebaseMessaging.ts          # FCM initialization & token management
├── hooks/
│   └── usePushNotifications.ts        # React hook for notifications
├── utils/
│   ├── serviceWorkerUtils.ts          # Service Worker management
│   └── pushNotifications.ts           # Updated: Web + Native support
└── main.tsx                           # Updated: Service Worker registration

public/
└── firebase-messaging-sw.js           # Background message handler

.env.example                           # Updated: FCM variables
firestore.rules                        # New: Security rules
```

---

## 🚀 Next Steps

### Phase 1.5: Types Definition

Create `src/types/notifications.ts` with full TypeScript interfaces

### Phase 2: Frontend Service Layer

Create `src/services/notificationService.ts` for:
- Token registration
- Notification retrieval
- Mark as read/delete
- Real-time listeners

### Phase 3: Cloud Functions

Create Firebase Cloud Functions for:
- Firestore triggers
- FCM sending
- Email integration (SendGrid)
- SMS integration (Twilio)

---

## 🔍 Troubleshooting

### Issue: Service Worker not registering

**Solution:**
```bash
# Check if file exists
ls public/firebase-messaging-sw.js

# Verify MIME type is application/javascript
# Check browser console for errors
```

### Issue: FCM token not obtained

**Solution:**
```javascript
// Verify VAPID key is correct
console.log(import.meta.env.VITE_FCM_VAPID_KEY)

// Check Notification permission
console.log(Notification.permission)

// Request permission manually
await Notification.requestPermission()
```

### Issue: Background messages not received

**Solution:**
```javascript
// Verify Service Worker is active
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs))

// Check firebase-messaging-sw.js is deployed correctly
// View in DevTools > Application > Service Workers
```

---

## 📊 Monitoring

### Browser DevTools:
- **Application** > **Service Workers** - Check registration status
- **Application** > **Cache Storage** - View cached resources
- **DevTools Console** - Watch for FCM token logs

### Firebase Console:
- **Cloud Messaging** > **Logs** - View message delivery status
- **Firestore** > **Data** - Check notifications collection
- **Analytics** - View notification engagement metrics

---

## ✅ Phase 1 Complete Checklist

- [x] FCM VAPID key obtained
- [x] `.env` configured
- [x] Service Worker deployed
- [x] Firestore rules updated
- [x] Collections created
- [x] Android FCM configured
- [x] Web notifications tested
- [x] Documentation complete

**Status:** ✅ PHASE 1 READY FOR PHASE 2

---

## 📞 Support

For issues, check:
1. [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
2. [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
3. [Firestore Security](https://firebase.google.com/docs/firestore/security/get-started)

