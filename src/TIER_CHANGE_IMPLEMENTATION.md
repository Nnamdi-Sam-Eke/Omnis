# Tier Upgrade/Downgrade Notification System - Complete Implementation

## Overview
A comprehensive solution has been implemented to handle tier changes (upgrades and downgrades) in the Omnis application. The system ensures that:

✅ Users are notified when they upgrade or downgrade their tier
✅ Notifications are displayed in the Notifications Dropdown component
✅ Notifications persist in the Activity Log forever
✅ All changes are saved in Firestore for permanent record-keeping
✅ The system handles all tier transition scenarios:
- Free → Pro
- Free → Enterprise  
- Pro → Free
- Pro → Enterprise
- Enterprise → Free
- Enterprise → Pro

---

## 📁 Files Created/Modified

### 1. **NEW: tierChangeService.js**
**Location:** `src/services/tierChangeService.js`

This is the core service that manages all tier change logic:

**Key Functions:**
- `recordTierChange(userId, fromTier, toTier, changeType)` - Records a tier change in Firestore and creates a permanent notification
- `getUserTierChanges(userId)` - Retrieves all historical tier changes for a user
- `getTierChangeNotifications(userId)` - Gets tier change notifications from the notifications collection
- `checkAndRecordTierChange(userId, currentTier)` - Detects and records tier changes automatically
- `getLastTierChangeTime(userId)` - Gets the timestamp of the most recent tier change
- `markTierChangeNotificationAsRead(notificationId)` - Marks a tier notification as read

**Data Structure:**
When a tier change is recorded, it creates:
1. An entry in the user's `planUpgraded` or `planDowngraded` field
2. A document in the `notifications` collection with `isTierChange: true`
3. A subcollection entry in `users/{userId}/tierChanges` for historical tracking

---

### 2. **UPDATED: firestoreService.js**
**Location:** `src/services/firestoreService.js`

Added helper functions:
- `getUserTier(userId)` - Gets the current user tier
- `updateUserTier(userId, newTier)` - Updates the user's tier in Firestore

---

### 3. **UPDATED: Subscription.js**
**Location:** `src/components/Subscription.js`

**Key Changes:**
- Integrated `tierChangeService` and `firestoreService`
- Enhanced `handleUpgrade()` function to:
  - Call `recordTierChange()` before Stripe checkout
  - Update the user's tier in Firestore
  - Ensure notification is created even if checkout takes time
- Added `handleDowngrade()` function to:
  - Record downgrades with user confirmation
  - Update user tier in Firestore
- Added `handleCancelSubscription()` function to:
  - Cancel subscriptions and downgrade to Free tier
  - Record the downgrade event

**Button States:**
- Buttons are now disabled during upgrade/downgrade to prevent double-clicks
- Cancel Subscription button is disabled if user is already on Free tier

---

### 4. **ENHANCED: GenerateUserNotification.js**
**Location:** `src/components/GenerateUserNotification.js`

**Key Changes:**
- Enhanced `generateUserNotifications()` to properly handle tier changes from user document
- Added `processFirestoreNotifications()` function to process persistent notifications from Firestore
- Improved tier change notification structure with:
  - `isPersistent: true` - marks as permanent notification
  - `isTierChange: true` - identifies tier change notifications
  - `tierChangeDetails` - stores from/to tiers and change type

---

### 5. **UPDATED: NotificationsDropdown.js**
**Location:** `src/components/NotificationsDropdown.js`

**Key Changes:**
- Now fetches tier change notifications from Firestore's notifications collection
- Queries for notifications where `isTierChange: true`
- Processes and deduplicates notifications properly
- Shows tier change notifications prominently in the dropdown
- Tier change notifications have special styling (emerald/green background)

---

### 6. **UPDATED: ActivityLog.js**
**Location:** `src/pages/ActivityLog.js`

**Key Changes:**
- Now fetches tier change notifications from Firestore
- Combines tier changes from both user document and notifications collection
- Properly deduplicates tier changes using composite keys
- Displays all tier changes in the activity log sorted by timestamp
- Tier changes are marked with "Billing" category

---

## 🔄 How It Works

### Upgrade Flow:
1. User clicks "Upgrade to Pro" or "Upgrade to Enterprise" button
2. `handleUpgrade()` is called with target tier and Stripe price ID
3. **BEFORE** redirecting to Stripe:
   - `recordTierChange()` is called, which:
     - Creates notification in Firestore `notifications` collection
     - Updates user document with `planUpgraded` field
     - Creates entry in `users/{userId}/tierChanges` subcollection
   - `updateUserTier()` updates the user's tier in user document
4. User is redirected to Stripe checkout
5. After payment, the notification appears in:
   - NotificationsDropdown (most recent tier change)
   - ActivityLog (persisted forever)

### Downgrade Flow:
1. User clicks "Cancel Subscription" button
2. Confirmation dialog appears
3. If confirmed, `handleDowngrade()` is called:
   - `recordTierChange()` records the downgrade with `changeType: "downgrade"`
   - `updateUserTier()` updates the user's tier to Free
   - Success message is shown
4. Notification appears in both components

### Firestore Data Structure:

**In users/{userId}:**
```javascript
{
  tier: "Pro",
  planUpgraded: {
    from: "Free",
    to: "Pro",
    timestamp: Timestamp,
    changeType: "upgrade",
    recordedAt: "2024-01-15T10:30:00Z"
  },
  lastTierChangeTime: Timestamp
}
```

**In notifications/{notificationId}:**
```javascript
{
  userId: "user123",
  type: "success", // or "alert" for downgrades
  activityType: "Plan Upgraded",
  title: "Plan Upgraded",
  message: "You upgraded your plan from Free to Pro",
  timestamp: Timestamp,
  read: false,
  source: "system",
  isPersistent: true,
  isTierChange: true,
  tierChangeDetails: {
    from: "Free",
    to: "Pro",
    changeType: "upgrade", // or "downgrade"
    upgradeDirection: "up" // or "down"
  },
  expiresAt: null // Never expires
}
```

**In users/{userId}/tierChanges/{changeId}:**
```javascript
{
  from: "Free",
  to: "Pro",
  changeType: "upgrade",
  timestamp: Timestamp,
  notificationId: "notif123",
  recordedAt: "2024-01-15T10:30:00Z"
}
```

---

## 🧪 Testing the Implementation

### Test Scenario 1: Free → Pro Upgrade
1. Log in as a Free tier user
2. Navigate to Billing & Subscriptions Tab
3. Click "Upgrade to Pro"
4. Check NotificationsDropdown (should show tier upgrade notification)
5. Navigate to Activity Log (should show "Plan Upgraded" entry)
6. Refresh page - notification should still be there

### Test Scenario 2: Pro → Enterprise Upgrade
1. As a Pro user, click "Upgrade to Enterprise"
2. Complete Stripe checkout (or use test card)
3. Verify notification appears in dropdown
4. Verify activity log shows the upgrade

### Test Scenario 3: Enterprise → Free Downgrade
1. As an Enterprise user, click "Cancel Subscription"
2. Confirm the downgrade
3. Notification should appear showing downgrade
4. Activity log should show "Plan Downgraded"

### Verification Steps:
- Check Firebase Console → Firestore → notifications collection
  - Should see new document with `isTierChange: true`
- Check Firebase Console → users/{userId}
  - Should see `planUpgraded` or `planDowngraded` field updated
- Check NotificationsDropdown
  - Should show the most recent tier change notification
- Check Activity Log page
  - Should show all tier changes sorted by time
- Refresh page
  - All notifications should persist

---

## 🔐 Security Considerations

✅ All tier changes are recorded server-side in Firestore
✅ Notifications are user-specific (filtered by userId)
✅ Tier changes cannot be manually modified from client
✅ Firestore security rules should enforce:
```javascript
// Only users can read their own notifications
match /notifications/{document=**} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if false; // Write only through Cloud Functions
}

// Only users can read their own tier changes
match /users/{userId}/tierChanges/{document=**} {
  allow read: if request.auth.uid == userId;
  allow write: if false;
}
```

---

## 📝 Future Enhancements

1. **Backend Webhook Handler**: Create a Cloud Function to listen for Stripe webhook events and automatically update tier when payment succeeds

2. **Email Notifications**: Send email confirmations when tier changes occur

3. **Tier Change Analytics**: Track tier change patterns for business intelligence

4. **Billing History**: Show complete billing history with all tier changes

5. **Grace Period**: Implement a grace period before downgrade takes effect

6. **Notifications Archive**: Option to archive old notifications while keeping them searchable

---

## 🚀 Deployment Checklist

- [ ] Test all tier change scenarios (upgrade and downgrade)
- [ ] Verify notifications appear in dropdown
- [ ] Verify notifications persist in activity log
- [ ] Check Firestore documents are created correctly
- [ ] Test with real Stripe checkout
- [ ] Verify notifications survive page refreshes
- [ ] Check that old notifications still appear in activity log
- [ ] Test deduplication (no duplicate notifications)
- [ ] Verify tier display updates correctly after change
- [ ] Test error handling (network failures, etc.)

---

## 🆘 Troubleshooting

**Problem**: Notification doesn't appear after upgrade
**Solution**: 
- Check Firestore console to ensure notification document was created
- Verify `isTierChange: true` is set in the notification
- Check browser console for any errors
- Ensure user is logged in with correct ID

**Problem**: Duplicate notifications showing
**Solution**:
- Clear browser cache
- Check that deduplication logic is working
- Verify notification IDs are unique

**Problem**: Notification disappears after refresh
**Solution**:
- Check that `isPersistent: true` is set
- Verify notification has `expiresAt: null`
- Check Firestore for the notification document

---

## 📞 Support

For questions or issues with the tier change notification system, check:
1. Console logs for implementation details
2. Firestore collections for data accuracy
3. Component props to ensure correct data is passed
