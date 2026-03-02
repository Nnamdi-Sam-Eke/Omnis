// src/pages/PaymentsPage.js
import React, { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "../AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const BillingAndSubscriptionsTab = lazy(() => import("./BillingAndSubscriptionsTab"));
// const Payments = lazy(() => import("../components/Payments"));

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
      
      {/* Main Content */}
      <main className="relative -mt-2 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left column: Billing And Subscriptions */}
            <section className="flex-1">
              <div className="sticky top-8 group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 dark:from-indigo-400/5 dark:to-cyan-400/5" />
                <div className="relative p-6">
                  <Suspense>
                    <BillingAndSubscriptionsTab />
                  </Suspense>
                </div>
                
              </div>
            </section>
              {/* Right column: stacked vertically */}
            {/* <section className="flex flex-col flex-1 space-y-8">
              <Suspense>
                <Payments />
              </Suspense>
            </section> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentsPage;