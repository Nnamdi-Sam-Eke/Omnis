// components/BillingInfo.js
import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";

const PAYMENT_DESTINATIONS = {
  naira: {
    label: "₦ Naira Transfer (Nigeria)",
    bankName: "Access Bank",
    accountName: "NNAMDI SAMUEL SAMEKEKALU",
    accountNumber: "1237284546",
    notes: "Use your registered email as the transfer narration/reference.",
  },
  usd: {
    label: "$ USD Domiciliary",
    bankName: "Access Bank",
    accountName: "NNAMDI SAMUEL SAMEKEKALU",
    accountNumber: "1463185288",
    swiftOrRouting: "ABNGNGLA",
    notes: "Use your registered email as the transfer narration/reference.",
  },
};

const STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  paid_pending_confirmation:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  approved:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  rejected:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  neutral:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const Badge = ({ children, tone = "neutral" }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border tracking-wide ${
      STATUS_STYLES[tone] || STATUS_STYLES.neutral
    }`}
  >
    {children}
  </span>
);

const CopyRow = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 min-w-[130px]">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <code className="text-sm px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 break-all font-mono">
          {value || "—"}
        </code>
        <button
          onClick={doCopy}
          type="button"
          className={`min-w-[68px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
            copied
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-400"
          }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
};

const SectionCard = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const BillingInfo = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }
  const [loading, setLoading] = useState(true);

  const [paymentChannel, setPaymentChannel] = useState("naira");
  const [note, setNote] = useState("");
  const [latestRequest, setLatestRequest] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittingTier, setSubmittingTier] = useState(null); // "pro" | "enterprise" | null

  const destination = useMemo(
    () => PAYMENT_DESTINATIONS[paymentChannel],
    [paymentChannel]
  );

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
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

  const canRequest =
    !!user?.uid &&
    !submitting &&
    !(
      latestRequest &&
      (latestRequest.status === "pending" ||
        latestRequest.status === "paid_pending_confirmation")
    );

  const submitRequest = async (tierToRequest) => {
    if (!user?.uid) {
      showToast("Please log in first.", "error");
      return;
    }

    if (!tierToRequest) {
      showToast("Please choose a plan.", "error");
      return;
    }

    setSubmitting(true);
    setSubmittingTier(tierToRequest);

    try {
      await addDoc(collection(db, "upgradeRequests"), {
        userId: user.uid,
        email: user.email || null,
        requestedTier: tierToRequest,
        paymentChannel,
        note: note?.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      showToast("Request submitted. We'll contact you shortly.");
      setNote("");
    } catch (e) {
      console.error(e);
      showToast("Failed to submit request. Please try again.", "error");
    } finally {
      setSubmitting(false);
      setSubmittingTier(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-1">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    );
  }

  const latestTone =
    latestRequest?.status === "pending"
      ? "pending"
      : latestRequest?.status === "approved"
      ? "approved"
      : latestRequest?.status === "paid_pending_confirmation"
      ? "paid_pending_confirmation"
      : latestRequest?.status === "rejected"
      ? "rejected"
      : "neutral";

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all duration-300 ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200"
          }`}
        >
          <span>{toast.type === "error" ? "✗" : "✓"}</span>
          {toast.msg}
        </div>
      )}

      {/* Payment Destinations */}
      <SectionCard>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              Manual Billing
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Founding access — no Stripe required
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">No Stripe</Badge>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Make a transfer using one of the options below, then submit an upgrade request — we'll manually activate your plan within{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">24 hours</span>.
          </p>

          {/* Channel selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">
              Payment Destination
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PAYMENT_DESTINATIONS).map(([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentChannel(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    paymentChannel === key
                      ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-400"
                  }`}
                >
                  {key === "naira" ? "₦ Naira" : "$ USD"}
                </button>
              ))}
            </div>
          </div>

          {/* Account details */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
            <div className="mb-3">
              <Badge tone="neutral">{destination.label}</Badge>
            </div>
            <CopyRow label="Bank Name" value={destination.bankName} />
            <CopyRow label="Account Name" value={destination.accountName} />
            <CopyRow label="Account Number" value={destination.accountNumber} />
            {destination.swiftOrRouting && (
              <CopyRow label="SWIFT / Routing" value={destination.swiftOrRouting} />
            )}
            <div className="pt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Reference:
              </span>{" "}
              Use your registered email{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ({user?.email || "your email"})
              </span>{" "}
              as the narration.
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Request Upgrade */}
      <SectionCard>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              Request Upgrade
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a plan after completing your transfer
            </p>
          </div>

          {latestRequest?.status ? (
            <Badge tone={latestTone}>
              {String(latestRequest.status).replace(/_/g, " ")}
            </Badge>
          ) : (
            <Badge tone="neutral">No requests yet</Badge>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. paid via USD domiciliary"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              type="text"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Helps us match your transfer faster.
            </p>
          </div>

          {/* Plan buttons (moved here from Subscription UX) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
  type="button"
  onClick={() => submitRequest("pro")}
  disabled={!canRequest}
  className="group text-left p-4 rounded-2xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
>
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-semibold text-blue-900 dark:text-blue-300">
        Pro Plan
      </div>
      <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
        30 days access • Manual activation
      </div>
    </div>
    <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white group-hover:bg-blue-700 transition">
      {submitting && submittingTier === "pro" ? "Submitting…" : "Request Pro"}
    </div>
  </div>
</button>

           <button
  type="button"
  onClick={() => submitRequest("enterprise")}
  disabled={!canRequest}
  className="group text-left p-4 rounded-2xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
>
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-semibold text-purple-900 dark:text-purple-300">
        Enterprise Plan
      </div>
      <div className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
        30 days access • Priority support
      </div>
    </div>
    <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white group-hover:bg-purple-700 transition">
      {submitting && submittingTier === "enterprise"
        ? "Submitting…"
        : "Request Enterprise"}
    </div>
  </div>
</button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Logged in as{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {user?.email || "—"}
            </span>
          </div>

          {latestRequest?.status === "pending" && (
            <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <span className="text-amber-500 text-base mt-0.5">⏳</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your request is pending. Once your payment is confirmed, your tier
                will be activated.
              </p>
            </div>
          )}

          {latestRequest?.status === "paid_pending_confirmation" && (
            <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="text-blue-500 text-base mt-0.5">🔎</span>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                We’ve received your payment signal and are confirming it. You’ll be
                upgraded once verified.
              </p>
            </div>
          )}

          {!canRequest &&
            (latestRequest?.status === "pending" ||
              latestRequest?.status === "paid_pending_confirmation") && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                You already have an active request. Please wait for confirmation.
              </p>
            )}
        </div>
      </SectionCard>
    </div>
  );
};

export default BillingInfo;