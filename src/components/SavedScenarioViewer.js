import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function SavedScenarioSidebar({ scenario, onClose, onReRun, onEdit }) {
  const [editedVariables, setEditedVariables] = useState(scenario?.variables || {});

  useEffect(() => {
    setEditedVariables(scenario?.variables || {});
  }, [scenario]);

  const handleReRun = () => {
    if (onReRun) {
      onReRun(editedVariables);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      // Pass the entire scenario with updated variables
      onEdit({
        ...scenario,
        variables: editedVariables
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* Sidebar */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full w-[500px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Saved Scenario
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Review and modify your scenario
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scenario Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  {scenario?.category || scenario?.query || "Untitled Scenario"}
                </h3>
                {scenario?.details && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {scenario.details}
                  </p>
                )}
                {scenario?.savedAt && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    Saved: {scenario.savedAt?.toDate ? scenario.savedAt.toDate().toLocaleString() : new Date(scenario.savedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Original Output */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Original Output
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono">
                {scenario?.response?.result || scenario?.originalOutput || "No output available"}
              </pre>
            </div>
          </div>

          {/* Variables Edit */}
          {editedVariables && Object.keys(editedVariables).length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Variables
              </h3>
              <div className="space-y-3">
                {Object.keys(editedVariables).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={editedVariables[key]}
                      onChange={(e) =>
                        setEditedVariables({
                          ...editedVariables,
                          [key]: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-3">
            <button
              onClick={handleEdit}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleReRun}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-run
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function MobileSavedScenarioModal({ scenario, onClose, onReRun, onEdit }) {
  const [editedVariables, setEditedVariables] = useState(scenario?.variables || {});

  useEffect(() => {
    setEditedVariables(scenario?.variables || {});
  }, [scenario]);

  const handleReRun = () => {
    if (onReRun) {
      onReRun(editedVariables);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      // Pass the entire scenario with updated variables
      onEdit({
        ...scenario,
        variables: editedVariables
      });
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Saved Scenario
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Review and modify
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scenario Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-4 border border-blue-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {scenario?.category || scenario?.query || "Untitled Scenario"}
              </h3>
              {scenario?.details && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {scenario.details}
                </p>
              )}
              {scenario?.savedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Saved: {scenario.savedAt?.toDate ? scenario.savedAt.toDate().toLocaleString() : new Date(scenario.savedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Original Output */}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Original Output
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 font-mono">
              {scenario?.response?.result || scenario?.originalOutput || "No output available"}
            </pre>
          </div>
        </div>

        {/* Variables Edit */}
        {editedVariables && Object.keys(editedVariables).length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Variables
            </h3>
            <div className="space-y-3">
              {Object.keys(editedVariables).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={editedVariables[key]}
                    onChange={(e) =>
                      setEditedVariables({
                        ...editedVariables,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder={`Enter ${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={handleReRun}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-run
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ===== Adaptable Component =====
export default function SavedScenarioViewer({ scenario, onClose, onReRun, onEdit }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!scenario) return null;

  return (
    <AnimatePresence>
      {isMobile ? (
        <MobileSavedScenarioModal
          scenario={scenario}
          onClose={onClose}
          onReRun={onReRun}
          onEdit={onEdit}
        />
      ) : (
        <SavedScenarioSidebar
          scenario={scenario}
          onClose={onClose}
          onReRun={onReRun}
          onEdit={onEdit}
        />
      )}
    </AnimatePresence>
  );
}