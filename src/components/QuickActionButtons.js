import { motion } from "framer-motion";
import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate

const QuickActions = () => {
  const navigate = useNavigate(); // ✅ Get the navigate function

  const actions = [
    {
      label: "+ New Scenario",
      bgColor: "bg-primary",
      textColor: "text-black",
      hoverColor: "hover:bg-primary/90",
      glow: "rgba(59, 130, 246, 0.6)", // blue glow
      onClick: () => {
        console.log("New Scenario clicked");
        navigate("/new-scenario"); // ✅ Route to the new page
      },
    },
    {
      label: "📂 Saved Scenarios",
      bgColor: "bg-secondary",
      textColor: "text-black",
      hoverColor: "hover:bg-secondary/90",
      glow: "rgba(16, 185, 129, 0.6)", // green glow
      onClick: () => {
        console.log("Saved Scenarios clicked");
        navigate("/saved-scenarios"); // ✅ Route to saved scenarios
      },
    },
    // {
    //   label: "💬 Open Partner Chat",
    //   bgColor: "bg-accent",
    //   textColor: "text-black",
    //   hoverColor: "hover:bg-accent/90",
    //   glow: "rgba(236, 72, 153, 0.6)", // pink glow
    //   onClick: () => {
    //     console.log("Partner Chat clicked");
    //     navigate("/partner-chat"); // ✅ Route to partner chat
    //   },
    // },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-8">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileHover={{
            scale: 1.05,
            boxShadow: `0px 0px 12px ${action.glow}`,
          }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`${action.bgColor} ${action.hoverColor} text-gray-500 dark:text-white rounded-2xl px-6 py-3 text-lg shadow-2xl transition-all`}
        >
          {action.label}
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;
