import React, { useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { ArrowLeft, Calculator, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PaymentBreakupForm from './PaymentBreakupForm';

const InvoiceCreationForm = ({ quotation, onSuccess, onCancel }) => {
  const pricing = quotation.detailed_quotation_data?.pricing || {};
  
  const [step, setStep] = useState(1); // 1: Invoice Details, 2: Payment Breakup
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  
  // Invoice form state
  const [tcsEnabled, setTcsEnabled] = useState(true);
  const [tcsPercent, setTcsPercent] = useState(2.0);
  const [subtotal, setSubtotal] = useState(pricing.subtotal || 0);
  const [taxAmount, setTaxAmount] = useState(pricing.taxes || 0);
  const [advanceAmount, setAdvanceAmount] = useState(pricing.depositDue || 0);

  // Calculate totals
  const tcsAmount = tcsEnabled ? (subtotal + taxAmount) * (tcsPercent / 100) : 0;
  const totalAmount = subtotal + taxAmount + tcsAmount;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);

      const invoiceData = {
        quotation_id: quotation.id,
        tcs_percent: tcsEnabled ? tcsPercent : 0,
        subtotal: parseFloat(subtotal),
        tax_amount: parseFloat(taxAmount),
        tcs_amount: parseFloat(tcsAmount),
        total_amount: parseFloat(totalAmount),
        advance_amount: parseFloat(advanceAmount)
      };

      const response = await api.createInvoiceFromQuotation(invoiceData);
      
      if (response.data.success) {
        setCreatedInvoice({
          id: response.data.invoice_id,
          invoice_number: response.data.invoice_number
        });
        toast.success('Invoice created successfully!');
        setStep(2); // Move to payment breakup step
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakupCreated = () => {
    toast.success('Payment breakup created successfully!');
    onSuccess();
  };

  if (step === 2 && createdInvoice) {
    return (
      <PaymentBreakupForm
        invoiceId={createdInvoice.id}
        invoiceNumber={createdInvoice.invoice_number}
        totalAmount={totalAmount}
        onSuccess={handleBreakupCreated}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pending Invoices
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Invoice with TCS
        </h1>
        <p className="text-gray-600">
          Step 1: Configure invoice details and TCS calculation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Request Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Request Information</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Trip:</span> {quotation.detailed_quotation_data?.tripTitle}</p>
                  <p><span className="font-medium">Destination:</span> {quotation.detailed_quotation_data?.city}</p>
                  <p><span className="font-medium">Booking Ref:</span> {quotation.detailed_quotation_data?.bookingRef}</p>
                </div>
              </div>

              {/* Pricing Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal (before tax)</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    value={subtotal}
                    onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="taxAmount">Tax Amount (GST/Service Tax)</Label>
                  <Input
                    id="taxAmount"
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="advanceAmount">Advance Amount</Label>
                  <Input
                    id="advanceAmount"
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Initial deposit amount required from customer
                  </p>
                </div>

                {/* TCS Toggle */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="tcs-toggle" className="text-base font-semibold">
                        Apply TCS (Tax Collected at Source)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        TCS is calculated on subtotal + tax amount
                      </p>
                    </div>
                    <Switch
                      id="tcs-toggle"
                      checked={tcsEnabled}
                      onCheckedChange={setTcsEnabled}
                    />
                  </div>

                  {tcsEnabled && (
                    <div>
                      <Label htmlFor="tcsPercent">TCS Percentage (%)</Label>
                      <Input
                        id="tcsPercent"
                        type="number"
                        value={tcsPercent}
                        onChange={(e) => setTcsPercent(parseFloat(e.target.value) || 0)}
                        step="0.1"
                        min="0"
                        max="10"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calculation Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" />
                Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax Amount:</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              {tcsEnabled && (
                <>
                  <div className="border-t pt-2 mt-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base for TCS:</span>
                    <span className="font-medium">{formatCurrency(subtotal + taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TCS ({tcsPercent}%):</span>
                    <span className="font-medium text-orange-600">{formatCurrency(tcsAmount)}</span>
                  </div>
                </>
              )}

              <div className="border-t pt-3 mt-3" />
              
              <div className="flex justify-between">
                <span className="font-semibold text-base">Total Amount:</span>
                <span className="font-bold text-lg text-orange-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="border-t pt-2 mt-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Advance Due:</span>
                <span className="font-medium">{formatCurrency(advanceAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remaining:</span>
                <span className="font-medium">{formatCurrency(totalAmount - advanceAmount)}</span>
              </div>

              <Button
                onClick={handleCreateInvoice}
                disabled={loading || totalAmount <= 0}
                className="w-full mt-6 bg-orange-600 hover:bg-orange-700"
                data-testid="submit-invoice-btn"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Next: Configure payment breakup
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreationForm;
