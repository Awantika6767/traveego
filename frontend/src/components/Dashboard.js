import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const response = await api.getDashboardStats(user.role);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderOperationsDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-orange-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Expiring Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{stats.expiring_quotes || 0}</div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Expires in &lt; 2 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{stats.pending_payments || 0}</div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{stats.active_requests || 0}</div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Pending quotation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.total_revenue || 0)}</div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common operations tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/requests')}
              className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="view-requests-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              View All Requests
            </Button>
            <Button
              onClick={() => navigate('/catalog')}
              variant="outline"
              className="w-full justify-start"
              data-testid="manage-catalog-button"
            >
              <Package className="w-4 h-4 mr-2" />
              Manage Catalog
            </Button>
            <Button
              onClick={() => navigate('/payments')}
              variant="outline"
              className="w-full justify-start"
              data-testid="view-payments-button"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              View Payments
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New request received</p>
                  <p className="text-gray-500 text-xs">Family Trip to Manali • 2h ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Quote expiring soon</p>
                  <p className="text-gray-500 text-xs">Honeymoon Package - Goa • 1d remaining</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderSalesDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">My Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.my_requests || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.pending_quotes || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Accepted Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.accepted_quotes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate('/requests/new')}
            className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="create-request-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create New Request
          </Button>
          <Button
            onClick={() => navigate('/requests')}
            variant="outline"
            className="w-full justify-start"
          >
            <FileText className="w-4 h-4 mr-2" />
            View My Requests
          </Button>
        </CardContent>
      </Card>
    </>
  );

  const renderAccountantDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.pending_verification || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.pending_payments || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Verified Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.verified_payments || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/payments')}
            className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="view-all-payments-button"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            View All Payments
          </Button>
        </CardContent>
      </Card>
    </>
  );

  const renderCustomerDashboard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to QuoteVista</CardTitle>
        <CardDescription>Manage your travel requests and quotations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={() => navigate('/requests/new')}
          className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
          data-testid="create-new-request-button"
        >
          <FileText className="w-4 h-4 mr-2" />
          Create New Request
        </Button>
        <Button
          onClick={() => navigate('/my-requests')}
          variant="outline"
          className="w-full justify-start"
          data-testid="view-my-requests-button"
        >
          <FileText className="w-4 h-4 mr-2" />
          View My Requests
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div data-testid="dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-600">Here's what's happening with your {user?.role} dashboard</p>
      </div>

      {user?.role === 'operations' && renderOperationsDashboard()}
      {user?.role === 'sales' && renderSalesDashboard()}
      {user?.role === 'accountant' && renderAccountantDashboard()}
      {user?.role === 'customer' && renderCustomerDashboard()}
    </div>
  );
};