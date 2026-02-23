// src/components/onboarding/StepWrapUp.js
import React from "react";
import { motion } from "framer-motion";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";

function StepWrapUp({ onboardingData }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async () => {
    try {
      if (user?.uid) {
        // Save all collected onboarding data at once
        await setDoc(
          doc(db, "users", user.uid),
          {
            ...onboardingData,            // all globally stored fields
            onboardingComplete: true,     // mark onboarding finished
            onboardingStep: "complete",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }

      // Navigate to overview page
      navigate("/overview");
    } catch (err) {
      console.error("Error finishing onboarding:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-12 max-w-4xl mx-auto px-6">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          duration: 0.8, 
          ease: [0.25, 0.1, 0.25, 1],
          type: "spring",
          stiffness: 120,
          damping: 15
        }}
        className="relative"
      >
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 flex items-center justify-center shadow-2xl relative overflow-hidden">
          {/* Success glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-white/5 backdrop-blur-sm rounded-full" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
            className="relative z-10"
          >
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        </div>

        {/* Celebration particles */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute inset-0 pointer-events-none"
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                x: [0, (Math.cos(i * 60 * Math.PI / 180) * 80)],
                y: [0, (Math.sin(i * 60 * Math.PI / 180) * 80)],
                opacity: [1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                delay: 0.8,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Content Section */}
      <div className="space-y-8 max-w-3xl">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent leading-[1.1]"
        >
          Your Journey
          <br />
          <span className="font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Begins Now
          </span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-6"
        >
          <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-2xl mx-auto">
            You're all set up! Your AI decision companion is ready to help you navigate life's choices with confidence
          </p>
          
          <div className="space-y-4 text-slate-500 max-w-2xl mx-auto">
            <p className="text-base leading-relaxed">
              Every decision becomes
              <span className="font-semibold text-emerald-600"> clearer, faster, and more aligned</span> with your values
            </p>
            <p className="text-base leading-relaxed">
              Welcome to a new way of thinking — with Omnis as your trusted second brain
            </p>
          </div>
        </motion.div>

        {/* Plan Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className={`p-6 rounded-2xl border-2 max-w-lg mx-auto ${
            user?.isPremium 
              ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" 
              : "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              user?.isPremium ? "bg-emerald-500" : "bg-indigo-500"
            }`}>
              {user?.isPremium ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className={`font-semibold ${
              user?.isPremium ? "text-emerald-800" : "text-indigo-800"
            }`}>
              {user?.isPremium ? "Omnis Premium Active" : "Omnis Free Plan"}
            </div>
          </div>
          
          {user?.isPremium ? (
            <p className="text-emerald-700 leading-relaxed">
              Your premium access includes advanced simulations, deeper insights, partner chat, and priority support.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-indigo-700 leading-relaxed">
                You're currently on the free plan with access to basic decision support.
              </p>
              <p className="text-sm text-indigo-600">
                Upgrade to Premium for advanced simulations, deeper foresight, and partner chat features.
              </p>
            </div>
          )}
        </motion.div>

        {/* Next Steps Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto"
        >
          {[
            { icon: "🎯", title: "Make Your First Decision", desc: "Start with a real choice you're facing" },
            { icon: "📊", title: "Explore Simulations", desc: "See potential outcomes before you decide" }
          ].map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/60 text-center"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-slate-800 mb-1">{item.title}</div>
              <div className="text-xs text-slate-600 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="pt-4"
      >
        <motion.button
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleFinish}
          className="px-12 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center justify-center gap-3">
            Enter Dashboard
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default StepWrapUp;