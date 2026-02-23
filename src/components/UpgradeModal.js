import React, { useState, useEffect } from "react";
import {useNavigate} from "react-router-dom"


const tiers = [
  {
    name: "Free",
    price: "$0 / forever",
    description: [
      "Single-path simulations",
      "7-day free access to multi-path simulations",
      "Analytics Overview dashboard",
      "Basic recommendations",
      "Save up to 3 scenarios",
      "Standard UI & branding",
    ],
    isFree: true,
  },
  {
    name: "Pro",
    price: "Starting at $49 / month",
    description: [
      "Unlimited multi-path simulations",
      "Industry scenario templates + branch versioning",
      "Full analytics dashboard + custom report export",
      "Real-time KPI alerts & trend monitoring",
      "AI scenario builder (limited use)",
      "Smart strategy & decision impact simulations",
      "External integrations (Google Sheets, CRM, Notion)",
      "Collaborate with up to 3 users",
      "Standard email support",
    ],
    discount: 20, // percent
  },
  {
    name: "Enterprise",
    price: "Custom pricing — contact us",
    description: [
      "Everything in Pro, plus:",
      "Unlimited AI scenario builder usage",
      "Extended historical data playback & retention",
      "Full API access & auto data sync",
      "Advanced anomaly detection & custom KPI alerts",
      "Unlimited users with role-based permissions",
      "Audit logs & activity tracking",
      "Custom workspaces & white-label branding",
      "Dedicated onboarding & priority support",
      "Custom feature development & SLAs",
    ],
  },
];

// Helper to format ms to countdown string
function formatTime(ms) {
  if (ms <= 0) return "00d 00h 00m 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(
    2,
    "0"
  )}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export default function UpgradeModal() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
   // New state for button animation
  const [isClicked, setIsClicked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(7 * 24 * 3600 * 1000); // 7 days in ms
  

  // Simulate splash delay then show modal
  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      setShowModal(true);
    }, 3000); // 3 seconds splash screen delay
    return () => clearTimeout(splashTimeout);
  }, []);

  // Countdown timer for discount
  useEffect(() => {
    if (!showModal) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showModal]);

  
  const handleUpgrade = () => {
    setIsClicked(true);

    setTimeout(() => {
      navigate("/account?tab=Billing");
    }, 200);
  };

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = (e) => {
    if (isClosing && e.animationName === "modalClose") {
      setShowModal(false);
      setIsClosing(false);
    }
  };

  if (!showModal) return null;

  return (
    <>
      <style>{`
        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999;
        }
        
        .backdrop-open {
          animation: backdropOpen 0.3s ease-out;
        }
        
        .backdrop-close {
          animation: backdropClose 0.3s ease-out;
        }
        
        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #111;
          border-radius: 20px;
          padding: 40px;
          max-width: 1600px;
          width: 85%; /* occupy ~80% of viewport width on large screens */
          max-height: 100vh; /* occupy ~80% of viewport height */
          overflow-y: auto;
          z-index: 1000;
          color: #fff;
        }
        
        .modal-open {
          animation: modalOpen 0.5s ease-out;
        }
        
        .modal-close {
          animation: modalClose 0.3s ease-out;
        }
        
        .tier-card {
          border: 1px solid #333;
          background: #1a1a1a;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .most-popular {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #000;
          color: #fff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .tier-name {
          font-size: 18px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .tier-price {
          font-size: 28px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 16px;
          text-align: center;
        }
        
        .tier-description {
          list-style-type: disc;
          padding-left: 20px;
          color: #aaa;
          font-size: 14px;
          flex-grow: 1;
        }
        
        .tier-description li {
          margin-bottom: 8px;
        }
        
        .tier-button {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .get-plan {
          background: #fff;
          color: #000;
          border: none;
        }
        
        .current-plan {
          background: #333;
          color: #666;
          border: none;
          cursor: not-allowed;
        }
        
        .no-charge {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 8px;
        }
        
        .tier-open {
          animation: tierOpen 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(50px);
        }
        
        .tier-close {
          animation: tierClose 0.3s ease-out;
        }
        
        @keyframes backdropOpen {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes backdropClose {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes modalOpen {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes modalClose {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
        
        @keyframes tierOpen {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes tierClose {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-50px);
          }
        }
        
        @media (max-width: 768px) {
          .tier-container {
            flex-direction: column !important;
            gap: 20px !important;
          }
          
          .modal {
            padding: 20px;
            width: 95vw;
            max-height: 95vh;
          }
          
          .tier-card {
            min-height: auto !important;
            height: auto !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .tier-description {
            flex-grow: 1 !important;
            margin-bottom: 16px !important;
          }
          
          .tier-button {
            margin-top: auto !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>

      {/* Backdrop with blur effect */}
      <div className={`backdrop ${isClosing ? "backdrop-close" : "backdrop-open"}`} />

      {/* Modal container */}
      <div
        className={`modal ${isClosing ? "modal-close" : "modal-open"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onAnimationEnd={onAnimationEnd}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2 id="upgrade-modal-title" style={{ margin: 0, color: "#fff" }}>
            Subscription Plans
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 32,
              cursor: "pointer",
              color: "#fff",
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 14, color: "#aaa", marginBottom: 32 }}>
          Choose the plan that best fits your needs. You can upgrade or downgrade at any time.
        </p>

        {/* Tier containers */}
        <div
          className="tier-container"
          style={{
            display: "flex",
            gap: 30,
            justifyContent: "center",
            flexWrap: "nowrap",
          }}
        >
          {tiers.map((tier, index) => {
            const isCurrent = tier.isFree;
            const isMostPopular = tier.name === "Pro";

            return (
              <div
                key={tier.name}
                className={`tier-card ${isClosing ? "tier-close" : "tier-open"}`}
                style={{
                  animationDelay: `${index * 0.25 + 0.5}s`,
                  flex: "1 1 0",
                  maxWidth: 300,
                  userSelect: "none",
                  minHeight: 400,
                  transition: "background-color 0.3s ease",
                }}
              >
                {isMostPopular && (
                  <span className="most-popular">Most Popular</span>
                )}
                <div className="tier-name">{tier.name} ○</div>
                <div className="tier-price">{tier.price}</div>
                <ul className="tier-description">
                  {tier.description.map((desc, i) => (
                    <li key={i}>{desc}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="tier-button current-plan"
                    aria-disabled="true"
                    title="You are currently on this plan"
                  >
                    Current Plan
                  </button>
                ) : tier.name === "Enterprise" ? (
                  <button
                    className={`tier-button get-plan ${isClicked ? "btn-clicked" : ""}`}
                    onClick={handleUpgrade}
                    aria-label={`Contact for ${tier.name} plan`}
                  >
                    Contact us
                  </button>
                ) : (
                  <button
                    className={`tier-button get-plan ${isClicked ? "btn-clicked" : ""}`}
                    onClick={handleUpgrade}
                    aria-label={`Get the ${tier.name} plan`}
                  >
                    Get the plan →
                  </button>
                )}
                <div className="no-charge">No extra hidden charge</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}