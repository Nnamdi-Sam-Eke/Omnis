import React, { useState, useEffect, lazy, Suspense, forwardRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { db } from "../firebase"; // Adjust path as needed
import { collection, query, getDocs, where } from "firebase/firestore";
import { useAuth } from "../AuthContext"; // Adjust path as needed

const DoughnutChart = lazy(() =>
  import('react-chartjs-2').then(mod => ({ default: mod.Doughnut }))
);

ChartJS.register(ArcElement, Tooltip, Legend);

// Color palette for categories
const CATEGORY_COLORS = {
  'Finance': { bg: '#0ea5e9', border: '#0284c7' },
  'Healthcare': { bg: '#06b6d4', border: '#0891b2' },
  'Economics': { bg: '#14b8a6', border: '#0d9488' },
  'Technology': { bg: '#10b981', border: '#059669' },
  'Retail': { bg: '#22c55e', border: '#16a34a' },
  'Agriculture': { bg: '#84cc16', border: '#65a30d' },
  'Energy': { bg: '#f59e0b', border: '#d97706' },
  'Education': { bg: '#8b5cf6', border: '#7c3aed' },
  'Manufacturing': { bg: '#ec4899', border: '#db2777' },
  'Transportation': { bg: '#ef4444', border: '#dc2626' },
  'Real Estate': { bg: '#06b6d4', border: '#0891b2' },
  'Entertainment': { bg: '#f97316', border: '#ea580c' },
  'Other': { bg: '#64748b', border: '#475569' }
};

// Default colors for unknown categories
const DEFAULT_COLORS = [
  { bg: '#8b5cf6', border: '#7c3aed' },
  { bg: '#ec4899', border: '#db2777' },
  { bg: '#f59e0b', border: '#d97706' },
  { bg: '#ef4444', border: '#dc2626' },
  { bg: '#06b6d4', border: '#0891b2' },
  { bg: '#f97316', border: '#ea580c' },
  { bg: '#64748b', border: '#475569' }
];

const CategoryDistributionChart = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Function to get color for a category
  const getCategoryColor = (category, index) => {
    if (CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS[category];
    }
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  // Fetch category data from Firebase
  const fetchCategoryData = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching category data for user:", user.uid);
      
      // Query userInteractions/{userId}/interactions subcollection
      const userInteractionsRef = collection(db, "userInteractions", user.uid, "interactions");
      const q = query(userInteractionsRef);
      
      const querySnapshot = await getDocs(q);
      const interactions = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        interactions.push(data);
      });

      console.log("📊 Raw interactions data:", interactions);

      // Count categories
      const categoryCounts = {};
      
      interactions.forEach((interaction) => {
        // Check if the interaction has a category field
        if (interaction.category && interaction.category.trim() !== "") {
          const category = interaction.category.trim();
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });

      console.log("📈 Category counts:", categoryCounts);

      // If no categories found, show a message
      if (Object.keys(categoryCounts).length === 0) {
        setChartData({
          labels: ['No Categories Yet'],
          datasets: [{
            label: 'Scenario Count',
            data: [1],
            backgroundColor: ['#e2e8f0'],
            borderColor: ['#cbd5e1'],
            borderWidth: 2,
          }]
        });
        setIsLoading(false);
        return;
      }

      // Prepare chart data
      const labels = Object.keys(categoryCounts);
      const data = Object.values(categoryCounts);
      const backgroundColors = [];
      const borderColors = [];

      labels.forEach((category, index) => {
        const colors = getCategoryColor(category, index);
        backgroundColors.push(colors.bg);
        borderColors.push(colors.border);
      });

      const newChartData = {
        labels: labels,
        datasets: [{
          label: 'Scenario Count',
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        }]
      };

      console.log("🎨 Final chart data:", newChartData);
      setChartData(newChartData);

    } catch (error) {
      console.error("❌ Error fetching category data:", error);
      setError("Failed to load category data");
      
      // Set fallback data
      setChartData({
        labels: ['Error Loading Data'],
        datasets: [{
          label: 'Scenario Count',
          data: [1],
          backgroundColor: ['#ef4444'],
          borderColor: ['#dc2626'],
          borderWidth: 2,
        }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle component open/close
  useEffect(() => {
    if (isOpen && !chartData) {
      fetchCategoryData();
    }
  }, [isOpen, user]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#64748b',
          font: { size: 13, weight: '500' },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: "rgba(8, 51, 68, 0.95)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "#0ea5e9",
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 14,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} scenarios (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div
      ref={ref}
      className="w-full mt-8 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900/20 hover:shadow-cyan-500/25 transition-all duration-500 ease-out px-8 py-8 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-2xl hover:shadow-cyan-500/30 backdrop-blur-sm"
    >
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between cursor-pointer mb-6 group"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg">
            <span className="text-white text-lg font-bold">📊</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 dark:from-cyan-400 dark:via-teal-400 dark:to-emerald-400 bg-clip-text text-transparent group-hover:from-cyan-700 group-hover:via-teal-700 group-hover:to-emerald-700 dark:group-hover:from-cyan-300 dark:group-hover:via-teal-300 dark:group-hover:to-emerald-300 transition-all duration-300">
              Scenario Category Distribution
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {chartData && chartData.datasets[0] ? 
                `${chartData.datasets[0].data.reduce((a, b) => a + b, 0)} total scenarios across ${chartData.labels.length} categories` :
                'Click to view your scenario categories'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-800/50 dark:to-teal-800/50 rounded-xl group-hover:from-cyan-200 group-hover:to-teal-200 dark:group-hover:from-cyan-700/60 dark:group-hover:to-teal-700/60 transition-all duration-300">
          {isOpen ? (
            <ChevronDown className="text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors duration-200" size={20} />
          ) : (
            <ChevronRight className="text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors duration-200" size={20} />
          )}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="h-96 flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-white via-slate-50/50 to-cyan-50/30 dark:from-slate-800 dark:via-slate-800/80 dark:to-teal-900/20 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner p-6">
          {isLoading ? (
            <div className="w-full h-full relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-cyan-100 to-slate-200 dark:from-slate-700 dark:via-cyan-800/30 dark:to-slate-700 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-cyan-400/10 animate-shimmer"
                   style={{
                     backgroundImage: 'linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.2), transparent)',
                     backgroundSize: '200% 100%',
                     animation: 'shimmer 2s ease-in-out infinite'
                   }} />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-cyan-300 to-teal-300 dark:from-cyan-600 dark:to-teal-600 rounded-full animate-pulse shadow-2xl" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-full animate-pulse" />
              <div className="absolute top-6 right-6 space-y-2">
                <div className="w-24 h-3 bg-gradient-to-r from-cyan-300 to-teal-300 dark:from-cyan-600 dark:to-teal-600 rounded animate-pulse" />
                <div className="w-20 h-3 bg-gradient-to-r from-teal-300 to-emerald-300 dark:from-teal-600 dark:to-emerald-600 rounded animate-pulse" />
                <div className="w-28 h-3 bg-gradient-to-r from-emerald-300 to-cyan-300 dark:from-emerald-600 dark:to-cyan-600 rounded animate-pulse" />
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-center text-slate-600 dark:text-slate-400 text-sm">
                  Loading your scenario categories...
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-red-500 dark:text-red-400 text-lg mb-2">⚠️</div>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  fetchCategoryData();
                }}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          ) : chartData ? (
            <Suspense fallback={
              <div className="w-full h-full relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-cyan-100 to-slate-200 dark:from-slate-700 dark:via-cyan-800/30 dark:to-slate-700 animate-pulse" />
              </div>
            }>
              <DoughnutChart data={chartData} options={chartOptions} />
            </Suspense>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400">
              <div className="text-4xl mb-4">📊</div>
              <p>No data available</p>
            </div>
          )}
        </div>

        {/* Category Summary */}
        {chartData && chartData.labels.length > 0 && chartData.labels[0] !== 'No Categories Yet' && chartData.labels[0] !== 'Error Loading Data' && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.labels.map((category, index) => {
              const count = chartData.datasets[0].data[index];
              const color = chartData.datasets[0].backgroundColor[index];
              return (
                <div key={category} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{category}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{count} scenarios</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export default CategoryDistributionChart;