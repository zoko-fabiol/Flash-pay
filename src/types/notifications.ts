/**
 * Push Notifications Types
 * 
 * Core TypeScript interfaces for the notification system
 */

import type { Timestamp } from 'firebase/firestore';

// ─── Notification Types ─────────────────────────────────────────────────

export type NotificationType = 'push' | 'email' | 'sms' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type NotificationPriority = 'high' | 'normal' | 'low';
export type PlatformType = 'web' | 'android' | 'ios';

/**
 * Notification Document
 * Stored in: /notifications/{userId}/{notificationId}
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  status: NotificationStatus;
  priority: NotificationPriority;
  channels: NotificationType[];
  icon?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  deeplink?: string;
  actionUrl?: string;
  actions?: NotificationAction[];
  read: boolean;
  readAt?: Timestamp;
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  failureReason?: string;
  expiresAt?: Timestamp;
}

/**
 * Notification Action Button
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// ─── FCM Token Types ───────────────────────────────────────────────────

/**
 * FCM Token Document
 * Stored in: /fcm_tokens/{userId}/{tokenId}
 */
export interface FCMToken {
  id: string;
  userId: string;
  token: string;
  platform: PlatformType;
  deviceName?: string;
  deviceOS?: string;
  deviceModel?: string;
  appVersion?: string;
  osVersion?: string;
  enabled: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ─── Notification Queue Types ─────────────────────────────────────────

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Notification Queue Item
 * Stored in: /notification_queue/{queueId}
 */
export interface NotificationQueueItem {
  id: string;
  userId: string;
  templateId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: NotificationType[];
  priority: NotificationPriority;
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  scheduledFor: Timestamp;
  lastAttemptAt?: Timestamp;
  processedAt?: Timestamp;
  createdAt: Timestamp;
  error?: string;
}

// ─── Notification Template Types ──────────────────────────────────────

export type TemplateType = 'transaction' | 'kyc' | 'security' | 'referral' | 'system';

/**
 * Notification Template Document
 * Stored in: /notification_templates/{templateId}
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: TemplateType;
  title: string; // With {{placeholders}}
  body: string;  // With {{placeholders}}
  icon?: string;
  imageUrl?: string;
  priority: NotificationPriority;
  channels: NotificationType[];
  actions?: NotificationAction[];
  data?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  enabled: boolean;
}

// ─── Notification Analytics Types ──────────────────────────────────────

/**
 * Daily Analytics Document
 * Stored in: /notification_analytics/{YYYY-MM-DD}
 */
export interface NotificationAnalytics {
  date: string; // YYYY-MM-DD
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number; // Percentage
  readRate: number;     // Percentage
  averageDelayMs: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  byPlatform: Record<PlatformType, number>;
  uniqueUsers: number;
  createdAt: Timestamp;
}

// ─── Notification Preferences Types ────────────────────────────────────

/**
 * User Notification Preferences
 * Stored in: /users/{userId}.notificationPreferences
 */
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  highPriorityOnly: boolean;
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
  categories?: {
    transactions: boolean;
    security: boolean;
    kyc: boolean;
    referral: boolean;
    system: boolean;
  };
  unsubscribeAll: boolean;
  unsubscribeToken?: string;
}

// ─── Notification Event Types ──────────────────────────────────────────

/**
 * Notification Event (for analytics)
 */
export type NotificationEventType = 'sent' | 'delivered' | 'read' | 'clicked' | 'deleted' | 'failed';

export interface NotificationEvent {
  notificationId: string;
  userId: string;
  type: NotificationEventType;
  platform: PlatformType;
  timestamp: Timestamp;
  details?: Record<string, any>;
}

// ─── API Request/Response Types ────────────────────────────────────────

/**
 * Send Notification Request
 */
export interface SendNotificationRequest {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  priority?: NotificationPriority;
  channels?: NotificationType[];
  data?: Record<string, any>;
  deeplink?: string;
  scheduledFor?: Timestamp;
  expiresAt?: Timestamp;
}

/**
 * Send Batch Notifications Request
 */
export interface SendBatchNotificationsRequest {
  userIds: string[];
  title: string;
  body: string;
  channels?: NotificationType[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  deeplink?: string;
  scheduledFor?: Timestamp;
}

/**
 * Send Notification Response
 */
export interface SendNotificationResponse {
  success: boolean;
  notificationIds: string[];
  failedUserIds: string[];
  message: string;
}

// ─── Firebase Cloud Function Payload Types ──────────────────────────────

/**
 * Firestore Trigger Payload for Notifications
 */
export interface NotificationTriggerPayload {
  trigger: 'transaction' | 'kyc' | 'security' | 'referral';
  userId: string;
  data: Record<string, any>;
  channels?: NotificationType[];
  priority?: NotificationPriority;
}

// ─── Hook Types ────────────────────────────────────────────────────────

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  fcmToken: string | null;
  requestPermission: () => Promise<boolean>;
  foregroundMessage: any | null;
}
