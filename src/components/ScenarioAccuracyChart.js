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

const allLabels = [
  "Mar 25", "Mar 26", "Mar 27", "Mar 28", "Mar 29",
  "Mar 30", "Mar 31", "Apr 1", "Apr 2", "Apr 3",
  "Apr 4", "Apr 5", "Apr 6", "Apr 7", "Apr 8"
];
const allAccuracy = [72, 75, 74, 76, 78, 80, 77, 79, 82, 85, 86, 88, 89, 91, 93];

const ScenarioAccuracyChart = forwardRef((props,ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState(7);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const t = setTimeout(() => {
        setIsLoading(false);
      
      }, 500); // Keep it responsive — reduce fake delay
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const labels = range === "all" ? allLabels : allLabels.slice(-range);
  const dataPoints = range === "all" ? allAccuracy : allAccuracy.slice(-range);

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
        <div className="flex flex-wrap gap-3 mb-6">
          {[7, 14, 30, "all"].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`py-3 px-6 text-sm rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 ${
                range === d
                  ? "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white shadow-lg shadow-purple-500/40 hover:shadow-purple-500/50"
                  : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-700 hover:shadow-lg shadow-slate-200/50 dark:shadow-slate-800/50"
              }`}
            >
              {d === "all" ? "All Data" : `${d} Days`}
            </button>
          ))}
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
