import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    price: "$0",
    subprice: "7-Day Full Access",
    description: [
      "Unlimited simulations during trial",
      "Unlimited reruns",
      "Detailed explanation modal",
      "Save & export during trial",
      "Access expires after 7 days",
    ],
    isFree: true,
  },
  {
    name: "Pro",
    price: "$29",
    subprice: "per month",
    description: [
      "Unlimited simulations",
      "Unlimited reruns",
      "Full analytics dashboard",
      "Save and revisit scenarios",
      "Export reports (PDF & Markdown)",
      "Continuous access — no expiry",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    subprice: "Let's Talk",
    description: [
      "Everything in Pro",
      "Dedicated onboarding support",
      "Custom deployment options",
      "Future team access",
      "Priority feature requests",
    ],
  },
];

export default function UpgradeModal() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      setShowModal(true);
    }, 3000);
    return () => clearTimeout(splashTimeout);
  }, []);

  const handleUpgrade = () => {
    setIsProcessing(true);
    setIsClosing(true);
    setTimeout(() => {
      navigate("/account?tab=Billing");
    }, 800);
  };

  const handleContactUs = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate("/support?tab=Contact");
    }, 800);
  };

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = (e) => {
    if (isClosing && e.animationName === "modalClose") {
      setShowModal(false);
      setIsClosing(false);
      setIsProcessing(false);
    }
  };

  if (!showModal) return null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999;
        }

        .backdrop-open { animation: backdropOpen 0.4s ease-out forwards; }
        .backdrop-close { animation: backdropClose 0.6s ease forwards; }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #111;
          border-radius: 20px;
          padding: 40px;
          width: 92%;
          max-width: 1100px;
          max-height: 92vh;
          overflow-y: auto;
          z-index: 1000;
          color: #fff;
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }

        .modal::-webkit-scrollbar { width: 4px; }
        .modal::-webkit-scrollbar-track { background: transparent; }
        .modal::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

        .modal-open { animation: modalOpen 0.5s ease-out forwards; }
        .modal-close { animation: modalClose 0.6s ease forwards; }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 12px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: clamp(18px, 4vw, 24px);
          line-height: 1.3;
        }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 28px;
          color: #fff;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .close-btn:hover { opacity: 1; }

        .modal-subtitle {
          font-size: 13px;
          color: #aaa;
          margin: 0 0 28px;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .tier-card {
          border: 1px solid #2a2a2a;
          background: #1a1a1a;
          border-radius: 14px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .tier-card.popular {
          border-color: #444;
        }

        .most-popular {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
          color: #000;
          padding: 3px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }

        .tier-name {
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #888;
          margin-bottom: 12px;
        }

        .tier-price-block {
          text-align: center;
          margin-bottom: 20px;
        }

        .tier-price {
          font-size: clamp(24px, 5vw, 32px);
          font-weight: 700;
          line-height: 1;
        }

        .tier-subprice {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .tier-divider {
          border: none;
          border-top: 1px solid #2a2a2a;
          margin: 0 0 16px;
        }

        .tier-description {
          list-style: none;
          padding: 0;
          margin: 0;
          flex-grow: 1;
        }

        .tier-description li {
          font-size: 13px;
          color: #999;
          padding: 5px 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.4;
        }

        .tier-description li::before {
          content: "✓";
          color: #555;
          font-size: 11px;
          margin-top: 1px;
          flex-shrink: 0;
        }

        .tier-button {
          margin-top: 20px;
          padding: 11px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          width: 100%;
        }

        .get-plan {
          background: #fff;
          color: #000;
        }

        .get-plan:hover:not(:disabled) {
          background: #e8e8e8;
          transform: translateY(-1px);
        }

        .btn-processing {
          background: #333 !important;
          color: #777 !important;
          cursor: wait !important;
        }

        .current-plan {
          background: #222;
          color: #555;
          cursor: not-allowed;
          border: 1px solid #2a2a2a;
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
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes modalClose {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -52%) scale(0.96); }
        }

        /* Tablet: stack to single column */
        @media (max-width: 768px) {
          .modal {
            padding: 24px 20px;
            border-radius: 16px;
            width: 95%;
            max-height: 90vh;
          }

          .tiers-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .tier-card {
            padding: 20px 18px;
          }

          .tier-price {
            font-size: 26px;
          }
        }

        /* Small mobile */
        @media (max-width: 400px) {
          .modal {
            padding: 20px 16px;
            width: 98%;
          }

          .modal-header h2 {
            font-size: 16px;
          }
        }
      `}</style>

      <div className={`backdrop ${isClosing ? "backdrop-close" : "backdrop-open"}`} />

      <div
        className={`modal ${isClosing ? "modal-close" : "modal-open"}`}
        role="dialog"
        aria-modal="true"
        onAnimationEnd={onAnimationEnd}
      >
        <div className="modal-header">
          <h2>Unlock Full Access to Omnis</h2>
          <button className="close-btn" onClick={handleClose} aria-label="Close">×</button>
        </div>

        <p className="modal-subtitle">Your trial gives you full power. Continue building without limits.</p>

        <div className="tiers-grid">
          {tiers.map((tier) => {
            const isCurrent = tier.isFree;
            const isMostPopular = tier.name === "Pro";

            return (
              <div key={tier.name} className={`tier-card ${isMostPopular ? "popular" : ""}`}>
                {isMostPopular && <span className="most-popular">Most Popular</span>}

                <div className="tier-name">{tier.name}</div>

                <div className="tier-price-block">
                  <div className="tier-price">{tier.price}</div>
                  <div className="tier-subprice">{tier.subprice}</div>
                </div>

                <hr className="tier-divider" />

                <ul className="tier-description">
                  {tier.description.map((desc, i) => (
                    <li key={i}>{desc}</li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button className="tier-button current-plan" disabled>Current Plan</button>
                ) : tier.name === "Enterprise" ? (
                  <button
                    className={`tier-button get-plan ${isClosing ? "btn-processing" : ""}`}
                    onClick={handleContactUs}
                    disabled={isClosing}
                  >
                    {isClosing ? "Redirecting..." : "Contact Us"}
                  </button>
                ) : (
                  <button
                    className={`tier-button get-plan ${isProcessing ? "btn-processing" : ""}`}
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Get the Plan →"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}