import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import {
  generateUserNotifications,
  processFirestoreNotifications,
  handleDropdownShown,
} from "../components/GenerateUserNotification";

// ─── Context ─────────────────────────────────────────────────────────────────
const NotificationsContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export function NotificationsProvider({ children }) {
  const auth = useAuth();
  const user = auth ? auth.user : null;

  // All notifications fetched so far (Firestore + synthetic, deduped)
  const [notifications, setNotifications] = useState([]);
  // The single most-recent notification shown in the dropdown
  const [latest, setLatest] = useState([]);
  // Count of unread Firestore notifications — drives the bell badge
  const [unreadCount, setUnreadCount] = useState(0);
  // Whether the floating dropdown is open
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Pagination
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Initial load
  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState({});
  const [firestoreNotifs, setFirestoreNotifs] = useState([]);

  const prevLatestRef = useRef([]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const normalizeTier = (t) => {
    if (!t) return "Free";
    const s = String(t).trim().toLowerCase();
    if (s === "pro") return "Pro";
    if (s === "enterprise") return "Enterprise";
    return "Free";
  };

  const rank = { Free: 0, Pro: 1, Enterprise: 2 };

  const dedupeNotifications = (list) => {
    const map = new Map();
    list.forEach((n) => {
      if (n.isTierChange) {
        const from = n.tierChangeDetails?.from
          || n.message?.match(/from (\w+) to/)?.[1] || "";
        const to = n.tierChangeDetails?.to
          || n.message?.match(/to (\w+)$/)?.[1] || "";
        const ts = n.timestamp instanceof Date
          ? n.timestamp
          : (n.timestamp?.toDate ? n.timestamp.toDate() : new Date());
        const bucket = Math.floor(ts.getTime() / 60000);
        const key = `tierchange_${from}_${to}_${bucket}`;
        // Prefer Firestore over synthetic
        if (!map.has(key) || n.source !== "synthetic") map.set(key, n);
      } else {
        if (!map.has(n.id)) map.set(n.id, n);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const at = a.timestamp instanceof Date ? a.timestamp : a.timestamp?.toDate?.() ?? new Date();
      const bt = b.timestamp instanceof Date ? b.timestamp : b.timestamp?.toDate?.() ?? new Date();
      return bt - at;
    });
  };

  // ── User doc listener (for synthetics and tier changes) ───────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    let isProcessing = false;

    const unsub = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      setUserData(data);

      const currentTier = normalizeTier(data.tier);
      const storageKey = `lastKnownTier_${user.uid}`;
      const prevStored = localStorage.getItem(storageKey);

      if (!prevStored) {
        localStorage.setItem(storageKey, currentTier);
        return;
      }

      const prevTier = normalizeTier(prevStored);
      if (prevTier === currentTier || isProcessing) return;

      isProcessing = true;
      try {
        const isUpgrade = (rank[currentTier] || 0) > (rank[prevTier] || 0);

        await addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: isUpgrade ? "Plan Upgraded" : "Plan Downgraded",
          activityType: isUpgrade ? "Plan Upgraded" : "Plan Downgraded",
          message: `You ${isUpgrade ? "upgraded" : "downgraded"} your plan from ${prevTier} to ${currentTier}`,
          description: `Plan ${isUpgrade ? "upgraded" : "downgraded"} from ${prevTier} to ${currentTier}`,
          type: isUpgrade ? "success" : "alert",
          timestamp: serverTimestamp(),
          read: false,
          source: "system",
          isPersistent: true,
          isTierChange: true,
          tierChangeDetails: {
            from: prevTier,
            to: currentTier,
            changeType: isUpgrade ? "upgrade" : "downgrade",
          },
        });

        await updateDoc(userRef, {
          [isUpgrade ? "planUpgraded" : "planDowngraded"]: {
            from: prevTier,
            to: currentTier,
            timestamp: serverTimestamp(),
          },
        });

        localStorage.setItem(storageKey, currentTier);
      } catch (e) {
        console.error("Tier change detector failed:", e);
      } finally {
        isProcessing = false;
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // ── Main notifications listener ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() || new Date(),
      }));

      setFirestoreNotifs(notifs);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // ── Compute combined notifications when either source changes ─────────────
  useEffect(() => {
    const synthetics = generateUserNotifications(userData, [])
      .filter((n) => !n.isTierChange) // tier changes come from Firestore only
      .map((n) => ({ ...n, read: true }));

    const processed = processFirestoreNotifications(firestoreNotifs);
    const deduped = dedupeNotifications([...processed, ...synthetics]);

    setNotifications(deduped);

    // Unread count — only Firestore notifications, not synthetics
    const unread = firestoreNotifs.filter((n) => !n.read).length;
    setUnreadCount(unread);

    // Dropdown: show the single most-recent entry
    const latestOne = deduped.slice(0, 1);

    const prevLatest = prevLatestRef.current[0];
    const currLatest = latestOne[0];

    // Open dropdown when a genuinely new notification arrives
    const isNew = currLatest && (
      !prevLatest ||
      currLatest.id !== prevLatest.id ||
      (new Date(currLatest.timestamp) > new Date(prevLatest.timestamp))
    );

    if (isNew) {
      setDropdownOpen(true);
      // Acknowledge tier changes so they don't re-trigger on re-render
      if (currLatest.isTierChange && currLatest.tierChangeTime) {
        handleDropdownShown(latestOne);
      } else if (!prevLatest) {
        // First load — mark login dropdown as seen
        handleDropdownShown(latestOne);
      }
    }

    prevLatestRef.current = latestOne;
    setLatest(latestOne);
  }, [firestoreNotifs, userData]);

  // ── 3. Load more (pagination) ─────────────────────────────────────────────
  const loadMore = async () => {
    if (!lastVisible || !user?.uid || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const more = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() || new Date(),
      }));

      setFirestoreNotifs((prev) => [...prev, ...more]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error("loadMore failed:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── 4. Actions ────────────────────────────────────────────────────────────
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setFirestoreNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("markAsRead failed:", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = firestoreNotifs.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
      setFirestoreNotifs((prev) =>
        prev.map((n) => !n.read ? { ...n, read: true } : n)
      );
    } catch (e) {
      console.error("markAllAsRead failed:", e);
    }
  };

  // Called when NotificationsPage mounts — silently clears all unread in DB
  const clearAllUnread = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(doc(db, "notifications", d.id), { read: true });
      });
      await batch.commit();
      setFirestoreNotifs((prev) =>
        prev.map((n) => !n.read ? { ...n, read: true } : n)
      );
    } catch (e) {
      console.error("clearAllUnread failed:", e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setFirestoreNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("deleteNotification failed:", e);
    }
  };

  // ── Value ─────────────────────────────────────────────────────────────────
  const value = {
    // Data
    notifications,
    latest,
    unreadCount,
    loading,
    hasMore,
    loadingMore,
    // Dropdown
    dropdownOpen,
    setDropdownOpen,
    // Actions
    loadMore,
    markAsRead,
    markAllAsRead,
    clearAllUnread,
    deleteNotification,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}