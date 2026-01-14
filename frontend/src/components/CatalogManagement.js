import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Plus, Hotel, Car, Activity, Utensils, Search } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';

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
    rating: 3
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
        rating: 3
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
      case 'activity':
        return <Activity className="w-5 h-5" />;
      case 'meal':
        return <Utensils className="w-5 h-5" />;
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

  const types = ['hotel', 'transport', 'activity', 'meal'];

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
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <Badge className="mt-1 capitalize" variant="secondary">{item.type}</Badge>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  data-testid="item-type-select"
                >
                  <option value="hotel">Hotel</option>
                  <option value="transport">Transport</option>
                  <option value="activity">Activity</option>
                  <option value="meal">Meal</option>
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Brief description..."
                data-testid="item-description-input"
              />
            </div>
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
              disabled={!newItem.name || !newItem.destination || !newItem.default_price}
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
