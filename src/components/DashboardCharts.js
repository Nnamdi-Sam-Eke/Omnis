import React, { useState, useEffect, Suspense, lazy, forwardRef } from 'react';
import { ChevronDown, ChevronRight, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { db } from '../firebase';
  import { getDocs } from "firebase/firestore";
import { useAuth } from '../AuthContext';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const BarChart = lazy(() => import("react-chartjs-2").then(mod => ({ default: mod.Bar })));
const LineChart = lazy(() => import("react-chartjs-2").then(mod => ({ default: mod.Line })));
const DoughnutChart = lazy(() => import("react-chartjs-2").then(mod => ({ default: mod.Doughnut })));

const DashboardCharts = forwardRef((props, ref) => {
  const { user } = useAuth();
  const [activeChart, setActiveChart] = useState("bar");
  const [range, setRange] = useState(50);
  const [isOpen, setIsOpen] = useState(false); // 👈 Starts collapsed
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState([]);
  const [baseData, setBaseData] = useState([]);
  const [totalScenarios, setTotalScenarios] = useState(0);
  const [viewMode, setViewMode] = useState('individual');


useEffect(() => {
  if (!user) return;

  const fetchTotalSimulations = async () => {
   const snapshot = await getDocs(
  collection(db, 'userInteractions', user.uid, 'interactions')
);
const simulationCount = snapshot.docs.filter(
  doc => doc.data().response?.task === "AI Analysis"
).length;
    setTotalScenarios(simulationCount);
  };

  fetchTotalSimulations();
}, [user]);


  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const t = setTimeout(() => {
        setLoading(false);
      
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user) return;

    const simulationQuery = query(
  collection(db, 'userInteractions', user.uid, 'interactions'),
  where('response.task', '==', 'AI Analysis'),
  orderBy('timestamp', 'desc')
);

    const unsubscribe = onSnapshot(simulationQuery, (snapshot) => {
      const simulations = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(sim => sim.timestamp?.toDate);

      setTotalScenarios(simulations.length);

      if (viewMode === 'individual') {
        const limitedSimulations = range === 'all' ? simulations : simulations.slice(0, range);
        const reversedSimulations = limitedSimulations.reverse();

        const scenarioLabels = reversedSimulations.map((sim, index) => {
          const date = sim.timestamp.toDate();
          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `S${index + 1} (${dateStr} ${timeStr})`;
        });

        const scenarioData = reversedSimulations.map(() =>
          Math.floor(Math.random() * 100) + 1
        );

        setLabels(scenarioLabels);
        setBaseData(scenarioData);
      } else {
        const now = new Date();
        const cutoff = new Date(now);
        if (range !== 'all') {
          cutoff.setDate(cutoff.getDate() - range);
        }

        const filteredSimulations = range === 'all'
          ? simulations
          : simulations.filter(sim => sim.timestamp.toDate() >= cutoff);

        const aggregationMap = {};
        filteredSimulations.forEach(sim => {
          const dateStr = sim.timestamp.toDate().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
          });
          aggregationMap[dateStr] = (aggregationMap[dateStr] || 0) + 1;
        });

        const sortedKeys = Object.keys(aggregationMap).sort((a, b) =>
          new Date(a + ', 2024') - new Date(b + ', 2024')
        );

        setLabels(sortedKeys);
        setBaseData(sortedKeys.map(key => aggregationMap[key]));
      }
    });

    return () => unsubscribe();
  }, [user, range, viewMode]);

  const chartData = {
    labels,
    datasets: [
      {
        label: viewMode === 'individual' ? "Scenario Metrics" : "Simulations Count",
        data: baseData,
        backgroundColor: "rgba(255, 165, 0, 0.8)",
        borderColor: "rgba(255, 140, 0, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const lineChartData = {
    labels,
    datasets: [
      {
        label: viewMode === 'individual' ? "Scenario Performance" : "Daily Simulations",
        data: baseData,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const colorPalette = [/* same array as before... */ "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA", "#F1948A", "#85929E", "#FFA07A", "#20B2AA", "#87CEFA", "#DEB887", "#D3D3D3", "#F0E68C", "#EE82EE", "#90EE90", "#FFB6C1", "#87CEEB", "#DDA0DD", "#98FB98", "#F0E68C", "#DB7093", "#FF7F50", "#6495ED", "#DC143C", "#00FFFF", "#00008B", "#008B8B", "#B8860B", "#A9A9A9", "#006400", "#BDB76B", "#8B008B", "#556B2F", "#FF8C00", "#9932CC"];

  const pieData = {
    labels: labels.map((label, index) => `Scenario ${index + 1}`),
    datasets: [
      {
        label: "Scenarios",
        data: baseData,
        backgroundColor: colorPalette.slice(0, baseData.length),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 12,
          font: { size: 10 },
          generateLabels: function (chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, index) => ({
                text: `S${index + 1}`,
                fillStyle: data.datasets[0].backgroundColor[index],
                strokeStyle: data.datasets[0].borderColor,
                lineWidth: data.datasets[0].borderWidth,
                hidden: false,
                index: index
              }));
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.parsed}`;
          }
        }
      },
    },
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      },
      legend: {
        position: "top",
        labels: {
          font: { size: 12, weight: 'bold' }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
        ticks: { maxTicksLimit: 10, font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
    },
  };

  const chartIcons = {
    bar: BarChart3,
    line: TrendingUp,
    pie: PieChart,
  };

  return (
    <div 
      ref={ref} 
      className="w-full hover:shadow-2xl shadow-2xl hover:shadow-blue-400/30 transition-all duration-500 hover:scale-[1.02] hover:brightness-110 px-6 py-6 border border-gray-200 dark:border-gray-700 mt-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl  hover:border-blue-500/25 dark:hover:border-blue-500/25 relative overflow-hidden"
    >
      {/* Subtle Blue Brush Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-400/8 pointer-events-none rounded-2xl"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-300/3 via-transparent to-blue-600/6 pointer-events-none rounded-2xl"></div>
      
      {/* Content container with relative positioning to stay above overlay */}
      <div className="relative z-10">
        <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between cursor-pointer mb-4 group">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
              Simulation Count
            </h3>
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-semibold">
              {totalScenarios} Total
            </span>
          </div>
          <div className="group-hover:scale-110 transition-transform duration-200">
            {isOpen ? (
              <ChevronDown className="text-blue-500 dark:text-blue-400" size={24} />
            ) : (
              <ChevronRight className="text-blue-500 dark:text-blue-400" size={24} />
            )}
          </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'flex-1 min-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-wrap gap-3 mb-6">
            {["bar", "line", "pie"].map(type => {
              const Icon = chartIcons[type];
              return (
                <button
                  key={type}
                  onClick={() => setActiveChart(type)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    activeChart === type
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Icon size={16} />
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)} Chart</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end space-x-2 mb-6">
            {[10, 25, 50, 100, 'all'].map(d => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`py-2 px-4 text-sm rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                  range === d
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {d === 'all' ? 'All Scenarios' : `Last ${d}`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-h-[400px] mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-inner">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Loading scenario data...</p>
                </div>
              </div>
            ) : baseData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No scenarios found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Run some scenarios to see your analytics</p>
                </div>
              </div>
            ) : (
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-pulse text-blue-500">Loading chart...</div></div>}>
                {activeChart === "bar" && <BarChart data={chartData} options={commonOptions} />}
                {activeChart === "line" && <LineChart data={lineChartData} options={commonOptions} />}
                {activeChart === "pie" && <DoughnutChart data={pieData} options={pieOptions} />}
              </Suspense>
            )}
          </div>

          {baseData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
                <h4 className="text-sm font-medium opacity-90">Total Scenarios</h4>
                <p className="text-2xl font-bold">{totalScenarios}</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
                <h4 className="text-sm font-medium opacity-90">Average Score</h4>
                <p className="text-2xl font-bold">
                  {(baseData.reduce((a, b) => a + b, 0) / baseData.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
                <h4 className="text-sm font-medium opacity-90">Best Score</h4>
                <p className="text-2xl font-bold">{Math.max(...baseData)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DashboardCharts;