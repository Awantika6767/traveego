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
  ArrowLeft, Plus, Trash2, Save, FileText, Plane, Train, Bus, Car,
  MapPin, Clock, Calendar, DollarSign, Hotel as HotelIcon, Eye, File
} from 'lucide-react';
import { toast } from 'sonner';

const QuotationBuilderNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { request, quotation_id } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('all');

  // Service types from request
  const [serviceTypes, setServiceTypes] = useState({
    isHolidayPackage: false,
    isMICE: false,
    isHotelBooking: false,
    isSightseeing: false,
    isVisa: false,
    isTransportService: false
  });

  const [formData, setFormData] = useState({
    tripTitle: '',
    city: '',
    bookingRef: '',
    start_date: '',
    end_date: '',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
    
    // Service flags
    is_holiday_package: false,
    is_mice: false,
    is_hotel_booking: false,
    is_sightseeing: false,
    is_visa: false,
    is_transport_service: false,
    
    // Pricing
    pricing: {
      subtotal: 0,
      taxes: 0,
      discount: 0,
      total: 0,
      perPerson: 0,
      depositDue: 0,
      currency: 'INR'
    },
    
    // Transport legs
    transport_legs: [],
    
    // Hotel bookings
    hotel_bookings: [],
    
    // Visa services
    visa_services: [],
    
    // Sightseeing services
    sightseeing_services: [],
    
    // Day-by-day itinerary (for holiday packages)
    days: [],
    
    // Common
    inclusions: [],
    exclusions: []
  });

  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!request) {
        navigate('/dashboard');
        return;
      }
      
      setLoading(true);

      // Load admin settings
      const settingsResponse = await api.getAdminSettings();
      setAdminSettings(settingsResponse.data);

      // Load catalog
      const catalogResponse = await api.getCatalog();
      setCatalog(catalogResponse.data);

      // Detect service types from request
      const services = {
        isHolidayPackage: request.is_holiday_package_required || false,
        isMICE: request.is_mice_required || false,
        isHotelBooking: request.is_hotel_booking_required || false,
        isSightseeing: request.is_sight_seeing_required || false,
        isVisa: request.is_visa_required || false,
        isTransportService: request.is_transport_within_city_required || request.is_transfer_to_destination_required || false
      };
      setServiceTypes(services);

      // Pre-fill form data
      const initialData = {
        ...formData,
        tripTitle: `${request.destination} Travel Package`,
        city: request.destination || '',
        bookingRef: `TRV-${request.id.slice(0, 8).toUpperCase()}`,
        start_date: request.start_date || '',
        end_date: request.end_date || '',
        
        is_holiday_package: services.isHolidayPackage,
        is_mice: services.isMICE,
        is_hotel_booking: services.isHotelBooking,
        is_sightseeing: services.isSightseeing,
        is_visa: services.isVisa,
        is_transport_service: services.isTransportService,
        
        inclusions: settingsResponse.data.default_inclusions || [],
        exclusions: settingsResponse.data.default_exclusions || []
      };

      setFormData(initialData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load quotation data');
      setLoading(false);
    }
  };

  // Transport Leg Functions
  const addTransportLeg = () => {
    const newLeg = {
      id: `leg-${Date.now()}`,
      leg_number: formData.transport_legs.length + 1,
      transport_type: 'cab',
      from_location: formData.transport_legs.length === 0 ? (request.source || '') : '',
      to_location: formData.transport_legs.length === 0 ? request.destination : '',
      departure_date: formData.start_date,
      departure_time: '09:00',
      arrival_date: formData.start_date,
      arrival_time: '12:00',
      vehicle_details: '',
      pickup_point: '',
      drop_point: '',
      cost: 0,
      notes: '',
      catalog_item_id: null
    };

    setFormData(prev => ({
      ...prev,
      transport_legs: [...prev.transport_legs, newLeg]
    }));
  };

  const updateTransportLeg = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.transport_legs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, transport_legs: updated };
    });
  };

  const removeTransportLeg = (index) => {
    setFormData(prev => {
      const updated = prev.transport_legs.filter((_, i) => i !== index);
      // Renumber legs
      return {
        ...prev,
        transport_legs: updated.map((leg, i) => ({ ...leg, leg_number: i + 1 }))
      };
    });
  };

  const addTransportFromCatalog = (catalogItem, legIndex) => {
    updateTransportLeg(legIndex, 'transport_type', catalogItem.type);
    updateTransportLeg(legIndex, 'vehicle_details', catalogItem.name);
    updateTransportLeg(legIndex, 'cost', catalogItem.default_price);
    updateTransportLeg(legIndex, 'catalog_item_id', catalogItem.id);
    setShowCatalogModal(false);
    toast.success('Transport details added from catalog');
  };

  // Hotel Booking Functions
  const addHotelBooking = () => {
    const newHotel = {
      id: `hotel-${Date.now()}`,
      hotel_name: '',
      location: request.destination,
      check_in_date: formData.start_date,
      check_out_date: formData.end_date,
      room_type: 'Deluxe',
      number_of_rooms: 1,
      stars: 3,
      amenities: [],
      cost_per_night: 0,
      total_nights: 1,
      total_cost: 0,
      image: '',
      catalog_item_id: null
    };

    setFormData(prev => ({
      ...prev,
      hotel_bookings: [...prev.hotel_bookings, newHotel]
    }));
  };

  const updateHotelBooking = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.hotel_bookings];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate total cost
      if (field === 'cost_per_night' || field === 'total_nights') {
        updated[index].total_cost = updated[index].cost_per_night * updated[index].total_nights;
      }
      
      return { ...prev, hotel_bookings: updated };
    });
  };

  const removeHotelBooking = (index) => {
    setFormData(prev => ({
      ...prev,
      hotel_bookings: prev.hotel_bookings.filter((_, i) => i !== index)
    }));
  };

  const addHotelFromCatalog = (catalogItem, hotelIndex) => {
    updateHotelBooking(hotelIndex, 'hotel_name', catalogItem.name);
    updateHotelBooking(hotelIndex, 'location', catalogItem.destination);
    updateHotelBooking(hotelIndex, 'cost_per_night', catalogItem.default_price);
    updateHotelBooking(hotelIndex, 'stars', catalogItem.rating || 3);
    updateHotelBooking(hotelIndex, 'image', catalogItem.image_url || '');
    updateHotelBooking(hotelIndex, 'catalog_item_id', catalogItem.id);
    setShowCatalogModal(false);
    toast.success('Hotel details added from catalog');
  };

  // Visa Service Functions
  const addVisaService = () => {
    const newVisa = {
      id: `visa-${Date.now()}`,
      country: request.destination,
      visa_type: 'Tourist Visa',
      processing_days: 7,
      cost: 0,
      documents_required: ['Passport', 'Photo', 'Application Form'],
      notes: ''
    };

    setFormData(prev => ({
      ...prev,
      visa_services: [...prev.visa_services, newVisa]
    }));
  };

  const updateVisaService = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.visa_services];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, visa_services: updated };
    });
  };

  const removeVisaService = (index) => {
    setFormData(prev => ({
      ...prev,
      visa_services: prev.visa_services.filter((_, i) => i !== index)
    }));
  };

  // Inclusions/Exclusions Functions
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

  // Calculate Pricing
  const calculatePricing = () => {
    let subtotal = 0;

    // Add transport costs
    formData.transport_legs.forEach(leg => {
      subtotal += parseFloat(leg.cost) || 0;
    });

    // Add hotel costs
    formData.hotel_bookings.forEach(hotel => {
      subtotal += parseFloat(hotel.total_cost) || 0;
    });

    // Add visa costs
    formData.visa_services.forEach(visa => {
      subtotal += parseFloat(visa.cost) || 0;
    });

    const taxes = subtotal * 0.18; // 18% GST
    const discount = parseFloat(formData.pricing.discount) || 0;
    const total = subtotal + taxes - discount;
    const travelers = parseInt(request.people_count) || 1;
    const perPerson = total / travelers;
    const depositDue = total * 0.3; // 30% deposit

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

    toast.success('Pricing calculated');
  };

  // Save Quotation
  const handleSave = async () => {
    // Validation
    if (!formData.tripTitle || !formData.city) {
      toast.error('Please fill in trip title and city');
      return;
    }

    if (serviceTypes.isTransportService && formData.transport_legs.length === 0) {
      toast.error('Please add at least one transport leg');
      return;
    }

    setSaving(true);

    try {
      // Calculate pricing before saving
      calculatePricing();

      const quotationData = {
        request_id: request.id,
        status: 'DRAFT',
        grand_total: formData.pricing.total,
        advance_percent: 30,
        advance_amount: formData.pricing.depositDue,
        detailed_quotation_data: {
          ...formData,
          id: quotation_id || `quot-${Date.now()}`
        }
      };

      if (quotation_id) {
        await api.updateQuotation(quotation_id, quotationData);
        toast.success('Quotation updated successfully');
      } else {
        await api.createQuotation(quotationData);
        toast.success('Quotation created successfully');
      }

      setTimeout(() => {
        navigate(`/requests/${request.id}`);
      }, 1000);

    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/requests/${request.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Request
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotation Builder</h1>
            <p className="text-gray-600 mt-1">Create comprehensive quotation for {request.client_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={calculatePricing} variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Calculate Pricing
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Quotation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Service Types Badge Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {serviceTypes.isHolidayPackage && <Badge className="bg-green-100 text-green-800">Holiday Package</Badge>}
            {serviceTypes.isMICE && <Badge className="bg-purple-100 text-purple-800">M.I.C.E.</Badge>}
            {serviceTypes.isHotelBooking && <Badge className="bg-blue-100 text-blue-800">Hotel Booking</Badge>}
            {serviceTypes.isSightseeing && <Badge className="bg-yellow-100 text-yellow-800">Sightseeing</Badge>}
            {serviceTypes.isVisa && <Badge className="bg-red-100 text-red-800">Visa</Badge>}
            {serviceTypes.isTransportService && <Badge className="bg-indigo-100 text-indigo-800">Transport Service</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Basic Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trip Title *</Label>
              <Input
                value={formData.tripTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, tripTitle: e.target.value }))}
                placeholder="e.g., Magical Goa Getaway"
              />
            </div>
            <div>
              <Label>City/Destination *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Goa"
              />
            </div>
            <div>
              <Label>Booking Reference</Label>
              <Input
                value={formData.bookingRef}
                onChange={(e) => setFormData(prev => ({ ...prev, bookingRef: e.target.value }))}
                placeholder="TRV-XXXXX"
              />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input
                value={formData.coverImage}
                onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TRANSPORT SERVICE SECTION */}
      {serviceTypes.isTransportService && (
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Transport Journey</CardTitle>
                <p className="text-orange-100 text-sm mt-1">Build multi-leg transport itinerary</p>
              </div>
              <Button onClick={addTransportLeg} variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Transport Leg
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {formData.transport_legs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <Plane className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-4">No transport legs added yet</p>
                <Button onClick={addTransportLeg} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Transport Leg
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.transport_legs.map((leg, index) => (
                  <div key={leg.id} className="border-l-4 border-orange-500 pl-6 pb-6 relative">
                    {/* Leg Number Badge */}
                    <div className="absolute -left-4 top-2 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                      {leg.leg_number}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">Leg {leg.leg_number}</h4>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setCatalogFilter('transport');
                              setShowCatalogModal(index);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Choose from Catalog
                          </Button>
                          <Button
                            onClick={() => removeTransportLeg(index)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Transport Type *</Label>
                          <select
                            className="w-full border rounded-md p-2"
                            value={leg.transport_type}
                            onChange={(e) => updateTransportLeg(index, 'transport_type', e.target.value)}
                          >
                            <option value="cab">Cab</option>
                            <option value="flight">Flight</option>
                            <option value="train">Train</option>
                            <option value="bus">Bus</option>
                            <option value="mini_bus">Mini Bus</option>
                            <option value="traveller">Traveller</option>
                          </select>
                        </div>
                        <div>
                          <Label>Vehicle Details</Label>
                          <Input
                            value={leg.vehicle_details}
                            onChange={(e) => updateTransportLeg(index, 'vehicle_details', e.target.value)}
                            placeholder="Flight number, Train name, etc."
                          />
                        </div>
                        <div>
                          <Label>Cost (₹) *</Label>
                          <Input
                            type="number"
                            value={leg.cost}
                            onChange={(e) => updateTransportLeg(index, 'cost', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label>From Location *</Label>
                          <Input
                            value={leg.from_location}
                            onChange={(e) => updateTransportLeg(index, 'from_location', e.target.value)}
                            placeholder="Bengaluru"
                          />
                        </div>
                        <div>
                          <Label>To Location *</Label>
                          <Input
                            value={leg.to_location}
                            onChange={(e) => updateTransportLeg(index, 'to_location', e.target.value)}
                            placeholder="Katihar"
                          />
                        </div>
                        <div>
                          <Label>Pickup Point</Label>
                          <Input
                            value={leg.pickup_point}
                            onChange={(e) => updateTransportLeg(index, 'pickup_point', e.target.value)}
                            placeholder="Hotel/Airport/Station"
                          />
                        </div>
                        <div>
                          <Label>Drop Point</Label>
                          <Input
                            value={leg.drop_point}
                            onChange={(e) => updateTransportLeg(index, 'drop_point', e.target.value)}
                            placeholder="Hotel/Airport/Station"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <Label>Departure Date *</Label>
                          <Input
                            type="date"
                            value={leg.departure_date}
                            onChange={(e) => updateTransportLeg(index, 'departure_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Departure Time *</Label>
                          <Input
                            type="time"
                            value={leg.departure_time}
                            onChange={(e) => updateTransportLeg(index, 'departure_time', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Arrival Date</Label>
                          <Input
                            type="date"
                            value={leg.arrival_date}
                            onChange={(e) => updateTransportLeg(index, 'arrival_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Arrival Time</Label>
                          <Input
                            type="time"
                            value={leg.arrival_time}
                            onChange={(e) => updateTransportLeg(index, 'arrival_time', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label>Additional Notes</Label>
                        <Textarea
                          value={leg.notes}
                          onChange={(e) => updateTransportLeg(index, 'notes', e.target.value)}
                          placeholder="Any special instructions or notes..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* HOTEL BOOKING SECTION */}
      {serviceTypes.isHotelBooking && (
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Hotel Accommodations</CardTitle>
                <p className="text-blue-100 text-sm mt-1">Add hotel bookings</p>
              </div>
              <Button onClick={addHotelBooking} variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Hotel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {formData.hotel_bookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <HotelIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-4">No hotels added yet</p>
                <Button onClick={addHotelBooking} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Hotel Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.hotel_bookings.map((hotel, index) => (
                  <div key={hotel.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Hotel {index + 1}</h4>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setCatalogFilter('hotel');
                            setShowCatalogModal(`hotel-${index}`);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Choose from Catalog
                        </Button>
                        <Button
                          onClick={() => removeHotelBooking(index)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Hotel Name *</Label>
                        <Input
                          value={hotel.hotel_name}
                          onChange={(e) => updateHotelBooking(index, 'hotel_name', e.target.value)}
                          placeholder="Hotel name"
                        />
                      </div>
                      <div>
                        <Label>Location *</Label>
                        <Input
                          value={hotel.location}
                          onChange={(e) => updateHotelBooking(index, 'location', e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label>Star Rating</Label>
                        <select
                          className="w-full border rounded-md p-2"
                          value={hotel.stars}
                          onChange={(e) => updateHotelBooking(index, 'stars', parseInt(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map(star => (
                            <option key={star} value={star}>{'⭐'.repeat(star)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Check-in Date *</Label>
                        <Input
                          type="date"
                          value={hotel.check_in_date}
                          onChange={(e) => updateHotelBooking(index, 'check_in_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Check-out Date *</Label>
                        <Input
                          type="date"
                          value={hotel.check_out_date}
                          onChange={(e) => updateHotelBooking(index, 'check_out_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Room Type</Label>
                        <Input
                          value={hotel.room_type}
                          onChange={(e) => updateHotelBooking(index, 'room_type', e.target.value)}
                          placeholder="Deluxe, Suite, etc."
                        />
                      </div>
                      <div>
                        <Label>Number of Rooms *</Label>
                        <Input
                          type="number"
                          value={hotel.number_of_rooms}
                          onChange={(e) => updateHotelBooking(index, 'number_of_rooms', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Cost per Night (₹) *</Label>
                        <Input
                          type="number"
                          value={hotel.cost_per_night}
                          onChange={(e) => updateHotelBooking(index, 'cost_per_night', parseFloat(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Total Nights *</Label>
                        <Input
                          type="number"
                          value={hotel.total_nights}
                          onChange={(e) => updateHotelBooking(index, 'total_nights', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-semibold text-blue-900">
                        Total Cost: ₹{(hotel.cost_per_night * hotel.total_nights).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VISA SERVICE SECTION */}
      {serviceTypes.isVisa && (
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Visa Services</CardTitle>
                <p className="text-red-100 text-sm mt-1">Add visa processing services</p>
              </div>
              <Button onClick={addVisaService} variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Visa Service
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {formData.visa_services.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <File className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-4">No visa services added yet</p>
                <Button onClick={addVisaService} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Visa Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.visa_services.map((visa, index) => (
                  <div key={visa.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Visa Service {index + 1}</h4>
                      <Button
                        onClick={() => removeVisaService(index)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Country *</Label>
                        <Input
                          value={visa.country}
                          onChange={(e) => updateVisaService(index, 'country', e.target.value)}
                          placeholder="e.g., Thailand"
                        />
                      </div>
                      <div>
                        <Label>Visa Type *</Label>
                        <Input
                          value={visa.visa_type}
                          onChange={(e) => updateVisaService(index, 'visa_type', e.target.value)}
                          placeholder="e.g., Tourist Visa"
                        />
                      </div>
                      <div>
                        <Label>Processing Days *</Label>
                        <Input
                          type="number"
                          value={visa.processing_days}
                          onChange={(e) => updateVisaService(index, 'processing_days', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Cost (₹) *</Label>
                        <Input
                          type="number"
                          value={visa.cost}
                          onChange={(e) => updateVisaService(index, 'cost', parseFloat(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Additional Notes</Label>
                      <Textarea
                        value={visa.notes}
                        onChange={(e) => updateVisaService(index, 'notes', e.target.value)}
                        placeholder="Any special instructions..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PRICING SECTION */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{formData.pricing.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Taxes (18% GST)</span>
                <span className="font-semibold">₹{formData.pricing.taxes.toLocaleString()}</span>
              </div>
              <div>
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  value={formData.pricing.discount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, discount: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg">
                <p className="text-sm opacity-90 mb-1">Total Amount</p>
                <p className="text-3xl font-bold">₹{formData.pricing.total.toLocaleString()}</p>
                <p className="text-sm opacity-90 mt-2">Per Person: ₹{formData.pricing.perPerson.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900 mb-1">Deposit Due (30%)</p>
                <p className="text-2xl font-bold text-yellow-900">₹{formData.pricing.depositDue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INCLUSIONS & EXCLUSIONS */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Inclusions & Exclusions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Inclusions */}
            <div>
              <Label className="text-green-700 font-semibold mb-2 block">✓ Inclusions</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  placeholder="Add inclusion item..."
                  onKeyPress={(e) => e.key === 'Enter' && addInclusion()}
                />
                <Button onClick={addInclusion} size="sm" className="bg-green-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.inclusions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                    <span className="text-sm text-green-900">✓ {item}</span>
                    <Button
                      onClick={() => removeInclusion(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ))}
                {formData.inclusions.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No inclusions added yet</p>
                )}
              </div>
            </div>

            {/* Exclusions */}
            <div>
              <Label className="text-red-700 font-semibold mb-2 block">✗ Exclusions</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  placeholder="Add exclusion item..."
                  onKeyPress={(e) => e.key === 'Enter' && addExclusion()}
                />
                <Button onClick={addExclusion} size="sm" className="bg-red-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.exclusions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
                    <span className="text-sm text-red-900">✗ {item}</span>
                    <Button
                      onClick={() => removeExclusion(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ))}
                {formData.exclusions.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No exclusions added yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CATALOG MODAL */}
      {showCatalogModal !== false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Choose from Catalog</h3>
              <Button onClick={() => setShowCatalogModal(false)} variant="ghost" size="sm">
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {catalog
                .filter(item => {
                  if (catalogFilter === 'hotel') return item.type === 'hotel';
                  if (catalogFilter === 'transport') return ['flight', 'train', 'bus', 'cab'].includes(item.type);
                  return true;
                })
                .map(item => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all"
                    onClick={() => {
                      if (typeof showCatalogModal === 'number') {
                        addTransportFromCatalog(item, showCatalogModal);
                      } else if (typeof showCatalogModal === 'string' && showCatalogModal.startsWith('hotel-')) {
                        const hotelIndex = parseInt(showCatalogModal.split('-')[1]);
                        addHotelFromCatalog(item, hotelIndex);
                      }
                    }}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded mb-2" />
                    )}
                    <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{item.destination}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{item.type}</Badge>
                      <span className="text-sm font-semibold text-orange-600">₹{item.default_price}</span>
                    </div>
                    {item.rating && (
                      <p className="text-xs text-yellow-600 mt-1">{'⭐'.repeat(item.rating)}</p>
                    )}
                  </div>
                ))}
            </div>

            {catalog.filter(item => {
              if (catalogFilter === 'hotel') return item.type === 'hotel';
              if (catalogFilter === 'transport') return ['flight', 'train', 'bus', 'cab'].includes(item.type);
              return true;
            }).length === 0 && (
              <p className="text-center text-gray-500 py-8">No catalog items found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationBuilderNew;
