import React, { useState, useEffect } from 'react';
import { useAuth } from "../AuthContext";
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { Camera, Edit3, Save, User, Mail, Phone, MapPin, Info, Check, X } from 'lucide-react';

const ProfilePage = () => {
  const { user, currentUser } = useAuth();
  const auth = getAuth();

  const [userData, setUserData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [errorMessage, setErrorMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isEditable, setIsEditable] = useState(false);
  const [showPopUp, setShowPopUp] = useState(null);
  const [originalValues, setOriginalValues] = useState({});

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
    try {
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      console.error('Error compressing the image', error);
    }
  };

  const saveProfilePicture = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { alert('No user is logged in.'); return; }
    if (!imageBase64) { alert('Please select an image.'); return; }

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, { profilePicture: imageBase64 });
      setProfilePicture(imageBase64);
      setImageBase64(null);
      setShowPopUp("pictureUpdated");
      setTimeout(() => setShowPopUp(null), 3000);
    } catch (error) {
      console.error('Error saving profile picture:', error);
      setShowPopUp("error");
      setTimeout(() => setShowPopUp(null), 3000);
    }
  };

  const clearImagePreview = () => {
    setImageBase64(null);
    setImagePreview(profilePicture);
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setFirstName(data.firstname || "");
          setLastName(data.lastname || "");
          setBio(data.bio || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setCity(data.city || "");
          setCountry(data.country || "");
          const pic = data.profilePicture || null;
          setProfilePicture(pic);
          setImagePreview(pic);
        } else {
          console.error("No user data found in Firestore!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error.message);
      } finally {
        setTimeout(() => setInitialLoading(false), 2000);
      }
    };
    fetchUserData();
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        firstname: firstName,
        lastname: lastName,
        bio,
        email,
        phone,
        city,
        country,
        profileUpdated: serverTimestamp(),
      });
      setShowPopUp("profileUpdated");
      setIsEditable(false);
      setTimeout(() => setShowPopUp(null), 3000);
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setShowPopUp("error");
      setTimeout(() => setShowPopUp(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setOriginalValues({ firstName, lastName, bio, email, phone, city, country });
    setIsEditable(true);
  };

  const handleCancel = () => {
    setFirstName(originalValues.firstName || "");
    setLastName(originalValues.lastName || "");
    setBio(originalValues.bio || "");
    setEmail(originalValues.email || "");
    setPhone(originalValues.phone || "");
    setCity(originalValues.city || "");
    setCountry(originalValues.country || "");
    clearImagePreview();
    setIsEditable(false);
  };

  const ProfileSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-600 rounded-full w-32"></div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (initialLoading) return <ProfileSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">User data not found</p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "contact", label: "Contact Info", icon: Mail },
    { id: "address", label: "Address", icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Success/Error Notifications */}
      {showPopUp && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-lg ${
            showPopUp === "error"
              ? "bg-red-50/90 border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-800 dark:text-red-200"
              : "bg-green-50/90 border-green-200 text-green-800 dark:bg-green-900/90 dark:border-green-800 dark:text-green-200"
          }`}>
            <div className={`w-2 h-2 rounded-full ${showPopUp === "error" ? "bg-red-500" : "bg-green-500"}`} />
            <span className="font-medium">
              {showPopUp === "profileUpdated" && "Profile updated successfully!"}
              {showPopUp === "pictureUpdated" && "Profile picture updated successfully!"}
              {showPopUp === "error" && "Error occurred while updating profile!"}
            </span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex items-center gap-4">
            <div className="relative">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-3 border-green-500/30 rounded-full animate-pulse"></div>
            </div>
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Saving changes...</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 p-8 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Profile Picture */}
            <div className="relative group">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
                <button
                  onClick={() => document.getElementById("file-input").click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>

              {imageBase64 && (
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <button
                    onClick={saveProfilePicture}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={clearImagePreview}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {firstName || "John"} {lastName || "Doe"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">{bio || "No bio available"}</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{email || "No email"}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-full">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {city || "No city"}, {country || "No country"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <input type="file" accept="image/*" id="file-input" onChange={handleImageChange} className="hidden" />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105"
                    : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 p-8 border border-white/20">
          <div className="space-y-6">
            {activeTab === "personal" && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Personal Information</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <ModernInput label="First Name" value={firstName} editable={isEditable} onChange={setFirstName} placeholder="Enter your first name" />
                  <ModernInput label="Last Name" value={lastName} editable={isEditable} onChange={setLastName} placeholder="Enter your last name" />
                </div>
                <ModernInput label="Bio" value={bio} editable={isEditable} onChange={setBio} isTextArea placeholder="Tell us about yourself..." />
              </div>
            )}

            {activeTab === "contact" && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Contact Information</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <ModernInput label="Email Address" value={email} editable={isEditable} onChange={setEmail} placeholder="your.email@example.com" type="email" />
                  <ModernInput label="Phone Number" value={phone} editable={isEditable} onChange={setPhone} placeholder="+1 (555) 123-4567" type="tel" />
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Address Information</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <ModernInput label="City" value={city} editable={isEditable} onChange={setCity} placeholder="Enter your city" />
                  <ModernInput label="Country" value={country} editable={isEditable} onChange={setCountry} placeholder="Enter your country" />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={isEditable ? handleSaveChanges : handleEdit}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                isEditable
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:scale-105"
                  : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25 hover:scale-105"
              }`}
            >
              {isEditable ? (
                <><Save className="w-5 h-5" /> Save Changes</>
              ) : (
                <><Edit3 className="w-5 h-5" /> Edit Profile</>
              )}
            </button>

            {isEditable && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-3 px-6 py-3 rounded-xl font-medium bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <X className="w-5 h-5" /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernInput = ({ label, value, onChange, editable, isTextArea, placeholder, type = "text" }) => (
  <div className="group">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    {editable ? (
      <div className="relative">
        {isTextArea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows="4"
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 resize-none"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
          />
        )}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-200 pointer-events-none"></div>
      </div>
    ) : (
      <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white min-h-[48px] flex items-center">
        {value || <span className="text-gray-400 italic">Not provided</span>}
      </div>
    )}
  </div>
);

export default ProfilePage;