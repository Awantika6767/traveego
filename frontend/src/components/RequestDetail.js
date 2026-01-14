import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, Plus, Trash2, Save, Send, Check, Calendar, 
  Users, DollarSign, MapPin, Clock, Download
} from 'lucide-react';
import { formatCurrency, formatDateTime, getStatusColor, formatDate } from '../utils/formatters';
import { toast } from 'sonner';

export const RequestDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [activities, setActivities] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [publishNotes, setPublishNotes] = useState('');

  useEffect(() => {
    loadRequestData();
  }, [id]);

  const loadRequestData = async () => {
    try {
      const [reqResponse, quotResponse, actResponse, catResponse] = await Promise.all([
        api.getRequest(id),
        api.getQuotations({ request_id: id }),
        api.getActivities({ request_id: id }),
        api.getCatalog()
      ]);

      setRequest(reqResponse.data);
      if (quotResponse.data.length > 0) {
        setQuotation(quotResponse.data[0]);
      } else if (user.role === 'operations') {
        // Initialize new quotation for operations
        initializeNewQuotation();
      }
      setActivities(actResponse.data);
      setCatalog(catResponse.data);
      
      // Load invoice and payment data for the request
      try {
        const invResponse = await api.getInvoices({ request_id: id });
        if (invResponse.data.length > 0) {
          const invoiceData = invResponse.data[0];
          setInvoice(invoiceData);
          
          // Load payment for this invoice
          const payResponse = await api.getPayments();
          const requestPayment = payResponse.data.find(p => p.invoice_id === invoiceData.id);
          if (requestPayment) {
            setPayment(requestPayment);
          }
        }
      } catch (error) {
        console.error('Failed to load invoice/payment data:', error);
      }
    } catch (error) {
      console.error('Failed to load request data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeNewQuotation = () => {
    const newQuotation = {
      request_id: id,
      versions: [{
        version_number: 1,
        options: [{
          name: 'Option A',
          line_items: [],
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          is_recommended: true
        }],
        created_by: user.id,
        created_by_name: user.name,
        change_notes: 'Initial quotation',
        is_current: true
      }],
      status: 'DRAFT',
      advance_percent: 30.0,
      advance_amount: 0,
      grand_total: 0
    };
    setQuotation(newQuotation);
  };

  const getCurrentVersion = () => {
    if (!quotation || !quotation.versions) return null;
    return quotation.versions.find(v => v.is_current) || quotation.versions[quotation.versions.length - 1];
  };

  const calculateLineItemTotal = (item) => {
    const subtotal = item.unit_price * item.quantity;
    const taxAmount = (subtotal * item.tax_percent) / 100;
    return subtotal + taxAmount;
  };

  const calculateOptionTotals = (option) => {
    const subtotal = option.line_items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxAmount = option.line_items.reduce((sum, item) => {
      const itemSubtotal = item.unit_price * item.quantity;
      return sum + (itemSubtotal * item.tax_percent) / 100;
    }, 0);
    const total = subtotal + taxAmount;
    
    return { subtotal, tax_amount: taxAmount, total };
  };

  const addLineItem = (optionIndex) => {
    const newItem = {
      id: `temp-${Date.now()}`,
      type: 'hotel',
      name: '',
      supplier: '',
      unit_price: 0,
      quantity: 1,
      tax_percent: 18.0,
      markup_percent: 0,
      total: 0,
      is_manual_rate: false
    };

    const updatedQuotation = { ...quotation };
    const currentVersion = getCurrentVersion();
    currentVersion.options[optionIndex].line_items.push(newItem);
    
    // Recalculate totals
    const totals = calculateOptionTotals(currentVersion.options[optionIndex]);
    currentVersion.options[optionIndex] = { ...currentVersion.options[optionIndex], ...totals };
    
    setQuotation(updatedQuotation);
  };

  const removeLineItem = (optionIndex, itemIndex) => {
    const updatedQuotation = { ...quotation };
    const currentVersion = getCurrentVersion();
    currentVersion.options[optionIndex].line_items.splice(itemIndex, 1);
    
    // Recalculate totals
    const totals = calculateOptionTotals(currentVersion.options[optionIndex]);
    currentVersion.options[optionIndex] = { ...currentVersion.options[optionIndex], ...totals };
    
    setQuotation(updatedQuotation);
  };

  const updateLineItem = (optionIndex, itemIndex, field, value) => {
    const updatedQuotation = { ...quotation };
    const currentVersion = getCurrentVersion();
    const item = currentVersion.options[optionIndex].line_items[itemIndex];
    
    item[field] = field === 'unit_price' || field === 'quantity' || field === 'tax_percent' ? parseFloat(value) || 0 : value;
    item.total = calculateLineItemTotal(item);
    
    // Recalculate option totals
    const totals = calculateOptionTotals(currentVersion.options[optionIndex]);
    currentVersion.options[optionIndex] = { ...currentVersion.options[optionIndex], ...totals };
    
    // Recalculate grand total
    updatedQuotation.grand_total = currentVersion.options.reduce((sum, opt) => sum + opt.total, 0);
    updatedQuotation.advance_amount = updatedQuotation.grand_total * (updatedQuotation.advance_percent / 100);
    
    setQuotation(updatedQuotation);
  };

  const addItemFromCatalog = (optionIndex, catalogItem) => {
    const newItem = {
      id: `temp-${Date.now()}`,
      type: catalogItem.type,
      name: catalogItem.name,
      supplier: catalogItem.supplier || '',
      unit_price: catalogItem.default_price,
      quantity: 1,
      tax_percent: 18.0,
      markup_percent: 0,
      total: 0,
      is_manual_rate: false
    };

    newItem.total = calculateLineItemTotal(newItem);

    const updatedQuotation = { ...quotation };
    const currentVersion = getCurrentVersion();
    currentVersion.options[optionIndex].line_items.push(newItem);
    
    // Recalculate totals
    const totals = calculateOptionTotals(currentVersion.options[optionIndex]);
    currentVersion.options[optionIndex] = { ...currentVersion.options[optionIndex], ...totals };
    
    setQuotation(updatedQuotation);
  };

  const saveQuotation = async () => {
    try {
      if (quotation.id) {
        await api.updateQuotation(quotation.id, quotation);
        toast.success('Quotation saved');
      } else {
        const response = await api.createQuotation(quotation);
        setQuotation(response.data);
        toast.success('Quotation created');
      }
      loadRequestData();
    } catch (error) {
      console.error('Failed to save quotation:', error);
      toast.error('Failed to save quotation');
    }
  };

  const publishQuotation = async () => {
    try {
      if (!quotation.id) {
        await saveQuotation();
      }

      await api.publishQuotation(quotation.id, {
        expiry_date: new Date(expiryDate).toISOString(),
        notes: publishNotes,
        actor_id: user.id,
        actor_name: user.name
      });

      toast.success('Quotation published successfully');
      setShowPublishModal(false);
      loadRequestData();
    } catch (error) {
      console.error('Failed to publish quotation:', error);
      toast.error('Failed to publish quotation');
    }
  };

  const acceptQuotation = async () => {
    try {
      await api.acceptQuotation(quotation.id, {
        actor_id: user.id,
        actor_name: user.name
      });

      toast.success('Quotation accepted! Invoice generated.');
      setShowAcceptModal(false);
      loadRequestData();
    } catch (error) {
      console.error('Failed to accept quotation:', error);
      toast.error('Failed to accept quotation');
    }
  };

  const downloadProformaInvoice = () => {
    if (!quotation?.id) {
      toast.error('No quotation available to download');
      return;
    }
    const downloadUrl = api.downloadProformaInvoice(quotation.id);
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `proforma_invoice_${quotation.id.substring(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Downloading proforma invoice...');
  };

  const downloadInvoice = () => {
    if (!invoice?.id) {
      toast.error('No invoice available to download');
      return;
    }
    if (payment?.status !== 'VERIFIED_BY_OPS') {
      toast.error('Invoice can only be downloaded after payment verification');
      return;
    }
    const downloadUrl = api.downloadInvoice(invoice.id);
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `invoice_${invoice.invoice_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Downloading invoice...');
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!request) {
    return <div className="text-center py-12">Request not found</div>;
  }

  const currentVersion = getCurrentVersion();
  const canEdit = user.role === 'operations' && quotation?.status === 'DRAFT';
  const canPublish = user.role === 'operations' && quotation?.status === 'DRAFT';
  const canAccept = user.role === 'customer' && quotation?.status === 'SENT';

  // Determine if cost breakup should be shown
  const shouldShowCostBreakup = () => {
    // Never show cost breakup to customers
    if (user.role === 'customer') {
      return false;
    }
    
    // Always show to operations, admin, and accountant (they need it for their work)
    if (user.role === 'operations' || user.role === 'admin' || user.role === 'accountant') {
      return true;
    }
    
    // For salespeople, check their permission
    if (user.role === 'sales') {
      return user.can_see_cost_breakup === true;
    }
    
    return false;
  };

  const showCostBreakup = shouldShowCostBreakup();

  return (
    <div data-testid="request-detail">
      <Button
        variant="ghost"
        onClick={() => navigate('/requests')}
        className="mb-6"
        data-testid="back-button"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Requests
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Request Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{request.title}</CardTitle>
                  <p className="text-gray-500 mt-1">Request ID: {request.id.substring(0, 8)}</p>
                </div>
                <Badge className={getStatusColor(request.status)}>
                  {request.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium text-gray-900">{request.client_name}</p>
                    <p className="text-sm text-gray-600">{request.client_email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-medium text-gray-900">{request.destination || 'TBD'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Travel Dates</p>
                    <p className="font-medium text-gray-900">{request.preferred_dates}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">People</p>
                    <p className="font-medium text-gray-900">{request.people_count}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Budget Range</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(request.budget_min)} - {formatCurrency(request.budget_max)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotation Builder / View */}
          {quotation && currentVersion && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quotation - Version {currentVersion.version_number}</CardTitle>
                  <div className="flex gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={saveQuotation}
                        data-testid="save-quotation-button"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    )}
                    {canPublish && (
                      <Button
                        size="sm"
                        onClick={() => setShowPublishModal(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        data-testid="publish-button"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Publish
                      </Button>
                    )}
                    {quotation?.status === 'SENT' && (
                      <Button
                        size="sm"
                        onClick={downloadProformaInvoice}
                        variant="outline"
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                        data-testid="download-proforma-button"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Proforma
                      </Button>
                    )}
                    {user.role === 'customer' && payment?.status === 'VERIFIED_BY_OPS' && invoice && (
                      <Button
                        size="sm"
                        onClick={downloadInvoice}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="download-invoice-button"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoice
                      </Button>
                    )}
                    {canAccept && (
                      <Button
                        size="sm"
                        onClick={() => setShowAcceptModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="accept-button"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept & Pay
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentVersion.options.map((option, optIndex) => (
                  <div key={optIndex} className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{option.name}</h3>
                      {option.is_recommended && (
                        <Badge className="bg-orange-600 text-white">Recommended</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      {option.line_items.map((item, itemIndex) => (
                        <div 
                          key={itemIndex} 
                          className={`line-item-row ${!canEdit && !showCostBreakup ? 'line-item-row-simple' : ''}`}
                          data-testid={`line-item-${itemIndex}`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                            {itemIndex + 1}
                          </div>
                          
                          {canEdit ? (
                            <>
                              <Input
                                placeholder="Item name"
                                value={item.name}
                                onChange={(e) => updateLineItem(optIndex, itemIndex, 'name', e.target.value)}
                                data-testid={`item-name-${itemIndex}`}
                              />
                              <Input
                                placeholder="Supplier"
                                value={item.supplier}
                                onChange={(e) => updateLineItem(optIndex, itemIndex, 'supplier', e.target.value)}
                                data-testid={`item-supplier-${itemIndex}`}
                              />
                              <Input
                                type="number"
                                placeholder="Price"
                                value={item.unit_price}
                                onChange={(e) => updateLineItem(optIndex, itemIndex, 'unit_price', e.target.value)}
                                data-testid={`item-price-${itemIndex}`}
                              />
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(optIndex, itemIndex, 'quantity', e.target.value)}
                                className="w-20"
                                data-testid={`item-qty-${itemIndex}`}
                              />
                              <div className="text-right font-medium">{formatCurrency(item.total)}</div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeLineItem(optIndex, itemIndex)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`remove-item-${itemIndex}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {showCostBreakup ? (
                                // Show full cost breakup for authorized users
                                <>
                                  <div className="col-span-2">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.supplier}</p>
                                  </div>
                                  <div className="text-right">{formatCurrency(item.unit_price)}</div>
                                  <div className="text-center">x {item.quantity}</div>
                                  <div className="text-right font-medium">{formatCurrency(item.total)}</div>
                                </>
                              ) : (
                                // Hide cost breakup - only show item name and total
                                <>
                                  <div className="col-span-4">
                                    <p className="font-medium">{item.name}</p>
                                  </div>
                                  <div className="text-right font-medium">{formatCurrency(item.total)}</div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      {canEdit && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addLineItem(optIndex)}
                            data-testid="add-line-item-button"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Line Item
                          </Button>
                          <select
                            onChange={(e) => {
                              const catalogItem = catalog.find(c => c.id === e.target.value);
                              if (catalogItem) {
                                addItemFromCatalog(optIndex, catalogItem);
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            data-testid="catalog-select"
                          >
                            <option value="">Add from Catalog</option>
                            {catalog.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} - {formatCurrency(item.default_price)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(option.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST (18%):</span>
                        <span className="font-medium">{formatCurrency(option.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(option.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!quotation && user.role !== 'operations' && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No quotation available yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sticky Summary & Activity */}
        <div className="space-y-6">
          {quotation && (
            <div className="sticky-summary">
              <Card className="border-2 border-orange-200">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-lg">Price Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grand Total:</span>
                    <span className="font-bold text-xl">{formatCurrency(quotation.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Advance ({quotation.advance_percent}%):</span>
                    <span className="font-medium">{formatCurrency(quotation.advance_amount)}</span>
                  </div>
                  {quotation.expiry_date && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Expires: {formatDate(quotation.expiry_date)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="activity-timeline">
                {activities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{activity.actor_name}</p>
                      <p className="text-gray-600">{activity.action} - {activity.notes}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Publish Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent data-testid="publish-modal">
          <DialogHeader>
            <DialogTitle>Publish Proforma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date *</Label>
              <Input
                id="expiry"
                type="datetime-local"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="expiry-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Add notes for customer..."
                data-testid="publish-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>Cancel</Button>
            <Button
              onClick={publishQuotation}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!expiryDate}
              data-testid="confirm-publish-button"
            >
              Publish Proforma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent data-testid="accept-modal">
          <DialogHeader>
            <DialogTitle>Accept Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              By accepting this quotation, an invoice will be generated and you will be required to pay the advance amount of {formatCurrency(quotation?.advance_amount)}.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="font-medium">Total Amount: {formatCurrency(quotation?.grand_total)}</p>
              <p className="text-sm text-gray-600 mt-1">Advance to be paid: {formatCurrency(quotation?.advance_amount)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptModal(false)}>Cancel</Button>
            <Button
              onClick={acceptQuotation}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="confirm-accept-button"
            >
              Accept & Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
