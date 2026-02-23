import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, Calendar, DollarSign, ArrowRight, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const OverduePaymentsList = () => {
  const navigate = useNavigate();
  const [overdueBreakups, setOverdueBreakups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverdueBreakups();
  }, []);

  const loadOverdueBreakups = async () => {
    try {
      setLoading(true);
      const response = await api.getOverdueBreakups();
      setOverdueBreakups(response.data.overdue_breakups || []);
    } catch (error) {
      console.error('Failed to load overdue breakups:', error);
      toast.error('Failed to load overdue payments');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSeverityColor = (daysOverdue) => {
    if (daysOverdue > 30) return 'bg-red-100 text-red-800 border-red-200';
    if (daysOverdue > 15) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading overdue payments...</p>
        </div>
      </div>
    );
  }

  if (overdueBreakups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          All Clear!
        </h3>
        <p className="text-gray-500">No overdue payments at the moment</p>
      </div>
    );
  }

  // Group by request
  const groupedByRequest = overdueBreakups.reduce((acc, breakup) => {
    const requestId = breakup.request_id;
    if (!acc[requestId]) {
      acc[requestId] = {
        request_id: requestId,
        request_title: breakup.request_title,
        client_name: breakup.client_name,
        invoice_id: breakup.invoice_id,
        invoice_number: breakup.invoice_number,
        breakups: []
      };
    }
    acc[requestId].breakups.push(breakup);
    return acc;
  }, {});

  const requestGroups = Object.values(groupedByRequest);

  return (
    <div className="container mx-auto p-6 max-w-6xl" data-testid="overdue-payments-list">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Overdue Payments
            </h1>
            <p className="text-gray-600">
              {overdueBreakups.length} overdue installment{overdueBreakups.length !== 1 ? 's' : ''} requiring attention
            </p>
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      <Card className="mb-6 border-2 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">
                Action Required
              </h3>
              <p className="text-sm text-red-800">
                The following payments are past their due date. Please follow up with customers 
                or review payment status to ensure timely collection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Payments List */}
      <div className="space-y-6">
        {requestGroups.map((group) => (
          <Card key={group.request_id} className="border-l-4 border-l-red-500">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">
                    {group.request_title}
                  </CardTitle>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Client: <span className="font-medium text-gray-900">{group.client_name}</span></p>
                    <p>Invoice: <span className="font-medium text-gray-900">{group.invoice_number}</span></p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/requests/${group.request_id}`)}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  View Request
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.breakups.map((breakup, index) => {
                  const daysOverdue = calculateDaysOverdue(breakup.due_date);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-red-200"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-red-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {breakup.description || `Installment ${index + 1}`}
                            </h4>
                            <Badge className={getSeverityColor(daysOverdue)}>
                              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">Due Date</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <p className="font-medium">{formatDate(breakup.due_date)}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Amount Due</p>
                              <p className="font-bold text-gray-900 mt-1">
                                {formatCurrency(breakup.breakup_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Paid</p>
                              <p className="font-medium text-green-600 mt-1">
                                {formatCurrency(breakup.paid_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Remaining</p>
                              <p className="font-bold text-red-600 mt-1">
                                {formatCurrency(breakup.remaining_amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OverduePaymentsList;
