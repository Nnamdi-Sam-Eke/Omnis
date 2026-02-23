import React, { useState, useEffect} from 'react';
import { FiUser, FiUsers, FiLogOut, FiBell, FiMenu } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import favicon from '../images/SVG.svg';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import LogoutSplash from './logoutSplash';
import NotificationDropdown from './NotificationsDropdown';

const Header = ({
  toggleSidebar,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
}) => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(false);
  const navigate = useNavigate();
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const { logout } = useAuth();
  const [localLogoutMessage, setLocalLogoutMessage] = useState('');

  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setShowSplash(true);
    await delay(5000);
    await logout();
    navigate('/login');
  };

  const toTitleCase = (str) => {
    return str
      .replace(/\_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const pageTitle = toTitleCase(
    location.pathname
      .split('/')
      .filter(Boolean)
      .join(' ') || 'Overview'
  );

  return (
    <>
      {/* Modern Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-700/20 transition-all duration-300">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            
            {/* Left Section - Logo & Sidebar Toggle */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="group p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                aria-label="Toggle sidebar"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-20"></div>
                  <img
                    src={favicon}
                    alt="Omnis Logo"
                    className="relative w-8 h-8 object-contain dark:invert"
                  />
                </div>
                {/* <FiMenu className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" /> */}
              </button>

              <div className="flex items-center space-x-3">
                <h1 className="text-2xl ml-20 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                  Omnis
                </h1>
              </div>
            </div>

            {/* Center Section - Page Title */}
            <div className="flex items-center flex-1 justify-center mx-4">
              <h2 className="text-lg sm:text-lg md:text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize truncate max-w-full">
                {pageTitle}
              </h2>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center space-x-3">
              
              {/* Theme Toggle */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* Notifications */}
              <div className="relative hidden sm:block">
                <Link
                  to="/notifications"
                  className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-200 group"
                  aria-label="Notifications"
                >
                   🔔
                   {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium shadow-lg animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <NotificationDropdown />
              </div>

              {/* Profile Menu */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className="flex items-center space-x-2 p-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 shadow-sm hover:shadow-md group"
                  aria-label="Profile menu"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user?.firstName || 'User'} {user?.lastName || ''}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <FiUser className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          Profile
                        </span>
                      </Link>

                      <Link
                        to="/account"
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <FiUsers className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          Account
                        </span>
                      </Link>

                      <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                        >
                          <FiLogOut className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-200" />
                          <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-200">
                            Log Out
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile optimization - remove duplicate title */}
      </header>

      {/* Success Message */}
      {localLogoutMessage && (
        <div className="fixed top-20 right-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl shadow-lg z-40 animate-in slide-in-from-right duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">{localLogoutMessage}</span>
          </div>
        </div>
      )}

      {/* Render logout animation when logging out */}
      {showSplash && <LogoutSplash />}
    </>
  );
};

export default Header;