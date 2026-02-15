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
  Users, DollarSign, MapPin, Clock, Hotel, Plane, Activity as ActivityIcon, FileText,
  Bus, Train, Car, Building2
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
  const [adminSettings, setAdminSettings] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);

  const [detailedTerms, setDetailedTerms] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [testimonials, setTestimonials] = useState([]);

  const [expiry_date, setExpiryDate] = useState('');
  const [costBreakup, setCostBreakup] = useState([]);

  // Category selection state - pre-populated from request
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  const availableCategories = [
    { value: 'Holiday', label: 'Holiday Package', icon: Calendar, requestKey: 'is_holiday_package_required' },
    { value: 'Visa', label: 'Visa', icon: FileText, requestKey: 'is_visa_required' },
    { value: 'Hotel', label: 'Hotel', icon: Hotel, requestKey: 'is_hotel_booking_required' },
    { value: 'MICE', label: 'MICE Events', icon: Building2, requestKey: 'is_mice_required' },
    { value: 'Sightseeing', label: 'Sightseeing', icon: ActivityIcon, requestKey: 'is_sight_seeing_required' },
    { value: 'Transport', label: 'Transport within City', icon: Car, requestKey: 'is_transport_within_city_required' },
    { value: 'Flight', label: 'Flight', icon: Plane, requestKey: 'is_transfer_to_destination_required', subType: 'flight' },
    { value: 'Train', label: 'Train', icon: Train, requestKey: 'is_transfer_to_destination_required', subType: 'train' },
    { value: 'Bus', label: 'Bus', icon: Bus, requestKey: 'is_transfer_to_destination_required', subType: 'bus' }
  ];

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
      currency: 'INR',
      tcs_percentage: 2
    },
    days: [],
    inclusions: [],
    exclusions: [],
    // Category-specific fields
    flights: [],
    visas: [],
    transports_within_city: [],
    mice_events: [],
    standalone_hotels: [],
    sightseeing_packages: [],
    trains: [],
    buses: []
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
        initialData.summary.travelers = request.people_count || 1;
        initialData.bookingRef = `REF-${request.id?.substring(0, 8).toUpperCase()}`;
        initialData.tripTitle = request.title || '';
        initialData.start_date = request.start_date || '';
        initialData.end_date = request.end_date || '';

        // Pre-populate selected categories from request
        const preSelectedCategories = [];
        
        if (request.is_visa_required) preSelectedCategories.push('Visa');
        if (request.is_hotel_booking_required) preSelectedCategories.push('Hotel');
        if (request.is_mice_required) preSelectedCategories.push('MICE');
        if (request.is_sight_seeing_required) preSelectedCategories.push('Sightseeing');
        if (request.is_transport_within_city_required) preSelectedCategories.push('Transport');
        
        // For transport to destination, check type_of_travel array
        if (request.is_transfer_to_destination_required && request.type_of_travel) {
          if (request.type_of_travel.includes('flight')) preSelectedCategories.push('Flight');
          if (request.type_of_travel.includes('train')) preSelectedCategories.push('Train');
          if (request.type_of_travel.includes('bus')) preSelectedCategories.push('Bus');
        }
        
        setSelectedCategories(preSelectedCategories);
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

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Flight management
  const addFlight = () => {
    const newFlight = {
      id: uuid(),
      booking_reference: '',
      total_passengers: formData.summary.travelers,
      journey_type: 'Round-trip',
      total_cost: 0,
      cost_per_person: 0,
      gst_percentage: 0,
      segments: [],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      flights: [...prev.flights, newFlight]
    }));
  };

  const addFlightSegment = (flightIndex) => {
    const newSegment = {
      id: uuid(),
      flight_number: '',
      airline: '',
      airline_logo: '',
      departure_airport: '',
      departure_city: '',
      departure_time: '',
      departure_date: '',
      arrival_airport: '',
      arrival_city: '',
      arrival_time: '',
      arrival_date: '',
      duration: '',
      cabin_class: 'Economy',
      baggage_checkin: '15 KG',
      baggage_cabin: '7 KG'
    };
    setFormData(prev => ({
      ...prev,
      flights: prev.flights.map((flight, idx) =>
        idx === flightIndex
          ? { ...flight, segments: [...flight.segments, newSegment] }
          : flight
      )
    }));
  };

  const updateFlightSegment = (flightIndex, segmentIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      flights: prev.flights.map((flight, fIdx) =>
        fIdx === flightIndex
          ? {
              ...flight,
              segments: flight.segments.map((segment, sIdx) =>
                sIdx === segmentIndex
                  ? { ...segment, [field]: value }
                  : segment
              )
            }
          : flight
      )
    }));
  };

  const removeFlightSegment = (flightIndex, segmentIndex) => {
    setFormData(prev => ({
      ...prev,
      flights: prev.flights.map((flight, fIdx) =>
        fIdx === flightIndex
          ? {
              ...flight,
              segments: flight.segments.filter((_, sIdx) => sIdx !== segmentIndex)
            }
          : flight
      )
    }));
  };

  const removeFlight = (flightIndex) => {
    setFormData(prev => ({
      ...prev,
      flights: prev.flights.filter((_, idx) => idx !== flightIndex)
    }));
  };

  // Visa management
  const addVisa = () => {
    const newVisa = {
      id: uuid(),
      name: '',
      visa_type: 'Tourist',
      destination_country: '',
      processing_time_days: 5,
      cost_per_person: 0,
      number_of_people: formData.summary.travelers,
      total_cost: 0,
      gst_percentage: 0,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      visas: [...prev.visas, newVisa]
    }));
  };

  const updateVisa = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      visas: prev.visas.map((visa, idx) => {
        if (idx === index) {
          const updated = { ...visa, [field]: value };
          // Auto-calculate total_cost
          if (field === 'cost_per_person' || field === 'number_of_people') {
            updated.total_cost = updated.cost_per_person * updated.number_of_people;
          }
          return updated;
        }
        return visa;
      })
    }));
  };

  const removeVisa = (index) => {
    setFormData(prev => ({
      ...prev,
      visas: prev.visas.filter((_, idx) => idx !== index)
    }));
  };

  // Transport management
  const addTransport = () => {
    const newTransport = {
      id: uuid(),
      vehicle_type: 'Sedan',
      vehicle_name: '',
      capacity: 4,
      pickup_location: '',
      drop_location: '',
      pickup_date: '',
      pickup_time: '',
      duration: '',
      total_cost: 0,
      cost_per_vehicle: 0,
      number_of_vehicles: 1,
      gst_percentage: 10,
      driver_details: '',
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      transports_within_city: [...prev.transports_within_city, newTransport]
    }));
  };

  const updateTransport = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      transports_within_city: prev.transports_within_city.map((transport, idx) => {
        if (idx === index) {
          const updated = { ...transport, [field]: value };
          // Auto-calculate total_cost
          if (field === 'cost_per_vehicle' || field === 'number_of_vehicles') {
            updated.total_cost = updated.cost_per_vehicle * updated.number_of_vehicles;
          }
          return updated;
        }
        return transport;
      })
    }));
  };

  const removeTransport = (index) => {
    setFormData(prev => ({
      ...prev,
      transports_within_city: prev.transports_within_city.filter((_, idx) => idx !== index)
    }));
  };

  // MICE Events management
  const addMiceEvent = () => {
    const newEvent = {
      id: uuid(),
      event_type: 'Meeting',
      event_name: '',
      venue_name: '',
      venue_address: '',
      capacity: 0,
      number_of_attendees: formData.summary.travelers,
      event_date: '',
      event_time: '',
      duration: '',
      equipment_provided: [],
      catering_included: false,
      catering_details: '',
      total_cost: 0,
      cost_per_person: 0,
      gst_percentage: 0
    };
    setFormData(prev => ({
      ...prev,
      mice_events: [...prev.mice_events, newEvent]
    }));
  };

  const updateMiceEvent = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      mice_events: prev.mice_events.map((event, idx) => {
        if (idx === index) {
          const updated = { ...event, [field]: value };
          // Auto-calculate total_cost
          if (field === 'cost_per_person' || field === 'number_of_attendees') {
            updated.total_cost = updated.cost_per_person * updated.number_of_attendees;
          }
          return updated;
        }
        return event;
      })
    }));
  };

  const removeMiceEvent = (index) => {
    setFormData(prev => ({
      ...prev,
      mice_events: prev.mice_events.filter((_, idx) => idx !== index)
    }));
  };

  // Standalone Hotels management
  const addStandaloneHotel = () => {
    const newHotel = {
      id: uuid(),
      name: '',
      stars: 3,
      image: '',
      address: '',
      city: formData.city,
      check_in_date: '',
      check_out_date: '',
      number_of_nights: 1,
      room_type: 'Standard',
      number_of_rooms: 1,
      guests_per_room: 2,
      meal_plan: 'EP (Room Only)',
      url: '',
      amenities: [],
      total_cost: 0,
      cost_per_room_per_night: 0,
      gst_percentage: 18,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      standalone_hotels: [...prev.standalone_hotels, newHotel]
    }));
  };

  const updateStandaloneHotel = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      standalone_hotels: prev.standalone_hotels.map((hotel, idx) => {
        if (idx === index) {
          const updated = { ...hotel, [field]: value };
          // Auto-calculate total_cost
          if (field === 'cost_per_room_per_night' || field === 'number_of_rooms' || field === 'number_of_nights') {
            updated.total_cost = updated.cost_per_room_per_night * updated.number_of_rooms * updated.number_of_nights;
          }
          // Auto-calculate nights if dates change
          if (field === 'check_in_date' || field === 'check_out_date') {
            if (updated.check_in_date && updated.check_out_date) {
              const checkIn = new Date(updated.check_in_date);
              const checkOut = new Date(updated.check_out_date);
              updated.number_of_nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            }
          }
          return updated;
        }
        return hotel;
      })
    }));
  };

  const removeStandaloneHotel = (index) => {
    setFormData(prev => ({
      ...prev,
      standalone_hotels: prev.standalone_hotels.filter((_, idx) => idx !== index)
    }));
  };

  // Sightseeing Packages management
  const addSightseeingPackage = () => {
    const newPackage = {
      id: uuid(),
      package_name: '',
      city: formData.city,
      date: '',
      start_time: '',
      end_time: '',
      duration: 'Full Day',
      places: [],
      transport_included: true,
      transport_details: '',
      guide_included: true,
      meal_included: false,
      meal_details: '',
      total_cost: 0,
      cost_per_person: 0,
      number_of_people: formData.summary.travelers,
      gst_percentage: 5,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: [...prev.sightseeing_packages, newPackage]
    }));
  };

  const addPlaceToPackage = (packageIndex) => {
    const newPlace = {
      name: '',
      description: '',
      image: '',
      duration: '',
      entry_fee_included: true
    };
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: prev.sightseeing_packages.map((pkg, idx) =>
        idx === packageIndex
          ? { ...pkg, places: [...pkg.places, newPlace] }
          : pkg
      )
    }));
  };

  const updatePlaceInPackage = (packageIndex, placeIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: prev.sightseeing_packages.map((pkg, pIdx) =>
        pIdx === packageIndex
          ? {
              ...pkg,
              places: pkg.places.map((place, plIdx) =>
                plIdx === placeIndex
                  ? { ...place, [field]: value }
                  : place
              )
            }
          : pkg
      )
    }));
  };

  const removePlaceFromPackage = (packageIndex, placeIndex) => {
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: prev.sightseeing_packages.map((pkg, pIdx) =>
        pIdx === packageIndex
          ? {
              ...pkg,
              places: pkg.places.filter((_, plIdx) => plIdx !== placeIndex)
            }
          : pkg
      )
    }));
  };

  const updateSightseeingPackage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: prev.sightseeing_packages.map((pkg, idx) => {
        if (idx === index) {
          const updated = { ...pkg, [field]: value };
          // Auto-calculate total_cost
          if (field === 'cost_per_person' || field === 'number_of_people') {
            updated.total_cost = updated.cost_per_person * updated.number_of_people;
          }
          return updated;
        }
        return pkg;
      })
    }));
  };

  const removeSightseeingPackage = (index) => {
    setFormData(prev => ({
      ...prev,
      sightseeing_packages: prev.sightseeing_packages.filter((_, idx) => idx !== index)
    }));
  };

  // Train management
  const addTrain = () => {
    const newTrain = {
      id: uuid(),
      pnr: '',
      total_passengers: formData.summary.travelers,
      total_cost: 0,
      cost_per_person: 0,
      gst_percentage: 0,
      segments: [],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      trains: [...prev.trains, newTrain]
    }));
  };

  const addTrainSegment = (trainIndex) => {
    const newSegment = {
      train_number: '',
      train_name: '',
      departure_station: '',
      departure_city: '',
      departure_time: '',
      departure_date: '',
      arrival_station: '',
      arrival_city: '',
      arrival_time: '',
      arrival_date: '',
      duration: '',
      class_type: 'AC 3 Tier',
      seat_numbers: ''
    };
    setFormData(prev => ({
      ...prev,
      trains: prev.trains.map((train, idx) =>
        idx === trainIndex
          ? { ...train, segments: [...train.segments, newSegment] }
          : train
      )
    }));
  };

  const removeTrain = (trainIndex) => {
    setFormData(prev => ({
      ...prev,
      trains: prev.trains.filter((_, idx) => idx !== trainIndex)
    }));
  };

  // Bus management
  const addBus = () => {
    const newBus = {
      id: uuid(),
      total_passengers: formData.summary.travelers,
      total_cost: 0,
      gst_percentage: 0,
      segments: [],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      buses: [...prev.buses, newBus]
    }));
  };

  const addBusSegment = (busIndex) => {
    const newSegment = {
      bus_operator: '',
      bus_type: 'AC Sleeper',
      departure_location: '',
      departure_time: '',
      departure_date: '',
      duration: '',
      arrival_location: '',
      arrival_time: '',
      arrival_date: ''
    };
    setFormData(prev => ({
      ...prev,
      buses: prev.buses.map((bus, idx) =>
        idx === busIndex
          ? { ...bus, segments: [...bus.segments, newSegment] }
          : bus
      )
    }));
  };

  const removeBus = (busIndex) => {
    setFormData(prev => ({
      ...prev,
      buses: prev.buses.filter((_, idx) => idx !== busIndex)
    }));
  };

  // Highlights
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

  // Inclusions/Exclusions
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

  // Days management
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
      setCostBreakup(prev => prev.filter(item => item.id !== formData.days[index].hotel?.id));
    }
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
    };
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

  const validateQuotation = () => {
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

    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return false;
    }

    return true;
  };

  const handleSave = async (status='DRAFT', expiry_date) => {
    try {
      if (!validateQuotation()) return;

      const dayCount = (new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24);
      const durationText = `${dayCount + 1} Days ${dayCount} Nights`;
      const requestId = request?.id;
      
      const detailed_quotation_data = JSON.parse(JSON.stringify(formData));
      detailed_quotation_data.summary.duration = durationText;
      detailed_quotation_data.selected_categories = selectedCategories;

      const payload = {
        request_id: requestId,
        status: status || 'DRAFT',
        detailed_quotation_data,
        expiry_date: expiry_date || null,
        cost_breakup: costBreakup
      };

      setSaving(true);
      await api.createQuotation(payload);
      toast.success('Quotation saved successfully!');
      navigate(`/requests/${requestId}`);

    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (formData.start_date && formData.end_date && request?.is_holiday_package_required) {
      setFormData(prev => ({
        ...prev,
        days: generateDays((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24) + 1)
      }));
    }
  }, [formData.start_date, formData.end_date, request?.is_holiday_package_required]);

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
            <p className="text-gray-600">Create detailed quotation with category-specific services</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleSave()}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Save Draft
          </Button>

          <Input
            type="date"
            name="expiry_date"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={expiry_date}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
          <Button
            onClick={() => handleSave('SENT', expiry_date)}
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
                <Label htmlFor="travelers">Number of Travelers</Label>
                <Input
                  id="travelers"
                  type="number"
                  min="1"
                  value={formData.summary.travelers}
                  onChange={(e) => handleInputChange('summary', 'travelers', parseInt(e.target.value))}
                />
              </div>
              <div className="w-1/2 pe-1 pt-4">
                <Label htmlFor="bookingRef">Booking Reference</Label>
                <Input
                  id="bookingRef"
                  value={formData.bookingRef}
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

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Service Categories</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Pre-selected based on customer request. You can modify the selection.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {availableCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategories.includes(category.value);
                return (
                  <div
                    key={category.value}
                    onClick={() => toggleCategory(category.value)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className={`font-medium text-center ${isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
                        {category.label}
                      </span>
                      {isSelected && (
                        <Badge className="bg-orange-600">Selected</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
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

        {/* CATEGORY-SPECIFIC SECTIONS */}

        {/* Flight Section */}
        {selectedCategories.includes('Flight') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5" />
                  Flight Details
                </div>
                <Button onClick={addFlight} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Flight
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.flights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No flights added. Click "Add Flight" to begin.
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.flights.map((flight, flightIdx) => (
                    <div key={flight.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Flight {flightIdx + 1}</h3>
                        <Button
                          onClick={() => removeFlight(flightIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <Label>Booking Reference</Label>
                          <Input
                            value={flight.booking_reference}
                            onChange={(e) => {
                              const updated = [...formData.flights];
                              updated[flightIdx].booking_reference = e.target.value;
                              setFormData(prev => ({ ...prev, flights: updated }));
                            }}
                            placeholder="e.g., EK-501-2025"
                          />
                        </div>
                        <div>
                          <Label>Journey Type</Label>
                          <select
                            value={flight.journey_type}
                            onChange={(e) => {
                              const updated = [...formData.flights];
                              updated[flightIdx].journey_type = e.target.value;
                              setFormData(prev => ({ ...prev, flights: updated }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option>One-way</option>
                            <option>Round-trip</option>
                            <option>Multi-city</option>
                          </select>
                        </div>
                        <div>
                          <Label>Total Passengers</Label>
                          <Input
                            type="number"
                            value={flight.total_passengers}
                            onChange={(e) => {
                              const updated = [...formData.flights];
                              updated[flightIdx].total_passengers = parseInt(e.target.value);
                              setFormData(prev => ({ ...prev, flights: updated }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-base font-semibold">Flight Segments</Label>
                          <Button
                            onClick={() => addFlightSegment(flightIdx)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Segment
                          </Button>
                        </div>

                        {flight.segments.map((segment, segIdx) => (
                          <div key={segment.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">Segment {segIdx + 1}</span>
                              <Button
                                onClick={() => removeFlightSegment(flightIdx, segIdx)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                placeholder="Flight Number"
                                value={segment.flight_number}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'flight_number', e.target.value)}
                              />
                              <Input
                                placeholder="Airline"
                                value={segment.airline}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'airline', e.target.value)}
                              />
                              <Input
                                placeholder="Departure City"
                                value={segment.departure_city}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'departure_city', e.target.value)}
                              />
                              <Input
                                placeholder="Arrival City"
                                value={segment.arrival_city}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'arrival_city', e.target.value)}
                              />
                              <Input
                                type="date"
                                placeholder="Departure Date"
                                value={segment.departure_date}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'departure_date', e.target.value)}
                              />
                              <Input
                                type="time"
                                placeholder="Departure Time"
                                value={segment.departure_time}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'departure_time', e.target.value)}
                              />
                              <Input
                                type="date"
                                placeholder="Arrival Date"
                                value={segment.arrival_date}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'arrival_date', e.target.value)}
                              />
                              <Input
                                type="time"
                                placeholder="Arrival Time"
                                value={segment.arrival_time}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'arrival_time', e.target.value)}
                              />
                              <Input
                                placeholder="Cabin Class"
                                value={segment.cabin_class}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'cabin_class', e.target.value)}
                              />
                              <Input
                                placeholder="Duration"
                                value={segment.duration}
                                onChange={(e) => updateFlightSegment(flightIdx, segIdx, 'duration', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={flight.gst_percentage || 0}
                            onChange={(e) => {
                              const updated = [...formData.flights];
                              updated[flightIdx].gst_percentage = parseFloat(e.target.value);
                              setFormData(prev => ({ ...prev, flights: updated }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            value={flight.notes}
                            onChange={(e) => {
                              const updated = [...formData.flights];
                              updated[flightIdx].notes = e.target.value;
                              setFormData(prev => ({ ...prev, flights: updated }));
                            }}
                            rows="2"
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

        {/* Visa Section */}
        {selectedCategories.includes('Visa') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Visa Details
                </div>
                <Button onClick={addVisa} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Visa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.visas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No visas added. Click "Add Visa" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.visas.map((visa, visaIdx) => (
                    <div key={visa.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Visa {visaIdx + 1}</h3>
                        <Button
                          onClick={() => removeVisa(visaIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Visa Name</Label>
                          <Input
                            value={visa.name}
                            onChange={(e) => updateVisa(visaIdx, 'name', e.target.value)}
                            placeholder="e.g., UAE Business Visa"
                          />
                        </div>
                        <div>
                          <Label>Visa Type</Label>
                          <select
                            value={visa.visa_type}
                            onChange={(e) => updateVisa(visaIdx, 'visa_type', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option>Tourist</option>
                            <option>Business</option>
                            <option>Transit</option>
                            <option>Student</option>
                          </select>
                        </div>
                        <div>
                          <Label>Destination Country</Label>
                          <Input
                            value={visa.destination_country}
                            onChange={(e) => updateVisa(visaIdx, 'destination_country', e.target.value)}
                            placeholder="e.g., United Arab Emirates"
                          />
                        </div>
                        <div>
                          <Label>Processing Time (Days)</Label>
                          <Input
                            type="number"
                            value={visa.processing_time_days}
                            onChange={(e) => updateVisa(visaIdx, 'processing_time_days', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Cost Per Person</Label>
                          <Input
                            type="number"
                            value={visa.cost_per_person}
                            onChange={(e) => updateVisa(visaIdx, 'cost_per_person', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Number of People</Label>
                          <Input
                            type="number"
                            value={visa.number_of_people}
                            onChange={(e) => updateVisa(visaIdx, 'number_of_people', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={visa.gst_percentage || 0}
                            onChange={(e) => updateVisa(visaIdx, 'gst_percentage', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Description</Label>
                          <Textarea
                            value={visa.description}
                            onChange={(e) => updateVisa(visaIdx, 'description', e.target.value)}
                            rows="2"
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

        {/* Transport Section */}
        {selectedCategories.includes('Transport') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Transport Within City
                </div>
                <Button onClick={addTransport} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Transport
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.transports_within_city.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transport added. Click "Add Transport" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.transports_within_city.map((transport, transportIdx) => (
                    <div key={transport.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Transport {transportIdx + 1}</h3>
                        <Button
                          onClick={() => removeTransport(transportIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Vehicle Type</Label>
                          <select
                            value={transport.vehicle_type}
                            onChange={(e) => updateTransport(transportIdx, 'vehicle_type', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option>Sedan</option>
                            <option>SUV</option>
                            <option>Mini Bus</option>
                            <option>Bus</option>
                            <option>Tempo Traveller</option>
                          </select>
                        </div>
                        <div>
                          <Label>Vehicle Name</Label>
                          <Input
                            value={transport.vehicle_name}
                            onChange={(e) => updateTransport(transportIdx, 'vehicle_name', e.target.value)}
                            placeholder="e.g., Toyota Hiace"
                          />
                        </div>
                        <div>
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            value={transport.capacity}
                            onChange={(e) => updateTransport(transportIdx, 'capacity', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Pickup Location</Label>
                          <Input
                            value={transport.pickup_location}
                            onChange={(e) => updateTransport(transportIdx, 'pickup_location', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Drop Location</Label>
                          <Input
                            value={transport.drop_location}
                            onChange={(e) => updateTransport(transportIdx, 'drop_location', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Pickup Date</Label>
                          <Input
                            type="date"
                            value={transport.pickup_date}
                            onChange={(e) => updateTransport(transportIdx, 'pickup_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Pickup Time</Label>
                          <Input
                            type="time"
                            value={transport.pickup_time}
                            onChange={(e) => updateTransport(transportIdx, 'pickup_time', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Duration</Label>
                          <Input
                            value={transport.duration}
                            onChange={(e) => updateTransport(transportIdx, 'duration', e.target.value)}
                            placeholder="e.g., 2 hours"
                          />
                        </div>
                        <div>
                          <Label>Cost Per Vehicle</Label>
                          <Input
                            type="number"
                            value={transport.cost_per_vehicle}
                            onChange={(e) => updateTransport(transportIdx, 'cost_per_vehicle', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Number of Vehicles</Label>
                          <Input
                            type="number"
                            value={transport.number_of_vehicles}
                            onChange={(e) => updateTransport(transportIdx, 'number_of_vehicles', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={transport.gst_percentage || 10}
                            onChange={(e) => updateTransport(transportIdx, 'gst_percentage', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Driver Details</Label>
                          <Input
                            value={transport.driver_details}
                            onChange={(e) => updateTransport(transportIdx, 'driver_details', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Notes</Label>
                          <Textarea
                            value={transport.notes}
                            onChange={(e) => updateTransport(transportIdx, 'notes', e.target.value)}
                            rows="2"
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

        {/* MICE Events Section */}
        {selectedCategories.includes('MICE') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  MICE Events
                </div>
                <Button onClick={addMiceEvent} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.mice_events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No MICE events added. Click "Add Event" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.mice_events.map((event, eventIdx) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Event {eventIdx + 1}</h3>
                        <Button
                          onClick={() => removeMiceEvent(eventIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Event Type</Label>
                          <select
                            value={event.event_type}
                            onChange={(e) => updateMiceEvent(eventIdx, 'event_type', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option>Meeting</option>
                            <option>Conference</option>
                            <option>Exhibition</option>
                            <option>Incentive</option>
                          </select>
                        </div>
                        <div>
                          <Label>Event Name</Label>
                          <Input
                            value={event.event_name}
                            onChange={(e) => updateMiceEvent(eventIdx, 'event_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Venue Name</Label>
                          <Input
                            value={event.venue_name}
                            onChange={(e) => updateMiceEvent(eventIdx, 'venue_name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Venue Address</Label>
                          <Input
                            value={event.venue_address}
                            onChange={(e) => updateMiceEvent(eventIdx, 'venue_address', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            value={event.capacity}
                            onChange={(e) => updateMiceEvent(eventIdx, 'capacity', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Number of Attendees</Label>
                          <Input
                            type="number"
                            value={event.number_of_attendees}
                            onChange={(e) => updateMiceEvent(eventIdx, 'number_of_attendees', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Event Date</Label>
                          <Input
                            type="date"
                            value={event.event_date}
                            onChange={(e) => updateMiceEvent(eventIdx, 'event_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Event Time</Label>
                          <Input
                            value={event.event_time}
                            onChange={(e) => updateMiceEvent(eventIdx, 'event_time', e.target.value)}
                            placeholder="e.g., 09:00 AM - 05:00 PM"
                          />
                        </div>
                        <div>
                          <Label>Duration</Label>
                          <Input
                            value={event.duration}
                            onChange={(e) => updateMiceEvent(eventIdx, 'duration', e.target.value)}
                            placeholder="e.g., 8 hours"
                          />
                        </div>
                        <div>
                          <Label>Cost Per Person</Label>
                          <Input
                            type="number"
                            value={event.cost_per_person}
                            onChange={(e) => updateMiceEvent(eventIdx, 'cost_per_person', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={event.gst_percentage || 0}
                            onChange={(e) => updateMiceEvent(eventIdx, 'gst_percentage', parseFloat(e.target.value))}
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

        {/* Standalone Hotels Section */}
        {selectedCategories.includes('Hotel') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  Standalone Hotels
                </div>
                <Button onClick={addStandaloneHotel} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Hotel
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.standalone_hotels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hotels added. Click "Add Hotel" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.standalone_hotels.map((hotel, hotelIdx) => (
                    <div key={hotel.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Hotel {hotelIdx + 1}</h3>
                        <Button
                          onClick={() => removeStandaloneHotel(hotelIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Hotel Name</Label>
                          <Input
                            value={hotel.name}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Stars</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={hotel.stars}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'stars', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>City</Label>
                          <Input
                            value={hotel.city}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'city', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Check-in Date</Label>
                          <Input
                            type="date"
                            value={hotel.check_in_date}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'check_in_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Check-out Date</Label>
                          <Input
                            type="date"
                            value={hotel.check_out_date}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'check_out_date', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Number of Nights</Label>
                          <Input
                            type="number"
                            value={hotel.number_of_nights}
                            disabled
                          />
                        </div>
                        <div>
                          <Label>Room Type</Label>
                          <Input
                            value={hotel.room_type}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'room_type', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Number of Rooms</Label>
                          <Input
                            type="number"
                            value={hotel.number_of_rooms}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'number_of_rooms', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Guests Per Room</Label>
                          <Input
                            type="number"
                            value={hotel.guests_per_room}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'guests_per_room', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Meal Plan</Label>
                          <select
                            value={hotel.meal_plan}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'meal_plan', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option>EP (Room Only)</option>
                            <option>CP (Breakfast)</option>
                            <option>MAP (Breakfast & Dinner)</option>
                            <option>AP (All Meals)</option>
                          </select>
                        </div>
                        <div>
                          <Label>Cost Per Room Per Night</Label>
                          <Input
                            type="number"
                            value={hotel.cost_per_room_per_night}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'cost_per_room_per_night', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={hotel.gst_percentage || 18}
                            onChange={(e) => updateStandaloneHotel(hotelIdx, 'gst_percentage', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Total Cost (Auto-calculated)</Label>
                          <Input
                            type="number"
                            value={hotel.total_cost}
                            disabled
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

        {/* Sightseeing Packages Section */}
        {selectedCategories.includes('Sightseeing') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5" />
                  Sightseeing Packages
                </div>
                <Button onClick={addSightseeingPackage} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Package
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.sightseeing_packages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No sightseeing packages added. Click "Add Package" to begin.
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.sightseeing_packages.map((pkg, pkgIdx) => (
                    <div key={pkg.id} className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50/30">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-orange-700">Package {pkgIdx + 1}</h3>
                        <Button
                          onClick={() => removeSightseeingPackage(pkgIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Basic Package Information */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <Label>Package Name</Label>
                            <Input
                              value={pkg.package_name}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'package_name', e.target.value)}
                              placeholder="e.g., Complete Delhi Heritage Tour"
                            />
                          </div>
                          <div>
                            <Label>City</Label>
                            <Input
                              value={pkg.city}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'city', e.target.value)}
                              placeholder="e.g., New Delhi"
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={pkg.date}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'date', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={pkg.start_time}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'start_time', e.target.value)}
                              placeholder="e.g., 08:00 AM"
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={pkg.end_time}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'end_time', e.target.value)}
                              placeholder="e.g., 06:00 PM"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label>Duration (text)</Label>
                            <Input
                              value={pkg.duration}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'duration', e.target.value)}
                              placeholder="e.g., 10 hours or Full Day"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Places to Visit */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                            <ActivityIcon className="w-4 h-4" />
                            Places to Visit
                          </h4>
                          <Button
                            onClick={() => addPlaceToPackage(pkgIdx)}
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Place
                          </Button>
                        </div>

                        {pkg.places && pkg.places.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            No places added. Click "Add Place" to add sightseeing destinations.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {pkg.places && pkg.places.map((place, placeIdx) => (
                              <div key={placeIdx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-medium text-sm text-gray-700">Place {placeIdx + 1}</span>
                                  <Button
                                    onClick={() => removePlaceFromPackage(pkgIdx, placeIdx)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50 h-8"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Place Name</Label>
                                    <Input
                                      value={place.name}
                                      onChange={(e) => updatePlaceInPackage(pkgIdx, placeIdx, 'name', e.target.value)}
                                      placeholder="e.g., Red Fort (Lal Qila)"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Duration</Label>
                                    <Input
                                      value={place.duration}
                                      onChange={(e) => updatePlaceInPackage(pkgIdx, placeIdx, 'duration', e.target.value)}
                                      placeholder="e.g., 1.5 hours"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs">Image URL</Label>
                                    <Input
                                      value={place.image}
                                      onChange={(e) => updatePlaceInPackage(pkgIdx, placeIdx, 'image', e.target.value)}
                                      placeholder="https://example.com/image.jpg"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs">Description</Label>
                                    <Textarea
                                      value={place.description}
                                      onChange={(e) => updatePlaceInPackage(pkgIdx, placeIdx, 'description', e.target.value)}
                                      placeholder="Brief description of the place..."
                                      rows="2"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={place.entry_fee_included}
                                        onChange={(e) => updatePlaceInPackage(pkgIdx, placeIdx, 'entry_fee_included', e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded"
                                      />
                                      <span className="text-sm text-gray-700">Entry fee included</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Inclusions & Services */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          Inclusions & Services
                        </h4>
                        <div className="space-y-4">
                          {/* Transport */}
                          <div className="border-b pb-3">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={pkg.transport_included}
                                onChange={(e) => updateSightseeingPackage(pkgIdx, 'transport_included', e.target.checked)}
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="font-medium text-sm text-gray-700">Transport Included</span>
                            </label>
                            {pkg.transport_included && (
                              <div>
                                <Label className="text-xs">Transport Details</Label>
                                <Input
                                  value={pkg.transport_details}
                                  onChange={(e) => updateSightseeingPackage(pkgIdx, 'transport_details', e.target.value)}
                                  placeholder="e.g., Air-conditioned sedan (Toyota Etios / Similar) with experienced driver"
                                  className="h-9"
                                />
                              </div>
                            )}
                          </div>

                          {/* Guide */}
                          <div className="border-b pb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pkg.guide_included}
                                onChange={(e) => updateSightseeingPackage(pkgIdx, 'guide_included', e.target.checked)}
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="font-medium text-sm text-gray-700">Guide Included</span>
                            </label>
                          </div>

                          {/* Meals */}
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={pkg.meal_included}
                                onChange={(e) => updateSightseeingPackage(pkgIdx, 'meal_included', e.target.checked)}
                                className="w-4 h-4 text-orange-600 rounded"
                              />
                              <span className="font-medium text-sm text-gray-700">Meal Included</span>
                            </label>
                            {pkg.meal_included && (
                              <div>
                                <Label className="text-xs">Meal Details</Label>
                                <Input
                                  value={pkg.meal_details}
                                  onChange={(e) => updateSightseeingPackage(pkgIdx, 'meal_details', e.target.value)}
                                  placeholder="e.g., Lunch at a popular local restaurant (Vegetarian and Non-vegetarian options)"
                                  className="h-9"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Notes */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Pricing & Notes
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label>Number of People</Label>
                            <Input
                              type="number"
                              value={pkg.number_of_people}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'number_of_people', parseInt(e.target.value))}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label>Cost Per Person</Label>
                            <Input
                              type="number"
                              value={pkg.cost_per_person}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'cost_per_person', parseFloat(e.target.value))}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label>GST %</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={pkg.gst_percentage || 5}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'gst_percentage', parseFloat(e.target.value))}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label>Total Cost (Auto-calculated)</Label>
                            <Input
                              type="number"
                              value={pkg.total_cost}
                              disabled
                              className="h-9 bg-gray-100"
                            />
                          </div>
                          <div className="col-span-4">
                            <Label>Notes</Label>
                            <Textarea
                              value={pkg.notes}
                              onChange={(e) => updateSightseeingPackage(pkgIdx, 'notes', e.target.value)}
                              placeholder="e.g., Comfortable walking shoes recommended. Friday is closed for Jama Masjid."
                              rows="2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Train Section */}
        {selectedCategories.includes('Train') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Train className="w-5 h-5" />
                  Train Details
                </div>
                <Button onClick={addTrain} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Train
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.trains.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No trains added. Click "Add Train" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.trains.map((train, trainIdx) => (
                    <div key={train.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Train {trainIdx + 1}</h3>
                        <Button
                          onClick={() => removeTrain(trainIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <Label>PNR</Label>
                          <Input
                            value={train.pnr}
                            onChange={(e) => {
                              const updated = [...formData.trains];
                              updated[trainIdx].pnr = e.target.value;
                              setFormData(prev => ({ ...prev, trains: updated }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Total Passengers</Label>
                          <Input
                            type="number"
                            value={train.total_passengers}
                            onChange={(e) => {
                              const updated = [...formData.trains];
                              updated[trainIdx].total_passengers = parseInt(e.target.value);
                              setFormData(prev => ({ ...prev, trains: updated }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={train.gst_percentage || 0}
                            onChange={(e) => {
                              const updated = [...formData.trains];
                              updated[trainIdx].gst_percentage = parseFloat(e.target.value);
                              setFormData(prev => ({ ...prev, trains: updated }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-base font-semibold">Train Segments</Label>
                          <Button
                            onClick={() => addTrainSegment(trainIdx)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Segment
                          </Button>
                        </div>

                        {train.segments.map((segment, segIdx) => (
                          <div key={segIdx} className="bg-gray-50 p-3 rounded-lg mb-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                placeholder="Train Number"
                                value={segment.train_number}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].train_number = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                placeholder="Train Name"
                                value={segment.train_name}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].train_name = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                placeholder="Departure City"
                                value={segment.departure_city}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].departure_city = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                placeholder="Arrival City"
                                value={segment.arrival_city}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].arrival_city = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                type="date"
                                placeholder="Departure Date"
                                value={segment.departure_date}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].departure_date = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                type="time"
                                placeholder="Departure Time"
                                value={segment.departure_time}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].departure_time = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                placeholder="Class Type"
                                value={segment.class_type}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].class_type = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                              <Input
                                placeholder="Duration"
                                value={segment.duration}
                                onChange={(e) => {
                                  const updated = [...formData.trains];
                                  updated[trainIdx].segments[segIdx].duration = e.target.value;
                                  setFormData(prev => ({ ...prev, trains: updated }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bus Section */}
        {selectedCategories.includes('Bus') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5" />
                  Bus Details
                </div>
                <Button onClick={addBus} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Bus
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.buses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No buses added. Click "Add Bus" to begin.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.buses.map((bus, busIdx) => (
                    <div key={bus.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Bus {busIdx + 1}</h3>
                        <Button
                          onClick={() => removeBus(busIdx)}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Total Passengers</Label>
                          <Input
                            type="number"
                            value={bus.total_passengers}
                            onChange={(e) => {
                              const updated = [...formData.buses];
                              updated[busIdx].total_passengers = parseInt(e.target.value);
                              setFormData(prev => ({ ...prev, buses: updated }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={bus.gst_percentage || 0}
                            onChange={(e) => {
                              const updated = [...formData.buses];
                              updated[busIdx].gst_percentage = parseFloat(e.target.value);
                              setFormData(prev => ({ ...prev, buses: updated }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-base font-semibold">Bus Segments</Label>
                          <Button
                            onClick={() => addBusSegment(busIdx)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Segment
                          </Button>
                        </div>

                        {bus.segments.map((segment, segIdx) => (
                          <div key={segIdx} className="bg-gray-50 p-3 rounded-lg mb-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                placeholder="Bus Operator"
                                value={segment.bus_operator}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].bus_operator = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                placeholder="Bus Type"
                                value={segment.bus_type}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].bus_type = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                placeholder="Departure Location"
                                value={segment.departure_location}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].departure_location = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                placeholder="Arrival Location"
                                value={segment.arrival_location}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].arrival_location = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                type="date"
                                placeholder="Departure Date"
                                value={segment.departure_date}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].departure_date = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                type="time"
                                placeholder="Departure Time"
                                value={segment.departure_time}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].departure_time = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                              <Input
                                placeholder="Duration"
                                value={segment.duration}
                                onChange={(e) => {
                                  const updated = [...formData.buses];
                                  updated[busIdx].segments[segIdx].duration = e.target.value;
                                  setFormData(prev => ({ ...prev, buses: updated }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Day-by-Day Itinerary - Only for Holiday Packages */}
        {selectedCategories.includes('Holiday') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Day-by-Day Itinerary (Holiday Package)
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
                          <Label>Hotel (If Needed)</Label>
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
        )}

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costBreakup.length > 0 && (
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
            )}
            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="tcs_percentage">TCS %</Label>
                <Input
                  id="tcs_percentage"
                  type="number"
                  step="0.01"
                  value={formData.pricing.tcs_percentage || 2}
                  onChange={(e) => handleInputChange('pricing', 'tcs_percentage', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Subtotal</Label>
                <Input
                  value={formData.pricing.subtotal.toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Taxes (18% GST)</Label>
                <Input
                  value={formData.pricing.taxes.toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Total</Label>
                <Input
                  value={formData.pricing.total.toFixed(2)}
                  disabled
                  className="bg-gray-100 font-bold"
                />
              </div>
              <div>
                <Label>Per Person</Label>
                <Input
                  value={formData.pricing.perPerson.toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Deposit Due (30%)</Label>
                <Input
                  value={formData.pricing.depositDue.toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>  
          </CardContent>
        </Card>

        {/* Inclusions */}
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Exclusions */}
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
            </div>
          </CardContent>
        </Card>
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
              {activities.map((item, index) => (
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
              {hotels.map((item, index) => (
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
                  <p className="text-sm text-gray-500 mt-1">{item.destination}</p>
                </div>
              ))}
            </div>

            {hotels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hotels in catalog. Add hotels to catalog first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationBuilder;
