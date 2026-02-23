// src/components/onboarding/OnboardingContainer.js
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../AuthContext";

import StepSplash from "./StepSplash";
import StepWelcome from "./StepWelcome";
import StepIdentity from "./StepIdentity";
import StepFatigue from "./StepFatigue";
import StepTwinConnection from "./StepTwinConnection";
import StepPreviewScenario from "./StepDemoScenario";
import StepWrapUp from "./StepWrapUp";
import ProgressIndicator from "./ProgressIndicator";

const steps = [
  StepSplash,
  StepWelcome,
  StepIdentity,
  StepFatigue,
  StepTwinConnection,
  StepPreviewScenario,
  StepWrapUp,
];

function OnboardingContainer({ onComplete }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({}); // global onboarding data
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish(); // Save all data at the end
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Save all onboarding data to Firestore at the end
  const handleFinish = async () => {
    if (!user?.uid) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...onboardingData,
          onboardingStep: "completed",
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Optional: callback after onboarding completed
      if (onComplete) onComplete();

      // Redirect to dashboard
      navigate("/overview");
    } catch (err) {
      console.error("Error saving onboarding data:", err);
      alert("Failed to save onboarding data. Please try again.");
    }
  };

  const StepComponent = steps[currentStep];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Modern gradient background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/20 to-pink-500/10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress indicator with modern styling */}
        <div className="mb-12 sm:mb-16">
          <ProgressIndicator total={steps.length} current={currentStep} />
        </div>

        {/* Main content area */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-2xl">
            {/* Glass morphism container */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ 
                    opacity: 0, 
                    x: 40,
                    scale: 0.95
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    scale: 1
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: -40,
                    scale: 0.95
                  }}
                  transition={{ 
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="w-full text-white"
                >
                  <StepComponent
                    onNext={handleNext}
                    onBack={handleBack}
                    onboardingData={onboardingData} // pass global state
                    setOnboardingData={setOnboardingData} // allow steps to update it
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle floating elements for visual interest */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
    </div>
  );
}

export default OnboardingContainer;