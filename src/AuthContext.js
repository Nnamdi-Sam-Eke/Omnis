import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

const AuthContext = createContext();

// Simple device type detection
const getDeviceType = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return /ipad|android(?!.*mobile)|tablet/i.test(ua) ? "Tablet" : "Mobile";
  }
  return "Desktop";
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userDocListenerRef = useRef(null);
  const lastLoginUpdateRef = useRef(0);

  // Keep latest user uid available to intervals without stale closures
  const uidRef = useRef(null);
  useEffect(() => {
    uidRef.current = user?.uid || null;
  }, [user?.uid]);

  // ── SESSION MANAGEMENT ─────────────────────────────────────
  const sessionHeartbeatRef = useRef(null); // Firestore every 2 min
  const localBackupRef = useRef(null); // localStorage every 10 sec
  const currentSessionDocRef = useRef(null);

  const tabIdRef = useRef(
  `tab_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
);

const ACTIVE_SESSION_KEY = (uid) => `omnis_activeSession_${uid}`;
const LEADER_KEY = (uid) => `omnis_sessionLeader_${uid}`;

// leader state
const isLeaderRef = useRef(false);
const leaderPulseRef = useRef(null);
const leaderWatchdogRef = useRef(null);

const nowMs = () => Date.now();
const LEADER_TTL_MS = 8000;       // leader considered dead if no pulse in 8s
const LEADER_PULSE_MS = 3000;     // leader updates "I'm alive" every 3s

const readLeader = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(LEADER_KEY(uid)) || "null");
  } catch {
    return null;
  }
};

const writeLeader = (uid) => {
  const payload = { tabId: tabIdRef.current, ts: nowMs() };
  localStorage.setItem(LEADER_KEY(uid), JSON.stringify(payload));
};

const isLeaderStale = (leader) => {
  if (!leader?.ts) return true;
  return nowMs() - leader.ts > LEADER_TTL_MS;
};

const tryBecomeLeader = (uid) => {
  const leader = readLeader(uid);
  if (!leader || isLeaderStale(leader) || leader.tabId === tabIdRef.current) {
    writeLeader(uid);
    isLeaderRef.current = true;
    return true;
  }
  isLeaderRef.current = leader.tabId === tabIdRef.current;
  return isLeaderRef.current;
};

const startLeaderTimersIfLeader = () => {
  if (!isLeaderRef.current) return;

  if (!sessionHeartbeatRef.current) {
    sessionHeartbeatRef.current = setInterval(
      () => void runFirestoreHeartbeat(),
      2 * 60 * 1000
    );
  }
  if (!localBackupRef.current) {
    localBackupRef.current = setInterval(runLocalBackup, 10 * 1000);
  }
};

const stopLeaderTimers = () => {
  if (sessionHeartbeatRef.current) clearInterval(sessionHeartbeatRef.current);
  if (localBackupRef.current) clearInterval(localBackupRef.current);
  sessionHeartbeatRef.current = null;
  localBackupRef.current = null;
};

const startLeaderWatchdog = (uid) => {
  if (leaderWatchdogRef.current) clearInterval(leaderWatchdogRef.current);

  leaderWatchdogRef.current = setInterval(() => {
    // Re-check leadership periodically (covers silent leader death)
    const becameLeader = tryBecomeLeader(uid);
    if (becameLeader) startLeaderTimersIfLeader();
    else stopLeaderTimers();
  }, 3000); // check every 3s (fast failover)
};

const stopLeaderWatchdog = () => {
  if (leaderWatchdogRef.current) clearInterval(leaderWatchdogRef.current);
  leaderWatchdogRef.current = null;
};

const startLeaderPulse = (uid) => {
  if (leaderPulseRef.current) clearInterval(leaderPulseRef.current);
  leaderPulseRef.current = setInterval(() => {
    if (isLeaderRef.current) writeLeader(uid);
  }, LEADER_PULSE_MS);
};

const stopLeaderPulse = () => {
  if (leaderPulseRef.current) clearInterval(leaderPulseRef.current);
  leaderPulseRef.current = null;
};

  const BACKUP_KEY = (uid) => `sessionBackup_${uid}`;

  const finalizePendingSession = async (uid) => {
    const key = BACKUP_KEY(uid);
    const backupStr = localStorage.getItem(key);
    if (!backupStr) return;

    try {
      const backup = JSON.parse(backupStr);
      if (backup.sessionId && typeof backup.duration === "number") {
        const sessionRef = doc(db, "users", uid, "sessions", backup.sessionId);
        await updateDoc(sessionRef, {
          duration: backup.duration,
          end: serverTimestamp(),
          finalizedFromBackup: true,
        });
        console.log(
          `✅ Finalized crashed session ${backup.sessionId} → ${backup.duration}s`
        );
      }
    } catch (e) {
      console.error("Failed to finalize backup session:", e);
    }

    localStorage.removeItem(key);
  };

  const startNewSession = async (uid) => {
    if (!uid) return;

    // 1) Finalize any pending crashed session
    await finalizePendingSession(uid);

    // 2) Create new session document
    const sessionId =
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionRef = doc(db, "users", uid, "sessions", sessionId);
    const now = new Date();

    await setDoc(sessionRef, {
      start: serverTimestamp(),
      duration: 0,
      deviceType: getDeviceType(),
      createdAt: serverTimestamp(),
    });

    // 3) Store live session keys
    sessionStorage.setItem("currentSessionId", sessionId);
    sessionStorage.setItem("sessionLastLogin", now.toISOString());

    currentSessionDocRef.current = sessionRef;

    // 4) Initial localStorage backup
    localStorage.setItem(
      BACKUP_KEY(uid),
      JSON.stringify({ sessionId, duration: 0, startTime: now.getTime() })
    );

    console.log(`🚀 New session started → ${sessionId}`);
  };

  const runFirestoreHeartbeat = async () => {
    const uid = uidRef.current;
    const sessionId = sessionStorage.getItem("currentSessionId");
    const startStr = sessionStorage.getItem("sessionLastLogin");

    if (!uid || !sessionId || !startStr || !currentSessionDocRef.current) return;

    const elapsed = Math.floor(
      (Date.now() - new Date(startStr).getTime()) / 1000
    );

    try {
      await updateDoc(currentSessionDocRef.current, {
        duration: elapsed,
        lastHeartbeat: serverTimestamp(),
      });

      // Update local backup too
      localStorage.setItem(
        BACKUP_KEY(uid),
        JSON.stringify({
          sessionId,
          duration: elapsed,
          startTime: Date.now() - elapsed * 1000,
        })
      );

      console.log(`❤️ Firestore heartbeat → ${elapsed}s`);
    } catch (e) {
      console.error("Firestore heartbeat failed:", e);
    }
  };

  const runLocalBackup = () => {
    const uid = uidRef.current;
    const sessionId = sessionStorage.getItem("currentSessionId");
    const startStr = sessionStorage.getItem("sessionLastLogin");
    if (!uid || !sessionId || !startStr) return;

    const elapsed = Math.floor(
      (Date.now() - new Date(startStr).getTime()) / 1000
    );

    localStorage.setItem(
      BACKUP_KEY(uid),
      JSON.stringify({
        sessionId,
        duration: elapsed,
        startTime: Date.now() - elapsed * 1000,
      })
    );
  };

// ── SESSION LIFECYCLE (runs every time user.uid changes) ──
useEffect(() => {
  const uid = user?.uid;

 const cleanup = () => {
  // Stop leader-only timers
  stopLeaderTimers();

  // Stop leader pulse + watchdog
  stopLeaderPulse();
  stopLeaderWatchdog();

  // Reset leadership
  isLeaderRef.current = false;

  // Clear session doc ref
  currentSessionDocRef.current = null;
};

  if (!uid) {
    cleanup();
    return;
  }

  let cancelled = false;

  const ensureSharedSession = async () => {
    // 1) Do we already have a global active session?
    let shared = null;
    try {
      shared = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY(uid)) || "null");
    } catch {
      shared = null;
    }

    // 2) If none exists, create it (THIS is the only time we create a new session)
    if (!shared?.sessionId || !shared?.startIso) {
      // finalize any crashed backup first (your existing crash recovery)
      await finalizePendingSession(uid);

      const sessionId =
        crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const now = new Date();
      const sessionRef = doc(db, "users", uid, "sessions", sessionId);

      await setDoc(sessionRef, {
        start: serverTimestamp(),
        duration: 0,
        deviceType: getDeviceType(),
        createdAt: serverTimestamp(),
      });

      shared = { sessionId, startIso: now.toISOString() };
      localStorage.setItem(ACTIVE_SESSION_KEY(uid), JSON.stringify(shared));

      // also initialize your crash backup (shared across tabs)
      localStorage.setItem(
        BACKUP_KEY(uid),
        JSON.stringify({ sessionId, duration: 0, startTime: now.getTime() })
      );

      console.log(`🚀 New GLOBAL session started → ${sessionId}`);
    } else {
      console.log(`🔁 Using existing GLOBAL session → ${shared.sessionId}`);
    }

    // 3) Mirror into this tab's sessionStorage so KPI/Chart keep working unchanged
    sessionStorage.setItem("currentSessionId", shared.sessionId);
    sessionStorage.setItem("sessionLastLogin", shared.startIso);

    // 4) Point this tab at the Firestore session doc (even non-leaders can read it)
    currentSessionDocRef.current = doc(db, "users", uid, "sessions", shared.sessionId);

    return shared;
  };

  const init = async () => {
    try {
      await ensureSharedSession();
      if (cancelled) return;

      // Leader election + pulse
      tryBecomeLeader(uid);
      startLeaderPulse(uid);
      startLeaderWatchdog(uid);

      // React to leader changes (storage events from other tabs)
     const onStorage = (e) => {
  if (e.key !== LEADER_KEY(uid)) return;

  const becameLeader = tryBecomeLeader(uid);
  if (becameLeader) startLeaderTimersIfLeader();
  else stopLeaderTimers();
};

      window.addEventListener("storage", onStorage);

      // Start timers immediately if we are leader right now
      startLeaderTimersIfLeader();

      return () => window.removeEventListener("storage", onStorage);
    } catch (e) {
      console.error("Session init failed:", e);
    }
  };

  let removeStorageListener = null;
  init().then((cleanupFn) => {
    removeStorageListener = cleanupFn || null;
  });

  return () => {
    cancelled = true;
    if (removeStorageListener) removeStorageListener();
    cleanup();
  };
}, [user?.uid]);

  // Final attempt on tab close/refresh
  useEffect(() => {
   const handleBeforeUnload = () => {
  if (isLeaderRef.current) void runFirestoreHeartbeat();
};
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── LOGIN TRACKING (throttled) ─────────────────────────────
  const trackLogin = async (userId) => {
    const now = Date.now();
    const THROTTLE_MS = 8 * 60 * 1000; // 8 minutes

    if (now - lastLoginUpdateRef.current < THROTTLE_MS) {
      console.log("⏭️ Login tracking throttled");
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        lastDevice: getDeviceType(),
      }).catch(() =>
        setDoc(
          userRef,
          {
            lastLogin: serverTimestamp(),
            lastDevice: getDeviceType(),
          },
          { merge: true }
        )
      );

      lastLoginUpdateRef.current = now;
      console.log("✅ Login tracked");
    } catch (error) {
      console.error("❌ Login tracking error:", error);
      // Non-critical
    }
  };

  // ── AUTH INIT + STATE LISTENER ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("✅ Firebase persistence enabled");
      } catch (error) {
        console.error("❌ Persistence setup failed:", error);
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;

        try {
          if (firebaseUser) {
            // Fetch user data from Firestore
            let userData = {};
            try {
              const userRef = doc(db, "users", firebaseUser.uid);
              const docSnap = await getDoc(userRef);
              userData = docSnap.exists() ? docSnap.data() : {};
            } catch (firestoreError) {
              console.error("❌ Firestore fetch error:", firestoreError);
              setError("Unable to load user data. Some features may be limited.");
              userData = {
                tier: "Free",
                firstname: firebaseUser.displayName?.split(" ")[0] || "",
                lastname: firebaseUser.displayName?.split(" ")[1] || "",
              };
            }

            const finalUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              tier: userData.tier || "Free",
              firstName: userData.firstname || "",
              lastName: userData.lastname || "",
              profilePicture: userData.profilePicture || null,
              ...userData,
            };

            setUser(finalUserData);
            await trackLogin(firebaseUser.uid);

            // Real-time user listener
            if (!userDocListenerRef.current) {
              const userRef = doc(db, "users", firebaseUser.uid);
              userDocListenerRef.current = onSnapshot(
                userRef,
                (docSnap) => {
                  if (docSnap.exists() && mounted) {
                    const data = docSnap.data();
                    setUser((prev) => ({
                      ...prev,
                      ...data,
                      tier: data.tier || "Free",
                    }));
                  }
                },
                (err) => console.error("❌ Snapshot listener error:", err)
              );
            }
          } else {
            // Signed out
            setUser(null);
            setError(null);
            if (userDocListenerRef.current) {
              userDocListenerRef.current();
              userDocListenerRef.current = null;
            }
          }
        } catch (err) {
          console.error("❌ Auth state error:", err);
          setUser(null);
          setError("Authentication error. Please try again.");
        } finally {
          if (mounted) setLoading(false);
        }
      });

      return unsubscribe;
    };

    const unsubscribePromise = initAuth();

    return () => {
      mounted = false;
      unsubscribePromise.then((unsub) => unsub?.());
      if (userDocListenerRef.current) {
        userDocListenerRef.current();
        userDocListenerRef.current = null;
      }
    };
  }, []);

  // ── ACTIONS ────────────────────────────────────────────────
  const signup = async (
    firstname,
    lastname,
    phone,
    email,
    password,
    location,
    country,
    profilePicture
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const newUser = userCredential.user;

    try {
      const userRef = doc(db, "users", newUser.uid);
      await setDoc(userRef, {
        firstname,
        lastname,
        phone,
        email,
        location,
        country,
        profilePicture,
        tier: "Free",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        lastDevice: getDeviceType(),
      });
    } catch (firestoreError) {
      console.error("❌ User creation error:", firestoreError);
      setError("Account created but profile data may be incomplete.");
    }
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Login successful");
  };

  const logout = async () => {
  const uid = uidRef.current;

  if (uid) {
    // Only leader should attempt final heartbeat
    if (isLeaderRef.current) {
      await runFirestoreHeartbeat();
    }

    const sessionId = sessionStorage.getItem("currentSessionId");

    // Mark session as ended in Firestore
    if (sessionId) {
      try {
        const ref = doc(db, "users", uid, "sessions", sessionId);
        await updateDoc(ref, {
          end: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Session end update failed:", e);
      }
    }

    // 🧹 Clear ALL session-related storage (GLOBAL + BACKUP)
    localStorage.removeItem(BACKUP_KEY(uid));
    localStorage.removeItem(ACTIVE_SESSION_KEY(uid));
    localStorage.removeItem(LEADER_KEY(uid));
  }

  // Clear per-tab sessionStorage
  sessionStorage.removeItem("currentSessionId");
  sessionStorage.removeItem("sessionLastLogin");

  // Stop all intervals
  if (sessionHeartbeatRef.current) clearInterval(sessionHeartbeatRef.current);
  if (localBackupRef.current) clearInterval(localBackupRef.current);
  sessionHeartbeatRef.current = null;
  localBackupRef.current = null;
  currentSessionDocRef.current = null;
isLeaderRef.current = false;
stopLeaderPulse();
stopLeaderWatchdog();

  // Sign out from Firebase
  await signOut(auth);
  lastLoginUpdateRef.current = 0;
};

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser((prev) => ({
          ...prev,
          ...data,
          tier: data.tier || "Free",
        }));
      }
    } catch (err) {
      console.error("❌ Refresh error:", err);
    }
  };

  // ── UI ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setUser,
        signup,
        login,
        logout,
        resetPassword,
        refreshUserData,
      }}
    >
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <div>
              <p className="font-bold">Limited Functionality</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;