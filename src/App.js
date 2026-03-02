
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { signOut } from "firebase/auth";
import { auth, db, messaging } from "./firebase";
import { doc, getDoc, updateDoc, Timestamp, deleteField } from "firebase/firestore";
import { onMessage } from "firebase/messaging";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

// Pages
import OnboardingContainer from './components/onboarding/OnboardingContainer';
import SplashScreen from './components/SplashScreen';
// import Home from './pages/Home';
// import PartnerChat from './pages/PartnerChat';
import SavedScenarios from './pages/SavedScenarios';
import Support from './pages/Support';
import PaymentsPage from './pages/PaymentsPage';
// import ResourcesPage from './pages/ResourcesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ScenarioTabs from './pages/ScenarioTabs';
import OmnisDashboard from './pages/OmnisDashboard';
import ActivityLog from './pages/ActivityLog';
import NotificationsPage from './pages/NotificationsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FeedbackButton from './components/FeedbackButton';
import CreatorsCorner from './Creator\'sCorner';
import Footer from './components/Footer';

import ErrorBoundary from './components/ErrorBoundary';
import { OmnisProvider } from './context/OmnisContext';
import { MemoryProvider } from './MemoryContext';
import { AccountProvider } from './AccountContext';
import { NotificationsProvider } from './context/NotificationsContext';
import AuthForm from './components/AuthForm';
import ProfilePage from './components/SimpleProfilePage';
import AccountPage from './pages/ProfilePage';
import UpgradeModal from './components/UpgradeModal';
import './App.css';
import useIdleTimer from './hooks/useIdleTimer';
import WarningModal from './components/WarningModal';

// ✅ PrivateRoute
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return !user ? children : <Navigate to="/overview" />;
};

const noLayoutRoutes = ['/login', '/onboarding'];

const AppContent = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const userTier = user?.tier || 'Free';
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [initialSplashDone, setInitialSplashDone] = useState(false);
  const [postLoginSplash, setPostLoginSplash] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  const handleLogout = () => {
    signOut(auth).catch(error => {
      console.error("Error signing out:", error);
    });
  };

  // Idle timer: warn at 13min, timeout at 15min
  const idle = useIdleTimer({
    timeoutMinutes: 15,
    warningMinutes: 13,
    onWarn: () => {},
    onTimeout: () => {
      try {
        localStorage.setItem('idleLoggedOut', '1');
      } catch (e) {}
      signOut(auth).catch(err => console.error('Idle signOut error', err));
      navigate('/login');
    },
  });

  // 🔥 Global Tier Change Detector + Expiry Engine (UPGRADED)
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);

    const normalizeTier = (t) => {
      if (!t) return "Free";
      const s = String(t).trim().toLowerCase();
      if (s === "free") return "Free";
      if (s === "pro") return "Pro";
      if (s === "enterprise") return "Enterprise";
      return "Free";
    };

    const rank = { Free: 0, Pro: 1, Enterprise: 2 };

    let isProcessing = false;

    const unsub = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const currentTier = normalizeTier(data.tier);

      // -------------------------------
      // ✅ AUTO-DOWNGRADE ON EXPIRY
      // If Pro/Enterprise and subscriptionExpiry passed,
      // set tier back to Free, mark reason as expiry, and stop.
      // -------------------------------
      const expiryTimestamp = data.subscriptionExpiry;
      const expiryDate = expiryTimestamp?.toDate
        ? expiryTimestamp.toDate()
        : expiryTimestamp
        ? new Date(expiryTimestamp)
        : null;

      const isPaidTierNow = currentTier === "Pro" || currentTier === "Enterprise";
      const isExpired = isPaidTierNow && expiryDate && new Date() > expiryDate;

      const expiryAlreadyHandled = !!data.expiryHandledAt;

      if (isExpired && !expiryAlreadyHandled) {
        try {
          await updateDoc(userRef, {
            tier: "Free",
            tierChangeReason: "expiry",
            expiredFromTier: currentTier,
            expiryHandledAt: serverTimestamp(),
            lastSubscriptionExpiry: expiryTimestamp || null,
            subscriptionExpiry: null,
            expirySetForTier: "Free",
          });
        } catch (e) {
          console.error("Auto-expiry downgrade failed:", e);
        }
        return; // important: next snapshot will handle notifications for tier change
      }

      // -------------------------------
      // ✅ TIER CHANGE DETECTION
      // -------------------------------
      const storageKey = `lastKnownTier_${user.uid}`;
      const previousTier = localStorage.getItem(storageKey);

      // first run: just store tier
      if (!previousTier) {
        localStorage.setItem(storageKey, currentTier);
        return;
      }

      if (previousTier === currentTier || isProcessing) return;

      isProcessing = true;
      try {
        const isUpgrade = rank[currentTier] > rank[previousTier];

        await addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: isUpgrade ? "Plan Upgraded" : "Plan Downgraded",
          activityType: isUpgrade ? "Plan Upgraded" : "Plan Downgraded",
          message: `You ${isUpgrade ? "upgraded" : "downgraded"} your plan from ${previousTier} to ${currentTier}`,
          description: `Plan ${isUpgrade ? "upgraded" : "downgraded"} from ${previousTier} to ${currentTier}`,
          type: isUpgrade ? "success" : "alert",
          timestamp: serverTimestamp(),
          read: false,
          source: "system",
          isPersistent: true,
          isTierChange: true,
          tierChangeDetails: {
            from: previousTier,
            to: currentTier,
            changeType: isUpgrade ? "upgrade" : "downgrade",
          },
        });

        await updateDoc(userRef, {
          [isUpgrade ? "planUpgraded" : "planDowngraded"]: {
            from: previousTier,
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

  // Initial splash screen
  useEffect(() => {
    const timer = setTimeout(() => setInitialSplashDone(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      setPostLoginSplash(true);
      const timer = setTimeout(() => setPostLoginSplash(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setPostLoginSplash(false);
    }
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!initialSplashDone) return <SplashScreen />;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<PublicRoute><AuthForm /></PublicRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }
  if (postLoginSplash) return <SplashScreen />;

  // --- CLEAN FULLSCREEN LAYOUT FOR NO-LAYOUT ROUTES ---
  if (hideLayout) {
    return (
      <AccountProvider>
        <NotificationsProvider>
        <OmnisProvider>
          <MemoryProvider>

            <Routes>
              <Route path="/onboarding" element={<PrivateRoute><OnboardingContainer /></PrivateRoute>} />
              <Route path="/login" element={<PublicRoute><AuthForm /></PublicRoute>} />
            </Routes>

          </MemoryProvider>
        </OmnisProvider>
        </NotificationsProvider>
      </AccountProvider>
    );
  }

  // --- DEFAULT LAYOUT WITH RESPONSIVE PADDING ---
  return (
    <div style={{ zoom: '75%' }} className="min-h-screen w-full bg-white dark:bg-gray-900">

        {/* ✅ FIXED: Responsive padding - none on mobile, dynamic on desktop */}
        <main
          className={`min-h-screen bg-white dark:bg-gray-900 pt-20
            transition-all duration-300 ease-in-out
            ${isSidebarHovered ? 'lg:pl-64' : 'lg:pl-20'}
            w-full`}
        >
          {/* ✅ FIXED: Container with responsive padding and max-width */}
          <div className="w-full px-0 sm:px-4 lg:px-0 transition-all duration-300 ease-in-out">

            <AccountProvider>
              {/* ✅ Correct placement */}
              <Toaster position="top-right" />

              {!hideLayout && (
                <>
                  <Header
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    currentPage={currentPage}
                    isProfileMenuOpen={isProfileMenuOpen}
                    setIsProfileMenuOpen={setIsProfileMenuOpen}
                    setCurrentPage={setCurrentPage}
                    handleLogout={handleLogout}
                  />
                  <Sidebar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onHoverChange={setIsSidebarHovered}
                  />
                </>
              )}

             <NotificationsProvider>
              <OmnisProvider>
                <MemoryProvider>

                  <WarningModal
                    isOpen={idle.isWarning}
                    secondsLeft={idle.secondsLeft}
                    onStay={() => idle.stay()}
                    onLogout={() => {
                      try { localStorage.setItem('idleLoggedOut', '1'); } catch (e) {}
                      signOut(auth).catch(err => console.error('Idle signOut error', err));
                      navigate('/login');
                    }}
                  />

                  {/* ✅ Content container with smooth compression */}
                  <div className="w-full transition-all duration-300 ease-in-out">
                    <Routes>
                      <Route path="/onboarding" element={<PrivateRoute><OnboardingContainer /></PrivateRoute>} />
                      <Route path="/login" element={<PublicRoute><AuthForm /></PublicRoute>} />
                      <Route path="/" element={<PrivateRoute><OmnisDashboard /></PrivateRoute>} />
                      {/* <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} /> */}
                      <Route path="/overview" element={<PrivateRoute><OmnisDashboard /></PrivateRoute>} />
                      {/* <Route path="/partner-chat" element={<PrivateRoute><PartnerChat /></PrivateRoute>} /> */}
                      <Route path="/saved-scenarios" element={<PrivateRoute><SavedScenarios /></PrivateRoute>} />
                      <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
                      <Route path="/activity-log" element={<PrivateRoute><ActivityLog /></PrivateRoute>} />
                      {/* <Route path="/resources" element={<PrivateRoute><ResourcesPage /></PrivateRoute>} /> */}
                      <Route path="/new-scenario" element={<PrivateRoute><ScenarioTabs /></PrivateRoute>} />
                      <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
                      <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
                      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
                      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
                      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    </Routes>
                  </div>

                  {showUpgradeModal && (location.pathname === '/dashboard' || location.pathname === '/') && (
                    <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
                  )}

                </MemoryProvider>
              </OmnisProvider>
              </NotificationsProvider>

              {!hideLayout && <Footer />}
              {!hideLayout && <CreatorsCorner />}
              {!hideLayout && <FeedbackButton />}
            </AccountProvider>
          </div>
        </main>
      </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationsProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationsProvider>
    </ErrorBoundary>
  );
}
