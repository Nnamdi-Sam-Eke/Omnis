import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

import {
  FiBarChart,
  FiUser,
  FiClock,
  FiSettings,
  FiActivity,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiCheckCircle
} from "react-icons/fi";

const KpiCard = () => {
  const scrollRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(null);
  const [lastActivity, setLastActivity] = useState(null);
  const [performanceStatus, setPerformanceStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [totalSimulations, setTotalSimulations] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [avgAccuracy, setAvgAccuracy] = useState(null);
  const [uptime, setUptime] = useState("99.99%");
  
  // New state for analytics cards
  const [totalSessionsToday, setTotalSessionsToday] = useState(0);
  const [scenariosRunToday, setScenariosRunToday] = useState(0);
  
  const { user } = useAuth();
  const todayKey = new Date().toISOString().split('T')[0];

  // Auto-scroll functionality
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const autoScrollInterval = useRef(null);

  // Handles horizontal scrolling for KPI cards
  const scrollCards = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth"
      });
    }
  };

  // Auto-scroll feature
  const toggleAutoScroll = () => {
    setIsAutoScrolling(prev => !prev);
  };

  useEffect(() => {
    if (isAutoScrolling) {
      autoScrollInterval.current = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            scrollCards("right");
          }
        }
      }, 3000);
    } else {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    }

    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, [isAutoScrolling]);

  // Simulating loading state for 2 seconds
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Helper function to format large numbers
  const formatNumber = (num) => {
    if (num === null || num === undefined) return null;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  // Load session count from localStorage
  const loadSessionCount = () => {
    const sessionCount = parseInt(localStorage.getItem(`sessionCount_${todayKey}`) || '0', 10);
    setTotalSessionsToday(sessionCount);
  };

  // Fetch scenarios run today from Firestore
const fetchScenariosToday = async () => {
  if (!user) return;

  try {
    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "userInteractions", user.uid, "interactions"),
      where("entryType", "==", "scenario"),
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<=", Timestamp.fromDate(end))
    );

    const snap = await getDocs(q);
    setScenariosRunToday(snap.size);
  } catch (e) {
    console.error("Error fetching scenarios today:", e);
    setScenariosRunToday(0);
  }
};

  // Load session count and scenarios today on component mount
  useEffect(() => {
  fetchScenariosToday();
}, [user]);

  // Fetch and set data from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribers = [];

    try {
      const usersRef = collection(db, "users");

      // Total Users
      const unsubscribeUsers = onSnapshot(
        usersRef,
        (snapshot) => {
          setTotalUsers(snapshot.size);
        },
        (err) => {
          console.error("Error fetching users:", err);
        }
      );
      unsubscribers.push(unsubscribeUsers);

      // Last Activity (Most recent login)
      const q = query(usersRef, orderBy("lastLogin", "desc"), limit(1));
      const unsubscribeLastLogin = onSnapshot(
        q,
        (snapshot) => {
          const doc = snapshot.docs[0];
          if (doc && doc.data().lastLogin) {
            let lastLoginDate;
            const storedLoginStr = sessionStorage.getItem('sessionLastLogin');
            if (storedLoginStr) {
              lastLoginDate = new Date(storedLoginStr);
            } else {
              lastLoginDate = new Date(doc.data().lastLogin.toDate());
              sessionStorage.setItem('sessionLastLogin', lastLoginDate.toISOString());
            }
            const now = new Date();
            const diffMins = Math.floor((now - lastLoginDate) / (1000 * 60));
            
            if (diffMins < 1) {
              setLastActivity("Just now");
            } else if (diffMins < 60) {
              setLastActivity(`${diffMins} min${diffMins > 1 ? 's' : ''} ago`);
            } else if (diffMins < 1440) {
              const hours = Math.floor(diffMins / 60);
              setLastActivity(`${hours} hour${hours > 1 ? 's' : ''} ago`);
            } else {
              const days = Math.floor(diffMins / 1440);
              setLastActivity(`${days} day${days > 1 ? 's' : ''} ago`);
            }
          } else {
            setLastActivity("No login data");
          }
        },
        (err) => {
          console.error("Error fetching last activity:", err);
        }
      );
      unsubscribers.push(unsubscribeLastLogin);

      // Total Simulations - Simplified query (no filters)
      const simulationQuery = query(
        collection(db, "userInteractions", user.uid, "interactions"),
        orderBy("timestamp", "desc")
      );

      const unsubscribeSimulations = onSnapshot(
        simulationQuery,
        (snapshot) => {
          console.log("Total scenarios found:", snapshot.size);
          setTotalSimulations(snapshot.size);

          // Calculate accuracy if it exists
          const accuracies = snapshot.docs
            .map((doc) => doc.data().accuracy)
            .filter((a) => typeof a === "number" && a >= 0 && a <= 100);

          const average = accuracies.length
            ? (accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(2) + "%"
            : "N/A";

          setAvgAccuracy(average);
        },
        (error) => {
          console.error("Error fetching simulations:", error);
          setTotalSimulations(0);
          setAvgAccuracy("N/A");
        }
      );
      unsubscribers.push(unsubscribeSimulations);

      // Active Users in the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeQuery = query(usersRef, where("lastLogin", ">", yesterday));
      const unsubscribeActiveUsers = onSnapshot(
        activeQuery,
        (snapshot) => {
          setActiveUsers(snapshot.size);
        },
        (err) => {
          console.error("Error fetching active users:", err);
        }
      );
      unsubscribers.push(unsubscribeActiveUsers);

    } catch (err) {
      console.error("Error setting up listeners:", err);
    }

    // Performance Status based on page load time
    const { timing } = window.performance;
    if (timing && timing.loadEventEnd && timing.navigationStart) {
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      if (loadTime < 1000) setPerformanceStatus("Excellent");
      else if (loadTime < 3000) setPerformanceStatus("Good");
      else if (loadTime < 5000) setPerformanceStatus("Fair");
      else setPerformanceStatus("Poor");
    } else {
      setPerformanceStatus("Unavailable");
    }

    // System status: Connectivity, Cores, Browser, and Battery
    const fetchSystemStatus = async () => {
      const online = navigator.onLine ? "Online" : "Offline";
      const cores = navigator.hardwareConcurrency || "N/A";
      let batteryLevel = "Battery: Unknown";

      try {
        const battery = await navigator.getBattery?.();
        if (battery) batteryLevel = `${Math.round(battery.level * 100)}%`;
      } catch (e) {
        console.warn("Battery info not available:", e);
      }

      let browser = "Unknown";
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Edg")) browser = "Edge";

      const systemInfo = `${online} | ${cores} cores | Battery: ${batteryLevel} | ${browser}`;
      setSystemStatus(systemInfo);
    };

    fetchSystemStatus();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // KPI Cards Layout
  const cards = [
    {
      icon: <FiUser className="text-3xl md:text-4xl" />,
      title: "Total Users",
      value: formatNumber(totalUsers),
      iconColor: "text-blue-500"
    },
    {
      icon: <FiBarChart className="text-3xl md:text-4xl" />,
      title: "Performance",
      value: performanceStatus,
      iconColor: "text-green-500"
    },
    {
      icon: <FiClock className="text-3xl md:text-4xl" />,
      title: "Last Activity",
      value: lastActivity,
      iconColor: "text-yellow-500"
    },
    {
      icon: <FiSettings className="text-3xl md:text-4xl" />,
      title: "System Status",
      value: systemStatus,
      iconColor: "text-red-500"
    },
    {
      icon: <FiBarChart className="text-3xl md:text-4xl" />,
      title: "Scenarios Run Today",
      value: formatNumber(scenariosRunToday),
      iconColor: "text-orange-500"
    },
    {
      icon: <FiActivity className="text-3xl md:text-4xl" />,
      title: "Total Simulations",
      value: formatNumber(totalSimulations),
      iconColor: "text-indigo-500"
    },
    {
      icon: <FiTrendingUp className="text-3xl md:text-4xl" />,
      title: "Active Users",
      value: formatNumber(activeUsers),
      iconColor: "text-teal-500"
    },
    {
      icon: <FiCheckCircle className="text-3xl md:text-4xl" />,
      title: "Avg. Accuracy",
      value: avgAccuracy,
      iconColor: "text-purple-500"
    },
    {
      icon: <FiClock className="text-3xl md:text-4xl" />,
      title: "System Uptime",
      value: uptime,
      iconColor: "text-emerald-500"
    }
  ];

  return (
    <div className="relative mt-8 group">
      {/* Auto-scroll toggle - positioned above the cards */}
      <div className="flex justify-end mb-2 px-8">
        <button
          onClick={toggleAutoScroll}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isAutoScrolling
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {isAutoScrolling ? "⏸ Pause Scroll" : "▶ Auto Scroll"}
        </button>
      </div>

      {/* Left scroll button */}
      <button
        onClick={() => scrollCards("left")}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:text-white dark:bg-gray-700 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <FiChevronLeft size={24} />
      </button>

      {/* KPI cards */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto space-x-6 scrollbar-hide px-8 py-2"
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="min-w-[250px] bg-gray-50 dark:bg-gray-800 dark:shadow-lg p-6 rounded-lg shadow-lg flex items-center space-x-4 transition-all hover:scale-105"
          >
            <div className={`${card.iconColor} flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="flex flex-col">
              <h3 className="text-base md:text-lg font-semibold text-gray-700 dark:text-white">
                {card.title}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 break-words">
                {loading ? (
                  <span className="inline-block bg-gray-300 dark:bg-gray-700 rounded-full w-24 h-4 animate-pulse"></span>
                ) : (
                  card.value
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Right scroll button */}
      <button
        onClick={() => scrollCards("right")}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:text-white dark:bg-gray-700 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <FiChevronRight size={24} />
      </button>
    </div>
  );
};

export default KpiCard;