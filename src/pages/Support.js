import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, ChevronUp } from 'react-feather';

// Lazy loading the contact form component
const ContactForm = lazy(() => import('../components/ContactForm'));

const SupportPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return tab === 'Contact' ? 'Contact' : 'FAQs';
  });
  const [openFaqIndex, setOpenFaqIndex] = useState({ categoryIdx: null, faqIdx: null });
  const [loading, setLoading] = useState(true);
    
    
    
      // Timer to switch off loading after 4 seconds (on mount)
      useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 4000);
        return () => clearTimeout(timer);
      }, []);

  // FAQs Data with categories
  const faqCategories = [
    {
      category: 'General',
      faqs: [
        {
          question: "What is Omnis and what does it do?",
          answer:
            "Omnis is an AI-powered platform that helps individuals and businesses make better, data-informed decisions through scenario analysis, multi-path scenario evaluation, predictive modeling, and personalized insights."
        },
        {
          question: "Who is Omnis for?",
          answer:
            "Omnis is designed for decision-makers across industries—founders, teams, professionals, and anyone seeking to turn complexity into clarity."
        }
      ]
    },
    {
      category: 'Account',
      faqs: [
        {
          question: "Is Omnis free to use?",
          answer:
            "Omnis offers a free tier with core features, and additional premium features will be available under paid plans."
        },
        {
          question: "How do I reset my password?",
          answer:
            "To reset your password, click 'Forgot Password' on the login page and follow the instructions sent to your email."
        }
      ]
    },
    {
      category: 'Security',
      faqs: [
        {
          question: "Is my data safe with Omnis?",
          answer:
            "Yes. We prioritize your data privacy and security using best-in-class encryption and user-controlled data permissions."
        },
        {
          question: "How can I enable two-factor authentication?",
          answer:
            "You can enable two-factor authentication in your account settings. Just follow the steps under 'Security Settings.'"
        }
      ]
    }
  ];

  const tabLabels = {
    FAQs: 'FAQs',
    Contact: 'Contact Us'
  };

  const isOpen = (categoryIdx, faqIdx) =>
    openFaqIndex.categoryIdx === categoryIdx && openFaqIndex.faqIdx === faqIdx;

  const handleFaqToggle = (categoryIdx, faqIdx) => {
    if (isOpen(categoryIdx, faqIdx)) {
      setOpenFaqIndex({ categoryIdx: null, faqIdx: null });
    } else {
      setOpenFaqIndex({ categoryIdx, faqIdx });
    }
  };

     if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex items-center justify-center">
          <div className="animate-pulse mx-auto w-10/12 max-w-4xl space-y-6">
            <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl" />
            <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl" />
            <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl" />
          </div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-teal-600/10 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-teal-400/5" />
        <div className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
              Support Center
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get help with Omnis and find answers to your questions
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative -mt-8 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs Navigation */}
          <div role="tablist" className="flex flex-wrap gap-4 justify-center mb-8">
            {Object.keys(tabLabels).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`${tab}-panel`}
                id={`${tab}-tab`}
                onClick={() => setActiveTab(tab)}
                title={`Go to ${tabLabels[tab]}`}
                className={`group relative px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                    : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg hover:scale-105 backdrop-blur-sm border border-white/20 dark:border-gray-700/50'
                }`}
              >
                <span className="relative z-10">{tabLabels[tab]}</span>
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-sm opacity-30 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Tabs Content */}
          <div className="relative transition-all duration-300">
            {/* FAQs Tab */}
            {activeTab === 'FAQs' && (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-40">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin" />
                      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                }
              >
                <div id="FAQs-panel" role="tabpanel" aria-labelledby="FAQs-tab" className="space-y-8">
                  {faqCategories.map((category, categoryIdx) => (
                    <div key={categoryIdx} className="group">
                      {/* Category Header */}
                      <div className="flex items-center space-x-3 mb-6">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          categoryIdx === 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                          categoryIdx === 1 ? 'bg-gradient-to-br from-green-500 to-teal-600' :
                          'bg-gradient-to-br from-purple-500 to-pink-600'
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {categoryIdx === 0 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : categoryIdx === 1 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            )}
                          </svg>
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{category.category}</h4>
                      </div>

                      {/* FAQ Items */}
                      <div className="space-y-4">
                        {category.faqs.map((faq, faqIdx) => (
                          <div
                            key={faqIdx}
                            className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            title="Click to expand the answer"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${
                              categoryIdx === 0 ? 'from-blue-500 to-blue-600' :
                              categoryIdx === 1 ? 'from-green-500 to-teal-600' :
                              'from-purple-500 to-pink-600'
                            }`} />
                            <div className="relative p-6">
                              <button
                               
                                tabIndex={0}
                                aria-expanded={isOpen(categoryIdx, faqIdx)}
                                aria-controls={`faq-${categoryIdx}-${faqIdx}`}
                                onClick={() => handleFaqToggle(categoryIdx, faqIdx)}
                                onKeyDown={e =>
                                  (e.key === 'Enter' || e.key === ' ') && handleFaqToggle(categoryIdx, faqIdx)
                                }
                                className="w-full text-left flex justify-between items-center text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <span className="pr-4">{faq.question}</span>
                                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                  isOpen(categoryIdx, faqIdx) 
                                    ? 'bg-blue-500 text-white rotate-180' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900'
                                }`}>
                                  {isOpen(categoryIdx, faqIdx) ? 
                                    <ChevronUp className="w-5 h-5" /> : 
                                    <ChevronRight className="w-5 h-5" />
                                  }
                                </span>
                              </button>
                              {isOpen(categoryIdx, faqIdx) && (
                                <div
                                  id={`faq-${categoryIdx}-${faqIdx}`}
                                  className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-300"
                                >
                                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {faq.answer}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Suspense>
            )}

            {/* Contact Tab */}
            {activeTab === 'Contact' && (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-40">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin" />
                      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                }
              >
                <div id="Contact-panel" role="tabpanel" aria-labelledby="Contact-tab">
                  <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-400/5 dark:to-purple-400/5" />
                    <div className="relative p-8">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Get in Touch</h3>
                          <p className="text-gray-600 dark:text-gray-400">We're here to help you with any questions</p>
                        </div>
                      </div>
                      <ContactForm />
                    </div>
                  </div>
                </div>
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;