import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

const PaymentAllocationView = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      loadAllocations();
    }
  }, [invoiceId]);

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const response = await api.getPaymentAllocations(invoiceId);
      setAllocations(response.data);
    } catch (error) {
      console.error('Failed to load payment allocations:', error);
      toast.error('Failed to load payment allocation details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial_paid':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { label: 'Fully Paid', className: 'bg-green-100 text-green-800 border-green-200' },
      partial_paid: { label: 'Partially Paid', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      pending: { label: 'Pending', className: 'bg-red-100 text-red-800 border-red-200' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment allocations...</p>
        </div>
      </div>
    );
  }

  if (!allocations) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No allocation data available</p>
      </div>
    );
  }

  const calculateProgress = (paidAmount, totalAmount) => {
    return (paidAmount / totalAmount) * 100;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl" data-testid="payment-allocation-view">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Allocation Details
        </h1>
        <p className="text-gray-600">
          Invoice ID: {allocations.invoice_id?.substring(0, 8)}
        </p>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 border-2 border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="text-lg">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invoice Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(allocations.total_amount)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(allocations.paid_amount)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Remaining</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(allocations.remaining_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Payment Progress</span>
              <span className="font-medium">
                {Math.round(calculateProgress(allocations.paid_amount, allocations.total_amount))}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500"
                style={{
                  width: `${calculateProgress(allocations.paid_amount, allocations.total_amount)}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakup Timeline */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Payment Installments</h2>

        {allocations.breakups && allocations.breakups.length > 0 ? (
          allocations.breakups.map((breakup, index) => (
            <Card key={breakup.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(breakup.status)}
                    <div>
                      <CardTitle className="text-lg">
                        Installment {index + 1}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {breakup.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(breakup.status)}
                </div>
              </CardHeader>
              <CardContent>
                {/* Breakup Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium">{formatDate(breakup.due_date)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount Due</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {formatCurrency(breakup.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid Amount</p>
                    <p className="text-sm font-bold text-green-600 mt-1">
                      {formatCurrency(breakup.paid_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-sm font-bold text-red-600 mt-1">
                      {formatCurrency(breakup.amount - breakup.paid_amount)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar for this breakup */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Installment Progress</span>
                    <span className="font-medium">
                      {Math.round(calculateProgress(breakup.paid_amount, breakup.amount))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        breakup.status === 'paid'
                          ? 'bg-green-500'
                          : breakup.status === 'partial_paid'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}
                      style={{
                        width: `${calculateProgress(breakup.paid_amount, breakup.amount)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Allocations for this breakup */}
                {breakup.allocations && breakup.allocations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Payment History
                    </h4>
                    <div className="space-y-2">
                      {breakup.allocations.map((allocation, allocIndex) => (
                        <div
                          key={allocIndex}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Payment ID: {allocation.payment_id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(allocation.date)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(allocation.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!breakup.allocations || breakup.allocations.length === 0) && (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">No payments allocated yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment breakup found for this invoice</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentAllocationView;
