import React, { useEffect, useState, lazy, Suspense, useRef } from "react";
import { doc, getDoc, collection, getDocs, query, where} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { Activity, Shield, Clock, Users, Download, ChevronRight, Calendar, Zap } from "lucide-react";
import { generateUserNotifications, processFirestoreNotifications } from "../components/GenerateUserNotification";



// Enhanced ActivityLogRow Component with modern UI
const ActivityLogRow = lazy(() => Promise.resolve({ default: ({ log }) => (
  <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20">
    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              {getActivityIcon(log.activityType)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {log.activityType}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                {getActivityCategory(log.activityType)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {log.description || log.message}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {log.timestamp.toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {log.timestamp.toLocaleTimeString()}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </div>
  </div>
)}));

// Helper function to get activity icons
function getActivityIcon(activityType) {
  const iconMap = {
    "Last Login": <Shield className="w-5 h-5 text-white" />,
    "Profile Updated": <Users className="w-5 h-5 text-white" />,
    "Profile Picture Updated": <Users className="w-5 h-5 text-white" />,
    "Password Changed": <Shield className="w-5 h-5 text-white" />,
    "Email Changed": <Users className="w-5 h-5 text-white" />,
    "Account Created": <Zap className="w-5 h-5 text-white" />,
    "Account Deleted": <Activity className="w-5 h-5 text-white" />,
    "Session Ended": <Clock className="w-5 h-5 text-white" />,
    "Plan Upgraded": <Zap className="w-5 h-5 text-white" />,
    "Plan Downgraded": <Activity className="w-5 h-5 text-white" />,
    "Trial Started": <Calendar className="w-5 h-5 text-white" />,
    "Trial Ended": <Calendar className="w-5 h-5 text-white" />,
    "Payment Failed": <Activity className="w-5 h-5 text-white" />,
    "Report Downloaded": <Download className="w-5 h-5 text-white" />,
    "Multi-Device Login": <Users className="w-5 h-5 text-white" />,
  };
  return iconMap[activityType] || <Activity className="w-5 h-5 text-white" />;
}

// Helper function to get activity categories
function getActivityCategory(activityType) {
  const categoryMap = {
    "Last Login": "Security",
    "Profile Updated": "Account",
    "Profile Picture Updated": "Account",
    "Password Changed": "Security",
    "Email Changed": "Account",
    "Account Created": "Account",
    "Account Deleted": "Account",
    "Session Ended": "Security",
    "Plan Upgraded": "Billing",
    "Plan Downgraded": "Billing",
    "Trial Started": "Billing",
    "Trial Ended": "Billing",
    "Payment Failed": "Billing",
    "Report Downloaded": "Activity",
    "Multi-Device Login": "Security",
  };
  return categoryMap[activityType] || "Activity";
}

// Helper function to check if a date is today
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Helper function to get start of today
function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const ActivityLogPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const hasFetchedRef = useRef(false);

  // Initial loading timer
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Main effect to trigger data fetching when user is available
  useEffect(() => {
    if (user?.uid && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchActivityData();
      fetchActiveSessions();
    }
  }, [user?.uid]);

  // Function to fetch active sessions from Firebase (only today's sessions)
  const fetchActiveSessions = async () => {
    if (!user?.uid) return;
    
    try {
      const sessionsRef = collection(db, "sessions");
      const startOfToday = getStartOfToday();
      
      const q = query(
        sessionsRef, 
        where("userId", "==", user.uid),
        where("loginTime", ">=", startOfToday)
      );
      const querySnapshot = await getDocs(q);

      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        loginTime: doc.data().loginTime?.toDate?.(),
        lastActivity: doc.data().lastActivity?.toDate?.()
      })).filter(session => {
        // Additional filter to ensure we only get today's sessions
        return session.loginTime && isToday(session.loginTime);
      });

      setActiveSessions(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
    }
  };

  // Main function to fetch activity data and create activity logs
  const fetchActivityData = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // 1. Fetch user document
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      // 2. Fetch user sessions subcollection
      const sessionsRef = collection(db, "users", user.uid, "sessions");
      const sessionsSnapshot = await getDocs(sessionsRef);
      const sessionDocs = sessionsSnapshot.docs;

      // 3. ✅ FETCH TIER CHANGE NOTIFICATIONS FROM FIRESTORE (persistent notifications)
      const tierChangeNotifs = await getDocs(
        query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("isTierChange", "==", true)
        )
      );
      const tierChangeNotifications = tierChangeNotifs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check for tier changes locally and store last known tier
        let immediateTierChange = null;
        if (userData.tier) {
          const currentTier = userData.tier;
          const previousTier = localStorage.getItem("lastKnownTier");

          if (previousTier && previousTier !== currentTier) {
            // Prepare an immediate synthetic tier-change entry for Activity Log display
            immediateTierChange = {
              from: previousTier,
              to: currentTier
            };
          }

          localStorage.setItem("lastKnownTier", currentTier);
        }

        // Generate notifications using the shared function
        const notifications = generateUserNotifications(userData, sessionDocs);

        // ✅ ADD: Process and include Firestore tier change notifications
        const processedTierChanges = processFirestoreNotifications(tierChangeNotifications);
        notifications.push(...processedTierChanges);

        // If we detected a recent tier change locally, prepend a synthetic activity so it appears immediately
        // But only if the user document does NOT already contain a persisted planUpgraded/planDowngraded field
        if (immediateTierChange && !userData.planUpgraded && !userData.planDowngraded) {
          const now = new Date();
          const isUpgrade = (function(from, to) {
            const rank = { Free: 0, Pro: 1, Enterprise: 2 };
            return (rank[to] || 0) > (rank[from] || 0);
          })(immediateTierChange.from, immediateTierChange.to);

          notifications.unshift({
            id: `tier_change_local_${now.getTime()}`,
            activityType: isUpgrade ? 'Plan Upgraded' : 'Plan Downgraded',
            title: isUpgrade ? 'Plan Upgraded' : 'Plan Downgraded',
            message: isUpgrade ? `You upgraded your plan from ${immediateTierChange.from} to ${immediateTierChange.to}` : `You downgraded your plan from ${immediateTierChange.from} to ${immediateTierChange.to}`,
            type: isUpgrade ? 'success' : 'alert',
            timestamp: now,
            source: 'synthetic',
            isPersistent: true,
            isTierChange: true,
            tierChangeTime: now.toISOString()
          });
        }
        
        // ✅ IMPROVED: Deduplicate notifications (especially tier changes)
        const deduplicatedNotifications = Array.from(
          new Map(
            notifications.map((n) => {
              // For tier changes, use a composite key to avoid duplicates
              if (n.isTierChange) {
                const tierKey = `tierchange_${n.tierChangeDetails?.from || n.message.split('from ')[1]?.split(' ')[0] || ''}_${n.tierChangeDetails?.to || n.message.split('to ')[1]?.split(' ')[0] || ''}`;
                return [tierKey, n];
              }
              return [n.id, n];
            })
          ).values()
        );
        
        // Convert notifications to activity log format
        const activityLogs = deduplicatedNotifications.map(notif => ({
          id: notif.id,
          activityType: notif.activityType || notif.title,
          description: notif.message,
          timestamp: notif.timestamp instanceof Date ? notif.timestamp : 
                     (notif.timestamp?.toDate ? notif.timestamp.toDate() : new Date()),
          type: notif.type,
          isPersistent: notif.isPersistent
        }));

        // Sort logs by timestamp (most recent first)
        const sortedLogs = activityLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(sortedLogs);
      }
    } catch (error) {
      console.error("Error fetching activity data:", error);
    }
    setIsLoading(false);
  };

  // Loading state with modern skeleton
  if (loading) {
    return (
      <div className="max-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-32"></div>
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
              Activity Log
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Track your account activity and security events
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400"></p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white"></p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Activity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {logs.length > 0 ? logs[0].timestamp.toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-blue-600 dark:text-blue-400">Loading activity...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Suspense fallback={
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                }>
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <ActivityLogRow key={log.id} log={log} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">No activity logs found</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Your activities will appear here as you use the platform</p>
                    </div>
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ActivityLogPage;