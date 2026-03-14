// Updated Sidebar.js - Add onHoverChange prop
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
 FiGrid, FiPlus, FiBookmark, FiBarChart,
  FiList, FiHelpCircle,FiUserX, FiLogOut, FiCreditCard
} from 'react-icons/fi';
import { useAuth } from '../AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import LogoutSplash from './logoutSplash';
import { AnimatePresence, motion } from "framer-motion";

function Sidebar({ isSidebarOpen, setIsSidebarOpen, onHoverChange }) {
  const { logout, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutMessage, setLogoutMessage] = useState('');
  const [showSplash, setShowSplash] = useState(false);
  const sidebarRef = useRef(null);
  // const { accounts, activeAccount, setActiveAccount } = useAccounts(); // removed: AccountContext deleted
  const [toastMessage, setToastMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleAddAccountClick = () => {
    setToastMessage("Feature Coming Soon!");
    setTimeout(() => setToastMessage(""), 4000);
  };

  const switchAccount = async (accountName) => {
    const account = accounts.find(acc => acc.name === accountName);
    if (!account) return;
    try {
      await logout();
      await login(account.user.email, account.password);
      setActiveAccount(account.name);
    } catch (error) {
      alert("Failed to switch account. Please try logging in again.");
    }
  };

  // Notify parent component when hover state changes
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHoverChange) onHoverChange(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const handleLogout = async () => {
    setShowSplash(true);
    setLogoutMessage('Logging out...');
    await delay(2500);
    setLogoutMessage('Redirecting to login page...');
    await delay(2000);
    await logout();
    navigate('/login');
  };

  const navItems = [
    // { name: 'Home', icon: <FiHome />, path: '/home' },
    { name: 'Overview', icon: <FiGrid />, path: '/overview' },
    // { name: 'Partner Chat', icon: <FiMessageCircle />, path: '/partner-chat' },
    { name: 'New Scenario', icon: <FiPlus />, path: '/new-scenario' },
    { name: 'Saved Scenarios', icon: <FiBookmark />, path: '/saved-scenarios' },
    { name: 'Analytics', icon: <FiBarChart />, path: '/analytics' },
    { name: 'Activity Log', icon: <FiList />, path: '/activity-log' },
    // { name: 'Resources', icon: <FiDatabase />, path: '/resources' },
    // { name: 'Payments', icon: <FiCreditCard />, path: '/payments' },
    { name: 'Support', icon: <FiHelpCircle />, path: '/support' },
    // { name: 'Settings', icon: <FiSettings />, path: '/settings' },
    { name: 'My Profile', icon: <FiUserX />, path: '/profile', mobileOnly: true }
  ];

  return (
    <>
      {showSplash && <LogoutSplash message={logoutMessage} />}

      <aside
        ref={sidebarRef}
        id="sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed min-h-screen inset-y-0 left-0 transition-all duration-300 ease-in-out z-30
          backdrop-blur-xl bg-gradient-to-br from-blue-600/95 via-indigo-600/95 to-purple-600/95 
          text-white dark:from-gray-900/95 dark:via-gray-800/95 dark:to-gray-700/95
          border-r border-white/10 dark:border-gray-700/50 shadow-2xl
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          sm:translate-x-0
          ${isHovered ? 'w-64' : 'w-64 sm:w-20'}`}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
        
       <div className="relative h-full overflow-y-auto p-4 flex flex-col justify-between
              scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">          <AnimatePresence>
            {toastMessage && (
              <motion.div
                key="toast"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                className="z-[1000]"
                style={{
                  position: "absolute",
                  bottom: "120px",
                  left: "50%",
                  transform: "translateX(-50%) translateY(-25px)",
                  marginBottom: "0.5rem",
                }}
              >
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl p-4 max-w-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Coming Soon</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{toastMessage}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            {/* User profile section */}
            <div className="flex flex-col items-center mt-12 mb-8">
              <div className="relative group">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="User Avatar"
                    className={`rounded-full border-4 border-white/20 shadow-2xl 
                             transform transition-all duration-300 hover:scale-110 hover:shadow-3xl
                             ring-4 ring-white/10 hover:ring-white/20
                             ${isHovered ? 'w-24 h-24' : 'sm:w-12 sm:h-12 w-24 h-24'}`}
                  />
                ) : (
                  <div className={`rounded-full bg-gradient-to-br from-gray-300 to-gray-400 
                                animate-pulse shadow-2xl ring-4 ring-white/10
                                ${isHovered ? 'w-24 h-24' : 'sm:w-12 sm:h-12 w-24 h-24'}`} />
                )}
                <div className={`absolute -bottom-2 -right-2 bg-green-500 rounded-full 
                              border-3 border-white shadow-lg animate-pulse
                              ${isHovered ? 'w-6 h-6' : 'sm:w-4 sm:h-4 w-6 h-6'}`}></div>
              </div>
              {(isHovered || window.innerWidth < 640) && (
                <>
                  <h2 className="mt-4 text-xl font-bold text-center bg-gradient-to-r from-white to-gray-100 
                               bg-clip-text text-transparent drop-shadow-lg whitespace-nowrap overflow-hidden text-ellipsis w-full px-2">
                    {user?.firstName || 'User'} {user?.lastName || 'Name'}
                  </h2>
                  <div className="mt-1 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                    <span className="text-xs text-white/80 font-medium">Online</span>
                  </div>
                </>
              )}
            </div>

            {/* Navigation items */}
            <ul className="space-y-2">
              {navItems.map(({ name, icon, path, mobileOnly }) => {
                const isActive = location.pathname === path;

                return (
                  <li key={name} className={`${mobileOnly ? 'block sm:hidden' : ''}`}>
                    <Link
                      to={path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`group flex items-center rounded-2xl transition-all duration-300
                        relative overflow-hidden hover:scale-[1.02] active:scale-[0.98]
                        ${isHovered ? 'gap-4 px-4 py-3' : 'sm:justify-center sm:px-2 sm:py-3 gap-4 px-4 py-3'}
                        ${isActive
                          ? 'bg-white/20 backdrop-blur-sm shadow-lg ring-1 ring-white/30 text-white font-bold'
                          : 'hover:bg-white/10 hover:backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-white/20'
                        }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-blue-400 rounded-r-full" />
                      )}

                      <div className={`flex items-center text-lg ${isHovered ? 'gap-4' : 'sm:gap-0 gap-4'}`}>
                        <div className={`p-2 rounded-xl transition-all duration-300
                          ${isActive 
                            ? 'bg-white/20 text-white shadow-lg' 
                            : 'group-hover:bg-white/10 group-hover:shadow-md'
                          }`}>
                          {icon}
                        </div>
                        {(isHovered || window.innerWidth < 640) && (
                          <span className="font-medium tracking-wide whitespace-nowrap">{name}</span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Accounts section */}
            {/* {(isHovered || window.innerWidth < 640) && (
              <div className="mt-8 border-t border-white/20 pt-6">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  Accounts
                </h4>
                <div className="space-y-2 relative flex flex-col items-center">
                  {accounts.map((acc) => (
                    <button
                      key={acc.name}
                      onClick={() => switchAccount(acc.name)}
                      className={`block w-full text-left px-4 py-3 rounded-2xl transition-all duration-300
                        hover:scale-[1.02] active:scale-[0.98] font-medium
                        ${acc.name === activeAccount
                          ? 'bg-white/20 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm'
                          : 'hover:bg-white/10 hover:shadow-md hover:ring-1 hover:ring-white/20 hover:backdrop-blur-sm'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 
                                      rounded-full flex items-center justify-center text-xs font-bold">
                          {acc.user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{acc.user.email}</span>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={handleAddAccountClick}
                    aria-disabled="true"
                    className="mt-3 block w-full text-left px-4 py-3 rounded-2xl 
                         bg-gradient-to-r from-green-500/80 to-emerald-500/80 
                         backdrop-blur-sm opacity-80 cursor-not-allowed 
                         flex items-center gap-3 font-medium shadow-lg
                         hover:from-green-500/90 hover:to-emerald-500/90 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">+</span>
                    </div>
                    <span>Add Account</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white/80 ml-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 11V17M12 7h.01M17 21H7a2 2 0 01-2-2V7a2 2 0 012-2h3m4 0h3a2 2 0 012 2v12a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )} */}
          </div>

          {/* Bottom section - Mobile only */}
          <div className="sm:hidden mt-6">
            <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-3 justify-around text-sm shadow-lg">
              <ThemeToggle />
              <Link
                to="/notifications"
                className="cursor-pointer hover:text-blue-200 relative p-2 rounded-xl
                         hover:bg-white/10 transition-all duration-200"
                onClick={() => setIsSidebarOpen(false)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                 w-5 h-5 rounded-full flex items-center justify-center 
                                 animate-bounce shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/account"
                className="cursor-pointer hover:text-blue-200 p-2 rounded-xl
                         hover:bg-white/10 transition-all duration-200"
                onClick={() => setIsSidebarOpen(false)}
              >
                👤
              </Link>
            </div>

            <div className="mt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 
                         bg-red-500/20 backdrop-blur-sm rounded-2xl text-red-300 
                         hover:bg-red-500/30 hover:text-red-200 transition-all duration-300
                         shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <FiLogOut className="text-lg" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;