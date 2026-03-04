import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoutSplash from "./components/LogoutSplash";

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [localLogoutMessage, setLocalLogoutMessage] = useState("");
  const [fade, setFade] = useState(true);
  const [showSplash, setShowSplash] = useState(false);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleLogout = async () => {
    toast.info("You are being logged out...");
    setShowSplash(true);

    try {
      console.log("Logout started");

      setLocalLogoutMessage("Logging you out...");
      setFade(true);
      await delay(2000);

      console.log("Fade out start");
      setFade(false);
      await delay(500);

      console.log("Fade out complete, starting redirect message");
      setLocalLogoutMessage("Redirecting you to login page...");
      setFade(true);

      await logout(500);
      console.log("Logout completed");

      await delay(1000);
      console.log("Navigating to /login");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
      toast.error("Logout failed. Please try again.");
      setShowSplash(false);
    }
  };

  // Auto logout after 5 minutes of inactivity
  useEffect(() => {
    const inactivityTimeout = setTimeout(() => {
      handleLogout();
    }, 5 * 60 * 1000);

    return () => clearTimeout(inactivityTimeout);
  }, []);

  return (
    <div>
      <button
        onClick={handleLogout}
        className="bg-white text-red-600 dark:text-red-400 px-4 py-2 rounded"
      >
        Log Out
      </button>

      {showSplash && (
        <LogoutSplash message={localLogoutMessage} fade={fade} />
      )}

      <ToastContainer />
    </div>
  );
};

export default Logout;