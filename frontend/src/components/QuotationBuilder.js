import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import { v4 as uuid } from 'uuid';

const QuotationBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { request, quotation_id } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showTnc, setShowTnc] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTestimonials, setShowTestimonials] = useState(false);

  const [detailedTerms, setDetailedTerms] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [testimonials, setTestimonials] = useState([]);

  const [expiry_date, setExpiryDate] = useState('');

  const [costBreakup, setCostBreakup] = useState([])

  const [formData, setFormData] = useState({
    tripTitle: '',
    city: '',
    bookingRef: '',
    start_date: '',
    end_date: '',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    summary: {
      duration: '',
      travelers: 1,
      rating: 4.8,
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
    inclusions: [],
    exclusions: []
  });

  const [newHighlight, setNewHighlight] = useState('');
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!request) {
        navigate('/dashboard');
      }
      console.log('Loading quotation builder for request:', request);
      setLoading(true);

      // Load admin settings
      const settingsResponse = await api.getAdminSettings();
      setAdminSettings(settingsResponse.data);

      // Load catalog for activities
      const catalogResponse = await api.getCatalog();
      setCatalog(catalogResponse.data);
      setActivities(catalogResponse.data.filter(item => item.type !== 'hotel'));
      setHotels(catalogResponse.data.filter(item => item.type === 'hotel'));

      // Pre-fill form data
      const initialData = { ...formData };

      // From admin settings
      if (settingsResponse.data) {
        initialData.inclusions = settingsResponse.data.default_inclusions || [];
        initialData.exclusions = settingsResponse.data.default_exclusions || [];
        setDetailedTerms(settingsResponse.data.terms_and_conditions || '');
        setPrivacyPolicy(settingsResponse.data.privacy_policy || '');
        setTestimonials(settingsResponse.data.testimonials || []);
      }

      // From request data
      if (request) {
        initialData.city = request.destination || '';
        initialData.summary.travelers = request.num_travelers || 1;
        initialData.bookingRef = `REF-${request.id?.substring(0, 8).toUpperCase()}`;
        initialData.tripTitle = request.title || '';
        initialData.start_date = request.start_date || '';
        initialData.end_date = request.end_date || '';
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
      if(section === 'pricing' && field === 'subtotal') {
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
            taxes: value * 0.18,
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        }));
      }
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

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()]
      }));
      setNewInclusion('');
    }
  };

  const removeInclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        exclusions: [...prev.exclusions, newExclusion.trim()]
      }));
      setNewExclusion('');
    }
  };

  const removeExclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index)
    }));
  };

  const generateDays = (dayCount) => {
    const days = Array.from({ length: dayCount }, (_, idx) => ({
      dayNumber: idx + 1,
      date: new Date(new Date(formData.start_date).getTime() + idx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: '',
      meals: {
        breakfast: 'Not Included',
        lunch: 'Not Included',
        dinner: 'Not Included'
      },
      hotel: null,
      activities: []
    }));

    return days;
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
    if (field === 'hotel') {

      setCostBreakup(prev => prev.filter(item => item.id !== formData.days[index].hotel.id));

      setFormData(prev => ({
        ...prev,
        days: prev.days.map((day, i) =>
          i === index ? {
            ...day, meals: {
              breakfast: day.meals.breakfast === "At Hotel" ? "" : day.meals.breakfast,
              lunch: day.meals.lunch === "At Hotel" ? "" : day.meals.lunch,
              dinner: day.meals.dinner === "At Hotel" ? "" : day.meals.dinner
            }, [field]: value
          } : day
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        days: prev.days.map((day, i) =>
          i === index ? { ...day, [field]: value } : day
        ),
      }));
    }
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
    setCostBreakup(prev => prev.filter(item => item.id !== formData.days[dayIndex].activities[activityIndex].id));
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
    const id = uuid();
    const activity = {
      id,
      time: '09:00 AM',
      title: catalogItem.name,
      description: catalogItem.description || '',
      image: catalogItem.image_url,
      meetingPoint: catalogItem.destination || '',
      type: 'Included'
    };
    const activityCostBreakup = {
      id,
      name: catalogItem.name + " - " + catalogItem.supplier,
      date: formData.days[dayIndex].date,
      quantity: 1,
      unit_cost: catalogItem.default_price || 0
    }
    setCostBreakup(prev => [...prev, activityCostBreakup]);
    addActivityToDay(dayIndex, activity);
  };

  const addHotelFromCatalog = (dayIndex, catalogItem) => {
    const id = uuid();
    const hotel = {
      id,
      name: catalogItem.name,
      stars: catalogItem.rating || 0,
      image: catalogItem.image_url || '',
      address: catalogItem.destination || '',
      amenities: (catalogItem.description || "").split(",").map(a => a.trim()),
    };
    const hotelCostBreakup = {
      id,
      name: catalogItem.name + " - " + catalogItem.supplier,
      date: formData.days[dayIndex].date,
      quantity: 1,
      unit_cost: catalogItem.default_price || 0
    };
    setCostBreakup(prev => [...prev, hotelCostBreakup]);
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i === dayIndex ? { ...day, hotel } : day
      )
    }));
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

  const validateQuotation = () => {
  // --- Basic Trip Info ---
  if (!formData.tripTitle?.trim()) {
    toast.error('Trip title is required');
    return false;
  }

  if (!formData.city?.trim()) {
    toast.error('Destination is required');
    return false;
  }

  if (!formData.start_date || !formData.end_date) {
    toast.error('Start and end dates are required');
    return false;
  }

  if (new Date(formData.start_date) > new Date(formData.end_date)) {
    toast.error('End date cannot be before start date');
    return false;
  }

  if (formData.summary.travelers < 1) {
    toast.error('At least 1 traveler is required');
    return false;
  }

  // --- Days Validation ---
  if (!formData.days.length) {
    toast.error('Please add at least one day to the itinerary');
    return false;
  }

  for (let i = 0; i < formData.days.length; i++) {
    const day = formData.days[i];

    if (!day.location?.trim()) {
      toast.error(`Location is required for Day ${day.dayNumber}`);
      return false;
    }

    // Meals validation
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      if (day.meals[meal] === 'At Hotel' && !day.hotel) {
        toast.error(`Hotel required for "${meal}" on Day ${day.dayNumber}`);
        throw new Error('Validation failed');
      }
    });

    // Activities
    for (let j = 0; j < day.activities.length; j++) {
      const act = day.activities[j];

      if (!act.time || !act.title?.trim() || !act.meetingPoint?.trim()) {
        toast.error(
          `Incomplete activity details on Day ${day.dayNumber}`
        );
        return false;
      }
    }
  }

  // --- Cost Breakup Validation ---
  for (const item of costBreakup) {
    if (!item.name || !item.date) {
      toast.error('Invalid cost breakup item detected');
      return false;
    }

    if (item.quantity <= 0) {
      toast.error(`Quantity must be > 0 for ${item.name}`);
      return false;
    }

    if (item.unit_cost < 0) {
      toast.error(`Unit cost cannot be negative for ${item.name}`);
      return false;
    }
  }

  // --- Pricing Validation ---
  const { subtotal, taxes, discount, total, perPerson } = formData.pricing;

  if (subtotal < 0 || taxes < 0 || discount < 0) {
    toast.error('Pricing values cannot be negative');
    return false;
  }

  if (discount > subtotal + taxes) {
    toast.error('Discount cannot exceed total amount');
    return false;
  }

  if (total < 0 || perPerson <= 0) {
    toast.error('Invalid pricing calculation');
    return false;
  }

  return true;
};


  const handleSave = async (status='DRAFT', expiry_date) => {
    try {

      // 5 days 4 nights
      const dayCount = (new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24);
      const durationText = `${dayCount + 1} Days ${dayCount} Nights`;
      const requestId = request?.id;
      
      const detailed_quotation_data = JSON.parse(JSON.stringify(formData));
      detailed_quotation_data.summary.duration = durationText;

      //add all the validations 
       if (!validateQuotation()) return;
      const payload = {
        request_id: requestId,
        status: status || 'DRAFT',
        detailed_quotation_data,
        expiry_date: expiry_date || null,
        cost_breakup: costBreakup
      }

      setSaving(true);

      await api.createQuotation(payload)
      toast.success('Quotation saved successfully!');
      navigate(`/requests/${requestId}`);

      // Save quotation
      // if (quotation?.id) {
      //   await api.updateQuotation(quotation.id, quotationData);
      //   toast.success('Quotation updated successfully!');
      // } else {
      //   await api.createQuotation(quotationData);
      //   toast.success('Quotation created successfully!');
      // }

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
      if (!formData.tripTitle) {
        toast.error('Please fill in trip title');
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


  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      setFormData(prev => ({
        ...prev,
        days: generateDays((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24) + 1)
      }))
    }
  }, [formData.start_date, formData.end_date]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        subtotal: costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0),
        taxes: costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0) * 0.18,
        discount: prev.pricing.discount,
        total: costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0) * 1.18 - prev.pricing.discount,
        perPerson: prev.summary.travelers > 0 ? (costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0) * 1.18 - prev.pricing.discount) / prev.summary.travelers : (costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0) * 1.18 - prev.pricing.discount),
        depositDue: (costBreakup.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0) * 1.18 - prev.pricing.discount) * 0.3,
        currency: prev.pricing.currency
      }

    }));
  }, [costBreakup]);


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
            onClick={()=> handleSave()}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
            <Upload className="w-4 h-4" />
            {quotation_id ? "Update Draft" : "Save Draft"}
          </Button>

          <Input
            type="date"
            name="expiry_date"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={expiry_date}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
          <Button
            onClick={()=>{handleSave('SENT', expiry_date)}}
            disabled={saving || !expiry_date}
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
            <div className="flex flex-wrap">
              <div className='w-1/2 pe-1 pt-4'>
                <Label htmlFor="tripTitle">Trip Title</Label>
                <Input
                  id="tripTitle"
                  value={formData.tripTitle}
                  onChange={(e) => handleInputChange(null, 'tripTitle', e.target.value)}
                  placeholder="e.g., 5 Days Kashmir Adventure"
                />
              </div>
              <div className='w-1/2 ps-1 pt-4'>
                <Label htmlFor="city">Destination</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange(null, 'city', e.target.value)}
                  placeholder="e.g., Srinagar"
                />
              </div>
              <div className="w-1/3 pe-1 pt-4">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  value={formData.start_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange(null, 'start_date', e.target.value)}
                  type="date"
                />
              </div>
              <div className="w-1/3 px-1 pt-4">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={(e) => handleInputChange(null, 'end_date', e.target.value)}
                  type="date"
                />
              </div>
              <div className="w-1/3 ps-1 pt-4">
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
              </div>
              <div className="w-1/2 pe-1 pt-4">
                <Label htmlFor="bookingRef">Booking Reference</Label>
                <Input
                  id="bookingRef"
                  value={formData.bookingRef}
                  onChange={(e) => handleInputChange(null, 'bookingRef', e.target.value)}
                  placeholder="e.g., REF-12345"
                  disabled={true}
                />
              </div>
              <div className="w-1/2 ps-1 pt-4">
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


        {/* Day-by-Day Itinerary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Day-by-Day Itinerary
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.days.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Select start and end dates to auto-generate itinerary days.
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
                          disabled={true}
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
                      <div>
                        <Label>Hotel &#40;If Needed&#41;</Label>
                        <br />
                        {!day.hotel && <Button
                          onClick={() => {
                            setSelectedDay(dayIndex);
                            setShowHotelModal(true);
                          }}
                          variant="outline"
                          className="w-full flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Select Hotel
                        </Button>}
                        {day.hotel && (
                          <div className="w-full h-9 border rounded-md px-3 flex items-center justify-between">
                            <div className='text-sm'>
                              <span className="truncate">
                                {day.hotel.name}
                                <span className="text-yellow-500 ml-1">
                                  {'★'.repeat(day.hotel.stars)}
                                </span>
                              </span>
                            </div>


                            <Button
                              onClick={() => updateDay(dayIndex, 'hotel', null)}
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label className="mb-2 block">Meals</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="font-medium text-xs text-gray-500">Breakfast</label>
                        <label className="font-medium text-xs text-gray-500">Lunch</label>
                        <label className="font-medium text-xs text-gray-500">Dinner</label>
                        <select
                          value={day.meals.breakfast}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, breakfast: e.target.value })}
                          className="px-3 py-2 border rounded-lg bg-white"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                          <option disabled={!day.hotel}>At Hotel</option>
                        </select>
                        <select
                          value={day.meals.lunch}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, lunch: e.target.value })}
                          className="px-3 py-2 border rounded-lg bg-white"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                          <option disabled={!day.hotel}>At Hotel</option>
                        </select>
                        <select
                          value={day.meals.dinner}
                          onChange={(e) => updateDay(dayIndex, 'meals', { ...day.meals, dinner: e.target.value })}
                          className="px-3 py-2 border rounded-lg bg-white"
                        >
                          <option>Not Included</option>
                          <option>Included</option>
                          <option disabled={!day.hotel}>At Hotel</option>
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
                            Add Activity
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
                                <div className="grid grid-cols-4 gap-2">
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
                                  <Input
                                    value={activity.meetingPoint}
                                    onChange={(e) => {
                                      const updatedActivities = [...day.activities];
                                      updatedActivities[actIndex].meetingPoint = e.target.value;
                                      updateDay(dayIndex, 'activities', updatedActivities);
                                    }}
                                    placeholder="location / meeting point"
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

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>

            <div>
              {
                costBreakup.length > 0 && (
                  <div className="mb-4">
                    <Label className="mb-2 block">Cost Breakup</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      <table className="w-full table-auto">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left">Item</th>
                            <th className="px-4 py-2 text-right">Date</th>
                            <th className="px-4 py-2 text-right">Quantity</th>
                            <th className="px-4 py-2 text-right">Unit Cost</th>
                            <th className="px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costBreakup.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-2">{item.name}</td>
                              <td className="px-4 py-2 text-right">{item.date}</td>
                              <td className="px-4 py-2 text-right">
                                <Input
                                  type="number"
                                  value={item.quantity || 0}
                                  onChange={(e) => {
                                    const updatedCostBreakup = [...costBreakup];
                                    updatedCostBreakup[costBreakup.indexOf(item)].quantity = parseFloat(e.target.value);
                                    setCostBreakup(updatedCostBreakup);
                                  }}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <Input
                                  type="number"
                                  value={item.unit_cost}
                                  onChange={(e) => {
                                    const updatedCostBreakup = [...costBreakup];
                                    updatedCostBreakup[costBreakup.indexOf(item)].unit_cost = parseFloat(e.target.value);
                                    setCostBreakup(updatedCostBreakup);
                                  }}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">{(item.quantity * item.unit_cost).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }
            </div>
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
                  value={formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount || 0}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Per Person</Label>
                <Input
                  value={(formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount) / formData.summary.travelers || 0}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Deposit Due (30%)</Label>
                <Input
                  value={(formData.pricing.subtotal + formData.pricing.taxes - formData.pricing.discount) * 0.3 || 0}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>  
          </CardContent>
        </Card>


        {/* Inclusions (Editable for current quotation) */}
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add new inclusion */}
              <div className="flex gap-2">
                <Input
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  placeholder="Add inclusion item..."
                  onKeyPress={(e) => e.key === 'Enter' && addInclusion()}
                />
                <Button
                  type="button"
                  onClick={addInclusion}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              {/* Inclusions list */}
              <div className="space-y-2">
                {formData.inclusions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No inclusions added yet
                  </div>
                ) : (
                  formData.inclusions.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="flex-1 text-green-800">✓ {item}</span>
                      <Button
                        type="button"
                        onClick={() => removeInclusion(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-gray-500">
                Pre-filled from admin settings. You can add or remove items for this specific quotation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Exclusions (Editable for current quotation) */}
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add new exclusion */}
              <div className="flex gap-2">
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  placeholder="Add exclusion item..."
                  onKeyPress={(e) => e.key === 'Enter' && addExclusion()}
                />
                <Button
                  type="button"
                  onClick={addExclusion}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              {/* Exclusions list */}
              <div className="space-y-2">
                {formData.exclusions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No exclusions added yet
                  </div>
                ) : (
                  formData.exclusions.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="flex-1 text-red-800">✗ {item}</span>
                      <Button
                        type="button"
                        onClick={() => removeExclusion(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-gray-500">
                Pre-filled from admin settings. You can add or remove items for this specific quotation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className='flex justify-between'>
                Terms & Conditions
                <button
                  onClick={() => setShowTnc(!showTnc)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showTnc ? 'Hide' : 'Show'} Terms & Conditions
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          {showTnc && (<CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {detailedTerms || 'No terms and conditions set in admin settings'}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Auto-filled from admin settings (read-only)
            </p>
          </CardContent>)}
        </Card>

        {/* Privacy Policy (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className='flex justify-between'>
                Privacy Policy
                <button
                  onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showPrivacyPolicy ? 'Hide' : 'Show'} Privacy Policy
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          {showPrivacyPolicy && (<CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {privacyPolicy || 'No privacy policy set in admin settings'}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Auto-filled from admin settings (read-only)
            </p>
          </CardContent>)}
        </Card>

        {/* Testimonials (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className='flex justify-between'>
                Testimonials
                <button
                  onClick={() => setShowTestimonials(!showTestimonials)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showTestimonials ? 'Hide' : 'Show'} Testimonials
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          {showTestimonials && (<CardContent>
            {testimonials.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No testimonials set in admin settings
              </div>
            ) : (
              <div className="space-y-3">
                {testimonials.map((testimonial, index) => (
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
          </CardContent>)}
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
            onClick={()=>handleSave()}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
            <Upload className="w-4 h-4" />
            Save Draft
          </Button>

          <Input
            type="date"
            name="expiry_date"
            className="border border-gray-300 rounded-lg px-3 py-2 w-[150px]"
            value={expiry_date}
            onChange={(e) => setExpiryDate(e.target.value)}
          />  
          <Button
            onClick={()=>handleSave('SENT', expiry_date)}
            disabled={saving || !expiry_date}
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
              {activities
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

            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No activities in catalog. Add activities to catalog first.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotel Catalog Modal */}
      {showHotelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Hotel from Catalog</h2>
              <Button
                onClick={() => setShowHotelModal(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {hotels
                .filter(item => item.type === 'hotel')
                .map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => {
                      addHotelFromCatalog(selectedDay, item);
                      setShowHotelModal(false);
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

            {hotels.length === 0 && (
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
