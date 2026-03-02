import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import moment from "moment";
import toast, { Toaster } from "react-hot-toast";
import { useNotifications } from "../context/NotificationsContext";
import { Bell, Info, CheckCircle, Inbox, Filter, Trash2, Search, X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    notifications,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    clearAllUnread,
    deleteNotification,
  } = useNotifications();

  const [filterType, setFilterType] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const topRef = useRef();



  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [notifications]);

  // Clear all unread on mount — delegates to context which owns the Firestore write
  useEffect(() => {
    if (!user?.uid) return;
    clearAllUnread();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps



  const getIcon = (type) => {
    const iconProps = "w-5 h-5";
    switch (type) {
      case "info": return <Info className={`text-blue-500 ${iconProps}`} />;
      case "alert": return <Bell className={`text-red-500 ${iconProps}`} />;
      case "feature": return <Sparkles className={`text-purple-500 ${iconProps}`} />;
      case "success": return <CheckCircle className={`text-emerald-500 ${iconProps}`} />;
      default: return <Bell className={`text-gray-400 ${iconProps}`} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "info": return "bg-blue-50/80 border-blue-200/60 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400";
      case "alert": return "bg-red-50/80 border-red-200/60 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400";
      case "feature": return "bg-purple-50/80 border-purple-200/60 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400";
      case "success": return "bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400";
      default: return "bg-gray-50/80 border-gray-200/60 text-gray-700 dark:bg-gray-500/10 dark:border-gray-500/20 dark:text-gray-400";
    }
  };



  const filtered = notifications
    .filter((n) => filterType === "all" || n.type === filterType)
    .filter((n) => readFilter === "unread" ? !n.read : readFilter === "read" ? n.read : true)
    .filter((n) => searchQuery === "" || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (timestamp) => {
    return moment(timestamp).fromNow();
  };

  const groupedNotifications = filtered.reduce((acc, notif) => {
    const date = moment(notif.timestamp).startOf("day");
    const label = moment().diff(date, "days") === 0
      ? "Today"
      : moment().diff(date, "days") === 1
      ? "Yesterday"
      : date.format("MMMM D, YYYY");
    acc[label] = acc[label] || [];
    acc[label].push(notif);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 3000,
        }}
      />
      <div ref={topRef} />
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse font-bold shadow-lg">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : "All caught up! 🎉"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 active:scale-95"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className={`mb-8 transition-all duration-500 ease-out ${showFilters ? 'opacity-100 max-h-96 translate-y-0' : 'opacity-0 max-h-0 -translate-y-4 overflow-hidden'}`}>
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-gray-500/5">
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-2">Filter by type:</span>
                {[
                  { key: "all", label: "All", color: "gray" },
                  { key: "info", label: "Info", color: "blue" },
                  { key: "alert", label: "Alert", color: "red" },
                  { key: "feature", label: "Feature", color: "purple" },
                  { key: "success", label: "Success", color: "emerald" }
                ].map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setFilterType(type.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      filterType === type.key
                        ? `bg-gradient-to-r from-${type.color}-500 to-${type.color}-600 text-white shadow-lg shadow-${type.color}-500/25 transform scale-105`
                        : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 hover:scale-105"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 py-2">Filter by status:</span>
                {[
                  { key: "all", label: "All", color: "gray" },
                  { key: "unread", label: "Unread", color: "blue" },
                  { key: "read", label: "Read", color: "emerald" }
                ].map((status) => (
                  <button
                    key={status.key}
                    onClick={() => setReadFilter(status.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      readFilter === status.key
                        ? `bg-gradient-to-r from-${status.color}-500 to-${status.color}-600 text-white shadow-lg shadow-${status.color}-500/25 transform scale-105`
                        : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 hover:scale-105"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-gray-500/5 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Inbox className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                No notifications found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? "Try adjusting your search or filters" : "You're all caught up! 🎉"}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([dateLabel, notifs]) => (
            <div key={dateLabel} className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {dateLabel}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-gray-200 to-transparent dark:from-gray-600 dark:via-gray-700"></div>
                <div className="px-3 py-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-full">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {notifs.length}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {notifs.map((notification) => (
                  <Link to={notification.url || "#"} key={notification.id}>
                    <div
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        notification.read
                          ? "bg-white/70 dark:bg-gray-900/70 border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/50 dark:hover:border-gray-600/50 shadow-lg shadow-gray-500/5"
                          : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200/50 dark:border-blue-700/50 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20"
                      }`}
                    >
                      {!notification.read && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl border ${getTypeColor(notification.type)}`}>
                            {getIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`font-bold text-gray-900 dark:text-white text-lg ${
                                !notification.read ? 'font-black' : ''
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-full">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    {formatTime(notification.timestamp)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      markAsRead(notification.id);
                                    }}
                                    className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                                    title="Mark as read"
                                  >
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteNotification(notification.id);
                                  }}
                                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-8 py-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-gray-50/70 dark:hover:bg-gray-800/70 transition-all duration-200 font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-50 shadow-lg shadow-gray-500/5 hover:shadow-gray-500/10 hover:-translate-y-1 transform active:scale-95"
            >
              {loadingMore ? "Loading..." : "Load More Notifications"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}