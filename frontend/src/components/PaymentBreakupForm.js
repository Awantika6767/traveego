import React, { useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PaymentBreakupForm = ({ invoiceId, invoiceNumber, totalAmount, onSuccess, onCancel }) => {
  const [breakups, setBreakups] = useState([
    {
      id: 1,
      amount: '',
      due_date: '',
      description: ''
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotal = () => {
    return breakups.reduce((sum, breakup) => {
      const amount = parseFloat(breakup.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const calculateRemaining = () => {
    return totalAmount - calculateTotal();
  };

  const addBreakup = () => {
    if (breakups.length >= 10) {
      toast.error('Maximum 10 breakup items allowed');
      return;
    }

    setBreakups([
      ...breakups,
      {
        id: nextId,
        amount: '',
        due_date: '',
        description: ''
      }
    ]);
    setNextId(nextId + 1);
  };

  const removeBreakup = (id) => {
    if (breakups.length === 1) {
      toast.error('At least one breakup item is required');
      return;
    }
    setBreakups(breakups.filter(b => b.id !== id));
  };

  const updateBreakup = (id, field, value) => {
    setBreakups(breakups.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const validateBreakups = () => {
    // Check if all fields are filled
    for (const breakup of breakups) {
      if (!breakup.amount || !breakup.due_date) {
        toast.error('Please fill all required fields');
        return false;
      }

      if (parseFloat(breakup.amount) <= 0) {
        toast.error('All amounts must be greater than 0');
        return false;
      }
    }

    // Check if sum matches total
    const total = calculateTotal();
    const diff = Math.abs(total - totalAmount);
    if (diff > 0.01) {
      toast.error(`Sum of breakups (${formatCurrency(total)}) must equal invoice total (${formatCurrency(totalAmount)})`);
      return false;
    }

    // Check if dates are in ascending order
    const dates = breakups.map(b => new Date(b.due_date));
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] < dates[i - 1]) {
        toast.error('Due dates must be in ascending order');
        return false;
      }
    }

    // Check if dates are in future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const breakup of breakups) {
      const dueDate = new Date(breakup.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        toast.error('Due dates must be today or in the future');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBreakups()) {
      return;
    }

    try {
      setLoading(true);

      const data = {
        breakups: breakups.map(b => ({
          amount: parseFloat(b.amount),
          due_date: b.due_date,
          description: b.description || null
        }))
      };

      const response = await api.createPaymentBreakup(invoiceId, data);
      
      if (response.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create payment breakup:', error);
      toast.error(error.response?.data?.detail || 'Failed to create payment breakup');
    } finally {
      setLoading(false);
    }
  };

  const remaining = calculateRemaining();
  const isBalanced = Math.abs(remaining) < 0.01;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Payment Breakup
        </h1>
        <p className="text-gray-600">
          Step 2: Configure installment schedule for invoice {invoiceNumber}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Breakup Items */}
        <div className="lg:col-span-2 space-y-4">
          {breakups.map((breakup, index) => (
            <Card key={breakup.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Installment {index + 1}
                  </CardTitle>
                  {breakups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBreakup(breakup.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`amount-${breakup.id}`}>
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`amount-${breakup.id}`}
                      type="number"
                      placeholder="10000"
                      value={breakup.amount}
                      onChange={(e) => updateBreakup(breakup.id, 'amount', e.target.value)}
                      step="0.01"
                      className="mt-1"
                      data-testid={`breakup-amount-${index}`}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`due_date-${breakup.id}`}>
                      Due Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`due_date-${breakup.id}`}
                      type="date"
                      value={breakup.due_date}
                      onChange={(e) => updateBreakup(breakup.id, 'due_date', e.target.value)}
                      className="mt-1"
                      data-testid={`breakup-date-${index}`}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`description-${breakup.id}`}>
                    Description (Optional)
                  </Label>
                  <Textarea
                    id={`description-${breakup.id}`}
                    placeholder="e.g., First installment, Final payment"
                    value={breakup.description}
                    onChange={(e) => updateBreakup(breakup.id, 'description', e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Button */}
          {breakups.length < 10 && (
            <Button
              variant="outline"
              onClick={addBreakup}
              className="w-full border-dashed border-2"
              data-testid="add-breakup-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Installment
            </Button>
          )}

          {breakups.length >= 10 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Maximum 10 installments reached
            </p>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Info */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Total:</span>
                  <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Breakup Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Breakup Items</h4>
                <div className="space-y-1 text-sm">
                  {breakups.map((breakup, index) => (
                    <div key={breakup.id} className="flex justify-between text-gray-600">
                      <span>Installment {index + 1}:</span>
                      <span className="font-medium">
                        {breakup.amount ? formatCurrency(parseFloat(breakup.amount)) : '₹0.00'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Balance Status */}
              <div className={`p-3 rounded-lg ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-start gap-2">
                  {isBalanced ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isBalanced ? 'text-green-900' : 'text-orange-900'}`}>
                      {isBalanced ? 'Balanced' : 'Not Balanced'}
                    </p>
                    <p className={`text-xs mt-1 ${isBalanced ? 'text-green-700' : 'text-orange-700'}`}>
                      {isBalanced ? (
                        'Sum matches invoice total'
                      ) : (
                        <>
                          Remaining: {formatCurrency(Math.abs(remaining))}
                          {remaining > 0 ? ' to allocate' : ' over limit'}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation Notes */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900 space-y-1">
                <p className="font-medium">Requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                  <li>Sum must equal invoice total</li>
                  <li>Dates must be today or future</li>
                  <li>Dates in ascending order</li>
                  <li>1 to 10 installments</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !isBalanced}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  data-testid="submit-breakup-btn"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Create Payment Breakup
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentBreakupForm;
