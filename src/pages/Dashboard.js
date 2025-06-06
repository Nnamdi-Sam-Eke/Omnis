import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MemoryProvider } from "../MemoryContext";
import { useAuth } from "../AuthContext";
import { signOut } from "firebase/auth";
import {
  FiBookmark,
  FiHome,
  FiPlus,
  FiGrid,
  FiSettings,
  FiUser,
  FiUsers,
  FiLogOut,
  FiUserX,
  FiDatabase,
  FiMessageCircle,
  FiList,
  FiHelpCircle,
  FiBarChart
} from "react-icons/fi";
import Header from "../components/Header";
import Sidebar from '../components/Sidebar'; // adjust the path based on where you saved the Sidebar
import Home from "./Home";
import ThemeToggle from "../components/ThemeToggle";
import OmnisDashboard from "./OmnisDashboard";
import Footer from "../components/Footer";
import Settings from "./Settings";
import AccountPage from "./ProfilePage";
import ProfilePage from "../components/SimpleProfilePage";
import NotificationsPage from "./NotificationsPage";
import FeedbackButton from "../components/FeedbackButton";
import Logout from "../components/Logout";
import AuthForm from "../components/AuthForm";
import Tooltip from "../components/Tooltip";
import History from "../components/History";
import SavedScenariosPage from "./SavedScenarios";
import ScenarioTabs from "./ScenarioTabs";
import { OmnisProvider } from "../context/OmnisContext";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "../App.css";
import UserProfilePage from "./UserProfilePage";
import AnalyticsPage from "./AnalyticsPage";
import ResourcesPage from "./ResourcesPage";
import CreatorsCorner from "../Creator'sCorner";
import Support from "./Support";
import PartnerChat from "./PartnerChat";
import ActivityLog from "./ActivityLog";
// — Utility: convert strings to Title Case
const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// — Spinner for logout feedback
const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
);

function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, setUser } = useAuth();
  const [logoutMessage, setLogoutMessage] = useState("");
  const navigate = useNavigate();

  // — Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, [setUser]);

  // — Sample data on load or logout
  useEffect(() => {
    setHistoryData(["Sample History Item 1", "Sample History Item 2"]);
    setSavedItems(["Saved Item 1", "Saved Item 2"]);
  }, [logoutMessage, user]);

  // — Close sidebar on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        isSidebarOpen &&
        !e.target.closest("#sidebar") &&
        !e.target.closest("#sidebar-button")
      ) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isSidebarOpen]);

  // — Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        isProfileMenuOpen &&
        !e.target.closest(".profile-dropdown") &&
        !e.target.closest(".profile-trigger")
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileMenuOpen]);

  const toggleSidebar = () => setIsSidebarOpen((p) => !p);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLogoutMessage("You have been logged out successfully.");
      setTimeout(() => {
        setLogoutMessage("");
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      console.error("❌ Error logging out:", err.message);
    }
  };

  // — Show spinner + message on logout
  if (logoutMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Spinner />
        <p className="text-lg font-semibold bg-green-100 text-green-800 px-4 py-2 rounded-md">
          {logoutMessage}
        </p>
        <button
          onClick={() => setLogoutMessage("")}
          className="mt-4 px-6 py-3 text-lg bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:bg-blue-500"
        >
          OK
        </button>
      </div>
    );
  }

  // — Show auth form if not logged in
  if (!user) return <AuthForm />;

  // — Page dispatcher
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        navigate("/Home");
        return null;
      case "dashboard":
        return (
          <div className="w-full mx-auto p-2">
            <OmnisDashboard />
          </div>
        );
      case "Home":
        return <Home />;
      case "notifications":
        return <NotificationsPage setCurrentPage={setCurrentPage} />;
      case "history":
        return <History historyData={historyData} />;
      case "saved Scenarios":
        return <SavedScenariosPage savedItems={savedItems} />;
      case "new Scenario":
        return <ScenarioTabs />;
      case "user Profile":
        return <UserProfilePage />;
      case "settings":
        return <Settings />;
      case "resources":
        return <ResourcesPage />;
      case "activity log":
        return <ActivityLog />;
      case "partner chat":
        return <PartnerChat />;
      case "support":
        return <Support />;
      case "profile":
        return <ProfilePage />;
      case "analytics":
          return <AnalyticsPage />;
      case "account":
        return <AccountPage />;
      case "logout":
        return <Logout setLogoutMessage={setLogoutMessage} />;
      default:
        return null;
    }
  };

  return (
    <OmnisProvider>
      <MemoryProvider>
        <div className="flex flex-col h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
          
          {/* Sidebar */}

          <Sidebar
  isSidebarOpen={isSidebarOpen}
  toggleSidebar={toggleSidebar}
  handleLogout={handleLogout}
  user={user}
/>

          {/* import Tooltip from './Tooltip'; // Make sure Tooltip is imported

<aside
  id="sidebar"
  className={`fixed inset-y-0 left-0 w-64 p-6 transition-all duration-300 z-30 bg-gradient-to-r from-blue-600 to-green-500 text-white dark:bg-gray-800 overflow-y-auto ${
    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
  }`}
>
  <button
    onClick={toggleSidebar}
    id="sidebar-button"
    className="ml-auto p-2 rounded bg-white text-green-900 hover:bg-red-100 dark:bg-gray-700 dark:text-white"
  >
    ✖
  </button>
  <h2 className="text-4xl font-bold mt-2">Menu</h2>
  <ul className="text-xl mt-6 space-y-4">
    {[
      { name: "Home", icon: <FiHome />, page: "Home" },
      { name: "Dashboard", icon: <FiGrid />, page: "dashboard" },
      { name: "Partner Chat", icon: <FiMessageCircle />, page: "partner chat" },
      { name: "New Scenario", icon: <FiPlus />, page: "new Scenario" },
      { name: "Saved Scenarios", icon: <FiBookmark />, page: "saved Scenarios" },
      { name: "Analytics", icon: <FiBarChart />, page: "analytics" },
      { name: "Activity Log", icon: <FiList />, page: "activity log" },
      { name: "Resources", icon: <FiDatabase />, page: "resources" },
      { name: "Support", icon: <FiHelpCircle />, page: "support" },
      { name: "Settings", icon: <FiSettings />, page: "settings" },
      { name: "User Profile", icon: <FiUserX />, page: "user Profile" }
    ].map(({ name, icon, page }) => (
      <li
        key={name}
        onClick={() => {
          setCurrentPage(page);
          setIsSidebarOpen(false);
        }}
        className={`flex items-center space-x-3 py-3 cursor-pointer hover:text-gray-300 ${
          currentPage === page
            ? "font-bold border-l-4 border-green-500 text-white text-2xl"
            : ""
        }`}
      >
        <Tooltip text={name} position="right">
          <div className="flex items-center space-x-3">
            {icon}
            <span>{name}</span>
          </div>
        </Tooltip>
      </li>
    ))}
  </ul>

  {/* Mobile-only icons */}
  {/* <div className="sm:hidden mt-2 flex bg-gray-300 rounded-xl p-2 justify-around text-sm">
    <ThemeToggle />
    <Tooltip text="Notifications" position="top">
      <span
        className="cursor-pointer hover:text-blue-200"
        onClick={() => {
          setCurrentPage("notifications");
          setIsSidebarOpen(false);
        }}
      >
        🔔
      </span>
    </Tooltip>
    <Tooltip text="Account" position="top">
      <span
        className="cursor-pointer hover:text-blue-200"
        onClick={() => {
          setCurrentPage("account");
          setIsSidebarOpen(false);
        }}
      >
        👤
      </span>
    </Tooltip>
  </div>

  {/* Mobile logout */}
  {/* <div className="sm:hidden mt-20">
    <Tooltip text="Log Out" position="top">
      <li
        onClick={handleLogout}
        className="flex items-center space-x-3 py-3 cursor-pointer text-white hover:text-red-500"
      >
        <FiLogOut />
        <span>Log Out</span>
      </li>
    </Tooltip>
  </div>
</aside> 
  */}

          {/* Header & Content
          <div className="flex flex-col flex-1 pt-24">
            <div className="fixed top-0 left-0 right-0 z-40 shadow-lg px-6 py-4 flex justify-between items-center bg-white dark:bg-gray-800">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded bg-gradient-to-r from-blue-600 to-green-500 text-white dark:bg-gray-700"
              >
                ☰
              </button>

              /* Omnis logo with Poppins font and blue color/*
              <h1 className="text-3xl italic font-bold capitalize text-blue-600 font-poppins dark:text-blue-400">
                Omnis
              </h1>
              
              <h1 className="text-2xl font-bold capitalize">
                {toTitleCase(currentPage.replace(/_/g, " "))}
              </h1>

              {/* Desktop icons */}
              {/* <div className="hidden sm:flex items-center space-x-6">
                <ThemeToggle />
                <span
                  className="cursor-pointer hover:text-blue-200 hover:text-xl"
                  onClick={() => setCurrentPage("notifications")}
                >
                  🔔
                </span>
                <div className="relative">
                  <span
                    className="cursor-pointer profile-trigger hover:text-xl"
                    onClick={() => setIsProfileMenuOpen((p) => !p)}
                  >
                    👤
                  </span>
                  {isProfileMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded shadow-lg p-2 profile-dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                        onClick={() => {
                          setCurrentPage("profile");
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        <FiUser />
                        <span>Profile</span>
                      </div>
                      <div
                        className="px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                        onClick={() => {
                          setCurrentPage("account");
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        <FiUsers />
                        <span>Account</span>
                      </div>
                      <div
                        onClick={handleLogout}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-200 text-red-900 dark:hover:bg-gray-600 text-red-600 dark:text-red-400 flex items-center space-x-2"
                      >
                        <FiLogOut />
                        <span>Log Out</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>  */}
            <div className="flex flex-col flex-1 pt-24">
  <Header
    toggleSidebar={toggleSidebar}
    currentPage={currentPage}
    toTitleCase={toTitleCase}
    isProfileMenuOpen={isProfileMenuOpen}
    setIsProfileMenuOpen={setIsProfileMenuOpen}
    setCurrentPage={setCurrentPage}
    handleLogout={handleLogout}
  />
  {/* rest of your content */}
</div>


            {/* Main content */}
            {renderPage()}

            <div className="text-sm text-gray-600">
              <CreatorsCorner />
              <FeedbackButton />
            </div>

            <Footer />
          </div>
      
      </MemoryProvider>
    </OmnisProvider>
  );
}

export default Dashboard;
export { Dashboard };
export { toTitleCase }; // Export the utility function
export { Spinner }; // Export the spinner component