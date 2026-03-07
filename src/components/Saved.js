import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// ── Inline text renderer (bold, italic) ──────────────────────────────────
const SavedInlineText = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const SavedObjectResponse = ({ obj }) => (
  <div className="space-y-3">
    {Object.entries(obj).map(([key, value]) => (
      <div key={key}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
          {key.replace(/_/g, ' ')}
        </p>
        {typeof value === 'string'
          ? <SavedFormattedResponse response={value} />
          : Array.isArray(value)
            ? <ul className="space-y-1 pl-4 border-l-2 border-emerald-200 dark:border-emerald-700">
                {value.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    {typeof item === 'object' ? <SavedObjectResponse obj={item} /> : String(item)}
                  </li>
                ))}
              </ul>
            : typeof value === 'object' && value !== null
              ? <SavedObjectResponse obj={value} />
              : <p className="text-sm text-slate-700 dark:text-slate-300">{String(value)}</p>
        }
      </div>
    ))}
  </div>
);

const SavedFormattedResponse = ({ response }) => {
  if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
    return <SavedObjectResponse obj={response} />;
  }
  if (Array.isArray(response)) {
    return (
      <ul className="space-y-1 pl-4 border-l-2 border-emerald-200 dark:border-emerald-700">
        {response.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
            {typeof item === 'object' ? <SavedObjectResponse obj={item} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  const text = typeof response === 'string' ? response : String(response);
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1"><SavedInlineText text={line.slice(4)} /></h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-3 mb-1"><SavedInlineText text={line.slice(3)} /></h3>);
    } else if (/^[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 pl-4 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 flex-shrink-0" />
              <SavedInlineText text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 pl-4 list-decimal list-outside">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 pl-1">
              <SavedInlineText text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    } else {
      elements.push(<p key={i} className="text-sm text-slate-700 dark:text-slate-300"><SavedInlineText text={line} /></p>);
    }
    i++;
  }
  return <div className="space-y-1.5">{elements}</div>;
};

const SavedComponent = ({ setCurrentSavedScenario, setSidebarOpen }) => {
  const { user } = useAuth();
  const [savedQueries, setSavedQueries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };
  const pageSize = 6;

  // Fetch saved queries from Firestore
  useEffect(() => {
    const fetchSavedQueries = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const savedRef = collection(db, "userInteractions", user.uid, "savedScenarios");
        const q = query(savedRef, orderBy("savedAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSavedQueries(data);
      } catch (error) {
        console.error("Error retrieving saved scenarios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedQueries();
  }, [user]);

  // Timer to switch off loading after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Update suggestions based on the search query
  useEffect(() => {
    setSuggestions(
      searchQuery
        ? [...new Set(savedQueries.map((item) => item.query))].filter((query) =>
            query.toLowerCase().startsWith(searchQuery.toLowerCase())
          )
        : []
    );
  }, [searchQuery, savedQueries]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, savedQueries.length]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Helper: export item(s) as PDF-like printable HTML
  const exportItemsAsPDF = (items) => {
    const htmlSections = items.map((item) => {
      const content = item.response?.result || JSON.stringify(item.response || {}, null, 2);
      return `
        <section style="page-break-inside:avoid;margin-bottom:32px;">
          <h2 style="font-family: Arial, Helvetica, sans-serif; color:#0f172a;">${escapeHtml(item.query || 'Untitled')}</h2>
          <p style="color:#334155;font-size:0.95rem;">Category: <strong>${escapeHtml(item.category || 'Uncategorized')}</strong></p>
          <hr/>
          <div style="font-family: Georgia, serif; color:#0f172a; white-space:pre-wrap;">${escapeHtml(content)}</div>
        </section>
      `;
    }).join('\n');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Saved Scenarios Export</title></head><body style="padding:24px;">${htmlSections}</body></html>`;
    const newWin = window.open('', '_blank');
    if (!newWin) {
      alert('Popup blocked. Please allow popups to export.');
      return;
    }
    newWin.document.write(html);
    newWin.document.close();
    newWin.focus();
    setTimeout(() => newWin.print(), 500);
  };

  const escapeHtml = (unsafe) => {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const baseList = searchQuery ? filteredSavedQueries : savedQueries;
    const start = (page - 1) * pageSize;
    const list = baseList.slice(start, start + pageSize).map(i => i.id);
    if (list.length === 0) return;
    const allSelected = list.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list));
    }
  };

  const deleteSelected = async () => {
    if (!user?.uid) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const confirmDelete = window.confirm(`Delete ${ids.length} saved scenario(s)?`);
    if (!confirmDelete) return;
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'userInteractions', user.uid, 'savedScenarios', id))));
      setSavedQueries(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk delete failed', err);
      alert('Bulk delete failed.');
    }
  };

  const exportSelected = () => {
    const items = savedQueries.filter(i => selectedIds.has(i.id));
    if (!items.length) { window.alert('No items selected'); return; }
    exportItemsAsPDF(items);
  };

  // Filter and sort scenarios
  const filteredSavedQueries = savedQueries
    .filter((item) =>
      (item.query?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.category?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = a.savedAt?.toDate?.() || new Date(a.savedDate || 0);
      const dateB = b.savedAt?.toDate?.() || new Date(b.savedDate || 0);
      return sortBy === "recent" ? dateB - dateA : dateA - dateB;
    });

  // Pagination
  const baseList = filteredSavedQueries;
  const totalPages = Math.max(1, Math.ceil(baseList.length / pageSize));
  const visibleItems = baseList.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (itemId) => {
    if (!user?.uid) return;
    if (!window.confirm("Delete this scenario? This cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, 'userInteractions', user.uid, 'savedScenarios', itemId));
      setSavedQueries(prev => prev.filter(i => i.id !== itemId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setMenuOpenId(null);
    } catch (err) {
      console.error('Failed to delete scenario', err);
      alert('Failed to delete scenario.');
    }
  };

  const handleDuplicate = async (item) => {
    if (!user?.uid) return;
    
    try {
      const newScenario = {
        ...item,
        query: `${item.query} (Copy)`,
        savedAt: new Date(),
        savedDate: new Date().toISOString(),
      };
      delete newScenario.id;
      
      const savedRef = collection(db, "userInteractions", user.uid, "savedScenarios");
      const docRef = await addDoc(savedRef, newScenario);
      
      setSavedQueries(prev => [{
        id: docRef.id,
        ...newScenario
      }, ...prev]);
      
      setMenuOpenId(null);
    } catch (err) {
      console.error('Failed to duplicate scenario', err);
      alert('Failed to duplicate scenario.');
    }
  };

  const handleRename = async (itemId) => {
    if (!user?.uid || !renameValue.trim()) return;
    
    try {
      await updateDoc(doc(db, 'userInteractions', user.uid, 'savedScenarios', itemId), {
        query: renameValue.trim()
      });
      setSavedQueries(prev => prev.map(i => 
        i.id === itemId ? { ...i, query: renameValue.trim() } : i
      ));
      setRenamingId(null);
      setRenameValue("");
      setMenuOpenId(null);
    } catch (err) {
      console.error('Failed to rename scenario', err);
      alert('Failed to rename scenario.');
    }
  };

  const formatDate = (item) => {
    const date = item.savedAt?.toDate?.() || new Date(item.savedDate || 0);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      finance: "💰",
      workflow: "⚙️",
      simulation: "🎯",
      analysis: "📊",
      decision: "🤔",
    };
    return icons[category?.toLowerCase()] || "📄";
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-6xl mx-auto p-8">
        <div className="space-y-4">
          <div className="h-8 bg-gradient-to-r from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-xl"></div>
          <div className="h-12 bg-gradient-to-r from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded-xl"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl"></div>
            <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl"></div>
            <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl"></div>
          </div>

          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => setSearchQuery(suggestion)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {suggestion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Saved Queries
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 mx-auto rounded-full"></div>
        </div>

        {/* Search & Sort Container */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-3xl border border-white/20 dark:border-slate-700/50 shadow-2xl p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved queries..."
                className="w-full pl-12 pr-4 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300 shadow-lg"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 shadow-lg"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Saved Queries Container */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-3xl border border-white/20 dark:border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-300">Total saved:</div>
                <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 font-semibold text-sm">
                  {savedQueries.length}
                </div>
                {selectedIds.size > 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">Selected: {selectedIds.size}</div>
                )}
              </div>

              {/* Only show buttons when items are selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={selectAllVisible} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm transition-colors">
                    Select All
                  </button>
                  <button onClick={exportSelected} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors">
                    Export
                  </button>
                  <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Conditional rendering */}
            {filteredSavedQueries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  {searchQuery ? "No scenarios found" : "No Saved Queries Yet"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Saved scenarios help you revisit and compare decisions over time"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-600/50 transition-all duration-200 overflow-hidden"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      boxShadow: hoveredId === item.id ? '0 8px 24px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transform: hoveredId === item.id ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                  >
                    <div
                      onClick={() => {
                        if (renamingId !== item.id && menuOpenId !== item.id) {
                          toggleExpand(item.id);
                        }
                      }}
                      className="px-6 py-5 cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(item.id)} 
                          onChange={() => toggleSelect(item.id)} 
                          className="mt-2 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* Category Icon */}
                        <div className="text-3xl mt-0.5 flex-shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {renamingId === item.id ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(item.id);
                                if (e.key === 'Escape') {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              onBlur={() => {
                                if (renameValue.trim()) {
                                  handleRename(item.id);
                                } else {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              autoFocus
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2 truncate">
                              {item.query || "Untitled Scenario"}
                            </h3>
                          )}
                          
                          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-3">
                            <span className="font-medium">{formatDate(item)}</span>
                            {item.category && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{item.category}</span>
                              </>
                            )}
                          </div>

                          {item.response?.result && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {item.response.result.substring(0, 150)}...
                            </p>
                          )}
                        </div>

                        {/* Actions Menu (visible on hover) */}
                        {hoveredId === item.id && (
                          <div className="flex-shrink-0 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === item.id ? null : item.id);
                              }}
                              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {menuOpenId === item.id && (
                              <div 
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingId(item.id);
                                    setRenameValue(item.query || "");
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-3 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(item);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-3 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Duplicate
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportItemsAsPDF([item]);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center gap-3 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Export
                                </button>
                                <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expand/Collapse Chevron */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item.id);
                          }}
                          className="flex-shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors self-start mt-1"
                        >
                          <ChevronDown
                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                              expandedId === item.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div> {/* end flex items-start gap-4 */}

                      {/* Expanded Formatted Content */}
                      {expandedId === item.id && (
                        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
                          {/* Query */}
                          {item.query && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Query</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                {item.query}
                              </p>
                            </div>
                          )}
                          {/* Clarifications */}
                          {item.clarifications?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Clarifications</p>
                              <div className="space-y-2">
                                {item.clarifications.map((c, i) => (
                                  <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{c.question}</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{c.answer}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* AI Analysis */}
                          {(item.response?.result || item.response) && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">AI Analysis</p>
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 space-y-2">
                                <SavedFormattedResponse response={item.response?.result || item.response} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pagination controls */}
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {menuOpenId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpenId(null)}
        ></div>
      )}
    </div>
  );
};

export default SavedComponent;