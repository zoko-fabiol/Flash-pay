# 📱 Plan Complet: Notifications Push Flash Pay

## 📋 Vue d'ensemble

**Objectif:** Implémenter un système de notifications push multicanal (Web, Android, iOS) avec priorités, scheduling et analytics.

**Timeline Estimée:** 7-10 jours (Phase 2.X)

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    USER EVENTS                              │
│  (Transaction, Transfer, KYC, Security, Referral)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│            FIREBASE CLOUD FUNCTIONS                         │
│  ┌──────────────────────────────────────────────────────────┤
│  │ • Firestore Triggers (onCreate, onUpdate)               │
│  │ • Notification Queue Processing                         │
│  │ • Multi-channel routing (FCM, Email, In-app)           │
│  │ • Scheduling & Retry Logic                             │
│  │ • Analytics & Logging                                  │
│  └──────────────────────────────────────────────────────────┤
└──────────────┬────────────────────────────────────────────────┘
               │
        ┌──────┴──────┬──────────────┬──────────────┐
        ↓             ↓              ↓              ↓
   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │   FCM   │  │  Email   │  │   SMS    │  │  In-App  │
   │ (Push)  │  │ (SendGrid)│  │ (Twilio) │  │(Firestore)
   └─────────┘  └──────────┘  └──────────┘  └──────────┘
        │             │              │              │
        ↓             ↓              ↓              ↓
   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Android │  │  Gmail   │  │ Numbers  │  │ In-app   │
   │   iOS   │  │ Inbox    │  │  + App   │  │ Drawer   │
   │  Web    │  └──────────┘  └──────────┘  └──────────┘
   └─────────┘
```

---

## 📦 Stack Technologique

### Frontend
- **Firebase Cloud Messaging (FCM)** - Push notifications
- **Service Workers** - Background message handling
- **Workbox** - PWA support
- **React Context/Zustand** - State management

### Backend
- **Firebase Cloud Functions** - Serverless logic
- **Firestore** - Message queue & history
- **Firebase Admin SDK** - Batch operations
- **SendGrid SDK** - Email delivery
- **Twilio SDK** - SMS delivery

### Monitoring
- **Firebase Analytics** - Event tracking
- **Cloud Logging** - Error tracking
- **Sentry** (optional) - Error reporting

---

## 📋 Collections Firestore Nécessaires

```firestore
notifications/
├── {userId}/
│   ├── {notificationId}
│   │   ├── type: 'push' | 'email' | 'sms' | 'in_app'
│   │   ├── title: string
│   │   ├── body: string
│   │   ├── icon: string (URL)
│   │   ├── data: { [key]: string } (métadonnées)
│   │   ├── channels: string[] (Android channels)
│   │   ├── priority: 'high' | 'normal' | 'low'
│   │   ├── status: 'pending' | 'sent' | 'delivered' | 'failed'
│   │   ├── read: boolean
│   │   ├── deletedAt: timestamp (soft delete)
│   │   ├── createdAt: timestamp
│   │   ├── sentAt: timestamp
│   │   └── expiresAt: timestamp
│
notification_templates/ (optional)
├── {templateId}
│   ├── name: string
│   ├── type: 'transaction' | 'security' | 'referral' | etc
│   ├── title: string (avec placeholders {{name}}, {{amount}})
│   ├── body: string
│   ├── actionUrl: string
│   ├── icon: string
│   ├── priority: 'high' | 'normal'
│   └── channels: string[]
│
notification_queue/ (optimisation)
├── {queueId}
│   ├── userId: string
│   ├── templateId: string
│   ├── data: object
│   ├── status: 'pending' | 'processing' | 'completed' | 'failed'
│   ├── retryCount: number
│   ├── maxRetries: number
│   ├── scheduledFor: timestamp
│   ├── createdAt: timestamp
│   └── error: string (si failed)
│
notification_analytics/
├── {date}/ (YYYY-MM-DD)
│   ├── totalSent: number
│   ├── totalDelivered: number
│   ├── totalFailed: number
│   ├── totalRead: number
│   ├── byType: { push: 0, email: 0, sms: 0, in_app: 0 }
│   ├── byPriority: { high: 0, normal: 0, low: 0 }
│   ├── byUser: number
│   └── avgDelayMs: number
│
fcm_tokens/
├── {userId}/
│   ├── {tokenId}
│   │   ├── token: string (FCM token)
│   │   ├── platform: 'web' | 'android' | 'ios'
│   │   ├── deviceName: string
│   │   ├── deviceOS: string
│   │   ├── appVersion: string
│   │   ├── enabled: boolean
│   │   ├── lastSeen: timestamp
│   │   ├── createdAt: timestamp
│   │   └── expiresAt: timestamp
```

---

## 🎯 Phase 1: Setup & Infrastructure (2 jours)

### 1.1 Firebase Configuration

**Tasks:**
- [ ] Activer Firebase Cloud Messaging (FCM)
- [ ] Générer Server API Key
- [ ] Configurer Web App Credentials
- [ ] Configurer Android FCM (google-services.json)
- [ ] Configurer APNs (iOS) - certificates + keys

**Fichiers à créer:**
```
config/firebase-messaging.ts
  - initializeMessaging()
  - requestNotificationPermission()
  - getRegistrationToken()
```

**Code exemple:**
```typescript
// config/firebase-messaging.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      });
      return token;
    }
  } catch (error) {
    console.error('Permission denied', error);
  }
}
```

### 1.2 Service Worker Setup

**Tasks:**
- [ ] Créer `public/firebase-messaging-sw.js`
- [ ] Configurer message handlers (foreground/background)
- [ ] Implémenter notification click handling
- [ ] Setup Workbox integration

**Fichier:**
```
public/firebase-messaging-sw.js
  - onBackgroundMessage handler
  - onNotificationClick handler
  - Notification display logic
```

### 1.3 Firestore Security Rules

**Tasks:**
- [ ] Mettre à jour les règles Firestore pour `notifications/`
- [ ] Protéger les tokens FCM
- [ ] Permettre lecture/écriture admin uniquement
- [ ] Ajouter validation timestamps

```firestore
rules
match /notifications/{userId}/{notificationId} {
  allow read: if request.auth.uid == userId;
  allow create: if request.auth.uid == userId || isAdmin();
  allow update, delete: if isAdmin();
}

match /fcm_tokens/{userId}/{tokenId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}
```

---

## 🔄 Phase 2: Service Layer Frontend (2 jours)

### 2.1 Notification Service

**Fichier:** `src/services/notificationService.ts`

**Functions:**
```typescript
// Token Management
- registerFCMToken(userId: string): Promise<string>
- updateFCMToken(userId: string, newToken: string): Promise<void>
- revokeFCMToken(userId: string, token: string): Promise<void>

// Notification Retrieval
- getUserNotifications(userId: string, limit?: number): Promise<Notification[]>
- getUnreadCount(userId: string): Promise<number>
- getNotificationById(userId: string, notificationId: string): Promise<Notification>

// Notification Management
- markAsRead(userId: string, notificationId: string): Promise<void>
- markAllAsRead(userId: string): Promise<void>
- deleteNotification(userId: string, notificationId: string): Promise<void> (soft delete)
- clearAllNotifications(userId: string): Promise<void>

// Real-time Listening
- subscribeToNotifications(userId: string, callback): Unsubscribe
- subscribeToUnreadCount(userId: string, callback): Unsubscribe
```

### 2.2 Notification Context

**Fichier:** `src/context/NotificationContext.tsx`

```typescript
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  subscribe: (callback) => void;
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (newNotifications) => {
        setNotifications(newNotifications);
        updateUnreadCount();
      }
    );
    
    return unsubscribe;
  }, [userId]);
  
  // ... context implementation
};
```

### 2.3 React Components

**Components à créer:**

```
src/components/notifications/
├── NotificationBell.tsx (icon + count badge)
├── NotificationDropdown.tsx (liste + actions)
├── NotificationItem.tsx (single notification)
├── NotificationToast.tsx (toast realtime)
├── NotificationSettings.tsx (preferences)
└── NotificationModal.tsx (detail view)
```

**NotificationBell.tsx:**
```typescript
export const NotificationBell = () => {
  const { unreadCount, notifications } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && <NotificationDropdown notifications={notifications} />}
    </div>
  );
};
```

---

## ☁️ Phase 3: Cloud Functions Backend (3 jours)

### 3.1 Notification Triggers

**Fichier:** `functions/src/notifications/triggers.ts`

**Triggers:**
```typescript
// Transaction Created
exports.onTransactionCreated = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap) => {
    const transaction = snap.data();
    await sendTransactionNotification(transaction);
  });

// Transaction Status Updated
exports.onTransactionStatusUpdated = functions.firestore
  .document('transactions/{transactionId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== after.status) {
      await sendStatusUpdateNotification(after);
    }
  });

// KYC Status Changed
exports.onKYCStatusChanged = functions.firestore
  .document('kyc/{userId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== after.status) {
      await sendKYCStatusNotification(after);
    }
  });

// Security Alert
exports.onSecurityAlert = functions.firestore
  .document('security_alerts/{alertId}')
  .onCreate(async (snap) => {
    const alert = snap.data();
    await sendSecurityNotification(alert);
  });

// Referral Reward
exports.onReferralReward = functions.firestore
  .document('referral_rewards/{rewardId}')
  .onCreate(async (snap) => {
    const reward = snap.data();
    await sendReferralNotification(reward);
  });
```

### 3.2 Notification Queue Processor

**Fichier:** `functions/src/notifications/queueProcessor.ts`

```typescript
export const processNotificationQueue = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    const batch = await db.collection('notification_queue')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', admin.firestore.Timestamp.now())
      .limit(100)
      .get();
    
    for (const doc of batch.docs) {
      try {
        await processQueueItem(doc.id, doc.data());
        await doc.ref.update({
          status: 'completed',
          processedAt: admin.firestore.Timestamp.now(),
        });
      } catch (error) {
        await handleQueueError(doc.id, error);
      }
    }
  });

async function processQueueItem(queueId: string, item: any) {
  const { userId, templateId, data, channels } = item;
  
  // Charger template
  const template = await loadTemplate(templateId);
  
  // Remplacer placeholders
  const title = replaceTemplateVariables(template.title, data);
  const body = replaceTemplateVariables(template.body, data);
  
  // Envoyer par tous les canaux demandés
  if (channels.includes('push')) {
    await sendPushNotification(userId, { title, body, icon: template.icon });
  }
  if (channels.includes('email')) {
    await sendEmailNotification(userId, { title, body });
  }
  if (channels.includes('sms')) {
    await sendSMSNotification(userId, { body });
  }
  
  // Créer notification in-app
  if (channels.includes('in_app')) {
    await createInAppNotification(userId, { title, body, data });
  }
}
```

### 3.3 FCM Notification Sender

**Fichier:** `functions/src/notifications/fcmSender.ts`

```typescript
export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
    priority?: 'high' | 'normal';
    android?: { priority: 'high' | 'normal'; };
    webpush?: { priority: 'high' | 'normal'; };
  }
) {
  // Récupérer tokens FCM de l'utilisateur
  const tokens = await db.collection('fcm_tokens')
    .doc(userId)
    .collection('tokens')
    .where('enabled', '==', true)
    .get();
  
  if (tokens.empty) {
    console.warn(`No FCM tokens found for user ${userId}`);
    return;
  }
  
  const tokenList = tokens.docs.map(doc => doc.data().token);
  
  // Envoyer via multicast
  try {
    const response = await admin.messaging().sendMulticast({
      tokens: tokenList,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon,
      },
      data: payload.data || {},
      priority: payload.priority || 'normal',
      android: {
        priority: payload.android?.priority || 'normal',
        notification: {
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          sound: 'default',
        },
      },
      webpush: {
        priority: payload.webpush?.priority || 'normal',
        fcmOptions: { link: 'https://flashpay.app' },
      },
    });
    
    // Tracker succès/échecs
    await trackMulticastResult(userId, response);
    
  } catch (error) {
    console.error('FCM send error:', error);
    throw error;
  }
}
```

### 3.4 Notification Factory

**Fichier:** `functions/src/notifications/factory.ts`

```typescript
interface NotificationFactory {
  createTransactionNotification(transaction: any): NotificationPayload;
  createStatusUpdateNotification(transaction: any): NotificationPayload;
  createKYCNotification(kyc: any): NotificationPayload;
  createSecurityNotification(alert: any): NotificationPayload;
  createReferralNotification(reward: any): NotificationPayload;
}

export const notificationFactory: NotificationFactory = {
  createTransactionNotification(tx: any) {
    return {
      title: `Transfer initiated`,
      body: `You initiated a transfer of ${tx.amount} ${tx.currency}`,
      icon: 'https://...',
      data: {
        type: 'transaction',
        transactionId: tx.id,
        deeplink: `/transactions/${tx.id}`,
      },
      priority: 'high',
      channels: ['push', 'email', 'in_app'],
    };
  },

  createStatusUpdateNotification(tx: any) {
    const statusMessages: Record<string, string> = {
      completed: '✅ Your transfer has been completed!',
      pending: '⏳ Your transfer is being processed',
      failed: '❌ Your transfer failed. Please try again.',
      cancelled: '🚫 Your transfer was cancelled',
    };

    return {
      title: `Transfer ${tx.status}`,
      body: statusMessages[tx.status] || `Status: ${tx.status}`,
      icon: 'https://...',
      data: {
        type: 'status_update',
        transactionId: tx.id,
        status: tx.status,
        deeplink: `/transactions/${tx.id}`,
      },
      priority: tx.status === 'failed' ? 'high' : 'normal',
      channels: ['push', 'email', 'in_app'],
    };
  },

  createKYCNotification(kyc: any) {
    return {
      title: `KYC ${kyc.status}`,
      body: kyc.status === 'approved' 
        ? '🎉 Congratulations! Your identity verification is approved'
        : '⏳ Your KYC verification is under review',
      icon: 'https://...',
      data: {
        type: 'kyc',
        kycId: kyc.id,
        status: kyc.status,
        deeplink: '/kyc',
      },
      priority: kyc.status === 'rejected' ? 'high' : 'normal',
      channels: ['push', 'email', 'in_app'],
    };
  },

  createSecurityNotification(alert: any) {
    return {
      title: '🔒 Security Alert',
      body: alert.message,
      icon: 'https://...',
      data: {
        type: 'security',
        alertId: alert.id,
        deeplink: '/security',
      },
      priority: 'high',
      channels: ['push', 'email', 'sms', 'in_app'],
    };
  },

  createReferralNotification(reward: any) {
    return {
      title: '💰 Referral Reward!',
      body: `You earned ${reward.amount} from a referral`,
      icon: 'https://...',
      data: {
        type: 'referral',
        rewardId: reward.id,
        amount: reward.amount.toString(),
        deeplink: '/referral',
      },
      priority: 'normal',
      channels: ['push', 'in_app'],
    };
  },
};
```

### 3.5 Email/SMS Integration

**Fichier:** `functions/src/notifications/emailSender.ts`

```typescript
import sendgrid from '@sendgrid/mail';

export async function sendEmailNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    actionUrl?: string;
  }
) {
  // Récupérer email de l'utilisateur
  const userDoc = await db.collection('users').doc(userId).get();
  const { email } = userDoc.data() || {};
  
  if (!email) return;
  
  const msg = {
    to: email,
    from: 'notifications@flashpay.app',
    subject: payload.title,
    html: `
      <h2>${payload.title}</h2>
      <p>${payload.body}</p>
      ${payload.actionUrl ? `<a href="${payload.actionUrl}">View Details</a>` : ''}
    `,
  };
  
  await sendgrid.send(msg);
}
```

**Fichier:** `functions/src/notifications/smsSender.ts`

```typescript
import twilio from 'twilio';

export async function sendSMSNotification(
  userId: string,
  payload: { body: string }
) {
  // Récupérer numéro de téléphone
  const userDoc = await db.collection('users').doc(userId).get();
  const { phoneNumber } = userDoc.data() || {};
  
  if (!phoneNumber) return;
  
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  
  await client.messages.create({
    body: payload.body,
    from: TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}
```

---

## 🎨 Phase 4: UI Components (2 jours)

### 4.1 Notification Center

**Fichier:** `src/pages/NotificationCenterPage.tsx`

```typescript
export const NotificationCenterPage = () => {
  const { notifications, unreadCount, markAsRead, deleteNotification } = 
    useNotificationContext();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter('all')}>All</button>
          <button onClick={() => setFilter('unread')}>Unread ({unreadCount})</button>
          <button onClick={() => setFilter('read')}>Read</button>
        </div>
        
        {/* Notifications List */}
        <div className="space-y-2">
          {filtered.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead(notification.id)}
              onDelete={() => deleteNotification(notification.id)}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};
```

### 4.2 Notification Settings

**Fichier:** `src/pages/NotificationSettingsPage.tsx`

```typescript
export const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    highPriorityOnly: false,
  });
  
  const handleSave = async () => {
    await db.collection('users').doc(user.id).update({
      notificationPreferences: preferences,
    });
  };
  
  return (
    <Layout>
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>
        
        <form className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.pushEnabled}
              onChange={(e) => setPreferences({
                ...preferences,
                pushEnabled: e.target.checked,
              })}
            />
            <span className="ml-2">Push Notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) => setPreferences({
                ...preferences,
                emailEnabled: e.target.checked,
              })}
            />
            <span className="ml-2">Email Notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.smsEnabled}
              onChange={(e) => setPreferences({
                ...preferences,
                smsEnabled: e.target.checked,
              })}
            />
            <span className="ml-2">SMS Notifications</span>
          </label>
          
          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-blue-500 text-white py-2 rounded"
          >
            Save Preferences
          </button>
        </form>
      </div>
    </Layout>
  );
};
```

---

## 🧪 Phase 5: Testing & Analytics (1 jour)

### 5.1 Unit Tests

**Fichier:** `src/services/__tests__/notificationService.test.ts`

```typescript
describe('notificationService', () => {
  it('should register FCM token', async () => {
    const token = await notificationService.registerFCMToken('user123');
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });
  
  it('should mark notification as read', async () => {
    await notificationService.markAsRead('user123', 'notif456');
    // Verify in Firestore
  });
  
  it('should retrieve notifications with limit', async () => {
    const notifications = await notificationService.getUserNotifications(
      'user123',
      10
    );
    expect(notifications.length).toBeLessThanOrEqual(10);
  });
});
```

### 5.2 Cloud Function Tests

**Fichier:** `functions/src/notifications/__tests__/triggers.test.ts`

```typescript
describe('Notification Triggers', () => {
  it('should send transaction notification on create', async () => {
    const transaction = {
      id: 'tx123',
      userId: 'user123',
      amount: 100,
      status: 'pending',
    };
    
    await onTransactionCreated(transaction);
    
    // Verify notification created in Firestore
  });
});
```

### 5.3 Analytics Dashboard

**Fichier:** `src/pages/admin/NotificationAnalyticsPage.tsx`

```typescript
export const NotificationAnalyticsPage = () => {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      const today = new Date().toISOString().split('T')[0];
      const metricsDoc = await db
        .collection('notification_analytics')
        .doc(today)
        .get();
      
      setMetrics(metricsDoc.data() as NotificationMetrics);
    };
    
    fetchMetrics();
  }, []);
  
  if (!metrics) return <div>Loading...</div>;
  
  return (
    <Layout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sent" value={metrics.totalSent} />
        <StatCard label="Delivered" value={metrics.totalDelivered} />
        <StatCard label="Read" value={metrics.totalRead} />
        <StatCard label="Failed" value={metrics.totalFailed} />
      </div>
      
      <Chart data={metrics.byType} title="Notifications by Type" />
      <Chart data={metrics.byPriority} title="By Priority" />
    </Layout>
  );
};
```

---

## 📊 Timeline & Milestones

| Phase | Tasks | Days | Status |
|-------|-------|------|--------|
| 1 | Firebase setup, Service Workers | 2 | 🔵 Not Started |
| 2 | Frontend services & context | 2 | 🔵 Not Started |
| 3 | Cloud Functions + integrations | 3 | 🔵 Not Started |
| 4 | UI Components | 2 | 🔵 Not Started |
| 5 | Testing & Analytics | 1 | 🔵 Not Started |
| **TOTAL** | | **10** | |

---

## ✅ Checklist de Déploiement

- [ ] FCM Server Key configurée
- [ ] Web VAPID Key générée
- [ ] Android google-services.json mise à jour
- [ ] APNs certificates uploadées
- [ ] Firestore collections créées
- [ ] Security rules déployées
- [ ] Cloud Functions déployées
- [ ] Environment variables configurées (.env)
- [ ] Frontend service worker registré
- [ ] Tests passés (100% coverage)
- [ ] Analytics dashboard opérationnel
- [ ] Documentation complète
- [ ] Déploiement en production

---

## 🔗 Dépendances NPM Requises

```json
{
  "firebase": "^11.0.0",
  "firebase-admin": "^12.0.0",
  "@sendgrid/mail": "^7.7.0",
  "twilio": "^3.82.0",
  "workbox-core": "^7.0.0",
  "workbox-google-analytics": "^7.0.0"
}
```

---

## 📖 Références

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Web Push Notifications](https://developers.google.com/web/fundamentals/push-notifications)
- [SendGrid Email API](https://docs.sendgrid.com/)
- [Twilio SMS API](https://www.twilio.com/docs/sms/api)

---

## 🎯 Prochaines Étapes

1. **Valider le plan** avec l'équipe ✓
2. **Créer les branches Git** pour chaque phase
3. **Commencer Phase 1** - Firebase setup
4. **Daily standups** pour suivi
5. **MVP en prod** après Phase 3

---

**Plan créé:** May 8, 2026  
**Estimé:** 7-10 jours  
**Équipe:** 1 développeur full-stack  
**Budget:** Infrastructure (FCM) + Services (SendGrid, Twilio)
