// BillingAndSubscriptionsTab.js
import React, { useEffect, useRef, useState, Suspense, lazy } from "react";

const BillingInfo = lazy(() => import("../components/BillingInfo"));
const SubscriptionInfo = lazy(() => import("../components/Subscription"));

const TABS = [
  {
    key: "billing",
    label: "Billing Info",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
];

const TabSkeleton = () => (
  <div className="animate-pulse space-y-4 pt-2">
    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
    <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
  </div>
);

const BillingAndSubscriptionsTab = () => {
  const [activeTab, setActiveTab] = useState("billing");

  // For smooth UX: focus + scroll on tab change
  const panelRef = useRef(null);

  useEffect(() => {
    // Let the new tab panel render first (Suspense/lazy)
    const t = setTimeout(() => {
      // Focus for accessibility + “snappy” feeling
      if (panelRef.current) {
        panelRef.current.focus({ preventScroll: true });
        // Smooth scroll to panel top
        panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);

    return () => clearTimeout(t);
  }, [activeTab]);

  const goToBilling = (opts = { scrollToRequest: false }) => {
    setActiveTab("billing");

    // Optional: if you later add an element with id="billing-request-upgrade"
    // inside BillingInfo, this will jump directly there.
    if (opts.scrollToRequest) {
      setTimeout(() => {
        const el = document.getElementById("billing-request-upgrade");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Billing and Subscription Tabs"
        className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl mb-5"
      >
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`${key}-panel`}
            id={`${key}-tab`}
            onClick={() => setActiveTab(key)}
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 ${
              activeTab === key
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "billing" && (
          <Suspense fallback={<TabSkeleton />}>
            <div
              id="billing-panel"
              role="tabpanel"
              aria-labelledby="billing-tab"
              tabIndex={-1}
              ref={panelRef}
              className="focus:outline-none"
            >
              <BillingInfo />
            </div>
          </Suspense>
        )}

        {activeTab === "subscriptions" && (
          <Suspense fallback={<TabSkeleton />}>
            <div
              id="subscriptions-panel"
              role="tabpanel"
              aria-labelledby="subscriptions-tab"
              tabIndex={-1}
              ref={panelRef}
              className="focus:outline-none"
            >
              {/* ✅ This is the key wiring:
                  Subscription tab button now actually navigates to Billing tab */}
              <SubscriptionInfo onGoToBilling={() => goToBilling({ scrollToRequest: true })} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default BillingAndSubscriptionsTab;