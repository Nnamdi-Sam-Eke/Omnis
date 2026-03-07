import React, { useState, useEffect , useRef } from "react";
import { FiThumbsUp, FiThumbsDown, FiHelpCircle, FiX, FiGitBranch, FiLock } from "react-icons/fi";
import { motion, AnimatePresence } from 'framer-motion';
// Simple Branching Visualization Component
import BranchingVisualization from "./BranchingVisualization";
import { generateOmnisContent, expandOmnisText } from "../services/omnis-actions";
import ShimmerLoader from "./ShimmerLoader";
import { Target } from "lucide-react";
import { doc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from '../AuthContext';

// ── Strip markdown syntax to plain readable text (for TTS) ──────────────
function stripMarkdownForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/^[-:| ]+$/gm, '')
    .replace(/---+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Currency detection & normalization ───────────────────────────────────
// Detects the currency the user intended from their query and fixes any
// wrong symbols the LLM may have substituted in the response.
function detectCurrency(queryText) {
  if (!queryText) return null;
  const q = queryText;
  // Explicit symbol matches first
  if (/₦/.test(q))                                         return { symbol: '₦', code: 'NGN', names: ['naira'] };
  if (/£/.test(q))                                         return { symbol: '£', code: 'GBP', names: ['pound', 'sterling'] };
  if (/€/.test(q))                                         return { symbol: '€', code: 'EUR', names: ['euro'] };
  if (/¥/.test(q))                                         return { symbol: '¥', code: 'JPY', names: ['yen', 'yuan'] };
  if (/R\s?\d|ZAR|rand/i.test(q))                         return { symbol: 'R',  code: 'ZAR', names: ['rand'] };
  if (/KSh|KES|shilling/i.test(q))                        return { symbol: 'KSh',code: 'KES', names: ['shilling'] };
  if (/GH₵|GHS|cedi/i.test(q))                            return { symbol: 'GH₵',code: 'GHS', names: ['cedi'] };
  if (/NGN|naira/i.test(q))                                return { symbol: '₦', code: 'NGN', names: ['naira'] };
  if (/GBP|pound/i.test(q))                                return { symbol: '£', code: 'GBP', names: ['pound'] };
  if (/EUR|euro/i.test(q))                                 return { symbol: '€', code: 'EUR', names: ['euro'] };
  if (/\$/.test(q) || /USD|dollar/i.test(q))               return { symbol: '$', code: 'USD', names: ['dollar'] };
  return null;
}

function normalizeCurrency(text, queryCurrency) {
  if (!text || !queryCurrency || typeof text !== 'string') return text;
  // If the response already uses the correct symbol, nothing to do
  if (text.includes(queryCurrency.symbol)) return text;
  // Only replace if the response is using a WRONG symbol ($ is the most common LLM fallback)
  const wrongSymbols = ['$', '£', '€', '¥'].filter(s => s !== queryCurrency.symbol);
  let result = text;
  for (const wrong of wrongSymbols) {
    // Replace symbol when followed by a number (e.g. $1,000 or $500k)
    const re = new RegExp(`\\${wrong}(?=\\s?\\d)`, 'g');
    result = result.replace(re, queryCurrency.symbol);
  }
  // Also replace written-out wrong currency names (e.g. "dollars" → "naira")
  if (queryCurrency.code !== 'USD') {
    result = result.replace(/USD/g, queryCurrency.code);
    result = result.replace(/dollars?/gi, queryCurrency.names[0]);
    result = result.replace(/US dollars?/gi, queryCurrency.names[0]);
  }
  return result;
}
// ─────────────────────────────────────────────────────────────────────────

// ── Inline markdown renderer (**bold**, *italic*) ─────────────────────────
const InlineText = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// ── Markdown table renderer ───────────────────────────────────────────────
const MarkdownTable = ({ lines }) => {
  const rows = lines.map(l => l.split('|').map(c => c.trim()).filter(Boolean));
  const header = rows[0] || [];
  const body = rows.slice(2); // skip separator row
  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-700">
            {header.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                <InlineText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const isTableRow = (line) => /^\|.+\|/.test(line.trim());
const isTableSep = (line) => /^\|[\s\-:|]+\|/.test(line.trim());

// ── Structured object renderer ────────────────────────────────────────────
const ObjectResponse = ({ obj, currentSentenceText = null }) => (
  <div className="space-y-4">
    {Object.entries(obj).map(([key, value]) => (
      <div key={key}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          {key.replace(/_/g, ' ')}
        </p>
        {typeof value === 'string'
          ? <FormattedResponse response={value} currentSentenceText={currentSentenceText} />
          : Array.isArray(value)
            ? <ul className="space-y-1 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                {value.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    {typeof item === 'object' && item !== null
                      ? <ObjectResponse obj={item} />
                      : String(item)}
                  </li>
                ))}
              </ul>
            : typeof value === 'object' && value !== null
              ? <ObjectResponse obj={value} />
              : <p className="text-sm text-slate-700 dark:text-slate-300">{String(value)}</p>
        }
      </div>
    ))}
  </div>
);

// ── Collapsible section wrapper ───────────────────────────────────────────
const CollapsibleSection = ({ title, icon, defaultOpen = true, accentClass = 'border-blue-400 dark:border-blue-600', children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`border-l-4 ${accentClass} pl-3 my-3 rounded-r-lg`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left group py-1"
      >
        {icon && <span className="text-base">{icon}</span>}
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex-1">{title}</span>
        <span className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 text-xs mr-1 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="mt-2 pb-2 space-y-2">{children}</div>}
    </div>
  );
};

// ── Parse text into ## sections ───────────────────────────────────────────
function parseSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = { heading: null, icon: null, lines: [] };

  const extractIcon = (h) => {
    const m = h.match(/^([\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|\u{1F4A1}|\u{1F4CA}|\u{1F3AF}|\u{26A1}|\u{1F511}|\u{1F4CC}|\u{1F50D}|[🔵🔴🟡🟢💡📊🧠🎯⚡🔑📌🔍🔮💎🛡️⚙️])+\s*/u);
    if (m) return { icon: m[0].trim(), rest: h.slice(m[0].length) };
    return { icon: null, rest: h };
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (current.lines.some(l => l.trim())) sections.push(current);
      const { icon, rest } = extractIcon(trimmed.slice(3));
      current = { heading: rest || trimmed.slice(3), icon, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some(l => l.trim())) sections.push(current);
  return sections;
}

// ── Main formatter ────────────────────────────────────────────────────────
const FormattedResponse = ({ response, sectioned = false, currentSentenceText = null }) => {
  if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
    return <ObjectResponse obj={response} />;
  }
  if (Array.isArray(response)) {
    return (
      <ul className="space-y-1 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
        {response.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
            {typeof item === 'object' && item !== null ? <ObjectResponse obj={item} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  const text = typeof response === 'string' ? response : String(response ?? '');
  if (!text.trim()) return null;

  // Sectioned mode: render ## headings as collapsible panels
  if (sectioned) {
    const sections = parseSections(text);
    const accentClasses = [
      'border-blue-400 dark:border-blue-600',
      'border-purple-400 dark:border-purple-600',
      'border-emerald-400 dark:border-emerald-600',
      'border-amber-400 dark:border-amber-600',
      'border-rose-400 dark:border-rose-600',
    ];
    return (
      <div className="space-y-1">
        {sections.map((section, si) =>
          section.heading ? (
            <CollapsibleSection
              key={si}
              title={section.heading}
              icon={section.icon}
              defaultOpen={si === 0}
              accentClass={accentClasses[si % accentClasses.length]}
            >
              <FormattedResponse response={section.lines.join('\n')} currentSentenceText={currentSentenceText} />
            </CollapsibleSection>
          ) : (
            <FormattedResponse key={si} response={section.lines.join('\n')} currentSentenceText={currentSentenceText} />
          )
        )}
      </div>
    );
  }

  // Standard line-by-line rendering
  // sentenceMatch: returns true if this line's clean text matches or contains the currently spoken sentence
  const sentenceMatch = (rawLine) => {
    if (!currentSentenceText) return false;
    const clean = rawLine.replace(/^#{1,6}\s+/, '').replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim().toLowerCase();
    const spoken = currentSentenceText.toLowerCase().trim();
    return clean.includes(spoken) || spoken.includes(clean.slice(0, Math.min(clean.length, 60)));
  };

  const hlClass = 'bg-yellow-200 dark:bg-yellow-800/60 rounded transition-colors duration-300';

  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Table detection
    if (isTableRow(line)) {
      const tableLines = [];
      while (i < lines.length && (isTableRow(lines[i].trim()) || isTableSep(lines[i].trim()))) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        elements.push(<MarkdownTable key={`tbl-${i}`} lines={tableLines} />);
      }
      continue;
    }

    if (line.startsWith('### ')) {
      const txt = line.slice(4);
      elements.push(<h4 key={i} className={`text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-1 first:mt-0 ${sentenceMatch(txt) ? hlClass : ''}`}><InlineText text={txt} /></h4>);
    } else if (line.startsWith('## ')) {
      const txt = line.slice(3);
      elements.push(<h3 key={i} className={`text-base font-bold text-slate-800 dark:text-slate-100 mt-4 mb-1 first:mt-0 ${sentenceMatch(txt) ? hlClass : ''}`}><InlineText text={txt} /></h3>);
    } else if (line.startsWith('# ')) {
      const txt = line.slice(2);
      elements.push(<h2 key={i} className={`text-lg font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2 first:mt-0 ${sentenceMatch(txt) ? hlClass : ''}`}><InlineText text={txt} /></h2>);
    } else if (/^[-*•]\s+/.test(line)) {
      const items = [];
      const rawItems = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        const raw = lines[i].trim();
        items.push(raw.replace(/^[-*•]\s+/, ''));
        rawItems.push(raw);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className={`flex gap-2 text-sm text-slate-700 dark:text-slate-300 rounded ${sentenceMatch(item) ? hlClass : ''}`}>
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 flex-shrink-0" />
              <InlineText text={item} />
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
        <ol key={`ol-${i}`} className="space-y-1.5 pl-5 list-decimal list-outside my-1">
          {items.map((item, idx) => (
            <li key={idx} className={`text-sm text-slate-700 dark:text-slate-300 pl-1 rounded ${sentenceMatch(item) ? hlClass : ''}`}><InlineText text={item} /></li>
          ))}
        </ol>
      );
      continue;
    } else if (/^---+$/.test(line)) {
      elements.push(<hr key={i} className="border-slate-200 dark:border-slate-700 my-3" />);
    } else {
      elements.push(<p key={i} className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed rounded px-0.5 ${sentenceMatch(line) ? hlClass : ''}`}><InlineText text={line} /></p>);
    }
    i++;
  }
  return <div className="space-y-2">{elements}</div>;
};
// ─────────────────────────────────────────────────────────────────────────


const ScenarioSimulationCard = ({ results,
            setResults,
            loading,
            simulationInput }) => {
  // Mock the useOmnisContext hook since it's not available
  const addFeedback = (timestamp, feedback) => {
    console.log(`Adding feedback: ${timestamp} - ${feedback}`);
  };
 const [toast, setToast] = useState({ title: "Notification", message: null });
  const [clickedButtons, setClickedButtons] = useState({});
  const [localResults, setLocalResults] = useState(results || []);

  // Track per-scenario variable edits and re-run loading states
  const [variableEditsById, setVariableEditsById] = useState({});
  const [rerunLoadingById, setRerunLoadingById] = useState({});

  // Ref to preserve original results for reset
  const originalResultsRef = useRef(null);
  const [rawResults, setRawResults] = useState({}); // Store raw results from /run
  const [narrativeCache, setNarrativeCache] = useState({}); // Cache narratives
  const [explanationModal, setExplanationModal] = useState({
    isOpen: false,
    content: '',
    loading: false,
    error: null,
    timestamp: null
  });

  // NEW: Branching modal state
  const [showBranchingModal, setShowBranchingModal] = useState(false);
  const [branchingData, setBranchingData] = useState(null);
  const [isBranchingLoading, setIsBranchingLoading] = useState(false);

  // Saved scenarios state
  const { user } = useAuth();
  const [savedScenarioIds, setSavedScenarioIds] = useState(new Set());

  // Text-to-speech state
  const [speechState, setSpeechState] = useState({
    isSpeaking: false,
    selectedVoice: null,
    speechRate: 1,
    availableVoices: [],
    currentSentenceIndex: -1,
    sentences: []
  });

  // Export and tagging state
  const [exportState, setExportState] = useState({
    showTagInput: false,
    customTags: '',
    suggestedTags: []
  });

  // Mobile modal state - Updated for better mobile handling
  const [modalState, setModalState] = useState({
    currentSection: 'content', // 'controls', 'content', 'export'
    isMobile: false,
    showFullscreenMode: false
  });

  // Capture original results once on first load
  useEffect(() => {
    if (!originalResultsRef.current && results?.length) {
      originalResultsRef.current = results;
    }
  }, [results]);

  // -- Plan gating: Free users get 3 trials for Save + Export --
  const tier = (user?.tier || "Free").toLowerCase();
  const isFreePlan = tier === "free";
  const PREMIUM_TRIAL_LIMIT = 3;

  const premiumTrialsKey = user?.uid ? `omnis_premium_trials_used_${user.uid}` : null;

  const getPremiumTrialsUsed = () => {
    if (!premiumTrialsKey) return 0;
    const raw = localStorage.getItem(premiumTrialsKey);
    const n = parseInt(raw || "0", 10);
    return Number.isFinite(n) ? n : 0;
  };

  const [premiumTrialsUsed, setPremiumTrialsUsed] = useState(getPremiumTrialsUsed());

  useEffect(() => {
    if (user?.uid) setPremiumTrialsUsed(getPremiumTrialsUsed());
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const premiumTrialsLeft = Math.max(0, PREMIUM_TRIAL_LIMIT - premiumTrialsUsed);
  const trialsExhausted = isFreePlan && premiumTrialsLeft === 0;

  // consumePremiumTrial(actionLabel)
  // Pro/Enterprise: always allow.
  // Free + trials remaining: consume 1 and allow.
  // Free + no trials left: show blocking toast.
  const consumePremiumTrial = (actionLabel = "this feature") => {
    if (!isFreePlan) return true;

    if (!user?.uid) {
      setToast({ title: "Login Required", message: `🔒 Please log in to use ${actionLabel}.` });
      return false;
    }

    const used = getPremiumTrialsUsed();
    if (used >= PREMIUM_TRIAL_LIMIT) {
      setToast({
        title: "Upgrade Required",
        message: `🔒 You’ve used all ${PREMIUM_TRIAL_LIMIT} free trials for Save/Export. Upgrade to continue.`,
      });
      return false;
    }

    const next = used + 1;
    localStorage.setItem(premiumTrialsKey, String(next));
    setPremiumTrialsUsed(next);

    if (next < PREMIUM_TRIAL_LIMIT) {
      setToast({
        title: "Trial Used",
        message: `✨ ${actionLabel} used a free trial (${next}/${PREMIUM_TRIAL_LIMIT} used).`,
      });
    } else {
      setToast({
        title: "Last Free Trial Used",
        message: `⚠️ That was your last free trial. Upgrade to keep saving and exporting.`,
      });
    }

    return true;
  };

  // Update a single variable edit for a given scenario timestamp
  function updateVariableEdit(timestamp, key, value) {
    setVariableEditsById(prev => ({
      ...prev,
      [timestamp]: {
        ...(prev[timestamp] || {}),
        [key]: value
      }
    }));
  }

  // Replace a single scenario's response in both local and parent state
  function replaceScenarioResult(timestamp, newResponse) {
    setLocalResults(prev =>
      prev.map((r, i) =>
        (r?.timestamp || i) === timestamp
          ? { ...r, response: newResponse }
          : r
      )
    );

    if (setResults) {
      setResults(prev =>
        (prev || []).map((r, i) =>
          (r?.timestamp || i) === timestamp
            ? { ...r, response: newResponse }
            : r
        )
      );
    }
  }

  // Re-run a scenario with any pending variable edits merged into the prompt
  async function handleRerunScenario(result, timestamp) {
    try {
      setRerunLoadingById(prev => ({ ...prev, [timestamp]: true }));

      const originalScenario = result?.query || "";
      const clarifications = result?.clarifications || result?.response?.clarifications || null;
      const edits = variableEditsById[timestamp] || {};

      let editedScenarioText = originalScenario;

      if (Object.keys(edits).length > 0) {
        const editBlock = Object.entries(edits)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n");
        editedScenarioText += `\n\nUpdated Variables:\n${editBlock}`;
      }

      const omnisResult = await generateOmnisContent(editedScenarioText, clarifications);

      // generateOmnisContent now returns { blueprint, simulation, summary, error }
      const newOutput = omnisResult?.summary ?? omnisResult;
      const blueprint = omnisResult?.blueprint ?? null;
      const simulation = omnisResult?.simulation ?? null;

      const currency = detectCurrency(result?.query || '');
      replaceScenarioResult(timestamp, {
        ...result.response,
        blueprint,
        simulation,
        result: currency ? normalizeCurrency(newOutput, currency) : newOutput
      });
    } catch (err) {
      console.error(err);
      setToast({
        title: "Re-run Failed",
        message: err.message || "Could not re-run scenario."
      });
    } finally {
      setRerunLoadingById(prev => ({ ...prev, [timestamp]: false }));
    }
  }

  // Reset a scenario back to its original response and clear any edits
  function handleResetScenario(timestamp) {
    if (!originalResultsRef.current) return;

    const original = originalResultsRef.current.find(
      (r, i) => (r?.timestamp || i) === timestamp
    );

    if (!original) return;

    setVariableEditsById(prev => {
      const copy = { ...prev };
      delete copy[timestamp];
      return copy;
    });

    replaceScenarioResult(timestamp, original.response);
  }

  const handleExportReportClick = () => {
    setToast({ title: "Coming Soon", message: "Branching paths under development, try again soon." });
    setTimeout(() => {
      setToast({ title: "Notification", message: null });
    }, 4000);
  };
  
  // ✅ Save scenario to user's savedScenarios collection
  const handleSaveScenario = async (result, timestamp) => {
    if (!user?.uid) {
      setToast({ title: "Login Required", message: "❌ Please log in to save scenarios" });
      return;
    }
    if (!consumePremiumTrial("Save scenario")) return;

    try {
      if (savedScenarioIds.has(timestamp)) {
        setToast({ title: "Already Saved", message: "ℹ️ Scenario already saved" });
        return;
      }

      const scenarioData = {
        query: result.query || "Untitled Scenario",
        category: result.category || "Uncategorized",
        response: result.response || {},
        originalTimestamp: timestamp,
        savedAt: serverTimestamp(),
        savedDate: new Date().toISOString(),
        metadata: {
          wordCount: result.query?.split(' ').length || 0,
          responseLength: result.response?.result?.length || 0,
          hasError: !!result.error,
        },
        originalScenarioId: timestamp.toString(),
        userId: user.uid,
      };

      const savedRef = collection(db, "userInteractions", user.uid, "savedScenarios");
      const docRef = await addDoc(savedRef, scenarioData);
      console.log("✅ Scenario saved to savedScenarios:", docRef.id);

      setSavedScenarioIds(prev => new Set([...prev, timestamp]));
      setToast({ title: "Success", message: "✅ Scenario saved successfully!" });
    } catch (error) {
      console.error("❌ Error saving scenario:", error);
      setToast({ title: "Save Failed", message: `❌ Failed to save: ${error.message}` });
    }
  };

  const handleUnsaveScenario = async (timestamp) => {
    if (!user?.uid) return;
    try {
      const savedRef = collection(db, "savedScenarios", user.uid, "saved");
      const q = query(savedRef, where("originalScenarioId", "==", timestamp.toString()));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      setSavedScenarioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(timestamp);
        return newSet;
      });

      setToast({ title: "Success", message: "✅ Scenario removed from saved" });
      console.log("✅ Scenario unsaved");
    } catch (error) {
      console.error("❌ Error unsaving scenario:", error);
      setToast({ title: "Unsave Failed", message: `❌ Failed to unsave: ${error.message}` });
    }
  };
  // NEW: Handle explore branches functionality
  const handleExploreBranches = async () => {
    try {
      setIsBranchingLoading(true);
      const response = await fetch("http://localhost:8000/branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenario: simulationInput,
          num_paths: 6,
        }),
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }
      
      const lines = fullText.split("data: ").filter(Boolean);
      const parsedResults = lines.map(line => JSON.parse(line.trim()));
      
      const toTree = (nodes, index = 0) => {
        const base = nodes[index];
        const children = nodes.slice(index + 1).map((n, i) => ({
          ...n,
          children: [],
          summary: n.label,
          recommended: n.recommended,
          anomaly: n.anomaly_flagged,
        }));
        return {
          summary: base.label,
          recommended: base.recommended,
          anomaly: base.anomaly_flagged,
          children,
        };
      };
      
      const rootNode = toTree(parsedResults);
      setBranchingData(rootNode);
      setShowBranchingModal(true);
    } catch (err) {
      console.error("Branching error:", err);
    } finally {
      setIsBranchingLoading(false);
    }
  };

   useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => {
        setToast({ title: "Notification", message: null });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.message]);

  // Load available voices and detect screen size
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      setSpeechState(prev => ({
        ...prev,
        availableVoices: englishVoices,
        selectedVoice: englishVoices.find(voice => voice.default) || englishVoices[0] || null
      }));
    };

    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768;
      setModalState(prev => ({ ...prev, isMobile }));
    };

    loadVoices();
    checkScreenSize();
    
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
    
    window.addEventListener('resize', checkScreenSize);

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Update local results when props change — normalize currency symbols
  useEffect(() => {
    if (results && Array.isArray(results)) {
      const normalized = results.map(r => {
        if (!r || !r.response?.result) return r;
        const currency = detectCurrency(r.query || '');
        return currency
          ? { ...r, response: { ...r.response, result: normalizeCurrency(r.response.result, currency) } }
          : r;
      });
      setLocalResults(normalized);
      const rawData = {};
      normalized.forEach((result, index) => {
        const timestamp = result?.timestamp || index;
        rawData[timestamp] = result;
      });
      setRawResults(rawData);
    } else {
      setLocalResults(results || []);
    }
  }, [results]);

  // Load saved scenario IDs on mount
  useEffect(() => {
    const loadSavedScenarios = async () => {
      if (!user?.uid) return;
      try {
        const savedRef = collection(db, "savedScenarios", user.uid, "saved");
        const snapshot = await getDocs(savedRef);
        const ids = new Set(snapshot.docs.map(d => d.data().originalScenarioId));
        setSavedScenarioIds(ids);
      } catch (error) {
        console.error("Error loading saved scenarios:", error);
      }
    };
    loadSavedScenarios();
  }, [user]);

  // Text-to-speech functions
  function splitIntoSentences(text) {
    // Strip markdown symbols but PRESERVE newline-based order (headings, bullets, etc.)
    const clean = stripMarkdownForSpeech(text);
    // Split each line individually, then split lines by sentence-ending punctuation
    // This preserves the logical reading order of structured content
    const sentences = [];
    const lines = clean.split(/\n+/).map(l => l.trim()).filter(l => l.length > 2);
    for (const line of lines) {
      // Split line at sentence boundaries (.!?;:) but keep the delimiter
      const parts = line.match(/[^.!?;:]+[.!?;:]+|[^.!?;:]+$/g) || [line];
      for (const part of parts) {
        const s = part.trim();
        if (s.length > 3) sentences.push(s);
      }
    }
    return sentences;
  }

  function generateSuggestedTags(content, result) {
    const tags = new Set();

    // ── Source material ───────────────────────────────────────────────────
    const query     = (result?.query || '').toLowerCase();
    const category  = (result?.category || '').toLowerCase();
    const lc        = (content || '').toLowerCase();
    const combined  = `${query} ${category} ${lc}`;

    // ── 1. Category tag (always) ──────────────────────────────────────────
    if (category && category !== 'uncategorized') {
      tags.add(`#${category.replace(/\s+/g, '-')}`);
    }

    // ── 2. Domain / topic detection ───────────────────────────────────────
    const domainRules = [
      { tag: '#career',         keywords: ['job','career','quit','resign','promotion','salary','employer','hire','employment','freelance','work','role','title'] },
      { tag: '#finance',        keywords: ['budget','revenue','mrr','arr','profit','loss','cash','savings','loan','debt','income','expense','fund','capital','investment','equity','valuation'] },
      { tag: '#startup',        keywords: ['startup','saas','product','launch','founder','seed','mvp','traction','growth hacking','scale','venture','pitch','b2b','b2c'] },
      { tag: '#business',       keywords: ['business','company','client','contract','deal','partnership','market','sales','pipeline','enterprise','b2b'] },
      { tag: '#real-estate',    keywords: ['property','rent','mortgage','lease','landlord','tenant','house','apartment','real estate','land'] },
      { tag: '#health',         keywords: ['health','medical','doctor','mental','therapy','wellness','fitness','hospital','insurance','coverage','diagnosis'] },
      { tag: '#relationships',  keywords: ['relationship','marriage','divorce','partner','family','spouse','breakup','dating','conflict','communication'] },
      { tag: '#immigration',    keywords: ['visa','immigration','permit','citizenship','migrate','relocation','abroad','country','border','status'] },
      { tag: '#education',      keywords: ['degree','school','university','study','course','gpa','tuition','scholarship','phd','masters','student'] },
      { tag: '#legal',          keywords: ['legal','lawsuit','contract','court','attorney','compliance','regulation','law','liability','clause','dispute'] },
      { tag: '#investment',     keywords: ['invest','portfolio','stock','crypto','return','yield','dividend','asset','market','trade','hedge'] },
      { tag: '#personal',       keywords: ['personal','life','goal','habit','mindset','productivity','self','decision','priority','balance'] },
      { tag: '#team',           keywords: ['team','employee','hire','culture','management','leadership','ceo','cto','cofounder','hr','staff'] },
      { tag: '#marketing',      keywords: ['marketing','brand','seo','ads','traffic','conversion','funnel','content','social media','campaign','audience'] },
      { tag: '#operations',     keywords: ['operations','process','logistics','supply chain','vendor','workflow','system','automation','efficiency'] },
    ];
    for (const { tag, keywords } of domainRules) {
      if (keywords.some(kw => combined.includes(kw))) tags.add(tag);
    }

    // ── 3. Scenario type ──────────────────────────────────────────────────
    const typeRules = [
      { tag: '#decision',       keywords: ['should i','decide','choice','option','choose','pick','go with'] },
      { tag: '#risk-analysis',  keywords: ['risk','threat','danger','downside','worst case','fragile','failure','loss'] },
      { tag: '#trade-off',      keywords: ['trade-off','trade off','pros and cons','versus','vs','compare','weigh'] },
      { tag: '#planning',       keywords: ['plan','roadmap','timeline','milestone','strategy','next steps','phase'] },
      { tag: '#forecasting',    keywords: ['forecast','predict','projection','model','estimate','expected','likely','scenario'] },
      { tag: '#stress-test',    keywords: ['stress test','what if','worst case','downside','fail','break','limit'] },
      { tag: '#negotiation',    keywords: ['negotiat','leverage','offer','counter','deal','terms','salary negotiat'] },
      { tag: '#exit-strategy',  keywords: ['exit','quit','leave','walk away','sell','acquire','wind down'] },
      { tag: '#optimization',   keywords: ['optim','maximiz','minimiz','efficien','improv','best','reduce cost'] },
      { tag: '#validation',     keywords: ['validate','confirm','verify','feasib','viable','proof','test'] },
    ];
    for (const { tag, keywords } of typeRules) {
      if (keywords.some(kw => combined.includes(kw))) tags.add(tag);
    }

    // ── 4. Outcome / confidence signals ──────────────────────────────────
    if (/high (risk|uncertainty|stakes)|volatile|unpredictable|very risky/.test(lc)) tags.add('#high-risk');
    if (/low risk|stable|safe bet|low uncertainty|minimal risk/.test(lc)) tags.add('#low-risk');
    if (/strongly recommend|clear choice|optimal|best option|definitive/.test(lc)) tags.add('#high-confidence');
    if (/uncertain|unclear|might|possibly|it depends|hard to say/.test(lc)) tags.add('#needs-clarity');
    if (/irreversible|permanent|no going back|cannot undo/.test(lc)) tags.add('#irreversible');
    if (/reversible|can undo|easy to change|flexible/.test(lc)) tags.add('#reversible');
    if (/urgent|time.sensitive|asap|immediately|deadline/.test(lc)) tags.add('#urgent');
    if (/long.term|multi.year|5 year|10 year|decade/.test(lc)) tags.add('#long-term');
    if (/short.term|quick win|30 day|90 day|immediate/.test(lc)) tags.add('#short-term');

    // ── 5. Financial magnitude ────────────────────────────────────────────
    const hasLargeFigure = /\$\d{6,}|[₦€£]\d{6,}|\d+[mb]|million|billion/i.test(combined);
    if (hasLargeFigure) tags.add('#high-stakes');

    // ── 6. Error state ────────────────────────────────────────────────────
    if (result?.error) { tags.add('#error'); tags.add('#needs-review'); }

    // ── 7. Cap and return (max 8 most relevant tags) ──────────────────────
    return [...tags].slice(0, 8);
  }

  function speakNarrative(text) {
    if (!window.speechSynthesis) {
      alert("Your browser doesn't support speech synthesis.");
      return;
    }

    window.speechSynthesis.cancel();

    const sentences = splitIntoSentences(text);
    // Store sentences so highlight overlay knows what index maps to what text
    setSpeechState(prev => ({ ...prev, sentences, currentSentenceIndex: 0, isSpeaking: true }));

    // Use a ref-like closure variable so onend always sees the current index
    let currentIndex = 0;
    // Keep a reference so stopNarration can cancel cleanly
    let cancelled = false;

    function speakSentence(index) {
      if (cancelled || index >= sentences.length) {
        if (!cancelled) setSpeechState(prev => ({ ...prev, isSpeaking: false, currentSentenceIndex: -1 }));
        return;
      }

      setSpeechState(prev => ({ ...prev, currentSentenceIndex: index }));

      const utterance = new SpeechSynthesisUtterance(sentences[index]);
      utterance.lang = "en-US";
      utterance.rate = speechState.speechRate;
      utterance.pitch = 1;
      if (speechState.selectedVoice) utterance.voice = speechState.selectedVoice;

      // Add a natural pause after headings / short declarative lines
      const endsWithPunct = /[.!?;:]$/.test(sentences[index].trim());
      utterance.onend = () => {
        currentIndex = index + 1;
        // Small pause between sentences for natural cadence
        if (endsWithPunct) {
          setTimeout(() => speakSentence(currentIndex), 180);
        } else {
          speakSentence(currentIndex);
        }
      };
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          setSpeechState(prev => ({ ...prev, isSpeaking: false, currentSentenceIndex: -1 }));
        }
      };

      window.speechSynthesis.speak(utterance);
    }

    speakSentence(0);
  }

  function stopNarration() {
    window.speechSynthesis.cancel();
    setSpeechState(prev => ({ ...prev, isSpeaking: false, currentSentenceIndex: -1 }));
  }

  function exportAsMarkdown(content, tags = [], result = null) {
    if (!consumePremiumTrial("Export report")) return;
    const timestamp = new Date().toISOString();
    const query = result?.query || 'Unknown Query';
    
    const markdown = `# Scenario Analysis Report

**Query:** ${query}
**Generated:** ${new Date().toLocaleString()}
**Tags:** ${tags.join(' ')}

---

## Detailed Explanation

${content}

---

## Raw Data
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`

---
*Generated by Scenario Simulation Tool*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-report-${timestamp.split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAsPDF(content, tags = [], result = null) {
    if (!consumePremiumTrial("Export report")) return;
    // Create a printable HTML version
    const timestamp = new Date().toISOString();
    const query = result?.query || 'Unknown Query';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Scenario Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .tags { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .tag { background: #007acc; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px; font-size: 0.9em; }
        .content { margin: 20px 0; }
        .raw-data { background: #f8f8f8; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 0.9em; }
        @media print {
            body { print-color-adjust: exact; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Scenario Analysis Report</h1>
        <p><strong>Query:</strong> ${query}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <div class="tags">
            <strong>Tags:</strong> ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    </div>
    
    <div class="content">
        <h2>Detailed Explanation</h2>
        <div>${content.replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="raw-data">
        <h3>Raw Data</h3>
        <pre>${JSON.stringify(result, null, 2)}</pre>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; color: #666; font-size: 0.9em;">
        <em>Generated by Scenario Simulation Tool</em>
    </div>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.print();
  }

  const handleReset = () => {
    // Simply clear the local results to hide the component content
    setLocalResults([]);
    if (setResults) {
      setResults([]);
    }
  };

/* --- Handle Explain (with cache + expandOmnisText) ---*/
const handleExplainFurther = async (result, timestamp) => {
  // Check cache first
  if (narrativeCache[timestamp]) {
    const tags = generateSuggestedTags(narrativeCache[timestamp], result);
    setExportState((prev) => ({ ...prev, suggestedTags: tags }));
    setExplanationModal({
      isOpen: true,
      content: narrativeCache[timestamp],
      loading: false,
      error: null,
      timestamp,
    });
    return;
  }

  setExplanationModal({
    isOpen: true,
    content: "",
    loading: true,
    error: null,
    timestamp,
  });

  try {
    // ✅ Pass blueprint + simulation so deep layer uses structured data, not just summary text
    const originalContent = result?.response?.result || '';
    const blueprint = result?.response?.blueprint ?? null;
    const simulation = result?.response?.simulation ?? null;
    const clarifications = result?.clarifications || result?.response?.clarifications || null;
    
    if (!originalContent) {
      throw new Error('No content available to expand');
    }
    
    const expanded = await expandOmnisText(originalContent, clarifications, blueprint, simulation);
    const tags = generateSuggestedTags(expanded, result);

    setExportState((prev) => ({ ...prev, suggestedTags: tags }));
    const expandCurrency = detectCurrency(result?.query || '');
    const normalizedExpanded = expandCurrency ? normalizeCurrency(expanded, expandCurrency) : expanded;
    setNarrativeCache((prev) => ({ ...prev, [timestamp]: normalizedExpanded }));
    setExplanationModal((prev) => ({
      ...prev,
      loading: false,
      content: normalizedExpanded,
      error: null,
    }));
  } catch (error) {
    console.error("Error fetching explanation:", error);
    setExplanationModal((prev) => ({
      ...prev,
      loading: false,
      error: `Failed to fetch explanation: ${error.message}`,
      content: "",
    }));
  }
};
  // --- Modal control functions ---

  const closeModal = () => {
    // Stop any ongoing speech when closing modal
    stopNarration();
    setExplanationModal({
      isOpen: false,
      content: '',
      loading: false,
      error: null,
      timestamp: null
    });
    setExportState({
      showTagInput: false,
      customTags: '',
      suggestedTags: []
    });
    setModalState(prev => ({ 
      ...prev, 
      currentSection: 'content',
      showFullscreenMode: false 
    }));
  };

  const navigateModalSection = (direction) => {
    const sections = ['controls', 'content', 'export'];
    const currentIndex = sections.indexOf(modalState.currentSection);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % sections.length;
    } else {
      newIndex = currentIndex === 0 ? sections.length - 1 : currentIndex - 1;
    }
    
    setModalState(prev => ({ ...prev, currentSection: sections[newIndex] }));
  };

  const toggleFullscreen = () => {
    setModalState(prev => ({ ...prev, showFullscreenMode: !prev.showFullscreenMode }));
  };

  // NEW: State for generated content and expanded content
  const [generatedContent, setGeneratedContent] = useState("");
  const [expandedContent, setExpandedContent] = useState("");

  // Determine if we have results
  const hasResults = Array.isArray(localResults) && localResults.length > 0;

  const handleFeedback = (timestamp, feedback) => {
    if (!timestamp) return;

    setClickedButtons((prev) => ({ ...prev, [timestamp]: feedback }));

    setTimeout(() => {
      setClickedButtons((prev) => {
        const copy = { ...prev };
        delete copy[timestamp];
        return copy;
      });
    }, 5000);

    addFeedback(timestamp, feedback);
  };

  // Render loading / empty / results states inside the main component

  return (
    <>
      {loading ? (
        <div className=" h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Processing Scenarios...</h3>
          </div>
          <div className="space-y-4">
            {[...Array(Math.max((localResults && localResults.length) || 1, 1))].map((_, i) => (
              <div key={i} className="space-y-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <ShimmerLoader height="h-4" width="w-2/3" rounded="rounded-md" />
                <ShimmerLoader height="h-3" width="w-full" rounded="rounded-md" />
                <ShimmerLoader height="h-3" width="w-5/6" rounded="rounded-md" />
                <ShimmerLoader height="h-6" width="w-3/4" rounded="rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ) : !hasResults ? (
        <div className="h-full md:min-h-[800px] bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center md:flex md:flex-col md:items-center md:justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mx-0">
            <Target className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Ready for Simulation</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Add your categorized scenarios and click "Run Simulation" to see results here</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 dark:border-slate-700 rounded-2xl p-8 border border-slate-200 text-slate-900 dark:text-white col-span-2 w-full transition-all duration-300 flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">⚡</span>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Scenario Output</h2>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleReset()} className="group relative flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95" aria-label="Remove scenario simulation results">
                <span className="text-xs sm:text-sm">🔄</span>
                <span className="whitespace-nowrap">Reset</span>
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800 space-y-4 pr-2 min-h-0">
            {/* Show generated content in output card */}
            {localResults.filter(Boolean).map((result, index) => {
              const timestamp = result?.timestamp || index;
              return (
                <div key={timestamp} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xl transition-all duration-300">

<div className="flex items-start justify-between mb-3 gap-3">
  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-1 min-w-0">
    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0"></div>
    <span className="truncate">{result?.query || "Unknown Query"}</span>
  </h4>
  {/* Always show category tag */}
  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 shadow-md">
    {result.category || "Uncategorized"} 
  </span>
</div>
                  {result?.error ? (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-500">❌</span>
                      <p className="text-red-600 dark:text-red-400 text-sm font-medium">{result.error}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {result?.response?.result
                        ? <FormattedResponse response={result.response.result} />
                        : <p className="text-sm text-slate-400 dark:text-slate-500 italic">⚠️ No response</p>}
                    </div>
                  )}

                  {/* Clarifications Section */}
                  {result?.response?.clarifications && result.response.clarifications.length > 0 && (
                    <div className="mt-4">
                      <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                          <span className="text-blue-500 group-open:rotate-90 transition-transform">▶</span>
                          Clarifications used ({result.response.clarifications.length})
                        </summary>
                        <div className="mt-2 space-y-2 pl-6">
                          {result.response.clarifications.map((clarification, idx) => (
                            <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border-l-2 border-blue-200 dark:border-blue-800">
                              <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {clarification.question}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                {clarification.answer || "No answer provided"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Editable Variables – collapsible like Clarifications */}
                  {!result?.error && (() => {
                    const vars = extractVariables(result?.query);
                    return (
                      <div className="mt-4">
                        <details className="group">
                          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                            <span className="text-blue-500 group-open:rotate-90 transition-transform">▶</span>
                            Editable Variables to Test {vars.length > 0 && `(${vars.length})`}
                          </summary>
                          <div className="mt-3 pl-6 space-y-3">
                            {/* Variable inputs — only shown when variables were extracted */}
                            {vars.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {vars.map(({ label, value }) => (
                                  <div key={label} className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                      {label}
                                    </label>
                                    <input
                                      type="text"
                                      defaultValue={value}
                                      onChange={(e) => updateVariableEdit(timestamp, label, e.target.value)}
                                      className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                No numeric variables detected. You can still re-run with the original scenario.
                              </p>
                            )}

                            {/* Re-run / Reset buttons — always visible */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              {(() => {
                                const hasEdits = !!Object.keys(variableEditsById[timestamp] || {}).length;
                                return (
                                  <button
                                    onClick={() => handleRerunScenario(result, timestamp)}
                                    disabled={!hasEdits || rerunLoadingById[timestamp]}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-violet-300 disabled:to-purple-300 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                                  >
                                {rerunLoadingById[timestamp] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Re-running...
                                  </>
                                ) : (
                                  <>
                                    <span>🔄</span>
                                    Re-run This Scenario
                                  </>
                                )}
                                  </button>
                                );
                              })()}
                              <button
                                onClick={() => handleResetScenario(timestamp)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <span>↩️</span>
                                Reset to Original
                              </button>
                            </div>
                          </div>
                        </details>
                      </div>
                    );
                  })()}

                  {/* Responsive Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-start gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button aria-label="Give positive feedback" className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleFeedback(timestamp, "positive")}>
                      <FiThumbsUp className="text-sm sm:text-lg" />
                      <span className="sm:hidden"></span>
                    </button>
                    
                    <button aria-label="Give negative feedback" className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleFeedback(timestamp, "negative")}>
                      <FiThumbsDown className="text-sm sm:text-lg" />
                      <span className="sm:hidden"></span>
                    </button>
                    
                    {/* Updated Explain Button with Better Copy */}
                    <button 
                      aria-label="View detailed analysis" 
                      className={`group relative flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex-1 sm:flex-none ${
                        narrativeCache[timestamp] 
                          ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white" 
                          : "bg-gradient-to-r from-blue-800 to-green-500 hover:from-blue-900 hover:to-green-600 text-white"
                      }`} 
                      onClick={() => handleExplainFurther(result, timestamp)}
                    >
                      <FiHelpCircle className="text-sm sm:text-lg flex-shrink-0" />
                      <span className="whitespace-nowrap truncate">
                        {narrativeCache[timestamp] ? "View Full Analysis" : "See Detailed Analysis"}
                      </span>
                      {!narrativeCache[timestamp] && (
                        <span className="hidden sm:inline-block ml-1 text-xs opacity-80">
                          • Why • Risks • Steps
                        </span>
                      )}
                      <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-300/20 to-orange-300/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    </button>
                    
                    {/* Save Button -- locked when Free trials exhausted */}
                    <button
                      aria-label={
                        trialsExhausted ? "Upgrade to save scenarios"
                        : savedScenarioIds.has(timestamp) ? "Scenario already saved"
                        : isFreePlan ? `Save scenario (${premiumTrialsLeft} free trial${premiumTrialsLeft !== 1 ? 's' : ''} left)`
                        : "Save scenario"
                      }
                      className={`group relative flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex-1 sm:flex-none ${
                        trialsExhausted
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer'
                          : savedScenarioIds.has(timestamp)
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white cursor-default'
                            : 'bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-400 hover:to-orange-600 text-white'
                      }`}
                      onClick={() => {
                        if (savedScenarioIds.has(timestamp)) {
                          handleUnsaveScenario(timestamp);
                        } else {
                          handleSaveScenario(result, timestamp);
                        }
                      }}
                    >
                      {trialsExhausted ? (
                        <>
                          <FiLock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap truncate">Save</span>
                        </>
                      ) : savedScenarioIds.has(timestamp) ? (
                        <>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          <span className="whitespace-nowrap truncate">Saved</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          <span className="whitespace-nowrap truncate">
                            {isFreePlan ? `Save (${premiumTrialsLeft} left)` : "Save"}
                          </span>
                        </>
                      )}
                      <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-300/20 to-orange-300/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    </button>

                    {/* Responsive Branch Button + Toast above it */}
                    <div className="relative flex flex-col items-center">
                      <AnimatePresence>
                        {toast.message && (
                          <motion.div key="toast" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.3, type: "spring", stiffness: 300 }} className="z-[1000]" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%) translateY(-25px)", marginBottom: "0.5rem" }}>
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl p-4 max-w-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">{toast.title}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{toast.message}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* <button onClick={handleExportReportClick} disabled={isBranchingLoading} className={`group relative flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-purple-300 disabled:to-indigo-300 text-white rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:cursor-not-allowed disabled:transform-none flex-1 sm:flex-none ${toast.message ? "branch-overlay-active" : ""}`} style={{ position: "relative", overflow: "hidden" }}>
                        <FiGitBranch className="text-sm sm:text-lg flex-shrink-0" />
                        <span className="whitespace-nowrap truncate">{isBranchingLoading ? 'Loading...' : 'Branch'}</span>
                        {!isBranchingLoading && (<div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />)}
                        {toast.message && (<span className="absolute inset-0 rounded-lg sm:rounded-xl bg-gray-900/60 dark:bg-gray-800/70 pointer-events-none flex items-center justify-center" style={{ zIndex: 2 }}><FiLock className="text-2xl text-white opacity-90 drop-shadow-lg" /></span>)}
                      </button> */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* UPDATED: Mobile-Responsive Branching Modal */}
      {showBranchingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-2 sm:p-4">
          <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-h-[95vh] overflow-hidden transition-all duration-300 ${
            modalState.isMobile 
              ? 'max-w-full mx-2' 
              : 'max-w-6xl mx-4'
          }`}>
            {/* Header with close button */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiGitBranch className="text-white text-sm sm:text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white truncate">
                      Branching Simulation
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                      Explore different decision paths and outcomes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBranchingModal(false)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <FiX size={modalState.isMobile ? 20 : 24} />
                </button>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 120px)' }}>
              <div className="p-4 sm:p-6">
                {branchingData ? (
                  <div className={`${modalState.isMobile ? 'min-h-[400px]' : 'h-[500px]'}`}>
                    <BranchingVisualization treeData={branchingData} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiGitBranch className="text-2xl text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">No branching data available.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPDATED: Mobile-Responsive Explanation Modal */}
    {explanationModal.isOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-1 sm:p-2">
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden relative transition-all duration-300 ${
      modalState.isMobile 
        ? `${modalState.showFullscreenMode ? 'w-full h-full' : 'w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh]'} mx-auto` 
        : 'w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh] mx-auto'
    }`}>"
            
            {/* Mobile Navigation Bar - Only show on mobile */}
            {modalState.isMobile && (
              <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-4 py-2">
                <div className="flex items-center justify-between">
                  {/* Section Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateModalSection('prev')}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                      aria-label="Previous section"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button
                    >
                    
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 px-2 py-1 bg-white dark:bg-slate-800 rounded-full border">
                      {modalState.currentSection === 'controls' && '🔊 Voice'}
                      {modalState.currentSection === 'content' && '💡 Content'}
                      {modalState.currentSection === 'export' && '🏷️ Export'}
                    </div>
                    
                    <button
                      onClick={() => navigateModalSection('next')}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                      aria-label="Next section"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Mobile Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      aria-label="Toggle fullscreen"
                    >
                      {modalState.showFullscreenMode ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6M21 3v18H3V3h18z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={closeModal}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Header */}
            {!modalState.isMobile && (
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <FiHelpCircle className="text-white text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Detailed Explanation
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <FiX className="text-xl text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            )}

            {/* Scrollable Content Container */}
            <div className={`overflow-y-auto ${
              modalState.isMobile 
                ? modalState.showFullscreenMode 
                  ? 'h-full' 
                  : 'max-h-[calc(95vh-120px)]'
                : 'max-h-[calc(90vh-120px)]'
            }`}>
              
              {/* Voice Controls Section - Always show on desktop, conditional on mobile */}
              <div className={`${
                modalState.isMobile && modalState.currentSection !== 'controls' ? 'hidden' : 'block'
              } ${!explanationModal.loading && !explanationModal.error && explanationModal.content ? 'block' : 'hidden'}`}>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Voice Controls
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={`w-2 h-2 rounded-full ${speechState.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {speechState.isSpeaking ? 'Speaking...' : 'Ready'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Voice:</label>
                        <select
                          value={speechState.selectedVoice?.name || ''}
                          onChange={(e) => {
                            const voice = speechState.availableVoices.find(v => v.name === e.target.value);
                            setSpeechState(prev => ({ ...prev, selectedVoice: voice }));
                          }}
                          className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {speechState.availableVoices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name.split(' ')[0]} ({voice.gender || 'Unknown'})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Speed:</label>
                        <select
                          value={speechState.speechRate}
                          onChange={(e) => setSpeechState(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))}
                          className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          <option value={0.5}>🐢 Slow</option>
                          <option value={1}>🚶 Normal</option>
                          <option value={1.5}>🏃 Fast</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                      <button
                        onClick={() => speakNarrative(explanationModal.content)}
                        disabled={speechState.isSpeaking}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg text-sm sm:text-base"
                      >
                        <span className="text-lg">🔊</span>
                        {speechState.isSpeaking ? 'Speaking...' : 'Listen'}
                      </button>
                      
                      {speechState.isSpeaking && (
                        <button
                          onClick={stopNarration}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg text-sm sm:text-base"
                        >
                          <span className="text-lg">⏹</span>
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Section - Always show on desktop, conditional on mobile */}
              <div className={`${
                modalState.isMobile && modalState.currentSection !== 'content' ? 'hidden' : 'block'
              }`}>
                <div className="p-4 sm:p-6">
                  {explanationModal.loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-4 border-blue-200"></div>
                        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-blue-500 absolute top-0 left-0"></div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-6 text-base sm:text-lg font-medium">Thinking...</p>
                      <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Generating detailed explanation</p>
                    </div>
                  ) : explanationModal.error ? (
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-500 text-xl flex-shrink-0">❌</span>
                      <div className="min-w-0">
                        <p className="font-medium text-red-800 dark:text-red-200">Error</p>
                        <p className="text-red-600 dark:text-red-400 text-sm break-words">{explanationModal.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Cache indicator */}
                      {narrativeCache[explanationModal.timestamp] && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Cached explanation</span>
                        </div>
                      )}
                      
                      {/* Main Narrative Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-white text-xs sm:text-sm">💡</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 text-base sm:text-lg">
                              Detailed Explanation
                            </h4>
                            <div className="space-y-2">
                              <FormattedResponse
                                response={explanationModal.content}
                                sectioned={true}
                                currentSentenceText={
                                  speechState.isSpeaking && speechState.currentSentenceIndex >= 0
                                    ? speechState.sentences[speechState.currentSentenceIndex]
                                    : null
                                }
                              />
                            </div>
                          </div>
                        </div>
                        {/* Divider */}
                        <div className="my-6 border-t border-blue-200 dark:border-blue-800"></div>
                        {/* Next Step Suggestion */}
                        <div className="flex items-center gap-2 mt-4">
                          <span className="text-green-500 text-lg">➡️</span>
                          <span className="font-semibold text-green-700 dark:text-green-300">Next Step:</span>
                          <span className="text-green-700 dark:text-green-300">
                            {getNextStepSuggestion(explanationModal.content)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Section - Always show on desktop, conditional on mobile */}
              <div className={`${
                modalState.isMobile && modalState.currentSection !== 'export' ? 'hidden' : 'block'
              }`}>
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs sm:text-sm">🏷️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 text-base sm:text-lg">
                        Save & Export
                      </h4>
                      
                      {/* Suggested Tags */}
                      {exportState.suggestedTags.length > 0 && (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Smart Tags</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">— click to add to export</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {exportState.suggestedTags.map((tag, index) => {
                              // Color-code by tag type
                              const isAdded = exportState.customTags.includes(tag);
                              const colorMap = {
                                domain:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
                                type:      'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
                                outcome:   'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
                                risk:      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
                                time:      'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
                                category:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
                              };
                              const domainTags = ['#career','#finance','#startup','#business','#real-estate','#health','#relationships','#immigration','#education','#legal','#investment','#personal','#team','#marketing','#operations'];
                              const typeTags   = ['#decision','#risk-analysis','#trade-off','#planning','#forecasting','#stress-test','#negotiation','#exit-strategy','#optimization','#validation'];
                              const riskTags   = ['#high-risk','#low-risk','#high-stakes','#error','#needs-review','#irreversible'];
                              const timeTags   = ['#urgent','#long-term','#short-term'];
                              const outcomeTags= ['#high-confidence','#needs-clarity','#reversible'];
                              const getColor = (t) => {
                                if (riskTags.includes(t)) return colorMap.risk;
                                if (timeTags.includes(t)) return colorMap.time;
                                if (outcomeTags.includes(t)) return colorMap.outcome;
                                if (typeTags.includes(t)) return colorMap.type;
                                if (domainTags.includes(t)) return colorMap.domain;
                                return colorMap.category;
                              };
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    if (!isAdded) {
                                      const currentTags = exportState.customTags.split(',').map(t => t.trim()).filter(t => t);
                                      setExportState(prev => ({
                                        ...prev,
                                        customTags: currentTags.length > 0 ? `${prev.customTags}, ${tag}` : tag
                                      }));
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${getColor(tag)} ${isAdded ? 'opacity-50 cursor-default' : 'hover:opacity-80 cursor-pointer'}`}
                                  title={isAdded ? 'Already added' : 'Click to add'}
                                >
                                  {tag}
                                  {isAdded && <span className="ml-1 opacity-60">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Tags Input — always visible, clean */}
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">Custom Tags</label>
                        <input
                          type="text"
                          placeholder="#my-tag, #follow-up, #Q2-review"
                          value={exportState.customTags}
                          onChange={(e) => setExportState(prev => ({ ...prev, customTags: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                        />
                        {exportState.customTags && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {exportState.customTags.split(',').map(t => t.trim()).filter(t => t).map((t, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs border border-slate-200 dark:border-slate-600">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Export Buttons -- locked + counter when Free */}
                      {trialsExhausted && (
                        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                          <FiLock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            All {PREMIUM_TRIAL_LIMIT} free trials used. Upgrade to export.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            const tags = exportState.customTags.split(',').map(t => t.trim()).filter(t => t);
                            const result = rawResults[explanationModal.timestamp];
                            exportAsMarkdown(explanationModal.content, tags, result);
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg text-sm ${
                            trialsExhausted
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600'
                              : 'bg-slate-600 hover:bg-slate-700 text-white'
                          }`}
                        >
                          {trialsExhausted ? <FiLock className="w-4 h-4" /> : '📄'}
                          <span>
                            {isFreePlan && !trialsExhausted ? `Export Markdown (${premiumTrialsLeft} left)` : 'Export Markdown'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const tags = exportState.customTags.split(',').map(t => t.trim()).filter(t => t);
                            const result = rawResults[explanationModal.timestamp];
                            exportAsPDF(explanationModal.content, tags, result);
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg text-sm ${
                            trialsExhausted
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {trialsExhausted ? <FiLock className="w-4 h-4" /> : '📋'}
                          <span>
                            {isFreePlan && !trialsExhausted ? `Export PDF (${premiumTrialsLeft} left)` : 'Export PDF'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Footer - Only show on desktop */}
              {!modalState.isMobile && (
                <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {narrativeCache[explanationModal.timestamp] ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Retrieved from cache
                        </span>
                      ) : (
                        <span>Generated fresh explanation</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!explanationModal.loading && !explanationModal.error && explanationModal.content && (
                        <>
                          <button
                            onClick={() => speakNarrative(explanationModal.content)}
                            disabled={speechState.isSpeaking}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            🔊 Listen
                          </button>
                          
                          {speechState.isSpeaking && (
                            <button
                              onClick={stopNarration}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                              ⏹ Stop
                            </button>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={closeModal}
                        className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Footer - Only show on mobile */}
            {modalState.isMobile && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {narrativeCache[explanationModal.timestamp] ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="hidden sm:inline">Cached</span>
                        <span className="sm:hidden">💾</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <span className="hidden sm:inline">Fresh</span>
                        <span className="sm:hidden">✨</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!explanationModal.loading && !explanationModal.error && explanationModal.content && (
                      <>
                        <button
                          onClick={() => speakNarrative(explanationModal.content)}
                          disabled={speechState.isSpeaking}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-colors text-xs flex items-center gap-1"
                        >
                          <span>🔊</span>
                          <span className="hidden xs:inline">{speechState.isSpeaking ? 'Speaking' : 'Listen'}</span>
                        </button>
                        
                        {speechState.isSpeaking && (
                          <button
                            onClick={stopNarration}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-xs flex items-center gap-1"
                          >
                            <span>⏹</span>
                            <span className="hidden xs:inline">Stop</span>
                          </button>
                        )}
                      </>
                    )}
                    
                    <button
                      onClick={closeModal}
                      className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-xs"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

     {/* Modern Toast Notification */}
      <AnimatePresence>
        {toast.message && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
            className="fixed top-6 left-6 z-[1000]"
          >
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl p-4 max-w-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{toast.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{toast.message}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Helper function to format narrative content with sentence highlighting
function formatNarrative(content, currentSentenceIndex = -1, sentences = []) {
  if (!content) return '';
  
  // If we have sentences for highlighting, use them
  if (sentences.length > 0 && currentSentenceIndex >= 0) {
    return (
      <div className="space-y-2">
        {sentences.map((sentence, index) => (
          <span
            key={index}
            className={`inline-block transition-all duration-300 ${
              index === currentSentenceIndex
                ? 'bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded shadow-lg transform scale-105'
                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1 py-0.5 rounded'
            }`}
          >
            {sentence}{index < sentences.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    );
  }
  
  // Default formatting without highlighting
  return content
    .split('\n\n')
    .map((paragraph, index) => (
      <div key={index} className="mb-4 last:mb-0">
        {paragraph.split('\n').map((line, lineIndex) => {
          // Handle bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <div key={lineIndex} className="flex items-start gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span className="break-words">{line.trim().substring(2)}</span>
              </div>
            );
          }
          
          // Handle numbered lists
          const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)$/);
          if (numberedMatch) {
            return (
              <div key={lineIndex} className="flex items-start gap-2 mb-1">
                <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {numberedMatch[1]}
                </span>
                <span className="break-words">{numberedMatch[2]}</span>
              </div>
            );
          }
          
          // Handle bold text (simple **text** format)
          let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          
          return (
            <div key={lineIndex} className="mb-1 break-words" dangerouslySetInnerHTML={{ __html: formattedLine }} />
          );
        })}
      </div>
    ));
}



// Extract key variables from a scenario query string
function extractVariables(query) {
  if (!query) return [];
  const found = [];
  const seen = new Set();

  const add = (label, value) => {
    if (!seen.has(label)) {
      seen.add(label);
      found.push({ label, value });
    }
  };

  // Currency amounts — e.g. "500k NGN", "$10,000", "₦2M", "200 USD"
  const currencyRe = /([₦$£€]?\s?\d[\d,]*(?:\.\d+)?(?:\s?[kmb])?(?:\s?(?:NGN|USD|GBP|EUR|naira|dollars?))?(?:\s?(?:NGN|USD|GBP|EUR))?)/gi;
  const currencyMatches = [...query.matchAll(currencyRe)];
  currencyMatches.forEach(m => {
    // Find context word before match (up to 4 words back)
    const before = query.slice(0, m.index).trim().split(/\s+/).slice(-4).join(' ');
    const contextWords = ['budget', 'revenue', 'investment', 'salary', 'cost', 'price', 'profit', 'loan', 'capital', 'spend', 'pay', 'fee', 'income', 'fund'];
    const ctxWord = contextWords.find(w => before.toLowerCase().includes(w));
    const label = ctxWord
      ? ctxWord.charAt(0).toUpperCase() + ctxWord.slice(1)
      : 'Amount';
    add(label, m[0].trim());
  });

  // Time / duration — e.g. "6 months", "2 years", "3 weeks", "Q3"
  const timeRe = /\b(\d+\s?(?:days?|weeks?|months?|years?|hrs?|hours?))\b/gi;
  const timeMatches = [...query.matchAll(timeRe)];
  timeMatches.forEach(m => {
    const before = query.slice(0, m.index).trim().split(/\s+/).slice(-3).join(' ').toLowerCase();
    const label = before.includes('target') || before.includes('goal') ? 'Target Timeline'
      : before.includes('break') ? 'Break-even Period'
      : 'Timeline';
    add(label, m[0].trim());
  });

  // Percentages — e.g. "20%", "15 percent"
  const pctRe = /\b(\d+(?:\.\d+)?(?:\s?%|\s?percent))\b/gi;
  const pctMatches = [...query.matchAll(pctRe)];
  pctMatches.forEach(m => {
    const before = query.slice(0, m.index).trim().split(/\s+/).slice(-4).join(' ').toLowerCase();
    const label = before.includes('growth') ? 'Growth Rate'
      : before.includes('margin') ? 'Profit Margin'
      : before.includes('interest') ? 'Interest Rate'
      : before.includes('tax') ? 'Tax Rate'
      : before.includes('discount') ? 'Discount Rate'
      : 'Percentage';
    add(label, m[0].trim());
  });

  // Staff / headcount — e.g. "5 staff", "10 employees", "3 workers"
  const staffRe = /\b(\d+\s?(?:staff|employees?|workers?|people|persons?|team members?|hires?))\b/gi;
  const staffMatches = [...query.matchAll(staffRe)];
  staffMatches.forEach(m => add('Staffing', m[0].trim()));

  // Locations / cities named after "in", "to", "at" (simple extraction)
  const locationRe = /\b(?:in|to|at|expand(?:ing)? to|open(?:ing)? in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const locMatches = [...query.matchAll(locationRe)];
  locMatches.forEach(m => add('Location', m[1].trim()));

  // Quantities / units — e.g. "200 units", "50 products"
  const qtyRe = /\b(\d+\s?(?:units?|products?|items?|orders?|pieces?|SKUs?))\b/gi;
  const qtyMatches = [...query.matchAll(qtyRe)];
  qtyMatches.forEach(m => add('Quantity', m[0].trim()));

  return found.slice(0, 6); // cap at 6 variables
}

function getNextStepSuggestion(content) {
  // Simple rule-based suggestion
  if (!content) return "Review the above explanation and consider running a branching simulation.";
  const lc = content.toLowerCase();
  if (lc.includes("risk")) return "Consider running a risk analysis branch.";
  if (lc.includes("recommend")) return "Apply the recommendations or simulate alternative scenarios.";
  if (lc.includes("anomaly")) return "Investigate anomalies further or consult with your team.";
  if (lc.includes("predict")) return "Use the prediction to inform your next business decision.";
  if (lc.includes("cost")) return "Review cost-saving measures and optimize your strategy.";
  return "Review the above explanation and consider running a branching simulation.";
}

export default ScenarioSimulationCard;