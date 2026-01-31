import { format, set } from 'date-fns';
import { Bus, Check, EyeIcon, FileText, Hotel, Loader2, Palmtree, Plane, Presentation, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { CountryCodeSelect } from './CountryCodeSelect';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export const CreateRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // New Customer Form Data
  const [newCustomerFormData, setNewCustomerFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_country_code: '+91'
  });
  
  const [formData, setFormData] = useState({
    title: '',
    people_count: '',
    budget_min: '',
    budget_max: '',
    destination: '',
    source: '',
    start_date: '',
    end_date: '',
    is_holiday_package_required: false,
    is_mice_required: false,
    is_hotel_booking_required: false,
    is_sight_seeing_required: false,
    is_visa_required: false,
    is_transport_within_city_required: false,
    is_transfer_to_destination_required: false,
    visa_citizenship: '',
    type_of_travel: [],
    special_requirements: ''
  });

   // Customer search states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Debounced customer search
  useEffect(() => {
    if (customerSearchQuery.length >= 2 && user?.role !== 'customer') {
      const timer = setTimeout(async () => {
        setSearchingCustomers(true);
        try {
          const response = await api.searchCustomers(customerSearchQuery);
          setCustomerSearchResults(response.data.customers || []);
          setShowCustomerDropdown(true);
        } catch (error) {
          console.error('Failed to search customers:', error);
        } finally {
          setSearchingCustomers(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
  }, [customerSearchQuery, user?.role]);

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomerFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(`${customer.name} (${customer.email})`);
    setFormData(prev => ({
      ...prev,
      client_id: customer.id
    }));
    setShowCustomerDropdown(false);
    setShowNewCustomerForm(false);
  };

  const handleClearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    setShowNewCustomerForm(false);
    setFormData(prev => ({
      ...prev,
      client_id: null
    }));
  };

  const categories = [
    {
      id: 'holiday',
      name: 'Holiday Package',
      icon: Palmtree,
      description: 'Complete trip planning',
      key: 'is_holiday_package_required'
    },
    {
      id: 'mice',
      name: 'M.I.C.E.',
      icon: Presentation,
      description: 'Meetings, Incentives, Conferences, Exhibitions',
      key: 'is_mice_required'
    },
    {
      id: 'hotel',
      name: 'Hotel Booking',
      icon: Hotel,
      description: 'Book accommodation',
      key: 'is_hotel_booking_required'
    },
    {
      id: 'sightseeing',
      name: 'Sightseeing Tours',
      icon: EyeIcon,
      description: 'Guided sightseeing tours',
      key: 'is_sight_seeing_required'
    },
    {
      id: 'visa',
      name: 'Visa',
      icon: FileText,
      description: 'Visa assistance',
      key: 'is_visa_required'
    },
    {
      id: 'transport_within_city',
      name: 'Transport within City',
      icon: Bus,
      description: 'Cab, Traveller, Mini Bus bookings',
      key: 'is_transport_within_city_required'
    },
    {
      id: 'transport_to_destination',
      name: 'Transport to Destination',
      icon: Plane,
      description: 'Flight, Train, Bus bookings',
      key: 'is_transfer_to_destination_required'
    }
  ];

  const transportTypes = [
    { id: 'flight', name: 'Flight', type: 'intracity' },
    { id: 'train', name: 'Train', type: 'intracity' },
    { id: 'bus', name: 'Bus', type: 'intracity' },
    { id: 'cab', name: 'Cab', type: 'intercity' },
    { id: 'mini_bus', name: 'Mini Bus', type: 'intercity' },
    { id: 'traveller', name: 'Traveller', type: 'intercity' },  
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleTransportType = (typeId) => {
    setFormData(prev => ({
      ...prev,
      type_of_travel: prev.type_of_travel.includes(typeId)
        ? prev.type_of_travel.filter(t => t !== typeId)
        : [...prev.type_of_travel, typeId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!(formData?.is_holiday_package_required || formData?.is_mice_required || formData?.is_hotel_booking_required || formData?.is_sight_seeing_required || formData?.is_visa_required || formData?.is_transport_within_city_required || formData?.is_transfer_to_destination_required)) {
      setError('Please select at least one category');
      toast.error('Please select at least one category');
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        ...formData
      }
      // If creating new customer, save them first
       if (!selectedCustomer && user?.role !== 'customer') {
        try {
          const customerResponse = await api.quickCreateCustomer({
            name: newCustomerFormData.client_name,
            email: newCustomerFormData.client_email,
            phone: newCustomerFormData.client_phone,
            country_code: newCustomerFormData.client_country_code
          }) || {data: {customer: {id: 1}}};
          const client_id = customerResponse.data.customer.id;
          requestData.client_id = client_id;
          toast.success(customerResponse.data.message);
        } catch (error) {
          if (error.response?.status !== 400 || !error.response?.data?.detail?.includes('already registered')) {
            throw error;
          }
        }
      }
      const response = await api.createRequest(requestData);
      toast.success('Request created successfully!');
      navigate(`/requests/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error(error.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };
  const minStartDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <div data-testid="create-request-form">

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Travel Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Search/Select Section - Only for non-customer roles */}
            {user?.role !== 'customer' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-blue-900">
                    Customer Information
                  </Label>
                  {selectedCustomer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearCustomerSelection}
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear Selection
                    </Button>
                  )}
                </div>

                {/* Customer Search Input */}
                {!selectedCustomer && !showNewCustomerForm && (
                  <div className="space-y-2 relative">
                    <Label htmlFor="customer_search">Search Existing Customer</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customer_search"
                        type="text"
                        placeholder="Type customer name, email, or phone..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="customer-search-input"
                      />
                      {searchingCustomers && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customerSearchResults.length > 0 ? (
                          <>
                            {customerSearchResults.map((customer) => (
                              <div
                                key={customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                data-testid={`customer-result-${customer.id}`}
                              >
                                <div className="font-medium text-gray-900">{customer.name}</div>
                                <div className="text-sm text-gray-600">{customer.email}</div>
                                <div className="text-sm text-gray-500">
                                  {customer.country_code} {customer.phone}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <div className="p-3 bg-white border border-blue-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                        <div className="text-sm text-gray-500">
                          {selectedCustomer.country_code} {selectedCustomer.phone}
                        </div>
                      </div>
                      <Badge className="bg-green-600 text-white">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCustomer === null && user?.role !== 'customer' && (
             <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Client Information (New Client)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    name="client_name"
                    value={newCustomerFormData.client_name}
                    onChange={handleNewCustomerChange}
                    required
                    disabled={user?.role === 'customer'}
                    data-testid="client-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_email">Client Email *</Label>
                  <Input
                    id="client_email"
                    name="client_email"
                    type="email"
                    value={newCustomerFormData.client_email}
                    onChange={handleNewCustomerChange}
                    required
                    disabled={user?.role === 'customer'}
                    data-testid="client-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_phone">Client Phone *</Label>
                  <div className="flex gap-2">
                    <CountryCodeSelect
                      value={newCustomerFormData.client_country_code}
                      onChange={(value) => setNewCustomerFormData(prev => ({ ...prev, client_country_code: value }))}
                      disabled={user?.role === 'customer'}
                      testId="client-country-code-select"
                    />
                    <Input
                      id="client_phone"
                      name="client_phone"
                      value={newCustomerFormData.client_phone}
                      onChange={handleNewCustomerChange}
                      required
                      disabled={user?.role === 'customer'}
                      data-testid="client-phone-input"
                      className="flex-1"
                      placeholder="9876543210"
                    />  
                  </div>
                </div>
              </div>
            </div>)}

            {/* Category Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Select Requirements &#40;Multiple Allowed&#41;*</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.id}
                      onClick={() => handleChange({target: {name: category.key, value: !formData?.[category.key]}})}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all flex gap-2 ${
                        formData?.[category.key]
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {formData?.[category.key] && (
                        <div className="absolute top-2 right-2 bg-orange-600 text-white rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <Icon className={`w-8 h-8 mb-2 ${formData?.[category.key] ? 'text-orange-600' : 'text-gray-600'}`} />
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                        <p className="text-xs text-gray-500">{category.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(formData.is_holiday_package_required || formData.is_mice_required || formData.is_hotel_booking_required || formData.is_sight_seeing_required || formData.is_visa_required || formData.is_transport_within_city_required || formData.is_transfer_to_destination_required)  && (
              <>
                {/* Common Client Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Requirement Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Request Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="e.g., Family Trip to Dubai"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        data-testid="title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="people_count">Number of People *</Label>
                      <Input
                        id="people_count"
                        name="people_count"
                        type="number"
                        min="1"
                        value={formData.people_count}
                        onChange={handleChange}
                        required
                        data-testid="people-count-input"
                      />
                    </div>
                  </div>

                  {(formData?.is_holiday_package_required || formData?.is_mice_required || formData?.is_hotel_booking_required || formData?.is_sight_seeing_required || formData?.is_transport_within_city_required || formData?.is_transfer_to_destination_required) && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="budget_min">Minimum Budget (₹) *</Label>
                      <Input
                        id="budget_min"
                        name="budget_min"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.budget_min}
                        onChange={handleChange}
                        required
                        data-testid="budget-min-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget_max">Maximum Budget (₹) *</Label>
                      <Input
                        id="budget_max"
                        name="budget_max"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.budget_max}
                        onChange={handleChange}
                        required
                        data-testid="budget-max-input"
                      />
                    </div>
                  </div>
                }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {(formData?.is_transfer_to_destination_required || formData?.is_mice_required || formData?.is_holiday_package_required) && <div className="space-y-2">
                      <Label htmlFor="source">Source *</Label>
                      <Input
                        id="source"
                        name="source"
                        placeholder="Start Location"
                        value={formData.source}
                        onChange={handleChange}
                        data-testid="source-input"
                      />
                    </div>}

                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination *</Label>
                      <Input
                        id="destination"
                        name="destination"
                        placeholder="e.g., Manali, Goa"
                        value={formData.destination}
                        onChange={handleChange}
                        data-testid="destination-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                    min={minStartDate}
                    max={formData.end_date || ''}
                    required
                    data-testid="start-date-input"
                  />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">{(formData?.is_transfer_to_destination_required && !(formData?.is_holiday_package_required || formData?.is_mice_required || formData?.is_hotel_booking_required || formData?.is_sight_seeing_required || formData?.is_visa_required || formData?.is_transport_within_city_required))? 
                      'Return Date (if applicable)' : 'End Date *'}</Label>
                      <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
                    disabled={!formData.start_date}
                    required
                    min={formData.start_date || minStartDate}
                    data-testid="end-date-input"
                  />
                  </div>
              
                    {formData.is_visa_required && <div className="space-y-2">
                      <Label htmlFor="visa_citizenship">Citizenship *</Label>
                      <Input
                        id="visa_citizenship"
                        name="visa_citizenship"
                        placeholder="e.g., Indian"
                        value={formData.visa_citizenship}
                        onChange={handleChange}
                        required
                      />
                    </div>}

                    {(formData.is_transport_within_city_required || formData.is_transfer_to_destination_required) && <div>
                      <Label className="mb-3 block">Type of Transport (multiple allowed) *</Label>
                      <div className="flex flex-wrap gap-2">
                        {transportTypes.filter(obj => (formData?.is_transfer_to_destination_required && obj.type === "intracity") || (formData?.is_transport_within_city_required && obj.type === "intercity")).map((type) => (
                          <Badge
                            key={type.id}
                            onClick={() => toggleTransportType(type.id)}
                            className={`cursor-pointer ${
                              formData.type_of_travel.includes(type.id)
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {type.name}
                          </Badge>
                        ))}
                      </div>
                    </div>}
              </div>

                {/* General Special Requirements */}
                <div className="border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="special_requirements">Special Requirements</Label>
                    <Textarea
                      id="special_requirements"
                      name="special_requirements"
                      rows="4"
                      placeholder="Any additional requirements or notes..."
                      value={formData.special_requirements}
                      onChange={handleChange}
                      data-testid="special-requirements-input"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={loading}
                    data-testid="submit-request-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Request...
                      </>
                    ) : (
                      'Create Request'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/requests')}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
