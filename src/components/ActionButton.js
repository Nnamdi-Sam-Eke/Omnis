import React, { useState} from 'react';
import { FileText,  Download,  Zap,  } from 'lucide-react';

const ActionButtons = () => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Generate PDF Report - Enhanced version matching ScenarioSimulationCard
  const handleCreateReport = () => {
    try {
      // Sample data for the report
      const reportData = {
        title: 'Omnis Analytics Report',
        query: 'Comprehensive System Analysis',
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toLocaleString(),
        sections: [
          { 
            title: 'Executive Summary', 
            content: 'This report provides a comprehensive overview of simulation results and analytics. The system has processed multiple scenarios with high accuracy and reliability.' 
          },
          { 
            title: 'Key Metrics', 
            content: 'Total Simulations: 90\nSuccess Rate: 95%\nAverage Duration: 12 minutes\nData Quality Score: 98%\nSystem Uptime: 99.9%' 
          },
          { 
            title: 'Performance Analysis',
            content: 'System performance has been consistently excellent across all metrics. Processing speed has improved by 15% over the last quarter, with enhanced accuracy in predictive models.'
          },
          { 
            title: 'Recommendations', 
            content: 'Continue monitoring performance trends and optimize resource allocation. Consider scaling infrastructure for anticipated growth. Implement additional validation checks for edge cases.' 
          }
        ],
        tags: ['#Q4', '#2025', '#high-confidence', '#analysis', '#optimization'],
        rawData: {
          simulations: [
            { date: '2025-03-01', count: 45, status: 'Success' },
            { date: '2025-03-02', count: 52, status: 'Success' },
            { date: '2025-03-03', count: 48, status: 'Success' }
          ],
          summary: {
            total: 145,
            average: 48.3,
            successRate: '95%'
          }
        }
      };

      // Create comprehensive HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${reportData.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 30px; 
            line-height: 1.7; 
            color: #1e293b;
            background: #ffffff;
        }
        .header { 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 25px; 
            margin-bottom: 35px; 
        }
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .meta-info {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin: 15px 0;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #64748b;
        }
        .meta-item strong {
            color: #334155;
        }
        .tags { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 15px 20px; 
            border-radius: 12px; 
            margin: 15px 0;
            border: 1px solid #cbd5e1;
        }
        .tags strong {
            color: #334155;
            font-size: 14px;
            margin-right: 10px;
        }
        .tag { 
            background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
            color: white; 
            padding: 4px 12px; 
            border-radius: 16px; 
            margin-right: 8px; 
            font-size: 13px;
            font-weight: 500;
            display: inline-block;
            margin-bottom: 5px;
        }
        .section { 
            margin: 35px 0;
            page-break-inside: avoid;
        }
        .section h2 {
            font-size: 22px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-icon {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }
        .section-content {
            padding: 15px 20px;
            background: #f8fafc;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
            margin-top: 15px;
        }
        .section-content p {
            margin-bottom: 10px;
            color: #334155;
            font-size: 15px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .metric-label {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
        }
        .raw-data { 
            background: #f1f5f9;
            padding: 20px; 
            border-radius: 12px; 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
            margin-top: 20px;
            border: 1px solid #cbd5e1;
            overflow-x: auto;
        }
        .raw-data h3 {
            margin-bottom: 15px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            color: #0f172a;
        }
        .raw-data pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #334155;
            line-height: 1.5;
        }
        .footer {
            margin-top: 50px;
            padding-top: 25px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 13px;
        }
        .footer-logo {
            font-size: 24px;
            margin-bottom: 10px;
        }
        @media print {
            body { 
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${reportData.title}</h1>
        <div class="meta-info">
            <div class="meta-item">
                <strong>Query:</strong> ${reportData.query}
            </div>
            <div class="meta-item">
                <strong>Generated:</strong> ${reportData.timestamp}
            </div>
        </div>
        <div class="tags">
            <strong>Tags:</strong>
            ${reportData.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
    </div>
    
    ${reportData.sections.map((section, index) => `
        <div class="section">
            <h2>
                <span class="section-icon">${['📊', '📈', '🔍', '💡'][index] || '📄'}</span>
                ${section.title}
            </h2>
            <div class="section-content">
                ${section.content.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
        </div>
    `).join('')}
    
    <div class="section">
        <h2>
            <span class="section-icon">📊</span>
            Performance Metrics
        </h2>
        <div class="metrics">
            <div class="metric-item">
                <div class="metric-label">Total Simulations</div>
                <div class="metric-value">${reportData.rawData.summary.total}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Average Count</div>
                <div class="metric-value">${reportData.rawData.summary.average}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">${reportData.rawData.summary.successRate}</div>
            </div>
        </div>
    </div>
    
    <div class="raw-data">
        <h3>📋 Raw Data</h3>
        <pre>${JSON.stringify(reportData.rawData, null, 2)}</pre>
    </div>
    
    <div class="footer">
        <div class="footer-logo">⚡</div>
        <p><strong>Generated by Omnis Scenario Simulation Tool</strong></p>
        <p>© ${new Date().getFullYear()} - All Rights Reserved</p>
    </div>
</body>
</html>`;

      // Open in new window and trigger print dialog
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
        // Wait for content to load before printing
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print();
          }, 250);
        };
        
        alert('✅ Report generated successfully! Print dialog will open.');
      } else {
        alert('❌ Please allow pop-ups to generate the report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Failed to generate report');
    }
  };

  // Export data in different formats
  const handleExport = (format) => {
    try {
      // Sample data to export
      const exportData = {
        simulations: [
          { date: '2025-03-01', count: 45, status: 'Success' },
          { date: '2025-03-02', count: 52, status: 'Success' },
          { date: '2025-03-03', count: 48, status: 'Success' },
        ],
        summary: {
          total: 145,
          average: 48.3,
          successRate: '95%'
        }
      };

      let content, mimeType, extension;

      switch (format) {
        case 'pdf':
          content = `
OMNIS DATA EXPORT - PDF
Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIMULATION DATA
${exportData.simulations.map(s => `${s.date} | Count: ${s.count} | Status: ${s.status}`).join('\n')}

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Simulations: ${exportData.summary.total}
Average: ${exportData.summary.average}
Success Rate: ${exportData.summary.successRate}
`;
          mimeType = 'application/pdf';
          extension = 'pdf';
          break;

        case 'docx':
          content = `
OMNIS DATA EXPORT - DOCX
Generated: ${new Date().toLocaleString()}

SIMULATION DATA
${exportData.simulations.map(s => `${s.date} - Count: ${s.count} - Status: ${s.status}`).join('\n')}

SUMMARY
Total Simulations: ${exportData.summary.total}
Average: ${exportData.summary.average}
Success Rate: ${exportData.summary.successRate}
`;
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';
          break;

        case 'csv':
          content = `Date,Count,Status\n${exportData.simulations.map(s => `${s.date},${s.count},${s.status}`).join('\n')}`;
          mimeType = 'text/csv';
          extension = 'csv';
          break;

        case 'json':
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;

        case 'xlsx':
          content = `Date\tCount\tStatus\n${exportData.simulations.map(s => `${s.date}\t${s.count}\t${s.status}`).join('\n')}`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;

        case 'xml':
          content = `<?xml version="1.0" encoding="UTF-8"?>
<export>
  <generated>${new Date().toISOString()}</generated>
  <simulations>
    ${exportData.simulations.map(s => `
    <simulation>
      <date>${s.date}</date>
      <count>${s.count}</count>
      <status>${s.status}</status>
    </simulation>`).join('')}
  </simulations>
  <summary>
    <total>${exportData.summary.total}</total>
    <average>${exportData.summary.average}</average>
    <successRate>${exportData.summary.successRate}</successRate>
  </summary>
</export>`;
          mimeType = 'application/xml';
          extension = 'xml';
          break;

        default:
          throw new Error('Unsupported format');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Omnis_Export_${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowExportMenu(false);
      alert(`✅ Data exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('❌ Failed to export data');
    }
  };

  const exportFormats = [
    { id: 'pdf', label: 'PDF Document', icon: '📄', description: 'Portable Document Format' },
    { id: 'docx', label: 'Word Document', icon: '📝', description: 'Microsoft Word format' },
    { id: 'csv', label: 'CSV File', icon: '📊', description: 'Comma-separated values' },
    { id: 'xlsx', label: 'Excel File', icon: '📗', description: 'Microsoft Excel format' },
    { id: 'json', label: 'JSON File', icon: '{ }', description: 'JavaScript Object Notation' },
    { id: 'xml', label: 'XML File', icon: '🔖', description: 'Extensible Markup Language' },
  ];

  const actions = [
    {
      id: 'create-report',
      label: 'Create Report',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      hoverColor: 'from-blue-600 to-cyan-600',
      description: 'Generate a comprehensive PDF report',
      shortcut: 'Ctrl+R',
      onClick: handleCreateReport
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: Download,
      color: 'from-amber-500 to-orange-600',
      hoverColor: 'from-amber-600 to-orange-700',
      description: 'Export data in various formats',
      shortcut: 'Ctrl+E',
      onClick: () => setShowExportMenu(!showExportMenu)
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Quick Actions</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Available actions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6">
        <div className="grid gap-4 transition-all duration-300 grid-cols-1 sm:grid-cols-2">
          {actions.map((action) => {
            const IconComponent = action.icon;
            return (
              <div
                key={action.id}
                className="group relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              >
                <button 
                  onClick={action.onClick}
                  className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-lg bg-gradient-to-r ${action.color} hover:${action.hoverColor} text-white font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{action.label}</span>
                </button>
                
                {/* Tooltip */}
                {/* <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    {action.description}
                    {action.shortcut && (
                      <div className="text-xs text-gray-300 mt-1">{action.shortcut}</div>
                    )}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                  </div>
                </div> */}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 dark:text-gray-400">All systems ready</span>
            </div>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {actions.length} actions available
          </div>
        </div>
      </div>

      {/* Export Menu Modal - Floating Outside Component */}
      {showExportMenu && (
        <>
          {/* Backdrop with blur */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setShowExportMenu(false)}
          ></div>
          
          {/* Export Menu Popup */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-scaleIn">
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-2xl shadow-2xl overflow-hidden min-w-[320px] max-w-md">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 border-b border-blue-300 dark:border-blue-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-bold text-white">Export Data</h3>
                  </div>
                  <button
                    onClick={() => setShowExportMenu(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
                <p className="text-sm text-blue-50 mt-1">Choose your preferred format</p>
              </div>
              
              {/* Format Options */}
              <div className="max-h-96 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => handleExport(format.id)}
                      className="group flex flex-col items-center p-4 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 rounded-xl transition-all duration-200 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg"
                    >
                      <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">
                        {format.icon}
                      </span>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {format.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Click any format to download instantly
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ActionButtons;