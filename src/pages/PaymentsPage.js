// src/pages/PaymentsPage.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import SkeletonLoader from "../components/SkeletonLoader";
import { Suspense } from "react";
import BillingAndSubscriptionsTab from "./BillingAndSubscriptionsTab";
import Payments from "../components/Payments";

const PaymentsPage = () => {
  const { currentUser } = useAuth();

  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setUserDetails(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
      } else {
        setUserDetails(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Save billing info handler
  const handleSaveBillingInfo = async (info) => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      "billing.cardNumber": info.cardNumber,
      "billing.billingAddress": info.billingAddress,
    });
  };

  // Update subscription handler (if you want to add in future)
  const handleUpdateSubscription = async (plan) => {
    if (!currentUser) return;

    const ref = doc(db, "users", currentUser.uid);
    await updateDoc(ref, {
      "subscription.plan": plan,
      "subscription.nextPaymentDate": new Date().toLocaleDateString(),
    });
  };

  return (
    <div className="min-h-screen flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-teal-600/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-teal-400/5" />
        <div className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Billing & Subscriptions
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Manage your payment methods, subscription plans, and billing history all in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative -mt-2 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left column: stacked vertically */}
            <section className="flex flex-col flex-1 space-y-8">
              <Suspense fallback={<SkeletonLoader height="h-[250px]" />}>
                <Payments />
              </Suspense>
            </section>

            {/* Right column: Billing And Subscriptions */}
            <section className="flex-1">
              <div className="sticky top-8 group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 dark:from-indigo-400/5 dark:to-cyan-400/5" />
                <div className="relative p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-teal-600">
                      Billing Management
                    </h2>
                  </div>
                  <Suspense fallback={<SkeletonLoader height="h-[400px]" />}>
                    <BillingAndSubscriptionsTab />
                  </Suspense>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentsPage;