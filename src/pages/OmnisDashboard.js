import React, { useEffect, useState, Suspense } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc
} from 'firebase/firestore';
import { LineChart } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ActionButtons from '../components/ActionButton';
import CommandPalette from '../components/CommandPalette';
import SkeletonLoader from '../components/SkeletonLoader'; 
import QuickActions from '../components/QuickActionButtons';
// Lazy-loaded components
// const ActivityFeed = lazy(() => import('../components/ActivityFeed'));


const OmnisDashboard = () => {
  const [userFirstName, setUserFirstName] = useState(null);
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('quickStats');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isTabTransitioning, ] = useState(false);
  
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Top of the morning';
    if (hour < 18) return 'Good afternoon';
    return 'Evening vibes';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅'; // morning
    if (hour < 18) return '☀️'; // afternoon
    return '🌙'; // evening
  };


  useEffect(() => {
    if (user) {
      const fetchUserName = async () => {
        setIsLoadingName(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnapshot = await getDoc(userDocRef);
          if (docSnapshot.exists()) {
            setUserFirstName(docSnapshot.data().firstname);
          }
        } catch (error) {
          console.error('Error fetching user name: ', error);
        } finally {
          setIsLoadingName(false);
        }
      };
      fetchUserName();
    } else {
      setIsLoadingName(false);
    }
  }, [user, db]);

  useEffect(() => {
    const handler = (e) => {
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

  return (
    <>
      {/* <TrialSlip user={user} /> */}
    
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setCommandPaletteOpen} setActiveTab={setActiveTab} />
      
      <div className="p-4 flex-1 overflow-y-auto pb-20 space-y-6 h-[140vh] mt-10 transition-all duration-500 
                    bg-gradient-to-br from-gray-50/50 via-white/30 to-blue-50/50 
                    dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-700/50">
        
        {/* Header Section */}
        <div className="mb-6 mt-8">
          {/* Mobile & Tablet: Weather above greeting */}
          <div className="block lg:hidden space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 
                           bg-clip-text text-transparent drop-shadow-lg">
                {getGreeting()}, {isLoadingName ? <span className="animate-pulse">...</span> : (userFirstName || 'there')}
            </h1>
            <div className="inline-block text-4xl animate-bounce mt-2">{getGreetingEmoji()}</div>
          </div>
          {/* Desktop: Absolute positioning */}
          <div className="hidden lg:block relative">
           <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 
                           bg-clip-text text-transparent drop-shadow-lg">
                {getGreeting()}, {isLoadingName ? <span className="animate-pulse">...</span> : (userFirstName || 'there')}
            </h1>
            <div className="inline-block text-4xl animate-bounce mt-2">{getGreetingEmoji()}</div>
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
                         <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                             <LineChart className="w-7 h-7 text-white" />
                           </div>
                           <div>
                             <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                               Overview & Quick Stats
                             </h1>
                             <p className="text-slate-600 dark:text-slate-300 mt-1">
                               Insights and performance metrics at a glance
                             </p>
                           </div>
                         </div>

                {/* KPI Cards */}
                <div className="mb-8">
                  <Suspense fallback={<SkeletonLoader height="h-40" />}>
                    <KpiCard />
                  </Suspense>
                </div>

                {/* Main Dashboard Grid */}
                <Suspense fallback={<SkeletonLoader height="h-[300px]" />}>
                  <div className="mb-8">
                    <div>
                      <ActionButtons />
                      <div className="flex justify-center">
                        <QuickActions />
                      </div>
                    </div>
                    <div>
                      {/* <ActivityFeed /> */}
                    </div>
                  </div>
                  
                </Suspense>
              </div>
            )}
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
                  { key: 'Alt + 1', desc: 'Pilot Dashboard Tab' },
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