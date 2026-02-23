import React, { useState, useEffect } from 'react';
import { Download, FileText, CreditCard, CheckCircle, XCircle, Clock, AlertCircle, Filter } from 'lucide-react';

// =====================================================
// COMPONENT 1: Enhanced SubscriptionHistory
// =====================================================
const SubscriptionHistory = ({ subscriptions }) => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const safeSubscriptions = subscriptions || [];

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      succeeded: { color: 'bg-green-500', icon: CheckCircle, text: 'Paid' },
      active: { color: 'bg-green-500', icon: CheckCircle, text: 'Active' },
      failed: { color: 'bg-red-500', icon: XCircle, text: 'Failed' },
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      cancelled: { color: 'bg-gray-500', icon: AlertCircle, text: 'Cancelled' },
      refunded: { color: 'bg-gray-500', icon: AlertCircle, text: 'Refunded' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const filteredSubscriptions = safeSubscriptions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  if (loading) {
    return (
      <div className="bg-white border dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border dark:bg-gray-800 p-6 rounded-xl shadow-lg transition hover:shadow-blue-500/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Subscription History</h2>
        {safeSubscriptions.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </div>

      {/* Filter buttons */}
      {showFilters && safeSubscriptions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {['all', 'active', 'succeeded', 'failed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {safeSubscriptions.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="dark:text-gray-100 text-gray-600">No subscriptions found.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Start a subscription to see your history here.
          </p>
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="text-center py-8">
          <p className="dark:text-gray-100 text-gray-600">
            No {filter} subscriptions found.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Plan</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Amount</th>
                <th className="text-left p-2 text-gray-700 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map(({ id, date, plan, amount, status }) => (
                <tr key={id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td className="p-2 dark:text-gray-300">
                    {new Date(date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="p-2 dark:text-gray-300">{plan}</td>
                  <td className="p-2 dark:text-gray-300 font-semibold">${amount.toFixed(2)}</td>
                  <td className="p-2">
                    <StatusBadge status={status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Failed payments warning */}
      {safeSubscriptions.some(s => s.status === 'failed') && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold">
                Failed Payment Detected
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                Please update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// DEMO PAGE - Shows all components together
// =====================================================
const Payments = () => {
  // Mock data for demo
  const mockSubscriptions = [
    {
      id: 'sub_1234567890',
      date: '2024-01-15',
      plan: 'Pro Plan',
      amount: 29.99,
      status: 'succeeded'
    },
    {
      id: 'sub_0987654321',
      date: '2023-12-15',
      plan: 'Pro Plan',
      amount: 29.99,
      status: 'succeeded'
    },
    {
      id: 'sub_1122334455',
      date: '2023-11-15',
      plan: 'Basic Plan',
      amount: 9.99,
      status: 'failed'
    }
  ];

  return (
    <div className="min-h-screen rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
       
        <div className="grid grid-cols-1 gap-6">
          <SubscriptionHistory subscriptions={mockSubscriptions} />
        </div>

      </div>
    </div>
  );
};

export default Payments;
export { SubscriptionHistory };