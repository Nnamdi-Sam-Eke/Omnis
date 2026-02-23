import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  startAfter,
  limit,
} from "firebase/firestore";
import { useAuth } from "../AuthContext";
import { debounce } from "lodash";
import { Tag, Search, Clock, MessageSquare, Filter, AlertCircle, ChevronDown } from "lucide-react";

const PAGE_SIZE = 10;

const History = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInteractions, setUserInteractions] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedItems, setExpandedItems] = useState(new Set()); // Track expanded items

  // Toggle collapse/expand for individual items
  const toggleExpand = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Get category color based on category name
  const getCategoryColor = (category) => {
    const colors = {
      'Business': 'from-blue-500 to-cyan-600',
      'Technology': 'from-violet-500 to-purple-600',
      'Health': 'from-emerald-500 to-teal-600',
      'Finance': 'from-amber-500 to-orange-600',
      'Education': 'from-indigo-500 to-blue-600',
      'Creative': 'from-pink-500 to-rose-600',
      'Personal': 'from-green-500 to-emerald-600',
      'default': 'from-slate-500 to-slate-700'
    };
    
    return colors[category] || colors.default;
  };

  // Debounce input
  const debounceInput = useMemo(
    () => debounce((value) => setDebouncedSearch(value), 300),
    []
  );

  useEffect(() => {
    return () => debounceInput.cancel();
  }, [debounceInput]);

  useEffect(() => {
    debounceInput(searchQuery);
  }, [searchQuery, debounceInput]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
      loadUserInteractions(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Load chat history from user's subcollection
  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      console.log("📥 Loading chat history for user:", user.uid);
      
      const q = query(
        collection(db, "users", user.uid, "userInteractions"),
        orderBy("timestamp", "desc")
      );
      
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      console.log("✅ Chat history loaded:", history.length, "items");
      console.log("📋 Sample data:", history[0]);
      
      setChatHistory(history);
      setUsingFallback(history.length === 0);
    } catch (error) {
      console.error("❌ Error loading chat history:", error);
      setUsingFallback(true);
    }
  };

  // Load user interactions with pagination
  const loadUserInteractions = async (loadMore = false) => {
    if (!user) return;
    
    try {
      setLoadingMore(loadMore);
      console.log(loadMore ? "📥 Loading more interactions..." : "📥 Loading initial interactions...");
      
      // Query from user's subcollection (where ScenarioInput saves data)
      const userInteractionsRef = collection(db, "userInteractions", user.uid, "interactions");

      const q = query(
        userInteractionsRef,
        orderBy("timestamp", "desc"),
        ...(loadMore && lastVisible ? [startAfter(lastVisible)] : []),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const interactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Log the raw response structure for debugging
        if (data.response && typeof data.response === 'object') {
          console.log("🔍 Response structure:", {
            type: typeof data.response,
            keys: Object.keys(data.response),
            value: data.response
          });
        }
        
        return {
          id: doc.id,
          query: data.query || "",
          response: data.response || "",
          category: data.category || "Uncategorized",
          timestamp: data.timestamp,
          ...data,
        };
      });

      console.log("✅ Loaded", interactions.length, "interactions");
      console.log("📋 Sample interaction:", interactions[0]);

      setUserInteractions((prev) =>
        loadMore ? [...prev, ...interactions] : interactions
      );

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (error) {
      console.error("❌ Error fetching user interactions:", error);
      setLoadingMore(false);
    }
  };

  // Determine which history to use
  const { history: activeHistory, fallback: isFallback } = useMemo(() => {
    if (userInteractions.length > 0) {
      console.log("Using userInteractions:", userInteractions.length);
      return { history: userInteractions, fallback: false };
    }
    if (chatHistory.length > 0) {
      console.log("Using chatHistory (fallback):", chatHistory.length);
      return { history: chatHistory, fallback: true };
    }
    console.log("No history available");
    return { history: [], fallback: false };
  }, [userInteractions, chatHistory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(
      activeHistory
        .map((item) => item.category)
        .filter((cat) => cat && cat !== "")
    );
    return ["all", ...Array.from(cats)];
  }, [activeHistory]);

  // Filter interactions by search query and category
  const filteredInteractions = useMemo(() => {
    let filtered = activeHistory;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (interaction) => interaction.category === selectedCategory
      );
    }

    // Filter by search query
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((interaction) => {
        // Safely handle response type for .toLowerCase
        const queryStr = typeof interaction.query === "string" ? interaction.query : "";
        const responseStr = typeof interaction.response === "string" ? interaction.response : "";
        const categoryStr = typeof interaction.category === "string" ? interaction.category : "";

        return (
          queryStr.toLowerCase().includes(searchLower) ||
          responseStr.toLowerCase().includes(searchLower) ||
          categoryStr.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [debouncedSearch, selectedCategory, activeHistory]);

  // Search suggestions based on queries
  const suggestions = useMemo(() => {
    if (!debouncedSearch) return [];
    
    const searchLower = debouncedSearch.toLowerCase();
    const suggestionSet = new Set();
    
    activeHistory.forEach((interaction) => {
      if (interaction.query?.toLowerCase().includes(searchLower)) {
        suggestionSet.add(interaction.query);
      }
    });

    return Array.from(suggestionSet).slice(0, 5);
  }, [debouncedSearch, activeHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Loading Your History
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fetching your scenario simulations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Scenario History
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Review your past simulations and insights
          </p>
          {isFallback && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4" />
              <span>Using legacy history format</span>
            </div>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search simulations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
              />
              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-64 pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 text-slate-900 dark:text-white cursor-pointer transition-all appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Interactions List */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {filteredInteractions.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredInteractions.map((interaction, index) => {
                const isExpanded = expandedItems.has(interaction.id);
                
                return (
                <div
                  key={interaction.id}
                  className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all duration-200 cursor-pointer animate-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => toggleExpand(interaction.id)}
                >
                  {/* Header - Always Visible */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white truncate">
                          {interaction.query || "Scenario Simulation"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Category Badge */}
                          {interaction.category && interaction.category !== "Uncategorized" && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r ${getCategoryColor(interaction.category)} text-white rounded-full text-xs font-medium shadow-sm`}>
                              <Tag className="w-3 h-3" />
                              <span>{interaction.category}</span>
                            </div>
                          )}
                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {interaction.timestamp?.toDate?.().toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) ?? "Recent"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(interaction.id);
                      }}
                      className="flex-shrink-0 p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <ChevronDown 
                        className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 animate-in">
                      {/* Query Section */}
                      {interaction.query && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Query
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                            {interaction.query}
                          </p>
                        </div>
                      )}

                      {/* Response Section */}
                      {interaction.response && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            AI Analysis
                          </p>
                          <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            {(() => {
                              // If response is a string, render directly
                              if (typeof interaction.response === 'string') {
                                return <p>{interaction.response}</p>;
                              }

                              // If response is an array, render each item as a string
                              if (Array.isArray(interaction.response)) {
                                return (
                                  <ul className="space-y-1 list-disc pl-5">
                                    {interaction.response.map((item, idx) => (
                                      <li key={idx}>
                                        {typeof item === "object"
                                          ? <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                                          : String(item)}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }

                              // If response is an object, pretty print it
                              if (typeof interaction.response === 'object' && interaction.response !== null) {
                                return (
                                  <pre className="whitespace-pre-wrap text-xs">
                                    {JSON.stringify(interaction.response, null, 2)}
                                  </pre>
                                );
                              }

                              // Fallback: render as string
                              return <p className="text-xs">{String(interaction.response)}</p>;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
                No interactions found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== "all"
                  ? "Try adjusting your search or filter"
                  : "Your scenario simulations will appear here after you run your first simulation"}
              </p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && !loadingMore && filteredInteractions.length > 0 && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl">
            <button
              onClick={() => loadUserInteractions(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              Load More Interactions
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Loading more interactions...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {activeHistory.length > 0 && (
        <div className="max-w-6xl mx-auto mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeHistory.length}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Total Simulations
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {categories.length - 1}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Categories
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {filteredInteractions.length}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Filtered Results
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        
        /* Scrollbar styling */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        .dark .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #475569;
        }
      `}</style>
    </div>
  );
};

export default History;