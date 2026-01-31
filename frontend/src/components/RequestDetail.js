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
  Users, DollarSign, MapPin, Clock, Download, FileText,
  EyeIcon,
  DownloadIcon,
  Edit,
  Timer,
  CheckCircle,
  Wallet,
  Phone,
  Globe,
  Palmtree,
  Presentation,
  Hotel,
  Bus,
  Plane,
  Navigation
} from 'lucide-react';
import { formatCurrency, formatDateTime, getStatusColor, formatDate } from '../utils/formatters';
import { toast } from 'sonner';
import { RequestChat } from './RequestChat';

export const RequestDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [quotations, setQuotations] = useState(null);
  const [activities, setActivities] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showPayRemainingModal, setShowPayRemainingModal] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [publishNotes, setPublishNotes] = useState('');
  const [validating, setValidating] = useState(false);
  const [openCostBreakupModal, setOpenCostBreakupModal] = useState(false);
  const [costBreakup, setCostBreakup] = useState([]);
  const [costBreakupLoading, setCostBreakupLoading] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [showPayRemainingButton, setShowPayRemainingButton] = useState(false);

  useEffect(() => {
    loadRequestData();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const openCostBreakup = async (id) => {
    setOpenCostBreakupModal(true);
    setCostBreakup([]);
    try {
      setCostBreakupLoading(true);
      const costBreakupApi = await api.getCostBreakup(id);
      setCostBreakup(costBreakupApi.data);
    } catch (error) {
      console.error('Failed to fetch cost breakup:', error);
      toast.error('Failed to fetch cost breakup');
    } finally {
      setCostBreakupLoading(false);
    }
  };

  const loadRequestData = async () => {
    try {
      const [reqResponse, actResponse, catResponse] = await Promise.all([
        api.getRequest(id),
        api.getActivities({ request_id: id }),
        api.getCatalog()
      ]);

      setRequest(reqResponse.data);
      if (reqResponse?.data?.quotations?.length) {
        setQuotations(reqResponse.data.quotations);
      }
      setActivities(actResponse.data);
      setCatalog(catResponse.data);

      // Load invoice and payment data for the request
      try {
        const invResponse = await api.getInvoice({ request_id: id });
        if (invResponse.data) {
          const invoiceData = invResponse.data;
          setInvoice(invoiceData);

          // Load payment for this invoice
          const payResponse = await api.getPayments();
          const isFullPaymentDone = payResponse.data.some(p=>p.type=="full-payment");
          if(isFullPaymentDone) {
            setShowPayRemainingButton(false);
          } else {
            const isPartialPaymentDone = payResponse.data.some(p=>p.type=="partial_payment" && p.status === "VERIFIED_BY_OPS");
            setShowPayRemainingButton(isPartialPaymentDone);
          }
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

  const saveQuotation = async () => {
    try {
      if (quotation.id) {
        await api.updateQuotation(quotation.id, quotation);
        toast.success('Quotation saved');
      } else {
        const response = await api.createQuotation(quotation);
        setQuotations(response.data);
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
      await api.acceptQuotation(selectedQuotation.quotation_id);

      toast.success('Quotation accepted! Invoice generated.');
      setShowAcceptModal(false);
      loadRequestData();
    } catch (error) {
      console.error('Failed to accept quotation:', error);
      toast.error('Failed to accept quotation');
    }
  };

  const payRemaining = async () => {
    try {
      await api.payRemainingInvoice(invoice.id);
      toast.success('Payment successful!');
      setShowPayRemainingModal(false);
      loadRequestData();
    } catch (error) {
      console.error('Failed to pay remaining amount:', error);
      toast.error('Failed to process payment');
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

  const validateRequest = async () => {
    try {
      setValidating(true);

      await api.validateRequest(id);

      toast.success('Request validated successfully');
      loadRequestData();
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Failed to validate request');
    } finally {
      setValidating(false);
    }
  };

  const getTimeLeft = (expiryDate) => {
    if (!expiryDate) return null;

    const now = new Date().getTime();
    const expiry = new Date(expiryDate).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      return { expired: true, text: 'Expired' };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return {
      expired: false,
      text: `${hours}h ${minutes}m ${seconds}s`
    };
  };

  const downloadPDF = (id) => { 
    if (!id) {
      toast.error('No quotation available to download');
      return;
    }
    const downloadUrl = api.downloadQuotationPDF(id);

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `quotation_${id.substring(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Downloading quotation...');
  };

  const showCostBreakup = shouldShowCostBreakup();


  return (

    <div data-testid="request-detail">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
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
                <div >
                  {(user.role === 'sales') && !request.is_salesperson_validated && <Button onClick={validateRequest} size="sm" variant="outline" className="bg-green-100 text-green-800 border-green-200 mr-5 hover:bg-green-200" disabled={validating || request.is_salesperson_validated} data-testid="validate-button">
                    {validating ? 'Validating...' : 'VALIDATE'}
                  </Button>}
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Client Information Section */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Client Name</p>
                      <p className="font-medium text-gray-900">{request.client_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{request.client_email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">
                        {request.client_country_code} {request.client_phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Requirements Section */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Service Requirements</h3>
                <div className="flex flex-wrap gap-2">
                  {request.is_holiday_package_required && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5">
                      <Palmtree className="w-4 h-4 mr-1.5 inline" />
                      Holiday Package
                    </Badge>
                  )}
                  {request.is_mice_required && (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5">
                      <Presentation className="w-4 h-4 mr-1.5 inline" />
                      M.I.C.E.
                    </Badge>
                  )}
                  {request.is_hotel_booking_required && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5">
                      <Hotel className="w-4 h-4 mr-1.5 inline" />
                      Hotel Booking
                    </Badge>
                  )}
                  {request.is_sight_seeing_required && (
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5">
                      <EyeIcon className="w-4 h-4 mr-1.5 inline" />
                      Sightseeing
                    </Badge>
                  )}
                  {request.is_visa_required && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5">
                      <FileText className="w-4 h-4 mr-1.5 inline" />
                      Visa
                    </Badge>
                  )}
                  {request.is_transport_within_city_required && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5">
                      <Bus className="w-4 h-4 mr-1.5 inline" />
                      City Transport
                    </Badge>
                  )}
                  {request.is_transfer_to_destination_required && (
                    <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-200 px-3 py-1.5">
                      <Plane className="w-4 h-4 mr-1.5 inline" />
                      Destination Transport
                    </Badge>
                  )}
                </div>
              </div>

              {/* Trip Details Section */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Trip Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {request.source && (
                    <div className="flex items-start gap-3">
                      <Navigation className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Source</p>
                        <p className="font-medium text-gray-900">{request.source}</p>
                      </div>
                    </div>
                  )}
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
                      <p className="text-sm text-gray-500">Number of People</p>
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
                  {request.is_visa_required && request.visa_citizenship && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Citizenship (for Visa)</p>
                        <p className="font-medium text-gray-900">{request.visa_citizenship}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transport Type Section */}
              {request.type_of_travel && request.type_of_travel.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Transport Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {request.type_of_travel.map((type) => {
                      const transportIcons = {
                        flight: <Plane className="w-4 h-4 mr-1.5 inline" />,
                        train: <FileText className="w-4 h-4 mr-1.5 inline" />,
                        bus: <Bus className="w-4 h-4 mr-1.5 inline" />,
                        cab: <Bus className="w-4 h-4 mr-1.5 inline" />,
                        mini_bus: <Bus className="w-4 h-4 mr-1.5 inline" />,
                        traveller: <Bus className="w-4 h-4 mr-1.5 inline" />
                      };
                      const transportNames = {
                        flight: 'Flight',
                        train: 'Train',
                        bus: 'Bus',
                        cab: 'Cab',
                        mini_bus: 'Mini Bus',
                        traveller: 'Traveller'
                      };
                      return (
                        <Badge key={type} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5">
                          {transportIcons[type]}
                          {transportNames[type]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Requirements Section */}
              {request.special_requirements && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Special Requirements</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.special_requirements}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Component */}
          {request && (
            <RequestChat requestId={id} currentUser={user} />
          )}



          {/* Quotation View / Detailed Quotation Builder */}
          {/* {quotation && currentVersion && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quotation - Version {currentVersion.version_number}</CardTitle>
                  <div className="flex gap-2">
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
                    {(user.role === 'operations') && (
                      <Button
                        size="sm"
                        onClick={() => navigate('/quotation-builder', { state: { request, quotation } })}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="create-detailed-quotation-button"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {quotation.detailed_quotation_data ? 'Edit Detailed Quotation' : 'Create Detailed Quotation'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(user.role === 'operations') && !quotation.detailed_quotation_data && (
                  <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-blue-900 mb-2">
                          Create Comprehensive Quotation
                        </h4>
                        <p className="text-blue-700 mb-4">
                          Use the Detailed Quotation Builder to create professional quotations with day-by-day itineraries, 
                          activities, pricing details, and more.
                        </p>
                        <Button
                          onClick={() => navigate('/quotation-builder', { state: { request, quotation } })}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Open Quotation Builder
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {currentVersion.options.map((option, optIndex) => (
                  <div key={optIndex} className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{option.name}</h3>
                      {option.is_recommended && (
                        <Badge className="bg-orange-600 text-white">Recommended</Badge>
                      )}
                    </div>

                    {option.line_items.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {option.line_items.map((item, itemIndex) => (
                            <div 
                              key={itemIndex} 
                              className={`line-item-row ${!showCostBreakup ? 'line-item-row-simple' : ''}`}
                              data-testid={`line-item-${itemIndex}`}
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                                {itemIndex + 1}
                              </div>
                              
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
                            </div>
                          ))}
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
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No line items added yet</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )} */}

          {/* {!quotation && (user.role === 'operations' ) && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center max-w-md mx-auto">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Quotation Created Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create a comprehensive quotation with detailed itinerary, activities, and pricing using our Quotation Builder.
                  </p>
                  <Button
                    onClick={() => navigate('/quotation-builder', { state: { request, quotation: null } })}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Create Detailed Quotation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!quotation && user.role === 'customer' && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No quotation available yet</p>
              </CardContent>
            </Card>
          )}

          {!quotation && user.role === 'accountant' && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No quotation available yet</p>
              </CardContent>
            </Card>
          )} */}
        </div>

        {/* Right Column - Sticky Summary & Activity */}
        <div className="space-y-6">

          {(
            <div className="sticky-summary">
              <Card className="border-2 border-orange-200 overflow-hidden">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-lg">Quotation Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">

                  {
                    !quotations?.length && (
                      <p className="text-gray-500 text-center">No quotations available</p>
                    )
                  }
                  <div className='overflow-y-auto max-h-20 mb-4 space-y-2 pe-2'>
                    {
                      quotations?.map((quotation, index) => (
                        <div key={index} className="flex justify-between gap-2 items-center border-b border-gray-200 pb-2">
                          <div className='w-[20px]'>{index + 1}.</div>
                          {(user.role === 'operations' || (user.role === 'sales' && user.can_see_cost_breakup)) && <button className='w-full flex align-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-sm font-medium' onClick={() => { openCostBreakup(quotation.quotation_id) }}><EyeIcon className="w-4 h-4 my-auto mr-1" /> Cost</button>}
                          {(user.role === 'operations') && <button onClick={() => navigate('/quotation-builder', { state: { request, quotation_id: quotation.quotation_id } })} className='w-full flex align-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium'><Edit className="w-4 h-4 my-auto mr-1" /> Edit</button>}
                          {(quotation?.status === 'SENT' || quotation?.status === 'ACCEPTED') && <button onClick={() => downloadPDF(quotation.quotation_id)} className='w-full flex align-center justify-center bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm font-medium'><DownloadIcon className="w-4 h-4 my-auto mr-1" /> Download</button>}
                          {(user.role === 'customer' || user.role === 'sales') && (quotation.status === 'SENT') && <button className='w-full flex align-center justify-center bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm font-medium' onClick={()=>{setShowAcceptModal(true); setSelectedQuotation(quotation)}}><CheckCircle className="w-4 h-4 my-auto mr-1" /> Accept</button>}
                          {(user.role === 'customer' || user.role === 'sales') && (quotation.status === 'ACCEPTED') && showPayRemainingButton && <button className='w-full flex align-center justify-center bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm font-medium' onClick={()=>{setShowPayRemainingModal(true); setSelectedQuotation(quotation)}}><Wallet className="w-4 h-4 my-auto mr-1" /> Pay Remaining</button>}
                          {(user.role === 'customer' || user.role === 'sales') && (quotation.status === 'SENT') && <div className='flex align-center justify-center text-nowrap gap-1 px-2 py-1 rounded-full text-xs font-medium'><Timer className="w-4 h-4 my-auto mr-1" /> <span className={getTimeLeft(quotation.expiry_date)?.expired ? 'text-red-600 font-semibold' : 'text-gray-700'}>{getTimeLeft(quotation.expiry_date)?.text}</span></div>}
                        </div>
                      ))
                    }
                  </div>

                  {
                    invoice && (<>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-md font-semibold mb-2">Invoice Details</h4>
                        <p className="text-sm text-gray-600">Invoice Number: <span className="font-medium text-gray-900">{invoice.invoice_number}</span></p>
                        <p className="text-sm text-gray-600">Invoice Date: <span className="font-medium text-gray-900">{formatDate(invoice.created_at)}</span></p>
                        <Button
                          size="sm"
                          onClick={downloadInvoice}
                          className="mt-4 bg-green-600 hover:bg-green-700 text-white w-full"
                          data-testid="download-invoice-button"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Invoice
                        </Button>
                      </div>
                    </>)
                  }

                  {(user.role === 'operations') && <Button
                    size="sm"
                    onClick={() => navigate('/quotation-builder', { state: { request } })}
                    className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                    data-testid="create-detailed-quotation-button"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Quotation
                  </Button>}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="activity-timeline overflow-y-auto max-h-72 space-y-4">
                {[...activities, ...activities].map((activity, index) => (
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
              By accepting this quotation, an invoice will be generated and you will be required to pay the advance amount of {formatCurrency(selectedQuotation?.advance_amount)}.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="font-medium">Total Amount: {formatCurrency(selectedQuotation?.total_amount)}</p>
              <p className="text-sm text-gray-600 mt-1">Advance to be paid: {formatCurrency(selectedQuotation?.advance_amount)}</p>
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

      {/* Pay Remaining Modal */}
      <Dialog open={showPayRemainingModal} onOpenChange={setShowPayRemainingModal}>
        <DialogContent data-testid="pay-remaining-modal">
          <DialogHeader>
            <DialogTitle>Pay Remaining Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              You have paid the advance amount. Please proceed to pay the remaining amount of {formatCurrency(selectedQuotation?.total_amount - selectedQuotation?.advance_amount)}.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="font-medium">Total Amount: {formatCurrency(selectedQuotation?.total_amount)}</p>
              <p className="text-sm text-gray-600 mt-1">Remaining to be paid: {formatCurrency(selectedQuotation?.total_amount - selectedQuotation?.advance_amount)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayRemainingModal(false)}>Cancel</Button>
            <Button
              onClick={payRemaining}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="confirm-pay-remaining-button"
            >
              Proceed to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Breakup Modal */}
      <Dialog open={openCostBreakupModal} onOpenChange={setOpenCostBreakupModal}>
        <DialogContent className="max-w-4xl w-full" data-testid="cost-breakup-modal">
          <DialogHeader>
            <DialogTitle>Cost Breakup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {costBreakupLoading ? (
              <p>Loading...</p>
            ) : costBreakup ? (
              <div className="space-y-2 overflow-y-auto max-h-96">
                {costBreakup.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`line-item-row`}
                    data-testid={`line-item-${itemIndex}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                      {itemIndex + 1}
                    </div>
                    <>
                      <div className="col-span-2">
                        <p className="font-medium">{item.name}</p>
                      </div>
                      <div className="text-right">{formatCurrency(item.unit_cost)}</div>
                      <div className="text-center">x {item.quantity}</div>
                      <div className="text-right font-medium">{formatCurrency(item.unit_cost * item.quantity)}</div>
                    </>
                  </div>
                ))}
              </div>
            ) : (
              <p>No cost breakup available.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCostBreakupModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
