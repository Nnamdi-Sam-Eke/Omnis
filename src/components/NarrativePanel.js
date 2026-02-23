import React, { useState, useEffect, forwardRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const dummyInsights = [
  { icon: "💡", text: "You've improved your risk tolerance by 20% over the past week." },
  { icon: "📈", text: "Scenarios involving supply chains have a higher success rate (78%) than average." },
  { icon: "🧠", text: "Your average decision confidence has increased from 72% to 84%." },
  { icon: "⚖️", text: "You've simulated more balanced trade-offs in financial scenarios this month." },
];

const NarrativePanel = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      ref={ref}
      className="w-full mt-8 bg-gradient-to-br from-orange-25 via-amber-25 to-yellow-25/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 hover:shadow-orange-300/15 dark:hover:shadow-orange-500/20 transition-all duration-500 ease-out px-8 py-8 border border-slate-200/60 dark:border-orange-500/30 rounded-2xl shadow-2xl hover:shadow-orange-300/20 dark:hover:shadow-orange-400/25 backdrop-blur-sm mb-12"
    >
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between cursor-pointer mb-6 group"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-200 to-amber-300 dark:from-slate-700 dark:to-slate-600 dark:border dark:border-orange-400/50 rounded-xl shadow-lg dark:shadow-orange-500/20">
            <span className="text-white dark:text-orange-300 text-lg font-bold">🤖</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 dark:from-orange-300 dark:via-orange-400 dark:to-orange-500 bg-clip-text text-transparent group-hover:from-orange-500 group-hover:via-amber-500 group-hover:to-yellow-500 dark:group-hover:from-orange-200 dark:group-hover:via-orange-300 dark:group-hover:to-orange-400 transition-all duration-300">
            Narrative Insights from Omnis
          </h2>
        </div>
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-700 dark:to-slate-600 dark:border dark:border-orange-400/30 rounded-xl group-hover:from-orange-100 group-hover:to-amber-150 dark:group-hover:from-slate-600 dark:group-hover:to-slate-500 dark:group-hover:border-orange-400/50 transition-all duration-300">
          {isOpen ? (
            <ChevronDown className="text-orange-400 dark:text-orange-300 group-hover:text-orange-500 dark:group-hover:text-orange-200 transition-colors duration-200" size={20} />
          ) : (
            <ChevronRight className="text-orange-400 dark:text-orange-300 group-hover:text-orange-500 dark:group-hover:text-orange-200 transition-colors duration-200" size={20} />
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="transition-all duration-300 bg-gradient-to-br from-white via-orange-25/50 to-amber-25/30 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl border border-orange-100/50 dark:border-orange-500/40 shadow-inner dark:shadow-orange-900/20 p-6 relative overflow-hidden min-h-[350px]">
          {/* Blurred Content Background */}
          <div className="relative blur-sm opacity-30 pointer-events-none select-none">
            <p className="text-orange-600 dark:text-orange-300 mb-6 text-lg font-medium">
              Here's what I've learned about your decisions...
            </p>

            <ul className="space-y-6">
              {dummyInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-white/50 to-orange-25/50 dark:from-slate-700/50 dark:to-slate-600/50 dark:border-l-4 dark:border-orange-400/60 border border-orange-100/20 dark:border-orange-500/30">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-600 dark:to-slate-500 dark:border dark:border-orange-400/50 rounded-xl shadow-lg dark:shadow-orange-500/10">
                    <span className="text-2xl">{insight.icon}</span>
                  </div>
                  <span className="text-orange-700 dark:text-orange-200 text-base font-medium leading-relaxed flex-1">{insight.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 p-4 bg-gradient-to-r from-orange-25/50 to-amber-25/50 dark:from-slate-700/30 dark:to-slate-600/30 dark:border-l-4 dark:border-orange-400/50 rounded-xl border border-orange-100/20 dark:border-orange-500/30">
              <div className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                *Omnis AI-generated summaries based on your usage patterns.
              </div>
            </div>
          </div>

          {/* Overlay Message */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6 py-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-orange-200/50 dark:border-orange-400/50 shadow-xl max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-200 to-amber-300 dark:from-orange-500 dark:to-amber-600 rounded-full mb-4 shadow-lg">
                <span className="text-3xl">🚧</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 dark:from-orange-300 dark:via-orange-400 dark:to-amber-400 bg-clip-text text-transparent mb-2">
                In Development
              </h3>
              <p className="text-orange-600 dark:text-orange-300 text-sm font-medium">
                AI-powered narrative insights will be available in a future release
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NarrativePanel;