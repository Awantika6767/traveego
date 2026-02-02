import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Plus, Hotel, Car, Activity, Utensils, Search, Star, Plane, Train, FileText } from 'lucide-react';
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
    // Flight fields
    flight_number: '',
    airline_name: '',
    // Train fields
    train_number: '',
    train_name: '',
    // Flight/Train common fields
    from_location: '',
    to_location: '',
    departure_datetime: '',
    // Visa fields
    visa_type: '',
    processing_time_days: 7,
    destination_country: ''
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
        ...newItem,
        default_price: parseFloat(newItem.default_price)
      };
      
      // Only include rating if it's a hotel
      if (itemData.type !== 'hotel') {
        delete itemData.rating;
      }
      
      // Only include flight fields if it's a flight
      if (itemData.type !== 'flight') {
        delete itemData.flight_number;
        delete itemData.airline_name;
      }
      
      // Only include train fields if it's a train
      if (itemData.type !== 'train') {
        delete itemData.train_number;
        delete itemData.train_name;
      }
      
      // Only include transport fields if it's flight or train
      if (itemData.type !== 'flight' && itemData.type !== 'train') {
        delete itemData.from_location;
        delete itemData.to_location;
        delete itemData.departure_datetime;
      }
      
      // Only include visa fields if it's a visa
      if (itemData.type !== 'visa') {
        delete itemData.visa_type;
        delete itemData.processing_time_days;
        delete itemData.destination_country;
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
        flight_number: '',
        airline_name: '',
        train_number: '',
        train_name: '',
        from_location: '',
        to_location: '',
        departure_datetime: '',
        visa_type: '',
        processing_time_days: 7,
        destination_country: ''
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
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'flight':
        return <Plane className="w-5 h-5" />;
      case 'train':
        return <Train className="w-5 h-5" />;
      case 'activity':
        return <Activity className="w-5 h-5" />;
      case 'meal':
        return <Utensils className="w-5 h-5" />;
      case 'visa':
        return <FileText className="w-5 h-5" />;
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

  const types = ['hotel', 'transport', 'flight', 'train', 'activity', 'meal', 'visa'];

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex gap-2">
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

      {/* Add Item Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent data-testid="add-catalog-modal">
          <DialogHeader>
            <DialogTitle>Add Catalog Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                  <option value="transport">Transport</option>
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="activity">Activity</option>
                  <option value="meal">Meal</option>
                  <option value="visa">Visa</option>
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

            <div className="space-y-2">
              <Label htmlFor="description">{newItem.type === 'hotel' ? 'Amenities' : 'Description'}</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder={newItem.type === 'hotel' ? 'Comma separated Amenities (e.g Common Washroom, Wi-Fi, Gym, Swimming Pool  )' : 'Brief description...'}
                data-testid="item-description-input"
              />
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

            {/* Rating field - Only for hotels */}
            {newItem.type === 'hotel' && (
              <div className="space-y-2">
                <Label htmlFor="rating">Hotel Rating (Stars) *</Label>
                <select
                  id="rating"
                  value={newItem.rating}
                  onChange={(e) => setNewItem({ ...newItem, rating: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  data-testid="item-rating-select"
                >
                  <option value="1">1 Star ⭐</option>
                  <option value="2">2 Stars ⭐⭐</option>
                  <option value="3">3 Stars ⭐⭐⭐</option>
                  <option value="4">4 Stars ⭐⭐⭐⭐</option>
                  <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
                </select>
              </div>
            )}

            {/* Flight specific fields */}
            {newItem.type === 'flight' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flight_number">Flight Number *</Label>
                    <Input
                      id="flight_number"
                      value={newItem.flight_number}
                      onChange={(e) => setNewItem({ ...newItem, flight_number: e.target.value })}
                      placeholder="e.g., AI101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airline_name">Airline Name *</Label>
                    <Input
                      id="airline_name"
                      value={newItem.airline_name}
                      onChange={(e) => setNewItem({ ...newItem, airline_name: e.target.value })}
                      placeholder="e.g., Air India"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_location">From Location *</Label>
                    <Input
                      id="from_location"
                      value={newItem.from_location}
                      onChange={(e) => setNewItem({ ...newItem, from_location: e.target.value })}
                      placeholder="e.g., Delhi (DEL)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to_location">To Location *</Label>
                    <Input
                      id="to_location"
                      value={newItem.to_location}
                      onChange={(e) => setNewItem({ ...newItem, to_location: e.target.value })}
                      placeholder="e.g., Mumbai (BOM)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departure_datetime">Departure Date & Time *</Label>
                  <Input
                    id="departure_datetime"
                    type="datetime-local"
                    value={newItem.departure_datetime}
                    onChange={(e) => setNewItem({ ...newItem, departure_datetime: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Train specific fields */}
            {newItem.type === 'train' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="train_number">Train Number *</Label>
                    <Input
                      id="train_number"
                      value={newItem.train_number}
                      onChange={(e) => setNewItem({ ...newItem, train_number: e.target.value })}
                      placeholder="e.g., 12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="train_name">Train Name *</Label>
                    <Input
                      id="train_name"
                      value={newItem.train_name}
                      onChange={(e) => setNewItem({ ...newItem, train_name: e.target.value })}
                      placeholder="e.g., Rajdhani Express"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_location">From Station *</Label>
                    <Input
                      id="from_location"
                      value={newItem.from_location}
                      onChange={(e) => setNewItem({ ...newItem, from_location: e.target.value })}
                      placeholder="e.g., New Delhi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to_location">To Station *</Label>
                    <Input
                      id="to_location"
                      value={newItem.to_location}
                      onChange={(e) => setNewItem({ ...newItem, to_location: e.target.value })}
                      placeholder="e.g., Mumbai Central"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departure_datetime">Departure Date & Time *</Label>
                  <Input
                    id="departure_datetime"
                    type="datetime-local"
                    value={newItem.departure_datetime}
                    onChange={(e) => setNewItem({ ...newItem, departure_datetime: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Visa specific fields */}
            {newItem.type === 'visa' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visa_type">Visa Type *</Label>
                    <select
                      id="visa_type"
                      value={newItem.visa_type}
                      onChange={(e) => setNewItem({ ...newItem, visa_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Select Type</option>
                      <option value="Tourist">Tourist Visa</option>
                      <option value="Business">Business Visa</option>
                      <option value="Student">Student Visa</option>
                      <option value="Transit">Transit Visa</option>
                      <option value="Work">Work Visa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination_country">Destination Country *</Label>
                    <Input
                      id="destination_country"
                      value={newItem.destination_country}
                      onChange={(e) => setNewItem({ ...newItem, destination_country: e.target.value })}
                      placeholder="e.g., Thailand"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processing_time_days">Processing Time (Days) *</Label>
                  <Input
                    id="processing_time_days"
                    type="number"
                    min="1"
                    value={newItem.processing_time_days}
                    onChange={(e) => setNewItem({ ...newItem, processing_time_days: parseInt(e.target.value) })}
                    placeholder="e.g., 7"
                  />
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
                !newItem.image_url ||
                (newItem.type === 'hotel' && !newItem.rating) ||
                (newItem.type === 'flight' && (!newItem.flight_number || !newItem.airline_name || !newItem.from_location || !newItem.to_location || !newItem.departure_datetime)) ||
                (newItem.type === 'train' && (!newItem.train_number || !newItem.train_name || !newItem.from_location || !newItem.to_location || !newItem.departure_datetime)) ||
                (newItem.type === 'visa' && (!newItem.visa_type || !newItem.destination_country || !newItem.processing_time_days))
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
