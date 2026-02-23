import React, { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import SkeletonLoader from '../components/SkeletonLoader';
import useAccessControl from '../hooks/useAccessControl';
import UpgradeModal from '../components/UpgradeModal';
import { Clock, FlaskConical, Target, Lightbulb, Download, FileText, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AnalyticsCard = lazy(() => import('../components/AnalyticsCard'));
const DashboardCharts = lazy(() => import('../components/DashboardCharts'));
const ScenarioAccuracyChart = lazy(() => import('../components/ScenarioAccuracyChart'));
const CategoryDistributionChart = lazy(() => import('../components/CategoryDistributionChart'));
const NarrativePanel = lazy(() => import('../components/NarrativePanel'));

const AnalyticsPage = () => {
  const [totalTime, setTotalTime] = useState(0);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [scenarioAccuracy, setScenarioAccuracy] = useState(0);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [narrativeInsights, setNarrativeInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const { user } = useAuth();
  const userTier = user?.tier || 'Free';

  const analyticsCardRef = useRef(null);
  const dashboardChartsRef = useRef(null);
  const scenarioAccuracyChartRef = useRef(null);
  const categoryDistributionChartRef = useRef(null);
  const narrativePanelRef = useRef(null);

  const [chartsReady, setChartsReady] = useState({
    analyticsCard: false,
    dashboardCharts: false,
    scenarioAccuracy: false,
    categoryDistribution: false,
    narrativePanel: false,
  });

  const allChartsReady = Object.values(chartsReady).every(Boolean);

  const { checkAccess, showUpgradeModal, openModal, closeModal } = useAccessControl(userTier);
  
  const handleUpgradeClick = () => {
    setLoading(true);
    openModal();
  };
  
  const handleCloseModal = () => {
    closeModal();
    setLoading(false);
  };

  const handleExportReportClick = () => {
    setToastMessage("Feature Coming Soon!");
    setTimeout(() => setToastMessage(""), 4000);
  };

  useEffect(() => {
    if (!checkAccess('fullAnalytics')) return;

    let isMounted = true;
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [timeSnapshot, simulationsSnapshot, scenariosSnapshot, narrativeSnapshot] = await Promise.all([
          getDocs(collection(db, 'user_analytics')),
          getDocs(collection(db, 'simulations')),
          getDocs(collection(db, 'scenarios')),
          getDocs(collection(db, 'narratives')),
        ]);

        if (!isMounted) return;

        const timeData = timeSnapshot.docs.map(doc => doc.data().totalTimeSpent || 0);
        setTotalTime(timeData.reduce((acc, curr) => acc + curr, 0));

        setTotalSimulations(simulationsSnapshot.docs.length);

        const accuracyData = scenariosSnapshot.docs.map(doc => doc.data().accuracy || 0);
        setScenarioAccuracy(
          accuracyData.length > 0
            ? accuracyData.reduce((acc, curr) => acc + curr, 0) / accuracyData.length
            : 0
        );

        const categories = scenariosSnapshot.docs.map(doc => doc.data().category);
        const categoryCounts = categories.reduce((acc, category) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        setCategoryDistribution(Object.entries(categoryCounts));

        setNarrativeInsights(narrativeSnapshot.docs.map(doc => doc.data().insight));
      } catch (err) {
        console.error('❌ Error fetching analytics data:', err);
        if (isMounted) setError('Failed to load analytics data. Please try again later.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalyticsData();
    return () => { isMounted = false; };
  }, [userTier]);

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      
      if (!allChartsReady) {
        alert('Charts are still loading. The PDF will be generated with available data.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 30;

      pdf.setFontSize(24);
      pdf.setTextColor(37, 99, 235);
      pdf.text('ANALYTICS REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;

      const chartRefs = [
        { ref: analyticsCardRef, title: 'Total Time Spent' },
        { ref: dashboardChartsRef, title: 'Total Simulations' },
        { ref: scenarioAccuracyChartRef, title: 'Scenario Accuracy' },
        { ref: categoryDistributionChartRef, title: 'Category Distribution' },
        { ref: narrativePanelRef, title: 'Narrative Insights' }
      ];

      for (let { ref, title } of chartRefs) {
        if (ref.current) {
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.text(title, 20, yPosition);
          yPosition += 10;

          const canvas = await html2canvas(ref.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
            pdf.setFontSize(14);
            pdf.text(title, 20, yPosition);
            yPosition += 10;
          }

          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 20;
        }
      }

      pdf.save('analytics-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!checkAccess('fullAnalytics')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900">
        <div className="container mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <TrendingUp className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent mb-6">
                Your Insights Are Ready
              </h2>
              
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
 Upgrade to unlock advanced analytics, simulation trends, and personalized insights over time.
              </p>
              
              <motion.button
                onClick={handleUpgradeClick}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  'Upgrade Now'
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {showUpgradeModal && <UpgradeModal onClose={handleCloseModal} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Hub
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Comprehensive insights and performance metrics
              </p>
            </div>
          </div>
          
          {/* Modern Export Button */}
          <motion.button
            onClick={handleExportReportClick}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <Download className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
              </div>
              <span className="font-semibold">Export Report</span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
              Feature Coming Soon
            </div>
          </motion.button>
        </motion.div>

        {/* Analytics Content */}
        <div id="analytics-panel" className="space-y-8">
          {loading && !error ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
                  <SkeletonLoader height="h-[200px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 dark:text-red-400 text-2xl">⚠️</span>
              </div>
              <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
            </motion.div>
          ) : (
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Total Time Spent</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Your learning journey</p>
                    </div>
                  </div>
                  <div ref={analyticsCardRef}>
                    <Suspense fallback={<SkeletonLoader height="h-[120px]" />}>
                      <AnalyticsCard
                        value={<CountUp end={totalTime} duration={2} />}
                        label="hours"
                        onRendered={() => setChartsReady(prev => ({ ...prev, analyticsCard: true }))}
                      />
                    </Suspense>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Total Simulations</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Experiments completed</p>
                    </div>
                  </div>
                  <div ref={dashboardChartsRef}>
                    <Suspense fallback={<SkeletonLoader height="h-[120px]" />}>
                      <DashboardCharts
                        total={totalSimulations}
                        onRendered={() => setChartsReady(prev => ({ ...prev, dashboardCharts: true }))}
                      />
                    </Suspense>
                  </div>
                </motion.div>
              </div>

              {/* Accuracy Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Scenario Accuracy</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Performance over time</p>
                  </div>
                </div>
                <div ref={scenarioAccuracyChartRef}>
                  <Suspense fallback={<SkeletonLoader height="h-[300px]" />}>
                    <ScenarioAccuracyChart
                      accuracy={scenarioAccuracy}
                      onRendered={() => setChartsReady(prev => ({ ...prev, scenarioAccuracy: true }))}
                    />
                  </Suspense>
                </div>
              </motion.div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Category Distribution</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Topic breakdown</p>
                    </div>
                  </div>
                  <div ref={categoryDistributionChartRef}>
                    <Suspense fallback={<SkeletonLoader height="h-[220px]" />}>
                      <CategoryDistributionChart
                        data={categoryDistribution}
                        onRendered={() => setChartsReady(prev => ({ ...prev, categoryDistribution: true }))}
                      />
                    </Suspense>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Narrative Insights</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI-powered analysis</p>
                    </div>
                  </div>
                  <div ref={narrativePanelRef}>
                    <Suspense fallback={<SkeletonLoader height="h-[220px]" />}>
                      <NarrativePanel
                        insights={narrativeInsights}
                        onRendered={() => setChartsReady(prev => ({ ...prev, narrativePanel: true }))}
                      />
                    </Suspense>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </div>
      
   {/* Modern Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
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
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Coming Soon</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{toastMessage}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {showUpgradeModal && <UpgradeModal onClose={handleCloseModal} />}
    </div>
  );
};

export default AnalyticsPage;