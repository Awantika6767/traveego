import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Calendar, Users, DollarSign, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceCreationForm from './InvoiceCreationForm';

const PendingInvoices = () => {
  const [pendingQuotations, setPendingQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  useEffect(() => {
    loadPendingQuotations();
  }, []);

  const loadPendingQuotations = async () => {
    try {
      setLoading(true);
      const response = await api.getPendingInvoiceQuotations();
      setPendingQuotations(response.data);
    } catch (error) {
      console.error('Failed to load pending quotations:', error);
      toast.error('Failed to load pending invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = (quotation) => {
    setSelectedQuotation(quotation);
    setShowInvoiceForm(true);
  };

  const handleInvoiceCreated = () => {
    setShowInvoiceForm(false);
    setSelectedQuotation(null);
    loadPendingQuotations(); // Reload the list
    toast.success('Invoice created successfully!');
  };

  const handleCancel = () => {
    setShowInvoiceForm(false);
    setSelectedQuotation(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (showInvoiceForm && selectedQuotation) {
    return (
      <InvoiceCreationForm
        quotation={selectedQuotation}
        onSuccess={handleInvoiceCreated}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="pending-invoices-title">
          Pending Invoice Generation
        </h1>
        <p className="text-gray-600">
          Accepted quotations awaiting invoice creation with payment breakup
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : pendingQuotations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Pending Invoices
              </h3>
              <p className="text-gray-600">
                All accepted quotations have invoices created.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pendingQuotations.map((quotation) => {
            const request = quotation.request_details;
            const pricing = quotation.detailed_quotation_data?.pricing || {};
            
            return (
              <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {quotation.detailed_quotation_data?.tripTitle || request?.title || 'Untitled'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3" />
                        {quotation.detailed_quotation_data?.city || request?.destination || 'N/A'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Accepted
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3 mb-4">
                    {/* Travel Dates */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {formatDate(request?.start_date)} - {formatDate(request?.end_date)}
                      </span>
                    </div>

                    {/* Travelers */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{request?.people_count || 0} travelers</span>
                    </div>

                    {/* Pricing */}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(pricing.subtotal || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Taxes:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(pricing.taxes || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-base font-semibold flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Total:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(pricing.total || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                        <span>Advance Due:</span>
                        <span className="font-medium">
                          {formatCurrency(pricing.depositDue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCreateInvoice(quotation)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    data-testid={`create-invoice-btn-${quotation.id}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingInvoices;
