// components/Subscription.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";

const formatDate = (tsLike) => {
  try {
    if (!tsLike) return null;
    if (typeof tsLike?.toDate === "function") return tsLike.toDate().toLocaleDateString();
    if (tsLike instanceof Date) return tsLike.toLocaleDateString();
    return String(tsLike);
  } catch {
    return null;
  }
};

const TIER_STYLES = {
  Free: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  Pro: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  Enterprise: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
};

const TierBadge = ({ tier }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold border tracking-wide ${
      TIER_STYLES[tier] || TIER_STYLES.Free
    }`}
  >
    {tier}
  </span>
);

const StatusDot = ({ status }) => {
  const color =
    status === "pending" ? "bg-amber-400" :
    status === "approved" ? "bg-emerald-400" :
    status === "rejected" ? "bg-red-400" :
    "bg-slate-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
};

const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

/**
 * SubscriptionInfo (read-only)
 * - Shows current tier + expiry
 * - Shows latest upgrade request status
 * - One CTA to go to Billing Info (the only place that submits upgrade requests)
 */
const SubscriptionInfo = ({ onGoToBilling }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [latestRequest, setLatestRequest] = useState(null);

  const currentTier = useMemo(() => (user?.tier || "Free").toString(), [user?.tier]);
  const expiry = useMemo(() => formatDate(user?.subscriptionExpiry), [user?.subscriptionExpiry]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const qy = query(
      collection(db, "upgradeRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(qy, (snap) => {
      const doc0 = snap.docs[0];
      setLatestRequest(doc0 ? { id: doc0.id, ...doc0.data() } : null);
    });

    return () => unsub();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-1">
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Current Plan
            </p>
            <div className="flex items-center gap-2 mb-2">
              <TierBadge tier={currentTier} />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </span>
            </div>

            {expiry ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Expires{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {expiry}
                </span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Manual billing — no expiry set
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Latest Request
            </p>

            {latestRequest ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TierBadge tier={latestRequest.requestedTier === "pro" ? "Pro" : "Enterprise"} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <StatusDot status={latestRequest.status} />
                  <span className="capitalize font-medium">
                    {latestRequest.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">No requests yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Manage subscription (read-only + CTA) */}
      <SectionCard>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            Manage Subscription
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upgrade requests are submitted from Billing Info only
          </p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            To upgrade, open <span className="font-semibold text-slate-900 dark:text-white">Billing Info</span>, make your transfer, then submit your request from there.
          </p>

          <button
            type="button"
            onClick={() => onGoToBilling?.()}
            className="w-full px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Go to Billing Info
          </button>

          {latestRequest?.status === "pending" && (
            <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <span className="text-amber-500 text-base mt-0.5">⏳</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your request is pending. Once payment is confirmed, your tier will be activated.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Admin note (optional, keep if useful internally) */}
      {/* <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
          Admin Activation
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          After payment is confirmed, update{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            users/&lt;uid&gt;.tier
          </code>{" "}
          to <strong>pro</strong> or <strong>enterprise</strong>.
        </p>
      </div> */}
    </div>
  );
};

export default SubscriptionInfo;