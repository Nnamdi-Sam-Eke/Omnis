import React, { useState, useEffect, useRef } from "react";
import { useMemory } from "../MemoryContext";
import { db } from "../firebase";
import { Trash2, Plus, Tag } from "lucide-react";
import { generateOmnisContent, expandOmnisText, generateOmnisClarifications } from "../services/omnis-actions";
import UpgradeModal from "./UpgradeModal";
import {
  doc,
  collection,
  addDoc,
 
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";


import { useAuth } from "../AuthContext";
import { ChevronRight, ChevronUp, Lock, Crown, Copy, Undo, Redo, Type, Sparkles, Edit3, Zap } from "lucide-react";
import ShimmerLoader from "./ShimmerLoader";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:8000/run"
  : "https://your-production-backend.com/run";

// Simplified InputForm component without markdown
const SimplifiedInputForm = ({ scenario, onScenarioChange, onCategoryChange, placeholder = "Type your scenario here..." }) => {
  const [history, setHistory] = useState([scenario?.text || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  const textareaRef = useRef(null);

  // Debounce State
  const [debouncedValue, setDebouncedValue] = useState(scenario?.text || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      onScenarioChange({ ...scenario, text: debouncedValue });
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedValue]);


  // Initialize history when value changes from parent
  useEffect(() => {
    if (scenario?.text !== history[historyIndex]) {
      setHistory([scenario?.text || ""]);
      setHistoryIndex(0);
    }
  }, []);

  // Update input and version history
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    
    // Update parent component
    onScenarioChange({ ...scenario, text: newValue });
    
    // Update history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    onCategoryChange({ ...scenario, category: newCategory });
  };

  // Copy input text to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scenario?.text || "");
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      }
    }
  };

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousValue = history[historyIndex - 1];
      onScenarioChange({ ...scenario, text: previousValue });
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Redo functionality
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextValue = history[historyIndex + 1];
      onScenarioChange({ ...scenario, text: nextValue });
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Add to SimplifiedInputForm
useEffect(() => {
  const handleKeyboard = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, [historyIndex]);
 


  // Calculate word and character counts
  const wordCount = scenario?.text ? scenario.text.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = scenario?.text ? scenario.text.length : 0;

  return (
    <div className="space-y-6">
      {/* Modern Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="group flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Undo</span>
          </button>
          
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="group flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Redo</span>
          </button>
          
          <button
            onClick={handleCopy}
            className={`group flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
              showCopySuccess 
                ? 'bg-emerald-500 text-white shadow-emerald-500/25' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
            }`}
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>{showCopySuccess ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Type className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{wordCount}</span>
            <span className="text-slate-400">words</span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-medium">{charCount}</span>
            <span className="text-slate-400">chars</span>
          </div>
        </div>
      </div>

      {/* Category and Input Form */}
      <div className="space-y-4">
        {/* Category Input */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg text-sm font-medium">
              <Tag className="w-4 h-4" />
              <span>Category</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-600"></div>
          </div>
          
          <div className="relative group">
            <input
              type="text"
              value={scenario?.category || ""}
              onChange={handleCategoryChange}
              className="w-full p-4 border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 group-hover:border-slate-400 dark:group-hover:border-slate-500 shadow-lg"
              placeholder="e.g., Business Strategy, Risk Assessment, Market Analysis..."
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
        </div>

        {/* Scenario Input */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium">
              <Edit3 className="w-4 h-4" />
              <span>Scenario</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-600"></div>
          </div>
          
          <div className="relative group">
            <textarea
              ref={textareaRef}
              value={scenario?.text || ""}
              onChange={handleInputChange}
              className="w-full p-6 border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-[200px] group-hover:border-slate-400 dark:group-hover:border-slate-500 shadow-lg"
              placeholder={placeholder}
              spellCheck="false"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Describe your scenario in detail for better analysis results.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ScenarioInput component with updated structure
export default function ScenarioInput({ onSimulate, setGeneratedResults, setSimulationLoading, // ✅ Receive from parent
  setSimulationInput }) {
  const { user } = useAuth();
  const storageKeyRef = useRef(user?.uid ? `omnis:scenario:${user.uid}` : "omnis:scenario:guest");

  // Update storage key when user changes
  useEffect(() => {
    storageKeyRef.current = user?.uid ? `omnis:scenario:${user.uid}` : "omnis:scenario:guest";
  }, [user?.uid]);

  // Helper to get saved data for current user
  const getSavedData = () => {
    try {
      const raw = localStorage.getItem(storageKeyRef.current);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Failed to load data from localStorage:", e);
      return {};
    }
  };

  // Initialize scenarios from localStorage
  const [scenarios, setScenarios] = useState(() => {
    const saved = getSavedData();
    return saved?.scenarios || [{ text: "", category: "" }];
  });
  // Default: open on desktop, closed on mobile
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 768);

  // Tracks whether the user has manually toggled
  const [userToggled, setUserToggled] = useState(false);
  const [results, setResults] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const { memory, saveToFirestore } = useMemory();
  const [error, setError] = useState(null);
  // Local simulation state (restored after refactor)
  // Local fallbacks for results and input in case parent did not provide setters
  const [generatedResultsLocal, setGeneratedResultsLocal] = useState(() => {
    const saved = getSavedData();
    return saved?.generatedResults || [];
  });
  const [simulationInputLocal, setSimulationInputLocal] = useState(() => {
    const saved = getSavedData();
    return saved?.simulationInput || "";
  });
  // Local simulation state
  const [simulationLoadingLocal, setSimulationLoadingLocal] = useState(false);
  

  // Updater wrappers: always update local state, and call parent setter if provided
  const updateGeneratedResults = (val) => {
    setGeneratedResultsLocal(val);
    if (typeof setGeneratedResults === 'function') {
      try { setGeneratedResults(val); } catch (e) { console.warn('parent setGeneratedResults failed', e); }
    }
    // Immediately persist to localStorage
    const payload = {
      scenarios,
      generatedResults: val,
      simulationInput: simulationInputLocal,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(payload));
      console.log("✅ Immediately saved results to localStorage:", storageKeyRef.current, payload);
    } catch (e) {
      console.warn("Failed to persist results:", e);
    }
  };

   // ✅ Create wrapper function that updates both local AND parent
  const updateSimulationLoading = (val) => {
    setSimulationLoadingLocal(val);
    if (typeof setSimulationLoading === 'function') {
      try { 
        setSimulationLoading(val); 
      } catch (e) { 
        console.warn('parent setSimulationLoading failed', e); 
      }
    }
  };

  const updateSimulationInput = (val) => {
    setSimulationInputLocal(val);
    if (typeof setSimulationInput === 'function') {
      try { setSimulationInput(val); } catch (e) { console.warn('parent setSimulationInput failed', e); }
    }
  };

  // On mount, initialize parent with restored data
  useEffect(() => {
    const saved = getSavedData();
    if (saved?.generatedResults && saved.generatedResults.length > 0) {
      if (typeof setGeneratedResults === 'function') {
        try {
          setGeneratedResults(saved.generatedResults);
          console.log("✅ Initialized parent with restored results:", saved.generatedResults);
        } catch (e) {
          console.warn('Failed to initialize parent with restored results:', e);
        }
      }
    }
    if (saved?.simulationInput) {
      if (typeof setSimulationInput === 'function') {
        try {
          setSimulationInput(saved.simulationInput);
        } catch (e) {
          console.warn('Failed to initialize parent with restored simulationInput:', e);
        }
      }
    }
  }, []); // Run only on mount

  
  const [trialExpired, setTrialExpired] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUpgradeModalComponent, setShowUpgradeModalComponent] = useState(false);
  const [loading, setLoading] = React.useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false); // Add this state if not present
  
  // ---- Clarification (NEW) ----
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyError, setClarifyError] = useState(null);

  const [pendingScenarios, setPendingScenarios] = useState([]); // scenarios awaiting processing
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);

  const [currentClarifications, setCurrentClarifications] = useState([]); // [{id, question}]
  const [currentAnswers, setCurrentAnswers] = useState({}); // { qid: "answer" }

  const [pendingResults, setPendingResults] = useState([]); // collects results for multiple scenarios
  const pendingResultsRef = useRef([]);
  const [clarifyStep, setClarifyStep] = useState(0); // index of current question
  
  // Get user tier for button logic
  const userTier = (
    user?.subscriptionTier || 
    user?.tier?.toLowerCase?.() || 
    "free"
  ).toLowerCase();
  
  const isFreeTier = userTier === "free";
  const isPaidTier = userTier === "pro" || userTier === "enterprise";
  
  // Timer to switch off loading after 3 seconds (on mount)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Always keep expanded on desktop/tablet (>= md)
      if (width >= 768) {
        setIsOpen(true);
        return;
      }

      // On mobile: if user has already toggled, respect their choice
      if (userToggled) return;

      // Default for mobile is closed
      setIsOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userToggled]);

  useEffect(() => {
    if (user) {
      checkTrialStatus();
      
     
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem(storageKeyRef.current);
      if (!raw) return;

      const saved = JSON.parse(raw);
      console.log("✅ Restored scenario state from localStorage:", storageKeyRef.current, saved);

      // Only restore if we have saved data and it's different from current state
      if (saved?.scenarios && JSON.stringify(saved.scenarios) !== JSON.stringify(scenarios)) {
        setScenarios(saved.scenarios);
      }
      if (saved?.generatedResults && JSON.stringify(saved.generatedResults) !== JSON.stringify(generatedResultsLocal)) {
        updateGeneratedResults(saved.generatedResults);
      }
      if (saved?.simulationInput && saved.simulationInput !== simulationInputLocal) {
        updateSimulationInput(saved.simulationInput);
      }

    } catch (e) {
      console.warn("Failed to restore scenario state:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (showClarifyModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showClarifyModal]);

  useEffect(() => {
    if (!user) return;

    const payload = {
      scenarios,
      simulationInput: simulationInputLocal,
      // isModalOpen, // optional
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(payload));
      console.log("✅ Saved scenario state to localStorage:", storageKeyRef.current, payload);
    } catch (e) {
      console.warn("Failed to persist scenario state:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, simulationInputLocal, user?.uid]);

  const clearScenarioSession = () => {
    localStorage.removeItem(storageKeyRef.current);
    setScenarios([{ text: "", category: "Uncategorized" }]); // or your default
    updateGeneratedResults([]);
    updateSimulationInput("");
  };




  const checkTrialStatus = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const tier = (userData.subscriptionTier || user?.tier?.toLowerCase?.() || "free").toLowerCase();
      const now = new Date();

      if (tier !== "free") {
        setTrialExpired(false);
        setShowUpgradeModal(false);
        console.log("✅ User is on paid tier:", tier);
        return;
      }

      const trialStart = userData.trialStartedAt?.toDate?.() || user.trialStartedAt?.toDate?.();

      if (!trialStart) {
        await setDoc(
          userRef,
          {
            trialStartedAt: serverTimestamp(),
            hasUsedSimulationTrial: true,
          },
          { merge: true }
        );
        setTrialExpired(false);
        setShowUpgradeModal(false);
        console.log("🎉 Trial started");
      } else {
        const trialEnd = new Date(trialStart);
        trialEnd.setDate(trialEnd.getDate() + 7);

        if (now > trialEnd) {
          setTrialExpired(true);
          setShowUpgradeModal(true);

          console.log("⏰ Trial expired");
        } else {
          setTrialExpired(false);
          setShowUpgradeModal(false);
          const msLeft = trialEnd - now;
          const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
          const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
          console.log(`✅ Trial still active: ${daysLeft}d ${hoursLeft}h ${minutesLeft}m left`);
        }
      }

      console.log("✅ Trial status checked for user:", user.uid);
    } catch (err) {
      console.error("❌ Error checking trial:", err);
    }
  };

  const handleScenarioSubmit = async (query, response, category) => {
    if (!user?.uid) {
      console.error("No user found");
      return;
    }

    try {
      // ✅ Create scenario entry with proper validation
      const scenarioEntry = {
        query: query || "Untitled Scenario",
        response: response || "",
        category: category || "Uncategorized",
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        // Metadata for better tracking
        metadata: {
          wordCount: query?.split(' ').filter(Boolean).length || 0,
          responseLength: (typeof response === 'object' ? (response.result?.length || 0) : (response?.length || 0)),
          hasCategory: !!category,
        },
        entryType: 'scenario',
      };

      // ✅ Save to userInteractions/{userId}/interactions subcollection
      const scenariosRef = collection(db, "userInteractions", user.uid, "interactions");
      const docRef = await addDoc(scenariosRef, scenarioEntry);
    
      console.log("✅ Scenario saved to userInteractions:", docRef.id);
    
      // Update local state with Firestore ID
      setChatHistory((prev) => [...prev, { ...scenarioEntry, id: docRef.id }]);
    
    } catch (error) {
      console.error("❌ Error saving scenario to userInteractions:", error);
      setError(`Failed to save scenario: ${error.message}`);
    }
  };

  // --- Updated: Handle Run Simulation with Gemini ---
// Fixed handleSimulate function
// Fixed handleSimulate function with better validation
// Replace the handleSimulate function in ScenarioInput.js with this fixed version:

const fetchClarificationsFor = async (scenarioText) => {
  setClarifyLoading(true);
  setClarifyError(null);

  try {
    const qs = await generateOmnisClarifications(scenarioText);
    setCurrentClarifications(qs);
    // Reset answers each time
    const initial = {};
    qs.forEach(q => { initial[q.id] = ""; });
    setCurrentAnswers(initial);
    setClarifyStep(0);
  } catch (e) {
    setClarifyError(e.message || "Failed to generate clarifying questions.");
    setCurrentClarifications([
      { id: "q1", question: "What outcome matters most to you here (success definition)?" },
      { id: "q2", question: "What is your main constraint right now (money/time/energy/authority)?" },
      { id: "q3", question: "What is your time horizon for this decision (days/weeks/months)?" },
    ]);
    setCurrentAnswers({ q1: "", q2: "", q3: "" });
    setClarifyStep(0);
  } finally {
    setClarifyLoading(false);
  }
};

const handleSimulate = async () => {
  if (!user) {
    setError("Please log in to run simulations.");
    return;
  }

  if (isFreeTier && trialExpired) {
    setShowUpgradeModal(true);
    return;
  }

  const filteredScenarios = scenarios.filter((s) => {
    if (!s || typeof s !== "object") return false;
    if (!s.text || typeof s.text !== "string") return false;
    if (s.text.trim() === "") return false;
    return true;
  });

  if (!filteredScenarios.length) {
    setError("Please provide at least one valid scenario with text content.");
    return;
  }

  // Begin pipeline: show clarifications first
  setError(null);
  setPendingScenarios(filteredScenarios);
  setCurrentScenarioIndex(0);
  pendingResultsRef.current = [];
  setPendingResults([]);

  // Generate clarifications for first scenario and open modal
  await fetchClarificationsFor(filteredScenarios[0].text.trim());
  setShowClarifyModal(true);
};

const runAnalysisForCurrentScenario = async () => {
  const scenario = pendingScenarios[currentScenarioIndex];
  if (!scenario) return;

  // basic answer validation (optional, light)
  const missing = currentClarifications.some(q => !(currentAnswers[q.id] || "").trim());
  if (missing) {
    setClarifyError("Please answer the clarifying questions (short answers are fine).");
    return;
  }

  // Turn on simulation loading now (this is the actual analysis call)
  updateSimulationLoading(true);
  setClarifyError(null);

  try {
    const scenarioText = scenario.text.trim();

    // Build clarifications array with answers
    const clarificationsWithAnswers = currentClarifications.map(q => ({
      ...q,
      answer: (currentAnswers[q.id] || "").trim()
    }));

    const generatedContent = await generateOmnisContent(scenarioText, clarificationsWithAnswers);

    await handleScenarioSubmit(
      scenarioText,
      { result: generatedContent, task: "AI Analysis", clarifications: clarificationsWithAnswers },
      scenario.category || "Uncategorized"
    );

    const resultObj = {
      query: scenarioText,
      category: scenario.category || "Uncategorized",
      response: {
        result: generatedContent,
        task: "AI Analysis",
        clarifications: clarificationsWithAnswers
      },
      timestamp: Date.now() + currentScenarioIndex,
    };

    pendingResultsRef.current = [...pendingResultsRef.current, resultObj];
    setPendingResults(pendingResultsRef.current);

    // Move to next scenario or finish
    const nextIndex = currentScenarioIndex + 1;

    if (nextIndex < pendingScenarios.length) {
      setCurrentScenarioIndex(nextIndex);
      await fetchClarificationsFor(pendingScenarios[nextIndex].text.trim());
      // keep modal open for next scenario
      return;
    }

    // Done — close clarify modal and show results
    const finalResults = pendingResultsRef.current;

    setShowClarifyModal(false);
    updateGeneratedResults(finalResults);
    updateSimulationInput(pendingScenarios.map(s => s.text.trim()).join("\n\n"));
    setIsModalOpen(true);
  } catch (e) {
    console.error("❌ Simulation error:", e);
    setClarifyError(e.message || "Analysis failed. Please try again.");
  } finally {
    updateSimulationLoading(false);
  }
};

  // Handle scenario changes (both text and category)
  const handleScenarioChange = (index, updatedScenario) => {
    const updated = [...scenarios];
    updated[index] = updatedScenario;
    setScenarios(updated);
  };

  const handleAddScenario = () => {
  if (isFreeTier && trialExpired) {
    setShowUpgradeModal(true);
    return;
  }
  setScenarios([...scenarios, { text: "", category: "" }]);
};
  const handleRemoveScenario = (index) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter((_, i) => i !== index));
    }
  };



  if (loading) {
    return (
      <div className="p-6">
        <ShimmerLoader height="h-32" width="w-full" rounded="rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full">
        {/* Left Panel - Scenario Input */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            {/* Header */}
            <div 
              className="flex justify-between items-center cursor-pointer md:cursor-default p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-300"
              onClick={() => {
                // Only allow collapsing/expanding on mobile
                if (window.innerWidth < 768) {
                  setIsOpen(prev => !prev);
                  setUserToggled(true); // user takes control on mobile
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scenario Builder</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create and simulate categorized scenarios</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    Ready
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Collapsible Content */}
<div className={`transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
              <div className="p-6 space-y-6">
                {/* Scenarios List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {scenarios.map((scenario, index) => (
                    <div key={index} className="group relative">
                      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-5 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
                        {/* Scenario Header */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                              {index + 1}
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              Scenario {index + 1}
                            </h4>
                            {scenario.category && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">
                                {scenario.category}
                              </span>
                            )}
                          </div>
                          
                          {scenarios.length > 1 && (
                            <button
                              onClick={() => handleRemoveScenario(index)}
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                              aria-label={`Remove scenario ${index + 1}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Input Form */}
                        <SimplifiedInputForm
                          scenario={scenario}
                          onScenarioChange={(updatedScenario) => handleScenarioChange(index, updatedScenario)}
                          onCategoryChange={(updatedScenario) => handleScenarioChange(index, updatedScenario)}
                          placeholder={`Describe scenario ${index + 1}... Be detailed for better analysis.`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Add Scenario Button */}
                <button
                  onClick={handleAddScenario}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Add New Scenario
                </button>
              </div>
            </div>

            {/* Clear Session Button */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  if (window.confirm("Clear all scenarios and results? This cannot be undone.")) {
                    clearScenarioSession();
                  }
                }}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                🗑️ Clear Session
              </button>
            </div>

            {/* Simulation Button */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button
                className={`
                  relative w-full rounded-xl py-4 px-6 font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl
                  ${isFreeTier && trialExpired
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white transform hover:scale-[1.02] active:scale-[0.98]'
                  }
                  ${simulationLoadingLocal ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                onClick={handleSimulate}
                disabled={simulationLoadingLocal}
              >
                {simulationLoadingLocal ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Analyzing Scenarios...</span>
                  </>
                ) : isFreeTier && trialExpired ? (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Unlock Advanced Simulations</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Run Simulation</span>
                  </>
                )}
                
                {/* Tier Badge */}
                {isPaidTier && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    {userTier.toUpperCase()}
                  </div>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

       
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full mx-4 relative shadow-2xl border border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ✕
            </button>
            
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Crown className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Unlock Advanced Simulations
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Upgrade to Pro or Enterprise to access unlimited simulations and advanced features.
              </p>
              
              <div className="space-y-4 mb-8 text-left">
                {['Unlimited simulations', 'Advanced analytics & insights', 'Priority support & faster processing', 'Custom scenario templates'].map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mr-3 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Maybe Later
                </button>
                <button 
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setShowUpgradeModalComponent(true);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UpgradeModal Component - Shows detailed pricing */}
      {showUpgradeModalComponent && <UpgradeModal />}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgb(156 163 175);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgb(107 114 128);
        }
      `}</style>

{showClarifyModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Clarify Your Situation
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Step {currentScenarioIndex + 1} of {pendingScenarios.length} • Answer briefly
            {pendingResultsRef.current.length > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                • Results so far: {pendingResultsRef.current.length}/{pendingScenarios.length}
              </span>
            )}
          </p>
          {!clarifyLoading && currentClarifications.length > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                  style={{
                    width: `${Math.round(((clarifyStep + 1) / currentClarifications.length) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {Math.round(((clarifyStep + 1) / currentClarifications.length) * 100)}% complete
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            const hasAnyAnswer = Object.values(currentAnswers || {}).some(v => (v || "").trim());
            if (!hasAnyAnswer) {
              setShowClarifyModal(false);
              return;
            }
            const ok = window.confirm("Close now? Your answers for this scenario will be lost.");
            if (ok) setShowClarifyModal(false);
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          Close
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {!clarifyLoading && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Scenario (preview)
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 line-clamp-3">
              {(pendingScenarios[currentScenarioIndex]?.text || "").trim()}
            </div>
          </div>
        )}
        {clarifyLoading ? (
          <div className="text-slate-600 dark:text-slate-300">
            Generating clarifying questions...
          </div>
        ) : (
          <>
            {clarifyError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
                {clarifyError}
              </div>
            )}

            {(() => {
              const activeQ = currentClarifications[clarifyStep];
              return !clarifyLoading && activeQ && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {activeQ.question}
                  </div>

                  <textarea
                    value={currentAnswers[activeQ.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (clarifyError) setClarifyError(null);
                      setCurrentAnswers((prev) => ({ ...prev, [activeQ.id]: val }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();

                        // if last question -> run analysis
                        if (clarifyStep >= currentClarifications.length - 1) {
                          runAnalysisForCurrentScenario();
                          return;
                        }

                        // otherwise try "Next"
                        const q = currentClarifications[clarifyStep];
                        const a = (currentAnswers[q?.id] || "").trim();
                        if (!a) {
                          setClarifyError("Please answer before continuing (short is fine).");
                          return;
                        }
                        setClarifyError(null);
                        setClarifyStep((s) => s + 1);
                      }
                    }}
                    className="w-full min-h-[90px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type a short answer..."
                  />

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Question {clarifyStep + 1} of {currentClarifications.length}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <button
          onClick={() => setClarifyStep((s) => Math.max(0, s - 1))}
          disabled={clarifyLoading || clarifyStep === 0}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          {currentClarifications.length === 0 ? (
            <button
              onClick={runAnalysisForCurrentScenario}
              disabled={clarifyLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60"
            >
              {currentScenarioIndex + 1 < pendingScenarios.length ? "Next Scenario" : "Run Simulation"}
            </button>
          ) : clarifyStep < currentClarifications.length - 1 ? (
            <button
              onClick={() => {
                const q = currentClarifications[clarifyStep];
                const a = (currentAnswers[q?.id] || "").trim();
                if (!a) {
                  setClarifyError("Please answer before continuing (short is fine).");
                  return;
                }
                setClarifyError(null);
                setClarifyStep((s) => s + 1);
              }}
              disabled={clarifyLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60"
            >
              {clarifyStep === 0 ? "Continue" : "Next"}
            </button>
          ) : (
            <button
              onClick={runAnalysisForCurrentScenario}
              disabled={clarifyLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60"
            >
              {currentScenarioIndex + 1 < pendingScenarios.length ? "Next Scenario" : "Run Simulation"}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}

    </>
  );
}