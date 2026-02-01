import React, { useEffect, useState } from "react";
import { Clock, Activity, CheckCircle, AlertCircle, User, FileText,  TrendingDown, Trophy, Bell, ChevronDown, Filter, ExternalLink, Zap } from "lucide-react";

const RecentActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPredictiveInsight, setShowPredictiveInsight] = useState(false);

  // Mock data generator - Replace with actual Firestore fetch
  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      const mockActivities = [
        {
          id: 1,
          action: "Simulation 'Farm Yield 2025' completed",
          actor: "System",
          timestamp: new Date(Date.now() - 12 * 60000),
          type: "simulation",
          status: "success",
          details: "Completed in 12m with 98% accuracy",
          link: "/simulations/farm-yield-2025"
        },
        {
          id: 2,
          action: "Task 'Water supply allocation' failed validation",
          actor: "System",
          timestamp: new Date(Date.now() - 45 * 60000),
          type: "task",
          status: "error",
          details: "Input parameters out of acceptable range",
          link: "/tasks/water-supply"
        },
        {
          id: 3,
          action: "Achievement unlocked: First successful simulation",
          actor: "You",
          timestamp: new Date(Date.now() - 2 * 60 * 60000),
          type: "achievement",
          status: "success",
          details: "Congratulations on completing your first simulation!",
          link: "/achievements"
        },
        {
          id: 4,
          action: "User updated Task 'Soil Fertility Analysis'",
          actor: "John Doe",
          timestamp: new Date(Date.now() - 5 * 60 * 60000),
          type: "task",
          status: "pending",
          details: "Modified input parameters and schedule",
          link: "/tasks/soil-fertility"
        },
        {
          id: 5,
          action: "New system alert: Weather forecast changed",
          actor: "System",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60000),
          type: "alert",
          status: "warning",
          details: "Updated forecast may affect next simulation results",
          link: "/alerts/weather"
        },
        {
          id: 6,
          action: "Simulation 'Crop Rotation Q4' started",
          actor: "System",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000),
          type: "simulation",
          status: "pending",
          details: "Estimated completion: 25 minutes",
          link: "/simulations/crop-rotation"
        },
        {
          id: 7,
          action: "Task 'Irrigation Planning' completed",
          actor: "You",
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000),
          type: "task",
          status: "success",
          details: "All validation checks passed",
          link: "/tasks/irrigation"
        }
      ];
      
      setActivities(mockActivities);
      setFilteredActivities(mockActivities);
      setIsLoading(false);
      
      // Show predictive insight if there are recent simulations
      const recentSimulations = mockActivities.filter(a => a.type === "simulation");
      setShowPredictiveInsight(recentSimulations.length >= 2);
    }, 1000);
  }, []);

  // Filter activities
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(activities.filter(a => a.type === activeFilter));
    }
  }, [activeFilter, activities]);

  // Get icon based on activity type and status
  const getActivityIcon = (activity) => {
    if (activity.status === "error") {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    switch (activity.type) {
      case "simulation":
        return activity.status === "success" 
          ? <CheckCircle className="w-4 h-4 text-green-500" />
          : <Zap className="w-4 h-4 text-blue-500" />;
      case "task":
        return activity.status === "success"
          ? <CheckCircle className="w-4 h-4 text-green-500" />
          : <FileText className="w-4 h-4 text-amber-500" />;
      case "achievement":
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case "alert":
        return <Bell className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "error": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "warning": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "pending": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  // Get full timestamp for hover
  const getFullTimestamp = (timestamp) => {
    return timestamp.toLocaleString();
  };

  const filters = [
    { id: "all", label: "All", icon: Activity },
    { id: "simulation", label: "Simulations", icon: Zap },
    { id: "task", label: "Tasks", icon: FileText },
    { id: "alert", label: "Alerts", icon: Bell },
    { id: "achievement", label: "Achievements", icon: Trophy }
  ];

  const displayedActivities = isExpanded ? filteredActivities : filteredActivities.slice(0, 5);

  return (
    <div className="min-w-[300px] max-h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Recent Activity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Live activity feed</p>
            </div>
          </div>
          <Filter className="w-5 h-5 text-gray-400" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeFilter === filter.id
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Predictive Insight Banner */}
        {showPredictiveInsight && (
          <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex-shrink-0">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Predictive Insight</p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Recent simulations indicate a potential yield drop of 5% in next scenario. Consider adjusting irrigation parameters.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Activity List */}
        <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No activity found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => window.alert(`Navigate to: ${activity.link}`)}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  {getActivityIcon(activity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white leading-relaxed">
                      {activity.action}
                    </p>
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  
                  {/* Meta Info */}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{activity.actor}</span>
                    </div>
                    <div 
                      className="flex items-center gap-1"
                      title={getFullTimestamp(activity.timestamp)}
                    >
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>

                  {/* Details */}
                  {activity.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                      {activity.details}
                    </p>
                  )}
                </div>

                {/* Status Indicator Dot */}
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  activity.status === "success" ? "bg-green-500" :
                  activity.status === "error" ? "bg-red-500" :
                  activity.status === "warning" ? "bg-yellow-500" :
                  "bg-blue-500"
                } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      {filteredActivities.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
          >
            {isExpanded ? "Show less" : `View all activity (${filteredActivities.length})`}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
        <p className="text-white text-2xl font-bold drop-shadow-sm">Coming Soon 🔒...</p>
      </div>
    </div>
  );
};

export default RecentActivityFeed;