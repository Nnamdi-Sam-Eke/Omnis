import { db } from "../firebase";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";

/**
 * Records a tier change in Firestore
 * - Saves the change in both user document and notifications collection
 * - Ensures notification persists forever in activity logs
 */
export const recordTierChange = async (
  userId,
  fromTier,
  toTier,
  changeType = "upgrade"
) => {
  if (!userId) {
    console.error("❌ recordTierChange: userId is required");
    return null;
  }

  try {
    const timestamp = serverTimestamp();
    const now = new Date();

    // Step 1: Update user document with tier change history
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      tier: toTier,
      [`${changeType === "upgrade" ? "planUpgraded" : "planDowngraded"}`]: {
        from: fromTier,
        to: toTier,
        timestamp: timestamp,
        changeType: changeType,
        recordedAt: now.toISOString()
      },
      lastTierChangeTime: timestamp
    });

    // Step 2: Create permanent notification in notifications collection
    const notificationRef = collection(db, "notifications");
    const notificationDocRef = await addDoc(notificationRef, {
      userId: userId,
      type: changeType === "upgrade" ? "success" : "alert",
      activityType: changeType === "upgrade" ? "Plan Upgraded" : "Plan Downgraded",
      title: changeType === "upgrade" ? "Plan Upgraded" : "Plan Downgraded",
      message: `You ${changeType === "upgrade" ? "upgraded" : "downgraded"} your plan from ${fromTier} to ${toTier}`,
      description: `Plan ${changeType === "upgrade" ? "upgraded" : "downgraded"} from ${fromTier} to ${toTier}`,
      timestamp: timestamp,
      read: false,
      source: "system",
      isPersistent: true,
      isTierChange: true,
      tierChangeDetails: {
        from: fromTier,
        to: toTier,
        changeType: changeType,
        upgradeDirection: changeType === "upgrade" ? "up" : "down"
      },
      createdAt: timestamp,
      expiresAt: null // Null means it never expires
    });

    // Step 3: Also store in a dedicated tierChanges subcollection for easier querying
    const tierChangesRef = collection(db, "users", userId, "tierChanges");
    await addDoc(tierChangesRef, {
      from: fromTier,
      to: toTier,
      changeType: changeType,
      timestamp: timestamp,
      notificationId: notificationDocRef.id,
      recordedAt: now.toISOString()
    });

    console.log(
      `✅ Tier change recorded: ${fromTier} → ${toTier} (${changeType})`
    );
    return {
      success: true,
      notificationId: notificationDocRef.id,
      timestamp: timestamp
    };
  } catch (error) {
    console.error("❌ Error recording tier change:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all tier changes for a user
 */
export const getUserTierChanges = async (userId) => {
  if (!userId) {
    console.error("❌ getUserTierChanges: userId is required");
    return [];
  }

  try {
    const tierChangesRef = collection(db, "users", userId, "tierChanges");
    const q = query(tierChangesRef);
    const snapshot = await getDocs(q);

    const tierChanges = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    return tierChanges.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("❌ Error fetching tier changes:", error);
    return [];
  }
};

/**
 * Get tier change notifications from notifications collection
 */
export const getTierChangeNotifications = async (userId) => {
  if (!userId) {
    console.error("❌ getTierChangeNotifications: userId is required");
    return [];
  }

  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("isTierChange", "==", true)
    );

    const snapshot = await getDocs(q);

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    return notifications.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  } catch (error) {
    console.error("❌ Error fetching tier change notifications:", error);
    return [];
  }
};

/**
 * Check if a tier change needs to be recorded
 * Compares current tier with previous known tier
 */
export const checkAndRecordTierChange = async (userId, currentTier) => {
  if (!userId || !currentTier) {
    return null;
  }

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const previousTier = userData.previousTier || userData.tier || "Free";

    // Check if tier has actually changed
    if (previousTier !== currentTier) {
      const isUpgrade = getTierRank(currentTier) > getTierRank(previousTier);
      const changeType = isUpgrade ? "upgrade" : "downgrade";

      const result = await recordTierChange(
        userId,
        previousTier,
        currentTier,
        changeType
      );

      // Update previousTier to avoid duplicate recordings
      await updateDoc(userRef, {
        previousTier: currentTier
      });

      return result;
    }

    return null;
  } catch (error) {
    console.error("❌ Error checking tier change:", error);
    return null;
  }
};

/**
 * Get tier ranking (for comparison)
 */
function getTierRank(tier) {
  const ranks = {
    Free: 0,
    Pro: 1,
    Enterprise: 2
  };
  return ranks[tier] || 0;
}

/**
 * Get last tier change timestamp for a user
 */
export const getLastTierChangeTime = async (userId) => {
  if (!userId) return null;

  try {
    const tierChanges = await getUserTierChanges(userId);
    if (tierChanges.length > 0) {
      return tierChanges[0].timestamp;
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting last tier change time:", error);
    return null;
  }
};

/**
 * Mark tier change notification as read
 */
export const markTierChangeNotificationAsRead = async (notificationId) => {
  if (!notificationId) {
    console.error("❌ markTierChangeNotificationAsRead: notificationId is required");
    return false;
  }

  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, {
      read: true
    });
    return true;
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    return false;
  }
};
