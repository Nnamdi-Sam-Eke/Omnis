import React, { useEffect, useState } from 'react';
import { getAuth, updatePassword, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path to your firebase config
import { useAuth } from '../AuthContext';
import { Eye, EyeOff, User, Shield, Monitor, AlertTriangle, Edit3, Clock, Smartphone, CreditCard } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import PaymentsPage from './PaymentsPage';


const AccountPage = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'Summary');
  const { user } = useAuth(); // Authenticated Firebase user
  const [userData, setUserData] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Update activeTab when URL query parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [reauthenticating, setReauthenticating] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [lastActivity, setLastActivity] = useState('Loading...');
  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  // Dummy 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const auth = getAuth(); // Declare auth once at component level

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load user data');
        }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const usersRef = collection(db, 'users');
    // Query the latest lastLogin for current user
    const q = query(
      usersRef,
      orderBy('lastLogin', 'desc'),
      limit(1)
    );

    const unsubscribeLastLogin = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        if (doc && doc.data().lastLogin) {
          let lastLoginDate;
          const storedLoginStr = sessionStorage.getItem('sessionLastLogin');
          if (storedLoginStr) {
            lastLoginDate = new Date(storedLoginStr);
          } else {
            lastLoginDate = new Date(doc.data().lastLogin.toDate());
            sessionStorage.setItem('sessionLastLogin', lastLoginDate.toISOString());
          }
          const now = new Date();
          const diffMins = Math.floor((now - lastLoginDate) / (1000 * 60));
          if (diffMins < 60) setLastActivity(`${diffMins} mins ago`);
          else if (diffMins < 1440) setLastActivity(`${Math.floor(diffMins / 60)} hours ago`);
          else setLastActivity(`${Math.floor(diffMins / 1440)} days ago`);
        } else {
          setLastActivity('No login data');
        }
      } else {
        setLastActivity('No login data');
      }
    });

    return () => unsubscribeLastLogin();
  }, [user?.uid]);

  const reauthenticate = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('User not authenticated');
    }

    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);

    try {
      await reauthenticateWithCredential(firebaseUser, credential);
      return true;
    } catch (error) {
      console.error('Reauthentication failed:', error.message);
      toast.error('Reauthentication failed. Please check your password.');
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!auth.currentUser) return;

    try {
      const user = auth.currentUser;
      const sessionRef = doc(db, 'sessions', user.uid);

      if (actionToConfirm === 'signout') {
        await signOut(auth);
        sessionStorage.removeItem('sessionLastLogin');
        toast.success('Signed out from this session.');
        window.location.reload();
      }
      else if (actionToConfirm === 'signout_all') {
        await deleteDoc(sessionRef); // Removes session from Firestore
        await signOut(auth);
        sessionStorage.removeItem('sessionLastLogin');
        toast.success('Signed out from all sessions.');
        window.location.reload();
      }
      else if (actionToConfirm === 'delete_account') {
        if (!currentPassword) {
          toast.error('Please enter your current password to confirm.');
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await deleteDoc(doc(db, 'users', user.uid));
        await deleteDoc(sessionRef);
        await deleteUser(user);

        sessionStorage.removeItem('sessionLastLogin');
        toast.success('Your account has been deleted.');
        await signOut(auth);
  } else {
        toast.error('Unknown action. Please try again.');
      }

      setShowConfirmModal(false);
      setActionToConfirm(null);
      setReauthenticating(false);
      setCurrentPassword('');

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'An error occurred. Please try again.');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password.');
      return;
    }

    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(firebaseUser, newPassword);
      toast.success('Password updated successfully!');
      setNewPassword('');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        setReauthenticating(true); // show reauthentication form
        toast.error('Please reauthenticate to change your password.');
      } else {
        console.error('Password update error:', error.message);
        toast.error('Error updating password: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'Summary', label: 'Summary', icon: User },
    { id: 'Billing', label: 'Billing', icon: CreditCard },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'Sessions', label: 'Sessions', icon: Monitor },
    { id: 'Danger Zone', label: 'Danger Zone', icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Account Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Manage your account preferences and security settings
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <IconComponent size={18} className={`transition-transform duration-300 ${
                  activeTab === tab.id ? 'rotate-12' : 'group-hover:rotate-12'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
          {/* Summary Tab */}
          {activeTab === 'Summary' && userData && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full">
                  <User className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* User ID Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border border-blue-100 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">User ID</label>
                        <span className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                          {showUserId ? user?.uid || 'N/A' : '••••••••••••••••••••••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowUserId((prev) => !prev)}
                        className="ml-4 p-2 rounded-lg bg-white/60 hover:bg-white/80 dark:bg-gray-600/60 dark:hover:bg-gray-600/80 transition-all duration-200"
                        aria-label="Toggle User ID visibility"
                        type="button"
                      >
                        {showUserId ? <EyeOff size={20} className="text-gray-600" /> : <Eye size={20} className="text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', value: user?.firstname || userData?.firstname || 'N/A' },
                      { label: 'Last Name', value: user?.lastname || userData?.lastname || 'N/A' },
                      { label: 'Email', value: user?.email || userData?.email || 'N/A' },
                      { label: 'Phone', value: user?.phone || userData?.phone || 'N/A' },
                      { label: 'City', value: user?.city || userData?.city || 'N/A' },
                      { label: 'Country', value: user?.country || userData?.country || 'N/A' }
                    ].map((field, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">{field.label}</label>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile Picture Placeholder */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    {<img
                    src={user.profilePicture}
                    alt="User Avatar"
                    className="w-30 h-36 rounded-full border-4 border-white/20 shadow-2xl 
                             transform transition-all duration-300 hover:scale-110 hover:shadow-3xl
                             ring-4 ring-white/10 hover:ring-white/20"
                  />||<User size={60} className="text-white" />}
                  </div>
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {userData?.firstname || 'User'} {userData?.lastname || ''}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{userData?.email}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigate('/profile')}
                  className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  type="button"
                >
                  <Edit3 size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  Edit Profile
                </button>
              </div>
            </div>
          )}

           {/* Billings Tab */}
          {activeTab === 'Billing' && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                  <Monitor className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">BIlling</h2>
              </div>
              
              <PaymentsPage />
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'Security' && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                  <Shield className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Security Settings</h2>
              </div>
              
              <div className="max-w-md space-y-6">
                {/* New Password Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border border-emerald-100 dark:border-gray-600">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className="text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">Two-Factor Authentication</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={twoFAEnabled}
                        onChange={() => setTwoFAEnabled((prev) => !prev)}
                      />
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        twoFAEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                          twoFAEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        } mt-0.5`}></div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handlePasswordChange}
                  type="button"
                  disabled={loading}
                  className={`w-full px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'Sessions' && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                  <Monitor className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Active Sessions</h2>
              </div>
              
              {/* Session Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border border-blue-100 dark:border-gray-600 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-800 dark:text-gray-200 font-medium">Last Activity</span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lastActivity}</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    setActionToConfirm('signout');
                    setShowConfirmModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  type="button"
                >
                  Sign Out This Session
                </button>
                <button
                  onClick={() => {
                    setActionToConfirm('signout_all');
                    setShowConfirmModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-xl hover:from-red-800 hover:to-red-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  type="button"
                >
                  Sign Out All Sessions
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'Danger Zone' && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700 mb-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                      Account Deletion Warning
                    </h3>
                    <p className="text-red-700 dark:text-red-400 leading-relaxed">
                      Deleting your account is irreversible. All your data will be permanently removed.
                      This action cannot be undone. Please make sure you have backed up any important data.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActionToConfirm('delete_account');
                  setReauthenticating(true);
                  setShowConfirmModal(true);
                }}
                className="px-8 py-4 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-xl hover:from-red-800 hover:to-red-900 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                type="button"
              >
                Delete Account Permanently
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
                {actionToConfirm === 'signout' && 'Confirm Sign Out'}
                {actionToConfirm === 'signout_all' && 'Sign Out All Sessions'}
                {actionToConfirm === 'delete_account' && 'Delete Account'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {actionToConfirm === 'signout' &&
                  'Are you sure you want to sign out from this session?'}
                {actionToConfirm === 'signout_all' &&
                  'This will log you out from all devices and sessions.'}
                {actionToConfirm === 'delete_account' &&
                  'This action is permanent and cannot be undone.'}
              </p>
            </div>

            {/* Password input for account deletion */}
            {actionToConfirm === 'delete_account' && reauthenticating && (
              <div className="mb-6">
                <label htmlFor="current-password" className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                  Confirm with your current password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium"
                type="button"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setActionToConfirm(null);
                  setReauthenticating(false);
                  setCurrentPassword('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300 font-medium"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;