// File: components/SubscriptionInfo.jsx
import React, { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../AuthContext";
import { 
  recordTierChange, 
  checkAndRecordTierChange,
  getTierChangeNotifications 
} from "../services/tierChangeService";
import { getUserTier, updateUserTier } from "../services/firestoreService";

const SubscriptionInfo = ({ userDetails, discountActive }) => {
  const [loading, setLoading] = useState(true);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [downgradeInProgress, setDowngradeInProgress] = useState(false);
  const functions = getFunctions();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // 🔁 Optional: Firebase Functions fallback checkout (if needed)
  const handleCheckout = async (priceId) => {
    const createSession = httpsCallable(functions, "createCheckoutSession");
    const { data } = await createSession({
      priceId,
      successUrl: window.location.href + "?subscribed=true",
      cancelUrl: window.location.href,
    });
    console.log("Checkout session created:", data);
  };

  // ✅ Main Stripe API-based upgrade handler
  const handleUpgrade = async (targetTier, priceId) => {
    if (!user) {
      alert("User not logged in.");
      return;
    }

    setUpgradeInProgress(true);

    try {
      // Get the current tier before upgrade
      const currentTier = user?.tier || "Free";

      // Initiate Stripe checkout
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, email: user.email, priceId })
      });

      const data = await res.json();
      
      if (data?.url) {
        // Record the pending tier change BEFORE redirection
        // This ensures the notification is created even if Stripe flow takes time
        if (currentTier !== targetTier) {
          const tierRank = { "Free": 0, "Pro": 1, "Enterprise": 2 };
          const isUpgrade = (tierRank[targetTier] || 0) > (tierRank[currentTier] || 0);
          const changeType = isUpgrade ? "upgrade" : "downgrade";

          await recordTierChange(
            user.uid,
            currentTier,
            targetTier,
            changeType
          );

          // Also update the user's tier in Firestore
          await updateUserTier(user.uid, targetTier);

          console.log(
            `✅ Tier change initiated: ${currentTier} → ${targetTier} (${changeType})`
          );
        }

        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        alert("Failed to initiate upgrade session.");
        setUpgradeInProgress(false);
      }
    } catch (error) {
      console.error("❌ Error during upgrade:", error);
      alert("Failed to process upgrade. Please try again.");
      setUpgradeInProgress(false);
    }
  };

  // ✅ Handle Downgrade functionality
  const handleDowngrade = async (targetTier) => {
    if (!user) {
      alert("User not logged in.");
      return;
    }

    // Confirm downgrade action
    const confirmed = window.confirm(
      `Are you sure you want to downgrade to ${targetTier} Plan? You may lose access to some premium features.`
    );

    if (!confirmed) return;

    setDowngradeInProgress(true);

    try {
      const currentTier = user?.tier || "Free";
      const tierRank = { "Free": 0, "Pro": 1, "Enterprise": 2 };

      // Verify it's actually a downgrade
      if ((tierRank[targetTier] || 0) >= (tierRank[currentTier] || 0)) {
        alert("This is not a downgrade. Please select a lower tier.");
        setDowngradeInProgress(false);
        return;
      }

      // Record the tier downgrade
      await recordTierChange(
        user.uid,
        currentTier,
        targetTier,
        "downgrade"
      );

      // Update user's tier in Firestore
      await updateUserTier(user.uid, targetTier);

      console.log(`✅ Downgrade recorded: ${currentTier} → ${targetTier}`);

      // Show success message
      alert(`Successfully downgraded to ${targetTier} Plan`);

      // Note: In a real application, you might also need to handle:
      // - Canceling any scheduled upgrades
      // - Updating subscription details with your backend
      // - Triggering email notification
      setDowngradeInProgress(false);
    } catch (error) {
      console.error("❌ Error during downgrade:", error);
      alert("Failed to process downgrade. Please try again.");
      setDowngradeInProgress(false);
    }
  };

  // ✅ Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!user) {
      alert("User not logged in.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You will be downgraded to the Free plan."
    );

    if (!confirmed) return;

    await handleDowngrade("Free");
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-6 w-1/2 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-6 w-2/3 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Current Plan</h4>
          <p className="text-xl text-blue-600 dark:text-blue-400 font-bold">
            {user?.tier || "Free Plan"} Plan <span className="text-gray-500 dark:text-gray-400">(Active)</span>  
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Next Payment</h4>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {userDetails?.subscription?.nextPaymentDate || "No payment scheduled"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Manage Your Subscription
        </h4>

        {discountActive && (
          <div className="mb-4 text-green-700 dark:text-green-300 font-medium">
            🎁 20% discount if you upgrade within 7 days!
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleUpgrade("Pro", userDetails?.subscription?.premiumPriceId || 'price_pro_123')}
            disabled={upgradeInProgress || user?.tier === "Pro" || user?.tier === "Enterprise"}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {upgradeInProgress ? "Processing..." : "Upgrade to Pro"}
          </button>
          <button
            onClick={() => handleUpgrade("Enterprise", userDetails?.subscription?.basicPriceId || 'price_ent_123')}
            disabled={upgradeInProgress || user?.tier === "Enterprise"}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {upgradeInProgress ? "Processing..." : "Upgrade to Enterprise"}
          </button>
          <button 
            onClick={handleCancelSubscription}
            disabled={downgradeInProgress || user?.tier === "Free"}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {downgradeInProgress ? "Processing..." : "Cancel Subscription"}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Billing Information
        </h4>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
          Your subscription will automatically renew. You can cancel anytime before your next billing date.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionInfo;
