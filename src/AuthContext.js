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
    return /ipad|android(?!.*mobile)|tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  }
  return 'Desktop';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userDocListenerRef = useRef(null);
  const lastLoginUpdateRef = useRef(0);

  // Throttled login tracking - only update once per 5 minutes
  const trackLogin = async (userId) => {
    const now = Date.now();
    const THROTTLE_MS = 8 * 60 * 1000; // 8 minutes
    
    if (now - lastLoginUpdateRef.current < THROTTLE_MS) {
      console.log('⏭️ Login tracking throttled');
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        lastDevice: getDeviceType(),
      }).catch(() =>
        setDoc(userRef, {
          lastLogin: serverTimestamp(),
          lastDevice: getDeviceType(),
        }, { merge: true })
      );
      
      lastLoginUpdateRef.current = now;
      console.log('✅ Login tracked');
    } catch (error) {
      console.error('❌ Login tracking error:', error);
      // Don't throw - login tracking is non-critical
    }
  };

  // Set Firebase persistence and handle auth state
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
              console.error('❌ Firestore fetch error:', firestoreError);
              setError('Unable to load user data. Some features may be limited.');
              // Continue with basic user data
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

            // Set up real-time listener for user updates
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
                (error) => {
                  console.error('❌ Snapshot listener error:', error);
                }
              );
            }
          } else {
            // User signed out
            setUser(null);
            setError(null);
            if (userDocListenerRef.current) {
              userDocListenerRef.current();
              userDocListenerRef.current = null;
            }
          }
        } catch (error) {
          console.error("❌ Auth state error:", error);
          setUser(null);
          setError('Authentication error. Please try again.');
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      });

      return unsubscribe;
    };

    const unsubscribePromise = initAuth();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsub => unsub?.());
      if (userDocListenerRef.current) {
        userDocListenerRef.current();
        userDocListenerRef.current = null;
      }
    };
  }, []);

  const signup = async (firstname, lastname, phone, email, password, location, country, profilePicture) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
      console.error('❌ User creation error:', firestoreError);
      // Don't throw - user is authenticated even if Firestore fails
      setError('Account created but profile data may be incomplete.');
    }
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Login successful");
  };

  const logout = async () => {
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
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
  };

  // Loading screen
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