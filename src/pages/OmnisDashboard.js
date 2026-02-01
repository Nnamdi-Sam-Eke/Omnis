import React, { useEffect, useState, lazy, Suspense } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

import KpiCard from '../components/KpiCard';
import ActionButtons from '../components/ActionButton';
import CommandPalette from '../components/CommandPalette';
// import AchievementsTab from '../components/AchievementsTab'; // ✅ Commented out
import SkeletonLoader from '../components/SkeletonLoader'; 
import QuickActions from '../components/QuickActionButtons';
import DiscountBanner from '../components/DiscountBanner';
import WeatherLocation from '../components/WeatherLocation';

// Lazy-loaded components
const ActivityFeed = lazy(() => import('../components/ActivityFeed'));
const SimulationTrendsChart = lazy(() => import('../components/SimulationTrendsChart'));


const OmnisDashboard = () => {
  const [userFirstName, setUserFirstName] = useState(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [activeTab, setActiveTab] = useState('quickStats');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDiscountBanner, setShowDiscountBanner] = useState(true);
  const [discountEndDate, setDiscountEndDate] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Smooth tab switching with transition state
  const handleTabSwitch = (newTab) => {
    if (newTab === activeTab || isTabTransitioning) return;
    
    setIsTabTransitioning(true);
    
    // Quick transition - reduced delay for smoother UX
    setTimeout(() => {
      setActiveTab(newTab);
      setIsTabTransitioning(false);
    }, 150);
  };

  // Fetch user data and check subscription status
  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        // Check subscription tier
        if (data.subscriptionTier && data.subscriptionTier !== "free") {
          // User upgraded - no banner
          setDiscountEndDate(null);
          setShowBanner(false);
          return;
        }

        if (data.discountAvailableUntil) {
          const discountUntilDate = data.discountAvailableUntil.toDate
            ? data.discountAvailableUntil.toDate()
            : new Date(data.discountAvailableUntil);

          if (discountUntilDate > new Date()) {
            setDiscountEndDate(discountUntilDate);
            setShowBanner(true);
          } else {
            setDiscountEndDate(null);
            setShowBanner(false);
          }
        }
      }
    }

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchFilteredData = async () => {
      if (searchQuery.trim() === '') {
        setFilteredData([]);
        return;
      }
      try {
        const q = query(
          collection(db, 'activities'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff')
        );
        const querySnapshot = await getDocs(q);
        setFilteredData(querySnapshot.docs.map(doc => doc.data()));
      } catch (error) {
        console.error('Error fetching filtered data: ', error);
      }
    };
    fetchFilteredData();
  }, [searchQuery, db]);

  useEffect(() => {
    if (user) {
      const fetchUserName = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnapshot = await getDoc(userDocRef);
          if (docSnapshot.exists()) {
            setUserFirstName(docSnapshot.data().firstname);
          }
        } catch (error) {
          console.error('Error fetching user name: ', error);
        }
      };
      fetchUserName();
    }
  }, [user, db]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('dashboard-search')?.focus();
      }
      if (e.altKey && e.key === '1') handleTabSwitch('quickStats');
      // if (e.altKey && e.key === '2') handleTabSwitch('achievements'); // ✅ Commented out
      if (e.key === 'Escape') document.activeElement.blur();
      if (e.key === '?') setShowShortcuts(prev => !prev);
      if (e.key === 'Enter' && showShortcuts) {
        setShowShortcuts(false);
        document.activeElement.blur();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts, isTabTransitioning]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">🔒</span>
          </div>
          <p className="text-xl font-semibold text-gray-800 dark:text-white">Please login to see your dashboard.</p>
        </div>
      </div>
    );
  }
  
  // const tabLabels = {
  //   quickStats: 'Pilot Dashboard',
  //     // achievements: 'Accomplishments', // ✅ Commented out
  // };

  // const tabIcons = {
  //   quickStats: '🎯',
  //   // achievements: '🏆' // ✅ Commented out
  // };

  return (
    <>
      {/* <TrialSlip user={user} /> */}
      {showBanner && discountEndDate && (
        <DiscountBanner
          discountEndDate={discountEndDate}
          onClose={() => setShowBanner(false)}
        />
      )}
    
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setCommandPaletteOpen} setActiveTab={setActiveTab} />
      
      <div className="p-4 flex-1 overflow-y-auto pb-20 space-y-6 h-[140vh] mt-10 transition-all duration-500 
                    bg-gradient-to-br from-gray-50/50 via-white/30 to-blue-50/50 
                    dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-700/50">
        
        {/* Header Section */}
        <div className="mb-6 mt-8">
          {/* Mobile & Tablet: Weather above greeting */}
          <div className="block lg:hidden space-y-3">
            <div className="flex justify-center sm:justify-start">
              <WeatherLocation />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 
                           bg-clip-text text-transparent drop-shadow-lg">
                {getGreeting()}, {userFirstName || 'there'}
            </h1>
            <div className="inline-block text-4xl animate-bounce mt-2">👋</div>
          </div>
          {/* Desktop: Absolute positioning */}
          <div className="hidden lg:block relative">
           <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 
                           bg-clip-text text-transparent drop-shadow-lg">
                {getGreeting()}, {userFirstName || 'there'}
            </h1>
            <div className="inline-block text-4xl animate-bounce mt-2">👋</div>
            <div className="absolute mb-10 top-0 right-0">
              <WeatherLocation />
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation - ✅ Only showing quickStats now */}
        {/* Main Content with improved transitions */}
        <div className="relative min-h-[600px]">
          {/* Content container with crossfade effect */}
          <div className={`transition-all duration-300 ease-out ${
            isTabTransitioning 
              ? 'opacity-0 transform translate-y-2 pointer-events-none' 
              : 'opacity-100 transform translate-y-0'
          }`}>
            
            {activeTab === 'quickStats' && (
              <div id="quickStats-panel" role="tabpanel" aria-labelledby="quickStats-tab">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                               bg-clip-text text-transparent mb-6">
                    Quick stats, activity logs etc..
                  </h2>
                  
                  {/* Search Input */}
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      id="dashboard-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search activities..."
                      title="Search for activities"
                      className="pl-12 pr-4 py-4 w-full sm:w-2/3 border-0 rounded-2xl text-sm 
                               bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl
                               text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-gray-800
                               transition-all duration-300"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center">
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">
                        /
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {filteredData.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      Search Results
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {filteredData.map((item, index) => (
                        <div
                          key={index}
                          className="group p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl 
                                   shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer
                                   border border-white/20 dark:border-gray-700/50"
                          title="Click for more details"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
                                          flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {item.name?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-800 dark:text-white mb-2 
                                           group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.name}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPI Cards */}
                <div className="mb-8">
                  <Suspense fallback={<SkeletonLoader height="h-40" />}>
                    <KpiCard />
                  </Suspense>
                </div>

                {/* Main Dashboard Grid */}
                <Suspense fallback={<SkeletonLoader height="h-[300px]" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div>
                      <ActivityFeed />
                    </div>
                    <div>
                      <SimulationTrendsChart />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    
                    <div>
                      <ActionButtons />
                    </div>
                  </div>
                </Suspense>

                {/* Quick Actions */}
                <div className="flex justify-center">
                  <QuickActions />
                </div>
              </div>
            )}

            {/* ✅ Accomplishments tab commented out */}
            {/* {activeTab === 'achievements' && (
              <div id="achievements-panel" role="tabpanel" aria-labelledby="achievements-tab">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                               bg-clip-text text-transparent mb-2">
                    Accomplishments & Recognition
                  </h2>
                  <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </div>
                <Suspense fallback={<SkeletonLoader height="h-[200px]" />}>
                  <AchievementsTab />
                </Suspense>
              </div>
            )} */}
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm
                     animate-in fade-in duration-300"
          >
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl 
                          w-full max-w-md relative border border-white/20 dark:border-gray-700/50
                          animate-in zoom-in-90 slide-in-from-bottom-4 duration-300">
              
              <button
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full
                         text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200
                         flex items-center justify-center"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close keyboard shortcuts"
              >
                ✕
              </button>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Keyboard Shortcuts
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              </div>
              
              <div className="space-y-4">
                {[
                  { key: '/', desc: 'Focus search' },
                  { key: 'Alt + 1', desc: 'Pilot Dashboard Tab' },
                  // { key: 'Alt + 2', desc: 'Analytics Tab' }, // ✅ Commented out
                  // { key: 'Alt + 3', desc: 'Accomplishments Tab' }, // ✅ Commented out
                  { key: 'Esc', desc: 'Blur input / Close modals' },
                  { key: '?', desc: 'Toggle this help dialog' },
                  { key: 'Enter', desc: 'Close this dialog' },
                  { key: 'Ctrl + K / Cmd + K', desc: 'Open Command Palette' }
                ].map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 
                                           rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <kbd className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 
                                  rounded-lg shadow-sm font-mono text-sm font-medium border border-gray-200 dark:border-gray-600">
                      {shortcut.key}
                    </kbd>
                    <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">{shortcut.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OmnisDashboard;