/**
 * Generate user notifications from user data
 * This function processes tier changes and other user events into notifications
 *
 * @param {Object} userData - User data from Firestore
 * @param {Array} sessionDocs - Active session documents
 * @returns {Array} Array of notification objects
 */

/** Safely convert a Firestore Timestamp, Date, or null/undefined to a Date.
 *  Returns null if the value is falsy or conversion fails. */
function safeToDate(value) {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function generateUserNotifications(userData, sessionDocs = []) {
  const notifications = [];

  // Only include lastLogin if it's actually recent (within last hour)
  if (userData.lastLogin) {
    const loginTime = (() => {
      const storedLoginStr = sessionStorage.getItem("sessionLastLogin");
      if (storedLoginStr) return new Date(storedLoginStr);
      const converted = safeToDate(userData.lastLogin);
      if (converted) sessionStorage.setItem("sessionLastLogin", converted.toISOString());
      return converted;
    })();

    if (loginTime) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (loginTime > hourAgo) {
        notifications.push({
          id: "lastLogin",
          activityType: "Last Login",
          title: "Last Login",
          message: "You logged into your account",
          type: "info",
          timestamp: loginTime,
          source: "synthetic",
        });
      }
    }
  }

  if (userData.createdAt) {
    const ts = safeToDate(userData.createdAt);
    if (ts) {
      notifications.push({
        id: "accountCreated",
        activityType: "Account Created",
        title: "Account Created",
        message: "You created your Omnis account",
        type: "success",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.profileUpdated) {
    const ts = safeToDate(userData.profileUpdated);
    if (ts) {
      notifications.push({
        id: "profileUpdated",
        activityType: "Profile Updated",
        title: "Profile Updated",
        message: "You made changes to your profile",
        type: "info",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.passwordChanged) {
    const ts = safeToDate(userData.passwordChanged);
    if (ts) {
      notifications.push({
        id: "passwordChanged",
        activityType: "Password Changed",
        title: "Password Changed",
        message: "You updated your account password",
        type: "info",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.emailChanged) {
    const ts = safeToDate(userData.emailChanged);
    if (ts) {
      notifications.push({
        id: "emailChanged",
        activityType: "Email Changed",
        title: "Email Changed",
        message: "You changed your email address",
        type: "info",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.accountDeleted) {
    const ts = safeToDate(userData.accountDeleted);
    if (ts) {
      notifications.push({
        id: "accountDeleted",
        activityType: "Account Deleted",
        title: "Account Deleted",
        message: "You deleted your account",
        type: "alert",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.sessionEnded) {
    const ts = safeToDate(userData.sessionEnded);
    if (ts) {
      notifications.push({
        id: "sessionEnded",
        activityType: "Session Ended",
        title: "Session Ended",
        message: "Your session ended",
        type: "info",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  // Handle Plan Upgraded - ALWAYS persist in activity log
  if (userData.planUpgraded) {
    const upgradeTimestamp = safeToDate(userData.planUpgraded?.timestamp);
    if (upgradeTimestamp) {
      const fromPlan = userData.planUpgraded.from || "Free";
      const toPlan = userData.planUpgraded.to || "Pro";
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
        tierChangeDetails: { from: fromPlan, to: toPlan, changeType: "upgrade" },
      });
    }
  }

  // Handle Plan Downgraded - ALWAYS persist in activity log
  if (userData.planDowngraded) {
    const downgradeTimestamp = safeToDate(userData.planDowngraded?.timestamp);
    if (downgradeTimestamp) {
      const fromPlan = userData.planDowngraded.from || "Pro";
      const toPlan = userData.planDowngraded.to || "Free";
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
        tierChangeDetails: { from: fromPlan, to: toPlan, changeType: "downgrade" },
      });
    }
  }

  if (userData.trialStartedAt && userData.hasUsedSimulationTrial) {
    const trialStart = safeToDate(userData.trialStartedAt);
    if (trialStart) {
      notifications.push({
        id: "trialStarted",
        activityType: "Trial Started",
        title: "Trial Started",
        message: "You started your 7-day free trial",
        type: "info",
        timestamp: trialStart,
        source: "synthetic",
      });

      const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (trialEnd < new Date()) {
        notifications.push({
          id: "trialEnded",
          activityType: "Trial Ended",
          title: "Trial Ended",
          message: "Your 7-day free trial ended",
          type: "alert",
          timestamp: trialEnd,
          source: "synthetic",
        });
      }
    }
  }

  if (userData.paymentFailed) {
    const ts = safeToDate(userData.paymentFailed);
    if (ts) {
      notifications.push({
        id: "paymentFailed",
        activityType: "Payment Failed",
        title: "Payment Failed",
        message: "A payment attempt failed. Please update your billing info.",
        type: "alert",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  if (userData.reportDownloaded) {
    const ts = safeToDate(userData.reportDownloaded);
    if (ts) {
      notifications.push({
        id: "reportDownloaded",
        activityType: "Report Downloaded",
        title: "Report Downloaded",
        message: "You downloaded a simulation report",
        type: "info",
        timestamp: ts,
        source: "synthetic",
      });
    }
  }

  // Only show multi-device login if there are truly concurrent active sessions
  if (sessionDocs.length > 1) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const activeSessions = sessionDocs.filter((doc) => {
      const sessionData = doc.data();
      const lastActivity = safeToDate(sessionData.lastActivity) || safeToDate(sessionData.createdAt);
      return lastActivity && lastActivity > thirtyMinutesAgo;
    });

    if (activeSessions.length > 1) {
      const mostRecent = activeSessions[activeSessions.length - 1];
      const sessionData = mostRecent.data();
      const sessionTime = safeToDate(sessionData.createdAt) || new Date();

      notifications.push({
        id: "multiDeviceLogin",
        activityType: "Multi-Device Login",
        title: "Multi-Device Login",
        message: "Your account was logged in from multiple devices",
        type: "alert",
        timestamp: sessionTime,
        source: "synthetic",
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
  return firestoreNotifs.map((notif) => {
    const ts = safeToDate(notif.timestamp) || new Date();
    const isTierChange = !!notif.isTierChange;

    return {
      id: notif.id,
      ...notif,
      timestamp: ts,
      isPersistent: notif.isPersistent !== false,
      isTierChange,
      tierChangeTime: isTierChange
        ? notif.tierChangeTime || ts.toISOString()
        : notif.tierChangeTime,
    };
  });
}

// Helper function to check if dropdown should show on login (once per session)
export function shouldShowDropdownOnLogin() {
  return sessionStorage.getItem("hasSeenNotificationDropdown") !== "true";
}

// Helper function to mark dropdown as seen for this session
export function markDropdownAsSeenForLogin() {
  sessionStorage.setItem("hasSeenNotificationDropdown", "true");
}

// Helper function to check if there's a new tier change that should trigger dropdown
export function hasNewTierChange(notifications) {
  const tierChangeNotifs = notifications.filter((n) => n.isTierChange);
  if (tierChangeNotifs.length === 0) return false;

  const latestTierChange = tierChangeNotifs.sort(
    (a, b) => new Date(b.tierChangeTime) - new Date(a.tierChangeTime)
  )[0];

  const lastAcknowledged = sessionStorage.getItem("lastAcknowledgedTierChange");
  return !lastAcknowledged || lastAcknowledged !== latestTierChange.tierChangeTime;
}

// Helper function to acknowledge a tier change
export function acknowledgeTierChange(tierChangeTime) {
  sessionStorage.setItem("lastAcknowledgedTierChange", tierChangeTime);
}

// Main function to determine if dropdown should be shown
export function shouldShowNotificationDropdown(notifications) {
  if (hasNewTierChange(notifications)) return true;
  if (shouldShowDropdownOnLogin()) return true;
  return false;
}

// Function to handle dropdown shown event
export function handleDropdownShown(notifications) {
  markDropdownAsSeenForLogin();

  const tierChangeNotifs = notifications.filter((n) => n.isTierChange);
  if (tierChangeNotifs.length > 0) {
    const latestTierChange = tierChangeNotifs.sort(
      (a, b) => new Date(b.tierChangeTime) - new Date(a.tierChangeTime)
    )[0];
    acknowledgeTierChange(latestTierChange.tierChangeTime);
  }
}