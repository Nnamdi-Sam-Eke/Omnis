import React, { useState, useEffect, Suspense, forwardRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Line } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Generate dynamic data based on current date with consistent daily values
const generateDynamicData = (days = 30) => {
  const labels = [];
  const accuracy = [];
  const today = new Date();
  
  // Function to create a consistent "random" value for a given date
  const getConsistentValue = (dateString) => {
    // Use the date string as a seed for consistent randomness
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert hash to a number between 0 and 1
    return Math.abs(Math.sin(hash));
  };
  
  // Start from 30 days ago
  let baseAccuracy = 65; // Starting accuracy
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Format date as "MM/DD/YY"
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const dateLabel = `${month}/${day}/${year}`;
    labels.push(dateLabel);
    
    // Generate accuracy with upward trend + consistent randomness for each date
    // Gradual improvement from 65% to ~90% with some variation
    const trend = baseAccuracy + ((days - i) / days) * 20; // Increases over time
    const consistentRandom = getConsistentValue(dateLabel); // Same value for same date
    const randomVariation = (consistentRandom - 0.5) * 8; // ±4% variation but consistent per date
    const value = Math.min(95, Math.max(65, trend + randomVariation));
    accuracy.push(Math.round(value * 10) / 10); // Round to 1 decimal
  }
  
  return { labels, accuracy };
};

const ScenarioAccuracyChart = forwardRef((props,ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState(7);
  const [dynamicData, setDynamicData] = useState(() => generateDynamicData(30));

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // No need to regenerate - date-based seeding ensures consistent values
      const t = setTimeout(() => {
        setIsLoading(false);
      
      }, 500); // Keep it responsive
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const labels = range === "all" ? dynamicData.labels : dynamicData.labels.slice(-range);
  const dataPoints = range === "all" ? dynamicData.accuracy : dynamicData.accuracy.slice(-range);

  const data = {
    labels,
    datasets: [
      {
        label: "Scenario Accuracy (%)",
        data: dataPoints,
        fill: true,
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        borderColor: "#8b5cf6",
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 3,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, right: 30, bottom: 20, left: 10 },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#4b5563",
          font: { size: 14, weight: 'bold' },
          padding: 25,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(30, 27, 75, 0.95)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "#8b5cf6",
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 14,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#64748b",
          autoSkip: false,
          font: { size: 12, weight: '500' },
          padding: 8,
        },
        title: {
          display: true,
          text: "Date",
          color: "#7c3aed",
          font: { weight: "bold", size: 14 },
          padding: { top: 15 },
        },
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
          drawBorder: false,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#64748b",
          font: { size: 12, weight: '500' },
          padding: 8,
          stepSize: 10,
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Accuracy (%)",
          color: "#7c3aed",
          font: { weight: "bold", size: 14 },
          padding: { bottom: 15 },
        },
        grid: {
          color: "rgba(148, 163, 184, 0.2)",
          drawBorder: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverBackgroundColor: "#6d28d9",
        hoverBorderColor: "#ffffff",
        hoverBorderWidth: 3,
      },
    },
  };

  const pointWidth = 60;
  const minWidth = labels.length * pointWidth;

  return (
    <div
      ref={ref}
      className="w-full mt-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900/20 hover:shadow-purple-500/25 transition-all duration-500 ease-out px-8 py-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-2xl hover:shadow-purple-500/30 backdrop-blur-sm"
    >
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between cursor-pointer mb-6 group"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <span className="text-white text-lg font-bold">📊</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 dark:from-purple-400 dark:via-violet-400 dark:to-indigo-400 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:via-violet-700 group-hover:to-indigo-700 dark:group-hover:from-purple-300 dark:group-hover:via-violet-300 dark:group-hover:to-indigo-300 transition-all duration-300">
            Prediction Accuracy Trends
          </h2>
        </div>
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-800/50 dark:to-indigo-800/50 rounded-xl group-hover:from-purple-200 group-hover:to-indigo-200 dark:group-hover:from-purple-700/60 dark:group-hover:to-indigo-700/60 transition-all duration-300">
          {isOpen ? (
            <ChevronDown className="text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200" size={20} />
          ) : (
            <ChevronRight className="text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200" size={20} />
          )}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-y-auto overflow-x-auto ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 mb-6">
          {/* Current Accuracy Display */}
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {dataPoints[dataPoints.length - 1].toFixed(1)}%
            </span>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">Current Accuracy</p>
          </div>
          
          {/* Date Range Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
            {[7, 14, 30, "all"].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`flex-1 sm:flex-none py-2 sm:py-2.5 px-4 sm:px-5 text-xs sm:text-sm rounded-lg sm:rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 ${
                  range === d
                    ? "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white shadow-lg shadow-purple-500/40 hover:shadow-purple-500/50"
                    : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-700 hover:shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50"
              }`}
            >
              {d === "all" ? "All Data" : `${d} Days`}
            </button>
          ))}
          </div>
        </div>

       <div className="relative w-full max-w-5xl mx-auto h-[50vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh] xl:h-[65vh] 2xl:h-[70vh] transition-all duration-300 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 dark:from-slate-800 dark:via-slate-800/80 dark:to-purple-900/20 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner overflow-hidden">
  {isLoading ? (
    <div className="w-full h-full relative rounded-2xl">
      {/* shimmer loader here if you have one */}
    </div>
  ) : (
    <div className="absolute inset-0">
      <Suspense fallback={<div>Loading chart...</div>}>
        <Line
          data={data}
          options={{
            ...options,
            maintainAspectRatio: false,
          }}
        />
      </Suspense>
    </div>
  )}
</div>
</div>
    </div>
  );
});

export default ScenarioAccuracyChart;