/**
 * Generate user notifications from user data
 * This function processes tier changes and other user events into notifications
 * 
 * @param {Object} userData - User data from Firestore
 * @param {Array} sessionDocs - Active session documents
 * @returns {Array} Array of notification objects
 */
export function generateUserNotifications(userData, sessionDocs = []) {
  const notifications = [];

  // Only include lastLogin if it's actually recent (within last hour)
  if (userData.lastLogin) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const storedLoginStr = sessionStorage.getItem('sessionLastLogin');
    let loginTime;
    if (storedLoginStr) {
      loginTime = new Date(storedLoginStr);
    } else {
      loginTime = userData.lastLogin.toDate();
      sessionStorage.setItem('sessionLastLogin', loginTime.toISOString());
    }
    
    // Only show if login was within the last hour
    if (loginTime > hourAgo) {
      notifications.push({
        id: "lastLogin",
        activityType: "Last Login",
        title: "Last Login",
        message: "You logged into your account",
        type: "info",
        timestamp: loginTime,
        source: "synthetic"
      });
    }
  }

  if (userData.createdAt) {
    notifications.push({
      id: "accountCreated",
      activityType: "Account Created",
      title: "Account Created",
      message: "You created your Omnis account",
      type: "success",
      timestamp: userData.createdAt.toDate(),
      source: "synthetic"
    });
  }

  if (userData.profileUpdated) {
    notifications.push({
      id: "profileUpdated",
      activityType: "Profile Updated",
      title: "Profile Updated",
      message: "You made changes to your profile",
      type: "info",
      timestamp: userData.profileUpdated.toDate(),
      source: "synthetic"
    });
  }

  if (userData.passwordChanged) {
    notifications.push({
      id: "passwordChanged",
      activityType: "Password Changed",
      title: "Password Changed",
      message: "You updated your account password",
      type: "info",
      timestamp: userData.passwordChanged.toDate(),
      source: "synthetic"
    });
  }

  if (userData.emailChanged) {
    notifications.push({
      id: "emailChanged",
      activityType: "Email Changed",
      title: "Email Changed",
      message: "You changed your email address",
      type: "info",
      timestamp: userData.emailChanged.toDate(),
      source: "synthetic"
    });
  }

  if (userData.accountDeleted) {
    notifications.push({
      id: "accountDeleted",
      activityType: "Account Deleted",
      title: "Account Deleted",
      message: "You deleted your account",
      type: "alert",
      timestamp: userData.accountDeleted.toDate(),
      source: "synthetic"
    });
  }

  if (userData.sessionEnded) {
    notifications.push({
      id: "sessionEnded",
      activityType: "Session Ended",
      title: "Session Ended",
      message: "Your session ended",
      type: "info",
      timestamp: userData.sessionEnded.toDate(),
      source: "synthetic"
    });
  }

  // ✅ IMPROVED: Handle Plan Upgraded from user document - ALWAYS persist in activity log
  if (userData.planUpgraded) {
    const upgradeTimestamp = userData.planUpgraded.timestamp.toDate();
    const fromPlan = userData.planUpgraded.from || 'Free';
    const toPlan = userData.planUpgraded.to || 'Pro';
    
    notifications.push({
      id: "planUpgraded",
      activityType: "Plan Upgraded",
      title: "Plan Upgraded",
      message: `You upgraded your plan from ${fromPlan} to ${toPlan}`,
      type: "success",
      timestamp: upgradeTimestamp,
      source: "synthetic",
      isPersistent: true,
      isTierChange: true,
      tierChangeTime: upgradeTimestamp.toISOString(),
      tierChangeDetails: {
        from: fromPlan,
        to: toPlan,
        changeType: "upgrade"
      }
    });
  }

  // ✅ IMPROVED: Handle Plan Downgraded from user document - ALWAYS persist in activity log
  if (userData.planDowngraded) {
    const downgradeTimestamp = userData.planDowngraded.timestamp.toDate();
    const fromPlan = userData.planDowngraded.from || 'Pro';
    const toPlan = userData.planDowngraded.to || 'Free';
    
    notifications.push({
      id: "planDowngraded",
      activityType: "Plan Downgraded",
      title: "Plan Downgraded",
      message: `You downgraded your plan from ${fromPlan} to ${toPlan}`,
      type: "alert",
      timestamp: downgradeTimestamp,
      source: "synthetic",
      isPersistent: true,
      isTierChange: true,
      tierChangeTime: downgradeTimestamp.toISOString(),
      tierChangeDetails: {
        from: fromPlan,
        to: toPlan,
        changeType: "downgrade"
      }
    });
  }

  if (userData.trialStartedAt && userData.hasUsedSimulationTrial) {
    notifications.push({
      id: "trialStarted",
      activityType: "Trial Started",
      title: "Trial Started",
      message: "You started your 7-day free trial",
      type: "info",
      timestamp: userData.trialStartedAt.toDate(),
      source: "synthetic"
    });

    const trialEnd = new Date(userData.trialStartedAt.toDate().getTime() + 7 * 24 * 60 * 60 * 1000);
    if (trialEnd < new Date()) {
      notifications.push({
        id: "trialEnded",
        activityType: "Trial Ended",
        title: "Trial Ended",
        message: "Your 7-day free trial ended",
        type: "alert",
        timestamp: trialEnd,
        source: "synthetic"
      });
    }
  }

  if (userData.paymentFailed) {
    notifications.push({
      id: "paymentFailed",
      activityType: "Payment Failed",
      title: "Payment Failed",
      message: "A payment attempt failed. Please update your billing info.",
      type: "alert",
      timestamp: userData.paymentFailed.toDate(),
      source: "synthetic"
    });
  }

  if (userData.reportDownloaded) {
    notifications.push({
      id: "reportDownloaded",
      activityType: "Report Downloaded",
      title: "Report Downloaded",
      message: "You downloaded a simulation report",
      type: "info",
      timestamp: userData.reportDownloaded.toDate(),
      source: "synthetic"
    });
  }

  // Only show multi-device login if there are truly concurrent active sessions
  // Filter for sessions that are still active (within last 30 minutes)
  if (sessionDocs.length > 1) {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    const activeSessions = sessionDocs.filter(doc => {
      const sessionData = doc.data();
      const lastActivity = sessionData.lastActivity?.toDate?.() || sessionData.createdAt?.toDate?.();
      return lastActivity && lastActivity > thirtyMinutesAgo;
    });

    // Only show notification if there are multiple ACTIVE sessions
    if (activeSessions.length > 1) {
      const mostRecent = activeSessions[activeSessions.length - 1];
      const sessionData = mostRecent.data();
      const sessionTime = sessionData.createdAt?.toDate?.() || new Date();

      notifications.push({
        id: "multiDeviceLogin",
        activityType: "Multi-Device Login",
        title: "Multi-Device Login",
        message: "Your account was logged in from multiple devices",
        type: "alert",
        timestamp: sessionTime,
        source: "synthetic"
      });
    }
  }

  return notifications;
}

/**
 * Process Firestore notification documents (from notifications collection)
 * These are persistent notifications that never expire
 * 
 * @param {Array} firestoreNotifs - Notification documents from Firestore
 * @returns {Array} Processed notifications with proper timestamp conversion
 */
export function processFirestoreNotifications(firestoreNotifs = []) {
  return firestoreNotifs.map(notif => ({
    id: notif.id,
    ...notif,
    timestamp: notif.timestamp?.toDate ? notif.timestamp.toDate() : notif.timestamp,
    isPersistent: notif.isPersistent !== false, // Default to persistent
    isTierChange: notif.isTierChange || false
  }));
}

// Helper function to check if dropdown should show on login (once per session)
export function shouldShowDropdownOnLogin() {
  const hasSeenDropdown = sessionStorage.getItem('hasSeenNotificationDropdown');
  return hasSeenDropdown !== 'true';
}

// Helper function to mark dropdown as seen for this session
export function markDropdownAsSeenForLogin() {
  sessionStorage.setItem('hasSeenNotificationDropdown', 'true');
}

// Helper function to check if there's a new tier change that should trigger dropdown
export function hasNewTierChange(notifications) {
  // Find tier change notifications
  const tierChangeNotifs = notifications.filter(n => n.isTierChange);
  
  if (tierChangeNotifs.length === 0) return false;
  
  // Get the most recent tier change
  const latestTierChange = tierChangeNotifs.sort((a, b) => 
    new Date(b.tierChangeTime) - new Date(a.tierChangeTime)
  )[0];
  
  // Check if this tier change has been acknowledged
  const lastAcknowledgedTierChange = sessionStorage.getItem('lastAcknowledgedTierChange');
  
  // If never acknowledged, or if this is a different tier change, return true
  if (!lastAcknowledgedTierChange || lastAcknowledgedTierChange !== latestTierChange.tierChangeTime) {
    return true;
  }
  
  return false;
}

// Helper function to acknowledge a tier change
export function acknowledgeTierChange(tierChangeTime) {
  sessionStorage.setItem('lastAcknowledgedTierChange', tierChangeTime);
}

// Main function to determine if dropdown should be shown
export function shouldShowNotificationDropdown(notifications) {
  // Priority 1: Check for new tier changes (always show if tier changed)
  if (hasNewTierChange(notifications)) {
    return true;
  }
  
  // Priority 2: Check if this is first time showing dropdown after login
  if (shouldShowDropdownOnLogin()) {
    return true;
  }
  
  return false;
}

// Function to handle dropdown shown event
export function handleDropdownShown(notifications) {
  // Mark login dropdown as seen
  markDropdownAsSeenForLogin();
  
  // Acknowledge any tier changes
  const tierChangeNotifs = notifications.filter(n => n.isTierChange);
  if (tierChangeNotifs.length > 0) {
    const latestTierChange = tierChangeNotifs.sort((a, b) => 
      new Date(b.tierChangeTime) - new Date(a.tierChangeTime)
    )[0];
    acknowledgeTierChange(latestTierChange.tierChangeTime);
  }
}