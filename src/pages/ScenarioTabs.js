import React, { lazy, Suspense, useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SavedScenarioViewer from "../components/SavedScenarioViewer";

const ScenarioInput = lazy(() => import("../components/ScenarioInput"));
const SimulationResult = lazy(() => import("../components/SimulationResult"));

const ScenarioTabs = () => {
  const DEFAULT_LEFT = 40; // default left pane width (%)
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingLeft, setDraggingLeft] = useState(false);
  const [leftBlurActive, setLeftBlurActive] = useState(false);
  const containerRef = useRef(null);
  const lastClientXRef = useRef(null);
  const location = useLocation();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSavedScenario, setCurrentSavedScenario] = useState(null);

  // Simulation state
  const [simulationResults, setSimulationResults] = useState([]);
  const [simulationInput, setSimulationInput] = useState("");
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Handle divider drag
  const handleMouseDown = (e) => {
    e.preventDefault();
    lastClientXRef.current = e.clientX;
    setDraggingLeft(false);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

    if (lastClientXRef.current != null) {
      const draggingNowLeft = e.clientX < lastClientXRef.current;
      if (draggingNowLeft !== draggingLeft) setDraggingLeft(draggingNowLeft);

      // persist blur when dragging left
      setLeftBlurActive(draggingNowLeft);
    }
    lastClientXRef.current = e.clientX;

    if (newLeftWidth >= 25 && newLeftWidth <= 75) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingLeft(false);
    lastClientXRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  // Open sidebar if navigation contains a scenario
  useEffect(() => {
    if (location.state?.scenario) {
      setCurrentSavedScenario(location.state.scenario);
      setSidebarOpen(true);
    }
  }, [location.state]);

  const handleEdit = (updatedScenario) => {
    console.log("Editing scenario:", updatedScenario);
    
    const parts = [];
    
    if (updatedScenario?.category) {
      parts.push(`📁 Category: ${updatedScenario.category}`);
    }
    
    if (updatedScenario?.query) {
      parts.push(`📝 Scenario:\n${updatedScenario.query}`);
    }
    
    if (updatedScenario?.variables && Object.keys(updatedScenario.variables).length > 0) {
      const varsText = Object.entries(updatedScenario.variables)
        .map(([key, value]) => `  • ${key}: ${value}`)
        .join('\n');
      parts.push(`⚙️ Variables:\n${varsText}`);
    }
    
    const inputText = parts.join('\n\n');
    setSimulationInput(inputText);
    setSidebarOpen(false);
  };

  const handleReRun = (updatedVariables) => {
    console.log("Re-running scenario with variables:", updatedVariables);
    
    const parts = [];
    
    if (currentSavedScenario?.category) {
      parts.push(`📁 Category: ${currentSavedScenario.category}`);
    }
    
    if (currentSavedScenario?.query) {
      parts.push(`📝 Scenario:\n${currentSavedScenario.query}`);
    }
    
    if (updatedVariables && Object.keys(updatedVariables).length > 0) {
      const varsText = Object.entries(updatedVariables)
        .map(([key, value]) => `  • ${key}: ${value}`)
        .join('\n');
      parts.push(`⚙️ Variables:\n${varsText}`);
    }
    
    const inputText = parts.join('\n\n');
    setSimulationInput(inputText);
    setSimulationLoading(true);
    setSidebarOpen(false);
    
    setTimeout(() => {
      setSimulationLoading(false);
    }, 2000);
  };

  const leftBlur = leftBlurActive;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">

      {/* =======================
          MOBILE (< md) - FIXED VERSION
          ======================= */}
      <div className="md:hidden flex flex-col p-3 sm:p-4 pb-20 h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-4 mb-2">
              Creation Playground
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          </div>

          <Suspense fallback={<MobileLoader />}>
            {/* Vertical Stack - Components push each other naturally */}
            <div className="flex flex-col gap-6">
              
              {/* Scenario Input */}
              <div className="w-full">
                <ScenarioInput
                  setGeneratedResults={setSimulationResults}
                  setSimulationInput={setSimulationInput}
                  setSimulationLoading={setSimulationLoading}
                />
              </div>

              {/* Simulation Result */}
              <div className="w-full pb-20">
                <SimulationResult
                  results={simulationResults}
                  setResults={setSimulationResults}
                  loading={simulationLoading}
                  simulationInput={simulationInput}
                />
              </div>

            </div>
          </Suspense>
        </div>
      </div>

      {/* =======================
          DESKTOP (≥ md) - No changes needed
          ======================= */}
      <div className="hidden md:flex md:flex-col md:flex-1 min-h-0">

        {/* Header */}
        <div className="border-b border-white/10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-4 flex-shrink-0">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Creation Playground
              </h1>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Online</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<DesktopLoader />}>
          <div
            ref={containerRef}
            className="flex flex-1 overflow-hidden min-h-0"
          >

            {/* LEFT – Scenario Input */}
            <aside
              style={{ width: `${leftWidth}%` }}
              className={`overflow-y-auto bg-slate-900/90 border-r border-white/5 flex-shrink-0 min-h-0 transition-filter duration-150 ${leftBlur ? 'blur-[2px]' : ''}`}
            >
              <ScenarioInput
                setGeneratedResults={setSimulationResults}
                setSimulationInput={setSimulationInput}
                setSimulationLoading={setSimulationLoading}
              />
            </aside>

            {/* DIVIDER */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-px md:w-1 bg-gradient-to-b from-transparent via-violet-500/85 to-transparent
                         shadow-[0_0_16px_rgba(139,92,246,0.45)] ring-0 md:ring md:ring-violet-500/20 cursor-col-resize
                         hover:w-2 md:hover:w-2 hover:bg-violet-400/90 transition-all relative group flex-shrink-0
                         ${isDragging ? "w-2 md:w-2 bg-violet-400/90" : ""}`}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="flex flex-col gap-1 bg-slate-800/90 rounded px-1 py-2 shadow-lg">
                  <div className="w-0.5 h-3 bg-violet-400 rounded-full" />
                  <div className="w-0.5 h-3 bg-violet-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* RIGHT – Results */}
            <main
              style={{ width: `${100 - leftWidth}%` }}
              className="flex-1 h-[810px] bg-white overflow-y-auto bg-slate-950/95 dark:bg-gray-900/95"
            >
              <SimulationResult
                results={simulationResults}
                setResults={setSimulationResults}
                loading={simulationLoading}
                simulationInput={simulationInput}
              />
            </main>

          </div>
        </Suspense>
      </div>

      {/* =======================
          Adaptive Saved Scenario Viewer
          ======================= */}
      {sidebarOpen && currentSavedScenario && (
        <SavedScenarioViewer
          scenario={currentSavedScenario}
          onClose={() => setSidebarOpen(false)}
          onReRun={handleReRun}
          onEdit={handleEdit}
        />
      )}

    </div>
  );
};

/* --------------------
   Loaders
-------------------- */
const MobileLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500" />
  </div>
);

const DesktopLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500" />
  </div>
);

export default ScenarioTabs;