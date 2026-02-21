import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Plus, Hotel, Car, Activity, Utensils, Search, Star, Plane, Train, Bus, FileText, Building2, MapPin, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import { Textarea } from './ui/textarea';

export const CatalogManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'hotel',
    destination: '',
    supplier: '',
    default_price: 0,
    description: '',
    image_url: '',
    rating: 3,
    // Hotel specific
    stars: 3,
    address: '',
    city: '',
    amenities: [],
    hotel_url: '',
    meal_plan: 'EP (Room Only)',
    // Flight specific
    airline: '',
    flight_number: '',
    airline_logo: '',
    cabin_class: 'Economy',
    baggage_checkin: '15 KG',
    baggage_cabin: '7 KG',
    segments: [],
    // Train specific
    train_number: '',
    train_name: '',
    class_type: 'AC 3 Tier',
    // Bus specific
    bus_operator: '',
    bus_type: 'AC Sleeper',
    // Transport specific
    vehicle_type: 'Sedan',
    vehicle_name: '',
    capacity: 4,
    // Activity specific
    duration: '',
    meetingPoint: '',
    activity_type: 'included',
    // Sightseeing specific
    package_name: '',
    start_time: '',
    end_time: '',
    transport_included: true,
    guide_included: true,
    meal_included: false,
    places: [],
    // Visa specific
    visa_type: 'Tourist',
    destination_country: '',
    processing_time_days: 5,
    // MICE specific
    event_type: 'Meeting',
    venue_name: '',
    venue_address: '',
    event_capacity: 0,
    equipment_provided: [],
    catering_included: false
  });

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const response = await api.getCatalog();
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const itemData = {
        name: newItem.name,
        type: newItem.type,
        destination: newItem.destination,
        supplier: newItem.supplier,
        default_price: parseFloat(newItem.default_price),
        description: newItem.description,
        image_url: newItem.image_url
      };
      
      // Add type-specific fields
      switch (newItem.type) {
        case 'hotel':
          itemData.stars = newItem.stars;
          itemData.rating = newItem.rating;
          itemData.address = newItem.address;
          itemData.city = newItem.city;
          itemData.amenities = newItem.amenities;
          itemData.hotel_url = newItem.hotel_url;
          itemData.meal_plan = newItem.meal_plan;
          break;
        case 'flight':
          itemData.airline = newItem.airline;
          itemData.flight_number = newItem.flight_number;
          itemData.airline_logo = newItem.airline_logo;
          itemData.cabin_class = newItem.cabin_class;
          itemData.baggage_checkin = newItem.baggage_checkin;
          itemData.baggage_cabin = newItem.baggage_cabin;
          itemData.segments = newItem.segments;
          break;
        case 'train':
          itemData.train_number = newItem.train_number;
          itemData.train_name = newItem.train_name;
          itemData.class_type = newItem.class_type;
          break;
        case 'bus':
          itemData.bus_operator = newItem.bus_operator;
          itemData.bus_type = newItem.bus_type;
          break;
        case 'transport':
          itemData.vehicle_type = newItem.vehicle_type;
          itemData.vehicle_name = newItem.vehicle_name;
          itemData.capacity = newItem.capacity;
          break;
        case 'activity':
          itemData.duration = newItem.duration;
          itemData.meetingPoint = newItem.meetingPoint;
          itemData.activity_type = newItem.activity_type;
          break;
        case 'sightseeing':
          itemData.package_name = newItem.package_name;
          itemData.start_time = newItem.start_time;
          itemData.end_time = newItem.end_time;
          itemData.duration = newItem.duration;
          itemData.transport_included = newItem.transport_included;
          itemData.guide_included = newItem.guide_included;
          itemData.meal_included = newItem.meal_included;
          itemData.places = newItem.places;
          break;
        case 'visa':
          itemData.visa_type = newItem.visa_type;
          itemData.destination_country = newItem.destination_country;
          itemData.processing_time_days = newItem.processing_time_days;
          break;
        case 'mice':
          itemData.event_type = newItem.event_type;
          itemData.venue_name = newItem.venue_name;
          itemData.venue_address = newItem.venue_address;
          itemData.event_capacity = newItem.event_capacity;
          itemData.equipment_provided = newItem.equipment_provided;
          itemData.catering_included = newItem.catering_included;
          break;
        case 'meal':
          // Meal type uses only default fields
          break;
      }
      
      await api.createCatalogItem(itemData);
      toast.success('Catalog item added successfully');
      setShowModal(false);
      setNewItem({
        name: '',
        type: 'hotel',
        destination: '',
        supplier: '',
        default_price: 0,
        description: '',
        image_url: '',
        rating: 3,
        stars: 3,
        address: '',
        city: '',
        amenities: [],
        hotel_url: '',
        meal_plan: 'EP (Room Only)',
        airline: '',
        flight_number: '',
        airline_logo: '',
        cabin_class: 'Economy',
        baggage_checkin: '15 KG',
        baggage_cabin: '7 KG',
        segments: [],
        train_number: '',
        train_name: '',
        class_type: 'AC 3 Tier',
        bus_operator: '',
        bus_type: 'AC Sleeper',
        vehicle_type: 'Sedan',
        vehicle_name: '',
        capacity: 4,
        duration: '',
        meetingPoint: '',
        activity_type: 'included',
        package_name: '',
        start_time: '',
        end_time: '',
        transport_included: true,
        guide_included: true,
        meal_included: false,
        places: [],
        visa_type: 'Tourist',
        destination_country: '',
        processing_time_days: 5,
        event_type: 'Meeting',
        venue_name: '',
        venue_address: '',
        event_capacity: 0,
        equipment_provided: [],
        catering_included: false
      });
      loadCatalog();
    } catch (error) {
      console.error('Failed to add catalog item:', error);
      toast.error('Failed to add item');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'hotel':
        return <Hotel className="w-5 h-5" />;
      case 'flight':
        return <Plane className="w-5 h-5" />;
      case 'train':
        return <Train className="w-5 h-5" />;
      case 'bus':
        return <Bus className="w-5 h-5" />;
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'activity':
        return <Activity className="w-5 h-5" />;
      case 'sightseeing':
        return <MapPin className="w-5 h-5" />;
      case 'meal':
        return <Utensils className="w-5 h-5" />;
      case 'visa':
        return <FileText className="w-5 h-5" />;
      case 'mice':
        return <Building2 className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const types = ['hotel', 'flight', 'train', 'bus', 'transport', 'activity', 'sightseeing', 'meal', 'visa', 'mice'];

  if (loading) {
    return <div className="text-center py-12">Loading catalog...</div>;
  }

  return (
    <div data-testid="catalog-management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catalog Management</h1>
          <p className="text-gray-600 mt-1">Manage inventory items for quotations</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
          data-testid="add-catalog-item-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name or destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-catalog-input"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === '' ? 'default' : 'outline'}
                onClick={() => setFilterType('')}
                size="sm"
                data-testid="filter-all"
              >
                All
              </Button>
              {types.map(type => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  size="sm"
                  className="capitalize"
                  data-testid={`filter-${type}`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="catalog-grid">
        {filteredItems.map(item => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow" data-testid={`catalog-item-${item.id}`}>
            {/* Image at the top if available */}
            {item.image_url && (
              <div className="w-full h-48 overflow-hidden rounded-t-lg">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="capitalize" variant="secondary">{item.type}</Badge>
                      {/* Show star rating for hotels */}
                      {item.type === 'hotel' && item.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, index) => (
                            <Star
                              key={index}
                              className={`w-4 h-4 ${
                                index < item.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Destination:</span>
                  <p className="font-medium text-gray-900">{item.destination}</p>
                </div>
                {item.supplier && (
                  <div>
                    <span className="text-gray-500">Supplier:</span>
                    <p className="font-medium text-gray-900">{item.supplier}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Default Price:</span>
                  <p className="font-medium text-gray-900">{formatCurrency(item.default_price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No catalog items found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="add-catalog-modal">
          <DialogHeader>
            <DialogTitle>Add Catalog Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., Luxury Hotel - Manali"
                data-testid="item-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  data-testid="item-type-select"
                >
                  <option value="hotel">Hotel</option>
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="transport">Transport</option>
                  <option value="activity">Activity</option>
                  <option value="sightseeing">Sightseeing</option>
                  <option value="meal">Meal</option>
                  <option value="visa">Visa</option>
                  <option value="mice">MICE</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={newItem.destination}
                  onChange={(e) => setNewItem({ ...newItem, destination: e.target.value })}
                  placeholder="e.g., Manali"
                  data-testid="item-destination-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                  placeholder="e.g., Hotel Paradise"
                  data-testid="item-supplier-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_price">Default Price (₹) *</Label>
                <Input
                  id="default_price"
                  type="number"
                  min="0"
                  step="100"
                  value={newItem.default_price}
                  onChange={(e) => setNewItem({ ...newItem, default_price: e.target.value })}
                  data-testid="item-price-input"
                />
              </div>
            </div>

            {/* Image URL field - Required for all items */}
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL *</Label>
              <Input
                id="image_url"
                value={newItem.image_url}
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                data-testid="item-image-url-input"
              />
            </div>

            {/* TYPE-SPECIFIC FIELDS */}

            {/* HOTEL Fields */}
            {newItem.type === 'hotel' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Hotel Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stars">Star Rating *</Label>
                      <select
                        id="stars"
                        value={newItem.stars}
                        onChange={(e) => setNewItem({ ...newItem, stars: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="1">1 Star ⭐</option>
                        <option value="2">2 Stars ⭐⭐</option>
                        <option value="3">3 Stars ⭐⭐⭐</option>
                        <option value="4">4 Stars ⭐⭐⭐⭐</option>
                        <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newItem.city}
                        onChange={(e) => setNewItem({ ...newItem, city: e.target.value })}
                        placeholder="e.g., Dubai"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newItem.address}
                      onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                      placeholder="e.g., Jumeirah Beach Road"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="hotel_url">Hotel Website URL</Label>
                      <Input
                        id="hotel_url"
                        value={newItem.hotel_url}
                        onChange={(e) => setNewItem({ ...newItem, hotel_url: e.target.value })}
                        placeholder="https://www.hotel-website.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meal_plan">Meal Plan</Label>
                      <select
                        id="meal_plan"
                        value={newItem.meal_plan}
                        onChange={(e) => setNewItem({ ...newItem, meal_plan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="EP (Room Only)">EP (Room Only)</option>
                        <option value="CP (Breakfast)">CP (Breakfast)</option>
                        <option value="MAP (Breakfast & Dinner)">MAP (Breakfast & Dinner)</option>
                        <option value="AP (All Meals)">AP (All Meals)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="amenities">Amenities (comma separated)</Label>
                    <Textarea
                      id="amenities"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="e.g., Pool, Spa, Beach Access, Restaurant"
                    />
                  </div>
                </div>
              </>
            )}

            {/* FLIGHT Fields */}
            {newItem.type === 'flight' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Flight Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="airline">Airline Name</Label>
                      <Input
                        id="airline"
                        value={newItem.airline}
                        onChange={(e) => setNewItem({ ...newItem, airline: e.target.value })}
                        placeholder="e.g., Emirates"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="airline_logo">Airline Logo URL</Label>
                      <Input
                        id="airline_logo"
                        value={newItem.airline_logo}
                        onChange={(e) => setNewItem({ ...newItem, airline_logo: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                  
                  {/* Flight Segments */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Flight Segments</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewItem({
                            ...newItem,
                            segments: [...newItem.segments, {
                              flight_number: '',
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
                            }]
                          });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Segment
                      </Button>
                    </div>

                    {newItem.segments.map((segment, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg mb-3 border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">Segment {idx + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => {
                              const updatedSegments = newItem.segments.filter((_, i) => i !== idx);
                              setNewItem({ ...newItem, segments: updatedSegments });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Flight Number (e.g., EK 501)"
                            value={segment.flight_number}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].flight_number = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                          <select
                            value={segment.cabin_class}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].cabin_class = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                          >
                            <option value="Economy">Economy</option>
                            <option value="Premium Economy">Premium Economy</option>
                            <option value="Business">Business</option>
                            <option value="First Class">First Class</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Input
                            placeholder="Departure City"
                            value={segment.departure_city}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].departure_city = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                          <Input
                            placeholder="Departure Airport"
                            value={segment.departure_airport}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].departure_airport = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label className="text-xs text-gray-500">Departure Date</Label>
                            <Input
                              type="date"
                              value={segment.departure_date}
                              onChange={(e) => {
                                const updated = [...newItem.segments];
                                updated[idx].departure_date = e.target.value;
                                setNewItem({ ...newItem, segments: updated });
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Departure Time</Label>
                            <Input
                              type="time"
                              value={segment.departure_time}
                              onChange={(e) => {
                                const updated = [...newItem.segments];
                                updated[idx].departure_time = e.target.value;
                                setNewItem({ ...newItem, segments: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <Input
                            placeholder="Arrival City"
                            value={segment.arrival_city}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].arrival_city = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                          <Input
                            placeholder="Arrival Airport"
                            value={segment.arrival_airport}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].arrival_airport = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label className="text-xs text-gray-500">Arrival Date</Label>
                            <Input
                              type="date"
                              value={segment.arrival_date}
                              onChange={(e) => {
                                const updated = [...newItem.segments];
                                updated[idx].arrival_date = e.target.value;
                                setNewItem({ ...newItem, segments: updated });
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Arrival Time</Label>
                            <Input
                              type="time"
                              value={segment.arrival_time}
                              onChange={(e) => {
                                const updated = [...newItem.segments];
                                updated[idx].arrival_time = e.target.value;
                                setNewItem({ ...newItem, segments: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <Input
                            placeholder="Duration (e.g., 3h 30m)"
                            value={segment.duration}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].duration = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                          <Input
                            placeholder="Check-in (e.g., 40 KG)"
                            value={segment.baggage_checkin}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].baggage_checkin = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                          <Input
                            placeholder="Cabin (e.g., 7 KG)"
                            value={segment.baggage_cabin}
                            onChange={(e) => {
                              const updated = [...newItem.segments];
                              updated[idx].baggage_cabin = e.target.value;
                              setNewItem({ ...newItem, segments: updated });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* TRAIN Fields */}
            {newItem.type === 'train' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Train Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="train_number">Train Number</Label>
                      <Input
                        id="train_number"
                        value={newItem.train_number}
                        onChange={(e) => setNewItem({ ...newItem, train_number: e.target.value })}
                        placeholder="e.g., 10103"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="train_name">Train Name</Label>
                      <Input
                        id="train_name"
                        value={newItem.train_name}
                        onChange={(e) => setNewItem({ ...newItem, train_name: e.target.value })}
                        placeholder="e.g., Mandovi Express"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="class_type">Class Type</Label>
                    <select
                      id="class_type"
                      value={newItem.class_type}
                      onChange={(e) => setNewItem({ ...newItem, class_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="AC 1 Tier">AC 1 Tier</option>
                      <option value="AC 2 Tier">AC 2 Tier</option>
                      <option value="AC 3 Tier">AC 3 Tier</option>
                      <option value="Sleeper">Sleeper</option>
                      <option value="Second Sitting">Second Sitting</option>
                    </select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* BUS Fields */}
            {newItem.type === 'bus' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Bus Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bus_operator">Bus Operator</Label>
                      <Input
                        id="bus_operator"
                        value={newItem.bus_operator}
                        onChange={(e) => setNewItem({ ...newItem, bus_operator: e.target.value })}
                        placeholder="e.g., Volvo Travels"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bus_type">Bus Type</Label>
                      <select
                        id="bus_type"
                        value={newItem.bus_type}
                        onChange={(e) => setNewItem({ ...newItem, bus_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="AC Sleeper">AC Sleeper</option>
                        <option value="Non-AC Sleeper">Non-AC Sleeper</option>
                        <option value="AC Seater">AC Seater</option>
                        <option value="Non-AC Seater">Non-AC Seater</option>
                        <option value="Volvo">Volvo</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* TRANSPORT Fields */}
            {newItem.type === 'transport' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Transport Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_type">Vehicle Type</Label>
                      <select
                        id="vehicle_type"
                        value={newItem.vehicle_type}
                        onChange={(e) => setNewItem({ ...newItem, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Mini Bus">Mini Bus</option>
                        <option value="Tempo Traveller">Tempo Traveller</option>
                        <option value="Bus">Bus</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_name">Vehicle Name</Label>
                      <Input
                        id="vehicle_name"
                        value={newItem.vehicle_name}
                        onChange={(e) => setNewItem({ ...newItem, vehicle_name: e.target.value })}
                        placeholder="e.g., Toyota Innova"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity (persons)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        value={newItem.capacity}
                        onChange={(e) => setNewItem({ ...newItem, capacity: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="e.g., AC vehicle, experienced driver"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ACTIVITY Fields */}
            {newItem.type === 'activity' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Activity Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={newItem.duration}
                        onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                        placeholder="e.g., 2 hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meetingPoint">Meeting Point</Label>
                      <Input
                        id="meetingPoint"
                        value={newItem.meetingPoint}
                        onChange={(e) => setNewItem({ ...newItem, meetingPoint: e.target.value })}
                        placeholder="e.g., Hotel Lobby"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="activity_type">Activity Type</Label>
                    <select
                      id="activity_type"
                      value={newItem.activity_type}
                      onChange={(e) => setNewItem({ ...newItem, activity_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="included">Included</option>
                      <option value="optional">Optional</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Activity description..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* SIGHTSEEING Fields */}
            {newItem.type === 'sightseeing' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Sightseeing Package Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="package_name">Package Name</Label>
                    <Input
                      id="package_name"
                      value={newItem.package_name}
                      onChange={(e) => setNewItem({ ...newItem, package_name: e.target.value })}
                      placeholder="e.g., City Tour with Desert Safari"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={newItem.start_time}
                        onChange={(e) => setNewItem({ ...newItem, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={newItem.end_time}
                        onChange={(e) => setNewItem({ ...newItem, end_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={newItem.duration}
                        onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                        placeholder="e.g., Full Day"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="transport_included"
                        checked={newItem.transport_included}
                        onChange={(e) => setNewItem({ ...newItem, transport_included: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="transport_included">Transport Included</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="guide_included"
                        checked={newItem.guide_included}
                        onChange={(e) => setNewItem({ ...newItem, guide_included: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="guide_included">Guide Included</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="meal_included"
                        checked={newItem.meal_included}
                        onChange={(e) => setNewItem({ ...newItem, meal_included: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="meal_included">Meal Included</Label>
                    </div>
                  </div>

                  {/* Places Array */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Places to Visit</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewItem({
                            ...newItem,
                            places: [...newItem.places, {
                              name: '',
                              description: '',
                              duration: '',
                              entry_fee_included: true
                            }]
                          });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Place
                      </Button>
                    </div>

                    {newItem.places.map((place, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg mb-3 border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">Place {idx + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => {
                              const updatedPlaces = newItem.places.filter((_, i) => i !== idx);
                              setNewItem({ ...newItem, places: updatedPlaces });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Place Name (e.g., Burj Khalifa)"
                            value={place.name}
                            onChange={(e) => {
                              const updated = [...newItem.places];
                              updated[idx].name = e.target.value;
                              setNewItem({ ...newItem, places: updated });
                            }}
                          />
                          <Input
                            placeholder="Duration (e.g., 2 hours)"
                            value={place.duration}
                            onChange={(e) => {
                              const updated = [...newItem.places];
                              updated[idx].duration = e.target.value;
                              setNewItem({ ...newItem, places: updated });
                            }}
                          />
                        </div>

                        <div className="mt-3">
                          <Textarea
                            placeholder="Description of the place..."
                            value={place.description}
                            rows="2"
                            onChange={(e) => {
                              const updated = [...newItem.places];
                              updated[idx].description = e.target.value;
                              setNewItem({ ...newItem, places: updated });
                            }}
                          />
                        </div>

                        <div className="flex items-center space-x-2 mt-3">
                          <input
                            type="checkbox"
                            id={`entry_fee_${idx}`}
                            checked={place.entry_fee_included}
                            onChange={(e) => {
                              const updated = [...newItem.places];
                              updated[idx].entry_fee_included = e.target.checked;
                              setNewItem({ ...newItem, places: updated });
                            }}
                            className="w-4 h-4"
                          />
                          <Label htmlFor={`entry_fee_${idx}`}>Entry Fee Included</Label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Package Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Package description..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* VISA Fields */}
            {newItem.type === 'visa' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Visa Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visa_type">Visa Type</Label>
                      <select
                        id="visa_type"
                        value={newItem.visa_type}
                        onChange={(e) => setNewItem({ ...newItem, visa_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="Tourist">Tourist</option>
                        <option value="Business">Business</option>
                        <option value="Transit">Transit</option>
                        <option value="Student">Student</option>
                        <option value="Work">Work</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination_country">Destination Country</Label>
                      <Input
                        id="destination_country"
                        value={newItem.destination_country}
                        onChange={(e) => setNewItem({ ...newItem, destination_country: e.target.value })}
                        placeholder="e.g., United Arab Emirates"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="processing_time_days">Processing Time (Days)</Label>
                    <Input
                      id="processing_time_days"
                      type="number"
                      min="1"
                      value={newItem.processing_time_days}
                      onChange={(e) => setNewItem({ ...newItem, processing_time_days: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Visa details..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* MICE Fields */}
            {newItem.type === 'mice' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">MICE Event Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event_type">Event Type</Label>
                      <select
                        id="event_type"
                        value={newItem.event_type}
                        onChange={(e) => setNewItem({ ...newItem, event_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="Meeting">Meeting</option>
                        <option value="Conference">Conference</option>
                        <option value="Exhibition">Exhibition</option>
                        <option value="Incentive">Incentive</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue_name">Venue Name</Label>
                      <Input
                        id="venue_name"
                        value={newItem.venue_name}
                        onChange={(e) => setNewItem({ ...newItem, venue_name: e.target.value })}
                        placeholder="e.g., Conference Room A"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="venue_address">Venue Address</Label>
                    <Input
                      id="venue_address"
                      value={newItem.venue_address}
                      onChange={(e) => setNewItem({ ...newItem, venue_address: e.target.value })}
                      placeholder="Full venue address"
                    />
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="event_capacity">Capacity (persons)</Label>
                    <Input
                      id="event_capacity"
                      type="number"
                      min="1"
                      value={newItem.event_capacity}
                      onChange={(e) => setNewItem({ ...newItem, event_capacity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <input
                      type="checkbox"
                      id="catering_included"
                      checked={newItem.catering_included}
                      onChange={(e) => setNewItem({ ...newItem, catering_included: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="catering_included">Catering Included</Label>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Event details, equipment available, etc."
                    />
                  </div>
                </div>
              </>
            )}

            {/* MEAL Fields */}
            {newItem.type === 'meal' && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-orange-600">Meal Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Meal details..."
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              data-testid="modal-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={
                !newItem.name || 
                !newItem.destination || 
                !newItem.default_price || 
                !newItem.image_url
              }
              data-testid="modal-submit-button"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
