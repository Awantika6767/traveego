import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Shield, Eye, EyeOff, Users } from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const [salespeople, setSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadSalespeople();
  }, []);

  const loadSalespeople = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getAllSalespeople();
      setSalespeople(response.data);
    } catch (err) {
      console.error('Error loading salespeople:', err);
      setError('Failed to load salespeople. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (salespersonId, currentValue) => {
    try {
      setUpdating(prev => ({ ...prev, [salespersonId]: true }));
      setError('');
      
      const newValue = !currentValue;
      await api.toggleCostBreakupPermission(salespersonId, newValue);
      
      // Update local state
      setSalespeople(prev =>
        prev.map(sp =>
          sp.id === salespersonId
            ? { ...sp, can_see_cost_breakup: newValue }
            : sp
        )
      );
    } catch (err) {
      console.error('Error toggling permission:', err);
      setError('Failed to update permission. Please try again.');
    } finally {
      setUpdating(prev => ({ ...prev, [salespersonId]: false }));
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-600">Manage cost breakup visibility permissions for salespeople</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Salespeople List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Salespeople Permissions</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading salespeople...</p>
          </div>
        ) : salespeople.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No salespeople found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {salespeople.map((salesperson) => (
              <div
                key={salesperson.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Salesperson Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {salesperson.name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                      <span>{salesperson.email}</span>
                      {salesperson.phone && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>{salesperson.phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Permission Toggle */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Cost Breakup Visibility
                      </p>
                      <p className="text-xs text-gray-500">
                        {salesperson.can_see_cost_breakup ? 'Enabled' : 'Disabled (Default)'}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => togglePermission(salesperson.id, salesperson.can_see_cost_breakup)}
                      disabled={updating[salesperson.id]}
                      className={`
                        relative inline-flex h-10 w-20 items-center rounded-full transition-colors
                        ${salesperson.can_see_cost_breakup ? 'bg-green-600' : 'bg-gray-300'}
                        ${updating[salesperson.id] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
                      `}
                      aria-label={`Toggle cost breakup visibility for ${salesperson.name}`}
                    >
                      <span
                        className={`
                          inline-flex h-8 w-8 items-center justify-center transform rounded-full bg-white shadow-lg transition-transform
                          ${salesperson.can_see_cost_breakup ? 'translate-x-11' : 'translate-x-1'}
                        `}
                      >
                        {updating[salesperson.id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                        ) : salesperson.can_see_cost_breakup ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Cost Breakup Visibility</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Enabled:</strong> Salesperson can see supplier names, unit prices, and quantities in quotations</li>
          <li>• <strong>Disabled (Default):</strong> Salesperson only sees item names and total amounts</li>
          <li>• <strong>Note:</strong> Customers never see cost breakup regardless of this setting</li>
          <li>• <strong>Note:</strong> Operations, Admin, and Accountant roles always see full cost breakup</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
