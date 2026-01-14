import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, Plus, Trash2, Save, Upload, Star, Calendar, 
  Users, DollarSign, MapPin, Clock, Hotel, Plane, Activity as ActivityIcon, FileText
} from 'lucide-react';
import { toast } from 'sonner';

const QuotationBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { request, quotation } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  const [formData, setFormData] = useState({
    tripTitle: '',
    customerName: '',
    dates: '',
    city: '',
    bookingRef: '',
    coverImage: '',
    salesperson: {
      name: '',
      phone: '',
      email: '',
      photo: ''
    },
    summary: {
      duration: '',
      travelers: 1,
      rating: 5.0,
      highlights: []
    },
    pricing: {
      subtotal: 0,
      taxes: 0,
      discount: 0,
      total: 0,
      perPerson: 0,
      depositDue: 0,
      currency: 'INR'
    },
    days: [],
    gallery: [],
    terms: {
      cancellation: '',
      payment: '',
      insurance: '',
      changes: ''
    },
    inclusions: [],
    exclusions: [],
    detailedTerms: '',
    privacyPolicy: '',
    testimonials: []
  });

  const [newHighlight, setNewHighlight] = useState('');
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newActivity, setNewActivity] = useState({
    time: '',
    title: '',
    description: '',
    images: [],
    meetingPoint: '',
    type: 'activity'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load admin settings
      const settingsResponse = await api.getAdminSettings();
      setAdminSettings(settingsResponse.data);
      
      // Load catalog for activities
      const catalogResponse = await api.getCatalog();
      setCatalog(catalogResponse.data);
      
      // Pre-fill form data
      const initialData = { ...formData };
      
      // From admin settings
      if (settingsResponse.data) {
        initialData.inclusions = settingsResponse.data.default_inclusions || [];
        initialData.exclusions = settingsResponse.data.default_exclusions || [];
        initialData.detailedTerms = settingsResponse.data.terms_and_conditions || '';
        initialData.privacyPolicy = settingsResponse.data.privacy_policy || '';
        initialData.testimonials = settingsResponse.data.testimonials || [];
      }
      
      // From request data
      if (request) {
        initialData.customerName = request.client_name || '';
        initialData.city = request.destination || '';
        initialData.dates = `${request.travel_start_date || ''} to ${request.travel_end_date || ''}`;
        initialData.summary.travelers = request.num_travelers || 1;
        initialData.bookingRef = `REF-${request.id?.substring(0, 8).toUpperCase()}`;
      }
      
      // From user data (salesperson)
      if (user) {
        initialData.salesperson = {
          name: user.name || '',
          phone: user.country_code && user.phone ? `${user.country_code} ${user.phone}` : user.phone || '',
          email: user.email || '',
          photo: user.profile_picture || 'https://via.placeholder.com/150'
        };
      }
      
      setFormData(initialData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setFormData(prev => ({
        ...prev,
        summary: {
          ...prev.summary,
          highlights: [...prev.summary.highlights, newHighlight.trim()]
        }
      }));
      setNewHighlight('');
    }
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      summary: {
        ...prev.summary,
        highlights: prev.summary.highlights.filter((_, i) => i !== index)
      }
    }));
  };

  const addDay = () => {
    const dayNumber = formData.days.length + 1;
    setFormData(prev => ({
      ...prev,
      days: [
        ...prev.days,
        {
          dayNumber,
          date: '',
          location: '',
          meals: {
            breakfast: 'Not Included',
            lunch: 'Not Included',
            dinner: 'Not Included'
          },
          hotel: null,
          activities: []
        }
      ]
    }));
  };

  const removeDay = (index) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.filter((_, i) => i !== index).map((day, idx) => ({
        ...day,
        dayNumber: idx + 1
      }))
    }));
  };

  const updateDay = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, i) => 
        i === index ? { ...day, [field]: value } : day
      )
    }));
  };

  const addActivityToDay = (dayIndex, activity) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, i) => 
        i === dayIndex 
          ? { ...day, activities: [...day.activities, activity] }
          : day
      )
    }));
  };

  const removeActivityFromDay = (dayIndex, activityIndex) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, i) => 
        i === dayIndex 
          ? { ...day, activities: day.activities.filter((_, ai) => ai !== activityIndex) }
          : day
      )
    }));
  };

  const addActivityFromCatalog = (dayIndex, catalogItem) => {
    const activity = {
      time: '09:00 AM',
      title: catalogItem.name,
      description: catalogItem.description || '',
      images: catalogItem.image_url ? [catalogItem.image_url] : [],
      meetingPoint: catalogItem.location || '',
      type: catalogItem.type || 'activity'
    };
    addActivityToDay(dayIndex, activity);
  };

  const calculatePricing = () => {
    // Auto-calculate pricing based on days and activities
    // This is a simple calculation - can be enhanced
    const subtotal = formData.days.reduce((sum, day) => {
      return sum + (day.activities.length * 1000); // Simple calculation
    }, 0);
    
    const taxes = subtotal * 0.18; // 18% GST
    const total = subtotal + taxes - formData.pricing.discount;
    const perPerson = formData.summary.travelers > 0 ? total / formData.summary.travelers : total;
    const depositDue = total * 0.3; // 30% advance
    
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        subtotal,
        taxes,
        total,
        perPerson,
        depositDue
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validation
      if (!formData.tripTitle || !formData.customerName) {
        toast.error('Please fill in trip title and customer name');
        return;
      }
      
      if (formData.days.length === 0) {
        toast.error('Please add at least one day to the itinerary');
        return;
      }
      
      // Calculate pricing before save
      calculatePricing();
      
      // Prepare quotation data
      const quotationData = {
        request_id: request?.id,
        detailed_quotation_data: formData,
        versions: quotation?.versions || [{
          version_number: 1,
          options: [{
            name: 'Option A',
            line_items: [],
            subtotal: formData.pricing.subtotal,
            tax_amount: formData.pricing.taxes,
            total: formData.pricing.total,
            is_recommended: true
          }],
          created_by: user.id,
          created_by_name: user.name,
          change_notes: 'Detailed quotation created',
          is_current: true
        }],
        status: 'DRAFT',
        grand_total: formData.pricing.total,
        advance_percent: 30,
        advance_amount: formData.pricing.depositDue
      };
      
      // Save quotation
      if (quotation?.id) {
        await api.updateQuotation(quotation.id, quotationData);
        toast.success('Quotation updated successfully!');
      } else {
        await api.createQuotation(quotationData);
        toast.success('Quotation created successfully!');
      }
      
      // Navigate back to request detail
      navigate(`/requests/${request?.id}`);
      
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Validation
      if (!formData.tripTitle || !formData.customerName) {
        toast.error('Please fill in trip title and customer name');
        return;
      }
      
      if (formData.days.length === 0) {
        toast.error('Please add at least one day to the itinerary');
        return;
      }
      
      // Calculate pricing before generating PDF
      calculatePricing();
      
      // Generate PDF
      const response = await api.generateDetailedPDF(formData);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation_${formData.bookingRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quotation builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotation Builder</h1>
            <p className="text-gray-600">Create detailed quotation with itinerary</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            {generatingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate PDF
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Quotation
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Trip Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Trip Header
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tripTitle">Trip Title *</Label>
                <Input
                  id="tripTitle"
                  value={formData.tripTitle}
                  onChange={(e) => handleInputChange(null, 'tripTitle', e.target.value)}
                  placeholder="e.g., 5 Days Kashmir Adventure"
                />
              </div>
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange(null, 'customerName', e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="dates">Dates</Label>
                <Input
                  id="dates"
                  value={formData.dates}
                  onChange={(e) => handleInputChange(null, 'dates', e.target.value)}
                  placeholder="e.g., 15 Jan to 20 Jan 2025"
                />
              </div>
              <div>
                <Label htmlFor="city">Destination City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange(null, 'city', e.target.value)}
                  placeholder="e.g., Srinagar"
                />
              </div>
              <div>
                <Label htmlFor="bookingRef">Booking Reference</Label>
                <Input
                  id="bookingRef"
                  value={formData.bookingRef}
                  onChange={(e) => handleInputChange(null, 'bookingRef', e.target.value)}
                  placeholder="e.g., REF-12345"
                />
              </div>
              <div>
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input
                  id="coverImage"
                  value={formData.coverImage}
                  onChange={(e) => handleInputChange(null, 'coverImage', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salesperson Info */}
        <Card>
          <CardHeader>
            <CardTitle>Salesperson Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salesName">Name</Label>
                <Input
                  id="salesName"
                  value={formData.salesperson.name}
                  onChange={(e) => handleInputChange('salesperson', 'name', e.target.value)}
                  placeholder="Salesperson name"
                />
              </div>
              <div>
                <Label htmlFor="salesPhone">Phone</Label>
                <Input
                  id="salesPhone"
                  value={formData.salesperson.phone}
                  onChange={(e) => handleInputChange('salesperson', 'phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="salesEmail">Email</Label>
                <Input
                  id="salesEmail"
                  value={formData.salesperson.email}
                  onChange={(e) => handleInputChange('salesperson', 'email', e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="salesPhoto">Photo URL</Label>
                <Input
                  id="salesPhoto"
                  value={formData.salesperson.photo}
                  onChange={(e) => handleInputChange('salesperson', 'photo', e.target.value)}
                  placeholder="Photo URL"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Trip Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.summary.duration}
                    onChange={(e) => handleInputChange('summary', 'duration', e.target.value)}
                    placeholder="e.g., 5 Days / 4 Nights"
                  />
                </div>
                <div>
                  <Label htmlFor="travelers">Number of Travelers</Label>
                  <Input
                    id="travelers"
                    type="number"
                    min="1"
                    value={formData.summary.travelers}
                    onChange={(e) => handleInputChange('summary', 'travelers', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.summary.rating}
                    onChange={(e) => handleInputChange('summary', 'rating', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Highlights</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.summary.highlights.map((highlight, index) => (
                    <Badge key={index} className="flex items-center gap-2">
                      {highlight}
                      <button
                        onClick={() => removeHighlight(index)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                    placeholder="Add a highlight"
                  />
                  <Button onClick={addHighlight} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subtotal">Subtotal</Label>
                <Input
                  id="subtotal"
                  type="number"
                  value={formData.pricing.subtotal}
                  onChange={(e) => handleInputChange('pricing', 'subtotal', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="taxes">Taxes (18% GST)</Label>
                <Input
                  id="taxes"
                  type="number"
                  value={formData.pricing.taxes}
                  onChange={(e) => handleInputChange('pricing', 'taxes', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.pricing.discount}
                  onChange={(e) => handleInputChange('pricing', 'discount', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Total</Label>
                <Input
                  value={formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Per Person</Label>
                <Input
                  value={(formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount) / formData.summary.travelers}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Deposit Due (30%)</Label>
                <Input
                  value={(formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount) * 0.3}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={calculatePricing} variant="outline" className="w-full">
                Auto-Calculate Pricing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Day-by-Day Itinerary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Day-by-Day Itinerary
              </div>
              <Button onClick={addDay} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Day
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.days.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No days added yet. Click "Add Day" to start building your itinerary.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Day {day.dayNumber}</h3>
                      <Button
                        onClick={() => removeDay(dayIndex)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={day.date}
                          onChange={(e) => updateDay(dayIndex, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input
                          value={day.location}
                          onChange={(e) => updateDay(dayIndex, 'location', e.target.value)}
                          placeholder="e.g., Srinagar"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <Label className="mb-2 block">Meals</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={day.meals.breakfast}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, breakfast: e.target.value })}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                          <option>At Hotel</option>
                        </select>
                        <select
                          value={day.meals.lunch}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, lunch: e.target.value })}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                        </select>
                        <select
                          value={day.meals.dinner}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, dinner: e.target.value })}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                          <option>At Hotel</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Activities</Label>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedDay(dayIndex);
                              setShowActivityModal(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            From Catalog
                          </Button>
                          <Button
                            onClick={() => {
                              const activity = {
                                time: '09:00 AM',
                                title: 'New Activity',
                                description: '',
                                images: [],
                                meetingPoint: '',
                                type: 'activity'
                              };
                              addActivityToDay(dayIndex, activity);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Custom
                          </Button>
                        </div>
                      </div>
                      
                      {day.activities.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                          No activities added
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {day.activities.map((activity, actIndex) => (
                            <div key={actIndex} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={activity.time}
                                    onChange={(e) => {
                                      const updatedActivities = [...day.activities];
                                      updatedActivities[actIndex].time = e.target.value;
                                      updateDay(dayIndex, 'activities', updatedActivities);
                                    }}
                                    placeholder="Time"
                                  />
                                  <Input
                                    value={activity.title}
                                    onChange={(e) => {
                                      const updatedActivities = [...day.activities];
                                      updatedActivities[actIndex].title = e.target.value;
                                      updateDay(dayIndex, 'activities', updatedActivities);
                                    }}
                                    placeholder="Activity title"
                                  />
                                </div>
                                <Textarea
                                  value={activity.description}
                                  onChange={(e) => {
                                    const updatedActivities = [...day.activities];
                                    updatedActivities[actIndex].description = e.target.value;
                                    updateDay(dayIndex, 'activities', updatedActivities);
                                  }}
                                  placeholder="Description"
                                  className="mt-2"
                                  rows="2"
                                />
                              </div>
                              <Button
                                onClick={() => removeActivityFromDay(dayIndex, actIndex)}
                                variant="outline"
                                size="sm"
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inclusions (Read-only from admin settings but editable) */}
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.inclusions.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <span className="flex-1">✓ {item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Populated from admin settings. Operations can edit via backend API.
            </p>
          </CardContent>
        </Card>

        {/* Exclusions (Read-only from admin settings but editable) */}
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.exclusions.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                  <span className="flex-1">✗ {item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Populated from admin settings. Operations can edit via backend API.
            </p>
          </CardContent>
        </Card>

        {/* Terms & Conditions (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formData.detailedTerms || 'No terms and conditions set in admin settings'}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Auto-filled from admin settings (read-only)
            </p>
          </CardContent>
        </Card>

        {/* Testimonials (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            {formData.testimonials.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No testimonials set in admin settings
              </div>
            ) : (
              <div className="space-y-3">
                {formData.testimonials.map((testimonial, index) => (
                  <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{testimonial.name}</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{testimonial.text}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Auto-filled from admin settings (read-only)
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pb-6">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            {generatingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Quotation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Activity Catalog Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Activity from Catalog</h2>
              <Button
                onClick={() => setShowActivityModal(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {catalog
                .filter(item => item.type === 'activity')
                .map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => {
                      addActivityFromCatalog(selectedDay, item);
                      setShowActivityModal(false);
                    }}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.location}</p>
                  </div>
                ))}
            </div>
            
            {catalog.filter(item => item.type === 'activity').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No activities in catalog. Add activities to catalog first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationBuilder;
