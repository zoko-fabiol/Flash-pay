#!/bin/bash
# Deployment Instructions for Push Notification Fix

## Step 1: Configure OneSignal REST API Key (One-time setup)
firebase functions:config:set \
  onesignal.rest_api_key="YOUR_REST_API_KEY_HERE"

# Verify it's set:
firebase functions:config:get

## Step 2: Deploy Updated Code
firebase deploy

## Step 3: Monitor Deployment
firebase functions:log --limit 50

## Testing Commands

# View specific function logs:
firebase functions:log onNotificationQueueCreated

# Test notification sending locally:
npm --prefix functions run shell

# In Firebase Functions shell:
> const admin = require('firebase-admin');
> const db = admin.firestore();
> 
> // Create test notification queue entry
> await db.collection('notification_queue').add({
>   userId: 'test-user-id',
>   payload: {
>     title: 'Test Push',
>     body: 'This is a test notification'
>   },
>   channels: ['onesignal'],
>   status: 'pending'
> });

## Post-Deployment Verification

1. Build and install APK:
   ```bash
   cd android
   ./gradlew build -b app/build.gradle
   ```

2. Check Firestore fcm_tokens collection:
   ```bash
   firebase firestore:inspect fcm_tokens
   ```

3. Monitor Cloud Functions real-time logs:
   ```bash
   firebase functions:log --follow
   ```

## Rollback (if needed)

If you need to revert the changes:
```bash
# Remove OneSignal config
firebase functions:config:unset onesignal

# Deploy previous version
git checkout HEAD~1
firebase deploy --only functions
```

## Useful Firebase CLI Commands

# List all functions
firebase functions:list

# Describe a specific function
firebase functions:describe onNotificationQueueCreated

# Test a function locally
firebase emulators:start --only functions

# Deploy specific function
firebase deploy --only functions:onNotificationQueueCreated

# Stream logs in real-time
firebase functions:log --limit 100 --follow
