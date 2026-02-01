import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, signInWithPopup } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import imageCompression from "browser-image-compression";
import PulseBackground from "./PulseBackground";
import { motion, AnimatePresence } from "framer-motion";


const AuthForm = () => {
  const { signup, login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idleMessage, setIdleMessage] = useState("");

  // Show message if user was logged out due to inactivity
  useEffect(() => {
    try {
      const flag = localStorage.getItem('idleLoggedOut');
      if (flag) {
        setIdleMessage('You were logged out due to inactivity.');
        localStorage.removeItem('idleLoggedOut');
      }
    } catch (e) {}
  }, []);

  const fetchUserData = async () => {
    const user = getAuth().currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        console.log("Last login:", docSnap.data().lastLogin);
      }
    }
  };

  // const handleGoogleSignIn = async () => {
  //   setIsSubmitting(true);
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     const result = await signInWithPopup(getAuth(), provider);
  //     const user = result.user;
      
  //     const userRef = doc(db, "users", user.uid);
  //     await updateDoc(userRef, { lastLogin: serverTimestamp() });
      
  //     navigate("/dashboard");
  //   } catch (err) {
  //     console.error("Google Sign-In Error:", err);
  //     setError(err.message || "Failed to sign in with Google");
  //     setIsSubmitting(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        await signup(firstname, lastname, phone, email, password, city, country, profilePicture);
      } else {
        await login(email, password);
        const user = getAuth().currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { lastLogin: serverTimestamp() });
          await fetchUserData();
        }
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      alert("Password reset email sent!");
      setShowResetPassword(false);
      setError("");
    } catch (err) {
      console.error("Password Reset Error:", err);
      setError(err.message || "Failed to send reset email");
    }
  };

  const getPasswordStrength = () => {
    if (password.length < 6) return "Weak";
    if (password.match(/[a-z]/) && password.match(/[A-Z]/) && password.match(/[0-9]/) && password.length >= 8) {
      return "Strong";
    }
    return "Medium";
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case "Weak":
        return "text-red-400";
      case "Medium":
        return "text-yellow-400";
      case "Strong":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="relative h-screen bg-black text-white overflow-hidden flex">
      <PulseBackground />
      
      {/* Left Side - Branding */}
      <div className="relative z-10 hidden md:flex w-1/2 flex-col justify-center items-center px-16 space-y-6">
        <h1 className="text-6xl font-bold tracking-tight text-purple-500 drop-shadow-[0_0_8px_rgba(142,68,173,0.6)]">
          Omnis
        </h1>
<p className="text-2xl font-light text-center italic text-white/80">
  Model. Adapt. Succeed.
</p>

      </div>

      {/* Right Side - Auth Form */}
      <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl shadow-lg bg-white/5 backdrop-blur-sm h-[500px] flex flex-col">
          <div className="p-8 overflow-y-auto flex-1">
          {idleMessage && (
            <div className="mb-4 p-3 rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200">
              You were logged out due to inactivity.
            </div>
          )}
          <AnimatePresence mode="wait">
          {showResetPassword ? (
            <motion.div 
              key="reset"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-light mb-4 text-center">Reset Your Password</h2>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="w-full bg-purple-600 to-green-500 text-white py-3 rounded-full transform transition-all duration-200 ease-in-out active:scale-95 hover:shadow-lg hover:shadow-purple-500/50"
                >
                  Send Password Reset Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setIsSignUp(false);
                    setError("");
                  }}
                  className="w-full text-blue-400 hover:underline mt-2 transition-all duration-200 ease-in-out"
                >
                  Back to Login
                </button>
              </div>
            </motion.div>
          ) : (
            <>
            <motion.div
              key={isSignUp ? "signup" : "login"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-center space-x-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transform transition-all duration-200 ease-in-out active:scale-95 hover:shadow-lg ${
                    isSignUp ? "bg-purple-600 text-white hover:shadow-purple-500/50" : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setIsSignUp(true)}
                >
                  Sign Up
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transform transition-all duration-200 ease-in-out active:scale-95 hover:shadow-lg ${
                    !isSignUp ? "bg-purple-600 text-white hover:shadow-purple-500/50" : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setIsSignUp(false)}
                >
                  Log In
                </button>
              </div>
              <h2 className="text-center text-2xl font-light">
                {isSignUp ? "Create Your Omnis Account" : "Welcome Back!"}
              </h2>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="space-y-6 mt-6">
                {isSignUp && (
                  <>
                    <input type="text" placeholder="First Name" value={firstname} onChange={(e) => setFirstname(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />
                    <input type="text" placeholder="Last Name" value={lastname} onChange={(e) => setLastname(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />
                    <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />
                    <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />
                    <input type="text" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const options = { maxSizeMB: 1, maxWidthOrHeight: 500 };
                          try {
                            const compressedFile = await imageCompression(file, options);
                            const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
                            setProfilePicture(base64);
                          } catch (error) {
                            console.error("Image compression error", error);
                          }
                        }
                      }}
                      className="input bg-white/10 text-white placeholder-white/50 border-white/20"
                    />
                    {profilePicture && (
                      <motion.img 
                        src={profilePicture} 
                        alt="Preview" 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-20 h-20 rounded-full mx-auto mt-2 object-cover border-2 border-white/30 shadow-lg" 
                      />
                    )}
                  </>
                )}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input bg-white/10 text-white placeholder-white/50 border-white/20" />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input pr-10 bg-white/10 text-white placeholder-white/50 border-white/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-3 transform -translate-y-1/2 text-white/50">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {isSignUp && (
                  <>
                    <p className="text-sm">
                      Password strength: <span className={getStrengthColor(getPasswordStrength())}>{getPasswordStrength()}</span>
                    </p>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="input pr-10 bg-white/10 text-white placeholder-white/50 border-white/20"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute top-1/2 right-3 transform -translate-y-1/2 text-white/50">
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full bg-purple-600 text-white py-3 rounded-full transform transition-all duration-200 ease-in-out active:scale-95 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSignUp
                    ? (isSubmitting ? "Creating your Omnis account..." : "Sign Up")
                    : (isSubmitting ? "Logging in..." : "Log In")}
                </button>

                {!isSignUp && (
                  <button type="button" onClick={() => setShowResetPassword(true)} className="w-full text-sm text-blue-400 mt-2 hover:underline transition-all duration-200 ease-in-out">
                    Forgot Password?
                  </button>
                )}

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  {/* <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white/5 text-white/70">or</span>
                  </div> */}
                </div>

                {/* <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white/10 border border-white/20 hover:bg-white/20 text-white py-3 rounded-full transform transition-all duration-200 ease-in-out active:scale-95 hover:shadow-lg hover:shadow-white/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button> */}
              </div>
            </motion.div>
            </>
          )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;